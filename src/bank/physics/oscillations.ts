/**
 * Physics - Oscillations (FSc Part I).
 *
 * Coverage: SHM kinematics (reading x = x0 sin(wt + phi), maximum and instantaneous
 * speed and acceleration, phase-based timing), the mass-spring system (period, spring
 * constant, static extension, scaling), the simple pendulum (period, scaling, percentage
 * change, accelerating and freely falling lifts, the seconds pendulum), energy in SHM,
 * resonance and damping.
 */
import { defineBank } from '@/engine/authoring';
import { Fraction, gcd, num, numericOptions, pickDistractors, q$, qty, simplifySurd, tex, U } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

/** Unit of the spring constant. */
const NPM = 'N\\,m^{-1}';

/** True when `v` has at most `dp` decimal places (ignores binary noise such as 0.1 * 3). */
function nice(v: number, dp = 2): boolean {
  const scaled = v * 10 ** dp;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

/** True when `num()` (3 significant figures) shows `v` exactly, without rounding. */
function exact3(v: number): boolean {
  return Number.isFinite(v) && Math.abs(Number(v.toPrecision(3)) - v) <= 1e-9 * Math.abs(v);
}

/** Keeps only mistake values that display exactly, so no option is a rounded number. */
const exactOnly = (values: readonly number[]): number[] => values.filter(exact3);

/** A multiple of pi as LaTeX: 0.2 -> `0.2\pi`, 1 -> `\pi`. */
function piTex(c: number): string {
  const text = num(c);
  return text === '1' ? '\\pi' : `${text}\\pi`;
}

/** A time that is a multiple of pi seconds, as a complete option: `$0.2\pi\,\mathrm{s}$`. */
const piSeconds = (c: number): string => `$${piTex(c)}\\,\\mathrm{s}$`;

/** A reduced ratio as an option: (6, 2) -> `$3:1$`. */
function ratioTex(a: number, b: number): string {
  const g = gcd(a, b);
  return `$${a / g}:${b / g}$`;
}

/** A rational share of the total energy E as an option: (3, 4) -> `$\frac{3}{4}E$`. */
const energyShare = (n: number, d: number): string => `$${new Fraction(n, d).toTex()}E$`;

/** sqrt(radicand)/den of the total energy E, simplified: (8, 3) -> `$\frac{2\sqrt{2}}{3}E$`. */
function surdShare(radicand: number, den: number): string {
  const { c, r: rad } = simplifySurd(1, radicand);
  if (rad === 1) return energyShare(c, den);
  const g = gcd(c, den);
  const top = `${c / g === 1 ? '' : c / g}\\sqrt{${rad}}`;
  return den / g === 1 ? `$${top}\\,E$` : `$\\frac{${top}}{${den / g}}E$`;
}

/** Pythagorean triples [amplitude, displacement, sqrt(amplitude^2 - displacement^2)], in cm. */
const TRIPLES: ReadonlyArray<readonly [number, number, number]> = [
  [5, 3, 4], [5, 4, 3], [10, 6, 8], [10, 8, 6], [13, 5, 12], [13, 12, 5], [15, 9, 12], [15, 12, 9],
  [17, 8, 15], [17, 15, 8], [20, 12, 16], [20, 16, 12], [25, 7, 24], [25, 24, 7], [25, 15, 20], [25, 20, 15],
];

/** Displacements x = (p/q) x0 used by the energy-sharing questions. */
const SHARES: ReadonlyArray<readonly [number, number]> = [
  [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5],
];

/**
 * (omega, amplitude) pairs for x = x0 sin(omega t) whose maximum speed and acceleration are exact at
 * 3 s.f. (x0 = 0.5 m is left out: there 2 v_max = omega and 2 a_max = omega^2, so mistakes coincide).
 */
const KINEMATIC_PAIRS: ReadonlyArray<readonly [number, number]> = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20].flatMap((w) =>
  [0.02, 0.04, 0.05, 0.08, 0.1, 0.15, 0.2, 0.25]
    .filter((amp) => exact3(w * amp) && exact3(w * w * amp))
    .map((amp) => [w, amp] as const),
);

/** (mass, spring constant) pairs with sqrt(m/k) = s exactly, so T = 2*pi*s is a clean multiple of pi. */
const SPRING_PAIRS: ReadonlyArray<{ m: number; k: number; s: number }> = (() => {
  const out: Array<{ m: number; k: number; s: number }> = [];
  for (const s of [0.05, 0.1, 0.2, 0.25, 0.5]) {
    for (const k of [16, 20, 25, 40, 50, 64, 80, 100, 160, 200, 250, 400, 500, 800]) {
      const m = k * s * s;
      if (m >= 0.1 && m <= 10 && nice(m, 2)) out.push({ m: Number(m.toFixed(2)), k, s });
    }
  }
  return out;
})();

// Options written in terms of the original period T.
const T_SAME = '$T$';
const T_DOUBLE = '$2T$';
const T_TRIPLE = '$3T$';
const T_FOUR = '$4T$';
const T_NINE = '$9T$';
const T_HALF = '$\\frac{T}{2}$';
const T_THIRD = '$\\frac{T}{3}$';
const T_QUARTER = '$\\frac{T}{4}$';
const T_ROOT2 = '$\\sqrt{2}\\,T$';
const T_OVER_ROOT2 = '$\\frac{T}{\\sqrt{2}}$';

interface SymbolicCase {
  /** Clause completing "If ..., the new period ...". */
  change: string;
  answer: string;
  wrong: readonly [string, string, string];
  why: string;
}

