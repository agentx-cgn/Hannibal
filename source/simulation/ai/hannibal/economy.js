/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- E C O N O M Y -----------------------------------------------

  Priotizes requests for resources. Trains, researches and construct them.
  includes stats, producers, order, orderqueue

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Stats = function(context){

    var 
      bufferLength = context.config.stats.LengthStatsBuffer,
      ress = {food: 0, wood: 0, stone: 0, metal: 0, pops: 0, health: 0, area: 0};

    H.extend(this, {

      context:  context,

      klass:    "stats",
      parent:   context,
      name:     context.name + ":stats",

      imports:  [
        "player"
      ],

      ress:        H.deepcopy(ress),
      gatherables: ["food", "wood", "stone", "metal"],

      stock: H.deepcopy(ress), 
      // totals gathered, difference per tick, flow = avg over diff
      suply: H.deepcopy(ress), 
      diffs: H.map(ress, H.createRingBuffer.bind(null, bufferLength, [], 0, 0)),
      flows: H.deepcopy(ress), 
      alloc: H.deepcopy(ress), // allocated per queue
      forec: H.deepcopy(ress), // ???
      trend: H.deepcopy(ress), // as per suply
      stack: H.map(ress, H.createRingBuffer.bind(null, bufferLength, [], 0, 0)), // last x stock vals

    });

  };

  H.LIB.Stats.prototype = H.mixin(
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Stats,
    log: function(){
      this.deb();
      this.deb("  STAT: stock: %s", JSON.stringify(this.stock));
      this.deb("  STAT: stock: %s", JSON.stringify(this.stock));
    },
    logTick: function(){
      this.deb("  STAT: stock: %s", JSON.stringify(this.stock));
      this.deb("  STAT: flows: %s", JSON.stringify(this.flows));
    },
    initialize: function(){
      this.tick();
      return this;
    },
    deserialize: function(data){ // child
      if (data){
        H.extend(this, {
          stock: data.stock, 
          suply: data.suply, 
          diffs: H.map(data.diffs, (key, data) => H.createRingBuffer.apply(null, data)), // last x stock vals
          flows: data.flows, 
          alloc: data.alloc,
          forec: data.forec, 
          trend: data.trend, 
          stack: H.map(data.stack, (key, data) => H.createRingBuffer.apply(null, data)), // last x stock vals
        });
      }
      return this;
    },
    serialize: function(){
      return {
        stock: H.deepcopy(this.stock), 
        suply: H.deepcopy(this.suply), 
        diffs: H.map(this.diffs, (key, buffer) => buffer.serialize()), // buffer !!
        flows: H.deepcopy(this.flows), 
        alloc: H.deepcopy(this.alloc),
        forec: H.deepcopy(this.forec), 
        trend: H.deepcopy(this.trend), 
        stack: H.map(this.stack, (key, buffer) => buffer.serialize()), // buffer !!
      };
    },
    tick: function(tick, secs){

      var 
        t0 = Date.now(), curHits = 1, maxHits = 1, 
        gathered  = this.player.statistics.resourcesGathered,
        available = this.player.resourceCounts;

      // update
      this.import();
          
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

  });

  H.LIB.Producers = function(context){

    H.extend(this, {

      context: context,

      klass:    "producers",
      parent:   context,
      name:     context.name + ":producers",

      imports: [
        "query",
        "culture",
        "config",
        "entities", // _entity.trainingQueue
        "metadata",
      ],

      producers: null,

      maxqueue: 0,

      // producer info template
      info:      {
        type:     "",   // ~~ unit|building, units do not have _entity.trainingQueue
        entities: [],   // entity id(s)
        name:     "",   // node name
        queue:    [],   // taskids or techs
        allocs:    0,   // per orderqueue cycle
      },

    });

  };

  H.LIB.Producers.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Producers,
    log: function(){
      var count;
      this.deb();
      if ((count = H.count(this.producers))){
        this.deb("   PDC: have %s producers", count);
        H.attribs(this.producers)
          .sort((a, b) => ~~a < ~~b ? -1 : 1)
          .forEach( nameid => {
            var [name, id] = nameid.split("#");
            this.deb("     P: %s %s", id ? "#" + id : "", this.infoProducer(name));
        });
      } else {
        this.deb("   PDC: log: no producer registered");
      }
    },
    logTick: function(){

      var 
        t = H.tab, 
        name, id, apiqueue,
        producers = H.attribs(this.producers),
        countAll  = producers.length, 
        countBld  = producers.filter(a => this.producers[a].type === "building").length,
        countUnt  = producers.filter(a => this.producers[a].type === "unit").length;

      if (countAll){
        this.deb("   PDC: %s B/%s U/%s producers", countBld, countUnt, countAll);

        if (false){

          // buildings
          this.deb("*");
          producers
            .filter(a => this.producers[a].type === "building")
            .filter(a => !!this.producers[a].queue)
            .sort((a, b) => this.producers[a].queue.length > this.producers[b].queue.length ? -1 : 1)
            .forEach( nameid => {
              [name, id] = nameid.split("#");
              this.deb("     P: B %s alc: %s, q: %s, n: %s ", 
                t("#" + id, 4), 
                t(this.producers[nameid].allocs, 3), 
                uneval(this.producers[nameid].queue), 
                nameid
              );

              // item: id, unitTemplate, technologyTemplate, count, neededSlots, progress, timeRemaining, metadata
              apiqueue = this.entities[id]._entity.trainingQueue;
              if(apiqueue && apiqueue.length){
                // this.deb("     P: api: len: %s", apiqueue.length);
                apiqueue.forEach( item => {
                  this.deb("      :   %s, rem: %s, pro: %s, cnt: %s, tpl: %s", 
                    t(item.id, 3), 
                    t((item.timeRemaining/1000).toFixed(1), 8), 
                    t(~~(item.progress * 100), 4), 
                    t(item.count, 2), 
                    item.unitTemplate
                  );
                });
              }
          });

          // units
          this.deb("*");
          producers
            .filter(a => this.producers[a].type === "unit")
            .sort((a, b) => this.producers[a].entities.length > this.producers[b].entities.length ? -1 : 1)
            .forEach( name => {
              this.deb("     P: U %s %s ", 
                t(this.producers[name].entities.length, 3), 
                name
              );
          });


          this.deb("*");
        }

      } else {
        this.deb("   PDC: log: no producer registered");
      }
    },
    deserialize: function(data){ // child
      this.producers = data ? data : null; //{};
      return this;
    },
    serialize: function(){
      return H.deepcopy(this.producers);
    },
    initialize: function(){
      this.maxqueue = this.config.economy.MaxQueueLength;
      return this;
    },
    finalize: function(){
      if (!this.producers){
        this.producers = {};
        this.query("INGAME").forEach(this.register, this);
      }
    },
    infoProducer: function(name){
      var tree = this.culture.tree.nodes;
      return H.format("%s train: %s, build: %s, research: %s", name,
        H.count(tree[name].products.train),
        H.count(tree[name].products.build),
        H.count(tree[name].products.research)
      );
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
    register: function(nodeOrId){

      var 
        check, 
        node = H.isInteger(nodeOrId) ? this.query("INGAME WITH id = " + nodeOrId).first() : nodeOrId,
        id   = H.isInteger(nodeOrId) ? nodeOrId : node.id,
        name = node.name.split("#")[0],
        type = this.entities[id]._entity.trainingQueue ? "building" : "unit",
        tree = this.culture.tree.nodes;

      // deb("   PDC: to register: %s, %s", name, id);

      check = (
        // !this.producers[node.name] &&                 // is not already registered
        tree[name]                 &&                 // is a node
        tree[name].products.count                     // has products
      ); 

      if (check){

        if (type === "unit"){
          if (this.producers[name]){
            this.producers[name].entities.push(id);
          } else {
            this.producers[name] = H.mixin(
              H.deepcopy(this.info), {type: type, name: name, entities: [id]}
            );
          }
        
        } else if (type === "building"){
          this.producers[node.name] = H.mixin(
            H.deepcopy(this.info), {type: type, entities: [id], name: name}
          );
        
        }
        // deb("   PDC: registered: %s", uneval(this.producers[node.name]));
      } else {
        // deb("   PDC: NOT registered: %s, %s", name, id);
      }

    },
    remove: function(nodeOrId){

      var 
        name, id, found = false, 
        idpdc = H.isInteger(nodeOrId) ? nodeOrId : nodeOrId.id;

      this.deb("   PDC: remove: idpdc: %s", idpdc);

      H.each(this.producers, (nameid, info) => {

        if (!found){

          [name, id] = nameid.split("#");

          if (~~id === idpdc){
            // type == building with name#id
            delete this.producers[nameid];
            this.deb("   PDC: removed building, nameid: %s", nameid);
            found = true;

          } else if (H.contains(info.entities, idpdc)) {
            // type == unit with ent list
            H.delete(this.producers[nameid].entities, ident => ident === idpdc);
            if(!this.producers[nameid].entities.length){
              delete this.producers[nameid];
            }
            this.deb("   PDC: removed unit, id: %s, from: %s", idpdc, nameid);
            found = true;

          }

        }

      });

      if (!found){
        this.deb("WARN  : PDC can't delete producer with idpdc: %s", idpdc);
      }

    },  
    queue: function(producer, taskidOrTech){
      producer.queue.push(taskidOrTech);
      this.deb("   PDC: queued: task: %s in queue: %s | %s", taskidOrTech, producer.queue, producer.name);
    },
    unqueue: function(verb, taskidOrTech){

      // probably slow

      var found = false;

      H.each(this.producers, (name, producer) => {
        if(!found && producer.queue.length){
          if (H.delete(producer.queue, task => task === taskidOrTech)){
            found = true;
            // this.deb("   PDC: unqueue: removed task: %s from queue: %s | %s", taskidOrTech, producer.queue, producer.name);
          }
        }
      });

      if (!found) {
        // false alram for order.amount > 1;
        // this.deb("   PDC: unqueue: not found in any queue: %s, %s", verb, taskidOrTech);
      }

    },
    resetAllocations: function(){
      var id;
      H.each(this.producers, (name, info) => {
        if (info.type === "building"){
          id = info.entities[0];
          if (this.entities[id]){
            info.allocs = this.entities[id]._entity.trainingQueue.length;
          } else {
            this.deb("WARN  : resetAllocations for id: %s failed", id);
          }
        }
      });      
    },
    allocate: function(product, verb){

      if (verb === "build"){
        // builder/unit have no queue
        return true;

      } else if (product.producer.allocs < this.maxqueue){
        product.producer.allocs += 1;
        return true;
      
      } else {
        return false;

      }

    },
    find: function(product, cc){

      // searches culture.tree for producer for product
      // returns matching producer with most free slots, if avail. or null
      // TODO: calculate exactly best producer, based on queue length and -items

      var 
        id, producer, check = false, found = false, candidates = [],
        tree  = this.culture.tree.nodes,
        verb  = tree[product].verb, 
        names = H.attribs(this.producers),
        i     = names.length;

      switch (verb){

        case "build":

          // only checks for existence no queue when building
          while (i-- && !found){
            producer = this.producers[names[i]];
            if (tree[producer.name].products.build[product]){
              found = true;  
            }        
          }

        break;

        case "research":

          // can ignore cc
          if (product.contains("phase")){
            if ((producer = this.findCentre())){ // TODO: search over all centres
              if (producer.allocs >= this.maxqueue){
                // deb("   PDC: max: %s", uneval(producer));
                producer = null;
              }
            }
          } else {
            while (i-- && !found){
              producer = this.producers[names[i]];
              found = (
                tree[producer.name].products.research[product] && 
                producer.allocs < this.maxqueue
              );
            }
          }
        break;
        
        case "train": //TODO: break on allocs = 0;

          while (i-- && !found){
            producer = this.producers[names[i]];
            id = producer.entities[0];
            check = (
              tree[producer.name].products.train[product] &&
              producer.allocs < this.maxqueue && 
              this.metadata[id].cc && // TESTTHIS
              (!cc || this.metadata[id].cc === cc)
            );
            if (check){
              candidates.push(producer);
            }
          }
          if (candidates.length){
            found = true;
            producer = candidates
              .sort((a, b) => a.allocs > b.allocs ? 1 : -1)[0];
          }

        break;

        default: 
          // units.athen.infantry.archer.a
          // H.throw("PDC: can't find producer for %s with unknwon verb: '%s'", product, verb);
          return null;
        
      }

      if (producer && found){
        // deb("   PDC: found: verb: %s : %s#%s for %s in %s, meta: %s", 
        //   verb, 
        //   producer.name, producer.id, 
        //   product, cc,
        //   uneval(this.metadata[producer.id])
        // );
      } else {
        if (verb === "build"){
          this.deb("   PDC: NO producer found for %s at cc: %s", product, cc);
        }
      }

      return producer && found ? producer : null;

    },

  });

  H.LIB.Order = function(context){

    H.extend(this, {

      context: context,

      klass:    "order",
      parent:   context,
      // name:     comes in init

      imports: [
        "bot",
        "query",
        "events",
        "groups",
        "culture",
        "economy",
        "resources",
        "technologies",
      ],

    });

    //TODO: make units move to order.position

  };

  H.LIB.Order.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Order,
    log: function(){
      var
        source = this.groups.findAsset(this.source),  // this is an asset id
        loc = (this.location === undefined) ? "undefined" : H.fixed1(this.location);

      this.deb("   ORD: log #%s, %s amount: %s, cc: %s, loc: %s, from: %s, shared: %s, hcq: %s",
        this.id, 
        this.verb, 
        this.amount, 
        this.cc || "NO CC" , 
        loc, 
        source,  // that's an asset
        this.shared, 
        this.hcq
      );

    },
    initialize: function(order){
      H.extend(this, order, {
        age:        0,
        id:         order.id         || this.context.idgen++,
        processing: 0,
        remaining:  order.remaining  || order.amount,
        product:    null,
        x:          order.location ? order.location[0] : NaN,
        z:          order.location ? order.location[1] : NaN,
      });
      this.name = H.format("%s:order#%s", this.context.name, this.id);
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
        verb:       this.verb, 
        hcq:        this.hcq, 
        source:     this.source, 
        shared:     this.shared,
      };
    },

    evaluate: function(allocs){

      // analyzes the order specs and 
      // assigns ingame entities, if possible or
      // finds the one best fitting template 
      // to produce

      var 
        sorter, producer,
        producers = this.economy.producers;

      this.age += 1;
      this.flags = "";
      this.product = null;   // to be determined

      if(this.remaining - this.processing < 1){
        // nothing left to do
        return;
      }

      // make own copy of store data
      this.nodes = this.query(this.hcq).map( node => {
        return {
          name:      node.name,
          key:       node.key,
          costs:     node.costs,
          qualifies: true,        // think positive
          producer:  null,        // to be determined
          info:      ""           // debug
        };
      });

      // assigns ingames if available and matching
      this.assignExisting();      
      if(this.remaining - this.processing < 1){
        // nothing left to do
        return;
      } 

      // check whether ingame producer exists
      this.nodes.forEach( node => {
        // deb("evaluate: %s node: ", self.id, node.name);
        producer = producers.find(node.name, this.cc);
        if (producer){
          node.producer = producer;
          // deb("evaluate: %s prod for %s #%s %s", self.id, node.name, producer.id, producer.name);
        } else {
          node.qualifies = false;
          node.info += !producer ? "no producer, " : "";
        }
      });

      // remove disqualified nodes
      H.delete(this.nodes, node => !node.qualifies);
      if (!this.nodes.length){
        this.flags = "P"; // NO producer
        return;
      }

      // any unmet techs
      this.nodes
        .filter( node => node.qualifies)
        .forEach( node => {

          var 
            req    = this.culture.tree.nodes[node.name].requires,
            phase  = this.culture.tree.nodes[node.name].phase,
            phases = this.culture.phases;

          // this.deb("   ORD: eval: %s req: %s, phs: %s", node.name, req, phase);  
          
          if (!phases.achieved(phase)){
            /*
              units.athen.support.female.citizen.house
            */
            node.qualifies = false; 
            node.info = "needs phase " + phase; 
            // this.deb("   ORD: eval: %s phase: %s, not achieved", node.name, phase);

            // this.deb("   ORD: #%s needs phase %s | %s > %s | %s, %s", 
            //   this.id, 
            //   phase, 
            //   phases.find(phase).idx,
            //   phases.find(phases.current).idx,
            //   node.name,
            //   this.hcq
            // );
            return;
          }

          // req might be phase
          if (req && phases.achieved(req)){
            // this.deb("   ORD: eval: %s req: %s, achieved", node.name, req);
            return;
          }

          if (req && !this.technologies.available([req])){
            node.qualifies = false; 
            node.info = "needs req " + req; 
            this.deb("   ORD: #%s needs req %s", this.id, req);
            return;
          }

      });  

      // remove disqualified nodes
      H.delete(this.nodes, node => !node.qualifies);
      if (!this.nodes.length){
        this.flags = "T"; // NO Technology
        return;
      }

      // still here?

      // bot priotizes units by phase, speed, availability, armor, etc.
      if (this.verb === "train"){        
        sorter = this.bot.unitprioritizer();
        sorter(this.nodes);
      }

      // try to allocate slot from top node producer
      if (producers.allocate(this.nodes[0], this.verb)){

        // we have a winner
        this.product    = this.nodes[0];  
        this.executable = true;

      } else {
        // too bad
        this.flags = "A"; // NO allocation
        return;
      }


    },
    assignIdle: function(){

      var hcq, verb = this.verb;

      if (verb === "train"){

        this.query(this.hcq + " INGAME WITH metadata.opname = 'idle'")
          .execute()
          .slice(0, this.remaining - this.processing)
          .forEach( node => {
            this.remaining -= 1; 
            this.events.fire("OrderReady", {
              player: this.context.id,
              id:     node.id,
              data:   {order: this.id, source: this.source}
          });
        });

      }


    },
    assignExisting: function(){

      var verb = this.verb, hcq = (

        // looking for a virtual asset
        verb === "find" ? this.hcq :
        verb === "path" ? this.hcq :

        // looking for a technology
        verb === "research" ? this.hcq :

        // looking for unit not assigned to a group
        verb === "train" ? this.hcq + " INGAME WITH metadata.opname = 'none'" :
        
        // looking for a shared structure
        verb === "build" && this.shared ? this.hcq + " INGAME WITH metadata.opmode = 'shared'" :

        // looking for abandoned structure not assigned to a group
        verb === "build" && !this.shared ? this.hcq + " INGAME WITH metadata.opname = 'none'" :

        // error
          H.throw("assignExisting run into unhandled case: verb: %s, shared: %s", this.verb, this.shared)
      
      );

      if (verb === "path"){
        // assuming order done
        this.remaining = 0; 
        this.events.fire("OrderReady", {
          player: this.context.id,
          id:     NaN,
          data:   {
            order: this.id, 
            source: this.source, 
            resources: new H.LIB.Path(this.context, this.hcq).path
          }
        });

      } else if (verb === "find"){
        // assuming order done
        this.remaining = 0; 
        this.events.fire("OrderReady", {
          player: this.context.id,
          id:     NaN,
          data:   {order: this.id, source: this.source, resources: this.resources.find(this)}
        });


      } else if (verb === "train" || verb === "build"){
        this.query(hcq)
          .execute()
          .slice(0, this.remaining - this.processing)
          .forEach( node => {
            this.remaining -= 1; 
            this.events.fire("OrderReady", {
              player: this.context.id,
              id:     node.id,
              data:   {order: this.id, source: this.source}
          });
        });

      } else {
        this.deb("   ORD: assignExisting: looking for '%s' ????????", this.hcq);
      }

    },

  });

  H.LIB.Orderqueue = function(context){

    H.extend(this, {

      context:  context,

      klass:    "orderqueue",
      parent:   context,
      name:     context.name + ":producers",

      imports:  [
        "economy",
        "groups",
        "villages",
      ],

      tP: 0,            // processing time, msecs

      queue: null,      // stateful

      report: {rem: [], exe: [], ign: []},

    });

  };

  H.LIB.Orderqueue.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Orderqueue,
    log: function(){
      this.deb();
      if (this.queue.length){
        this.queue.forEach( order => {
          order.log();
        });
      } else {
        this.deb("   ORQ: empty");
      }
    },
    logTick: function(){

      var 
        msg  = "", tb = H.tab,
        header = "  id,     verb, age, amt, pro, rem, nodes, tim, no,                 source, hcq|product".split(","),
        tabs   = "   4,       10,   5,   5,   5,   5,     7,   5,  4,                     24, 12".split(",").map(s => ~~s),
        head   = header.map(String.trim).slice(0, -1),
        retr = {
          id:       o => "#" + o.id,
          verb:     o => o.verb,
          age:      o => o.age,
          amt:      o => o.amount,
          rem:      o => o.remaining,
          pro:      o => o.processing,
          nodes:    o => o.nodes ? o.nodes.length : 0,
          no:       o => o.flags || "_",
          tim:      o => o.time !== undefined ? o.time : "_",
          source:   o => o.source, //this.groups.findAsset(o.source).name || "no source :(",
          template: o => "tplXXXXXX",
        };

      this.deb("   ORQ: length: %s, rep: %s", this.queue.length, uneval(this.report));
      if (this.queue.length){
        this.deb("*");
        this.deb("     Q: %s", header);
        this.queue
          .sort((a,b) => a > b ? 1 : -1)
          .forEach(o => {
            msg = "";
            H.zip(head, tabs, (h, t) => {
              msg += tb(retr[h](o), t);
            });
            this.deb("     Q: %s | %s", msg, o.product ? o.product.name :  o.hcq);
          });
        this.deb("*");
      }

    },
    serialize: function(tick, secs){
      return this.queue.map( order => order.serialize());
    },
    deserialize: function(data){
      if(data){
        this.queue = [];
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
    initialize: function(data){
      this.queue = this.queue || [];
      return this;
    },
    delete: function(fn){return H.delete(this.queue, fn);},
    find: function(fn){
      var i, il = this.queue.length;
      for (i=0; i<il; i++){
        if (fn(this.queue[i])){
          return this.queue[i];
        }
      }
      this.deb("   ORQ: have %s, %s", this.queue.length, this.queue.map(o => o.id).join("|"));
      H.throw("WARN  : no order found in queue with: %s", fn);
      return undefined;
    },
    prepare: function(){

      // checks all trains and assigns existing, 
      // even from already ordered, cancels order then
      var 
        queue,
        ingames = this.query("INGAME WITH metadata.opname = 'none'"),
        producers = this.economy.producers.producers,
        producerlist = H.attribs(producers);

      producerlist
        .filter(a => producers[a].type === "building")
        .filter(a => producers[a].queue.length)
        .forEach( nameid => {
          // item: id, unitTemplate, technologyTemplate, count, neededSlots, progress, timeRemaining, metadata
          queue = this.entities[id]._entity.trainingQueue;
          if(queue && queue.length){
            // this.deb("     P: api: len: %s", queue.length);
            queue.forEach( item => {
              if (item.progress === 0){

              }
              // this.deb("     P:   %s, rem: %s, pro: %s, cnt: %s, tpl: %s", 
              //   t(item.id, 3), 
              //   t((item.timeRemaining/1000).toFixed(1), 8), 
              //   t(~~(item.progress * 100), 4), 
              //   t(item.count, 2), 
              //   item.unitTemplate
              // );
            });
          }
      });

    },
    process: function(){

      var 
        t1, t0 = Date.now(), amount, position,
        hasBuild      = false, // only one construction per tick
        allGood       = false, 
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
      eco.producers.resetAllocations();

      // evaluate for product/producer/cost
      queue.forEach(order => {
        t1 = Date.now();
        order.evaluate();
        order.time = Date.now() - t1;
        if (!!order.product){
          amount = order.remaining - order.processing;
          allocs.food  += order.product.costs.food  * amount;
          allocs.wood  += order.product.costs.wood  * amount;
          allocs.stone += order.product.costs.stone * amount;
          allocs.metal += order.product.costs.metal * amount;
        }
      });

      // get first quote whether all orders fit budget
      allGood = eco.fits(allocs, budget);  

      // choose executables, sort and process
      queue
        .filter(order => !!order.product)
        .sort((a, b) => eco.prioVerbs.indexOf(a.verb) < eco.prioVerbs.indexOf(b.verb) ? -1 : 1)
        .forEach( order => {

          var 
            id  = order.id,
            product = order.product;

          // process all or one
          amount = allGood ? order.remaining - order.processing : 1;

          // final global budget check
          if (eco.fits(product.costs, budget, amount)){

            // one build a time
            if (order.verb === "build"){
              if (hasBuild) {
                return;
              } else {
                position = this.villages.findPosForOrder(order);
                if (position){
                  hasBuild = true;
                } else {
                  order.flags += "S";
                  return;
                }
              }
            }

            eco.do(amount, order, position); 

            eco.subtract(product.costs, budget, amount);
            rep.exe.push(id + ":" + amount);

          } else {
            order.flags += "C";
            rep.ign.push(id);

          }

      });

      // remove finished orders
      H.delete(queue, order => {
        if (order.remaining === 0){
          rep.rem.push(order.id);
          return true;
        } else {return false;}
      });

      this.tP = Date.now() - t0;

    }   
  });

  H.LIB.Economy = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "id",
        "config",
        "map",
        "effector",
        "events",
        "player",
        "query",
        "groups",
        "metadata",
        "villages",
        "entities",
      ],
      childs: [
        "stats",
        "producers",
        "orderqueue",
      ],
      
      prioVerbs:    ["research", "train", "build"],
      availability: ["food", "wood", "stone", "metal"],
      allocations:  {food: 0, wood: 0, stone: 0, metal: 0},

    });

  };

  H.LIB.Economy.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Economy,

    log: function(){this.childs.forEach(child => this[child].log());

    }, logTick: function(){

      var 
        stock = this.stats.stock, 
        flows = this.stats.flows,
        t = H.tab, f = n => n > 0 ? "+" + n : n === 0 ? " 0": n;

      // this.deb("   ECO: F%s %s, W%s %s, M%s %s, S%s %s, P%s %s, A%s %s, H%s %s", 
      //   t(stock.food,   6), f(flows.food.toFixed(3)),
      //   t(stock.wood,   6), f(flows.wood.toFixed(3)),
      //   t(stock.metal,  6), f(flows.metal.toFixed(3)),
      //   t(stock.stone,  6), f(flows.stone.toFixed(3)),
      //   t(stock.pops,   4), f(flows.pops.toFixed(3)),
      //   t(stock.area,   4), f(flows.area.toFixed(3)),
      //   t(stock.health, 4), f(flows.health.toFixed(3))
      // );

    }, serialize: function(){
      return {
        stats:      this.stats.serialize(),
        producers:  this.producers.serialize(),
        orderqueue: this.orderqueue.serialize(),
      };

    }, deserialize: function(){
      if (this.context.data[this.name]){
        this.childs.forEach( child => {
          if (this.context.data[this.name][child]){
            // deb("   ECO: child.deserialize: %s", child);
            this[child] = new H.LIB[H.noun(child)](this.context)
              .import()
              .deserialize(this.context.data[this.name][child]);
          }
        });
      }

    }, initialize: function(){
      this.childs.forEach( child => {
        if (!this[child]){
          // deb("   ECO: child.initialize: %s", child);
          this[child] = new H.LIB[H.noun(child)](this.context)
            .import()
            .initialize();
        }
      });
      return this;

    }, finalize: function(){
      this.childs.forEach( child => {
        ( this[child].finalize && this[child].finalize() );
      });

    }, activate: function(){
      
      var 
        order,
        id = this.id,
        events = this.events,
        producers = this.producers,
        orderqueue = this.orderqueue;

      events.on("EntityRenamed", msg => {
        if (this.entities[msg.id2].hasClass("Unit")){
          producers.remove(msg.id);
          producers.register(msg.id2);
        }
      });

      // new technology
      events.on("Advance", msg => {
        if (orderqueue.delete(order => order.hcq === msg.data.technology)){
          producers.unqueue("research", msg.data.technology);
          this.deb("   ECO: onAdvance: removed order with tech: %s", msg.data.technology);
        }        
      });

      // new producer
      events.on("ConstructionFinished", msg => {

        // if (!msg.data.task){
        //   this.deb("INFO  : ECO: got present: structure, not ordered %s", uneval(msg));
        //   this.effector.chat("Thanks.");
        //   return;
        // }

        producers.register(msg.id);

      });

      // new unit
      events.on("TrainingFinished", msg => {

        this.deb("   ECO: TrainingFinished id: %s, meta: %s", msg.id, uneval(this.metadata[msg.id]));

        if (!msg.data.task){
          this.deb("INFO  : ECO: got present: unit, not ordered");
          this.effector.chat("Thanks.");
          return;
        }

        producers.register(msg.id);
        producers.unqueue("train", msg.data.task); 

        // this.deb("   ECO: findOrder: %s, %s", msg.data.order, typeof msg.data.order);
        order = orderqueue.find(order => order.id === msg.data.order);
        order.remaining  -= 1;
        order.processing -= 1;
        
        events.fire("OrderReady", {
          player: id,
          id:     msg.id,
          data:   {order: msg.data.order, source: order.source}
        });

      });

      // new metadata
      events.on("AIMetadata", msg => {

        // this.deb("   ECO: on AIMetadata, msg.data.order: %s", msg.data.order);

        order = orderqueue.find(order => order.id === msg.data.order);
        order.remaining  -= 1;
        order.processing -= 1;

        // this.deb("   ECO: on AIMetadata order: #%s from %s", order.id, this.groups.findAsset(order.source).name);
        
        events.fire("OrderReady", {
          player: id,
          id:     msg.id,
          data:   {order: msg.data.order, source: order.source}
        });

      });

      // remove entity
      events.on("UnitDestroyed", msg => {
        producers.remove(msg.id);
      });
      events.on("StructureDestroyed", msg => {
        if (!msg.data.foundation){
          producers.remove(msg.id);
        }
      });

    }, tick: function(tick, secs){

      var 

      // start clock
        t0 = Date.now(),

      // cash in
        stock = this.stats.stock;

      // check resources
      this.availability.sort((a, b) => stock[a] > stock[b] ? 1 : -1);

      // create value
      // this.orderqueue.prepare();
      this.orderqueue.process();

      // report upstream
      this.orderqueue.logTick();
      this.producers.logTick();
      this.logTick();
      
      // shut down
      return Date.now() - t0;

    }, request: function(order){
      
      // probably useless layer, but eco may reject orders...
      //     entityCounts: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]
      //     entityLimits: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]

      // this.deb("  ECOR: order: %s", uneval(order));

      var  
        objorder,
        // debug
        source = this.groups.findAsset(order.source),  // this is an asset id
        loc = (order.location === undefined) ? "undefined" : H.fixed1(order.location);

      if (order.verb === "build" && order.location.length !== 2){
        H.throw("ERROR : %s order without position, source: %s", order.verb, source);
      }

      objorder = new H.LIB.Order(this.context).import().initialize(order);
      this.orderqueue.queue.push(objorder);

      this.deb("  ECOR: #%s, %s amount: %s, cc: %s, loc: %s, from: %s, shared: %s, hcq: %s",
        objorder.id, 
        objorder.verb, 
        objorder.amount, 
        objorder.cc || "NO CC" , 
        loc, 
        source,  // that's an asset
        objorder.shared, 
        objorder.hcq.slice(0, 40)
      );

    }, do: function(amount, order, position){

      var 
        task, 
        product = order.product,
        id = product.producer.entities[0]; 

      this.deb("   EDO: #%s %s, producer: %s, amount: %s, tpl: %s, pos: %s",
        order.id, 
        order.verb, 
        id, 
        amount,
        product.key, 
        position || [] // for structs, units have pos
      );

      // assuming transaction succedes
      order.processing += amount;

      if (order.verb === "train"){
        task = this.context.idgen++;
        this.producers.queue(product.producer, task);
        this.effector.train([id], product.key, amount, {order: order.id, task: task, cc:order.cc});

      } else if (order.verb === "research") {
        this.producers.queue(product.producer, product.name);
        this.effector.research(id, product.key);

      } else if (order.verb === "build") {
        this.effector.construct([id], product.key, position, {order: order.id, cc:order.cc});
        this.deb("   ECO: do.build: pos: %s, ord: %s, key: %s", uneval(position), uneval([order.x, order.z]), product.key);

      } else if (order.verb === "find") {
        H.throw("ECO: find order leaked into do()");
      } else if (order.verb === "path") {
        H.throw("ECO: path order leaked into do()");

      }

    }, fits: function(cost, budget, amount=1){
      return (
        ((cost.food  || 0) * amount) <= (budget.food  || 0) &&
        ((cost.wood  || 0) * amount) <= (budget.wood  || 0) &&
        ((cost.stone || 0) * amount) <= (budget.stone || 0) &&
        ((cost.metal || 0) * amount) <= (budget.metal || 0)
      );  
    }, diff: function(cost, budget, amount=1){
      return {
        food:   (budget.food   || 0) - (cost.food   || 0 * amount),
        wood:   (budget.wood   || 0) - (cost.wood   || 0 * amount),
        stone:  (budget.stone  || 0) - (cost.stone  || 0 * amount),
        metal:  (budget.metal  || 0) - (cost.metal  || 0 * amount),
        pop  :  (budget.pop    || 0) - (cost.pop    || 0 * amount),
        popcap: (budget.popcap || 0) - (cost.popcap || 0 * amount),
      };
    }, multiply: function(cost, amount=1){
      cost.food  *= amount;
      cost.wood  *= amount;
      cost.metal *= amount;
      cost.stone *= amount;
    }, subtract: function(cost, budget, amount=1){
      budget.food  -= cost.food  > 0 ? (cost.food  * amount) : 0;
      budget.wood  -= cost.wood  > 0 ? (cost.wood  * amount) : 0;
      budget.metal -= cost.metal > 0 ? (cost.metal * amount) : 0;
      budget.stone -= cost.stone > 0 ? (cost.stone * amount) : 0;
    },

  });

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


