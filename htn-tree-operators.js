/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- DOMAIN: E C O N O M Y  --------------------------------------

  Operators



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  H.HTN = H.HTN || {};                       
  H.HTN.Tree = H.HTN.Tree || {};


  // helper

  function applyCosts(state, costs, multiplier){

    ['food', 'wood', 'metal', 'stone'].forEach(function(res){
      state.data.ress[res] -= (costs[res]) ? costs[res] * multiplier : 0;
    });

    state.data.ress.pop    += (costs.population > 0) ? costs.population * multiplier : 0;
    state.data.ress.popcap -= (costs.population < 0) ? costs.population * multiplier : 0;

  }

  H.HTN.Tree.operators = {

    wait_secs: function wait_secs(state, secs) {

      if (true){

        state.data.cost.time += secs;
        state.stamp += secs;

        return state;

      } else {return null;}

    },

    del_entity: function del_entity(state, entity, amount) {

      var ents = state.data.ents;

      if (ents[entity] >= amount){

        ents[entity] -= amount;

        if (ents[entity] === 0) {
          delete ents[entity];
        }

        return state;

      } else {
        deb("WARN  : can't del_entity: %s %s", entity, amount);
        return null;
      }

    },

    inc_resource: function inc_resource(state, res, amount) {

      if (true){

        state.data.ress[res] += amount;
        
        state.data.cost[res] = ( state.data.cost[res] ?
          state.data.cost[res] + amount :
          amount
        );

        return state;

      } else {return null;}

    },

    train_units: function train_units(state, name, amount) {

      var costs, ents = state.data.ents;

      if (true){

        costs = H.HTN.Tree.nodes[name].costs;
        if (costs){applyCosts(state, costs, amount);}
        ents[name] = ents[name] || 0;
        ents[name] += amount;

        return state;

      } else {return null;}

    },    

    build_structures: function build_structures(state, name, amount) {

      var costs, ents = state.data.ents;

      if (true){

        costs = H.HTN.Tree.nodes[name].costs;
        if (costs){applyCosts(state, costs, amount);}
        ents[name] = ents[name] || 0;
        ents[name] += amount;

        return state;

      } else {return null;}

    },    

    research_tech: function research_tech(state, name) {

      var costs, techs = state.data.tech;

      if (true){

        costs = H.HTN.Tree.nodes[name].costs;
        if (costs) {applyCosts(state, costs, 1);}
        techs.push(name);

        // a hack, but works
        if (name === 'phase.town.athen')  {techs.push('phase.town');}
        if (name === 'phase.city.athen')  {techs.push('phase.city');}
        if (name === 'phase.town.generic'){techs.push('phase.town');}
        if (name === 'phase.city.generic'){techs.push('phase.city');}

        return state;

      } else {return null;}

    }

  };
  
return H; }(HANNIBAL)); 