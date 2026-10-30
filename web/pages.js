// ---- module pages: routing, live context, mechanism animation, plots, live equation values ----
const fl = DATA.fluid, polyv = (p, x) => p.reduce((a, c) => a * x + c, 0), hfT = (T) => polyv(fl.hf, T), hgT = (T) => polyv(fl.hg, T);
const { M3, M5, M6, M7, M8 } = LIB.PG; const PG = {}; let activePage = "overview";
const secs = $$("[data-page]"), navb = $$("[data-nav]");
function route() {
  const id = (location.hash || "#overview").slice(1); activePage = secs.some((s) => s.dataset.page === id) ? id : "overview";
  secs.forEach((s) => (s.hidden = s.dataset.page !== activePage)); navb.forEach((b) => b.setAttribute("aria-current", String(b.dataset.nav === activePage)));
  if (PG[activePage] && !PG[activePage].ready) { PG[activePage].init?.(); PG[activePage].ready = true; } window.scrollTo({ top: 0 }); kick();
}
window.addEventListener("hashchange", route);
const S1 = (pg, n) => $(`[data-page="${pg}"] [data-d="${n}"]`), SA = (pg, n) => $$(`[data-page="${pg}"] [data-d="${n}"]`), AP = (pg) => (p) => iso(p, PJS[pg]);
const nf = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : "–"), fm = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d).replace("-", "−") : "–");
function bladesP(pg, cx, cy, cz, ang, n, r0, r1, vertical) {
  const A2 = AP(pg); let d = "";
  for (let b = 0; b < n; b++) { const a = ang + (b * 2 * Math.PI) / n, pt = (r, da) => { const u = r * Math.cos(a + da), v = r * Math.sin(a + da); return A2(vertical ? [cx + u, cy, cz + v] : [cx + u, cy + v, cz]).join(" "); }; d += `M${pt(r0, -0.2)}L${pt(r1, 0)}L${pt(r1, 0.42)}L${pt(r0, 0.3)}Z`; }
  return `<path class="iso-fill" d="${d}"/><path class="iso-line" data-tone="mid" d="${d}" style="stroke-width:.7"/>`;
}
function flowSet(pg, name, on, power, rev) { SA(pg, name).forEach((e) => flowStyle(e, on, power, rev)); }
function xy(el, curves, o, marks = []) {   // generic plot: curves [{pts,c,w,dash}], axes in data units
  const X = (v) => 34 + (256 * (v - o.x0)) / (o.x1 - o.x0), Y = (v) => 128 - (116 * (v - o.y0)) / (o.y1 - o.y0); let h = "";
  for (let g = 0; g <= 4; g++) { const v = o.y0 + ((o.y1 - o.y0) * g) / 4; h += `<path class="ax" d="M34 ${Y(v)}H290"/><text x="31" y="${Y(v) + 2.5}" text-anchor="end">${v.toFixed(o.yd ?? 0)}</text>`; }
  for (let g = 0; g <= 4; g++) { const v = o.x0 + ((o.x1 - o.x0) * g) / 4; h += `<text x="${X(v)}" y="143" text-anchor="middle">${v.toFixed(o.xd ?? 0)}</text>`; }
  curves.forEach((cv) => { h += `<path d="M${cv.pts.map((p) => X(p[0]).toFixed(1) + " " + Y(clamp(p[1], o.y0, o.y1)).toFixed(1)).join("L")}" fill="none" style="stroke:var(--anatomy-${cv.c});stroke-width:${cv.w || 1.2};${cv.dash ? "stroke-dasharray:3 2;" : ""}"/>`; });
  marks.forEach((m) => { h += `<circle cx="${X(m.x)}" cy="${Y(clamp(m.y, o.y0, o.y1))}" r="2.6" style="fill:var(--anatomy-${m.c || "lit"})"/>`; if (m.t) h += `<text x="${X(m.x) + 4}" y="${Y(clamp(m.y, o.y0, o.y1)) - 4}" style="fill:var(--anatomy-hi)">${m.t}</text>`; });
  if (o.lab) h += `<text x="290" y="8" text-anchor="end">${o.lab}</text>`; el.innerHTML = h;
}
const plotEl = (pg, n) => $(`[data-page="${pg}"] [data-plot2="${n}"]`);

// ---------- live context ----------
function ctxOf(r) {
  const c = { ...r }, on = r.circ > 0, inp = r.inp; c.on = on; c.G = inp.G; c.Tamb = inp.Tamb; c.Qproc = inp.Q;
  c.Wsh = on ? r.Qc - r.Qe : 0; c.PR = on ? r.Pc / r.Pe : NaN; c.cop = on ? r.Qe / r.Pel : NaN;
  c.eta0 = clamp(CY.eta_is0 - CY.eta_is_slope * (c.PR - 1), 0.5, 0.8); c.eta = clamp(c.eta0 * pl.eff, 0.35, 0.86);
  c.etav = Math.max(0.2, 1 - CY.clearance * (Math.pow(c.PR, 1 / CY.k_isen) - 1)); c.x = clamp(c.Wsh / CY.motor_rated, 0.1, 1); c.etam = 0.92 - 0.12 * (1 - c.x) ** 2;
  c.ws = on ? r.m ? c.Wsh / r.m * c.eta : NaN : NaN;   // isentropic work per kg
  c.Tcell = c.Tamb + 0.031 * c.G; c.Pdc = mst.pv === "armed" ? sim.pvdc(c.G, c.Tamb, pl) : 0; c.Pac = r.Pv; c.einv = c.Pdc > 0.05 ? c.Pac / c.Pdc : NaN;
  c.fan = on ? clamp(r.Qc / CY.Qc_rated, CY.fan_min, 1) : 0; c.UAc = CY.UA_cond0 * Math.sqrt(c.fan);
  if (on) { const hg = hgT(r.Tc), hf = hfT(r.Tc); c.q1 = r.m * (r.h2 - hg); c.q2 = r.m * (hg - hf); c.q3 = r.m * (hf - r.h3); }
  c.x4 = on ? (r.h3 - hfT(r.Te)) / (hgT(r.Te) - hfT(r.Te)) : NaN; c.rhol = 1295 - 3.7 * (r.Tc ?? 40); c.dp = on ? (r.Pc - r.Pe) * 1e5 : 0;
  c.Aor = on && c.dp > 0 ? r.m / (0.6 * Math.sqrt(2 * c.rhol * c.dp)) * 1e6 : NaN;
  c.qenv = pl.UA_env * (c.Tamb - r.Ts); c.fanheat = r.circ === 1 || r.Qdis > 0 ? pl.P_evfan : 0; c.qroom = r.circ === 1 ? r.Qe : 0; c.dTdt = (r.Qload - c.qroom - r.Qdis) / pl.C_s * 3600;
  c.Ecap = pl.store_kwh; c.ice = c.Ecap * 3600 / 260 * r.f; c.tau = pl.C_s / pl.UA_env / 3600;
  c.vdot_air = 3.2; c.dTair = r.circ === 1 ? r.Qe / (1.2 * 1.006 * c.vdot_air) : 0; return c;
}
const E = DATA.experiments, V = {};   // live equation values, keyed by data-eq
// ---------- shared drawing of live equation text ----------
function fillEq(pg, c) { $$(`[data-page="${pg}"] [data-eq]`).forEach((e) => { const f = V[e.dataset.eq]; if (f) { const t = f(c); if (e.textContent !== t) e.textContent = t; } }); }
function fillLive(pg, c) { $$(`[data-page="${pg}"] [data-lv]`).forEach((e) => { const f = LV[e.dataset.lv]; if (f) { const t = f(c); if (e.textContent !== t) e.textContent = t; } }); }
const LV = {};
const reg = (o, p) => Object.assign(o, p);

