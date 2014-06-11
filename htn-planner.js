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

  var fmt  = function fmt(){
        var c=0, a=Array.prototype.slice.call(arguments); a.push("");
        return a[0].split("%s").map(function(t){return t + a.slice(1)[c++];}).join('');
      },
      // concise JSON
      pritj = function(o){return JSON.stringify(o).split('"').join("");},
      // prettyfies a task
      pritt = function(task){
        var t1 = task[0].name,
            t2 = Array.isArray(task[1]) ? task[1].length : task[1],
            t3 = task.length === 3 ? ", " + task[2] : "";
        return fmt("[%s: %s%s]", t1, t2, t3);
      },
      copy = function(s){
        var p, i = s.tech.length, o = {civ: s.civ, cost: {}, ress: {}, ents: {}, tech: []};
        for (p in s.cost){o.cost[p] = s.cost[p];}
        for (p in s.ress){o.ress[p] = s.ress[p];}
        for (p in s.ents){o.ents[p] = s.ents[p];}
        while(i--){o.tech.push(s.tech[i]);}
        return o;
      };   

  H.HTN = H.HTN || {};                       

  H.HTN.Goal  = function Goal (name, obj){this.name = name; H.extend(this, obj || {});};
  H.HTN.State = function State(name, obj){this.name = name; H.extend(this, obj || {});};

  H.HTN.Solution = function Solution(start, goal, domain, verbose){
    this.start  = new H.HTN.State("start", start);
    this.goal   = new H.HTN.Goal("goal", goal);
    this.domain = domain;
    this.verbose   = verbose; 
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
        verbose:   this.verbose || 0
      });
      if (this.domain.initialize) {this.domain.initialize(this.planner);}
      return this.plan = this.planner.plan(this.start, tasks);
    }
  };

  H.HTN.Planner = function Planner(config) {

    var defs = {
          logstack:        [],   // collect messages 
          verbose:          0,   // defines a threshhold
          msecs:            0,   // duration of seekPlan
          depth:            0,   // current search depth
          iterations:       0,   // a counter
          maxDepth:       200,   // seeking stops here
          maxIterations:  300,   // seeing stops here
          domain:        null,   // defines the domain within an app
          methods:       null,   // object holding the methods
          operators:     null,   // object holding the operators
          tasks:         null,   // the tasks given on first call
          state:         null,   // the state given on first call
          operations:    null    // the final task list
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
    plan: function plan (state, tasks){

      var t0, t1;

      this.state = state;
      this.tasks = tasks;

      this.msecs = 0;
      this.depth = 0;
      this.stack = [];
      this.logstack = [];
      this.iterations = 0;
      this.log(1, fmt("START: tasks: %s, state: %s", tasks.map(pritt), pritj(state)));

      this.stack.push([state, tasks, [], this.depth]);
      
      t0 = Date.now();
      [this.operations, this.result, this.error] = this.seekPlan();
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
    seekPlan: function seekPlan () {

      var state, tasks, plan, depth, exit, 
          task, name, result, newstate, newPlan, subtasks, newTasks;

      while (this.stack.length) {

        [state, tasks, plan, depth] = this.stack.pop();

        this.depth = depth > this.depth ? depth : this.depth; // Math.max(depth, this.depth); 
        this.iterations += 1;

        exit = (
          // prefered outcome
          !tasks.length                        ? [plan, state] :
          this.depth      > this.maxDepth      ? [plan, state, fmt("too deep ( %s )", this.depth)] : 
          this.iterations > this.maxIterations ? [plan, state, fmt("too many iterations ( %s )", this.iterations)] :
            null
        );

        if (exit){return exit;}

        task = tasks[0];
        name = task[0].name;

        if (name === "ANY") {

          result = this.seekAnyMethod(state, tasks, plan, ++this.depth);
          if (result){this.stack.push(result);}

        } else if (this.operators.hasOwnProperty(name)){

          newstate = task[0](copy(state), task[1], task[2]);

          if (newstate){
            this.log(2, () => "OP: " + pritt(task));
            newPlan  = plan.concat([[task[0].name, task[1], task[2]]]);
            this.stack.push([newstate, tasks.slice(1), newPlan, ++this.depth]);
          }

        } else if (this.methods.hasOwnProperty(name)){

          subtasks = task[0](state, task[1], task[2]);

          if (subtasks){
            this.log(2, () => "MT: " + pritt(task));
            newTasks = subtasks.concat(tasks.slice(1));
            this.stack.push([state, newTasks, plan, ++this.depth]);
          }

        }

      }

      return (
        // if task was valid 
        depth > 1 ? [plan, state] : 
        // if valid solution
        plan  ? [plan, state] : 
        // first task not valid
        [plan, state, fmt("no solution for task: [%s, %s], depth: %s", name, tasks[0][1], depth)]
      );

    },
    seekAnyMethod: function seekAnyMethod (state, tasks, plan, depth){

      var anyTasks = tasks[0][1], anyPointer = 0, anyTask, 
          i, len, subtasks, anySubTasks, newTasks,
          pushUnique = H.HTN.Helper.pushUnique;

      while ((anyTask = anyTasks[anyPointer++])) {

        this.log(2, () => fmt("AT: (%s/%s) [%s: %s, %s]", anyPointer, anyTasks.length, anyTask[0].name, anyTask[1], anyTask[2] || ""));

        this.iterations += 1;
        subtasks = anyTask[0](state, anyTask[1], anyTask[2]);

        if(subtasks){

          if (subtasks[0][0].name === "ANY"){
            depth += 1;
            anySubTasks = subtasks[0][1];
            len = anySubTasks.length;
            for (i=0; i<len; i++){pushUnique(anySubTasks[i], anyTasks);}

          } else {
            newTasks = subtasks.concat(tasks.slice(1));
            return [state, newTasks, plan, depth];

          }

        }    

      }

      return null;

    }


  };

return H; }(HANNIBAL));

