/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, H, deb, uneval */

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
    teams:       [2, 4,     function(){}],
    
    population:  [1, 100,   function(){}],   // percentage of pop to popmax

    // Civilisation
    popuHouse:   [1, 10,    function(){}],   // 
    timeHouse:   [1, 100,   function(){}],   // time range from low to high to build a house
    hasMobileDropsites: [0, 1,   function(){}],   // time range from low to high to build a house

  };

  function class2name (klass) {return H.QRY(klass + " CONTAIN").first().name;}

  H.Brain = {
    id:   null,
    name: "brain",
    scouts: [],
    dump: function(){},
    init: function(){

      deb();deb();deb(" BRAIN: init");

      H.Brain.id = H.Objects(this);

      planner = new H.HTN.Planner({
        name:         "brain.planner",
        operators:    H.HTN.Economy.operators,
        methods:      H.HTN.Economy.methods,
      });

    },
    activate: function(){

      var phase;

      H.Events.on("Advance", function (msg){

        if ((phase = H.Phases.find(msg.data.key))){
          H.Phases.current = phase.abbr;
          deb(" BRAIN: onAdvance: set new phase %s", H.Phases.current);
          return;
        }
        deb(" BRAIN: onAdvance: %s", msg.data.technology);

      });

      H.Events.on("Attack", "*", function (msg){
        deb(" BRAIN: Attack: damage: %s, type: %s", msg.data.damage, msg.data.type);
      });

    },
    tick: function(secs, ticks){

      var 
        t0 = Date.now(),
        CC = H.Villages.Centre.id;

      
      if (ticks === 1){
        // assuming village...
        this.runPlanner("phase.village");
        H.Economy.updateActions("phase.village");
      }

      if (ticks === 2){
        // this.scouts.push(H.Groups.launch("g.scouts", H.Centre.id, 5));
        this.scouts.push(H.Groups.launch("g.scouts", CC, 5));

      }

      return Date.now() - t0;
    },
    runPlanner: function(phase){

      var state, goal, phaseName, phaseCost, houseName, housePopu, ress, logops;

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
            // "gather.farming.plows",
            // "gather_capacity_wheelbarrow"
          ]
        }).sanitize();

        // add buildings
        [

          ["barracks",  2],
          ["farmstead", 2],
          ["house",     Math.ceil(ress.pop / housePopu)],

        ].forEach(line => goal.data.ents[class2name(line[0])] = line[1]);


      } else if (phase === "phase.town"){


      } else if (phase === "phase.city"){

      }



      planner.plan(state, [[H.HTN.Economy.methods.start, goal]]);

      logops = {
        // "start": null,
        "build_structures": null,
        "research_tech": null,
        "train_units": null,
        // "finish": null,
      };

      // debug
      deb(" BRAIN: current state: %s", phase);
      JSON.stringify(state.data, null, 2).split("\n").forEach(function(line){
        deb("     B: %s", line);
      });

      deb();deb(" BRAIN: plan in phase: %s", phase);
      JSON.stringify(planner.result, null, 2).split("\n").forEach(function(line){
        deb("     B: %s", line);
      });

      deb();deb("     B: operations:");
      planner.operations.forEach(function(op){
        if (op[1] in logops){
          deb("     B: - %s", op.filter(o => o !== undefined).join(", "));
        }
      });      
      deb("     B: cost: ", uneval(planner.result.data.cost));


    },
    requestPlanner: function(){ return planner;},
    // requestGoals: function(){

    //   return (
    //     planner.operations
    //       .filter(op => op[1] === "build_structures" || op[1] === "research_tech" || op[1] === "inc_resource")
    //       .map(op => [op[1], op[2], op[3] === undefined || 1])
    //       .sort((a, b) => a[0] > b[0])
    //   );

    // },
    requestGroups: function(phase){

      // farmstead bartermarket blacksmith corral dock outpost storehouse temple

      // [quantity, groupname, ccid, [param1, [...] ] ]

      var CC = H.Villages.Centre.id;


      if (phase === "phase.village"){

        // TODO: care about Centre

        return [
          [2, "g.harvester", CC,                           5],       // needed for trade?
          // [1, "g.builder",   CC, class2name("house"),      2, 6],    // onLaunch: function(ccid, building, size, quantity){
          [1, "g.builder",   CC, class2name("farmstead"),  4, 2],    // depends on building time
          [1, "g.builder",   CC, class2name("storehouse"), 2, 2],    // depends on building time
          // [1, "g.builder",   CC, class2name("barracks"),   5, 2],    // depends on civ and # enemies
          // [1, "g.builder",   CC, class2name("blacksmith"), 2, 1],    // one is max, check required techs
          // [1, "g.supplier",  CC, "metal",                  1],               // 
          // [1, "g.supplier",  CC, "stone",                  1],
          // [5, "g.supplier",  CC, "wood",                   5],
          // [1, "g.supplier",  CC, "food.fruit",             2],       // availability
          // [1, "g.supplier",  CC, "food.meat",              2],       // availability
        ];

      } else if (phase === "phase.town"){


      } else if (phase === "phase.city"){

      }      

      return [];

    },

  };


return H; }(HANNIBAL));     
