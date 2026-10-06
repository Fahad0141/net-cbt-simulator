/**
 * Computer Architecture (ICS Part I): the CPU, registers, the system bus, the
 * instruction cycle and the memory hierarchy.
 *
 * Computational templates: address-bus sizing, memory-chip organisation, clock timing,
 * cache hit ratio / average access time and the program counter during execution.
 * Conceptual templates: register roles, hierarchy ordering and classic recall items.
 */
import { defineBank } from '@/engine/authoring';
import { listText, num, numericOptions, ordinal, pickDistractors, q$, sci, tex } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Memory sizes. Binary units as in the textbook: 1 KB = 2^10 bytes, 1 MB = 2^20 bytes, ...
// ---------------------------------------------------------------------------

const SIZE_UNITS = ['bytes', 'KB', 'MB', 'GB', 'TB'] as const;

/** Splits 2^e bytes into 2^m units, e.g. 2^23 -> { m: 3, unit: 'MB', unitExp: 20 }. */
function splitBytes(e: number): { m: number; unit: string; unitExp: number } {
  const level = Math.min(Math.floor(e / 10), SIZE_UNITS.length - 1);
  return { m: e - 10 * level, unit: SIZE_UNITS[level], unitExp: 10 * level };
}

/** Readable size of 2^e bytes: 2^23 -> '8 MB', 2^9 -> '512 bytes'. */
function sizeText(e: number): string {
  const { m, unit } = splitBytes(e);
  return `${2 ** m} ${unit}`;
}

/** LaTeX (no `$`) for a size written as a power of two: '8\,\mathrm{MB} = 2^{3} \times 2^{20} = 2^{23}' (bytes). */
function sizeAsPowers(e: number): string {
  const { m, unit, unitExp } = splitBytes(e);
  if (unitExp === 0) return tex`${2 ** e} = 2^{${e}}`;
  if (m === 0) return tex`1\,\mathrm{${unit}} = 2^{${e}}`;
  return tex`${2 ** m}\,\mathrm{${unit}} = 2^{${m}} \times 2^{${unitExp}} = 2^{${e}}`;
}

/** LaTeX (no `$`) for 2^e bytes converted to a unit: '2^{23}\ \text{bytes} = 2^{3} \times 2^{20}\ \text{bytes} = 8\,\mathrm{MB}'. */
function powersAsSize(e: number): string {
  const { m, unit, unitExp } = splitBytes(e);
  const bytes = tex`\ \text{bytes}`;
  if (unitExp === 0) return tex`2^{${e}}${bytes} = ${2 ** e}${bytes}`;
  if (m === 0) return tex`2^{${e}}${bytes} = 1\,\mathrm{${unit}}`;
  return tex`2^{${e}}${bytes} = 2^{${m}} \times 2^{${unitExp}}${bytes} = ${2 ** m}\,\mathrm{${unit}}`;
}

// ---------------------------------------------------------------------------
// Registers. `avoid` lists registers whose role could be argued to overlap, so they
// are never offered as distractors for each other (kept symmetric).
// ---------------------------------------------------------------------------

interface RegisterInfo {
  key: string;
  /** Display names; alternatives are textbook synonyms (only one appears per question). */
  names: readonly string[];
  /** What the register holds, phrased to follow "holds". */
  role: string;
  /** One-line reason shown in the explanation. */
  note: string;
  avoid?: readonly string[];
}

