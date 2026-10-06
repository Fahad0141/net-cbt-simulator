import { defineBank } from '@/engine/authoring';
import type { Rng } from '@/engine/rng';
import {
  type Fraction,
  frac,
  numericOptions,
  paren,
  pickDistractors,
  q$,
  radianTex,
  signedSum,
  simplifySurd,
  statementQuestion,
  tex,
  U,
} from '@/engine/helpers';

type V3 = [number, number, number];

/** Wraps LaTeX in `$...$`. */
const m = (latex: string): string => `$${latex}$`;

/** `3\hat{i} - 2\hat{j} + \hat{k}` from components (numbers or fractions). */
const v3 = (x: number | Fraction, y: number | Fraction, z: number | Fraction): string => {
  const body = signedSum([
    [x, '\\hat{i}'],
    [y, '\\hat{j}'],
    [z, '\\hat{k}'],
  ]);
  return body === '0' ? '\\vec{0}' : body; // the zero vector, not the scalar 0
};
const vt = (v: V3): string => v3(v[0], v[1], v[2]);

const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const sq = (a: V3): number => dot(a, a);
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (k: number, a: V3): V3 => [k * a[0], k * a[1], k * a[2]];
const pt = (p: V3): string => `(${p[0]}, ${p[1]}, ${p[2]})`;
const det3 = (a: V3, b: V3, c: V3): number => dot(a, cross(b, c));

/** A rational number as LaTeX (`\frac{3}{4}`, `-2`). */
const fr = (n: number, d = 1): string => frac(n, d).toTex();

/** LaTeX for sqrt(radicand) / divisor in simplest form: `2\sqrt{3}`, `\frac{\sqrt{14}}{2}`, `\frac{5}{2}`. */
function rootOver(radicand: number, divisor = 1): string {
  if (radicand === 0) return '0';
  const { c, r } = simplifySurd(1, radicand);
  const f = frac(c, divisor);
  if (r === 1) return f.toTex();
  const top = f.n === 1 ? `\\sqrt{${r}}` : `${f.n}\\sqrt{${r}}`;
  return f.d === 1 ? top : `\\frac{${top}}{${f.d}}`;
}

/** Integer vectors with integer length: [x, y, z, |v|]. */
const QUADS: ReadonlyArray<readonly [number, number, number, number]> = [
  [1, 2, 2, 3],
  [2, 3, 6, 7],
  [1, 4, 8, 9],
  [4, 4, 7, 9],
  [2, 6, 9, 11],
  [6, 6, 7, 11],
  [3, 4, 12, 13],
  [2, 5, 14, 15],
  [2, 10, 11, 15],
  [1, 12, 12, 17],
  [8, 9, 12, 17],
];

/** A random integer vector of integer length (random order and signs). */
function quad(r: Rng, maxLen = 17): { v: V3; n: number } {
  const [x, y, z, n] = r.pick(QUADS.filter((q) => q[3] <= maxLen));
  const p = r.shuffle([x, y, z]);
  return { v: [p[0] * r.sign(), p[1] * r.sign(), p[2] * r.sign()] as V3, n };
}

/** Random integer vector with components in [lo, hi]. */
const vec = (r: Rng, lo: number, hi: number): V3 => [r.int(lo, hi), r.int(lo, hi), r.int(lo, hi)];
const nzVec = (r: Rng, lo: number, hi: number): V3 => [r.nonZero(lo, hi), r.nonZero(lo, hi), r.nonZero(lo, hi)];

/** A coefficient written in front of a bracket: 1 is omitted. */
const one = (k: number): string => (k === 1 ? '' : String(k));

/** `k(...)` with a rational coefficient. */
const coefVec = (k: Fraction, body: string): string => (k.equals(1) ? body : `${k.toTex()}(${body})`);

const A = tex`\vec{a}`;
const B = tex`\vec{b}`;
const C = tex`\vec{c}`;

