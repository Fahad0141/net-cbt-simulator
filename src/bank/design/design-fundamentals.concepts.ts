import { defineBank } from '@/engine/authoring';
import type { Rng } from '@/engine/rng';
import { pickDistractors, statementQuestion, tex } from '@/engine/helpers';

/**
 * Design Fundamentals and Theory, part B: conceptual items (elements and principles of
 * design, Gestalt laws, colour theory vocabulary, proportioning systems, patterns in
 * nature, design vocabulary and reading simple compositions). Every local id starts
 * with `c-` so it never collides with part A (`design-fundamentals.ts`, computational
 * items).
 */

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** One answer of an "identify the term" pool with several interchangeable clues. */
interface Entry {
  name: string;
  clues: readonly string[];
  /** Why the clue fits this term (used in the explanation). */
  why: string;
  /** Names that must never appear as distractors with this entry (arguably right). */
  avoid?: readonly string[];
  /** One-way exclusion: names never offered as distractors when THIS entry is the answer. */
  notWhenAnswer?: readonly string[];
}

/** Picks an entry and a clue, returns stem, answer and three safe distractors. */
function identify(r: Rng, pool: readonly Entry[], question: string) {
  const entry = r.pick(pool);
  const clue = r.pick(entry.clues);
  const candidates = pool
    .filter(
      (e) =>
        e !== entry &&
        !entry.avoid?.includes(e.name) &&
        !entry.notWhenAnswer?.includes(e.name) &&
        !e.avoid?.includes(entry.name),
    )
    .map((e) => e.name);
  return {
    stem: `${clue}\n\n${question}`,
    answer: entry.name,
    distractors: pickDistractors(entry.name, r.shuffle(candidates)),
    explanation: `**${entry.name}**: ${entry.why}`,
  };
}

const INK = '#222';
const r1 = (x: number): number => Math.round(x * 10) / 10;

function svg(w: number, h: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;
}
function circ(cx: number, cy: number, rad: number, filled = false, extra = ''): string {
  return `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(rad)}" fill="${filled ? INK : 'none'}" stroke="${INK}" stroke-width="2"${extra}/>`;
}
function sq(cx: number, cy: number, side: number, filled = false, extra = ''): string {
  return `<rect x="${r1(cx - side / 2)}" y="${r1(cy - side / 2)}" width="${r1(side)}" height="${r1(side)}" fill="${filled ? INK : 'none'}" stroke="${INK}" stroke-width="2"${extra}/>`;
}
/** Vertices of an equilateral triangle of side `size` centred on (cx, cy). */
function triPoints(cx: number, cy: number, size: number): Array<[number, number]> {
  const h = (size * Math.sqrt(3)) / 2;
  return [
    [cx, cy - (2 * h) / 3],
    [cx + size / 2, cy + h / 3],
    [cx - size / 2, cy + h / 3],
  ];
}
/** A polygon drawn as separate sides, each shortened by `g` at both ends so every corner is open. */
function brokenPolygon(pts: ReadonlyArray<[number, number]>, g: number): string {
  return pts
    .map(([x1, y1], i) => {
      const [x2, y2] = pts[(i + 1) % pts.length] as [number, number];
      const len = Math.hypot(x2 - x1, y2 - y1);
      const ux = (x2 - x1) / len;
      const uy = (y2 - y1) / len;
      return `<line x1="${r1(x1 + g * ux)}" y1="${r1(y1 + g * uy)}" x2="${r1(x2 - g * ux)}" y2="${r1(y2 - g * uy)}" stroke="${INK}" stroke-width="2"/>`;
    })
    .join('');
}
/** A circle drawn as `n` equal arcs (n >= 3) separated by gaps of `gapDeg` degrees. */
function brokenCircle(cx: number, cy: number, rad: number, n: number, gapDeg: number, startDeg: number): string {
  const out: string[] = [];
  const pt = (deg: number): string => {
    const t = (deg * Math.PI) / 180;
    return `${r1(cx + rad * Math.cos(t))} ${r1(cy + rad * Math.sin(t))}`;
  };
  for (let k = 0; k < n; k++) {
    const a1 = startDeg + (360 * k) / n + gapDeg / 2;
    const a2 = startDeg + (360 * (k + 1)) / n - gapDeg / 2;
    out.push(`<path d="M ${pt(a1)} A ${rad} ${rad} 0 0 1 ${pt(a2)}" fill="none" stroke="${INK}" stroke-width="2"/>`);
  }
  return out.join('');
}
function label(x: number, y: number, text: string): string {
  return `<text x="${r1(x)}" y="${r1(y)}" font-size="15" font-family="sans-serif" text-anchor="middle" fill="${INK}">${text}</text>`;
}

const LETTERS = ['A', 'B', 'C', 'D'] as const;

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

const ELEMENTS: readonly Entry[] = [
  {
    name: 'Line',
    clues: [
      'The path traced by a moving point; it can be actual, or implied by an edge or the direction of a gaze.',
      'A mark longer than it is wide; it can be straight, curved or zigzag, thick or thin, and a contour drawing is built entirely from it.',
    ],
    why: 'line is the path of a moving point, the mark from which contour drawings are built.',
  },
  {
    name: 'Shape',
    clues: [
      'A flat, enclosed area that has only two dimensions: height and width.',
      'A circle, a triangle or a silhouette cut from paper is an example of this element.',
    ],
    why: 'shape is a two-dimensional enclosed area (height and width only).',
    avoid: ['Form'],
  },
  {
    name: 'Form',
    clues: [
      'An element that is three-dimensional, having height, width and depth, and that encloses volume.',
      'A sculpture that can be walked around and viewed from every side is an example of this element.',
    ],
    why: 'form is three-dimensional and has volume (height, width and depth).',
    avoid: ['Shape'],
  },
  {
    name: 'Space',
    clues: [
      'The area around, between and within objects, described as positive (occupied) or negative (empty).',
      'The empty gaps between letters and around a logo are planned as part of this element.',
    ],
    why: 'space is the area around, between and within objects (positive and negative space).',
  },
  {
    name: 'Colour',
    clues: [
      'The element produced when light of particular wavelengths is reflected from a surface to the eye, named by hue.',
      'The element whose properties are hue, saturation and value.',
    ],
    why: 'colour is reflected light perceived by the eye and is described by hue, saturation and value.',
    avoid: ['Value'],
  },
  {
    name: 'Value',
    clues: [
      'The relative lightness or darkness of a surface, regardless of its hue.',
      'A strip of grey steps running evenly from white to black is a scale of this element.',
    ],
    why: 'value is the lightness or darkness of a surface, independent of hue.',
    avoid: ['Colour'],
  },
  {
    name: 'Texture',
    clues: [
      'The surface quality of an object: how it feels, or how it looks as if it would feel, to the touch.',
      'The roughness of tree bark or the smoothness of polished marble describes this element.',
    ],
    why: 'texture is the actual or implied surface quality of an object.',
  },
];

