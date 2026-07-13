import type { MathModel } from "../../engine";

export interface PublicMathModel {
  id: string;
  version: string;
  displayName: string;
  grid: MathModel["grid"];
  symbols: MathModel["symbols"];
  wild: MathModel["wild"];
  scatter: MathModel["scatter"];
  paytable: MathModel["paytable"];
  scatterPays: MathModel["scatterPays"];
  freeSpins: MathModel["freeSpins"];
}

// Never send reelStrips (or any weight-derived data) to a non-admin client — that's the
// exact information that would let someone compute odds or predict outcomes.
export function toPublicMathModel(model: MathModel): PublicMathModel {
  return {
    id: model.id,
    version: model.version,
    displayName: model.displayName,
    grid: model.grid,
    symbols: model.symbols,
    wild: model.wild,
    scatter: model.scatter,
    paytable: model.paytable,
    scatterPays: model.scatterPays,
    freeSpins: model.freeSpins,
  };
}
