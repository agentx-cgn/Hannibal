/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- D I P L O M A C Y -------------------------------------------




  tested with 0 A.D. Alpha 18 Rhododactylus
  V: 0.1.1, agentx, CGN, Mar, 2015

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
        "entities",
        "player", 
        "players", 
      ],

      policies: null,
      mood:     "friendly",

      // color, 
      defaults: {
        "0": {},
        "1": {},
        "2": {},
        "3": {},
        "4": {},
        "5": {},
        "6": {},
        "7": {},
        "8": {},
      }

    });

  };


  H.LIB.Diplomacy.prototype = H.mixin(
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Diplomacy,
    log: function(){
      this.deb(); this.deb(" DIPLO: mood: %s", this.mood);
      H.each(this.policies, (id, policy) => {
        if(policy.color){
          this.deb("     D: %s : %s", id, uneval(policy));
        }
      });
    },
    serialize: function(){
      return {
        policies: H.deepcopy(this.policies)
      };
    },
    deserialize: function(data){
      if(data){
        this.policies = data.policies;
      }
      return this;
    },
    finalize: function(){return this;},

    initialize: function(){

      if(this.policies === null){
        this.policies = H.deepcopy(this.defaults);
        this.readPlayerColors();
      }


      return this;


    },
    activate: function(){

      this.events.on("EntityCreated", msg => {
        if(this.entities[msg.id]){
          if (H.contains(this.entities[msg.id].classes(), "Unit")){
            // this.deb("  DIPL: %s, got unit with classes: %s", this.mood, this.entities[msg.id].classes());
          } else {
            // this.deb("  DIPL: %s, got NON unit with classes: %s", this.mood, this.entities[msg.id].classes());
          }
        } else {
          // this.deb("WARN  : DIPL got ID NOT ENTITY: %s", msg.id);
        }
      });
      
      return this;

    },

    readPlayerColors: function () {

      var colorName = (id) => {
        return this.context.launcher.colorFromRGBA(this.players[id].color);
      };

      H.each(this.policies, (id, policy) => {
        if (this.players[id]){
          policy.color = colorName(id)[1];
        }
      });
    },

    isAlly:  function(id){return this.player.isAlly[id];},
    isEnemy: function(id){return this.player.isEnemy[id];},
    
    tribute: function(){},



  });

return H; }(HANNIBAL));
