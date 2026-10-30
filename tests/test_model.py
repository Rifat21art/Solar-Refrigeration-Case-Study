""" Model verification """
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import numpy as np
from scipy.optimize import fsolve
from svcr.cycle import Cycle, solve, residual, GRID, psat, tsat
from svcr.plant import Plant, make_day, simulate, metrics, inverter, pv_dc, POLICIES
from svcr import data

cy = Cycle(); TAB, PERF = data.load(cy)
POINTS = [(2, 30, 1.0, 0), (2, 30, 0.5, 0), (4, 40, 0.8, 0), (-4, 30, 0.6, 1), (6, 25, 0.4, 0), (0, 35, 0.9, 0)]

def test_heat_rejection_equals_cooling_plus_compressor_work():
    for Tm, Ta, s, c in POINTS:
        r = solve(cy, Tm, Ta, s, c)
        assert abs(r["Qc"] - (r["Qe"] + r["Wsh"])) < 1e-9 * r["Qc"], (Tm, Ta, s)
        assert abs(r["Qc"] - r["m"] * (r["h2"] - r["h3"])) < 1e-9

def test_cycle_is_physical():
    for Tm, Ta, s, c in POINTS:
        r = solve(cy, Tm, Ta, s, c)
        assert r["Pc"] > r["Pe"] and r["Qe"] > 0 and r["Wsh"] > 0 and r["Pel"] > r["Wsh"]
        assert r["T2"] < 130 and r["Te"] < Tm and r["Tc"] >= Ta - 1e-9
        assert 1.2 < r["Qe"] / r["Pel"] < 8.0
    # COP falls with ambient, rises with cold-medium temperature
    cop = lambda Tm, Ta: (lambda r: r["Qe"] / r["Pel"])(solve(cy, Tm, Ta, 0.8, 0))
    assert cop(2, 25) > cop(2, 35) > cop(2, 45) and cop(6, 30) > cop(0, 30)

def test_property_fit():
    from CoolProp.CoolProp import PropsSI
    from svcr.cycle import hf, hg
    assert abs(float(tsat(psat(12.0))) - 12.0) < 1e-9
    for T in np.arange(-40, 60.1, 5.0):
        P = PropsSI("P", "T", T + 273.15, "Q", 0, "R134a") / 1e5
        assert abs(float(psat(T)) / P - 1) < 0.005, T
        assert abs(float(hf(T)) - PropsSI("H", "T", T + 273.15, "Q", 0, "R134a") / 1e3) < 0.5, T
        assert abs(float(hg(T)) - PropsSI("H", "T", T + 273.15, "Q", 1, "R134a") / 1e3) < 0.5, T

def test_cycle_vs_coolprop():
    import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "experiments"))
    from validate_cycle import compare
    r = compare(cy)
    assert r["Qe"]["max_abs"] < 0.04 and r["Pel"]["max_abs"] < 0.03 and r["COP"]["max_abs"] < 0.06

def test_fixed_point_matches_fsolve():
    for Tm, Ta, s, c in [(2, 35, 1.0, 0), (-4, 38, 0.7, 1)]:
        r = solve(cy, Tm, Ta, s, c); x = fsolve(lambda x: residual(cy, x, Tm, Ta, s, c), [r["Te"] + 1, r["Tc"] - 1])
        assert np.allclose(x, [r["Te"], r["Tc"]], atol=1e-5)

def test_map_interpolation_error():
    rng = np.random.default_rng(1); worst = 0
    for _ in range(60):
        Tm, Ta, s, e = rng.uniform(-6, 9), rng.uniform(0, 48), rng.uniform(0.3, 1), rng.uniform(0.8, 1.1)
        c = int(rng.integers(0, 2)); ex = solve(cy, Tm, Ta, s, c, e); mp = PERF(c, Tm, Ta, s, e)
        worst = max(worst, abs(mp[0] - ex["Qe"]) / ex["Qe"], abs(mp[1] - ex["Pel"]) / ex["Pel"])
    assert worst < 0.05, worst

def _run(pol, **kw):
    pl = Plant(**kw.pop("pl", {})); day = make_day(**kw) if kw else make_day(7)
    return simulate(pol, day, pl, PERF), pl

def test_electrical_accounting():
    for pol in POLICIES:
        R, pl = _run(pol); h = R["dt"] / 3600
        assert np.allclose(R["Pload"], R["Pel"] + R["Pfan"] + R["Paux"])
        assert np.allclose(R["Pgrid"] + R["Punsrv"] + (R["Pv"] - R["Pexp"]), R["Pload"], atol=1e-9)      # load = grid + PV used + unserved
        assert np.all(R["Pgrid"] >= -1e-12) and np.all(R["Pexp"] >= -1e-12)
        assert np.all(R["Pv"][R["G"] == 0] == 0)
        m = metrics(R, pl); assert abs(m["E_pv"] - m["E_pv_used"] - m["E_export"]) < 1e-9 * max(1, m["E_pv"])