const SPRING_CHANGES: readonly SymbolicCase[] = [
  {
    change: 'the mass is increased to four times its original value',
    answer: T_DOUBLE,
    wrong: [T_FOUR, T_HALF, T_SAME],
    why: tex`$T = 2\pi\sqrt{\frac{m}{k}} \propto \sqrt{m}$, so $T' = \sqrt{4}\,T = 2T$.`,
  },
  {
    change: 'the mass is increased to nine times its original value',
    answer: T_TRIPLE,
    wrong: [T_NINE, T_THIRD, T_SAME],
    why: tex`$T = 2\pi\sqrt{\frac{m}{k}} \propto \sqrt{m}$, so $T' = \sqrt{9}\,T = 3T$.`,
  },
  {
    change: 'the mass is reduced to one-fourth of its original value',
    answer: T_HALF,
    wrong: [T_QUARTER, T_DOUBLE, T_SAME],
    why: tex`$T = 2\pi\sqrt{\frac{m}{k}} \propto \sqrt{m}$, so $T' = \sqrt{\tfrac{1}{4}}\,T = \frac{T}{2}$.`,
  },
  {
    change: 'the spring is replaced by one that is four times as stiff',
    answer: T_HALF,
    wrong: [T_DOUBLE, T_QUARTER, T_FOUR],
    why: tex`$T = 2\pi\sqrt{\frac{m}{k}} \propto \frac{1}{\sqrt{k}}$; with $k' = 4k$, $T' = \frac{T}{\sqrt{4}} = \frac{T}{2}$.`,
  },
  {
    change: 'the spring is replaced by one whose spring constant is one-fourth as large',
    answer: T_DOUBLE,
    wrong: [T_HALF, T_FOUR, T_QUARTER],
    why: tex`$T = 2\pi\sqrt{\frac{m}{k}} \propto \frac{1}{\sqrt{k}}$; with $k' = \frac{k}{4}$, $T' = \sqrt{4}\,T = 2T$.`,
  },
  {
    change: 'the mass is doubled',
    answer: T_ROOT2,
    wrong: [T_DOUBLE, T_OVER_ROOT2, T_FOUR],
    why: tex`$T = 2\pi\sqrt{\frac{m}{k}} \propto \sqrt{m}$, so $T' = \sqrt{2}\,T$.`,
  },
  {
    change: 'the amplitude of oscillation is doubled',
    answer: T_SAME,
    wrong: [T_DOUBLE, T_ROOT2, T_HALF],
    why: tex`$T = 2\pi\sqrt{\frac{m}{k}}$ does not contain the amplitude, so the period is unchanged.`,
  },
  {
    change: 'the system is taken to the Moon, where $g$ is one-sixth of its value on the Earth',
    answer: T_SAME,
    wrong: ['$\\sqrt{6}\\,T$', '$\\frac{T}{\\sqrt{6}}$', '$6T$'],
    why: tex`$T = 2\pi\sqrt{\frac{m}{k}}$ does not contain $g$, so the period is the same on the Moon (unlike that of a simple pendulum).`,
  },
  {
    change: 'both the mass and the spring constant are doubled',
    answer: T_SAME,
    wrong: [T_DOUBLE, T_ROOT2, T_HALF],
    why: tex`$T' = 2\pi\sqrt{\frac{2m}{2k}} = 2\pi\sqrt{\frac{m}{k}} = T$.`,
  },
  {
    change: 'the mass is doubled and the spring constant is halved',
    answer: T_DOUBLE,
    wrong: [T_SAME, T_FOUR, T_ROOT2],
    why: tex`$T' = 2\pi\sqrt{\frac{2m}{k/2}} = 2\pi\sqrt{\frac{4m}{k}} = 2T$.`,
  },
  {
    change: 'the spring is cut into two equal halves and the same mass is attached to one half',
    answer: T_OVER_ROOT2,
    wrong: [T_ROOT2, T_HALF, T_DOUBLE],
    why: tex`Each half stretches only half as much under the same force, so its spring constant is $2k$ and $T' = 2\pi\sqrt{\frac{m}{2k}} = \frac{T}{\sqrt{2}}$.`,
  },
];

const LIFT_CASES: readonly SymbolicCase[] = [
  {
    change: 'accelerates upward at $g$',
    answer: T_OVER_ROOT2,
    wrong: [T_ROOT2, T_HALF, T_SAME],
    why: tex`The acceleration is upward, so $g_{\mathrm{eff}} = g + a = 2g$ and $T' = T\sqrt{\frac{g}{2g}} = \frac{T}{\sqrt{2}}$.`,
  },
  {
    change: tex`accelerates downward at $\frac{g}{2}$`,
    answer: T_ROOT2,
    wrong: [T_OVER_ROOT2, T_DOUBLE, T_SAME],
    why: tex`The acceleration is downward, so $g_{\mathrm{eff}} = g - a = \frac{g}{2}$ and $T' = T\sqrt{\frac{g}{g/2}} = \sqrt{2}\,T$.`,
  },
  {
    change: tex`accelerates downward at $\frac{3g}{4}$`,
    answer: T_DOUBLE,
    wrong: [T_HALF, T_FOUR, tex`$\frac{2T}{\sqrt{7}}$`],
    why: tex`The acceleration is downward, so $g_{\mathrm{eff}} = g - \frac{3g}{4} = \frac{g}{4}$ and $T' = T\sqrt{\frac{g}{g/4}} = 2T$.`,
  },
  {
    change: 'moves upward with a constant speed',
    answer: T_SAME,
    wrong: [T_OVER_ROOT2, T_ROOT2, T_DOUBLE],
    why: tex`At constant velocity the acceleration is zero, so $g_{\mathrm{eff}} = g$ and the period is unchanged.`,
  },
  {
    change: tex`is moving upward but slowing down at the rate of $\frac{g}{2}$`,
    answer: T_ROOT2,
    wrong: [T_OVER_ROOT2, tex`$\sqrt{\frac{2}{3}}\,T$`, T_SAME],
    why: tex`Slowing down while moving up means the acceleration is $\frac{g}{2}$ **downward**, so $g_{\mathrm{eff}} = g - \frac{g}{2} = \frac{g}{2}$ and $T' = \sqrt{2}\,T$.`,
  },
  {
    change: 'is moving downward but slowing down at the rate of $g$',
    answer: T_OVER_ROOT2,
    wrong: [T_ROOT2, T_HALF, T_SAME],
    why: tex`Slowing down while moving down means the acceleration is $g$ **upward**, so $g_{\mathrm{eff}} = g + g = 2g$ and $T' = \frac{T}{\sqrt{2}}$.`,
  },
  {
    change: tex`accelerates upward at $\frac{g}{3}$`,
    answer: tex`$\frac{\sqrt{3}}{2}\,T$`,
    wrong: [tex`$\sqrt{\frac{3}{2}}\,T$`, tex`$\frac{3}{4}\,T$`, T_SAME],
    why: tex`The acceleration is upward, so $g_{\mathrm{eff}} = g + \frac{g}{3} = \frac{4g}{3}$ and $T' = T\sqrt{\frac{3}{4}} = \frac{\sqrt{3}}{2}\,T$.`,
  },
];

interface PendulumChange {
  text: string;
  /** New period divided by the old one. */
  factor: number;
  /** Period ratios produced by typical mistakes. */
  wrong: readonly number[];
  why: string;
}