const REGISTERS: readonly RegisterInfo[] = [
  {
    key: 'pc',
    names: ['Program Counter (PC)'],
    role: 'the address of the next instruction to be fetched',
    note: 'Every fetch advances the PC (a jump reloads it), so it always points to the next instruction.',
  },
  {
    key: 'ir',
    names: ['Instruction Register (IR)'],
    role: 'the instruction currently being decoded and executed',
    note: 'The fetched instruction is copied into the IR, where the control unit decodes its opcode.',
    avoid: ['mdr'],
  },
  {
    key: 'mar',
    names: ['Memory Address Register (MAR)'],
    role: 'the address placed on the address bus for a memory read or write',
    note: 'The MAR drives the address bus; any address (for example, the contents of the PC during a fetch) is copied into it before memory is accessed.',
  },
  {
    key: 'mdr',
    names: ['Memory Data Register (MDR)', 'Memory Buffer Register (MBR)'],
    role: 'the word being transferred to or from memory over the data bus',
    note: 'The MDR (also called the MBR) buffers every word read from or written to main memory.',
    avoid: ['ir', 'ac'],
  },
  {
    key: 'ac',
    names: ['Accumulator (AC)'],
    role: 'one operand and the result of arithmetic and logic operations',
    note: 'The accumulator supplies an operand to the ALU and receives the result of the operation.',
    avoid: ['mdr'],
  },
  {
    key: 'sp',
    names: ['Stack Pointer (SP)'],
    role: 'the address of the top of the stack',
    note: 'Each PUSH or POP updates the SP so that it keeps pointing to the top of the stack.',
  },
  {
    key: 'sr',
    names: ['Status Register (SR)', 'Flag Register'],
    role: 'flag bits such as carry, zero and overflow set by ALU operations',
    note: 'Each flag bit records a condition (carry, zero, sign, overflow) produced by the last ALU operation.',
  },
];

// ---------------------------------------------------------------------------
// Memory hierarchy, listed from the top (closest to the CPU) to the bottom.
// Going down: speed and cost per bit fall; access time and capacity grow.
// ---------------------------------------------------------------------------

const HIERARCHY = ['Registers', 'Cache memory', 'Main memory (RAM)', 'Hard disk'] as const;

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  return items.flatMap((x, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [x, ...rest]),
  );
}

/** Orders in which the stem may name the levels: never the hierarchy order or its reverse (either could be the answer). */
const STEM_ORDERS = permutations(HIERARCHY).filter(
  (p) => p.join() !== HIERARCHY.join() && p.join() !== [...HIERARCHY].reverse().join(),
);

const HIERARCHY_ORDERINGS: ReadonlyArray<{ by: string; topFirst: boolean }> = [
  { by: 'decreasing speed (fastest first)', topFirst: true },
  { by: 'increasing speed (slowest first)', topFirst: false },
  { by: 'increasing access time (shortest first)', topFirst: true },
  { by: 'decreasing access time (longest first)', topFirst: false },
  { by: 'increasing storage capacity (smallest first)', topFirst: true },
  { by: 'decreasing storage capacity (largest first)', topFirst: false },
  { by: 'decreasing cost per bit (most expensive first)', topFirst: true },
  { by: 'increasing cost per bit (cheapest first)', topFirst: false },
];

/** Clock frequencies in MHz whose period is a terminating decimal of nanoseconds. 1 GHz is left out on purpose (period 1 ns makes "cycles x period" equal "cycles x frequency"). */
const CLOCKS_MHZ = [125, 200, 250, 400, 500, 800, 1250, 2000, 2500, 4000, 5000] as const;

/** Nanosecond option, exact to six significant figures (no 3-s.f. rounding of 11.25 to 11.3). */
const ns = (v: number): string => q$(v, 'ns', { sig: 6 });

