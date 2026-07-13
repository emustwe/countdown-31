import { type MathModel, parseMathModel } from "./mathModel";

export function loadMathModel(raw: unknown): MathModel {
  return parseMathModel(raw);
}
