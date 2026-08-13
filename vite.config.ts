import { defineConfig } from 'vite';

export default defineConfig({
  // Statické assety (PNG, MP3, sw.js, manifest.json, game.js, style.css) jsou
  // v public/ a kopírují se 1:1 do dist/. index.html v rootu je Vite entry.
  // base: './' — relativní cesty, aby hra fungovala i v subadresáři na GitHub Pages.
  base: './',
  build: {
    outDir: 'dist',
    // Bundlované JS/CSS dáme do dist/build/ — herní assety z public/assets/ jdou
    // do dist/assets/ (hru na ně odkazuje relativně). Tím se vyhneme kolizi.
    assetsDir: 'build',
  },
});
