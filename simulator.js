/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, H, deb, uneval */

/*--------------- S I M U L A T O R  ------------------------------------------

  estimates the outcome of a set of group launches

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  // planner's state with methods
  function State(state){
    this.state = state;
  }
  State.prototype = {
    constructor: State,
    log:     function(){
      JSON.stringify(this.state.data, null, 2).split("\n").forEach(function(line){
        deb("     S: %s", line);
      });      
    },
    addTech: function(tech){},
    addEnts: function(ents){},
    addRess: function(ress){},
  };

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
      orders: [],
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
    createTechOrders: function(tick, techs){

      var self = this, orders = [];

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

      return orders;

    },

    createLaunchOrders: function(tick, launches){

      // [   4 + tck, [1, "g.scouts",     {cc:cc, size: 5}]],

      var self = this, hcq, verb, order, exclusives, orders = [], groups = [];

      launches.forEach(launch => {

        // deb(uneval(launch));

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

      return [groups, orders];

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
        producers: null,
        orderqueue: null,
        stats: null, 
        do: function(verb, amount, order, node){

          var state = self.context.curstate.data;

          deb("   SDO: #%s %s, %s, %s", order.id, verb, amount, node.name);
          
          H.Economy.subtract(node.costs, self.economy.stats.stock, amount);
          
          order.remaining -= amount;
          
          if (verb === "train"){
            state.ress.pop += amount;
            state.ents[node.name] = !state.ents[node.name] ? 1 : state.ents[node.name] +1;
          } else if (verb === "build"){
            state.ents[node.name] = !state.ents[node.name] ? 1 : state.ents[node.name] +1;
          } else if (verb === "research"){
            state.tech.push(node.name);
          }

          // deb("   SDO: state %s", uneval(state));

        }
      },
      
      simulate: function(context){  // phase, centre, tick, civ, budget, launches, technologies, tree
 
        deb();deb();
        deb("  SIMU: start %s budget: %s", context.phase, uneval(context.budget));
        deb("  SIMU: attribs: %s", H.attribs(context));

        var 
          exit = false,
          groups, orders, launches,
          state = context.curstate,
          tick = context.tick,
          simulation = new H.Simulation(context);

        self.context = context;
        self.economy.stats = {stock: state.data.ress};

        self.economy.producers = new H.Producers (
          H.mixin(context, {
            parent: self,
          })
        );

        self.orderqueue = new H.OrderQueue (
          H.mixin(context, {
            parent:  self,
            economy: self.economy, 
          })
        );

        simulation.verifyTechnologies();
        orders = simulation.createTechOrders(tick, simulation.techsAvailable);
        orders.forEach(order => {
          order.economy = self.economy;
          self.orderqueue.append(order);
        });

        launches = context.launches[context.phase];
        launches = launches.sort((a, b) => a[0] < b[0] ? -1 : 1);

        while (!exit) {

          [groups, orders] = simulation.createLaunchOrders(tick, launches);

          groups.forEach(g => state.groups[g] = !state.groups[g] ? 1 : state.groups[g] +1);

          deb();
          deb(" SIMUL: @%s orders: %s, stock: %s", tick, orders.length, uneval(state.data.ress));

          orders.forEach(order => {
            order.economy = self.economy;
            self.orderqueue.append(order);
          });

          self.orderqueue.process(true);

          tick += 1;
          state.data.cost.time += 1.6;

          if (tick > 5){exit = true;}

        }

        deb(" SIMUL: DONE: state %s", uneval(state.data.ress));
        

      },

    };

  }()).boot();

return H; }(HANNIBAL));     
