// Verifies the browser port against the Python reference day. Run: node web/parity.mjs
import { readFileSync } from "node:fs"; import { createRequire } from "node:module";
const require = createRequire(import.meta.url); const SVCR = require("./sim.js");
const D = JSON.parse(readFileSync(new URL("./model-data.json", import.meta.url))), ref = JSON.parse(readFileSync(new URL("../results/reference_day.json", import.meta.url)));
const sim = SVCR.make(D), pl = { ...D.plant, store_kwh: 30 }; let worst = 0;
for (const pol of ["fixed", "solar", "storage"]) {
  const st = sim.newState(pl, pol); let eg = 0, dT = 0, dF = 0, dP = 0;
  ref.day.t.forEach((_, i) => {
    const r = sim.step(pol, st, { G: ref.day.G[i], Tamb: ref.day.Tamb[i], Q: ref.day.Qproc[i] }, pl, ref.day.dt);
    dT = Math.max(dT, Math.abs(r.Ts - ref[pol].Ts[i])); dF = Math.max(dF, Math.abs(r.f - ref[pol].f[i])); dP = Math.max(dP, Math.abs(r.Pgrid - ref[pol].Pgrid[i])); eg += r.Pgrid * ref.day.dt / 3600;
  });
  const dE = Math.abs(eg - ref[pol].metrics.E_grid); worst = Math.max(worst, dT, dF, dP, dE);
  console.log(pol.padEnd(8), "max|dTs|", dT.toExponential(1), "max|df|", dF.toExponential(1), "max|dPgrid|", dP.toExponential(1), "dE_grid", dE.toExponential(1), "kWh");
}
// module-state scenarios (grid islanded, store/condenser/evaporator/inverter removed)
for (const [key, v] of Object.entries(ref).filter(([k]) => k.startsWith("sc_"))) {
  const p2 = { ...pl, ...v.mods }, st = sim.newState(p2, v.policy); let dT = 0, dU = 0;
  ref.day.t.forEach((_, i) => { const r = sim.step(v.policy, st, { G: ref.day.G[i], Tamb: ref.day.Tamb[i], Q: ref.day.Qproc[i] }, p2, ref.day.dt); dT = Math.max(dT, Math.abs(r.Ts - v.Ts[i])); dU = Math.max(dU, Math.abs(r.Punsrv - v.Punsrv[i]), Math.abs(r.Pgrid - v.Pgrid[i])); });
  worst = Math.max(worst, dT, dU); console.log(key.padEnd(10), "max|dTs|", dT.toExponential(1), "max|dP|", dU.toExponential(1));
}
// browser-side cycle solver vs the Python map (same equations, rebuilt in JS)
{ const T = sim.tools.buildMap(D.cycle), P = D.map.data; let rel = 0; for (let i = 0; i < P.length; i++) rel = Math.max(rel, Math.abs(T[i] - P[i]) / Math.max(1, Math.abs(P[i]))); console.log("JS cycle map vs Python map: max rel diff", rel.toExponential(1)); worst = Math.max(worst, rel); }
if (worst > 1e-3) { console.error("PARITY FAILED", worst); process.exit(1); } console.log("parity ok (worst", worst.toExponential(1) + ")");
