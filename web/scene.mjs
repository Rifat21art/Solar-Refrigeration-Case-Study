// Geometry of the solar refrigeration plant (world units ~ 1 px; x,y floor, z up).
import * as k from "../anatomy/kit/iso-kit.mjs";
import * as G from "../anatomy/kit/lathe.mjs";

export const WIDTH = 760, HEIGHT = 470;
export const PLATE = { x: -300, y: -172, w: 690, d: 290, r: 10 };
const PH = 8;
const FIT = [...k.boxCorners(PLATE, -PH - 4, 0), [-285, -155, 96], [345, -150, 60], [90, -80, 100], [330, 90, 90], [120, 100, 60]];
export let P = k.fitProjection(FIT, WIDTH, HEIGHT, { pad: 22, azimuth: 36, elevation: 30 });
export function setView(az, el) { P = k.fitProjection(FIT, WIDTH, HEIGHT, { pad: 22, azimuth: az, elevation: el }); return P; }
export const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style), L = (d, style) => k.lineSvg(d, style), D = (pts, style) => k.dotsSvg(pts, style);
const key = (x, y, z = 0, bias = 0) => k.depthOf([x, y, 0], P) + z * 0.35 + bias;
const items = []; let curMod = "";
const add = (x, y, z, svg, bias = 0) => items.push({ key: key(x, y, z, bias), svg: !curMod ? svg : curMod.startsWith("pipe:") ? `<g data-pipe-solid="${curMod.slice(5)}">${svg}</g>` : `<g data-mod="${curMod}">${svg}</g>` });
const box = (plan, z, h, tone = "mid", steps = 3, bevel = 0.5, extra = {}) => S(k.slabOf(plan, z, h, P, steps, bevel), { tone, ...extra });
const cyl = (x, y, r, z, h, tone = "mid", steps = 24, bevel = 0, extra = {}) => S(k.cylinder(x, y, r, z, h, P, steps, bevel), { tone, ...extra });

// ---------- routes (centrelines) ----------
export const ROUTES = {
  dis: { side: "hp", pts: [[22, 20, 58], [22, 20, 70], [45, 20, 70], [45, -50, 70]] },
  cond: { side: "hp", pts: [[135, -50, 48], [135, -20, 48], [135, -20, 40]] },
  liq: { side: "hp", pts: [[125, -20, 10], [-110, -20, 10], [-110, -92, 10], [-110, -92, 38], [-123, -92, 38]] },
  feedH: { side: "hp", pts: [[-110, -60, 10], [-99, -60, 10]] },
  feedL: { side: "lp", pts: [[-91, -60, 10], [-81, -60, 10], [-81, -100, 10]] },
  lpIn: { side: "lp", pts: [[-131, -92, 38], [-135, -92, 38]] },
  lpOut: { side: "lp", pts: [[-135, -78, 54], [-108, -78, 54]] },
  ret: { side: "lp", pts: [[-90, -125, 58], [-108, -125, 58], [-108, -78, 58], [-108, -78, 54]] },
  suc: { side: "lp", pts: [[-108, -78, 54], [-108, 20, 54], [0, 20, 54]] },
};
const PIPE_R = 2.6;

function pipeSvg(name) {
  curMod = "pipe:" + name; const { pts } = ROUTES[name], out = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (len < 0.5) continue;
    const dir = [(b[0] - a[0]) / len, (b[1] - a[1]) / len, (b[2] - a[2]) / len];
    const F = G.frameAlong(a, dir);
    add((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, S(G.disc(0, len, PIPE_R, F, P), { tone: "mid", crease: "none" }), 0.4);
  }
  if (name === "feedH") add(-110, -60, 10, S(G.sphereOf([-110, -60, 10], PIPE_R * 1.3, P), { tone: "mid" }), 0.6);
  for (let i = 1; i + 1 < pts.length; i++) add(pts[i][0], pts[i][1], pts[i][2], S(G.sphereOf(pts[i], PIPE_R * 1.2, P), { tone: "mid" }), 0.5);
  curMod = "";
}
const flowLines = () => Object.entries(ROUTES).map(([n, r]) => `<path class="iso-line pipe-flow" data-pipe="${n}" data-side="${r.side}" data-flow d="${ROUTES[n].pts.map((p, i) => (i ? "L" : "M") + at(p).join(" ")).join("")}" style="stroke-width:1.1"/>`).join("");

