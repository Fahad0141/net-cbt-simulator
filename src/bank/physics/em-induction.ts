/**
 * Physics - Electromagnetic Induction (FSc Part II).
 *
 * Coverage: Faraday's law (emf from a changing field through a coil), Lenz's law (energy
 * conservation, direction of induced currents, magnets falling through conductors), motional
 * emf (straight rod, rod at an angle, rotating rod, loop inside a uniform field), self and
 * mutual induction (L = emf dt/dI, M from the induced emf, energy stored, the henry), AC
 * generators and motors (peak emf, coil orientation, back emf) and transformers (turns ratio,
 * laminated cores, why DC fails), plus "if X is doubled" scaling items.
 */
import { defineBank } from '@/engine/authoring';
import { num, numericOptions, pickDistractors, q$, qty, statementQuestion, tex, U } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** True when `num()` (3 significant figures) shows `v` exactly, without rounding. */
function exact3(v: number): boolean {
  return Number.isFinite(v) && v !== 0 && Math.abs(Number(v.toPrecision(3)) - v) <= 1e-9 * Math.abs(v);
}

/** Keeps only mistake values that display exactly, so no option is a rounded number. */
const exactOnly = (values: readonly number[]): number[] => values.filter(exact3);

/** Removes binary noise such as 0.1 * 3 = 0.30000000000000004. */
const clean = (v: number): number => Number(v.toPrecision(12));

/** Draws from `make` until `ok` accepts the value (bounded, deterministic). */
function draw<T>(r: Rng, make: (r: Rng) => T, ok: (v: T) => boolean): T {
  for (let i = 0; i < 400; i++) {
    const v = make(r);
    if (ok(v)) return v;
  }
  throw new Error('em-induction: no acceptable parameters found');
}

// ---------------------------------------------------------------------------
// "If X is changed" scaling cases
// ---------------------------------------------------------------------------

interface ScalingCase {
  /** Full stem. */
  stem: string;
  answer: string;
  wrong: readonly [string, string, string];
  why: string;
}

