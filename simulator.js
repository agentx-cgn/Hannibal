/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, H, deb, uneval */

/*--------------- S I M U L A T O R  ------------------------------------------

  estimates the outcome of a set of group launches

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  H.Simulation = function(context){
    H.extend(this, context, {
      techsAvailable: [],
      techsFeasable:  [],
      stackBuildings: [],
      nextBuilding: null,
      sizeBuilder: 0,
    });
    this.checker = new H.Checker(this);
  };

  H.Simulation.prototype = {
    constructor: H.Simulation,
    tick: function(){  
    },
    onBuildingFinished: function(){
      var order = this.stackBuildings.shift();
      deb("   SIM: finished: #%s %s from %s", order.id, order.hcq, order.source);
      if(this.stackBuildings.length){
        this.nextBuilding = this.stackBuildings[1];
      }
    },
    verbFromNodes: function (hcq){
      var self = this, verb = "";
      H.QRY(hcq).forEach(node => {
        if (!verb){
          verb = self.tree.nodes[node.name].verb;
        }
      });
      return verb;
    },
    evaluateTechnologies: function () {
      var result;
      this.techsAvailable = [];
      this.techsFeasable  = [];
      this.technologies
        .filter(tech => !H.contains(this.simulator.researchStarted, tech))
        .filter(tech => !H.contains(this.curstate.data.tech, tech))
        .forEach(tech => {
          result = this.checker.check(tech, false);
          if (result.available){
            this.techsAvailable.push(tech); 
          } if (result.feasible){
            this.techsFeasable.push(tech); 
          }
        });
    },
    appendTechOrders: function(techs, orders){
      techs.forEach(tech => {
        orders.push(new H.Order({
          amount:     1,
          verb:       "research", 
          cc:         this.centre,
          location:   null,
          hcq:        tech, 
          source:     this.source,
        }));
      });
    },
    appendHouseOrders: function(tick, groups, orders){
      var ress = this.curstate.data.ress;
      if (ress.pop > ress.popcap - this.popuHouse -2){
        if (!this.curstate.groups["g.builder"]){
          groups.push("g.builder");
        }
        orders.push(new H.Order({
          amount:     1,
          verb:       "build", 
          cc:         this.centre,
          location:   null,
          hcq:        this.nameHouse, 
          source:     this.source,
        }));
        deb("     S: appendHouseOrders %s %s", 1, this.nameHouse);
      }
    },
    appendBuildingOrder: function(tick, building, amount, orders){

      if (!this.nextBuilding && !this.stackBuildings.length){
        orders.push(new H.Order({
          amount:     1,
          verb:       "build", 
          cc:         this.centre,
          location:   null,
          hcq:        building, 
          source:     "g.builder",
        }));
        amount -= 1;
      }

      H.loop(amount, () => {
        this.stackBuildings.push(new H.Order({
          amount:     1,
          verb:       "build", 
          cc:         this.centre,
          location:   null,
          hcq:        building, 
          source:     "g.builder",
        }));
      });

      if (this.nextBuilding){
        orders.push(this.nextBuilding);
        this.nextBuilding = null;
      }


    },
    appendPhaseOrder: function(orders, phase){
      if (this.checker.check(phase, false).available) {
        orders.push(new H.Order({
          amount:     1,
          verb:       "research", 
          cc:         this.centre,
          location:   null,
          hcq:        phase, 
          source:     "phase.order", 
        }));
      }
    },
    appendLaunchOrders: function(tick, launches, groups, orders){

      // [   4,    1, "g.scouts",     {cc:cc, size: 5}],

      var hcq, verb, order, exclusives, amount, type;

      launches
        .filter(launch => tick === launch[0])
        .forEach(launch => {

          groups.push(launch[2]);

          exclusives = H.Groups.getExclusives(launch);

          // if (launch[1][1] === "g.builder"){
          //   exclusives = {building: exclusives = [launch[1][2].quantity, ["exclusive", launch[1][2].building]]};
          // } else {
          //   exclusives = H.Groups.getExclusives(launch[1]);
          // }

          H.each(exclusives, (name, params) => {
            [amount, [type, hcq]] = params;
            verb   = this.verbFromNodes(hcq);
            order  = {
              amount:     amount,
              verb:       verb, 
              cc:         launch[3].cc,
              location:   null,
              hcq:        hcq, 
              source:     launch[2], //self.source,
            };
            orders.push(new H.Order(order));
          });

        });      

    }

  };

  H.Simulator = (function(){

    var self, tickActions = [];

    return {

      name: "simulator",
      context: null,
      simulation: null,
      tick: 0,
      researchStarted: [],

      log:  function(){},
      boot: function(){return (self = this);},
      generate: (function(){var counter = 0; return { get id () {return ++counter;} }; }()),
      triggers: (function(){
        var i, len, dels = [];
        return {
          add:  function(tick, action){
            action.tick = tick;
            tickActions.push(action);
          },
          tick: function(){
            dels = []; len = tickActions.length; 
            for (i=0; i<len; i++) {
              if(tickActions[i].tick <= self.tick){
                tickActions[i](); 
                dels.push(i);
              }
            }
            dels.forEach(i => tickActions.splice(i, 1));
          }
        };
      }()),

      economy: {
        
        stats: null, 
        producers: null,
        orderqueue: null,
        prioVerbs: ["research", "train", "build"],
        phases: ["phase.village", "phase.town", "phase.city"],
        availability: ["food", "wood", "stone", "metal"],
        allocations: {food: 0, wood: 0, stone: 0, metal: 0, population: 0},

        do: function (verb, amount, order, node){

          var 
            curstate = self.context.curstate,  
            producers = self.economy.producers,
            data = curstate.data,
            time = H.QRY(node.name).first().costs.time;

          deb("   SDO: #%s %s, %s, %s, time: %s", H.tab(order.id, 3), verb, amount, node.name, time);

          H.Economy.subtract(node.costs, data.ress, amount);
          
          // update curstate
          if (verb === "train"){
            self.triggers.add(~~(self.tick + amount * time/1.6), () => {
              // deb("    ST: #%s %s %s", H.tab(order.id, 3), amount, node.name);
              data.ress.pop += amount;
              data.ents[node.name] = !data.ents[node.name] ? 1 : data.ents[node.name] +1;
              H.loop(amount, () => {producers.register(node.name + "#" + self.generate.id);});
              order.remaining  -= amount;
              order.processing -= amount;
            });

          } else if (verb === "build"){
            self.triggers.add(~~(self.tick + amount * time/1.6), () => {
              self.simulation.onBuildingFinished(order);
              data.ents[node.name] = !data.ents[node.name] ? 1 : data.ents[node.name] +1;
              if (node.name === self.context.nameHouse){
                data.ress.popcap += self.context.popuHouse;
              }
              H.loop(amount, () => {producers.register(node.name + "#" + self.generate.id);});
              order.remaining  -= amount;
              order.processing -= amount;
            });
          
          } else if (verb === "research"){
            self.researchStarted.push(node.name);
            self.triggers.add(~~(self.tick + amount * time/1.6), () => {
              data.tech.push(node.name);
              if (node.name.contains("phase") && node.name.contains("town")){
                data.tech.push("phase.town");
                self.context.curphase = "phase.town";
              } else if (node.name.contains("phase") && node.name.contains("city")) {
                data.tech.push("phase.city");
                self.context.curphase = "phase.city";
              } else {
                // deb("     S: not a phase: %s", node.name);
              }
              H.remove(self.researchStarted, node.name);
              order.remaining  -= amount;
              order.processing -= amount;
            });

          }

        }
      },
      
      simulate: function(context){  // phase, centre, tick, civ, budget, launches, technologies, tree
 
        var 
          msg, simulation, 
          exit = false,
          townFired = false,
          cityFired = false,
          lastPhase = "",
          tick = context.tick,
          tickPhase = context.tick,
          tickOrders = [], tickGroups = [], ingames = [],
          curstate = context.curstate,
          stock = curstate.data.ress,
          launches = context.launches[context.phase];

        deb();deb();deb(" SIMUL: start %s budget: %s", context.phase, uneval(stock));

        self.context = context;
        self.economy.stats = {stock: stock};
        simulation = self.simulation = new H.Simulation(H.mixin(context, {simulator: self}));

        // fake ingames for producers
        H.each(context.state.data.ents, (name, amount) => {
          H.loop(amount, () => {
            ingames.push({name: name + "#" + self.generate.id});
          });
        });

        self.economy.producers = new H.Producers ({
          parent: self,
          tree: context.tree,
          ingames: ingames,
          nameCentre: context.nameCentre,
        });

        self.orderqueue = new H.OrderQueue ({
          parent:  self,
          economy: self.economy, 
        });

        // append easy techs
        simulation.evaluateTechnologies();
        simulation.appendTechOrders(simulation.techsAvailable, tickOrders);

        // get orders required by planning
        // simulation.appendStateOrders(tickOrders);
        
        deb();

        while (!exit) {

          // add groups and orders
          H.consume(tickGroups, g => curstate.groups[g] = !curstate.groups[g] ? 1 : curstate.groups[g] +1);
          H.consume(tickOrders, order => {
            order.economy = self.economy;
            self.orderqueue.append(order);
          });

          // debug
          if (self.orderqueue.processing){deb();}
          // msg = " SIMUL: @%s | %s phase: %s, orders: %s, groups: %s, actions: %s, processing: %s";
          // deb(msg, tick, tickPhase, context.curphase, tickOrders.length, tickGroups.length, tickActions.length, self.orderqueue.processing);
          msg = " SIMUL: @%s | %s phase: %s, q-length: %s, q-waiting: %s, tickactions: %s";
          deb(msg, tick, tickPhase, context.curphase, self.orderqueue.length, self.orderqueue.waiting, tickActions.length);


          // sort availability by stock
          self.economy.availability.sort((a, b) => stock[a] > stock[b] ? 1 : -1);

          // now process
          self.orderqueue.process(true, false);

          // collect for next tick

          if (lastPhase !== context.curphase){
            if (context.curphase === "phase.village"){
              simulation.appendBuildingOrder(tickPhase, context.nameHouse, 5, tickOrders);
            }
            if (context.curphase === "phase.town"){
              simulation.appendBuildingOrder(tickPhase, context.nameTower, 4, tickOrders);
            }
            tickPhase = 0;
            lastPhase = context.curphase;
          }

          // needs houses
          // simulation.appendHouseOrders(tickPhase, tickGroups, tickOrders);

          // check buildings
          simulation.appendBuildingOrder(tickPhase, "", 0, tickOrders);

          // check launches for group.orders
          simulation.appendLaunchOrders(tickPhase, launches, tickGroups, tickOrders);

          // can advance to next phase, check techs again
          if (tickPhase > context.info.maxTicks[context.curphase] && tick % 5 === 0){

            simulation.evaluateTechnologies();
            simulation.appendTechOrders(simulation.techsAvailable, tickOrders);

            if (!townFired && context.curphase === "phase.village" && curstate.data.ents[H.class2name("house")] >= 5){
              simulation.appendPhaseOrder(tickOrders, H.Phases["1"].next);
              townFired = true;
            
            } else if (!cityFired && context.curphase === "phase.town" && curstate.data.ents[H.class2name("defensetower")] >= 4){
              simulation.appendPhaseOrder(tickOrders, H.Phases["2"].next);
              cityFired = true;
            }

          }

          // prolog
          tick += 1;
          tickPhase += 1;
          self.tick = tick;
          curstate.data.cost.time += 1.6;
          self.triggers.tick();
          exit = tick > 50 && !tickActions.length;

        }

        deb();
        deb(" SIMUL: DONE: %s", uneval(curstate.data.ress));
        deb(" SIMUL: DIFF: %s", uneval(H.Economy.diff(context.state.data.ress, stock)));
        

      },

    };

  }()).boot();

return H; }(HANNIBAL));     
