/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- P L A N N E R -----------------------------------------------

  first attempt for 0 A.D. methods



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  H.HTN = H.HTN || {};                       
  H.HTN.Hannibal = H.HTN.Hannibal || {};

  // helper

  function applyCosts(state, costs, multiplier){

      ['food', 'wood', 'metal', 'stone'].forEach(function(res){
        state.ress[res] -= (costs[res]) ? costs[res] * multiplier : 0;
      });

      state.ress.pop    += (costs.population > 0) ? costs.population * multiplier : 0;
      state.ress.popcap -= (costs.population < 0) ? costs.population * multiplier : 0;

  }

  H.HTN.Hannibal.operators = {

    wait_secs: function (state, secs) {

      if (true){

        state.cost.time += secs;

        return state;

      } else {return null;}

    },

    del_entity: function (state, entity, amount) {

      if (state.ents[entity] >= amount){

        state.ents[entity] -= amount;

        if (state.ents[entity] === 0) {
          delete state.ents[entity];
        }

        return state;

      } else {
        deb("WARN  : can't del_entity: %s %s", entity, amount);
        return null;
      }

    },

    inc_resource: function (state, res, amount) {

      if (true){

        state.ress[res] += amount;
        
        if (!state.cost[res]) {state.cost[res] = 0;}
        state.cost[res] += amount;

        return state;

      } else {return null;}

    },

    train_units: function (state, name, amount) {

      var unit;

      if (true){

        unit = H.QRY(name).first();
        applyCosts(state, unit.costs, amount);
        state.ents[name] = state.ents[name] || 0;
        state.ents[name] += amount;

        return state;

      } else {return null;}

    },    

    build_structures: function (state, name, amount) {

      var struc;

      if (true){

        struc = H.QRY(name).first();
        applyCosts(state, struc.costs, amount);
        state.ents[name] = state.ents[name] || 0;
        state.ents[name] += amount;

        return state;

      } else {return null;}

    },    

    research_tech: function (state, name) {

      var tech;

      if (true){

        tech = H.QRY(name).first();
        applyCosts(state, tech.costs, 1);
        state.tech.push(name);

        if (name === 'phase.town.athen'){state.tech.push('phase.town');}
        if (name === 'phase.city.athen'){state.tech.push('phase.city');}

        return state;

      } else {return null;}

    }

  };
  
return H; }(HANNIBAL)); 