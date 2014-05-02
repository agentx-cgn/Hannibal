/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, HANNIBAL, H, deb */

/*--------------- P L A N N E R -----------------------------------------------

  Port of the file: blocks_world_examples.py + the helper functions from 
  the method files


  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  H.HTN = H.HTN || {};
  H.HTN.Blocks = H.HTN.Blocks || {};

  // allows to patch deb() to html output in explorer
  var oldDeb = deb,
      clear  = function(){tblResult.innerHTML = "";},
      newDeb = function (){
        var args = arguments,
            html = "";
        if (args.length === 0) {args = ["**"];}
        if (args.length === 1) {args = ["%s", args[0]];}
        html += H.format("<tr><td>%s</td></tr>", H.format.apply(H, args));
        tblResult.innerHTML += html;
      };

  // Here are some helper functions that are used in the methods' preconditions.

  H.HTN.Blocks.helper = {

    // def forall(seq,cond):
    //     """True if cond(x) holds for all x in seq, otherwise False."""
    //     for x in seq:
    //         if not cond(x): return False
    //     return True

    // use Array.prototype.every


    // def find_if(cond,seq):
    //     """
    //     Return the first x in seq such that cond(x) holds, if there is one.
    //     Otherwise return None.
    //     """
    //     for x in seq:
    //         if cond(x): return x
    //     return None

    findIf: function(seq, cond){  // swapped arams !
      var item;
      for (item of seq){
        if(cond(item)){return item;}
      }
      return null;
    },


    // def all_blocks(state):
    //     return state.clear.keys()

    allBlocks: function(state) {
      return Object.keys(state.clear);
    },


    // def is_done(b1,state,goal):
    //     if b1 == 'table': return True
    //     if b1 in goal.pos and goal.pos[b1] != state.pos[b1]:
    //         return False
    //     if state.pos[b1] == 'table': return True
    //     return is_done(state.pos[b1],state,goal)

    isDone: function (b1, state, goal){
      
      var isDone = H.HTN.Blocks.helper.isDone;

      if (b1 === 'table') {return true;}
      if (goal.pos[b1] !== undefined && goal.pos[b1] !== state.pos[b1]) {return false;}
      if (state.pos[b1] === 'table') {return true;}
      return isDone(state.pos[b1], state, goal);

    },


    // def status(b1,state,goal):
    //     if is_done(b1,state,goal):
    //         return 'done'
    //     elif not state.clear[b1]:
    //         return 'inaccessible'
    //     elif not (b1 in goal.pos) or goal.pos[b1] == 'table':
    //         return 'move-to-table'
    //     elif is_done(goal.pos[b1],state,goal) and state.clear[goal.pos[b1]]:
    //         return 'move-to-block'
    //     else:
    //         return 'waiting'

    status: function(b1, state, goal){

      var isDone = H.HTN.Blocks.helper.isDone;

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

  H.HTN.Blocks.example1 = function(ele){

    var logState = H.HTN.logState,
        plan = H.HTN.Planner.plan,
        state1 = new H.HTN.State("state1"),
        verbose = ele ? +document.getElementById(ele).value : 0;


    H.HTN.Blocks.init();
    H.each(H.HTN.Blocks.operators, function(name, fn){
      H.HTN.addOperator(name, fn);
    });
    H.each(H.HTN.Blocks.methods, function(name, fn){
      H.HTN.addMethods(name, fn);
    });

    /*
      A state is a collection of all of the state variables and their values. 
      Every state variable in the domain should have a value.
    */

    deb = newDeb;
    clear();
    deb(

      "****************************************<br />" +
      "First, test pyhop on some of the operators and smaller tasks<br />" + 
      "****************************************"
    );

    state1.pos     = {'a': 'b', 'b': 'table', 'c': 'table'};
    state1.clear   = {'c': true, 'b': false,'a': true};
    state1.holding = false;

    deb("- Define state1: a on b, b on table, c on table");deb();

    deb('\n- these should fail:');
    plan(state1, [['pickup', 'a']], verbose);
    plan(state1, [['pickup', 'b']], verbose);

    deb('\n- these should succeed:');
    plan(state1, [['pickup', 'c']], verbose);
    plan(state1, [['unstack', 'a', 'b']], verbose);
    plan(state1, [['get', 'a']], verbose);
    
    deb('\n- this should fail:');
    plan(state1, [['get', 'b']], verbose);
    
    deb('\n- this should succeed:');
    plan(state1, [['get', 'c']], verbose);

    deb('\n- done');

    deb = oldDeb;

  };


  H.HTN.Blocks.example2 = function(ele){

    var state1, goal1a, goal1b,
        logGoal  = H.HTN.logGoal,
        logState = H.HTN.logState,
        plan = H.HTN.Planner.plan,
        verbose = ele ? +document.getElementById(ele).value : 0;

    H.HTN.Blocks.init();
    H.each(H.HTN.Blocks.operators, function(name, fn){
      H.HTN.addOperator(name, fn);
    });
    H.each(H.HTN.Blocks.methods, function(name, fn){
      H.HTN.addMethods(name, fn);
    });

    deb = newDeb;
    clear();
    deb(

      "****************************************<br />" + 
      "Run pyhop on two block-stacking problems, both of which start in state1.<br />" + 
      "The goal for the 2nd problem omits some of the conditions in the goal<br />" + 
      "of the 1st problemk, but those conditions will need to be achieved<br />" + 
      "anyway, so both goals should produce the same plan.<br />" + 
      "****************************************"
    );

    // same state as in E1
    state1         = new H.HTN.State("state1")
    state1.pos     = {'a': 'b', 'b': 'table', 'c': 'table'};
    state1.clear   = {'c': true, 'b': false,'a': true};
    state1.holding = false;

    deb("- Define state1: a on b, b on table, c on table");deb();

    // A goal is a collection of some (but not necessarily all) 
    // of the state variables and their desired values. 
    // Below, both goal1a and goal1b specify c on b, and b on a. 
    // The difference is that goal1a also specifies that a is on table and the hand is empty.


    deb("- Define goal1a:");
    goal1a = new H.HTN.Goal('goal1a');
    goal1a.pos = {'c': 'b', 'b': 'a', 'a': 'table'};
    goal1a.clear = {'c': true, 'b': false, 'a': false};
    goal1a.holding = false;
    logGoal(goal1a);
    deb('');

    plan(state1, [['move_blocks', goal1a]], verbose);


    // goal1b omits some of the conditions of goal1a,
    // but those conditions will need to be achieved anyway

    deb("- Define goal1b:");
    goal1b = new H.HTN.Goal('goal1b');
    goal1b.pos = {'c':'b', 'b':'a'};
    logGoal(goal1b);
    deb('');

    plan(state1, [['move_blocks', goal1b]], verbose);
    

    deb("done");

  };



  H.HTN.Blocks.example3 = function(){

    var t0,
        state1, goal1b,
        logGoal  = H.HTN.logGoal,
        logState = H.HTN.logState,
        plan = H.HTN.Planner.plan;

    H.HTN.Blocks.init();
    H.each(H.HTN.Blocks.operators, function(name, fn){
      H.HTN.addOperator(name, fn);
    });
    H.each(H.HTN.Blocks.methods, function(name, fn){
      H.HTN.addMethods(name, fn);
    });

    deb = function(){};
    clear();

    // same state as in E1
    state1         = new H.HTN.State("state1")
    state1.pos     = {'a': 'b', 'b': 'table', 'c': 'table'};
    state1.clear   = {'c': true, 'b': false,'a': true};
    state1.holding = false;

    goal1b = new H.HTN.Goal('goal1b');
    goal1b.pos = {'c':'b', 'b':'a'};
    logGoal(goal1b);

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
        plan(state1, [['move_blocks', goal1b]], 0);
      }
      newDeb("Run test2 %s times, time: %s msecs, %s/%s", x, Date.now() - t0, yy-counter+1, yy);
    });

    newDeb("Please wait...");

  };









return H; }(HANNIBAL)); 