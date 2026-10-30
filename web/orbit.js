// ---- 3D orbit controls: every drawing is re-projected from its 3D model at the chosen azimuth/elevation ----
const VW = {}; const ALLP = ["overview", ...ORDER_IDS];
const BASE = { overview: [LIB.SC.WIDTH, LIB.SC.HEIGHT] };
function applyView(id) {
  const v = VW[id], st = v.stage, svg = st.querySelector("svg"); if (!v.dirty) return; v.dirty = false;
  if (id === "overview") rotateOverview(v.az, v.el);
  else { const F = LIB.PG.PAGES[id]({ azimuth: v.az, elevation: v.el }); PJS[id] = F.P; svg.innerHTML = F.render(); }
  svg.style.setProperty("--z", v.zoom); const [W, H] = v.wh, z = v.zoom, w = W / z, h = H / z, cx = W / 2 + v.px, cy = H / 2 + v.py; svg.setAttribute("viewBox", `${cx - w / 2} ${cy - h / 2} ${w} ${h}`);
}
const ZMIN = 0.6, ZMAX = 24;
function mountOrbit(id, stage) {
  const svg = stage.querySelector("svg"), vb = svg.getAttribute("viewBox").split(" ").map(Number), v = (VW[id] = { az: 36, el: 30, zoom: 1, px: 0, py: 0, auto: false, dirty: false, stage, wh: [vb[2], vb[3]] });
  stage.style.touchAction = "none"; stage.style.cursor = "grab"; const ptrs = new Map(); let drag = null, pinch = null;
  const poke = () => { v.dirty = true; kick(); };
  const toSvg = (cx, cy) => { const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy; const m = svg.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : { x: v.wh[0] / 2, y: v.wh[1] / 2 }; };
  const zoomAt = (cx, cy, nz) => { nz = clamp(nz, ZMIN, ZMAX); const p = toSvg(cx, cy), W = v.wh[0], H = v.wh[1], k = v.zoom / nz;   // keep the point under the cursor fixed
    const ox = W / 2 + v.px, oy = H / 2 + v.py; v.px = p.x - (p.x - ox) * k - W / 2; v.py = p.y - (p.y - oy) * k - H / 2; v.zoom = nz; poke(); };
  const info = () => { const e = bar.querySelector("[data-zv]"); if (e) e.textContent = "×" + v.zoom.toFixed(v.zoom < 10 ? 1 : 0); };
  stage.addEventListener("pointerdown", (e) => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); stage.setPointerCapture(e.pointerId); stage.style.cursor = "grabbing";
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: v.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; drag = null; }
    else drag = { x: e.clientX, y: e.clientY, az: v.az, el: v.el, px: v.px, py: v.py, pan: e.shiftKey || e.button === 2 || e.button === 1 }; });
  stage.addEventListener("pointermove", (e) => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.z * d / Math.max(pinch.d, 1)); info(); return; }
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y, m0 = svg.getScreenCTM(), sc = m0 ? 1 / m0.a : 1;
    if (drag.pan) { v.px = drag.px - dx * sc; v.py = drag.py - dy * sc; } else { v.az = drag.az - dx * 0.45; v.el = clamp(drag.el + dy * 0.35, 5, 89); } poke(); });
  const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { drag = null; stage.style.cursor = "grab"; } };
  stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up); stage.addEventListener("contextmenu", (e) => e.preventDefault());
  stage.addEventListener("wheel", (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, v.zoom * Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0022))); info(); }, { passive: false });
  stage.addEventListener("dblclick", (e) => { zoomAt(e.clientX, e.clientY, e.shiftKey ? v.zoom / 2.5 : v.zoom * 2.5); info(); });
  const set = (az, el) => { v.az = az; v.el = el; poke(); };
  const bar = document.createElement("div"); bar.className = "vtools";
  bar.innerHTML = `<span>Drag: rotate · wheel / pinch / double-click: zoom to the cursor · Shift-drag: pan</span><b data-zv>×1.0</b><button data-v="iso">3D</button><button data-v="top">Top</button><button data-v="front">Front</button><button data-v="side">Side</button><button data-v="in">+</button><button data-v="out">−</button><button data-v="fit">Fit</button><button data-v="auto">Spin</button><button data-v="full">Expand</button><button data-v="reset">Reset</button>`;
  stage.insertAdjacentElement("afterend", bar); const plate = stage.closest(".iso-plate") || stage.parentElement;
  const center = () => { const r = stage.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  bar.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const a = b.dataset.v;
    if (a === "iso") set(36, 30); else if (a === "top") set(36, 89); else if (a === "front") set(90, 6); else if (a === "side") set(0, 6);
    else if (a === "in") zoomAt(...center(), v.zoom * 1.6); else if (a === "out") zoomAt(...center(), v.zoom / 1.6);
    else if (a === "fit") { v.zoom = 1; v.px = v.py = 0; poke(); }
    else if (a === "reset") { v.zoom = 1; v.px = v.py = 0; v.auto = false; bar.querySelector('[data-v="auto"]').classList.remove("on"); set(36, 30); }
    else if (a === "auto") { v.auto = !v.auto; b.classList.toggle("on", v.auto); poke(); }
    else if (a === "full") { const on = plate.classList.toggle("fs"); b.classList.toggle("on", on); b.textContent = on ? "Close" : "Expand"; document.body.style.overflow = on ? "hidden" : ""; poke(); }
    info(); });
  v.info = info; v.zoomAt = zoomAt;
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { const f = $(".iso-plate.fs"); if (f) { f.classList.remove("fs"); document.body.style.overflow = ""; const b = f.querySelector('[data-v="full"]'); if (b) { b.textContent = "Expand"; b.classList.remove("on"); } } } });
ALLP.forEach((id) => { const st = $(`[data-page="${id}"] .iso-stage`); if (st) mountOrbit(id, st); });
let lastSpin = 0;
setInterval(() => { const v = VW[activePage]; if (!v || !v.auto) return; v.az += 4; v.dirty = true; kick(); }, 90);
const frame0 = frame; // the main loop already runs while anything is dirty or playing; rebuild inside it
const _update = update; update = function (dt) { const v = VW[activePage]; if (v && v.dirty) applyView(activePage); _update(dt); };
window.__zoom = (id, z, fx = 0.5, fy = 0.5) => { const v = VW[id], r = v.stage.getBoundingClientRect(); v.zoomAt(r.left + r.width * fx, r.top + r.height * fy, z); v.info(); applyView(id); };
window.__rot = (id, az, el) => { const v = VW[id]; v.az = az; v.el = el; v.dirty = true; applyView(id); };

document.addEventListener("click", (e) => { const b = e.target.closest(".tabs button[data-tab]"); if (!b) return; const w = b.closest("[data-tabs]"); if (!w) return;
  w.querySelectorAll(".tabs button[data-tab]").forEach((x) => x.classList.toggle("on", x === b)); w.querySelectorAll("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.tab)); });
