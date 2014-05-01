/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals API3, HANNIBAL, H, deb, print */

/*--------------- C O N T E X T   ---------------------------------------

  caches gamestate information and improves other code's readability,
  includes all used filters. Cache clears when the ai's behaviour changes


  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

H.Hannibal.Context = function (ai){

  var self = this, ID = ai.id, F = API3.Filters,
      bot = ai, gs = ai.gameState, ss = ai.sharedScript,
      prop, props, filters,
      totals = 0, cache = {}, 

      localdebug = false;

  filters = {

    mine:         F.byOwner(ID),
    unit:         F.byClass("Unit"),
    cctr:         F.byClass("CivCentre"),

    units:        F.and(
                    F.byOwner(ID),
                    F.byClass("Unit")
                  ),

                  // units and structures
    idleEnts:     F.and(
                    F.byOwner(ID),
                    F.or(
                      F.byMetadata(ID,"subrole","idle"), 
                      F.not(F.byHasMetadata(ID,"subrole"))
                    )
                  ),
    idleStructs:  F.and(
                    F.byOwner(ID),
                    F.byClass("Structure"),
                    F.or(
                      F.byMetadata(ID,"subrole","idle"), 
                      F.not(F.byHasMetadata(ID,"subrole"))
                    )
                  ),


    idleUnit:     F.and(
                    F.byOwner(ID),
                    F.byClass("Unit"),
                    F.or(
                      F.byMetadata(ID,"subrole","idle"), 
                      F.not(F.byHasMetadata(ID,"subrole"))
                    )
                  ),

                  // female and slaves no healer
    idleSupp:     F.and(
                    F.byOwner(ID),
                    F.byClass("Support"),
                    F.not(F.byClass("Healer")),
                    F.or(
                      F.byMetadata(ID,"subrole","idle"), 
                      F.not(F.byHasMetadata(ID,"subrole"))
                    )
                  )



  };           


  props = {
    alpha:                function(){return "a";},
    zero:                 function(){return 0;},
    isTrue:               function(){return true;},
    isFalse:              function(){return false;},

    perMapExplored:       function(){return ss.playersData[ID].statistics.percentMapExplored;},

    emptyCollection:      function(){return new API3.EntityCollection(bot.sharedScript);},

    timElapsed:           function(){return gs.timeElapsed;},

    curPhase:             function(){return gs.currentPhase;},
    isVillage:            function(){return gs.currentPhase === "1";},
    isTown:               function(){return gs.currentPhase === "2";},
    isCity:               function(){return gs.currentPhase === "3";},

    civilisation:         function(){return gs.playerData.civ;},

    allEntities:          function(){return gs.getEntities();},
    lstEntities:          function(){return gs.getEntities().filter(filters.mine);},
    cntEntities:          function(){return gs.getEntities().filter(filters.mine).length;},

    lstUnits:             function(){return gs.getEntities().filter(filters.units);},

    lstFields:            function(){return gs.getEntities().filter(F.byClass("Field"));},
    cntFields:            function(){return gs.getEntities().filter(F.byClass("Field")).length;},

    cntIdleEntities:      function(){return gs.getEntities().filter(filters.idleEnts).length;},
    lstIdleEntities:      function(){return gs.getEntities().filter(filters.idleEnts);},

    cntIdleStructs:       function(){return gs.getEntities().filter(filters.idleStructs).length;},
    cntIdleUnits:         function(){return gs.getEntities().filter(filters.idleUnit).length;},
    
    lstIdleSupp:          function(){return gs.getEntities().filter(filters.idleSupp);},
    cntIdleSupp:          function(){return gs.getEntities().filter(filters.idleSupp).length;},

    cntFood:              function(){return gs.getResources().food;},
    cntWood:              function(){return gs.getResources().wood;},
    cntMetal:             function(){return gs.getResources().metal;},
    cntStone:             function(){return gs.getResources().stone;},

    cntPopulation:        function(){return gs.playerData.popCount;},
    maxPopulation:        function(){return gs.playerData.popMax;},
    limPopulation:        function(){return gs.playerData.popLimit;},
    hasPopulation:        function(){return gs.playerData.popCount !== 0;},

    objPrices:            function(){gs.barterPrices;},
    
    cntTrainer:           function(){return gs.getOwnTrainingFacilities().length;},
    canTrain:             function(){return gs.getOwnTrainingFacilities().length !== 0;},

    lstEnemies:           function(){return gs.getEnemies();},
    cntEnemies:           function(){return gs.getEnemies().length;},
    hasEnemies:           function(){return gs.getEnemies().length !== 0;},

    hasLost:              function(){return gs.getOwnEntities().length === 0;},
    hasWon:               function(){return false;},

  };

  function def(name, fn){
    Object.defineProperty(self, name, {get: function(){
      if (cache[name] === undefined) {
        cache[name] = fn();
      }
      return cache[name];
    }});
  }

  function dbg(){
    if (localdebug){
      print(H.format.apply(H, H.toArray(arguments)));
    }
  }

  for (prop in props){
    def(prop, props[prop]);
    totals += 1;
  }


  // Public

  this.filters = filters;

  this.release = function(){

    var prop, counter = 0;

    for (prop in cache){
      cache[prop] = undefined;
      counter += 1;
    }

    dbg("   CTX: release: %s/%s", counter, totals);

  };

  this.tick = function(){

    var prop, counter = 0, t0 = Date.now();

    for (prop in cache){
      cache[prop] = props[prop]();
      counter += 1;
    }

    // deb("   CTX: refresh: %s/%s [%s]", counter, totals, H.attribs(cache));

    return Date.now() - t0;

  };

};

return H; }(HANNIBAL));
