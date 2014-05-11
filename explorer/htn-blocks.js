/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- B L O C K S -------------------------------------------------

  describes the blocks world domain, including examples



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  H.HTN = H.HTN || {};                       
  H.HTN.Blocks = H.HTN.Blocks || {};

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
      };


  var m, o, prit, pritObj, allBlocks, isDone, status, findIf, 
      copy = obj => JSON.parse(JSON.stringify(obj));

  H.HTN.Blocks.initialize = function(){
    o         = H.HTN.Blocks.operators;
    m         = H.HTN.Blocks.methods;
    pritObj   = H.HTN.Helper.pritObj;
    allBlocks = H.HTN.Blocks.helper.allBlocks;
    isDone    = H.HTN.Blocks.helper.isDone;
    status    = H.HTN.Blocks.helper.status;
    findIf    = H.HTN.Blocks.helper.findIf;
  };

  H.HTN.Blocks.helper = {

    findIf: function(seq, cond){  // swapped arams !
      var item;
      for (item of seq){
        if(cond(item)){return item;}
      }
      return null;
    },
    allBlocks: function(state) {
      return Object.keys(state.clear);
    },
    isDone: function (b1, state, goal){
      
      if (b1 === 'table') {return true;}
      if (goal.pos[b1] !== undefined && goal.pos[b1] !== state.pos[b1]) {return false;}
      if (state.pos[b1] === 'table') {return true;}

      return isDone(state.pos[b1], state, goal);

    },
    status: function(b1, state, goal){

      if (isDone(b1, state, goal)){
        return 'done';

      } else if (!state.clear[b1]) {
        return 'inaccessible';
      
      } else if (!goal.pos[b1] || goal.pos[b1] === 'table') {
        return 'move-to-table';

      } else if (isDone(goal.pos[b1], state, goal) && state.clear[goal.pos[b1]]) {
        return 'move-to-block';

      } else {
        return 'waiting';

      }
    }

  };

  H.HTN.Blocks.operators = {

    pickup: function pickup(state, b){

      if (state.pos[b] === 'table' && state.clear[b] === true && state.holding === false){

        state.pos[b]    = 'hand';
        state.clear[b]  = false;
        state.holding   = b;
        return state;

      } else {return null;}

    },

    unstack: function unstack(state, b, c){

      if (state.pos[b] === c && c !== 'table' && state.clear[b] === true && state.holding === false){

        state.pos[b]    = 'hand';
        state.clear[b]  = false;
        state.holding   = b;
        state.clear[c]  = true;
        return state;
      
      } else {return null;}

    },

    putdown: function putdown(state, b){

      if (state.pos[b] === 'hand'){

        state.pos[b]    = 'table';
        state.clear[b]  = true;
        state.holding   = false;
        return state;
      
      } else {return null;}

    },

    stack: function stack(state, b, c){

      if (state.pos[b] === 'hand' & state.clear[c]) {
        
        state.pos[b]    = c;
        state.clear[b]  = true;
        state.holding   = false;
        state.clear[c]  = false;
        return state;
      
      } else {return null;}

    }

  };

  H.HTN.Blocks.methods = {

    move_blocks: function move_blocks (state, goal){

      var b1, s, all = allBlocks(state);

      for (b1 of all){
        s = status(b1, state, goal);
        if (s === 'move-to-table') {
          return [[m.move_one, b1, 'table'], [m.move_blocks, goal]];
        } else if (s === 'move-to-block') {
          return [[m.move_one, b1, goal.pos[b1]], [m.move_blocks, goal]];
        }
      } 

      b1 = findIf(allBlocks(state), function(x){
        return status(x, state, goal) === 'waiting';}
      );

      if (b1 !== null) {
        return [[m.move_one, b1, 'table'], [m.move_blocks, goal]];
      }

      return [];

    },

    move_one: function move_one (state, b1, dest){
      return [[m.get, b1], [m.put, b1, dest]];
    },

    get: function get (state, b1){
      if (state.clear[b1]) {
        if (state.pos[b1] === 'table') {
          return [[o.pickup, b1]];
        } else {
          return [[o.unstack, b1, state.pos[b1]]];
        }
      } else {
        return null;
      }
    },

    put: function put (state, b1, b2){
      if (state.holding === b1) {
        if (b2 === 'table') {
          return [[o.putdown, b1]];
        } else {
          return [[o.stack, b1, b2]];
        }
      } else {
        return null;
      }
    }

  };

  H.HTN.Blocks.example3 = function(verbose){

    var planner, state, goal, solution, deb, 
        log = function(){
          planner.logstack.forEach(function(o){
            debLine(o.m);
          });
        },
        logTasks = function(ops){
          ops.forEach(function(op){
            debLine(tab + prit(op));
          })
        }

    verbose = $(verbose) ? ~~$(verbose).value : ~~verbose  || 0;

    H.Browser.results.clear('tblResult');
    deb = debLine;

    planner = new H.HTN.Planner({
      domain: H.HTN.Blocks,
      verbose: 0
    });

    state = {
      pos:     {'a': 'b', 'b': 'table', 'c': 'table'},
      clear:   {'c': true, 'b': false,'a': true},
      holding: false
    };

    goal = {
      pos: {'c': 'b', 'b': 'a', 'a': 'table'}
    };

    function repeat(counter, fn){
      setTimeout(function(){
        fn(counter);
        if (counter > 1) {repeat(--counter, fn);}
      }, 10);
    }

    var yy = 10;
    repeat(yy, function(counter){
      var y = x = 1000, t0 = Date.now();
      while(y--){
        planner.plan(state, [[m.move_blocks, goal]]);
      }
      deb("Run test2 %s times, time: %s msecs, %s/%s", x, Date.now() - t0, yy-counter+1, yy);
    });

    deb("Please wait...");


  };
  H.HTN.Blocks.example2 = function(verbose){

    var planner, state, goal, solution, deb, 
        log = function(){
          planner.logstack.forEach(function(o){
            debLine(o.m);
          });
        },
        logTasks = function(ops){
          ops.forEach(function(op){
            debLine(tab + prit(op));
          })
        }

    verbose = $(verbose) ? ~~$(verbose).value : ~~verbose  || 0;

    H.Browser.results.clear('tblResult');
    deb = debLine;
    deb(
      "************************************************************************<br />" + 
      "Run pyhop on two block-stacking problems, both of which start in state1.<br />" + 
      "The goal for the 2nd problem omits some of the conditions in the goal<br />" + 
      "of the 1st problemk, but those conditions will need to be achieved<br />" + 
      "anyway, so both goals should produce the same plan.<br />" + 
      "************************************************************************"
    );

    planner = new H.HTN.Planner({
      domain: H.HTN.Blocks,
      verbose: verbose
    });

    state = {
      pos:     {'a': 'b', 'b': 'table', 'c': 'table'},
      clear:   {'c': true, 'b': false,'a': true},
      holding: false
    };

    deb();
    deb("- <b>Define state: a on b, b on table, c on table</b>");
    deb();
    logObj(state);

    goal = {
      pos:     {'c': 'b', 'b': 'a', 'a': 'table'},
      clear:   {'c': true, 'b': false,'a': false},
      holding: false
    };

    deb();
    deb("- <b>Define goal: c on b, b on a, a on table</b>");
    deb();
    logObj(goal);

    deb();
    planner.plan(state, [[m.move_blocks, goal]]);
    log();
    logTasks(planner.operations);

    goal = {
      pos: {'c': 'b', 'b': 'a', 'a': 'table'}
    };

    deb();
    deb("- <b>Define same goal: c on b, b on a, a on table</b>");
    deb();
    logObj(goal);

    deb();
    planner.plan(state, [[m.move_blocks, goal]]);
    log();
    logTasks(planner.operations);

    deb();deb();
    deb('- done');

  };
  H.HTN.Blocks.example1 = function(verbose){

    var planner, state, goal, solution, deb, 
        log = function(){
          planner.logstack.forEach(function(o){
            debLine(o.m);
          });
        };

    verbose = $(verbose) ? ~~$(verbose).value : ~~verbose  || 0;

    /*
      A state is a collection of all of the state variables and their values. 
      Every state variable in the domain should have a value.
    */

    H.Browser.results.clear('tblResult');
    deb = debLine;
    deb(

      "************************************************************<br />" +
      "First, test pyhop on some of the operators and smaller tasks<br />" + 
      "************************************************************"
    );

    planner = new H.HTN.Planner({
      domain: H.HTN.Blocks,
      verbose: verbose
    });

    deb();
    deb("- <b>Define state1: a on b, b on table, c on table</b>");

    state = {
      pos:     {'a': 'b', 'b': 'table', 'c': 'table'},
      clear:   {'c': true, 'b': false,'a': true},
      holding: false
    };

    logObj(state);

    deb();
    deb('- <b>these should fail:</b>');
    deb();
    planner.plan(state, [[o.pickup, 'a']]);
    log();
    planner.plan(state, [[o.pickup, 'b']]);
    log();

    deb();deb();
    deb('- <b>these should succeed:</b>');
    deb();
    planner.plan(state, [[o.pickup, 'c']]);
    log();
    planner.plan(state, [[o.unstack, 'a', 'b']]);
    log();
    planner.plan(state, [[m.get, 'a']]);
    log();


    deb();deb();
    deb('- <b>this should fail:</b>');
    deb();
    planner.plan(state, [[m.get, 'b']]);
    log();


    deb();deb();
    deb('- <b>this should succeed:</b>');
    deb();
    planner.plan(state, [[m.get, 'c']]);
    log();

    deb();deb();
    deb('- done');

  };




return H; }(HANNIBAL)); 