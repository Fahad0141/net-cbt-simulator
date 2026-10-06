import { defineBank } from '@/engine/authoring';
import { frac, num, numericOptions, pickDistractors, tex } from '@/engine/helpers';
import type { Fraction } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

/*
 * Part A of the genetics chapter: computational genetics (Mendelian ratios, test
 * crosses, incomplete dominance and codominance, ABO blood groups, sex-linked
 * inheritance, Hardy-Weinberg, Chargaff's rule, codon counting, chromosome and DNA
 * content through the cell cycle, linkage). Conceptual items live in
 * `genetics.concepts.ts` (part B).
 */

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** A probability as an option: `$\frac{1}{4}$`, `$0$`, `$1$`. */
const fr$ = (f: Fraction): string => `$${f.toTex()}$`;

/** A percentage as an option: `$25\%$`. */
const pct$ = (x: number): string => tex`$${num(x, { dp: 2 })}\%$`;

/** An integer count as an option. */
const int$ = (x: number): string => `$${num(x, { autoSci: false })}$`;

/** Distinct fraction options built from mistake-based candidates, then a fallback list. */
function fractionOptions(
  correct: Fraction,
  wrong: readonly Fraction[],
): { answer: string; distractors: string[] } {
  const fallback = [frac(1, 4), frac(1, 2), frac(3, 4), frac(1, 8), frac(3, 8), frac(1, 16), frac(3, 16), frac(9, 16)];
  const ok = (f: Fraction): boolean => f.toNumber() >= 0 && f.toNumber() <= 1;
  const answer = fr$(correct);
  const distractors = pickDistractors(answer, [...wrong.filter(ok), ...fallback].map(fr$));
  return { answer, distractors };
}

/** Pea characters studied by Mendel, worded so that two of them combine naturally. */
interface PeaTrait {
  key: 'height' | 'shape' | 'colour' | 'flower';
  letter: string;
  dom: string;
  rec: string;
  name: string;
}

const PEA: readonly PeaTrait[] = [
  { key: 'height', letter: 'T', dom: 'tall', rec: 'dwarf', name: 'plant height' },
  { key: 'shape', letter: 'R', dom: 'round', rec: 'wrinkled', name: 'seed shape' },
  { key: 'colour', letter: 'Y', dom: 'yellow', rec: 'green', name: 'seed colour' },
  { key: 'flower', letter: 'P', dom: 'purple', rec: 'white', name: 'flower colour' },
];

/** Describes pea plants with the given trait values, e.g. "tall plants with white flowers". */
function peaPlants(values: ReadonlyArray<{ t: PeaTrait; dom: boolean }>): string {
  let pre = '';
  const seed: string[] = [];
  let flower = '';
  for (const { t, dom } of values) {
    const v = dom ? t.dom : t.rec;
    if (t.key === 'height') pre = `${v} `;
    else if (t.key === 'flower') flower = `${v} flowers`;
    else seed.push(v);
  }
  // keep seed adjectives in the natural order: shape before colour
  const seedText = seed.length ? `${seed.join(' ')} seeds` : '';
  const post = [seedText, flower].filter(Boolean);
  return `${pre}plants${post.length ? ` with ${post.join(' and ')}` : ''}`;
}

const sortPea = (traits: readonly PeaTrait[]): PeaTrait[] =>
  [...traits].sort((a, b) => PEA.indexOf(a) - PEA.indexOf(b));

// ABO blood groups -------------------------------------------------------------

type Allele = 'A' | 'B' | 'O';
type Group = 'A' | 'B' | 'AB' | 'O';

const alleleTex = (a: Allele): string => (a === 'O' ? 'i' : `I^{${a}}`);
const genotypeTex = (g: readonly [Allele, Allele]): string => `${alleleTex(g[0])}${alleleTex(g[1])}`;

function groupOf(a: Allele, b: Allele): Group {
  const s = new Set([a, b]);
  if (s.has('A') && s.has('B')) return 'AB';
  if (s.has('A')) return 'A';
  if (s.has('B')) return 'B';
  return 'O';
}

const ABO_GENOTYPES: ReadonlyArray<readonly [Allele, Allele]> = [
  ['A', 'A'],
  ['A', 'O'],
  ['B', 'B'],
  ['B', 'O'],
  ['A', 'B'],
  ['O', 'O'],
];

const GROUP_ORDER: readonly Group[] = ['A', 'B', 'AB', 'O'];

function groupSetText(groups: ReadonlySet<Group>): string {
  const list = GROUP_ORDER.filter((g) => groups.has(g));
  if (list.length === 1) return `${list[0]} only`;
  if (list.length === 4) return 'A, B, AB or O';
  return `${list.slice(0, -1).join(', ')} or ${list[list.length - 1]} only`;
}

// Gene symbols ----------------------------------------------------------------

