/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- M I L I T A R Y ---------------------------------------------

  knows about buildings and attack plans
  

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Oct, 2014

*/


HANNIBAL = (function(H){

  var self;

  H.Military = (function(){

    return {
      log:  function(){},
      boot: function(){self = this; return this;},
      init: function(){
      },
      tick: function(){},
      activate: function(){

        H.Events.on("Attack", "*", function (msg){

        });

      },
      getPhaseNecessities: function(options){ // phase, centre, tick
        
        var 
          cls = H.class2name,
          tck = options.tick,
          cc = options.centre,

          groups = {

            "phase.village": [
            //   tck,                  act, params
              [  20 + tck, [1, "g.builder",    {cc: cc, size: 5, building: cls("barracks"), quantity: 1}]],
            ],

            "phase.town" :   [
              [  20 + tck, [1, "g.builder",    {cc: cc, size: 5, building: cls("temple"), quantity: 1}]],
              [  20 + tck, [1, "g.tower",      {cc: cc, size: 5, quantity: 1}]],

            ],

            "phase.city" :   [

            ],

          };

        return {
          groups: groups[options.phase],
          technologies: [],
        };

      },


    };

  }()).boot();

return H; }(HANNIBAL));  
