// Browser/Node port of svcr/plant.py (same equations, same 120 s step). Verified against Python by web/parity.mjs.
(function (root) {
  // ---- port of svcr/cycle.py: lets the browser rebuild the performance map when module specs are edited ----
  function cycleTools(D) {
    const FL = D.fluid, poly = (c, x) => c.reduce((a, b) => a * x + b, 0);
    const psat = (T) => Math.exp(FL.antoine[0] - FL.antoine[1] / (T + 273.15 + FL.antoine[2])), hf = (T) => poly(FL.hf, T), hg = (T) => poly(FL.hg, T);
    const clip = (v, a, b) => Math.min(b, Math.max(a, v));
    function states(cy, Te, Tc, s, eff) {
      const Pe = psat(Te), Pc = psat(Tc), PR = Pc / Pe, T1 = Te + cy.superheat, h1 = hg(Te) + cy.cp_v * cy.superheat, ex = (cy.k_isen - 1) / cy.k_isen;
      const ws = cy.cp_v * (T1 + 273.15) * (Math.pow(PR, ex) - 1), eta = clip(clip(cy.eta_is0 - cy.eta_is_slope * (PR - 1), 0.5, 0.8) * eff, 0.35, 0.86), h2 = h1 + ws / eta, h3 = hf(Tc - cy.subcool);
      const rho1 = Pe * 100 / (cy.z_suct * cy.R * (T1 + 273.15)), etav = Math.max(0.2, 1 - cy.clearance * (Math.pow(PR, 1 / cy.k_isen) - 1)), m = etav * rho1 * cy.swept * s;
      const Wsh = m * (h2 - h1), x = clip(Wsh / cy.motor_rated, 0.1, 1), etam = 0.92 - 0.12 * (1 - x) * (1 - x), Pel = Wsh / (cy.eta_mech * etam * cy.eta_vfd);
      return { Qe: m * (h1 - h3), Pel, Qc: m * (h2 - h3), Pe, Pc, h1, h2, h3, m, T2: T1 + (h2 - h1) / cy.cp_v, Wsh };
    }
    const fanF = (cy, Qc) => clip(Qc / cy.Qc_rated, cy.fan_min, 1);
    function solve(cy, Tmed, Tamb, s, circuit, eff) {
      const UAe = circuit === 0 ? cy.UA_chamber : cy.UA_store; let Te = Tmed - 8, Tc = Math.max(Tamb + 10, cy.Tc_min);
      for (let i = 0; i < 300; i++) {
        const st = states(cy, Te, Tc, s, eff), f = fanF(cy, st.Qc), Ten = Math.max(cy.Te_min, Math.min(Tmed - 0.5, Tmed - st.Qe / UAe)), Tcn = Math.max(cy.Tc_min, Tamb + st.Qc / (cy.UA_cond0 * Math.sqrt(f)));
        if (Math.abs(Ten - Te) < 1e-9 && Math.abs(Tcn - Tc) < 1e-9) break; Te += 0.5 * (Ten - Te); Tc += 0.5 * (Tcn - Tc);
      }
      const st = states(cy, Te, Tc, s, eff), f = fanF(cy, st.Qc); st.Te = Te; st.Tc = Tc; st.Pfan = cy.fan_cond * f * f * f; return st;
    }
    function buildMap(cy) {
      const g = D.map.axes, out = new Float64Array(2 * g.Tmed.length * g.Tamb.length * g.speed.length * g.eff.length * 13); let o = 0;
      for (let c = 0; c < 2; c++) for (const Tm of g.Tmed) for (const Ta of g.Tamb) for (const s of g.speed) for (const e of g.eff) {
        const r = solve(cy, Tm, Ta, s, c, e); out.set([r.Qe, r.Pel, r.Qc, r.Pfan, r.Te, r.Tc, r.Pe, r.Pc, r.h1, r.h2, r.h3, r.m, r.T2], o); o += 13;
      }
      return out;
    }
    return { states, solve, buildMap, psat };
  }
  const S_GRID = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  function make(D) {
    let T = D.map.data; const ax = D.map.axes, NC = 13, ok = (v) => v !== false;
    const dims = [ax.Tmed.length, ax.Tamb.length, ax.speed.length, ax.eff.length];
    const stride = [dims[1] * dims[2] * dims[3] * NC, dims[2] * dims[3] * NC, dims[3] * NC, NC];
    const cstride = dims[0] * stride[0];
    const axes = [ax.Tmed, ax.Tamb, ax.speed, ax.eff];
    const out = new Float64Array(NC);
    function interp(c, a, b, s, e) {            // multilinear, inputs clamped to the grid
      const x = [a, b, s, e], i0 = [], w = [];
      for (let d = 0; d < 4; d++) {
        const A = axes[d], lo = A[0], st = A[1] - A[0], n = A.length;
        let v = Math.min(A[n - 1], Math.max(lo, x[d])), i = Math.min(n - 2, Math.floor((v - lo) / st + 1e-12));
        i0.push(i); w.push((v - lo) / st - i);
      }
      out.fill(0);
      for (let m = 0; m < 16; m++) {
        let wt = 1, off = c * cstride;
        for (let d = 0; d < 4; d++) { const hi = (m >> d) & 1; wt *= hi ? w[d] : 1 - w[d]; off += (i0[d] + hi) * stride[d]; }
        if (wt === 0) continue;
        for (let k = 0; k < NC; k++) out[k] += wt * T[off + k];
      }
      return Array.from(out);
    }
    const tariff = (h) => { h = ((h % 24) + 24) % 24; return (h < 6 || h >= 22) ? 0.10 : (h >= 17 && h < 21 ? 0.30 : 0.16); };
    const inverter = (p, r) => { const l = 0.01 * r + 0.02 * p + 0.025 * p * p / r; return p > l ? Math.min(r, Math.max(0, p - l)) : 0; };
    const pvdc = (G, Ta, pl) => pl.P_pv_kwp * (G / 1000) * (1 - 0.004 * (Ta + 0.031 * G - 25));
    function fit(c, Tm, Ta, avail, pl, pfix) {
      let ok = null;
      for (const s of S_GRID) { if (s > pl.cap + 1e-9) continue; const r = interp(c, Tm, Ta, s, pl.eff); if (r[1] + r[3] + pfix <= avail) ok = s; }
      return ok;
    }
    function decide(policy, st, inp, pl, pv) {
      const Ts = st.Ts, f = st.f, on = st.on, cap = pl.cap, sg = Math.min(0.6, cap); let want = [null, 0];
      if (policy === 'fixed') { const run = on ? !(Ts <= pl.T_set - 1) : Ts >= pl.T_set + 1; want = run ? [0, cap] : [null, 0]; }
      else {
        const pfix = pl.P_bms + pl.P_evfan, s1 = fit(0, Ts, inp.Tamb, pv, pl, pfix), haveStore = policy === 'storage' && pl.store_kwh > 0 && ok(pl.m_store);
        if (s1 !== null) {
          const s2 = haveStore ? fit(1, pl.T_pcm, inp.Tamb, pv, pl, pl.P_bms + pl.P_pump) : null;
          if (haveStore && s2 !== null && (Ts < pl.T_set + 1 || pl.m_evap === false) && f < 0.98) want = [1, s2];
          else if (Ts > (on ? pl.T_lo : pl.T_lo + 0.7)) want = [0, s1];
        } else {
          const storeOk = haveStore && f > 0.03;
          if (Ts >= pl.T_hi - 0.2) want = (!storeOk || Ts >= pl.T_hi + 0.3) ? [0, cap] : [null, 0];
          else if (!storeOk && (Ts >= pl.T_hi - 0.6 || (on && Ts > pl.T_hi - 1.4))) want = [0, sg];
        }
      }
      if (on && st.t_on < pl.min_on && want[0] === null) want = [st.circ, st.speed];
      if (!on && st.t_off < pl.min_off) want = [null, 0];
      return want;
    }
    function newState(pl, policy, Ts0 = 2, f0 = 0.3) { return { Ts: Ts0, f: policy === 'storage' && pl.store_kwh > 0 ? f0 : 0, on: false, circ: 0, speed: 0, t_on: 0, t_off: 1e9, starts: 0 }; }
    function step(policy, st, inp, pl, dt) {           // inp: {G, Tamb, Q}; mutates st; returns the record
      const Ecap = Math.max(pl.store_kwh, 1e-9) * 3600, UAst = pl.UA_st_per_kwh * pl.store_kwh, useStore = policy === 'storage' && pl.store_kwh > 0 && ok(pl.m_store);
      const pv = ok(pl.m_pv) && ok(pl.m_inv) ? inverter(pvdc(inp.G, inp.Tamb, pl), pl.P_inv) : 0;
      let [circ, s] = decide(policy, st, inp, pl, pv);
      const compok = ok(pl.m_comp) && ok(pl.m_cond);              // interlocks: no compressor or condenser = trip
      if (circ === 0 && !(compok && ok(pl.m_evap))) circ = null;
      if (circ === 1 && !(compok && useStore)) circ = null;
      if (circ !== null && pl.m_grid === false) { const q = interp(circ, circ === 0 ? st.Ts : pl.T_pcm, inp.Tamb, s, pl.eff); if (q[1] + q[3] + pl.P_bms + (circ === 0 ? pl.P_evfan : pl.P_pump) > pv) circ = null; }
      const on = circ !== null;
      if (on && !st.on) st.starts++;
      let r = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      if (on) r = interp(circ, circ === 0 ? st.Ts : pl.T_pcm, inp.Tamb, s, pl.eff); else s = 0;
      const [Qe, Pel, Qc, Pfan, Te, Tc, Pe, Pc, h1, h2, h3, m, T2] = r;
      let qdis = 0;
      if (useStore && st.f > 0.01 && st.Ts > pl.T_set) qdis = Math.min(pl.Q_dis_max * Math.min(1, Math.max(0, (st.Ts - pl.T_set) / 1.5)), st.f * Ecap / dt);
      const fanOn = (on && circ === 0) || qdis > 0, pumpOn = (on && circ === 1) || qdis > 0;
      const Paux = pl.P_bms + (fanOn ? pl.P_evfan : 0) + (pumpOn ? pl.P_pump : 0);
      const Qload = pl.UA_env * (inp.Tamb - st.Ts) + inp.Q + (fanOn ? pl.P_evfan : 0);
      const Qroom = on && circ === 0 ? Qe : 0, Qchg = on && circ === 1 ? Qe : 0, Qleak = useStore ? UAst * (st.Ts - pl.T_pcm) : 0;
      const Ptot = Pel + Pfan + Paux, used = Math.min(pv, Ptot), pgrid = pl.m_grid === false ? 0 : Ptot - used;
      const rec = { Ts: st.Ts, f: st.f, circ: on ? circ + 1 : 0, speed: s, Qe, Pel, Pfan, Paux, Pv: pv, Pgrid: pgrid, Punsrv: Ptot - used - pgrid, Pexp: pv - used, Pload: Ptot, Qload, Qdis: qdis, Qchg, Qleak, Te, Tc, Pe, Pc, h1, h2, h3, m, T2, Qc };
      st.Ts += (Qload - Qroom - qdis) * dt / pl.C_s;
      if (useStore) { const fn = st.f + (Qchg - qdis - Qleak) * dt / Ecap; st.f = Math.min(1, Math.max(0, fn)); }
      if (on) { st.t_on = st.on ? st.t_on + dt : dt; st.t_off = 0; st.circ = circ; st.speed = s; } else { st.t_off = !st.on ? st.t_off + dt : dt; st.t_on = 0; }
      st.on = on; return rec;
    }
    return { interp, step, newState, decide, tariff, inverter, pvdc, S_GRID, setMap: (a) => { T = a; }, tools: cycleTools(D) };
  }
  root.SVCR = { make }; if (typeof module !== 'undefined') module.exports = root.SVCR;
})(typeof window !== 'undefined' ? window : globalThis);
