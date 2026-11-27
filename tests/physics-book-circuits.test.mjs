// Checks the circuits of the interactive physics book against the book itself:
// every worked example must give the answer printed in the book, and every
// activity must obey the law it teaches.
import test from "node:test";
import assert from "node:assert/strict";
import { solveCircuit, reading, drop, equivalentResistance, seriesResistance, parallelResistance, bridgeUnknown } from "../shared/circuitSolver.js";
import { toCircuitJS, circuitJSLink } from "../shared/circuitjs.js";
import * as circuits from "../src/data/books/physicsUnit2Circuits.js";

const near = (actual, expected, message, tol = 1e-9) => assert.ok(Math.abs(actual - expected) <= tol, `${message}: ${actual} ≠ ${expected}`);

test("example (1), page 74-75: I = 2 A, then 1.5 A, 1/8 A and 3/8 A", () => {
  const s = solveCircuit(circuits.example1);
  near(s.current.battery, 2, "battery current");
  near(s.current.R3, 2, "3 Ω");
  near(s.current.R4, 1.5, "4 Ω");
  near(s.current.R48, 1 / 8, "48 Ω");
  near(s.current.R16, 3 / 8, "16 Ω");
  near(drop(s, "R4"), 6, "the parallel group shares 6 V");
});

test("example (8) and the question on page 69: 16 Ω and 2 Ω", () => {
  near(equivalentResistance(circuits.example8, "A", "B"), 16, "example 8");
  near(equivalentResistance(circuits.question69, "A", "B"), 2, "question");
});

test("example (9), page 83: the balanced bridge gives R1 = 5 Ω and I = 0.6 A", () => {
  // Book labels → this figure: top-left R1 = our R2, top-right R3 = our R1, bottom-left R2 = our Rx, bottom-right R4 = our R3.
  near(bridgeUnknown({ R1: 60, R2: 15, R3: 20 }), 5, "R2·R3/R1 in the book's labels (R4 = 60, R2 = 15, R3 = 20)");
  const s = solveCircuit(circuits.wheatstone, { R2: { R: 5 }, R1: { R: 20 }, Rx: { R: 15 }, R3: { R: 60 }, S1: { closed: true }, S2: { closed: true } });
  near(s.current.G, 0, "no current through the galvanometer");
  near(s.current.battery, 0.6, "battery current");
});

test("the bridge activity: balance happens exactly at Rx = R2·R3/R1", () => {
  for (const Rx of [12, 18, 30, 46]) {
    const R3 = (Rx * 10) / 20; // R1 = 10, R2 = 20
    const values = { Rx: { R: Rx }, S1: { closed: true }, S2: { closed: true } };
    const balanced = solveCircuit(circuits.wheatstone, { ...values, R3: { R: R3 } });
    near(balanced.current.G, 0, `balanced at R3 = ${R3}`);
    near(bridgeUnknown({ R1: 10, R2: 20, R3 }), Rx, "the formula recovers Rx");
    assert.ok(Math.abs(solveCircuit(circuits.wheatstone, { ...values, R3: { R: R3 + 1 } }).current.G) > 1e-4, "off balance deflects");
  }
  assert.equal(solveCircuit(circuits.wheatstone).current.battery, 0, "S1 open: no current");
});

test("example (10), page 85-86: I = 2/3 A, I2 = 0, Vag = 40 V", () => {
  const s = solveCircuit(circuits.example10);
  near(s.current.R10left, 2 / 3, "I");
  near(s.current.R30, 2 / 3, "I1");
  near(s.current.E20, 0, "I2 through the 20 V battery");
  near(reading(s, "a", "g"), 40, "Vag");
});

test("activity (4-4): series and parallel obey the rules on page 68", () => {
  const values = { R1: { R: 10 }, R2: { R: 22 }, R3: { R: 47 } };
  const s = solveCircuit(circuits.series, values);
  const i = s.current.battery;
  near(6 / i, seriesResistance([10, 22, 47]), "Req = R1 + R2 + R3");
  near(drop(s, "R1") + drop(s, "R2") + drop(s, "R3"), 6, "V1 + V2 + V3 = V");
  for (const id of ["R1", "R2", "R3"]) near(s.current[id], i, `same current in ${id}`);
  const p = solveCircuit(circuits.parallel, values);
  near(6 / p.current.battery, parallelResistance([10, 22, 47]), "1/Req = Σ 1/R");
  near(p.current.R1 + p.current.R2 + p.current.R3, p.current.battery, "i = i1 + i2 + i3");
  for (const id of ["R1", "R2", "R3"]) near(drop(p, id), 6, `same voltage on ${id}`);
});

test("activity (5-1): the ammeter A reads the sum of A1, A2, A3 in every switch state", () => {
  for (const S1 of [false, true]) for (const S2 of [false, true]) {
    const s = solveCircuit(circuits.kirchhoff1, { S1: { closed: S1 }, S2: { closed: S2 } });
    near(s.current.A, s.current.A1 + s.current.A2 + s.current.A3, `S1=${S1} S2=${S2}`);
    if (!S1) near(s.current.A, 0, "S1 open: no current");
    if (S1) near(s.current.A1, 0.6, "6 V / 10 Ω");
    if (!S2) near(s.current.A3, 0, "S2 open: no current in R3");
  }
});

test("activity (5-2): the voltage changes around every closed loop add to zero", () => {
  const s = solveCircuit(circuits.kirchhoff2);
  const loops = [["tl", "tr", "mr", "ml"], ["ml", "mr", "brc", "bl"], ["tl", "tr", "brc", "bl"]];
  for (const loop of loops) {
    const sum = loop.reduce((n, p, i) => n + reading(s, loop[(i + 1) % loop.length], p), 0);
    near(sum, 0, `loop ${loop.join("-")}`);
  }
  // E2 drives its branch right to left, so the middle branch carries -I(E2) towards the right-hand rail.
  near(s.current.R1 + s.current.R3 - s.current.E2, 0, "currents into the right-hand rail balance");
});

test("a battery shorted by a wire is reported, not solved", () => {
  const short = { points: { a: [0, 0], b: [1, 0] }, parts: [{ id: "b", type: "battery", from: "a", to: "b", emf: 1.5, r: 0 }, { id: "w", type: "wire", from: "a", to: "b" }] };
  assert.equal(solveCircuit(short).ok, false);
});

test("every circuit exports to CircuitJS with real, distinct endpoints", () => {
  for (const [name, circuit] of Object.entries(circuits)) {
    const text = toCircuitJS(circuit, {}, { aspect: circuit.aspect });
    const lines = text.split("\n");
    assert.match(lines[0], /^\$ /, name);
    for (const line of lines.slice(1)) {
      const [, x1, y1, x2, y2] = line.split(" ").map(Number);
      assert.ok([x1, y1, x2, y2].every(Number.isFinite), `${name}: ${line}`);
      assert.ok(x1 !== x2 || y1 !== y2, `${name}: zero-length element ${line}`);
    }
    assert.ok(circuitJSLink(circuit).startsWith("https://www.falstad.com/circuit/circuitjs.html?cct="));
  }
  assert.match(toCircuitJS(circuits.wheatstone, {}, { aspect: 1 }), /^v .* 0 0 40 12 0 0 0\.5$/m, "battery emf");
  assert.match(toCircuitJS(circuits.kirchhoff1), /^s .* 0 1 false$/m, "open switch");
});
