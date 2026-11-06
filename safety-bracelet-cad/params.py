"""
Every editable dimension for the safety bracelet, in millimetres.

Coordinate system (assembled):
    X  along the wrist, across the pod's long axis   (+X = antenna end, -X = battery/motor end)
    Y  along the forearm, across the band's width
    Z  outward from the skin                          (Z = 0 is the flat skin-side face of the pod)

Tags used in the comments:
    [VERIFY]  taken from a typical part, confirm against the real part/datasheet before printing
    [DESIGN]  our own design choice, safe to change
"""

# ---------------------------------------------------------------- pod (outer)
BODY_L = 42.0            # [DESIGN] pod length, X
BODY_W = 24.0            # [DESIGN] pod width, Y
BODY_CORNER_R = 5.0      # [DESIGN] plan-view corner radius
Z_TOP_CENTER = 10.4      # [DESIGN] pod height at the crown (excludes 0.4 sensor boss)
Z_TOP_END = 9.2          # [DESIGN] pod height at the X ends (gives the crowned top)
Z_BOT_END = 1.2          # [DESIGN] underside rises this much at the X ends (wrist relief)
BOT_FLAT_HALF = 14.0     # [DESIGN] half length of the flat skin-contact zone
TOP_EDGE_FILLET = 2.0    # [DESIGN] comfort radius, top perimeter
BOT_EDGE_FILLET = 1.0    # [DESIGN] comfort radius, skin-side perimeter

# ---------------------------------------------------------------- walls
WALL_SIDE = 1.5          # [DESIGN] side wall (>= 3 perimeters with a 0.4 mm nozzle)
WALL_FLOOR = 1.2         # [DESIGN] skin-side floor
WALL_TOP = 1.2           # [DESIGN] top wall
Z_SPLIT = 4.6            # [DESIGN] parting plane between lower housing and removable cover
CAVITY_CORNER_R = 3.5    # [DESIGN]

# Tongue on the cover that locates in the lower housing and clamps the PCB edge
TONGUE_CLEARANCE = 0.10  # [DESIGN] per side, tune to your printer
TONGUE_THICK = 0.60      # [DESIGN]
TONGUE_PCB_GAP = 0.05    # [DESIGN] gap above the PCB, tongue acts as a hold-down

# ---------------------------------------------------------------- fasteners
# Four M1.6 screws driven from the skin side, so the top stays clean.
# The +X pair stops short of the antenna on purpose.
SCREW_XY = [(-18.0, -9.0), (-18.0, 9.0), (11.5, -9.0), (11.5, 9.0)]  # [DESIGN]
POST_D = 3.2             # [DESIGN] screw boss diameter
SCREW_SHAFT_D = 1.5      # [VERIFY] M1.6 thread-forming, shaft shown at ~minor/pitch diameter
SCREW_CLEAR_D = 1.8      # [DESIGN] clearance hole, lower housing
SCREW_PILOT_D = 1.3      # [VERIFY] pilot hole in cover, tune by test print
SCREW_HEAD_D = 3.0       # [VERIFY]
SCREW_HEAD_H = 0.8       # [VERIFY]
SCREW_L = 6.0            # [VERIFY] length under the head

# ---------------------------------------------------------------- PCB
PCB_L = 38.4             # [DESIGN]
PCB_W = 20.4             # [DESIGN]
PCB_T = 0.8              # [DESIGN] 0.8 mm FR-4, 2 or 4 layer
PCB_CORNER_R = 3.2       # [DESIGN]
PCB_Z_BOTTOM = 3.0       # [DESIGN] set by the sensor height + gasket + window stack
PCB_POST_NOTCH_D = 3.8   # [DESIGN]
STANDOFF_XY = [(-6.0, -8.2), (-6.0, 8.2), (15.5, -8.2), (15.5, 8.2)]  # [DESIGN]
STANDOFF_D = 2.4         # [DESIGN]
LOCATING_PIN_D = 1.0     # [DESIGN]
LOCATING_HOLE_D = 1.2    # [DESIGN]

# ---------------------------------------------------------------- BLE + MCU module
# Raytac MDBT42Q class (nRF52832 = MCU + BLE radio, integrated chip antenna).
BLE_L, BLE_W, BLE_H = 16.0, 10.0, 2.2    # [VERIFY] per distributor listings, confirm exact variant
BLE_X_MIN = 2.4                          # [DESIGN]
BLE_BOARD_T = 0.8                        # [VERIFY]
BLE_CAN_L, BLE_CAN_W = 11.3, 9.0         # [VERIFY]
ANT_L, ANT_W, ANT_H = 3.2, 1.6, 1.1      # [VERIFY]
ANT_KEEPOUT_X_MIN = 14.2                 # [VERIFY] copper keep-out start, use module datasheet layout

# ---------------------------------------------------------------- accelerometer
# LIS2DH12 class 3-axis MEMS, LGA-12.
ACCEL_L, ACCEL_W, ACCEL_H = 2.0, 2.0, 1.0    # [VERIFY]
ACCEL_XY = (4.8, -7.4)                       # [DESIGN]

