"""Figure: where the saving comes from (reads results/baselines.json written by baselines.py)."""
import json, os, matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
root = os.path.join(os.path.dirname(__file__), ".."); b = json.load(open(os.path.join(root, "results", "baselines.json")))
names = ["Fixed\nthermostat", "Same wide band,\non/off", "Variable-speed,\nsolar-blind", "Solar-priority", "Solar-priority\n+ 30 kWh ice bank"]
keys = ["fixed", "wide", "vs", "solar", "storage"]; vals = [b[k]["E_grid"][0] for k in keys]; errs = [b[k]["E_grid"][1] for k in keys]
cols = ["#8a8f98", "#b9bcc2", "#6aa84f", "#d98a00", "#1f77b4"]
plt.rcParams.update({"font.size": 9, "axes.spines.top": False, "axes.spines.right": False})
fig, ax = plt.subplots(figsize=(8, 3.6)); ax.bar(range(5), vals, yerr=errs, color=cols, capsize=3)
for i, v in enumerate(vals):
    ch = -b[keys[i]].get("sav_E_grid", 0); lab = f"{v:.1f} kWh" if i == 0 else f"{v:.1f} kWh\n({'+' if ch > 0 else '−'}{abs(ch):.0f}% vs fixed)"
    ax.text(i, v + errs[i] + 0.8, lab, ha="center", fontsize=8)
ax.set_xticks(range(5), names, fontsize=8); ax.set_ylabel("Grid import (kWh/day)"); ax.set_ylim(0, 1.22 * max(vals))
ax.set_title("Where the saving comes from (16 identical simulated days)", fontsize=9)
fig.tight_layout(); fig.savefig(os.path.join(root, "figures", "fig6_decomposition.png"), dpi=160)