const PENDULUM_CHANGES: readonly PendulumChange[] = [
  {
    text: 'its length is increased to four times the original length',
    factor: 2,
    wrong: [4, 0.5, 1],
    why: tex`$T = 2\pi\sqrt{\frac{l}{g}} \propto \sqrt{l}$, so $T' = \sqrt{4}\,T = 2T$`,
  },
  {
    text: 'its length is increased to nine times the original length',
    factor: 3,
    wrong: [9, 1 / 3, 1],
    why: tex`$T = 2\pi\sqrt{\frac{l}{g}} \propto \sqrt{l}$, so $T' = \sqrt{9}\,T = 3T$`,
  },
  {
    text: 'its length is reduced to one-fourth of the original length',
    factor: 0.5,
    wrong: [0.25, 2, 1],
    why: tex`$T = 2\pi\sqrt{\frac{l}{g}} \propto \sqrt{l}$, so $T' = \sqrt{\tfrac{1}{4}}\,T = \frac{T}{2}$`,
  },
  {
    text: 'it is taken to a planet where the acceleration due to gravity is one-fourth of its value on the Earth',
    factor: 2,
    wrong: [0.5, 4, 1],
    why: tex`$T = 2\pi\sqrt{\frac{l}{g}} \propto \frac{1}{\sqrt{g}}$, so $T' = \frac{T}{\sqrt{1/4}} = 2T$`,
  },
  {
    text: 'it is taken to a planet where the acceleration due to gravity is four times its value on the Earth',
    factor: 0.5,
    wrong: [2, 0.25, 1],
    why: tex`$T = 2\pi\sqrt{\frac{l}{g}} \propto \frac{1}{\sqrt{g}}$, so $T' = \frac{T}{\sqrt{4}} = \frac{T}{2}$`,
  },
  {
    text: 'the mass of its bob is doubled',
    factor: 1,
    wrong: [Math.SQRT2, 2, 0.5],
    why: tex`$T = 2\pi\sqrt{\frac{l}{g}}$ does not depend on the mass of the bob, so $T' = T$`,
  },
  {
    text: 'its amplitude is doubled (the oscillations remain small)',
    factor: 1,
    wrong: [2, Math.SQRT2, 0.5],
    why: tex`For small oscillations $T = 2\pi\sqrt{\frac{l}{g}}$ does not depend on the amplitude, so $T' = T$`,
  },
];

interface PhaseCase {
  from: string;
  to: string;
  /** The time asked for is T / n. */
  n: number;
  /** Other fractions T / w offered as distractors. */
  wrong: readonly number[];
  path: string;
}

const PHASE_CASES: readonly PhaseCase[] = [
  {
    from: 'the mean position',
    to: tex`a displacement of $\frac{x_0}{2}$`,
    n: 12,
    wrong: [8, 6, 4],
    path: tex`$\theta$ changes from $0^\circ$ to $30^\circ$ (as $\sin 30^\circ = \frac{1}{2}$)`,
  },
  {
    from: 'an extreme position',
    to: tex`a displacement of $\frac{x_0}{2}$ on the same side`,
    n: 6,
    wrong: [8, 12, 4],
    path: tex`$\theta$ changes from $90^\circ$ to $150^\circ$ (as $\sin 150^\circ = \frac{1}{2}$)`,
  },
  {
    from: 'the mean position',
    to: tex`a displacement of $\frac{x_0}{\sqrt{2}}$`,
    n: 8,
    wrong: [12, 6, 4],
    path: tex`$\theta$ changes from $0^\circ$ to $45^\circ$ (as $\sin 45^\circ = \frac{1}{\sqrt{2}}$)`,
  },
  {
    from: 'the mean position',
    to: tex`a displacement of $\frac{\sqrt{3}}{2}x_0$`,
    n: 6,
    wrong: [12, 8, 4],
    path: tex`$\theta$ changes from $0^\circ$ to $60^\circ$ (as $\sin 60^\circ = \frac{\sqrt{3}}{2}$)`,
  },
  {
    from: 'an extreme position',
    to: tex`a displacement of $\frac{\sqrt{3}}{2}x_0$ on the same side`,
    n: 12,
    wrong: [6, 8, 24],
    path: tex`$\theta$ changes from $90^\circ$ to $120^\circ$ (as $\sin 120^\circ = \frac{\sqrt{3}}{2}$)`,
  },
  {
    from: tex`a displacement of $+\frac{x_0}{2}$`,
    to: tex`a displacement of $-\frac{x_0}{2}$`,
    n: 6,
    wrong: [4, 12, 8],
    path: tex`$\theta$ changes from $150^\circ$ to $210^\circ$, passing through the mean position`,
  },
];

/** Statements for the resonance/damping question; claims sharing a key are never shown together. */
interface Claim {
  key: string;
  text: string;
  why: string;
}

const RESONANCE_TRUTHS: readonly Claim[] = [
  {
    key: 'condition',
    text: 'Resonance occurs when the frequency of the driving force equals the natural frequency of the system.',
    why: 'This is the condition for resonance: the driver then pushes in step with the motion and transfers energy most effectively.',
  },
  {
    key: 'decay',
    text: 'Damping makes the amplitude of a freely oscillating system decrease with time.',
    why: 'Resistive forces such as friction and air drag remove energy from the oscillator, so its amplitude dies away.',
  },
  {
    key: 'energy',
    text: 'In damped oscillations, mechanical energy is gradually converted into heat.',
    why: 'Work done against friction or air resistance turns the mechanical energy of the oscillator into internal energy (heat).',
  },
  {
    key: 'shock',
    text: 'Shock absorbers in a vehicle use damping to reduce its oscillations.',
    why: 'A shock absorber dissipates the energy of the bouncing car body, so its oscillations die out quickly.',
  },
  {
    key: 'electrical',
    text: 'Tuning a radio to a station is an example of electrical resonance.',
    why: 'The natural frequency of the tuning circuit is adjusted until it equals the frequency of the wanted signal.',
  },
  {
    key: 'forced',
    text: 'In forced oscillations, the system finally vibrates at the frequency of the driving force.',
    why: 'Once the steady state is reached, a driven system vibrates at the driving frequency, not at its own natural frequency.',
  },
  {
    key: 'small-force',
    text: 'A small periodic force can build up a large amplitude if it acts at the natural frequency.',
    why: 'At resonance every push adds energy in step with the motion, so the amplitude grows until damping limits it.',
  },
  {
    key: 'bridge',
    text: 'Soldiers break step on a bridge so that their marching does not drive it into resonance.',
    why: 'Regular footsteps could match a natural frequency of the bridge and build up dangerously large oscillations.',
  },
];

