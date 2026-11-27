// The circuits drawn in unit 2 of the Palestinian grade-12 physics book
// (الكهرباء المتحركة), traced from the figures so the live overlay sits exactly
// on the printed drawing. Coordinates are pixels of a 300 dpi crop of each
// figure and are stored as fractions of that crop.
//
// Values the book prints are used as printed. Where an activity names no
// values (نشاط 4-4، 5-1، 5-2), the values are NIPRAS's choice, marked `chosen`,
// and the student can change them.

const figure = ([w, h], points, parts) => ({
  aspect: h / w,
  points: Object.fromEntries(Object.entries(points).map(([k, [x, y]]) => [k, [x / w, y / h]])),
  parts
});
const wire = (id, from, to, via) => ({ id, type: "wire", from, to, ...(via ? { via } : {}) });
const res = (id, from, to, R, extra = {}) => ({ id, type: "resistor", from, to, R, ...extra });
const bat = (id, minus, plus, emf, r = 0, extra = {}) => ({ id, type: "battery", from: minus, to: plus, emf, r, ...extra });
const amm = (id, from, to, extra = {}) => ({ id, type: "ammeter", from, to, ...extra });
const sw = (id, from, to, closed, extra = {}) => ({ id, type: "switch", from, to, closed, ...extra });

// Page 59, figure: a battery, a lamp and the conventional current I.
export const lampLoop = figure([467, 339], {
  bp: [112, 138], bm: [182, 138], lampL: [360, 138], lampB: [398, 160], br: [398, 292], mr: [255, 292], ml: [210, 292], bl: [47, 292], tl: [47, 138]
}, [
  bat("battery", "bm", "bp", 1.5),
  wire("w1", "bm", "lampL"), { id: "lamp", type: "lamp", from: "lampL", to: "lampB", R: 5, nominalVolts: 1.5 },
  wire("w2", "lampB", "br"), wire("w3", "br", "mr"), res("meter", "mr", "ml", 0.01), wire("w4", "ml", "bl"), wire("w5", "bl", "tl"), wire("w6", "tl", "bp")
]);

// Page 68, figure (4-4): three resistors in series.
export const series = figure([784, 367], {
  A: [93, 118], r1a: [135, 118], r1b: [240, 118], r2a: [318, 118], r2b: [420, 118], r3a: [498, 118], r3b: [600, 118],
  B: [683, 118], br: [683, 300], bm: [400, 300], bp: [340, 300], bl: [93, 300]
}, [
  wire("w1", "bl", "A"), wire("w2", "A", "r1a"), res("R1", "r1a", "r1b", 10, { chosen: true }),
  wire("w3", "r1b", "r2a"), res("R2", "r2a", "r2b", 20, { chosen: true }), wire("w4", "r2b", "r3a"),
  res("R3", "r3a", "r3b", 30, { chosen: true }), wire("w5", "r3b", "B"), wire("w6", "B", "br"), wire("w7", "br", "bm"),
  bat("battery", "bm", "bp", 6, 0, { chosen: true }), wire("w8", "bp", "bl")
]);

// Page 68, the parallel figure.
export const parallel = figure([538, 442], {
  A: [82, 200], B: [455, 200], t1: [180, 92], r1a: [232, 92], r1b: [305, 92], t2: [360, 92],
  r2a: [232, 200], r2b: [305, 200], u1: [180, 308], r3a: [232, 308], r3b: [305, 308], u2: [360, 308],
  bl: [82, 360], bp: [250, 360], bm: [278, 360], br: [455, 360]
}, [
  wire("a1", "A", "t1"), wire("a2", "t1", "r1a"), res("R1", "r1a", "r1b", 10, { chosen: true }), wire("a3", "r1b", "t2"), wire("a4", "t2", "B"),
  wire("b1", "A", "r2a"), res("R2", "r2a", "r2b", 20, { chosen: true }), wire("b2", "r2b", "B"),
  wire("c1", "A", "u1"), wire("c2", "u1", "r3a"), res("R3", "r3a", "r3b", 30, { chosen: true }), wire("c3", "r3b", "u2"), wire("c4", "u2", "B"),
  wire("d1", "bl", "A"), wire("d2", "bp", "bl"), bat("battery", "bm", "bp", 6, 0, { chosen: true }), wire("d3", "bm", "br"), wire("d4", "br", "B")
]);

