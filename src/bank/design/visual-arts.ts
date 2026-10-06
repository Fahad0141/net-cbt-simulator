import { defineBank } from '@/engine/authoring';
import { num, numericOptions, q$, tex, U } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// ---------------------------------------------------------------------------
// SVG helpers (pure, deterministic). Dark ink on a transparent background,
// no ids/classes, no scripts, no external references.
// ---------------------------------------------------------------------------

type Pt = readonly [number, number];
type V3 = readonly [number, number, number];

const INK = '#222';
const r1 = (x: number): number => Math.round(x * 10) / 10;
const DEG = Math.PI / 180;
const LETTERS = ['A', 'B', 'C', 'D'] as const;

function svgWrap(w: number, h: number, body: string[]): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ` +
    `font-family="Arial, Helvetica, sans-serif" font-size="14">${body.join('')}</svg>`
  );
}

function svgLine(a: Pt, b: Pt, opts: { dash?: boolean; w?: number } = {}): string {
  const dash = opts.dash ? ' stroke-dasharray="5 4"' : '';
  return (
    `<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" ` +
    `stroke="${INK}" stroke-width="${opts.w ?? 2}" stroke-linecap="round"${dash}/>`
  );
}

function svgPoly(pts: readonly Pt[], w = 2): string {
  const p = pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ');
  return `<polygon points="${p}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`;
}

function svgCircle(c: Pt, rad: number, w = 2): string {
  return `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(rad)}" fill="none" stroke="${INK}" stroke-width="${w}"/>`;
}

function svgDot(c: Pt): string {
  return `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="4" fill="${INK}"/>`;
}

function svgText(p: Pt, s: string, anchor: 'start' | 'middle' | 'end' = 'middle', bold = true): string {
  const weight = bold ? ' font-weight="bold"' : '';
  return `<text x="${r1(p[0])}" y="${r1(p[1])}" text-anchor="${anchor}" fill="${INK}"${weight}>${s}</text>`;
}

/** Maps content coordinates into a fixed W x H frame, centred, filling `fill` of the frame. */
function makeFit(pts: readonly Pt[], W: number, H: number, fill: number, yUp: boolean): (p: Pt) => Pt {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bw = Math.max(maxX - minX, 1e-6);
  const bh = Math.max(maxY - minY, 1e-6);
  const s = Math.min((fill * W) / bw, (fill * H) / bh);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return ([x, y]) => [W / 2 + (x - cx) * s, yUp ? H / 2 - (y - cy) * s : H / 2 + (y - cy) * s];
}

/** Liang-Barsky clip of segment ab to the rectangle [m, W-m] x [m, H-m]. */
function clip(a: Pt, b: Pt, W: number, H: number, m = 4): [Pt, Pt] | null {
  let t0 = 0;
  let t1 = 1;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const checks: Array<[number, number]> = [
    [-dx, a[0] - m],
    [dx, W - m - a[0]],
    [-dy, a[1] - m],
    [dy, H - m - a[1]],
  ];
  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return null;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
    }
  }
  if (t0 > t1) return null;
  return [
    [a[0] + t0 * dx, a[1] + t0 * dy],
    [a[0] + t1 * dx, a[1] + t1 * dy],
  ];
}

const dist = (a: Pt, b: Pt): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

// ---------------------------------------------------------------------------
// Perspective renderer: a box seen by a pin-hole eye at the origin looking
// along +z (y up). Projection X = x/z, Y = y/z. Yaw turns the box about its
// vertical axis; pitch tilts the camera (gives the third vanishing point).
// ---------------------------------------------------------------------------

interface BoxView {
  /** Projected vertices (y up). Vertex index bits: 1 = +x, 2 = +y, 4 = +z (box axes). */
  verts: Pt[];
  /** Camera-space depth of each vertex. */
  depth: number[];
  /** Visible faces as vertex-index cycles. */
  faces: number[][];
  /** Visible edges with the box axis they are parallel to. */
  edges: Array<{ a: number; b: number; axis: number }>;
  /** Vanishing point of each box axis (null when the axis is parallel to the picture plane). */
  vps: Array<Pt | null>;
}

function boxView(center: V3, half: V3, yawDeg: number, pitchDeg: number): BoxView {
  const yaw = yawDeg * DEG;
  const pitch = pitchDeg * DEG;
  const rot = (v: V3): V3 => {
    const x1 = v[0] * Math.cos(yaw) + v[2] * Math.sin(yaw);
    const z1 = -v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw);
    const y1 = v[1];
    return [x1, y1 * Math.cos(pitch) - z1 * Math.sin(pitch), y1 * Math.sin(pitch) + z1 * Math.cos(pitch)];
  };
  const axes: V3[] = [rot([1, 0, 0]), rot([0, 1, 0]), rot([0, 0, 1])];
  const pos: V3[] = [];
  for (let i = 0; i < 8; i++) {
    const s = [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1];
    const p: [number, number, number] = [center[0], center[1], center[2]];
    for (let k = 0; k < 3; k++) {
      for (let c = 0; c < 3; c++) p[c] += s[k]! * half[k]! * axes[k]![c]!;
    }
    pos.push(p);
  }
  const verts: Pt[] = pos.map((p) => [p[0] / p[2], p[1] / p[2]]);
  const faces: number[][] = [];
  const faceVisible = new Map<string, boolean>();
  for (let k = 0; k < 3; k++) {
    for (const sg of [-1, 1]) {
      const n = axes[k]!.map((c) => c * sg);
      const fc = [0, 1, 2].map((c) => center[c]! + sg * half[k]! * axes[k]![c]!);
      const visible = -(n[0]! * fc[0]! + n[1]! * fc[1]! + n[2]! * fc[2]!) > 1e-9;
      faceVisible.set(`${k}${sg}`, visible);
      if (!visible) continue;
      const [i, j] = [0, 1, 2].filter((c) => c !== k) as [number, number];
      const bit = (c: number): number => 1 << c;
      const base = sg > 0 ? bit(k) : 0;
      faces.push([base, base | bit(i), base | bit(i) | bit(j), base | bit(j)]);
    }
  }
  const edges: BoxView['edges'] = [];
  for (let a = 0; a < 8; a++) {
    for (let k = 0; k < 3; k++) {
      if (a & (1 << k)) continue;
      const b = a | (1 << k);
      const others = [0, 1, 2].filter((c) => c !== k);
      const vis = others.some((c) => faceVisible.get(`${c}${a & (1 << c) ? 1 : -1}`));
      if (vis) edges.push({ a, b, axis: k });
    }
  }
  const vps = axes.map((u) => {
    if (Math.abs(u[2]) < 1e-9) return null;
    const d = u[2] > 0 ? u : (u.map((c) => -c) as unknown as V3);
    return [d[0] / d[2], d[1] / d[2]] as Pt;
  });
  return { verts, depth: pos.map((p) => p[2]), faces, edges, vps };
}

/** Draws the visible faces of a box view through the given mapping. */
function drawBox(view: BoxView, map: (p: Pt) => Pt): string[] {
  return view.faces.map((f) => svgPoly(f.map((i) => map(view.verts[i]!)), 2.2));
}

// ---------------------------------------------------------------------------
// Shared data
// ---------------------------------------------------------------------------

const POLY_NAME: Record<number, string> = {
  3: 'triangle',
  4: 'square',
  5: 'pentagon',
  6: 'hexagon',
  7: 'heptagon',
  8: 'octagon',
  9: 'nonagon',
  10: 'decagon',
  12: 'dodecagon',
};
const ADJ: Record<number, string> = {
  3: 'triangular',
  4: 'square',
  5: 'pentagonal',
  6: 'hexagonal',
  7: 'heptagonal',
  8: 'octagonal',
  9: 'nonagonal',
  10: 'decagonal',
};
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const interior = (n: number): number => (180 * (n - 2)) / n;

