/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- E C O N O M Y -----------------------------------------------

  Priotizes requests for resources. Trains, researches and construct them.
  includes stats, producers, order, orderqueue

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Stats = function(context){

    var 
      bufferLength = context.config.stats.lengthStatsBuffer,
      ress = {food: 0, wood: 0, stone: 0, metal: 0, pops: 0, health: 0, area: 0};

    H.extend(this, {

      name:     "stats",
      context:  context,
      imports:  [
        "player"
      ],

      ress:        ress,
      gatherables: ["food", "wood", "stone", "metal"],

      stock: H.deepcopy(ress), 
      // totals gathered, difference per tick, flow = avg over diff
      suply: H.deepcopy(ress), 
      diffs: H.map(ress, H.createRingBuffer.bind(null, bufferLength)),
      flows: H.deepcopy(ress), 
      alloc: H.deepcopy(ress), // allocated per queue
      forec: H.deepcopy(ress), // ???
      trend: H.deepcopy(ress), // as per suply
      stack: H.map(ress, H.createRingBuffer.bind(null, bufferLength)), // last x stock vals

    });

  };

  H.LIB.Stats.prototype = {
    constructor: H.LIB.Stats,
    log: function(){
      deb(" STATS: stock: %s", JSON.stringify(this.stock));
    },
    initialize: function(data){
      if (data){
        H.extend(this, data);
      } else {
        this.tick();
      }
      return this;
    },
    clone: function(context){
      return (
        new H.LIB[H.noun(this.name)](context)
          .import()
          .initialize(this.serialize())
      );
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    serialize: function(){
      return {
        stock: H.deepcopy(this.stock), 
        suply: H.deepcopy(this.suply), 
        diffs: H.deepcopy(this.diffs), // buffer !!
        flows: H.deepcopy(this.flows), 
        alloc: H.deepcopy(this.alloc),
        forec: H.deepcopy(this.forec), 
        trend: H.deepcopy(this.trend), 
        stack: H.deepcopy(this.stack), // buffer !!
      };
    },
    tick: function(tick, secs){

      var 
        t0 = Date.now(), curHits = 1, maxHits = 1, 
        gathered  = this.player.statistics.resourcesGathered,
        available = this.player.resourceCounts;
          
      // gather diffs
      this.gatherables.forEach( prop => { 
        this.diffs[prop].push(gathered[prop] - this.suply[prop]); // prep flows
        this.suply[prop]   = gathered[prop];                 // totals
        this.stock[prop]   = available[prop];                // available
      });
      
      // other data
      this.stock.pops   = this.player.popCount;
      this.stock.area   = this.player.statistics.percentMapExplored;
      this.stock.health = ~~((curHits / maxHits) * 100); // integer percent only    

      // buffers
      H.attribs(this.ress).forEach( prop => { 
        this.stack[prop].push(this.suply[prop]);      // buffers
        this.trend[prop] = this.stack[prop].trend();  // trend
        this.flows[prop] = this.diffs[prop].avg();    // 
      });

      return Date.now() - t0;

    },

  };

  H.LIB.Producers = function(context){

    H.extend(this, {

      name:    "producers",
      context: context,
      imports: [
        "query",
        "culture",
        "config",
        "entities",
        "metadata",
      ],

      producers: {},

      info:      {
        id:        0,   // entity id
        name:     "",   // node name
        queue:    [],   // taskids or techs
        simqueue: [],   // simulates engine's queue for simulations
        allocs:    0,   // per orderqueue cycle
      },

    });

  };

  H.LIB.Producers.prototype = {
    constructor: H.LIB.Producers,
    log: function(){
      H.each(this.producers, function(nameid){
        var [name, id] = nameid.split("#");
        deb("   PDC: %s %s info: %s", id, name, this.infoProducer(name));
      });
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function(context){
      return (
        new H.LIB[H.noun(this.name)](context)
          .import()
          .initialize(this.serialize())
      );
    },
    serialize: function(){
      return H.deepcopy(this.producers);
    },
    initialize: function(producers){
      if (!producers){
        this.query("INGAMES").forEach( node => {
          this.register(node);
        });
      } else {
        this.producers = H.deepcopy(producers);
      }
      return this;
    },
    isProducer: function(name){
      return (this.culture.tree[name] && this.culture.tree[name].products.count);
    },
    infoProducer: function(name){
      var 
        tree     = this.culture.tree,
        train    = H.count(tree[name].products.train),
        build    = H.count(tree[name].products.build),
        research = H.count(tree[name].products.research);
      return H.format("procucer: %s trains: %s, builds: %s, researches: %s", name, train, build, research);
    },
    resetAllocs: function(){
      H.each(this.producers, (name, producer) => {
        producer.allocs = producer.queue.length;
      });      
    },
    unqueue: function(verb, info){

      var found = false;

      H.each(this.producers, (name, producer) => {
        if(!found && producer.queue && producer.queue.length){
          if (H.delete(producer.queue, task => task[0] === info)){
            found = true;
            producer.allocs -= 1;
            deb("   PDC: unqueue: removed in queue: %s, %s from %s", verb, info, producer.name);
          }
        }
      });

      if (!found) {
        deb("   PDC: unqueue: not found in any queue: %s, %s", verb, info);
      }

    },
    findCentre: function(){
      var producer, names = H.attribs(this.producers), i = names.length;
      while ((producer = this.producers[names[--i]])){
        if (producer.name === this.nameCentre){
          return producer;
        }
      }      
      return null;
    },
    register: function(node){

      var nameid = node.name, parts = nameid.split("#");

      if (this.isProducer(name) && !this.producers[nameid]){
        this.producers[nameid] = H.mixin(H.deepcopy(this.info), {
          id:     ~~parts[1],
          name:   parts[0], 
        });
        // deb("   PDC: reg: %s", uneval(this.producers[nameid]));
      }

    },
    remove: function(nodeOrId){
      
      var 
        ents = this.entities,
        id = H.isInteger(nodeOrId) ? nodeOrId : nodeOrId.id;

      H.each(this.producers, (nameid, info) => {
        if (info.id === id){
          delete this.producers[nameid];
          deb("   PDC: removed id: %s, tpl: %s", id, ents[id] ? ents[id]._templateName : "unknown");
        }        
      });

    },  
    allocate: function(product, order){

      // works with orderqueue: avoids overflow of 0AD trainer/research queue

      var 
        maxAllocs = this.config.economy.maxAllocations,
        producer, 
        tree  = this.culture.tree,
        verb  = tree[product].verb, 
        names = H.attribs(this.producers),
        i     = names.length,
        found = false;

      // deb("   PDC: allocate: %s, %s", product, cc || "nocc");

      // has no producer
      if(!verb){
        // deb("ERROR : PDC.allocate: no verb for %s", product);
        return null;
      }

      switch (verb){

        case "build":
          // can ignore cc and allocations
          while ((producer = this.producers[names[--i]])){

            // deb("   PDC testing %s %s %s", !!tree[producer.name].products.build[product], producer.name, product);

            if (tree[producer.name].products.build[product]){
              break;  
            }        
          }
        break;

        case "research":
          // can ignore cc
          if (product.contains("phase")){
            if ((producer = this.findCentre())){ // TODO: search over all centres
              if (producer.allocs >= maxAllocs){
                // deb("   PDC: max: %s", uneval(producer));
                producer = null;
              }
            }
          } else {
            while (i--){
              producer = this.producers[names[i]];
              found = (
                tree[producer.name].products.research[product] && 
                producer.allocs < maxAllocs
              );
              if (found){break;} else {producer = null;}
            }
          }
        break;
        
        case "train":
          while (i--){
            producer = this.producers[names[i]];

            deb("   PDC: allocate: id: %s, meta: %s", producer.id, uneval(this.metadata[producer.id]));

            found = (
              tree[producer.name].products.train[product] &&
              producer.allocs < maxAllocs && 
              !order.cc || H.MetaData[producer.id].cc === order.cc
            );
            if (found){break;} else {producer = null;}
          }
        break;
        
      }

      if(producer){producer.allocs += 1;}

      return producer;

    },

  };


  H.LIB.Orderqueue = function(context){

    H.extend(this, {

      name:    "orderqueue",
      context:  context,
      imports:  [
        "economy",
        "groups",
      ],

      report: {rem: [], exe: [], ign: []},
      tP: 0, // processing time, msecs
      queue: [],

      logProcessing: false,
      logWaiting:    false,

    });

  };

  H.LIB.Orderqueue.prototype = {
    constructor: H.LIB.Orderqueue,
    log: function(){},
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function(context){
      return (
        new H.LIB[H.noun(this.name)](context)
          .import()
          .initialize(this.serialize())
      );
    },
    initialize: function(data){
      if (data){
        data.forEach( order => {
          this.queue.push(
            new H.LIB.Order(this.context)
              .import()
              .initialize(order)
          );
        });
      }
      return this;
    },
    serialize: function(tick, secs){
      var data = [];
      this.queue.forEach( order => {
        data.push(order.serialize());
      });
      return data;
    },
    delete: function(fn){return H.delete(this.queue, fn);},
    process: function(logWaiting=false){

      var 
        t0 = Date.now(), 
        amount, node, msg, t = H.tab, 
        cntWaiting    = 0,
        cntProcessing = 0,
        allGood       = false, 
        hasBuild      = false, // only one construction per tick
        rep           = this.report,
        queue         = this.queue,
        eco           = this.economy,
        allocs        = H.deepcopy(eco.allocations),
        budget        = H.deepcopy(eco.stats.stock);
        
      // reset logging array
      rep.rem.length = 0; rep.ign.length = 0; rep.exe.length = 0;

      // queue empty -> exit
      if (!queue.length){this.tP = 0; return;}

      // clear allocs from last tick
      eco.producers.resetAllocs();

      // sort by (source, verbs) and evaluate
      queue
        .sort((a, b) => eco.prioVerbs.indexOf(a.verb) < eco.prioVerbs.indexOf(b.verb) ? -1 : 1)
        .forEach(order => order.evaluate(allocs));

      // info
      cntWaiting = queue.filter(o => o.remaining === o.processing).length;
      cntProcessing = queue.length - cntWaiting;

      // get first quote whether all orders fit budget
      allGood = eco.fits(allocs, budget);  

      if (cntProcessing && this.logProcessing){
        deb("    OQ: queue: %s, allg: %s, waits: %s, allocs: %s", queue.length, allGood, cntWaiting, uneval(allocs));
      }

      // rep / debug
      msg = "    OQ: #%s %s amt: %s, rem: %s, pro: %s, verb: %s, nodes: %s, from %s ([0]: %s)";
      queue.forEach(o => {
        var 
          isWaiting = o.remaining === o.processing,
          exec = o.executable ? "X" : "-",
          source = H.isInteger(o.source) ? this.groups.findAsset(o.source).name : o.source,
          nodename = o.nodes.length ? o.nodes[0].name : "hcq: " + o.hcq.slice(0, 40);
        if(!(isWaiting && !logWaiting)){
          deb(msg, t(o.id, 3), exec, t(o.amount, 2), t(o.remaining, 2), t(o.processing, 2), o.verb.slice(0,5), t(o.nodes.length, 3), source, nodename);
        }
      });

      // choose executables and process
      queue
        .filter(order => order.executable)
        .forEach( order => {

          var id = order.id;

          // first node from evaluation
          node = order.nodes[0];

          // process all or one
          amount = allGood ? order.remaining - order.processing : 1;

          // final global budget check
          if (allGood || eco.fits(node.costs, budget, amount)){

            switch(order.verb){

              case "train":
                eco.do("train", amount, order, node); 
                eco.subtract(node.costs, budget, amount);
                order.processing += amount;
                rep.exe.push(id + ":" + amount);
              break;

              case "build":
                if (!hasBuild){
                  eco.do("build", 1, order, node); 
                  eco.subtract(node.costs, budget, 1);
                  order.processing += 1;
                  hasBuild = true;
                } else {
                  deb("    OQ: #%s build postponed (%s)", t(id, 3), node.name);
                }
              break;

              case "research":
                eco.do("research", amount, order, node);
                eco.subtract(node.costs, budget, amount);
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
        .filter( order => order.remaining === 0)
        .forEach( order => {
          rep.rem.push(order.id);
          H.remove(this.queue, order);
      });

      this.tP = Date.now() - t0;

    }   
  };

  H.LIB.Order = function(context){

    H.extend(this, {

      name: "order",
      context: context,
      imports: [
        "id",
        "economy",
        "query",
        "culture",
        "technologies",
        "events",
      ],

    });

    //TODO: make units move to order.position

  };

  H.LIB.Order.prototype = {
    constructor: H.LIB.Order,
    log: function(){},
    initialize: function(config){
      H.extend(this, config, {
        verb:       config.verb, 
        hcq:        config.hcq, 
        source:     config.source, 
        shared:     config.shared,
        id:         config.id         || this.context.idgen,
        x:          config.location ? config.location[0] : undefined,
        z:          config.location ? config.location[1] : undefined,
        amount:     config.amount,
        remaining:  config.remaining  || config.amount,
        processing: config.processing || 0,
        executable: config.executable || false,
      });
      return this;
    },
    clone: function(context){
      return (
        new H.LIB[H.noun(this.name)](context)
          .import()
          .initialize(this.serialize())
      );
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    serialize: function(){
      return {
        id:         this.id,
        x:          this.x,
        z:          this.z,
        amount:     this.amount,
        remaining:  this.remaining,
        processing: this.processing,
        executable: this.executable,
        verb:       this.verb, 
        hcq:        this.hcq, 
        source:     this.source, 
        shared:     this.shared,
      };
    },

    evaluate: function(allocs){

      var availability = this.economy.availability;

      this.executable = false; // ready to send

      // deb("evaluate: %s in", self.id);

      if(this.remaining - this.processing < 1){
        // deb("evaluate: %s out 01", self.id);
        // nothing to do, 
        return;
      }

      this.nodes = this.query(this.hcq).map(function(node){
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
      this.nodes.forEach( node => {
        // deb("evaluate: %s node: ", self.id, node.name);
        var producer = this.economy.producers.allocate(node.name, this);
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
          req    = this.culture.tree.nodes[node.name].requires,
          phase  = this.culture.tree.nodes[node.name].phase,
          phases = this.culture.phases;
        
        if (phases.find(phase).idx > phases.find(phases.current).idx){
          node.qualifies = false; node.info = "needs phase " + phase; return;
        }
        if (req && !this.technologies.available([req])){
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
        this.query(hcq).execute()
          .slice(0, self.remaining - self.processing)
          .forEach(function(node){

            // deb("assignExisting: %s %s %s", self.id, self.verb, node.name);

            self.remaining -= 1; 

             self.events.fire("OrderReady", {
              player: self.context.id,
              id:     node.id,
              data:   {order: self.id, source: self.source}
            });

            // self.processing += 1; 
            // H.Economy.listener("onOrderReady", node.id, {metadata: {order: self.id}});
        });

      }

    },

  };

  H.LIB.Economy = function(context){

    H.extend(this, {

      name: "economy",
      context: context,
      imports: [
        "config",
        "map",
        "effector",
        "events",
        "player",
        "query",
        "groups",
        "metadata",
      ],
      childs: [
        "stats",
        "orderqueue",
        "producers",
      ],
      
      prioVerbs:    ["research", "train", "build"],
      availability: ["food", "wood", "stone", "metal"],
      allocations:  {food: 0, wood: 0, stone: 0, metal: 0},

    });

  };

  H.LIB.Economy.prototype = {
    constructor: H.LIB.Economy,
    log: function(){},
    logTick: function(){
      var 
        stock = this.stats.stock, 
        flows = this.stats.flows,
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
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function(context){
      context.data[this.name] = this.serialize();
      return (
        new H.LIB[H.noun(this.name)](context)
          .import()
          .deserialize()
          .initialize()
      );
    },
    serialize: function(){
      return {
        stats:      this.stats.serialize(),
        producers:  this.producers.serialize(),
        orderqueue: this.orderqueue.serialize(),
      };
    },
    deserialize: function(){
      if (this.context.data[this.name]){
        this.childs.forEach( child => {
          if (this.context.data[this.name][child]){
            this[child] = new H.LIB[H.noun(child)](this.context)
              .import()
              .initialize(this.context.data[this.name][child]);
          }
        });
      }
      return this;
    },
    initialize: function(){
      this.childs.forEach( child => {
        // deb("ECO.child: %s", child);
        if (!this[child]){
          this[child] = new H.LIB[H.noun(child)](this.context)
            .import()
            .initialize();
        }
      });
      return this;
    },
    activate: function(){
      var node, order;

      this.events.on("EntityRenamed", msg => {

        node = this.query("INGAME WITH id = " + msg.id).first();
        if (node){
          this.producers.remove(node);
        } else {
          deb("WARN  : eco.activate.EntityRenamed: id %s no ingame", msg.id);
        }

        node = this.query("INGAME WITH id = " + msg.id2).first();
        if (node){
          this.producers.register(node);
        } else {
          deb("WARN  : eco.activate.EntityRenamed: id2 %s no ingame", msg.id);
        }

      });

      // new technology
      this.events.on("Advance", msg => {
        if (this.orderqueue.delete(order => order.hcq === msg.data.technology)){
          this.producers.unqueue("research", msg.data.technology);
          deb("   ECO: onAdvance: removed order with tech: %s", msg.data.technology);
        }        
      });

      // new producer
      this.events.on("ConstructionFinished", msg => {
        this.producers.register(this.query("INGAME WITH id = " + msg.id).first());
      });

      // new unit
      this.events.on("TrainingFinished", msg => {

        deb("   ECO: TrainingFinished id: %s, meta: %s", msg.id, uneval(this.metadata[msg.id]));

        node = this.query("INGAME WITH id = " + msg.id).first();
        if (node){
          this.producers.register(node);
        } else {
          deb("WARN  : eco.activate.TrainingFinished: id %s no ingame", msg.id);
        }

        this.producers.unqueue("train", msg.data.task); 

        order = this.orderqueue.find(msg.data.order);
        order.remaining  -= 1;
        order.processing -= 1;
        
        this.events.fire("OrderReady", {
          player: this.id,
          id:     msg.id,
          data:   {order: msg.data.order, source: order.source}
        });

      });

      // new metadata
      this.events.on("AIMetadata", msg => {

        order = this.orderqueue.find(msg.data.order);
        order.remaining  -= 1;
        order.processing -= 1;

        deb("   ECO: on AIMetadata order: #%s from %s", order.id, this.groups.findAsset(order.source).name);
        
        // H.Objects(order.source).listener("Ready", id);  
        this.events.fire("OrderReady", {
          player: this.id,
          id:     msg.id,
          data:   {order: msg.data.order, source: order.source}
        });

      });

      // remove entity
      this.events.on("Destroy", msg => {
        this.producers.remove(msg.id);
      });

    },
    tick: function(tick, secs){

      var stock = this.stats.stock, t0 = Date.now();

      if ((tick % this.config.economy.intervalMonitorGoals) === 0){
        // this.monitorGoals();
      }

      // sort availability by stock
      this.availability.sort((a, b) => stock[a] > stock[b] ? 1 : -1);

      this.orderqueue.process();
      this.orderqueue.log();
      this.logTick();
      
      return Date.now() - t0;

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

      this.orderqueue.queue.push(order);

      deb(msg, order.id, order.verb, order.amount, order.cc || "NO CC" , loc, sourcename, order.shared, order.hcq.slice(0, 30));

    },
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
          task = this.context.idgen++;
          node.producer.queue.push([task, order]);
          deb(msg, order.id, verb, id, amount, template); 
          this.effector.train([id], template, amount, {order: order.id, task: task, cc:order.cc});
        break;

        case "research" : 
          node.producer.queue.push([techname, order]);
          deb(msg, order.id, verb, id, 1, template); 
          this.effector.research(id, template);
        break;

        case "build" : 
          // needs no queue
          pos = this.map.findGoodPosition(template, [order.x, order.z]);
          deb(msg, order.id, verb, id, 1, template, order.x.toFixed(0), order.z.toFixed(0)); 
          this.effector.construct([id], template, [pos.x, pos.z, pos.angle], {order: order.id, cc:order.cc});
        break;

      }

    },
  };



  // H.Economy = (function(){

  //   var 
  //     self, goals; //planner, //orderqueue, producers, 
  //     //phases = ["phase.village", "phase.town", "phase.city"];

  //   return {

  //     name: "economy",
  //     prioVerbs: ["research", "train", "build"],
  //     // gatherables  = ["food", "wood", "stone", "metal"],
  //     availability: ["food", "wood", "stone", "metal"],
  //     allocations: {food: 0, wood: 0, stone: 0, metal: 0, population: 0},
  //     stats: H.Stats,
  //     planner: null,
  //     producers: null,
  //     orderqueue: null,
  //     // resources: 

  //     boot: function(){self = this; return self;},
  //     init: function(){

  //       deb();deb();deb("   ECO: init");

  //       var 
  //         cls = H.class2name,
  //         flowCentre, flowBarrack, flowFortress, 
  //         tree = H.Bot.tree.nodes;

  //       self.orderqueue = new H.OrderQueue({
  //         parent:  self,
  //         economy: self
  //       });

  //       self.producers = new H.Producers({
  //         parent:  self,
  //         tree:    H.Bot.tree,
  //         ingames: H.QRY("INGAME"),
  //         config:  H.Config,
  //       });

  //       flowBarrack  = tree[cls("barracks")].flow;
  //       flowCentre   = tree[cls("civcentre")].flow;
  //       flowFortress = tree[cls("fortress")].flow;

  //       deb("   ECO: max flow centre  : %s ", uneval(flowCentre));
  //       deb("   ECO: max flow barracks: %s ", uneval(flowBarrack));
  //       deb("   ECO: max flow fortress: %s ", uneval(flowFortress));

  //     },
  //     tick: function(secs, ticks){

  //       var 
  //         t0 = Date.now(),
  //         stock = H.Player.resourceCounts;
        
  //       if ((ticks % H.Config.economy.intervalMonitorGoals) === 0){
  //         self.monitorGoals();
  //       }

  //       // sort availability by stock
  //       self.availability.sort((a, b) => stock[a] > stock[b] ? 1 : -1);


  //       // H.OrderQueue.process();
  //       // H.OrderQueue.log();
  //       self.orderqueue.process();

  //       // deb("orderqueue: %s", H.attribs(self.orderqueue));

  //       self.orderqueue.log();
  //       self.logTick();
        
  //       return Date.now() - t0;

  //     },
  //     activate: function(){

  //       var node, order;

  //       H.Events.on("EntityRenamed", function (msg){

  //         node = H.QRY("INGAME WITH id = " + msg.id).first();
  //         if (node){
  //           self.producers.remove(node);
  //         } else {
  //           deb("WARN  : eco.activate.EntityRenamed: id %s no ingame", msg.id);
  //         }

  //         node = H.QRY("INGAME WITH id = " + msg.id2).first();
  //         if (node){
  //           self.producers.register(node.name);
  //         } else {
  //           deb("WARN  : eco.activate.EntityRenamed: id2 %s no ingame", msg.id);
  //         }
  //       });

  //       H.Events.on("Advance", function (msg){
  //         // works, but...
  //         if (self.orderqueue.delete(order => order.hcq === msg.data.technology)){
  //           self.producers.unqueue("research", msg.data.technology);
  //           deb("   ECO: onAdvance: removed order with tech: %s", msg.data.technology);
  //         }        
  //       });

  //       H.Events.on("ConstructionFinished", function (msg){
  //         self.producers.register(H.QRY("INGAME WITH id = " + msg.id).first().name);
  //         // H.Producers.loadById(msg.id);
  //       });

  //       H.Events.on("TrainingFinished", function (msg){

  //         deb("   ECO: TrainingFinished id: %s, meta: %s", msg.id, uneval(H.MetaData[msg.id]));

  //         node = H.QRY("INGAME WITH id = " + msg.id).first();
  //         if (node){
  //           self.producers.register(node.name);
  //         } else {
  //           deb("WARN  : eco.activate.TrainingFinished: id %s no ingame", msg.id);
  //         }

  //         // self.producers.register(H.QRY("INGAME WITH id = " + msg.id).first().name);
  //         // H.Producers.loadById(msg.id);
  //         self.producers.unqueue("train", msg.data.task); 

  //         order = H.Objects(msg.data.order);
  //         order.remaining  -= 1;
  //         order.processing -= 1;
          
  //         // H.Objects(order.source).listener("Ready", id);  
  //          H.Events.fire("OrderReady", {
  //           player: H.Bot.id,
  //           id:     msg.id,
  //           data:   {order: msg.data.order, source: order.source}
  //         });

  //       });

  //       H.Events.on("AIMetadata", function (msg){

  //         order = H.Objects(msg.data.order);
  //         order.remaining  -= 1;
  //         order.processing -= 1;

  //         deb("   ECO: on AIMetadata order: #%s from %s", order.id, H.Objects(order.source).name);
          
  //         // H.Objects(order.source).listener("Ready", id);  
  //         H.Events.fire("OrderReady", {
  //           player: H.Bot.id,
  //           id:     msg.id,
  //           data:   {order: msg.data.order, source: order.source}
  //         });

  //       });

  //       // H.Events.on("Advance", function (msg){
  //       //   self.producers.unqueue("research", msg.data.technology);  
  //       // });

  //       H.Events.on("Destroy", function (msg){
  //         self.producers.remove(msg.id);
  //         // deb("   ECO: got Event destroy for id: %s", msg.id);
  //       });


  //     },
  //     monitorGoals: function(){

  //     },
  //     getPhaseNecessities: function(context){ // phase, centre, tick
        
  //       var 
  //         cls = H.class2name,
  //         cc  = context.centre,
  //         housePopu = H.QRY(cls("house")).first().costs.population * -1,
          
  //         technologies = [],
  //         launches = {

  //           "phase.village": [

  //              //  tck, amount,       group,        params
  //              [   2, [1, "g.supplier",   {cc: cc, size: 4, resource: "food.fruit"}]],
  //              [   2, [1, "g.supplier",   {cc: cc, size: 1, resource: "food.meat"}]],
  //              [   2, [1, "g.supplier",   {cc: cc, size: 5, resource: "wood"}]],
  //              [   3, [1, "g.builder",    {cc: cc, size: 2, building: cls("house"),      quantity: 2}]],
  //              [   4, [1, "g.builder",    {cc: cc, size: 2, building: cls("farmstead"),  quantity: 1}]],
  //              [   4, [1, "g.builder",    {cc: cc, size: 2, building: cls("storehouse"), quantity: 1}]],
  //              [  10, [1, "g.harvester",  {cc: cc, size: 5}]],
  //              [  20, [1, "g.supplier",   {cc: cc, size: 5, resource: "stone"}]],
  //              [  30, [1, "g.supplier",   {cc: cc, size: 5, resource: "metal"}]],

  //           ],
  //           "phase.town" :   [
  //              [  10, [1, "g.supplier",   {cc: cc, size: 15, resource: "wood"}]],
  //              [  10, [1, "g.supplier",   {cc: cc, size: 15, resource: "stone"}]],
  //              [  10, [1, "g.supplier",   {cc: cc, size: 15, resource: "metal"}]],

  //           ],
  //           "phase.city" :   [

  //           ],
  //         };

  //       return {
  //         launches: launches,
  //         technologies: technologies,
  //         messages: messages,
  //       };

  //     },
  //     updateActions: function(phase){

  //       var 
  //         groups,
  //         ressTargets = {
  //           "food":  0,
  //           "wood":  0,
  //           "stone": 0,
  //           "metal": 0,
  //           "pop":   0,
  //         };

  //       deb();deb();deb("   ECO: updateActions phase: %s", phase);
  //       self.planner  = H.Brain.requestPlanner(phase);

  //       // deb("     E: planner.result.data: %s", uneval(planner.result.data));

  //       ressTargets.food  = self.planner.result.data.cost.food  || 0 + self.planner.result.data.ress.food;
  //       ressTargets.wood  = self.planner.result.data.cost.wood  || 0 + self.planner.result.data.ress.wood;
  //       ressTargets.metal = self.planner.result.data.cost.metal || 0 + self.planner.result.data.ress.metal;
  //       ressTargets.stone = self.planner.result.data.cost.stone || 0 + self.planner.result.data.ress.stone;

  //       deb("     E: ress: %s", uneval(ressTargets));

  //       goals = self.getActions(self.planner);

  //       groups = H.Brain.requestGroups(phase);
  //       groups.forEach(g => deb("     E: group: %s", g));

  //       groups.forEach(group => {
  //         var [count, name, cc, options] = group;
  //         H.extend(options, {name: name, cc: cc});
  //         H.loop(count, () => {
  //           H.Groups.launch(options);
  //         });
  //       });

  //       // H.Groups.log();

  //       deb("   ECO: updateActions -------");deb();

  //     },
  //     getActions: function(planner){

  //       // filter out already achieved goals and meta info

  //       var 
  //         count, 
  //         cost  = planner.costs,
  //         nextphase,
  //         goals = planner.operations.filter(oper => {

  //         if (oper[1] === "research_tech" && oper[2].contains("phase")){
  //           return false;
  //         }

  //         if (oper[1] === "research_tech" && H.Technologies.available([oper[2]])){
  //           return false;
  //         }

  //         if (oper[1] === "start" || oper[1] === "finish" || oper[1] === "wait_secs"){
  //           return false;
  //         }

  //         return true;

  //       });

  //       // update amounts

  //       goals.forEach(goal => {

  //         if (goal[1] === "build_structures" || goal[1] === "train_units"){
  //           count = H.QRY(goal[2] + " INGAME").count();
  //           deb("     E: have: %s, need: %s | %s", count, goal[3], goal[2]);
  //           goal[3] -=  count;
  //         }

  //       });

  //       goals.forEach(goal => {

  //         if (goal[1] === "research_tech"){
  //           deb("     E: goal: X %s", goal.slice(1));
  //           H.Triggers.add( -1, 
  //             H.Economy.request.bind(H.Economy, new H.Order({
  //               amount:     1,
  //               verb:       "research", 
  //               hcq:        goal[2], 
  //               source:     H.Brain.id, 
  //               shared:     false
  //             }))
  //           );

  //         } else {
  //           deb("     E: goal: - %s", goal.slice(1));
          
  //         }



  //       });

  //     },
  //     multiply: function(cost, amount=1){
  //       cost.food  *= amount;
  //       cost.wood  *= amount;
  //       cost.metal *= amount;
  //       cost.stone *= amount;
  //     },
  //     subtract: function(cost, budget, amount=1){
  //       budget.food  -= cost.food  > 0 ? (cost.food  * amount) : 0;
  //       budget.wood  -= cost.wood  > 0 ? (cost.wood  * amount) : 0;
  //       budget.metal -= cost.metal > 0 ? (cost.metal * amount) : 0;
  //       budget.stone -= cost.stone > 0 ? (cost.stone * amount) : 0;
  //     },
  //     fits: function(cost, budget, amount=1){
  //       return (
  //         ((cost.food  || 0) * amount) <= (budget.food  || 0) &&
  //         ((cost.wood  || 0) * amount) <= (budget.wood  || 0) &&
  //         ((cost.stone || 0) * amount) <= (budget.stone || 0) &&
  //         ((cost.metal || 0) * amount) <= (budget.metal || 0)
  //       );  
  //     },
  //     diff: function(cost, budget, amount=1){
  //       return {
  //         food:   (budget.food   || 0) - (cost.food   || 0 * amount),
  //         wood:   (budget.wood   || 0) - (cost.wood   || 0 * amount),
  //         stone:  (budget.stone  || 0) - (cost.stone  || 0 * amount),
  //         metal:  (budget.metal  || 0) - (cost.metal  || 0 * amount),
  //         pop  :  (budget.pop    || 0) - (cost.pop    || 0 * amount),
  //         popcap: (budget.popcap || 0) - (cost.popcap || 0 * amount),
  //       };
  //     },
  //     request: function(order){

  //       var  // debug
  //         sourcename = H.Objects(order.source).name,  // this is an asset instance
  //         loc = (order.location === undefined) ? "undefined" : order.location.map(p => p.toFixed(1)),
  //         msg = "  EREQ: #%s, %s amount: %s, cc: %s, loc: %s, from: %s, shared: %s, hcq: %s";

  //       order.economy = self;
  //       self.orderqueue.append(order);

  //       deb(msg, order.id, order.verb, order.amount, order.cc || "NO CC" , loc, sourcename, order.shared, order.hcq.slice(0, 30));

  //     },

  //     // do: function(verb, amount, producer, template, order, cost){
  //     do: function(verb, amount, order, node){

  //       var 
  //         pos, id = node.producer.id, task, 
  //         template = node.key,
  //         techname = H.saniTemplateName(node.key),
  //         msg = ( verb === "build" ?
  //           "   EDO: #%s %s, producer: %s, amount: %s, tpl: %s, x: %s, z: %s" : 
  //           "   EDO: #%s %s, producer: %s, amount: %s, tpl: %s"
  //         );

  //       if (verb === "build" && order.x === undefined){deb("ERROR : order #%s %s without position", id, verb); return;}

  //       switch(verb){

  //         case "train" :
  //           task = H.Task.id;
  //           // task = self.genTaskId();
  //           node.producer.queue.push([task, order]);
  //           deb(msg, order.id, verb, id, amount, template); 
  //           H.Effector.train([id], template, amount, {order: order.id, task: task, cc:order.cc});
  //         break;

  //         case "research" : 
  //           node.producer.queue.push([techname, order]);
  //           deb(msg, order.id, verb, id, 1, template); 
  //           H.Effector.research(id, template);
  //         break;

  //         case "build" : 
  //           // needs no queue
  //           pos = H.Map.findGoodPosition(template, [order.x, order.z]);
  //           deb(msg, order.id, verb, id, 1, template, order.x.toFixed(0), order.z.toFixed(0)); 
  //           H.Effector.construct([id], template, [pos.x, pos.z, pos.angle], {order: order.id, cc:order.cc});
  //         break;

  //       }

  //     },
  //     logTick: function(){

  //       var 
  //         stock = H.Stats.stock, 
  //         flows = H.Stats.flows,
  //         t = H.tab, f = n => n > 0 ? "+" + n : n === 0 ? " 0": n,
  //         msg = H.format("   ECO: F%s %s, W%s %s, M%s %s, S%s %s, P%s %s, A%s %s, H%s %s", 
  //           t(stock.food,   6), f(flows.food.toFixed(1)),
  //           t(stock.wood,   6), f(flows.wood.toFixed(1)),
  //           t(stock.metal,  6), f(flows.metal.toFixed(1)),
  //           t(stock.stone,  6), f(flows.stone.toFixed(1)),
  //           t(stock.pops,   4), f(flows.pops.toFixed(1)),
  //           t(stock.area,   4), f(flows.area.toFixed(1)),
  //           t(stock.health, 4), f(flows.health.toFixed(1))
  //         );

  //       // deb(msg);

  //     }

  //   };

  // }()).boot();


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



  // H.Producers = function(context){

  //   // deb();deb();deb("   PDC: inited for %s", context.parent.name);

  //   H.extend(this, {
  //     name:       context.parent.name + ":pdc",
  //     tree:       context.tree.nodes,
  //     ingames:    context.ingames,
  //     nameCentre: context.nameCentre,
  //     maxAllocs:  context.config.economy.maxAllocations,
  //     producers: {},
  //   }); 
    
  //   // TODO ignore units for build
  //   this.ingames.forEach(node => this.register(node.name));

  //   // deb("   PDC: registered %s producers", H.count(this.producers));

  // };

  // H.Producers.prototype = {
  //   constructor: H.Producers,
  //   log: function(){
  //     var self = this;
  //     H.each(this.producers, function(nameid, data){
  //       var [name, id] = nameid.split("#");
  //       deb("   PDC: %s %s info: %s", id, name, self.infoProducer(name));
  //     });
  //   },
  //   isProducer: function(name){
  //     return (this.tree[name] && this.tree[name].products.count);
  //   },
  //   infoProducer: function(name){
  //     var 
  //       train    = H.count(this.tree[name].products.train),
  //       build    = H.count(this.tree[name].products.build),
  //       research = H.count(this.tree[name].products.research);
  //     return H.format("procucer: %s trains: %s, builds: %s, researches: %s", name, train, build, research);
  //   },
  //   resetAllocs: function(){
  //     H.each(this.producers, function (name, producer){
  //       producer.allocs = producer.queue.length;
  //     });      
  //   },
  //   unqueue: function(verb, info){

  //     var found = false;

  //     H.each(this.producers, function (name, producer){
  //       if(!found && producer.queue && producer.queue.length){
  //         if (H.delete(producer.queue, task => task[0] === info)){
  //           found = true;
  //           producer.allocs -= 1;
  //           deb("   PDC: unqueue: removed in queue: %s, %s from %s", verb, info, producer.name);
  //         }
  //       }
  //     });

  //     if (!found) {
  //       deb("   PDC: unqueue: not found in any queue: %s, %s", verb, info);
  //     }

  //   },
  //   findCentre: function(name){
  //     var producer, names = H.attribs(this.producers), i = names.length;
  //     while ((producer = this.producers[names[--i]])){
  //       if (producer.name === this.nameCentre){
  //         return producer;
  //       }
  //     }      
  //     return null;
  //   },
  //   register: function(nameid){
  //     var parts = nameid.split("#"), name = parts[0], id = parts[1];
  //     if (this.isProducer(name) && !this.producers[nameid]){
  //       this.producers[nameid] = {
  //         id:     ~~id,
  //         name:   name, 
  //         queue:    [],   // taskids or techs
  //         simqueue: [],   // simulates engine's queue for simulations
  //         allocs:    0,   // per orderqueue cycle
  //       };
  //       // deb("   PDC: reg: %s", uneval(this.producers[nameid]));
  //     }
  //   },
  //   remove: function(nodeOrId){
  //     var self = this, id = H.isInteger(nodeOrId) ? nodeOrId : nodeOrId.id;
  //     H.each(self.producers, function(nameid, producer){
  //       if (producer.id === id){
  //         delete self.producers[nameid];
  //         deb("   PDC: removed id: %s, tpl: %s", id, H.Entities[id] ? H.Entities[id]._templateName : "unknown");
  //       }        
  //     });
  //   },  
  //   allocate: function(product, order){

  //     var 
  //       phase, producer, 
  //       tree = this.tree,
  //       verb = this.tree[product].verb, 
  //       names = H.attribs(this.producers),
  //       i = names.length,
  //       found = false;

  //     // deb("   PDC: allocate: %s, %s", product, cc || "nocc");

  //     // has no producer
  //     if(!verb){
  //       // deb("ERROR : PDC.allocate: no verb for %s", product);
  //       return null;
  //     }

  //     switch (verb){

  //       case "build":
  //         // can ignore cc and allocations
  //         while ((producer = this.producers[names[--i]])){

  //           // deb("   PDC testing %s %s %s", !!tree[producer.name].products.build[product], producer.name, product);

  //           if (tree[producer.name].products.build[product]){
  //             break;  
  //           }        
  //         }
  //       break;

  //       case "research":
  //         // can ignore cc
  //         if (product.contains("phase")){
  //           if ((producer = this.findCentre())){ // TODO: search over all centres
  //             if (producer.allocs >= this.maxAllocs){
  //               // deb("   PDC: max: %s", uneval(producer));
  //               producer = null;
  //             }
  //           }
  //         } else {
  //           while (i--){
  //             producer = this.producers[names[i]];
  //             found = (
  //               tree[producer.name].products.research[product] && 
  //               producer.allocs < this.maxAllocs
  //             );
  //             if (found){break;} else {producer = null;}
  //           }
  //         }
  //       break;
        
  //       case "train":
  //         while (i--){
  //           producer = this.producers[names[i]];

  //           deb("   PDC: allocate: id: %s, meta: %s", producer.id, uneval(H.MetaData[producer.id]));

  //           found = (
  //             tree[producer.name].products.train[product] &&
  //             producer.allocs < this.maxAllocs && 
  //             !order.cc || H.MetaData[producer.id].cc === order.cc
  //           );
  //           if (found){break;} else {producer = null;}
  //         }
  //       break;
        
  //     }

  //     if(producer){producer.allocs += 1;}

  //     return producer;

  //   },
  // };

  // H.OrderQueue = function (options){

  //   // options: parent, executor (do, prioverbs, stats)

  //   H.extend(this, options, {
  //     name:   options.parent.name + ":queue",
  //     queue:  [],
  //     report: {rem: [], exe: [], ign: []},
  //     tP:    0,
  //   });

  // };

  // H.OrderQueue.prototype = {
  //   constructor: H.OrderQueue,
  //   get length  () {return this.queue.length;},
  //   get waiting () {return this.queue.filter(o => o.remaining === o.processing).length;},
  //   get processing () {return this.queue.length - this.waiting;},
  //   append: function(item){this.queue.push(item);},
  //   remove: function(item){H.remove(this.queue, item);},
  //   delete: function(fn){return H.delete(this.queue, fn);},
  //   log:    function(){
  //     var r = this.report;
  //     // deb("    OQ: name: %s, queue.length: %s, %s msecs, rem: %s, ign: %s, exe: %s", this.name, this.queue.length, this.tP, r.rem, r.ign, r.exe);
  //   },      
  //   process: function(isSimulation=false, logWaiting=false){

  //     var 
  //       self = this, t0 = Date.now(), amount, node, msg, t = H.tab, 
  //       processing    = 0,
  //       waiting    = 0,
  //       allGood    = false, 
  //       hasBuild   = false, // only one construction per tick
  //       rep        = this.report,
  //       queue      = this.queue,
  //       allocs     = H.deepcopy(this.economy.allocations),
  //       budget     = H.deepcopy(this.economy.stats.stock),
  //       prioVerbs  = this.economy.prioVerbs;
        
  //     // reset logging array
  //     rep.rem.length = 0; rep.ign.length = 0; rep.exe.length = 0;

  //     // queue empty -> exit
  //     if (!queue.length){this.tP = 0; return;}

  //     // clear allocs from last tick
  //     this.economy.producers.resetAllocs();

  //     // sort by (source, verbs) and evaluate
  //     queue
  //       .sort((a, b) => prioVerbs.indexOf(a.verb) < prioVerbs.indexOf(b.verb) ? -1 : 1)
  //       .forEach(order => isSimulation ? order.simulate(allocs) : order.evaluate(allocs));

  //     // info
  //     waiting = this.waiting;
  //     processing = this.processing;
  //     allGood = H.Economy.fits(allocs, budget);  // get first quote whether all order fit budget

  //     if (processing){
  //       deb("    OQ: queue: %s, allg: %s, waits: %s, allocs: %s", queue.length, allGood, waiting, uneval(allocs));
  //     }

  //     // rep / debug
  //     msg = "    OQ: #%s %s amt: %s, rem: %s, pro: %s, verb: %s, nodes: %s, from %s ([0]: %s)";
  //     queue.forEach(o => {
  //       var 
  //         isWaiting = o.remaining === o.processing,
  //         exec = o.executable ? "X" : "-",
  //         source = H.isInteger(o.source) ? H.Objects(o.source).name : o.source,
  //         nodename = o.nodes.length ? o.nodes[0].name : "hcq: " + o.hcq.slice(0, 40);
  //       if(!(isWaiting && !logWaiting)){
  //         deb(msg, t(o.id, 3), exec, t(o.amount, 2), t(o.remaining, 2), t(o.processing, 2), o.verb.slice(0,5), t(o.nodes.length, 3), source, nodename);
  //       }
  //     });

  //     // choose executables and process
  //     queue
  //       .filter(order => order.executable)
  //       .forEach(function(order){

  //         var id = order.id;

  //         // first node from evaluation
  //         node = order.nodes[0];

  //         // process all or one
  //         amount = allGood ? order.remaining - order.processing : 1;

  //         // final global budget check
  //         if (allGood || H.Economy.fits(node.costs, budget, amount)){

  //           switch(order.verb){

  //             case "train":
  //               self.economy.do("train", amount, order, node); 
  //               H.Economy.subtract(node.costs, budget, amount);
  //               order.processing += amount;
  //               rep.exe.push(id + ":" + amount);
  //             break;

  //             case "build":
  //               if (!hasBuild){
  //                 self.economy.do("build", 1, order, node); 
  //                 H.Economy.subtract(node.costs, budget, 1);
  //                 order.processing += 1;
  //                 hasBuild = true;
  //               } else {
  //                 deb("    OQ: #%s build postponed (%s)", t(id, 3), node.name);
  //               }
  //             break;

  //             case "research":
  //               self.economy.do("research", amount, order, node);
  //               H.Economy.subtract(node.costs, budget, amount);
  //               order.processing += amount;
  //               rep.exe.push(id + ":" + amount);
  //             break;

  //             default:
  //               deb("ERROR : orderQueue.process: #%s unknown order.verb: %s", id, order.verb);

  //           }

  //         } else {
  //           rep.ign.push(id);

  //         }


  //     });

  //     queue
  //       .filter(function(order){return order.remaining === 0;})
  //       .forEach(function(order){
  //         rep.rem.push(order.id);
  //         self.remove(order);
  //     });

  //     this.tP = Date.now() - t0;

  //   }    

  // };