// Page 69, example (8): A-B through 10 Ω, (6 Ω ∥ 3 Ω) and 4 Ω. The book gets 16 Ω.
export const example8 = figure([618, 422], {
  A: [105, 98], r10a: [350, 98], r10b: [420, 98], tr: [512, 98], r3a: [512, 180], r3b: [512, 250], brc: [512, 343],
  j: [265, 343], r6a: [420, 195], r6b: [375, 240], r4b: [225, 343], r4a: [155, 343], B: [105, 343]
}, [
  wire("w1", "A", "r10a"), res("R10", "r10a", "r10b", 10), wire("w2", "r10b", "tr"),
  wire("w3", "tr", "r3a"), res("R3", "r3a", "r3b", 3), wire("w4", "r3b", "brc"), wire("w5", "brc", "j"),
  wire("w6", "tr", "r6a"), res("R6", "r6a", "r6b", 6), wire("w7", "r6b", "j"),
  wire("w8", "j", "r4b"), res("R4", "r4b", "r4a", 4), wire("w9", "r4a", "B")
]);

// Page 69, question: the equivalent resistance between A and B (2 Ω).
export const question69 = figure([618, 521], {
  B: [82, 403], bl: [155, 403], tl: [155, 92], t2a: [265, 92], t2b: [350, 92], tr: [465, 92],
  l1a: [155, 195], l1b: [155, 285], d6a: [355, 200], d6b: [285, 270], r2a: [465, 195], r2b: [465, 285], brc: [465, 403],
  b4a: [265, 403], b4b: [352, 403], A: [530, 403]
}, [
  wire("w1", "B", "bl"), wire("w2", "tl", "t2a"), res("R2top", "t2a", "t2b", 2), wire("w3", "t2b", "tr"),
  wire("w4", "tl", "l1a"), res("R1", "l1a", "l1b", 1), wire("w5", "l1b", "bl"),
  wire("w6", "tr", "d6a"), res("R6", "d6a", "d6b", 6), wire("w7", "d6b", "bl"),
  wire("w8", "tr", "r2a"), res("R2right", "r2a", "r2b", 2), wire("w9", "r2b", "brc"),
  wire("w10", "bl", "b4a"), res("R4", "b4a", "b4b", 4), wire("w11", "b4b", "brc"), wire("w12", "brc", "A")
]);

// Page 74, example (1): 12 V, 3 Ω, then 16 Ω, 4 Ω and 48 Ω in parallel.
export const example1 = figure([647, 459], {
  tl: [148, 97], bp: [148, 170], bm: [148, 245], bl: [148, 375], r3a: [195, 97], r3b: [300, 97], x: [370, 97],
  r16a: [430, 97], r16b: [535, 97], tr: [598, 97], brc: [598, 375], r4a: [290, 205], r4b: [215, 285], r48a: [450, 205], r48b: [525, 285]
}, [
  wire("w1", "bp", "tl"), wire("w2", "tl", "r3a"), res("R3", "r3a", "r3b", 3), wire("w3", "r3b", "x"),
  wire("w4", "x", "r16a"), res("R16", "r16a", "r16b", 16), wire("w5", "r16b", "tr"), wire("w6", "tr", "brc"),
  wire("w7", "x", "r4a"), res("R4", "r4a", "r4b", 4), wire("w8", "r4b", "bl"),
  wire("w9", "x", "r48a"), res("R48", "r48a", "r48b", 48), wire("w10", "r48b", "brc"),
  wire("w11", "brc", "bl"), wire("w12", "bl", "bm"), bat("battery", "bm", "bp", 12)
]);

