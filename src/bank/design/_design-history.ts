/**
 * Curated, verified fact tables for the design-history chapter (design movements, artists,
 * designers, buildings, Islamic art and architecture, Pakistani crafts, vernacular climate
 * responses). Imported by `design-history.ts`; not a chapter module itself.
 *
 * Rules for entries:
 * - Every fact must be uncontroversial at NET level. When an item is genuinely linked to more
 *   than one value of a column (e.g. a painter who passed through two movements, a craft made in
 *   two regions), list the extra values in `avoid` / `regions` so they never appear as
 *   distractors.
 * - `family` groups values that are close enough to be arguable (e.g. Impressionism and
 *   Post-Impressionism); generators never offer a distractor from the answer's family.
 */

/* ------------------------------------------------------------------ movements */

export interface Movement {
  name: string;
  /** Approximate start year, used only for chronology questions. */
  start: number;
  /** Human-readable period for explanations. */
  era: string;
  /** Country of origin, when unambiguous. */
  origin: string | null;
  /** One defining characteristic (unique to this movement within the table). */
  trait: string;
  /** Movements with the same family are never offered as distractors for each other. */
  family: string;
  /** Key figures, for explanations. */
  figures: string;
}

export const MOVEMENTS: readonly Movement[] = [
  { name: 'Arts and Crafts', start: 1860, era: 'c. 1860-1910', origin: 'Britain', trait: 'Handcraftsmanship and honest use of materials as a reaction against industrial mass production', family: 'craft', figures: 'William Morris, John Ruskin, Philip Webb' },
  { name: 'Impressionism', start: 1874, era: 'from 1874 (first group exhibition)', origin: 'France', trait: 'Capturing fleeting effects of light with visible brushstrokes, often painted outdoors', family: 'impression', figures: 'Claude Monet, Pierre-Auguste Renoir' },
  { name: 'Art Nouveau', start: 1890, era: 'c. 1890-1910', origin: null, trait: 'Flowing, organic "whiplash" curves inspired by plants and natural forms', family: 'craft', figures: 'Victor Horta, Hector Guimard, Alphonse Mucha' },
  { name: 'Cubism', start: 1907, era: 'from c. 1907', origin: 'France', trait: 'Objects broken into geometric facets and shown from several viewpoints at once', family: 'avant', figures: 'Pablo Picasso, Georges Braque' },
  { name: 'Futurism', start: 1909, era: 'from 1909 (Futurist Manifesto)', origin: 'Italy', trait: 'Celebration of speed, machines and the dynamic movement of the modern city', family: 'avant', figures: 'Umberto Boccioni, Giacomo Balla' },
  { name: 'Dada', start: 1916, era: 'from 1916 (Cabaret Voltaire, Zurich)', origin: null, trait: 'Anti-art absurdity, chance and ready-made objects as a protest against war', family: 'dream', figures: 'Marcel Duchamp, Hugo Ball' },
  { name: 'De Stijl', start: 1917, era: 'c. 1917-1931', origin: 'Netherlands', trait: 'Only straight horizontal and vertical lines with primary colours, black and white', family: 'modern', figures: 'Piet Mondrian, Theo van Doesburg, Gerrit Rietveld' },
  { name: 'Constructivism', start: 1915, era: 'c. 1915-1930s', origin: 'Russia', trait: 'Art put to social use, built from industrial materials and geometric construction', family: 'modern', figures: 'Vladimir Tatlin, Alexander Rodchenko' },
  { name: 'Bauhaus', start: 1919, era: '1919-1933', origin: 'Germany', trait: 'A school uniting fine art, craft and industrial technology in one training', family: 'modern', figures: 'Walter Gropius, Marcel Breuer, Ludwig Mies van der Rohe' },
  { name: 'Surrealism', start: 1924, era: 'from 1924 (Breton\'s manifesto)', origin: 'France', trait: 'Dreamlike, irrational imagery drawn from the unconscious mind', family: 'dream', figures: 'Salvador Dali, Rene Magritte' },
  { name: 'Art Deco', start: 1925, era: '1920s-1930s (1925 Paris exposition)', origin: 'France', trait: 'Bold geometric shapes, zigzags, sunbursts and luxurious, glossy materials', family: 'deco', figures: 'A. M. Cassandre, William Van Alen' },
  { name: 'Abstract Expressionism', start: 1945, era: 'mid-1940s-1950s', origin: 'USA', trait: 'Spontaneous, gestural painting such as action painting and large colour fields', family: 'expr', figures: 'Jackson Pollock, Mark Rothko' },
  { name: 'Pop Art', start: 1955, era: 'mid-1950s-1960s', origin: null, trait: 'Imagery borrowed from advertising, comic strips and mass consumer culture', family: 'pop', figures: 'Andy Warhol, Roy Lichtenstein' },
  { name: 'Minimalism', start: 1960, era: '1960s', origin: 'USA', trait: 'Reduction to simple geometric forms with no expressive or decorative content', family: 'modern', figures: 'Donald Judd, Dan Flavin' },
  { name: 'Postmodernism', start: 1966, era: 'late 1960s-1990s', origin: null, trait: 'Return of ornament, colour, wit and playful historical references', family: 'pop', figures: 'Robert Venturi, Michael Graves, Ettore Sottsass' },
  { name: 'Deconstructivism', start: 1988, era: 'from 1988 (MoMA exhibition)', origin: null, trait: 'Fragmented, non-rectilinear forms that look distorted or dislocated', family: 'decon', figures: 'Frank Gehry, Zaha Hadid, Daniel Libeskind' },
];

