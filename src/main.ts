/**
 * Vstupní bod aplikace — Fáze 2.
 *
 * Importuje monolitní herní logiku (src/game.ts, převedený z IIFE na ES modul)
 * a spouští initGame(). Hra zatím zůstává jeden velký soubor (@ts-nocheck);
 * rozsekaní do modulů probíhá postupně v této fázi.
 */
import { initGame } from './game';

initGame();
