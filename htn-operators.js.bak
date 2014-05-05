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

  H.HTN.Hannibal.operators = {

    wait_secs: function (state, secs) {

      if (true){

        state.ress = state.ress || {};
        state.ress.time = state.ress.time || 0;
        state.ress.time += secs;
        return state;

      } else {return null;}

    },

    del_entity: function (state, ent, amount) {

      if (state.ents[ent] >= amount){

        state.ents[ent] -= amount;
        return state;

      } else {
        deb("Warn: can't del_entity: %s %s", ent, amount);
        return null;
      }

    },

    inc_resource: function (state, res, amount) {

      if (true){

        state.ress = state.ress || {};
        state.ress[res] = state.ress[res] || 0;
        state.ress[res] += amount;
        return state;

      } else {return null;}

    },

    train_units: function (state, name, amount) {

      var unit;

      if (true){

        amount = amount || 1;
        unit = H.QRY(name).first();

        if (unit.costs){
          state.ress = state.ress || {};
          ['food', 'wood', 'metal', 'stone'].forEach(function(res){
            if (unit.costs[res]) {
              state.ress[res] = state.ress[res] || 0;
              state.ress[res] -= amount * unit.costs[res];
            }
          });
          if (unit.costs.population > 0){
            state.ress.pop += unit.costs.population;
          }
        } 

        state.ents = state.ents || {};
        state.ents[name] = state.ents[name] || 0;
        state.ents[name] += amount;
        return state;

      } else {return null;}

    },    

    build_structures: function (state, name, amount) {

      var struc;

      if (true){

        amount = amount || 1;
        struc = H.QRY(name).first();

        if (struc.costs){
          state.ress = state.ress || {};
          ['food', 'wood', 'metal', 'stone'].forEach(function(res){
            if (struc.costs[res]) {
              state.ress[res] = state.ress[res] || 0;
              state.ress[res] -= amount * struc.costs[res];
            }
          });
          if (struc.costs.population < 0){
            state.ress.popcap -= struc.costs.population;
          }

        } 

        state.ents = state.ents || {};
        state.ents[name] = state.ents[name] || 0;
        state.ents[name] += amount;
        return state;

      } else {return null;}

    },    

    research_tech: function (state, name) {

      if (true){

        state.tech = state.tech || [];
        if (state.tech.indexOf(name) === -1){
          state.tech.push(name);
        }
        return state;

      } else {return null;}

    }

  };
  
return H; }(HANNIBAL)); 