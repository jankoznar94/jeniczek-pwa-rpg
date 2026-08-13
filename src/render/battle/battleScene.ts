// src/render/battle/battleScene.ts — PixiJS canvas vrstva bitevní scény.
// Fáze 3 (strangler): canvas běží POD DOM prvky arény (dungeon pozadí + monster sprite).
// UI prvky (timer ringy, šipky, tlačítka) zůstávají DOM — canvas je čistě vizuální vrstva.
import { Application, Container, Sprite, Assets } from 'pixi.js';

let app: Application | null = null;
let bgSprite: Sprite | null = null;
let monsterSprite: Sprite | null = null;
let bgContainer: Container | null = null;
let monsterContainer: Container | null = null;
let currentTheme: number | null = null;
let currentFace: string | null = null;

const THEME_BG: Record<number, string> = {
  0: 'assets/dungeons/forest.png',
  1: 'assets/dungeons/desert.png',
  2: 'assets/dungeons/undead.png',
  3: 'assets/dungeons/hell.png',
  4: 'assets/dungeons/frost.png',
};

/** Inicializuje PixiJS canvas do arény. Volá se jednou při startu bitvy. */
export async function initBattleScene(containerEl: HTMLElement): Promise<void> {
  if (app) return; // už inicializováno
  try {
    app = new Application();
    await app.init({
      background: '#121212',
      resizeTo: containerEl,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    // Canvas absolutně pod DOM prvky (z-index 0). Rozměry řídí PixiJS přes resizeTo.
    app.canvas.style.position = 'absolute';
    app.canvas.style.top = '0';
    app.canvas.style.left = '0';
    app.canvas.style.zIndex = '0';
    app.canvas.style.pointerEvents = 'none';
    containerEl.appendChild(app.canvas);

    bgContainer = new Container();
    monsterContainer = new Container();
    app.stage.addChild(bgContainer);
    app.stage.addChild(monsterContainer);
  } catch (e) {
    console.warn('PixiJS init selhal, bitva běží bez canvas vrstvy:', e);
    app = null;
  }
}

/** Nastaví dungeon pozadí podle tématu (theme index). */
export async function setDungeonBackground(theme: number): Promise<void> {
  if (!app || !bgContainer) return;
  if (theme === currentTheme) return;
  currentTheme = theme;
  const url = THEME_BG[theme] || THEME_BG[0];
  try {
    const tex = await Assets.load(url);
    if (bgSprite) bgSprite.destroy();
    bgSprite = new Sprite(tex);
    bgSprite.anchor.set(0.5);
    bgSprite.alpha = 0.55; // jemné, desaturované (Janovy preference)
    bgContainer.removeChildren();
    bgContainer.addChild(bgSprite);
    positionBg();
  } catch (e) {
    console.warn('Dungeon pozadí se nenačetlo:', url, e);
  }
}

/** Nastaví monster sprite podle cesty k obrázku (assets/monsters/...). */
export async function setMonsterSprite(face: string): Promise<void> {
  if (!app || !monsterContainer) return;
  if (face === currentFace) return;
  currentFace = face;
  try {
    const tex = await Assets.load(face);
    if (monsterSprite) monsterSprite.destroy();
    monsterSprite = new Sprite(tex);
    monsterSprite.anchor.set(0.5);
    monsterSprite.scale.set(0.5);
    monsterContainer.removeChildren();
    monsterContainer.addChild(monsterSprite);
    positionMonster();
  } catch (e) {
    console.warn('Monster sprite se nenačetl:', face, e);
  }
}

/** Zobrazí/skryje monster sprite (např. při smrti). */
export function setMonsterVisible(visible: boolean): void {
  if (!monsterContainer) return;
  monsterContainer.visible = visible;
}

/** Zničí canvas vrstvu (při opuštění bitvy). */
export function destroyBattleScene(): void {
  if (app) {
    try { app.destroy(true, { children: true }); } catch (e) { /* ignore */ }
    app = null;
  }
  bgSprite = null;
  monsterSprite = null;
  bgContainer = null;
  monsterContainer = null;
  currentTheme = null;
  currentFace = null;
}

function positionBg(): void {
  if (!app || !bgSprite) return;
  bgSprite.x = app.screen.width / 2;
  bgSprite.y = app.screen.height / 2;
  // Cover: vyplnit celou arénu
  const scale = Math.max(app.screen.width / bgSprite.texture.width, app.screen.height / bgSprite.texture.height);
  bgSprite.scale.set(scale);
}

function positionMonster(): void {
  if (!app || !monsterSprite) return;
  monsterSprite.x = app.screen.width / 2;
  monsterSprite.y = app.screen.height * 0.42;
}
