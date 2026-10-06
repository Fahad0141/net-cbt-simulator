/**
 * Biology (FSc Part I): Nutrition and Gaseous Exchange.
 *
 * Sub-topics: human digestion, plant nutrition, respiratory system.
 *
 * Conceptual items use curated pools in which every wrong option is definitely wrong
 * (e.g. "pancreatic amylase" is never offered as a salivary-gland enzyme answer, and
 * statements are strictly true or strictly false at FSc level). Statement items carry a
 * reason for every statement, so the explanation always matches the options shown.
 *
 * Computational items: minute and alveolar ventilation, vital and total lung capacity.
 * Calvin-cycle bookkeeping and stand-alone items on the source of photosynthetic O2 and
 * the central atom of chlorophyll belong to biology/bioenergetics (which already has
 * them), so they are not duplicated here.
 */
import { defineBank } from '@/engine/authoring';
import { numericOptions, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** [statement, reason] pairs: the reason explains why the statement is true or corrects it. */
type Stmt = readonly [statement: string, reason: string];

interface StmtPool {
  stem: string;
  negativeStem: string;
  truths: readonly Stmt[];
  falsehoods: readonly Stmt[];
}

/** "Which statement is correct / incorrect?" with a reason for every option shown. */
function statementItem(r: Rng, pool: StmtPool): AuthoredQuestion {
  const inverted = r.chance(0.35);
  const [answerPool, otherPool] = inverted ? [pool.falsehoods, pool.truths] : [pool.truths, pool.falsehoods];
  const [answer, answerWhy] = r.pick(answerPool);
  const others = r.sample(otherPool, 3);
  const quote = (s: string): string => `"${s.replace(/\.$/, '')}"`;
  const lead = inverted
    ? `The incorrect statement is ${quote(answer)}: ${answerWhy}`
    : `The correct statement is ${quote(answer)}: ${answerWhy}`;
  const rest = others.map(([s, why]) => `${quote(s)} is ${inverted ? 'true' : 'false'}: ${why}`).join(' ');
  return {
    stem: inverted ? pool.negativeStem : pool.stem,
    answer,
    distractors: others.map(([s]) => s),
    explanation: `${lead} ${rest}`,
  };
}

/** Integer with thin-space grouping for math mode: 10800 -> '10{,}800'. */
function grp(x: number): string {
  if (!Number.isSafeInteger(x)) throw new RangeError(`grp: expected an integer, got ${x}`);
  const digits = String(Math.abs(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '{,}');
  return x < 0 ? `-${digits}` : digits;
}

const mL = (x: number): string => tex`$${grp(x)}\,\mathrm{mL}$`;
const mLmin = (x: number): string => tex`$${grp(x)}\,\mathrm{mL\,min^{-1}}$`;

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

type Site = 'salivary' | 'stomach' | 'pancreas' | 'intestine' | 'liver';

const SITE_TEXT: Readonly<Record<Site, string>> = {
  salivary: 'salivary glands',
  stomach: 'gastric glands of the stomach',
  pancreas: 'pancreas',
  intestine: 'lining (intestinal glands) of the small intestine',
  liver: 'liver',
};

/**
 * Enzymes with an undisputed single source at FSc level. Names must not reveal the
 * source (no "Pancreatic lipase"), and generic lipase/amylase are excluded because
 * several glands secrete them.
 */
const ENZYMES: ReadonlyArray<{ name: string; site: Exclude<Site, 'liver'>; note: string }> = [
  { name: 'Ptyalin', site: 'salivary', note: 'is salivary amylase, which begins starch digestion in the mouth' },
  { name: 'Pepsinogen', site: 'stomach', note: 'is secreted by chief cells and activated to pepsin by HCl' },
  { name: 'Trypsinogen', site: 'pancreas', note: 'reaches the duodenum in pancreatic juice and is activated by enterokinase' },
  { name: 'Chymotrypsinogen', site: 'pancreas', note: 'is a pancreatic protease precursor activated by trypsin' },
  { name: 'Maltase', site: 'intestine', note: 'is an intestinal (brush-border) enzyme splitting maltose' },
  { name: 'Sucrase', site: 'intestine', note: 'is an intestinal (brush-border) enzyme splitting sucrose' },
  { name: 'Lactase', site: 'intestine', note: 'is an intestinal (brush-border) enzyme splitting lactose' },
  { name: 'Enterokinase (enteropeptidase)', site: 'intestine', note: 'is made by the duodenal lining and activates trypsinogen' },
];

/** Substrate -> products, each with hand-picked wrong product sets. */
const HYDROLYSES: ReadonlyArray<{ stem: string; answer: string; wrong: readonly string[]; why: string }> = [
  {
    stem: 'Maltase hydrolyses maltose into:',
    answer: 'two molecules of glucose',
    wrong: ['glucose and fructose', 'glucose and galactose', 'fatty acids and glycerol', 'amino acids'],
    why: 'Maltose is a disaccharide of two glucose units, so maltase releases glucose only.',
  },
  {
    stem: 'Sucrase hydrolyses sucrose into:',
    answer: 'glucose and fructose',
    wrong: ['two molecules of glucose', 'glucose and galactose', 'fatty acids and glycerol', 'maltose and dextrins'],
    why: 'Sucrose (cane sugar) is made of one glucose and one fructose unit.',
  },
  {
    stem: 'Lactase hydrolyses lactose (milk sugar) into:',
    answer: 'glucose and galactose',
    wrong: ['two molecules of glucose', 'glucose and fructose', 'amino acids', 'fatty acids and glycerol'],
    why: 'Lactose is made of one glucose and one galactose unit.',
  },
  {
    stem: 'Salivary and pancreatic amylases digest starch mainly into:',
    answer: 'maltose',
    wrong: ['glucose and fructose', 'glucose and galactose', 'fatty acids and glycerol', 'peptides'],
    why: 'Amylases break the long glucose chains of starch into the disaccharide maltose (with some dextrins); maltase then gives glucose.',
  },
  {
    stem: 'Lipase hydrolyses fats (triglycerides) into:',
    answer: 'fatty acids and glycerol',
    wrong: ['amino acids', 'maltose', 'glucose and galactose', 'peptides'],
    why: 'A triglyceride is an ester of glycerol with three fatty acids; lipase hydrolyses these ester bonds.',
  },
  {
    stem: 'In the stomach, pepsin breaks down proteins into:',
    answer: 'polypeptides (peptones)',
    wrong: ['fatty acids and glycerol', 'maltose', 'glucose and fructose', 'nucleotides'],
    why: 'Pepsin is an endopeptidase; it splits proteins into shorter polypeptides, which are digested further in the small intestine.',
  },
  {
    stem: 'Peptidases (erepsin) of the small intestine convert small peptides into:',
    answer: 'amino acids',
    wrong: ['fatty acids and glycerol', 'maltose', 'glucose and galactose', 'nucleotides'],
    why: 'Peptidases complete protein digestion by releasing free amino acids, which are absorbed into the blood.',
  },
];

// ---------------------------------------------------------------------------
// Statement pools
// ---------------------------------------------------------------------------

const DIGESTION_POOL: StmtPool = {
  stem: 'Which statement about human digestion is correct?',
  negativeStem: 'Which statement about human digestion is incorrect?',
  truths: [
    ['Bile contains no digestive enzyme but emulsifies fats.', 'bile salts break fat into small droplets, increasing the surface area for lipase.'],
    ['Pepsin is secreted as inactive pepsinogen and activated by HCl.', 'secreting the inactive form protects the gastric cells from self-digestion.'],
    ['Trypsinogen is activated to trypsin by enterokinase.', 'enterokinase of the duodenal lining activates trypsinogen in the gut lumen.'],
    ['Most absorption of digested food occurs in the small intestine.', 'its long length, villi and microvilli give a huge absorptive surface.'],
    ['Salivary amylase begins the digestion of starch in the mouth.', 'ptyalin starts converting starch to maltose before food is swallowed.'],
    ['The liver stores excess glucose in the form of glycogen.', 'liver cells convert glucose to glycogen under the influence of insulin.'],
  ],
  falsehoods: [
    ['Bile is produced by the gall bladder.', 'bile is produced by the liver; the gall bladder only stores and concentrates it.'],
    ['Protein digestion begins in the mouth.', 'saliva has no protease; protein digestion begins in the stomach with pepsin.'],
    ['Pepsin works best in an alkaline medium.', 'pepsin works best in the strongly acidic medium (about pH 2) of the stomach.'],
    ['Lipase converts starch into maltose.', 'lipase digests fats; amylase converts starch into maltose.'],
    ['Most digested food is absorbed in the stomach.', 'the stomach absorbs only a few substances (such as alcohol and some drugs); most absorption is in the small intestine.'],
    ['The pancreas secretes hydrochloric acid into the duodenum.', 'HCl comes from parietal cells of the stomach; pancreatic juice is alkaline.'],
    ['Peristalsis occurs only in the oesophagus.', 'peristaltic waves move food along the whole alimentary canal.'],
  ],
};

const RESPIRATORY_POOL: StmtPool = {
  stem: 'Which statement about the human respiratory system is correct?',
  negativeStem: 'Which statement about the human respiratory system is incorrect?',
  truths: [
    ['Gas exchange in the lungs occurs across the walls of the alveoli by diffusion.', 'thin, moist alveolar walls surrounded by capillaries are the respiratory surface.'],
    ['The trachea is kept open by C-shaped rings of cartilage.', 'the incomplete cartilage rings prevent the windpipe from collapsing.'],
    ['Most of the oxygen in blood is carried as oxyhaemoglobin.', 'only a small fraction of O₂ dissolves in plasma; the rest binds haemoglobin in red cells.'],
    ['Most carbon dioxide is carried in plasma as bicarbonate ions.', 'about 70% of CO₂ travels as HCO₃⁻, formed with the help of carbonic anhydrase in red cells.'],
    ['A rise in blood CO₂ concentration increases the rate of breathing.', 'chemoreceptors detect the extra CO₂ (and H⁺) and the respiratory centre speeds up breathing.'],
    ['The right lung has three lobes and the left lung has two.', 'the left lung is smaller, leaving room for the heart.'],
    ['The epiglottis covers the glottis during swallowing.', 'this stops food from entering the larynx and trachea.'],
  ],
  falsehoods: [
    ['Gas exchange occurs mainly across the walls of the bronchi.', 'the bronchi only conduct air; exchange occurs in the alveoli.'],
    ['During inspiration the diaphragm relaxes and becomes dome-shaped.', 'during inspiration the diaphragm contracts and flattens; it relaxes into a dome during expiration.'],
    ['Most carbon dioxide is carried in blood as carbaminohaemoglobin.', 'only about a quarter is carried bound to haemoglobin; most travels as bicarbonate ions.'],
    ['The left lung has three lobes and the right lung has two.', 'it is the other way round: right three, left two.'],
    ['Air pressure inside the lungs rises above atmospheric pressure during inspiration.', 'during inspiration lung pressure falls below atmospheric, so air flows in.'],
    ['The breathing centre is located in the cerebellum.', 'the respiratory centre is in the medulla oblongata (with the pons).'],
    ['One haemoglobin molecule can carry only one molecule of oxygen.', 'each haemoglobin has four haem groups and carries up to four O₂ molecules.'],
  ],
};

const PLANT_POOL: StmtPool = {
  stem: 'Which statement about nutrition in plants is correct?',
  negativeStem: 'Which statement about nutrition in plants is incorrect?',
  truths: [
    ['The light-dependent reactions occur in the thylakoid membranes.', 'the photosystems, electron carriers and ATP synthase are located in the thylakoids.'],
    ['The Calvin cycle takes place in the stroma of the chloroplast.', 'Rubisco and the other Calvin-cycle enzymes are dissolved in the stroma.'],
    ['Oxygen released in photosynthesis comes from the splitting of water.', 'photolysis of water at photosystem II releases O₂, as shown with the isotope ¹⁸O.'],
    ['Magnesium lies at the centre of the chlorophyll molecule.', 'a Mg²⁺ ion is held at the centre of the porphyrin ring.'],
    ['Chlorophyll absorbs mainly blue-violet and red light.', 'its absorption spectrum has peaks in the blue-violet and red regions.'],
    ['Insectivorous plants digest insects mainly to obtain nitrogen.', 'they grow in nitrogen-poor soils and still make their own food by photosynthesis.'],
  ],
  falsehoods: [
    ['The Calvin cycle takes place in the thylakoid membranes.', 'the Calvin cycle occurs in the stroma; the thylakoids carry out the light reactions.'],
    ['Oxygen released in photosynthesis comes from carbon dioxide.', 'the released O₂ comes from water; the oxygen of CO₂ ends up in sugar and water.'],
    ['Iron lies at the centre of the chlorophyll molecule.', 'the central atom of chlorophyll is magnesium; iron is central in haem.'],
    ['Chlorophyll absorbs green light most strongly.', 'chlorophyll absorbs green least; it reflects and transmits it, so leaves look green.'],
    ['Most plants absorb nitrogen gas from the air through their stomata.', 'plants cannot use N₂ directly; they absorb nitrate or ammonium ions from the soil.'],
    ['Cuscuta (dodder) is an insectivorous plant.', 'Cuscuta is a parasitic plant that draws food from its host through haustoria.'],
    ['The light reactions directly produce glucose.', 'the light reactions make ATP, NADPH and O₂; sugar is made later in the Calvin cycle.'],
  ],
};

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('biology', 'nutrition-gas-exchange', (b) => [
  // ---------------- Human digestion ----------------
  b.dynamic('enzyme-source', { difficulty: 1, origin: 'past-paper', tags: ['human digestion'] }, (r) => {
    const sites: Exclude<Site, 'liver'>[] = ['salivary', 'stomach', 'pancreas', 'intestine'];
    if (r.chance(0.5)) {
      // Enzyme -> source
      const e = r.pick(ENZYMES);
      const others: Site[] = (['salivary', 'stomach', 'pancreas', 'intestine', 'liver'] as Site[]).filter((s) => s !== e.site);
      const wrong = r.sample(others, 3);
      return {
        stem: `${e.name} is secreted by the:`,
        answer: SITE_TEXT[e.site],
        distractors: wrong.map((s) => SITE_TEXT[s]),
        explanation: `${e.name} comes from the ${SITE_TEXT[e.site]}; it ${e.note}.${wrong.includes('liver') ? ' The liver secretes bile, which contains no digestive enzyme.' : ''}`,
      };
    }
    // Source -> enzyme
    const site = r.pick(sites);
    const e = r.pick(ENZYMES.filter((x) => x.site === site));
    const wrong = r.sample(ENZYMES.filter((x) => x.site !== site), 3);
    return {
      stem: `Which enzyme is secreted by the ${SITE_TEXT[site]}?`,
      answer: e.name,
      distractors: wrong.map((x) => x.name),
      explanation: `${e.name} ${e.note}. The others come from elsewhere: ${wrong.map((x) => `${x.name.charAt(0).toLowerCase()}${x.name.slice(1)} from the ${SITE_TEXT[x.site]}`).join('; ')}.`,
    };
  }),

  b.dynamic('hydrolysis-products', { difficulty: 1, tags: ['human digestion'] }, (r) => {
    const h = r.pick(HYDROLYSES);
    return { stem: h.stem, answer: h.answer, distractors: r.sample(h.wrong, 3), explanation: h.why };
  }),

  b.dynamic('digestion-statements', { difficulty: 2, tags: ['human digestion'] }, (r) => statementItem(r, DIGESTION_POOL)),

  ...b.mcqs([
    {
      id: 'bile-emulsifies-fat', d: 1, o: 'past-paper', t: ['human digestion'],
      q: 'The main role of bile in digestion is to:',
      a: 'emulsify fats into small droplets',
      x: ['hydrolyse fats into fatty acids', 'convert starch into maltose', 'activate pepsinogen to pepsin'],
      e: 'Bile, made by the liver and stored in the gall bladder, has no enzymes. Its bile salts emulsify fats, increasing the surface area on which lipase acts. Pepsinogen is activated by HCl, not bile.',
    },
    {
      id: 'hcl-parietal-cells', d: 1, o: 'past-paper', t: ['human digestion'],
      q: 'Hydrochloric acid of the gastric juice is secreted by the:',
      a: 'parietal (oxyntic) cells',
      x: ['chief (peptic) cells', 'mucous neck cells', 'G cells'],
      e: 'Parietal (oxyntic) cells secrete HCl. Chief cells secrete pepsinogen, mucous cells secrete protective mucus, and G cells secrete the hormone gastrin.',
    },
    {
      id: 'liver-largest-gland', d: 1, o: 'past-paper', t: ['human digestion'],
      q: 'The largest gland in the human body is the:',
      a: 'liver',
      x: ['pancreas', 'thyroid gland', 'parotid salivary gland'],
      e: 'The liver (about 1.5 kg in an adult) is the largest gland; it secretes bile and performs many metabolic functions.',
    },
    {
      id: 'lacteals-absorb-fats', d: 1, t: ['human digestion'],
      q: 'After absorption in a villus, the products of fat digestion mainly enter the:',
      a: 'lacteal (lymph vessel)',
      x: ['blood capillaries of the villus', 'hepatic artery', 'crypts of Lieberkühn'],
      e: 'Fatty acids and glycerol are reassembled into fats inside the epithelial cells and pass, as tiny droplets, into the lacteal, the central lymph vessel of the villus. Sugars and amino acids enter the blood capillaries.',
    },
    {
      id: 'secretin-bicarbonate', d: 2, t: ['human digestion'],
      q: 'Acid chyme entering the duodenum triggers release of a hormone that makes the pancreas secrete a bicarbonate-rich juice. This hormone is:',
      a: 'secretin',
      x: ['gastrin', 'insulin', 'thyroxine'],
      e: 'Secretin, released by the duodenal lining in response to acid, stimulates the pancreas to pour out bicarbonate that neutralises the chyme. It was the first hormone discovered (Bayliss and Starling, 1902). Gastrin stimulates the secretion of gastric juice; insulin and thyroxine are not digestive hormones.',
    },
    {
      id: 'peptic-ulcer-cause', d: 2, o: 'past-paper', t: ['human digestion'],
      q: 'Most peptic ulcers are associated with infection by the bacterium:',
      a: 'Helicobacter pylori',
      x: ['Vibrio cholerae', 'Salmonella typhi', 'Mycobacterium tuberculosis'],
      e: 'Helicobacter pylori survives in the stomach lining and weakens its mucus barrier, so acid and pepsin erode the wall. Vibrio cholerae causes cholera, Salmonella typhi typhoid, and Mycobacterium tuberculosis tuberculosis.',
    },
  ]),

  // ---------------- Plant nutrition ----------------
  b.dynamic('plant-nutrition-statements', { difficulty: 1, tags: ['plant nutrition'] }, (r) => statementItem(r, PLANT_POOL)),

  ...b.mcqs([
    {
      id: 'insectivorous-nitrogen', d: 1, o: 'past-paper', t: ['plant nutrition'],
      q: 'Pitcher plant and Venus flytrap capture insects mainly to obtain:',
      a: 'nitrogen',
      x: ['glucose', 'water', 'oxygen'],
      e: 'Insectivorous plants are green and make their own sugar by photosynthesis, but they grow in nitrogen-poor soils; digested insect proteins supply nitrogen.',
    },
    {
      id: 'cuscuta-parasite', d: 1, t: ['plant nutrition'],
      q: 'Cuscuta (dodder), which absorbs food from its host through haustoria, shows which mode of nutrition?',
      a: 'parasitic',
      x: ['insectivorous', 'saprotrophic', 'photoautotrophic'],
      e: 'Cuscuta is a leafless, yellowish stem parasite; its haustoria penetrate the host’s vascular tissue to draw food and water. It does not trap insects, feed on dead matter, or photosynthesise significantly.',
    },
    {
      id: 'lenticels-woody-stems', d: 1, t: ['respiratory system'],
      q: 'In the woody stems of trees, gases are exchanged with the air mainly through:',
      a: 'lenticels',
      x: ['stomata', 'hydathodes', 'the cuticle'],
      e: 'The bark of a woody stem is covered by impermeable cork, so gases diffuse through lenticels, small pores of loosely packed cells in the bark. Stomata occur in leaves and young green stems, hydathodes are water pores at leaf margins, and the waxy cuticle restricts gas exchange.',
    },
    {
      id: 'nitrogen-uptake-form', d: 1, t: ['plant nutrition'],
      q: 'Most plants absorb nitrogen from the soil mainly in the form of:',
      a: 'nitrate and ammonium ions',
      x: ['nitrogen gas (N₂)', 'proteins of dead organisms', 'nitric oxide (NO) gas'],
      e: 'Roots take up nitrogen as nitrate (NO₃⁻) and ammonium (NH₄⁺) ions dissolved in soil water and use it to make amino acids, proteins, nucleic acids and chlorophyll. Most plants cannot use N₂ (only nitrogen-fixing bacteria, as in legume root nodules, can fix it), and proteins of dead organisms must first be decomposed to ammonium and nitrate.',
    },
    {
      id: 'rubp-co2-acceptor', d: 2, t: ['plant nutrition'],
      q: 'In the Calvin cycle of C₃ plants, CO₂ is first accepted by:',
      a: 'ribulose bisphosphate (RuBP)',
      x: ['phosphoenolpyruvate (PEP)', '3-phosphoglycerate (PGA)', 'oxaloacetate'],
      e: 'Rubisco joins CO₂ to the 5-carbon RuBP; the unstable product splits into two molecules of 3-phosphoglycerate (the first stable product). PEP is the CO₂ acceptor of C₄ plants, and oxaloacetate is the first product of C₄ fixation.',
    },
    {
      id: 'photorespiration-conditions', d: 3, t: ['plant nutrition'],
      q: 'Photorespiration in C₃ plants occurs when:',
      a: 'Rubisco fixes O₂ instead of CO₂, favoured by hot, dry conditions',
      x: [
        'PEP carboxylase fixes O₂ instead of CO₂, favoured by cool conditions',
        'Rubisco fixes O₂ instead of CO₂, favoured by high CO₂ levels in the leaf',
        'mitochondria release O₂ into the leaf in bright light',
      ],
      e: 'Rubisco can also act as an oxygenase. When stomata close in hot, dry weather, leaf O₂ rises and CO₂ falls, so Rubisco combines RuBP with O₂, wasting fixed carbon. High CO₂ suppresses (not favours) photorespiration, and PEP carboxylase does not react with O₂.',
    },
  ]),

  // ---------------- Respiratory system ----------------
  b.dynamic('respiratory-statements', { difficulty: 2, tags: ['respiratory system'] }, (r) => statementItem(r, RESPIRATORY_POOL)),

  b.dynamic('lung-volumes', { difficulty: 2, tags: ['respiratory system'] }, (r) => {
    const tv = r.multiple(400, 600, 50);
    if (r.chance(0.5)) {
      // Minute (pulmonary) or alveolar ventilation.
      const f = r.int(12, 20);
      const ds = r.pick([140, 150, 160]);
      const alveolar = r.chance(0.5);
      const minute = tv * f;
      const alv = (tv - ds) * f;
      const { answer, distractors } = numericOptions(r, {
        correct: alveolar ? alv : minute,
        wrong: alveolar ? [minute, ds * f, (tv + ds) * f] : [alv, (tv + ds) * f, ds * f],
        format: mLmin,
        fallback: 'offset',
      });
      return {
        stem: `A person breathes ${f} times per minute with a tidal volume of ${mL(tv)}. The anatomical dead space is ${mL(ds)}. The ${alveolar ? 'alveolar ventilation (fresh air reaching the alveoli per minute)' : 'pulmonary (minute) ventilation'} is:`,
        answer,
        distractors,
        explanation: alveolar
          ? tex`Alveolar ventilation = (tidal volume − dead space) × rate = $(${tv} - ${ds}) \times ${f} = ${grp(alv)}\,\mathrm{mL\,min^{-1}}$. The dead-space air never reaches the alveoli.`
          : tex`Minute ventilation = tidal volume × breathing rate = $${tv} \times ${f} = ${grp(minute)}\,\mathrm{mL\,min^{-1}}$. Dead space is subtracted only for alveolar ventilation.`,
      };
    }
    // Vital capacity or total lung capacity.
    const irv = r.multiple(2500, 3200, 100);
    const erv = r.multiple(900, 1300, 100);
    const rv = r.multiple(1000, 1300, 100);
    const vc = tv + irv + erv;
    const tlc = vc + rv;
    const askTlc = r.chance(0.4);
    const { answer, distractors } = numericOptions(r, {
      correct: askTlc ? tlc : vc,
      wrong: askTlc ? [vc, irv + erv + rv, tv + irv + rv, tv + erv + rv] : [tlc, tv + irv, irv + erv],
      format: mL,
      fallback: 'offset',
    });
    return {
      stem: `For a person, tidal volume = ${mL(tv)}, inspiratory reserve volume = ${mL(irv)}, expiratory reserve volume = ${mL(erv)} and residual volume = ${mL(rv)}. The ${askTlc ? 'total lung capacity' : 'vital capacity'} is:`,
      answer,
      distractors,
      explanation: askTlc
        ? tex`Total lung capacity = TV + IRV + ERV + RV = $${tv} + ${grp(irv)} + ${grp(erv)} + ${grp(rv)} = ${grp(tlc)}\,\mathrm{mL}$.`
        : tex`Vital capacity = TV + IRV + ERV = $${tv} + ${grp(irv)} + ${grp(erv)} = ${grp(vc)}\,\mathrm{mL}$. Residual volume is not included, because it cannot be breathed out.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'diaphragm-inspiration', d: 1, o: 'past-paper', t: ['respiratory system'],
      q: 'During inspiration, the diaphragm:',
      a: 'contracts and flattens',
      x: ['relaxes and flattens', 'contracts and becomes more dome-shaped', 'relaxes and becomes more dome-shaped'],
      e: 'Contraction of the diaphragm flattens it, enlarging the thoracic cavity; lung pressure falls below atmospheric and air enters. In expiration it relaxes and returns to its dome shape.',
    },
    {
      id: 'breathing-centre', d: 1, t: ['respiratory system'],
      q: 'The respiratory centre that sets the basic rhythm of breathing is located in the:',
      a: 'medulla oblongata',
      x: ['cerebellum', 'cerebrum', 'hypothalamus'],
      e: 'The respiratory centre lies in the medulla oblongata (helped by the pons). The cerebellum coordinates movement and the hypothalamus regulates temperature and other homeostatic functions.',
    },
    {
      id: 'carbon-monoxide-haemoglobin', d: 2, o: 'past-paper', t: ['respiratory system'],
      q: 'Carbon monoxide is poisonous mainly because it:',
      a: 'binds haemoglobin far more strongly than oxygen does',
      x: ['dissolves in plasma and acidifies the blood', 'destroys the walls of the alveoli', 'stops the heart by blocking the coronary arteries'],
      e: 'CO combines with haem to form carboxyhaemoglobin, with an affinity about 200 times that of O₂, and it is released only slowly. Fewer haem sites are left for oxygen, so tissues become starved of O₂.',
    },
    {
      id: 'emphysema', d: 2, t: ['respiratory system'],
      q: 'A smoking-related disorder in which alveolar walls break down, reducing the surface for gas exchange, is:',
      a: 'emphysema',
      x: ['asthma', 'laryngitis', 'pleurisy'],
      e: 'In emphysema the alveolar walls are destroyed and lose elasticity, so many small alveoli merge into fewer large spaces with a smaller total surface. Asthma narrows the bronchioles, laryngitis is inflammation of the larynx and pleurisy of the pleural membranes.',
    },
    {
      id: 'bohr-effect', d: 3, t: ['respiratory system'],
      q: 'In actively respiring muscle, a higher CO₂ concentration and lower pH cause haemoglobin to:',
      a: 'release more oxygen, as its affinity for O₂ decreases',
      x: [
        'hold oxygen more tightly, as its affinity for O₂ increases',
        'release more oxygen, as its affinity for O₂ increases',
        'hold oxygen more tightly, as its affinity for O₂ decreases',
      ],
      e: 'This is the Bohr effect: CO₂ and H⁺ lower haemoglobin’s affinity for O₂, shifting the oxygen dissociation curve to the right, so more O₂ is unloaded where it is needed. Holding O₂ more tightly would need a higher affinity (a shift to the left), the opposite of what CO₂ and acid do; and a higher affinity cannot release more O₂, nor a lower affinity hold it more tightly.',
    },
  ]),
]);
