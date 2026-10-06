import { defineBank } from '@/engine/authoring';
import { factorial, frac, Fraction, median, nCr, nPr, num, numericOptions, ordinal, pickDistractors, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

/*
 * Statistics, Counting and Data Interpretation (NET Business, Quantitative Mathematics).
 *
 *   Mean, median, mode   raw lists, batting averages, combined means, frequency tables,
 *                        median from cumulative frequency, conceptual properties.
 *   Tables and charts    percentage change from a sales table, share of a total,
 *                        ratios from a table, pie-chart sectors.
 *   Probability          dice, coloured balls, cards, coins, two draws without replacement.
 *   Counting             numbers from digits, arrangements of words, committees,
 *                        round-robin matches, persons kept together in a row.
 */

/** Wraps LaTeX in `$...$`. */
const m = (latex: string): string => `$${latex}$`;
/** A probability / fraction option. */
const fo = (f: Fraction): string => m(f.toTex());
/** Keeps only proper probabilities strictly between 0 and 1 and formats them. */
const probs = (fs: readonly Fraction[]): string[] => fs.filter((f) => f.n > 0 && f.compare(1) < 0).map(fo);
/** Thousands separators for plain text: 12500 -> "12,500". */
const commas = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** Integer in math mode with KaTeX-safe thousands separators. */
const big = (n: number): string => m(commas(n).replace(/,/g, '{,}'));
/** Rupee amount as plain text. */
const rs = (n: number): string => `Rs. ${commas(n)}`;
/** A pipe table from a header row and body rows, surrounded by blank lines. */
const table = (header: readonly (string | number)[], rows: readonly (readonly (string | number)[])[]): string =>
  [
    '',
    `| ${header.join(' | ')} |`,
    `|${header.map(() => '---').join('|')}|`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
    '',
  ].join('\n');

/** Splits `total` chunks among `parts` buckets, each getting at least `min`. */
function partition(r: Rng, total: number, parts: number, min: number): number[] {
  const out = Array<number>(parts).fill(min);
  for (let i = 0; i < total - parts * min; i++) {
    const k = r.int(0, parts - 1);
    out[k] = (out[k] as number) + 1;
  }
  return out;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June'] as const;

export default defineBank('quantitative', 'statistics-data', (b) => [
  // ---------------------------------------------------------------------------
  // Mean, median and mode
  // ---------------------------------------------------------------------------
  b.dynamic('mean-of-list', { difficulty: 1, origin: 'past-paper', tags: ['mean, median and mode'] }, (r) => {
    const n = r.int(5, 7);
    const ctx = r.pick([
      { lead: 'A batsman scored the following runs in his last', unit: 'innings', what: 'his mean score per innings' },
      { lead: 'Ali obtained the following marks in his last', unit: 'class tests', what: 'his mean mark' },
      { lead: 'A shop in Lahore sold the following numbers of mobile phones on', unit: 'consecutive days', what: 'the mean number sold per day' },
    ]);
    const xs = Array.from({ length: n - 1 }, () => r.int(12, 75));
    const partial = xs.reduce((s, x) => s + x, 0);
    let last = r.int(12, 75);
    last += (n - ((partial + last) % n)) % n;
    xs.push(last);
    const total = partial + last;
    const mu = total / n;
    const { answer, distractors } = numericOptions(r, {
      correct: mu,
      wrong: [median(xs), total / (n - 1), mu + 2, mu - 2],
      format: (v) => m(num(v)),
    });
    return {
      stem: `${ctx.lead} ${n} ${ctx.unit}: ${xs.join(', ')}. What is ${ctx.what}?`,
      answer,
      distractors,
      explanation: tex`Mean $= \dfrac{\text{sum of values}}{\text{number of values}} = \dfrac{${total}}{${n}} = ${num(mu)}$.`,
    };
  }),

  b.dynamic('median-of-list', { difficulty: 1, tags: ['mean, median and mode'] }, (r) => {
    const n = r.int(6, 8);
    // Realistic May maxima for Multan: 30-48 °C.
    const xs = r.sample(
      Array.from({ length: 19 }, (_, i) => i + 30),
      n,
    );
    const sorted = [...xs].sort((a, c) => a - c);
    const med = median(xs);
    const unsortedMid = n % 2 ? (xs[(n - 1) / 2] as number) : ((xs[n / 2 - 1] as number) + (xs[n / 2] as number)) / 2;
    const lo = sorted[Math.floor((n - 1) / 2)] as number;
    const hi = sorted[Math.ceil((n - 1) / 2) + 1] as number;
    const mu = xs.reduce((s, x) => s + x, 0) / n;
    const { answer, distractors } = numericOptions(r, {
      correct: med,
      wrong: [unsortedMid, n % 2 ? hi : lo, Math.round(mu), sorted[Math.floor(n / 2) - 1] as number, sorted[Math.floor(n / 2)] as number],
      format: (v) => m(num(v)),
      fallback: 'offset',
    });
    const how =
      n % 2
        ? tex`the middle (${ordinal((n + 1) / 2)}) value is $${med}$.`
        : tex`the median is the mean of the ${ordinal(n / 2)} and ${ordinal(n / 2 + 1)} values: $\dfrac{${sorted[n / 2 - 1]} + ${sorted[n / 2]}}{2} = ${num(med)}$.`;
    return {
      stem: `The maximum temperatures (in °C) recorded in Multan on ${n} days in May were: ${xs.join(', ')}. The median of these temperatures is:`,
      answer,
      distractors,
      explanation: `Arrange in order: ${sorted.join(', ')}. With ${n} values, ${how} (Taking the middle of the unsorted list is a common mistake.)`,
    };
  }),

  b.dynamic('mode-of-list', { difficulty: 1, tags: ['mean, median and mode'] }, (r) => {
    const sizes = r.sample([5, 6, 7, 8, 9, 10, 11], 5);
    const [mode, second, ...rest] = sizes as [number, number, number, number, number];
    const top = r.int(4, 5);
    const xs = r.shuffle([
      ...Array<number>(top).fill(mode),
      ...Array<number>(top - 1 - r.int(0, 1)).fill(second),
      ...rest.flatMap((x) => Array<number>(r.int(1, 2)).fill(x)),
    ]);
    const sorted = [...xs].sort((a, c) => a - c);
    const candidates = [second, median(xs), Math.max(...xs), Math.min(...xs), ...rest];
    const distractors = pickDistractors(
      m(String(mode)),
      candidates.filter((x) => Number.isInteger(x)).map((x) => m(String(x))),
    );
    return {
      stem: `A shoe shop in Rawalpindi recorded the sizes of the shoes sold in one hour: ${xs.join(', ')}. The modal shoe size is:`,
      answer: m(String(mode)),
      distractors,
      explanation: `The mode is the most frequent value. In order: ${sorted.join(', ')}. Size ${mode} occurs ${top} times, more than any other size, so the mode is ${mode}.`,
    };
  }),

  b.dynamic('required-next-score', { difficulty: 2, origin: 'past-paper', tags: ['mean, median and mode'] }, (r) => {
    if (r.chance(0.5)) {
      const k = r.int(4, 12);
      const avg = r.int(25, 60);
      const rise = r.int(2, 6);
      const need = (k + 1) * (avg + rise) - k * avg;
      const { answer, distractors } = numericOptions(r, {
        correct: need,
        wrong: [avg + rise, avg + k * rise, (k + 1) * (avg + rise), avg + (k - 1) * rise],
        format: (v) => m(String(v)),
      });
      return {
        stem: `A batsman has an average of ${avg} runs in his first ${k} innings. How many runs must he score in the next innings to raise his average to ${avg + rise}?`,
        answer,
        distractors,
        explanation: tex`Runs needed $= (\text{new total}) - (\text{old total}) = ${k + 1}(${avg + rise}) - ${k}(${avg}) = ${(k + 1) * (avg + rise)} - ${k * avg} = ${need}$.`,
      };
    }
    const n = r.int(4, 5);
    const target = r.int(60, 80);
    let xs: number[] = [];
    let need = 0;
    for (let t = 0; t < 50; t++) {
      xs = Array.from({ length: n - 1 }, () => r.int(target - 15, target + 12));
      need = n * target - xs.reduce((s, x) => s + x, 0);
      if (need >= 40 && need <= 100 && !xs.includes(need)) break;
    }
    if (need < 40 || need > 100 || xs.includes(need)) {
      xs = Array.from({ length: n - 1 }, (_, i) => target - 4 + 3 * i);
      need = n * target - xs.reduce((s, x) => s + x, 0);
    }
    const sumKnown = xs.reduce((s, x) => s + x, 0);
    const { answer, distractors } = numericOptions(r, {
      correct: need,
      wrong: [target, 2 * target - Math.round(sumKnown / (n - 1)), Math.round(sumKnown / (n - 1)), need + 5],
      format: (v) => m(String(v)),
    });
    return {
      stem: `Sana scored ${xs.join(', ')} marks (out of 100) in her first ${n - 1} tests. What must she score in the ${n === 4 ? 'fourth' : 'fifth'} test so that her mean score over all ${n} tests is exactly ${target}?`,
      answer,
      distractors,
      explanation: tex`Required total $= ${n} \times ${target} = ${n * target}$. Marks so far $= ${sumKnown}$, so she needs $${n * target} - ${sumKnown} = ${need}$.`,
    };
  }),

  b.dynamic('combined-mean', { difficulty: 2, tags: ['mean, median and mode'] }, (r) => {
    let n1 = 0;
    let n2 = 0;
    let m1 = 0;
    let m2 = 0;
    for (let t = 0; t < 400; t++) {
      n1 = r.multiple(10, 50, 5);
      n2 = r.multiple(10, 50, 5);
      m1 = r.int(40, 75);
      m2 = m1 + r.intExcept(-18, 18, [-1, 0, 1]);
      if (n1 !== n2 && (n1 * m1 + n2 * m2) % (n1 + n2) === 0) break;
    }
    if ((n1 * m1 + n2 * m2) % (n1 + n2) !== 0 || n1 === n2) {
      n1 = 20;
      n2 = 30;
      m1 = 50;
      m2 = 60;
    }
    const c = (n1 * m1 + n2 * m2) / (n1 + n2);
    const { answer, distractors } = numericOptions(r, {
      correct: c,
      wrong: [(m1 + m2) / 2, (n1 * m2 + n2 * m1) / (n1 + n2), (n1 * m1 + n2 * m2) / Math.max(n1, n2)],
      format: (v) => m(num(v)),
    });
    return {
      stem: `In a test, the ${n1} students of section A had a mean score of ${m1} and the ${n2} students of section B had a mean score of ${m2}. The mean score of all ${n1 + n2} students is:`,
      answer,
      distractors,
      explanation: tex`Combined mean $= \dfrac{n_1\bar{x}_1 + n_2\bar{x}_2}{n_1 + n_2} = \dfrac{${n1}(${m1}) + ${n2}(${m2})}{${n1 + n2}} = \dfrac{${n1 * m1 + n2 * m2}}{${n1 + n2}} = ${num(c)}$. The simple average of the two means ignores the different section sizes.`,
    };
  }),

  b.dynamic('frequency-table-mean', { difficulty: 2, tags: ['mean, median and mode', 'tables and charts'] }, (r) => {
    const start = r.int(0, 2);
    const xs = [0, 1, 2, 3, 4].map((i) => start + i);
    let fs: number[] = [];
    let sf = 0;
    let sfx = 0;
    for (let t = 0; t < 400; t++) {
      fs = xs.map(() => r.int(2, 12));
      sf = fs.reduce((s, f) => s + f, 0);
      sfx = fs.reduce((s, f, i) => s + f * (xs[i] as number), 0);
      if ((sfx * 10) % sf === 0) break;
    }
    if ((sfx * 10) % sf !== 0) {
      fs = [4, 6, 5, 3, 2];
      sf = 20;
      sfx = fs.reduce((s, f, i) => s + f * (xs[i] as number), 0);
    }
    const mu = sfx / sf;
    const { answer, distractors } = numericOptions(r, {
      correct: mu,
      wrong: [xs.reduce((s, x) => s + x, 0) / 5, sfx / 5, sf / 5, mu + 0.5],
      format: (v) => m(num(v)),
    });
    const tbl = table(['Number of children', ...xs], [['Number of families', ...fs]]);
    return {
      stem: `A survey of families in a Faisalabad neighbourhood gave the following data:\n${tbl}\nThe mean number of children per family is:`,
      answer,
      distractors,
      explanation: tex`Mean $= \dfrac{\sum fx}{\sum f} = \dfrac{${fs.map((f, i) => `${f}(${xs[i]})`).join(' + ')}}{${sf}} = \dfrac{${sfx}}{${sf}} = ${num(mu)}$.`,
    };
  }),

  b.dynamic('frequency-table-median', { difficulty: 3, tags: ['mean, median and mode', 'tables and charts'] }, (r) => {
    const start = r.int(4, 6);
    const xs = [0, 1, 2, 3, 4].map((i) => start + i);
    let fs: number[] = [];
    let med = 0;
    let modeX = 0;
    let ok = false;
    for (let t = 0; t < 400 && !ok; t++) {
      fs = xs.map(() => r.int(1, 12));
      const total = fs.reduce((s, f) => s + f, 0);
      if (total % 2 === 0) continue;
      const pos = (total + 1) / 2;
      let cum = 0;
      med = xs[xs.length - 1] as number;
      for (let i = 0; i < xs.length; i++) {
        cum += fs[i] as number;
        if (cum >= pos) {
          med = xs[i] as number;
          break;
        }
      }
      const maxF = Math.max(...fs);
      const modes = xs.filter((_, i) => fs[i] === maxF);
      modeX = modes[0] as number;
      ok = modes.length === 1 && med !== xs[2] && med !== modeX;
    }
    if (!ok) {
      fs = [9, 7, 3, 2, 4];
      med = xs[1] as number;
      modeX = xs[0] as number;
    }
    const n = fs.reduce((s, f) => s + f, 0);
    const cums = fs.map((_, i) => fs.slice(0, i + 1).reduce((s, f) => s + f, 0));
    const others = xs.filter((x) => x !== med && x !== xs[2] && x !== modeX);
    const distractors = pickDistractors(m(String(med)), [xs[2] as number, modeX, ...others].map((x) => m(String(x))));
    const tbl = table(['Marks (out of 10)', ...xs], [['Number of students', ...fs]]);
    return {
      stem: `The marks of a group of students in a short quiz are shown below:\n${tbl}\nThe median mark is:`,
      answer: m(String(med)),
      distractors,
      explanation: `There are ${n} students, so the median is the ${ordinal((n + 1) / 2)} value in order. Cumulative frequencies: ${cums.join(', ')}. The cumulative frequency first reaches ${(n + 1) / 2} at ${med} marks, so the median is ${med}. (The middle column of the table and the most frequent mark are both traps.)`,
    };
  }),

  // ---------------------------------------------------------------------------
  // Tables and charts
  // ---------------------------------------------------------------------------
  b.dynamic('sales-table-percent-change', { difficulty: 2, tags: ['tables and charts'] }, (r) => {
    let base = 0;
    let p = 0;
    for (let t = 0; t < 200; t++) {
      base = r.pick([40, 50, 60, 75, 80, 100, 120, 125, 150, 160, 200, 240, 250]);
      p = r.multiple(5, 60, 5);
      if ((base * p) % 100 === 0) break;
    }
    if ((base * p) % 100 !== 0) {
      base = 80;
      p = 25;
    }
    const decrease = r.chance(0.35);
    const later = (base * (decrease ? 100 - p : 100 + p)) / 100;
    const i = r.int(0, 3);
    const j = r.int(i + 1, 4);
    const sales = MONTHS.slice(0, 5).map(() => r.int(Math.round(base * 0.6), Math.round(base * 1.4)));
    sales[i] = base;
    sales[j] = later;
    const from = sales[i] as number;
    const to = sales[j] as number;
    const diff = Math.abs(to - from);
    const pct = (diff / from) * 100;
    const { answer, distractors } = numericOptions(r, {
      correct: pct,
      wrong: [(diff / to) * 100, diff, (to / from) * 100, pct + 5],
      format: (v) => m(`${num(v)}\\%`),
    });
    const tbl = table(
      ['Month', ...MONTHS.slice(0, 5)],
      [['Sales (Rs. thousand)', ...sales]],
    );
    const word = decrease ? 'decrease' : 'increase';
    return {
      stem: `The monthly sales of a shop in Islamabad are given below:\n${tbl}\nWhat is the percentage ${word} in sales from ${MONTHS[i]} to ${MONTHS[j]}?`,
      answer,
      distractors,
      explanation: tex`Percentage ${word} $= \dfrac{\text{change}}{\text{original}} \times 100 = \dfrac{${diff}}{${from}} \times 100 = ${num(pct)}\%$. Divide by the ${MONTHS[i]} (original) value, not the ${MONTHS[j]} value.`,
    };
  }),

  b.dynamic('enrolment-table-share', { difficulty: 1, tags: ['tables and charts'] }, (r) => {
    const programs = ['BBA', 'BS Accounting', 'BS Economics', 'BS Computer Science', 'BS Mathematics'];
    const total = r.pick([200, 400, 600, 800, 1000, 1200]);
    let pcts: number[] = [];
    for (let t = 0; t < 100; t++) {
      pcts = partition(r, 20, 5, 2).map((k) => k * 5);
      if (new Set(pcts).size >= 4) break;
    }
    const counts = pcts.map((p) => (p * total) / 100);
    const tbl = table(['Programme', 'Students'], programs.map((p, i) => [p, counts[i] as number]));
    const a = r.int(0, 4);
    if (r.chance(0.5)) {
      const ca = counts[a] as number;
      const pa = pcts[a] as number;
      const { answer, distractors } = numericOptions(r, {
        correct: pa,
        wrong: [(ca / (total - ca)) * 100, 100 - pa, pa + 5, pa - 5],
        format: (v) => m(`${num(v)}\\%`),
      });
      return {
        stem: `The number of students in each programme of a university is shown below:\n${tbl}\nWhat percentage of all the students are enrolled in ${programs[a]}?`,
        answer,
        distractors,
        explanation: tex`Total $= ${counts.join(' + ')} = ${total}$. Percentage $= \dfrac{${ca}}{${total}} \times 100 = ${pa}\%$.`,
      };
    }
    let c = r.intExcept(0, 4, [a]);
    for (let t = 0; t < 10 && pcts[c] === pcts[a]; t++) c = r.intExcept(0, 4, [a]);
    if (pcts[c] === pcts[a]) {
      pcts = [10, 15, 20, 25, 30];
      counts.splice(0, 5, ...pcts.map((p) => (p * total) / 100));
    }
    const ca = counts[a] as number;
    const cc = counts[c] as number;
    const ratio = (x: number, y: number): string => {
      const f = new Fraction(x, y);
      return m(`${f.n} : ${f.d}`);
    };
    const tbl2 = table(['Programme', 'Students'], programs.map((p, i) => [p, counts[i] as number]));
    const answer = ratio(ca, cc);
    const distractors = pickDistractors(answer, [ratio(cc, ca), ratio(ca, total), ratio(ca, ca + cc), ratio(cc, total)]);
    return {
      stem: `The number of students in each programme of a university is shown below:\n${tbl2}\nThe ratio of ${programs[a]} students to ${programs[c]} students is:`,
      answer,
      distractors,
      explanation: tex`Ratio $= ${ca} : ${cc}$. Dividing both terms by their HCF gives ${answer}.`,
    };
  }),

  b.dynamic('pie-chart-budget', { difficulty: 2, origin: 'past-paper', tags: ['tables and charts'] }, (r) => {
    const items = ['Food', 'House rent', 'Education', 'Utility bills', 'Savings'];
    const perDeg = r.pick([100, 120, 125, 150, 200, 250]);
    const total = 360 * perDeg;
    let angles: number[] = [];
    for (let t = 0; t < 100; t++) {
      angles = partition(r, 20, 5, 2).map((k) => k * 18);
      if (new Set(angles).size === 5) break;
    }
    if (new Set(angles).size !== 5) angles = [36, 54, 72, 90, 108];
    const tbl = table(['Expense', 'Central angle'], items.map((it, i) => [it, `${angles[i]}°`]));
    const a = r.int(0, 4);
    const th = angles[a] as number;
    const variant = r.int(0, 2);
    if (variant === 0) {
      const amt = th * perDeg;
      const { answer, distractors } = numericOptions(r, {
        correct: amt,
        wrong: [(th * total) / 100, (th * total) / 180, (angles[(a + 1) % 5] as number) * perDeg],
        format: rs,
      });
      return {
        stem: `A family in Peshawar spends its monthly income of Rs. ${commas(total)} as shown by the central angles of a pie chart:\n${tbl}\nHow much does the family spend on ${items[a]?.toLowerCase()}?`,
        answer,
        distractors,
        explanation: tex`Amount $= \dfrac{\text{angle}}{360^\circ} \times \text{total} = \dfrac{${th}}{360} \times ${total} = ${amt}$, i.e. ${rs(amt)}.`,
      };
    }
    if (variant === 1) {
      const pct = th / 3.6;
      const { answer, distractors } = numericOptions(r, {
        correct: pct,
        wrong: [th, th / 3, 100 - pct],
        format: (v) => m(`${num(v)}\\%`),
      });
      return {
        stem: `A family's monthly budget is shown by the central angles of a pie chart:\n${tbl}\nWhat percentage of the budget is spent on ${items[a]?.toLowerCase()}?`,
        answer,
        distractors,
        explanation: tex`Percentage $= \dfrac{${th}}{360} \times 100 = ${num(pct)}\%$.`,
      };
    }
    let c = r.intExcept(0, 4, [a]);
    if ((angles[c] as number) > th) c = angles.indexOf(Math.min(...angles.filter((x) => x < th)));
    if (c < 0 || c === a) {
      // `a` has the smallest angle: compare the largest with it instead.
      const hi = angles.indexOf(Math.max(...angles));
      return buildDiff(hi, a);
    }
    return buildDiff(a, c);

    function buildDiff(x: number, y: number) {
      const d = ((angles[x] as number) - (angles[y] as number)) * perDeg;
      const { answer, distractors } = numericOptions(r, {
        correct: d,
        wrong: [(angles[x] as number) * perDeg, (((angles[x] as number) - (angles[y] as number)) * total) / 100, d * 2],
        format: rs,
      });
      return {
        stem: `A family in Peshawar spends its monthly income of Rs. ${commas(total)} as shown by the central angles of a pie chart:\n${tbl}\nHow much more is spent on ${items[x]?.toLowerCase()} than on ${items[y]?.toLowerCase()}?`,
        answer,
        distractors,
        explanation: tex`Difference in angles $= ${angles[x]}^\circ - ${angles[y]}^\circ = ${(angles[x] as number) - (angles[y] as number)}^\circ$. Amount $= \dfrac{${(angles[x] as number) - (angles[y] as number)}}{360} \times ${total} = ${d}$, i.e. ${rs(d)}.`,
      };
    }
  }),

  // ---------------------------------------------------------------------------
  // Probability
  // ---------------------------------------------------------------------------
  b.dynamic('two-dice-event', { difficulty: 2, origin: 'past-paper', tags: ['probability'] }, (r) => {
    const outcomes: [number, number][] = [];
    for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) outcomes.push([i, j]);
    const s = r.int(3, 11);
    const k = r.pick([3, 4, 5]);
    const events = [
      { text: `the sum of the numbers is ${s}`, test: (x: number, y: number) => x + y === s },
      { text: `the sum of the numbers is greater than ${s}`, test: (x: number, y: number) => x + y > s },
      { text: `the sum of the numbers is a multiple of ${k}`, test: (x: number, y: number) => (x + y) % k === 0 },
      { text: 'both dice show the same number', test: (x: number, y: number) => x === y },
      { text: `the numbers on the two dice differ by ${k - 2}`, test: (x: number, y: number) => Math.abs(x - y) === k - 2 },
    ];
    const ev = r.pick(events);
    const hits = outcomes.filter(([x, y]) => ev.test(x, y));
    const count = hits.length;
    const ans = frac(count, 36);
    const cand = probs([frac(36 - count, 36), frac(count + 1, 36), frac(count - 1, 36), frac(1, 11), frac(count, 18), frac(1, 6)]);
    const answer = fo(ans);
    const distractors = pickDistractors(answer, cand);
    const shown = count <= 6 ? `, namely ${hits.map(([x, y]) => `(${x}, ${y})`).join(', ')}` : '';
    return {
      stem: `Two fair dice are rolled together. What is the probability that ${ev.text}?`,
      answer,
      distractors,
      explanation: tex`There are $6 \times 6 = 36$ equally likely outcomes. Favourable outcomes: ${count}${shown}. So $P = \dfrac{${count}}{36} = ${ans.toTex()}$.`,
    };
  }),

  b.dynamic('bag-single-draw', { difficulty: 1, origin: 'past-paper', tags: ['probability'] }, (r) => {
    const [red, green, blue] = r.sample([2, 3, 4, 5, 6, 7, 8, 9], 3) as [number, number, number];
    const total = red + green + blue;
    const variant = r.int(0, 2);
    const [text, fav] =
      variant === 0
        ? (['green', green] as const)
        : variant === 1
          ? (['not red', green + blue] as const)
          : (['either red or blue', red + blue] as const);
    const ans = frac(fav, total);
    const answer = fo(ans);
    const cand = probs([
      frac(fav, total - fav),
      frac(total - fav, total),
      variant === 2 ? frac(red * blue, total * total) : frac(fav, total + 1),
      variant === 0 ? frac(1, 3) : frac(2, 3),
      frac(fav, total - 1),
    ]);
    return {
      stem: `A bag contains ${red} red, ${green} green and ${blue} blue balls. One ball is drawn at random. The probability that it is ${text} is:`,
      answer,
      distractors: pickDistractors(answer, cand),
      explanation: tex`Total balls $= ${red} + ${green} + ${blue} = ${total}$. Favourable balls $= ${fav}$. $P = \dfrac{${fav}}{${total}}${ans.d === total ? '' : ` = ${ans.toTex()}`}$.`,
    };
  }),

  b.dynamic('two-draws-without-replacement', { difficulty: 3, tags: ['probability', 'permutations and combinations'] }, (r) => {
    const red = r.int(3, 8);
    const white = r.intExcept(2, 8, [red]);
    const n = red + white;
    const both = r.chance(0.5);
    const pairs = nCr(n, 2);
    const fav = both ? nCr(red, 2) : red * white;
    const ans = frac(fav, pairs);
    const answer = fo(ans);
    const reduced = ans.d === pairs ? '' : ` = ${ans.toTex()}`;
    const cand = both
      ? [frac(red * red, n * n), frac(red * (red - 1), n * n), frac(red, n), frac(nCr(red, 2), n * n)]
      : [frac(red * white, n * (n - 1)), frac(2 * red * white, n * n), frac(red * white, n * n), frac(1, 2)];
    return {
      stem: `A box contains ${red} red and ${white} white balls. Two balls are drawn at random without replacement. What is the probability that ${both ? 'both are red' : 'one is red and the other is white'}?`,
      answer,
      distractors: pickDistractors(answer, probs(cand)),
      explanation: both
        ? tex`$P = \dfrac{^{${red}}C_2}{^{${n}}C_2} = \dfrac{${fav}}{${pairs}}${reduced}$ (equivalently $\dfrac{${red}}{${n}} \times \dfrac{${red - 1}}{${n - 1}}$).`
        : tex`$P = \dfrac{^{${red}}C_1 \times {^{${white}}C_1}}{^{${n}}C_2} = \dfrac{${fav}}{${pairs}}${reduced}$. Forgetting that the red ball can come first or second gives half of this.`,
    };
  }),

  b.dynamic('card-draw', { difficulty: 1, tags: ['probability'] }, (r) => {
    const events = [
      { t: 'a king', c: 4, why: 'There are 4 kings.', trap: 1 },
      { t: 'a heart', c: 13, why: 'There are 13 hearts.', trap: 4 },
      { t: 'a face card (jack, queen or king)', c: 12, why: 'There are 3 face cards in each of 4 suits: 12.', trap: 16 },
      { t: 'a red card', c: 26, why: 'Hearts and diamonds give 26 red cards.', trap: 13 },
      { t: 'a red king', c: 2, why: 'The king of hearts and the king of diamonds: 2 cards.', trap: 4 },
      { t: 'an ace or a king', c: 8, why: '4 aces + 4 kings = 8 cards.', trap: 16 },
      { t: 'a king or a heart', c: 16, why: '4 kings + 13 hearts - 1 (king of hearts counted twice) = 16.', trap: 17 },
      { t: 'neither a king nor a queen', c: 44, why: '52 - 4 kings - 4 queens = 44 cards.', trap: 48 },
      { t: 'a black face card', c: 6, why: 'Jack, queen and king of spades and of clubs: 6 cards.', trap: 12 },
      { t: 'a spade or a red card', c: 39, why: '13 spades + 26 red cards = 39 (no overlap).', trap: 26 },
    ];
    const ev = r.pick(events);
    const ans = frac(ev.c, 52);
    const answer = fo(ans);
    const cand = probs([frac(ev.trap, 52), frac(52 - ev.c, 52), frac(ev.c, 52 - ev.c), frac(ev.c + 2, 52), frac(1, 4), frac(ev.c - 2, 52), frac(1, 13)]);
    return {
      stem: `A card is drawn at random from a well-shuffled pack of 52 playing cards. The probability that it is ${ev.t} is:`,
      answer,
      distractors: pickDistractors(answer, cand),
      explanation: tex`${ev.why} $P = \dfrac{${ev.c}}{52}${ans.d === 52 ? '' : ` = ${ans.toTex()}`}$.`,
    };
  }),

  b.dynamic('coins-tossed', { difficulty: 2, tags: ['probability'] }, (r) => {
    const k = r.int(2, 5);
    const total = 2 ** k;
    const variant = r.int(0, 2);
    const ev =
      variant === 0
        ? { t: 'at least one head', fav: total - 1, why: tex`$P(\text{at least one head}) = 1 - P(\text{no head}) = 1 - \dfrac{1}{${total}}$` }
        : variant === 1
          ? { t: 'exactly one head', fav: k, why: tex`Exactly one head can occur in $^{${k}}C_1 = ${k}$ ways out of $2^{${k}} = ${total}$` }
          : { t: 'exactly two heads', fav: nCr(k, 2), why: tex`Exactly two heads can occur in $^{${k}}C_2 = ${nCr(k, 2)}$ way${nCr(k, 2) > 1 ? 's' : ''} out of $2^{${k}} = ${total}$` };
    const ans = frac(ev.fav, total);
    const answer = fo(ans);
    const cand = probs([frac(1, total), frac(1, 2), frac(ev.fav, 2 * k), frac(total - ev.fav, total), frac(1, k + 1), frac(k - 1, k), frac(ev.fav + 1, total), frac(ev.fav, total + 1)]);
    return {
      stem: `${k === 2 ? 'Two' : k === 3 ? 'Three' : k === 4 ? 'Four' : 'Five'} fair coins are tossed together. The probability of getting ${ev.t} is:`,
      answer,
      distractors: pickDistractors(answer, cand),
      explanation: tex`${ev.why}, so $P = ${ans.toTex()}$.`,
    };
  }),

  // ---------------------------------------------------------------------------
  // Permutations and combinations
  // ---------------------------------------------------------------------------
  b.dynamic('numbers-from-digits', { difficulty: 1, origin: 'past-paper', tags: ['permutations and combinations'] }, (r) => {
    const k = r.int(4, 7);
    const digits = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], k).sort((a, c) => a - c);
    const len = r.int(2, 3);
    const lenWord = len === 2 ? 'two-digit' : 'three-digit';
    const evens = digits.filter((d) => d % 2 === 0).length;
    const variant = evens >= 1 && evens < k ? r.int(0, 2) : r.int(0, 1);
    const list = digits.join(', ');
    if (variant === 0) {
      const ans = nPr(k, len);
      const { answer, distractors } = numericOptions(r, {
        correct: ans,
        wrong: [k ** len, nCr(k, len), k * len, nPr(k, len) / 2],
        format: (v) => m(String(v)),
      });
      return {
        stem: `How many ${lenWord} numbers can be formed from the digits ${list} if no digit is repeated?`,
        answer,
        distractors,
        explanation: tex`Fill the places one by one: $${Array.from({ length: len }, (_, i) => k - i).join(' \\times ')} = {^{${k}}P_{${len}}} = ${ans}$.`,
      };
    }
    if (variant === 1) {
      const ans = k ** len;
      const { answer, distractors } = numericOptions(r, {
        correct: ans,
        wrong: [nPr(k, len), nCr(k, len), k * len, len ** k],
        format: (v) => m(String(v)),
      });
      return {
        stem: `How many ${lenWord} numbers can be formed from the digits ${list} if digits may be repeated?`,
        answer,
        distractors,
        explanation: tex`Each of the ${len} places can take any of the ${k} digits: $${k}^{${len}} = ${ans}$.`,
      };
    }
    const ans = evens * nPr(k - 1, len - 1);
    const { answer, distractors } = numericOptions(r, {
      correct: ans,
      wrong: [nPr(k, len) / 2, evens * k ** (len - 1), nPr(k, len), evens * nCr(k - 1, len - 1)],
      format: (v) => m(num(v)),
    });
    return {
      stem: `How many even ${lenWord} numbers can be formed from the digits ${list} if no digit is repeated?`,
      answer,
      distractors,
      explanation: tex`The units digit must be even: ${evens} choice${evens > 1 ? 's' : ''}. The remaining ${len - 1} place${len > 2 ? 's' : ''} can be filled from the other ${k - 1} digits in $^{${k - 1}}P_{${len - 1}} = ${nPr(k - 1, len - 1)}$ ways. Total $= ${evens} \times ${nPr(k - 1, len - 1)} = ${ans}$.`,
    };
  }),

  b.dynamic('word-arrangements', { difficulty: 2, origin: 'past-paper', tags: ['permutations and combinations'] }, (r) => {
    const word = r.pick([
      'KARACHI', 'PAKISTAN', 'QUETTA', 'SUKKUR', 'PESHAWAR', 'HYDERABAD', 'ABBOTTABAD', 'MARDAN',
      'STATISTICS', 'CRICKET', 'COMMITTEE', 'SUCCESS', 'BALLOON', 'MATHEMATICS', 'ATTOCK', 'MANSEHRA',
    ]);
    const counts = new Map<string, number>();
    for (const ch of word) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    const reps = [...counts.entries()].filter(([, c]) => c > 1);
    const n = word.length;
    const denom = reps.reduce((p, [, c]) => p * factorial(c), 1);
    const ans = factorial(n) / denom;
    const { answer, distractors } = numericOptions(r, {
      correct: ans,
      wrong: [
        factorial(n),
        factorial(n) / reps.reduce((s, [, c]) => s + factorial(c), 0),
        factorial(n - 1) / denom,
        factorial(n) / (2 * denom),
      ].filter((v) => Number.isInteger(v)),
      format: big,
    });
    const repText = reps.map(([ch, c]) => `${ch} ${c === 2 ? 'twice' : `${c} times`}`).join(', ');
    const denTex = reps.map(([, c]) => `${c}!`).join(' \\, ');
    return {
      stem: `In how many different ways can the letters of the word ${word} be arranged?`,
      answer,
      distractors,
      explanation: tex`The word has ${n} letters with ${repText}. Arrangements $= \dfrac{${n}!}{${denTex}} = \dfrac{${factorial(n)}}{${denom}} = ${commas(ans).replace(/,/g, '{,}')}$.`,
    };
  }),

  b.dynamic('committee-selection', { difficulty: 2, origin: 'past-paper', tags: ['permutations and combinations'] }, (r) => {
    const ctx = r.pick([
      { g1: 'batsmen', g2: 'bowlers', team: 'side' },
      { g1: 'men', g2: 'women', team: 'committee' },
      { g1: 'teachers', g2: 'students', team: 'panel' },
    ]);
    const M = r.int(5, 9);
    const W = r.int(4, 7);
    const a = r.int(2, Math.min(4, M - 1));
    const bb = r.int(2, Math.min(3, W - 1));
    const ans = nCr(M, a) * nCr(W, bb);
    const { answer, distractors } = numericOptions(r, {
      correct: ans,
      wrong: [nCr(M + W, a + bb), nCr(M, a) + nCr(W, bb), nPr(M, a) * nPr(W, bb), nCr(M, a) * nPr(W, bb)],
      format: big,
    });
    return {
      stem: `A ${ctx.team} of ${a} ${ctx.g1} and ${bb} ${ctx.g2} is to be chosen from ${M} ${ctx.g1} and ${W} ${ctx.g2}. In how many ways can this be done?`,
      answer,
      distractors,
      explanation: tex`Choose the ${ctx.g1} and the ${ctx.g2} independently and multiply: $^{${M}}C_{${a}} \times {^{${W}}C_{${bb}}} = ${nCr(M, a)} \times ${nCr(W, bb)} = ${ans}$. Order within the ${ctx.team} does not matter, so combinations (not permutations) are used.`,
    };
  }),

  b.dynamic('round-robin-matches', { difficulty: 1, origin: 'past-paper', tags: ['permutations and combinations'] }, (r) => {
    const n = r.int(5, 16);
    const variant = r.int(0, 3);
    const twice = variant === 1;
    const ans = twice ? n * (n - 1) : nCr(n, 2);
    const stems = [
      `In a cricket tournament, each of ${n} teams plays every other team exactly once. How many matches are played?`,
      `In a football league of ${n} clubs, each club plays every other club twice (home and away). How many matches are played in all?`,
      `At a meeting, each of ${n} people shakes hands with every other person exactly once. How many handshakes take place?`,
      `There are ${n} points in a plane, no three of which are collinear. How many straight lines can be drawn through pairs of these points?`,
    ];
    const { answer, distractors } = numericOptions(r, {
      correct: ans,
      wrong: twice ? [nCr(n, 2), n * n, 2 * n, n * (n + 1)] : [n * (n - 1), n * n, (n * (n + 1)) / 2, n - 1],
      format: (v) => m(String(v)),
    });
    return {
      stem: stems[variant] as string,
      answer,
      distractors,
      explanation: twice
        ? tex`Each pair meets twice, so the count is $^{${n}}P_2 = ${n} \times ${n - 1} = ${ans}$.`
        : tex`Each ${['match', '', 'handshake', 'line'][variant]} corresponds to an unordered pair: $^{${n}}C_2 = \dfrac{${n}(${n - 1})}{2} = ${ans}$.`,
    };
  }),

  b.dynamic('row-seating-together', { difficulty: 3, tags: ['permutations and combinations'] }, (r) => {
    const n = r.int(5, 8);
    const apart = r.chance(0.4);
    const together = 2 * factorial(n - 1);
    const ans = apart ? factorial(n) - together : together;
    const { answer, distractors } = numericOptions(r, {
      correct: ans,
      wrong: apart
        ? [factorial(n) - factorial(n - 1), together, factorial(n), factorial(n - 2) * (n - 1)]
        : [factorial(n - 1), factorial(n), 2 * factorial(n - 2), factorial(n) - together],
      format: big,
    });
    return {
      stem: `In how many ways can ${n} students, including Ahmed and Bilal, sit in a row of ${n} chairs if Ahmed and Bilal ${apart ? 'must not sit next to each other' : 'must always sit together'}?`,
      answer,
      distractors,
      explanation: apart
        ? tex`Total arrangements $= ${n}! = ${factorial(n)}$. With the two together: treat them as one unit, $${n - 1}! \times 2! = ${together}$. Not together $= ${factorial(n)} - ${together} = ${ans}$.`
        : tex`Treat Ahmed and Bilal as one unit: ${n - 1} units arrange in $${n - 1}!$ ways and the pair swaps in $2!$ ways: $${n - 1}! \times 2 = ${factorial(n - 1)} \times 2 = ${ans}$.`,
    };
  }),

  // ---------------------------------------------------------------------------
  // Conceptual items
  // ---------------------------------------------------------------------------
  ...b.mcqs([
    {
      id: 'outlier-affects-mean', d: 1, t: ['mean, median and mode'],
      q: 'A single very large value (an outlier) is added to a data set. Which of the following is usually affected the most?',
      a: 'The mean',
      x: ['The median', 'The mode', 'The number of modes'],
      e: 'The mean uses the size of every value, so a single extreme value pulls it strongly. The median depends only on the middle position and the mode only on the most frequent value.',
    },
    {
      id: 'sum-of-deviations-from-mean', d: 2, t: ['mean, median and mode'],
      q: 'The sum of the deviations of a set of observations from their arithmetic mean is always:',
      a: 'zero',
      x: ['one', 'equal to the mean', 'equal to the number of observations'],
      e: tex`$\sum (x_i - \bar{x}) = \sum x_i - n\bar{x} = n\bar{x} - n\bar{x} = 0$.`,
    },
    {
      id: 'mean-after-adding-constant', d: 1, t: ['mean, median and mode'],
      q: 'The mean of a set of numbers is 20. If 5 is added to every number, the new mean is:',
      a: '25',
      x: ['20', '100', '4'],
      e: 'Adding the same constant to every value shifts the mean by that constant: 20 + 5 = 25.',
    },
    {
      id: 'impossible-event-probability', d: 1, t: ['probability'],
      q: 'If E is an impossible event, then P(E) equals:',
      a: '0',
      x: ['1', '-1', '0.5'],
      e: 'Probabilities lie between 0 and 1; an event that can never happen has probability 0, and a certain event has probability 1.',
    },
    {
      id: 'pie-chart-for-parts', d: 1, t: ['tables and charts'],
      q: "Which type of chart is most suitable for showing how a family's monthly income is divided among food, rent, education and savings?",
      a: 'Pie chart',
      x: ['Line graph', 'Scatter plot', 'Histogram'],
      e: 'A pie chart shows the parts of one whole as sectors; a line graph shows change over time, a scatter plot shows a relation between two variables and a histogram shows a frequency distribution.',
    },
    {
      id: 'n-c-n-equals-one', d: 1, t: ['permutations and combinations'],
      q: tex`The value of $^{n}C_{n}$ for any positive integer $n$ is:`,
      a: '$1$',
      x: ['$0$', '$n$', '$n!$'],
      e: tex`$^{n}C_{n} = \dfrac{n!}{n!\,0!} = 1$, since $0! = 1$: there is exactly one way to choose all $n$ objects.`,
    },
  ]),
]);
