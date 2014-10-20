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
          cc = options.centre,

          technologies = [],
          launches = {

            "phase.village": [
            //   tck,                  act, params
              [  16, 1, "g.builder",    {cc: cc, size: 5, building: cls("barracks"), quantity: 1}],
            ],

            "phase.town" :   [
              [  20, 1, "g.builder",    {cc: cc, size: 5, building: cls("temple"), quantity: 1}],
              // [  20, [1, "g.tower",      {cc: cc, size: 5, quantity: 1}]],

            ],

            "phase.city" :   [

            ],

          },

          messages = [
            [  20, {name: "BroadCast", data: {group: "g.builder", size: 5, building: cls("baracks"), quantity: 2}}],
          ];

        return {
          launches: launches,
          technologies: technologies,
          messages: messages,
        };
      },


    };

  }()).boot();

return H; }(HANNIBAL));  
