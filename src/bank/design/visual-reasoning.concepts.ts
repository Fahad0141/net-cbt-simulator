import { defineBank } from '@/engine/authoring';
import { nCr, numericOptions, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

/**
 * Design, chapter "Problem Solving and Visual Communication": PART B.
 * Paper folding and hole punching, cubes folded from nets (and nets that cannot fold),
 * counting triangles and squares, embedded (hidden) figures, lines of symmetry of letters
 * and words, plus symbols and signage: safety-sign categories, pictograms, accessibility,
 * architectural drawing types, symbols and conventions (plan, section, elevation, scale
 * bar, north arrow). Part A (computational items) lives in `visual-reasoning.ts`.
 * Every local id here starts with `c-`.
 *
 * Visual items draw the four candidate answers inside the figure, labelled (A)-(D); the
 * options are then 'A'-'D' in fixed order and the position of the correct one is random.
 * Figures use dark ink and are shown on a white card in every theme.
 */

// ---------------------------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------------------------

const INK = '#222';

type Pt = readonly [number, number];

const at = <T>(xs: readonly T[], i: number): T => xs[i] as T;

/** One decimal place, no binary noise (for SVG coordinates). */
const f1 = (x: number): string => String(Number(x.toFixed(1)));

const svg = (w: number, h: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;

const text = (x: number, y: number, t: string, size = 14, weight = 'normal'): string =>
  `<text x="${f1(x)}" y="${f1(y)}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="middle" fill="${INK}">${t}</text>`;

const line = (x1: number, y1: number, x2: number, y2: number, w = 2, extra = ''): string =>
  `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round"${extra}/>`;

const poly = (pts: readonly Pt[], fill: string, stroke = INK, w = 1.5): string =>
  `<polygon points="${pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>`;

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const LETTERS = ['A', 'B', 'C', 'D'] as const;

/** Options 'A'-'D' in fixed order, with the correct one at position `pos`. */
function letterOptions(pos: number): Pick<AuthoredQuestion, 'answer' | 'distractors' | 'fixedOrder'> {
  const answer = at(LETTERS, pos);
  return { answer, distractors: LETTERS.filter((l) => l !== answer), fixedOrder: [...LETTERS] };
}

/** Inserts the correct candidate among three wrong ones at position `pos`. */
const placeAt = <T>(wrong: readonly T[], correct: T, pos: number): T[] => [...wrong.slice(0, pos), correct, ...wrong.slice(pos)];

/** Centre x of candidate k in a row of four across a 560-wide figure. */
const candX = (k: number): number => 70 + 140 * k;
const candLabel = (k: number, y: number): string => text(candX(k), y, `(${at(LETTERS, k)})`, 15);

/** The eight symmetries of the square grid (rotations and reflections). */
const SYMS: ReadonlyArray<(p: Pt) => Pt> = [
  ([x, y]) => [x, y],
  ([x, y]) => [-y, x],
  ([x, y]) => [-x, -y],
  ([x, y]) => [y, -x],
  ([x, y]) => [-x, y],
  ([x, y]) => [x, -y],
  ([x, y]) => [y, x],
  ([x, y]) => [-y, -x],
];

const DIRS4: readonly Pt[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Builds a two-way "term <-> definition" question from a pool of mutually exclusive pairs. */
function termQuestion(
  r: Rng,
  pool: ReadonlyArray<{ term: string; def: string }>,
  forward: (term: string) => string,
  backward: (def: string) => string,
): AuthoredQuestion {
  const [target, ...others] = r.sample(pool, 4) as [{ term: string; def: string }, ...{ term: string; def: string }[]];
  const explanation = `${cap(target.term)}: ${target.def}. ${others.map((o) => `${cap(o.term)}: ${o.def}`).join('. ')}.`;
  if (r.chance(0.5)) {
    return { stem: forward(target.term), answer: cap(target.def), distractors: others.map((o) => cap(o.def)), explanation };
  }
  return { stem: backward(target.def), answer: cap(target.term), distractors: others.map((o) => cap(o.term)), explanation };
}

// ---------------------------------------------------------------------------------------------
// Paper folding and hole punching (4 x 4 grid of cells; col 0-3 left to right, row 0-3 top down)
// ---------------------------------------------------------------------------------------------

type Fold = 'RL' | 'LR' | 'TB' | 'BT';
const FOLD_WORDS: Readonly<Record<Fold, string>> = {
  RL: 'the right half over onto the left half',
  LR: 'the left half over onto the right half',
  TB: 'the top half down onto the bottom half',
  BT: 'the bottom half up onto the top half',
};
const isVerticalFold = (f: Fold): boolean => f === 'RL' || f === 'LR';
const mirrorCell = (f: Fold, [c, rw]: Pt): Pt => (isVerticalFold(f) ? [3 - c, rw] : [c, 3 - rw]);
const shiftCell = (f: Fold, [c, rw]: Pt): Pt =>
  f === 'RL' ? [c + 2, rw] : f === 'LR' ? [c - 2, rw] : f === 'TB' ? [c, rw - 2] : [c, rw + 2];
const otherAxisMirror = (f: Fold, [c, rw]: Pt): Pt => (isVerticalFold(f) ? [c, 3 - rw] : [3 - c, rw]);

interface Region {
  c0: number;
  c1: number;
  r0: number;
  r1: number;
}
const FULL: Region = { c0: 0, c1: 3, r0: 0, r1: 3 };
function afterFold(g: Region, f: Fold): Region {
  if (f === 'RL') return { ...g, c1: 1 };
  if (f === 'LR') return { ...g, c0: 2 };
  if (f === 'TB') return { ...g, r0: 2 };
  return { ...g, r1: 1 };
}
/** The part of region g that moves when fold f is made. */
function movingPart(g: Region, f: Fold): Region {
  if (f === 'RL') return { ...g, c0: 2 };
  if (f === 'LR') return { ...g, c1: 1 };
  if (f === 'TB') return { ...g, r1: 1 };
  return { ...g, r0: 2 };
}

const cellsKey = (cells: readonly Pt[]): string =>
  [...new Set(cells.map(([c, rw]) => `${c},${rw}`))].sort().join(' ');
const inGrid = ([c, rw]: Pt): boolean => c >= 0 && c <= 3 && rw >= 0 && rw <= 3;

/** Unfolds: undo the folds last-first, adding the image of every hole under `map`. */
function unfold(holes: readonly Pt[], folds: readonly Fold[], maps: ReadonlyArray<(f: Fold, p: Pt) => Pt>): Pt[] {
  let cells: Pt[] = [...holes];
  for (let i = folds.length - 1; i >= 0; i--) {
    const f = at(folds, i);
    const m = at(maps, i);
    cells = [...cells, ...cells.map((p) => m(f, p))];
  }
  return cells;
}

const PF = 18; // px per cell in the folding figure

function sheet(x0: number, y0: number, g: Region, holes: readonly Pt[], shade?: Region, foldLine?: Fold): string {
  const parts: string[] = [];
  const X = (c: number): number => x0 + c * PF;
  const Y = (rw: number): number => y0 + rw * PF;
  if (shade) {
    parts.push(
      `<rect x="${X(shade.c0)}" y="${Y(shade.r0)}" width="${(shade.c1 - shade.c0 + 1) * PF}" height="${(shade.r1 - shade.r0 + 1) * PF}" fill="#d4d4d4" stroke="none"/>`,
    );
  }
  for (let c = g.c0 + 1; c <= g.c1; c++) parts.push(line(X(c), Y(g.r0), X(c), Y(g.r1 + 1), 0.6, ` stroke-opacity="0.45"`));
  for (let rw = g.r0 + 1; rw <= g.r1; rw++) parts.push(line(X(g.c0), Y(rw), X(g.c1 + 1), Y(rw), 0.6, ` stroke-opacity="0.45"`));
  parts.push(
    `<rect x="${X(g.c0)}" y="${Y(g.r0)}" width="${(g.c1 - g.c0 + 1) * PF}" height="${(g.r1 - g.r0 + 1) * PF}" fill="none" stroke="${INK}" stroke-width="1.6"/>`,
  );
  if (foldLine) {
    const dash = ` stroke-dasharray="5 4"`;
    if (isVerticalFold(foldLine)) {
      const mid = X((g.c0 + g.c1 + 1) / 2);
      parts.push(line(mid, Y(g.r0) - 6, mid, Y(g.r1 + 1) + 6, 2, dash));
    } else {
      const mid = Y((g.r0 + g.r1 + 1) / 2);
      parts.push(line(X(g.c0) - 6, mid, X(g.c1 + 1) + 6, mid, 2, dash));
    }
  }
  for (const [c, rw] of holes) parts.push(`<circle cx="${f1(X(c + 0.5))}" cy="${f1(Y(rw + 0.5))}" r="5" fill="${INK}"/>`);
  return parts.join('');
}

function paperFoldQuestion(r: Rng): AuthoredQuestion {
  const vertical: Fold = r.pick(['RL', 'LR'] as const);
  const horizontal: Fold = r.pick(['TB', 'BT'] as const);
  const double = r.chance(0.5);
  const folds: Fold[] = double ? (r.chance(0.5) ? [vertical, horizontal] : [horizontal, vertical]) : [r.pick([vertical, horizontal])];
  const regions: Region[] = [FULL];
  for (const f of folds) regions.push(afterFold(at(regions, regions.length - 1), f));
  const final = at(regions, regions.length - 1);
  const free: Pt[] = [];
  for (let c = final.c0; c <= final.c1; c++) for (let rw = final.r0; rw <= final.r1; rw++) free.push([c, rw]);
  const holes = r.sample(free, double ? r.pick([1, 1, 2]) : r.pick([1, 2, 2]));

  const M = mirrorCell;
  const correct = unfold(holes, folds, folds.map(() => M));
  const correctKey = cellsKey(correct);

  const pool: Pt[][] = [];
  if (double) {
    pool.push(
      unfold(holes, folds, [shiftCell, shiftCell]),
      unfold(holes, folds, [M, shiftCell]),
      unfold(holes, folds, [shiftCell, M]),
      unfold(holes, [at(folds, 0)], [M]),
      unfold(holes, [at(folds, 1)], [M]),
    );
  } else {
    const f = at(folds, 0);
    pool.push(
      unfold(holes, folds, [shiftCell]),
      unfold(holes, folds, [otherAxisMirror]),
      [...holes, ...holes.map((p) => otherAxisMirror(f, M(f, p)))],
    );
  }
  pool.push([...holes]);
  const picked: Pt[][] = [];
  const seen = new Set([correctKey]);
  for (const cand of r.shuffle(pool)) {
    const key = cellsKey(cand);
    if (picked.length < 3 && cand.every(inGrid) && !seen.has(key)) {
      seen.add(key);
      picked.push(cand);
    }
  }
  // Fallback: the correct pattern with one hole moved to a neighbouring empty cell.
  for (const p of r.shuffle(correct)) {
    for (const [dc, dr] of DIRS4) {
      const moved: Pt = [p[0] + dc, p[1] + dr];
      const cand = [...correct.filter((q) => q !== p), moved];
      const key = cellsKey(cand);
      if (picked.length < 3 && inGrid(moved) && !seen.has(key) && cand.length === new Set(cand.map((q) => q.join())).size) {
        seen.add(key);
        picked.push(cand);
      }
    }
  }

  const pos = r.int(0, 3);
  const cands = placeAt(picked.slice(0, 3), correct, pos);
  const top: string[] = [];
  const xs = double ? [70, 244, 418] : [140, 348];
  for (let i = 0; i < folds.length; i++) {
    const g = at(regions, i);
    const f = at(folds, i);
    top.push(sheet(at(xs, i), 18, g, [], movingPart(g, f), f));
    top.push(text(at(xs, i) + 72 + (at(xs, i + 1) - at(xs, i) - 72) / 2, 62, '→', 26));
  }
  top.push(sheet(at(xs, folds.length), 18, final, holes));
  const bottom = cands.map((cells, k) => sheet(candX(k) - 36, 150, FULL, cells) + candLabel(k, 248)).join('');

  const foldText =
    folds.length === 1
      ? `folded once, ${FOLD_WORDS[at(folds, 0)]}`
      : `folded twice, first ${FOLD_WORDS[at(folds, 0)]} and then ${FOLD_WORDS[at(folds, 1)]}`;
  const n = holes.length;
  const layers = 2 ** folds.length;
  return {
    stem: `A square sheet of paper is ${foldText} (the shaded part is the part that moves; dashed lines are the folds). ${n === 1 ? 'A hole is' : 'Two holes are'} then punched through all the layers as shown. Which figure, (A) to (D), shows the sheet when it is opened out?`,
    ...letterOptions(pos),
    explanation: `Each hole goes through ${layers === 2 ? 'both layers' : `all ${layers} layers`}, so ${n === 1 ? 'the hole becomes' : 'each hole becomes'} ${layers} holes. Undo the folds one at a time, last fold first: every hole is reflected (mirrored) in the fold line being opened, never simply slid across. This gives ${n * layers} holes placed symmetrically about the fold line${folds.length > 1 ? 's' : ''}, as in option (${at(LETTERS, pos)}). The other patterns come from slips such as sliding the holes across instead of mirroring them, ${folds.length > 1 ? 'undoing only one of the folds' : 'reflecting in the wrong line'} or leaving holes out.`,
    figure: svg(560, 262, top.join('') + bottom),
  };
}

// ---------------------------------------------------------------------------------------------
// Polyominoes and cube nets
// ---------------------------------------------------------------------------------------------

const cellKey = ([x, y]: Pt): string => `${x},${y}`;

function normalise(cells: readonly Pt[]): Pt[] {
  const mx = Math.min(...cells.map((c) => c[0]));
  const my = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my] as Pt).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
const polyKey = (cells: readonly Pt[]): string => normalise(cells).map(cellKey).join(' ');
const freeKey = (cells: readonly Pt[]): string => SYMS.map((s) => polyKey(cells.map(s))).sort()[0] as string;

/** All fixed polyominoes (rotations and reflections counted separately) with `size` cells. */
function fixedPolyominoes(size: number): Pt[][] {
  let level = new Map<string, Pt[]>([['0,0', [[0, 0]]]]);
  for (let k = 1; k < size; k++) {
    const next = new Map<string, Pt[]>();
    for (const cells of level.values()) {
      const have = new Set(cells.map(cellKey));
      for (const [x, y] of cells) {
        for (const [dx, dy] of DIRS4) {
          const c: Pt = [x + dx, y + dy];
          if (have.has(cellKey(c))) continue;
          const grown = normalise([...cells, c]);
          const key = grown.map(cellKey).join(' ');
          if (!next.has(key)) next.set(key, grown);
        }
      }
    }
    level = next;
  }
  return [...level.values()];
}

type V3 = readonly [number, number, number];
const neg = (a: V3): V3 => [-a[0], -a[1], -a[2]];
const v3Key = (a: V3): string => a.join(',');

/**
 * Folds a net drawn on the page (marks facing the viewer, flaps folded away from the viewer)
 * and returns the outward normal of the cube face each cell becomes, or null if two cells
 * land on the same face (not a cube net). Net x runs right, net y runs down the page.
 */
function foldNet(cells: readonly Pt[]): V3[] | null {
  const idx = new Map(cells.map((c, i) => [cellKey(c), i]));
  const frames: Array<{ n: V3; u: V3; v: V3 } | undefined> = cells.map(() => undefined);
  frames[0] = { n: [0, 0, 1], u: [1, 0, 0], v: [0, -1, 0] };
  const queue = [0];
  while (queue.length) {
    const i = queue.shift() as number;
    const f = frames[i] as { n: V3; u: V3; v: V3 };
    const [c, rw] = at(cells, i);
    for (const [dc, dr] of DIRS4) {
      const j = idx.get(cellKey([c + dc, rw + dr]));
      if (j === undefined || frames[j]) continue;
      if (dc === 1) frames[j] = { n: f.u, u: neg(f.n), v: f.v };
      else if (dc === -1) frames[j] = { n: neg(f.u), u: f.n, v: f.v };
      else if (dr === 1) frames[j] = { n: f.v, u: f.u, v: neg(f.n) };
      else frames[j] = { n: neg(f.v), u: f.u, v: f.n };
      queue.push(j);
    }
  }
  const normals = frames.map((f) => (f as { n: V3 }).n);
  return new Set(normals.map(v3Key)).size === 6 ? normals : null;
}

const HEXOMINOES = fixedPolyominoes(6);
const CUBE_NETS = HEXOMINOES.filter((p) => foldNet(p) !== null);
/** Landscape (width >= height) versions only, so four fit side by side. */
const width = (p: readonly Pt[]): number => Math.max(...p.map((c) => c[0])) + 1;
const height = (p: readonly Pt[]): number => Math.max(...p.map((c) => c[1])) + 1;
const LANDSCAPE_NETS = CUBE_NETS.filter((p) => width(p) >= height(p));
const LANDSCAPE_NON_NETS = HEXOMINOES.filter((p) => foldNet(p) === null && width(p) >= height(p));

function hasBlock(p: readonly Pt[]): boolean {
  const s = new Set(p.map(cellKey));
  return p.some(([x, y]) => s.has(cellKey([x + 1, y])) && s.has(cellKey([x, y + 1])) && s.has(cellKey([x + 1, y + 1])));
}
function longestRun(p: readonly Pt[]): number {
  const s = new Set(p.map(cellKey));
  let best = 0;
  for (const [x, y] of p) {
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
    ] as const) {
      let k = 0;
      while (s.has(cellKey([x + k * dx, y + k * dy]))) k++;
      best = Math.max(best, k);
    }
  }
  return best;
}

