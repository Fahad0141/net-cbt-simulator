import { defineBank } from '@/engine/authoring';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

/**
 * Problem Solving and Visual Communication, part A: parametric non-verbal reasoning items with
 * programmatically drawn figures (figure series, odd figure out, mirror and water images,
 * rotation, figure analogies, figure matrices, paper folding, cube nets, counting figures and
 * sign shapes).
 *
 * Part B (`visual-reasoning.concepts.ts`, ids starting with `c-`) holds the conceptual and
 * past-paper-style fixed questions.
 *
 * Figure items draw the problem figures and the four answer figures (A)-(D) in one SVG and use
 * the options 'A'-'D' in fixed order; the correct position is random. Figures are built on an
 * integer lattice so that rotations and reflections are exact, and every candidate set is
 * checked for distinctness (distractors are deliberate rule violations). Dark ink on a
 * transparent background; no ids, classes, scripts or external references.
 */

// ---------------------------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------------------------

type Pt = readonly [number, number];

const INK = '#222';
const GREY = '#a6a6a6';
const W = 560;
const LETTERS = ['A', 'B', 'C', 'D'] as const;

const at = <T>(xs: readonly T[], i: number): T => xs[i] as T;
const f1 = (x: number): string => String(Number(x.toFixed(1)));
const mod = (a: number, n: number): number => ((a % n) + n) % n;

const svg = (w: number, h: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ` +
  `font-family="Arial, Helvetica, sans-serif">${body}</svg>`;

interface StrokeOpts {
  fill?: string;
  sw?: number;
  dash?: boolean;
}

const dashAttr = (o: StrokeOpts): string => (o.dash ? ' stroke-dasharray="6 4"' : '');

const rect = (x: number, y: number, w: number, h: number, o: StrokeOpts = {}): string =>
  `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${o.fill ?? 'none'}" ` +
  `stroke="${INK}" stroke-width="${o.sw ?? 2}"${dashAttr(o)}/>`;

const line = (a: Pt, b: Pt, o: StrokeOpts = {}): string =>
  `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${INK}" ` +
  `stroke-width="${o.sw ?? 2}" stroke-linecap="round"${dashAttr(o)}/>`;

const circ = (c: Pt, r: number, o: StrokeOpts = {}): string =>
  `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(r)}" fill="${o.fill ?? 'none'}" stroke="${INK}" ` +
  `stroke-width="${o.sw ?? 2}"/>`;

const poly = (pts: readonly Pt[], o: StrokeOpts = {}): string =>
  `<polygon points="${pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ')}" fill="${o.fill ?? 'none'}" ` +
  `stroke="${INK}" stroke-width="${o.sw ?? 2}" stroke-linejoin="round"${dashAttr(o)}/>`;

const txt = (p: Pt, s: string, size = 14, bold = false): string =>
  `<text x="${f1(p[0])}" y="${f1(p[1])}" font-size="${size}" text-anchor="middle" fill="${INK}"` +
  `${bold ? ' font-weight="bold"' : ''}>${s}</text>`;

/** A straight arrow from a to b with a filled head. */
function arrow(a: Pt, b: Pt, sw = 2): string {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const ux = (b[0] - a[0]) / len;
  const uy = (b[1] - a[1]) / len;
  const base: Pt = [b[0] - 9 * ux, b[1] - 9 * uy];
  return (
    line(a, base, { sw }) +
    poly(
      [b, [base[0] - 5 * uy, base[1] + 5 * ux], [base[0] + 5 * uy, base[1] - 5 * ux]],
      { fill: INK, sw: 1 },
    )
  );
}

/** Regular polygon vertices (first vertex straight up unless `start` is given, degrees). */
function ngon(c: Pt, r: number, n: number, start = -90): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((start + (360 * i) / n) * Math.PI) / 180;
    out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return out;
}

/** Draws something centred at (cx, cy) inside a cell of side s. */
type Draw = (cx: number, cy: number, s: number) => string;

/** Builds the letter-option question: candidate 0 of `cands` is correct; positions are shuffled. */
function placeCandidates<T>(r: Rng, correct: T, wrong: readonly T[]): { order: T[]; letter: string } {
  if (wrong.length !== 3) throw new Error(`expected 3 wrong candidates, got ${wrong.length}`);
  const all = [correct, ...wrong];
  const idx = r.shuffle([0, 1, 2, 3]);
  const order = idx.map((i) => at(all, i));
  return { order, letter: at(LETTERS, idx.indexOf(0)) };
}

function letterQuestion(stem: string, letter: string, explanation: string, figure: string): AuthoredQuestion {
  return {
    stem,
    answer: letter,
    distractors: LETTERS.filter((l) => l !== letter),
    fixedOrder: [...LETTERS],
    explanation,
    figure,
  };
}

/** Four labelled answer cells of side s in one row starting at y0. */
function answerRow(y0: number, draws: readonly Draw[], s = 80, gap = 44): string {
  const total = 4 * s + 3 * gap;
  const x0 = (W - total) / 2;
  let out = '';
  draws.forEach((d, i) => {
    const x = x0 + i * (s + gap);
    out += rect(x, y0, s, s, { sw: 1.5 });
    out += d(x + s / 2, y0 + s / 2, s);
    out += txt([x + s / 2, y0 + s + 18], `(${at(LETTERS, i)})`, 14, true);
  });
  return out;
}

/** A row of problem cells (null = the '?' cell), centred, starting at y0. */
function problemRow(y0: number, cells: ReadonlyArray<Draw | null | string>, s = 80, gap = 14): string {
  const total = cells.length * s + (cells.length - 1) * gap;
  const x0 = (W - total) / 2;
  let out = '';
  cells.forEach((d, i) => {
    const x = x0 + i * (s + gap);
    if (typeof d === 'string') {
      out += txt([x + s / 2, y0 + s / 2 + 8], d, 24, true);
      return;
    }
    out += rect(x, y0, s, s, { sw: 1.5 });
    out += d ? d(x + s / 2, y0 + s / 2, s) : txt([x + s / 2, y0 + s / 2 + 11], '?', 32, true);
  });
  return out;
}

/** Problem area of height topH above a dashed separator and the answer row. */
function withAnswers(top: string, topH: number, answers: readonly Draw[]): string {
  const y0 = topH + 22;
  return svg(W, y0 + 80 + 28, top + line([20, topH + 11], [W - 20, topH + 11], { sw: 1, dash: true }) + answerRow(y0, answers));
}

// ---------------------------------------------------------------------------------------------
// Lattice glyphs: exact rotations and reflections by integer matrices
// ---------------------------------------------------------------------------------------------

type Kind = 'shade' | 'cell' | 'seg' | 'dot' | 'ring' | 'block' | 'box' | 'plus' | 'cross' | 'arrow' | 'tri' | 'head';

interface Item {
  k: Kind;
  x: number;
  y: number;
  /** Second end point (segments). */
  x2?: number;
  y2?: number;
  /** Direction (oriented items: arrow, tri, head). */
  dx?: number;
  dy?: number;
}

interface Glyph {
  items: Item[];
  /** Framed glyphs keep their absolute position inside a fixed 3x3 square frame. */
  frame: boolean;
}

/** (x, y) -> (a x + b y, c x + d y); screen coordinates (y down). */
type Mat = readonly [number, number, number, number];

const T = {
  I: [1, 0, 0, 1],
  R90: [0, -1, 1, 0], // 90 degrees clockwise on screen
  R180: [-1, 0, 0, -1],
  R270: [0, 1, -1, 0], // 90 degrees anticlockwise
  MV: [-1, 0, 0, 1], // mirror in a vertical line (left-right flip)
  MH: [1, 0, 0, -1], // mirror in a horizontal line (top-bottom flip, water image)
  MD: [0, 1, 1, 0],
  MA: [0, -1, -1, 0],
} as const satisfies Record<string, Mat>;

type TName = keyof typeof T;
const ROT: readonly TName[] = ['I', 'R90', 'R180', 'R270'];

const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
];

function apply(m: Mat, g: Glyph): Glyph {
  const tx = (x: number, y: number): [number, number] => [m[0] * x + m[1] * y + 0, m[2] * x + m[3] * y + 0];
  return {
    frame: g.frame,
    items: g.items.map((it) => {
      const [x, y] = tx(it.x, it.y);
      const out: Item = { k: it.k, x, y };
      if (it.x2 !== undefined && it.y2 !== undefined) [out.x2, out.y2] = tx(it.x2, it.y2);
      if (it.dx !== undefined && it.dy !== undefined) [out.dx, out.dy] = tx(it.dx, it.dy);
      return out;
    }),
  };
}

/** Canonical signature: equal signatures <=> identical pictures. */
function sig(g: Glyph): string {
  let ox = 0;
  let oy = 0;
  if (!g.frame) {
    ox = Math.min(...g.items.flatMap((it) => (it.x2 === undefined ? [it.x] : [it.x, it.x2])));
    oy = Math.min(...g.items.flatMap((it) => (it.y2 === undefined ? [it.y] : [it.y, it.y2])));
  }
  return g.items
    .map((it) => {
      if (it.k === 'seg') {
        const a = `${it.x - ox},${it.y - oy}`;
        const b = `${(it.x2 ?? 0) - ox},${(it.y2 ?? 0) - oy}`;
        return `seg:${a < b ? a + '/' + b : b + '/' + a}`;
      }
      const d = it.dx === undefined ? '' : `>${it.dx},${it.dy}`;
      return `${it.k}:${it.x - ox},${it.y - oy}${d}`;
    })
    .sort()
    .join(' ');
}

/** True when the 8 rotations/reflections of g are all different pictures. */
function isAsym(g: Glyph): boolean {
  return new Set((Object.keys(T) as TName[]).map((n) => sig(apply(T[n], g)))).size === 8;
}

const DIRS: readonly Pt[] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

function framedGlyph(r: Rng): Glyph {
  const spots: Pt[] = [];
  for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) spots.push([x, y]);
  const pos = r.sample(spots, r.int(3, 4));
  const kinds: Kind[] = r.sample(['dot', 'ring', 'block', 'box', 'plus', 'cross'] as Kind[], pos.length);
  if (r.chance(0.6)) kinds[0] = r.pick(['arrow', 'tri'] as Kind[]);
  return {
    frame: true,
    items: pos.map((p, i) => {
      const k = at(kinds, i);
      if (k === 'arrow' || k === 'tri') {
        const d = r.pick(DIRS);
        return { k, x: p[0], y: p[1], dx: d[0], dy: d[1] };
      }
      return { k, x: p[0], y: p[1] };
    }),
  };
}

