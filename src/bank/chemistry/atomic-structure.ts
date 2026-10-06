import { defineBank } from '@/engine/authoring';
import { elementByZ, n$, num, numericOptions, pickDistractors, tex } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Subshells in Aufbau (n + l) filling order up to 4p, with capacities. */
const FILL_ORDER: ReadonlyArray<readonly [string, number]> = [
  ['1s', 2],
  ['2s', 2],
  ['2p', 6],
  ['3s', 2],
  ['3p', 6],
  ['4s', 2],
  ['3d', 10],
  ['4p', 6],
];

/** Ground-state occupancy (subshell, electrons, capacity) for Z <= 36, with the Cr and Cu exceptions. */
function occupancy(z: number): Array<{ sub: string; k: number; cap: number }> {
  let remaining = z;
  const occ: Array<{ sub: string; k: number; cap: number }> = [];
  for (const [sub, cap] of FILL_ORDER) {
    if (remaining <= 0) break;
    const k = Math.min(cap, remaining);
    remaining -= k;
    occ.push({ sub, k, cap });
  }
  if (z === 24 || z === 29) {
    const s4 = occ.find((o) => o.sub === '4s');
    const d3 = occ.find((o) => o.sub === '3d');
    if (s4 && d3) {
      s4.k = 1;
      d3.k += 1;
    }
  }
  return occ;
}

/** Unpaired electrons in one subshell holding k electrons (Hund's rule). */
const unpairedIn = (k: number, cap: number): number => (k <= cap / 2 ? k : cap - k);

/** `[Ar] 3d^d 4s^s` in shell order, omitting empty subshells. */
function arConfig(d: number, s: number): string {
  const parts = ['[\\mathrm{Ar}]'];
  if (d > 0) parts.push(`3d^{${d}}`);
  if (s > 0) parts.push(`4s^{${s}}`);
  return `$${parts.join('\\,')}$`;
}

/** (3d, 4s) electron counts of the ground state of an element with 19 <= Z <= 30. */
function dsCounts(z: number): [number, number] {
  if (z === 19) return [0, 1];
  if (z === 24) return [5, 1];
  if (z === 29) return [10, 1];
  return [z - 20, 2];
}

/** Charge as a LaTeX superscript body: 2 -> '2+', -1 -> '-'. */
function chargeTex(q: number): string {
  if (q === 0) return '';
  const mag = Math.abs(q) === 1 ? '' : String(Math.abs(q));
  return `${mag}${q > 0 ? '+' : '-'}`;
}

/** Nuclides (symbol, Z, A) and the ionic charges that occur in FSc problems. */
const SPECIES: ReadonlyArray<readonly [string, number, number, readonly number[]]> = [
  ['Li', 3, 7, [0, 1]],
  ['Be', 4, 9, [0, 2]],
  ['C', 6, 12, [0]],
  ['C', 6, 13, [0]],
  ['C', 6, 14, [0]],
  ['N', 7, 14, [0, -3]],
  ['N', 7, 15, [0, -3]],
  ['O', 8, 16, [0, -2]],
  ['O', 8, 18, [0, -2]],
  ['F', 9, 19, [0, -1]],
  ['Na', 11, 23, [0, 1]],
  ['Mg', 12, 24, [0, 2]],
  ['Mg', 12, 25, [0, 2]],
  ['Al', 13, 27, [0, 3]],
  ['P', 15, 31, [0, -3]],
  ['S', 16, 32, [0, -2]],
  ['Cl', 17, 35, [0, -1]],
  ['Cl', 17, 37, [0, -1]],
  ['K', 19, 39, [0, 1]],
  ['Ca', 20, 40, [0, 2]],
  ['Fe', 26, 56, [0, 2, 3]],
  ['Cu', 29, 63, [0, 1, 2]],
  ['Cu', 29, 65, [0, 2]],
  ['Zn', 30, 64, [0, 2]],
  ['Zn', 30, 66, [0, 2]],
];

const SUBSHELL_LETTER = ['s', 'p', 'd', 'f'] as const;
const SERIES = ['Lyman', 'Balmer', 'Paschen', 'Brackett', 'Pfund'] as const;

