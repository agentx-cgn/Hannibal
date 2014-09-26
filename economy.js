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

      stock.food   = H.GameState.playerData.resourceCounts.food;
      stock.wood   = H.GameState.playerData.resourceCounts.wood;
      stock.stone  = H.GameState.playerData.resourceCounts.stone;
      stock.metal  = H.GameState.playerData.resourceCounts.metal;
      stock.pops   = H.GameState.playerData.popCount;
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

  function Trainer () {}
  Trainer.prototype = {
    constructor: Trainer,
    init:  function(){},
    queue: function(){},
    listener: function(){},
  };

  // Array with slightly different API
  H.Queue = (function(){
    var self, queue = [];
    return {
      boot:     function(){
        self = this;
        Object.defineProperty(self, "length", {get: function(){return queue.length;}});        
        return self;
      },
      append:   function(item){queue.push(item); return self;},
      prepend:  function(item){queue.unshift(item); return self;},
      remove:   function(item){H.remove(queue, item);},
      forEach: queue.forEach.bind(queue),
      filter:  queue.filter.bind(queue),
      // filterX:   function(fn){return queue.filter(fn);}
      search:   function(fn){
        var i, len = queue.length;
        for (i=0;i<len;i++){
          if (fn(queue[i])){
            return queue[i];
          }
        }
        return undefined;
      },
    };

  }().boot());

  // local process wrapper around an order
  H.Order = function(order){

    var self = this;
    this.order = order;
    this.remaining = order.amount;
    this.executed  = 0;             // send to engine

    //TODO: make units move to order.position

    // this.order.ready = function(amount, type, id){

    //   self.remaining -= amount;

    //   // deb("   ORD: #%s ready.in: amount/rem/tot: %s/%s/%s, hcq: %s", order.id, amount, self.remaining, self.order.amount, self.order.hcq);

    //   if (self.order.shared){
    //     H.Objects(order.source).listener("Ready", id);  
    //   } else {
    //     H.Objects(order.source).listener("Ready", id);  
    //   }
      

    // };

  };

  H.Order.prototype = {
    constructor: H.Order,
    evaluate: function(allocs){

      var self  = this, order = this.order;

      this.execute = false; // ready to send

      this.nodes = H.QRY(order.hcq).forEach(function(node){
        // think positive
        node.qualifies = true;
      });
    
      // assigns ingames if available and matching
      this.assignExisting();      
      if (this.remaining === 0){
        return;
      } 

      this.checkProducers();      // can we produce nodes now?
      this.checkRequirements();   // any other obstacles?

      // remove disqualified nodes
      this.nodes
        .filter(function(node){return !node.qualifies;})
        .forEach(function(node){
          self.nodes.splice(self.nodes.indexOf(node), 1);
      });

      if (this.nodes.length){

        // mark
        this.execute = true;

        // simple sort for cheapest 
        this.nodes = this.nodes
          .sort(function(an, bn){return an.costs.metal - bn.costs.metal;})
          .sort(function(an, bn){return an.costs.stone - bn.costs.stone;})
          .sort(function(an, bn){return an.costs.wood  - bn.costs.wood;})
          .sort(function(an, bn){return an.costs.food  - bn.costs.food;});

        // write costs for remaining into allocs
        allocs.food  += this.nodes[0].costs.food  * this.remaining;
        allocs.wood  += this.nodes[0].costs.wood  * this.remaining;
        allocs.stone += this.nodes[0].costs.stone * this.remaining;
        allocs.metal += this.nodes[0].costs.metal * this.remaining;

        // deb("    OE: #%s have %s nodes, execute: %s, cost of first: ", order.id, this.nodes.length, this.execute, H.prettify(this.nodes[0].costs));

      } else {
        deb("    OE: #%s no nodes left", order.id);

      }

    },
    assignExisting: function(){

      var hcq, nodes, self = this;

      // looking for unit not assigned to a group
      if (this.order.verb === "train"){
        hcq = this.order.hcq + " INGAME WITH metadata.opname = 'none'";

      // looking for a shared structure
      } else if (this.order.verb === "build" && this.order.shared) {
        hcq = this.order.hcq + " INGAME WITH metadata.opmode = 'shared'";

      // looking for abandoned structure not assigned to a group
      } else if (this.order.verb === "build" && !this.order.shared) {
        hcq = this.order.hcq + " INGAME WITH metadata.opname = 'none'";

      } else {
        deb("Error: assignExisting run into unhandled case: %s, shared: %s", this.order.verb, this.order.shared);
        return;

      }

      nodes = H.QRY(hcq).execute(); // "metadata", 5, 10, "assignExisting");

      if (!nodes.length) {
        // deb("    OC: #%s found none existing for %s", this.order.id, hcq);
      }
      nodes.slice(0, this.remaining).forEach(function(node){
        deb("    OC: #%s found existing: %s FOR %s", this.order.id, node.name, hcq);
        this.executed += 1; 
        // this.order.ready(1, "Assign", node.id);
        H.Economy.listener("onOrderReady", node.id, {metadata: {order: this.order.id}});
      }, this);

    },
    checkProducers: function(){

      // picks an in game producer for each node, currently the first found
      // trainingQueueTime === trainingQueueLength for train, research O_O

      var hcq, prods, verb = {
            "train":      "TRAINEDBY",
            "build":      "BUILDBY",
            "research":   "RESEARCHEDBY",
            "claim":      "???"
          }[this.order.verb];

      this.nodes.forEach(function(node){
        hcq   = H.format("%s %s INGAME", node.name, verb);
        prods = H.QRY(hcq).execute();
        if (prods.length) {
          node.producer = prods[0].id;
          // deb("    OC: #%s found ingame producer: %s (#%s) FOR %s WITH ACTION: %s", self.order.id, prods[0].name, prods[0].id, node.name, self.order.verb);
        } else {
          node.qualifies = false;
        }
      }, this);  

    },
    checkRequirements: function(){

      var self = this, hcq, good = 0, bad = 0,
          tree = H.Bot.tree.nodes, req;

      // testing each node for tech requirements
      this.nodes.forEach(function(node){
        req = tree[node.name].requires;
        node.qualifies = req ? H.Technologies.available([req]) : true;
        good += node.qualifies ? 1 : 0;
        bad  += node.qualifies ? 0 : 1;
        // hcq  = H.format("%s REQUIRE", node.name);
        // nodes = H.QRY(hcq).execute();
        // if(nodes.length){
        //   names = nodes.map(function(req){return req.name;});
        //   node.qualifies = H.Technologies.available(names);
        //   good += node.qualifies ? 1 : 0;
        //   bad  += node.qualifies ? 0 : 1;
        // }
      });    

      if (good + bad){
        deb("    OC: #%s requirements %s/%s FOR %s", self.order.id, good, bad, this.order.hcq);
      }

    }

  };


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
        self.processQueue();
        self.logQueue(t0);
        return Date.now() - t0;
      },
      listener: function(type, id, event){

        var order;

        deb("   ECO: Event: %s", uneval(arguments));

        switch(type){

          case "onAdvance":
            if (phases.indexOf(event.name) !== -1){
              self.advancePhase(event.name);
            }
          break;

          case "onOrderReady" :

            order = H.Objects(event.metadata.order);
            order.remaining -= 1;
            H.Objects(order.source).listener("Ready", id);  

          break;

          default:
            deb("  WARN: got unknown event in eco: %s", uneval(arguments));
        }

      },
      monitorGoals: function(){

      },
      advancePhase: function(phase){

        deb("   ECO: advancePhase '%s'", phase);
        planner  = H.Brain.requestPlanner(phase);

        deb("     E: planner.result.data: %s", uneval(planner.result.data));

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

        H.Groups.log();

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
      request: function(amount, order, position){

        var sourcename = H.Objects(order.source).name,  // this is a resource instance
            loc = (position === undefined) ? "undefined" : H.prettify(position);

        order.stamp  = H.Bot.turn;
        order.id     = H.Objects(order);
        order.amount = amount;
        if (position && position.length){
          order.x = position[0];
          order.z = position[1];
        }
        H.Queue.append(new H.Order(order));

        deb("  EREQ: #%s, %s amount: %s, loc: %s, from: %s, hcq: %s", order.id, order.verb, amount, loc, sourcename, order.hcq);

      },
      processQueue: function(){

        var 
          allocs  = H.deepcopy(allocations),
          budget  = H.deepcopy(H.Stats.stock),
          allGood = false, 
          removed = [],
          expensive  = [],
          executed   = [],
          builds     = 0; // only one construction per tick

        if (!H.Queue.length){return;}

        H.Queue
          .forEach(function(order){order.evaluate(allocs);});

        allGood = self.fits(allocs, budget);
        deb("    PQ: allGood: %s, allocs: %s", allGood, H.prettify(allocs));

        H.Queue
          .filter(function(order){return order.execute && order.executed < order.order.amount;})
          .forEach(function(order){

            var amount = allGood ? order.order.amount - order.executed : 1,
                node = order.nodes[0],
                id = order.order.id;

            if (allGood || self.fits(node.costs, budget)){

              switch(order.order.verb){

                case "train":
                  // deb("    PQ: #%s train, prod: %s, amount: %s, tpl: %s", id, node.producer, amount, node.key);
                  H.Economy.execute("train", amount, node.producer, node.key, order.order);
                  H.Economy.subtract(node.costs, budget);
                  order.executed += amount;
                  executed.push(id + ":" + amount);
                break;

                case "build":
                  if (builds < 1){
                    // deb("    PQ: #%s construct, prod: %s, amount: %s, pos: %s, tpl: %s", id, node.producer, amount, order.order.x + "|" + order.order.z, node.key);
                    H.Economy.execute("build", amount, node.producer, node.key, order.order);
                    H.Economy.subtract(node.costs, budget);
                    order.executed += amount;
                    builds += 1;
                  } else {
                    deb("    PQ: #%s postponed", id);
                  }
                break;

                // case "research":
                // break;

                default:
                  deb("ERROR : processQueue: #%s unknown order.verb: %s", id, order.order.verb);

              }

            } else {
              expensive.push(id);

            }


        });

        H.Queue
          .filter(function(order){return order.executed >= order.order.amount;})
          .forEach(function(order){
            removed.push(order.order.id);
            H.Queue.remove(order);
        });

        if (executed.length){
          deb("    PQ: executed: %s", executed);
        }
        if (removed.length){
          deb("    PQ: removed from queue: %s", removed);
        }
        if (expensive.length){
          deb("    PQ: can't afford. %s", expensive);
        }


      },
      execute: function(verb, amount, id, template, order){

        var msg, pos;

        // deb("    OEX: #%s, verb: %s, amount: %s, order: %s, tpl: %s", id, verb, amount, H.prettify(order), template);

        switch(verb){

          case "train" :
            H.Engine.train([id], template, amount, {order: order.id});
            msg = H.format("   OEX: #%s %s, trainer: %s, amount: %s, tpl: %s", order.id, verb, id, amount, template); 
          break;

          case "research" : 
            H.Engine.research([id], template);
            msg = H.format("   OEX: %s id: %s, %s", verb, order.id, id, template); 
            
          break;

          case "build" : 
            if (order.x === undefined){deb("ERROR: %s without position", verb); return;}
            pos = H.Map.findGoodPosition(template, [order.x, order.z]);
            H.Engine.construct([id], template, [pos.x, pos.z, pos.angle], {order: order.id});
            msg = H.format("   OEX: #%s %s, constructor: %s, x: %s, z: %s, tpl: %s", 
                                       order.id, verb, id, order.x.toFixed(0), order.z.toFixed(0), template); 

          break;

        }

        deb(msg);

      },
      logQueue: function(t0){

        var inQueue = H.Queue.length;
            // isGo    = H.Queue.filter(function(r){return r.go;}).length,
            // isEval  = H.Queue.filter(function(r){return r.evaluated;}).length;

        deb("   ECO: queue: %s, dur: %s msecs", inQueue, Date.now() - t0);

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



