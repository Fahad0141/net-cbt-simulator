/**
 * Computer Science (ICS Part I): Data Communication and Networks.
 *
 * Sub-topics: transmission modes, media, topologies, network types, OSI model,
 * protocols, internet.
 *
 * Computational items: file-transfer time and data-rate arithmetic (bits versus
 * bytes), link and port counts for mesh and star topologies, and baud rate versus
 * bit rate. Conceptual items come from curated pools in which every entry lists
 * the options that would be arguably right and must never be offered (for
 * example IMAP is never a distractor for a POP3 description, and HTTPS is never
 * a distractor for HTTP), so exactly one option is correct.
 */
import { defineBank } from '@/engine/authoring';
import { numericOptions, pickDistractors, tex } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Integer or short exact decimal with comma grouping for math mode: 76800 -> '76{,}800'. */
function grp(x: number): string {
  const clean = Number(x.toPrecision(12));
  const [whole, frac] = String(Math.abs(clean)).split('.');
  const digits = (whole ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, '{,}');
  return `${clean < 0 ? '-' : ''}${digits}${frac ? `.${frac}` : ''}`;
}

/** A value with a roman unit, wrapped in `$...$`. */
const withUnit = (unit: string) => (x: number): string => tex`$${grp(x)}\,\mathrm{${unit}}$`;

// ---------------------------------------------------------------------------
// OSI model data
// ---------------------------------------------------------------------------

const LAYERS = ['Physical', 'Data link', 'Network', 'Transport', 'Session', 'Presentation', 'Application'] as const;
type Layer = (typeof LAYERS)[number];

const LAYER_ROLE: Readonly<Record<Layer, string>> = {
  Physical: 'sends raw bits over the medium (cables, connectors, voltages); hubs and repeaters work here',
  'Data link': 'groups bits into frames and uses physical (MAC) addresses; bridges and switches work here',
  Network: 'uses logical (IP) addresses and routes packets between networks; routers work here',
  Transport: 'gives end-to-end, process-to-process delivery of segments (TCP, UDP, port numbers)',
  Session: 'sets up, manages and ends sessions (dialog control and synchronisation)',
  Presentation: 'translates data formats, compresses and encrypts data',
  Application: 'provides network services to the user (HTTP, FTP, SMTP, DNS)',
};

const layerOption = (l: Layer): string => `${l} layer`;

interface OsiItem {
  stem: string;
  layer: Layer;
  /** Layers that could be argued for and must not appear as distractors. */
  avoid?: readonly Layer[];
}

const OSI_ITEMS: readonly OsiItem[] = [
  { stem: 'In the OSI model, a hub works at the:', layer: 'Physical' },
  { stem: 'In the OSI model, a repeater, which only regenerates a weak signal, works at the:', layer: 'Physical' },
  { stem: 'In the OSI model, a bridge that filters frames using MAC addresses works at the:', layer: 'Data link' },
  { stem: 'In the OSI model, a router that forwards packets between different networks works at the:', layer: 'Network' },
  { stem: 'In the OSI model, the Internet Protocol (IP) belongs to the:', layer: 'Network' },
  { stem: 'In the OSI model, TCP and UDP belong to the:', layer: 'Transport' },
  { stem: 'In the OSI model, HTTP, FTP and SMTP belong to the:', layer: 'Application' },
  { stem: 'In the OSI model, logical (IP) addressing and choosing the best route are jobs of the:', layer: 'Network' },
  { stem: 'In the OSI model, physical (MAC) addressing and framing are jobs of the:', layer: 'Data link' },
  {
    stem: 'In the OSI model, encryption, compression and translation of data formats are jobs of the:',
    layer: 'Presentation',
    avoid: ['Application', 'Transport', 'Session'],
  },
  {
    stem: 'In the OSI model, establishing, maintaining and ending a dialog between two applications is the job of the:',
    layer: 'Session',
    avoid: ['Transport', 'Application'],
  },
  {
    stem: 'In the OSI model, port numbers and process-to-process delivery are handled by the:',
    layer: 'Transport',
    avoid: ['Session'],
  },
  {
    stem: 'In the OSI model, voltage levels, connectors and the bit rate on a cable are defined by the:',
    layer: 'Physical',
  },
  { stem: 'In the OSI model, the data unit called a **frame** belongs to the:', layer: 'Data link' },
  { stem: 'In the OSI model, the data unit called a **packet** (datagram) belongs to the:', layer: 'Network' },
  { stem: 'In the OSI model, the data unit called a **segment** belongs to the:', layer: 'Transport' },
];

// ---------------------------------------------------------------------------
// Protocols
// ---------------------------------------------------------------------------