function plainNet(cx: number, cy: number, cells: readonly Pt[], s: number): string {
  const x0 = cx - (width(cells) * s) / 2;
  const y0 = cy - (height(cells) * s) / 2;
  return cells
    .map(([x, y]) => `<rect x="${f1(x0 + x * s)}" y="${f1(y0 + y * s)}" width="${s}" height="${s}" fill="none" stroke="${INK}" stroke-width="1.8"/>`)
    .join('');
}

function invalidNetQuestion(r: Rng): AuthoredQuestion {
  const valid: Pt[][] = [];
  const used = new Set<string>();
  for (const p of r.shuffle(LANDSCAPE_NETS)) {
    const k = freeKey(p);
    if (valid.length < 3 && !used.has(k)) {
      used.add(k);
      valid.push(p);
    }
  }
  const tricky = LANDSCAPE_NON_NETS.filter((p) => !hasBlock(p));
  const bad = r.pick(r.chance(0.75) ? tricky : LANDSCAPE_NON_NETS);
  const pos = r.int(0, 3);
  const cands = placeAt(valid, bad, pos);
  const body = cands.map((p, k) => plainNet(candX(k), 70, p, 20) + candLabel(k, 140)).join('');
  const run = longestRun(bad);
  const why = hasBlock(bad)
    ? 'It contains a 2 × 2 block of squares. Four faces of a cube can never meet at one point (only three meet at a corner), so that block cannot fold up.'
    : run >= 5
      ? `It has ${run} squares in a line. Four squares in a line already wrap all the way round the cube, so the fifth square lands on top of the first.`
      : 'When it is folded, two of its squares land on the same face of the cube, leaving another face open.';
  return {
    stem: 'Each figure is made of six identical squares. Which one, (A) to (D), can NOT be folded along the lines to make a closed cube?',
    ...letterOptions(pos),
    explanation: `Option (${at(LETTERS, pos)}). ${why} Each of the other three is one of the 11 possible nets of a cube: folding it gives every face exactly once.`,
    figure: svg(560, 152, body),
  };
}