/** Picks three distinct distractors from a pool, excluding the answer. */
function pick3(r: Rng, pool: readonly string[], answer: string): string[] {
  return r.sample(
    pool.filter((p) => p !== answer),
    3,
  );
}

// Similar-triangle data for the picture-plane question: p (cm), h (cm), H (m), D (m).
const PICTURE_PLANE: Array<readonly [number, number, number, number]> = [];
for (const p of [20, 25, 30, 40, 50, 60]) {
  for (const H of [2, 3, 4, 5, 6, 8, 9, 10, 12, 15]) {
    for (let h = 2; h <= 15; h++) {
      const D = (H * p) / h;
      if (Number.isInteger(D) && D >= 6 && D <= 80 && D > 2 * H) PICTURE_PLANE.push([p, h, H, D]);
    }
  }
}

// Vertex configurations of the regular and semi-regular tessellations.
const VERTEX_CONFIGS: ReadonlyArray<readonly number[]> = [
  [6, 6, 6],
  [3, 12, 12],
  [4, 6, 12],
  [4, 8, 8],
  [3, 6, 3, 6],
  [3, 4, 6, 4],
  [3, 3, 3, 4, 4],
  [3, 3, 4, 3, 4],
  [3, 3, 3, 3, 6],
];

const COUNT_WORD = ['', 'one', 'two', 'three', 'four'];
const PLURAL: Record<number, string> = {
  3: 'equilateral triangles',
  4: 'squares',
  6: 'regular hexagons',
  8: 'regular octagons',
  12: 'regular dodecagons',
};
const SINGULAR: Record<number, string> = {
  3: 'an equilateral triangle',
  4: 'a square',
  6: 'a regular hexagon',
  8: 'a regular octagon',
  12: 'a regular dodecagon',
};

