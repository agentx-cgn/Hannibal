/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, H, deb */

/*--------------- B R A I N ---------------------------------------------------

  all high level decisions are made here,
  sets up basic parameters at start, adjusts them by analyzing opponent(s)



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


/*
  map size
  Resource availability trees, metal
  water land map
  culture
  researched technologies
  attack/defense strategies
  defense status
  diplomacy

*/

HANNIBAL = (function(H){

  var 
    planner,
    parameters = {

    // Dimensions
    time:        [1, 7, function(){}],     // elapsed time 

    // Static Map
    mapsize:     [128, 512, function(){}],   // physical map size
    circular:    [128, 512, function(){}],   // physical map size

    // Dynamic Map
    terrain:     [0, 100,   function(){}],   // percentage of water in known land
    mountainous: [0, 100,   function(){}],   // percentage of too steep area in known land

    // Dynamic Resources 
    trees:       [1, 100,   function(){}],   // percentage of cells with trees in known land
    fruits:      [1, 100,   function(){}],   // percentage of cells with trees in known land
    stone:       [1, 100,   function(){}],   // percentage of cells with trees in known land
    metal:       [1, 100,   function(){}],   // percentage of cells with trees in known land

    // Diplomacy
    players:     [2, 8,     function(){}],
    enemies:     [1, 7,     function(){}],
    allies:      [1, 7,     function(){}],
    
    population:  [1, 100,   function(){}],   // percentage of pop to popmax

    // Civilisation
    timeHouse:   [1, 100,   function(){}],   // time range from low to high to build a house
    hasMobileDropsites: [0, 1,   function(){}],   // time range from low to high to build a house

  };

  function class2name (klass) {return H.QRY(klass + " CONTAIN").first().name;}

  H.Brain = {
    dump: function(){},
    init: function(){
      deb();deb();deb(" BRAIN: init");
      planner = new H.HTN.Planner({
        name:         "brain.planner",
        domain:       H.HTN.Economy,
        operators:    H.HTN.Economy.operators,
        methods:      H.HTN.Economy.methods,
        noInitialize: true
      });
      this.runPlanner("phase.village");
    },
    tick: function(secs, ticks){
      var t0 = Date.now();
      return Date.now() - t0;
    },
    runPlanner: function(phase){

      var state, goal, phaseName, phaseCost, houseName, housePopu, ress;

      if (phase === "phase.village"){

        phaseName = H.QRY("civilcentre CONTAIN RESEARCH").filter(n => n.name.contains("town"))[0].name;
        phaseCost = H.Technologies[phaseName].cost;
        housePopu = H.QRY(class2name("house")).first().costs.population * -1;

        ress = {
          "food":  phaseCost.food  + 100,
          "wood":  phaseCost.metal + 100,
          "stone": phaseCost.stone + 100,
          "metal": phaseCost.metal + 100,
          "pop":   50,
        };

        state = H.HTN.Economy.getCurState();
        goal  = new H.HTN.Helper.State({
          "ress": {},
          "ents": {},
          "tech": [
            phaseName,
            "gather.lumbering.ironaxes",
            // "gather_capacity_wheelbarrow"
          ]
        }).sanitize();

        goal.data.ress = ress;
        goal.data.ents[class2name("barracks")]   = 2;
        goal.data.ents[class2name("house")]      = Math.ceil(ress.pop / housePopu);
        // goal.data.ents[class2name("blacksmith")] = 1;

        // deb("     B: goal for phase: %s", phase);
        // JSON.stringify(goal.data, null, 2).split("\n").forEach(function(line){
        //   deb("      : %s", line);
        // });


      } else if (phase === "phase.town"){


      } else if (phase === "phase.city"){

      }



      planner.plan(state, [[H.HTN.Economy.methods.start, goal]]);

      // debug
      deb();deb();deb(" BRAIN: result of planning phase: %s", phase)
      JSON.stringify(planner.result, null, 2).split("\n").forEach(function(line){
        deb("     B: %s", line);
      });
      deb();deb("     B: operations:");
      planner.operations.forEach(function(op){
        deb("     B: - %s", op);
      });      


    },
    requestPlanner: function(){ return planner;},
    requestGoals: function(){

      return (
        H.Planner.operations
          .filter(op => op[1] === "build_structures" || op[1] === "research_tech" || op[1] === "inc_resource")
          .map(op => [op[1], op[2], op[3] === undefined || 1])
          .sort((a, b) => a[0] > b[0])
      );

    },
    requestGroups: function(phase){

      // [quantity, groupname, ccid, [param1, [...] ] ]

      if (phase === "phase.village"){

        // TODO: care about Centre

        return [
          [1, "g.scouts",    H.Centre.id,                           1],       // depends on map size
          [1, "g.harvester", H.Centre.id,                           5],       // needed for trade?
          [1, "g.builder",   H.Centre.id, class2name("house"),      2, 2],    // depends on building time
          // [1, "g.builder",   H.Centre.id, class2name("barracks"),   2, 1],    // depends on civ and # enemies
          // [1, "g.builder",   H.Centre.id, class2name("blacksmith"), 2, 1],    // one is max, check required techs
          [1, "g.supplier",  H.Centre.id, "metal",       1],               // 
          [1, "g.supplier",  H.Centre.id, "stone",       1],
          [1, "g.supplier",  H.Centre.id, "wood",                   6],
          [1, "g.supplier",  H.Centre.id, "food.fruit",             2],       // availability
          [1, "g.supplier",  H.Centre.id, "food.meat",              2],       // availability
        ];

      } else if (phase === "phase.town"){


      } else if (phase === "phase.city"){

      }      

      return [];

    },

  };


return H; }(HANNIBAL));     