function pathGlyph(r: Rng): Glyph {
  for (let tries = 0; tries < 50; tries++) {
    const pts: Pt[] = [[r.int(0, 2), r.int(0, 2)]];
    const len = r.int(3, 5);
    while (pts.length <= len) {
      const last = at(pts, pts.length - 1);
      const options = DIRS.map((d): Pt => [last[0] + d[0], last[1] + d[1]]).filter(
        (p) => p[0] >= 0 && p[0] <= 2 && p[1] >= 0 && p[1] <= 2 && !pts.some((q) => q[0] === p[0] && q[1] === p[1]),
      );
      if (!options.length) break;
      pts.push(r.pick(options));
    }
    if (pts.length < 4) continue;
    const items: Item[] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = at(pts, i);
      const b = at(pts, i + 1);
      items.push({ k: 'seg', x: a[0], y: a[1], x2: b[0], y2: b[1] });
    }
    const s0 = at(pts, 0);
    const e = at(pts, pts.length - 1);
    const p = at(pts, pts.length - 2);
    items.push({ k: 'dot', x: s0[0], y: s0[1] });
    items.push({ k: 'head', x: e[0], y: e[1], dx: e[0] - p[0], dy: e[1] - p[1] });
    return { frame: false, items };
  }
  return FALLBACK;
}

function polyGlyph(r: Rng): Glyph {
  const cells: Pt[] = [[r.int(0, 2), r.int(0, 2)]];
  const size = r.int(4, 5);
  for (let guard = 0; cells.length < size && guard < 200; guard++) {
    const base = r.pick(cells);
    const d = r.pick(DIRS);
    const p: Pt = [base[0] + d[0], base[1] + d[1]];
    if (p[0] < 0 || p[0] > 2 || p[1] < 0 || p[1] > 2) continue;
    if (cells.some((q) => q[0] === p[0] && q[1] === p[1])) continue;
    cells.push(p);
  }
  const shaded = r.int(0, cells.length - 1);
  const items: Item[] = cells.map((c, i) => ({ k: i === shaded ? 'shade' : 'cell', x: c[0], y: c[1] }));
  if (r.chance(0.5)) {
    const others = cells.filter((_, i) => i !== shaded);
    const c = r.pick(others);
    items.push({ k: 'dot', x: c[0], y: c[1] });
  }
  return { frame: false, items };
}

/** A known fully asymmetric glyph (a hooked path), used only if random search fails. */
const FALLBACK: Glyph = {
  frame: false,
  items: [
    { k: 'seg', x: 0, y: 0, x2: 1, y2: 0 },
    { k: 'seg', x: 1, y: 0, x2: 1, y2: 1 },
    { k: 'seg', x: 1, y: 1, x2: 1, y2: 2 },
    { k: 'seg', x: 1, y: 2, x2: 2, y2: 2 },
    { k: 'dot', x: 0, y: 0 },
    { k: 'head', x: 2, y: 2, dx: 1, dy: 0 },
  ],
};

type Family = 'framed' | 'path' | 'poly';
const GENS: Record<Family, (r: Rng) => Glyph> = { framed: framedGlyph, path: pathGlyph, poly: polyGlyph };

/** A random glyph with no rotational or reflective symmetry. */
function asymGlyph(r: Rng, families: readonly Family[] = ['framed', 'path', 'poly']): Glyph {
  const gen = GENS[r.pick(families)];
  for (let tries = 0; tries < 300; tries++) {
    const g = gen(r);
    if (isAsym(g)) return g;
  }
  return FALLBACK;
}

function glyphBox(g: Glyph): [number, number, number, number] {
  if (g.frame) return [-1.5, -1.5, 1.5, 1.5];
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const it of g.items) {
    const e = it.k === 'cell' || it.k === 'shade' ? 0.5 : 0.25;
    const xs = it.x2 === undefined ? [it.x] : [it.x, it.x2];
    const ys = it.y2 === undefined ? [it.y] : [it.y, it.y2];
    x0 = Math.min(x0, ...xs.map((v) => v - e));
    x1 = Math.max(x1, ...xs.map((v) => v + e));
    y0 = Math.min(y0, ...ys.map((v) => v - e));
    y1 = Math.max(y1, ...ys.map((v) => v + e));
  }
  return [x0, y0, x1, y1];
}

/** Pixels per lattice unit so that g (in any orientation) fits a cell of side s. */
function unitFor(gs: readonly Glyph[], s: number, diagonal = false): number {
  let u = s / 3.2;
  for (const g of gs) {
    const [a, b, c, d] = glyphBox(g);
    const ext = diagonal ? Math.hypot(c - a, d - b) : Math.max(c - a, d - b);
    u = Math.min(u, ((diagonal ? 0.8 : 0.74) * s) / ext);
  }
  return u;
}

const KIND_ORDER: readonly Kind[] = ['shade', 'cell', 'seg', 'dot', 'ring', 'block', 'box', 'plus', 'cross', 'arrow', 'tri', 'head'];

/**
 * Renders a glyph centred on its bounding box. `rot` (degrees, clockwise) and `mirror`
 * (left-right flip applied first) are applied as an SVG transform about the cell centre.
 */
function drawGlyph(g: Glyph, u: number, extra?: { rot: number; mirror: boolean }): Draw {
  return (cx, cy) => {
    const [a, b, c, d] = glyphBox(g);
    const mx = (a + c) / 2;
    const my = (b + d) / 2;
    const P = (x: number, y: number): Pt => [cx + (x - mx) * u, cy + (y - my) * u];
    const items = [...g.items].sort((p, q) => KIND_ORDER.indexOf(p.k) - KIND_ORDER.indexOf(q.k));
    let body = g.frame ? rect(cx - 1.5 * u, cy - 1.5 * u, 3 * u, 3 * u, { sw: 1.5 }) : '';
    for (const it of items) {
      const p = P(it.x, it.y);
      const dx = it.dx ?? 1;
      const dy = it.dy ?? 0;
      const along = (t: number, n: number): Pt => [p[0] + u * (t * dx - n * dy), p[1] + u * (t * dy + n * dx)];
      switch (it.k) {
        case 'shade':
          body += rect(p[0] - u / 2, p[1] - u / 2, u, u, { fill: GREY });
          break;
        case 'cell':
          body += rect(p[0] - u / 2, p[1] - u / 2, u, u);
          break;
        case 'seg':
          body += line(p, P(it.x2 ?? it.x, it.y2 ?? it.y), { sw: 3 });
          break;
        case 'dot':
          body += circ(p, Math.max(3.5, 0.17 * u), { fill: INK, sw: 1 });
          break;
        case 'ring':
          body += circ(p, 0.22 * u);
          break;
        case 'block':
          body += rect(p[0] - 0.19 * u, p[1] - 0.19 * u, 0.38 * u, 0.38 * u, { fill: INK, sw: 1 });
          break;
        case 'box':
          body += rect(p[0] - 0.22 * u, p[1] - 0.22 * u, 0.44 * u, 0.44 * u);
          break;
        case 'plus':
          body += line([p[0] - 0.26 * u, p[1]], [p[0] + 0.26 * u, p[1]], { sw: 2.5 });
          body += line([p[0], p[1] - 0.26 * u], [p[0], p[1] + 0.26 * u], { sw: 2.5 });
          break;
        case 'cross':
          body += line([p[0] - 0.2 * u, p[1] - 0.2 * u], [p[0] + 0.2 * u, p[1] + 0.2 * u], { sw: 2.5 });
          body += line([p[0] - 0.2 * u, p[1] + 0.2 * u], [p[0] + 0.2 * u, p[1] - 0.2 * u], { sw: 2.5 });
          break;
        case 'arrow':
          body += line(along(-0.34, 0), along(0.34, 0), { sw: 2.5 });
          body += line(along(0.34, 0), along(0.14, 0.16), { sw: 2.5 });
          body += line(along(0.34, 0), along(0.14, -0.16), { sw: 2.5 });
          break;
        case 'tri':
          body += poly([along(0.3, 0), along(-0.2, 0.24), along(-0.2, -0.24)], { fill: INK, sw: 1 });
          break;
        case 'head':
          body += poly([along(0.12, 0), along(-0.3, 0.2), along(-0.3, -0.2)], { fill: INK, sw: 1 });
          break;
      }
    }
    if (!extra || (extra.rot === 0 && !extra.mirror)) return body;
    const flip = extra.mirror ? ` translate(${f1(2 * cx)} 0) scale(-1 1)` : '';
    return `<g transform="rotate(${extra.rot} ${f1(cx)} ${f1(cy)})${flip}">${body}</g>`;
  };
}

/** Draws a lattice transform of g (exact) at a common scale u. */
const drawT = (g: Glyph, name: TName, u: number): Draw => drawGlyph(apply(T[name], g), u);

/** What a transform does, completing "the figure ...". */
const T_DONE: Record<TName, string> = {
  I: 'left unchanged',
  R90: 'turned 90° clockwise',
  R180: 'turned through 180°',
  R270: 'turned 90° anticlockwise',
  MV: 'flipped left to right (its mirror image in a vertical line)',
  MH: 'flipped upside down (its water image)',
  MD: 'reflected in a diagonal',
  MA: 'reflected in the other diagonal',
};

