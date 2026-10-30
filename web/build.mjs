// Builds the standalone interactive page: node web/build.mjs [--light]
import { writeFileSync, readFileSync } from "node:fs"; import { dirname, join } from "node:path"; import { fileURLToPath } from "node:url";
import * as k from "../anatomy/kit/iso-kit.mjs"; import { kitScript } from "../anatomy/scripts/inline-kit.mjs";
import { PAGES } from "./pages.mjs"; import { sceneSvg as _s } from "./scene.mjs"; import { DOCS, ORDER } from "./docs.mjs"; import { sceneSvg, WIDTH, HEIGHT, P, ROUTES, WIRES, TUBES, TANK, PVZ, ANCH, PIPE_MODS, at } from "./scene.mjs";
const HERE = dirname(fileURLToPath(import.meta.url)), theme = "light";
const DATA = readFileSync(join(HERE, "model-data.json"), "utf8"), SIM = readFileSync(join(HERE, "sim.js"), "utf8"), LIVE = readFileSync(join(HERE, "live.js"), "utf8");
const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, className: "vcr", body: [sceneSvg()],
  label: "Isometric cutaway of a solar-assisted vapor-compression refrigeration plant: a cold room with a unit cooler, an ice-bank thermal store, a motor-driven compressor, an air-cooled condenser, a receiver, expansion valves, gauges, a PV canopy, an inverter and a grid connection. Red lines are the high-pressure side, blue lines the low-pressure side." });
