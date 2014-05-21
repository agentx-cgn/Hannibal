/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- P L A N N E R -----------------------------------------------

  Simple HTN Planner based on Pyhop/SHOP written by Dana S. Nau
  https://bitbucket.org/dananau/pyhop
  http://www.cs.umd.edu/projects/shop/

  expects ES6 (e.g. FF30+), uses spread, fat arrow, of
  V: 1.1, noiv11, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  var copy = function(o){return JSON.parse(JSON.stringify(o));},
      prit = function(o){return JSON.stringify(o).split('"').join("");},
      fmt  = function fmt(){
        var c=0, a=Array.prototype.slice.call(arguments);
        a.push("");
        return a[0].split("%s").map(function(t){return t + a.slice(1)[c++];}).join('');
      };

  H.HTN = H.HTN || {};                       

  H.HTN.Goal  = function Goal (name, obj){this.name = name; extend(this, obj || {});};
  H.HTN.State = function State(name, obj){this.name = name; extend(this, obj || {});};

  H.HTN.Solution = function Solution(start, goal, domain, verbose){
    this.start  = new H.HTN.State("start", start);
    this.goal   = new H.HTN.Goal("goal", goal);
    this.domain = domain;
    this.verbose  = verbose; 
    this.evaluated = 0;
  };
  H.HTN.Solution.prototype = {
    constructor: H.HTN.Solution,
    evaluate: function(tasks){
      this.planner = new H.HTN.Planner({
        methods:   this.domain.methods,
        operators: this.domain.operators,
        goal:      this.goal,
        state:     this.start,
        verbose:     this.verbose || 0
      });
      if (this.domain.initialize) {this.domain.initialize(this.planner);}
      return this.plan = this.planner.plan(this.start, tasks);
    }
  };

  H.HTN.Planner = function Planner(config) {

    var defs = {
          logstack:        [],
          verbose:          0,
          msecs:            0,
          depth:            0,
          iterations:       0,
          maxDepth:       200,
          maxIterations:  200,
          domain:        null,
          methods:       null,
          operators:     null,
          tasks:         null,
          state:         null,
          goal:          null,
          operations:    null
        };

    H.extend(this, defs, config || {});

    if (this.domain.initialize){this.domain.initialize(this);}
    this.methods   = this.domain.methods;
    this.operators = this.domain.operators;

  };

  H.HTN.Planner.prototype = {
    constructor:  H.HTN.Planner,
    log: function(verbose, msg){
      var txt;
      if (verbose <= this.verbose){
        txt = typeof msg !== "function" ? msg : msg();
        this.logstack.push({
          v: verbose, d: this.depth, m: txt, now: Date.now()
        });
      }
    },
    pritTasks: function(tasks){
      return prit(tasks.map(function(task){
        return [task[0].name, task[1]];
      }));
    },
    plan: function(state, tasks){

      var t0, t1;

      this.state = state;
      this.tasks = tasks;

      this.msecs = 0;
      this.depth = 0;
      this.logstack = [];
      this.iterations = 0;
      this.log(1, fmt("START: tasks: %s, state: %s", this.pritTasks(tasks), prit(state)));
      
      t0 = Date.now();
      [this.operations, this.result, this.error] = this.seekPlan(state, tasks, [], this.depth);
      t1 = Date.now();

      this.msecs = t1 - t0;

      if (this.error){
        this.log(0, fmt("FAILED: %s, plan: %s ops, depth: %s, iter: %s, msecs: %s",
          this.error, this.operations.length, this.depth, this.iterations, this.msecs));

      } else if (!this.operations.length) {
        this.log(0, fmt("FAILED: %s, plan: %s ops, depth: %s, iter: %s, msecs: %s",
          "no solution found", this.operations.length, this.depth, this.iterations, this.msecs));

      } else {
        this.log(0, fmt("SUCCESS: plan: %s ops, depth: %s, iter: %s, msecs: %s",
          this.operations.length, this.depth, this.iterations, this.msecs));

      }

      return this;

    },
    seekPlan: function seekPlan (state, tasks, plan, depth){

      var name, exit, solution = null;

      this.depth = depth; 
      this.iterations += 1;

      exit = (
        !tasks.length &&  depth ? [plan, state] :
        !tasks.length && !depth ? [plan, state, fmt("no tasks given")] :
        this.iterations > this.maxIterations ? [plan, state, fmt("too many iterations ( %s )", this.iterations)] :
        depth > this.maxDepth ? [plan, state, fmt("too deep ( %s )", depth)] : 
          null
      );

      if (exit){return exit;}

      name = tasks[0][0].name;
      this.log(1, () => fmt("S: [%s, %s]", name, tasks[0][1]));

      if (name === "ANY") {
        solution = this.seekAnyMethod(tasks, state, plan, ++depth);
        if (solution){return solution;}

      } else if (this.operators.hasOwnProperty(name)){
        solution = this.seekOperator(tasks, state, plan, ++depth);
        if (solution){return solution;}

      } else if (this.methods.hasOwnProperty(name)){
        solution = this.seekMethod(tasks, state, plan, ++depth);
        if (solution){return solution;}

      } else {
        this.log(0, fmt("E: no op/mt for task: [%s, %s]", name, tasks[0][1]));
        return null;
      }

      return (
        depth > 1 ? solution : 
        solution  ? solution : 
        [plan, state, fmt("no solution for task: [%s, %s], depth: %s", name, tasks[0][1], depth)]
      );

    },
    seekMethod: function(tasks, state, plan, depth){

      var solution = null,
          task     = tasks[0],
          // subtasks = task[0](...[state, ...task.slice(1)]);
          subtasks = task[0].apply(null, [state].concat(task.slice(1)));

      if (subtasks){
        this.log(2, () => fmt("M: [%s, %s]", task[0].name, task[1])); //subtasks.map(function(t){return t[0];}).join(",")
        solution = this.seekPlan(
          state, 
          subtasks.concat(tasks.slice(1)), 
          plan, 
          depth
      );} return solution;

    },
    seekOperator: function(tasks, state, plan, depth){

      var solution = null,
          task     = tasks[0],
          // newstate = task[0](...[copy(state), ...task.slice(1)]);
          newstate = task[0].apply(null, [copy(state)].concat(task.slice(1)));

      if (newstate){
        this.log(2, () => fmt("O: [%s, %s]", task[0].name, task[1]));
        solution = this.seekPlan(
          newstate, 
          tasks.slice(1), 
          plan.concat([[task[0].name].concat(task.slice(1))]), 
          depth
      );} return solution;

    },

    seekAnyMethod: function(tasks, state, plan, depth){

      var self        = H.HTN.Planner,
          anyTasks    = tasks[0][1],
          anyPointer  = 0,
          anyTask     = anyTasks[anyPointer],
          addUnique   = H.HTN.Helper.addUnique, // TODO use Set
          subTasks, newTasks, solution = null;

      while (anyTask) {

        this.log(3, () => fmt("A: (%s/%s) [%s, %s]", anyPointer, anyTasks.length, anyTask[0].name, anyTask[1]));

        subTasks = anyTask[0].apply(null, [state].concat(anyTask.slice(1)));

        if(subTasks){

          if (subTasks[0][0].name === "ANY"){
            subTasks[0][1].forEach(task => addUnique(task, anyTasks));

          } else {
            newTasks = subTasks.concat(tasks.slice(1));
            solution = this.seekPlan(state, newTasks, plan, depth);
            if (solution !== null){return solution;}

          }
        }    

        anyTask = anyTasks[++anyPointer];

      }

      this.log(0, "run out of %s anyTasks", anyTasks.length);
      return null;

    },


  };

return H; }(HANNIBAL));

