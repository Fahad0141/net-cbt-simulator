import { defineBank } from '@/engine/authoring';
import { num, numericOptions, q$, qty, statementQuestion, tex, U } from '@/engine/helpers';

/** A statement with the reason it is true, or the correction that shows it is false. */
interface Claim {
  s: string;
  why: string;
}

const claimText = (c: Claim): string => c.s;
const reasonOf = (list: readonly Claim[], text: string): string =>
  list.find((c) => c.s === text)?.why ?? '';

// ---------------------------------------------------------------- chromatography pools

const CHROM_TRUE: readonly Claim[] = [
  {
    s: 'Paper chromatography is a form of partition chromatography.',
    why: 'In paper chromatography the solutes are partitioned between water held by the paper (stationary phase) and the moving solvent (mobile phase).',
  },
  {
    s: tex`The $R_f$ value of a substance can never exceed 1.`,
    why: tex`$R_f = \dfrac{\text{distance moved by the substance}}{\text{distance moved by the solvent front}}$, and a substance cannot travel farther than the solvent that carries it.`,
  },
  {
    s: 'A component that is more soluble in the mobile phase moves farther up the paper.',
    why: 'A component that spends more time in the moving solvent is carried farther, so it has a larger Rf value.',
  },
  {
    s: tex`The $R_f$ value of a substance has no units.`,
    why: tex`$R_f$ is a ratio of two distances, so the units cancel.`,
  },
  {
    s: 'Column chromatography on alumina works on the principle of adsorption.',
    why: 'In column (adsorption) chromatography the components are held on the surface of a solid such as alumina or silica gel to different extents.',
  },
  {
    s: 'Colourless spots on a chromatogram can be located by spraying them with a suitable reagent.',
    why: 'Colourless components are made visible with a locating reagent, for example ninhydrin for amino acids.',
  },
];

const CHROM_FALSE: readonly Claim[] = [
  {
    s: 'In paper chromatography the developing solvent is the stationary phase.',
    why: 'The developing solvent moves up the paper, so it is the mobile phase; the stationary phase is the water held by the paper.',
  },
  {
    s: tex`The $R_f$ value of a substance can be greater than 1.`,
    why: tex`A substance can never move beyond the solvent front, so $R_f \le 1$ (in practice $R_f < 1$).`,
  },
  {
    s: tex`The $R_f$ value is measured in centimetres.`,
    why: tex`$R_f$ is a ratio of two distances and is therefore dimensionless.`,
  },
  {
    s: 'The component most strongly held by the stationary phase moves the farthest.',
    why: 'A component held strongly by the stationary phase lags behind and moves the least distance.',
  },
  {
    s: 'Chromatography can only separate coloured substances.',
    why: 'The name comes from early work on coloured pigments, but colourless substances such as amino acids and sugars are also separated and then located with reagents.',
  },
  {
    s: 'Paper chromatography is a form of adsorption chromatography.',
    why: 'Paper chromatography is partition chromatography; adsorption chromatography uses a solid adsorbent such as alumina in a column.',
  },
];

// ---------------------------------------------------------------- general technique pools

const TECH_TRUE: readonly Claim[] = [
  {
    s: 'Fluting a filter paper increases the rate of filtration.',
    why: 'Folds expose more of the paper surface to the liquid, so filtration is faster.',
  },
  {
    s: 'Slow cooling of a hot saturated solution gives larger and purer crystals.',
    why: 'Slow growth lets molecules settle into the lattice in order and leaves impurities in the mother liquor.',
  },
  {
    s: 'Animal charcoal is used to remove coloured impurities during crystallization.',
    why: 'Animal charcoal adsorbs coloured impurities from the hot solution and is then filtered off.',
  },
  {
    s: 'In sublimation a solid changes directly into vapour without melting.',
    why: 'Sublimation is the direct conversion of a solid into vapour; on cooling, the vapour gives back the pure solid.',
  },
  {
    s: 'Several extractions with small volumes of solvent remove more solute than one extraction with the same total volume.',
    why: 'By the distribution law each extraction removes a fixed fraction of what remains, so repeated small extractions are more efficient.',
  },
  {
    s: 'A Gooch crucible is used for precipitates that must be ignited at high temperature.',
    why: 'A porcelain Gooch crucible with an asbestos mat withstands strong heating, whereas filter paper would burn.',
  },
];

