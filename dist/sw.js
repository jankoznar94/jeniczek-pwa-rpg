const CACHE = 'boss-slayer-v22';
const FILES = ['/', '/index.html', '/style.css', '/game.js', '/manifest.json', '/icon-192.png', '/icon-512.png', '/bgm.mp3', '/overworld.mp3', '/defeat.mp3', '/dodge.mp3', '/block.mp3', '/hit.mp3', '/crit.mp3', '/melee_hit.mp3', '/melee_crit.mp3', '/heal.mp3', '/treasure.mp3', '/strong_strike.mp3', '/fist_hit.mp3', '/fist_crit.mp3', '/fire_spell.mp3', '/ice_spell.mp3', '/assets/monsters/troll_test_small.png', '/assets/monsters/ent.png', '/assets/monsters/forest_lord.png', '/assets/monsters/hero.png', '/assets/monsters/moc_alova_prisera.png', '/assets/monsters/satyr.png', '/assets/monsters/medved.png', '/assets/monsters/vlk.png', '/assets/monsters/lesni_rarach.png', '/assets/monsters/dryada.png', '/assets/monsters/desert_scorpion.png', '/assets/monsters/desert_worm.png', '/assets/monsters/desert_centaur.png', '/assets/monsters/desert_nomad.png', '/assets/monsters/desert_djinn.png', '/assets/monsters/desert_mummy.png', '/assets/monsters/desert_beetle.png', '/assets/monsters/desert_cobra.png', '/assets/monsters/desert_pharaoh.png', '/assets/monsters/kerberos.png', '/assets/monsters/hellhound.png', '/assets/monsters/hero_warrior_f.png', '/assets/monsters/hero_mage_m.png', '/assets/monsters/hero_mage_f.png', '/assets/monsters/hero_barbarian_m.png', '/assets/monsters/hero_barbarian_f.png', '/assets/monsters/hero_rogue_m.png', '/assets/monsters/hero_rogue_f.png', '/assets/monsters/hero_paladin_m.png', '/assets/monsters/hero_paladin_f.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES))
  );
});

self.addEventListener('activate', e => {
  // Smazat staré cache (boss-boj-v1 atd.)
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
