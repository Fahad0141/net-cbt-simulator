import { defineBank } from '@/engine/authoring';
import { num, numericOptions, pickDistractors, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

/**
 * Design Fundamentals and Theory, part A: parametric and visual items (colour-wheel
 * relationships, colour mixing, golden ratio and proportion arithmetic, Fibonacci patterns
 * in nature, symmetry and Gestalt figures, composition grids).
 *
 * Part B (`design-fundamentals.concepts.ts`, ids starting with `c-`) holds the conceptual
 * and past-paper-style fixed questions.
 *
 * Colour wheel: the traditional 12-hue RYB artist's wheel, listed clockwise from yellow.
 * Figures are drawn in dark ink and shown on a white card in every theme.
 */

// ---------------------------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------------------------

const INK = '#222';

const at = <T>(xs: readonly T[], i: number): T => xs[i] as T;

/** One decimal place, no binary noise (for SVG coordinates). */
const f1 = (x: number): string => String(Number(x.toFixed(1)));

const svg = (w: number, h: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;

const text = (x: number, y: number, t: string, size = 14): string =>
  `<text x="${f1(x)}" y="${f1(y)}" font-family="sans-serif" font-size="${size}" text-anchor="middle" fill="${INK}">${t}</text>`;

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const WHEEL = [
  'yellow',
  'yellow-orange',
  'orange',
  'red-orange',
  'red',
  'red-violet',
  'violet',
  'blue-violet',
  'blue',
  'blue-green',
  'green',
  'yellow-green',
] as const;

/** Hue at wheel position i (mod 12). */
const hue = (i: number): string => at(WHEEL, ((i % 12) + 12) % 12);
const wheelIndex = (name: string): number => WHEEL.indexOf(name as (typeof WHEEL)[number]);

/** Lists hues at the given positions. */
const hueList = (idx: readonly number[]): string => cap(idx.map(hue).join(', '));

/** Length in cm, exact to three decimal places. */
const cm = (x: number): string => `$${num(x, { dp: 3 })}\\,\\mathrm{cm}$`;

const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597] as const;

/** An asymmetric "F" motif centred on the origin (has no line of symmetry). */
const F_PATH = 'M-9,-15 H9 V-9 H-3 V-3 H5 V3 H-3 V15 H-9 Z';
const fMotif = (x: number, y: number, angle: number, s = 1, mirror = false): string =>
  `<path d="${F_PATH}" fill="${INK}" transform="translate(${f1(x)} ${f1(y)}) rotate(${angle}) scale(${mirror ? -s : s} ${s})"/>`;

/** An arrow pointing up when angle = 0 (rotated clockwise by `angle` degrees). */
const ARROW_PATH = 'M0,-18 L11,-3 L4,-3 L4,16 L-4,16 L-4,-3 L-11,-3 Z';
const arrow = (x: number, y: number, angle: number): string =>
  `<path d="${ARROW_PATH}" fill="${INK}" transform="translate(${f1(x)} ${f1(y)}) rotate(${angle})"/>`;

/** Vertices of a regular n-gon (first vertex at the top). */
function polyPoints(cx: number, cy: number, radius: number, n: number, offset = -90): Array<[number, number]> {
  return Array.from({ length: n }, (_, k) => {
    const a = ((offset + (360 * k) / n) * Math.PI) / 180;
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)] as [number, number];
  });
}

const polygon = (cx: number, cy: number, radius: number, n: number, fill = 'none'): string =>
  `<polygon points="${polyPoints(cx, cy, radius, n)
    .map(([x, y]) => `${f1(x)},${f1(y)}`)
    .join(' ')}" fill="${fill}" stroke="${INK}" stroke-width="2"/>`;

/** A small dot: circle or square, filled or hollow. */
function dot(x: number, y: number, shape: 'circle' | 'square', filled: boolean, size = 7): string {
  const fill = filled ? INK : 'none';
  if (shape === 'circle') {
    return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${size}" fill="${fill}" stroke="${INK}" stroke-width="2"/>`;
  }
  return `<rect x="${f1(x - size)}" y="${f1(y - size)}" width="${2 * size}" height="${2 * size}" fill="${fill}" stroke="${INK}" stroke-width="2"/>`;
}

/** Four candidate cells labelled (A)-(D) under a question row. */
function candidateRow(draw: (cx: number, cy: number, k: number) => string, y: number, width: number): string {
  const step = width / 4;
  return [0, 1, 2, 3]
    .map((k) => {
      const cx = step * (k + 0.5);
      return (
        `<rect x="${f1(cx - 30)}" y="${f1(y - 30)}" width="60" height="60" fill="none" stroke="${INK}" stroke-width="1"/>` +
        draw(cx, y, k) +
        text(cx, y + 50, `(${'ABCD'[k]})`)
      );
    })
    .join('');
}

const LETTERS = ['A', 'B', 'C', 'D'] as const;

// ---------------------------------------------------------------------------------------------
// Figure generators
// ---------------------------------------------------------------------------------------------

type Gestalt = 'proximity' | 'similarity' | 'closure' | 'common region';

