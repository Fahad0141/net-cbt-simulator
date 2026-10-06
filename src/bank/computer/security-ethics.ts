/**
 * Computer Science (ICS Part I): Security, Copyright and the Law.
 *
 * Sub-topics: viruses and malware, security measures, privacy, copyright, cybercrime.
 *
 * Conceptual items are drawn from curated term pools. Every pool entry carries
 * hand-picked distractors that are clearly NOT the described term for each of the
 * entry's descriptions: "Virus" is never offered against a macro-virus description,
 * "Spyware" never against a keylogger, "Encryption" never against a digital
 * signature, and so on, so exactly one option is right.
 *
 * Computational items: counting PINs and passwords, worst-case brute-force time,
 * growth of the password space, and Caesar-cipher encryption and decryption.
 */
import { defineBank } from '@/engine/authoring';
import { listText, nPr, numericOptions, pickDistractors, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Integer with comma grouping for math mode: 10000 -> '10{,}000'. */
function grp(x: number): string {
  if (!Number.isSafeInteger(x)) throw new RangeError(`grp: expected an integer, got ${x}`);
  const digits = String(Math.abs(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '{,}');
  return x < 0 ? `-${digits}` : digits;
}

const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * One sentence per wrong option actually shown ("$40$ adds ... ."), so explanations
 * always match the displayed distractors.
 */
function whyWrong(distractors: readonly string[], reasons: ReadonlyArray<readonly [option: string, why: string]>): string {
  return distractors
    .map((option) => {
      const hit = reasons.find(([text]) => text === option);
      if (!hit) throw new Error(`security-ethics: no reason recorded for distractor ${option}`);
      return `${option} ${hit[1]}.`;
    })
    .join(' ');
}

/** A term that candidates must recognise from a description. */
interface Term {
  /** The option text (the term itself). */
  name: string;
  /** Original descriptions; each must fit this term and none of its distractors. */
  descriptions: readonly string[];
  /** Hand-picked wrong options: never a synonym, sub-type or super-type of the term. */
  distractors: readonly string[];
}

type Glossary = Readonly<Record<string, string>>;

function glossaryEntry(glossary: Glossary, name: string): string {
  const text = glossary[name];
  if (!text) throw new Error(`security-ethics: no glossary entry for "${name}"`);
  return text;
}

/** "Which term matches this description?" with a one-line definition of every option. */
function termQuestion(
  r: Rng,
  pool: readonly Term[],
  glossary: Glossary,
  stems: ReadonlyArray<(description: string) => string>,
): AuthoredQuestion {
  const entry = r.pick(pool);
  const description = r.pick(entry.descriptions);
  const distractors = r.sample(entry.distractors, 3);
  if (distractors.includes(entry.name)) throw new Error(`security-ethics: "${entry.name}" lists itself as a distractor`);
  return {
    stem: r.pick(stems)(description),
    answer: entry.name,
    distractors,
    explanation: [entry.name, ...distractors].map((name) => glossaryEntry(glossary, name)).join(' '),
  };
}

// ---------------------------------------------------------------------------
// Malware
// ---------------------------------------------------------------------------

const MALWARE: readonly Term[] = [
  {
    name: 'Virus',
    descriptions: [
      'attaches itself to a host program or file and spreads to other files when that program is run',
      'needs a host file to attach to and spreads only when a user runs or shares the infected file',
    ],
    distractors: ['Worm', 'Trojan horse', 'Spyware', 'Adware', 'Keylogger'],
  },
  {
    name: 'Worm',
    descriptions: [
      'copies itself from computer to computer across a network without attaching to a host file and without any action by the user',
      'replicates over network connections as a standalone program without any host file and can slow a network down by using up its bandwidth',
    ],
    distractors: ['Virus', 'Trojan horse', 'Logic bomb', 'Adware', 'Keylogger', 'Macro virus', 'Boot sector virus'],
  },
  {
    name: 'Trojan horse',
    descriptions: [
      'looks like a useful or harmless application (such as a free game) but secretly causes damage once installed and never copies itself',
      'cannot replicate and so depends on tricking users into installing it by hiding its harmful purpose inside a genuine-looking program',
    ],
    distractors: ['Virus', 'Worm', 'Boot sector virus', 'Macro virus', 'Polymorphic virus'],
  },
  {
    name: 'Logic bomb',
    descriptions: [
      'lies hidden inside a program and does nothing until a set condition, such as a particular date, triggers its harmful action',
      'remains dormant until a specific event occurs, for example a certain employee being removed from the payroll, and only then damages data',
    ],
    distractors: ['Worm', 'Adware', 'Spyware', 'Keylogger'],
  },
  {
    name: 'Boot sector virus',
    descriptions: [
      'infects the part of a disk that is read first at start-up and is therefore loaded into memory every time the computer boots from that disk',
      'hides in the start-up area of a hard disk or USB drive and infects any computer that simply starts from that drive',
    ],
    distractors: ['Macro virus', 'Worm', 'Adware', 'Spyware', 'Keylogger'],
  },
  {
    name: 'Macro virus',
    descriptions: [
      'is written in the macro language of an application such as a word processor or spreadsheet and spreads through infected documents',
      "is built from the commands of an application's macro language and is passed on whenever an infected document or workbook is shared",
    ],
    distractors: ['Boot sector virus', 'Adware', 'Keylogger', 'Spyware', 'Trojan horse'],
  },
  {
    name: 'Spyware',
    descriptions: [
      "secretly collects information about the user, such as the websites visited, and sends it to someone else without the user's knowledge",
      'runs hidden in the background, monitors what the user does and passes personal data to a third party',
    ],
    distractors: ['Worm', 'Logic bomb', 'Boot sector virus', 'Macro virus'],
  },
  {
    name: 'Ransomware',
    descriptions: [
      "encrypts the files on a victim's computer and demands payment before handing over the key needed to unlock them",
      'locks users out of their own data and asks for money, often in cryptocurrency, to restore access',
    ],
    distractors: ['Adware', 'Spyware', 'Keylogger', 'Logic bomb', 'Boot sector virus'],
  },
  {
    name: 'Adware',
    descriptions: [
      'automatically displays unwanted advertisements, often as pop-up windows, to earn money for its author',
      "fills the screen with pop-up advertisements and may change the browser's home page to an advertiser's website",
    ],
    distractors: ['Ransomware', 'Keylogger', 'Worm', 'Boot sector virus', 'Logic bomb'],
  },
  {
    name: 'Keylogger',
    descriptions: [
      'records every key the user presses so that passwords and other typed information can be stolen',
      'captures keystrokes and lets an attacker read the user names and passwords typed on the keyboard',
    ],
    distractors: ['Adware', 'Ransomware', 'Worm', 'Boot sector virus', 'Logic bomb', 'Macro virus'],
  },
  {
    name: 'Polymorphic virus',
    descriptions: [
      'changes its own code each time it infects a new file so that antivirus programs searching for a fixed pattern find it harder to detect',
      'produces a differently coded copy of itself with every infection in order to escape signature-based virus scanners',
    ],
    distractors: ['Trojan horse', 'Adware', 'Keylogger', 'Logic bomb', 'Spyware'],
  },
];

const MALWARE_GLOSSARY: Glossary = {
  Virus: 'A **virus** attaches itself to a host file or program and spreads when that file is run or shared.',
  Worm: 'A **worm** is a standalone program that copies itself across networks without a host file or any user action.',
  'Trojan horse': 'A **Trojan horse** pretends to be useful software and does not replicate itself.',
  'Logic bomb': 'A **logic bomb** stays dormant until a trigger condition, such as a date or an event, sets it off.',
  'Boot sector virus':
    'A **boot sector virus** infects the start-up (boot) area of a disk and loads whenever the computer boots from it.',
  'Macro virus': "A **macro virus** is written in an application's macro language and travels inside documents.",
  Spyware: '**Spyware** secretly monitors the user and sends the collected information to someone else.',
  Ransomware: "**Ransomware** encrypts or locks the victim's data and demands payment to restore it.",
  Adware: '**Adware** displays unwanted advertisements to earn money for its author.',
  Keylogger: 'A **keylogger** records keystrokes to capture passwords and other typed data.',
  'Polymorphic virus':
    'A **polymorphic virus** changes its code with every infection to avoid detection by signature-based scanners.',
};

// ---------------------------------------------------------------------------
// Security measures
// ---------------------------------------------------------------------------

const MEASURES: readonly Term[] = [
  {
    name: 'Firewall',
    descriptions: [
      'filters the data passing between a private network and the internet and blocks any traffic that breaks a set of security rules',
      'stands between a computer and the network and allows or blocks each connection according to rules set by the administrator',
    ],
    distractors: ['Encryption', 'Biometric authentication', 'Data backup', 'Digital signature', 'CAPTCHA'],
  },
  {
    name: 'Encryption',
    descriptions: [
      'converts readable data into a scrambled code that only someone with the correct key can turn back into readable form',
      'makes stolen data useless to a thief by turning it into ciphertext that cannot be understood without the key',
    ],
    distractors: ['Firewall', 'Biometric authentication', 'Data backup', 'Antivirus software', 'CAPTCHA'],
  },
  {
    name: 'Biometric authentication',
    descriptions: [
      'identifies a person by a unique physical feature such as a fingerprint, the face or the iris of the eye',
      'lets a user unlock a device by scanning a fingerprint or face instead of typing anything',
    ],
    distractors: ['Encryption', 'Firewall', 'Data backup', 'Antivirus software', 'CAPTCHA', 'Digital signature'],
  },
  {
    name: 'Antivirus software',
    descriptions: [
      'scans files and memory for known malicious code and removes or quarantines whatever it finds',
      'compares files against a regularly updated database of virus signatures to detect infections',
    ],
    distractors: ['Encryption', 'Biometric authentication', 'Data backup', 'Password protection', 'CAPTCHA', 'Digital signature'],
  },
  {
    name: 'Data backup',
    descriptions: [
      'keeps extra copies of important files on separate storage so that they can be restored if the originals are lost or damaged',
      'allows an organisation to recover its records after a disk failure, a fire or a ransomware attack',
    ],
    distractors: ['Firewall', 'Encryption', 'Biometric authentication', 'Antivirus software', 'Password protection', 'CAPTCHA'],
  },
  {
    name: 'Password protection',
    descriptions: ['gives access only after the user types a secret string of characters known only to that user'],
    distractors: ['Firewall', 'Data backup', 'Antivirus software', 'Biometric authentication', 'CAPTCHA', 'Digital signature'],
  },
  {
    name: 'Two-factor authentication',
    descriptions: [
      "combines two different kinds of proof of identity (for example, a password and a one-time code sent to the user's phone)",
    ],
    distractors: ['Firewall', 'Encryption', 'Data backup', 'Antivirus software', 'Digital signature', 'CAPTCHA'],
  },
  {
    name: 'Digital signature',
    descriptions: ['lets the receiver of an electronic document confirm who sent it and check that it was not altered on the way'],
    distractors: ['Firewall', 'Data backup', 'Antivirus software', 'CAPTCHA', 'Biometric authentication'],
  },
  {
    name: 'CAPTCHA',
    descriptions: [
      'asks the user to read distorted characters or pick out matching pictures in order to tell human users apart from automated programs',
    ],
    distractors: ['Firewall', 'Encryption', 'Data backup', 'Antivirus software', 'Digital signature'],
  },
];

const MEASURE_GLOSSARY: Glossary = {
  Firewall: 'A **firewall** filters network traffic and blocks connections that break its rules.',
  Encryption: '**Encryption** scrambles data into ciphertext that only the holder of the key can read.',
  'Biometric authentication':
    '**Biometric authentication** recognises a person from body features such as fingerprints, the face or the iris.',
  'Antivirus software': '**Antivirus software** finds known malware by its signatures and removes or quarantines it.',
  'Data backup': 'A **data backup** is a spare copy of data kept so that it can be restored after a loss.',
  'Password protection': '**Password protection** gives access only to someone who types the correct secret characters.',
  'Two-factor authentication':
    '**Two-factor authentication** combines two different kinds of proof, such as a password and a one-time code.',
  'Digital signature': 'A **digital signature** proves who sent an electronic document and reveals whether it was altered.',
  CAPTCHA: 'A **CAPTCHA** is a challenge that tells human users apart from automated programs.',
};

// ---------------------------------------------------------------------------
// Cybercrime
// ---------------------------------------------------------------------------

const CRIMES: readonly Term[] = [
  {
    name: 'Phishing',
    descriptions: [
      'Sending fake e-mails that appear to come from a bank or another trusted organisation to trick people into revealing their passwords or card numbers',
      "Luring people to a fake copy of a real bank's login page so that they type in their account details",
    ],
    distractors: ['Cyberstalking', 'Software piracy', 'Denial-of-service attack', 'Salami attack'],
  },
  {
    name: 'Spamming',
    descriptions: ['Sending the same unwanted advertisement by e-mail to thousands of people who never asked for it'],
    distractors: ['Hacking', 'Software piracy', 'Cyberstalking', 'Identity theft', 'Salami attack'],
  },
  {
    name: 'Hacking',
    descriptions: [
      'Breaking into a computer system or network without permission (for example, by getting past its password protection)',
      "Gaining unauthorised access to another person's computer or online account",
    ],
    distractors: ['Spamming', 'Software piracy', 'Cyberstalking', 'Denial-of-service attack'],
  },
  {
    name: 'Identity theft',
    descriptions: [
      "Using another person's stolen CNIC number and bank details to pose as that person (for example, to take out loans in their name)",
    ],
    distractors: ['Spamming', 'Software piracy', 'Denial-of-service attack', 'Cyberstalking'],
  },
  {
    name: 'Denial-of-service attack',
    descriptions: [
      "Flooding a website's server with so many requests that it slows down or crashes and genuine users cannot reach it",
    ],
    distractors: ['Phishing', 'Software piracy', 'Identity theft', 'Cyberstalking', 'Salami attack'],
  },
  {
    name: 'Cyberstalking',
    descriptions: ['Repeatedly using e-mails, messages or social media to follow, harass or threaten a particular person'],
    distractors: ['Phishing', 'Software piracy', 'Denial-of-service attack', 'Salami attack', 'Spamming'],
  },
  {
    name: 'Software piracy',
    descriptions: [
      'Copying, distributing or selling copyrighted software without the permission of its owner',
      'Installing a single-user copy of a program on many office computers without buying licences for them',
    ],
    distractors: ['Hacking', 'Phishing', 'Spamming', 'Plagiarism', 'Cyberstalking'],
  },
  {
    name: 'Salami attack',
    descriptions: [
      'Secretly taking a tiny amount, such as a fraction of a rupee, from each of thousands of bank accounts so that no single loss is noticed',
    ],
    distractors: ['Phishing', 'Spamming', 'Cyberstalking', 'Denial-of-service attack', 'Software piracy'],
  },
];

const CRIME_GLOSSARY: Glossary = {
  Phishing:
    '**Phishing** uses fake messages or websites that imitate trusted organisations to steal passwords and card details.',
  Spamming: '**Spamming** is sending unsolicited messages, usually advertisements, in bulk.',
  Hacking: '**Hacking** is gaining unauthorised access to a computer system or account.',
  'Identity theft': "**Identity theft** is using someone else's personal details to pose as that person.",
  'Denial-of-service attack': 'A **denial-of-service attack** overloads a server so that genuine users cannot use it.',
  Cyberstalking: '**Cyberstalking** is repeatedly harassing or threatening a particular person online.',
  'Software piracy': '**Software piracy** is copying or distributing software in violation of its copyright or licence.',
  'Salami attack': 'A **salami attack** steals tiny amounts from many accounts so that no single loss is noticed.',
  Plagiarism: "**Plagiarism** is presenting someone else's work as your own.",
};

// ---------------------------------------------------------------------------
// Antivirus products (well-known brands) and familiar non-antivirus software
// ---------------------------------------------------------------------------

const ANTIVIRUS = ['Kaspersky', 'Norton', 'McAfee', 'Avast', 'AVG', 'Bitdefender', 'Avira', 'ESET NOD32'] as const;

const NOT_ANTIVIRUS: Readonly<Record<string, string>> = {
  'MS Excel': 'a spreadsheet program',
  Photoshop: 'an image-editing program',
  AutoCAD: 'a computer-aided design (CAD) program',
  'VLC Media Player': 'a media player',
  Oracle: 'a large-scale database server',
  WinRAR: 'a file-compression utility',
  CorelDRAW: 'a vector-graphics design program',
  InPage: 'an Urdu desktop-publishing program',
  'MS Access': 'a database management system',
};

// ---------------------------------------------------------------------------
// Caesar cipher
// ---------------------------------------------------------------------------

const CIPHER_WORDS = [
  'VIRUS', 'WORM', 'DATA', 'FILE', 'CODE', 'LOGIN', 'TOKEN', 'PIXEL', 'MODEM', 'SERVER',
  'CIPHER', 'SECRET', 'BACKUP', 'ROUTER', 'SYSTEM', 'QUERY', 'MOUSE', 'CLOUD', 'EMAIL', 'TROJAN',
  'ACCESS', 'BINARY', 'SECURE', 'LAPTOP', 'PRINT', 'SCREEN', 'TYPIST', 'OUTPUT',
] as const;

const CODE_A = 'A'.charCodeAt(0);

/** Shifts every capital letter `shift` places along the alphabet, wrapping round. */
function caesar(word: string, shift: number): string {
  return [...word]
    .map((ch) => String.fromCharCode(CODE_A + ((((ch.charCodeAt(0) - CODE_A + shift) % 26) + 26) % 26)))
    .join('');
}

/** 'V→Y, I→L, ...' letter-by-letter mapping for explanations. */
function letterMap(from: string, to: string): string {
  return [...from].map((ch, i) => `${ch}→${to.charAt(i)}`).join(', ');
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export default defineBank('computer', 'security-ethics', (b) => [
  b.dynamic('malware-from-description', { difficulty: 2, origin: 'past-paper', tags: ['viruses and malware'] }, (r) =>
    termQuestion(r, MALWARE, MALWARE_GLOSSARY, [
      (d) => `Which type of malware ${d}?`,
      (d) => `Malicious software that ${d} is known as:`,
    ]),
  ),

  b.dynamic(
    'antivirus-software',
    { difficulty: 1, origin: 'past-paper', tags: ['viruses and malware', 'security measures'] },
    (r) => {
      const others = Object.keys(NOT_ANTIVIRUS);
      if (r.chance(0.6)) {
        const answer = r.pick(ANTIVIRUS);
        const distractors = r.sample(others, 3);
        const roles = distractors.map((name) => `${name} is ${NOT_ANTIVIRUS[name]}`);
        return {
          stem: 'Which of the following is an antivirus program?',
          answer,
          distractors,
          explanation: `**${answer}** is antivirus software: it detects, blocks and removes malware. ${listText(roles)}.`,
        };
      }
      const answer = r.pick(others);
      const distractors = r.sample(ANTIVIRUS, 3);
      return {
        stem: 'Which of the following is **not** an antivirus program?',
        answer,
        distractors,
        explanation: `**${answer}** is ${NOT_ANTIVIRUS[answer]}, not an antivirus. ${listText(distractors)} are all antivirus programs that detect and remove malware.`,
      };
    },
  ),

  b.dynamic('security-measure-from-description', { difficulty: 1, tags: ['security measures'] }, (r) =>
    termQuestion(r, MEASURES, MEASURE_GLOSSARY, [
      (d) => `Which security measure ${d}?`,
      (d) => `The security measure that ${d} is:`,
    ]),
  ),

  b.dynamic('cybercrime-from-description', { difficulty: 1, origin: 'past-paper', tags: ['cybercrime', 'privacy'] }, (r) =>
    termQuestion(r, CRIMES, CRIME_GLOSSARY, [
      (d) => `${d} is called:`,
      (d) => `Which term describes ${lowerFirst(d)}?`,
    ]),
  ),

  b.dynamic('password-combinations', { difficulty: 2, tags: ['security measures'] }, (r) => {
    const form = r.pick(['pin', 'charset', 'time'] as const);

    if (form === 'pin') {
      const n = r.int(3, 6);
      const { what, plural } = r.pick([
        { what: 'bank card PIN', plural: 'PINs' },
        { what: 'mobile phone PIN', plural: 'PINs' },
        { what: 'digital door-lock code', plural: 'codes' },
        { what: 'locker combination', plural: 'combinations' },
      ]);
      const total = 10 ** n;
      const fmt = (x: number): string => `$${grp(x)}$`;
      const { answer, distractors } = numericOptions(r, {
        // first digit not 0 | no repeats allowed | 10 x n instead of 10^n | left out the all-zero code
        correct: total,
        wrong: r.shuffle([9 * 10 ** (n - 1), nPr(10, n), 10 * n, total - 1]),
        format: fmt,
      });
      const tens = Array.from({ length: n }, () => '10').join(String.raw` \times `);
      const reasons = [
        [fmt(9 * 10 ** (n - 1)), 'wrongly forbids 0 as the first digit'],
        [fmt(nPr(10, n)), tex`(that is, $^{10}P_{${n}}$) wrongly forbids repeated digits`],
        [fmt(10 * n), 'adds the 10 choices for each position instead of multiplying them'],
        [fmt(total - 1), `leaves out the code ${'0'.repeat(n)}`],
      ] as const;
      return {
        stem: `A ${what} consists of exactly ${n} digits, each from 0 to 9, and digits may repeat. How many different ${plural} are possible?`,
        answer,
        distractors,
        explanation:
          tex`Each of the ${n} positions can be filled in $10$ ways, independently of the others, so the number of ${plural} is $${tens} = 10^{${n}} = ${grp(total)}$. ` +
          whyWrong(distractors, reasons),
      };
    }

    if (form === 'charset') {
      const set = r.pick([
        { k: 26, text: 'one of the 26 lowercase English letters (a–z)', parts: '', split: null },
        {
          k: 36,
          text: 'a lowercase English letter (a–z) or a decimal digit (0–9)',
          parts: ' (26 letters + 10 digits)',
          split: (n: number) => tex`26^{${n}} + 10^{${n}}`,
        },
        {
          k: 52,
          text: 'an English letter, either lowercase or uppercase',
          parts: ' (26 lowercase + 26 uppercase letters)',
          split: (n: number) => tex`2 \times 26^{${n}}`,
        },
        {
          k: 62,
          text: 'an English letter (lowercase or uppercase) or a decimal digit',
          parts: ' (52 letters + 10 digits)',
          split: (n: number) => tex`52^{${n}} + 10^{${n}}`,
        },
      ]);
      const { k } = set;
      const n = r.int(4, 10);
      const answer = `$${k}^{${n}}$`;
      const splitOption = set.split ? `$${set.split(n)}$` : '';
      const candidates = [
        `$${n}^{${k}}$`, // base and exponent swapped
        tex`$${k} \times ${n}$`, // multiplied instead of raising to a power
        `$^{${k}}P_{${n}}$`, // ignored "characters may repeat"
        ...(splitOption ? [splitOption] : []), // counted each kind of symbol separately
      ];
      const distractors = pickDistractors(answer, candidates, r);
      const reasons = [
        [candidates[0] as string, 'swaps the base and the exponent'],
        [candidates[1] as string, 'multiplies instead of raising to a power'],
        [candidates[2] as string, 'counts only passwords with no repeated character'],
        [splitOption, `counts each kind of symbol separately, although every position may hold any of the ${k} symbols`],
      ] as const;
      return {
        stem: `Each character of a ${n}-character password must be ${set.text}, and characters may repeat. The number of different passwords possible is:`,
        answer,
        distractors,
        explanation:
          tex`There are $${k}$ choices for each character${set.parts}. The ${n} positions are filled independently and repeats are allowed, so the count is $${k} \times ${k} \times \cdots \times ${k}$ (${n} factors) $= ${k}^{${n}}$. ` +
          whyWrong(distractors, reasons),
      };
    }

    // Worst-case brute-force time for a numeric PIN.
    const n = r.int(4, 6);
    const total = 10 ** n;
    const rates = [10, 20, 25, 40, 50, 80, 100, 125, 200, 250, 400, 500, 625, 1000, 1250, 2000, 2500, 5000].filter(
      (rate) => (10 ** (n - 1)) % rate === 0 && total / rate >= 20 && total / rate <= 20000,
    );
    const rate = r.pick(rates);
    const t = total / rate; // a multiple of 10, so t/2, 9t/10 and t/10 are whole numbers
    const fmt = (x: number): string => tex`$${grp(x)}\,\mathrm{s}$`;
    const { answer, distractors } = numericOptions(r, {
      // average instead of maximum | first digit taken as non-zero | used 10^(n-1) PINs
      correct: t,
      wrong: [t / 2, (9 * t) / 10, t / 10],
      format: fmt,
    });
    const reasons = [
      [fmt(t / 2), 'is only the average time, when about half of the PINs have been tried'],
      [fmt((9 * t) / 10), tex`wrongly assumes the first digit cannot be 0 ($9 \times 10^{${n - 1}}$ PINs)`],
      [fmt(t / 10), tex`uses $10^{${n - 1}}$ PINs instead of $10^{${n}}$`],
    ] as const;
    return {
      stem: tex`A password-guessing program can test $${grp(rate)}$ PINs per second. What is the **maximum** time it needs to find a ${n}-digit PIN (each digit from 0 to 9, repeats allowed) by trying every possible combination?`,
      answer,
      distractors,
      explanation:
        tex`Number of possible PINs $= 10^{${n}} = ${grp(total)}$. In the worst case every one must be tried, so $t = \dfrac{${grp(total)}}{${grp(rate)}} = ${grp(t)}\,\mathrm{s}$. ` +
        whyWrong(distractors, reasons),
    };
  }),

  b.dynamic('password-space-growth', { difficulty: 3, tags: ['security measures'] }, (r) => {
    if (r.chance(0.55)) {
      const { k, text } = r.pick([
        { k: 10, text: 'a decimal digit (0–9)' },
        { k: 26, text: 'a lowercase English letter (a–z)' },
        { k: 36, text: 'a lowercase English letter or a decimal digit' },
      ]);
      const n = r.pick([4, 5, 8]); // (n + d)/n is then a terminating decimal
      const d = r.pick([2, 3]);
      const factor = k ** d;
      const ratio = (n + d) / n;
      const answer = `$${grp(factor)}$`;
      const reasons = [
        [`$${grp(k * d)}$`, `multiplies ${k} by the ${d} extra characters instead of raising it to that power`],
        [`$${String(ratio)}$`, tex`assumes the count grows in proportion to the length ($\frac{${n + d}}{${n}}$)`],
        [`$${d}$`, 'only counts the extra characters'],
      ] as const;
      const distractors = pickDistractors(
        answer,
        reasons.map(([option]) => option),
      );
      return {
        stem: `Every character of a password is ${text}, and characters may repeat. If the password length is increased from ${n} to ${n + d} characters, the number of possible passwords is multiplied by:`,
        answer,
        distractors,
        explanation:
          tex`A password of length $L$ built from ${k} symbols has $${k}^{L}$ possibilities, so the ratio is $\dfrac{${k}^{${n + d}}}{${k}^{${n}}} = ${k}^{${d}} = ${grp(factor)}$: each extra character multiplies the possibilities by ${k}. ` +
          whyWrong(distractors, reasons),
      };
    }
    const n = r.int(5, 10);
    const factor = 2 ** n;
    const answer = `$${grp(factor)}$`;
    const reasons = [
      ['$2$', 'doubles the count only once instead of once per position'],
      [`$${2 * n}$`, `adds 2 for each of the ${n} positions instead of multiplying by 2 each time`],
      [`$${n * n}$`, tex`swaps the base and the exponent, working out $${n}^{2}$ instead of $2^{${n}}$`],
      ['$26$', 'counts the 26 new letters, not the factor by which the choices at each position grow'],
    ] as const;
    const distractors = pickDistractors(
      answer,
      reasons.map(([option]) => option),
      r,
    );
    return {
      stem: `A ${n}-character password could previously use only the 26 lowercase English letters. If uppercase letters are now also allowed (characters may still repeat), the number of possible passwords is multiplied by:`,
      answer,
      distractors,
      explanation:
        tex`Before: $26^{${n}}$ passwords. After: $52^{${n}}$, because each position now has $26 + 26 = 52$ choices. The ratio is $\left(\frac{52}{26}\right)^{${n}} = 2^{${n}} = ${grp(factor)}$: the number of choices doubles at every one of the ${n} positions. ` +
        whyWrong(distractors, reasons),
    };
  }),

  b.dynamic('caesar-cipher', { difficulty: 2, tags: ['security measures'] }, (r) => {
    const plain = r.pick(CIPHER_WORDS);
    const k = r.int(2, 8);
    const cipher = caesar(plain, k);
    const rule = `each letter is replaced by the letter ${k} places later in the alphabet, wrapping round from Z to A`;
    if (r.chance(0.5)) {
      return {
        stem: `In a Caesar cipher, ${rule}. Using this cipher, the word **${plain}** is encrypted as:`,
        answer: cipher,
        // shifted backwards (that decrypts) | shifted one place too far | one place too few
        distractors: [caesar(plain, -k), caesar(plain, k + 1), caesar(plain, k - 1)],
        explanation: `Move each letter ${k} places forward: ${letterMap(plain, cipher)}, giving **${cipher}**. Moving the letters backwards would decrypt rather than encrypt.`,
      };
    }
    return {
      stem: `A message was encrypted with a Caesar cipher in which ${rule}. The ciphertext **${cipher}** decrypts to:`,
      answer: plain,
      // shifted forwards again | one place too far back | one place too few back
      distractors: [caesar(cipher, k), caesar(cipher, -(k + 1)), caesar(cipher, -(k - 1))],
      explanation: `To decrypt, move each letter ${k} places back: ${letterMap(cipher, plain)}, giving **${plain}**. Moving the letters forward would encrypt the text a second time.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'brain-first-pc-virus',
      d: 1,
      o: 'past-paper',
      t: ['viruses and malware'],
      q: '**Brain**, released in 1986 and generally regarded as the first virus for IBM-compatible PCs, was written by two brothers in:',
      a: 'Pakistan',
      x: ['USA', 'India', 'Israel'],
      e: 'Brain was written in 1986 by the brothers Basit and Amjad Farooq Alvi in Lahore, Pakistan. It was a boot sector virus that spread through infected floppy disks.',
    },
    {
      id: 'trojan-vs-virus',
      d: 2,
      t: ['viruses and malware'],
      q: 'Which statement correctly describes how a Trojan horse differs from a computer virus?',
      a: 'It does not replicate; it relies on the user installing it.',
      x: [
        'It replicates across networks without any user action.',
        'It can only infect the boot sector of a disk.',
        'It cannot damage files or steal data.',
      ],
      e: 'A Trojan horse disguises itself as useful software and never copies itself, so it spreads only when users install it. Spreading across networks without user action describes a worm, infecting the boot sector describes a boot sector virus, and a Trojan can certainly delete files or open a back door for an attacker.',
    },
    {
      id: 'copyright-protects-expression',
      d: 3,
      t: ['copyright'],
      q: 'A software house writes a new accounting program. Copyright law protects:',
      a: 'the program code it has written',
      x: ['the idea of computerised accounting', 'the brand name under which the program is sold', 'nothing, as software cannot be copyrighted'],
      e: 'Copyright protects the original expression of a work, here the program code, not the underlying idea or method (inventions and processes are protected by patents). A brand name is protected as a trademark, not by copyright. Computer programs are protected by copyright as literary works.',
    },
    {
      id: 'public-domain-software',
      d: 2,
      t: ['copyright'],
      q: 'Which category of software has no copyright protection at all, so that anyone may copy, modify and even sell it?',
      a: 'Public domain software',
      x: ['Freeware', 'Shareware', 'Open-source software'],
      e: 'Public domain software has no copyright owner, so there are no restrictions on its use. Freeware is free to use but remains copyrighted; shareware is copyrighted and must be paid for after a trial period; open-source software is also copyrighted and is distributed under a licence that sets conditions for copying and changing it.',
    },
    {
      id: 'shareware-trial',
      d: 1,
      o: 'past-paper',
      t: ['copyright'],
      q: 'Software that can be used free of charge for a limited trial period, after which the user is expected to pay for it, is called:',
      a: 'Shareware',
      x: ['Freeware', 'Firmware', 'Public domain software'],
      e: "Shareware is copyrighted software distributed on a 'try before you buy' basis: after the trial the user should buy a licence. Freeware is free with no time limit, public domain software has no copyright at all, and firmware is software stored permanently in a device's ROM.",
    },
    {
      id: 'cookies-privacy',
      d: 1,
      t: ['privacy'],
      q: "Small text files that websites store on a visitor's computer to remember details such as login status and pages visited, and which raise privacy concerns, are called:",
      a: 'Cookies',
      x: ['Applets', 'Plug-ins', 'Bookmarks'],
      e: "Cookies are small text files placed on the user's computer by websites. Because they can track a user's browsing across visits and sites, they raise privacy issues. Applets are small programs, plug-ins add features to a browser, and bookmarks are links saved by the user, not by the website.",
    },
    {
      id: 'firewall-limitation',
      d: 2,
      t: ['security measures', 'viruses and malware'],
      q: 'A computer is protected by a firewall but has no antivirus software. Which of the following can the firewall **not** prevent?',
      a: 'Infection by a virus in a file copied from a USB flash drive',
      x: [
        'An unauthorised connection attempt from the internet',
        'Incoming traffic from a blocked IP address',
        'Outgoing data sent through a blocked port',
      ],
      e: 'A firewall only filters traffic that passes through the network connection. A file copied from a USB drive never crosses the network, so the firewall cannot stop a virus inside it; antivirus software is needed for that. Blocking unwanted connections, blocked addresses and blocked ports is exactly what a firewall does.',
    },
    {
      id: 'spyware-threatens-privacy',
      d: 2,
      t: ['privacy', 'viruses and malware'],
      q: "Which of the following is mainly a threat to a user's **privacy**, rather than to the working of the computer?",
      a: 'Spyware that secretly reports the websites the user visits',
      x: [
        'A boot sector virus that stops the computer from starting',
        'A worm that slows the network by flooding it with copies',
        'A logic bomb that deletes files on a set date',
      ],
      e: "Privacy is a person's control over information about themselves. Spyware collects details of the user's activities and passes them on without consent, so it attacks privacy. The other three damage the system or its data but do not gather personal information.",
    },
  ]),
]);