// ---------- base ----------
function base() {
  const o = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PH - 4, PH, P)}"/>`];
  for (const [x, y] of [...k.corners(PLATE, 20)].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) {
    o.push(S(k.cylinder(x, y, 7, -PH - 4, 1.6, P, 28), { tone: "lo" }), S(k.cylinder(x, y, 5.4, -PH - 2.4, 2.4, P, 28), { tone: "mid" }));
  }
  o.push(S(k.slabOf(PLATE, -PH, PH, P, 8, 1.4), { tone: "mid" }));
  o.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const sc = k.corners(PLATE, 10);
  o.push(L(sc.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }), D(sc.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -150, y: PLATE.y + PLATE.d - 15, w: 380, d: 7, r: 1 };
  o.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  o.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }), D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // machine skid rails
  const skid = { x: -108, y: -4, w: 262, d: 100, r: 3 };
  o.push(S(k.slabOf(skid, 0, 4, P, 3, 0.5), { tone: "lo" }), L(k.planOutline(k.insetPlan(skid, 4), 4, P, 3), { tone: "faint" }));
  o.push(D(k.corners(skid, 6).map(([x, y]) => at([x, y, 4])), { size: 0.45 }));
  return o.join("");
}

// ---------- cold room (static shell) ----------
const ROOM = { x: -285, y: -155, w: 165, d: 165, r: 2 }, WALL_H = 92, WT = 8;
function roomShell() {
  const o = [];
  o.push(S(k.slabOf(ROOM, 0, 6, P, 3, 0.4), { tone: "mid" }), L(k.planOutline(k.insetPlan(ROOM, 6), 6, P, 3), { tone: "faint" }));
  const back = { x: ROOM.x, y: ROOM.y, w: ROOM.w, d: WT, r: 1 }, left = { x: ROOM.x, y: ROOM.y + WT, w: WT, d: ROOM.d - WT, r: 1 };
  o.push(box(back, 6, WALL_H, "mid", 2, 0.5), box(left, 6, WALL_H, "mid", 2, 0.5));
  // panel seams on the inner faces + sandwich-panel cap strips
  const seamsBack = [], seamsLeft = [];
  for (let x = ROOM.x + 30; x < ROOM.x + ROOM.w - 6; x += 30) seamsBack.push(k.rise([x, ROOM.y + WT, 0], 8, WALL_H + 4, P));
  for (let y = ROOM.y + WT + 28; y < ROOM.y + ROOM.d - 8; y += 28) seamsLeft.push(k.rise([ROOM.x + WT, y, 0], 8, WALL_H + 4, P));
  o.push(L(seamsBack.join(""), { tone: "faint" }), L(seamsLeft.join(""), { tone: "faint" }));
  o.push(L(k.segment([ROOM.x + WT, ROOM.y + WT, 60], [ROOM.x + ROOM.w, ROOM.y + WT, 60], P), { tone: "lo" }), L(k.segment([ROOM.x + WT, ROOM.y + WT, 60], [ROOM.x + WT, ROOM.y + ROOM.d, 60], P), { tone: "lo" }));
  // cam-lock dots on seams
  const dots = []; for (let x = ROOM.x + 30; x < ROOM.x + ROOM.w - 6; x += 30) dots.push(at([x - 3, ROOM.y + WT, 40]), at([x - 3, ROOM.y + WT, 78]));
  for (let y = ROOM.y + WT + 28; y < ROOM.y + ROOM.d - 8; y += 28) dots.push(at([ROOM.x + WT, y - 3, 40]), at([ROOM.x + WT, y - 3, 78]));
  o.push(D(dots, { size: 0.45 }));
  return o.join("");
}
function roomItems() {
curMod = "";   // sills (cut edge of front and right walls)
  add(-200, 6, 3, box({ x: ROOM.x + WT, y: ROOM.y + ROOM.d - 2, w: ROOM.w - WT, d: 8, r: 1 }, 6, 6, "lo", 2, 0.3), 1);
  add(-124, -70, 3, box({ x: ROOM.x + ROOM.w - 6, y: ROOM.y + WT, w: 6, d: ROOM.d - WT - 2, r: 1 }, 6, 6, "lo", 2, 0.3), 1);
curMod = "";   // crates
  const stacks = [[-262, -60, 3], [-262, -28, 2], [-236, -60, 2], [-236, -20, 3], [-214, 2, 1]];
  stacks.forEach(([x, y, n], j) => {
    for (let z = 0; z < n; z++) {
      const plan = { x, y, w: 30, d: 24, r: 1.2 };
      add(x + 15, y + 12, 6 + z * 14 + 7, box(plan, 6 + z * 14, 13, "mid", 2, 0.4) + L(k.planOutline(k.insetPlan(plan, 3), 6 + z * 14 + 13, P, 2), { tone: "faint" }) + L(k.lineOnTop([x + 15, y], [x + 15, y + 24], 6 + z * 14 + 13, P), { tone: "lo" }));
    }
  });
curMod = "evap";   // evaporator unit cooler on legs
  const EV = { x: -205, y: -118, w: 70, d: 30, r: 3 };
  for (const [x, y] of k.corners(EV, 5)) add(x, y, 15, cyl(x, y, 2.6, 6, 24, "mid", 14), -0.5);
  add(-170, -103, 46, box({ x: EV.x - 2, y: EV.y - 2, w: EV.w + 4, d: EV.d + 4, r: 3 }, 30, 4, "lo", 3, 0.4), -0.2);
  add(-170, -103, 56, box(EV, 34, 28, "hi", 4, 0.8));
  const fins = []; for (let x = EV.x + 4; x < EV.x + EV.w - 2; x += 3.5) fins.push(k.lineOnTop([x, EV.y + 2], [x, EV.y + EV.d - 2], 62, P));
  add(-170, -103, 62, L(fins.join(""), { tone: "lo" }) + L(k.planOutline(k.insetPlan(EV, 2), 62, P, 3), { tone: "faint" }), 3);
  // fan openings on the +y face
  for (const fx of [-188, -152]) {
    add(fx, EV.y + EV.d, 48, L(k.sideRing([fx, EV.y + EV.d, 48], 11.5, "y", P, 36), { tone: "mid" }) + L(k.sideRing([fx, EV.y + EV.d, 48], 6, "y", P, 24), { tone: "faint" }) + `<g data-part="fanE" data-cx="${fx}" data-cy="${EV.y + EV.d}" data-cz="48"></g>` + D([at([fx, EV.y + EV.d, 48])], { size: 0.8, tone: "mid" }), 6);
  }
curMod = "";   // thermometer on the back wall
  add(-224, ROOM.y + WT, 60, box({ x: -228, y: ROOM.y + WT, w: 5, d: 2, r: 0.6 }, 20, 52, "lo", 2, 0.2) + `<path data-part="thermo" class="iso-line" data-tone="lit" d="" style="stroke-width:1.6"/>`, 2);
curMod = "evap";   // valve + ports
  add(-127, -92, 38, box({ x: -131, y: -96, w: 8, d: 8, r: 1.5 }, 33, 10, "hi", 2, 0.4) + cyl(-127, -92, 3, 43, 7, "mid", 14) + S(G.disc(0, 4, 5, G.frameAlong([-135, -92, 38], [1, 0, 0]), P), { tone: "mid" }), 4);
  add(-135, -78, 54, S(G.disc(0, 3, 4.6, G.frameAlong([-137, -78, 54], [1, 0, 0]), P), { tone: "mid" }), 4);
  curMod = "";
}

