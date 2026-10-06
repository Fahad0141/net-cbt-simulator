/**
 * Curated, verified tables for the "Contemporary and Emerging Practices" chapter
 * (design/contemporary-practice). Imported by `contemporary-practice.ts`.
 *
 * Rules for entries:
 * - Every `known` / `property` / `use` / `definition` must belong to exactly ONE entry of its
 *   table, so that the same column of other rows always gives definitely-wrong distractors.
 * - Facts that are not certain are left out (`known` is optional for people).
 */

/** Renowned Pakistani (and Pakistan-born) artists. */
export interface Artist {
  name: string;
  /** Primary field, used for role questions. */
  field: 'painter' | 'artist';
  /** One distinctive, uniquely attributable achievement or work (optional). */
  known?: string;
}

export const ARTISTS: readonly Artist[] = [
  { name: 'Sadequain', field: 'painter', known: 'the ceiling mural of Frere Hall, Karachi' },
  { name: 'Abdur Rahman Chughtai', field: 'painter', known: "Muraqqa-e-Chughtai, an illustrated edition of Ghalib's poetry" },
  { name: 'Anwar Jalal Shemza', field: 'painter', known: 'the "Roots" series of paintings' },
  { name: 'Shakir Ali', field: 'painter', known: 'heading the National College of Arts, Lahore, as principal' },
  { name: 'Jamil Naqsh', field: 'painter', known: 'paintings of women and pigeons' },
  { name: 'Shahzia Sikander', field: 'painter', known: '"The Scroll", a contemporary miniature painting' },
  { name: 'Imran Qureshi', field: 'painter', known: 'a 2013 rooftop installation at the Metropolitan Museum, New York' },
  { name: 'Anna Molka Ahmed', field: 'painter', known: 'founding the Fine Arts department of the University of the Punjab' },
  { name: 'Rasheed Araeen', field: 'artist', known: 'founding the London art journal "Third Text"' },
  { name: 'Ismail Gulgee', field: 'painter' },
  { name: 'Zahoor ul Akhlaq', field: 'painter' },
  { name: 'Bashir Mirza', field: 'painter' },
  { name: 'Ahmed Parvez', field: 'painter' },
  { name: 'Zubeida Agha', field: 'painter' },
];

/** Renowned Pakistani architects (for "which of these is an architect / painter" items). */
export const PAKISTANI_ARCHITECTS: readonly string[] = [
  'Nayyar Ali Dada',
  'Yasmeen Lari',
  'Kamil Khan Mumtaz',
  'Habib Fida Ali',
  'Arshad Abdulla',
  'Arif Masood',
  'Yahya Merchant',
];

/** Landmarks in Pakistan with their designers. */
export interface Landmark {
  name: string;
  architect: string;
  /** Short description that identifies only this landmark (optional). */
  description?: string;
}

export const LANDMARKS: readonly Landmark[] = [
  { name: 'Faisal Mosque, Islamabad', architect: 'Vedat Dalokay', description: 'a tent-like, eight-sided concrete shell framed by four slender minarets' },
  { name: 'Minar-e-Pakistan, Lahore', architect: 'Nasreddin Murat-Khan', description: 'a tower standing where the 1940 Lahore Resolution was passed' },
  { name: 'Pakistan Monument, Islamabad', architect: 'Arif Masood', description: 'a flower-shaped monument of granite petals on the Shakarparian hills' },
  { name: 'Mazar-e-Quaid, Karachi', architect: 'Yahya Merchant', description: 'the white marble mausoleum of Muhammad Ali Jinnah' },
  { name: 'Alhamra Arts Council, Lahore', architect: 'Nayyar Ali Dada', description: 'a complex of red-brick performing-arts halls on The Mall, Lahore' },
  { name: 'Parliament House, Islamabad', architect: 'Edward Durell Stone' },
  { name: 'Finance and Trade Centre, Karachi', architect: 'Yasmeen Lari' },
  { name: 'Master plan of Islamabad', architect: 'Constantinos Doxiadis' },
];

/** Emerging and smart materials with one distinguishing property. */
export interface Material {
  name: string;
  property: string;
}

