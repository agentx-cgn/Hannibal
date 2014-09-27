/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- DOMAIN: E C O N O M Y  --------------------------------------

  Methods



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  H.HTN = H.HTN || {};                       
  H.HTN.Economy = H.HTN.Economy || {};

  var m, o, planner, tree, nodes, prit, sani, fmt,
      mapper = {
        'BUILDBY':       'build_structures',
        'TRAINEDBY':     'train_units',
        'RESEARCHEDBY':  'research_tech'
      },
      tree = {},
      cacheProducer   = {},
      cacheTechnology = {},
      cacheBuildings  = {},
      filterBuildings = name => (
        !name.contains("palisade") || 
        !name.contains("field")    ||
        !name.contains("wall")     ||
        !name.contains("civil.centre")
      ),
      pritt = function(task){
        var t1 = task[0].name,
            t2 = Array.isArray(task[1]) ? task[1].length : task[1],
            t3 = task.length === 3 ? ", " + task[2] : "";
        return fmt("[%s: %s%s]", t1, t2, t3);
      };

  function cacheProducers(){

    var verbMapper = {
      "TRAIN": "TRAINEDBY",
      "BUILD": "BUILDBY",
      "RESEARCH": "RESEARCHEDBY"
    };

    "TRAIN BUILD RESEARCH".split(" ").forEach(verb => {
      H.QRY(verb + " DISTINCT").forEach(ent => {
        var producers = H.QRY(ent.name + " " + verbMapper[verb]).execute();
        cacheProducer[ent.name] = [producers, o[mapper[verbMapper[verb]]]];
      });
    });

    H.QRY("PAIR DISTINCT").forEach(tech => {  

      // get parent 
      var par1 = H.QRY(tech.name + " PAIREDBY RESEARCHEDBY").first();

      if (par1){
        cacheProducer[tech.name] = [[par1], o.research_tech];
        // deb("P: found par1: %s, %s", tech.name, par1.name);
      } else {
        deb("P: not found par1 for: %s", tech.name);
      }

    });    

  }

  function cacheTechnologies(){
    // caches for each ent required tech
    // units.athen.ship.merchant => phase.town
    H.QRY("ENABLE DISTINCT").forEach(node => {
      var tech = H.QRY(node.name + " REQUIRE").first().name;
      cacheTechnology[node.name] = tech;
    });

  }

  function cacheDepths(){

    var zero = function () {return new H.HTN.Helper.State({ress: {}, ents: {}, tech: []}).sanitize();},
        civ  = H.Bot.civ,
        cc   = H.format("structures.%s.civil.centre", civ),
        config = {
          techs: "RESEARCH DISTINCT",
          bldgs: "BUILD DISTINCT",
          units: "TRAIN DISTINCT",
          pairs: "PAIR DISTINCT",
        },
        plannerX = new H.HTN.Planner({
          domain: H.HTN.Economy,
          verbose: 0,
          noInitialize: true
        });

    H.each(config, function(name, query){
      H.QRY(query).forEach(function(node){
        if (H.QRY(node.name + " PAIR").first()){return;}
        var goal = zero(), start = zero();
        start.data.ents[cc] = 1;
        if (name === 'techs' || name === "pairs") {
          goal.data.tech = [node.name];
        } else {
          goal.data.ents[node.name] = 1;
        }
        planner.plan(start, [[m.start, goal]]);
        H.Data.Depths[node.name] = planner.depth;
      });
    });

    JSON.stringify(H.Data.Depths, null, 2).split("\n").forEach(function(line){
      deb(" Depth: %s", line);
    });    

  }

  function checkProducers (planner, m, o, state, producers){

    var producer, tasks = [], i = producers.length;

    while (i--){
      producer = producers[i];
      if (state.data.ents[producer.name]){
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
      diff = state.data.pop + product.population * amount - state.data.popmax;
      if (diff > 0){
        candidates = {};
        // enough females to destroy ?
        H.QRY("female CONTAIN").forEach(function(node){
          if (state.data.ents[node.name] && state.data.ents[node.name] > 0){
            counter += state.data.ents[node.name];
            candidates[node.name] = state.data.ents[node.name];
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
      diff = state.data.pop + product.population * amount - state.data.popcap;
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

    var res, diff, tasks = [], costs = {};

    for (res in product.costs){costs[res] = product.costs[res] * amount;}

    if(!H.Economy.fits(costs, state.data.ress)){
      for (res of ['food', 'wood', 'metal', 'stone']) {
        if (costs[res]) {
          diff = costs[res] - state.data.ress[res];
          if (diff > 0){
            tasks.push([o.inc_resource, res, diff]);
          }
        }
      }
    }    

    return tasks.length ? tasks : null;

  }

  function checkReqBuildings (planner, m, o, state, tech, name){

    var buildings, entities, inter, have, diff;

    // check for enough buildings
    buildings = cacheBuildings[tech.requires.class];
    entities  = Object.keys(state.data.ents);
    inter     = H.intersect(buildings, entities);
    have      = inter.reduce((a, b) => a + state.data.ents[b], 0);
    diff      = tech.requires.number - have;

    if (diff > 0){  
      return ( 
        name.contains('town') ? [[m.produce, cacheBuildings.house, diff]] :
        name.contains('city') ? [[m.produce, cacheBuildings.defensetower, diff]] :
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
      return state.data.tech.indexOf(req) === -1 ? [[m.produce, req]] : null;

    } else if (tech.requires.any){
      any = tech.requires.any; i = any.length;
      while(i--){
        if (any[i].tech){ // .civ also exists
          req = replace(any[i].tech);
          if (nodes[req] && state.data.tech.indexOf(req) === -1){
            tasks.push([m.produce, req, 1]);
          }
        }
      }

      return tasks.length ? [[{name: "ANY"}, tasks]] : null;

    } 

    return null;

  }


  H.HTN.Economy.initialize = function(oPlanner, oTree){

    var t0 = Date.now();
    
    m = H.HTN.Economy.methods;
    o = H.HTN.Economy.operators;
    fmt     = H.HTN.Helper.fmt;
    prit    = H.prettify;
    sani    = H.saniTemplateName;
    nodes   = H.HTN.Economy.nodes = H.store ? H.store.nodes : H.Bot.culture.store.nodes;
    planner = oPlanner;
    tree    = oTree;

    // cacheTechnologies();
    tree.names.forEach(n => {
      if (tree.nodes[n].requires){
        cacheTechnology[n] = tree.nodes[n].requires;    
      }
    });

    // cacheProducers();
    tree.names.forEach(n => {
      if (tree.nodes[n].producers.length){
        cacheProducer[n] = [tree.nodes[n].producers, tree.nodes[n].operator];
      }
    });

    cacheBuildings.house = H.QRY("house CONTAIN").first().name;
    cacheBuildings.defensetower = H.QRY("defensetower CONTAIN").first().name;
    cacheBuildings.village = H.QRY("village CONTAIN")
      .map(node => node.name)
      .filter(filterBuildings);
    cacheBuildings.town = H.QRY("town CONTAIN")
      .map(node => node.name)
      .filter(filterBuildings);

    cacheDepths();
    
    deb();deb();deb("   HTN: H.HTN.Economy.initialize %s msecs", Date.now() - t0);
  };

  H.HTN.Economy.report = function(header){
    deb("     H: HTN.Economy.report: %s", header || "???");
    deb("     H: cached technologies %s", H.count(cacheTechnology));
    deb("     H: cached producers    %s", H.count(cacheProducer));
    deb("     H: cached depths       %s", H.count(H.Data.Depths));
    var depths = Object.keys(H.Data.Depths)
      .sort((a, b) => H.Data.Depths[a] - H.Data.Depths[b]);
    var last = depths[depths.length -1];
    deb("     H: depth %s for %s", H.Data.Depths[last], last);
    // depths.forEach(k => deb("     D: %s, %s", H.Data.Depths[k], k));
  };

  H.HTN.Economy.getCurState = function(){
    var ingames = H.QRY("INGAME"),
        state = new H.HTN.Helper.State({
          ress: {
            food:   H.PlayerData.resourceCounts.food,
            wood:   H.PlayerData.resourceCounts.wood,
            stone:  H.PlayerData.resourceCounts.stone,
            metal:  H.PlayerData.resourceCounts.metal,
            pop:    H.PlayerData.popCount,
            popcap: H.PlayerData.popLimit,
            popmax: H.PlayerData.popMax,
          }
        }).sanitize();

    ingames.forEach(function(node){
      var tpl = node.name.split("#")[0];
      if (state.data.ents[tpl] === undefined){
        state.data.ents[tpl] = 0;
      }
      state.data.ents[tpl] += 1;
    });

    H.each(H.Player.researchedTechs, function(tech){
      state.data.tech.push(H.saniTemplateName(tech));
    });
    state.data.tech = H.unique(state.data.tech);

    return state;
  };

  H.HTN.Economy.test = function(state){

    var start = H.HTN.Economy.getCurState(),
        goal  = new H.HTN.Helper.State(state),
        plannerX = new H.HTN.Planner({
          domain: H.HTN.Economy,
          verbose: 0
        });

    deb("     H: current state");
    JSON.stringify(start.data, null, 2).split("\n").forEach(function(line){
      deb("      : %s", line);
    });

    deb();
    deb("     H: planning for %s", uneval(goal));
    planner.plan(start, [[m.start, goal]]);
    planner.operations.forEach(function(op){
      deb("     H: op: %s", op);
    });

    deb("     H: cost: ", uneval(planner.result.data.cost));
    // deb("     H: cost: ", uneval(planner.result.cost));

  };


  H.HTN.Economy.methods = {

    start: function start(state, goal){

      var prop, diff = 0, data = goal.data,
          ents = [], techs = [], rate,
          depths = H.Data.Depths[H.Bot.civ];

      // resources are priotized for testing
      if (data.ress){
        for (prop of ['food', 'wood', 'metal', 'stone']){
          diff = (data.ress[prop] || 0) - (state.data.ress[prop] || 0 );
          if (diff > 0){
            return [[o.inc_resource, prop, diff], [m.start, goal]];
            // if (!state.groups[prop] || !state.groups[prop].length){
            //   return [[m.launch, prop, 1], [m.start, goal]];
            // } else {
            //   rate = state.groups[prop].length * state.groups[prop][0].rate;
            //   return [[o.wait_secs, (diff/rate)], [m.start, goal]];
            // }
          }
        }
      }

      // entities first
      if (data.ents){
        for (prop in data.ents){
          diff = data.ents[prop] - (state.data.ents[prop] || 0 );
          if (diff > 0){
            ents.push([prop, diff]);
          }
        }
        if (ents.length){
          ents = ents.sort((a,b) => depths[a[0]] || 0 - depths[b[0]] || 0);
          return [[m.produce, ents[0][0], ents[0][1]], [m.start, goal]];
        }
      }

      // techs later
      if (data.tech && data.tech.length){
        for (prop of data.tech){
          if (state.data.tech.indexOf(prop) === -1){
            techs.push(prop);
          }
        }
        if (techs.length){

          // deb(" -> %s", uneval(techs));

          techs = techs.sort((a,b) => depths[a[0]] || 0 - depths[b[0]] || 0);
          return [[m.produce, techs[0], 1], [m.start, goal]];
        }
      }

      // nothing to do, return empty task list
      return [];

    },
    launch: function launch(state, name, amount){

      amount = amount || 1;

      if (name === "stone"){
        return [
          [o.launch_group, "stone", "units.athen.support.female.citizen", 5],
          [m.produce,  "units.athen.support.female.citizen", 5]
        ];

      } else if (name === "wood"){
        return [
          [o.launch_group, "wood", "units.athen.support.female.citizen", 10],
          [m.produce,  "units.athen.support.female.citizen", 10]
        ];

      } else if (name === "food") {
        return [
          [o.launch_group, "food", "units.athen.support.female.citizen", 5],
          [m.produce,  "units.athen.support.female.citizen", 1],
          [o.build_structures, "structures.athen.field", 1],
          [m.produce,  "units.athen.support.female.citizen", 4],
        ];
      }

      return null;

    },
    allocate: function allocate(state, name, amount){

      if (!state.groups[name]) {
        return [[m.launch, name, 1]];

      } else {
        return [[o.wait_secs, 10]];

      }

    },
    advance: function advance(state, name, amount){

      var result, tech = nodes[name];

      amount = amount || 1;

      // can't do that (e.g. phase.town.generic with athen)
      if (!tech){
        planner.log(0, () => fmt("MT: advance unknown %s", name));
        return null;
      }

      // http://trac.wildfiregames.com/changeset/15345
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
        // console.log(fmt("m.produce: unknown product: '%s'", name));
        deb(" ERROR: m.produce: product not in store: '%s'", name);
        planner.log(0, () => fmt("m.produce: unknown product: '%s'", name));        
        return null;
      }

      // this we won't do
      if (name.contains('phase')){
        tokens = name.split(".");
        if (tokens.length > 0 && tokens[0] === 'phase'){return [[m.advance, name]];}
        if (tokens.length > 1 && tokens[1] === 'phase'){return [[m.advance, name]];}
      }

      // this we can't do, slaves, units.athen.infantry.spearman.e, .a
      if (!cacheProducer[name]){
        // console.log(name, "no producer");
        return null;
      }


      // from here we will do

      // get all producers //TODO: clever sort
      [producers, operator] = cacheProducer[name];

      // producer not in state?
      result = checkProducers(planner, m, o, state, producers);
      if (result){return result;}

      // check popmax/cap, fails if hits popmax and not enough female to kill
      if (product.population){
        result = checkPopulationMax(planner, m, o, state, product, amount);
        if (result){return result;}
        result = checkPopulationCap(planner, m, o, state, product, amount);
        if (result){return result;}
      }

      // unmet technical requirements
      tech = cacheTechnology[name];
      if (tech && state.data.tech.indexOf(tech) === -1){
        return [[m.produce, tech, 1]];
      }

      // can we afford production 
      if (product.costs) {
        result = checkCosts(planner, m, o, state, product, amount);
        if (result){return result;}  
      }

      // redirect technologies
      if (operator.name === "research_tech"){
        return [[m.advance, name]];
      }

      // console.log("produce.out", operator, name, amount);  

      // only time left
      return ( product.costs && product.costs.time ? 
        [[operator, name, amount], [o.wait_secs, product.costs.time * amount]] : 
        [[operator, name, amount]]
      ); 

    }

  };

return H; }(HANNIBAL)); 