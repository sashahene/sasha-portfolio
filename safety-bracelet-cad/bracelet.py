"""
Parametric CadQuery model of the wearable safety bracelet.

build_parts() returns a list of Part objects, one per named 3D body, all in their
assembled positions. Nothing here writes files, see build.py for that.
"""
import math
from dataclasses import dataclass

import cadquery as cq
import numpy as np

import params as P


@dataclass
class Part:
    name: str            # unique object name, used in STEP / GLB / STL
    shape: cq.Shape      # a solid or compound, in assembled position
    material: str        # key into MATERIALS
    component: str       # logical component, parts sharing it move together
    cosmetic: bool = False  # surface detail, skipped by the interference check


# rgba 0-1, metallic, roughness
MATERIALS = {
    "housing":   ((0.030, 0.030, 0.032, 1.0), 0.0, 0.72),
    "band":      ((0.022, 0.022, 0.024, 1.0), 0.0, 0.80),
    "window":    ((0.55, 0.62, 0.66, 0.45), 0.0, 0.08),
    "foam":      ((0.05, 0.05, 0.05, 1.0), 0.0, 0.95),
    "pcb":       ((0.03, 0.26, 0.15, 1.0), 0.0, 0.35),
    "copper":    ((0.86, 0.66, 0.30, 1.0), 1.0, 0.30),
    "fr4":       ((0.72, 0.68, 0.48, 1.0), 0.0, 0.60),
    "ic":        ((0.035, 0.035, 0.04, 1.0), 0.0, 0.40),
    "ble_board": ((0.05, 0.10, 0.28, 1.0), 0.0, 0.35),
    "can":       ((0.70, 0.71, 0.72, 1.0), 0.8, 0.5),
    "ceramic":   ((0.80, 0.78, 0.72, 1.0), 0.0, 0.50),
    "passive":   ((0.63, 0.50, 0.33, 1.0), 0.0, 0.45),
    "optic":     ((0.92, 0.55, 0.15, 1.0), 0.0, 0.15),
    "lipo":      ((0.70, 0.71, 0.73, 1.0), 0.75, 0.42),
    "kapton":    ((0.80, 0.47, 0.08, 1.0), 0.0, 0.35),
    "motor":     ((0.62, 0.63, 0.64, 1.0), 0.7, 0.5),
    "wire_red":  ((0.72, 0.05, 0.04, 1.0), 0.0, 0.45),
    "wire_blk":  ((0.03, 0.03, 0.03, 1.0), 0.0, 0.45),
    "gold":      ((0.85, 0.65, 0.25, 1.0), 0.8, 0.42),
    "steel":     ((0.48, 0.49, 0.51, 1.0), 0.7, 0.55),
    "nylon":     ((0.05, 0.05, 0.05, 1.0), 0.0, 0.55),
}


# ---------------------------------------------------------------- small helpers
def box(lx, ly, z0, z1, cx=0.0, cy=0.0):
    return cq.Workplane("XY").workplane(offset=z0).center(cx, cy).rect(lx, ly).extrude(z1 - z0)


def rbox(lx, ly, z0, z1, r, cx=0.0, cy=0.0):
    return box(lx, ly, z0, z1, cx, cy).edges("|Z").fillet(r)


def cyl(d, z0, z1, cx=0.0, cy=0.0):
    return cq.Workplane("XY").workplane(offset=z0).center(cx, cy).circle(d / 2).extrude(z1 - z0)


def y_cyl(d, x, z, half_len):
    return cq.Workplane("XZ").center(x, z).circle(d / 2).extrude(half_len, both=True)


def val(wp):
    """Workplane -> single Shape (compound if needed)."""
    objs = [o for o in wp.vals() if isinstance(o, cq.Shape)]
    return objs[0] if len(objs) == 1 else cq.Compound.makeCompound(objs)


def wire(points, d):
    """Round wire swept along a 3D spline through points."""
    pts = [cq.Vector(*p) for p in points]
    path = cq.Wire.assembleEdges([cq.Edge.makeSpline(pts)])
    tangent = path.tangentAt(0)
    circle = cq.Wire.makeCircle(d / 2, pts[0], tangent)
    return cq.Solid.sweep(circle, [], path, True, True)


def trace_set(polylines, z0, z1, width=0.22):
    """Thin copper traces and via dots. Cosmetic, so they stay a plain compound."""
    solids = []
    for line in polylines:
        for (x0, y0), (x1, y1) in zip(line[:-1], line[1:]):
            length = math.hypot(x1 - x0, y1 - y0)
            nx, ny = -(y1 - y0) / length * width / 2, (x1 - x0) / length * width / 2
            poly = [(x0 + nx, y0 + ny), (x1 + nx, y1 + ny), (x1 - nx, y1 - ny), (x0 - nx, y0 - ny)]
            solids.append(val(cq.Workplane("XY").workplane(offset=z0).polyline(poly).close().extrude(z1 - z0)))
        for x, y in line:  # round the joints
            solids.append(val(cyl(width, z0, z1, x, y)))
    return cq.Compound.makeCompound(solids)


