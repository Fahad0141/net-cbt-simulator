import { defineBank } from '@/engine/authoring';
import { tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

/**
 * Design, chapter "Visual Arts and Techniques": PART B (conceptual items).
 * Drawing and painting media and techniques, printmaking, sculpture and form-making,
 * and the properties of studio materials. Part A (computational items) lives in
 * `visual-arts.ts`. Every local id here starts with `c-`.
 */

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const lower = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

/** Builds a two-way "term <-> definition" question from a pool of mutually exclusive pairs. */
function termQuestion(
  r: Rng,
  pool: ReadonlyArray<{ term: string; def: string }>,
  context: string,
): { stem: string; answer: string; distractors: string[]; explanation: string } {
  const [target, ...others] = r.sample(pool, 4) as [{ term: string; def: string }, ...{ term: string; def: string }[]];
  if (r.chance(0.5)) {
    return {
      stem: `In ${context}, the term **${target.term}** refers to:`,
      answer: cap(target.def),
      distractors: others.map((o) => cap(o.def)),
      explanation: `${cap(target.term)}: ${target.def}. The other options describe ${others.map((o) => o.term).join(', ')}.`,
    };
  }
  return {
    stem: `In ${context}, which term describes ${target.def}?`,
    answer: cap(target.term),
    distractors: others.map((o) => cap(o.term)),
    explanation: `${cap(target.def)}: this is ${target.term}. ${others.map((o) => `${cap(o.term)}: ${o.def}`).join('; ')}.`,
  };
}


/** A statement with a topic key; two statements sharing a key never appear in the same question. */
interface Stmt {
  s: string;
  k: string;
}
interface FalseStmt extends Stmt {
  why: string;
}

/**
 * "Which statement is correct / NOT correct?" built so that no two options are on the same
 * topic: a true statement and its direct negation never appear together (which would give
 * the answer away). The non-inverted explanation gives the reason each distractor is false.
 */
function topicStatementQuestion(
  r: Rng,
  spec: { stem: string; negativeStem: string; truths: readonly Stmt[]; falsehoods: readonly FalseStmt[] },
): AuthoredQuestion {
  const taken = new Set<string>();
  const draw = <T extends Stmt>(pool: readonly T[], n: number): T[] => {
    const out: T[] = [];
    for (const item of r.shuffle(pool)) {
      if (taken.has(item.k)) continue;
      taken.add(item.k);
      out.push(item);
      if (out.length === n) return out;
    }
    throw new Error(`topicStatementQuestion: only ${out.length} statements on distinct topics`);
  };
  if (r.chance(0.35)) {
    const ans = draw(spec.falsehoods, 1)[0] as FalseStmt;
    return {
      stem: spec.negativeStem,
      answer: ans.s,
      distractors: draw(spec.truths, 3).map((t) => t.s),
      explanation: `The statement is false: ${ans.why} The other three statements are true.`,
    };
  }
  const ans = draw(spec.truths, 1)[0] as Stmt;
  const wrong = draw(spec.falsehoods, 3);
  return {
    stem: spec.stem,
    answer: ans.s,
    distractors: wrong.map((w) => w.s),
    explanation: `"${ans.s}" is true. ${wrong.map((w) => `"${w.s}" is false: ${w.why}`).join(' ')}`,
  };
}

// ------------------------------------------------------------------ data

/** Painting and drawing techniques with non-overlapping definitions. */
const TECHNIQUES: ReadonlyArray<{ term: string; def: string }> = [
  { term: 'impasto', def: 'paint laid on so thickly that the brush or knife marks stand out from the surface' },
  { term: 'sfumato', def: 'soft, smoky transitions between tones with no sharp outlines' },
  { term: 'chiaroscuro', def: 'the use of strong contrasts of light and dark to model three-dimensional form' },
  { term: 'hatching', def: 'building up tone with closely spaced parallel lines that all run in one direction' },
  { term: 'cross-hatching', def: 'building up tone with layers of lines that cross one another' },
  { term: 'stippling', def: 'building up tone with many small dots' },
  { term: 'glazing', def: 'a thin transparent layer of paint applied over a dry layer to modify its colour' },
  { term: 'scumbling', def: 'a thin, broken layer of lighter opaque paint dragged over a dry layer so the colour beneath shows through in patches' },
  { term: 'alla prima', def: 'completing a painting in a single session, working wet paint into wet paint' },
  { term: 'wash', def: 'a thin, even layer of diluted watercolour or ink spread over a broad area' },
  { term: 'sgraffito', def: 'scratching through a top layer to reveal a contrasting layer beneath' },
  { term: 'grisaille', def: 'painting executed entirely in shades of grey' },
  { term: "trompe l'oeil", def: 'painting so realistic that it tricks the eye into seeing real three-dimensional objects' },
];

/** Paint media and their binders (each binder is unique in this list). */
const BINDERS: ReadonlyArray<{ medium: string; binder: string; note: string }> = [
  { medium: 'oil paint', binder: 'a drying oil such as linseed oil', note: 'the oil dries slowly by oxidation' },
  { medium: 'transparent watercolour', binder: 'gum arabic', note: 'the gum stays water-soluble, so dried paint can be re-wetted' },
  { medium: 'acrylic paint', binder: 'a synthetic polymer emulsion', note: 'the acrylic polymer dries quickly to a flexible, water-resistant film' },
  { medium: 'egg tempera', binder: 'egg yolk', note: 'it was the main medium for panel paintings before oil became common' },
  { medium: 'encaustic', binder: 'molten beeswax', note: 'the wax is applied hot and fused with heat' },
  { medium: 'casein paint', binder: 'milk protein', note: 'casein is the main protein of milk, and the paint dries fast to a matt finish' },
];

/** Pencil grades from hardest (lightest mark) to softest (darkest mark). */
const GRADES = ['9H', '8H', '7H', '6H', '5H', '4H', '3H', '2H', 'H', 'F', 'HB', 'B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B'] as const;

type PrintCat = 'relief' | 'intaglio' | 'planographic' | 'stencil';
const PRINT_CAT_NAME: Readonly<Record<PrintCat, string>> = {
  relief: 'relief printing',
  intaglio: 'intaglio printing',
  planographic: 'planographic printing',
  stencil: 'stencil printing',
};
const PRINT_CAT_HOW: Readonly<Record<PrintCat, string>> = {
  relief: 'relief: ink sits on the raised surface left after cutting away the non-printing areas',
  intaglio: 'intaglio: ink is held in lines or pits cut or etched below the plate surface and transferred under heavy pressure',
  planographic: 'planographic: image and non-image areas are on the same flat surface, separated chemically (grease and water repel)',
  stencil: 'stencil: ink is pushed through open areas of a stencil or mesh onto the paper',
};
const PRINT_PROCESSES: ReadonlyArray<{ name: string; cat: PrintCat }> = [
  { name: 'woodcut', cat: 'relief' },
  { name: 'linocut', cat: 'relief' },
  { name: 'wood engraving', cat: 'relief' },
  { name: 'etching', cat: 'intaglio' },
  { name: 'drypoint', cat: 'intaglio' },
  { name: 'aquatint', cat: 'intaglio' },
  { name: 'mezzotint', cat: 'intaglio' },
  { name: 'line engraving on a copper plate', cat: 'intaglio' },
  { name: 'lithography', cat: 'planographic' },
  { name: 'screen printing (serigraphy)', cat: 'stencil' },
  { name: 'pochoir', cat: 'stencil' },
];
const PRINT_CATS: readonly PrintCat[] = ['relief', 'intaglio', 'planographic', 'stencil'];

type FormProc = 'sub' | 'add' | 'mod' | 'cast';
const FORM_NAME: Readonly<Record<FormProc, string>> = {
  sub: 'subtraction (carving away material)',
  add: 'addition (assembling separate parts)',
  mod: 'modelling (shaping a pliable material)',
  cast: 'casting (pouring a liquid into a mould)',
};
const FORM_EXAMPLES: ReadonlyArray<{ text: string; p: FormProc }> = [
  { text: 'carving a figure out of a block of marble with a chisel', p: 'sub' },
  { text: 'carving a relief panel into a slab of sandstone', p: 'sub' },
  { text: 'whittling a bird from a piece of soft wood with a knife', p: 'sub' },
  { text: 'carving a small figure from a bar of soap', p: 'sub' },
  { text: 'welding steel plates and rods together into a sculpture', p: 'add' },
  { text: 'gluing found objects together into an assemblage', p: 'add' },
  { text: 'slotting flat cardboard planes together at right angles', p: 'add' },
  { text: 'bolting together timber battens to make a large structure', p: 'add' },
  { text: 'pushing and pinching a lump of soft clay into a head with the fingers', p: 'mod' },
  { text: 'shaping a small figure from warm, softened wax by hand', p: 'mod' },
  { text: 'pressing and smoothing plasticine into an animal form', p: 'mod' },
  { text: 'pouring molten bronze into a heat-resistant mould', p: 'cast' },
  { text: 'filling a rubber mould with liquid plaster and letting it set', p: 'cast' },
  { text: 'pouring liquid resin into a silicone mould', p: 'cast' },
];

const MATERIAL_TRUE: readonly Stmt[] = [
  { k: 'plaster', s: 'Plaster of Paris sets by reacting chemically with water and gives off heat as it hardens.' },
  { k: 'wood-grain', s: 'Wood is much stronger along its grain than across it.' },
  { k: 'fired-clay', s: 'Once fired in a kiln, clay can no longer be softened with water.' },
  { k: 'glass', s: 'Glass is an amorphous solid with no regular crystal structure.' },
  { k: 'paper-grain', s: 'Paper folds and tears more cleanly along its grain direction.' },
  { k: 'metal', s: 'Most metals are malleable and can be hammered into thin sheets.' },
  { k: 'wood-moisture', s: 'Wood shrinks and swells as its moisture content changes.' },
];
const MATERIAL_FALSE: readonly FalseStmt[] = [
  {
    k: 'plaster',
    s: 'Plaster of Paris hardens simply by drying in air, with no chemical reaction.',
    why: 'plaster of Paris sets by hydration, as the hemihydrate recombines with water to form gypsum crystals, releasing heat.',
  },
  {
    k: 'fired-clay',
    s: 'Fired clay can be softened again by soaking it in water.',
    why: 'firing changes clay chemically into ceramic; once fired it cannot be returned to a plastic state with water.',
  },
  {
    k: 'glass',
    s: 'Glass has a sharp melting point, like a crystalline solid.',
    why: 'glass is amorphous, so it softens gradually over a range of temperature instead of melting sharply.',
  },
  {
    k: 'wood-grain',
    s: 'Wood has equal strength in every direction.',
    why: 'wood is anisotropic, being much stronger along the grain than across it.',
  },
  {
    k: 'paper-fibre',
    s: 'Paper is made mainly of matted protein fibres.',
    why: 'paper is a mat of cellulose fibres from wood pulp, cotton or other plants.',
  },
  {
    k: 'clay-shrink',
    s: 'Clay shrinks only during firing and not while it dries.',
    why: 'clay shrinks both as its water evaporates during drying and again during firing.',
  },
  { k: 'bronze', s: 'Bronze is a pure metallic element.', why: 'bronze is an alloy, chiefly of copper and tin.' },
];

/** Materials described by a property unique to them in this list. */
const MATERIALS: ReadonlyArray<{ name: string; prop: string }> = [
  { name: 'Plaster of Paris', prop: 'is a white powder that, mixed with water, sets quickly into a hard solid while giving off heat' },
  { name: 'Clay', prop: 'is plastic when moist and turns into a hard, permanent ceramic when fired in a kiln' },
  { name: 'Wood', prop: 'is cut from tree trunks and shows annual growth rings and a pronounced grain' },
  { name: 'Paper', prop: 'is a thin sheet of matted cellulose fibres whose weight is quoted in gsm' },
  { name: 'Glass', prop: 'is a transparent, brittle, amorphous solid made mainly from silica sand' },
  { name: 'Wax', prop: 'is soft and low-melting, and is used for candles and for casting models that are melted out of the mould' },
  { name: 'Bronze', prop: 'is an alloy of copper and tin widely used for cast sculpture' },
];

const PAINT_TRUE: readonly Stmt[] = [
  { k: 'oil-drying', s: 'Oil paint dries by oxidation of its oil binder rather than by evaporation.' },
  { k: 'acrylic', s: 'Acrylic paint can be thinned with water but is water-resistant once dry.' },
  { k: 'wc-whites', s: 'Transparent watercolour is normally worked from light to dark.' },
  { k: 'gouache', s: 'Gouache is more opaque than transparent watercolour.' },
  { k: 'gesso', s: 'Gesso is applied to prime a canvas or panel before painting.' },
  { k: 'fresco', s: 'Buon fresco is painted on wet lime plaster.' },
];
const PAINT_FALSE: readonly FalseStmt[] = [
  {
    k: 'oil-drying',
    s: 'Oil paint dries faster than acrylic paint.',
    why: 'acrylic dries in minutes by evaporation of water, while oil paint takes days to oxidise and become touch-dry.',
  },
  {
    k: 'wc-binder',
    s: 'Transparent watercolour is bound with linseed oil.',
    why: 'watercolour is bound with water-soluble gum arabic; linseed oil is the binder of oil paint.',
  },
  {
    k: 'wc-whites',
    s: 'In transparent watercolour, the white areas are usually painted with thick white paint.',
    why: 'whites in transparent watercolour are normally reserved, i.e. the white paper is left unpainted.',
  },
  {
    k: 'acrylic',
    s: 'Dry acrylic paint can easily be re-dissolved with water.',
    why: 'once the polymer emulsion has dried it forms a water-resistant film that water no longer dissolves.',
  },
  {
    k: 'fresco',
    s: 'Buon fresco is painted on stretched canvas.',
    why: 'buon fresco is painted on fresh, wet lime plaster on a wall.',
  },
  {
    k: 'tempera',
    s: 'Egg tempera uses beeswax as its binder.',
    why: 'egg tempera is bound with egg yolk; beeswax is the binder of encaustic.',
  },
  {
    k: 'impasto',
    s: 'Impasto means applying paint in thin, transparent layers.',
    why: 'impasto is thick paint that keeps the brush or knife marks; thin transparent layers are glazes.',
  },
];

/** Sculpture and ceramics terms with non-overlapping definitions. */
const SCULPTURE_TERMS: ReadonlyArray<{ term: string; def: string }> = [
  { term: 'armature', def: 'an internal framework, such as wire or metal rod, that supports a modelled sculpture' },
  { term: 'maquette', def: 'a small preliminary model made to plan a larger sculpture' },
  { term: 'patina', def: 'a coloured surface film that forms on bronze or copper through oxidation or chemical treatment' },
  { term: 'bas-relief', def: 'carving in which the forms project only slightly from a flat background' },
  { term: 'high relief', def: 'carving in which the forms project from the background by at least half their depth' },
  { term: 'sculpture in the round', def: 'a free-standing sculpture meant to be viewed from all sides' },
  { term: 'plinth', def: 'the block or slab on which a sculpture stands' },
  { term: 'assemblage', def: 'a three-dimensional work made by combining found objects' },
  { term: 'mobile', def: 'a kinetic sculpture of balanced parts that move in air currents' },
  { term: 'slip', def: 'liquid clay used to join scored pieces of clay together' },
  { term: 'contrapposto', def: 'a standing pose with the weight on one leg, so the hips and shoulders tilt in opposite directions' },
];

/** Drawing materials and tools. */
const DRAWING_TOOLS: ReadonlyArray<{ term: string; def: string }> = [
  { term: 'fixative', def: 'a spray varnish that stops charcoal or pastel drawings from smudging' },
  { term: 'tortillon (blending stump)', def: 'a tightly rolled paper stick used to blend graphite or charcoal tones' },
  { term: 'kneaded (putty) eraser', def: 'a soft, mouldable rubber that is pressed onto a drawing to lift charcoal or graphite without abrading the paper' },
  { term: 'willow (vine) charcoal', def: 'thin sticks of charred twigs that give soft, easily erased grey-black lines' },
  { term: 'compressed charcoal', def: 'charcoal powder pressed with a binder into sticks for dense, deep blacks' },
  { term: 'conté crayon', def: 'a square stick of compressed pigment and clay, often in sanguine or sepia' },
  { term: 'silverpoint', def: 'drawing with a metal stylus on a specially prepared ground, giving fine grey lines' },
  { term: 'viewfinder', def: 'a card with a rectangular window used to frame and select a composition' },
];

// ------------------------------------------------------------------ figure

type Mark = 'hatching' | 'cross-hatching' | 'stippling' | 'scribbling';
const MARKS: readonly Mark[] = ['hatching', 'cross-hatching', 'stippling', 'scribbling'];
const MARK_DEF: Readonly<Record<Mark, string>> = {
  hatching: 'parallel lines running in one direction',
  'cross-hatching': 'two sets of parallel lines crossing each other',
  stippling: 'many separate small dots',
  scribbling: 'a continuous, random tangle of lines',
};

const f1 = (x: number): string => String(Math.round(x * 10) / 10);

function markPanel(r: Rng, mark: Mark, x0: number, y0: number, s: number): string {
  const parts: string[] = [];
  const line = (ax: number, ay: number, bx: number, by: number): void => {
    parts.push(`<line x1="${f1(x0 + ax)}" y1="${f1(y0 + ay)}" x2="${f1(x0 + bx)}" y2="${f1(y0 + by)}"/>`);
  };
  if (mark === 'hatching' || mark === 'cross-hatching') {
    const gap = r.int(7, 10);
    // lines x + y = c
    for (let c = gap; c < 2 * s; c += gap) {
      if (c <= s) line(0, c, c, 0);
      else line(c - s, s, s, c - s);
    }
    if (mark === 'cross-hatching') {
      // lines y = x + c
      for (let c = -s + gap; c < s; c += gap) {
        if (c >= 0) line(0, c, s - c, s);
        else line(-c, 0, s, s + c);
      }
    }
    return `<g stroke="#222" stroke-width="1.2">${parts.join('')}</g>`;
  }
  if (mark === 'stippling') {
    const n = r.int(70, 95);
    for (let i = 0; i < n; i++) {
      parts.push(`<circle cx="${f1(x0 + r.real(4, s - 4, 1))}" cy="${f1(y0 + r.real(4, s - 4, 1))}" r="1.8"/>`);
    }
    return `<g fill="#222">${parts.join('')}</g>`;
  }
  const pts: string[] = [];
  const n = r.int(18, 26);
  for (let i = 0; i < n; i++) pts.push(`${f1(x0 + r.real(6, s - 6, 1))},${f1(y0 + r.real(6, s - 6, 1))}`);
  return `<polyline points="${pts.join(' ')}" fill="none" stroke="#222" stroke-width="1.3" stroke-linejoin="round"/>`;
}

function marksFigure(r: Rng, order: readonly Mark[]): string {
  const s = 110;
  const panels = order.map((m, i) => {
    const x0 = 20 + i * 135;
    const y0 = 15;
    const label = `(${'ABCD'[i] ?? ''})`;
    return (
      `<rect x="${x0}" y="${y0}" width="${s}" height="${s}" fill="none" stroke="#222" stroke-width="1.5"/>` +
      markPanel(r, m, x0, y0, s) +
      `<text x="${x0 + s / 2}" y="${y0 + s + 24}" font-size="16" font-family="sans-serif" text-anchor="middle" fill="#222">${label}</text>`
    );
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 170" width="560" height="170">${panels.join('')}</svg>`;
}

// ------------------------------------------------------------------ bank

export default defineBank('design', 'visual-arts', (b) => [
  // ---------------------------------------------------------------- dynamic
  b.dynamic('c-painting-technique-term', { difficulty: 1, origin: 'past-paper', tags: ['drawing and painting'] }, (r) =>
    termQuestion(r, TECHNIQUES, 'drawing and painting'),
  ),

  b.dynamic('c-paint-binder', { difficulty: 1, tags: ['drawing and painting', 'material properties'] }, (r) => {
    const [target, ...others] = r.sample(BINDERS, 4) as [typeof BINDERS[number], ...typeof BINDERS];
    const why = `${cap(target.medium)} is bound with ${target.binder}: ${target.note}. ${others.map((o) => `${cap(o.medium)}: ${o.binder}`).join('; ')}.`;
    if (r.chance(0.5)) {
      return {
        stem: `The binder that holds the pigment in **${target.medium}** is:`,
        answer: cap(target.binder),
        distractors: others.map((o) => cap(o.binder)),
        explanation: why,
      };
    }
    return {
      stem: `Which painting medium uses ${target.binder} as its binder?`,
      answer: cap(target.medium),
      distractors: others.map((o) => cap(o.medium)),
      explanation: why,
    };
  }),

  b.dynamic('c-graphite-grades', { difficulty: 1, origin: 'past-paper', tags: ['drawing and painting'] }, (r) => {
    const idx = r.sample(GRADES.map((_, i) => i), 4).sort((a, b2) => a - b2);
    const grades = idx.map((i) => GRADES[i] as string);
    const askSoft = r.chance(0.5);
    const answer = askSoft ? (grades[3] as string) : (grades[0] as string);
    const softStems = ['Which of the following pencil grades is the softest and gives the darkest mark?'];
    const hardStems = ['Which of the following pencil grades is the hardest and gives the lightest mark?'];
    // "Most suitable" wording only when the answer is the sole H (or B) grade offered; with two
    // B grades (say 4B and 9B) or two H grades (2H and 9H) the less extreme one is arguably better.
    const hCount = idx.filter((i) => i <= 8).length;
    const bCount = idx.filter((i) => i >= 11).length;
    if (bCount === 1) softStems.push('For rich, dark shading in a tonal drawing, the most suitable pencil grade among these is:');
    if (hCount === 1) hardStems.push('For faint, precise construction lines, the most suitable pencil grade among these is:');
    const stem = r.pick(askSoft ? softStems : hardStems);
    return {
      stem,
      answer,
      distractors: grades.filter((g) => g !== answer),
      explanation: `Pencil grades run from hard to soft: 9H … 2H, H, F, HB, B, 2B … 9B. "H" (hard) grades leave light, fine lines and a higher H number is harder; "B" (black) grades are soft and dark and a higher B number is softer. In order from hardest to softest the options are ${grades.join(', ')}, so the answer is ${answer}.`,
    };
  }),

  b.dynamic('c-printmaking-category', { difficulty: 2, origin: 'past-paper', tags: ['drawing and painting'] }, (r) => {
    const target = r.pick(PRINT_PROCESSES);
    const why = `Printmaking families: ${PRINT_CATS.map((c) => PRINT_CAT_HOW[c]).join('; ')}.`;
    if (r.chance(0.5)) {
      return {
        stem: `**${cap(target.name)}** belongs to which family of printmaking?`,
        answer: cap(PRINT_CAT_NAME[target.cat]),
        distractors: PRINT_CATS.filter((c) => c !== target.cat).map((c) => cap(PRINT_CAT_NAME[c])),
        explanation: `${cap(target.name)} is ${PRINT_CAT_NAME[target.cat]}. ${why}`,
      };
    }
    const others = PRINT_CATS.filter((c) => c !== target.cat).map(
      (c) => r.pick(PRINT_PROCESSES.filter((p) => p.cat === c)).name,
    );
    return {
      stem: `Which of the following is an example of **${PRINT_CAT_NAME[target.cat]}**?`,
      answer: cap(target.name),
      distractors: others.map(cap),
      explanation: `${cap(target.name)} is ${PRINT_CAT_NAME[target.cat]}; ${others.map((o) => `${o} is ${PRINT_CAT_NAME[(PRINT_PROCESSES.find((p) => p.name === o) as { cat: PrintCat }).cat]}`).join(', ')}. ${why}`,
    };
  }),

  b.dynamic('c-form-making-process', { difficulty: 1, origin: 'past-paper', tags: ['form-making'] }, (r) => {
    const target = r.pick(FORM_EXAMPLES);
    const all: readonly FormProc[] = ['sub', 'add', 'mod', 'cast'];
    return {
      stem: `A sculptor makes a form by ${target.text}. This method of form-making is:`,
      answer: cap(FORM_NAME[target.p]),
      distractors: all.filter((p) => p !== target.p).map((p) => cap(FORM_NAME[p])),
      explanation: `${cap(target.text)} is ${FORM_NAME[target.p]}. The four basic methods: subtraction removes material from a solid block (carving); addition joins separate pieces (welding, gluing, constructing); modelling manipulates a soft, pliable material such as clay or wax; casting fills a mould with a liquid that then hardens.`,
    };
  }),

  b.dynamic('c-material-statements', { difficulty: 2, tags: ['material properties'] }, (r) =>
    topicStatementQuestion(r, {
      stem: 'Which of the following statements about studio materials is correct?',
      negativeStem: 'Which of the following statements about studio materials is NOT correct?',
      truths: MATERIAL_TRUE,
      falsehoods: MATERIAL_FALSE,
    }),
  ),

  b.dynamic('c-material-by-property', { difficulty: 1, tags: ['material properties'] }, (r) => {
    const [target, ...others] = r.sample(MATERIALS, 4) as [typeof MATERIALS[number], ...typeof MATERIALS];
    if (r.chance(0.5)) {
      return {
        stem: `Which material ${target.prop}?`,
        answer: target.name,
        distractors: others.map((o) => o.name),
        explanation: `${target.name} ${target.prop}. ${others.map((o) => `${o.name} ${o.prop}`).join('; ')}.`,
      };
    }
    return {
      stem: `Which of the following describes **${lower(target.name)}**? It:`,
      answer: target.prop,
      distractors: others.map((o) => o.prop),
      explanation: `${target.name} ${target.prop}. The other descriptions fit ${others.map((o) => lower(o.name)).join(', ')}.`,
    };
  }),

  b.dynamic('c-paint-media-statements', { difficulty: 2, tags: ['drawing and painting'] }, (r) =>
    topicStatementQuestion(r, {
      stem: 'Which of the following statements about painting media is correct?',
      negativeStem: 'Which of the following statements about painting media is NOT correct?',
      truths: PAINT_TRUE,
      falsehoods: PAINT_FALSE,
    }),
  ),

  b.dynamic('c-sculpture-terms', { difficulty: 2, tags: ['form-making'] }, (r) =>
    termQuestion(r, SCULPTURE_TERMS, 'sculpture and ceramics'),
  ),

  b.dynamic('c-drawing-tools', { difficulty: 1, tags: ['drawing and painting'] }, (r) =>
    termQuestion(r, DRAWING_TOOLS, 'drawing'),
  ),

  b.dynamic('c-mark-making-figure', { difficulty: 1, tags: ['drawing and painting'] }, (r) => {
    const order = r.shuffle(MARKS);
    const target = r.pick(MARKS);
    const letter = 'ABCD'[order.indexOf(target)] as string;
    return {
      stem: `The figure shows four ways of building up tone in a drawing. Which panel shows **${target}**?`,
      figure: marksFigure(r, order),
      answer: letter,
      distractors: ['A', 'B', 'C', 'D'].filter((l) => l !== letter),
      fixedOrder: ['A', 'B', 'C', 'D'],
      explanation: `${cap(target)} uses ${MARK_DEF[target]}, as in panel (${letter}). ${order
        .map((m, i) => `(${'ABCD'[i] ?? ''}) ${m}`)
        .join(', ')}.`,
    };
  }),

  // ---------------------------------------------------------------- fixed
  ...b.mcqs([
    // drawing and painting
    {
      id: 'c-sfumato-artist', d: 1, o: 'past-paper', t: ['drawing and painting'],
      q: 'The technique of sfumato, with its soft, smoky gradations of tone, is most closely associated with:',
      a: 'Leonardo da Vinci',
      x: ['Caravaggio', 'Vincent van Gogh', 'Georges Seurat'],
      e: 'Leonardo developed sfumato, seen in the Mona Lisa, blending tones so subtly that no hard outlines remain. Caravaggio is known for dramatic chiaroscuro (tenebrism), van Gogh for thick impasto and Seurat for pointillist dots.',
    },
    {
      id: 'c-watercolour-whites', d: 1, o: 'past-paper', t: ['drawing and painting'],
      q: 'In transparent watercolour painting, the brightest whites are normally obtained by:',
      a: 'leaving the white paper unpainted',
      x: ['mixing white pigment into every wash', 'adding extra gum arabic to the wash', 'applying a final coat of clear varnish'],
      e: 'Transparent watercolour has no white of its own: light passes through the thin washes and reflects off the paper. Whites are therefore reserved (left as bare paper), and the painting is built from light to dark.',
    },
    {
      id: 'c-gouache-opaque', d: 1, t: ['drawing and painting'],
      q: 'Gouache differs from transparent watercolour mainly because gouache:',
      a: 'is opaque, with more pigment and often a white filler',
      x: ['uses linseed oil as its binder', 'dries to a permanently waterproof film', 'can be applied only on stretched canvas'],
      e: 'Both are bound with gum arabic and can be re-wetted, but gouache carries a much higher pigment load (often with chalk or white filler), so it covers the paper opaquely and flatly instead of letting it show through.',
    },
    {
      id: 'c-charcoal-source', d: 1, t: ['drawing and painting', 'material properties'],
      q: 'Artists’ stick charcoal is made by:',
      a: 'heating wood such as willow twigs with little or no air',
      x: ['mixing graphite powder with clay and firing it', 'grinding lumps of natural coal into sticks', 'binding soot with gum arabic into hard cakes'],
      e: 'Charcoal is charred wood: willow or vine twigs are heated in a closed container so they carbonise instead of burning. Graphite mixed with clay and fired is pencil "lead", soot bound with glue or gum is a black ink pigment rather than charcoal, and mineral coal is not used.',
    },
    {
      id: 'c-fat-over-lean', d: 3, t: ['drawing and painting'],
      q: 'In layered oil painting, the "fat over lean" rule means that each successive layer should:',
      a: 'contain more oil than the layer beneath it',
      x: ['contain less oil than the layer beneath it', 'be applied only after the layer beneath is varnished', 'be thinned with water instead of solvent'],
      e: 'Oil-rich ("fat") paint dries more slowly and stays more flexible than solvent-thinned ("lean") paint. Putting a lean, fast-drying, brittle layer over a fat one makes the top layer crack as the lower layer keeps moving, so oil content must increase upwards.',
    },
    {
      id: 'c-buon-fresco', d: 2, o: 'past-paper', t: ['drawing and painting'],
      q: 'In buon (true) fresco, pigments ground in water are applied to:',
      a: 'fresh, wet lime plaster',
      x: ['dry plaster that has fully set', 'a primed linen canvas', 'a wooden panel coated with gesso'],
      e: 'In buon fresco the pigment soaks into wet lime plaster and is locked in as the lime reacts with carbon dioxide to form calcium carbonate, so the colour becomes part of the wall. Painting on dry plaster is fresco secco, which needs a binder and flakes more easily.',
    },
    // printmaking
    {
      id: 'c-lithography-principle', d: 2, t: ['drawing and painting'],
      q: 'Lithography is based on the principle that:',
      a: 'grease and water repel each other',
      x: ['ink is held in grooves cut below the surface', 'ink is pushed through a fine mesh stencil', 'only the raised parts of the block receive ink'],
      e: 'A lithograph is drawn with a greasy crayon on a flat stone or plate, which is then wetted: water stays on the bare areas and the oily ink sticks only to the greasy image (planographic). Grooves describe intaglio, mesh stencils screen printing and raised parts relief printing.',
    },
    {
      id: 'c-mezzotint-process', d: 3, t: ['drawing and painting'],
      q: 'In mezzotint, the whole plate is first roughened with a rocker, and the artist then:',
      a: 'scrapes and burnishes areas smooth, working from dark to light',
      x: ['draws through an acid-resistant ground and bites the lines in acid', 'fuses rosin dust to the plate and etches it to create tone', 'cuts away the non-printing areas so the image stands in relief'],
      e: 'A rocked mezzotint plate holds ink everywhere and prints solid black; smoothing areas with a scraper and burnisher makes them hold less ink and print lighter, so the image is worked from dark to light. The other options describe line etching, aquatint and relief cutting.',
    },
    // form-making and material properties
    {
      id: 'c-lost-wax', d: 2, o: 'past-paper', t: ['form-making'],
      q: 'In lost-wax (cire perdue) casting, the wax model is:',
      a: 'melted out of a heat-resistant mould, leaving a cavity for molten metal',
      x: ['kept inside the finished bronze as a permanent core', 'coated with a thin skin of bronze and left in place', 'carved directly into a solid block of bronze'],
      e: 'The wax model is encased in a refractory mould; heating melts the wax out ("lost"), and molten bronze is poured into the cavity it leaves. Breaking the mould reveals a metal copy of the wax original.',
    },
    {
      id: 'c-plaster-setting', d: 2, t: ['material properties'],
      q: 'Plaster of Paris hardens after it is mixed with water because:',
      a: 'it recombines chemically with water to form gypsum crystals',
      x: ['the water evaporates and leaves the powder packed together', 'the warm mixture fuses like molten glass', 'it absorbs carbon dioxide from the air like lime mortar'],
      e: tex`Plaster of Paris is calcium sulfate hemihydrate. With water it hydrates back to gypsum: $\mathrm{CaSO_4\cdot\tfrac{1}{2}H_2O + 1\tfrac{1}{2}H_2O \rightarrow CaSO_4\cdot 2H_2O}$. The interlocking crystals make it set within minutes and the reaction releases heat.`,
    },
    {
      id: 'c-wedging-clay', d: 1, o: 'past-paper', t: ['material properties', 'form-making'],
      q: 'Clay is wedged (kneaded) before it is used mainly to:',
      a: 'remove trapped air and make it uniform',
      x: ['make it waterproof before firing', 'harden it so that it needs no firing', 'change its colour after firing'],
      e: 'Wedging pushes out air pockets and evens out the moisture and texture. Trapped air expands when heated and can crack or burst a piece in the kiln.',
    },
    {
      id: 'c-leather-hard', d: 2, t: ['material properties', 'form-making'],
      q: 'Clay that is firm enough to hold its shape but still damp enough to be carved, burnished or joined with slip is described as:',
      a: 'leather-hard',
      x: ['bone-dry', 'bisque', 'slip'],
      e: 'Leather-hard clay has lost much of its water but is still slightly damp, ideal for trimming, carving and joining. Bone-dry clay is too brittle to join, bisque has already been fired once, and slip is liquid clay.',
    },
    {
      id: 'c-balsa-hardwood', d: 3, t: ['material properties'],
      q: 'Balsa, one of the lightest and softest timbers used for model-making, is classified as a:',
      a: 'hardwood, because it comes from a broad-leaved flowering tree',
      x: ['softwood, because it is soft and light', 'softwood, because it comes from a cone-bearing tree', 'manufactured board, not a natural timber'],
      e: 'Hardwood and softwood are botanical classes, not measures of hardness: hardwoods come from broad-leaved angiosperms (balsa, oak, sheesham) and softwoods from conifers (pine, deodar). Balsa is a hardwood even though it is very soft.',
    },
    {
      id: 'c-firing-temperature-order', d: 3, t: ['material properties'],
      q: 'Arranged from the lowest to the highest typical firing temperature, the clay bodies are:',
      a: 'earthenware, stoneware, porcelain',
      x: ['porcelain, stoneware, earthenware', 'stoneware, earthenware, porcelain', 'earthenware, porcelain, stoneware'],
      e: 'Earthenware is fired at roughly 1000–1150 °C and stays porous; stoneware at about 1200–1300 °C becomes dense and vitrified; porcelain needs the highest temperatures, about 1250–1400 °C, to become white, hard and translucent.',
    },
  ]),
]);
