/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- E C O N O M Y -----------------------------------------------

  Priotizes requests for resources. Trains, researches and construct them.


  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  // relies on c before e
  var config = H.Config.economy,
      ress        = {food: 0, wood: 0, stone: 0, metal: 0, pops: 0, health: 0, area: 0},
      allocations = {food: 0, wood: 0, stone: 0, metal: 0, population: 0};

  function pritc(cost){ // pretty cost
    var out = [];
    Object.keys(cost).forEach(r => {
      if(cost[r]){out.push(r + ":" + cost[r]);}
    });
    return out.join(",");
  }

  H.Stats = {

    stock: H.deepcopy(ress), // currently available via API
    alloc: H.deepcopy(ress), // allocated per queue
    forec: H.deepcopy(ress), // ???
    trend: H.deepcopy(ress), // as per stack
    stack: H.map(ress, H.createRingBuffer.bind(null, config.lengthStatsBuffer)), // last x stock vals
    tick: function(){

      var t0 = Date.now(), curHits = 1, maxHits = 1, 
          stock   = H.Stats.stock, 
          stack   = H.Stats.stack, 
          trend   = H.Stats.trend;
          
      // ctx.lstUnits.forEach(function(unit){
      //   curHits += unit.hitpoints();
      //   maxHits += unit.maxHitpoints();
      // });    

      stock.food   = H.Player.resourceCounts.food;
      stock.wood   = H.Player.resourceCounts.wood;
      stock.stone  = H.Player.resourceCounts.stone;
      stock.metal  = H.Player.resourceCounts.metal;
      stock.pops   = H.Player.popCount;
      stock.area   = H.Player.statistics.percentMapExplored;
      stock.health = ~~((curHits / maxHits) * 100); // integer percent only    

      // buffers
      H.attribs(ress).forEach(function(prop){ 
        stack[prop].push(stock[prop]);      // buffers
        trend[prop] = stack[prop].trend();  // trend
      });

      return Date.now() - t0;

    }

  }; 

  // generates unique numbers
  H.Task = (function(){
    var counter = 0;
    return {
      get id () {return ++counter;}
    };
  }());

  H.Producers = (function(){

    var self, name, producers = [], tree, maxQueue = 3;

    function isProducer(name){
      if (tree[name] && tree[name].products.count){
        return true;
      } else {
        deb("   PDC: not a producer: %s", name);
        return false;
      }
    }

    return {
      boot: function(){self = this; return self;},
      init: function(oTree){

        deb();deb();deb("   PDC: init");

        tree = oTree.nodes;

        H.QRY("INGAME").forEach(node => {
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
      onReady: function(verb, info){

        var p, i = producers.length;

        while((p = producers[--i])){
          if(p.queue && p.queue.length){
            if (H.delete(p.queue, task => task[0] === info)){
              break;
            }
          }
        }

      },
      find: function(product, ccid){

        var producer = null, verb = tree[product].verb, i = producers.length;

        // has no producer
        if(!verb){return null;}

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
            while ((producer = producers[--i])){
              name = producer.name.split("#")[0];
              if (tree[name].products.research[product]){
                if (producer.queue.length <= maxQueue){
                  break;
                }
              }        
            }
          break;
          
          case "train":
            while ((producer = producers[--i])){
              name = producer.name.split("#")[0];
              if (tree[name].products.train[product]){
                if (ccid && H.MetaData[producer.id].ccid === ccid){
                  if (producer.queue.length <= maxQueue){
                    break;
                  }
                }
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
        var node = H.QRY("INGAME WITH id = " + id).first();
        if(node){
          if (isProducer(node.name)){
            node.queue = [];
            producers.push(node);
            deb("   PDC: loadById #%s, %s", id, node.name);
          }
        } else{
          deb("ERROR: PDC loadById failed #%s", id);
        }
      },
      removeById: function(id){
        if (H.delete(producers, p => p.id === id)){ // could get slow...
          deb("   PDC: removed #%s, %s", id, p.name);
        } else {
          deb("INFO : PDC didn't remove #%s", id);
        }
      },

    };

  }().boot());

  H.Order = function(config){

    H.extend(this, config, {
      id: H.Objects(this),
      remaining:  config.amount,
      processing: 0,
      executable: false,
      x: config.location && config.location.length ? config.location[0] : undefined,
      z: config.location && config.location.length ? config.location[1] : undefined
    });

    //TODO: make units move to order.position

  };

  H.Order.prototype = {
    constructor: H.Order,
    evaluate: function(allocs){

      var self = this;

      this.executable = false; // ready to send

      this.nodes = H.QRY(this.hcq).forEach(function(node){
        // think positive
        node.qualifies = true;
      });

      // assigns ingames if available and matching
      this.assignExisting();      
      if (this.remaining === 0){
        return;
      } 

      // check whether ingame producer exists
      this.nodes.forEach(function(node){
        node.producer  = H.Producers.find(node.name, self.ccid);
        node.qualifies = !node.producer ? false : node.qualifies;
      });

      // any unmet techs
      this.nodes.forEach(function(node){
        var req = H.Bot.tree.nodes[node.name].requires;
        node.qualifies = req ? H.Technologies.available([req]) : node.qualifies;
      });  

      // remove disqualified nodes
      H.delete(this.nodes, node => !node.qualifies);

      if (this.nodes.length){

        this.executable = true;

        // simple sort for cheapest TODO: Eco may have other prios
        this.nodes = this.nodes
          .sort(function(an, bn){return an.costs.metal - bn.costs.metal;})
          .sort(function(an, bn){return an.costs.stone - bn.costs.stone;})
          .sort(function(an, bn){return an.costs.wood  - bn.costs.wood;})
          .sort(function(an, bn){return an.costs.food  - bn.costs.food;});

        // write costs for first into allocs
        allocs.food  += this.nodes[0].costs.food  * this.remaining;
        allocs.wood  += this.nodes[0].costs.wood  * this.remaining;
        allocs.stone += this.nodes[0].costs.stone * this.remaining;
        allocs.metal += this.nodes[0].costs.metal * this.remaining;

      }

    },
    assignExisting: function(){

      var hcq, nodes;

      // looking for unit not assigned to a group
      if (this.verb === "train"){
        hcq = this.hcq + " INGAME WITH metadata.opname = 'none'";

      // looking for a shared structure
      } else if (this.verb === "build" && this.shared) {
        hcq = this.hcq + " INGAME WITH metadata.opmode = 'shared'";

      // looking for abandoned structure not assigned to a group
      } else if (this.verb === "build" && !this.shared) {
        hcq = this.hcq + " INGAME WITH metadata.opname = 'none'";

      } else {
        deb("Error: assignExisting run into unhandled case: %s, shared: %s", this.verb, this.shared);
        return;

      }

      nodes = H.QRY(hcq).execute(); // "metadata", 5, 10, "assignExisting");

      nodes.slice(0, this.remaining - this.processing).forEach(function(node){
        // deb("    OC: #%s found existing: %s FOR %s", this.id, node.name, hcq.slice(0,30));
        this.processing += 1; 
        H.Economy.listener("onOrderReady", node.id, {metadata: {order: this.id}});
      }, this);

    },
    checkProducers: function(){

      // picks an in game producer for each node, currently the first found
      // trainingQueueTime === trainingQueueLength for train, research O_O

      var self = this;

      this.nodes.forEach(function(node){
        node.producer  = H.Producers.find(node.name, self.order.ccid);
        node.qualifies = !node.producer ? false : node.qualifies;
      });

      // var hcq, prods, verb = {
      //       "train":      "TRAINEDBY",
      //       "build":      "BUILDBY",
      //       "research":   "RESEARCHEDBY",
      //       "claim":      "???"
      //     }[this.order.verb];

      // this.nodes.forEach(function(node){
      //   hcq   = H.format("%s %s INGAME", node.name, verb);
      //   prods = H.QRY(hcq).execute();
      //   if (prods.length) {
      //     node.producer = prods[0].id;
      //     // deb("    OC: #%s found ingame producer: %s (#%s) FOR %s WITH ACTION: %s", self.order.id, prods[0].name, prods[0].id, node.name, self.order.verb);
      //   } else {
      //     node.qualifies = false;
      //   }
      // }, this);  

    },
    checkRequirements: function(){

      var self = this, good = 0, bad = 0, tree = H.Bot.tree.nodes, req;

      // testing each node for tech requirements
      this.nodes.forEach(function(node){
        req = tree[node.name].requires;
        node.qualifies = req ? H.Technologies.available([req]) : true;
        good += node.qualifies ? 1 : 0;
        bad  += node.qualifies ? 0 : 1;
      });    

      if (good + bad){
        deb("    OC: #%s requirements %s/%s FOR %s", self.order.id, good, bad, this.order.hcq);
      }

    }

  };

  H.OrderQueue = (function(){
    var self, t0, tP, queue = [], log = {rem: [], exe: [], ign: []};
    return {
      get length () {return queue.length;},
      boot:    function(){self = this; return self;},
      append:  function(item){queue.push(item); return self;},
      prepend: function(item){queue.unshift(item); return self;},
      remove:  function(item){H.remove(queue, item);},
      forEach: queue.forEach.bind(queue),
      filter:  queue.filter.bind(queue),
      search:  function(fn){
        var i, len = queue.length;
        for (i=0;i<len;i++){
          if (fn(queue[i])){
            return queue[i];
          }
        }
        return undefined;
      },
      log: function(t0){

        // isGo    = H.OrderQueue.filter(function(r){return r.go;}).length,
        // isEval  = H.OrderQueue.filter(function(r){return r.evaluated;}).length;

        deb("    OQ: queue: %s, %s msecs, rem: %s, ign: %s, exe: %s", queue.length, tP, log.rem, log.ign, log.exe);

      },      
      process: function(){

        var 
          amount, node, id, msg, source, exec, t = H.tab,
          allocs     = H.deepcopy(allocations),
          budget     = H.deepcopy(H.Stats.stock),
          allGood    = false, 
          builds     = 0; // only one construction per tick
          
        t0 = Date.now();
        log.rem.length = 0; log.ign.length = 0; log.exe.length = 0;

        if (!queue.length){return;}

        // deb("    OQ: have: %s", queue.map(o => o.id));

        queue
          .forEach(order => {
            order.evaluate(allocs);
            // deb("    OQ: evalutated #%s to %s nodes: %s", order.id, order.executable, order.nodes.length);
        });

        allGood = H.Economy.fits(allocs, budget);
        deb("    OQ: len: %s, allGood: %s, allocs: %s", queue.length, allGood, uneval(allocs));

        msg = "    OQ: #%s %s amt: %s, rem: %s, pro: %s, verb: %s, nodes: %s, from %s";
        queue
          .forEach(o => {
            exec = o.executable ? "X" : "-";
            source = H.Objects(o.source).name;
            deb(msg, t(o.id, 3), exec, t(o.amount, 2), t(o.remaining, 2), t(o.processing, 2), o.verb, t(o.nodes.length, 3), source);
        });

        queue
          .filter(function(order){return order.executable && order.remaining - order.processing > 0;})
          .forEach(function(order){

            id = order.id;
            node = order.nodes[0];
            amount = allGood ? order.remaining - order.processing : 1;

            if (allGood || self.fits(node.costs, budget)){

              switch(order.verb){

                case "train":
                  // deb("    PQ: #%s train, prod: %s, amount: %s, tpl: %s", id, node.producer, amount, node.key);
                  H.Economy.do("train", amount, node.producer, node.key, order);
                  H.Economy.subtract(node.costs, budget);
                  order.processing += amount;
                  log.exe.push(id + ":" + amount);
                break;

                case "build":
                  if (builds === 0){
                    // deb("    PQ: #%s construct, prod: %s, amount: %s, pos: %s, tpl: %s", id, node.producer, amount, order.x + "|" + order.z, node.key);
                    H.Economy.do("build", amount, node.producer, node.key, order);
                    H.Economy.subtract(node.costs, budget);
                    order.processing += amount;
                    builds += 1;
                  } else {
                    deb("    OQ: #%s build postponed", id);
                  }
                break;

                case "research":
                  H.Economy.do("research", 1, node.producer, node.key, order);
                  H.Economy.subtract(node.costs, budget);
                  order.processing += amount;
                  log.exe.push(id + ":" + amount);
                break;

                default:
                  deb("ERROR : orderQueue.process: #%s unknown order.verb: %s", id, order.verb);

              }

            } else {
              log.ign.push(id);

            }


        });

        queue
          .filter(function(order){return order.remaining === 0;})
          .forEach(function(order){
            log.rem.push(order.id);
            self.remove(order);
        });

        tP = Date.now() - t0;

      }

    };

  }().boot());

  // Group assets place orders with hcq as filter, location and amount
    // order.id is taken from H.Objects
    // order.remaining is set to order.amount
    // order.processing is set to 0
    // order is appended to queue
    // queued orders are evaluated every n ticks and 
    //   if tech is researched 
    //     order is removed
    //   if order.remaining == 0 
    //     order is removed
    //   if order.remaining + order.processing = order.amount 
    //     order is ignored
    //   order.executable is set to false
    //   if n existing units or structures are available
    //     they are passed to groups
    //     order.remaining -= n
    //   if a producer exists and all requirements are met
    //     order.producer is selected
    //     order.executable = true

    // executable orders are processed every n ticks 
    // first over full amount then on single 
    //   order.unprocessed = order.remaining - order.processing
    //   if budget > order.unprocessed.cost
    //   if budget > order.single.cost
    //     if unit and producer.queue < 3
    //       order is passed to producer
    //       producer.queue += 1
    //       order.processing += order.unprocessed/single
    //       producer sends order to engine
    //     if structure
    //       producer sends order to engine
    //       order.processing += order.unprocessed/single

    // created foundations, trained units and researched techs appear later in events
    // TrainingFinished // AIMetadata
    //   H.Bot.culture.loadById(id);
    //   H.Economy.listener("onOrderReady", id, event);
    //     event.metadata.order has order.id
    //     order.processing -= 1
    //     order.remaining -= 1
    // new researchedTechs
    //   Events.dispatchEvent("onAdvance", "onAdvance", {name: name, tech: tech});

  H.Economy = (function(){

    var 
      self, goals, groups, planner, 
      phases  = ["phase.village", "phase.town", "phase.city"],
      ccid = H.Centre ? H.Centre.id : 0,

      ressTargets = {
        "food":  0,
        "wood":  0,
        "stone": 0,
        "metal": 0,
        "pop":   0,
      },

      ressGroups = [
        [1, "g.scouts",    ccid,                           1],       // depends on map size
        [1, "g.harvester", ccid,                           5],       // needed for trade?
        // [1, "g.builder",   ccid, class2name("house"),      2, 2],    // depends on building time
        // [1, "g.builder",   ccid, class2name("barracks"),   2, 1],    // depends on civ and # enemies
        // [1, "g.builder",   ccid, class2name("blacksmith"), 2, 1],    // one is max, check required techs
        [1, "g.supplier",  ccid, "metal",                  1],               // 
        [1, "g.supplier",  ccid, "stone",                  1],
        [1, "g.supplier",  ccid, "wood",                  10],
        [1, "g.supplier",  ccid, "food.fruit",             4],       // availability
        [1, "g.supplier",  ccid, "food.meat",              2],       // availability
      ];

    self = {
      boot: function(){self = this; return self;},
      init: function(){
        deb();deb();deb("   ECO: init");
        H.Events.registerListener("onAdvance", self.listener);
      },
      tick: function(secs, ticks){
        var t0 = Date.now();
        if ((ticks % H.Config.economy.intervalMonitorGoals) === 0){
          self.monitorGoals();
        }
        H.OrderQueue.process();
        H.OrderQueue.log();
        return Date.now() - t0;
      },
      monitorGoals: function(){

      },
      advancePhase: function(phase){

        deb("   ECO: advancePhase '%s'", phase);
        planner  = H.Brain.requestPlanner(phase);

        // deb("     E: planner.result.data: %s", uneval(planner.result.data));

        ressTargets.food  = planner.result.data.cost.food  || 0 + planner.result.data.ress.food;
        ressTargets.wood  = planner.result.data.cost.wood  || 0 + planner.result.data.ress.wood;
        ressTargets.metal = planner.result.data.cost.metal || 0 + planner.result.data.ress.metal;
        ressTargets.stone = planner.result.data.cost.stone || 0 + planner.result.data.ress.stone;

        deb("     E: ressTargets: %s", uneval(ressTargets));

        goals  = H.Brain.requestGoals(phase);
        groups = H.Brain.requestGroups(phase);
        goals.forEach(g =>  deb("     E: goal:  %s", g));
        groups.forEach(g => deb("     E: group: %s", g));

        groups.forEach(group => {
          var [quantity, name, ccid, p1, p2, p3] = group;
          H.range(quantity).forEach(() => {
            H.Groups.launch(name, ccid, [p1, p2, p3]);
          });
        });

        // H.Groups.log();

      },
      subtract: function(cost, budget){
        budget.food  -= cost.food  > 0 ? cost.food  : 0;
        budget.wood  -= cost.wood  > 0 ? cost.wood  : 0;
        budget.metal -= cost.metal > 0 ? cost.metal : 0;
        budget.stone -= cost.stone > 0 ? cost.stone : 0;
      },
      fits: function(cost, budget){
        return (
          (cost.food  || 0) <= (budget.food  || 0) &&
          (cost.wood  || 0) <= (budget.wood  || 0) &&
          (cost.stone || 0) <= (budget.stone || 0) &&
          (cost.metal || 0) <= (budget.metal || 0)
        );  
      },
      diff: function(cost, budget){
        return {
          food:  ((cost.food  || 0) > (budget.food  || 0)) ? cost.food  - (budget.food  || 0) : undefined,
          wood:  ((cost.wood  || 0) > (budget.wood  || 0)) ? cost.wood  - (budget.wood  || 0) : undefined,
          stone: ((cost.stone || 0) > (budget.stone || 0)) ? cost.stone - (budget.stone || 0) : undefined,
          metal: ((cost.metal || 0) > (budget.metal || 0)) ? cost.metal - (budget.metal || 0) : undefined
        };
      },
      // request: function(ccid, amount, order, position){
      request: function(order){

        var  // debug
          sourcename = H.Objects(order.source).name,  // this is an asset instance
          loc = (order.location === undefined) ? "undefined" : order.location.map(p => p.toFixed(1)),
          msg = "  EREQ: #%s, %s amount: %s, ccid: %s, loc: %s, from: %s, shared: %s, hcq: %s";

        // order.stamp  = H.Bot.turn;
        // order.id     = H.Objects(order);
        // order.ccid   = ccid;
        // order.amount = amount;
        // if (position && position.length){
        //   order.x = position[0];
        //   order.z = position[1];
        // }
        H.OrderQueue.append(order);

        deb(msg, order.id, order.verb, order.amount, order.ccid, loc, sourcename, order.shared, order.hcq.slice(0, 30));

      },

      do: function(verb, amount, producer, template, order){

        var 
          pos, id = producer.id, task, 
          msg = ( verb === "build" ?
            "   EDO: #%s %s, producer: %s, amount: %s, tpl: %s, x: %s, z: %s" : 
            "   EDO: #%s %s, producer: %s, amount: %s, tpl: %s"
          );

        if (verb === "build" && order.x === undefined){deb("ERROR : order #%s %s without position", id, verb); return;}


        switch(verb){

          case "train" :
            task = H.Task.id;
            producer.queue.push([task, order]);
            H.Engine.train([id], template, amount, {order: order.id, task: task});
            msg = H.format(msg, order.id, verb, id, amount, template); 
          break;

          case "research" : 
            producer.queue.push([template, order]);
            H.Engine.research(id, template);
            msg = H.format(msg, order.id, verb, id, 1, template); 
          break;

          case "build" : 
            // needs no queue
            pos = H.Map.findGoodPosition(template, [order.x, order.z]);
            H.Engine.construct([id], template, [pos.x, pos.z, pos.angle], {order: order.id});
            msg = H.format(msg, order.id, verb, id, 1, template, order.x.toFixed(0), order.z.toFixed(0)); 

          break;

        }

        deb(msg);

      },
      listener: function(type, id, event){

        var order;

        switch(type){

          case "onAdvance":
            deb("   ECO: onAdvance: %s", event.name);
            if (phases.indexOf(event.name) !== -1){
              self.advancePhase(event.name);
            }
            H.Producers.onReady("research", event.name);
            // TODO: order
          break;

          case "onOrderReady" :

            order = H.Objects(event.metadata.order);
            order.remaining  -= 1;
            order.processing -= 1;
            deb("   ECO: #%s onOrderReady rem: %s, pro: %s, id: %s, %s", order.id, order.remaining, order.processing, id, H.Entities[id]._templateName);
            H.Objects(order.source).listener("Ready", id);  
            if (order.verb === "train"){
              H.Producers.onReady("train", event.metadata.task);
            }

          break;

          default:
            deb("  WARN: got unknown event in eco: %s", uneval(arguments));
        }

      },
      logTick: function(){

        var msg,
            stock = H.Stats.stock, 
            // stack = H.Stats.stack, 
            trend = H.Stats.trend,
            f = function(n){return n>0?"+"+n:n===0?" 0":n;},
            t = H.tab;

        msg = H.format("   ECO: F%s %s, W%s %s, M%s %s, S%s %s, P%s %s, A%s %s, H%s %s", 
          t(stock.food,   6), f(trend.food.toFixed(3)),
          t(stock.wood,   6), f(trend.wood.toFixed(3)),
          t(stock.metal,  6), f(trend.metal.toFixed(3)),
          t(stock.stone,  6), f(trend.stone.toFixed(3)),
          t(stock.pops,   4), f(trend.pops.toFixed(3)),
          t(stock.area,   4), f(trend.area.toFixed(3)),
          t(stock.health, 4), f(trend.health.toFixed(3))
        );

        deb(msg);

      }

    };

    self.listener.callsign = "economy";
    return self;

  }()).boot();


return H; }(HANNIBAL));


// H.Economy.barter = function(source, sell, buy, amount){
//   var markets = gameState.getOwnEntitiesByType(gameState.applyCiv("structures/{civ}_market"), true).toEntityArray();
//   markets[0].barter(buy,sell,100);
//   Engine.PostCommand({"type": "barter", "sell" : sellType, "buy" : buyType, "amount" : amount });      
//   new api this.barterPrices = state.barterPrices;
// };

// logObject(sharedScript.playersData[this.id].statistics);
//   buildingsConstructed: NUMBER (0)
//   buildingsLost: NUMBER (0)
//   buildingsLostValue: NUMBER (0)
//   civCentresBuilt: NUMBER (0)
//   enemyBuildingsDestroyed: NUMBER (0)
//   enemyBuildingsDestroyedValue: NUMBER (0)
//   enemyCivCentresDestroyed: NUMBER (0)
//   enemyUnitsKilled: NUMBER (0)
//   enemyUnitsKilledValue: NUMBER (0)
//   percentMapExplored: NUMBER (3)
//   resourcesBought: OBJECT (food, wood, metal, stone, ...)[4]
//   resourcesGathered: OBJECT (food, wood, metal, stone, vegetarianFood, ...)[5]
//   resourcesSold: OBJECT (food, wood, metal, stone, ...)[4]
//   resourcesUsed: OBJECT (food, wood, metal, stone, ...)[4]
//   tradeIncome: NUMBER (0)
//   treasuresCollected: NUMBER (0)
//   tributesReceived: NUMBER (0)
//   tributesSent: NUMBER (0)
//   unitsLost: NUMBER (0)
//   unitsLostValue: NUMBER (0)
//   unitsTrained: NUMBER (0)

  

// Object: playersData  ---------------
//   0: OBJECT (name, civ, colour, popCount, popLimit, ...)[27]
//   1: OBJECT (name, civ, colour, popCount, popLimit, ...)[27]
//   2: OBJECT (name, civ, colour, popCount, popLimit, ...)[27]
//     cheatsEnabled: BOOLEAN (false)
//     civ: STRING (athen)
//     classCounts: OBJECT (Structure, ConquestCritical, Civic, Defensive, CivCentre, ...)[19]
//     colour: OBJECT (r, g, b, a, ...)[4]
//     entityCounts: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]
//     entityLimits: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]
//     heroes: ARRAY (, ...)[0]
//     isAlly: ARRAY (false, true, false, ...)[3]
//     isEnemy: ARRAY (true, false, true, ...)[3]
//     isMutualAlly: ARRAY (false, true, false, ...)[3]
//     isNeutral: ARRAY (false, false, false, ...)[3]
//     name: STRING (Player 1)
//     phase: STRING (village)
//     popCount: NUMBER (17)
//     popLimit: NUMBER (20)
//     popMax: NUMBER (300)
//     researchQueued: OBJECT (, ...)[0]
//     researchStarted: OBJECT (, ...)[0]
//     researchedTechs: OBJECT (phase_village, ...)[1]
//     resourceCounts: OBJECT (food, wood, metal, stone, ...)[4]
//     state: STRING (active)
//     statistics: OBJECT (unitsTrained, unitsLost, unitsLostValue, enemyUnitsKilled, enemyUnitsKilledValue, ...)[21]
//     team: NUMBER (-1)
//     teamsLocked: BOOLEAN (false)
//     techModifications: OBJECT (, ...)[0]
//     trainingBlocked: BOOLEAN (false)
//     typeCountsByClass: OBJECT (Structure, ConquestCritical, Civic, Defensive, CivCentre, ...)[19]



