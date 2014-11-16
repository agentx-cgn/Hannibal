/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, API3, deb, debTable, print, logObject, logError, TESTERDATA, uneval, logPlayers, logStart */

/*--------------- L A U N C H E R   -------------------------------------------

  Launches the AI/Bot for 0 A.D.
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
    LIB: {},
    extend: function (o){
      Array.prototype.slice.call(arguments, 1)
        .forEach(e => {Object.keys(e)
          .forEach(k => o[k] = e[k]
    );});},
    throw: function(){
      throw "\n" + H.format.apply(null, H.toArray(arguments)) + "\n" + new Error().stack;      
    },
    chat: function(msg){
      Engine.PostCommand(H.Bot.id, {"type": "chat", "message": msg});
    }
  };

  // constructor
  H.Launcher = function(settings) {

    API3.BaseAI.call(this, settings);

    // stateful objects, ordered
    this.serializers = [
      "brain", 
      "events", 
      "stats", 
      "economy", 
      "map", 
      "military", 
      "resources", 
      "scout", 
      "store", 
      "villages", 
      "groups", 
      "culture", 
      "tree", 
      "phases", 
    ];

    H.extend(this, {
      settings:       settings,                            // from user dialog
      isInitialized:  false,                               // did that happen well?
      isTicking:      false,                               // toggles after first OnUpdate
      isFinished:     false,                               // there is still no winner
      timing:         {all: 0},                            // used to identify perf. sinks in OnUpdate
      context:        {
        turn:           0,                                  // increments on AI ticks, not bot ticks
        tick:           0,                                  // bot ticks
        id:             settings.player,                    // used within 0 A.D.
        config:         H.Config.get(settings.difficulty),  // Sandbox or nightmare or ....
        difficulty:     settings.difficulty,
        saved:          {},
      }
    });

    this.serializers.forEach(s => this.context.saved[s] = {});

    deb();
    deb("------: Launcher.constructor.out");

  };

  H.Launcher.prototype = new H.API.BaseAI();
  H.Launcher.prototype.Deserialize = function(data, sharedScript){
    H.extend(this.context.saved, data);
  };
  H.Launcher.prototype.Serialize = function(){

    var data = {
      time:       (new Date()).toString(),
      id:         this.settings.player,
      civ:        this.civ,
      turn:       this.turn,
      tick:       this.tick,
      difficulty: this.settings.difficulty,
      config:     this.config.serialize(),
      saved: {}
    };

    this.serializers.forEach(s => data.saved[s] = this.bot[s].serialize());

    return data;

  };
  H.Launcher.prototype.CustomInit = function(gameState, sharedScript) {

    var ss = sharedScript, gs = gameState;

    deb();deb();
    logStart(ss, gs, this.settings);
    logPlayers(ss.playersData);

    H.extend(this.context, {

      connector:          "engine",

      width:               sharedScript.passabilityMap.width, 
      height:              sharedScript.passabilityMap.height, 
      cellsize:            gameState.cellSize, 
      circular:            sharedScript.circularMap,

      launcher:            this,

      player:              sharedScript.playersData[this.context.id], // http://trac.wildfiregames.com/browser/ps/trunk/binaries/data/mods/public/simulation/components/GuiInterface.js
      players:             sharedScript.playersData,

      // API read/write
      metadata:            H.Proxies.MetaData(sharedScript._entityMetadata[this.context.id]),
      entities:            H.Proxies.Entities(gameState.entities._entities),

      // API read only, static
      templates:           H.Proxies.Templates(this.settings.templates),
      techtemplates:       H.Proxies.TechTemplates(sharedScript._techTemplates), 

      // API read only, dynamic
      states:              H.Proxies.States(gameState.entities._entities),
      technologies:        H.Proxies.Technologies(sharedScript._techTemplates), 

      objects:             H.LIB.Objects(), // not a constructor, yet
      operators:           H.HTN.Economy.operators,
      methods:             H.HTN.Economy.methods,

      map:                 new H.LIB.Map(this.context),
      stats:               new H.LIB.Stats(this.context),
      brain:               new H.LIB.Brain(this.context),
      scout:               new H.LIB.Scout(this.context),
      groups:              new H.LIB.Groups(this.context),
      phases:              new H.LIB.Phases(this.context),
      economy:             new H.LIB.Economy(this.context),
      culture:             new H.LIB.Culture(this.context),
      effector:            new H.LIB.Effector(this.context),    
      military:            new H.LIB.Military(this.context),
      villages:            new H.LIB.Villages(this.context),
      resources:           new H.LIB.Resources(this.context),

      query:               function(hcq, debug){
        return new H.Store.Query(this.context.culture.store, hcq, debug);
      },

      planner:             new H.HTN.Planner(this.context, {
        name:      "eco.planner",
        verbose:   1
      }),

    });

    // launch the stats extension
    if (H.Config.numerus.enabled){
      H.Numerus.init();          
    }             

    // build a context the bot works in

    H.Each(this.context, function (name, item) {
      (item.import     && item.import());
      (item.initialize && item.initialize());
      (item.finalize   && item.finalize());
      (item.activate   && item.activate());
      (item.log        && item.log());
    });

    H.Bot = new H.LIB.Bot(this.context);

    // H.Phases.init();                         // acquire all phase names
    this.tree    = new H.TechTree(this.id);  // analyse templates of bot's civ
    this.culture = new H.Culture(this.tree); // culture knowledgebase as triple store
    this.culture.searchTemplates();          // extrcact classes, resources, etc from templates
    this.culture.loadNodes();                // turn templates to nodes
    this.culture.loadEdges();                // add edges
    this.culture.loadEntities();             // from game to triple store
    this.culture.loadTechnologies();         // from game to triple store
    this.culture.finalize();                 // clear up
    this.tree.finalize();                    // caches required techs, producers for entities
    H.Phases.finalize();                     // phases order



// H.Grids.init();                         // inits advanced map analysis
    // H.Grids.dump(map);                      // dumps all grids with map prefix in file name
    // H.Grids.pass.log();

    // H.Resources.init();                      // extracts resources from all entities
    // H.Resources.log();
    // H.Scout.init();                          // inits scout extension for scout group
    // H.Groups.init();                         // registers groups
    // H.Villages.init();                       // organize buildings by civic centres

    
    // H.Planner = new H.HTN.Planner({          // setup default planner
    //   name:      "eco.planner",
    //   operators: H.HTN.Economy.operators,
    //   methods:   H.HTN.Economy.methods,
    //   verbose:   1
    // });

    // backlinks planning domain to default planner
    // H.HTN.Economy.initialize(H.Planner, this.tree);
    // H.HTN.Economy.report("startup test");
    // H.HTN.Economy.test({tech: ['phase.town']});
    // this.tree.export(); // filePattern = "/home/noiv/Desktop/0ad/tree-%s-json.export";

    // H.Brain.init();
    // H.Economy.init();

    // Now make an action plan to start with
    // this needs to go to tick 0, later, because of autotech
    // H.Stats.init();


    // H.Brain.planPhase({
    //   parent:         this,
    //   config:         H.Config,
    //   simticks:      50, 
    //   tick:           0,
    //   civ:            H.Bot.civ,
    //   tree:           H.Bot.tree,
    //   source:         this.id,
    //   planner:        H.Planner,
    //   state:          H.HTN.Economy.getCurState(),
    //   curstate:       H.HTN.Economy.getCurState(),
    //   phase:         "phase." + H.Player.phase,  // run to this phase until next phase is researchable or (city) run out of actions
    //   curphase:      "phase.village", 
    //   centre:         H.Villages.Centre.id,
    //   nameCentre:     H.class2name("civilcentre"),
    //   nameTower:      H.class2name("defensetower"),
    //   nameHouse:      H.class2name("house"),
    //   popuHouse:      H.QRY(H.class2name("house")).first().costs.population * -1, // ignores civ
    //   ingames:       [],
    //   technologies:  [],
    //   launches:     {"phase.village": [], "phase.town": [], "phase.city": []},
    //   messages:     {"phase.village": [], "phase.town": [], "phase.city": []},
    //   resources:      H.Resources.availability("wood", "food", "metal", "stone", "treasure"),
    // });
    
    this.initialized = true;

    // H.Config.deb = 0;


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


    /* list techs and their modifications */

    if (false){

      deb();deb();deb("      : Technologies ---------");
      var affects, modus, table = [];
      H.each(H.Technologies, function(key, tech){
        if (tech.modifications){
          tech.modifications.forEach(function(mod){
            modus = (
              mod.add      !== undefined ? "add"      :
              mod.multiply !== undefined ? "multiply" :
              mod.replace  !== undefined ? "replace"  :
                "wtf"
            );
            affects = tech.affects ? tech.affects.join(" ") : mod.affects ? mod.affects : "wtf";
            table.push([H.saniTemplateName(key), mod.value, modus, mod[modus], affects]);
          });
        }
      });
      debTable("TEX", table, 1);
      deb("      : end ---------");
      H.Config.deb = 0;

    }

    /* end techs and their modifications */

    /* run scripted actions named in H.Config.sequence */

    deb();
    deb();
    H.Tester.activate();
    deb();

    /* end scripter */



    /* testing triple store */
    H.Bot.culture.debug = 5;

    // H.QRY(H.class2name("civilcentre") + " RESEARCH").execute("metadata", 5, 10, "next phases");

    H.Bot.culture.debug = 0;

    /* end testing triple store */

    /* play area */
    
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


    } catch(e){logError(e, "play area");} 

    /* end play area */

    deb();
    deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");

  };

  H.Launcher.prototype.OnUpdate = function(sharedScript) {

    // http://trac.wildfiregames.com/wiki/AIEngineAPI

    var 
      t0        = Date.now(),
      msgTiming = "", 
      secs      = (H.GameState.timeElapsed/1000).toFixed(1),
      map       = TESTERDATA ? TESTERDATA.map : "unkown";

    // update shortcuts
    H.SharedScript      = sharedScript;
    H.TechTemplates     = H.SharedScript._techTemplates;
    H.Player            = H.SharedScript.playersData[this.id];
    H.Players           = H.SharedScript.playersData;
    H.MetaData          = H.SharedScript._entityMetadata[this.id];

    if (!this.initialized){
      if (!this.noInitReported){
        deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");
        deb();deb();
        deb("ERROR : HANNIBAL IS NOT INITIALIZED !!!");
        H.chat("HANNIBAL IS NOT INITIALIZED, check configuration/readme.txt");
        deb();deb();
        deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");
      }
      this.noInitReported = true;
      return;      
    }

    if (!this.isTicking){
      deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");
      deb();deb();
      deb("------: OnUpdate: startup: %s secs, map: '%s'", ((t0 - TIMESTART)/1000).toFixed(3), map);
      deb();
      this.isTicking = true;
    }

    if (this.isFinished){return;}

    if (H.Tester.OnUpdate){
      H.chat("OnUpdate");
      H.Tester.OnUpdate();
    } else {
      // H.chat("no OnUpdate");
    }
    
    // save events, even if not processing
    H.Bot.events.collect(this.events);

    // logObject(this, "thisOnUpdate");


    // ------------- A C T I O N   S T A R T ----------------------------------

    // Run the update every n turns, offset depending on player ID to balance the load
    if ((this.turn + this.player) % 8 === 5) {

      deb("STATUS: @%s, %s, %s, elapsed: %s secs, techs: %s, food: %s, wood: %s, metal: %s, stone: %s", 
        this.tick, this.player, this.civ, secs, 
        H.count(H.Players[this.id].researchedTechs), 
        H.Player.resourceCounts.food,
        H.Player.resourceCounts.wood,
        H.Player.resourceCounts.metal,
        H.Player.resourceCounts.stone
      );

      if (this.ticks === 0){

        // allow processing autoresearch first
        this.timing.brn = H.Brain.tick(    secs, this.ticks);
        this.timing.geo = H.Grids.tick(    secs, this.ticks);
        this.timing.gps = H.Groups.tick(   secs, this.ticks);
        this.timing.mil = H.Military.tick( secs, this.ticks);
        this.timing.sts = H.Stats.tick(    secs, this.ticks);
        this.timing.eco = H.Economy.tick(  secs, this.ticks);

      }

      // deb: collect stats
      if (H.Config.numerus.enabled){
        H.Numerus.tick(secs, this.ticks);
      }

      // deb: prepare line
      H.each(this.timing, (name, msecs) => {
        if (name !== "all"){
          msgTiming += H.format(", %s: %s", name, msecs);
        }
        this.timing.all += msecs;
      });

      deb("______: @%s, trigs: %s, timing: %s, all: %s %s", 
        this.ticks, 
        H.Triggers.info(), 
        msgTiming, 
        this.timing.all, 
        this.timing.all >= 100 ? "!!!!!!!!" : ""
      );

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
      
    }

    this.turn++;

  };


return H;}());
