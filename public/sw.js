const CODE_CACHE = 'boss-slayer-code-v239';
const ASSET_CACHE = 'boss-slayer-assets-v55';

const CODE_FILES = ['/', '/index.html', '/style.css?v=175', '/manifest.json', '/item-reference.html'];

const ASSET_FILES = [
  '/icon-192.png', '/icon-512.png',
  '/bgm.mp3', '/overworld.mp3', '/defeat.mp3', '/dodge.mp3', '/block.mp3',
  '/hit.mp3', '/crit.mp3', '/melee_hit.mp3', '/melee_crit.mp3', '/heal.mp3',
  '/treasure.mp3', '/strong_strike.mp3', '/fist_hit.mp3', '/fist_crit.mp3',
  '/fire_spell.mp3', '/ice_spell.mp3',
  '/assets/dungeons/forest.webp',
  '/assets/monsters/troll_test_small.png', '/assets/monsters/ent.png',
  '/assets/monsters/forest_lord.png', '/assets/monsters/hero.png',
  '/assets/monsters/moc_alova_prisera.png', '/assets/monsters/satyr.png',
  '/assets/monsters/medved.png', '/assets/monsters/vlk.png',
  '/assets/monsters/lesni_rarach.png', '/assets/monsters/dryada.png',
  '/assets/monsters/desert_scorpion.png', '/assets/monsters/desert_worm.png',
  '/assets/monsters/desert_centaur.png', '/assets/monsters/desert_nomad.png',
  '/assets/monsters/desert_djinn.png', '/assets/monsters/desert_mummy.png',
  '/assets/monsters/desert_beetle.png', '/assets/monsters/desert_cobra.png',
  '/assets/monsters/desert_pharaoh.png', '/assets/monsters/kerberos.png',
  '/assets/monsters/hellhound.png', '/assets/monsters/hero_warrior_f.png',
  '/assets/monsters/hero_mage_m.png', '/assets/monsters/hero_mage_f.png',
  '/assets/monsters/hero_barbarian_m.png', '/assets/monsters/hero_barbarian_f.png',
  '/assets/monsters/hero_rogue_m.png', '/assets/monsters/hero_rogue_f.png',
  '/assets/monsters/hero_paladin_m.png', '/assets/monsters/hero_paladin_f.png',
  '/assets/monsters/imp.png', '/assets/monsters/succubus.png',
  '/assets/monsters/fire_ghost.png', '/assets/monsters/lucifer.png',
  '/assets/monsters/lucifer_demon.png', '/assets/monsters/hell_smith.png',
  '/assets/monsters/lava_dragon.png', '/assets/monsters/hell_knight.png',
  '/assets/monsters/skeleton.png', '/assets/monsters/zombie.png',
  '/assets/monsters/lich.png', '/assets/monsters/bone_dragon.png',
  '/assets/monsters/death_knight.png', '/assets/monsters/raven.png',
  '/assets/monsters/ghost.png', '/assets/monsters/reaper.png',
  '/assets/monsters/ice_troll.png', '/assets/monsters/frost_giant.png',
  '/assets/monsters/polar_bear.png', '/assets/monsters/snow_wolf.png',
  '/assets/monsters/ice_dragon.png', '/assets/monsters/snow_golem.png',
  '/assets/monsters/frozen_knight.png', '/assets/monsters/ice_lizard.png',
  '/assets/monsters/frost_titan.png',
  '/assets/items/helmet_linen_hood.png', '/assets/items/helmet_iron_helm.png',
  '/assets/items/helmet_steel_helm.png', '/assets/items/helmet_silver_helm.png',
  '/assets/items/helmet_crown.png', '/assets/items/helmet_bone_helm.png', '/assets/items/armor_leather.png',
  '/assets/items/armor_chainmail.png', '/assets/items/armor_scale.png',
  '/assets/items/armor_plate.png', '/assets/items/armor_dragon_scale.png',
  '/assets/items/weapon_iron_sword.png', '/assets/items/weapon_broad_sword.png',
  '/assets/items/weapon_sword_short.png', '/assets/items/weapon_sword_broad.png',
  '/assets/items/weapon_sword_gladius.png', '/assets/items/weapon_sword_dim.png',
  '/assets/items/weapon_sword_falcata.png',
  '/assets/items/weapon_axe_hand.png', '/assets/items/weapon_axe_double.png',
  '/assets/items/weapon_axe_hatchet.png', '/assets/items/weapon_axe_twin.png',
  '/assets/items/weapon_axe_tomahawk.png',
  '/assets/items/weapon_battle_axe.png', '/assets/items/weapon_claymore.png',
  '/assets/items/weapon_war_hammer.png', '/assets/items/staff_wooden.png',
  '/assets/items/staff_fire.png', '/assets/items/staff_ice.png',
  '/assets/items/staff_lightning.png', '/assets/items/staff_archmage.png',
  '/assets/items/ring_copper.png', '/assets/items/ring_silver.png',
  '/assets/items/ring_gold.png', '/assets/items/ring_gem.png',
  '/assets/items/ring_platinum.png', '/assets/items/shield_wooden.png',
  '/assets/items/shield_leather.png', '/assets/items/shield_iron.png',
  '/assets/items/shield_steel.png', '/assets/items/shield_paladin.png',
  '/assets/items/weapon_hunting_knife.png', '/assets/items/weapon_sabre.png',
  '/assets/items/weapon_war_axe.png', '/assets/items/weapon_great_sword.png',
  '/assets/items/weapon_giant_hammer.png', '/assets/items/amulet_bone.png',
  '/assets/items/amulet_silver.png', '/assets/items/amulet_gold.png',
  '/assets/items/amulet_ruby.png', '/assets/items/amulet_arcane.png',
  '/assets/gates/gate_desert.webp', '/assets/gates/gate_undead.webp',
  '/assets/gates/gate_hell.webp', '/assets/gates/gate_frost.webp',
  '/assets/menu-icons/mapa.png', '/assets/menu-icons/talenty.png',
  '/assets/menu-icons/inventar.png', '/assets/menu-icons/obchod.png',
  '/assets/menu-icons/navod.png', '/assets/menu-icons/bestiar.png',
  '/assets/menu-icons/music.png', '/assets/menu-icons/testmode.png',
  '/assets/menu-icons/waypoint.png', '/assets/menu-icons/shop.png',
  '/assets/menu-icons/chest.png', '/assets/menu-icons/gamble.png', '/assets/menu-icons/craft.png',
  '/assets/town.webp', '/assets/map.webp',
  '/assets/sfx/hurt1.mp3', '/assets/sfx/hurt2.mp3', '/assets/sfx/hurt3.mp3', '/assets/sfx/hurt4.mp3',
  '/assets/sfx/shout.mp3',
  '/assets/sfx/shop.mp3',
  '/assets/sfx/melee_hit2.mp3',
  '/assets/sfx/equip.mp3',
  '/assets/sfx/potion.mp3',
  '/assets/sfx/levelup.mp3',
  '/assets/sfx/lightning_spell2.mp3',
  '/assets/sfx/click.mp3',
  '/assets/sfx/enemy_hit.mp3',
  '/assets/sfx/enemy_hit1.mp3', '/assets/sfx/enemy_hit2.mp3', '/assets/sfx/enemy_hit3.mp3',
  '/assets/sfx/enemy_hit4.mp3', '/assets/sfx/enemy_hit5.mp3', '/assets/sfx/enemy_hit6.mp3',
  '/assets/sfx/blunt_hit.mp3', '/assets/sfx/blunt_crit.mp3',
  '/assets/sfx/thunder_clap.mp3', '/assets/sfx/thunder_bolt.mp3',
  '/assets/sfx/fire_spell.mp3', '/assets/sfx/ice_spell.mp3', '/assets/sfx/lightning_spell.mp3',
  '/assets/spells/heroicStrike.png', '/assets/spells/doubleSwing.png', '/assets/spells/whirlwind.png',
  '/assets/spells/thunderClap.png', '/assets/spells/thunderBolt.png',
  '/assets/spells/bloodrage.png', '/assets/spells/battleShout.png', '/assets/spells/defensiveShout.png', '/assets/spells/skill_shout.png', '/assets/spells/shield_bash.png',
  '/assets/spells/pummel.png', '/assets/spells/spellReflect.png',
  '/assets/spells/shadowStrike.png', '/assets/spells/bladeFury.png', '/assets/spells/deathMark.png',
  '/assets/spells/poisonBlade.png', '/assets/spells/smokeScreen.png', '/assets/spells/shadowDance.png', '/assets/spells/evasion.png',
  '/assets/spells/firebolt.png', '/assets/spells/fireball.png', '/assets/spells/fireblast.png',
  '/assets/spells/icebolt.png', '/assets/spells/frostbolt.png', '/assets/spells/blizzard.png',
  '/assets/spells/lightningBolt.png', '/assets/spells/chainLightning.png', '/assets/spells/thunderStorm.png',
  '/assets/spells/regrowth.png', '/assets/spells/naturesBoon.png', '/assets/spells/revitalize.png',
  '/assets/spells/oneHandSpec.png', '/assets/spells/twoHandSpec.png',
  '/assets/spells/speedBoost.png', '/assets/spells/skillShout.png',
  '/assets/spells/poison_bolt.png', '/assets/spells/poison.png', '/assets/spells/drain_life.png', '/assets/spells/mana_drain.png',
  '/assets/spells/chill.png',
  '/assets/spells/empower.png', '/assets/spells/shadow_bolt.png', '/assets/spells/heal.png',
  '/assets/spells/thorn_shield.png', '/assets/spells/faerie_fire.png', '/assets/spells/slow.png',
  '/assets/projectiles/fireball.png', '/assets/projectiles/frostbolt.png',
  '/assets/projectiles/shadow.png', '/assets/projectiles/arcane.png',
  '/assets/result_win.png', '/assets/result_defeat.png',
  '/assets/items/belt_cloth.png', '/assets/items/belt_leather.png',
  '/assets/items/belt_iron.png', '/assets/items/belt_steel.png',
  '/assets/items/belt_mithril.png',
  '/assets/items/potion_healing_light.png', '/assets/items/potion_healing_healing.png',
  '/assets/items/potion_healing_greater.png', '/assets/items/potion_healing_super.png', '/assets/items/potion_healing_godly.png',
  '/assets/items/potion_mana_light.png', '/assets/items/potion_mana_mana.png',
  '/assets/items/potion_mana_greater.png', '/assets/items/potion_mana_super.png', '/assets/items/potion_mana_godly.png',
  '/assets/items/town_portal_scroll.png', '/assets/items/magic_rune.png',
  '/assets/items/jewel_ruby.png', '/assets/items/jewel_sapphire.png', '/assets/items/jewel_emerald.png', '/assets/items/jewel_topaz.png',
  '/assets/items/gloves_leather.png', '/assets/items/gloves_heavy.png',
  '/assets/items/gloves_chain.png', '/assets/items/gloves_lightGauntlets.png',
  '/assets/items/gloves_gauntlets.png',
  '/assets/items/boots_boots.png', '/assets/items/boots_heavy.png',
  '/assets/items/boots_chain.png', '/assets/items/boots_lightPlated.png',
  '/assets/items/boots_greaves.png',
  // Act 0 stops (Enchanted Forest zastávky) — WebP komprese
  '/assets/stops/stop_act0_0.webp', '/assets/stops/stop_act0_1.webp', '/assets/stops/stop_act0_2.webp',
  '/assets/stops/stop_act0_3.webp', '/assets/stops/stop_act0_4.webp', '/assets/stops/stop_act0_5.webp',
  '/assets/stops/stop_act0_6.webp', '/assets/stops/stop_act0_7.webp', '/assets/stops/stop_act0_8.webp',
  '/assets/stops/stop_act0_9.webp',
  // Act 1 stops (Desert Realm zastávky) — WebP komprese
  '/assets/stops/stop_act1_0.webp', '/assets/stops/stop_act1_1.webp', '/assets/stops/stop_act1_2.webp',
  '/assets/stops/stop_act1_3.webp', '/assets/stops/stop_act1_4.webp', '/assets/stops/stop_act1_5.webp',
  '/assets/stops/stop_act1_6.webp', '/assets/stops/stop_act1_7.webp', '/assets/stops/stop_act1_8.webp',
  '/assets/stops/stop_act1_9.webp',
  // Act 2-4 stop placeholders (generuje se až reálné obrázky zastávek)
  '/assets/stops/placeholder_act2.png',
  '/assets/stops/placeholder_act3.png', '/assets/stops/placeholder_act4.png',
  // Gems
  '/assets/gems/ruby_chipped.png', '/assets/gems/ruby_flawed.png', '/assets/gems/ruby.png',
  '/assets/gems/ruby_flawless.png', '/assets/gems/ruby_perfect.png',
  '/assets/gems/sapphire_chipped.png', '/assets/gems/sapphire_flawed.png', '/assets/gems/sapphire.png',
  '/assets/gems/sapphire_flawless.png', '/assets/gems/sapphire_perfect.png',
  '/assets/gems/emerald_chipped.png', '/assets/gems/emerald_flawed.png', '/assets/gems/emerald.png',
  '/assets/gems/emerald_flawless.png', '/assets/gems/emerald_perfect.png',
  '/assets/gems/topaz_chipped.png', '/assets/gems/topaz_flawed.png', '/assets/gems/topaz.png',
  '/assets/gems/topaz_flawless.png', '/assets/gems/topaz_perfect.png',
  // Menu icons
  '/assets/menu-icons/chest.png',
  // PS-style interakční tlačítka
  '/assets/ps/ps_cross.png', '/assets/ps/ps_circle.png',
  '/assets/ps/ps_square.png', '/assets/ps/ps_tri.png',
  '/assets/ps/ps_dodge.png', '/assets/ps/ps_block.png', '/assets/ps/ps_counter.png',
  // Horní combo značky (symbol s prostorem kolem — samostatné, nedotýká se dolních)
  '/assets/ps/ps_tri_center.png', '/assets/ps/ps_circle_center.png',
  '/assets/ps/ps_cross_center.png', '/assets/ps/ps_square_center.png',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CODE_CACHE).then(c => c.addAll(CODE_FILES))
  );
  e.waitUntil(
    caches.open(ASSET_CACHE).then(c => c.addAll(ASSET_FILES))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k =>
          k !== CODE_CACHE &&
          k !== ASSET_CACHE &&
          !k.startsWith('boss-slayer-assets-')
        ).map(k => caches.delete(k))
      )
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isCode = CODE_FILES.includes(url.pathname) || url.pathname === '/sw.js';
  const cacheName = isCode ? CODE_CACHE : ASSET_CACHE;

  e.respondWith(
    caches.open(cacheName).then(c =>
      c.match(e.request).then(r => r || fetch(e.request))
    )
  );
});