const GENE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Picks k distinct items and returns them in the original order. */
function pickOrdered<T>(r: Rng, items: readonly T[], k: number): T[] {
  const chosen = new Set(r.sample(items, k));
  return items.filter((x) => chosen.has(x));
}

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('biology', 'genetics', (b) => [
  // ---- Mendelian genetics ----------------------------------------------------
  b.dynamic('monohybrid-f2-counts', { difficulty: 1, origin: 'past-paper', tags: ['Mendelian genetics'] }, (r) => {
    const t = r.pick(PEA);
    const L = t.letter;
    const l = L.toLowerCase();
    const n = r.multiple(80, 960, 4);
    const ask = r.pick(['recessive', 'dominant', 'hetero', 'homodom'] as const);
    const domPlants = peaPlants([{ t, dom: true }]);
    const recPlants = peaPlants([{ t, dom: false }]);
    let what: string;
    let share: Fraction;
    let wrong: number[];
    switch (ask) {
      case 'recessive':
        what = `${recPlants}`;
        share = frac(1, 4);
        wrong = [(3 * n) / 4, n / 2, n];
        break;
      case 'dominant':
        what = `${domPlants}`;
        share = frac(3, 4);
        wrong = [n / 4, n / 2, n];
        break;
      case 'hetero':
        what = `heterozygous ($${L}${l}$) plants`;
        share = frac(1, 2);
        wrong = [n / 4, (3 * n) / 4, n];
        break;
      default:
        what = `homozygous dominant ($${L}${L}$) plants`;
        share = frac(1, 4);
        wrong = [n / 2, (3 * n) / 4, n];
    }
    const correct = share.toNumber() * n;
    const { answer, distractors } = numericOptions(r, { correct, wrong, format: int$ });
    return {
      stem: `Two pea plants heterozygous for ${t.name} ($${L}${l}$) are crossed and give ${n} offspring. How many of the offspring are expected to be ${what}?`,
      answer,
      distractors,
      explanation: tex`$${L}${l} \times ${L}${l}$ gives $1\,${L}${L} : 2\,${L}${l} : 1\,${l}${l}$, i.e. a $3:1$ phenotypic ratio. Expected number $= ${share.toTex()} \times ${n} = ${correct}$.`,
    };
  }),

  b.dynamic('test-cross-genotype', { difficulty: 1, tags: ['Mendelian genetics'] }, (r) => {
    const t = r.pick(PEA);
    const L = t.letter;
    const l = L.toLowerCase();
    // options differ only in letter case, so name the genotype class as well
    const options = [
      `homozygous dominant ($${L}${L}$)`,
      `heterozygous ($${L}${l}$)`,
      `homozygous recessive ($${l}${l}$)`,
    ];
    if (r.chance(0.35)) {
      const answer = '$1:1$';
      return {
        stem: `A pea plant heterozygous for ${t.name} ($${L}${l}$) is test-crossed. The expected phenotypic ratio of the offspring (dominant : recessive) is:`,
        answer,
        distractors: ['$3:1$', '$1:2:1$', '$1:0$'],
        explanation: tex`A test cross is with the homozygous recessive: $${L}${l} \times ${l}${l} \to \frac{1}{2}\,${L}${l} : \frac{1}{2}\,${l}${l}$, so dominant : recessive $= 1:1$.`,
      };
    }
    const n = r.int(40, 400);
    const hetero = r.chance(0.6);
    const domCount = hetero ? Math.round(n / 2) + r.int(-4, 4) : n;
    const recCount = n - domCount;
    const answer = hetero ? options[1] : options[0];
    const distractors = [hetero ? options[0] : options[1], options[2], `either $${L}${L}$ or $${L}${l}$ (cannot be told)`];
    const result = hetero
      ? `${domCount} have the dominant and ${recCount} the recessive phenotype`
      : `all ${n} show the dominant phenotype`;
    return {
      stem: `A pea plant showing the dominant ${t.name} (${t.dom}) but of unknown genotype is crossed with one showing the recessive ${t.name} (${t.rec}). Of the ${n} offspring, ${result}. The genotype of the first parent is most likely:`,
      answer,
      distractors,
      explanation: hetero
        ? tex`Recessive offspring ($${l}${l}$) receive one recessive allele from each parent, so the dominant parent carries $${l}$: $${L}${l} \times ${l}${l}$ gives about $1:1$, as observed.`
        : tex`If the parent were $${L}${l}$, about half of the ${n} offspring would be recessive. All are dominant, so the parent is homozygous: $${L}${L} \times ${l}${l} \to$ all $${L}${l}$.`,
    };
  }),

  b.dynamic('dihybrid-f2-counts', { difficulty: 2, origin: 'past-paper', tags: ['Mendelian genetics'] }, (r) => {
    const [t1, t2] = sortPea(r.sample(PEA, 2)) as [PeaTrait, PeaTrait];
    const A = t1.letter;
    const a = A.toLowerCase();
    const B = t2.letter;
    const bb = B.toLowerCase();
    const n = r.multiple(160, 1600, 16);
    const kind = r.weighted(['pheno', 'genoHomoBoth', 'genoDouble', 'trueDom'] as const, [6, 1, 1, 1]);
    let what: string;
    let parts: number;
    let reason: string;
    if (kind === 'pheno') {
      const d1 = r.chance(0.5);
      const d2 = r.chance(0.5);
      what = peaPlants([
        { t: t1, dom: d1 },
        { t: t2, dom: d2 },
      ]);
      parts = (d1 ? 3 : 1) * (d2 ? 3 : 1);
      reason = `this phenotype is ${parts} of the 16 parts of the $9:3:3:1$ ratio`;
    } else if (kind === 'genoHomoBoth') {
      what = 'homozygous for both genes';
      parts = 4;
      reason = tex`$${A}${A}${B}${B}$, $${A}${A}${bb}${bb}$, $${a}${a}${B}${B}$ and $${a}${a}${bb}${bb}$ are 1 part each, 4 of 16`;
    } else if (kind === 'genoDouble') {
      what = tex`heterozygous for both genes ($${A}${a}${B}${bb}$)`;
      parts = 4;
      reason = tex`$P(${A}${a}) \times P(${B}${bb}) = \frac{1}{2} \times \frac{1}{2} = \frac{4}{16}$`;
    } else {
      what = tex`true-breeding (homozygous) for both dominant characters`;
      parts = 1;
      reason = tex`only $${A}${A}${B}${B}$ qualifies: $\frac{1}{4} \times \frac{1}{4} = \frac{1}{16}$`;
    }
    const correct = (parts * n) / 16;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: r.shuffle([9, 3, 1, 4, 2, 6]).filter((p) => p !== parts).map((p) => (p * n) / 16),
      format: int$,
    });
    return {
      stem: tex`In peas, ${t1.dom} ($${A}$) is dominant to ${t1.rec} ($${a}$) and ${t2.dom} ($${B}$) is dominant to ${t2.rec} ($${bb}$). The cross $${A}${a}${B}${bb} \times ${A}${a}${B}${bb}$ gives ${n} offspring. How many are expected to be ${what}?`,
      answer,
      distractors,
      explanation: tex`In the dihybrid F$_2$, ${reason}. Expected number $= \frac{${parts}}{16} \times ${n} = ${correct}$.`,
    };
  }),

  b.dynamic('dihybrid-probability', { difficulty: 3, tags: ['Mendelian genetics'] }, (r) => {
    // per-gene crosses: [parent1, parent2, P(dominant phenotype)]
    const crosses = [
      { p: ['Xx', 'Xx'], dom: frac(3, 4) },
      { p: ['Xx', 'xx'], dom: frac(1, 2) },
      { p: ['XX', 'xx'], dom: frac(1) },
      { p: ['XX', 'Xx'], dom: frac(1) },
    ] as const;
    for (;;) {
      const g = [r.pick(crosses), r.pick(crosses)];
      const flip = [r.chance(0.5), r.chance(0.5)];
      const wantDom = g.map((c) => (c.dom.equals(1) ? true : r.chance(0.5)));
      const probs = g.map((c, i) => (wantDom[i] ? c.dom : frac(1).sub(c.dom)));
      const [pA, pB] = probs as [Fraction, Fraction];
      const correct = pA.mul(pB);
      if (correct.equals(1) || correct.isZero()) continue;
      const geno = (gene: number, parent: number): string => {
        const c = g[gene]!;
        const idx = flip[gene] ? 1 - parent : parent;
        const letter = GENE_LETTERS[gene]!;
        return c.p[idx]!.replace(/X/g, letter).replace(/x/g, letter.toLowerCase());
      };
      const p1 = geno(0, 0) + geno(1, 0);
      const p2 = geno(0, 1) + geno(1, 1);
      const desc = (i: number): string =>
        `${i === 0 ? 'shows ' : ''}the ${wantDom[i] ? 'dominant' : 'recessive'} phenotype for gene $${GENE_LETTERS[i]}$`;
      const wrong = [
        pA.add(pB).sub(pA.mul(pB)),
        frac(1).sub(pA).mul(pB),
        pA.mul(frac(1).sub(pB)),
        pA.mul(pB).mul(frac(1, 2)),
        frac(9, 16),
        frac(3, 16),
        frac(1, 16),
      ];
      const { answer, distractors } = fractionOptions(
        correct,
        wrong.filter((w) => w.toNumber() > 0 && w.toNumber() < 1),
      );
      const step = (i: number): string =>
        `${geno(i, 0)} \\times ${geno(i, 1)}:\\ P(\\text{${wantDom[i] ? 'dominant' : 'recessive'}}) = ${probs[i]!.toTex()}`;
      return {
        stem: tex`Genes $A$ and $B$ assort independently and each shows complete dominance. In the cross $${p1} \times ${p2}$, the probability that an offspring ${desc(0)} and ${desc(1)} is:`,
        answer,
        distractors,
        explanation: tex`Treat each gene separately and multiply. $${step(0)}$; $${step(1)}$. Probability $= ${pA.toTex()} \times ${pB.toTex()} = ${correct.toTex()}$.`,
      };
    }
  }),

  // ---- Incomplete dominance and codominance --------------------------------------
  b.dynamic('incomplete-codominance-cross', { difficulty: 1, tags: ['Mendelian genetics'] }, (r) => {
    const systems = [
      {
        intro: 'In four o\'clock plants (*Mirabilis jalapa*), flower colour shows incomplete dominance: red and white parents give pink offspring.',
        ph: ['red', 'pink', 'white'],
        unit: 'flowered plant',
        kind: 'incomplete dominance',
      },
      {
        intro: 'In snapdragon (*Antirrhinum*), flower colour shows incomplete dominance: red and white parents give pink offspring.',
        ph: ['red', 'pink', 'white'],
        unit: 'flowered plant',
        kind: 'incomplete dominance',
      },
      {
        intro: tex`In the MN blood group system, alleles $L^{M}$ and $L^{N}$ are codominant: $L^{M}L^{M}$ is group M, $L^{M}L^{N}$ is group MN and $L^{N}L^{N}$ is group N.`,
        ph: ['M', 'MN', 'N'],
        unit: 'blood group',
        kind: 'codominance',
      },
    ] as const;
    const s = r.pick(systems);
    // genotype index: 0 = homozygous first, 1 = heterozygous, 2 = homozygous second
    const crosses: ReadonlyArray<readonly [number, number]> = [
      [1, 1],
      [1, 0],
      [1, 2],
      [0, 2],
    ];
    const [g1, g2] = r.pick(crosses);
    const alleles = (g: number): [number, number] => (g === 0 ? [0, 0] : g === 1 ? [0, 1] : [1, 1]);
    const dist = [0, 0, 0];
    for (const x of alleles(g1)) for (const y of alleles(g2)) dist[x + y]! += 25;
    const possible = [0, 1, 2].filter((i) => dist[i]! > 0);
    const target = r.pick(possible);
    const correct = dist[target]!;
    const blood = s.unit === 'blood group';
    const cross = blood
      ? `a man of group ${s.ph[g1]} marries a woman of group ${s.ph[g2]}`
      : `a ${s.ph[g1]}-flowered plant is crossed with a ${s.ph[g2]}-flowered plant`;
    const targetText = blood ? `of blood group ${s.ph[target]}` : `${s.ph[target]}-flowered`;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [0, 25, 50, 75, 100].filter((v) => v !== correct),
      format: pct$,
      allowZero: true,
    });
    const ratio = dist.map((v, i) => (v ? `${v}\\%\\ \\text{${s.ph[i]}}` : '')).filter(Boolean).join(',\\ ');
    return {
      stem: `${s.intro} If ${cross}, what percentage of ${blood ? 'their children' : 'the offspring'} are expected to be ${targetText}?`,
      answer,
      distractors,
      explanation: tex`In ${s.kind} the heterozygote has its own phenotype, so genotypes and phenotypes match. The cross gives $${ratio}$; hence ${correct}% are ${s.ph[target]}.`,
    };
  }),

  // ---- Multiple alleles: ABO ------------------------------------------------------
  b.dynamic('abo-child-probability', { difficulty: 2, origin: 'past-paper', tags: ['Mendelian genetics'] }, (r) => {
    for (;;) {
      const m = r.pick(ABO_GENOTYPES);
      const f = r.pick(ABO_GENOTYPES);
      const counts = new Map<Group, number>();
      for (const x of m) for (const y of f) counts.set(groupOf(x, y), (counts.get(groupOf(x, y)) ?? 0) + 1);
      if (counts.size < 2) continue;
      const target = r.pick([...counts.keys()]);
      const correct = frac(counts.get(target)!, 4);
      const wrong = [frac(1, 4), frac(1, 2), frac(3, 4), frac(0), frac(1)].filter((w) => !w.equals(correct));
      const { answer, distractors } = fractionOptions(correct, r.shuffle(wrong));
      const combos: string[] = [];
      for (const x of m) for (const y of f) combos.push(`${genotypeTex(x <= y ? [x, y] : [y, x])}\\,(${groupOf(x, y)})`);
      return {
        stem: tex`A man of genotype $${genotypeTex(m)}$ marries a woman of genotype $${genotypeTex(f)}$. The probability that their child has blood group ${target} is:`,
        answer,
        distractors,
        explanation: tex`$I^{A}$ and $I^{B}$ are codominant and both dominant to $i$. The four equally likely combinations are $${combos.join(',\\ ')}$, so $P(\text{${target}}) = ${correct.toTex()}$.`,
      };
    }
  }),

  b.dynamic('abo-possible-groups', { difficulty: 2, tags: ['Mendelian genetics'] }, (r) => {
    const pairs: ReadonlyArray<readonly [Group, Group]> = [
      ['O', 'O'],
      ['O', 'A'],
      ['O', 'B'],
      ['O', 'AB'],
      ['A', 'A'],
      ['A', 'B'],
      ['A', 'AB'],
      ['B', 'B'],
      ['B', 'AB'],
      ['AB', 'AB'],
    ];
    const [g1, g2] = r.pick(pairs);
    const genos = (g: Group): ReadonlyArray<readonly [Allele, Allele]> =>
      ABO_GENOTYPES.filter(([x, y]) => groupOf(x, y) === g);
    const result = new Set<Group>();
    for (const m of genos(g1)) for (const f of genos(g2)) for (const x of m) for (const y of f) result.add(groupOf(x, y));
    const answer = groupSetText(result);
    const pool = [
      new Set<Group>(['O']),
      new Set<Group>(['A', 'O']),
      new Set<Group>(['B', 'O']),
      new Set<Group>(['A', 'B']),
      new Set<Group>(['A', 'B', 'AB']),
      new Set<Group>(['A', 'B', 'AB', 'O']),
      new Set<Group>(['AB']),
      new Set<Group>(['A', 'AB']),
      new Set<Group>(['B', 'AB']),
      new Set<Group>(['A', 'B', 'O']),
    ].map(groupSetText);
    // prefer near misses: sets sharing a group with the answer
    const near = pool.filter((s) => GROUP_ORDER.some((g) => result.has(g) && s.includes(g)));
    const distractors = pickDistractors(answer, [...r.shuffle(near), ...r.shuffle(pool)]);
    const gt = (g: Group): string =>
      `${genos(g).length > 1 ? 'may be' : 'is'} ${genos(g).map((x) => `$${genotypeTex(x)}$`).join(' or ')}`;
    return {
      stem: `The parents of a child have blood groups ${g1} and ${g2}. Considering all their possible genotypes, the child's blood group can be:`,
      answer,
      distractors,
      explanation: `Group ${g1} ${gt(g1)}; group ${g2} ${gt(g2)}. Combining every possible gamete gives children of group ${answer.replace(' only', '')}${result.has('O') ? '' : ' (group O needs an $i$ allele from each parent)'}.`,
    };
  }),

  // ---- Sex determination and sex linkage -----------------------------------------
  b.dynamic('sex-linked-probability', { difficulty: 2, origin: 'past-paper', tags: ['sex determination'] }, (r) => {
    const disorder = r.pick([
      { name: 'colour blindness', adj: 'colour-blind', L: 'C' },
      { name: 'haemophilia', adj: 'haemophilic', L: 'H' },
    ] as const);
    const N = disorder.L;
    const d = N.toLowerCase();
    const mothers = [
      { a: [0, 1], text: 'a carrier woman', g: `X^{${N}}X^{${d}}` },
      { a: [1, 1], text: `a ${disorder.adj} woman`, g: `X^{${d}}X^{${d}}` },
      { a: [0, 0], text: 'a homozygous normal woman', g: `X^{${N}}X^{${N}}` },
    ] as const;
    const fathers = [
      { a: 0, text: 'a normal man', g: `X^{${N}}Y` },
      { a: 1, text: `a ${disorder.adj} man`, g: `X^{${d}}Y` },
    ] as const;
    for (;;) {
      const mo = r.pick(mothers);
      const fa = r.pick(fathers);
      if (mo.a[0] === 0 && mo.a[1] === 0 && fa.a === 0) continue;
      // sons get the mother's X only; daughters get one X from each parent
      const sonsAffected = frac(mo.a.filter((x) => x === 1).length, 2);
      const daughterAllele = mo.a.map((x) => x + fa.a);
      const daughtersAffected = frac(daughterAllele.filter((x) => x === 2).length, 2);
      const daughtersCarriers = frac(daughterAllele.filter((x) => x === 1).length, 2);
      const childAffected = sonsAffected.add(daughtersAffected).div(2);
      const asks = [
        { q: `their sons will be ${disorder.adj}`, v: sonsAffected, why: 'A son receives his only X from his mother.' },
        { q: `their daughters will be ${disorder.adj}`, v: daughtersAffected, why: 'A daughter is affected only if she receives the recessive allele from both parents.' },
        { q: `their daughters will be carriers`, v: daughtersCarriers, why: 'A carrier daughter has one normal and one recessive X.' },
        { q: `all their children (sons and daughters together) will be ${disorder.adj}`, v: childAffected, why: 'Half the children are sons and half daughters.' },
      ];
      const ask = r.pick(asks);
      const sonG = mo.a.map((x) => `X^{${x ? d : N}}Y`);
      const dauG = mo.a.map((x) => (fa.a === 1 && x === 0 ? `X^{${N}}X^{${d}}` : fa.a === 1 ? `X^{${d}}X^{${d}}` : x ? `X^{${N}}X^{${d}}` : `X^{${N}}X^{${N}}`));
      const wrong = [frac(0), frac(1, 4), frac(1, 2), frac(3, 4), frac(1)].filter((w) => !w.equals(ask.v));
      const { answer, distractors } = fractionOptions(ask.v, r.shuffle(wrong));
      return {
        stem: tex`${disorder.name[0]!.toUpperCase()}${disorder.name.slice(1)} is an X-linked recessive trait. If ${mo.text} ($${mo.g}$) marries ${fa.text} ($${fa.g}$), what fraction of ${ask.q}?`,
        answer,
        distractors,
        explanation: tex`Sons: $${sonG.join(',\\ ')}$; daughters: $${dauG.join(',\\ ')}$. ${ask.why} Required fraction $= ${ask.v.toTex()}$.`,
      };
    }
  }),

  b.dynamic('sex-of-children-probability', { difficulty: 1, tags: ['sex determination'] }, (r) => {
    const n = r.int(2, 5);
    const sex = r.pick(['boys', 'girls'] as const);
    const other = sex === 'boys' ? 'girl' : 'boy';
    const one = sex === 'boys' ? 'boy' : 'girl';
    const kind = r.weighted(['all', 'exactlyOne', 'next'] as const, [3, 2, 2]);
    const p2n = 2 ** n;
    let stem: string;
    let correct: Fraction;
    let expl: string;
    if (kind === 'all') {
      stem = `A couple plans to have ${n} children. Assuming boys and girls are equally likely, the probability that all ${n} are ${sex} is:`;
      correct = frac(1, p2n);
      expl = tex`Each birth is independent with $P = \frac{1}{2}$, so $P = \left(\frac{1}{2}\right)^{${n}} = \frac{1}{${p2n}}$.`;
    } else if (kind === 'exactlyOne') {
      stem = `A couple plans to have ${n} children. Assuming boys and girls are equally likely, the probability that exactly one of them is a ${other} is:`;
      correct = frac(n, p2n);
      expl = tex`The single ${other} can be any of the ${n} children: $P = ${n} \times \left(\frac{1}{2}\right)^{${n}} = ${correct.toTex()}$.`;
    } else {
      stem = `A couple already has ${n} ${sex} and no other children. The probability that their next child is also a ${one} is:`;
      correct = frac(1, 2);
      expl = tex`Sex depends only on whether the fertilising sperm carries X or Y (equally likely); earlier births do not affect it, so $P = \frac{1}{2}$.`;
    }
    const { answer, distractors } = fractionOptions(correct, [
      frac(1, 2),
      frac(1, p2n),
      frac(1, 2 ** (n + 1)),
      frac(n, p2n),
      frac(1, n),
      frac(1, 2 ** (n - 1)),
      frac(1, n + 1),
    ]);
    return { stem, answer, distractors, explanation: expl };
  }),

  b.dynamic('meiosis-gamete-combinations', { difficulty: 1, tags: ['Mendelian genetics', 'mitosis and meiosis'] }, (r) => {
    const m = r.int(3, 5);
    const k = r.int(2, m);
    const genes = GENE_LETTERS.slice(0, m);
    const hetero = new Set(pickOrdered(r, genes, k));
    const geno = genes
      .map((G) => (hetero.has(G) ? `${G}${G.toLowerCase()}` : r.chance(0.5) ? `${G}${G}` : `${G.toLowerCase()}${G.toLowerCase()}`))
      .join('');
    const kind = r.weighted(['gametes', 'phenotypes', 'genotypes'] as const, [3, 2, 2]);
    const hybrid = genes.slice(0, k).map((G) => `${G}${G.toLowerCase()}`).join('');
    let stem: string;
    let correct: number;
    let wrong: number[];
    let expl: string;
    if (kind === 'gametes') {
      stem = tex`Assuming independent assortment, how many genetically different kinds of gametes can an individual of genotype $${geno}$ produce?`;
      correct = 2 ** k;
      wrong = [2 ** m, 2 * k, 3 ** k, 4 ** k];
      expl = tex`Only heterozygous gene pairs give a choice of allele. Here ${k} pairs are heterozygous, so kinds of gametes $= 2^{${k}} = ${correct}$.`;
    } else if (kind === 'phenotypes') {
      stem = tex`Two individuals of genotype $${hybrid}$ are crossed with each other (genes assort independently, complete dominance). The number of different phenotypes in the offspring is:`;
      correct = 2 ** k;
      wrong = [3 ** k, 4 ** k, 2 * k, 3 * k];
      expl = tex`Each heterozygous gene gives 2 phenotypes (dominant or recessive), so phenotypes $= 2^{${k}} = ${correct}$.`;
    } else {
      stem = tex`Two individuals of genotype $${hybrid}$ are crossed with each other (genes assort independently). The number of different genotypes in the offspring is:`;
      correct = 3 ** k;
      wrong = [2 ** k, 4 ** k, 3 * k, 2 * k];
      expl = tex`Each heterozygous gene gives 3 genotypes (e.g. $AA$, $Aa$, $aa$), so genotypes $= 3^{${k}} = ${correct}$.`;
    }
    const { answer, distractors } = numericOptions(r, { correct, wrong, format: int$ });
    return { stem, answer, distractors, explanation: expl };
  }),

  // ---- Hardy-Weinberg -------------------------------------------------------------
  b.dynamic('hardy-weinberg-frequencies', { difficulty: 2, tags: ['Mendelian genetics'] }, (r) => {
    // q = 0.5 is excluded: p = q makes most mistake-based distractors coincide
    const q = r.pick([0.1, 0.2, 0.3, 0.4, 0.6, 0.7]);
    const p = Math.round((1 - q) * 10) / 10;
    const q2 = Math.round(q * q * 100) / 100;
    const p2 = Math.round(p * p * 100) / 100;
    const pq2 = Math.round(2 * p * q * 100) / 100;
    const ask = r.pick(['hetero', 'p', 'homodom', 'q'] as const);
    const fmt = (x: number): string => `$${num(x, { dp: 2 })}$`;
    const table = {
      hetero: { what: 'heterozygous individuals', v: pq2, wrong: [p * q, q, p, p2, 1 - q2], f: tex`2pq = 2(${p})(${q}) = ${num(pq2)}` },
      p: { what: 'the dominant allele', v: p, wrong: [q, 1 - q2, p2, q2, pq2], f: tex`p = 1 - q = 1 - ${q} = ${p}` },
      homodom: { what: 'homozygous dominant individuals', v: p2, wrong: [1 - q2, p, pq2, q], f: tex`p^2 = (${p})^2 = ${num(p2)}` },
      q: { what: 'the recessive allele', v: q, wrong: [q2, p, pq2, q / 2], f: tex`q = ${q}` },
    } as const;
    const row = table[ask];
    const { answer, distractors } = numericOptions(r, { correct: row.v, wrong: row.wrong.map((x) => Math.round(x * 100) / 100), format: fmt });
    return {
      stem: `In a large randomly mating population in Hardy-Weinberg equilibrium, ${num(q2 * 100)}% of individuals show the recessive phenotype (aa). The frequency of ${row.what} is:`,
      answer,
      distractors,
      explanation: tex`$q^2 = ${num(q2)}$, so $q = \sqrt{${num(q2)}} = ${q}$ and $p = ${p}$ (since $p + q = 1$). Then $${row.f}$.`,
    };
  }),

  // ---- DNA structure and replication ----------------------------------------------
  b.dynamic('chargaff-base-percentage', { difficulty: 1, origin: 'past-paper', tags: ['DNA structure and replication'] }, (r) => {
    const bases = ['adenine', 'thymine', 'guanine', 'cytosine'] as const;
    const partner = { adenine: 'thymine', thymine: 'adenine', guanine: 'cytosine', cytosine: 'guanine' } as const;
    const given = r.pick(bases);
    const x = r.intExcept(10, 40, [25]);
    const kind = r.weighted(['other', 'partner', 'purines'] as const, [5, 2, 1]);
    const others = bases.filter((s) => s !== given && s !== partner[given]);
    let what: string;
    let correct: number;
    let wrong: number[];
    if (kind === 'partner') {
      what = partner[given];
      correct = x;
      wrong = [50 - x, 100 - x, 100 - 2 * x];
    } else if (kind === 'other') {
      what = r.pick(others);
      correct = 50 - x;
      wrong = [x, 100 - x, 100 - 2 * x, 2 * x];
    } else {
      what = 'purines (A + G)';
      correct = 50;
      wrong = [x, 2 * x, 50 - x, 100 - x];
    }
    const { answer, distractors } = numericOptions(r, { correct, wrong, format: pct$ });
    const expl =
      kind === 'purines'
        ? tex`Every purine pairs with a pyrimidine ($A = T$, $G = C$), so purines always make up $50\%$ of double-stranded DNA.`
        : tex`Chargaff's rule: $A = T$ and $G = C$. Given ${given} $= ${x}\%$, its partner ${partner[given]} $= ${x}\%$; the remaining $100 - 2(${x}) = ${100 - 2 * x}\%$ is split equally, so ${others[0]} $=$ ${others[1]} $= ${50 - x}\%$.`;
    return {
      stem: `A sample of double-stranded DNA contains ${x}% ${given}. The percentage of ${what} in it is:`,
      answer,
      distractors,
      explanation: expl,
    };
  }),

  b.dynamic('dna-base-pair-count', { difficulty: 2, tags: ['DNA structure and replication'] }, (r) => {
    const bp = r.multiple(200, 2000, 50);
    const at = r.multiple(Math.round(bp * 0.2), Math.round(bp * 0.8), 10);
    const gc = bp - at;
    const kind = r.pick(['hbonds', 'guanine', 'nucleotides'] as const);
    let stem: string;
    let correct: number;
    let wrong: number[];
    let expl: string;
    if (kind === 'hbonds') {
      stem = `A double-stranded DNA segment has ${bp} base pairs, of which ${at} are A-T pairs. The total number of hydrogen bonds between its two strands is:`;
      correct = 2 * at + 3 * gc;
      wrong = [3 * at + 2 * gc, 2 * bp, 3 * bp, 2 * at + 2 * gc + gc / 2];
      expl = tex`A-T pairs have 2 and G-C pairs 3 hydrogen bonds: $2(${at}) + 3(${gc}) = ${correct}$.`;
    } else if (kind === 'guanine') {
      stem = `A double-stranded DNA molecule has ${2 * bp} nucleotides in all, of which ${at} contain adenine. The number of guanine nucleotides is:`;
      correct = bp - at;
      wrong = [2 * bp - at, 2 * bp - 2 * at, at, (2 * bp - at) / 2];
      expl = tex`$A = T = ${at}$, so $G + C = ${2 * bp} - 2(${at}) = ${2 * gc}$ and $G = ${2 * gc}/2 = ${gc}$.`;
    } else {
      stem = `A double-stranded DNA segment has ${bp} base pairs. The number of deoxyribose sugar molecules in it is:`;
      correct = 2 * bp;
      wrong = [bp, 4 * bp, bp / 2, 3 * bp];
      expl = tex`Each base pair has two nucleotides and each nucleotide has one deoxyribose: $2 \times ${bp} = ${correct}$.`;
    }
    const { answer, distractors } = numericOptions(r, { correct, wrong: wrong.filter(Number.isInteger), format: int$ });
    return { stem, answer, distractors, explanation: expl };
  }),

  b.dynamic('semiconservative-replication', { difficulty: 2, tags: ['DNA structure and replication'] }, (r) => {
    const g = r.int(2, 5);
    const total = 2 ** g;
    const kind = r.pick(['hybrid', 'light', 'count15'] as const);
    let correct: Fraction | number;
    let what: string;
    if (kind === 'hybrid') {
      correct = frac(2, total);
      what = tex`fraction of DNA molecules that are hybrid ($^{15}\mathrm{N}/^{14}\mathrm{N}$)`;
    } else if (kind === 'light') {
      correct = frac(total - 2, total);
      what = tex`fraction of DNA molecules that contain only $^{14}\mathrm{N}$`;
    } else {
      correct = 2;
      what = tex`number of DNA molecules that still contain some $^{15}\mathrm{N}$`;
    }
    const stem = tex`One DNA molecule labelled with $^{15}\mathrm{N}$ in both strands replicates ${g} times in a medium containing only $^{14}\mathrm{N}$. Assuming semi-conservative replication, the ${what} is:`;
    const base = tex`After ${g} replications there are $2^{${g}} = ${total}$ molecules. The two original $^{15}\mathrm{N}$ strands are never broken up, so exactly 2 molecules are hybrid and ${total - 2} are light.`;
    if (typeof correct === 'number') {
      const { answer, distractors } = numericOptions(r, { correct, wrong: [0, total, total / 2, 1], format: int$, allowZero: true });
      return { stem, answer, distractors, explanation: base };
    }
    const { answer, distractors } = fractionOptions(correct, [
      frac(1, total),
      frac(2, total),
      frac(total - 2, total),
      frac(total - 1, total),
      frac(1, 2),
      frac(0),
    ]);
    return { stem, answer, distractors, explanation: tex`${base} Required fraction $= ${correct.toTex()}$.` };
  }),

  // ---- Protein synthesis ----------------------------------------------------------
  b.dynamic('codon-amino-acid-count', { difficulty: 1, tags: ['protein synthesis'] }, (r) => {
    const k = r.int(40, 400);
    const kind = r.pick(['peptide', 'aaFromMrna', 'mrnaFromAa', 'dnaFromAa'] as const);
    let stem: string;
    let correct: number;
    let wrong: number[];
    let expl: string;
    if (kind === 'peptide') {
      stem = `A polypeptide consists of ${k} amino acids in a single chain. The number of peptide bonds in it is:`;
      correct = k - 1;
      wrong = [k, k + 1, 3 * k, k - 2];
      expl = tex`Adjacent amino acids are joined by one peptide bond each, so $n$ amino acids form $n - 1$ bonds: $${k} - 1 = ${k - 1}$.`;
    } else if (kind === 'aaFromMrna') {
      const n = 3 * (k + 1);
      stem = `The coding region of an mRNA, from the start codon AUG up to and including the stop codon, has ${n} nucleotides. The number of amino acids in the polypeptide it codes for is:`;
      correct = k;
      wrong = [k + 1, n, k + 2, 2 * (k + 1)];
      expl = tex`Codons $= ${n}/3 = ${k + 1}$. The stop codon codes for no amino acid, so amino acids $= ${k + 1} - 1 = ${k}$.`;
    } else if (kind === 'mrnaFromAa') {
      stem = `What is the minimum number of mRNA nucleotides needed to code for a polypeptide of ${k} amino acids (not counting the stop codon)?`;
      correct = 3 * k;
      wrong = [k, 6 * k, 3 * k + 3, 2 * k];
      expl = tex`Each amino acid is coded by a triplet codon: $3 \times ${k} = ${3 * k}$ nucleotides.`;
    } else {
      stem = `Counting both strands of DNA, what is the minimum number of nucleotides in a gene coding for a polypeptide of ${k} amino acids (ignore the stop codon and introns)?`;
      correct = 6 * k;
      wrong = [3 * k, k, 2 * k, 12 * k];
      expl = tex`The template strand needs $3 \times ${k} = ${3 * k}$ nucleotides; with its complementary strand the total is $2 \times ${3 * k} = ${6 * k}$.`;
    }
    const { answer, distractors } = numericOptions(r, { correct, wrong, format: int$ });
    return { stem, answer, distractors, explanation: expl };
  }),

  // ---- Mitosis and meiosis ----------------------------------------------------------
  b.dynamic('chromosome-number-at-stage', { difficulty: 2, origin: 'past-paper', tags: ['mitosis and meiosis'] }, (r) => {
    const org = r.pick([
      { name: 'a human', d: 46 },
      { name: 'the garden pea', d: 14 },
      { name: 'onion', d: 16 },
      { name: 'the fruit fly (*Drosophila*)', d: 8 },
      { name: 'maize', d: 20 },
      { name: 'rice', d: 24 },
      { name: 'the chimpanzee', d: 48 },
      { name: 'the dog', d: 78 },
    ]);
    const D = org.d;
    const n = D / 2;
    const stages = [
      { q: 'chromosomes in a cell at metaphase of mitosis', v: D, why: 'Chromosomes have not yet separated, so there are $2n$' },
      { q: 'chromatids in a cell at metaphase of mitosis', v: 2 * D, why: 'Each of the $2n$ chromosomes has two chromatids, giving $4n$' },
      { q: 'chromosomes in a cell at anaphase of mitosis', v: 2 * D, why: 'Sister chromatids separate and each becomes a chromosome, so the cell briefly holds $4n$' },
      { q: 'chromosomes in each daughter cell after mitosis', v: D, why: 'Mitosis keeps the chromosome number unchanged at $2n$' },
      { q: 'bivalents (tetrads) in a cell at prophase I of meiosis', v: n, why: 'Each homologous pair forms one bivalent, giving $n$' },
      { q: 'chromatids in a cell at metaphase I of meiosis', v: 2 * D, why: 'The $2n$ chromosomes are still double, giving $4n$ chromatids' },
      { q: 'chromosomes in each cell at metaphase II of meiosis', v: n, why: 'Meiosis I has already halved the number to $n$' },
      { q: 'chromosomes in each cell at anaphase II of meiosis', v: D, why: 'Chromatids of the $n$ chromosomes separate, so the cell briefly has $2n$' },
      { q: 'chromosomes in each gamete', v: n, why: 'Gametes are haploid, with $n$ chromosomes' },
    ];
    const s = r.pick(stages);
    const { answer, distractors } = numericOptions(r, {
      correct: s.v,
      wrong: r.shuffle([n, D, 2 * D, 4 * D, n / 2].filter(Number.isInteger)),
      format: int$,
    });
    return {
      stem: `The diploid chromosome number of ${org.name} is $2n = ${D}$. The number of ${s.q} is:`,
      answer,
      distractors,
      explanation: tex`${s.why}. With $n = ${n}$, the number is $${s.v}$.`,
    };
  }),

  b.dynamic('dna-content-cell-cycle', { difficulty: 2, tags: ['mitosis and meiosis'] }, (r) => {
    const x = r.multiple(4, 24, 2);
    const stages = [
      { q: 'a cell in G$_2$ phase', v: 2 * x, why: 'DNA doubles in the S phase, so G$_2$ has $2x$' },
      { q: 'a cell at metaphase of mitosis', v: 2 * x, why: 'DNA was doubled in S phase and is not yet shared out, so the cell has $2x$' },
      { q: 'each daughter cell just after mitosis', v: x, why: 'Mitosis shares the doubled DNA equally, restoring $x$' },
      { q: 'a primary spermatocyte at prophase I', v: 2 * x, why: 'Meiosis follows an S phase, so the cell has $2x$' },
      { q: 'each secondary spermatocyte (after meiosis I)', v: x, why: 'Meiosis I separates homologues, halving $2x$ to $x$' },
      { q: 'each sperm (gamete)', v: x / 2, why: 'Meiosis II halves it again to $x/2$' },
    ];
    const s = r.pick(stages);
    const { answer, distractors } = numericOptions(r, {
      correct: s.v,
      wrong: r.shuffle([x / 2, x, 2 * x, 4 * x]),
      format: (v) => tex`$${num(v)}\,\mathrm{pg}$`,
    });
    return {
      stem: tex`A diploid nucleus of an animal in G$_1$ phase contains $${x}\,\mathrm{pg}$ of DNA. The amount of nuclear DNA in ${s.q} is:`,
      answer,
      distractors,
      explanation: tex`Let $x = ${x}\,\mathrm{pg}$ (G$_1$). ${s.why}, i.e. $${num(s.v)}\,\mathrm{pg}$.`,
    };
  }),

  b.dynamic('meiotic-divisions-needed', { difficulty: 2, origin: 'past-paper', tags: ['mitosis and meiosis'] }, (r) => {
    const n = r.multiple(20, 400, 4);
    const kind = r.pick(['sperm', 'egg', 'pollen', 'seed'] as const);
    let what: string;
    let correct: number;
    let expl: string;
    if (kind === 'sperm') {
      what = `${n} sperms`;
      correct = n / 4;
      expl = tex`One meiosis of a primary spermatocyte gives 4 sperms: $${n}/4 = ${correct}$.`;
    } else if (kind === 'egg') {
      what = `${n} ova (egg cells)`;
      correct = n;
      expl = tex`One meiosis of a primary oocyte gives only 1 ovum (the other products are polar bodies), so ${n} meioses are needed.`;
    } else if (kind === 'pollen') {
      what = `${n} pollen grains in a flowering plant`;
      correct = n / 4;
      expl = tex`Each microspore mother cell gives 4 microspores (pollen grains) by one meiosis: $${n}/4 = ${correct}$.`;
    } else {
      what = `${n} seeds in a flowering plant (each seed from one fertilised ovule)`;
      correct = n + n / 4;
      expl = tex`Each seed needs one egg (one megaspore mother cell meiosis gives one functional megaspore) and one pollen grain ($\frac{1}{4}$ meiosis): $${n} + ${n}/4 = ${correct}$.`;
    }
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [n / 4, n, n / 2, n + n / 4, 2 * n],
      format: int$,
    });
    return {
      stem: `How many meiotic divisions (counting each complete meiosis as one) are needed to produce ${what}?`,
      answer,
      distractors,
      explanation: expl,
    };
  }),

  // ---- Linkage ------------------------------------------------------------------
  b.dynamic('linkage-recombination-frequency', { difficulty: 2, tags: ['linkage'] }, (r) => {
    if (r.chance(0.5)) {
      const total = r.pick([200, 400, 500, 800, 1000]);
      let rf: number;
      do rf = r.pick([4, 5, 6, 8, 10, 12, 15, 16, 20, 24, 25, 30]);
      while (((rf * total) / 100) % 2 !== 0);
      const rec = (rf * total) / 100;
      const par = total - rec;
      const r1 = rec / 2 + r.int(-2, 2) * (rec >= 20 ? 1 : 0);
      const p1 = par / 2 + r.int(-6, 6);
      const counts = [p1, par - p1, r1, rec - r1];
      const { answer, distractors } = numericOptions(r, {
        correct: rf,
        wrong: [100 - rf, rf / 2, rf * 2, Math.round((r1 / total) * 1000) / 10],
        format: (v) => `$${num(v, { dp: 1 })}$ map units`,
      });
      return {
        stem: tex`A test cross $AaBb\,(AB/ab) \times aabb$ gives ${counts[0]} $AaBb$, ${counts[1]} $aabb$, ${counts[2]} $Aabb$ and ${counts[3]} $aaBb$ offspring. The distance between genes $A$ and $B$ is:`,
        answer,
        distractors,
        explanation: tex`$Aabb$ and $aaBb$ are recombinants. Recombination frequency $= \frac{${counts[2]} + ${counts[3]}}{${total}} \times 100 = ${rf}\%$, and 1% recombination = 1 map unit (cM).`,
      };
    }
    const d = r.pick([4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 30, 36, 40]);
    const recombinant = r.chance(0.5);
    const correct = recombinant ? d / 2 : (100 - d) / 2;
    const gamete = recombinant ? 'Ab' : 'AB';
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: recombinant ? [d, (100 - d) / 2, 100 - d, 25] : [100 - d, d / 2, d, 25],
      format: pct$,
    });
    return {
      stem: tex`Genes $A$ and $B$ are ${d} map units apart on the same chromosome. A plant of genotype $AB/ab$ (coupling) is expected to produce what percentage of $${gamete}$ gametes?`,
      answer,
      distractors,
      explanation: recombinant
        ? tex`${d} map units means ${d}% recombinant gametes, shared equally by $Ab$ and $aB$: $${d}/2 = ${correct}\%$.`
        : tex`Parental gametes make up $100 - ${d} = ${100 - d}\%$, shared equally by $AB$ and $ab$: $${100 - d}/2 = ${correct}\%$.`,
    };
  }),

  // ---- Fixed computational items -----------------------------------------------------
  ...b.mcqs([
    {
      id: 'dihybrid-test-cross-ratio', d: 1, o: 'past-paper', t: ['Mendelian genetics'],
      q: tex`The phenotypic ratio expected from the test cross $AaBb \times aabb$ (independent assortment) is:`,
      a: '1 : 1 : 1 : 1',
      x: ['9 : 3 : 3 : 1', '3 : 1', '1 : 2 : 1'],
      e: tex`$AaBb$ makes four gamete types ($AB$, $Ab$, $aB$, $ab$) in equal numbers; each combines with $ab$, giving four phenotypes in a $1:1:1:1$ ratio.`,
    },
    {
      id: 'incomplete-dominance-f2-ratio', d: 1, o: 'past-paper', t: ['Mendelian genetics'],
      q: 'In incomplete dominance, the phenotypic ratio of the F2 generation of a monohybrid cross is:',
      a: '1 : 2 : 1',
      x: ['3 : 1', '1 : 1', '9 : 3 : 3 : 1'],
      e: 'The heterozygote has an intermediate phenotype, so the phenotypic ratio equals the genotypic ratio 1 : 2 : 1 (e.g. red : pink : white).',
    },
    {
      id: 'linkage-groups-drosophila', d: 1, t: ['linkage'],
      q: tex`*Drosophila melanogaster* has $2n = 8$. The number of linkage groups in it is:`,
      a: '4',
      x: ['8', '2', '16'],
      e: 'All genes on one chromosome form one linkage group, so the number of linkage groups equals the haploid number, n = 4.',
    },
    {
      id: 'abo-genotype-count', d: 1, t: ['Mendelian genetics'],
      q: tex`With three alleles ($I^{A}$, $I^{B}$ and $i$), how many different genotypes are possible for the ABO blood group?`,
      a: '6',
      x: ['4', '3', '9'],
      e: tex`Three alleles give 3 homozygotes ($I^{A}I^{A}$, $I^{B}I^{B}$, $ii$) and 3 heterozygotes ($I^{A}i$, $I^{B}i$, $I^{A}I^{B}$): 6 genotypes but only 4 phenotypes.`,
    },
    {
      id: 'epistasis-mice-ratio', d: 2, t: ['Mendelian genetics'],
      q: tex`In mice, agouti coat ($A$) is dominant to black ($a$), but the recessive genotype $cc$ gives an albino mouse whatever the $A$ alleles are. The ratio of agouti : black : albino among the offspring of $AaCc \times AaCc$ is:`,
      a: '9 : 3 : 4',
      x: ['9 : 7', '12 : 3 : 1', '9 : 3 : 3 : 1'],
      e: tex`This is recessive epistasis: $A\_C\_$ (9) agouti, $aaC\_$ (3) black, and $A\_cc$ (3) plus $aacc$ (1) albino, giving $9 : 3 : 4$.`,
    },
    {
      id: 'polygenic-wheat-ratio', d: 3, t: ['Mendelian genetics'],
      q: 'Kernel colour in wheat is controlled by two pairs of additive (polygenic) genes. The F2 phenotypic ratio from dark red × white parents is:',
      a: '1 : 4 : 6 : 4 : 1',
      x: ['9 : 3 : 3 : 1', '1 : 6 : 15 : 20 : 15 : 6 : 1', '1 : 2 : 1'],
      e: 'Phenotype depends on the number of dominant (colour) alleles, from 4 to 0. Their frequencies in the F2 follow 1 : 4 : 6 : 4 : 1 (the seven-class ratio needs three gene pairs).',
    },
  ]),
]);