const controls = `
<div class="vcr-alerts" data-alerts></div>
<div class="vcr-mods" data-modules></div>
<div class="vcr-panel">
  <div class="vcr-modes" role="radiogroup" aria-label="Operating mode">
    <button data-mode="fixed" aria-pressed="false">Grid-dominant</button><button data-mode="solar" aria-pressed="false">Solar-priority</button><button data-mode="storage" aria-pressed="true">Solar + thermal store</button>
  </div>
  <div class="vcr-sliders">
    <label>Irradiance peak <b data-v="G"></b><input type="range" data-c="G" min="0" max="1100" step="10" value="950"></label>
    <label>Mean ambient <b data-v="Tmean"></b><input type="range" data-c="Tmean" min="12" max="42" step="1" value="30"></label>
    <label>Cooling demand <b data-v="demand"></b><input type="range" data-c="demand" min="0.5" max="1.8" step="0.05" value="1"></label>
    <label>Compressor capacity cap <b data-v="cap"></b><input type="range" data-c="cap" min="0.3" max="1" step="0.05" value="1"></label>
    <label>Equipment efficiency <b data-v="eff"></b><input type="range" data-c="eff" min="0.8" max="1.1" step="0.05" value="1"></label>
    <label>Thermal store <b data-v="store"></b><input type="range" data-c="store" min="0" max="80" step="5" value="30"></label>
    <label>Clock rate <b data-v="rate"></b><input type="range" data-c="rate" min="0.5" max="8" step="0.5" value="2"></label>
  </div>
  <div class="vcr-clock"><button data-act="play">Pause</button><button data-act="reset">Restart day</button><span data-v="clock"></span></div>
</div>
<div class="vcr-grid" data-readouts></div>
<div class="vcr-plots"><figure><svg data-plot="temp" viewBox="0 0 300 150"></svg><figcaption>Temperatures, °C</figcaption></figure><figure><svg data-plot="press" viewBox="0 0 300 150"></svg><figcaption>Pressures, bar (abs)</figcaption></figure><figure><svg data-plot="power" viewBox="0 0 300 150"></svg><figcaption>Power, kW</figcaption></figure><figure><svg data-plot="ph" viewBox="0 0 300 150"></svg><figcaption>Cycle on the p–h plane</figcaption></figure></div>`;
const css = `
.vcr-alerts{width:100%;max-width:720px;margin:10px auto 0;font:12px/1.4 ui-sans-serif,system-ui,sans-serif;color:var(--anatomy-red)}.vcr-alerts:empty{display:none}.vcr-alerts div{border-left:2px solid var(--anatomy-red);padding:2px 8px;margin-top:3px}
.vcr-mods{width:100%;max-width:720px;margin:14px auto 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:8px;font:12px/1.4 ui-sans-serif,system-ui,sans-serif;color:var(--ui-text)}
.vcr-mod{border:1px solid var(--anatomy-faint);border-radius:8px;padding:8px}.vcr-mod.sel{border-color:var(--anatomy-lit)}.vcr-mod h4{margin:0 0 4px;font-size:12px;color:var(--anatomy-hi);display:flex;justify-content:space-between;gap:6px}.vcr-mod .chip{font-weight:500;font-size:10px;text-transform:uppercase;letter-spacing:.06em}
.chip.armed{color:var(--anatomy-lit)}.chip.disarmed{color:var(--ui-text)}.chip.detached{color:var(--anatomy-red)}
.vcr-mod .btns{display:flex;gap:6px;margin:4px 0}.vcr-mod .btns button{flex:1;padding:5px 6px;border:1px solid var(--anatomy-lo);background:transparent;color:var(--ui-text);border-radius:6px;font:inherit;cursor:pointer}
.vcr-mod .btns button:hover{border-color:var(--anatomy-lit);color:var(--anatomy-lit)}
.vcr-mod details summary{cursor:pointer;color:var(--ui-sub)}.vcr-mod .f{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-top:4px}.vcr-mod .f input{width:76px;background:transparent;border:1px solid var(--anatomy-faint);border-radius:5px;color:var(--anatomy-hi);padding:2px 4px;font:inherit;text-align:right}
.vcr-mod .f input:disabled{opacity:.45}.vcr-mod .note{color:var(--ui-sub);margin-top:4px}.vcr-mod .pend{color:var(--anatomy-lit)}
svg.vcr [data-mod]{transition:transform .6s cubic-bezier(.3,.7,.2,1),opacity .4s;cursor:pointer}svg.vcr [data-mod].dis{opacity:.5}svg.vcr [data-mod].det{transform:translateY(-62px);opacity:.28}svg.vcr [data-pipe-solid]{transition:opacity .4s}svg.vcr [data-pipe-solid].off{opacity:.2}
svg.vcr .sock{fill:none;stroke:var(--anatomy-red);stroke-width:1;stroke-dasharray:3 3}svg.vcr .tag text{font:6.5px ui-sans-serif,system-ui;fill:var(--anatomy-red);text-anchor:middle}svg.vcr .tag path,svg.vcr .tag rect{fill:none;stroke:var(--anatomy-red);stroke-width:1}

.vcr-panel,.vcr-grid,.vcr-plots,.vcr-notes{width:100%;max-width:720px;margin:14px auto 0;font:12px/1.45 ui-sans-serif,system-ui,sans-serif;color:var(--ui-text)}
.vcr-modes{display:flex;gap:6px;flex-wrap:wrap}.vcr-modes button,.vcr-clock button{flex:1;padding:8px 10px;border:1px solid var(--anatomy-lo);background:transparent;color:var(--ui-text);border-radius:8px;font:inherit;cursor:pointer}
.vcr-modes button[aria-pressed=true]{border-color:var(--anatomy-lit);color:var(--anatomy-lit)}
.vcr-sliders{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px 16px;margin-top:10px}.vcr-sliders label{display:block}.vcr-sliders b{float:right;color:var(--anatomy-hi);font-weight:600}.vcr-sliders input{width:100%;accent-color:var(--anatomy-lit)}
.vcr-clock{display:flex;gap:8px;align-items:center;margin-top:8px}.vcr-clock span{flex:2;text-align:right;color:var(--anatomy-hi)}
.vcr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:6px}.vcr-grid div{border:1px solid var(--anatomy-faint);border-radius:8px;padding:6px 8px}.vcr-grid small{display:block;color:var(--ui-sub)}.vcr-grid b{font-size:15px;color:var(--anatomy-hi)}
.vcr-plots{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px}.vcr-plots figure{margin:0}.vcr-plots svg{width:100%;height:auto;border:1px solid var(--anatomy-faint);border-radius:8px}.vcr-plots figcaption{color:var(--ui-sub);margin-top:2px}
.vcr-plots text{font:7px ui-sans-serif,system-ui;fill:var(--ui-sub)}.vcr-plots .ax{stroke:var(--anatomy-faint);fill:none}
.vcr-notes table{width:100%;border-collapse:collapse}.vcr-notes td,.vcr-notes th{padding:3px 6px;border-bottom:1px solid var(--anatomy-faint);text-align:right}.vcr-notes th:first-child,.vcr-notes td:first-child{text-align:left}
.vcr-notes p{margin:8px 0}.sun-core{fill:none;stroke:var(--anatomy-lit);stroke-width:1.4}[data-part=rays] line{stroke:var(--anatomy-lit);stroke-width:1.2;stroke-linecap:round}
.pipe-flow[data-side=hp]{stroke:var(--anatomy-red)}.pipe-flow[data-side=lp]{stroke:var(--anatomy-blue)}[data-part=vfdled],[data-part=invled]{fill:var(--anatomy-lit)}[data-part=vfdtext]{font:3.4px ui-monospace,monospace;fill:var(--anatomy-lit)}
.wire-flow{animation-duration:900ms}svg.vcr .pvcell{opacity:.1}`;
const css4 = `
html{color-scheme:light}
.iso[data-theme="light"]{
  --anatomy-page:#dfe2e7;--anatomy-card:#ededed;--anatomy-paper:#ededed;--anatomy-face:#f6f8f9;--anatomy-top:#f6f8f9;
  --anatomy-shade-0:#cfd9e2;--anatomy-shade-1:#d6dde5;--anatomy-shade-2:#dfe2e7;--anatomy-shade-3:#e6e9ed;
  --anatomy-lit-top:#f6f8f9;--anatomy-lit-shade:#e8ecef;
  --anatomy-text:#36444b;--anatomy-strong:#263036;--anatomy-muted:#4b5b67;
  --anatomy-hi:#2b373e;--anatomy-mid:#72879a;--anatomy-lo:#9fb1bf;--anatomy-faint:#bdc9d7;--anatomy-lit:#1d272c;
  --anatomy-halo:#637889;--anatomy-halo-opacity:.32;--anatomy-dot:#2b373e;
  --anatomy-red:#b73a33;--anatomy-green:#2a8a63;--anatomy-blue:#2f6aa3;
  --ui-text:#36444b;--ui-sub:#4b5b67;
  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #3344550f,0 1px 1px -.5px #3344550a,0 3px 3px -1.5px #3344550a,0 6px 6px -3px #3344550a,0 12px 12px -6px #3344550a;
}
body.iso[data-theme="light"]{background:linear-gradient(180deg,#ededed 0%,#dfe2e7 40%,#cfd9e2 100%) fixed;color:var(--anatomy-text)}
.vcr-nav{background:#ededed;border-bottom-color:#bdc9d7}
.vcr-nav button[aria-current=true],.vcr-nav button.on{color:var(--anatomy-strong)}
`;
const body = k.plateHtml({ fig: "Fig 1", title: "Solar-assisted refrigeration plant", hint: "Drag the sliders: every control feeds the model", readout: "starting…",
  keys: [{ mark: "red", label: "High-pressure side (discharge, condenser, liquid)" }, { mark: "blue", label: "Low-pressure side (after the expansion valve, suction)" }, { mark: "lit", label: "Ice bank, cold-room thermometer and live electrical flow" }],
  caption: "Simulated plant: a 12 kWp PV canopy feeds a 10 kW inverter; compressor, fans and pump draw from the AC bus with the grid as balance. Pressures and temperatures come from the Python-derived performance map; nothing here is experimentally validated.",
  body: `<div class="iso-stage" role="img" aria-label="Plant cutaway">${svg}</div>` });
