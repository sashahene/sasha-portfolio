"""
Render every presentation view from the exported GLB, using Blender in background mode.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P render_views.py -- [--samples 96] [--only v1,v3]

Writes output/renders/raw/<view>.png with transparency, and output/renders/raw/cameras.json,
which annotate.py uses to place the labels. All cameras are orthographic, so a dimension
measured along a given axis has the same scale everywhere in a view.
"""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output"
RAW = OUT / "renders" / "raw"
RAW.mkdir(parents=True, exist_ok=True)

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAMPLES = int(argv[argv.index("--samples") + 1]) if "--samples" in argv else 96
ONLY = set(argv[argv.index("--only") + 1].split(",")) if "--only" in argv else None

manifest = json.loads((OUT / "manifest.json").read_text())
PART = {p["name"]: p for p in manifest["parts"]}
HOUSING = {"Upper_housing_removable_cover", "Lower_housing"}
BAND = {p["name"] for p in manifest["parts"] if p["component"] in ("StrapA", "StrapB", "Stud", "Keeper")}
ALL = set(PART)


# ---------------------------------------------------------------- scene
def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    try:
        scene.render.engine = "CYCLES"
    except TypeError as e:
        sys.exit(f"Cycles not available: {e}")
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        scene.cycles.device = "GPU"
        print("Render device: Metal")
    except Exception as e:  # falls back to CPU on other machines
        print("Render device: CPU", e)
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    world = bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.82, 0.84, 0.87, 1)
    bg.inputs[1].default_value = 0.34
    for name, energy, rot, angle in (
        ("Key", 1.9, (math.radians(50), 0, math.radians(35)), 28),
        ("Fill", 0.5, (math.radians(65), 0, math.radians(-70)), 50),
        ("Rim", 1.5, (math.radians(115), 0, math.radians(170)), 25),
    ):
        light = bpy.data.lights.new(name, "SUN")
        light.energy = energy
        light.angle = math.radians(angle)
        ob = bpy.data.objects.new(name, light)
        scene.collection.objects.link(ob)
        ob.rotation_euler = rot
    cam = bpy.data.cameras.new("Cam")
    cam.type = "ORTHO"
    cam.clip_start = 1
    cam.clip_end = 5000
    ob = bpy.data.objects.new("Cam", cam)
    scene.collection.objects.link(ob)
    scene.camera = ob
    # soft contact shadow
    bpy.ops.mesh.primitive_plane_add(size=4000)
    floor = bpy.context.object
    floor.name = "Floor"
    floor.is_shadow_catcher = True
    return scene, ob, floor


def principled(mat):
    mat.use_nodes = True
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def set_input(node, names, value):
    for n in names:
        if n in node.inputs:
            node.inputs[n].default_value = value
            return


def make_materials():
    mats = {}
    for key, spec in manifest["materials"].items():
        m = bpy.data.materials.new(key)
        b = principled(m)
        r, g, b_, a = spec["rgba"]
        set_input(b, ["Base Color"], (r, g, b_, 1))
        set_input(b, ["Metallic"], spec["metallic"])
        set_input(b, ["Roughness"], spec["roughness"])
        if key == "window":
            set_input(b, ["Transmission Weight", "Transmission"], 0.9)
            set_input(b, ["IOR"], 1.49)
        if key in ("housing", "band"):  # fine FDM/SLS style grain
            nt = m.node_tree
            tex = nt.nodes.new("ShaderNodeTexNoise")
            tex.inputs["Scale"].default_value = 26.0
            tex.inputs["Detail"].default_value = 3.0
            bump = nt.nodes.new("ShaderNodeBump")
            bump.inputs["Strength"].default_value = 0.08
            bump.inputs["Distance"].default_value = 0.05
            nt.links.new(tex.outputs[0], bump.inputs["Height"])
            nt.links.new(bump.outputs[0], b.inputs["Normal"])
        mats[key] = m

    # see-through housing: faces edge-on stay darker, so the shape still reads
    g = bpy.data.materials.new("housing_glass")
    b = principled(g)
    set_input(b, ["Base Color"], (0.05, 0.06, 0.07, 1))
    set_input(b, ["Roughness"], 0.3)
    nt = g.node_tree
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs[0].default_value = 0.35
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = 0.05
    mr.inputs["To Max"].default_value = 0.5
    nt.links.new(lw.outputs["Facing"], mr.inputs["Value"])
    nt.links.new(mr.outputs[0], b.inputs["Alpha"])
    try:
        g.surface_render_method = "BLENDED"
    except Exception:
        pass
    mats["housing_glass"] = g
    return mats


def import_glb(path, prefix=""):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    new = [o for o in bpy.data.objects if o not in before]
    out = {}
    for ob in new:
        if ob.type != "MESH":
            continue
        ob.data.transform(ob.matrix_world @ Matrix.Scale(1000, 4))
        out[ob.name.split(".")[0]] = ob
    for ob in new:  # bake the transform, drop the empties
        if ob.type == "MESH":
            ob.parent = None
            ob.matrix_world = Matrix.Identity(4)
            ob.data.shade_smooth()
        else:
            bpy.data.objects.remove(ob)
    return out


scene, cam, floor = setup_scene()
MATS = make_materials()
OBJS = import_glb(OUT / "glb" / "bracelet_assembled.glb")
SEC = import_glb(OUT / "glb" / "bracelet_section_Y0.glb")
missing = ALL - set(OBJS)
if missing:
    sys.exit(f"Parts missing from GLB: {missing}")