# ---------------------------------------------------------------- pod profile
_R_TOP = (P.BODY_L / 2) ** 2 / (2 * (P.Z_TOP_CENTER - P.Z_TOP_END)) + (P.Z_TOP_CENTER - P.Z_TOP_END) / 2


def z_top(x):
    """Outer top surface height at x."""
    return P.Z_TOP_CENTER - _R_TOP + math.sqrt(_R_TOP ** 2 - x ** 2)


def z_bot(x):
    """Outer skin-side surface height at x."""
    ax = abs(x)
    if ax <= P.BOT_FLAT_HALF:
        return 0.0
    return P.Z_BOT_END * ((ax - P.BOT_FLAT_HALF) / (P.BODY_L / 2 - P.BOT_FLAT_HALF)) ** 2


def profile_solid(half_l, width, inset_bot=0.0, inset_top=0.0):
    """Side profile (XZ) extruded across Y. Insets produce the matching cavity."""
    f = P.BOT_FLAT_HALF
    mx = (half_l + f) / 2
    return (
        cq.Workplane("XZ")
        .moveTo(-f, inset_bot)
        .lineTo(f, inset_bot)
        .threePointArc((mx, z_bot(mx) + inset_bot), (half_l, z_bot(half_l) + inset_bot))
        .lineTo(half_l, z_top(half_l) - inset_top)
        .threePointArc((0, P.Z_TOP_CENTER - inset_top), (-half_l, z_top(half_l) - inset_top))
        .lineTo(-half_l, z_bot(half_l) + inset_bot)
        .threePointArc((-mx, z_bot(mx) + inset_bot), (-f, inset_bot))
        .close()
        .extrude(width / 2, both=True)
    )


def outer_body():
    plan = rbox(P.BODY_L, P.BODY_W, -1, 14, P.BODY_CORNER_R)
    body = val(plan.intersect(profile_solid(P.BODY_L / 2, P.BODY_W + 2)))

    def is_top(e):
        return e.Center().z > 7.5

    def is_bottom(e):
        c = e.Center()
        seam = abs(abs(c.x) - P.BOT_FLAT_HALF) < 0.01 and abs(c.y) < 0.01
        return c.z < 1.8 and not seam

    body = body.fillet(P.TOP_EDGE_FILLET, [e for e in body.Edges() if is_top(e)])
    body = body.fillet(P.BOT_EDGE_FILLET, [e for e in body.Edges() if is_bottom(e)])
    return cq.Workplane(obj=body)


def cavity():
    half_l = P.BODY_L / 2 - P.WALL_SIDE
    w = P.BODY_W - 2 * P.WALL_SIDE
    plan = rbox(2 * half_l, w, -1, 14, P.CAVITY_CORNER_R)
    return plan.intersect(profile_solid(half_l, w + 2, P.WALL_FLOOR, P.WALL_TOP))


def screw_head_z(x):
    return z_bot(x) + 0.1


# ---------------------------------------------------------------- housings
def lower_housing():
    body = outer_body().intersect(box(100, 100, -5, P.Z_SPLIT))

    # lugs: a stadium extruded across the full width, centre removed
    ears = None
    for s in (-1, 1):
        ear = (
            cq.Workplane("XZ")
            .moveTo(s * P.LUG_ROOT_X, P.LUG_PIN_Z - P.LUG_R)
            .lineTo(s * P.LUG_PIN_X, P.LUG_PIN_Z - P.LUG_R)
            .threePointArc((s * (P.LUG_PIN_X + P.LUG_R), P.LUG_PIN_Z), (s * P.LUG_PIN_X, P.LUG_PIN_Z + P.LUG_R))
            .lineTo(s * P.LUG_ROOT_X, P.LUG_PIN_Z + P.LUG_R)
            .close()
            .extrude(P.BODY_W / 2, both=True)
        )
        ear = ear.cut(box(100, 2 * P.LUG_INNER_Y, -5, 20))
        ears = ear if ears is None else ears.union(ear)
    body = body.union(ears)

    # sensor boss on the skin side
    boss = rbox(P.BOSS_L, P.BOSS_W, -P.BOSS_H, 0.3, 2.0, *P.PPG_XY)
    body = body.union(boss)

    body = body.cut(cavity())

    # screw bosses, standoffs, locating pins
    for x, y in P.SCREW_XY:
        post = cyl(P.POST_D, z_bot(x) + 0.6, P.Z_SPLIT, x, y).intersect(outer_body())
        body = body.union(post)
    for x, y in P.STANDOFF_XY:
        body = body.union(cyl(P.STANDOFF_D, z_bot(x) + 0.6, P.PCB_Z_BOTTOM, x, y))
        body = body.union(cyl(P.LOCATING_PIN_D, P.PCB_Z_BOTTOM - 0.1, P.PCB_Z_BOTTOM + 0.7, x, y))

    # motor seat and retaining ring
    mx, my = P.MOTOR_XY
    seat = cyl(P.MOTOR_RING_OD, 0.6, P.MOTOR_SEAT_Z, mx, my).intersect(outer_body())
    ring = cyl(P.MOTOR_RING_OD, P.MOTOR_SEAT_Z, P.MOTOR_RING_TOP, mx, my).cut(
        cyl(P.MOTOR_RING_ID, P.MOTOR_SEAT_Z, P.MOTOR_RING_TOP + 1, mx, my)
    )
    ring = ring.cut(box(4, 3.2, P.MOTOR_SEAT_Z, P.MOTOR_RING_TOP + 1, mx + P.MOTOR_RING_OD / 2, my))  # wire exit
    body = body.union(seat).union(ring)

    # stepped window opening
    px, py = P.PPG_XY
    body = body.cut(rbox(P.WINDOW_THROAT_L, P.WINDOW_THROAT_W, -2, 2, 0.8, px, py))
    pocket_z0 = -P.BOSS_H + P.WINDOW_T - P.WINDOW_FLANGE_T
    body = body.cut(rbox(P.WINDOW_L, P.WINDOW_W, pocket_z0, 2.5, 1.0, px, py))

    # screw clearance and head counterbores
    for x, y in P.SCREW_XY:
        body = body.cut(cyl(P.SCREW_CLEAR_D, -2, P.Z_SPLIT + 1, x, y))
        body = body.cut(cyl(P.SCREW_HEAD_D + 0.2, -2, screw_head_z(x) + P.SCREW_HEAD_H, x, y))

    # charging contact holes
    for x, y in P.POGO_XY:
        body = body.cut(cyl(P.POGO_D + 0.2, -2, 2.0, x, y))

    # spring-bar holes
    for s in (-1, 1):
        body = body.cut(y_cyl(P.LUG_HOLE_D, s * P.LUG_PIN_X, P.LUG_PIN_Z, P.BODY_W))
    return body


