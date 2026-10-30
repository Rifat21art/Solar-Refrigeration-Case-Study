// ---- live runtime: steps the ported model (sim.js) and drives the drawing, readouts and plots ----
let PJ = SCENE.P; const sim = SVCR.make(DATA), N = DATA.day.t.length, DT = DATA.day.dt, DAY = DATA.day;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const A = (p) => iso(p, PJ), clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const stage = $(".iso-stage"), readout = $("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const pl = { ...DATA.plant }, ctl = { G: 950, Tmean: 30, demand: 1, cap: 1, eff: 1, store: 30, rate: 1.5, mode: "storage", play: !still.matches };
const [AA, AB, AC] = DATA.antoine, psat = (T) => Math.exp(AA - AB / (T + 273.15 + AC));
const vecOf = (P) => ((az, el) => [Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)])((P.azimuth ?? 36) * Math.PI / 180, (P.elevation ?? 30) * Math.PI / 180); let view = vecOf(PJ);
let st, idx, hist, tot, disp, last = null, accum = 0, tNow = 0;
const NaNs = () => new Float32Array(N).fill(NaN);
function restart() {
  pl.store_kwh = ctl.store; st = sim.newState(pl, ctl.mode, 2.0, 0.3); idx = 0; accum = 0;
  hist = { Ts: NaNs(), Te: NaNs(), Tc: NaNs(), Tamb: NaNs(), Pe: NaNs(), Pc: NaNs(), Pv: NaNs(), Pload: NaNs(), Pgrid: NaNs(), Pexp: NaNs(), f: NaNs(), Qchg: NaNs(), Qdis: NaNs() };
  tot = { exp: 0, grid: 0, cost: 0, load: 0, used: 0, pv: 0, comp: 0 };
  disp = { Te: 0, Tc: 25, Pe: 2.5, Pc: 7, cyc: [400, 440, 250, 2.4, 9.8] };
}
const inputAt = (i) => ({ G: DAY.G[i] * ctl.G / 950, Tamb: DAY.Tamb[i] + (ctl.Tmean - 30), Q: DAY.Qproc[i] * ctl.demand });
function syncPlant() { pl.cap = ctl.cap; pl.eff = ctl.eff; pl.store_kwh = ctl.store; syncFlags(); }
function absorb(r, inp, d, Ts) {   // displayed saturation temps: model values while running, relaxing to standstill otherwise
  if (r.circ > 0) { d.Te = r.Te; d.Tc = r.Tc; d.cyc = [r.h1, r.h2, r.h3, r.Pe, r.Pc]; }
  else { const k = 1 - Math.exp(-DT / 240); d.Te += (Ts - d.Te) * k; d.Tc += (inp.Tamb - d.Tc) * k; }
  d.Pe = psat(d.Te); d.Pc = psat(d.Tc);
}
function advance() {
  syncPlant(); const inp = inputAt(idx), r = sim.step(ctl.mode, st, inp, pl, DT), h = DT / 3600;
  tot.grid += r.Pgrid * h; tot.exp += r.Pexp * h; tot.cost += r.Pgrid * h * sim.tariff(DAY.t[idx]) - r.Pexp * h * pl.price_export; tot.load += r.Pload * h; tot.pv += r.Pv * h; tot.used += (r.Pv - r.Pexp) * h; tot.comp += r.Pel * h;
  absorb(r, inp, disp, st.Ts);
  hist.Ts[idx] = r.Ts; hist.Te[idx] = disp.Te; hist.Tc[idx] = disp.Tc; hist.Tamb[idx] = inp.Tamb; hist.Pe[idx] = disp.Pe; hist.Pc[idx] = disp.Pc; hist.Pv[idx] = r.Pv; hist.Pload[idx] = r.Pload; hist.Pgrid[idx] = r.Pgrid; hist.Pexp[idx] = r.Pexp; hist.f[idx] = r.f; hist.Qchg[idx] = r.Qchg; hist.Qdis[idx] = r.Qdis;
  r.inp = inp; last = r; idx++;
  if (idx >= N) { const keep = { ...st }; restart(); Object.assign(st, keep); }
}
function preview() {   // paused: show the instantaneous response to the current controls without advancing time
  syncPlant(); const inp = inputAt(Math.min(idx, N - 1)), r = sim.step(ctl.mode, { ...st }, inp, pl, DT); r.inp = inp; return r;
}
restart();

