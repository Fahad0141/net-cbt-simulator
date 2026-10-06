import { defineBank } from '@/engine/authoring';
import { Fraction, frac, n$, num, numericOptions, pickDistractors, q$, qty, sci, tex, U } from '@/engine/helpers';

/*
 * Optical Instruments (FSc Part I Physics). Conventions follow the FSc textbook:
 * - near point (least distance of distinct vision) d = 25 cm;
 * - lens formula with real-is-positive signs: 1/f = 1/p + 1/q;
 * - simple microscope (final image at the near point): M = 1 + d/f;
 * - compound microscope: M = (q/p)(1 + d/f_e), approximately (L/f_o)(1 + d/f_e) with L the length of the microscope;
 * - astronomical telescope in normal adjustment: M = f_o/f_e, length L = f_o + f_e;
 * - Rayleigh criterion: alpha_min = 1.22 lambda / D, resolving power proportional to 1/alpha_min.
 */

/** Least distance of distinct vision, cm. */
const NEAR = 25;

/** A given value shown exactly (up to 6 significant figures) instead of rounded to 3. */
const v = (x: number): string => num(x, { sig: 6 });

/** True when `x` needs at most `sig` significant figures, so it is displayed exactly. */
const isExact = (x: number, sig = 3): boolean => Math.abs(Number(x.toPrecision(sig)) - x) <= 1e-9 * Math.abs(x);

/** `kR` for a rational factor k: 2R, R, \frac{R}{2}, \frac{3R}{2}. */
function timesR(k: Fraction): string {
  const top = k.n === 1 ? 'R' : `${k.n}R`;
  return k.d === 1 ? top : `\\frac{${top}}{${k.d}}`;
}

// ---------------------------------------------------------------------------
// Parameter tables (built once; every entry gives an exact, "nice" answer).
// ---------------------------------------------------------------------------

/** Eyepiece focal lengths (cm) giving a whole or half-integer 1 + d/f_e. */
const EYEPIECES = [2.5, 5, 6.25, 10, 12.5];

/**
 * Compound microscope: length L, objective f_o, eyepiece f_e (all cm) with L/f_o a whole number.
 * As in a real microscope, the objective is much more powerful than the eyepiece (f_e >= 2 f_o), and the
 * eyepiece is short compared with the tube (f_e <= L/2) so that the approximation q ~ L stays sensible.
 */
const COMPOUND_CASES = [12, 15, 16, 18, 20, 24, 25, 30].flatMap((L) =>
  [0.5, 1, 1.5, 2, 2.5, 3]
    .filter((fo) => Number.isInteger(L / fo) && L / fo >= 6 && L / fo <= 40)
    .flatMap((fo) => EYEPIECES.filter((fe) => fe >= 2 * fo && fe <= L / 2).map((fe) => ({ L, fo, fe }))),
);

/** Keeps only mistake values that differ clearly (by more than 10%) from the correct one. */
const clearlyWrong = (correct: number, values: readonly number[]): number[] =>
  values.filter((x) => Math.abs(x - correct) > 0.1 * Math.abs(correct));

/** Objective focal length and object distance (cm) for which q = p f/(p - f) is exact. */
const OBJECTIVE_CASES: ReadonlyArray<readonly [number, number]> = [
  [1, 1.1], [1, 1.2], [1, 1.25], [1, 1.05], [2, 2.2], [2, 2.4], [2, 2.5], [1.5, 1.8],
  [0.5, 0.6], [0.5, 0.55], [0.8, 1], [1.6, 2], [1.2, 1.5], [0.9, 1], [1.8, 2],
];

/** Astronomical telescope: f_o and f_e (cm) with a whole-number magnifying power from 5 to 80. */
const TELESCOPE_CASES = [50, 60, 75, 80, 90, 100, 120, 125, 150, 160, 180, 200].flatMap((fo) =>
  [2, 2.5, 4, 5, 6, 8, 10, 12.5, 15, 20, 25]
    .filter((fe) => Number.isInteger(fo / fe) && fo / fe >= 5 && fo / fe <= 80)
    .map((fe) => ({ fo, fe })),
);

const WAVELENGTHS_NM = [400, 450, 500, 550, 600, 650, 700];

/** Rayleigh limit 1.22 lambda / D for (wavelength nm, diameter in metres). */
const rayleigh = (nm: number, metres: number): number => (1.22 * nm * 1e-9) / metres;

