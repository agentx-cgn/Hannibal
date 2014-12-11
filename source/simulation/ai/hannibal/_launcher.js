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
    throw: function(){
      var 
        msg = H.format.apply(null, H.toArray(arguments)),
        stack = new Error().stack.split("\n").slice(1);
      deb();
      deb(msg);
      stack.forEach(line => deb("  " + line));      
      throw "\n*\n*";
    },
    extend: function (o){
      Array.prototype.slice.call(arguments, 1)
        .forEach(e => {Object.keys(e)
          .forEach(k => o[k] = e[k]
    );});},
    chat: function(){}
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
      context:        new H.LIB.Context("ctx1")            // create empty context
    });

    deb();
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

    // connect the context
    this.context.connectEngine(this, gameState, sharedScript, this.settings);
    this.context.initialize(H.Config);

    // This bot faces the other players
    this.bot = this.context.createBot();
    
    /*

    Below is for development

    */

    var lines1, lines2, lines3, diff;
    this.context.log();

    // lines1 = exportJSON(this.context.serialize(), "ctx1.serialized");

    // deb();
    // deb("################################################################################");
    // deb();

    // clone second context to compare serialization
    // this.secondContext = this.context.clone();
    // this.secondBot     = this.secondContext.createBot();
    // lines2 = exportJSON(this.secondContext.serialize(), "ctx2.serialized");
    
    // deb();
    // deb("################################################################################");
    // deb();

    // third context via de/serialize
    // this.thirdContext = new H.LIB.Context("ctx3");
    // this.thirdContext.deserialize(this.context.serialize());
    // this.thirdContext.connectEngine(this, gameState, sharedScript, this.settings);
    // this.thirdContext.initialize(H.Config);

    // diff = diffJSON(this.context.serialize(), this.thirdContext.serialize());
    // logJSON(diff, "ctx1 vs. ctx3");

    // this.thirdContext.log();
    // this.thirdBot     = this.thirdContext.createBot();
    // lines3 = exportJSON(this.thirdContext.serialize(), "ctx3.serialized");

    // deb();
    // deb("SRLIAZ: ctx 1: %s lines", lines1);
    // deb("SRLIAZ: ctx 2: %s lines", lines2);
    // deb("SRLIAZ: ctx 3: %s lines", lines3);
    // deb();
    // deb("################################################################################");

    /* run scripted actions named in H.Config.sequence */
    deb();
    H.Tester.activate();      
    /* end scripter */

    /* testing triple store */
    this.context.culture.debug = 5;
    // this.context.query(this.context.class2name("civilcentre") + " RESEARCH").execute("metadata", 5, 10, "next phases");
    this.context.culture.debug = 0;
    /* end testing triple store */

    deb();
    deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");

    this.initialized = true;
    // H.Config.deb = 0; // suppress further log line
    return;

  };
  H.Launcher.prototype.OnUpdate = function(sharedScript) {

    var 
      t0 = Date.now(),
      secs = (sharedScript.timeElapsed/1000).toFixed(1),
      msgTiming = "";

    if (this.isFinished){return;} // API ????

    if (!this.initialized){
      if (!this.noInitReported){
        this.logNotInitialized();
      }
      this.noInitReported = true;
      return;      
    }

    if (!this.isTicking){
      this.logFirstTick(t0);
      this.isTicking = true;
    }

    if (H.Tester.OnUpdate){
      H.chat("OnUpdate");
      H.Tester.OnUpdate();
    } else {
      // H.chat("no OnUpdate");
    }
    
    // keep API events from each turn, even if not processing
    this.context.events.collect(this.events);


    // ------------- A C T I O N   S T A R T ----------------------------------

    // Run the update every n turns, offset depending on player ID to balance the load
    if ((this.turn + this.player) % 8 === 5) {

      // update context
      this.context.timeElapsed        = sharedScript.timeElapsed;
      this.context.territory          = sharedScript.territoryMap;
      this.context.passability        = sharedScript.passabilityMap;
      this.context.passabilityClasses = sharedScript.passabilityClasses;
      this.context.techtemplates      = sharedScript._techTemplates;
      this.context.player             = sharedScript.playersData[this.context.id];
      this.context.players            = sharedScript.playersData;
      this.context.metadata           = sharedScript._entityMetadata[this.context.id];

      // log top row debug info
      deb("STATUS: @%s, elapsed: %s secs, id: %s, %s/%s, techs: %s, food: %s, wood: %s, metal: %s, stone: %s", 
        this.context.tick, secs, this.bot.id, this.bot.player.civ, 
        this.context.culture.phases.current,
        H.count(this.bot.player.researchedTechs), 
        this.bot.player.resourceCounts.food,
        this.bot.player.resourceCounts.wood,
        this.bot.player.resourceCounts.metal,
        this.bot.player.resourceCounts.stone
      );

      // THIS IS THE MAIN ACT
      this.timing.all = 0;
      this.timing.tst = H.Tester.tick(           secs, this.context.tick);
      this.timing.trg = H.Triggers.tick(         secs, this.context.tick);
      this.bot.tick(                             secs, this.context.tick, this.timing);

      // deb: collect stats
      if (H.Config.numerus.enabled){
        H.Numerus.tick(secs, this.context.tick, sharedScript);
      }

      // prepare bottom row debug info
      H.each(this.timing, (name, msecs) => {
        if (name !== "all"){
          msgTiming += H.format(", %s: %s", name, msecs);
        }
        this.timing.all += msecs;
      });

      // log row
      deb("______: @%s timing: %s, all: %s %s", 
        this.context.tick, 
        msgTiming, 
        this.timing.all, 
        this.timing.all >= 100 ? "!!!!!!!!" : ""
      );

      // increase tick number
      this.context.tick++;


      // ------------- A C T I O N   E N D --------------------------------------

      deb("  ");
      
    }

    // increase turn number
    this.context.turn++;
    this.turn++;

  };
  H.Launcher.prototype.logNotInitialized = function() {
    deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");
    deb();deb();
    deb("ERROR : HANNIBAL IS NOT INITIALIZED !!!");
    H.chat("HANNIBAL IS NOT INITIALIZED, check install.txt");
    deb();deb();
    deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");
  };
  H.Launcher.prototype.logFirstTick = function(t0) {
    var map = TESTERDATA ? TESTERDATA.map : "unkown";
    deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");
    deb();deb();
    deb("------: OnUpdate: startup: %s secs, map: '%s'", ((t0 - TIMESTART)/1000).toFixed(3), map);
    deb();
  };

return H;}());