// Page 82, Wheatstone bridge. R1 (c-a), R2 (b-c), Rx (b-e), variable R3 (e-a).
// The bridge balances when R1 / R2 = R3 / Rx. Battery 12 V, r = 1.25 Ω as in example (9).
export const wheatstone = figure([618, 605], {
  c: [310, 78], a: [482, 248], b: [135, 248], e: [310, 420],
  r1a: [365, 120], r1b: [430, 185], r2a: [185, 197], r2b: [255, 128], rxa: [195, 300], rxb: [255, 355], r3a: [360, 370], r3b: [430, 305],
  g1: [310, 128], g2: [310, 172], s2a: [310, 210], s2b: [310, 285],
  bl: [28, 248], bbl: [28, 555], s1a: [150, 555], s1b: [195, 555], bm: [280, 555], bp: [320, 555], bbr: [598, 555], rr: [598, 248]
}, [
  wire("c1", "c", "r1a"), res("R1", "r1a", "r1b", 10, { chosen: true }), wire("c2", "r1b", "a"),
  wire("c3", "b", "r2a"), res("R2", "r2a", "r2b", 20, { chosen: true }), wire("c4", "r2b", "c"),
  wire("c5", "b", "rxa"), res("Rx", "rxa", "rxb", 30, { chosen: true, hidden: true }), wire("c6", "rxb", "e"),
  wire("c7", "e", "r3a"), res("R3", "r3a", "r3b", 10, { chosen: true, variable: true }), wire("c8", "r3b", "a"),
  wire("g0", "c", "g1"), { id: "G", type: "galvanometer", from: "g1", to: "g2" }, wire("g3", "g2", "s2a"),
  sw("S2", "s2a", "s2b", false), wire("g4", "s2b", "e"),
  wire("d1", "b", "bl"), wire("d2", "bl", "bbl"), wire("d3", "bbl", "s1a"), sw("S1", "s1a", "s1b", false), wire("d4", "s1b", "bm"),
  bat("battery", "bm", "bp", 12, 1.25), wire("d5", "bp", "bbr"), wire("d6", "bbr", "rr"), wire("d7", "rr", "a")
]);

// Page 84, activity (5-1): Kirchhoff's first law. S2 adds the R3 branch.
export const kirchhoff1 = figure([630, 497], {
  bp: [330, 72], bm: [360, 72], tl: [45, 72], s1a: [45, 135], s1b: [45, 195], ml: [45, 323], aa: [108, 323], ab: [148, 323], j: [237, 323],
  r1l: [237, 213], r1a: [312, 213], r1b: [378, 213], a1a: [432, 213], a1b: [472, 213], rj1: [510, 213],
  r2a: [305, 323], r2b: [372, 323], a2a: [432, 323], a2b: [472, 323], rj2: [510, 323], rr: [595, 323], tr: [595, 72],
  s2a: [237, 352], s2b: [237, 382], r3l: [237, 435], r3a: [312, 435], r3b: [378, 435], a3a: [432, 435], a3b: [472, 435], rj3: [510, 435]
}, [
  wire("t1", "bp", "tl"), wire("t2", "tl", "s1a"), sw("S1", "s1a", "s1b", false), wire("t3", "s1b", "ml"), wire("t4", "ml", "aa"),
  amm("A", "aa", "ab"), wire("t5", "ab", "j"),
  wire("u1", "j", "r1l"), wire("u2", "r1l", "r1a"), res("R1", "r1a", "r1b", 10, { chosen: true }), wire("u3", "r1b", "a1a"), amm("A1", "a1a", "a1b"), wire("u4", "a1b", "rj1"),
  wire("v1", "j", "r2a"), res("R2", "r2a", "r2b", 20, { chosen: true }), wire("v2", "r2b", "a2a"), amm("A2", "a2a", "a2b"), wire("v3", "a2b", "rj2"),
  wire("x1", "j", "s2a"), sw("S2", "s2a", "s2b", false), wire("x2", "s2b", "r3l"), wire("x3", "r3l", "r3a"), res("R3", "r3a", "r3b", 30, { chosen: true }),
  wire("x4", "r3b", "a3a"), amm("A3", "a3a", "a3b"), wire("x5", "a3b", "rj3"),
  wire("y1", "rj1", "rj2"), wire("y2", "rj3", "rj2"), wire("y3", "rj2", "rr"), wire("y4", "rr", "tr"), wire("y5", "tr", "bm"),
  bat("battery", "bm", "bp", 6, 0, { chosen: true })
]);

