  /*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- G O A L S ---------------------------------------------------

  Define goals, depending on victory conditions, civilisation



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


/* 
  vcs:
    none
    conquest
    wonder
*/

/*
  Goals with method pair action/needsAction are continues and never done, except with parent goal

*/



/*
  Postponed: 
    Civ Specifc Buildings:
      wonder, gymnasion, theatron, kennel, super-dock, rotary mill, prytaneion, monument, library, elephant stables, parihuvādā, stables, lighthouse, mercenary camp, gerousia, syssiton, 
    Units: 
      Heros

  Vill: 
    Resources
      Group: wood
      Group: field
      Group: fruit
      Group: hunter
      Group: breeder
    Buildings
      Houses
      Corral
      Dock
      Farmstead
      Storehouse
      Blacksmith
      Barracks
      Palisade
    Strategic:
      Group: scouts
    Techs
      town

  Town: 
    Resources
      Group: wood
      Group: stone
      Group: metal
      Group: field
      Group: fruit
      Group: hunter
      Group: breeder
    Buildings
      Houses
      Corral
      Farmstead
      Storehouse
      Blacksmith
      Barracks 2
      Temple
      Market
      Towers
      Wall
    Strategic:
      Group: scouts
      Group: patrol
    Techs
      City
      health_regen_units

  City: 
    Resources
      Group: wood
      Group: stone
      Group: metal
      Group: field
      Group: fruit
      Group: hunter
      Group: breeder
    Strategic:
      Group: scouts
      Group: patrol
    Buildings
      Houses
      Corral
      Dock
      Shipyard
      Farmstead
      Storehouse
      Blacksmith
      Barracks 2
      Temple
      Market
      Wall
      Fortress
    Colony
      Outpost
      Centre/colony/army camp
      Tower
    Techs
      City


What covers a plan?
  The buildings and techs to reach next phase.

What covers monitoring
  The resources needed to maintain resource flow of centre+barracks
  The plan's resources
  The amount of resources needed to fulfill plan






*/



HANNIBAL = (function(H){

  H.Data.Goals = {

    "condNone": {
      goals:        ["condConquest"],
    },
    "condConquest": {
      goals:        ["expandVill", "expandTown", "expandCity"],
    },
    "condWonder": {
      goals:        ["expandVill", "expandTown", "wonder", "expandCity"],
    },
    
    "expandVill":  {
      goals:        ["houses", "farmstead", "blacksmith", "fields", "dock", "barracks", "town"],
      isValid:      function(){return true;},
      isDone:       function(){return this.goals.every(g => g.isDone());},
    },
    "expandTown":  {
      goals:        ["houses", "market", "temple", "shipyard", "city"],
      isValid:      function(){return true;},
      isDone:       function(){return this.phases.current === "city";},
    },
    "expandCity":  {
      goals:        ["houses", "fortress", "wall"],
      isValid:      function(){return true;},
      isDone:       function(){return false;},
    },

    "houses": {
      action:       function () {
        this.groups.launch({cc: this.village.main, buildings: "house", quantity: 2});
      },
      needsAction:  function(){
        var 
          popHouse = this.query("house CONTAIN").first().costs.population,
          cntHouses = this.query("house CONTAIN INGAME").count();
        return this.stats.population > popHouse * cntHouses - 2 * popHouse;
      },
    },

    "blacksmith": {
      action:       function () {
        this.groups.launch({cc: this.village.main, buildings: "blacksmith", quantity: 1});
      },
      isDone:       function(){return this.query("blacksmith CONTAIN INGAME").count() > 0;},
    },

    "farmstead": {
      action:       function () {
        this.groups.launch({cc: this.village.main, buildings: "farmstead", quantity: 1});
      },
      isDone:       function(){return this.query("farmstead CONTAIN INGAME").count() > 0;},
    },

  };


  H.LIB.Goal = function (context){

    H.extend(this, {

      context: context,

      imports: [
        "stats",
        "query",
        "village",
      ],

      done: false,
      valid: true

    });

  };


  H.LIB.Goal.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Goal,
    tick: function(tick, secs){

      if (!this.done && this.valid){

        if (this.isValid && !this.isValid()){
          this.valid = false;
          return;
        }

        if (this.isDone()){
          this.done = true;
          return;
        }

        // continous
        if (this.needsAction && this.needsAction()){
          this.action();
          return;
        
        } else {
          // one time
          this.action();
          this.done = true;
        }

      }

    },

  });

return H; }(HANNIBAL));  
