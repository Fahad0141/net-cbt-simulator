import { defineBank } from '@/engine/authoring';
import {
  type Fraction,
  frac,
  gcd,
  lcm,
  n$,
  num,
  numericOptions,
  ordinal,
  pickDistractors,
  primeFactors,
  range,
  signedSum,
  surdTex,
  tex,
} from '@/engine/helpers';

/** Wraps LaTeX in `$...$`. */
const m = (latex: string): string => `$${latex}$`;

/** Prime factorisation as LaTeX: 360 -> `2^{3} \times 3^{2} \times 5`. */
function factorTex(n: number): string {
  return [...primeFactors(n).entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([p, e]) => (e === 1 ? String(p) : `${p}^{${e}}`))
    .join(' \\times ');
}

/** Smallest prime factor (n >= 2). */
function spf(n: number): number {
  for (let p = 2; p * p <= n; p++) if (n % p === 0) return p;
  return n;
}

/** Rupee amount as plain text with thousands separators: `Rs. 48,000`. */
function rs(value: number): string {
  return `Rs. ${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/** Exact decimal display for small decimals/integers (no scientific notation). */
const dec = (v: number): string => num(v, { sig: 8, autoSci: false });

/** Options for an exact rational answer; wrong values first, then gentle fallbacks. */
function fracOptions(
  correct: Fraction,
  wrong: readonly Fraction[],
  allowNonPositive = false,
): { answer: string; distractors: string[] } {
  const fmt = (f: Fraction): string => m(f.toTex());
  const extra = [
    correct.add(frac(1, correct.d)),
    correct.mul(2),
    correct.sub(frac(1, correct.d)),
    correct.div(2),
    correct.add(1),
    correct.mul(3),
  ];
  const answer = fmt(correct);
  const pool = [...wrong, ...extra].filter((f) => allowNonPositive || f.sign() > 0).map(fmt);
  return { answer, distractors: pickDistractors(answer, pool) };
}

/** Pairs of distinct coprime integers from [lo, hi]. */
function coprimePair(r: { pick<T>(items: readonly T[]): T }, lo: number, hi: number): [number, number] {
  const pairs: Array<[number, number]> = [];
  for (let p = lo; p <= hi; p++) for (let q = lo; q <= hi; q++) if (p !== q && gcd(p, q) === 1) pairs.push([p, q]);
  return r.pick(pairs);
}

const PEOPLE = [
  ['Ahmed', 'his', 'he'],
  ['Sana', 'her', 'she'],
  ['Bilal', 'his', 'he'],
  ['Ayesha', 'her', 'she'],
  ['Usman', 'his', 'he'],
  ['Hira', 'her', 'she'],
  ['Zain', 'his', 'he'],
  ['Fatima', 'her', 'she'],
] as const;

const UNIT_CYCLES: Record<number, number[]> = {
  2: [2, 4, 8, 6],
  3: [3, 9, 7, 1],
  4: [4, 6],
  7: [7, 9, 3, 1],
  8: [8, 4, 2, 6],
  9: [9, 1],
};

export default defineBank('quantitative', 'arithmetic', (b) => [
  // ───────────────────────── Fractions and decimals ─────────────────────────
  b.dynamic('fraction-add-subtract', { difficulty: 1, tags: ['fractions and decimals'] }, (r) => {
    const [bd, dd] = r.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 12], 2) as [number, number];
    const an = r.pick(range(1, bd - 1).filter((k) => gcd(k, bd) === 1));
    const cn = r.pick(range(1, dd - 1).filter((k) => gcd(k, dd) === 1));
    let x = frac(an, bd);
    let y = frac(cn, dd);
    const subtract = r.chance(0.4);
    if (subtract && x.compare(y) < 0) [x, y] = [y, x];
    const L = lcm(x.d, y.d);
    const correct = subtract ? x.sub(y) : x.add(y);
    const wrong = subtract
      ? [x.add(y), frac(Math.abs(x.n - y.n), Math.abs(x.d - y.d)), frac(x.n - y.n, L), x.mul(y)]
      : [frac(x.n + y.n, x.d + y.d), frac(x.n + y.n, L), x.mul(y), frac(x.n + y.n, x.d * y.d)];
    const { answer, distractors } = fracOptions(correct, wrong);
    const op = subtract ? '-' : '+';
    const nx = x.n * (L / x.d);
    const ny = y.n * (L / y.d);
    const raw = subtract ? nx - ny : nx + ny;
    const tail = frac(raw, L).d === L ? '' : ` = ${correct.toTex()}`;
    return {
      stem: tex`$${x.toTex()} ${op} ${y.toTex()}$ equals:`,
      answer,
      distractors,
      explanation: tex`The LCM of the denominators is $${L}$. $${x.toTex()} ${op} ${y.toTex()} = \frac{${nx} ${op} ${ny}}{${L}} = \frac{${raw}}{${L}}${tail}$.`,
    };
  }),

  b.dynamic('fraction-of-salary', { difficulty: 2, origin: 'past-paper', tags: ['fractions and decimals'] }, (r) => {
    const [name, poss, subj] = r.pick(PEOPLE);
    const p = r.pick([3, 4, 5, 6]);
    const q = r.pick([2, 3, 4, 5]);
    const unit = p * q * 100;
    const k = r.int(Math.ceil(20000 / unit), Math.floor(150000 / unit));
    const S = unit * k;
    const R = (S * (p - 1) * (q - 1)) / (p * q);
    const wrong = [
      (R * p * q) / (p * q - p - q), // took both fractions of the whole salary
      (S * (q - 1)) / q, // ignored the rent
      (S * (p - 1)) / p, // ignored the second spending
      S - R, // gave the amount spent
    ].filter((v) => Number.isInteger(v) && v > 0);
    const { answer, distractors } = numericOptions(r, { correct: S, wrong, format: rs });
    const what = r.pick(['household expenses', 'groceries', 'utility bills', 'school fees']);
    return {
      stem: tex`${name} spends $\frac{1}{${p}}$ of ${poss} monthly salary on rent and $\frac{1}{${q}}$ of the remainder on ${what}. If ${subj} is left with ${rs(R)}, ${poss} monthly salary is:`,
      answer,
      distractors,
      explanation: tex`Fraction left $= \left(1 - \frac{1}{${p}}\right)\left(1 - \frac{1}{${q}}\right) = \frac{${p - 1}}{${p}} \times \frac{${q - 1}}{${q}} = ${frac((p - 1) * (q - 1), p * q).toTex()}$. Salary $= ${R} \div ${frac((p - 1) * (q - 1), p * q).toTex()} = ${S}$, i.e. ${rs(S)}.`,
    };
  }),

  b.dynamic('decimal-to-fraction', { difficulty: 1, tags: ['fractions and decimals'] }, (r) => {
    const d = r.pick([4, 8, 16, 20, 25, 40, 50, 80, 125, 200]);
    const n = r.pick(range(1, d - 1).filter((k) => gcd(k, d) === 1));
    const w = r.pick([0, 0, 1, 2, 3]);
    const correct = frac(w * d + n, d);
    const shown = dec(correct.toNumber());
    const places = (shown.split('.')[1] ?? '').length;
    const D = Number(shown.replace('.', ''));
    const wrong = [frac(D, 10 ** (places - 1)), frac(D, 10 ** (places + 1))];
    if (w > 0) wrong.unshift(frac(n, d));
    else wrong.push(frac(n + 1, d), frac(d - n, d));
    const { answer, distractors } = fracOptions(correct, wrong);
    return {
      stem: tex`The decimal $${shown}$, written as a fraction in its lowest terms, is:`,
      answer,
      distractors,
      explanation: tex`$${shown} = \frac{${D}}{${10 ** places}}$. Dividing numerator and denominator by their HCF $${gcd(D, 10 ** places)}$ gives $${correct.toTex()}$.`,
    };
  }),

  b.dynamic('recurring-decimal', { difficulty: 2, origin: 'past-paper', tags: ['fractions and decimals'] }, (r) => {
    if (r.chance(0.5)) {
      const ab = r.pick(range(10, 98).filter((v) => v % 11 !== 0));
      const correct = frac(ab, 99);
      const { answer, distractors } = fracOptions(correct, [frac(ab, 100), frac(ab, 90), frac(ab, 999)]);
      return {
        stem: tex`The recurring decimal $0.\overline{${ab}}$ is equal to:`,
        answer,
        distractors,
        explanation: tex`Let $x = 0.\overline{${ab}}$. Then $100x - x = ${ab}$, so $x = \frac{${ab}}{99}${correct.d === 99 ? '' : ` = ${correct.toTex()}`}$.`,
      };
    }
    const a = r.int(1, 9);
    const bb = r.intExcept(1, 8, [a]); // 9 would make the decimal terminate (0.a999... = 0.(a+1))
    const whole = 10 * a + bb;
    const correct = frac(whole - a, 90);
    const { answer, distractors } = fracOptions(correct, [frac(whole, 90), frac(whole, 99), frac(whole - a, 99), frac(whole, 100)]);
    return {
      stem: tex`The recurring decimal $0.${a}\overline{${bb}}$ is equal to:`,
      answer,
      distractors,
      explanation: tex`Let $x = 0.${a}\overline{${bb}}$. Then $100x = ${whole}.\overline{${bb}}$ and $10x = ${a}.\overline{${bb}}$, so $90x = ${whole} - ${a} = ${whole - a}$ and $x = \frac{${whole - a}}{90} = ${correct.toTex()}$.`,
    };
  }),

  b.dynamic('compare-fractions', { difficulty: 2, tags: ['fractions and decimals'] }, (r) => {
    const pool: Fraction[] = [];
    for (let d = 3; d <= 13; d++) {
      for (let n = 1; n < d; n++) {
        const f = frac(n, d);
        if (f.d === d && f.toNumber() >= 0.3 && f.toNumber() <= 0.95) pool.push(f);
      }
    }
    let chosen: Fraction[] = [frac(5, 8), frac(7, 11), frac(3, 5), frac(2, 3)];
    for (let attempt = 0; attempt < 300; attempt++) {
      const s = r.sample(pool, 4);
      const v = s.map((f) => f.toNumber()).sort((x, y) => x - y);
      const gaps = v.slice(1).map((x, i) => x - (v[i] as number));
      const dens = new Set(s.map((f) => f.d));
      if (Math.min(...gaps) >= 0.012 && (v[3] as number) - (v[0] as number) <= 0.25 && dens.size === 4) {
        chosen = s;
        break;
      }
    }
    const largest = r.chance(0.6);
    const sorted = [...chosen].sort((x, y) => x.compare(y));
    const target = (largest ? sorted[3] : sorted[0]) as Fraction;
    const rest = chosen.filter((f) => !f.equals(target));
    const approx = (f: Fraction): string => {
      const v = f.toNumber();
      const exact = Number.isInteger(Number((v * 1000).toPrecision(12)));
      return `${f.toTex()} ${exact ? '=' : '\\approx'} ${num(v, { dp: 3 })}`;
    };
    return {
      stem: `Which of the following fractions is the **${largest ? 'largest' : 'smallest'}**?`,
      answer: m(target.toTex()),
      distractors: rest.map((f) => m(f.toTex())),
      explanation: tex`Convert to decimals: $${sorted.map(approx).join(',\\; ')}$. The ${largest ? 'largest' : 'smallest'} is $${target.toTex()}$.`,
    };
  }),

  b.dynamic('decimal-operations', { difficulty: 1, tags: ['fractions and decimals'] }, (r) => {
    const A = r.int(2, 9);
    const B = r.int(2, 9);
    if (r.chance(0.5)) {
      const i = r.int(2, 4);
      const j = r.int(1, 3);
      const P = A * B;
      const e = j - i;
      const x = P * 10 ** -i;
      const y = B * 10 ** -j;
      const correct = A * 10 ** e;
      const { answer, distractors } = numericOptions(r, {
        correct,
        wrong: [A * 10 ** (e - 1), A * 10 ** (e + 1), A * 10 ** (e - 2), A * 10 ** (e + 2)],
        format: (v) => m(dec(v)),
      });
      return {
        stem: tex`$${dec(x)} \div ${dec(y)} = ?$`,
        answer,
        distractors,
        explanation: tex`Multiply both numbers by $10^{${Math.max(i, j)}}$ to clear decimals: $\frac{${dec(x * 10 ** Math.max(i, j))}}{${dec(y * 10 ** Math.max(i, j))}} = ${dec(correct)}$.`,
      };
    }
    const i = r.int(1, 3);
    const j = r.int(1, 2);
    const x = A * 10 ** -i;
    const y = B * 10 ** -j;
    const correct = A * B * 10 ** -(i + j);
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [A * B * 10 ** -(i + j - 1), A * B * 10 ** -(i + j + 1), A * B * 10 ** -Math.max(i, j), A * B * 10 ** -(i + j + 2)],
      format: (v) => m(dec(v)),
    });
    return {
      stem: tex`$${dec(x)} \times ${dec(y)} = ?$`,
      answer,
      distractors,
      explanation: tex`$${A} \times ${B} = ${A * B}$, and the product has $${i} + ${j} = ${i + j}$ decimal places, so the answer is $${correct.toFixed(i + j)}${correct.toFixed(i + j) === dec(correct) ? '' : ` = ${dec(correct)}`}$.`,
    };
  }),

  // ───────────────────────────── HCF and LCM ─────────────────────────────
  b.dynamic('hcf-of-two', { difficulty: 1, tags: ['HCF and LCM'] }, (r) => {
    const h = r.int(4, 24);
    const [p, q] = coprimePair(r, 2, 9);
    const a = h * p;
    const c = h * q;
    const { answer, distractors } = numericOptions(r, {
      correct: h,
      wrong: [h * p * q, h / spf(h), 2 * h, h * Math.min(p, q)],
      format: n$,
    });
    const hPart = factorTex(h) === String(h) ? '' : ` = ${factorTex(h)}`;
    return {
      stem: tex`The HCF of $${a}$ and $${c}$ is:`,
      answer,
      distractors,
      explanation: tex`$${a} = ${factorTex(a)}$ and $${c} = ${factorTex(c)}$. The HCF is the product of the common prime factors with their lowest powers: $\text{HCF}${hPart} = ${h}$.`,
    };
  }),

  b.dynamic('lcm-of-three', { difficulty: 1, tags: ['HCF and LCM'] }, (r) => {
    const pool = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 27, 28, 30, 35, 36, 40, 45];
    let trio = [12, 15, 20];
    for (let t = 0; t < 200; t++) {
      const s = r.sample(pool, 3).sort((x, y) => x - y);
      const L = lcm(lcm(s[0] as number, s[1] as number), s[2] as number);
      if (L <= 1080 && L >= 2 * (s[2] as number)) {
        trio = s;
        break;
      }
    }
    const [a, c, d] = trio as [number, number, number];
    const L = lcm(lcm(a, c), d);
    const { answer, distractors } = numericOptions(r, {
      correct: L,
      wrong: [lcm(a, c), lcm(c, d), 2 * L, gcd(gcd(a, c), d), L / 2].filter((v) => Number.isInteger(v)),
      format: n$,
    });
    return {
      stem: tex`The LCM of $${a}$, $${c}$ and $${d}$ is:`,
      answer,
      distractors,
      explanation: tex`$${a} = ${factorTex(a)}$, $${c} = ${factorTex(c)}$, $${d} = ${factorTex(d)}$. Take every prime with its highest power: $\text{LCM} = ${factorTex(L)} = ${L}$.`,
    };
  }),

  b.dynamic('hcf-lcm-product', { difficulty: 2, origin: 'past-paper', tags: ['HCF and LCM'] }, (r) => {
    const h = r.int(3, 15);
    const [p, q] = coprimePair(r, 2, 9);
    const a = h * p;
    const other = h * q;
    const L = h * p * q;
    const { answer, distractors } = numericOptions(r, {
      correct: other,
      wrong: [L / h, L - a, q, (L * a) / h],
      format: n$,
    });
    return {
      stem: tex`The HCF and LCM of two numbers are $${h}$ and $${L}$ respectively. If one of the numbers is $${a}$, the other number is:`,
      answer,
      distractors,
      explanation: tex`For two numbers, $\text{HCF} \times \text{LCM} = $ product of the numbers. So the other number $= \frac{${h} \times ${L}}{${a}} = \frac{${h * L}}{${a}} = ${other}$.`,
    };
  }),

  b.dynamic('lcm-together-again', { difficulty: 2, origin: 'past-paper', tags: ['HCF and LCM'] }, (r) => {
    const pool = [6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 25, 30, 36, 40, 45, 48, 50, 60, 72, 75, 80, 90];
    let trio = [15, 20, 24];
    for (let t = 0; t < 300; t++) {
      const s = r.sample(pool, 3).sort((x, y) => x - y);
      const L = lcm(lcm(s[0] as number, s[1] as number), s[2] as number);
      if (L % 60 === 0 && L / 60 >= 2 && L / 60 <= 30 && L > (s[2] as number)) {
        trio = s;
        break;
      }
    }
    const [a, c, d] = trio as [number, number, number];
    const L = lcm(lcm(a, c), d);
    const mins = L / 60;
    const contexts = [
      `Three bells toll at intervals of ${a}, ${c} and ${d} seconds respectively. If they toll together now, after how many minutes will they next toll together?`,
      `Three traffic signals on Shahrah-e-Faisal, Karachi, change every ${a}, ${c} and ${d} seconds respectively. If they change together at 8:00 a.m., after how many minutes will they next change together?`,
      `Three lights on a minaret flash every ${a}, ${c} and ${d} seconds respectively. If they flash together now, after how many minutes will they next flash together?`,
    ];
    const fmt = (v: number): string => `${num(v)} minute${v === 1 ? '' : 's'}`;
    const wrong = [lcm(a, c) / 60, lcm(c, d) / 60, 2 * mins, (a + c + d) / 60].filter((v) => Number.isInteger(v) && v > 0);
    const { answer, distractors } = numericOptions(r, { correct: mins, wrong, format: fmt });
    return {
      stem: r.pick(contexts),
      answer,
      distractors,
      explanation: tex`They are next together after $\text{LCM}(${a}, ${c}, ${d})$ seconds. $\text{LCM} = ${factorTex(L)} = ${L}$ s $= \frac{${L}}{60} = ${mins}$ minutes.`,
    };
  }),

  b.dynamic('least-number-remainder', { difficulty: 3, origin: 'past-paper', tags: ['HCF and LCM', 'divisibility'] }, (r) => {
    const pool = [4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 25, 30];
    let trio = [12, 15, 20];
    for (let t = 0; t < 200; t++) {
      const s = r.sample(pool, 3).sort((x, y) => x - y);
      const L = lcm(lcm(s[0] as number, s[1] as number), s[2] as number);
      if (L <= 720 && L > (s[2] as number)) {
        trio = s;
        break;
      }
    }
    const [a, c, d] = trio as [number, number, number];
    const L = lcm(lcm(a, c), d);
    const k = r.int(1, a - 1);
    if (r.chance(0.5)) {
      const correct = L + k;
      const { answer, distractors } = numericOptions(r, {
        correct,
        wrong: [L, L - k, 2 * L + k, a * c * d + k],
        format: n$,
      });
      return {
        stem: tex`The least number greater than $${k}$ that leaves a remainder of $${k}$ when divided by each of $${a}$, $${c}$ and $${d}$ is:`,
        answer,
        distractors,
        explanation: tex`The number minus $${k}$ must be a common multiple of $${a}$, $${c}$, $${d}$. The least positive one is $\text{LCM} = ${L}$, so the number is $${L} + ${k} = ${correct}$.`,
      };
    }
    const correct = L - k;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [L + k, L, 2 * L - k, L - a + k],
      format: n$,
    });
    return {
      stem: tex`The least positive number which, when divided by $${a}$, $${c}$ and $${d}$, leaves remainders $${a - k}$, $${c - k}$ and $${d - k}$ respectively is:`,
      answer,
      distractors,
      explanation: tex`Each remainder is $${k}$ less than its divisor, so (number $+ ${k}$) is divisible by $${a}$, $${c}$ and $${d}$. Least such value: $\text{LCM} = ${L}$, so the number is $${L} - ${k} = ${correct}$.`,
    };
  }),

  b.dynamic('greatest-divisor-remainders', { difficulty: 3, tags: ['HCF and LCM', 'divisibility'] }, (r) => {
    const g = r.int(12, 45);
    const [p, q] = coprimePair(r, 3, 15);
    const r1 = r.int(1, g - 1);
    const r2 = r.intExcept(1, g - 1, [r1]);
    const x = g * p + r1;
    const y = g * q + r2;
    const { answer, distractors } = numericOptions(r, {
      correct: g,
      wrong: [gcd(x, y), gcd(x + r1, y + r2), g / spf(g), g * 2],
      format: n$,
    });
    return {
      stem: tex`The greatest number that divides $${x}$ and $${y}$ leaving remainders $${r1}$ and $${r2}$ respectively is:`,
      answer,
      distractors,
      explanation: tex`The required number divides $${x} - ${r1} = ${g * p}$ and $${y} - ${r2} = ${g * q}$ exactly. $\text{HCF}(${g * p}, ${g * q}) = ${g}$, which is greater than both remainders, so the answer is $${g}$.`,
    };
  }),

  b.dynamic('square-tiles', { difficulty: 2, tags: ['HCF and LCM'] }, (r) => {
    // Realistic rooms: 2.4 m to 15 m per side, tile side 20-90 cm, at most ~300 tiles.
    let g = 60;
    let p = 7;
    let q = 5;
    for (let t = 0; t < 300; t++) {
      g = r.pick([20, 24, 25, 30, 36, 40, 45, 48, 50, 60, 75, 80, 90]);
      [p, q] = coprimePair(r, 3, 25);
      if (p > q && g * q >= 240 && g * p <= 1500 && p * q <= 300) break;
    }
    if (!(p > q && g * q >= 240 && g * p <= 1500 && p * q <= 300)) [g, p, q] = [60, 7, 5];
    const l = g * p;
    const w = g * q;
    const s = spf(g);
    const correct = p * q;
    const place = r.pick(['hall', 'courtyard', 'verandah', 'classroom', 'school library', 'mosque courtyard']);
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [correct * s * s, (p + 1) * (q + 1), 2 * (p + q), p + q],
      format: n$,
    });
    const metres = (cm: number): string => dec(cm / 100);
    return {
      stem: tex`The floor of a ${place} measures $${metres(l)}\,\mathrm{m}$ by $${metres(w)}\,\mathrm{m}$. The least number of identical square tiles that can pave it exactly (without cutting any tile) is:`,
      answer,
      distractors,
      explanation: tex`In centimetres the floor is $${l}$ by $${w}$. Fewest tiles means the largest tile: side $= \text{HCF}(${l}, ${w}) = ${g}\,\mathrm{cm}$. Number of tiles $= \frac{${l}}{${g}} \times \frac{${w}}{${g}} = ${p} \times ${q} = ${correct}$.`,
    };
  }),

  // ───────────────────────────── Divisibility ─────────────────────────────
  b.dynamic('missing-digit-divisibility', { difficulty: 2, origin: 'past-paper', tags: ['divisibility'] }, (r) => {
    const by11 = r.chance(0.45);
    let digits: number[] = [];
    let pos = 1;
    let star = 1;
    for (let t = 0; t < 500; t++) {
      digits = [r.int(1, 9), ...Array.from({ length: 5 }, () => r.int(0, 9))];
      pos = r.int(1, 5);
      if (by11) {
        // alternating sum from the left: + - + - + -
        let alt = 0;
        digits.forEach((dg, i) => {
          if (i !== pos) alt += i % 2 === 0 ? dg : -dg;
        });
        const sign = pos % 2 === 0 ? 1 : -1;
        const need = ((((-alt * sign) % 11) + 11) % 11);
        if (need <= 9) {
          star = need;
          break;
        }
      } else {
        const s = digits.reduce((acc, dg, i) => (i === pos ? acc : acc + dg), 0);
        const need = (9 - (s % 9)) % 9;
        if (need >= 1 && need <= 8) {
          star = need;
          break;
        }
      }
    }
    digits[pos] = star;
    const shown = digits.map((dg, i) => (i === pos ? '{\\square}' : String(dg))).join('');
    const pool = by11
      ? [(star + 1) % 10, (star + 5) % 10, 11 - star, (star + 9) % 10, (star + 3) % 10]
      : [(star + 3) % 9, (star + 6) % 9, 9 - star, star + 1, star - 1];
    const answer = n$(star);
    const distractors = pickDistractors(answer, pool.filter((v) => v >= 0 && v <= 9).map((v) => n$(v)));
    let explanation: string;
    if (by11) {
      const odd = digits.filter((_, i) => i % 2 === 0);
      const even = digits.filter((_, i) => i % 2 === 1);
      const so = odd.reduce((a, v) => a + v, 0);
      const se = even.reduce((a, v) => a + v, 0);
      explanation = tex`For divisibility by $11$, (sum of digits in odd places) $-$ (sum in even places) must be $0$ or a multiple of $11$ (counting places from the left here; the direction does not matter). With $\square = ${star}$: $(${odd.join(' + ')}) - (${even.join(' + ')}) = ${so} - ${se} = ${so - se}$, a multiple of $11$. No other digit works.`;
    } else {
      const s = digits.reduce((a, v) => a + v, 0);
      explanation = tex`A number is divisible by $9$ when its digit sum is. The known digits add up to $${s - star}$; the next multiple of $9$ is $${s}$, so $\square = ${s} - ${s - star} = ${star}$.`;
    }
    return {
      stem: tex`If the six-digit number $${shown}$ is divisible by $${by11 ? 11 : 9}$, the missing digit $\square$ is:`,
      answer,
      distractors,
      explanation,
    };
  }),

  b.dynamic('remainder-of-factor', { difficulty: 2, tags: ['divisibility'] }, (r) => {
    const q = r.int(4, 13);
    const k = r.int(2, 6);
    const p = q * k;
    const rem = r.pick(range(q + 1, p - 1).filter((v) => v % q !== 0));
    const correct = rem % q;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [rem, q - correct, rem - q, k],
      format: n$,
      allowZero: true,
    });
    return {
      stem: tex`A number, when divided by $${p}$, leaves a remainder of $${rem}$. What is the remainder when the same number is divided by $${q}$?`,
      answer,
      distractors,
      explanation: tex`Write the number as $${p}n + ${rem}$. Since $${p} = ${q} \times ${k}$, the part $${p}n$ is divisible by $${q}$, so the remainder is that of $${rem} \div ${q}$, which is $${correct}$.`,
    };
  }),

  b.dynamic('count-multiples', { difficulty: 3, tags: ['divisibility'] }, (r) => {
    const N = r.multiple(100, 600, 10);
    let a = 3;
    let c = 5;
    for (let t = 0; t < 100; t++) {
      [a, c] = r.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 12], 2).sort((x, y) => x - y) as [number, number];
      if (c % a !== 0) break;
    }
    const L = lcm(a, c);
    const na = Math.floor(N / a);
    const nc = Math.floor(N / c);
    const nl = Math.floor(N / L);
    const either = na + nc - nl;
    const neither = r.chance(0.4);
    const correct = neither ? N - either : either;
    const wrong = neither
      ? [either, N - na - nc, N - na - nc + 2 * nl, N - na]
      : [na + nc, na + nc - 2 * nl, N - either, na + nc - Math.floor(N / (a * c))];
    const { answer, distractors } = numericOptions(r, { correct, wrong, format: n$ });
    return {
      stem: tex`How many integers from $1$ to $${N}$ (inclusive) are divisible by ${neither ? '**neither**' : 'at least one of'} $${a}$ ${neither ? 'nor' : 'and'} $${c}$?`,
      answer,
      distractors,
      explanation: tex`Divisible by $${a}$: $\lfloor ${N}/${a} \rfloor = ${na}$; by $${c}$: $${nc}$; by both (multiples of $\text{LCM} = ${L}$): $${nl}$. By at least one: $${na} + ${nc} - ${nl} = ${either}$.${neither ? tex` By neither: $${N} - ${either} = ${correct}$.` : ''}`,
    };
  }),

  // ─────────────────────────── Exponents and surds ───────────────────────────
  b.dynamic('laws-of-exponents', { difficulty: 1, tags: ['exponents and surds'] }, (r) => {
    const v = r.pick(['x', 'a', 'y', 'p']);
    const pw = (k: number): string => (k === 0 ? '1' : k === 1 ? v : `${v}^{${k}}`);
    let mm = 2;
    let n = 2;
    let p = 2;
    let k = 2;
    let stem = '';
    let wrong: number[] = [];
    let work = '';
    if (r.chance(0.5)) {
      for (let t = 0; t < 100; t++) {
        mm = r.int(2, 9);
        n = r.int(2, 9);
        p = r.int(2, 12);
        k = mm + n - p;
        if (k >= 2 && k <= 12) break;
      }
      k = mm + n - p;
      stem = tex`$\dfrac{${v}^{${mm}} \times ${v}^{${n}}}{${v}^{${p}}}$ simplifies to:`;
      wrong = [mm * n - p, mm + n + p, p - mm - n, k + 1];
      if ((mm + n) % p === 0) wrong.splice(2, 0, (mm + n) / p);
      work = tex`Add exponents when multiplying and subtract when dividing: $${v}^{${mm} + ${n} - ${p}} = ${pw(k)}$.`;
    } else {
      for (let t = 0; t < 100; t++) {
        mm = r.int(2, 5);
        n = r.int(2, 5);
        p = r.int(1, mm * n - 2);
        k = mm * n - p;
        if (k >= 2) break;
      }
      k = mm * n - p;
      stem = tex`$\dfrac{\left(${v}^{${mm}}\right)^{${n}}}{${v}^{${p}}}$ simplifies to:`;
      wrong = [mm + n - p, mm * n + p, mm ** n - p, k - 1];
      work = tex`A power of a power multiplies exponents: $\left(${v}^{${mm}}\right)^{${n}} = ${v}^{${mm * n}}$. Then $${v}^{${mm * n} - ${p}} = ${pw(k)}$.`;
    }
    const answer = m(pw(k));
    const distractors = pickDistractors(answer, [...wrong, k + 2, 2 * k].map((e) => m(pw(e))));
    return { stem, answer, distractors, explanation: work };
  }),

  b.dynamic('fractional-exponent', { difficulty: 1, origin: 'past-paper', tags: ['exponents and surds'] }, (r) => {
    const combos: Array<[number, number]> = [
      [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [3, 2], [3, 3], [3, 4], [4, 3], [5, 2], [5, 3], [6, 2], [7, 2], [4, 2], [8, 2], [9, 2], [10, 3], [10, 2],
    ];
    let c = 2;
    let q = 2;
    let p = 1;
    for (let t = 0; t < 100; t++) {
      [c, q] = r.pick(combos);
      p = r.pick(range(1, q + 1).filter((k) => k !== q && gcd(k, q) === 1));
      if (c ** p <= 1000) break;
    }
    if (c ** p > 1000) p = 1;
    const base = c ** q;
    const neg = r.chance(0.4);
    const val = frac(c ** p);
    const correct = neg ? val.inv() : val;
    const expTex = `${neg ? '-' : ''}\\frac{${p}}{${q}}`;
    const powerNear = (e: number): Fraction => (neg ? frac(1, c ** e) : frac(c ** e));
    const wrong: Fraction[] = [
      neg ? val.neg() : val.inv(),
      neg ? val : frac(base * p, q),
      powerNear(p + 1),
      frac(base * p, q),
    ];
    if (p > 1) wrong.push(powerNear(p - 1));
    const { answer, distractors } = fracOptions(correct, wrong, neg);
    return {
      stem: tex`The value of $${base}^{${expTex}}$ is:`,
      answer,
      distractors,
      explanation: tex`$${base} = ${c}^{${q}}$, so $${base}^{${expTex}} = ${c}^{${neg ? '-' : ''}${p}} = ${correct.toTex()}$.`,
    };
  }),

  b.dynamic('exponential-equation', { difficulty: 2, origin: 'past-paper', tags: ['exponents and surds'] }, (r) => {
    const a = r.pick([2, 3, 5]);
    const kmax = a === 2 ? 8 : a === 3 ? 5 : 4;
    let p = 1;
    let x = 2;
    let k = 3;
    let s = 1;
    for (let t = 0; t < 200; t++) {
      p = r.pick([1, 2, 3]);
      x = r.intExcept(-3, 6, [0]);
      k = r.int(1, kmax);
      s = k - p * x;
      if (s !== 0 && Math.abs(s) <= 6) break;
    }
    s = k - p * x;
    const expo = signedSum([[p, 'x'], [s, '']]);
    const wrong = [(k + s) / p, k - s, k / p - s, -x].filter((v) => Number.isInteger(v));
    const { answer, distractors } = numericOptions(r, {
      correct: x,
      wrong,
      format: n$,
      allowNegative: true,
      allowZero: true,
    });
    return {
      stem: tex`If $${a}^{${expo}} = ${a ** k}$, then $x$ equals:`,
      answer,
      distractors,
      explanation: tex`$${a ** k} = ${a}^{${k}}$. Equating exponents: $${expo} = ${k}$, ${p === 1 ? 'so' : `so $${p}x = ${k - s}$ and`} $x = ${x}$.`,
    };
  }),

  b.dynamic('exponential-equation-mixed-bases', { difficulty: 3, tags: ['exponents and surds'] }, (r) => {
    const families: Record<number, number[]> = { 2: [1, 2, 3, 4, 5], 3: [1, 2, 3], 5: [1, 2] };
    let a = 2;
    let u = 2;
    let v = 3;
    let x = 5;
    let s = 1;
    let t = -1;
    for (let tries = 0; tries < 500; tries++) {
      a = r.pick([2, 2, 3, 5]);
      [u, v] = r.sample(families[a] as number[], 2) as [number, number];
      x = r.int(-4, 8);
      s = r.int(-4, 4);
      const num2 = u * (x + s);
      if (num2 % v !== 0) continue;
      t = num2 / v - x;
      if (t !== s && Math.abs(t) <= 6) break;
    }
    if (u * (x + s) !== v * (x + t) || t === s) {
      a = 2; u = 2; v = 3; x = 5; s = 1; t = -1;
    }
    const A = a ** u;
    const B = a ** v;
    const left = signedSum([[1, 'x'], [s, '']]);
    const right = signedSum([[1, 'x'], [t, '']]);
    const times = (c: number, e: string): string => (c === 1 ? e : e === 'x' ? `${c}x` : `${c}(${e})`);
    const wrong = [(u * t - v * s) / (v - u), -x, (t - s) / (u - v), (v * t - s) / (1 - v)].filter(
      (w) => Number.isFinite(w) && Number.isInteger(w),
    );
    const { answer, distractors } = numericOptions(r, {
      correct: x,
      wrong,
      format: n$,
      allowNegative: true,
      allowZero: true,
    });
    const lhs = times(u, left);
    const rhs = times(v, right);
    const lhsOpen = signedSum([[u, 'x'], [u * s, '']]);
    const rhsOpen = signedSum([[v, 'x'], [v * t, '']]);
    const expanded = lhs === lhsOpen && rhs === rhsOpen ? '' : tex`, i.e. $${lhsOpen} = ${rhsOpen}$`;
    return {
      stem: tex`If $${A}^{${left}} = ${B}^{${right}}$, then $x$ equals:`,
      answer,
      distractors,
      explanation: tex`Write both sides as powers of $${a}$: $${a}^{${lhs}} = ${a}^{${rhs}}$. So $${lhs} = ${rhs}$${expanded}, giving $x = ${x}$.`,
    };
  }),

  b.dynamic('rationalize-denominator', { difficulty: 2, tags: ['exponents and surds'] }, (r) => {
    const [q, p] = r.sample([2, 3, 5, 6, 7, 10, 11, 13], 2).sort((x, y) => x - y) as [number, number];
    const t = r.int(1, 4);
    const k = t * (p - q);
    const plusDen = r.chance(0.5);
    const sp = `\\sqrt{${p}}`;
    const sq = `\\sqrt{${q}}`;
    const withCoef = (c: number, body: string): string => m(c === 1 ? body : `${c}(${body})`);
    const ansBody = plusDen ? `${sp} - ${sq}` : `${sp} + ${sq}`;
    const otherBody = plusDen ? `${sp} + ${sq}` : `${sp} - ${sq}`;
    const answer = withCoef(t, ansBody);
    const sumCoef = frac(k, p + q); // used p + q instead of p - q in the denominator
    const sumNum = sumCoef.n === 1 ? ansBody : `${sumCoef.n}(${ansBody})`;
    const wrongDen = sumCoef.d === 1 ? withCoef(sumCoef.n, ansBody) : m(`\\frac{${sumNum}}{${sumCoef.d}}`);
    const distractors = pickDistractors(answer, [
      withCoef(t, otherBody),
      withCoef(t, `${sq} - ${sp}`),
      wrongDen,
      withCoef(k, ansBody),
      withCoef(t + 1, ansBody),
    ]);
    const den = plusDen ? `${sp} + ${sq}` : `${sp} - ${sq}`;
    return {
      stem: tex`Rationalising the denominator, $\dfrac{${k}}{${den}}$ equals:`,
      answer,
      distractors,
      explanation: tex`Multiply by the conjugate $${ansBody}$: $\dfrac{${k}(${ansBody})}{(${sp})^2 - (${sq})^2} = \dfrac{${k}(${ansBody})}{${p} - ${q}} = ${answer.slice(1, -1)}$.`,
    };
  }),

  b.dynamic('surd-addition', { difficulty: 1, tags: ['exponents and surds'] }, (r) => {
    const k = r.pick([2, 3, 5, 6, 7]);
    let a = 3;
    let c = 2;
    for (let t = 0; t < 100; t++) {
      [a, c] = r.sample([2, 3, 4, 5, 6, 7], 2).sort((x, y) => y - x) as [number, number];
      if (a * a * k <= 300) break;
    }
    const A = a * a * k;
    const C = c * c * k;
    const minus = r.chance(0.4);
    const coef = minus ? a - c : a + c;
    const answer = m(surdTex(coef, k));
    const distractors = pickDistractors(answer, [
      m(surdTex(1, minus ? A - C : A + C)),
      m(surdTex(minus ? a + c : a - c, k)),
      m(surdTex(a * c, k)),
      m(surdTex(coef, 2 * k)),
    ]);
    const op = minus ? '-' : '+';
    return {
      stem: tex`$\sqrt{${A}} ${op} \sqrt{${C}}$ equals:`,
      answer,
      distractors,
      explanation: tex`$\sqrt{${A}} = \sqrt{${a * a} \times ${k}} = ${surdTex(a, k)}$ and $\sqrt{${C}} = ${surdTex(c, k)}$. So the expression is $(${a} ${op} ${c})\sqrt{${k}} = ${surdTex(coef, k)}$.`,
    };
  }),

  // ─────────────────────────── Number properties ───────────────────────────
  b.dynamic('unit-digit-power', { difficulty: 2, origin: 'past-paper', tags: ['number properties', 'exponents and surds'] }, (r) => {
    const d = r.pick([2, 3, 4, 7, 8, 9]);
    const base = 10 * r.int(1, 9) + d;
    const n = r.int(21, 99);
    const cycle = UNIT_CYCLES[d] as number[];
    const idx = (n - 1) % cycle.length;
    const correct = cycle[idx] as number;
    const answer = n$(correct);
    const distractors = pickDistractors(
      answer,
      [...cycle.filter((v) => v !== correct), (correct + 2) % 10, 5, 0, 1].map((v) => n$(v)),
    );
    const rem = n % cycle.length;
    return {
      stem: tex`The unit digit of $${base}^{${n}}$ is:`,
      answer,
      distractors,
      explanation: tex`The unit digit depends only on $${d}^{${n}}$. Unit digits of powers of $${d}$ repeat in a cycle of $${cycle.length}$: $${cycle.join(', ')}$. Since $${n} = ${cycle.length}(${Math.floor(n / cycle.length)}) + ${rem}$, the unit digit is the ${rem === 0 ? 'last' : ordinal(rem)} term of the cycle, i.e. $${correct}$.`,
    };
  }),

  b.dynamic('number-of-divisors', { difficulty: 2, tags: ['number properties'] }, (r) => {
    let a = 2;
    let c = 1;
    let e = 1;
    let p3 = 5;
    let N = 60;
    for (let t = 0; t < 200; t++) {
      a = r.int(1, 5);
      c = r.int(1, 3);
      p3 = r.pick([5, 7]);
      e = r.int(0, 2);
      N = 2 ** a * 3 ** c * p3 ** e;
      if (N >= 30 && N <= 5000) break;
    }
    if (N < 30 || N > 5000) {
      a = 2; c = 1; e = 1; p3 = 5; N = 60;
    }
    const correct = (a + 1) * (c + 1) * (e + 1);
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [correct - 2, a * c * Math.max(e, 1), a + c + e + 3, a + c + e],
      format: n$,
    });
    const factorsLine = e === 0 ? `(${a} + 1)(${c} + 1)` : `(${a} + 1)(${c} + 1)(${e} + 1)`;
    return {
      stem: tex`The total number of positive divisors of $${N}$ (including $1$ and $${N}$ itself) is:`,
      answer,
      distractors,
      explanation: tex`$${N} = ${factorTex(N)}$. Number of divisors $= ${factorsLine} = ${correct}$ (add one to each exponent and multiply).`,
    };
  }),

  b.dynamic('consecutive-numbers-sum', { difficulty: 1, tags: ['number properties'] }, (r) => {
    const kind = r.pick(['even', 'odd', 'whole'] as const);
    const step = kind === 'whole' ? 1 : 2;
    const k = r.pick([3, 4, 5]);
    let start = r.int(10, 80);
    if (kind === 'even' && start % 2 !== 0) start += 1;
    if (kind === 'odd' && start % 2 === 0) start += 1;
    const S = k * start + (step * k * (k - 1)) / 2;
    const largestQ = r.chance(0.6);
    const top = start + step * (k - 1);
    const correct = largestQ ? top : start;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [largestQ ? start : top, S / k, correct + step, correct - step].filter((v) => Number.isInteger(v)),
      format: n$,
    });
    const label = kind === 'whole' ? 'consecutive whole numbers' : `consecutive ${kind} numbers`;
    const terms = Array.from({ length: k }, (_, i) => (i === 0 ? 'n' : `n + ${i * step}`)).join(', ');
    return {
      stem: tex`The sum of ${k} ${label} is $${S}$. The ${largestQ ? 'largest' : 'smallest'} of these numbers is:`,
      answer,
      distractors,
      explanation: tex`Let the numbers be $${terms}$. Then $${k}n + ${(step * k * (k - 1)) / 2} = ${S}$, so $n = ${start}$. The numbers run from $${start}$ to $${top}$, so the ${largestQ ? 'largest' : 'smallest'} is $${correct}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'neither-prime-nor-composite', d: 1, t: ['number properties'],
      q: 'Which of the following numbers is neither prime nor composite?',
      a: '$1$',
      x: ['$2$', '$9$', '$11$'],
      e: tex`A prime has exactly two factors and a composite number has more than two. $1$ has only one factor, so it is neither. $2$ and $11$ are prime; $9 = 3 \times 3$ is composite.`,
    },
    {
      id: 'identify-irrational', d: 1, o: 'past-paper', t: ['number properties', 'exponents and surds'],
      q: 'Which of the following is an irrational number?',
      a: tex`$\sqrt{12}$`,
      x: [tex`$\sqrt{49}$`, tex`$0.\overline{3}$`, tex`$\frac{22}{7}$`],
      e: tex`$\sqrt{12} = 2\sqrt{3}$ and $\sqrt{3}$ cannot be written as a ratio of integers. $\sqrt{49} = 7$, $0.\overline{3} = \frac{1}{3}$ and $\frac{22}{7}$ are all ratios of integers (22/7 is only an approximation of $\pi$).`,
    },
    {
      id: 'product-of-irrationals', d: 2, t: ['number properties'],
      q: 'The product of two irrational numbers is:',
      a: 'sometimes rational and sometimes irrational',
      x: ['always irrational', 'always rational', 'always an integer'],
      e: tex`$\sqrt{2} \times \sqrt{8} = 4$ is rational, but $\sqrt{2} \times \sqrt{3} = \sqrt{6}$ is irrational, so neither "always" statement holds.`,
    },
    {
      id: 'divisibility-rule-of-8', d: 1, t: ['divisibility'],
      q: tex`A whole number is divisible by $8$ exactly when:`,
      a: tex`the number formed by its last three digits is divisible by $8$`,
      x: [
        tex`the sum of its digits is divisible by $8$`,
        tex`the number formed by its last two digits is divisible by $8$`,
        tex`its last digit is divisible by $8$`,
      ],
      e: tex`Since $1000 = 8 \times 125$, every multiple of $1000$ is divisible by $8$, so only the last three digits matter. Last two digits fail: $116$ ends in $16$ but $116 \div 8 = 14.5$.`,
    },
    {
      id: 'odd-plus-even', d: 1, t: ['number properties'],
      q: tex`If $m$ is an odd integer and $n$ is an even integer, which of the following is always odd?`,
      a: tex`$m + n$`,
      x: [tex`$mn$`, tex`$m + n + 1$`, tex`$2m + n$`],
      e: tex`Odd $+$ even $=$ odd, so $m + n$ is odd. $mn$ has the even factor $n$; $m + n + 1$ is odd $+ 1 =$ even; $2m + n$ is even $+$ even $=$ even.`,
    },
    {
      id: 'sum-of-odd-primes', d: 2, t: ['number properties'],
      q: 'The sum of any two odd prime numbers is always:',
      a: 'an even number',
      x: ['an odd number', 'a prime number', tex`a multiple of $4$`],
      e: tex`Every prime except $2$ is odd, and odd $+$ odd $=$ even. It is not always a multiple of $4$ or prime: $3 + 7 = 10$.`,
    },
    {
      id: 'hcf-consecutive-numbers', d: 1, t: ['HCF and LCM', 'number properties'],
      q: tex`The HCF of two consecutive natural numbers $n$ and $n + 1$ is:`,
      a: '$1$',
      x: ['$2$', '$n$', '$n(n + 1)$'],
      e: tex`Any common divisor of $n$ and $n + 1$ must divide their difference, $1$. So the HCF is $1$ (they are co-prime); $n(n + 1)$ is their LCM.`,
    },
  ]),
]);