const PROTOCOL_ROLE: Readonly<Record<string, string>> = {
  HTTP: 'HTTP transfers web pages between a web server and a browser.',
  HTTPS: 'HTTPS is HTTP with encryption (SSL/TLS) for secure web pages.',
  FTP: 'FTP uploads and downloads files between a client and a server.',
  SMTP: 'SMTP sends (pushes) e-mail from a client to a mail server and between mail servers.',
  POP3: 'POP3 downloads e-mail from the server to one device, usually removing it from the server.',
  IMAP: 'IMAP reads e-mail while it stays on the server, keeping folders in sync on many devices.',
  DNS: 'DNS translates domain names into IP addresses.',
  DHCP: 'DHCP automatically assigns IP addresses to devices that join a network.',
  Telnet: 'Telnet gives an unencrypted text login to a remote computer.',
};
const PROTOCOLS = Object.keys(PROTOCOL_ROLE);

interface ProtocolItem {
  name: string;
  stems: readonly string[];
  avoid: readonly string[];
}

const PROTOCOL_ITEMS: readonly ProtocolItem[] = [
  {
    name: 'HTTP',
    stems: [
      'Which protocol does a web browser normally use to request ordinary (unencrypted) web pages from a web server?',
    ],
    avoid: ['HTTPS'],
  },
  {
    name: 'HTTPS',
    stems: [
      'An online banking website shows a padlock in the address bar because the page is sent in encrypted form. The protocol in use is:',
      'Which protocol transfers web pages in encrypted form so that passwords cannot be read in transit?',
    ],
    avoid: ['HTTP'],
  },
  {
    name: 'FTP',
    stems: [
      'A web designer uploads site files to a server with a dedicated file-transfer client. The protocol designed for this is:',
      'Which protocol was designed specifically to upload and download files between a client and a server?',
    ],
    avoid: ['HTTP', 'HTTPS'],
  },
  {
    name: 'SMTP',
    stems: [
      'Which protocol is used to send outgoing e-mail from a mail client to a mail server?',
      'Mail servers pass messages on to each other using:',
    ],
    avoid: [],
  },
  {
    name: 'POP3',
    stems: [
      'Which protocol downloads e-mail from the mail server to a single computer and normally deletes it from the server?',
    ],
    avoid: ['IMAP'],
  },
  {
    name: 'IMAP',
    stems: [
      'Which protocol lets a user read e-mail that stays on the server, so the same mailbox looks identical on a phone and a laptop?',
    ],
    avoid: ['POP3'],
  },
  {
    name: 'DNS',
    stems: [
      'When a user types a website name, which service finds the matching IP address?',
      'Which protocol translates a domain name such as a website address into an IP address?',
    ],
    avoid: [],
  },
  {
    name: 'DHCP',
    stems: [
      'A laptop joins a Wi-Fi network and receives an IP address automatically. The protocol that assigned it is:',
      'Which protocol automatically gives IP addresses to devices on a network?',
    ],
    avoid: [],
  },
  {
    name: 'Telnet',
    stems: ['Which older protocol provides a plain-text (unencrypted) command-line login to a remote computer?'],
    avoid: [],
  },
];

// ---------------------------------------------------------------------------
// Acronyms
// ---------------------------------------------------------------------------

interface Acronym {
  short: string;
  full: string;
  wrong: readonly string[];
  note: string;
}

