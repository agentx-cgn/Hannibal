/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, HANNIBAL, H, deb */

/*--------------- P L A N N E R -----------------------------------------------

  Simple HTN Planner based on Pyhop/SHOP written by Dana S. Nau
  https://bitbucket.org/dananau/pyhop
  http://www.cs.umd.edu/projects/shop/

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  var maxIterate = 50,
      cntIterate = 0,
      methods   = {},
      operators = {},
      prit = H.prettify,
      mul  = function(n){return new Array(n || 2).join(" ");},
      copy = function(o){return JSON.parse(JSON.stringify(o));},
      tab  = function (s,l){return H.replace(H.tab(s,l), " ", "&nbsp;");};


  function logState(state, indent){
    if (state){
      deb("   HTN: state: %s, %s state: %s", state.name, mul(indent), prit(state));
    } else {deb("   HTN: False");}
  }

  function logGoal(goal, indent){
    if (goal){
      deb("   HTN: goal: %s, %s state: %s", goal.name, mul(indent), prit(goal));
    } else {deb("   HTN: False");}
  }

  function addOperator(name, operator){
    operators[name] = operator;
  }

  function addMethods(name /* functions */){
    methods[name] = H.toArray(arguments).slice(1);
  }

  function Goal(name, json){
    this.name = name;
    H.extend(this, json || {});
  }

  function State(name, json){
    this.name = name;
    H.extend(this, json || {});
  }

  function pritObj(o, depth){

    depth = depth || 0;

    var html = "";

    H.each(o, function(k, v){

      var akku = [];

      if (k === 'ress') {
        H.each(v, function(k, v){
          akku.push(k + ": " + v);
        })
        html += "<tr><td>&nbsp;&nbsp;ress: { " + akku.join(", ") + " }</td></tr>";

      } else if (k === 'tech') {
        html += "<tr><td>&nbsp;&nbsp;" + k + ": [</td></tr>";
        html += pritObj(v, depth +2);
        html += "<tr><td>&nbsp;&nbsp;]</td></tr>";

      } else if (typeof v === 'object'){
        html += "<tr><td>&nbsp;&nbsp;" + k + ": {</td></tr>";
        html += pritObj(v, depth +2);
        html += "<tr><td>&nbsp;&nbsp;}</td></tr>";

      } else if (k === 'name') {
        // do nothing
      } else {
        html += "<tr><td>&nbsp;&nbsp;" + H.mulString("&nbsp;", depth) + k + ": " + v + "</td></tr>";
      }

    });

    return html + "<tr></tr>";

  }

  H.HTN = H.HTN || {};

  H.extend(H.HTN, {
    logState:    logState,
    logGoal:     logGoal,
    pritObj:     pritObj,
    methods:     methods,
    operators:   operators,
    addOperator: addOperator,
    addMethods:  addMethods,
    Goal:        Goal,
    State:       State,    
  });

  H.HTN.Planner = H.HTN.Planner || {};

  H.extend(H.HTN.Planner, {
    logStart:    function(state, tasks, verbose){
      deb("   HTN:    name: %s, verbose: %s", state.name, verbose);
      deb("   HTN:   tasks: %s", prit(tasks));
      deb("   HTN:   state: %s", prit(state));
    },
    logFinish:   function(result, state, msecs){
      deb();
      if (Array.isArray(result)){
        deb("<b>   HTN:  SUCCESS actions: %s, %s msecs</b>", result.length, msecs);
        result.forEach(function(action, i){

          deb("&nbsp;&nbsp;op: %s, <b style='color: #444'>%s</b> ( %s )", tab(i+1, 3), action[0], action.slice(1).join(", "));

        });
        deb();
        deb("<b>   HTN:   new state:</b>");
        deb(pritObj(state));
        deb();
      } else {
        deb();
        deb("<b>   HTN:  FAILURE result: %s, %s msecs</b>", result, msecs); 
        deb();
        deb("<b>   HTN:   new state: %s</b>", state);
        deb();
      }

    },
    plan:        function(state, tasks, verbose){

      var self = H.HTN.Planner, 
          result, newState, 
          t0 = 0, t1 = 0;

      verbose = verbose || 0;

      if (verbose > 0){self.logStart(state, tasks, verbose);}
      
      cntIterate = 0;
      
      t0 = Date.now();
      [result, newState] = self.seekPlan(state, tasks, [], 0, verbose);
      t1 = Date.now();

      if ((document && verbose > -1) || verbose > 0){
        self.logFinish(result, newState,  t1 - t0);
      }

      return result;

    },
    seekPlan: function seekPlan (state, tasks, plan, depth, verbose){

      var task, task1, newTasks,
          anyTasks, anyQueue, anyPointer, anyTask, 
          operator, params, method, relevant, 
          newState, solution, subtasks;

      verbose = verbose || 0;

      cntIterate += 1;
      if (cntIterate > maxIterate){
        tasks = [];
        deb("   HTN:   FAILED, too much iterations");
      }

      if (verbose > 1){deb("   HTN:   D:%s, tasks: %s", depth, prit(tasks));}

      if (tasks.length === 0){
        if (verbose > 2){deb("   HTN:   D:%s, plan: %s", depth, prit(plan));}
        return [plan, state];
      }

      task1 = tasks[0];

      if (operators[task1[0]] !== undefined){

        if (verbose > 2){deb("   HTN:   D:%s, operator: %s", depth, prit(task1));}

        // solution = self.seekOperator(task1, state)

        operator  = operators[task1[0]];
        params    = [copy(state)].concat(task1.slice(1));
        newState  = operator.apply(null, params);
        
        if (verbose > 2){deb("   HTN: D:%s, state: %s", depth, prit(newState));}
        
        if (newState){
          newTasks = tasks.slice(1);
          solution = seekPlan(newState, newTasks, plan.concat([task1]), depth +1, verbose);

          if (verbose > 2){deb("   HTN: D:%s, [task] solution: %s", depth, prit(solution));}

          if (solution !== false){
            return solution;
          }
        }
      }


      if (methods[task1[0]] !== undefined){

        if (verbose > 2){deb("   HTN:   D:%s, method: %s", depth, prit(task1));}

        relevant = methods[task1[0]];
        for (method of relevant){

          params   = [state].concat(task1.slice(1));
          subtasks = method.apply(null, params);
          
          if (verbose > 2){deb("   HTN:   D:%s, subtasks: %s", depth, prit(subtasks));}

          if(subtasks !== false){
            newTasks = subtasks.concat(tasks.slice(1))
            solution = seekPlan(state, newTasks, plan, depth +1, verbose);

            if (verbose > 2){deb("   HTN: D:%s, [meth] solution: %s", depth, prit(solution));}

            if (solution !== false){
              return solution;
            }
          }
        }

      }

      if (task1 === "ANY") {

        anyTasks = tasks[1];
        anyPointer = 0;
        anyTask = anyTasks[anyPointer];

        if (verbose > 2){deb("   HTN:   D:%s, ANY with %s tasks", depth, anyTasks.length);}

        while (anyTask) {

          relevant = methods[anyTask[0]];
          for (method of relevant){

            params = [state].concat(anyTask.slice(1));
            subtasks = method.apply(null, params);

            if (verbose > 2){deb("   HTN:   D:%s, ANY subtasks: %s => %s", depth, params, subtasks);}
            
            if(subtasks !== false){

              if (subtasks[0] === "ANY"){

                // TODO: make unique
                subtasks.slice(1)[0].forEach(function(task){
                  anyTasks.push(task);
                });

              } else {
                newTasks = subtasks.concat(tasks.slice(2));
                solution = seekPlan(state, newTasks, plan, depth +1, verbose);
                if (verbose > 2){deb("   HTN: D:%s, [ANY] solution: %s", depth, prit(solution));}
                if (solution !== false){
                  return solution;;
                }

              }
            }    

            anyPointer += 1;
            anyTask = anyTasks[anyPointer];

          }
        }

      } // end ANY


      if (verbose > 2){deb("   HTN:   D:%s, fails on task: %s", depth, task1);}
      return false;

    },
    seekOperator: function(){

    }

  });


