// src/data/loot.ts — názvy itemů, rarity a atributy.
// Extrahováno z src/game.ts (Fáze 2). Čistá data bez closure závislostí.

  export const LOOT_NAMES = {
    weapon: {
      staff: ['Dřevěná hůlka','Ohnivá hůlka','Ledová hůl','Blesková hůl','Hvězdná hůl','Plamená hůl','Měsíční hůl','Arcimágova hůl'],
      blade: ['Železný meč','Široký meč','Bojová sekera','Obouruční meč','Temný meč','Dračí sekera','Arcimágův meč']
    },
    armor: ['Lněný hábit','Kožený hábit','Šupinový hábit','Vyšívaný hábit','Kroužkový hábit','Dračí hábit','Arcimágův hábit'],
    helmet: ['Lněná kápě','Kožená čapka','Železná helma','Ocelová helma','Stříbrná přilba','Arcimágova koruna'],
    shield: ['Dřevěný štít','Kožený štít','Železný štít','Ocelový štít','Stříbrný štít','Paladinův štít'],
    ring: ['Měděný prsten','Cínový prsten','Stříbrný prsten','Zlatý prsten','Platinový prsten','Drahokamový prsten'],
    amulet: ['Kostěný amulet','Měděný amulet','Stříbrný amulet','Zlatý amulet','Rubínový amulet','Arcánní amulet'],
    gloves: ['Kožené rukavice','Těžké rukavice','Řetězové rukavice','Lehké pláty','Plátové rukavice','Démonické rukavice','Žraločí rukavice','Těžké nápažníky','Bojové pláty','Válečné pláty','Bramble rukavice','Upíří rukavice','Vambrace','Kruté pláty','Hydraskin rukavice'],
    boots: ['Boty','Těžké boty','Řetězové boty','Lehké plátované boty','Nákoleníky','Démonické boty','Žraločí boty','Síťované boty','Bojové boty','Válečné boty','Wyrmhide boty','Scarabshell boty','Kostěné boty','Zrcadlové boty','Myrmidon nákoleníky']
  };
  export const LOOT_ICONS = { weapon_staff:'🪄', weapon_blade:'⚔️', armor:'👘', helmet:'⛑️', shield:'🛡️', ring:'💍', amulet:'📿', gloves:'🧤', boots:'👢' };
  export const ATTR_KEYS = ['str','vit','dex','int'];
  export const ATTR_NAMES = { str:'💪 Síla', vit:'❤️ Vitalita', dex:'🎯 Obratnost', int:'🧠 Intelekt' };
  export const RARITY = {
    common: { name:'Common', color:'#e8e0e8', border:'#888' },
    magic: { name:'Magic', color:'#4a7dff', border:'#4a7dff' },
    rare: { name:'Rare', color:'#ffd700', border:'#ffd700' },
    unique: { name:'Unique', color:'#b8860b', border:'#b8860b' }
  };