const RESONANCE_FALSEHOODS: readonly Claim[] = [
  {
    key: 'condition',
    text: 'Resonance occurs when the driving frequency is much higher than the natural frequency of the system.',
    why: 'Resonance requires the driving frequency to equal the natural frequency; far from it the response is small.',
  },
  {
    key: 'small-force',
    text: 'Resonance can occur only when the driving force is very large.',
    why: 'Resonance depends on matching frequencies, not on the size of the force; even a small periodic force can cause it.',
  },
  {
    key: 'decay',
    text: 'Damping makes the amplitude of a freely oscillating system grow with time.',
    why: 'Damping removes energy from the system, so the amplitude decreases with time.',
  },
  {
    key: 'energy',
    text: 'A damped oscillator keeps its total mechanical energy constant.',
    why: 'Damping dissipates mechanical energy as heat, so the total mechanical energy keeps decreasing.',
  },
  {
    key: 'forced',
    text: 'In forced oscillations, the system always vibrates at its own natural frequency, whatever the driving frequency.',
    why: 'In the steady state a driven system vibrates at the frequency of the driving force.',
  },
  {
    key: 'shock',
    text: 'Shock absorbers are designed to make a vehicle resonate with the bumps on the road.',
    why: 'Shock absorbers provide damping precisely to prevent large oscillations of the vehicle.',
  },
  {
    key: 'electrical',
    text: 'Resonance can occur in mechanical systems but never in electrical circuits.',
    why: 'Electrical resonance occurs in circuits containing inductance and capacitance, for example when a radio is tuned.',
  },
  {
    key: 'free',
    text: 'Free oscillations need a periodic driving force to keep the system vibrating.',
    why: 'Free oscillations take place without any driving force; a periodic driving force produces forced oscillations.',
  },
];

/** "Which statement is (not) correct" built from keyed claims, never pairing a claim with its own negation. */
function claimQuestion(
  r: Rng,
  topic: string,
  truths: readonly Claim[],
  falsehoods: readonly Claim[],
): { stem: string; answer: string; distractors: string[]; explanation: string } {
  const inverted = r.chance(0.35);
  const answer = r.pick(inverted ? falsehoods : truths);
  const others = r.sample(
    (inverted ? truths : falsehoods).filter((c) => c.key !== answer.key),
    3,
  );
  return {
    stem: inverted
      ? `Which of the following statements about ${topic} is **not** correct?`
      : `Which of the following statements about ${topic} is correct?`,
    answer: answer.text,
    distractors: others.map((c) => c.text),
    explanation: `${inverted ? 'This statement is false.' : 'This statement is true.'} ${answer.why} The other three statements are ${inverted ? 'true' : 'false'}.`,
  };
}