// ---------- thermal store (ice bank) ----------
export const TANK = { x: -100, y: -152, w: 62, d: 52, r: 2 };
export const TUBES = [-90, -72, -54].flatMap((x) => [-138, -114].map((y) => [x, y]));
function tank() {
  const o = [];
  o.push(box({ x: TANK.x - 3, y: TANK.y - 3, w: TANK.w + 6, d: TANK.d + 6, r: 3 }, 0, 4, "lo", 3, 0.4));
  o.push(box({ x: TANK.x, y: TANK.y, w: TANK.w, d: 4, r: 1 }, 4, 60, "mid", 2, 0.5), box({ x: TANK.x, y: TANK.y + 4, w: 4, d: TANK.d - 4, r: 1 }, 4, 60, "mid", 2, 0.5));
  o.push(L(k.segment([TANK.x + 4, TANK.y + 4, 40], [TANK.x + TANK.w, TANK.y + 4, 40], P), { tone: "faint" }), L(k.segment([TANK.x + 4, TANK.y + 4, 40], [TANK.x + 4, TANK.y + TANK.d, 40], P), { tone: "faint" }));
  o.push(D([at([TANK.x + 12, TANK.y + 4, 56]), at([TANK.x + 50, TANK.y + 4, 56]), at([TANK.x + 4, TANK.y + 14, 56]), at([TANK.x + 4, TANK.y + 40, 56])], { size: 0.45 }));
  // headers across the top (return) joined to tube tops
  return o.join("");
}
function tankItems() {
  curMod = "store";
  TUBES.forEach(([x, y], i) => {
    add(x, y, 30, S(k.cylinder(x, y, 1.8, 8, 48, P, 12), { tone: "mid", crease: "none" }), 0);
    add(x, y, 31, `<g data-part="ice" data-i="${i}"></g>`, 0.2);
  });
  add(-72, -125, 58, S(G.disc(0, 52, 2.2, G.frameAlong([-98, -125, 58], [1, 0, 0]), P), { tone: "mid", crease: "none" }), 1.5);
  // front and right walls cut down to the water line
  add(-69, -100, 14, box({ x: TANK.x, y: TANK.y + TANK.d - 4, w: TANK.w, d: 4, r: 1 }, 4, 16, "mid", 2, 0.4) + L(k.lineOnTop([TANK.x + 2, TANK.y + TANK.d - 2], [TANK.x + TANK.w - 2, TANK.y + TANK.d - 2], 20, P), { tone: "faint" }), 5);
  add(-38, -126, 14, box({ x: TANK.x + TANK.w - 4, y: TANK.y, w: 4, d: TANK.d - 4, r: 1 }, 4, 16, "mid", 2, 0.4), 4);
  // store solenoid valve on the feed line
  add(-95, -60, 12, box({ x: -99, y: -64, w: 8, d: 8, r: 1.5 }, 6, 9, "hi", 2, 0.4) + cyl(-95, -60, 2.6, 15, 6, "mid", 14), 2);
  curMod = "";
}

