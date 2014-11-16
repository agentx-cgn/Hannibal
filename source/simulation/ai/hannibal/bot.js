/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- H A N N I B A L ---------------------------------------------

  this is the actual bot, it loads from start, saved game or context and 
  runs against the engine or in a simulation


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/

HANNIBAL = (function(H){


  H.LIB.Bot = function(context){

    this.context = context;
    this.imports = [
      "id",           "width", "height",
      "player",       "players",
      "entities",     "metadata",
      "templates",    "techtemplates",
      "technologies",
      "objects",
      "effector",
      "map",
      "brain",
      "scout",
      "groups",
      "phases",
      "economy",
      "culture",
      "effector",
      "military",
      "villages",
      "resources",
    ];

  };

  H.LIB.Bot.prototype = {
    constructor: H.LIB.Bot,
    log: function(){},
    clone: function(context){
      return new H.LIB.Bot(context);
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
    },
    deserialize: function(){
      return {};
    },
    activate: function(){},
    tick: function(tick, secs){

      this.timing.all = 0;

      if (tick === 0){
        this.timing.tst = H.Tester.tick(   secs, this.ticks);
        this.timing.trg = H.Triggers.tick( secs, this.ticks);
        this.timing.evt = H.Events.tick(   secs, this.ticks);

      } else {
        this.timing.tst = H.Tester.tick(   secs, this.ticks);
        this.timing.trg = H.Triggers.tick( secs, this.ticks);
        this.timing.evt = H.Events.tick(   secs, this.ticks);
        this.timing.brn = H.Brain.tick(    secs, this.ticks);
        this.timing.geo = H.Grids.tick(    secs, this.ticks);
        this.timing.gps = H.Groups.tick(   secs, this.ticks);
        this.timing.mil = H.Military.tick( secs, this.ticks);
        this.timing.sts = H.Stats.tick(    secs, this.ticks);
        this.timing.eco = H.Economy.tick(  secs, this.ticks);

      }

      return this.timing;

    },

  };

return H; }(HANNIBAL));  

