# Letting Refrigeration Follow the Sun

A simulation and **engineering design case study** of a PV-assisted cold store with an ice-bank thermal store: a tested model, a five-controller comparison, a 291-part CAD design with dimensioned drawings, and an interactive 3D website.

**[Live website](https://YOUR-USERNAME.github.io/YOUR-REPO/)** · 

## Main finding (simulated)
Five controllers, 16 identical summer days, grid import vs a fixed thermostat:

| Controller | Grid import | vs fixed |
|---|---|---|
| Fixed thermostat | 35.2 kWh/day | – |
| Same wide band, on/off | 35.4 | +1 % |
| Variable-speed, solar-blind | 21.7 | −38 % |
| Solar-priority | 19.2 | −45 % |
| Solar-priority + 30 kWh ice bank | 13.5 | −62 % |

Most of the headline saving comes from variable-speed operation. Against a solar-blind variable-speed controller, sun-aware control alone imports about 12 % less and, with the ice bank, about 38 % less.

## Engineering design
- 10 modules, **291 parts**, each module with its own origin so it can be exchanged
- one dimensioned A3 sheet per module (3 views, parts list, title block) → `design/Design_Drawings_A3.pdf`
- bill of materials with material, dimensions and estimated mass → `design/BOM.csv`
- module-by-module specification: ports, ratings, protection, lock-out and exchange procedure → `design/Design_Specification.md`

> **Status:** everything is simulated with a simplified model and not validated. Dimensions, materials and protection ratings are design targets, not vendor data or manufacturing drawings.

## Run the model
```
pip install numpy scipy matplotlib CoolProp
python tests/test_model.py                # 16 checks (needs CoolProp)
python experiments/validate_cycle.py      # simplified cycle vs exact CoolProp cycle
python experiments/baselines.py           # five-controller comparison (~1 min)
python experiments/run.py                 # full study (~2 min); --quick for a smoke run
python experiments/baselines.py && python experiments/make_fig6.py
python experiments/export_web.py && node web/parity.mjs
node web/build.mjs                        # builds web/plant.html -> copy to site/index.html
```

## Licence
MIT for the code (see LICENSE). 