const ELEMENT_NAMES = ELEMENTS.map((e) => e.name);
const PRINCIPLE_NAMES = ['Balance', 'Contrast', 'Emphasis', 'Rhythm', 'Unity', 'Proportion', 'Hierarchy', 'Variety'];

const PRINCIPLES: readonly Entry[] = [
  {
    name: 'Balance',
    clues: [
      'Distributing visual weight so that no part of a composition feels heavier than another.',
      'A large dark shape on the left of a poster is offset by several smaller shapes on the right.',
    ],
    why: 'balance is the even distribution of visual weight across a composition.',
  },
  {
    name: 'Contrast',
    clues: [
      'Placing strongly different qualities side by side, such as black against white or rough beside smooth.',
      'White lettering on a near-black background makes the words easy to read because the two differ so much.',
    ],
    why: 'contrast is the juxtaposition of strongly different qualities (light/dark, rough/smooth).',
    avoid: ['Emphasis', 'Variety'],
  },
  {
    name: 'Emphasis',
    clues: [
      'Making one area of a composition dominant so that the eye goes to it first as the focal point.',
      'A painter arranges a scene so that every figure looks towards the central character, who becomes the focal point.',
    ],
    why: 'emphasis creates a dominant focal point that attracts attention first.',
    avoid: ['Contrast', 'Hierarchy'],
  },
  {
    name: 'Rhythm',
    clues: [
      'Repeating elements at regular or progressive intervals to create a visual tempo.',
      'A long row of identical columns along a colonnade, each spaced equally, gives the facade a steady beat.',
    ],
    why: 'rhythm is the organised repetition of elements at intervals, like a beat in music.',
    avoid: ['Unity'],
  },
  {
    name: 'Unity',
    clues: [
      'The quality that makes all parts of a design look as if they belong together as one coherent whole.',
      'A brochure uses one typeface family, one colour palette and one grid on every page so it reads as a single work.',
    ],
    why: 'unity is the sense that every part belongs to one coherent whole.',
    avoid: ['Rhythm'],
  },
  {
    name: 'Proportion',
    clues: [
      'The size relationship of one part of a design to another part and to the whole.',
      'A figure drawn with a head far too large for its body looks wrong because this principle is ignored.',
    ],
    why: 'proportion is the size relationship between parts and the whole.',
  },
  {
    name: 'Hierarchy',
    clues: [
      'Ordering elements so that their relative importance is obvious: title first, then subheading, then body text.',
      'A newspaper page uses the largest, boldest type for the lead story and smaller type for less important stories.',
    ],
    why: 'hierarchy arranges elements in a clear order of importance.',
    avoid: ['Emphasis', 'Contrast'],
  },
  {
    name: 'Variety',
    clues: [
      'Introducing differences of shape, size or colour to add interest and avoid monotony.',
      'A garden designer mixes plants of different heights, leaf shapes and colours so the border never looks dull.',
    ],
    why: 'variety adds differences to hold interest and avoid monotony.',
    avoid: ['Contrast'],
  },
];

const GESTALT: readonly Entry[] = [
  {
    name: 'Proximity',
    clues: [
      'Objects placed close to one another are perceived as a group, even if they look different.',
      'On a form, each label sits just above its own input box, so the eye pairs every label with the correct box.',
    ],
    why: 'by proximity, items that are near each other are seen as a group.',
    avoid: ['Common region'],
  },
  {
    name: 'Similarity',
    clues: [
      'Elements that share a colour, shape or size are perceived as related, even when they are spread apart.',
      'On a web page every link is shown in the same blue, so readers recognise all of them as one kind of item.',
    ],
    why: 'by similarity, elements sharing visual features are seen as belonging together.',
  },
  {
    name: 'Closure',
    clues: [
      'The mind completes an incomplete outline and perceives a whole shape that is not fully drawn.',
      'A logo made of separate arcs with gaps between them is still read as one complete circle.',
    ],
    why: 'by closure, the brain fills in gaps to perceive complete shapes.',
    avoid: ['Continuity', 'Figure-ground'],
  },
  {
    name: 'Continuity',
    clues: [
      'The eye prefers to follow the smoothest path, so two crossing lines are seen as two continuous lines, not four pieces.',
      'Items arranged along a gentle curve are read in sequence because the eye keeps travelling along the curve.',
    ],
    why: 'by continuity (good continuation), the eye follows smooth, unbroken paths.',
    avoid: ['Closure'],
  },
  {
    name: 'Figure-ground',
    clues: [
      'We instinctively separate an object from its background; in an ambiguous image the two can swap roles.',
      'In a logo, the white gap between two dark shapes forms a hidden arrow that viewers suddenly notice.',
    ],
    why: 'figure-ground is the separation of a shape (figure) from its surroundings (ground).',
    avoid: ['Closure'],
  },
  {
    name: 'Common region',
    clues: [
      'Elements enclosed within the same boundary are perceived as a group.',
      'Products shown inside the same bordered card on a shopping site are read as one group, even if spaced apart.',
    ],
    why: 'by common region, items enclosed by a shared boundary are seen as a group.',
    avoid: ['Proximity'],
  },
  {
    name: 'Common fate',
    clues: [
      'Elements that move together in the same direction are perceived as a single unit.',
      'Among dots scattered evenly on a screen, the few that start drifting upward together are instantly seen as one group.',
    ],
    why: 'by common fate, elements moving in the same direction are grouped together.',
  },
];

