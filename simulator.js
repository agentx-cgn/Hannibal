/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, H, deb, uneval */

/*--------------- S I M U L A T O R  ------------------------------------------

  estimates the outcome of a set of group launches

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  // planner's state with methods
  function State(state){
    this.state = state;
  }
  State.prototype = {
    constructor: State,
    log:     function(){
      JSON.stringify(this.state.data, null, 2).split("\n").forEach(function(line){
        deb("     S: %s", line);
      });      
    },
    addTech: function(tech){},
    addEnts: function(ents){},
    addRess: function(ress){},
  }

  H.Simulator = (function(){

    var self;

    return {
      log: function(){},
      boot: function(){return (self = this);},
      init: function(){},
      activate: function(){},
      simulate: function(orders){







      },

    };

  }()).boot();

return H; }(HANNIBAL));     
