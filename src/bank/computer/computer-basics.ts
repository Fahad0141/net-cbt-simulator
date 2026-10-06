/**
 * Computer Science: Basics of Information Technology (ICS Part I).
 *
 * Covers IT terms, types of computers, hardware and software, input and output devices,
 * and storage (units, capacities and memory types).
 *
 * Storage arithmetic uses binary multiples throughout (1 KB = 1024 bytes), as the ICS
 * textbooks and the NET do. Pure unit conversions never offer a power-of-1000 value as a
 * distractor (it would be "right" under SI prefixes); the capacity problems state the
 * convention in the stem, so a power-of-1000 slip there is unambiguously wrong.
 */
import { defineBank } from '@/engine/authoring';
import { listText, numericOptions, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/**
 * Exact decimal for math mode, with LaTeX thousands separators from five digits on
 * (1024 stays as it is, 1048576 -> 1{,}048{,}576).
 */
function fmt(value: number): string {
  const [whole = '', frac] = String(Number(value.toFixed(6))).split('.');
  const grouped = whole.length > 4 ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, '{,}') : whole;
  return frac ? `${grouped}.${frac}` : grouped;
}

/** Exact when the value has at most three decimals, otherwise rounded to two (slip-based distractors). */
function nice(value: number): string {
  const exact = Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-6;
  return fmt(exact ? value : Math.round(value * 100) / 100);
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
/** Lower-cases a name for use mid-sentence but keeps a leading acronym (USB, DVD) intact. */
const lc = (s: string): string => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const withArticle = (s: string): string => `${/^[aeiou]/i.test(s) ? 'an' : 'a'} ${s}`;
const listLc = (items: readonly string[]): string => listText(items.map(lc));

// ---------------------------------------------------------------------------
// Storage-unit conversions (one generator per question pattern)
// ---------------------------------------------------------------------------

interface Conversion {
  stem: string;
  correct: number;
  /** Values produced by typical slips (shuffled before use; at least one on each side of the answer). */
  wrong: number[];
  unit: string;
  explanation: string;
}

const UNIT_CONVERSIONS: ReadonlyArray<(r: Rng) => Conversion> = [
  (r) => {
    const n = r.int(2, 32);
    const correct = n * 8192;
    return {
      stem: tex`How many bits are there in $${n}$ KB?`,
      correct,
      // stopped at bytes; divided by 8 instead of multiplying; ignored the 1024; treated KB as MB
      wrong: [n * 1024, n * 128, n * 8, n * 2 ** 23],
      unit: 'bits',
      explanation: tex`$1$ KB $= 1024$ bytes and $1$ byte $= 8$ bits, so $${n}$ KB $= ${n} \times 1024 \times 8 = ${fmt(correct)}$ bits.`,
    };
  },
  (r) => {
    const n = r.int(2, 12);
    const correct = n * 2 ** 20;
    return {
      stem: tex`A file has a size of $${n}$ MB. Its size in bytes is:`,
      correct,
      // converted only to KB; went one step too far (GB to bytes); gave bits
      wrong: [n * 2 ** 10, n * 2 ** 30, n * 2 ** 23],
      unit: 'bytes',
      explanation: tex`$1$ MB $= 1024$ KB $= 1024 \times 1024 = 1{,}048{,}576$ bytes, so $${n}$ MB $= ${n} \times 1{,}048{,}576 = ${fmt(correct)}$ bytes.`,
    };
  },
  (r) => {
    const n = r.int(2, 8);
    const bytes = n * 2 ** 20;
    const correct = bytes * 8;
    return {
      stem: tex`How many bits are there in $${n}$ MB?`,
      correct,
      // gave bytes; divided by 8 instead of multiplying; treated MB as KB; treated MB as GB
      wrong: [bytes, bytes / 8, n * 2 ** 13, n * 2 ** 33],
      unit: 'bits',
      explanation: tex`$${n}$ MB $= ${n} \times 1024 \times 1024 = ${fmt(bytes)}$ bytes, and each byte has $8$ bits: $${fmt(bytes)} \times 8 = ${fmt(correct)}$ bits.`,
    };
  },
  (r) => {
    const k = r.pick([2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 48, 64]);
    const bits = k * 8192;
    return {
      stem: tex`How many kilobytes (KB) are there in $${fmt(bits)}$ bits?`,
      correct: k,
      // forgot to divide by 8; stopped at bytes; took 4 bits per byte; divided by 8 twice
      wrong: [8 * k, 1024 * k, 2 * k, k / 8],
      unit: 'KB',
      explanation: tex`$${fmt(bits)}$ bits $\div\, 8 = ${fmt(bits / 8)}$ bytes, and $${fmt(bits / 8)} \div 1024 = ${k}$ KB.`,
    };
  },
  (r) => {
    const n = 2 * r.int(2, 32);
    return {
      stem: tex`How many nibbles are there in $${n}$ bytes?`,
      correct: 2 * n,
      // divided instead of multiplying; multiplied by 4 bits; counted bits
      wrong: [n / 2, 4 * n, 8 * n],
      unit: 'nibbles',
      explanation: tex`A nibble is $4$ bits and a byte is $8$ bits, so every byte holds $2$ nibbles: $${n} \times 2 = ${2 * n}$ nibbles.`,
    };
  },
];

// ---------------------------------------------------------------------------
// Files on a storage device
// ---------------------------------------------------------------------------

interface FileContext {
  device: string;
  items: string;
  /** Capacities in GB. */
  capacities: readonly number[];
  /** Item sizes in MB; none divides capacity x 1024 exactly, so whole-file rounding matters. */
  sizes: readonly number[];
}

const FILE_CONTEXTS: readonly FileContext[] = [
  { device: 'memory card', items: 'photos', capacities: [2, 4, 8, 16, 32], sizes: [3, 5, 6, 7, 12] },
  { device: 'USB flash drive', items: 'songs', capacities: [1, 2, 4, 8, 16], sizes: [3, 5, 6, 7, 9] },
  { device: 'hard disk partition', items: 'video clips', capacities: [20, 40, 50, 100, 120], sizes: [300, 350, 600, 700, 900] },
];

// ---------------------------------------------------------------------------
// Screen images
// ---------------------------------------------------------------------------

const RESOLUTIONS: ReadonlyArray<readonly [number, number]> = [
  [640, 480],
  [800, 600],
  [1024, 768],
  [1280, 720],
  [1280, 1024],
  [1600, 1200],
  [1920, 1080],
  [2048, 1536],
  [2560, 1440],
];
const COLOUR_DEPTHS = [1, 4, 8, 16, 24, 32] as const;
/** Resolution and depth pairs whose image size is an exact KB value with at most two decimals. */
const SCREEN_CASES = RESOLUTIONS.flatMap(([w, h]) =>
  COLOUR_DEPTHS.filter((d) => Number.isInteger(((w * h * d) / 8 / 1024) * 100)).map((d) => ({ w, h, d })),
);

// ---------------------------------------------------------------------------
// Classifying hardware and software
// ---------------------------------------------------------------------------

// Devices that are clearly one kind only (touch screens, modems and digital cameras are left out).
const INPUT_DEVICES = ['Keyboard', 'Mouse', 'Scanner', 'Microphone', 'Joystick', 'Light pen', 'Barcode reader', 'Webcam', 'Trackball', 'Graphics tablet', 'Touchpad'];
const OUTPUT_DEVICES = ['Monitor', 'Printer', 'Plotter', 'Speaker', 'Multimedia projector'];
const STORAGE_DEVICES = ['Hard disk', 'USB flash drive', 'DVD drive', 'Memory card', 'Magnetic tape drive', 'Solid-state drive (SSD)'];
// Utility programs are left out: textbooks disagree on whether they count as system software.
const SYSTEM_SOFTWARE = ['Operating system', 'Device driver', 'Compiler', 'Assembler', 'Interpreter'];
const APPLICATION_SOFTWARE = ['Word processor', 'Spreadsheet program', 'Web browser', 'Payroll program', 'Photo editor', 'Media player', 'Presentation program'];
const IMPACT_PRINTERS = ['Dot-matrix printer', 'Daisy-wheel printer', 'Line printer'];
const NON_IMPACT_PRINTERS = ['Laser printer', 'Inkjet printer', 'Thermal printer'];
const NON_IMPACT_METHOD: Readonly<Record<string, string>> = {
  'Laser printer': 'it fuses toner onto the paper with heat',
  'Inkjet printer': 'it sprays tiny droplets of ink onto the paper',
  'Thermal printer': 'it uses heat, usually on heat-sensitive paper',
};

interface ClassifyMode {
  weight: number;
  stem: string;
  answers: readonly string[];
  wrong: readonly string[];
  explain: (answer: string, distractors: readonly string[]) => string;
}

const CLASSIFY_MODES: readonly ClassifyMode[] = [
  {
    weight: 3,
    stem: 'Which of the following is an input device?',
    answers: INPUT_DEVICES,
    wrong: OUTPUT_DEVICES,
    explain: (a, ds) => `The ${lc(a)} is an input device: it sends data or commands into the computer. The ${listLc(ds)} are output devices.`,
  },
  {
    weight: 3,
    stem: 'Which of the following is an output device?',
    answers: OUTPUT_DEVICES,
    wrong: INPUT_DEVICES,
    explain: (a, ds) => `The ${lc(a)} is an output device: it presents results from the computer to the user. The ${listLc(ds)} are input devices.`,
  },
  {
    weight: 2,
    stem: 'Which of the following is **not** an input device?',
    answers: OUTPUT_DEVICES,
    wrong: INPUT_DEVICES,
    explain: (a, ds) => `The ${lc(a)} is an output device, so it is not an input device. The ${listLc(ds)} all send data into the computer.`,
  },
  {
    weight: 2,
    stem: 'Which of the following is **not** an output device?',
    answers: INPUT_DEVICES,
    wrong: OUTPUT_DEVICES,
    explain: (a, ds) => `The ${lc(a)} is an input device, so it is not an output device. The ${listLc(ds)} all present output to the user.`,
  },
  {
    weight: 2,
    stem: 'Which of the following is a storage device?',
    answers: STORAGE_DEVICES,
    wrong: [...INPUT_DEVICES, ...OUTPUT_DEVICES],
    explain: (a, ds) => {
      const inputs = ds.filter((d) => INPUT_DEVICES.includes(d)).length;
      const kind = inputs === ds.length ? 'input' : inputs === 0 ? 'output' : 'input or output';
      return `The ${lc(a)} is used to store data and programs for later use, so it is a storage device. The ${listLc(ds)} are ${kind} devices.`;
    },
  },
  {
    weight: 3,
    stem: 'Which of the following is system software?',
    answers: SYSTEM_SOFTWARE,
    wrong: APPLICATION_SOFTWARE,
    explain: (a, ds) =>
      `The ${lc(a)} is system software: it controls the hardware or helps to develop and run other programs, rather than doing a task for the end user. The ${listLc(ds)} are application software.`,
  },
  {
    weight: 2,
    stem: 'Which of the following is application software?',
    answers: APPLICATION_SOFTWARE,
    wrong: SYSTEM_SOFTWARE,
    explain: (a, ds) => `The ${lc(a)} is application software: it performs a specific task for the user. The ${listLc(ds)} are system software.`,
  },
  {
    weight: 1,
    stem: 'Which of the following is an impact printer?',
    answers: IMPACT_PRINTERS,
    wrong: NON_IMPACT_PRINTERS,
    explain: (a) =>
      `${cap(withArticle(lc(a)))} forms each character by a physical strike that presses an inked ribbon and the paper together, so it is an impact printer. Laser, inkjet and thermal printers form characters without striking the paper.`,
  },
  {
    weight: 1,
    stem: 'Which of the following is a non-impact printer?',
    answers: NON_IMPACT_PRINTERS,
    wrong: IMPACT_PRINTERS,
    explain: (a) =>
      `${cap(withArticle(lc(a)))} forms characters without striking the paper (${NON_IMPACT_METHOD[a] ?? 'it uses toner, ink or heat'}), so it is a non-impact printer. Dot-matrix, daisy-wheel and line printers are impact printers.`,
  },
];

// ---------------------------------------------------------------------------
// Special-purpose devices
// ---------------------------------------------------------------------------

interface SpecialDevice {
  name: string;
  /** Typical use, phrased to complete "mainly used for ...". */
  use: string;
  why: string;
  /** Devices whose use overlaps with this one; never offered together. */
  avoid?: readonly string[];
}

const SPECIAL_DEVICES: readonly SpecialDevice[] = [
  {
    name: 'Optical mark reader (OMR)',
    use: 'checking MCQ answer sheets filled in with pencil',
    why: 'An optical mark reader (OMR) detects pencil or pen marks made in fixed positions, which is why it is used to check MCQ answer sheets.',
  },
  {
    name: 'Optical character reader (OCR)',
    use: 'converting printed text into editable text',
    why: 'An optical character reader (OCR) recognises printed or typed characters and converts them into editable text.',
  },
  {
    name: 'Magnetic ink character reader (MICR)',
    use: 'reading the magnetic-ink numbers on bank cheques',
    why: 'A magnetic ink character reader (MICR) reads characters printed in magnetic ink, such as the cheque and account numbers on bank cheques.',
  },
  {
    name: 'Barcode reader',
    use: 'reading product codes at a shop checkout',
    why: 'A barcode reader scans the pattern of bars on a product so that the checkout system can identify the item and its price.',
  },
  {
    name: 'Light pen',
    use: 'drawing or selecting items directly on the screen',
    why: 'A light pen is pointed at the screen itself to draw on it or to select options.',
    avoid: ['Graphics tablet'],
  },
  {
    name: 'Plotter',
    use: 'printing large engineering drawings and maps',
    why: 'A plotter draws continuous lines on large sheets of paper, so it is used for engineering drawings, maps and architectural plans.',
  },
  {
    name: 'Graphics tablet',
    use: 'tracing hand-drawn sketches into the computer',
    why: 'A graphics tablet (digitizer) lets the user draw or trace on a flat pad with a stylus, turning sketches into digital form.',
    avoid: ['Light pen'],
  },
  {
    name: 'Biometric scanner',
    use: 'identifying people by their fingerprints',
    why: 'A biometric scanner reads a physical feature such as a fingerprint to identify a person, for example to mark attendance.',
  },
  {
    name: 'Multimedia projector',
    use: 'showing computer output on a large screen',
    why: 'A multimedia projector enlarges the computer display onto a large screen so that an audience can see it.',
  },
  {
    name: 'Joystick',
    use: 'controlling movement in games and flight simulators',
    why: 'A joystick is a lever that controls the direction of movement, as in games and flight simulators.',
  },
];

// ---------------------------------------------------------------------------
// Types of computers
// ---------------------------------------------------------------------------

interface TypeItem {
  stem: string;
  answer: string;
  /** Exactly three (checked by the bank validator). */
  distractors: readonly string[];
  explanation: string;
}

const TYPE_DESCRIPTIONS: readonly TypeItem[] = [
  {
    stem: 'Which type of computer is used for highly complex scientific work such as weather forecasting and nuclear research?',
    answer: 'Supercomputer',
    distractors: ['Mainframe computer', 'Minicomputer', 'Microcomputer'],
    explanation:
      'Supercomputers are the fastest and most powerful computers, built for enormous numbers of calculations such as weather forecasting and nuclear simulations. Mainframes are designed to serve many users at once, while minicomputers and microcomputers are far less powerful.',
  },
  {
    stem: 'The fastest and most expensive category of computer is the:',
    answer: 'Supercomputer',
    distractors: ['Mainframe computer', 'Minicomputer', 'Microcomputer'],
    explanation:
      'In speed, size and cost the order is supercomputer > mainframe > minicomputer > microcomputer. Supercomputers are used where enormous computing power is needed, for example in weather forecasting.',
  },
  {
    stem: 'Banks and airline reservation systems must process huge volumes of transactions for thousands of users at the same time. Which type of computer is normally used for such work?',
    answer: 'Mainframe computer',
    distractors: ['Minicomputer', 'Microcomputer', 'Analog computer'],
    explanation:
      'Mainframes are large multi-user computers built for very high volumes of transactions and thousands of simultaneous users, as in banking and airline reservations. A minicomputer serves far fewer users, a microcomputer is a personal computer, and an analog computer measures continuously varying quantities.',
  },
  {
    stem: 'A multi-user computer that is less powerful than a mainframe and suits a medium-sized organisation or a single department is a:',
    answer: 'Minicomputer',
    distractors: ['Supercomputer', 'Mainframe computer', 'Microcomputer'],
    explanation:
      'A minicomputer is a mid-range multi-user computer: smaller and cheaper than a mainframe, but able to serve the users of a department or a medium-sized organisation. A microcomputer is designed for one user, while mainframes and supercomputers are more powerful.',
  },
  {
    stem: 'A computer built around a single microprocessor chip and designed for one user at a time, such as a desktop or a laptop, is a:',
    answer: 'Microcomputer',
    distractors: ['Minicomputer', 'Mainframe computer', 'Supercomputer'],
    explanation:
      'A microcomputer (personal computer) uses one microprocessor as its CPU and is meant for a single user; desktops, laptops and tablets are examples. Minicomputers and mainframes are multi-user systems, and supercomputers are built for massive calculations.',
  },
  {
    stem: 'Which type of computer works directly on continuously varying physical quantities such as temperature, pressure and speed?',
    answer: 'Analog computer',
    distractors: ['Digital computer', 'Supercomputer', 'Mainframe computer'],
    explanation:
      'Analog computers process continuous signals by measuring physical quantities directly (a speedometer or a thermometer works this way). Digital computers, including supercomputers and mainframes, work on discrete binary values.',
  },
  {
    stem: 'Which type of computer combines the features of analog and digital computers, as in the patient-monitoring systems of a hospital ICU?',
    answer: 'Hybrid computer',
    distractors: ['Analog computer', 'Digital computer', 'Mainframe computer'],
    explanation:
      'A hybrid computer accepts analog signals such as heartbeat and blood pressure, converts them into digital form, and then processes and displays them, so it combines both kinds. A purely analog or purely digital computer does only one of these, and a mainframe is a large digital business computer.',
  },
];

/** [type, typical use (completes "mainly used for ..."), contrast clause used in explanations]. */
const TYPE_USES: ReadonlyArray<readonly [string, string, string]> = [
  ['Supercomputer', 'weather forecasting and nuclear research', 'supercomputers handle massive scientific calculations such as weather forecasting'],
  ['Mainframe computer', 'processing bank and airline-reservation transactions for thousands of users', 'mainframes process bank and airline-reservation transactions for thousands of users'],
  ['Microcomputer', 'everyday personal tasks such as word processing', 'microcomputers serve one person for everyday tasks such as word processing'],
  ['Hybrid computer', "monitoring patients' heartbeat and blood pressure in an ICU", 'hybrid computers combine analog and digital working, as in ICU patient monitors'],
];

const TYPE_USE_ITEMS: readonly TypeItem[] = TYPE_USES.map(([type, use, role]) => {
  const others = TYPE_USES.filter(([t]) => t !== type);
  return {
    stem: `${cap(withArticle(lc(type)))} is mainly used for:`,
    answer: use,
    distractors: others.map(([, otherUse]) => otherUse),
    explanation: `${cap(role)}. By contrast, ${others.map(([, , otherRole]) => otherRole).join('; ')}.`,
  };
});

const COMPUTER_TYPE_ITEMS: readonly TypeItem[] = [...TYPE_DESCRIPTIONS, ...TYPE_USE_ITEMS];

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export default defineBank('computer', 'computer-basics', (b) => [
  // ----- Storage: units and capacities (computational) -----
  b.dynamic('storage-unit-conversion', { difficulty: 1, origin: 'past-paper', tags: ['storage'] }, (r) => {
    const c = r.pick(UNIT_CONVERSIONS)(r);
    const { answer, distractors } = numericOptions(r, {
      correct: c.correct,
      // Shuffled so that the answer is not always the largest or smallest option.
      wrong: r.shuffle(c.wrong),
      format: (v) => `$${fmt(v)}$ ${c.unit}`,
    });
    return { stem: c.stem, answer, distractors, explanation: c.explanation };
  }),

  b.dynamic('files-on-storage', { difficulty: 2, tags: ['storage'] }, (r) => {
    if (r.chance(0.5)) {
      const ctx = r.pick(FILE_CONTEXTS);
      let capGB = r.pick(ctx.capacities);
      let size = r.pick(ctx.sizes);
      for (let i = 0; (capGB * 1024) % size === 0 && i < 50; i++) {
        capGB = r.pick(ctx.capacities);
        size = r.pick(ctx.sizes);
      }
      const totalMB = capGB * 1024;
      const fit = Math.floor(totalMB / size);
      const rest = totalMB - fit * size;
      const { answer, distractors } = numericOptions(r, {
        correct: fit,
        wrong: [
          fit + 1, // rounded the quotient up
          Math.floor((capGB * 1000) / size), // used 1 GB = 1000 MB
          Math.ceil((capGB * 1000) / size), // used 1000 and rounded up
        ],
        format: (v) => `$${fmt(v)}$`,
      });
      return {
        stem: tex`A ${ctx.device} with a capacity of $${capGB}$ GB is used to store ${ctx.items} of $${size}$ MB each. Taking $1\,\text{GB} = 1024\,\text{MB}$, the maximum number of complete ${ctx.items} it can hold is:`,
        answer,
        distractors,
        explanation: tex`Capacity $= ${capGB} \times 1024 = ${fmt(totalMB)}$ MB. Since $${fmt(totalMB)} = ${size} \times ${fmt(fit)} + ${rest}$, only $${fmt(fit)}$ complete ${ctx.items} fit; the remaining $${rest}$ MB is too little for another one, so rounding up to $${fmt(fit + 1)}$ would be wrong.`,
      };
    }

    const device = r.pick(['USB flash drive', 'memory card']);
    const capGB = r.pick([4, 8, 16, 32, 64]);
    const usedGB = r.multiple(0.5, capGB - 1, 0.5);
    const size = r.pick([2, 4, 8, 16, 32, 64, 128, 256]);
    const freeGB = capGB - usedGB;
    const freeMB = freeGB * 1024;
    const correct = freeMB / size;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [
        (capGB * 1024) / size, // ignored the space already used
        (usedGB * 1024) / size, // divided the used space instead of the free space
        Math.floor((freeGB * 1000) / size), // used 1 GB = 1000 MB
      ],
      format: (v) => `$${fmt(v)}$`,
    });
    return {
      stem: tex`A ${device} has a capacity of $${capGB}$ GB, of which $${fmt(usedGB)}$ GB is already used. Taking $1\,\text{GB} = 1024\,\text{MB}$, how many more files of $${size}$ MB each can be stored on it?`,
      answer,
      distractors,
      explanation: tex`Free space $= ${capGB} - ${fmt(usedGB)} = ${fmt(freeGB)}$ GB $= ${fmt(freeGB)} \times 1024 = ${fmt(freeMB)}$ MB. Number of files $= ${fmt(freeMB)} \div ${size} = ${fmt(correct)}$.`,
    };
  }),

  b.dynamic('disk-capacity', { difficulty: 3, tags: ['storage'] }, (r) => {
    const platters = r.int(2, 5);
    const tracks = r.pick([512, 1024, 2048, 4096, 8192, 16384]);
    const sectors = r.pick([32, 64, 128, 256]);
    const sectorBytes = r.pick([512, 1024, 4096]);
    const surfaces = 2 * platters;
    const bytes = surfaces * tracks * sectors * sectorBytes;
    // GB when the disk holds at least 1 GB (always a multiple of 0.25 GB here), otherwise MB.
    const inGB = bytes >= 2 ** 30 && Number.isInteger((bytes / 2 ** 30) * 4);
    const unit = inGB ? 'GB' : 'MB';
    const capacity = bytes / (inGB ? 2 ** 30 : 2 ** 20);
    const { answer, distractors } = numericOptions(r, {
      correct: capacity,
      // Shuffled so that the answer is not always the largest whole-number option.
      wrong: r.shuffle([
        capacity / 2, // used only one side of each platter
        capacity / surfaces, // counted a single surface
        bytes / (inGB ? 1e9 : 1e6), // divided by powers of 1000
        capacity * 2, // counted every surface twice
      ]),
      format: (v) => `$${nice(v)}$ ${unit}`,
    });
    return {
      stem: tex`A hard disk has $${platters}$ platters, and both surfaces of each platter are used for recording. Each surface has $${fmt(tracks)}$ tracks, each track has $${sectors}$ sectors and each sector stores $${sectorBytes}$ bytes. Taking $1\,\text{MB} = 2^{20}$ bytes and $1\,\text{GB} = 2^{30}$ bytes, the storage capacity of the disk is:`,
      answer,
      distractors,
      explanation: tex`Capacity $=$ surfaces $\times$ tracks per surface $\times$ sectors per track $\times$ bytes per sector $= (2 \times ${platters}) \times ${fmt(tracks)} \times ${sectors} \times ${sectorBytes} = ${fmt(bytes)}$ bytes. Dividing by $${inGB ? '2^{30}' : '2^{20}'}$ gives $${nice(capacity)}$ ${unit}.`,
    };
  }),

  // ----- Output: memory for a screen image (computational) -----
  b.dynamic('screen-image-memory', { difficulty: 3, tags: ['input and output devices', 'storage'] }, (r) => {
    const { w, h, d } = r.pick(SCREEN_CASES);
    const bits = w * h * d;
    const bytes = bits / 8;
    const kb = bytes / 1024;
    const inMB = kb >= 1024 && Number.isInteger((kb / 1024) * 100);
    const unit = inMB ? 'MB' : 'KB';
    const divisor = inMB ? 2 ** 20 : 1024;
    const value = bytes / divisor;
    const { answer, distractors } = numericOptions(r, {
      correct: value,
      // Shuffled, with a smaller slip included, so that the answer is not always the smallest option.
      wrong: r.shuffle([
        bits / divisor, // forgot to divide the bits by 8
        ...(d <= 8 ? [(w * h * 2 ** d) / 8 / divisor] : []), // used the number of colours 2^d instead of d bits
        bytes / (inMB ? 1e6 : 1000), // divided by powers of 1000
        (w * h) / divisor, // assumed one byte per pixel
        value / 8, // divided by 8 twice
      ]),
      format: (v) => `$${nice(v)}$ ${unit}`,
    });
    const toMB = inMB ? tex`, and $${fmt(kb)} \div 1024 = ${fmt(value)}$ MB` : '';
    return {
      stem: tex`A monitor displays $${w} \times ${h}$ pixels with a colour depth of $${d}$ ${d === 1 ? 'bit' : 'bits'} per pixel. Taking $1\,\text{KB} = 1024$ bytes and $1\,\text{MB} = 1024\,\text{KB}$, the memory needed to store one full screen image is:`,
      answer,
      distractors,
      explanation: tex`Memory $=$ pixels $\times$ bits per pixel $= ${w} \times ${h} \times ${d} = ${fmt(bits)}$ bits $= ${fmt(bits)} \div 8 = ${fmt(bytes)}$ bytes. Then $${fmt(bytes)} \div 1024 = ${fmt(kb)}$ KB${toMB}.`,
    };
  }),

  // ----- Hardware and software classification (conceptual pools) -----
  b.dynamic(
    'classify-component',
    { difficulty: 1, origin: 'past-paper', tags: ['input and output devices', 'hardware and software', 'storage'] },
    (r) => {
      const mode = r.weighted(CLASSIFY_MODES, CLASSIFY_MODES.map((m) => m.weight));
      const answer = r.pick(mode.answers);
      const distractors = r.sample(mode.wrong, 3);
      return { stem: mode.stem, answer, distractors, explanation: mode.explain(answer, distractors) };
    },
  ),

  b.dynamic('device-for-task', { difficulty: 2, origin: 'past-paper', tags: ['input and output devices'] }, (r) => {
    const entry = r.pick(SPECIAL_DEVICES);
    const pool = SPECIAL_DEVICES.filter(
      (d) => d !== entry && !entry.avoid?.includes(d.name) && !d.avoid?.includes(entry.name),
    );
    const others = r.sample(pool, 3);
    const askDevice = r.chance(0.5);
    const contrast = others.map((o) => `${withArticle(lc(o.name))} is used for ${o.use}`).join('; ');
    return {
      stem: askDevice
        ? `Which device is mainly used for ${entry.use}?`
        : `${cap(withArticle(lc(entry.name)))} is mainly used for:`,
      answer: askDevice ? entry.name : entry.use,
      distractors: others.map((o) => (askDevice ? o.name : o.use)),
      explanation: `${entry.why} By contrast, ${contrast}.`,
    };
  }),

  b.dynamic('computer-type-for-task', { difficulty: 1, origin: 'past-paper', tags: ['types of computers'] }, (r) => {
    const item = r.pick(COMPUTER_TYPE_ITEMS);
    return {
      stem: item.stem,
      answer: item.answer,
      distractors: [...item.distractors],
      explanation: item.explanation,
    };
  }),

  // ----- Fixed questions -----
  ...b.mcqs([
    {
      id: 'gigo-principle',
      d: 1,
      t: ['IT terms'],
      q: 'The principle that a computer produces incorrect output when it is given incorrect input is known as:',
      a: 'GIGO',
      x: ['FIFO', 'LIFO', 'WYSIWYG'],
      e: 'GIGO means "garbage in, garbage out": a computer processes exactly the data it is given, so wrong input leads to wrong output. FIFO and LIFO are orders in which items are processed (first in first out, last in first out), and WYSIWYG ("what you see is what you get") describes on-screen editing.',
    },
    {
      id: 'information-processing-cycle',
      d: 1,
      t: ['IT terms'],
      q: 'In the information processing cycle, raw data is converted into meaningful information during the:',
      a: 'processing stage',
      x: ['input stage', 'output stage', 'storage stage'],
      e: 'Input collects raw data; processing manipulates it (calculating, sorting, comparing) to produce information; output presents that information; storage keeps data and results for later use.',
    },
    {
      id: 'firmware-in-rom',
      d: 1,
      t: ['hardware and software', 'IT terms'],
      q: 'Programs that are permanently stored in ROM chips, such as the BIOS, are called:',
      a: 'firmware',
      x: ['shareware', 'freeware', 'malware'],
      e: 'Firmware is software held permanently in read-only memory; the BIOS that starts the computer is the usual example. Shareware and freeware describe how software is distributed, and malware is harmful software such as viruses.',
    },
    {
      id: 'compiler-whole-program',
      d: 2,
      t: ['hardware and software'],
      q: 'A language translator that converts an entire high-level language program into machine code before the program is executed is:',
      a: 'a compiler',
      x: ['an interpreter', 'an assembler', 'a linker'],
      e: 'A compiler translates the whole source program in one go and produces object code that is then run. An interpreter translates and executes one statement at a time, an assembler translates assembly language rather than a high-level language, and a linker only joins object files into an executable program.',
    },
    {
      id: 'touch-screen-input-output',
      d: 2,
      t: ['input and output devices'],
      q: 'Which of the following can act as both an input device and an output device?',
      a: 'Touch screen',
      x: ['Scanner', 'Plotter', 'Microphone'],
      e: 'A touch screen displays output and also accepts input when the user touches it. A scanner and a microphone are input-only devices, and a plotter is output-only.',
    },
    {
      id: 'magnetic-tape-sequential-access',
      d: 2,
      o: 'past-paper',
      t: ['storage'],
      q: 'Which storage medium allows only sequential access to data?',
      a: 'Magnetic tape',
      x: ['Hard disk', 'Optical disc (DVD)', 'USB flash drive'],
      e: 'To reach a record on a tape, the drive must wind past all the data stored before it, so access is sequential. Hard disks and optical discs allow direct (random) access, and a flash drive is electronic storage that reaches any location directly.',
    },
    {
      id: 'laser-printer-speed',
      d: 2,
      t: ['input and output devices'],
      q: 'The printing speed of a laser printer is usually measured in:',
      a: 'pages per minute (ppm)',
      x: ['characters per second (cps)', 'lines per minute (lpm)', 'dots per inch (dpi)'],
      e: 'A laser printer prints a whole page at a time, so its speed is quoted in pages per minute. Characters per second is used for character printers such as dot-matrix printers, lines per minute for line printers, and dots per inch measures print resolution, not speed.',
    },
    {
      id: 'dram-needs-refresh',
      d: 2,
      t: ['storage'],
      q: 'Which type of memory stores each bit as a charge on a tiny capacitor and therefore has to be refreshed periodically to keep its contents?',
      a: 'Dynamic RAM (DRAM)',
      x: ['Static RAM (SRAM)', 'Flash memory', 'EPROM'],
      e: 'A capacitor slowly leaks its charge, so DRAM must be refreshed continually. SRAM stores each bit in a flip-flop and needs no refreshing (it is faster and is used for cache), while flash memory and EPROM are non-volatile and keep their data even without power.',
    },
  ]),
]);