const COLOUR_TERMS: readonly Entry[] = [
  {
    name: 'Hue',
    clues: ['The name of a colour family, such as red, yellow or blue, given by its position on the colour wheel.'],
    why: 'hue is the pure colour name, set by its position on the colour wheel.',
  },
  {
    name: 'Value',
    clues: ['How light or how dark a colour is.'],
    why: 'value (often called tone in British usage) is the lightness or darkness of a colour.',
    avoid: ['Tint', 'Shade', 'Tone'],
  },
  {
    name: 'Saturation',
    clues: ['The purity or intensity of a colour: how vivid or how dull it appears.'],
    why: 'saturation (also called chroma or intensity) is the purity or vividness of a colour.',
  },
  {
    name: 'Tint',
    clues: ['A hue lightened by adding white.', 'Pink obtained by mixing red with white.'],
    why: 'a tint is a hue mixed with white.',
    avoid: ['Value'],
    // In British usage 'tone' also means lightness/darkness, so "a lighter tone" is defensible here.
    notWhenAnswer: ['Tone'],
  },
  {
    name: 'Shade',
    clues: ['A hue darkened by adding black.', 'Maroon obtained by mixing red with black.'],
    why: 'a shade is a hue mixed with black.',
    avoid: ['Value'],
    notWhenAnswer: ['Tone'],
  },
  {
    name: 'Tone',
    clues: ['A hue softened by adding grey (black and white together).'],
    why: 'a tone is a hue mixed with grey, which lowers its saturation.',
    avoid: ['Value'],
  },
  {
    name: 'Colour temperature',
    clues: ['The warmth or coolness a colour suggests: reds and oranges feel warm, blues and greens feel cool.'],
    why: 'colour temperature describes the warm or cool feeling of a colour.',
  },
];

const SCHEMES: ReadonlyArray<{ name: string; sets: readonly string[]; why: string }> = [
  {
    name: 'Complementary',
    sets: ['red and green', 'blue and orange', 'yellow and violet', 'red-orange and blue-green'],
    why: 'the two hues lie directly opposite each other on the colour wheel.',
  },
  {
    name: 'Analogous',
    sets: [
      'yellow, yellow-green and green',
      'blue, blue-violet and violet',
      'red, red-orange and orange',
      'blue-green, blue and blue-violet',
    ],
    why: 'the hues sit next to one another on the colour wheel.',
  },
  {
    name: 'Triadic',
    sets: [
      'red, yellow and blue',
      'orange, green and violet',
      'red-orange, yellow-green and blue-violet',
      'yellow-orange, blue-green and red-violet',
    ],
    why: 'the three hues are equally spaced (120° apart) around the colour wheel.',
  },
  {
    name: 'Split-complementary',
    sets: [
      'yellow with red-violet and blue-violet',
      'red with yellow-green and blue-green',
      'blue with yellow-orange and red-orange',
    ],
    why: 'one hue is used with the two hues on either side of its complement.',
  },
  {
    name: 'Monochromatic',
    sets: [
      'navy, royal blue and pale sky blue',
      'maroon, red and pale pink',
      'forest green, green and pale mint green',
    ],
    why: 'every colour is a tint, tone or shade of one single hue.',
  },
  {
    name: 'Tetradic (square)',
    sets: ['red, blue-violet, green and yellow-orange', 'yellow, red-orange, violet and blue-green'],
    why: 'four hues are equally spaced (90° apart) around the twelve-hue colour wheel.',
  },
];

const NATURE: readonly Entry[] = [
  {
    name: 'Spiral',
    clues: ['The chambers of a nautilus shell', 'The coiled shell of a garden snail', 'The curled horn of a ram'],
    why: 'these grow outward from a centre along a curve that widens steadily, which is a spiral.',
  },
  {
    name: 'Branching (fractal)',
    clues: ['The limbs of a tree', 'The airways (bronchi) of the human lungs', 'The channels of a river delta'],
    why: 'each part divides repeatedly into smaller, similar parts, which is a branching (fractal) pattern.',
    avoid: ['Meander'],
  },
  {
    name: 'Tessellation',
    clues: ['The wax cells of a honeycomb', 'The hexagonal tops of basalt columns formed as lava cooled and cracked'],
    why: 'identical or near-identical cells fit together with no gaps or overlaps, which is a tessellation.',
  },
  {
    name: 'Radial symmetry',
    clues: ['A starfish seen from above', 'A slice cut across an orange', 'A jellyfish seen from above'],
    why: 'identical parts radiate out from a central point, which is radial symmetry.',
  },
  {
    name: 'Bilateral symmetry',
    clues: ['The wings of a butterfly', 'The human face', 'The body of a dragonfly seen from above'],
    why: 'one central axis divides the form into two mirror-image halves, which is bilateral symmetry.',
  },
  {
    name: 'Waves (ripples)',
    clues: ['The ripples left by wind on a sand dune', 'The ridges on a sandy beach after the tide goes out'],
    why: 'regularly repeating crests and troughs form a wave (ripple) pattern.',
    avoid: ['Meander'],
  },
  {
    name: 'Meander',
    clues: ['A slow river looping back and forth across a flat plain'],
    why: 'a single winding channel curving from side to side is a meander.',
    avoid: ['Waves (ripples)', 'Branching (fractal)'],
  },
];

