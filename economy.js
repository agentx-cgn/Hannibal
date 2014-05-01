/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, Engine, deb, logObject */

/*--------------- E C O N O M Y -----------------------------------------------

  Priotizes requests for resources. Trains, researches and construct them.


  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  /* lots of domain knowledge here.


  */

  // relies on c before e
  var config = H.Config.economy,
      ress = {food: 0, wood: 0, stone: 0, metal: 0, pops: 0, health: 0, area: 0};


  H.Stats = {

    stock: H.deepcopy(ress), // currently available via API
    alloc: H.deepcopy(ress), // allocated per queue
    forec: H.deepcopy(ress), // ???
    trend: H.deepcopy(ress), // as per stack
    stack: H.map(ress, H.createRingBuffer.bind(null, config.stack)), // last x stock vals
    tick: function(){

      var t0 = Date.now(), curHits = 0, maxHits = 0, 
          stock   = H.Stats.stock, 
          stack   = H.Stats.stack, 
          trend   = H.Stats.trend, 
          ctx     = H.Context;
          
      ctx.lstUnits.forEach(function(unit){
        curHits += unit.hitpoints();
        maxHits += unit.maxHitpoints();
      });    

      stock.food   = H.GameState.playerData.resourceCounts.food;
      stock.wood   = H.GameState.playerData.resourceCounts.wood;
      stock.stone  = H.GameState.playerData.resourceCounts.stone;
      // stock.metal  = ctx.cntMetal;
      stock.metal  = H.GameState.playerData.resourceCounts.metal;
      // stock.pops   = ctx.cntPopulation;
      stock.pops   = H.GameState.playerData.popCount
      // stock.area   = ctx.perMapExplored;
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

  // Array with slightly different API
  H.Queue = (function(){
    var self, queue = [];
    return {
      init:     function(){
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

  }().init());

  // local process wrapper around an order
  H.Order = function(order){

    var self = this;
    this.order = order;
    this.remaining = order.amount;

    this.order.ready = function(amount, type, id){
      self.remaining -= amount;

      deb("   ORD: #%s ready.in: amount/rem/tot: %s/%s/%s, hcq: %s", order.id, amount, self.remaining, self.order.amount, self.order.hcq);

      if (self.order.shared){
        H.Objects(order.source).listener("Ready", id);  
      } else {
        H.Objects(order.source).listener("Ready", id);  
      }
      

    };

  };

  H.Order.prototype = {
    evaluate:   function(allocs){

      var self  = this,
          order = this.order,
          type  = this.order.type;

      this.executed = false; this.execute = false;

      this.nodes = H.QRY(order.hcq).forEach(function(node){
        // think positive
        node.qualifies = true;
      });
    
      // assigns ingames if available and matching
      this.assignExisting();      
      if (this.remaining === 0){
        this.executed = true; 
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

        deb("    OE: #%s have %s nodes, execute: %s, cost of first: ", order.id, this.nodes.length, this.execute, H.prettify(this.nodes[0].costs));

      } else {
        deb("    OE: #%s no nodes left", order.id);

      }

    },
    assignExisting: function(){

      var self  = this, hcq, nodes;

      // looking for unit not assigned to a group
      if (this.order.type === "train"){
        hcq = this.order.hcq + " INGAME WITH metadata.opname = 'none'";

      // looking for a shared structure
      } else if (this.order.type === "construct" && this.order.shared) {
        hcq = this.order.hcq + " INGAME WITH metadata.opmode = 'shared'";

      // looking for abandoned structure not assigned to a group
      } else if (this.order.type === "construct" && !this.order.shared) {
        hcq = this.order.hcq + " INGAME WITH metadata.opname = 'none'";

      } else {
        deb("Error: assignExisting run into unhandled case: %s, shared: %s", this.order.type, this.order.shared);
        return;

      }

      nodes = H.QRY(hcq).execute(); // "metadata", 5, 10, "assignExisting");

      if (!nodes.length) {
        deb("    OC: #%s found none existing for %s", self.order.id, hcq);
      }
      nodes.slice(0, this.remaining).forEach(function(node){
        deb("    OC: #%s found existing: %s FOR %s", self.order.id, node.name, hcq);
        self.order.ready(1, "Assign", node.id);
      });

    },
    checkProducers: function(){

      // picks an in game producer for each node, currently the first found
      // trainingQueueTime === trainingQueueLength for train, research O_O

      var self = this, hcq, prods,
          verb = {
            "train":      "TRAINEDBY",
            "construct":  "BUILDBY",
            "research":   "RESEARCHEDBY",
            "claim":      "???"
          }[this.order.type];

      this.nodes.forEach(function(node){
        hcq   = H.format("%s %s INGAME", node.name, verb);
        prods = H.QRY(hcq).execute();
        if (prods.length) {
          node.producer = prods[0].id;
          deb("    OC: #%s found ingame producer: %s (#%s) FOR %s WITH ACTION: %s", self.order.id, prods[0].name, prods[0].id, node.name, self.order.type);
        } else {
          node.qualifies = false;
        }
      });  

    },
    checkRequirements: function(){

      var self = this, hcq, names, reqs;

      // testing each node for tech requirements
      this.nodes.forEach(function(node){
        hcq  = H.format("%s REQUIRE", node.name);
        reqs = H.QRY(hcq).execute();
        if(reqs.length){
          if (node.name !== "phase.town"){
            node.qualifies = false;
            names = reqs.map(function(req){return req.name;}).join(", ");
            deb("    OC: #%s found %s requirements: %s FOR %s", self.order.id, reqs.length, names, node.name);
          }
        }
      });    

    }

  };


  H.Economy = (function(){

    var self;

    return {
      init: function(){self = this; return self;},
      tick: function(){

        var t0 = Date.now();

        self.processQueue();
        self.logQueue(t0);

        return Date.now() - t0;

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
        if (position && position.x){
          order.x = position.x;
          order.z = position.z;
        }
        H.Queue.append(new H.Order(order));

        deb("   ERQ: #%s, amount: %s, loc: %s, from: %s, hcq: %s", order.id, amount, loc, sourcename, order.hcq);

      },
      processQueue: function(){

        var allocs = H.deepcopy(ress),
            allGood = false, 
            fits = function(cost, budget){
              return (
                cost.food  <= budget.food  &&
                cost.wood  <= budget.wood  &&
                cost.stone <= budget.stone &&
                cost.metal <= budget.metal
              );              
            };

        if (!H.Queue.length){return;}

        H.Queue
          .forEach(function(order){order.evaluate(allocs);});

        allGood = fits(allocs, H.Stats.stock);
        // deb("    PQ: allGood: %s, allocs: %s", allGood, H.prettify(allocs));


        H.Queue
          .filter(function(order){return order.execute && !order.executed;})
          .forEach(function(order){

            var amount = allGood ? order.remaining : 1,
                node = order.nodes[0],
                id = order.order.id;

            if (allGood || fits(node.cost, H.Stats.stock)){

              switch(order.order.type){

                case "train":
                  // deb("    PQ: #%s train, prod: %s, amount: %s, tpl: %s", id, node.producer, amount, node.key);
                  H.Economy.execute("train", amount, node.producer, node.key, order.order);
                  order.executed = true;
                break;

                case "construct":
                  // deb("    PQ: #%s construct, prod: %s, amount: %s, pos: %s, tpl: %s", id, node.producer, amount, order.order.x + "|" + order.order.z, node.key);
                  H.Economy.execute("construct", amount, node.producer, node.key, order.order);
                  order.executed = true;
                break;

                default:
                  deb("ERROR : processQueue: #%s unknown node.action: %s", id, node.action);

              }

            }


        });

        H.Queue
          .filter(function(order){return order.executed;})
          .forEach(function(order){
            H.Queue.remove(order);
            deb("    PQ: #%s removed from queue", order.order.id);
        });

      },
      execute: function(cmd, amount, id, template, order){

        var PID = H.Bot.id, msg;

        deb("    OE: #%s, cmd: %s, amount: %s, order: %s, tpl: %s", id, cmd, amount, H.prettify(order), template);

        switch(cmd){

          case 'train' :    Engine.PostCommand(PID, {type: cmd, 
              count:        amount,
              entities:     [id],
              template:     template,
              metadata:     {order: order.id}
            }); 
            msg = H.format("    EX: #%s %s, trainer: %s, amount: %s, tpl: %s", 
                                        order.id, cmd, id, amount, template); 
          break;

          case 'construct' : 

          if (order.x === undefined){deb("ERROR: %s without position", cmd); return;}

          Engine.PostCommand(PID, { type: cmd,
              entities:     [id],
              template:     template,
              x:            order.x, 
              z:            order.z,
              angle:        H.Config.angle,
              autorepair:   false, 
              autocontinue: false,
              queued:       false,
              metadata:     {order: order.id}
            }); 
            msg = H.format("    EX: #%s %s, constructor: %s, x: %s, z: %s, tpl: %s", 
                                       order.id, cmd, id, order.x.toFixed(0), order.z.toFixed(0), template); 

          break;

          case 'research' : Engine.PostCommand(PID, { type: cmd,
              entity:     id, 
              template:   template 
            }); 
            msg = H.format("   ECO: X: %s id: %s, %s", cmd, order.id, id, template); 
          break;

          case 'stop-production' : Engine.PostCommand(PID,{ 
            "type": cmd, "entity": id 
            // "id": queue[i].id ????
          }); break;

          case 'barter' : Engine.PostCommand(PID, {
              "type":   cmd, 
              "sell":   order.barter.sellType, 
              "buy":    order.barter.buyType, 
              "amount": order.barter.amount 
          }); break;

          case 'setup-trade-route' :
            // queue.RemoveBatch(cmd.id);
          break;
          case 'set-trading-goods' :
            // queue.RemoveBatch(cmd.id);
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

  }()).init();


return H; }(HANNIBAL));

/*

determineAction: function(){

  var self = this, nodes, found = false, 
      hcq, db = H.Bot.cultures;

  // testing each node for in game producers
  this.nodes.forEach(function(node){
    "TRAINEDBY, BUILDBY, RESEARCHEDBY".split(", ").forEach(function(verb){
      if (!found){
        hcq = H.format("%s %s INGAME", node.name, verb);
        nodes = new H.HCQ(db, hcq).execute();
        if (nodes.length){
          self.order.action = self.mapper[verb];
          deb("    OC: #%s found action: %s FOR %s", self.order.id, self.order.action, hcq);
          found = true;
        }
      }

    });
  });    

},


H.Economy.barter = function(source, sell, buy, amount){
  var markets = gameState.getOwnEntitiesByType(gameState.applyCiv("structures/{civ}_market"), true).toEntityArray();
  markets[0].barter(buy,sell,100);
  Engine.PostCommand({"type": "barter", "sell" : sellType, "buy" : buyType, "amount" : amount });      
  new api this.barterPrices = state.barterPrices;
};



logObject(sharedScript.playersData[this.id].statistics);
  buildingsConstructed: NUMBER (0)
  buildingsLost: NUMBER (0)
  buildingsLostValue: NUMBER (0)
  civCentresBuilt: NUMBER (0)
  enemyBuildingsDestroyed: NUMBER (0)
  enemyBuildingsDestroyedValue: NUMBER (0)
  enemyCivCentresDestroyed: NUMBER (0)
  enemyUnitsKilled: NUMBER (0)
  enemyUnitsKilledValue: NUMBER (0)
  percentMapExplored: NUMBER (3)
  resourcesBought: OBJECT (food, wood, metal, stone, ...)[4]
  resourcesGathered: OBJECT (food, wood, metal, stone, vegetarianFood, ...)[5]
  resourcesSold: OBJECT (food, wood, metal, stone, ...)[4]
  resourcesUsed: OBJECT (food, wood, metal, stone, ...)[4]
  tradeIncome: NUMBER (0)
  treasuresCollected: NUMBER (0)
  tributesReceived: NUMBER (0)
  tributesSent: NUMBER (0)
  unitsLost: NUMBER (0)
  unitsLostValue: NUMBER (0)
  unitsTrained: NUMBER (0)

  

Object: playersData  ---------------
  0: OBJECT (name, civ, colour, popCount, popLimit, ...)[27]
  1: OBJECT (name, civ, colour, popCount, popLimit, ...)[27]
  2: OBJECT (name, civ, colour, popCount, popLimit, ...)[27]
    cheatsEnabled: BOOLEAN (false)
    civ: STRING (athen)
    classCounts: OBJECT (Structure, ConquestCritical, Civic, Defensive, CivCentre, ...)[19]
    colour: OBJECT (r, g, b, a, ...)[4]
    entityCounts: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]
    entityLimits: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]
    heroes: ARRAY (, ...)[0]
    isAlly: ARRAY (false, true, false, ...)[3]
    isEnemy: ARRAY (true, false, true, ...)[3]
    isMutualAlly: ARRAY (false, true, false, ...)[3]
    isNeutral: ARRAY (false, false, false, ...)[3]
    name: STRING (Player 1)
    phase: STRING (village)
    popCount: NUMBER (17)
    popLimit: NUMBER (20)
    popMax: NUMBER (300)
    researchQueued: OBJECT (, ...)[0]
    researchStarted: OBJECT (, ...)[0]
    researchedTechs: OBJECT (phase_village, ...)[1]
    resourceCounts: OBJECT (food, wood, metal, stone, ...)[4]
    state: STRING (active)
    statistics: OBJECT (unitsTrained, unitsLost, unitsLostValue, enemyUnitsKilled, enemyUnitsKilledValue, ...)[21]
    team: NUMBER (-1)
    teamsLocked: BOOLEAN (false)
    techModifications: OBJECT (, ...)[0]
    trainingBlocked: BOOLEAN (false)
    typeCountsByClass: OBJECT (Structure, ConquestCritical, Civic, Defensive, CivCentre, ...)[19]



*/