// ---------- machine skid ----------
const MZ = 26;
function machine() {
  curMod = "comp";
  // mounts
  for (const x of [-80, -45, -10, 30]) add(x, 20, 8, box({ x: x - 6, y: 6, w: 12, d: 28, r: 1.5 }, 4, 4 + (x > -15 ? 6 : 2), "lo", 2, 0.3), -1);
  // motor
  const Fm = G.frameAlong([-86, 20, MZ], [1, 0, 0]);
  add(-60, 20, MZ, S(G.disc(0, 52, 16, Fm, P), { tone: "hi" }) + L(G.circleOf(Fm, 52, 16, P, 36), { tone: "faint" }) + L(G.arcOf(Fm, 6, 16, P), { tone: "faint" }) + L(G.arcOf(Fm, 46, 16, P), { tone: "faint" }), 0);
  add(-60, 20, MZ + 14, `<g data-part="motorfins">${L(G.ribsOf(Fm, 8, 44, 16, 22, P), { tone: "lo" })}</g>`, 1);
  add(-62, 20, MZ + 20, box({ x: -76, y: 12, w: 22, d: 16, r: 2 }, MZ + 14, 8, "mid", 3, 0.4) + L(k.planOutline(k.insetPlan({ x: -76, y: 12, w: 22, d: 16, r: 2 }, 3), MZ + 22, P, 3), { tone: "faint" }), 3);
  add(-86, 20, MZ, S(G.disc(-4, 0, 12, Fm, P), { tone: "mid" }), -1);
  // coupling guard (ribs turn with the shaft)
  const Fc = G.frameAlong([-34, 20, MZ], [1, 0, 0]);
  add(-27, 20, MZ, S(G.disc(0, 14, 9, Fc, P), { tone: "mid" }) + `<g data-part="shaft"></g>`, 1);
  // compressor crankcase
  const Fk = G.frameAlong([-20, 20, MZ], [1, 0, 0]);
  add(10, 20, MZ, S(G.disc(0, 60, 19, Fk, P), { tone: "hi" }) + L(G.arcOf(Fk, 8, 19, P), { tone: "faint" }) + L(G.arcOf(Fk, 52, 19, P), { tone: "faint" }), 2);
  add(41, 20, MZ, S(G.disc(0, 4, 15, G.frameAlong([40, 20, MZ], [1, 0, 0]), P), { tone: "mid" }) + D(G.dotsOf(G.frameAlong([44, 20, MZ], [1, 0, 0]), 0, 12, 8, P, { all: true }), { size: 0.5 }) + L(G.circleOf(G.frameAlong([44, 20, MZ], [1, 0, 0]), 0, 6, P, 24), { tone: "mid" }), 4);
  // cylinder head block + bolts
  const HEAD = { x: 0, y: 8, w: 32, d: 24, r: 2 };
  add(16, 20, 52, box(HEAD, 44, 14, "hi", 3, 0.7) + L(k.planOutline(k.insetPlan(HEAD, 3), 58, P, 3), { tone: "faint" }) + D(k.corners(HEAD, 4).map(([x, y]) => at([x, y, 58])), { size: 0.55 }), 5);
  add(22, 20, 62, cyl(22, 20, 3.2, 58, 4, "mid", 14), 6);
  add(0, 20, 54, S(G.disc(0, 3, 4.6, G.frameAlong([-3, 20, 54], [1, 0, 0]), P), { tone: "mid" }), 6);
  // oil sight glass on the crankcase top
  add(-10, 20, MZ + 19, cyl(-10, 20, 4, MZ + 17, 3, "mid", 16), 3);
curMod = "cond";   // receiver (vertical)
  add(135, -20, 20, cyl(135, -20, 10, 8, 32, "hi", 28, 0.5) + cyl(135, -20, 8, 40, 3, "mid", 20) + L(k.sideArc(135, -20, 10, 16, P, 20), { tone: "faint" }) + L(k.sideArc(135, -20, 10, 34, P, 20), { tone: "faint" }), 1);
  for (const x of [128, 142]) add(x, -20, 4, box({ x: x - 3, y: -23, w: 6, d: 6, r: 1 }, 4, 5, "lo", 2, 0.2), -1);
  add(125, -20, 10, S(G.disc(0, 3, 4.4, G.frameAlong([123, -20, 10], [1, 0, 0]), P), { tone: "mid" }), 2);
  // condenser (air-cooled) on legs
  const COND = { x: 30, y: -112, w: 124, d: 62, r: 3 };
  for (const [x, y] of k.corners(COND, 6)) add(x, y, 20, cyl(x, y, 3, 4, 38, "mid", 14), -0.6);
  add(92, -81, 40, box({ x: COND.x - 2, y: COND.y - 2, w: COND.w + 4, d: COND.d + 4, r: 3 }, 40, 4, "lo", 3, 0.4), -0.3);
  add(92, -81, 62, box(COND, 44, 38, "hi", 4, 0.8), 1);
  const cf = []; for (let x = COND.x + 4; x < COND.x + COND.w - 2; x += 3.2) cf.push(k.rise([x, COND.y + COND.d, 0], 47, 80, P));
  add(92, -81, 63, L(cf.join(""), { tone: "lo" }) + L(k.planOutline(k.insetPlan(COND, 3), 82, P, 3), { tone: "faint" }) + L(k.segment([COND.x + 3, COND.y + COND.d, 64], [COND.x + COND.w - 3, COND.y + COND.d, 64], P), { tone: "faint" }), 2);
  add(45, -50, 70, S(G.disc(0, 3, 4.6, G.frameAlong([45, -53, 70], [0, 1, 0]), P), { tone: "mid" }), 3);
  add(135, -50, 48, S(G.disc(0, 3, 4.6, G.frameAlong([135, -53, 48], [0, 1, 0]), P), { tone: "mid" }), 3);
  // condenser fan: shroud, guard rings, blades (animated)
  const fc = [92, -81, 84];
  add(92, -81, 86, cyl(92, -81, 28, 82, 4, "mid", 40, 0.5) + L(k.ring(92, -81, 24, 86, P, 40), { tone: "lo" }) + `<g data-part="fanC" data-cx="92" data-cy="-81" data-cz="85"></g>` + L(k.ring(92, -81, 16, 86.6, P, 32), { tone: "faint" }) + L(k.ring(92, -81, 9, 86.6, P, 24), { tone: "faint" }) + S(k.cylinder(92, -81, 3.2, 85, 2, P, 14), { tone: "mid" }), 4);
curMod = "comp";   // VFD cabinet
  const VFD = { x: -98, y: 62, w: 44, d: 20, r: 2 };
  add(-76, 72, 28, box(VFD, 0, 52, "mid", 3, 0.6) + L(k.planOutline(k.insetPlan(VFD, 2), 52, P, 3), { tone: "faint" }), 0);
  add(-76, 82, 30, L(k.segment([-94, 82, 6], [-94, 82, 46], P), { tone: "faint" }) + L(k.segment([-58, 82, 6], [-58, 82, 46], P), { tone: "faint" }) + L(k.segment([-94, 82, 46], [-58, 82, 46], P), { tone: "faint" }) + L(k.segment([-94, 82, 6], [-58, 82, 6], P), { tone: "faint" }) + `<text data-part="vfdtext" class="iso-facetext"></text>` + `<circle data-part="vfdled" r="1.6" cx="${at([-90, 82, 40])[0]}" cy="${at([-90, 82, 40])[1]}"></circle>`, 1);
  // gauge board
  add(100, 62, 40, box({ x: 76, y: 60, w: 56, d: 5, r: 1.5 }, 14, 48, "mid", 3, 0.5) + cyl(88, 62, 2, 0, 14, "mid", 10) + cyl(120, 62, 2, 0, 14, "mid", 10), 0);
  for (const [gx, name] of [[91, "lp"], [117, "hp"]]) {
    const c = [gx, 65, 44], pts = Array.from({ length: 40 }, (_, i) => at([gx + 11 * Math.cos((i / 40) * 6.2832), 65, 44 + 11 * Math.sin((i / 40) * 6.2832)]));
    const ring = "M" + pts.map((p) => p.join(" ")).join("L") + "Z";
    add(gx, 65, 44, S({ fill: ring, outline: ring, crease: "", top: "", shades: [] }, { flat: true, tone: "hi" }) + L(k.sideRing(c, 8.6, "y", P, 36), { tone: "faint" }) + `<g data-part="gauge" data-g="${name}" data-cx="${gx}" data-cy="65" data-cz="44"></g>`, 3);
  }
curMod = "";   // sensor / label plate
  add(104, 70, 4, L(k.planOutline({ x: 80, y: 74, w: 48, d: 10, r: 2 }, 4.6, P, 3), { tone: "lo" }) + k.faceTextSvg(k.topMatrix([104, 80.5], 4.6, P, "x"), "LP    HP", { size: 3.2, tone: "mid", anchor: "middle" }), 0);
}

