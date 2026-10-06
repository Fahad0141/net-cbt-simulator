/**
 * Computer Science (ICS Part II): Databases.
 *
 * Sub-topics: data and information, DBMS concepts, keys, relationships, ER modelling,
 * normalization and MS Access.
 *
 * Dynamic items build a fresh table, schema, criterion or set of numbers on every use:
 * file size from fixed-length records, degree and cardinality of a displayed relation,
 * foreign keys in two-table schemas, relationship types of entity pairs, the normal form
 * of a relation from its functional dependencies, MS Access `Like` wildcards and the
 * number of records an Access query returns. Fixed items cover recurring definitions.
 *
 * Every scenario states the facts the answer depends on (business rules, functional
 * dependencies, "1 KB = 1024 bytes"), so exactly one option is right.
 */
import { defineBank } from '@/engine/authoring';
import { gcd, listText, n$, num, numericOptions, pickDistractors, sum, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// ---------------------------------------------------------------------------
// Local helpers and shared data
// ---------------------------------------------------------------------------

const PEOPLE: readonly string[] = [
  'Ali', 'Sara', 'Usman', 'Ayesha', 'Hamza', 'Fatima', 'Bilal', 'Zainab',
  'Omar', 'Hira', 'Saad', 'Maryam', 'Talha', 'Iqra', 'Danish', 'Noor',
];
const CITIES: readonly string[] = ['Lahore', 'Karachi', 'Multan', 'Quetta', 'Peshawar', 'Sialkot'];

const repeat = <T>(count: number, make: () => T): T[] => Array.from({ length: count }, () => make());

/** Integer for math mode, grouped from five digits on: 131072 -> '131{,}072'; others via `num`. */
function grp(x: number): string {
  if (!Number.isSafeInteger(x)) return num(x, { autoSci: false });
  return Math.abs(x) < 10000 ? String(x) : String(x).replace(/\B(?=(\d{3})+(?!\d))/g, '{,}');
}

/** A table in the project's rich-text syntax: header row, separator row, body rows. */
function pipeTable(header: readonly string[], rows: ReadonlyArray<readonly string[]>): string {
  const line = (cells: readonly string[]): string => `| ${cells.join(' | ')} |`;
  return [line(header), line(header.map(() => '---')), ...rows.map((row) => line(row))].join('\n');
}

/**
 * Options for "how many records" questions: mistake-based counts first, then nearby counts,
 * always within 0..max (a query on an 8-row table can never return 9 records).
 */
function countOptions(correct: number, mistakes: readonly number[], max: number): { answer: string; distractors: string[] } {
  const answer = n$(correct);
  const near = [1, -1, 2, -2, 3, -3, 4, -4].map((d) => correct + d);
  const pool = [...mistakes, ...near].filter((v) => Number.isInteger(v) && v >= 0 && v <= max && v !== correct);
  return { answer, distractors: pickDistractors(answer, pool.map((v) => n$(v))) };
}

/** Increasing identifiers with small random gaps: E104, E105, E108, ... */
function serials(r: Rng, count: number, prefix: string, start: number): string[] {
  const out: string[] = [];
  let value = start;
  for (let i = 0; i < count; i++) {
    out.push(`${prefix}${value}`);
    value += r.int(1, 3);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Data hierarchy: field -> record -> file sizes
// ---------------------------------------------------------------------------

const RECORD_FIELDS: ReadonlyArray<{ name: string; sizes: readonly number[] }> = [
  { name: 'RollNo', sizes: [6, 8, 10] },
  { name: 'Name', sizes: [20, 25, 30, 40] },
  { name: 'FatherName', sizes: [20, 25, 30] },
  { name: 'City', sizes: [12, 15, 20] },
  { name: 'Phone', sizes: [11, 12] },
  { name: 'CNIC', sizes: [13, 15] },
  { name: 'Email', sizes: [30, 40] },
];

const kb$ = (x: number): string => `$${grp(x)}\\,\\mathrm{KB}$`;

// ---------------------------------------------------------------------------
// Relations shown as tables (degree and cardinality)
// ---------------------------------------------------------------------------

interface ColumnSpec {
  title: string;
  values: (r: Rng, count: number) => string[];
}

const BOOK_TITLES: readonly string[] = [
  'Data Basics', 'Learning C', 'Easy Physics', 'Modern Algebra', 'World Atlas',
  'Organic Chemistry', 'English Grammar', 'Calculus Notes', 'Computer Networks', 'Urdu Poetry',
];
const ITEMS: readonly string[] = [
  'Pen', 'Pencil', 'Eraser', 'Notebook', 'Ruler', 'Stapler', 'Marker', 'Folder', 'Sharpener', 'Glue stick',
];

/** The first column of every relation is its key; the rest are chosen per instance. */
const RELATIONS: ReadonlyArray<{ name: string; columns: readonly ColumnSpec[] }> = [
  {
    name: 'STUDENT',
    columns: [
      { title: 'RollNo', values: (r, n) => serials(r, n, '', r.int(101, 160)) },
      { title: 'Name', values: (r, n) => r.sample(PEOPLE, n) },
      { title: 'City', values: (r, n) => repeat(n, () => r.pick(CITIES)) },
      { title: 'Age', values: (r, n) => repeat(n, () => String(r.int(16, 19))) },
      { title: 'Marks', values: (r, n) => repeat(n, () => String(r.int(35, 99))) },
      { title: 'Section', values: (r, n) => repeat(n, () => r.pick(['A', 'B', 'C'])) },
    ],
  },
  {
    name: 'EMPLOYEE',
    columns: [
      { title: 'EmpID', values: (r, n) => serials(r, n, 'E', r.int(101, 160)) },
      { title: 'Name', values: (r, n) => r.sample(PEOPLE, n) },
      { title: 'Department', values: (r, n) => repeat(n, () => r.pick(['HR', 'IT', 'Sales', 'Accounts'])) },
      { title: 'City', values: (r, n) => repeat(n, () => r.pick(CITIES)) },
      { title: 'Salary', values: (r, n) => repeat(n, () => String(r.multiple(40000, 150000, 5000))) },
      { title: 'Age', values: (r, n) => repeat(n, () => String(r.int(24, 58))) },
    ],
  },
  {
    name: 'BOOK',
    columns: [
      { title: 'BookID', values: (r, n) => serials(r, n, 'B', r.int(201, 260)) },
      { title: 'Title', values: (r, n) => r.sample(BOOK_TITLES, n) },
      { title: 'Author', values: (r, n) => r.sample(PEOPLE, n) },
      { title: 'Price', values: (r, n) => repeat(n, () => String(r.multiple(300, 1500, 50))) },
      { title: 'Pages', values: (r, n) => repeat(n, () => String(r.multiple(120, 640, 10))) },
      { title: 'Year', values: (r, n) => repeat(n, () => String(r.int(2008, 2024))) },
    ],
  },
  {
    name: 'PRODUCT',
    columns: [
      { title: 'Code', values: (r, n) => serials(r, n, 'P', r.int(11, 60)) },
      { title: 'Item', values: (r, n) => r.sample(ITEMS, n) },
      { title: 'Price', values: (r, n) => repeat(n, () => String(r.multiple(20, 900, 10))) },
      { title: 'Stock', values: (r, n) => repeat(n, () => String(r.int(0, 250))) },
      { title: 'Unit', values: (r, n) => repeat(n, () => r.pick(['piece', 'pack', 'box'])) },
      { title: 'Shelf', values: (r, n) => repeat(n, () => `S${r.int(1, 9)}`) },
    ],
  },
];

// ---------------------------------------------------------------------------
// One-to-many links (foreign keys)
// ---------------------------------------------------------------------------

interface Link {
  parent: string;
  /** Primary key of the parent; the same attribute is the foreign key in the child. */
  key: string;
  parentAttrs: readonly string[];
  child: string;
  childKey: string;
  childAttrs: readonly [string, string];
  /** Business rule, lower-case start: "each department has many employees and ...". */
  rule: string;
}

const LINKS: readonly Link[] = [
  {
    parent: 'DEPARTMENT', key: 'DeptID', parentAttrs: ['DeptName', 'Location'],
    child: 'EMPLOYEE', childKey: 'EmpID', childAttrs: ['EmpName', 'Salary'],
    rule: 'each department has many employees and each employee works in exactly one department',
  },
  {
    parent: 'CUSTOMER', key: 'CustomerID', parentAttrs: ['CustomerName', 'Phone'],
    child: 'ORDERS', childKey: 'OrderNo', childAttrs: ['OrderDate', 'Amount'],
    rule: 'a customer can place many orders and each order is placed by exactly one customer',
  },
  {
    parent: 'CLASS', key: 'ClassID', parentAttrs: ['ClassName', 'Room'],
    child: 'STUDENT', childKey: 'RollNo', childAttrs: ['StudentName', 'Age'],
    rule: 'each class has many students and each student is in exactly one class',
  },
  {
    parent: 'PUBLISHER', key: 'PublisherID', parentAttrs: ['PublisherName', 'City'],
    child: 'BOOK', childKey: 'ISBN', childAttrs: ['Title', 'Price'],
    rule: 'a publisher publishes many books and each book has exactly one publisher',
  },
  {
    parent: 'BRANCH', key: 'BranchCode', parentAttrs: ['BranchName', 'City'],
    child: 'ACCOUNT', childKey: 'AccountNo', childAttrs: ['AccountTitle', 'Balance'],
    rule: 'a branch holds many accounts and each account is held at exactly one branch',
  },
  {
    parent: 'CATEGORY', key: 'CategoryID', parentAttrs: ['CategoryName'],
    child: 'PRODUCT', childKey: 'ProductID', childAttrs: ['ProductName', 'Price'],
    rule: 'a category contains many products and each product belongs to exactly one category',
  },
  {
    parent: 'COUNTRY', key: 'CountryCode', parentAttrs: ['CountryName', 'Continent'],
    child: 'CITY', childKey: 'CityID', childAttrs: ['CityName', 'Population'],
    rule: 'a country has many cities and each city lies in exactly one country',
  },
  {
    parent: 'TEAM', key: 'TeamID', parentAttrs: ['TeamName', 'Coach'],
    child: 'PLAYER', childKey: 'PlayerID', childAttrs: ['PlayerName', 'Age'],
    rule: 'a team has many players and each player plays for exactly one team',
  },
  {
    parent: 'HOSTEL', key: 'HostelID', parentAttrs: ['HostelName', 'Warden'],
    child: 'RESIDENT', childKey: 'RegNo', childAttrs: ['ResidentName', 'Program'],
    rule: 'a hostel has many residents and each resident lives in exactly one hostel',
  },
  {
    parent: 'AIRLINE', key: 'AirlineCode', parentAttrs: ['AirlineName', 'Country'],
    child: 'FLIGHT', childKey: 'FlightNo', childAttrs: ['Origin', 'Destination'],
    rule: 'an airline operates many flights and each flight is operated by exactly one airline',
  },
  {
    parent: 'DOCTOR', key: 'DoctorID', parentAttrs: ['DoctorName', 'Speciality'],
    child: 'APPOINTMENT', childKey: 'AppointmentNo', childAttrs: ['AppointmentDate', 'PatientName'],
    rule: 'a doctor has many appointments and each appointment is with exactly one doctor',
  },
  {
    parent: 'PROVINCE', key: 'ProvinceCode', parentAttrs: ['ProvinceName', 'Capital'],
    child: 'DISTRICT', childKey: 'DistrictID', childAttrs: ['DistrictName', 'Area'],
    rule: 'a province has many districts and each district lies in exactly one province',
  },
];

// ---------------------------------------------------------------------------
// Relationship types of entity pairs (common-sense, unambiguous cardinalities)
// ---------------------------------------------------------------------------

type Cardinality = '1:1' | '1:M' | 'M:N';
const CARDINALITY_NAME: Readonly<Record<Cardinality, string>> = {
  '1:1': 'one-to-one',
  '1:M': 'one-to-many',
  'M:N': 'many-to-many',
};

interface EntityPair {
  /** For 1:M pairs, `a` is always the "one" side, so the pair reads one-to-many. */
  a: string;
  b: string;
  kind: Cardinality;
  why: string;
}

const ENTITY_PAIRS: readonly EntityPair[] = [
  { a: 'College', b: 'Principal', kind: '1:1', why: 'a college has one principal and a principal heads one college' },
  { a: 'Car', b: 'Engine', kind: '1:1', why: 'a car has one engine and an engine is fitted in one car' },
  { a: 'Citizen', b: 'CNIC card', kind: '1:1', why: 'a citizen holds one CNIC card and a CNIC card belongs to one citizen' },
  { a: 'Person', b: 'Birth certificate', kind: '1:1', why: 'a person has one birth certificate and a birth certificate is issued for one person' },
  { a: 'Country', b: 'City', kind: '1:M', why: 'a country has many cities but a city lies in one country' },
  { a: 'Mother', b: 'Child', kind: '1:M', why: 'a mother can have many children but a child has one (biological) mother' },
  { a: 'Customer', b: 'Order', kind: '1:M', why: 'a customer places many orders but an order is placed by one customer' },
  { a: 'Building', b: 'Room', kind: '1:M', why: 'a building has many rooms but a room is in one building' },
  { a: 'Province', b: 'District', kind: '1:M', why: 'a province has many districts but a district lies in one province' },
  // Author-Book and Teacher-Student are left out: many textbooks present them as one-to-many
  // ("an author writes many books", "a teacher teaches many students").
  { a: 'Student', b: 'Course', kind: 'M:N', why: 'a student takes many courses and a course has many students' },
  { a: 'Actor', b: 'Film', kind: 'M:N', why: 'an actor appears in many films and a film has many actors' },
  { a: 'Order', b: 'Product', kind: 'M:N', why: 'an order contains many products and a product appears in many orders' },
  { a: 'Passenger', b: 'Flight', kind: 'M:N', why: 'a passenger takes many flights and a flight carries many passengers' },
  { a: 'Player', b: 'Tournament', kind: 'M:N', why: 'a player takes part in many tournaments and a tournament has many players' },
];

const pairName = (p: EntityPair): string => `${p.a} and ${p.b}`;
const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// Normal forms from stated functional dependencies
// ---------------------------------------------------------------------------

/** 0 = not in 1NF; otherwise the highest of 1NF/2NF/3NF the relation satisfies. */
type NormalForm = 0 | 1 | 2 | 3;

const NF_OPTION: Readonly<Record<NormalForm, string>> = {
  0: 'not in 1NF',
  1: 'in 1NF but not in 2NF',
  2: 'in 2NF but not in 3NF',
  3: 'in 3NF',
};

interface NfCase {
  nf: NormalForm;
  /** Schema with the primary key underlined. */
  schema: string;
  fds: readonly string[];
  /** Only for nf = 0: describes the non-atomic field. */
  listNote?: string;
  why: string;
}

const NF_CASES: readonly NfCase[] = [
  // A field holding a list: not in 1NF.
  {
    nf: 0,
    schema: 'STUDENT(__RollNo__, Name, Subjects)',
    fds: ['RollNo → Name, Subjects'],
    listNote: 'A single Subjects value stores a list such as "Physics, Chemistry, Maths".',
    why: 'Subjects holds a list of values in one field (a repeating group). 1NF requires every field to hold a single atomic value, so the relation is not in 1NF; storing one subject per row in a separate table would fix it.',
  },
  {
    nf: 0,
    schema: 'CUSTOMER(__CustomerID__, Name, PhoneNumbers)',
    fds: ['CustomerID → Name, PhoneNumbers'],
    listNote: 'One PhoneNumbers value may hold several numbers, such as "0300-1234567, 0321-7654321".',
    why: 'PhoneNumbers can hold several numbers in one field, so the value is not atomic (a repeating group). That breaks the basic 1NF rule, so the relation is not in 1NF.',
  },
  {
    nf: 0,
    schema: 'EMPLOYEE(__EmpID__, Name, Skills)',
    fds: ['EmpID → Name, Skills'],
    listNote: 'The Skills value of a row holds a list such as "C, Java, SQL".',
    why: 'Skills stores a list of values in one field, so it is not atomic. 1NF forbids such repeating groups, so the relation is not in 1NF.',
  },
  {
    nf: 0,
    schema: 'ORDERS(__OrderNo__, OrderDate, Items)',
    fds: ['OrderNo → OrderDate, Items'],
    listNote: 'The Items value of an order holds a list such as "Pen, Ruler, Eraser".',
    why: 'Items keeps several products in one field, so the value is not atomic (a repeating group). 1NF requires a single value in every field, so the relation is not in 1NF; each item belongs in its own row of an order-line table.',
  },
  // Partial dependency on part of a composite key: 1NF only.
  {
    nf: 1,
    schema: 'ENROLMENT(__RegNo__, __CourseCode__, StudentName, Grade)',
    fds: ['(RegNo, CourseCode) → Grade', 'RegNo → StudentName'],
    why: 'The key is the composite (RegNo, CourseCode), but StudentName depends on RegNo alone, which is only part of the key. This partial dependency violates 2NF. All values are atomic, so the relation is in 1NF only.',
  },
  {
    nf: 1,
    schema: 'ORDER_ITEM(__OrderNo__, __ProductCode__, ProductName, Quantity)',
    fds: ['(OrderNo, ProductCode) → Quantity', 'ProductCode → ProductName'],
    why: 'The key is the composite (OrderNo, ProductCode), but ProductName depends on ProductCode alone, which is only part of the key. This partial dependency violates 2NF, so the relation is in 1NF only.',
  },
  {
    nf: 1,
    schema: 'WORKS_ON(__EmpID__, __ProjectID__, EmpName, Hours)',
    fds: ['(EmpID, ProjectID) → Hours', 'EmpID → EmpName'],
    why: 'The key is the composite (EmpID, ProjectID), but EmpName depends on EmpID alone, which is only part of the key. This partial dependency violates 2NF, so the relation is in 1NF only.',
  },
  {
    nf: 1,
    schema: 'RESULT(__RollNo__, __SubjectCode__, SubjectTitle, Marks)',
    fds: ['(RollNo, SubjectCode) → Marks', 'SubjectCode → SubjectTitle'],
    why: 'The key is the composite (RollNo, SubjectCode), but SubjectTitle depends on SubjectCode alone, which is only part of the key. This partial dependency violates 2NF, so the relation is in 1NF only.',
  },
  {
    nf: 1,
    schema: 'TEACHES(__TeacherID__, __ClassID__, TeacherName, Periods)',
    fds: ['(TeacherID, ClassID) → Periods', 'TeacherID → TeacherName'],
    why: 'The key is the composite (TeacherID, ClassID), but TeacherName depends on TeacherID alone, which is only part of the key. This partial dependency violates 2NF, so the relation is in 1NF only.',
  },
  {
    nf: 1,
    schema: 'SUPPLY(__SupplierID__, __PartNo__, SupplierCity, Quantity)',
    fds: ['(SupplierID, PartNo) → Quantity', 'SupplierID → SupplierCity'],
    why: 'The key is the composite (SupplierID, PartNo), but SupplierCity depends on SupplierID alone, which is only part of the key. This partial dependency violates 2NF, so the relation is in 1NF only.',
  },
  {
    nf: 1,
    schema: 'ATTENDANCE(__RollNo__, __LectureDate__, StudentName, Status)',
    fds: ['(RollNo, LectureDate) → Status', 'RollNo → StudentName'],
    why: 'The key is the composite (RollNo, LectureDate), but StudentName depends on RollNo alone, which is only part of the key. This partial dependency violates 2NF, so the relation is in 1NF only.',
  },
  // Transitive dependency through a non-key attribute: 2NF only.
  {
    nf: 2,
    schema: 'EMPLOYEE(__EmpID__, EmpName, DeptID, DeptName)',
    fds: ['EmpID → EmpName, DeptID', 'DeptID → DeptName'],
    why: 'The key EmpID is a single attribute, so no partial dependency is possible and the relation is in 2NF. However, DeptName depends on the key only through the non-key attribute DeptID (EmpID → DeptID → DeptName). This transitive dependency violates 3NF.',
  },
  {
    nf: 2,
    schema: 'STUDENT(__RegNo__, Name, HostelNo, HostelWarden)',
    fds: ['RegNo → Name, HostelNo', 'HostelNo → HostelWarden'],
    why: 'The key RegNo is a single attribute, so there is no partial dependency and the relation is in 2NF. However, HostelWarden depends on the key only through the non-key attribute HostelNo (RegNo → HostelNo → HostelWarden). This transitive dependency violates 3NF.',
  },
  {
    nf: 2,
    schema: 'BOOK(__ISBN__, Title, PublisherID, PublisherCity)',
    fds: ['ISBN → Title, PublisherID', 'PublisherID → PublisherCity'],
    why: 'The key ISBN is a single attribute, so there is no partial dependency and the relation is in 2NF. However, PublisherCity depends on the key only through the non-key attribute PublisherID (ISBN → PublisherID → PublisherCity). This transitive dependency violates 3NF.',
  },
  {
    nf: 2,
    schema: 'ORDERS(__OrderNo__, OrderDate, CustomerID, CustomerPhone)',
    fds: ['OrderNo → OrderDate, CustomerID', 'CustomerID → CustomerPhone'],
    why: 'The key OrderNo is a single attribute, so there is no partial dependency and the relation is in 2NF. However, CustomerPhone depends on the key only through the non-key attribute CustomerID (OrderNo → CustomerID → CustomerPhone). This transitive dependency violates 3NF.',
  },
  {
    nf: 2,
    schema: 'PATIENT(__PatientID__, PatientName, WardNo, WardFloor)',
    fds: ['PatientID → PatientName, WardNo', 'WardNo → WardFloor'],
    why: 'The key PatientID is a single attribute, so there is no partial dependency and the relation is in 2NF. However, WardFloor depends on the key only through the non-key attribute WardNo (PatientID → WardNo → WardFloor). This transitive dependency violates 3NF.',
  },
  {
    nf: 2,
    schema: 'ACCOUNT(__AccountNo__, Balance, BranchCode, BranchCity)',
    fds: ['AccountNo → Balance, BranchCode', 'BranchCode → BranchCity'],
    why: 'The key AccountNo is a single attribute, so there is no partial dependency and the relation is in 2NF. However, BranchCity depends on the key only through the non-key attribute BranchCode (AccountNo → BranchCode → BranchCity). This transitive dependency violates 3NF.',
  },
  {
    nf: 2,
    schema: 'CITY(__CityID__, CityName, ProvinceCode, ProvinceName)',
    fds: ['CityID → CityName, ProvinceCode', 'ProvinceCode → ProvinceName'],
    why: 'The key CityID is a single attribute, so there is no partial dependency and the relation is in 2NF. However, ProvinceName depends on the key only through the non-key attribute ProvinceCode (CityID → ProvinceCode → ProvinceName). This transitive dependency violates 3NF.',
  },
  // Every non-key attribute depends on the key, the whole key and nothing but the key: 3NF.
  {
    nf: 3,
    schema: 'BOOK(__ISBN__, Title, Price, Pages)',
    fds: ['ISBN → Title, Price, Pages'],
    why: 'Every non-key attribute depends directly on the single-attribute key ISBN and on nothing else. There is no partial and no transitive dependency, so the relation is in 3NF.',
  },
  {
    nf: 3,
    schema: 'MARKS(__RollNo__, __SubjectCode__, Marks)',
    fds: ['(RollNo, SubjectCode) → Marks'],
    why: 'The only non-key attribute, Marks, depends on the whole composite key (RollNo, SubjectCode) and on nothing else. There is no partial and no transitive dependency, so the relation is in 3NF.',
  },
  {
    nf: 3,
    schema: 'EMPLOYEE(__EmpID__, EmpName, Salary, DeptID)',
    fds: ['EmpID → EmpName, Salary, DeptID'],
    why: 'Every non-key attribute depends directly on the key EmpID, and no non-key attribute determines another. There is no partial and no transitive dependency, so the relation is in 3NF.',
  },
  {
    nf: 3,
    schema: 'CUSTOMER(__CustomerID__, Name, Phone, City)',
    fds: ['CustomerID → Name, Phone, City'],
    why: 'Every non-key attribute depends directly on the key CustomerID and on nothing else. There is no partial and no transitive dependency, so the relation is in 3NF.',
  },
  {
    nf: 3,
    schema: 'COURSE(__CourseCode__, Title, CreditHours)',
    fds: ['CourseCode → Title, CreditHours'],
    why: 'Both non-key attributes depend directly on the key CourseCode and on nothing else. There is no partial and no transitive dependency, so the relation is in 3NF.',
  },
  {
    nf: 3,
    schema: 'ACCOUNT(__AccountNo__, AccountTitle, Balance, BranchCode)',
    fds: ['AccountNo → AccountTitle, Balance, BranchCode'],
    why: 'Every non-key attribute depends directly on the key AccountNo, and no non-key attribute determines another. There is no partial and no transitive dependency, so the relation is in 3NF.',
  },
];

// ---------------------------------------------------------------------------
// MS Access `Like` wildcards: * (any run of characters), ? (one character), # (one digit)
// ---------------------------------------------------------------------------

/** Access `Like` semantics (case-insensitive, as with Option Compare Database). */
function likeMatches(value: string, pattern: string): boolean {
  let source = '';
  for (const ch of pattern) {
    if (ch === '*') source += '.*';
    else if (ch === '?') source += '.';
    else if (ch === '#') source += '[0-9]';
    else source += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`, 'i').test(value);
}

const LIKE_CITIES: readonly string[] = [
  'Abbottabad', 'Attock', 'Bahawalpur', 'Badin', 'Bannu', 'Chakwal', 'Chiniot', 'Chitral', 'Dadu',
  'Faisalabad', 'Gilgit', 'Gujranwala', 'Gujrat', 'Gwadar', 'Haripur', 'Hunza', 'Hyderabad', 'Islamabad',
  'Jhang', 'Jhelum', 'Karachi', 'Kasur', 'Kohat', 'Kotli', 'Lahore', 'Larkana', 'Layyah', 'Mansehra',
  'Mardan', 'Mirpur', 'Multan', 'Murree', 'Nowshera', 'Okara', 'Peshawar', 'Quetta', 'Rawalpindi',
  'Sahiwal', 'Sargodha', 'Sialkot', 'Sibi', 'Skardu', 'Sukkur', 'Swat', 'Taxila', 'Thatta', 'Turbat',
  'Vehari', 'Wazirabad', 'Zhob',
];

const CITY_RULES = ['start', 'end', 'second', 'third', 'first-last', 'length', 'contains'] as const;
type CityRuleKind = (typeof CITY_RULES)[number];

interface LikeRule {
  pattern: string;
  /** Completes "selects values that ...". */
  meaning: string;
  /** Near misses: values that look as if they might fit. */
  trap: (v: string) => boolean;
  /** Why a value that does not match fails. */
  fails: (v: string) => string;
  /** When every failure has the same reason, the shared predicate ("do not contain ..."). */
  failAll?: string;
}

/** A pattern that the city `w` satisfies. */
function cityRule(kind: CityRuleKind, w: string, r: Rng): LikeRule {
  const low = (v: string): string => v.toLowerCase();
  switch (kind) {
    case 'start': {
      const x = w.charAt(0);
      return {
        pattern: `${x}*`,
        meaning: `begin with "${x}"`,
        trap: (v) => low(v).slice(1).includes(low(x)),
        fails: (v) => `${v} begins with "${v.charAt(0)}"`,
      };
    }
    case 'end': {
      const tail = w.slice(-2);
      return {
        pattern: `*${tail}`,
        meaning: `end with "${tail}"`,
        trap: (v) => v.endsWith(tail.charAt(1)) || low(v).includes(tail),
        fails: (v) => `${v} ends with "${v.slice(-2)}"`,
      };
    }
    case 'second': {
      const x = w.charAt(1);
      return {
        pattern: `?${x}*`,
        meaning: `have "${x}" as the second character`,
        trap: (v) => low(v).charAt(0) === x || low(v).charAt(2) === x,
        fails: (v) => `the second character of ${v} is "${v.charAt(1)}"`,
      };
    }
    case 'third': {
      const x = w.charAt(2);
      return {
        pattern: `??${x}*`,
        meaning: `have "${x}" as the third character`,
        trap: (v) => [0, 1, 3].some((i) => low(v).charAt(i) === x),
        fails: (v) => `the third character of ${v} is "${v.charAt(2)}"`,
      };
    }
    case 'first-last': {
      const x = w.charAt(0);
      const y = w.slice(-1);
      return {
        pattern: `${x}*${y}`,
        meaning: `begin with "${x}" and end with "${y}"`,
        trap: (v) => v.startsWith(x) || v.endsWith(y),
        fails: (v) => `${v} begins with "${v.charAt(0)}" and ends with "${v.slice(-1)}"`,
      };
    }
    case 'length': {
      const x = w.charAt(0);
      return {
        pattern: x + '?'.repeat(w.length - 1),
        meaning: `begin with "${x}" and have exactly ${w.length} characters`,
        trap: (v) => v.startsWith(x) || v.length === w.length,
        fails: (v) => `${v} has ${v.length} characters and begins with "${v.charAt(0)}"`,
      };
    }
    case 'contains': {
      const i = r.int(1, w.length - 3);
      const part = w.slice(i, i + 2);
      return {
        pattern: `*${part}*`,
        meaning: `contain "${part}" anywhere`,
        trap: (v) => low(v).includes(part.charAt(0)) && low(v).includes(part.charAt(1)),
        fails: (v) => `${v} does not contain "${part}"`,
        failAll: `do not contain "${part}"`,
      };
    }
  }
}

const CODE_LETTERS: readonly string[] = [...'ABCDEFGHJKLMNPRSTUVWXYZ'];

/** A product-code pattern and one code that satisfies it. */
function codeCase(r: Rng): { pattern: string; answer: string; meaning: string } {
  const kind = r.pick(['L##', 'L#?', 'L*#', '?L#'] as const);
  const lead = r.pick(CODE_LETTERS);
  const others = CODE_LETTERS.filter((c) => c !== lead);
  const digit = (): string => String(r.int(0, 9));
  const letter = (): string => r.pick(others);
  switch (kind) {
    case 'L##':
      return { pattern: `${lead}##`, answer: lead + digit() + digit(), meaning: `consist of "${lead}" followed by exactly two digits` };
    case 'L#?':
      return { pattern: `${lead}#?`, answer: lead + digit() + letter(), meaning: `consist of "${lead}", then one digit, then any one character` };
    case 'L*#':
      return { pattern: `${lead}*#`, answer: lead + letter() + digit() + digit(), meaning: `begin with "${lead}" and end with a digit` };
    case '?L#':
      return { pattern: `?${lead}#`, answer: letter() + lead + digit(), meaning: `have exactly three characters: any character, then "${lead}", then a digit` };
  }
}

/** Near-miss codes: swapped neighbours, a digit/letter switched, one character added or removed. */
function codeMutations(r: Rng, code: string): string[] {
  const chars = [...code];
  const out: string[] = [];
  for (let i = 0; i + 1 < chars.length; i++) {
    const c = [...chars];
    const tmp = c[i];
    c[i] = c[i + 1];
    c[i + 1] = tmp;
    out.push(c.join(''));
  }
  chars.forEach((ch, i) => {
    const c = [...chars];
    c[i] = /\d/.test(ch) ? r.pick(CODE_LETTERS) : String(r.int(0, 9));
    out.push(c.join(''));
  });
  out.push(code + String(r.int(0, 9)), code + r.pick(CODE_LETTERS), code.slice(0, -1));
  out.push(r.pick(CODE_LETTERS.filter((l) => l !== code.charAt(0))) + code.slice(1));
  return out;
}

/** Why a code that does not match `pattern` fails it. */
function codeReason(value: string, pattern: string): string {
  const star = pattern.indexOf('*');
  if (star >= 0) {
    const head = pattern.slice(0, star);
    const tail = pattern.slice(star + 1);
    if (!likeMatches(value.slice(0, head.length), head)) return `${value} does not begin with "${head}"`;
    if (!likeMatches(value.slice(value.length - tail.length), tail)) {
      return tail === '#' ? `${value} does not end with a digit` : `${value} does not end with "${tail}"`;
    }
    return `${value} does not fit the pattern`;
  }
  if (value.length !== pattern.length) return `${value} has ${value.length} characters instead of ${pattern.length}`;
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern.charAt(i);
    const ch = value.charAt(i);
    if (p === '#' && !/\d/.test(ch)) return `${value} has the letter "${ch}" where a digit is required`;
    if (p !== '#' && p !== '?' && p.toUpperCase() !== ch.toUpperCase()) return `${value} has "${ch}" where "${p}" is required`;
  }
  return `${value} does not fit the pattern`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export default defineBank('computer', 'databases', (b) => [
  b.dynamic('file-size-from-records', { difficulty: 2, tags: ['data and information'] }, (r) => {
    if (r.chance(0.6)) {
      // Size of a file from its record layout (character -> field -> record -> file).
      const chosen = r.sample(RECORD_FIELDS, r.int(3, 4));
      const fields = RECORD_FIELDS.filter((f) => chosen.includes(f));
      const sizes = fields.map((f) => r.pick(f.sizes));
      const recordSize = sum(sizes);
      const k = r.int(1, 8);
      const records = 1024 * k;
      const bytes = records * recordSize;
      const kb = k * recordSize;
      const { answer, distractors } = numericOptions(r, {
        correct: kb,
        // forgot to divide by 1024; multiplied by 8 (bits); used 1 KB = 1000 bytes; divided by 8
        wrong: r.shuffle([bytes, 8 * kb, bytes / 1000, kb / 8]),
        format: kb$,
      });
      const layout = listText(fields.map((f, i) => `${f.name} (${sizes[i]} characters)`));
      return {
        stem: tex`A data file holds ${records} fixed-length records. Each record has the fields ${layout}. If one character occupies one byte and $1\,\mathrm{KB} = 1024$ bytes, the size of the file is:`,
        answer,
        distractors,
        explanation: tex`Record size $= ${sizes.join(' + ')} = ${recordSize}$ bytes. File size $= ${records} \times ${recordSize} = ${grp(bytes)}$ bytes $= \frac{${grp(bytes)}}{1024}\,\mathrm{KB} = ${grp(kb)}\,\mathrm{KB}$.`,
      };
    }
    // Number of records from the file size and the record size.
    const recordSize = r.pick([32, 40, 48, 64, 80, 96, 128, 160, 256]);
    const g = gcd(recordSize, 1024);
    const kbStep = recordSize / g; // the file size in KB is a multiple of this
    const recordStep = 1024 / g; // ... and the record count a multiple of this
    const m = r.int(
      Math.max(Math.ceil(16 / kbStep), Math.ceil(256 / recordStep)),
      Math.min(Math.floor(512 / kbStep), Math.floor(8192 / recordStep)),
    );
    const records = recordStep * m;
    const fileKb = kbStep * m;
    const { answer, distractors } = numericOptions(r, {
      correct: records,
      // used 1 KB = 1000 bytes; converted the file size to bits; converted the record size to bits
      wrong: r.shuffle([Math.round((1000 * fileKb) / recordSize), 8 * records, records / 8].filter(Number.isInteger)),
      format: (x) => `$${grp(x)}$`,
    });
    return {
      stem: tex`A data file of size $${fileKb}\,\mathrm{KB}$ stores fixed-length records of ${recordSize} bytes each. Taking $1\,\mathrm{KB} = 1024$ bytes, the number of records in the file is:`,
      answer,
      distractors,
      explanation: tex`Number of records $= \frac{\text{file size in bytes}}{\text{record size}} = \frac{${fileKb} \times 1024}{${recordSize}} = \frac{${grp(fileKb * 1024)}}{${recordSize}} = ${grp(records)}$.`,
    };
  }),

  b.dynamic('degree-and-cardinality', { difficulty: 1, tags: ['DBMS concepts'] }, (r) => {
    const rel = r.pick(RELATIONS);
    const degree = r.int(3, 6);
    // Keep rows and columns at least 2 apart so no two options coincide.
    const tuples = r.intExcept(2, 8, [degree - 1, degree, degree + 1]);
    const extra = r.sample(rel.columns.slice(1), degree - 1);
    const cols = [rel.columns[0], ...rel.columns.slice(1).filter((c) => extra.includes(c))];
    const data = cols.map((c) => c.values(r, tuples));
    const rows = Array.from({ length: tuples }, (_, i) => data.map((col) => col[i]));
    const intro = `The relation ${rel.name} is shown below.\n\n${pipeTable(cols.map((c) => c.title), rows)}\n\n`;
    const explanation = `The degree of a relation is its number of attributes (columns), here ${degree}. Its cardinality is its number of tuples (rows), here ${tuples}. The heading row only names the attributes, so it is not a tuple.`;
    const form = r.pick(['both', 'degree', 'cardinality'] as const);
    if (form === 'both') {
      const answer = `Degree ${degree}, cardinality ${tuples}`;
      return {
        stem: `${intro}The degree and the cardinality of this relation are:`,
        answer,
        // swapped the terms; counted the heading row as a tuple; both slips
        distractors: pickDistractors(answer, [
          `Degree ${tuples}, cardinality ${degree}`,
          `Degree ${degree}, cardinality ${tuples + 1}`,
          `Degree ${tuples + 1}, cardinality ${degree}`,
        ]),
        explanation,
      };
    }
    if (form === 'degree') {
      const answer = n$(degree);
      return {
        stem: `${intro}The degree of this relation is:`,
        answer,
        // counted rows; counted rows including the heading; counted cells
        distractors: pickDistractors(answer, [tuples, tuples + 1, degree * tuples].map((x) => n$(x))),
        explanation,
      };
    }
    const answer = n$(tuples);
    return {
      stem: `${intro}The cardinality of this relation is:`,
      answer,
      // counted columns; counted the heading row as a tuple; counted cells
      distractors: pickDistractors(answer, [degree, tuples + 1, degree * tuples].map((x) => n$(x))),
      explanation,
    };
  }),

  b.dynamic('foreign-key-in-schema', { difficulty: 2, tags: ['keys', 'relationships'] }, (r) => {
    const L = r.pick(LINKS);
    const parentSchema = `${L.parent}(__${L.key}__, ${L.parentAttrs.join(', ')})`;
    const childSchema = `${L.child}(__${L.childKey}__, ${L.childAttrs.join(', ')}, ${L.key})`;
    const shown = `Consider the following relations, in which primary keys are underlined:\n\n${parentSchema}\n${childSchema}\n\n`;
    const form = r.pick(['identify', 'reason', 'design'] as const);

    if (form === 'identify') {
      const plain = r.pick([`${L.parentAttrs[0]} in ${L.parent}`, `${r.pick(L.childAttrs)} in ${L.child}`]);
      const answer = `${L.key} in ${L.child}`;
      return {
        stem: `${shown}Which attribute is a foreign key?`,
        answer,
        distractors: pickDistractors(answer, [`${L.key} in ${L.parent}`, `${L.childKey} in ${L.child}`, plain]),
        explanation: `A foreign key is an attribute of one table whose values refer to the primary key of another table. ${L.key} in ${L.child} takes its values from ${L.key}, the primary key of ${L.parent}, so it is the foreign key (${L.rule}). ${L.key} in ${L.parent} and ${L.childKey} in ${L.child} are primary keys, and ${plain} is an ordinary non-key attribute.`,
      };
    }

    if (form === 'reason') {
      const answer = `refers to the primary key of ${L.parent}`;
      return {
        stem: `${shown}${L.key} in ${L.child} is a foreign key because it:`,
        answer,
        distractors: [
          `uniquely identifies each row of ${L.child}`,
          `must have a different value in every row of ${L.child}`,
          'is made up of two or more attributes',
        ],
        explanation: `A foreign key is an attribute whose values must match the primary key of another (related) table. ${L.key} in ${L.child} takes its values from ${L.key} of ${L.parent}. It does not identify the rows of ${L.child} (${L.childKey} does), it is a single attribute, and its values may repeat because ${L.rule}.`,
      };
    }

    const childBare = `${L.child}(__${L.childKey}__, ${L.childAttrs.join(', ')})`;
    const answer = `${L.key} to ${L.child} as a foreign key`;
    return {
      stem: `In a database, ${L.rule}. The two tables, with primary keys underlined, are:\n\n${parentSchema}\n${childBare}\n\nTo link these tables, the correct design is to add:`,
      answer,
      distractors: [
        `${L.childKey} to ${L.parent} as a foreign key`,
        `${L.key} to ${L.child} as its primary key`,
        `${L.childKey} to ${L.parent} as its primary key`,
      ],
      explanation: `In a one-to-many relationship, the primary key of the "one" side (${L.key} of ${L.parent}) is placed in the "many" side (${L.child}) as a foreign key. ${L.childKey} cannot go into ${L.parent}, because one ${L.parent} row would then need many ${L.childKey} values, and ${L.key} cannot be the primary key of ${L.child}, because many ${L.child} rows share the same ${L.key}.`,
    };
  }),

  b.dynamic('relationship-type-of-pair', { difficulty: 2, origin: 'past-paper', tags: ['relationships', 'ER modelling'] }, (r) => {
    if (r.chance(0.65)) {
      const kind = r.pick(['1:1', '1:M', 'M:N'] as const);
      const right = r.pick(ENTITY_PAIRS.filter((p) => p.kind === kind));
      const wrong = r.sample(ENTITY_PAIRS.filter((p) => p.kind !== kind), 3);
      return {
        stem: `Which pair of entities has a ${CARDINALITY_NAME[kind]} (${kind}) relationship?`,
        answer: pairName(right),
        distractors: wrong.map(pairName),
        explanation: `${capitalise(right.why)}, so ${pairName(right)} is ${CARDINALITY_NAME[kind]}. The other pairs are: ${wrong.map((p) => `${pairName(p)} (${p.kind})`).join('; ')}.`,
      };
    }
    // Name the type. Only 1:1 and M:N pairs are used here, so "one-to-many" and
    // "many-to-one" are both clearly wrong and the reading direction never matters.
    const pair = r.pick(ENTITY_PAIRS.filter((p) => p.kind !== '1:M'));
    const answer = CARDINALITY_NAME[pair.kind];
    return {
      stem: `In a database, the relationship between the entities **${pair.a}** and **${pair.b}** is:`,
      answer,
      distractors: ['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'].filter((o) => o !== answer),
      explanation: `${capitalise(pair.why)}, so the relationship is ${answer} (${pair.kind}).`,
    };
  }),

  b.dynamic('normal-form-of-relation', { difficulty: 3, tags: ['normalization'] }, (r) => {
    const nf = r.weighted<NormalForm>([0, 1, 2, 3], [1, 3, 3, 2]);
    const c = r.pick(NF_CASES.filter((x) => x.nf === nf));
    const fact = c.listNote ?? 'Every field holds a single (atomic) value.';
    const answer = NF_OPTION[nf];
    return {
      stem: `The relation ${c.schema} has its primary key underlined. ${fact} Its functional dependencies are listed below; no others hold except those implied by these.\n\n${c.fds.join('\n')}\n\nConsidering only 1NF, 2NF and 3NF, the relation is:`,
      answer,
      distractors: ([0, 1, 2, 3] as const).filter((x) => x !== nf).map((x) => NF_OPTION[x]),
      explanation: `${c.why}\n1NF: atomic values only. 2NF: 1NF and no partial dependency on part of a composite key. 3NF: 2NF and no transitive dependency (no non-key attribute determines another non-key attribute).`,
    };
  }),

  b.dynamic('access-like-wildcards', { difficulty: 2, tags: ['MS Access'] }, (r) => {
    if (r.chance(0.6)) {
      const w = r.pick(LIKE_CITIES);
      const kinds = CITY_RULES.filter((k) => k !== 'length' || w.length <= 6);
      const rule = cityRule(r.pick(kinds), w, r);
      const misses = LIKE_CITIES.filter((v) => v !== w && !likeMatches(v, rule.pattern));
      // Near misses first, then any other non-matching city.
      const pool = [...r.shuffle(misses.filter(rule.trap)), ...r.shuffle(misses.filter((v) => !rule.trap(v)))];
      const distractors = pickDistractors(w, pool);
      const misfits = rule.failAll ? `${listText(distractors)} ${rule.failAll}` : listText(distractors.map(rule.fails));
      return {
        stem: `In an MS Access query, the criterion \`Like "${rule.pattern}"\` is entered in the City column. Which city satisfies this criterion?`,
        answer: w,
        distractors,
        explanation: `In Access criteria, \`*\` stands for any number of characters (even none) and \`?\` for exactly one character. So \`Like "${rule.pattern}"\` selects values that ${rule.meaning}. ${w} fits, whereas ${misfits}.`,
      };
    }
    const { pattern, answer, meaning } = codeCase(r);
    const misses = [...new Set(codeMutations(r, answer))].filter((v) => v !== answer && !likeMatches(v, pattern));
    const distractors = pickDistractors(answer, r.shuffle(misses));
    return {
      stem: `A table stores product codes in a field named Code. Which code is selected by the MS Access criterion \`Like "${pattern}"\`?`,
      answer,
      distractors,
      explanation: `In Access criteria, \`#\` stands for exactly one digit, \`?\` for exactly one character and \`*\` for any number of characters. So \`Like "${pattern}"\` selects codes that ${meaning}. ${answer} fits, whereas ${listText(distractors.map((v) => codeReason(v, pattern)))}.`,
    };
  }),

  b.dynamic('access-query-record-count', { difficulty: 2, tags: ['MS Access'] }, (r) => {
    const names = r.sample(PEOPLE, 8);
    const form = r.pick(['between', 'and', 'or'] as const);

    if (form === 'between') {
      const lo = r.multiple(40, 60, 5);
      const hi = lo + r.pick([10, 15, 20, 25]);
      const inside = r.int(1, 3);
      const below = r.int(1, 5 - inside);
      const above = 6 - inside - below;
      // Both end values always occur, so treating Between as exclusive gives a different count.
      const marks = r.shuffle([
        lo,
        hi,
        ...repeat(inside, () => r.int(lo + 1, hi - 1)),
        ...repeat(below, () => r.int(30, lo - 1)),
        ...repeat(above, () => r.int(hi + 1, 99)),
      ]);
      const rows = names.map((name, i) => [name, r.pick(CITIES), String(marks[i])]);
      const hits = names.flatMap((name, i) => (marks[i] >= lo && marks[i] <= hi ? [`${name} (${marks[i]})`] : []));
      const correct = inside + 2;
      // excluded both end values; included only one end value; counted the records outside the range
      const { answer, distractors } = countOptions(correct, [inside, inside + 1, 8 - correct], 8);
      return {
        stem: `The table STUDENT is shown below.\n\n${pipeTable(['Name', 'City', 'Marks'], rows)}\n\nA query uses the criterion \`Between ${lo} And ${hi}\` in the Marks column. How many records will it return?`,
        answer,
        distractors,
        explanation: `\`Between ${lo} And ${hi}\` includes both end values, so it selects records with ${lo} ≤ Marks ≤ ${hi}: ${listText(hits)}. The query returns ${correct} records.`,
      };
    }

    const city = r.pick(CITIES);
    const otherCities = CITIES.filter((c) => c !== city);
    const x = r.multiple(50, 70, 5);
    const both = r.int(1, 3);
    const cityOnly = r.int(1, 2);
    const marksOnly = r.int(1, Math.min(3, 7 - both - cityOnly));
    const neither = 8 - both - cityOnly - marksOnly;
    const groups: Array<{ city: string; marks: number }> = [
      ...repeat(both, () => ({ city, marks: r.int(x, 99) })),
      ...repeat(cityOnly, () => ({ city, marks: r.int(30, x - 1) })),
      ...repeat(marksOnly, () => ({ city: r.pick(otherCities), marks: r.int(x, 99) })),
      ...repeat(neither, () => ({ city: r.pick(otherCities), marks: r.int(30, x - 1) })),
    ];
    // A record exactly on the boundary checks that >= includes it.
    if (r.chance(0.5)) groups[0] = { city, marks: x };
    const records = r.shuffle(groups).map((g, i) => ({ name: names[i], ...g }));
    const rows = records.map((rec) => [rec.name, rec.city, String(rec.marks)]);
    const cityCount = both + cityOnly;
    const marksCount = both + marksOnly;
    const orCount = both + cityOnly + marksOnly;
    const isAnd = form === 'and';
    const picked = records.filter((rec) => (isAnd ? rec.city === city && rec.marks >= x : rec.city === city || rec.marks >= x));
    const correct = isAnd ? both : orCount;
    // confused AND with OR; applied only the City criterion; applied only the Marks criterion
    const { answer, distractors } = countOptions(correct, [isAnd ? orCount : both, cityCount, marksCount], 8);
    const placement = isAnd ? 'in the **same** Criteria row of the Marks column' : 'in the **or** row of the Marks column';
    const rule = isAnd
      ? `Criteria typed in the same row are joined with AND, so a record must have City = "${city}" and Marks ≥ ${x}`
      : `Criteria typed in different rows (Criteria and or) are joined with OR, so a record is returned if City = "${city}" or Marks ≥ ${x}`;
    return {
      stem: `The table STUDENT is shown below.\n\n${pipeTable(['Name', 'City', 'Marks'], rows)}\n\nIn the query design grid, \`"${city}"\` is typed in the Criteria row of the City column and \`>=${x}\` ${placement}. How many records will the query return?`,
      answer,
      distractors,
      explanation: `${rule}. Matching records: ${listText(picked.map((rec) => `${rec.name} (${rec.city}, ${rec.marks})`))}. The query returns ${correct} record${correct === 1 ? '' : 's'}.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'information-from-data',
      d: 1,
      o: 'past-paper',
      t: ['data and information'],
      q: 'Data that has been processed and organised into a meaningful form is called:',
      a: 'Information',
      x: ['Raw facts', 'Metadata', 'Data dictionary'],
      e: 'Data are raw facts and figures. Processing them (sorting, calculating, summarising) produces information, which is meaningful and useful for decisions. Metadata is data about data, and the data dictionary is where a DBMS keeps that metadata.',
    },
    {
      id: 'database-administrator-role',
      d: 1,
      t: ['DBMS concepts'],
      q: 'The person responsible for the overall control of a database, including its security, backup and the granting of access rights, is the:',
      a: 'Database administrator (DBA)',
      x: ['Application programmer', 'End user', 'Data entry operator'],
      e: 'The database administrator (DBA) manages the database as a whole: defining its structure, granting and revoking access rights, enforcing security and integrity, and planning backup and recovery. Application programmers write programs that use the database, while end users and data entry operators only work with the data.',
    },
    {
      id: 'composite-primary-key',
      d: 2,
      t: ['keys'],
      q: 'In the relation MARKS(RollNo, SubjectCode, Marks), each student gets one mark in each subject, so a RollNo repeats for every subject and a SubjectCode repeats for every student. The primary key of MARKS should be:',
      a: '(RollNo, SubjectCode) together',
      x: ['RollNo alone', 'SubjectCode alone', '(RollNo, Marks) together'],
      e: 'Neither RollNo nor SubjectCode is unique on its own, but each (RollNo, SubjectCode) pair occurs exactly once, so the two together form a composite primary key. (RollNo, Marks) fails because a student can score the same marks in two subjects.',
    },
    {
      id: 'candidate-and-super-keys',
      d: 3,
      t: ['keys'],
      q: 'Which statement about keys in a relational database is correct?',
      a: 'Every candidate key is a super key, but not every super key is a candidate key.',
      x: [
        'Every super key is a candidate key, but not every candidate key is a super key.',
        'A relation can have only one candidate key.',
        'A foreign key must have a different value in every row of its table.',
      ],
      e: 'A super key is any set of attributes that identifies each tuple uniquely; a candidate key is a minimal super key (no attribute can be dropped). So every candidate key is a super key, but a super key such as (RegNo, Name) is not minimal and is not a candidate key. A relation can have several candidate keys (for example RegNo and CNIC), and foreign key values may repeat, as when many employees share one DeptID.',
    },
    {
      id: 'referential-integrity-blocks',
      d: 2,
      t: ['relationships', 'MS Access'],
      q: 'In MS Access, the tables DEPARTMENT and EMPLOYEE are related on DeptID with **Enforce Referential Integrity** switched on. Which action does referential integrity block?',
      a: 'Adding an employee with a DeptID value that is not in DEPARTMENT',
      x: [
        'Adding a department that has no employees yet',
        'Assigning two employees to the same existing department',
        'Leaving the Salary of a new employee blank',
      ],
      e: 'Referential integrity requires every foreign key value (EMPLOYEE.DeptID) to match an existing primary key value in DEPARTMENT, so Access rejects an employee whose DeptID does not exist there (an orphan record). A department with no employees, or many employees in one department, is allowed, and a blank Salary has nothing to do with the relationship.',
    },
    {
      id: 'erd-relationship-diamond',
      d: 1,
      o: 'past-paper',
      t: ['ER modelling'],
      q: 'In an entity-relationship (ER) diagram drawn in Chen notation, a relationship between entities is shown by a:',
      a: 'Diamond',
      x: ['Rectangle', 'Ellipse', 'Double rectangle'],
      e: 'In Chen notation an entity is a rectangle, an attribute is an ellipse (oval) and a relationship is a diamond; a double rectangle marks a weak entity.',
    },
    {
      id: 'second-normal-form-rule',
      d: 2,
      o: 'past-paper',
      t: ['normalization'],
      q: 'A relation is in second normal form (2NF) if it is in 1NF and:',
      a: 'every non-key attribute depends on the whole primary key',
      x: [
        'no non-key attribute depends on another non-key attribute',
        'every field holds a single atomic value',
        'it has no more than one candidate key',
      ],
      e: '2NF removes partial dependencies: no non-key attribute may depend on only part of a composite primary key. Atomic values are the 1NF condition, and removing dependencies between non-key attributes (transitive dependencies) is the step from 2NF to 3NF.',
    },
    {
      id: 'access-text-field-limit',
      d: 1,
      o: 'past-paper',
      t: ['MS Access'],
      q: 'The maximum number of characters that a Text (Short Text) field can hold in MS Access is:',
      a: '255',
      x: ['256', '50', '65,535'],
      e: 'A Text field (called Short Text from Access 2013 onwards) holds at most 255 characters. 50 was only its default Field Size in older versions, and 65,535 characters is the limit of a Memo (Long Text) field when text is typed in.',
    },
    {
      id: 'data-redundancy-term',
      d: 1,
      o: 'past-paper',
      t: ['DBMS concepts'],
      q: 'Storing the same data in more than one place, for example a student\'s address in both the admissions file and the library file, is called:',
      a: 'Data redundancy',
      x: ['Data integrity', 'Data independence', 'Data security'],
      e: 'Unnecessary duplication of data is data redundancy. It wastes storage and can lead to inconsistency when only one copy is updated; a DBMS reduces it by keeping shared data in one place. Integrity is the accuracy and consistency of data, independence means programs are unaffected by changes in how data is stored, and security is protection from unauthorised access.',
    },
    {
      id: 'primary-key-properties',
      d: 1,
      t: ['keys'],
      q: 'The values of a primary key field must be:',
      a: 'unique and never empty (null)',
      x: ['unique, but may be empty (null)', 'never empty, but may repeat', 'numbers in increasing order'],
      e: 'A primary key identifies each record, so no two records may share a value (uniqueness) and no record may leave it empty (no null values). Its values need not be numbers: a code such as "CS101" or a CNIC number stored as text can be a primary key.',
    },
    {
      id: 'attribute-domain-term',
      d: 1,
      t: ['DBMS concepts'],
      q: 'In a relational database, the set of all values that an attribute is allowed to take (for example, the letters A to F for Grade) is called the attribute\'s:',
      a: 'Domain',
      x: ['Degree', 'Cardinality', 'Tuple'],
      e: 'The domain of an attribute is the pool of permitted values. Degree is the number of attributes of a relation, cardinality is its number of tuples, and a tuple is a single row.',
    },
    {
      id: 'access-autonumber-type',
      d: 1,
      t: ['MS Access'],
      q: 'In MS Access, which data type automatically gives each new record a unique number that the user cannot edit?',
      a: 'AutoNumber',
      x: ['Number', 'Currency', 'Yes/No'],
      e: 'An AutoNumber field is filled in by Access itself (usually 1, 2, 3, ...) when a record is added, and it cannot be changed, so it is often used as a primary key. A Number field holds values that the user types, Currency holds money amounts, and Yes/No holds only two values.',
    },
  ]),
]);
