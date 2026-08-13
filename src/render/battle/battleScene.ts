// src/render/battle/battleScene.ts — PixiJS canvas vrstva bitevní scény.
// Fáze 3 (strangler): canvas běží POD DOM prvky arény (dungeon pozadí + efekty).
// UI prvky (timer ringy, šipky, tlačítka) zůstávají DOM — canvas je čistě vizuální vrstva.
import { Application, Container, Sprite, Assets, Graphics } from 'pixi.js';

let app: Application | null = null;
let bgSprite: Sprite | null = null;
let bgContainer: Container | null = null;
let fxContainer: Container | null = null;
let aura: Graphics | null = null;
let currentTheme: number | null = null;
let auraActive = false;
let driftTime = 0;

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
    fxContainer = new Container();
    app.stage.addChild(bgContainer);
    app.stage.addChild(fxContainer);

    // Jemný parallax drift pozadí (pomalý sinusový pohyb)
    app.ticker.add(() => {
      driftTime += 0.0015;
      if (bgSprite) {
        bgSprite.x = app!.screen.width / 2 + Math.sin(driftTime) * 8;
      }
      if (aura && auraActive) {
        const pulse = 0.5 + 0.5 * Math.sin(driftTime * 3);
        aura.alpha = 0.18 + pulse * 0.12;
        aura.scale.set(1 + pulse * 0.15);
      }
    });
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

/** Zapne/vypne pulzující boss auru (jemné glow za monstrem). */
export function setBossAura(active: boolean): void {
  auraActive = active;
  if (!app || !fxContainer) return;
  if (active) {
    if (!aura) {
      aura = new Graphics();
      aura.circle(0, 0, 60).fill({ color: 0xe74c3c, alpha: 0.25 });
      fxContainer.addChild(aura);
    }
    aura.x = app.screen.width / 2;
    aura.y = app.screen.height * 0.42;
    aura.visible = true;
  } else if (aura) {
    aura.visible = false;
  }
}

/** Zničí canvas vrstvu (při opuštění bitvy). */
export function destroyBattleScene(): void {
  if (app) {
    try { app.destroy(true, { children: true }); } catch (e) { /* ignore */ }
    app = null;
  }
  bgSprite = null;
  bgContainer = null;
  fxContainer = null;
  aura = null;
  currentTheme = null;
  auraActive = false;
  driftTime = 0;
}

function positionBg(): void {
  if (!app || !bgSprite) return;
  bgSprite.x = app.screen.width / 2;
  bgSprite.y = app.screen.height / 2;
  // Cover: vyplnit celou arénu
  const scale = Math.max(app.screen.width / bgSprite.texture.width, app.screen.height / bgSprite.texture.height);
  bgSprite.scale.set(scale);
}