return H; }(HANNIBAL));

/*

Task: Destroy Building

  prerequisites:
    are there obstacles?
      if trees or narrow terrain, drop siege engines
      if walls replace building with a wall segment, start over
      if military building close to path, replace building with that, start over
    determine hitpoints of building
    estimate attack potential of building (garrison or empty)
      if in doubt, send scouts
    determine population of enemy
    estimate hitpoints of defenders
    estimate attack potential of defenders
      if in doubt, send scouts
    calculate amount of ranged units
    calculate amount of meelee units
    calculate amount of siege

  build army
  find path to building
  move to building
  attack building
  attack defender
  return to own civil centre
  heal army

Implementation
  Horn clauses vs. PyHop


Testing
What are criteria to decide testing is over
random map generation, log out plan
Crysis has a hundreds of consoles running


This is the algorithm, as described by Nau et al.:

procedure SHOP(s,T,D)
   P = the empty plan
   T0 = {member(t,T) : no other task in T is constrained to precede t}
   loop
      if ( T == {} ) then return P
      nondeterministically choose any t such that member(t,T0)
      if t is a primitive task then
         A = {(a,theta) : a is a ground instance of an operator in D, 
                          theta is a substitution that unifies {head(a), t}, and 
                          s satisfies a's preconditions}
         if ( A == {} ) then return failure
         nondeterministically choose a pair (a, theta) such that member((a, theta),A)
         modify s by deleting deletions(a) and adding additions(a)
         append a to P
         modify T by removing t and applying theta
         T0 = {member(t,T) : no other task in T is constrained to precede t}
      else
         M = {(m, theta) : m is an instance of a method in D, 
                           theta unifies {head(m), t},
                           s satisfies m's preconditions, and 
                           m and theta are as general as possible}
        if ( M == {} ) then return failure
        nondeterministically choose a pair (m, theta) such that member((m, theta),M)
        modify T by 
           removing t, adding subtasks(m), constraining each subtask
           to precede the tasks that t preceded, and applying theta
        if ( subtasks(m) != {} ) then
           T0 = {member(t,subtasks(m)) : no other task in T is constrained to precede t}
        else
           T0 = {member(t,T) : no other task in T is constrained to precede t}
    repeat
 end SHOP
 

*/  