// Cube-from-net with marked faces. Every mark looks the same however the face is turned.
// No line marks (+ or x): drawn on the isometric top face, a + along the face edges looks
// like an x on screen and an x along the diagonals looks like a +, so they would be misread.
type Mark = 'black' | 'grey' | 'dot' | 'ring' | 'square' | 'blank';
const MARKS: readonly Mark[] = ['black', 'grey', 'dot', 'ring', 'square', 'blank'];
const MARK_NAME: Readonly<Record<Mark, string>> = {
  black: 'black',
  grey: 'grey',
  dot: 'dot',
  ring: 'ring',
  square: 'small square',
  blank: 'blank',
};

/** A face drawn as the parallelogram O, O+E1, O+E1+E2, O+E2 with its mark. */
function markedFace(O: Pt, E1: Pt, E2: Pt, mark: Mark): string {
  const P = (s: number, t: number): Pt => [O[0] + s * E1[0] + t * E2[0], O[1] + s * E1[1] + t * E2[1]];
  const fill = mark === 'black' ? INK : mark === 'grey' ? '#a6a6a6' : 'none';
  let out = poly([P(0, 0), P(1, 0), P(1, 1), P(0, 1)], fill, INK, 1.6);
  if (mark === 'dot' || mark === 'ring') {
    const rad = mark === 'dot' ? 0.15 : 0.3;
    const pts = Array.from({ length: 28 }, (_, i) => {
      const a = (2 * Math.PI * i) / 28;
      return P(0.5 + rad * Math.cos(a), 0.5 + rad * Math.sin(a));
    });
    out += poly(pts, mark === 'dot' ? INK : 'none', INK, 2);
  } else if (mark === 'square') {
    out += poly([P(0.25, 0.25), P(0.75, 0.25), P(0.75, 0.75), P(0.25, 0.75)], 'none', INK, 2.2);
  }
  return out;
}

/** Isometric cube with its near corner at (cx, cy): faces [top, right, left]. */
function isoCube(cx: number, cy: number, a: number, faces: readonly [Mark, Mark, Mark]): string {
  const h = (a * Math.sqrt(3)) / 2;
  const O: Pt = [cx, cy];
  return (
    markedFace(O, [h, -a / 2], [-h, -a / 2], faces[0]) +
    markedFace(O, [h, -a / 2], [0, a], faces[1]) +
    markedFace(O, [-h, -a / 2], [0, a], faces[2])
  );
}