/** Movements whose start dates are clear enough for chronology questions. */
export const CHRONO_MOVEMENTS: readonly Movement[] = MOVEMENTS.filter((m) => m.name !== 'Constructivism');

/* ------------------------------------------------------------------ artists */

/** Families of painting movements; distractors never come from the answer's family. */
export const ART_FAMILY: Readonly<Record<string, string>> = {
  Renaissance: 'renaissance',
  Baroque: 'baroque',
  Realism: 'realism',
  Impressionism: 'impression',
  'Post-Impressionism': 'impression',
  Pointillism: 'impression',
  Fauvism: 'expr',
  Expressionism: 'expr',
  'Abstract Expressionism': 'expr',
  Cubism: 'avant',
  Futurism: 'avant',
  Suprematism: 'avant',
  Dada: 'dream',
  Surrealism: 'dream',
  'De Stijl': 'destijl',
  'Art Nouveau': 'nouveau',
  'Pop Art': 'pop',
};

export interface Artist {
  name: string;
  nationality: string;
  movement: string;
  works: readonly string[];
  /** Further movements the artist is linked with (never used as distractors). */
  avoid?: readonly string[];
}

export const ARTISTS: readonly Artist[] = [
  { name: 'Leonardo da Vinci', nationality: 'Italian', movement: 'Renaissance', works: ['Mona Lisa', 'The Last Supper'] },
  { name: 'Michelangelo', nationality: 'Italian', movement: 'Renaissance', works: ['The Creation of Adam', 'the marble statue David'] },
  { name: 'Raphael', nationality: 'Italian', movement: 'Renaissance', works: ['The School of Athens'] },
  { name: 'Sandro Botticelli', nationality: 'Italian', movement: 'Renaissance', works: ['The Birth of Venus'] },
  { name: 'Rembrandt van Rijn', nationality: 'Dutch', movement: 'Baroque', works: ['The Night Watch'] },
  { name: 'Caravaggio', nationality: 'Italian', movement: 'Baroque', works: ['The Calling of Saint Matthew'], avoid: ['Realism'] },
  { name: 'Johannes Vermeer', nationality: 'Dutch', movement: 'Baroque', works: ['Girl with a Pearl Earring'] },
  { name: 'Gustave Courbet', nationality: 'French', movement: 'Realism', works: ['The Stone Breakers'] },
  { name: 'Jean-Francois Millet', nationality: 'French', movement: 'Realism', works: ['The Gleaners'] },
  { name: 'Claude Monet', nationality: 'French', movement: 'Impressionism', works: ['Impression, Sunrise', 'the Water Lilies series'] },
  { name: 'Pierre-Auguste Renoir', nationality: 'French', movement: 'Impressionism', works: ['Bal du moulin de la Galette'] },
  { name: 'Vincent van Gogh', nationality: 'Dutch', movement: 'Post-Impressionism', works: ['The Starry Night', 'Sunflowers'], avoid: ['Expressionism'] },
  { name: 'Paul Cezanne', nationality: 'French', movement: 'Post-Impressionism', works: ['The Card Players'], avoid: ['Cubism'] },
  { name: 'Georges Seurat', nationality: 'French', movement: 'Pointillism', works: ['A Sunday Afternoon on the Island of La Grande Jatte'] },
  { name: 'Henri Matisse', nationality: 'French', movement: 'Fauvism', works: ['Woman with a Hat', 'The Joy of Life'], avoid: ['Pointillism', 'Post-Impressionism'] },
  { name: 'Edvard Munch', nationality: 'Norwegian', movement: 'Expressionism', works: ['The Scream'], avoid: ['Art Nouveau', 'Post-Impressionism'] },
  { name: 'Pablo Picasso', nationality: 'Spanish', movement: 'Cubism', works: ["Les Demoiselles d'Avignon", 'Guernica'], avoid: ['Surrealism', 'Expressionism'] },
  { name: 'Georges Braque', nationality: 'French', movement: 'Cubism', works: ['the 1908 painting "Houses at L\'Estaque"', 'Violin and Candlestick'], avoid: ['Fauvism'] },
  { name: 'Umberto Boccioni', nationality: 'Italian', movement: 'Futurism', works: ['Unique Forms of Continuity in Space'], avoid: ['Pointillism'] },
  { name: 'Giacomo Balla', nationality: 'Italian', movement: 'Futurism', works: ['Dynamism of a Dog on a Leash'], avoid: ['Pointillism'] },
  { name: 'Kazimir Malevich', nationality: 'Kyiv-born', movement: 'Suprematism', works: ['Black Square'] },
  { name: 'Marcel Duchamp', nationality: 'French', movement: 'Dada', works: ['the ready-made "Fountain" (a signed urinal)'], avoid: ['Cubism', 'Futurism'] },
  { name: 'Salvador Dali', nationality: 'Spanish', movement: 'Surrealism', works: ['The Persistence of Memory'], avoid: ['Cubism'] },
  { name: 'Rene Magritte', nationality: 'Belgian', movement: 'Surrealism', works: ['The Son of Man', 'The Treachery of Images'] },
  { name: 'Piet Mondrian', nationality: 'Dutch', movement: 'De Stijl', works: ['Composition with Red, Blue and Yellow', 'Broadway Boogie Woogie'], avoid: ['Cubism'] },
  { name: 'Gustav Klimt', nationality: 'Austrian', movement: 'Art Nouveau', works: ['the gold-leaf painting "The Kiss"'] },
  { name: 'Alphonse Mucha', nationality: 'Czech', movement: 'Art Nouveau', works: ['the Gismonda poster for Sarah Bernhardt'] },
  { name: 'Jackson Pollock', nationality: 'American', movement: 'Abstract Expressionism', works: ['Autumn Rhythm (Number 30)', 'Blue Poles'] },
  { name: 'Andy Warhol', nationality: 'American', movement: 'Pop Art', works: ["Campbell's Soup Cans", 'Marilyn Diptych'] },
  { name: 'Roy Lichtenstein', nationality: 'American', movement: 'Pop Art', works: ['Whaam!', 'Drowning Girl'] },
];

