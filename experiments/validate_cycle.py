"""Validate the simplified cycle (svcr/cycle.py) against an exact real-fluid cycle computed with CoolProp.
Same Te, Tc, speed and efficiency correlations; only the properties differ (real-fluid h, s, density vs fitted/ideal-gas terms).
   python experiments/validate_cycle.py        (needs CoolProp)"""
import sys, os, json; sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import numpy as np
from CoolProp.CoolProp import PropsSI
from svcr.cycle import Cycle, states
F, K = "R134a", 273.15
def exact(cy, Te, Tc, s, eff=1.0):
    Pe, Pc = PropsSI("P", "T", Te + K, "Q", 1, F), PropsSI("P", "T", Tc + K, "Q", 1, F); PR = Pc / Pe; T1 = Te + cy.superheat + K
    h1 = PropsSI("H", "P", Pe, "T", T1, F) / 1e3; s1 = PropsSI("S", "P", Pe, "T", T1, F); rho = PropsSI("D", "P", Pe, "T", T1, F)
    ws = PropsSI("H", "P", Pc, "S", s1, F) / 1e3 - h1; h2 = h1 + ws / cy.eta_is(PR, eff)
    h3 = PropsSI("H", "P", Pc, "T", Tc - cy.subcool + K, F) / 1e3
    etav = max(0.2, 1.0 - cy.clearance * (PR ** (1.0 / cy.k_isen) - 1.0)); m = etav * rho * cy.swept * s
    Wsh = m * (h2 - h1); x = min(1.0, max(0.1, Wsh / cy.motor_rated)); em = 0.92 - 0.12 * (1 - x) ** 2
    Pel = Wsh / (cy.eta_mech * em * cy.eta_vfd)
    return dict(Qe=m * (h1 - h3), Pel=Pel, Qc=m * (h2 - h3), Wsh=Wsh)
def compare(cy=Cycle()):
    err = {k: [] for k in ("Qe", "Pel", "COP")}
    for Te in (-20, -10, -5, 0, 5):
        for Tc in (25, 35, 45, 55):
            for s in (0.4, 0.7, 1.0):
                a, b = states(cy, Te, Tc, s), exact(cy, Te, Tc, s)
                err["Qe"].append(a["Qe"] / b["Qe"] - 1); err["Pel"].append(a["Pel"] / b["Pel"] - 1); err["COP"].append((a["Qe"] / a["Pel"]) / (b["Qe"] / b["Pel"]) - 1)
    return {k: dict(mean=float(np.mean(v)), max_abs=float(np.max(np.abs(v)))) for k, v in err.items()}
if __name__ == "__main__":
    r = compare(); json.dump(r, open(os.path.join(os.path.dirname(__file__), "..", "results", "validation_cycle.json"), "w"), indent=1)
    for k, v in r.items(): print(f"{k:4s} mean {v['mean']*100:+.2f} %  max |err| {v['max_abs']*100:.2f} %")