const PROPORTION_SYSTEMS: readonly Entry[] = [
  {
    name: 'Golden section',
    clues: [
      'A line is divided so that the whole is to the longer part as the longer part is to the shorter, a ratio of about 1.618 : 1.',
    ],
    why: 'the golden section divides a length in "extreme and mean ratio", about 1.618 : 1.',
    avoid: ['Fibonacci sequence', 'Modulor', 'Vitruvian proportions'],
  },
  {
    name: 'Modulor',
    clues: [
      'Le Corbusier developed this scale from the height of a standing man with a raised arm, linked by the golden ratio.',
      'A scale of architectural measurements built on a 1.83 m human figure and two interlocking golden-ratio series.',
    ],
    why: "Le Corbusier's Modulor combines human body measurements with the golden ratio.",
    avoid: ['Golden section', 'Fibonacci sequence', 'Vitruvian proportions'],
  },
  {
    name: 'Vitruvian proportions',
    clues: [
      'Leonardo da Vinci drew a man whose outstretched arms and legs fit inside both a circle and a square, after a Roman author.',
    ],
    why: 'the Vitruvian proportions of the ideal human figure, drawn by Leonardo after the Roman architect Vitruvius.',
    avoid: ['Modulor', 'Golden section', 'Fibonacci sequence'],
  },
  {
    name: 'Fibonacci sequence',
    clues: [
      'In the series 1, 1, 2, 3, 5, 8, 13, ... each term is the sum of the two terms before it.',
    ],
    why: 'in the Fibonacci sequence each term is the sum of the previous two.',
    avoid: ['Golden section', 'Modulor', 'Vitruvian proportions'],
  },
  {
    name: 'Modular grid',
    clues: [
      'A framework of columns, rows, margins and gutters used to organise text and images on a page.',
      'Josef Müller-Brockmann promoted this layout framework in the Swiss (International Typographic) Style.',
    ],
    why: 'a modular grid divides the page into columns, rows and gutters to organise layout.',
    avoid: ['Ken (tatami module)'],
  },
  {
    name: 'Ken (tatami module)',
    clues: ['Traditional Japanese rooms are planned in multiples of a floor-mat unit whose sides are in the ratio 2 : 1.'],
    why: 'the Japanese ken system plans rooms in multiples of the 2 : 1 tatami mat.',
    avoid: ['Modular grid'],
  },
  {
    name: 'Rule of thirds',
    clues: [
      'Two horizontal and two vertical lines divide a frame into nine equal parts, and key subjects are placed on the intersections.',
    ],
    why: 'the rule of thirds places subjects on the intersections of lines dividing the frame into thirds.',
  },
];

const VOCAB: readonly Entry[] = [
  {
    name: 'Negative space',
    clues: ['The empty area around and between the subjects of an image.'],
    why: 'negative space is the unoccupied area around and between subjects.',
  },
  {
    name: 'Visual weight',
    clues: ['The perceived heaviness of an element, which increases with its size, darkness and saturation.'],
    why: 'visual weight is how strongly an element seems to pull the eye, set by size, darkness and saturation.',
  },
  {
    name: 'Juxtaposition',
    clues: ['Placing two contrasting elements side by side so that each is seen in relation to the other.'],
    why: 'juxtaposition places contrasting items side by side for comparison.',
  },
  {
    name: 'Motif',
    clues: ['A single distinctive unit that is repeated to build up a pattern.'],
    why: 'a motif is the repeated unit from which a pattern is built.',
  },
  {
    name: 'Scale',
    clues: ['The size of an object compared with a standard, especially the human body.'],
    why: 'scale is size relative to a standard such as the human body.',
  },
  {
    name: 'Silhouette',
    clues: ['The outline of a form filled in with a single dark tone, with no inner detail.'],
    why: 'a silhouette is a solid dark outline shape without inner detail.',
  },
  {
    name: 'Alignment',
    clues: ['Placing elements so that their edges or centres line up along a common axis.'],
    why: 'alignment lines up edges or centres of elements along a common axis.',
  },
  {
    name: 'Thumbnail sketch',
    clues: ['A small, quick drawing made to explore many layout ideas before one is developed.'],
    why: 'a thumbnail sketch is a small, rapid drawing used to try out ideas.',
  },
];

const COLOUR_STATEMENTS = new Map<string, string>([
  ['Mixing red, green and blue light in full strength produces white light.', 'Additive (light) mixing of the three light primaries gives white.'],
  ['Complementary colours lie directly opposite each other on the colour wheel.', 'This is the definition of complementary colours.'],
  ['A tint is produced by adding white to a hue.', 'Tint = hue + white; shade = hue + black; tone = hue + grey.'],
  ['Cyan, magenta and yellow are the subtractive primaries used in printing.', 'Printing inks absorb (subtract) light; CMY are the subtractive primaries.'],
  ['Mixing a pigment with its complement dulls it towards grey or brown.', 'Complements cancel each other, lowering saturation.'],
  ['Mixing red, green and blue light in full strength produces black.', 'False: additive mixing of red, green and blue light gives white, not black.'],
  ['A shade is produced by adding white to a hue.', 'False: adding white gives a tint; a shade is a hue plus black.'],
  ['Analogous colours lie directly opposite each other on the colour wheel.', 'False: analogous colours are neighbours; opposite colours are complementary.'],
  ['Blue and green are usually classed as warm colours.', 'False: blue and green are cool colours; reds, oranges and yellows are warm.'],
  ['Saturation describes how light or dark a colour is.', 'False: lightness or darkness is value; saturation is purity or intensity.'],
]);
const COLOUR_TRUTHS = [...COLOUR_STATEMENTS.keys()].slice(0, 5);
const COLOUR_FALSEHOODS = [...COLOUR_STATEMENTS.keys()].slice(5);

const PROPORTION_STATEMENTS = new Map<string, string>([
  [
    'The ratio of consecutive Fibonacci numbers gets closer and closer to the golden ratio.',
    tex`For example $\frac{8}{5} = 1.6$, $\frac{13}{8} = 1.625$, $\frac{21}{13} \approx 1.615$, approaching $\varphi \approx 1.618$.`,
  ],
  ['Proportion compares the parts of a design with one another and with the whole.', 'This is the definition of proportion.'],
  ['Scale describes the size of an object relative to a standard such as the human body.', 'This is the definition of scale.'],
  [
    'The golden ratio is an irrational number, approximately 1.618.',
    tex`$\varphi = \frac{1 + \sqrt{5}}{2} \approx 1.618$, and $\sqrt{5}$ is irrational.`,
  ],
  ['A modular grid divides a page into columns and rows separated by gutters.', 'This is how a modular grid organises a layout.'],
  ['The golden ratio is exactly 1.5.', tex`False: $\varphi = \frac{1 + \sqrt{5}}{2} \approx 1.618$, not $1.5$.`],
  ['Each term of the Fibonacci sequence is double the previous term.', 'False: each term is the sum of the two previous terms (1, 1, 2, 3, 5, 8, ...).'],
  ['Scale and proportion mean exactly the same thing in design.', 'False: proportion compares parts with each other; scale compares size with an outside standard.'],
  ['The rule of thirds places the main subject exactly at the centre of the frame.', 'False: it places subjects on the intersections of the third-lines, away from the centre.'],
  [
    'The golden ratio can be written exactly as a fraction of two whole numbers.',
    tex`False: $\varphi = \frac{1 + \sqrt{5}}{2}$ is irrational, so no fraction of whole numbers equals it.`,
  ],
]);
const PROPORTION_TRUTHS = [...PROPORTION_STATEMENTS.keys()].slice(0, 5);
const PROPORTION_FALSEHOODS = [...PROPORTION_STATEMENTS.keys()].slice(5);