// ---------- readouts ----------
const TILES = [["comp", "Compressor power", "kW"], ["cap", "Cooling capacity", "kW"], ["cop", "COP (compressor)", ""], ["copS", "COP (system, aux incl.)", ""], ["rej", "Heat rejection", "kW"], ["pvac", "PV (AC)", "kW"], ["solar", "Solar contribution", "kW"], ["grid", "Grid import", "kW"], ["unsrv", "Unserved load", "kW"],
  ["Ts", "Cold-room temp", "°C"], ["store", "Store charge", "%"], ["Te", "Evaporating", "°C"], ["Tc", "Condensing", "°C"], ["Pe", "Suction pressure", "bar"], ["Pc", "Discharge pressure", "bar"], ["eg", "Grid today", "kWh"], ["cost", "Cost today", "$"]];
const tiles = {}; $("[data-readouts]").innerHTML = TILES.map(([id, l, u]) => `<div><small>${l}</small><b data-t="${id}">–</b> <small style="display:inline">${u}</small></div>`).join("");
$$("[data-t]").forEach((e) => (tiles[e.dataset.t] = e));
const f1 = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : "–"), setT = (id, v) => { if (tiles[id].textContent !== v) tiles[id].textContent = v; };
const hh = (t) => String(Math.floor(t)).padStart(2, "0") + ":" + String(Math.floor((t % 1) * 60)).padStart(2, "0");

// ---------- drawing ----------
const pipeOK = (n) => (SCENE.PIPE_MODS[n] || []).every((m) => mst[m] === "armed");
const flowOf = { dis: (r) => r.circ > 0, cond: (r) => r.circ > 0, liq: (r) => r.circ > 0, feedH: (r) => r.circ === 2, feedL: (r) => r.circ === 2, lpIn: (r) => r.circ === 1, lpOut: (r) => r.circ === 1, ret: (r) => r.circ === 2, suc: (r) => r.circ > 0 };
let pipes, wires, cells, ice, rays, rayEls, fanC, fanE, shaft, thermo, gauges, meter, vtxt, tagsG;
const wireP = { dc: (r) => r.Pv / 0.95, ac: (r) => r.Pv, grid: (r) => (r.Pgrid > 0.02 ? r.Pgrid : r.Pexp), bus: (r) => r.Pload, motor: (r) => r.Pel };
function flowStyle(el, on, power, rev) { el.style.opacity = on ? Math.min(1, 0.5 + power / 6) : 0.1; el.style.animationPlayState = on && ctl.play ? "running" : "paused"; el.style.animationDuration = Math.round(clamp(1500 / (0.3 + power), 380, 3200)) + "ms"; el.style.animationDirection = rev ? "reverse" : "normal"; }
function blades(cx, cy, cz, ang, n, r0, r1, vertical) {
  let d = "";
  for (let b = 0; b < n; b++) {
    const a = ang + (b * 2 * Math.PI) / n, pt = (r, da) => { const u = r * Math.cos(a + da), v = r * Math.sin(a + da); return A(vertical ? [cx + u, cy, cz + v] : [cx + u, cy + v, cz]).join(" "); };
    d += `M${pt(r0, -0.2)}L${pt(r1, 0)}L${pt(r1, 0.42)}L${pt(r0, 0.3)}Z`;
  }
  return `<path class="iso-fill" d="${d}"/><path class="iso-line" data-tone="mid" d="${d}" style="stroke-width:.7"/>`;
}
let fanAng = 0, evAng = 0, shAng = 0, lastIce = -1;
function draw(r, dtReal) {
  const on = r.circ > 0, m = r.m || 0;
  pipes.forEach((e) => { const act = flowOf[e.dataset.pipe](r) && pipeOK(e.dataset.pipe); flowStyle(e, act, act ? m * 22 : 0, false); });
  wires.forEach((e) => { const n = e.dataset.wire, p = wireP[n](r); flowStyle(e, p > 0.03, p, n === "grid" && r.Pgrid <= 0.02 && r.Pexp > 0.02); });
  const gk = clamp(r.inp.G / 1000, 0, 1.1); cells.forEach((e) => (e.style.opacity = (0.08 + 0.92 * Math.min(1, gk)).toFixed(2)));
  rayEls.forEach((l, i) => { const a = (i / 10) * 6.2832, r1 = 12 + 12 * gk; l.setAttribute("x1", Math.cos(a) * 12); l.setAttribute("y1", Math.sin(a) * 12); l.setAttribute("x2", Math.cos(a) * r1); l.setAttribute("y2", Math.sin(a) * r1); l.style.opacity = gk < 0.03 ? 0 : 0.35 + 0.65 * Math.min(1, gk); });
  const fanFrac = on ? Math.cbrt(clamp(r.Pfan / DATA.cycle.fan_cond, 0, 1)) : 0, evOn = r.circ === 1 || r.Qdis > 0 ? 1 : 0;
  fanAng += fanFrac * 9 * dtReal; evAng += evOn * 12 * dtReal; shAng += (on ? r.speed : 0) * 4 * Math.PI * dtReal;
  fanC.innerHTML = blades(+fanC.dataset.cx, +fanC.dataset.cy, +fanC.dataset.cz, fanAng, 5, 3.5, 20, false);
  fanE.forEach((g) => (g.innerHTML = blades(+g.dataset.cx, +g.dataset.cy + 0.3, +g.dataset.cz, evAng, 4, 2.4, 10, true)));
  let sd = ""; for (let j = 0; j < 12; j++) { const a = shAng + (j * 2 * Math.PI) / 12, c = Math.cos(a), s = Math.sin(a); if (c * view[1] + s * view[2] < 0.12) continue; sd += `M${A([-33, 20 + 9 * c, 26 + 9 * s]).join(" ")}L${A([-21, 20 + 9 * c, 26 + 9 * s]).join(" ")}`; }
  shaft.innerHTML = `<path class="iso-line" data-tone="${on ? "lit" : "lo"}" d="${sd}"/>`;
  const h = clamp((r.Ts + 2) / 10, 0, 1) * 52; thermo.setAttribute("d", `M${A([-225.5, -145, 22]).join(" ")}L${A([-225.5, -145, 22 + h]).join(" ")}`);
  const fq = Math.round(r.f * 200) + (ctl.mode === "storage" ? 1000 : 0); if (fq !== lastIce) { lastIce = fq; const rr = Math.sqrt(1.8 * 1.8 + r.f * (7.7 * 7.7 - 1.8 * 1.8)), show = r.f >= 0.02 && ctl.mode === "storage" && ctl.store > 0; ice.forEach((g) => { const [x, y] = SCENE.TUBES[+g.dataset.i]; g.innerHTML = show ? solidSvg(cylinder(x, y, rr, 8, 48, PJ, 20), { tone: "hi", lit: true, crease: "none" }) : ""; }); }
  gauges.forEach((g) => { const lp = g.dataset.g === "lp", p = lp ? disp.Pe : disp.Pc, a = (225 - 270 * clamp(p / (lp ? 6 : 20), 0, 1)) * Math.PI / 180, cx = +g.dataset.cx, cz = +g.dataset.cz; g.querySelector(".needle").setAttribute("d", `M${A([cx, 65.2, cz]).join(" ")}L${A([cx + 8.2 * Math.cos(a), 65.2, cz + 8.2 * Math.sin(a)]).join(" ")}`); });
  const ma = clamp((r.Pgrid - r.Pexp) / 10, -1, 1) * 2.1; meter.innerHTML = `<path class="iso-line" data-tone="lit" style="stroke-width:1" d="${lineOnTop([321, 66], [321 + 4 * Math.sin(ma), 66 - 4 * Math.cos(ma)], 32.2, PJ)}"/>`;
  vtxt.textContent = on ? Math.round(r.speed * 50) + " Hz" : "STOP"; $('[data-part="vfdled"]').style.opacity = on ? 1 : 0.15; $('[data-part="invled"]').style.opacity = r.Pv > 0.05 ? 1 : 0.15;
}

