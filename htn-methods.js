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

  var prit, sani,
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

      // makes some shortcuts available

      prit = H.prettify;
      sani = H.saniTemplateName;

      // sanitizes state

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

      return [['start', goal]];


    },
    start: function(state, goal){

      var debug = 0, 
          diff  = 0, 
          node, 
          availTechs = [], tasks = [];

      // population
      if (goal.popcap !== undefined){
        diff = goal.popcap - (state.popcap || 0);
        if (diff > 0){
          node = H.QRY("house CONTAIN").first();
          diff  = ~~(diff / node.population * -1 + 1);
          tasks.push(['produce', node.name, diff]);
        }
      }

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

      // returns [] if nothing to do, TODO: that's not an error !!!
      return tasks;

    },
    advance: function(state, name){

      // phase_town: {
      //   genericName: "Town Phase",
      //   requirements: {
      //     any: [{"tech":"phase_town_generic"},{"tech":"phase_town_athen"}],
      //   },
      //   autoResearch: true,
      //   modifications: [{"value":"TerritoryInfluence/Radius","multiply":1.3}],
      // },
      //  phase_town_athen
      // info  Advance to Town Phase, which unlocks more structures and units. Territory radius for Civic Centers increased by +30%. 'Silver Owls' civ bonus grants an extra +10% metal gather rate to all workers.
      //   costs {population:0,time:80,food:800,wood:800,stone:0,metal:0}
      //   affects [worker]
      //   requires  {class:village,number:5}
      //   modifications [{value:ResourceGatherer/Rates/metal.ore,multiply:1.1}]


      /*
        maybe collect al tasks first and then retun ??

      */

      var tech, buildings, entities, req,
          klass, amount, inter, have, house, costs, diff,
          tasks = [], ress = [];

      // node from name
      tech = H.QRY(name).first();

      // can't do that (e.g. phase.town.generic with athen)
      if (!tech){
        return null;
      }

      if (tech.requires && tech.requires.civ){

        deb("ERROR : advance tech.requires.civ not yet implemneted, %s", tech.requires.civ);
        return null;

      }
      if (tech.requires && tech.requires.any){

        // find out what works, relies on ts has no unavail techs
        tasks = tech.requires.any
          .map(req => sani(req.tech))  //CHECK: there is also req.civ
          .filter(req => (state.tech.indexOf(req) === -1))
          .map(req => ['produce', req]);

        if (tasks.length > 0){return ["ANY", tasks];}

      } 

      if (tech.requires && tech.requires.tech){

        req = sani(tech.requires.tech);
        if (state.tech.indexOf(req) === -1) {
          return [['produce', req]];
        }

      }

      // check for missing buildings
      if (tech.requires && tech.requires.class){

        // check for enough buildings
        klass     = tech.requires.class;
        amount    = tech.requires.number;
        buildings = H.QRY(klass + " CONTAIN")
                      .map(node => node.name)
                      .filter(name => (
                          !name.contains("palisade") || 
                          !name.contains("field")    ||
                          !name.contains("wall")     ||
                          !name.contains("civil.centre")
                      ));
        entities  = H.attribs(state.ents);
        inter     = H.intersect(buildings, entities);
        have      = inter.reduce((a, b) => (state.ents[a] || 0) + (state.ents[b] || 0), 0);
        diff      = amount - have;

        // any: [{"tech":"phase_city_generic"},{"tech":"phase_city_britons"},
        // {"tech":"city_phase_gauls"},{"tech":"phase_city_pair_celts"},

        if (diff > 0){
          if (name.contains('phase.town')){
            house = H.QRY("house CONTAIN").first().name;

          } else if (name.contains('phase.city')){
            house = H.QRY("defensetower CONTAIN").first().name;

          } else if (name.contains('city.phase')){
            house = H.QRY("defensetower CONTAIN").first().name;

          } else {
            deb("ERROR : advance requires class WTF");
          }
          if(debug > 0) {deb(" advance: must produce %s houses/towers", diff);}        
          return [['produce', house, diff]];
        }

      }

      // can we afford production ?
      if (tech.costs){
        if(!H.Economy.fits(tech.costs, state.ress)){
          // if not increment
          ['food', 'wood', 'metal', 'stone'].forEach(function(resource){
            if (tech.costs[resource]) {
              diff = tech.costs[resource] - state.ress[resource];
              if (diff > 0){
                tasks.push(['inc_resource', resource, diff]);
              }
            }
          });
          if(debug > 0) {deb(" advance: must gather resoures: %s", prit(tasks));}        
          return tasks;
        }        
      }

      // finally, only time left
      tasks = [['research_tech', name]];
      if (tech.costs && tech.costs.time){
        tasks.push(['wait_secs', tech.costs.time]);
      }

      return tasks; // [['research_tech', name]];

    },
    produce: function(state, name, amount){

    /*
      trys to break down to matching operater.
      if impossible returns null, otherwise 
      recursively produces missing entities or techs

    */

      var debug  = 0, msg, 
          tasks  = [], 
          found  = false, 
          tokens = name.split("."),
          operator, house,                                    // strings
          node, nodes, product, producers,                    // nodes       
          costs, techs, ress = [], candidates,                // gen. objects && arrays
          diff = 0, counter = 0, dels = 0, delCounter = 0;    // numbers

      if(debug > 0) {deb(" produce: in: name: %s, %s", name, amount);}

      amount = amount || 1;

      // this we won't do
      if (tokens.length > 0 && tokens[0] === 'phase'){return [['advance', name]];}
      if (tokens.length > 1 && tokens[1] === 'phase'){return [['advance', name]];}

      // node from name
      product = H.QRY(name).first();
      if (!product){
        if(debug > 0) {deb("WARN  : produce: can't produce: %s", name);}
        return null;
      }

      // find all producers //TODO: clever sort
      [producers, operator] = getProducers(name);

      // this we can't do
      if (!producers.length){
        // slaves ??
        if(debug > 0) {deb(" produce: no producer found for %s", name);}
        return null;
      }

      // from here we will do

      // a producer is essential, 
      // might make plan fail, if none found
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

      // check popmax
      // fails if hits popmax and not enough female to kill
      if (product.population && product.population > 0){
        diff = state.pop + product.population * amount - state.popmax;
        if (diff > 0){
          dels = 0;
          counter = 0; 
          candidates = {};
          // enough females to destroy ?
          H.QRY("female CONTAIN").forEach(function(node){
            if (state.ents[node.name] && state.ents[node.name] > 0){
              counter += state.ents[node.name];
              candidates[node.name] = state.ents[node.name];
            }
          });
          if (counter < diff){
            deb("ERROR: hit popmax : can't produce %s %s", name, amount);
            return null; // plan fails
          } else {
            H.each(candidates, function(name, num){
              delCounter = num < (diff - delCounter) ? num : (diff - delCounter);
              tasks.push(['del_entity', node.name, delCounter]);
            });
            return tasks;
          }
        }
      }

      // search unmet technical requirements
      tasks = H.QRY(name + " REQUIRE")
        .filter(node => (state.tech || []).indexOf(node.name) === -1)
        .map(node => ['produce', node.name, 1]);

      if (tasks.length > 0) {
        msg = H.format("req: %s => %s", name, tasks.map(t=>t[1]));
        // deb(msg); 
        return tasks;
      }

      // check popcap
      if (product.population && product.population > 0){
        diff = state.pop + product.population * amount - state.popcap;
        if (diff > 0){
          house = H.QRY("house CONTAIN").first().name;
          diff  = ~~(diff / product.population * -1 + 1);
          // deb("hit popcap");
          return ['produce', house, diff];
        }
      }

      // can we afford production ?
      costs = H.map(product.costs, function(res, count){return count * amount;});
      if(!H.Economy.fits(costs, state.ress)){
        // if not increment
        ['food', 'wood', 'metal', 'stone'].forEach(function(resource){
          if (costs[resource]) {
            diff = costs[resource] - state.ress[resource];
            if (diff > 0){
              tasks.push(['inc_resource', resource, diff])
            }
          }
        });
      }      

      if (tasks.length > 0) {
        msg = H.format("res: %s => %s", name, tasks.map(t=>t[1]));
        // deb(msg); 
        return tasks;
      }



      // from here we're safe

      tasks = [[operator, name, amount]];


      // final sequence is : techs, popcap, resources , produce, wait_secs
      // but plans are backwards...

      if (product.costs && product.costs.time){
        tasks.push(['wait_secs', product.costs.time * amount]);
      }




      // finally, only time left

      if(debug > 0) {deb(" produce: out: %s", prit(tasks));}
      return tasks;

    }

  };

return H; }(HANNIBAL)); 