// ---------- PV canopy, inverter, grid ----------
export const PVZ = 58;
function pv() {
  curMod = "pv";
  const DX = 44, px = [178 + DX, 290 + DX], py = [-150, 4];
  for (const x of px) for (const y of py) add(x, y, 28, cyl(x, y, 3.6, 0, PVZ - 2, "mid", 14) + cyl(x, y, 5.4, 0, 3, "lo", 14), -2);
  add(234 + DX, -73, PVZ, S(k.slabOf({ x: 172 + DX, y: -152, w: 124, d: 160, r: 2 }, PVZ - 6, 3, P, 3, 0.3), { tone: "lo" }), -1);
  const cells = [];
  for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) {
    const plan = { x: 176 + DX + c * 40, y: -150 + r * 78, w: 37, d: 74, r: 1 };
    add(plan.x + 18, plan.y + 37, PVZ, box(plan, PVZ - 3, 3, "hi", 2, 0.5) + L(k.planOutline(k.insetPlan(plan, 1.5), PVZ, P, 2), { tone: "lo" }), 2);
    let d = ""; for (let i = 1; i < 4; i++) d += k.lineOnTop([plan.x + 1.5, plan.y + (plan.d * i) / 4], [plan.x + plan.w - 1.5, plan.y + (plan.d * i) / 4], PVZ + 0.1, P);
    for (let i = 1; i < 6; i++) d += k.lineOnTop([plan.x + (plan.w * i) / 6, plan.y + 1.5], [plan.x + (plan.w * i) / 6, plan.y + plan.d - 1.5], PVZ + 0.1, P);
    cells.push({ x: plan.x + 18, y: plan.y + 37, d });
  }
  cells.forEach((c) => add(c.x, c.y, PVZ + 3, `<path class="iso-line pvcell" data-tone="lit" d="${c.d}" style="stroke-width:.7"/>`, 3));
  // combiner box
  add(186 + DX, 12, 14, box({ x: 180 + DX, y: 8, w: 14, d: 8, r: 1.2 }, 4, 20, "mid", 2, 0.4) + D([at([187 + DX, 16, 20])], { size: 0.5 }), 0);
