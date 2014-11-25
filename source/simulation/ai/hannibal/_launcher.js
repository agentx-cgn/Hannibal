/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, API3, deb, debTable, print, logObject, logError, TESTERDATA, uneval, logPlayers, logStart */

/*--------------- L A U N C H E R   -------------------------------------------

  Launches the AI/Bot for 0 A.D.
  Home: https://github.com/noiv/Hannibal/blob/master/README.md

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

  Credits:

    kmeans: 
    pythonic slicing:
    helper:

*/

// very first line, enjoy the rest
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
      Engine.PostCommand(H.APP.context.id, {"type": "chat", "message": msg});
    }
  };

  // constructor
  H.Launcher = function(settings) {

    API3.BaseAI.call(this, settings);

    // stateful support objects, ordered
    this.serializers = [
      // "effector",    // engine or simulation or explorer
      "culture",     // store, tree, phases
      "events", 
      "map",         // grids
      "villages", 
      "resources", 
      "scanner", 
      "groups",      // assets
      "economy",     // stats, producers, orderqueue
      "military", 
      "brain", 
    ];

    H.extend(this, {
      settings:       settings,                            // from ai config dialog
      isInitialized:  false,                               // did that happen well?
      isTicking:      false,                               // toggles after first OnUpdate
      isFinished:     false,                               // there is still no winner
      noInitReported: false,                               // report init failure only once
      timing:         {all: 0},                            // used to identify perf. sinks in OnUpdate
      context:        {
        time:           Date.now(),                        // time game created/saved 
        timeElapsed:    0,
        idgen:          1,                                 // seed for unique object ids
        id:             settings.player,                   // bot id, used within 0 A.D.
        turn:           0,                                 // increments on API tick
        tick:           0,                                 // increments on BOT tick
        difficulty:     settings.difficulty,               // Sandbox 0, easy 1, or nightmare or ....
        config:         H.Config,                          // 
        data:           {},                                // serialized data
      }
    });

    // initialize container for serialized data
    this.serializers.forEach(s => this.context.data[s] = null);

    deb("------: Launcher.constructor.out");

  };

  H.Launcher.prototype = new H.API.BaseAI();
  H.Launcher.prototype.Deserialize = function(data /*, sharedScript */ ){
    H.extend(this.context.data, data);
  };
  H.Launcher.prototype.Serialize = function(){

    var context = {
      time:          Date.now(),
      timeElapsed:   this.context.timeElapsed,
      idgen:         this.context.idgen,
      id:            this.context.id,
      turn:          this.context.turn,
      tick:          this.context.tick,
      difficulty:    this.context.difficulty,
      config:        H.Config,                          // 
      data:          {}
    };

    this.serializers.forEach(s => context.data[s] = this.bot[s].serialize());

    return context;

  };
  H.Launcher.prototype.CustomInit = function(gameState, sharedScript) {

    var ss = sharedScript, gs = gameState;

    // exportObject(gameState, "gameState");       // ERROR cyclic object value
    // exportObject(sharedScript, "sharedScript"); // ERROR cyclic object value

    // exportObject(this.settings.templates, "templates");
    // exportObject(ss._techTemplates, "techtemplates")
    // exportObject(sharedScript.playersData, "players");
    // exportObject(sharedScript._entityMetadata, "metadata");
    // exportObject(sharedScript.passabilityMap, "passabilityMap"); 
    // exportObject(sharedScript.territoryMap, "territoryMap"); 
    // exportObject(sharedScript.passabilityClasses, "passabilityClasses"); 

    logStart(ss, gs, this.settings);
    logPlayers(ss.playersData);

    H.APP = this;

    // launch the stats extension
    if (H.Config.numerus.enabled){
      H.Numerus.init(ss, gs);          
    }             

    // enhance the context
    H.extend(this.context, {

      launcher:            this,

      effector:            new H.LIB.Effector({connector: "engine"}),

      cellsize:            gameState.cellSize, 
      width:               sharedScript.passabilityMap.width, 
      height:              sharedScript.passabilityMap.height, 
      circular:            sharedScript.circularMap,
      territory:           sharedScript.territoryMap,
      passability:         sharedScript.passabilityMap,

      // API read/write
      metadata:            H.Proxies.MetaData(sharedScript._entityMetadata[this.context.id]),

      // API read only, static
      templates:           this.settings.templates,
      techtemplates:       sharedScript._techTemplates, 

      // API read only, dynamic
      states:              H.Proxies.States(gameState.entities._entities),
      entities:            gameState.entities._entities,
      technologies:        sharedScript._techTemplates, 
      techmodifications:   sharedScript._techModifications,
      player:              sharedScript.playersData[this.context.id],
      players:             sharedScript.playersData,

      query:               function(hcq, debug){
        return new H.LIB.Query(this.context.culture.store, hcq, debug);
      },
      class2name:          function(klass){
        return new H.LIB.Query(this.context.culture.store, klass + " CONTAIN").first().name;
        // return H.QRY(klass + " CONTAIN").first().name;
      },

      operators:           H.HTN.Economy.operators,
      methods:             H.HTN.Economy.methods,
      planner:             new H.HTN.Planner(this.context, {
        name:      "eco.planner",
        verbose:   1
      }),

    });

    // launch the support objects
    this.serializers.forEach(s => {
      // deb("new: %s", s);
      this.context[s] = new H.LIB[H.noun(s)](this.context);
    });

    // initialize the support objects
    ["import", "deserialize", "initialize", "finalize", "activate", "log"].forEach(action => {

      var o, ss;

      // try {

        this.serializers.forEach( s => {
          ss = s;
          o = this.context[s];
          // deb("try: %s : %s", s, action);
            ( o[action]  && o[action]() );
        });

      // } catch(e){H.throw("serializer '%s' failed on '%s' e:", ss, action, uneval(e));}

    });

    // This bot faces the user
    this.bot = new H.LIB.Bot(this.context)
      .import()
      .initialize();

    this.context.effector.log();
    this.bot.log();

    this.initialized = true;


    /*

    Below is for development

    */

    /* run scripted actions named in H.Config.sequence */

    deb();
    H.Tester.activate();      


    /* test clone & serialize */

    var t0 = Date.now();
    var DATA = this.bot.serialize();
    var t1 = Date.now();
    exportObject(DATA, "serialized");
    deb("EXPORT : serialized bot, ms: %s", t1 - t0);



    // // H.Phases.init();                         // acquire all phase names
    // this.tree    = new H.TechTree(this.id);  // analyse templates of bot's civ
    // this.culture = new H.Culture(this.tree); // culture knowledgebase as triple store
    // this.culture.searchTemplates();          // extrcact classes, resources, etc from templates
    // this.culture.loadNodes();                // turn templates to nodes
    // this.culture.loadEdges();                // add edges
    // this.culture.loadEntities();             // from game to triple store
    // this.culture.loadTechnologies();         // from game to triple store
    // this.culture.finalize();                 // clear up
    // this.tree.finalize();                    // caches required techs, producers for entities
    // H.Phases.finalize();                     // phases order



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
    //   simtick:      50, 
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



    /* end scripter */



    /* testing triple store */
    this.bot.culture.debug = 5;

    // H.QRY(H.class2name("civilcentre") + " RESEARCH").execute("metadata", 5, 10, "next phases");

    this.bot.culture.debug = 0;

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

    var 
      t0        = Date.now(),
      msgTiming = "", 
      secs      = (sharedScript.timeElapsed/1000).toFixed(1),
      map       = TESTERDATA ? TESTERDATA.map : "unkown";

    // update context
    this.context.timeElapsed        = sharedScript.timeElapsed;
    this.context.territory          = sharedScript.territoryMap;
    this.context.passability        = sharedScript.passabilityMap;
    this.context.passabilityClasses = sharedScript.passabilityClasses;
    this.context.techtemplates      = sharedScript._techTemplates;
    this.context.player             = sharedScript.playersData[this.context.id];
    this.context.players            = sharedScript.playersData;
    this.context.metadata           = sharedScript._entityMetadata[this.context.id];

    if (!this.initialized){
      if (!this.noInitReported){
        deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");
        deb();deb();
        deb("ERROR : HANNIBAL IS NOT INITIALIZED !!!");
        H.chat("HANNIBAL IS NOT INITIALIZED, check install.txt");
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

    if (this.isFinished){return;} // API ????

    if (H.Tester.OnUpdate){
      H.chat("OnUpdate");
      H.Tester.OnUpdate();
    } else {
      // H.chat("no OnUpdate");
    }
    
    // save API events, even if not processing
    this.bot.events.collect(this.events);


    // ------------- A C T I O N   S T A R T ----------------------------------

    // Run the update every n turns, offset depending on player ID to balance the load
    if ((this.turn + this.player) % 8 === 5) {

      deb("STATUS: @%s, %s, %s, elapsed: %s secs, techs: %s, food: %s, wood: %s, metal: %s, stone: %s", 
        this.context.tick, this.bot.id, this.bot.player.civ, secs, 
        H.count(this.bot.player.researchedTechs), 
        this.bot.player.resourceCounts.food,
        this.bot.player.resourceCounts.wood,
        this.bot.player.resourceCounts.metal,
        this.bot.player.resourceCounts.stone
      );

      // THIS IS THE MAIN ACT
      this.timing.tst = H.Tester.tick(           secs, this.context.tick);
      this.timing.trg = H.Triggers.tick(         secs, this.context.tick);
      this.bot.tick(                             secs, this.context.tick, this.timing);

      // if (this.context.tick === 2){
      //   var DATA = this.bot.serialize();
      //   exportObject(DATA, "serialized");
      //   deb(" EXPORT: serialized done");
      // }

      // deb: collect stats
      if (H.Config.numerus.enabled){
        H.Numerus.tick(secs, this.context.tick, sharedScript);
      }

      // deb: prepare line
      H.each(this.timing, (name, msecs) => {
        if (name !== "all"){
          msgTiming += H.format(", %s: %s", name, msecs);
        }
        this.timing.all += msecs;
      });

      deb("______: @%s, trigs: %s, timing: %s, all: %s %s", 
        this.context.tick, 
        H.Triggers.info(), 
        msgTiming, 
        this.timing.all, 
        this.timing.all >= 100 ? "!!!!!!!!" : ""
      );

      this.context.tick++;


      // ------------- A C T I O N   E N D --------------------------------------

      deb("  ");
      
    }

    this.context.turn++;
    this.turn++;

  };


return H;}());