for name, ob in OBJS.items():
    ob.data.materials.clear()
    ob.data.materials.append(MATS[PART[name]["material"]])
for name, ob in SEC.items():
    ob.data.materials.clear()
    ob.data.materials.append(MATS[PART[name[4:]]["material"]])

CAMS = {}
cam_file = RAW / "cameras.json"
if cam_file.exists() and ONLY:
    CAMS = json.loads(cam_file.read_text())


def world_box(ob, off):
    return [ob.matrix_world @ Vector(c) + Vector(off) for c in ob.bound_box]


def render(view, visible, direction, res=(2400, 1500), offsets=None, glass=(), margin=(0.30, 0.14),
           ortho=None, center=None, samples=None, sections=False, up=(0, 0, 1), catcher=True):
    if ONLY and view not in ONLY and view.split("_")[0] not in ONLY:
        return
    offsets = offsets or {}
    pool = SEC if sections else OBJS
    other = OBJS if sections else SEC
    for ob in other.values():
        ob.hide_render = True
    pts = []
    for name, ob in pool.items():
        key = name[4:] if sections else name
        show = key in visible
        ob.hide_render = not show
        off = offsets.get(key, (0, 0, 0))
        ob.location = off
        if not sections:
            mat_key = "housing_glass" if key in glass else PART[key]["material"]
            ob.data.materials[0] = MATS[mat_key]
        if show:
            pts += [Vector(c) + Vector(off) for c in ob.bound_box]

    d = Vector(direction).normalized()
    u = Vector(up)
    right = u.cross(d).normalized()
    upv = d.cross(right).normalized()
    xs, ys = [p.dot(right) for p in pts], [p.dot(upv) for p in pts]
    if center is None:
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        z_mid = sum(p.dot(d) for p in pts) / len(pts)
        c = right * cx + upv * cy + d * z_mid
    else:
        c = Vector(center)
    W, H = res
    if ortho is None:
        ortho = max((max(xs) - min(xs)) / (1 - margin[0]),
                    (max(ys) - min(ys)) * W / H / (1 - margin[1]))
    rot = Matrix((right, upv, d)).transposed().to_4x4()
    cam.matrix_world = Matrix.Translation(c + d * 800) @ rot
    cam.data.ortho_scale = ortho
    bpy.context.view_layer.update()

    floor.location = (0, 0, min(p.z for p in pts) - 0.6)
    floor.hide_render = not (catcher and direction[2] >= 0)

    scene.render.resolution_x, scene.render.resolution_y = W, H
    scene.render.resolution_percentage = 100
    scene.cycles.samples = samples or SAMPLES
    scene.render.filepath = str(RAW / f"{view}.png")
    bpy.ops.render.render(write_still=True)
    CAMS[view] = {
        "matrix": [list(r) for r in cam.matrix_world],
        "ortho": ortho,
        "res": list(res),
        "offsets": {k: list(v) for k, v in offsets.items()},
    }
    cam_file.write_text(json.dumps(CAMS, indent=1))
    print("Rendered", view)


ISO = (1.0, -1.25, 0.85)
UNDER = (0.9, -1.2, -0.95)
OPEN = (0.75, -1.0, 1.2)
explode = {n: tuple(p["explode"]) for n, p in PART.items()}
pod_center = (0, 0, 4)

# View 1 and View 2 share one camera, so they line up and share a scale.
render("v1_assembled", ALL, ISO, margin=(0.34, 0.16), catcher=False)
if "v1_assembled" in CAMS:
    render("v2_transparent", ALL, ISO, glass=HOUSING, ortho=CAMS["v1_assembled"]["ortho"],
           margin=(0.34, 0.16), catcher=False)

# Close-ups of the pod at one shared scale
POD_ORTHO = 98
render("v2b_transparent_pod", ALL - BAND, ISO, glass=HOUSING, ortho=POD_ORTHO, res=(2400, 1500))
render("v2c_transparent_underside", ALL - BAND, UNDER, glass=HOUSING, ortho=POD_ORTHO, res=(2400, 1500))

render("v3_exploded", ALL, (1.0, -1.45, 0.42), res=(2400, 2400), offsets=explode, margin=(0.30, 0.09), catcher=False)

# Internal assembly: cover off, then battery out
open_set = ALL - BAND - {"Upper_housing_removable_cover"}
render("v5a_internal", open_set, OPEN, ortho=POD_ORTHO, res=(2400, 1500))
no_bat = {n for n in open_set if PART[n]["component"] not in ("Battery", "Spacer")}
render("v5b_internal_no_battery", no_bat, OPEN, ortho=POD_ORTHO, res=(2400, 1500))

# Stack-up section at Y = 0
render("v6_section", ALL - BAND, (0, -1, 0), ortho=78, res=(2400, 1100), sections=True, catcher=False)

# Individual components, each framed to fit its own cell
CELLS = ["Upper housing", "Lower housing", "PCB", "BLE", "Accelerometer", "PPG", "Gasket", "Window", "Battery",
         "Spacer", "Motor", "Pogo", "Screws", "StrapA", "StrapB", "Stud", "Keeper"]
for comp in CELLS:
    names = {n for n, p in PART.items() if p["component"] == comp}
    dirn = UNDER if comp in ("PPG", "Pogo", "Window", "Gasket") else ISO
    slug = comp.replace(" ", "_")
    render(f"v4cell_{slug}", names, dirn, res=(760, 560), margin=(0.3, 0.26), samples=max(32, SAMPLES // 2), catcher=False)
print("All renders complete")