/* ------------------------------------------------------------------ designers */

export interface Designer {
  name: string;
  nationality: string;
  /** Movement / school; null when no single label is safe. */
  movement: string | null;
  work: string;
}

/** Families for designer movements (Bauhaus and Modernism overlap, etc.). */
export const DESIGN_FAMILY: Readonly<Record<string, string>> = {
  'Arts and Crafts': 'craft',
  'Art Nouveau': 'nouveau',
  'Art Deco': 'deco',
  'De Stijl': 'destijl',
  Bauhaus: 'modern',
  Modernism: 'modern',
  'Mid-century Modernism': 'modern',
  Postmodernism: 'pomo',
  'Memphis Group': 'pomo',
};

export const DESIGNERS: readonly Designer[] = [
  { name: 'William Morris', nationality: 'British', movement: 'Arts and Crafts', work: 'the Strawberry Thief textile pattern' },
  { name: 'Charles Rennie Mackintosh', nationality: 'Scottish', movement: 'Art Nouveau', work: 'the high ladder-back chair for Hill House' },
  { name: 'Hector Guimard', nationality: 'French', movement: 'Art Nouveau', work: 'the cast-iron Paris Metro entrances' },
  { name: 'Marcel Breuer', nationality: 'Hungarian', movement: 'Bauhaus', work: 'the tubular-steel Wassily Chair' },
  { name: 'Marianne Brandt', nationality: 'German', movement: 'Bauhaus', work: 'the MT49 brass tea infuser' },
  { name: 'Gerrit Rietveld', nationality: 'Dutch', movement: 'De Stijl', work: 'the Red and Blue Chair' },
  { name: 'Ludwig Mies van der Rohe', nationality: 'German', movement: 'Modernism', work: 'the Barcelona Chair' },
  { name: 'Alvar Aalto', nationality: 'Finnish', movement: 'Modernism', work: 'the bent-plywood Paimio Chair' },
  { name: 'Charles and Ray Eames', nationality: 'American', movement: 'Mid-century Modernism', work: 'the moulded-plywood Lounge Chair and Ottoman' },
  { name: 'Arne Jacobsen', nationality: 'Danish', movement: 'Mid-century Modernism', work: 'the Egg Chair' },
  { name: 'Dieter Rams', nationality: 'German', movement: 'Modernism', work: 'the Braun SK 4 radio-phonograph' },
  { name: 'A. M. Cassandre', nationality: 'French', movement: 'Art Deco', work: 'the Normandie ocean-liner poster' },
  { name: 'Philippe Starck', nationality: 'French', movement: 'Postmodernism', work: 'the Juicy Salif lemon squeezer' },
  { name: 'Michael Graves', nationality: 'American', movement: 'Postmodernism', work: 'the Alessi kettle with a bird-shaped whistle' },
  { name: 'Ettore Sottsass', nationality: 'Italian', movement: 'Memphis Group', work: 'the Carlton room divider' },
  { name: 'Paul Rand', nationality: 'American', movement: null, work: 'the striped IBM logo' },
  { name: 'Milton Glaser', nationality: 'American', movement: null, work: 'the I Love NY logo with a heart' },
  { name: 'Massimo Vignelli', nationality: 'Italian', movement: null, work: 'the 1972 New York City Subway diagram' },
  { name: 'Saul Bass', nationality: 'American', movement: null, work: 'the title sequence and poster for Vertigo' },
];

