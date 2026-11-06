#!/usr/bin/env python3
"""
Add title blocks, leader lines, dimensions and alignment lines to the raw renders.

Anchors are real 3D points run through the same camera as the render, so labels follow the
model when dimensions change. Writes output/renders/view*.png.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import bracelet as B
import params as P

ROOT = Path(__file__).parent
OUT = ROOT / "output"
RAW = OUT / "renders" / "raw"
FINAL = OUT / "renders"
SS = 2  # overlay is drawn at 2x and downsampled for clean lines

CAMS = json.loads((RAW / "cameras.json").read_text())
MAN = json.loads((OUT / "manifest.json").read_text())
PART = {p["name"]: p for p in MAN["parts"]}
BG = (244, 245, 247, 255)
INK = (32, 36, 42, 255)
MUTE = (104, 112, 122, 255)
ACCENT = (178, 62, 28, 255)
GUIDE = (90, 110, 140, 255)

FONT_PATHS = ["/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/Supplemental/Arial.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "DejaVuSans.ttf"]


def font(size, bold=False):
    for path in FONT_PATHS:
        try:
            return ImageFont.truetype(path, size * SS, index=1 if bold and path.endswith(".ttc") else 0)
        except OSError:
            continue
    return ImageFont.load_default(size * SS)


class Sheet:
    def __init__(self, view):
        self.cam = CAMS[view]
        raw = Image.open(RAW / f"{view}.png").convert("RGBA")
        self.W, self.H = raw.size
        self.base = Image.new("RGBA", raw.size, BG)
        self.base.alpha_composite(raw)
        self.over = Image.new("RGBA", (self.W * SS, self.H * SS), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.over)
        m = np.array(self.cam["matrix"])
        self.inv = np.linalg.inv(m)

    def px(self, p):
        q = self.inv @ np.array([p[0], p[1], p[2], 1.0])
        s = self.W / self.cam["ortho"]
        return np.array([(q[0] * s + self.W / 2), (self.H / 2 - q[1] * s)])

    def center(self, name):
        b = PART[name]["bbox"]
        off = self.cam["offsets"].get(name, [0, 0, 0])
        return [(b[0] + b[1]) / 2 + off[0], (b[2] + b[3]) / 2 + off[1], (b[4] + b[5]) / 2 + off[2]]

    def anchor(self, a):
        return self.center(a) if isinstance(a, str) else a

    def line(self, a, b, fill=INK, w=2):
        self.d.line([tuple(a * SS), tuple(b * SS)], fill=fill, width=w * SS)

    def dashed(self, a, b, fill=GUIDE, w=1, dash=11, gap=8):
        a, b = np.array(a, float), np.array(b, float)
        L = np.linalg.norm(b - a)
        if L < 1:
            return
        u = (b - a) / L
        t = 0.0
        while t < L:
            self.line(a + u * t, a + u * min(t + dash, L), fill, w)
            t += dash + gap

    def text(self, xy, s, size=26, fill=INK, bold=False, anchor="la"):
        self.d.text((xy[0] * SS, xy[1] * SS), s, font=font(size, bold), fill=fill, anchor=anchor)

    def title(self, heading, sub):
        self.text((48, 40), heading, 40, INK, True)
        self.text((48, 94), sub, 25, MUTE)

    def footer(self, note="Approximate dimensions in mm. † = verify against the real part."):
        self.text((48, self.H - 52), note, 22, MUTE)

    def scale_bar(self, length=10.0, xy=None, axis=(1, 0, 0)):
        p0, p1 = self.px((0, 0, 0)), self.px(tuple(np.array(axis) * length))
        L = np.linalg.norm(p1 - p0)
        x, y = xy or (self.W - 60 - L, self.H - 72)
        self.line(np.array([x, y]), np.array([x + L, y]), INK, 3)
        for e in (x, x + L):
            self.line(np.array([e, y - 9]), np.array([e, y + 9]), INK, 2)
        self.text((x + L / 2, y + 14), f"{length:g} mm along X", 20, MUTE, anchor="ma")

    def label(self, target, text, xy, side):
        """Leader from a 3D point to a label placed at pixel xy."""
        t = self.px(self.anchor(target))
        elbow = np.array([xy[0] + (14 if side == "L" else -14), xy[1]])
        tx = xy[0] + (0 if side == "L" else 0)
        lines = text.split("\n")
        anchor = "ra" if side == "L" else "la"
        for i, ln in enumerate(lines):
            self.text((tx, xy[1] - 15 + i * 28), ln, 25 if i == 0 else 21, INK if i == 0 else MUTE, i == 0, anchor)
        start = np.array([xy[0] + (8 if side == "L" else -8), xy[1]])
        self.line(start, elbow + (np.array([12, 0]) if side == "L" else np.array([-12, 0])), INK, 1)
        self.line(elbow + (np.array([12, 0]) if side == "L" else np.array([-12, 0])), t, INK, 1)
        r = 5
        self.d.ellipse([(t[0] - r) * SS, (t[1] - r) * SS, (t[0] + r) * SS, (t[1] + r) * SS], fill=ACCENT)

    def auto_labels(self, items, left_x=None, right_x=None, top=170, bottom=None, split=None):
        """Sort into a left and right column by screen x and space evenly so leaders do not cross."""
        left_x = left_x or int(self.W * 0.205)
        right_x = right_x or int(self.W * 0.795)
        bottom = bottom or self.H - 120
        pts = [(self.px(self.anchor(a)), a, t, s) for a, t, *rest in items for s in [rest[0] if rest else None]]
        mid = split if split is not None else self.W / 2
        is_left = lambda q: q[3] == "L" or (q[3] is None and q[0][0] < mid)
        L = [q for q in pts if is_left(q)]
        R = [q for q in pts if not is_left(q)]
        for col, x, side in ((L, left_x, "L"), (R, right_x, "R")):
            col.sort(key=lambda q: q[0][1])
            n = len(col)
            if not n:
                continue
            gap = min(100, (bottom - top) / max(n - 1, 1))
            mean = np.mean([q[0][1] for q in col])
            y0 = float(np.clip(mean - gap * (n - 1) / 2, top, bottom - gap * (n - 1)))
            for i, q in enumerate(col):
                self.label(q[1], q[2], (x, y0 + i * gap), side)

    def dim(self, p0, p1, text, off, size=23):
        """Dimension with extension lines. p0/p1 are 3D, off is a 3D offset for the dim line."""
        p0, p1, off = np.array(p0, float), np.array(p1, float), np.array(off, float)
        a, b = self.px(p0), self.px(p1)
        A, B = self.px(p0 + off), self.px(p1 + off)
        self.line(a, A, ACCENT, 1)
        self.line(b, B, ACCENT, 1)
        self.line(A, B, ACCENT, 2)
        u = (B - A) / max(np.linalg.norm(B - A), 1)
        n = np.array([-u[1], u[0]])
        for tip, s in ((A, 1), (B, -1)):
            self.d.polygon([tuple(tip * SS), tuple((tip + s * u * 14 + n * 4.5) * SS),
                            tuple((tip + s * u * 14 - n * 4.5) * SS)], fill=ACCENT)
        m = (A + B) / 2
        tw = self.d.textlength(text, font=font(size, True)) / SS
        pad = 5
        self.d.rounded_rectangle([(m[0] - tw / 2 - pad) * SS, (m[1] - 16) * SS, (m[0] + tw / 2 + pad) * SS, (m[1] + 16) * SS],
                                 radius=6 * SS, fill=(255, 255, 255, 235))
        self.text((m[0], m[1]), text, size, ACCENT, True, "mm")

    def save(self, name):
        small = self.over.resize((self.W, self.H), Image.LANCZOS)
        self.base.alpha_composite(small)
        self.base.convert("RGB").save(FINAL / name, optimize=True)
        print("Wrote", FINAL / name)


def on_band(s, phi, outer, y=-5.0, comp=None):
    """Point on a strap's surface at wrist angle phi, shifted with the strap in exploded views."""
    off = B.BAND_OFF + (1.0 if outer else -1.0)
    p, _, _ = B.PATH.at(B.PATH.s_of_phi(phi), off)
    o = s.cam["offsets"].get(comp, [0, 0, 0]) if comp else [0, 0, 0]
    return [p[0] + o[0], y + o[1], p[1] + o[2]]