// ---------- plots ----------
function plot(name, series, o, now) {
  const el = $(`[data-plot="${name}"]`), X = (i) => 28 + (264 * i) / (N - 1), Y = (v) => 10 + 118 * (1 - (v - o.min) / (o.max - o.min)); let h = "";
  for (let g = 0; g <= 4; g++) { const v = o.min + ((o.max - o.min) * g) / 4; h += `<path class="ax" d="M28 ${Y(v)}H292"/><text x="25" y="${Y(v) + 2.5}" text-anchor="end">${v.toFixed(0)}</text>`; }
  for (let t = 0; t <= 24; t += 6) h += `<text x="${X((t / 24) * (N - 1))}" y="143" text-anchor="middle">${t}h</text>`;
  series.forEach((s) => { let d = "", pen = false; for (let i = 0; i <= Math.min(now, N - 1); i++) { const v = s.a[i]; if (!Number.isFinite(v)) { pen = false; continue; } d += (pen ? "L" : "M") + X(i).toFixed(1) + " " + Y(clamp(v, o.min, o.max)).toFixed(1); pen = true; } h += `<path d="${d}" fill="none" style="stroke:var(--anatomy-${s.c});stroke-width:${s.w || 1.1};${s.dash ? "stroke-dasharray:3 2;" : ""}"/>`; });
  h += `<path class="ax" style="stroke:var(--anatomy-mid)" d="M${X(now)} 8V128"/>`;
  series.forEach((s, i) => (h += `<text x="${32 + i * 56}" y="7" style="fill:var(--anatomy-${s.c})">${s.n}</text>`)); el.innerHTML = h;
}
function plotPH(rec) {
  const el = $('[data-plot="ph"]'), X = (v) => 28 + (264 * (v - 150)) / 300, Y = (p) => 128 - (118 * Math.log(p / 0.8)) / Math.log(22 / 0.8); let h = "";
  [1, 2, 5, 10, 20].forEach((p) => (h += `<path class="ax" d="M28 ${Y(p)}H292"/><text x="25" y="${Y(p) + 2.5}" text-anchor="end">${p}</text>`)); [200, 300, 400].forEach((v) => (h += `<text x="${X(v)}" y="143" text-anchor="middle">${v}</text>`));
  const D = DATA.dome, pts = [...D.hf.map((v, i) => [v, D.P[i]]), ...D.hg.map((v, i) => [v, D.P[i]]).reverse()];
  h += `<path d="M${pts.map((p) => X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join("L")}" fill="none" style="stroke:var(--anatomy-lo);stroke-width:.9"/>`;
  const [h1, h2, h3, pe, pc] = disp.cyc, c = [[h1, pe], [h2, pc], [h3, pc], [h3, pe], [h1, pe]];
  h += `<path d="M${c.map((p) => X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join("L")}" fill="none" style="stroke:var(--anatomy-lit);stroke-width:1.4;opacity:${rec.circ > 0 ? 1 : 0.3}"/>`;
  [["1", h1, pe], ["2", h2, pc], ["3", h3, pc], ["4", h3, pe]].forEach(([n, a, b]) => (h += `<text x="${X(a) + 3}" y="${Y(b) - 2}" style="fill:var(--anatomy-hi)">${n}</text>`));
  h += `<text x="292" y="8" text-anchor="end">h kJ/kg · p bar (log)</text>`; el.innerHTML = h;
}

