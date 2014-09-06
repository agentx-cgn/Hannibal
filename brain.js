/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals TIM, HANNIBAL, H, deb */

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

  var parameters = {

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

  H.Brain = {
    init: function(){
      deb();deb();
      deb(" BRAIN: init");
    },
    tick: function(secs, ticks){
      var t0 = Date.now();
      return Date.now() - t0;
    },
    dump: function(){},
    requestPlan: function(phase){

      var 
        planner, 
        start = H.HTN.Economy.getCurState(),
        goal  = new H.HTN.Helper.State({
          "ress": {
            "food":  500,
            "wood":  500,
            "stone": 200,
            "metal": 200,
            "pop":    30,
          },
          "ents": {},
          "tech": [
            "phase.town",
            "gather.lumbering.ironaxes"
          ]
        }).sanitize();


      goal.data.ents[H.QRY("barracks CONTAIN").first().name]   = 2;
      goal.data.ents[H.QRY("blacksmith CONTAIN").first().name] = 1;

      deb("     B: goal for phase: %s", phase);
      JSON.stringify(goal.data, null, 2).split("\n").forEach(function(line){
        deb("      : %s", line);
      });

      planner = new H.HTN.Planner({
        domain: H.HTN.Economy,
        verbose: 0,
        noInitialize: true
      });

      planner.plan(start, [[H.HTN.Economy.methods.start, goal]]);

      deb();deb();
      planner.operations.forEach(function(op){
        deb("  BRAIN: op: %s", op);
      });      

      return planner;

    }

  };


return H; }(HANNIBAL));     
