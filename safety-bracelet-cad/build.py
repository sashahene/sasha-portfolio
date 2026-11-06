#!/usr/bin/env python3
"""
Build the bracelet: run the fit checks, then write STEP, STL, GLB and a JSON manifest.

    .venv/bin/python build.py            # everything
    .venv/bin/python build.py --check    # checks only, no export
"""
import argparse
import itertools
import json
import shutil
import sys
from pathlib import Path

import cadquery as cq
import numpy as np
import trimesh

import bracelet as B
import params as P

OUT = Path(__file__).parent / "output"

# Contact that is intended. Each pair needs a reason, everything else must be zero.
ALLOWED = {
    frozenset({"Screw", "Upper_housing"}): "thread-forming screw cuts into the pilot hole",
    frozenset({"Motor_wire", "Vibration_motor"}): "wire enters the motor body",
    frozenset({"Battery_wire", "LiPo_protection"}): "wire enters the protection board",
    frozenset({"Spring_bar_pin", "Lower_housing"}): "pin ends seat in the lug holes (0.1 mm dia. gap, none expected)",
}


def _allowed(a, b):
    for key, why in ALLOWED.items():
        x, y = tuple(key)
        if (a.startswith(x) and b.startswith(y)) or (a.startswith(y) and b.startswith(x)):
            return why
    return None


def bbox_overlap(a, b, m=0.0):
    A, Bb = a.BoundingBox(), b.BoundingBox()
    return (A.xmin - m < Bb.xmax and Bb.xmin - m < A.xmax and A.ymin - m < Bb.ymax
            and Bb.ymin - m < A.ymax and A.zmin - m < Bb.zmax and Bb.zmin - m < A.zmax)


def common_volume(a, b):
    try:
        return a.intersect(b).Volume()
    except Exception:
        return float("nan")