# ---------------------------------------------------------------- PPG heart-rate sensor
# MAX30102 class, mounted on the PCB underside facing the skin.
PPG_L, PPG_W, PPG_H = 5.6, 3.3, 1.55         # [VERIFY] 14-pin OESIP package
PPG_XY = (0.0, 0.0)                          # [DESIGN]

WINDOW_L, WINDOW_W = 8.0, 5.0                # [DESIGN] flange size
WINDOW_THROAT_L, WINDOW_THROAT_W = 7.0, 4.0  # [DESIGN] visible aperture
WINDOW_T = 1.5                               # [VERIFY] clear acrylic, check IR/green transmission
WINDOW_FLANGE_T = 0.7                        # [DESIGN]
BOSS_L, BOSS_W, BOSS_H = 11.0, 8.0, 0.4      # [DESIGN] raised pad presses window onto skin
GASKET_WALL = 0.8                            # [VERIFY] black foam, blocks LED light leak

# ---------------------------------------------------------------- vibration motor
# User-specified DIANN mini motor, ~1/4 in dia. Thickness could not be confirmed online.
MOTOR_D = 6.35           # [VERIFY] nominal 1/4 in
MOTOR_H = 2.7            # [VERIFY] ASSUMED coin-style body. Max that fits is reported by the build.
MOTOR_XY = (-13.5, 0.0)  # [DESIGN]
MOTOR_SEAT_Z = 1.4       # [DESIGN] flat seat on the floor, motor bonded with adhesive
MOTOR_RING_ID = 6.55     # [DESIGN]
MOTOR_RING_OD = 8.0      # [DESIGN]
MOTOR_RING_TOP = 3.4     # [DESIGN]
MOTOR_NOTCH_W = 8.5      # [DESIGN] PCB cut-out around the motor ring
WIRE_D_MOTOR = 0.5       # [VERIFY]

# ---------------------------------------------------------------- battery
# 301420 class Li-Po: 3.0 thick x 14 wide x 20 long, about 60-80 mAh.
BAT_L, BAT_W, BAT_T = 20.0, 14.0, 3.0  # [VERIFY] also confirm the protection-board length
BAT_X_MAX = 1.6                        # [DESIGN] +X end stops before the BLE module
BAT_PCM_L = 3.0                        # [VERIFY]
BAT_SPACER_T = 1.2                     # [DESIGN] foam strips lift the cell over low-profile parts
WIRE_D_BAT = 0.6                       # [VERIFY]

# ---------------------------------------------------------------- charging contacts
POGO_XY = [(8.0, -3.0), (8.0, 3.0)]    # [DESIGN]
POGO_D = 1.8                           # [VERIFY]

# ---------------------------------------------------------------- band and lugs
BAND_W = 17.8            # [DESIGN]
BAND_T = 2.0             # [DESIGN] TPU, Shore 90A or softer
LUG_INNER_Y = 9.1        # [DESIGN]
LUG_PIN_X = 23.4         # [DESIGN]
LUG_PIN_Z = 2.6          # [DESIGN]
LUG_R = 2.0              # [DESIGN]
LUG_ROOT_X = 17.0        # [DESIGN]
PIN_D = 1.5              # [VERIFY] standard 1.5 mm watch spring bar
PIN_LEN = 22.0           # [VERIFY]
LUG_HOLE_D = 1.6         # [DESIGN]
BARREL_D = 3.6           # [DESIGN]
BARREL_HOLE_D = 1.8      # [DESIGN]

# Reference wrist, a superellipse, used only to shape the band (not exported as a part).
WRIST_A = 29.0           # [VERIFY] half width. Measure your own wearer.
WRIST_B = 22.0           # [VERIFY] half thickness
WRIST_N = 2.3            # [DESIGN] 2 = ellipse, higher = more rectangular
BAND_WRIST_GAP = 0.8     # [DESIGN]
BAND_START_PHI = 62.0    # [DESIGN] degrees from wrist top where the band meets the wrist path

# Peg-and-hole clasp: one stud in the short strap, holes in the long strap.
CLASP_STUD_PHI = 172.0   # [DESIGN] position around the wrist (180 = directly underneath)
CLASP_A_TIP = 8.0        # [DESIGN] short strap runs this far past the stud
CLASP_RAMP = (9.0, 21.0)  # [DESIGN] long strap rises over the short strap in this arc range
CLASP_OVERLAP_GAP = 0.2  # [DESIGN]
CLASP_HOLE_D = 3.2       # [DESIGN]
CLASP_HOLE_OFFSETS = [6.0, 0.0, -6.0, -12.0, -18.0]  # [DESIGN] arc positions rel. to stud
CLASP_TAIL = 8.0         # [DESIGN] tail past the last hole
STUD_STEM_D = 3.0        # [DESIGN]
STUD_HEAD_D = 4.2        # [DESIGN]
STUD_HEAD_T = 0.8        # [DESIGN]
STUD_FLANGE_D = 6.0      # [DESIGN]
STUD_FLANGE_T = 0.6      # [DESIGN]
KEEPER_ARC = 16.0        # [DESIGN] keeper position toward the tail, rel. to stud
KEEPER_LEN = 5.0         # [DESIGN]
KEEPER_WALL = 1.0        # [DESIGN]