curMod = "inv";   // inverter
  const INV = { x: 205 + DX, y: 36, w: 36, d: 12, r: 1.5 };
  add(223 + DX, 42, 24, cyl(210 + DX, 40, 2, 0, 10, "mid", 10) + cyl(236 + DX, 40, 2, 0, 10, "mid", 10) + box(INV, 10, 44, "hi", 3, 0.7) + L(k.planOutline(k.insetPlan(INV, 2), 54, P, 3), { tone: "faint" }), 0);
  const ifc = []; for (let x = 211; x < 238; x += 3) ifc.push(k.rise([x + DX, 48, 0], 14, 28, P));
  add(223 + DX, 48, 26, L(ifc.join(""), { tone: "lo" }) + `<circle data-part="invled" r="1.7" cx="${at([236 + DX, 48, 44])[0]}" cy="${at([236 + DX, 48, 44])[1]}"></circle>` + k.faceTextSvg(k.sideMatrix([223 + DX, 48], 38, P, "right"), "10 kW", { size: 3.4, tone: "mid", anchor: "middle" }), 1);
curMod = "grid";   // grid cabinet + pole
  const GC = { x: 262 + DX, y: 40, w: 30, d: 22, r: 1.5 };
  add(277 + DX, 51, 25, box(GC, 0, 50, "mid", 3, 0.6) + L(k.planOutline(k.insetPlan(GC, 2), 50, P, 3), { tone: "faint" }) + L(k.segment([264 + DX, 62, 6], [264 + DX, 62, 44], P) + k.segment([290 + DX, 62, 6], [290 + DX, 62, 44], P), { tone: "faint" }) + L(k.segment([264 + DX, 62, 44], [290 + DX, 62, 44], P) + k.segment([264 + DX, 62, 6], [290 + DX, 62, 6], P), { tone: "faint" }), 0);
  add(277 + DX, 62, 30, cyl(277 + DX, 66, 6, 28, 4, "mid", 18) + L(k.ring(277 + DX, 66, 4, 32, P, 18), { tone: "lo" }) + `<g data-part="meterneedle"></g>`, 2);
  add(300 + DX, 50, 40, cyl(300 + DX, 50, 2.4, 0, 96, "mid", 12) + S(k.slabOf({ x: 288 + DX, y: 48, w: 24, d: 4, r: 0.8 }, 88, 3, P, 2, 0.3), { tone: "mid" }) + [290 + DX, 310 + DX].map((x) => cyl(x, 50, 1.6, 91, 7, "lo", 8)).join(""), 0);
}

