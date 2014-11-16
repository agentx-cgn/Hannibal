/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- E C O N O M Y -----------------------------------------------

  Priotizes requests for resources. Trains, researches and construct them.


  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  var 
    // relies on c before e
    config = H.Config.economy,
    gatherables = ["food", "wood", "stone", "metal"],
    ress   = {food: 0, wood: 0, stone: 0, metal: 0, pops: 0, health: 0, area: 0};

  function pritc(cost){ // pretty cost
    var out = [];
    Object.keys(cost).forEach(r => {
      if(cost[r]){out.push(r + ":" + cost[r]);}
    });
    return out.join(",");
  }

  H.Stats = {

    // ress currently available via API
    stock: H.deepcopy(ress), 

    // totals gathered, difference per tick, flow = avg over diff
    suply: H.deepcopy(ress), 
    diffs: H.map(ress, H.createRingBuffer.bind(null, config.lengthStatsBuffer)),
    flows: H.deepcopy(ress), 

    alloc: H.deepcopy(ress), // allocated per queue
    forec: H.deepcopy(ress), // ???
    trend: H.deepcopy(ress), // as per suply
    stack: H.map(ress, H.createRingBuffer.bind(null, config.lengthStatsBuffer)), // last x stock vals
    // availability: availability,
    init: function(){
      H.Stats.tick();
    },
    tick: function(){

      var 
        t0 = Date.now(), curHits = 1, maxHits = 1, 
        stock   = H.Stats.stock, 
        suply   = H.Stats.suply, 
        stack   = H.Stats.stack, 
        trend   = H.Stats.trend,
        diffs   = H.Stats.diffs,
        flows   = H.Stats.flows,
        gathered  = H.Player.statistics.resourcesGathered,
        available = H.Player.resourceCounts;
          
      // ctx.lstUnits.forEach(function(unit){
      //   curHits += unit.hitpoints();
      //   maxHits += unit.maxHitpoints();
      // });    

      // gather diffs
      gatherables.forEach(function(prop){ 
        diffs[prop].push(gathered[prop] - suply[prop]); // prep flows
        suply[prop]   = gathered[prop];                 // totals
        stock[prop]   = available[prop];                // available
      });
      
      // // sort availability by stock
      // availability.sort((a, b) => stock[a] > stock[b] ? 1 : -1);

      // other data
      stock.pops   = H.Player.popCount;
      stock.area   = H.Player.statistics.percentMapExplored;
      stock.health = ~~((curHits / maxHits) * 100); // integer percent only    

      // buffers
      H.attribs(ress).forEach(function(prop){ 
        stack[prop].push(suply[prop]);      // buffers
        trend[prop] = stack[prop].trend();  // trend
        flows[prop] = diffs[prop].avg();    // 
      });

      return Date.now() - t0;

    },
    sortGatherables: function(){

      // return highest first


    }

  }; 


  H.Order = function(options){

    H.extend(this, options, {
      id:         H.Objects(this),
      remaining:  options.amount,
      processing: 0,
      executable: false,
      x: options.location && options.location.length ? options.location[0] : undefined,
      z: options.location && options.location.length ? options.location[1] : undefined
    });

    //TODO: make units move to order.position

  };

  H.Order.prototype = {
    constructor: H.Order,
    simulate: function(allocs){

      var 
        self = this,
        availability = this.economy.availability;

      this.executable = false; // ready to send
      if(this.remaining - this.processing < 1){
        // nothing to do, 
        return;
      }

      this.nodes = H.QRY(this.hcq).map(function(node){
        return {
          name:      node.name,
          key:       node.key,
          costs:     node.costs,
          qualifies: true,
          producer:  null,
          info:      ""
        };
      });

      // check whether ingame producer exists
      this.nodes.forEach(function(node){

        var producer;

        if ((producer = self.economy.producers.allocate(node.name, self))){
          node.producer  = producer;
        } else {
          node.qualifies = false;
          node.info += "no producer, ";
        }

      });

      // any unmet techs
      this.nodes.forEach(function(node){

        // var 
        //   req = H.Bot.tree.nodes[node.name].requires,
        //   phase = H.Bot.tree.nodes[node.name].phase;
        
        // if (H.Phases.find(phase).idx > H.Phases.find(H.Phases.current).idx){
        //   node.qualifies = false; node.info = "needs phase " + phase; return;
        // }
        // if (req && !H.Technologies.available([req])){
        //   node.qualifies = false; node.info = "needs req " + req; return;
        // }

      });        

      // remove disqualified nodes
      H.delete(this.nodes, node => !node.qualifies);

      if (this.nodes.length){

        this.executable = true;

        // sort by availability, SM sorts stable
        this.nodes
          .sort((a, b) => a.costs[availability[0]] < b.costs[availability[0]] ? 1 : -1 )
          .sort((a, b) => a.costs[availability[1]] < b.costs[availability[1]] ? 1 : -1 )
          .sort((a, b) => a.costs[availability[2]] < b.costs[availability[2]] ? 1 : -1 )
          .sort((a, b) => a.costs[availability[3]] < b.costs[availability[3]] ? 1 : -1 );

        // write costs for first into allocs
        allocs.food  += this.nodes[0].costs.food  * this.remaining;
        allocs.wood  += this.nodes[0].costs.wood  * this.remaining;
        allocs.stone += this.nodes[0].costs.stone * this.remaining;
        allocs.metal += this.nodes[0].costs.metal * this.remaining;

      }

    },
    evaluate: function(allocs){

      var 
        self = this,
        availability = this.economy.availability;

      this.executable = false; // ready to send

      // deb("evaluate: %s in", self.id);

      if(this.remaining - this.processing < 1){
        // deb("evaluate: %s out 01", self.id);
        // nothing to do, 
        return;
      }

      this.nodes = H.QRY(this.hcq).map(function(node){
        return {
          name:      node.name,
          key:       node.key,
          costs:     node.costs,
          qualifies: true,
          producer:  null,
          info:      ""
        };
      });

      // assigns ingames if available and matching
      this.assignExisting();      
      if (this.remaining === 0){
        // deb("evaluate: %s out 02", self.id);
        return;
      } 

      // // check whether ingame producer exists
      // this.nodes.forEach(function(node){
      //   var producer   = H.Producers.find(node.name, self.cc);
      //   node.producer  = producer;
      //   node.qualifies = !producer ? false : node.qualifies;
      //   node.info += !producer ? "no producer, " : "";
      // });

      // check whether ingame producer exists
      this.nodes.forEach(function(node){
        // deb("evaluate: %s node: ", self.id, node.name);
        var producer = self.economy.producers.allocate(node.name, self);
        if (producer){
          node.producer = producer;
          // deb("evaluate: %s prod for %s #%s %s", self.id, node.name, producer.id, producer.name);
        } else {
          node.qualifies = false;
          node.info += !producer ? "no producer, " : "";
        }
      });

      // any unmet techs
      this.nodes.forEach(function(node){

        //     entityCounts: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]
        //     entityLimits: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]

        var 
          req = H.Bot.tree.nodes[node.name].requires,
          phase = H.Bot.tree.nodes[node.name].phase;
        
        if (H.Phases.find(phase).idx > H.Phases.find(H.Phases.current).idx){
          node.qualifies = false; node.info = "needs phase " + phase; return;
        }
        if (req && !H.Technologies.available([req])){
          node.qualifies = false; node.info = "needs req " + req; return;
        }

      });  

      this.nodes.forEach(node => {
        // deb("    OE: %s %s", node.name, node.info);
      });

      // remove disqualified nodes
      H.delete(this.nodes, node => !node.qualifies);

      if (this.nodes.length){

        this.executable = true;

        // sort by availability, SM sorts stable
        this.nodes
          .sort((a, b) => a.costs[availability[0]] < b.costs[availability[0]] ? 1 : -1 )
          .sort((a, b) => a.costs[availability[1]] < b.costs[availability[1]] ? 1 : -1 )
          .sort((a, b) => a.costs[availability[2]] < b.costs[availability[2]] ? 1 : -1 )
          .sort((a, b) => a.costs[availability[3]] < b.costs[availability[3]] ? 1 : -1 );

        // write costs for first into allocs
        allocs.food  += this.nodes[0].costs.food  * this.remaining;
        allocs.wood  += this.nodes[0].costs.wood  * this.remaining;
        allocs.stone += this.nodes[0].costs.stone * this.remaining;
        allocs.metal += this.nodes[0].costs.metal * this.remaining;

      }

    },
    assignExisting: function(){

      var 
        self = this,
        verb = this.verb,
        hcq  = (

          // looking for a technology
          verb === "research" ? this.hcq :

          // looking for unit not assigned to a group
          verb === "train" ? this.hcq + " INGAME WITH metadata.opname = 'none'" :
          
          // looking for a shared structure
          verb === "build" && this.shared ? this.hcq + " INGAME WITH metadata.opmode = 'shared'" :

          // looking for abandoned structure not assigned to a group
          verb === "build" && !this.shared ? this.hcq + " INGAME WITH metadata.opname = 'none'" :

          // error
            deb("ERROR : assignExisting run into unhandled case: %s, shared: %s", this.verb, this.shared)
        
        );

      if (verb === "research"){
        // if (H.Technologies.available([hcq])){

        //   // UNTESTED, not called whie proccesing
        //   self.remaining  = 0; 
        //   self.processing = 0; 

        //    H.Events.fire("ResearchFinished", {
        //     player: H.Bot.id,
        //     data:   {order: self.id, source: self.source, technology: hcq}
        //   });
          
        //   // self.processing += 1; 
        //   // H.Economy.listener("onOrderReady", node.id, {metadata: {order: self.id}});
        // } else {deb("    OE: assignExisting not avail. %s", hcq);}

      } else {
        H.QRY(hcq).execute()
          .slice(0, self.remaining - self.processing)
          .forEach(function(node){

            // deb("assignExisting: %s %s %s", self.id, self.verb, node.name);

            self.remaining -= 1; 

             H.Events.fire("OrderReady", {
              player: H.Bot.id,
              id:     node.id,
              data:   {order: self.id, source: self.source}
            });

            // self.processing += 1; 
            // H.Economy.listener("onOrderReady", node.id, {metadata: {order: self.id}});
        });

      }

    },

  };


  H.Economy = (function(){

    var 
      self, goals; //planner, //orderqueue, producers, 
      //phases = ["phase.village", "phase.town", "phase.city"];

    return {

      name: "economy",
      prioVerbs: ["research", "train", "build"],
      // gatherables  = ["food", "wood", "stone", "metal"],
      availability: ["food", "wood", "stone", "metal"],
      allocations: {food: 0, wood: 0, stone: 0, metal: 0, population: 0},
      stats: H.Stats,
      planner: null,
      producers: null,
      orderqueue: null,
      // resources: 

      boot: function(){self = this; return self;},
      init: function(){

        deb();deb();deb("   ECO: init");

        var 
          cls = H.class2name,
          flowCentre, flowBarrack, flowFortress, 
          tree = H.Bot.tree.nodes;

        self.orderqueue = new H.OrderQueue({
          parent:  self,
          economy: self
        });

        self.producers = new H.Producers({
          parent:  self,
          tree:    H.Bot.tree,
          ingames: H.QRY("INGAME"),
          config:  H.Config,
        });

        flowBarrack  = tree[cls("barracks")].flow;
        flowCentre   = tree[cls("civcentre")].flow;
        flowFortress = tree[cls("fortress")].flow;

        deb("   ECO: max flow centre  : %s ", uneval(flowCentre));
        deb("   ECO: max flow barracks: %s ", uneval(flowBarrack));
        deb("   ECO: max flow fortress: %s ", uneval(flowFortress));

      },
      tick: function(secs, ticks){

        var 
          t0 = Date.now(),
          stock = H.Player.resourceCounts;
        
        if ((ticks % H.Config.economy.intervalMonitorGoals) === 0){
          self.monitorGoals();
        }

        // sort availability by stock
        self.availability.sort((a, b) => stock[a] > stock[b] ? 1 : -1);


        // H.OrderQueue.process();
        // H.OrderQueue.log();
        self.orderqueue.process();

        // deb("orderqueue: %s", H.attribs(self.orderqueue));

        self.orderqueue.log();
        self.logTick();
        
        return Date.now() - t0;

      },
      activate: function(){

        var node, order;

        H.Events.on("EntityRenamed", function (msg){

          node = H.QRY("INGAME WITH id = " + msg.id).first();
          if (node){
            self.producers.remove(node);
          } else {
            deb("WARN  : eco.activate.EntityRenamed: id %s no ingame", msg.id);
          }

          node = H.QRY("INGAME WITH id = " + msg.id2).first();
          if (node){
            self.producers.register(node.name);
          } else {
            deb("WARN  : eco.activate.EntityRenamed: id2 %s no ingame", msg.id);
          }
          // self.producers.register(H.QRY("INGAME WITH id = " + msg.id2).first().name);

          // H.Producers.removeById(msg.id);
          // H.Producers.loadById(msg.id2);
        });

        H.Events.on("Advance", function (msg){
          // works, but...
          if (self.orderqueue.delete(order => order.hcq === msg.data.technology)){
            self.producers.unqueue("research", msg.data.technology);
            deb("   ECO: onAdvance: removed order with tech: %s", msg.data.technology);
          }        
        });

        H.Events.on("ConstructionFinished", function (msg){
          self.producers.register(H.QRY("INGAME WITH id = " + msg.id).first().name);
          // H.Producers.loadById(msg.id);
        });

        H.Events.on("TrainingFinished", function (msg){

          deb("   ECO: TrainingFinished id: %s, meta: %s", msg.id, uneval(H.MetaData[msg.id]));

          node = H.QRY("INGAME WITH id = " + msg.id).first();
          if (node){
            self.producers.register(node.name);
          } else {
            deb("WARN  : eco.activate.TrainingFinished: id %s no ingame", msg.id);
          }

          // self.producers.register(H.QRY("INGAME WITH id = " + msg.id).first().name);
          // H.Producers.loadById(msg.id);
          self.producers.unqueue("train", msg.data.task); 

          order = H.Objects(msg.data.order);
          order.remaining  -= 1;
          order.processing -= 1;
          
          // H.Objects(order.source).listener("Ready", id);  
           H.Events.fire("OrderReady", {
            player: H.Bot.id,
            id:     msg.id,
            data:   {order: msg.data.order, source: order.source}
          });

        });

        H.Events.on("AIMetadata", function (msg){

          order = H.Objects(msg.data.order);
          order.remaining  -= 1;
          order.processing -= 1;

          deb("   ECO: on AIMetadata order: #%s from %s", order.id, H.Objects(order.source).name);
          
          // H.Objects(order.source).listener("Ready", id);  
          H.Events.fire("OrderReady", {
            player: H.Bot.id,
            id:     msg.id,
            data:   {order: msg.data.order, source: order.source}
          });

        });

        // H.Events.on("Advance", function (msg){
        //   self.producers.unqueue("research", msg.data.technology);  
        // });

        H.Events.on("Destroy", function (msg){
          self.producers.remove(msg.id);
          // deb("   ECO: got Event destroy for id: %s", msg.id);
        });


      },
      monitorGoals: function(){

      },
      getPhaseNecessities: function(context){ // phase, centre, tick
        
        var 
          cls = H.class2name,
          tck = context.tick,
          cc  = context.centre,
          housePopu = H.QRY(cls("house")).first().costs.population * -1,
          
          technologies = [],
          launches = {

            "phase.village": [

               //  tck, amount,       group,        params
               [   2, [1, "g.supplier",   {cc: cc, size: 4, resource: "food.fruit"}]],
               [   2, [1, "g.supplier",   {cc: cc, size: 1, resource: "food.meat"}]],
               [   2, [1, "g.supplier",   {cc: cc, size: 5, resource: "wood"}]],
               [   3, [1, "g.builder",    {cc: cc, size: 2, building: cls("house"),      quantity: 2}]],
               [   4, [1, "g.builder",    {cc: cc, size: 2, building: cls("farmstead"),  quantity: 1}]],
               [   4, [1, "g.builder",    {cc: cc, size: 2, building: cls("storehouse"), quantity: 1}]],
               [  10, [1, "g.harvester",  {cc: cc, size: 5}]],
               [  20, [1, "g.supplier",   {cc: cc, size: 5, resource: "stone"}]],
               [  30, [1, "g.supplier",   {cc: cc, size: 5, resource: "metal"}]],

            ],
            "phase.town" :   [
               [  10, [1, "g.supplier",   {cc: cc, size: 15, resource: "wood"}]],
               [  10, [1, "g.supplier",   {cc: cc, size: 15, resource: "stone"}]],
               [  10, [1, "g.supplier",   {cc: cc, size: 15, resource: "metal"}]],

            ],
            "phase.city" :   [

            ],
          };

        return {
          launches: launches,
          technologies: technologies,
          messages: messages,
        };

      },
      updateActions: function(phase){

        var 
          groups,
          ressTargets = {
            "food":  0,
            "wood":  0,
            "stone": 0,
            "metal": 0,
            "pop":   0,
          };

        deb();deb();deb("   ECO: updateActions phase: %s", phase);
        self.planner  = H.Brain.requestPlanner(phase);

        // deb("     E: planner.result.data: %s", uneval(planner.result.data));

        ressTargets.food  = self.planner.result.data.cost.food  || 0 + self.planner.result.data.ress.food;
        ressTargets.wood  = self.planner.result.data.cost.wood  || 0 + self.planner.result.data.ress.wood;
        ressTargets.metal = self.planner.result.data.cost.metal || 0 + self.planner.result.data.ress.metal;
        ressTargets.stone = self.planner.result.data.cost.stone || 0 + self.planner.result.data.ress.stone;

        deb("     E: ress: %s", uneval(ressTargets));

        goals = self.getActions(self.planner);

        groups = H.Brain.requestGroups(phase);
        groups.forEach(g => deb("     E: group: %s", g));

        groups.forEach(group => {
          var [count, name, cc, options] = group;
          H.extend(options, {name: name, cc: cc});
          H.loop(count, () => {
            H.Groups.launch(options);
          });
        });

        // H.Groups.log();

        deb("   ECO: updateActions -------");deb();

      },
      getActions: function(planner){

        // filter out already achieved goals and meta info

        var 
          count, 
          cost  = planner.costs,
          nextphase,
          goals = planner.operations.filter(oper => {

          if (oper[1] === "research_tech" && oper[2].contains("phase")){
            return false;
          }

          if (oper[1] === "research_tech" && H.Technologies.available([oper[2]])){
            return false;
          }

          if (oper[1] === "start" || oper[1] === "finish" || oper[1] === "wait_secs"){
            return false;
          }

          return true;

        });

        // update amounts

        goals.forEach(goal => {

          if (goal[1] === "build_structures" || goal[1] === "train_units"){
            count = H.QRY(goal[2] + " INGAME").count();
            deb("     E: have: %s, need: %s | %s", count, goal[3], goal[2]);
            goal[3] -=  count;
          }

        });

        goals.forEach(goal => {

          if (goal[1] === "research_tech"){
            deb("     E: goal: X %s", goal.slice(1));
            H.Triggers.add( -1, 
              H.Economy.request.bind(H.Economy, new H.Order({
                amount:     1,
                verb:       "research", 
                hcq:        goal[2], 
                source:     H.Brain.id, 
                shared:     false
              }))
            );

          } else {
            deb("     E: goal: - %s", goal.slice(1));
          
          }



        });

      },
      multiply: function(cost, amount=1){
        cost.food  *= amount;
        cost.wood  *= amount;
        cost.metal *= amount;
        cost.stone *= amount;
      },
      subtract: function(cost, budget, amount=1){
        budget.food  -= cost.food  > 0 ? (cost.food  * amount) : 0;
        budget.wood  -= cost.wood  > 0 ? (cost.wood  * amount) : 0;
        budget.metal -= cost.metal > 0 ? (cost.metal * amount) : 0;
        budget.stone -= cost.stone > 0 ? (cost.stone * amount) : 0;
      },
      fits: function(cost, budget, amount=1){
        return (
          ((cost.food  || 0) * amount) <= (budget.food  || 0) &&
          ((cost.wood  || 0) * amount) <= (budget.wood  || 0) &&
          ((cost.stone || 0) * amount) <= (budget.stone || 0) &&
          ((cost.metal || 0) * amount) <= (budget.metal || 0)
        );  
      },
      diff: function(cost, budget, amount=1){
        return {
          food:   (budget.food   || 0) - (cost.food   || 0 * amount),
          wood:   (budget.wood   || 0) - (cost.wood   || 0 * amount),
          stone:  (budget.stone  || 0) - (cost.stone  || 0 * amount),
          metal:  (budget.metal  || 0) - (cost.metal  || 0 * amount),
          pop  :  (budget.pop    || 0) - (cost.pop    || 0 * amount),
          popcap: (budget.popcap || 0) - (cost.popcap || 0 * amount),
        };
      },
      request: function(order){

        var  // debug
          sourcename = H.Objects(order.source).name,  // this is an asset instance
          loc = (order.location === undefined) ? "undefined" : order.location.map(p => p.toFixed(1)),
          msg = "  EREQ: #%s, %s amount: %s, cc: %s, loc: %s, from: %s, shared: %s, hcq: %s";

        order.economy = self;
        self.orderqueue.append(order);

        deb(msg, order.id, order.verb, order.amount, order.cc || "NO CC" , loc, sourcename, order.shared, order.hcq.slice(0, 30));

      },

      // do: function(verb, amount, producer, template, order, cost){
      do: function(verb, amount, order, node){

        var 
          pos, id = node.producer.id, task, 
          template = node.key,
          techname = H.saniTemplateName(node.key),
          msg = ( verb === "build" ?
            "   EDO: #%s %s, producer: %s, amount: %s, tpl: %s, x: %s, z: %s" : 
            "   EDO: #%s %s, producer: %s, amount: %s, tpl: %s"
          );

        if (verb === "build" && order.x === undefined){deb("ERROR : order #%s %s without position", id, verb); return;}

        switch(verb){

          case "train" :
            task = H.Task.id;
            // task = self.genTaskId();
            node.producer.queue.push([task, order]);
            deb(msg, order.id, verb, id, amount, template); 
            H.Effector.train([id], template, amount, {order: order.id, task: task, cc:order.cc});
          break;

          case "research" : 
            node.producer.queue.push([techname, order]);
            deb(msg, order.id, verb, id, 1, template); 
            H.Effector.research(id, template);
          break;

          case "build" : 
            // needs no queue
            pos = H.Map.findGoodPosition(template, [order.x, order.z]);
            deb(msg, order.id, verb, id, 1, template, order.x.toFixed(0), order.z.toFixed(0)); 
            H.Effector.construct([id], template, [pos.x, pos.z, pos.angle], {order: order.id, cc:order.cc});
          break;

        }

      },
      logTick: function(){

        var 
          stock = H.Stats.stock, 
          flows = H.Stats.flows,
          t = H.tab, f = n => n > 0 ? "+" + n : n === 0 ? " 0": n,
          msg = H.format("   ECO: F%s %s, W%s %s, M%s %s, S%s %s, P%s %s, A%s %s, H%s %s", 
            t(stock.food,   6), f(flows.food.toFixed(1)),
            t(stock.wood,   6), f(flows.wood.toFixed(1)),
            t(stock.metal,  6), f(flows.metal.toFixed(1)),
            t(stock.stone,  6), f(flows.stone.toFixed(1)),
            t(stock.pops,   4), f(flows.pops.toFixed(1)),
            t(stock.area,   4), f(flows.area.toFixed(1)),
            t(stock.health, 4), f(flows.health.toFixed(1))
          );

        // deb(msg);

      }

    };

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