/* ------------------------------------------------------------------ ideas, quotes, writings */

export interface Idea {
  /** Phrase used inside the stem, e.g. 'the slogan "Less is more"'. */
  idea: string;
  person: string;
  note: string;
}

export const IDEAS: readonly Idea[] = [
  { idea: 'the maxim "Less is more"', person: 'Ludwig Mies van der Rohe', note: 'Mies used it to sum up his stripped-down modernist approach.' },
  { idea: 'the retort "Less is a bore"', person: 'Robert Venturi', note: 'Venturi mocked Mies\'s maxim in his postmodern critique of modernism.' },
  { idea: 'the principle "Form (ever) follows function"', person: 'Louis Sullivan', note: 'Sullivan coined it in his 1896 essay on the tall office building.' },
  { idea: 'the description of a house as "a machine for living in"', person: 'Le Corbusier', note: 'It appears in his 1923 book Towards a New Architecture.' },
  { idea: 'the 1908 essay "Ornament and Crime"', person: 'Adolf Loos', note: 'Loos argued that ornament wastes labour and material.' },
  { idea: 'the motto "Less, but better"', person: 'Dieter Rams', note: 'Rams used it to summarise his ten principles of good design.' },
  { idea: 'the advice to have nothing in your house that you do not know to be useful or believe to be beautiful', person: 'William Morris', note: 'Morris, leader of the Arts and Crafts movement, gave this advice in an 1880 lecture.' },
  { idea: 'the term "organic architecture"', person: 'Frank Lloyd Wright', note: 'Wright used it for buildings in harmony with their site, such as Fallingwater.' },
  { idea: 'the book "A Pattern Language" (1977)', person: 'Christopher Alexander', note: 'Alexander and colleagues set out 253 reusable design patterns.' },
  { idea: 'the book "The Seven Lamps of Architecture" (1849)', person: 'John Ruskin', note: 'Ruskin\'s writing inspired the Arts and Crafts movement.' },
  { idea: 'the "Five Points of a New Architecture" (pilotis, free plan, free facade, ribbon windows, roof garden)', person: 'Le Corbusier', note: 'Le Corbusier demonstrated all five points in the Villa Savoye.' },
  { idea: 'the 1919 manifesto that founded the Bauhaus', person: 'Walter Gropius', note: 'Gropius founded the Bauhaus in Weimar in 1919.' },
  { idea: 'the book "Complexity and Contradiction in Architecture" (1966)', person: 'Robert Venturi', note: 'It is often called the first manifesto of postmodern architecture.' },
];

/* ------------------------------------------------------------------ buildings */

export interface Building {
  name: string;
  architect: string;
  /** 'City, Country', or null when the name gives the place away / the building no longer stands. */
  location: string | null;
  /** Style label; null when no single label is safe. */
  style: string | null;
  /** Further styles the building can be linked with (never used as distractors). */
  avoid?: readonly string[];
}