const E = JSON.parse(DATA).experiments.E1.summary, row = (lab, k2, f, d = 1) => `<tr><td>${lab}</td>${["fixed", "solar", "storage"].map((p) => `<td>${E[p][k2][0].toFixed(d)}${f ? "" : ""}</td>`).join("")}</tr>`;
const notes = `<div class="vcr-notes"><p><b>Python experiment (reference results, ${JSON.parse(DATA).experiments.E1.n_days} identical summer days, mean per day):</b></p><table><tr><th></th><th>Fixed</th><th>Solar</th><th>Solar+store</th></tr>${row("Grid import, kWh", "E_grid", 0)}${row("Cost, $", "cost", 0, 2)}${row("Solar fraction of load", "solar_frac", 0, 2)}${row("Peak grid, kW", "peak_grid", 0)}${row("Compressor starts", "starts", 0)}${row("Degree-hours above 4 °C", "degh_over", 0, 2)}</table><p>Simulated, simplified model (see the paper). Live page and Python agree to &lt;1e-3 kWh on the reference day (web/parity.mjs).</p></div>`;

const SLD = { G: ["Irradiance peak", 0, 1100, 10, 950], Tmean: ["Mean ambient", 12, 42, 1, 30], demand: ["Cooling demand", 0.5, 1.8, 0.05, 1], cap: ["Compressor capacity cap", 0.3, 1, 0.05, 1], eff: ["Equipment efficiency", 0.8, 1.1, 0.05, 1], store: ["Thermal store", 0, 80, 5, 30], rate: ["Clock rate", 0.5, 8, 0.5, 2] };
const sl = (id) => { const [l, mn, mx, st, v] = SLD[id]; return `<label>${l} <b data-v="${id}"></b><input type="range" data-c="${id}" min="${mn}" max="${mx}" step="${st}" value="${v}"></label>`; };
const modeRow = `<div class="vcr-modes" role="radiogroup" aria-label="Operating mode"><button data-mode="fixed" aria-pressed="false">Grid-dominant</button><button data-mode="solar" aria-pressed="false">Solar-priority</button><button data-mode="storage" aria-pressed="true">Solar + thermal store</button></div>`;
const clockBtns = `<button data-act="play">Pause</button><button data-act="reset">Restart day</button><span data-v="clock"></span>`;
const PJS = {}, mods = [];
const eqRows = (d) => d.eqs.map(([t, f, key], i) => `<div class="eq"><div class="n">${i + 1} · ${t}</div><div class="f">${f}</div><div class="v" data-eq="${key}"></div></div>`).join("");
for (const id of ORDER) {
  const d = DOCS[id], F = PAGES[id](); PJS[id] = F.P;
  const fig = k.figureSvg({ width: F.W, height: F.H, className: "vcr-d", body: [F.render()], label: d.title + " detail drawing" });
  const plate = k.plateHtml({ fig: "Fig " + d.num.slice(1) + ".1", title: d.title, hint: "Live: values and motion come from the simulation", readout: "waiting…", keys: [{ mark: "red", label: "High pressure / hot" }, { mark: "blue", label: "Low pressure / cold" }, { mark: "lit", label: "Highlighted flow or state" }], caption: d.note || "", body: `<div class="iso-stage" role="img" aria-label="${d.title}">${fig}</div>` });
  const tiles = d.tiles.map(([key, lab]) => `<div><small>${lab}</small><b data-lv="${key}">–</b></div>`).join("");
  const plots = d.plots.map(([n, cap]) => `<figure><svg data-plot2="${n}" viewBox="0 0 300 150"></svg><figcaption>${cap}</figcaption></figure>`).join("");
  const states = d.states ? `<div class="chips">${d.states.map((x) => `<span data-st="${x}">${x === "idle" ? "Idle" : x === "room" ? "Room cooling" : "Store charging"}</span>`).join("<i>→</i>")}</div>` : "";
  const RELS = { pv: ["G", "Tmean"], inv: ["G", "Tmean"], comp: ["cap", "eff", "Tmean", "demand"], vfd: ["cap", "demand"], cond: ["Tmean", "cap", "eff"], recv: ["Tmean", "cap"], evap: ["demand", "cap", "Tmean"], store: ["store", "demand", "G"], grid: ["G", "demand"], room: ["demand", "Tmean"] };
  const pane = (t, h) => `<div data-pane="${t}" ${t === "eq" ? "" : "hidden"} class="tabpane">${h}</div>`;
  mods.push(`<section data-page="${id}" class="dash" hidden><div class="lc">${plate}<div class="params"><div class="ph"><b>${d.num} ${d.title}</b> · related parameters (shared with the whole plant)</div>${modeRow}<div class="vcr-sliders">${RELS[id].map(sl).join("")}</div><div class="vcr-clock">${clockBtns}</div>${states}</div></div>
<div class="rc" data-tabs><div class="vcr-grid pgt">${tiles}</div><div class="vcr-plots mp">${plots}</div><div class="tabs"><button class="on" data-tab="eq">Mathematics (live)</button><button data-tab="how">How it works</button><button data-tab="dsg">Detailed design</button></div>
${pane("eq", eqRows(d) + (d.note ? `<p class="nt">${d.note}</p>` : ""))}${pane("how", `<ol class="mech">${d.mech.map((m) => `<li>${m}</li>`).join("")}</ol><p class="lede">${d.lede}</p>`)}${pane("dsg", `<table class="dsg">${d.design.map(([a2, b2]) => `<tr><th>${a2}</th><td>${b2}</td></tr>`).join("")}</table>`)}</div></section>`);
}
const b64 = (f) => "data:image/png;base64," + readFileSync(join(HERE, "..", "figures", f)).toString("base64");
const J = JSON.parse(DATA).experiments, ST = J.storage_size;
const results = `<section data-page="results" class="dash res" hidden><div class="lc scr"><div class="pg"><div class="kick">Study</div><h2>Results of the policy comparison</h2><p class="lede">Three operating policies on identical weather and demand: fixed thermostat, solar-priority, and solar-priority with the ice-bank store. Simulated with the simplified model; not validated against measurements.</p>
<div class="vcr-notes" style="margin:0;max-width:none">${notes.replace('class="vcr-notes"', "")}</div>
<img class="rimg" alt="Policy comparison" src="${b64("fig2_policy_comparison.png")}"><p class="cap">Mean and spread over ${J.E1.n_days} identical days: grid import, cost and compressor starts.</p>
<img class="rimg" alt="Sensitivity" src="${b64("fig3_sensitivity.png")}"><p class="cap">Sensitivity to store size, solar availability, demand variability and ambient temperature.</p></div></div>
<div class="rc scr"><div class="pg"><img class="rimg" alt="Reference day" src="${b64("fig1_reference_day.png")}"><p class="cap">Reference day: irradiance and ambient, room temperature, grid import and ice-bank charge for the three policies.</p>
<img class="rimg" alt="Heat map" src="${b64("fig4_storage_vs_solar.png")}"><p class="cap">Grid saving against the fixed policy for store size and solar availability.</p>
<h3>What to read from it</h3><ul class="mech"><li>The store raises electricity use but cuts grid use and cost, because the extra energy is solar.</li><li>Returns from store size diminish after about 20 kWh.</li><li>Part of the solar-priority saving comes from the wider room band (0.5 to 3.5 °C) and partial-speed running; the baseline is a plain thermostat.</li><li>Demand variability had a small effect; hotter ambient reduces the benefit.</li></ul>
<h3>Verification</h3><ul class="mech"><li>15 Python tests: heat rejection = cooling + shaft work, room and store energy balances close to 1e-6, electrical accounting, analytic room warm-up, constraints, detached-module behaviour.</li><li>Browser model equals Python reference (≤ 2e-4); JS-built map equals the Python map to 5e-5.</li></ul></div></div></section>`;
const NAMES = { overview: "Overview", pv: "M1 PV", inv: "M2 Inverter", comp: "M3 Compressor", vfd: "M4 VFD", cond: "M5 Condenser", recv: "M6 Receiver + valve", evap: "M7 Evaporator", store: "M8 Store", grid: "M9 Grid", room: "M10 Room", results: "Results" };
const nav = `<nav class="vcr-nav">${["overview", ...ORDER, "results"].map((id) => `<button data-nav="${id}" aria-current="${id === "overview"}" onclick="location.hash='${id}'">${NAMES[id]}</button>`).join("")}</nav>`;
const css2 = `\n.vtools{max-width:720px;margin:6px auto 0;display:flex;gap:4px;align-items:center;flex-wrap:wrap;font:11px ui-sans-serif,system-ui,sans-serif;color:var(--ui-sub)}.vtools span{flex:1 1 220px}.vtools button{padding:3px 9px;border:1px solid var(--anatomy-faint);background:transparent;color:var(--ui-text);border-radius:6px;cursor:pointer;font:inherit}.vtools button.on{border-color:var(--anatomy-hi);color:var(--anatomy-hi);font-weight:600}\n.iso-stage{cursor:grab;user-select:none;overflow:hidden}.vtools b{color:var(--anatomy-hi);min-width:34px;text-align:right}\n.iso-plate.fs{position:fixed;inset:0;z-index:100;margin:0;max-width:none;width:auto;border-radius:0;background:var(--anatomy-paper);display:flex;flex-direction:column;overflow:auto}.iso-plate.fs .iso-stage{flex:1;min-height:0;max-width:none}.iso-plate.fs svg.iso-svg{width:100%;height:100%}
:root{color-scheme:light}
.vcr-nav{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:4px;padding:8px 6px;margin:0 auto;max-width:760px;background:var(--anatomy-paper);border-bottom:1px solid var(--anatomy-faint);font:12px ui-sans-serif,system-ui,sans-serif}
.vcr-nav button{flex:none;padding:4px 9px;border:1px solid var(--anatomy-faint);background:transparent;color:var(--ui-text);border-radius:999px;cursor:pointer;font:inherit}.vcr-nav button[aria-current=true]{border-color:var(--anatomy-hi);color:var(--anatomy-hi);font-weight:600}
[data-page][hidden]{display:none}.pg{max-width:720px;margin:16px auto 0;font:13px/1.55 ui-sans-serif,system-ui,sans-serif;color:var(--ui-text)}.pg h2{margin:2px 0 6px;font-size:22px;color:var(--anatomy-hi)}.pg h3{margin:22px 0 8px;font-size:14px;color:var(--anatomy-hi)}.kick{font:11px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--ui-sub)}.lede{font-size:14px;color:var(--ui-text)}
.pgt{margin-top:12px}.mech{padding-left:20px}.mech li{margin:5px 0}
.eq{border:1px solid var(--anatomy-faint);border-radius:8px;padding:8px 10px;margin:8px 0}.eq .n{font-size:11px;color:var(--ui-sub)}.eq .f{font:15px/1.5 "Cambria Math",Cambria,Georgia,serif;color:var(--anatomy-hi);margin:2px 0}.eq .v{font:11.5px/1.45 ui-monospace,Menlo,monospace;color:var(--anatomy-lit);word-break:break-word}
.dsg{width:100%;border-collapse:collapse}.dsg th,.dsg td{padding:6px 8px;border-bottom:1px solid var(--anatomy-faint);text-align:left;vertical-align:top}.dsg th{width:32%;color:var(--anatomy-hi);font-weight:600}
.chips{max-width:720px;margin:10px auto 0;display:flex;gap:6px;align-items:center;font:12px ui-sans-serif,system-ui,sans-serif;color:var(--ui-sub)}.chips span{padding:4px 10px;border:1px solid var(--anatomy-faint);border-radius:999px}.chips span.on{border-color:var(--anatomy-lit);color:var(--anatomy-lit);font-weight:600}
.lbl text{font:calc(9px / var(--z,1)) ui-sans-serif,system-ui,sans-serif;fill:var(--ui-text)}.lbl path{stroke:var(--anatomy-lo);fill:none;stroke-width:calc(.6px / var(--z,1))}.lbl circle{fill:var(--anatomy-hi);r:calc(1.6px / var(--z,1))}
.zr{fill:none;stroke-width:1.3}.z-hot{stroke:var(--anatomy-red)}.z-cnd{stroke:var(--anatomy-green,#2a9d8f)}.z-sub,.z-evp{stroke:var(--anatomy-blue)}.z-idle{stroke:var(--anatomy-lo)}
.rimg{width:100%;border:1px solid var(--anatomy-faint);border-radius:8px;margin-top:10px}.cap{font-size:12px;color:var(--ui-sub);margin:3px 0 0}
.vcr-grid small{font-size:11px}svg.vcr-d .dflow{animation-duration:1500ms}`;