const SCALING_CASES: readonly ScalingCase[] = [
  {
    stem: tex`An inductor stores energy $U$ when it carries a steady current $I$. If the current is doubled, the stored energy becomes:`,
    answer: tex`$4U$`,
    wrong: [tex`$2U$`, tex`$\frac{U}{4}$`, tex`$\sqrt{2}\,U$`],
    why: tex`$U = \frac{1}{2}LI^2 \propto I^2$, so $U' = (2)^2U = 4U$.`,
  },
  {
    stem: tex`An inductor stores energy $U$ when it carries a steady current $I$. If the current is reduced to half, the stored energy becomes:`,
    answer: tex`$\frac{U}{4}$`,
    wrong: [tex`$\frac{U}{2}$`, tex`$4U$`, tex`$2U$`],
    why: tex`$U = \frac{1}{2}LI^2 \propto I^2$, so $U' = \left(\frac{1}{2}\right)^2U = \frac{U}{4}$.`,
  },
  {
    stem: tex`An inductor of inductance $L$ stores energy $U$ at current $I$. If both the inductance and the current are doubled, the stored energy becomes:`,
    answer: tex`$8U$`,
    wrong: [tex`$4U$`, tex`$2U$`, tex`$16U$`],
    why: tex`$U = \frac{1}{2}LI^2$, so $U' = \frac{1}{2}(2L)(2I)^2 = 8\left(\frac{1}{2}LI^2\right) = 8U$.`,
  },
  {
    stem: tex`A long solenoid has self-inductance $L$. If the number of turns is doubled while its length and cross-sectional area stay the same, its self-inductance becomes:`,
    answer: tex`$4L$`,
    wrong: [tex`$2L$`, tex`$\frac{L}{2}$`, tex`$L$`],
    why: tex`$L = \frac{\mu_0 N^2 A}{l} \propto N^2$, so $L' = (2)^2L = 4L$.`,
  },
  {
    stem: tex`A long solenoid has self-inductance $L$. If the number of turns is tripled while its length and cross-sectional area stay the same, its self-inductance becomes:`,
    answer: tex`$9L$`,
    wrong: [tex`$3L$`, tex`$\frac{L}{3}$`, tex`$6L$`],
    why: tex`$L = \frac{\mu_0 N^2 A}{l} \propto N^2$, so $L' = (3)^2L = 9L$.`,
  },
  {
    stem: tex`An AC generator produces a peak emf $\varepsilon_0$. If the angular speed of its coil is doubled, the peak emf becomes:`,
    answer: tex`$2\varepsilon_0$`,
    wrong: [tex`$4\varepsilon_0$`, tex`$\frac{\varepsilon_0}{2}$`, tex`$\varepsilon_0$`],
    why: tex`$\varepsilon_0 = NBA\omega \propto \omega$, so doubling $\omega$ gives $2\varepsilon_0$.`,
  },
  {
    stem: tex`An AC generator produces a peak emf $\varepsilon_0$. If the number of turns of its coil is halved and its angular speed is doubled, the peak emf becomes:`,
    answer: tex`$\varepsilon_0$`,
    wrong: [tex`$2\varepsilon_0$`, tex`$\frac{\varepsilon_0}{2}$`, tex`$4\varepsilon_0$`],
    why: tex`$\varepsilon_0 = NBA\omega$, so $\varepsilon_0' = \left(\frac{N}{2}\right)BA(2\omega) = \varepsilon_0$.`,
  },
  {
    stem: tex`A straight rod moving perpendicular to a uniform magnetic field has a motional emf $\varepsilon$ across its ends. If its speed is doubled and its length is halved, the emf becomes:`,
    answer: tex`$\varepsilon$`,
    wrong: [tex`$2\varepsilon$`, tex`$4\varepsilon$`, tex`$\frac{\varepsilon}{2}$`],
    why: tex`$\varepsilon = BLv$, so $\varepsilon' = B\left(\frac{L}{2}\right)(2v) = \varepsilon$.`,
  },
  {
    stem: tex`A change of magnetic flux through a coil in time $t$ induces an average emf $\varepsilon$. If the same change of flux takes place in time $\frac{t}{2}$, the average induced emf becomes:`,
    answer: tex`$2\varepsilon$`,
    wrong: [tex`$\frac{\varepsilon}{2}$`, tex`$4\varepsilon$`, tex`$\varepsilon$`],
    why: tex`$\varepsilon = N\frac{\Delta\Phi}{\Delta t} \propto \frac{1}{\Delta t}$, so halving the time doubles the emf.`,
  },
  {
    stem: tex`An ideal transformer gives a secondary voltage $V$. If the number of turns on the secondary is doubled, keeping the primary unchanged, the secondary voltage becomes:`,
    answer: tex`$2V$`,
    wrong: [tex`$\frac{V}{2}$`, tex`$4V$`, tex`$V$`],
    why: tex`$\frac{V_s}{V_p} = \frac{N_s}{N_p}$, so $V_s \propto N_s$ and doubling $N_s$ gives $2V$.`,
  },
  {
    stem: tex`A coil of $N$ turns experiences an induced emf $\varepsilon$ for a given rate of change of field. If the number of turns is doubled and the rate of change of the field is halved, the induced emf becomes:`,
    answer: tex`$\varepsilon$`,
    wrong: [tex`$4\varepsilon$`, tex`$2\varepsilon$`, tex`$\frac{\varepsilon}{4}$`],
    why: tex`$\varepsilon = NA\frac{\Delta B}{\Delta t}$, so $\varepsilon' = (2N)A\left(\frac{1}{2}\frac{\Delta B}{\Delta t}\right) = \varepsilon$.`,
  },
];

// ---------------------------------------------------------------------------
// Statement pool
// ---------------------------------------------------------------------------

