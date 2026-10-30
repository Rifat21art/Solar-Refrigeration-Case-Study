// One detailed drawing per module. Dynamic parts are empty <g data-d="..."> slots filled by web/pages.js.
import { Fig, k, G } from "./dscene.mjs";
const W = 720, H = 500, V0 = { azimuth: 36, elevation: 30 };
const cells = (x0, y0, nx, ny, dx, dy) => { const o = []; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) o.push([x0 + i * dx, y0 + j * dy]); return o; };
const corners4 = (p, z0, z1, F) => F.dashed([[p.x, p.y, z0], [p.x, p.y, z1]]) + F.dashed([[p.x + p.w, p.y, z0], [p.x + p.w, p.y, z1]]) + F.dashed([[p.x, p.y + p.d, z0], [p.x, p.y + p.d, z1]]) + F.dashed([[p.x + p.w, p.y + p.d, z0], [p.x + p.w, p.y + p.d, z1]]);

export const PAGES = {};

// ---------------- M1 PV module (exploded) ----------------
PAGES.pv = (v = V0) => {
  const F = new Fig(W, H, k.boxCorners({ x: -80, y: -44, w: 160, d: 88 }, -26, 175), v), pl = { x: -70, y: -36, w: 140, d: 72, r: 2 };
  F.base({ x: -92, y: -56, w: 184, d: 112, r: 8 }, -26, 6);
  F.add(0, 0, 0, corners4(pl, 2, 92, F), -3);
  F.add(0, 0, 2, F.box(pl, 0, 4, "lo", 3, 0.5) + F.L(k.planOutline(k.insetPlan(pl, 4), 4, F.P, 3), { tone: "faint" }), 0);
  F.add(0, 0, 12, F.box({ ...pl, x: -66, y: -32, w: 132, d: 64 }, 12, 1.6, "mid", 2, 0.3), 1);
  const jb = { x: -9, y: -7, w: 18, d: 14, r: 1.5 };
  F.add(0, 0, -10, F.rod([-9, 0, -12], [-30, 24, -12], 1.4, "lo") + F.rod([9, 0, -12], [30, 24, -12], 1.4, "lo") + F.box(jb, -16, 10, "hi", 3, 0.6) + k.dotsSvg([F.at([-4, 7, -8]), F.at([0, 7, -8]), F.at([4, 7, -8])], { size: 0.8 }), -1);
  F.add(0, 0, 32, F.L(k.planOutline(k.insetPlan(pl, 5), 32, F.P, 3), { tone: "lo" }) + F.dashed([[-65, -31, 12], [-65, -31, 32]]), 2);
  let bus = "", xs = [];
  for (const [x, y] of cells(-66, -32, 10, 6, 13.4, 10.8)) { F.add(x, y, 52, F.box({ x, y, w: 12.6, d: 10.2, r: 1 }, 52, 1.2, "hi", 2, 0.2), 3); bus += k.lineOnTop([x + 4.2, y + 0.6], [x + 4.2, y + 9.6], 53.3, F.P) + k.lineOnTop([x + 8.4, y + 0.6], [x + 8.4, y + 9.6], 53.3, F.P); }
  F.add(0, 0, 54, F.L(bus, { tone: "mid" }) + `<g data-d="cur">${F.flow(cells(-60, -27, 10, 6, 13.4, 10.8).map(([x, y], i) => [x + (Math.floor(i / 10) % 2 ? 0 : 0), y, 54]).reduce((a, p, i, arr) => { const row = Math.floor(i / 10), col = i % 10, c = row % 2 ? 9 - col : col; a.push([-60 + c * 13.4, -27 + row * 10.8, 54]); return a; }, []), "lit", "cur", 1.5)}</g>`, 4);
  F.add(0, 0, 72, F.L(k.planOutline(k.insetPlan(pl, 5), 72, F.P, 3), { tone: "lo" }), 5);
  let gl = ""; for (let i = 0; i < 6; i++) gl += k.lineOnTop([-60 + i * 22, -30], [-30 + i * 22, 30], 94.6, F.P);
  F.add(0, 0, 92, F.box({ ...pl, x: -69, y: -35, w: 138, d: 70 }, 92, 2.4, "face", 3, 0.6) + F.L(gl, { tone: "faint" }), 6);
  F.top.push(F.flow([[-50, -10, 175], [-50, -10, 100]], "lit", "ray", 1.1) + F.flow([[-15, 10, 175], [-15, 10, 100]], "lit", "ray", 1.1) + F.flow([[20, -10, 175], [20, -10, 100]], "lit", "ray", 1.1) + F.flow([[55, 10, 175], [55, 10, 100]], "lit", "ray", 1.1));
  F.lbl([66, 34, 93], "Tempered glass 3.2 mm", 40, -34); F.lbl([66, 30, 72], "EVA encapsulant", 44, -16); F.lbl([60, 30, 53], "60 silicon cells + busbars", 48, 2); F.lbl([66, 30, 32], "EVA encapsulant", 44, 22); F.lbl([66, 30, 13], "Back-sheet", 44, 42); F.lbl([68, 36, 2], "Aluminium frame", 48, 62); F.lbl([9, 0, -12], "Junction box + bypass diodes", 52, 40); F.lbl([-50, -10, 140], "Photons", -26, -12);
  return F;
};

