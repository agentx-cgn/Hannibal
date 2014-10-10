/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, API3, deb, print, logObject, logError, TESTERDATA, uneval */

/*--------------- H A N N I B A L  --------------------------------------------

  An AI/Bot for 0 A.D.
  Home: https://github.com/noiv/Hannibal/blob/master/README.md

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

  Credits:

    kmeans: 
    pythonic slicing:
    helper:

*/

// very first line, enjoy
var TIMESTART = Date.now();

print("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### --- " + new Date() + "\n");
print("#! xdotool init\n");

Engine.IncludeModule("common-api");


var HANNIBAL = (function() {

  var H = {
    API: API3,
    extend: function (o){
      Array.prototype.slice.call(arguments, 1)
        .forEach(e => {Object.keys(e)
          .forEach(k => o[k] = e[k]
    );});},
    throw: function(msg){
      throw "\n" + msg + "\n" + new Error().stack;      
    },
    chat: function(msg){
      Engine.PostCommand(H.Bot.id, {"type": "chat", "message": msg});
    }
  };

  // constructor
  H.Hannibal = function(settings) {

    API3.BaseAI.call(this, settings);

    H.Bot = this;

    H.extend(this, {
      turn:       0,                                  // increments on AI ticks, not bot ticks
      settings:   settings,                           // from user dialog
      id:         settings.player,                    // used within 0 A.D.
      config:     H.Config.get(settings.difficulty),  // 
    });

    deb();
    deb("------: HANNIBAL.constructor.out");

  };

  H.Hannibal.prototype = new H.API.BaseAI();
  H.Hannibal.prototype.CustomInit = function(gameState, sharedScript) {

    var SIM_UPDATES = 0,
        self = this, 
        ts, ss = sharedScript, gs = gameState, 
        map = TESTERDATA ? TESTERDATA.map : "unkown";

    deb();deb();
    deb("------: HANNIBAL.CustomInit: Players: %s, PID: %s, difficulty: %s", H.count(ss.playersData), this.id, this.settings.difficulty);
    deb();
    deb("     A:    map from tester:  %s", map);
    deb("     A:                map: w: %s, h: %s, c: %s, cells: %s", ss.passabilityMap.width, ss.passabilityMap.height, ss.circularMap, gs.cellSize);
    deb("     A:          _entities: %s [  ]", H.count(ss._entities));
    deb("     A:         _templates: %s [  ]", H.count(ss._templates));
    deb("     A:     _techTemplates: %s [  ]", H.count(ss._techTemplates));
    deb("     H: _techModifications: %s [%s]", H.count(ss._techModifications[this.id]), H.attribs(ss._techModifications[this.id]));
    deb("     H:     researchQueued: %s [  ]", H.count(ss.playersData[this.id].researchQueued));
    deb("     H:    researchStarted: %s [  ]", H.count(ss.playersData[this.id].researchStarted));
    deb("     H:    researchedTechs: %s [%s]", H.count(ss.playersData[this.id].researchedTechs), H.attribs(ss.playersData[this.id].researchedTechs).join(", "));
    deb("     A:       barterPrices: %s", H.prettify(ss.barterPrices));

    this.logPlayers(ss.playersData);

    // more shortcuts
    H.QRY               = function(hcq, debug){return new H.Store.Query(H.Bot.culture.store, hcq, debug);};
    H.GameState         = gameState;
    H.SharedScript      = sharedScript;
    H.Templates         = this.settings.templates;
    H.TechTemplates     = H.SharedScript._techTemplates;
    H.Entities          = H.GameState.entities._entities;
    H.Player            = H.SharedScript.playersData[this.id];
    H.Players           = H.SharedScript.playersData;
    H.MetaData          = H.Proxies.MetaData();
    H.Technologies      = H.Proxies.Technologies(); //sharedScript._techTemplates;

    // deb(uneval(H.SharedScript.passabilityClasses));
    // pathfinderObstruction:1, foundationObstruction:2, 'building-land':4, 'building-shore':8, default:16, ship:32, unrestricted:64

    this.ticks          = 0;                // increases if bot steps
    this.isTicking      = false;            // toggles after first OnUpdate
    this.initialized    = false;            // did that happen well?
    this.isFinished     = false;            // there is still no winner
    this.timing         = {all: 0};         // used to identify perf. sinks in OnUpdate

    // determine own, game's
    this.civ            = H.Players[this.id].civ; 
    this.civs           = H.unique(H.attribs(H.Players).map(function(id){return H.Players[id].civ;})); // in game civi
    
    // launch the stats extension
    H.Numerus.init();                       

    this.tree    = new H.TechTree(this.id);  // analyse templates of bot's civ
    this.culture = new H.Culture(this.tree); // culture knowledgebase as triple store
    this.culture.searchTemplates();          // extrcact classes, resources, etc from templates
    this.culture.loadNodes();                // turn templates to nodes
    this.culture.loadEdges();                // add edges
    this.culture.loadEntities();             // from game to triple store
    this.culture.loadTechnologies();         // from game to triple store
    this.culture.finalize();                 // clear up
    this.tree.finalize();                    // caches required techs, producers for entities

    // init map, grids and related services
    H.Map.width         = H.SharedScript.passabilityMap.width;
    H.Map.height        = H.SharedScript.passabilityMap.height;
    H.Map.circular      = H.SharedScript.circularMap;
    H.Map.cellsize      = H.GameState.cellSize;

    H.Grids.init();                         // inits advanced map analysis
    // H.Grids.dump(map);                      // dumps all grids with map prefix in file name
    // H.Grids.pass.log();

    H.Resources.init();                      // extracts resources from all entities
    H.Resources.log();
    H.Scout.init();                          // inits scout extension for scout group
    H.Groups.init();                         // registers groups
    H.Villages.init();

    // prepare planner cache
    H.Planner = new H.HTN.Planner({
      name:      "eco.planner",
      operators: H.HTN.Economy.operators,
      methods:   H.HTN.Economy.methods,
      verbose:   1
    });

    H.HTN.Economy.initialize(H.Planner, this.tree);
    // H.HTN.Economy.report("startup test");
    // H.HTN.Economy.test({tech: ['phase.town']});
    this.tree.export(); // filePattern = "/home/noiv/Desktop/0ad/tree-%s-json.export";

    // Now make an action plan to start with
    H.Producers.init(this.tree);
    H.Brain.init();
    H.Economy.init();

    /*

    Below is for development

    */


    /* Export functions */

    if (false){
      // activate to log tech templates
      deb("-------- _techTemplates");
      deb("var techTemplates = {");
      H.attribs(ss._techTemplates).sort().forEach(function(tech){
        deb("'%s': %s,", tech, JSON.stringify(ss._techTemplates[tech]));
      });
      deb("};");
      deb("-------- _techTemplates");
      H.Config.deb = 0;
    }

    if (false){
      // activate to log templates
      // this.culture.store.export(Object.keys(H.Data.Civilisations).filter(c => H.Data.Civilisations[c].active)); 
      this.culture.store.export(["athen"]); 
      // this.culture.store.exportAsLog(["athen"]);
      // this.culture.store.export(["athen", "mace", "hele"]); // 10.000 lines
      // this.culture.store.export(["athen"]); 
      // print("#! terminate");
    }

    /*  End Export */


    // lof tech modifications
    if (false){

      deb();deb();deb("      : Technologies ---------");
      var affects, modus, list = [];
      H.each(H.Technologies, function(key, tech){
        if (tech.modifications){
          tech.modifications.forEach(function(mod){
            modus = (
              mod.add      !== undefined ? "add" :
              mod.multiply !== undefined ? "multiply" :
              mod.replace  !== undefined ? "replace" :
                "wtf"
            );
            affects = tech.affects ? tech.affects.join(" ") : mod.affects ? mod.affects : "wtf";
            list.push([H.saniTemplateName(key), mod.value, modus, mod[modus], affects]);
          });
        }
      });
      debTable("TEX", list, 1);
      deb("      : end ---------");
      H.Config.deb = 0;
    }


    /* run scripted actions named in H.Config.sequence */

    deb();
    deb();
    H.Tester.activate();
    deb();

    /* end scripter */



    // testing Triple Store
    ts = this.culture.store;
    ts.debug = 5;

    // H.QRY("PAIR DISTINCT").execute("metadata", 5, 10, "paired techs");
    // H.QRY("TECHINGAME").execute("metadata", 5, 20, "ingame techs with metadata");

    // H.QRY("gather.lumbering.ironaxes").execute("metadata", 5, 10, "check");

    // new H.HCQ(ts, "INGAME WITH metadata.opname = 'none'").execute("metadata", 5, 10, "all ingame entities");
    // new H.HCQ(ts, "INGAME WITH id = 44").execute("metadata", 5, 10, "entity with id");
    // new H.HCQ(ts, "INGAME").execute("position", 5, 10, "ingames with position");

    // new H.HCQ(ts, "INGAME SORT < id").execute("metadata", 5, 80, "ingames with metadata");

    // new H.HCQ(ts, "TECHINGAME").execute("metadata", 5, 20, "ingame techs with metadata");
    // new H.HCQ(ts, "stone ACCEPTEDBY INGAME").execute("metadata", 5, 20, "stone drop");

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

      // deb("------: Techs");
      // H.each(H.TechTemplates, function(name, tech){
      //   if (tech.modifications){
      //     var aff = tech.affects ? uneval(tech.affects) : "";
      //     var req = tech.requirements ? uneval(tech.requirements) : "";
      //     var mod = tech.modifications ? uneval(tech.modifications) : "";
      //     deb("%s;%s;%s;%s;%s", name, tech.genericName||"", req, aff, mod);
      //   }
      // });
      // deb("------: Techs end");

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
      // logObject(sharedScript.gameState, "sharedScript.gameState");
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

    var 
      t0 = Date.now(),
      critical = "",
      self = this, 
      msgTiming = "",
      secs = (H.GameState.timeElapsed/1000).toFixed(1),
      map = TESTERDATA ? TESTERDATA.map : "unkown";

    // update shortcuts
    H.Player            = sharedScript.playersData[this.id];
    H.SharedScript      = sharedScript;
    H.TechTemplates     = H.SharedScript._techTemplates;
    // H.Entities          = H.GameState.entities._entities;
    H.Player            = H.SharedScript.playersData[this.id];
    H.Players           = H.SharedScript.playersData;
    H.MetaData          = H.SharedScript._entityMetadata[this.id];
    // H.Technologies      = H.Proxies.Technologies(); //sharedScript._techTemplates;

    if (!this.isTicking){
      deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");
      deb();deb();
      deb("------: OnUpdate: startup: %s secs, map: '%s'", ((t0 - TIMESTART)/1000).toFixed(3), map);
      deb();
      this.isTicking = true;
    }

    if (this.isFinished){return;}

    if (H.Tester.OnUpdate){
      H.Engine.chat("OnUpdate");
      H.Tester.OnUpdate();
    } else {
      // H.Engine.chat("no OnUpdate");
    }
    
    // save events, even if not processing
    H.Events.collect(this.events);

    // logObject(this, "thisOnUpdate");


    // ------------- A C T I O N   S T A R T ----------------------------------

    
    // Run the update every n turns, offset depending on player ID to balance the load
    if ((this.turn + this.player) % 8 === 5) {

      Engine.ProfileStart("Hannibal (player " + this.id +")");

      deb("STATUS: #%sa, %s, %s, elapsed: %s secs, techs: %s, food: %s, wood: %s, metal: %s, stone: %s", 
        this.ticks, this.player, this.civ, secs, 
        H.count(H.Players[this.id].researchedTechs), 
        H.Player.resourceCounts.food,
        H.Player.resourceCounts.wood,
        H.Player.resourceCounts.metal,
        H.Player.resourceCounts.stone
      );

      if (this.ticks === 0){

        // subscribe to messages
        this.culture.activate();
        H.Brain.activate();
        H.Groups.activate();
        H.Villages.activate();
        H.Economy.activate();

        // allow processing autoresearch first
        this.timing.all = 0;
        this.timing.tst = H.Tester.tick(  secs, this.ticks);
        this.timing.trg = H.Triggers.tick(secs, this.ticks);
        this.timing.evt = H.Events.tick(  secs, this.ticks);

      } else {

        this.timing.all = 0;
        this.timing.tst = H.Tester.tick(  secs, this.ticks);
        this.timing.trg = H.Triggers.tick(secs, this.ticks);
        this.timing.evt = H.Events.tick(  secs, this.ticks);
        this.timing.brn = H.Brain.tick(   secs, this.ticks);
        this.timing.grd = H.Grids.tick(   secs, this.ticks);
        this.timing.gps = H.Groups.tick(  secs, this.ticks);
        this.timing.sts = H.Stats.tick(   secs, this.ticks);
        this.timing.eco = H.Economy.tick( secs, this.ticks);

      }

      // prepare deb line
      H.each(this.timing, function(name, msecs){
        if (name !== "all"){
          msgTiming += H.format(", %s: %s", name, msecs);
        }
        self.timing.all += msecs;
      });
      critical = self.timing.all >= 100 ? "!!!!!!!!" : "";
      deb("______: #%sb, trigs: %s, timing: %s, all: %s %s", 
        this.ticks, H.Triggers.info(), msgTiming, this.timing.all, critical
      );

      H.Numerus.tick(secs, this.ticks);

      // // check for winner
      // if (this.frame.name === "whiteflag") {
      //   this.isFinished = true;
      //   H.chat("Nothing to control. So I'll just assume I lost the game. :(");
      //   H.chat("We'll meet again, boy!");
      //   return;
      // }
        
      // if (this.frame.name === "victory") {
      //   this.isFinished = true;
      //   H.chat("I do not have any target. So I'll just assume I won the game.");
      //   H.chat("You lost!");
      //   return;
      // }


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

  H.Hannibal.prototype.logPlayers = function(players){

    var tab = H.tab, msg = "", head, props, format, tabs,
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

