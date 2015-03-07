/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- M I L I T A R Y ---------------------------------------------

  knows about buildings and attack plans
  

  tested with 0 A.D. Alpha 18 Rhododactylus
  V: 0.1.1, agentx, CGN, Mar, 2015

*/


HANNIBAL = (function(H){


  H.LIB.Military = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "events",
      ],

    });

  };

  H.LIB.Military.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Military,
    log: function(){this.deb();this.deb("   MIL: all good");},
    deserialize: function(){
      if (this.context.data[this.name]){
        H.extend(this, this.context.data[this.name]);
      }
    },
    serialize: function(){
      return {};
    },
    activate: function(){

      this.events.on("EntityAttacked", "*", function (msg){

      });

    },
    tick: function(tick, secs){

      var t0 = Date.now();


      return Date.now() - t0;

    },
    getPhaseNecessities: function(options){ // phase, centre, tick
      
      var 
        cls = H.class2name,
        cc = options.centre,

        technologies = [],
        messages = {
          "phase.village": [
            [  20, {name: "BroadCast", data: {group: "g.builder", cc: cc, size: 5, building: cls("baracks"), quantity: 2}}],
          ],
          "phase.town" :   [

          ],
          "phase.city" :   [

          ],
        },
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

        };

      return {
        launches: launches,
        technologies: technologies,
        messages: messages,
      };

    },

  });

return H; }(HANNIBAL));  