/** Style families: styles in one family are never offered against each other. */
export const STYLE_FAMILY: Readonly<Record<string, string>> = {
  Modernism: 'modern',
  'High-tech': 'modern',
  'Organic architecture': 'modern',
  'De Stijl': 'modern',
  'Art Deco': 'deco',
  'Art Nouveau': 'nouveau',
  'Arts and Crafts': 'craft',
  Postmodernism: 'pomo',
  Deconstructivism: 'decon',
};

export const BUILDINGS: readonly Building[] = [
  { name: 'Fallingwater', architect: 'Frank Lloyd Wright', location: 'Pennsylvania, USA', style: 'Organic architecture', avoid: ['Arts and Crafts'] },
  { name: 'Villa Savoye', architect: 'Le Corbusier', location: 'Poissy, France', style: 'Modernism' },
  { name: 'Capitol Complex', architect: 'Le Corbusier', location: 'Chandigarh, India', style: 'Modernism' },
  { name: 'Notre-Dame du Haut chapel', architect: 'Le Corbusier', location: 'Ronchamp, France', style: null },
  { name: 'Barcelona Pavilion', architect: 'Ludwig Mies van der Rohe', location: null, style: 'Modernism' },
  { name: 'Seagram Building', architect: 'Ludwig Mies van der Rohe', location: 'New York, USA', style: 'Modernism' },
  { name: 'Bauhaus school building (1926)', architect: 'Walter Gropius', location: 'Dessau, Germany', style: 'Modernism' },
  { name: 'Glass House', architect: 'Philip Johnson', location: 'New Canaan, USA', style: 'Modernism' },
  { name: 'Louvre Pyramid', architect: 'I. M. Pei', location: 'Paris, France', style: null },
  { name: 'Schroder House', architect: 'Gerrit Rietveld', location: 'Utrecht, Netherlands', style: 'De Stijl' },
  { name: 'Red House', architect: 'Philip Webb', location: 'Bexleyheath, UK', style: 'Arts and Crafts' },
  { name: 'Hotel Tassel', architect: 'Victor Horta', location: 'Brussels, Belgium', style: 'Art Nouveau' },
  { name: 'Sagrada Familia', architect: 'Antoni Gaudi', location: 'Barcelona, Spain', style: null },
  { name: 'Chrysler Building', architect: 'William Van Alen', location: 'New York, USA', style: 'Art Deco' },
  { name: 'Portland Building', architect: 'Michael Graves', location: null, style: 'Postmodernism' },
  { name: "Piazza d'Italia", architect: 'Charles Moore', location: 'New Orleans, USA', style: 'Postmodernism' },
  { name: 'Guggenheim Museum Bilbao', architect: 'Frank Gehry', location: null, style: 'Deconstructivism', avoid: ['Postmodernism', 'Organic architecture'] },
  { name: 'Jewish Museum Berlin', architect: 'Daniel Libeskind', location: null, style: 'Deconstructivism', avoid: ['Postmodernism'] },
  { name: 'Heydar Aliyev Center', architect: 'Zaha Hadid', location: 'Baku, Azerbaijan', style: null },
  { name: 'Centre Pompidou', architect: 'Renzo Piano and Richard Rogers', location: 'Paris, France', style: 'High-tech' },
  { name: '30 St Mary Axe ("the Gherkin")', architect: 'Norman Foster', location: 'London, UK', style: 'High-tech' },
  { name: 'Sydney Opera House', architect: 'Jorn Utzon', location: null, style: null },
  { name: 'Church of the Light', architect: 'Tadao Ando', location: 'Osaka, Japan', style: null },
  { name: 'Salk Institute', architect: 'Louis Kahn', location: 'La Jolla, USA', style: null },
  { name: 'Burj Khalifa', architect: 'Adrian Smith (of SOM)', location: 'Dubai, UAE', style: null },
  { name: 'Crystal Palace (1851)', architect: 'Joseph Paxton', location: null, style: null },
  { name: 'Faisal Mosque', architect: 'Vedat Dalokay', location: 'Islamabad, Pakistan', style: null },
  { name: 'Minar-e-Pakistan', architect: 'Nasreddin Murat-Khan', location: 'Lahore, Pakistan', style: null },
  { name: 'Mazar-e-Quaid', architect: 'Yahya Merchant', location: 'Karachi, Pakistan', style: null },
  { name: 'Pakistan Monument', architect: 'Arif Masood', location: 'Islamabad, Pakistan', style: null },
  { name: 'Parliament House of Pakistan', architect: 'Edward Durell Stone', location: null, style: null },
  { name: 'Alhamra Arts Council complex', architect: 'Nayyar Ali Dada', location: 'Lahore, Pakistan', style: null },
];