def upper_housing():
    body = outer_body().intersect(box(100, 100, P.Z_SPLIT, 20)).cut(cavity())

    iw = P.BODY_W - 2 * P.WALL_SIDE
    il = P.BODY_L - 2 * P.WALL_SIDE
    c = P.TONGUE_CLEARANCE
    t = P.TONGUE_THICK
    z_low = P.PCB_Z_BOTTOM + P.PCB_T + P.TONGUE_PCB_GAP
    inner = rbox(il - 2 * (c + t), iw - 2 * (c + t), z_low - 1, P.Z_SPLIT + 2, 2.8)

    tongue_low = rbox(il - 2 * c, iw - 2 * c, z_low, P.Z_SPLIT, 3.4).cut(inner)
    tongue_up = rbox(il + 0.8, iw + 0.8, P.Z_SPLIT, P.Z_SPLIT + 0.8, 3.9).cut(inner)
    tongue = tongue_low.union(tongue_up)
    for x, y in P.SCREW_XY:
        tongue = tongue.cut(cyl(P.POST_D + 0.8, z_low - 1, P.Z_SPLIT, x, y))
    tongue = tongue.intersect(outer_body())
    body = body.union(tongue)

    # screw bosses in the cover
    for x, y in P.SCREW_XY:
        top = z_top(x) - P.WALL_TOP + 0.4
        post = cyl(P.POST_D, P.Z_SPLIT, top, x, y)
        body = body.union(post)

    # ribs that cradle the battery
    bat_x0 = P.BAT_X_MAX - P.BAT_L
    z_rib = P.PCB_Z_BOTTOM + P.PCB_T + P.BAT_SPACER_T + 2.0
    for s in (-1, 1):
        rib = box(P.BAT_L - 1.6, 0.75, z_rib, 11, (bat_x0 + P.BAT_X_MAX) / 2 + 0.4, s * (P.BAT_W / 2 + 0.625))
        body = body.union(rib.intersect(outer_body()))
    end_rib = box(0.5, 10.5, P.PCB_Z_BOTTOM + P.PCB_T + BLE_TOP_GAP(), 11, P.BAT_X_MAX + 0.5, -1.75)
    body = body.union(end_rib.intersect(outer_body()))

    # pilot holes, blind
    for x, y in P.SCREW_XY:
        body = body.cut(cyl(P.SCREW_PILOT_D, P.Z_SPLIT - 1, z_top(x) - P.WALL_TOP - 0.6, x, y))
    return body


def BLE_TOP_GAP():
    return P.BLE_H + 0.4