def stud_point(s=None):
    p, _, _ = B.PATH.at(B.PATH.s_of_phi(P.CLASP_STUD_PHI), B.BAND_OFF - 1.0 - P.STUD_FLANGE_T)
    return [p[0], 0.0, p[1]]


def keeper_point():
    s_k = B.PATH.s_of_phi(P.CLASP_STUD_PHI) - P.KEEPER_ARC
    p, _, _ = B.PATH.at(s_k, B.BAND_OFF + 0.5)
    return [p[0], -P.BAND_W / 2 - 0.9, p[1]]


L = P.BODY_L / 2
HW = P.BODY_W / 2
ZT = P.Z_TOP_CENTER
ZPCB = P.PCB_Z_BOTTOM
ZPT = ZPCB + P.PCB_T
BATZ = ZPT + P.BAT_SPACER_T
LUG = P.LUG_PIN_X + P.LUG_R
BAT_CX = P.BAT_X_MAX - P.BAT_L / 2
BLE_CX = P.BLE_X_MIN + P.BLE_L / 2
ANT_X = P.BLE_X_MIN + P.BLE_L - 2.2


def z_at_top(x):
    return B.z_top(x)


def view1():
    s = Sheet("v1_assembled")
    s.title("View 1: Assembled Bracelet", "Matte black 3D-printed housing and TPU band. Orthographic isometric.")
    s.dim((-LUG, HW, P.LUG_PIN_Z), (LUG, HW, P.LUG_PIN_Z), f"{2 * LUG:.1f} lug to lug", (0, 13, 0))
    s.dim((-LUG, -HW, P.LUG_PIN_Z), (-LUG, HW, P.LUG_PIN_Z), f"{P.BODY_W:.0f} wide", (-10, 0, 0))
    s.auto_labels([
        ((6, -6, z_at_top(6)), "Upper housing\nRemovable cover, 4 M1.6 screws", "R"),
        ((P.LUG_PIN_X, -HW, P.LUG_PIN_Z), "Lug and spring bar\n1.5 mm pin †", "R"),
        (on_band(s, 100, True), "Band, short strap\nTPU, 17.8 x 2.0", "R"),
        (keeper_point(), "Keeper loop", "R"),
        (on_band(s, 255, False), "Band, long strap\n5 holes, 6 mm pitch", "L"),
        (stud_point(), "Peg-and-hole clasp", "L"),
    ], top=400)
    s.scale_bar()
    s.footer()
    s.save("view1_assembled.png")