// ---------- frame loop ----------
const STATE_TXT = ["idle", "cooling the room", "charging the ice bank"]; let plotClock = 0, raf = 0, visible = true, dirty = true;
let update = function update(dtReal) {
  const r = ctl.play && last ? last : preview(); alerts(); if (performance.now() % 1000 < 40) refreshNotes();
  draw(r, dtReal); pagesUpdate(r, dtReal);
  const on = r.circ > 0, used = r.Pv - r.Pexp, cop = on ? r.Qe / r.Pel : NaN, aux = r.Paux + r.Pfan, qs = r.Qe, copS = on ? qs / Math.max(r.Pel + aux, 1e-6) : NaN;
  setT("comp", f1(r.Pel, 2)); setT("cap", f1(r.Qe, 1)); setT("cop", f1(cop, 2)); setT("copS", f1(copS, 2)); setT("rej", f1(r.Qc, 1)); setT("pvac", f1(r.Pv, 1)); setT("solar", f1(used, 1) + " (" + (r.Pload > 0 ? Math.round((100 * used) / r.Pload) : 0) + "%)"); setT("grid", f1(r.Pgrid, 1)); setT("unsrv", f1(r.Punsrv, 2));
  setT("Ts", f1(r.Ts, 1)); setT("store", ctl.mode === "storage" && ctl.store > 0 ? String(Math.round(r.f * 100)) : "–"); setT("Te", f1(disp.Te, 1)); setT("Tc", f1(disp.Tc, 1)); setT("Pe", f1(disp.Pe, 2)); setT("Pc", f1(disp.Pc, 1)); setT("eg", f1(tot.grid, 1)); setT("cost", f1(tot.cost, 2));
  const tt = DAY.t[Math.min(idx, N - 1)]; const ck = hh(tt) + " · " + STATE_TXT[r.circ] + " · tariff $" + sim.tariff(tt).toFixed(2) + "/kWh"; $$("[data-v=clock]").forEach((e) => { if (e.textContent !== ck) e.textContent = ck; });
  const rd = `${hh(tt)} · room ${f1(r.Ts, 1)} °C · COP ${on ? f1(cop, 1) : "–"} · grid ${f1(r.Pgrid, 1)} kW`; if (readout.textContent !== rd) readout.textContent = rd;
  if (performance.now() - plotClock > 160) {
    plotClock = performance.now(); const i = Math.max(0, idx - 1);
    plot("temp", [{ a: hist.Ts, c: "lit", n: "room", w: 1.5 }, { a: hist.Te, c: "blue", n: "evap" }, { a: hist.Tc, c: "red", n: "cond" }, { a: hist.Tamb, c: "lo", n: "ambient", dash: 1 }], { min: -20, max: 60 }, i);
    plot("press", [{ a: hist.Pc, c: "red", n: "discharge" }, { a: hist.Pe, c: "blue", n: "suction" }], { min: 0, max: 16 }, i);
    plot("power", [{ a: hist.Pv, c: "lit", n: "PV AC", w: 1.4 }, { a: hist.Pload, c: "mid", n: "load" }, { a: hist.Pgrid, c: "red", n: "grid" }], { min: 0, max: 12 }, i);
    plotPH(r);
  }
};
function frame(now) {
  const dtReal = Math.min(0.1, (now - (tNow || now)) / 1000); tNow = now;
  if (ctl.play) { accum += dtReal * ctl.rate * (3600 / DT); let n = 0; while (accum >= 1 && n++ < 400) { advance(); accum -= 1; } }
  update(dtReal); const again = visible && (ctl.play || dirty); dirty = false; raf = again ? requestAnimationFrame(frame) : 0;
}
const kick = () => { dirty = true; if (!raf && visible) { tNow = 0; raf = requestAnimationFrame(frame); } };
document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) kick(); });