// ---------------------------------------------------------------------------
// Figures
// ---------------------------------------------------------------------------

type GestaltKind = 'proximity' | 'similarity' | 'closure' | 'region';

function gestaltFigure(r: Rng, kind: GestaltKind): string {
  const parts: string[] = [];
  if (kind === 'proximity') {
    const vertical = r.chance(0.4);
    const groups = vertical ? 3 : r.int(3, 4);
    const per = r.int(2, 3);
    const lines = r.int(3, 5);
    const step = 20;
    const gap = r.int(40, 50);
    const filled = r.chance(0.5);
    const along: number[] = [];
    for (let g = 0; g < groups; g++) {
      for (let k = 0; k < per; k++) along.push(g * ((per - 1) * step + gap) + k * step);
    }
    const len = along[along.length - 1] as number;
    const across = (lines - 1) * step;
    const w = (vertical ? across : len) + 60;
    const h = (vertical ? len : across) + 60;
    for (const a of along) {
      for (let j = 0; j < lines; j++) {
        const x = 30 + (vertical ? j * step : a);
        const y = 30 + (vertical ? a : j * step);
        parts.push(circ(x, y, 6, filled));
      }
    }
    return svg(w, h, parts.join(''));
  }
  if (kind === 'similarity') {
    const rows = r.int(4, 5);
    const cols = r.int(5, 7);
    const byRow = r.chance(0.5);
    const shapes = r.chance(0.5);
    const step = 32;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const odd = (byRow ? i : j) % 2 === 1;
        const x = 30 + j * step;
        const y = 30 + i * step;
        if (shapes) parts.push(odd ? sq(x, y, 14) : circ(x, y, 7));
        else parts.push(circ(x, y, 7, odd));
      }
    }
    return svg((cols - 1) * step + 60, (rows - 1) * step + 60, parts.join(''));
  }
  if (kind === 'closure') {
    const chosen = r.sample(['circle', 'triangle', 'square'] as const, r.int(2, 3));
    // Classic closure figures: outlines with open corners or missing arcs, not dashed lines.
    const g = r.int(10, 15);
    const arcs = r.int(3, 5);
    const gapDeg = r.int(20, 30);
    const startDeg = r.pick([-90, -45, 0, 45]);
    chosen.forEach((s, i) => {
      const cx = 70 + i * 120;
      const cy = 75;
      if (s === 'circle') parts.push(brokenCircle(cx, cy, 42, arcs, gapDeg, startDeg));
      else if (s === 'square') {
        parts.push(brokenPolygon([[cx - 40, cy - 40], [cx + 40, cy - 40], [cx + 40, cy + 40], [cx - 40, cy + 40]], g));
      } else parts.push(brokenPolygon(triPoints(cx, cy + 6, 96), g));
    });
    return svg(chosen.length * 120 + 20, 150, parts.join(''));
  }
  // common region: identical dots at equal spacing (same step across and down), enclosed in rounded boxes
  const rows = r.int(1, 3);
  const size = r.int(2, 3);
  const nGroups = r.int(3, 4);
  const step = 30;
  for (let i = 0; i < rows; i++) {
    const y = 30 + i * step;
    for (let g = 0; g < nGroups; g++) {
      const x0 = 30 + g * size * step;
      parts.push(
        `<rect x="${x0 - 13}" y="${y - 13}" width="${(size - 1) * step + 26}" height="26" rx="9" fill="none" stroke="${INK}" stroke-width="1.5"/>`,
      );
      for (let k = 0; k < size; k++) parts.push(circ(x0 + k * step, y, 6, true));
    }
  }
  return svg((nGroups * size - 1) * step + 60, (rows - 1) * step + 60, parts.join(''));
}

type BalanceKind = 'radial' | 'symmetrical' | 'asymmetrical' | 'allover';

/** Draws one composition inside a 130 x 130 panel whose top-left corner is (x0, y0). */
function balancePanel(r: Rng, kind: BalanceKind, x0: number, y0: number): string {
  const cx = x0 + 65;
  const cy = y0 + 65;
  const out: string[] = [`<rect x="${x0}" y="${y0}" width="130" height="130" fill="none" stroke="${INK}" stroke-width="1"/>`];
  if (kind === 'radial') {
    const n = r.pick([6, 8, 10]);
    const rad = r.int(36, 44);
    const filled = r.chance(0.5);
    for (let k = 0; k < n; k++) {
      const t = (2 * Math.PI * k) / n;
      out.push(circ(cx + rad * Math.cos(t), cy + rad * Math.sin(t), 8, filled));
    }
  } else if (kind === 'symmetrical') {
    const d = r.int(30, 38);
    out.push(`<rect x="${cx - 10}" y="${y0 + 25}" width="20" height="85" fill="${INK}" stroke="${INK}" stroke-width="2"/>`);
    out.push(circ(cx - d, y0 + 42, 11, true), circ(cx + d, y0 + 42, 11, true));
    out.push(sq(cx - d, y0 + 98, 14), sq(cx + d, y0 + 98, 14));
  } else if (kind === 'asymmetrical') {
    const left = r.chance(0.5);
    const big = left ? x0 + 40 : x0 + 90;
    out.push(circ(big, y0 + 62, 27, true));
    const sx = left ? [x0 + 98, x0 + 108, x0 + 86] : [x0 + 32, x0 + 22, x0 + 44];
    out.push(circ(sx[0] as number, y0 + 30, 7), circ(sx[1] as number, y0 + 72, 7), circ(sx[2] as number, y0 + 104, 7));
  } else {
    const n = r.pick([4, 5]);
    const step = 110 / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) out.push(sq(x0 + 10 + step * (j + 0.5), y0 + 10 + step * (i + 0.5), 10));
    }
  }
  return out.join('');
}

type PrincipleKind = 'gradation' | 'emphasis' | 'alternating' | 'radial';

