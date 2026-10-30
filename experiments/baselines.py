"""Fairer baselines (added for the final paper). `python experiments/baselines.py`
Two solar-BLIND controllers are compared with the original three policies on the same 16 days:
  wide : on/off thermostat at full speed with the SAME allowed band the solar policies use (0.5-3.4 C)
  vs   : variable-speed proportional thermostat (speed rises with room temperature), solar-blind
The core model (svcr/) is untouched; the extra policies are injected by wrapping plant.decide.
All results are SIMULATED."""
import sys, os, json; sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import numpy as np
from svcr import data, plant
from svcr.cycle import Cycle
from svcr.plant import Plant, make_day, simulate, metrics, S_GRID, CIRC_ROOM

_orig = plant.decide
def decide(policy, st, inp, pl, perf, pv_ac):
    if policy not in ("wide", "vs"): return _orig(policy, st, inp, pl, perf, pv_ac)
    Ts, on = st["Ts"], st["on"]
    if policy == "wide":
        run = (Ts > 0.5) if on else (Ts >= 3.4); want = (CIRC_ROOM, pl.cap) if run else (None, 0.0)
    else:
        run = (Ts > 1.0) if on else (Ts >= 1.5)
        s = float(np.clip(0.3 + 0.7 * (Ts - 1.0) / 2.0, 0.3, pl.cap))
        s = float(S_GRID[np.argmin(np.abs(S_GRID - s))]); want = (CIRC_ROOM, s) if run else (None, 0.0)
    if on and st["t_on"] < pl.min_on and want[0] is None: want = (st["circ"], st["speed"])
    if (not on) and st["t_off"] < pl.min_off: want = (None, 0.0)
    return want
plant.decide = decide

cy = Cycle(); TAB, PERF = data.load(cy); pl = Plant(store_kwh=30.0)
POL = ["fixed", "wide", "vs", "solar", "storage"]; seeds = range(100, 116)
per = {p: [metrics(simulate(p, make_day(s), pl, PERF), pl) for s in seeds] for p in POL}
out = {}
for p in POL:
    m = per[p]; out[p] = {k: [float(np.mean([x[k] for x in m])), float(np.std([x[k] for x in m]))] for k in
        ("E_grid", "E_load", "cost", "solar_frac", "peak_grid", "starts", "degh_over", "Ts_max", "Ts_min", "E_export", "cop_sys")}
    if p != "fixed":
        for k in ("E_grid", "cost"):
            out[p]["sav_" + k] = float(np.mean([(a[k] - b[k]) / a[k] * 100 for a, b in zip(per["fixed"], m)]))
# saving of solar-aware policies relative to the *fairest* solar-blind baseline (vs)
for p in ("solar", "storage"):
    for k in ("E_grid", "cost"):
        out[p]["sav_vs_" + k] = float(np.mean([(a[k] - b[k]) / a[k] * 100 for a, b in zip(per["vs"], per[p])]))
        out[p]["sav_wide_" + k] = float(np.mean([(a[k] - b[k]) / a[k] * 100 for a, b in zip(per["wide"], per[p])]))
json.dump(out, open(os.path.join(os.path.dirname(__file__), "..", "results", "baselines.json"), "w"), indent=1)
for p in POL:
    o = out[p]; print(f"{p:8s} grid {o['E_grid'][0]:5.1f}  load {o['E_load'][0]:5.1f}  cost {o['cost'][0]:.2f}  solar {o['solar_frac'][0]:.2f}  peak {o['peak_grid'][0]:.1f}  starts {o['starts'][0]:5.1f}  Tmax {o['Ts_max'][0]:.2f} Tmin {o['Ts_min'][0]:.2f} degh {o['degh_over'][0]:.2f}  sav_fixed grid {o.get('sav_E_grid',0):5.1f} cost {o.get('sav_cost',0):5.1f}")
for p in ("solar", "storage"): print(p, "vs VS-blind: grid %.1f cost %.1f | vs wide: grid %.1f cost %.1f" % (out[p]["sav_vs_E_grid"], out[p]["sav_vs_cost"], out[p]["sav_wide_E_grid"], out[p]["sav_wide_cost"]))
