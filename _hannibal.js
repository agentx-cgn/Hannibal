/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, API3, deb, print, getAttribType, logObject, logObjectShort, logError, debug */

/*--------------- H A N N I B A L  --------------------------------------------

  An AI/Bot for 0 A.D.
  Home: https://github.com/noiv/Hannibal/blob/master/README.md

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

// very first line, enjoy
var TIMESTART = Date.now();
print("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---\n");
Engine.IncludeModule("common-api");

// Engine.PostCommand(PlayerID,{"type": "set-shading-color", "entities": [ent], "rgb": [0.5,0,0]});

// global === this ???
// for (var p in this){
//   print(p + ": " + (this[p] + "").split("\n")[0] + "\n");
// }
// global: [object global]
// Engine: [object Object]
// print: function print() {
// log: function log() {
// warn: function warn() {
// error: function error() {
// deepcopy: function deepcopy() {
// GetTechModifiedProperty: function GetTechModifiedProperty(currentTechModifications, entityTemplateData, propertyName, propertyValue) 
// DoesModificationApply: function DoesModificationApply(modification, classes) 
// Vector2D: function Vector2D(x, y) 
// Vector3D: function Vector3D(x, y, z) 
// Vector2Dprototype: [object Object]
// Vector3Dprototype: [object Object]


var HANNIBAL = (function() {

  var H = {API: API3};

  // constructor
  H.Hannibal = function(settings) {

    var rand;

    deb();deb();
    deb("------: HANNIBAL.constructor.in: PID: %s, difficulty: %s, templates: %s", settings.player, settings.difficulty, H.count(settings.templates));

    API3.BaseAI.call(this, settings);
    this.turn = 0;

    // test langage features
    // this.testJS();

    // language improvements
    // this.extendJS();

    deb();
    H.extend(this, {
      id:         settings.player,                    // used within 0 A.D.
      name:       "ai:ai",                            // ai of type ai
      config:     H.Config.get(settings.difficulty),
      settings:   settings
    });

    // seed randomizer
    rand = new H.Random(this.config.seed);

    // shortcuts
    H.Bot = this;
    H.HCQ = H.Store.Query;
    H.QRY = function(hcq, debug){return new H.HCQ(H.Bot.culture.store, hcq, debug);};
    H.random = rand.random.bind(rand);

    // check
    H.range(2).forEach(function(){deb("     R: %s", H.random());});
    H.Triggers.add(deb.bind(null, "      : Trigger -1"), -1);
    H.Triggers.add(deb.bind(null, "      : Trigger  1"),  1);

    // now freeze
    // [HANNIBAL, H, this].map(Object.freeze);
    // [HANNIBAL, H].map(Object.freeze);
    // [HANNIBAL].map(Object.freeze);

    /*
      logObject: this
        config: OBJECT (log, debug, brag, angle, seed, ...)[11]
        id: NUMBER (1)
        name: STRING (ai:ai)
        player: NUMBER (1)
        settings: OBJECT (player, difficulty, templates, ...)[3]
        turn: NUMBER (0)
      Object.__proto__
        CustomInit: (function (gameState, sharedScript) {"use strict";var SIM_UP
        OnUpdate: (function () {"use strict";var t0 = Date.now(), ctx = this.c
        extendJS: (function (players) {"use strict";Function.prototype.binda =
        initGame: (function () {"use strict";deb("**");deb("**");deb("------: 
        logPlayers: (function (players) {"use strict";var self = this, tab = H.t
    */

    deb();
    deb("------: HANNIBAL.constructor.out");
    deb();

  };

  // H.Hannibal.constructor = H.Hannibal;
  H.Hannibal.prototype = new H.API.BaseAI();
  H.Hannibal.prototype.Serialize = function() {
    deb("SERIALIZE: called");
    // return H.API.BaseAI.prototype.Serialize.call(this);
    return {test: "testa"};
  };
  H.Hannibal.prototype.Deserialize = function(data, sharedScript) {
    deb("DESERIALIZE: called");
    this.isDeserialized = false;
    logObject(data, "dataDeserialize");
    logObject(sharedScript, "sharedScriptDeserialize");
    logObject(this, "this");

    // return H.API.BaseAI.prototype.Deserialize.apply(this, arguments);
  };
  H.Hannibal.prototype.CustomInit = function(gameState, sharedScript) {

    var SIM_UPDATES = 0,
        self = this, ts, cics, prit = H.prettify,
        ss = sharedScript, gs = gameState, 
        behaviour = H.Config.getBehaviour("ai:ai", this.settings.difficulty);

    /*
      logObject: this
       *accessibility: OBJECT (width, height, length, maxVal, map, ...)[14]
       *barterPrices: OBJECT (buy, sell, ...)[2]
        config: OBJECT (log, debug, brag, angle, seed, ...)[11]
       *entities: OBJECT (_ai, _entities, _filters, _quickIter, _length, ...)[6]
       *gameState: OBJECT (ai, cellSize, buildingsBuilt, turnCache, sharedScript, ...)[15]
        id: NUMBER (1)
        name: STRING (ai:ai)
       *passabilityClasses: OBJECT (pathfinderObstruction, foundationObstruction, building-land, building-shore, default, ...)[7]
       *passabilityMap: OBJECT (width, height, data, ...)[3]
       *player: NUMBER (1)
       *playerData: OBJECT (name, civ, colour, popCount, popLimit, ...)[27]
        settings: OBJECT (player, difficulty, templates, ...)[3]
       *sharedScript: OBJECT (_players, _templates, _derivedTemplates, _techTemplates, _entityMetadata, ...)[26]
       *techModifications: OBJECT (structures/athen_civil_centre, units/athen_support_female_citizen, units/athen_support_female_citizen_house, structures/athen_blacksmith, ...)[4]
       *templates: UNDEFINED (undefined)
       *terrainAnalyzer: OBJECT (cellSize, width, height, length, maxVal, ...)[6]
       *territoryMap: OBJECT (width, height, data, ...)[3]
       *timeElapsed: NUMBER (0)
       *turn: NUMBER (0)
      Object.__proto__
        CustomInit: (function (gameState, sharedScript) {"use strict";var SIM_UP
        OnUpdate: (function () {"use strict";var t0 = Date.now(), ctx = this.c
        extendJS: (function (players) {"use strict";Function.prototype.binda =
        initGame: (function () {"use strict";deb("**");deb("**");deb("------: 
        logPlayers: (function (players) {"use strict";var self = this, tab = H.t
    */


    deb();deb();
    deb("------: HANNIBAL.CustomInit: players: %s", H.count(ss.playersData));
    deb();
    deb("     A:              width: %s [  ]", sharedScript.passabilityMap.width);
    deb("     A:             height: %s [  ]", sharedScript.passabilityMap.height);
    deb("     A:           circular: %s [  ]", sharedScript.circularMap);
    deb("     A:           cellsize: %s [  ]", gs.cellSize);
    deb("     A:       territoryMap: width: %s, height: %s", ss.territoryMap.width, ss.territoryMap.height);
    deb("     A:         _templates: %s [  ]", H.count(ss._templates));
    deb("     A:     _techTemplates: %s [  ]", H.count(ss._techTemplates));
    deb("     A:          _entities: %s [  ]", H.count(ss._entities));
    deb("     A:           _players: %s [  ]", H.count(ss.playersData));
    deb("     H: _techModifications: %s [%s]", H.count(ss._techModifications[this.id]), H.attribs(ss._techModifications[this.id]));
    deb("     H:     researchQueued: %s [  ]", H.count(ss.playersData[this.id].researchQueued));
    deb("     H:    researchStarted: %s [  ]", H.count(ss.playersData[this.id].researchStarted));
    deb("     H:    researchedTechs: %s [%s]", H.count(ss.playersData[this.id].researchedTechs), H.attribs(ss.playersData[this.id].researchedTechs).join(", "));
    deb("     A:       barterPrices: %s", H.prettify(ss.barterPrices));

    this.logPlayers(ss.playersData);


    // more shortcuts
    H.Templates         = this.settings.templates;
    H.GameState         = gameState;
    H.Entities          = gameState.entities._entities;
    H.SharedScript      = sharedScript;
    H.Player            = sharedScript.playersData[this.id];
    H.Players           = sharedScript.playersData;
    H.MetaData          = sharedScript._entityMetadata[this.id];

    this.ticks          = 0;               // increases if bot steps
    this.isTicking      = false;           // toggles after first OnUpdate
    this.initialized    = false;           // did that happen well?
    this.isFinished     = false;           // there is still no winner
    this.timing         = {all: 0};        // used to identify perf. sinks in OnUpdate

    //?? still needed ??
    // this.gameState      = gameState;
    // this.sharedScript   = sharedScript;
    // this.players        = sharedScript.playersData;

    // init grids and masks
    H.Grids.init();

    // determine own, game's and all civilisations
    this.civ            = sharedScript.playersData[this.id].civ; 
    this.civs           = H.unique(H.attribs(H.Players).map(function(id){return H.Players[id].civ;})); // in game civi
    this.civilisations  = H.Config.data.civilisation;  // all ['athen', ...]
    
    // caches fat and costly values within ticks
    H.Context           = new H.Hannibal.Context(this);       // API API
    H.Context.tick();                                         // initializes here

    // register groups
    H.Groups.init();

    // culture knowledgebase as triple store
    this.culture = new H.Culture(this.civ);
    this.culture.loadRootNodes();           // from data to triple store
    this.culture.readTemplates();           // from templates to culture
    this.culture.loadTechTemplates();       // from templates to triple store
    this.culture.loadTemplates();           // from templates to triple store
    this.culture.loadEntities();            // from game to triple store
    this.culture.loadTechnologies();        // from game to triple store
    this.culture.finalize();                // clear up


    // prepare behaviour
    H.Hannibal.Frames = H.Hannibal.Frames.initialize(this, H.Context);
    this.behaviour = new H.Hannibal.Behaviour(behaviour);
    this.frame = this.behaviour.frame;
    this.lastFrame = this.frame;

    deb("     F: starting in %s", this.frame.name);

    this.initialized = H.intialize();


    /*

    Below is for development

    */


    /* Export functions */

    if (false){
      // activate to log tech templates
      deb("-------- _techTemplates");
      deb("var techTemplates = {")
      H.attribs(ss._techTemplates).sort().forEach(function(tech){
        deb("'%s': %s,", tech, JSON.stringify(ss._techTemplates[tech]));
      })
      deb("};")
      deb("-------- _techTemplates");
      H.Config.deb = 0;
    }

    if (false){
      // activate to log templates
      // this.culture.store.exportAsLog(["athen"]);
      this.culture.store.exportAsLog(["athen", "mace", "hele"]); // 10.000 lines
      H.Config.deb = 0;
    }

    /*  End Export */



    /* run scripted actions, can shadow H.Config.sequence */

    deb();
    deb();
    H.Tester.activate();
    deb();

    /* end scripter */



    // testing Triple Store
    ts = this.culture.store;
    ts.debug = 5;

    // new H.HCQ(ts, "INGAME WITH metadata.opname = 'none'").execute("metadata", 5, 10, "all ingame entities");
    // new H.HCQ(ts, "INGAME WITH id = 44").execute("metadata", 5, 10, "entity with id");
    // new H.HCQ(ts, "INGAME").execute("position", 5, 10, "ingames with position");

    // new H.HCQ(ts, "INGAME SORT < id").execute("metadata", 5, 50, "ingames with metadata");
    new H.HCQ(ts, "TECHINGAME").execute("metadata", 5, 20, "ingame techs with metadata");

    // new H.HCQ(ts, "food.grain GATHEREDBY WITH costs.metal = 0, costs.stone = 0, costs.wood = 0 SORT < costs.food MEMBER DISTINCT HOLDBY INGAME").execute("json", 5, 10, "optional update test");

    // new H.HCQ(ts, "civilcentre CONTAIN").execute("node", 5, 10, "civilcentre via class");
    // new H.HCQ(ts, "food.grain PROVIDEDBY").execute("node", 5, 10, "civilcentre via class");
    // new H.HCQ(ts, "food.grain PROVIDEDBY").execute("node", 5, 10, "civilcentre via class");
    
    // new H.HCQ(ts, "structures.athen.civil.centre MEMBER").execute("node", 5, 10, "classes of civilcentre");

    // new H.HCQ(ts, "food.grain PROVIDEDBY").execute("costs", 5, 10, "entities providing food.grain");
    // new HCQ(ts, "HOLD CONTAIN").execute("node", 5, 10, "all garissonable entities");
    // new HCQ(ts, "infantry HOLDBY").execute("node", 5, 10, "entities holding infantry");
    // new HCQ(ts, "support, infantry HOLDBY").execute("node", 5, 10, "entities holding infantry, support");
    // new HCQ(ts, "healer, hero").execute("", 5, 10, "classes: healer, hero");
    // new HCQ(ts, "healer, hero CONTAIN").execute("costs", 5, 10, "entities from classes: healer, hero");
    // new HCQ(ts, "healer, hero CONTAIN SORT > costs.metal").execute("costs", 5, 10, "entities from classes: healer, hero");
    // new HCQ(ts, "infantry CONTAIN SORT > costs.metal").execute("costs", 5, 20, "entities from classes: healer, hero, sorted by metal");
    // new HCQ(ts, "support, infantery HOLDBY SORT > capacity").execute("capacity", 5, 10, "entities holding: healer, hero, sorted by metal");
    // new HCQ(ts, "food.grain GATHEREDBY WITH costs.metal = 0, costs.wood = 0").execute("costs", 5, 20, "entities holding: healer, hero, sorted by metal");
    // new HCQ(ts, "food.grain PROVIDEDBY WITH civ = athen").execute("costs", 5, 20, "entities holding: healer, hero, sorted by metal");
    // new HCQ(ts, "food.grain GATHEREDBY WITH costs.metal = 0, costs.wood = 0 MEMBER HOLDBY").execute("costs", 5, 20, "entities holding: healer, hero, sorted by metal");
    // new HCQ(ts, "units.athen.support.female.citizen.house REQUIRE", 2).execute("node", 5, 10, "testing for required tech");
    // new HCQ(ts, "DESCRIBEDBY").execute("node", 5, 10, "trainer for");
    // new HCQ(ts, "INGAME").execute("node", 5, 10, "trainer for");
    // new HCQ(ts, "units.athen.infantry.spearman.b TRAINEDBY").execute("node", 5, 10, "trainer for");
    // new HCQ(ts, "units.athen.infantry.spearman.b TRAINEDBY INGAME").execute("node", 5, 10, "in game trainer for");
    // new HCQ(ts, "units.athen.infantry.spearman.b TRAINEDBY DESCRIBEDBY").execute("node", 5, 10, "in game trainer for");
    // new HCQ(ts, "food.grain GATHEREDBY WITH costs.metal = 0, costs.stone = 0, costs.wood = 0 SORT < costs.food").execute("costs", 5, 10, "in game trainer for");

    this.culture.debug = 0;


    // H.Triggers.add(H.Groups.launch.bind(H.Groups, "g.grainpicker", cics[0].id), 2);
    // H.Triggers.add(H.Groups.launch.bind(H.Groups, "g.grainpicker", cics[0].id), 3);

    // playfield
    try {

      // H.range(2).forEach(function(){deb("**");});

      // keep that 
      // logObject(API3, "API3");
      // logObject(HANNIBAL, "HANNIBAL");
      // logObject(gameState, "gameState");
      // logObject(global, "global");
      // logObject(Map, "Map");
      // logObject(global.Engine, "Engine");
      // logObject(this.entities, "entities");


      // logObject(ss.resourceMaps['food'].map, "ss.resourceMaps['food'].map");
      // logObject(ss.resourceMaps['food'], "ss.resourceMaps['food']");

      // logObject(H.Bot.gameState.ai.territoryMap, "H.Bot.gameState.ai.territoryMap");

      // logObject(ss._techTemplates['phase_city'], "phase_city");
      // logObject(ss._techTemplates['phase_town_athen'], "phase_town_athen");
      // logObject(ss._techTemplates['pair_gather_01'], "pair_gather_01");
      // logObject(ss._techTemplates['heal_range'], "heal_range");
      // logObject(ss._techTemplates['heal_temple'], "heal_temple");

       // logObject(H.Templates["units/athen_support_female_citizen"], "units/athen_support_female_citizen");

      // logObject(ss._techTemplates, "ss._techTemplates");
      // logObject(sharedScript, "sharedScript");
      // logObject(sharedScript.events, "events");
      // logObject(sharedScript.playersData, "playersData");
      // logObject(sharedScript.playersData[this.id], "playersData(me)");
      // logObject(sharedScript.playersData[this.id], "Hannibal");
      // logObject(sharedScript.playersData[this.id].statistics, "Statistics");
      // logObject(EntityCollection, "EntityCollection"); // that's strange
      // logObject(new Entity(sharedScript, entity), "EntityTemplate");
      // logObject(sharedScript.passabilityClasses, "sharedScript.passabilityClasses");
      // logObject(sharedScript.passabilityMap, "sharedScript.passabilityMap");
      // logObject(sharedScript.territoryMap, "sharedScript.territoryMap");

      // H.range(2).forEach(function(){deb("**");});


    } catch(e){logError(e, "playfield");} 
    // end playfield


    // speed up debugging
    (function simTick(){
      if (SIM_UPDATES--){
        try {
          deb("  TICK: #%s", SIM_UPDATES);
          self.turn = 20;
          self.OnUpdate();
          simTick();
        } catch(e){logError(e); self.isFinished = true;}
      }
    }());

    deb();
    deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");

  };

  H.Hannibal.prototype.OnUpdate = function(sharedScript) {

    // http://trac.wildfiregames.com/wiki/AIEngineAPI

    var t0 = Date.now(),
        self = this, 
        msgTiming = "",
        secs = (H.GameState.timeElapsed/1000).toFixed(1);

    // logObject(sharedScript, "sharedScript");

    // H.GameState = sharedScript.gameState;
    // H.SharedScript = sharedScript;

    if (!this.isTicking){
      deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");
      deb();deb();
      deb("------: Hannibal.OnUpdate: startup: %s secs", ((t0 - TIMESTART)/1000).toFixed(3));
      deb();
      this.isTicking = true;
    }

    if (this.isFinished){return;}
    
    // save events, even if not processing
    H.Events.collect(this.events);

    // logObject(this, "thisOnUpdate");


    // ------------- A C T I O N   S T A R T ----------------------------------

    
    // Run the update every n turns, offset depending on player ID to balance the load
    if ((this.turn + this.player) % 8 === 5) {

      Engine.ProfileStart("Hannibal (player " + this.id +")");

      deb("STATUS: #%sa, %s|%s|%s, elapsed: %s secs, techs: %s, food: %s", 
        this.ticks, this.player, this.civ, this.frame.name, secs, 
        H.count(H.Players[this.id].researchedTechs), 
        H.GameState.playerData.resourceCounts.food
      );

      this.frame = this.behaviour.process(this); 
      if (this.lastFrame.name !== this.frame.name) {
        this.lastFrame = this.frame;
        H.Context.release();
      }

      this.timing.all = 0;
      this.timing.ctx = H.Context.tick(secs);
      this.timing.evt = H.Events.tick(secs);
      this.timing.grd = H.Grids.tick(secs);
      this.timing.tst = H.Tester.tick(secs);
      this.timing.trg = H.Triggers.tick(secs);
      this.timing.gps = H.Groups.tick(secs);
      this.timing.sts = H.Stats.tick(secs);
      this.timing.eco = H.Economy.tick(secs);

      // check for winner
      if (this.frame.name === "whiteflag") {
        this.isFinished = true;
        debug("Nothing to control. So I'll just assume I lost the game. :(");
        brag("We'll meet again, boy!");
        Engine.ProfileStop();
        return;
      }
        
      if (this.frame.name === "victory") {
        this.isFinished = true;
        debug("I do not have any target. So I'll just assume I won the game.");
        brag("You lost!");
        Engine.ProfileStop();
        return;
      }


      // prepare deb line
      H.each(this.timing, function(name, msecs){
        if (name !== "all"){
          msgTiming += H.format(", %s: %s", name, msecs);
        }
        self.timing.all += msecs;
      });
      deb("______: #%sb, %s, trigs: %s, timing: %s, all: %s ", 
        this.ticks, this.frame.name, H.Triggers.info(), msgTiming, this.timing.all
      );
      // deb("      : ECs: %s, %s", 
      //   H.SharedScript._entityCollections.length, H.attribs(H.SharedScript._entityCollectionsName)
      // );

      this.ticks++;


      // ------------- A C T I O N   E N D --------------------------------------


      deb("  ");
      
      Engine.ProfileStop();

    }

    this.turn++;

  };

  H.Hannibal.prototype.testJS = function(){

    var i, s, t;

    try {s = new Set;}               catch (e) {deb("  TEST: Set not available");}
    try {s = new Map;}               catch (e) {deb("  TEST: Map not available");}
    try {s = new WeakMap;}           catch (e) {deb("  TEST: WeakMap not available");}
    // try {s = [for (t of [1, 2]) t];} catch (e) {deb("  TEST: Array comprehension not available");}
    // shocks jsLint
    // try {s = () => "test";}          catch (e) {deb("  TEST: Fat Arraw not available");}

  };
  H.Hannibal.prototype.extendJS = function(){

    // Function.prototype.binda = function(context, params){
    //   // that's bind with a parameter array instead
    //   var pa = params  || [],
    //       cx = context || null,
    //       pl = pa.length;
    //   return (
    //     (pl ===  0) ? this.bind(cx) : 
    //     (pl ===  1) ? this.bind(cx, pa[0]) : 
    //     (pl ===  2) ? this.bind(cx, pa[0], pa[1]) : 
    //     (pl ===  3) ? this.bind(cx, pa[0], pa[1], pa[2]) : 
    //     (pl ===  4) ? this.bind(cx, pa[0], pa[1], pa[2], pa[3]) : 
    //     (pl ===  5) ? this.bind(cx, pa[0], pa[1], pa[2], pa[3], pa[4]) : 
    //     (pl ===  6) ? this.bind(cx, pa[0], pa[1], pa[2], pa[3], pa[4], pa[5]) : 
    //     (pl ===  7) ? this.bind(cx, pa[0], pa[1], pa[2], pa[3], pa[4], pa[5], pa[6]) : 
    //     (pl ===  8) ? this.bind(cx, pa[0], pa[1], pa[2], pa[3], pa[4], pa[5], pa[6], pa[7]) : 
    //     (pl ===  9) ? this.bind(cx, pa[0], pa[1], pa[2], pa[3], pa[4], pa[5], pa[6], pa[7], pa[8]) : 
    //     (pl === 10) ? this.bind(cx, pa[0], pa[1], pa[2], pa[3], pa[4], pa[5], pa[6], pa[7], pa[8], pa[9]) : 
    //       print("ERROR : Function.prototype.binda not ready for 11 or more params")
    //   );
    // };

    // Array.prototype.subtract = function(other){
    //   // returns everything from this not in other, mind duplicates or choose Sets.
    //   var i = this.length, out = [];
    //   while(i--){
    //     if (other.indexOf(this[i]) === -1){
    //       out.push(this[i]);
    //     }
    //   }
    //   return out;
    // };

  };
  H.Hannibal.prototype.logPlayers = function(players){

    var self = this, tab = H.tab, msg = "", head, props, format, tabs,
        fmtAEN = function(item){return item.map(function(b){return b ? "1" : "0";}).join("");};

    deb("**");deb("**");

    head   = "name, team, civ, phase,      pop,   ally,    enmy,      neut".split(", ");
    props  = "name, team, civ, phase, popCount, isAlly, isEnemy, isNeutral".split(", ");
    tabs   = [  10,    6,   8,    10,        5,      6,       6,         6];
    format = {
      isAlly:    fmtAEN,
      isEnemy:   fmtAEN,
      isNeutral: fmtAEN
    };

    H.zip(head, tabs, function(h, t){msg += tab(h, t);});
    deb("PLAYER: " + msg);

    H.each(players, function(id, player){
      msg = "";
      H.zip(props, tabs, function(p, t){
        msg += (format[p]) ? tab(format[p](player[p]), t) : tab(player[p], t);
      });    
      deb("     %s: %s", id, msg);
    });

    // Object: playersData(me)  ---------------
    //   cheatsEnabled: BOOLEAN (false)
    //   civ: STRING (athen)
    //   classCounts: OBJECT (Structure, ConquestCritical, Civic, Defensive, CivCentre, ...)[19]
    //   colour: OBJECT (r, g, b, a, ...)[4]
    //   entityCounts: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]
    //   entityLimits: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]
    //   heroes: ARRAY (, ...)[0]
    //   isAlly: ARRAY (false, true, false, ...)[3]
    //   isEnemy: ARRAY (true, false, true, ...)[3]
    //   isMutualAlly: ARRAY (false, true, false, ...)[3]
    //   isNeutral: ARRAY (false, false, false, ...)[3]
    //   name: STRING (Player 1)
    //   phase: STRING (village)
    //   popCount: NUMBER (17)
    //   popLimit: NUMBER (20)
    //   popMax: NUMBER (300)
    //   researchQueued: OBJECT (, ...)[0]
    //   researchStarted: OBJECT (, ...)[0]
    //   researchedTechs: OBJECT (phase_village, ...)[1]
    //   resourceCounts: OBJECT (food, wood, metal, stone, ...)[4]
    //   state: STRING (active)
    //   statistics: OBJECT (unitsTrained, unitsLost, unitsLostValue, enemyUnitsKilled, enemyUnitsKilledValue, ...)[21]
    //   team: NUMBER (-1)
    //   teamsLocked: BOOLEAN (false)
    //   techModifications: OBJECT (, ...)[0]
    //   trainingBlocked: BOOLEAN (false)
    //   typeCountsByClass: OBJECT (Structure, ConquestCritical, Civic, Defensive, CivCentre, ...)[19]

  };


return H;}());


/*


function brag(){
  if (H.Config.brag){
    // Engine.PostCommand(HANNIBAL.Hannibal.id, {"type": "chat", "message": H.format.apply(H, H.toArray(arguments))});
    // ProcessCommand({H.Hannibal.id, "type": "chat", "message": H.format.apply(H, H.toArray(arguments))});
  }
}

    // make this config
    this.descDifficulty = {
      "0": "sandbox",
      "1": "easy", 
      "2": "medium",
      "3": "hard",
      "4": "very hard"
    }[this.settings.difficulty];

    // 0 is sandbox, 1 is easy, 2 is medium, 3 is hard, 4 is very hard.
    if (this.initialized){
      switch (this.descDifficulty){
        case "sandbox":   brag("Ok, let's play sandbox. I'll steal your moulds!"); break;
        case "easy":      brag("Ok, let's keep it easy, so I can watch a TV show, too."); break;
        case "medium":    brag("You have an enemy!"); break;
        case "hard":      brag("You have an enemy!"); break;
        case "very hard": brag("You have an enemy!"); break;
      }
      
    } else {
      brag("You cheated! Play alone, looser.");
    }



*/
