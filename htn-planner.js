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

  var maxIterate = 500,
      maxDepth   = 0,
      cntIterate = 0,
      cntMsecs   = 0,
      details    = {},

      // Planner functions
      methods    = {},
      operators  = {},

      // helper
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

  function addMethods(name, method){
    methods[name] = method;
  }

  function Goal(name, obj){
    this.name = name;
    H.extend(this, obj || {});
  }

  function State(name, obj){
    this.name = name;
    H.extend(this, obj || {});
  }

  function Solution(start, goal, methods, operators){
    this.start = new H.HTN.State("state", start);
    this.goal  = new H.HTN.State("state", goal);
    this.methods = methods || H.HTN.Hannibal.methods;
    this.operators = operators || H.HTN.Hannibal.operators;
    this.evaluated = false;
  }
  Solution.prototype = {
    constructor: Solution,
    evaluate: function(){
      H.HTN.Planner.init();
      H.each(this.methods, H.HTN.addMethods);
      H.each(this.operators, H.HTN.addOperator);
      this.actions = H.HTN.Planner.plan(this.start, [['init', this.goal]], -1);
      this.evaluated = true;
      this.length = this.actions.length;
      this.details = H.deepcopy(H.HTN.details());
      this.costs = this.details.costs;
      return this;
    }
  };


  H.HTN = H.HTN || {};

  H.extend(H.HTN, {
    // wating for extended literal objects landing in SM
    logState:    logState,
    logGoal:     logGoal,
    methods:     methods,
    operators:   operators,
    addOperator: addOperator,
    addMethods:  addMethods,
    Goal:        Goal,
    State:       State,    
    Solution:    Solution,    
    depth:       function(){return maxDepth;},
    iterations:  function(){return cntIterate;},
    details:     function(){return details;}
  });

  H.HTN.Planner = H.HTN.Planner || {};

  H.extend(H.HTN.Planner, {

    // this is the enry point

    init: function(){
      maxDepth = 0;
      cntIterate = 0;
      cntMsecs = 0;
      methods = {};
      operators = {};
      details = {};
    },
    plan: function(state, tasks, verbose){

      var self = H.HTN.Planner, result, newState, t0 = 0, t1 = 0;

      verbose = verbose || 0;

      if (verbose > 0){H.HTN.Helper.logStart(state, tasks, verbose);}
      
      cntIterate = 0;
      
      t0 = Date.now();
      [result, newState] = self.seekPlan(state, tasks, [], 0, verbose);
      t1 = Date.now();

      if ((document && verbose > -1) || verbose > 0){
        H.HTN.Helper.logFinish(result, newState,  t1 - t0, cntIterate, maxDepth);
      }

      details = {
        depth:  maxDepth,
        iters:  cntIterate,
        msecs:  t1 - t0,
        result: newState,
        costs:  newState.cost,
        errors: [],
        actions: result,
      };

      return result;

    },

    // this the workhorse

    seekPlan: function seekPlan (state, tasks, plan, depth, verbose){

      var self = H.HTN.Planner, task1, solution;

      verbose = verbose || 0;
      maxDepth = (depth > maxDepth) ? depth : maxDepth;


      // pre flight checking

      if (cntIterate > maxIterate){
        deb("   HTN:   FAILED, too much iterations ( %s )", maxIterate);
        return [plan, state];
      }

      if (verbose > 1){deb("   HTN:   D:%s, tasks: %s", depth, prit(tasks));}

      if (tasks.length === 0){
        if (verbose > 2){deb("   HTN:   D:%s, plan: %s", depth, prit(plan));}
        return [plan, state];
      }


      // if first = operator

      task1 = tasks[0];

      if (operators[task1[0]] !== undefined){

        if (verbose > 2){deb("   HTN:   D:%s, operator: %s", depth, prit(task1));}

        solution = self.seekOperator(tasks, state, plan, depth, verbose);

        if (verbose > 2){deb("   HTN: D:%s, [task] solution: %s", depth, prit(solution));}

        if (solution !== null){return solution;}


      }


      // if first = method

      if (methods[task1[0]] !== undefined){

        if (verbose > 2){deb("   HTN:   D:%s, method: %s", depth, prit(task1));}

        solution = self.seekMethod(tasks, state, plan, depth, verbose);

        if (verbose > 2){deb("   HTN: D:%s, [meth] solution: %s", depth, prit(solution));}

        if (solution !== null){return solution;}

      }


      // if first = ANY

      if (task1 === "ANY") {


        if (verbose > 2){deb("   HTN:   D:%s, ANY with %s tasks", depth, tasks[1].length);}

        solution = self.seekAnyMethod(tasks, state, plan, depth, verbose);

        if (verbose > 2){deb("   HTN: D:%s, [ANY] solution: %s", depth, prit(solution));}

        if (solution !== null){return solution;}


      } 


      // if first = ALL

      if (task1 === "ALL") {


        if (verbose > 2){deb("   HTN:   D:%s, ALL with %s tasks", depth, tasks[1].length);}

        solution = self.seekAllMethods(tasks, state, plan, depth, verbose);

        if (verbose > 2){deb("   HTN: D:%s, [ALL] solution: %s", depth, prit(solution));}

        if (solution !== null){return solution;}


      } 


      // if first = unknown

      if (verbose > 2){deb("   HTN:   D:%s, fails on task: %s", depth, task1);}

      return (depth === 0) ? [plan, state] : null;

    },
    seekAllMethods: function(tasks, state, plan, depth, verbose){

      var self        = H.HTN.Planner,
          addUnique   = H.HTN.Helper.addUnique,
          allTasks    = tasks[1],
          allPointer  = 0,
          allTask     = allTasks[allPointer],
          method, params, subtasks, newTasks, solution = null;

      // search breadth in a growing list
      
      while (allTask) {

        cntIterate += 1;

        // deb("ANY: %s, %s", allPointer, prit(allTask));

        method   = methods[allTask[0]];
        params   = [state].concat(allTask.slice(1));
        subtasks = method.apply(null, params);

        if (verbose > 2){deb("   HTN:   D:%s, ANY subtasks: %s => %s", depth, params, subtasks);}
        
        if(subtasks !== null){

          if (subtasks[0] === "ANY"){
            subtasks.slice(1)[0].forEach(task => addUnique(task, allTasks));

          } else {
            newTasks = subtasks.concat(tasks.slice(2));
            solution = self.seekPlan(state, newTasks, plan, depth +1, verbose);
            // if (verbose > 2){deb("   HTN: D:%s, [ANY] solution: %s", depth, prit(solution));}
            if (solution !== null){
              return solution;
            }

          }
        }    

        allPointer += 1;
        allTask = allTasks[allPointer];

      }

      deb("ERROR : Planner: run out of %s AllTasks: [%s]", allPointer, allTasks.map(t=>t[0]+": "+t[1]).join(", ")); // console.log(anyTasks)
      return null;


    },
    seekAnyMethod: function(tasks, state, plan, depth, verbose){

      var self        = H.HTN.Planner,
          addUnique   = H.HTN.Helper.addUnique,
          anyTasks    = tasks[1],
          anyPointer  = 0,
          anyTask     = anyTasks[anyPointer],
          method, params, subtasks, newTasks, solution = null;

      // search breadth in a growing list
      
      while (anyTask) {

        cntIterate += 1;

        // deb("ANY: %s, %s", anyPointer, prit(anyTask));

        method   = methods[anyTask[0]];
        params   = [state].concat(anyTask.slice(1));
        subtasks = method.apply(null, params);

        if (verbose > 2){deb("   HTN:   D:%s, ANY subtasks: %s => %s", depth, params, subtasks);}
        
        if(subtasks !== null){

          if (subtasks[0] === "ANY"){
            subtasks.slice(1)[0].forEach(task => addUnique(task, anyTasks));

          } else {
            newTasks = subtasks.concat(tasks.slice(2));
            solution = self.seekPlan(state, newTasks, plan, depth +1, verbose);
            // if (verbose > 2){deb("   HTN: D:%s, [ANY] solution: %s", depth, prit(solution));}
            if (solution !== null){
              return solution;
            }

          }
        }    

        anyPointer += 1;
        anyTask = anyTasks[anyPointer];

      }

      deb("ERROR : Planner: run out of %s AnyTasks: [%s]", anyPointer, anyTasks.map(t=>t[0]+": "+t[1]).join(", ")); // console.log(anyTasks)
      return null;


    },
    seekMethod: function(tasks, state, plan, depth, verbose){

      var self      = H.HTN.Planner,
          solution  = null,
          task1     = tasks[0],
          method    = methods[task1[0]],
          params    = [state].concat(task1.slice(1)),
          subtasks  = method.apply(null, params),
          newTasks;

      cntIterate += 1;
        
      if (verbose > 2){deb("   HTN:   D:%s, subtasks: %s", depth, prit(subtasks));}

      if(subtasks !== null){

        newTasks = subtasks.concat(tasks.slice(1));
        solution = self.seekPlan(state, newTasks, plan, depth +1, verbose);

        if (verbose > 2){deb("   HTN: D:%s, [meth] solution: %s", depth, prit(solution));}

        if (solution !== null){
          return solution;
        }

      }

      return null;

    },
    seekOperator: function(tasks, state, plan, depth, verbose){

      var self      = H.HTN.Planner, 
          solution  = null,
          task1     = tasks[0],
          operator  = operators[task1[0]],
          params    = [copy(state)].concat(task1.slice(1)),
          newState  = operator.apply(null, params);

      if (verbose > 2){deb("   HTN: D:%s, state: %s", depth, prit(newState));}

      cntIterate += 1;

      if (newState){
        solution = self.seekPlan(newState, tasks.slice(1), plan.concat([task1]), depth +1, verbose);
      }
      
      return solution;
    }

  });


return H; }(HANNIBAL));

/*

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