// ---------------- M2 inverter (exploded) ----------------
PAGES.inv = (v = V0) => {
  const F = new Fig(W, H, k.boxCorners({ x: -62, y: -24, w: 124, d: 48 }, -6, 190), v);
  F.base({ x: -80, y: -40, w: 160, d: 80, r: 8 }, -6, 6);
  const hs = { x: -56, y: -18, w: 112, d: 36, r: 2 };
  F.add(0, 0, 0, corners4(hs, 6, 156, F), -3);
  F.add(0, 0, 0, F.box(hs, 0, 8, "lo", 3, 0.6), 0);
  for (let i = 0; i < 15; i++) F.add(-52 + i * 7.4, 0, 20, F.box({ x: -52 + i * 7.4, y: -18, w: 1.8, d: 36, r: 0.2 }, 8, 24, "mid", 1, 0.1), 0.2 + i * 0.01);
  F.add(0, 20, 20, F.L(k.sideRing([0, 20, 20], 12, "y", F.P, 30), { tone: "mid" }) + `<g data-d="fan"></g>`, 3);
  const pcb = { x: -52, y: -18, w: 104, d: 36, r: 1 }; F.add(0, 0, 48, F.box(pcb, 46, 2.5, "face", 2, 0.3), 1);
  for (const x of [-34, -3, 28]) for (const y of [-12, 4]) F.add(x + 7, y + 5, 55, F.box({ x, y, w: 15, d: 11, r: 1 }, 48.5, 8, "hi", 2, 0.5) + k.dotsSvg([F.at([x + 3, y + 11, 56]), F.at([x + 7.5, y + 11, 56]), F.at([x + 12, y + 11, 56])], { size: 0.6 }), 2);
  F.add(0, 0, 80, F.box({ ...pcb, x: -52 }, 78, 2.5, "face", 2, 0.3) + [-38, -20, -2].map((x) => F.cyl(x, -4, 6.2, 80.5, 22, "hi", 20, 0.5)).join("") + F.rod([-46, 9, 82], [10, 9, 82], 1.6, "mid") + F.rod([-46, 13, 82], [10, 13, 82], 1.6, "lo"), 3);
  F.add(0, 0, 124, F.box({ ...pcb, x: -52 }, 118, 2.5, "face", 2, 0.3) + [-30, 0, 30].map((x) => F.cyl(x, 0, 9, 120.5, 9, "hi", 24, 0.5) + F.L(k.ring(x, 0, 6, 129.5, F.P, 24), { tone: "faint" })).join("") + F.box({ x: 38, y: -12, w: 16, d: 20, r: 1.5 }, 120.5, 18, "mid", 2, 0.5), 4);
  F.add(0, 0, 158, F.box({ ...pcb, x: -52 }, 154, 2.5, "face", 2, 0.3) + F.box({ x: -18, y: -8, w: 20, d: 16, r: 1 }, 156.5, 4, "hi", 2, 0.3) + F.box({ x: 20, y: -10, w: 26, d: 3, r: 0.5 }, 156.5, 5, "mid", 1, 0.2) + `<g data-d="led"></g>`, 5);
  F.lbl([56, 18, 4], "Heat sink + fan", 40, 30); F.lbl([50, 14, 48], "IGBT bridge, 6 switches", 40, 18); F.lbl([-2, 14, 90], "DC-link capacitors", 44, 6); F.lbl([30, 9, 129], "LCL filter inductors", 40, -6); F.lbl([54, -12, 130], "AC contactor", 34, -26); F.lbl([2, 8, 160], "Control board: MPPT, PLL, PWM", 44, -14); F.lbl([-52, -18, 20], "Fins", -34, 22);
  return F;
};

