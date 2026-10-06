import { defineBank } from '@/engine/authoring';
import type { Fraction } from '@/engine/helpers';
import { frac, num, numericOptions, pickDistractors, q$, qty, sci, statementQuestion, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** `x` prints exactly with three significant figures (num() would not round it). */
function exact3(x: number): boolean {
  return Number(x.toPrecision(3)) === Number(x.toPrecision(12));
}

/** Scientific-notation option, e.g. `$2.5 \times 10^{-3}$`. */
const sci$ = (x: number): string => `$${sci(x)}$`;

/** Pressure-type option in scientific notation, e.g. `$2 \times 10^{6}\,\mathrm{Pa}$`. */
const pa$ = (x: number): string => tex`$${sci(x)}\,\mathrm{Pa}$`;
/** "half the", "twice the", ... for a scaling factor. */
function timesText(f: Fraction): string {
  if (f.n === 1 && f.d === 2) return 'half the';
  if (f.n === 1 && f.d === 1) return 'the same';
  if (f.d === 1 && f.n === 2) return 'twice the';
  const words: Record<number, string> = { 3: 'three', 4: 'four' };
  return `${words[f.n] ?? String(f.n)} times the`;
}

/** An extension option `k e` (`e` alone when k = 1). */
function extTex(k: Fraction): string {
  if (k.n === 1 && k.d === 1) return '$e$';
  return `$${k.toTex()}\\,e$`;
}

// Statements for the band theory / superconductor / magnetism generator, each with its reason.
const TRUE_STATEMENTS: ReadonlyArray<readonly [string, string]> = [
  ['In a conductor, the valence band and the conduction band overlap.', 'Overlapping bands leave many free electrons, so metals conduct readily.'],
  ['An insulator has a wide forbidden gap between its valence and conduction bands.', 'Electrons cannot gain enough energy to cross the wide gap, so no conduction occurs.'],
  ['The conductivity of a pure semiconductor increases as its temperature rises.', 'Heating lifts more electrons across the small gap, creating more electron-hole pairs.'],
  ['A superconductor expels magnetic flux from its interior below its critical temperature.', 'This is the Meissner effect: a superconductor behaves as a perfect diamagnet.'],
  ['A ferromagnetic material becomes paramagnetic above its Curie temperature.', 'Thermal agitation destroys the alignment within domains above the Curie temperature.'],
  ['Iron, cobalt and nickel are ferromagnetic substances.', 'Their atomic moments align spontaneously within domains.'],
];

const FALSE_STATEMENTS: ReadonlyArray<readonly [string, string]> = [
  ['At absolute zero, a pure semiconductor behaves as a good conductor.', 'At 0 K its conduction band is empty, so a pure semiconductor behaves as an insulator.'],
  ['In an insulator, the conduction band is normally full of electrons.', 'In an insulator the valence band is full and the conduction band is empty.'],
  ['The resistivity of a metal decreases as its temperature rises.', 'Lattice vibrations grow with temperature, so the resistivity of a metal increases.'],
  ['A superconductor has a very large resistance below its critical temperature.', 'Below the critical temperature the resistance of a superconductor is zero.'],
  ['Copper and bismuth are ferromagnetic substances.', 'Copper and bismuth are diamagnetic, not ferromagnetic.'],
  ['The forbidden gap of an insulator is narrower than that of a semiconductor.', 'An insulator has the wider gap (several eV); a semiconductor has about 1 eV.'],
];

const REASONS = new Map<string, string>([...TRUE_STATEMENTS, ...FALSE_STATEMENTS]);

export default defineBank('physics', 'solids', (b) => [
  // -------------------------------------------------------------------------
  // Stress and strain (dynamic)
  // -------------------------------------------------------------------------
  b.dynamic('stress-on-wire', { difficulty: 1, tags: ['stress and strain'] }, (r) => {
    const useMm = r.chance(0.6);
    const area = r.pick([1, 2, 4, 5, 10]);
    const force = r.multiple(20, 600, 20);
    const factor = useMm ? 1e-6 : 1e-4;
    const unit = useMm ? 'mm^{2}' : 'cm^{2}';
    const body = useMm ? 'A wire' : 'A rod';
    const stress = force / (area * factor);
    const { answer, distractors } = numericOptions(r, {
      correct: stress,
      wrong: [
        force / area, // area left in mm^2 / cm^2
        force / (area * (useMm ? 1e-3 : 1e-2)), // converted the length, not the area
        force / (area * (useMm ? 1e-4 : 1e-6)), // used the wrong area conversion
        force * area * factor, // multiplied instead of dividing
      ],
      format: pa$,
    });
    return {
      stem: tex`${body} of cross-sectional area $${qty(area, unit)}$ carries a tensile force of $${qty(force, U.N)}$. The tensile stress in it is:`,
      answer,
      distractors,
      explanation: tex`$A = ${area}\,\mathrm{${unit}} = ${sci(area * factor)}\,\mathrm{m^{2}}$, so $\sigma = \frac{F}{A} = \frac{${force}}{${sci(area * factor)}} = ${sci(stress)}\,\mathrm{Pa}$.`,
    };
  }),

  b.dynamic('strain-from-extension', { difficulty: 1, tags: ['stress and strain'] }, (r) => {
    const length = r.pick([0.5, 1, 2, 2.5, 4, 5]);
    const extMm = r.int(1, 6);
    const strain = (extMm * 1e-3) / length;
    const { answer, distractors } = numericOptions(r, {
      correct: strain,
      wrong: [
        extMm / length, // extension left in mm
        (extMm * 1e-2) / length, // took mm as cm
        length / (extMm * 1e-3), // inverted the ratio
        extMm * 1e-3 * length, // multiplied instead of dividing
      ],
      format: sci$,
    });
    return {
      stem: tex`A wire of original length $${qty(length, U.m)}$ is stretched by $${qty(extMm, U.mm)}$. The tensile strain in the wire is:`,
      answer,
      distractors,
      explanation: tex`Strain $= \frac{\Delta L}{L} = \frac{${sci(extMm * 1e-3)}\,\mathrm{m}}{${num(length)}\,\mathrm{m}} = ${sci(strain)}$ (no unit, since it is a ratio of two lengths).`,
    };
  }),

  b.dynamic('youngs-modulus-from-data', { difficulty: 2, origin: 'past-paper', tags: ['elastic moduli'] }, (r) => {
    let force = 0;
    let length = 0;
    let area = 0;
    let extMm = 0;
    let k = 0;
    do {
      force = r.pick([100, 200, 250, 400, 500, 800, 1000]);
      length = r.pick([1, 2, 3, 4]);
      area = r.pick([1, 2, 4, 5]);
      extMm = r.pick([1, 2, 4, 5]);
      k = (force * length) / (area * extMm); // Y in units of 10^9 Pa
    } while (k < 10 || k > 250 || !exact3(k));
    const Y = k * 1e9;
    const { answer, distractors } = numericOptions(r, {
      correct: Y,
      wrong: [
        Y / 1e3, // extension left in mm
        Y / 1e6, // area left in mm^2
        Y / length, // forgot the original length
        ((force * extMm) / (area * length)) * 1e3, // swapped L and Delta L
      ],
      format: pa$,
    });
    return {
      stem: tex`A wire of length $${qty(length, U.m)}$ and cross-sectional area $${qty(area, 'mm^{2}')}$ stretches by $${qty(extMm, U.mm)}$ under a load of $${qty(force, U.N)}$. The Young's modulus of its material is:`,
      answer,
      distractors,
      explanation: tex`$Y = \frac{FL}{A\,\Delta L} = \frac{(${force})(${length})}{(${area} \times 10^{-6})(${extMm} \times 10^{-3})} = ${sci(Y)}\,\mathrm{Pa}$.`,
    };
  }),

  b.dynamic('extension-scaling', { difficulty: 2, origin: 'past-paper', tags: ['elastic moduli', 'stress and strain'] }, (r) => {
    const lengths = [frac(1, 2), frac(1), frac(2), frac(3), frac(4)];
    const diameters = [frac(1, 2), frac(2), frac(3)];
    const a = r.pick(lengths);
    const d = r.pick(diameters);
    const d2 = d.mul(d);
    const k = a.div(d2);
    const answer = extTex(k);
    const distractors = pickDistractors(
      answer,
      [a.div(d), a.mul(d2), d2.div(a), a.mul(d), a, frac(1).div(d2), frac(1)].map(extTex),
    );
    return {
      stem: tex`A wire stretches by $e$ under a certain load. A second wire of the same material, with ${timesText(a)} length and ${timesText(d)} diameter, carries the same load. Its extension is:`,
      answer,
      distractors,
      explanation: tex`$\Delta L = \frac{FL}{AY}$ with $A = \frac{\pi d^{2}}{4}$, so $\Delta L \propto \frac{L}{d^{2}}$. The factor is $\frac{${a.toTex()}}{(${d.toTex()})^{2}} = ${k.toTex()}$, so the extension is ${answer}. Young's modulus is unchanged because the material is the same.`,
    };
  }),

  b.dynamic('strain-energy-stored', { difficulty: 2, tags: ['stress and strain'] }, (r) => {
    const useCm = r.chance(0.5);
    const force = r.multiple(20, 400, 20);
    const ext = useCm ? r.int(1, 10) : r.multiple(2, 20, 2);
    const unit = useCm ? U.cm : U.mm;
    const extM = ext * (useCm ? 1e-2 : 1e-3);
    const W = 0.5 * force * extM;
    const { answer, distractors } = numericOptions(r, {
      correct: W,
      wrong: [
        2 * W, // forgot the 1/2
        0.5 * force * ext, // extension not converted
        useCm ? W / 10 : W * 10, // cm/mm slip
        W / 2,
      ],
      format: (x) => q$(x, U.J),
    });
    return {
      stem: tex`A wire obeying Hooke's law is stretched by $${qty(ext, unit)}$ when a load of $${qty(force, U.N)}$ is gradually applied. The elastic potential energy stored in the wire is:`,
      answer,
      distractors,
      explanation: tex`Energy stored $= \frac{1}{2}F\,\Delta L = \frac{1}{2}(${force})(${num(extM)}) = ${num(W)}\,\mathrm{J}$.`,
    };
  }),

  b.dynamic('bulk-modulus-volume-change', { difficulty: 2, tags: ['elastic moduli'] }, (r) => {
    let V = 0;
    let p = 0;
    let k = 0;
    let dV = 0;
    do {
      V = r.pick([500, 1000, 2000, 4000]);
      p = r.int(1, 9);
      k = r.pick([1, 1.6, 2, 2.5, 4, 5, 8]);
      dV = (V * p * 1e-3) / k;
    } while (p === k || dV < 0.1 || !exact3(dV)); // dV >= 0.1 keeps dV / 100 out of scientific notation
    const { answer, distractors } = numericOptions(r, {
      correct: dV,
      wrong: [
        dV * 10, // exponent slip
        dV / 10, // exponent slip
        dV / 100, // exponent slip
        dV * 100, // exponent slip (still smaller than V)
      ],
      format: (x) => q$(x, U.cm3),
    });
    return {
      stem: tex`A solid of volume $${qty(V, U.cm3)}$ has bulk modulus $${qty(`${k} \\times 10^{10}`, U.Pa)}$. When the pressure on it is increased by $${qty(`${p} \\times 10^{7}`, U.Pa)}$, its volume decreases by:`,
      answer,
      distractors,
      explanation: tex`$K = \frac{\Delta P}{\Delta V / V}$, so $\Delta V = \frac{V\,\Delta P}{K} = \frac{(${V})(${p} \times 10^{7})}{${k} \times 10^{10}} = ${num(dV)}\,\mathrm{cm^{3}}$.`,
    };
  }),

  b.dynamic('band-magnetism-statements', { difficulty: 2, tags: ['band theory', 'superconductors', 'magnetism of materials'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about solids is correct?',
      negativeStem: 'Which of the following statements about solids is NOT correct?',
      truths: TRUE_STATEMENTS.map(([s]) => s),
      falsehoods: FALSE_STATEMENTS.map(([s]) => s),
      explain: (ans, inverted) =>
        inverted
          ? `This statement is false. ${REASONS.get(ans) ?? ''} The other three statements are true.`
          : `${REASONS.get(ans) ?? ''} Each of the other statements is false.`,
    }),
  ),

  // -------------------------------------------------------------------------
  // Fixed conceptual items
  // -------------------------------------------------------------------------
  ...b.mcqs([
    {
      id: 'amorphous-solid-example', d: 1, o: 'past-paper', t: ['crystal types'],
      q: 'Which of the following is an amorphous solid?',
      a: 'Glass',
      x: ['Rock salt (NaCl)', 'Copper', 'Diamond'],
      e: 'Glass has no long-range regular arrangement of particles, so it is amorphous. Rock salt, copper and diamond are crystalline.',
    },
    {
      id: 'polymer-example', d: 1, t: ['crystal types'],
      q: 'Which of the following is a polymeric solid?',
      a: 'Polythene',
      x: ['Sodium chloride', 'Iron', 'Quartz crystal'],
      e: 'Polythene is made of long chain molecules built from repeated small units, so it is a polymer. The others are crystalline solids.',
    },
    {
      id: 'youngs-modulus-depends-on', d: 1, o: 'past-paper', t: ['elastic moduli'],
      q: "The Young's modulus of a wire depends on:",
      a: 'the material of the wire',
      x: ['the length of the wire', 'the cross-sectional area of the wire', 'the load hung from the wire'],
      e: tex`$Y = \frac{FL}{A\,\Delta L}$ is a property of the material. Changing the length, area or load changes the extension, but the ratio stress/strain stays the same.`,
    },
    {
      id: 'unit-of-youngs-modulus', d: 1, t: ['elastic moduli'],
      q: "The SI unit of Young's modulus is the same as that of:",
      a: 'pressure',
      x: ['force', 'surface tension', 'energy'],
      e: tex`Young's modulus is stress divided by strain. Strain has no unit, so $Y$ has the unit of stress: $\mathrm{N\,m^{-2}} = \mathrm{Pa}$, the unit of pressure. Surface tension is in $\mathrm{N\,m^{-1}}$.`,
    },
    {
      id: 'brittle-material', d: 1, t: ['stress and strain'],
      q: 'A material that breaks soon after its elastic limit is reached is called:',
      a: 'brittle',
      x: ['ductile', 'malleable', 'perfectly elastic'],
      e: 'Brittle materials such as glass and high-carbon steel show little or no plastic deformation and fracture just beyond the elastic limit. Ductile materials stretch a lot plastically before breaking.',
    },
    {
      id: 'hysteresis-loop-area', d: 1, o: 'past-paper', t: ['magnetism of materials'],
      q: 'The area enclosed by the hysteresis loop of a ferromagnetic material represents:',
      a: 'the energy lost per unit volume in one cycle',
      x: ['the retentivity of the material', 'the coercivity of the material', 'the saturation flux density'],
      e: 'The loop area equals the work done per unit volume in taking the material once through a magnetisation cycle; it appears as heat. Retentivity and coercivity are intercepts of the loop, not its area.',
    },
    {
      id: 'silicon-energy-gap', d: 1, o: 'past-paper', t: ['band theory'],
      q: 'The forbidden energy gap of silicon at room temperature is about:',
      a: tex`$1.1\,\mathrm{eV}$`,
      x: [tex`$0.7\,\mathrm{eV}$`, tex`$6\,\mathrm{eV}$`, tex`$0\,\mathrm{eV}$`],
      e: tex`Silicon is a semiconductor with a gap of about $1.1\,\mathrm{eV}$. About $0.7\,\mathrm{eV}$ is the gap of germanium, a gap of several eV marks an insulator, and conductors have no gap.`,
    },
    {
      id: 'superconductor-below-tc', d: 1, o: 'past-paper', t: ['superconductors'],
      q: 'When a superconductor is cooled below its critical temperature, its resistivity:',
      a: 'drops abruptly to zero',
      x: ['rises to a very large value', 'falls gradually but stays finite', 'remains unchanged'],
      e: 'At the critical temperature the resistivity of a superconductor falls suddenly to zero, so a current can flow in it without any loss.',
    },
    {
      id: 'soft-iron-transformer-core', d: 2, t: ['magnetism of materials'],
      q: 'Soft iron is preferred to steel for the core of a transformer mainly because soft iron has:',
      a: 'a narrow hysteresis loop, so little energy is lost per cycle',
      x: [
        'a high retentivity, so it stays strongly magnetised',
        'a high coercivity, so it resists demagnetisation',
        'a wide hysteresis loop, so it stores more energy',
      ],
      e: 'A transformer core is magnetised and demagnetised every cycle. Soft iron is easily magnetised and demagnetised (it has a low coercivity), so its narrow loop means only a small hysteresis loss per cycle. Staying magnetised or resisting demagnetisation would be drawbacks in such a core; steel, with its wide loop and high coercivity, suits permanent magnets.',
    },
    {
      id: 'above-curie-temperature', d: 2, t: ['magnetism of materials'],
      q: 'When a ferromagnetic material is heated above its Curie temperature, it becomes:',
      a: 'paramagnetic',
      x: ['diamagnetic', 'superconducting', 'more strongly ferromagnetic'],
      e: 'Above the Curie temperature, thermal agitation breaks up the alignment inside the domains, and the material behaves as a paramagnetic substance.',
    },
    {
      id: 'drawn-wire-same-volume', d: 3, o: 'past-paper', t: ['elastic moduli', 'stress and strain'],
      q: 'A wire is drawn out so that its length doubles while its volume stays the same. Under the same load, its extension becomes:',
      a: 'four times the original',
      x: ['twice the original', 'eight times the original', 'equal to the original'],
      e: tex`Constant volume: doubling $L$ halves $A$. Since $\Delta L = \frac{FL}{AY}$, the extension changes by $\frac{2}{1/2} = 4$. $Y$ is unchanged because the material is the same.`,
    },
  ]),
]);
