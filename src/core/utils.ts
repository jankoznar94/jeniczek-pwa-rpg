// src/core/utils.ts — čisté utility funkce (žádné DOM, žádný stav).
// Extrahováno z src/game.ts (Fáze 2). Chování identické s původním monolitem.

/** Náhodné celé číslo v [min, max] (včetně obou konců). */
export function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Náhodný shuffle pole (Fisher–Yates), mutuje a vrací stejné pole. */
export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Omezí hodnotu na [lo, hi]. */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Hex barva (#rrggbb) → { r, g, b }. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
}