// ---------------- M3 compressor: crank mechanism cut-away + motor ----------------
export const M3 = { Rc: 10, L: 43, zc: 30, zv: 92 };
PAGES.comp = (v = V0) => {
  const F = new Fig(W, H, [...k.boxCorners({ x: -118, y: -36, w: 190, d: 72 }, -8, 130)], v);
  F.base({ x: -126, y: -50, w: 206, d: 100, r: 8 }, -8, 6);
  F.add(0, 0, 3, F.box({ x: -34, y: -34, w: 68, d: 68, r: 1 }, 0, 6, "lo", 3, 0.5), -1);
  F.add(0, -32, 30, F.box({ x: -34, y: -34, w: 68, d: 4, r: 1 }, 6, 46, "mid", 2, 0.4), -2); F.add(-32, 0, 30, F.box({ x: -34, y: -30, w: 4, d: 64, r: 1 }, 6, 46, "mid", 2, 0.4), -2);
  F.add(0, 0, 8, F.L(k.lineOnTop([-30, -30], [30, -30], 11, F.P) + k.lineOnTop([-30, 30], [30, 30], 11, F.P), { tone: "faint" }), -1);
  F.add(0, 0, 30, F.rod([-34, 0, 30], [34, 0, 30], 5, "mid") + F.rod([-3, 0, 30], [3, 0, 30], 13, "hi"), 0.5);
  F.add(0, -20, 72, F.box({ x: -22, y: -24, w: 44, d: 8, r: 1 }, 52, 40, "mid", 2, 0.4) + F.box({ x: -22, y: -24, w: 6, d: 46, r: 1 }, 52, 40, "mid", 2, 0.4), -1);
  F.add(0, 0, 70, F.L(k.rise([-16, 0, 0], 52, 92, F.P) + k.rise([16, 0, 0], 52, 92, F.P) + k.ring(0, 0, 16, 52, F.P, 30), { tone: "lo" }), 2);
  F.slot(0, 0, 70, "piston", 3); F.slot(0, 0, 40, "rod", 3.5); F.slot(0, 0, 30, "crank", 4);
  F.add(0, 0, 94, F.box({ x: -22, y: -22, w: 44, d: 44, r: 1 }, 92, 3, "hi", 2, 0.4) + k.dotsSvg([F.at([-9, 0, 95]), F.at([9, 0, 95]), F.at([-9, 6, 95]), F.at([9, 6, 95])], { size: 0.8 }), 4);
  F.slot(-9, 0, 96, "reedS", 5); F.slot(9, 0, 96, "reedD", 5);
  F.add(0, -20, 108, F.box({ x: -22, y: -22, w: 44, d: 5, r: 1 }, 95, 30, "mid", 2, 0.4) + F.box({ x: -22, y: -22, w: 5, d: 44, r: 1 }, 95, 30, "mid", 2, 0.4) + F.box({ x: -1.5, y: -22, w: 3, d: 44, r: 0.5 }, 95, 28, "lo", 1, 0.2), 5);
  F.add(0, 0, 112, F.rod([-22, 0, 110], [-62, 0, 110], 4, "mid") + F.rod([22, 0, 110], [62, 0, 110], 3, "mid") + F.flow([[-62, 0, 110], [-12, 0, 110]], "blue", "fs", 1.3) + F.flow([[12, 0, 110], [62, 0, 110]], "red", "fd", 1.3), 6);
  const Fm = G.frameAlong([-114, 0, 30], [1, 0, 0]);
  F.add(-84, 0, 30, F.S(G.disc(0, 60, 22, Fm, F.P), { tone: "hi" }) + F.L(G.ribsOf(Fm, 6, 54, 22, 26, F.P), { tone: "lo" }) + F.L(G.arcOf(Fm, 4, 22, F.P) + G.arcOf(Fm, 56, 22, F.P), { tone: "faint" }), -1);
  F.add(-84, 0, 56, F.box({ x: -96, y: -9, w: 24, d: 18, r: 2 }, 52, 8, "mid", 3, 0.4), 0);
  F.add(-44, 0, 30, F.S(G.disc(0, 18, 8, G.frameAlong([-54, 0, 30], [1, 0, 0]), F.P), { tone: "mid" }) + `<g data-d="shaft"></g>`, 1);
  F.lbl([-96, -0, 52], "Induction motor (stator, rotor)", -10, -42); F.lbl([-44, 8, 36], "Flexible coupling", -4, 38); F.lbl([-18, 14, 52], "Crankcase", -50, 18); F.lbl([16, -16, 80], "Cylinder liner", 44, -2); F.lbl([20, 12, 94], "Valve plate (reeds)", 52, 20); F.lbl([20, -22, 118], "Cylinder head", 44, -14); F.lbl([-62, 0, 110], "Suction", -4, -22); F.lbl([62, 0, 110], "Discharge", 14, -18);
  return F;
};