/** Eye pupils (mm) and telescope objectives (cm) whose Rayleigh limit is exact to 3 significant figures. */
const EYE_CASES = WAVELENGTHS_NM.flatMap((l) => [2, 2.5, 3, 4, 5, 6].map((d) => ({ l, d }))).filter(({ l, d }) =>
  isExact(rayleigh(l, d * 1e-3)),
);
const SCOPE_CASES = WAVELENGTHS_NM.flatMap((l) => [5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50].map((d) => ({ l, d }))).filter(
  ({ l, d }) => isExact(rayleigh(l, d * 1e-2)),
);

/**
 * Two lamps seen by the eye: wavelength (nm), pupil (mm, multiples of 0.61 so the limit is round),
 * separation s (m) and the resulting greatest distance x (m), exact to 3 significant figures.
 */
const HEADLIGHT_CASES = WAVELENGTHS_NM.flatMap((l) =>
  [2.44, 3.05, 3.66, 4.27, 4.88, 5.49, 6.1, 6.71, 7.32].flatMap((d) =>
    [1.2, 1.4, 1.5, 1.6, 1.8, 2, 2.4, 3].map((s) => ({ l, d, s, x: s / rayleigh(l, d * 1e-3) })),
  ),
).filter(({ l, d, x }) => isExact(rayleigh(l, d * 1e-3), 2) && isExact(x) && x >= 3000 && x <= 30000);

/** Telescope looking at the Moon (distance 3.8e8 m): wavelength (nm) and objective diameter (m). */
const MOON_DISTANCE = 3.8e8;
const MOON_CASES = [400, 450, 500, 550, 600].flatMap((l) =>
  [0.61, 1.22, 1.83, 2.44, 3.05, 3.66, 4.88, 6.1]
    .map((d) => ({ l, d, s: MOON_DISTANCE * rayleigh(l, d) }))
    .filter(({ l, d, s }) => isExact(rayleigh(l, d), 2) && isExact(s)),
);

/** Core and cladding refractive indices (cladding = ratio x core, at most 3 decimals). */
const FIBRE_CASES = [1.48, 1.5, 1.52, 1.55, 1.6].flatMap((n1) =>
  [0.8, 0.85, 0.88, 0.9, 0.92, 0.94, 0.95, 0.96]
    .map((ratio) => ({ n1, ratio, n2: Number((n1 * ratio).toFixed(6)) }))
    .filter(({ n2 }) => Math.abs(n2 * 1000 - Math.round(n2 * 1000)) < 1e-6 && n2 >= 1.2),
);

/** How the resolving power changes: aperture factor `a`, wavelength factor `b` (R is proportional to a/b). */
interface Rescale {
  stem: string;
  a: Fraction;
  b: Fraction;
  microscope: boolean;
}

const telescopeRescale = (change: string, a: Fraction, b: Fraction): Rescale => ({
  stem: tex`The resolving power of a telescope is $R$. If ${change}, its resolving power becomes:`,
  a,
  b,
  microscope: false,
});

