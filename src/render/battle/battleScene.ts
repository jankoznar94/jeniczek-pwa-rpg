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
let rings: { g: Graphics; life: number; maxLife: number; maxR: number; color: number }[] = [];

// Foreground melee vrstva — samostatný PixiJS canvas NAD monstrem (z-index 17),
// kam se kreslí úderové animace zbraní (meč, sekera, dýka, pěst, tupá zbraň, drápy).
let meleeApp: Application | null = null;
let meleeContainer: Container | null = null;
let meleeFx: { g: Graphics; life: number; maxLife: number; update: (g: Graphics, t: number) => void }[] = [];

const THEME_BG: Record<number, string> = {
  0: 'assets/dungeons/forest.webp',
  1: 'assets/dungeons/desert.webp',
  2: 'assets/dungeons/undead.webp',
  3: 'assets/dungeons/hell.webp',
  4: 'assets/dungeons/frost.webp',
};

/** Přednačte dungeon pozadí do cache (volá se při startu hry, aby bitva neměla zpoždění).
 *  Používá prostý Image — nezávisí na pixi.js. Zároveň vzápětí (paralelně, bez čekání)
 *  prefetchuje pixi.js bundle, aby první bitva neměla zpoždění při vstupu. */
export function preloadDungeonAssets(): void {
  // Prefetch pixi.js do browser cache hned na startu — NEčeká na obrázky,
  // jinak by se na pomalejším internetu začal stahovat až po všech dungeon PNG.
  // Všechny bitvy (background i melee vrstva) sdílí stejný import, stačí jednou.
  import('pixi.js').catch(() => { /* bitva se obejde bez canvas vrstvy */ });
  // Dungeon pozadí načteme paralelně, fire-and-forget.
  Object.values(THEME_BG).forEach((u) => {
    const img = new Image();
    img.onload = () => {};
    img.onerror = () => {};
    img.src = u;
  });
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
      // Shockwave ring update (expandující kruh)
      if (rings.length > 0) {
        for (let i = rings.length - 1; i >= 0; i--) {
          const r = rings[i];
          r.life -= 1;
          const t = 1 - r.life / r.maxLife;
          const radius = t * r.maxR;
          r.g.clear();
          r.g.circle(0, 0, radius).stroke({ width: 3, color: r.color, alpha: Math.max(0, 1 - t) });
          if (r.life <= 0) {
            r.g.destroy();
            rings.splice(i, 1);
          }
        }
      }
    });
  } catch (e) {
    console.warn('PixiJS init selhal, bitva běží bez canvas vrstvy:', e);
    app = null;
  }
}

/** Inicializuje foreground melee vrstvu (PixiJS canvas NAD monstrem, z-index 17).
 *  Volá se jednou při startu bitvy. Úderové animace zbraní se kreslí sem. */
