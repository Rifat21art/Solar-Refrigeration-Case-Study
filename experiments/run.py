"""Reproducible comparison + sensitivity experiments. `python experiments/run.py [--quick]`
All results are SIMULATED with the simplified model in svcr/; none are experimentally validated."""
import sys, os, json, csv, time; sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import numpy as np, matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
from svcr import data
from svcr.cycle import Cycle, R_COLS, GRID, dome
from svcr.plant import Plant, make_day, simulate, metrics, POLICIES

QUICK = "--quick" in sys.argv; NS = 4 if QUICK else 16; NSW = 3 if QUICK else 8
OUT = os.path.join(os.path.dirname(__file__), "..", "results"); FIG = os.path.join(os.path.dirname(__file__), "..", "figures")
cy = Cycle(); TAB, PERF = data.load(cy)
LAB = {"fixed": "Fixed (grid-dominant)", "solar": "Solar-priority", "storage": "Solar-priority + store"}
COL = {"fixed": "#8a8f98", "solar": "#d98a00", "storage": "#1f77b4"}

def run(pol, pl=Plant(), seed=1, **kw):
    return metrics(simulate(pol, make_day(seed, **kw), pl, PERF), pl)

def ens(pol, pl=Plant(), seeds=NS, **kw):
    ms = [run(pol, pl, s, **kw) for s in range(100, 100 + seeds)]
    return {k: (float(np.mean([m[k] for m in ms])), float(np.std([m[k] for m in ms]))) for k in ms[0]}, ms

t0 = time.time(); res = {}
# ---------- E1: identical weather + demand, three policies ----------
E1 = {}; per = {}
for p in POLICIES:
    E1[p], per[p] = ens(p, Plant(store_kwh=30.0))
sav = {p: {k: float(np.mean([(a[k] - b[k]) / a[k] * 100 for a, b in zip(per["fixed"], per[p])])) for k in ("E_grid", "cost")} for p in ("solar", "storage")}
res["E1"] = dict(summary=E1, savings_vs_fixed_pct=sav, n_days=NS)

# ---------- E2: sensitivities (paired against the fixed policy on the same days) ----------
def saving(pol, pl, **kw):
    a = [run("fixed", pl, s, **kw) for s in range(200, 200 + NSW)]; b = [run(pol, pl, s, **kw) for s in range(200, 200 + NSW)]
    g = float(np.mean([(x["E_grid"] - y["E_grid"]) / x["E_grid"] * 100 for x, y in zip(a, b)]))
    c = float(np.mean([(x["cost"] - y["cost"]) / x["cost"] * 100 for x, y in zip(a, b)]))
    return g, c, float(np.mean([y["E_grid"] for y in b])), float(np.mean([y["degh_over"] for y in b])), float(np.mean([y["starts"] for y in b]))
SIZES = [0, 10, 20, 30, 45, 60, 80]; SOL = [0.2, 0.4, 0.6, 0.8, 1.0, 1.2]; DV = [0.0, 0.25, 0.5, 0.75]; TM = [24, 28, 32, 36]
S = {}
S["storage_size"] = [(z, *saving("storage", Plant(store_kwh=float(z)))) for z in SIZES]
S["solar"] = {p: [(z, *saving(p, Plant(store_kwh=30.0), solar=z)) for z in SOL] for p in ("solar", "storage")}
S["demand_var"] = {p: [(z, *saving(p, Plant(store_kwh=30.0), dvar=z)) for z in DV] for p in ("solar", "storage")}
S["ambient"] = {p: [(z, *saving(p, Plant(store_kwh=30.0), Tmean=z)) for z in TM] for p in ("solar", "storage")}
H = np.array([[saving("storage", Plant(store_kwh=float(z)), solar=a)[0] for a in SOL] for z in SIZES[1:]])
S["heat"] = dict(sizes=SIZES[1:], solar=SOL, saving=H.tolist()); res["E2"] = S

json.dump(res, open(os.path.join(OUT, "experiments.json"), "w"), indent=1)
with open(os.path.join(OUT, "policy_comparison.csv"), "w", newline="") as f:
    w = csv.writer(f); keys = ["E_load", "E_comp", "E_aux", "E_grid", "E_export", "cost", "solar_frac", "peak_grid", "degh_over", "Ts_max", "starts", "short_runs", "runtime_h", "cop_comp", "cop_sys"]
    w.writerow(["policy"] + [f"{k}_{s}" for k in keys for s in ("mean", "std")])
    for p in POLICIES: w.writerow([p] + [f"{E1[p][k][i]:.4f}" for k in keys for i in (0, 1)])

from reference import write_reference
day, ref = write_reference(PERF)