function cubeFromNetQuestion(r: Rng): AuthoredQuestion {
  const cells = r.pick(CUBE_NETS);
  const normals = foldNet(cells) as V3[];
  const marks = r.shuffle(MARKS);
  const markOf = new Map<string, Mark>(normals.map((n, i) => [v3Key(n), at(marks, i)]));
  const mk = (n: V3): Mark => markOf.get(v3Key(n)) as Mark;
  const name = (m: Mark): string => `**${MARK_NAME[m]}**`;

  // The correct view: one corner of the folded cube, faces read clockwise top -> right -> left.
  const [sx, sy, sz] = [r.sign(), r.sign(), r.sign()];
  const X = mk([sx, 0, 0]);
  const Y = mk([0, sy, 0]);
  const Z = mk([0, 0, sz]);
  const cw: Mark[] = sx * sy * sz === 1 ? [Z, Y, X] : [Z, X, Y];
  const k0 = r.int(0, 2);
  const correct: [Mark, Mark, Mark] = [at(cw, k0), at(cw, (k0 + 1) % 3), at(cw, (k0 + 2) % 3)];

  const opposite = (m: Mark): Mark => {
    const i = marks.indexOf(m);
    return mk(neg(at(normals, i)));
  };
  const pairs: Array<[Mark, Mark]> = [];
  for (const m of marks) if (!pairs.some(([p, q]) => p === m || q === m)) pairs.push([m, opposite(m)]);

  const impossible: Array<[Mark, Mark, Mark]> = [];
  for (const [p, q] of pairs) for (const t of marks) if (t !== p && t !== q) impossible.push(r.shuffle([p, q, t]) as [Mark, Mark, Mark]);

  const useMirror = r.chance(0.5);
  const mirror: [Mark, Mark, Mark] = [correct[0], correct[2], correct[1]];
  const wrong: Array<[Mark, Mark, Mark]> = [...(useMirror ? [mirror] : []), ...r.shuffle(impossible).slice(0, useMirror ? 2 : 3)];
  const shuffledWrong = r.shuffle(wrong);
  const pos = r.int(0, 3);
  const cands = placeAt(shuffledWrong, correct, pos);

  const S = 32;
  const x0 = 280 - (width(cells) * S) / 2;
  const y0 = 10 + (5 * S - height(cells) * S) / 2;
  const net = cells.map(([x, y], i) => markedFace([x0 + x * S, y0 + y * S], [S, 0], [0, S], at(marks, i))).join('');
  const cubes = cands.map((faces, k) => isoCube(candX(k), 238, 36, faces) + candLabel(k, 304)).join('');

  const pairText = pairs.map(([p, q]) => `${name(p)} and ${name(q)}`).join('; ');
  const wrongText = cands
    .map((faces, k) => {
      if (k === pos) return '';
      const L = `(${at(LETTERS, k)})`;
      if (faces === mirror) {
        return `${L} has the right three faces in mirror-image order: on the real cube, reading clockwise round their shared corner, they run ${name(correct[0])} → ${name(correct[1])} → ${name(correct[2])}, but ${L} runs ${name(mirror[0])} → ${name(mirror[1])} → ${name(mirror[2])}.`;
      }
      const pair = pairs.find(([p, q]) => faces.includes(p) && faces.includes(q)) as [Mark, Mark];
      return `${L} shows ${name(pair[0])} next to ${name(pair[1])}, which are opposite faces.`;
    })
    .filter(Boolean)
    .join(' ');
  return {
    stem: 'The net is folded along the lines with its printed side on the outside of the cube (each face pattern looks the same however its face is turned). Which cube, (A) to (D), could be made from this net?',
    ...letterOptions(pos),
    explanation: `When the net is folded the opposite pairs are: ${pairText}. Two opposite faces can never be seen together. ${wrongText} Option (${at(LETTERS, pos)}) shows three faces that really meet at one corner, in the right order.`,
    figure: svg(560, 316, net + cubes),
  };
}

// ---------------------------------------------------------------------------------------------
// Counting figures
// ---------------------------------------------------------------------------------------------

function countTrianglesQuestion(r: Rng): AuthoredQuestion {
  const k = r.int(1, 4); // lines from the apex to the base
  const m = r.int(k === 1 ? 1 : 0, 2); // lines parallel to the base (k = 1, m = 0 would be a trivial 3)
  const A: Pt = [210, 18];
  const L: Pt = [60, 252];
  const R: Pt = [360, 252];
  const parts: string[] = [poly([A, L, R], 'none', INK, 2)];
  for (let i = 1; i <= k; i++) {
    const x = L[0] + ((R[0] - L[0]) * i) / (k + 1);
    parts.push(line(A[0], A[1], x, L[1], 2));
  }
  for (let j = 1; j <= m; j++) {
    const t = j / (m + 1);
    const y = A[1] + (L[1] - A[1]) * t;
    parts.push(line(A[0] - (A[0] - L[0]) * t, y, A[0] + (R[0] - A[0]) * t, y, 2));
  }
  const lines = k + 2;
  const perBase = nCr(lines, 2);
  const total = (m + 1) * perBase;
  const { answer, distractors } = numericOptions(r, {
    correct: total,
    wrong: [(k + 1) * (m + 1), perBase + m, total - 1, (m + 2) * perBase, total + k + 1],
    format: (x) => `$${x}$`,
  });
  const baseText =
    m === 0
      ? tex`Every triangle has its top vertex at the apex and its base on the bottom line, so it is fixed by choosing 2 of the ${lines} lines through the apex: $\binom{${lines}}{2} = ${perBase}$.`
      : tex`Every triangle has its top vertex at the apex: choose 2 of the ${lines} lines through the apex ($\binom{${lines}}{2} = ${perBase}$ ways) and one of the ${m + 1} horizontal lines as its base. Total $= ${m + 1} \times ${perBase} = ${total}$.`;
  return {
    stem: 'How many triangles are there in the figure?',
    answer,
    distractors,
    explanation: `${baseText} Counting only the ${(k + 1) * (m + 1)} smallest pieces${m > 0 ? ' (of which only the top row are triangles)' : ''} is the usual mistake.`,
    figure: svg(420, 270, parts.join('')),
  };
}

function countSquaresQuestion(r: Rng): AuthoredQuestion {
  const n = r.int(2, 5); // columns
  const m = r.int(2, 4); // rows
  const s = 40;
  const x0 = 20;
  const y0 = 20;
  const parts: string[] = [];
  for (let i = 0; i <= n; i++) parts.push(line(x0 + i * s, y0, x0 + i * s, y0 + m * s, 2));
  for (let j = 0; j <= m; j++) parts.push(line(x0, y0 + j * s, x0 + n * s, y0 + j * s, 2));
  const terms: Array<{ size: number; count: number }> = [];
  for (let size = 1; size <= Math.min(n, m); size++) terms.push({ size, count: (n - size + 1) * (m - size + 1) });
  const total = terms.reduce((a, t) => a + t.count, 0);
  const rectangles = nCr(n + 1, 2) * nCr(m + 1, 2);
  const { answer, distractors } = numericOptions(r, {
    correct: total,
    wrong: [n * m, n * m + 1, total - 1, rectangles, total + Math.min(n, m)],
    format: (x) => `$${x}$`,
  });
  const breakdown = terms.map((t) => `${t.size} \\times ${t.size}: ${t.count}`).join(',\\; ');
  return {
    stem: `The figure is a grid of ${n} × ${m} equal squares. How many squares of all sizes does it contain?`,
    answer,
    distractors,
    explanation: tex`Count each size separately. A $k \times k$ square fits in $(${n}-k+1)(${m}-k+1)$ positions: $${breakdown}$. Total $= ${terms.map((t) => t.count).join(' + ')} = ${total}$. (${n * m} counts only the smallest squares; ${rectangles} counts every rectangle.)`,
    figure: svg(2 * x0 + n * s, 2 * y0 + m * s, parts.join('')),
  };
}

// ---------------------------------------------------------------------------------------------
// Embedded (hidden) figures on a 4 x 4 lattice of unit edges
// ---------------------------------------------------------------------------------------------

type Edge = readonly [Pt, Pt];
const edgeKey = ([a, b]: Edge): string =>
  a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? `${a[0]},${a[1]},${b[0]},${b[1]}` : `${b[0]},${b[1]},${a[0]},${a[1]}`;

/** Splits polylines (horizontal, vertical or 45-degree segments) into unit edges. */
function unitEdges(lines: ReadonlyArray<readonly Pt[]>): Edge[] {
  const out = new Map<string, Edge>();
  for (const pl of lines) {
    for (let i = 0; i + 1 < pl.length; i++) {
      const [x1, y1] = at(pl, i);
      const [x2, y2] = at(pl, i + 1);
      const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
      const sx = Math.sign(x2 - x1);
      const sy = Math.sign(y2 - y1);
      for (let k = 0; k < steps; k++) {
        const e: Edge = [
          [x1 + k * sx, y1 + k * sy],
          [x1 + (k + 1) * sx, y1 + (k + 1) * sy],
        ];
        out.set(edgeKey(e), e);
      }
    }
  }
  return [...out.values()];
}

/** Shapes to hide. Each has a horizontal or vertical edge plus a non-parallel one, so it can
 *  only sit on the lattice at whole-number offsets. */