// ---------- modules: arm / disarm / detach / attach, with editable specifications ----------
const CY = { ...DATA.cycle }, mst = { pv: "armed", inv: "armed", comp: "armed", cond: "armed", evap: "armed", store: "armed", grid: "armed", room: "armed" };
const FLAG = { pv: "m_pv", inv: "m_inv", comp: "m_comp", cond: "m_cond", evap: "m_evap", store: "m_store", grid: "m_grid" };
function syncFlags() { for (const [m, f] of Object.entries(FLAG)) pl[f] = mst[m] === "armed"; }
// field: [key, label, unit, target, min, max, step, scale (display = internal x scale)]
const MODS = [
  { id: "pv", name: "PV array", fields: [["P_pv_kwp", "Rated DC power", "kWp", pl, 2, 30, 1, 1]], note: () => `Peak AC at 1000 W/m², 25 °C: ${f1(sim.inverter(sim.pvdc(1000, 25, pl), pl.P_inv), 1)} kW · ≈ ${f1(pl.P_pv_kwp / 0.2, 0)} m² of 200 W/m² modules` },
  { id: "inv", name: "Inverter", fields: [["P_inv", "AC rating", "kW", pl, 3, 20, 1, 1]], note: () => `Efficiency at rating: ${f1(100 * sim.inverter(pl.P_inv, pl.P_inv) / pl.P_inv, 1)} % · DC/AC ratio ${f1(pl.P_pv_kwp / pl.P_inv, 2)}` },
  { id: "comp", name: "Compressor, motor, VFD", fields: [["swept", "Swept volume (100 %)", "m³/h", CY, 15, 80, 1, 3600], ["motor_rated", "Motor rating", "kW", CY, 3, 15, 0.5, 1], ["eta_is0", "Isentropic eff. at PR 1", "–", CY, 0.6, 0.85, 0.01, 1], ["clearance", "Clearance volume", "%", CY, 2, 10, 0.5, 100], ["min_on", "Min on-time", "min", pl, 1, 30, 1, 1 / 60], ["min_off", "Min off-time", "min", pl, 1, 30, 1, 1 / 60]],
    note: () => { const r = sim.interp(0, 2, 30, pl.cap, pl.eff); return `Rated duty (room 2 °C, 30 °C air, ${Math.round(pl.cap * 100)} % speed): ${f1(r[0], 1)} kW cooling, ${f1(r[1], 2)} kW electric, COP ${f1(r[0] / r[1], 2)}, discharge ${f1(r[12], 0)} °C`; } },
  { id: "cond", name: "Condenser + receiver", fields: [["UA_cond0", "UA at full fan", "kW/K", CY, 0.8, 5, 0.1, 1], ["Qc_rated", "Rated heat rejection", "kW", CY, 8, 40, 1, 1], ["fan_cond", "Fan power (full)", "kW", CY, 0.3, 3, 0.1, 1], ["Tc_min", "Head-pressure floor", "°C", CY, 10, 35, 1, 1]],
    note: () => { const r = sim.interp(0, 2, 30, pl.cap, pl.eff); return `At rated duty: condensing ${f1(r[5], 1)} °C (${f1(r[7], 1)} bar), rejects ${f1(r[2], 1)} kW, fan ${f1(r[3], 2)} kW`; } },
  { id: "evap", name: "Evaporator (unit cooler)", fields: [["UA_chamber", "Coil UA", "kW/K", CY, 0.8, 5, 0.1, 1], ["P_evfan", "Fan power", "kW", pl, 0.1, 1, 0.05, 1]],
    note: () => { const r = sim.interp(0, 2, 30, pl.cap, pl.eff); return `At rated duty: evaporating ${f1(r[4], 1)} °C (${f1(r[6], 2)} bar), ΔT to room ${f1(2 - r[4], 1)} K`; } },
  { id: "store", name: "Thermal store (ice bank)", fields: [["T_pcm", "Melt point", "°C", pl, -8, -1, 1, 1], ["Q_dis_max", "Max discharge", "kW", pl, 2, 15, 0.5, 1], ["UA_store", "Plate UA (charging)", "kW/K", CY, 0.5, 4, 0.1, 1], ["P_pump", "Pump power", "kW", pl, 0.05, 0.6, 0.05, 1]],
    note: () => { const r = sim.interp(1, pl.T_pcm, 30, pl.cap, pl.eff); return `Capacity ${pl.store_kwh} kWh_th (slider) · charging at ${Math.round(pl.cap * 100)} % speed: ${f1(r[0], 1)} kW, Te ${f1(r[4], 1)} °C, COP ${f1(r[0] / r[1], 2)} · ${pl.store_kwh > 0 ? f1(pl.store_kwh / pl.Q_dis_max, 1) : 0} h at max discharge`; } },
  { id: "grid", name: "Grid connection", fields: [["price_export", "Export price", "$/kWh", pl, 0, 0.2, 0.01, 1]], note: () => "Import unlimited. Tariff $0.10 off-peak (22–06), $0.16 shoulder, $0.30 peak (17–21). Opening it islands the plant." },
  { id: "room", name: "Cold room (fixed)", fixed: true, fields: [["C_s", "Thermal mass", "kJ/K", pl, 3000, 30000, 500, 1], ["UA_env", "Envelope UA", "kW/K", pl, 0.03, 0.3, 0.01, 1], ["T_set", "Setpoint", "°C", pl, 0, 4, 0.5, 1], ["T_hi", "Product limit", "°C", pl, 2, 8, 0.5, 1]], note: () => `Time constant ${f1(pl.C_s / pl.UA_env / 3600, 1)} h with the plant off · ±1 K = ${f1(pl.C_s / 3600, 1)} kWh_th` },
];
const work = {}; MODS.forEach((m) => { work[m.id] = {}; m.fields.forEach(([k, , , t, , , , sc]) => (work[m.id][k] = t[k] * sc)); });
const fieldDirty = (m) => m.fields.some(([k, , , t, , , , sc]) => Math.abs(work[m.id][k] - t[k] * sc) > 1e-9);
let mapDirty = false;
function applySpecs(m) {
  m.fields.forEach(([k, , , t, lo, hi, , sc]) => { const v = clamp(work[m.id][k], lo, hi); work[m.id][k] = v; if (t === CY) mapDirty = true; t[k] = v / sc; });
  if (mapDirty) { mapDirty = false; sim.setMap(sim.tools.buildMap(CY)); }
  const n = ["comp", "cond", "evap", "store"].includes(m.id); if (n) lastIce = -1;
}
const cardOf = (id) => $(`[data-card="${id}"]`);
function renderMods() {
  $("[data-modules]").innerHTML = MODS.map((m) => {
    const s = mst[m.id], armed = s === "armed";
    const btns = m.fixed ? "" : `<div class="btns">${s === "detached" ? `<button data-do="attach" data-id="${m.id}">Attach</button><button disabled>Arm</button>` : `<button data-do="${armed ? "disarm" : "arm"}" data-id="${m.id}">${armed ? "Disarm" : "Arm"}</button><button data-do="detach" data-id="${m.id}">Detach</button>`}</div>`;
    const fields = m.fields.map(([k, l, u, , lo, hi, st, sc]) => `<label class="f"><span>${l} <small>${u}</small></span><input type="number" data-id="${m.id}" data-k="${k}" min="${lo}" max="${hi}" step="${st}" value="${+work[m.id][k].toFixed(4)}" ${armed && !m.fixed ? "disabled" : ""}></label>`).join("");
    return `<div class="vcr-mod" data-card="${m.id}"><h4>${m.name}<span class="chip ${m.fixed ? "armed" : s}">${m.fixed ? "fixed" : s}</span></h4>${btns}<details><summary>Specification <span class="pend" data-pend="${m.id}"></span></summary>${fields}<div class="note" data-note="${m.id}"></div>${m.fixed || !armed ? "" : '<div class="note">Disarm to edit (lock-out before changes).</div>'}</div></details></div>`;
  }).join("");
  paintScene(); refreshNotes();
}
function refreshNotes() { MODS.forEach((m) => { const n = $(`[data-note="${m.id}"]`), p = $(`[data-pend="${m.id}"]`); if (n) n.textContent = m.note(); if (p) p.textContent = fieldDirty(m) ? "· edits pending (applied on Arm)" : ""; }); }
function bindScene() {
  pipes = $$(".pipe-flow"); wires = $$(".wire-flow"); cells = $$(".pvcell"); ice = $$('[data-part="ice"]'); rays = $('[data-part="rays"]');
  rays.innerHTML = Array.from({ length: 10 }, () => "<line/>").join(""); rayEls = $$("line", rays);
  fanC = $('[data-part="fanC"]'), fanE = $$('[data-part="fanE"]'), shaft = $('[data-part="shaft"]'), thermo = $('[data-part="thermo"]'), gauges = $$('[data-part="gauge"]'), meter = $('[data-part="meterneedle"]');
  vtxt = $('[data-part="vfdtext"]'); vtxt.setAttribute("transform", sideMatrix([-76, 82], 24, PJ, "right")); vtxt.setAttribute("text-anchor", "middle");
  gauges.forEach((g) => {
    const cx = +g.dataset.cx, cz = +g.dataset.cz; let d = "";
    for (let i = 0; i <= 12; i++) { const a = (225 - (270 * i) / 12) * Math.PI / 180, r0 = i % 3 ? 7.4 : 6.6; d += `M${A([cx + r0 * Math.cos(a), 65.2, cz + r0 * Math.sin(a)]).join(" ")}L${A([cx + 8.4 * Math.cos(a), 65.2, cz + 8.4 * Math.sin(a)]).join(" ")}`; }
    const hub = A([cx, 65.2, cz]);
    g.innerHTML = `<path class="iso-line" data-tone="mid" d="${d}"/><path class="iso-line needle" data-tone="lit" style="stroke-width:1.2"/><circle r="1.3" cx="${hub[0]}" cy="${hub[1]}" style="fill:var(--anatomy-mid)"/>`;
  });
  
  tagsG = document.createElementNS("http://www.w3.org/2000/svg", "g"); $("svg.vcr").appendChild(tagsG); lastIce = -1;
}
function rotateOverview(az, el) { LIB.SC.setView(az, el); PJ = LIB.SC.getP(); view = vecOf(PJ); $("svg.vcr").innerHTML = LIB.SC.sceneSvg(); bindScene(); paintScene(); kick(); }
function paintScene() {
  let t = "";
  for (const id of Object.keys(FLAG)) {
    const s = mst[id], els = $$(`svg.vcr [data-mod="${id}"]`); els.forEach((e) => { e.classList.toggle("dis", s === "disarmed"); e.classList.toggle("det", s === "detached"); });
    const [x, y, z] = SCENE.ANCH[id], a = A([x, y, z]), fl = A([x, y, 0]);
    if (s === "detached") t += `<g class="tag"><ellipse class="sock" cx="${fl[0]}" cy="${fl[1]}" rx="30" ry="15"/><text x="${fl[0]}" y="${fl[1] + 4}">DETACHED · socket</text></g>`;
    if (s === "disarmed") t += `<g class="tag"><rect x="${a[0] - 4}" y="${a[1] - 2}" width="8" height="6" rx="1"/><path d="M${a[0] - 2.5} ${a[1] - 2}v-2a2.5 2.5 0 0 1 5 0v2"/><text x="${a[0]}" y="${a[1] + 12}">LOCKED OUT</text></g>`;
  }
  tagsG.innerHTML = t;
  $$("[data-pipe-solid]").forEach((e) => e.classList.toggle("off", !pipeOK(e.dataset.pipeSolid)));
  $$(".vcr-mod").forEach((c) => c.classList.toggle("sel", c.dataset.card === selMod));
}
let selMod = "";
function alerts() {
  const a = [], m = mst; if (m.comp !== "armed" || m.cond !== "armed") a.push("Compressor interlock open (" + [m.comp !== "armed" && "compressor", m.cond !== "armed" && "condenser"].filter(Boolean).join(" + ") + " out): no refrigeration; the room warms toward ambient.");
  if (m.evap !== "armed") a.push("Evaporator out of service: the room cannot be cooled by the compressor.");
  if (m.store !== "armed" && ctl.mode === "storage") a.push("Thermal store isolated: running as solar-priority without storage.");
  if (m.pv !== "armed" || m.inv !== "armed") a.push("No solar path (" + [m.pv !== "armed" && "PV", m.inv !== "armed" && "inverter"].filter(Boolean).join(" + ") + " out): all electricity from the grid.");
  if (m.grid !== "armed") a.push("Islanded: the compressor starts only when PV covers it; unserved load is counted.");
  if (m.comp === "armed" && m.cond === "armed") {                       // interface checks at design duty (room 2 °C, 35 °C air, speed cap)
    const q = sim.interp(0, 2, 35, pl.cap, pl.eff), wsh = q[2] - q[0];
    if (wsh > CY.motor_rated * 1.05) a.push(`Interface: shaft power ${wsh.toFixed(1)} kW exceeds the ${CY.motor_rated} kW motor.`);
    if (q[2] > CY.Qc_rated * 1.1) a.push(`Interface: heat rejection ${q[2].toFixed(1)} kW exceeds the ${CY.Qc_rated} kW condenser rating.`);
    if (q[3] + q[1] > pl.P_inv * 1.5 + 8) a.push("Interface: compressor draw is large against the supply.");
  }
  const ratio = pl.P_pv_kwp / pl.P_inv; if (m.pv === "armed" && m.inv === "armed" && (ratio > 1.5 || ratio < 0.9)) a.push(`Interface: DC/AC ratio ${ratio.toFixed(2)} is outside 0.9 to 1.5.`);
  const r = last; if (r && r.Ts > pl.T_hi) a.push("Room " + r.Ts.toFixed(1) + " °C is above the " + pl.T_hi + " °C product limit.");
  const h = a.map((x) => `<div>${x}</div>`).join(""), el = $("[data-alerts]"); if (el.innerHTML !== h) el.innerHTML = h;
}
$("[data-modules]").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-do]"); if (!b) return; const id = b.dataset.id, m = MODS.find((x) => x.id === id), d = b.dataset.do;
  if (d === "disarm") mst[id] = "disarmed"; else if (d === "detach") mst[id] = "detached"; else if (d === "attach") mst[id] = "disarmed";
  else if (d === "arm") { applySpecs(m); mst[id] = "armed"; }
  const open = $$("details[open]", $("[data-modules]")).map((x) => x.closest("[data-card]").dataset.card); renderMods(); open.forEach((i) => { const dd = $("details", cardOf(i)); if (dd) dd.open = true; }); kick();
});
$("[data-modules]").addEventListener("input", (e) => {
  const i = e.target.closest("input[data-k]"); if (!i) return; const m = MODS.find((x) => x.id === i.dataset.id); work[m.id][i.dataset.k] = +i.value;
  if (m.fixed) applySpecs(m); refreshNotes(); kick();
});
$("svg.vcr").addEventListener("click", (e) => { const g = e.target.closest("[data-mod]"); if (!g) return; selMod = g.dataset.mod; paintScene(); const c = cardOf(selMod); if (c) { $("details", c).open = true; c.scrollIntoView({ block: "nearest", behavior: "smooth" }); } });
bindScene(); renderMods(); syncFlags();

