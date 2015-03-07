/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- DOMAIN: E C O N O M Y  --------------------------------------

  Operators


  tested with 0 A.D. Alpha 18 Rhododactylus
  V: 0.1.1, agentx, CGN, Mar, 2015

*/

HANNIBAL = (function(H){

  // helper

  function applyCosts(state, costs, multiplier){

    ['food', 'wood', 'metal', 'stone'].forEach(function(res){
      state.data.ress[res] -= (costs[res]) ? costs[res] * multiplier : 0;
    });

    state.data.ress.pop    += (costs.population > 0) ? costs.population * multiplier : 0;
    state.data.ress.popcap -= (costs.population < 0) ? costs.population * multiplier : 0;

  }

  H.HTN.Economy.operators = {

    wait_secs: function wait_secs(state, secs) {

      var prop, rate;

      if (true){

        for (prop of ['food', 'wood', 'metal', 'stone']){
          if (state.groups[prop] && state.groups[prop].length){
            rate = state.groups[prop].length * state.groups[prop][0].rate;
            state.data.ress[prop] += rate * secs;
          }
        }

        state.data.cost.time += secs;
        state.stamp += secs;

        return state;

      } else {return null;}

    },

    launch_group: function launch_group(state, group, units, amount) {

      var rate;

      if (true){

        if (!state.groups[group]){state.groups[group] = [];}

        rate = (
          group === "food"  ?  2 :
          group === "wood"  ?  4 :
          group === "stone" ?  8 :
          group === "metal" ? 16 :
            deb("launch_group: strange group '%s'", group)
        );
        
        state.groups[group].push({
          units:   units, 
          amount:  amount, 
          stamp:   state.stamp, 
          members: 0,
          rate:    rate
        });

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

        costs = H.HTN.Economy.nodes[name].costs;
        if (costs){applyCosts(state, costs, amount);}
        ents[name] = ents[name] || 0;
        ents[name] += amount;

        return state;

      } else {return null;}

    },    

    build_structures: function build_structures(state, name, amount) {

      var costs, ents = state.data.ents;

      if (true){

        costs = H.HTN.Economy.nodes[name].costs;
        if (costs){applyCosts(state, costs, amount);}
        ents[name] = ents[name] || 0;
        ents[name] += amount;

        return state;

      } else {return null;}

    },    

    research_tech: function research_tech(state, name) {

      var costs, techs = state.data.tech;

      if (true){

        costs = H.HTN.Economy.nodes[name].costs;
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