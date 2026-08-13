/**
 * Vstupní bod aplikace — Fáze 1 (infrastruktura).
 *
 * POZNÁMKA (Fáze 1): Hra se zatím načítá přímo z `public/game.js` (IIFE, non-module),
 * který je v `index.html` odkazovaný přes `<script src="game.js">`. Tento modul je prozatím
 * prázdný placeholder, aby existovala struktura `src/` pro Fázi 2 (rozsekání logiky do modulů).
 *
 * Ve Fázi 2 bude `main.ts` importovat herní moduly a inicializovat hru. V tuto chvíli
 * se sem herní logika NEimportuje, aby nedošlo k duplicitnímu spuštění IIFE.
 */
export {};
