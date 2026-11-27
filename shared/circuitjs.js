// Turns a book circuit (shared/circuitSolver.js) into a CircuitJS circuit so a
// student can open the same circuit in Paul Falstad's simulator
// (github.com/pfalstad/circuitjs1, GPL-2.0). The simulator runs on its own
// site inside an iframe; NIPRAS only builds the link, it does not copy its code.
//
// Text format, one element per line: `<type> x1 y1 x2 y2 flags ...`
//   w wire · r resistor (R) · v voltage source (DC: 0 40 V 0 0 0.5, + at x2,y2)
//   s switch (position 0 closed, 1 open) · 370 ammeter · p voltmeter probe
//   181 lamp (temperature, nominal power, nominal volts, warm, cool)

export const CIRCUITJS_URL = "https://www.falstad.com/circuit/circuitjs.html";
const HEADER = "$ 1 0.000005 10.20027730826997 50 5 43 5e-11";

export function toCircuitJS(circuit, values = {}, { width = 800, grid = 8, aspect = 0.6 } = {}) {
  const height = width * aspect;
  const at = (name) => {
    const [x, y] = circuit.points[name];
    return [Math.round((x * width) / grid) * grid + 64, Math.round((y * height) / grid) * grid + 64];
  };
  const lines = [HEADER];
  const seg = (type, a, b, rest = "") => lines.push(`${type} ${a[0]} ${a[1]} ${b[0]} ${b[1]} ${rest}`.trim());
  for (const original of circuit.parts) {
    const p = values[original.id] ? { ...original, ...values[original.id] } : original;
    const a = at(p.from), b = at(p.to);
    if (p.type === "wire") {
      const path = [p.from, ...(p.via || []), p.to].map(at);
      for (let i = 1; i < path.length; i++) seg("w", path[i - 1], path[i], "0");
    } else if (p.type === "resistor") seg("r", a, b, `0 ${p.R}`);
    else if (p.type === "lamp") seg("181", a, b, `0 300 ${(p.nominalVolts ** 2 / p.R).toFixed(3)} ${p.nominalVolts} 0.4 0.4`);
    else if (p.type === "switch") seg("s", a, b, `0 ${p.closed ? 0 : 1} false`);
    else if (p.type === "ammeter" || p.type === "galvanometer") seg("370", a, b, "3 0");
    else if (p.type === "voltmeter") seg("p", a, b, "3 0");
    else if (p.type === "battery") {
      if (!p.r) seg("v", a, b, `0 0 40 ${p.emf} 0 0 0.5`);
      else {
        // CircuitJS has no internal resistance in this format: a resistor in series.
        const mid = [Math.round((a[0] + b[0]) / 2 / grid) * grid, Math.round((a[1] + b[1]) / 2 / grid) * grid];
        seg("v", a, mid, `0 0 40 ${p.emf} 0 0 0.5`);
        seg("r", mid, b, `0 ${p.r}`);
      }
    }
  }
  return lines.join("\n");
}

export const circuitJSLink = (circuit, values, options) => `${CIRCUITJS_URL}?cct=${encodeURIComponent(toCircuitJS(circuit, values, options))}`;
