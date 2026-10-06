/**
 * Mathematics - Matrices and Determinants (FSc Part I).
 *
 * Coverage: matrix algebra (order of a product, 2x2 products, symmetric / skew-symmetric /
 * Hermitian matrices, reversal law), determinants (2x2 and 3x3 values, minors and cofactors,
 * determinant equations), properties of determinants (row operations, |kA|, |adj A|,
 * classic zero determinants), inverses (2x2 adjoint and inverse, single entries of a 3x3
 * inverse, A adj A), rank (echelon-form reasoning), systems of linear equations
 * (consistency, homogeneous systems) and Cramer's rule.
 *
 * Distractors are produced by the mistakes students actually make: ad + bc instead of
 * ad - bc, forgetting the checkerboard sign, forgetting to transpose the cofactor matrix,
 * |kA| = k|A|, treating a row addition as a scaling, and so on.
 */
import { defineBank } from '@/engine/authoring';
import {
  coefTex,
  divisors,
  frac,
  linearFactor,
  num,
  ordinal,
  pickDistractors,
  polyTex,
  signed,
  signedSum,
  tex,
} from '@/engine/helpers';
import type { Fraction } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

type Matrix = number[][];
type Cell = number | string;

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** LaTeX for a matrix (`bmatrix`) or a determinant (`vmatrix`); string cells are used verbatim. */
function matrixTex(rows: ReadonlyArray<ReadonlyArray<Cell>>, env: 'bmatrix' | 'vmatrix'): string {
  const body = rows
    .map((row) => row.map((v) => (typeof v === 'number' ? num(v) : v)).join(' & '))
    .join(' \\\\ ');
  return `\\begin{${env}} ${body} \\end{${env}}`;
}
const bmat = (rows: ReadonlyArray<ReadonlyArray<Cell>>): string => matrixTex(rows, 'bmatrix');
const vmat = (rows: ReadonlyArray<ReadonlyArray<Cell>>): string => matrixTex(rows, 'vmatrix');

const det2 = (m: Matrix): number => m[0][0] * m[1][1] - m[0][1] * m[1][0];

function det3(m: Matrix): number {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

/** Student slip: expansion along R1 without the minus sign on the middle term. */
function det3NoSign(m: Matrix): number {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  return a * (e * i - f * h) + b * (d * i - f * g) + c * (d * h - e * g);
}

/** Student slip: Sarrus' rule with only the three forward diagonal products. */
function det3Forward(m: Matrix): number {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  return a * e * i + b * f * g + c * d * h;
}

/** Student slip: every 2x2 minor evaluated as ps + qr instead of ps - qr. */
function det3PlusMinors(m: Matrix): number {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  return a * (e * i + f * h) - b * (d * i + f * g) + c * (d * h + e * g);
}

/** `(a11)(M11) - (a12)(M12) + (a13)(M13)`: the R1 expansion of a 3x3 determinant with its minors evaluated. */
function expansionTex(m: Matrix): string {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  return `(${a})(${e * i - f * h}) - (${b})(${d * i - f * g}) + (${c})(${d * h - e * g})`;
}

function minorMatrix(m: Matrix, row: number, col: number): Matrix {
  return m.filter((_, i) => i !== row).map((line) => line.filter((_, j) => j !== col));
}
const minorOf = (m: Matrix, row: number, col: number): number => det2(minorMatrix(m, row, col));
const cofactorOf = (m: Matrix, row: number, col: number): number =>
  ((row + col) % 2 === 0 ? 1 : -1) * minorOf(m, row, col);

function multiply(x: Matrix, y: Matrix): Matrix {
  return x.map((row) => y[0].map((_, j) => row.reduce((sum, v, k) => sum + v * y[k][j], 0)));
}
const transpose = (m: Matrix): Matrix => m[0].map((_, j) => m.map((row) => row[j]));
const hadamard = (x: Matrix, y: Matrix): Matrix => x.map((row, i) => row.map((v, j) => v * y[i][j]));
const scaleMatrix = (m: Matrix, k: number): Matrix => m.map((row) => row.map((v) => v * k));

const randomMatrix = (r: Rng, rows: number, cols: number, lo: number, hi: number): Matrix =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => r.int(lo, hi)));

const nonZeroCount = (v: readonly number[]): number => v.filter((x) => x !== 0).length;

/** True when two 3-vectors are proportional (zero cross product). */
const proportional3 = (u: readonly number[], v: readonly number[]): boolean =>
  u[1] * v[2] - u[2] * v[1] === 0 && u[2] * v[0] - u[0] * v[2] === 0 && u[0] * v[1] - u[1] * v[0] === 0;

/** Draws parameters until `make` accepts them (deterministic: only the template's rng is used). */
function retry<T>(make: () => T | null, what: string): T {
  for (let attempt = 0; attempt < 500; attempt++) {
    const value = make();
    if (value !== null) return value;
  }
  throw new Error(`matrices-determinants: could not build ${what}`);
}

const exact = (v: Fraction): string => `$${v.toTex()}$`;

/**
 * Options for an exact (integer or fractional) answer. `wrong` holds mistake-based values,
 * best first; nulls and values that collide with the answer or each other are skipped.
 */
function exactOptions(
  correct: Fraction,
  wrong: ReadonlyArray<Fraction | null>,
): { answer: string; distractors: string[] } {
  const answer = exact(correct);
  const fallback = [correct.neg(), correct.add(1), correct.sub(1), correct.add(2), correct.mul(2), correct.sub(2)];
  const pool = [...wrong.filter((w): w is Fraction => w !== null), ...fallback].map(exact);
  return { answer, distractors: pickDistractors(answer, pool) };
}

/** `$s\begin{bmatrix}...\end{bmatrix}$`, folding a scalar of +1 or -1 into the matrix. */
function scaledMatrixTex(s: Fraction, m: Matrix): string {
  if (s.equals(1)) return `$${bmat(m)}$`;
  if (s.equals(-1)) return `$${bmat(scaleMatrix(m, -1))}$`;
  return `$${s.toTex()}${bmat(m)}$`;
}