// Page 85, activity (5-2): Kirchhoff's second law. The book gives no values.
export const kirchhoff2 = figure([493, 463], {
  tl: [48, 92], r1a: [148, 92], r1b: [238, 92], e1p: [312, 92], e1m: [352, 92], tr: [422, 92],
  ml: [48, 222], e2p: [115, 222], e2m: [150, 222], r2a: [240, 222], r2b: [330, 222], mr: [422, 222],
  bl: [48, 370], r3a: [148, 370], r3b: [238, 370], e3m: [318, 370], e3p: [352, 370], brc: [422, 370]
}, [
  wire("a1", "tl", "r1a"), res("R1", "r1a", "r1b", 10, { chosen: true }), wire("a2", "r1b", "e1p"), bat("E1", "e1m", "e1p", 6, 0, { chosen: true }), wire("a3", "e1m", "tr"),
  wire("b1", "ml", "e2p"), bat("E2", "e2m", "e2p", 4, 0, { chosen: true }), wire("b2", "e2m", "r2a"), res("R2", "r2a", "r2b", 20, { chosen: true }), wire("b3", "r2b", "mr"),
  wire("c1", "bl", "r3a"), res("R3", "r3a", "r3b", 30, { chosen: true }), wire("c2", "r3b", "e3m"), bat("E3", "e3m", "e3p", 3, 0, { chosen: true }), wire("c3", "e3p", "brc"),
  wire("l1", "tl", "ml"), wire("l2", "ml", "bl"), wire("r1", "tr", "mr"), wire("r2", "mr", "brc")
]);

// Page 85, example (10). The book's answer: I = 2/3 A, I1 = 2/3 A, I2 = 0, Vag = 40 V.
export const example10 = figure([618, 392], {
  a: [85, 293], b: [85, 163], r10a: [85, 250], r10b: [85, 195], r20a: [125, 163], r20b: [195, 163], k: [210, 163],
  h: [210, 112], c: [210, 237], e20p: [228, 112], e20m: [285, 112], g: [315, 112], t10a: [345, 112], t10b: [410, 112], e: [478, 112],
  j: [478, 160], d: [478, 237], r30a: [295, 237], r30b: [365, 237], fj: [555, 160], f: [555, 293], e40m: [318, 293], e40p: [258, 293]
}, [
  wire("w1", "a", "r10a"), res("R10left", "r10a", "r10b", 10), wire("w2", "r10b", "b"),
  wire("w3", "b", "r20a"), res("R20", "r20a", "r20b", 20), wire("w4", "r20b", "k"),
  wire("w5", "k", "h"), wire("w6", "k", "c"),
  wire("w7", "h", "e20p"), bat("E20", "e20m", "e20p", 20), wire("w8", "e20m", "g"),
  wire("w9", "g", "t10a"), res("R10top", "t10a", "t10b", 10), wire("w10", "t10b", "e"),
  wire("w11", "c", "r30a"), res("R30", "r30a", "r30b", 30), wire("w12", "r30b", "d"),
  wire("w13", "e", "j"), wire("w14", "j", "d"), wire("w15", "j", "fj"), wire("w16", "fj", "f"),
  wire("w17", "f", "e40m"), bat("E40", "e40m", "e40p", 40), wire("w18", "e40p", "a")
]);

// Page 62, activity (4-2), last step: the circuit a student designs to find a
// metal wire's resistance - a source, an ammeter in series and a voltmeter
// across the wire. Not drawn in the book; laid out here for CircuitJS.
export const ohmLab = figure([600, 400], {
  bm: [80, 330], bp: [80, 90], tl: [80, 60], aa: [200, 60], ab: [280, 60], wa: [360, 60], wb: [480, 60], tr: [540, 60], br: [540, 330],
  va: [360, 160], vb: [480, 160]
}, [
  bat("battery", "bm", "bp", 6, 0, { chosen: true }), wire("w1", "bp", "tl"), wire("w2", "tl", "aa"), amm("A", "aa", "ab"), wire("w3", "ab", "wa"),
  res("wire", "wa", "wb", 15, { chosen: true, hidden: true }), wire("w4", "wb", "tr"), wire("w5", "tr", "br"), wire("w6", "br", "bm"),
  wire("v1", "wa", "va"), { id: "V", type: "voltmeter", from: "va", to: "vb" }, wire("v2", "vb", "wb")
]);
