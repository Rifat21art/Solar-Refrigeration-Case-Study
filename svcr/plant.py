"""Plant dynamics: PV + inverter, cold room, PCM thermal store, grid, and three operating policies.
Units: kW, kWh, kJ, K, hours. Time step dt = 120 s. Mirrored 1:1 by web/sim.js."""
from __future__ import annotations
from dataclasses import dataclass
import numpy as np

POLICIES = ("fixed", "solar", "storage")
S_GRID = np.array([0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0])
CIRC_ROOM, CIRC_STORE = 0, 1


@dataclass(frozen=True)
class Plant:
    C_s: float = 9000.0        # kJ/K cold-room air + product + structure
    UA_env: float = 0.10       # kW/K envelope
    T_set: float = 2.0
    T_hi: float = 4.0          # product limit
    T_lo: float = 0.5          # pre-cool floor (freeze margin)
    T_pcm: float = -4.0        # eutectic store melt point
    Q_dis_max: float = 8.0     # kW store discharge
    UA_st_per_kwh: float = 0.0004
    P_bms: float = 0.12        # controls + inverter tare
    P_evfan: float = 0.25
    P_pump: float = 0.20
    P_pv_kwp: float = 12.0
    P_inv: float = 10.0
    min_on: float = 600.0      # s, compressor protection
    min_off: float = 600.0
    cap: float = 1.0           # compressor capacity cap (speed fraction)
    eff: float = 1.0           # equipment efficiency multiplier
    store_kwh: float = 30.0
    price_export: float = 0.04
    vfd_kw: float = 7.5
    recv_l: float = 30.0
    # module states (False = disarmed or detached): PV array, inverter, compressor+motor, condenser, evaporator unit, thermal store, grid tie
    m_pv: bool = True
    m_inv: bool = True
    m_comp: bool = True
    m_cond: bool = True
    m_evap: bool = True
    m_store: bool = True
    m_grid: bool = True


def tariff(h):
    h = h % 24.0
    return 0.10 if (h < 6 or h >= 22) else (0.30 if 17 <= h < 21 else 0.16)


def inverter(pdc, rated):
    loss = 0.01 * rated + 0.02 * pdc + 0.025 * pdc * pdc / rated
    return min(rated, max(0.0, pdc - loss)) if pdc > loss else 0.0


def pv_dc(G, Tamb, pl):
    Tcell = Tamb + 0.031 * G
    return pl.P_pv_kwp * (G / 1000.0) * (1.0 - 0.004 * (Tcell - 25.0))


def make_day(seed=7, solar=1.0, Tmean=30.0, Tswing=6.0, demand=1.0, dvar=0.25, cloud=0.35, dt=120.0):
    """Synthetic summer day: irradiance (W/m2), ambient (degC), process load (kW). Seeded, reproducible."""
    rng = np.random.default_rng(seed)
    n = int(86400 / dt); t = np.arange(n) * dt / 3600.0
    sun = np.where((t > 6) & (t < 18), np.sin(np.pi * (t - 6) / 12.0), 0.0) ** 1.2
    a = np.exp(-dt / 2400.0); z = np.zeros(n); e = rng.standard_normal(n)
    for i in range(1, n): z[i] = a * z[i - 1] + np.sqrt(1 - a * a) * e[i]
    k = np.clip(1.0 - cloud * (0.5 + 0.5 * np.tanh(1.3 * z)) * 1.6, 0.12, 1.0)
    G = 950.0 * sun * k * solar
    Tamb = Tmean + Tswing * np.sin(2 * np.pi * (t - 9.0) / 24.0)
    work = ((t >= 7) & (t < 17)).astype(float)
    pulses = np.zeros(n)
    for h0 in range(7, 17):                      # one delivery or handling event per hour
        w = np.exp(rng.normal(0.0, dvar)); i0 = int((h0 + rng.uniform(0.0, 0.6)) * 3600 / dt)
        pulses[i0:i0 + int(1500 / dt)] += 3.4 * w
    Q = demand * (1.0 + work * 0.9 + pulses * 1.0)
    return dict(t=t, G=G, Tamb=Tamb, Qproc=Q, dt=dt)


def _fit(perf, circuit, Tmed, Tamb, avail, pl, p_fixed):
    """Largest speed in S_GRID (<= cap) whose total electric draw fits in `avail` kW; None if none."""
    ok = None
    rows = perf.curve(circuit, Tmed, Tamb, S_GRID, pl.eff)
    for s, r in zip(S_GRID, rows):
        if s <= pl.cap + 1e-9 and r[1] + r[3] + p_fixed <= avail: ok = s
    return ok