def view2():
    s = Sheet("v2b_transparent_pod")
    s.title("View 2: Transparent Housing", "Installed positions, seen from above. The motor sits under the battery, see the underside view.")
    s.auto_labels([
        ((BAT_CX - 3, 0, BATZ + P.BAT_T), "Li-Po battery\n301420 class, 20 x 14 x 3 †", "L"),
        ("BLE_MCU_shield_can_nRF52832", "BLE and MCU module\nnRF52832, 16 x 10 x 2.2 †", "R"),
        ("BLE_chip_antenna", "Chip antenna\nNothing metal above or below", "R"),
        ((ANT_X + 3.6, 5, ZPT), "Antenna keep-out\nBare FR-4, no copper", "R"),
        ((P.ACCEL_XY[0], P.ACCEL_XY[1], ZPT + P.ACCEL_H), "Accelerometer\nLIS2DH12 class, 2 x 2 x 1 †", "R"),
        ((-10, -8, ZPT), "Main PCB\n38.4 x 20.4 x 0.8", "L"),
        ((P.BAT_X_MAX + 0.5, 6.4, BATZ + 0.6), "Battery wires\nto PCB pads", "R"),
        ((-18, -9, P.Z_SPLIT), "M1.6 screw boss", "L"),
    ])
    s.scale_bar()
    s.footer()
    s.save("view2a_transparent_top.png")

    s = Sheet("v2c_transparent_underside")
    s.title("View 2: Transparent Housing, Underside", "Skin-side face: optical window, charging contacts and screw access.")
    s.auto_labels([
        ("Optical_sensor_window", "Optical sensor window\nRaised 0.4 mm pad, faces skin", "R"),
        ("PPG_heart_rate_sensor_MAX30102", "Heart rate sensor (PPG)\nMAX30102 class, 5.6 x 3.3 x 1.55 †", "L"),
        ((P.POGO_XY[1][0], P.POGO_XY[1][1], 0.05), "Charging contacts\\n2 spring pins, for a dock †", "R"),
        ("Vibration_motor_DIANN", "Vibration motor\nDIANN, dia 6.35 x 2.7 †, on the floor", "L"),
        ("Screw_M1p6_1", "Screws from skin side\nKeeps the top clean", "L"),
        ("U_motor_driver_FET", "Motor driver", "L"),
    ])
    s.scale_bar()
    s.footer()
    s.save("view2b_transparent_underside.png")

    s = Sheet("v2_transparent")
    s.title("View 2: Transparent Housing, Full Bracelet", "Same camera and scale as View 1. Only the housing is see-through.")
    s.auto_labels([
        ("LiPo_battery_pouch", "Li-Po battery", "L"),
        ("BLE_MCU_shield_can_nRF52832", "BLE and MCU module", "R"),
        ((14, 11.5, 8.5), "See-through housing", "R"),
    ], top=420, bottom=760)
    s.scale_bar()
    s.footer()
    s.save("view2c_transparent_full.png")


