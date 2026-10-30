"""Simplified R134a vapor-compression cycle (SI: kW, kJ/kg, kg/s, bar, degC).

Property data come from CoolProp (R134a, Tillner-Roth & Baehr EOS, IIR reference) via svcr/fit_properties.py, which writes
svcr/r134a_fit.json: Antoine fit for p_sat, quartic fits for h_f and h_g, and least-squares calibrated cp_v, k_isen, z_suct for
the simplified compressor terms. The model runs without CoolProp; experiments/validate_cycle.py compares it with an exact
CoolProp cycle.
"""
from __future__ import annotations
import json, os
from dataclasses import dataclass
import numpy as np

_FIT = json.load(open(os.path.join(os.path.dirname(__file__), "r134a_fit.json")))
_A, _B, _C = _FIT["antoine"]
_hf = np.array(_FIT["hf"]); _hg = np.array(_FIT["hg"])


def _antoine(T, A, B, C):
    return A - B / (T + 273.15 + C)


def psat(T):  # bar
    return np.exp(_antoine(T, _A, _B, _C))


def tsat(P):  # degC
    return _B / (_A - np.log(P)) - _C - 273.15


def hf(T): return np.polyval(_hf, T)
def hg(T): return np.polyval(_hg, T)


@dataclass(frozen=True)
class Cycle:
    """Equipment parameters of the refrigeration circuit."""
    swept: float = 0.0105      # m3/s swept volume rate at 100 % speed (~38 m3/h)
    clearance: float = 0.06
    k_isen: float = _FIT["k_isen"]       # effective isentropic exponent, calibrated to CoolProp
    cp_v: float = _FIT["cp_v"]         # kJ/kgK vapour, calibrated to CoolProp
    z_suct: float = _FIT["z_suct"]      # suction compressibility, calibrated to CoolProp
    superheat: float = 5.0     # K (TXV)
    subcool: float = 3.0       # K
    eta_is0: float = 0.80      # isentropic efficiency at PR = 1
    eta_is_slope: float = 0.045
    eta_mech: float = 0.93
    eta_vfd: float = 0.97
    motor_rated: float = 7.5   # kW shaft
    UA_chamber: float = 2.0    # kW/K cold-room coil
    UA_store: float = 1.5      # kW/K store plate
    UA_cond0: float = 2.2      # kW/K condenser, full fan
    Qc_rated: float = 19.0
    fan_cond: float = 0.9      # kW
    fan_min: float = 0.35
    Tc_min: float = 20.0       # head-pressure control floor
    Te_min: float = -35.0
    R: float = 8.314 / 102.03

    def eta0(self, PR):
        return float(np.clip(self.eta_is0 - self.eta_is_slope * (PR - 1.0), 0.5, 0.8))

    def eta_is(self, PR, eff=1.0):
        return float(np.clip(self.eta0(PR) * eff, 0.35, 0.86))


R_COLS = ["Qe", "Pel", "Qc", "Pfan", "Te", "Tc", "Pe", "Pc", "h1", "h2", "h3", "m", "T2"]


def states(cy: Cycle, Te, Tc, s, eff=1.0):
    Pe, Pc = float(psat(Te)), float(psat(Tc))
    PR = Pc / Pe
    T1 = Te + cy.superheat
    h1 = float(hg(Te)) + cy.cp_v * cy.superheat
    ex = (cy.k_isen - 1.0) / cy.k_isen
    ws = cy.cp_v * (T1 + 273.15) * (PR ** ex - 1.0)
    eta = cy.eta_is(PR, eff)
    h2 = h1 + ws / eta
    h3 = float(hf(Tc - cy.subcool))
    rho1 = Pe * 100.0 / (cy.z_suct * cy.R * (T1 + 273.15))
    eta_v = max(0.2, 1.0 - cy.clearance * (PR ** (1.0 / cy.k_isen) - 1.0))
    m = eta_v * rho1 * cy.swept * s
    Wsh = m * (h2 - h1)
    x = min(1.0, max(0.1, Wsh / cy.motor_rated))
    eta_m = 0.92 - 0.12 * (1.0 - x) ** 2
    Pel = Wsh / (cy.eta_mech * eta_m * cy.eta_vfd)
    Qe = m * (h1 - h3)           # h4 = h3, isenthalpic expansion
    Qc = m * (h2 - h3)
    T2 = T1 + (h2 - h1) / cy.cp_v
    return dict(Qe=Qe, Pel=Pel, Qc=Qc, Pe=Pe, Pc=Pc, h1=h1, h2=h2, h3=h3, m=m, T2=T2, Wsh=Wsh, PR=PR, eta=eta)


