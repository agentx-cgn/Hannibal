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
      orders: []
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
      var 
        self = this, result, isGood, outTechs = [],
        checker = new H.Checker(this);
      this.technologies = this.technologies.filter(tech => {
        result = checker.check(tech, false);
        isGood = result.done || result.available || result.feasible;
        if (!isGood){outTechs.push(tech)}
        deb(" CHECK: %s %s, ", isGood ? "X" : "-", tech, uneval(result));
        return isGood;
      });
      return outTechs;
    },
    createOrders: function(){

      var self = this;

      deb();deb("     B: create orders...");

      this.technologies.forEach(tech => {

        self.orders.push(new H.Order({
          amount:     1,
          verb:       "research", 
          cc:         self.centre,
          location:   null,
          hcq:        tech, 
          source:     self.source,
        }));

          deb("   SIM: order %s", tech);

      });

      this.launches.forEach(launch => {

        // deb(uneval(launch));

        var exclusives = H.Groups.getGroupExclusives(launch[1]);

        H.each(exclusives, function(name, params){

          var
            amount = params[0],
            hcq    = params[1][1],
            verb   = self.verbFromNodes(hcq),
            order  = {
              amount:     amount,
              verb:       verb, 
              cc:         launch[1][2].cc,
              location:   null,
              hcq:        hcq, 
              source:     self.source,
            };

          deb("   SIM: order @%s %s: %s", launch[0], launch[1][1] ,uneval(order));

          self.orders.push(new H.Order(order));

        });

      });      

    }

  };

  H.Simulator = (function(){

    var self;

    return {

      name: "simulator",
      
      log:  function(){},
      boot: function(){return (self = this);},
      init: function(){},
      activate: function(){},
      
      economy: {
        prioVerbs: ["research", "train", "build"],
        producers: null,
        orderqueue: null,
        stats: null, 
        do: function(verb, amount, producer, template, order, cost){
          deb("     S: #%s %s, %s, %s", order.id, verb, amount, H.saniTemplateName(template));
          H.Economy.subtract(cost, self.economy.stats.stock, amount);
          order.remaining -= amount;
        },
      },
      
      simulate: function(context){  // phase, centre, tick, civ, budget, launches, technologies, tree
 
        deb();deb();deb("  SIMU: start budget: %s", uneval(context.budget));
        deb();deb();deb("  SIMU: start attribs: %s", H.attribs(context));

        var 
          techToPlan, cb = context.budget,
          simulation = new H.Simulation(context);

        self.startBudget = H.deepcopy(context.budget);
        self.economy.stats = {stock: {food: cb.food, wood: cb.wood, stone: cb.stone, metal: cb.metal}};

        self.economy.producers = new H.Producers (
          H.mixin(context, {
            parent:  self,
          })
        );

        self.orderqueue = new H.OrderQueue (
          H.mixin(context, {
            parent:  self,
            economy: self.economy, 
          })
        );

        techToPlan = simulation.verifyTechnologies();
        simulation.createOrders();


        simulation.orders.forEach(order => {
          order.economy = self.economy;
          self.orderqueue.append(order);
        });


        // while (orderqueue.length){

          deb();deb("  SIMU: process 1 stock: %s", uneval(self.economy.stats.stock));
          self.orderqueue.process(true);

          deb();deb("  SIMU: process 2 stock: %s", uneval(self.economy.stats.stock));
          self.orderqueue.process(true);

          deb();deb("  SIMU: process 3 stock: %s", uneval(self.economy.stats.stock));
          self.orderqueue.process(true);

          deb();deb("  SIMU: process 4 stock: %s", uneval(self.economy.stats.stock));
          self.orderqueue.process(true);

        // }


      },

    };

  }()).boot();

return H; }(HANNIBAL));     
