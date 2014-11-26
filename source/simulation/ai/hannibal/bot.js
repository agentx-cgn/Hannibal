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
      "id",           "width",         "height",
      "player",       "players",
      "entities",     "metadata",
      "templates",    "techtemplates", "technologies",
      "events",
      "effector",
      "map",
      "brain",
      "groups",
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
    log: function(){
      deb("   BOT: loaded");
    },
    clone: function(context){
      return (
        new H.LIB.Bot(context)
          .import()
          .initialize(this.serialize())
      );
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    serialize: function(){
      var data = {};
      this.imports.forEach( imp => {
        if(this[imp] && typeof this[imp].serialize === "function"){
          deb("import: %s", imp);
          data[imp] = this[imp].serialize();
        }
      });
      return data;
    },
    initialize: function(){
      return this;
    },
    activate: function(){},
    tick: function(tick, secs, timing){

      if (tick === 0){

        // allow processing autoresearch first
        timing.brn = this.brain.tick(         secs, tick);
        timing.map = this.map.tick(           secs, tick);
        timing.gps = this.groups.tick(        secs, tick);
        timing.mil = this.military.tick(      secs, tick);
        timing.sts = this.economy.stats.tick( secs, tick);
        timing.eco = this.economy.tick(       secs, tick);

      } else {

        timing.evt = this.events.tick(        secs, tick);
        timing.brn = this.brain.tick(         secs, tick);
        timing.map = this.map.tick(           secs, tick);
        timing.gps = this.groups.tick(        secs, tick);
        timing.mil = this.military.tick(      secs, tick);
        timing.sts = this.economy.stats.tick( secs, tick);
        timing.eco = this.economy.tick(       secs, tick);

      }

    },

  };

return H; }(HANNIBAL));  