/* ------------------------------------------------------------------ Islamic art and architecture */

export interface Monument {
  name: string;
  /** 'City, Country', or null when the name gives the place away. */
  location: string | null;
  dynasty: string;
  /** Mughal emperor who commissioned it, when the attribution is clear. */
  patron: string | null;
  note: string;
}

/** Dynasty families (the Mughals descended from Timur, so the two are never set against each other). */
export const DYNASTY_FAMILY: Readonly<Record<string, string>> = {
  Mughal: 'timur',
  Timurid: 'timur',
  'Delhi Sultanate': 'delhi',
  Umayyad: 'umayyad',
  Nasrid: 'nasrid',
  Abbasid: 'abbasid',
  Fatimid: 'fatimid',
  Safavid: 'safavid',
  Ottoman: 'ottoman',
};

export const MUGHAL_EMPERORS: readonly string[] = ['Babur', 'Humayun', 'Akbar', 'Jahangir', 'Shah Jahan', 'Aurangzeb'];

export const MONUMENTS: readonly Monument[] = [
  { name: 'Badshahi Mosque', location: 'Lahore, Pakistan', dynasty: 'Mughal', patron: 'Aurangzeb', note: 'completed in 1673 in red sandstone with white marble domes' },
  { name: 'Wazir Khan Mosque', location: 'Lahore, Pakistan', dynasty: 'Mughal', patron: null, note: 'famous for its kashi-kari tile work and frescoes, built in the 1630s' },
  { name: 'Shalimar Gardens of Lahore', location: null, dynasty: 'Mughal', patron: 'Shah Jahan', note: 'a terraced Persian-style charbagh laid out in 1641-42' },
  { name: 'Taj Mahal', location: 'Agra, India', dynasty: 'Mughal', patron: 'Shah Jahan', note: 'the tomb of Mumtaz Mahal, decorated with pietra dura' },
  { name: 'Humayun\'s Tomb', location: 'Delhi, India', dynasty: 'Mughal', patron: null, note: 'the first great Mughal garden tomb, built in the 1560s-70s' },
  { name: 'Jama Masjid of Delhi', location: null, dynasty: 'Mughal', patron: 'Shah Jahan', note: 'one of the largest Mughal congregational mosques, built in the 1650s' },
  { name: 'Buland Darwaza', location: 'Fatehpur Sikri, India', dynasty: 'Mughal', patron: 'Akbar', note: 'the monumental victory gateway of Fatehpur Sikri' },
  { name: 'Hiran Minar', location: 'Sheikhupura, Pakistan', dynasty: 'Mughal', patron: 'Jahangir', note: 'a tower raised in memory of the emperor\'s pet antelope' },
  { name: 'Shah Jahan Mosque', location: 'Thatta, Pakistan', dynasty: 'Mughal', patron: 'Shah Jahan', note: 'known for its many domes and blue-and-white glazed tiles' },
  { name: 'Tomb of Shah Rukn-e-Alam', location: 'Multan, Pakistan', dynasty: 'Delhi Sultanate', patron: null, note: 'an octagonal brick tomb with glazed tiles built in the Tughlaq period' },
  { name: 'Qutb Minar', location: 'Delhi, India', dynasty: 'Delhi Sultanate', patron: null, note: 'a fluted victory tower begun by Qutb-ud-din Aibak' },
  { name: 'Great Mosque (Mezquita)', location: 'Cordoba, Spain', dynasty: 'Umayyad', patron: null, note: 'famous for its forest of double-tiered red-and-white arches' },
  { name: 'Dome of the Rock', location: 'Jerusalem', dynasty: 'Umayyad', patron: null, note: 'an octagonal shrine completed in 691-92' },
  { name: 'Alhambra palace', location: 'Granada, Spain', dynasty: 'Nasrid', patron: null, note: 'famous for the muqarnas vaults of its Court of the Lions halls' },
  { name: 'Al-Azhar Mosque', location: 'Cairo, Egypt', dynasty: 'Fatimid', patron: null, note: 'founded in 970 together with its famous university' },
  { name: 'Shah (Imam) Mosque', location: 'Isfahan, Iran', dynasty: 'Safavid', patron: null, note: 'covered in seven-colour haft-rangi tiles on Naqsh-e Jahan Square' },
  { name: 'Sheikh Lotfollah Mosque', location: 'Isfahan, Iran', dynasty: 'Safavid', patron: null, note: 'famous for its tiled dome without minarets' },
  { name: 'Suleymaniye Mosque', location: 'Istanbul, Turkiye', dynasty: 'Ottoman', patron: null, note: 'designed by the architect Mimar Sinan' },
  { name: 'Sultan Ahmed (Blue) Mosque', location: 'Istanbul, Turkiye', dynasty: 'Ottoman', patron: null, note: 'named for the blue Iznik tiles of its interior' },
  { name: 'Selimiye Mosque', location: 'Edirne, Turkiye', dynasty: 'Ottoman', patron: null, note: 'considered Mimar Sinan\'s masterpiece' },
  { name: 'Gur-e-Amir', location: 'Samarkand, Uzbekistan', dynasty: 'Timurid', patron: null, note: 'the mausoleum of Timur with a ribbed turquoise dome' },
  { name: 'Great Mosque of Samarra', location: null, dynasty: 'Abbasid', patron: null, note: 'known for its spiral minaret, the Malwiya' },
];