export async function initMeleeLayer(containerEl: HTMLElement): Promise<void> {
  if (meleeApp) return;
  try {
    const { Application, Container } = await import('pixi.js');
    meleeApp = new Application();
    await meleeApp.init({
      background: 'transparent',
      backgroundAlpha: 0,
      resizeTo: containerEl,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    meleeApp.canvas.style.position = 'absolute';
    meleeApp.canvas.style.top = '0';
    meleeApp.canvas.style.left = '0';
    meleeApp.canvas.style.zIndex = '17';
    meleeApp.canvas.style.pointerEvents = 'none';
    containerEl.appendChild(meleeApp.canvas);

    meleeContainer = new Container();
    meleeApp.stage.addChild(meleeContainer);

    meleeApp.ticker.add(() => {
      if (meleeFx.length === 0) return;
      for (let i = meleeFx.length - 1; i >= 0; i--) {
        const fx = meleeFx[i];
        fx.life -= 1;
        const t = 1 - fx.life / fx.maxLife;
        fx.update(fx.g, Math.max(0, Math.min(1, t)));
        if (fx.life <= 0) {
          fx.g.destroy();
          meleeFx.splice(i, 1);
        }
      }
    });
  } catch (e) {
    console.warn('PixiJS melee vrstva selhala, údery běží bez canvas vrstvy:', e);
    meleeApp = null;
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

/** Vypustí expandující shockwave ring při dopadu úderu. Jemné, element barva. */
export async function spawnShockwave(x: number, y: number, colorHex: number, isCrit: boolean): Promise<void> {
  if (!app || !fxContainer) return;
  const { Graphics } = await import('pixi.js');
  const g = new Graphics();
  g.x = x;
  g.y = y;
  fxContainer.addChild(g);
  rings.push({
    g,
    life: isCrit ? 26 : 20,
    maxLife: isCrit ? 26 : 20,
    maxR: isCrit ? 110 : 75,
    color: colorHex,
  });
}

/** Vypustí particle slash — jiskry letí po oblouku úderu (moderní particle úder). */
export async function spawnParticleSlash(
  x: number, y: number, colorHex: number, isCrit: boolean, angle: number
): Promise<void> {
  if (!app || !fxContainer) return;
  const { Graphics } = await import('pixi.js');
  const count = isCrit ? 26 : 16;
  for (let i = 0; i < count; i++) {
    const g = new Graphics();
    const size = isCrit ? 2.5 + Math.random() * 3 : 1.5 + Math.random() * 2.5;
    g.circle(0, 0, size).fill({ color: colorHex, alpha: 0.9 });
    g.x = x;
    g.y = y;
    // Rozptyl kolem osy úderu (úhel), letí dopředu po oblouku
    const spread = (Math.random() - 0.5) * 1.2;
    const a = angle + spread;
    const speed = (isCrit ? 2.8 : 1.8) + Math.random() * 2.2;
    fxContainer.addChild(g);
    particles.push({
      g,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 0.3,
      life: isCrit ? 34 : 24,
      maxLife: isCrit ? 34 : 24,
      size,
      gravity: 0.12,
      grow: false,
    });
  }
}

/**
 * Vypustí úderovou animaci zbraně na foreground melee vrstvě (PixiJS, z-index 17).
 * Zachovává charakter každé zbraně, ale kreslí se moderním WebGL enginem.
 * weaponType: 'blade' | 'axe' | 'dagger' | 'fists' | 'blunt' | 'claws'
 */
export async function spawnMeleeStrike(
  weaponType: string,
  x: number, y: number,
  colorHex: number,
  isCrit: boolean,
  angleOffset: number
): Promise<void> {
  if (!meleeApp || !meleeContainer) return;
  const { Graphics } = await import('pixi.js');
  const s = isCrit ? 1.8 : 1.0;
  const g = new Graphics();
  g.x = x;
  g.y = y;
  meleeContainer.addChild(g);

  const angle = angleOffset + Math.random() * Math.PI * 0.6;
  const cos = Math.cos(angle), sin = Math.sin(angle);

  // Každá zbraň má vlastní update funkci (charakter), kreslí se per-frame na Graphics.
  let update: (gr: Graphics, t: number) => void;
  let maxLife: number;

  if (weaponType === 'blade') {
    // Meč — dlouhé jednolité seknutí s motion-blur stopou
    const len = 180 * s;
    const midX = cos * len * 0.1, midY = sin * len * 0.1;
    const perpX = -sin * len * 0.2, perpY = cos * len * 0.2;
    const cpX = midX + perpX, cpY = midY + perpY;
    const startX = -cos * len * 0.5, startY = -sin * len * 0.5;
    const endX = cos * len * 0.5, endY = sin * len * 0.5;
    const approxLen = len * 1.3;
    maxLife = isCrit ? 30 : 20;
    update = (gr, t) => {
      gr.clear();
      const drawProgress = Math.min(t * 1.5, 1);
      const fade = Math.max(0, (t - 0.3) / 0.7);
      const alpha = 1 - fade;
      const dashOffset = approxLen * (1 - drawProgress);
      // 3 vrstvy motion-blur
      for (let layer = 2; layer >= 0; layer--) {
        gr.moveTo(startX, startY);
        gr.quadraticCurveTo(cpX, cpY, endX, endY);
        gr.stroke({
          width: 3 * (1 + layer * 0.9),
          color: colorHex,
          alpha: layer === 0 ? alpha : alpha * (0.35 - layer * 0.08),
        });
      }
    };
  } else if (weaponType === 'axe') {
    // Sekera — kratší, tlustší, rovnější čára
    const len = 120 * s;
    const startX = -cos * len * 0.5, startY = -sin * len * 0.5;
    const endX = cos * len * 0.5, endY = sin * len * 0.5;
    maxLife = isCrit ? 30 : 20;
    update = (gr, t) => {
      gr.clear();
      const fade = Math.max(0, (t - 0.2) / 0.8);
      const alpha = 1 - fade;
      for (let layer = 2; layer >= 0; layer--) {
        gr.moveTo(startX, startY);
        gr.lineTo(endX, endY);
        gr.stroke({
          width: 5 * (1 + layer * 0.9),
          color: colorHex,
          alpha: layer === 0 ? alpha : alpha * (0.35 - layer * 0.08),
        });
      }
    };
  } else if (weaponType === 'dagger') {
    // Dýka — kratší seknutí
    const len = 100 * s;
    const midX = cos * len * 0.1, midY = sin * len * 0.1;
    const perpX = -sin * len * 0.15, perpY = cos * len * 0.15;
    const cpX = midX + perpX, cpY = midY + perpY;
    const startX = -cos * len * 0.5, startY = -sin * len * 0.5;
    const endX = cos * len * 0.5, endY = sin * len * 0.5;
    const approxLen = len * 1.2;
    maxLife = isCrit ? 30 : 20;
    update = (gr, t) => {
      gr.clear();
      const drawProgress = Math.min(t * 1.5, 1);
      const fade = Math.max(0, (t - 0.3) / 0.7);
      const alpha = 1 - fade;
      const dashOffset = approxLen * (1 - drawProgress);
      for (let layer = 2; layer >= 0; layer--) {
        gr.moveTo(startX, startY);
        gr.quadraticCurveTo(cpX, cpY, endX, endY);
        gr.stroke({
          width: 2 * (1 + layer * 0.9),
          color: colorHex,
          alpha: layer === 0 ? alpha : alpha * (0.35 - layer * 0.08),
        });
      }
    };
  } else if (weaponType === 'fists') {
    // Pěst — expandující kruh
    maxLife = isCrit ? 30 : 20;
    update = (gr, t) => {
      gr.clear();
      const r = 10 + t * 60 * s;
      const alpha = 1 - t;
      gr.circle(0, 0, r).stroke({ width: 6 * s, color: colorHex, alpha });
      gr.circle(0, 0, r).fill({ color: 0xffffff, alpha: alpha * 0.3 });
    };
  } else if (weaponType === 'blunt') {
    // Tupá zbraň — pavučina/prasklina jako rozbité sklo (charakter zachován)
    const lineCount = 3 + Math.floor(Math.random() * 3);
    const lines: { x: number; y: number }[][] = [];
    for (let i = 0; i < lineCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const l = (25 + Math.random() * 50) * s;
      const segments: { x: number; y: number }[] = [];
      const segCount = 1 + Math.floor(Math.random() * 2);
      for (let j = 0; j < segCount; j++) {
        const frac = (j + 1) / (segCount + 1);
        const dx = Math.cos(a + (Math.random() - 0.5) * 0.6) * l * frac;
        const dy = Math.sin(a + (Math.random() - 0.5) * 0.6) * l * frac;
        segments.push({ x: dx, y: dy });
      }
      const endAngle = a + (Math.random() - 0.5) * 0.4;
      segments.push({ x: Math.cos(endAngle) * l, y: Math.sin(endAngle) * l });
      lines.push(segments);
    }
    const crossLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const crossCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < crossCount; i++) {
      const a1 = Math.random() * Math.PI * 2;
      const a2 = a1 + 0.3 + Math.random() * 0.8;
      const r1 = (15 + Math.random() * 30) * s;
      const r2 = (15 + Math.random() * 30) * s;
      crossLines.push({
        x1: Math.cos(a1) * r1, y1: Math.sin(a1) * r1,
        x2: Math.cos(a2) * r2, y2: Math.sin(a2) * r2,
      });
    }
    maxLife = isCrit ? 70 : 60;
    update = (gr, t) => {
      gr.clear();
      if (t >= 1) return;
      const alpha = 1;
      lines.forEach(segments => {
        gr.moveTo(0, 0);
        for (const seg of segments) gr.lineTo(seg.x, seg.y);
        gr.stroke({ width: 2, color: colorHex, alpha });
      });
      crossLines.forEach(cl => {
        gr.moveTo(cl.x1, cl.y1);
        gr.lineTo(cl.x2, cl.y2);
        gr.stroke({ width: 2, color: colorHex, alpha });
      });
    };
  } else {
    // claws — tři rovnoběžné sečné rány
    const len = 120 * s;
    const spacing = 20 * s;
    const perpX = -sin * spacing, perpY = cos * spacing;
    const midX = cos * len * 0.1, midY = sin * len * 0.1;
    const curveX = -sin * len * 0.2, curveY = cos * len * 0.2;
    const startX = -cos * len * 0.5, startY = -sin * len * 0.5;
    const endX = cos * len * 0.5, endY = sin * len * 0.5;
    const approxLen = len * 1.3;
    const slashes = [
      { sx: startX - perpX, sy: startY - perpY, cpX: midX - perpX + curveX, cpY: midY - perpY + curveY, ex: endX - perpX, ey: endY - perpY },
      { sx: startX, sy: startY, cpX: midX + curveX, cpY: midY + curveY, ex: endX, ey: endY },
      { sx: startX + perpX, sy: startY + perpY, cpX: midX + perpX + curveX, cpY: midY + perpY + curveY, ex: endX + perpX, ey: endY + perpY },
    ];
    maxLife = isCrit ? 30 : 20;
    update = (gr, t) => {
      gr.clear();
      const drawProgress = Math.min(t * 1.5, 1);
      const fade = Math.max(0, (t - 0.3) / 0.7);
      const alpha = 1 - fade;
      slashes.forEach((sl, idx) => {
        const offset = idx * 0.05;
        const slProgress = Math.max(0, Math.min((drawProgress - offset) / (1 - offset), 1));
        const dashOffset = approxLen * (1 - slProgress);
        for (let layer = 2; layer >= 0; layer--) {
          gr.moveTo(sl.sx, sl.sy);
          gr.quadraticCurveTo(sl.cpX, sl.cpY, sl.ex, sl.ey);
          gr.stroke({
            width: 2 * (1 + layer * 0.9),
            color: colorHex,
            alpha: layer === 0 ? alpha : alpha * (0.35 - layer * 0.08),
          });
        }
      });
    };
  }

  meleeFx.push({ g, life: maxLife, maxLife, update });
}

/** Zničí canvas vrstvu (při opuštění bitvy). */
export function destroyBattleScene(): void {
  if (app) {
    try { app.destroy(true, { children: true }); } catch (e) { /* ignore */ }
    app = null;
  }
  if (meleeApp) {
    try { meleeApp.destroy(true, { children: true }); } catch (e) { /* ignore */ }
    meleeApp = null;
  }
  bgSprite = null;
  bgContainer = null;
  fxContainer = null;
  aura = null;
  currentTheme = null;
  auraActive = false;
  driftTime = 0;
  particles = [];
  rings = [];
  meleeContainer = null;
  meleeFx = [];
}

function positionBg(): void {
  if (!app || !bgSprite) return;
  bgSprite.x = app.screen.width / 2;
  bgSprite.y = app.screen.height / 2;
  // Cover: vyplnit celou arénu
  const scale = Math.max(app.screen.width / bgSprite.texture.width, app.screen.height / bgSprite.texture.height);
  bgSprite.scale.set(scale);
}
