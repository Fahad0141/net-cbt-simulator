import { defineBank } from '@/engine/authoring';
import { gcd, lcm, num, numericOptions, ordinal, pickDistractors, round, tex } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Exact display of a terminating decimal (up to 4 dp, no scientific notation). */
const nx = (x: number): string => num(x, { dp: 4 });

/** `x` has at most `dp` decimal places. */
function tidy(x: number, dp = 2): boolean {
  if (!Number.isFinite(x)) return false;
  const s = x * 10 ** dp;
  return Math.abs(s - Math.round(s)) < 1e-7;
}

/** Keeps only values that print exactly with at most `dp` decimals. */
const tidyOnly = (xs: readonly number[], dp = 2): number[] => xs.filter((x) => tidy(x, dp));

/** Pakistani rupees: `Rs. 12,500` or `Rs. 1,312.50`. */
function money(x: number): string {
  const v = round(Math.abs(x), 2);
  const whole = Math.floor(v);
  const paisa = Math.round((v - whole) * 100);
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${x < 0 ? '-' : ''}Rs. ${grouped}${paisa ? `.${String(paisa).padStart(2, '0')}` : ''}`;
}

/** Percentage option: `$12.5\%$`. */
const pc = (x: number): string => tex`$${nx(x)}\%$`;

/** Signed percentage change as words. */
function changeText(v: number, up = 'increase', down = 'decrease'): string {
  if (v > 0) return tex`$${nx(v)}\%$ ${up}`;
  if (v < 0) return tex`$${nx(-v)}\%$ ${down}`;
  return 'No change';
}

/** Gain/loss wording. */
function gainLoss(v: number): string {
  if (v > 0) return tex`Gain of $${nx(v)}\%$`;
  if (v < 0) return tex`Loss of $${nx(-v)}\%$`;
  return 'No gain, no loss';
}

/** Ratio in lowest terms as `$a : b$` or `$a : b : c$`. */
function ratioTex(...parts: number[]): string {
  const g = parts.reduce((acc, p) => gcd(acc, p), 0) || 1;
  return `$${parts.map((p) => p / g).join(' : ')}$`;
}

/** Ratio terms reduced to lowest terms. */
function reduce(...parts: number[]): number[] {
  const g = parts.reduce((acc, p) => gcd(acc, p), 0) || 1;
  return parts.map((p) => p / g);
}

const signedNum = (v: number): string => (v < 0 ? `(${nx(v)})` : nx(v));

/** `$3$ years` / `$1$ year`. */
const unitOpt = (v: number, unit: string): string => `$${nx(v)}$ ${unit}${v === 1 ? '' : 's'}`;

const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad', 'Rawalpindi', 'Sialkot', 'Hyderabad'];
const TRIOS: ReadonlyArray<readonly [string, string, string]> = [
  ['Ali', 'Bilal', 'Hamza'],
  ['Ayesha', 'Fatima', 'Zainab'],
  ['Usman', 'Saad', 'Hassan'],
  ['Hira', 'Sana', 'Mahnoor'],
  ['Imran', 'Kashif', 'Naveed'],
];

// ---------------------------------------------------------------------------
// Precomputed parameter tables (deterministic enumeration)
// ---------------------------------------------------------------------------

/** Ratio triples with distinct terms, no common factor, sum at most 20. */
const RATIO_TRIPLES: number[][] = [];
for (let a = 1; a <= 9; a++) {
  for (let b = 1; b <= 9; b++) {
    for (let c = 1; c <= 9; c++) {
      if (a === b || b === c || a === c) continue;
      if (gcd(gcd(a, b), c) !== 1 || a + b + c > 20) continue;
      RATIO_TRIPLES.push([a, b, c]);
    }
  }
}

/** Son : father age problems: [a, b, m, k] with present ages am, bm and k years later. */
const AGE_CASES: number[][] = [];
for (const [a, b] of [[1, 3], [1, 4], [2, 7], [2, 5], [1, 5], [3, 8], [1, 6], [3, 10], [2, 9], [3, 11], [4, 11]] as const) {
  for (let m = 1; m <= 20; m++) {
    const son = a * m;
    const father = b * m;
    if (son < 4 || father < 28 || father > 64 || father - son < 20) continue;
    for (let k = 2; k <= 15; k++) {
      const [c, d] = reduce(son + k, father + k) as [number, number];
      if (c + d > 16 || (c === a && d === b)) continue;
      AGE_CASES.push([a, b, m, k]);
    }
  }
}

/** Milk/water problems: [a, b, c, d] with a : b the starting ratio and c : d the target. */
const MIX_CASES: number[][] = [];
for (let a = 1; a <= 7; a++) {
  for (let b = 1; b <= 7; b++) {
    if (gcd(a, b) !== 1) continue;
    for (let c = 1; c <= 7; c++) {
      for (let d = 1; d <= 7; d++) {
        if (gcd(c, d) !== 1 || a * d === b * c) continue;
        // keep the quantity to add at most the original volume
        const addPerK = c * b < a * d ? (a * d) / c - b : (b * c) / d - a;
        if (addPerK > a + b) continue;
        MIX_CASES.push([a, b, c, d]);
      }
    }
  }
}

/** Teacher-joins problems: [n, A, k] with n students of mean age A, mean rises by k. */
const TEACHER_CASES: number[][] = [];
for (const n of [9, 11, 14, 15, 19, 20, 23, 24, 29, 30, 35, 39]) {
  for (let age = 10; age <= 17; age++) {
    for (const k of [0.5, 1, 1.5, 2]) {
      const t = age + (n + 1) * k;
      if (Number.isInteger(t) && t >= 26 && t <= 58) TEACHER_CASES.push([n, age, k]);
    }
  }
}

// ---------------------------------------------------------------------------
// The bank
// ---------------------------------------------------------------------------

export default defineBank('quantitative', 'percentages-ratios', (b) => [
  // ======================= Percentages =======================
  b.dynamic('percent-of-number', { difficulty: 1, origin: 'past-paper', tags: ['percentages'] }, (r) => {
    const p = r.pick([5, 8, 12, 15, 16, 24, 35, 45, 55, 64, 72, 75, 85, 120, 125, 150]);
    const unit = 100 / gcd(p, 100);
    const complement = p < 100 && r.chance(0.5);
    const n = unit * r.int(Math.ceil(80 / unit), Math.floor((complement ? 2400 : 4000) / unit));
    const part = (p * n) / 100;
    const fmt = (x: number): string => `$${nx(x)}$`;
    if (complement) {
      const city = r.pick(CITIES);
      const ans = n - part;
      const { answer, distractors } = numericOptions(r, {
        correct: ans,
        wrong: [part, n - p, (ans * 100) / n], // took the day scholars; subtracted the percentage itself; gave the percentage
        format: fmt,
        fallback: 'offset',
      });
      return {
        stem: tex`A college in ${city} has ${n} students, of whom $${p}\%$ are day scholars and the rest live in the hostel. The number of hostel residents is:`,
        answer,
        distractors,
        explanation: tex`Hostel residents are $(100 - ${p})\% = ${100 - p}\%$ of the students: $\frac{${100 - p}}{100} \times ${n} = ${nx(ans)}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: part,
      wrong: tidyOnly([part * 10, part / 10, n - part, (n * 100) / p]),
      format: fmt,
    });
    return {
      stem: tex`$${p}\%$ of ${n} is:`,
      answer,
      distractors,
      explanation: tex`$${p}\% \text{ of } ${n} = \frac{${p}}{100} \times ${n} = ${nx(part)}$.`,
    };
  }),

  b.dynamic('what-percent', { difficulty: 1, tags: ['percentages'] }, (r) => {
    const p = r.pick([2.5, 5, 7.5, 12.5, 15, 20, 25, 30, 37.5, 40, 45, 60, 62.5, 75, 80, 87.5, 120, 125, 150, 175]);
    const unit = 1000 / gcd(p * 10, 1000);
    const marks = p >= 25 && p <= 100 && r.chance(0.5);
    const whole = unit * r.int(Math.max(1, Math.ceil(40 / unit)), Math.floor((marks ? 1200 : 3000) / unit));
    const part = (whole * p) / 100;
    const { answer, distractors } = numericOptions(r, {
      correct: p,
      wrong: tidyOnly([10000 / p, 100 - p, p / 100]).filter((x) => x > 0),
      format: pc,
      fallback: 'offset',
    });
    const stem = marks
      ? `In an entry test, a candidate scored ${nx(part)} marks out of ${whole}. The percentage of marks obtained is:`
      : `${nx(part)} is what percent of ${whole}?`;
    return {
      stem,
      answer,
      distractors,
      explanation: tex`Percentage $= \frac{\text{part}}{\text{whole}} \times 100 = \frac{${nx(part)}}{${whole}} \times 100 = ${nx(p)}\%$.`,
    };
  }),

  b.dynamic('percent-change', { difficulty: 1, tags: ['percentages'] }, (r) => {
    const up = r.chance(0.5);
    const p = up ? r.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75]) : r.pick([5, 10, 15, 20, 25, 30, 40, 50]);
    const old = r.multiple(120, 5000, 20);
    const diff = (old * p) / 100;
    const now = up ? old + diff : old - diff;
    const item = r.pick(['a school bag', 'a cricket bat', 'a ceiling fan', 'a pair of joggers', 'a gas cylinder refill']);
    const city = r.pick(CITIES);
    const { answer, distractors } = numericOptions(r, {
      correct: p,
      wrong: tidyOnly([(diff * 100) / now, (now * 100) / old]),
      format: pc,
      fallback: 'offset',
    });
    return {
      stem: `In ${city}, the price of ${item} ${up ? 'rose' : 'fell'} from ${money(old)} to ${money(now)}. The percentage ${up ? 'increase' : 'decrease'} in price is:`,
      answer,
      distractors,
      explanation: tex`Percentage change is always taken on the **original** price: $\frac{${nx(diff)}}{${old}} \times 100 = ${p}\%$. (Dividing by the new price, ${nx(now)}, is the common mistake.)`,
    };
  }),

  b.dynamic('successive-change', { difficulty: 2, origin: 'past-paper', tags: ['percentages'] }, (r) => {
    const kind = r.pick(['up-down', 'down-up', 'up-up', 'discounts'] as const);
    let a = 0;
    let c = 0;
    let x = 0;
    let y = 0;
    let net = 0;
    for (let tries = 0; tries < 50; tries++) {
      a = r.multiple(10, 50, 5);
      c = r.multiple(10, 50, 5);
      x = kind === 'down-up' || kind === 'discounts' ? -a : a;
      y = kind === 'up-down' || kind === 'discounts' ? -c : c;
      net = x + y + (x * y) / 100;
      if (net !== 0 && x + y !== 0) break;
    }
    if (kind === 'discounts') {
      const single = -net;
      const { answer, distractors } = numericOptions(r, {
        correct: single,
        wrong: [a + c, a + c + (a * c) / 100, (a * c) / 100, Math.abs(a - c)],
        format: pc,
      });
      return {
        stem: tex`A shop in Lahore offers two successive discounts of $${a}\%$ and $${c}\%$. These are equivalent to a single discount of:`,
        answer,
        distractors,
        explanation: tex`Single discount $= a + b - \frac{ab}{100} = ${a} + ${c} - \frac{(${a})(${c})}{100} = ${nx(single)}\%$. The second discount is taken on the already reduced price, so it is less than $${a + c}\%$.`,
      };
    }
    const wrong = [x + y, x + y - (x * y) / 100, -net];
    const { answer, distractors } = numericOptions(r, {
      correct: net,
      wrong,
      format: (v) => changeText(v),
      allowNegative: true,
      allowZero: true,
    });
    const stem =
      kind === 'up-up'
        ? tex`The population of a town increases by $${a}\%$ in one year and by $${c}\%$ in the next year. The total change over the two years is:`
        : kind === 'up-down'
          ? tex`The price of a motorcycle is first increased by $${a}\%$ and then the new price is decreased by $${c}\%$. The net effect on the original price is:`
          : tex`The price of a motorcycle is first decreased by $${a}\%$ and then the new price is increased by $${c}\%$. The net effect on the original price is:`;
    return {
      stem,
      answer,
      distractors,
      explanation: tex`For successive changes $x\%$ and $y\%$, net change $= x + y + \frac{xy}{100}$. Here $${nx(x)} + ${signedNum(y)} + \frac{(${nx(x)})(${nx(y)})}{100} = ${nx(net)}\%$, i.e. a $${nx(Math.abs(net))}\%$ ${net > 0 ? 'increase' : 'decrease'}.`,
    };
  }),

  b.dynamic('reverse-percent', { difficulty: 2, tags: ['percentages'] }, (r) => {
    const up = r.chance(0.5);
    const p = up ? r.pick([5, 10, 15, 20, 25, 30, 40, 50, 60]) : r.pick([5, 10, 15, 20, 25, 30, 40, 50]);
    const original = r.multiple(200, 8000, 20);
    const now = up ? (original * (100 + p)) / 100 : (original * (100 - p)) / 100;
    const wrong = up
      ? [(now * (100 - p)) / 100, (now * 100) / (100 - p), now - p]
      : [(now * (100 + p)) / 100, (now * 100) / (100 + p), now + p];
    const { answer, distractors } = numericOptions(r, {
      correct: original,
      wrong: tidyOnly(wrong),
      format: money,
    });
    const stem = up
      ? tex`After a $${p}\%$ increase, the price of a laptop bag is ${money(now)}. Its price before the increase was:`
      : tex`After a discount of $${p}\%$, a pair of shoes is sold for ${money(now)}. The marked price of the shoes was:`;
    const factor = up ? 100 + p : 100 - p;
    return {
      stem,
      answer,
      distractors,
      explanation: tex`The ${up ? 'new' : 'sale'} price is $${factor}\%$ of the original, so original $= \frac{${nx(now)} \times 100}{${factor}} = ${nx(original)}$, i.e. ${money(original)}. Taking $${p}\%$ of the ${up ? 'new' : 'sale'} price is wrong because the percentage was applied to the original.`,
    };
  }),

  b.dynamic('pass-marks', { difficulty: 2, origin: 'past-paper', tags: ['percentages'] }, (r) => {
    if (r.chance(0.5)) {
      const combos: Array<[number, number]> = [];
      for (const m of [150, 200, 250, 300, 400, 500, 600, 800, 1000, 1100, 1200]) {
        for (const q of [33, 35, 36, 40, 45, 50, 60]) if ((m * q) % 100 === 0) combos.push([m, q]);
      }
      const [max, q] = r.pick(combos);
      const pass = (max * q) / 100;
      const short = r.int(4, Math.min(40, Math.floor(pass / 3)));
      const got = pass - short;
      const { answer, distractors } = numericOptions(r, {
        correct: max,
        wrong: [(got * 100) / q, ((got - short) * 100) / q, pass, got + short * 2].filter((v) => Number.isInteger(v)),
        format: (v) => `$${nx(v)}$`,
      });
      return {
        stem: tex`To pass an examination a candidate needs $${q}\%$ of the maximum marks. A candidate obtained ${got} marks and failed by ${short} marks. The maximum marks are:`,
        answer,
        distractors,
        explanation: tex`Pass mark $= ${got} + ${short} = ${pass}$, which is $${q}\%$ of the maximum. Maximum $= \frac{${pass} \times 100}{${q}} = ${max}$.`,
      };
    }
    const lo = r.multiple(20, 40, 5);
    const q = lo + r.multiple(5, 15, 5);
    const hi = q + r.multiple(5, 20, 5);
    const max = r.multiple(200, 1000, 100);
    const x = (max * (q - lo)) / 100;
    const y = (max * (hi - q)) / 100;
    const pass = (max * q) / 100;
    const askPass = r.chance(0.5);
    const { answer, distractors } = numericOptions(r, {
      correct: askPass ? pass : max,
      wrong: askPass
        ? [(max * lo) / 100, (max * hi) / 100, (max * lo) / 100 - x]
        : [(100 * (x + y)) / (lo + hi), (100 * Math.abs(y - x)) / (hi - lo), ((x + y) * 100) / hi].filter((v) => Number.isInteger(v)),
      format: (v) => `$${nx(v)}$`,
      fallback: 'integer',
    });
    return {
      stem: tex`In a test, Ali scored $${lo}\%$ of the maximum marks and failed by ${x} marks, while Sara scored $${hi}\%$ and got ${y} marks more than the pass mark. ${askPass ? 'The pass mark is:' : 'The maximum marks are:'}`,
      answer,
      distractors,
      explanation: tex`The gap between them is $(${hi} - ${lo})\% = ${hi - lo}\%$ of the maximum, which equals $${x} + ${y} = ${x + y}$ marks. Maximum $= \frac{${x + y} \times 100}{${hi - lo}} = ${max}$. Pass mark $= ${(max * lo) / 100} + ${x} = ${pass}$.`,
    };
  }),

  b.dynamic('salary-spending', { difficulty: 3, tags: ['percentages'] }, (r) => {
    let a = 0;
    let c = 0;
    do {
      a = r.pick([10, 15, 20, 25, 30, 40]);
      c = r.pick([10, 20, 25, 30, 40, 50]);
    } while (a + c >= 90);
    const salary = r.multiple(30000, 200000, 2000);
    const saved = (salary * (100 - a) * (100 - c)) / 10000;
    const { answer, distractors } = numericOptions(r, {
      correct: salary,
      wrong: tidyOnly([(saved * 100) / (100 - a - c), (saved * 100) / (100 - c), (saved * 100) / (100 - a), saved * (1 + (a + c) / 100)], 0),
      format: money,
      fallback: 'integer',
    });
    return {
      stem: tex`A government employee in Islamabad spends $${a}\%$ of his monthly salary on house rent and $${c}\%$ of the **remaining** amount on household expenses. He saves ${money(saved)} a month. His monthly salary is:`,
      answer,
      distractors,
      explanation: tex`Savings $= S \times \frac{${100 - a}}{100} \times \frac{${100 - c}}{100}$. So $S = \frac{${saved} \times 100 \times 100}{${100 - a} \times ${100 - c}} = ${salary}$, i.e. ${money(salary)}. Adding $${a}\% + ${c}\%$ is wrong because the second percentage is of the remainder.`,
    };
  }),

  // ======================= Profit and loss =======================
  b.dynamic('profit-percent', { difficulty: 1, tags: ['profit and loss'] }, (r) => {
    const gain = r.chance(0.6);
    const p = gain ? r.pick([5, 10, 20, 25, 40, 50]) : r.pick([5, 10, 20, 25, 40]);
    const unit = 100 / gcd(p, 100);
    const cost = unit * r.int(Math.ceil(5 / unit), Math.floor(80 / unit));
    const sell = gain ? (cost * (100 + p)) / 100 : (cost * (100 - p)) / 100;
    const diff = Math.abs(sell - cost);
    const fruit = r.pick(['bananas', 'oranges', 'eggs', 'samosas']);
    const { answer, distractors } = numericOptions(r, {
      correct: p,
      wrong: tidyOnly([(diff * 100) / sell, (sell * 100) / cost]),
      format: pc,
      fallback: 'offset',
    });
    return {
      stem: tex`A vendor buys ${fruit} at ${money(cost * 12)} per dozen and sells them at ${money(sell)} each. His ${gain ? 'profit' : 'loss'} percent is:`,
      answer,
      distractors,
      explanation: tex`Cost of one $= \frac{${cost * 12}}{12} = ${cost}$. ${gain ? 'Profit' : 'Loss'} per item $= ${nx(diff)}$. ${gain ? 'Profit' : 'Loss'} $\% = \frac{${nx(diff)}}{${cost}} \times 100 = ${p}\%$ (always on the cost price).`,
    };
  }),

  b.dynamic('selling-price', { difficulty: 1, tags: ['profit and loss'] }, (r) => {
    const gain = r.chance(0.5);
    const p = r.pick([5, 8, 10, 12, 15, 20, 25, 30, 35, 40]);
    const unit = 100 / gcd(p, 100);
    const cost = unit * r.int(Math.ceil(300 / unit), Math.floor(30000 / unit));
    const sell = gain ? (cost * (100 + p)) / 100 : (cost * (100 - p)) / 100;
    const item = r.pick(['a used mobile phone', 'a sewing machine', 'a bicycle', 'a microwave oven', 'a water pump']);
    const { answer, distractors } = numericOptions(r, {
      correct: sell,
      wrong: tidyOnly([gain ? (cost * (100 - p)) / 100 : (cost * (100 + p)) / 100, (cost * p) / 100, gain ? cost + p : cost - p, gain ? (cost * 100) / (100 - p) : (cost * 100) / (100 + p)]),
      format: money,
    });
    return {
      stem: tex`A shopkeeper buys ${item} for ${money(cost)} and sells it at a ${gain ? 'profit' : 'loss'} of $${p}\%$. The selling price is:`,
      answer,
      distractors,
      explanation: tex`$\text{S.P.} = \text{C.P.} \times \frac{100 ${gain ? '+' : '-'} ${p}}{100} = ${cost} \times \frac{${gain ? 100 + p : 100 - p}}{100} = ${nx(sell)}$, i.e. ${money(sell)}.`,
    };
  }),

  b.dynamic('resell-for-gain', { difficulty: 2, tags: ['profit and loss'] }, (r) => {
    const firstGain = r.chance(0.4);
    const p = r.pick([5, 10, 15, 20, 25]);
    const q = firstGain ? p + r.multiple(5, 20, 5) : r.pick([5, 10, 15, 20, 25, 30]);
    const cost = r.multiple(400, 12000, 20);
    const s1 = (cost * (firstGain ? 100 + p : 100 - p)) / 100;
    const target = (cost * (100 + q)) / 100;
    const wrong = firstGain
      ? [(s1 * (100 + q)) / 100, (s1 * (100 + q - p)) / 100, cost, s1 + (s1 * (q - p)) / 100]
      : [(s1 * (100 + q)) / 100, (s1 * (100 + p + q)) / 100, cost, s1 + (cost * q) / 100];
    const { answer, distractors } = numericOptions(r, {
      correct: target,
      wrong: tidyOnly(wrong),
      format: money,
    });
    const item = r.pick(['a wrist watch', 'an electric kettle', 'a study table', 'a rice cooker']);
    return {
      stem: tex`By selling ${item} for ${money(s1)}, a shopkeeper ${firstGain ? 'gains' : 'loses'} $${p}\%$. To gain $${q}\%$, he should sell it for:`,
      answer,
      distractors,
      explanation: tex`C.P. $= \frac{${nx(s1)} \times 100}{${firstGain ? 100 + p : 100 - p}} = ${cost}$. Required S.P. $= ${cost} \times \frac{${100 + q}}{100} = ${nx(target)}$, i.e. ${money(target)}.`,
    };
  }),

  b.dynamic('markup-discount', { difficulty: 2, tags: ['profit and loss', 'percentages'] }, (r) => {
    let m = 0;
    let d = 0;
    let g = 0;
    do {
      m = r.pick([10, 20, 25, 30, 40, 50, 60]);
      d = r.pick([5, 10, 15, 20, 25, 30]);
      g = ((100 + m) * (100 - d)) / 100 - 100;
    } while (g === 0 || m === d);
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: g,
        wrong: [m - d, m - d + (m * d) / 100, -g],
        format: gainLoss,
        allowNegative: true,
        allowZero: true,
      });
      return {
        stem: tex`A shopkeeper marks his goods $${m}\%$ above the cost price and then allows a discount of $${d}\%$ on the marked price. His overall result is:`,
        answer,
        distractors,
        explanation: tex`Take C.P. $= 100$. Marked price $= ${100 + m}$; after the discount S.P. $= ${100 + m} \times \frac{${100 - d}}{100} = ${nx(100 + g)}$. So the result is a ${g > 0 ? 'gain' : 'loss'} of $${nx(Math.abs(g))}\%$, not simply $${m} - ${d}$.`,
      };
    }
    const cost = r.multiple(400, 20000, 400);
    const sell = (cost * (100 + m) * (100 - d)) / 10000;
    const { answer, distractors } = numericOptions(r, {
      correct: sell,
      wrong: [(cost * (100 + m - d)) / 100, (cost * (100 + m)) / 100, (cost * (100 - d)) / 100],
      format: money,
    });
    return {
      stem: tex`A trader buys a carpet for ${money(cost)}, marks it $${m}\%$ above the cost price and then gives a $${d}\%$ discount. The selling price of the carpet is:`,
      answer,
      distractors,
      explanation: tex`Marked price $= ${cost} \times \frac{${100 + m}}{100} = ${nx((cost * (100 + m)) / 100)}$. S.P. $= ${nx((cost * (100 + m)) / 100)} \times \frac{${100 - d}}{100} = ${nx(sell)}$, i.e. ${money(sell)}.`,
    };
  }),

  b.dynamic('same-sp-gain-loss', { difficulty: 3, origin: 'past-paper', tags: ['profit and loss'] }, (r) => {
    const x = r.pick([5, 10, 15, 20, 25, 30]);
    const lossPct = (x * x) / 100;
    const item = r.pick(['mobile phones', 'bicycles', 'sewing machines', 'ceiling fans']);
    if (r.chance(0.5)) {
      const answer = tex`A loss of $${nx(lossPct)}\%$`;
      const distractors = pickDistractors(answer, [
        'Neither gain nor loss',
        tex`A gain of $${nx(lossPct)}\%$`,
        tex`A loss of $${x}\%$`,
        tex`A loss of $${nx(2 * lossPct)}\%$`,
      ]);
      return {
        stem: tex`A trader sold two ${item} at the same price. On one he gained $${x}\%$ and on the other he lost $${x}\%$. On the whole transaction he made:`,
        answer,
        distractors,
        explanation: tex`When two items are sold at the same price with an equal gain and loss of $x\%$, the result is always a loss of $\frac{x^2}{100}\% = \frac{${x}^2}{100}\% = ${nx(lossPct)}\%$. The item sold at a loss cost more, so the loss outweighs the gain.`,
      };
    }
    const d1 = (100 + x) / gcd(100 + x, 100);
    const d2 = (100 - x) / gcd(100 - x, 100);
    const unit = lcm(d1, d2);
    const sell = unit * r.int(Math.ceil(600 / unit), Math.floor(30000 / unit));
    const c1 = (sell * 100) / (100 + x);
    const c2 = (sell * 100) / (100 - x);
    const loss = c1 + c2 - 2 * sell;
    const { answer, distractors } = numericOptions(r, {
      correct: loss,
      wrong: tidyOnly([(2 * sell * lossPct) / 100, c2 - sell, sell - c1, (sell * x) / 100]),
      format: money,
    });
    return {
      stem: tex`A trader sold two ${item} for ${money(sell)} each. On one he gained $${x}\%$ and on the other he lost $${x}\%$. His overall loss is:`,
      answer,
      distractors,
      explanation: tex`C.P. of the first $= \frac{${sell} \times 100}{${100 + x}} = ${nx(c1)}$; C.P. of the second $= \frac{${sell} \times 100}{${100 - x}} = ${nx(c2)}$. Total C.P. $= ${nx(c1 + c2)}$, total S.P. $= ${2 * sell}$, so the loss is ${money(loss)}.`,
    };
  }),

  b.dynamic('cost-n-equals-sp-m', { difficulty: 3, tags: ['profit and loss'] }, (r) => {
    const gain = r.chance(0.6);
    const m = r.pick([4, 5, 8, 10, 16, 20, 25, 40, 50]);
    const k = r.int(1, Math.max(1, Math.min(gain ? m - 1 : Math.floor(m / 2), 10)));
    const n = gain ? m + k : m - k;
    const result = ((n - m) / m) * 100;
    const item = r.pick(['pens', 'notebooks', 'mangoes', 'cricket balls', 'chocolates']);
    const { answer, distractors } = numericOptions(r, {
      correct: result,
      wrong: tidyOnly([((n - m) / n) * 100, -result, n - m]),
      format: gainLoss,
      allowNegative: true,
      fallback: 'offset',
    });
    return {
      stem: `The cost price of ${n} ${item} is equal to the selling price of ${m} ${item}. The result is:`,
      answer,
      distractors,
      explanation: tex`Let one item cost Rs. 1. Then S.P. of ${m} items $= ${n}$, so on ${m} items the ${gain ? 'gain' : 'loss'} is $${Math.abs(n - m)}$ on a cost of $${m}$: $\frac{${Math.abs(n - m)}}{${m}} \times 100 = ${nx(Math.abs(result))}\%$ ${gain ? 'gain' : 'loss'}.`,
    };
  }),

  // ======================= Simple and compound interest =======================
  b.dynamic('simple-interest', { difficulty: 1, origin: 'past-paper', tags: ['simple and compound interest'] }, (r) => {
    const principal = r.multiple(5000, 100000, 1000);
    const rate = r.pick([4, 5, 6, 7.5, 8, 9, 10, 12, 12.5, 15]);
    const t = r.int(2, 6);
    const si = (principal * rate * t) / 100;
    const amount = principal + si;
    const askAmount = r.chance(0.4);
    const oneYear = (principal * rate) / 100;
    const { answer, distractors } = numericOptions(r, {
      correct: askAmount ? amount : si,
      wrong: askAmount ? [si, principal + oneYear, amount + oneYear] : [amount, oneYear, si * 2],
      format: money,
    });
    return {
      stem: tex`Hassan deposits ${money(principal)} in a bank at $${nx(rate)}\%$ per annum simple interest. ${askAmount ? `The amount he will receive after ${t} years is:` : `The interest earned in ${t} years is:`}`,
      answer,
      distractors,
      explanation: tex`$I = \frac{Prt}{100} = \frac{${principal} \times ${nx(rate)} \times ${t}}{100} = ${nx(si)}$.${askAmount ? tex` Amount $= P + I = ${principal} + ${nx(si)} = ${nx(amount)}$.` : ''}`,
    };
  }),

  b.dynamic('si-rate-time', { difficulty: 2, tags: ['simple and compound interest'] }, (r) => {
    const kind = r.pick(['rate', 'time', 'times'] as const);
    if (kind === 'times') {
      const k = r.pick([2, 3, 4]);
      // keep the rate realistic (at most 25% per annum)
      const t = r.pick([4, 5, 8, 10, 16, 20, 25].filter((v) => tidy((100 * (k - 1)) / v) && (100 * (k - 1)) / v <= 25));
      const rate = (100 * (k - 1)) / t;
      const word = k === 2 ? 'doubles' : k === 3 ? 'becomes three times' : 'becomes four times';
      const { answer, distractors } = numericOptions(r, {
        correct: rate,
        wrong: tidyOnly([(100 * k) / t, (50 * (k - 1)) / t, 100 / t]),
        format: pc,
        fallback: 'offset',
      });
      return {
        stem: tex`A sum of money ${word} itself in ${t} years at simple interest. The rate of interest per annum is:`,
        answer,
        distractors,
        explanation: tex`If the sum is $P$, the interest is $${k}P - P = ${k - 1}P$. Then $${k - 1}P = \frac{P \times r \times ${t}}{100}$, so $r = \frac{${100 * (k - 1)}}{${t}} = ${nx(rate)}\%$.`,
      };
    }
    const principal = r.multiple(2000, 100000, 1000);
    const rate = r.pick([4, 5, 6, 8, 10, 12, 15]);
    const t = r.int(2, 8);
    const si = (principal * rate * t) / 100;
    const amount = principal + si;
    if (kind === 'rate') {
      const { answer, distractors } = numericOptions(r, {
        correct: rate,
        wrong: tidyOnly([(si * 100) / principal, (amount * 100) / (principal * t), (si * 100) / (amount * t)]),
        format: pc,
        fallback: 'offset',
      });
      return {
        stem: `A sum of ${money(principal)} amounts to ${money(amount)} in ${t} years at simple interest. The rate of interest per annum is:`,
        answer,
        distractors,
        explanation: tex`Interest $= ${amount} - ${principal} = ${si}$. $r = \frac{100I}{Pt} = \frac{100 \times ${si}}{${principal} \times ${t}} = ${rate}\%$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: t,
      wrong: tidyOnly([(amount * 100) / (principal * rate), (si * 100) / (amount * rate), t + 1, t - 1]).filter((v) => v > 0),
      format: (v) => unitOpt(v, 'year'),
      fallback: 'offset',
    });
    return {
      stem: tex`In how many years will ${money(principal)} amount to ${money(amount)} at $${rate}\%$ per annum simple interest?`,
      answer,
      distractors,
      explanation: tex`Interest $= ${amount} - ${principal} = ${si}$. $t = \frac{100I}{Pr} = \frac{100 \times ${si}}{${principal} \times ${rate}} = ${t}$ years.`,
    };
  }),

  b.dynamic('compound-interest', { difficulty: 2, origin: 'past-paper', tags: ['simple and compound interest'] }, (r) => {
    const kind = r.pick(['ci', 'amount', 'depreciation'] as const);
    const [rate, n] =
      kind === 'depreciation'
        ? r.pick([[10, 2], [20, 2], [5, 2], [15, 2], [25, 2], [10, 3], [20, 3]] as const)
        : r.pick([[10, 2], [20, 2], [5, 2], [15, 2], [8, 2], [12, 2], [10, 3], [20, 3]] as const);
    const base = lcm((100 / gcd(rate, 100)) ** n, 100);
    const principal = base * r.int(Math.max(1, Math.ceil(2000 / base)), Math.floor(100000 / base));
    if (kind === 'depreciation') {
      const value = round((principal * (100 - rate) ** n) / 100 ** n, 2);
      const { answer, distractors } = numericOptions(r, {
        correct: value,
        wrong: tidyOnly([principal * (1 - (rate * n) / 100), round((principal * (100 + rate) ** n) / 100 ** n, 2), principal - value]),
        format: money,
      });
      const item = r.pick(['car', 'tractor', 'delivery van', 'generator']);
      return {
        stem: tex`A ${item} worth ${money(principal)} depreciates at $${rate}\%$ per annum (on its value at the start of each year). Its value after ${n} years will be:`,
        answer,
        distractors,
        explanation: tex`$V = P\left(1 - \frac{r}{100}\right)^n = ${principal}\left(\frac{${100 - rate}}{100}\right)^{${n}} = ${nx(value)}$, i.e. ${money(value)}.`,
      };
    }
    const amount = round((principal * (100 + rate) ** n) / 100 ** n, 2);
    const ci = round(amount - principal, 2);
    const si = (principal * rate * n) / 100;
    const { answer, distractors } = numericOptions(r, {
      correct: kind === 'ci' ? ci : amount,
      // C.I.: used simple interest; gave the amount; gave only C.I. - S.I.
      wrong: kind === 'ci' ? [si, amount, round(ci - si, 2)] : [principal + si, ci, round(amount + (principal * rate) / 100, 2)],
      format: money,
    });
    return {
      stem: tex`The ${kind === 'ci' ? 'compound interest' : 'amount'} on ${money(principal)} for ${n} years at $${rate}\%$ per annum, compounded annually, is:`,
      answer,
      distractors,
      explanation: tex`$A = P\left(1 + \frac{r}{100}\right)^n = ${principal}\left(\frac{${100 + rate}}{100}\right)^{${n}} = ${nx(amount)}$.${kind === 'ci' ? tex` C.I. $= A - P = ${nx(amount)} - ${principal} = ${nx(ci)}$.` : ''}`,
    };
  }),

  b.dynamic('ci-si-difference', { difficulty: 3, tags: ['simple and compound interest'] }, (r) => {
    const rate = r.pick([4, 5, 8, 10, 12, 15, 20]);
    const base = lcm(10000 / gcd(rate * rate, 10000), 100);
    const principal = base * r.int(Math.max(1, Math.ceil(2000 / base)), Math.floor(200000 / base));
    const diff = (principal * rate * rate) / 10000;
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: diff,
        // one year's interest; doubled; the 2-year simple interest itself
        wrong: tidyOnly([(principal * rate) / 100, 2 * diff, (2 * principal * rate) / 100], 0),
        format: money,
      });
      return {
        stem: tex`The difference between compound interest (compounded annually) and simple interest on ${money(principal)} for 2 years at $${rate}\%$ per annum is:`,
        answer,
        distractors,
        explanation: tex`For 2 years, $\text{C.I.} - \text{S.I.} = P\left(\frac{r}{100}\right)^2 = ${principal}\left(\frac{${rate}}{100}\right)^2 = ${nx(diff)}$. It is the interest earned in year 2 on the first year's interest.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: principal,
      wrong: tidyOnly([(diff * 100) / rate, principal / 2, principal * 2, (diff * 10000) / (2 * rate)]),
      format: money,
    });
    return {
      stem: tex`The difference between the compound interest (compounded annually) and the simple interest on a certain sum for 2 years at $${rate}\%$ per annum is ${money(diff)}. The sum is:`,
      answer,
      distractors,
      explanation: tex`$\text{C.I.} - \text{S.I.} = P\left(\frac{r}{100}\right)^2$, so $P = ${nx(diff)} \times \left(\frac{100}{${rate}}\right)^2 = ${principal}$, i.e. ${money(principal)}.`,
    };
  }),

  // ======================= Ratio and proportion =======================
  b.dynamic('divide-in-ratio', { difficulty: 1, origin: 'past-paper', tags: ['ratio and proportion'] }, (r) => {
    const parts = r.pick(RATIO_TRIPLES) as [number, number, number];
    const s = parts[0] + parts[1] + parts[2];
    const k = r.multiple(100, 3000, 50);
    const total = k * s;
    const i = r.int(0, 2);
    const names = r.pick(TRIOS);
    const share = k * (parts[i] as number);
    const others = [0, 1, 2].filter((j) => j !== i).map((j) => k * (parts[j] as number));
    const distractors = pickDistractors(money(share), [
      ...others.map(money),
      money(k * (s - (parts[i] as number))),
      ...(tidy(total / 3) ? [money(total / 3)] : []),
      money(share + k),
      money(share - k),
    ]);
    const business = r.chance(0.5);
    return {
      stem: business
        ? `${names[0]}, ${names[1]} and ${names[2]} invested in a business in the ratio ${parts.join(' : ')}. The year's profit of ${money(total)} is shared in the ratio of their investments. ${names[i]}'s share is:`
        : `${money(total)} is divided among ${names[0]}, ${names[1]} and ${names[2]} in the ratio ${parts.join(' : ')}. ${names[i]}'s share is:`,
      answer: money(share),
      distractors,
      explanation: tex`Total parts $= ${parts.join(' + ')} = ${s}$. One part $= \frac{${total}}{${s}} = ${k}$. ${names[i]}'s share $= ${parts[i]} \times ${k} = ${share}$, i.e. ${money(share)}.`,
    };
  }),

  b.dynamic('proportionals', { difficulty: 1, tags: ['ratio and proportion'] }, (r) => {
    const kind = r.pick(['fourth', 'third', 'mean'] as const);
    const fmt = (v: number): string => `$${nx(v)}$`;
    if (kind === 'fourth') {
      const a = r.int(2, 12);
      const bb = r.intExcept(2, 20, [a]);
      const c = (a / gcd(a, bb)) * r.int(2, 8);
      const x = (bb * c) / a;
      const { answer, distractors } = numericOptions(r, {
        correct: x,
        wrong: tidyOnly([(a * c) / bb, (a * bb) / c, bb + c - a].filter((v) => v > 0)),
        format: fmt,
      });
      return {
        stem: `The fourth proportional to ${a}, ${bb} and ${c} is:`,
        answer,
        distractors,
        explanation: tex`If $${a} : ${bb} = ${c} : x$, then $${a}x = ${bb} \times ${c}$, so $x = \frac{${bb * c}}{${a}} = ${nx(x)}$.`,
      };
    }
    if (kind === 'third') {
      const q = r.int(1, 4);
      const p = q + r.int(1, 5);
      const w = r.int(1, 4);
      const a = q * q * w;
      const bb = p * q * w;
      const third = p * p * w;
      const { answer, distractors } = numericOptions(r, {
        correct: third,
        wrong: tidyOnly([Math.sqrt(a * bb), (a * a) / bb, 2 * bb - a, bb * bb]),
        format: fmt,
      });
      return {
        stem: `The third proportional to ${a} and ${bb} is:`,
        answer,
        distractors,
        explanation: tex`If $${a} : ${bb} = ${bb} : x$, then $x = \frac{${bb}^2}{${a}} = \frac{${bb * bb}}{${a}} = ${third}$.`,
      };
    }
    const u = r.int(1, 5);
    const v = r.intExcept(1, 8, [u]);
    const w = r.int(1, 5);
    const a = w * u * u;
    const bb = w * v * v;
    const mean = w * u * v;
    const { answer, distractors } = numericOptions(r, {
      correct: mean,
      wrong: tidyOnly([(a + bb) / 2, (bb * bb) / a, (a * bb) / 2, a + bb]),
      format: fmt,
    });
    return {
      stem: `The mean proportional between ${a} and ${bb} is:`,
      answer,
      distractors,
      explanation: tex`If $${a} : x = x : ${bb}$, then $x^2 = ${a} \times ${bb} = ${a * bb}$, so $x = ${mean}$. (The arithmetic mean $\frac{${a} + ${bb}}{2}$ is a different quantity.)`,
    };
  }),

  b.dynamic('compound-ratio', { difficulty: 2, tags: ['ratio and proportion'] }, (r) => {
    let p = 0;
    let q = 0;
    let rr = 0;
    let s = 0;
    do {
      p = r.int(1, 9);
      q = r.int(2, 9);
      rr = r.int(2, 9);
      s = r.int(1, 9);
    } while (gcd(p, q) !== 1 || gcd(rr, s) !== 1 || q === rr || p === q || rr === s);
    const [x, y, z] = reduce(p * rr, q * rr, q * s) as [number, number, number];
    const names = r.pick(TRIOS);
    const askThree = r.chance(0.5);
    const intro = `If the ratio of ${names[0]}'s salary to ${names[1]}'s salary is ${p} : ${q} and that of ${names[1]}'s salary to ${names[2]}'s salary is ${rr} : ${s}, then`;
    if (askThree) {
      const answer = ratioTex(x, y, z);
      const distractors = pickDistractors(answer, [
        ratioTex(p, q, s),
        ratioTex(p * s, q * rr, q * s),
        ratioTex(p, rr, s),
        ratioTex(z, y, x),
        ratioTex(p * rr, q * s, q * rr),
      ]);
      return {
        stem: `${intro} the ratio of the three salaries (in the order given) is:`,
        answer,
        distractors,
        explanation: tex`Make ${names[1]}'s term equal: $${p} : ${q} = ${p * rr} : ${q * rr}$ and $${rr} : ${s} = ${q * rr} : ${q * s}$. So the ratio is $${p * rr} : ${q * rr} : ${q * s}${x === p * rr ? '' : ` = ${x} : ${y} : ${z}`}$.`,
      };
    }
    const answer = ratioTex(p * rr, q * s);
    const distractors = pickDistractors(answer, [
      ratioTex(p, s),
      ratioTex(p * s, q * rr),
      ratioTex(q * s, p * rr),
      ratioTex(p + rr, q + s),
    ]);
    return {
      stem: `${intro} the ratio of ${names[0]}'s salary to ${names[2]}'s salary is:`,
      answer,
      distractors,
      explanation: tex`$\frac{A}{C} = \frac{A}{B} \times \frac{B}{C} = \frac{${p}}{${q}} \times \frac{${rr}}{${s}} = \frac{${p * rr}}{${q * s}}$, so the ratio is ${answer}.`,
    };
  }),

  b.dynamic('ages-ratio', { difficulty: 2, tags: ['ratio and proportion'] }, (r) => {
    const [a, bb, m, k] = r.pick(AGE_CASES) as [number, number, number, number];
    const son = a * m;
    const father = bb * m;
    const [c, d] = reduce(son + k, father + k) as [number, number];
    const name = r.pick(['Ali', 'Saad', 'Usman', 'Hamza', 'Ahmed']);
    const ax = a === 1 ? 'x' : `${a}x`;
    const askFather = r.chance(0.5);
    const { answer, distractors } = numericOptions(r, {
      correct: askFather ? father : son,
      wrong: askFather ? [father + k, son, father - k] : [son + k, father, son - k].filter((v) => v > 0),
      format: (v) => unitOpt(v, 'year'),
    });
    return {
      stem: `The present ages of ${name} and his father are in the ratio ${a} : ${bb}. After ${k} years the ratio of their ages will be ${c} : ${d}. ${askFather ? 'The present age of the father is:' : `${name}'s present age is:`}`,
      answer,
      distractors,
      explanation: tex`Let the ages be $${ax}$ and $${bb}x$. Then $\frac{${ax} + ${k}}{${bb}x + ${k}} = \frac{${c}}{${d}}$, so $${d}(${ax} + ${k}) = ${c}(${bb}x + ${k})$, giving ${c * bb - d * a === 1 ? '' : tex`$${c * bb - d * a}x = ${d * k - c * k}$ and `}$x = ${m}$. Ages: ${name} $= ${son}$, father $= ${father}$ years.`,
    };
  }),

  // ======================= Mixtures =======================
  b.dynamic('mixture-price', { difficulty: 2, origin: 'past-paper', tags: ['mixtures'] }, (r) => {
    let x = 0;
    let y = 0;
    do {
      x = r.int(1, 7);
      y = r.int(1, 7);
    } while (x === y || gcd(x, y) !== 1);
    const u = r.pick([5, 10, 15, 20]);
    const p = r.multiple(80, 400, 10);
    const mid = p + x * u;
    const q = mid + y * u;
    const goods = r.pick([
      ['rice', 'Basmati', 'Sella'],
      ['tea', 'Kenyan', 'local'],
      ['lentils', 'red', 'yellow'],
    ] as const);
    if (r.chance(0.5)) {
      const answer = ratioTex(y, x);
      const distractors = pickDistractors(answer, [ratioTex(x, y), ratioTex(p, q), ratioTex(y, x + y), ratioTex(q, p), ratioTex(x + y, x)]);
      return {
        stem: `In what ratio must ${goods[0]} costing ${money(p)} per kg be mixed with ${goods[0]} costing ${money(q)} per kg so that the mixture costs ${money(mid)} per kg?`,
        answer,
        distractors,
        explanation: tex`By alligation, cheaper : dearer $= (${q} - ${mid}) : (${mid} - ${p}) = ${y * u} : ${x * u} = ${y} : ${x}$.`,
      };
    }
    const sc = r.int(1, 8);
    const cheapKg = y * sc;
    const dearKg = x * sc;
    const swapped = (dearKg * p + cheapKg * q) / (cheapKg + dearKg);
    const { answer, distractors } = numericOptions(r, {
      correct: mid,
      wrong: tidyOnly([(p + q) / 2, swapped, (cheapKg * p + dearKg * q) / Math.max(cheapKg, dearKg)]),
      format: (v) => `${money(v)} per kg`,
    });
    return {
      stem: `A shopkeeper mixes ${cheapKg} kg of ${goods[0]} costing ${money(p)} per kg with ${dearKg} kg of ${goods[0]} costing ${money(q)} per kg. The cost of the mixture per kg is:`,
      answer,
      distractors,
      explanation: tex`Cost per kg $= \frac{${cheapKg}(${p}) + ${dearKg}(${q})}{${cheapKg} + ${dearKg}} = \frac{${cheapKg * p + dearKg * q}}{${cheapKg + dearKg}} = ${mid}$. The simple average $\frac{${p} + ${q}}{2}$ is wrong because the quantities are unequal.`,
    };
  }),

  b.dynamic('milk-water', { difficulty: 3, tags: ['mixtures', 'ratio and proportion'] }, (r) => {
    let a = 0;
    let bb = 0;
    let c = 0;
    let d = 0;
    let k = 0;
    for (let tries = 0; tries < 200; tries++) {
      [a, bb, c, d] = r.pick(MIX_CASES) as [number, number, number, number];
      const waterAdd = c * bb < a * d;
      const step = waterAdd ? c : d;
      const kMin = Math.ceil(20 / ((a + bb) * step));
      const kMax = Math.floor(120 / ((a + bb) * step));
      if (kMax >= kMin && kMax >= 1) {
        k = step * r.int(Math.max(1, kMin), kMax);
        break;
      }
    }
    const vol = (a + bb) * k;
    const milk = a * k;
    const water = bb * k;
    const addWater = c * bb < a * d; // c:d has less milk than a:b
    const fmt = (v: number): string => unitOpt(v, 'litre');
    if (addWater) {
      const newWater = (milk * d) / c;
      const add = newWater - water;
      const { answer, distractors } = numericOptions(r, {
        correct: add,
        wrong: tidyOnly([newWater, (vol * d) / c - water, (d - bb) * k].filter((v) => v > 0)),
        format: fmt,
      });
      return {
        stem: `A mixture of ${vol} litres contains milk and water in the ratio ${a} : ${bb}. How much water must be added to make the ratio of milk to water ${c} : ${d}?`,
        answer,
        distractors,
        explanation: tex`Milk $= \frac{${a}}{${a + bb}} \times ${vol} = ${milk}$ L and water $= ${water}$ L. Milk stays the same, so the new water $= ${milk} \times \frac{${d}}{${c}} = ${nx(newWater)}$ L. Water to add $= ${nx(newWater)} - ${water} = ${nx(add)}$ L.`,
      };
    }
    const newMilk = (water * c) / d;
    const add = newMilk - milk;
    const { answer, distractors } = numericOptions(r, {
      correct: add,
      wrong: tidyOnly([newMilk, (vol * c) / d - milk, (c - a) * k].filter((v) => v > 0)),
      format: fmt,
    });
    return {
      stem: `A mixture of ${vol} litres contains milk and water in the ratio ${a} : ${bb}. How much milk must be added to make the ratio of milk to water ${c} : ${d}?`,
      answer,
      distractors,
      explanation: tex`Milk $= ${milk}$ L and water $= \frac{${bb}}{${a + bb}} \times ${vol} = ${water}$ L. Water stays the same, so the new milk $= ${water} \times \frac{${c}}{${d}} = ${nx(newMilk)}$ L. Milk to add $= ${nx(newMilk)} - ${milk} = ${nx(add)}$ L.`,
    };
  }),

  // ======================= Averages =======================
  b.dynamic('average-runs-table', { difficulty: 1, origin: 'past-paper', tags: ['averages'] }, (r) => {
    const n = r.pick([5, 6]);
    const runs: number[] = [];
    for (let i = 0; i < n - 1; i++) runs.push(r.int(12, 118));
    const partial = runs.reduce((s, v) => s + v, 0);
    const options: number[] = [];
    for (let v = 10; v <= 120; v++) if ((partial + v) % n === 0) options.push(v);
    runs.push(r.pick(options));
    const total = partial + (runs[n - 1] as number);
    const mean = total / n;
    const sorted = [...runs].sort((p, q) => p - q);
    const median = n % 2 ? (sorted[(n - 1) / 2] as number) : ((sorted[n / 2 - 1] as number) + (sorted[n / 2] as number)) / 2;
    const table = [
      `| Match | ${runs.map((_, i) => i + 1).join(' | ')} |`,
      `| --- | ${runs.map(() => '---').join(' | ')} |`,
      `| Runs | ${runs.join(' | ')} |`,
    ].join('\n');
    // Whole-number distractors only, so the (whole-number) answer is not singled out by its format.
    const { answer, distractors } = numericOptions(r, {
      correct: mean,
      wrong: tidyOnly([total / (n - 1), total / (n + 1), median, partial / (n - 1)], 0),
      format: (v) => `$${nx(v)}$`,
      fallback: 'integer',
    });
    return {
      stem: `The runs scored by a batsman in ${n} one-day matches are given below.\n\n${table}\n\nHis average score per match is:`,
      answer,
      distractors,
      explanation: tex`Average $= \frac{\text{total runs}}{\text{matches}} = \frac{${runs.join(' + ')}}{${n}} = \frac{${total}}{${n}} = ${nx(mean)}$.`,
    };
  }),

  b.dynamic('combined-average', { difficulty: 1, tags: ['averages'] }, (r) => {
    let n1 = 0;
    let n2 = 0;
    let a1 = 0;
    let a2 = 0;
    for (let tries = 0; tries < 100; tries++) {
      n1 = r.pick([20, 25, 30, 40, 50, 60]);
      n2 = r.pick([20, 25, 30, 40, 50, 60]);
      if (n1 === n2) continue;
      a1 = r.int(45, 80);
      const cands: number[] = [];
      for (let v = 40; v <= 90; v++) if (v !== a1 && (n1 * a1 + n2 * v) % (n1 + n2) === 0) cands.push(v);
      if (cands.length) {
        a2 = r.pick(cands);
        break;
      }
    }
    const comb = (n1 * a1 + n2 * a2) / (n1 + n2);
    // Every distractor stays between the two section averages (anything outside is eliminable at sight).
    const lo = Math.min(a1, a2);
    const hi = Math.max(a1, a2);
    const { answer, distractors } = numericOptions(r, {
      correct: comb,
      wrong: tidyOnly([(a1 + a2) / 2, (n2 * a1 + n1 * a2) / (n1 + n2), ...r.shuffle([comb + 1, comb - 1]), comb + 2, comb - 2]).filter(
        (v) => v >= lo && v <= hi,
      ),
      format: (v) => `$${nx(v)}$`,
      fallback: 'offset',
    });
    return {
      stem: `In a class test, the ${n1} students of Section A averaged ${a1} marks and the ${n2} students of Section B averaged ${a2} marks. The average mark of all the students is:`,
      answer,
      distractors,
      explanation: tex`Combined average $= \frac{${n1}(${a1}) + ${n2}(${a2})}{${n1} + ${n2}} = \frac{${n1 * a1 + n2 * a2}}{${n1 + n2}} = ${nx(comb)}$. The plain average of ${a1} and ${a2} ignores the different section sizes.`,
    };
  }),

  b.dynamic('new-average', { difficulty: 2, tags: ['averages'] }, (r) => {
    if (r.chance(0.5)) {
      const [n, age, k] = r.pick(TEACHER_CASES) as [number, number, number];
      const teacher = age + (n + 1) * k;
      const { answer, distractors } = numericOptions(r, {
        correct: teacher,
        wrong: tidyOnly([age + n * k, age + k, age + (n - 1) * k]),
        format: (v) => `$${nx(v)}$ years`,
      });
      return {
        stem: tex`The average age of ${n} students of a class is ${age} years. When the teacher's age is included, the average increases by ${k === 0.5 ? 'half a year' : `${nx(k)} year${k === 1 ? '' : 's'}`}. The teacher's age is:`,
        answer,
        distractors,
        explanation: tex`Total of students $= ${n} \times ${age} = ${n * age}$. New total $= ${n + 1} \times ${nx(age + k)} = ${nx((n + 1) * (age + k))}$. Teacher $= ${nx((n + 1) * (age + k))} - ${n * age} = ${nx(teacher)}$ years.`,
      };
    }
    const n = r.int(9, 24);
    const k = r.int(1, 5);
    const avg = r.int(22, 60);
    const score = avg + n * k;
    const { answer, distractors } = numericOptions(r, {
      correct: avg,
      wrong: tidyOnly([avg - k, score / (n + 1), score - (n + 1) * k]),
      format: (v) => `$${nx(v)}$`,
    });
    return {
      stem: `A batsman scores ${score} runs in his ${ordinal(n + 1)} innings and thereby increases his average by ${k} run${k === 1 ? '' : 's'}. His average after the ${ordinal(n + 1)} innings is:`,
      answer,
      distractors,
      explanation: tex`Let the new average be $x$; the old average was $x - ${k}$. Then $${n}(x - ${k}) + ${score} = ${n + 1}x$, so $x = ${score} - ${n}(${k}) = ${avg}$.`,
    };
  }),

  b.dynamic('corrected-mean', { difficulty: 2, tags: ['averages'] }, (r) => {
    const n = r.pick([10, 20, 25, 50]);
    const avg = r.int(30, 80);
    const diff = r.int(5, 60) * r.sign();
    const correct = r.int(Math.max(15, 15 - diff), Math.min(99, 99 - diff));
    const wrongVal = correct + diff; // recorded value
    const fixed = avg + (correct - wrongVal) / n;
    const delta = (correct - wrongVal) / n;
    const { answer, distractors } = numericOptions(r, {
      correct: fixed,
      // sign slip; divided by n - 1; forgot to divide by n; doubled the correction
      wrong: tidyOnly([avg - delta, avg + (correct - wrongVal) / (n - 1), avg + (correct - wrongVal), avg + 2 * delta]),
      format: (v) => `$${nx(v)}$`,
      fallback: 'offset',
    });
    return {
      stem: `The mean of ${n} observations was calculated as ${avg}. It was later found that one observation, ${correct}, had been wrongly recorded as ${wrongVal}. The correct mean is:`,
      answer,
      distractors,
      explanation: tex`Wrong total $= ${n} \times ${avg} = ${n * avg}$. Correct total $= ${n * avg} - ${wrongVal} + ${correct} = ${n * avg - wrongVal + correct}$. Correct mean $= \frac{${n * avg - wrongVal + correct}}{${n}} = ${nx(fixed)}$.`,
    };
  }),

  // ======================= Fixed questions =======================
  ...b.mcqs([
    {
      id: 'percent-as-fraction',
      d: 1,
      t: ['percentages'],
      q: tex`$12\frac{1}{2}\%$ expressed as a fraction is:`,
      a: tex`$\frac{1}{8}$`,
      x: [tex`$\frac{3}{25}$`, tex`$\frac{1}{12}$`, tex`$\frac{1}{4}$`],
      e: tex`$12\frac{1}{2}\% = \frac{12.5}{100} = \frac{125}{1000} = \frac{1}{8}$.`,
    },
    {
      id: 'ci-si-first-year',
      d: 1,
      t: ['simple and compound interest'],
      q: 'On the same sum and at the same rate, the compound interest (compounded annually) for the first year, compared with the simple interest for the first year, is:',
      a: 'equal to it',
      x: ['greater than it', 'less than it', 'double of it'],
      e: 'In the first year, compound interest is calculated on the principal only, exactly like simple interest, so the two are equal. They differ from the second year onwards.',
    },
    {
      id: 'mean-after-transformation',
      d: 1,
      t: ['averages'],
      q: 'The mean of a set of numbers is 15. If every number is multiplied by 3 and then 4 is added to each result, the new mean is:',
      a: '$49$',
      x: ['$45$', '$19$', '$57$'],
      e: tex`The mean follows the same operations: $3(15) + 4 = 49$. ($45$ forgets the $+4$; $57 = 3(15 + 4)$ adds before multiplying.)`,
    },
    {
      id: 'duplicate-ratio',
      d: 1,
      t: ['ratio and proportion'],
      q: 'The duplicate ratio of 3 : 5 is:',
      a: '$9 : 25$',
      x: ['$6 : 10$', '$27 : 125$', tex`$\sqrt{3} : \sqrt{5}$`],
      e: tex`The duplicate ratio of $a : b$ is $a^2 : b^2$, so $3^2 : 5^2 = 9 : 25$. ($27 : 125$ is the triplicate ratio and $\sqrt{3} : \sqrt{5}$ the sub-duplicate ratio.)`,
    },
    {
      id: 'more-than-less-than',
      d: 2,
      o: 'past-paper',
      t: ['percentages'],
      q: "Kashif's salary is 25% more than Naveed's salary. By what percent is Naveed's salary less than Kashif's?",
      a: tex`$20\%$`,
      x: [tex`$25\%$`, tex`$30\%$`, tex`$12.5\%$`],
      e: tex`Let Naveed's salary be $100$; Kashif's is $125$. Naveed's is less by $\frac{25}{125} \times 100 = 20\%$. The base changes, so the answer is not $25\%$.`,
    },
    {
      id: 'price-rise-consumption',
      d: 2,
      o: 'past-paper',
      t: ['percentages'],
      q: 'The price of sugar rises by 20%. By what percent must a household reduce its consumption so that its expenditure on sugar does not change?',
      a: tex`$16\frac{2}{3}\%$`,
      x: [tex`$20\%$`, tex`$25\%$`, tex`$18\%$`],
      e: tex`New price $= 1.2$ times old, so consumption must be $\frac{1}{1.2} = \frac{5}{6}$ of before. Reduction $= \frac{1}{6} \times 100 = 16\frac{2}{3}\%$, i.e. $\frac{20}{120} \times 100$.`,
    },
  ]),
]);