const TRUTHS: Record<string, string> = {
  'The induced emf in a coil is proportional to the rate of change of magnetic flux linkage.':
    "This is Faraday's law: $\\varepsilon = -N\\frac{\\Delta\\Phi}{\\Delta t}$.",
  'The emf induced in a secondary coil is proportional to the rate of change of current in the primary coil.':
    'This is mutual induction: $\\varepsilon_s = -M\\frac{\\Delta I_p}{\\Delta t}$.',
  'An ideal transformer changes the voltage but not the frequency of an alternating supply.':
    'Both windings link the same alternating flux, so the secondary emf has the supply frequency.',
  'One henry is equal to one weber per ampere.':
    'From $N\\Phi = LI$, $L = \\frac{N\\Phi}{I}$, so $1\\,\\mathrm{H} = 1\\,\\mathrm{Wb\\,A^{-1}}$.',
  'A self-induced emf opposes the change in current that produces it.':
    "By Lenz's law the back emf $\\varepsilon = -L\\frac{\\Delta I}{\\Delta t}$ opposes the change in current.",
  'No emf is induced across a straight rod that moves parallel to a uniform magnetic field.':
    'The motional emf is $\\varepsilon = BLv\\sin\\theta$; with the velocity parallel to the field $\\theta = 0^{\\circ}$, so $\\varepsilon = 0$.',
};