# ---------------------------------------------------------------- PCB
PCB_TOP_TRACES = [
    # module south-edge pads to accelerometer, charger
    [(5.0, -5.2), (5.0, -6.2)],
    [(6.2, -5.2), (6.2, -6.0), (5.9, -6.3), (5.9, -7.0)],
    [(7.4, -5.2), (7.4, -5.9)],
    [(8.6, -5.2), (8.6, -6.2)],
    [(4.0, -5.2), (4.0, -6.8)],
    # module north-edge pads to LDO, battery pads
    [(8.0, 5.2), (8.0, 6.3)],
    [(9.2, 5.2), (9.2, 6.3)],
    [(6.0, 5.2), (6.0, 6.2), (4.4, 6.2)],
    [(4.4, 7.4), (6.6, 7.4)],
    [(5.0, 5.2), (5.0, 5.6)],
    # bus running under the battery toward the motor pads
    [(2.2, -3.6), (-3.0, -3.6), (-6.2, -3.0), (-7.6, -1.8)],
    [(2.2, -2.4), (-4.0, -2.4), (-7.0, -1.2)],
    [(2.2, -1.2), (-6.0, -1.2), (-7.2, 0.0)],
    [(2.2, 0.0), (-5.0, 0.0)],
    [(2.2, 1.2), (-6.0, 1.2), (-7.2, 2.2)],
    [(2.2, 2.4), (-4.0, 2.4), (-6.8, 3.2)],
    [(-12.0, 5.4), (-6.5, 5.4), (-3.5, 3.6), (2.2, 3.6)],
    [(-12.0, -5.4), (-6.5, -5.4), (-3.5, -3.6)],
]
PCB_BOTTOM_TRACES = [
    [(-7.6, -1.4), (-5.6, -1.4), (-4.6, -2.8)],
    [(-7.6, 1.4), (-5.6, 1.4), (-4.6, 2.8)],
    [(-2.8, -1.0), (-3.6, -1.0), (-3.6, -2.2)],
    [(-2.8, 1.0), (-3.6, 1.0), (-3.6, 2.2)],
    [(2.8, -1.0), (4.0, -1.0), (7.0, -3.0)],
    [(2.8, 1.0), (4.0, 1.0), (7.0, 3.0)],
    [(2.8, 0.0), (11.0, 0.0)],
    [(8.0, -3.0), (10.5, -4.8), (12.5, -4.8)],
    [(8.0, 3.0), (10.5, 4.8), (12.5, 4.8)],
    [(0.0, -1.65), (0.0, -6.0), (3.0, -7.0)],
    [(0.0, 1.65), (0.0, 6.0), (3.0, 7.0)],
]
BAT_PADS = [(4.0, 6.2), (4.0, 7.4)]
MOTOR_PADS = [(-7.6, -1.4), (-7.6, 1.4)]


def pcb():
    z0, z1 = P.PCB_Z_BOTTOM, P.PCB_Z_BOTTOM + P.PCB_T
    board = rbox(P.PCB_L, P.PCB_W, z0, z1, P.PCB_CORNER_R)
    for x, y in P.SCREW_XY:
        board = board.cut(cyl(P.PCB_POST_NOTCH_D, z0 - 1, z1 + 1, x, y))
    for x, y in P.STANDOFF_XY:
        board = board.cut(cyl(P.LOCATING_HOLE_D, z0 - 1, z1 + 1, x, y))
    # U-shaped motor cut-out, open at the -X end
    mx, my = P.MOTOR_XY
    r = P.MOTOR_NOTCH_W / 2
    board = board.cut(cyl(P.MOTOR_NOTCH_W, z0 - 1, z1 + 1, mx, my))
    board = board.cut(box(-P.PCB_L / 2 * -1, P.MOTOR_NOTCH_W, z0 - 1, z1 + 1, mx - P.PCB_L / 4, my))
    return board


def pcb_parts():
    z0, z1 = P.PCB_Z_BOTTOM, P.PCB_Z_BOTTOM + P.PCB_T
    ztop = (z1 - 0.005, z1 + 0.03)
    zbot = (z0 - 0.03, z0 + 0.005)
    parts = [
        Part("PCB_main_board", val(pcb()), "pcb", "PCB"),
        Part("PCB_traces_top", trace_set(PCB_TOP_TRACES, *ztop), "copper", "PCB", True),
        Part("PCB_traces_bottom", trace_set(PCB_BOTTOM_TRACES, *zbot), "copper", "PCB", True),
    ]

    # bare FR-4 patch marks the antenna copper keep-out
    keep_len = P.PCB_L / 2 - P.ANT_KEEPOUT_X_MIN
    keep = box(keep_len, P.PCB_W, z1 - 0.005, z1 + 0.02, P.ANT_KEEPOUT_X_MIN + keep_len / 2)
    keep = keep.intersect(rbox(P.PCB_L, P.PCB_W, z1 - 1, z1 + 1, P.PCB_CORNER_R))
    for x, y in P.STANDOFF_XY:
        keep = keep.cut(cyl(P.LOCATING_HOLE_D, z1 - 1, z1 + 1, x, y))
    parts.append(Part("PCB_antenna_keepout", val(keep), "fr4", "PCB", True))

    pads = [val(cyl(1.0, ztop[0], ztop[1] + 0.01, x, y)) for x, y in BAT_PADS]
    pads += [val(cyl(1.0, zbot[0] - 0.01, zbot[1], x, y)) for x, y in MOTOR_PADS]
    pads += [val(cyl(2.2, zbot[0] - 0.01, zbot[1], x, y)) for x, y in P.POGO_XY]
    parts.append(Part("PCB_solder_pads", cq.Compound.makeCompound(pads), "gold", "PCB", True))

    # support parts that stay on the board
    h = 1.1
    parts.append(Part("U_charger_IC_MCP73831", val(box(2.9, 1.6, z1, z1 + h, 8.2, -7.6)), "ic", "PCB"))
    parts.append(Part("U_LDO_regulator", val(box(2.0, 2.0, z1, z1 + 0.8, 7.4, 7.6)), "ic", "PCB"))
    parts.append(Part("U_motor_driver_FET", val(box(2.9, 1.6, z0 - 1.0, z0, -4.6, -5.0)), "ic", "PCB"))

    # 0402 parts. Those under the battery sit between the foam strips (|y| < 4.5).
    top_caps = [(5.8, -8.8), (10.0, 6.8), (5.6, 8.9), (10.0, -5.8), (-2.0, -4.0), (-2.0, 4.0), (-7.4, -3.9), (-7.4, 3.9)]
    bot_caps = [(-5.0, 0.0), (3.4, -2.6), (3.4, 2.6), (-2.6, -3.4), (-2.6, 3.4), (11.5, -3.2), (11.5, 3.2)]
    caps = [val(box(1.0, 0.5, z1, z1 + 0.5, x, y)) for x, y in top_caps]
    for x, y in bot_caps:
        caps.append(val(box(1.0, 0.5, z0 - 0.5, z0, x, y)))
    parts.append(Part("PCB_passives_0402", cq.Compound.makeCompound(caps), "passive", "PCB"))
    return parts