const HIDDEN_RAW: ReadonlyArray<{ name: string; lines: ReadonlyArray<readonly Pt[]> }> = [
  { name: 'right-angled triangle', lines: [[[0, 0], [2, 0], [0, 2], [0, 0]]] },
  { name: 'parallelogram', lines: [[[0, 0], [2, 0], [3, 1], [1, 1], [0, 0]]] },
  { name: 'trapezium', lines: [[[1, 0], [2, 0], [3, 1], [0, 1], [1, 0]]] },
  { name: 'house outline', lines: [[[0, 1], [1, 0], [2, 1], [2, 3], [0, 3], [0, 1]]] },
  { name: 'flag', lines: [[[0, 3], [0, 0], [2, 0], [1, 1], [0, 1]]] },
  { name: 'arrow', lines: [[[0, 1], [1, 0], [2, 1]], [[1, 0], [1, 3]]] },
  { name: 'diamond with a horizontal diagonal', lines: [[[1, 0], [2, 1], [1, 2], [0, 1], [1, 0]], [[0, 1], [2, 1]]] },
  { name: 'Z-shape', lines: [[[0, 0], [2, 0], [0, 2], [2, 2]]] },
  { name: 'L-shape outline', lines: [[[0, 0], [1, 0], [1, 2], [2, 2], [2, 3], [0, 3], [0, 0]]] },
  { name: 'square with one diagonal', lines: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]], [[0, 0], [2, 2]]] },
  { name: 'hexagon', lines: [[[1, 0], [2, 0], [3, 1], [2, 2], [1, 2], [0, 1], [1, 0]]] },
];
const HIDDEN_SHAPES = HIDDEN_RAW.map((s) => ({ name: s.name, edges: unitEdges(s.lines) }));

const GRID = 4;

const translateEdges = (edges: readonly Edge[], dx: number, dy: number): Edge[] =>
  edges.map(([a, b]) => [
    [a[0] + dx, a[1] + dy],
    [b[0] + dx, b[1] + dy],
  ]);

function normaliseEdges(edges: readonly Edge[]): Edge[] {
  const xs = edges.flatMap(([a, b]) => [a[0], b[0]]);
  const ys = edges.flatMap(([a, b]) => [a[1], b[1]]);
  return translateEdges(edges, -Math.min(...xs), -Math.min(...ys));
}
const extent = (edges: readonly Edge[]): Pt => [
  Math.max(...edges.flatMap(([a, b]) => [a[0], b[0]])),
  Math.max(...edges.flatMap(([a, b]) => [a[1], b[1]])),
];

/** True if `fig` contains `shape` turned or flipped in any way, at any whole-number offset. */
function containsAnyOrientation(fig: ReadonlySet<string>, shape: readonly Edge[]): boolean {
  for (const s of SYMS) {
    const o = normaliseEdges(shape.map(([a, b]) => [s(a), s(b)] as Edge));
    const [w, h] = extent(o);
    for (let dx = 0; dx + w <= GRID; dx++) {
      for (let dy = 0; dy + h <= GRID; dy++) {
        if (translateEdges(o, dx, dy).every((e) => fig.has(edgeKey(e)))) return true;
      }
    }
  }
  return false;
}

const DIR8: readonly Pt[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
];

function addNoise(r: Rng, fig: Map<string, Edge>, strokes: number): void {
  for (let s = 0; s < strokes; s++) {
    let x = r.int(0, GRID);
    let y = r.int(0, GRID);
    const [dx, dy] = r.pick(DIR8);
    const len = r.int(1, 4);
    for (let k = 0; k < len; k++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx > GRID || ny > GRID) break;
      const e: Edge = [
        [x, y],
        [nx, ny],
      ];
      fig.set(edgeKey(e), e);
      x = nx;
      y = ny;
    }
  }
}

function placeShape(r: Rng, shape: readonly Edge[]): Edge[] {
  const [w, h] = extent(shape);
  return translateEdges(shape, r.int(0, GRID - w), r.int(0, GRID - h));
}

const figKey = (fig: ReadonlyMap<string, Edge>): string => [...fig.keys()].sort().join(' ');

function drawEdges(edges: Iterable<Edge>, x0: number, y0: number, s: number): string {
  let out = '';
  for (const [a, b] of edges) out += line(x0 + a[0] * s, y0 + a[1] * s, x0 + b[0] * s, y0 + b[1] * s, 2.2);
  return out;
}

function embeddedFigureQuestion(r: Rng): AuthoredQuestion {
  const shape = r.pick(HIDDEN_SHAPES);
  const target = normaliseEdges(shape.edges);
  const correct = new Map(placeShape(r, target).map((e) => [edgeKey(e), e] as const));
  addNoise(r, correct, r.int(4, 6));

  const seen = new Set([figKey(correct)]);
  const wrong: Array<Map<string, Edge>> = [];
  for (let attempt = 0; wrong.length < 3 && attempt < 60; attempt++) {
    const placed = placeShape(r, target);
    const gap = edgeKey(r.pick(placed));
    const fig = new Map(placed.map((e) => [edgeKey(e), e] as const));
    addNoise(r, fig, r.int(4, 6));
    fig.delete(gap);
    const key = figKey(fig);
    if (seen.has(key) || containsAnyOrientation(new Set(fig.keys()), target)) continue;
    seen.add(key);
    wrong.push(fig);
  }
  for (let attempt = 0; wrong.length < 3; attempt++) {
    // Fallback (never contains the shape: it has fewer edges than the shape itself).
    const placed = placeShape(r, target);
    const fig = new Map(placed.map((e) => [edgeKey(e), e] as const));
    fig.delete(edgeKey(at(placed, attempt % placed.length)));
    const key = figKey(fig);
    if (!seen.has(key)) {
      seen.add(key);
      wrong.push(fig);
    }
  }

  const s = 22;
  const pos = r.int(0, 3);
  const cands = placeAt(wrong, correct, pos);
  const [w, h] = extent(target);
  const top =
    `<rect x="230" y="6" width="100" height="100" fill="none" stroke="${INK}" stroke-width="1"/>` +
    drawEdges(target, 280 - (w * s) / 2, 56 - (h * s) / 2, s);
  const body = cands
    .map(
      (fig, k) =>
        `<rect x="${candX(k) - 55}" y="128" width="110" height="110" fill="none" stroke="${INK}" stroke-width="1"/>` +
        drawEdges(fig.values(), candX(k) - 44, 139, s) +
        candLabel(k, 260),
    )
    .join('');
  return {
    stem: 'The shape in the box at the top is hidden in exactly one of the figures (A) to (D), at the same size and the same way round, possibly crossed by other lines. In which figure is it hidden?',
    ...letterOptions(pos),
    explanation: `The ${shape.name} can be traced, complete and the same way round, in figure (${at(LETTERS, pos)}). In each of the other figures at least one of its lines is missing, so it cannot be traced there in any position or orientation.`,
    figure: svg(560, 270, top + body),
  };
}

// ---------------------------------------------------------------------------------------------
// Lines of symmetry of capital letters and words (plain sans-serif capitals)
// ---------------------------------------------------------------------------------------------

// B and K are left out: whether they are symmetric top-to-bottom depends on the typeface.
const V_ONLY = ['A', 'M', 'T', 'U', 'V', 'W', 'Y'] as const;
const H_ONLY = ['C', 'D', 'E'] as const;
const BOTH = ['H', 'I', 'O', 'X'] as const;
const NO_LINE = ['F', 'G', 'J', 'L', 'N', 'P', 'Q', 'R', 'S', 'Z'] as const;

function letterClass(ch: string): string {
  if ((V_ONLY as readonly string[]).includes(ch)) return 'a vertical line only';
  if ((H_ONLY as readonly string[]).includes(ch)) return 'a horizontal line only';
  if ((BOTH as readonly string[]).includes(ch)) return 'both a vertical and a horizontal line';
  return 'no line of symmetry';
}

