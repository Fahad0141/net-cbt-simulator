import { defineBank } from '@/engine/authoring';
import { frac, gcd, num, numericOptions, tex } from '@/engine/helpers';

/* ------------------------------------------------------------------ */
/* Local helpers and precomputed parameter pools (deterministic)        */
/* ------------------------------------------------------------------ */

const NAMES = ['Ali', 'Bilal', 'Hamza', 'Usman', 'Ayesha', 'Fatima', 'Sana', 'Zain', 'Ahmed', 'Hira', 'Saad', 'Maryam'] as const;

/** Keeps only positive integers (for mistake-based distractors that must look like real answers). */
const ints = (...xs: number[]): number[] => xs.filter((x) => Number.isInteger(x) && x > 0);

/** Keeps positive values that are whole or half numbers. */
const halves = (...xs: number[]): number[] => xs.filter((x) => x > 0 && Number.isInteger(x * 2));

/** `Rs. 12,600` */
const rs = (v: number): string => `Rs. ${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

/** `12 days`, `1 day`, `28.5 hours` (up to 6 significant figures, so `112.5` is never rounded to `113`). */
const unitText = (v: number, unit: string): string =>
  `${num(v, { sig: 6 })} ${v === 1 && /^(days|hours|minutes|seconds|years)$/.test(unit) ? unit.slice(0, -1) : unit}`;

/** `twice` / `3 times` */
const timesText = (k: number): string => (k === 2 ? 'twice' : `${k} times`);

/** `\frac{n}{d} = \frac{1}{t}`, or just `\frac{1}{t}` when the fraction is already a unit fraction. */
const unitFracTex = (n: number, d: number, t: number): string =>
  n === 1 ? tex`\frac{1}{${t}}` : tex`\frac{${n}}{${d}} = \frac{1}{${t}}`;

/** a < b with 1/a + 1/b = 1/T for an integer T. */
const COMBINED_PAIRS: Array<[number, number, number]> = [];
for (let a = 3; a <= 40; a++) {
  for (let b = a + 1; b <= 60; b++) {
    if ((a * b) % (a + b) === 0) COMBINED_PAIRS.push([a, b, (a * b) / (a + b)]);
  }
}

/** a < b with 1/a - 1/b = 1/T for an integer T (fill + empty, or tank with a leak). */
const NET_PAIRS: Array<[number, number, number]> = [];
for (let a = 2; a <= 30; a++) {
  for (let b = a + 1; b <= 60; b++) {
    const t = (a * b) / (b - a);
    if (Number.isInteger(t) && t <= 120) NET_PAIRS.push([a, b, t]);
  }
}

/** Two inlets (a < b) and one outlet c with 1/a + 1/b - 1/c = 1/T. */
const THREE_PIPES: Array<[number, number, number, number]> = [];
for (let a = 2; a <= 20; a++) {
  for (let b = a + 1; b <= 30; b++) {
    for (let c = 3; c <= 60; c++) {
      if (c === a || c === b) continue;
      const net = frac(1, a).add(frac(1, b)).sub(frac(1, c));
      if (net.n === 1 && net.d >= 2 && net.d <= 60) THREE_PIPES.push([a, b, c, net.d]);
    }
  }
}

/** Equal distances at u and v: integer harmonic mean 2uv/(u+v). */
const AVG_SPEED_PAIRS: Array<[number, number, number]> = [];
for (let u = 20; u <= 90; u += 5) {
  for (let v = u + 5; v <= 120; v += 5) {
    const h = (2 * u * v) / (u + v);
    if (Number.isInteger(h) && h !== (u + v) / 2) AVG_SPEED_PAIRS.push([u, v, h]);
  }
}

/** Late/early walking problem: speeds u < v (km/h), m min late, n min early, distance D km. */
const LATE_EARLY: Array<[number, number, number, number, number]> = [];
for (let u = 3; u <= 10; u++) {
  for (let v = u + 1; v <= 15; v++) {
    for (let m = 5; m <= 30; m += 5) {
      for (let n = 5; n <= 30; n += 5) {
        const d = (u * v * (m + n)) / (60 * (v - u));
        // At most 3 hours at the slower speed, so the trip to college stays realistic.
        if (Number.isInteger(d) && d >= 2 && d <= 30 && d <= 3 * u) LATE_EARLY.push([u, v, m, n, d]);
      }
    }
  }
}

/** [m1 workers, d1 days, m2 workers] with a whole number of days (at least 2) for m2 workers. */
const MEN_DAYS: Array<[number, number, number]> = [];
for (let m1 = 6; m1 <= 30; m1++) {
  for (let d1 = 4; d1 <= 30; d1++) {
    for (let m2 = 4; m2 <= 45; m2++) {
      const d2 = (m1 * d1) / m2;
      if (Number.isInteger(d2) && d2 >= 2 && m2 !== m1 && m2 !== d1) MEN_DAYS.push([m1, d1, m2]);
    }
  }
}

/** Together k days then A leaves: [a, b, k, B's remaining days]. */
const PARTIAL_WORK: Array<[number, number, number, number]> = [];
for (let a = 6; a <= 30; a++) {
  for (let b = 6; b <= 30; b++) {
    if (a === b) continue;
    for (let k = 2; k <= 8; k++) {
      const rest = b - (k * b) / a - k;
      if (Number.isInteger(rest) && rest >= 2) PARTIAL_WORK.push([a, b, k, rest]);
    }
  }
}

/** Coprime age ratios a : b with a > b. */
const AGE_RATIOS: Array<[number, number]> = [
  [3, 2], [4, 3], [5, 3], [5, 4], [7, 4], [7, 5], [8, 5], [9, 5], [5, 2], [7, 3], [9, 7], [6, 5],
];

/** [ratio a, ratio b, multiplier k, years n, future ratio p1, p2] with small future-ratio terms. */
const AGE_TUPLES: Array<[number, number, number, number, number, number]> = [];
for (const [a, c] of AGE_RATIOS) {
  for (let k = 2; a * k <= 75; k++) {
    for (let n = 2; n <= 15; n++) {
      const g = gcd(a * k + n, c * k + n);
      const p1 = (a * k + n) / g;
      const p2 = (c * k + n) / g;
      if (p1 <= 15 && p2 <= 15) AGE_TUPLES.push([a, c, k, n, p1, p2]);
    }
  }
}

/* ------------------------------------------------------------------ */

export default defineBank('quantitative', 'word-problems', (b) => [
  /* ---------------------------- Time and work ---------------------------- */
  b.dynamic('work-together', { difficulty: 1, origin: 'past-paper', tags: ['time and work'] }, (r) => {
    const [a, c, t] = r.pick(COMBINED_PAIRS);
    const [p, q] = r.sample(NAMES, 2);
    const { answer, distractors } = numericOptions(r, {
      correct: t,
      wrong: [...halves((a + c) / 2, a + c, c - a), ...ints((a * c) / (c - a))],
      format: (v) => unitText(v, 'days'),
    });
    return {
      stem: `${p} can complete a piece of work in ${a} days and ${q} can complete it in ${c} days. Working together, they will complete it in:`,
      answer,
      distractors,
      explanation: tex`Work per day together $= \frac{1}{${a}} + \frac{1}{${c}} = \frac{${a + c}}{${a * c}} = \frac{1}{${t}}$, so the work takes $${t}$ days.`,
    };
  }),

  b.dynamic('work-one-alone', { difficulty: 2, tags: ['time and work'] }, (r) => {
    const [a, c, t] = r.pick(COMBINED_PAIRS);
    const [p, q] = r.sample(NAMES, 2);
    const [known, unknown] = r.chance(0.5) ? [a, c] : [c, a];
    const { answer, distractors } = numericOptions(r, {
      correct: unknown,
      wrong: ints(known - t, known + t, (known * t) / (known + t), 2 * t, known),
      format: (v) => unitText(v, 'days'),
    });
    return {
      stem: `${p} and ${q} together can finish a job in ${t} days. ${p} alone can finish it in ${known} days. In how many days can ${q} alone finish it?`,
      answer,
      distractors,
      explanation: tex`${q}'s work per day $= \frac{1}{${t}} - \frac{1}{${known}} = ${unitFracTex(known - t, known * t, unknown)}$, so ${q} alone needs $${unknown}$ days.`,
    };
  }),

  b.dynamic('work-men-days', { difficulty: 1, origin: 'past-paper', tags: ['time and work'] }, (r) => {
    const [m1, d1, m2] = r.pick(MEN_DAYS);
    const total = m1 * d1;
    const d2 = total / m2;
    const { answer, distractors } = numericOptions(r, {
      correct: d2,
      wrong: ints((m2 * d1) / m1, d1 + m1 - m2, d1 - m1 + m2, total),
      format: (v) => unitText(v, 'days'),
    });
    return {
      stem: `A team of ${m1} workers can build a wall in ${d1} days. Working at the same rate, how many days will ${m2} workers take to build the same wall?`,
      answer,
      distractors,
      explanation: tex`Total work $= ${m1} \times ${d1} = ${total}$ worker-days. Days needed $= \frac{${total}}{${m2}} = ${d2}$ (days are inversely proportional to the number of workers).`,
    };
  }),

  b.dynamic('work-partial-then-leaves', { difficulty: 3, tags: ['time and work'] }, (r) => {
    const [a, c, k, rest] = r.pick(PARTIAL_WORK);
    const [p, q] = r.sample(NAMES, 2);
    const done = frac(k, a).add(frac(k, c));
    const left = frac(1).sub(done);
    const { answer, distractors } = numericOptions(r, {
      correct: rest,
      wrong: ints(c - k, rest + k, left.mul(a).toNumber(), c - (k * c) / a),
      format: (v) => unitText(v, 'days'),
    });
    return {
      stem: `${p} can do a job in ${a} days and ${q} can do it in ${c} days. They work together for ${k} days, after which ${p} leaves. In how many more days will ${q} finish the remaining work?`,
      answer,
      distractors,
      explanation: tex`In $${k}$ days they do $${k}\left(\frac{1}{${a}} + \frac{1}{${c}}\right) = ${done.toTex()}$ of the job, leaving $${left.toTex()}$. ${q} needs $${left.toTex()} \times ${c} = ${rest}$ more days.`,
    };
  }),

  b.dynamic('work-efficiency', { difficulty: 2, tags: ['time and work'] }, (r) => {
    const k = r.pick([2, 3, 4]);
    const t = k * r.int(2, 9);
    const [p, q] = r.sample(NAMES, 2);
    const bAlone = (k + 1) * t;
    const aAlone = bAlone / k;
    const askA = r.chance(0.5);
    const correct = askA ? aAlone : bAlone;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: ints(askA ? bAlone : aAlone, k * t, 2 * t, askA ? t + t / k : bAlone + t),
      format: (v) => unitText(v, 'days'),
    });
    const who = askA ? p : q;
    return {
      stem: `${p} is ${timesText(k)} as efficient as ${q}. Working together, they finish a task in ${t} days. How many days would ${who} alone take?`,
      answer,
      distractors,
      explanation: tex`Let ${q} do $x$ units per day, so ${p} does $${k}x$. Together $${k + 1}x$ per day for $${t}$ days gives total work $${(k + 1) * t}x$. ${q} alone: $${bAlone}$ days; ${p} alone: $\frac{${bAlone}}{${k}} = ${aAlone}$ days. So ${who} takes $${correct}$ days.`,
    };
  }),

  b.dynamic('work-wages-share', { difficulty: 2, origin: 'past-paper', tags: ['time and work'] }, (r) => {
    const a = r.int(4, 30);
    const c = r.intExcept(4, 30, [a]);
    const g = gcd(a, c);
    const s = (a + c) / g;
    const unit = r.multiple(100, 1200, 50);
    const w = s * unit;
    const shareA = (c / g) * unit;
    const shareB = (a / g) * unit;
    const [p, q] = r.sample(NAMES, 2);
    const { answer, distractors } = numericOptions(r, {
      correct: shareA,
      wrong: ints(shareB, w / 2, Math.abs(shareA - shareB), shareA + unit, shareA - unit),
      format: rs,
    });
    return {
      stem: `${p} can finish a job in ${a} days and ${q} in ${c} days. They do it together and are paid ${rs(w)} in total. If the payment is shared in proportion to the work done, ${p}'s share is:`,
      answer,
      distractors,
      explanation: tex`Shares are in the ratio of daily work $\frac{1}{${a}} : \frac{1}{${c}} = ${c / g} : ${a / g}$. ${p}'s share $= \frac{${c / g}}{${s}} \times ${w} = ${shareA}$ rupees.`,
    };
  }),

  /* -------------------------- Pipes and cisterns -------------------------- */
  b.dynamic('pipes-two-inlets', { difficulty: 1, tags: ['pipes and cisterns'] }, (r) => {
    const [a, c, t] = r.pick(COMBINED_PAIRS.filter(([x, y]) => y <= 40 && x >= 3));
    const unit = r.pick(['hours', 'minutes']);
    const { answer, distractors } = numericOptions(r, {
      correct: t,
      wrong: [...halves((a + c) / 2, a + c, c - a), ...ints((a * c) / (c - a))],
      format: (v) => unitText(v, unit),
    });
    return {
      stem: `Pipe A can fill an empty tank in ${a} ${unit} and pipe B can fill it in ${c} ${unit}. If both pipes are opened together, the tank will be full in:`,
      answer,
      distractors,
      explanation: tex`Part filled per unit time $= \frac{1}{${a}} + \frac{1}{${c}} = \frac{${a + c}}{${a * c}} = \frac{1}{${t}}$, so the tank fills in $${t}$ ${unit}.`,
    };
  }),

  b.dynamic('pipes-fill-and-empty', { difficulty: 2, origin: 'past-paper', tags: ['pipes and cisterns'] }, (r) => {
    const [a, c, t] = r.pick(NET_PAIRS.filter(([x, y]) => x >= 3 && y <= 40));
    const { answer, distractors } = numericOptions(r, {
      correct: t,
      wrong: [...ints((a * c) / (a + c)), ...halves(c - a, a + c, (a + c) / 2)],
      format: (v) => unitText(v, 'hours'),
    });
    return {
      stem: `An inlet pipe can fill a tank in ${a} hours, and an outlet pipe can empty the full tank in ${c} hours. If both are opened when the tank is empty, the tank will be full in:`,
      answer,
      distractors,
      explanation: tex`Net part filled per hour $= \frac{1}{${a}} - \frac{1}{${c}} = ${unitFracTex(c - a, a * c, t)}$, so the tank is full after $${t}$ hours.`,
    };
  }),

  b.dynamic('pipes-three', { difficulty: 3, tags: ['pipes and cisterns'] }, (r) => {
    const [a, c, e, t] = r.pick(THREE_PIPES);
    const all = frac(1, a).add(frac(1, c)).add(frac(1, e));
    const { answer, distractors } = numericOptions(r, {
      correct: t,
      wrong: [
        ...(all.n === 1 ? [all.d] : []), // added the outlet
        ...ints((a * c) / (a + c)), // ignored the outlet
        ...ints(a + c - e, e - a, e - c),
      ],
      format: (v) => unitText(v, 'hours'),
    });
    return {
      stem: `Pipes A and B can fill a tank in ${a} hours and ${c} hours respectively, while pipe C can empty the full tank in ${e} hours. If all three pipes are opened together on the empty tank, it will be full in:`,
      answer,
      distractors,
      explanation: tex`Net part filled per hour $= \frac{1}{${a}} + \frac{1}{${c}} - \frac{1}{${e}} = \frac{1}{${t}}$, so the tank is full after $${t}$ hours.`,
    };
  }),

  b.dynamic('pipes-leak', { difficulty: 2, tags: ['pipes and cisterns'] }, (r) => {
    const [a, t, leak] = r.pick(NET_PAIRS.filter(([x, y, z]) => x >= 2 && y <= 2 * x && z <= 90));
    const { answer, distractors } = numericOptions(r, {
      correct: leak,
      wrong: [...ints(t - a, (a * t) / (a + t), a + t, a * t)],
      format: (v) => unitText(v, 'hours'),
    });
    return {
      stem: `A pipe can fill a tank in ${a} hours. Because of a leak at the bottom, it takes ${t} hours to fill the tank. Working alone, the leak can empty the full tank in:`,
      answer,
      distractors,
      explanation: tex`Leak's emptying rate $= \frac{1}{${a}} - \frac{1}{${t}} = ${unitFracTex(t - a, a * t, leak)}$ of the tank per hour, so it empties the tank in $${leak}$ hours.`,
    };
  }),

  /* ---------------------- Speed, distance and time ---------------------- */
  b.dynamic('speed-unit-conversion', { difficulty: 1, tags: ['speed, distance and time'] }, (r) => {
    const toMps = r.chance(0.5);
    const mps = r.multiple(5, 45, 5);
    const kmph = (mps * 18) / 5;
    const correct = toMps ? mps : kmph;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: toMps
        ? ints((kmph * 18) / 5, kmph * 10, Math.round(kmph / 3), (kmph * 1000) / 60)
        : ints((mps * 5) / 18, mps * 6, mps * 3, mps * 60),
      format: (v) => unitText(v, toMps ? 'm/s' : 'km/h'),
    });
    return {
      stem: toMps
        ? `A car is moving at ${kmph} km/h. Its speed in metres per second is:`
        : `A car is moving at ${mps} m/s. Its speed in kilometres per hour is:`,
      answer,
      distractors,
      explanation: toMps
        ? tex`$1\ \text{km/h} = \frac{1000}{3600} = \frac{5}{18}$ m/s, so $${kmph} \times \frac{5}{18} = ${mps}$ m/s.`
        : tex`$1$ m/s $= \frac{3600}{1000} = \frac{18}{5}$ km/h, so $${mps} \times \frac{18}{5} = ${kmph}$ km/h.`,
    };
  }),

  b.dynamic('train-passes-pole', { difficulty: 1, origin: 'past-paper', tags: ['speed, distance and time'] }, (r) => {
    const vs = r.multiple(10, 35, 5);
    const v = (vs * 18) / 5;
    const t = r.int(6, 24);
    const len = vs * t;
    const { answer, distractors } = numericOptions(r, {
      correct: t,
      wrong: ints(len / v, Math.round(len / v), (len * 5) / (18 * vs), t * 2),
      format: (x) => unitText(x, 'seconds'),
    });
    return {
      stem: `A train ${len} m long is running at ${v} km/h. How long will it take to pass an electric pole?`,
      answer,
      distractors,
      explanation: tex`Speed $= ${v} \times \frac{5}{18} = ${vs}$ m/s. To pass a pole the train covers its own length: $t = \frac{${len}}{${vs}} = ${t}$ s.`,
    };
  }),

  b.dynamic('train-crosses-platform', { difficulty: 2, origin: 'past-paper', tags: ['speed, distance and time'] }, (r) => {
    const vs = r.multiple(10, 30, 5);
    const v = (vs * 18) / 5;
    const t = r.int(Math.max(12, Math.ceil(170 / vs)), 40); // total >= 170 m, so a 100 m+ train always fits
    const total = vs * t;
    const lenChoices: number[] = [];
    for (let l = 100; l <= total - 60; l += 10) if (l % vs === 0 || (total - l) % vs === 0) lenChoices.push(l);
    const len = lenChoices.length ? r.pick(lenChoices) : Math.round(total / 20) * 10;
    const plat = total - len;
    const { answer, distractors } = numericOptions(r, {
      correct: t,
      wrong: ints(len / vs, plat / vs, Math.abs(plat - len) / vs, total / v),
      format: (x) => unitText(x, 'seconds'),
    });
    return {
      stem: `A train ${len} m long, running at ${v} km/h, crosses a platform ${plat} m long. The time it takes to cross the platform completely is:`,
      answer,
      distractors,
      explanation: tex`Distance $= ${len} + ${plat} = ${total}$ m; speed $= ${v} \times \frac{5}{18} = ${vs}$ m/s. Time $= \frac{${total}}{${vs}} = ${t}$ s.`,
    };
  }),

  b.dynamic('vehicles-meet', { difficulty: 1, tags: ['speed, distance and time'] }, (r) => {
    const t = r.pick([1, 1.5, 2, 2.5, 3, 4, 5]);
    // With a half-hour meeting time, speeds are multiples of 10 so the distances stay whole numbers.
    const step = Number.isInteger(t) ? 5 : 10;
    const u = r.multiple(30, 80, step);
    const v = r.multiple(30, 90, step);
    const w = u === v ? v + 10 : v;
    const d = (u + w) * t;
    const askTime = r.chance(0.5);
    const [p, q] = r.sample(['P', 'Q', 'R', 'S'], 2);
    if (askTime) {
      const { answer, distractors } = numericOptions(r, {
        correct: t,
        wrong: halves(d / Math.abs(u - w), d / u, d / w, 2 * t),
        format: (x) => unitText(x, 'hours'),
        fallback: 'offset',
      });
      return {
        stem: `Towns ${p} and ${q} are ${d} km apart. A car leaves ${p} for ${q} at ${u} km/h and, at the same time, a bus leaves ${q} for ${p} at ${w} km/h. After how long will they meet?`,
        answer,
        distractors,
        explanation: tex`Moving towards each other, they close the gap at $${u} + ${w} = ${u + w}$ km/h. Time $= \frac{${d}}{${u + w}} = ${num(t)}$ h.`,
      };
    }
    const meet = u * t;
    const { answer, distractors } = numericOptions(r, {
      correct: meet,
      wrong: ints(w * t, d / 2, d - u),
      format: (x) => unitText(x, 'km'),
    });
    return {
      stem: `Towns ${p} and ${q} are ${d} km apart. A car leaves ${p} for ${q} at ${u} km/h and, at the same time, a bus leaves ${q} for ${p} at ${w} km/h. How far from ${p} will they meet?`,
      answer,
      distractors,
      explanation: tex`They meet after $\frac{${d}}{${u} + ${w}} = ${num(t)}$ h. The car has then travelled $${u} \times ${num(t)} = ${meet}$ km from ${p}.`,
    };
  }),

  b.dynamic('average-speed-round-trip', { difficulty: 2, origin: 'past-paper', tags: ['speed, distance and time'] }, (r) => {
    const [u, v, h] = r.pick(AVG_SPEED_PAIRS);
    const [from, to] = r.sample(['Lahore', 'Multan', 'Sialkot', 'Peshawar', 'Hyderabad', 'Quetta', 'Gujranwala', 'Sukkur'], 2);
    const [go, back] = r.chance(0.5) ? [u, v] : [v, u];
    const { answer, distractors } = numericOptions(r, {
      correct: h,
      wrong: halves((u + v) / 2, (u * v) / (u + v), v - u, u + v),
      format: (x) => unitText(x, 'km/h'),
    });
    return {
      stem: `A van travels from ${from} to ${to} at ${go} km/h and returns along the same road at ${back} km/h. Its average speed for the whole journey is:`,
      answer,
      distractors,
      explanation: tex`For equal distances, average speed $= \frac{2uv}{u+v} = \frac{2(${u})(${v})}{${u} + ${v}} = \frac{${2 * u * v}}{${u + v}} = ${h}$ km/h (not the simple mean $${num((u + v) / 2)}$).`,
    };
  }),

  b.dynamic('boat-and-stream', { difficulty: 2, tags: ['speed, distance and time'] }, (r) => {
    const s = r.int(2, 6);
    const boat = r.int(s + 3, 24);
    const down = boat + s;
    const up = boat - s;
    const t1 = r.int(2, 5);
    const t2 = r.int(2, 6);
    const d1 = down * t1;
    const d2 = up * t2;
    const askBoat = r.chance(0.5);
    const correct = askBoat ? boat : s;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: halves(askBoat ? s : boat, down - up, (down + up) / 4, askBoat ? down : up, (d1 + d2) / (t1 + t2)),
      format: (x) => unitText(x, 'km/h'),
    });
    return {
      stem: `A boat goes ${d1} km downstream in ${t1} hours and ${d2} km upstream in ${t2} hours. The speed of the ${askBoat ? 'boat in still water' : 'stream'} is:`,
      answer,
      distractors,
      explanation: tex`Downstream speed $= \frac{${d1}}{${t1}} = ${down}$ km/h, upstream speed $= \frac{${d2}}{${t2}} = ${up}$ km/h. Boat speed $= \frac{${down} + ${up}}{2} = ${boat}$ km/h; stream speed $= \frac{${down} - ${up}}{2} = ${s}$ km/h.`,
    };
  }),

  b.dynamic('late-and-early', { difficulty: 3, tags: ['speed, distance and time'] }, (r) => {
    const [u, v, m, n, d] = r.pick(LATE_EARLY);
    const name = r.pick(NAMES);
    const { answer, distractors } = numericOptions(r, {
      correct: d,
      wrong: ints((u * v * Math.abs(m - n)) / (60 * (v - u)), (u * v * (m + n)) / (60 * (v + u)), (u * v * (m + n)) / (v - u) / 10, d * 2),
      format: (x) => unitText(x, 'km'),
    });
    return {
      stem: `Travelling at ${u} km/h, ${name} reaches college ${m} minutes late. Travelling at ${v} km/h, ${name} reaches ${n} minutes early. The distance to the college is:`,
      answer,
      distractors,
      explanation: tex`The two travel times differ by $${m} + ${n} = ${m + n}$ min $= \frac{${m + n}}{60}$ h. So $\frac{d}{${u}} - \frac{d}{${v}} = \frac{${m + n}}{60}$, giving $d \cdot \frac{${v - u}}{${u * v}} = \frac{${m + n}}{60}$ and $d = \frac{${u * v} \times ${m + n}}{60 \times ${v - u}} = ${d}$ km.`,
    };
  }),

  /* --------------------------------- Ages --------------------------------- */
  b.dynamic('ages-ratio-change', { difficulty: 2, origin: 'past-paper', tags: ['ages'] }, (r) => {
    const [a, c, k, n, p1, p2] = r.pick(AGE_TUPLES);
    const elder = a * k;
    const younger = c * k;
    const [x, y] = r.sample(NAMES, 2);
    const askElder = r.chance(0.5);
    const correct = askElder ? elder : younger;
    const coef = a * p2 - c * p1; // always positive: the ratio moves towards 1 as both ages grow
    const solveTex = coef === 1 ? tex`x = ${k}` : tex`${coef}x = ${n * (p1 - p2)} \Rightarrow x = ${k}`;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: ints(askElder ? younger : elder, correct + n, k, askElder ? p1 * k : p2 * k),
      format: (v) => unitText(v, 'years'),
    });
    return {
      stem: `The present ages of ${x} and ${y} are in the ratio ${a} : ${c}. After ${n} years, the ratio of their ages will be ${p1} : ${p2}. What is ${askElder ? x : y}'s present age?`,
      answer,
      distractors,
      explanation: tex`Let the ages be $${a}x$ and $${c}x$. Then $\frac{${a}x + ${n}}{${c}x + ${n}} = \frac{${p1}}{${p2}} \Rightarrow ${p2}(${a}x + ${n}) = ${p1}(${c}x + ${n}) \Rightarrow ${solveTex}$. Ages: $${elder}$ and $${younger}$ years.`,
    };
  }),

  b.dynamic('ages-multiple-and-sum', { difficulty: 1, tags: ['ages'] }, (r) => {
    const k = r.int(2, 5);
    // The parent is at least 20 years older than the child (a 2 : 1 ratio needs a child of 20 or more).
    const child = r.int(Math.max(6, Math.ceil(20 / (k - 1))), Math.floor(80 / k));
    const parent = k * child;
    const sum = parent + child;
    const [pName, cName, pron] = r.pick([
      ['father', 'son', 'his'],
      ['mother', 'daughter', 'her'],
      ['father', 'daughter', 'his'],
      ['mother', 'son', 'her'],
    ] as const);
    const askParent = r.chance(0.5);
    const correct = askParent ? parent : child;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: ints(askParent ? child : parent, sum / k, sum - sum / k, askParent ? sum - k : Math.round(sum / 2)),
      format: (v) => unitText(v, 'years'),
    });
    return {
      stem: `A ${pName} is ${timesText(k)} as old as ${pron} ${cName}. The sum of their present ages is ${sum} years. The ${askParent ? pName : cName}'s present age is:`,
      answer,
      distractors,
      explanation: tex`Let the ${cName}'s age be $x$; then the ${pName}'s age is $${k}x$. $x + ${k}x = ${sum} \Rightarrow ${k + 1}x = ${sum} \Rightarrow x = ${child}$. So the ${cName} is $${child}$ and the ${pName} is $${parent}$ years old.`,
    };
  }),

  b.dynamic('ages-years-ago', { difficulty: 2, tags: ['ages'] }, (r) => {
    const k = r.int(2, 5);
    const x0 = r.int(3, 15);
    const n = r.int(2, 10);
    const gap = (k - 1) * x0;
    const bNow = x0 + n;
    const aNow = k * x0 + n;
    const [p, q] = r.sample(NAMES, 2);
    const { answer, distractors } = numericOptions(r, {
      correct: bNow,
      wrong: ints(x0, aNow, x0 + 2 * n, bNow - 2 * n, gap),
      format: (v) => unitText(v, 'years'),
    });
    return {
      stem: `${p} is ${gap} years older than ${q}, and ${n} years ago ${p} was ${timesText(k)} as old as ${q}. What is ${q}'s present age?`,
      answer,
      distractors,
      explanation: tex`Let ${q}'s age ${n} years ago be $x$; ${p}'s was $${k}x$. The gap is constant: $${k}x - x = ${gap} \Rightarrow x = ${x0}$. ${q}'s present age $= ${x0} + ${n} = ${bNow}$ years.`,
    };
  }),

  /* -------------------------- Consecutive numbers -------------------------- */
  b.dynamic('consecutive-integers-sum', { difficulty: 1, origin: 'past-paper', tags: ['consecutive numbers'] }, (r) => {
    const k = r.int(3, 6);
    const start = r.int(5, 60);
    const end = start + k - 1;
    const sum = (k * (start + end)) / 2;
    const askLargest = r.chance(0.5);
    const correct = askLargest ? end : start;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: halves(askLargest ? start : end, sum / k, correct + 1, correct - 1),
      format: (v) => `$${num(v)}$`,
    });
    return {
      stem: `The sum of ${k} consecutive integers is ${sum}. The ${askLargest ? 'largest' : 'smallest'} of these integers is:`,
      answer,
      distractors,
      explanation: tex`Let the integers be $n, n+1, ${k === 3 ? '' : tex`\ldots, `}n+${k - 1}$. Sum $= ${k}n + ${(k * (k - 1)) / 2} = ${sum} \Rightarrow n = ${start}$. The integers run from $${start}$ to $${end}$.`,
    };
  }),

  b.dynamic('consecutive-even-odd', { difficulty: 1, tags: ['consecutive numbers'] }, (r) => {
    const even = r.chance(0.5);
    const mid = even ? r.multiple(10, 98, 2) : 2 * r.int(5, 49) + 1;
    const sum = 3 * mid;
    const askLargest = r.chance(0.5);
    const correct = askLargest ? mid + 2 : mid - 2;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: ints(mid, askLargest ? mid + 1 : mid - 1, askLargest ? mid - 2 : mid + 2, askLargest ? mid + 4 : mid - 4),
      format: (v) => `$${num(v)}$`,
    });
    const kind = even ? 'even' : 'odd';
    return {
      stem: `The sum of three consecutive ${kind} numbers is ${sum}. The ${askLargest ? 'largest' : 'smallest'} of them is:`,
      answer,
      distractors,
      explanation: tex`Let the numbers be $x - 2$, $x$, $x + 2$. Then $3x = ${sum} \Rightarrow x = ${mid}$. The numbers are $${mid - 2}, ${mid}, ${mid + 2}$.`,
    };
  }),

  b.dynamic('consecutive-squares-products', { difficulty: 2, tags: ['consecutive numbers'] }, (r) => {
    const n = r.int(6, 40);
    if (r.chance(0.5)) {
      const diff = 2 * n + 1;
      const { answer, distractors } = numericOptions(r, {
        correct: n + 1,
        wrong: ints(n, n + 2, diff, Math.round(diff / 2) + 1),
        format: (v) => `$${num(v)}$`,
      });
      return {
        stem: `The difference between the squares of two consecutive positive integers is ${diff}. The larger integer is:`,
        answer,
        distractors,
        explanation: tex`$(n+1)^2 - n^2 = 2n + 1 = ${diff} \Rightarrow n = ${n}$. The larger integer is $${n + 1}$.`,
      };
    }
    const prod = n * (n + 1);
    const { answer, distractors } = numericOptions(r, {
      correct: 2 * n + 1,
      wrong: ints(2 * n - 1, 2 * n + 3, n + 1, prod / 2),
      format: (v) => `$${num(v)}$`,
    });
    return {
      stem: `The product of two consecutive positive integers is ${prod}. Their sum is:`,
      answer,
      distractors,
      explanation: tex`$n(n+1) = ${prod}$ gives $n = ${n}$ (since $${n} \times ${n + 1} = ${prod}$). Sum $= ${n} + ${n + 1} = ${2 * n + 1}$.`,
    };
  }),

  /* ----------------------------- Fixed items ----------------------------- */
  ...b.mcqs([
    {
      id: 'average-speed-formula', d: 2, o: 'past-paper', t: ['speed, distance and time'],
      q: 'A car covers two equal distances, the first at $x$ km/h and the second at $y$ km/h. Its average speed for the whole journey is:',
      a: tex`$\dfrac{2xy}{x+y}$ km/h`,
      x: [tex`$\dfrac{x+y}{2}$ km/h`, tex`$\dfrac{xy}{x+y}$ km/h`, tex`$\sqrt{xy}$ km/h`],
      e: tex`For distance $d$ each way, total time $= \frac{d}{x} + \frac{d}{y} = \frac{d(x+y)}{xy}$. Average speed $= \frac{2d}{d(x+y)/(xy)} = \frac{2xy}{x+y}$, the harmonic mean, not the simple mean.`,
    },
    {
      id: 'three-consecutive-divisible', d: 1, t: ['consecutive numbers'],
      q: 'The sum of any three consecutive integers is always divisible by:',
      a: '$3$',
      x: ['$2$', '$6$', '$5$'],
      e: tex`$(n-1) + n + (n+1) = 3n$, always a multiple of $3$. It need not be even: $2 + 3 + 4 = 9$ is not divisible by $2$ or $6$.`,
    },
    {
      id: 'consecutive-even-product', d: 3, t: ['consecutive numbers'],
      q: 'The largest number that always divides the product of any two consecutive even integers is:',
      a: '$8$',
      x: ['$4$', '$16$', '$6$'],
      e: tex`$2n(2n+2) = 4n(n+1)$, and $n(n+1)$ is always even, so the product is always a multiple of $8$. $2 \times 4 = 8$ shows that no larger number (such as $16$) always divides it; $4$ divides it but is not the largest.`,
    },
    {
      id: 'train-bridge-distance', d: 1, t: ['speed, distance and time'],
      q: 'A train of length $L$ metres crosses a bridge of length $B$ metres completely. The distance the train covers while crossing is:',
      a: '$L + B$ metres',
      x: ['$B$ metres', '$L$ metres', '$B - L$ metres'],
      e: 'The front must travel the whole bridge ($B$) and then a further train length ($L$) for the rear to clear it, so the distance is $L + B$.',
    },
    {
      id: 'speed-time-inverse-ratio', d: 1, t: ['speed, distance and time'],
      q: 'Two cars cover the same distance with speeds in the ratio $3 : 4$. The ratio of the times they take is:',
      a: '$4 : 3$',
      x: ['$3 : 4$', '$9 : 16$', '$16 : 9$'],
      e: tex`For a fixed distance, $t = \frac{d}{v}$, so time is inversely proportional to speed: $t_1 : t_2 = 4 : 3$.`,
    },
    {
      id: 'age-difference-constant', d: 1, t: ['ages'],
      q: 'Two brothers differ in age by $6$ years today. Ten years from now, the difference between their ages will be:',
      a: '$6$ years',
      x: ['$16$ years', '$26$ years', '$10$ years'],
      e: 'Both ages increase by the same $10$ years, so the difference does not change: it remains $6$ years.',
    },
    {
      id: 'equal-inlet-outlet', d: 1, t: ['pipes and cisterns'],
      q: 'An inlet pipe fills a tank in $5$ hours and an outlet pipe empties the full tank in $5$ hours. If both are opened together on the empty tank, then the tank:',
      a: 'will never be filled',
      x: ['will be full in $5$ hours', 'will be full in $10$ hours', 'will be full in $2.5$ hours'],
      e: tex`Net rate $= \frac{1}{5} - \frac{1}{5} = 0$ of the tank per hour, so the water level never rises.`,
    },
  ]),
]);