def view3():
    s = Sheet("v3_exploded")
    s.title("View 3: Exploded Assembly", "Parts travel along their assembly direction. Dashed lines show where each one lands.")
    off = s.cam["offsets"]

    def stack(xy, names):
        """Dashed line through the given parts' exploded positions at a fixed XY."""
        zs = []
        for n in names:
            b = PART[n]["bbox"]
            o = off.get(n, [0, 0, 0])
            z = b[4] if n == up else (b[4] + b[5]) / 2  # stop at the cover's rim, not across its face
            zs.append(z + o[2])
        s.dashed(s.px((xy[0], xy[1], max(zs))), s.px((xy[0], xy[1], min(zs))))

    up, low = "Upper_housing_removable_cover", "Lower_housing"
    pcb = "PCB_main_board"
    stack((BAT_CX, 0), [up, "LiPo_battery_pouch", "Battery_foam_spacers", pcb])
    stack((BLE_CX, 0), [up, "BLE_module_board", pcb])
    stack(P.ACCEL_XY, ["Accelerometer_MEMS_LIS2DH12", pcb])
    stack(P.PPG_XY, [pcb, "PPG_heart_rate_sensor_MAX30102", "PPG_foam_gasket", "Optical_sensor_window", low])
    stack(P.MOTOR_XY, ["LiPo_battery_pouch", "Vibration_motor_DIANN", low])
    stack(P.POGO_XY[0], [pcb, "Charging_contacts", low])
    for i, (x, y) in enumerate(P.SCREW_XY, 1):
        stack((x, y), [up, low, f"Screw_M1p6_{i}"])
    for sgn, strap in ((1, "Band_strap_A_short"), (-1, "Band_strap_B_long")):
        o = off[strap]
        a = np.array([sgn * P.LUG_PIN_X, 0, P.LUG_PIN_Z]) + np.array(off[low])
        b = np.array([sgn * P.LUG_PIN_X, 0, P.LUG_PIN_Z]) + np.array(o)
        s.dashed(s.px(a), s.px(b))

    s.auto_labels([
        (up, "1  Upper housing\nRemovable matte black cover", "R"),
        (pcb, "2  Main PCB and microcontroller\nCustom outline, motor cut-out", "L"),
        ("Accelerometer_MEMS_LIS2DH12", "3  Accelerometer\nSoldered to PCB top", "L"),
        ("BLE_MCU_shield_can_nRF52832", "4  BLE module\nIntegrated MCU, radio, antenna", "R"),
        ("PPG_heart_rate_sensor_MAX30102", "5  Heart rate sensor\nOn PCB underside, with foam gasket", "L"),
        ("LiPo_battery_pouch", "6  Rechargeable battery\nOn foam spacers", "L"),
        ("Battery_foam_spacers", "Foam spacers", "L"),
        ("Vibration_motor_DIANN", "7  Vibration motor\nIn floor ring, wired to PCB", "L"),
        ("Optical_sensor_window", "Optical window †\nBonds in from inside", "R"),
        ("PPG_foam_gasket", "Foam gasket †\nBlocks LED light leak", "R"),
        (low, "8  Lower housing\nRing, bosses, window seat", "R"),
        (on_band(s, 100, True, comp="Band_strap_A_short"), "9  Band and fastening\nStraps, stud, keeper, spring bars", "R"),
        ("Screw_M1p6_3", "M1.6 x 6 screws (4) †", "R"),
    ], left_x=int(s.W * 0.175), right_x=int(s.W * 0.83))
    # the small clasp parts sit far below the columns, so they get short direct labels
    stud, keep = s.center("Clasp_stud"), s.center("Band_keeper_loop")
    keep[1] -= P.BAND_W / 2 + 0.5
    s.label(stud, "Clasp stud", s.px(stud) + np.array([-150, -30]), "L")
    s.label(keep, "Keeper loop", s.px(keep) + np.array([170, 30]), "R")
    s.footer()
    s.save("view3_exploded.png")


