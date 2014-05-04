/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, HANNIBAL, H, deb */

/*--------------- P L A N N E R -----------------------------------------------

  runs examples/test from explorer



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  H.HTN = H.HTN || {};
  H.HTN.Hannibal = H.HTN.Hannibal || {};

  // allows to patch deb() to html output in explorer
  var oldDeb = deb,
      clear  = function(){tblResult.innerHTML = "";},
      newDeb = function (){
        var args = arguments,
            html = "";
        if (args.length === 0) {args = ["**"];}
        if (args.length === 1) {
          switch (args[0]){
            case "<trenner>": tblResult.innerHTML += "<tr style='line-height: 5px'><td>&nbsp;</td></tr>"; return; 
          }
          args = ["%s", args[0]];
        }
        html += H.format("<tr><td class='nw'>%s</td></tr>", H.format.apply(H, args));
        tblResult.innerHTML += html;
      };

  // Here are some helper functions that are used in the methods' preconditions.

  // H.HTN.Hannibal.helper = {};

  H.HTN.Hannibal.Example1 = function(verbose){

    var logState = H.HTN.logState,
        plan = H.HTN.Planner.plan,
        state = new H.HTN.State("state"),
        goal  = new H.HTN.State("goal");

    H.HTN.Hannibal.init();
    H.each(H.HTN.Hannibal.operators, H.HTN.addOperator);
    H.each(H.HTN.Hannibal.methods,   H.HTN.addMethods);

    deb = newDeb;
    clear();
    deb(

      "****************************************<br />" +
      "First, test 0 A.D. planner on basic resource operators and start method<br />" + 
      "****************************************"
    );

    deb();
    deb("- Define state: food = 100");
    deb();
    state.ress = {food: 100};

    deb('\n- <b style="color: #383">these operators should succeed:');
    plan(state, [['init', goal], ['inc_resource', 'food', 50]], verbose);
    plan(state, [['init', goal], ['train_units', 'units.athen.support.female.citizen']], verbose);
    plan(state, [['init', goal], ['build_structures', 'structures.athen.farmstead']], verbose);
    plan(state, [['init', goal], ['research_tech', 'armor.ship.hullsheathing']], verbose);
    plan(state, [['init', goal], ['wait_secs', 10]], verbose);
    deb();

    deb('\n- <b style="color: #833">this method should fail (empty task list, init only):</b>');
    plan(state, [['init', goal]], verbose);

    deb('\n- <b style="color: #833">this method should fail (no solution):</b>');
    plan(state, [['init', goal], ['produce', 'structures.athen.barracks']], verbose);
    deb();
  
    deb('\n- done');

  };  

  H.HTN.Hannibal.Example2 = function(verbose){

    var logState = H.HTN.logState,
        plan = H.HTN.Planner.plan,
        state = new H.HTN.State("state"),
        goal  = new H.HTN.State("goal");

    H.HTN.Hannibal.init();
    H.each(H.HTN.Hannibal.operators, H.HTN.addOperator);
    H.each(H.HTN.Hannibal.methods,   H.HTN.addMethods);

    deb = newDeb;
    clear();
    deb(

      "****************************************<br />" +
      "Second, test 0 A.D. planner on resources <br />" + 
      "****************************************"
    );

    deb();
    deb('\n- <b style="color: #383">All tests should succeed:');
    deb();
    deb("- Define state: food: 100");
    deb("- Define goal: food: 200");
    deb();

    state.ress = {food: 100};
    goal.ress  = {food: 200};
    plan(state, [['start', goal]], verbose);

    deb();
    deb("- Define state: food: 100, wood: 0");
    deb("- Define goal: food: 200, wood: 300, stone: 400, metal: 500");
    deb();

    state.ress = {food: 100, wood: 300};
    goal.ress  = {food: 200, wood: 300, stone: 400, metal: 500};
    plan(state, [['start', goal]], verbose);

    deb('\n- done');


  };  

  H.HTN.Hannibal.Example3 = function(verbose){

    var logState = H.HTN.logState,
        plan = H.HTN.Planner.plan,
        state = new H.HTN.State("state", {
          "ress": {"food": 300, "wood": 300},
          "ents": {
            "structures.athen.civil.centre": 1,
            "units.athen.support.female.citizen": 0},
          "tech": ["phase.village"]
        }),
        goal  = new H.HTN.State("goal", {
          "ress": {"food": 300, "wood": 300},
          "ents": {
            "structures.athen.civil.centre": 1,
            "units.athen.support.female.citizen": 1},
          "tech": ["phase.village"]
        });

    H.HTN.Hannibal.init();
    H.each(H.HTN.Hannibal.operators, H.HTN.addOperator);
    H.each(H.HTN.Hannibal.methods,   H.HTN.addMethods);

    deb = newDeb;
    clear();
    deb(

      "****************************************<br />" +
      "Third, test 0 A.D. planner on entities <br />" + 
      "****************************************"
    );

    deb();
    deb('\n- <b style="color: #383">All tests should succeed:');
    deb();
    deb("- Goal: train units.athen.support.female.citizen: 1");
    deb();
    deb(H.HTN.Helper.pritObj(goal));
    deb();
    
    plan(state, [['start', goal]], verbose);


    deb();
    deb("- Goal: construct structures.athen.field: 1");

    state = new H.HTN.State("state", {
      "ress": {"food": 300, "wood": 300},
      "ents": {
        "structures.athen.civil.centre": 1,
        "units.athen.support.female.citizen": 1},
      "tech": ["phase.village"]
    });
    goal  = new H.HTN.State("goal", {
      "ress": {},
      "ents": {"structures.athen.field": 1},
      "tech": []
    });

    deb();
    deb(H.HTN.Helper.pritObj(goal));
    deb();
    
    plan(state, [['start', goal]], verbose);

    deb('\n- done');


  };  
  H.HTN.Hannibal.runStress = function(oState, oGoal, loops){

    var t0, t1, counter = loops +1,
        state = new H.HTN.State("state", oState),
        goal  = new H.HTN.State("goal", oGoal),
        infoQ = H.store.cntQueries,
        infoH = H.store.cacheHit,
        infoM = H.store.cacheMiss,
        tab  = function (s,l){return H.replace(H.tab(s,l), " ", "&nbsp;");};

    H.each(H.HTN.Hannibal.operators, H.HTN.addOperator);
    H.each(H.HTN.Hannibal.methods,   H.HTN.addMethods);

    clear();
    deb = newDeb;
    deb();
    deb("FireFox warns, if scripts run longer than 1 sec!");
    deb();
    deb("running planner * %s, please wait ...", loops);

    function logCache(){
      deb();
      deb("<b>Cache usage:</b>");
      H.each(H.store.cache, function(q, o){
        deb("&nbsp;&nbsp;%s, %s", tab(o.hits, 4), q);
      });
    }

    setTimeout(function(){

      t0 = Date.now();
      while(counter--){
        H.HTN.Planner.plan(state, [['init', goal]], -1);
      }
      t1 = Date.now();

      infoQ = H.store.cntQueries - infoQ;
      infoH = H.store.cacheHit   - infoH;
      infoM = H.store.cacheMiss  - infoM;

      deb();
      deb("<b>Finished:</b>")
      deb('&nbsp;&nbsp;%s msecs, avg: %s, iterations: %s, depth: %s, queries: %s, cacheHit: %s, cacheMiss: %s', 
          t1-t0, ((t1-t0)/loops).toFixed(1), H.HTN.iterations(), H.HTN.depth(), infoQ, infoH, infoM
      );
      logCache();
      deb('\n- done');
      deb = oldDeb;

    }, 300);

    // deb("running planner * %s, please wait ...", loops);

  };
  H.HTN.Hannibal.runExample = function(oState, oGoal, verbose, info){

    var logState = H.HTN.logState,
        state = new H.HTN.State("state", oState),
        goal  = new H.HTN.State("goal", oGoal),
        prit  = H.prettify;

    verbose = verbose || 0;
    info    = info    || "";

    // H.HTN.Hannibal.init();
    H.each(H.HTN.Hannibal.operators, H.HTN.addOperator);
    H.each(H.HTN.Hannibal.methods,   H.HTN.addMethods);

    clear();
    deb = newDeb;

    if (info){
      deb();deb("<b>Planning for Entity: %s</b>", info);
    }
    deb();
    deb("<b>state:</b>");
    deb(H.HTN.Helper.pritObj(state));
    deb("<b>goal:</b>");
    deb(H.HTN.Helper.pritObj(goal));

    H.HTN.Planner.plan(state, [['init', goal]], verbose);

    deb('\n- done');
    deb = oldDeb;

  };




return H; }(HANNIBAL)); 