// ---------------- M4 VFD / controls cabinet ----------------
PAGES.vfd = (v = V0) => {
  const F = new Fig(W, H, [...k.boxCorners({ x: -8, y: -22, w: 130, d: 56 }, -8, 180)], v);
  F.base({ x: -18, y: -32, w: 150, d: 76 }, -8, 6);
  F.add(60, -2, 66, F.box({ x: 0, y: -4, w: 120, d: 4, r: 1 }, 0, 132, "lo", 3, 0.5), -3);
  const rails = [24, 58, 98]; F.add(60, 0, 60, rails.map((z) => F.seg([2, 0, z], [118, 0, z], "lo")).join(""), -2);
  const blk = (x, w, z, h, tone = "mid", d = 14) => F.add(x + w / 2, d / 2, z + h / 2, F.box({ x, y: 0, w, d, r: 1.2 }, z, h, tone, 3, 0.5), 1);
  blk(6, 22, 100, 24, "hi"); blk(34, 22, 100, 24, "hi"); blk(62, 30, 100, 24, "mid"); for (let i = 0; i < 5; i++) blk(98 + i * 4, 3, 100, 24, "lo", 8);
  blk(6, 28, 62, 28, "hi"); F.add(52, 8, 76, F.cyl(52, 8, 9, 62, 28, "hi", 22, 0.5) + F.L(k.ring(52, 8, 5, 90, F.P, 20), { tone: "faint" }), 1);
  for (const x of [72, 86, 100]) F.add(x, 8, 76, F.cyl(x, 8, 6, 62, 28, "hi", 20, 0.5), 1);
  blk(6, 48, 28, 14, "hi", 12); F.add(30, 3, 20, F.L([6, 18, 30, 42].map((x) => k.rise([x, 0, 0], 4, 28, F.P)).join(""), { tone: "lo" }) + F.box({ x: 6, y: 0, w: 48, d: 12, r: 1 }, 4, 22, "mid", 2, 0.3), 0.5);
  F.add(88, 3, 24, F.box({ x: 62, y: 0, w: 52, d: 3, r: 0.8 }, 8, 34, "face", 2, 0.3) + F.box({ x: 72, y: 3, w: 16, d: 3, r: 0.8 }, 20, 12, "hi", 1, 0.3), 1.5);
  F.add(0, 0, 70, F.flow([[17, 18, 112], [17, 18, 104]], "lit", "w_in", 1.2), 6);
  F.top.push(F.flow([[17, 15, 104], [17, 15, 94], [20, 15, 94], [20, 15, 90]], "lit", "w_ac", 1.3) + F.flow([[20, 15, 62], [20, 15, 56], [52, 15, 56], [52, 15, 62]], "lit", "w_dc", 1.6) + F.flow([[52, 15, 62], [72, 15, 62], [100, 15, 62], [100, 15, 54], [30, 15, 54], [30, 15, 42]], "lit", "w_dc", 1.6) + F.flow([[30, 15, 28], [30, 15, 18], [8, 15, 18], [8, 15, 10]], "lit", "w_out", 1.4));
  F.add(60, 30, 160, F.box({ x: 20, y: 24, w: 80, d: 3, r: 1.5 }, 140, 34, "mid", 3, 0.6) + F.box({ x: 40, y: 27, w: 40, d: 1.2, r: 0.8 }, 150, 12, "face", 1, 0.2) + `<g data-d="keypad"></g>`, 5);
  F.top.push(F.dashed([[20, 24, 140], [20, 24, 20]]) + F.dashed([[100, 24, 140], [100, 24, 20]]));
  F.lbl([17, 14, 124], "MCCB + contactor", -12, -24); F.lbl([62, 14, 124], "EMC filter", 24, -22); F.lbl([20, 14, 90], "Rectifier bridge", -36, 22); F.lbl([52, 17, 90], "DC choke", 28, -12); F.lbl([100, 14, 90], "DC-link capacitors", 28, -2); F.lbl([54, 12, 40], "IGBT inverter", 36, 22); F.lbl([114, 3, 40], "Control board", 18, 24); F.lbl([100, 27, 170], "Door: keypad + display", 20, -22);
  return F;
};

// ---------------- M5 condenser ----------------
export const M5 = { rows: [31, 40, 49, 58], cols: [-26, -15.6, -5.2, 5.2, 15.6, 26] };
PAGES.cond = (v = V0) => {
  const F = new Fig(W, H, [...k.boxCorners({ x: -78, y: -36, w: 156, d: 72 }, -8, 115)], v);
  F.base({ x: -92, y: -46, w: 196, d: 92 }, -8, 6);
  for (const [x, y] of [[-58, -26], [58, -26], [-58, 26], [58, 26]]) F.add(x, y, 12, F.cyl(x, y, 3.2, 0, 24, "mid", 14), -1);
  F.add(0, -30, 44, F.box({ x: -64, y: -32, w: 128, d: 3, r: 0.5 }, 24, 40, "mid", 2, 0.3), -1);
  F.add(0, 0, 24, F.box({ x: -64, y: -32, w: 128, d: 64, r: 1 }, 22, 3, "lo", 2, 0.3), -1);
  F.slot(64, 0, 45, "tubes", 3);
  let f = ""; for (let x = -60; x <= 60; x += 3.2) f += k.rise([x, 32, 0], 26, 62, F.P); F.add(0, 32, 44, F.L(f, { tone: "lo" }) + F.seg([-64, 32, 62], [64, 32, 62], "mid") + F.seg([-64, 32, 26], [64, 32, 26], "mid"), 2);
  F.add(-70, 0, 45, F.rod([-70, -26, 31], [-70, -26, 58], 1.6, "lo") + F.rod([-70, 26, 31], [-70, 26, 58], 1.6, "lo"), 0);
  F.add(72, 0, 58, F.rod([70, -26, 58], [70, 26, 58], 3, "mid") + F.rod([70, 0, 58], [92, 0, 58], 3, "mid"), 4); F.add(72, 0, 31, F.rod([70, -26, 31], [70, 26, 31], 3, "mid") + F.rod([70, 0, 31], [92, 0, 31], 3, "mid"), 4);
  F.add(0, 0, 70, F.cyl(0, 0, 31, 62, 6, "mid", 40, 0.6) + F.L(k.ring(0, 0, 27, 68, F.P, 40), { tone: "lo" }) + `<g data-d="fan"></g>` + F.L(k.ring(0, 0, 18, 68.6, F.P, 32) + k.ring(0, 0, 10, 68.6, F.P, 24), { tone: "faint" }), 5);
  for (const x of [-40, -10, 20, 50]) F.top.push(F.flow([[x, 70, 40], [x, 38, 40]], "blue", "air_in", 1.2));
  for (const [x, y] of [[-14, -6], [12, 6], [0, 0]]) F.top.push(F.flow([[x, y, 80], [x, y, 112]], "red", "air_out", 1.2));
  F.top.push(F.flow([[92, 0, 58], [74, 0, 58]], "red", "in", 1.6), F.flow([[74, 0, 31], [92, 0, 31]], "blue", "out", 1.6));
  F.lbl([92, 0, 58], "Hot gas in (T₂)", 20, -30); F.lbl([92, 0, 31], "Liquid out (subcooled)", 24, 24); F.lbl([0, 0, 70], "EC axial fan", -50, -40); F.lbl([64, 26, 58], "Tube ends (zones)", 40, -50); F.lbl([-20, 32, 44], "Aluminium fins", -46, 24); F.lbl([-70, 26, 45], "Return bends", -26, -24); F.lbl([20, 70, 40], "Air in (T_amb)", 38, 24); F.lbl([0, 0, 112], "Air out", 30, -6);
  return F;
};