export const MATERIALS: readonly Material[] = [
  { name: 'Aerogel', property: 'an ultra-light solid, mostly air, that is an exceptional thermal insulator' },
  { name: 'Self-healing concrete', property: 'concrete containing bacteria that seal its own cracks with limestone' },
  { name: 'Cross-laminated timber (CLT)', property: 'an engineered wood made of timber layers glued at right angles into large structural panels' },
  { name: 'Mycelium composite', property: 'a biodegradable composite grown from fungal threads on farm waste' },
  { name: 'Electrochromic (smart) glass', property: 'glazing that changes its tint when a small voltage is applied' },
  { name: 'Photovoltaic glass', property: 'glazing that generates electricity from the sunlight falling on it' },
  { name: 'Translucent concrete', property: 'concrete with embedded optical fibres that let light pass through' },
  { name: 'Shape-memory alloy', property: 'a metal that returns to a preset shape when it is heated' },
  { name: 'Phase-change material', property: 'a substance that stores and releases heat as it melts and solidifies' },
  { name: 'ETFE foil', property: 'a light, transparent polymer used in inflated cushions instead of glass' },
  { name: 'Hempcrete', property: 'a lightweight, insulating mix of hemp shiv and a lime binder' },
  { name: 'Self-cleaning glass', property: 'glass with a titanium dioxide coating that breaks down dirt in sunlight' },
  { name: 'Graphene', property: 'a single layer of carbon atoms that is extremely strong and conductive' },
];

/** Digital design and fabrication technologies with what they do. */
export interface Technology {
  name: string;
  use: string;
}

export const TECHNOLOGIES: readonly Technology[] = [
  { name: '3D printing (additive manufacturing)', use: 'builds an object layer by layer directly from a digital model' },
  { name: 'CNC milling', use: 'carves a solid block with computer-controlled rotating cutting tools' },
  { name: 'Building Information Modelling (BIM)', use: 'keeps one shared model holding data on every building component' },
  { name: 'Parametric design', use: 'generates form from rules, so changing one input updates the whole model' },
  { name: 'Laser cutting', use: 'cuts flat sheet material precisely with a focused beam of light' },
  { name: 'Virtual reality (VR)', use: 'lets a client walk through an unbuilt design in an immersive headset' },
  { name: 'Augmented reality (AR)', use: 'overlays a digital model on a live camera view of the real site' },
  { name: '3D laser scanning', use: 'records the geometry of an existing building as a point cloud' },
];

/** Studio-culture vocabulary. */
export interface StudioTerm {
  term: string;
  definition: string;
}

export const STUDIO_TERMS: readonly StudioTerm[] = [
  { term: 'Charrette', definition: 'an intense, time-limited session in which a group works out a design together' },
  { term: 'Jury', definition: 'a formal review in which students present finished work to a panel of critics' },
  { term: 'Desk crit', definition: "one-to-one feedback from a tutor given at the student's own desk" },
  { term: 'Precedent study', definition: 'an analysis of existing built works to inform a new design' },
  { term: 'Mood board', definition: "a collage of images, colours and textures that sets a project's visual tone" },
  { term: 'Parti', definition: 'the central organising idea of a design, often shown as a simple diagram' },
  { term: 'Design brief', definition: "a written statement of the client's requirements, budget and goals" },
  { term: 'Thumbnail sketch', definition: 'a small, quick drawing used to try out an idea rapidly' },
];

/** Stages of two widely taught design-process models, in order. */
export const DESIGN_THINKING: readonly string[] = ['Empathise', 'Define', 'Ideate', 'Prototype', 'Test'];
export const DOUBLE_DIAMOND: readonly string[] = ['Discover', 'Define', 'Develop', 'Deliver'];

/** Green-building rating systems and the country where each was developed. */
export interface RatingSystem {
  name: string;
  country: string;
}

export const RATING_SYSTEMS: readonly RatingSystem[] = [
  { name: 'LEED', country: 'the United States' },
  { name: 'BREEAM', country: 'the United Kingdom' },
  { name: 'Green Star', country: 'Australia' },
  { name: 'CASBEE', country: 'Japan' },
  { name: 'GRIHA', country: 'India' },
  { name: 'DGNB', country: 'Germany' },
  { name: 'Estidama Pearl', country: 'the United Arab Emirates' },
];