const TECH_FALSE: readonly Claim[] = [
  {
    s: 'A good crystallization solvent dissolves the solute readily even when cold.',
    why: 'If the solute were very soluble when cold, little of it would crystallize on cooling; it should dissolve readily only when hot.',
  },
  {
    s: 'Rapid cooling of a saturated solution gives large, well-formed crystals.',
    why: 'Rapid cooling gives many small crystals that may trap impurities; large crystals need slow cooling.',
  },
  {
    s: 'Filter paper is suitable for filtering hot acidified potassium permanganate solution.',
    why: tex`Strongly oxidizing solutions such as acidified $\ce{KMnO4}$ attack the paper; a sintered glass crucible is used instead.`,
  },
  {
    s: 'In solvent extraction the two solvents must be completely miscible.',
    why: 'The two solvents must be immiscible so that they form separate layers in the separating funnel.',
  },
  {
    s: 'Sodium chloride can be purified by sublimation.',
    why: tex`$\ce{NaCl}$ is an ionic solid with a very high melting point and does not sublime; it is purified by crystallization.`,
  },
  {
    s: 'One extraction with a large volume of solvent is more efficient than several with small volumes.',
    why: 'The reverse is true: by the distribution law, repeated extractions with small portions remove more solute.',
  },
];

// ---------------------------------------------------------------- mixtures and techniques

type Technique = 'Filtration' | 'Crystallization' | 'Sublimation' | 'Solvent extraction' | 'Chromatography';

interface Mixture {
  task: string;
  answer: Technique;
  /** Techniques that are clearly unsuitable (at least three). */
  wrong: readonly Technique[];
  why: string;
}

const MIXTURES: readonly Mixture[] = [
  {
    task: 'removing sand suspended in water',
    answer: 'Filtration',
    wrong: ['Crystallization', 'Sublimation', 'Solvent extraction', 'Chromatography'],
    why: 'Sand is insoluble, so it is held back by the filter paper while water passes through.',
  },
  {
    task: tex`separating a precipitate of $\ce{BaSO4}$ from the solution in which it was formed`,
    answer: 'Filtration',
    wrong: ['Crystallization', 'Sublimation', 'Solvent extraction', 'Chromatography'],
    why: tex`$\ce{BaSO4}$ is insoluble, so it is collected on a filter (or Gooch crucible) as the residue.`,
  },
  {
    task: tex`separating $\ce{NH4Cl}$ from $\ce{NaCl}$`,
    answer: 'Sublimation',
    wrong: ['Filtration', 'Solvent extraction', 'Chromatography'],
    why: tex`On heating, $\ce{NH4Cl}$ passes into the vapour state and deposits again on a cool surface, while $\ce{NaCl}$ stays behind.`,
  },
  {
    task: 'separating iodine from sand',
    answer: 'Sublimation',
    wrong: ['Filtration', 'Crystallization', 'Chromatography'],
    why: 'Iodine sublimes on gentle heating and is collected as crystals on a cold surface; sand is left behind.',
  },
  {
    task: 'separating camphor from sand',
    answer: 'Sublimation',
    wrong: ['Filtration', 'Crystallization', 'Chromatography'],
    why: 'Camphor sublimes on heating and condenses on a cool surface; sand does not.',
  },
  {
    task: 'obtaining pure crystals of copper(II) sulphate from an impure sample',
    answer: 'Crystallization',
    wrong: ['Sublimation', 'Solvent extraction', 'Chromatography'],
    why: 'The impure salt is dissolved in hot water, filtered and cooled slowly; pure crystals separate and soluble impurities stay in the mother liquor.',
  },
  {
    task: 'recovering iodine from its aqueous solution using carbon tetrachloride',
    answer: 'Solvent extraction',
    wrong: ['Filtration', 'Sublimation', 'Chromatography'],
    why: tex`Iodine is far more soluble in $\ce{CCl4}$ than in water; shaking the two immiscible liquids in a separating funnel transfers it to the $\ce{CCl4}$ layer.`,
  },
  {
    task: 'separating the coloured dyes present in a drop of ink',
    answer: 'Chromatography',
    wrong: ['Filtration', 'Sublimation', 'Crystallization'],
    why: 'The dyes are partitioned to different extents between the stationary and mobile phases, so they travel different distances.',
  },
  {
    task: 'identifying the amino acids in a protein hydrolysate',
    answer: 'Chromatography',
    wrong: ['Filtration', 'Sublimation', 'Crystallization'],
    why: 'Paper chromatography separates the amino acids, which are then located with ninhydrin and identified by their Rf values.',
  },
  {
    task: 'separating the pigments in a leaf extract',
    answer: 'Chromatography',
    wrong: ['Filtration', 'Sublimation', 'Crystallization'],
    why: 'Plant pigments were the first mixture separated by chromatography (Tswett); each pigment moves a different distance.',
  },
];

