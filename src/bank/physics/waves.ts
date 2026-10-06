import { defineBank } from '@/engine/authoring';
import type { Fraction } from '@/engine/helpers';
import {
  coefTex,
  frac,
  num,
  numericOptions,
  ordinal,
  pickDistractors,
  q$,
  qty,
  simplifySurd,
  tex,
  U,
} from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

/** Unit of linear mass density (mass per unit length of a string). */
const KG_PER_M = 'kg\\,m^{-1}';

/** A Celsius temperature in math mode: 27 -> 27^{\circ}\mathrm{C}. */
const celsius = (t: number): string => `${num(t)}^{\\circ}\\mathrm{C}`;

const isWhole = (x: number): boolean => Math.abs(x - Math.round(x)) < 1e-9;

/** True when a and b differ by more than `gap` (relative), so they cannot pass for rounding variants. */
function farApart(a: number, b: number, gap: number): boolean {
  return Math.abs(a - b) > gap * Math.max(Math.abs(a), Math.abs(b));
}

/**
 * Keeps the finite, positive mistake values that are clearly separated from the answer and from
 * each other, preserving the author's order of preference.
 */
function spaced(correct: number, mistakes: readonly number[], gap = 0.03): number[] {
  const kept: number[] = [];
  for (const m of mistakes) {
    if (!Number.isFinite(m) || m <= 0) continue;
    if (!farApart(m, correct, gap) || kept.some((k) => !farApart(m, k, gap))) continue;
    kept.push(m);
  }
  return kept;
}

/** Numeric options from well-separated mistakes, padded with simple multiples of the answer. */
function spacedOptions(
  r: Rng,
  correct: number,
  mistakes: readonly number[],
  format: (x: number) => string,
  gap = 0.03,
): { answer: string; distractors: string[] } {
  const padding = [2, 0.5, 1.5, 0.75, 3, 0.25].map((k) => correct * k);
  return numericOptions(r, { correct, wrong: spaced(correct, [...mistakes, ...padding], gap), format });
}

/**
 * LaTeX for k f where k = sqrt(ratio) for a positive rational ratio, in a canonical form
 * (9/4 -> \frac{3}{2}f, 2 -> \sqrt{2}\,f, 1/2 -> \frac{\sqrt{2}}{2}f, 1 -> f).
 */
function rootFactorTex(ratio: Fraction): string {
  // sqrt(n/d) = sqrt(n d) / d = (c/d) sqrt(s) with s square-free.
  const { c, r: s } = simplifySurd(1, ratio.n * ratio.d);
  const k = frac(c, ratio.d);
  const root = s === 1 ? '' : `\\sqrt{${s}}`;
  if (k.d === 1) {
    if (!root) return k.n === 1 ? 'f' : `${k.n}f`;
    return `${k.n === 1 ? '' : k.n}${root}\\,f`;
  }
  return `\\frac{${k.n === 1 && root ? '' : k.n}${root}}{${k.d}}f`;
}

/** Square-free part of sqrt(ratio): 1 when sqrt(ratio) is rational. */
const surdPart = (ratio: Fraction): number => simplifySurd(1, ratio.n * ratio.d).r;

