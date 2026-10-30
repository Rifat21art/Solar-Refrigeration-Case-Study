// Small helper for the per-module detail drawings (one local world per figure).
import * as k from "../anatomy/kit/iso-kit.mjs";
import * as G from "../anatomy/kit/lathe.mjs";
export { k, G };
export class Fig {
  constructor(W, H, pts, o = {}) { this.W = W; this.H = H; this.P = k.fitProjection(pts, W, H, { pad: o.pad ?? 30, azimuth: o.azimuth ?? 36, elevation: o.elevation ?? 30 }); this.items = []; this.top = []; this.under = []; }
  at(p) { return k.iso(p, this.P); }
  key(x, y, z, b = 0) { return k.depthOf([x, y, 0], this.P) + z * 0.35 + b; }
  add(x, y, z, svg, b = 0) { this.items.push({ key: this.key(x, y, z, b), svg }); }
  S(paths, st) { return k.solidSvg(paths, st); }
  L(d, st) { return k.lineSvg(d, st); }
  box(plan, z, h, tone = "mid", steps = 3, bevel = 0.5, extra = {}) { return k.solidSvg(k.slabOf(plan, z, h, this.P, steps, bevel), { tone, ...extra }); }
  cyl(x, y, r, z, h, tone = "mid", steps = 24, bevel = 0, extra = {}) { return k.solidSvg(k.cylinder(x, y, r, z, h, this.P, steps, bevel), { tone, ...extra }); }
  rod(a, b, r, tone = "mid", extra = {}) { const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); return k.solidSvg(G.disc(0, len, r, G.frameAlong(a, [(b[0] - a[0]) / len, (b[1] - a[1]) / len, (b[2] - a[2]) / len]), this.P), { tone, crease: "none", ...extra }); }
  ball(p, r, tone = "mid") { return k.solidSvg(G.sphereOf(p, r, this.P), { tone }); }
  seg(a, b, tone = "mid", extra = {}) { return k.lineSvg(k.segment(a, b, this.P), { tone, ...extra }); }
  path(pts, close = false) { return pts.map((p, i) => (i ? "L" : "M") + this.at(p).join(" ")).join("") + (close ? "Z" : ""); }
  dashed(pts, tone = "faint") { return `<path class="iso-line" data-tone="${tone}" style="stroke-dasharray:2 3" d="${this.path(pts)}"/>`; }
  flow(pts, tone, id, w = 1.2) { return `<path class="iso-line dflow" data-flow data-tone="${tone}" data-d="${id}" style="stroke-width:${w}" d="${this.path(pts)}"/>`; }
  poly(pts, tone = "mid", extra = {}) { const d = this.path(pts, true); return k.solidSvg({ fill: d, outline: d, crease: "", top: "", shades: [] }, { flat: true, tone, ...extra }) + `<path class="iso-line" data-tone="mid" style="stroke-width:1.1" d="${d}"/>`; }
  slot(x, y, z, id, b = 0.3) { this.add(x, y, z, `<g data-d="${id}"></g>`, b); }
  lbl(p, text, dx = 30, dy = -22, n) { const [x, y] = this.at(p), a = dx < 0 ? "end" : "start"; this.top.push(`<g class="lbl"><path d="M${x} ${y}L${x + dx} ${y + dy}${dx < 0 ? "h-6" : "h6"}"/><circle cx="${x}" cy="${y}" r="1.6"/><text x="${x + dx + (dx < 0 ? -9 : 9)}" y="${y + dy + 3}" text-anchor="${a}">${text}</text></g>`); }
  base(plan, z = 0, h = 6) { this.under.push(`<path class="iso-halo" d="${k.haloOf(plan, z - h, h, this.P)}"/>`, k.solidSvg(k.slabOf(plan, z - h, h, this.P, 6, 1.2), { tone: "mid" }), k.lineSvg(k.planOutline(k.insetPlan(plan, 4), z, this.P), { tone: "lo" })); }
  render() { return this.under.join("") + this.items.sort((a, b) => a.key - b.key).map((i) => i.svg).join("") + this.top.join(""); }
}