// ---------- electrical floor wiring (flow overlays live) ----------
export const WIRES = {
  dc: { pts: [[231, 16, 0.4], [231, 30, 0.4], [254, 30, 0.4], [254, 36, 0.4]], tone: "lit" },
  ac: { pts: [[266, 36, 0.4], [266, 92, 0.4]], tone: "lit" },
  grid: { pts: [[321, 40, 0.4], [321, 92, 0.4], [266, 92, 0.4]], tone: "mid" },
  bus: { pts: [[266, 92, 0.4], [-76, 92, 0.4], [-76, 82, 0.4]], tone: "lit" },
  motor: { pts: [[-76, 62, 0.4], [-76, 50, 0.4], [-62, 50, 0.4], [-62, 36, 0.4]], tone: "lit" },
  fan: { pts: [[-98, 72, 0.4], [-104, 72, 0.4], [-104, -4, 0.4]], tone: "lo" },
};
const wirePath = (n) => WIRES[n].pts.map((p, i) => (i ? "L" : "M") + at(p).join(" ")).join("");
const wireBase = () => Object.entries(WIRES).map(([n, w]) => `<path class="iso-line" data-tone="faint" d="${wirePath(n)}" style="stroke-width:2.4;opacity:.55"/>`).join("") +
  D([[231, 16, 0.4], [254, 36, 0.4], [266, 36, 0.4], [321, 40, 0.4], [266, 92, 0.4], [-76, 82, 0.4], [-76, 62, 0.4], [-62, 36, 0.4]].map((p) => at(p)), { size: 0.9 });