def ble_parts():
    z1 = P.PCB_Z_BOTTOM + P.PCB_T
    cx = P.BLE_X_MIN + P.BLE_L / 2
    board = box(P.BLE_L, P.BLE_W, z1, z1 + P.BLE_BOARD_T, cx)
    can_cx = P.BLE_X_MIN + 0.3 + P.BLE_CAN_L / 2
    can = box(P.BLE_CAN_L, P.BLE_CAN_W, z1 + P.BLE_BOARD_T, z1 + P.BLE_H, can_cx)
    ant_cx = P.BLE_X_MIN + P.BLE_L - 2.2
    ant = box(P.ANT_L, P.ANT_W, z1 + P.BLE_BOARD_T, z1 + P.BLE_BOARD_T + P.ANT_H, ant_cx)
    return [
        Part("BLE_module_board", val(board), "ble_board", "BLE"),
        Part("BLE_MCU_shield_can_nRF52832", val(can), "can", "BLE"),
        Part("BLE_chip_antenna", val(ant), "ceramic", "BLE"),
    ]


def accelerometer():
    z1 = P.PCB_Z_BOTTOM + P.PCB_T
    x, y = P.ACCEL_XY
    return [Part("Accelerometer_MEMS_LIS2DH12", val(box(P.ACCEL_L, P.ACCEL_W, z1, z1 + P.ACCEL_H, x, y)), "ic", "Accelerometer")]


def ppg_parts():
    z0 = P.PCB_Z_BOTTOM
    x, y = P.PPG_XY
    bot = z0 - P.PPG_H
    body = box(P.PPG_L, P.PPG_W, bot, z0, x, y)
    ap = cq.Compound.makeCompound([
        val(box(1.6, 1.8, bot - 0.01, bot + 0.02, x - 1.3, y)),
        val(box(1.6, 1.8, bot - 0.01, bot + 0.02, x + 1.3, y)),
    ])
    win_top = -P.BOSS_H + P.WINDOW_T
    gasket = (
        rbox(P.PPG_L + 2 * P.GASKET_WALL - 0.4, P.PPG_W + 2 * P.GASKET_WALL - 0.4, win_top, bot, 0.5, x, y)
        .cut(box(P.PPG_L - 0.4, P.PPG_W - 0.4, win_top - 1, bot + 1, x, y))
    )
    pocket_z0 = -P.BOSS_H + P.WINDOW_T - P.WINDOW_FLANGE_T
    window = rbox(P.WINDOW_THROAT_L - 0.1, P.WINDOW_THROAT_W - 0.1, -P.BOSS_H, pocket_z0 + 0.1, 0.75, x, y).union(
        rbox(P.WINDOW_L - 0.1, P.WINDOW_W - 0.1, pocket_z0, win_top, 0.95, x, y)
    )
    return [
        Part("PPG_heart_rate_sensor_MAX30102", val(body), "ic", "PPG"),
        Part("PPG_optical_apertures", ap, "optic", "PPG", True),
        Part("PPG_foam_gasket", val(gasket), "foam", "Gasket"),
        Part("Optical_sensor_window", val(window), "window", "Window"),
    ]


