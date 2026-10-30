"""Reference day + module-state scenarios (figures, browser parity test, design report)."""
import sys, os, json; sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import numpy as np
from svcr import data
from svcr.plant import Plant, make_day, simulate, metrics, POLICIES
OUT = os.path.join(os.path.dirname(__file__), "..", "results")

def write_reference(PERF):

    day = make_day(7); ref = {}
    for p in POLICIES:
        R = simulate(p, day, Plant(store_kwh=30.0), PERF)
        ref[p] = {k: np.round(R[k], 5).tolist() for k in ("Ts", "f", "Pgrid", "Pload", "Pv", "Pexp", "circ", "speed", "Qe", "Pel")} | dict(metrics=metrics(R))
    SC = {"island": ("storage", dict(m_grid=False)), "no_store": ("storage", dict(m_store=False)), "no_cond": ("solar", dict(m_cond=False)), "no_evap": ("storage", dict(m_evap=False)), "no_inv": ("solar", dict(m_inv=False))}
    for n, (p, kw) in SC.items():
        R = simulate(p, day, Plant(store_kwh=30.0, **kw), PERF)
        ref["sc_" + n] = {k: np.round(R[k], 5).tolist() for k in ("Ts", "f", "Pgrid", "Punsrv", "Pload")} | dict(policy=p, mods=kw, metrics=metrics(R, Plant(store_kwh=30.0, **kw)))
    ref["day"] = {k: np.round(day[k], 4).tolist() for k in ("t", "G", "Tamb", "Qproc")} | dict(dt=day["dt"])
    json.dump(ref, open(os.path.join(OUT, "reference_day.json"), "w"))

    return day, ref

if __name__ == "__main__":
    write_reference(data.load()[1]); print("reference_day.json written")