/** Body (no <svg> wrapper) of a 360 x 200 figure showing one Gestalt grouping principle. */
function gestaltBody(r: Rng, kind: Gestalt): string {
  const W = 360;
  const H = 200;
  const parts: string[] = [];
  if (kind === 'proximity') {
    const groups = r.int(2, 4);
    const cols = groups === 4 ? 2 : r.int(2, 3);
    const rows = r.int(3, 4);
    const shape = r.pick(['circle', 'square'] as const);
    const filled = r.chance(0.5);
    const s = 22;
    const gap = 50;
    const groupW = (cols - 1) * s;
    const x0 = (W - (groups * groupW + (groups - 1) * gap)) / 2;
    const y0 = (H - (rows - 1) * s) / 2;
    for (let g = 0; g < groups; g++)
      for (let i = 0; i < cols; i++)
        for (let j = 0; j < rows; j++) parts.push(dot(x0 + g * (groupW + gap) + i * s, y0 + j * s, shape, filled));
  } else if (kind === 'similarity') {
    const cols = r.int(6, 8);
    const rows = r.int(4, 5);
    const s = 32;
    const byRow = r.chance(0.5);
    const byFill = r.chance(0.5);
    const x0 = (W - (cols - 1) * s) / 2;
    const y0 = (H - (rows - 1) * s) / 2;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const odd = (byRow ? j : i) % 2 === 1;
        parts.push(byFill ? dot(x0 + i * s, y0 + j * s, 'circle', odd) : dot(x0 + i * s, y0 + j * s, odd ? 'square' : 'circle', false));
      }
  } else if (kind === 'closure') {
    const shape = r.pick([0, 3, 4, 6]);
    const R = r.int(60, 80);
    const cx = W / 2;
    const cy = H / 2;
    if (shape === 0) {
      const k = r.int(5, 8);
      const offset = r.int(0, 40);
      const span = (360 / k) * 0.65;
      for (let i = 0; i < k; i++) {
        const a1 = ((offset + (360 * i) / k) * Math.PI) / 180;
        const a2 = a1 + (span * Math.PI) / 180;
        parts.push(
          `<path d="M${f1(cx + R * Math.cos(a1))},${f1(cy + R * Math.sin(a1))} A${R},${R} 0 0 1 ${f1(cx + R * Math.cos(a2))},${f1(cy + R * Math.sin(a2))}" fill="none" stroke="${INK}" stroke-width="4"/>`,
        );
      }
    } else {
      const pts = polyPoints(cx, cy + (shape === 3 ? 10 : 0), R, shape, shape === 4 ? -45 : -90);
      const t1 = r.pick([0.2, 0.25]);
      for (let i = 0; i < shape; i++) {
        const [xa, ya] = at(pts, i);
        const [xb, yb] = at(pts, (i + 1) % shape);
        parts.push(
          `<line x1="${f1(xa + (xb - xa) * t1)}" y1="${f1(ya + (yb - ya) * t1)}" x2="${f1(xa + (xb - xa) * (1 - t1))}" y2="${f1(ya + (yb - ya) * (1 - t1))}" stroke="${INK}" stroke-width="4"/>`,
        );
      }
    }
  } else {
    const [n, k] = r.pick([
      [6, 2],
      [8, 2],
      [6, 3],
      [9, 3],
    ] as const);
    const rows = r.int(1, 2);
    const shape = r.pick(['circle', 'square'] as const);
    // Dots stay evenly spaced (s) across group boundaries; neighbouring enclosures keep a
    // clear gap of s - 2 * pad so that each region reads as a separate boundary.
    const s = 40;
    const pad = 14;
    const x0 = (W - (n - 1) * s) / 2;
    const rowGap = 60;
    const y0 = (H - (rows - 1) * rowGap) / 2;
    for (let j = 0; j < rows; j++) {
      const y = y0 + j * rowGap;
      for (let g = 0; g < n / k; g++) {
        const xs = x0 + g * k * s - pad;
        parts.push(
          `<rect x="${f1(xs)}" y="${f1(y - 18)}" width="${(k - 1) * s + 2 * pad}" height="36" rx="12" fill="none" stroke="${INK}" stroke-width="2"/>`,
        );
      }
      for (let i = 0; i < n; i++) parts.push(dot(x0 + i * s, y, shape, true, 6));
    }
  }
  return parts.join('');
}

type SymKind = 'reflective' | 'rotational' | 'translational';

function symmetryFigure(r: Rng, kind: SymKind, n: number): string {
  const W = 360;
  const H = 200;
  const parts: string[] = [];
  if (kind === 'reflective') {
    const vertical = r.chance(0.6);
    const d = r.int(30, 55);
    const angle = r.pick([0, 15, 30, -20, 90]);
    if (vertical) {
      parts.push(`<line x1="180" y1="20" x2="180" y2="180" stroke="${INK}" stroke-width="1.5" stroke-dasharray="6 4"/>`);
      parts.push(`<g transform="translate(${180 - d} 100) rotate(${angle})"><path d="${F_PATH}" fill="${INK}" transform="scale(1.6)"/></g>`);
      parts.push(`<g transform="translate(${180 + d} 100) scale(-1 1) rotate(${angle})"><path d="${F_PATH}" fill="${INK}" transform="scale(1.6)"/></g>`);
    } else {
      parts.push(`<line x1="60" y1="100" x2="300" y2="100" stroke="${INK}" stroke-width="1.5" stroke-dasharray="6 4"/>`);
      const dy = Math.min(d, 50);
      parts.push(`<g transform="translate(180 ${100 - dy}) rotate(${angle})"><path d="${F_PATH}" fill="${INK}" transform="scale(1.4)"/></g>`);
      parts.push(`<g transform="translate(180 ${100 + dy}) scale(1 -1) rotate(${angle})"><path d="${F_PATH}" fill="${INK}" transform="scale(1.4)"/></g>`);
    }
  } else if (kind === 'rotational') {
    const R = n >= 6 ? r.int(54, 62) : r.int(42, 58);
    const sc = n >= 7 ? 1 : 1.2;
    const offset = r.pick([0, 20, 45]);
    for (let k = 0; k < n; k++) {
      const a = offset + (360 * k) / n;
      const rad = ((a - 90) * Math.PI) / 180;
      parts.push(fMotif(180 + R * Math.cos(rad), 100 + R * Math.sin(rad), a, sc));
    }
    parts.push(`<circle cx="180" cy="100" r="3" fill="${INK}"/>`);
  } else {
    const angle = r.pick([0, 30, 90, -45, 180]);
    const s = 300 / (n - 1);
    for (let k = 0; k < n; k++) parts.push(fMotif(30 + k * s, 100, angle, 1.2));
  }
  return svg(W, H, parts.join(''));
}

// ---------------------------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------------------------

/** Equal mixes on the RYB wheel: [colour, colour, result]. */
const RYB_MIXES: ReadonlyArray<readonly [string, string, string]> = [
  ['red', 'yellow', 'orange'],
  ['yellow', 'blue', 'green'],
  ['red', 'blue', 'violet'],
  ['yellow', 'orange', 'yellow-orange'],
  ['red', 'orange', 'red-orange'],
  ['red', 'violet', 'red-violet'],
  ['blue', 'violet', 'blue-violet'],
  ['blue', 'green', 'blue-green'],
  ['yellow', 'green', 'yellow-green'],
];

const LIGHT_MIXES: ReadonlyArray<{ mode: 'additive' | 'subtractive'; inputs: readonly string[]; out: string; why: string }> = [
  { mode: 'additive', inputs: ['red', 'green'], out: 'yellow', why: 'red + green light = yellow' },
  { mode: 'additive', inputs: ['green', 'blue'], out: 'cyan', why: 'green + blue light = cyan' },
  { mode: 'additive', inputs: ['red', 'blue'], out: 'magenta', why: 'red + blue light = magenta' },
  { mode: 'additive', inputs: ['red', 'green', 'blue'], out: 'white', why: 'all three additive primaries together give white' },
  { mode: 'subtractive', inputs: ['cyan', 'magenta'], out: 'blue', why: 'cyan absorbs red and magenta absorbs green, so only blue is reflected' },
  { mode: 'subtractive', inputs: ['cyan', 'yellow'], out: 'green', why: 'cyan absorbs red and yellow absorbs blue, so only green is reflected' },
  { mode: 'subtractive', inputs: ['magenta', 'yellow'], out: 'red', why: 'magenta absorbs green and yellow absorbs blue, so only red is reflected' },
  { mode: 'subtractive', inputs: ['cyan', 'magenta', 'yellow'], out: 'black', why: 'together the three inks absorb red, green and blue, leaving (near) black' },
];

const LIGHT_POOL = ['red', 'green', 'blue', 'cyan', 'magenta', 'yellow', 'white', 'black', 'brown'];

const HEX_COLOURS: ReadonlyArray<readonly [string, string]> = [
  ['FF0000', 'red'],
  ['00FF00', 'green'],
  ['0000FF', 'blue'],
  ['FFFF00', 'yellow'],
  ['00FFFF', 'cyan'],
  ['FF00FF', 'magenta'],
  ['FFFFFF', 'white'],
  ['000000', 'black'],
  ['808080', 'grey'],
];