export default defineBank('chemistry', 'atomic-structure', (b) => [
  // -------------------------------------------------------------------------
  // Subatomic particles
  // -------------------------------------------------------------------------
  b.dynamic(
    'particles-in-nuclide',
    { difficulty: 1, origin: 'past-paper', tags: ['subatomic particles'] },
    (r) => {
      const [sym, z, a, charges] = r.pick(SPECIES);
      const q = r.pick(charges);
      const species = tex`^{${a}}_{${z}}\mathrm{${sym}}${q === 0 ? '' : `^{${chargeTex(q)}}`}`;
      const electrons = z - q;
      const neutrons = a - z;
      const ask = r.pick(['electrons', 'neutrons'] as const);
      const correct = ask === 'electrons' ? electrons : neutrons;
      const wrong =
        ask === 'electrons'
          ? [z + q, z, neutrons] // charge sign slip, ignored the charge, gave neutrons
          : [a, z, a + z]; // gave mass number, gave protons, added instead of subtracting
      const { answer, distractors } = numericOptions(r, { correct, wrong, format: (x) => n$(x) });
      const chargeNote =
        q === 0
          ? 'the atom is neutral, so electrons = protons'
          : q > 0
            ? `a charge of $+${q}$ means ${q} electron${q === 1 ? '' : 's'} lost`
            : `a charge of $-${-q}$ means ${-q} electron${q === -1 ? '' : 's'} gained`;
      return {
        stem: tex`The number of ${ask} in $${species}$ is:`,
        answer,
        distractors,
        explanation:
          ask === 'electrons'
            ? tex`Protons $= Z = ${z}$; ${chargeNote}. Electrons $= Z - (\text{charge}) = ${z} - (${q}) = ${electrons}$.`
            : tex`Neutrons $= A - Z = ${a} - ${z} = ${neutrons}$. The charge changes only the number of electrons, not the nucleus.`,
      };
    },
  ),

  // -------------------------------------------------------------------------
  // Bohr model
  // -------------------------------------------------------------------------
  b.dynamic('bohr-radius-energy', { difficulty: 1, tags: ['Bohr model'] }, (r) => {
    if (r.chance(0.5)) {
      const n = r.int(2, 6);
      const r1 = 0.0529;
      const rn = r1 * n * n;
      const fmt = (x: number): string => `$${num(x, { sig: 5 })}\\,\\mathrm{nm}$`;
      const { answer, distractors } = numericOptions(r, {
        correct: rn,
        wrong: [r1 * n, r1 * n * n * n, r1 * (n + 1) * (n + 1), r1 * 2 * n],
        format: fmt,
      });
      return {
        stem: tex`The radius of the first Bohr orbit of the hydrogen atom is $0.0529\,\mathrm{nm}$. The radius of orbit $n = ${n}$ is:`,
        answer,
        distractors,
        explanation: tex`Bohr radii grow as $n^2$: $r_n = r_1 n^2 = 0.0529 \times (${n})^2 = ${num(rn, { sig: 5 })}\,\mathrm{nm}$.`,
      };
    }
    const n = r.pick([2, 4, 5, 8, 10]);
    const en = -13.6 / (n * n);
    const fmt = (x: number): string => `$${num(x, { sig: 5 })}\\,\\mathrm{eV}$`;
    const { answer, distractors } = numericOptions(r, {
      correct: en,
      wrong: [-13.6 / n, 13.6 / (n * n), 13.6 * (1 - 1 / (n * n))],
      format: fmt,
      allowNegative: true,
    });
    return {
      stem: tex`The energy of the electron in the first orbit of the hydrogen atom is $-13.6\,\mathrm{eV}$. Its energy in orbit $n = ${n}$ is:`,
      answer,
      distractors,
      explanation: tex`$E_n = \dfrac{E_1}{n^2} = \dfrac{-13.6}{(${n})^2} = ${num(en, { sig: 5 })}\,\mathrm{eV}$. The energy stays negative (bound electron) and approaches zero as $n$ increases.`,
    };
  }),

  // -------------------------------------------------------------------------
  // Quantum numbers
  // -------------------------------------------------------------------------
  b.dynamic('quantum-number-capacity', { difficulty: 1, tags: ['quantum numbers', 'orbitals'] }, (r) => {
    const mode = r.pick(['shell-electrons', 'shell-orbitals', 'subshell-electrons', 'subshell-orbitals', 'l-values'] as const);
    let stem: string;
    let correct: number;
    let wrong: number[];
    let explanation: string;
    if (mode === 'shell-electrons') {
      const n = r.int(2, 5);
      correct = 2 * n * n;
      wrong = [n * n, 2 * n, 2 * (2 * n + 1)];
      stem = tex`The maximum number of electrons that the shell with principal quantum number $n = ${n}$ can hold is:`;
      explanation = tex`Maximum electrons in a shell $= 2n^2 = 2(${n})^2 = ${correct}$.`;
    } else if (mode === 'shell-orbitals') {
      const n = r.int(2, 5);
      correct = n * n;
      wrong = [2 * n * n, n, 2 * n - 1];
      stem = tex`The total number of orbitals in the shell with $n = ${n}$ is:`;
      explanation = tex`A shell contains $n^2$ orbitals: $(${n})^2 = ${correct}$ (each holds 2 electrons, giving $2n^2 = ${2 * n * n}$ electrons).`;
    } else if (mode === 'subshell-electrons') {
      const l = r.int(1, 3);
      const n = r.int(l + 1, 5);
      correct = 2 * (2 * l + 1);
      wrong = [2 * l + 1, 2 * n * n, 2 * (2 * n + 1)];
      stem = tex`The maximum number of electrons in the subshell with $n = ${n}$ and $l = ${l}$ is:`;
      explanation = tex`The capacity of a subshell depends only on $l$: it has $2l + 1 = ${2 * l + 1}$ orbitals, so it holds $2(2l + 1) = ${correct}$ electrons (a $${n}${SUBSHELL_LETTER[l]}$ subshell).`;
    } else if (mode === 'subshell-orbitals') {
      const l = r.int(1, 3);
      const letter = SUBSHELL_LETTER[l];
      correct = 2 * l + 1;
      wrong = [2 * (2 * l + 1), l, 2 * l];
      stem = tex`The number of orbitals in a $${letter}$-subshell ($l = ${l}$) is:`;
      explanation = tex`For a given $l$, $m$ takes the values $-l, \ldots, 0, \ldots, +l$, i.e. $2l + 1 = 2(${l}) + 1 = ${correct}$ values, one orbital each.`;
    } else {
      const n = r.int(2, 6);
      correct = n;
      wrong = [n - 1, n + 1, 2 * n];
      stem = tex`How many different values of the azimuthal quantum number $l$ are allowed when $n = ${n}$?`;
      const lValues = Array.from({ length: n }, (_, i) => i).join(', ');
      explanation = tex`$l$ runs from $0$ to $n - 1$, i.e. $l = ${lValues}$: that is $n = ${n}$ values.`;
    }
    const { answer, distractors } = numericOptions(r, { correct, wrong, format: (x) => n$(x) });
    return { stem, answer, distractors, explanation };
  }),

  // -------------------------------------------------------------------------
  // Electronic configuration
  // -------------------------------------------------------------------------
  b.dynamic(
    'd-block-configuration',
    { difficulty: 2, origin: 'past-paper', tags: ['electronic configuration'] },
    (r) => {
      const z = r.weighted([20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], [1, 1, 1, 1, 3, 1, 1, 1, 1, 3, 1]);
      const el = elementByZ(z);
      const name = el ? el.name.toLowerCase() : `Z = ${z}`;
      const [d, s] = dsCounts(z);
      const answer = arConfig(d, s);
      const candidates: string[] = [];
      if (z === 24 || z === 29) candidates.push(arConfig(d - 1, 2)); // ignored the half-filled/full-d stability
      else if (z !== 20 && z !== 28 && z !== 30) candidates.push(arConfig(d + 1, 1)); // invented an exception
      if (z - 18 <= 10) candidates.push(arConfig(z - 18, 0)); // filled 3d before 4s
      const [dm, sm] = dsCounts(z - 1);
      candidates.push(arConfig(dm, sm)); // one electron short
      if (z < 30) {
        const [dp, sp] = dsCounts(z + 1);
        candidates.push(arConfig(dp, sp)); // one electron extra
      }
      if (s > 0) candidates.push(arConfig(d, 0)); // dropped the 4s electrons (ion-like)
      if (d + 2 <= 10) candidates.push(arConfig(d + 2, s)); // miscounted
      if (d >= 1) candidates.push(arConfig(d - 1, s)); // miscounted
      const distractors = pickDistractors(answer, candidates);
      const reason =
        z === 24
          ? tex`Chromium is an exception: $3d^5\,4s^1$ (two half-filled subshells) is more stable than $3d^4\,4s^2$.`
          : z === 29
            ? tex`Copper is an exception: $3d^{10}\,4s^1$ (completely filled $3d$) is more stable than $3d^9\,4s^2$.`
            : z === 20
              ? tex`By the $(n + l)$ rule $4s$ ($n + l = 4$) fills before $3d$ ($n + l = 5$), so both electrons enter $4s$ and $3d$ stays empty.`
              : tex`By the $(n + l)$ rule $4s$ ($n + l = 4$) fills before $3d$ ($n + l = 5$), so after $4s^2$ the remaining ${z - 20} electron${z - 20 === 1 ? ' enters' : 's enter'} $3d$.`;
      return {
        stem: tex`The ground-state electronic configuration of ${name} ($Z = ${z}$) is:`,
        answer,
        distractors,
        explanation: tex`Argon core has 18 electrons; ${name} has ${z - 18} more. ${reason}`,
      };
    },
  ),

  b.dynamic('unpaired-electrons', { difficulty: 2, tags: ['electronic configuration', 'orbitals'] }, (r) => {
    const z = r.pick([5, 6, 7, 8, 9, 13, 14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
    const el = elementByZ(z);
    const name = el ? el.name.toLowerCase() : `Z = ${z}`;
    const occ = occupancy(z);
    const correct = occ.reduce((acc, o) => acc + unpairedIn(o.k, o.cap), 0);
    const last = occ[occ.length - 1] as { sub: string; k: number; cap: number };
    const wrong: number[] = [last.k % 2, last.k];
    if (z === 24) wrong.unshift(4); // used 3d^4 4s^2
    // Zinc (0 unpaired): add 1 explicitly, otherwise the offset fallback can produce negative counts.
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [...wrong, correct + 2, ...(correct === 0 ? [1] : [])],
      format: (x) => n$(x),
      allowZero: true,
    });
    const partial = occ.filter((o) => unpairedIn(o.k, o.cap) > 0);
    const detail = partial.length
      ? partial
          .map((o) => tex`$${o.sub}^{${o.k}}$ (${o.cap / 2} orbital${o.cap === 2 ? '' : 's'}) gives ${unpairedIn(o.k, o.cap)}`)
          .join('; ')
      : 'every subshell is completely filled';
    return {
      stem: tex`How many unpaired electrons are present in a ground-state ${name} atom ($Z = ${z}$)?`,
      answer,
      distractors,
      explanation: tex`Configuration: $${configTexFrom(occ)}$. By Hund's rule electrons occupy the orbitals of a subshell singly before pairing: ${detail}. Total unpaired $= ${correct}$.`,
    };
  }),

  // -------------------------------------------------------------------------
  // Spectra
  // -------------------------------------------------------------------------
  b.dynamic('spectral-lines-series', { difficulty: 2, tags: ['spectra', 'Bohr model'] }, (r) => {
    const mode = r.pick(['to-ground', 'between', 'series'] as const);
    if (mode === 'series') {
      const lower = r.int(1, 4);
      const upper = r.int(lower + 1, lower + 4);
      const answer = `${SERIES[lower - 1]} series`;
      const distractors = pickDistractors(
        answer,
        SERIES.map((s) => `${s} series`),
        r,
      );
      return {
        stem: tex`In the hydrogen spectrum, the line emitted when an electron jumps from $n = ${upper}$ to $n = ${lower}$ belongs to the:`,
        answer,
        distractors,
        explanation: tex`The series is fixed by the **lower** orbit: $n = 1$ Lyman (UV), $n = 2$ Balmer (visible), $n = 3$ Paschen, $n = 4$ Brackett, $n = 5$ Pfund (IR). Here $n_1 = ${lower}$.`,
      };
    }
    if (mode === 'to-ground') {
      const n = r.int(3, 8);
      const correct = (n * (n - 1)) / 2;
      const { answer, distractors } = numericOptions(r, {
        correct,
        wrong: [n - 1, (n * (n + 1)) / 2, n * n],
        format: (x) => n$(x),
      });
      return {
        stem: tex`Electrons in a sample of hydrogen atoms excited to $n = ${n}$ return to the ground state. The maximum number of different spectral lines emitted is:`,
        answer,
        distractors,
        explanation: tex`Each pair of levels gives one line: $\dfrac{n(n - 1)}{2} = \dfrac{${n}(${n - 1})}{2} = ${correct}$.`,
      };
    }
    const n1 = r.int(2, 4);
    const n2 = r.int(n1 + 2, n1 + 5);
    const gap = n2 - n1;
    const correct = (gap * (gap + 1)) / 2;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [gap, (n2 * (n2 - 1)) / 2, gap * gap],
      format: (x) => n$(x),
    });
    return {
      stem: tex`Electrons in hydrogen atoms fall from $n = ${n2}$ to $n = ${n1}$, through all possible intermediate levels. The maximum number of spectral lines produced is:`,
      answer,
      distractors,
      explanation: tex`With $\Delta n = ${n2} - ${n1} = ${gap}$, the number of lines is $\dfrac{\Delta n(\Delta n + 1)}{2} = \dfrac{${gap}(${gap + 1})}{2} = ${correct}$.`,
    };
  }),

  // -------------------------------------------------------------------------
  // Fixed recall items
  // -------------------------------------------------------------------------
  ...b.mcqs([
    {
      id: 'positive-rays-hydrogen',
      d: 1,
      o: 'past-paper',
      t: ['subatomic particles'],
      q: tex`The charge-to-mass ratio ($e/m$) of positive rays is the highest when the discharge tube contains:`,
      a: 'hydrogen gas',
      x: ['helium gas', 'nitrogen gas', 'oxygen gas'],
      e: tex`Positive rays are positive ions of the gas in the tube, so their $e/m$ depends on the gas. $\ce{H+}$ (a proton) is the lightest ion, so hydrogen gives the largest $e/m$.`,
    },
    {
      id: 'neutron-discovery',
      d: 1,
      o: 'past-paper',
      t: ['subatomic particles'],
      q: tex`Chadwick discovered the neutron (1932) by bombarding a thin sheet of which element with $\alpha$-particles?`,
      a: 'Beryllium',
      x: ['Gold', 'Nitrogen', 'Aluminium'],
      e: tex`$\ce{^{9}_{4}Be + ^{4}_{2}He -> ^{12}_{6}C + ^{1}_{0}n}$. Gold foil was used by Rutherford for $\alpha$-scattering, not for the neutron.`,
    },
    {
      id: 'rutherford-empty-space',
      d: 1,
      t: ['subatomic particles', 'Bohr model'],
      q: tex`In Rutherford's experiment most $\alpha$-particles passed straight through the gold foil. This showed that:`,
      a: 'most of the volume of an atom is empty space',
      x: [
        'electrons revolve in fixed circular orbits',
        'the mass of an atom is spread uniformly',
        'the nucleus contains neutrons and protons',
      ],
      e: 'Undeflected passage means the particles met nothing in most of the atom, so the atom is mostly empty. The few large deflections showed a small, dense, positive nucleus; fixed orbits came later from Bohr, and neutrons were found only in 1932.',
    },
    {
      id: 'moseley-atomic-number',
      d: 1,
      t: ['spectra', 'subatomic particles'],
      q: "Moseley's study of the X-ray spectra of elements showed that the fundamental property of an element is its:",
      a: 'atomic number',
      x: ['atomic mass', 'number of neutrons', 'density'],
      e: tex`Moseley found $\sqrt{\nu} \propto Z$ for characteristic X-rays, so elements are fixed by their atomic number (nuclear charge), not by atomic mass.`,
    },
    {
      id: 'balmer-series-orbit',
      d: 1,
      o: 'past-paper',
      t: ['spectra'],
      q: 'Lines of the Balmer series of the hydrogen spectrum are emitted when electrons fall from higher orbits to the orbit:',
      a: tex`$n = 2$`,
      x: [tex`$n = 1$`, tex`$n = 3$`, tex`$n = 4$`],
      e: tex`Lyman ends at $n = 1$ (ultraviolet), Balmer at $n = 2$ (visible), Paschen at $n = 3$ and Brackett at $n = 4$ (infrared).`,
    },
    {
      id: 'azimuthal-gives-shape',
      d: 1,
      t: ['quantum numbers', 'orbitals'],
      q: tex`The azimuthal quantum number $l$ tells us the orbital's:`,
      a: 'shape',
      x: ['size', 'orientation in space', 'spin direction'],
      e: tex`$l$ fixes the subshell and its shape ($s$ spherical, $p$ dumb-bell). Size is given by $n$, orientation by $m$, and spin by $s$.`,
    },
    {
      id: 'pauli-exclusion',
      d: 1,
      t: ['quantum numbers'],
      q: 'The principle stating that no two electrons in an atom can have the same set of all four quantum numbers is:',
      a: "Pauli's exclusion principle",
      x: ["Hund's rule", 'the Aufbau principle', "Heisenberg's uncertainty principle"],
      e: "Pauli's exclusion principle; it limits each orbital to two electrons of opposite spin. Hund's rule concerns single occupation of degenerate orbitals, and Aufbau the order of filling.",
    },
    {
      id: 'p-orbital-shape',
      d: 1,
      t: ['orbitals'],
      q: tex`The shape of a $p$-orbital is:`,
      a: 'dumb-bell',
      x: ['spherical', 'double dumb-bell', 'tetrahedral'],
      e: tex`A $p$-orbital has two lobes on either side of a nodal plane through the nucleus (dumb-bell). $s$ is spherical; most $d$-orbitals are double dumb-bells.`,
    },
    {
      id: 'filled-after-4p',
      d: 2,
      t: ['electronic configuration', 'quantum numbers'],
      q: tex`According to the $(n + l)$ rule, the subshell filled immediately after $4p$ is:`,
      a: tex`$5s$`,
      x: [tex`$4d$`, tex`$4f$`, tex`$5p$`],
      e: tex`$(n + l)$: $4p = 5$, $5s = 5$, $4d = 6$, $5p = 6$, $4f = 7$. For equal $n + l$ the lower $n$ fills first, so $4p$ is followed by $5s$.`,
    },
    {
      id: 'forbidden-quantum-set',
      d: 2,
      t: ['quantum numbers'],
      q: tex`Which set of quantum numbers $(n, l, m, s)$ is NOT possible for an electron?`,
      a: tex`$(2, 2, 0, +\tfrac{1}{2})$`,
      x: [tex`$(3, 2, -2, +\tfrac{1}{2})$`, tex`$(4, 0, 0, -\tfrac{1}{2})$`, tex`$(2, 1, -1, -\tfrac{1}{2})$`],
      e: tex`$l$ can take only $0$ to $n - 1$; for $n = 2$, $l = 2$ is not allowed. The others obey $l \le n - 1$ and $|m| \le l$.`,
    },
  ]),
]);

/** Shell-ordered LaTeX configuration from an occupancy list (3d printed before 4s). */
function configTexFrom(occ: ReadonlyArray<{ sub: string; k: number }>): string {
  return [...occ]
    .filter((o) => o.k > 0)
    .sort((a, b) => Number(a.sub[0]) - Number(b.sub[0]) || 'spdf'.indexOf(a.sub[1] ?? 's') - 'spdf'.indexOf(b.sub[1] ?? 's'))
    .map((o) => `${o.sub}^{${o.k}}`)
    .join('\\,');
}