export default defineBank('mathematics', 'vectors', (b) => [
  // ---------------------------------------------------------------- vector algebra
  b.dynamic('magnitude-integer', { difficulty: 1, tags: ['vector algebra'] }, (r) => {
    const { v, n } = quad(r);
    const absSum = Math.abs(v[0]) + Math.abs(v[1]) + Math.abs(v[2]);
    const { answer, distractors } = numericOptions(r, {
      correct: n,
      wrong: [n * n, absSum, Math.abs(v[0] + v[1] + v[2])],
      format: (x) => m(String(x)),
    });
    if (r.chance(0.5)) {
      return {
        stem: tex`The magnitude of the vector $\vec{v} = ${vt(v)}$ is:`,
        answer,
        distractors,
        explanation: tex`$|\vec{v}| = \sqrt{${paren(v[0])}^{2} + ${paren(v[1])}^{2} + ${paren(v[2])}^{2}} = \sqrt{${n * n}} = ${n}$.`,
      };
    }
    const P = vec(r, -5, 5);
    const Q = add(P, v);
    return {
      stem: tex`The distance between the points $P${pt(P)}$ and $Q${pt(Q)}$ is:`,
      answer,
      distractors,
      explanation: tex`$\overrightarrow{PQ} = ${vt(v)}$, so $|\overrightarrow{PQ}| = \sqrt{${paren(v[0])}^{2} + ${paren(v[1])}^{2} + ${paren(v[2])}^{2}} = \sqrt{${n * n}} = ${n}$.`,
    };
  }),

  b.dynamic('unit-vector', { difficulty: 1, origin: 'past-paper', tags: ['unit vectors'] }, (r) => {
    const { v, n } = quad(r);
    const body = vt(v);
    const absSum = Math.abs(v[0]) + Math.abs(v[1]) + Math.abs(v[2]);
    if (r.chance(0.5)) {
      const answer = m(coefVec(frac(1, n), body));
      return {
        stem: tex`The unit vector in the direction of $\vec{v} = ${body}$ is:`,
        answer,
        distractors: pickDistractors(
          answer,
          [
            m(coefVec(frac(1, n * n), body)), // divided by |v|^2
            m(coefVec(frac(1, absSum), body)), // added the components for the length
            m(coefVec(frac(-1, n), body)), // opposite direction
            m(coefVec(frac(n), body)), // multiplied by |v|
          ],
          r,
        ),
        explanation: tex`$|\vec{v}| = \sqrt{${n * n}} = ${n}$, so $\hat{v} = \frac{\vec{v}}{|\vec{v}|} = \frac{1}{${n}}(${body})$.`,
      };
    }
    const k = r.int(2, 6);
    const kk = k === n ? k + 1 : k;
    const answer = m(coefVec(frac(kk, n), body));
    return {
      stem: tex`A vector of magnitude $${kk}$ in the direction of $\vec{v} = ${body}$ is:`,
      answer,
      distractors: pickDistractors(
        answer,
        [
          m(coefVec(frac(1, n), body)), // stopped at the unit vector
          m(coefVec(frac(n, kk), body)), // inverted ratio
          m(coefVec(frac(kk * n), body)), // multiplied by |v|
          m(coefVec(frac(kk, n * n), body)), // divided by |v|^2
        ],
        r,
      ),
      explanation: tex`Required vector $= ${kk}\,\hat{v} = ${kk}\cdot\frac{\vec{v}}{|\vec{v}|} = \frac{${kk}}{${n}}(${body})$, since $|\vec{v}| = \sqrt{${n * n}} = ${n}$.`,
    };
  }),

  b.dynamic('section-formula', { difficulty: 2, tags: ['vector algebra'] }, (r) => {
    const [p, q] = r.pick([
      [1, 2],
      [2, 1],
      [1, 3],
      [3, 1],
      [2, 3],
      [3, 2],
      [3, 4],
    ] as const);
    const s = p + q;
    const Av = vec(r, -4, 5);
    let k = vec(r, -2, 2);
    if (k[0] === 0 && k[1] === 0 && k[2] === 0) k = [1, -1, 1];
    const Bv = add(Av, scale(s, k));
    const P = add(Av, scale(p, k));
    const swapped = add(Av, scale(q, k));
    const answer = m(vt(P));
    const mid = v3(frac(Av[0] + Bv[0], 2), frac(Av[1] + Bv[1], 2), frac(Av[2] + Bv[2], 2));
    const ext = v3(
      frac(p * Bv[0] - q * Av[0], p - q),
      frac(p * Bv[1] - q * Av[1], p - q),
      frac(p * Bv[2] - q * Av[2], p - q),
    );
    return {
      stem: tex`The position vectors of $A$ and $B$ are $${vt(Av)}$ and $${vt(Bv)}$. The position vector of the point dividing $\overline{AB}$ internally in the ratio $${p}:${q}$ is:`,
      answer,
      distractors: pickDistractors(
        answer,
        [
          m(vt(swapped)), // ratio reversed
          m(mid), // midpoint
          m(ext), // external division
          m(vt(scale(p, k))), // forgot to add the position vector of A
        ],
        r,
      ),
      explanation: tex`$\vec{r} = \frac{${one(q)}\vec{a} + ${one(p)}\vec{b}}{${p} + ${q}} = \frac{${one(q)}(${vt(Av)}) + ${one(p)}(${vt(Bv)})}{${s}} = ${vt(P)}$.`,
    };
  }),

  // ---------------------------------------------------------------- dot product
  b.dynamic('dot-product-value', { difficulty: 1, tags: ['dot product'] }, (r) => {
    const a = nzVec(r, -5, 5);
    const c = nzVec(r, -5, 5);
    const d = dot(a, c);
    const { answer, distractors } = numericOptions(r, {
      correct: d,
      wrong: [
        a[0] * c[0] + a[1] * c[1] - a[2] * c[2], // sign slip in the last term
        (a[0] + a[1] + a[2]) * (c[0] + c[1] + c[2]), // multiplied the component sums
        a[0] * c[0] - a[1] * c[1] + a[2] * c[2], // sign slip in the middle term
        -d,
      ],
      format: (x) => m(String(x)),
      allowNegative: true,
      allowZero: true,
    });
    return {
      stem: tex`If $${A} = ${vt(a)}$ and $${B} = ${vt(c)}$, then $${A}\cdot${B}$ equals:`,
      answer,
      distractors,
      explanation: tex`$${A}\cdot${B} = (${a[0]})(${c[0]}) + (${a[1]})(${c[1]}) + (${a[2]})(${c[2]}) = ${a[0] * c[0]} + (${a[1] * c[1]}) + (${a[2] * c[2]}) = ${d}$.`,
    };
  }),

  b.dynamic('perpendicular-or-parallel-k', { difficulty: 1, origin: 'past-paper', tags: ['dot product', 'cross product'] }, (r) => {
    if (r.chance(0.55)) {
      // perpendicular: a1 b1 + a2 b2 + a3 k = 0
      let a: V3 = [1, 2, 1];
      let c: V3 = [1, 1, 1];
      let k = -3;
      for (let i = 0; i < 200; i++) {
        a = [r.nonZero(-5, 5), r.nonZero(-5, 5), r.pick([-4, -3, -2, -1, 1, 2, 3, 4])];
        c = [r.nonZero(-5, 5), r.nonZero(-5, 5), 0];
        const s = a[0] * c[0] + a[1] * c[1];
        if (s !== 0 && s % a[2] === 0 && Math.abs(s / a[2]) <= 12) {
          k = -s / a[2];
          break;
        }
        if (i === 199) {
          a = [2, -1, 3];
          c = [1, 5, 0];
          k = 1;
        }
      }
      const s = a[0] * c[0] + a[1] * c[1];
      const { answer, distractors } = numericOptions(r, {
        correct: k,
        wrong: [-k, s, -s, k + a[2]],
        format: (x) => m(String(x)),
        allowNegative: true,
      });
      return {
        stem: tex`The vectors $${A} = ${vt(a)}$ and $${B} = ${v3(c[0], c[1], 0)} + \lambda\hat{k}$ are perpendicular. The value of $\lambda$ is:`,
        answer,
        distractors,
        explanation: tex`Perpendicular means $${A}\cdot${B} = 0$: $(${a[0]})(${c[0]}) + (${a[1]})(${c[1]}) + (${a[2]})\lambda = 0$, i.e. $${s} + (${a[2]})\lambda = 0$, so $\lambda = ${k}$.`,
      };
    }
    // parallel: b = t a
    const a = nzVec(r, -5, 5);
    const t = r.pick([-3, -2, 2, 3, 4]);
    const k = t * a[2];
    const { answer, distractors } = numericOptions(r, {
      correct: k,
      wrong: [-k, a[2] + t, a[2] * t * t, a[2] - t],
      format: (x) => m(String(x)),
      allowNegative: true,
    });
    return {
      stem: tex`The vectors $${A} = ${vt(a)}$ and $${B} = ${v3(t * a[0], t * a[1], 0)} + \lambda\hat{k}$ are parallel. The value of $\lambda$ is:`,
      answer,
      distractors,
      explanation: tex`Parallel vectors have proportional components: $\frac{${t * a[0]}}{${a[0]}} = \frac{${t * a[1]}}{${a[1]}} = \frac{\lambda}{${a[2]}} = ${t}$, so $\lambda = ${t}(${a[2]}) = ${k}$.`,
    };
  }),

  b.dynamic('angle-between-vectors', { difficulty: 2, origin: 'past-paper', tags: ['dot product'] }, (r) => {
    const base: ReadonlyArray<readonly [V3, V3, number]> = [
      [[1, 1, 0], [0, 1, 1], 60],
      [[1, 1, 0], [1, 0, -1], 60],
      [[1, 1, 0], [1, 0, 0], 45],
      [[1, 0, 1], [0, 0, 1], 45],
      [[1, 1, 0], [0, -1, 1], 120],
      [[1, -1, 0], [0, 1, 1], 120],
      [[-1, 1, 0], [1, 0, 0], 135],
      [[1, 0, -1], [0, 0, 1], 135],
      [[1, 1, 1], [1, 1, -2], 90],
      [[1, 2, 2], [2, 1, -2], 90],
      [[2, 1, -2], [2, -2, 1], 90],
    ];
    const [u0, w0, ang] = r.pick(base);
    const COS: Record<number, string> = {
      45: tex`\frac{1}{\sqrt{2}}`,
      60: tex`\frac{1}{2}`,
      90: '0',
      120: tex`-\frac{1}{2}`,
      135: tex`-\frac{1}{\sqrt{2}}`,
    };
    const perm = r.shuffle([0, 1, 2]);
    const signs = [r.sign(), r.sign(), r.sign()];
    const ka = r.int(1, 3);
    const kb = r.int(1, 3);
    const tr = (v: V3, k: number): V3 =>
      [0, 1, 2].map((i) => k * signs[i]! * v[perm[i]!]!) as V3;
    const a = tr(u0, ka);
    const c = tr(w0, kb);
    const d = dot(a, c);
    const all = [30, 45, 60, 90, 120, 135, 150];
    const supp = 180 - ang;
    const others = r.shuffle(all.filter((x) => x !== ang && x !== supp));
    const answer = m(radianTex(ang));
    const distractors = pickDistractors(answer, [supp, ...others].map((x) => m(radianTex(x))));
    return {
      stem: tex`The angle between the vectors $${A} = ${vt(a)}$ and $${B} = ${vt(c)}$ is:`,
      answer,
      distractors,
      explanation: tex`$\cos\theta = \frac{${A}\cdot${B}}{|${A}||${B}|} = \frac{${d}}{\sqrt{${sq(a)}}\,\sqrt{${sq(c)}}} = ${COS[ang]}$, so $\theta = ${radianTex(ang)}$.`,
    };
  }),

  b.dynamic('projection-along', { difficulty: 2, origin: 'past-paper', tags: ['projection', 'dot product'] }, (r) => {
    let qa = quad(r, 13);
    let qb = quad(r, 13);
    for (let i = 0; i < 50 && (dot(qa.v, qb.v) === 0 || qa.n === qb.n); i++) {
      qa = quad(r, 13);
      qb = quad(r, 13);
    }
    const a = qa.v;
    const c = qb.v;
    const d = dot(a, c);
    const answer = m(fr(d, qb.n));
    return {
      stem: tex`The projection of $${A} = ${vt(a)}$ along $${B} = ${vt(c)}$ is:`,
      answer,
      distractors: pickDistractors(
        answer,
        [
          m(fr(d, qa.n)), // divided by |a| instead of |b|
          m(fr(d, qb.n * qb.n)), // divided by |b|^2
          m(String(d)), // forgot to divide
          m(fr(-d, qb.n)), // sign slip
        ],
        r,
      ),
      explanation: tex`Projection of $${A}$ along $${B}$ $= \frac{${A}\cdot${B}}{|${B}|}$. Here $${A}\cdot${B} = ${d}$ and $|${B}| = \sqrt{${qb.n * qb.n}} = ${qb.n}$, so the projection is $${fr(d, qb.n)}$.`,
    };
  }),

  b.dynamic('lagrange-identity', { difficulty: 2, tags: ['dot product', 'cross product'] }, (r) => {
    const [x, y, h] = r.pick([
      [3, 4, 5],
      [4, 3, 5],
      [5, 12, 13],
      [12, 5, 13],
      [8, 15, 17],
      [15, 8, 17],
      [6, 8, 10],
      [8, 6, 10],
    ] as const);
    const k = r.int(1, 2);
    const prod = h * k;
    const factors = [1, 2, 3, 4, 5, 6, 8, 10, 12, 13, 17].filter((f) => prod % f === 0 && f > 1 && f < prod);
    const p = factors.length ? r.pick(factors) : 1;
    const q = prod / p;
    const dt = x * k * r.sign();
    const cr = y * k;
    const { answer, distractors } = numericOptions(r, {
      correct: cr,
      wrong: [prod - Math.abs(dt), cr * cr, prod + Math.abs(dt), Math.abs(dt)],
      format: (v) => m(String(v)),
    });
    return {
      stem: tex`If $|${A}| = ${p}$, $|${B}| = ${q}$ and $${A}\cdot${B} = ${dt}$, then $|${A}\times${B}|$ equals:`,
      answer,
      distractors,
      explanation: tex`$|${A}\times${B}|^{2} + (${A}\cdot${B})^{2} = |${A}|^{2}|${B}|^{2}$, so $|${A}\times${B}|^{2} = ${p * p}(${q * q}) - ${dt * dt} = ${prod * prod - dt * dt}$ and $|${A}\times${B}| = ${cr}$.`,
    };
  }),

  b.dynamic('magnitude-of-sum', { difficulty: 2, tags: ['dot product', 'vector algebra'] }, (r) => {
    const p = r.int(2, 6);
    let q = r.int(2, 6);
    if (q === p) q = p === 6 ? 3 : p + 1;
    const ang = r.pick([60, 120]);
    const cos = ang === 60 ? 1 : -1; // 2 cos(theta) as an integer
    const plus = r.chance(0.5);
    const sgn = plus ? 1 : -1;
    const V = p * p + q * q + sgn * cos * p * q;
    const Vother = p * p + q * q - sgn * cos * p * q;
    const op = plus ? '+' : '-';
    const answer = m(rootOver(V));
    return {
      stem: tex`If $|${A}| = ${p}$, $|${B}| = ${q}$ and the angle between $${A}$ and $${B}$ is $${radianTex(ang)}$, then $|${A} ${op} ${B}|$ equals:`,
      answer,
      distractors: pickDistractors(
        answer,
        [
          m(rootOver(Vother)), // used the wrong sign of cos
          m(rootOver(p * p + q * q)), // ignored the angle
          m(String(plus ? p + q : Math.abs(p - q))), // added magnitudes directly
          m(String(V)), // forgot the square root
        ],
        r,
      ),
      explanation: tex`$|${A} ${op} ${B}|^{2} = |${A}|^{2} + |${B}|^{2} ${op} 2|${A}||${B}|\cos\theta = ${p * p} + ${q * q} ${op} 2(${p})(${q})(${ang === 60 ? '' : '-'}\tfrac{1}{2}) = ${V}$, so $|${A} ${op} ${B}| = ${rootOver(V)}$.`,
    };
  }),

  b.dynamic('work-done-by-force', { difficulty: 1, tags: ['dot product'] }, (r) => {
    let F = nzVec(r, -4, 5);
    let P = vec(r, -3, 4);
    let Q = vec(r, -3, 4);
    let W = dot(F, sub(Q, P));
    for (let i = 0; i < 100 && (W <= 0 || dot(F, Q) === W); i++) {
      F = nzVec(r, -4, 5);
      P = vec(r, -3, 4);
      Q = vec(r, -3, 4);
      W = dot(F, sub(Q, P));
    }
    if (W <= 0) {
      F = [2, 3, 1];
      P = [1, 0, 2];
      Q = [3, 2, 1];
      W = dot(F, sub(Q, P));
    }
    const d = sub(Q, P);
    const { answer, distractors } = numericOptions(r, {
      correct: W,
      wrong: [dot(F, Q), -W, dot(F, add(P, Q)), dot(F, P)],
      format: (x) => q$(x, U.J),
      allowNegative: true,
      allowZero: true,
    });
    return {
      stem: tex`A force $\vec{F} = ${vt(F)}$ (in newtons) moves a particle from $P${pt(P)}$ to $Q${pt(Q)}$ (in metres). The work done is:`,
      answer,
      distractors,
      explanation: tex`$\vec{d} = \overrightarrow{PQ} = ${vt(d)}$, so $W = \vec{F}\cdot\vec{d} = (${F[0]})(${d[0]}) + (${F[1]})(${d[1]}) + (${F[2]})(${d[2]}) = ${W}\,\mathrm{J}$.`,
    };
  }),

  // ---------------------------------------------------------------- cross product
  b.dynamic('cross-product-components', { difficulty: 1, tags: ['cross product'] }, (r) => {
    let a = vec(r, -4, 4);
    let c = vec(r, -4, 4);
    let x = cross(a, c);
    for (let i = 0; i < 200 && (x[0] === 0 || x[1] === 0 || x[2] === 0); i++) {
      a = vec(r, -4, 4);
      c = vec(r, -4, 4);
      x = cross(a, c);
    }
    if (x[0] === 0 || x[1] === 0 || x[2] === 0) {
      a = [1, 2, -1];
      c = [3, -1, 2];
      x = cross(a, c);
    }
    const answer = m(vt(x));
    return {
      stem: tex`If $${A} = ${vt(a)}$ and $${B} = ${vt(c)}$, then $${A}\times${B}$ is:`,
      answer,
      distractors: pickDistractors(
        answer,
        [
          m(v3(x[0], -x[1], x[2])), // forgot the minus sign on the j-cofactor
          m(v3(-x[0], -x[1], -x[2])), // computed b x a
          m(v3(x[0], x[1], -x[2])), // slip in the k-cofactor
          m(v3(-x[0], x[1], x[2])), // slip in the i-cofactor
        ],
        r,
      ),
      explanation: tex`$${A}\times${B} = \begin{vmatrix} \hat{i} & \hat{j} & \hat{k} \\ ${a[0]} & ${a[1]} & ${a[2]} \\ ${c[0]} & ${c[1]} & ${c[2]} \end{vmatrix} = (${a[1] * c[2]} - (${a[2] * c[1]}))\hat{i} - (${a[0] * c[2]} - (${a[2] * c[0]}))\hat{j} + (${a[0] * c[1]} - (${a[1] * c[0]}))\hat{k} = ${vt(x)}$.`,
    };
  }),

  // ---------------------------------------------------------------- area and volume
  b.dynamic('area-from-sides', { difficulty: 2, origin: 'past-paper', tags: ['area and volume', 'cross product'] }, (r) => {
    let a = vec(r, -3, 3);
    let c = vec(r, -3, 3);
    for (let i = 0; i < 200 && (sq(cross(a, c)) === 0 || dot(a, c) === 0); i++) {
      a = vec(r, -3, 3);
      c = vec(r, -3, 3);
    }
    if (sq(cross(a, c)) === 0 || dot(a, c) === 0) {
      a = [1, 2, 0];
      c = [2, -1, 3];
    }
    const x = cross(a, c);
    const s = sq(x);
    const ab = sq(a) * sq(c);
    const tri = r.chance(0.5);
    const div = tri ? 2 : 1;
    const answer = m(rootOver(s, div));
    const shape = tri ? 'triangle with two sides represented by' : 'parallelogram with adjacent sides';
    return {
      stem: tex`The area of the ${shape} $${A} = ${vt(a)}$ and $${B} = ${vt(c)}$ is:`,
      answer,
      distractors: pickDistractors(
        answer,
        [
          m(rootOver(s, tri ? 1 : 2)), // triangle/parallelogram mix-up
          m(rootOver(ab, div)), // used |a||b| (dropped sin theta)
          m(fr(s, div)), // forgot the square root
          m(tri ? rootOver(s, 4) : rootOver(4 * s)), // halved twice / doubled
        ],
        r,
      ),
      explanation: tex`$${A}\times${B} = ${vt(x)}$, $|${A}\times${B}| = ${rootOver(s) === `\\sqrt{${s}}` ? rootOver(s) : tex`\sqrt{${s}} = ${rootOver(s)}`}$. ${tri ? tex`Area of triangle $= \frac{1}{2}|${A}\times${B}| = ${rootOver(s, 2)}$.` : tex`Area of parallelogram $= |${A}\times${B}| = ${rootOver(s)}$.`}`,
    };
  }),

  b.dynamic('triangle-area-from-points', { difficulty: 3, tags: ['area and volume', 'cross product'] }, (r) => {
    let P = vec(r, -2, 3);
    let Q = vec(r, -2, 3);
    let R = vec(r, -2, 3);
    const candidates = (): string[] => {
      const s = sq(cross(sub(Q, P), sub(R, P)));
      return [
        m(rootOver(s)), // forgot the 1/2
        m(rootOver(sq(cross(Q, R)), 2)), // crossed position vectors instead of sides
        m(fr(s, 2)), // forgot the square root
        m(rootOver(s, 4)), // halved twice
      ];
    };
    const bad = (): boolean => {
      const x = cross(sub(Q, P), sub(R, P));
      if (sq(x) === 0 || sq(cross(Q, R)) === 0 || sq(cross(Q, R)) === sq(x)) return true;
      // Small perfect-square areas (e.g. 1 or 1/2) make several slips print alike; need three distinct.
      const ans = m(rootOver(sq(x), 2));
      return new Set(candidates().filter((c) => c !== ans)).size < 3;
    };
    for (let i = 0; i < 200 && bad(); i++) {
      P = vec(r, -2, 3);
      Q = vec(r, -2, 3);
      R = vec(r, -2, 3);
    }
    if (bad()) {
      P = [1, 0, 1];
      Q = [2, 1, 0];
      R = [0, 2, 3];
    }
    const u = sub(Q, P);
    const w = sub(R, P);
    const x = cross(u, w);
    const s = sq(x);
    const answer = m(rootOver(s, 2));
    return {
      stem: tex`The area of the triangle with vertices $A${pt(P)}$, $B${pt(Q)}$ and $C${pt(R)}$ is:`,
      answer,
      distractors: pickDistractors(answer, candidates(), r),
      explanation: tex`$\overrightarrow{AB} = ${vt(u)}$, $\overrightarrow{AC} = ${vt(w)}$, $\overrightarrow{AB}\times\overrightarrow{AC} = ${vt(x)}$ with magnitude $\sqrt{${s}}$. Area $= \frac{1}{2}|\overrightarrow{AB}\times\overrightarrow{AC}| = ${rootOver(s, 2)}$.`,
    };
  }),

  b.dynamic('area-from-diagonals', { difficulty: 3, tags: ['area and volume', 'cross product'] }, (r) => {
    let d1 = vec(r, -3, 4);
    let d2 = vec(r, -3, 4);
    for (let i = 0; i < 200 && (sq(cross(d1, d2)) === 0 || dot(d1, d2) === 0); i++) {
      d1 = vec(r, -3, 4);
      d2 = vec(r, -3, 4);
    }
    if (sq(cross(d1, d2)) === 0 || dot(d1, d2) === 0) {
      d1 = [3, 1, -2];
      d2 = [1, -3, 4];
    }
    const x = cross(d1, d2);
    const s = sq(x);
    const answer = m(rootOver(s, 2));
    return {
      stem: tex`The diagonals of a parallelogram are $\vec{d}_1 = ${vt(d1)}$ and $\vec{d}_2 = ${vt(d2)}$. Its area is:`,
      answer,
      distractors: pickDistractors(
        answer,
        [
          m(rootOver(s)), // used the side formula |d1 x d2|
          m(rootOver(s, 4)), // halved twice
          m(rootOver(sq(d1) * sq(d2), 2)), // dropped sin theta
          m(fr(s, 2)), // forgot the root
        ],
        r,
      ),
      explanation: tex`For diagonals $\vec{d}_1, \vec{d}_2$: area $= \frac{1}{2}|\vec{d}_1\times\vec{d}_2|$. Here $\vec{d}_1\times\vec{d}_2 = ${vt(x)}$, magnitude $\sqrt{${s}}$, so area $= ${rootOver(s, 2)}$.`,
    };
  }),

  // ---------------------------------------------------------------- scalar triple product
  b.dynamic('scalar-triple-product', { difficulty: 2, origin: 'past-paper', tags: ['scalar triple product'] }, (r) => {
    let a = vec(r, -3, 3);
    let c = vec(r, -3, 3);
    let e = vec(r, -3, 3);
    for (let i = 0; i < 200 && det3(a, c, e) === 0; i++) {
      a = vec(r, -3, 3);
      c = vec(r, -3, 3);
      e = vec(r, -3, 3);
    }
    if (det3(a, c, e) === 0) {
      a = [1, 2, -1];
      c = [0, 1, 3];
      e = [2, -1, 1];
    }
    const C1 = c[1] * e[2] - c[2] * e[1];
    const C2 = c[0] * e[2] - c[2] * e[0];
    const C3 = c[0] * e[1] - c[1] * e[0];
    const D = a[0] * C1 - a[1] * C2 + a[2] * C3;
    const { answer, distractors } = numericOptions(r, {
      correct: D,
      wrong: [
        -D, // reversed the cyclic order
        a[0] * C1 + a[1] * C2 + a[2] * C3, // forgot the alternating sign
        a[0] * C1 - a[1] * C2 - a[2] * C3, // sign slip in the last term
      ],
      format: (v) => m(String(v)),
      allowNegative: true,
      allowZero: true,
    });
    return {
      stem: tex`If $${A} = ${vt(a)}$, $${B} = ${vt(c)}$ and $${C} = ${vt(e)}$, then $${A}\cdot(${B}\times${C})$ equals:`,
      answer,
      distractors,
      explanation: tex`$${A}\cdot(${B}\times${C}) = \begin{vmatrix} ${a[0]} & ${a[1]} & ${a[2]} \\ ${c[0]} & ${c[1]} & ${c[2]} \\ ${e[0]} & ${e[1]} & ${e[2]} \end{vmatrix} = (${a[0]})(${C1}) - (${a[1]})(${C2}) + (${a[2]})(${C3}) = ${D}$.`,
    };
  }),

  b.dynamic('coplanar-find-lambda', { difficulty: 3, tags: ['scalar triple product'] }, (r) => {
    let a: V3 = [1, 2, 3];
    let c: V3 = [2, 1, 1];
    let e12: [number, number] = [1, 1];
    let lam = 0;
    let found = false;
    for (let i = 0; i < 400 && !found; i++) {
      a = nzVec(r, -3, 3);
      c = nzVec(r, -3, 3);
      e12 = [r.nonZero(-3, 3), r.nonZero(-3, 3)];
      const [P, Q, R] = cross(a, c);
      const t = e12[0] * P + e12[1] * Q;
      if (R !== 0 && t !== 0 && t % R === 0 && Math.abs(t / R) <= 10) {
        lam = -t / R;
        found = true;
      }
    }
    if (!found) {
      a = [1, 2, 1];
      c = [2, 1, 3];
      e12 = [2, 1];
      lam = 3; // a x b = (5, -1, -3): 2(5) + 1(-1) - 3(3) = 0
    }
    const [P, Q, R] = cross(a, c);
    const t = e12[0] * P + e12[1] * Q;
    const { answer, distractors } = numericOptions(r, {
      correct: lam,
      wrong: [-lam, t, -t, lam + R],
      format: (v) => m(String(v)),
      allowNegative: true,
    });
    return {
      stem: tex`The vectors $${A} = ${vt(a)}$, $${B} = ${vt(c)}$ and $${C} = ${v3(e12[0], e12[1], 0)} + \lambda\hat{k}$ are coplanar. Then $\lambda$ equals:`,
      answer,
      distractors,
      explanation: tex`Coplanar means $[${A}\ ${B}\ ${C}] = ${C}\cdot(${A}\times${B}) = 0$. Here $${A}\times${B} = ${vt([P, Q, R])}$, so $(${e12[0]})(${P}) + (${e12[1]})(${Q}) + (${R})\lambda = 0$, i.e. $${t} + (${R})\lambda = 0$ and $\lambda = ${lam}$.`,
    };
  }),

  b.dynamic('volume-parallelepiped-tetrahedron', { difficulty: 2, tags: ['area and volume', 'scalar triple product'] }, (r) => {
    let a = vec(r, -3, 3);
    let c = vec(r, -3, 3);
    let e = vec(r, -3, 3);
    for (let i = 0; i < 200 && Math.abs(det3(a, c, e)) < 2; i++) {
      a = vec(r, -3, 3);
      c = vec(r, -3, 3);
      e = vec(r, -3, 3);
    }
    if (Math.abs(det3(a, c, e)) < 2) {
      a = [2, 1, 0];
      c = [0, 3, 1];
      e = [1, 0, 2];
    }
    const D = det3(a, c, e);
    const V = Math.abs(D);
    const tetra = r.chance(0.45);
    const answer = m(fr(V, tetra ? 6 : 1));
    const cands = tetra
      ? [String(V), fr(V, 3), fr(V, 2), fr(V, 12)]
      : [fr(V, 6), fr(V, 2), fr(V, 3), String(V * V)];
    return {
      stem: tex`The volume (in cubic units) of the ${tetra ? 'tetrahedron' : 'parallelepiped'} whose coterminous edges are $${A} = ${vt(a)}$, $${B} = ${vt(c)}$ and $${C} = ${vt(e)}$ is:`,
      answer,
      distractors: pickDistractors(answer, cands.map(m), r),
      explanation: tex`$[${A}\ ${B}\ ${C}] = \begin{vmatrix} ${a[0]} & ${a[1]} & ${a[2]} \\ ${c[0]} & ${c[1]} & ${c[2]} \\ ${e[0]} & ${e[1]} & ${e[2]} \end{vmatrix} = ${D}$. ${tetra ? tex`Volume of tetrahedron $= \frac{1}{6}|[${A}\ ${B}\ ${C}]| = \frac{${V}}{6} = ${fr(V, 6)}$.` : tex`Volume of parallelepiped $= |[${A}\ ${B}\ ${C}]| = ${V}$.`}`,
    };
  }),

  // ---------------------------------------------------------------- concepts
  b.dynamic('vector-properties-statements', { difficulty: 2, tags: ['dot product', 'cross product', 'scalar triple product'] }, (r) =>
    statementQuestion(r, {
      stem: tex`For all vectors $${A}, ${B}, ${C}$, which of the following is correct?`,
      negativeStem: tex`For all vectors $${A}, ${B}, ${C}$, which of the following is NOT correct?`,
      truths: [
        tex`$${A}\times${B} = -(${B}\times${A})$`,
        tex`$${A}\cdot${B} = ${B}\cdot${A}$`,
        tex`$${A}\cdot(${B}\times${C}) = (${A}\times${B})\cdot${C}$`,
        tex`$[${A}\ ${B}\ ${C}] = [${B}\ ${C}\ ${A}]$`,
        tex`$${A}\cdot(${A}\times${B}) = 0$`,
        tex`$${A}\times${A} = \vec{0}$`,
        tex`$${A}\cdot${A} = |${A}|^{2}$`,
      ],
      falsehoods: [
        tex`$${A}\times${B} = ${B}\times${A}$`,
        tex`$[${A}\ ${B}\ ${C}] = [${B}\ ${A}\ ${C}]$`,
        tex`$${A}\times${A} = |${A}|^{2}$`,
        tex`$|${A}\times${B}| = |${A}||${B}|\cos\theta$`,
        tex`$${A}\cdot(${A}\times${B}) = |${A}|^{2}|${B}|$`,
      ],
      explain: (ans, inverted) =>
        inverted
          ? tex`${ans} fails in general. Correct facts: the cross product is anti-commutative, the dot product is commutative, $[${A}\ ${B}\ ${C}]$ is unchanged by a cyclic shift but changes sign when two vectors are swapped, $${A}\times${A} = \vec{0}$ and $|${A}\times${B}| = |${A}||${B}|\sin\theta$.`
          : tex`${ans} holds for all vectors. The other options fail: $${B}\times${A} = -${A}\times${B}$, swapping two vectors changes the sign of the triple product, $${A}\times${A} = \vec{0}$ (a vector), $|${A}\times${B}| = |${A}||${B}|\sin\theta$ and $${A}\times${B}$ is perpendicular to $${A}$.`,
    }),
  ),

  ...b.mcqs([
    {
      id: 'i-cross-j',
      d: 1,
      o: 'past-paper',
      t: ['cross product', 'unit vectors'],
      q: tex`The value of $\hat{k}\times\hat{j}$ is:`,
      a: tex`$-\hat{i}$`,
      x: [tex`$\hat{i}$`, tex`$\vec{0}$`, tex`$1$`],
      e: tex`Cyclically $\hat{j}\times\hat{k} = \hat{i}$; reversing the order changes the sign, so $\hat{k}\times\hat{j} = -\hat{i}$.`,
    },
    {
      id: 'unit-triple-product',
      d: 1,
      t: ['scalar triple product', 'unit vectors'],
      q: tex`The value of $\hat{i}\cdot(\hat{j}\times\hat{k}) + \hat{j}\cdot(\hat{i}\times\hat{k})$ is:`,
      a: tex`$0$`,
      x: [tex`$2$`, tex`$1$`, tex`$-2$`],
      e: tex`$\hat{i}\cdot(\hat{j}\times\hat{k}) = \hat{i}\cdot\hat{i} = 1$ and $\hat{j}\cdot(\hat{i}\times\hat{k}) = \hat{j}\cdot(-\hat{j}) = -1$, so the sum is $0$.`,
    },
    {
      id: 'a-dot-a-cross-b',
      d: 1,
      t: ['scalar triple product', 'cross product'],
      q: tex`For any vectors $\vec{a}$ and $\vec{b}$, $\vec{a}\cdot(\vec{a}\times\vec{b})$ equals:`,
      a: tex`$0$`,
      x: [tex`$|\vec{a}|^{2}|\vec{b}|$`, tex`$\vec{a}\cdot\vec{b}$`, tex`$|\vec{a}|^{2}$`],
      e: tex`$\vec{a}\times\vec{b}$ is perpendicular to $\vec{a}$, so its dot product with $\vec{a}$ is $0$ (a triple product with a repeated vector vanishes).`,
    },
    {
      id: 'parallel-iff-cross-zero',
      d: 1,
      t: ['cross product'],
      q: tex`Two non-zero vectors $\vec{a}$ and $\vec{b}$ are parallel if and only if:`,
      a: tex`$\vec{a}\times\vec{b} = \vec{0}$`,
      x: [tex`$\vec{a}\cdot\vec{b} = 0$`, tex`$|\vec{a}| = |\vec{b}|$`, tex`$\vec{a}+\vec{b} = \vec{0}$`],
      e: tex`$|\vec{a}\times\vec{b}| = |\vec{a}||\vec{b}|\sin\theta = 0$ exactly when $\theta = 0$ or $\pi$, i.e. when the vectors are parallel. $\vec{a}\cdot\vec{b} = 0$ is the condition for perpendicular vectors.`,
    },
    {
      id: 'coplanar-condition',
      d: 1,
      t: ['scalar triple product'],
      q: tex`Three non-zero vectors $\vec{a}$, $\vec{b}$, $\vec{c}$ are coplanar if and only if:`,
      a: tex`$\vec{a}\cdot(\vec{b}\times\vec{c}) = 0$`,
      x: [tex`$\vec{a}\cdot(\vec{b}\times\vec{c}) = 1$`, tex`$\vec{a}\cdot\vec{b} = \vec{b}\cdot\vec{c} = \vec{c}\cdot\vec{a} = 0$`, tex`$|\vec{a}| = |\vec{b}| = |\vec{c}|$`],
      e: tex`$|\vec{a}\cdot(\vec{b}\times\vec{c})|$ is the volume of the parallelepiped on the three vectors; it is zero exactly when they lie in one plane.`,
    },
    {
      id: 'sum-minus-difference-equal-length',
      d: 1,
      t: ['dot product'],
      q: tex`If $(\vec{a}+\vec{b})\cdot(\vec{a}-\vec{b}) = 0$, then:`,
      a: tex`$|\vec{a}| = |\vec{b}|$`,
      x: [tex`$\vec{a} = \vec{b}$`, tex`$\vec{a}\perp\vec{b}$`, tex`$\vec{a}\parallel\vec{b}$`],
      e: tex`$(\vec{a}+\vec{b})\cdot(\vec{a}-\vec{b}) = |\vec{a}|^{2} - |\vec{b}|^{2} = 0$, so $|\vec{a}| = |\vec{b}|$. The vectors need not be equal, parallel or perpendicular.`,
    },
    {
      id: 'cross-equals-dot-angle',
      d: 2,
      o: 'past-paper',
      t: ['dot product', 'cross product'],
      q: tex`If $|\vec{a}\times\vec{b}| = \vec{a}\cdot\vec{b} \neq 0$, the angle between $\vec{a}$ and $\vec{b}$ is:`,
      a: tex`$\frac{\pi}{4}$`,
      x: [tex`$\frac{3\pi}{4}$`, tex`$\frac{\pi}{2}$`, tex`$\frac{\pi}{3}$`],
      e: tex`$|\vec{a}||\vec{b}|\sin\theta = |\vec{a}||\vec{b}|\cos\theta$ gives $\tan\theta = 1$. Since $\vec{a}\cdot\vec{b} = |\vec{a}\times\vec{b}| > 0$, $\cos\theta > 0$, so $\theta = \frac{\pi}{4}$ (not $\frac{3\pi}{4}$).`,
    },
    {
      id: 'sum-and-difference-equal-magnitude',
      d: 2,
      o: 'past-paper',
      t: ['dot product'],
      q: tex`If $|\vec{a}+\vec{b}| = |\vec{a}-\vec{b}|$ for non-zero vectors $\vec{a}$ and $\vec{b}$, the angle between them is:`,
      a: tex`$\frac{\pi}{2}$`,
      x: [tex`$0$`, tex`$\pi$`, tex`$\frac{\pi}{4}$`],
      e: tex`Squaring: $|\vec{a}|^{2} + |\vec{b}|^{2} + 2\vec{a}\cdot\vec{b} = |\vec{a}|^{2} + |\vec{b}|^{2} - 2\vec{a}\cdot\vec{b}$, so $\vec{a}\cdot\vec{b} = 0$ and the vectors are perpendicular.`,
    },
    {
      id: 'mutually-perpendicular-unit-sum',
      d: 2,
      t: ['unit vectors', 'dot product'],
      q: tex`If $\vec{a}$, $\vec{b}$, $\vec{c}$ are mutually perpendicular unit vectors, then $|\vec{a}+\vec{b}+\vec{c}|$ equals:`,
      a: tex`$\sqrt{3}$`,
      x: [tex`$3$`, tex`$1$`, tex`$0$`],
      e: tex`$|\vec{a}+\vec{b}+\vec{c}|^{2} = |\vec{a}|^{2}+|\vec{b}|^{2}+|\vec{c}|^{2} + 2(\vec{a}\cdot\vec{b}+\vec{b}\cdot\vec{c}+\vec{c}\cdot\vec{a}) = 1+1+1+0 = 3$, so the magnitude is $\sqrt{3}$.`,
    },
    {
      id: 'triple-product-of-sums',
      d: 3,
      o: 'past-paper',
      t: ['scalar triple product'],
      q: tex`$[\vec{a}+\vec{b}\ \ \vec{b}+\vec{c}\ \ \vec{c}+\vec{a}]$ is equal to:`,
      a: tex`$2[\vec{a}\ \vec{b}\ \vec{c}]$`,
      x: [tex`$[\vec{a}\ \vec{b}\ \vec{c}]$`, tex`$0$`, tex`$3[\vec{a}\ \vec{b}\ \vec{c}]$`],
      e: tex`Expanding by linearity, every term with a repeated vector vanishes, leaving $[\vec{a}\ \vec{b}\ \vec{c}] + [\vec{b}\ \vec{c}\ \vec{a}] = 2[\vec{a}\ \vec{b}\ \vec{c}]$ (a cyclic shift does not change the value).`,
    },
    {
      id: 'zero-sum-angle',
      d: 3,
      o: 'past-paper',
      t: ['dot product', 'vector algebra'],
      q: tex`If $\vec{a}+\vec{b}+\vec{c} = \vec{0}$ with $|\vec{a}| = 3$, $|\vec{b}| = 5$ and $|\vec{c}| = 7$, the angle between $\vec{a}$ and $\vec{b}$ is:`,
      a: tex`$\frac{\pi}{3}$`,
      x: [tex`$\frac{2\pi}{3}$`, tex`$\frac{\pi}{6}$`, tex`$\frac{\pi}{4}$`],
      e: tex`$\vec{c} = -(\vec{a}+\vec{b})$, so $49 = 9 + 25 + 2(3)(5)\cos\theta$, giving $\cos\theta = \frac{15}{30} = \frac{1}{2}$ and $\theta = \frac{\pi}{3}$.`,
    },
  ]),
]);