def _fan(cy, Qc):
    return min(1.0, max(cy.fan_min, Qc / cy.Qc_rated))


def solve(cy: Cycle, Tmed, Tamb, s, circuit=0, eff=1.0):
    """Fixed point for (Te, Tc). circuit 0 = cold-room coil, 1 = thermal-store plate."""
    UAe = cy.UA_chamber if circuit == 0 else cy.UA_store
    Te, Tc = Tmed - 8.0, max(Tamb + 10.0, cy.Tc_min)
    for _ in range(300):
        st = states(cy, Te, Tc, s, eff)
        f = _fan(cy, st["Qc"])
        Te_n = max(cy.Te_min, min(Tmed - 0.5, Tmed - st["Qe"] / UAe))
        Tc_n = max(cy.Tc_min, Tamb + st["Qc"] / (cy.UA_cond0 * f ** 0.5))
        if abs(Te_n - Te) < 1e-9 and abs(Tc_n - Tc) < 1e-9:
            break
        Te, Tc = Te + 0.5 * (Te_n - Te), Tc + 0.5 * (Tc_n - Tc)
    st = states(cy, Te, Tc, s, eff)
    f = _fan(cy, st["Qc"])
    st.update(Te=Te, Tc=Tc, Pfan=cy.fan_cond * f ** 3, fan=f)
    return st


def residual(cy, x, Tmed, Tamb, s, circuit, eff=1.0):
    """Same fixed point as a root problem, for an independent scipy.optimize.fsolve check."""
    Te, Tc = x
    st = states(cy, Te, Tc, s, eff)
    f = _fan(cy, st["Qc"])
    UAe = cy.UA_chamber if circuit == 0 else cy.UA_store
    return [Tmed - st["Qe"] / UAe - Te, Tamb + st["Qc"] / (cy.UA_cond0 * f ** 0.5) - Tc]


GRID = dict(
    Tmed=np.arange(-8.0, 10.1, 2.0), Tamb=np.arange(-5.0, 50.1, 5.0),
    speed=np.arange(0.3, 1.001, 0.1), eff=np.arange(0.8, 1.101, 0.1),
)


def build_map(cy: Cycle):
    g = GRID
    out = np.zeros((2, len(g["Tmed"]), len(g["Tamb"]), len(g["speed"]), len(g["eff"]), len(R_COLS)))
    for c in range(2):
        for i, Tm in enumerate(g["Tmed"]):
            for j, Ta in enumerate(g["Tamb"]):
                for k, s in enumerate(g["speed"]):
                    for l, e in enumerate(g["eff"]):
                        r = solve(cy, Tm, Ta, s, c, e)
                        out[c, i, j, k, l] = [r[n] for n in R_COLS]
    return out


class PerfMap:
    """Multilinear interpolation over (Tmed, Tamb, speed, eff); same algorithm as web/sim.js."""
    def __init__(self, table):
        from scipy.interpolate import RegularGridInterpolator as RGI
        g = GRID
        self.ax = (g["Tmed"], g["Tamb"], g["speed"], g["eff"])
        self.f = [RGI(self.ax, table[c], bounds_error=False, fill_value=None) for c in range(2)]
        self.lo = np.array([a[0] for a in self.ax]); self.hi = np.array([a[-1] for a in self.ax])

    def __call__(self, circuit, Tmed, Tamb, s, eff=1.0):
        p = np.clip(np.array([Tmed, Tamb, s, eff], float), self.lo, self.hi)
        return self.f[circuit](p)[0]

    def curve(self, circuit, Tmed, Tamb, speeds, eff=1.0):
        pts = np.clip(np.array([[Tmed, Tamb, s, eff] for s in speeds], float), self.lo, self.hi)
        return self.f[circuit](pts)


def dome():
    T = np.arange(-40, 61, 5.0)
    return dict(T=T.tolist(), P=psat(T).tolist(), hf=hf(T).tolist(), hg=hg(T).tolist())
