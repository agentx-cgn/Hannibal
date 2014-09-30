/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Hannibal, H, deb */

/*--------------- H A N N I B A L  --------------------------------------------

  Raw data, mainly civilisation infos


  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = function(H){

  H.Data = H.Data || {};
  H.Data.Groups = H.Data.Groups || {};

  // allowed group instance event handlers
  H.Data.Groups.whitelist = [
    "onLaunch",       // group instance launched
    "onAssign",       // resource added to asset
    "onDestroy",      // final call
    "onAttack",       // enemies become a thread
    "onInterval",     // ticking
    "onConnect",      // user added to shared asset
    "onDisConnect",   // remove user from shared asset
    "onBroadcast",    // bot radio
    "onRelease"       // de-garrison
  ];

  // Triple Store Verbs, in order of frequency with ingames first
  H.Data.verbs = [
    "ingame",     "describedby",      // ingame entities and their templates
    "techingame", "techdescribedby",  // ingame technologies and their templates 
    "member",     "contain",          // classes have entities as members
    "build",      "buildby",          // units building structures
    "gather",     "gatheredby",       // units picking resources types: food.gran, wood.tree, treasure
    "carry",      "carriedby",        // entities carrying resources: wood, stone, metal, food
    "hold",       "holdby",           // structures garrison units
    "require",    "enable",           // entities require/enable technologies: phase.town, unlock.female.houses
    "pair",       "pairedby",         // coupled technologies
    "train",      "trainedby",        // structures training units
    "research",   "researchedby",     // entities research technologies
    "accept",     "acceptedby",       // dropsites accepts resources: wood, stone, metal, food
    "heal",       "healedby",         // entities heal classes
    "provide",    "providedby",       // Entities provide resourcetype: food.grain, stone.ruins
    "supersede",  "supersededby",     // chained technologies
  ];

  H.Data.stances = [
    'violent', 
    'aggressive', 
    'defensive', 
    'passive', 
    'standground'
  ];

  H.Data.formations = [
    'Scatter', 
    'Column Closed', 
    'Line Closed', 
    'Column Open', 
    'Line Open', 
    'Battle Line',
    'Box',
    'Flank',
    'Skirmish',
    'Wedge',
    'Phalanx',
    'Syntagma',
    'Testudo'
  ];

  // see mods/public/civs
  H.Data.Civilisations = {
    athen:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Athenians‎",
    },
    brit:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Britons",
    },
    cart:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ:_Carthaginians‎",
    },
    celt:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Celts",
    },
    gaul:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Gauls‎",
    },
    hele:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Hellenes‎",
    },
    iber:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Iberians‎",
    },
    mace:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Macedonians",
    },
    maur:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Mauryans",
    },
    pers:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Persians‎",
    },
    ptol:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Ptolemies‎",
    },
    rome:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Romans_Republican",
    },
    sele:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Seleucids",
    },
    spart: {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Spartans‎",
    },
    theb:  {
      active: false,
      wiki: "",
    }
  };


  // nodes civs borrows from other civs //TODO: check the real template
  // init is post poned
  H.Data.RootNodes = function(){ return {

    '*': {
      "animal":                  {key: "animal",   template: {Identity: {GenericName: "Generic",  Tooltip: "a class imported from H.Data"}}},
      "elephant":                {key: "elephant",   template: {Identity: {GenericName: "Generic",  Tooltip: "a class imported from H.Data"}}},
      "seacreature":             {key: "seacreature",   template: {Identity: {GenericName: "Generic",  Tooltip: "a class imported from H.Data"}}},
      "domestic":                {key: "domestic", template: {Identity: {GenericName: "Generic",  Tooltip: "a class imported from H.Data"}}},
      "palisade":                {key: "palisade", template: {Identity: {GenericName: "Generic",  Tooltip: "a class imported from H.Data"}}},
      "gaia.fauna.sheep":        {key: "gaia/fauna_sheep", template: H.Templates['gaia/fauna_sheep'] },
      "gaia.fauna.fish":         {key: "gaia/fauna_fish", template: H.Templates['gaia/fauna_fish'] },
      "other.wallset.palisade":  {key: "other/wallset_palisade", template: H.Templates['other/wallset_palisade'] },
    },

    'athen': {
      
    },

    'hele': {
      "wonder":                  {key: "wonder",                  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "structures.hele.wonder":  {key: "structures/hele_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "units.mace.thureophoros": {key: "units/mace_thureophoros", template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "units.mace.thorakites":   {key: "units/mace_thorakites",   template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    'mace': {
      "wonder":                  {key: "wonder",                  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "units.hele.ship.bireme":  {key: "units/hele_ship_bireme",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "units.hele.ship.trireme": {key: "units/hele_ship_trireme", template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "structures.mace.wonder":  {key: "structures/mace_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    'spart': {
      "wonder":                   {key: "wonder",                   template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "units.hele.hero.leonidas": {key: "units/hele_hero_leonidas", template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "structures.spart.wonder":  {key: "structures/spart_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "other.hellenic.stoa":      {key: "other/hellenic_stoa",      template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    'celt': {
      "wonder":                   {key: "wonder",                  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "structures.celt.wonder":   {key: "structures/celt_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    'gaul': {
      "wonder":                   {key: "wonder",                  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "structures.gaul.wonder":   {key: "structures/gaul_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    'iber': {
      "wonder":                   {key: "wonder",                  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "structures.iber.wonder":   {key: "structures/iber_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    'maur': {
      "siege":                    {key: "siege",                   template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
    },

    'ptol': {
      "units.ptol.hero.ptolemy.i":   {key: "units/ptol_hero_ptolemy_i",  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "units.ptol.hero.ptolemy.iv":  {key: "units/ptol_hero_ptolemy_iv", template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "units.ptol.mechanical.siege.lithobolos.packed": {key: "units/ptol_mechanical_siege_lithobolos_packed", template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
    },

    'sele': {
      "units.sele.cavalry.javelinist.b": {key: "units/sele_cavalry_javelinist_b", template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
    },


  }};


  H.Data.Explorer = H.Data.Explorer || {};
  H.Data.Explorer.examples = [
    "MEMBER",
    "MEMBER DISTINCT",
    "siege HOLDBY",
    "structures.athen.market REQUIRE",
    "phase.town.athen RESEARCHEDBY",
    "structures.athen.civil.centre RESEARCH",
    "RESEARCH DISTINCT SORT < name",
    "RESEARCH DISTINCT SORT < name WITH costs.metal > 0",
    "RESEARCH DISTINCT SORT < name WITH requires.tech = 'phase.city'"
  ]

  H.Data.ClassInfo = {
    'aqua':        "Vegetation on water.",
    'bow':         "Infantry Archer, Cavalry Archer.",
    'cavalry':     "This is a variation of a Citizen Soldier (units with economic and military capabilities) that rides on a beast or is pulled by a beast. All Cavalry Citizen Soldiers: Cavalry Swordsman, Cavalry Spearman, Cavalry Javelinist, Cavalry Archer.",
    // 'civic':       "Structures that 'serve the people'.",
    'citizensoldier': "Land units that serves a dual economic and military role (split into Infantry Citizen Soldiers and Cavalry Citizen Soldiers): Infantry Swordsman, Infantry Spearman, Infantry Javelinist, Infantry Archer, Infantry Slinger, Cavalry Swordsman, Cavalry Spearman, Cavalry Javelinist, Cavalry Archer. ",
    'defensive':   "Defensive Structures: Outpost, Wall, Tower, Gate, (any Wall or Tower SBs).",
    'economic':    "Structures that promote an economy.",
    'farmstead':   "Building to drop food.",
    'fauna':       "These are animals. Some are sources of Food.",
    'flora':       "These are forms of vegetation. Vegetation on dry land.",
    'foot':        "Non-mounted infantry, support and special infantry: Infantry Citizen Soldiers, Female Citizen, Healer, Super Infantry Unit, non-mounted Heroes.",
    'gaia':        "an entity that represents 'nature'.",
    'gaiabuilding': "A special building unique to Gaia (such as a Settlement).",
    'geo':         "Non-living. Inorganic. These are rocks, minerals and anything in nature that isn't 'alive'.",
    'hero':        "This is a legendary unit that is unique to a civilisation and has special powers. A significant figure from the civilisation's history: (all three Heroes for this civilisation).",
    'house':       "Housing Structures: Civilian Centre, House, Farmstead, Dock, Market, Temple, Fortress.", 
    'infantry':    "This is a variation of a Citizen Soldier (units with economic and military capabilities) that walks on foot. All Infantry Citizen Soldiers: Infantry Swordsman, Infantry Spearman, Infantry Javelinist, Infantry Archer, Infantry Slinger.",
    'javelin':     "Infantry Javelinist, Cavalry Javelinist.",
    'mechanical':  "This unit is a mechanical weapon. A mechanical conveyance or weapon: Onager, Ballista, Ram, Merchantman, Bireme, Trireme, Quinquereme, Super Siege Unit (if applicable).",
    'melee':       "Units that fight in hand-to-hand combat, typically associated with hack attack. (All units with a melee weapon.)",
    'military':    "Structures that provide for the defense. Non-mechanical land units capable of attacking opposing units: Infantry Citizen Soldiers, Cavalry Citizen Soldiers, Super Units and Heroes. ",
    'mineral':     "Typically a source of Ore.",
    'mounted':     "A 'humanoid' unit that rides some kind of mount (horseback, camelback, donkey, animal drawn cart, elephant or chariot): Cavalry Citizen Soldiers, Super Cavalry Units, mounted Heroes.",
    // 'norm':        "This is a normal structure.  Some structures serve as training centres for units and gateways to researching of technologies.",
    'offensive':   "Military Production Structures: Civilian Centre, Barracks, Dock, Fortress.",
    'organic':     "All units that aren't in the Mechanical category (basic and special infantry and cavalry, and support units).",
    'other':       "anything that isn't a Unit, Structure, or Gaia (eg a projectile).",
    'phase.city':  "City Phase Structures: Fortress, (any SBs).",
    'phase.town':  "Town Phase Structures: Barracks, Market, Temple, Dock. ",
    'phase.village': "Village Phase Structures: Civilian Centre, House, Mill, Farmstead, Field, Corral, Outpost, Wall, Tower, Gate. ",
    'plant':       "This is low lying vegetation. They're typically just eye candy.",
    'projectile':  "An airborne weapon that causes damage.",
    'ranged':      "Units that fight with missile weapons, typically associated with pierce attack. (All units with a ranged weapon.)",
    'resource':    "Any entity from which a resource may be collected. Or this is not a structure at all, but a resource that can be 'built' by a player (fields and corrals).",
    'rock':        "Typically a source of Stone.",
    'ship':        "Provide passage over waterways. Merchantman, Bireme, Trireme, Quinquereme. ",
    'siege':       "Typically units whose purpose is the destruction of structures. Onager, Ballista, Land Ram. ",
    'sling':       "Infantry Slinger.",
    'spear':       "Infantry Spearman, Cavalry Spearman. ",
    'special':     "Anything that doesn't fit the above categories.",
    'stone':       "(Civ-dependent; Structures constructed of stone).",
    'structure':   "an entity that doesn't move around, but may be controlled by the player.",
    'superunit':   "This unit is unique to a civilisation and has special traits that make it unique and super. A particularly powerful, rare and expensive unit, typically unique to a civilisation, and more likely than most units to require unique content. Its closest relation would probably be the Ao(x) UU: Super Infantry Unit, Super Cavalry/Siege Unit. ",
    'supply':      "Resource Structures: Civilian Centre, Mill, Farmstead.",
    'support':     "These units do not have any military capabilities. Female Citizen, Healer, Trader. ",
    'sword':       "Infantry Swordsman, Cavalry Swordsman. ",
    'tower':       "Tower Structures: Outpost, Tower, (any Tower SBs).", 
    'trade':       "Trader, Merchantman. ",
    'tree':        "This is tall vegetation. They're typically a source of Wood.",
    'unit':        "an entity that can move around and may be controllable by a player.",
    'wall':        "Wall Structures: Wall, (any Wall SBs).", 
    'warship':     "A naval unit serving only a military purpose: Bireme, Trireme, Quinquereme. ",
    'wood':        "(Civ-dependent; Structures constructed of wood).",
    'worker':      "Infantry Swordsman, Infantry Spearman, Infantry Javelinist, Infantry Archer, Infantry Slinger, Female Citizen.",
  };

  H.Data.Depths = {
    // "spart": {},
    // "athen": {
    //   "structures.athen.civil.centre":  1,
    //   "units.athen.support.female.citizen":  8,
    //   "units.athen.cavalry.javelinist.b":  9,
    //   "units.athen.infantry.slinger.b":  9,
    //   "units.athen.infantry.spearman.b":  9,
    //   "other.wallset.palisade":  18,
    //   "structures.athen.dock":  22,
    //   "structures.athen.outpost":  22,
    //   "structures.athen.corral":  22,
    //   "structures.athen.field":  22,
    //   "structures.athen.farmstead":  22,
    //   "structures.athen.storehouse":  22,
    //   "structures.athen.house":  22,
    //   "structures.athen.barracks":  23,
    //   "units.athen.support.female.citizen.house":  28,
    //   "units.athen.ship.fishing":  33,
    //   "gaia.fauna.sheep":  33,
    //   "decay.outpost":  34,
    //   "vision.outpost":  34,
    //   "gather.wicker.baskets":  34,
    //   "armor.ship.reinforcedhull":  34,
    //   "gather.animals.stockbreeding":  34,
    //   "phase.town.athen":  40,
    //   "structures.athen.wallset.stone":  51,
    //   "structures.athen.market":  55,
    //   "structures.athen.temple":  55,
    //   "structures.athen.blacksmith":  55,
    //   "structures.athen.defense.tower":  56,
    //   "units.athen.ship.merchant":  66,
    //   "units.athen.ship.trireme":  67,
    //   "units.athen.ship.bireme":  67,
    //   "units.athen.cavalry.swordsman.b":  68,
    //   "units.athen.infantry.javelinist.b":  68,
    //   "units.athen.support.healer.b":  70,
    //   "speed.trader.01":  71,
    //   "units.athen.support.trader":  71,
    //   "gather.farming.plows":  78,
    //   "armor.ship.hypozomata":  78,
    //   "upgrade.rank.advanced.infantry":  80,
    //   "phase.city.athen":  82,
    //   "structures.athen.fortress":  109,
    //   "structures.athen.prytaneion":  110,
    //   "structures.athen.theatron":  110,
    //   "structures.athen.gymnasion":  110,
    //   "structures.athen.wonder":  111,
    //   "armor.hero.01":  112,
    //   "siege.bolt.accuracy":  129,
    //   "units.athen.mechanical.siege.lithobolos.packed":  129,
    //   "units.athen.mechanical.siege.oxybeles.packed":  129,
    //   "units.athen.hero.iphicrates":  130,
    //   "units.athen.hero.pericles":  130,
    //   "units.athen.hero.themistocles":  130,
    //   "units.athen.champion.ranged":  130,
    //   "units.athen.champion.infantry":  130,
    //   "hellenes.special.iphicratean.reforms":  131,
    //   "hellenes.special.long.walls":  131,
    //   "armor.ship.hullsheathing":  132,
    //   "training.conscription":  133,
    //   "upgrade.rank.elite.infantry":  137,
    //   "training.naval.architects":  140,
    //   "units.athen.infantry.archer.b":  150,
    //   "units.athen.champion.marine":  150,
    // }
  };

return H; }(HANNIBAL);