def test_module_states():
    base = metrics(_run("storage")[0])
    # detached store == zero-size store
    a, _ = _run("storage", pl=dict(m_store=False)); b, _ = _run("storage", pl=dict(store_kwh=0.0))
    assert np.allclose(a["Ts"], b["Ts"]) and np.allclose(a["Pgrid"], b["Pgrid"])
    # condenser (or compressor) removed -> interlock trips, no refrigeration, room warms past the limit
    for m in ("m_cond", "m_comp"):
        R, pl = _run("fixed", pl={m: False}); assert R["Qe"].sum() == 0 and R["Ts"].max() > 4.0
    # evaporator unit removed: room cannot be cooled by the compressor, store can still charge
    R, pl = _run("storage", pl=dict(m_evap=False), Tmean=12.0, demand=0.4); assert np.all(R["circ"] != 1) and R["Qchg"].sum() > 0
    # PV or inverter removed -> no solar
    for m in ("m_pv", "m_inv"):
        R, pl = _run("solar", pl={m: False}); mm = metrics(R, pl); assert mm["E_pv"] == 0 and abs(mm["E_grid"] - mm["E_load"]) < 1e-9
    # grid tie open: islanded, compressor runs only on PV, accounting still closes
    R, pl = _run("storage", pl=dict(m_grid=False)); h = R["dt"] / 3600; used = R["Pv"] - R["Pexp"]
    assert np.all(R["Pgrid"] == 0) and np.allclose(R["Pload"], used + R["Punsrv"], atol=1e-9)
    assert np.all(R["Pel"] + R["Pfan"] + R["Paux"] - R["Pv"] <= R["Punsrv"] + 1e-9)
    on = R["circ"] > 0; assert np.all(R["Pv"][on] > 0.5)

def test_pv_and_inverter():
    assert inverter(0, 10) == 0 and 0.9 < inverter(10, 10) / 10 < 0.97 and inverter(20, 10) == 10
    assert pv_dc(1000, 25, Plant()) > pv_dc(1000, 45, Plant())

def test_room_energy_balance_closes():
    # explicit-Euler bookkeeping must close exactly: sum(heat in - heat out) = C * dT
    for pol in POLICIES:
        R, pl = _run(pol)
        net = (R["Qload"] - np.where(R["circ"] == 1, R["Qe"], 0) - R["Qdis"]) * R["dt"]
        assert abs(net[:-1].sum() - pl.C_s * (R["Ts"][-1] - R["Ts"][0])) < 1e-6 * max(1.0, abs(net).sum()), pol

def test_room_free_decay_matches_analytic():
    day = make_day(3, demand=1.0, dvar=0.0); n = 60
    for k in ("G", "Qproc"): day[k] = day[k][:n] * 0 + (0 if k == "G" else 2.0)
    day["Tamb"] = day["Tamb"][:n] * 0 + 30.0; day["t"] = day["t"][:n]
    pl = Plant(min_off=0.0, T_set=50.0)               # thermostat never calls: pure warm-up
    R = simulate("fixed", day, pl, PERF, Ts0=2.0)
    tau = pl.C_s / pl.UA_env; Tinf = 30.0 + 2.0 / pl.UA_env; t = np.arange(n) * day["dt"]
    analytic = Tinf - (Tinf - 2.0) * np.exp(-t / tau)
    assert np.max(np.abs(R["Ts"] - analytic)) < 0.01

def test_store_energy_balance():
    R, pl = _run("storage"); E = pl.store_kwh * 3600.0
    flow = np.sum((R["Qchg"] - R["Qdis"] - R["Qleak"])[:-1] * R["dt"]) - np.sum(R["over"][:-1])
    assert abs((R["f"][-1] - R["f"][0]) * E - flow) < 1e-6 * E                      # stored latent heat closes
    assert R["f"].min() >= 0 and R["f"].max() <= 1 and np.sum(np.abs(R["over"])) < 0.01 * E   # bounds rarely bite

def test_constraints():
    for pol in POLICIES:
        R, pl = _run(pol); on = R["circ"] > 0
        assert np.all(R["speed"][on] >= 0.3 - 1e-9) and np.all(R["speed"] <= pl.cap + 1e-9)
        runs, off, cur = [], [], 0
        d = np.diff(np.r_[0, on.astype(int), 0]); s, e = np.where(d == 1)[0], np.where(d == -1)[0]
        for a, b in zip(s, e):
            if a > 0 and b < len(on): assert (b - a) * R["dt"] >= pl.min_on - 1e-9, (pol, a, b)
        for a, b in zip(e[:-1], s[1:]): assert (b - a) * R["dt"] >= pl.min_off - 1e-9

def test_policy_ordering_on_clear_day():
    g = {p: metrics(_run(p)[0])["E_grid"] for p in POLICIES}
    assert g["storage"] < g["solar"] < g["fixed"], g

def test_zero_solar_sanity():
    for pol in POLICIES:
        R, pl = _run(pol, solar=0.0); m = metrics(R, pl)
        assert m["E_pv"] == 0 and abs(m["E_grid"] - m["E_load"]) < 1e-9 and m["Ts_max"] < 5.2, (pol, m["Ts_max"])

def test_detached_modules():
    R, pl = _run("solar", pl=dict(m_comp=False)); assert R["circ"].max() == 0 and R["Ts"].max() > 5            # trip: no cooling
    R, pl = _run("solar", pl=dict(m_cond=False)); assert R["circ"].max() == 0
    R, pl = _run("solar", pl=dict(m_evap=False)); assert R["circ"].max() == 0
    R, pl = _run("storage", pl=dict(m_evap=False)); assert (R["circ"] == 2).any() and not (R["circ"] == 1).any()
    R, pl = _run("solar", pl=dict(m_pv=False)); assert R["Pv"].max() == 0
    R, pl = _run("solar", pl=dict(m_inv=False)); assert R["Pv"].max() == 0
    R, pl = _run("fixed", pl=dict(m_grid=False))                                                                 # islanded
    assert R["Pgrid"].max() == 0 and np.all(R["Pel"] + R["Pfan"] <= R["Pv"] + 1e-9) and np.sum(R["Punsrv"]) > 0
    R, pl = _run("storage", pl=dict(m_store=False)); assert R["f"].max() == 0

if __name__ == "__main__":
    fs = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for f in fs: f(); print("ok  ", f.__name__)
    print(len(fs), "tests passed")