export default defineBank('computer', 'computer-architecture', (b) => [
  // -------------------------------------------------------------------------
  // Buses
  // -------------------------------------------------------------------------
  b.dynamic('address-bus-capacity', { difficulty: 1, origin: 'past-paper', tags: ['buses'] }, (r) => {
    const n = r.int(10, 40);
    if (r.chance(0.5)) {
      const answer = sizeText(n);
      // half / double (off by one line), x8 (bits vs bytes), /8 (counted bits)
      const distractors = pickDistractors(answer, r.shuffle([n - 1, n + 1, n + 3, n - 3]).map(sizeText));
      return {
        stem: `A computer has a ${n}-bit address bus, and each memory location stores one byte. What is the maximum amount of memory it can address?`,
        answer,
        distractors,
        explanation: tex`An address bus with $n$ lines carries $2^{n}$ different addresses, and each address selects one byte. With $n = ${n}$: $${powersAsSize(n)}$.`,
      };
    }
    const { m } = splitBytes(n);
    const { answer, distractors } = numericOptions(r, {
      correct: n,
      // counted bits (x8 = 3 more lines), off by one either way, ignored the K/M/G prefix
      wrong: r.shuffle([n + 3, n - 1, n + 1, ...(m >= 3 ? [m] : [])]),
      format: (v) => `$${v}$`,
    });
    return {
      stem: `What is the minimum number of address lines needed to address ${sizeText(n)} of byte-addressable memory?`,
      answer,
      distractors,
      explanation: tex`$${sizeAsPowers(n)}$ bytes. Since $k$ address lines select one of $2^{k}$ locations, $${n}$ address lines are needed.`,
    };
  }),

  b.dynamic('memory-chip-lines', { difficulty: 2, tags: ['buses'] }, (r) => {
    const width = r.pick([4, 8, 16, 32]);
    // k = width would make the swapped option identical to the answer.
    const k = r.intExcept(10, 26, [width]);
    const prefix = k >= 20 ? 'M' : 'K';
    const prefixExp = k >= 20 ? 20 : 10;
    const mantissa = 2 ** (k - prefixExp);
    const label = tex`${mantissa}\mathrm{${prefix}}`;
    const powers = mantissa === 1 ? tex`2^{${k}}` : tex`2^{${k - prefixExp}} \times 2^{${prefixExp}} = 2^{${k}}`;
    const widthBits = Math.log2(width);
    const lines = (address: number, data: number): string => `${address} address lines and ${data} data lines`;
    const answer = lines(k, width);
    const distractors = pickDistractors(answer, [
      lines(width, k), // swapped the two numbers
      lines(k + widthBits, width), // used the total number of bits instead of locations
      lines(k, widthBits), // took log2 of the word width as well
      lines(k + 1, width), // spare
    ]);
    return {
      stem: tex`A memory chip is organised as $${label} \times ${width}$ (number of locations $\times$ bits per location). How many address lines and data lines does it need?`,
      answer,
      distractors,
      explanation: tex`Number of locations $= ${label} = ${powers}$, so $${k}$ address lines are needed to select any one of them. Each location is ${width} bits wide, so ${width} data lines carry a whole word in parallel.`,
    };
  }),

  // -------------------------------------------------------------------------
  // CPU and the instruction cycle
  // -------------------------------------------------------------------------
  b.dynamic('cpu-clock-timing', { difficulty: 2, tags: ['CPU', 'instruction cycle'] }, (r) => {
    const f = r.pick(CLOCKS_MHZ);
    const fTex = f >= 1000 ? tex`${num(f / 1000)}\,\mathrm{GHz}` : tex`${f}\,\mathrm{MHz}`;
    const hz = sci(f * 1e6, 6);

    if (r.chance(0.5)) {
      const cycles = r.int(2, 12);
      const period = 1000 / f; // ns
      const time = cycles * period;
      const { answer, distractors } = numericOptions(r, {
        correct: time,
        wrong: [
          period, // forgot to multiply by the number of cycles
          (cycles * f) / 1000, // multiplied cycles by the frequency in GHz
          time * 1000, // unit slip: converted microseconds to ns with 10^6 instead of 10^3
          period / cycles, // divided instead of multiplied (only needed when two of the above coincide)
        ],
        format: ns,
      });
      return {
        stem: tex`A processor has a clock frequency of $${fTex}$. How long does it take to execute an instruction that needs ${cycles} clock cycles?`,
        answer,
        distractors,
        explanation: tex`One clock cycle lasts $T = \dfrac{1}{f} = \dfrac{1}{${hz}\,\mathrm{Hz}} = ${num(period, { sig: 6 })}\,\mathrm{ns}$, so ${cycles} cycles take $${cycles} \times ${num(period, { sig: 6 })} = ${num(time, { sig: 6 })}\,\mathrm{ns}$.`,
      };
    }

    const cpi = r.pick([2, 4, 5, 8].filter((c) => f % c === 0));
    const rate = (f / cpi) * 1e6;
    const { answer, distractors } = numericOptions(r, {
      correct: rate,
      wrong: [
        f * 1e6, // ignored the cycles per instruction
        f * cpi * 1e6, // multiplied by the cycles per instruction
        rate / 1000, // took "mega" as 10^3
      ],
      format: (v) => `$${sci(v, 6)}$`,
    });
    return {
      stem: tex`A processor runs at $${fTex}$, and each instruction needs ${cpi} clock cycles on average. How many instructions can it execute per second?`,
      answer,
      distractors,
      explanation: tex`Instructions per second $= \dfrac{\text{clock cycles per second}}{\text{cycles per instruction}} = \dfrac{${hz}}{${cpi}} = ${sci(rate, 6)}$.`,
    };
  }),

  // -------------------------------------------------------------------------
  // Registers
  // -------------------------------------------------------------------------
  b.dynamic('register-role', { difficulty: 1, origin: 'past-paper', tags: ['registers'] }, (r) => {
    const reg = r.pick(REGISTERS);
    const avoid = reg.avoid ?? [];
    const others = r.sample(
      REGISTERS.filter((o) => o.key !== reg.key && !avoid.includes(o.key)),
      3,
    );
    const name = r.pick(reg.names);
    const explanation = `The **${name}** holds ${reg.role}. ${reg.note}`;
    if (r.chance(0.5)) {
      return {
        stem: `Which register holds ${reg.role}?`,
        answer: name,
        distractors: others.map((o) => r.pick(o.names)),
        explanation,
      };
    }
    return {
      stem: `The ${name} holds:`,
      answer: reg.role,
      distractors: others.map((o) => o.role),
      explanation,
    };
  }),

  b.dynamic('pc-during-execution', { difficulty: 3, tags: ['registers', 'instruction cycle'] }, (r) => {
    const start = r.multiple(1000, 9000, 100);
    const size = r.pick([2, 3, 4, 6, 8]);
    const n = r.int(3, 12);
    const current = start + (n - 1) * size;
    const pc = current + size;
    const { answer, distractors } = numericOptions(r, {
      correct: pc,
      wrong: [
        current, // the address of the instruction being executed (PC not yet advanced)
        start + n, // assumed the PC grows by 1 per instruction
        pc + size, // advanced one instruction too far
        start + n - 1, // current instruction under the "+1 per instruction" assumption (spare)
      ],
      format: (v) => `$${v}$`,
    });
    return {
      stem: `A program is stored in byte-addressable memory starting at address ${start} (addresses in decimal), and every instruction is ${size} bytes long. The program counter (PC) is updated as soon as each instruction is fetched. If no jump occurs, what does the PC contain while the CPU is executing the ${ordinal(n)} instruction?`,
      answer,
      distractors,
      explanation: tex`The ${ordinal(n)} instruction starts at $${start} + (${n} - 1) \times ${size} = ${current}$. Its fetch has already advanced the PC by one instruction length, so during execution the PC holds the address of the next instruction: $${current} + ${size} = ${pc}$.`,
    };
  }),

  // -------------------------------------------------------------------------
  // Memory hierarchy
  // -------------------------------------------------------------------------
  b.dynamic('memory-hierarchy-order', { difficulty: 2, tags: ['memory hierarchy'] }, (r) => {
    const { by, topFirst } = r.pick(HIERARCHY_ORDERINGS);
    const order: string[] = topFirst ? [...HIERARCHY] : [...HIERARCHY].reverse();
    const show = (xs: readonly string[]): string => xs.join(' → ');
    const swapped = (i: number): string[] => {
      const out = [...order];
      [out[i], out[i + 1]] = [out[i + 1] as string, out[i] as string];
      return out;
    };
    const answer = show(order);
    const wrong = [swapped(0), swapped(1), swapped(2), [...order].reverse()];
    const named = r.pick(STEM_ORDERS).map((level) => level.charAt(0).toLowerCase() + level.slice(1));
    return {
      stem: `Which of the following arranges ${listText(named)} in order of ${by}?`,
      answer,
      distractors: pickDistractors(answer, r.shuffle(wrong).map(show)),
      explanation: `Moving down the memory hierarchy (registers → cache → main memory → hard disk), speed and cost per bit fall while access time and storage capacity grow. So the order of ${by} is: ${answer}.`,
    };
  }),

  b.dynamic('cache-hit-ratio', { difficulty: 2, tags: ['memory hierarchy'] }, (r) => {
    if (r.chance(0.5)) {
      const total = r.pick([200, 400, 500, 800, 1000, 1500, 2000, 2500, 4000, 5000]);
      const hitRatio = r.pick([0.75, 0.8, 0.85, 0.9, 0.92, 0.95, 0.96, 0.98]);
      const misses = Math.round(total * (1 - hitRatio));
      const hits = total - misses;
      const { answer, distractors } = numericOptions(r, {
        correct: hits / total,
        wrong: [
          misses / total, // the miss ratio
          misses / hits, // misses per hit
          hits / misses, // hits per miss
        ],
        format: (v) => `$${num(v)}$`,
      });
      return {
        stem: `While a program runs, the CPU makes ${total} memory references, and ${misses} of them are not found in the cache. What is the cache hit ratio?`,
        answer,
        distractors,
        explanation: tex`Hits $= ${total} - ${misses} = ${hits}$, so hit ratio $= \dfrac{\text{hits}}{\text{total references}} = \dfrac{${hits}}{${total}} = ${num(hits / total)}$. The miss ratio is $1 - ${num(hits / total)} = ${num(misses / total)}$.`,
      };
    }

    const h = r.pick([0.8, 0.85, 0.9, 0.95, 0.98]);
    const tHit = r.int(2, 20);
    const tMiss = r.multiple(50, 200, 10);
    const avg = h * tHit + (1 - h) * tMiss;
    const { answer, distractors } = numericOptions(r, {
      correct: avg,
      wrong: [
        (1 - h) * tHit + h * tMiss, // swapped the weights
        (tHit + tMiss) / 2, // plain average of the two times
        h * tHit + tMiss, // forgot to weight the miss time
      ],
      format: ns,
    });
    return {
      stem: tex`A cache has a hit ratio of $${num(h)}$. A memory reference takes $${tHit}\,\mathrm{ns}$ when it hits the cache and $${tMiss}\,\mathrm{ns}$ in total when it misses. What is the average memory access time?`,
      answer,
      distractors,
      explanation: tex`$t_{\text{avg}} = h\,t_{\text{hit}} + (1 - h)\,t_{\text{miss}} = ${num(h)}(${tHit}) + ${num(1 - h)}(${tMiss}) = ${num(h * tHit, { sig: 6 })} + ${num((1 - h) * tMiss, { sig: 6 })} = ${num(avg, { sig: 6 })}\,\mathrm{ns}$.`,
    };
  }),

  // -------------------------------------------------------------------------
  // Fixed questions
  // -------------------------------------------------------------------------
  ...b.mcqs([
    {
      id: 'control-unit-directs',
      d: 1,
      o: 'past-paper',
      t: ['CPU'],
      q: 'Which part of the CPU directs and coordinates the working of all the other units of the computer?',
      a: 'Control unit (CU)',
      x: ['Arithmetic logic unit (ALU)', 'General-purpose registers', 'Cache memory'],
      e: 'The control unit fetches and decodes instructions and issues the timing and control signals that tell the ALU, memory and I/O devices what to do. The ALU only performs arithmetic and logic operations, while registers and cache only store data.',
    },
    {
      id: 'decode-step',
      d: 1,
      o: 'past-paper',
      t: ['instruction cycle'],
      q: 'In the instruction cycle, the step in which the control unit interprets an instruction to work out the operation to be performed is:',
      a: 'decode',
      x: ['fetch', 'execute', 'store'],
      e: 'Fetch brings the instruction from memory into the instruction register, decode interprets its opcode and operands, execute carries out the operation, and store writes the result back to a register or memory.',
    },
    {
      id: 'opcode-field',
      d: 1,
      t: ['instruction cycle'],
      q: 'The part of a machine instruction that specifies the operation to be performed, such as ADD or LOAD, is called the:',
      a: 'opcode',
      x: ['operand', 'operand address', 'addressing mode'],
      e: 'An instruction consists of an operation code (opcode), which names the operation, and operand fields, which give the data or where to find it. The addressing mode only says how the operand address is to be interpreted.',
    },
    {
      id: 'bus-directions',
      d: 2,
      o: 'past-paper',
      t: ['buses'],
      q: 'Which of the following statements about the system bus is correct?',
      a: 'The address bus is unidirectional, while the data bus is bidirectional.',
      x: [
        'The data bus is unidirectional, while the address bus is bidirectional.',
        'The width of the data bus fixes the maximum memory the CPU can address.',
        'Memory read and write signals are carried on the address bus.',
      ],
      e: 'Addresses travel only from the CPU to memory and I/O devices, so the address bus is one-way, whereas data flows both ways (reads and writes). The addressable memory depends on the address-bus width, and read/write signals belong to the control bus.',
    },
    {
      id: 'word-size-meaning',
      d: 1,
      t: ['CPU', 'registers'],
      q: 'Calling a processor a "64-bit processor" means that:',
      a: 'its word size is 64 bits, so it processes 64 bits as one unit',
      x: [
        'it contains exactly 64 general-purpose registers',
        'it can address at most 64 GB of main memory',
        'it executes 64 instructions in every clock cycle',
      ],
      e: 'The bit rating of a CPU is its word size: the number of bits its registers and ALU handle as a single unit. It does not fix the number of registers, the amount of memory or the number of instructions per cycle.',
    },
    {
      id: 'von-neumann-stored-program',
      d: 2,
      t: ['CPU'],
      q: 'The key idea of the von Neumann (stored-program) architecture is that:',
      a: 'program instructions and data are stored together in the same main memory',
      x: [
        'instructions and data are kept in separate memories with separate buses',
        'a new program is set up by rewiring the machine for each task',
        'every instruction is completed in exactly one clock cycle',
      ],
      e: 'In a von Neumann machine the program is loaded into main memory alongside its data, and both are fetched over the same bus. Separate instruction and data memories describe the Harvard architecture, and rewiring is how very early machines such as ENIAC were programmed.',
    },
    {
      id: 'locality-of-reference',
      d: 2,
      t: ['memory hierarchy'],
      q: 'A small cache can satisfy most CPU requests because programs tend to reuse recently accessed items and to access neighbouring addresses. This property of programs is called:',
      a: 'locality of reference',
      x: ['virtual memory', 'pipelining', 'multiprogramming'],
      e: 'Temporal locality (reuse of recently used data and instructions) and spatial locality (use of nearby addresses) let a small, fast cache hold most of what the CPU needs next, so the average access time falls. Virtual memory, pipelining and multiprogramming are unrelated techniques.',
    },
    {
      id: 'fetch-first-transfer',
      d: 3,
      t: ['instruction cycle', 'registers'],
      q: 'At the start of the fetch phase of the instruction cycle, the contents of the program counter (PC) are first copied into the:',
      a: 'memory address register (MAR)',
      x: ['instruction register (IR)', 'memory data register (MDR)', 'accumulator (AC)'],
      e: tex`The fetch phase begins with $\text{MAR} \leftarrow \text{PC}$, which places the address of the instruction on the address bus. The instruction read from memory arrives in the MDR and is then moved to the IR ($\text{IR} \leftarrow \text{MDR}$) while the PC is incremented.`,
    },
  ]),
]);