const ACRONYMS: readonly Acronym[] = [
  {
    short: 'HTTP',
    full: 'HyperText Transfer Protocol',
    wrong: ['HyperText Transmission Program', 'High Text Transfer Protocol', 'HyperText Transport Procedure'],
    note: 'the protocol that carries web pages',
  },
  {
    short: 'URL',
    full: 'Uniform Resource Locator',
    wrong: ['Universal Resource Link', 'Uniform Reference Locator', 'Universal Routing Locator'],
    note: 'the address of a resource on the web',
  },
  {
    short: 'FTP',
    full: 'File Transfer Protocol',
    wrong: ['File Transmission Program', 'Fast Transfer Protocol', 'File Text Protocol'],
    note: 'the protocol for uploading and downloading files',
  },
  {
    short: 'SMTP',
    full: 'Simple Mail Transfer Protocol',
    wrong: ['Standard Mail Transmission Protocol', 'Simple Message Transport Program', 'Secure Mail Transfer Protocol'],
    note: 'the protocol for sending e-mail',
  },
  {
    short: 'ISP',
    full: 'Internet Service Provider',
    wrong: ['Internal Service Protocol', 'Internet System Program', 'Internet Server Processor'],
    note: 'a company that connects customers to the Internet',
  },
  {
    short: 'DNS',
    full: 'Domain Name System',
    wrong: ['Digital Network Service', 'Domain Number Server', 'Data Name System'],
    note: 'the service that maps domain names to IP addresses',
  },
  {
    short: 'WAN',
    full: 'Wide Area Network',
    wrong: ['World Area Network', 'Wireless Access Network', 'Wide Access Node'],
    note: 'a network spread over a country or the world',
  },
  {
    short: 'MODEM',
    full: 'Modulator-Demodulator',
    wrong: ['Modular Device Manager', 'Multiple Data Modulator', 'Modulated Digital Emitter'],
    note: 'it modulates digital data onto an analog carrier and demodulates it back',
  },
  {
    short: 'NIC',
    full: 'Network Interface Card',
    wrong: ['Network Internal Connector', 'National Internet Card', 'Network Integrated Circuit'],
    note: 'the adapter that connects a computer to a network',
  },
  {
    short: 'ISDN',
    full: 'Integrated Services Digital Network',
    wrong: ['International Standard Data Network', 'Integrated System Data Node', 'Internet Services Digital Network'],
    note: 'a digital telephone network that carries voice and data together',
  },
  {
    short: 'OSI',
    full: 'Open Systems Interconnection',
    wrong: ['Open Source Internet', 'Operating System Interface', 'Open Standard Integration'],
    note: 'the seven-layer ISO reference model',
  },
  {
    short: 'TCP',
    full: 'Transmission Control Protocol',
    wrong: ['Transfer Communication Protocol', 'Transmission Connection Program', 'Terminal Control Protocol'],
    note: 'the reliable, connection-oriented transport protocol',
  },
  {
    short: 'DSL',
    full: 'Digital Subscriber Line',
    wrong: ['Data Service Link', 'Digital Signal Loop', 'Direct Subscriber Link'],
    note: 'broadband carried over ordinary telephone wires',
  },
  {
    short: 'DHCP',
    full: 'Dynamic Host Configuration Protocol',
    wrong: ['Dynamic Hypertext Control Protocol', 'Digital Host Communication Program', 'Dynamic Hardware Configuration Process'],
    note: 'the protocol that assigns IP addresses automatically',
  },
  {
    short: 'VoIP',
    full: 'Voice over Internet Protocol',
    wrong: ['Video over Internet Protocol', 'Voice over Internal Phone', 'Virtual Online Internet Phone'],
    note: 'telephone calls carried over IP networks',
  },
];

// ---------------------------------------------------------------------------
// Transmission modes
// ---------------------------------------------------------------------------

type Mode = 'Simplex' | 'Half-duplex' | 'Full-duplex';
const MODE_RULE: Readonly<Record<Mode, string>> = {
  Simplex: 'Simplex: data flows in one direction only.',
  'Half-duplex': 'Half-duplex: data flows both ways, but only one way at a time.',
  'Full-duplex': 'Full-duplex: data flows both ways at the same time.',
};

const MODE_EXAMPLES: ReadonlyArray<readonly [string, Mode]> = [
  ['A keyboard sending keystrokes to a computer is an example of which transmission mode?', 'Simplex'],
  ['A radio station broadcasting to listeners, who cannot reply over the same channel, uses which transmission mode?', 'Simplex'],
  ['Television broadcast from a transmitter to home receivers is an example of which transmission mode?', 'Simplex'],
  ['On a walkie-talkie, one person must stop talking (release the button) before the other can reply. This is:', 'Half-duplex'],
  ['On a police wireless set, either officer can transmit, but only one of them at a time. This uses which transmission mode?', 'Half-duplex'],
  ['In which transmission mode can data travel in both directions, but only in one direction at a time?', 'Half-duplex'],
  ['A telephone conversation, in which both people can speak and hear at the same time, is an example of:', 'Full-duplex'],
  ['A video call in which both people talk and listen simultaneously uses which transmission mode?', 'Full-duplex'],
  ['In which transmission mode can data travel in both directions at the same time?', 'Full-duplex'],
  ['In which transmission mode can data travel in one direction only?', 'Simplex'],
];

// ---------------------------------------------------------------------------
// URL parts
// ---------------------------------------------------------------------------

const HOSTS: ReadonlyArray<readonly [name: string, tld: string, second: string | null]> = [
  ['cityschool', 'pk', 'edu'],
  ['greenvalley', 'org', null],
  ['tradehub', 'com', null],
  ['pakbooks', 'pk', 'com'],
  ['healthline', 'pk', 'gov'],
  ['starnews', 'net', null],
  ['riverside', 'edu', null],
  ['quickmart', 'com', null],
];
const PATHS = ['admissions', 'results', 'notices', 'products', 'downloads', 'library', 'news'];
const FILES = ['index.html', 'fees.pdf', 'merit-list.html', 'form.php', 'schedule.html', 'report.pdf'];

