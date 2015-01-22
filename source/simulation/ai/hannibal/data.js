/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, H, logObject, deb */

/*--------------- D A T A -----------------------------------------------------

  The settings for all difficulties, attempting to leave nothing in the code,
  including access functions to select values for given difficulty.


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/

HANNIBAL = (function(H){

  // group scripts
  H.Data.Groups.whitelist = [
    "launch",       // group instance launched
    "assign",       // resource added to asset
    "destroy",      // final call
    "attack",       // enemies become a thread
    "tick",         // ticking
    "connect",      // user added to shared asset
    "disConnect",   // remove user from shared asset
    "radio",        // bot radio
    "release"       // de-garrison
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
    "violent", 
    "aggressive", 
    "defensive", 
    "passive", 
    "standground"
  ];

  H.Data.formations = [
    "Scatter", 
    "Column Closed", 
    "Line Closed", 
    "Column Open", 
    "Line Open", 
    "Battle Line",
    "Box",
    "Flank",
    "Skirmish",
    "Wedge",
    "Phalanx",
    "Syntagma",
    "Testudo"
  ];

  // see mods/public/civs
  H.Data.Factions = {
    celts: {
      plus: "",
      cons: "",
    },
    hellenes: {
      plus: "theatron/area",
      cons: "",
    },
  };

  H.Data.Civilisations = {
    athen:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Athenians‎",
      faction: "celt",
      plus: "",
      cons: "",
    },
    brit:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Britons",
      faction: "celt",
      plus: "war dogs, kennels",
      cons: "",
    },
    cart:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ:_Carthaginians‎",
      plus: "triple walls, shipyard, embassies",
      cons: "",
    },
    celt:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Celts",
    },
    gaul:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Gauls‎",
      faction: "celt",
      plus: "",
      cons: "",
    },
    hele:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Hellenes‎",
    },
    iber:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Iberians‎",
      plus: "pre wall, flames, towers!",
      cons: "",
    },
    mace:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Macedonians",
    },
    maur:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Mauryans",
      plus: "330 pop, elephants",
      cons: "",
    },
    pers:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Persians‎",
      plus: "330 pop",
      cons: "",
    },
    ptol:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Ptolemies‎",
      plus: "camps",
      cons: "",
    },
    rome:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Romans_Republican",
    },
    sele:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Seleucids",
      plus: "camps",
      cons: "",
    },
    spart: {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Spartans‎",
      faction: "hellenes, females for towers",
      plus: "upgrades",
      cons: "",
    },
    theb:  {
      active: false,
      wiki: "",
    }
  };


  // nodes civs borrows from other civs //TODO: check the real template
  // init is post poned
  H.Data.RootNodes = function(){ return {

    "*": {
      "animal":                  {key: "animal",   template: {Identity: {GenericName: "Generic",  Tooltip: "a class imported from H.Data"}}},
      "elephant":                {key: "elephant",   template: {Identity: {GenericName: "Generic",  Tooltip: "a class imported from H.Data"}}},
      "seacreature":             {key: "seacreature",   template: {Identity: {GenericName: "Generic",  Tooltip: "a class imported from H.Data"}}},
      "domestic":                {key: "domestic", template: {Identity: {GenericName: "Generic",  Tooltip: "a class imported from H.Data"}}},
      "palisade":                {key: "palisade", template: {Identity: {GenericName: "Generic",  Tooltip: "a class imported from H.Data"}}},
      "gaia.fauna.sheep":        {key: "gaia/fauna_sheep", template: H.Templates["gaia/fauna_sheep"] },
      "gaia.fauna.fish":         {key: "gaia/fauna_fish", template: H.Templates["gaia/fauna_fish"] },
      "other.wallset.palisade":  {key: "other/wallset_palisade", template: H.Templates["other/wallset_palisade"] },
    },

    "athen": {
      
    },

    "hele": {
      "wonder":                  {key: "wonder",                  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "structures.hele.wonder":  {key: "structures/hele_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "units.mace.thureophoros": {key: "units/mace_thureophoros", template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "units.mace.thorakites":   {key: "units/mace_thorakites",   template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    "mace": {
      "wonder":                  {key: "wonder",                  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "units.hele.ship.bireme":  {key: "units/hele_ship_bireme",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "units.hele.ship.trireme": {key: "units/hele_ship_trireme", template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "structures.mace.wonder":  {key: "structures/mace_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    "spart": {
      "wonder":                   {key: "wonder",                   template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "units.hele.hero.leonidas": {key: "units/hele_hero_leonidas", template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "structures.spart.wonder":  {key: "structures/spart_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "other.hellenic.stoa":      {key: "other/hellenic_stoa",      template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    "celt": {
      "wonder":                   {key: "wonder",                  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "structures.celt.wonder":   {key: "structures/celt_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    "gaul": {
      "wonder":                   {key: "wonder",                  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "structures.gaul.wonder":   {key: "structures/gaul_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    "iber": {
      "wonder":                   {key: "wonder",                  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "structures.iber.wonder":   {key: "structures/iber_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    "maur": {
      "siege":                    {key: "siege",                   template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
    },

    "ptol": {
      "units.ptol.hero.ptolemy.i":   {key: "units/ptol_hero_ptolemy_i",  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "units.ptol.hero.ptolemy.iv":  {key: "units/ptol_hero_ptolemy_iv", template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "units.ptol.mechanical.siege.lithobolos.packed": {key: "units/ptol_mechanical_siege_lithobolos_packed", template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
    },

    "sele": {
      "units.sele.cavalry.javelinist.b": {key: "units/sele_cavalry_javelinist_b", template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
    },


  };};


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
  ];

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

return H; }(HANNIBAL));
