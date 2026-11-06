# Wearable Safety Bracelet: Parametric CAD Model

A real 3D model built with [CadQuery](https://cadquery.readthedocs.io), with named solids you can open in
SolidWorks, Fusion 360, FreeCAD or Blender. Every dimension lives in `params.py`.

## Proposed layout

Battery and BLE module sit side by side instead of stacked, which keeps the pod thin and leaves nothing
above or below the antenna.

```
 TOP VIEW (+X = antenna end)                     42 long x 24 wide
 +----------------------------------------------------------+
 |  [screw]                         [screw]                 |
 |  +--------------------------+  +----------------+ KEEP   |
 |  | Li-Po battery 20 x 14 x 3|  | BLE + MCU      | OUT    |
 |  | (motor under -X end)     |  | 16 x 10 x 2.2  | ant.   |
 |  +--------------------------+  +----------------+        |
 |  [screw]                         [screw]  accel, charger |
 +----------------------------------------------------------+

 HEIGHT STACK (Z, from the skin)     under battery     under BLE module
   top wall                             1.2                 1.2
   air gap (allows for battery swell)   0.25 to 1.0         0.5+
   battery / BLE module                 3.0                 2.2
   foam spacer                          1.2                 -
   PCB                                  0.8                 0.8
   PPG sensor, on PCB underside         1.55                -
   foam gasket + window (0.4 proud)     0.35 + 1.5          -
```

| Overall | Size |
|---|---|
| Pod body | 42 x 24 x 10.4 mm (10.8 with sensor pad) |
| Lug to lug | 50.8 mm |
| Band | 17.8 wide x 2.0 thick |
| Fits wrists | about 159 to 183 mm, 5 holes at 6 mm pitch, modelled on a 165 mm wrist |
| Estimated mass | about 18.5 g, from assumed material densities, not weighed |

## Files

| Path | What it is |
|---|---|
| `params.py` | **Start here.** Every dimension, tagged `[VERIFY]` or `[DESIGN]` |
| `bracelet.py` | Geometry for each part, plus materials and exploded offsets |
| `build.py` | Runs the fit checks, then exports everything |
| `render_views.py` | Blender script that renders each view |
| `annotate.py` | Adds labels, dimensions and alignment lines, builds the PDF |
| `output/step/` | `bracelet_assembled`, `_exploded` and `_layout` STEP files, 38 named parts |
| `output/stl/` | One STL per part, for printing |
| `output/glb/` | Assembled, exploded, layout and section GLB files, named parts and colours |
| `output/renders/` | Finished views as PNG |
| `output/bracelet_presentation.pdf` | All views, one per page |
| `output/fit_report.json` | Results of the fit checks |

## Run it

Needs Python 3.12 and [uv](https://docs.astral.sh/uv/). Blender is only needed for the renders.

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python build.py --check    # fit checks only, about 30 s
./run_all.sh                         # checks, exports, renders, labels, about 4 min
```

`build.py` exits with an error if the fit check fails. It still writes the exports, so read the result.
On another machine, set `BLENDER=/path/to/blender` before `./run_all.sh`.

## Open and change it

- **SolidWorks, Fusion 360, FreeCAD:** open a file from `output/step/`. Each part appears as a named body in
  the tree. These are imported solids with no feature history, so make parametric changes in `params.py`.
- **Blender:** File > Import > glTF, then pick a file from `output/glb/`. glTF uses metres, so the bracelet
  comes in at real size (0.05 m long).
- **Any web glTF viewer:** drag in a `.glb` file.
- **3D printing:** use `Upper_housing_removable_cover.stl`, `Lower_housing.stl` and the band STLs.

To change the design, edit `params.py` and run `./run_all.sh`. For example, set `MOTOR_H` to your measured
motor height. To move a part, change its `*_XY` value. To add a part, write a function in `bracelet.py`
returning `Part` objects, add it to `build_parts()`, and give any new component an `EXPLODE` entry, plus
entries in `layout_offsets()`, `CELLS` and `CELL_INFO` to show it in the layout and View 4.

## What was checked

These are geometry checks on the CAD model. **Nothing has been printed or powered up.**

- Every pair of solid parts with overlapping bounding boxes is tested for overlapping volume. Result: none,
  apart from the intended contact listed in `fit_report.json` (screws into pilot holes, wires into their
  parts). Thin copper traces, pads and similar surface detail are skipped.
- No metal or battery material is in the column above or below the antenna keep-out zone.
- All solids are valid after being re-imported from STEP.
- The checks fail as they should when given bad values: a 4.0 mm motor, a 24 mm battery and a 4.0 mm battery
  each triggered a failure.

Not checked: strength, heat, vibration feel, RF performance, optical signal quality, print tolerances, or
the circuit. The traces are illustrative, not a routed PCB layout.

## Verify before you build

Tagged `[VERIFY]` in `params.py` and marked † in the views. In order of risk:

| Item | Assumed | Why it matters |
|---|---|---|
| **DIANN motor shape and thickness** | Coin, dia 6.35 x 2.7 | No DIANN datasheet could be found. Up to 3.4 mm tall fits. A bar motor (often about 6 x 12 mm) will **not** fit this layout |
| **Battery** | 301420 class, 20 x 14 x 3, 60 to 80 mAh, protection board included | Sizes and whether the protection board is included vary by seller. Only 0.25 mm spare at the cover |
| **BLE module** | Raytac MDBT42Q class, 16 x 10 x 2.2 | Size matches distributor listings. The can layout and the antenna keep-out zone are estimates, use the datasheet's layout guide |
| **PPG sensor and window** | MAX30102 class, 5.6 x 3.3 x 1.55, 1.5 acrylic | Size matches the published package. Test the signal through your actual window and gasket |
| **Accelerometer** | LIS2DH12 class, 2 x 2 x 1 | Not confirmed against a datasheet |
| **Charger, regulator, motor driver** | Generic SOT-size placeholders | Confirm once the circuit is designed |
| **Screws and pilot hole** | M1.6 x 6 thread-forming, 1.3 pilot | Print a test piece. Small printed threads wear quickly |
| **Spring bars** | 1.5 x 22 | Check against what you buy |
| **Wrist size** | 58 x 44 mm, about 165 mm around | Measure your wearers |

## Design assumptions

- **BLE and MCU are one part.** An nRF52832 module means no RF design and existing certification, which suits
  a student prototype. It talks to a second bracelet over BLE, which is a firmware task.
- **Motor sits on the skin-side floor.** The PCB has a U-shaped cut-out so the motor bonds directly to the
  housing, which should carry vibration to the wrist better than mounting it on the board.
- **Peg-and-hole clasp** rather than a metal buckle. It prints in TPU, is lighter and adds no metal.
- **Charging contacts** were added because the battery needs a way to charge. The two spring pins need a dock,
  which is not modelled.
- **Screws enter from the skin side**, so the top stays clean. The four screws stop short of the antenna end.
- **Printing:** the 1.2 to 1.5 mm walls and small bosses will print more reliably on SLA or SLS than FDM.
  Band in TPU, 90A or softer. The model is rigid, so the band is shown in its worn shape only.
- **Skin contact:** the printed plastics, foam and adhesive have not been reviewed for skin safety.
  LiPo cells need a protected cell and careful handling.