export interface Term {
  term: string;
  meaning: string;
  /** Terms sharing a tag are never offered against each other. */
  tag?: string;
}

export const ISLAMIC_TERMS: readonly Term[] = [
  { term: 'Muqarnas', meaning: 'Honeycomb-like tiers of small niches that fill a vault or dome', tag: 'transition' },
  { term: 'Squinch', meaning: 'An arch built across the corner of a square room to carry a dome', tag: 'transition' },
  { term: 'Arabesque', meaning: 'A rhythmic, interlacing pattern of scrolling leaves and tendrils' },
  { term: 'Girih', meaning: 'Geometric strapwork of interlacing lines forming stars and polygons' },
  { term: 'Iwan', meaning: 'A vaulted hall walled on three sides and open on the fourth' },
  { term: 'Minaret', meaning: 'A tall, slender tower from which the call to prayer is given' },
  { term: 'Mihrab', meaning: 'A niche in the qibla wall showing the direction of Makkah' },
  { term: 'Minbar', meaning: 'A stepped pulpit from which the Friday sermon is delivered' },
  { term: 'Chhatri', meaning: 'An elevated, domed open pavilion raised on pillars' },
  { term: 'Pietra dura', meaning: 'Inlay of cut and polished coloured stones set into marble' },
  { term: 'Jali', meaning: 'A pierced stone or wooden screen with an ornamental pattern' },
  { term: 'Charbagh', meaning: 'A garden divided into four parts by walkways or water channels' },
  { term: 'Sahn', meaning: 'The open courtyard of a mosque' },
  { term: 'Kashi-kari', meaning: 'Decoration with glazed tiles, typically blue, turquoise and white' },
];

export const SCRIPTS: readonly Term[] = [
  { term: 'Kufic', meaning: 'An angular, geometric script used in the earliest Qur\'an manuscripts' },
  { term: 'Naskh', meaning: 'A small, rounded and highly legible script, the basis of most printed Arabic' },
  { term: 'Thuluth', meaning: 'A large, elegant cursive with tall verticals, used for monumental inscriptions' },
  { term: 'Nastaliq', meaning: "A flowing, sloping 'hanging' script used mainly for Persian and Urdu" },
  { term: 'Diwani', meaning: 'A dense, ornate script developed for the Ottoman chancery' },
  { term: "Ruq'ah", meaning: 'A simple, compact script used for everyday handwriting' },
];

/* ------------------------------------------------------------------ crafts of Pakistan */

export interface Craft {
  craft: string;
  /** Main region shown as the answer; null when the craft is practised nationwide or named after its town. */
  region: string | null;
  /** Every region where the craft is a notable tradition (never used as distractors). */
  regions: readonly string[];
  technique: string;
  /** Crafts sharing a group are never offered against each other. */
  group?: string;
}

/** Regions used as answers and distractors for craft questions. */
export const CRAFT_REGIONS: readonly string[] = ['Sindh', 'Multan', 'Balochistan', 'Chiniot', 'Peshawar', 'Gilgit-Baltistan'];