def decide(policy, st, inp, pl, perf, pv_ac):
    """Return (circuit, speed) or (None, 0). st: Ts, f, on, circ, speed, t_on, t_off."""
    Ts, f, on = st["Ts"], st["f"], st["on"]
    cap = pl.cap; sg = min(0.6, cap)
    if policy == "fixed":
        if on: run = not (Ts <= pl.T_set - 1.0)
        else: run = Ts >= pl.T_set + 1.0
        want = (CIRC_ROOM, cap) if run else (None, 0.0)
    else:
        p_fix = pl.P_bms + pl.P_evfan
        s1 = _fit(perf, CIRC_ROOM, Ts, inp["Tamb"], pv_ac, pl, p_fix)
        want = (None, 0.0)
        have_store = policy == "storage" and pl.store_kwh > 0 and pl.m_store
        if s1 is not None:                       # solar surplus
            s2 = _fit(perf, CIRC_STORE, pl.T_pcm, inp["Tamb"], pv_ac, pl, pl.P_bms + pl.P_pump) if have_store else None
            if have_store and s2 is not None and (Ts < pl.T_set + 1.0 or not pl.m_evap) and f < 0.98:
                want = (CIRC_STORE, s2)
            elif Ts > (pl.T_lo if on else pl.T_lo + 0.7):
                want = (CIRC_ROOM, s1)
        else:                                    # grid-backed recovery only
            store_ok = have_store and f > 0.03
            if Ts >= pl.T_hi - 0.2: want = (CIRC_ROOM, cap) if not store_ok or Ts >= pl.T_hi + 0.3 else (None, 0.0)
            elif not store_ok and (Ts >= pl.T_hi - 0.6 or (on and Ts > pl.T_hi - 1.4)): want = (CIRC_ROOM, sg)
    if on and st["t_on"] < pl.min_on and want[0] is None: want = (st["circ"], st["speed"])
    if (not on) and st["t_off"] < pl.min_off: want = (None, 0.0)
    return want


