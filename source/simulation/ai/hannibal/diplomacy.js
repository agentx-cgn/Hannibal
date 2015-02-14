/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- D I P L O M A C Y -------------------------------------------



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Diplomacy = function(context){

    H.extend(this, {
      context:  context,

      klass: "diplomacy",

      imports:  [
        "map",
        "events",
        "query",
        "effector",
        "player", 
      ],
    });

  };


  H.LIB.Diplomacy.prototype = H.mixin(
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Diplomacy,
    log: function(){this.deb("   %s: logging", this.name.slice(0,3).toUpperCase());},
    serialize: function(){return {};},
    deserialize: function(){return this;},
    initialize: function(){return this;},
    finalize: function(){return this;},
    activate: function(){return this;},
    
    isAlly:  function(id){return this.player.isAlly[id];},
    isEnemy: function(id){return this.player.isEnemy[id];},
    
    tribute: function(id){},



  });

return H; }(HANNIBAL));