# ---------- figures ----------
plt.rcParams.update({"font.size": 9, "axes.spines.top": False, "axes.spines.right": False})
fig, ax = plt.subplots(4, 1, figsize=(8, 8), sharex=True); t = day["t"]
ax[0].plot(t, ref["day"]["G"], "#d98a00"); ax[0].set_ylabel("G (W/m²)"); ax[0].twinx().plot(t, ref["day"]["Tamb"], "#c0392b", lw=1); 
for p in POLICIES:
    ax[1].plot(t, ref[p]["Ts"], c=COL[p], label=LAB[p]); ax[2].plot(t, ref[p]["Pgrid"], c=COL[p]); ax[3].plot(t, ref[p]["f"], c=COL[p])
ax[1].axhline(4, c="k", ls=":", lw=.8); ax[1].set_ylabel("Cold-room T (°C)"); ax[1].legend(frameon=False, ncol=3, fontsize=8)
ax[2].set_ylabel("Grid import (kW)"); ax[3].set_ylabel("Store charge (–)"); ax[3].set_xlabel("Hour of day"); ax[3].set_xlim(0, 24)
fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig1_reference_day.png"), dpi=140); plt.close(fig)

fig, ax = plt.subplots(1, 3, figsize=(10, 3.2)); x = np.arange(3)
for i, (k, lab) in enumerate((("E_grid", "Grid import (kWh/day)"), ("cost", "Electricity cost ($/day)"), ("starts", "Compressor starts/day"))):
    ax[i].bar(x, [E1[p][k][0] for p in POLICIES], yerr=[E1[p][k][1] for p in POLICIES], color=[COL[p] for p in POLICIES], capsize=3)
    ax[i].set_xticks(x, ["Fixed", "Solar", "Solar+store"], fontsize=8); ax[i].set_ylabel(lab)
fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig2_policy_comparison.png"), dpi=140); plt.close(fig)

fig, ax = plt.subplots(1, 4, figsize=(13, 3.2))
ax[0].plot(SIZES, [r[1] for r in S["storage_size"]], "o-", c=COL["storage"], label="grid kWh"); ax[0].plot(SIZES, [r[2] for r in S["storage_size"]], "s--", c="#2a9d8f", label="cost"); ax[0].set_xlabel("Store size (kWh_th)"); ax[0].set_ylabel("Saving vs fixed (%)"); ax[0].legend(frameon=False)
for p in ("solar", "storage"):
    for a, key, xl in ((ax[1], "solar", "Solar availability (× clear day)"), (ax[2], "demand_var", "Demand variability σ"), (ax[3], "ambient", "Mean ambient (°C)")):
        a.plot([r[0] for r in S[key][p]], [r[1] for r in S[key][p]], "o-", c=COL[p], label=LAB[p]); a.set_xlabel(xl)
ax[1].legend(frameon=False, fontsize=7); fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig3_sensitivity.png"), dpi=140); plt.close(fig)

fig, a = plt.subplots(figsize=(5, 3.6)); im = a.imshow(H, origin="lower", aspect="auto", cmap="viridis"); a.set_xticks(range(len(SOL)), SOL); a.set_yticks(range(len(SIZES) - 1), SIZES[1:])
a.set_xlabel("Solar availability"); a.set_ylabel("Store (kWh_th)"); plt.colorbar(im, label="Grid saving vs fixed (%)")
for i in range(H.shape[0]):
    for j in range(H.shape[1]): a.text(j, i, f"{H[i, j]:.0f}", ha="center", va="center", color="w", fontsize=7)
fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig4_storage_vs_solar.png"), dpi=140); plt.close(fig)

# p-h cycle at design point
from svcr.cycle import solve, psat
r = solve(cy, 2.0, 32.0, 0.8, 0); d = dome(); fig, a = plt.subplots(figsize=(4.6, 3.6))
a.semilogy(d["hf"], d["P"], "k", lw=.8); a.semilogy(d["hg"], d["P"], "k", lw=.8)
a.plot([r["h1"], r["h2"], r["h3"], r["h3"], r["h1"]], [r["Pe"], r["Pc"], r["Pc"], r["Pe"], r["Pe"]], "o-", c=COL["storage"]); a.set_xlabel("h (kJ/kg)"); a.set_ylabel("P (bar)")
fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig5_ph_cycle.png"), dpi=140); plt.close(fig)
print(json.dumps({"E1_mean": {p: {k: round(E1[p][k][0], 2) for k in ("E_load", "E_grid", "cost", "solar_frac", "degh_over", "starts", "peak_grid", "Ts_max")} for p in POLICIES}, "savings_vs_fixed_pct": sav,
                  "storage_size": [[r[0], round(r[1], 1), round(r[2], 1), round(r[4], 2)] for r in S["storage_size"]], "solar_storage": [[r[0], round(r[1], 1), round(r[2], 1)] for r in S["solar"]["storage"]],
                  "solar_solar": [[r[0], round(r[1], 1)] for r in S["solar"]["solar"]], "dvar": [[r[0], round(r[1], 1), round(r[3], 2)] for r in S["demand_var"]["storage"]], "amb": [[r[0], round(r[1], 1)] for r in S["ambient"]["storage"]], "secs": round(time.time() - t0)}, indent=0))