CELL_INFO = {
    "Upper_housing": ("Upper housing", f"{P.BODY_L:.0f} x {P.BODY_W:.0f} x {P.Z_TOP_CENTER - P.Z_SPLIT:.1f}, removable"),
    "Lower_housing": ("Lower housing", "Lugs, ring, bosses, window seat"),
    "PCB": ("Main PCB", f"{P.PCB_L} x {P.PCB_W} x {P.PCB_T}"),
    "BLE": ("BLE and MCU module †", f"{P.BLE_L:g} x {P.BLE_W:g} x {P.BLE_H:g}, nRF52832"),
    "Accelerometer": ("Accelerometer †", f"{P.ACCEL_L:g} x {P.ACCEL_W:g} x {P.ACCEL_H:g}, MEMS"),
    "PPG": ("Heart rate sensor †", f"{P.PPG_L} x {P.PPG_W} x {P.PPG_H}, PPG"),
    "Gasket": ("Foam optical gasket †", "Blocks LED light leak"),
    "Window": ("Optical window †", f"{P.WINDOW_L:g} x {P.WINDOW_W:g} x {P.WINDOW_T}, acrylic"),
    "Battery": ("Li-Po battery †", f"{P.BAT_L:g} x {P.BAT_W:g} x {P.BAT_T:g}, 60 to 80 mAh"),
    "Spacer": ("Battery foam spacers", f"{P.BAT_SPACER_T} thick, 2 strips"),
    "Motor": ("Vibration motor †", f"DIANN, dia {P.MOTOR_D} x {P.MOTOR_H}"),
    "Pogo": ("Charging contacts †", f"2 pins, dia {P.POGO_D}"),
    "Screws": ("Screws †", f"4 x M1.6 x {P.SCREW_L:g}"),
    "StrapA": ("Band, short strap", f"{P.BAND_W} wide, spring bar"),
    "StrapB": ("Band, long strap", f"{P.BAND_W} wide, spring bar"),
    "Stud": ("Clasp stud", f"Stem dia {P.STUD_STEM_D:g}"),
    "Keeper": ("Keeper loop", f"{P.KEEPER_LEN:g} long"),
}


