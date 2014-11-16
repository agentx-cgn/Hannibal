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
    parameters = {

    // Dimensions
    time:        [1, 7, function(){}],       // elapsed time 

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


  H.LIB.Brain = function(context){

    this.name = "brain";
    this.context = context;
    this.imports = [
      "events",
      "phases",
      "economy",
      "query",
      "villages",
    ];

    H.extend(this, {},
      context.saved.brain
    );

  };

  H.LIB.Brain.prototype = {
    constructor: H.LIB.Brain,
    log: function(){},
    clone: function(context){
      return new H.LIB.Brain(context);
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
    },
    deserialize: function(){
      return {};
    },
    activate: function(){

      this.events.on("Advance", function (msg){

        if ((phase = this.phases.find(msg.data.key))){
          H.Phases.current = phase.abbr;
          deb(" BRAIN: onAdvance: set new phase %s", this.phases.current);
          return;
        }
        deb(" BRAIN: onAdvance: %s", msg.data.technology);

      });


      this.events.on("Attacked", "*", function (msg){
        deb(" BRAIN: Attacked: damage: %s, type: %s", msg.data.damage, msg.data.type);
      });

      this.events.on("BroadCast", function (msg){
        deb(" BRAIN: BroadCast: %s", uneval(msg));
      });

    },
    tick: function(tick, secs){

      var t0 = Date.now();


      return Date.now() - t0;

    },

  };



  H.Brain = {
    id:   null,
    name: "brain",
    scouts: [],
    init: function(){

      deb();deb();deb(" BRAIN: init - phase.%s", H.Player.phase);

      H.Brain.id = H.Objects(this);

      planner = new H.HTN.Planner({
        name:         "brain.planner",
        operators:    H.HTN.Economy.operators,
        methods:      H.HTN.Economy.methods,
      });

    },
    activate: function(){

      var phase;


    },
    tick: function(secs, ticks){

      var 
        t0 = Date.now(),
        cc = H.Villages.Centre.id;

      
      if (ticks === 1){
        // assuming village...
        this.runPlanner("phase.village");
        H.Economy.updateActions("phase.village");
      }

      if (ticks === 2){
        // this.scouts.push(H.Groups.launch("g.scouts", H.Centre.id, 5));
        this.scouts.push(H.Groups.launch({name: "g.scouts", cc: cc, size: 5}));

      }

      return Date.now() - t0;
    },
    planPhase: function(context){ // phase, centre, tick, civ

      var 
        t0 = Date.now(), 
        tickSort = (a, b) => a[0] < b[0] ? -1 : 1,
        // utilizers = ["Villages", "Economy", "Military", "Brain"],
        utilizers = ["Brain"],
        necessities, 
        technologies = [], 
        launches = {"phase.village": [], "phase.town": [], "phase.city": []},
        messages = {"phase.village": [], "phase.town": [], "phase.city": []}
        ;

      deb();deb();
      deb(" BRAIN: planPhase budget    : %s", uneval(context.curstate.data.ress));
      deb(" BRAIN: planPhase resources : %s", uneval(context.resources));

      // collect groups and techs from utilizers
      utilizers.forEach(utilizer => {
        necessities = H[utilizer].getPhaseNecessities(context);
        deb("     B: got %s phases, %s technologies from %s", H.count(necessities.launches), necessities.technologies.length, utilizer);
        H.pushflat(technologies, necessities.technologies);
        H.each(launches, phase => {
          H.pushflat(launches[phase], necessities.launches[phase]);
        });
        H.each(messages, phase => {
          H.pushflat(messages[phase], necessities.messages[phase]);
        });
      });

      // [   4 + tck, [1, "g.scouts",     {cc:cc, size: 5}]],
      H.each(launches, phase => {
        launches[phase].sort(tickSort);
        messages[phase].sort(tickSort);
      });

      context.info = { // phase : [length, mintick, maxtick]
        launches: {
          "phase.village": [
            launches["phase.village"].length,
            launches["phase.village"].length ? launches["phase.village"][0][0] : 0,
            launches["phase.village"].length ? launches["phase.village"].slice(-1)[0][0] : 0,
          ],
          "phase.town": [
            launches["phase.town"].length,
            launches["phase.town"].length ? launches["phase.town"][0][0] : 0,
            launches["phase.town"].length ? launches["phase.town"].slice(-1)[0][0] : 0,
          ],
          "phase.city": [
            launches["phase.city"].length,
            launches["phase.city"].length ? launches["phase.city"][0][0] : 0,
            launches["phase.city"].length ? launches["phase.city"].slice(-1)[0][0] : 0,
          ],
        },
        messages: {
          "phase.village": [
            messages["phase.village"].length,
            messages["phase.village"].length ? messages["phase.village"][0][0] : 0,
            messages["phase.village"].length ? messages["phase.village"].slice(-1)[0][0] : 0,
          ],
          "phase.town": [
            messages["phase.town"].length,
            messages["phase.town"].length ? messages["phase.town"][0][0] : 0,
            messages["phase.town"].length ? messages["phase.town"].slice(-1)[0][0] : 0,
          ],
          "phase.city": [
            messages["phase.city"].length,
            messages["phase.city"].length ? messages["phase.city"][0][0] : 0,
            messages["phase.city"].length ? messages["phase.city"].slice(-1)[0][0] : 0,
          ],
        },
      };

      deb();
      deb("     B: launches/messages ...");
      JSON.stringify(context.info, null, 2).split("\n").forEach(function(line){
        deb("     B: %s", line);
      });

      // H.each(launches, function (phase, launches){
      //   deb("     B: %s %s", phase, launches.length);
      // });
      
      // collect techs from groups
      H.each(launches, function (phase, phaselaunches){
        phaselaunches.forEach(launch => {
          H.pushflat(technologies, H.Groups.getGroupTechnologies(launch));
        });
      });

      context.launches = launches;
      context.messages = messages;
      context.technologies = H.unique(technologies);
      deb("     B: have %s technologies",  context.technologies.length);
      context.technologies.forEach(t => {
        deb("     B:   %s", t);
      });

      H.Simulator.simulate(context);

      deb();
      deb(" BRAIN: planPhase state: %s, %s msecs, gametime: %s", context.curphase, Date.now() - t0, H.Simulator.tick * 1.6);
      JSON.stringify(context.curstate, null, 2).split("\n").forEach(function(line){
        deb("     B: %s", line);
      });


    },
    getPhaseNecessities: function(context){ // phase, centre, tick
      
      var 
        cls = H.class2name,
        cc  = context.centre,

        technologies = [],
        messages = {
          "phase.village": [
            [   3, {name: "BroadCast", data: {group: "g.builder", cc: cc, building: cls("house"), quantity: 4}}]
          ],
          "phase.town": [],
          "phase.city": [],
        },
        launches = {
          "phase.village": [
          //  tck,  amt,  group,         params
            [   2,    1, "g.builder",    {cc:cc, size: 3}],
            // [   4,    1, "g.scouts",     {cc:cc, size: 5}],
          ],
          "phase.town" :   [

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
    runPlanner: function(phase){

      var state, goal, phaseName, phaseCost, housePopu, ress, logops;

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

      var cc = H.Villages.Centre.id;


      if (phase === "phase.village"){

        // TODO: care about Centre

        return [
          [2, "g.harvester", cc, {size: 5}],       // needed for trade?
          [1, "g.builder",   cc, {size: 2, quantity: 2, building: class2name("farmstead")}],    // depends on building time
          [1, "g.builder",   cc, {size: 2, quantity: 2, building: class2name("storehouse")}],   // depends on building time

        ];

        // return [
        //   [2, "g.harvester", cc,                           5],       // needed for trade?
        //   // [1, "g.builder",   cc, class2name("house"),      2, 6],    // onLaunch: function(ccid, building, size, quantity){
        //   [1, "g.builder",   cc, class2name("farmstead"),  4, 2],    // depends on building time
        //   [1, "g.builder",   cc, class2name("storehouse"), 2, 2],    // depends on building time
        //   // [1, "g.builder",   cc, class2name("barracks"),   5, 2],    // depends on civ and # enemies
        //   // [1, "g.builder",   cc, class2name("blacksmith"), 2, 1],    // one is max, check required techs
        //   // [1, "g.supplier",  cc, "metal",                  1],               // 
        //   // [1, "g.supplier",  cc, "stone",                  1],
        //   // [5, "g.supplier",  cc, "wood",                   5],
        //   // [1, "g.supplier",  cc, "food.fruit",             2],       // availability
        //   // [1, "g.supplier",  cc, "food.meat",              2],       // availability
        // ];

      } else if (phase === "phase.town"){


      } else if (phase === "phase.city"){

      }      

      return [];

    },

  };


return H; }(HANNIBAL));     