// ---------------- M6 receiver + TXV (vertical sections in the plane y = 0) ----------------
export const M6 = { rx: -92, tx: 24 };
PAGES.recv = (v = V0) => {
  const F = new Fig(W, H, [...k.boxCorners({ x: -130, y: -30, w: 290, d: 60 }, -6, 130)], v);
  F.base({ x: -136, y: -40, w: 306, d: 80 }, -6, 6);
  const P = (x, z) => [x, 0, z], rx = M6.rx;
  F.add(rx, 0, 60, F.poly([P(rx - 18, 12), P(rx - 18, 98), P(rx - 12, 106), P(rx + 12, 106), P(rx + 18, 98), P(rx + 18, 12), P(rx + 12, 6), P(rx - 12, 6)], "face"), 0);
  F.slot(rx, 0, 60, "level", 0.5);
  F.add(rx, 0, 60, F.seg(P(rx - 6, 104), P(rx - 6, 12), "mid", { weight: 1.4 }) + F.seg(P(rx - 6, 12), P(rx + 4, 8), "mid") + F.seg(P(rx + 4, 8), P(rx + 4, 0), "mid") + F.rod(P(rx + 4, 2), P(rx + 40, 2), 2.2, "mid"), 1);
  F.add(rx, 0, 100, F.rod(P(rx - 6, 104), P(rx - 6, 130), 2.4, "mid") + F.rod(P(rx - 6, 128), P(rx - 44, 128), 2.4, "mid") + F.cyl(rx + 8, 0, 3, 106, 12, "hi", 12) + F.cyl(rx + 8, 0, 4.2, 118, 3, "mid", 12), 2);
  F.add(rx + 18, 0, 40, F.L(k.sideRing([rx + 18, 0, 36], 5, "y", F.P, 20), { tone: "mid" }) + F.L(k.sideRing([rx + 18, 0, 36], 3, "y", F.P, 20), { tone: "faint" }), 2);
  for (const x of [rx - 12, rx + 12]) F.add(x, 0, 4, F.box({ x: x - 4, y: -6, w: 8, d: 12, r: 1 }, -2, 8, "lo", 2, 0.3), -1);
  F.top.push(F.flow([[rx - 44, 0, 128], [rx - 6, 0, 128], [rx - 6, 0, 108]], "red", "r_in", 1.6), F.flow([[rx + 4, 0, 2], [rx + 40, 0, 2]], "red", "r_out", 1.6));
  const tx = M6.tx;
  F.add(tx, 0, 50, F.poly([P(tx - 20, 28), P(tx - 20, 66), P(tx + 36, 66), P(tx + 36, 28)], "face") + F.poly([P(tx - 20, 66), P(tx - 20, 72), P(tx + 36, 72), P(tx + 36, 66)], "mid"), 0);
  F.add(tx, 0, 30, F.poly([P(tx + 22, 28), P(tx + 22, 8), P(tx + 30, 8), P(tx + 30, 28)], "face"), 0);
  F.add(tx, 0, 48, F.rod(P(tx - 46, 44), P(tx - 20, 44), 3, "mid") + F.poly([P(tx + 2, 28), P(tx + 2, 46), P(tx + 10, 46), P(tx + 10, 28)], "lo"), 1);
  F.slot(tx, 0, 60, "needle", 2); F.slot(tx, 0, 80, "head", 3);
  F.add(tx, 0, 30, F.cyl(tx + 6, 0, 8, -2, 8, "mid", 16) + F.cyl(tx + 6, 0, 3, 4, 22, "hi", 12), 0.4);
  const pipeS = [[70, 0, 72], [150, 0, 72]]; F.add(110, 0, 72, F.rod(pipeS[0], pipeS[1], 3.4, "mid") + F.cyl(100, 0, 4, 66, 0.01, "mid", 4), 1);
  F.slot(100, 0, 78, "bulb", 3);
  F.top.push(F.flow([[tx - 46, 0, 44], [tx - 6, 0, 44]], "red", "t_in", 1.6), F.flow([[tx + 26, 0, 28], [tx + 26, 0, 4], [tx + 60, 0, 4]], "blue", "t_out", 1.6), F.flow([[150, 0, 72], [70, 0, 72]], "blue", "t_suc", 1.4));
  F.lbl(P(rx + 18, 70), "Receiver shell", 36, -22); F.lbl(P(rx - 6, 60), "Dip tube", -22, -4); F.lbl(P(rx + 8, 118), "Relief valve 21 bar(g)", 40, -14); F.lbl(P(rx, 40), "Liquid", 38, 14); F.lbl(P(rx + 18, 36), "Sight glass", 30, 28);
  F.lbl(P(tx + 6, 40), "Needle + seat", 52, 28); F.lbl(P(tx + 14, 76), "Diaphragm head", 30, -22); F.lbl([100, 0, 78], "Sensing bulb", 22, -28); F.lbl(P(tx - 46, 44), "Liquid in", -4, -26); F.lbl(P(tx + 60, 4), "Two-phase out", 20, 24);
  return F;
};