def motor_parts():
    x, y = P.MOTOR_XY
    z0 = P.MOTOR_SEAT_Z
    body = cyl(P.MOTOR_D, z0, z0 + P.MOTOR_H, x, y)
    zw = z0 + P.MOTOR_H / 2
    r = P.WIRE_D_MOTOR / 2
    rim = x + P.MOTOR_D / 2 - 0.05
    wz = P.PCB_Z_BOTTOM - 0.02 - r
    red = wire([(rim, y + 0.7, zw), (rim + 1.0, y + 0.8, zw), (-9.2, y + 1.2, wz - 0.1), (MOTOR_PADS[1][0], MOTOR_PADS[1][1], wz)], P.WIRE_D_MOTOR)
    blk = wire([(rim, y - 0.7, zw), (rim + 1.0, y - 0.8, zw), (-9.2, y - 1.2, wz - 0.1), (MOTOR_PADS[0][0], MOTOR_PADS[0][1], wz)], P.WIRE_D_MOTOR)
    return [
        Part("Vibration_motor_DIANN", val(body), "motor", "Motor"),
        Part("Motor_wire_red", red, "wire_red", "Motor"),
        Part("Motor_wire_black", blk, "wire_blk", "Motor"),
    ]


def battery_parts():
    z = P.PCB_Z_BOTTOM + P.PCB_T + P.BAT_SPACER_T
    x0 = P.BAT_X_MAX - P.BAT_L
    pouch = box(P.BAT_L - P.BAT_PCM_L, P.BAT_W, z, z + P.BAT_T, x0 + (P.BAT_L - P.BAT_PCM_L) / 2).edges("|X").fillet(0.6)
    pcm = box(P.BAT_PCM_L, P.BAT_W, z, z + P.BAT_T, P.BAT_X_MAX - P.BAT_PCM_L / 2).edges("|X").fillet(0.6)

    r = P.WIRE_D_BAT / 2
    zp = P.PCB_Z_BOTTOM + P.PCB_T + 0.06 + r
    zm = z + 1.0
    red = wire([(BAT_X := P.BAT_X_MAX - 0.03, 5.7, zm), (2.05, 5.8, zm - 0.2), (2.35, 6.0, zp + 0.9), (3.1, 6.2, zp + 0.25), (BAT_PADS[0][0], BAT_PADS[0][1], zp)], P.WIRE_D_BAT)
    blk = wire([(BAT_X, 6.6, zm), (2.05, 6.8, zm - 0.2), (2.35, 7.1, zp + 0.9), (3.1, 7.4, zp + 0.25), (BAT_PADS[1][0], BAT_PADS[1][1], zp)], P.WIRE_D_BAT)

    zs0, zs1 = P.PCB_Z_BOTTOM + P.PCB_T, z
    foam = cq.Compound.makeCompound([
        val(box(19.0, 2.2, zs0, zs1, x0 + 10.0, -5.7)),
        val(box(19.0, 2.2, zs0, zs1, x0 + 10.0, 5.7)),
    ])
    return [
        Part("LiPo_battery_pouch", val(pouch), "lipo", "Battery"),
        Part("LiPo_protection_end", val(pcm), "kapton", "Battery"),
        Part("Battery_wire_red", red, "wire_red", "Battery"),
        Part("Battery_wire_black", blk, "wire_blk", "Battery"),
        Part("Battery_foam_spacers", foam, "foam", "Spacer"),
    ]


def pogo_parts():
    solids = []
    for x, y in P.POGO_XY:
        solids.append(val(cyl(P.POGO_D, 0.05, P.PCB_Z_BOTTOM, x, y)))
    return [Part("Charging_contacts", cq.Compound.makeCompound(solids), "gold", "Pogo")]


def screw_parts():
    parts = []
    for i, (x, y) in enumerate(P.SCREW_XY, 1):
        z = screw_head_z(x)
        s = cyl(P.SCREW_HEAD_D, z, z + P.SCREW_HEAD_H, x, y).union(
            cyl(P.SCREW_SHAFT_D, z + P.SCREW_HEAD_H, z + P.SCREW_HEAD_H + P.SCREW_L, x, y)
        )
        parts.append(Part(f"Screw_M1p6_{i}", val(s), "steel", "Screws"))
    return parts


# ---------------------------------------------------------------- band
class WristPath:
    """Offset superellipse around the reference wrist, sampled finely, angle measured from the top."""

    def __init__(self):
        self.zc = -P.BOSS_H - P.WRIST_B
        phi = np.radians(np.arange(0, 360.01, 0.1))
        s, c = np.sin(phi), np.cos(phi)
        e = 2 / P.WRIST_N
        x = P.WRIST_A * np.sign(s) * np.abs(s) ** e
        z = self.zc + P.WRIST_B * np.sign(c) * np.abs(c) ** e
        self.base = np.column_stack([x, z])
        self.phi_deg = np.degrees(phi)
        d = np.gradient(self.base, axis=0)
        t = d / np.maximum(np.linalg.norm(d, axis=1, keepdims=True), 1e-9)
        # outward normal for a clockwise path in XZ
        self.normal = np.column_stack([-t[:, 1], t[:, 0]])
        self.normal[np.einsum("ij,ij->i", self.normal, self.base - [0, self.zc]) < 0] *= -1
        self.s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(self.base, axis=0), axis=1))])

    def perimeter(self):
        return self.s[-1]

    def s_of_phi(self, deg):
        return float(np.interp(deg, self.phi_deg, self.s))

    def at(self, s, off):
        """Point, tangent and outward normal at arc length s, offset by off."""
        bx = np.interp(s, self.s, self.base[:, 0])
        bz = np.interp(s, self.s, self.base[:, 1])
        nx = np.interp(s, self.s, self.normal[:, 0])
        nz = np.interp(s, self.s, self.normal[:, 1])
        n = np.array([nx, nz]) / math.hypot(nx, nz)
        return np.array([bx, bz]) + n * off, np.array([n[1], -n[0]]), n