const H_WORDS = ['CODE', 'HIDE', 'DICE', 'ECHO', 'CHOICE', 'HOOD', 'DIODE', 'CHIDE', 'DECIDED', 'EXCEED'] as const;
const H_WORDS_WRONG = ['CODA', 'HIRE', 'DOME', 'DIET', 'EDGE', 'COLD', 'HERO', 'CHIP', 'COIN', 'DIVE'] as const;
const V_WORDS = ['MOM', 'WOW', 'TOT', 'TOOT', 'AHA', 'HAH', 'TUT', 'YAY'] as const;
const V_WORDS_WRONG = ['NOON', 'DAD', 'POP', 'BOB', 'EYE', 'LEVEL', 'RADAR', 'REFER', 'MATH', 'YOUTH', 'MOAT', 'HOAX'] as const;

function letterSymmetryQuestion(r: Rng): AuthoredQuestion {
  const kind = r.int(0, 5);
  const font = ' (plain sans-serif capitals)';
  const letterExpl = (opts: readonly string[]): string => opts.map((c) => `${c} has ${letterClass(c)}`).join('; ');
  if (kind <= 3) {
    const [answerPool, stem, wrongPools] = (
      [
        [V_ONLY, `Which capital letter has a vertical line of symmetry but no horizontal one${font}?`, [H_ONLY, NO_LINE, BOTH, NO_LINE]],
        [H_ONLY, `Which capital letter has a horizontal line of symmetry but no vertical one${font}?`, [V_ONLY, NO_LINE, BOTH, V_ONLY]],
        [BOTH, `Which capital letter has both a vertical and a horizontal line of symmetry${font}?`, [V_ONLY, H_ONLY, NO_LINE, V_ONLY]],
        [NO_LINE, `Which capital letter has no line of symmetry at all${font}?`, [V_ONLY, H_ONLY, BOTH, V_ONLY]],
      ] as const
    )[kind] as readonly [readonly string[], string, ReadonlyArray<readonly string[]>];
    const answer = r.pick(answerPool);
    const pools = r.shuffle(wrongPools).slice(0, 3);
    const distractors: string[] = [];
    for (const p of pools) distractors.push(r.pick(p.filter((c) => !distractors.includes(c))));
    return {
      stem,
      answer,
      distractors,
      explanation: `${cap(letterExpl([answer, ...distractors]))}. (Letters such as N, S and Z look the same after a half turn, but that is rotational symmetry, not a line of symmetry.)`,
    };
  }
  if (kind === 4) {
    const answer = r.pick(H_WORDS);
    const distractors = r.sample(H_WORDS_WRONG, 3);
    const bad = (w: string): string => [...w].filter((c) => !['B', 'C', 'D', 'E', 'H', 'I', 'K', 'O', 'X'].includes(c)).join(', ');
    return {
      stem: 'Written in plain capital letters, which word has a horizontal line of symmetry (it looks the same reflected top to bottom, as in its water image)?',
      answer,
      distractors,
      explanation: `A word has a horizontal line of symmetry only if every letter does. Every letter of ${answer} (from C, D, E, H, I, O, X) is symmetric top to bottom. ${distractors.map((d) => `${d} fails because of ${bad(d)}`).join('; ')}.`,
    };
  }
  const answer = r.pick(V_WORDS);
  const distractors = r.sample(V_WORDS_WRONG, 3);
  const vSym = ['A', 'H', 'I', 'M', 'O', 'T', 'U', 'V', 'W', 'X', 'Y'];
  const why = (w: string): string => {
    const bad = [...new Set([...w].filter((c) => !vSym.includes(c)))];
    return bad.length ? `${w}: ${bad.join(', ')} ${bad.length > 1 ? 'have' : 'has'} no vertical line` : `${w}: the letters are symmetric but the word does not read the same backwards`;
  };
  return {
    stem: 'Written in plain capital letters, which word has a vertical line of symmetry down its middle?',
    answer,
    distractors,
    explanation: `The word must read the same from both ends (a palindrome) AND use only letters with a vertical line of symmetry (A, H, I, M, O, T, U, V, W, X, Y). ${answer} satisfies both. ${distractors.map(why).join('; ')}.`,
  };
}

// ---------------------------------------------------------------------------------------------
// Signage
// ---------------------------------------------------------------------------------------------

type SignKind = 'prohibition' | 'mandatory' | 'warning' | 'safe' | 'fire';
const SIGNS: ReadonlyArray<{ kind: SignKind; desc: string; meaning: string; name: string }> = [
  { kind: 'prohibition', desc: 'a white circle with a red border and a red diagonal bar', meaning: 'Something that must not be done', name: 'prohibition sign' },
  { kind: 'mandatory', desc: 'a solid blue circle with a white symbol', meaning: 'Something that must be done', name: 'mandatory sign' },
  { kind: 'warning', desc: 'a yellow triangle with a black border', meaning: 'A hazard to watch out for', name: 'warning sign' },
  { kind: 'safe', desc: 'a green square or rectangle with a white symbol', meaning: 'An escape route or first-aid point', name: 'safe-condition sign' },
  { kind: 'fire', desc: 'a red square or rectangle with a white symbol', meaning: 'Where fire-fighting equipment is', name: 'fire-equipment sign' },
];

function signFigure(kind: SignKind): string {
  const cx = 110;
  const cy = 80;
  let body = '';
  if (kind === 'prohibition') {
    body =
      `<circle cx="${cx}" cy="${cy}" r="58" fill="#ffffff" stroke="#c8102e" stroke-width="13"/>` +
      `<line x1="${cx - 41}" y1="${cy - 41}" x2="${cx + 41}" y2="${cy + 41}" stroke="#c8102e" stroke-width="13"/>`;
  } else if (kind === 'mandatory') {
    body = `<circle cx="${cx}" cy="${cy}" r="64" fill="#1d5fbf" stroke="${INK}" stroke-width="1"/>`;
  } else if (kind === 'warning') {
    body = poly(
      [
        [cx, cy - 64],
        [cx + 70, cy + 58],
        [cx - 70, cy + 58],
      ],
      '#f5c400',
      INK,
      9,
    );
  } else {
    body = `<rect x="${cx - 60}" y="${cy - 60}" width="120" height="120" rx="6" fill="${kind === 'safe' ? '#1f8a3b' : '#c8102e'}" stroke="${INK}" stroke-width="1"/>`;
  }
  return svg(220, 160, body);
}

const PICTOGRAMS: ReadonlyArray<{ term: string; def: string }> = [
  { term: 'a stemmed wine glass printed on a carton', def: 'fragile, handle with care' },
  { term: 'an umbrella with rain falling on it, printed on a carton', def: 'keep the package dry' },
  { term: 'two upward-pointing arrows above a line, printed on a carton', def: 'this way up' },
  { term: 'three bent arrows chasing one another round a triangular loop', def: 'the material can be recycled' },
  { term: 'a flame inside a red-bordered diamond', def: 'a flammable substance' },
  { term: 'a skull and crossbones inside a red-bordered diamond', def: 'a toxic (poisonous) substance' },
  { term: 'a three-bladed trefoil round a small central dot', def: 'a radiation hazard' },
  { term: 'a lightning bolt inside a yellow triangle', def: 'danger of electric shock' },
  { term: 'a white cross on a green square', def: 'first aid' },
  { term: 'a lit cigarette crossed by a red bar', def: 'smoking is not allowed' },
  { term: 'a running figure heading for a doorway, white on green', def: 'the emergency exit' },
  { term: 'a lowercase letter i', def: 'an information point' },
  { term: 'a knife and fork', def: 'a place to eat' },
  { term: 'a walking figure holding a long white cane', def: 'facilities for people who are blind or partially sighted' },
];