export const CRAFTS: readonly Craft[] = [
  { craft: 'Ajrak', region: 'Sindh', regions: ['Sindh', 'Balochistan'], technique: 'Resist block printing in indigo blue and madder red on cotton' },
  { craft: 'Chunri', region: 'Sindh', regions: ['Sindh', 'Multan', 'Balochistan'], technique: 'Tie-and-dye, binding tiny points of cloth before dyeing' },
  { craft: 'Ralli quilts', region: 'Sindh', regions: ['Sindh', 'Balochistan', 'Multan'], technique: 'Patchwork and applique of cotton scraps joined with running stitch' },
  { craft: 'Blue pottery', region: 'Multan', regions: ['Multan', 'Sindh'], technique: 'Cobalt-blue and turquoise designs painted on white slip, then glazed', group: 'glaze' },
  { craft: 'Kashi (glazed tile) work', region: 'Multan', regions: ['Multan', 'Sindh'], technique: 'Glazed ceramic tiles with blue, turquoise and white floral patterns', group: 'glaze' },
  { craft: 'Camel-skin lamps', region: 'Multan', regions: ['Multan'], technique: 'Translucent camel hide moulded into shape and painted with gold naqashi' },
  { craft: 'Onyx carving', region: 'Balochistan', regions: ['Balochistan', 'Sindh', 'Peshawar'], technique: 'Cutting, turning and polishing banded onyx stone into vessels' },
  { craft: 'Carved wooden furniture', region: 'Chiniot', regions: ['Chiniot', 'Peshawar', 'Gilgit-Baltistan'], technique: 'Deep relief carving of solid sheesham and other hardwoods' },
  { craft: 'Hammered copper and brass ware', region: 'Peshawar', regions: ['Peshawar'], technique: 'Hammering and engraving sheets of copper and brass into utensils' },
  { craft: 'Truck art', region: null, regions: [], technique: 'Bright painted motifs, mirrors and reflective chamak-patti on vehicles' },
  { craft: 'Khaddar', region: null, regions: [], technique: 'Hand-spinning and hand-weaving coarse cotton cloth' },
  { craft: 'Lacquer work (jandi)', region: null, regions: [], technique: 'Turning wood on a lathe and colouring it with heated sticks of lac' },
  { craft: 'Phulkari', region: null, regions: [], technique: 'Darning-stitch floral embroidery in silk floss on coarse cloth' },
];

/* ------------------------------------------------------------------ man and environment */

export interface ClimateFeature {
  feature: string;
  purpose: string;
  /** Features sharing any tag are never offered against each other. */
  tags: readonly string[];
}

export const CLIMATE_FEATURES: readonly ClimateFeature[] = [
  { feature: 'Wind catcher (mangh) on the roof', purpose: 'Catches the prevailing breeze and channels it down into the rooms', tags: ['air'] },
  { feature: 'Thick mud or stone walls', purpose: 'Stores heat by day and releases it at night (thermal mass)', tags: ['thermal'] },
  { feature: 'Jali screen over an opening', purpose: 'Breaks harsh sunlight and glare while letting air through', tags: ['sun', 'air'] },
  { feature: 'Central shaded courtyard', purpose: 'Creates a shaded inner open space that draws air through the house', tags: ['air', 'sun', 'evap'] },
  { feature: 'Deep chajja over windows', purpose: 'Shades walls and windows from high sun and driving rain', tags: ['sun', 'rain'] },
  { feature: 'Steeply pitched roof', purpose: 'Sheds heavy rain and snow quickly', tags: ['rain'] },
  { feature: 'Whitewashed outer walls', purpose: 'Reflects solar radiation to reduce heat gain', tags: ['sun'] },
  { feature: 'Raised plinth', purpose: 'Keeps the floor above flood water and ground damp', tags: ['flood'] },
  { feature: 'Fountain or pool in a courtyard', purpose: 'Cools the surrounding air by evaporation', tags: ['evap'] },
];

/* ------------------------------------------------------------------ heritage */

export const PK_UNESCO: readonly string[] = [
  'Archaeological ruins at Mohenjo-daro',
  'Taxila',
  'Buddhist ruins of Takht-i-Bahi',
  'Lahore Fort and Shalimar Gardens',
  'Makli Necropolis, Thatta',
  'Rohtas Fort',
];

/** Modern Pakistani landmarks that are not World Heritage Sites. */
export const PK_NOT_UNESCO: readonly string[] = [
  'Faisal Mosque, Islamabad',
  'Minar-e-Pakistan, Lahore',
  'Mazar-e-Quaid, Karachi',
  'Pakistan Monument, Islamabad',
  'Alhamra Arts Council, Lahore',
];