const FALSEHOODS: Record<string, string> = {
  'A transformer can step up a steady DC voltage.':
    'A steady current produces a constant flux, so no emf is induced in the secondary.',
  'The induced emf depends on the magnitude of the flux, not on its rate of change.':
    'The emf depends on how fast the flux changes; a large constant flux induces no emf.',
  'The self-inductance of an air-cored coil doubles when the current through it is doubled.':
    'Self-inductance depends only on the geometry, the number of turns and the core, not on the current.',
  'A step-up transformer increases the power delivered to the secondary.':
    'An ideal transformer conserves power; raising the voltage lowers the current in the same ratio.',
  'Using a solid iron core reduces eddy-current losses in a transformer.':
    'A solid core gives large eddy currents; a laminated core is used to reduce them.',
  'An induced current always flows in the same direction as the current that caused it.':
    "By Lenz's law the induced current opposes the change; it can flow either way.",
};

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('physics', 'em-induction', (b) => [
  // ------------------------------------------------------------------ Faraday law
  b.dynamic('faraday-coil-emf', { difficulty: 2, origin: 'past-paper', tags: ['Faraday law'] }, (r) => {
    const p = draw(
      r,
      (g) => {
        const n = g.pick([10, 20, 50, 100, 200, 500]);
        const areaCm = g.pick([10, 20, 25, 40, 50, 80, 100]);
        const b1 = g.pick([0, 0, 0.1, 0.2, 0.4]);
        const delta = g.pick([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
        const increase = b1 === 0 || g.chance(0.5);
        const b2 = clean(increase ? b1 + delta : b1);
        const start = clean(increase ? b1 : b1 + delta);
        const dtMs = g.pick([10, 20, 40, 50, 100, 200, 500]);
        const emf = clean((n * areaCm * 1e-4 * delta) / (dtMs / 1000));
        return { n, areaCm, start, end: b2, delta, dtMs, emf };
      },
      (v) => exact3(v.emf) && v.emf >= 0.01 && v.emf <= 500,
    );
    const { n, areaCm, start, end, delta, dtMs, emf } = p;
    const wrongFinal = end !== 0 && start !== 0 ? clean((n * areaCm * 1e-4 * end) / (dtMs / 1000)) : NaN;
    const { answer, distractors } = numericOptions(r, {
      correct: emf,
      wrong: exactOnly([clean(emf / n), clean(emf / 1000), wrongFinal, clean(emf * 1e4), clean(emf * n)]),
      format: (x) => q$(x, U.V),
    });
    const area = qty(areaCm, 'cm^{2}');
    return {
      stem: tex`A coil of $${n}$ turns and area $${area}$ is placed with its plane perpendicular to a uniform magnetic field. The field changes steadily from $${qty(start, U.T)}$ to $${qty(end, U.T)}$ in $${qty(dtMs, U.ms)}$. The magnitude of the average induced emf is:`,
      answer,
      distractors,
      explanation: tex`$\varepsilon = N\frac{A\,\Delta B}{\Delta t} = (${n})\frac{(${num(areaCm)} \times 10^{-4})(${num(delta)})}{${num(dtMs / 1000)}} = ${qty(emf, U.V)}$. Remember $1\,\mathrm{cm^{2}} = 10^{-4}\,\mathrm{m^{2}}$ and $1\,\mathrm{ms} = 10^{-3}\,\mathrm{s}$.`,
    };
  }),

  // ------------------------------------------------------------------ motional EMF
  b.dynamic('motional-emf-rod', { difficulty: 1, tags: ['motional EMF'] }, (r) => {
    const p = draw(
      r,
      (g) => {
        const bf = g.pick([0.1, 0.2, 0.25, 0.4, 0.5, 0.8, 1, 1.5, 2]);
        const lenCm = g.pick([10, 20, 25, 40, 50, 60, 80]);
        const v = g.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20]);
        const angle = g.chance(0.35) ? 30 : 90;
        const s = angle === 30 ? 0.5 : 1;
        const emf = clean(bf * (lenCm / 100) * v * s);
        return { bf, lenCm, v, angle, emf };
      },
      (x) => exact3(x.emf) && x.emf >= 0.01,
    );
    const { bf, lenCm, v, angle, emf } = p;
    const full = clean(bf * (lenCm / 100) * v);
    const wrong =
      angle === 30
        ? [full, clean(emf * 100), clean(emf * 2 * 100), clean(full * 2)]
        : [clean(emf * 100), clean(emf / 2), clean((bf * v) / (lenCm / 100)), clean(emf * 2)];
    const { answer, distractors } = numericOptions(r, {
      correct: emf,
      wrong: exactOnly(wrong),
      format: (x) => q$(x, U.V),
    });
    const motion =
      angle === 90
        ? 'with velocity perpendicular to both the rod and the field'
        : tex`with a velocity that makes an angle of $30^{\circ}$ with the field (the rod stays perpendicular to both the field and its velocity)`;
    const sinPart = angle === 90 ? '' : tex`\sin 30^{\circ}`;
    const sinSub = angle === 90 ? '' : tex`(0.5)`;
    return {
      stem: tex`A straight conducting rod of length $${qty(lenCm, U.cm)}$ moves at $${qty(v, U.mps)}$ through a uniform magnetic field of $${qty(bf, U.T)}$, ${motion}. The emf induced between its ends is:`,
      answer,
      distractors,
      explanation: tex`$\varepsilon = BLv${sinPart} = (${num(bf)})(${num(lenCm / 100)})(${v})${sinSub} = ${qty(emf, U.V)}$ (length converted to metres).`,
    };
  }),

  // ------------------------------------------------------------------ self and mutual induction
  b.dynamic('inductance-from-emf', { difficulty: 1, origin: 'past-paper', tags: ['self and mutual induction'] }, (r) => {
    const mutual = r.chance(0.4);
    if (!mutual) {
      const p = draw(
        r,
        (g) => {
          const l = g.pick([0.1, 0.2, 0.25, 0.4, 0.5, 0.8, 1, 2, 5]);
          const dI = g.pick([2, 3, 4, 5, 6, 8, 10]);
          const dtMs = g.pick([10, 20, 50, 100, 200]);
          const emf = clean((l * dI) / (dtMs / 1000));
          return { l, dI, dtMs, emf };
        },
        (x) => Number.isInteger(x.emf) && x.emf >= 2 && x.emf <= 1000,
      );
      const { l, dI, dtMs, emf } = p;
      const { answer, distractors } = numericOptions(r, {
        correct: l,
        wrong: exactOnly([clean(l * 1000), clean((emf * dI) / (dtMs / 1000)), clean(emf / dI), clean(dI / (emf * dtMs / 1000))]),
        format: (x) => q$(x, U.H),
      });
      return {
        stem: tex`The current through a coil changes steadily by $${qty(dI, U.A)}$ in $${qty(dtMs, U.ms)}$, and the self-induced emf in the coil is $${qty(emf, U.V)}$. The self-inductance of the coil is:`,
        answer,
        distractors,
        explanation: tex`$\varepsilon = L\frac{\Delta I}{\Delta t} \Rightarrow L = \frac{\varepsilon\,\Delta t}{\Delta I} = \frac{(${emf})(${num(dtMs / 1000)})}{${dI}} = ${qty(l, U.H)}$.`,
      };
    }
    const p = draw(
      r,
      (g) => {
        const mMh = g.pick([20, 40, 50, 100, 200, 250, 500]);
        const dI = g.pick([1, 2, 3, 4, 5, 6, 8, 10]);
        const dtMs = g.pick([10, 20, 40, 50, 100, 200]);
        const emf = clean((mMh * 1e-3 * dI) / (dtMs * 1e-3));
        return { mMh, dI, dtMs, emf };
      },
      (x) => exact3(x.emf) && x.emf >= 0.1 && x.emf <= 500,
    );
    const { mMh, dI, dtMs, emf } = p;
    const { answer, distractors } = numericOptions(r, {
      correct: emf,
      wrong: exactOnly([clean(emf * 1000), clean(emf / 1000), clean(mMh * 1e-3 * dI * dtMs * 1e-3), clean((mMh * 1e-3 * dtMs * 1e-3) / dI)]),
      format: (x) => q$(x, U.V),
    });
    return {
      stem: tex`Two coils have a mutual inductance of $${qty(mMh, 'mH')}$. The current in the primary coil changes steadily by $${qty(dI, U.A)}$ in $${qty(dtMs, U.ms)}$. The emf induced in the secondary coil is:`,
      answer,
      distractors,
      explanation: tex`$\varepsilon_s = M\frac{\Delta I_p}{\Delta t} = (${num(mMh)} \times 10^{-3})\frac{${dI}}{${num(dtMs)} \times 10^{-3}} = ${qty(emf, U.V)}$.`,
    };
  }),

  b.dynamic('inductor-energy', { difficulty: 1, tags: ['self and mutual induction'] }, (r) => {
    const p = draw(
      r,
      (g) => {
        const lMh = g.pick([10, 20, 40, 50, 100, 200, 250, 400, 500]);
        const i = g.pick([0.5, 1, 2, 3, 4, 5, 6, 10]);
        const u = clean(0.5 * lMh * 1e-3 * i * i);
        return { lMh, i, u };
      },
      (x) => exact3(x.u) && x.u >= 0.001 && x.i !== 1 && x.i !== 2,
    );
    const { lMh, i, u } = p;
    const { answer, distractors } = numericOptions(r, {
      correct: u,
      wrong: exactOnly([clean(2 * u), clean(0.5 * lMh * 1e-3 * i), clean(u * 1000), clean(lMh * 1e-3 * i)]),
      format: (x) => q$(x, U.J),
    });
    return {
      stem: tex`An inductor of inductance $${qty(lMh, 'mH')}$ carries a steady current of $${qty(i, U.A)}$. The energy stored in its magnetic field is:`,
      answer,
      distractors,
      explanation: tex`$U = \frac{1}{2}LI^2 = \frac{1}{2}(${num(lMh)} \times 10^{-3})(${num(i)})^2 = ${qty(u, U.J)}$.`,
    };
  }),

  // ------------------------------------------------------------------ generators
  b.dynamic('generator-peak-emf', { difficulty: 2, tags: ['generators'] }, (r) => {
    const p = draw(
      r,
      (g) => {
        const n = g.pick([20, 50, 100, 200, 250, 500]);
        const areaCm = g.pick([20, 40, 50, 100, 200, 400]);
        const bf = g.pick([0.05, 0.1, 0.2, 0.4, 0.5]);
        const w = g.pick([10, 20, 50, 100, 120, 200]);
        const e0 = clean(n * bf * areaCm * 1e-4 * w);
        return { n, areaCm, bf, w, e0 };
      },
      (x) => exact3(x.e0) && x.e0 >= 0.5 && x.e0 <= 2000,
    );
    const { n, areaCm, bf, w, e0 } = p;
    const { answer, distractors } = numericOptions(r, {
      correct: e0,
      wrong: exactOnly([clean(e0 / n), clean(e0 / w), clean(e0 * 1e4), clean(e0 * 2), clean(e0 / 2)]),
      format: (x) => q$(x, U.V),
    });
    return {
      stem: tex`The coil of an AC generator has $${n}$ turns, each of area $${qty(areaCm, 'cm^{2}')}$, and rotates at $${qty(w, U.radps)}$ in a uniform magnetic field of $${qty(bf, U.T)}$. The peak value of the induced emf is:`,
      answer,
      distractors,
      explanation: tex`$\varepsilon_0 = NBA\omega = (${n})(${num(bf)})(${num(areaCm)} \times 10^{-4})(${w}) = ${qty(e0, U.V)}$.`,
    };
  }),

  // ------------------------------------------------------------------ transformers
  b.dynamic('transformer-turns-ratio', { difficulty: 1, origin: 'past-paper', tags: ['transformers'] }, (r) => {
    const p = draw(
      r,
      (g) => {
        const np = g.pick([100, 200, 400, 500, 1000, 2000]);
        const k = g.pick([0.05, 0.1, 0.2, 0.25, 0.5, 2, 4, 5, 10]);
        const ns = clean(np * k);
        const vp = g.pick([11, 12, 24, 110, 120, 220, 240]);
        const vs = clean(vp * k);
        const ip = g.pick([0.2, 0.5, 1, 2, 4, 5]);
        const is = clean(ip / k);
        return { np, ns, k, vp, vs, ip, is };
      },
      (x) => Number.isInteger(x.ns) && x.ns >= 5 && exact3(x.vs) && exact3(x.is) && x.vs <= 5000,
    );
    const { np, ns, k, vp, vs, ip, is } = p;
    const kind = k > 1 ? 'step-up' : 'step-down';
    if (r.chance(0.6)) {
      const { answer, distractors } = numericOptions(r, {
        correct: vs,
        wrong: exactOnly([clean(vp / k), clean(vp * k * k), vp, clean(vs * 2)]),
        format: (x) => q$(x, U.V),
      });
      return {
        stem: tex`An ideal transformer has $${np}$ turns on its primary and $${ns}$ turns on its secondary. If the primary is connected to a $${qty(vp, U.V)}$ AC supply, the secondary voltage is:`,
        answer,
        distractors,
        explanation: tex`$\frac{V_s}{V_p} = \frac{N_s}{N_p} \Rightarrow V_s = (${vp})\frac{${ns}}{${np}} = ${qty(vs, U.V)}$ (a ${kind} transformer).`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: is,
      wrong: exactOnly([clean(ip * k), clean(ip / (k * k)), ip, clean(is * 2)]),
      format: (x) => q$(x, U.A),
    });
    return {
      stem: tex`An ideal ${kind} transformer has $${np}$ primary turns and $${ns}$ secondary turns. When the primary current is $${qty(ip, U.A)}$, the secondary current is:`,
      answer,
      distractors,
      explanation: tex`Power is conserved, $V_pI_p = V_sI_s$, so $\frac{I_s}{I_p} = \frac{N_p}{N_s} \Rightarrow I_s = (${num(ip)})\frac{${np}}{${ns}} = ${qty(is, U.A)}$.`,
    };
  }),

  // ------------------------------------------------------------------ scaling and statements
  b.dynamic('induction-scaling', { difficulty: 2, tags: ['Faraday law', 'motional EMF', 'self and mutual induction', 'generators', 'transformers'] }, (r) => {
    const c = r.pick(SCALING_CASES);
    return {
      stem: c.stem,
      answer: c.answer,
      distractors: pickDistractors(c.answer, c.wrong),
      explanation: c.why,
    };
  }),

  b.dynamic('induction-statements', { difficulty: 1, tags: ['Faraday law', 'Lenz law', 'motional EMF', 'self and mutual induction', 'transformers'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about electromagnetic induction is correct?',
      negativeStem: 'Which of the following statements about electromagnetic induction is NOT correct?',
      truths: Object.keys(TRUTHS),
      falsehoods: Object.keys(FALSEHOODS),
      explain: (answer, inverted) =>
        inverted
          ? `This statement is false: ${FALSEHOODS[answer] ?? ''}`
          : `This statement is true: ${TRUTHS[answer] ?? ''}`,
    }),
  ),

  // ------------------------------------------------------------------ fixed conceptual items
  ...b.mcqs([
    {
      id: 'henry-in-base-units', d: 1, o: 'past-paper', t: ['self and mutual induction'],
      q: 'The henry, the SI unit of inductance, is equivalent to:',
      a: tex`$\mathrm{V\,s\,A^{-1}}$`,
      x: [tex`$\mathrm{V\,A\,s^{-1}}$`, tex`$\mathrm{Wb\,m^{-2}}$`, tex`$\mathrm{\Omega\,s^{-1}}$`],
      e: tex`From $\varepsilon = L\frac{\Delta I}{\Delta t}$, $L = \frac{\varepsilon\,\Delta t}{\Delta I}$, so $1\,\mathrm{H} = 1\,\mathrm{V\,s\,A^{-1}} = 1\,\mathrm{\Omega\,s}$. $\mathrm{Wb\,m^{-2}}$ is the tesla.`,
    },
    {
      id: 'lenz-energy-conservation', d: 1, o: 'past-paper', t: ['Lenz law'],
      q: "Lenz's law is a consequence of the law of conservation of:",
      a: 'energy',
      x: ['charge', 'linear momentum', 'mass'],
      e: 'The induced current opposes the change producing it, so work must be done against it; otherwise electrical energy would appear without any work being done.',
    },
    {
      id: 'emf-depends-on-rate', d: 1, t: ['Faraday law'],
      q: 'The magnitude of the emf induced in a coil depends on the:',
      a: 'rate of change of magnetic flux linking the coil',
      x: ['magnitude of the magnetic flux linking the coil', 'resistance of the wire of the coil', 'direction of the magnetic flux linking the coil'],
      e: tex`Faraday's law: $\varepsilon = -N\frac{\Delta\Phi}{\Delta t}$. A large but constant flux induces no emf, and the emf does not depend on the resistance (only the current does).`,
    },
    {
      id: 'magnet-through-copper-ring', d: 2, t: ['Lenz law'],
      q: 'A bar magnet is dropped vertically through a horizontal copper ring. While it approaches and leaves the ring, the acceleration of the magnet is:',
      a: tex`less than $g$`,
      x: [tex`equal to $g$`, tex`greater than $g$`, 'zero throughout'],
      e: "By Lenz's law the current induced in the ring opposes the motion of the magnet (repelling it as it approaches and attracting it as it leaves), so the net downward force and the acceleration are less than $g$.",
    },
    {
      id: 'ring-current-direction', d: 3, t: ['Lenz law'],
      q: 'A bar magnet, north pole downward, falls along the axis of a horizontal conducting ring and passes through it. Viewed from above, the current induced in the ring is:',
      a: 'anticlockwise while the magnet approaches, then clockwise while it leaves',
      x: [
        'clockwise while the magnet approaches, then anticlockwise while it leaves',
        'anticlockwise both while the magnet approaches and while it leaves',
        'clockwise both while the magnet approaches and while it leaves',
      ],
      e: 'As the N pole approaches, the downward flux increases, so the ring makes an upward field: anticlockwise from above. As the S pole leaves, the downward flux decreases, so the ring makes a downward field: clockwise from above.',
    },
    {
      id: 'loop-inside-uniform-field', d: 2, t: ['motional EMF'],
      q: 'A rectangular conducting loop moves with constant velocity while remaining entirely inside a uniform magnetic field perpendicular to its plane. The induced current in the loop is:',
      a: 'zero',
      x: ['directly proportional to its speed', 'directly proportional to its area', 'maximum when its speed is greatest'],
      e: 'The flux through the loop does not change, so no net emf is induced. The motional emfs in the two sides cutting the field are equal and cancel around the loop.',
    },
    {
      id: 'rotating-rod-emf', d: 3, t: ['motional EMF'],
      q: tex`A conducting rod of length $L$ rotates with angular speed $\omega$ about one of its ends, in a plane perpendicular to a uniform magnetic field $B$. The emf between its ends is:`,
      a: tex`$\frac{1}{2}B\omega L^2$`,
      x: [tex`$B\omega L^2$`, tex`$\frac{1}{2}B\omega L$`, tex`$2B\omega L^2$`],
      e: tex`Points on the rod move with speeds from $0$ to $\omega L$, so the average speed is $\frac{\omega L}{2}$ and $\varepsilon = BL\left(\frac{\omega L}{2}\right) = \frac{1}{2}B\omega L^2$.`,
    },
    {
      id: 'mutual-inductance-not-depend', d: 2, t: ['self and mutual induction'],
      q: 'The mutual inductance of a pair of coils does NOT depend on the:',
      a: 'current flowing in the primary coil',
      x: ['number of turns of the two coils', 'separation and relative orientation of the coils', 'material of the core on which they are wound'],
      e: tex`$M = \frac{N_s\Phi_s}{I_p}$, and the flux is proportional to $I_p$, so $M$ depends only on geometry, turns and the core, not on the current.`,
    },
    {
      id: 'generator-coil-max-emf', d: 2, t: ['generators'],
      q: 'In an AC generator, the emf induced in the rotating coil is maximum when the plane of the coil is:',
      a: 'parallel to the magnetic field',
      x: ['perpendicular to the magnetic field', tex`at $45^{\circ}$ to the magnetic field`, tex`at $60^{\circ}$ to the magnetic field`],
      e: tex`$\varepsilon = NBA\omega\sin\omega t$, where $\omega t$ is the angle between the field and the normal to the coil. The emf is maximum at $90^{\circ}$, when the plane of the coil is parallel to the field and the flux through it is zero but changing fastest.`,
    },
    {
      id: 'motor-starting-current', d: 2, t: ['generators'],
      q: 'A DC motor draws the largest current from the supply:',
      a: 'at the instant it is switched on',
      x: ['when it runs at its maximum speed', 'when it runs steadily under full load', 'when its load is removed'],
      e: tex`$I = \frac{V - \varepsilon_b}{R}$. At switch-on the coil is at rest, so the back emf $\varepsilon_b$ is zero and the current is largest; as the speed rises the back emf grows and the current falls. Even under full load the running coil has some back emf, so the current is smaller than at start-up.`,
    },
    {
      id: 'laminated-core-eddy', d: 1, o: 'past-paper', t: ['transformers'],
      q: 'The core of a transformer is laminated in order to reduce:',
      a: 'eddy-current losses',
      x: ['hysteresis losses', 'copper losses in the windings', 'flux leakage between the coils'],
      e: 'Thin insulated laminations cut the paths of the eddy currents induced in the core, reducing the heat they produce. Hysteresis loss is reduced by using soft iron, not by laminating.',
    },
    {
      id: 'transformer-on-dc', d: 1, t: ['transformers'],
      q: 'A transformer does not work on a steady DC supply because:',
      a: 'a steady current produces no change of flux in the core',
      x: ['the windings offer infinite resistance to DC', 'a direct current cannot magnetize an iron core', 'the secondary coil short-circuits a DC supply'],
      e: 'Induction needs a changing flux. A steady current gives a constant flux, so no emf is induced in the secondary (and the primary, with only its small resistance, may overheat).',
    },
  ]),
]);
