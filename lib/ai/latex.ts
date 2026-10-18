// When a model writes "\frac" inside a JSON string without escaping, JSON.parse turns "\f" into a
// form feed (likewise \t, \b, \n, \r). Inside $...$ those control characters can only be broken TeX,
// so put the backslash and letter back.
const CONTROL: Record<string, string> = { "\f": "\\f", "\t": "\\t", "\b": "\\b", "\n": "\\n", "\r": "\\r", "\v": "\\v" };

export function repairLatex(s: string): string {
  return s.replace(/\$[^$]*\$/g, (math) => math.replace(/[\f\t\b\n\r\v]/g, (c) => CONTROL[c]));
}

export function repairStrings<T>(x: T): T {
  if (typeof x === "string") return repairLatex(x) as T;
  if (Array.isArray(x)) return x.map(repairStrings) as T;
  if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, repairStrings(v)])) as T;
  return x;
}
