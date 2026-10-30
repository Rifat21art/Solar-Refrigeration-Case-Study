"""Generate svcr/r134a_fit.json from CoolProp (R134a, Tillner-Roth & Baehr EOS) and calibrate the simplified-compressor terms.
Run once (needs `pip install CoolProp`); the model itself then runs without CoolProp.
   python svcr/fit_properties.py
Fits: ln(p_sat) Antoine form, h_f and h_g quartics on -40..60 C; then cp_v, k_isen, z_suct least-squares to real-fluid
superheated-vapour enthalpy, isentropic work and density over Te -25..8 C, Tc 25..55 C. Reference state: IIR (h_f = 200 kJ/kg at 0 C)."""
import json, os, numpy as np
from scipy.optimize import curve_fit, minimize
from CoolProp.CoolProp import PropsSI
F = "R134a"; K = 273.15; R = 8.314 / 102.03
def P(T): return PropsSI("P", "T", T + K, "Q", 0, F) / 1e5
def HF(T): return PropsSI("H", "T", T + K, "Q", 0, F) / 1e3
def HG(T): return PropsSI("H", "T", T + K, "Q", 1, F) / 1e3
T = np.arange(-40.0, 60.1, 2.5); p = np.array([P(t) for t in T])
(A, B, C), _ = curve_fit(lambda t, a, b, c: a - b / (t + K + c), T, np.log(p), p0=(10.0, 2500.0, -30.0))
hf = np.polyfit(T, [HF(t) for t in T], 4); hg = np.polyfit(T, [HG(t) for t in T], 4)
# real-fluid vapour states over the operating range
pts = [(te, tc) for te in np.arange(-25, 8.1, 3.0) for tc in np.arange(25, 55.1, 5.0)]
SH = 5.0; rows = []
for te, tc in pts:
    pe, pc = P(te) * 1e5, P(tc) * 1e5; t1 = te + SH + K
    h1 = PropsSI("H", "P", pe, "T", t1, F) / 1e3; s1 = PropsSI("S", "P", pe, "T", t1, F)
    h2s = PropsSI("H", "P", pc, "S", s1, F) / 1e3; rho = PropsSI("D", "P", pe, "T", t1, F)
    rows.append((te, tc, t1, pe / 1e5, pc / pe, h1, h2s - h1, rho, HG(te)))
rows = np.array(rows)
cp_v = float(np.mean((rows[:, 5] - rows[:, 8]) / SH))
def werr(k): ex = (k - 1) / k; return np.sqrt(np.mean((cp_v * rows[:, 2] * (rows[:, 4] ** ex - 1) / rows[:, 6] - 1) ** 2))
k = float(minimize(lambda x: werr(x[0]), [1.09], method="Nelder-Mead").x[0])
z = float(np.mean(rows[:, 3] * 100 / (R * rows[:, 2] * rows[:, 7])))
out = dict(antoine=[float(A), float(B), float(C)], hf=hf.tolist(), hg=hg.tolist(), cp_v=round(cp_v, 4), k_isen=round(k, 4), z_suct=round(z, 4),
           source="CoolProp %s, R134a (Tillner-Roth & Baehr 1994 EOS), IIR reference" % __import__("CoolProp").__version__)
json.dump(out, open(os.path.join(os.path.dirname(__file__), "r134a_fit.json"), "w"), indent=1)
print(json.dumps({k_: v for k_, v in out.items() if k_ not in ("hf", "hg")}, indent=1)); print("ws rel rms err", werr(k))