PATH = WristPath()
BAND_OFF = P.BAND_WRIST_GAP + P.BAND_T / 2
BAND_OFF_OUTER = BAND_OFF + P.BAND_T + P.CLASP_OVERLAP_GAP


def _hermite(p0, t0, p1, t1, n=10):
    out = []
    L = 0.7 * np.linalg.norm(p1 - p0)
    for u in np.linspace(0, 1, n, endpoint=False):
        h00, h10 = 2 * u**3 - 3 * u**2 + 1, u**3 - 2 * u**2 + u
        h01, h11 = -2 * u**3 + 3 * u**2, u**3 - u**2
        out.append(h00 * p0 + h10 * L * t0 + h01 * p1 + h11 * L * t1)
    return out


def _ribbon(center):
    """Closed strip of band thickness around a 2D centreline, extruded to band width."""
    c = np.asarray(center)
    d = np.gradient(c, axis=0)
    d /= np.linalg.norm(d, axis=1, keepdims=True)
    n = np.column_stack([-d[:, 1], d[:, 0]])
    a = c + n * P.BAND_T / 2
    b = (c - n * P.BAND_T / 2)[::-1]
    return (
        cq.Workplane("XZ")
        .moveTo(*a[0]).spline([tuple(p) for p in a[1:]], includeCurrent=True)
        .lineTo(*b[0]).spline([tuple(p) for p in b[1:]], includeCurrent=True)
        .close()
        .extrude(P.BAND_W / 2, both=True)
    )


def _along(s0, s1, off_fn, step=2.5):
    n = max(3, int(abs(s1 - s0) / step))
    return [PATH.at(s, off_fn(s))[0] for s in np.linspace(s0, s1, n + 1)]


def _strap_center(sign, s_join, s_end, off_fn):
    """Centreline from the lug pin, blended onto the wrist path."""
    pin = np.array([sign * P.LUG_PIN_X, P.LUG_PIN_Z])
    p1, t1, _ = PATH.at(s_join, off_fn(s_join))
    dirn = 1.0 if s_end > s_join else -1.0
    t1 = t1 * dirn
    t0 = (p1 - pin) / np.linalg.norm(p1 - pin)
    return _hermite(pin, t0, p1, t1) + _along(s_join, s_end, off_fn)


def _radial_cut(s, off, dia, slot=0.0):
    p, t, n = PATH.at(s, off)
    plane = cq.Plane(origin=(p[0], 0, p[1]), xDir=(1, 0, 0) if abs(n[0]) < 0.9 else (0, 1, 0), normal=(n[0], 0, n[1]))
    return cq.Workplane(plane).circle(dia / 2).extrude(P.BAND_T * 1.2, both=True)