/** "a, b and c". */
const joinAnd = (xs: readonly string[]): string =>
  xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${at(xs, xs.length - 1)}`;

/** "(A) turned 90° clockwise, (C) left unchanged and ..." for every option except the correct one. */
const othersText = (order: readonly TName[], correct: TName): string =>
  joinAnd(order.flatMap((n, i) => (n === correct ? [] : [`(${at(LETTERS, i)}) ${T_DONE[n]}`])));

// ---------------------------------------------------------------------------------------------
// Count arrangements (dots, rings, ...) and small shapes
// ---------------------------------------------------------------------------------------------

type Mark = 'dot' | 'ring' | 'block' | 'box' | 'plus';
const MARK_NAME: Record<Mark, string> = {
  dot: 'black dots',
  ring: 'small circles',
  block: 'black squares',
  box: 'small squares',
  plus: 'plus signs',
};

function drawMark(m: Mark, p: Pt, sz: number): string {
  switch (m) {
    case 'dot':
      return circ(p, sz * 0.32, { fill: INK, sw: 1 });
    case 'ring':
      return circ(p, sz * 0.34, { sw: 1.8 });
    case 'block':
      return rect(p[0] - sz * 0.3, p[1] - sz * 0.3, sz * 0.6, sz * 0.6, { fill: INK, sw: 1 });
    case 'box':
      return rect(p[0] - sz * 0.32, p[1] - sz * 0.32, sz * 0.64, sz * 0.64, { sw: 1.8 });
    case 'plus':
      return line([p[0] - sz * 0.3, p[1]], [p[0] + sz * 0.3, p[1]], { sw: 2.2 }) + line([p[0], p[1] - sz * 0.3], [p[0], p[1] + sz * 0.3], { sw: 2.2 });
  }
}

/** n marks in centred rows of at most `perRow`. */
function markGroup(m: Mark, n: number, c: Pt, pitch: number, perRow: number): string {
  const rows = Math.ceil(n / perRow);
  let out = '';
  let left = n;
  for (let row = 0; row < rows; row++) {
    const k = Math.min(perRow, left);
    left -= k;
    const y = c[1] + (row - (rows - 1) / 2) * pitch;
    for (let i = 0; i < k; i++) out += drawMark(m, [c[0] + (i - (k - 1) / 2) * pitch, y], pitch * 0.9);
  }
  return out;
}

type Shape = 'circle' | 'square' | 'triangle' | 'diamond' | 'pentagon' | 'star';
const SHAPE_PLURAL: Record<Shape, string> = {
  circle: 'circles',
  square: 'squares',
  triangle: 'triangles',
  diamond: 'diamonds',
  pentagon: 'pentagons',
  star: 'stars',
};

function drawShape(s: Shape, c: Pt, r: number, fill: string): string {
  const o = { fill, sw: 1.8 };
  switch (s) {
    case 'circle':
      return circ(c, r, o);
    case 'square':
      return rect(c[0] - r * 0.85, c[1] - r * 0.85, r * 1.7, r * 1.7, o);
    case 'triangle':
      return poly(ngon([c[0], c[1] + r * 0.18], r * 1.12, 3), o);
    case 'diamond':
      return poly(ngon(c, r * 1.1, 4), o);
    case 'pentagon':
      return poly(ngon([c[0], c[1] + r * 0.08], r * 1.05, 5), o);
    case 'star': {
      const outer = ngon([c[0], c[1] + r * 0.1], r * 1.2, 5);
      const inner = ngon([c[0], c[1] + r * 0.1], r * 0.5, 5, -90 + 36);
      return poly(outer.flatMap((p, i) => [p, at(inner, i)]), o);
    }
  }
}

/** n copies of a small shape: one row for up to 3, a 2x2 block for 4. */
function shapeGroup(s: Shape, n: number, c: Pt, r: number, fill: string): string {
  const pitch = r * 2.5;
  const pts: Pt[] = [];
  if (n <= 3) for (let i = 0; i < n; i++) pts.push([c[0] + (i - (n - 1) / 2) * pitch, c[1]]);
  else
    for (let i = 0; i < 4; i++) pts.push([c[0] + ((i % 2) - 0.5) * pitch, c[1] + (Math.floor(i / 2) - 0.5) * pitch]);
  return pts.map((p) => drawShape(s, p, r, fill)).join('');
}

// ---------------------------------------------------------------------------------------------
// Eight-position rings (3x3 border cells or 8 pie sectors), listed clockwise from top-left
// ---------------------------------------------------------------------------------------------

const RING_CELLS: readonly Pt[] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
  [2, 2],
  [1, 2],
  [0, 2],
  [0, 1],
];
const RING_NAMES = [
  'top-left corner',
  'top-middle cell',
  'top-right corner',
  'middle-right cell',
  'bottom-right corner',
  'bottom-middle cell',
  'bottom-left corner',
  'middle-left cell',
];

function drawRingGrid(cx: number, cy: number, shaded: number, dot: number | null, s: number): string {
  const c = s * 0.24;
  const x0 = cx - 1.5 * c;
  const y0 = cy - 1.5 * c;
  let out = '';
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const k = RING_CELLS.findIndex((p) => p[0] === i && p[1] === j);
    out += rect(x0 + i * c, y0 + j * c, c, c, { sw: 1.5, ...(k === shaded ? { fill: GREY } : {}) });
  }
  if (dot !== null) {
    const p = at(RING_CELLS, dot);
    out += circ([x0 + (p[0] + 0.5) * c, y0 + (p[1] + 0.5) * c], c * 0.24, { fill: INK, sw: 1 });
  }
  return out;
}

function drawPie(cx: number, cy: number, shaded: number, s: number): string {
  const R = s * 0.36;
  let out = '';
  for (let i = 0; i < 8; i++) {
    const a0 = ((-90 + 45 * i) * Math.PI) / 180;
    const a1 = ((-90 + 45 * (i + 1)) * Math.PI) / 180;
    if (i === shaded) {
      out +=
        `<path d="M${f1(cx)} ${f1(cy)} L${f1(cx + R * Math.cos(a0))} ${f1(cy + R * Math.sin(a0))} ` +
        `A${f1(R)} ${f1(R)} 0 0 1 ${f1(cx + R * Math.cos(a1))} ${f1(cy + R * Math.sin(a1))} Z" fill="${GREY}" stroke="${INK}" stroke-width="1.5"/>`;
    }
  }
  out += circ([cx, cy], R);
  for (let i = 0; i < 4; i++) {
    const a = ((-90 + 45 * i) * Math.PI) / 180;
    out += line([cx - R * Math.cos(a), cy - R * Math.sin(a)], [cx + R * Math.cos(a), cy + R * Math.sin(a)], { sw: 1.5 });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Paper folding (sheet coordinates doubled: side 8, hole centres at odd values 1..7)
// ---------------------------------------------------------------------------------------------

/** A fold line: x = c, y = c, the main diagonal (y = x) or the anti-diagonal (x + y = 8). */
interface Fold {
  t: 'x' | 'y' | 'd' | 'a';
  c: number;
  /** Which side of the line stays in place (the other side is folded onto it). */
  keepLow: boolean;
}

const side = (f: Fold, p: Pt): number => {
  switch (f.t) {
    case 'x':
      return p[0] - f.c;
    case 'y':
      return p[1] - f.c;
    case 'd':
      return p[1] - p[0];
    case 'a':
      return p[0] + p[1] - 8;
  }
};
const kept = (f: Fold, p: Pt): boolean => (f.keepLow ? side(f, p) < 0 : side(f, p) > 0);

function reflect(f: Fold, p: Pt): Pt {
  switch (f.t) {
    case 'x':
      return [2 * f.c - p[0], p[1]];
    case 'y':
      return [p[0], 2 * f.c - p[1]];
    case 'd':
      return [p[1], p[0]];
    case 'a':
      return [8 - p[1], 8 - p[0]];
  }
}

/** Sutherland-Hodgman clip of a convex polygon to the kept side of a fold. */
function clipKeep(polyPts: readonly Pt[], f: Fold, keepLow: boolean): Pt[] {
  const val = (p: Pt): number => (keepLow ? -side(f, p) : side(f, p));
  const out: Pt[] = [];
  for (let i = 0; i < polyPts.length; i++) {
    const a = at(polyPts, i);
    const b = at(polyPts, (i + 1) % polyPts.length);
    const va = val(a);
    const vb = val(b);
    if (va >= 0) out.push(a);
    if ((va > 0 && vb < 0) || (va < 0 && vb > 0)) {
      const t = va / (va - vb);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}

const SHEET: readonly Pt[] = [
  [0, 0],
  [8, 0],
  [8, 8],
  [0, 8],
];

const holeKey = (hs: readonly Pt[]): string =>
  [...new Set(hs.map((h) => `${h[0]},${h[1]}`))].sort().join(';');

function uniqHoles(hs: readonly Pt[]): Pt[] {
  const seen = new Set<string>();
  const out: Pt[] = [];
  for (const h of hs) {
    const k = `${h[0]},${h[1]}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(h);
    }
  }
  return out;
}

/** Holes after unfolding the given folds in reverse order. */
function unfold(folds: readonly Fold[], p: Pt): Pt[] {
  let holes: Pt[] = [p];
  for (let i = folds.length - 1; i >= 0; i--) {
    const f = at(folds, i);
    holes = uniqHoles([...holes, ...holes.map((h) => reflect(f, h))]);
  }
  return holes;
}

const SHEET_PX = 64;
const K = SHEET_PX / 8;

const centroid = (pts: readonly Pt[]): Pt => [
  pts.reduce((s, p) => s + p[0], 0) / pts.length,
  pts.reduce((s, p) => s + p[1], 0) / pts.length,
];

/** Panel showing `region` (solid) inside the dashed outline of the sheet, plus optional fold and hole. */
function foldPanel(region: readonly Pt[], fold: Fold | null, hole: Pt | null): Draw {
  return (cx, cy) => {
    const ox = cx - SHEET_PX / 2;
    const oy = cy - SHEET_PX / 2;
    const P = (p: Pt): Pt => [ox + p[0] * K, oy + p[1] * K];
    let out = '';
    if (region.length !== 4 || holeKey(region) !== holeKey(SHEET)) out += poly(SHEET.map(P), { sw: 1, dash: true });
    out += poly(region.map(P), { sw: 2 });
    if (fold) {
      const moving = clipKeep(region, fold, !fold.keepLow);
      const stay = clipKeep(region, fold, fold.keepLow);
      out += foldLineInRegion(region, fold, P);
      out += arrow(P(centroid(moving)), P(centroid(stay)), 1.8);
    }
    if (hole) out += circ(P(hole), 4.2, { fill: INK, sw: 1 });
    return out;
  };
}

/** Dashed fold line clipped to the convex region. */
function foldLineInRegion(region: readonly Pt[], f: Fold, P: (p: Pt) => Pt): string {
  // Intersections of the line with the region's edges.
  const pts: Pt[] = [];
  for (let i = 0; i < region.length; i++) {
    const a = at(region, i);
    const b = at(region, (i + 1) % region.length);
    const va = side(f, a);
    const vb = side(f, b);
    if (va === 0) pts.push(a);
    if ((va > 0 && vb < 0) || (va < 0 && vb > 0)) {
      const t = va / (va - vb);
      pts.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  if (pts.length < 2) return '';
  let best: [Pt, Pt] = [at(pts, 0), at(pts, 1)];
  let bestD = -1;
  for (const p of pts)
    for (const q of pts) {
      const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (d > bestD) {
        bestD = d;
        best = [p, q];
      }
    }
  return line(P(best[0]), P(best[1]), { sw: 1.8, dash: true });
}

function holesPanel(holes: readonly Pt[]): Draw {
  return (cx, cy) => {
    const ox = cx - SHEET_PX / 2;
    const oy = cy - SHEET_PX / 2;
    let out = rect(ox, oy, SHEET_PX, SHEET_PX, { sw: 2 });
    for (const h of holes) out += circ([ox + h[0] * K, oy + h[1] * K], 4.2, { fill: INK, sw: 1 });
    return out;
  };
}

// ---------------------------------------------------------------------------------------------
// Cube nets (hexominoes) and folding
// ---------------------------------------------------------------------------------------------

type V3 = readonly [number, number, number];
const neg = (v: V3): V3 => [-v[0], -v[1], -v[2]];
const vkey = (v: V3): string => v.join(',');

/** Folds a set of unit squares; returns the outward normal of each square (by index). */
function foldNormals(cells: readonly Pt[]): V3[] {
  const normals: Array<V3 | undefined> = cells.map(() => undefined);
  const east: Array<V3 | undefined> = cells.map(() => undefined);
  const south: Array<V3 | undefined> = cells.map(() => undefined);
  normals[0] = [0, 0, -1];
  east[0] = [1, 0, 0];
  south[0] = [0, 1, 0];
  const queue = [0];
  while (queue.length) {
    const i = queue.shift() as number;
    const c = at(cells, i);
    const n = normals[i] as V3;
    const e = east[i] as V3;
    const s = south[i] as V3;
    cells.forEach((q, j) => {
      if (normals[j]) return;
      const dx = q[0] - c[0];
      const dy = q[1] - c[1];
      if (Math.abs(dx) + Math.abs(dy) !== 1) return;
      if (dx === 1) [normals[j], east[j], south[j]] = [e, neg(n), s];
      else if (dx === -1) [normals[j], east[j], south[j]] = [neg(e), n, s];
      else if (dy === 1) [normals[j], east[j], south[j]] = [s, e, neg(n)];
      else [normals[j], east[j], south[j]] = [neg(s), e, n];
      queue.push(j);
    });
  }
  return normals.map((v) => v ?? [0, 0, 0]);
}

const foldsToCube = (cells: readonly Pt[]): boolean => new Set(foldNormals(cells).map(vkey)).size === 6;

function randomHexomino(r: Rng): Pt[] {
  const cells: Pt[] = [[0, 0]];
  while (cells.length < 6) {
    const base = r.pick(cells);
    const d = r.pick(DIRS);
    const p: Pt = [base[0] + d[0], base[1] + d[1]];
    if (!cells.some((q) => q[0] === p[0] && q[1] === p[1])) cells.push(p);
  }
  return normCells(cells);
}

function normCells(cells: readonly Pt[]): Pt[] {
  const mx = Math.min(...cells.map((c) => c[0]));
  const my = Math.min(...cells.map((c) => c[1]));
  return cells.map((c): Pt => [c[0] - mx, c[1] - my]);
}

const hasBlock2x2 = (cells: readonly Pt[]): boolean => {
  const has = (x: number, y: number): boolean => cells.some((c) => c[0] === x && c[1] === y);
  return cells.some((c) => has(c[0] + 1, c[1]) && has(c[0], c[1] + 1) && has(c[0] + 1, c[1] + 1));
};

const longestRun = (cells: readonly Pt[]): number => {
  const has = (x: number, y: number): boolean => cells.some((c) => c[0] === x && c[1] === y);
  let best = 0;
  for (const c of cells) {
    let h = 1;
    while (has(c[0] + h, c[1])) h++;
    let v = 1;
    while (has(c[0], c[1] + v)) v++;
    best = Math.max(best, h, v);
  }
  return best;
};

function whyNotNet(cells: readonly Pt[]): string {
  if (hasBlock2x2(cells)) return 'it contains a 2×2 block of squares, and four faces cannot meet flat around one corner of a cube';
  if (longestRun(cells) >= 5) return 'it has five or more squares in a straight line, so the strip wraps round past its start and overlaps';
  return 'two of its squares fold onto the same face of the cube, leaving another face open';
}

function drawCells(cells: readonly Pt[], c: Pt, unit: number, labels?: readonly string[]): string {
  const w = Math.max(...cells.map((p) => p[0])) + 1;
  const h = Math.max(...cells.map((p) => p[1])) + 1;
  const x0 = c[0] - (w * unit) / 2;
  const y0 = c[1] - (h * unit) / 2;
  let out = '';
  cells.forEach((p, i) => {
    out += rect(x0 + p[0] * unit, y0 + p[1] * unit, unit, unit, { sw: 2 });
    if (labels) out += txt([x0 + (p[0] + 0.5) * unit, y0 + (p[1] + 0.5) * unit + 7], at(labels, i), 20, true);
  });
  return out;
}

// ---------------------------------------------------------------------------------------------
// Mirror text (letter groups drawn one character per slot)
// ---------------------------------------------------------------------------------------------

/** Characters with no line or rotational symmetry (no two of their images coincide). */
const ASYM_CHARS = ['F', 'G', 'J', 'P', 'R', 'Q', '4'] as const;

type CharT = 'none' | 'h' | 'v' | 'r';
interface TextImage {
  rev: boolean;
  t: CharT;
}

function drawTextImage(chars: readonly string[], img: TextImage, cx: number, cy: number, size: number): string {
  const n = chars.length;
  const pitch = size * 0.82;
  const seq = img.rev ? [...chars].reverse() : chars;
  const tr: Record<CharT, string> = { none: '', h: ' scale(-1 1)', v: ' scale(1 -1)', r: ' rotate(180)' };
  return seq
    .map((ch, i) => {
      const x = cx + (i - (n - 1) / 2) * pitch;
      return (
        `<g transform="translate(${f1(x)} ${f1(cy)})${tr[img.t]}">` +
        `<text x="0" y="${f1(size * 0.36)}" font-size="${size}" font-weight="bold" text-anchor="middle" fill="${INK}">${ch}</text></g>`
      );
    })
    .join('');
}

// ---------------------------------------------------------------------------------------------
// Transparent sheets: line segments on a 3x3 square grid (lattice points 0..3)
// ---------------------------------------------------------------------------------------------

type Seg = readonly [number, number, number, number];

const segKey = (s: Seg): string => {
  const a = `${s[0]},${s[1]}`;
  const b2 = `${s[2]},${s[3]}`;
  return a < b2 ? `${a}-${b2}` : `${b2}-${a}`;
};
const segsKey = (ss: readonly Seg[]): string => [...new Set(ss.map(segKey))].sort().join(' ');

/** Interior grid edges and the diagonals of the nine small squares. */
const SHEET_SEGS: readonly Seg[] = (() => {
  const out: Seg[] = [];
  for (let y = 1; y <= 2; y++) for (let x = 0; x < 3; x++) out.push([x, y, x + 1, y]);
  for (let x = 1; x <= 2; x++) for (let y = 0; y < 3; y++) out.push([x, y, x, y + 1]);
  for (let x = 0; x < 3; x++)
    for (let y = 0; y < 3; y++) {
      out.push([x, y, x + 1, y + 1]);
      out.push([x + 1, y, x, y + 1]);
    }
  return out;
})();

/** Applies a lattice transform about the centre (1.5, 1.5) of the sheet. */
function tSeg(m: Mat, s: Seg): Seg {
  const f = (x: number, y: number): [number, number] => [
    m[0] * (x - 1.5) + m[1] * (y - 1.5) + 1.5 + 0,
    m[2] * (x - 1.5) + m[3] * (y - 1.5) + 1.5 + 0,
  ];
  const [a, b2] = f(s[0], s[1]);
  const [c, d] = f(s[2], s[3]);
  return [a, b2, c, d];
}

function drawSheet(segs: readonly Seg[], u = 19): Draw {
  return (cx, cy) => {
    const x0 = cx - 1.5 * u;
    const y0 = cy - 1.5 * u;
    let out = rect(x0, y0, 3 * u, 3 * u, { sw: 2 });
    for (const s of segs) out += line([x0 + s[0] * u, y0 + s[1] * u], [x0 + s[2] * u, y0 + s[3] * u], { sw: 2.6 });
    return out;
  };
}

const connected = (cells: readonly Pt[]): boolean => {
  if (!cells.length) return true;
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const i = queue.pop() as number;
    const c = at(cells, i);
    cells.forEach((q, j) => {
      if (!seen.has(j) && Math.abs(q[0] - c[0]) + Math.abs(q[1] - c[1]) === 1) {
        seen.add(j);
        queue.push(j);
      }
    });
  }
  return seen.size === cells.length;
};

// ---------------------------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------------------------

const SERIES_STEMS = [
  'Study the problem figures. Which answer figure comes next in the series?',
  'The problem figures form a series. Which answer figure continues it?',
  'Which answer figure should replace the question mark to continue the series?',
];

export default defineBank('design', 'visual-reasoning', (b) => [
  // ---------------------------------------------------------------------------- figure series
  b.dynamic('series-rotation', { difficulty: 1, origin: 'past-paper', tags: ['figure series', 'rotation', 'non-verbal reasoning'] }, (r) => {
    const g = asymGlyph(r, ['path', 'poly']);
    const step = r.pick([90, -90, 45, -45]);
    const a0 = r.pick([0, 45, 90, 135, 180, 225, 270, 315]);
    const u = unitFor([g], 80, true);
    type Cand = { a: number; m: boolean };
    const correct: Cand = { a: mod(a0 + 4 * step, 360), m: false };
    const pool: Cand[] = [
      { a: mod(a0 + 3 * step, 360), m: false }, // no turn after the last figure
      { a: mod(a0 + 5 * step, 360), m: false }, // one step too many
      { a: mod(a0 + 4 * step, 360), m: true }, // mirror image
      { a: mod(a0 + 4 * step + 180, 360), m: false },
      { a: mod(a0 - 4 * step, 360), m: false }, // turned the wrong way
    ];
    const key = (c: Cand): string => `${c.a}|${c.m}`;
    const seen = new Set([key(correct)]);
    const wrong: Cand[] = [];
    for (const c of [at(pool, 0), at(pool, 2), ...r.shuffle([at(pool, 1), at(pool, 3), at(pool, 4)])]) {
      if (wrong.length < 3 && !seen.has(key(c))) {
        seen.add(key(c));
        wrong.push(c);
      }
    }
    const { order, letter } = placeCandidates(r, correct, wrong);
    const fig = (c: Cand): Draw => drawGlyph(g, u, { rot: c.a, mirror: c.m });
    const top = problemRow(10, [...[0, 1, 2, 3].map((i) => fig({ a: mod(a0 + i * step, 360), m: false })), null]);
    const dir = step > 0 ? 'clockwise' : 'anticlockwise';
    const deg = Math.abs(step);
    return letterQuestion(
      r.pick(SERIES_STEMS),
      letter,
      `Each figure is the previous one turned through ${deg}° ${dir}. Turning the fourth figure a further ${deg}° ${dir} gives figure (${letter}). The other answer figures are turned by the wrong amount or in the wrong direction, or are a mirror image (flipped), which no rotation can produce.`,
      withAnswers(top, 100, order.map(fig)),
    );
  }),

  b.dynamic('series-count', { difficulty: 1, tags: ['figure series', 'non-verbal reasoning'] }, (r) => {
    const mark = r.pick(['dot', 'ring', 'block', 'box', 'plus'] as const);
    const d = r.pick([1, 2, -1, -2]);
    const s0 = d > 0 ? r.int(1, 3) : r.int(1, 3) - 4 * d;
    const counts = [0, 1, 2, 3].map((i) => s0 + i * d);
    const c = s0 + 4 * d;
    const pool = [c - d, ...r.shuffle([c + 1, c - 1, c + d, c + 2, c - 2]), c + 3, c + 4, c - 3].filter((v) => v >= 1 && v <= 12 && v !== c);
    const wrong = [...new Set(pool)].slice(0, 3);
    const { order, letter } = placeCandidates(r, c, wrong);
    const fig = (n: number): Draw => (cx, cy) => markGroup(mark, n, [cx, cy], 15, 4);
    const top = problemRow(10, [...counts.map(fig), null]);
    const change = d > 0 ? `increases by ${d}` : `decreases by ${-d}`;
    return letterQuestion(
      r.pick(SERIES_STEMS),
      letter,
      `The number of ${MARK_NAME[mark]} ${change} from each figure to the next: ${counts.join(', ')}, so the next figure has ${c}. Only figure (${letter}) has ${c}.`,
      withAnswers(top, 100, order.map(fig)),
    );
  }),

  b.dynamic('series-shading-moves', { difficulty: 2, origin: 'past-paper', tags: ['figure series', 'non-verbal reasoning'] }, (r) => {
    const style = r.pick(['grid', 'pie'] as const);
    const k = r.int(1, 3);
    const dir = r.sign();
    const p0 = r.int(0, 7);
    const pos = (i: number): number => mod(p0 + i * k * dir, 8);
    const c = pos(4);
    const pool = [
      mod(c - k * dir, 8),
      ...r.shuffle([mod(c + 1, 8), mod(c - 1, 8), mod(c + k * dir, 8), mod(p0 - 4 * k * dir, 8)]),
      ...r.shuffle([mod(c + 2, 8), mod(c - 2, 8), mod(c + 4, 8)]),
    ];
    const wrong = [...new Set(pool.filter((v) => v !== c))].slice(0, 3);
    const { order, letter } = placeCandidates(r, c, wrong);
    const fig = (p: number): Draw => (cx, cy, s) => (style === 'grid' ? drawRingGrid(cx, cy, p, null, s) : drawPie(cx, cy, p, s));
    const top = problemRow(10, [...[0, 1, 2, 3].map((i) => fig(pos(i))), null]);
    const what = style === 'grid' ? 'shaded cell moves round the border' : 'shaded sector moves round the circle';
    const where = style === 'grid' ? `the ${at(RING_NAMES, c)}` : `the sector ${k * 4 % 8 === 0 ? 'where it started in the first figure' : `${k} place${k > 1 ? 's' : ''} ${dir > 0 ? 'clockwise' : 'anticlockwise'} of its position in the fourth figure`}`;
    return letterQuestion(
      r.pick(SERIES_STEMS),
      letter,
      `The ${what} ${k} place${k > 1 ? 's' : ''} ${dir > 0 ? 'clockwise' : 'anticlockwise'} at each step. One more step puts it in ${where}, as in figure (${letter}). The other figures show no move, a move of the wrong size or a move in the wrong direction.`,
      withAnswers(top, 100, order.map(fig)),
    );
  }),

  b.dynamic('series-two-elements', { difficulty: 3, tags: ['figure series', 'non-verbal reasoning'] }, (r) => {
    const k1 = r.int(1, 3);
    const k2 = r.int(1, 3);
    const d1 = r.sign();
    const d2 = k1 === k2 ? -d1 : r.sign();
    const p1 = r.int(0, 7);
    const p2 = r.int(0, 7);
    const s = (i: number): number => mod(p1 + i * k1 * d1, 8);
    const t = (i: number): number => mod(p2 + i * k2 * d2, 8);
    type Pair = readonly [number, number];
    const correct: Pair = [s(4), t(4)];
    const wrongS = [mod(correct[0] - k1 * d1, 8), mod(correct[0] + 1, 8), mod(correct[0] - 1, 8), mod(p1 - 4 * k1 * d1, 8)].filter((v) => v !== correct[0]);
    const wrongT = [mod(correct[1] - k2 * d2, 8), mod(correct[1] + 1, 8), mod(correct[1] - 1, 8), mod(p2 - 4 * k2 * d2, 8)].filter((v) => v !== correct[1]);
    const ws = r.shuffle(wrongS);
    const wt = r.shuffle(wrongT);
    const pool: Pair[] = [
      [correct[0], at(wt, 0)],
      [at(ws, 0), correct[1]],
      [at(ws, 1), at(wt, 1)],
      [correct[1], correct[0]],
      [correct[0], at(wt, 1)],
      [at(ws, 1), correct[1]],
    ];
    const key = (p: Pair): string => `${p[0]}|${p[1]}`;
    const seen = new Set([key(correct)]);
    const wrong: Pair[] = [];
    for (const p of pool) {
      if (wrong.length < 3 && !seen.has(key(p))) {
        seen.add(key(p));
        wrong.push(p);
      }
    }
    const { order, letter } = placeCandidates(r, correct, wrong);
    const fig = (p: Pair): Draw => (cx, cy, sz) => drawRingGrid(cx, cy, p[0], p[1], sz);
    const top = problemRow(10, [...[0, 1, 2, 3].map((i) => fig([s(i), t(i)])), null]);
    const dirTxt = (d: number): string => (d > 0 ? 'clockwise' : 'anticlockwise');
    const pl = (k: number): string => `${k} place${k > 1 ? 's' : ''}`;
    return letterQuestion(
      r.pick([
        'Two elements move round the border of the grid by their own rules. Which answer figure comes next in the series?',
        'The shaded cell and the black dot each follow their own rule. Which answer figure continues the series?',
        'Study how the shaded cell and the dot move. Which answer figure should replace the question mark?',
      ]),
      letter,
      `Track each element separately. The shaded cell moves ${pl(k1)} ${dirTxt(d1)} at each step, so next it is in the ${at(RING_NAMES, correct[0])}. The black dot moves ${pl(k2)} ${dirTxt(d2)} at each step, so next it is in the ${at(RING_NAMES, correct[1])}. Only figure (${letter}) has both; each other figure breaks at least one of the two rules.`,
      withAnswers(top, 100, order.map(fig)),
    );
  }),

  // ---------------------------------------------------------------------------- odd one out
  b.dynamic('odd-figure-mirror', { difficulty: 2, origin: 'past-paper', tags: ['non-verbal reasoning', 'rotation', 'mirror and water images'] }, (r) => {
    const g = asymGlyph(r);
    const u = unitFor([g], 80);
    const rots = r.sample(ROT, 3);
    const oddRot = r.pick(ROT);
    const odd = apply(mul(T.MV, T[oddRot]), g);
    const { order, letter } = placeCandidates<Glyph>(
      r,
      odd,
      rots.map((n) => apply(T[n], g)),
    );
    const stem = r.pick([
      'Three of the figures below are the same figure turned to different positions. Which figure is the odd one out?',
      'Three of these figures can be obtained from one another by turning them in the plane of the page. Which one cannot?',
    ]);
    return letterQuestion(
      stem,
      letter,
      `The other three figures are one figure turned through multiples of 90°. Figure (${letter}) is a mirror image (flipped over), and no rotation in the plane can turn a figure into its mirror image, so it is the odd one out.`,
      svg(W, 140, answerRow(16, order.map((h) => drawGlyph(h, u)), 90, 36)),
    );
  }),

  b.dynamic('odd-figure-count', { difficulty: 1, tags: ['non-verbal reasoning'] }, (r) => {
    const NAMES: Record<number, string> = { 3: 'triangle', 4: 'square', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon' };
    // Three polygons share a parity of side count and keep dots = sides; the fourth has the other
    // parity and dots = sides +/- 1. Then every simple rule (dots = sides, parity of sides, parity of
    // dots) singles out the same figure, so the answer cannot be argued.
    const majorOdd = r.chance(0.5);
    const major = majorOdd ? [3, 5, 7] : [4, 6, 8];
    const minor = r.pick(majorOdd ? [4, 6, 8] : [3, 5, 7]);
    const oddIdx = r.int(0, 3);
    const rest = r.shuffle(major);
    const sides = [0, 1, 2, 3].map((i) => (i === oddIdx ? minor : at(rest, i < oddIdx ? i : i - 1)));
    const dots = sides.map((n, i) => (i === oddIdx ? n + r.pick([-1, 1]) : n));
    const figs: Draw[] = sides.map((n, i) => (cx, cy) => {
      const R = 34;
      const start = -90 + (n % 2 === 0 ? 180 / n : 0);
      const cyAdj = n === 3 ? cy + 6 : cy;
      return poly(ngon([cx, cyAdj], R, n, start)) + markGroup('dot', at(dots, i), [cx, cyAdj + (n === 3 ? 4 : 0)], 9, n <= 4 ? 2 : 3);
    });
    const letter = at(LETTERS, oddIdx);
    const list = sides
      .map((n, i) => (i === oddIdx ? null : `(${at(LETTERS, i)}) ${NAMES[n]}: ${n} dots`))
      .filter((x): x is string => x !== null)
      .join('; ');
    return letterQuestion(
      r.pick(['Which figure is the odd one out?', 'Three of the figures follow the same rule. Which figure does not?']),
      letter,
      `In three figures the number of dots equals the number of sides of the shape: ${list}. Figure (${letter}) is a ${NAMES[at(sides, oddIdx)] ?? ''} with ${at(dots, oddIdx)} dots, so it breaks the rule.`,
      svg(W, 140, answerRow(16, figs, 90, 36)),
    );
  }),

  // ---------------------------------------------------------------------------- mirror and water images
  b.dynamic('mirror-image-figure', { difficulty: 1, tags: ['mirror and water images'] }, (r) => {
    const g = asymGlyph(r);
    const u = unitFor([g], 80);
    const right = r.chance(0.5);
    const wrong = r.sample(['I', 'MH', 'R180', 'R90', 'R270'] as TName[], 3);
    const { order, letter } = placeCandidates<TName>(r, 'MV', wrong);
    const fx = right ? 250 : 310;
    const mx = right ? 310 : 250;
    const top =
      rect(fx - 40, 10, 80, 80, { sw: 1.5 }) +
      drawGlyph(g, u)(fx, 50, 80) +
      line([mx, 8], [mx, 92], { sw: 3 }) +
      txt([mx + (right ? 12 : -12), 18], 'M', 14, true) +
      txt([mx + (right ? 12 : -12), 92], 'N', 14, true);
    return letterQuestion(
      `A mirror is held along the line MN, to the ${right ? 'right' : 'left'} of the problem figure. Which answer figure is the mirror image of the problem figure?`,
      letter,
      `A vertical mirror swaps left and right but keeps top and bottom: every part keeps its height and moves to the opposite side. That is figure (${letter}). The other answer figures show the figure: ${othersText(order, 'MV')}.`,
      withAnswers(top, 100, order.map((n) => drawT(g, n, u))),
    );
  }),

  b.dynamic('water-image-figure', { difficulty: 1, tags: ['mirror and water images'] }, (r) => {
    const g = asymGlyph(r);
    const u = unitFor([g], 80);
    const water = r.chance(0.6);
    const wrong = r.sample(['I', 'MV', 'R180', 'R90', 'R270'] as TName[], 3);
    const { order, letter } = placeCandidates<TName>(r, 'MH', wrong);
    const top =
      rect(240, 4, 80, 80, { sw: 1.5 }) +
      drawGlyph(g, u)(280, 44, 80) +
      line([200, 94], [360, 94], { sw: 3, ...(water ? { dash: true } : {}) }) +
      txt([186, 99], water ? 'X' : 'M', 14, true) +
      txt([374, 99], water ? 'Y' : 'N', 14, true);
    return letterQuestion(
      water
        ? 'The line XY is the surface of still water below the problem figure. Which answer figure is the water image of the problem figure?'
        : 'A mirror is placed horizontally along MN, below the problem figure. Which answer figure is the image of the problem figure in this mirror?',
      letter,
      `A horizontal mirror (or water surface) swaps top and bottom but keeps left and right: the figure is flipped upside down without being turned. That is figure (${letter}). The other answer figures show the figure: ${othersText(order, 'MH')}.`,
      withAnswers(top, 102, order.map((n) => drawT(g, n, u))),
    );
  }),

  b.dynamic('mirror-text', { difficulty: 2, origin: 'past-paper', tags: ['mirror and water images'] }, (r) => {
    let chars: string[] = [];
    for (let tries = 0; tries < 50; tries++) {
      chars = [];
      const n = r.int(4, 5);
      while (chars.length < n) {
        const c = r.pick(ASYM_CHARS);
        if (chars[chars.length - 1] !== c) chars.push(c);
      }
      if (chars.join('') !== [...chars].reverse().join('')) break;
    }
    const water = r.chance(0.4);
    const correct: TextImage = water ? { rev: false, t: 'v' } : { rev: true, t: 'h' };
    const pool: TextImage[] = water
      ? [
          { rev: true, t: 'h' },
          { rev: true, t: 'r' },
          { rev: true, t: 'v' },
          { rev: true, t: 'none' },
        ]
      : [
          { rev: true, t: 'none' },
          { rev: false, t: 'h' },
          { rev: false, t: 'v' },
          { rev: true, t: 'r' },
        ];
    const wrong = r.sample(pool, 3);
    const { order, letter } = placeCandidates(r, correct, wrong);
    const word = chars.join('');
    const groupName = chars.includes('4') ? 'letter-number group' : 'letter group';
    const cw = 118;
    const ch = 56;
    const gap = 16;
    const x0 = (W - (4 * cw + 3 * gap)) / 2;
    let body = rect(W / 2 - 75, 10, 150, 56, { sw: 1.5 }) + drawTextImage(chars, { rev: false, t: 'none' }, W / 2, 38, 26);
    body += water
      ? line([W / 2 - 95, 76], [W / 2 + 95, 76], { sw: 3, dash: true }) + txt([W / 2 - 108, 81], 'X', 14, true) + txt([W / 2 + 108, 81], 'Y', 14, true)
      : line([W / 2 + 95, 6], [W / 2 + 95, 70], { sw: 3 }) + txt([W / 2 + 108, 16], 'M', 14, true) + txt([W / 2 + 108, 72], 'N', 14, true);
    body += line([20, 94], [W - 20, 94], { sw: 1, dash: true });
    order.forEach((img, i) => {
      const x = x0 + i * (cw + gap);
      body += rect(x, 106, cw, ch, { sw: 1.5 });
      body += drawTextImage(chars, img, x + cw / 2, 106 + ch / 2, 22);
      body += txt([x + cw / 2, 106 + ch + 18], `(${at(LETTERS, i)})`, 14, true);
    });
    return letterQuestion(
      water
        ? `Which answer figure is the water image of the ${groupName} ${word}, with the water surface along XY?`
        : `Which answer figure is the mirror image of the ${groupName} ${word}, with the mirror held along MN?`,
      letter,
      water
        ? `A water surface flips the group upside down: the characters stay in the same left-to-right order and each one is turned upside down (not rotated). Only (${letter}) does exactly this; a rotation through 180° would also reverse the order, and a mirror image would reverse left and right instead.`
        : `A vertical mirror reverses left and right: the order of the characters is reversed and each character is also flipped left-to-right, while tops stay at the top. Only (${letter}) does both; reversing the order alone or flipping each character alone is not enough, and turning upside down is a water image or a rotation.`,
      svg(W, 106 + ch + 30, body),
    );
  }),

  // ---------------------------------------------------------------------------- rotation
  b.dynamic('rotation-figure', { difficulty: 1, tags: ['rotation'] }, (r) => {
    const g = asymGlyph(r, ['poly', 'path', 'framed']);
    const u = unitFor([g], 80);
    const ask = r.pick([
      { n: 'R90' as TName, say: '90° clockwise' },
      { n: 'R270' as TName, say: '90° anticlockwise' },
      { n: 'R180' as TName, say: 'through 180°' },
      { n: 'R270' as TName, say: '270° clockwise' },
      { n: 'R90' as TName, say: '270° anticlockwise' },
    ]);
    const others = ROT.filter((n) => n !== ask.n);
    const mirror = apply(mul(T.MV, T[ask.n]), g);
    type Cand = Glyph;
    const wrong: Cand[] = [mirror, ...r.sample(others, 2).map((n) => apply(T[n], g))];
    const { order, letter } = placeCandidates<Cand>(r, apply(T[ask.n], g), wrong);
    const top = problemRow(10, [drawGlyph(g, u)]);
    return letterQuestion(
      `The problem figure is rotated ${ask.say} in the plane of the page. Which answer figure shows the result?`,
      letter,
      `Turning the figure ${ask.say} moves its top edge to the ${ask.n === 'R90' ? 'right' : ask.n === 'R270' ? 'left' : 'bottom'}; every part keeps its position relative to the others. Figure (${letter}) is the result. One of the other figures is a mirror image, which no rotation can give, and the rest are turned by the wrong angle.`,
      withAnswers(top, 100, order.map((h) => drawGlyph(h, u))),
    );
  }),

  b.dynamic('figure-analogy', { difficulty: 2, tags: ['non-verbal reasoning', 'rotation', 'mirror and water images'] }, (r) => {
    const A = asymGlyph(r);
    let C = asymGlyph(r);
    for (let i = 0; i < 20 && sig(C) === sig(A); i++) C = asymGlyph(r);
    const rule = r.pick(['R90', 'R180', 'R270', 'MV', 'MH'] as TName[]);
    const pool = (['I', 'R90', 'R180', 'R270', 'MV', 'MH'] as TName[]).filter((n) => n !== rule);
    const wrong = r.sample(pool, 3);
    const { order, letter } = placeCandidates<TName>(r, rule, wrong);
    const uA = unitFor([A], 80);
    const uC = unitFor([C], 80);
    const top = problemRow(10, [drawGlyph(A, uA), drawT(A, rule, uA), '::', drawGlyph(C, uC), null]);
    return letterQuestion(
      r.pick([
        'The first two problem figures are related in a certain way. Which answer figure is related to the third figure in the same way?',
        'The first figure is to the second as the third figure is to which answer figure?',
        'Find the answer figure that completes the analogy shown in the problem figures:',
      ]),
      letter,
      `The second figure is the first figure ${T_DONE[rule]}. Doing the same to the third figure gives figure (${letter}). The other answer figures show the third figure: ${othersText(order, rule)}.`,
      withAnswers(top, 100, order.map((n) => drawT(C, n, uC))),
    );
  }),

  // ---------------------------------------------------------------------------- figure matrices
  b.dynamic('matrix-latin', { difficulty: 2, origin: 'past-paper', tags: ['non-verbal reasoning'] }, (r) => {
    const shapes = r.sample(['circle', 'square', 'triangle', 'diamond', 'pentagon', 'star'] as Shape[], 3);
    const base = r.pick([1, 2]);
    const counts = r.shuffle([base, base + 1, base + 2]);
    const twist = r.pick([1, 2]);
    const shapeAt = (i: number, j: number): Shape => at(shapes, (i + j) % 3);
    const countAt = (i: number, j: number): number => at(counts, (i * twist + j * (3 - twist)) % 3);
    const S = shapeAt(2, 2);
    const N = countAt(2, 2);
    const otherS = shapes.filter((s) => s !== S);
    const otherN = counts.filter((n) => n !== N);
    type Cand = readonly [Shape, number];
    const s1 = r.pick(otherS);
    const n1 = r.pick(otherN);
    const wrong: Cand[] = [
      [S, n1],
      [s1, N],
      [otherS.find((s) => s !== s1) ?? s1, otherN.find((n) => n !== n1) ?? n1],
    ];
    const { order, letter } = placeCandidates<Cand>(r, [S, N], wrong);
    const cellDraw = (c: Cand, sz: number): Draw => (cx, cy) => shapeGroup(c[0], c[1], [cx, cy], sz, 'none');
    const figure = matrixFigure(
      (i, j) => (i === 2 && j === 2 ? null : cellDraw([shapeAt(i, j), countAt(i, j)], 7)),
      order.map((c) => cellDraw(c, 8)),
    );
    const nShape = (n: number, sh: Shape): string => `${n} ${n === 1 ? sh : SHAPE_PLURAL[sh]}`;
    const bottom = [0, 1].map((j) => nShape(countAt(2, j), shapeAt(2, j))).join(' and ');
    return letterQuestion(
      r.pick([
        'Which answer figure completes the matrix?',
        'Which answer figure should replace the question mark in the matrix?',
        'Study the rows and columns of the matrix. Which answer figure fits the empty cell?',
      ]),
      letter,
      `In every row and every column each of the three shapes appears once and each of the numbers ${[...counts].sort((x, y) => x - y).join(', ')} appears once. The bottom row already has ${bottom}, so the missing cell needs ${nShape(N, S)}: figure (${letter}).`,
      figure,
    );
  }),

  b.dynamic('matrix-three-attributes', { difficulty: 3, tags: ['non-verbal reasoning'] }, (r) => {
    const shapes = r.sample(['circle', 'square', 'triangle', 'diamond', 'pentagon', 'star'] as Shape[], 3);
    const counts = r.shuffle([1, 2, 3]);
    const fills = r.shuffle(['none', INK, GREY]);
    const FILL_NAME: Record<string, string> = { none: 'white (outline only)', [INK]: 'black', [GREY]: 'grey' };
    const twist = r.pick([1, 2]);
    const byRow = r.chance(0.5);
    const shapeAt = (i: number, j: number): Shape => at(shapes, (i + j) % 3);
    const countAt = (i: number, j: number): number => at(counts, (i * twist + j * (3 - twist)) % 3);
    const fillAt = (i: number, j: number): string => at(fills, byRow ? i : j);
    const S = shapeAt(2, 2);
    const N = countAt(2, 2);
    const F = fillAt(2, 2);
    type Cand = readonly [Shape, number, string];
    const wrong: Cand[] = [
      [S, N, r.pick(fills.filter((f) => f !== F))],
      [S, r.pick(counts.filter((n) => n !== N)), F],
      [r.pick(shapes.filter((s) => s !== S)), N, F],
    ];
    const { order, letter } = placeCandidates<Cand>(r, [S, N, F], wrong);
    const cellDraw = (c: Cand, sz: number): Draw => (cx, cy) => shapeGroup(c[0], c[1], [cx, cy], sz, c[2]);
    const figure = matrixFigure(
      (i, j) => (i === 2 && j === 2 ? null : cellDraw([shapeAt(i, j), countAt(i, j), fillAt(i, j)], 7)),
      order.map((c) => cellDraw(c, 8)),
    );
    return letterQuestion(
      r.pick([
        'Each figure in the matrix follows the rules of its row and column. Which answer figure completes the matrix?',
        'Shape, number and shading all follow rules in this matrix. Which answer figure fits the empty cell?',
      ]),
      letter,
      `Three rules work together. (1) Shape: each row and column has one group of each shape, so the missing cell has ${SHAPE_PLURAL[S]}. (2) Number: each row and column has 1, 2 and 3 once, so it has ${N}. (3) Shading: every figure in the same ${byRow ? 'row' : 'column'} has the same shading, so it is ${FILL_NAME[F] ?? ''}. Only figure (${letter}) obeys all three; each other figure breaks exactly one rule.`,
      figure,
    );
  }),

  // ---------------------------------------------------------------------------- paper folding
  // (Single and double folds along the vertical/horizontal midlines are in part B; these use
  // diagonal folds and repeated folds in one direction.)
  b.dynamic('paper-fold-diagonal', { difficulty: 2, origin: 'past-paper', tags: ['paper folding'] }, (r) => {
    for (let tries = 0; ; tries++) {
      const t = r.pick(['d', 'a'] as const);
      const fold: Fold = { t, c: 4, keepLow: r.chance(0.5) };
      const region = clipKeep(SHEET, fold, fold.keepLow);
      const spots: Pt[] = [];
      for (const x of [1, 3, 5, 7]) for (const y of [1, 3, 5, 7]) if (kept(fold, [x, y])) spots.push([x, y]);
      const p = r.pick(spots);
      const correct = unfold([fold], p);
      const other: Fold = { t: t === 'd' ? 'a' : 'd', c: 4, keepLow: true };
      const pool: Pt[][] = [
        [p], // forgot the second layer
        [reflect(fold, p)], // only the reflected hole
        [p, reflect(other, p)], // reflected in the other diagonal
        [p, [8 - p[0], 8 - p[1]]], // turned through 180 degrees instead of reflected
        [p, [8 - p[0], p[1]]], // reflected in the vertical midline
        [p, [p[0], 8 - p[1]]], // reflected in the horizontal midline
      ];
      const seen = new Set([holeKey(correct)]);
      const wrong: Pt[][] = [];
      for (const hs of [at(pool, 2), ...r.shuffle([at(pool, 0), at(pool, 1), at(pool, 3), at(pool, 4), at(pool, 5)])]) {
        const k = holeKey(hs);
        if (!seen.has(k)) {
          seen.add(k);
          wrong.push(hs);
        }
      }
      if (wrong.length < 3 && tries < 30) continue;
      const { order, letter } = placeCandidates(r, correct, wrong.slice(0, 3));
      const top = problemRow(10, [foldPanel(SHEET, fold, null), '→', foldPanel(region, null, p)]);
      const how =
        t === 'd'
          ? fold.keepLow
            ? 'bottom-left half over the top-right half'
            : 'top-right half over the bottom-left half'
          : fold.keepLow
            ? 'bottom-right half over the top-left half'
            : 'top-left half over the bottom-right half';
      const line1 = t === 'd' ? 'top-left to bottom-right' : 'top-right to bottom-left';
      return letterQuestion(
        `A square sheet of paper is folded along the diagonal from ${line1} (dashed) in the direction of the arrow, and a hole is punched through the folded paper as shown. Which answer figure shows the sheet when it is unfolded?`,
        letter,
        `Folding the ${how} puts two layers under the punch, so there are two holes. On unfolding, the second hole is the mirror image of the punched hole in the fold line (the diagonal from ${line1}): it lies on the line through the hole perpendicular to that diagonal, the same distance on the other side. Only figure (${letter}) shows this pair; the others use the wrong line, a half turn or only one hole.`,
        withAnswers(top, 100, order.map(holesPanel)),
      );
    }
  }),

  b.dynamic('paper-fold-two', { difficulty: 3, tags: ['paper folding'] }, (r) => {
    for (let tries = 0; ; tries++) {
      const mode = r.pick(['xx', 'yy', 'da', 'ad'] as const);
      const f1Low = r.chance(0.5);
      const f2Low = r.chance(0.5);
      let folds: [Fold, Fold];
      if (mode === 'xx') folds = [{ t: 'x', c: 4, keepLow: f1Low }, { t: 'x', c: f1Low ? 2 : 6, keepLow: f2Low }];
      else if (mode === 'yy') folds = [{ t: 'y', c: 4, keepLow: f1Low }, { t: 'y', c: f1Low ? 2 : 6, keepLow: f2Low }];
      else if (mode === 'da') folds = [{ t: 'd', c: 4, keepLow: f1Low }, { t: 'a', c: 4, keepLow: f2Low }];
      else folds = [{ t: 'a', c: 4, keepLow: f1Low }, { t: 'd', c: 4, keepLow: f2Low }];
      const [fa, fb] = folds;
      const region1 = clipKeep(SHEET, fa, fa.keepLow);
      const region2 = clipKeep(region1, fb, fb.keepLow);
      const spots: Pt[] = [];
      for (const x of [1, 3, 5, 7]) for (const y of [1, 3, 5, 7]) if (kept(fa, [x, y]) && kept(fb, [x, y])) spots.push([x, y]);
      if (!spots.length) continue;
      const p = r.pick(spots);
      const correct = unfold(folds, p);
      const swapT = (f: Fold): Fold => ({ ...f, t: f.t === 'x' ? 'y' : f.t === 'y' ? 'x' : f.t === 'd' ? 'a' : 'd', c: f.t === 'x' || f.t === 'y' ? 4 : f.c });
      const slide = (f: Fold, q: Pt): Pt => {
        const d = (f.keepLow ? 1 : -1) * (f.c === 4 ? 4 : 2);
        if (f.t === 'x') return [q[0] + d, q[1]];
        if (f.t === 'y') return [q[0], q[1] + d];
        return [8 - q[0], 8 - q[1]];
      };
      let slid: Pt[] = [p];
      slid = uniqHoles([...slid, ...slid.map((q) => slide(fb, q))]);
      slid = uniqHoles([...slid, ...slid.map((q) => slide(fa, q))]);
      const pool: Pt[][] = [
        uniqHoles([p, reflect(fb, p)]), // unfolded the second fold only
        uniqHoles([p, reflect(fa, p)]), // unfolded the first fold only
        slid, // slid the layers instead of reflecting them
        correct.slice(0, 3), // one layer forgotten
        unfold([swapT(fa), swapT(fb)], p), // reflected in the wrong lines
      ];
      const seen = new Set([holeKey(correct)]);
      const wrong: Pt[][] = [];
      for (const hs of r.shuffle(pool)) {
        const k = holeKey(hs);
        if (!seen.has(k) && hs.every((h) => h[0] > 0 && h[0] < 8 && h[1] > 0 && h[1] < 8)) {
          seen.add(k);
          wrong.push(hs);
        }
      }
      if (wrong.length < 3 && tries < 30) continue;
      const { order, letter } = placeCandidates(r, correct, wrong.slice(0, 3));
      const top = problemRow(10, [foldPanel(SHEET, fa, null), '→', foldPanel(region1, fb, null), '→', foldPanel(region2, null, p)], 80, 10);
      const kind = mode === 'xx' ? 'in half twice along vertical fold lines' : mode === 'yy' ? 'in half twice along horizontal fold lines' : 'along one diagonal and then along the other';
      return letterQuestion(
        `A square sheet of paper is folded ${kind}, following the dashed lines and arrows, and then a hole is punched as shown. Which answer figure shows the sheet when it is completely unfolded?`,
        letter,
        `After two folds the paper is four layers thick, so the punch makes ${correct.length} holes. Unfold one fold at a time, last fold first: each unfolding adds the mirror image of every existing hole in that fold line. Doing this for both folds gives the pattern in figure (${letter}). The other figures stop after one unfolding, slide the holes instead of reflecting them, miss a layer or reflect in the wrong line.`,
        withAnswers(top, 100, order.map(holesPanel)),
      );
    }
  }),

  // ---------------------------------------------------------------------------- cube nets
  b.dynamic('cube-net-opposite', { difficulty: 2, origin: 'past-paper', tags: ['cube nets'] }, (r) => {
    let cells: Pt[] = [];
    for (let tries = 0; tries < 500; tries++) {
      cells = randomHexomino(r);
      if (foldsToCube(cells)) break;
    }
    const labels = r.shuffle(['1', '2', '3', '4', '5', '6']);
    const normals = foldNormals(cells);
    const opp = (i: number): number => normals.findIndex((v) => vkey(v) === vkey(neg(at(normals, i))));
    const q = r.int(0, 5);
    const o = opp(q);
    const adjacent = labels.filter((_, i) => i !== q && i !== o);
    const pairs: string[] = [];
    const done = new Set<number>();
    labels.forEach((l, i) => {
      if (done.has(i)) return;
      const j = opp(i);
      done.add(i);
      done.add(j);
      pairs.push(`${l} and ${at(labels, j)}`);
    });
    const w = Math.max(...cells.map((c) => c[0])) + 1;
    const h = Math.max(...cells.map((c) => c[1])) + 1;
    const unit = Math.min(48, 260 / w, 200 / h);
    return {
      stem: `The net below is folded to make a cube. Which number is on the face opposite the face numbered ${at(labels, q)}?`,
      answer: at(labels, o),
      distractors: r.sample(adjacent, 3),
      explanation: `When the net is folded, opposite faces never share an edge in the net (for example, two squares with exactly one square between them in a straight line are opposite). Folding this net gives the opposite pairs ${pairs.join(', ')}. So ${at(labels, q)} is opposite ${at(labels, o)}; the other numbers are on faces next to it.`,
      figure: svg(W, h * unit + 20, drawCells(cells, [W / 2, (h * unit + 20) / 2], unit, labels)),
    };
  }),

  b.dynamic('cube-net-complete', { difficulty: 2, tags: ['cube nets'] }, (r) => {
    for (let tries = 0; ; tries++) {
      let net: Pt[] = [];
      for (let k = 0; k < 500; k++) {
        net = randomHexomino(r);
        if (foldsToCube(net)) break;
      }
      const removable = net.filter((c) => connected(net.filter((q) => q !== c)));
      const rm = r.pick(removable);
      const five = net.filter((q) => q !== rm);
      const empties: Pt[] = [];
      for (const c of five)
        for (const d of DIRS) {
          const p: Pt = [c[0] + d[0], c[1] + d[1]];
          const taken = (xs: readonly Pt[]): boolean => xs.some((q) => q[0] === p[0] && q[1] === p[1]);
          if (!taken(five) && !taken(empties)) empties.push(p);
        }
      const good = empties.filter((c) => foldsToCube([...five, c]));
      const bad = empties.filter((c) => !foldsToCube([...five, c]));
      if ((bad.length < 3 || !good.length) && tries < 50) continue;
      const correct = r.pick(good);
      const { order, letter } = placeCandidates(r, correct, r.sample(bad, 3));
      const all = [...five, ...order];
      const mx = Math.min(...all.map((c) => c[0]));
      const my = Math.min(...all.map((c) => c[1]));
      const w = Math.max(...all.map((c) => c[0])) - mx + 1;
      const h = Math.max(...all.map((c) => c[1])) - my + 1;
      const unit = Math.min(42, 360 / w, 230 / h);
      const x0 = W / 2 - (w * unit) / 2;
      const y0 = 10;
      let body = '';
      for (const c of five) body += rect(x0 + (c[0] - mx) * unit, y0 + (c[1] - my) * unit, unit, unit, { sw: 2.2, fill: GREY });
      order.forEach((c, i) => {
        const x = x0 + (c[0] - mx) * unit;
        const y = y0 + (c[1] - my) * unit;
        body += rect(x + 2, y + 2, unit - 4, unit - 4, { sw: 1.5, dash: true });
        body += txt([x + unit / 2, y + unit / 2 + 6], at(LETTERS, i), 17, true);
      });
      const reasons = order
        .map((c, i) => ({ c, l: at(LETTERS, i) }))
        .filter((x) => x.l !== letter)
        .map((x) => `adding (${x.l}) fails because ${whyNotNet([...five, x.c])}`);
      return letterQuestion(
        r.pick([
          'The five shaded squares are part of the net of a cube. Which one of the dashed squares, (A) to (D), must be added so that the six squares fold into a closed cube?',
          'One square is missing from this cube net. Adding which dashed square, (A) to (D), lets the six squares fold into a closed cube?',
        ]),
        letter,
        `With square (${letter}) the six squares form a cube net: folding puts them on six different faces. In contrast, ${reasons.join('; ')}.`,
        svg(W, h * unit + 20, body),
      );
    }
  }),

  // ---------------------------------------------------------------------------- overlays and patterns
  b.dynamic('overlay-transparent', { difficulty: 1, tags: ['non-verbal reasoning'] }, (r) => {
    const picked = r.sample(SHEET_SEGS, 6);
    const s1 = picked.slice(0, 3);
    const s2 = picked.slice(3);
    const union = [...s1, ...s2];
    const drop = r.int(0, 5);
    const extra = r.pick(SHEET_SEGS.filter((s) => !union.some((u) => segKey(u) === segKey(s))));
    const pool: Seg[][] = [
      [...s1, ...s2.map((s) => tSeg(T.MV, s))], // second sheet flipped left-right
      union.filter((_, i) => i !== drop), // one line lost
      [...s1, ...s2.map((s) => tSeg(T.MH, s))], // second sheet flipped top-bottom
      [...s1, ...s2.map((s) => tSeg(T.R90, s))], // second sheet turned
      [...union, extra], // an extra line
    ];
    const seen = new Set([segsKey(union)]);
    const wrong: Seg[][] = [];
    for (const ss of [at(pool, 1), ...r.shuffle([at(pool, 0), at(pool, 2), at(pool, 3), at(pool, 4)])]) {
      const k = segsKey(ss);
      if (wrong.length < 3 && !seen.has(k)) {
        seen.add(k);
        wrong.push(ss);
      }
    }
    const { order, letter } = placeCandidates(r, union, wrong);
    const top = problemRow(10, [drawSheet(s1), '+', drawSheet(s2), '=', null]);
    return letterQuestion(
      r.pick([
        'The first two problem figures are drawn on transparent sheets. If the second sheet is laid exactly on top of the first, without turning or flipping it, which answer figure shows what is seen?',
        'Two transparent sheets carry the lines shown. Which answer figure appears when one is placed exactly over the other, edges matching and neither sheet turned or flipped?',
      ]),
      letter,
      `Overlaying transparent sheets simply adds their lines: every line of both sheets appears in its own position, and nothing is removed, moved or turned. Figure (${letter}) shows every line of both sheets in place. The other figures lose a line, add one, or show the second sheet flipped or turned.`,
      withAnswers(top, 100, order.map((ss) => drawSheet(ss))),
    );
  }),

  b.dynamic('pattern-completion', { difficulty: 1, tags: ['non-verbal reasoning', 'rotation'] }, (r) => {
    const q = asymGlyph(r, ['framed']);
    const QUARTERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
    const offs: readonly Pt[] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    const miss = r.int(0, 3);
    const rotOf = (i: number): TName => at(ROT, i);
    const correct = rotOf(miss);
    const wrongRots = ROT.filter((n) => n !== correct);
    type Cand = Glyph;
    const wrong: Cand[] = [
      apply(mul(T[r.pick(['MV', 'MH'] as const)], T[correct]), q),
      ...r.sample(wrongRots, 2).map((n) => apply(T[n], q)),
    ];
    const { order, letter } = placeCandidates<Cand>(r, apply(T[correct], q), wrong);
    const uTop = 21;
    const half = 1.5 * uTop;
    const cx = W / 2;
    const cy = 10 + 2 * half;
    let top = '';
    offs.forEach((o, i) => {
      const qx = cx + o[0] * half;
      const qy = cy + o[1] * half;
      if (i === miss) {
        top += rect(qx - half, qy - half, 2 * half, 2 * half, { sw: 1.5 }) + txt([qx, qy + 9], '?', 26, true);
      } else top += drawGlyph(apply(T[rotOf(i)], q), uTop)(qx, qy, 2 * half);
    });
    top += rect(cx - 2 * half, cy - 2 * half, 4 * half, 4 * half, { sw: 2.5 });
    const u = unitFor([q], 80);
    return letterQuestion(
      `The ${at(QUARTERS, miss)} quarter of the square design is missing. Which answer figure completes the design?`,
      letter,
      `The design looks the same after a quarter turn about its centre: going round clockwise, each quarter is the one before it turned 90° clockwise. So the missing ${at(QUARTERS, miss)} quarter must be the ${at(QUARTERS, mod(miss - 1, 4))} quarter turned 90° clockwise, which is figure (${letter}). The other figures are turned the wrong amount or are mirror images.`,
      withAnswers(top, 4 * half + 10, order.map((g) => drawGlyph(g, u))),
    );
  }),

]);

/** A 3x3 matrix (null = '?') on the left and four labelled answer cells (2 x 2) on the right. */
function matrixFigure(cell: (i: number, j: number) => Draw | null, answers: readonly Draw[]): string {
  const s = 62;
  const mx = 40;
  const my = 12;
  let body = '';
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      const x = mx + j * s;
      const y = my + i * s;
      body += rect(x, y, s, s, { sw: 1.5 });
      const d = cell(i, j);
      body += d ? d(x + s / 2, y + s / 2, s) : txt([x + s / 2, y + s / 2 + 10], '?', 28, true);
    }
  body += line([mx + 3 * s + 28, 8], [mx + 3 * s + 28, my + 3 * s + 4], { sw: 1, dash: true });
  const as = 70;
  const ax = [300, 420];
  const ay = [12, 116];
  answers.forEach((d, k) => {
    const x = at(ax, k % 2);
    const y = at(ay, Math.floor(k / 2));
    body += rect(x, y, as, as, { sw: 1.5 });
    body += d(x + as / 2, y + as / 2, as);
    body += txt([x + as + 22, y + as / 2 + 5], `(${at(LETTERS, k)})`, 14, true);
  });
  return svg(W, my + 3 * s + 14, body);
}