// ---------------- M7 unit cooler ----------------
export const M7 = { rows: [30, 40, 50, 60], cols: [-18, -6, 6, 18] };
PAGES.evap = (v = V0) => {
  const F = new Fig(W, H, [...k.boxCorners({ x: -70, y: -62, w: 140, d: 124 }, -8, 100)], v);
  F.base({ x: -84, y: -70, w: 168, d: 140 }, -8, 6);
  for (const [x, y] of [[-56, -22], [56, -22], [-56, 22], [56, 22]]) F.add(x, y, 12, F.cyl(x, y, 2.6, 0, 22, "mid", 12), -1);
  F.add(0, 0, 21, F.box({ x: -62, y: -28, w: 124, d: 56, r: 2 }, 20, 4, "lo", 3, 0.5), 0);
  F.add(0, -26, 48, F.box({ x: -62, y: -28, w: 124, d: 3, r: 1 }, 24, 46, "mid", 2, 0.4), -1); F.add(-60, 0, 48, F.box({ x: -62, y: -25, w: 3, d: 50, r: 1 }, 24, 46, "mid", 2, 0.4), -1);
  F.slot(48, 0, 46, "tubes", 3);
  let f = ""; for (let y = -22; y <= 22; y += 3) f += k.lineOnTop([-44, y], [44, y], 66, F.P); F.add(0, 0, 66, F.L(f, { tone: "lo" }) + F.L(k.planOutline({ x: -46, y: -24, w: 92, d: 48, r: 1 }, 66, F.P, 3), { tone: "mid" }), 2);
  F.add(0, 28, 46, F.box({ x: -62, y: 25, w: 124, d: 3, r: 1 }, 24, 46, "mid", 2, 0.4), 4);
  for (const x of [-30, 30]) F.add(x, 28, 48, F.L(k.sideRing([x, 28.5, 48], 15, "y", F.P, 36), { tone: "mid" }) + F.L(k.sideRing([x, 28.5, 48], 8, "y", F.P, 24), { tone: "faint" }) + `<g data-d="fan${x < 0 ? 0 : 1}"></g>`, 6);
  F.add(0, 0, 33, F.L(k.lineOnTop([-40, -14], [40, -14], 26, F.P) + k.lineOnTop([-40, 14], [40, 14], 26, F.P), { tone: "mid" }), 0.5);
  F.add(-62, 0, 40, F.rod([-58, -18, 30], [-58, 18, 30], 2.8, "mid") + F.rod([-58, 18, 30], [-58, 18, 60], 2.4, "mid"), 0);
  F.add(60, 0, 40, F.ball([56, -18, 60], 4, "hi") + F.rod([56, -18, 60], [80, -18, 60], 2.4, "mid"), 5);
  for (const x of [-30, 0, 30]) F.top.push(F.flow([[x, -64, 45], [x, -30, 45]], "lit", "air", 1.3), F.flow([[x, 30, 48], [x, 70, 48]], "blue", "airo", 1.3));
  F.top.push(F.flow([[80, -18, 60], [58, -18, 60]], "blue", "e_in", 1.6), F.flow([[-58, 18, 60], [-58, 18, 82], [-82, 18, 82]], "blue", "e_out", 1.6));
  F.lbl([62, 18, 60], "Coil tube ends", 30, -40); F.lbl([80, -18, 60], "From expansion valve", 14, -26); F.lbl([-82, 18, 82], "To compressor", -4, -26); F.lbl([30, 28, 62], "EC fans", 38, -20); F.lbl([20, 0, 22], "Drain pan + heater", 54, 38); F.lbl([0, 0, 66], "Fins 4.5 mm", -40, -34); F.lbl([-30, -64, 45], "Room air in", -4, -22); F.lbl([30, 70, 48], "Cooled air out", 18, 16);
  return F;
};