export default defineBank('physics', 'oscillations', (b) => [
  // ------------------------------------------------------------------ simple harmonic motion
  b.dynamic('shm-equation-frequency', { difficulty: 1, origin: 'past-paper', tags: ['simple harmonic motion'] }, (r) => {
    const k = r.pick([2, 4, 5, 8, 10, 16, 20, 25, 40, 50, 80, 100]);
    const amp = r.pick([0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.12, 0.15, 0.2, 0.25]);
    const fn = r.pick(['\\sin', '\\cos']);
    const phase = r.pick(['', '\\frac{\\pi}{6}', '\\frac{\\pi}{4}', '\\frac{\\pi}{3}', '\\frac{\\pi}{2}']);
    const arg = phase ? `\\left(${k}\\pi t + ${phase}\\right)` : `(${k}\\pi t)`;
    const stem = (what: string) =>
      tex`The displacement of a particle executing SHM is $x = ${num(amp)}${fn}${arg}$, where $x$ is in metres and $t$ in seconds. The ${what} of the motion is:`;
    const lead = tex`Comparing with $x = x_0${fn}(\omega t + \phi)$ gives $\omega = ${k}\pi\,\mathrm{rad\,s^{-1}}$.`;
    if (r.chance(0.5)) {
      const period = 2 / k;
      const { answer, distractors } = numericOptions(r, {
        correct: period,
        // the frequency value; T = pi/omega; T = 4pi/omega; ignored the pi in omega
        wrong: [k / 2, 1 / k, 4 / k, (2 * Math.PI) / k],
        format: (v) => q$(v, U.s),
      });
      return {
        stem: stem('time period'),
        answer,
        distractors,
        explanation: tex`${lead} $T = \frac{2\pi}{\omega} = \frac{2\pi}{${k}\pi} = ${num(period)}\,\mathrm{s}$.`,
      };
    }
    const f = k / 2;
    const { answer, distractors } = numericOptions(r, {
      correct: f,
      // f = omega/pi; the period value; f = omega; f = 2 omega/pi
      wrong: [k, 2 / k, k * Math.PI, 2 * k],
      format: (v) => q$(v, U.Hz),
    });
    return {
      stem: stem('frequency'),
      answer,
      distractors,
      explanation: tex`${lead} $f = \frac{\omega}{2\pi} = \frac{${k}\pi}{2\pi} = ${num(f)}\,\mathrm{Hz}$.`,
    };
  }),

  b.dynamic('shm-speed-acceleration', { difficulty: 2, tags: ['simple harmonic motion'] }, (r) => {
    const kind = r.pick(['vmax', 'amax', 'v-at-x', 'a-at-x'] as const);

    if (kind === 'vmax' || kind === 'amax') {
      const [w, amp] = r.pick(KINEMATIC_PAIRS);
      const fn = r.pick(['\\sin', '\\cos']);
      const vmax = w * amp;
      const amax = w * w * amp;
      const stem = (what: string) =>
        tex`A particle oscillates according to $x = ${num(amp)}${fn}(${w}t)$, where $x$ is in metres and $t$ in seconds. The ${what} of the particle is:`;
      const read = tex`Comparing with $x = x_0${fn}\omega t$: $x_0 = ${num(amp)}\,\mathrm{m}$ and $\omega = ${w}\,\mathrm{rad\,s^{-1}}$.`;
      if (kind === 'vmax') {
        const { answer, distractors } = numericOptions(r, {
          correct: vmax,
          // gave the maximum acceleration; x0/omega; doubled; forgot the amplitude
          wrong: exactOnly([amax, amp / w, 2 * vmax, w]),
          format: (v) => q$(v, U.mps),
        });
        return {
          stem: stem('maximum speed'),
          answer,
          distractors,
          explanation: tex`${read} $v_{\mathrm{max}} = \omega x_0 = ${w} \times ${num(amp)} = ${num(vmax)}\,\mathrm{m\,s^{-1}}$.`,
        };
      }
      const { answer, distractors } = numericOptions(r, {
        correct: amax,
        // gave the maximum speed; forgot the amplitude; used (1/2) omega^2 x0; doubled
        wrong: exactOnly([vmax, w * w, amax / 2, 2 * amax]),
        format: (v) => q$(v, U.mps2),
      });
      return {
        stem: stem('maximum acceleration'),
        answer,
        distractors,
        explanation: tex`${read} $a_{\mathrm{max}} = \omega^2 x_0 = (${w})^2 \times ${num(amp)} = ${num(amax)}\,\mathrm{m\,s^{-2}}$.`,
      };
    }

    if (kind === 'v-at-x') {
      const [A, x, leg] = r.pick(TRIPLES);
      const w = r.pick([2, 3, 4, 5, 6, 8, 10]);
      const v = (w * leg) / 100;
      const { answer, distractors } = numericOptions(r, {
        correct: v,
        // maximum speed; used omega*x; did not convert cm to m; used omega(x0 - x)
        wrong: [(w * A) / 100, (w * x) / 100, w * leg, (w * (A - x)) / 100],
        format: (val) => q$(val, U.mps),
      });
      return {
        stem: tex`A particle executes SHM with an amplitude of $${qty(A, U.cm)}$ and an angular frequency of $${qty(w, U.radps)}$. Its speed at a displacement of $${qty(x, U.cm)}$ from the mean position is:`,
        answer,
        distractors,
        explanation: tex`$v = \omega\sqrt{x_0^2 - x^2} = ${w}\sqrt{${A}^2 - ${x}^2}\,\mathrm{cm\,s^{-1}} = ${w} \times ${leg}\,\mathrm{cm\,s^{-1}} = ${w * leg}\,\mathrm{cm\,s^{-1}} = ${num(v)}\,\mathrm{m\,s^{-1}}$.`,
      };
    }

    const A = r.pick([5, 8, 10, 12, 15]);
    const x = r.int(1, A - 1);
    const w = r.pick([2, 3, 4, 5, 6, 8, 10]);
    const a = (w * w * x) / 100;
    const { answer, distractors } = numericOptions(r, {
      correct: a,
      // maximum acceleration; forgot to square omega; used x0 - x; did not convert cm to m
      wrong: [(w * w * A) / 100, (w * x) / 100, (w * w * (A - x)) / 100, w * w * x],
      format: (val) => q$(val, U.mps2),
    });
    return {
      stem: tex`A particle executes SHM with an amplitude of $${qty(A, U.cm)}$ and an angular frequency of $${qty(w, U.radps)}$. The magnitude of its acceleration at a displacement of $${qty(x, U.cm)}$ from the mean position is:`,
      answer,
      distractors,
      explanation: tex`In SHM $a = -\omega^2 x$, so $|a| = \omega^2 x = (${w})^2 \times ${num(x / 100)} = ${num(a)}\,\mathrm{m\,s^{-2}}$. The amplitude is not needed.`,
    };
  }),

  b.dynamic('shm-time-between-positions', { difficulty: 3, tags: ['simple harmonic motion'] }, (r) => {
    const c = r.pick(PHASE_CASES);
    const T = r.pick([0.24, 0.48, 1.2, 2.4, 3.6, 4.8, 7.2, 9.6, 12, 24]);
    const t = T / c.n;
    const { answer, distractors } = numericOptions(r, {
      correct: t,
      wrong: c.wrong.map((w) => T / w),
      format: (v) => q$(v, U.s),
    });
    return {
      stem: tex`A particle executes SHM with amplitude $x_0$ and time period $${qty(T, U.s)}$. The minimum time it takes to go from ${c.from} to ${c.to} is:`,
      answer,
      distractors,
      explanation: tex`Write $x = x_0\sin\theta$, where the phase $\theta$ increases uniformly by $360^\circ$ in each period $T$. Here ${c.path}: a change of $${360 / c.n}^\circ$, which is $\frac{1}{${c.n}}$ of a cycle. So $t = \frac{T}{${c.n}} = \frac{${num(T)}}{${c.n}} = ${num(t)}\,\mathrm{s}$. The speed is not uniform, so time is not proportional to distance.`,
    };
  }),

  // ------------------------------------------------------------------ mass-spring system
  b.dynamic('spring-period-calculation', { difficulty: 2, tags: ['mass-spring system'] }, (r) => {
    const kind = r.pick(['period', 'constant', 'static'] as const);

    if (kind === 'period') {
      const { m, k, s } = r.pick(SPRING_PAIRS);
      const { answer, distractors } = numericOptions(r, {
        correct: 2 * s,
        // inverted m/k; forgot the 2; forgot the square root; doubled
        wrong: [2 / s, s, 2 * s * s, 4 * s],
        format: piSeconds,
      });
      return {
        stem: tex`A block of mass $${qty(m, U.kg)}$ is attached to a spring of spring constant $${qty(k, NPM)}$ and set into oscillation on a smooth horizontal surface. The time period of its oscillation is:`,
        answer,
        distractors,
        explanation: tex`$T = 2\pi\sqrt{\frac{m}{k}} = 2\pi\sqrt{\frac{${num(m)}}{${k}}} = 2\pi(${num(s)}) = ${piTex(2 * s)}\,\mathrm{s}$.`,
      };
    }

    if (kind === 'constant') {
      const s = r.pick([0.05, 0.1, 0.2, 0.25, 0.5]);
      const grams = r.chance(0.5) ? r.pick([100, 200, 250, 400, 500, 800]) : 0;
      const m = grams ? grams / 1000 : r.pick([0.5, 1, 2, 4, 5]);
      const k = m / (s * s);
      const { answer, distractors } = numericOptions(r, {
        correct: k,
        // grams not converted; (2 pi)^2 taken as 2 pi^2; used T = 2 pi m / k; doubled; inverted
        wrong: exactOnly([grams ? 1000 * k : NaN, k / 2, m / s, 2 * k, (s * s) / m]),
        format: (v) => q$(v, NPM),
      });
      const massTex = grams ? qty(grams, U.g) : qty(m, U.kg);
      const note = grams ? tex` Here $m = ${grams}\,\mathrm{g} = ${num(m)}\,\mathrm{kg}$.` : '';
      return {
        stem: tex`A body of mass $${massTex}$ attached to a spring oscillates with a time period of $${piTex(2 * s)}\,\mathrm{s}$. The spring constant of the spring is:`,
        answer,
        distractors,
        explanation: tex`$T = 2\pi\sqrt{\frac{m}{k}} \Rightarrow k = \frac{4\pi^2 m}{T^2} = \frac{4\pi^2 (${num(m)})}{(${piTex(2 * s)})^2} = \frac{4(${num(m)})}{${num(4 * s * s)}} = ${num(k)}\,\mathrm{N\,m^{-1}}$.${note}`,
      };
    }

    // Static extension: k * dl = m g, so T = 2 pi sqrt(dl / g) whatever the mass.
    const s = r.pick([0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.12, 0.15, 0.2]);
    const dl = 10 * s * s;
    const m = r.pick([0.2, 0.25, 0.4, 0.5, 0.8, 1, 1.5, 2, 2.5, 3, 4, 5]);
    const { answer, distractors } = numericOptions(r, {
      correct: 2 * s,
      // extension left in cm; forgot the 2; inverted; doubled; forgot the square root
      wrong: [20 * s, s, ...(nice(2 / s) ? [2 / s] : []), 4 * s, 2 * s * s],
      format: piSeconds,
    });
    return {
      stem: tex`A spring hangs vertically. When a body of mass $${qty(m, U.kg)}$ is attached to it, the spring stretches by $${qty(dl * 100, U.cm)}$. The body is then pulled down slightly and released. The time period of its oscillation is (take $g = 10\,\mathrm{m\,s^{-2}}$):`,
      answer,
      distractors,
      explanation: tex`At equilibrium $k\,\Delta l = mg$, so $\frac{m}{k} = \frac{\Delta l}{g}$ and $T = 2\pi\sqrt{\frac{m}{k}} = 2\pi\sqrt{\frac{\Delta l}{g}} = 2\pi\sqrt{\frac{${num(dl)}}{10}} = 2\pi(${num(s)}) = ${piTex(2 * s)}\,\mathrm{s}$. The mass does not affect the answer.`,
    };
  }),

  b.dynamic('spring-period-scaling', { difficulty: 1, origin: 'past-paper', tags: ['mass-spring system'] }, (r) => {
    const c = r.pick(SPRING_CHANGES);
    return {
      stem: tex`A mass-spring system oscillates with time period $T$. If ${c.change}, the new time period is:`,
      answer: c.answer,
      distractors: r.shuffle(c.wrong),
      explanation: c.why,
    };
  }),

  // ------------------------------------------------------------------ simple pendulum
  b.dynamic('pendulum-period', { difficulty: 1, origin: 'past-paper', tags: ['simple pendulum'] }, (r) => {
    if (r.chance(0.3)) {
      // Direct use of T = 2 pi sqrt(l/g) with l/g a perfect square.
      const s = r.pick([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);
      const l = 10 * s * s;
      const { answer, distractors } = numericOptions(r, {
        correct: 2 * s,
        // forgot the 2; inverted l/g; forgot the square root; doubled
        wrong: [s, ...(nice(2 / s) ? [2 / s] : []), 2 * s * s, 4 * s],
        format: piSeconds,
      });
      return {
        stem: tex`The time period of a simple pendulum of length $${qty(l, U.m)}$ is (take $g = 10\,\mathrm{m\,s^{-2}}$):`,
        answer,
        distractors,
        explanation: tex`$T = 2\pi\sqrt{\frac{l}{g}} = 2\pi\sqrt{\frac{${num(l)}}{10}} = 2\pi(${num(s)}) = ${piTex(2 * s)}\,\mathrm{s}$.`,
      };
    }
    const c = r.pick(PENDULUM_CHANGES);
    const periods = [0.8, 1, 1.2, 1.5, 1.6, 2, 2.4, 2.5, 3, 3.6, 4].filter(
      (t) => nice(t * c.factor) && c.wrong.every((w) => w === Math.SQRT2 || nice(t * w)),
    );
    const T0 = r.pick(periods);
    const { answer, distractors } = numericOptions(r, {
      correct: T0 * c.factor,
      wrong: c.wrong.map((w) => T0 * w),
      format: (v) => q$(v, U.s),
    });
    return {
      stem: tex`A simple pendulum has a time period of $${qty(T0, U.s)}$. If ${c.text}, its time period becomes:`,
      answer,
      distractors,
      explanation: tex`${c.why}. With $T = ${num(T0)}\,\mathrm{s}$, the new period is $${num(T0 * c.factor)}\,\mathrm{s}$.`,
    };
  }),

  b.dynamic('pendulum-length-percentage', { difficulty: 2, tags: ['simple pendulum'] }, (r) => {
    // [percentage change in length, exact percentage change in period]
    const [p, q] = r.pick([
      [21, 10], [44, 20], [69, 30], [96, 40], [125, 50],
      [-19, -10], [-36, -20], [-51, -30], [-64, -40], [-75, -50],
    ] as const);
    const up = p > 0;
    const verb = (rise: boolean) => (rise ? 'increases' : 'decreases');
    const opt = (rise: boolean, value: number) => `${verb(rise)} by ${num(value)}%`;
    const answer = opt(up, Math.abs(q));
    const rest = [
      opt(!up, Math.abs(q)), // wrong direction
      `${verb(up)} by ${num(Math.sqrt(Math.abs(p)), { dp: 1 })}%`, // square root of the percentage itself
    ];
    // The small-change rule dT/T = dl/2l, only offered when clearly different from the exact value.
    if (Math.abs(Math.abs(p) / 2 - Math.abs(q)) >= 2) rest.push(opt(up, Math.abs(p) / 2));
    const distractors = [opt(up, Math.abs(p)), ...r.sample(rest, 2)]; // first: forgot the square root
    const ratioL = 1 + p / 100;
    const ratioT = 1 + q / 100;
    return {
      stem: `The length of a simple pendulum is ${up ? 'increased' : 'decreased'} by ${Math.abs(p)}%. Its time period:`,
      answer,
      distractors,
      explanation: tex`$T = 2\pi\sqrt{\frac{l}{g}} \propto \sqrt{l}$. The new length is $${num(ratioL)}\,l$, so $T' = \sqrt{${num(ratioL)}}\,T = ${num(ratioT)}\,T$: the period ${verb(up)} by ${Math.abs(q)}%. The rule $\frac{\Delta T}{T} \approx \frac{1}{2}\frac{\Delta l}{l}$ holds only for small changes.`,
    };
  }),

  b.dynamic('pendulum-in-lift', { difficulty: 3, tags: ['simple pendulum'] }, (r) => {
    const c = r.pick(LIFT_CASES);
    return {
      stem: tex`A simple pendulum has a time period $T$ when it hangs in a lift at rest. If the lift ${c.change}, the time period of the pendulum becomes:`,
      answer: c.answer,
      distractors: r.shuffle(c.wrong),
      explanation: tex`In an accelerating lift $T = 2\pi\sqrt{\frac{l}{g_{\mathrm{eff}}}}$, where $g_{\mathrm{eff}}$ depends on the direction of the acceleration, not of the velocity. ${c.why}`,
    };
  }),

  // ------------------------------------------------------------------ energy in SHM
  b.dynamic('shm-energy', { difficulty: 2, tags: ['energy in SHM'] }, (r) => {
    const kind = r.pick(['total', 'ke', 'pe', 'ratio', 'share'] as const);

    if (kind === 'ratio' || kind === 'share') {
      const [p, q] = r.pick(SHARES);
      const disp = p === 1 ? `\\frac{x_0}{${q}}` : `\\frac{${p}}{${q}}x_0`;
      const keN = q * q - p * p;
      const peN = p * p;
      if (kind === 'ratio') {
        const answer = ratioTex(keN, peN);
        return {
          stem: tex`A particle executes SHM with amplitude $x_0$. At a displacement of $${disp}$ from the mean position, the ratio of its kinetic energy to its potential energy is:`,
          answer,
          // inverted; forgot to square; total : P.E.; K.E. : total
          distractors: pickDistractors(answer, [ratioTex(peN, keN), ratioTex(q - p, p), ratioTex(q * q, p * p), ratioTex(keN, q * q)], r),
          explanation: tex`$K.E. = \frac{1}{2}k(x_0^2 - x^2)$ and $P.E. = \frac{1}{2}kx^2$, so $\frac{K.E.}{P.E.} = \frac{x_0^2 - x^2}{x^2}$. With $x = ${disp}$ this is $\frac{${q * q} - ${p * p}}{${p * p}} = ${new Fraction(keN, peN).toTex()}$, i.e. ${answer}.`,
        };
      }
      const pq = new Fraction(p, q).toTex();
      if (r.chance(0.5)) {
        const answer = energyShare(keN, q * q);
        return {
          stem: tex`A particle executes SHM with amplitude $x_0$ and total energy $E$. At a displacement of $${disp}$ from the mean position, its kinetic energy is:`,
          answer,
          // the P.E. share; forgot to square; took the speed ratio; the displacement ratio
          distractors: pickDistractors(answer, [energyShare(peN, q * q), energyShare(q - p, q), surdShare(keN, q), energyShare(p, q)]),
          explanation: tex`$\frac{K.E.}{E} = \frac{\frac{1}{2}k(x_0^2 - x^2)}{\frac{1}{2}kx_0^2} = 1 - \frac{x^2}{x_0^2} = 1 - \left(${pq}\right)^2 = ${new Fraction(keN, q * q).toTex()}$, so $K.E. = ${new Fraction(keN, q * q).toTex()}E$.`,
        };
      }
      const answer = energyShare(peN, q * q);
      return {
        stem: tex`A particle executes SHM with amplitude $x_0$ and total energy $E$. At a displacement of $${disp}$ from the mean position, its potential energy is:`,
        answer,
        // the K.E. share; forgot to square; complement of the unsquared ratio; P.E./K.E.
        distractors: pickDistractors(answer, [energyShare(keN, q * q), energyShare(p, q), energyShare(q - p, q), energyShare(peN, keN)]),
        explanation: tex`$\frac{P.E.}{E} = \frac{\frac{1}{2}kx^2}{\frac{1}{2}kx_0^2} = \frac{x^2}{x_0^2} = \left(${pq}\right)^2 = ${new Fraction(peN, q * q).toTex()}$, so $P.E. = ${new Fraction(peN, q * q).toTex()}E$.`,
      };
    }

    // Numerical energies of a horizontal spring oscillator (k in N/m, x0 and x in cm, energies in J).
    // The displacement stays between 0.3 x0 and 0.9 x0 so that K.E., P.E. and E are clearly different,
    // and parameters are redrawn until the answer and at least three mistakes display exactly.
    const optionsFor = (kk: number, A: number, x: number): { correct: number; wrong: number[] } => {
      const total = (kk * A * A) / 20000;
      const ke = (kk * (A * A - x * x)) / 20000;
      const pe = (kk * x * x) / 20000;
      if (kind === 'total') {
        // forgot the 1/2; forgot to square; amplitude left in cm; halved again
        return { correct: total, wrong: [2 * total, (kk * A) / 200, total * 1e4, total / 2] };
      }
      if (kind === 'ke') {
        // total energy; the P.E.; used (x0 - x)^2; forgot the 1/2
        return { correct: ke, wrong: [total, pe, (kk * (A - x) * (A - x)) / 20000, 2 * ke] };
      }
      // the K.E.; total energy; forgot to square; forgot the 1/2
      return { correct: pe, wrong: [ke, total, (kk * x) / 200, 2 * pe] };
    };
    const usable = ({ correct, wrong }: { correct: number; wrong: number[] }): boolean =>
      exact3(correct) && new Set(exactOnly(wrong).map((v) => num(v)).filter((t) => t !== num(correct))).size >= 3;
    let [k, A, x] = [200, 10, 6];
    for (let attempt = 0; attempt < 60; attempt++) {
      const kk = r.pick([100, 200, 250, 400, 500, 800, 1000]);
      const AA = r.pick([4, 5, 6, 8, 10, 12, 15, 20]);
      const xx = r.int(Math.ceil(0.3 * AA), Math.floor(0.9 * AA));
      if (usable(optionsFor(kk, AA, xx))) {
        [k, A, x] = [kk, AA, xx];
        break;
      }
    }
    const { correct, wrong } = optionsFor(k, A, x);
    const { answer, distractors } = numericOptions(r, { correct, wrong: exactOnly(wrong), format: (v) => q$(v, U.J) });
    const a0 = num(A / 100);
    const xm = num(x / 100);
    const intro = tex`A block attached to a spring of spring constant $${qty(k, NPM)}$ oscillates on a smooth horizontal surface with an amplitude of $${qty(A, U.cm)}$.`;
    if (kind === 'total') {
      return {
        stem: `${intro} The total energy of the oscillator is:`,
        answer,
        distractors,
        explanation: tex`$E = \frac{1}{2}kx_0^2 = \frac{1}{2}(${k})(${a0})^2 = ${num(correct)}\,\mathrm{J}$.`,
      };
    }
    if (kind === 'ke') {
      return {
        stem: tex`${intro} The kinetic energy of the block when its displacement from the mean position is $${qty(x, U.cm)}$ is:`,
        answer,
        distractors,
        explanation: tex`$K.E. = \frac{1}{2}k(x_0^2 - x^2) = \frac{1}{2}(${k})\left[(${a0})^2 - (${xm})^2\right] = ${num(correct)}\,\mathrm{J}$.`,
      };
    }
    return {
      stem: tex`${intro} The potential energy stored in the spring when the block is $${qty(x, U.cm)}$ from the mean position is:`,
      answer,
      distractors,
      explanation: tex`$P.E. = \frac{1}{2}kx^2 = \frac{1}{2}(${k})(${xm})^2 = ${num(correct)}\,\mathrm{J}$.`,
    };
  }),

  // ------------------------------------------------------------------ resonance and damping
  b.dynamic('resonance-damping-statements', { difficulty: 2, tags: ['resonance', 'damping'] }, (r) =>
    claimQuestion(r, 'free, forced and damped oscillations', RESONANCE_TRUTHS, RESONANCE_FALSEHOODS),
  ),

  // ------------------------------------------------------------------ fixed questions
  ...b.mcqs([
    {
      id: 'shm-acceleration-condition',
      d: 1,
      t: ['simple harmonic motion'],
      q: 'A body executes simple harmonic motion when its acceleration is:',
      a: 'proportional to its displacement from the mean position and directed towards the mean position',
      x: [
        'proportional to its displacement from the mean position and directed away from the mean position',
        'inversely proportional to its displacement from the mean position and directed towards it',
        'constant in magnitude and always directed towards the mean position',
      ],
      e: tex`The defining condition of SHM is $a = -\omega^2 x$: the acceleration is proportional to the displacement and always points towards the mean position (opposite to $x$).`,
    },
    {
      id: 'phase-displacement-acceleration',
      d: 1,
      t: ['simple harmonic motion'],
      q: 'In simple harmonic motion, the phase difference between the displacement and the acceleration of the body is:',
      a: tex`$\pi\,\mathrm{rad}$`,
      x: [tex`$\frac{\pi}{2}\,\mathrm{rad}$`, tex`$0\,\mathrm{rad}$`, tex`$\frac{\pi}{4}\,\mathrm{rad}$`],
      e: tex`Since $a = -\omega^2 x$, the acceleration is always opposite to the displacement, i.e. $\pi$ rad ($180^\circ$) out of phase. The velocity differs from each of them by $\frac{\pi}{2}$.`,
    },
    {
      id: 'spring-constant-dimensions',
      d: 1,
      t: ['mass-spring system'],
      q: 'The dimensions of the spring constant $k$ are:',
      a: tex`$[\mathrm{MT^{-2}}]$`,
      x: [tex`$[\mathrm{MLT^{-2}}]$`, tex`$[\mathrm{ML^{-1}T^{-2}}]$`, tex`$[\mathrm{ML^{2}T^{-2}}]$`],
      e: tex`$k = \frac{F}{x}$, so $[k] = \frac{[\mathrm{MLT^{-2}}]}{[\mathrm{L}]} = [\mathrm{MT^{-2}}]$; its unit is $\mathrm{N\,m^{-1}} = \mathrm{kg\,s^{-2}}$. The other options are the dimensions of force, pressure and energy.`,
    },
    {
      id: 'pendulum-free-fall',
      d: 2,
      o: 'past-paper',
      t: ['simple pendulum'],
      q: 'A simple pendulum hangs from the ceiling of a lift. If the lift falls freely under gravity, the time period of the pendulum becomes:',
      a: 'infinite',
      x: ['zero', 'unchanged', 'doubled'],
      e: tex`$T = 2\pi\sqrt{\frac{l}{g_{\mathrm{eff}}}}$. In free fall $g_{\mathrm{eff}} = g - g = 0$, so $T \to \infty$: there is no restoring force and the pendulum does not oscillate at all.`,
    },
    {
      id: 'seconds-pendulum-length',
      d: 1,
      t: ['simple pendulum'],
      q: tex`The length of a seconds pendulum at a place where $g = 9.8\,\mathrm{m\,s^{-2}}$ is approximately:`,
      a: tex`$0.99\,\mathrm{m}$`,
      x: [tex`$0.25\,\mathrm{m}$`, tex`$0.50\,\mathrm{m}$`, tex`$6.24\,\mathrm{m}$`],
      e: tex`A seconds pendulum takes one second for each swing, so $T = 2\,\mathrm{s}$. Then $l = \frac{gT^2}{4\pi^2} = \frac{9.8 \times 2^2}{4\pi^2} \approx 0.99\,\mathrm{m}$. Taking $T = 1\,\mathrm{s}$ gives the wrong value $0.25\,\mathrm{m}$.`,
    },
    {
      id: 'ke-equals-pe-position',
      d: 2,
      o: 'past-paper',
      t: ['energy in SHM'],
      q: tex`For a body executing SHM with amplitude $x_0$, the kinetic energy equals the potential energy at a displacement of:`,
      a: tex`$\frac{x_0}{\sqrt{2}}$`,
      x: [tex`$\frac{x_0}{2}$`, tex`$\frac{x_0}{4}$`, tex`$\frac{\sqrt{3}}{2}x_0$`],
      e: tex`$\frac{1}{2}k(x_0^2 - x^2) = \frac{1}{2}kx^2 \Rightarrow x_0^2 = 2x^2 \Rightarrow x = \frac{x_0}{\sqrt{2}} \approx 0.71\,x_0$. At $\frac{x_0}{2}$ the kinetic energy is three times the potential energy.`,
    },
    {
      id: 'microwave-resonance',
      d: 1,
      o: 'past-paper',
      t: ['resonance'],
      q: 'The heating of food in a microwave oven is an application of:',
      a: 'resonance',
      x: ['the Doppler effect', 'polarization', 'total internal reflection'],
      e: 'Microwaves of wavelength about 12 cm (frequency about 2450 MHz) drive the water molecules in food. As described in FSc, the molecules resonate, absorb energy from the waves strongly and heat the food.',
    },
    {
      id: 'damping-resonance-curve',
      d: 2,
      t: ['damping', 'resonance'],
      q: 'When the damping of a driven oscillator is increased, its resonance curve (amplitude against driving frequency) becomes:',
      a: 'broader, with a lower peak',
      x: ['sharper, with a higher peak', 'sharper, with a lower peak', 'broader, with a higher peak'],
      e: 'Damping removes energy, so the amplitude at resonance falls and the response spreads over a wider range of frequencies: the peak becomes lower and flatter. Light damping gives a tall, sharp peak.',
    },
  ]),
]);
