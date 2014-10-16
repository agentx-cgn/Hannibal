/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- T O O L S ---------------------------------------------------

  Some useful objects for Hanninbal


  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H) {

  H.Tools = H.Tools || {};

  // a NOP function
  H.FNULL = function(){};

  // sanitizes template names to dot notaton
  H.saniTemplateName = function(nameTemplate){
    nameTemplate = H.replace(nameTemplate,  "|", ".");
    nameTemplate = H.replace(nameTemplate,  "_", ".");
    nameTemplate = H.replace(nameTemplate,  "/", ".");
    return nameTemplate.toLowerCase();
  };

  H.Damper = function(fnDamper){
    this.level = 0;
    this.last = 0;
    this.damper = fnDamper;
    };

    H.Damper.prototype = {
      constructor: H.Damper,
      increase: function(value){this.level += value;},
      tick: function(time){
        this.level = this.damper.call(this, time);
        this.last = time;
      }
    };

    H.Dampers = {
      quadratic: function(time){
        var diff = time - this.damper.last;
        return Math.sqrt((this.level + 1)/diff) -1;
      }
    };

  H.health = function(ids){

    // calcs health of an array of ent ids

    var curHits = 0, maxHits = 0;

    ids.forEach(function(id){
      if (!H.Entities[id]){
        deb("WARN  : Tools.health: id: %s in ids, but not in entities, type: %s", id, typeof id);
      } else {
        curHits += H.Entities[id].hitpoints();
        maxHits += H.Entities[id].maxHitpoints();
      }
    });

    return ids.length ? (curHits / maxHits * 100).toFixed(1) : NaN;

  };

  H.class2name = function(klass){return H.QRY(klass + " CONTAIN").first().name;};

  function cost2flow(cost){
    return {
      food:  cost.food/cost.time,
      wood:  cost.wood/cost.time,
      stone: cost.stone/cost.time,
      metal: cost.metal/cost.time
    };
  }

  function reduceFlow(a,b){
    return {
      food:  Math.max(a.food, b.food).toFixed(1),
      wood:  Math.max(a.wood, b.wood).toFixed(1),
      stone: Math.max(a.stone, b.stone).toFixed(1),
      metal: Math.max(a.metal, b.metal).toFixed(1),
    };
  }

  H.getFlowFromClass = function(klass){

    return H.attribs(H.Bot.tree.nodes[H.class2name(klass)].products.train)
      // .map(function(name){deb(" TOOLS: getFlowStructure: %s %s %s", klass, name, uneval(H.QRY(name).first().costs)); return name;})
      .map(name => H.QRY(name).first().costs)
      .map(costs => cost2flow(costs))
      .reduce(reduceFlow, {food:0,wood:0,stone:0,metal:0});
  };

  H.getFlowFromTrainer = function(name){

    return H.attribs(H.Bot.tree.nodes[name].products.train)
      // .map(function(name){deb(" TOOLS: getFlowStructure: %s %s %s", klass, name, uneval(H.QRY(name).first().costs)); return name;})
      .map(name => H.QRY(name).first().costs)
      .map(costs => cost2flow(costs))
      .reduce(reduceFlow, {food:0,wood:0,stone:0,metal:0});
  };

  H.Proxies = {

    Technologies: function(){
      var mapper = {};
      H.each(H.SharedScript._techTemplates, function(key){
        mapper[H.saniTemplateName(key)] = key;
      });
      return new Proxy(H.SharedScript._techTemplates, {
        get: function(proxy, attr){
          var tpln = mapper[attr] || undefined;
          return (
            proxy[attr] !== undefined ? proxy[attr] : 
            proxy[tpln] !== undefined ? proxy[tpln] : 
            attr === "available"      ? function (techs){
              // deb("  HPT: checking %s against %s", techs, H.attribs(H.Player.researchedTechs));
              return techs.map(t => mapper[t]).every(t => !!H.Player.researchedTechs[t]); } :
            undefined
          );
        }
      });
    },
    MetaData: function(){
      // H.MetaData          = H.SharedScript._entityMetadata[this.id];
      return new Proxy({}, {
        get: function(proxy, id){
          var meta = H.SharedScript._entityMetadata[H.Bot.id];
          if (!meta[id]){meta[id] = {};}
          // deb("META  : %s %s", id, uneval(meta[id]));
          return meta[id];
        }
      });
    },
    States : function(){
      return Proxy.create({  // sanitize UnitAI state
        get: function (proxy, id) {
          return (
            H.Entities[id] && H.Entities[id]._entity.unitAIState ? 
              H.replace(H.Entities[id]._entity.unitAIState.split(".").slice(-1)[0].toLowerCase(), "ing", "") :
              undefined
          ); 
        }
      });  
    }
  };


  // H.States = Proxy.create({  // sanitize UnitAI state
  //   get: function (proxy, id) {
  //     return (
  //       H.Entities[id] && H.Entities[id]._entity.unitAIState ? 
  //         H.replace(H.Entities[id]._entity.unitAIState.split(".").slice(-1)[0].toLowerCase(), "ing", "") :
  //         undefined
  //     ); 
  //   }
  // });  

  H.Iterator = function ( /* arguments */ ) {

    // infinite... !!!! wating for SM32
    // http://www.tuicool.com/articles/3MBJj2z

    var 
      args = H.toArray(arguments),
      al = args.length,
      fn = args.slice(-1),
      fnArgs = args.slice(0, al -1),
      iter = fn.apply(null, fnArgs);

    return function () {return iter.next().value;};

  };

  /*

    function Iterator (init, fn){
      var iter = fn(init);
      return function () {return iter.next().value;}
    }

    var a = [];
    // var test = Iterator(5, function * (p) {var counter = 0; while(true) {yield String( ++counter) + p;}});
    var test = Iterator(5, function * (p) {var counter = 0; while(true) {yield String( ++counter) + p;}});

  */



  H.Task = (function(){

    // generates autoincrement numbers

    var counter = 0;
    return {
      get id () {return ++counter;}
    };
  }());

  H.Objects = (function(){

    // keeps track of objects and their IDs
    
    var o = {}, p = 0;
    return function (x) {
      if (x === undefined){return o;}
      if (typeof x === "object") {p += 1; o[p] = x; return p;}
      return o[x];
    };
  }());

  H.Triggers = (function(){

    // calls functions + params at a given tick or diff

    var i, len, pointer = 0, actions = [], dels = [], t0;

    return {
      info: function(){return actions.length;},
      add:  function(ticks, action){
        // negative indicates a diff, default = zero = next, positive = absolute,
        ticks = ticks || -1;
        action.tick = (ticks < 1) ? pointer + Math.abs(ticks) -1 : ticks;
        actions.push(action);
      },
      tick: function(){
        t0 = Date.now(); dels = []; len = actions.length; pointer += 1;
        for (i=0; i<len; i++) {
          if(actions[i].tick < pointer){
            actions[i](); 
            dels.push(actions[i]);
          }
        }
        dels.forEach(function(del){
          actions.splice(actions.indexOf(del), 1);
        });
        return Date.now() - t0;
      }
    };

  }());
     

  H.Numerus = (function(){

    // a statistics extension, interacts with launcher.py

    var ss, key = 0, resolution = 10;

    function out (data) {print(data + "\n");}
    function append (data){out("#! append 1 :" + data);}

    function tickData(id){
      var pd = ss.playersData[id],
          data  = {
            player: id,
            name:   pd.name,
            team:   pd.team,
            civ:    pd.civ,
            color:  pd.color,
          };
      return JSON.stringify(data);
    }

    function tickLine(id, what){

      var data, pd = ss.playersData[id], st = pd.statistics;

      data = {
        key:        key,
        secs:       (H.GameState.timeElapsed/1000).toFixed(1),
        pid:        id,
        phase:      pd.phase,
        food:       pd.resourceCounts.food,
        wood:       pd.resourceCounts.wood,
        stone:      pd.resourceCounts.stone,
        metal:      pd.resourceCounts.metal,
        tresaure:   st.treasuresCollected,
        unitsLost:  st.unitsLost.total,
        unitsTrai:  st.unitsTrained.total,
        bldgsCons:  st.buildingsConstructed.total,
        bldgsLost:  st.buildingsLost.total,
        kills:      st.enemyUnitsKilled.total,
        popcnt:     pd.popCount,
        popcap:     pd.popLimit,
        popmax:     pd.popMax,
        explored:   st.percentMapExplored,
        techs:      Object.keys(pd.researchedTechs).length,
        msecs:      H.Bot.timing.all,
      };

      key += 1;

      return ( what === "row" ? 
        Object.keys(data).map(a => data[a]).join(";") + "\n" :
        Object.keys(data).join(";") + "\n"
      );

    } 

    return {
      init: function(){
        ss = H.SharedScript;
        resolution = H.Config.numerus.resolution;
        deb();deb();deb(" STATS: Logging every %s ticks to: %s", resolution, H.Config.numerus.file);
        out("#! open 1 " + H.Config.numerus.file);
        out("#! append 1 :# Numerus Log from: " + new Date());
        H.each(ss.playersData, function(id){
          id = ~~id;
          if (id){append("# " + tickData(id, "row"));}
        });
        out("#! append 1 :" + tickLine(1, "head"));
      },
      tick: function(secs, ticks){
        if (~~ticks % resolution === 0) { 
          H.each(ss.playersData, function(id){
            id = ~~id;
            if (id){append(tickLine(id, "row"));}
          });
        }    
      }
    };

  }());  



  H.Checker = function (context) { // state
    H.extend(this, context, {
      planner: new H.HTN.Planner({
        name:         "check.planner",
        operators:    H.HTN.Economy.operators,
        methods:      H.HTN.Economy.methods,
      })
    });
  }

  H.Checker.prototype = {
    constructor: H.Checker,
    test: function(){
      var self = this;
      [ 
        H.class2name("civcentre"),
        H.class2name("farmstead"),
        "gather.capacity.wheelbarrow",
        H.class2name("temple"),
        "phase.city",
        H.class2name("fortress"),
        "XXXXX",
        "",
      ].forEach( name => {
        deb(" CHECK: '%s'", name);
        var result = self.check(name, true);
        deb("     C: %s", JSON.stringify(result));
      });      
    },
    check: function(name, debug=false){

      // TOCHECK: What about units, resources and item = phase

      // possible results:
      // illegal, planner has error
      // notnow, needs subsequent phase 
      // feasible, in current phase
      // available, only one operation needed
      // done, no operations needed

      var 
        t0 = Date.now(),
        tree = this.tree.nodes,
        planner = this.planner,
        state = this.state,
        data, goal, operations, 
        // tree = H.Bot.tree.nodes, 
        // state = H.HTN.Economy.getCurState(),
        result = {needed: [], cost: null},
        checkops = {
          // "start": null,
          "build_structures": true,
          "research_tech": true,
          "train_units": true,
          // "finish": null,
        };
      
      // valid name
      if (!tree[name] || !tree[name].verb){
        if (debug){deb(" CHECK: no verb/node: %s",  name);}
        result.illegal = true; 
        return result;
      }

      // valid verb
      if (tree[name].verb === "research"){
        data = {tech: [name]};
      } else if (tree[name].verb === "train" || tree[name].verb === "build"){
        data = {ents: {}}; data.ents[name] = 1;
      } else {
        result.illegal = true; return result;
      }

      // run
      goal = new H.HTN.Helper.State(data).sanitize();
      planner.plan(state, [[planner.methods.start, goal]]);
      result.time = Date.now() - t0;

      // valid outcome
      if (planner.error){
        if (debug) {
          planner.logstack.forEach(l => {
            deb(" CHECK: log: %s", l.m);
          });
        }
        result.illegal = true; return result;
      }

      // filter ops
      operations = planner.operations.filter(op => !!checkops[op[1]]);

      if (debug){
        deb("     C: operations:");
        operations.forEach(function(op){
          deb("     C: - %s", op.filter(o => o !== undefined).join(", "));
        });  
      }

      if (operations.length === 0){
        result.done = true; return result;
      }

      if (operations.length === 1){
        result.available = true; return result;
      }

      if (operations.some(op => op[1] === "research_tech" && op[2].contains("phase"))){
        result.notnow = true; return result;
      } else {
        result.feasible = true; return result;
      }

      return result;

    }    


  };

  // (function(){

  //   var self, planner;

  //   return {
  //     boot: function () {return (self = this);},
  //     init: function(){
  //       planner = new H.HTN.Planner({
  //         name:         "check.planner",
  //         operators:    H.HTN.Economy.operators,
  //         methods:      H.HTN.Economy.methods,
  //       });
  //     }, 
  //     test: function(){



  //     },
  //     check: function(name, debug=false){

  //       // TOCHECK: What about units, resources and item = phase

  //       // possible results:
  //       // illegal, planner has error
  //       // notnow, needs subsequent phase 
  //       // feasible, in current phase
  //       // available, only one operation needed
  //       // done, no operations needed

  //       var 
  //         t0 = Date.now(),
  //         data, goal, operations, 
  //         tree = H.Bot.tree.nodes, 
  //         state = H.HTN.Economy.getCurState(),
  //         result = {needed: [], cost: null},
  //         checkops = {
  //           // "start": null,
  //           "build_structures": true,
  //           "research_tech": true,
  //           "train_units": true,
  //           // "finish": null,
  //         };
        
  //       // valid name
  //       if (!tree[name] || !tree[name].verb){
  //         result.illegal = true; return result;
  //       }

  //       // valid verb
  //       if (tree[name].verb === "research"){
  //         data = {tech: [name]};
  //       } else if (tree[name].verb === "train" || tree[name].verb === "build"){
  //         data = {ents: {}}; data.ents[name] = 1;
  //       } else {
  //         result.illegal = true; return result;
  //       }

  //       // run
  //       goal = new H.HTN.Helper.State(data).sanitize();
  //       planner.plan(state, [[H.HTN.Economy.methods.start, goal]]);
  //       result.time = Date.now() - t0;

  //       // valid outcome
  //       if (planner.error){
  //         result.illegal = true; return result;
  //       }

  //       // filter ops
  //       operations = planner.operations.filter(op => !!checkops[op[1]]);

  //       if (debug){
  //         deb("     C: operations:");
  //         operations.forEach(function(op){
  //           deb("     C: - %s", op.filter(o => o !== undefined).join(", "));
  //         });  
  //       }

  //       if (operations.length === 0){
  //         result.done = true; return result;
  //       }

  //       if (operations.length === 1){
  //         result.available = true; return result;
  //       }

  //       if (operations.some(op => op[1] === "research_tech" && op[2].contains("phase"))){
  //         result.notnow = true; return result;
  //       } else {
  //         result.feasible = true; return result;
  //       }

  //       return result;

  //     }

  //   };

  // }().boot());

  H.Producers = function(options){

    var self = this, name;

    deb();deb();deb("   PDC: inited for %s", options.parent.name);

    H.extend(this, options, {
      name: options.parent.name + ":pdc",
      maxAllocs: H.Config.economy.maxAllocations,
      tree: options.tree.nodes,
      producers: {},
    });

    // TODO ignore units for build
    this.ingames.forEach(node => {
      self.register(node.name);
    });

    deb("   PDC: registered %s producers", H.count(this.producers));
  };

  H.Producers.prototype = {
    constructor: H.Producers,
    isProducer: function(name){
      return (this.tree[name] && this.tree[name].products.count);
    },
    infoProducer: function(){
      var 
        train    = H.count(this.tree[name].products.train),
        build    = H.count(this.tree[name].products.build),
        research = H.count(this.tree[name].products.research);
      return H.format("procucer: %s trains: %s, builds: %s, researches: %s", name, train, build, research);
    },
    resetAllocs: function(){
      H.each(this.producers, function (name, producer){
        producer.allocs = producer.queue.length;
      });      
    },
    unqueue: function(verb, info){

      var found = null;

      H.each(this.producers, function (name, producer){
        if(!found && producer.queue && producer.queue.length){
          if (H.delete(producer.queue, task => task[0] === info)){
            found = producer;
            producer.allocs -= 1;
          }
        }
      });

      if (found) {
        deb("   PDC: unqueue: removed in queue: %s, %s from %s", verb, info, found.name);
      } else {
        deb("   PDC: unqueue: not found in queue: %s, %s", verb, info);
      }

    },
    register: function(nameid){
      var parts = nameid.split("#"), name = parts[0], id = parts[1];
      if (this.isProducer(name)){
        this.producers[nameid] = {queue: [], allocs: 0, name: name, id: ~~id};
        deb("   PDC: reg: %s", uneval(this.producers[nameid]));
      }
    },
    remove: function(nameid){
      delete this.producers[nameid];
    },  
    allocate: function(product, cc){

      var 
        tree = this.tree,
        producer = null, 
        verb = this.tree[product].verb, 
        names = H.attribs(this.producers),
        i = names.length;

      // deb("   PDC: allocate: %s, %s", product, cc);

      // has no producer
      if(!verb){/* deb("ERROR : PDC.allocate: no verb for %s", product); */ return null;}

      switch (verb){

        case "build":
          // can ignore cc and allocations
          while ((producer = this.producers[names[--i]])){
            if (tree[producer.name].products.build[product]){
              break;  
            }        
          }
        break;

        case "research":
          // can ignore cc
          while ((producer = this.producers[names[--i]])){
            if (tree[producer.name].products.research[product]){
              if (producer.allocs < this.maxAllocs){
                break;
              } 
            } 
          }
        break;
        
        case "train":
          while ((producer = this.producers[names[--i]])){
            if (tree[producer.name].products.train[product]){
              if (producer.allocs < this.maxAllocs){
                if (!cc || H.MetaData[producer.id].cc === cc) {
                  break;
                }
              }
            }  
          }
        break;
        
      }

      if(producer){producer.allocs += 1;}

      return producer;

    },
  };


  H.ProducersXX = (function(){

    var self, name, producers = [], tree, maxQueue = 3; // will get overallocated

    function isProducer(name){
      if (tree[name] && tree[name].products.count){
        return tree[name];
      } else {
        deb("   PDC: not a producer: %s", name);
        return null;
      }
    }

    function infoProducer(name){
      var 
        train    = H.count(tree[name].products.train),
        build    = H.count(tree[name].products.build),
        research = H.count(tree[name].products.research);
      return H.format("procucer: %s trains: %s, builds: %s, researches: %s", name, train, build, research);
    }

    return {
      boot: function(){return (self = this);},
      init: function(options){ // tree, ingames

        deb();deb();deb("   PDC: init");

        tree = options.tree.nodes;

        // TODO ignore units for build
        options.ingames.forEach(node => {
          name = node.name.split("#")[0];
          if (isProducer(name)){
            node.queue = [];
            producers.push(node);
          }
        });

        // producers.forEach(p => {
        //   deb("     P: %s", p.name);
        //   ["train", "build", "research"].forEach(verb => {
        //     deb("     P:    %s", verb);
        //     H.attribs(tree[p.name.split("#")[0]].products[verb]).forEach(prod => {
        //       deb("     P:     %s", prod);
        //     });
        //   });
        // });

        deb("   PDC: found %s producers", producers.length);

      },
      unqueue: function(verb, info){

        var p, i = producers.length;

        while((p = producers[--i])){
          if(p.queue && p.queue.length){
            if (H.delete(p.queue, task => task[0] === info)){
              deb("   PDC: unqueue: removed in queue: %s, %s from %s", verb, info, p.name);
              return;
            } else {
              deb("   PDC: unqueue not found %s, %s, -> %s : %s", verb, info, p.name, p.queue);
            }
          }
        }

        deb("   PDC: unqueue: not found in queue: %s, %s", verb, info);

      },
      find: function(product, ccid){

        var producer = null, verb = tree[product].verb, i = producers.length;

        // has no producer
        if(!verb){deb("ERROR : PDC.find: no verb for %s", product); return null;}

        switch (verb){

          case "build":
            // can ignore cc and queue
            while ((producer = producers[--i])){
              name = producer.name.split("#")[0];
              if (tree[name].products.build[product]){
                break;  
              }        
            }
          break;

          case "research":
          // can ignore cc
            // deb("   PDC: searching: %s", product);
            while ((producer = producers[--i])){
              name = producer.name.split("#")[0];
              if (tree[name].products.research[product]){
                if (producer.queue.length <= maxQueue){
                  break;
                } // else {deb("---> maxQueue: %s, %s", producer.name, producer.queue.length);}
              } // else {deb("---> tree: %s, %s", name, product);}       
            }
          break;
          
          case "train":
            while ((producer = producers[--i])){
              name = producer.name.split("#")[0];
              if (tree[name].products.train[product]){
                if (ccid && H.MetaData[producer.id].ccid === ccid){
                  if (producer.queue.length <= maxQueue){
                    break;
                  } // else {deb("---> maxQueue: %s, %s", producer.name, producer.queue.length);}
                } // else {deb("---> ccid: %s, %s", producer.name, H.MetaData[producer.id].ccid);}
              }        
            }
          break;
          
          default:
            deb("ERROR : Producer.find unknown verb %s for %s", verb, product);
        }

        // if (producer){
        //   deb("   PDC: found %s for %s with cc: %s, verb: %s", producer.name, product, ccid, verb);
        // } else {
        //   deb("   PDC: found NONE for %s with cc: %s, verb: %s", product, ccid, verb);
        // }

        return producer;
      },
      loadById: function(id){
        var name, node = H.QRY("INGAME WITH id = " + id).first();
        if(node){
          name = node.name.split("#")[0];
          if (isProducer(name)){
            node.queue = [];
            producers.push(node);
            // deb("   PDC: loadById #%s, %s, have: %s", id, infoProducer(name), producers.length);
          }
        } else{
          deb("ERROR : PDC loadById failed #%s not in store", id);
        }
      },
      removeById: function(id){
        if (H.delete(producers, p => p.id === id)){ // could get slow...
          deb("   PDC: removed #%s, %s", id, H.Entities[id] ? H.Entities[id]._templateName : "no entity");
        } else {
          // deb("INFO  : PDC didn't remove #%s, %s", id, H.Entities[id] ? H.Entities[id]._templateName : "no entity");
        }
      },

    };

  }().boot());

  H.OrderQueue = function (options){

    // options: parent, executor (do, prioverbs, stats)

    H.extend(this, options, {
      name:   options.parent.name + ":queue",
      queue:  [],
      report: {rem: [], exe: [], ign: []},
      tP:    0,
    });

  };

  H.OrderQueue.prototype = {
    constructor: H.OrderQueue,
    get length () {return this.queue.length;},
    append: function(item){this.queue.push(item);},
    remove: function(item){H.remove(this.queue, item);},
    delete: function(fn){return H.delete(this.queue, fn);},
    log:    function(){
      var r = this.report;
      deb("    OQ: %s queue: %s, %s msecs, rem: %s, ign: %s, exe: %s", this.name, this.queue.length, this.tP, r.rem, r.ign, r.exe);
    },      
    process: function(isSimulation=false){

      var 
        self = this, t0, 
        amount, node, nodename, msg, source, exec, t = H.tab, 
        queue = this.queue,
        rep = this.report,
        // allocs     = H.deepcopy(allocations),
        allocs     = {food: 0, wood: 0, stone: 0, metal: 0, population: 0},
        // budget     = H.deepcopy(H.Stats.stock),
        budget     = H.deepcopy(this.economy.stats.stock),
        allGood    = false, 
        // prioVerbs  = H.Economy.prioVerbs,
        prioVerbs  = this.economy.prioVerbs, 
        builds     = 0; // only one construction per tick
        
      t0 = Date.now();

      // reset logging array
      rep.rem.length = 0; rep.ign.length = 0; rep.exe.length = 0;

      // queue empty -> exit
      if (!queue.length){this.tP = 0; return;}

      this.economy.producers.resetAllocs();

      // sort by (source, verbs) and evaluate
      queue
        .sort((a, b) => prioVerbs.indexOf(a.verb) < prioVerbs.indexOf(b.verb) ? -1 : 1)
        .forEach(order => isSimulation ? order.simulate(allocs) : order.evaluate(allocs));

      // get first quote whether all order fit budget
      allGood = H.Economy.fits(allocs, budget);
      deb("    OQ: queue: %s, allGood: %s, allocs: %s", queue.length, allGood, uneval(allocs));

      // rep
      msg = "    OQ: #%s %s amt: %s, rem: %s, pro: %s, verb: %s, nodes: %s, from %s ([0]: %s)";
      queue
        .forEach(o => {
          exec = o.executable ? "X" : "-";
          source = H.Objects(o.source).name;
          nodename = o.nodes.length ? o.nodes[0].name : "hcq: " + o.hcq.slice(0, 40);
          deb(msg, t(o.id, 3), exec, t(o.amount, 2), t(o.remaining, 2), t(o.processing, 2), o.verb.slice(0,5), t(o.nodes.length, 3), source, nodename);
      });

      // choose executables and process
      queue
        .filter(order => order.executable)
        .forEach(function(order){

          var id = order.id;

          // first node from evaluation
          node = order.nodes[0];

          // process all or one
          amount = allGood ? order.remaining - order.processing : 1;

          // final global budget check
          if (allGood || H.Economy.fits(node.costs, budget, amount)){

            switch(order.verb){

              case "train":
                // deb("    PQ: #%s train, prod: %s, amount: %s, tpl: %s", id, node.producer, amount, node.key);
                // H.Economy.do("train", amount, node.producer, node.key, order);
                // self.economy.do("train", amount, node.producer, node.key, order, node.costs, node.name);
                self.economy.do("train", amount, order, node); //node.producer, node.key, order, node.costs, node.name);
                H.Economy.subtract(node.costs, budget, amount);
                order.processing += amount;
                rep.exe.push(id + ":" + amount);
              break;

              case "build":
                if (builds === 0){
                  // deb("    PQ: #%s construct, prod: %s, amount: %s, pos: %s, tpl: %s", id, node.producer, amount, order.x + "|" + order.z, node.key);
                  // H.Economy.do("build", amount, node.producer, node.key, order);
                  // self.economy.do("build", amount, node.producer, node.key, order, node.costs, node.name);
                  self.economy.do("build", amount, order, node); //node.producer, node.key, order, node.costs, node.name);
                  H.Economy.subtract(node.costs, budget, amount);
                  order.processing += amount;
                  builds += 1;
                } else {
                  deb("    OQ: #%s build postponed", id);
                }
              break;

              case "research":
                // H.Economy.do("research", 1, node.producer, node.key, order);
                // self.economy.do("research", 1, node.producer, node.key, order, node.costs, node.name);
                self.economy.do("research", amount, order, node); //node.producer, node.key, order, node.costs, node.name);
                H.Economy.subtract(node.costs, budget, amount);
                order.processing += amount;
                rep.exe.push(id + ":" + amount);
              break;

              default:
                deb("ERROR : orderQueue.process: #%s unknown order.verb: %s", id, order.verb);

            }

          } else {
            rep.ign.push(id);

          }


      });

      queue
        .filter(function(order){return order.remaining === 0;})
        .forEach(function(order){
          rep.rem.push(order.id);
          self.remove(order);
      });

      this.tP = Date.now() - t0;

    }    

  };

  // H.OrderQueue = (function(){

  //   var self, t0, tP, queue = [], log = {rem: [], exe: [], ign: []};
    
  //   return {
  //     get length () {return queue.length;},
  //     boot:    function(){self = this; return self;},
  //     append:  function(item){queue.push(item); return self;},
  //     // prepend: function(item){queue.unshift(item); return self;},
  //     remove:  function(item){H.remove(queue, item);},
  //     // delete:  function(fn){return H.delete(queue, fn);},
  //     // forEach: queue.forEach.bind(queue),
  //     // filter:  queue.filter.bind(queue),
  //     // search:  function(fn){
  //     //   var i, len = queue.length;
  //     //   for (i=0;i<len;i++){
  //     //     if (fn(queue[i])){
  //     //       return queue[i];
  //     //     }
  //     //   }
  //     //   return undefined;
  //     // },
  //     log: function(t0){

  //       deb("    OQ: queue: %s, %s msecs, rem: %s, ign: %s, exe: %s", queue.length, tP, log.rem, log.ign, log.exe);

  //     },      
  //     process: function(){

  //       var 
  //         amount, node, nodename, msg, source, exec, t = H.tab,
  //         // allocs     = H.deepcopy(allocations),
  //         allocs     = {food: 0, wood: 0, stone: 0, metal: 0, population: 0},
  //         budget     = H.deepcopy(H.Stats.stock),
  //         allGood    = false, 
  //         prioVerbs  = H.Economy.prioVerbs,
  //         builds     = 0; // only one construction per tick
          
  //       t0 = Date.now();

  //       // reset logging array
  //       log.rem.length = 0; log.ign.length = 0; log.exe.length = 0;

  //       // queue empty -> exit
  //       if (!queue.length){tP = 0; return;}

  //       // sort by (source, verbs) and evaluate
  //       queue
  //         .sort((a, b) => prioVerbs.indexOf(a.verb) < prioVerbs.indexOf(b.verb) ? -1 : 1)
  //         .forEach(order => order.evaluate(allocs));

  //       // get first quote whether all order fit budget
  //       allGood = H.Economy.fits(allocs, budget);
  //       deb("    OQ: queue: %s, allGood: %s, allocs: %s", queue.length, allGood, uneval(allocs));

  //       // log
  //       msg = "    OQ: #%s %s amt: %s, rem: %s, pro: %s, verb: %s, nodes: %s, from %s ([0]: %s)";
  //       queue
  //         .forEach(o => {
  //           exec = o.executable ? "X" : "-";
  //           source = H.Objects(o.source).name;
  //           nodename = o.nodes.length ? o.nodes[0].name : "hcq: " + o.hcq.slice(0, 40);
  //           deb(msg, t(o.id, 3), exec, t(o.amount, 2), t(o.remaining, 2), t(o.processing, 2), o.verb.slice(0,5), t(o.nodes.length, 3), source, nodename);
  //       });

  //       // choose executables and process
  //       queue
  //         .filter(order => order.executable)
  //         .forEach(function(order){

  //           var id = order.id;

  //           // first node from evaluation
  //           node = order.nodes[0];

  //           // process all or one
  //           amount = allGood ? order.remaining - order.processing : 1;

  //           // final global budget check
  //           if (allGood || H.Economy.fits(node.costs, budget, amount)){

  //             switch(order.verb){

  //               case "train":
  //                 // deb("    PQ: #%s train, prod: %s, amount: %s, tpl: %s", id, node.producer, amount, node.key);
  //                 H.Economy.do("train", amount, node.producer, node.key, order);
  //                 H.Economy.subtract(node.costs, budget, amount);
  //                 order.processing += amount;
  //                 log.exe.push(id + ":" + amount);
  //               break;

  //               case "build":
  //                 if (builds === 0){
  //                   // deb("    PQ: #%s construct, prod: %s, amount: %s, pos: %s, tpl: %s", id, node.producer, amount, order.x + "|" + order.z, node.key);
  //                   H.Economy.do("build", amount, node.producer, node.key, order);
  //                   H.Economy.subtract(node.costs, budget, amount);
  //                   order.processing += amount;
  //                   builds += 1;
  //                 } else {
  //                   deb("    OQ: #%s build postponed", id);
  //                 }
  //               break;

  //               case "research":
  //                 H.Economy.do("research", 1, node.producer, node.key, order);
  //                 H.Economy.subtract(node.costs, budget, amount);
  //                 order.processing += amount;
  //                 log.exe.push(id + ":" + amount);
  //               break;

  //               default:
  //                 deb("ERROR : orderQueue.process: #%s unknown order.verb: %s", id, order.verb);

  //             }

  //           } else {
  //             log.ign.push(id);

  //           }


  //       });

  //       queue
  //         .filter(function(order){return order.remaining === 0;})
  //         .forEach(function(order){
  //           log.rem.push(order.id);
  //           self.remove(order);
  //       });

  //       tP = Date.now() - t0;

  //     }

  //   };

  // }().boot());

  H.Slicer = function(arr){
    return new Proxy(arr, {
      get: function (arr, arg){

        /**
         * Pythonic array slicing
         *
         * By Afshin Mehrabani (@afshinmeh)
         */

          // a = [1,2,3,4,5,6,7]
          // a[:]           [1, 2, 3, 4, 5, 6, 7]
          // a[0]           1
          // a[1:]          [2, 3, 4, 5, 6, 7]
          // a[:1]          [1]
          // a[1:1]         []
          // a[2:1]         []
          // a[1:2]         [2]
          // a[1:3]         [2, 3]
          // a[:0]          []
          // a[:2]          [1, 2]
          // a[:-1]         [1, 2, 3, 4, 5, 6]
          // a[:-2]         [1, 2, 3, 4, 5]
          // a[:-0]         []
          // a[-1:]         [7]
          // a[-3:]         [5, 6, 7]
          // a[-1:-3]       []
          // a[-1:-3:-1]    [7, 6]
          // a[-3:-1]       [5, 6]
          // a[-3:-1:1]     [5, 6]
          // a[-3:-1:-1]    []
          // a[-3:-1]       []


        var 
          expr  = arg.trim(),
          parts = expr.split(":"),  
          from = isNaN(parts[0]) ? 0 : ~~parts[0], 
          to   = isNaN(parts[1]) ? arr.length : ~~parts[1], 
          step = isNaN(parts[2]) ? 1 : ~~parts[2], 
          stepOnly = isNaN(parts[0]) && isNaN(parts[1]),
          reversed = false,
          i, slicedArr, alteredArray, arrLength;

        if (arr.length === 0 || expr === ":" || !parts.length || (isNaN(from) && isNaN(to) && isNaN(step))) {
          return arr;
        }

        //set default for both from and to if they are not defined
        // if (isNaN(parts[0]) && isNaN(parts[1])) {
        //   stepOnly = true;
        //   from = 0;
        //   to = arr.length;
        // }

        console.log("from", from, "to", to, "step", step);

        //reverse the array if we have negative values
        if (from < 0 || to < 0 || step < 0) {

          arr = arr.slice().reverse();
          reversed = true;

            //swap from and to
          if (!stepOnly) {[from, to] = [to, from];}

          to   = Math.abs(to);
          from = isNaN(from) ? to -1 : Math.abs(from);
          step = Math.abs(step);

        }

        //set default from
        if (typeof (from) == "undefined") {from = 0;}
        //set default to
        if (isNaN(to)) {to = from + 1;}

        //slice the array with from and to variables
        slicedArr = arr.slice(from, to);

        //return sliced array if there is no step value
        if (isNaN(step)) {
          return reversed ? slicedArr.reverse() : slicedArr;
        }

        alteredArray = [];
        for (i = 0, arrLength = slicedArr.length; i < arrLength; i += step) {
          alteredArray.push(slicedArr[i]);
        }

        return reversed && !stepOnly ? alteredArray.reverse() : alteredArray;

      }

    });
  };


return H;}(HANNIBAL));