// ---------------- M8 ice-bank thermal store ----------------
export const M8 = { tubes: [[-30, -14], [0, -14], [30, -14], [-30, 14], [0, 14], [30, 14]], r0: 2.2, R: 13.5 };
PAGES.store = (v = V0) => {
  const F = new Fig(W, H, [...k.boxCorners({ x: -62, y: -44, w: 124, d: 88 }, -8, 130)], v);
  F.base({ x: -78, y: -52, w: 170, d: 104 }, -8, 6);
  const T = { x: -56, y: -38, w: 112, d: 76, r: 2 };
  F.add(0, 0, 3, F.box({ x: -60, y: -42, w: 120, d: 84, r: 3 }, 0, 4, "lo", 3, 0.4), -1);
  F.add(0, -34, 40, F.box({ x: -56, y: -38, w: 112, d: 8, r: 1 }, 4, 72, "mid", 2, 0.5) + F.L([-40, -20, 0, 20, 40].map((x) => k.rise([x, -30, 0], 8, 72, F.P)).join(""), { tone: "faint" }), -2);
  F.add(-52, 0, 40, F.box({ x: -56, y: -30, w: 8, d: 68, r: 1 }, 4, 72, "mid", 2, 0.5), -2);
  F.add(0, 34, 12, F.box({ x: -56, y: 30, w: 112, d: 8, r: 1 }, 4, 22, "mid", 2, 0.4), 8); F.add(52, 0, 12, F.box({ x: 48, y: -30, w: 8, d: 60, r: 1 }, 4, 22, "mid", 2, 0.4), 7);
  F.add(0, 0, 66, F.L(k.planOutline({ x: -48, y: -30, w: 96, d: 68, r: 1 }, 62, F.P, 3), { tone: "faint" }), -1.5);
  M8.tubes.forEach(([x, y], i) => { F.add(x, y, 36, F.cyl(x, y, M8.r0, 8, 56, "mid", 12), 0); F.add(x, y, 37, `<g data-d="ice" data-i="${i}"></g>`, 0.3); F.add(x, y, 70, F.rod([x, y, 64], [x, 0, 70], 1.2, "lo"), 0.4); F.add(x, y, 10, F.rod([x, y, 8], [x, 0, 8], 1.2, "lo"), 0.1); });
  F.add(0, 0, 70, F.rod([-36, 0, 70], [84, 0, 70], 2.4, "mid"), 1); F.add(0, 0, 8, F.rod([-36, 0, 8], [84, 0, 8], 2.4, "mid"), 1);
  F.add(66, -20, 10, F.cyl(66, -24, 9, 0, 14, "hi", 20, 0.5) + F.rod([66, -24, 7], [56, -8, 8], 2.2, "mid") + F.box({ x: 78, y: -30, w: 8, d: 12, r: 1 }, 0, 12, "mid", 2, 0.3), 3);
  F.add(44, -28, 40, F.rod([44, -28, 20], [44, -28, 76], 1.2, "hi") + F.ball([44, -28, 76], 2.4, "hi"), 3);
  F.add(0, 0, 120, F.box({ x: -52, y: -38, w: 104, d: 76, r: 2 }, 108, 2, "face", 2, 0.4) + `<g data-d="section"></g>`, 6);
  F.top.push(F.dashed([[-48, -34, 108], [-48, -34, 72]]) + F.dashed([[48, 34, 108], [48, 34, 30]]) + F.flow([[84, 0, 8], [-36, 0, 8]], "red", "s_in", 1.6) + F.flow([[-36, 0, 70], [84, 0, 70]], "blue", "s_out", 1.6));
  F.lbl([84, 0, 8], "Liquid feed (after valve)", 20, 28); F.lbl([84, 0, 70], "Suction return", 20, -22); F.lbl([-52, -10, 50], "100 mm PUR wall", -34, 10); F.lbl([0, -14, 52], "Ice annulus on coil", -10, -52); F.lbl([66, -24, 12], "Brine pump", 22, 22); F.lbl([44, -28, 76], "Level probe", 30, -22); F.lbl([52, 34, 110], "Section plan (live radii)", 24, -8);
  return F;
};

// ---------------- M9 grid cabinet + pole ----------------
PAGES.grid = (v = V0) => {
  const F = new Fig(W, H, [...k.boxCorners({ x: -60, y: -20, w: 190, d: 50 }, -8, 170)], v);
  F.base({ x: -70, y: -30, w: 210, d: 72 }, -8, 6);
  F.add(60, -2, 62, F.box({ x: 0, y: -4, w: 120, d: 4, r: 1 }, 0, 124, "lo", 3, 0.5), -3);
  F.add(60, 0, 60, F.seg([2, 0, 24], [118, 0, 24], "lo") + F.seg([2, 0, 56], [118, 0, 56], "lo") + F.seg([2, 0, 92], [118, 0, 92], "lo"), -2);
  const blk = (x, w, z, h, tone = "hi", d = 14) => F.add(x + w / 2, d / 2, z + h / 2, F.box({ x, y: 0, w, d, r: 1.2 }, z, h, tone, 3, 0.5), 1);
  [8, 20, 32].forEach((x) => blk(x, 10, 92, 26)); blk(46, 30, 92, 26, "mid"); blk(82, 22, 92, 26, "mid");
  blk(8, 46, 52, 34, "hi", 12); F.add(30, 12, 80, `<g data-d="meter"></g>`, 3);
  [70, 86, 102].forEach((x) => F.add(x, 6, 66, F.cyl(x, 6, 7, 56, 8, "hi", 18, 0.4) + F.L(k.ring(x, 6, 4, 64, F.P, 16), { tone: "faint" }) + F.rod([x, 6, 50], [x, 6, 76], 1.4, "mid"), 1));
  [8, 28, 48, 68].forEach((x) => blk(x, 14, 10, 32, "mid", 10)); F.add(100, 4, 28, F.box({ x: 90, y: 0, w: 24, d: 8, r: 1 }, 18, 20, "lo", 2, 0.3), 1);
  F.add(60, 5, 46, F.rod([2, 5, 46], [118, 5, 46], 1.4, "lo"), 0.5);
  const pole = [-40, -10]; F.add(pole[0], pole[1], 80, F.cyl(pole[0], pole[1], 3.4, 0, 150, "mid", 14) + F.box({ x: pole[0] - 14, y: pole[1] - 2, w: 28, d: 4, r: 0.8 }, 142, 3, "mid", 2, 0.3) + [-10, 0, 10].map((o) => F.cyl(pole[0] + o, pole[1], 1.6, 145, 7, "lo", 8)).join(""), -4);
  F.top.push(F.flow([[-50, -10, 152], [-40, -10, 152], [-40, -10, 130], [5, 14, 130], [14, 14, 118]], "mid", "srv", 1.5), F.flow([[14, 15, 92], [14, 15, 86]], "lit", "w1", 1.3), F.flow([[30, 15, 52], [30, 15, 44]], "lit", "w2", 1.3), F.flow([[50, 15, 44], [50, 15, 40]], "lit", "w3", 1.3));
  F.top.push(F.flow([[75, 7, 50], [75, 7, 44], [100, 7, 44]], "lit", "w4", 1.4));
  F.lbl([20, 0, 118], "SPD type 1+2", -20, -30); F.lbl([60, 0, 118], "Main MCB 3×32 A", 28, -26); F.lbl([92, 0, 118], "RCD 30 mA", 26, -12); F.lbl([54, 12, 66], "Bidirectional meter", 40, -24); F.lbl([86, 6, 66], "Current transformers", 34, 6); F.lbl([40, 5, 42], "Outgoing MCBs", 38, 30); F.lbl([-40, -10, 120], "Service pole", -22, 18); F.lbl([-40, -10, 148], "Utility drop", -26, -24);
  return F;
};