def band_parts():
    st_phi = P.CLASP_STUD_PHI
    s_st = PATH.s_of_phi(st_phi)

    # short strap, +X side, ends past the stud
    s_a0 = PATH.s_of_phi(P.BAND_START_PHI)
    s_a1 = s_st + P.CLASP_A_TIP
    a = _ribbon(_strap_center(+1, s_a0, s_a1, lambda s: BAND_OFF))
    a = a.union(y_cyl(P.BARREL_D, P.LUG_PIN_X, P.LUG_PIN_Z, P.BAND_W / 2))
    a = a.cut(y_cyl(P.BARREL_HOLE_D, P.LUG_PIN_X, P.LUG_PIN_Z, P.BAND_W))
    a = a.cut(_radial_cut(s_st, BAND_OFF, P.STUD_STEM_D + 0.1))
    p_st, _, n_st = PATH.at(s_st, BAND_OFF)
    recess = cq.Plane(origin=(p_st[0], 0, p_st[1]), xDir=(0, 1, 0), normal=(n_st[0], 0, n_st[1]))
    a = a.cut(cq.Workplane(recess).workplane(offset=-P.BAND_T / 2 - 1.5)
              .circle(P.STUD_FLANGE_D / 2 + 0.1).extrude(1.5 + 0.15))

    # long strap, -X side, rises over the short strap then carries the holes
    r0, r1 = P.CLASP_RAMP

    def b_off(s):
        u = np.clip((s_st + r1 - s) / (r1 - r0), 0, 1)
        u = u * u * (3 - 2 * u)
        return BAND_OFF + u * (BAND_OFF_OUTER - BAND_OFF)

    s_b0 = PATH.s_of_phi(360 - P.BAND_START_PHI)
    s_b1 = s_st + min(P.CLASP_HOLE_OFFSETS) - P.CLASP_TAIL
    b = _ribbon(_strap_center(-1, s_b0, s_b1, b_off))
    b = b.union(y_cyl(P.BARREL_D, -P.LUG_PIN_X, P.LUG_PIN_Z, P.BAND_W / 2))
    b = b.cut(y_cyl(P.BARREL_HOLE_D, -P.LUG_PIN_X, P.LUG_PIN_Z, P.BAND_W))
    for off in P.CLASP_HOLE_OFFSETS:
        b = b.cut(_radial_cut(s_st + off, b_off(s_st + off), P.CLASP_HOLE_D))

    # stud: flange on the skin side of strap A, stem through both straps, head on top
    p, _, n = PATH.at(s_st, BAND_OFF)
    plane = cq.Plane(origin=(p[0], 0, p[1]), xDir=(0, 1, 0), normal=(n[0], 0, n[1]))
    wp = cq.Workplane(plane)
    h = P.BAND_T / 2
    top_of_b = BAND_OFF_OUTER - BAND_OFF + h
    stem = wp.workplane(offset=-h).circle(P.STUD_STEM_D / 2).extrude(h + top_of_b)
    flange = wp.workplane(offset=-h - P.STUD_FLANGE_T).circle(P.STUD_FLANGE_D / 2).extrude(P.STUD_FLANGE_T)
    head = wp.workplane(offset=top_of_b).circle(P.STUD_HEAD_D / 2).extrude(P.STUD_HEAD_T)
    stud = stem.union(flange).union(head)

    # keeper loop around both straps
    s_k = s_st - P.KEEPER_ARC
    mid = (BAND_OFF + BAND_OFF_OUTER) / 2
    p, t, n = PATH.at(s_k, mid)
    plane = cq.Plane(origin=(p[0], 0, p[1]), xDir=(0, 1, 0), normal=(t[0], 0, t[1]))
    inner_h = BAND_OFF_OUTER - BAND_OFF + P.BAND_T + 0.6
    inner_w = P.BAND_W + 0.5
    keeper = (
        cq.Workplane(plane)
        .rect(inner_w + 2 * P.KEEPER_WALL, inner_h + 2 * P.KEEPER_WALL)
        .rect(inner_w, inner_h)
        .extrude(P.KEEPER_LEN / 2, both=True)
    )

    pins = [
        Part("Spring_bar_pin_A", val(y_cyl(P.PIN_D, P.LUG_PIN_X, P.LUG_PIN_Z, P.PIN_LEN / 2)), "steel", "StrapA"),
        Part("Spring_bar_pin_B", val(y_cyl(P.PIN_D, -P.LUG_PIN_X, P.LUG_PIN_Z, P.PIN_LEN / 2)), "steel", "StrapB"),
    ]
    return [
        Part("Band_strap_A_short", val(a), "band", "StrapA"),
        Part("Band_strap_B_long", val(b), "band", "StrapB"),
        Part("Clasp_stud", val(stud), "nylon", "Stud"),
        Part("Band_keeper_loop", val(keeper), "band", "Keeper"),
    ] + pins


# ---------------------------------------------------------------- assembly
def build_parts():
    parts = [
        Part("Upper_housing_removable_cover", val(upper_housing()), "housing", "Upper housing"),
        Part("Lower_housing", val(lower_housing()), "housing", "Lower housing"),
    ]
    for fn in (pcb_parts, ble_parts, accelerometer, ppg_parts, motor_parts,
               battery_parts, pogo_parts, screw_parts, band_parts):
        parts += fn()
    return parts


# Exploded view: how far each component travels from its installed position.
EXPLODE = {
    "Upper housing": (0, 0, 44),
    "Battery":       (0, 0, 30),
    "Spacer":        (0, 0, 21),
    "BLE":           (0, 0, 12),
    "Accelerometer": (0, 0, 12),
    "PCB":           (0, 0, 0),
    "Pogo":          (0, 0, -7),
    "PPG":           (0, 0, -12),
    "Gasket":        (0, 0, -18),
    "Window":        (0, 0, -24),
    "Motor":         (0, 0, -24),
    "Lower housing": (0, 0, -36),
    "Screws":        (0, 0, -52),
    "StrapA":        (34, 0, -36),
    "StrapB":        (-34, 0, -36),
    "Stud":          (34, 0, -52),
    "Keeper":        (34, 0, -60),
}

# Reference wrist solid (checks and optional display only)
def wrist_reference():
    b = PATH.base[::20]
    return cq.Workplane("XZ").polyline([tuple(p) for p in b[:-1]]).close().extrude(35, both=True)


# Parts checked against the antenna keep-out volume (conductive or RF-lossy).
METAL_MATERIALS = {"can", "copper", "lipo", "kapton", "motor", "steel", "gold", "wire_red", "wire_blk"}
