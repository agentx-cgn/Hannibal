/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, API3, deb, debTable, print, logObject, exportJSON, logError, TESTERDATA, uneval, logPlayers, logStart */

/*--------------- L A U N C H E R   -------------------------------------------

  Launches an AI/Bot in a fresh or saved context.
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
      var 
        msg = H.format.apply(null, H.toArray(arguments)),
        stack = new Error().stack.split("\n").slice(1);
      deb();
      deb(msg);
      stack.forEach(line => deb("  " + line));      
      throw "\n*\n*";
    },
  };

  // constructor
  H.Launcher = function(settings) {

    API3.BaseAI.call(this, settings);

    H.extend(this, {
      map:            TESTERDATA && TESTERDATA.map ? TESTERDATA.map : "unknown",
      settings:       settings,                            // from ai config dialog
      isInitialized:  false,                               // did that happen well?
      isTicking:      false,                               // toggles after first OnUpdate
      isFinished:     false,                               // there is still no winner
      noInitReported: false,                               // report init failure only once
      timing:         {all: 0},                            // used to identify perf. sinks in OnUpdate
      context:        new H.LIB.Context(settings)          // create fresh context
    });

    deb("------: Launcher.constructor.out");

  };

  H.Launcher.prototype = new H.API.BaseAI();
  H.Launcher.prototype.Deserialize = function(data /*, sharedScript */ ){
    this.context.deserialize(data);
  };
  H.Launcher.prototype.Serialize = function(){
    return this.context.serialize();
  };
  H.Launcher.prototype.CustomInit = function(gameState, sharedScript) {

    var ss = sharedScript, gs = gameState;

    logStart(ss, gs, this.settings);
    logPlayers(ss.playersData);

    H.APP = this;

    // launch the stats extension
    if (H.Config.numerus.enabled){
      H.Numerus.init(ss, gs);          
    }             

    var lines1, lines2;

    // connect the context
    this.context.connectEngine(this, gameState, sharedScript, this.settings);
    this.context.initialize();

    // This bot faces the other players
    this.bot = this.context.createBot();

    this.context.effector.log();
    this.bot.log();
    lines1 = exportJSON(this.context.serialize(), "ctx1.serialized");

    deb();
    deb("################################################################################");
    deb();

    // clone second context to compare serialization
    this.otherContext = this.context.clone();
    this.otherBot     = this.otherContext.createBot();
    lines2 = exportJSON(this.otherContext.serialize(), "ctx2.serialized");
    
    deb();
    deb("SRLIAZ: bot 1: %s lines", lines1);
    deb("SRLIAZ: bot 2: %s lines", lines2);
    deb();
    deb("################################################################################");
    deb();

    /*

    Below is for development

    */

    /* run scripted actions named in H.Config.sequence */
    deb();
    H.Tester.activate();      
    /* end scripter */

    /* testing triple store */
    this.bot.culture.debug = 5;
    // H.QRY(H.class2name("civilcentre") + " RESEARCH").execute("metadata", 5, 10, "next phases");
    this.bot.culture.debug = 0;
    /* end testing triple store */

    deb();
    deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");

    this.initialized = true;
    H.Config.deb = 0;
    return;

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
