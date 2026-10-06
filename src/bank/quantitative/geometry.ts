import { defineBank } from '@/engine/authoring';
import {
  coefTex,
  type Fraction,
  frac,
  num,
  numericOptions,
  paren,
  pickDistractors,
  q$,
  signedSum,
  surdTex,
  tex,
  U,
} from '@/engine/helpers';

/** Wraps LaTeX in `$...$`. */
const m = (latex: string): string => `$${latex}$`;
/** Square and cubic centimetre units for `q$`. */
const CM2 = 'cm^{2}';
const CM3 = U.cm3;
/** `ax + p` with clean signs. */
const lin = (a: number, p: number): string => signedSum([[a, 'x'], [p, '']]);
/** A coordinate pair. */
const pt = (x: number, y: number): string => `(${x}, ${y})`;
/** A multiple of pi with a unit: `\frac{7}{3}\pi\,\mathrm{cm}`. */
const piQty = (coef: Fraction, unit: string): string => m(`${coefTex(coef, '\\pi')}\\,\\mathrm{${unit}}`);
/** A surd length with a unit: `4\sqrt{3}\,\mathrm{m}`. */
const surdQty = (c: number, radicand: number, unit = 'm'): string =>
  m(`${surdTex(c, radicand)}\\,\\mathrm{${unit}}`);

const POLYGON_NAMES: Record<number, string> = {
  5: 'pentagon',
  6: 'hexagon',
  8: 'octagon',
  9: 'nonagon',
  10: 'decagon',
  12: 'dodecagon',
};

const RATIO_TRIPLES: ReadonlyArray<readonly [number, number, number]> = [
  [1, 2, 3], [2, 3, 4], [1, 2, 6], [3, 4, 5], [2, 3, 5], [1, 3, 5], [4, 5, 6], [2, 5, 8],
  [1, 4, 7], [3, 5, 7], [5, 6, 7], [2, 7, 9], [1, 2, 2], [3, 4, 8], [5, 6, 9], [4, 7, 9],
  [2, 3, 7], [1, 5, 6], [3, 7, 8], [2, 3, 10],
];

