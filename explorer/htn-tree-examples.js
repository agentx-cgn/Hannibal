/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, HANNIBAL, H, deb */

/*--------------- P L A N N E R -----------------------------------------------

  runs examples/test from explorer



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  H.HTN = H.HTN || {};
  H.HTN.Tree = H.HTN.Tree || {};

  var tab4  = "&nbsp;&nbsp;&nbsp;&nbsp;",
      space = "<span style='font-size:6;'>" + tab4 + "</span>",
      prit = H.prettify, pritObj, 
      tab  = function (s,l){return H.replace(H.tab(s,l), " ", "&nbsp;");},
      fmt  = function fmt(){
        var c=0, a=Array.prototype.slice.call(arguments);
        a.push("");
        return a[0].split("%s").map(function(t){
          return t + a.slice(1)[c++];
        }).join('');
      },
      debSpace = function(){
        html = "<tr><td style='font-size: 0px'>&nbsp;</td></tr>";
        H.Browser.results.append('tblResult', html);
      },
      debLine = function(){
        var html, args = arguments;
        if (args.length === 0) {args = ["**"];}
        if (args.length === 1) {args = ["%s", args[0]];}
        html = fmt("<tr><td>%s</td></tr>", fmt.apply(null, args));
        H.Browser.results.append('tblResult', html);
      },
      logObj = function(o){
        H.each(o, function(attr, valu){
          debLine(fmt(tab4 + "%s: %s", attr, prit(valu)));
        });
      },
      logTasks = function(ops, dense){
        dense = dense || false;
        ops.forEach(function(op){
          var stp = "<strong style='color: #888'>" + tab(op[0], 4) + "</strong>",
              cmd = "<strong style='color: #333'>" + op[1] + "</strong>",
              prs = op.slice(2).filter(p=>p!==undefined).join(", ");
          debLine(tab4 + stp + " - " + cmd + "   ( "  + prs + " )"); 
          if (op[1] === 'wait_secs' && !dense){debSpace();}
          if (op[1] === 'start' && !dense){debSpace();}
        });
      };    

  var planner, m, o, 
      copy = obj => JSON.parse(JSON.stringify(obj)),
      initialize = function(){
        o         = H.HTN.Tree.operators;
        m         = H.HTN.Tree.methods;
        pritObj   = H.HTN.Helper.pritObj;
      };

  H.HTN.Tree.test1 = function(verbose){

    var state, goal, 
        verbose = ~~$(verbose).value,
        solution, deb, 
        log = function(){
          planner.logstack.forEach(function(o){
            debLine(o.m);
          });
        };

    initialize();

    deb = debLine;
    H.Browser.results.clear('tblResult');

    deb(
      "******************************************************************************<br />" +
      "First, test 0 A.D. planner on basic resource operators and init, start methods<br />" + 
      "******************************************************************************"
    );

    planner = planner || new H.HTN.Planner({
      domain: H.HTN.Tree,
      verbose: verbose
    });

    deb(); deb("- Define state: food = 100, empty goal");
    deb();
    state = new H.HTN.Helper.State({ress: {food: 100}}).sanitize();
    goal  = new H.HTN.Helper.State();
    logObj(state);    

    deb();
    deb('- <b style="color: #373">these should succeed (athen) :</b>');
    deb();

    planner.plan(state, [[m.start, goal], [o.inc_resource, 'food', 50]]);
    log(); logTasks(planner.operations, true); deb();

    planner.plan(state, [[m.start, goal], [o.train_units, 'units.athen.support.female.citizen', 1]]);
    log(); logTasks(planner.operations, true); deb();

    planner.plan(state, [[m.start, goal], [o.build_structures, 'structures.athen.farmstead', 1]]);
    log(); logTasks(planner.operations, true); deb();

    planner.plan(state, [[m.start, goal], [o.research_tech, 'armor.ship.hullsheathing', 1]]);
    log(); logTasks(planner.operations, true); deb();

    planner.plan(state, [[m.start, goal], [o.wait_secs, 10]]);
    log(); logTasks(planner.operations, true); deb();

    deb();
    deb('\n- <b style="color: #833">this methods should fail (no solution):</b>');
    deb();

    planner.plan(state, [[m.start, goal]]);
    log(); logTasks(planner.operations, true); deb();

    planner.plan(state, [[m.produce, 'structures.athen.barracks', 1]]);
    log(); logTasks(planner.operations, true); deb();

    deb();
    deb('\n- done');

  };  

  H.HTN.Tree.test2 = function(cVerbose){

    var state, goal, solution, deb, 
        verbose = ~~$(cVerbose).value,
        log = function(){
          planner.logstack.forEach(function(o){
            debLine(o.m);
          });
        };

    initialize();

    deb = debLine;
    H.Browser.results.clear('tblResult');

    deb(
      "**************************************** <br />" +
      "Second, test 0 A.D. planner on resources <br />" + 
      "****************************************"
    );

    planner = planner || new H.HTN.Planner({
      domain: H.HTN.Tree,
      verbose: verbose
    });

    deb(); deb(); deb('- <b style="color: #383">All tests should succeed:</b>');

    deb();
    deb("- Define state: food: 100");
    deb("- Define goal: food: 200");
    deb();
    state = new H.HTN.Helper.State({ress:{food: 100}}).sanitize();
    goal  = new H.HTN.Helper.State({ress:{food: 200}});
    planner.plan(state, [[m.start, goal]]);
    log();
    logTasks(planner.operations, true);
    deb();
    
    deb();
    deb("- Define state: {}");
    deb("- Define goal: food: 100, wood: 200, stone: 300, metal: 400");
    deb();

    state = new H.HTN.Helper.State().sanitize();
    goal  = new H.HTN.Helper.State({ress:{food: 100, wood: 200, stone: 300, metal: 400}});

    planner.plan(state, [[m.start, goal]]);
    log();
    logTasks(planner.operations, true);
    deb();

    deb();
    deb('\n- done');

  };  

  H.HTN.Tree.test3 = function(cVerbose){

    var state, goal, solution, deb, 
        verbose = ~~$(cVerbose).value,
        log = function(){
          planner.logstack.forEach(function(o){
            debLine(o.m);
          });
        };

    initialize();

    deb = debLine;
    H.Browser.results.clear('tblResult');

    deb(
      "****************************************<br />" +
      "Third, test 0 A.D. planner on entities <br />" + 
      "****************************************"
    );

    planner = planner || new H.HTN.Planner({
      domain: H.HTN.Tree,
      verbose: verbose
    });

    state = new H.HTN.Helper.State({
      "ress": {"food": 300, "wood": 300},
      "ents": {
        "structures.athen.civil.centre": 1,
        "units.athen.support.female.citizen": 0},
      "tech": ["phase.village"]
    }).sanitize();

    goal  = new H.HTN.Helper.State({
      "ress": {"food": 300, "wood": 300},
      "ents": {
        "structures.athen.civil.centre": 1,
        "units.athen.support.female.citizen": 1},
      "tech": ["phase.village"]
    }).sanitize();

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
    
    planner.plan(state, [[m.start, goal]]);
    log();
    logTasks(planner.operations, true);
    deb();

    deb();
    deb("- Goal: construct structures.athen.field: 1");
    deb();

    state = new H.HTN.Helper.State({
      "ress": {"food": 300, "wood": 300},
      "ents": {
        "structures.athen.civil.centre": 1,
        "units.athen.support.female.citizen": 1},
      "tech": ["phase.village"]
    }).sanitize();

    goal = new H.HTN.Helper.State({
      "ress": {},
      "ents": {"structures.athen.field": 1},
      "tech": []
    }).sanitize();

    planner.plan(state, [[m.start, goal]]);
    log();
    logTasks(planner.operations, true);
    deb();
    
    deb();
    deb('\n- done');

  };  

  H.HTN.Tree.runCiv = function(cCiv){

    var t0, t1, counter, deb = debLine, 
        civ   = $(cCiv).value,
        infoQ = H.store.cntQueries,
        infoH = H.store.cacheHit,
        infoM = H.store.cacheMiss,
        prit  = H.prettify,
        tab   = function (s,l){return H.replace(H.tab(s,l), " ", "&nbsp;");},
        zero  = function () {return new H.HTN.Helper.State({ress: {}, ents: {}, tech: []});},
        config = {
          techs: {qry: "RESEARCH DISTINCT", com: "", counter: 0},
          bldgs: {qry: "BUILD DISTINCT",   com: "", counter: 0},
          units: {qry: "TRAIN DISTINCT",   com: "", counter: 0}
        },
        solutions = [], nodes, patState = "", patGoal = "", info;

    deb("running planner on all entities of %s, preparing ...", civ);

    initialize();
    H.Browser.results.clear('tblResult');    

    planner = planner || new H.HTN.Planner({
      domain: H.HTN.Tree,
      verbose: 0
    });

    H.each(config, function(name, props){
      H.QRY(props.qry).forEach(function(node){
        if (H.QRY(node.name + " PAIR").first()){return;}
        solutions.push([node.name, function(){
          var goal  = zero(), 
              start = zero().sanitize(),
              cc = H.format("structures.%s.civil.centre", civ);
          start.data.ents[cc] = 1;
          if (name === 'techs') {
            goal.data.tech = [node.name];
          } else {
            goal.data.ents[node.name] = 1;
          }
          planner.plan(start, [[m.start, goal]]);
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
        var p = sol[1]();
        sol[2] = {
          depth:      p.depth,
          msecs:      p.msecs,
          cost:       H.clone(p.result.data.cost),
          length:     p.operations.length,
          iterations: p.iterations,
        };
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
            c = p.cost,
            rr = r.map(r => c[r] || 0);
        deb(line, p.depth, p.iterations, p.msecs, p.length, sol[0], rr.reduce((a,b)=>a+"<td class='hr'>"+(b||'')+"</td>",""));
      });

      deb("- done");

    }

  };

  H.HTN.Tree.runStress = function(cVerbose, cLoops, cState, cGoal){

    var t0, t1, p, deb = debLine, state, goal,
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
    state = new H.HTN.Helper.State(state).sanitize();

    try {
      goal = JSON.parse("{" + $(cGoal).value + "}");
    } catch(e){
      $("cError").innerHTML  = "Error: Check JSON of goal<br />";
      $("cError").innerHTML += "<span class='f80'>[" + e + "]</span>";
      return;
    }
    goal = new H.HTN.Helper.State(goal).sanitize();

    initialize();
    H.Browser.results.clear('tblResult');

    planner = planner || new H.HTN.Planner({
      domain: H.HTN.Tree,
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
        planner.plan(state, [[m.start, goal]]);
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

  H.HTN.Tree.runTarget = function(verbose, state, goal){

    var deb = debLine,
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

    planner = planner || new H.HTN.Planner({
      domain: H.HTN.Tree,
      verbose: verbose
    });

    planner.plan(state, [[m.start, goal]]);
    log();
    logTasks(planner.operations);

    deb();
    deb("<b>New State:</b>");
    deb(pritObj(planner.result));
    deb();

    deb();
    deb('\n- done');

  };

  H.HTN.Tree.runGo = function(cVerbose, cState, cGoal){

    var state, goal, solution, deb = debLine,
        verbose = ~~$(cVerbose).value,
        indent = function(i){return new Array(i).join("&nbsp;");}
        prit  = H.prettify,
        log = function(){
          planner.logstack.forEach(function(o){ // {v: verbose, d: this.depth, m: txt, now: Date.now()}
            var msg;
            if (o.m.contains("SUCCESS")){
              debLine(H.replace(o.m, "SUCCESS", "<strong style='color: #393'>SUCCESS</strong>"));
            } else {
              debLine(indent(o.d) + o.m);
            }
          });
        };      

    H.Browser.error();
    try {
      state = JSON.parse("{" + $(cState).value + "}");
    } catch(e){
      H.Browser.error("Error: Check JSON of state<br /><span class='f80'>[" + e + "]</span>");
      return;
    }
    state = new H.HTN.Helper.State(state).sanitize();

    try {
      goal = JSON.parse("{" + $(cGoal).value + "}");
    } catch(e){
      H.Browser.error("Error: Check JSON of state<br /><span class='f80'>[" + e + "]</span>");
      return;
    }
    goal = new H.HTN.Helper.State(goal).sanitize();

    initialize();
    H.Browser.results.clear('tblResult');

    planner = planner || new H.HTN.Planner({
      domain: H.HTN.Tree,
      verbose: verbose
    });
    
    planner.plan(state, [[m.start, goal]]);
    log();
    deb();
    logTasks(planner.operations);

    deb();
    deb("<b>New State:</b>");
    deb(pritObj(planner.result));
    deb();
    
    deb();
    deb('\n- done');

  };


return H; }(HANNIBAL)); 