// ---------- M1 PV ----------
reg(V, { pv1: (c) => `T_cell = ${nf(c.Tamb)} + 0.031 × ${nf(c.G, 0)} = ${nf(c.Tcell)} °C`, pv2: (c) => `P_dc = ${pl.P_pv_kwp} × ${nf(c.G / 1000, 3)} × (1 − 0.004 × ${nf(c.Tcell - 25)}) = ${nf(c.Pdc, 2)} kW`, pv3: (c) => `V_oc,array ≈ ${nf(pvCurve(c).voc, 0)} V,  I_sc ≈ ${nf(pvCurve(c).isc, 1)} A,  FF = ${nf(pvCurve(c).ff, 2)}`, pv4: (c) => `P_ac = ${nf(c.Pdc, 2)} − (0.01·10 + 0.02·${nf(c.Pdc, 2)} + 0.025·${nf(c.Pdc, 2)}²/10) = ${nf(c.Pac, 2)} kW`, pv5: (c) => `Energy so far today: ${nf(tot.pv, 1)} kWh AC` });
reg(LV, { pv_g: (c) => nf(c.G, 0) + " W/m²", pv_t: (c) => nf(c.Tcell) + " °C", pv_pdc: (c) => nf(c.Pdc, 2) + " kW", pv_pac: (c) => nf(c.Pac, 2) + " kW", pv_e: (c) => nf(tot.pv, 1) + " kWh", pv_cf: (c) => nf(c.Pac / (pl.P_pv_kwp || 1) * 100, 0) + " % of kWp" });
function pvCurve(c) {
  const Ns = 12, ph = 60 * 1.2 * 0.02585 * (c.Tcell + 273.15) / 298.15, voc = Math.max(1, Ns * (49 * (1 - 0.0027 * (c.Tcell - 25)) + (c.G > 5 ? ph * Math.log(Math.max(c.G, 1) / 1000) : -20))), a = voc * 0.052;
  const pts = []; let pm = 0, vm = 0, im = 0; for (let i = 0; i <= 60; i++) { const v = (voc * i) / 60, cur = (1 - Math.exp((v - voc) / a)) / (1 - Math.exp(-voc / a)); pts.push([v, cur]); if (v * cur > pm) { pm = v * cur; vm = v; im = cur; } }
  const sc = pm > 0 ? (c.Pdc * 1000) / pm : 0; return { pts: pts.map(([v, i]) => [v, i * sc]), voc, isc: sc, vmp: vm, imp: im * sc, ff: pm / voc, pm: c.Pdc * 1000 };
}
PG.pv = { upd(c) {
  const g = clamp(c.G / 1000, 0, 1.1); SA("pv", "ray").forEach((e) => { e.style.opacity = g < 0.03 ? 0 : 0.25 + 0.75 * Math.min(1, g); e.style.animationDuration = "900ms"; });
  SA("pv", "cur").forEach((e) => e.querySelectorAll("path").forEach((p) => flowStyle(p, c.Pdc > 0.05, c.Pdc, false)));
  const cv = pvCurve(c), el = plotEl("pv", "iv"), pc = cv.pts.map(([v, i]) => [v, (v * i) / 1000]);
  xy(el, [{ pts: cv.pts, c: "blue", w: 1.5 }], { x0: 0, x1: 700, y0: 0, y1: 40, lab: "I (A) vs V (array, 2 strings)" }, [{ x: cv.vmp, y: cv.imp, t: "MPP", c: "lit" }]);
  xy(plotEl("pv", "pv"), [{ pts: pc, c: "red", w: 1.5 }], { x0: 0, x1: 700, y0: 0, y1: 14, lab: "P (kW) vs V" }, [{ x: cv.vmp, y: cv.pm / 1000, c: "lit", t: nf(cv.pm / 1000, 1) + " kW" }]);
} };
// ---------- M2 inverter ----------
const invEff = (p) => (p > 0.01 ? sim.inverter(p, pl.P_inv) / p : 0);
let pwmPh = 0;
reg(V, { in1: (c) => `loss = 0.01·${pl.P_inv} + 0.02·${nf(c.Pdc, 2)} + 0.025·${nf(c.Pdc, 2)}²/${pl.P_inv} = ${nf(c.Pdc - c.Pac, 2)} kW`, in2: (c) => `η = ${nf(c.Pac, 2)} / ${nf(c.Pdc, 2)} = ${nf(c.einv * 100, 1)} %`, in3: (c) => `Î_phase = √2 · ${nf(c.Pac, 2)} kW / (3 · 230 V) = ${nf(Math.SQRT2 * c.Pac * 1000 / 690, 1)} A (peak)`, in4: (c) => `m_a = V̂_ph / (V_dc/2) = 325 / 350 = 0.93 (V_dc regulated at 700 V)`, in5: (c) => `f_res = 1/(2π) √((L₁+L₂)/(L₁L₂C)) ≈ 2.7 kHz, f_sw = 8 kHz` });
reg(LV, { in_pdc: (c) => nf(c.Pdc, 2) + " kW", in_pac: (c) => nf(c.Pac, 2) + " kW", in_eta: (c) => nf(c.einv * 100, 1) + " %", in_ratio: (c) => nf(pl.P_pv_kwp / pl.P_inv, 2), in_clip: (c) => (c.Pac >= pl.P_inv - 1e-6 ? "clipping" : "no clipping") });
PG.inv = { fa: 0, upd(c, dt) {
  const A2 = AP("inv"), on = c.Pac > 0.05; this.fa += (on ? 4 + 8 * c.Pac / pl.P_inv : 0) * dt; const f = S1("inv", "fan"); if (f) f.innerHTML = bladesP("inv", 0, 20.6, 20, this.fa, 5, 2.4, 10.5, true);
  const led = S1("inv", "led"); if (led) led.innerHTML = [[14, "lit", on], [24, "mid", mst.grid === "armed"], [34, "red", mst.pv !== "armed"]].map(([x, t, o]) => { const q = A2([x - 30, 12, 158]); return `<circle cx="${q[0]}" cy="${q[1]}" r="2" style="fill:var(--anatomy-${t === "lit" ? "lit" : t});opacity:${o ? 1 : 0.15}"/>`; }).join("");
  pwmPh += dt * 0.5; const N = 200, Ar = 0.93, ref = (t) => Ar * Math.sin(2 * Math.PI * (t * 2 + pwmPh)), car = (t) => { const x = (t * 24) % 1; return 1 - 4 * Math.abs(x - 0.5) + 1 - 1 === 0 ? 0 : (x < 0.5 ? 4 * x - 1 : 3 - 4 * x); };
  const R = [], Cc = [], Po = []; for (let i = 0; i <= N; i++) { const t = i / N; R.push([t, ref(t)]); Cc.push([t, car(t) * 0.999]); Po.push([t, ref(t) > car(t) ? 1 : -1]); }
  xy(plotEl("inv", "pwm"), [{ pts: Po, c: "lit", w: 1 }, { pts: Cc, c: "faint", w: 0.8 }, { pts: R, c: "red", w: 1.4 }], { x0: 0, x1: 1, y0: -1.2, y1: 1.2, yd: 1, xd: 1, lab: "sine-triangle PWM (24 carriers drawn per 2 cycles)" });
  const ef = []; for (let p = 0.2; p <= pl.P_inv; p += 0.2) ef.push([p, invEff(p) * 100]); xy(plotEl("inv", "eff"), [{ pts: ef, c: "blue", w: 1.5 }], { x0: 0, x1: pl.P_inv, y0: 80, y1: 100, lab: "efficiency % vs DC power kW" }, c.Pdc > 0.05 ? [{ x: Math.min(c.Pdc, pl.P_inv), y: invEff(Math.min(c.Pdc, pl.P_inv)) * 100, t: "now" }] : []);
} };
// ---------- M3 compressor ----------
const CR = { phi: 0 };
function indicator(PR, cl, k, N = 180) {
  const xe = cl * (Math.pow(PR, 1 / k) - 1), xd = (cl + 1) / Math.pow(PR, 1 / k) - cl, pts = [], st = [];
  for (let i = 0; i <= N; i++) {
    const phi = (i / N) * 2 * Math.PI, x = (1 - Math.cos(phi)) / 2, V = cl + x; let p, sIn = false, sOut = false;
    if (phi <= Math.PI) { if (x < xe) p = PR * Math.pow(cl / V, k); else { p = 1; sIn = true; } } else { if (x > xd) p = Math.pow((cl + 1) / V, k); else { p = PR; sOut = true; } }
    pts.push([V, p]); st.push([sIn, sOut, p]);
  }
  return { pts, st, xe, xd };
}
reg(V, { cm1: (c) => `PR = ${nf(c.Pc, 2)} / ${nf(c.Pe, 2)} = ${nf(c.PR, 2)}`, cm2: (c) => `η_v = 1 − ${CY.clearance}·(${nf(c.PR, 2)}^(1/${CY.k_isen}) − 1) = ${nf(c.etav, 3)}`, cm3: (c) => `ṁ = ${nf(c.etav, 3)} · ρ₁ · ${nf(CY.swept * 3600, 1)} m³/h · ${nf(c.speed, 2)} = ${nf((c.m || 0) * 1000, 1)} g/s`, cm4: (c) => `w_s = ${nf(CY.cp_v, 2)}·${nf(c.Te + 5 + 273.15, 1)}·(${nf(c.PR, 2)}^${nf((CY.k_isen - 1) / CY.k_isen, 4)} − 1) = ${nf(c.ws, 1)} kJ/kg`, cm5: (c) => `η_is = 0.80 − 0.045·(${nf(c.PR, 2)} − 1) → ${nf(c.eta0, 3)} × ${nf(pl.eff, 2)} = ${nf(c.eta, 3)}`, cm6: (c) => `Ẇ_sh = ṁ (h₂ − h₁) = ${nf(c.m * 1000, 1)} g/s × ${nf(c.h2 - c.h1, 1)} kJ/kg = ${nf(c.Wsh, 2)} kW`, cm7: (c) => `P_el = ${nf(c.Wsh, 2)} / (${CY.eta_mech} × ${nf(c.etam, 3)} × ${CY.eta_vfd}) = ${nf(c.Pel, 2)} kW`, cm8: (c) => `Q̇_c = ${nf(c.Qe, 2)} + ${nf(c.Wsh, 2)} = ${nf(c.Qc, 2)} kW` });
reg(LV, { cm_pe: (c) => nf(c.Pe, 2) + " bar", cm_pc: (c) => nf(c.Pc, 2) + " bar", cm_pr: (c) => nf(c.PR, 2), cm_t2: (c) => nf(c.T2, 0) + " °C", cm_m: (c) => nf(c.m * 1000, 1) + " g/s", cm_w: (c) => nf(c.Wsh, 2) + " kW", cm_pel: (c) => nf(c.Pel, 2) + " kW", cm_cop: (c) => nf(c.cop, 2), cm_rpm: (c) => nf(c.speed * 1500 * 0.97, 0) + " rpm" });
PG.comp = { upd(c, dt) {
  const A2 = AP("comp"), { Rc, L, zc } = M3, on = c.on; if (c.run) CR.phi += c.speed * 2.6 * dt; const phi = CR.phi % (2 * Math.PI);
  const PR = on ? c.PR : Math.max(1.05, (disp.Pc / disp.Pe) || 3), ind = indicator(PR, CY.clearance, CY.k_isen), idx = Math.round((phi / (2 * Math.PI)) * 180), stt = ind.st[Math.min(180, idx)];
  const yc = Rc * Math.sin(phi), zcp = zc + Rc * Math.cos(phi), zp = zcp + Math.sqrt(L * L - yc * yc);
  S1("comp", "piston").innerHTML = solidSvg(cylinder(0, 0, 13.4, zp - 10, 18, PJS.comp, 28), { tone: "hi" }) + lineSvg(ring(0, 0, 13.4, zp + 6, PJS.comp, 28) + ring(0, 0, 13.4, zp + 3, PJS.comp, 28), { tone: "faint" });
  S1("comp", "rod").innerHTML = lineSvg(segment([0, 0, zp - 4], [0, yc, zcp], PJS.comp), { tone: "mid", style: "stroke-width:4.5;stroke-linecap:round" });
  S1("comp", "crank").innerHTML = lineSvg(segment([0, 0, zc], [0, yc, zcp], PJS.comp), { tone: "hi", style: "stroke-width:6;stroke-linecap:round" }) + `<circle cx="${A2([0, yc, zcp])[0]}" cy="${A2([0, yc, zcp])[1]}" r="3.4" style="fill:var(--anatomy-lit)"/>`;
  const rs = stt[0] ? 5 : 0, rd = stt[1] ? 5 : 0, reed = (x, lift, hinge) => lineSvg(segment([x - 7 * hinge, 0, 96], [x + 7 * hinge, 0, 96 + lift], PJS.comp), { tone: "lit", style: "stroke-width:2.4;stroke-linecap:round" });
  S1("comp", "reedS").innerHTML = reed(-9, rs, 1); S1("comp", "reedD").innerHTML = reed(9, rd, 1);
  let sd = ""; for (let j = 0; j < 8; j++) { const a = CR.phi + (j * 2 * Math.PI) / 8, cs = Math.cos(a), sn = Math.sin(a); if (cs * 0.59 * 0.87 + sn * 0.5 < 0.1) continue; sd += `M${A2([-53, 8.4 * cs, 30 + 8.4 * sn]).join(" ")}L${A2([-37, 8.4 * cs, 30 + 8.4 * sn]).join(" ")}`; }
  S1("comp", "shaft").innerHTML = `<path class="iso-line" data-tone="${on ? "lit" : "lo"}" d="${sd}"/>`;
  flowSet("comp", "fs", c.run, c.m * 30, false); flowSet("comp", "fd", c.run, c.m * 30, false);
  const loop = ind.pts.map(([V, p]) => [V / (1 + CY.clearance), p]); xy(plotEl("comp", "pv"), [{ pts: loop, c: "blue", w: 1.6 }], { x0: 0, x1: 1.1, y0: 0, y1: Math.max(4, Math.ceil(PR)) + 0.5, yd: 0, xd: 1, lab: "p/p_e vs V/V_d (indicator diagram)" }, [{ x: (CY.clearance + (1 - Math.cos(phi)) / 2) / (1 + CY.clearance), y: stt[2], c: "lit", t: stt[0] ? "suction" : stt[1] ? "discharge" : phi < Math.PI ? "re-expansion" : "compression" }]);
  let w = 0; for (let i = 1; i < ind.pts.length; i++) w += (ind.pts[i][0] - ind.pts[i - 1][0]) * (ind.pts[i][1] + ind.pts[i - 1][1]) / 2; c.__wind = Math.abs(w);
  const pind = on ? Math.abs(w) * c.Pe * 100 * CY.swept * c.speed : NaN; LV.cm_pind = () => nf(pind, 2) + " kW"; LV.cm_pid = () => nf(c.Wsh * c.eta, 2) + " kW";
  xy(plotEl("comp", "ph"), [{ pts: DATA.dome.hf.map((h, i) => [h, DATA.dome.P[i]]).concat(DATA.dome.hg.map((h, i) => [h, DATA.dome.P[i]]).reverse()), c: "lo", w: 0.9 }, { pts: [[c.h1, c.Pe], [c.h2, c.Pc], [c.h3, c.Pc], [c.h3, c.Pe], [c.h1, c.Pe]], c: "red", w: 1.5 }], { x0: 150, x1: 450, y0: 0, y1: 20, lab: "p (bar) vs h (kJ/kg)" });
} };
// ---------- M4 VFD ----------
reg(V, { vf1: (c) => `n_sync = 120·f/p = 120·${nf(c.speed * 50, 1)}/4 = ${nf(c.speed * 1500, 0)} rpm,  n = n_sync(1 − s) ≈ ${nf(c.speed * 1500 * 0.97, 0)} rpm`, vf2: (c) => `V = V_n·f/f_n = 400 · ${nf(c.speed, 2)} = ${nf(Math.max(40, 400 * c.speed), 0)} V (boost 10 % below 15 Hz)`, vf3: (c) => `V_dc = √2·400 = 566 V (uncontrolled rectifier), P_in = ${nf(c.Pel, 2)} kW`, vf4: (c) => `speed = max{ s ∈ {0.3…${pl.cap}} : P_el(s)+aux ≤ P_pv } = ${c.circ > 0 ? nf(c.speed, 1) : "off"}`, vf5: (c) => `ṁ ∝ n ⇒ Q̇_e ∝ s at fixed T_e, T_c: ${nf(c.Qe, 2)} kW at s = ${nf(c.speed, 2)}` });
reg(LV, { vf_f: (c) => nf(c.speed * 50, 1) + " Hz", vf_v: (c) => nf(Math.max(40, 400 * c.speed), 0) + " V", vf_n: (c) => nf(c.speed * 1500 * 0.97, 0) + " rpm", vf_p: (c) => nf(c.Pel, 2) + " kW", vf_state: (c) => (c.circ === 0 ? "idle" : c.circ === 1 ? "room cooling" : "charging store") });
PG.vfd = { upd(c) {
  const A2 = AP("vfd"), fq = S1("vfd", "keypad"); if (fq) fq.innerHTML = faceTextSvg(sideMatrix([60, 27.9], 156, PJS.vfd, "right"), c.on ? nf(c.speed * 50, 1) + " Hz" : "STOP", { size: 6, tone: "lit", anchor: "middle" });
  const pw = c.run ? c.Pel : 0; ["w_in", "w_ac", "w_dc", "w_out"].forEach((n) => flowSet("vfd", n, pw > 0.05, pw, false));
  xy(plotEl("vfd", "vf"), [{ pts: [[0, 40], [15, 80], [50, 400], [60, 400]], c: "blue", w: 1.5 }], { x0: 0, x1: 60, y0: 0, y1: 450, lab: "V (volts) vs f (Hz)" }, c.on ? [{ x: c.speed * 50, y: Math.max(40, 400 * c.speed), t: nf(c.speed * 50, 0) + " Hz" }] : []);
  const st = $$(`[data-page="vfd"] [data-st]`); st.forEach((e) => e.classList.toggle("on", e.dataset.st === (c.circ === 0 ? "idle" : c.circ === 1 ? "room" : "store")));
} };
// ---------- M5 condenser ----------
reg(V, { cd1: (c) => `Q̇_c = ṁ (h₂ − h₃) = ${nf(c.m * 1000, 1)} g/s × ${nf(c.h2 - c.h3, 1)} kJ/kg = ${nf(c.Qc, 2)} kW`, cd2: (c) => `Q̇_c = UA (T_c − T_amb): ${nf(c.UAc, 2)} kW/K × (${nf(c.Tc, 1)} − ${nf(c.Tamb, 1)}) = ${nf(c.UAc * (c.Tc - c.Tamb), 2)} kW`, cd3: (c) => `f_fan = clip(Q̇_c/${CY.Qc_rated}, 0.35, 1) = ${nf(c.fan, 2)},  UA = ${CY.UA_cond0}·f^½ = ${nf(c.UAc, 2)} kW/K`, cd4: (c) => `P_fan = ${CY.fan_cond}·f³ = ${nf(c.Pfan, 2)} kW`, cd5: (c) => `desuperheat ${nf(c.q1, 2)} kW (${nf(100 * c.q1 / c.Qc, 0)} %), condensing ${nf(c.q2, 2)} kW (${nf(100 * c.q2 / c.Qc, 0)} %), subcooling ${nf(c.q3, 2)} kW (${nf(100 * c.q3 / c.Qc, 0)} %)`, cd6: (c) => `T_c = max(${CY.Tc_min}, T_amb + Q̇_c/UA) = ${nf(c.Tc, 1)} °C → p_c = ${nf(c.Pc, 2)} bar` });
reg(LV, { cd_q: (c) => nf(c.Qc, 1) + " kW", cd_tc: (c) => nf(c.Tc, 1) + " °C", cd_pc: (c) => nf(c.Pc, 1) + " bar", cd_f: (c) => nf(c.fan * 100, 0) + " %", cd_pf: (c) => nf(c.Pfan, 2) + " kW", cd_t2: (c) => nf(c.T2, 0) + " °C" });
PG.cond = { fa: 0, upd(c, dt) {
  const A2 = AP("cond"), on = c.on; this.fa += (c.run ? c.fan * 9 : 0) * dt; S1("cond", "fan").innerHTML = bladesP("cond", 0, 0, 68, this.fa, 5, 3.5, 25, false);
  const n = 24; let n1 = 0, n2 = 0; if (on) { n1 = Math.max(1, Math.round(n * c.q1 / c.Qc)); n2 = Math.round(n * c.q2 / c.Qc); } const order = []; [...M5.rows].reverse().forEach((z, ri) => { const cols = ri % 2 ? [...M5.cols].reverse() : M5.cols; cols.forEach((y) => order.push([y, z])); });
  S1("cond", "tubes").innerHTML = order.map(([y, z], i) => { const zone = !on ? "idle" : i < n1 ? "hot" : i < n1 + n2 ? "cnd" : "sub"; return `<path class="iso-line zr z-${zone}" d="${sideRing([64, y, z], 3.5, "x", PJS.cond, 18)}"/>`; }).join("");
  const fa = c.run ? 0.4 + c.fan : 0; ["air_in", "air_out"].forEach((nm) => flowSet("cond", nm, c.run, fa * 2, false)); flowSet("cond", "in", c.run, c.m * 25, false); flowSet("cond", "out", c.run, c.m * 25, false);
  if (on) { const x1 = c.q1 / c.Qc, x2 = x1 + c.q2 / c.Qc, Tair2 = c.Tamb + c.Qc / (1.2 * 1.006 * 2.2 * c.fan); xy(plotEl("cond", "prof"), [{ pts: [[0, c.T2], [x1, c.Tc], [x2, c.Tc], [1, c.Tc - CY.subcool]], c: "red", w: 1.6 }, { pts: [[0, c.Tamb], [1, Tair2]], c: "blue", w: 1.4, dash: 1 }], { x0: 0, x1: 1, y0: 0, y1: Math.max(60, Math.ceil(c.T2 / 10) * 10), xd: 1, lab: "refrigerant (solid) and air (dashed) °C along the coil" }); }
} };
// ---------- M6 receiver + TXV ----------
reg(V, { rc1: (c) => `h₄ = h₃ = ${nf(c.h3, 1)} kJ/kg;  x₄ = (h₃ − h_f(T_e)) / h_fg(T_e) = ${nf(c.x4, 3)} (flash-gas fraction)`, rc2: (c) => `ṁ = C_d A √(2 ρ_l Δp) ⇒ A = ${nf((c.m || 0) * 1000, 1)} g/s / (0.6 √(2·${nf(c.rhol, 0)}·${nf(c.dp / 1e5, 1)} bar)) = ${nf(c.Aor, 2)} mm²`, rc3: (c) => `p_bulb(T_e + 5 K) − p_e = F_spring/A_d:  ${nf(psat(c.Te + 5), 2)} − ${nf(c.Pe, 2)} = ${nf(psat(c.Te + 5) - c.Pe, 2)} bar`, rc4: (c) => `V_rec ≥ 1.25 m_charge/ρ_l = 1.25 × ${nf(0.45 * c.Qe, 1)} kg / ${nf(c.rhol, 0)} kg/m³ = ${nf(1.25 * 0.45 * c.Qe / c.rhol * 1000, 1)} L  (installed ${pl.recv_l} L)`, rc5: (c) => `Throttling is isenthalpic: h₄ − h₃ = 0, s₄ > s₃ (irreversible)` });
reg(LV, { rc_x: (c) => nf(c.x4, 3), rc_a: (c) => nf(c.Aor, 2) + " mm²", rc_dp: (c) => nf(c.dp / 1e5, 1) + " bar", rc_m: (c) => nf(c.m * 1000, 1) + " g/s", rc_sh: (c) => nf(CY.superheat, 1) + " K" });
PG.recv = { upd(c) {
  const A2 = AP("recv"), P = PJS.recv, { rx, tx } = M6, mmax = 0.14, lift = c.on ? clamp((c.m || 0) / mmax, 0, 1) * 5 : 0;
  const lvl = c.on ? 0.62 - 0.3 * clamp(c.m / mmax, 0, 1) : 0.6, ztop = 12 + lvl * 90, pt = (x, z) => [x, 0, z], poly = (pts, tone) => { const d = pts.map((p, i) => (i ? "L" : "M") + iso(p, P).join(" ")).join("") + "Z"; return solidSvg({ fill: d, outline: d, crease: "", top: "", shades: [] }, { flat: true, tone, lit: tone === "hi" }) + `<path class="iso-line" data-tone="mid" style="stroke-width:1.1" d="${d}"/>`; };
  S1("recv", "level").innerHTML = poly([pt(rx - 17, 12), pt(rx - 17, ztop), pt(rx + 17, ztop), pt(rx + 17, 12), pt(rx + 12, 7), pt(rx - 12, 7)], "hi");
  const zn = 34 + lift; S1("recv", "needle").innerHTML = poly([pt(tx + 2, zn + 2), pt(tx + 6, zn + 9), pt(tx + 10, zn + 2), pt(tx + 10, zn - 6), pt(tx + 2, zn - 6)], "hi") + lineSvg(segment(pt(tx + 6, zn + 9), pt(tx + 6, 78 + lift * 0.8), P), { tone: "mid", style: "stroke-width:2" });
  const zd = 78 + lift * 0.8; let sp = `M${iso(pt(tx + 6, 14), P).join(" ")}`; for (let i = 1; i <= 8; i++) sp += `L${iso(pt(tx + 6 + (i % 2 ? 5 : -5), 14 + (i * (zn - 18)) / 8), P).join(" ")}`;
  S1("recv", "head").innerHTML = lineSvg(`M${iso(pt(tx - 20, zd), P).join(" ")}Q${iso(pt(tx + 6, zd + 8 - lift * 0.3), P).join(" ")} ${iso(pt(tx + 32, zd), P).join(" ")}`, { tone: "lit", style: "stroke-width:2.2" }) + poly([pt(tx - 20, 72), pt(tx - 14, 94), pt(tx + 6, 104), pt(tx + 26, 94), pt(tx + 32, 72)], "face") + `<path class="iso-line" data-tone="mid" d="${sp}"/>`;
  const bl = iso([100, 0, 78], P); S1("recv", "bulb").innerHTML = `<circle cx="${bl[0]}" cy="${bl[1]}" r="5" style="fill:var(--anatomy-paper);stroke:var(--anatomy-blue);stroke-width:1.4"/>` + lineSvg(segment([100, 0, 80], [tx + 6, 0, 104], P), { tone: "faint", style: "stroke-width:.9" });
  ["r_in", "r_out", "t_in", "t_out", "t_suc"].forEach((n) => flowSet("recv", n, c.run, (c.m || 0) * 25, false));
  const xs = c.x4; xy(plotEl("recv", "q"), [{ pts: DATA.dome.hf.map((h, i) => [h, DATA.dome.P[i]]).concat(DATA.dome.hg.map((h, i) => [h, DATA.dome.P[i]]).reverse()), c: "lo", w: 0.9 }, { pts: [[c.h3, c.Pc], [c.h3, c.Pe]], c: "red", w: 2 }], { x0: 150, x1: 450, y0: 0, y1: 20, lab: "expansion 3 → 4 at constant h" }, c.on ? [{ x: c.h3, y: c.Pe, c: "blue", t: "x₄ = " + nf(xs, 2) }] : []);
} };
// ---------- M7 evaporator ----------
reg(V, { ev1: (c) => `Q̇_e = UA (T_s − T_e) = ${CY.UA_chamber} × (${nf(c.Ts, 1)} − ${nf(c.Te, 1)}) = ${nf(CY.UA_chamber * (c.Ts - c.Te), 2)} kW  (model: ${nf(c.Qe, 2)} kW)`, ev2: (c) => `T_e = T_s − Q̇_e/UA = ${nf(c.Ts, 1)} − ${nf(c.Qe, 2)}/${CY.UA_chamber} = ${nf(c.Te, 1)} °C → p_e = ${nf(c.Pe, 2)} bar`, ev3: (c) => `ΔT_air = Q̇_e/(ρ c_p V̇) = ${nf(c.Qe, 2)}/(1.2·1.006·${c.vdot_air}) = ${nf(c.dTair, 1)} K`, ev4: (c) => `Q̇_e = ṁ (h₁ − h₄) = ${nf(c.m * 1000, 1)} g/s × ${nf(c.h1 - c.h3, 1)} kJ/kg`, ev5: (c) => `fan heat adds ${nf(c.fanheat, 2)} kW to the room: Q̇_load = UA_env ΔT + Q̇_proc + P_fan`, ev6: (c) => `superheat: Q̇_sh = ṁ c_p ΔT_sh = ${nf(c.m * CY.cp_v * CY.superheat, 2)} kW (${nf(100 * c.m * CY.cp_v * CY.superheat / Math.max(c.Qe, 1e-6), 1)} % of the duty)` });
reg(LV, { ev_q: (c) => nf(c.Qe, 1) + " kW", ev_te: (c) => nf(c.Te, 1) + " °C", ev_dt: (c) => nf(c.Ts - c.Te, 1) + " K", ev_da: (c) => nf(c.dTair, 1) + " K", ev_pe: (c) => nf(c.Pe, 2) + " bar", ev_state: (c) => (c.circ === 1 ? "active" : "off (store or idle)") });
PG.evap = { fa: 0, upd(c, dt) {
  const on = c.circ === 1, run = c.run && on; this.fa += (c.fanheat > 0 ? 12 : 0) * dt; ["fan0", "fan1"].forEach((n, i) => { const g = S1("evap", n); if (g) g.innerHTML = bladesP("evap", i ? 30 : -30, 28.8, 48, this.fa + i, 5, 2.4, 13, true); });
  const cs = M7.cols, rs = M7.rows, order = []; [...rs].reverse().forEach((z, ri) => (ri % 2 ? [...cs].reverse() : cs).forEach((y) => order.push([y, z]))); const nsh = on ? Math.max(1, Math.round(16 * CY.cp_v * CY.superheat * c.m / Math.max(c.Qe, 1e-6) * 3)) : 0;
  S1("evap", "tubes").innerHTML = order.map(([y, z], i) => `<path class="iso-line zr z-${!on ? "idle" : i >= order.length - nsh ? "hot" : "evp"}" d="${sideRing([52, y, z], 3.2, "x", PJS.evap, 18)}"/>`).join("");
  ["air", "airo", "e_in", "e_out"].forEach((n) => flowSet("evap", n, n.startsWith("e_") ? run : c.fanheat > 0 && c.run, n.startsWith("e_") ? c.m * 25 : 1.5, false));
  xy(plotEl("evap", "air"), [{ pts: [[0, c.Ts], [1, c.Ts - c.dTair]], c: "lit", w: 1.6 }, { pts: [[0, c.Te], [0.96, c.Te], [1, c.Te + CY.superheat]], c: "blue", w: 1.4, dash: 1 }], { x0: 0, x1: 1, y0: -15, y1: 10, xd: 1, lab: "room air (solid) and refrigerant (dashed) °C across the coil" });
} };
// ---------- M8 store ----------
const iceR = (f) => Math.sqrt(M8.r0 ** 2 + f * (M8.R ** 2 - M8.r0 ** 2));
reg(V, { st1: (c) => `E = m_ice · L = ${nf(c.ice, 0)} kg × 260 kJ/kg / 3600 = ${nf(c.ice * 260 / 3600, 1)} kWh  (capacity ${c.Ecap} kWh, f = ${nf(c.f, 2)})`, st2: (c) => `r_ice = √(r₀² + f (R² − r₀²)) = √(${M8.r0}² + ${nf(c.f, 2)}·(${M8.R}² − ${M8.r0}²)) = ${nf(iceR(c.f), 1)} cm-scale units`, st3: (c) => `E_cap · df/dt = Q̇_chg − Q̇_dis − UA_st (T_s − T_pcm):  ${nf(c.Qchg, 2)} − ${nf(c.Qdis, 2)} − ${nf(c.Qleak, 2)} kW`, st4: (c) => `Q̇_dis = min(${pl.Q_dis_max}·clip((T_s − 2)/1.5, 0, 1), f E_cap/Δt) = ${nf(c.Qdis, 2)} kW`, st5: (c) => `charging T_e = T_pcm − Q̇_e/UA_st = ${pl.T_pcm} − ${nf(c.circ === 2 ? c.Qe : 0, 2)}/${CY.UA_store} = ${nf(c.circ === 2 ? c.Te : NaN, 1)} °C, COP ${nf(c.circ === 2 ? c.cop : NaN, 2)}`, st6: (c) => `t_empty = f E_cap / Q̇_dis = ${c.Qdis > 0.05 ? nf(c.f * c.Ecap / c.Qdis, 1) + " h" : "–"},  t_full = (1 − f) E_cap / Q̇_chg = ${c.Qchg > 0.05 ? nf((1 - c.f) * c.Ecap / c.Qchg, 1) + " h" : "–"}` });
reg(LV, { st_f: (c) => nf(c.f * 100, 0) + " %", st_ice: (c) => nf(c.ice, 0) + " kg", st_chg: (c) => nf(c.Qchg, 1) + " kW", st_dis: (c) => nf(c.Qdis, 1) + " kW", st_r: (c) => nf(iceR(c.f), 1), st_state: (c) => (c.circ === 2 ? "charging" : c.Qdis > 0.05 ? "discharging" : "holding") });
PG.store = { upd(c) {
  const rr = iceR(clamp(c.f, 0, 1)), show = ctl.mode === "storage" && ctl.store > 0 && mst.store === "armed";
  SA("store", "ice").forEach((g) => { const [x, y] = M8.tubes[+g.dataset.i]; g.innerHTML = show && c.f > 0.02 ? solidSvg(cylinder(x, y, rr, 8, 56, PJS.store, 22), { tone: "hi", lit: true, crease: "none" }) : ""; });
  S1("store", "section").innerHTML = M8.tubes.map(([x, y]) => (show ? solidSvg(cylinder(x, y, rr, 110, 1.2, PJS.store, 24), { tone: "hi", lit: true, crease: "none" }) : "") + solidSvg(cylinder(x, y, M8.r0 + 0.6, 111, 1.2, PJS.store, 12), { tone: "mid" })).join("");
  flowSet("store", "s_in", c.circ === 2, c.m * 25, false); flowSet("store", "s_out", c.circ === 2, c.m * 25, false);
  const n = Math.max(1, idx), fh = []; for (let i = 0; i < n; i++) fh.push([DAY.t[i], hist.f[i] * 100]); xy(plotEl("store", "soc"), [{ pts: fh, c: "lit", w: 1.5 }], { x0: 0, x1: 24, y0: 0, y1: 100, lab: "state of charge % over the day" }, [{ x: DAY.t[Math.min(idx, N - 1)], y: c.f * 100, c: "lit" }]);
  const qc = [], qd = []; for (let i = 0; i < n; i++) { qc.push([DAY.t[i], hist.Qchg[i]]); qd.push([DAY.t[i], hist.Qdis[i]]); } xy(plotEl("store", "pw"), [{ pts: qc, c: "blue", w: 1.2 }, { pts: qd, c: "red", w: 1.2 }], { x0: 0, x1: 24, y0: 0, y1: 12, lab: "charge (blue) and discharge (red) kW" });
} };
// ---------- M9 grid ----------
reg(V, { gr1: (c) => `P_load = P_el + P_fans + P_aux = ${nf(c.Pload, 2)} kW;  P_pv,used = min(P_ac, P_load) = ${nf(c.Pv - c.Pexp, 2)} kW`, gr2: (c) => `P_grid = P_load − P_pv,used = ${nf(c.Pgrid, 2)} kW;  P_export = P_ac − P_pv,used = ${nf(c.Pexp, 2)} kW`, gr3: (c) => `cost = Σ P_grid·tariff·Δt − Σ P_export·${pl.price_export}·Δt = $${nf(tot.cost, 2)} so far`, gr4: (c) => `tariff now = $${sim.tariff(DAY.t[Math.min(idx, N - 1)]).toFixed(2)}/kWh (22–06: 0.10, 17–21: 0.30, else 0.16)`, gr5: (c) => `solar fraction = Σ P_pv,used Δt / Σ P_load Δt = ${nf(100 * tot.used / Math.max(tot.load, 1e-6), 0)} %` });
reg(LV, { gr_imp: (c) => nf(tot.grid, 1) + " kWh", gr_exp: (c) => nf(tot.exp, 1) + " kWh", gr_p: (c) => nf(c.Pgrid - c.Pexp, 2) + " kW", gr_c: (c) => "$" + nf(tot.cost, 2), gr_t: (c) => "$" + sim.tariff(DAY.t[Math.min(idx, N - 1)]).toFixed(2) + "/kWh", gr_state: (c) => (mst.grid !== "armed" ? "open (islanded)" : c.Pexp > 0.05 ? "exporting" : c.Pgrid > 0.05 ? "importing" : "balanced") });
PG.grid = { upd(c) {
  const m = S1("grid", "meter"); if (m) m.innerHTML = faceTextSvg(sideMatrix([31, 12.4], 70, PJS.grid, "right"), (mst.grid === "armed" ? nf(c.Pgrid - c.Pexp, 2) : "OPEN") + " kW", { size: 5, tone: "lit", anchor: "middle" }) + faceTextSvg(sideMatrix([31, 12.4], 62, PJS.grid, "right"), "IMP " + nf(tot.grid, 1) + "  EXP " + nf(tot.exp, 1), { size: 3.4, tone: "mid", anchor: "middle" });
  const imp = c.Pgrid > 0.02; flowSet("grid", "srv", mst.grid === "armed" && (imp || c.Pexp > 0.02), imp ? c.Pgrid : c.Pexp, !imp); flowSet("grid", "w1", c.Pload > 0.05, c.Pload, false); flowSet("grid", "w2", c.Pload > 0.05, c.Pload, false); flowSet("grid", "w3", c.Pload > 0.05, c.Pload, false); flowSet("grid", "w4", c.Pload > 0.05, c.Pload, false);
  const tb = []; for (let h = 0; h < 24; h += 0.5) tb.push([h, sim.tariff(h) * 100]); const imp2 = [], exp2 = [], n = Math.max(1, idx); for (let i = 0; i < n; i++) { imp2.push([DAY.t[i], hist.Pgrid[i]]); exp2.push([DAY.t[i], hist.Pexp[i]]); }
  xy(plotEl("grid", "tar"), [{ pts: tb, c: "lo", w: 1.2, dash: 1 }], { x0: 0, x1: 24, y0: 0, y1: 35, lab: "tariff ¢/kWh (dashed) with now marker" }, [{ x: DAY.t[Math.min(idx, N - 1)], y: sim.tariff(DAY.t[Math.min(idx, N - 1)]) * 100, c: "lit" }]);
  xy(plotEl("grid", "pw"), [{ pts: imp2, c: "red", w: 1.3 }, { pts: exp2, c: "blue", w: 1.3 }], { x0: 0, x1: 24, y0: 0, y1: 12, lab: "import (red) and export (blue) kW" });
} };
// ---------- M10 room ----------
reg(V, { rm1: (c) => `C_s dT/dt = UA_env (T_amb − T_s) + Q̇_proc + P_fan − Q̇_coil − Q̇_dis = (${nf(c.qenv, 2)} + ${nf(c.Qproc, 2)} + ${nf(c.fanheat, 2)} − ${nf(c.qroom, 2)} − ${nf(c.Qdis, 2)}) kW`, rm2: (c) => `dT/dt = ${nf(c.dTdt, 2)} K/h (C_s = ${pl.C_s} kJ/K = ${nf(pl.C_s / 3600, 2)} kWh/K)`, rm3: (c) => `τ = C_s/UA_env = ${pl.C_s}/${pl.UA_env} kJ/K per kW/K = ${nf(c.tau, 1)} h (no cooling)`, rm4: (c) => `free drift: T(t) = T_∞ − (T_∞ − T₀) e^(−t/τ), T_∞ = T_amb + Q̇_proc/UA_env = ${nf(c.Tamb + c.Qproc / pl.UA_env, 0)} °C`, rm5: (c) => `thermal buffer to the ${pl.T_hi} °C limit: C_s (T_hi − T_s)/3600 = ${nf(pl.C_s * (pl.T_hi - c.Ts) / 3600, 1)} kWh` });
reg(LV, { rm_t: (c) => nf(c.Ts, 2) + " °C", rm_env: (c) => nf(c.qenv, 2) + " kW", rm_proc: (c) => nf(c.Qproc, 2) + " kW", rm_dt: (c) => nf(c.dTdt, 2) + " K/h", rm_buf: (c) => nf(pl.C_s * (pl.T_hi - c.Ts) / 3600, 1) + " kWh" });
PG.room = { upd(c) {
  const A2 = AP("room"), w = (kw) => Math.min(7, 0.8 + Math.abs(kw) * 0.9), arr = (a, b, kw, tone) => (Math.abs(kw) < 0.02 ? "" : `<path class="iso-line dflow" data-flow data-tone="${tone}" style="stroke-width:${w(kw)};opacity:.9" d="M${A2(a).join(" ")}L${A2(b).join(" ")}"/>`);
  S1("room", "arrows").innerHTML = arr([-30, -90, 80], [-30, -30, 80], c.qenv, "red") + arr([-130, 40, 40], [-96, 40, 40], c.Qproc, "red") + arr([62, 8, 74], [62, 8, 96], c.fanheat, "red") + arr([60, 0, 88], [60, -40, 110], c.qroom, "blue") + arr([-10, 0, 30], [30, 0, 30], c.Qdis, "blue");
  const bars = [["envelope", c.qenv, "red"], ["process", c.Qproc, "red"], ["fan heat", c.fanheat, "red"], ["coil", -c.qroom, "blue"], ["store", -c.Qdis, "blue"]]; const el = plotEl("room", "bal"); let h = ""; bars.forEach(([n, v, t], i) => { const y = 14 + i * 22, x0 = 120, wv = clamp(v, -10, 10) * 12; h += `<text x="6" y="${y + 9}">${n}</text><rect x="${Math.min(x0, x0 + wv)}" y="${y}" width="${Math.abs(wv)}" height="12" style="fill:var(--anatomy-${t});opacity:.8"/><text x="${v >= 0 ? x0 + wv + 4 : x0 + wv - 4}" y="${y + 9}" text-anchor="${v >= 0 ? "start" : "end"}">${nf(v, 2)} kW</text>`; }); h += `<path class="ax" d="M120 8V126"/><text x="290" y="8" text-anchor="end">heat flows into (+) and out of (−) the room</text>`; el.innerHTML = h;
  const tt = []; for (let i = 0; i < Math.max(1, idx); i++) tt.push([DAY.t[i], hist.Ts[i]]); xy(plotEl("room", "ts"), [{ pts: tt, c: "lit", w: 1.5 }, { pts: [[0, pl.T_hi], [24, pl.T_hi]], c: "red", w: 0.8, dash: 1 }], { x0: 0, x1: 24, y0: -2, y1: 8, lab: "room temperature °C (dashed: product limit)" });
} };
// ---------- frame hook ----------
let lastRun = null; const GHOST = ["comp", "vfd", "cond", "recv", "evap"], COLS = ["Qe", "Pel", "Qc", "Pfan", "Te", "Tc", "Pe", "Pc", "h1", "h2", "h3", "m", "T2"];
function pagesUpdate(r, dtReal) {
  if (!r) return; if (r.circ > 0) lastRun = r; if (activePage === "overview") return; const pg = PG[activePage]; if (!pg) return; if (!pg.ready) { pg.init?.(); pg.ready = true; }
  let rr = r, ghost = false;
  if (r.circ === 0 && GHOST.includes(activePage)) { let b = lastRun; if (!b) { const q = sim.interp(0, 2, Math.max(15, r.inp.Tamb), 0.8, pl.eff), o = {}; COLS.forEach((k2, i) => (o[k2] = q[i])); b = { ...o, circ: 1, speed: 0.8 }; } rr = { ...r }; COLS.forEach((k2) => (rr[k2] = b[k2])); rr.circ = b.circ; rr.speed = b.speed; ghost = true; }
  const c = ctxOf(rr); c.run = r.circ > 0; c.ghost = ghost; pg.upd(c, dtReal); fillEq(activePage, c); fillLive(activePage, c);
  const ro = $(`[data-page="${activePage}"] [data-readout]`); if (ro) { const t = hh(DAY.t[Math.min(idx, N - 1)]) + (ghost ? " · stopped, showing last running state" : " · live"); if (ro.textContent !== t) ro.textContent = t; }
}
route();