// ---------- controls ----------
const fmt = { G: (v) => v + " W/m²", Tmean: (v) => v + " °C", demand: (v) => "×" + (+v).toFixed(2), cap: (v) => Math.round(v * 100) + "%", eff: (v) => "×" + (+v).toFixed(2), store: (v) => (v > 0 ? v + " kWh" : "none"), rate: (v) => v + " h/s" };
const syncC = (id, val, src) => { ctl[id] = +val; $$(`[data-v="${id}"]`).forEach((l) => (l.textContent = fmt[id](+val))); $$(`[data-c="${id}"]`).forEach((i) => { if (i !== src) i.value = val; }); syncPlant(); lastIce = -1; kick(); };
$$("[data-c]").forEach((inp) => inp.addEventListener("input", () => syncC(inp.dataset.c, inp.value, inp))); $$("[data-c]").forEach((inp) => syncC(inp.dataset.c, inp.value, inp));
$$("[data-mode]").forEach((b) => b.addEventListener("click", () => { ctl.mode = b.dataset.mode; $$("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); restart(); last = null; lastIce = -1; advance(); kick(); }));
$$("[data-act=play]").forEach((bt) => bt.addEventListener("click", () => { ctl.play = !ctl.play; $$("[data-act=play]").forEach((x) => (x.textContent = ctl.play ? "Pause" : "Play")); kick(); }));
$$("[data-act=reset]").forEach((bt) => bt.addEventListener("click", () => { restart(); last = null; lastIce = -1; advance(); kick(); }));
if (still.matches) $$("[data-act=play]").forEach((x) => (x.textContent = "Play"));
$$("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.mode === ctl.mode)));
advance(); if (!ctl.play) for (let i = 0; i < 360; i++) advance();
kick();
window.__vcr = { ctl, get last() { return last; }, get tot() { return tot; }, get idx() { return idx; }, step: (n = 1) => { for (let i = 0; i < n; i++) advance(); kick(); } };