type DrawingSymbol = 'north' | 'door' | 'window' | 'stair' | 'section' | 'scale' | 'break' | 'level';
const DRAWING_SYMBOLS: ReadonlyArray<{ kind: DrawingSymbol; name: string; why: string }> = [
  { kind: 'north', name: 'A north arrow', why: 'A north arrow shows how the plan is oriented, pointing to north.' },
  { kind: 'door', name: 'A door and its swing', why: 'In plan a door is drawn as an opening with the door leaf and a quarter-circle arc showing the way it swings open.' },
  { kind: 'window', name: 'A window in a wall', why: 'In plan a window is an opening in the wall filled with thin parallel lines (frame and glass) instead of solid wall.' },
  { kind: 'stair', name: 'A stair going up', why: 'A stair in plan shows parallel tread lines with an arrow pointing in the direction of travel, labelled UP.' },
  { kind: 'section', name: 'A section (cutting-plane) line', why: 'A section line is a chain line marking where the building is cut; the end arrows show the direction of view and the letters name the section (A-A).' },
  { kind: 'scale', name: 'A graphic scale bar', why: 'A graphic scale bar is a ruler drawn on the sheet, divided into real-world units (here metres).' },
  { kind: 'break', name: 'A break line', why: 'A break line, a thin line with a sharp zigzag, shows that part of a long object has been left out of the drawing.' },
  { kind: 'level', name: 'A level (height) marker', why: 'A level marker, a small triangle on a line with a figure such as +3.00, gives the height of that surface above a datum in metres.' },
];

