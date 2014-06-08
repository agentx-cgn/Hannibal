/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, HANNIBAL, H, deb */

/*--------------- P L A N N E R -----------------------------------------------

  runs examples/test from explorer



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  H.HTN = H.HTN || {};
  H.HTN.Economy = H.HTN.Economy || {};

  var tab  = "&nbsp;&nbsp;&nbsp;&nbsp;",
      prit = H.prettify,
      fmt  = function fmt(){
        var c=0, a=Array.prototype.slice.call(arguments);
        a.push("");
        return a[0].split("%s").map(function(t){
          return t + a.slice(1)[c++];
        }).join('');
      },
      debLine = function(){
        var html, args = arguments;
        if (args.length === 0) {args = ["**"];}
        if (args.length === 1) {args = ["%s", args[0]];}
        html = fmt("<tr><td>%s</td></tr>", fmt.apply(null, args));
        H.Browser.results.append('tblResult', html);
      },
      debBlock = function(html){
        H.Browser.results.append('tblResult', html);
      },
      logObj = function(o){
        H.each(o, function(attr, valu){
          debLine(fmt(tab + "%s: %s", attr, prit(valu)));
        });
      },
      logTasks = function(ops){
        ops.forEach(function(op){
          var cmd = "<strong style='color: #333'>" + op[0] + "</strong>",
              ps = op.slice(1).join(", ");
          debLine(tab + cmd + "   ( "  + ps + " )"); 
          if (op[0] === 'wait_secs'){debLine(tab);}
          // debLine(tab + prit(op));
        });
      };       

  var m, o, pritObj , 
      copy = obj => JSON.parse(JSON.stringify(obj)),
      initialize = function(){
        o         = H.HTN.Economy.operators;
        m         = H.HTN.Economy.methods;
        pritObj   = H.HTN.Helper.pritObj;
      };

  H.HTN.Economy.test1 = function(verbose){

    var planner, state = {}, goal = {}, 
        solution, deb, 
        log = function(){
          planner.logstack.forEach(function(o){
            debLine(o.m);
          });
        },
        logTasks = function(ops){
          ops.forEach(function(op){
            debLine(tab + prit(op));
          })
        };        

    verbose = $(verbose) ? ~~$(verbose).value : ~~verbose  || 0;

    initialize();

    deb = debLine;
    H.Browser.results.clear('tblResult');

    deb(
      "******************************************************************************<br />" +
      "First, test 0 A.D. planner on basic resource operators and init, start methods<br />" + 
      "******************************************************************************"
    );

    planner = new H.HTN.Planner({
      domain: H.HTN.Economy,
      verbose: verbose
    });

    deb();
    deb("- Define state: food = 100, empty goal");
    deb();
    state = {ress: {food: 100}};
    logObj(state);    

    deb();
    deb('- <b style="color: #373">these should succeed (athen) :</b>');
    deb();

    planner.plan(state, [[m.init, goal], [o.inc_resource, 'food', 50]]);
    log();
    logTasks(planner.operations);
    deb();

    planner.plan(state, [[m.init, goal], [o.train_units, 'units.athen.support.female.citizen', 1]]);
    log();
    logTasks(planner.operations);
    deb();

    planner.plan(state, [[m.init, goal], [o.build_structures, 'structures.athen.farmstead', 1]]);
    log();
    logTasks(planner.operations);
    deb();

    planner.plan(state, [[m.init, goal], [o.research_tech, 'armor.ship.hullsheathing', 1]]);
    log();
    logTasks(planner.operations);
    deb();

    planner.plan(state, [[m.init, goal], [o.wait_secs, 10]]);
    log();
    logTasks(planner.operations);
    deb();

    deb();
    deb('\n- <b style="color: #833">this methods should fail (no solution):</b>');
    deb();

    planner.plan(state, [[m.init, goal]]);
    log();
    logTasks(planner.operations);
    deb();

    planner.plan(state, [[m.init, goal], [m.produce, 'structures.athen.barracks', 1]]);
    log();
    logTasks(planner.operations);
    deb();

    deb();
    deb('\n- done');

  };  

  H.HTN.Economy.test2 = function(verbose){

    var planner, state = {}, goal = {}, 
        solution, deb, 
        log = function(){
          planner.logstack.forEach(function(o){
            debLine(o.m);
          });
        },
        logTasks = function(ops){
          ops.forEach(function(op){
            debLine(tab + prit(op));
          })
        };        

    verbose = $(verbose) ? ~~$(verbose).value : ~~verbose  || 0;

    initialize();

    deb = debLine;
    H.Browser.results.clear('tblResult');

    deb(
      "**************************************** <br />" +
      "Second, test 0 A.D. planner on resources <br />" + 
      "****************************************"
    );

    planner = new H.HTN.Planner({
      domain: H.HTN.Economy,
      verbose: verbose
    });

    deb();
    deb();
    deb('- <b style="color: #383">All tests should succeed:</b>');
    deb();
    deb("- Define state: food: 100");
    deb("- Define goal: food: 200");
    deb();

    state.ress = {food: 100};
    goal.ress  = {food: 200};

    planner.plan(state, [[m.init, goal]]);
    log();
    logTasks(planner.operations);
    deb();
    
    deb();
    deb("- Define state: food: 100, wood: 0");
    deb("- Define goal: food: 200, wood: 300, stone: 400, metal: 500");
    deb();

    state.ress = {food: 100, wood: 300};
    goal.ress  = {food: 200, wood: 300, stone: 400, metal: 500};

    planner.plan(state, [[m.init, goal]]);
    log();
    logTasks(planner.operations);
    deb();

    deb();
    deb('\n- done');


  };  

  H.HTN.Economy.test3 = function(verbose){

    var planner, state = {}, goal = {}, 
        solution, deb, 
        log = function(){
          planner.logstack.forEach(function(o){
            debLine(o.m);
          });
        },
        logTasks = function(ops){
          ops.forEach(function(op){
            debLine(tab + prit(op));
          })
        };        

    verbose = $(verbose) ? ~~$(verbose).value : ~~verbose  || 0;

    initialize();

    deb = debLine;
    H.Browser.results.clear('tblResult');

    deb(
      "****************************************<br />" +
      "Third, test 0 A.D. planner on entities <br />" + 
      "****************************************"
    );

    planner = new H.HTN.Planner({
      domain: H.HTN.Economy,
      verbose: verbose
    });

    state = {
      "ress": {"food": 300, "wood": 300},
      "ents": {
        "structures.athen.civil.centre": 1,
        "units.athen.support.female.citizen": 0},
      "tech": ["phase.village"]
    };
    goal  = {
      "ress": {"food": 300, "wood": 300},
      "ents": {
        "structures.athen.civil.centre": 1,
        "units.athen.support.female.citizen": 1},
      "tech": ["phase.village"]
    };

    deb();
    deb("State:");
    logObj(state);  
    deb();
    deb("Goal:");
    logObj(goal);  


    deb();
    deb('\n- <b style="color: #383">All tests should succeed:');
    deb();
    deb("- Goal: train units.athen.support.female.citizen: 1");
    deb();
    
    planner.plan(state, [[m.init, goal]]);
    log();
    logTasks(planner.operations);
    deb();

    deb();
    deb("- Goal: construct structures.athen.field: 1");
    deb();

    state = {
      "ress": {"food": 300, "wood": 300},
      "ents": {
        "structures.athen.civil.centre": 1,
        "units.athen.support.female.citizen": 1},
      "tech": ["phase.village"]
    };
    goal = {
      "ress": {},
      "ents": {"structures.athen.field": 1},
      "tech": []
    };

    planner.plan(state, [[m.init, goal]]);
    log();
    logTasks(planner.operations);
    deb();
    
    deb();
    deb('\n- done');


  };  
  H.HTN.Economy.runCiv = function(cciv){

    var t0, t1, counter, deb = debLine, 
        civ   = $(cciv).value,
        infoQ = H.store.cntQueries,
        infoH = H.store.cacheHit,
        infoM = H.store.cacheMiss,
        prit  = H.prettify,
        tab   = function (s,l){return H.replace(H.tab(s,l), " ", "&nbsp;");},
        zero  = function () {return {ress: {}, ents: {}, tech: []};},
        config = {
          techs: {qry: "REQUIRE DISTINCT", com: "", counter: 0},
          bldgs: {qry: "BUILD DISTINCT",   com: "", counter: 0},
          units: {qry: "TRAIN DISTINCT",   com: "", counter: 0}
        },
        solutions = [], nodes, patState = "", patGoal = "", info;

    deb("running planner on all entities of %s, preparing ...", civ);

    initialize();
    H.Browser.results.clear('tblResult');    

    H.each(config, function(name, props){
      H.QRY(props.qry).forEach(function(node){
        var goal  = zero(), 
            start = zero(),
            cc = H.format("structures.%s.civil.centre", civ);

        start.ents[cc] = 1;
        if (name === 'techs') {
          goal.tech.push(node.name);
        } else {
          goal.ents[node.name] = 1;
        }
        solutions.push([node.name, function(){
          var planner = new H.HTN.Planner({
            domain: H.HTN.Economy,
            verbose: 0
          });
          planner.plan(start, [[m.init, goal]]);
          return planner;
        }]);
        config[name].counter += 1;
      });

    });

    info = H.transform(config, function(k,v){return [k, v.counter];})
    deb("created %s solutions: %s", solutions.length, prit(info));
    deb();
    deb("evaluating: <span id='worker'></span>");

    (function runner (pointer) {
      var sol = solutions[pointer];
      if (sol) {
        sol[2] = sol[1]();
        var p = sol[2];
        $("worker").innerHTML = H.format("%s/%s %s, %s", pointer +1, solutions.length, tab(p.operations.length, 4), sol[0]);
        setTimeout(()=> runner(pointer +1), 20);
      } else {finish(solutions);}
    })(0);

    function finish(sols){

      var sorted = sols.sort((a,b)=> a[2].depth - b[2].depth),
          r    = "time, food, wood, stone, metal".split(", "),
          ress = "<td class='hr'>%s</td><td class='hr'>%s</td><td class='hr'>%s</td><td class='hr'>%s</td><td class='hr'>%s<td>",
          head = "<thead><td class='hr'>%s</td><td class='hr'>%s</td><td class='hr'>%s</td><td class='hr'>%s</td><td>%s</td>%s</thead>",
          line = "<tr><td class='hr'>%s</td><td class='hr'>%s</td><td class='hr'>%s</td><td class='hr'>%s</td><td>%s</td>%s</tr>";

      $("tblResult").innerHTML = "";
      deb(head, 'D', 'I', 'M', 'L', 'Name', r.reduce((a,b)=>a + "<td class='hr'>"+b+"</td>",""));
      sorted.forEach(function(sol){
        var p = sol[2],
            c = p.result.cost,
            rr = r.map(r => c[r] || 0);
        deb(line, p.depth, p.iterations, p.msecs, p.operations.length, sol[0], rr.reduce((a,b)=>a+"<td class='hr'>"+(b||'')+"</td>",""));
      });

      deb("- done");


    }
  };
  H.HTN.Economy.runStress = function(cVerbose, cLoops, cState, cGoal){

    var t0, t1, p, deb = debLine, state, goal, planner,
        loops = ~~($(cLoops).value).split(".").join(""),
        counter = loops +1,
        verbose = ~~$(cVerbose).value,
        infoQ = H.store.cntQueries,
        infoH = H.store.cacheHit,
        infoM = H.store.cacheMiss,
        tab  = function (s,l){return H.replace(H.tab(s,l), " ", "&nbsp;");};


    try {
      state = JSON.parse("{" + $(cState).value + "}");
    } catch(e){
      $("cError").innerHTML  = "Error: Check JSON of state<br />";
      $("cError").innerHTML += "<span class='f80'>[" + e + "]</span>";
      return;
    }

    try {
      goal = JSON.parse("{" + $(cGoal).value + "}");
    } catch(e){
      $("cError").innerHTML  = "Error: Check JSON of goal<br />";
      $("cError").innerHTML += "<span class='f80'>[" + e + "]</span>";
      return;
    }

    initialize();
    H.Browser.results.clear('tblResult');

    planner = new H.HTN.Planner({
      domain: H.HTN.Economy,
      verbose: verbose
    });
    
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
        planner.plan(state, [[m.init, goal]]);
        // console.log(counter, planner.msecs, planner.iterations);
      }
      t1 = Date.now();

      infoQ = H.store.cntQueries - infoQ;
      infoH = H.store.cacheHit   - infoH;
      infoM = H.store.cacheMiss  - infoM;

      deb();
      deb("<b>Finished:</b>");
      p = planner;
      deb('&nbsp;&nbsp;%s msecs, avg: %s, iterations: %s, depth: %s, queries: %s, cacheHit: %s, cacheMiss: %s', 
          t1-t0, ((t1-t0)/loops).toFixed(3), p.iterations, p.depth, infoQ, infoH, infoM
      );
      logCache();
      deb('\n- done');

    }, 300);

    // deb("running planner * %s, please wait ...", loops);

  };
  H.HTN.Economy.runTarget = function(verbose, state, goal){

    var planner, solution, deb = debLine,
        prit  = H.prettify,
        log = function(){
          planner.logstack.forEach(function(o){
            var msg;
            msg = H.replace(o.m, "SUCCESS", "<strong style='color: #393'>SUCCESS</strong>");
            debLine(msg);
          });
        };         

    initialize();
    H.Browser.results.clear('tblResult');

    planner = new H.HTN.Planner({
      domain: H.HTN.Economy,
      verbose: verbose
    });

    planner.plan(state, [[m.init, goal]]);
    log();
    logTasks(planner.operations);

    deb();
    deb("<b>New State:</b>");
    deb(pritObj(planner.result));
    deb();

    deb();
    deb('\n- done');

  };
  H.HTN.Economy.runGo = function(cVerbose, cState, cGoal){

    var planner, state, goal, solution, deb = debLine,
        verbose = ~~$(cVerbose).value,
        prit  = H.prettify,
        log = function(){
          planner.logstack.forEach(function(o){
            var msg;
            msg = H.replace(o.m, "SUCCESS", "<strong style='color: #393'>SUCCESS</strong>");
            debLine(msg);
          });
        };      

    try {
      state = JSON.parse("{" + $(cState).value + "}");
    } catch(e){
      $("cError").innerHTML  = "Error: Check JSON of state<br />";
      $("cError").innerHTML += "<span class='f80'>[" + e + "]</span>";
      return;
    }

    try {
      goal = JSON.parse("{" + $(cGoal).value + "}");
    } catch(e){
      $("cError").innerHTML  = "Error: Check JSON of goal<br />";
      $("cError").innerHTML += "<span class='f80'>[" + e + "]</span>";
      return;
    }

    initialize();
    H.Browser.results.clear('tblResult');

    planner = new H.HTN.Planner({
      domain: H.HTN.Economy,
      verbose: verbose
    });
    
    planner.plan(state, [[m.init, goal]]);
    log();
    logTasks(planner.operations);

    deb();
    deb("<b>New State:</b>");
    deb(pritObj(planner.result));
    deb();
    
    deb();
    deb('\n- done');

  };




return H; }(HANNIBAL)); 