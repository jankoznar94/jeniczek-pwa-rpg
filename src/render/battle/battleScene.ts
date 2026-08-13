// src/render/battle/battleScene.ts — PixiJS canvas vrstva bitevní scény.
// Fáze 3 (strangler): canvas běží POD DOM prvky arény (dungeon pozadí + efekty).
// UI prvky (timer ringy, šipky, tlačítka) zůstávají DOM — canvas je čistě vizuální vrstva.
// Fáze 5: pixi.js se načítá DYNAMICKY (code-splitting) — jen při vstupu do bitvy.
import type { Application, Container, Sprite, Graphics } from 'pixi.js';

let app: Application | null = null;
let bgSprite: Sprite | null = null;
let bgContainer: Container | null = null;
let fxContainer: Container | null = null;
let aura: Graphics | null = null;
let currentTheme: number | null = null;
let auraActive = false;
let driftTime = 0;
let particles: { g: Graphics; vx: number; vy: number; life: number; maxLife: number; size: number; gravity: number; grow: boolean }[] = [];

const THEME_BG: Record<number, string> = {
  0: 'assets/dungeons/forest.png',
  1: 'assets/dungeons/desert.png',
  2: 'assets/dungeons/undead.png',
  3: 'assets/dungeons/hell.png',
  4: 'assets/dungeons/frost.png',
};

/** Přednačte dungeon pozadí do cache (volá se při startu hry, aby bitva neměla zpoždění).
 *  Používá prostý Image — nezávisí na pixi.js, takže se pixi nenačítá při startu hry. */
export async function preloadDungeonAssets(): Promise<void> {
  const urls = Object.values(THEME_BG);
  await Promise.all(urls.map(u => new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = u;
  })));
}

/** Inicializuje PixiJS canvas do arény. Volá se jednou při startu bitvy. */
export async function initBattleScene(containerEl: HTMLElement): Promise<void> {
  if (app) return; // už inicializováno
  try {
    const { Application, Container } = await import('pixi.js');
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
      // Particle update (jiskry + kouř)
      if (particles.length > 0) {
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life -= 1;
          p.g.x += p.vx;
          p.g.y += p.vy;
          p.vy += p.gravity; // gravitace (kouř má zápornou = stoupá)
          if (p.grow) {
            const growScale = 1 + (1 - p.life / p.maxLife) * 1.6;
            p.g.scale.set(growScale);
          }
          p.g.alpha = Math.max(0, p.life / p.maxLife);
          if (p.life <= 0) {
            p.g.destroy();
            particles.splice(i, 1);
          }
        }
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
    const { Assets, Sprite } = await import('pixi.js');
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
export async function setBossAura(active: boolean): Promise<void> {
  auraActive = active;
  if (!app || !fxContainer) return;
  if (active) {
    if (!aura) {
      const { Graphics } = await import('pixi.js');
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

/** Vypustí jiskry na canvas (kritický zásah / element útok). Aditivní, pod DOM. */
export async function spawnImpactBurst(x: number, y: number, colorHex: number, isCrit: boolean): Promise<void> {
  if (!app || !fxContainer) return;
  const { Graphics } = await import('pixi.js');
  const count = isCrit ? 22 : 12;
  for (let i = 0; i < count; i++) {
    const g = new Graphics();
    const size = isCrit ? 3 + Math.random() * 4 : 2 + Math.random() * 3;
    g.circle(0, 0, size).fill({ color: colorHex, alpha: 0.9 });
    g.x = x;
    g.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = (isCrit ? 2.5 : 1.5) + Math.random() * 2;
    fxContainer.addChild(g);
    particles.push({
      g,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: isCrit ? 40 : 28,
      maxLife: isCrit ? 40 : 28,
      size,
      gravity: 0.15,
      grow: false,
    });
  }
}

/** Vypustí kouř při smrti monstra — jemný, stoupající, rozpínající se. */
export async function spawnDeathSmoke(x: number, y: number): Promise<void> {
  if (!app || !fxContainer) return;
  const { Graphics } = await import('pixi.js');
  const count = 14;
  for (let i = 0; i < count; i++) {
    const g = new Graphics();
    const size = 6 + Math.random() * 8;
    // Jemné šedé kouřové koule — desaturované, teplé (Janovy preference)
    const gray = 90 + Math.floor(Math.random() * 50);
    g.circle(0, 0, size).fill({ color: (gray << 16) | (gray << 8) | gray, alpha: 0.35 });
    g.x = x + (Math.random() - 0.5) * 20;
    g.y = y + (Math.random() - 0.5) * 20;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.4 + Math.random() * 0.8;
    fxContainer.addChild(g);
    particles.push({
      g,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.6, // stoupá
      life: 50 + Math.floor(Math.random() * 20),
      maxLife: 50 + Math.floor(Math.random() * 20),
      size,
      gravity: -0.02, // mírný vztlak
      grow: true, // rozpíná se
    });
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
  particles = [];
}

function positionBg(): void {
  if (!app || !bgSprite) return;
  bgSprite.x = app.screen.width / 2;
  bgSprite.y = app.screen.height / 2;
  // Cover: vyplnit celou arénu
  const scale = Math.max(app.screen.width / bgSprite.texture.width, app.screen.height / bgSprite.texture.height);
  bgSprite.scale.set(scale);
}