export default defineBank('physics', 'waves', (b) => [
  // ---------------------------------------------------------------- wave speed
  b.dynamic('wavelength-from-frequency', { difficulty: 1, tags: ['wave speed'] }, (r) => {
    const medium = r.pick([
      { wave: 'A sound wave', path: 'through air', place: 'in air', speeds: [320, 330, 340, 350, 360] },
      { wave: 'A sound wave', path: 'through water', place: 'in water', speeds: [1400, 1450, 1500] },
      {
        wave: 'A transverse wave',
        path: 'along a stretched string',
        place: 'on a stretched string',
        speeds: [60, 80, 100, 120, 150, 180, 200, 240, 300],
      },
    ]);
    const lambdas = [0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 0.8, 1, 1.2, 1.25, 1.5, 2, 2.5, 3, 4, 5];
    const pairs = medium.speeds.flatMap((v) =>
      lambdas.filter((lam) => isWhole(v / lam) && v / lam >= 20 && v / lam <= 5000).map((lam) => ({ v, lam })),
    );
    const { v, lam } = r.pick(pairs);
    const f = Math.round(v / lam);
    const mode = r.pick(['wavelength', 'frequency', 'speed'] as const);

    if (mode === 'wavelength') {
      // Mistakes: inverted ratio f/v, then half and double the wavelength.
      const { answer, distractors } = spacedOptions(r, lam, [f / v, v / (2 * f), (2 * v) / f], (x) => q$(x, U.m));
      return {
        stem: tex`${medium.wave} of frequency $${qty(f, U.Hz)}$ travels ${medium.path} at $${qty(v, U.mps)}$. Its wavelength is:`,
        answer,
        distractors,
        explanation: tex`$v = f\lambda$, so $\lambda = \frac{v}{f} = \frac{${v}}{${f}} = ${num(lam)}\,\mathrm{m}$.`,
      };
    }
    if (mode === 'frequency') {
      // Mistakes: multiplied instead of divided, then half and double the frequency.
      const { answer, distractors } = spacedOptions(r, f, [v * lam, v / (2 * lam), (2 * v) / lam], (x) => q$(x, U.Hz));
      return {
        stem: tex`${medium.wave} of wavelength $${qty(lam, U.m)}$ travels ${medium.path} at $${qty(v, U.mps)}$. Its frequency is:`,
        answer,
        distractors,
        explanation: tex`$v = f\lambda$, so $f = \frac{v}{\lambda} = \frac{${v}}{${num(lam)}} = ${f}\,\mathrm{Hz}$.`,
      };
    }
    // Mistakes: divided instead of multiplied, then double and half the speed.
    const { answer, distractors } = spacedOptions(r, v, [f / lam, 2 * f * lam, (f * lam) / 2], (x) => q$(x, U.mps));
    return {
      stem: tex`${medium.wave} of frequency $${qty(f, U.Hz)}$ has a wavelength of $${qty(lam, U.m)}$ ${medium.place}. The speed of the wave is:`,
      answer,
      distractors,
      explanation: tex`$v = f\lambda = ${f} \times ${num(lam)} = ${v}\,\mathrm{m\,s^{-1}}$.`,
    };
  }),

  b.dynamic('wave-spacing-speed', { difficulty: 2, tags: ['stationary waves', 'wave speed'] }, (r) => {
    const spacing = r.pick([
      { what: 'two consecutive nodes', mult: 2, kind: 'stationary', rule: 'Consecutive nodes are half a wavelength apart' },
      { what: 'two consecutive antinodes', mult: 2, kind: 'stationary', rule: 'Consecutive antinodes are half a wavelength apart' },
      { what: 'a node and the adjacent antinode', mult: 4, kind: 'stationary', rule: 'A node and the adjacent antinode are a quarter of a wavelength apart' },
      { what: 'a crest and the adjacent trough', mult: 2, kind: 'transverse', rule: 'A crest and the adjacent trough are half a wavelength apart' },
      { what: 'a compression and the adjacent rarefaction', mult: 2, kind: 'sound', rule: 'A compression and the adjacent rarefaction are half a wavelength apart' },
    ]);
    const { mult } = spacing;
    const other = mult === 2 ? 4 : 2;
    const inAir = spacing.kind === 'sound' || (spacing.kind === 'stationary' && r.chance(0.4));

    let setting: { v: number; f: number; dCm: number };
    if (inAir) {
      const choices = [320, 330, 340, 350, 360].flatMap((v) =>
        [4, 5, 8, 10, 16, 20, 25, 40, 50, 80, 100]
          .filter((dCm) => isWhole((100 * v) / (mult * dCm)))
          .map((dCm) => ({ v, dCm, f: Math.round((100 * v) / (mult * dCm)) }))
          .filter(({ f }) => f >= 100 && f <= 4000),
      );
      setting = r.pick(choices);
    } else {
      const choices = [50, 60, 75, 80, 100, 120, 125, 150, 200, 250, 300, 400, 500].flatMap((f) =>
        [4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50]
          .filter((dCm) => isWhole((f * mult * dCm) / 100))
          .map((dCm) => ({ f, dCm, v: Math.round((f * mult * dCm) / 100) }))
          .filter(({ v }) => v >= 10 && v <= 500),
      );
      setting = r.pick(choices);
    }
    const { v, f, dCm } = setting;
    const dM = dCm / 100;
    const lamM = mult * dM;

    const context =
      spacing.kind === 'sound'
        ? 'A sound wave travels through air.'
        : spacing.kind === 'transverse'
          ? 'A transverse wave travels along a stretched string.'
          : inAir
            ? 'A stationary sound wave is set up in an air column.'
            : 'A stationary wave is set up on a stretched string.';
    const given = tex`${context} The distance between ${spacing.what} is $${qty(dCm, U.cm)}$.`;
    const lambdaStep = tex`${spacing.rule}, so $\lambda = ${mult} \times ${dCm}\,\mathrm{cm} = ${num(lamM)}\,\mathrm{m}$.`;

    if (r.chance(0.6)) {
      // Mistakes: took the spacing as a full wavelength, used the other spacing rule, halved it, kept cm.
      const { answer, distractors } = spacedOptions(r, v, [f * dM, f * other * dM, (f * dM) / 2, f * mult * dCm], (x) =>
        q$(x, U.mps),
      );
      return {
        stem: tex`${given} If the frequency is $${qty(f, U.Hz)}$, the speed of the wave is:`,
        answer,
        distractors,
        explanation: tex`${lambdaStep} Hence $v = f\lambda = ${f} \times ${num(lamM)} = ${num(v)}\,\mathrm{m\,s^{-1}}$.`,
      };
    }
    const { answer, distractors } = spacedOptions(r, f, [v / dM, v / (other * dM), (2 * v) / dM, v / (mult * dCm)], (x) =>
      q$(x, U.Hz),
    );
    return {
      stem: tex`${given} If the wave speed is $${qty(v, U.mps)}$, the frequency of the wave is:`,
      answer,
      distractors,
      explanation: tex`${lambdaStep} Hence $f = \frac{v}{\lambda} = \frac{${v}}{${num(lamM)}} = ${f}\,\mathrm{Hz}$.`,
    };
  }),

  // ---------------------------------------------------------------- speed of sound
  b.dynamic('sound-speed-temperature', { difficulty: 2, origin: 'past-paper', tags: ['speed of sound'] }, (r) => {
    if (r.chance(0.55)) {
      // T1 = k a^2 and T2 = k b^2 (kelvin), v1 = c a, so v2 = v1 sqrt(T2/T1) = c b exactly.
      const families = [
        { k: 3, a: 10, cs: [33, 34, 35], bs: [9, 11, 12, 13, 14, 15, 16, 20] }, // 27 C
        { k: 1, a: 17, cs: [20], bs: [16, 18, 19, 20, 21, 22] }, // 16 C, 340 m/s
        { k: 1, a: 20, cs: [20], bs: [15, 16, 17, 18, 30] }, // 127 C, 400 m/s
        { k: 4, a: 9, cs: [40], bs: [8, 10, 12, 18] }, // 51 C, 360 m/s
        { k: 5, a: 8, cs: [45], bs: [9, 10, 12, 16] }, // 47 C, 360 m/s
        { k: 273, a: 1, cs: [330, 332], bs: [2] }, // 0 C
      ];
      const fam = r.pick(families);
      const bb = r.pick(fam.bs);
      const c = r.pick(fam.cs);
      const T1 = fam.k * fam.a ** 2;
      const T2 = fam.k * bb ** 2;
      const t1 = T1 - 273;
      const t2 = T2 - 273;
      const v1 = c * fam.a;
      const v2 = c * bb;
      const pressure = r.chance(0.3) ? r.pick(['doubled', 'halved'] as const) : null;
      const { answer, distractors } = spacedOptions(
        r,
        v2,
        [
          pressure === 'doubled' ? v2 * Math.SQRT2 : pressure === 'halved' ? v2 * Math.SQRT1_2 : NaN, // let pressure act
          (v1 * T2) / T1, // forgot the square root
          v1 * Math.sqrt(T1 / T2), // inverted the ratio
          v1 * Math.sqrt(t2 / t1), // used Celsius temperatures
          (v1 * t2) / t1, // Celsius, no root
          (v1 * T1) / T2,
        ],
        (x) => q$(x, U.mps),
      );
      const ratio = frac(bb, fam.a).toTex();
      const verb = T2 > T1 ? 'rises' : 'falls';
      return {
        stem: pressure
          ? tex`The speed of sound in air at $${celsius(t1)}$ is $${qty(v1, U.mps)}$. If the temperature ${verb} to $${celsius(t2)}$ and the pressure of the air is ${pressure}, the speed of sound becomes:`
          : tex`The speed of sound in air at $${celsius(t1)}$ is $${qty(v1, U.mps)}$. The speed of sound in air at $${celsius(t2)}$ is:`,
        answer,
        distractors,
        explanation:
          tex`For an ideal gas $v = \sqrt{\frac{\gamma RT}{M}} \propto \sqrt{T}$, with $T$ in kelvin. $T_1 = ${t1} + 273 = ${T1}\,\mathrm{K}$ and $T_2 = ${t2} + 273 = ${T2}\,\mathrm{K}$, so $v_2 = v_1\sqrt{\frac{T_2}{T_1}} = ${v1}\sqrt{\frac{${T2}}{${T1}}} = ${v1} \times ${ratio} = ${v2}\,\mathrm{m\,s^{-1}}$.` +
          (pressure ? tex` The change of pressure has no effect: at a given temperature $\frac{P}{\rho}$ is constant.` : ''),
      };
    }

    // Temperature at which the speed becomes n times its value at t1.
    const cases = [
      { n: 2, words: 'double', Ts: [200, 273, 280, 290, 300, 320, 400] },
      { n: 1.5, words: '1.5 times', Ts: [200, 280, 300, 320, 400] },
      { n: 0.5, words: 'half', Ts: [800, 1092, 1200, 1600] },
      { n: 1.1, words: '10% greater than', Ts: [200, 300, 400, 500] },
      { n: 1.2, words: '20% greater than', Ts: [250, 300, 400, 500] },
    ];
    const cs = r.pick(cases);
    const T1 = r.pick(cs.Ts);
    const T2 = Math.round(cs.n * cs.n * T1);
    const t1 = T1 - 273;
    const t2 = T2 - 273;
    // Mistakes (as Celsius): kelvin value not converted back, no square, Celsius scaled directly.
    const mistakesC = [T2, cs.n * T1 - 273, cs.n * t1, cs.n * cs.n * t1, cs.n * T1];
    // Space the options on the kelvin scale so close Celsius values are not mistaken for rounding.
    const wrong = spaced(T2, mistakesC.map((x) => x + 273)).map((x) => x - 273);
    const { answer, distractors } = numericOptions(r, {
      correct: t2,
      wrong,
      format: (x) => `$${celsius(x)}$`,
      allowNegative: true,
    });
    return {
      stem: tex`At what temperature will the speed of sound in air be ${cs.words} its value at $${celsius(t1)}$?`,
      answer,
      distractors,
      explanation: tex`$v \propto \sqrt{T}$ with $T$ in kelvin, so $\sqrt{\frac{T_2}{T_1}} = ${num(cs.n)}$ and $T_2 = (${num(cs.n)})^2 T_1$. With $T_1 = ${t1} + 273 = ${T1}\,\mathrm{K}$: $T_2 = ${num(cs.n * cs.n)} \times ${T1} = ${T2}\,\mathrm{K}$, i.e. $${T2} - 273 = ${celsius(t2)}$.`,
    };
  }),

  // ---------------------------------------------------------------- Doppler effect
  b.dynamic('doppler-shift', { difficulty: 2, origin: 'past-paper', tags: ['Doppler effect'] }, (r) => {
    type Motion = 'source-toward' | 'source-away' | 'observer-toward' | 'observer-away';
    const motion = r.pick<Motion>(['source-toward', 'source-away', 'observer-toward', 'observer-away']);
    const v = r.pick([320, 330, 340, 350, 360]);
    const ratioOf = (u: number): Fraction =>
      motion === 'source-toward'
        ? frac(v, v - u)
        : motion === 'source-away'
          ? frac(v, v + u)
          : motion === 'observer-toward'
            ? frac(v + u, v)
            : frac(v - u, v);
    const speeds = [10, 15, 16, 17, 20, 24, 25, 30, 32, 33, 34, 35, 36, 40, 45, 50, 60, 64, 66, 68, 70, 72, 80, 85, 90];
    const usable = speeds.filter((u) => u <= v / 4 && ratioOf(u).d <= 40);
    const u = r.pick(usable);
    const ratio = ratioOf(u);
    // Source frequency: a multiple of the ratio's denominator (preferably of 10 too) so f' is exact.
    const lcm10 = ratio.d % 10 === 0 ? ratio.d : ratio.d % 5 === 0 ? ratio.d * 2 : ratio.d % 2 === 0 ? ratio.d * 5 : ratio.d * 10;
    const step = lcm10 <= 400 ? lcm10 : ratio.d;
    const freqs: number[] = [];
    for (let f = step; f <= 1500; f += step) if (f >= 200) freqs.push(f);
    const f = r.pick(freqs);
    const heard = (f * ratio.n) / ratio.d;

    const at: Record<Motion, number> = {
      'source-toward': (f * v) / (v - u),
      'source-away': (f * v) / (v + u),
      'observer-toward': (f * (v + u)) / v,
      'observer-away': (f * (v - u)) / v,
    };
    // Wrong direction first, then the formula for the other party moving, then "no change".
    const confusions: Record<Motion, [Motion, Motion, Motion]> = {
      'source-toward': ['source-away', 'observer-toward', 'observer-away'],
      'source-away': ['source-toward', 'observer-away', 'observer-toward'],
      'observer-toward': ['observer-away', 'source-toward', 'source-away'],
      'observer-away': ['observer-toward', 'source-away', 'source-toward'],
    };
    const [c1, c2, c3] = confusions[motion];
    const toward = motion.endsWith('toward');
    // Applying both the source and the observer corrections doubles the shift.
    const doubled = toward ? (f * (v + u)) / (v - u) : (f * (v - u)) / (v + u);
    // Shifts can be as small as 3 %, so allow options 2 % apart (still never rounding look-alikes).
    const { answer, distractors } = spacedOptions(
      r,
      heard,
      [at[c1], at[c2], f, doubled, at[c3], Math.abs(heard - f)],
      (x) => q$(x, U.Hz),
      0.02,
    );

    let stem: string;
    let formula: string;
    if (motion.startsWith('source')) {
      const src =
        u > 45
          ? { who: 'A high-speed train', device: 'whistle' }
          : r.pick([
              { who: 'A train', device: 'whistle' },
              { who: 'An ambulance', device: 'siren' },
              { who: 'A police car', device: 'siren' },
              { who: 'A car', device: 'horn' },
            ]);
      const moves = toward ? 'approaches a stationary observer' : 'moves away from a stationary observer';
      stem = tex`${src.who} ${moves} at $${qty(u, U.mps)}$ while sounding its ${src.device} of frequency $${qty(f, U.Hz)}$. If the speed of sound in air is $${qty(v, U.mps)}$, the frequency heard by the observer is:`;
      const sign = toward ? '-' : '+';
      formula = tex`For a source moving ${toward ? 'towards' : 'away from'} a stationary observer, $f' = f\,\frac{v}{v ${sign} u_s} = ${f} \times \frac{${v}}{${v} ${sign} ${u}} = ${f} \times \frac{${v}}{${toward ? v - u : v + u}} = ${num(heard)}\,\mathrm{Hz}$.`;
    } else {
      const who = u > 45 ? 'A passenger on a high-speed train' : r.pick(['A motorcyclist', 'A car driver', 'A passenger on a train']);
      stem = tex`${who} moves at $${qty(u, U.mps)}$ directly ${toward ? 'towards' : 'away from'} a stationary siren that emits sound of frequency $${qty(f, U.Hz)}$. If the speed of sound in air is $${qty(v, U.mps)}$, the frequency heard by this observer is:`;
      const sign = toward ? '+' : '-';
      formula = tex`For an observer moving ${toward ? 'towards' : 'away from'} a stationary source, $f' = f\,\frac{v ${sign} u_o}{v} = ${f} \times \frac{${v} ${sign} ${u}}{${v}} = ${f} \times \frac{${toward ? v + u : v - u}}{${v}} = ${num(heard)}\,\mathrm{Hz}$.`;
    }
    return {
      stem,
      answer,
      distractors,
      explanation: tex`${formula} The pitch rises when source and observer approach each other and falls when they separate.`,
    };
  }),

  // ---------------------------------------------------------------- beats
  b.dynamic('beat-frequency-and-period', { difficulty: 1, tags: ['beats'] }, (r) => {
    const forks = [256, 288, 320, 384, 400, 426, 440, 480, 512];
    const f1 = r.pick(forks);
    const mode = r.pick(['count', 'interval', 'possible'] as const);

    if (mode === 'count') {
      const d = r.int(2, 9);
      const f2 = f1 + r.sign() * d;
      // Mistakes: doubled or halved the difference, or took the average (the pitch heard).
      const { answer, distractors } = spacedOptions(r, d, [2 * d, d / 2, (f1 + f2) / 2], (x) => `$${num(x, { sig: 4 })}$`);
      return {
        stem: tex`Two tuning forks of frequencies $${qty(f1, U.Hz)}$ and $${qty(f2, U.Hz)}$ are sounded together. The number of beats heard per second is:`,
        answer,
        distractors,
        explanation: tex`The beat frequency is the difference of the two frequencies: $f_b = |f_1 - f_2| = |${f1} - ${f2}| = ${d}$ beats per second.`,
      };
    }

    if (mode === 'interval') {
      const d = r.pick([2, 4, 5, 8, 10]);
      const f2 = f1 + r.sign() * d;
      const toMinimum = r.chance(0.35);
      const correct = toMinimum ? 1 / (2 * d) : 1 / d;
      const mistakes = toMinimum ? [1 / d, 1 / (4 * d), 2 / d] : [1 / (2 * d), 2 / d, d];
      const { answer, distractors } = spacedOptions(r, correct, mistakes, (x) => q$(x, U.s));
      const what = toMinimum
        ? 'a maximum of loudness and the next minimum'
        : 'two successive maxima of loudness';
      return {
        stem: tex`Two sources of sound of frequencies $${qty(f1, U.Hz)}$ and $${qty(f2, U.Hz)}$ are sounded together. The time interval between ${what} is:`,
        answer,
        distractors,
        explanation:
          tex`Beat frequency $f_b = |${f1} - ${f2}| = ${d}\,\mathrm{Hz}$. Successive maxima are one beat period apart: $T_b = \frac{1}{f_b} = \frac{1}{${d}} = ${num(1 / d)}\,\mathrm{s}$.` +
          (toMinimum ? tex` A minimum lies midway between two maxima, so the interval is $\frac{T_b}{2} = ${num(correct)}\,\mathrm{s}$.` : ''),
      };
    }

    // Even d keeps the halved-difference mistakes whole numbers (an odd d would print 397.5 as "398").
    const d = r.pick([2, 4, 6, 8]);
    const s = r.sign();
    const correct = f1 + s * d;
    // Mistakes: beat frequency taken as half or double the difference; the other valid value (f1 - s d) is never offered.
    const mistakes = r.shuffle([f1 + s * 2 * d, f1 - s * 2 * d, f1 + (s * d) / 2, f1 - (s * d) / 2]);
    const { answer, distractors } = numericOptions(r, { correct, wrong: mistakes, format: (x) => q$(x, U.Hz) });
    return {
      stem: tex`A tuning fork of frequency $${qty(f1, U.Hz)}$ produces ${d} beats per second when sounded together with another fork B. Which of the following could be the frequency of B?`,
      answer,
      distractors,
      explanation: tex`The beat frequency equals the difference of the two frequencies, so $f_B = ${f1} \pm ${d}$, i.e. $${f1 - d}\,\mathrm{Hz}$ or $${f1 + d}\,\mathrm{Hz}$. Of the options, only $${correct}\,\mathrm{Hz}$ is possible.`,
    };
  }),

  b.dynamic('beats-wax-loading', { difficulty: 3, origin: 'past-paper', tags: ['beats'] }, (r) => {
    const fA = r.pick([256, 288, 320, 384, 400, 426, 440, 480, 512]);
    const beats = r.int(3, 8);
    const changed = r.pick(['unknown', 'known'] as const);
    const action = r.pick(['wax', 'file'] as const);
    const vanish = r.chance(0.25);
    const after = vanish ? 0 : r.int(1, beats - 1);
    // Wax lowers a fork's frequency; filing its prongs raises it.
    const shift = action === 'wax' ? -1 : 1;
    // The beats fall, so the altered fork moves towards the other one. That fixes which side of A the fork B lies.
    const side = changed === 'unknown' ? -shift : shift;
    const fB = fA + side * beats;
    const wrongSide = fA - side * beats;
    const mistakes = vanish ? [wrongSide, fA, fA + 2 * side * beats] : [wrongSide, fA + side * after, fA - side * after];
    const { answer, distractors } = numericOptions(r, { correct: fB, wrong: mistakes, format: (x) => q$(x, U.Hz) });

    const treated = action === 'wax' ? 'loaded with a little wax' : 'filed slightly';
    const outcome = vanish ? 'the beats disappear' : `the beat frequency falls to ${after} per second`;
    const stem =
      changed === 'unknown'
        ? tex`A tuning fork A of frequency $${qty(fA, U.Hz)}$ produces ${beats} beats per second with another fork B. When the prongs of B are ${treated}, ${outcome}. The frequency of B before this change was:`
        : tex`A tuning fork of frequency $${qty(fA, U.Hz)}$ produces ${beats} beats per second with a fork B of unknown frequency. When the prongs of the $${qty(fA, U.Hz)}$ fork are ${treated}, ${outcome}. The frequency of B is:`;

    const effect = action === 'wax' ? 'Loading with wax lowers' : 'Filing the prongs raises';
    const relation = side > 0 ? 'above' : 'below';
    const fewer = vanish ? 'The beats vanish' : 'The beats decrease';
    const reasoning =
      changed === 'unknown'
        ? `${effect} the frequency of B. ${fewer}, so B moves towards A; hence B was ${relation} A`
        : tex`${effect} the frequency of the $${fA}\,\mathrm{Hz}$ fork. ${fewer}, so that fork moves towards B; hence B lies ${relation} $${fA}\,\mathrm{Hz}$`;
    return {
      stem,
      answer,
      distractors,
      explanation: tex`Initially $|f_B - ${fA}| = ${beats}$, so $f_B = ${fA - beats}\,\mathrm{Hz}$ or $${fA + beats}\,\mathrm{Hz}$. ${reasoning}: $f_B = ${fA} ${side > 0 ? '+' : '-'} ${beats} = ${fB}\,\mathrm{Hz}$. Had $f_B$ been $${wrongSide}\,\mathrm{Hz}$, the same change would have increased the beats.`,
    };
  }),

  // ---------------------------------------------------------------- strings and pipes
  b.dynamic('string-harmonic-frequency', { difficulty: 2, tags: ['strings and pipes', 'wave speed'] }, (r) => {
    const asks = [
      { label: 'fundamental frequency', n: 1, slip: 2, note: '' },
      { label: 'frequency of the second harmonic', n: 2, slip: 3, note: '' },
      { label: 'frequency of the third harmonic', n: 3, slip: 4, note: '' },
      { label: 'frequency of the first overtone', n: 2, slip: 1, note: ' The first overtone is the second harmonic.' },
      { label: 'frequency of the second overtone', n: 3, slip: 2, note: ' The second overtone is the third harmonic.' },
    ];
    const ask = r.pick(asks);
    const { n } = ask;
    const speeds = [40, 50, 60, 80, 100, 120, 150, 160, 200, 240, 250, 300, 400];
    const mus = [0.001, 0.002, 0.004, 0.005, 0.01, 0.02, 0.025, 0.04, 0.05];
    const lengths = [0.25, 0.4, 0.5, 0.6, 0.75, 0.8, 1, 1.2, 1.5, 2];
    const choices = speeds.flatMap((v) =>
      mus
        .map((mu) => ({ v, mu, T: Math.round(v * v * mu * 1e6) / 1e6 }))
        .filter(({ T }) => isWhole(T) && T >= 5 && T <= 1000)
        .flatMap((c) =>
          lengths
            .filter((L) => isWhole((n * v) / (2 * L)) && (n * v) / (2 * L) >= 20 && (n * v) / (2 * L) <= 3000)
            .map((L) => ({ ...c, L })),
        ),
    );
    const { v, mu, T, L } = r.pick(choices);
    const fn = (n * v) / (2 * L);
    // Mistakes: harmonic/overtone numbering, dropped the 2 in 2L, used the closed-pipe 4L,
    // gave the fundamental, or stopped at the wave speed.
    const { answer, distractors } = spacedOptions(
      r,
      fn,
      [(ask.slip * v) / (2 * L), (n * v) / L, (n * v) / (4 * L), v / (2 * L), v],
      (x) => q$(x, U.Hz),
    );
    const fnTex = n === 1 ? tex`f_1 = \frac{v}{2L} = \frac{${v}}{2 \times ${num(L)}}` : tex`f_${n} = \frac{${n}v}{2L} = \frac{${n} \times ${v}}{2 \times ${num(L)}}`;
    return {
      stem: tex`A string of length $${qty(L, U.m)}$ is fixed at both ends and kept under a tension of $${qty(T, U.N)}$. Its mass per unit length is $${qty(mu, KG_PER_M)}$. The ${ask.label} of the string is:`,
      answer,
      distractors,
      explanation: tex`Wave speed $v = \sqrt{\frac{T}{\mu}} = \sqrt{\frac{${T}}{${num(mu)}}} = ${v}\,\mathrm{m\,s^{-1}}$. A string fixed at both ends has $f_n = \frac{nv}{2L}$ ($n = 1, 2, 3, \dots$).${ask.note} So $${fnTex} = ${num(fn)}\,\mathrm{Hz}$.`,
    };
  }),

  b.dynamic('pipe-resonance-frequency', { difficulty: 2, tags: ['strings and pipes'] }, (r) => {
    const v = r.pick([320, 330, 340, 350, 360]);
    const lengths = [0.1, 0.15, 0.16, 0.17, 0.2, 0.25, 0.3, 0.32, 0.33, 0.34, 0.35, 0.4, 0.5, 0.55, 0.6, 0.64, 0.66, 0.68, 0.7, 0.75, 0.8, 0.85, 1, 1.1, 1.2, 1.5, 1.6, 1.7];
    const L = r.pick(lengths.filter((x) => isWhole(v / (4 * x)) && v / (4 * x) >= 50 && v / (4 * x) <= 900));
    const closed = r.chance(0.5);
    // k: overtone number (null when the stem names a harmonic directly).
    const asks = closed
      ? [
          { label: 'fundamental frequency', n: 1, k: 0, note: '' },
          { label: 'frequency of the first overtone', n: 3, k: 1, note: ' The first overtone is the third harmonic.' },
          { label: 'frequency of the second overtone', n: 5, k: 2, note: ' The second overtone is the fifth harmonic.' },
          { label: 'frequency of the third harmonic', n: 3, k: null, note: '' },
          { label: 'frequency of the fifth harmonic', n: 5, k: null, note: '' },
        ]
      : [
          { label: 'fundamental frequency', n: 1, k: 0, note: '' },
          { label: 'frequency of the first overtone', n: 2, k: 1, note: ' The first overtone is the second harmonic.' },
          { label: 'frequency of the second overtone', n: 3, k: 2, note: ' The second overtone is the third harmonic.' },
          { label: 'frequency of the second harmonic', n: 2, k: null, note: '' },
          { label: 'frequency of the third harmonic', n: 3, k: null, note: '' },
        ];
    const ask = r.pick(asks);
    const { n, k } = ask;
    const closedF = (m: number) => (m * v) / (4 * L);
    const openF = (m: number) => (m * v) / (2 * L);
    const correct = closed ? closedF(n) : openF(n);
    let mistakes: number[];
    if (closed) {
      mistakes =
        k === null
          ? // Open-pipe formula, fundamental. (The nth allowed mode, (2n - 1)v/4L, is not offered: some
            // books number closed-pipe harmonics by mode, which would make that option arguably correct.)
            [openF(n), closedF(1), openF(1)]
          : [openF(k + 1), closedF(k + 1), openF(2 * k + 1), closedF(2 * k + 3)]; // open-pipe formula; overtone k taken as harmonic k + 1
    } else {
      mistakes =
        k === null
          ? [closedF(n), openF(n + 1), openF(1), closedF(2 * n - 1)]
          : [closedF(2 * k + 1), openF(k === 0 ? 2 : k), closedF(k + 1), openF(k + 2)]; // closed formula; overtone k taken as harmonic k
    }
    const { answer, distractors } = spacedOptions(r, correct, mistakes, (x) => q$(x, U.Hz));
    const lengthText = L < 1 ? qty(Math.round(L * 100), U.cm) : qty(L, U.m);
    const formula = closed
      ? tex`A pipe closed at one end has a node at the closed end and an antinode at the open end, so only odd harmonics occur: $f_n = \frac{nv}{4L}$ ($n = 1, 3, 5, \dots$).`
      : tex`A pipe open at both ends has antinodes at both ends, so all harmonics occur: $f_n = \frac{nv}{2L}$ ($n = 1, 2, 3, \dots$).`;
    return {
      stem: tex`A pipe of length $${lengthText}$ is ${closed ? 'closed at one end and open at the other' : 'open at both ends'}. If the speed of sound in air is $${qty(v, U.mps)}$, the ${ask.label} of the pipe is:`,
      answer,
      distractors,
      explanation: tex`${formula}${ask.note} With $L = ${num(L)}\,\mathrm{m}$: $f_${n} = \frac{${n} \times ${v}}{${closed ? 4 : 2} \times ${num(L)}} = ${num(correct)}\,\mathrm{Hz}$.`,
    };
  }),

  b.dynamic('string-frequency-scaling', { difficulty: 2, origin: 'past-paper', tags: ['strings and pipes'] }, (r) => {
    type Change = { by: Fraction; text: string };
    // Multiplicative wording only ("quadrupled", "made nine times as large"): "increased four
    // times" could be misread as an increase *by* four times.
    const tension: Change[] = [
      { by: frac(2), text: 'the tension is doubled' },
      { by: frac(4), text: 'the tension is quadrupled' },
      { by: frac(9), text: 'the tension is made nine times as large' },
      { by: frac(16), text: 'the tension is made sixteen times as large' },
      { by: frac(1, 2), text: 'the tension is halved' },
      { by: frac(1, 4), text: 'the tension is reduced to one-fourth' },
    ];
    const length: Change[] = [
      { by: frac(2), text: 'the length is doubled' },
      { by: frac(3), text: 'the length is tripled' },
      { by: frac(1, 2), text: 'the length is halved' },
    ];
    const mass: Change[] = [
      { by: frac(4), text: 'the mass per unit length is quadrupled' },
      { by: frac(1, 4), text: 'the mass per unit length is reduced to one-fourth' },
    ];
    const same: Change = { by: frac(1), text: '' };
    const combos = [
      ...tension.flatMap((t) => length.map((l) => [t, l, same] as const)),
      ...tension.flatMap((t) => mass.map((m) => [t, same, m] as const)),
      ...length.flatMap((l) => mass.map((m) => [same, l, m] as const)),
      ...tension.map((t) => [t, same, same] as const),
    ];
    // f' / f = sqrt(t / m) / l; keep combinations whose factor is p/q or (p/q)sqrt(2) with small p, q.
    const squared = (t: Fraction, l: Fraction, m: Fraction): Fraction => t.div(m).div(l.mul(l));
    const nice = combos.filter(([t, l, m]) => {
      const sq = squared(t.by, l.by, m.by);
      const { c } = simplifySurd(1, sq.n * sq.d);
      const k = frac(c, sq.d);
      return surdPart(sq) <= 2 && k.n <= 8 && k.d <= 6;
    });
    const [t, l, m] = r.pick(nice);
    const changes = [t, l, m].filter((c) => c.text).map((c) => c.text);
    const correct = squared(t.by, l.by, m.by);
    const answer = `$${rootFactorTex(correct)}$`;
    const tm = t.by.div(m.by);
    // Each candidate is the square of the factor a mistaken formula gives.
    const candidates = [
      tm.div(l.by).pow(2), // forgot the square root
      tm.mul(l.by.mul(l.by)), // f taken as proportional to L
      tm, // ignored the length change
      tm.div(l.by), // square root over the length as well
      m.by.div(t.by).div(l.by.mul(l.by)), // inverted the tension (and mass) dependence
      correct.mul(4),
      correct.div(4),
      correct.mul(9),
    ].map((sq) => `$${rootFactorTex(sq)}$`);

    // Worked factor: f'/f = sqrt((T'/T) / (mu'/mu)) x (L / L').
    const given = [
      t.text ? tex`$\frac{T'}{T} = ${t.by.toTex()}$` : '',
      m.text ? tex`$\frac{\mu'}{\mu} = ${m.by.toTex()}$` : '',
      l.text ? tex`$\frac{L'}{L} = ${l.by.toTex()}$` : '',
    ].filter(Boolean);
    const underRoot = [t.text ? t.by.toTex() : '', m.text ? frac(1).div(m.by).toTex() : ''].filter(Boolean).join(' \\times ');
    const product = [tex`\sqrt{${underRoot}}`, l.text ? frac(1).div(l.by).toTex() : ''].filter(Boolean).join(' \\times ');
    return {
      stem: tex`The fundamental frequency of a stretched string is $f$. If ${changes.join(' and ')}, the new fundamental frequency is:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`$f = \frac{1}{2L}\sqrt{\frac{T}{\mu}}$, so $f \propto \frac{1}{L}\sqrt{\frac{T}{\mu}}$. Here ${given.join(' and ')}, so $f' = ${product}\,f = ${rootFactorTex(correct)}$.`,
    };
  }),

  b.dynamic('pipe-frequency-scaling', { difficulty: 2, origin: 'past-paper', tags: ['strings and pipes'] }, (r) => {
    // Fundamental: open pipe v/2L, closed pipe v/4L.
    const startClosed = r.chance(0.5);
    const lengths = [
      { by: frac(2), text: 'the length of the pipe is doubled' },
      { by: frac(1, 2), text: 'the length of the pipe is halved' },
      { by: frac(3), text: 'the length of the pipe is tripled' },
      { by: frac(1, 3), text: 'the length of the pipe is reduced to one-third' },
      { by: frac(1), text: '' },
    ];
    const switchEnds = r.chance(0.6);
    const len = r.pick(switchEnds ? lengths : lengths.filter((x) => x.text));
    const endText = startClosed ? 'its closed end is opened' : 'one of its ends is closed';
    const changes = [switchEnds ? endText : '', len.text].filter(Boolean);
    const endClosed = switchEnds ? !startClosed : startClosed;
    const c1 = startClosed ? 4 : 2;
    const c2 = endClosed ? 4 : 2;
    const endFactor = frac(c1, c2); // effect of opening (x2) or closing (x1/2) at fixed length
    const m = endFactor.div(len.by);
    const asF = (x: Fraction): string => `$${rootFactorTex(x.mul(x))}$`;
    const answer = asF(m);
    const candidates = [
      endFactor.mul(len.by), // frequency taken as proportional to length
      endFactor, // ignored the length change
      frac(1).div(endFactor).div(len.by), // opening/closing effect reversed
      frac(1).div(endFactor).mul(len.by),
      m.mul(2),
      m.div(2),
      m.mul(4),
      m.div(4),
      frac(1),
    ].map(asF);
    const lTex = len.by.d === 1 ? (len.by.n === 1 ? 'L' : `${len.by.n}L`) : tex`\frac{L}{${len.by.d}}`;
    const denom = lTex === 'L' ? `${c2}L` : tex`${c2} \times ${lTex}`;
    return {
      stem: tex`The fundamental frequency of a pipe ${startClosed ? 'closed at one end' : 'open at both ends'} is $f$. If ${changes.join(' and ')}, the new fundamental frequency is:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`A pipe open at both ends has fundamental $\frac{v}{2L}$; a pipe closed at one end has $\frac{v}{4L}$. Initially $f = \frac{v}{${c1}L}$. Now the pipe is ${endClosed ? 'closed at one end' : 'open at both ends'} with length $${lTex}$, so $f' = \frac{v}{${denom}} =${rootFactorTex(m.mul(m))}$.`,
    };
  }),

  b.dynamic('closed-open-pipe-length-ratio', { difficulty: 3, tags: ['strings and pipes', 'stationary waves'] }, (r) => {
    // name, true harmonic number n, and the harmonic number a typical numbering slip gives.
    const closedModes = [
      { name: 'fundamental', n: 1, slip: 1 },
      { name: 'first overtone', n: 3, slip: 2 }, // overtone k taken as harmonic k + 1
      { name: 'second overtone', n: 5, slip: 3 },
      // No slip here: "third harmonic" read as the third allowed mode (5f) follows a numbering some books
      // use, so offering it would give a second defensible answer.
      { name: 'third harmonic', n: 3, slip: 3 },
    ];
    const openModes = [
      { name: 'fundamental', n: 1, slip: 1 },
      { name: 'first overtone', n: 2, slip: 1 }, // overtone k taken as harmonic k
      { name: 'second overtone', n: 3, slip: 2 },
      { name: 'second harmonic', n: 2, slip: 3 }, // harmonic k taken as overtone k
      { name: 'third harmonic', n: 3, slip: 4 },
    ];
    const c = r.pick(closedModes);
    const o = r.pick(openModes);
    const ratio = frac(c.n, 2 * o.n);
    const asRatio = (x: Fraction): string => `$${x.n} : ${x.d}$`;
    const answer = asRatio(ratio);
    const mistaken = [
      frac(2 * o.n, c.n), // inverted
      frac(c.n, o.n), // used 2L for the closed pipe too
      frac(c.slip, 2 * o.n), // numbering slip for the closed pipe
      frac(c.n, 2 * o.slip), // numbering slip for the open pipe
      frac(c.slip, 2 * o.slip),
    ];
    const fallback = [frac(1), frac(2), frac(1, 2), frac(3, 4), frac(4, 3), frac(3, 2), frac(2, 3)];
    const distractors = pickDistractors(answer, [...mistaken, ...fallback].map(asRatio));
    const describe = (name: string, n: number, sym: string): string =>
      name.endsWith('overtone') ? tex`its ${name} is the ${ordinal(n)} harmonic ($${sym} = ${n}$)` : tex`its ${name} has $${sym} = ${n}$`;
    const harmonics = tex`A closed pipe has only odd harmonics, $f = \frac{nv}{4L}$, and ${describe(c.name, c.n, 'n_c')}. An open pipe has all harmonics, $f = \frac{nv}{2L}$, and ${describe(o.name, o.n, 'n_o')}.`;
    const ncv = coefTex(c.n, 'v');
    const nov = coefTex(o.n, 'v');

    if (r.chance(0.5)) {
      return {
        stem: tex`The ${c.name} of a pipe closed at one end has the same frequency as the ${o.name} of a pipe open at both ends. The ratio $L_c : L_o$ of the length of the closed pipe to that of the open pipe is:`,
        answer,
        distractors,
        explanation: tex`${harmonics} Equal frequencies: $\frac{${ncv}}{4L_c} = \frac{${nov}}{2L_o}$, so $\frac{L_c}{L_o} = \frac{${c.n}}{2 \times ${o.n}} = ${ratio.toTex()}$, i.e. $${ratio.n} : ${ratio.d}$.`,
      };
    }
    return {
      stem: tex`A pipe closed at one end and a pipe open at both ends have the same length. If $f_c$ is the frequency of the ${c.name} of the closed pipe and $f_o$ that of the ${o.name} of the open pipe, the ratio $f_c : f_o$ is:`,
      answer,
      distractors,
      explanation: tex`${harmonics} For the same length $L$: $\frac{f_c}{f_o} = \frac{${ncv}}{4L} \times \frac{2L}{${nov}} = \frac{${c.n}}{2 \times ${o.n}} = ${ratio.toTex()}$, i.e. $${ratio.n} : ${ratio.d}$.`,
    };
  }),

  // ---------------------------------------------------------------- concepts
  ...b.mcqs([
    {
      id: 'speed-independent-of-pressure',
      d: 1,
      o: 'past-paper',
      t: ['speed of sound'],
      q: 'If the pressure of air is doubled while its temperature is kept constant, the speed of sound in the air:',
      a: 'remains unchanged',
      x: ['is doubled', tex`becomes $\sqrt{2}$ times`, 'is halved'],
      e: tex`$v = \sqrt{\frac{\gamma P}{\rho}}$. At constant temperature the density rises in proportion to the pressure (Boyle's law), so $\frac{P}{\rho}$, and hence $v$, does not change.`,
    },
    {
      id: 'laplace-correction',
      d: 1,
      o: 'past-paper',
      t: ['speed of sound'],
      q: "Laplace corrected Newton's formula for the speed of sound in air by treating the compressions and rarefactions as:",
      a: 'adiabatic',
      x: ['isothermal', 'isobaric', 'isochoric'],
      e: tex`Compressions and rarefactions are too rapid for heat to flow in or out, so the process is adiabatic and $v = \sqrt{\frac{\gamma P}{\rho}}$ with $\gamma = 1.4$ for air. Newton's isothermal formula $v = \sqrt{\frac{P}{\rho}}$ gives only about $280\,\mathrm{m\,s^{-1}}$ at $0^{\circ}\mathrm{C}$, against the measured $332\,\mathrm{m\,s^{-1}}$.`,
    },
    {
      id: 'fixed-end-phase-change',
      d: 1,
      t: ['stationary waves', 'superposition'],
      q: 'A transverse wave travelling along a string is reflected from an end that is rigidly fixed to a wall. On reflection, the wave undergoes a phase change of:',
      a: tex`$\pi$ rad`,
      x: [tex`$0$ rad`, tex`$\frac{\pi}{2}$ rad`, tex`$\frac{3\pi}{2}$ rad`],
      e: tex`The fixed end cannot move, so the reflected wave must cancel the incident displacement there: it returns inverted, a phase change of $\pi$ rad ($180^{\circ}$). The same happens on reflection from a denser medium; at a free end there is no phase change.`,
    },
    {
      id: 'destructive-interference-path',
      d: 1,
      t: ['superposition'],
      q: tex`Two loudspeakers driven in phase by the same oscillator emit sound of wavelength $\lambda$. A listener hears a minimum of sound where the path difference between the two waves is ($n = 0, 1, 2, \dots$):`,
      a: tex`$\left(n + \frac{1}{2}\right)\lambda$`,
      x: [tex`$n\lambda$`, tex`$(2n + 1)\lambda$`, tex`$\left(n + \frac{1}{4}\right)\lambda$`],
      e: tex`The waves cancel when they arrive half a cycle out of step, i.e. when the path difference is an odd multiple of $\frac{\lambda}{2}$: $\left(n + \frac{1}{2}\right)\lambda$. A path difference of $n\lambda$ gives a maximum (constructive interference).`,
    },
    {
      id: 'beats-condition',
      d: 1,
      t: ['beats', 'superposition'],
      q: 'Beats are produced by the superposition of two sound waves that have:',
      a: 'slightly different frequencies',
      x: [
        'equal frequencies and a constant phase difference',
        'equal frequencies, travelling in opposite directions',
        'equal wavelengths and equal amplitudes',
      ],
      e: tex`Waves of slightly different frequencies drift in and out of step, so the loudness rises and falls $|f_1 - f_2|$ times per second. Equal frequencies give steady interference instead, or a stationary wave when the waves travel in opposite directions.`,
    },
    {
      id: 'stationary-wave-phase',
      d: 2,
      t: ['stationary waves'],
      q: 'In a stationary wave, all the particles between two adjacent nodes vibrate:',
      a: 'in phase but with different amplitudes',
      x: [
        'in phase and with equal amplitudes',
        'with phases that change gradually along the wave',
        'out of phase but with equal amplitudes',
      ],
      e: 'Each segment between adjacent nodes moves as a whole, so all its particles are in phase, but the amplitude varies from zero at the nodes to a maximum at the antinode. Particles in neighbouring segments vibrate in antiphase. A gradual change of phase along the wave belongs to a progressive wave.',
    },
    {
      id: 'observer-approach-reason',
      d: 2,
      t: ['Doppler effect'],
      q: 'An observer moving towards a stationary source of sound hears a higher frequency than the source emits. This is because:',
      a: 'the waves reach the observer at a greater relative speed',
      x: [
        'the wavelength of the waves reaching the observer decreases',
        'the source emits more waves per second',
        'the speed of sound in the air increases',
      ],
      e: tex`The source is at rest, so the wavelength in air stays $\lambda = \frac{v}{f}$ and the speed of sound in air is unchanged. Moving towards the source at $u_o$, the observer meets the waves at a relative speed $v + u_o$ and so receives $\frac{v + u_o}{\lambda} = f\,\frac{v + u_o}{v}$ waves per second.`,
    },
    {
      id: 'doppler-source-vs-observer',
      d: 3,
      t: ['Doppler effect'],
      q: tex`A source of sound of frequency $f$ moves with speed $u$ towards a stationary observer, who hears a frequency $f_1$. If instead the observer moves with the same speed $u$ towards the stationary source, the frequency heard is $f_2$. If $u$ is less than the speed of sound, then:`,
      a: tex`$f_1 > f_2 > f$`,
      x: [tex`$f_2 > f_1 > f$`, tex`$f_1 = f_2 > f$`, tex`$f_1 > f > f_2$`],
      e: tex`$f_1 = f\,\frac{v}{v - u} = \frac{f}{1 - x}$ and $f_2 = f\,\frac{v + u}{v} = f(1 + x)$, where $x = \frac{u}{v}$. Since $(1 - x)(1 + x) = 1 - x^2 < 1$, $\frac{1}{1 - x} > 1 + x > 1$, so $f_1 > f_2 > f$. For example, with $v = 340\,\mathrm{m\,s^{-1}}$, $u = 34\,\mathrm{m\,s^{-1}}$ and $f = 900\,\mathrm{Hz}$: $f_1 = 1000\,\mathrm{Hz}$ and $f_2 = 990\,\mathrm{Hz}$.`,
    },
    {
      id: 'closed-pipe-odd-harmonics',
      d: 1,
      o: 'past-paper',
      t: ['strings and pipes'],
      q: 'An organ pipe closed at one end and open at the other can produce:',
      a: 'odd harmonics only',
      x: ['even harmonics only', 'both odd and even harmonics', 'the fundamental frequency only'],
      e: tex`The closed end must be a node and the open end an antinode, so the pipe holds an odd number of quarter wavelengths: $L = \frac{n\lambda}{4}$ with $n = 1, 3, 5, \dots$, giving $f_n = \frac{nv}{4L}$. A pipe open at both ends has antinodes at both ends and produces all harmonics.`,
    },
    {
      id: 'sound-fastest-medium',
      d: 1,
      t: ['speed of sound'],
      q: 'Under ordinary conditions, sound travels fastest in:',
      a: 'steel',
      x: ['water', 'air', 'hydrogen gas'],
      e: tex`Sound travels fastest in solids, slower in liquids and slowest in gases, because solids are far less compressible ($v = \sqrt{\frac{E}{\rho}}$). Typical speeds: steel about $5000\,\mathrm{m\,s^{-1}}$, water about $1500\,\mathrm{m\,s^{-1}}$, hydrogen about $1300\,\mathrm{m\,s^{-1}}$ and air about $340\,\mathrm{m\,s^{-1}}$.`,
    },
    {
      id: 'hydrogen-oxygen-sound-ratio',
      d: 2,
      o: 'past-paper',
      t: ['speed of sound'],
      q: 'At the same temperature, the ratio of the speed of sound in hydrogen to that in oxygen is:',
      a: tex`$4 : 1$`,
      x: [tex`$1 : 4$`, tex`$16 : 1$`, tex`$1 : 1$`],
      e: tex`$v = \sqrt{\frac{\gamma RT}{M}}$. Both gases are diatomic ($\gamma = 1.4$), so at the same temperature $\frac{v_{\mathrm{H_2}}}{v_{\mathrm{O_2}}} = \sqrt{\frac{M_{\mathrm{O_2}}}{M_{\mathrm{H_2}}}} = \sqrt{\frac{32}{2}} = 4$, i.e. $4 : 1$. Forgetting the square root gives $16 : 1$.`,
    },
    {
      id: 'frequency-unchanged-new-medium',
      d: 1,
      t: ['wave speed'],
      q: 'When a sound wave passes from air into water, the quantity that remains unchanged is its:',
      a: 'frequency',
      x: ['speed', 'wavelength', 'speed and wavelength'],
      e: tex`The frequency is set by the source and does not change at a boundary. The speed rises (from about $340$ to about $1500\,\mathrm{m\,s^{-1}}$), so the wavelength $\lambda = \frac{v}{f}$ increases in the same ratio.`,
    },
    {
      id: 'sound-speed-per-degree',
      d: 1,
      t: ['speed of sound'],
      q: tex`For each $1^{\circ}\mathrm{C}$ rise in temperature, the speed of sound in air increases by about:`,
      a: q$(0.61, U.mps),
      x: [q$(6.1, U.mps), q$(0.061, U.mps), q$(61, U.mps)],
      e: tex`$v \propto \sqrt{T}$, so $v_t = v_0\sqrt{1 + \frac{t}{273}} \approx v_0\left(1 + \frac{t}{546}\right)$. With $v_0 = 332\,\mathrm{m\,s^{-1}}$ at $0^{\circ}\mathrm{C}$: $v_t \approx 332 + 0.61t$, an increase of about $0.61\,\mathrm{m\,s^{-1}}$ per degree.`,
    },
    {
      id: 'sound-longitudinal',
      d: 1,
      t: ['speed of sound'],
      q: 'Sound waves in air are longitudinal. This means that the air particles:',
      a: 'vibrate back and forth along the direction in which the wave travels',
      x: [
        'vibrate at right angles to the direction in which the wave travels',
        'travel with the wave from the source to the listener',
        'move in circles about their mean positions',
      ],
      e: 'In a longitudinal wave the particles oscillate about their mean positions parallel to the direction of propagation, forming compressions and rarefactions. Only the disturbance (energy) travels; the particles are not carried along. Vibration at right angles to the direction of travel describes a transverse wave.',
    },
    {
      id: 'half-wavelength-phase',
      d: 1,
      t: ['superposition'],
      q: 'Two points on a progressive wave are half a wavelength apart along the direction of travel. The phase difference between their vibrations is:',
      a: tex`$\pi$ rad`,
      x: [tex`$2\pi$ rad`, tex`$\frac{\pi}{2}$ rad`, tex`$\frac{\pi}{4}$ rad`],
      e: tex`Phase difference $= \frac{2\pi}{\lambda} \times$ (path difference) $= \frac{2\pi}{\lambda} \times \frac{\lambda}{2} = \pi$ rad, so the two points always move in opposite directions.`,
    },
    {
      id: 'stationary-wave-not-true',
      d: 2,
      t: ['stationary waves'],
      q: 'Which of the following statements about a stationary wave is **NOT** correct?',
      a: 'It transfers energy along the medium.',
      x: [
        'Adjacent nodes are half a wavelength apart.',
        'It is formed by two identical waves travelling in opposite directions.',
        'The particles at the nodes remain at rest.',
      ],
      e: 'A stationary wave is the superposition of two identical waves travelling in opposite directions. Its nodes (always at rest) and antinodes stay in fixed positions, and adjacent nodes are half a wavelength apart. The energy is stored in the vibrating segments and is not carried along the medium, unlike in a progressive wave.',
    },
    {
      id: 'receding-star-red-shift',
      d: 1,
      t: ['Doppler effect'],
      q: 'Light from a star that is moving away from the Earth shows:',
      a: 'a red shift: its spectral lines move towards longer wavelengths',
      x: [
        'a blue shift: its spectral lines move towards shorter wavelengths',
        'a red shift: its spectral lines move towards shorter wavelengths',
        'a blue shift: its spectral lines move towards longer wavelengths',
      ],
      e: 'For a receding source the waves are stretched out, so the observed wavelength is longer and the frequency lower: the spectral lines shift towards the red end of the spectrum. An approaching star shows a blue shift (shorter wavelengths). This Doppler shift is used to measure the speeds of stars and galaxies.',
    },
  ]),
]);