const RESCALES: readonly Rescale[] = [
  telescopeRescale('the diameter of its objective is doubled while the same light is used', frac(2), frac(1)),
  telescopeRescale('the diameter of its objective is doubled and light of half the wavelength is used', frac(2), frac(1, 2)),
  telescopeRescale('the diameter of its objective is halved while the same light is used', frac(1, 2), frac(1)),
  telescopeRescale('the same telescope is used with light of twice the wavelength', frac(1), frac(2)),
  telescopeRescale('the diameter of its objective is doubled and light of twice the wavelength is used', frac(2), frac(2)),
  telescopeRescale('the diameter of its objective is tripled while the same light is used', frac(3), frac(1)),
  telescopeRescale('the diameter of its objective is halved and light of twice the wavelength is used', frac(1, 2), frac(2)),
  telescopeRescale('the diameter of its objective is increased four-fold and light of twice the wavelength is used', frac(4), frac(2)),
  {
    stem: tex`A telescope has resolving power $R$ for light of wavelength $600\,\mathrm{nm}$. If light of wavelength $400\,\mathrm{nm}$ is used instead, its resolving power becomes:`,
    a: frac(1),
    b: frac(2, 3),
    microscope: false,
  },
  {
    stem: tex`A telescope has resolving power $R$ for light of wavelength $450\,\mathrm{nm}$. If light of wavelength $675\,\mathrm{nm}$ is used instead, its resolving power becomes:`,
    a: frac(1),
    b: frac(3, 2),
    microscope: false,
  },
  {
    stem: tex`A microscope has resolving power $R$ when light of wavelength $\lambda$ is used. With everything else unchanged, if light of wavelength $\frac{\lambda}{2}$ is used, its resolving power becomes:`,
    a: frac(1),
    b: frac(1, 2),
    microscope: true,
  },
  {
    stem: tex`A microscope has resolving power $R$ when light of wavelength $\lambda$ is used. With everything else unchanged, if light of wavelength $2\lambda$ is used, its resolving power becomes:`,
    a: frac(1),
    b: frac(2),
    microscope: true,
  },
  {
    stem: tex`A microscope has resolving power $R$ when light of wavelength $\lambda$ is used. With everything else unchanged, if light of wavelength $\frac{\lambda}{3}$ is used, its resolving power becomes:`,
    a: frac(1),
    b: frac(1, 3),
    microscope: true,
  },
  {
    stem: tex`A microscope has resolving power $R$ with light of wavelength $600\,\mathrm{nm}$. With everything else unchanged, if light of wavelength $400\,\mathrm{nm}$ is used, its resolving power becomes:`,
    a: frac(1),
    b: frac(2, 3),
    microscope: true,
  },
];

/** Facts about optical fibres as [true statement, its false counterpart]. */
const FIBRE_FACTS: ReadonlyArray<readonly [string, string]> = [
  [
    'The cladding has a lower refractive index than the core.',
    'The cladding has a higher refractive index than the core.',
  ],
  [
    'In a graded-index fibre, the refractive index of the core decreases gradually from the axis outwards.',
    'In a graded-index fibre, the refractive index of the core increases gradually from the axis outwards.',
  ],
  [
    'A single-mode step-index fibre has a much narrower core than a multimode fibre.',
    'A single-mode step-index fibre has a much wider core than a multimode fibre.',
  ],
  [
    'Total internal reflection at the core-cladding boundary needs an angle of incidence greater than the critical angle.',
    'Total internal reflection at the core-cladding boundary needs an angle of incidence smaller than the critical angle.',
  ],
  [
    'At the receiving end, a photodiode converts the light pulses back into electrical signals.',
    'At the transmitting end, a photodiode converts the electrical signals into light pulses.',
  ],
  [
    'Dispersion broadens light pulses as they travel along a multimode fibre.',
    'Dispersion makes light pulses narrower as they travel along a multimode fibre.',
  ],
  [
    'Light pulses lose some power by absorption and scattering as they travel along a fibre.',
    'Light pulses travel along a fibre of any length without losing any power.',
  ],
  [
    'Signals in an optical fibre are almost unaffected by external electrical interference.',
    'Signals in an optical fibre are easily distorted by nearby motors and power lines.',
  ],
  [
    'In a graded-index fibre, light follows curved paths because of continuous refraction.',
    'In a graded-index fibre, light travels in straight lines between sharp reflections at the cladding.',
  ],
];