def run_checks(parts):
    report = {"pass": True, "interference": [], "allowed_contact": [], "clearances": {}, "antenna": [], "notes": []}
    solid = [p for p in parts if not p.cosmetic]
    pairs = 0
    for a, b in itertools.combinations(solid, 2):
        if not bbox_overlap(a.shape, b.shape):
            continue
        pairs += 1
        v = common_volume(a.shape, b.shape)
        if v != v or v > 1e-3:
            why = _allowed(a.name, b.name)
            row = {"a": a.name, "b": b.name, "volume_mm3": None if v != v else round(v, 4)}
            if why:
                row["reason"] = why
                report["allowed_contact"].append(row)
            else:
                report["interference"].append(row)
                report["pass"] = False
    report["pairs_tested"] = pairs
    report["solid_parts"] = len(solid)

    by = {p.name: p.shape for p in parts}
    dist = {
        "battery to BLE module": ("LiPo_protection_end", "BLE_module_board"),
        "battery to BLE shield can": ("LiPo_protection_end", "BLE_MCU_shield_can_nRF52832"),
        "battery to cover": ("LiPo_battery_pouch", "Upper_housing_removable_cover"),
        "motor to PCB": ("Vibration_motor_DIANN", "PCB_main_board"),
        "motor to battery": ("Vibration_motor_DIANN", "LiPo_battery_pouch"),
        "motor to PPG sensor": ("Vibration_motor_DIANN", "PPG_heart_rate_sensor_MAX30102"),
        "BLE module to cover": ("BLE_MCU_shield_can_nRF52832", "Upper_housing_removable_cover"),
        "PCB to cover tongue": ("PCB_main_board", "Upper_housing_removable_cover"),
        "PPG sensor to window": ("PPG_heart_rate_sensor_MAX30102", "Optical_sensor_window"),
        "strap A to lower housing": ("Band_strap_A_short", "Lower_housing"),
        "strap B to lower housing": ("Band_strap_B_long", "Lower_housing"),
        "strap A to strap B": ("Band_strap_A_short", "Band_strap_B_long"),
        "cover to lower housing": ("Upper_housing_removable_cover", "Lower_housing"),
    }
    for label, (a, b) in dist.items():
        report["clearances"][label] = round(by[a].distance(by[b]), 3)

    # nothing conductive or lossy above/below the antenna end of the board
    keep = B.box(P.PCB_L / 2 - P.ANT_KEEPOUT_X_MIN + 1, P.PCB_W, -5, 15,
                 (P.PCB_L / 2 + 1 + P.ANT_KEEPOUT_X_MIN) / 2)
    keep_shape = B.val(keep)
    for p in parts:
        if p.material in B.METAL_MATERIALS and bbox_overlap(p.shape, keep_shape):
            v = common_volume(p.shape, keep_shape)
            if v > 1e-6:
                report["antenna"].append({"part": p.name, "volume_mm3": round(v, 4)})
                report["pass"] = False

    # Largest motor height the layout accepts (battery spacer sets the limit)
    bat_bottom = P.PCB_Z_BOTTOM + P.PCB_T + P.BAT_SPACER_T
    report["motor_max_height_mm"] = round(bat_bottom - 0.2 - P.MOTOR_SEAT_Z, 2)

    # Bodies and overall size
    lo = by["Lower_housing"].BoundingBox()
    up = by["Upper_housing_removable_cover"].BoundingBox()
    report["pod"] = {
        "length_body": P.BODY_L,
        "length_lug_to_lug": round(lo.xlen, 2),
        "width": round(lo.ylen, 2),
        "height_with_boss": round(up.zmax - lo.zmin, 2),
    }
    closed = [by["Band_strap_A_short"].Volume(), by["Band_strap_B_long"].Volume()]
    report["band"] = {
        "wrist_perimeter_reference": round(B.PATH.perimeter(), 1),
        # a hole nearer the strap root (positive offset) takes up strap, so it fits a smaller wrist
        "adjust_range_mm": [round(B.PATH.perimeter() - o, 1) for o in (max(P.CLASP_HOLE_OFFSETS), min(P.CLASP_HOLE_OFFSETS))],
        "strap_volume_mm3": [round(v, 1) for v in closed],
    }
    wrist = B.val(B.wrist_reference())
    for name in ("Band_strap_A_short", "Band_strap_B_long", "Lower_housing"):
        report["clearances"][f"{name} to reference wrist"] = round(by[name].distance(wrist), 3)

    # All solids valid?
    bad = [p.name for p in parts if not p.shape.isValid()]
    report["invalid_shapes"] = bad
    if bad:
        report["pass"] = False

    density = {"housing": 1.2, "band": 1.2, "foam": 0.2, "pcb": 1.9, "ble_board": 1.9, "can": 3.0,
               "ic": 2.0, "lipo": 2.3, "kapton": 2.0, "motor": 5.0, "steel": 7.8, "gold": 8.0,
               "window": 1.2, "nylon": 1.1, "ceramic": 3.5, "passive": 3.0, "wire_red": 3.0, "wire_blk": 3.0}
    grams = sum(p.shape.Volume() * density.get(p.material, 0) / 1000 for p in parts if not p.cosmetic)
    report["mass_estimate_g"] = round(grams, 1)
    return report


# ---------------------------------------------------------------- exports
def moved(shape, v):
    return shape.moved(cq.Location(cq.Vector(*v))) if any(v) else shape


def write_step(parts, offsets, path):
    assy = cq.Assembly(name=path.stem)
    for p, off in zip(parts, offsets):
        rgba, _, _ = B.MATERIALS[p.material]
        assy.add(moved(p.shape, off), name=p.name, color=cq.Color(*rgba))
    assy.export(str(path))


def part_mesh(shape, tol=0.01, ang=0.15):
    verts, tris = shape.tessellate(tol, ang)
    v = np.array([[q.x, q.y, q.z] for q in verts], float)
    return trimesh.Trimesh(vertices=v, faces=np.array(tris, int), process=False)


def write_glb(parts, offsets, path, meshes):
    """GLB holds named meshes with PBR colours, Y-up and in metres per the glTF spec."""
    scene = trimesh.Scene()
    to_gltf = np.array([[1e-3, 0, 0, 0], [0, 0, 1e-3, 0], [0, -1e-3, 0, 0], [0, 0, 0, 1]], float)
    for p, off in zip(parts, offsets):
        m = meshes[p.name].copy()
        m.apply_translation(off)
        m.apply_transform(to_gltf)
        rgba, metal, rough = B.MATERIALS[p.material]
        m.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(
            name=p.material, baseColorFactor=rgba, metallicFactor=metal, roughnessFactor=rough,
            alphaMode="BLEND" if rgba[3] < 1 else "OPAQUE"))
        scene.add_geometry(m, node_name=p.name, geom_name=p.name)
    path.write_bytes(scene.export(file_type="glb"))


