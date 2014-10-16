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
      deb("     S: veriTech: %s", this.technologies.length);
      self.techsAvailable = [];
      self.techsFeasable  = [];
      this.technologies.forEach(tech => {
        result = checker.check(tech, false);
        if (result.available){self.techsAvailable.push(tech); deb("     S: veriTech: available %s", tech);}
        if (result.feasible){self.techsFeasable.push(tech); deb("     S: veriTech: feasible %s", tech);}
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

      deb("     S: appendBuildingOrder %s %s", amount, building);

    },
    appendPhaseOrder: function(orders){

      var 
        order = null,
        checker = new H.Checker(this),
        nextPhase = (
          this.curstate.phase === "phase.village" ? "phase.town" :
          this.curstate.phase === "phase.town"    ? "phase.city" :
            ""
        );

      if (nextPhase && checker.check(nextPhase, false).available){

        orders.push(new H.Order({
          amount:     1,
          verb:       "research", 
          cc:         this.centre,
          location:   null,
          hcq:        nextPhase, 
          source:     this.source,
        }));

        deb("     S: appendPhaseOrder %s %s", 1, nextPhase);

      }

      return order;

    },
    appendLaunchOrders: function(tick, launches, groups, orders){

      // [   4 + tck, [1, "g.scouts",     {cc:cc, size: 5}]],

      var self = this, hcq, verb, order, exclusives;

      launches.forEach(launch => {

        if (tick === launch[0]){

          groups.push(launch[1][1]);
          exclusives = H.Groups.getGroupExclusives(launch[1]);

          H.each(exclusives, function(name, params){
            hcq    = params[1][1];
            verb   = self.verbFromNodes(hcq);
            order  = {
              amount:     params[0],
              verb:       verb, 
              cc:         launch[1][2].cc,
              location:   null,
              hcq:        params[1][1], 
              source:     self.source,
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

      
      economy: {
        
        prioVerbs: ["research", "train", "build"],
        phases: ["phase.village", "phase.town", "phase.city"],
        producers: null,
        orderqueue: null,
        stats: null, 

        do: function (verb, amount, order, node){

          var 
            curstate = self.context.curstate,  
            data = curstate.data;

          deb("   SDO: #%s %s, %s, %s", order.id, verb, amount, node.name);
          
          // H.Economy.subtract(node.costs, self.economy.stats.stock, amount);
          H.Economy.subtract(node.costs, data.ress, amount);
          
          order.remaining -= amount;

          // update curstate
          if (verb === "train"){
            data.ress.pop += amount;
            data.ents[node.name] = !data.ents[node.name] ? 1 : data.ents[node.name] +1;

          } else if (verb === "build"){
            data.ents[node.name] = !data.ents[node.name] ? 1 : data.ents[node.name] +1;
            if (node.name === self.context.nameHouse){
              data.ress.popcap += self.context.popuHouse;
            }
          
          } else if (verb === "research"){
            data.tech.push(node.name);
            if (H.contains(self.phases, node.name)){
              curstate.curphase = node.name;
            }
          }


          // deb("   SDO: data %s", uneval(data));

        }
      },
      
      simulate: function(context){  // phase, centre, tick, civ, budget, launches, technologies, tree
 
        deb();deb();
        deb("  SIMU: start %s budget: %s", context.phase, uneval(context.budget));
        deb("  SIMU: attribs: %s", H.attribs(context));

        var 
          exit = false,
          tickPhase = 0,
          lastPhase = "",
          tick = context.tick,
          tickOrders = [], tickGroups = [], 
          curstate = context.curstate,
          simulation = new H.Simulation(context),
          launches = context.launches[context.phase];

        self.context = context;
        self.economy.stats = {stock: curstate.data.ress};

        self.economy.producers = new H.Producers ({
          parent: self,
          tree: context.tree,
          ingames: context.ingames,
        });

        self.orderqueue = new H.OrderQueue ({
          parent:  self,
          economy: self.economy, 
        });

        // append easy techs
        simulation.verifyTechnologies();
        simulation.appendTechOrders(simulation.techsAvailable, tickOrders);

        // get orders required by planning
        simulation.appendStateOrders(tickOrders);
        
        while (!exit) {

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

          if (lastPhase !== context.phase){
            if (context.phase === "phase.village"){
              simulation.appendBuildingOrder(tickPhase, context.nameHouse, 5, tickOrders);
            }
            if (context.phase === "phase.town"){
              simulation.appendBuildingOrder(tickPhase, context.nameTower, 4, tickOrders);
            }
            tickPhase = 0;
            lastPhase = context.phase;
          }

          // can advance to next phase, check techs again
          if (tick % 5 === 0) {
            simulation.appendPhaseOrder(tickOrders);
            simulation.verifyTechnologies();
            simulation.appendTechOrders(simulation.techsAvailable, tickOrders);
          }

          // needs houses
          simulation.appendHouseOrders(tickPhase, tickGroups, tickOrders);

          // check launches for group.orders
          simulation.appendLaunchOrders(tickPhase, launches, tickGroups, tickOrders);


          // prolog
          tick += 1;
          tickPhase += 1;
          curstate.data.cost.time += 1.6;
          if (tick > 10){exit = true;}

        }

        deb();
        deb(" SIMUL: DONE: curstate %s", uneval(curstate.data.ress));
        

      },

    };

  }()).boot();

return H; }(HANNIBAL));     
