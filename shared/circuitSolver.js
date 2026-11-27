// A DC circuit solver for the interactive physics book (modified nodal
// analysis). The same circuit description drives the experiment overlays,
// the CircuitJS export, and the tests that check the book's worked examples.
//
// circuit = {
//   points: { name: [x, y] },          // positions as fractions of the figure (0..1)
//   parts: [{ id, type, from, to, via?, R?, emf?, r?, closed? }]
// }
// Types:
//   wire, ammeter, galvanometer  zero resistance; their current is reported
//   resistor, lamp               R ohms
//   battery                      emf volts with internal resistance r; `to` is the + terminal
//   switch                       conducts only when closed
//   voltmeter                    draws no current; read it with reading()
// Every current is reported from `from` to `to` (for a battery, out of its + terminal).

const conducting = (part) => part.type !== "voltmeter" && !(part.type === "switch" && !part.closed);
const isSource = (part) => ["wire", "ammeter", "galvanometer", "battery", "switch"].includes(part.type);

function find(parent, x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }

// Gaussian elimination with partial pivoting. Returns null when singular.
function solveLinear(A, b) {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(A[row][col]) > Math.abs(A[pivot][col])) pivot = row;
    if (Math.abs(A[pivot][col]) < 1e-12) return null;
    [A[col], A[pivot]] = [A[pivot], A[col]]; [b[col], b[pivot]] = [b[pivot], b[col]];
    for (let row = col + 1; row < n; row++) {
      const f = A[row][col] / A[col][col];
      if (!f) continue;
      for (let k = col; k < n; k++) A[row][k] -= f * A[col][k];
      b[row] -= f * b[col];
    }
  }
  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let s = b[row];
    for (let k = row + 1; k < n; k++) s -= A[row][k] * x[k];
    x[row] = s / A[row][row];
  }
  return x;
}

function attempt(circuit, parts, mergeWires) {
  const names = Object.keys(circuit.points);
  const index = new Map(names.map((name, i) => [name, i]));
  for (const p of parts) for (const end of [p.from, p.to]) if (!index.has(end)) throw new Error(`النقطة ${end} غير معرّفة في ${p.id}`);
  // Wires merge their ends when the plain model is singular (a loop of ideal wires).
  const parent = names.map((_, i) => i);
  const live = parts.filter(conducting);
  const merged = mergeWires ? live.filter((p) => p.type === "wire") : [];
  for (const p of merged) parent[find(parent, index.get(p.from))] = find(parent, index.get(p.to));
  // Connected groups: each needs its own reference node.
  const group = names.map((_, i) => i);
  for (const p of live) group[find(group, index.get(p.from))] = find(group, index.get(p.to));
  const nodeOf = new Map(), refs = new Set();
  for (let i = 0; i < names.length; i++) {
    const n = find(parent, i);
    const g = find(group, i);
    if (![...refs].some((r) => find(group, r) === g)) refs.add(n);
    nodeOf.set(names[i], n);
  }
  const unknownNodes = [...new Set(nodeOf.values())].filter((n) => !refs.has(n));
  const col = new Map(unknownNodes.map((n, i) => [n, i]));
  const sources = live.filter((p) => isSource(p) && !merged.includes(p));
  const size = unknownNodes.length + sources.length;
  const A = Array.from({ length: size }, () => new Array(size).fill(0));
  const b = new Array(size).fill(0);
  const v = (name) => col.get(nodeOf.get(name)); // undefined for a reference node
  for (const p of live) {
    if (isSource(p)) continue;
    if (!(p.R > 0)) throw new Error(`المقاومة ${p.id} لازم تكون أكبر من صفر`);
    const g = 1 / p.R, a = v(p.from), c = v(p.to);
    if (a !== undefined) A[a][a] += g;
    if (c !== undefined) A[c][c] += g;
    if (a !== undefined && c !== undefined) { A[a][c] -= g; A[c][a] -= g; }
  }
  sources.forEach((p, k) => {
    const row = unknownNodes.length + k, a = v(p.from), c = v(p.to);
    // The source current flows from -> to inside the element, leaving at `to`.
    if (a !== undefined) { A[a][row] += 1; A[row][a] -= 1; }
    if (c !== undefined) { A[c][row] -= 1; A[row][c] += 1; }
    A[row][row] += p.type === "battery" ? (p.r || 0) : 0;
    b[row] = p.type === "battery" ? p.emf : 0;
  });
  const x = size ? solveLinear(A, b) : [];
  if (!x) return null;
  const voltage = Object.fromEntries(names.map((name) => [name, v(name) === undefined ? 0 : x[v(name)]]));
  const current = {};
  for (const p of parts) {
    if (!conducting(p) || merged.includes(p)) current[p.id] = conducting(p) ? null : 0;
    else if (isSource(p)) current[p.id] = x[unknownNodes.length + sources.indexOf(p)];
    else current[p.id] = (voltage[p.from] - voltage[p.to]) / p.R;
  }
  return { voltage, current };
}

// values: { [partId]: { R, emf, closed, ... } } overrides without copying the circuit.
export function solveCircuit(circuit, values = {}) {
  const parts = circuit.parts.map((p) => (values[p.id] ? { ...p, ...values[p.id] } : p));
  const result = attempt(circuit, parts, false) || attempt(circuit, parts, true);
  if (!result) return { ok: false, error: "دارة قصر: مصدر جهد موصول بسلك مباشرة", parts };
  const clean = (n) => (n === null ? null : Math.abs(n) < 1e-12 ? 0 : n);
  for (const key of Object.keys(result.current)) result.current[key] = clean(result.current[key]);
  for (const key of Object.keys(result.voltage)) result.voltage[key] = clean(result.voltage[key]);
  return { ok: true, parts, ...result };
}

// What a voltmeter between two points reads: V(plus) - V(minus).
export const reading = (solution, plus, minus) => solution.voltage[plus] - solution.voltage[minus];

// The voltage drop across a part in its from -> to direction.
export const drop = (solution, id) => {
  const p = solution.parts.find((part) => part.id === id);
  return solution.voltage[p.from] - solution.voltage[p.to];
};

// Equivalent resistance between two points: drive 1 V across them and divide.
export function equivalentResistance(circuit, a, b, values = {}) {
  const probe = { id: "__probe", type: "battery", from: b, to: a, emf: 1, r: 0 };
  const solution = solveCircuit({ ...circuit, parts: [...circuit.parts, probe] }, values);
  if (!solution.ok) return 0;
  const i = solution.current.__probe;
  return i ? 1 / i : Infinity;
}

// Series and parallel rules from the book (page 68), used to check measurements.
export const seriesResistance = (rs) => rs.reduce((n, r) => n + r, 0);
export const parallelResistance = (rs) => 1 / rs.reduce((n, r) => n + 1 / r, 0);

// Wheatstone bridge (page 82): balanced when R1 / R2 = R3 / Rx.
export const bridgeUnknown = ({ R1, R2, R3 }) => (R2 * R3) / R1;
