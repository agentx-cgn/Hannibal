/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, H, logObject, deb */

/*--------------- C O N F I G --------------------------------------------

  The settings for all difficulties, attempting to leave nothing in the code,
  including access functions to select values for given difficulty.


  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Config = {

    //logging 0=zero, 1=errors, 2=1+warnings, 3=2+info, 4=everything
    deb:      4,                   // enables messages to dbgView via _xdebug.js.deb()
    con:      1,                   // enables messages to the in game console via _xdebug.js.con()

    // "" disables H.Tester
    sequence:                "brain01",
    // sequence: "Forest Battle",

    // enable psy-ops
    brag:                    true,  

    angle:                   3 * Math.PI/4,       // depends on first CC

    attackRelax:             2,     

    data:                    {
      sharedBuildingClasses: ['civilcentre', 'blacksmith', 'farmstead'],
      prey:                  ["chicken", "sheep", "pig", "goat"], // possible food resources
    },

    numerus: {
      enabled:              true,
      file:                 "/home/noiv/Desktop/0ad/stats.csv",
      resolution:           10       // 10 = 16 secs
    },

    economy: {
      lengthStatsBuffer:    40, // approx 1 minute
      intervalMonitorGoals: 10,
      maxAllocations:        5, // for producers
    },

    civs : {
      athen:  {
        builders: 2,
      },
      brit:  {
        builders: 2,
      },
      cart:  {
        builders: 2,
      },
      celt:  {
        builders: 2,
      },
      gaul:  {
        builders: 2,
      },
      hele:  {
        builders: 2,
      },
      iber:  {
        builders: 2,
      },
      mace:  {
        builders: 2,
      },
      maur:  {
        builders: 4,
      },
      pers:  {
        builders: 2,
      },
      ptol:  {
        builders: 2,
      },
      rome:  {
        builders: 2,
      },
      sele:  {
        builders: 2,
      },
      spart:  {
        builders: 2,
      },
      theb:  {
        builders: 2,
      },
    },

    //TODO: run preflight check, whether all these frames are actually available
    behaviours: {
      "ai:ai":              {
        entry:              "whiteflag",
        whiteflag:          ["village"],
        village:            ["populate", "town", "victory"],
        town:               ["expand", "defense", "city", "victory"],
        city:               ["attack", "defense", "attack", "victory"],
        victory:            [],
      },
      "ai:ai:1":            {
        village:            ["populate", "technology", "town", "victory"],
      },
      "ai:mayor:main":      {
        entry:              "build",
        groups:             {
          grainpicker:      {min: 1, max:  3, amount: 1},
          // hunter:       {priority: 1, max: 20, amount: 1},
          // lumberjack:       {priority: 1, max: 20, amount: 1},
          // stoner:           {priority: 2, max: 20, amount: 1},
          // miner:            {priority: 3, max: 20, amount: 1},
        },
        build:              ["food", "wood", "houses", "expand"],
        expand:             ["food", "wood", "houses", "technology", "defense"],
      },
      "mayor:grainpicker" : {
        entry:              "gather",
        gather:             ["find", "sustain"]  // garrison, heal, no reaeson to dissolve
      }
    },

    getBehaviour: function (name, difficulty){

      var basic, upgrade, i = difficulty;

      // deb("getBehaviour: %s, %s", name, difficulty);

      // pick most simple
      basic = H.Config.behaviours[name];
      basic.name = H.format("%s:%s", name, 0);

      // upgrade matching difficulty, downgrade if needed
      while(i--){
        upgrade = H.Config.behaviours[H.format("%s:%s", name, i)];
        if (upgrade){
          H.extend(basic, upgrade);
          basic.name = H.format("%s:%s", name, i);
          break;
        }
      }

      // logObject(basic, H.format("getBehaviour: %s (%s)", name, difficulty));

      return basic;

    },
    get: function (difficulty){

      var C = H.Config;

      C.difficulty = difficulty;

      switch (difficulty){

        // 0 is sandbox, 1 is easy, 2 is medium, 3 is hard, 4 is very hard.
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:



        break;

        default:
          // debugE("Config: unknown difficilty! %s", difficulty);
          return {};

      }

      return C;

    }

  };

  H.Data = H.Data || {};

  // planning depth for civs
  // H.Data.Depths = {};

  // allowed group instance event handlers
  
  H.Data.Groups = H.Data.Groups || {};

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


return H; }(HANNIBAL));