def simulate(policy, day, pl=Plant(), perf=None, Ts0=2.0, f0=0.3):
    dt = day["dt"]; n = len(day["t"])
    E_cap = max(pl.store_kwh, 1e-9) * 3600.0; UA_st = pl.UA_st_per_kwh * pl.store_kwh
    use_store = policy == "storage" and pl.store_kwh > 0 and pl.m_store
    st = dict(Ts=Ts0, f=f0 if use_store else 0.0, on=False, circ=0, speed=0.0, t_on=0.0, t_off=1e9)
    keys = "Ts f circ speed Qe Pel Pfan Paux Pv Pgrid Pexp Punsrv Pload Qload Qdis Qchg Qleak Te Tc Pe Pc h1 h2 h3 m T2 over".split()
    R = {k: np.zeros(n) for k in keys}; starts = 0
    for i in range(n):
        inp = dict(Tamb=day["Tamb"][i], G=day["G"][i], Q=day["Qproc"][i])
        pv = inverter(pv_dc(inp["G"], inp["Tamb"], pl), pl.P_inv) if (pl.m_pv and pl.m_inv) else 0.0
        circ, s = decide(policy, st, inp, pl, perf, pv)
        compok = pl.m_comp and pl.m_cond                       # interlocks: no compressor or no condenser = trip
        if circ == CIRC_ROOM and not (compok and pl.m_evap): circ = None
        if circ == CIRC_STORE and not (compok and use_store): circ = None
        if circ is not None and not pl.m_grid:                 # islanded: compressor may only run if PV covers it
            q = perf(circ, st["Ts"] if circ == CIRC_ROOM else pl.T_pcm, inp["Tamb"], s, pl.eff)
            if q[1] + q[3] + pl.P_bms + (pl.P_evfan if circ == CIRC_ROOM else pl.P_pump) > pv: circ = None
        on = circ is not None
        if on and not st["on"]: starts += 1
        if on:
            r = perf(circ, st["Ts"] if circ == CIRC_ROOM else pl.T_pcm, inp["Tamb"], s, pl.eff)
            Qe, Pel, Qc, Pfan, Te, Tc, Pe, Pc, h1, h2, h3, m, T2 = r
        else:
            Qe = Pel = Pfan = Te = Tc = Pe = Pc = h1 = h2 = h3 = m = T2 = 0.0; s = 0.0
        qdis = 0.0
        if use_store and st["f"] > 0.01 and st["Ts"] > pl.T_set:
            qdis = min(pl.Q_dis_max * min(1.0, max(0.0, (st["Ts"] - pl.T_set) / 1.5)), st["f"] * E_cap / dt)
        fan_on = (on and circ == CIRC_ROOM) or qdis > 0
        pump_on = (on and circ == CIRC_STORE) or qdis > 0
        Paux = pl.P_bms + (pl.P_evfan if fan_on else 0.0) + (pl.P_pump if pump_on else 0.0)
        Qload = pl.UA_env * (inp["Tamb"] - st["Ts"]) + inp["Q"] + (pl.P_evfan if fan_on else 0.0)
        Qroom = Qe if (on and circ == CIRC_ROOM) else 0.0
        Qchg = Qe if (on and circ == CIRC_STORE) else 0.0
        Qleak = UA_st * (st["Ts"] - pl.T_pcm) if use_store else 0.0
        Ptot = Pel + Pfan + Paux
        used = min(pv, Ptot)
        pgrid = Ptot - used if pl.m_grid else 0.0
        R["Ts"][i] = st["Ts"]; R["f"][i] = st["f"]; R["circ"][i] = 0 if not on else circ + 1; R["speed"][i] = s
        for k, v in zip("Qe Pel Pfan Te Tc Pe Pc h1 h2 h3 m T2".split(), (Qe, Pel, Pfan, Te, Tc, Pe, Pc, h1, h2, h3, m, T2)): R[k][i] = v
        R["Paux"][i] = Paux; R["Pv"][i] = pv; R["Pgrid"][i] = pgrid; R["Punsrv"][i] = Ptot - used - pgrid; R["Pexp"][i] = pv - used; R["Pload"][i] = Ptot
        R["Qload"][i] = Qload; R["Qdis"][i] = qdis; R["Qchg"][i] = Qchg; R["Qleak"][i] = Qleak
        st["Ts"] += (Qload - Qroom - qdis) * dt / pl.C_s
        if use_store:
            fn = st["f"] + (Qchg - qdis - Qleak) * dt / E_cap
            R["over"][i] = (fn - min(1.0, max(0.0, fn))) * E_cap          # kJ clipped by bounds (diagnostic)
            st["f"] = min(1.0, max(0.0, fn))
        if on:
            st["t_on"] = st["t_on"] + dt if st["on"] else dt; st["t_off"] = 0.0; st["circ"] = circ; st["speed"] = s
        else:
            st["t_off"] = st["t_off"] + dt if not st["on"] else dt; st["t_on"] = 0.0
        st["on"] = on
    R["t"] = day["t"]; R["Tamb"] = day["Tamb"]; R["G"] = day["G"]; R["price"] = np.array([tariff(h) for h in day["t"]])
    R["starts"] = starts; R["dt"] = dt; R["final"] = st
    return R


def metrics(R, pl=Plant()):
    h = R["dt"] / 3600.0
    E = lambda x: float(np.sum(x) * h)
    grid = E(R["Pgrid"]); load = E(R["Pload"]); used = load - grid - E(R["Punsrv"])
    cost = float(np.sum(R["Pgrid"] * R["price"]) * h - np.sum(R["Pexp"]) * h * pl.price_export)
    Qcool = E(R["Qe"] * (R["circ"] == 1)) + E(R["Qdis"])
    over = np.maximum(0.0, R["Ts"] - pl.T_hi); under = np.maximum(0.0, pl.T_lo - 0.5 - R["Ts"])
    runs = []; cur = 0
    for c in R["circ"] > 0:
        if c: cur += 1
        elif cur: runs.append(cur); cur = 0
    short = sum(1 for r in runs if r * R["dt"] < 600.0)
    return dict(
        E_load=load, E_comp=E(R["Pel"]), E_aux=E(R["Paux"] + R["Pfan"]), E_pv=E(R["Pv"]), E_pv_used=used, E_export=E(R["Pexp"]),
        E_grid=grid, E_unserved=E(R["Punsrv"]), cost=cost, peak_grid=float(R["Pgrid"].max()), solar_frac=used / load if load > 0 else 0.0,
        starts=int(R["starts"]), short_runs=short, runtime_h=float(np.sum(R["circ"] > 0) * h),
        degh_over=float(np.sum(over) * h), hours_over=float(np.sum(over > 0) * h), Ts_max=float(R["Ts"].max()), Ts_min=float(R["Ts"].min()),
        cop_comp=E(R["Qe"]) / max(E(R["Pel"]), 1e-9), Q_cool=Qcool, cop_sys=Qcool / max(E(R["Pel"] + R["Paux"] + R["Pfan"]), 1e-9),
        deficit_kwh=float(pl.C_s * max(0.0, R["Ts"].max() - pl.T_hi) / 3600.0),
    )