def view4():
    cols, cw, ch = 5, 760, 660
    rows = int(np.ceil(len(CELL_INFO) / cols))
    head = 170
    sheet = Image.new("RGBA", (cols * cw + 80, rows * ch + head + 80), BG)
    d = ImageDraw.Draw(sheet)
    fb, f, fs = font(19, True), font(15), font(13)
    # fonts carry the 2x overlay factor, so these come out at about 38, 30 and 26 px
    d.text((48, 40), "View 4: Individual Components", font=font(20, True), fill=INK)
    d.text((48, 94), "Each cell is zoomed to fit, so check its own scale bar. "
                     "The true-scale grid is in bracelet_layout.step and .glb.", font=font(13), fill=MUTE)
    for i, (key, (name, spec)) in enumerate(CELL_INFO.items()):
        r, c = i // cols, i % cols
        x, y = 40 + c * cw, head + r * ch
        d.rounded_rectangle([x + 8, y + 8, x + cw - 8, y + ch - 8], radius=14, fill=(255, 255, 255, 255), outline=(222, 225, 230, 255), width=2)
        view = f"v4cell_{key}"
        im = Image.open(RAW / f"{view}.png").convert("RGBA")
        sheet.alpha_composite(im, (x, y + 8))
        d.text((x + 28, y + ch - 92), name, font=font(14, True), fill=INK)
        d.text((x + 28, y + ch - 54), spec, font=font(11), fill=MUTE)
        cam = CAMS[view]
        scale_px = cam["res"][0] / cam["ortho"]
        v = np.array(cam["matrix"])[:3, 0]
        per_mm = scale_px * abs(v[0])  # px per mm along X
        target = next(t for t in (50, 20, 10, 5, 2, 1, 0.5) if t * per_mm < 200 or t == 0.5)
        L = target * per_mm
        bx, by = x + cw - 40 - L, y + ch - 44
        d.line([bx, by, bx + L, by], fill=INK, width=3)
        d.line([bx, by - 8, bx, by + 8], fill=INK, width=2)
        d.line([bx + L, by - 8, bx + L, by + 8], fill=INK, width=2)
        d.text((bx + L / 2, by - 26), f"{target:g} mm", font=font(10), fill=MUTE, anchor="ma")
    sheet.convert("RGB").save(FINAL / "view4_components.png", optimize=True)
    print("Wrote view4_components.png")


