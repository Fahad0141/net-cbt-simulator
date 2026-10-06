import { defineBank } from '@/engine/authoring';
import type { Fraction } from '@/engine/helpers';
import { frac, num, numericOptions, pickDistractors, q$, qty, sci, statementQuestion, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** `x` prints exactly with three significant figures. */
function exact3(x: number): boolean {
  return Number(x.toPrecision(3)) === Number(x.toPrecision(12));
}

/** A multiple of a symbol as LaTeX: 4B, B, \frac{B}{2}, \frac{3B}{4}. */
function multTex(f: Fraction, sym: string): string {
  const top = f.n === 1 ? sym : `${f.n}${sym}`;
  return f.d === 1 ? top : `\\frac{${top}}{${f.d}}`;
}

/** Scientific-notation option with a unit: `$1.6 \times 10^{-13}\,\mathrm{N}$`. */
const sciOpt = (unit: string) => (x: number): string => `$${sci(x)}\\,\\mathrm{${unit}}$`;

const E_CHARGE = tex`(take $e = 1.6 \times 10^{-19}\,\mathrm{C}$)`;
const MU0 = tex`(take $\mu_0 = 4\pi \times 10^{-7}\,\mathrm{T\,m\,A^{-1}}$)`;

const CHANGE_WORD: Record<string, string> = { '2': 'doubled', '1/2': 'halved', '3': 'tripled', '1': 'kept the same' };

export default defineBank('physics', 'electromagnetism', (b) => [
  // =========================================================================
  // Magnetic force on a current-carrying conductor
  // =========================================================================
  b.dynamic('force-on-wire', { difficulty: 1, tags: ['magnetic force'] }, (r) => {
    let B = 0.5;
    let I = 4;
    let L = 20;
    let theta: 30 | 90 = 90;
    for (let i = 0; i < 60; i++) {
      B = r.pick([0.1, 0.2, 0.25, 0.4, 0.5, 0.6, 0.8, 1.2, 1.5]);
      I = r.int(2, 12);
      L = r.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 80]);
      theta = r.chance(0.6) ? 90 : 30;
      const f = (B * I * L) / 100 / (theta === 30 ? 2 : 1);
      if (exact3(f) && f >= 0.01) break;
    }
    const lm = L / 100;
    const full = B * I * lm;
    const F = theta === 30 ? full / 2 : full;
    const wrong =
      theta === 30
        ? // ignored the angle; length left in cm; used cos 30 instead of sin 30
          [full, F * 100, full * Math.cos(Math.PI / 6)]
        : // length left in cm; divided by 1000 instead of 100; spurious factor 1/2
          [F * 100, F / 10, F / 2];
    const { answer, distractors } = numericOptions(r, { correct: F, wrong, format: (x) => q$(x, U.N) });
    const angleText =
      theta === 90 ? 'at right angles to' : tex`at $${qty(30, U.deg)}$ to`;
    const sinText = theta === 90 ? tex`\sin 90^{\circ}` : tex`\sin 30^{\circ}`;
    return {
      stem: tex`A straight wire of length $${qty(L, U.cm)}$ carrying a current of $${qty(I, U.A)}$ is placed ${angleText} a uniform magnetic field of $${qty(B, U.T)}$. The magnitude of the force on the wire is:`,
      answer,
      distractors,
      explanation: tex`$F = ILB\sin\theta = (${I})(${num(lm)})(${num(B)})${sinText} = ${num(F)}\,\mathrm{N}$ (the length must be in metres: $${L}\,\mathrm{cm} = ${num(lm)}\,\mathrm{m}$).`,
    };
  }),

  ...b.mcqs([
    {
      id: 'tesla-equivalent', d: 1, t: ['magnetic force'],
      q: 'The tesla, the SI unit of magnetic flux density, is equivalent to:',
      a: tex`$\mathrm{N\,A^{-1}\,m^{-1}}$`,
      x: [tex`$\mathrm{N\,A\,m^{-1}}$`, tex`$\mathrm{Wb\,m^{2}}$`, tex`$\mathrm{N\,C^{-1}}$`],
      e: tex`From $F = ILB$, $B = \frac{F}{IL}$, so $1\,\mathrm{T} = 1\,\mathrm{N\,A^{-1}\,m^{-1}}$ (also $1\,\mathrm{Wb\,m^{-2}}$, not $\mathrm{Wb\,m^{2}}$). $\mathrm{N\,C^{-1}}$ is the unit of electric field.`,
    },
    {
      id: 'parallel-currents', d: 1, t: ['magnetic force'],
      q: 'Two long, straight, parallel wires carry currents in the same direction. The wires:',
      a: 'attract each other',
      x: ['repel each other', 'exert no force on each other', 'twist until they are perpendicular'],
      e: 'Each wire lies in the magnetic field of the other. Applying the right-hand rule, the force on each wire points towards the other, so like (parallel) currents attract and opposite currents repel.',
    },
  ]),

  // =========================================================================
  // Ampere's law and the field of a straight wire
  // =========================================================================
  b.fixed('ampere-law-statement', { difficulty: 2, tags: ['Ampere law'] }, {
    stem: tex`According to Ampere's law, the line integral $\oint \vec{B}\cdot d\vec{l}$ taken around any closed path equals:`,
    answer: tex`$\mu_0$ times the net current enclosed by the path`,
    distractors: [
      tex`$\frac{1}{\mu_0}$ times the net current enclosed by the path`,
      tex`$\mu_0$ times the magnetic flux through the path`,
      'zero, whatever current the path encloses',
    ],
    explanation: tex`Ampere's circuital law: $\oint \vec{B}\cdot d\vec{l} = \mu_0 I$, where $I$ is the net current threading the closed path. It is zero only when the enclosed current is zero.`,
  }),

  b.dynamic('straight-wire-field', { difficulty: 2, tags: ['Ampere law'] }, (r) => {
    let I = 10;
    let rc = 5;
    for (let i = 0; i < 60; i++) {
      I = r.int(2, 30);
      rc = r.pick([1, 2, 4, 5, 8, 10, 20, 25, 40, 50]);
      if (exact3((2e-5 * I) / rc) && I !== rc) break;
    }
    const rm = rc / 100;
    const B = (2e-7 * I) / rm;
    const { answer, distractors } = numericOptions(r, {
      correct: B,
      // distance left in cm; used mu0 I / 2r (dropped the pi); dropped the 2 in 2 pi r
      wrong: [B / 100, B * Math.PI, 2 * B],
      format: sciOpt('T'),
    });
    return {
      stem: tex`A long straight wire carries a current of $${qty(I, U.A)}$. The magnetic field at a distance of $${qty(rc, U.cm)}$ from the wire is ${MU0}:`,
      answer,
      distractors,
      explanation: tex`By Ampere's law, $B(2\pi r) = \mu_0 I$, so $B = \frac{\mu_0 I}{2\pi r} = \frac{(4\pi \times 10^{-7})(${I})}{2\pi(${num(rm)})} = ${sci(B)}\,\mathrm{T}$.`,
    };
  }),

  // =========================================================================
  // Solenoid
  // =========================================================================
  b.dynamic('solenoid-field-scaling', { difficulty: 1, origin: 'past-paper', tags: ['solenoid'] }, (r) => {
    const choices = [frac(1), frac(2), frac(1, 2), frac(3)];
    let fN = frac(2);
    let fI = frac(1);
    let fL = frac(1, 2);
    for (let i = 0; i < 60; i++) {
      fN = r.pick(choices);
      fI = r.pick(choices);
      fL = r.pick(choices);
      const changed = [fN, fI, fL].filter((f) => !f.equals(1)).length;
      if (changed >= 2) break;
    }
    const ratio = fN.mul(fI).div(fL);
    const opt = (f: Fraction): string => `$${multTex(f, 'B')}$`;
    const answer = opt(ratio);
    const candidates = [
      fN.mul(fI).mul(fL), // multiplied by the length factor instead of dividing
      fN.mul(fL).div(fI), // swapped the roles of current and length
      ratio.pow(2), // squared the ratio
      ratio.inv(), // inverted the ratio
      ratio.mul(2),
      ratio.div(2),
    ].map(opt);
    const word = (f: Fraction): string => CHANGE_WORD[f.toString()] as string;
    const radius = r.chance(0.4) ? ', its radius is doubled' : '';
    return {
      stem: `The number of turns of a long solenoid is ${word(fN)}${radius}, its length is ${word(fL)} and the current through it is ${word(fI)}. If the magnetic field inside it was $B$, it becomes:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`Inside a long solenoid $B = \mu_0 nI = \frac{\mu_0 NI}{L}$${radius ? ' (independent of the radius)' : ''}. New field $= \frac{(${fN.toTex()})(${fI.toTex()})}{${fL.toTex()}}B = ${multTex(ratio, 'B')}$.`,
    };
  }),

  b.fixed('solenoid-field-independent-of', { difficulty: 2, origin: 'past-paper', tags: ['solenoid'] }, {
    stem: 'The magnetic field at the centre of a long current-carrying solenoid does NOT depend on:',
    answer: 'the cross-sectional area of the solenoid',
    distractors: [
      'the number of turns per unit length',
      'the current through the solenoid',
      'the material of the core inside it',
    ],
    explanation: tex`$B = \mu_0 nI$ (or $\mu_r\mu_0 nI$ with a core): it depends on $n$, $I$ and the core material, but not on the radius or area of the coil.`,
  }),

  // =========================================================================
  // Charged particles in magnetic and electric fields
  // =========================================================================
  b.dynamic('force-on-moving-charge', { difficulty: 1, tags: ['charged particles in fields'] }, (r) => {
    const particle = r.pick(['proton', 'electron']);
    let a = 2;
    let B = 0.5;
    let theta: 30 | 90 = 90;
    for (let i = 0; i < 60; i++) {
      a = r.int(1, 9);
      B = r.pick([0.1, 0.2, 0.25, 0.4, 0.5, 0.8, 1, 1.5, 2]);
      theta = r.chance(0.6) ? 90 : 30;
      // 1.6 x 8 x 0.8 = 10.24 and 1.6 x 9 x 0.8 = 11.52 would print rounded; keep answers exact.
      if (exact3(1.6 * a * B * (theta === 30 ? 0.5 : 1))) break;
    }
    const v = a * 1e6;
    const full = 1.6e-19 * v * B;
    const F = theta === 30 ? full / 2 : full;
    const wrong =
      theta === 30
        ? // ignored the angle; used cos 30; power-of-ten slip
          [full, full * Math.cos(Math.PI / 6), F * 10]
        : // divided by B instead of multiplying; power-of-ten slips; spurious factor 1/2
          [(1.6e-19 * v) / B, F * 10, F / 10, F / 2];
    // numericOptions compares with an absolute tolerance of 1e-12, so work in units of 1e-20 N.
    const SCALE = 1e20;
    const { answer, distractors } = numericOptions(r, {
      correct: F * SCALE,
      wrong: wrong.map((x) => x * SCALE),
      format: (x) => sciOpt('N')(x / SCALE),
    });
    const angleText = theta === 90 ? 'at right angles to' : tex`at $${qty(30, U.deg)}$ to`;
    const sinText = theta === 90 ? tex`\sin 90^{\circ}` : tex`\sin 30^{\circ}`;
    return {
      stem: tex`${particle === 'electron' ? 'An electron' : 'A proton'} moves with a speed of $${sci(v)}\,\mathrm{m\,s^{-1}}$ ${angleText} a uniform magnetic field of $${qty(B, U.T)}$. The magnitude of the magnetic force on it is ${E_CHARGE}:`,
      answer,
      distractors,
      explanation: tex`$F = qvB\sin\theta = (1.6 \times 10^{-19})(${sci(v)})(${num(B)})${sinText} = ${sci(F)}\,\mathrm{N}$. The magnitude is the same for a proton and an electron; only the direction differs.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'magnetic-force-no-work', d: 1, o: 'past-paper', t: ['charged particles in fields'],
      q: 'A charged particle moves through a uniform magnetic field. The work done on it by the magnetic force is:',
      a: 'zero, so its kinetic energy stays constant',
      x: [
        'positive, so its kinetic energy increases',
        'negative, so its kinetic energy decreases',
        tex`equal to $qvB$ times the distance travelled`,
      ],
      e: tex`The force $q\vec{v}\times\vec{B}$ is always perpendicular to the velocity, so it changes only the direction of motion. $W = Fd\cos 90^{\circ} = 0$ and the speed (and kinetic energy) is unchanged.`,
    },
    {
      id: 'charge-parallel-to-field', d: 1, t: ['charged particles in fields'],
      q: 'A proton moves with velocity $v$ parallel to a uniform magnetic field $B$. The magnetic force on it is:',
      a: 'zero',
      x: [tex`$evB$, perpendicular to the field`, tex`$evB$, along the field`, tex`$\frac{1}{2}evB$, perpendicular to the field`],
      e: tex`$F = qvB\sin\theta$ and $\theta = 0^{\circ}$, so $F = 0$: the proton continues in a straight line with constant velocity.`,
    },
    {
      id: 'electron-force-direction', d: 2, o: 'past-paper', t: ['magnetic force', 'charged particles in fields'],
      q: 'An electron moves towards the east through a uniform magnetic field directed vertically upward. The magnetic force on it is directed:',
      a: 'towards the north',
      x: ['towards the south', 'towards the west', 'vertically downward'],
      e: tex`For a positive charge, $\vec{F} = q\vec{v}\times\vec{B}$ with $\vec{v}$ east and $\vec{B}$ up gives a force towards the south. The electron's charge is negative, so the force on it is reversed: towards the north. The force is always perpendicular to both $\vec{v}$ and $\vec{B}$, so it cannot be west or downward.`,
    },
    {
      id: 'period-independent-of-speed', d: 3, o: 'past-paper', t: ['charged particles in fields'],
      q: 'An electron moves in a circle at right angles to a uniform magnetic field. If its speed is doubled, the time it takes to complete one revolution:',
      a: 'remains the same',
      x: ['is doubled', 'is halved', 'becomes four times as long'],
      e: tex`$r = \frac{mv}{qB}$, so doubling $v$ doubles the radius. The period $T = \frac{2\pi r}{v} = \frac{2\pi m}{qB}$ does not depend on the speed, so it is unchanged.`,
    },
    {
      id: 'helical-path', d: 3, t: ['charged particles in fields'],
      q: tex`A proton enters a uniform magnetic field with its velocity at $30^{\circ}$ to the direction of the field. Its path inside the field is:`,
      a: 'a helix whose axis is along the field',
      x: [
        'a circle in a plane perpendicular to the field',
        'a straight line along the field direction',
        'a parabola, like a projectile in gravity',
      ],
      e: tex`The component $v\sin 30^{\circ}$ (perpendicular to $\vec{B}$) produces circular motion, while $v\cos 30^{\circ}$ (along $\vec{B}$) feels no force and stays constant. Circular motion combined with steady drift along the field gives a helix.`,
    },
  ]),

  b.dynamic('radius-of-path-scaling', { difficulty: 2, origin: 'past-paper', tags: ['charged particles in fields'] }, (r) => {
    if (r.chance(0.5)) {
      // Same particle, changed speed (or kinetic energy) and field.
      const speedMode = r.chance(0.6);
      const fv = speedMode ? r.pick([frac(2), frac(3), frac(1, 2)]) : r.pick([frac(4), frac(1, 4)]);
      const fB = r.pick([frac(1), frac(2), frac(1, 2), frac(3)]);
      const vFactor = speedMode ? fv : fv.equals(4) ? frac(2) : frac(1, 2);
      const ratio = vFactor.div(fB);
      const opt = (f: Fraction): string => `$${multTex(f, 'r')}$`;
      const answer = opt(ratio);
      const word = (f: Fraction): string =>
        ({ '2': 'doubled', '3': 'tripled', '1/2': 'halved', '4': 'made four times as large', '1/4': 'reduced to one quarter', '1': 'kept the same' })[f.toString()] as string;
      const what = speedMode ? 'speed' : 'kinetic energy';
      const candidates = [
        fB.div(vFactor), // inverted the dependence
        vFactor.mul(fB), // multiplied by the field factor
        speedMode ? ratio.pow(2) : fv.div(fB), // r taken proportional to v^2 / to K
        ratio.mul(2),
        ratio.div(2),
      ].map(opt);
      const ktext = speedMode ? '' : tex`; $v \propto \sqrt{K}$, so the speed is ${word(vFactor)}`;
      return {
        stem: `A proton moves in a circle of radius $r$ at right angles to a uniform magnetic field. If its ${what} is ${word(fv)} and the magnetic field is ${word(fB)}, the radius of its path becomes:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: tex`$qvB = \frac{mv^2}{r}$ gives $r = \frac{mv}{qB}$, so $r \propto \frac{v}{B}$${ktext}. New radius $= \frac{${vFactor.toTex()}}{${fB.toTex()}}r = ${multTex(ratio, 'r')}$.`,
      };
    }
    // Different particle compared with a proton.
    const particle = r.pick(['alpha particle', 'deuteron'] as const);
    const cond = r.pick(['speed', 'momentum', 'kinetic energy', 'potential'] as const);
    const OPTS = {
      four: tex`$4r$`,
      two: tex`$2r$`,
      root2: tex`$\sqrt{2}\,r$`,
      one: tex`$r$`,
      half: tex`$\frac{r}{2}$`,
      invroot2: tex`$\frac{r}{\sqrt{2}}$`,
    };
    type Key = keyof typeof OPTS;
    const table: Record<typeof particle, Record<typeof cond, Key>> = {
      'alpha particle': { speed: 'two', momentum: 'half', 'kinetic energy': 'one', potential: 'root2' },
      deuteron: { speed: 'two', momentum: 'one', 'kinetic energy': 'root2', potential: 'root2' },
    };
    const key = table[particle][cond];
    const answer = OPTS[key];
    const others = (Object.keys(OPTS) as Key[]).filter((k) => k !== key).map((k) => OPTS[k]);
    const masses =
      particle === 'alpha particle'
        ? tex`(take $m_\alpha = 4m_p$ and $q_\alpha = 2e$)`
        : tex`(take $m_d = 2m_p$ and $q_d = e$)`;
    const condText = {
      speed: 'with equal speeds',
      momentum: 'with equal momenta',
      'kinetic energy': 'with equal kinetic energies',
      potential: 'after being accelerated from rest through the same potential difference',
    }[cond];
    const law = {
      speed: tex`$r = \frac{mv}{qB} \propto \frac{m}{q}$`,
      momentum: tex`$r = \frac{p}{qB} \propto \frac{1}{q}$`,
      'kinetic energy': tex`$r = \frac{\sqrt{2mK}}{qB} \propto \frac{\sqrt{m}}{q}$`,
      potential: tex`$K = qV$, so $r = \frac{\sqrt{2mqV}}{qB} = \frac{1}{B}\sqrt{\frac{2mV}{q}} \propto \sqrt{\frac{m}{q}}$`,
    }[cond];
    const factor =
      particle === 'alpha particle'
        ? { speed: tex`\frac{4}{2} = 2`, momentum: tex`\frac{1}{2}`, 'kinetic energy': tex`\frac{\sqrt{4}}{2} = 1`, potential: tex`\sqrt{\frac{4}{2}} = \sqrt{2}` }[cond]
        : { speed: tex`\frac{2}{1} = 2`, momentum: tex`\frac{1}{1} = 1`, 'kinetic energy': tex`\frac{\sqrt{2}}{1} = \sqrt{2}`, potential: tex`\sqrt{\frac{2}{1}} = \sqrt{2}` }[cond];
    return {
      stem: `A proton and ${particle === 'deuteron' ? 'a deuteron' : 'an alpha particle'} enter the same uniform magnetic field at right angles to it ${condText}. If the proton moves in a circle of radius $r$, the radius of the ${particle}'s path is ${masses}:`,
      answer,
      distractors: r.sample(others, 3),
      explanation: tex`${law}. Comparing with the proton, the radius changes by the factor $${factor}$, so the ${particle}'s radius is ${answer}.`,
    };
  }),

  b.dynamic('velocity-selector', { difficulty: 1, tags: ['charged particles in fields'] }, (r) => {
    const c = r.pick([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8]);
    const k = r.pick([5, 6]);
    const v = c * 10 ** k;
    const Bm = r.pick([2, 4, 5, 8, 10, 20, 25, 40, 50]);
    const B = Bm / 1000;
    const E = Math.round(v * B);
    const particle = r.pick(['electrons', 'protons', 'ions']);
    const Etex = E >= 1e4 ? `${sci(E)}\\,\\mathrm{${U.Vpm}}` : qty(E, U.Vpm);
    const Enum = E >= 1e4 ? sci(E) : String(E);
    const { answer, distractors } = numericOptions(r, {
      correct: v,
      // field left in mT; multiplied E by B; v = B/E (inverted)
      wrong: [E / Bm, E * B, B / E, v * 10],
      format: (x) => (x >= 1e3 ? sciOpt('m\\,s^{-1}')(x) : q$(x, U.mps)),
    });
    return {
      stem: tex`A beam of ${particle} passes undeflected through mutually perpendicular electric and magnetic fields of strengths $${Etex}$ and $${qty(Bm, 'mT')}$. The speed of the ${particle} is:`,
      answer,
      distractors,
      explanation: tex`No deflection means the electric and magnetic forces balance: $qE = qvB$, so $v = \frac{E}{B} = \frac{${Enum}}{${num(B)}} = ${sci(v)}\,\mathrm{m\,s^{-1}}$ (with $${Bm}\,\mathrm{mT} = ${num(B)}\,\mathrm{T}$).`,
    };
  }),

  // =========================================================================
  // e/m of the electron
  // =========================================================================
  ...b.mcqs([
    {
      id: 'e-over-m-expression', d: 2, t: ['e/m'],
      q: tex`In an experiment to find $\frac{e}{m}$, electrons accelerated from rest through a potential difference $V$ move in a circle of radius $r$ in a uniform magnetic field $B$. Then $\frac{e}{m}$ equals:`,
      a: tex`$\frac{2V}{B^2r^2}$`,
      x: [tex`$\frac{V}{B^2r^2}$`, tex`$\frac{2V}{Br}$`, tex`$\frac{B^2r^2}{2V}$`],
      e: tex`$eV = \frac{1}{2}mv^2$ and $r = \frac{mv}{eB}$ give $v = \frac{eBr}{m}$. Substituting, $eV = \frac{1}{2}m\left(\frac{eBr}{m}\right)^2 = \frac{e^2B^2r^2}{2m}$, so $\frac{e}{m} = \frac{2V}{B^2r^2}$.`,
    },
    {
      id: 'e-over-m-value', d: 1, o: 'past-paper', t: ['e/m'],
      q: 'The charge-to-mass ratio (e/m) of an electron is approximately:',
      a: tex`$1.76 \times 10^{11}\,\mathrm{C\,kg^{-1}}$`,
      x: [
        tex`$9.58 \times 10^{7}\,\mathrm{C\,kg^{-1}}$`,
        tex`$1.6 \times 10^{-19}\,\mathrm{C\,kg^{-1}}$`,
        tex`$9.11 \times 10^{-31}\,\mathrm{C\,kg^{-1}}$`,
      ],
      e: tex`$\frac{e}{m} = \frac{1.6 \times 10^{-19}}{9.11 \times 10^{-31}} \approx 1.76 \times 10^{11}\,\mathrm{C\,kg^{-1}}$. $9.58 \times 10^{7}$ is the value for a proton; the other two are the electron's charge and mass.`,
    },
  ]),

  // =========================================================================
  // Galvanometer, ammeter and voltmeter
  // =========================================================================
  b.fixed('galvanometer-sensitivity', { difficulty: 2, tags: ['galvanometer, ammeter, voltmeter'] }, {
    stem: 'The current sensitivity of a moving-coil galvanometer can be increased by each of the following EXCEPT:',
    answer: 'using a suspension with a larger torsional couple constant',
    distractors: [
      'increasing the number of turns of the coil',
      'increasing the area of the coil',
      'using a stronger permanent magnet',
    ],
    explanation: tex`At equilibrium $BINA = c\theta$, so the sensitivity $\frac{\theta}{I} = \frac{BNA}{c}$. Increasing $B$, $N$ or $A$ raises it; a larger couple constant $c$ (a stiffer suspension) lowers it.`,
  }),

  b.dynamic('meter-statements', { difficulty: 1, tags: ['galvanometer, ammeter, voltmeter'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about electrical meters is correct?',
      negativeStem: 'Which of the following statements about electrical meters is NOT correct?',
      truths: [
        'An ammeter is connected in series and has a very low resistance.',
        'A voltmeter is connected in parallel and has a very high resistance.',
        'A shunt is a low resistance connected in parallel with a galvanometer.',
        'A galvanometer becomes a voltmeter with a high resistance in series.',
        'An ideal voltmeter draws no current from the circuit.',
        'An ideal ammeter has zero resistance.',
      ],
      falsehoods: [
        'An ammeter is connected in parallel and has a very low resistance.',
        'A voltmeter is connected in series and has a very low resistance.',
        'A shunt is a high resistance connected in series with a galvanometer.',
        'A galvanometer becomes an ammeter with a high resistance in series.',
        'An ideal ammeter has infinite resistance.',
        'An ammeter has a higher resistance than its galvanometer.',
      ],
      explain: (answer, inverted) =>
        `${inverted ? `"${answer}" is false.` : `"${answer}" is true.`} An ammeter (galvanometer plus a low parallel shunt) goes in series and should have negligible resistance so it does not change the current; a voltmeter (galvanometer plus a high series resistance) goes in parallel and should have very high resistance so it draws almost no current.`,
    }),
  ),

  b.dynamic('galvanometer-conversion', { difficulty: 2, origin: 'past-paper', tags: ['galvanometer, ammeter, voltmeter'] }, (r) => {
    const Ig = r.pick([1, 2, 5, 10]); // mA
    if (r.chance(0.5)) {
      // Ammeter: shunt S = Ig Rg / (I - Ig) = Rg / (k - 1) with I = k Ig.
      let k = 10;
      let S = 5;
      for (let i = 0; i < 60; i++) {
        k = r.pick([5, 10, 20, 25, 50, 100]);
        S = r.int(1, 25);
        const Rg0 = S * (k - 1);
        if (Rg0 >= 20 && Rg0 <= 250 && k * Ig <= 1000) break;
      }
      const Rg = S * (k - 1);
      const ImA = k * Ig;
      const Itex = ImA >= 100 ? qty(ImA / 1000, U.A) : qty(ImA, U.mA);
      const { answer, distractors } = numericOptions(r, {
        correct: S,
        // ignored the galvanometer current (S = Ig Rg / I); inverted the ratio; used I instead of Ig on top
        wrong: [Rg / k, Rg * (k - 1), k * S],
        format: (x) => q$(x, U.ohm),
      });
      return {
        stem: tex`A galvanometer of resistance $${qty(Rg, U.ohm)}$ gives full-scale deflection with a current of $${qty(Ig, U.mA)}$. To convert it into an ammeter of range $0$ to $${Itex}$, the shunt resistance needed is:`,
        answer,
        distractors,
        explanation: tex`The shunt carries $I - I_g$ at the same p.d. as the galvanometer: $S = \frac{I_g R_g}{I - I_g} = \frac{(${Ig})(${Rg})}{${ImA} - ${Ig}} = \frac{${Ig * Rg}}{${ImA - Ig}} = ${num(S)}\,\Omega$ (currents in mA), connected in parallel.`,
      };
    }
    // Voltmeter: R = V / Ig - Rg.
    let V = 10;
    let Rg = 50;
    for (let i = 0; i < 60; i++) {
      V = r.pick([1, 2, 3, 5, 10, 15, 20, 30, 50, 100]);
      Rg = r.pick([20, 25, 40, 50, 60, 80, 100, 120, 150, 200]);
      const total = (V * 1000) / Ig;
      if (Number.isInteger(total) && total >= 5 * Rg && total <= 50000) break;
    }
    const total = (V * 1000) / Ig;
    const R = total - Rg;
    const { answer, distractors } = numericOptions(r, {
      correct: R,
      // forgot to subtract Rg; added Rg; subtracted Rg twice
      wrong: [total, total + Rg, total - 2 * Rg],
      format: (x) => q$(x, U.ohm),
    });
    return {
      stem: tex`A galvanometer of resistance $${qty(Rg, U.ohm)}$ gives full-scale deflection with a current of $${qty(Ig, U.mA)}$. To convert it into a voltmeter of range $0$ to $${qty(V, U.V)}$, the resistance to be connected in series with it is:`,
      answer,
      distractors,
      explanation: tex`At full scale $V = I_g(R_g + R)$, so $R = \frac{V}{I_g} - R_g = \frac{${V}}{${num(Ig / 1000)}} - ${Rg} = ${total} - ${Rg} = ${R}\,\Omega$.`,
    };
  }),
]);
