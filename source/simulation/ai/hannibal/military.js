/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- M I L I T A R Y ---------------------------------------------

  knows about buildings and attack plans
  

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/


HANNIBAL = (function(H){


  H.LIB.Military = function(context){

    H.extend(this, {

      name:    "military",
      context: context,
      imports: [
        "events",
      ],

      childs: [
      ],

    });

  };

  H.LIB.Military.prototype = {
    constructor: H.LIB.Military,
    log: function(){},
    initialize: function(){
      this.childs.forEach( child => {
        if (!this[child]){
          this[child] = new H.LIB[H.noun(child)](this.context)
            .import()
            .initialize();
        }
      });
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
    },
    deserialize: function(){
      this.childs.forEach( child => {
        if (this.context.data.economy[child]){
          this.orderqueue = new H.LIB[H.noun(child)](this.context)
            .import()
            .initialize(this.context.data.economy[child]);
        }
      });
    },
    clone: function(context){
      context.data[this.name] = this.serialize();
      return new H.LIB[H.noun(this.name)](context);
    },
    activate: function(){

      this.events.on("Attacked", "*", function (msg){

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

  };

return H; }(HANNIBAL));  