const A_SIZES: ReadonlyArray<readonly [number, number]> = [
  [841, 1189],
  [594, 841],
  [420, 594],
  [297, 420],
  [210, 297],
  [148, 210],
  [105, 148],
  [74, 105],
];

/** Rule-of-thirds frames [W, H] in px, all divisible by 12 so every candidate point is whole. */
const FRAMES: ReadonlyArray<readonly [number, number]> = (() => {
  const out: Array<[number, number]> = [];
  for (const w of [1200, 1440, 1800, 1920, 2400, 3000, 3600])
    for (const [p, q] of [
      [3, 2],
      [4, 3],
      [16, 9],
      [1, 1],
    ] as const) {
      const h = (w * q) / p;
      if (Number.isInteger(h) && h % 12 === 0 && w % 12 === 0) out.push([w, h]);
    }
  return out;
})();

// ---------------------------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------------------------

export default defineBank('design', 'design-fundamentals', (b) => [
  // ---------------------------------------------------------------- colour theory
  b.dynamic('ryb-complement', { difficulty: 1, origin: 'past-paper', tags: ['colour theory'] }, (r) => {
    const i = r.int(0, 11);
    const answer = cap(hue(i + 6));
    const distractors = r.sample([hue(i + 1), hue(i - 1), hue(i + 4), hue(i + 8), hue(i + 5), hue(i + 7)], 3).map(cap);
    return {
      stem: `On the traditional 12-hue RYB artist's colour wheel, the complementary colour of **${hue(i)}** is:`,
      answer,
      distractors,
      explanation: tex`Complementary hues lie directly opposite each other ($180^\circ$, six steps apart) on the colour wheel. Opposite ${hue(i)} lies ${hue(i + 6)}. Hues one step away are analogous and hues four steps away form a triad.`,
    };
  }),

  b.dynamic('ryb-scheme-sets', { difficulty: 2, origin: 'past-paper', tags: ['colour theory'] }, (r) => {
    const kind = r.pick(['triadic', 'analogous', 'split'] as const);
    const j = r.int(0, 11);
    const k = r.int(0, 11);
    const m = r.int(0, 11);
    if (kind === 'split') {
      const i = r.int(0, 11);
      const pair = (a: number, c: number): string => cap(`${hue(i + a)} and ${hue(i + c)}`);
      return {
        stem: `A split-complementary colour scheme built on **${hue(i)}** (RYB wheel) uses ${hue(i)} together with:`,
        answer: pair(5, 7),
        distractors: [pair(4, 8), pair(1, 11), pair(3, 9)],
        explanation: tex`A split-complementary scheme replaces the complement (${hue(i + 6)}, $180^\circ$ away) by its two neighbours, $150^\circ$ either side of the base: ${hue(i + 5)} and ${hue(i + 7)}. Hues $120^\circ$ apart (${hue(i + 4)}, ${hue(i + 8)}) would make a triad.`,
      };
    }
    const triad = (s: number): number[] => [s, s + 4, s + 8];
    const analog = (s: number): number[] => [s, s + 1, s + 2];
    const split = (s: number): number[] => [s, s + 5, s + 7];
    const square = (s: number): number[] => [s, s + 3, s + 6];
    if (kind === 'triadic') {
      const s = r.int(0, 11);
      return {
        stem: 'On the 12-hue RYB colour wheel, which set of hues forms a **triadic** colour scheme?',
        answer: hueList(triad(s)),
        distractors: [hueList(analog(j)), hueList(split(k)), hueList(square(m))],
        explanation: tex`A triad uses three hues equally spaced around the wheel, $120^\circ$ (four steps) apart: ${hueList(triad(s)).toLowerCase()}. The other sets are adjacent hues, a split-complementary set and hues $90^\circ$ apart.`,
      };
    }
    const s = r.int(0, 11);
    return {
      stem: 'On the 12-hue RYB colour wheel, which set of hues forms an **analogous** colour scheme?',
      answer: hueList(analog(s)),
      distractors: [hueList(triad(j)), hueList(split(k)), hueList(square(m))],
      explanation: tex`Analogous hues sit next to each other on the wheel and share a common parent colour: ${hueList(analog(s)).toLowerCase()} are adjacent ($30^\circ$ steps). None of the other sets consists of three neighbouring hues.`,
    };
  }),

  b.dynamic('ryb-pigment-mixing', { difficulty: 1, origin: 'past-paper', tags: ['colour theory'] }, (r) => {
    const [x0, y0, out] = r.pick(RYB_MIXES);
    const [x, y] = r.shuffle([x0, y0]);
    const oi = wheelIndex(out);
    const pool = WHEEL.filter((h) => ![out, x, y, hue(oi + 1), hue(oi - 1)].includes(h));
    const secondary = ['orange', 'green', 'violet'].includes(out);
    return {
      stem: `On the RYB artist's colour wheel, mixing equal amounts of **${x}** and **${y}** paint gives:`,
      answer: cap(out),
      distractors: r.sample(pool, 3).map(cap),
      explanation: secondary
        ? `${cap(x)} and ${y} are primaries; mixing two primaries gives the secondary that lies between them on the wheel: ${out}.`
        : `Mixing a primary with a neighbouring secondary gives the tertiary between them, named primary first: ${x === out.split('-')[0] ? x : y} + ${x === out.split('-')[0] ? y : x} = ${out}.`,
    };
  }),

  b.dynamic('light-and-ink-mixing', { difficulty: 2, origin: 'past-paper', tags: ['colour theory'] }, (r) => {
    const mix = r.pick(LIGHT_MIXES);
    const inputs = r.shuffle(mix.inputs);
    const listed = inputs.length === 2 ? `${inputs[0]} and ${inputs[1]}` : `${inputs[0]}, ${inputs[1]} and ${inputs[2]}`;
    const pool = LIGHT_POOL.filter((c) => c !== mix.out && !inputs.includes(c) && !(mix.mode === 'subtractive' && c === 'brown'));
    const stem =
      mix.mode === 'additive'
        ? `When beams of **${listed}** light of equal intensity overlap on a white screen (additive RGB mixing), the colour seen is:`
        : `When transparent **${listed}** printing inks overlap on white paper (subtractive CMY mixing), the colour seen is:`;
    return {
      stem,
      answer: cap(mix.out),
      distractors: r.sample(pool, 3).map(cap),
      explanation:
        mix.mode === 'additive'
          ? `Light adds: the primaries are red, green and blue; ${mix.why}. (Paint intuition, e.g. red + green = brown, does not apply to light.)`
          : `Inks subtract (absorb) light from white: ${mix.why}.`,
    };
  }),

  b.dynamic('tint-shade-tone', { difficulty: 1, origin: 'past-paper', tags: ['colour theory'] }, (r) => {
    const base = r.pick(['red', 'blue', 'green', 'yellow', 'orange', 'violet']);
    const rows = [
      { add: 'white', name: 'tint', effect: 'lightens' },
      { add: 'black', name: 'shade', effect: 'darkens' },
      { add: 'grey', name: 'tone', effect: 'dulls (lowers the saturation of)' },
    ] as const;
    const row = r.pick(rows);
    const why = tex`Hue + white = tint; hue + black = shade; hue + grey = tone. Adding ${row.add} ${row.effect} ${base} without changing its hue.`;
    if (r.chance(0.5)) {
      return {
        stem: `Mixing pure ${base} with **${row.add}** produces a:`,
        answer: cap(`${row.name} of ${base}`),
        distractors: [...rows.filter((x) => x !== row).map((x) => cap(`${x.name} of ${base}`)), cap(`complement of ${base}`)],
        explanation: why,
      };
    }
    return {
      stem: `A **${row.name}** of ${base} is obtained by mixing ${base} with:`,
      answer: cap(row.add),
      distractors: [...rows.filter((x) => x !== row).map((x) => cap(x.add)), 'A neighbouring hue'],
      explanation: why,
    };
  }),

  b.dynamic('hue-angle', { difficulty: 1, tags: ['colour theory'] }, (r) => {
    const schemes = [
      { name: 'complementary', angle: 180, note: 'directly opposite hues' },
      { name: 'triadic', angle: 120, note: 'three hues equally spaced' },
      { name: 'analogous', angle: 30, note: 'neighbouring hues' },
      { name: 'square (tetradic)', angle: 90, note: 'four hues equally spaced' },
    ];
    const s = r.pick(schemes);
    const base = r.pick([...WHEEL]);
    const deg = (a: number): string => `$${a}^\\circ$`;
    return {
      stem: `On a 12-hue colour wheel (adjacent hues $30^\\circ$ apart), a designer builds ${s.name === 'analogous' ? 'an' : 'a'} **${s.name}** scheme starting from ${base}. The angle between ${s.angle === 180 ? 'its two hues' : 'neighbouring hues of the scheme'} is:`,
      answer: deg(s.angle),
      distractors: pickDistractors(deg(s.angle), [180, 120, 90, 30, 150, 60].map(deg), r),
      explanation: tex`${s.name === 'analogous' ? 'An' : 'A'} ${s.name} scheme uses ${s.note}: ${s.angle === 30 ? '$1$ step' : `$${s.angle / 30}$ steps`} of $30^\circ$ $= ${s.angle}^\circ$ around the wheel.`,
    };
  }),

  b.dynamic('hex-colour-code', { difficulty: 2, tags: ['colour theory'] }, (r) => {
    const [code, name] = r.pick(HEX_COLOURS);
    const dec = [0, 2, 4].map((p) => parseInt(code.slice(p, p + 2), 16));
    const asRgb = r.chance(0.5);
    const shown = asRgb ? `rgb(${dec.join(', ')})` : `#${code}`;
    const others = HEX_COLOURS.map(([, n]) => n).filter((n) => n !== name);
    return {
      stem: `On a screen, the colour value \`${shown}\` (red, green and blue channels, each 0 to 255) displays:`,
      answer: cap(name),
      distractors: r.sample(others, 3).map(cap),
      explanation: `Channels: R = ${dec[0]}, G = ${dec[1]}, B = ${dec[2]} (FF = 255, 80 = 128, 00 = 0). Screens mix light additively: R + G = yellow, G + B = cyan, R + B = magenta, all three full = white, none = black, equal halves = grey. So the colour is ${name}.`,
    };
  }),

  b.dynamic('complement-of-mix', { difficulty: 3, tags: ['colour theory'] }, (r) => {
    const [x0, y0, out] = r.pick(RYB_MIXES);
    const [x, y] = r.shuffle([x0, y0]);
    const oi = wheelIndex(out);
    const answer = hue(oi + 6);
    return {
      stem: `Equal amounts of **${x}** and **${y}** paint are mixed. On the RYB colour wheel, the complement of the resulting colour is:`,
      answer: cap(answer),
      distractors: pickDistractors(cap(answer), r.shuffle([out, x, y, hue(oi + 5), hue(oi + 7)]).map(cap)),
      explanation: `${cap(x)} + ${y} = ${out}. Its complement lies directly opposite on the wheel (six steps away): ${answer}.`,
    };
  }),

  b.fixed('tertiary-count', { difficulty: 1, tags: ['colour theory'] }, {
    stem: 'On the 12-hue RYB artist\'s colour wheel, how many **tertiary** colours are there?',
    answer: '6',
    distractors: ['3', '9', '12'],
    explanation: 'The wheel has 3 primaries, 3 secondaries and 6 tertiaries (yellow-orange, red-orange, red-violet, blue-violet, blue-green, yellow-green): 3 + 3 + 6 = 12.',
  }),

  b.dynamic('warm-cool-palette', { difficulty: 1, tags: ['colour theory', 'elements of design'] }, (r) => {
    // Only hues that are unambiguously warm or cool; borderline hues (yellow-green, violet,
    // red-violet) are never used.
    const WARM = ['yellow', 'yellow-orange', 'orange', 'red-orange', 'red'];
    const COOL = ['green', 'blue-green', 'blue', 'blue-violet'];
    const wantWarm = r.chance(0.5);
    const [same, other] = wantWarm ? [WARM, COOL] : [COOL, WARM];
    const fmt = (xs: readonly string[]): string => cap(r.shuffle(xs).join(', '));
    const mixed = (nSame: number): string[] => [...r.sample(same, nSame), ...r.sample(other, 3 - nSame)];
    // The three wrong sets hold 2, 1 and 0 hues of the wanted temperature, so they always differ.
    const answer = fmt(r.sample(same, 3));
    const distractors = [mixed(2), mixed(1), r.sample(other, 3)].map(fmt);
    return {
      stem: `A designer wants a palette made **only of ${wantWarm ? 'warm' : 'cool'}** colours. Which set of hues qualifies?`,
      answer,
      distractors,
      explanation: `Warm colours are the reds, oranges and yellows (red, red-orange, orange, yellow-orange, yellow); cool colours are the greens, blues and blue-violets (green, blue-green, blue, blue-violet). Only ${answer.toLowerCase()} are all ${wantWarm ? 'warm' : 'cool'}; every other set contains at least one ${wantWarm ? 'cool' : 'warm'} hue.`,
    };
  }),

  // ---------------------------------------------------------------- ratio and proportion
  b.dynamic('golden-rectangle-closest', { difficulty: 2, tags: ['ratio and proportion systems'] }, (r) => {
    // Answer: consecutive Fibonacci sides (ratio within 0.007 of phi). Distractors: well-known
    // ratios at least 0.1 away from phi (2 : 1, 3 : 2, 4 : 3, 5 : 4, 16 : 9, about root 2).
    const [fa, fb] = r.pick([
      [8, 13],
      [13, 21],
      [21, 34],
      [34, 55],
      [55, 89],
    ] as const);
    const kMax = Math.max(1, Math.floor(180 / fb));
    const k = r.int(1, kMax);
    const golden: [number, number] = [fa * k, fb * k];
    const scaled = ([p, q]: readonly [number, number]): [number, number] => {
      const m = r.int(Math.max(2, Math.ceil(30 / p)), Math.max(3, Math.floor(180 / q)));
      return [p * m, q * m];
    };
    const root2 = r.pick([
      [29, 41],
      [41, 58],
      [70, 99],
      [99, 140],
    ] as const);
    const cands: Array<[number, number]> = [
      ...r.sample(
        [
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 5],
          [9, 16],
        ] as const,
        2,
      ).map(scaled),
      [root2[0], root2[1]],
    ];
    const fmt = ([p, q]: readonly [number, number]): string => `${p} cm × ${q} cm`;
    const ratio = ([p, q]: readonly [number, number]): string => num(q / p, { dp: 3 });
    const answer = fmt(golden);
    return {
      stem: tex`Which of the following rectangles is closest in proportion to a golden rectangle ($\varphi \approx 1.618$)?`,
      answer,
      distractors: pickDistractors(answer, cands.map(fmt)),
      explanation: tex`Divide the longer side by the shorter side. ${[golden, ...cands]
        .map((c) => `${fmt(c)}: $${c[1]} \\div ${c[0]} \\approx ${ratio(c)}$`)
        .join('; ')}. Only ${answer} (consecutive Fibonacci numbers $${fa} : ${fb}$${k > 1 ? ` scaled by $${k}$` : ''}) gives a ratio close to $1.618$.`,
    };
  }),

  b.dynamic('golden-rectangle-side', { difficulty: 1, origin: 'past-paper', tags: ['ratio and proportion systems'] }, (r) => {
    if (r.chance(0.5)) {
      const a = r.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100]);
      const { answer, distractors } = numericOptions(r, {
        correct: a * 1.618,
        wrong: [a * 0.618, a * 2.618, a * 1.414, a * 1.5],
        format: cm,
      });
      return {
        stem: tex`A golden rectangle has a shorter side of $${a}\,\mathrm{cm}$. Taking $\varphi = 1.618$, its longer side is:`,
        answer,
        distractors,
        explanation: tex`In a golden rectangle, longer : shorter $= \varphi$. Longer side $= 1.618 \times ${a} = ${num(a * 1.618, { dp: 3 })}\,\mathrm{cm}$.`,
      };
    }
    const L = r.pick([10, 20, 30, 40, 50, 60, 80, 100, 120, 150, 200]);
    const { answer, distractors } = numericOptions(r, {
      correct: L * 0.618,
      wrong: [L * 1.618, L * 0.382, L / 2],
      format: cm,
    });
    return {
      stem: tex`A golden rectangle has a longer side of $${L}\,\mathrm{cm}$. Taking $1/\varphi = 0.618$, its shorter side is:`,
      answer,
      distractors,
      explanation: tex`Shorter side $= \dfrac{\text{longer}}{\varphi} = 0.618 \times ${L} = ${num(L * 0.618, { dp: 3 })}\,\mathrm{cm}$.`,
    };
  }),

  b.dynamic('golden-section-segment', { difficulty: 2, tags: ['ratio and proportion systems'] }, (r) => {
    const L = r.pick([30, 60, 90, 120, 150, 180, 240, 300, 600]);
    const longer = L * 0.618;
    const shorter = L - longer;
    const askLong = r.chance(0.5);
    const { answer, distractors } = numericOptions(r, {
      correct: askLong ? longer : shorter,
      wrong: askLong ? [shorter, L / 2, (2 * L) / 3] : [longer, L / 2, L / 3],
      format: cm,
    });
    return {
      stem: tex`A line $AB$ of length $${L}\,\mathrm{cm}$ is divided at $C$ in the golden section, so that $AB : AC = AC : CB$ with $AC > CB$. Taking $1/\varphi = 0.618$, the length of ${askLong ? '$AC$' : '$CB$'} is:`,
      answer,
      distractors,
      explanation: tex`In the golden section the longer part is $\dfrac{1}{\varphi}$ of the whole: $AC = 0.618 \times ${L} = ${num(longer, { dp: 3 })}\,\mathrm{cm}$, and $CB = ${L} - ${num(longer, { dp: 3 })} = ${num(shorter, { dp: 3 })}\,\mathrm{cm}$.`,
    };
  }),

  b.dynamic('ratio-division', { difficulty: 1, tags: ['ratio and proportion systems'] }, (r) => {
    const [a, bb, c] = r.sample([1, 2, 3, 4, 5, 6, 7], 3).sort((p, q) => p - q) as [number, number, number];
    const k = r.int(4, 25);
    const T = (a + bb + c) * k;
    const unit = r.pick([
      { u: 'cm', ctx: `A poster ${T} cm tall is divided into three horizontal bands` },
      T <= 90
        ? { u: 'm', ctx: `A façade ${T} m wide is divided into three bays` }
        : { u: 'cm', ctx: `A wall panel ${T} cm wide is divided into three strips` },
      { u: 'cm', ctx: `A shelf unit ${T} cm wide is divided into three compartments` },
    ]);
    const widest = r.chance(0.5);
    const correct = (widest ? c : a) * k;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [T / 3, bb * k, widest ? a * k : c * k, widest ? (T * c) / (a + bb) : (T * a) / (bb + c)],
      format: (x) => `$${num(x)}\\,\\mathrm{${unit.u}}$`,
    });
    return {
      stem: `${unit.ctx} in the ratio ${a} : ${bb} : ${c}. The ${widest ? 'largest' : 'smallest'} division measures:`,
      answer,
      distractors,
      explanation: tex`Total parts $= ${a} + ${bb} + ${c} = ${a + bb + c}$, so one part $= ${T} \div ${a + bb + c} = ${k}$. The ${widest ? 'largest' : 'smallest'} division $= ${widest ? c : a} \times ${k} = ${correct}\,\mathrm{${unit.u}}$.`,
    };
  }),

  b.dynamic('a-series-paper', { difficulty: 2, tags: ['ratio and proportion systems'] }, (r) => {
    const n = r.int(0, 5);
    const [w, h] = at(A_SIZES, n);
    const fmt = ([p, q]: readonly [number, number]): string => `${p} mm × ${q} mm`;
    if (r.chance(0.5)) {
      const prev = n > 0 ? at(A_SIZES, n - 1) : ([1189, 1682] as const);
      return {
        stem: `A sheet of A${n} paper measures ${w} mm × ${h} mm. It is cut in half parallel to its shorter sides, so that its longer side is halved. Rounded down to the nearest millimetre, each of the two new sheets measures:`,
        answer: fmt(at(A_SIZES, n + 1)),
        distractors: [fmt(prev), fmt(at(A_SIZES, n + 2)), fmt([Math.floor(w / 2), h])],
        explanation: tex`Halving the longer side: $${h} \div 2 = ${h / 2}$, so each half is ${Math.floor(h / 2)} mm × ${w} mm, which is A${n + 1}. Because the sides are in the ratio $1 : \sqrt{2}$, each half keeps the same proportions.`,
      };
    }
    const fold = r.int(1, 2);
    const answer = `A${n + fold}`;
    return {
      stem:
        fold === 2
          ? `An A${n} sheet is cut in half parallel to its shorter sides (halving its longer side), and then one of the two halves is cut in half again in the same way. What paper size is each of the two smallest pieces?`
          : `An A${n} sheet is cut in half parallel to its shorter sides (halving its longer side). What paper size is each of the two halves?`,
      answer,
      distractors: pickDistractors(answer, [`A${n + fold + 1}`, `A${n + 2 * fold + 1}`, n > 0 ? `A${n - 1}` : `A${n + 4}`, `A${n + fold + 2}`]),
      explanation: tex`Each halving moves one step down the series (A${n} $\to$ A${n + 1}${fold === 2 ? ` $\\to$ A${n + 2}` : ''}), because the $1 : \sqrt{2}$ ratio is preserved when the longer side is halved.`,
    };
  }),

  b.dynamic('rule-of-thirds', { difficulty: 2, tags: ['visual composition', 'ratio and proportion systems'] }, (r) => {
    const [W, H] = r.pick(FRAMES);
    const pts: Array<[number, number]> = [
      [W / 3, H / 3],
      [(2 * W) / 3, H / 3],
      [W / 3, (2 * H) / 3],
      [(2 * W) / 3, (2 * H) / 3],
    ];
    const p = r.pick(pts);
    const fmt = ([x, y]: readonly [number, number]): string => `$(${x},\\ ${y})$`;
    const answer = fmt(p);
    const qx = r.pick([W / 4, (3 * W) / 4]);
    const qy = r.pick([H / 4, (3 * H) / 4]);
    return {
      stem: `A photograph is ${W} px wide and ${H} px tall. Following the rule of thirds, which point (in px, measured from the top-left corner) is one of the four "power points" where the main subject is best placed?`,
      answer,
      distractors: pickDistractors(answer, [fmt([W / 2, H / 2]), fmt([qx, qy]), fmt([W / 2, p[1]]), fmt([p[0], H / 2])], r),
      explanation: tex`The frame is divided into thirds: vertical lines at $x = ${W / 3}$ and $${(2 * W) / 3}$, horizontal lines at $y = ${H / 3}$ and $${(2 * H) / 3}$. The power points are their four intersections, so $(${p[0]},\ ${p[1]})$ is one. The centre and the quarter points are not on both thirds lines.`,
    };
  }),

  b.fixed('phi-identity', { difficulty: 3, tags: ['ratio and proportion systems'] }, {
    stem: tex`If $\varphi \approx 1.618$ is the golden ratio, then $\varphi^{2} - \varphi$ equals:`,
    answer: '$1$',
    distractors: ['$0.618$', '$1.618$', '$2.618$'],
    explanation: tex`The golden ratio is the positive root of $\varphi^{2} = \varphi + 1$, so $\varphi^{2} - \varphi = 1$. Check: $1.618^{2} \approx 2.618$ and $2.618 - 1.618 = 1$.`,
  }),

  // ---------------------------------------------------------------- patterns in nature
  b.dynamic('fibonacci-next', { difficulty: 1, origin: 'past-paper', tags: ['patterns in nature', 'ratio and proportion systems'] }, (r) => {
    if (r.chance(0.5)) {
      const s = r.int(3, 11);
      const shown = [0, 1, 2, 3].map((k) => at(FIB, s + k));
      const last = at(shown, 3);
      const prev = at(shown, 2);
      const correct = at(FIB, s + 4);
      const { answer, distractors } = numericOptions(r, {
        correct,
        wrong: [2 * last, last + (last - prev), last + prev + 1, correct + 1],
        format: (x) => `$${x}$`,
      });
      return {
        stem: `The numbers of petals and spirals found in many plants follow the Fibonacci sequence. The term after ${shown.join(', ')} is:`,
        answer,
        distractors,
        explanation: `Each Fibonacci term is the sum of the two before it: ${prev} + ${last} = ${correct}.`,
      };
    }
    const a = r.int(2, 9);
    const c = r.int(a + 1, 15);
    const seq = [a, c];
    while (seq.length < 6) seq.push(at(seq, seq.length - 1) + at(seq, seq.length - 2));
    const shown = seq.slice(0, 5);
    const correct = at(seq, 5);
    const last = at(seq, 4);
    const prev = at(seq, 3);
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [2 * last, last + (last - prev), correct + 1, correct - 1],
      format: (x) => `$${x}$`,
    });
    return {
      stem: `A pattern of tiles grows like the Fibonacci sequence: each term after the second is the sum of the two terms before it. The term after ${shown.join(', ')} is:`,
      answer,
      distractors,
      explanation: `Add the last two terms: ${prev} + ${last} = ${correct}.`,
    };
  }),

  b.dynamic('spiral-counts', { difficulty: 2, origin: 'past-paper', tags: ['patterns in nature'] }, (r) => {
    const [thing, counts] = r.pick([
      ['the seed head of a sunflower', [21, 34, 55]],
      ['a pine cone', [5, 8]],
      ['a pineapple', [8, 13]],
      ['the centre of a daisy', [21]],
    ] as const);
    const N = r.pick(counts);
    const i = FIB.indexOf(N as (typeof FIB)[number]);
    const correct = at(FIB, i + 1);
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [2 * N, N + at(FIB, i - 2), correct + 1, correct - 1],
      format: (x) => `$${x}$`,
    });
    return {
      stem: `The spirals in ${thing} run in two directions, and the two counts are usually consecutive Fibonacci numbers. If the family running one way has ${N} spirals and the other family has more, the other family most likely has:`,
      answer,
      distractors,
      explanation: `Consecutive Fibonacci numbers: ..., ${at(FIB, i - 1)}, ${N}, ${correct}, ... The next one after ${N} is ${at(FIB, i - 1)} + ${N} = ${correct}. This packing arises because each new seed is set at the golden angle (about 137.5°).`,
    };
  }),

  b.dynamic('fibonacci-rectangle', { difficulty: 3, tags: ['patterns in nature', 'ratio and proportion systems'] }, (r) => {
    const n = r.int(5, 10);
    const sides = FIB.slice(0, n);
    const a = at(FIB, n - 1);
    const c = at(FIB, n);
    const askArea = r.chance(0.5);
    const correct = askArea ? a * c : 2 * (a + c);
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: askArea ? [c * c, a * a, a * at(FIB, n + 1), sides.reduce((p, q) => p + q, 0) * 2] : [a + c, 4 * c, 4 * a, 2 * (a + at(FIB, n + 1))],
      format: (x) => (askArea ? `$${x}\\,\\mathrm{cm^{2}}$` : `$${x}\\,\\mathrm{cm}$`),
    });
    return {
      stem: `Squares with sides ${sides.join(', ')} cm are placed edge to edge in turn: the first two squares side by side, then each new square along the longer side of the rectangle formed so far (the construction used to draw a Fibonacci spiral). The ${askArea ? 'area' : 'perimeter'} of the final rectangle is:`,
      answer,
      distractors,
      explanation: askArea
        ? tex`After the squares up to side $${a}$ the rectangle measures $${a} \times ${c}$ (two consecutive Fibonacci numbers: $1 \times 2,\ 2 \times 3,\ 3 \times 5, \ldots$). Area $= ${a} \times ${c} = ${correct}\,\mathrm{cm^{2}}$ (equal to the sum of the squares' areas).`
        : tex`After the squares up to side $${a}$ the rectangle measures $${a} \times ${c}$ (consecutive Fibonacci numbers). Perimeter $= 2(${a} + ${c}) = ${correct}\,\mathrm{cm}$.`,
    };
  }),

  b.fixed('golden-angle', { difficulty: 3, tags: ['patterns in nature'] }, {
    stem: 'In sunflowers and many other plants, each new seed or leaf is set at the same angle from the previous one, which packs them without gaps or straight rows. This "golden angle" is approximately:',
    answer: tex`$137.5^\circ$`,
    distractors: [tex`$120^\circ$`, tex`$90^\circ$`, tex`$161.8^\circ$`],
    explanation: tex`The golden angle divides the full turn in the golden ratio: $360^\circ \div \varphi^{2} \approx 360^\circ \div 2.618 \approx 137.5^\circ$. Rational angles such as $120^\circ$ or $90^\circ$ would line the seeds up in straight spokes.`,
  }),

  b.fixed('nautilus-spiral', { difficulty: 1, tags: ['patterns in nature'] }, {
    stem: 'The chambered shell of the nautilus grows in the shape of a:',
    answer: 'Logarithmic (equiangular) spiral',
    distractors: ['Archimedean (evenly spaced) spiral', 'Catenary curve', 'Parabola'],
    explanation: 'Each new chamber is a scaled-up copy of the last, so the shell keeps its shape as it grows: a logarithmic spiral, whose turns widen by a constant factor. An Archimedean spiral has evenly spaced turns.',
  }),

  b.fixed('hexagon-tessellation', { difficulty: 1, tags: ['patterns in nature'] }, {
    stem: 'Honeycomb cells fill space without gaps. Apart from the equilateral triangle and the square, which regular polygon can tile a flat surface on its own?',
    answer: 'Regular hexagon',
    distractors: ['Regular pentagon', 'Regular octagon', 'Regular heptagon'],
    explanation: tex`A regular polygon tiles the plane alone only if its interior angle divides $360^\circ$: triangle $60^\circ$, square $90^\circ$, hexagon $120^\circ$ ($3 \times 120^\circ = 360^\circ$). Pentagon $108^\circ$, heptagon about $128.6^\circ$ and octagon $135^\circ$ do not.`,
  }),

  // ---------------------------------------------------------------- symmetry and Gestalt figures
  b.dynamic('gestalt-figure', { difficulty: 2, origin: 'past-paper', tags: ['Gestalt principles', 'visual composition'] }, (r) => {
    const kinds = r.shuffle(['proximity', 'similarity', 'closure', 'common region'] as const);
    const target = r.pick(kinds);
    const pos = kinds.indexOf(target);
    const letter = at(LETTERS, pos);
    const panels = kinds
      .map((kind, k) => {
        const px = (k % 2) * 280;
        const py = Math.floor(k / 2) * 160;
        return (
          `<rect x="${px + 26}" y="${py + 4}" width="228" height="128" fill="none" stroke="${INK}" stroke-width="1"/>` +
          `<g transform="translate(${px + 32} ${py + 8}) scale(0.6)">${gestaltBody(r, kind)}</g>` +
          text(px + 140, py + 151, `(${at(LETTERS, k)})`)
        );
      })
      .join('');
    const what: Record<Gestalt, string> = {
      proximity: 'identical elements fall into groups only because of how close together they are (proximity)',
      similarity: 'evenly spaced elements form rows or columns because alike elements group together (similarity)',
      closure: 'a broken outline is still read as one complete shape (closure)',
      'common region': 'identical, evenly spaced dots group because they share an enclosing boundary (common region)',
    };
    const described = kinds.map((kind, k) => `(${at(LETTERS, k)}) ${what[kind]}`).join('; ');
    return {
      stem: `Which figure, (A) to (D), best illustrates the Gestalt principle of **${target}**?`,
      answer: letter,
      distractors: LETTERS.filter((l) => l !== letter),
      fixedOrder: [...LETTERS],
      explanation: `In (${letter}) ${what[target]}. The four panels show: ${described}.`,
      figure: svg(560, 320, panels),
    };
  }),

  b.dynamic('positive-negative-space', { difficulty: 2, tags: ['elements of design', 'visual composition'] }, (r) => {
    const [cols, rows] = r.pick([
      [5, 4],
      [5, 5],
      [8, 5],
      [10, 4],
      [6, 4],
      [6, 5],
      [8, 4],
      [7, 4],
    ] as const);
    const N = cols * rows;
    const choices: number[] = [];
    for (let k = Math.ceil(N * 0.2); k <= Math.floor(N * 0.45); k++) if (2 * k !== N) choices.push(k);
    const k = r.pick(choices);
    const filled = new Set(r.sample(Array.from({ length: N }, (_, i) => i), k));
    const cell = Math.min(Math.floor(400 / cols), Math.floor(240 / rows), 48);
    const x0 = (440 - cols * cell) / 2;
    const y0 = (260 - rows * cell) / 2;
    let body = '';
    for (let i = 0; i < N; i++) {
      const x = x0 + (i % cols) * cell;
      const y = y0 + Math.floor(i / cols) * cell;
      body += `<rect x="${f1(x)}" y="${f1(y)}" width="${cell}" height="${cell}" fill="${filled.has(i) ? INK : 'none'}" stroke="${INK}" stroke-width="1"/>`;
    }
    const figure = svg(440, 260, body);
    const neg = N - k;
    const gg = (a: number, c: number): number => (c === 0 ? a : gg(c, a % c));
    const ratio = (a: number, c: number): string => `$${a / gg(a, c)} : ${c / gg(a, c)}$`;
    const intro = `In the grid composition shown, the ${N} dark and white cells are equal in size. The dark cells are positive space (figure) and the white cells are negative space (ground).`;
    if ((100 * neg) % N === 0 && r.chance(0.5)) {
      const pct = (100 * neg) / N;
      const { answer, distractors } = numericOptions(r, {
        correct: pct,
        wrong: [(100 * k) / N, neg, 100 - neg, pct + 10, pct - 10],
        format: (x) => `$${num(x)}\\%$`,
      });
      return {
        stem: `${intro} What percentage of the picture area is negative space?`,
        answer,
        distractors,
        explanation: tex`Count: ${k} dark cells, so $${N} - ${k} = ${neg}$ white cells. Negative space $= \dfrac{${neg}}{${N}} \times 100\% = ${num(pct)}\%$.`,
        figure,
      };
    }
    const answer = ratio(k, neg);
    return {
      stem: `${intro} The ratio of positive to negative space is:`,
      answer,
      distractors: pickDistractors(answer, [ratio(neg, k), ratio(k, N), ratio(neg, N), ratio(k + 1, neg - 1)]),
      explanation: tex`Count: ${k} dark cells and $${N} - ${k} = ${neg}$ white cells. Positive : negative $= ${k} : ${neg}$${gg(k, neg) > 1 ? `, which simplifies to ${answer}` : ''}. (${ratio(k, N)} would compare positive space with the whole area.)`,
      figure,
    };
  }),

  b.dynamic('lines-of-symmetry', { difficulty: 1, tags: ['principles of design', 'patterns in nature'] }, (r) => {
    const n = r.int(3, 10);
    const star = r.chance(0.5);
    const R = 80;
    // A 3-pointed star needs a deeper notch, or it reads as a slightly dented triangle.
    const inner = n === 3 ? 0.25 : 0.45;
    const pts = star
      ? Array.from({ length: 2 * n }, (_, i) => {
          const rad = i % 2 === 0 ? R : R * inner;
          const a = ((-90 + (180 * i) / n) * Math.PI) / 180;
          return `${f1(180 + rad * Math.cos(a))},${f1(100 + rad * Math.sin(a))}`;
        }).join(' ')
      : polyPoints(180, 100, R, n)
          .map(([x, y]) => `${f1(x)},${f1(y)}`)
          .join(' ');
    const figure = svg(360, 200, `<polygon points="${pts}" fill="none" stroke="${INK}" stroke-width="2.5"/>`);
    const shape = star ? `regular ${n}-pointed star` : `regular polygon with ${n} equal sides`;
    const { answer, distractors } = numericOptions(r, {
      correct: n,
      wrong: [2 * n, n - 1, n + 1, star ? 2 * n - 1 : 0],
      format: (x) => `$${x}$`,
    });
    return {
      stem: `How many lines of reflective symmetry does the ${star ? 'star' : 'shape'} in the figure have?`,
      answer,
      distractors,
      explanation: `The figure is a ${shape}. A regular figure with ${n} identical ${star ? 'points' : 'sides'} has ${n} lines of symmetry: each passes through the centre and through ${star ? 'a point tip or an inner corner' : n % 2 === 0 ? 'opposite vertices or the midpoints of opposite sides' : 'a vertex and the midpoint of the opposite side'}.`,
      figure,
    };
  }),

  b.dynamic('symmetry-kind', { difficulty: 1, tags: ['principles of design', 'visual composition'] }, (r) => {
    const kind = r.pick(['reflective', 'rotational', 'translational'] as const);
    const n = kind === 'rotational' ? r.int(3, 6) : r.int(4, 6);
    const names = ['reflective', 'rotational', 'translational', 'glide-reflection'].map((x) => `${cap(x)} symmetry`);
    const answer = `${cap(kind)} symmetry`;
    const why = {
      reflective: 'One motif is the mirror image of the other across the dashed axis: reflective (mirror) symmetry.',
      rotational: `The same motif is repeated by turning it about a central point (${n} copies, every $${360 / n}^\\circ$) without flipping: rotational symmetry.`,
      translational: `The same motif is repeated by sliding it a fixed distance along a line, without turning or flipping: translational symmetry.`,
    }[kind];
    return {
      stem: 'The arrangement of the motif in the figure shows mainly:',
      answer,
      distractors: names.filter((x) => x !== answer),
      explanation: `${why} A glide reflection would need each copy to be flipped as well as shifted.`,
      figure: symmetryFigure(r, kind, n),
    };
  }),

  b.dynamic('rotational-order', { difficulty: 1, tags: ['principles of design', 'patterns in nature'] }, (r) => {
    const n = r.pick([3, 4, 5, 6, 8]);
    const figure = symmetryFigure(r, 'rotational', n);
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: n,
        wrong: [n + 1, n - 1, 2 * n, n + 2],
        format: (x) => `$${x}$`,
      });
      return {
        stem: 'The figure shows one motif repeated about a central point. Its order of rotational symmetry is:',
        answer,
        distractors,
        explanation: tex`The motif appears ${n} times, so the figure looks the same ${n} times in one full turn: order $${n}$. (The motif itself has no mirror line, so the figure has no reflective symmetry.)`,
        figure,
      };
    }
    const deg = (x: number): string => `$${num(x)}^\\circ$`;
    const { answer, distractors } = numericOptions(r, {
      correct: 360 / n,
      wrong: [180 / n, 360 / (n + 1), 360 / (n - 1), 720 / n],
      format: deg,
    });
    return {
      stem: 'The figure shows one motif repeated about a central point. The smallest angle through which it can be turned to look exactly the same is:',
      answer,
      distractors,
      explanation: tex`There are ${n} identical copies, so the smallest angle of rotation is $360^\circ \div ${n} = ${num(360 / n)}^\circ$.`,
      figure,
    };
  }),

  b.dynamic('pattern-continuation', { difficulty: 2, origin: 'past-paper', tags: ['patterns in nature', 'visual composition'] }, (r) => {
    const W = 420;
    const H = 230;
    const topY = 50;
    const step = 80;
    const x0 = 50;
    const frame = (i: number, inner: string): string =>
      `<rect x="${x0 + i * step - 30}" y="${topY - 30}" width="60" height="60" fill="none" stroke="${INK}" stroke-width="1"/>` + inner;
    const pos = r.int(0, 3);
    const letter = at(LETTERS, pos);
    const fixedOrder = [...LETTERS];
    const options = { answer: letter, distractors: LETTERS.filter((l) => l !== letter), fixedOrder };

    if (r.chance(0.7)) {
      const start = r.multiple(0, 315, 45);
      const turn = r.pick([45, 90, 135, -45, -90, -135]);
      const norm = (a: number): number => ((a % 360) + 360) % 360;
      const target = norm(start + 4 * turn);
      const pool: number[] = [];
      for (const a of [start + 3 * turn, start + 5 * turn, start - 4 * turn, target + 180, target + 90, target - 90, target + 45, target - 45].map(norm)) {
        if (a !== target && !pool.includes(a)) pool.push(a);
      }
      const wrong = pool.slice(0, 3);
      const cands = [...wrong.slice(0, pos), target, ...wrong.slice(pos)];
      const top = [0, 1, 2, 3].map((i) => frame(i, arrow(x0 + i * step, topY, start + i * turn))).join('') + frame(4, text(x0 + 4 * step, topY + 8, '?', 24));
      const dir = turn > 0 ? 'clockwise' : 'anticlockwise';
      const total = 4 * Math.abs(turn);
      return {
        stem: 'Which figure, (A) to (D), comes next in the series?',
        ...options,
        explanation: tex`The arrow turns $${Math.abs(turn)}^\circ$ ${dir} at each step, so the fifth arrow is turned $4 \times ${Math.abs(turn)}^\circ = ${total}^\circ$${total > 360 ? `, i.e. $${total - 360}^\\circ$,` : ''} ${dir} from the first${total === 360 ? ', which brings it back to the direction of the first arrow' : ''}. That arrow is drawn in option (${letter}).`,
        figure: svg(W, H, top + candidateRow((cx, cy, k) => arrow(cx, cy, at(cands, k)), 150, W)),
      };
    }
    const n0 = r.pick([3, 4]);
    const target = n0 + 4;
    const wrong = r.shuffle([n0 + 3, n0 + 5, n0 + 2]);
    const cands = [...wrong.slice(0, pos), target, ...wrong.slice(pos)];
    const top = [0, 1, 2, 3].map((i) => frame(i, polygon(x0 + i * step, topY, 22, n0 + i))).join('') + frame(4, text(x0 + 4 * step, topY + 8, '?', 24));
    return {
      stem: 'Which figure, (A) to (D), comes next in the series?',
      ...options,
      explanation: `The number of sides increases by one each time: ${n0}, ${n0 + 1}, ${n0 + 2}, ${n0 + 3}, so the next figure has ${target} sides. That polygon is option (${letter}).`,
      figure: svg(W, H, top + candidateRow((cx, cy, k) => polygon(cx, cy, 22, at(cands, k)), 150, W)),
    };
  }),
]);