function principleFigure(r: Rng, kind: PrincipleKind): string {
  const parts: string[] = [];
  const useSquares = r.chance(0.5);
  const shape = (x: number, y: number, s: number, filled = false): string =>
    useSquares ? sq(x, y, s * 2, filled) : circ(x, y, s, filled);
  if (kind === 'gradation') {
    const n = r.int(5, 7);
    const start = r.int(4, 6);
    const inc = r.int(3, 4);
    let x = 20;
    for (let k = 0; k < n; k++) {
      const s = start + k * inc;
      x += s;
      parts.push(shape(x, 70, s));
      x += s + 12;
    }
    return svg(Math.round(x + 10), 140, parts.join(''));
  }
  if (kind === 'emphasis') {
    const rows = r.int(3, 4);
    const cols = r.int(5, 7);
    const hi = r.int(0, rows - 1);
    const hj = r.int(0, cols - 1);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) parts.push(shape(30 + j * 36, 30 + i * 36, 9, i === hi && j === hj));
    }
    return svg((cols - 1) * 36 + 60, (rows - 1) * 36 + 60, parts.join(''));
  }
  if (kind === 'alternating') {
    const rows = r.int(1, 2);
    const cols = r.int(6, 9);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const x = 30 + j * 36;
        const y = 30 + i * 40;
        parts.push(j % 2 === 0 ? circ(x, y, 10, true) : sq(x, y, 18));
      }
    }
    return svg((cols - 1) * 36 + 60, (rows - 1) * 40 + 60, parts.join(''));
  }
  const n = r.pick([6, 8, 10, 12]);
  const rad = r.int(55, 65);
  // Outlined hub, so no single filled element competes as a focal point (that is the emphasis figure).
  parts.push(circ(90, 90, 6));
  for (let k = 0; k < n; k++) {
    const t = (2 * Math.PI * k) / n;
    const c = Math.cos(t);
    const s = Math.sin(t);
    parts.push(
      `<line x1="${r1(90 + 12 * c)}" y1="${r1(90 + 12 * s)}" x2="${r1(90 + (rad - 16) * c)}" y2="${r1(90 + (rad - 16) * s)}" stroke="${INK}" stroke-width="1.5"/>`,
    );
    parts.push(shape(90 + rad * c, 90 + rad * s, 9));
  }
  return svg(180, 180, parts.join(''));
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export default defineBank('design', 'design-fundamentals', (b) => [
  b.dynamic('c-element-identify', { difficulty: 1, origin: 'past-paper', tags: ['elements of design'] }, (r) =>
    identify(r, ELEMENTS, 'Which element of design does this describe?'),
  ),

  b.dynamic('c-element-or-principle', { difficulty: 1, origin: 'past-paper', tags: ['elements of design', 'principles of design'] }, (r) => {
    const askElement = r.chance(0.5);
    const answer = r.pick(askElement ? ELEMENT_NAMES : PRINCIPLE_NAMES);
    const distractors = r.sample(askElement ? PRINCIPLE_NAMES : ELEMENT_NAMES, 3);
    return {
      stem: askElement
        ? 'Which of the following is an **element** of design rather than a principle of design?'
        : 'Which of the following is a **principle** of design rather than an element of design?',
      answer,
      distractors,
      explanation: `The elements (the "ingredients") are line, shape, form, space, colour, value and texture. The principles (how the ingredients are arranged) include balance, contrast, emphasis, rhythm, unity, proportion, hierarchy and variety. So **${answer}** is ${askElement ? 'an element' : 'a principle'}; the other options are ${askElement ? 'principles' : 'elements'}.`,
    };
  }),

  b.dynamic('c-principle-identify', { difficulty: 2, origin: 'past-paper', tags: ['principles of design'] }, (r) =>
    identify(r, PRINCIPLES, 'Which principle of design is mainly involved?'),
  ),

  b.dynamic('c-gestalt-identify', { difficulty: 2, origin: 'past-paper', tags: ['Gestalt principles'] }, (r) =>
    identify(r, GESTALT, 'Which Gestalt principle explains this?'),
  ),

  b.dynamic('c-gestalt-figure', { difficulty: 2, tags: ['Gestalt principles', 'visual composition'] }, (r) => {
    const kind = r.pick(['proximity', 'similarity', 'closure', 'region'] as const);
    const info: Record<GestaltKind, { name: string; others: string[]; why: string }> = {
      proximity: {
        name: 'Proximity',
        others: ['Similarity', 'Closure', 'Common region', 'Common fate'],
        why: 'All the dots are identical and nothing encloses them; they form groups only because some are closer together than others.',
      },
      similarity: {
        name: 'Similarity',
        others: ['Proximity', 'Closure', 'Common region', 'Common fate'],
        why: 'The spacing is perfectly even, so the eye groups the items into lines only because alternate lines look alike (same shape or same fill).',
      },
      closure: {
        name: 'Closure',
        others: ['Proximity', 'Similarity', 'Common region', 'Common fate'],
        why: 'Each outline is broken by gaps (open corners or missing arcs), yet the mind completes it and sees whole shapes.',
      },
      region: {
        name: 'Common region',
        others: ['Proximity', 'Similarity', 'Closure', 'Common fate'],
        why: 'The dots are identical and evenly spaced; they are grouped only because each group shares an enclosing boundary.',
      },
    };
    const { name, others, why } = info[kind];
    const figure = gestaltFigure(r, kind);
    const distractors = r.sample(others, 3);
    const fateNote = distractors.includes('Common fate')
      ? ' Common fate needs elements moving together, which a still image of this kind does not show.'
      : '';
    return {
      stem: 'Which Gestalt principle does the figure mainly illustrate?',
      figure,
      answer: name,
      distractors,
      explanation: `**${name}**. ${why}${fateNote}`,
    };
  }),

  b.dynamic('c-balance-figure', { difficulty: 2, tags: ['principles of design', 'visual composition'] }, (r) => {
    const order = r.shuffle(['radial', 'symmetrical', 'asymmetrical', 'allover'] as const);
    const target = r.pick(['radial', 'asymmetrical', 'allover'] as const);
    const panels = order.map((k, i) => balancePanel(r, k, 5 + i * 140, 5)).join('');
    const labels = LETTERS.map((L, i) => label(70 + i * 140, 158, `(${L})`)).join('');
    const answer = LETTERS[order.indexOf(target)] as string;
    const names: Record<BalanceKind, string> = {
      radial: 'radial balance (elements radiate evenly from a central point)',
      symmetrical: 'symmetrical (formal) balance (mirror image about a vertical axis)',
      asymmetrical: 'asymmetrical (informal) balance (one large heavy shape offset by several small light shapes)',
      allover: 'all-over (crystallographic) balance (identical elements spread evenly with no focal point)',
    };
    const asked: Record<'radial' | 'asymmetrical' | 'allover', string> = {
      radial: '**radial** balance',
      asymmetrical: '**asymmetrical** (informal) balance',
      allover: '**all-over** (crystallographic) balance',
    };
    return {
      stem: `Which composition shows ${asked[target]}?`,
      figure: svg(560, 170, panels + labels),
      answer,
      distractors: LETTERS.filter((L) => L !== answer),
      fixedOrder: [...LETTERS],
      explanation: `(${answer}). ${order.map((k, i) => `(${LETTERS[i]}) shows ${names[k]}`).join('; ')}.`,
    };
  }),

  b.dynamic('c-principle-figure', { difficulty: 1, tags: ['principles of design', 'visual composition'] }, (r) => {
    const kind = r.pick(['gradation', 'emphasis', 'alternating', 'radial'] as const);
    const all: Record<PrincipleKind, { name: string; why: string }> = {
      gradation: { name: 'Gradation (progression)', why: 'the same shape grows in size step by step from one end to the other.' },
      emphasis: { name: 'Emphasis (focal point)', why: 'one element is filled in among identical outlined ones, so the eye goes to it first.' },
      alternating: { name: 'Alternating rhythm', why: 'two different motifs repeat in a regular A-B-A-B sequence.' },
      radial: { name: 'Radial balance', why: 'identical elements are spaced evenly around a common centre.' },
    };
    const { name, why } = all[kind];
    const distractors = (Object.keys(all) as PrincipleKind[]).filter((k) => k !== kind).map((k) => all[k].name);
    return {
      stem: 'Which principle of design does the figure most clearly demonstrate?',
      figure: principleFigure(r, kind),
      answer: name,
      distractors,
      explanation: `**${name}**: ${why}`,
    };
  }),

  b.dynamic('c-colour-vocab', { difficulty: 1, origin: 'past-paper', tags: ['colour theory'] }, (r) =>
    identify(r, COLOUR_TERMS, 'Which colour-theory term is this?'),
  ),

  b.dynamic('c-colour-scheme', { difficulty: 2, tags: ['colour theory'] }, (r) => {
    const scheme = r.pick(SCHEMES);
    const set = r.pick(scheme.sets);
    const others = SCHEMES.filter((s) => s !== scheme).map((s) => s.name);
    return {
      stem: `On the traditional twelve-hue (red-yellow-blue) colour wheel, a palette made only of ${set} forms which colour scheme?`,
      answer: scheme.name,
      distractors: r.sample(others, 3),
      explanation: `**${scheme.name}**: ${scheme.why}`,
    };
  }),

  b.dynamic('c-colour-statements', { difficulty: 2, tags: ['colour theory'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about colour is correct?',
      negativeStem: 'Which of the following statements about colour is **NOT** correct?',
      truths: COLOUR_TRUTHS,
      falsehoods: COLOUR_FALSEHOODS,
      explain: (answer) => COLOUR_STATEMENTS.get(answer) ?? '',
    }),
  ),

  b.dynamic('c-nature-pattern', { difficulty: 1, tags: ['patterns in nature'] }, (r) => {
    const q = identify(r, NATURE, '');
    const clue = q.stem.trim();
    return { ...q, stem: `Which pattern found in nature is best illustrated by ${clue.charAt(0).toLowerCase()}${clue.slice(1)}?` };
  }),

  b.dynamic('c-proportion-systems', { difficulty: 2, tags: ['ratio and proportion systems'] }, (r) =>
    identify(r, PROPORTION_SYSTEMS, 'Which proportioning or layout system is described?'),
  ),

  b.dynamic('c-proportion-statements', { difficulty: 2, tags: ['ratio and proportion systems'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about ratio and proportion in design is correct?',
      negativeStem: 'Which of the following statements about ratio and proportion in design is **NOT** correct?',
      truths: PROPORTION_TRUTHS,
      falsehoods: PROPORTION_FALSEHOODS,
      explain: (answer) => PROPORTION_STATEMENTS.get(answer) ?? '',
    }),
  ),

  b.dynamic('c-design-vocab', { difficulty: 1, tags: ['visual composition'] }, (r) =>
    identify(r, VOCAB, 'Which design term matches this definition?'),
  ),

  ...b.mcqs([
    {
      id: 'c-painter-primaries', d: 1, o: 'past-paper', t: ['colour theory'],
      q: "The three primary colours of the traditional painter's colour wheel are:",
      a: 'Red, yellow and blue',
      x: ['Red, green and blue', 'Cyan, magenta and yellow', 'Orange, green and violet'],
      e: "On the traditional painter's wheel the primaries are red, yellow and blue. Red, green and blue are the primaries of light; cyan, magenta and yellow are the printing primaries; orange, green and violet are secondaries.",
    },
    {
      id: 'c-light-primaries', d: 1, t: ['colour theory'],
      q: 'A computer screen creates every colour it displays by mixing light of which three primary colours?',
      a: 'Red, green and blue',
      x: ['Red, yellow and blue', 'Cyan, magenta and yellow', 'Orange, green and violet'],
      e: 'Screens use additive mixing of red, green and blue (RGB) light; full strength of all three gives white.',
    },
    {
      id: 'c-cmyk-key', d: 2, t: ['colour theory'],
      q: 'In CMYK process printing, the letter K stands for:',
      a: 'Key, the black ink plate',
      x: ['Kelvin, the colour temperature', 'Keyline, the cutting outline', 'Knockout, the unprinted white'],
      e: 'CMYK is cyan, magenta, yellow and key; the key plate prints black, which carries the detail and gives deeper darks than mixing CMY.',
    },
    {
      id: 'c-tertiary-colour', d: 1, t: ['colour theory'],
      q: 'Which of the following is a tertiary colour?',
      a: 'Red-orange',
      x: ['Green', 'Violet', 'Yellow'],
      e: 'A tertiary colour mixes a primary with a neighbouring secondary, e.g. red + orange = red-orange. Yellow is a primary; green and violet are secondaries.',
    },
    {
      id: 'c-cool-colour', d: 1, t: ['colour theory'],
      q: 'Which of the following is generally classed as a cool colour?',
      a: 'Blue-green',
      x: ['Red-orange', 'Yellow-orange', 'Yellow'],
      e: 'Cool colours are the blues, greens and blue-violets. Red-orange, yellow-orange and yellow are all warm colours.',
    },
    {
      id: 'c-rubin-vase', d: 1, o: 'past-paper', t: ['Gestalt principles'],
      q: 'The well-known ambiguous image that can be seen either as a vase or as two faces in profile demonstrates:',
      a: 'The figure-ground relationship',
      x: ['The law of common fate', 'The golden section', 'Radial balance'],
      e: 'The image works because figure and background can swap roles: see the vase as figure and the faces become ground, and vice versa. This is figure-ground.',
    },
    {
      id: 'c-gestalt-meaning', d: 2, t: ['Gestalt principles'],
      q: "In Gestalt psychology, the German word 'Gestalt' means approximately:",
      a: 'A unified whole form or configuration',
      x: ['A repeated decorative pattern', 'A golden proportion', 'A contrast of light and dark'],
      e: 'Gestalt means "form" or "configuration". Gestalt theory holds that we perceive an organised whole that is different from the sum of its parts.',
    },
    {
      id: 'c-rule-of-thirds', d: 1, o: 'past-paper', t: ['visual composition', 'ratio and proportion systems'],
      q: 'According to the rule of thirds, the main subject of a photograph or painting is best placed:',
      a: 'On an intersection of the lines dividing the frame into thirds',
      x: ['Exactly at the geometric centre of the frame', 'Touching one outer edge of the frame', 'Along one of the two diagonals of the frame'],
      e: 'Two horizontal and two vertical lines divide the frame into nine equal parts; placing the subject at one of their four intersections gives a livelier, off-centre composition.',
    },
    {
      id: 'c-form-examples', d: 1, t: ['elements of design'],
      q: 'A cube, a sphere and a cone are all examples of which element of design?',
      a: 'Form',
      x: ['Shape', 'Line', 'Texture'],
      e: 'They are three-dimensional, with height, width and depth, so they are forms. Their flat two-dimensional counterparts (square, circle, triangle) are shapes.',
    },
    {
      id: 'c-implied-texture', d: 2, t: ['elements of design'],
      q: 'An artist uses pencil on smooth paper to draw tree bark so that it looks rough. The texture in the drawing is:',
      a: 'Visual (implied) texture',
      x: ['Actual (tactile) texture', 'Positive space', 'Atmospheric perspective'],
      e: 'The paper is smooth to touch; the roughness is only an illusion created by marks, so it is visual (implied) texture. Actual texture can be felt.',
    },
    {
      id: 'c-advancing-colours', d: 2, t: ['colour theory'],
      q: 'Compared with cool colours, warm saturated colours such as red and orange tend to make a surface appear:',
      a: 'Closer to the viewer',
      x: ['Farther from the viewer', 'Smaller than it really is', 'Lighter in visual weight'],
      e: 'Warm, saturated colours advance (seem nearer and larger) and carry more visual weight; cool colours recede.',
    },
    {
      id: 'c-simultaneous-contrast', d: 3, t: ['colour theory'],
      q: 'Two identical mid-grey squares are placed, one on a black ground and one on a white ground. The one on black looks lighter. This effect is called:',
      a: 'Simultaneous contrast',
      x: ['Additive colour mixing', 'Optical colour mixing', 'Colour temperature'],
      e: 'Simultaneous contrast: a colour or tone appears to shift away from its surroundings, so grey looks lighter on black and darker on white. Optical mixing is the blending of small dots of colour by the eye, as in pointillism.',
    },
    {
      id: 'c-sunflower-spirals', d: 2, o: 'past-paper', t: ['patterns in nature', 'ratio and proportion systems'],
      q: 'The numbers of clockwise and anticlockwise spirals in the seed head of a sunflower are typically:',
      a: 'Consecutive Fibonacci numbers, such as 34 and 55',
      x: ['Equal numbers, such as 40 and 40', 'Consecutive prime numbers, such as 37 and 41', 'Multiples of ten, such as 30 and 60'],
      e: 'Seeds are added at a constant angle of about 137.5° (the golden angle), which produces spiral counts that are consecutive Fibonacci numbers, e.g. 21 and 34 or 34 and 55.',
    },
    {
      id: 'c-modulor-basis', d: 2, o: 'past-paper', t: ['ratio and proportion systems'],
      q: "Le Corbusier's Modulor is a proportioning system based on:",
      a: 'Human body measurements and the golden ratio',
      x: ['The 2 : 1 Japanese tatami mat', 'The lower diameter of a classical column', 'The ISO A-series paper sizes'],
      e: 'The Modulor starts from a standing man (1.83 m, 2.26 m with raised arm) and derives two series of measurements related by the golden ratio. The tatami mat is the basis of the Japanese ken; the column diameter is the classical module.',
    },
    {
      id: 'c-golden-rectangle', d: 3, t: ['ratio and proportion systems'],
      q: 'If a square is cut off one end of a golden rectangle (the square built on its shorter side), the rectangle that remains is:',
      a: 'A smaller golden rectangle',
      x: ['A square', 'A rectangle with sides in the ratio 1 : 2', tex`A rectangle with sides in the ratio $1 : \sqrt{2}$`],
      e: tex`For sides $1$ and $\varphi$, removing the $1 \times 1$ square leaves sides $\varphi - 1$ and $1$; since $\varphi^{2} = \varphi + 1$, $\frac{1}{\varphi - 1} = \varphi$, so the remainder is again golden. Repeating this generates the golden spiral.`,
    },
    {
      id: 'c-a-series-ratio', d: 3, t: ['ratio and proportion systems'],
      q: 'ISO A-series paper (A3, A4, A5, ...) keeps exactly the same proportions when a sheet is cut in half because its sides are in the ratio:',
      a: tex`$1 : \sqrt{2}$`,
      x: [tex`$1 : 2$`, tex`$1 : 1.618$`, tex`$3 : 4$`],
      e: tex`Halving a sheet of sides $1$ and $\sqrt{2}$ gives sides $\frac{\sqrt{2}}{2}$ and $1$, whose ratio is again $1 : \sqrt{2}$. A $1 : 2$ sheet halves into squares; a golden rectangle does not halve into a golden rectangle.`,
    },
  ]),
]);
