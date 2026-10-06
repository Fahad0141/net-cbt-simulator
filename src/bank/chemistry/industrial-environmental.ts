import { defineBank } from '@/engine/authoring';
import { ce, num, numericOptions, q$, qty, statementQuestion, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface Fertilizer {
  /** mhchem formula. */
  f: string;
  name: string;
  /** Molar mass, g mol^-1 (FSc-rounded). */
  m: number;
  /** Number of N atoms per formula unit. */
  nN: number;
  /** Working for the molar mass. */
  work: string;
  /** Smallest sample mass (g) whose nitrogen content is a whole number of grams. */
  unit: number;
  /** Largest multiplier of `unit` to use. */
  kMax: number;
  /** Atomic masses needed for the molar mass, as printed in the stem. */
  masses: string;
}

const FERTILIZERS: readonly Fertilizer[] = [
  { f: 'CO(NH2)2', name: 'urea', m: 60, nN: 2, work: '12 + 16 + 2(14 + 2)', unit: 15, kMax: 10, masses: 'H = 1, C = 12, N = 14, O = 16' },
  { f: 'NH4NO3', name: 'ammonium nitrate', m: 80, nN: 2, work: '2(14) + 4(1) + 3(16)', unit: 20, kMax: 10, masses: 'H = 1, N = 14, O = 16' },
  { f: '(NH4)2SO4', name: 'ammonium sulphate', m: 132, nN: 2, work: '2(14 + 4) + 32 + 4(16)', unit: 33, kMax: 8, masses: 'H = 1, N = 14, O = 16, S = 32' },
  { f: 'NH3', name: 'ammonia', m: 17, nN: 1, work: '14 + 3(1)', unit: 17, kMax: 6, masses: 'H = 1, N = 14' },
  { f: 'KNO3', name: 'potassium nitrate', m: 101, nN: 1, work: '39 + 14 + 3(16)', unit: 101, kMax: 3, masses: 'N = 14, O = 16, K = 39' },
  { f: 'Ca(NO3)2', name: 'calcium nitrate', m: 164, nN: 2, work: '40 + 2(14 + 3(16))', unit: 41, kMax: 6, masses: 'N = 14, O = 16, Ca = 40' },
];

interface PoolItem {
  q: string;
  a: string;
  x: readonly [string, string, string];
  e: string;
}

/** Pollutants, their sources and effects (one fact per item, hand-picked distractors). */
const POLLUTANTS: readonly PoolItem[] = [
  {
    q: 'Photochemical smog is formed mainly when sunlight acts on:',
    a: 'nitrogen oxides and unburnt hydrocarbons',
    x: ['sulphur dioxide and soot particles', 'carbon dioxide and water vapour', 'chlorofluorocarbons and methane'],
    e: tex`Sunlight splits nitrogen dioxide ($\ce{NO2 -> NO + O}$); the oxygen atoms form ozone, which reacts with hydrocarbons from vehicle exhaust to give aldehydes and PAN, the oxidizing components of photochemical smog. Smoke with $\ce{SO2}$ forms the older, reducing (London) type of smog.`,
  },
  {
    q: 'Peroxyacetyl nitrate (PAN), an eye irritant, is a component of:',
    a: 'photochemical smog',
    x: ['acid rain', 'the ozone layer', 'hard water'],
    e: 'PAN is a secondary pollutant made by reactions of nitrogen oxides with hydrocarbons in sunlight; it is typical of photochemical smog over busy cities.',
  },
  {
    q: 'The corrosion of marble buildings and statues is caused mainly by acid rain containing acids formed from:',
    a: tex`$\ce{SO2}$ and nitrogen oxides`,
    x: [tex`$\ce{CO}$ and methane`, tex`$\ce{O3}$ and $\ce{N2}$`, tex`$\ce{CH4}$ and $\ce{H2O}$`],
    e: tex`$\ce{SO2}$ and $\ce{NO_x}$ form $\ce{H2SO4}$ and $\ce{HNO3}$ in rain, which attack marble: $\ce{CaCO3 + H2SO4 -> CaSO4 + H2O + CO2}$.`,
  },
  {
    q: 'In the past, the main source of lead pollution in city air was:',
    a: 'tetraethyl lead added to petrol',
    x: ['burning of natural gas', 'chlorination of drinking water', 'decay of plant matter'],
    e: tex`Tetraethyl lead, $\ce{Pb(C2H5)4}$, was added to petrol as an anti-knock agent until it was phased out; its lead compounds left the exhaust as fine particles.`,
  },
  {
    q: 'The gas released by burning fossil fuels that contributes most to the enhanced greenhouse effect is:',
    a: tex`$\ce{CO2}$`,
    x: [tex`$\ce{N2}$`, tex`$\ce{O2}$`, tex`$\ce{Ar}$`],
    e: tex`Burning coal, oil and gas releases huge amounts of $\ce{CO2}$, which absorbs infrared radiation from the Earth. $\ce{N2}$, $\ce{O2}$ and $\ce{Ar}$ do not absorb infrared appreciably.`,
  },
  {
    q: 'High nitrate levels in drinking water are harmful because they can cause:',
    a: 'methaemoglobinaemia (blue baby syndrome) in infants',
    x: ['dental fluorosis in children', 'permanent hardness of water', 'depletion of the ozone layer'],
    e: 'Nitrate, often from excess fertilizer run-off, is reduced to nitrite in an infant\'s body; nitrite converts haemoglobin to methaemoglobin, which cannot carry oxygen.',
  },
  {
    q: 'Excessive growth of algae in lakes receiving fertilizer run-off (eutrophication) is due mainly to:',
    a: 'nitrates and phosphates',
    x: ['chlorides and sulphates', 'carbonates and silicates', 'fluorides and bromides'],
    e: 'Nitrates and phosphates are plant nutrients; they feed algal blooms, whose decay then uses up dissolved oxygen and kills fish.',
  },
];

const INDUSTRY_TRUE: ReadonlyArray<readonly [string, string]> = [
  [
    'Urea is manufactured from ammonia and carbon dioxide.',
    tex`$\ce{2NH3 + CO2 -> NH2COONH4}$ (ammonium carbamate), which then loses water to give urea, $\ce{CO(NH2)2}$.`,
  ],
  [
    'Ammonia for fertilizers is made by the Haber process using an iron catalyst.',
    tex`$\ce{N2 + 3H2 <=> 2NH3}$ over finely divided iron at about 450 °C and 200 atm.`,
  ],
  [
    'Gypsum is added to cement clinker to slow down its setting.',
    'Without gypsum, cement would set too quickly (flash set); a few per cent of gypsum regulates the setting time.',
  ],
  [
    'In the kraft process, wood chips are digested with sodium hydroxide and sodium sulphide.',
    tex`The kraft (sulphate) cooking liquor, $\ce{NaOH}$ + $\ce{Na2S}$, dissolves lignin and frees the cellulose fibres.`,
  ],
  [
    'Cracking breaks long-chain hydrocarbons into smaller, more useful molecules.',
    'Heavy fractions are cracked by heat, often with a catalyst, to give more petrol-range alkanes and alkenes.',
  ],
  [
    'A petrol with a higher octane number knocks less in an engine.',
    'Octane number measures resistance to knocking; 2,2,4-trimethylpentane is rated 100 and n-heptane 0.',
  ],
  [
    'Calcium oxide is the major constituent of Portland cement by mass.',
    tex`Lime ($\ce{CaO}$) makes up roughly 60 to 67% of Portland cement; silica is next at about 20%.`,
  ],
];

const INDUSTRY_FALSE: ReadonlyArray<readonly [string, string]> = [
  [
    'Urea contains a lower percentage of nitrogen than ammonium sulphate.',
    tex`Urea has about 46.7% N, ammonium sulphate only about 21.2%; urea is the richest common solid nitrogen fertilizer.`,
  ],
  [
    'Ammonia is manufactured industrially by the Contact process.',
    tex`The Contact process makes $\ce{H2SO4}$; ammonia is made by the Haber process.`,
  ],
  [
    'Gypsum is added to cement clinker to make it set faster.',
    'Gypsum retards setting; it prevents the flash setting of ground clinker.',
  ],
  [
    'Silica is the major constituent of Portland cement by mass.',
    tex`Lime ($\ce{CaO}$, about 60 to 67%) is the major constituent; silica is only about 20%.`,
  ],
  [
    'n-Heptane is assigned an octane number of 100.',
    'n-Heptane knocks badly and is assigned 0; 2,2,4-trimethylpentane (iso-octane) is assigned 100.',
  ],
  [
    'Paper is made mainly of starch.',
    'Paper is a mat of cellulose fibres obtained from wood, bagasse or straw.',
  ],
  [
    'Fractional distillation of petroleum breaks large molecules into smaller ones.',
    'Fractional distillation only separates the existing hydrocarbons by boiling point; breaking molecules is cracking.',
  ],
];

const ENV_TRUE: ReadonlyArray<readonly [string, string]> = [
  [
    'The ozone layer lies mainly in the stratosphere.',
    'Most atmospheric ozone is found roughly 15 to 35 km above the ground, in the stratosphere.',
  ],
  [
    'Stratospheric ozone absorbs much of the harmful ultraviolet radiation from the Sun.',
    tex`$\ce{O3}$ absorbs UV light and dissociates ($\ce{O3 -> O2 + O}$), shielding living things from radiation that causes skin cancer.`,
  ],
  [
    'Unpolluted rain water is slightly acidic because it dissolves carbon dioxide from the air.',
    tex`$\ce{CO2 + H2O <=> H2CO3}$ gives normal rain a pH of about 5.6; dissolved $\ce{SO2}$ and $\ce{NO_x}$ push the pH lower still (acid rain).`,
  ],
  [
    'Temporary hardness of water can be removed by boiling.',
    tex`Boiling decomposes the hydrogen carbonates: $\ce{Ca(HCO3)2 -> CaCO3 v + H2O + CO2}$.`,
  ],
  [
    'Carbon monoxide is toxic because it forms carboxyhaemoglobin in the blood.',
    'CO binds to haemoglobin far more strongly than oxygen, so the blood carries less oxygen.',
  ],
  [
    'Chlorine is commonly used to disinfect drinking water.',
    tex`$\ce{Cl2 + H2O -> HCl + HOCl}$; hypochlorous acid kills bacteria.`,
  ],
  [
    'Chlorofluorocarbons release chlorine atoms when ultraviolet light breaks them in the stratosphere.',
    tex`For example $\ce{CF2Cl2 ->[UV] CF2Cl + Cl}$; each chlorine atom then destroys ozone catalytically.`,
  ],
];

const ENV_FALSE: ReadonlyArray<readonly [string, string]> = [
  [
    'Permanent hardness of water is removed by simple boiling.',
    tex`Permanent hardness comes from sulphates and chlorides of Ca and Mg, which boiling does not remove; washing soda or ion exchange is needed.`,
  ],
  [
    'The ozone layer is located mainly in the troposphere.',
    'The protective ozone layer is in the stratosphere; ozone in the troposphere is a pollutant.',
  ],
  [
    'Acid rain is caused mainly by carbon monoxide.',
    tex`CO is not an acidic oxide; acid rain comes mainly from $\ce{SO2}$ and nitrogen oxides.`,
  ],
  [
    'Chlorofluorocarbons are very reactive in the lower atmosphere.',
    'CFCs are chemically inert near the ground, which is exactly why they survive long enough to drift up to the stratosphere.',
  ],
  [
    'A low BOD value indicates heavily polluted water.',
    'A low BOD means little biodegradable organic matter, i.e. fairly clean water; polluted water has a high BOD.',
  ],
  [
    'Nitrogen is the main greenhouse gas in the atmosphere.',
    tex`$\ce{N2}$ does not absorb infrared radiation; important greenhouse gases are $\ce{H2O}$, $\ce{CO2}$, $\ce{CH4}$ and $\ce{N2O}$.`,
  ],
  [
    'Alum is added to water mainly to kill bacteria.',
    tex`Alum is a coagulant: its $\ce{Al(OH)3}$ floc carries suspended particles down. Disinfection is done by chlorine or ozone.`,
  ],
];

const INDUSTRY_REASON = new Map<string, string>([...INDUSTRY_TRUE, ...INDUSTRY_FALSE]);
const ENV_REASON = new Map<string, string>([...ENV_TRUE, ...ENV_FALSE]);

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('chemistry', 'industrial-environmental', (b) => [
  b.dynamic('fertilizer-nitrogen', { difficulty: 1, origin: 'past-paper', tags: ['fertilizers'] }, (r) => {
    const fz = r.pick(FERTILIZERS);
    const nMass = 14 * fz.nN;
    const molar = tex`$M(\ce{${fz.f}}) = ${fz.work} = ${fz.m}\,\mathrm{g\,mol^{-1}}$, containing $${fz.nN === 1 ? '14' : '2(14) = 28'}\,\mathrm{g}$ of N`;
    if (r.chance(0.5)) {
      const p = (100 * nMass) / fz.m;
      const wrongAtoms = (100 * (fz.nN === 2 ? 14 : 28)) / fz.m;
      const { answer, distractors } = numericOptions(r, {
        correct: p,
        wrong: [wrongAtoms, 100 - p, (100 * nMass) / (fz.m - nMass), p / 2, p - 10, p + 10].map((x) => (x < 100 ? x : NaN)),
        format: (x) => tex`$${num(x)}\%$`,
      });
      return {
        stem: tex`The percentage of nitrogen by mass in ${fz.name}, $${ce(fz.f)}$, is about: (${fz.masses})`,
        answer,
        distractors,
        explanation: tex`${molar}. Percentage of N $= \dfrac{${nMass}}{${fz.m}} \times 100 \approx ${num(p)}\%$.`,
      };
    }
    const k = r.int(1, fz.kMax);
    const mass = k * fz.unit;
    const nitrogen = (mass * nMass) / fz.m;
    const { answer, distractors } = numericOptions(r, {
      correct: nitrogen,
      wrong: [
        fz.nN === 2 ? nitrogen / 2 : nitrogen * 2, // wrong number of N atoms
        mass - nitrogen, // mass of the other elements
        nitrogen * 3,
        nitrogen * 1.5,
      ],
      format: (x) => q$(x, U.g),
    });
    return {
      stem: tex`The mass of nitrogen present in $${qty(mass, U.g)}$ of ${fz.name}, $${ce(fz.f)}$, is: (${fz.masses})`,
      answer,
      distractors,
      explanation: tex`${molar}. Mass of N $= ${mass} \times \dfrac{${nMass}}{${fz.m}} = ${num(nitrogen)}\,\mathrm{g}$.`,
    };
  }),

  b.dynamic('urea-stoichiometry', { difficulty: 2, tags: ['fertilizers'] }, (r) => {
    const k = r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]);
    const eqn = tex`$\ce{2NH3 + CO2 -> CO(NH2)2 + H2O}$`;
    const mode = r.pick(['from-nh3', 'from-co2', 'nh3-needed'] as const);
    if (mode === 'from-nh3') {
      // k mol NH3 -> k/2 mol urea
      const mNh3 = 17 * k;
      const urea = 30 * k;
      const { answer, distractors } = numericOptions(r, {
        correct: urea,
        wrong: [60 * k, 120 * k, mNh3, 15 * k],
        format: (x) => q$(x, U.g),
      });
      return {
        stem: tex`Urea is made by the reaction ${eqn}. The maximum mass of urea obtainable from $${qty(mNh3, U.g)}$ of ammonia (with excess $${ce('CO2')}$) is: (H = 1, C = 12, N = 14, O = 16)`,
        answer,
        distractors,
        explanation: tex`${eqn}. $n(\ce{NH3}) = \dfrac{${num(mNh3)}}{17} = ${num(k)}\,\mathrm{mol}$, so $n(\text{urea}) = \dfrac{${num(k)}}{2} = ${num(k / 2)}\,\mathrm{mol}$ and $m = (${num(k / 2)})(60) = ${num(urea)}\,\mathrm{g}$.`,
      };
    }
    if (mode === 'from-co2') {
      const mCo2 = 44 * k;
      const urea = 60 * k;
      const { answer, distractors } = numericOptions(r, {
        correct: urea,
        wrong: [30 * k, 120 * k, mCo2, 34 * k],
        format: (x) => q$(x, U.g),
      });
      return {
        stem: tex`Urea is made by the reaction ${eqn}. The maximum mass of urea obtainable from $${qty(mCo2, U.g)}$ of carbon dioxide (with excess $${ce('NH3')}$) is: (H = 1, C = 12, N = 14, O = 16)`,
        answer,
        distractors,
        explanation: tex`${eqn}. $n(\ce{CO2}) = \dfrac{${num(mCo2)}}{44} = ${num(k)}\,\mathrm{mol}$; the ratio $\ce{CO2}$ : urea is 1 : 1, so $m = (${num(k)})(60) = ${num(urea)}\,\mathrm{g}$.`,
      };
    }
    const urea = 60 * k;
    const nh3 = 34 * k;
    const { answer, distractors } = numericOptions(r, {
      correct: nh3,
      wrong: [17 * k, 68 * k, 44 * k, 8.5 * k],
      format: (x) => q$(x, U.g),
    });
    return {
      stem: tex`Urea is made by the reaction ${eqn}. The mass of ammonia needed to produce $${qty(urea, U.g)}$ of urea is: (H = 1, C = 12, N = 14, O = 16)`,
      answer,
      distractors,
      explanation: tex`${eqn}. $n(\text{urea}) = \dfrac{${num(urea)}}{60} = ${num(k)}\,\mathrm{mol}$, so $n(\ce{NH3}) = 2(${num(k)}) = ${num(2 * k)}\,\mathrm{mol}$ and $m = (${num(2 * k)})(17) = ${num(nh3)}\,\mathrm{g}$.`,
    };
  }),

  b.dynamic('hardness-ppm', { difficulty: 2, tags: ['water treatment'] }, (r) => {
    if (r.chance(0.5)) {
      const v = r.pick([0.5, 1, 2, 4, 5]);
      const ppm = 10 * r.int(3, 50);
      const mg = ppm * v;
      const g = mg / 1000;
      const { answer, distractors } = numericOptions(r, {
        correct: ppm,
        wrong: [g / v, mg * v, ppm * 1000, ppm / 10],
        format: (x) => `$${num(x)}$ ppm`,
      });
      return {
        stem: tex`A $${qty(v, U.dm3)}$ sample of hard water contains dissolved calcium salts equivalent to $${qty(g, U.g)}$ of $${ce('CaCO3')}$. Taking the density of water as $1\,\mathrm{g\,cm^{-3}}$, its hardness in ppm (as $${ce('CaCO3')}$) is:`,
        answer,
        distractors,
        explanation: tex`Mass of water $= ${num(v * 1000)}\,\mathrm{g}$. ppm $= \dfrac{\text{mass of solute}}{\text{mass of solution}} \times 10^{6} = \dfrac{${num(g)}}{${num(v * 1000)}} \times 10^{6} = ${num(ppm)}$ ppm (equivalently $${num(mg)}\,\mathrm{mg} \div ${num(v)}\,\mathrm{dm^{3}}$).`,
      };
    }
    const ca = 4 * r.int(3, 60);
    const asCaCO3 = (ca * 100) / 40;
    const { answer, distractors } = numericOptions(r, {
      correct: asCaCO3,
      wrong: [ca, (ca * 40) / 100, (ca * 56) / 40, (ca * 100) / 20],
      format: (x) => `$${num(x)}$ ppm`,
    });
    return {
      stem: tex`A water sample contains $${ca}\,\mathrm{mg}$ of $${ce('Ca^2+')}$ ions per $\mathrm{dm^{3}}$. Its hardness in ppm, expressed as $${ce('CaCO3')}$, is: (Ca = 40, C = 12, O = 16)`,
      answer,
      distractors,
      explanation: tex`Each mole of $\ce{Ca^2+}$ (40 g) corresponds to one mole of $\ce{CaCO3}$ (100 g); for dilute aqueous solutions $1\,\mathrm{mg\,dm^{-3}} = 1$ ppm. Hardness $= ${ca} \times \dfrac{100}{40} = ${num(asCaCO3)}\,\mathrm{mg\,dm^{-3}} = ${num(asCaCO3)}$ ppm as $\ce{CaCO3}$.`,
    };
  }),

  b.dynamic('pollutant-sources-effects', { difficulty: 1, tags: ['pollution'] }, (r) => {
    const item = r.pick(POLLUTANTS);
    return { stem: item.q, answer: item.a, distractors: [...item.x], explanation: item.e };
  }),

  b.dynamic('industry-statements', { difficulty: 1, tags: ['fertilizers', 'cement', 'paper', 'petroleum'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about chemical industries is correct?',
      negativeStem: 'Which of the following statements about chemical industries is incorrect?',
      truths: INDUSTRY_TRUE.map(([s]) => s),
      falsehoods: INDUSTRY_FALSE.map(([s]) => s),
      explain: (answer, inverted) =>
        `${inverted ? 'This statement is false.' : 'This statement is true.'} ${INDUSTRY_REASON.get(answer) ?? ''}`,
    }),
  ),

  b.dynamic('environment-statements', { difficulty: 1, tags: ['pollution', 'ozone', 'water treatment'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about the environment is correct?',
      negativeStem: 'Which of the following statements about the environment is incorrect?',
      truths: ENV_TRUE.map(([s]) => s),
      falsehoods: ENV_FALSE.map(([s]) => s),
      explain: (answer, inverted) =>
        `${inverted ? 'This statement is false.' : 'This statement is true.'} ${ENV_REASON.get(answer) ?? ''}`,
    }),
  ),

  // -------------------------------------------------------------------------
  // Fixed recall items
  // -------------------------------------------------------------------------
  ...b.mcqs([
    {
      id: 'richest-nitrogen-fertilizer',
      d: 1,
      o: 'past-paper',
      t: ['fertilizers'],
      q: 'Among the following, the fertilizer with the highest percentage of nitrogen is:',
      a: 'urea',
      x: ['ammonium sulphate', 'ammonium nitrate', 'calcium ammonium nitrate'],
      e: tex`Urea, $\ce{CO(NH2)2}$, has $\frac{28}{60} \times 100 \approx 46.7\%$ N, against 35% for $\ce{NH4NO3}$, about 21% for $\ce{(NH4)2SO4}$ and roughly 26% for CAN.`,
    },
    {
      id: 'urea-intermediate',
      d: 2,
      t: ['fertilizers'],
      q: 'In the industrial manufacture of urea, ammonia and carbon dioxide first combine to form:',
      a: tex`ammonium carbamate, $\ce{NH2COONH4}$`,
      x: [tex`ammonium cyanate, $\ce{NH4CNO}$`, tex`ammonium nitrate, $\ce{NH4NO3}$`, tex`biuret, $\ce{NH2CONHCONH2}$`],
      e: tex`$\ce{2NH3 + CO2 -> NH2COONH4}$; the carbamate is then dehydrated: $\ce{NH2COONH4 -> CO(NH2)2 + H2O}$. Biuret is an unwanted by-product formed when urea is overheated.`,
    },
    {
      id: 'superphosphate-composition',
      d: 2,
      t: ['fertilizers'],
      q: 'Single superphosphate of lime is a mixture of:',
      a: tex`$\ce{Ca(H2PO4)2}$ and $\ce{CaSO4}$`,
      x: [tex`$\ce{Ca3(PO4)2}$ and $\ce{CaCO3}$`, tex`$\ce{(NH4)3PO4}$ and $\ce{KCl}$`, tex`$\ce{CaHPO4}$ and $\ce{NH4NO3}$`],
      e: tex`Rock phosphate is treated with sulphuric acid: $\ce{Ca3(PO4)2 + 2H2SO4 -> Ca(H2PO4)2 + 2CaSO4}$. The soluble dihydrogen phosphate supplies phosphorus to plants.`,
    },
    {
      id: 'cement-major-oxide',
      d: 1,
      o: 'past-paper',
      t: ['cement'],
      q: 'The constituent present in the largest proportion by mass in Portland cement is:',
      a: tex`$\ce{CaO}$`,
      x: [tex`$\ce{SiO2}$`, tex`$\ce{Al2O3}$`, tex`$\ce{Fe2O3}$`],
      e: tex`Lime ($\ce{CaO}$) forms about 60 to 67% of Portland cement, silica about 17 to 25%, alumina 3 to 8% and iron(III) oxide 0.5 to 6%.`,
    },
    {
      id: 'gypsum-in-cement',
      d: 1,
      o: 'past-paper',
      t: ['cement'],
      q: 'A small amount of gypsum is ground with cement clinker in order to:',
      a: 'slow down the setting of cement',
      x: ['speed up the setting of cement', 'lower the temperature of the kiln', 'colour the cement grey'],
      e: tex`Gypsum, $\ce{CaSO4.2H2O}$, retards the very fast reaction of the aluminates with water, so the cement does not set before it can be worked.`,
    },
    {
      id: 'kraft-cooking-liquor',
      d: 2,
      t: ['paper'],
      q: 'In the kraft (sulphate) process for making wood pulp, the chips are cooked with:',
      a: tex`$\ce{NaOH}$ and $\ce{Na2S}$`,
      x: [tex`$\ce{Ca(HSO3)2}$ and $\ce{SO2}$`, tex`$\ce{H2SO4}$ and $\ce{Na2SO4}$`, tex`$\ce{HCl}$ and $\ce{NaCl}$`],
      e: tex`The alkaline kraft liquor ($\ce{NaOH + Na2S}$) dissolves lignin. The name "sulphate" comes from $\ce{Na2SO4}$ added to make up losses, which is reduced to $\ce{Na2S}$; hydrogen sulphite liquor belongs to the acidic sulphite process.`,
    },
    {
      id: 'paper-main-substance',
      d: 1,
      t: ['paper'],
      q: 'Paper consists mainly of:',
      a: 'cellulose fibres',
      x: ['lignin', 'starch granules', 'protein fibres'],
      e: 'Pulping removes most of the lignin that binds wood together, leaving cellulose fibres that are pressed and dried into paper.',
    },
    {
      id: 'octane-iso-octane',
      d: 1,
      o: 'past-paper',
      t: ['petroleum'],
      q: 'On the octane scale, the compound assigned an octane number of 100 is:',
      a: '2,2,4-trimethylpentane',
      x: ['n-heptane', 'n-octane', 'tetraethyl lead'],
      e: '2,2,4-Trimethylpentane (iso-octane) burns smoothly and is rated 100; n-heptane knocks badly and is rated 0. Tetraethyl lead was an additive that raised octane number, not a reference fuel.',
    },
    {
      id: 'carbon-monoxide-blood',
      d: 1,
      t: ['pollution'],
      q: 'Carbon monoxide is poisonous because it:',
      a: 'combines with haemoglobin to form carboxyhaemoglobin',
      x: ['dissolves in blood to form carbonic acid', 'oxidizes haemoglobin to methaemoglobin', 'destroys the ozone layer'],
      e: 'CO binds to the iron of haemoglobin about 200 times more strongly than oxygen, so the blood can no longer carry enough oxygen to the tissues.',
    },
    {
      id: 'cfc-ozone-agent',
      d: 1,
      t: ['ozone'],
      q: 'Chlorofluorocarbons damage the ozone layer because, in the stratosphere, they release:',
      a: 'chlorine atoms (free radicals)',
      x: ['carbon dioxide molecules', 'fluoride ions', 'hydrogen molecules'],
      e: tex`UV light breaks the C–Cl bond, e.g. $\ce{CFCl3 -> CFCl2 + Cl}$. The chlorine radical then destroys ozone in a chain: $\ce{Cl + O3 -> ClO + O2}$.`,
    },
    {
      id: 'ozone-cycle-regeneration',
      d: 2,
      t: ['ozone'],
      q: 'In the chlorine-catalysed destruction of ozone, the step that regenerates the chlorine atom is:',
      a: tex`$\ce{ClO + O -> Cl + O2}$`,
      x: [tex`$\ce{Cl + O3 -> ClO + O2}$`, tex`$\ce{O3 -> O2 + O}$`, tex`$\ce{O2 + O -> O3}$`],
      e: tex`The cycle is $\ce{Cl + O3 -> ClO + O2}$ (uses Cl) followed by $\ce{ClO + O -> Cl + O2}$ (gives Cl back). Since Cl is regenerated, one atom can destroy thousands of ozone molecules; the other two equations involve no chlorine.`,
    },
    {
      id: 'ozone-layer-region',
      d: 1,
      t: ['ozone'],
      q: 'The ozone layer that protects life from ultraviolet radiation lies in the:',
      a: 'stratosphere',
      x: ['troposphere', 'mesosphere', 'thermosphere'],
      e: 'About 90% of atmospheric ozone lies in the stratosphere, roughly 15 to 35 km up, where it absorbs most of the harmful UV-B and UV-C radiation.',
    },
    {
      id: 'temporary-hardness-cause',
      d: 1,
      o: 'past-paper',
      t: ['water treatment'],
      q: 'Temporary hardness of water is caused by dissolved:',
      a: 'hydrogen carbonates of calcium and magnesium',
      x: ['sulphates of calcium and magnesium', 'chlorides of sodium and potassium', 'nitrates of sodium and potassium'],
      e: tex`$\ce{Ca(HCO3)2}$ and $\ce{Mg(HCO3)2}$ decompose on boiling (e.g. $\ce{Ca(HCO3)2 -> CaCO3 v + H2O + CO2}$) and the metal ions are thrown out as insoluble solids, so this hardness is temporary. Sulphates and chlorides of Ca and Mg cause permanent hardness; sodium and potassium salts cause no hardness.`,
    },
    {
      id: 'high-bod-meaning',
      d: 2,
      t: ['water treatment', 'pollution'],
      q: 'A high BOD (biochemical oxygen demand) value for a water sample shows that it contains:',
      a: 'a large amount of biodegradable organic matter',
      x: ['a large amount of dissolved oxygen', 'a high concentration of calcium ions', 'a high concentration of chlorine'],
      e: 'BOD is the oxygen used by microorganisms to break down organic matter in the sample over a fixed time; more organic waste means a higher BOD and more polluted water, which usually has little dissolved oxygen left.',
    },
  ]),
]);
