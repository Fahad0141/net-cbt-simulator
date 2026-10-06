import { defineBank } from '@/engine/authoring';
import { num, numericOptions, pickDistractors, q$, qty, statementQuestion, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers and data
// ---------------------------------------------------------------------------

const KOHM = 'k\\Omega';

/** `x` prints exactly with three significant figures (num() would not round it). */
function exact3(x: number): boolean {
  return Number(x.toPrecision(3)) === Number(x.toPrecision(12));
}

/** Two-input gates: outputs for (A, B) = (0,0), (0,1), (1,0), (1,1). */
const GATES: ReadonlyArray<{ name: string; out: readonly [number, number, number, number]; rule: string; expr: string }> = [
  { name: 'AND', out: [0, 0, 0, 1], rule: 'gives 1 only when both inputs are 1', expr: tex`Y = A \cdot B` },
  { name: 'OR', out: [0, 1, 1, 1], rule: 'gives 1 when at least one input is 1', expr: tex`Y = A + B` },
  { name: 'NAND', out: [1, 1, 1, 0], rule: 'gives 0 only when both inputs are 1', expr: tex`Y = \overline{A \cdot B}` },
  { name: 'NOR', out: [1, 0, 0, 0], rule: 'gives 1 only when both inputs are 0', expr: tex`Y = \overline{A + B}` },
  { name: 'XOR', out: [0, 1, 1, 0], rule: 'gives 1 only when the inputs are different', expr: tex`Y = A \oplus B` },
  { name: 'XNOR', out: [1, 0, 0, 1], rule: 'gives 1 only when the inputs are equal', expr: tex`Y = \overline{A \oplus B}` },
];

const INPUTS_TEXT = '$(A, B) = (0, 0), (0, 1), (1, 0), (1, 1)$';
const outText = (o: readonly number[]): string => `$${o.join(',\\ ')}$`;

/** Statements about semiconductors and the p-n junction, with the reason each is true or false. */
const SEMI_TRUTHS: ReadonlyArray<readonly [string, string]> = [
  ['In an n-type semiconductor, free electrons are the majority charge carriers.', 'Pentavalent donor atoms supply extra free electrons, so electrons outnumber holes.'],
  ['A p-type semiconductor is obtained by doping silicon with a trivalent impurity such as boron.', 'Each trivalent atom leaves one bond incomplete, creating a hole (acceptor impurity).'],
  ['The conductivity of an intrinsic semiconductor increases as its temperature rises.', 'Heating breaks more covalent bonds, producing more electron-hole pairs.'],
  ['A doped semiconductor, taken as a whole, is electrically neutral.', 'The impurity atoms are themselves neutral; each free carrier they release leaves behind an oppositely charged fixed ion, so the total charge stays zero.'],
  ['The depletion region of a p-n junction contains immobile ions but practically no free charge carriers.', 'Carriers near the junction diffuse across and recombine, leaving fixed donor and acceptor ions behind.'],
  ['Reverse bias widens the depletion region of a p-n junction.', 'The applied voltage adds to the barrier and pulls carriers away from the junction.'],
];

const SEMI_FALSEHOODS: ReadonlyArray<readonly [string, string]> = [
  ['An n-type semiconductor carries a net negative charge.', 'It is electrically neutral: each extra electron is balanced by a positive donor ion.'],
  ['Doping silicon with a pentavalent impurity produces a p-type semiconductor.', 'A pentavalent (donor) impurity gives an n-type semiconductor.'],
  ['The resistance of a pure semiconductor increases as its temperature rises.', 'Its resistance decreases with temperature because more charge carriers are produced.'],
  ['Forward bias widens the depletion region of a p-n junction.', 'Forward bias opposes the barrier and narrows the depletion region.'],
  ['Holes are the majority charge carriers in an n-type semiconductor.', 'In n-type material electrons are the majority carriers; holes are the minority carriers.'],
  ['At absolute zero, pure silicon behaves as a good conductor.', 'At 0 K no bonds are broken, the conduction band is empty and pure silicon is an insulator.'],
];

/** Silicon-diode circuits: EMF (V), resistance (ohm), forward current (mA) all exact. */
const DIODE_CASES = (() => {
  const out: Array<{ e: number; vb: number; r: number; i: number }> = [];
  for (const e of [1.5, 2, 3, 4.5, 5, 6, 9, 10, 12]) {
    for (const vb of [0.7, 0.3]) {
      for (const r of [100, 200, 250, 400, 500, 1000, 2000]) {
        const i = Number((((e - vb) / r) * 1000).toPrecision(12));
        const others = [(e / r) * 1000, ((e + vb) / r) * 1000];
        if (i >= 0.5 && i <= 60 && exact3(i) && others.every(exact3)) out.push({ e, vb, r, i });
      }
    }
  }
  return out;
})();

export default defineBank('physics', 'electronics', (b) => [
  // =========================================================================
  // Semiconductors and the p-n junction
  // =========================================================================
  b.dynamic('semiconductor-statements', { difficulty: 2, tags: ['semiconductors', 'p-n junction'] }, (r) => {
    const reason = new Map([...SEMI_TRUTHS, ...SEMI_FALSEHOODS]);
    return statementQuestion(r, {
      stem: 'Which of the following statements about semiconductors is correct?',
      negativeStem: 'Which of the following statements about semiconductors is NOT correct?',
      truths: SEMI_TRUTHS.map(([s]) => s),
      falsehoods: SEMI_FALSEHOODS.map(([s]) => s),
      explain: (answer, inverted) =>
        inverted ? `This statement is false. ${reason.get(answer) ?? ''}` : `This statement is true. ${reason.get(answer) ?? ''}`,
    });
  }),

  b.dynamic('diode-series-current', { difficulty: 2, tags: ['p-n junction'] }, (r) => {
    // silicon is the textbook default, so it appears more often
    const vb = r.chance(0.7) ? 0.7 : 0.3;
    const c = r.pick(DIODE_CASES.filter((x) => x.vb === vb));
    const kind = c.vb === 0.7 ? 'silicon' : 'germanium';
    const fmt = (x: number): string => q$(x, U.mA);
    const ignore = (c.e / c.r) * 1000;
    const added = ((c.e + c.vb) / c.r) * 1000;
    const rText = c.r >= 1000 ? qty(c.r / 1000, KOHM) : qty(c.r, U.ohm);
    if (r.chance(0.3)) {
      const answer = fmt(0);
      return {
        stem: tex`A ${kind} diode (barrier potential $${qty(c.vb, U.V)}$) is connected in series with a $${rText}$ resistor and a $${qty(c.e, U.V)}$ battery so that its p-side is joined to the negative terminal. Neglecting leakage current, the current in the circuit is:`,
        answer,
        distractors: pickDistractors(answer, [fmt(c.i), fmt(ignore), fmt(added)]),
        explanation: tex`With the p-side at the negative terminal the diode is reverse biased. Its depletion region widens and it blocks conduction, so apart from a tiny leakage current, $I = 0$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: c.i,
      // ignored the barrier; added the barrier; assumed no conduction
      wrong: [ignore, added, 0],
      allowZero: true,
      format: fmt,
    });
    return {
      stem: tex`A ${kind} diode (barrier potential $${qty(c.vb, U.V)}$) is forward biased by a $${qty(c.e, U.V)}$ battery through a $${rText}$ resistor. Taking the voltage drop across the conducting diode to be equal to its barrier potential, the current in the circuit is:`,
      answer,
      distractors,
      explanation: tex`The diode drops its barrier potential, so $I = \frac{E - V_b}{R} = \frac{${num(c.e)} - ${num(c.vb)}}{${c.r}} = ${num(c.i / 1000)}\,\mathrm{A} = ${num(c.i)}\,\mathrm{mA}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'pentavalent-doping',
      d: 1,
      o: 'past-paper',
      t: ['semiconductors'],
      q: 'Pure silicon is doped with a small amount of arsenic, a pentavalent element. The resulting material is:',
      a: 'an n-type semiconductor with electrons as majority carriers',
      x: [
        'a p-type semiconductor with holes as majority carriers',
        'an n-type semiconductor with holes as majority carriers',
        'an intrinsic semiconductor with equal numbers of electrons and holes',
      ],
      e: 'Four of the five valence electrons of arsenic form covalent bonds; the fifth becomes a free electron. Arsenic is therefore a donor, and the material is n-type with electrons as majority carriers.',
    },
    {
      id: 'forward-bias-connection',
      d: 1,
      o: 'past-paper',
      t: ['p-n junction'],
      q: 'A p-n junction diode is forward biased when:',
      a: 'its p-region is joined to the positive terminal and its n-region to the negative terminal of the battery',
      x: [
        'its p-region is joined to the negative terminal and its n-region to the positive terminal of the battery',
        'the applied voltage acts in the same direction as the potential barrier',
        'the applied voltage makes the depletion region wider',
      ],
      e: 'In forward bias the external voltage opposes the barrier potential: the positive terminal pushes holes in the p-region and the negative terminal pushes electrons in the n-region towards the junction, narrowing the depletion region.',
    },
    {
      id: 'silicon-barrier-potential',
      d: 1,
      o: 'past-paper',
      t: ['p-n junction'],
      q: 'At room temperature the potential barrier across a silicon p-n junction is about:',
      a: tex`$0.7\,\mathrm{V}$`,
      x: [tex`$0.3\,\mathrm{V}$`, tex`$7\,\mathrm{V}$`, tex`$0.07\,\mathrm{V}$`],
      e: tex`The barrier potential is about $0.7\,\mathrm{V}$ for silicon; $0.3\,\mathrm{V}$ is the value for germanium.`,
    },
    {
      id: 'photodiode-operation',
      d: 2,
      t: ['p-n junction'],
      q: 'A photodiode is normally operated:',
      a: 'in reverse bias, so that its small reverse current increases with the intensity of the incident light',
      x: [
        'in forward bias, so that it emits light when current passes through it',
        'in reverse bias, so that its reverse current decreases as the light intensity increases',
        'in forward bias, with the current independent of the incident light',
      ],
      e: 'Light falling on a reverse-biased junction creates electron-hole pairs in the depletion region, so the reverse (minority-carrier) current rises with light intensity. Emitting light in forward bias describes an LED.',
    },
  ]),

  // =========================================================================
  // Rectification
  // =========================================================================
  b.dynamic('rectifier-output-frequency', { difficulty: 1, tags: ['rectification'] }, (r) => {
    const askPeriod = r.chance(0.5);
    // 60 Hz gives a recurring-decimal period, so it is used only for the frequency form
    const f = r.pick(askPeriod ? [50, 100, 200, 250, 400, 500, 1000] : [50, 60, 100, 200, 250, 400, 500, 1000]);
    const full = r.chance(0.5);
    const type = full ? 'full-wave' : 'half-wave';
    const k = full ? 2 : 1;
    const reason = full
      ? 'A full-wave rectifier passes both half-cycles, giving two output pulses per input cycle'
      : 'A half-wave rectifier passes only one half-cycle, giving one output pulse per input cycle';
    if (!askPeriod) {
      const fo = k * f;
      const { answer, distractors } = numericOptions(r, {
        correct: fo,
        wrong: full ? [f, 4 * f, f / 2] : [2 * f, f / 2, 4 * f],
        format: (x) => q$(x, U.Hz),
      });
      return {
        stem: tex`A $${qty(f, U.Hz)}$ alternating voltage is applied to a ${type} rectifier. The frequency of the pulsating output (number of output pulses per second) is:`,
        answer,
        distractors,
        explanation: tex`${reason}, so $f_{out} = ${k} \times ${f} = ${fo}\,\mathrm{Hz}$.`,
      };
    }
    const t = 1000 / (k * f);
    const { answer, distractors } = numericOptions(r, {
      correct: t,
      wrong: full ? [1000 / f, 500 / (2 * f), 2000 / f] : [500 / f, 2000 / f, 250 / f],
      format: (x) => q$(x, U.ms),
    });
    return {
      stem: tex`A $${qty(f, U.Hz)}$ alternating voltage is applied to a ${type} rectifier. The time interval between the starts of successive output pulses is:`,
      answer,
      distractors,
      explanation: tex`${reason}. The output frequency is $${k * f}\,\mathrm{Hz}$, so the interval is $\frac{1}{${k * f}}\,\mathrm{s} = ${num(t)}\,\mathrm{ms}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'bridge-rectifier-diodes',
      d: 1,
      o: 'past-paper',
      t: ['rectification'],
      q: 'A full-wave bridge rectifier contains four diodes. The number of diodes that conduct during each half-cycle of the input is:',
      a: '2',
      x: ['1', '3', '4'],
      e: 'In each half-cycle one pair of opposite diodes is forward biased and conducts while the other pair is reverse biased; the pairs swap in the next half-cycle, so the current through the load always flows the same way.',
    },
  ]),

  // =========================================================================
  // Transistors
  // =========================================================================
  b.dynamic('transistor-current-gain', { difficulty: 2, origin: 'past-paper', tags: ['transistors'] }, (r) => {
    const beta = r.pick([50, 80, 100, 120, 150, 200, 250, 300]);
    const ib = r.pick([10, 20, 25, 40, 50, 60, 80]); // microamperes
    const ic = (beta * ib) / 1000; // milliamperes
    const ie = ic + ib / 1000;
    const fmt = (x: number): string => q$(num(x, { sig: 5 }), U.mA);
    const mode = r.pick(['ic', 'ie', 'beta'] as const);
    if (mode === 'ic') {
      const { answer, distractors } = numericOptions(r, {
        correct: ic,
        // micro-to-milli slip either way; gave the emitter current
        wrong: [10 * ic, ic / 10, ie],
        format: fmt,
      });
      return {
        stem: tex`A transistor has current gain $\beta = ${beta}$. When its base current is $${qty(ib, '\\mu A')}$, the collector current is:`,
        answer,
        distractors,
        explanation: tex`$I_C = \beta I_B = ${beta} \times ${ib}\,\mathrm{\mu A} = ${beta * ib}\,\mathrm{\mu A} = ${num(ic)}\,\mathrm{mA}$.`,
      };
    }
    if (mode === 'ie') {
      const { answer, distractors } = numericOptions(r, {
        correct: ie,
        // subtracted; added without converting micro to milli; treated microamperes as 0.01 mA each
        wrong: [ic - ib / 1000, ic + ib, ic + ib / 100],
        format: fmt,
      });
      return {
        stem: tex`In a transistor the base current is $${qty(ib, '\\mu A')}$ and the collector current is $${qty(ic, U.mA)}$. The emitter current is:`,
        answer,
        distractors,
        explanation: tex`$I_E = I_B + I_C = ${num(ib / 1000)}\,\mathrm{mA} + ${num(ic)}\,\mathrm{mA} = ${num(ie, { sig: 5 })}\,\mathrm{mA}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: beta,
      // micro-to-milli slip either way; used I_E / I_B
      wrong: [10 * beta, beta / 10, beta + 1],
      format: (x) => `$${num(x)}$`,
    });
    return {
      stem: tex`A base current of $${qty(ib, '\\mu A')}$ produces a collector current of $${qty(ic, U.mA)}$ in a transistor. Its current gain $\beta$ is:`,
      answer,
      distractors,
      explanation: tex`$\beta = \frac{I_C}{I_B} = \frac{${num(ic)} \times 10^{-3}}{${ib} \times 10^{-6}} = ${beta}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'transistor-amplifier-biasing',
      d: 1,
      t: ['transistors'],
      q: 'For a transistor to work as an amplifier, its junctions must be biased as follows:',
      a: 'emitter-base junction forward biased and collector-base junction reverse biased',
      x: [
        'emitter-base junction reverse biased and collector-base junction forward biased',
        'both the emitter-base and collector-base junctions forward biased',
        'both the emitter-base and collector-base junctions reverse biased',
      ],
      e: 'Amplification needs the active region: the forward-biased emitter-base junction injects carriers, which cross the thin base and are swept into the collector by the reverse-biased collector-base junction. Both forward gives saturation; both reverse gives cut-off.',
    },
    {
      id: 'ce-amplifier-phase',
      d: 2,
      o: 'past-paper',
      t: ['transistors'],
      q: 'In a common-emitter transistor amplifier, the phase difference between the output voltage and the input signal is:',
      a: tex`$180^{\circ}$`,
      x: [tex`$0^{\circ}$`, tex`$90^{\circ}$`, tex`$45^{\circ}$`],
      e: tex`An increase in base current increases $I_C$, so the drop $I_C R_C$ rises and $V_{CE} = V_{CC} - I_C R_C$ falls. The output therefore goes down when the input goes up: a $180^{\circ}$ phase reversal.`,
    },
    {
      id: 'transistor-switch-on',
      d: 2,
      t: ['transistors'],
      q: 'When a transistor is used as a switch, its ON (closed-switch) state corresponds to:',
      a: tex`saturation, with a large collector current and $V_{CE}$ nearly zero`,
      x: [
        tex`cut-off, with zero collector current and $V_{CE}$ nearly equal to $V_{CC}$`,
        tex`saturation, with zero collector current and $V_{CE}$ nearly equal to $V_{CC}$`,
        tex`cut-off, with a large collector current and $V_{CE}$ nearly zero`,
      ],
      e: tex`A large base current drives the transistor into saturation: the maximum collector current flows and $V_{CE} \approx 0$, like a closed switch. With zero base current it is cut off: $I_C \approx 0$ and $V_{CE} \approx V_{CC}$, like an open switch.`,
    },
  ]),

  // =========================================================================
  // Operational amplifiers
  // =========================================================================
  b.dynamic('opamp-inverting-gain', { difficulty: 1, tags: ['op-amps'] }, (r) => {
    const ri = r.pick([1, 2, 4, 5, 10, 20]);
    const g = r.int(2, 20);
    const rf = g * ri;
    const circuit = tex`An inverting amplifier is built from an ideal op-amp, an input resistor $R_1 = ${qty(ri, KOHM)}$ and a feedback resistor $R_f = ${qty(rf, KOHM)}$.`;
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: -g,
        // dropped the sign; used the non-inverting formula; inverted the ratio
        wrong: [g, -(g + 1), -1 / g],
        allowNegative: true,
        format: (x) => `$${num(x)}$`,
      });
      return {
        stem: tex`${circuit} Its closed-loop voltage gain is:`,
        answer,
        distractors,
        explanation: tex`For an inverting amplifier $G = -\frac{R_f}{R_1} = -\frac{${rf}}{${ri}} = -${g}$; the minus sign shows the output is inverted.`,
      };
    }
    const vins = [0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8].filter((v) => g * v <= 12);
    const vin = r.pick(vins);
    const vout = -g * vin;
    const { answer, distractors } = numericOptions(r, {
      correct: vout,
      // dropped the sign; used 1 + Rf/R1; inverted the ratio
      wrong: [-vout, -(g + 1) * vin, -vin / g],
      allowNegative: true,
      format: (x) => q$(x, U.V),
    });
    return {
      stem: tex`${circuit} The op-amp runs from a $\pm 15\,\mathrm{V}$ supply. If the input voltage is $${qty(vin, U.V)}$, the output voltage is:`,
      answer,
      distractors,
      explanation: tex`$V_o = -\frac{R_f}{R_1}V_i = -\frac{${rf}}{${ri}} \times ${num(vin)} = ${num(vout)}\,\mathrm{V}$.`,
    };
  }),

  b.dynamic('opamp-non-inverting-gain', { difficulty: 2, tags: ['op-amps'] }, (r) => {
    const r1 = r.pick([1, 2, 5, 10, 20]);
    const k = r.int(2, 15); // Rf / R1
    const rf = k * r1;
    const g = 1 + k;
    const circuit = tex`A non-inverting amplifier is built from an ideal op-amp, a resistor $R_1 = ${qty(r1, KOHM)}$ from the inverting input to ground and a feedback resistor $R_f = ${qty(rf, KOHM)}$.`;
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: g,
        // inverting-amplifier magnitude; inverting formula with sign; inverted the ratio
        wrong: [k, -k, 1 + 1 / k],
        allowNegative: true,
        format: (x) => `$${num(x)}$`,
      });
      return {
        stem: tex`${circuit} Its closed-loop voltage gain is:`,
        answer,
        distractors,
        explanation: tex`For a non-inverting amplifier $G = 1 + \frac{R_f}{R_1} = 1 + \frac{${rf}}{${r1}} = ${g}$; the output is in phase with the input.`,
      };
    }
    const vins = [0.1, 0.2, 0.25, 0.4, 0.5, 0.6, 0.8].filter((v) => g * v <= 12);
    const vin = r.pick(vins);
    const vout = g * vin;
    const { answer, distractors } = numericOptions(r, {
      correct: vout,
      // used Rf/R1 only; used the inverting formula; inverted the ratio
      wrong: [k * vin, -k * vin, (1 + 1 / k) * vin],
      allowNegative: true,
      format: (x) => q$(x, U.V),
    });
    return {
      stem: tex`${circuit} The op-amp runs from a $\pm 15\,\mathrm{V}$ supply. If the input voltage is $${qty(vin, U.V)}$, the output voltage is:`,
      answer,
      distractors,
      explanation: tex`$V_o = \left(1 + \frac{R_f}{R_1}\right)V_i = \left(1 + \frac{${rf}}{${r1}}\right) \times ${num(vin)} = ${g} \times ${num(vin)} = ${num(vout)}\,\mathrm{V}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'ideal-opamp-resistances',
      d: 1,
      t: ['op-amps'],
      q: 'An ideal operational amplifier has:',
      a: 'infinite input resistance and zero output resistance',
      x: [
        'zero input resistance and infinite output resistance',
        'infinite input resistance and infinite output resistance',
        'zero input resistance and zero output resistance',
      ],
      e: 'An ideal op-amp draws no current from the source (infinite input resistance), delivers its output voltage to any load without loss (zero output resistance) and has infinite open-loop gain.',
    },
  ]),

  // =========================================================================
  // Logic gates
  // =========================================================================
  b.dynamic('logic-gate-truth-table', { difficulty: 1, origin: 'past-paper', tags: ['logic gates'] }, (r) => {
    const gate = r.pick(GATES);
    const others = GATES.filter((g) => g.name !== gate.name);
    const mode = r.pick(['table', 'name', 'expr'] as const);
    if (mode === 'table') {
      const answer = outText(gate.out);
      return {
        stem: `For the inputs ${INPUTS_TEXT} taken in that order, the outputs of a two-input ${gate.name} gate are:`,
        answer,
        distractors: pickDistractors(answer, others.map((g) => outText(g.out)), r),
        explanation: `The ${gate.name} gate ${gate.rule}, so its outputs are ${answer}.`,
      };
    }
    if (mode === 'name') {
      const answer = `${gate.name} gate`;
      return {
        stem: `A two-input logic gate gives the outputs ${outText(gate.out)} for the inputs ${INPUTS_TEXT} respectively. The gate is:`,
        answer,
        distractors: pickDistractors(answer, others.map((g) => `${g.name} gate`), r),
        explanation: `The output pattern ${outText(gate.out)} means the gate ${gate.rule}: this is the ${gate.name} gate.`,
      };
    }
    const answer = `${gate.name} gate`;
    return {
      stem: `The Boolean expression $${gate.expr}$ represents the:`,
      answer,
      distractors: pickDistractors(answer, others.map((g) => `${g.name} gate`), r),
      explanation: `$${gate.expr}$ is the ${gate.name} operation; this gate ${gate.rule}.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'universal-gates',
      d: 1,
      t: ['logic gates'],
      q: 'Which two logic gates are known as universal gates?',
      a: 'NAND and NOR',
      x: ['AND and OR', 'XOR and XNOR', 'AND and NOT'],
      e: 'Any Boolean function (including NOT, AND and OR) can be built using only NAND gates or only NOR gates, so these two are called universal gates.',
    },
    {
      id: 'de-morgan-nand',
      d: 3,
      t: ['logic gates'],
      q: tex`By De Morgan's theorem, $\overline{A \cdot B}$ is equal to:`,
      a: tex`$\overline{A} + \overline{B}$`,
      x: [tex`$\overline{A} \cdot \overline{B}$`, tex`$\overline{A + B}$`, tex`$A + B$`],
      e: tex`De Morgan's theorems: $\overline{A \cdot B} = \overline{A} + \overline{B}$ and $\overline{A + B} = \overline{A} \cdot \overline{B}$. So a NAND gate is equivalent to an OR gate with inverted inputs; $\overline{A} \cdot \overline{B}$ is the NOR function.`,
    },
    {
      id: 'inverted-inputs-nand',
      d: 3,
      t: ['logic gates'],
      q: 'Inputs A and B are each passed through a NOT gate, and the two inverted signals are fed into a NAND gate. The whole combination is equivalent to a single:',
      a: 'OR gate',
      x: ['AND gate', 'NOR gate', 'XOR gate'],
      e: tex`$Y = \overline{\overline{A} \cdot \overline{B}} = \overline{\overline{A}} + \overline{\overline{B}} = A + B$ by De Morgan's theorem, which is the OR function.`,
    },
  ]),
]);