function describePolys(ns: readonly number[]): string {
  const counts = new Map<number, number>();
  for (const n of ns) counts.set(n, (counts.get(n) ?? 0) + 1);
  const parts = [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([n, c]) => (c === 1 ? SINGULAR[n]! : `${COUNT_WORD[c]} ${PLURAL[n]}`));
  return parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

interface Section {
  q: string;
  a: string;
  x: readonly string[];
  e: string;
}

const SECTIONS: readonly Section[] = [
  {
    q: 'A solid cube is cut by a plane parallel to one of its faces. The shape of the cut face is:',
    a: 'Square',
    x: ['Equilateral triangle', 'Regular hexagon', 'Circle', 'Trapezium'],
    e: 'Every section parallel to a face is a copy of that face, so it is a square of the same size.',
  },
  {
    q: 'A plane slices off one corner of a cube, passing through the three vertices next to that corner. The shape of the cut face is:',
    a: 'Equilateral triangle',
    x: ['Square', 'Regular hexagon', 'Right-angled isosceles triangle', 'Rectangle'],
    e: 'The three cut points are joined by face diagonals of equal length, so the section is an equilateral triangle.',
  },
  {
    q: 'A cube is cut by a plane through its centre, perpendicular to a long (space) diagonal. The shape of the cut face is:',
    a: 'Regular hexagon',
    x: ['Square', 'Equilateral triangle', 'Regular pentagon', 'Rectangle'],
    e: 'This plane meets six of the twelve edges at their midpoints, giving a regular hexagon.',
  },
  {
    q: 'A cube is cut by a plane containing two opposite edges that do not share a face. The shape of the cut face is:',
    a: 'Rectangle that is not a square',
    x: ['Square', 'Regular hexagon', 'Equilateral triangle', 'Rhombus that is not a square'],
    e: tex`The section has one pair of sides equal to the edge $a$ and the other pair equal to the face diagonal $a\sqrt{2}$, with right angles: a non-square rectangle.`,
  },
  {
    q: 'A cylinder is cut by a plane parallel to its circular base. The shape of the cut face is:',
    a: 'Circle',
    x: ['Ellipse', 'Rectangle', 'Parabola', 'Square'],
    e: 'Any section parallel to the base repeats the base, so it is a circle of the same radius.',
  },
  {
    q: 'A tall cylinder (height greater than its diameter) is cut vertically by a plane containing its axis. The shape of the cut face is:',
    a: 'Rectangle',
    x: ['Circle', 'Ellipse', 'Triangle', 'Trapezium'],
    e: 'The section is bounded by two straight generators and two diameters of the ends, so it is a rectangle (diameter by height).',
  },
  {
    q: 'A cylinder is cut by a slanting plane that crosses its curved surface only, without touching either end. The shape of the cut face is:',
    a: 'Ellipse',
    x: ['Circle', 'Parabola', 'Rectangle', 'Hyperbola'],
    e: 'A tilted plane stretches the circular section in one direction, giving an ellipse.',
  },
  {
    q: 'A right circular cone is cut by a plane parallel to its base. The shape of the cut face is:',
    a: 'Circle',
    x: ['Ellipse', 'Triangle', 'Parabola', 'Square'],
    e: 'Sections of a cone parallel to the base are smaller circles.',
  },
  {
    q: 'A right circular cone is cut vertically by a plane through its apex and its axis. The shape of the cut face is:',
    a: 'Isosceles triangle',
    x: ['Circle', 'Parabola', 'Ellipse', 'Rectangle'],
    e: 'The plane contains two slant generators of equal length and a diameter of the base: an isosceles triangle.',
  },
  {
    q: 'A right circular cone is cut by a plane parallel to one of its slant sides. The curved edge of the cut face is a:',
    a: 'Parabola',
    x: ['Circle', 'Ellipse', 'Hyperbola', 'Straight line'],
    e: 'A conic section made parallel to a generator is a parabola.',
  },
  {
    q: 'A right circular cone is cut by a slightly tilted plane that passes right through its curved surface without meeting the base. The shape of the cut face is:',
    a: 'Ellipse',
    x: ['Circle', 'Parabola', 'Isosceles triangle', 'Hyperbola'],
    e: 'A closed tilted section of a cone (less steep than the slant sides) is an ellipse.',
  },
  {
    q: 'A sphere of clay is sliced by a flat wire cut in any direction. The cut face is always a:',
    a: 'Circle',
    x: ['Ellipse', 'Parabola', 'Square', 'Semicircle'],
    e: 'Every plane section of a sphere is a circle (largest when the cut passes through the centre).',
  },
  {
    q: 'A square-based pyramid is cut by a plane parallel to its base. The shape of the cut face is:',
    a: 'Square',
    x: ['Equilateral triangle', 'Circle', 'Regular pentagon', 'Trapezium'],
    e: 'Sections parallel to the base are smaller copies of the base: squares.',
  },
  {
    q: 'A triangular prism is cut by a plane parallel to its triangular ends. The shape of the cut face is:',
    a: 'Triangle',
    x: ['Rectangle', 'Square', 'Circle', 'Trapezium'],
    e: 'Sections of a prism parallel to its ends are identical to the end faces, so they are triangles.',
  },
  {
    q: 'A triangular prism lying on a rectangular face is cut by a horizontal plane halfway up its height. The shape of the cut face is:',
    a: 'Rectangle',
    x: ['Triangle', 'Circle', 'Regular hexagon', 'Ellipse'],
    e: 'The plane runs along the full length of the prism and across its sloping faces, so the section is a rectangle.',
  },
];

// Cube nets (cells of a unit grid).
const CUBE_NETS: ReadonlyArray<ReadonlyArray<Pt>> = [
  [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 2]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
];

/** Regular n-gon (side = |p1 - p0|) built on edge p0p1, on the side of `out`. */
function polygonOnEdge(p0: Pt, p1: Pt, n: number, out: Pt): Pt[] {
  const build = (sgn: number): Pt[] => {
    const s = dist(p0, p1);
    let ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    const pts: Pt[] = [p0, p1];
    for (let i = 2; i < n; i++) {
      ang += (sgn * 2 * Math.PI) / n;
      const prev = pts[pts.length - 1]!;
      pts.push([prev[0] + s * Math.cos(ang), prev[1] + s * Math.sin(ang)]);
    }
    return pts;
  };
  const a = build(1);
  const mid: Pt = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
  const cx = a.reduce((t, p) => t + p[0], 0) / n;
  const cy = a.reduce((t, p) => t + p[1], 0) / n;
  return (cx - mid[0]) * out[0] + (cy - mid[1]) * out[1] > 0 ? a : build(-1);
}

type NetShape = { kind: 'poly'; pts: Pt[] } | { kind: 'circle'; c: Pt; r: number };

function renderNet(shapes: readonly NetShape[]): string {
  const W = 480;
  const H = 280;
  const pts: Pt[] = [];
  for (const s of shapes) {
    if (s.kind === 'poly') pts.push(...s.pts);
    else pts.push([s.c[0] - s.r, s.c[1] - s.r], [s.c[0] + s.r, s.c[1] + s.r]);
  }
  const map = makeFit(pts, W, H, 0.9, false);
  const scale = dist(map([0, 0]), map([1, 0]));
  const body = shapes.map((s) => (s.kind === 'poly' ? svgPoly(s.pts.map(map), 2) : svgCircle(map(s.c), s.r * scale)));
  return svgWrap(W, H, body);
}

// ---------------------------------------------------------------------------
// The bank
// ---------------------------------------------------------------------------

export default defineBank('design', 'visual-arts', (b) => [
  // ------------------------------------------------------------------ perspective
  b.dynamic('perspective-system-from-drawing', { difficulty: 1, origin: 'past-paper', tags: ['perspective', 'drawing and painting'] }, (r) => {
    const kind = r.pick(['one', 'two', 'three', 'iso'] as const);
    const W = 400;
    const H = 250;
    const body: string[] = [];
    if (kind === 'iso') {
      const w = r.real(1, 2.2, 1);
      const h = r.real(0.8, 1.8, 1);
      const d = r.real(1, 2.2, 1);
      const c30 = Math.cos(30 * DEG);
      const P = (x: number, y: number, z: number): Pt => [(x - z) * c30, y - (x + z) * 0.5];
      const top = [P(0, h, 0), P(w, h, 0), P(w, h, d), P(0, h, d)];
      const fx = [P(w, 0, 0), P(w, h, 0), P(w, h, d), P(w, 0, d)];
      const fz = [P(0, 0, d), P(w, 0, d), P(w, h, d), P(0, h, d)];
      const all = [...top, ...fx, ...fz];
      const map = makeFit(all, W, H, 0.5, true);
      // Parallel extensions of the receding (horizontal) edges, drawn away from the viewer.
      const L = 6;
      const ext: Array<[Pt, Pt]> = [
        [P(0, h, d), P(0, h, d - L)],
        [P(w, h, d), P(w, h, d - L)],
        [P(w, 0, d), P(w, 0, d - L)],
        [P(w, h, 0), P(w - L, h, 0)],
        [P(w, h, d), P(w - L, h, d)],
        [P(w, 0, d), P(w - L, 0, d)],
      ];
      for (const [a, c] of ext) {
        const seg = clip(map(a), map(c), W, H);
        if (seg) body.push(svgLine(seg[0], seg[1], { dash: true, w: 1.2 }));
      }
      for (const f of [top, fx, fz]) body.push(svgPoly(f.map(map), 2.2));
    } else {
      let view: BoxView;
      if (kind === 'one') {
        // Keep the vanishing point clear of the front face on both axes, so a side face and
        // the top or underside both show their converging edges (otherwise only a rectangle).
        const hx = r.real(0.5, 0.9, 2);
        const hy = r.real(0.4, 0.8, 2);
        view = boxView(
          [r.sign() * (hx + r.real(0.25, 0.6, 2)), r.sign() * (hy + r.real(0.2, 0.5, 2)), r.real(4, 6, 1)],
          [hx, hy, r.real(0.5, 1, 2)],
          0,
          0,
        );
      } else if (kind === 'two') {
        view = boxView(
          [r.real(-0.3, 0.3, 2), r.sign() * r.real(0.9, 1.5, 2), r.real(4, 6, 1)],
          [r.real(0.5, 0.9, 2), r.real(0.4, 0.8, 2), r.real(0.5, 0.9, 2)],
          r.sign() * r.int(28, 62),
          0,
        );
      } else {
        view = boxView(
          [r.real(-0.2, 0.2, 2), 0, r.real(3.2, 4, 1)],
          [r.real(0.5, 0.8, 2), r.real(0.9, 1.2, 2), r.real(0.5, 0.8, 2)],
          r.sign() * r.int(30, 60),
          r.sign() * r.int(26, 36),
        );
      }
      // In one-point perspective the vanishing point is near the box, so keep it in frame.
      const fitPts = kind === 'one' && view.vps[2] ? [...view.verts, view.vps[2]] : view.verts;
      const map = makeFit(fitPts, W, H, kind === 'one' ? 0.8 : 0.5, true);
      for (const e of view.edges) {
        const vp = view.vps[e.axis];
        if (!vp) continue;
        if (kind !== 'three' && e.axis === 1) continue;
        const far = view.depth[e.a]! > view.depth[e.b]! ? e.a : e.b;
        const seg = clip(map(view.verts[far]!), map(vp), W, H);
        if (seg) body.push(svgLine(seg[0], seg[1], { dash: true, w: 1.2 }));
      }
      body.push(...drawBox(view, map));
    }
    const names = {
      one: 'One-point perspective',
      two: 'Two-point perspective',
      three: 'Three-point perspective',
      iso: 'Isometric projection',
    } as const;
    const reasons = {
      one: 'The front face is a true rectangle (its edges stay horizontal and vertical); only the edges running into depth converge, all to a single vanishing point. This is one-point perspective.',
      two: 'The vertical edges stay vertical and parallel, while both sets of horizontal edges converge to two different vanishing points on the horizon. This is two-point perspective.',
      three: 'Both sets of horizontal edges converge and the vertical edges also converge (towards a third point above or below the box), so there are three vanishing points: three-point perspective.',
      iso: 'The extended edges stay parallel and never meet, so there is no vanishing point; the receding edges are drawn at equal angles to the horizontal. This is isometric projection, a parallel (non-perspective) drawing.',
    } as const;
    const answer = names[kind];
    return {
      stem: 'A box is drawn below, with some of its edges extended as dashed lines. Which drawing system has been used?',
      answer,
      distractors: Object.values(names).filter((n) => n !== answer),
      explanation: reasons[kind],
      figure: svgWrap(W, H, body),
    };
  }),

  b.dynamic('locate-vanishing-point', { difficulty: 2, tags: ['perspective'] }, (r) => {
    const two = r.chance(0.5);
    const W = 500;
    const H = 260;
    let view!: BoxView;
    let map!: (p: Pt) => Pt;
    let vpsPx!: Pt[];
    let boxPx!: Pt[];
    // Resample until every true vanishing point lies well clear of the box: a point touching
    // a corner cannot be judged by extending the edges, and its label would overlap the box.
    for (let attempt = 0; attempt < 60; attempt++) {
      view = two
        ? boxView(
            [r.real(-0.3, 0.3, 2), r.sign() * r.real(0.8, 1.3, 2), r.real(3.5, 5, 1)],
            [r.real(0.6, 0.9, 2), r.real(0.5, 0.8, 2), r.real(0.6, 0.9, 2)],
            r.sign() * r.int(36, 54),
            0,
          )
        : (() => {
            // Keep the vanishing point diagonally clear of the front face, so a side face and the
            // top or underside both show converging edges (neither seen edge-on).
            const hx = r.real(0.5, 0.9, 2);
            const hy = r.real(0.4, 0.8, 2);
            return boxView(
              [r.sign() * (hx + r.real(0.3, 0.7, 2)), r.sign() * (hy + r.real(0.25, 0.6, 2)), r.real(3.5, 5, 1)],
              [hx, hy, r.real(0.6, 1.2, 2)],
              0,
              0,
            );
          })();
      const trueVps = view.vps.filter((v): v is Pt => v !== null);
      map = makeFit([...view.verts, ...trueVps], W, H, 0.82, true);
      vpsPx = trueVps.map(map);
      boxPx = view.verts.map(map);
      const xs = boxPx.map((p) => p[0]);
      const ys = boxPx.map((p) => p[1]);
      const gap = (p: Pt): number =>
        Math.hypot(
          Math.max(Math.min(...xs) - p[0], 0, p[0] - Math.max(...xs)),
          Math.max(Math.min(...ys) - p[1], 0, p[1] - Math.max(...ys)),
        );
      if (vpsPx.every((v) => gap(v) >= 40)) break;
    }
    const target = two ? r.pick(vpsPx) : vpsPx[0]!;
    const bx0 = Math.min(...boxPx.map((p) => p[0])) - 15;
    const bx1 = Math.max(...boxPx.map((p) => p[0])) + 15;
    const by0 = Math.min(...boxPx.map((p) => p[1])) - 15;
    const by1 = Math.max(...boxPx.map((p) => p[1])) + 15;
    const inBox = (p: Pt): boolean => p[0] > bx0 && p[0] < bx1 && p[1] > by0 && p[1] < by1;
    const cands: Pt[] = [target];
    const ok = (p: Pt): boolean =>
      !inBox(p) &&
      p[0] > 25 &&
      p[0] < W - 25 &&
      p[1] > 22 &&
      p[1] < H - 18 &&
      vpsPx.every((v) => dist(v, p) >= 75) &&
      cands.every((c) => dist(c, p) >= 75);
    // Two decoys on the same horizontal line as the true point (so "on the horizon" is not enough).
    for (let tries = 0; cands.length < 3 && tries < 400; tries++) {
      const p: Pt = [r.int(25, W - 25), target[1]];
      if (ok(p)) cands.push(p);
    }
    for (let tries = 0; cands.length < 4 && tries < 400; tries++) {
      const p: Pt = [r.int(25, W - 25), r.int(22, H - 18)];
      if (ok(p) && Math.abs(p[1] - target[1]) > 40) cands.push(p);
    }
    // Deterministic fallback (rare): corners of the frame.
    const corners: Pt[] = [
      [30, 30],
      [W - 30, 30],
      [30, H - 25],
      [W - 30, H - 25],
    ];
    for (const c of corners) if (cands.length < 4 && ok(c)) cands.push(c);
    // Random labelling: vanishing points tend to lie near the frame edges, so left-to-right
    // lettering would make A and D the likely answers.
    const ordered = r.shuffle([...cands]);
    const body: string[] = [...drawBox(view, map)];
    ordered.forEach((p, i) => {
      body.push(svgDot(p));
      body.push(svgText([p[0] + 8, p[1] - 8], LETTERS[i]!, 'start'));
    });
    const answer = LETTERS[ordered.indexOf(target)]!;
    return {
      stem: two
        ? 'The box below is drawn in two-point perspective. Which labelled point is one of its vanishing points?'
        : 'The box below is drawn in one-point perspective. Which labelled point is its vanishing point?',
      answer,
      distractors: LETTERS.filter((l) => l !== answer),
      fixedOrder: [...LETTERS],
      explanation: two
        ? `Extend each set of parallel horizontal edges of the box: one set meets at one vanishing point and the other set at the second, both on the horizon (eye level). Point ${answer} is where one set meets; the other labelled points lie off these converging lines.`
        : `Extend the receding edges (those running into depth); they all meet at a single point on the horizon, which is point ${answer}. The edges of the front face stay horizontal and vertical.`,
      figure: svgWrap(W, H, body),
    };
  }),

  b.dynamic('eye-level-from-horizon', { difficulty: 1, origin: 'past-paper', tags: ['perspective'] }, (r) => {
    const where = r.pick(['above', 'below', 'through'] as const);
    const hy = r.real(0.5, 0.8, 2);
    const cy = where === 'above' ? hy + r.real(0.35, 1.1, 2) : where === 'below' ? -(hy + r.real(0.35, 1.1, 2)) : r.real(-0.45, 0.45, 2) * hy;
    const view = boxView(
      [r.real(-0.6, 0.6, 2), cy, r.real(4, 6, 1)],
      [r.real(0.5, 0.9, 2), hy, r.real(0.5, 0.9, 2)],
      r.sign() * r.int(28, 62),
      0,
    );
    const W = 420;
    const H = 250;
    const cx = view.verts.reduce((t, p) => t + p[0], 0) / 8;
    const map = makeFit([...view.verts, [cx, 0]], W, H, 0.68, true);
    const yH = map([0, 0])[1];
    const body = [
      svgLine([10, yH], [W - 10, yH], { w: 1.4 }),
      svgText([14, yH - 7], 'HL', 'start'),
      ...drawBox(view, map),
    ];
    const opts = {
      above: 'Its underside is visible, because it is above eye level.',
      below: 'Its top is visible, because it is below eye level.',
      through: 'Neither top nor underside is visible; eye level crosses it.',
      both: 'Both its top and its underside are visible at once.',
    } as const;
    const answer = opts[where];
    return {
      stem: 'A box is drawn in two-point perspective; HL is the horizon line (the viewer\'s eye level). Which statement about the box is correct?',
      answer,
      distractors: Object.values(opts).filter((o) => o !== answer),
      explanation:
        where === 'above'
          ? 'The whole box lies above the horizon, so the viewer looks up at it and sees its underside (a worm\'s-eye view). Top and underside can never both be seen.'
          : where === 'below'
            ? 'The whole box lies below the horizon, so the viewer looks down on it and sees its top (a bird\'s-eye view). Top and underside can never both be seen.'
            : 'The horizon passes through the box, so the eye is between its top and bottom faces: only the side faces are visible.',
      figure: svgWrap(W, H, body),
    };
  }),

  b.dynamic('picture-plane-similar-triangles', { difficulty: 3, tags: ['perspective', 'drawing and painting'] }, (r) => {
    const [p, h, Ht, D] = r.pick(PICTURE_PLANE);
    const obj = r.pick(['tower', 'tree', 'flagpole', 'minaret', 'water tank']);
    const { answer, distractors } = numericOptions(r, {
      correct: h,
      wrong: [10 * h, (p * D) / Ht, h / 10],
      format: (x) => q$(num(x, { dp: 1 }), U.cm), // keeps e.g. 312.5 from showing as 313
    });
    return {
      stem: tex`An artist traces a scene on an upright sheet of glass held $${p}\,\mathrm{cm}$ in front of one eye. A ${obj} $${Ht}\,\mathrm{m}$ tall stands $${D}\,\mathrm{m}$ away, parallel to the glass. The traced height of the ${obj} on the glass is:`,
      answer,
      distractors,
      explanation: tex`Rays from the top and bottom of the ${obj} to the eye form similar triangles: $\dfrac{h}{p} = \dfrac{H}{D}$, so $h = \dfrac{H \times p}{D} = \dfrac{${Ht} \times ${p}}{${D}} = ${num(h)}\,\mathrm{cm}$ (the metres cancel, leaving the units of $p$). Apparent size falls in proportion to distance.`,
    };
  }),

  // ------------------------------------------------------------------ solids and geometry
  b.dynamic('euler-formula', { difficulty: 1, origin: 'past-paper', tags: ['shapes and geometry'] }, (r) => {
    const V = r.int(5, 16);
    const F = r.int(Math.max(4, Math.ceil(V / 2) + 2), Math.min(20, 2 * V - 4));
    const E = V + F - 2;
    const ask = r.pick(['E', 'F', 'V'] as const);
    let correct: number;
    let wrong: number[];
    let given: string;
    let work: string;
    if (ask === 'E') {
      correct = E;
      wrong = [V + F, V + F + 2, V + F - 4];
      given = `${F} faces and ${V} vertices`;
      work = tex`$E = V + F - 2 = ${V} + ${F} - 2 = ${E}$`;
    } else if (ask === 'F') {
      correct = F;
      wrong = [E - V, E - V - 2, E + V - 2];
      given = `${E} edges and ${V} vertices`;
      work = tex`$F = E - V + 2 = ${E} - ${V} + 2 = ${F}$`;
    } else {
      correct = V;
      wrong = [E - F, E - F - 2, E + F - 2];
      given = `${E} edges and ${F} faces`;
      work = tex`$V = E - F + 2 = ${E} - ${F} + 2 = ${V}$`;
    }
    const word = { E: 'edges', F: 'faces', V: 'vertices' }[ask];
    const { answer, distractors } = numericOptions(r, { correct, wrong, format: (x) => `$${x}$` });
    return {
      stem: `A convex polyhedron (a closed solid with flat faces) has ${given}. How many ${word} does it have?`,
      answer,
      distractors,
      explanation: tex`Euler's formula for convex polyhedra: $V - E + F = 2$. Hence ${work}.`,
    };
  }),

  b.dynamic('prism-pyramid-counts', { difficulty: 1, origin: 'past-paper', tags: ['shapes and geometry'] }, (r) => {
    const prism = r.chance(0.5);
    const n = prism ? r.pick([3, 5, 6, 7, 8, 9, 10]) : r.pick([3, 4, 5, 6, 7, 8, 9, 10]);
    const counts = prism ? { V: 2 * n, E: 3 * n, F: n + 2 } : { V: n + 1, E: 2 * n, F: n + 1 };
    const other = prism ? { V: n + 1, E: 2 * n, F: n + 1 } : { V: 2 * n, E: 3 * n, F: n + 2 };
    const ask = r.pick(['V', 'E', 'F'] as const);
    const word = { V: 'vertices (corners)', E: 'edges', F: 'faces' }[ask];
    const name = `${ADJ[n]} ${prism ? 'prism' : 'pyramid'}`;
    const { answer, distractors } = numericOptions(r, {
      correct: counts[ask],
      wrong: [other[ask], ...Object.values(counts), ask === 'E' ? (prism ? 2 * n : n) : counts[ask] + 1],
      format: (x) => `$${x}$`,
    });
    const why = prism
      ? `A prism whose base has ${n} sides has two such ends joined by ${n} rectangles: V = 2n = ${2 * n}, E = 3n = ${3 * n}, F = n + 2 = ${n + 2}.`
      : `A pyramid whose base has ${n} sides has the base plus ${n} triangles meeting at the apex: V = n + 1 = ${n + 1}, E = 2n = ${2 * n}, F = n + 1 = ${n + 1}.`;
    return {
      stem: `How many ${word} does a ${name} have?`,
      answer,
      distractors,
      explanation: `${why} Check with Euler: ${counts.V} - ${counts.E} + ${counts.F} = 2.`,
    };
  }),

  b.dynamic('cross-section-of-solid', { difficulty: 2, tags: ['shapes and geometry', 'form-making'] }, (r) => {
    const s = r.pick(SECTIONS);
    return { stem: s.q, answer: s.a, distractors: r.sample(s.x, 3), explanation: s.e };
  }),

  b.dynamic('net-to-solid', { difficulty: 1, tags: ['shapes and geometry', 'form-making'] }, (r) => {
    const kind = r.pick(['prism', 'pyramid', 'cube', 'cylinder', 'cone'] as const);
    const shapes: NetShape[] = [];
    let answer: string;
    let pool: string[];
    let why: string;
    const prismName = (k: number): string => (k === 4 ? 'Cuboid' : `${cap(ADJ[k]!)} prism`);
    const pyrName = (k: number): string => `${cap(ADJ[k]!)} pyramid`;
    if (kind === 'prism') {
      const n = r.pick([3, 5, 6]);
      const Hh = r.real(1.3, 2.2, 1);
      for (let k = 0; k < n; k++) {
        shapes.push({ kind: 'poly', pts: [[k, 0], [k + 1, 0], [k + 1, Hh], [k, Hh]] });
      }
      const top = r.int(0, n - 1);
      const bottom = r.int(0, n - 1);
      shapes.push({ kind: 'poly', pts: polygonOnEdge([top, 0], [top + 1, 0], n, [0, -1]) });
      shapes.push({ kind: 'poly', pts: polygonOnEdge([bottom, Hh], [bottom + 1, Hh], n, [0, 1]) });
      answer = prismName(n);
      pool = [pyrName(n), prismName(n + 1), pyrName(n + 1), prismName(n === 3 ? 5 : n - 1)];
      why = `${n} rectangles in a row plus two identical ${POLY_NAME[n]}s fold into a prism with ${POLY_NAME[n]} ends.`;
    } else if (kind === 'pyramid') {
      const n = r.pick([3, 4, 5, 6]);
      const R = 1 / (2 * Math.sin(Math.PI / n));
      const rot = r.int(0, 359) * DEG;
      const base: Pt[] = [];
      for (let k = 0; k < n; k++) base.push([R * Math.cos(rot + (2 * Math.PI * k) / n), R * Math.sin(rot + (2 * Math.PI * k) / n)]);
      shapes.push({ kind: 'poly', pts: base });
      // Each triangle's height must exceed the base's apothem, or the faces cannot meet at an
      // apex (a hexagon's apothem is 0.87, so a fixed 0.8-1.15 range could draw an unfoldable
      // net). Ranges also keep the triangle sides visibly off the extended base edges.
      const t = n === 6 ? r.real(1.1, 1.4, 2) : n === 5 ? r.real(0.8, 1.05, 2) : r.real(0.8, 1.15, 2);
      for (let k = 0; k < n; k++) {
        const a = base[k]!;
        const c = base[(k + 1) % n]!;
        const m: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
        const len = Math.hypot(m[0], m[1]);
        shapes.push({ kind: 'poly', pts: [a, c, [m[0] + (t * m[0]) / len, m[1] + (t * m[1]) / len]] });
      }
      answer = pyrName(n);
      pool = [prismName(n === 4 ? 3 : n), pyrName(n + 1), prismName(n + 1), pyrName(n === 3 ? 5 : n - 1)].filter((x) => x !== answer);
      why = `A ${POLY_NAME[n]} base with a triangle on each of its ${n} edges folds up so the triangles meet at one apex: a ${ADJ[n]} pyramid.`;
    } else if (kind === 'cube') {
      const net = r.pick(CUBE_NETS);
      const flip = r.chance(0.5);
      for (const [cx, cy] of net) {
        const x = flip ? 3 - cx : cx;
        shapes.push({ kind: 'poly', pts: [[x, cy], [x + 1, cy], [x + 1, cy + 1], [x, cy + 1]] });
      }
      answer = 'Cube';
      pool = ['Square pyramid', 'Triangular prism', 'Octahedron', 'Pentagonal prism'];
      why = 'Six equal squares, arranged so that no two overlap when folded, make a cube.';
    } else if (kind === 'cylinder') {
      const L = 2 * Math.PI;
      const Hh = r.real(1.6, 3, 1);
      shapes.push({ kind: 'poly', pts: [[0, 0], [L, 0], [L, Hh], [0, Hh]] });
      shapes.push({ kind: 'circle', c: [r.real(1, L - 1, 2), -1], r: 1 });
      shapes.push({ kind: 'circle', c: [r.real(1, L - 1, 2), Hh + 1], r: 1 });
      answer = 'Cylinder';
      pool = ['Cone', 'Triangular prism', 'Square pyramid', 'Hexagonal prism'];
      why = 'A rectangle that rolls into a tube, closed by two equal circles, makes a cylinder (the rectangle\'s length equals the circles\' circumference).';
    } else {
      const ratio = r.pick([0.3, 0.35, 0.4, 0.45, 0.5]);
      const Ls = 3;
      const rad = Ls * ratio;
      const half = Math.PI * ratio;
      const spin = r.pick([90, 270]) * DEG;
      const sector: Pt[] = [[0, 0]];
      for (let i = 0; i <= 40; i++) {
        const a = spin - half + (2 * half * i) / 40;
        sector.push([Ls * Math.cos(a), Ls * Math.sin(a)]);
      }
      shapes.push({ kind: 'poly', pts: sector });
      shapes.push({ kind: 'circle', c: [(Ls + rad) * Math.cos(spin), (Ls + rad) * Math.sin(spin)], r: rad });
      answer = 'Cone';
      pool = ['Cylinder', 'Square pyramid', 'Triangular pyramid', 'Triangular prism'];
      why = 'A sector of a circle curls into a cone\'s curved surface, and the small circle closes its base.';
    }
    return {
      stem: 'The net below is folded along its edges (curved parts are rolled). Which solid does it make?',
      answer,
      distractors: pick3(r, [...new Set(pool)], answer),
      explanation: why,
      figure: renderNet(shapes),
    };
  }),

  b.dynamic('regular-polygon-angles', { difficulty: 1, tags: ['shapes and geometry', 'drawing and painting'] }, (r) => {
    const n = r.pick([5, 6, 8, 9, 10, 12, 15, 18, 20]);
    const mode = r.pick(['interior', 'exterior', 'sum'] as const);
    const name = POLY_NAME[n] ? `regular ${POLY_NAME[n]}` : `regular ${n}-sided polygon`;
    const fmt = (x: number): string => `$${num(x, { dp: 2 })}^{\\circ}$`;
    let correct: number;
    let wrong: number[];
    let stem: string;
    let explanation: string;
    if (mode === 'interior') {
      correct = interior(n);
      wrong = [360 / n, 180 * (n - 2), (180 * (n - 1)) / n];
      stem = `While setting out a ${name} for a tile pattern, a designer needs each interior angle. It is:`;
      explanation = tex`Interior angle $= \dfrac{(n-2) \times 180^{\circ}}{n} = \dfrac{(${n}-2) \times 180^{\circ}}{${n}} = ${num(correct, { dp: 2 })}^{\circ}$.`;
    } else if (mode === 'exterior') {
      correct = 360 / n;
      wrong = [interior(n), 180 / n, 720 / n];
      stem = `Each exterior angle (the turn at each corner when tracing the outline) of a ${name} is:`;
      explanation = tex`The exterior angles of any convex polygon add up to $360^{\circ}$, so each one is $\dfrac{360^{\circ}}{${n}} = ${num(correct, { dp: 2 })}^{\circ}$.`;
    } else {
      correct = 180 * (n - 2);
      wrong = [180 * n, 180 * (n - 1), 360 * n];
      stem = `The interior angles of a ${name} add up to:`;
      explanation = tex`Sum $= (n-2) \times 180^{\circ} = (${n}-2) \times 180^{\circ} = ${correct}^{\circ}$ (the polygon splits into $n-2$ triangles).`;
    }
    const { answer, distractors } = numericOptions(r, { correct, wrong, format: fmt });
    return { stem, answer, distractors, explanation };
  }),

  b.dynamic('regular-tessellation', { difficulty: 2, origin: 'past-paper', tags: ['shapes and geometry'] }, (r) => {
    const tilers = [3, 4, 6];
    const non = [5, 7, 8, 9, 10, 12];
    const name = (n: number): string => (n === 3 ? 'Equilateral triangle' : n === 4 ? 'Square' : `Regular ${POLY_NAME[n]}`);
    const negative = r.chance(0.35);
    if (negative) {
      const a = r.pick(non);
      return {
        stem: 'Copies of a single regular polygon are to tile a flat floor with no gaps or overlaps. Which polygon can **not** do this?',
        answer: name(a),
        distractors: tilers.map(name),
        explanation: tex`A regular polygon tiles alone only if its interior angle divides $360^{\circ}$ exactly. The ${POLY_NAME[a]}'s angle is $${num(interior(a), { dp: 2 })}^{\circ}$, and $360 \div ${num(interior(a), { dp: 2 })}$ is not a whole number. Triangles ($60^{\circ}$, 6 per point), squares ($90^{\circ}$, 4) and hexagons ($120^{\circ}$, 3) all work.`,
      };
    }
    const a = r.pick(tilers);
    return {
      stem: 'Copies of a single regular polygon are to tile a flat floor with no gaps or overlaps. Which polygon can do this?',
      answer: name(a),
      distractors: r.sample(non, 3).map(name),
      explanation: tex`A regular polygon tiles alone only if its interior angle divides $360^{\circ}$ exactly. The ${POLY_NAME[a]} has interior angle $${interior(a)}^{\circ}$ and $360 \div ${interior(a)} = ${360 / interior(a)}$ copies meet at each point. Only triangles, squares and hexagons work; e.g. a pentagon's $108^{\circ}$ leaves a gap.`,
    };
  }),

  b.dynamic('semi-regular-vertex', { difficulty: 3, tags: ['shapes and geometry'] }, (r) => {
    const config = r.pick(VERTEX_CONFIGS);
    const drop = r.int(0, config.length - 1);
    const missing = config[drop]!;
    const known = config.filter((_, i) => i !== drop);
    const sum = known.reduce((t, n) => t + interior(n), 0);
    const answer = SINGULAR[missing]!.replace(/^an? /, '');
    const pool = [3, 4, 5, 6, 8, 10, 12].filter((n) => n !== missing).map((n) => (n === 3 ? 'equilateral triangle' : n === 4 ? 'square' : `regular ${POLY_NAME[n]}`));
    const angles = known.map((n) => `${interior(n)}^{\\circ}`).join(' + ');
    return {
      stem: `In a tessellation of regular polygons, ${describePolys(known)} meet at a vertex. Exactly one more regular polygon completes the vertex with no gap. It is a:`,
      answer: cap(answer),
      distractors: r.sample(pool, 3).map(cap),
      explanation: tex`Angles round a point total $360^{\circ}$. Known angles: $${angles} = ${sum}^{\circ}$. The gap is $360^{\circ} - ${sum}^{\circ} = ${360 - sum}^{\circ}$, the interior angle of a ${answer} (vertex type ${config.join('.')}).`,
    };
  }),

  // ------------------------------------------------------------------ human proportions
  b.dynamic('head-height-canon', { difficulty: 1, origin: 'past-paper', tags: ['human proportions', 'drawing and painting'] }, (r) => {
    const canon = r.pick([8, 7.5]);
    const other = canon === 8 ? 7.5 : 8;
    const head = canon === 8 ? r.pick([2, 2.5, 3, 3.5, 4, 4.5, 5, 6]) : r.pick([2, 3, 4, 5, 6]);
    const total = canon * head;
    const findHead = r.chance(0.5);
    const canonTex = canon === 8 ? '8' : tex`7\tfrac{1}{2}`;
    const article = canon === 8 ? 'an' : 'a'; // "an eight-head", "a seven-and-a-half-head"
    if (findHead) {
      const { answer, distractors } = numericOptions(r, {
        correct: head,
        wrong: [
          ...[other, 6, 7, 10, 4].map((c) => total / c).filter((v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9),
          head + 0.5,
          head - 0.5,
          head + 1,
        ],
        format: (x) => q$(x, U.cm),
      });
      return {
        stem: tex`A figure is drawn $${num(total)}\,\mathrm{cm}$ tall using the $${canonTex}$-head canon of proportion. The height of its head (crown to chin) should be:`,
        answer,
        distractors,
        explanation: tex`In ${article} $${canonTex}$-head figure the total height equals $${canonTex}$ head lengths, so head $= ${num(total)} \div ${num(canon)} = ${num(head)}\,\mathrm{cm}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: total,
      wrong: [head * other, head * 6, head * 10],
      format: (x) => q$(x, U.cm),
    });
    return {
      stem: tex`In a figure drawing, the head (crown to chin) is drawn $${num(head)}\,\mathrm{cm}$ long. Using the $${canonTex}$-head canon of proportion, the whole standing figure should be:`,
      answer,
      distractors,
      explanation: tex`Total height $= ${num(canon)} \times \text{head} = ${num(canon)} \times ${num(head)} = ${num(total)}\,\mathrm{cm}$.`,
    };
  }),

  b.dynamic('figure-landmarks', { difficulty: 2, tags: ['human proportions', 'drawing and painting'] }, (r) => {
    const head = r.pick([2, 2.5, 3, 3.5, 4, 4.5, 5, 6]);
    const total = 8 * head;
    const marks = [
      { name: 'chin', k: 1 },
      { name: 'nipple line', k: 2 },
      { name: 'navel', k: 3 },
      { name: 'crotch', k: 4 }, // the stem must not say "midpoint": that gives the answer away
    ] as const;
    const m = r.pick(marks);
    const fromFloor = r.chance(0.5);
    const correct = fromFloor ? total - m.k * head : m.k * head;
    const alt = fromFloor ? m.k * head : total - m.k * head;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [alt, correct + head, correct - head, correct + 2 * head],
      format: (x) => q$(x, U.cm),
    });
    return {
      stem: tex`A standing figure is drawn $${num(total)}\,\mathrm{cm}$ tall using the classical 8-head canon, in which the main landmarks fall at whole head lengths below the crown. How far is the ${m.name} ${fromFloor ? 'above the soles of the feet' : 'below the top of the head'}?`,
      answer,
      distractors,
      explanation: tex`Head $= ${num(total)} \div 8 = ${num(head)}\,\mathrm{cm}$. In the 8-head canon the chin is 1 head below the crown, the nipples 2, the navel 3 and the crotch 4 (half the height). The ${m.name} is ${m.k} head${m.k > 1 ? 's' : ''} down: $${m.k} \times ${num(head)} = ${num(m.k * head)}\,\mathrm{cm}$ below the crown${fromFloor ? tex`, so $${num(total)} - ${num(m.k * head)} = ${num(correct)}\,\mathrm{cm}$ above the feet` : ''}.`,
    };
  }),

  // ------------------------------------------------------------------ scale and enlargement
  b.dynamic('scale-drawing', { difficulty: 1, origin: 'past-paper', tags: ['drawing and painting', 'shapes and geometry'] }, (r) => {
    const n = r.pick([20, 25, 50, 100, 200, 500]);
    // At 1:25 a half-centimetre length gives 1.125 m or 1.875 m, which 3 s.f. would round.
    const d = r.pick(n === 25 ? [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18] : [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 4.5, 7.5]);
    const real = (d * n) / 100;
    const toReal = r.chance(0.5);
    // Match the object to its size (real lengths run from 0.4 m to 90 m).
    const what = r.pick(
      real < 2.5 ? ['window', 'door', 'table', 'cupboard'] : real < 15 ? ['wall', 'room', 'corridor', 'mural'] : ['courtyard', 'garden', 'boundary wall', 'school building'],
    );
    if (toReal) {
      const { answer, distractors } = numericOptions(r, {
        correct: real,
        wrong: [real * 10, real / 10, d * n, real / 100], // x10 slip, /10 slip, cm not converted, /100 twice
        format: (x) => q$(num(x, { dp: 4 }), U.m),
      });
      return {
        stem: tex`A plan is drawn to a scale of $1 : ${n}$. A ${what} measures $${num(d)}\,\mathrm{cm}$ on the plan. Its real length is:`,
        answer,
        distractors,
        explanation: tex`Real length $= ${num(d)}\,\mathrm{cm} \times ${n} = ${num(d * n)}\,\mathrm{cm} = ${num(real)}\,\mathrm{m}$ (divide by 100 to change cm to m).`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: d,
      wrong: [d * 10, d / 10, d / 100, real * n], // mm slip, x10 slip, metres not converted, multiplied
      format: (x) => q$(num(x, { dp: 4 }), U.cm),
    });
    return {
      stem: tex`A ${what} is $${num(real)}\,\mathrm{m}$ long. On a drawing made to a scale of $1 : ${n}$, it will measure:`,
      answer,
      distractors,
      explanation: tex`Drawing length $= \dfrac{${num(real)}\,\mathrm{m}}{${n}} = \dfrac{${num(real * 100)}\,\mathrm{cm}}{${n}} = ${num(d)}\,\mathrm{cm}$.`,
    };
  }),

  b.dynamic('enlargement-area-volume', { difficulty: 2, origin: 'past-paper', tags: ['drawing and painting', 'form-making'] }, (r) => {
    const mode = r.pick(['area', 'mass', 'model'] as const);
    if (mode === 'area') {
      const k = r.pick([2, 3, 4, 5, 1.5, 2.5]);
      const A = k % 1 === 0 ? r.int(6, 40) : 4 * r.int(2, 12);
      const correct = k * k * A;
      const { answer, distractors } = numericOptions(r, {
        correct,
        wrong: [k * A, k * k * k * A, 2 * k * A, A + k * k], // linear, cubed, doubled, added k^2
        format: (x) => q$(num(x, { dp: 2 }), 'cm^{2}'), // exact: k^3 A can end in .5 or .625
      });
      return {
        stem: tex`A motif with an area of $${A}\,\mathrm{cm^{2}}$ is enlarged so that every length becomes $${num(k)}$ times as long. The area of the enlarged motif is:`,
        answer,
        distractors,
        explanation: tex`Areas scale by the square of the length factor: $A' = k^2 A = (${num(k)})^2 \times ${A} = ${num(correct)}\,\mathrm{cm^{2}}$.`,
      };
    }
    const k = r.pick([2, 3, 4, 5]);
    if (mode === 'mass') {
      const m = r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4]);
      const correct = k ** 3 * m;
      const { answer, distractors } = numericOptions(r, {
        correct,
        wrong: [k * m, k * k * m, 3 * k * m, 2 * k * m],
        format: (x) => q$(num(x, { dp: 2 }), U.kg), // 5^3 x 2.5 = 312.5 must not show as 313
      });
      return {
        stem: tex`A solid clay maquette has a mass of $${num(m)}\,\mathrm{kg}$. A full-size solid version is made in the same clay with every dimension $${k}$ times as long. Its mass will be:`,
        answer,
        distractors,
        explanation: tex`Volume (and so mass, for the same material) scales by the cube of the length factor: $m' = k^3 m = ${k}^3 \times ${num(m)} = ${num(correct, { dp: 2 })}\,\mathrm{kg}$.`,
      };
    }
    const mm = r.pick([0.5, 1, 1.5, 2, 3, 4, 5]);
    const M = mm * k ** 3;
    const { answer, distractors } = numericOptions(r, {
      correct: mm,
      wrong: [M / k, M / (k * k), M / (3 * k)],
      format: (x) => q$(num(x, { dp: 2 }), U.kg),
    });
    return {
      stem: tex`A solid bronze statue has a mass of $${num(M, { dp: 2 })}\,\mathrm{kg}$. A solid bronze model of it is cast at a scale of $1 : ${k}$. The model's mass is:`,
      answer,
      distractors,
      explanation: tex`Each length is $\frac{1}{${k}}$ of full size, so the volume (and mass) is $\left(\frac{1}{${k}}\right)^3 = \frac{1}{${k ** 3}}$ of it: $${num(M, { dp: 2 })} \div ${k ** 3} = ${num(mm)}\,\mathrm{kg}$.`,
    };
  }),

  // ------------------------------------------------------------------ materials
  b.dynamic('clay-shrinkage', { difficulty: 2, tags: ['material properties', 'form-making'] }, (r) => {
    const forward = r.chance(0.5);
    const fmt = (x: number): string => q$(num(x, { dp: 2 }), U.cm);
    if (forward) {
      const s = r.pick([8, 10, 12, 15, 20]);
      const Wet = r.multiple(10, 60, 5);
      const fired = (Wet * (100 - s)) / 100;
      const { answer, distractors } = numericOptions(r, {
        correct: fired,
        wrong: [(Wet * s) / 100, Wet - s, Wet * (1 + s / 100)],
        format: fmt,
      });
      return {
        stem: tex`A freshly made (wet) clay tile is $${Wet}\,\mathrm{cm}$ long. The clay body shrinks $${s}\%$ in length from wet to fired. The length of the fired tile is:`,
        answer,
        distractors,
        explanation: tex`Fired length $= \text{wet} \times \left(1 - \frac{${s}}{100}\right) = ${Wet} \times ${num(1 - s / 100, { dp: 2 })} = ${num(fired, { dp: 2 })}\,\mathrm{cm}$. (Clay shrinks as water leaves it in drying and as particles fuse in firing.)`,
      };
    }
    const s = r.pick([10, 20, 25]);
    const Wet = r.pick([20, 24, 28, 30, 32, 36, 40, 44, 48, 50, 60]);
    const fired = (Wet * (100 - s)) / 100;
    const { answer, distractors } = numericOptions(r, {
      correct: Wet,
      wrong: [fired * (1 + s / 100), fired * (1 - s / 100), fired + s],
      format: fmt,
    });
    return {
      stem: tex`A potter needs a fired tile exactly $${num(fired, { dp: 2 })}\,\mathrm{cm}$ long. The clay shrinks $${s}\%$ of its wet length on drying and firing. How long must the wet tile be made?`,
      answer,
      distractors,
      explanation: tex`Fired $= \text{wet} \times (1 - ${num(s / 100, { dp: 2 })})$, so wet $= \dfrac{${num(fired, { dp: 2 })}}{${num(1 - s / 100, { dp: 2 })}} = ${Wet}\,\mathrm{cm}$. Adding ${s}% to the fired size ($${num(fired * (1 + s / 100), { dp: 2 })}\,\mathrm{cm}$) is wrong because the shrinkage is a percentage of the larger, wet length.`,
    };
  }),

  // ------------------------------------------------------------------ fixed items
  ...b.mcqs([
    {
      id: 'cube-section-impossible',
      d: 1,
      t: ['shapes and geometry', 'form-making'],
      q: 'A solid cube is cut once by a flat plane. The cut face can **not** be a:',
      a: 'Circle',
      x: ['Square', 'Equilateral triangle', 'Regular hexagon'],
      e: 'Every plane section of a cube is a polygon whose sides lie on the flat faces, so it can never be curved. Squares, equilateral triangles and regular hexagons are all possible sections.',
    },
    {
      id: 'compass-hexagon-construction',
      d: 1,
      t: ['shapes and geometry', 'drawing and painting'],
      q: 'Keeping the compass opening equal to the radius of a circle, arcs are stepped round its circumference from any starting point. The marks divide the circle into:',
      a: '6 equal parts, giving a regular hexagon',
      x: ['5 equal parts, giving a regular pentagon', '8 equal parts, giving a regular octagon', '4 equal parts, giving a square'],
      e: 'A chord equal to the radius forms an equilateral triangle with the centre, so it subtends 60° and 360° ÷ 60° = 6 marks fit exactly: a regular hexagon.',
    },
    {
      id: 'football-panel-seams',
      d: 2,
      t: ['shapes and geometry'],
      q: 'A football is stitched from 12 regular pentagons and 20 regular hexagons, and every seam (edge) is shared by exactly two panels. How many seams are there?',
      a: '$90$',
      x: ['$180$', '$60$', '$32$'],
      e: tex`Count panel edges: $12 \times 5 + 20 \times 6 = 180$. Each seam is counted twice, so $E = 180 \div 2 = 90$. (Check: $V = 180 \div 3 = 60$ and $60 - 90 + 32 = 2$.)`,
    },
    {
      id: 'painted-cube-two-faces',
      d: 2,
      o: 'past-paper',
      t: ['shapes and geometry', 'form-making'],
      q: 'A 5 cm clay cube is painted on all its faces and then cut into 1 cm cubes. How many small cubes have exactly two painted faces?',
      a: '$36$',
      x: ['$54$', '$8$', '$27$'],
      e: tex`Two-face cubes lie along the edges but not at the corners: each of the 12 edges has $5 - 2 = 3$ of them, so $12 \times 3 = 36$. (54 have one painted face, 8 corners have three, 27 have none.)`,
    },
    {
      id: 'plaster-cylinder-volume',
      d: 2,
      t: ['form-making', 'material properties'],
      q: tex`A solid plaster cylinder is cast in a mould of internal diameter $14\,\mathrm{cm}$ and height $10\,\mathrm{cm}$. Taking $\pi = \frac{22}{7}$, the volume of plaster needed (ignoring waste) is:`,
      a: tex`$1540\,\mathrm{cm^{3}}$`,
      x: [tex`$6160\,\mathrm{cm^{3}}$`, tex`$440\,\mathrm{cm^{3}}$`, tex`$3080\,\mathrm{cm^{3}}$`],
      e: tex`$V = \pi r^2 h = \frac{22}{7} \times 7^2 \times 10 = 1540\,\mathrm{cm^{3}}$. Using the diameter as the radius gives $6160$; $\pi d h = 440$ is the curved surface area, not a volume.`,
    },
    {
      id: 'frustum-edge-count',
      d: 2,
      t: ['shapes and geometry', 'form-making'],
      q: 'The top of a square-based pyramid is sliced off by a cut parallel to its base, leaving a frustum. How many edges does the frustum have?',
      a: '$12$',
      x: ['$8$', '$10$', '$6$'],
      e: tex`The frustum has two square faces (top and base) joined by 4 trapezia: $4 + 4$ edges round the squares plus 4 slanting edges $= 12$. Check: $V - E + F = 8 - 12 + 6 = 2$.`,
    },
    {
      id: 'truncated-cube-vertices',
      d: 3,
      t: ['shapes and geometry', 'form-making'],
      q: 'All 8 corners of a wooden cube are sliced off with small flat cuts that do not meet one another. How many vertices does the new solid have?',
      a: '$24$',
      x: ['$16$', '$32$', '$14$'],
      e: tex`Each corner is replaced by a small triangular face with 3 new vertices: $8 \times 3 = 24$. The solid has $6 + 8 = 14$ faces and $12 + 24 = 36$ edges, and $24 - 36 + 14 = 2$.`,
    },
  ]),
]);