const rd = (f) => readFileSync(join(HERE, f), "utf8"), stripM = (s) => s.replace(/^import [^;]*;\s*$/gm, "").replace(/^export \{[^}]*\};?\s*$/gm, "").replace(/^export (async )?(function|const|let|class) /gm, "$2 ");
const expNames = (f) => [...readFileSync(join(HERE, "..", "anatomy", "kit", f), "utf8").matchAll(/^export (?:function|const|let|class) (\w+)/gm)].map((m) => m[1]);
const LATHE = stripM(readFileSync(join(HERE, "..", "anatomy", "kit", "lathe.mjs"), "utf8"));
const LIBCODE = `const LIB = (() => { const k = { ${expNames("iso-kit.mjs").join(", ")} }, G = (() => { ${LATHE}\n return { ${expNames("lathe.mjs").join(", ")} }; })();
const DS = (() => { ${stripM(rd("dscene.mjs"))}\n return { Fig }; })();
const SC = (() => { ${stripM(rd("scene.mjs"))}\n return { sceneSvg, setView, getP: () => P, WIDTH, HEIGHT }; })();
const PG = (() => { const { Fig } = DS; ${stripM(rd("pages.mjs"))}\n return { PAGES, M3, M5, M6, M7, M8 }; })();
return { SC, PG }; })();`;
const ORBIT_JS = rd("orbit.js");

