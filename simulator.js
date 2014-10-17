/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, H, deb, uneval */

/*--------------- S I M U L A T O R  ------------------------------------------

  estimates the outcome of a set of group launches

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  // // planner's state with methods
  // function State(state){
  //   this.state = state;
  // }
  // State.prototype = {
  //   constructor: State,
  //   log:     function(){
  //     JSON.stringify(this.state.data, null, 2).split("\n").forEach(function(line){
  //       deb("     S: %s", line);
  //     });      
  //   },
  //   addTech: function(tech){},
  //   addEnts: function(ents){},
  //   addRess: function(ress){},
  // };

  // simulation = {
  // state:        H.HTN.Economy.getCurState(),
  // phase:        options.phase,
  // budget:       H.Stats.stock,
  // launches:     [],
  // technologies: [],

      // tree, civ, cc
  // }

  H.Simulation = function(context){
    H.extend(this, context, {
      // orders:         [],
      techsAvailable: [],
      techsFeasable:  [],
    });
  };

  H.Simulation.prototype = {
    constructor: H.Simulation,
    verbFromNodes: function (hcq){
      var self = this, verb = "";
      H.QRY(hcq).forEach(node => {
        if (!verb){
          verb = self.tree.nodes[node.name].verb;
        }
      });
      return verb;
    },
    verifyTechnologies: function () {
      var self = this, result, checker = new H.Checker(this);
      // deb("     S: veriTech: %s", this.technologies.length);
      self.techsAvailable = [];
      self.techsFeasable  = [];
      this.technologies.forEach(tech => {
        result = checker.check(tech, false);

        // deb("     S: veriTech: %s %s", tech, uneval(result));

        if (result.available){
          self.techsAvailable.push(tech); 
          // deb("     S: veriTech: available %s", tech);
        } if (result.feasible){
          self.techsFeasable.push(tech); 
          // deb("     S: veriTech: feasible %s", tech);
        } else {
        }
      });
    },
    appendStateOrders: function(tick, techs, groups, orders){

    },
    appendTechOrders: function(techs, orders){

      var self = this;

      // deb();deb("   SIM: create orders from tech...");

      techs.forEach(tech => {

        orders.push(new H.Order({
          amount:     1,
          verb:       "research", 
          cc:         self.centre,
          location:   null,
          hcq:        tech, 
          source:     self.source,
        }));

        // deb("   SIM: order %s", tech);

      });

    },

    appendHouseOrders: function(tick, groups, orders){

      var ress = this.curstate.data.ress;

      // deb("     S: createHouseOrders: pop: %s, max: %s, house: %s", ress.pop, ress.popmax, this.popuHouse);

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
      
      orders.push(new H.Order({
        amount:     amount,
        verb:       "build", 
        cc:         this.centre,
        location:   null,
        hcq:        building, 
        source:     this.source,
      }));

      // deb("     S: appendBuildingOrder %s %s", amount, building);

    },
    appendPhaseOrder: function(orders, phase){

      var 
        order = null, result,
        checker = new H.Checker(this),
        nextphase = (
          this.curphase === "phase.village" ? "phase.town" :
          this.curphase === "phase.town"    ? "phase.city" :
            ""
        );

      // deb("     S: appendPhaseOrder: cp: %s", this.curphase);

      if (nextphase) {

        result = checker.check(nextphase, false);

        // deb("     S: appendPhaseOrder: np: %s, res: %s", nextphase, uneval(result));

        if (result.available){

          orders.push(new H.Order({
            amount:     1,
            verb:       "research", 
            cc:         this.centre,
            location:   null,
            // hcq:        nextphase, 
            hcq:        phase, 
            source:     "phase", // this.source,
          }));

          // deb("     S: appendPhaseOrder %s %s", 1, nextphase);

        }
      }

      return order;

    },
    appendLaunchOrders: function(tick, launches, groups, orders){

      // [   4 + tck, [1, "g.scouts",     {cc:cc, size: 5}]],

      var self = this, hcq, verb, order, exclusives;

      launches.forEach(launch => {

        if (tick === launch[0]){

          groups.push(launch[1][1]);

          if (launch[1][1] === "g.builder"){
            exclusives = {building: exclusives = [launch[1][2].quantity, ["exclusive", launch[1][2].building]]};
          } else {
            exclusives = H.Groups.getGroupExclusives(launch[1]);
          }

          H.each(exclusives, function(name, params){
            hcq    = params[1][1];
            verb   = self.verbFromNodes(hcq);
            order  = {
              amount:     params[0],
              verb:       verb, 
              cc:         launch[1][2].cc,
              location:   null,
              hcq:        params[1][1], 
              source:     launch[1][1], //self.source,
            };

            // deb("   SIM: order @%s %s: %s", launch[0], launch[1][1] ,uneval(order));

            orders.push(new H.Order(order));

          });

        }

      });      

    }


  };

  H.Simulator = (function(){

    var self;

    return {

      name: "simulator",
      context: null,

      log:  function(){},
      boot: function(){return (self = this);},
      init: function(){},
      activate: function(){},
      generate: (function(){var counter = 0; return { get id () {return ++counter;} }; }()),
      
      economy: {
        
        prioVerbs: ["research", "train", "build"],
        phases: ["phase.village", "phase.town", "phase.city"],
        availability: ["food", "wood", "stone", "metal"],
        producers: null,
        orderqueue: null,
        stats: null, 

        do: function (verb, amount, order, node){

          var 
            curstate = self.context.curstate,  
            data = curstate.data;

          deb("   SDO: #%s %s, %s, %s", H.tab(order.id, 3), verb, amount, node.name);
          
          H.Economy.subtract(node.costs, data.ress, amount);
          
          order.remaining  -= amount;
          order.processing -= amount;

          // update curstate
          if (verb === "train"){
            data.ress.pop += amount;
            data.ents[node.name] = !data.ents[node.name] ? 1 : data.ents[node.name] +1;
            H.loop(amount, () => {
              self.economy.producers.register(node.name + "#" + self.generate.id);
            });

          } else if (verb === "build"){
            data.ents[node.name] = !data.ents[node.name] ? 1 : data.ents[node.name] +1;
            if (node.name === self.context.nameHouse){
              data.ress.popcap += self.context.popuHouse;
            }
            H.loop(amount, () => {
              self.economy.producers.register(node.name + "#" + self.generate.id);
            });
          
          } else if (verb === "research"){
            if (node.name.contains("phase") && node.name.contains("town")){
              data.tech.push("phase.town");
              self.context.curphase = "phase.town";
            } else if (node.name.contains("phase") && node.name.contains("city")) {
              data.tech.push("phase.city");
              self.context.curphase = "phase.city";
            } 
            data.tech.push(node.name);

          }

        }
      },
      
      simulate: function(context){  // phase, centre, tick, civ, budget, launches, technologies, tree
 
        deb();deb();
        deb("  SIMU: start %s budget: %s", context.phase, uneval(context.curstate.ress));

        var 
          stock,
          exit = false,
          tick = context.tick,
          tickPhase = context.tick,
          lastPhase = "",
          tickOrders = [], tickGroups = [], 
          ingames = [],
          curstate = context.curstate,
          simulation = new H.Simulation(context),
          launches = context.launches[context.phase],
          townFired = false,
          cityFired = false;

        self.context = context;
        self.economy.stats = {stock: curstate.data.ress};

        H.each(context.state.data.ents, function(name, amount){
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
        simulation.verifyTechnologies();
        simulation.appendTechOrders(simulation.techsAvailable, tickOrders);

        // get orders required by planning
        // simulation.appendStateOrders(tickOrders);
        
        deb();

        while (!exit) {

          // sort availability by stock
          stock = curstate.data.ress;
          self.economy.availability.sort((a, b) => stock[a] > stock[b] ? 1 : -1);


          // add groups and orders
          tickGroups.forEach(g => {
            curstate.groups[g] = !curstate.groups[g] ? 1 : curstate.groups[g] +1;
          });
          tickOrders.forEach(order => {
            order.economy = self.economy;
            self.orderqueue.append(order);
          });

          // debug
          if (self.orderqueue.length){deb();}
          deb(" SIMUL: @%s | %s phase: %s, orders: %s, groups: %s", tick, tickPhase, context.curphase, tickOrders.length, tickGroups.length);

          // now process
          self.orderqueue.process(true);
          tickGroups = [];
          tickOrders = [];

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

          // check launches for group.orders
          simulation.appendLaunchOrders(tickPhase, launches, tickGroups, tickOrders);


          // can advance to next phase, check techs again
          if (tickPhase > context.info.maxTicks[context.curphase] && tick % 5 === 0){

            simulation.verifyTechnologies();
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
          curstate.data.cost.time += 1.6;
          if (tick > 50){exit = true;}

        }

        deb();
        deb(" SIMUL: DONE: %s", uneval(curstate.data.ress));
        deb(" SIMUL: DIFF: %s", uneval(H.Economy.diff(context.state.data.ress, curstate.data.ress)));
        

      },

    };

  }()).boot();

return H; }(HANNIBAL));     