export default defineBank('physics', 'optical-instruments', (b) => [
  // ---------------------------------------------------------------- magnification / microscopes
  b.dynamic('magnifier-near-point', { difficulty: 1, origin: 'past-paper', tags: ['magnification', 'microscopes'] }, (r) => {
    const f = r.pick([2.5, 4, 5, 6.25, 10, 12.5]);
    const inMm = f <= 5 && r.chance(0.35);
    const fText = inMm ? qty(f * 10, U.mm) : qty(f, U.cm);
    const m = 1 + NEAR / f;
    const stem = r.pick([
      tex`A convex lens of focal length $${fText}$ is used as a magnifying glass. If the final image is formed at the least distance of distinct vision ($25\,\mathrm{cm}$), its magnifying power is:`,
      tex`A watchmaker examines a tiny screw through a convex lens of focal length $${fText}$, with the final image at the near point ($25\,\mathrm{cm}$). The magnifying power of the lens is:`,
      tex`A simple microscope consists of a convex lens of focal length $${fText}$. With the final image at the least distance of distinct vision ($d = 25\,\mathrm{cm}$), its magnifying power is:`,
    ]);
    const { answer, distractors } = numericOptions(r, {
      correct: m,
      wrong: [
        ...(inMm ? [1 + NEAR / (f * 10)] : []), // put the millimetre value straight into the formula
        NEAR / f, // forgot the 1 (that is the relaxed-eye value)
        NEAR / f - 1, // sign slip
        1 + f / NEAR, // ratio upside down
      ],
      format: (x) => n$(x, { sig: 4 }),
    });
    const convert = inMm ? tex`Here $f = ${qty(f * 10, U.mm)} = ${qty(f, U.cm)}$. ` : '';
    return {
      stem,
      answer,
      distractors,
      explanation: tex`${convert}With the image at the near point, a simple microscope gives $M = 1 + \frac{d}{f} = 1 + \frac{25}{${v(f)}} = ${v(m)}$.`,
    };
  }),

  b.dynamic('compound-microscope-power', { difficulty: 2, origin: 'past-paper', tags: ['microscopes', 'magnification'] }, (r) => {
    const { L, fo, fe } = r.pick(COMPOUND_CASES);
    const mo = L / fo;
    const me = 1 + NEAR / fe;
    const m = mo * me;
    const { answer, distractors } = numericOptions(r, {
      correct: m,
      wrong: clearlyWrong(m, [
        mo * (NEAR / fe), // forgot the 1 in the eyepiece factor
        mo + me, // added the two magnifications
        (L / fe) * (1 + NEAR / fo), // swapped the focal lengths
        mo * (1 + fe / NEAR), // eyepiece ratio upside down
      ]),
      format: (x) => n$(x),
    });
    return {
      stem: tex`A compound microscope has an objective of focal length $${qty(fo, U.cm)}$ and an eyepiece of focal length $${qty(fe, U.cm)}$. The length of the microscope (distance between the two lenses) is $${qty(L, U.cm)}$. If the final image is formed at the least distance of distinct vision ($25\,\mathrm{cm}$), the magnifying power is:`,
      answer,
      distractors,
      explanation: tex`The object lies just beyond the focal point of the objective and its image is formed close to the eyepiece, so $p \approx f_o$ and $q \approx L$. Then $M = \frac{q}{p}\left(1 + \frac{d}{f_e}\right) \approx \frac{L}{f_o}\left(1 + \frac{d}{f_e}\right) = \frac{${L}}{${v(fo)}}\left(1 + \frac{25}{${v(fe)}}\right) = ${v(mo)} \times ${v(me)} = ${v(m)}$.`,
    };
  }),

  b.dynamic('compound-microscope-object-distance', { difficulty: 3, tags: ['microscopes', 'magnification'] }, (r) => {
    const [fo, p] = r.pick(OBJECTIVE_CASES);
    const fe = r.pick(EYEPIECES.filter((x) => x >= 2 * fo));
    // Exact arithmetic: q = p f / (p - f), m_o = q / p.
    const P = Fraction.of(p);
    const Fo = Fraction.of(fo);
    const qFrac = P.mul(Fo).div(P.sub(Fo));
    const q = qFrac.toNumber();
    const mo = qFrac.div(P).toNumber();
    const me = 1 + NEAR / fe;
    const m = mo * me;
    const { answer, distractors } = numericOptions(r, {
      correct: m,
      wrong: clearlyWrong(m, [
        mo * (NEAR / fe), // forgot the 1 for the eyepiece
        mo * (NEAR / fe - 1), // sign slip in the eyepiece formula
        mo + me, // added instead of multiplied
        (p / q) * me, // objective magnification upside down
      ]),
      format: (x) => n$(x),
    });
    return {
      stem: tex`In a compound microscope, an object is placed $${qty(p, U.cm, { sig: 6 })}$ from the objective, whose focal length is $${qty(fo, U.cm)}$. The eyepiece has a focal length of $${qty(fe, U.cm)}$ and the final image is formed at the least distance of distinct vision ($25\,\mathrm{cm}$). The magnifying power of the microscope is:`,
      answer,
      distractors,
      explanation: tex`Objective: $\frac{1}{q} = \frac{1}{f_o} - \frac{1}{p} = \frac{1}{${v(fo)}} - \frac{1}{${v(p)}}$, so $q = ${v(q)}\,\mathrm{cm}$ and $m_o = \frac{q}{p} = \frac{${v(q)}}{${v(p)}} = ${v(mo)}$. Eyepiece: $m_e = 1 + \frac{d}{f_e} = 1 + \frac{25}{${v(fe)}} = ${v(me)}$. Hence $M = m_o m_e = ${v(mo)} \times ${v(me)} = ${v(m)}$.`,
    };
  }),

  // ---------------------------------------------------------------- telescopes
  b.dynamic('telescope-power-length', { difficulty: 1, origin: 'past-paper', tags: ['telescopes', 'magnification'] }, (r) => {
    const { fo, fe } = r.pick(TELESCOPE_CASES);
    const mag = fo / fe;
    if (r.chance(0.55)) {
      const inMetres = fo >= 100 && r.chance(0.5);
      const foText = inMetres ? qty(fo / 100, U.m, { sig: 6 }) : qty(fo, U.cm);
      const answer = `$${mag}$`;
      const inverted = tex`$\frac{1}{${mag}}$`; // f_e / f_o
      const distractors = pickDistractors(
        answer,
        inMetres
          ? // metres divided by centimetres (skipped when M = 10, where it equals 1/M); inverted; magnifier formula; length
            [...(mag === 10 ? [] : [n$(mag / 100)]), inverted, `$${mag + 1}$`, n$(fo + fe, { sig: 6 })]
          : [inverted, `$${mag + 1}$`, n$(fo + fe, { sig: 6 })], // inverted; magnifier formula; confused with the length
      );
      const convert = inMetres ? tex`$f_o = ${foText} = ${qty(fo, U.cm)}$, so ` : '';
      return {
        stem: tex`An astronomical telescope has an objective of focal length $${foText}$ and an eyepiece of focal length $${qty(fe, U.cm)}$. Its magnifying power in normal adjustment is:`,
        answer,
        distractors,
        explanation: tex`${convert}$M = \frac{f_o}{f_e} = \frac{${fo}}{${v(fe)}} = ${mag}$ (both focal lengths in the same unit).`,
      };
    }
    const length = fo + fe;
    const { answer, distractors } = numericOptions(r, {
      correct: length,
      wrong: [fo - fe, fo, mag], // Galilean-telescope length; objective focal length only; ratio taken as a length
      format: (x) => q$(x, U.cm, { sig: 4 }),
    });
    return {
      stem: tex`An astronomical telescope has an objective of focal length $${qty(fo, U.cm)}$ and an eyepiece of focal length $${qty(fe, U.cm)}$. In normal adjustment, the distance between the objective and the eyepiece is:`,
      answer,
      distractors,
      explanation: tex`In normal adjustment the image formed by the objective lies at the focal point of both lenses, so $L = f_o + f_e = ${fo} + ${v(fe)} = ${v(length)}\,\mathrm{cm}$.`,
    };
  }),

  // ---------------------------------------------------------------- resolving power
  b.dynamic('rayleigh-limit-angle', { difficulty: 2, tags: ['resolving power'] }, (r) => {
    const eye = r.chance(0.45);
    const { l, d } = r.pick(eye ? EYE_CASES : SCOPE_CASES);
    const lam = l * 1e-9;
    const dm = eye ? d * 1e-3 : d * 1e-2;
    const alpha = (1.22 * lam) / dm;
    const { answer, distractors } = numericOptions(r, {
      correct: alpha,
      wrong: [
        lam / dm, // forgot 1.22
        2 * alpha, // used the radius instead of the diameter
        eye ? alpha / 10 : alpha * 10, // diameter taken in the wrong unit (cm/mm)
      ],
      format: (x) => q$(x, U.rad),
    });
    const stem = eye
      ? tex`The pupil of an eye has a diameter of $${qty(d, U.mm)}$. Considering diffraction at the pupil only, the minimum angular separation of two point objects that the eye can just resolve in light of wavelength $${qty(l, U.nm)}$ is:`
      : tex`The objective of a telescope has a diameter of $${qty(d, U.cm)}$. For light of wavelength $${qty(l, U.nm)}$, its limiting angle of resolution is:`;
    return {
      stem,
      answer,
      distractors,
      explanation: tex`By Rayleigh's criterion, $\alpha_{\min} = \frac{1.22\lambda}{D} = \frac{1.22 \times ${sci(lam)}\,\mathrm{m}}{${dm < 0.01 ? sci(dm) : num(dm)}\,\mathrm{m}} = ${sci(alpha)}\,\mathrm{rad}$.`,
    };
  }),

  b.dynamic('resolving-power-scaling', { difficulty: 2, origin: 'past-paper', tags: ['resolving power'] }, (r) => {
    const c = r.pick(RESCALES);
    const k = c.a.div(c.b);
    const answer = `$${timesR(k)}$`;
    const pool = [frac(2), frac(1, 2), frac(4), frac(1, 4), frac(1), frac(3), frac(1, 3), frac(3, 2), frac(2, 3)];
    const distractors = pickDistractors(
      answer,
      [
        c.b.div(c.a), // took R proportional to lambda / D
        c.a, // ignored the change of wavelength
        c.b.inv(), // ignored the change of aperture
        k.pow(2), // squared the ratio
        ...r.shuffle(pool),
      ].map((x) => `$${timesR(x)}$`),
    );
    const explanation = c.microscope
      ? tex`The resolving power of a microscope is inversely proportional to the wavelength used, $R \propto \frac{1}{\lambda}$. Hence $R' = R \times \frac{\lambda}{\lambda'} = R \times ${c.b.inv().toTex()} = ${timesR(k)}$.`
      : tex`Resolving power is the reciprocal of $\alpha_{\min} = \frac{1.22\lambda}{D}$, so $R \propto \frac{D}{\lambda}$. Hence $R' = R \times \frac{D'/D}{\lambda'/\lambda} = R \times \frac{${c.a.toTex()}}{${c.b.toTex()}} = ${timesR(k)}$.`;
    return { stem: c.stem, answer, distractors, explanation };
  }),

  b.dynamic('resolution-distance', { difficulty: 3, tags: ['resolving power'] }, (r) => {
    if (r.chance(0.55)) {
      const { l, d, s, x } = r.pick(HEADLIGHT_CASES);
      const alpha = rayleigh(l, d * 1e-3);
      const km = x / 1000;
      // A car's headlights are less than about 2 m apart; wider separations use the other settings.
      const sources = r.pick([
        ...(s <= 1.8 ? ['The two headlights of a car'] : []),
        'Two lamps on a distant tower',
        'Two bright lamps on a ship',
      ]);
      const { answer, distractors } = numericOptions(r, {
        correct: km,
        wrong: [
          1.22 * km, // forgot 1.22
          km / 2, // used the radius of the pupil
          10 * km, // took the pupil diameter in cm instead of mm
        ],
        format: (y) => q$(y, U.km),
      });
      return {
        stem: tex`${sources} are $${qty(s, U.m)}$ apart. An observer's pupil has a diameter of $${qty(d, U.mm)}$ and the light has a wavelength of $${qty(l, U.nm)}$. Considering diffraction only, the greatest distance at which the observer can still see the two lamps as separate is:`,
        answer,
        distractors,
        explanation: tex`$\alpha_{\min} = \frac{1.22\lambda}{D} = \frac{1.22 \times ${sci(l * 1e-9)}}{${sci(d * 1e-3)}} = ${sci(alpha)}\,\mathrm{rad}$. The lamps are resolved while $\frac{s}{x} \ge \alpha_{\min}$, so $x_{\max} = \frac{s}{\alpha_{\min}} = \frac{${v(s)}}{${sci(alpha)}} = ${v(x)}\,\mathrm{m} = ${v(km)}\,\mathrm{km}$.`,
      };
    }
    const { l, d, s } = r.pick(MOON_CASES);
    const alpha = rayleigh(l, d);
    const { answer, distractors } = numericOptions(r, {
      correct: s,
      wrong: [
        s / 1.22, // forgot 1.22
        2 * s, // used the radius of the objective
        s / 2, // used 0.61 instead of 1.22
      ],
      format: (y) => q$(y, U.m),
    });
    return {
      stem: tex`A telescope whose objective has a diameter of $${qty(d, U.m)}$ is used with light of wavelength $${qty(l, U.nm)}$. Taking the distance of the Moon as $${qty(MOON_DISTANCE, U.m)}$, the smallest separation between two points on the Moon's surface that it can resolve is:`,
      answer,
      distractors,
      explanation: tex`$\alpha_{\min} = \frac{1.22\lambda}{D} = \frac{1.22 \times ${sci(l * 1e-9)}}{${v(d)}} = ${sci(alpha)}\,\mathrm{rad}$. The smallest resolvable separation is $s = x\,\alpha_{\min} = (${sci(MOON_DISTANCE)})(${sci(alpha)}) = ${v(s)}\,\mathrm{m}$.`,
    };
  }),

  // ---------------------------------------------------------------- optical fibres
  b.dynamic('fibre-critical-angle', { difficulty: 1, tags: ['optical fibres'] }, (r) => {
    const { n1, n2, ratio } = r.pick(FIBRE_CASES);
    const ratioTex = (top: number, bottom: number) => `\\left(\\frac{${v(top)}}{${v(bottom)}}\\right)`;
    const answer = `$\\sin^{-1}${ratioTex(n2, n1)}$`;
    const distractors = pickDistractors(
      answer,
      [
        `$\\sin^{-1}${ratioTex(1, n1)}$`, // core-air boundary
        `$\\cos^{-1}${ratioTex(n2, n1)}$`, // cosine instead of sine
        `$\\tan^{-1}${ratioTex(n2, n1)}$`, // Brewster-angle relation
        `$\\sin^{-1}${ratioTex(n1, n2)}$`, // ratio upside down
      ],
      r,
    );
    const degrees = (Math.asin(ratio) * 180) / Math.PI;
    return {
      stem: tex`An optical fibre has a core of refractive index $${v(n1)}$ and a cladding of refractive index $${v(n2)}$. The critical angle at the core-cladding boundary is:`,
      answer,
      distractors,
      explanation: tex`At the critical angle the refracted ray grazes the boundary: $n_1 \sin\theta_c = n_2 \sin 90^{\circ}$, so $\sin\theta_c = \frac{n_2}{n_1} = \frac{${v(n2)}}{${v(n1)}} = ${v(ratio)}$ and $\theta_c = \sin^{-1}(${v(ratio)}) \approx ${num(degrees, { dp: 1 })}^{\circ}$. Rays meeting the boundary at more than this angle are totally reflected and stay in the core.`,
    };
  }),

  b.dynamic('fibre-statements', { difficulty: 2, tags: ['optical fibres'] }, (r) => {
    // Four different facts, so no option simply contradicts another.
    const [first, ...others] = r.sample(FIBRE_FACTS, 4);
    if (r.chance(0.35)) {
      return {
        stem: 'Which of the following statements about optical fibres is **incorrect**?',
        answer: first[1],
        distractors: others.map((f) => f[0]),
        explanation: `The incorrect statement is "${first[1]}" In fact: ${first[0]} The other three statements are true.`,
      };
    }
    return {
      stem: 'Which of the following statements about optical fibres is correct?',
      answer: first[0],
      distractors: others.map((f) => f[1]),
      explanation: `"${first[0]}" is correct. The other statements are false; in fact: ${others.map((f) => f[0]).join(' ')}`,
    };
  }),

  ...b.mcqs([
    {
      id: 'magnifier-object-position',
      d: 1,
      t: ['magnification', 'microscopes'],
      q: 'A convex lens can be used as a magnifying glass (simple microscope) when the object is placed:',
      a: 'between the optical centre and the principal focus',
      x: ['at 2F', 'between F and 2F', 'beyond 2F'],
      e: 'Only an object within the focal length gives a virtual, erect and magnified image on the same side of the lens, which is what a magnifying glass shows. Beyond F the image is real and inverted (at 2F it is the same size; between F and 2F it is enlarged but inverted).',
    },
    {
      id: 'telescope-final-image',
      d: 1,
      t: ['telescopes'],
      q: 'In normal adjustment, the final image formed by an astronomical telescope is:',
      a: 'virtual, inverted and at infinity',
      x: ['real, inverted and at infinity', 'virtual, erect and at the near point', 'real, erect and at the focus of the eyepiece'],
      e: 'The objective forms a real, inverted image of the distant object at its focal point, which coincides with the focal point of the eyepiece. The eyepiece then forms a virtual image of it at infinity, so the final image is virtual and inverted with respect to the object.',
    },
    {
      id: 'telescope-lenses-interchanged',
      d: 2,
      t: ['telescopes', 'magnification'],
      q: tex`An astronomical telescope has magnifying power $M$ in normal adjustment. If its objective and eyepiece are interchanged (their separation unchanged), the magnifying power becomes:`,
      a: tex`$\frac{1}{M}$`,
      x: [tex`$M$`, tex`$M^{2}$`, tex`$\frac{1}{M^{2}}$`],
      e: tex`Normally $M = \frac{f_o}{f_e}$. After the interchange, the lens of focal length $f_e$ is the objective and the lens of focal length $f_o$ is the eyepiece; the separation $f_o + f_e$ still gives normal adjustment, so $M' = \frac{f_e}{f_o} = \frac{1}{M}$ and distant objects look smaller.`,
    },
    {
      id: 'telescope-large-aperture',
      d: 2,
      o: 'past-paper',
      t: ['telescopes', 'resolving power'],
      q: 'The objective of an astronomical telescope is given a large aperture mainly to:',
      a: 'increase its resolving power and light-gathering ability',
      x: ['increase its magnifying power', 'reduce the length of the telescope', 'make the final image erect'],
      e: tex`The limiting angle $\alpha_{\min} = \frac{1.22\lambda}{D}$ decreases as $D$ increases, so the resolving power rises, and a wider objective collects more light, giving a brighter image. The magnifying power $M = \frac{f_o}{f_e}$ does not depend on the aperture.`,
    },
    {
      id: 'telescope-increase-power',
      d: 1,
      t: ['telescopes', 'magnification'],
      q: 'The magnifying power of an astronomical telescope in normal adjustment can be increased by using:',
      a: 'an objective of long focal length and an eyepiece of short focal length',
      x: [
        'an objective of short focal length and an eyepiece of long focal length',
        'an objective and an eyepiece of equal focal lengths',
        'an objective of larger diameter, keeping both focal lengths the same',
      ],
      e: tex`In normal adjustment $M = \frac{f_o}{f_e}$, so $M$ is large when $f_o$ is long and $f_e$ is short. Equal focal lengths give $M = 1$, and a wider objective improves the resolving power and brightness but leaves $M$ unchanged.`,
    },
    {
      id: 'compound-objective-image',
      d: 1,
      t: ['microscopes'],
      q: 'In a compound microscope, the image formed by the objective is:',
      a: 'real, inverted and magnified',
      x: ['virtual, erect and magnified', 'real, erect and diminished', 'virtual, inverted and diminished'],
      e: 'The object is placed just beyond the focal point of the objective, so the objective forms a real, inverted and magnified image. This image lies within the focal length of the eyepiece, which acts as a magnifying glass and forms the final virtual, magnified image.',
    },
    {
      id: 'rayleigh-criterion',
      d: 1,
      t: ['resolving power'],
      q: "According to Rayleigh's criterion, the images of two point sources are just resolved when:",
      a: 'the central maximum of one pattern falls on the first minimum of the other',
      x: [
        'the central maxima of the two patterns coincide',
        'the central maximum of one pattern falls on the second minimum of the other',
        'the two diffraction patterns do not overlap at all',
      ],
      e: tex`Rayleigh's criterion: two sources are just resolved when the central maximum of one diffraction pattern lies on the first minimum of the other; the angular separation is then $\alpha_{\min} = \frac{1.22\lambda}{D}$. Coinciding maxima cannot be separated, while larger separations are more than just resolved.`,
    },
    {
      id: 'fibre-guiding-principle',
      d: 1,
      o: 'past-paper',
      t: ['optical fibres'],
      q: 'A step-index optical fibre guides light along its core by:',
      a: 'total internal reflection',
      x: ['diffraction', 'polarization', 'dispersion'],
      e: 'Light inside the optically denser core meets the core-cladding boundary at more than the critical angle, so it is totally internally reflected again and again and stays in the core. Dispersion is a cause of signal distortion, not the guiding mechanism.',
    },
    {
      id: 'graded-index-pulse-spreading',
      d: 3,
      t: ['optical fibres'],
      q: 'A multimode graded-index fibre causes much less spreading of light pulses than a multimode step-index fibre because:',
      a: 'rays on longer paths away from the axis travel faster in the lower-index region',
      x: [
        'its cladding has a higher refractive index than its core',
        'every ray travels exactly along the axis of the fibre',
        'its core absorbs much less of the light passing through it',
      ],
      e: tex`In a graded-index core the refractive index falls from the axis outwards. Rays that swing away from the axis follow longer curved paths, but there $v = \frac{c}{n}$ is larger, so they arrive almost together with the axial rays and a pulse broadens far less. The cladding always has the lower index, many rays travel off the axis in a multimode fibre, and absorption reduces power rather than spreading pulses.`,
    },
  ]),
]);