export default defineBank('chemistry', 'experimental-techniques', (b) => [
  // ---------------------------------------------------------------- dynamic
  b.dynamic('rf-value', { difficulty: 1, origin: 'past-paper', tags: ['chromatography'] }, (r) => {
    const front = r.pick([6, 8, 10, 12, 14, 16, 18, 20]); // even, so spot distance has one decimal
    const k = r.intExcept(3, 18, [10]); // Rf = k/20, avoid 0.5 where Rf = 1 - Rf
    const rf = k / 20;
    const spot = Number((rf * front).toFixed(1));

    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: rf,
        wrong: [front / spot, 1 - rf, (front - spot) / spot], // inverted ratio, used front - spot
        format: (x) => `$${num(x)}$`,
        fallback: 'scale',
      });
      return {
        stem: tex`In a paper chromatogram the solvent front travels $${qty(front, U.cm)}$ from the base line and a spot travels $${qty(spot, U.cm)}$. The $R_f$ value of the substance is:`,
        answer,
        distractors,
        explanation: tex`$R_f = \dfrac{\text{distance moved by substance}}{\text{distance moved by solvent front}} = \dfrac{${num(spot)}}{${front}} = ${num(rf)}$.`,
      };
    }

    const { answer, distractors } = numericOptions(r, {
      correct: spot,
      wrong: [front / rf, front * (1 - rf), front - rf], // divided by Rf, used 1 - Rf, subtracted
      format: (x) => q$(x, U.cm),
      fallback: 'scale',
    });
    return {
      stem: tex`A substance has $R_f = ${num(rf)}$ in a certain solvent. If the solvent front moves $${qty(front, U.cm)}$, the spot of the substance moves:`,
      answer,
      distractors,
      explanation: tex`Distance moved by substance $= R_f \times$ distance moved by solvent front $= ${num(rf)} \times ${front} = ${qty(spot, U.cm)}$.`,
    };
  }),

  b.dynamic('distribution-extraction', { difficulty: 2, tags: ['solvent extraction'] }, (r) => {
    const K = r.pick([2, 3, 4, 5, 7, 9]);
    const n = r.int(1, 6);
    const total = (K + 1) * n; // grams; mass in ether = K n, mass in water = n
    const vol = r.pick([50, 100, 200, 250]);
    const ether = K * n;
    const { answer, distractors } = numericOptions(r, {
      correct: ether,
      wrong: [n, total / K, total / 2, total], // water layer, divided by K, ignored K, assumed complete extraction
      format: (x) => q$(x, U.g),
      fallback: 'scale',
    });
    return {
      stem: tex`An organic compound has a distribution coefficient $K = \dfrac{C_{\text{ether}}}{C_{\text{water}}} = ${K}$. If $${qty(total, U.g)}$ of it, dissolved in $${vol}\,\mathrm{cm^{3}}$ of water, is shaken once with $${vol}\,\mathrm{cm^{3}}$ of ether, the mass extracted into the ether is:`,
      answer,
      distractors,
      explanation: tex`Equal volumes, so the masses are in the ratio $m_{\text{ether}} : m_{\text{water}} = K : 1 = ${K} : 1$. Hence $m_{\text{ether}} = \dfrac{K}{K+1} \times ${total} = \dfrac{${K}}{${K + 1}} \times ${total} = ${qty(ether, U.g)}$ (and $${qty(n, U.g)}$ stays in the water).`,
    };
  }),

  b.dynamic(
    'technique-for-mixture',
    { difficulty: 1, origin: 'past-paper', tags: ['filtration', 'crystallization', 'sublimation', 'solvent extraction', 'chromatography'] },
    (r) => {
      const m = r.pick(MIXTURES);
      return {
        stem: `The most suitable technique for ${m.task} is:`,
        answer: m.answer,
        distractors: r.sample(m.wrong, 3),
        explanation: `${m.answer}. ${m.why}`,
      };
    },
  ),

  b.dynamic('chromatography-statements', { difficulty: 2, tags: ['chromatography'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which statement about chromatography is correct?',
      negativeStem: 'Which statement about chromatography is NOT correct?',
      truths: CHROM_TRUE.map(claimText),
      falsehoods: CHROM_FALSE.map(claimText),
      explain: (answer, inverted) =>
        inverted
          ? `This statement is false. ${reasonOf(CHROM_FALSE, answer)}`
          : `This statement is true. ${reasonOf(CHROM_TRUE, answer)}`,
    }),
  ),

  b.dynamic(
    'separation-statements',
    { difficulty: 2, tags: ['filtration', 'crystallization', 'sublimation', 'solvent extraction'] },
    (r) =>
      statementQuestion(r, {
        stem: 'Which statement about laboratory separation techniques is correct?',
        negativeStem: 'Which statement about laboratory separation techniques is NOT correct?',
        truths: TECH_TRUE.map(claimText),
        falsehoods: TECH_FALSE.map(claimText),
        explain: (answer, inverted) =>
          inverted
            ? `This statement is false. ${reasonOf(TECH_FALSE, answer)}`
            : `This statement is true. ${reasonOf(TECH_TRUE, answer)}`,
      }),
  ),

  // ---------------------------------------------------------------- fixed
  ...b.mcqs([
    {
      id: 'gooch-crucible-use', d: 1, o: 'past-paper', t: ['filtration'],
      q: 'A Gooch crucible is preferred over filter paper when the precipitate:',
      a: 'Must be ignited at a high temperature',
      x: ['Is soluble in cold water', 'Is coloured', 'Must be dried at room temperature'],
      e: 'A porcelain Gooch crucible fitted with an asbestos mat can be heated strongly with the precipitate in it, whereas filter paper would char and burn.',
    },
    {
      id: 'sintered-glass-oxidant', d: 2, t: ['filtration'],
      q: 'Filter paper is NOT suitable for filtering:',
      a: tex`Hot acidified $\ce{KMnO4}$ solution`,
      x: ['A suspension of chalk in water', tex`Aqueous $\ce{NaCl}$ containing sand`, tex`A hot $\ce{CuSO4}$ solution containing insoluble dirt`],
      e: tex`Strong oxidizing agents such as acidified $\ce{KMnO4}$ attack the cellulose of filter paper, so a sintered glass crucible is used. The other mixtures are filtered through paper routinely.`,
    },
    {
      id: 'fluted-filter-paper', d: 1, t: ['filtration'],
      q: 'A filter paper is folded into a fluted form in order to:',
      a: 'Increase the rate of filtration',
      x: ['Make the filtrate more concentrated', 'Retain dissolved impurities', 'Allow the paper to be reused'],
      e: 'Fluting exposes a larger area of paper to the liquid, so the liquid passes through faster. Filter paper cannot hold back dissolved substances.',
    },
    {
      id: 'ideal-crystallization-solvent', d: 1, o: 'past-paper', t: ['crystallization'],
      q: 'An ideal solvent for crystallizing a compound should dissolve it:',
      a: 'Readily when hot and sparingly when cold',
      x: ['Readily both when hot and when cold', 'Sparingly both when hot and when cold', 'Sparingly when hot and readily when cold'],
      e: 'The compound must dissolve completely in the hot solvent and come out of solution on cooling; otherwise little or no product crystallizes.',
    },
    {
      id: 'animal-charcoal', d: 1, t: ['crystallization'],
      q: 'During crystallization, coloured impurities are removed by boiling the solution with:',
      a: 'Animal charcoal',
      x: ['Anhydrous calcium chloride', 'Sodium chloride', 'Phosphorus pentoxide'],
      e: 'Animal charcoal adsorbs coloured impurities and is then removed by filtering the hot solution. Calcium chloride and phosphorus pentoxide are drying agents.',
    },
    {
      id: 'hot-filtration-step', d: 2, t: ['crystallization', 'filtration'],
      q: 'In crystallization, insoluble impurities are removed at the stage of:',
      a: 'Filtering the hot saturated solution',
      x: ['Cooling the filtrate slowly', 'Drying the crystals in a desiccator', 'Washing the crystals with cold solvent'],
      e: 'Insoluble impurities do not dissolve in the hot solvent, so they are left on the filter paper when the hot solution is filtered. Soluble impurities remain in the mother liquor after cooling.',
    },
    {
      id: 'drying-crystals', d: 1, t: ['crystallization'],
      q: 'Crystals are commonly dried in a vacuum desiccator over:',
      a: 'Anhydrous calcium chloride',
      x: ['Sodium chloride', 'Calcium carbonate', 'Animal charcoal'],
      e: tex`Anhydrous $\ce{CaCl2}$ (like $\ce{P2O5}$ or conc. $\ce{H2SO4}$) absorbs moisture, so it serves as the drying agent. $\ce{NaCl}$ and $\ce{CaCO3}$ do not absorb water appreciably, and charcoal is a decolourizer.`,
    },
    {
      id: 'sublimable-substance', d: 1, o: 'past-paper', t: ['sublimation'],
      q: 'Which of the following can be purified by sublimation?',
      a: 'Naphthalene',
      x: ['Sodium chloride', 'Potassium nitrate', 'Glucose'],
      e: 'Naphthalene passes directly from solid to vapour on heating and condenses back as pure solid. The ionic salts melt at high temperatures without subliming, and glucose chars on heating.',
    },
    {
      id: 'separating-funnel', d: 1, o: 'past-paper', t: ['solvent extraction'],
      q: 'Solvent extraction is usually carried out in a:',
      a: 'Separating funnel',
      x: ['Gooch crucible', 'Vacuum desiccator', 'Sintered glass crucible'],
      e: 'The two immiscible liquids are shaken together in a separating funnel and the layers are then run off separately through the stopcock.',
    },
    {
      id: 'distribution-coefficient-independent', d: 2, t: ['solvent extraction'],
      q: 'The distribution coefficient of a solute between two immiscible solvents does NOT depend on:',
      a: 'The total amount of solute taken',
      x: ['The temperature', 'The nature of the solute', 'The nature of the two solvents'],
      e: 'By the distribution law, the ratio of concentrations in the two layers is constant at a given temperature for a given solute and solvent pair, whatever amount of solute is added.',
    },
    {
      id: 'ether-as-extractant', d: 2, t: ['solvent extraction'],
      q: 'Diethyl ether is widely used to extract organic compounds from water because it is:',
      a: 'Immiscible with water and easily evaporated',
      x: ['Miscible with water and non-volatile', 'Ionic and denser than water', 'A strong oxidizing agent'],
      e: 'Ether forms a separate layer with water and dissolves most organic compounds; its low boiling point (about 35 °C) lets it be removed easily, leaving the extracted compound.',
    },
    {
      id: 'tswett-chromatography', d: 1, o: 'past-paper', t: ['chromatography'],
      q: 'Chromatography was first used to separate plant pigments by:',
      a: 'Mikhail Tswett',
      x: ['Michael Faraday', 'August Kekulé', 'Fritz Haber'],
      e: 'The Russian botanist Tswett separated leaf pigments on a column of chalk in the early 1900s and named the method chromatography (colour writing).',
    },
    {
      id: 'paper-stationary-phase', d: 2, t: ['chromatography'],
      q: 'In paper chromatography, the stationary phase is:',
      a: 'Water held by the fibres of the paper',
      x: ['The developing solvent', 'The mixture being analysed', 'The vapour above the solvent'],
      e: 'Paper chromatography is partition chromatography: the solutes distribute between water held by the cellulose fibres (stationary) and the solvent moving up the paper (mobile).',
    },
    {
      id: 'larger-rf-meaning', d: 2, t: ['chromatography'],
      q: tex`In a paper chromatogram, component A has a larger $R_f$ value than component B. This means that A is:`,
      a: 'More soluble in the mobile phase than B',
      x: ['Held more strongly by the stationary phase than B', 'Present in a larger amount than B', 'Of higher molar mass than B'],
      e: tex`A larger $R_f$ means A moves farther with the solvent, so it spends more time in the mobile phase. $R_f$ does not depend on the amount of the component.`,
    },
  ]),
]);