/** A linear equation in x, y (and z); the coefficient at `lambdaAt` is shown as the parameter lambda. */
function equationTex(coefs: readonly number[], rhs: number, lambdaAt = -1): string {
  const vars = ['x', 'y', 'z'];
  let out = '';
  coefs.forEach((c, k) => {
    const v = vars[k];
    if (k === lambdaAt) {
      out += out ? ` + \\lambda ${v}` : `\\lambda ${v}`;
      return;
    }
    if (c === 0) return;
    const body = coefTex(Math.abs(c), v);
    if (!out) out = c < 0 ? `-${body}` : body;
    else out += c < 0 ? ` - ${body}` : ` + ${body}`;
  });
  return `${out} = ${rhs}`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export default defineBank('mathematics', 'matrices-determinants', (b) => [
  // ----- determinants / inverse: value of an unknown that makes a 2x2 matrix singular -----
  b.dynamic('singular-matrix-unknown', { difficulty: 1, origin: 'past-paper', tags: ['determinants', 'inverse'] }, (r) => {
    const v = r.pick(['k', 'x', 'p', '\\lambda']);
    const k0 = r.nonZero(-9, 9);
    const q = r.int(2, 6) * r.sign(); // diagonal partner of the unknown
    const product = k0 * q; // must equal the product of the other diagonal
    const size = Math.abs(product);
    const pairs = divisors(size).filter((x) => x <= 12 && size / x <= 12);
    const proper = pairs.filter((x) => x > 1 && x < size);
    // Neighbours whose size differs from the partner's keep the slip values below distinct.
    const varied = proper.filter((x) => x !== Math.abs(q) && x !== Math.abs(k0));
    const u = r.pick(varied.length ? varied : proper.length ? proper : pairs) * r.sign(); // same row as the unknown
    const w = product / u; // same column as the unknown
    const i = r.int(0, 1);
    const j = r.int(0, 1);
    const cells: Cell[][] = [
      [0, 0],
      [0, 0],
    ];
    cells[i][j] = v;
    cells[1 - i][1 - j] = q;
    cells[i][1 - j] = u;
    cells[1 - i][j] = w;
    const det = i === j ? `(${v})(${q}) - (${u})(${w})` : `(${u})(${w}) - (${v})(${q})`;
    const slips = [
      frac(q * w, u), // multiplied along the rows instead of the diagonals
      frac(q * u, w), // multiplied down the columns instead of the diagonals
    ];
    const { answer, distractors } = exactOptions(frac(k0), [
      frac(-k0), // took |A| = ad + bc
      ...r.shuffle([frac(product), ...slips.filter((f) => f.isInteger())]), // forgot to divide by the coefficient
      ...slips.filter((f) => !f.isInteger()),
      frac(q, product), // solved qk = P as k = q / P
    ]);
    const stem = r.chance(0.5)
      ? tex`The matrix $${bmat(cells)}$ is singular when $${v}$ equals:`
      : tex`For what value of $${v}$ does the matrix $${bmat(cells)}$ have no inverse?`;
    return {
      stem,
      answer,
      distractors,
      explanation: tex`A square matrix is singular (has no inverse) exactly when its determinant is zero: $${det} = 0 \Rightarrow ${q}${v} = ${product} \Rightarrow ${v} = \frac{${product}}{${q}} = ${k0}$.`,
    };
  }),

  // ----- matrix algebra: conformability and order of products -----
  b.dynamic('product-order', { difficulty: 1, tags: ['matrix algebra'] }, (r) => {
    const [m, n, p] = r.sample([2, 3, 4, 5, 6], 3);
    const ord = (x: number, y: number): string => `$${x} \\times ${y}$`;
    const given = tex`$A$ is a matrix of order $${m} \times ${n}$ and $B$ is a matrix of order $${n} \times ${p}$`;
    const variant = r.pick(['ab', 'btat', 'defined'] as const);
    if (variant === 'ab') {
      const answer = ord(m, p);
      return {
        stem: tex`If ${given}, then the order of $AB$ is:`,
        answer,
        distractors: pickDistractors(answer, [ord(p, m), ...r.shuffle([ord(n, n), ord(m, n), ord(n, p)])]),
        explanation: tex`$AB$ is defined because the number of columns of $A$ equals the number of rows of $B$ (both are $${n}$). The product has as many rows as $A$ and as many columns as $B$, so its order is $${m} \times ${p}$.`,
      };
    }
    if (variant === 'btat') {
      const answer = ord(p, m);
      return {
        stem: tex`If ${given}, then the order of $B^{T}A^{T}$ is:`,
        answer,
        distractors: pickDistractors(answer, [ord(m, p), ...r.shuffle([ord(n, n), ord(p, n), ord(n, m)])]),
        explanation: tex`$B^{T}$ has order $${p} \times ${n}$ and $A^{T}$ has order $${n} \times ${m}$. The inner orders agree, so $B^{T}A^{T}$ (which equals $(AB)^{T}$) exists and has order $${p} \times ${m}$.`,
      };
    }
    const definedAB = r.chance(0.6);
    const answer = definedAB ? '$AB$' : '$B^{T}A^{T}$';
    const notDefined = ['$BA$', '$A^{2}$', '$B^{2}$', '$A^{T}B$', '$AB^{T}$', '$A^{T}B^{T}$', '$BA^{T}$'];
    const reason = definedAB
      ? tex`$A$ has $${n}$ columns and $B$ has $${n}$ rows, so $AB$ exists.`
      : tex`$B^{T}$ (order $${p} \times ${n}$) has $${n}$ columns and $A^{T}$ (order $${n} \times ${m}$) has $${n}$ rows, so $B^{T}A^{T}$ exists.`;
    return {
      stem: tex`If ${given}, which of the following products is defined?`,
      answer,
      distractors: r.sample(notDefined, 3),
      explanation: tex`A product $XY$ is defined only when the number of columns of $X$ equals the number of rows of $Y$. ${reason} In each of the other products the two inner orders are different numbers taken from $${m}$, $${n}$ and $${p}$, so they are not defined.`,
    };
  }),

  // ----- matrix algebra: multiplying 2x2 matrices -----
  b.dynamic('product-2x2', { difficulty: 1, tags: ['matrix algebra'] }, (r) => {
    const variant = r.pick(['AB', 'BA', 'A2'] as const);
    const built = retry(() => {
      const A = randomMatrix(r, 2, 2, -3, 4);
      const B = randomMatrix(r, 2, 2, -3, 4);
      if (A.flat().filter((x) => x === 0).length > 1 || B.flat().filter((x) => x === 0).length > 1) return null;
      let X: Matrix;
      let Y: Matrix;
      let wrong: Matrix[];
      if (variant === 'A2') {
        [X, Y] = [A, A];
        // squared each entry, multiplied row by row, multiplied column by column, doubled
        wrong = [hadamard(A, A), multiply(A, transpose(A)), multiply(transpose(A), A), scaleMatrix(A, 2)];
      } else {
        [X, Y] = variant === 'AB' ? [A, B] : [B, A];
        // wrong order, entry-by-entry product, row by row, column by column
        wrong = [multiply(Y, X), hadamard(X, Y), multiply(X, transpose(Y)), multiply(transpose(X), Y)];
      }
      const correct = multiply(X, Y);
      const key = bmat(correct);
      const pool = wrong.map((w) => bmat(w)).filter((w) => w !== key);
      if (new Set(pool).size < 3) return null;
      return { A, B, X, Y, correct, pool: pool.map((w) => `$${w}$`) };
    }, 'a 2x2 product');
    const { A, B, X, Y, correct, pool } = built;
    const answer = `$${bmat(correct)}$`;
    const name = variant === 'A2' ? 'A^{2}' : variant;
    const work = bmat(
      [0, 1].map((i) => [0, 1].map((j) => `(${X[i][0]})(${Y[0][j]}) + (${X[i][1]})(${Y[1][j]})`)),
    );
    const stem =
      variant === 'A2'
        ? tex`If $A = ${bmat(A)}$, then $A^{2}$ is equal to:`
        : tex`If $A = ${bmat(A)}$ and $B = ${bmat(B)}$, then $${name}$ is equal to:`;
    return {
      stem,
      answer,
      distractors: pickDistractors(answer, pool),
      explanation: tex`Multiply each row of the first factor by each column of the second: $${name} = ${work} = ${bmat(correct)}$.`,
    };
  }),

  // ----- inverse: adjoint and inverse of a 2x2 matrix -----
  b.dynamic('inverse-2x2', { difficulty: 1, origin: 'past-paper', tags: ['inverse'] }, (r) => {
    const askInverse = r.chance(0.65);
    const M = retry(() => {
      const m = [
        [r.nonZero(-6, 7), r.nonZero(-6, 7)],
        [r.nonZero(-6, 7), r.nonZero(-6, 7)],
      ];
      const D = det2(m);
      if (D === 0 || m[0][0] === m[1][1] || m[0][1] === m[1][0]) return null;
      return askInverse && Math.abs(D) > 9 ? null : m;
    }, 'an invertible 2x2 matrix');
    const [[m11, m12], [m21, m22]] = M;
    const D = det2(M);
    const adj = [
      [m22, -m12],
      [-m21, m11],
    ];
    const swapOnly = [
      [m22, m12],
      [m21, m11],
    ]; // swapped the diagonal but kept the signs
    const signOnly = [
      [m11, -m12],
      [-m21, m22],
    ]; // changed the signs but did not swap
    const cofactors = [
      [m22, -m21],
      [-m12, m11],
    ]; // cofactor matrix, not transposed
    if (askInverse) {
      const inv = frac(1, D);
      const answer = scaledMatrixTex(inv, adj);
      const plusDet = m11 * m22 + m12 * m21;
      const pool = r.shuffle([
        scaledMatrixTex(inv, swapOnly),
        scaledMatrixTex(inv, signOnly),
        scaledMatrixTex(inv, cofactors),
        scaledMatrixTex(frac(D), adj), // multiplied by |A| instead of dividing
        scaledMatrixTex(frac(-1, D), adj), // |A| taken as bc - ad
        ...(plusDet !== 0 ? [scaledMatrixTex(frac(1, plusDet), adj)] : []), // |A| taken as ad + bc
      ]);
      return {
        stem: tex`The inverse of the matrix $A = ${bmat(M)}$ is:`,
        answer,
        distractors: pickDistractors(answer, pool),
        explanation: tex`$|A| = (${m11})(${m22}) - (${m12})(${m21}) = ${D}$. Swapping the diagonal elements and changing the signs of the other two gives $\operatorname{adj}A = ${bmat(adj)}$, so $A^{-1} = \frac{1}{|A|}\operatorname{adj}A = ${answer.slice(1, -1)}$.`,
      };
    }
    const answer = `$${bmat(adj)}$`;
    const pool = r.shuffle([swapOnly, signOnly, cofactors, scaleMatrix(adj, -1)]).map((m) => `$${bmat(m)}$`);
    return {
      stem: tex`The adjoint of the matrix $A = ${bmat(M)}$ is:`,
      answer,
      distractors: pickDistractors(answer, pool),
      explanation: tex`The cofactors of $A$ form $${bmat(cofactors)}$ and $\operatorname{adj}A$ is the transpose of this matrix. For a $2 \times 2$ matrix that amounts to swapping the diagonal elements and changing the signs of the off-diagonal elements: $\operatorname{adj}A = ${bmat(adj)}$.`,
    };
  }),

  // ----- determinants: minor or cofactor of one element of a 3x3 matrix -----
  b.dynamic('cofactor-or-minor', { difficulty: 1, tags: ['determinants'] }, (r) => {
    const askMinor = r.chance(0.3);
    const { M, i, j, minor } = retry(() => {
      const m = randomMatrix(r, 3, 3, -4, 6);
      const row = r.int(0, 2);
      const col = r.int(0, 2);
      const value = minorOf(m, row, col);
      return value === 0 ? null : { M: m, i: row, j: col, minor: value };
    }, 'a non-zero minor');
    const sign = (i + j) % 2 === 0 ? 1 : -1;
    const cofactor = sign * minor;
    const sub = minorMatrix(M, i, j);
    const [[s11, s12], [s21, s22]] = sub;
    const plusMinor = s11 * s22 + s12 * s21; // 2x2 determinant taken as ps + qr
    const mirrored = i === j ? null : askMinor ? minorOf(M, j, i) : cofactorOf(M, j, i); // used a_ji
    const element = M[i][j];
    const wrong = askMinor
      ? [cofactor, mirrored, plusMinor, element * minor]
      : [-cofactor, mirrored, sign * plusMinor, element * cofactor];
    const { answer, distractors } = exactOptions(
      frac(askMinor ? minor : cofactor),
      wrong.map((w) => (w === null ? null : frac(w))),
    );
    const ij = `${i + 1}${j + 1}`;
    const minorStep = tex`Deleting row ${i + 1} and column ${j + 1} leaves $${vmat(sub)}$, so the minor is $M_{${ij}} = (${s11})(${s22}) - (${s12})(${s21}) = ${minor}$.`;
    return {
      stem: tex`For $A = ${bmat(M)}$, the ${askMinor ? 'minor' : 'cofactor'} of the element $a_{${ij}}$ is:`,
      answer,
      distractors,
      explanation: askMinor
        ? tex`${minorStep} (Only the cofactor $A_{${ij}} = (-1)^{${i + j + 2}}M_{${ij}}$ carries a sign.)`
        : tex`${minorStep} The cofactor is $A_{${ij}} = (-1)^{${i + j + 2}}M_{${ij}} = ${cofactor}$.`,
    };
  }),

  // ----- determinants: value of a 3x3 determinant -----
  b.dynamic('determinant-3x3', { difficulty: 2, tags: ['determinants'] }, (r) => {
    const { M, D } = retry(() => {
      const m = randomMatrix(r, 3, 3, -3, 5);
      if (r.chance(0.6)) m[r.int(0, 2)][r.int(0, 2)] = 0;
      const value = det3(m);
      return value === 0 || Math.abs(value) > 99 ? null : { M: m, D: value };
    }, 'a 3x3 determinant');
    const [[a11, a12, a13], [a21, a22, a23], [a31, a32, a33]] = M;
    const { answer, distractors } = exactOptions(
      frac(D),
      r.shuffle([
        frac(det3NoSign(M)), // forgot the minus sign of the middle term
        frac(-D), // reversed every sign
        frac(det3Forward(M)), // Sarrus without the backward diagonals
        frac(det3PlusMinors(M)), // 2x2 minors as ps + qr
      ]),
    );
    return {
      stem: tex`The value of the determinant $${vmat(M)}$ is:`,
      answer,
      distractors,
      explanation: tex`Expanding along $R_1$: $(${a11})[(${a22})(${a33}) - (${a23})(${a32})] - (${a12})[(${a21})(${a33}) - (${a23})(${a31})] + (${a13})[(${a21})(${a32}) - (${a22})(${a31})] = ${expansionTex(M)} = ${D}$.`,
    };
  }),

  // ----- properties of determinants: |kA|, |kA^T|, |adj A|, |kA^-1|, |A adj A| -----
  b.dynamic(
    'determinant-of-related-matrix',
    { difficulty: 2, origin: 'past-paper', tags: ['properties of determinants', 'inverse'] },
    (r) => {
      const variant = r.weighted(['kA', 'kAT', 'adj', 'kInv', 'AadjA'] as const, [3, 1, 3, 2, 2]);
      const build = (): { n: number; d: number; expr: string; correct: Fraction; wrong: Array<Fraction | null>; why: string } => {
        if (variant === 'kA' || variant === 'kAT') {
          const n = r.weighted([2, 3, 4], [2, 3, 1]);
          const d = r.pick([2, 3, 4, 5, -2, -3]);
          const k = n === 4 ? r.pick([2, -2]) : r.pick([2, 3, -2, -3]);
          const expr = variant === 'kA' ? `${k}A` : `${k}A^{T}`;
          const correct = frac(k ** n * d);
          const rule =
            variant === 'kA'
              ? tex`Multiplying a matrix of order $n$ by $k$ multiplies each of its $n$ rows by $k$, so $|kA| = k^{n}|A|$.`
              : tex`$|A^{T}| = |A|$, and multiplying a matrix of order $n$ by $k$ multiplies its determinant by $k^{n}$.`;
          return {
            n,
            d,
            expr,
            correct,
            wrong: [
              frac(k * d), // |kA| = k|A|
              n >= 3 ? frac(k ** (n - 1) * d) : null, // one power too few
              k < 0 && n % 2 === 1 ? correct.neg() : null, // sign of an odd power of a negative k
              frac(n * k * d), // multiplied by nk
              n !== 3 ? frac(k ** 3 * d) : null, // used |kA| = k^3|A| whatever the order
            ],
            why: tex`${rule} Here $|${expr}| = (${k})^{${n}}(${d}) = ${correct.toTex()}$.`,
          };
        }
        if (variant === 'adj') {
          const n = r.weighted([2, 3, 4], [1, 3, 1]);
          const d = r.pick(n === 4 ? [2, 3, -2, -3] : [2, 3, 4, 5, -2, -3]);
          const correct = frac(d).pow(n - 1);
          return {
            n,
            d,
            expr: '\\operatorname{adj}A',
            correct,
            wrong: [
              frac(d).pow(n), // |adj A| = |A|^n
              frac(d), // |adj A| = |A|
              frac(1, d), // confused with |A^-1|
              frac(n * d), // multiplied by the order
            ],
            why: tex`Taking determinants in $A(\operatorname{adj}A) = |A|\,I_n$ gives $|A|\,|\operatorname{adj}A| = |A|^{n}$, so $|\operatorname{adj}A| = |A|^{n-1} = (${d})^{${n - 1}} = ${correct.toTex()}$.`,
          };
        }
        if (variant === 'kInv') {
          const n = r.pick([2, 3]);
          const d = r.pick([2, 3, 4, 5, -2, -3]);
          const k = r.pick([2, 3, -2]);
          const expr = `${k}A^{-1}`;
          const correct = frac(k ** n, d);
          return {
            n,
            d,
            expr,
            correct,
            wrong: [
              frac(k, d), // forgot the power n
              frac(k ** n * d), // forgot to invert |A|
              frac(d, k ** n), // inverted the whole result
              frac(n * k, d), // multiplied by nk instead of k^n
              // (1 / (k^n |A|) is deliberately absent: it is |(kA)^-1|, the answer under a misreading of kA^-1)
            ],
            why: tex`$|A^{-1}| = \frac{1}{|A|}$, and multiplying a matrix of order $n$ by $k$ multiplies its determinant by $k^{n}$. Here $|${expr}| = (${k})^{${n}} \times \frac{1}{${d}} = ${correct.toTex()}$.`,
          };
        }
        const n = r.pick([2, 3, 4]);
        const d = r.pick(n === 4 ? [2, 3, -2] : [2, 3, 4, 5, -2, -3]);
        const correct = frac(d).pow(n);
        return {
          n,
          d,
          expr: 'A(\\operatorname{adj}A)',
          correct,
          wrong: [
            frac(d), // |(|A| I)| taken as |A|
            frac(d).pow(n - 1), // used |adj A| = |A|^(n-1) only
            frac(d).pow(n + 1), // |A| |adj A| with |adj A| = |A|^n
            frac(n * d), // multiplied by the order
          ],
          why: tex`$A(\operatorname{adj}A) = |A|\,I_n$ is a diagonal matrix whose $n$ diagonal entries all equal $|A|$, so $|A(\operatorname{adj}A)| = |A|^{n} = (${d})^{${n}} = ${correct.toTex()}$.`,
        };
      };
      const { n, d, expr, correct, wrong, why } = build();
      const { answer, distractors } = exactOptions(correct, wrong);
      return {
        stem: tex`If $A$ is a square matrix of order $${n}$ with $|A| = ${d}$, then $|${expr}|$ is equal to:`,
        answer,
        distractors,
        explanation: why,
      };
    },
  ),

  // ----- matrix algebra: unknown entry of a symmetric / skew-symmetric matrix -----
  b.dynamic('symmetric-skew-unknown', { difficulty: 2, tags: ['matrix algebra'] }, (r) => {
    const skew = r.chance(0.5);
    const { x0, p, s, q, t } = retry(() => {
      const root = r.nonZero(-6, 6);
      const cp = r.int(1, 5);
      const cs = r.int(1, 5);
      if (!skew && cp === cs) return null;
      const cq = r.int(-8, 8);
      const ct = skew ? -(cp + cs) * root - cq : (cp - cs) * root + cq;
      return Math.abs(ct) > 20 ? null : { x0: root, p: cp, s: cs, q: cq, t: ct };
    }, 'a symmetric/skew-symmetric pair');
    const upper = signedSum([
      [p, 'x'],
      [q, ''],
    ]);
    const lower = signedSum([
      [s, 'x'],
      [t, ''],
    ]);
    const [i, j] = r.pick([
      [0, 1],
      [0, 2],
      [1, 2],
    ]);
    const cells: Cell[][] = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let k = 0; k < 3; k++) cells[k][k] = skew ? 0 : r.int(-5, 6);
    for (const [u, v] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ]) {
      if (u === i && v === j) continue;
      const value = r.nonZero(-7, 7);
      cells[u][v] = value;
      cells[v][u] = skew ? -value : value;
    }
    cells[i][j] = upper;
    cells[j][i] = lower;
    const { answer, distractors } = exactOptions(frac(x0), [
      skew ? (p !== s ? frac(t - q, p - s) : null) : frac(-(q + t), p + s), // used the other definition
      frac(-x0), // sign slip while solving
      skew ? frac(t - q, p + s) : frac(q + t, s - p), // moved the constant across without changing its sign
    ]);
    const aij = `a_{${i + 1}${j + 1}}`;
    const aji = `a_{${j + 1}${i + 1}}`;
    return {
      stem: tex`If $A = ${bmat(cells)}$ is a ${skew ? 'skew-symmetric' : 'symmetric'} matrix, then $x$ is equal to:`,
      answer,
      distractors,
      explanation: skew
        ? tex`A skew-symmetric matrix satisfies $A^{T} = -A$, so $${aji} = -${aij}$: $${lower} = -(${upper}) \Rightarrow ${coefTex(p + s, 'x')} = ${-(q + t)} \Rightarrow x = ${x0}$.`
        : tex`A symmetric matrix satisfies $A^{T} = A$, so $${aji} = ${aij}$: $${lower} = ${upper} \Rightarrow ${coefTex(p - s, 'x')} = ${t - q} \Rightarrow x = ${x0}$.`,
    };
  }),

  // ----- rank: echelon-form reasoning on 3x3 and 2x3 matrices -----
  b.dynamic('rank-of-matrix', { difficulty: 2, tags: ['rank'] }, (r) => {
    const randomRow = (): number[] | null => {
      const v = [r.int(-3, 4), r.int(-3, 4), r.int(-3, 4)];
      return nonZeroCount(v) >= 2 ? v : null;
    };
    const square = r.chance(0.65);
    const rank = square ? r.weighted([1, 2, 3], [1, 2, 1]) : r.pick([1, 2]);
    let rows: Matrix;
    let why: string;
    if (rank === 3) {
      const { M, D } = retry(() => {
        const m = randomMatrix(r, 3, 3, -3, 4);
        const value = det3(m);
        return value !== 0 && m.every((row) => nonZeroCount(row) >= 2) ? { M: m, D: value } : null;
      }, 'a non-singular 3x3 matrix');
      rows = M;
      why = tex`$|A| = ${expansionTex(M)} = ${D} \neq 0$, so $A$ is non-singular and its echelon form has three non-zero rows. Hence the rank is $3$.`;
    } else if (rank === 2 && square) {
      const { base, al, be } = retry(() => {
        const r1 = randomRow();
        const r2 = randomRow();
        if (!r1 || !r2 || proportional3(r1, r2)) return null;
        const c1 = r.pick([1, 2, -1, -2, 3]);
        const c2 = r.pick([1, 2, -1, -2]);
        const r3 = r1.map((x, k) => c1 * x + c2 * r2[k]);
        if (nonZeroCount(r3) < 2 || r3.some((x) => Math.abs(x) > 12)) return null;
        return { base: [r1, r2, r3], al: c1, be: c2 };
      }, 'a rank-2 matrix');
      const perm = r.shuffle([0, 1, 2]);
      rows = perm.map((k) => base[k]);
      const at = (k: number): number => perm.indexOf(k) + 1;
      const combo = signedSum([
        [al, `R_{${at(0)}}`],
        [be, `R_{${at(1)}}`],
      ]);
      why = tex`Here $R_{${at(2)}} = ${combo}$, so $R_{${at(2)}} \to R_{${at(2)}} - (${combo})$ gives a zero row (and $|A| = 0$). $R_{${at(0)}}$ and $R_{${at(1)}}$ are not proportional, so the echelon form has exactly two non-zero rows: the rank is $2$.`;
    } else if (rank === 2) {
      const { r1, r2 } = retry(() => {
        const u = randomRow();
        const v = randomRow();
        return u && v && !proportional3(u, v) ? { r1: u, r2: v } : null;
      }, 'a rank-2 2x3 matrix');
      rows = [r1, r2];
      const [c1, c2] =
        [
          [0, 1],
          [0, 2],
          [1, 2],
        ].find(([x, y]) => r1[x] * r2[y] - r1[y] * r2[x] !== 0) ?? [0, 1];
      const sub = [
        [r1[c1], r1[c2]],
        [r2[c1], r2[c2]],
      ];
      why = tex`The two rows are not proportional: the $2 \times 2$ minor from columns ${c1 + 1} and ${c2 + 1} is $${vmat(sub)} = ${det2(sub)} \neq 0$. Hence the rank is $2$, the largest possible for a $2 \times 3$ matrix.`;
    } else {
      const { base, mults } = retry(() => {
        const r1 = randomRow();
        if (!r1) return null;
        const k = square ? [1, r.pick([2, 3, -1, -2]), r.pick([2, -1, -2, 3])] : [1, r.pick([2, 3, -1, -2, -3])];
        const all = k.map((c) => r1.map((x) => c * x));
        return all.some((row) => row.some((x) => Math.abs(x) > 12)) ? null : { base: all, mults: k };
      }, 'a rank-1 matrix');
      const perm = r.shuffle(base.map((_, k) => k));
      rows = perm.map((k) => base[k]);
      const at = (k: number): number => perm.indexOf(k) + 1;
      const first = `R_{${at(0)}}`;
      const relations = mults
        .slice(1)
        .map((c, k) => `$R_{${at(k + 1)}} = ${coefTex(c, first)}$`)
        .join(' and ');
      why = tex`Every row is a multiple of $${first}$ (${relations}). Subtracting those multiples leaves a single non-zero row, so the rank is $1$.`;
    }
    return {
      stem: tex`The rank of the matrix $${bmat(rows)}$ is:`,
      answer: `$${rank}$`,
      distractors: [0, 1, 2, 3].filter((x) => x !== rank).map((x) => `$${x}$`),
      explanation: why,
    };
  }),

  // ----- Cramer rule: one unknown of a 2x2 system -----
  b.dynamic('cramer-rule-2x2', { difficulty: 2, origin: 'past-paper', tags: ['Cramer rule', 'systems of linear equations'] }, (r) => {
    const s = retry(() => {
      const x0 = r.nonZero(-6, 6);
      const y0 = r.nonZero(-6, 6);
      if (x0 === y0) return null;
      const a1 = r.nonZero(-5, 6);
      const b1 = r.nonZero(-5, 6);
      const a2 = r.nonZero(-5, 6);
      const b2 = r.nonZero(-5, 6);
      const D = a1 * b2 - a2 * b1;
      if (Math.abs(D) < 2) return null;
      const c1 = a1 * x0 + b1 * y0;
      const c2 = a2 * x0 + b2 * y0;
      return Math.abs(c1) > 40 || Math.abs(c2) > 40 ? null : { x0, y0, a1, b1, a2, b2, c1, c2, D };
    }, 'a 2x2 system');
    const askX = r.chance(0.5);
    const v = askX ? 'x' : 'y';
    const value = askX ? s.x0 : s.y0;
    const other = askX ? s.y0 : s.x0;
    const Ai = askX
      ? [
          [s.c1, s.b1],
          [s.c2, s.b2],
        ]
      : [
          [s.a1, s.c1],
          [s.a2, s.c2],
        ];
    const Di = det2(Ai);
    const { answer, distractors } = exactOptions(
      frac(value),
      r.shuffle([
        frac(other), // solved for the other unknown
        frac(s.D, Di), // inverted Cramer's ratio
        frac(Di), // forgot to divide by |A|
        frac(-value), // sign slip
      ]),
    );
    return {
      stem: tex`Using Cramer's rule, the value of $${v}$ that satisfies $${equationTex([s.a1, s.b1], s.c1)}$ and $${equationTex([s.a2, s.b2], s.c2)}$ is:`,
      answer,
      distractors,
      explanation: tex`$|A| = ${vmat([
        [s.a1, s.b1],
        [s.a2, s.b2],
      ])} = ${s.D}$ and $|A_${v}| = ${vmat(Ai)} = ${Di}$ (the constants replace the ${v}-column). So $${v} = \frac{|A_${v}|}{|A|} = \frac{${Di}}{${s.D}} = ${value}$.`,
    };
  }),

  // ----- determinants: roots of a determinant equation -----
  b.dynamic('determinant-equation-roots', { difficulty: 2, tags: ['determinants'] }, (r) => {
    const s = retry(() => {
      const al = r.nonZero(-6, 6);
      const be = r.nonZero(-6, 6);
      if (al === be || al + be === 0) return null;
      const p = r.int(-5, 5);
      const q = -(al + be) - p;
      if (p === q || Math.abs(q) > 9) return null;
      const K = p * q - al * be; // product of the off-diagonal entries
      if (K === 0) return null;
      const pairs = divisors(Math.abs(K)).filter((x) => x <= 12 && Math.abs(K) / x <= 12);
      if (!pairs.length) return null;
      const e12 = r.pick(pairs) * r.sign();
      return { al, be, p, q, K, e12, e21: K / e12 };
    }, 'a determinant equation');
    const { al, be, p, q, K, e12, e21 } = s;
    const pair = (u: number, v: number): string => `$x = ${Math.min(u, v)}, ${Math.max(u, v)}$`;
    const answer = pair(al, be);
    const pool = [
      pair(-al, -be), // sign slip when factorising
      pair(-p, -q), // equated the diagonal entries to zero
    ];
    // |A| taken as (x + p)(x + q) + e12 e21
    const B = p + q;
    const disc = B * B - 4 * (p * q + K);
    const root = Math.sqrt(disc);
    if (disc > 0 && Number.isInteger(root) && (B + root) % 2 === 0) pool.push(pair((-B + root) / 2, (-B - root) / 2));
    // dropped the middle term: x^2 + pq - e12 e21 = 0, i.e. x^2 = -al*be
    const sq = Math.sqrt(-al * be);
    if (-al * be > 0 && Number.isInteger(sq)) pool.push(pair(-sq, sq));
    pool.push(pair(al, -be), pair(-al, be)); // one root with the wrong sign
    const xp = p === 0 ? 'x' : `x${signed(p)}`;
    const xq = q === 0 ? 'x' : `x${signed(q)}`;
    return {
      stem: tex`The values of $x$ for which $${vmat([
        [xp, e12],
        [e21, xq],
      ])} = 0$ are:`,
      answer,
      distractors: pickDistractors(answer, pool),
      explanation: tex`$(${xp})(${xq}) - (${e12})(${e21}) = 0 \Rightarrow ${polyTex([1, -(al + be), al * be])} = 0 \Rightarrow ${linearFactor(al)}${linearFactor(be)} = 0$, so $x = ${al}$ or $x = ${be}$.`,
    };
  }),

  // ----- systems of linear equations: parameter for no / infinitely many solutions -----
  b.dynamic('system-consistency-parameter', { difficulty: 2, tags: ['systems of linear equations'] }, (r) => {
    const infinite = r.chance(0.5);
    const m = r.pick([2, 3, 4, -2, -3]);
    const a1 = r.int(1, 4);
    const b1 = r.nonZero(-5, 5);
    const c1 = r.nonZero(-9, 9);
    const a2 = m * a1;
    const kStar = m * b1;
    const c2 = infinite ? m * c1 : m * c1 + r.nonZero(-5, 5);
    const { answer, distractors } = exactOptions(frac(kStar), [
      frac(b1, m), // used the ratio of the x-coefficients upside down
      frac(-kStar), // sign slip
      frac(b1 * c2, c1), // matched the y-coefficients to the constants
      frac(m), // took the ratio of the x-coefficients as k
    ]);
    const lead = tex`A unique solution fails exactly when $|A| = 0$: $(${a1})k - (${a2})(${b1}) = 0 \Rightarrow k = ${kStar}$.`;
    const tail = infinite
      ? tex`Then the second equation is $${m}$ times the first, constant included ($${c2} = ${m}(${c1})$), so both equations describe the same line and there are infinitely many solutions.`
      : tex`Then the left side of the second equation is $${m}$ times that of the first but $${c2} \neq ${m}(${c1})$, so the lines are parallel and distinct: no solution.`;
    return {
      stem: tex`The system $${equationTex([a1, b1], c1)}$, $${coefTex(a2, 'x')} + ky = ${c2}$ has ${infinite ? 'infinitely many solutions' : 'no solution'} if $k$ is equal to:`,
      answer,
      distractors,
      explanation: `${lead} ${tail}`,
    };
  }),

  // ----- systems of linear equations: classify a 2x2 system -----
  b.dynamic('classify-2x2-system', { difficulty: 1, origin: 'past-paper', tags: ['systems of linear equations'] }, (r) => {
    const kind = r.pick(['unique', 'none', 'infinite'] as const);
    const a1 = r.int(1, 4);
    const b1 = r.nonZero(-5, 5);
    const c1 = r.nonZero(-9, 9);
    const m = r.pick([2, 3, -2, -3]);
    let row2: [number, number, number];
    if (kind === 'unique') {
      row2 = retry(() => {
        const a2 = r.nonZero(-6, 6);
        const b2 = r.nonZero(-6, 6);
        return a1 * b2 - a2 * b1 === 0 ? null : [a2, b2, r.int(-12, 12)];
      }, 'a 2x2 system with a unique solution');
    } else {
      row2 = [m * a1, m * b1, kind === 'infinite' ? m * c1 : m * c1 + r.nonZero(-4, 4)];
    }
    const [a2, b2, c2] = row2;
    const D = a1 * b2 - a2 * b1;
    const labels = { unique: 'a unique solution', none: 'no solution', infinite: 'infinitely many solutions' };
    const answer = labels[kind];
    const lead = tex`$|A| = ${vmat([
      [a1, b1],
      [a2, b2],
    ])} = (${a1})(${b2}) - (${b1})(${a2}) = ${D}$.`;
    const tail =
      kind === 'unique'
        ? tex`Since $|A| \neq 0$, the coefficient matrix is non-singular and the system has exactly one solution (the lines intersect).`
        : kind === 'infinite'
          ? tex`Since $|A| = 0$, check the constants: the second equation is $${m}$ times the first, constant included ($${c2} = ${m}(${c1})$), so both describe the same line: infinitely many solutions.`
          : tex`Since $|A| = 0$, check the constants: the left side of the second equation is $${m}$ times that of the first but $${c2} \neq ${m}(${c1})$, so the lines are parallel and distinct: no solution.`;
    return {
      stem: tex`The system of equations $${equationTex([a1, b1], c1)}$ and $${equationTex([a2, b2], c2)}$ has:`,
      answer,
      distractors: [...Object.values(labels).filter((l) => l !== answer), 'exactly two solutions'],
      explanation: `${lead} ${tail}`,
    };
  }),

  // ----- properties of determinants: combined row operations -----
  b.dynamic('determinant-row-operations', { difficulty: 3, origin: 'past-paper', tags: ['properties of determinants'] }, (r) => {
    const letters = [
      ['a', 'b', 'c'],
      ['p', 'q', 'r'],
      ['u', 'v', 'w'],
    ];
    const d = r.pick([2, 3, 4, 5, 6, -2, -3, -4, -5]);
    const order = r.weighted(['same', 'swap', 'cycle'] as const, [1, 2, 1]);
    let perm = [0, 1, 2]; // perm[k] = original row shown as row k
    if (order === 'swap') {
      const [x, y] = r.sample([0, 1, 2], 2);
      perm[x] = y;
      perm[y] = x;
    } else if (order === 'cycle') {
      perm = r.pick([
        [1, 2, 0],
        [2, 0, 1],
      ]);
    }
    const scales = [1, 1, 1];
    const scaled = r.sample([0, 1, 2], r.pick([1, 1, 2])).sort((x, y) => x - y);
    for (const k of scaled) scales[k] = r.pick([2, 3, 4, -2, -3]);
    const pickAddition = (): { row: number; from: number; mult: number } => {
      const [row, from] = r.sample([0, 1, 2], 2);
      return { row, from, mult: r.pick([1, 2, 3, -1, -2]) };
    };
    const add = order === 'same' || r.chance(0.6) ? pickAddition() : null;
    const rows = perm.map((base, k) =>
      letters[base].map((letter, col) => {
        const main = coefTex(scales[k], letter);
        if (!add || add.row !== k) return main;
        const extra = coefTex(Math.abs(add.mult), letters[perm[add.from]][col]);
        return `${main} ${add.mult < 0 ? '-' : '+'} ${extra}`;
      }),
    );
    const sign = order === 'swap' ? -1 : 1;
    const factor = scales.reduce((x, y) => x * y, 1);
    const correct = sign * factor * d;
    const wrong = [
      -correct, // wrong sign rule for the rearranged rows
      sign * d, // ignored the common factor(s)
      add && Math.abs(add.mult) > 1 ? correct * add.mult : null, // treated the added multiple as a factor
      scaled.length === 2 ? sign * scales[scaled[0]] * d : null, // took out only one factor
      scaled.length === 1 ? sign * factor ** 3 * d : null, // used k^3 as for |kA|
    ];
    const { answer, distractors } = exactOptions(
      frac(correct),
      r.shuffle(wrong).map((w) => (w === null ? null : frac(w))),
    );
    const parts: string[] = [];
    if (add) {
      parts.push(
        tex`The terms added in $R_{${add.row + 1}}$ are a multiple of the entries of $R_{${add.from + 1}}$, and adding a multiple of one row to another does not change a determinant, so they can be dropped.`,
      );
    }
    parts.push(
      scaled.length === 1
        ? tex`Taking the common factor $${scales[scaled[0]]}$ out of $R_{${scaled[0] + 1}}$ multiplies the value by $${scales[scaled[0]]}$.`
        : tex`Taking the common factors $${scales[scaled[0]]}$ and $${scales[scaled[1]]}$ out of $R_{${scaled[0] + 1}}$ and $R_{${scaled[1] + 1}}$ multiplies the value by both.`,
    );
    parts.push(
      order === 'swap'
        ? 'What remains is the given determinant with two rows interchanged, which changes the sign.'
        : order === 'cycle'
          ? 'What remains is the given determinant with its rows in cyclic order; that needs two interchanges, so the sign is unchanged.'
          : 'What remains is the given determinant itself.',
    );
    const factors = [...(order === 'swap' ? [-1] : []), ...scaled.map((k) => scales[k]), d].map((f) => `(${f})`).join('');
    parts.push(tex`Hence the value is $${factors} = ${correct}$.`);
    return {
      stem: tex`If $${vmat(letters)} = ${d}$, then $${vmat(rows)}$ is equal to:`,
      answer,
      distractors,
      explanation: parts.join(' '),
    };
  }),

  // ----- systems of linear equations: homogeneous system with a non-trivial solution -----
  b.dynamic(
    'homogeneous-nontrivial',
    { difficulty: 3, origin: 'past-paper', tags: ['systems of linear equations', 'determinants'] },
    (r) => {
      const s = retry(() => {
        const r1 = [r.int(-3, 4), r.int(-3, 4), r.int(-3, 4)];
        const r2 = [r.int(-3, 4), r.int(-3, 4), r.int(-3, 4)];
        if (nonZeroCount(r1) < 2 || nonZeroCount(r2) < 2 || proportional3(r1, r2)) return null;
        const c1 = r.pick([1, 2, -1, -2, 3]);
        const c2 = r.pick([1, 2, -1, -2]);
        const r3 = r1.map((x, k) => c1 * x + c2 * r2[k]);
        if (nonZeroCount(r3) < 2 || r3.some((x) => Math.abs(x) > 9)) return null;
        const M = r.shuffle([r1, r2, r3]);
        const row = M.indexOf(r3);
        const col = r.int(0, 2);
        const lam = r3[col];
        if (lam === 0 || cofactorOf(M, row, col) === 0) return null;
        return { M, row, col, lam };
      }, 'a dependent homogeneous system');
      const { M, row, col, lam } = s;
      const withValue = (value: number): Matrix =>
        M.map((line, i) => line.map((x, j) => (i === row && j === col ? value : x)));
      const C = cofactorOf(M, row, col);
      const D0 = det3(withValue(0)); // |A| = C*lambda + D0
      // The lambda a student finds after expanding with a wrong rule (every such expansion is linear in
      // lambda). Only whole numbers are kept so that the options stay parallel in form.
      const slipRoot = (rule: (m: Matrix) => number): Fraction | null => {
        const w0 = rule(withValue(0));
        const w1 = rule(withValue(1));
        if (w1 === w0) return null;
        const root = frac(-w0, w1 - w0);
        return root.isInteger() && Math.abs(root.n) <= 30 ? root : null;
      };
      const { answer, distractors } = exactOptions(frac(lam), [
        frac(-lam), // sign slip
        ...r.shuffle([
          slipRoot(det3NoSign), // no minus sign on the middle term
          slipRoot(det3PlusMinors), // 2x2 minors as ps + qr
          slipRoot(det3Forward), // Sarrus without the backward diagonals
          Math.abs(D0) <= 30 ? frac(-D0) : null, // forgot to divide by the coefficient of lambda
        ]),
      ]);
      const cells: Cell[][] = M.map((line, i) => line.map((x, j) => (i === row && j === col ? '\\lambda' : x)));
      const equations = M.map((line, i) => `$${equationTex(line, 0, i === row ? col : -1)}$`).join(', ');
      return {
        stem: tex`The homogeneous system ${equations} has a non-trivial solution when $\lambda$ is equal to:`,
        answer,
        distractors,
        explanation: tex`A homogeneous system has a non-trivial solution only when its coefficient determinant is zero. Expanding, $${vmat(cells)} = ${signedSum([
          [C, '\\lambda'],
          [D0, ''],
        ])}$, and setting this equal to $0$ gives $\lambda = ${lam}$.`,
      };
    },
  ),

  // ----- inverse: one entry of the inverse of a 3x3 matrix -----
  b.dynamic('inverse-3x3-entry', { difficulty: 3, tags: ['inverse', 'determinants'] }, (r) => {
    const s = retry(() => {
      const m = randomMatrix(r, 3, 3, -2, 4);
      const D = det3(m);
      if (D === 0 || Math.abs(D) > 6) return null;
      const [i, j] = r.pick([
        [0, 1],
        [0, 2],
        [1, 0],
        [1, 2],
        [2, 0],
        [2, 1],
      ]);
      const cji = cofactorOf(m, j, i);
      const cij = cofactorOf(m, i, j);
      return cji === 0 || cji === cij ? null : { M: m, D, i, j, cji, cij };
    }, 'an invertible 3x3 matrix');
    const { M, D, i, j, cji, cij } = s;
    const correct = frac(cji, D);
    const { answer, distractors } = exactOptions(correct, [
      frac(cij, D), // forgot that adj A is the transpose of the cofactor matrix
      frac(cji), // forgot to divide by |A|
      frac(-cji, D), // lost the sign (-1)^(i+j)
      frac(D, cji), // inverted the ratio
    ]);
    const ji = `${j + 1}${i + 1}`;
    return {
      stem: tex`If $A = ${bmat(M)}$, then the element in the ${ordinal(i + 1)} row and ${ordinal(j + 1)} column of $A^{-1}$ is:`,
      answer,
      distractors,
      explanation: tex`Expanding along $R_1$: $|A| = ${expansionTex(M)} = ${D}$. Since $A^{-1} = \frac{1}{|A|}\operatorname{adj}A$ and $\operatorname{adj}A$ is the transpose of the cofactor matrix, the $(${i + 1}, ${j + 1})$ entry of $A^{-1}$ is $\frac{A_{${ji}}}{|A|}$. Deleting row ${j + 1} and column ${i + 1} of $A$: $A_{${ji}} = (-1)^{${i + j + 2}}${vmat(minorMatrix(M, j, i))} = ${cji}$. Hence the entry is $\frac{${cji}}{${D}} = ${correct.toTex()}$.`,
    };
  }),

  // ----- conceptual items -----
  ...b.mcqs([
    {
      id: 'skew-symmetric-odd-order',
      d: 1,
      o: 'past-paper',
      t: ['properties of determinants', 'matrix algebra'],
      q: 'The determinant of a skew-symmetric matrix of odd order is:',
      a: 'always zero',
      x: ['always one', 'always positive', 'always negative'],
      e: tex`If $A^{T} = -A$ and $A$ has odd order $n$, then $|A| = |A^{T}| = |-A| = (-1)^{n}|A| = -|A|$. So $2|A| = 0$, i.e. $|A| = 0$.`,
    },
    {
      id: 'cube-root-unity-determinant',
      d: 2,
      o: 'past-paper',
      t: ['properties of determinants'],
      q: tex`If $\omega$ is a complex cube root of unity, then $\begin{vmatrix} 1 & \omega & \omega^{2} \\ \omega & \omega^{2} & 1 \\ \omega^{2} & 1 & \omega \end{vmatrix}$ is equal to:`,
      a: '$0$',
      x: ['$1$', '$3$', tex`$\omega$`],
      e: tex`Apply $R_1 \to R_1 + R_2 + R_3$: every entry of $R_1$ becomes $1 + \omega + \omega^{2} = 0$. A determinant with a row of zeros has value $0$.`,
    },
    {
      id: 'equal-column-sum-determinant',
      d: 2,
      t: ['properties of determinants'],
      q: tex`The value of $\begin{vmatrix} 1 & a & b + c \\ 1 & b & c + a \\ 1 & c & a + b \end{vmatrix}$ is:`,
      a: '$0$',
      x: [tex`$a + b + c$`, '$abc$', tex`$(a - b)(b - c)(c - a)$`],
      e: tex`Apply $C_3 \to C_3 + C_2$: every entry of $C_3$ becomes $a + b + c$. Taking out the factor $a + b + c$ leaves $C_3$ identical to $C_1$ (all ones), so the value is $(a + b + c) \times 0 = 0$.`,
    },
    {
      id: 'matrix-times-adjoint',
      d: 1,
      t: ['inverse'],
      q: tex`If $A$ is a square matrix of order $n$, then $A(\operatorname{adj}A)$ is equal to:`,
      a: tex`$|A|\,I_n$`,
      x: [tex`$I_n$`, tex`$|A|^{n}\,I_n$`, tex`$|A|^{n-1}\,I_n$`],
      e: tex`Row $i$ of $A$ times column $j$ of $\operatorname{adj}A$ is $\sum_{k} a_{ik}A_{jk}$. For $i = j$ this is the expansion of $|A|$ along row $i$; for $i \neq j$ it uses alien cofactors and equals $0$. Hence $A(\operatorname{adj}A) = |A|\,I_n$.`,
    },
    {
      id: 'cramer-rule-condition',
      d: 1,
      t: ['Cramer rule'],
      q: tex`Cramer's rule can be used to solve a system $AX = B$ of $n$ linear equations in $n$ unknowns only when:`,
      a: tex`$|A| \neq 0$`,
      x: [tex`$|A| = 0$`, tex`$B = O$`, tex`$A$ is symmetric`],
      e: tex`Cramer's rule gives each unknown as $x_i = \frac{|A_i|}{|A|}$, which requires $|A| \neq 0$, i.e. a non-singular coefficient matrix.`,
    },
    {
      id: 'homogeneous-trivial-only',
      d: 1,
      t: ['systems of linear equations'],
      q: tex`If $|A| \neq 0$, the homogeneous system $AX = O$ has:`,
      a: 'only the trivial solution',
      x: ['infinitely many solutions', 'no solution', 'exactly two solutions'],
      e: tex`A homogeneous system always has the solution $X = O$. Since $A$ is non-singular, $X = A^{-1}O = O$ is the only solution.`,
    },
    {
      id: 'hermitian-diagonal',
      d: 1,
      t: ['matrix algebra'],
      q: 'The diagonal elements of a Hermitian matrix are always:',
      a: 'real',
      x: ['purely imaginary or zero', 'zero', 'non-real complex numbers'],
      e: tex`A Hermitian matrix satisfies $(\bar{A})^{T} = A$, so every diagonal element equals its own conjugate, $a_{ii} = \overline{a_{ii}}$, which means $a_{ii}$ is real.`,
    },
    {
      id: 'inconsistent-system-adjoint',
      d: 3,
      t: ['systems of linear equations', 'inverse'],
      q: tex`For a system $AX = B$ of $n$ linear equations in $n$ unknowns, if $|A| = 0$ and $(\operatorname{adj}A)B \neq O$, then the system has:`,
      a: 'no solution',
      x: ['a unique solution', 'infinitely many solutions', 'only the trivial solution'],
      e: tex`Pre-multiplying $AX = B$ by $\operatorname{adj}A$ gives $|A|\,X = (\operatorname{adj}A)B$. The left side is $O$ because $|A| = 0$, but the right side is not, so no $X$ satisfies the system: it is inconsistent.`,
    },
    {
      id: 'inverse-of-product',
      d: 1,
      t: ['inverse', 'matrix algebra'],
      q: tex`If $A$ and $B$ are non-singular matrices of the same order, then $(AB)^{-1}$ is equal to:`,
      a: tex`$B^{-1}A^{-1}$`,
      x: [tex`$A^{-1}B^{-1}$`, tex`$B^{T}A^{T}$`, tex`$BA$`],
      e: tex`$(AB)(B^{-1}A^{-1}) = A(BB^{-1})A^{-1} = AA^{-1} = I$, so $(AB)^{-1} = B^{-1}A^{-1}$ (reversal law). In general $A^{-1}B^{-1} \neq B^{-1}A^{-1}$ because matrix multiplication is not commutative.`,
    },
  ]),
]);
