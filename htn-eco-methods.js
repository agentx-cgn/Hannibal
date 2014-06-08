/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- DOMAIN: E C O N O M Y  --------------------------------------

  Methods



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  H.HTN = H.HTN || {};                       
  H.HTN.Economy = H.HTN.Economy || {};

  var m, o, planner, nodes, 
      prit, sani, fmt,
      // verbs = ['BUILDBY', 'TRAINEDBY', 'RESEARCHEDBY'],
      mapper = {
        'BUILDBY':       'build_structures',
        'TRAINEDBY':     'train_units',
        'RESEARCHEDBY':  'research_tech'
      },
      cacheProducers = {},
      cacheTechnology = {},
      cacheBuildings = {},
      pritt = function(task){
        var t1 = task[0].name,
            t2 = Array.isArray(task[1]) ? task[1].length : task[1],
            t3 = task.length === 3 ? ", " + task[2] : "";
        return fmt("[%s: %s%s]", t1, t2, t3);
      };
      

   function prepCacheProducers(){

     var verbMapper = {
       "TRAIN": "TRAINEDBY",
       "BUILD": "BUILDBY",
       "RESEARCH": "RESEARCHEDBY"
     };

     "TRAIN BUILD RESEARCH".split(" ").forEach(verb => {
       H.QRY(verb + " DISTINCT").forEach(ent => {
         var producers = H.QRY(ent.name + " " + verbMapper[verb]).execute();
         cacheProducers[ent.name] = [producers, o[mapper[verbMapper[verb]]]];
       });
     });

   }

   function prepCacheTechnologies(){

     H.QRY("ENABLE DISTINCT").forEach(node => {
       var tech = H.QRY(node.name + " REQUIRE").first().name;
       cacheTechnology[node.name] = tech;
     });

   }

  function checkProducers (planner, m, o, state, producers){

    var producer, tasks = [], i = producers.length;

    while (i--){
      producer = producers[i];
      if (state.ents[producer.name]){
        return null; // producer already there
      }
      tasks.push([m.produce, producer.name, 1]);
    }

    return tasks.length ? [[{name: 'ANY'}, tasks]] : null;

  }


  function checkPopulationMax (planner, m, o, state, product, amount){
    // needs testing
    var diff, counter = 0, candidates, delCounter, tasks;

    if (product.population > 0){
      diff = state.pop + product.population * amount - state.popmax;
      if (diff > 0){
        candidates = {};
        // enough females to destroy ?
        H.QRY("female CONTAIN").forEach(function(node){
          if (state.ents[node.name] && state.ents[node.name] > 0){
            counter += state.ents[node.name];
            candidates[node.name] = state.ents[node.name];
          }
        });
        if (counter < diff){
          planner.log(0, () => fmt("checkPopulation: hit popmax : can't produce %s %s", name, amount));        
          return null; // plan fails
        } else {
          tasks = [];
          H.each(candidates, function(name, num){
            delCounter = num < (diff - delCounter) ? num : (diff - delCounter);
            tasks.push([o.del_entity, node.name, delCounter]);
          });
          console.log("checkPopulationMax", tasks.length);
          return tasks;
        }
      }
    }

    return null;

  }

  function checkPopulationCap (planner, m, o, state, product, amount) {

    var diff, house;

    if (product.population > 0){
      diff = state.pop + product.population * amount - state.popcap;
      if (diff > 0){
        house = H.QRY("house CONTAIN").first().name;
        diff  = ~~(diff / product.population * -1 + 1);
        console.log("checkPopulationCap", diff);
        return [[m.produce, house, diff]];
      }
    }    

    return null;
  }

  function checkCosts (planner, m, o, state, product, amount) {

    var p, diff, tasks = [], costs = {};

    for (p in product.costs){costs[p] = product.costs[p] * amount;}

    if(!H.Economy.fits(costs, state.ress)){
      for (resource of ['food', 'wood', 'metal', 'stone']) {
        if (costs[resource]) {
          diff = costs[resource] - state.ress[resource];
          if (diff > 0){
            tasks.push([o.inc_resource, resource, diff]);
          }
        }
      }
    }    

    return tasks.length ? tasks : null;

  }

  function checkReqBuildings (planner, m, o, state, tech, name){

    var buildings, entities, inter, have, diff, house;

    // check for enough buildings
    buildings = cacheBuildings[tech.requires.class];
    entities  = Object.keys(state.ents);
    inter     = H.intersect(buildings, entities);
    have      = inter.reduce((a, b) => a + state.ents[b], 0);
    diff      = tech.requires.number - have;

    if (diff > 0){  
      return ( 
        name.contains('town') ? [[m.produce, cacheBuildings["house"], diff]] :
        name.contains('city') ? [[m.produce, cacheBuildings["defensetower"], diff]] :
          deb("ERROR : advance requires class WTF")
      );
    }

    return null;

  }

  function replace (phase){return phase.replace("_", ".").replace("_", ".").replace("_", ".");}
  function checkReqTechnology (planner, m, o, state, tech){

    var i, req, tasks = [], any;

    if (tech.requires.tech){
      req = replace(tech.requires.tech);
      return (state.tech.indexOf(req) === -1 ? [[m.produce, req]] : null
      );

    } else if (tech.requires.any){
      // console.log("tech.requires.any", tech.requires.any);
      any = tech.requires.any;
      i = any.length;
      while(i--){
        req = replace(any[i].tech);
        if (!!nodes[req] && state.tech.indexOf(req) === -1){
          tasks.push([m.produce, req, 1]);
          // console.log("tech.requires.any pushing", req);
        }
      }
      // tasks = tech.requires.any
      //   .map(req => sani(req.tech))  //CHECK: there is also req.civ
      //   .filter(req => !!nodes[req] && (state.tech.indexOf(req) === -1))
      //   .map(req => [m.produce, req]);

      return (tasks.length > 0 ? 
        [[{name: "ANY"}, tasks]] : null
      );

    } 

    return null;

  }


  // function checkReqAny(planner, m, o, state, tech){

  //   var tasks;

  //   if (tech.requires && tech.requires.any){

  //     // find out what works, relies on ts has no unavail techs
  //     tasks = tech.requires.any
  //       .map(req => sani(req.tech))  //CHECK: there is also req.civ
  //       .filter(req => !!nodes[req] && (state.tech.indexOf(req) === -1))
  //       .map(req => [m.produce, req]);

  //     return (tasks.length > 0 ? 
  //       [[{name: "ANY"}, tasks]] : null
  //     );

  //   } 

  //   return null;

  // }




  H.HTN.Economy.initialize = function(oPlanner){
    m = H.HTN.Economy.methods;
    o = H.HTN.Economy.operators;
    fmt   = H.HTN.Helper.fmt;
    prit  = H.prettify;
    sani  = H.saniTemplateName;
    nodes = H.HTN.Economy.nodes = H.store ? H.store.nodes : H.Bot.culture.strore.nodes;
    planner = oPlanner;
    prepCacheTechnologies();
    prepCacheProducers();
    cacheBuildings["house"] = H.QRY("house CONTAIN").first().name;
    cacheBuildings["defensetower"] = H.QRY("defensetower CONTAIN").first().name;
    cacheBuildings["village"] = H.QRY("village CONTAIN")
      .map(node => node.name)
      .filter(name => (
          !name.contains("palisade") || 
          !name.contains("field")    ||
          !name.contains("wall")     ||
          !name.contains("civil.centre")
      ));
    cacheBuildings["town"] = H.QRY("town CONTAIN")
      .map(node => node.name)
      .filter(name => (
          !name.contains("palisade") || 
          !name.contains("field")    ||
          !name.contains("wall")     ||
          !name.contains("civil.centre")
      ));

  };

  H.HTN.Economy.methods = {

    init: function init(state, goal){

      // sanitizes state, check with copy in planner

      state = state || {};

      state.civ  = state.civ  || H.Bot.civ;
      state.cost = state.cost || {};
      state.ress = state.ress || {};
      state.ents = state.ents || {};
      state.tech = state.tech || [];

      state.cost.time   = state.cost.time   || 0;
      state.ress.wood   = state.ress.food   || 0;
      state.ress.food   = state.ress.food   || 0;
      state.ress.metal  = state.ress.metal  || 0;
      state.ress.stone  = state.ress.stone  || 0;
      state.ress.pop    = state.ress.pop    || 0;
      // CHECK: hellenes/civpenalty_spart_popcap
      //        mauryans/civbonus_maur_popcap
      //        persians/civbonus_pers_popcap
      state.ress.popmax = state.ress.popmax || 300;  
      state.ress.popcap = state.ress.popcap || 0;

      // autoresearch
      H.pushUnique(state.tech, "phase.village");

      // population
      if (H.count(state.ents) > 0){
        H.QRY(H.attribs(state.ents).join(", ")).forEach(function(node){
          if (node.costs && !!node.costs.population){
            if (node.costs.population < 0) {
              state.ress.popcap -= node.costs.population;
            } else {
              state.ress.pop += node.costs.population;
            }
          }
        });
      }

      return [[m.start, goal]];


    },

    start: function start(state, goal){

      var diff = 0, node, prop, tech, availTechs, tasks = [];

      // population
      if (goal.popcap){
        diff = goal.popcap - (state.popcap || 0);
        if (diff > 0){
          node = H.QRY("house CONTAIN").first();
          diff  = ~~(diff / node.population * -1 + 1);
          tasks.push([m.produce, node.name, diff]);
        }
      }

      // resources
      if (goal.ress){
        for (prop in goal.ress){
          diff = goal.ress[prop] - (state.ress[prop] || 0 );
          if (diff > 0){
            tasks.push([o.inc_resource, prop, diff]);
          }
        }
      }

      // entities
      if (goal.ents){
        for (prop in goal.ents){
          diff = goal.ents[prop] - (state.ents[prop] || 0 );
          if (diff > 0){
            tasks.push([m.produce, prop, diff]);
          }
        }
      }

      // techs
      if (goal.tech && goal.tech.length){
        availTechs = (!state.tech || !state.tech.length) ? [] : state.tech;
        for (tech of goal.tech){
          if (availTechs.indexOf(tech) === -1){
            tasks.push([m.produce, tech, 1]);
          }
        }
      }

      // come back, if not finished
      if (tasks.length){tasks.push([m.start, goal]);}

      planner.log(4, () => fmt("m.start: %s", tasks.map(pritt) ));        

      // returns [] if nothing to do, TODO: that's not an error !!!
      return tasks;

    },
    advance: function advance(state, name){

      var result, tech = nodes[name];

      // can't do that (e.g. phase.town.generic with athen)
      if (!tech){
        planner.log(0, () => fmt("MT: advance unknown %s", name));
        return null;
      }

      if (tech.requires && tech.requires.civ){
        planner.log(0, () => fmt("m.advance tech.requires.civ not yet implemneted, %s", tech.requires.civ));
        return null;
      }

      // check for techs
      if (tech.requires) {
        result = checkReqTechnology(planner, m, o, state, tech);
        if (result){
          // console.log("tech req: ", result);
          return result;
        }
      }

      // check for missing buildings
      if (tech.requires && tech.requires.class){
        result = checkReqBuildings(planner, m, o, state, tech, name);
        if (result){
          // console.log("bldgs req: ", result)
          return result;
        }
      }

      result = checkCosts(planner, m, o, state, tech, 1);
      if (result){return result;}

      return ( tech.costs && tech.costs.time ? 
        [[o.research_tech, name], [o.wait_secs, tech.costs.time]] :
        [[o.research_tech, name]]
      );

    },
    produce: function produce(state, name, amount){

      var result, tech, operator, producers, tokens, product = nodes[name];

      amount = amount || 1;

      // that's an error
      if (!product){
        console.log(name, "no producer");
        planner.log(0, () => fmt("m.produce: unknown product: %s", name));        
        return null;
      }

      // this we won't do
      if (name.contains('phase')){
        tokens = name.split(".");
        if (tokens.length > 0 && tokens[0] === 'phase'){return [[m.advance, name]];}
        if (tokens.length > 1 && tokens[1] === 'phase'){return [[m.advance, name]];}
      }

      // this we can't do, slaves, units.athen.infantry.spearman.e, .a
      if (!cacheProducers[name]){
        // console.log(name, "no producer");
        return null;
      }


      // from here we will do

      // get all producers //TODO: clever sort
      [producers, operator] = cacheProducers[name];

      // producer in state?
      result = checkProducers(planner, m, o, state, producers);
      if (result){return result;}

      // check popmax
      // fails if hits popmax and not enough female to kill
      if (product.population){
        result = checkPopulationMax(planner, m, o, state, product, amount);
        if (result){return result;}
        result = checkPopulationCap(planner, m, o, state, product, amount);
        if (result){return result;}
      }

      // unmet technical requirements
      tech = cacheTechnology[name];
      if (tech && state.tech.indexOf(tech) === -1){
        return [[m.produce, tech, 1]];
      }

      // can we afford production ?
      result = checkCosts(planner, m, o, state, product, amount);
      if (result){return result;}

      // only time left
      return ( product.costs && product.costs.time ? 
        [[operator, name, amount], [o.wait_secs, product.costs.time * amount]] : 
        [[operator, name, amount]]
      ); 

    }

  };

return H; }(HANNIBAL)); 