// ---------------- M10 cold room (wall layers exploded) ----------------
PAGES.room = (v = V0) => {
  const F = new Fig(W, H, [...k.boxCorners({ x: -100, y: -70, w: 200, d: 150 }, -8, 125)], v);
  F.base({ x: -112, y: -80, w: 232, d: 176 }, -8, 6);
  F.add(0, 10, 3, F.box({ x: -92, y: -22, w: 184, d: 100, r: 2 }, 0, 6, "mid", 3, 0.5) + F.L(k.planOutline(k.insetPlan({ x: -92, y: -22, w: 184, d: 100, r: 2 }, 6), 6, F.P, 3), { tone: "faint" }), -1);
  const layers = [[-62, 3, "mid"], [-44, 14, "lo"], [-22, 3, "mid"]];
  layers.forEach(([y, d, tone], i) => { F.add(0, y, 60, F.box({ x: -92, y, w: 184, d, r: 0.8 }, 6, 100, tone, 2, 0.4) + (i === 1 ? F.L([-80, -60, -40, -20, 0, 20, 40, 60, 80].map((x) => k.rise([x, y + d, 0], 10, 102, F.P)).join(""), { tone: "faint" }) : ""), -2 + i * 0.3); });
  F.top.push(F.dashed([[-92, -62, 106], [-92, -22, 106]]) + F.dashed([[92, -62, 106], [92, -22, 106]]));
  F.add(-92, 24, 60, F.box({ x: -96, y: -22, w: 4, d: 100, r: 0.5 }, 6, 100, "mid", 2, 0.4), -2);
  for (let i = 0; i < 6; i++) F.add(-86, -10 + i * 10, 40, F.box({ x: -94, y: 6 + i * 4, w: 2.2, d: 3.4, r: 0.3 }, 10, 60, "lo", 1, 0.1), 0.2);
  for (const [x, y, n] of [[-60, 30, 3], [-30, 30, 2], [0, 40, 2], [30, 30, 3]]) for (let z = 0; z < n; z++) F.add(x + 15, y + 12, 6 + z * 14 + 7, F.box({ x, y, w: 30, d: 24, r: 1.2 }, 6 + z * 14, 13, "mid", 2, 0.4) + F.L(k.lineOnTop([x + 15, y], [x + 15, y + 24], 6 + z * 14 + 13, F.P), { tone: "lo" }), 2);
  F.add(60, -10, 55, F.box({ x: 36, y: -18, w: 52, d: 22, r: 2 }, 40, 26, "hi", 3, 0.7) + F.L(k.sideRing([50, 4.5, 53], 8, "y", F.P, 24) + k.sideRing([74, 4.5, 53], 8, "y", F.P, 24), { tone: "mid" }), 1);
  F.slot(0, 0, 90, "arrows", 6);
  F.add(60, 62, 3, F.box({ x: 40, y: 50, w: 40, d: 30, r: 2 }, 0, 4, "lo", 2, 0.3), -1);
  F.lbl([-92, -60, 100], "Outer skin 0.6 mm", -10, -30); F.lbl([-92, -40, 100], "PUR core 100 mm, λ 0.022 W/mK", -14, -48); F.lbl([-92, -22, 100], "Inner skin + vapour barrier", -16, -18); F.lbl([-94, 6, 60], "Door with strip curtain", -36, 24); F.lbl([24, 40, 20], "Product thermal mass", 40, 28); F.lbl([88, -8, 60], "Unit cooler", 28, -34); F.lbl([60, 78, 6], "Floor: insulated, heated", 26, 24);
  return F;
};
