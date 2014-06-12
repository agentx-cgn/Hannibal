/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- DOMAIN: E C O N O M Y  --------------------------------------

  Operators



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  H.HTN = H.HTN || {};                       
  H.HTN.Economy = H.HTN.Economy || {};

  H.HTN.Economy.State = function(data){this.data = data || {};};
  H.HTN.Economy.State.prototype = {
    constructor: H.HTN.Economy.State,
    sanitize: function(){

      var data = this.data;
      data.civ  = data.civ  || H.Bot.civ;
      data.cost = data.cost || {};
      data.ress = data.ress || {};
      data.ents = data.ents || {};
      data.tech = data.tech || [];

      data.cost.time   = data.cost.time   || 0;
      data.ress.wood   = data.ress.food   || 0;
      data.ress.food   = data.ress.food   || 0;
      data.ress.metal  = data.ress.metal  || 0;
      data.ress.stone  = data.ress.stone  || 0;
      data.ress.pop    = data.ress.pop    || 0;
      // CHECK: hellenes/civpenalty_spart_popcap
      //        mauryans/civbonus_maur_popcap
      //        persians/civbonus_pers_popcap
      data.ress.popmax = data.ress.popmax || 300;  
      data.ress.popcap = data.ress.popcap || 0;

      // autoresearch
      H.pushUnique(data.tech, "phase.village");

      // population
      if (H.count(data.ents) > 0){
        H.QRY(H.attribs(data.ents).join(", ")).forEach(function(node){
          if (node.costs && node.costs.population){
            if (node.costs.population < 0) {
              data.ress.popcap -= node.costs.population;
            } else {
              data.ress.pop += node.costs.population;
            }
          }
        });
      }

      return this;

    },
    clone: function(){

      var p, 
          s = this.data,
          i = s.tech.length, 
          state = new H.HTN.Economy.State({
            civ:  s.civ, 
            cost: {}, 
            ress: {}, 
            ents: {}, 
            tech: []
          }),
          o = state.data;

      for (p in s.cost){o.cost[p] = s.cost[p];}
      for (p in s.ress){o.ress[p] = s.ress[p];}
      for (p in s.ents){o.ents[p] = s.ents[p];}
      while(i--){o.tech.push(s.tech[i]);}

      return state;
    },

  };

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

      if (true){

        state.data.cost.time += secs;

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