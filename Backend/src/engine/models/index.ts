import aurora96 from "./aurora-ways-96.json";
import aurora94 from "./aurora-ways-94.json";
import aurora92 from "./aurora-ways-92.json";
import { loadMathModel } from "../model/loadModel";
import type { MathModel } from "../model/mathModel";

export const MATH_MODELS: readonly MathModel[] = [aurora96, aurora94, aurora92].map(
  loadMathModel,
);

export const MATH_MODELS_BY_ID: ReadonlyMap<string, MathModel> = new Map(
  MATH_MODELS.map((model) => [model.id, model]),
);

export function getMathModel(id: string): MathModel {
  const model = MATH_MODELS_BY_ID.get(id);
  if (!model) {
    throw new Error(`Unknown math model id: ${id}`);
  }
  return model;
}