const css3 = `
html,body{height:100%;margin:0;overflow:hidden}body{max-width:none!important;width:100%!important;padding:0!important;margin:0!important}
main.iso-page{display:flex!important;flex-direction:column;height:100vh;max-width:none!important;width:100%!important;margin:0!important;padding:0!important;box-sizing:border-box}
.vcr-nav{position:static;flex:none;display:flex;flex-wrap:nowrap;gap:3px;width:100%;max-width:none;box-sizing:border-box;padding:6px 8px;margin:0;overflow-x:auto;scrollbar-width:none}
.vcr-nav button{flex:1 1 0;min-width:max-content;white-space:nowrap;padding:5px clamp(4px,.7vw,12px);font-size:clamp(10px,.82vw,13px)}
[data-page]{flex:1 1 0;min-height:0;min-width:0}
section.dash{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:10px;padding:6px 10px 8px;box-sizing:border-box;height:100%;width:100%}
section.dash[hidden]{display:none}
.lc,.rc{min-height:0;min-width:0;display:flex;flex-direction:column;gap:6px}.scr{overflow:auto}
.lc>.iso-figure,.lc>figure{flex:1 1 0;min-height:0;margin:0;max-width:none;width:100%;display:flex;flex-direction:column}
.iso-figure .iso-plate{flex:1 1 0;min-height:0;max-width:none;width:100%;display:flex;flex-direction:column;box-sizing:border-box}
.iso-figure .iso-stage{flex:1 1 0;min-height:0;max-width:none}.iso-figure .iso-stage svg{width:100%;height:100%}
.iso-figure figcaption,.iso-figure .iso-caption{display:none}.iso-figure .iso-keys{font-size:10.5px;gap:10px;margin-top:2px}
.params{flex:none;border:1px solid var(--anatomy-faint);border-radius:8px;padding:6px 8px;font:12px/1.35 ui-sans-serif,system-ui,sans-serif;color:var(--ui-text);max-height:34vh;overflow:auto}
.params .ph{margin-bottom:4px;color:var(--ui-sub)}.params .ph b{color:var(--anatomy-hi)}
.vcr-panel{max-width:none;margin:0}.vcr-sliders{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:4px 14px;margin-top:6px}.vcr-sliders label{font-size:11px}.vcr-modes{display:flex;gap:5px}.vcr-modes button,.vcr-clock button{padding:5px 8px;font-size:11.5px}
.vcr-clock{display:flex;gap:6px;align-items:center;margin-top:6px}.vcr-clock span{font-size:11px}
.tabs{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-bottom:5px}.tabs button{padding:4px 10px;border:1px solid var(--anatomy-faint);background:transparent;color:var(--ui-text);border-radius:6px;font:12px ui-sans-serif,system-ui,sans-serif;cursor:pointer}.tabs button.on{border-color:var(--anatomy-hi);color:var(--anatomy-hi);font-weight:600}
.tabs .vcr-alerts{flex:1;max-width:none;margin:0;font-size:11px}.tabpane{flex:1 1 0;min-height:0;overflow:auto;padding-right:4px}.rc[data-tabs]{overflow:hidden}.rc[data-tabs] .tabpane:not([hidden]){display:block}
.rc .vcr-grid{margin:0;max-width:none;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:4px}.vcr-grid div{padding:3px 6px;border-radius:6px}.vcr-grid small{font-size:10px;line-height:1.2}.vcr-grid b{font-size:13.5px}
.rc .vcr-plots{flex:1 1 0;min-height:0;max-width:none;margin:0;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:minmax(0,1fr);gap:6px}.rc .vcr-plots.mp{flex:0 0 40%}
.vcr-plots figure{margin:0;display:flex;flex-direction:column;min-height:0;min-width:0}.vcr-plots svg{flex:1 1 0;min-height:0;width:100%;height:100%}.vcr-plots figcaption{font-size:10.5px;margin-top:1px}
.rc .vcr-notes{flex:none;max-width:none;margin:0;font-size:11px}.rc .vcr-notes p:last-child{display:none}.rc .vcr-notes td,.rc .vcr-notes th{padding:2px 6px}
.vcr-mods{max-width:none;margin:0;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));max-height:none}.eq{margin:5px 0;padding:6px 9px}.eq .f{font-size:14px}.pg{margin:0 auto;max-width:none}.pg h2{font-size:19px}.nt{font-size:11.5px;color:var(--ui-sub)}
.chips{max-width:none;margin:6px 0 0}.vtools{max-width:none;margin:3px 0 0}.rimg{margin-top:6px}
@media (max-width:900px){html,body{overflow:auto;height:auto}main.iso-page{display:block!important;height:auto}[data-page]{height:auto}section.dash{grid-template-columns:1fr;grid-template-rows:auto;height:auto}.lc>.iso-figure{height:70vh}.rc .vcr-plots{grid-auto-rows:150px}.rc .vcr-plots.mp{flex:none}.params{max-height:none}.tabpane{overflow:visible}}`;
const PAGE_JS = readFileSync(join(HERE, "pages.js"), "utf8");
const panelHtml = `${modeRow}<div class="vcr-sliders">${["G", "Tmean", "demand", "cap", "eff", "store", "rate"].map(sl).join("")}</div><div class="vcr-clock">${clockBtns}</div>`;
const plots4 = `<figure><svg data-plot="temp" viewBox="0 0 300 150"></svg><figcaption>Temperatures, °C</figcaption></figure><figure><svg data-plot="press" viewBox="0 0 300 150"></svg><figcaption>Pressures, bar (abs)</figcaption></figure><figure><svg data-plot="power" viewBox="0 0 300 150"></svg><figcaption>Power, kW</figcaption></figure><figure><svg data-plot="ph" viewBox="0 0 300 150"></svg><figcaption>Cycle on the p–h plane</figcaption></figure>`;
const overview = `<section data-page="overview" class="dash"><div class="lc">${body}<div class="params" data-tabs><div class="tabs"><button class="on" data-tab="ctl">Controls</button><button data-tab="mods">Modules: arm, detach, edit</button><div class="vcr-alerts" data-alerts></div></div><div data-pane="ctl">${panelHtml}</div><div data-pane="mods" hidden><div class="vcr-mods" data-modules></div></div></div></div><div class="rc"><div class="vcr-grid" data-readouts></div><div class="vcr-plots">${plots4}</div>${notes}</div></section>`;
const page = k.pageHtml({ title: "Solar refrigeration plant: modules, maths and design", theme, width: 760,
  body: `<style>${css}${css2}${css3}${css4}</style>${nav}` + overview + mods.join("") + results,
  script: kitScript() + "\n" + LIBCODE + `\nconst ORDER_IDS = ${JSON.stringify(ORDER)};` + `\nconst DATA = ${DATA};\nconst SCENE = ${JSON.stringify({ P, ROUTES, WIRES, TUBES, TANK, PVZ, ANCH, PIPE_MODS })};\nconst PJS = ${JSON.stringify(PJS)};\n;\n` + SIM + "\n" + LIVE + "\n" + PAGE_JS + "\n" + ORBIT_JS });
writeFileSync(join(HERE, "plant.html"), page); console.log("wrote plant.html", Math.round(page.length / 1024), "kB");