const wireFlow = () => Object.keys(WIRES).filter((n) => n !== "fan").map((n) => `<path class="iso-line wire-flow" data-wire="${n}" data-flow data-tone="${WIRES[n].tone}" d="${wirePath(n)}" style="stroke-width:1.3"/>`).join("");

export function sceneSvg() {
  items.length = 0; curMod = ""; roomItems(); tankItems(); machine(); pv();
  for (const n of Object.keys(ROUTES)) pipeSvg(n);
  const sorted = items.sort((a, b) => a.key - b.key).map((i) => i.svg).join("");
  const sun = `<g data-part="sun" transform="translate(${at([290, -150, 120])[0]} ${at([290, -150, 120])[1] - 18})"><circle r="9" class="sun-core"/><g data-part="rays"></g></g>`;
  return base() + roomShell() + tank() + wireBase() + sorted + `<g data-part="flows">${flowLines()}${wireFlow()}</g>` + sun;
}
export { wirePath };

// module anchors (world) for tags/sockets, and which modules each pipe needs
export const ANCH = { pv: [278, -73, 58], inv: [267, 42, 20], grid: [321, 51, 20], comp: [-20, 20, 26], cond: [92, -81, 40], evap: [-170, -103, 30], store: [-70, -125, 30] };
export const PIPE_MODS = { dis: ["comp", "cond"], cond: ["cond"], liq: ["cond", "evap"], feedH: ["store"], feedL: ["store"], lpIn: ["evap"], lpOut: ["evap"], ret: ["store"], suc: ["comp"] };
