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

  // In each Pyhop planning method, the first argument is the current state (this is analogous to Python methods, in which the first argument is the class instance). The rest of the arguments must match the arguments of the task that the method is for. For example, ('pickup', b1) has a method get_m(state,b1), as shown below.

  var prit = H.prettify,
      mapper = {
        'BUILDBY':       'build_structures',
        'TRAINEDBY':     'train_units',
        'RESEARCHEDBY':  'research_tech'
      };

  function getProducers (name){

    var found = false, producers, operator;

    ['TRAINEDBY', 'BUILDBY', 'RESEARCHEDBY'].forEach(function(verb){
      if (!found){
        producers = H.QRY(name + " " + verb).execute();
        if (producers.length){
          operator = mapper[verb];
          found = true;
        }
      }
    });
    return [producers, operator];
  }

  H.HTN.Hannibal.init = function(){
  };

  H.HTN.Hannibal.methods = {

    init: function(state, goal){

      // sanitize state

      var hcq = "";

      state.civ  = state.civ  || "athen"

      state.ress = state.ress || {};
      state.ress.time   = state.ress.time  || 0;
      state.ress.wood   = state.ress.food  || 0;
      state.ress.food   = state.ress.food  || 0;
      state.ress.metal  = state.ress.metal || 0;
      state.ress.stone  = state.ress.stone || 0;
      state.ress.pop    = state.ress.pop || 0;
      state.ress.popmax = state.ress.popmax || 300;
      state.ress.popcap = state.ress.popcap || 0;

      state.ents = state.ents || {};
      state.tech = state.tech || [];

      // autoresearch
      if (state.tech.indexOf("phase.village") === -1) {
        state.tech.push("phase.village");
      }

      // population
      H.QRY(H.attribs(state.ents).join(", ")).forEach(function(node){
        if (node.costs && !!node.costs.population){
          if (node.costs.population < 0) {
            state.ress.popcap -= node.costs.population;
          } else {
            state.ress.pop -= node.costs.population;
          }
        }
      })

      return [['start', goal]];


    },
    start: function(state, goal){

      var debug = 0, 
          diff  = 0, 
          availTechs = [], 
          tasks = [];

      // resources
      if (goal.ress !== undefined){
        H.each(goal.ress, function(name, amount){
          diff = amount - (state.ress[name] || 0 );
          if (diff > 0){
            tasks.push(['inc_resource', name, diff]);
          }
        });
      }

      // entities
      if (goal.ents !== undefined){
        H.each(goal.ents, function(name, amount){
          diff = amount - (state.ents[name] || 0 );
          if (diff > 0){
            tasks.push(['produce', name, diff]);
          }
        });
      }

      // techs
      if (goal.tech !== undefined && goal.tech.length){

        availTechs = (!state.tech && !state.tech.length) ? availTechs : state.tech;
        
        goal.tech.forEach(function(name){

          if (availTechs.indexOf(name) === -1){
            tasks.push(['produce', name]);
          }

        });
      }

      // come back, if not finished
      if (tasks.length){tasks.push(['start', goal]);}
      if (debug > 0) {deb(" Start: %s", prit(tasks));}

      // returns [] if nothing to do
      return tasks;

    },
    produce: function(state, name, amount){

    /*
      trys to break down to matching operater.
      if impossible returns null, otherwise 
      recursively produces missing entities or techs

    */

      var debug  = 0,
          tasks  = [], 
          found  = false, 
          operator, product, producers, candidates, 
          diff, costs, techs, ress = [];

      if(debug > 0) {deb(" produce: in: name: %s, %s", name, amount);}

      amount = amount || 1;

      // node from name
      product = H.QRY(name).first();
      if (!product){
        if(debug > 0) {deb(" ERROR: produce: unknown name: %s", name);}
        return null;
      }

      // find all producers //TODO: clever sort
      [producers, operator] = getProducers(name);

      if (!producers.length){
        // slaves ??
        if(debug > 0) {deb(" produce: no producer found for %s", name);}
        return null;
      }

      // is a producer in state ?
      candidates = producers.filter(function(p){
        return state.ents && state.ents[p.name] && state.ents[p.name] > 0;
      });
      if(!candidates.length){
        // if not use what ever works 
        producers.forEach(function(p){
          tasks.push(['produce', p.name, 1]);
        });
        if(debug > 0) {deb(" produce: must build ANY producer: %s", tasks.length);}
        return ["ANY", tasks];
      }

      // can we afford production ?
      costs = H.map(product.costs, function(res, count){return count * amount;});
      if(!H.Economy.fits(costs, state.ress)){
        // if not increment
        H.each(costs, function(name, amount){
          diff = amount - (state.ress[name] || 0 );
          if (diff > 0){
            ress.push(name);
            if (name === 'time'){
              tasks.push(['wait_secs', diff]);
            } else {
              tasks.unshift(['inc_resource', name, diff]);
            }
          }
        });
        if(debug > 0) {deb(" produce: must gather resoures: %s", prit(ress));}        
        return tasks;
      }


      // search unmet technical requirements
      techs = H.QRY(name + " REQUIRE")
        .filter(function(node){
          return (state.tech || []).indexOf(node.name) === -1;
        });

      if (techs.length) {
        techs.forEach(function(node){
          tasks.push(['produce', node.name]);
        });
        if(debug > 0) {deb(" produce: must research: %s", prit(tech.map(t => t.name)));}        
        return tasks;
      }

      // TODO: check pop cap

      // we have a producer, enough budget, meet all requirements => yeah
      tasks.push([operator, name, amount]);
      if (product.costs && product.costs.time){
        tasks.push(['wait_secs', product.costs.time]);
      }

      if(debug > 0) {deb(" produce: out: %s", prit(tasks));}
      return tasks;

    }

  };

return H; }(HANNIBAL)); 