// ---------------------------------------------------------------------------
// Network types
// ---------------------------------------------------------------------------

const NET_TYPES = ['PAN', 'LAN', 'MAN', 'WAN'] as const;
type NetType = (typeof NET_TYPES)[number];
const NET_TYPE_RULE: Readonly<Record<NetType, string>> = {
  PAN: 'A PAN (personal area network) links devices within a few metres of one person, often by Bluetooth.',
  LAN: 'A LAN (local area network) covers one room, building or campus.',
  MAN: 'A MAN (metropolitan area network) covers a town or city.',
  WAN: 'A WAN (wide area network) spans countries or the whole world; the Internet is the largest WAN.',
};
const NETWORK_SCENES: ReadonlyArray<readonly [string, NetType]> = [
  ['A smartphone streams music to wireless earbuds over Bluetooth.', 'PAN'],
  ["A smartwatch syncs its step count with the phone in its owner's pocket.", 'PAN'],
  ['Thirty computers in one school laboratory share a printer and a file server.', 'LAN'],
  ['All the computers on the floors of a single office building are cabled to the same switches.', 'LAN'],
  ["A bank links all of its branches within one city to its main office there.", 'MAN'],
  ['A cable TV operator connects homes across one city to its central station.', 'MAN'],
  ['A company connects its offices in Karachi, Dubai and London into one network.', 'WAN'],
  ['An airline links booking offices in many countries to one central reservation system.', 'WAN'],
];

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('computer', 'networks-communication', (b) => [
  // ---- Media / data rate: bits versus bytes -------------------------------
  b.dynamic('transfer-time-data-rate', { difficulty: 2, tags: ['media', 'transmission modes'] }, (r) => {
    const R = r.pick([2, 4, 5, 8, 10, 16, 20, 25, 40, 50, 100]);
    const times = Array.from({ length: 39 }, (_, i) => i + 2).filter((t) => (R * t) % 8 === 0);
    const t = r.pick(times);
    const S = (R * t) / 8; // megabytes
    const note = tex`Take $1\,\mathrm{MB} = 10^{6}$ bytes, $1\,\mathrm{Mbps} = 10^{6}$ bits per second and ignore overheads.`;
    const mode = r.pick(['time', 'rate', 'size'] as const);

    if (mode === 'time') {
      const { answer, distractors } = numericOptions(r, {
        correct: t,
        wrong: [t / 8, 8 * t, S * R],
        format: withUnit('s'),
      });
      return {
        stem: tex`A file of $${grp(S)}\,\mathrm{MB}$ is sent over a link of $${grp(R)}\,\mathrm{Mbps}$. ${note} The time taken is:`,
        answer,
        distractors,
        explanation: tex`Convert bytes to bits: $${grp(S)}\,\mathrm{MB} = ${grp(S)} \times 8 = ${grp(8 * S)}\,\mathrm{Mb}$. Time $= \dfrac{\text{bits}}{\text{rate}} = \dfrac{${grp(8 * S)}}{${grp(R)}} = ${grp(t)}\,\mathrm{s}$. Forgetting the factor 8 gives $${grp(t / 8)}\,\mathrm{s}$.`,
      };
    }
    if (mode === 'rate') {
      const { answer, distractors } = numericOptions(r, {
        correct: R,
        wrong: [R / 8, 8 * R, S * t],
        format: withUnit('Mbps'),
      });
      return {
        stem: tex`A $${grp(S)}\,\mathrm{MB}$ file is downloaded in exactly $${grp(t)}\,\mathrm{s}$. ${note} The data rate of the link is:`,
        answer,
        distractors,
        explanation: tex`Bits sent $= ${grp(S)} \times 8 = ${grp(8 * S)}\,\mathrm{Mb}$. Rate $= \dfrac{${grp(8 * S)}\,\mathrm{Mb}}{${grp(t)}\,\mathrm{s}} = ${grp(R)}\,\mathrm{Mbps}$. Dividing megabytes by seconds without the factor 8 gives $${grp(R / 8)}$, which is in MB/s, not Mbps.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: S,
      wrong: [R * t, 8 * R * t, R / 8],
      format: withUnit('MB'),
    });
    return {
      stem: tex`A link runs at a steady $${grp(R)}\,\mathrm{Mbps}$. ${note} The amount of data it carries in $${grp(t)}\,\mathrm{s}$ is:`,
      answer,
      distractors,
      explanation: tex`Bits $= ${grp(R)} \times ${grp(t)} = ${grp(R * t)}\,\mathrm{Mb}$. Bytes $= \dfrac{${grp(R * t)}}{8} = ${grp(S)}\,\mathrm{MB}$. Giving $${grp(R * t)}$ forgets that 1 byte = 8 bits.`,
    };
  }),

  // ---- Topologies: links and ports ---------------------------------------
  b.dynamic('topology-link-count', { difficulty: 2, origin: 'past-paper', tags: ['topologies'] }, (r) => {
    const n = r.int(5, 25);
    const mode = r.pick(['mesh-links', 'mesh-ports', 'mesh-add', 'star-cables'] as const);
    const fmt = (x: number): string => `$${grp(x)}$`;
    const links = (n * (n - 1)) / 2;

    if (mode === 'mesh-links') {
      const { answer, distractors } = numericOptions(r, { correct: links, wrong: [n * (n - 1), (n * (n + 1)) / 2, n - 1], format: fmt });
      return {
        stem: `How many dedicated two-way (duplex) point-to-point links are needed to connect ${n} computers in a fully connected mesh topology?`,
        answer,
        distractors,
        explanation: tex`Each pair of computers needs one link: $\dfrac{n(n-1)}{2} = \dfrac{${n}(${n - 1})}{2} = ${grp(links)}$. Using $n(n-1) = ${grp(n * (n - 1))}$ counts every link twice.`,
      };
    }
    if (mode === 'mesh-ports') {
      const { answer, distractors } = numericOptions(r, { correct: n - 1, wrong: [n, links, n * (n - 1)], format: fmt });
      return {
        stem: `In a fully connected mesh of ${n} computers, how many I/O ports (network connections) does each computer need?`,
        answer,
        distractors,
        explanation: tex`Each computer links directly to every other computer, so it needs $n - 1 = ${n} - 1 = ${n - 1}$ ports. The total number of links, $\dfrac{n(n-1)}{2} = ${grp(links)}$, is a different quantity.`,
      };
    }
    if (mode === 'mesh-add') {
      const { answer, distractors } = numericOptions(r, { correct: n, wrong: [n + 1, n - 1, 2 * n], format: fmt });
      return {
        stem: `A fully connected mesh network has ${n} computers joined by two-way (duplex) links. How many new links are needed when one more computer is added and the mesh is kept fully connected?`,
        answer,
        distractors,
        explanation: tex`The new computer must be linked to each of the $${n}$ existing computers, so $${n}$ links are added. Check: $\dfrac{${n + 1}(${n})}{2} - \dfrac{${n}(${n - 1})}{2} = ${grp(((n + 1) * n) / 2)} - ${grp(links)} = ${n}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, { correct: n, wrong: [n - 1, links, 2 * n], format: fmt });
    return {
      stem: `In a star topology, ${n} computers are joined to one central switch. How many cables run from the computers to the switch?`,
      answer,
      distractors,
      explanation: tex`In a star, each computer has exactly one cable to the central device, so $${n}$ computers need $${n}$ cables. A full mesh of the same computers would need $\dfrac{${n}(${n - 1})}{2} = ${grp(links)}$ links.`,
    };
  }),

  // ---- Media: baud rate versus bit rate ----------------------------------
  b.dynamic('baud-bit-rate', { difficulty: 3, tags: ['media', 'transmission modes'] }, (r) => {
    const k = r.int(2, 6); // bits per signal element
    const L = 2 ** k;
    const baud = r.pick([300, 600, 1200, 2400, 4800, 9600]);
    const bps = baud * k;
    const mode = r.pick(['bit-rate', 'baud', 'levels'] as const);

    if (mode === 'bit-rate') {
      const { answer, distractors } = numericOptions(r, {
        correct: bps,
        wrong: [baud * L, baud, baud / k],
        format: withUnit('bps'),
      });
      return {
        stem: tex`A modem sends $${grp(baud)}$ signal changes per second (baud) and each signal element can take one of $${L}$ different states. Its bit rate is:`,
        answer,
        distractors,
        explanation: tex`Bits per signal element $= \log_2 ${L} = ${k}$. Bit rate $=$ baud $\times$ bits per element $= ${grp(baud)} \times ${k} = ${grp(bps)}\,\mathrm{bps}$. Multiplying by the number of states (${L}) instead of $\log_2 ${L}$ is the usual slip.`,
      };
    }
    if (mode === 'baud') {
      const { answer, distractors } = numericOptions(r, {
        correct: baud,
        // Dividing by the number of states is the usual slip, but only offer it when it
        // is a whole number (a fractional baud rate would be an obvious give-away).
        wrong: [bps * k, ...(Number.isInteger(bps / L) ? [bps / L] : []), bps, 2 * baud],
        format: withUnit('baud'),
      });
      return {
        stem: tex`A line carries $${grp(bps)}\,\mathrm{bps}$ using signal elements that each have $${L}$ possible states. Its baud rate (signal changes per second) is:`,
        answer,
        distractors,
        explanation: tex`Each element carries $\log_2 ${L} = ${k}$ bits, so baud $= \dfrac{\text{bit rate}}{\text{bits per element}} = \dfrac{${grp(bps)}}{${k}} = ${grp(baud)}$. Baud equals bit rate only when each element carries one bit.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: L,
      wrong: [k, 2 * k, L * 2, L / 2],
      format: (x) => `$${grp(x)}$`,
    });
    return {
      stem: tex`A link runs at $${grp(baud)}$ baud and achieves $${grp(bps)}\,\mathrm{bps}$. What is the minimum number of distinct signal states each signal element must have?`,
      answer,
      distractors,
      explanation: tex`Bits per element $= \dfrac{${grp(bps)}}{${grp(baud)}} = ${k}$. Number of states $= 2^{${k}} = ${L}$. The value $${k}$ is the number of bits per element, not the number of states.`,
    };
  }),

  // ---- OSI model: layer of a device, protocol, function or data unit -----
  b.dynamic('osi-layer-of', { difficulty: 2, tags: ['OSI model', 'protocols'] }, (r) => {
    const item = r.pick(OSI_ITEMS);
    const banned = new Set<Layer>([item.layer, ...(item.avoid ?? [])]);
    const wrong = r.sample(LAYERS.filter((l) => !banned.has(l)), 3);
    return {
      stem: item.stem,
      answer: layerOption(item.layer),
      distractors: wrong.map(layerOption),
      explanation: [item.layer, ...wrong].map((l) => `The ${l} layer ${LAYER_ROLE[l]}.`).join(' '),
    };
  }),

  // ---- OSI model: layer numbering ----------------------------------------
  b.dynamic('osi-layer-number', { difficulty: 1, origin: 'past-paper', tags: ['OSI model'] }, (r) => {
    const n = r.int(1, 7);
    const name = LAYERS[n - 1] as Layer;
    const order = LAYERS.map((l, i) => `${i + 1} ${l}`).join(', ');
    const mode = r.pick(['name', 'number', 'above'] as const);
    const near = (m: number): number[] => [8 - m, m + 1, m - 1, m + 2, m - 2].filter((v) => v >= 1 && v <= 7 && v !== m);

    if (mode === 'name') {
      const answer = layerOption(name);
      const topDown = n === 4 ? '' : ` Counting down from the top would wrongly give the ${LAYERS[7 - n] as Layer} layer.`;
      return {
        stem: `The OSI layers are numbered from 1 at the bottom to 7 at the top. Layer ${n} is the:`,
        answer,
        distractors: pickDistractors(answer, near(n).map((v) => layerOption(LAYERS[v - 1] as Layer))),
        explanation: `From the bottom the layers are ${order}, so layer ${n} is the ${name} layer.${topDown}`,
      };
    }
    if (mode === 'number') {
      const answer = `Layer ${n}`;
      return {
        stem: `The OSI layers are numbered from 1 at the bottom to 7 at the top. The ${name} layer is:`,
        answer,
        distractors: pickDistractors(answer, near(n).map((v) => `Layer ${v}`)),
        explanation: `From the bottom the layers are ${order}, so the ${name} layer is layer ${n}.`,
      };
    }
    const m = r.int(1, 6);
    const below = LAYERS[m - 1] as Layer;
    const answer = layerOption(LAYERS[m] as Layer);
    const cands = [m - 1, m + 2, m + 3, m - 2, m - 3, m + 4]
      .filter((v) => v >= 1 && v <= 7 && v !== m + 1 && v !== m)
      .map((v) => layerOption(LAYERS[v - 1] as Layer));
    return {
      stem: `In the OSI model, which layer lies directly above the ${below} layer?`,
      answer,
      distractors: pickDistractors(answer, cands),
      explanation: `From the bottom the layers are ${order}. Directly above the ${below} layer (layer ${m}) is the ${LAYERS[m] as Layer} layer (layer ${m + 1}).`,
    };
  }),

  // ---- Protocols: purpose -------------------------------------------------
  b.dynamic('protocol-purpose', { difficulty: 1, tags: ['protocols', 'internet'] }, (r) => {
    const item = r.pick(PROTOCOL_ITEMS);
    const wrong = r.sample(PROTOCOLS.filter((p) => p !== item.name && !item.avoid.includes(p)), 3);
    return {
      stem: r.pick(item.stems),
      answer: item.name,
      distractors: wrong,
      explanation: [item.name, ...wrong].map((p) => PROTOCOL_ROLE[p]).join(' '),
    };
  }),

  // ---- Acronyms -----------------------------------------------------------
  b.dynamic('network-acronym', { difficulty: 1, origin: 'past-paper', tags: ['internet', 'protocols'] }, (r) => {
    const a = r.pick(ACRONYMS);
    const stem = r.pick([
      `In networking, ${a.short} stands for:`,
      `The abbreviation ${a.short} stands for:`,
      `What is the full form of ${a.short}?`,
    ]);
    return {
      stem,
      answer: a.full,
      distractors: [...a.wrong],
      explanation: `${a.short} = ${a.full}: ${a.note}.`,
    };
  }),

  // ---- Transmission modes -------------------------------------------------
  b.dynamic('transmission-mode', { difficulty: 1, origin: 'past-paper', tags: ['transmission modes'] }, (r) => {
    const [stem, mode] = r.pick(MODE_EXAMPLES);
    const others = (['Simplex', 'Half-duplex', 'Full-duplex'] as const).filter((m) => m !== mode);
    return {
      stem,
      answer: mode,
      distractors: [...others, 'Multiplexing'],
      explanation: `${MODE_RULE[mode]} ${others.map((m) => MODE_RULE[m]).join(' ')} Multiplexing is a way of sharing one channel among several signals, not a direction of data flow.`,
    };
  }),

  // ---- Internet: parts of a URL ------------------------------------------
  b.dynamic('url-parts', { difficulty: 2, tags: ['internet'] }, (r) => {
    const [name, tld, second] = r.pick(HOSTS);
    const scheme = r.pick(['http', 'https']);
    const host = second ? `www.${name}.${second}.${tld}` : `www.${name}.${tld}`;
    const path = r.pick(PATHS);
    const file = r.pick(FILES);
    const url = `${scheme}://${host}/${path}/${file}`;
    const mode = r.pick(['protocol', 'tld', 'file'] as const);
    const code = (s: string): string => `\`${s}\``;

    if (mode === 'protocol') {
      return {
        stem: `In the URL \`${url}\`, the part that names the protocol is:`,
        answer: code(scheme),
        distractors: [code('www'), code(`.${tld}`), code(file)],
        explanation: `A URL has the form protocol://host/path/file. Here the protocol is ${code(scheme)}; ${code('www')} is part of the host name, ${code(`.${tld}`)} is the top-level domain and ${code(file)} is the file requested.`,
      };
    }
    if (mode === 'tld') {
      const wrongs = second ? [code(`.${second}`), code('www'), code(`/${path}`)] : [code(`.${name}`), code('www'), code(`/${path}`)];
      const explainSecond = second
        ? ` ${code(`.${second}`)} is a second-level label showing the type of organisation inside the ${code(`.${tld}`)} domain.`
        : '';
      return {
        stem: `In the URL \`${url}\`, the top-level domain is:`,
        answer: code(`.${tld}`),
        distractors: wrongs,
        explanation: `The top-level domain is the last label of the host name, ${code(`.${tld}`)}.${explainSecond} ${code(`/${path}`)} is a folder path, not part of the domain.`,
      };
    }
    return {
      stem: `In the URL \`${url}\`, the file being requested is:`,
      answer: code(file),
      distractors: [code(path), code(host), code(scheme)],
      explanation: `In protocol://host/path/file the last part after the final slash is the file, ${code(file)}. ${code(path)} is the folder, ${code(host)} is the host (domain) name and ${code(scheme)} is the protocol.`,
    };
  }),

  // ---- Network types ------------------------------------------------------
  b.dynamic('network-type-scenario', { difficulty: 1, tags: ['network types'] }, (r) => {
    const [scene, type] = r.pick(NETWORK_SCENES);
    const others = NET_TYPES.filter((t) => t !== type);
    return {
      stem: `${scene} This is best classified as a:`,
      answer: type,
      distractors: others,
      explanation: [type, ...others].map((t) => NET_TYPE_RULE[t]).join(' '),
    };
  }),

  // ---- Fixed questions ----------------------------------------------------
  ...b.mcqs([
    {
      id: 'fibre-carries-light', d: 1, o: 'past-paper', t: ['media'],
      q: 'Fibre-optic cable carries data in the form of:',
      a: 'pulses of light',
      x: ['electric current', 'radio waves', 'sound waves'],
      e: 'An optical fibre guides light pulses by total internal reflection, which is why it is immune to electrical interference and offers very high bandwidth.',
    },
    {
      id: 'twisted-pair-why-twist', d: 2, t: ['media'],
      q: 'The two wires in each pair of a twisted-pair cable are twisted mainly to:',
      a: 'reduce electromagnetic interference and crosstalk',
      x: ['increase the tensile strength of the cable', 'let the cable carry light signals', 'reduce the copper needed in the cable'],
      e: 'Twisting makes noise induce nearly equal and opposite voltages in the two wires, so interference and crosstalk from neighbouring pairs largely cancel.',
    },
    {
      id: 'microwave-line-of-sight', d: 1, t: ['media'],
      q: 'Terrestrial microwave transmission between two towers requires:',
      a: 'a clear line of sight between the antennas',
      x: ['a copper cable laid between the towers', 'an optical fibre between the towers', 'the two towers to be inside one building'],
      e: 'Microwaves travel in straight lines and are unguided, so the dish antennas must see each other; this is why microwave towers are tall and spaced apart.',
    },
    {
      id: 'star-hub-failure', d: 1, o: 'past-paper', t: ['topologies'],
      q: 'In which topology does failure of the central hub or switch stop the whole network?',
      a: 'Star',
      x: ['Bus', 'Ring', 'Mesh'],
      e: 'In a star topology every computer communicates only through the central device, so if it fails no computer can reach another. A bus fails if its backbone breaks, a ring if one link or node breaks, and a mesh has redundant paths.',
    },
    {
      id: 'bus-terminators', d: 2, t: ['topologies'],
      q: 'In a bus topology, terminators are fitted at both ends of the backbone cable to:',
      a: 'absorb signals so they do not reflect back along the cable',
      x: ['amplify the signal for distant computers', 'connect the bus to the Internet', 'assign an address to every computer'],
      e: 'A signal reaching an open end of the bus would reflect and collide with new signals; a terminator absorbs it at each end.',
    },
    {
      id: 'modem-function', d: 1, t: ['media', 'internet'],
      q: 'When computers communicate over an ordinary telephone line, a modem is needed because it:',
      a: 'converts digital signals to analog and back',
      x: ['amplifies weak digital signals', 'assigns IP addresses to computers', 'filters frames by MAC address'],
      e: 'A telephone line carries analog signals: the modem modulates digital data onto an analog carrier and demodulates it at the other end. Boosting (regenerating) weak signals is done by a repeater, IP assignment by DHCP and MAC filtering by a switch or bridge.',
    },
    {
      id: 'ipv4-length', d: 2, o: 'past-paper', t: ['internet', 'protocols'],
      q: 'An IPv4 address is made up of:',
      a: '32 bits',
      x: ['16 bits', '64 bits', '128 bits'],
      e: 'IPv4 uses 32 bits, written as four 8-bit numbers (for example 192.168.1.10). 128 bits is the length of an IPv6 address.',
    },
    {
      id: 'router-joins-networks', d: 2, t: ['network types', 'protocols'],
      q: 'Which device connects two different networks and chooses the best path for packets using IP addresses?',
      a: 'Router',
      x: ['Hub', 'Repeater', 'Network interface card'],
      e: 'A router works at the network layer and forwards packets between networks using IP addresses. A hub and a repeater only pass on bits, and a NIC simply connects one computer to a network.',
    },
    {
      id: 'switch-vs-hub', d: 2, t: ['topologies', 'OSI model'],
      q: 'Which statement correctly compares a hub and a switch?',
      a: 'A switch sends a frame only to the port of the destination device, while a hub repeats it to every port.',
      x: [
        'A hub reads MAC addresses, while a switch repeats every frame to all of its ports.',
        'A hub works at the network layer, while a switch works at the physical layer.',
        'A hub causes fewer collisions than a switch because it shares one channel.',
      ],
      e: 'A switch learns which MAC address is on which port and forwards each frame only there. A hub is a physical-layer device that copies every signal to all ports, so all devices share one collision domain.',
    },
    {
      id: 'tcpip-application-layer', d: 3, t: ['OSI model', 'protocols'],
      q: 'In the TCP/IP model, the work of the OSI session, presentation and application layers is done by the:',
      a: 'Application layer',
      x: ['Transport layer', 'Internet layer', 'Network access layer'],
      e: 'TCP/IP has four layers: network access, internet, transport and application. Its application layer takes over the duties of the top three OSI layers.',
    },
    {
      id: 'packet-switching-internet', d: 2, t: ['internet'],
      q: 'Unlike a traditional telephone call, the Internet reserves no fixed path for a conversation: data are split into small units that are routed independently and put back in order at the receiver. This technique is called:',
      a: 'packet switching',
      x: ['circuit switching', 'simplex transmission', 'broadcasting'],
      e: 'In packet switching no dedicated path is reserved; each packet is routed independently and reassembled in order at the receiver. Circuit switching (as in a classic telephone call) reserves one fixed path for the whole session.',
    },
  ]),
]);