function symbolFigure(kind: DrawingSymbol): string {
  const wall = (x1: number, x2: number): string =>
    `<rect x="${x1}" y="110" width="${x2 - x1}" height="12" fill="${INK}" stroke="${INK}" stroke-width="1"/>`;
  let body = '';
  switch (kind) {
    case 'north':
      body =
        `<circle cx="120" cy="92" r="44" fill="none" stroke="${INK}" stroke-width="2"/>` +
        poly(
          [
            [120, 48],
            [138, 116],
            [120, 102],
            [102, 116],
          ],
          'none',
          INK,
          2,
        ) +
        poly(
          [
            [120, 48],
            [120, 102],
            [102, 116],
          ],
          INK,
          INK,
          1,
        ) +
        text(120, 38, 'N', 18, 'bold');
      break;
    case 'door':
      body =
        wall(20, 90) +
        wall(150, 220) +
        line(90, 110, 90, 50, 3) +
        `<path d="M90,50 A60,60 0 0 1 150,110" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
      break;
    case 'window':
      body =
        wall(20, 90) +
        wall(150, 220) +
        line(90, 110, 150, 110, 1.4) +
        line(90, 122, 150, 122, 1.4) +
        line(90, 114, 150, 114, 1) +
        line(90, 118, 150, 118, 1) +
        line(90, 110, 90, 122, 1.4) +
        line(150, 110, 150, 122, 1.4);
      break;
    case 'stair': {
      const treads = Array.from({ length: 9 }, (_, i) => line(40 + 16 * (i + 1), 50, 40 + 16 * (i + 1), 120, 1.3)).join('');
      body =
        `<rect x="40" y="50" width="160" height="70" fill="none" stroke="${INK}" stroke-width="2"/>` +
        treads +
        line(52, 85, 186, 85, 2) +
        poly(
          [
            [194, 85],
            [182, 79],
            [182, 91],
          ],
          INK,
          INK,
          1,
        ) +
        `<circle cx="52" cy="85" r="3.5" fill="${INK}"/>` +
        text(64, 142, 'UP', 14, 'bold');
      break;
    }
    case 'section': {
      const arrowDown = (x: number): string =>
        line(x, 80, x, 108, 2.5) +
        poly(
          [
            [x, 118],
            [x - 7, 104],
            [x + 7, 104],
          ],
          INK,
          INK,
          1,
        );
      body =
        line(40, 80, 200, 80, 2.5, ` stroke-dasharray="18 6 3 6"`) +
        arrowDown(40) +
        arrowDown(200) +
        text(28, 74, 'A', 16, 'bold') +
        text(212, 74, 'A', 16, 'bold');
      break;
    }
    case 'scale': {
      const blocks = Array.from(
        { length: 5 },
        (_, i) => `<rect x="${30 + 36 * i}" y="70" width="36" height="12" fill="${i % 2 === 0 ? INK : 'none'}" stroke="${INK}" stroke-width="1.5"/>`,
      ).join('');
      const labels = Array.from({ length: 6 }, (_, i) => text(30 + 36 * i, 102, String(i), 13)).join('');
      body = blocks + labels + text(226, 102, 'm', 13);
      break;
    }
    case 'break':
      body = `<polyline points="20,80 104,80 112,52 128,108 136,80 220,80" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linejoin="miter"/>`;
      break;
    case 'level':
      body =
        line(30, 110, 210, 110, 1.6) +
        poly(
          [
            [68, 92],
            [92, 92],
            [80, 110],
          ],
          'none',
          INK,
          1.6,
        ) +
        poly(
          [
            [80, 92],
            [92, 92],
            [80, 110],
          ],
          INK,
          INK,
          1,
        ) +
        line(92, 92, 150, 92, 1.2) +
        text(124, 86, '+3.00', 14);
      break;
  }
  return svg(240, 160, body);
}

const DRAWING_TYPES: ReadonlyArray<{ term: string; def: string }> = [
  { term: 'floor plan', def: 'a horizontal cut through the building seen from above, showing walls, doors and windows' },
  { term: 'section', def: 'a vertical cut through the building showing its heights and how the inside is built' },
  { term: 'elevation', def: 'a flat, uncut view of one outside face of the building, drawn without perspective' },
  { term: 'site plan', def: 'a view from above of the building on its plot, with boundaries, access and surroundings' },
  { term: 'reflected ceiling plan', def: 'a plan of the ceiling drawn as if seen in a mirror on the floor, showing its lights and fittings' },
  { term: 'roof plan', def: 'a view from directly above the roof showing its ridges, slopes and rainwater drainage' },
  { term: 'axonometric drawing', def: 'a measurable 3-D view in which parallel edges stay parallel, with no vanishing points' },
  { term: 'detail drawing', def: 'a large-scale drawing of a small part, such as a joint or junction, showing exactly how it is built' },
];

// ---------------------------------------------------------------------------------------------
// Figure for the fixed "union jack" counting item
// ---------------------------------------------------------------------------------------------

const UNION_JACK = svg(
  200,
  200,
  `<rect x="20" y="20" width="160" height="160" fill="none" stroke="${INK}" stroke-width="2"/>` +
    line(20, 20, 180, 180) +
    line(180, 20, 20, 180) +
    line(100, 20, 100, 180) +
    line(20, 100, 180, 100),
);

// ---------------------------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------------------------

export default defineBank('design', 'visual-reasoning', (b) => [
  b.dynamic('c-paper-fold-punch', { difficulty: 2, origin: 'past-paper', tags: ['paper folding', 'non-verbal reasoning'] }, paperFoldQuestion),

  b.dynamic('c-cube-from-net', { difficulty: 3, origin: 'past-paper', tags: ['cube nets', 'non-verbal reasoning'] }, cubeFromNetQuestion),

  b.dynamic('c-not-a-cube-net', { difficulty: 1, tags: ['cube nets'] }, invalidNetQuestion),

  b.dynamic('c-count-triangles-squares', { difficulty: 2, origin: 'past-paper', tags: ['non-verbal reasoning'] }, (r) =>
    r.chance(0.5) ? countTrianglesQuestion(r) : countSquaresQuestion(r),
  ),

  b.dynamic('c-embedded-figure', { difficulty: 2, tags: ['non-verbal reasoning'] }, embeddedFigureQuestion),

  b.dynamic('c-letter-word-symmetry', { difficulty: 1, tags: ['mirror and water images', 'non-verbal reasoning'] }, letterSymmetryQuestion),

  b.dynamic('c-safety-sign-category', { difficulty: 1, origin: 'past-paper', tags: ['symbols and signage'] }, (r) => {
    const [target, ...others] = r.sample(SIGNS, 4) as [(typeof SIGNS)[number], ...(typeof SIGNS)[number][]];
    if (r.chance(0.6)) {
      return {
        stem: `In the international system of safety signs, a sign of the shape and colours shown (${target.desc}; the symbol is left out) tells people:`,
        answer: target.meaning,
        distractors: others.map((o) => o.meaning),
        explanation: `This is a ${target.name}. Safety signs code their meaning by shape and colour: red circle with a bar = prohibition, blue circle = mandatory action, yellow triangle = warning, green rectangle = safe condition (exits, first aid), red rectangle = fire equipment.`,
        figure: signFigure(target.kind),
      };
    }
    return {
      stem: `In the international system of safety signs, a sign meaning "${target.meaning.toLowerCase()}" is drawn as:`,
      answer: cap(target.desc),
      distractors: others.map((o) => cap(o.desc)),
      explanation: `It is a ${target.name}: ${target.desc}. ${others.map((o) => `${cap(o.desc)}: ${o.meaning.toLowerCase()}`).join('. ')}.`,
    };
  }),

  b.dynamic('c-drawing-symbol', { difficulty: 1, origin: 'past-paper', tags: ['symbols and signage'] }, (r) => {
    const [target, ...others] = r.sample(DRAWING_SYMBOLS, 4) as [(typeof DRAWING_SYMBOLS)[number], ...(typeof DRAWING_SYMBOLS)[number][]];
    return {
      stem: 'The symbol shown is used on architectural drawings. It represents:',
      answer: target.name,
      distractors: others.map((o) => o.name),
      explanation: target.why,
      figure: symbolFigure(target.kind),
    };
  }),

  b.dynamic('c-drawing-types', { difficulty: 2, tags: ['symbols and signage'] }, (r) =>
    termQuestion(
      r,
      DRAWING_TYPES,
      (term) => `In architectural drawing, ${/^[aeiou]/i.test(term) ? 'an' : 'a'} **${term}** is:`,
      (def) => `In architectural drawing, what is the name for ${def}?`,
    ),
  ),

  b.dynamic('c-pictogram-meaning', { difficulty: 1, tags: ['symbols and signage'] }, (r) =>
    termQuestion(
      r,
      PICTOGRAMS,
      (term) => `A pictogram showing ${term} means:`,
      (def) => `Which pictogram is used to mean "${def}"?`,
    ),
  ),

  ...b.mcqs([
    {
      id: 'c-union-jack-triangles', d: 3, t: ['non-verbal reasoning'],
      q: 'A square has both of its diagonals drawn, and both lines joining the midpoints of opposite sides, as in the figure. How many triangles does the figure contain?',
      a: '16',
      x: ['8', '12', '20'],
      e: 'Smallest triangles: 8. Triangles made of two small ones (the four quarters cut by the diagonals, each with a vertex at the centre): 4. Triangles made of four small ones (the halves cut off by a diagonal): 4. Total 8 + 4 + 4 = 16.',
      fig: UNION_JACK,
    },
    {
      id: 'c-three-folds-holes', d: 1, o: 'past-paper', t: ['paper folding'],
      q: 'A sheet of paper is folded in half three times, one fold after another. One hole is then punched through all the layers, away from the folds and edges. When the sheet is opened out, how many holes does it have?',
      a: '8',
      x: ['3', '4', '6'],
      e: 'Each fold doubles the number of layers: $2 \\times 2 \\times 2 = 8$ layers. The punch goes through every layer, so 8 holes appear.',
    },
    {
      id: 'c-plan-cut-height', d: 2, t: ['symbols and signage'],
      q: 'A floor plan is drawn as if the building were cut by a horizontal plane. That plane is normally taken:',
      a: 'About 1 to 1.5 m above the floor, through doors and windows',
      x: [
        'Exactly at floor level, below all the openings',
        'Just under the ceiling, above all the openings',
        'At the top of the roof, above the whole building',
      ],
      e: 'The cut is made roughly 1-1.5 m above the floor so that it passes through walls, doors and windows, which then all appear in the plan. A cut at floor level or above the openings would miss the doors and windows.',
    },
    {
      id: 'c-scale-bar-photocopy', d: 2, t: ['symbols and signage'],
      q: 'A drawing marked "Scale 1:100" also carries a graphic scale bar. It is then reduced on a photocopier. Which statement is now true?',
      a: 'Only the scale bar still gives correct measurements',
      x: [
        'Only the written ratio 1:100 still gives correct measurements',
        'The written ratio and the scale bar both remain correct',
        'The copy can no longer be measured by either method',
      ],
      e: 'The scale bar is reduced along with the drawing, so it still matches it. The written ratio 1:100 does not change, but the drawing is now smaller, so measuring with 1:100 gives wrong sizes.',
    },
    {
      id: 'c-poche-in-section', d: 2, t: ['symbols and signage'],
      q: 'In an architectural section, walls and floor slabs filled in solid black or hatched (poché) show:',
      a: 'The parts that the cutting plane passes through',
      x: [
        'The parts seen beyond the cut, in the distance',
        'The parts hidden behind other objects',
        'The glazed parts, such as windows',
      ],
      e: 'Poché marks the material actually cut by the section plane, so cut walls and slabs stand out. Things seen beyond the cut are drawn in lighter outline, and hidden edges are dashed.',
    },
    {
      id: 'c-dashed-lines-in-plan', d: 2, t: ['symbols and signage'],
      q: 'In a floor plan, a dashed line usually shows:',
      a: 'An edge above the cut or hidden from view, such as a beam overhead',
      x: [
        'A wall cut by the plane, drawn with the heaviest line',
        'A dimension line giving the size of a room',
        'The edge of a step or sill seen below the cut',
      ],
      e: 'Dashed (hidden) lines show edges that cannot be seen from the viewpoint of the plan: things above the cutting plane (beams, upper cabinets, roof overhangs) or concealed. Cut walls use the thickest solid lines; dimension lines and visible edges below the cut are thin solid lines.',
    },
    {
      id: 'c-access-symbol', d: 1, t: ['symbols and signage'],
      q: 'The International Symbol of Access, a stylised figure in a wheelchair (usually white on blue), marks:',
      a: 'A facility that people with disabilities can use',
      x: ['A hospital or first-aid post', 'A pedestrian crossing point', 'A lift reserved for staff only'],
      e: 'The International Symbol of Access identifies entrances, toilets, parking spaces, lifts and other facilities that are accessible to people with disabilities. First aid is shown by a white cross on green.',
    },
    {
      id: 'c-ramp-gradient', d: 2, t: ['symbols and signage'],
      q: 'Accessibility guidelines generally give the steepest gradient for a wheelchair ramp as about:',
      a: '1:12',
      x: ['1:2', '1:4', '1:6'],
      e: 'A rise of 1 unit for every 12 units of length (about 4.8°) is the usual maximum; steeper ramps such as 1:6 or 1:4 are too hard to climb and unsafe to descend in a wheelchair.',
    },
    {
      id: 'c-stop-octagon', d: 1, o: 'past-paper', t: ['symbols and signage'],
      q: 'On roads in Pakistan, as in most countries, a red octagonal sign means:',
      a: 'Stop',
      x: ['Give way', 'No entry', 'No parking'],
      e: 'The octagon is reserved for the STOP sign, so drivers recognise it by shape alone. Give way is an inverted triangle; no entry is a red circle with a white bar; no parking is a blue circle with a red border and slash.',
    },
    {
      id: 'c-peirce-symbol', d: 3, t: ['symbols and signage', 'non-verbal reasoning'],
      q: 'In C. S. Peirce\'s classification of signs, a sign linked to its meaning only by learned convention, with no resemblance or physical connection (for example, a written word or a number), is:',
      a: 'A symbol',
      x: ['An icon', 'An index', 'A pictogram'],
      e: 'An icon resembles what it stands for (a pictogram of a knife and fork is iconic); an index is physically or causally connected to it (smoke for fire, footprints); a symbol works only by agreed convention (words, numbers).',
    },
    {
      id: 'c-wayfinding', d: 1, t: ['symbols and signage'],
      q: 'The system of signs, maps, colours and landmarks that helps people find their way through an airport or hospital is called:',
      a: 'Wayfinding design',
      x: ['Brand identity design', 'Interior zoning', 'Massing'],
      e: 'Wayfinding design organises signs, maps, colour coding and landmarks so that people can orient themselves and reach their destination. Brand identity, zoning and massing are unrelated design terms.',
    },
  ]),
]);