def layout_offsets(parts):
    """Grid position per component. True scale, grouped by logical component."""
    order = ["Upper housing", "Lower housing", "PCB", "BLE", "Accelerometer", "PPG", "Gasket", "Window",
             "Battery", "Spacer", "Motor", "Pogo", "Screws", "StrapA", "StrapB", "Stud", "Keeper"]
    groups = {c: [p for p in parts if p.component == c] for c in order}
    box_of = {}
    for c, ps in groups.items():
        bbs = [p.shape.BoundingBox() for p in ps]
        box_of[c] = (min(b.xmin for b in bbs), max(b.xmax for b in bbs), min(b.ymin for b in bbs),
                     max(b.ymax for b in bbs), min(b.zmin for b in bbs))
    gap, cols = 16.0, 5
    x = y = row_h = 0.0
    off = {}
    for i, c in enumerate(order):
        x0, x1, y0, y1, z0 = box_of[c]
        if i and i % cols == 0:
            x, y, row_h = 0.0, y - row_h - gap, 0.0
        off[c] = (x - x0, y - y1, -z0)
        x += x1 - x0 + gap
        row_h = max(row_h, y1 - y0)
    return [off[p.component] for p in parts]


def section_parts(parts):
    """Each part cut at Y = 0, keeping Y >= 0, for the stack-up section view."""
    keep = B.val(B.box(300, 150, -120, 40, 0, 75))
    out = []
    for p in parts:
        bb = p.shape.BoundingBox()
        if bb.ymax < 0:
            continue
        try:
            s = p.shape.intersect(keep)
            if s.Volume() > 1e-6:
                out.append(B.Part("SEC_" + p.name, s, p.material, p.component, p.cosmetic))
        except Exception:
            pass
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="run the fit checks only")
    args = ap.parse_args()

    print("Building geometry ...")
    parts = B.build_parts()
    print(f"  {len(parts)} named parts")

    print("Running fit checks ...")
    report = run_checks(parts)
    print(json.dumps(report, indent=2))

    if args.check:
        sys.exit(0 if report["pass"] else 1)

    if OUT.exists():
        shutil.rmtree(OUT / "step", ignore_errors=True)
        shutil.rmtree(OUT / "stl", ignore_errors=True)
        shutil.rmtree(OUT / "glb", ignore_errors=True)
    for d in ("step", "stl", "glb"):
        (OUT / d).mkdir(parents=True, exist_ok=True)
    (OUT / "fit_report.json").write_text(json.dumps(report, indent=2))

    print("Exporting ...")
    none = [(0, 0, 0)] * len(parts)
    exploded = [B.EXPLODE[p.component] for p in parts]
    layout = layout_offsets(parts)

    write_step(parts, none, OUT / "step" / "bracelet_assembled.step")
    write_step(parts, exploded, OUT / "step" / "bracelet_exploded.step")
    write_step(parts, layout, OUT / "step" / "bracelet_layout.step")

    meshes = {}
    for p in parts:
        meshes[p.name] = part_mesh(p.shape)
        meshes[p.name].export(OUT / "stl" / f"{p.name}.stl")

    write_glb(parts, none, OUT / "glb" / "bracelet_assembled.glb", meshes)
    write_glb(parts, exploded, OUT / "glb" / "bracelet_exploded.glb", meshes)
    write_glb(parts, layout, OUT / "glb" / "bracelet_layout.glb", meshes)

    sec = section_parts(parts)
    sec_meshes = {p.name: part_mesh(p.shape) for p in sec}
    write_glb(sec, [(0, 0, 0)] * len(sec), OUT / "glb" / "bracelet_section_Y0.glb", sec_meshes)

    manifest = {
        "materials": {k: {"rgba": v[0], "metallic": v[1], "roughness": v[2]} for k, v in B.MATERIALS.items()},
        "parts": [
            {
                "name": p.name, "material": p.material, "component": p.component, "cosmetic": p.cosmetic,
                "explode": list(B.EXPLODE[p.component]),
                "bbox": (lambda b: [b.xmin, b.xmax, b.ymin, b.ymax, b.zmin, b.zmax])(p.shape.BoundingBox()),
            }
            for p in parts
        ],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1))
    print("Done. Fit check:", "PASS" if report["pass"] else "FAIL, see fit_report.json")
    sys.exit(0 if report["pass"] else 1)


if __name__ == "__main__":
    main()