def view5():
    s = Sheet("v5a_internal")
    s.title("View 5: Internal Assembly", "Cover removed. Battery sits on foam spacers beside the BLE module.")
    s.auto_labels([
        ((BAT_CX - 2, 0, BATZ + P.BAT_T), "Li-Po battery\nCover ribs locate it", "L"),
        ("LiPo_protection_end", "Protection board end †", "L"),
        ((3.1, 6.2, ZPT + 0.5), "Battery wires\nSoldered to top pads", "L"),
        ("BLE_MCU_shield_can_nRF52832", "BLE and MCU module", "R"),
        ("BLE_chip_antenna", "Chip antenna at PCB end", "R"),
        ((P.ACCEL_XY[0], P.ACCEL_XY[1], ZPT + P.ACCEL_H), "Accelerometer", "R"),
        ("U_charger_IC_MCP73831", "Charger IC", "R"),
        ("U_LDO_regulator", "LDO regulator", "L"),
        ((15.5, 8.2, ZPT), "Locating pin and standoff", "R"),
    ], left_x=int(s.W * 0.195), right_x=int(s.W * 0.805))
    s.scale_bar()
    s.footer()
    s.save("view5a_internal.png")

    s = Sheet("v5b_internal_no_battery")
    s.title("View 5: Internal Assembly, Battery Removed", "Motor ring, wiring and PCB traces. The U-shaped cut-out lets the motor reach the floor.")
    s.auto_labels([
        ("Vibration_motor_DIANN", "Vibration motor\nBonded inside a printed ring", "L"),
        ((-9.2, 1.2, 2.4), "Motor wires\nTo pads under the PCB", "L"),
        ((-18, 9, P.Z_SPLIT), "Screw in its boss\nPCB notched around it", "L"),
        ((-5, -1.2, ZPT), "Copper traces", "L"),
        ((-6, -8.2, ZPT), "Locating pin", "L"),
        ("BLE_MCU_shield_can_nRF52832", "BLE and MCU module", "R"),
        ((ANT_X + 3.6, 5, ZPT), "Antenna keep-out", "R"),
        ((P.ACCEL_XY[0], P.ACCEL_XY[1], ZPT + P.ACCEL_H), "Accelerometer", "R"),
        ("U_charger_IC_MCP73831", "Charger IC", "R"),
        ((4.0, 6.2, ZPT), "Battery pads", "L"),
    ], left_x=int(s.W * 0.195), right_x=int(s.W * 0.805))
    s.scale_bar()
    s.footer()
    s.save("view5b_internal_no_battery.png")


def view6():
    s = Sheet("v6_section")
    s.title("Section at Y = 0: Stack-up", "Cut through the pod centreline. Extra view, shows how the parts stack in height.")
    y = 0
    # height stack on the left, at the battery
    xb = -L - 4
    for z0, z1, t in (
        (0, P.WALL_FLOOR, f"{P.WALL_FLOOR} floor"),
        (ZPCB, ZPT, f"{P.PCB_T} PCB"),
        (BATZ, BATZ + P.BAT_T, f"{P.BAT_T:g} battery †"),
    ):
        s.dim((BAT_CX - 5, y, z0), (BAT_CX - 5, y, z1), t, (xb - (BAT_CX - 5) - 7, 0, 0))
    s.dim((L, y, 0), (L, y, ZT), f"{ZT} body height", (5, 0, 0))
    s.dim((-L, y, ZT), (L, y, ZT), f"{P.BODY_L:.0f} body length", (0, 0, 4))
    s.auto_labels([
        ("Optical_sensor_window", "Window, 1.5 acrylic †", "R"),
        ("PPG_heart_rate_sensor_MAX30102", "PPG sensor, 1.55 tall †", "R"),
        ("Vibration_motor_DIANN", "Motor, 2.7 tall † (3.4 max)", "L"),
        ("BLE_MCU_shield_can_nRF52832", "BLE module, 2.2 tall †", "R"),
    ], top=860, bottom=1040, left_x=int(s.W * 0.27), right_x=int(s.W * 0.72))
    s.scale_bar()
    s.footer()
    s.save("view6_section.png")


if __name__ == "__main__":
    for fn in (view1, view2, view3, view4, view5, view6):
        fn()
    order = ["view1_assembled", "view2c_transparent_full", "view2a_transparent_top", "view2b_transparent_underside",
             "view3_exploded", "view4_components", "view5a_internal", "view5b_internal_no_battery", "view6_section"]
    pages = [Image.open(FINAL / f"{n}.png").convert("RGB") for n in order]
    pages[0].save(OUT / "bracelet_presentation.pdf", save_all=True, append_images=pages[1:], resolution=200)
    print("Wrote", OUT / "bracelet_presentation.pdf")