/** Pythagorean triples (a < b < c). */
const TRIPLES: ReadonlyArray<readonly [number, number, number]> = [
  [3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [20, 21, 29], [12, 16, 20],
];

/** Triangles with integer sides and integer area (Heron-friendly): [a, b, c, area]. */
const HERON: ReadonlyArray<readonly [number, number, number, number]> = [
  [13, 14, 15, 84], [5, 5, 6, 12], [5, 5, 8, 12], [10, 13, 13, 60], [9, 10, 17, 36], [13, 20, 21, 126],
  [11, 13, 20, 66], [7, 15, 20, 42], [10, 17, 21, 84], [13, 13, 24, 60], [17, 25, 28, 210],
  [14, 25, 25, 168], [15, 15, 24, 108], [9, 12, 15, 54], [8, 15, 17, 60],
];

export default defineBank('quantitative', 'geometry', (b) => [
  // ---------------------------------------------------------------- angles and lines
  b.dynamic('supplement-complement', { difficulty: 1, tags: ['angles and lines'] }, (r) => {
    const supp = r.chance(0.5);
    const total = supp ? 180 : 90;
    const word = supp ? 'supplementary' : 'complementary';
    if (r.chance(0.5)) {
      const x = supp ? r.intExcept(15, 165, [90]) : r.intExcept(10, 80, [45]);
      const correct = total - x;
      const { answer, distractors } = numericOptions(r, {
        correct,
        wrong: supp ? [90 - x, 360 - x, 90 + x] : [180 - x, 360 - x, 90 + x],
        format: (v) => q$(v, U.deg),
      });
      return {
        stem: tex`The ${supp ? 'supplement' : 'complement'} of an angle of $${x}^{\circ}$ is:`,
        answer,
        distractors,
        explanation: tex`${supp ? 'Supplementary' : 'Complementary'} angles add up to $${total}^{\circ}$, so the required angle is $${total}^{\circ} - ${x}^{\circ} = ${correct}^{\circ}$.`,
      };
    }
    const d = r.multiple(10, supp ? 100 : 60, 2);
    const large = (total + d) / 2;
    const small = (total - d) / 2;
    const { answer, distractors } = numericOptions(r, {
      correct: large,
      wrong: [small, total - d, total / 2 + d],
      format: (v) => q$(v, U.deg),
    });
    return {
      stem: tex`Two ${word} angles differ by $${d}^{\circ}$. The larger angle measures:`,
      answer,
      distractors,
      explanation: tex`Let the angles be $x$ and $x - ${d}$. Then $2x - ${d} = ${total}$, so $x = \frac{${total} + ${d}}{2} = ${large}^{\circ}$ (the smaller one is $${small}^{\circ}$).`,
    };
  }),

  b.dynamic('polygon-interior-angle', { difficulty: 1, origin: 'past-paper', tags: ['angles and lines'] }, (r) => {
    const n = r.pick([5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36]);
    const name = POLYGON_NAMES[n];
    const shape = name ? `regular ${name}` : `regular polygon with ${n} sides`;
    const sum = 180 * (n - 2);
    if (r.chance(0.5)) {
      const correct = sum / n;
      const { answer, distractors } = numericOptions(r, {
        correct,
        wrong: [360 / n, sum, (180 * (n - 1)) / n],
        format: (v) => q$(v, U.deg),
      });
      return {
        stem: tex`Each interior angle of a ${shape} measures:`,
        answer,
        distractors,
        explanation: tex`Each interior angle $= \frac{(n-2)\times 180^{\circ}}{n} = \frac{(${n}-2)(180^{\circ})}{${n}} = ${num(correct)}^{\circ}$. (Equivalently, $180^{\circ}$ minus the exterior angle $\frac{360^{\circ}}{${n}} = ${num(360 / n)}^{\circ}$.)`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: sum,
      wrong: [180 * n, 180 * (n - 1), 90 * (n - 2)],
      format: (v) => q$(v, U.deg),
    });
    return {
      stem: tex`The sum of the interior angles of a ${shape} is:`,
      answer,
      distractors,
      explanation: tex`Sum of interior angles $= (n-2)\times 180^{\circ} = (${n}-2)(180^{\circ}) = ${sum}^{\circ}$.`,
    };
  }),

  b.dynamic('polygon-sides', { difficulty: 2, tags: ['angles and lines'] }, (r) => {
    if (r.chance(0.5)) {
      const k = r.pick([2, 3, 4, 5, 8, 9, 11, 14, 17]);
      const correct = 2 * (k + 1);
      const ext = 180 / (k + 1);
      const { answer, distractors } = numericOptions(r, {
        correct,
        wrong: [k + 1, 2 * k, 2 * k + 3],
        format: (v) => m(num(v)),
      });
      return {
        stem: tex`Each interior angle of a regular polygon is ${k} times each of its exterior angles. The number of sides of the polygon is:`,
        answer,
        distractors,
        explanation: tex`Interior + exterior $= 180^{\circ}$, so $${k}e + e = 180^{\circ}$ and $e = \frac{180^{\circ}}{${k + 1}} = ${num(ext)}^{\circ}$. Number of sides $= \frac{360^{\circ}}{e} = \frac{360}{${num(ext)}} = ${correct}$.`,
      };
    }
    const n = r.pick([8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45]);
    const interior = 180 - 360 / n;
    const { answer, distractors } = numericOptions(r, {
      correct: n,
      wrong: [n + 2, n - 2, 2 * n],
      format: (v) => m(num(v)),
    });
    return {
      stem: tex`Each interior angle of a regular polygon is $${interior}^{\circ}$. How many sides does it have?`,
      answer,
      distractors,
      explanation: tex`Each exterior angle $= 180^{\circ} - ${interior}^{\circ} = ${360 / n}^{\circ}$. Number of sides $= \frac{360^{\circ}}{${360 / n}^{\circ}} = ${n}$.`,
    };
  }),

  b.dynamic('parallel-transversal', { difficulty: 2, tags: ['angles and lines'] }, (r) => {
    const alt = r.chance(0.5);
    const [a, c] = r.sample([2, 3, 4, 5, 6], 2) as [number, number];
    const x = r.int(8, 25);
    const A = r.int(35, 145);
    const B = alt ? A : 180 - A;
    const p = A - a * x;
    const q = B - c * x;
    const other = alt ? (180 - p - q) / (a + c) : (q - p) / (a - c);
    const { answer, distractors } = numericOptions(r, {
      correct: x,
      wrong: [...(Number.isInteger(other) && other > 0 ? [other] : []), A, B === A ? x + 10 : B],
      format: (v) => m(num(v)),
    });
    const kind = alt ? 'alternate interior angles' : 'co-interior angles (interior angles on the same side of the transversal)';
    // Collect x on the side with the larger coefficient so the working never shows `-1x`.
    const diff = Math.abs(a - c);
    const rhs = a > c ? q - p : p - q;
    const work = alt
      ? tex`Alternate interior angles are equal: $${lin(a, p)} = ${lin(c, q)}$, so ${diff === 1 ? '' : tex`$${diff}x = ${rhs}$ and `}$x = ${x}$.`
      : tex`Co-interior angles are supplementary: $(${lin(a, p)}) + (${lin(c, q)}) = 180$, so $${a + c}x = ${180 - p - q}$ and $x = ${x}$.`;
    return {
      stem: tex`Two parallel lines are cut by a transversal. Two of the angles formed are ${kind} measuring $(${lin(a, p)})^{\circ}$ and $(${lin(c, q)})^{\circ}$. The value of $x$ is:`,
      answer,
      distractors,
      explanation: tex`${work} (The angles are $${A}^{\circ}$ and $${B}^{\circ}$.)`,
    };
  }),

  // ---------------------------------------------------------------- triangles
  b.dynamic('triangle-angle-ratio', { difficulty: 1, origin: 'past-paper', tags: ['triangles'] }, (r) => {
    const [p, q, s] = r.pick(RATIO_TRIPLES);
    const k = 180 / (p + q + s);
    const largest = r.chance(0.5);
    const correct = (largest ? s : p) * k;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [q * k, (largest ? p : s) * k, k, 180 - correct],
      format: (v) => q$(v, U.deg),
    });
    return {
      stem: tex`The angles of a triangle are in the ratio $${p} : ${q} : ${s}$. The ${largest ? 'largest' : 'smallest'} angle is:`,
      answer,
      distractors,
      explanation: tex`Let the angles be $${coefTex(p, 'k')}, ${coefTex(q, 'k')}, ${coefTex(s, 'k')}$. Then $${p + q + s}k = 180^{\circ}$, so $k = ${k}^{\circ}$ and the ${largest ? 'largest' : 'smallest'} angle is $${(largest ? s : p) === 1 ? 'k' : tex`${largest ? s : p}k = ${largest ? s : p} \times ${k}^{\circ}`} = ${correct}^{\circ}$.`,
    };
  }),

  b.dynamic('ladder-pythagoras', { difficulty: 1, origin: 'past-paper', tags: ['triangles'] }, (r) => {
    // Ladders of at most 20 m keep the setting realistic.
    const base = r.pick(TRIPLES.filter((t) => t[2] <= 20));
    const s = base[2] <= 5 ? r.int(1, 4) : base[2] <= 10 ? r.int(1, 2) : 1;
    const [foot, height, ladder] = base.map((v) => v * s) as [number, number, number];
    const askHeight = r.chance(0.6);
    const known = askHeight ? foot : height;
    const correct = askHeight ? height : foot;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [ladder - known, ladder * ladder - known * known],
      format: (v) => q$(v, U.m),
    });
    const stem = askHeight
      ? tex`A ladder $${ladder}\,\mathrm{m}$ long leans against a vertical wall with its foot $${foot}\,\mathrm{m}$ from the wall. How high up the wall does the ladder reach?`
      : tex`A ladder $${ladder}\,\mathrm{m}$ long leans against a vertical wall and reaches a point $${height}\,\mathrm{m}$ above the ground. How far is the foot of the ladder from the wall?`;
    return {
      stem,
      answer,
      distractors,
      explanation: tex`By Pythagoras, required length $= \sqrt{${ladder}^2 - ${known}^2} = \sqrt{${ladder * ladder} - ${known * known}} = \sqrt{${correct * correct}} = ${correct}\,\mathrm{m}$.`,
    };
  }),

  b.dynamic('heron-area', { difficulty: 2, tags: ['triangles', 'areas and volumes'] }, (r) => {
    const [a0, b0, c0, area0] = r.pick(HERON);
    // Scale only small triangles so s(s-a)(s-b)(s-c) stays workable by hand.
    const perimeter0 = a0 + b0 + c0;
    const k = perimeter0 <= 18 ? r.pick([1, 2, 3]) : perimeter0 <= 50 ? r.pick([1, 1, 2]) : 1;
    const [a, c, d] = [a0 * k, b0 * k, c0 * k];
    const area = area0 * k * k;
    const s = (a + c + d) / 2;
    const { answer, distractors } = numericOptions(r, {
      correct: area,
      wrong: [(a * c) / 2, 2 * area, s * s, (a * d) / 2],
      format: (v) => q$(v, CM2),
    });
    return {
      stem: tex`The sides of a triangle are $${a}\,\mathrm{cm}$, $${c}\,\mathrm{cm}$ and $${d}\,\mathrm{cm}$. Its area is:`,
      answer,
      distractors,
      explanation: tex`Heron's formula: $s = \frac{${a} + ${c} + ${d}}{2} = ${s}$, so $A = \sqrt{s(s-a)(s-b)(s-c)} = \sqrt{${s}(${s - a})(${s - c})(${s - d})} = \sqrt{${area * area}} = ${area}\,\mathrm{cm^{2}}$.`,
    };
  }),

  b.dynamic('equilateral-area', { difficulty: 2, tags: ['triangles', 'areas and volumes'] }, (r) => {
    const k = r.int(2, 9);
    const side = 2 * k;
    const fromPerimeter = r.chance(0.4);
    const correct = surdQty(k * k, 3, 'cm^{2}');
    const distractors = pickDistractors(correct, [
      surdQty(2 * k * k, 3, 'cm^{2}'), // used sqrt3/2 instead of sqrt3/4
      surdQty(k, 3, 'cm^{2}'), // confused with the height
      q$(2 * k * k, CM2), // half of side squared, no sqrt3
      surdQty(4 * k * k, 3, 'cm^{2}'),
    ]);
    const given = fromPerimeter
      ? tex`The perimeter of an equilateral triangle is $${3 * side}\,\mathrm{cm}$.`
      : tex`Each side of an equilateral triangle is $${side}\,\mathrm{cm}$.`;
    return {
      stem: tex`${given} Its area is:`,
      answer: correct,
      distractors,
      explanation: tex`${fromPerimeter ? tex`Side $= \frac{${3 * side}}{3} = ${side}\,\mathrm{cm}$. ` : ''}Area $= \frac{\sqrt{3}}{4}a^2 = \frac{\sqrt{3}}{4}(${side})^2 = ${surdTex(k * k, 3)}\,\mathrm{cm^{2}}$.`,
    };
  }),

  // ---------------------------------------------------------------- circles
  b.dynamic('circle-circumference-area', { difficulty: 1, origin: 'past-paper', tags: ['circles'] }, (r) => {
    const k = r.int(1, 6);
    const radius = 7 * k;
    const C = 44 * k;
    const A = 154 * k * k;
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: A,
        wrong: [4 * A, 2 * A, A / 2],
        format: (v) => q$(v, CM2),
      });
      return {
        stem: tex`The circumference of a circle is $${C}\,\mathrm{cm}$. Taking $\pi = \frac{22}{7}$, its area is:`,
        answer,
        distractors,
        explanation: tex`$2\pi r = ${C} \Rightarrow r = \frac{${C} \times 7}{2 \times 22} = ${radius}\,\mathrm{cm}$. Area $= \pi r^2 = \frac{22}{7}(${radius})^2 = ${A}\,\mathrm{cm^{2}}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: C,
      wrong: [C / 2, 2 * C],
      format: (v) => q$(v, U.cm),
    });
    return {
      stem: tex`The area of a circle is $${A}\,\mathrm{cm^{2}}$. Taking $\pi = \frac{22}{7}$, its circumference is:`,
      answer,
      distractors,
      explanation: tex`$\pi r^2 = ${A} \Rightarrow r^2 = \frac{${A} \times 7}{22} = ${radius * radius}$, so $r = ${radius}\,\mathrm{cm}$. Circumference $= 2\pi r = 2 \times \frac{22}{7} \times ${radius} = ${C}\,\mathrm{cm}$.`,
    };
  }),

  b.dynamic('sector-arc-area', { difficulty: 2, tags: ['circles'] }, (r) => {
    const theta = r.pick([30, 40, 45, 60, 72, 90, 120, 135, 150, 216, 240, 270]);
    const radius = r.int(3, 12);
    const arc = frac(theta * radius, 180);
    const area = frac(theta * radius * radius, 360);
    if (r.chance(0.5)) {
      const answer = piQty(arc, 'cm');
      return {
        stem: tex`The length of the arc of a circle of radius $${radius}\,\mathrm{cm}$ that subtends an angle of $${theta}^{\circ}$ at the centre is:`,
        answer,
        distractors: pickDistractors(answer, [
          piQty(area, 'cm'), // used the sector-area formula
          piQty(arc.div(2), 'cm'), // used pi r instead of 2 pi r
          piQty(arc.mul(2), 'cm'),
          piQty(frac(2 * radius), 'cm'), // whole circumference
        ]),
        explanation: tex`Arc length $= \frac{\theta}{360^{\circ}} \times 2\pi r = \frac{${theta}}{360} \times 2\pi(${radius}) = ${coefTex(arc, '\\pi')}\,\mathrm{cm}$.`,
      };
    }
    const answer = piQty(area, 'cm^{2}');
    return {
      stem: tex`The area of a sector of a circle of radius $${radius}\,\mathrm{cm}$ with central angle $${theta}^{\circ}$ is:`,
      answer,
      distractors: pickDistractors(answer, [
        piQty(arc, 'cm^{2}'), // used the arc-length formula
        piQty(area.mul(2), 'cm^{2}'), // used 180 instead of 360
        piQty(frac(radius * radius), 'cm^{2}'), // whole circle
        piQty(area.div(2), 'cm^{2}'),
      ]),
      explanation: tex`Sector area $= \frac{\theta}{360^{\circ}} \times \pi r^2 = \frac{${theta}}{360} \times \pi(${radius})^2 = ${coefTex(area, '\\pi')}\,\mathrm{cm^{2}}$.`,
    };
  }),

  b.dynamic('chord-distance', { difficulty: 2, tags: ['circles'] }, (r) => {
    const [p, q, rad0] = r.pick(TRIPLES);
    const k = rad0 <= 5 ? r.int(1, 3) : 1;
    const swap = r.chance(0.5);
    const d = (swap ? q : p) * k;
    const h = (swap ? p : q) * k;
    const rad = rad0 * k;
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: 2 * h,
        wrong: [h, 2 * rad, 2 * (rad - d)],
        format: (v) => q$(v, U.cm),
      });
      return {
        stem: tex`A chord of a circle of radius $${rad}\,\mathrm{cm}$ is at a distance of $${d}\,\mathrm{cm}$ from the centre. The length of the chord is:`,
        answer,
        distractors,
        explanation: tex`The perpendicular from the centre bisects the chord. Half-chord $= \sqrt{${rad}^2 - ${d}^2} = \sqrt{${rad * rad - d * d}} = ${h}\,\mathrm{cm}$, so the chord is $2 \times ${h} = ${2 * h}\,\mathrm{cm}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: d,
      wrong: [rad - h, 2 * d, rad - d],
      format: (v) => q$(v, U.cm),
    });
    return {
      stem: tex`A chord of length $${2 * h}\,\mathrm{cm}$ is drawn in a circle of radius $${rad}\,\mathrm{cm}$. The distance of the chord from the centre is:`,
      answer,
      distractors,
      explanation: tex`The perpendicular from the centre bisects the chord, giving half-chord $${h}\,\mathrm{cm}$. Distance $= \sqrt{${rad}^2 - ${h}^2} = \sqrt{${rad * rad - h * h}} = ${d}\,\mathrm{cm}$.`,
    };
  }),

  b.dynamic('wheel-revolutions', { difficulty: 2, origin: 'past-paper', tags: ['circles'] }, (r) => {
    const k = r.pick([1, 2, 3, 5]);
    const radius = 7 * k;
    const circ = 44 * k;
    const revs = r.multiple(250, 2500, 250);
    const metres = (revs * circ) / 100;
    const { answer, distractors } = numericOptions(r, {
      correct: revs,
      wrong: [2 * revs, revs / 2, 10 * revs],
      format: (v) => m(num(v)),
    });
    const vehicle = r.pick(['a bicycle', 'a rickshaw', 'a cart', 'a motorcycle']);
    return {
      stem: tex`The wheel of ${vehicle} has a radius of $${radius}\,\mathrm{cm}$. How many complete revolutions does it make in covering $${num(metres)}\,\mathrm{m}$? (Take $\pi = \frac{22}{7}$.)`,
      answer,
      distractors,
      explanation: tex`Circumference $= 2\pi r = 2 \times \frac{22}{7} \times ${radius} = ${circ}\,\mathrm{cm}$. Distance $= ${num(metres)}\,\mathrm{m} = ${num(metres * 100)}\,\mathrm{cm}$, so revolutions $= \frac{${num(metres * 100)}}{${circ}} = ${revs}$.`,
    };
  }),

  // ---------------------------------------------------------------- areas and volumes
  b.dynamic('cylinder-volume', { difficulty: 1, origin: 'past-paper', tags: ['areas and volumes'] }, (r) => {
    const k = r.int(1, 5);
    const radius = 7 * k;
    const h = r.int(5, 30);
    const V = 154 * k * k * h;
    const { answer, distractors } = numericOptions(r, {
      correct: V,
      wrong: [44 * k * h, 22 * k * h, 4 * V],
      format: (v) => q$(v, CM3),
    });
    const thing = r.pick(['A cylindrical water tank', 'A cylindrical drum', 'A solid metal cylinder', 'A gas cylinder']);
    return {
      stem: tex`${thing} has a base radius of $${radius}\,\mathrm{cm}$ and a height of $${h}\,\mathrm{cm}$. Taking $\pi = \frac{22}{7}$, its volume is:`,
      answer,
      distractors,
      explanation: tex`$V = \pi r^2 h = \frac{22}{7} \times ${radius}^2 \times ${h} = ${V}\,\mathrm{cm^{3}}$.`,
    };
  }),

  b.dynamic('sphere-cone-volume', { difficulty: 2, tags: ['areas and volumes'] }, (r) => {
    const shape = r.pick(['sphere', 'hemisphere', 'cone'] as const);
    if (shape === 'cone') {
      const radius = r.int(2, 9);
      const h = r.intExcept(3, 15, [radius]);
      const V = frac(radius * radius * h, 3);
      const answer = piQty(V, 'cm^{3}');
      return {
        stem: tex`A right circular cone has base radius $${radius}\,\mathrm{cm}$ and height $${h}\,\mathrm{cm}$. Its volume is:`,
        answer,
        distractors: pickDistractors(answer, [
          piQty(frac(radius * radius * h), 'cm^{3}'), // forgot 1/3 (cylinder)
          piQty(frac(radius * h * h, 3), 'cm^{3}'), // swapped r and h
          piQty(frac(radius * radius * h, 2), 'cm^{3}'),
          piQty(frac(radius * h, 3), 'cm^{3}'),
        ]),
        explanation: tex`$V = \frac{1}{3}\pi r^2 h = \frac{1}{3}\pi(${radius})^2(${h}) = ${coefTex(V, '\\pi')}\,\mathrm{cm^{3}}$.`,
      };
    }
    const radius = r.int(2, 9);
    const r3 = radius ** 3;
    if (shape === 'sphere') {
      const V = frac(4 * r3, 3);
      const answer = piQty(V, 'cm^{3}');
      return {
        stem: tex`The volume of a sphere of radius $${radius}\,\mathrm{cm}$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          piQty(frac(4 * radius * radius), 'cm^{3}'), // surface area formula
          piQty(frac(4 * r3), 'cm^{3}'), // forgot 1/3
          piQty(frac(2 * r3, 3), 'cm^{3}'), // hemisphere
          piQty(frac(4 * radius * radius, 3), 'cm^{3}'),
        ]),
        explanation: tex`$V = \frac{4}{3}\pi r^3 = \frac{4}{3}\pi(${radius})^3 = \frac{4 \times ${r3}}{3}\pi = ${coefTex(V, '\\pi')}\,\mathrm{cm^{3}}$.`,
      };
    }
    const V = frac(2 * r3, 3);
    const answer = piQty(V, 'cm^{3}');
    return {
      stem: tex`A solid hemisphere has radius $${radius}\,\mathrm{cm}$. Its volume is:`,
      answer,
      distractors: pickDistractors(answer, [
        piQty(frac(4 * r3, 3), 'cm^{3}'), // whole sphere
        piQty(frac(3 * radius * radius), 'cm^{3}'), // total surface area
        piQty(frac(2 * r3), 'cm^{3}'), // forgot 1/3
        piQty(frac(r3, 3), 'cm^{3}'),
      ]),
      explanation: tex`$V = \frac{2}{3}\pi r^3 = \frac{2}{3}\pi(${radius})^3 = \frac{2 \times ${r3}}{3}\pi = ${coefTex(V, '\\pi')}\,\mathrm{cm^{3}}$.`,
    };
  }),

  b.dynamic('recast-solids', { difficulty: 3, tags: ['areas and volumes'] }, (r) => {
    if (r.chance(0.5)) {
      const k = r.int(2, 6);
      const small = r.int(1, 4);
      const big = k * small;
      const n = k ** 3;
      const { answer, distractors } = numericOptions(r, {
        correct: n,
        wrong: [k * k, k, 3 * k],
        format: (v) => m(num(v)),
      });
      return {
        stem: tex`A solid metal sphere of radius $${big}\,\mathrm{cm}$ is melted and recast into small solid spheres, each of radius $${small}\,\mathrm{cm}$. How many small spheres are obtained?`,
        answer,
        distractors,
        explanation: tex`Volume is conserved: $n \times \frac{4}{3}\pi(${small})^3 = \frac{4}{3}\pi(${big})^3$, so $n = \left(\frac{${big}}{${small}}\right)^3 = ${k}^3 = ${n}$.`,
      };
    }
    const rs = r.int(1, 3);
    const mult = r.pick([2, 3, 4]);
    const t = mult % 2 === 0 ? r.int(1, 6) : r.pick([4, 8]);
    const a = mult * rs;
    const h = t * rs;
    const n = (3 * mult * mult * t) / 4;
    const { answer, distractors } = numericOptions(r, {
      correct: n,
      wrong: [mult * mult * t, 2 * n, 4 * n],
      format: (v) => m(num(v)),
    });
    return {
      stem: tex`A solid metal cylinder of radius $${a}\,\mathrm{cm}$ and height $${h}\,\mathrm{cm}$ is melted and recast into solid spheres of radius $${rs}\,\mathrm{cm}$. The number of spheres formed is:`,
      answer,
      distractors,
      explanation: tex`$n = \frac{\pi r^2 h}{\frac{4}{3}\pi R^3} = \frac{3(${a})^2(${h})}{4(${rs})^3} = \frac{${3 * a * a * h}}{${4 * rs ** 3}} = ${n}$.`,
    };
  }),

  b.dynamic('percent-change-area-volume', { difficulty: 3, tags: ['areas and volumes'] }, (r) => {
    const mode = r.pick(['area-up', 'area-down', 'volume-up'] as const);
    const pct = (v: number): string => m(`${num(v, { sig: 6 })}\\%`);
    if (mode === 'volume-up') {
      const p = r.pick([10, 20, 50, 100]);
      const f = 1 + p / 100;
      const correct = Math.round((f ** 3 - 1) * 1e6) / 1e4;
      const { answer, distractors } = numericOptions(r, {
        correct,
        wrong: [3 * p, Math.round((f ** 2 - 1) * 1e6) / 1e4, p],
        format: pct,
      });
      return {
        stem: tex`If each edge of a cube is increased by $${p}\%$, its volume increases by:`,
        answer,
        distractors,
        explanation: tex`New volume $= (${num(f)}a)^3 = ${num(f ** 3, { sig: 6 })}a^3$, so the increase is $(${num(f ** 3, { sig: 6 })} - 1) \times 100\% = ${num(correct, { sig: 6 })}\%$, not $3 \times ${p}\%$.`,
      };
    }
    const up = mode === 'area-up';
    const p = up ? r.pick([10, 20, 25, 30, 40, 50, 60]) : r.pick([10, 20, 30, 40, 50]);
    const f = up ? 1 + p / 100 : 1 - p / 100;
    const correct = Math.round(Math.abs(f * f - 1) * 1e6) / 1e4;
    const fig = r.pick(['each side of a square', 'the radius of a circle', 'each side of an equilateral triangle']);
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [2 * p, p, up ? 2 * p - (p * p) / 100 : 2 * p + (p * p) / 100],
      format: pct,
    });
    return {
      stem: tex`If ${fig} is ${up ? 'increased' : 'decreased'} by $${p}\%$, its area ${up ? 'increases' : 'decreases'} by:`,
      answer,
      distractors,
      explanation: tex`Area is proportional to the square of the length, so the new area is $(${num(f)})^2 = ${num(f * f, { sig: 6 })}$ times the old one: a change of $${num(correct, { sig: 6 })}\%$. (Shortcut: $${up ? '' : '-'}${p} ${up ? '+' : '-'} ${p} + \frac{(${up ? '' : '-'}${p})(${up ? '' : '-'}${p})}{100}$.)`,
    };
  }),

  // ---------------------------------------------------------------- coordinate geometry
  b.dynamic('distance-two-points', { difficulty: 1, origin: 'past-paper', tags: ['coordinate geometry'] }, (r) => {
    const [p, q, c] = r.pick(TRIPLES.filter((t) => t[2] <= 20));
    const [dx, dy] = r.chance(0.5) ? [p, q] : [q, p];
    const x1 = r.int(-6, 6);
    const y1 = r.int(-6, 6);
    const x2 = x1 + r.sign() * dx;
    const y2 = y1 + r.sign() * dy;
    const sx = x1 + x2;
    const sy = y1 + y2;
    const answer = m(String(c));
    const sumSq = sx * sx + sy * sy;
    const distractors = pickDistractors(answer, [
      m(String(dx + dy)), // added the differences
      m(String(c * c)), // forgot the square root
      sumSq > 0 ? m(surdTex(1, sumSq)) : m(String(c + 2)), // added coordinates instead of subtracting
      m(String(c + 1)),
      m(String(2 * c)),
    ]);
    return {
      stem: tex`The distance between the points $${pt(x1, y1)}$ and $${pt(x2, y2)}$ is:`,
      answer,
      distractors,
      explanation: tex`$d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2} = \sqrt{(${x2 - x1})^2 + (${y2 - y1})^2} = \sqrt{${dx * dx} + ${dy * dy}} = \sqrt{${c * c}} = ${c}$.`,
    };
  }),

  b.dynamic('midpoint-endpoint', { difficulty: 1, tags: ['coordinate geometry'] }, (r) => {
    const x1 = r.int(-8, 8);
    const y1 = r.int(-8, 8);
    const x2 = x1 + 2 * r.nonZero(-5, 5);
    const y2 = y1 + 2 * r.nonZero(-5, 5);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    if (r.chance(0.5)) {
      const answer = m(pt(mx, my));
      return {
        stem: tex`The midpoint of the line segment joining $A${pt(x1, y1)}$ and $B${pt(x2, y2)}$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          m(pt((x2 - x1) / 2, (y2 - y1) / 2)), // halved the differences
          m(pt(x1 + x2, y1 + y2)), // forgot to halve
          m(pt(my, mx)), // swapped coordinates
          m(pt(-mx, -my)),
          m(pt(mx + 1, my - 1)),
          m(pt(x2 - x1, y2 - y1)), // subtracted and forgot to halve
          m(pt(mx - 1, my + 1)),
        ]),
        explanation: tex`$M = \left(\frac{x_1 + x_2}{2}, \frac{y_1 + y_2}{2}\right) = \left(\frac{${x1} + ${paren(x2)}}{2}, \frac{${y1} + ${paren(y2)}}{2}\right) = ${pt(mx, my)}$.`,
      };
    }
    const answer = m(pt(x2, y2));
    return {
      stem: tex`$M${pt(mx, my)}$ is the midpoint of the segment $AB$. If $A$ is $${pt(x1, y1)}$, then $B$ is:`,
      answer,
      distractors: pickDistractors(answer, [
        m(pt(mx - x1, my - y1)), // subtracted A from M
        m(pt(2 * x1 - mx, 2 * y1 - my)), // reflected M in A
        m(pt(x1 + mx, y1 + my)),
        m(pt(-x2, -y2)),
        m(pt(x2 + 1, y2 + 1)),
      ]),
      explanation: tex`$B = (2x_M - x_A, 2y_M - y_A) = (2 \times ${paren(mx)} - ${paren(x1)}, 2 \times ${paren(my)} - ${paren(y1)}) = ${pt(x2, y2)}$.`,
    };
  }),

  b.dynamic('line-through-two-points', { difficulty: 2, tags: ['coordinate geometry'] }, (r) => {
    const slope = r.nonZero(-4, 4);
    const c = r.nonZero(-9, 9);
    const x1 = r.nonZero(-4, 4);
    const x2 = r.intExcept(-4, 5, [x1]);
    const y1 = slope * x1 + c;
    const y2 = slope * x2 + c;
    const eq = (mm: number | Fraction, cc: number | Fraction): string => m(`y = ${signedSum([[mm, 'x'], [cc, '']])}`);
    const answer = eq(slope, c);
    const inv = frac(1, slope);
    const distractors = pickDistractors(answer, [
      eq(-slope, y1 + slope * x1), // wrong sign of the slope
      eq(slope, -c), // wrong sign of the intercept
      eq(inv, frac(y1).sub(inv.mul(x1))), // used run/rise
      eq(slope, y1), // took y1 as the intercept
      eq(slope, c + slope),
    ]);
    return {
      stem: tex`The equation of the straight line through $${pt(x1, y1)}$ and $${pt(x2, y2)}$ is:`,
      answer,
      distractors,
      explanation: tex`Slope $m = \frac{${y2} - ${paren(y1)}}{${x2} - ${paren(x1)}} = \frac{${y2 - y1}}{${x2 - x1}} = ${slope}$. Then $c = y_1 - mx_1 = ${y1} - (${slope})(${x1}) = ${c}$, so $y = ${signedSum([[slope, 'x'], [c, '']])}$.`,
    };
  }),

  b.dynamic('triangle-area-coordinates', { difficulty: 3, tags: ['coordinate geometry', 'triangles'] }, (r) => {
    let pts: Array<[number, number]> = [];
    let twice = 0;
    for (let tries = 0; tries < 50; tries++) {
      pts = [
        [r.int(-5, 6), r.int(-5, 6)],
        [r.int(-5, 6), r.int(-5, 6)],
        [r.int(-5, 6), r.int(-5, 6)],
      ];
      const [[ax, ay], [bx, by], [cx, cy]] = pts as [[number, number], [number, number], [number, number]];
      twice = ax * (by - cy) + bx * (cy - ay) + cx * (ay - by);
      if (Math.abs(twice) >= 6 && Math.abs(twice) <= 90) break;
    }
    if (Math.abs(twice) < 6) {
      pts = [[1, 2], [7, 2], [3, 6]];
      twice = 1 * (2 - 6) + 7 * (6 - 2) + 3 * (2 - 2);
    }
    const [[ax, ay], [bx, by], [cx, cy]] = pts as [[number, number], [number, number], [number, number]];
    const area = Math.abs(twice) / 2;
    const { answer, distractors } = numericOptions(r, {
      correct: area,
      wrong: [2 * area, area / 2],
      format: (v) => m(`${num(v)}\\text{ sq. units}`),
      fallback: 'offset',
    });
    return {
      stem: tex`The area of the triangle with vertices $A${pt(ax, ay)}$, $B${pt(bx, by)}$ and $C${pt(cx, cy)}$ is:`,
      answer,
      distractors,
      explanation: tex`Area $= \frac{1}{2}\left|x_1(y_2 - y_3) + x_2(y_3 - y_1) + x_3(y_1 - y_2)\right| = \frac{1}{2}\left|${ax}(${by - cy}) + ${paren(bx)}(${cy - ay}) + ${paren(cx)}(${ay - by})\right| = \frac{1}{2}(${Math.abs(twice)}) = ${num(area)}$ square units.`,
    };
  }),

  // ---------------------------------------------------------------- heights and distances
  b.dynamic('elevation-from-shadow', { difficulty: 1, origin: 'past-paper', tags: ['heights and distances'] }, (r) => {
    const theta = r.pick([30, 45, 60]);
    const k = r.int(2, 15);
    const height = theta === 60 ? surdTex(k, 3) : String(k);
    const shadow = theta === 30 ? surdTex(k, 3) : String(k);
    const tanTex = theta === 30 ? '\\frac{1}{\\sqrt{3}}' : theta === 45 ? '1' : '\\sqrt{3}';
    const object = r.pick(['a vertical pole', 'a flagpole', 'an electric pole', 'a tree']);
    const answer = m(`${theta}^{\\circ}`);
    return {
      stem: tex`The height of ${object} is $${height}\,\mathrm{m}$ and the length of its shadow on level ground is $${shadow}\,\mathrm{m}$. The angle of elevation of the sun is:`,
      answer,
      distractors: [30, 45, 60, 90].filter((a) => a !== theta).map((a) => m(`${a}^{\\circ}`)),
      explanation: tex`$\tan\theta = \frac{\text{height}}{\text{shadow}} = \frac{${height}}{${shadow}} = ${tanTex}$, so $\theta = ${theta}^{\circ}$.`,
    };
  }),

  b.dynamic('height-or-distance', { difficulty: 2, origin: 'past-paper', tags: ['heights and distances'] }, (r) => {
    const theta = r.pick([30, 45, 60]);
    const k = r.int(2, 20);
    const L = 3 * k;
    const findHeight = r.chance(0.5);
    // factor: answer = L * tan(theta) when finding a height, L * cot(theta) when finding a distance.
    const big = findHeight ? theta === 60 : theta === 30; // multiply by sqrt3
    const small = findHeight ? theta === 30 : theta === 60; // divide by sqrt3
    const timesRoot3 = surdQty(L, 3);
    const overRoot3 = surdQty(k, 3);
    const plain = m(`${L}\\,\\mathrm{m}`);
    const answer = big ? timesRoot3 : small ? overRoot3 : plain;
    const lineOfSight = big ? m(`${2 * L}\\,\\mathrm{m}`) : small ? surdQty(2 * k, 3) : surdQty(L, 2);
    const distractors = pickDistractors(answer, [timesRoot3, overRoot3, plain, lineOfSight]);
    const fn = findHeight ? '\\tan' : '\\cot';
    const value = big ? '\\sqrt{3}' : small ? '\\frac{1}{\\sqrt{3}}' : '1';
    const result = big ? surdTex(L, 3) : small ? surdTex(k, 3) : String(L);
    const stem = findHeight
      ? tex`From a point on level ground $${L}\,\mathrm{m}$ away from the foot of a tower, the angle of elevation of its top is $${theta}^{\circ}$. The height of the tower is:`
      : tex`From the top of a building $${L}\,\mathrm{m}$ high, the angle of depression of a car parked on the road is $${theta}^{\circ}$. How far is the car from the foot of the building?`;
    const rel = findHeight ? tex`h = d\tan ${theta}^{\circ}` : tex`d = h\cot ${theta}^{\circ}`;
    return {
      stem,
      answer,
      distractors,
      explanation: tex`$${rel} = ${L} \times ${value} = ${result}\,\mathrm{m}$ (using $${fn} ${theta}^{\circ} = ${value}$).${small ? tex` Here $\frac{${L}}{\sqrt{3}} = \frac{${L}\sqrt{3}}{3} = ${surdTex(k, 3)}$.` : ''}`,
    };
  }),

  b.dynamic('two-angles-tower', { difficulty: 3, tags: ['heights and distances'] }, (r) => {
    const k = r.int(3, 25);
    const walk = 2 * k;
    const askHeight = r.chance(0.6);
    const answer = askHeight ? surdQty(k, 3) : m(`${k}\\,\\mathrm{m}`);
    const distractors = askHeight
      ? pickDistractors(answer, [surdQty(2 * k, 3), m(`${3 * k}\\,\\mathrm{m}`), m(`${k}\\,\\mathrm{m}`)])
      : pickDistractors(answer, [m(`${3 * k}\\,\\mathrm{m}`), m(`${walk}\\,\\mathrm{m}`), surdQty(k, 3)]);
    const place = r.pick(['mobile-phone tower', 'minaret', 'water tower', 'clock tower']);
    return {
      stem: tex`From a point on level ground, the angle of elevation of the top of a ${place} is $30^{\circ}$. After moving $${walk}\,\mathrm{m}$ straight towards its foot, the angle of elevation becomes $60^{\circ}$. ${askHeight ? `The height of the ${place} is:` : `How far is the second point from the foot of the ${place}?`}`,
      answer,
      distractors,
      explanation: tex`Let the height be $h$ and the final distance $x$. Then $x = h\cot 60^{\circ} = \frac{h}{\sqrt{3}}$ and $x + ${walk} = h\cot 30^{\circ} = h\sqrt{3}$. Subtracting: $${walk} = h\left(\sqrt{3} - \frac{1}{\sqrt{3}}\right) = \frac{2h}{\sqrt{3}}$, so $h = ${surdTex(k, 3)}\,\mathrm{m}$ and $x = \frac{${surdTex(k, 3)}}{\sqrt{3}} = ${k}\,\mathrm{m}$.`,
    };
  }),

  // ---------------------------------------------------------------- conceptual (fixed)
  ...b.mcqs([
    {
      id: 'right-triangle-sides', d: 1, t: ['triangles'],
      q: tex`A triangle has sides $9\,\mathrm{cm}$, $40\,\mathrm{cm}$ and $41\,\mathrm{cm}$. The triangle is:`,
      a: 'right-angled',
      x: ['acute-angled', 'obtuse-angled', 'equilateral'],
      e: tex`$9^2 + 40^2 = 81 + 1600 = 1681 = 41^2$, so by the converse of Pythagoras' theorem the angle opposite the $41\,\mathrm{cm}$ side is $90^{\circ}$.`,
    },
    {
      id: 'angle-in-semicircle', d: 1, o: 'past-paper', t: ['circles'],
      q: 'An angle inscribed in a semicircle (subtended by a diameter at a point on the circle) is:',
      a: tex`$90^{\circ}$`,
      x: [tex`$45^{\circ}$`, tex`$60^{\circ}$`, tex`$180^{\circ}$`],
      e: tex`The angle at the centre subtended by a diameter is $180^{\circ}$, and the inscribed angle is half of it: $90^{\circ}$.`,
    },
    {
      id: 'radius-doubled-area', d: 1, t: ['circles', 'areas and volumes'],
      q: 'If the radius of a circle is doubled, its area becomes:',
      a: 'four times the original area',
      x: ['twice the original area', 'eight times the original area', 'half the original area'],
      e: tex`$A = \pi r^2$, so replacing $r$ by $2r$ gives $\pi(2r)^2 = 4\pi r^2$: four times the area. (Doubling a length doubles the circumference, not the area.)`,
    },
    {
      id: 'hexagon-diagonals', d: 2, t: ['angles and lines'],
      q: 'How many diagonals does a hexagon have?',
      a: '$9$',
      x: ['$6$', '$12$', '$15$'],
      e: tex`Number of diagonals $= \frac{n(n-3)}{2} = \frac{6 \times 3}{2} = 9$. ($15 = {}^{6}C_{2}$ also counts the 6 sides.)`,
    },
    {
      id: 'quadrant-of-point', d: 1, t: ['coordinate geometry'],
      q: tex`The point $(-5, -2)$ lies in the:`,
      a: 'third quadrant',
      x: ['first quadrant', 'second quadrant', 'fourth quadrant'],
      e: 'Both coordinates are negative, which happens only in the third quadrant.',
    },
    {
      id: 'perpendicular-slopes', d: 1, t: ['coordinate geometry'],
      q: tex`Two non-vertical lines with slopes $m_1$ and $m_2$ are perpendicular if and only if:`,
      a: tex`$m_1 m_2 = -1$`,
      x: [tex`$m_1 = m_2$`, tex`$m_1 + m_2 = 0$`, tex`$m_1 m_2 = 1$`],
      e: tex`Perpendicular lines have slopes that are negative reciprocals, $m_2 = -\frac{1}{m_1}$, i.e. $m_1 m_2 = -1$. Equal slopes ($m_1 = m_2$) mean the lines are parallel.`,
    },
    {
      id: 'elevation-equals-depression', d: 2, t: ['heights and distances', 'angles and lines'],
      q: tex`From the top of a building, the angle of depression of a car on the level road is $\theta$. The angle of elevation of the top of the building as seen from the car is:`,
      a: tex`$\theta$`,
      x: [tex`$90^{\circ} - \theta$`, tex`$180^{\circ} - \theta$`, tex`$2\theta$`],
      e: tex`The horizontal line through the top of the building is parallel to the road, so the angle of depression and the angle of elevation are alternate angles and are equal: both are $\theta$.`,
    },
    {
      id: 'cyclic-quadrilateral', d: 2, o: 'past-paper', t: ['circles'],
      q: tex`$ABCD$ is a cyclic quadrilateral (all four vertices lie on a circle) with $\angle A = 75^{\circ}$. Then $\angle C$ equals:`,
      a: tex`$105^{\circ}$`,
      x: [tex`$75^{\circ}$`, tex`$15^{\circ}$`, tex`$285^{\circ}$`],
      e: tex`Opposite angles of a cyclic quadrilateral are supplementary: $\angle C = 180^{\circ} - 75^{\circ} = 105^{\circ}$.`,
    },
  ]),
]);
