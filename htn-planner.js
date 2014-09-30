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

  var // simple templates
      fmt = function (){
        var c=0, a=Array.prototype.slice.call(arguments); a.push("");
        return a[0].split("%s").map(function(t){return t + a.slice(1)[c++];}).join('');
      },
      // JSON w/o quotes
      pritj = function(o){return JSON.stringify(o).split('"').join("");},
      // prettyfies a task
      pritt = function(task){return fmt("[%s: %s]", task[0].name, task.slice(1).join(", "));};

  H.HTN = H.HTN || {};                       

  H.HTN.Planner = function Planner(config) {

    var defaults = {
      name:     "unknown",   // log indentifier    
      logstack:        [],   // collect messages 
      verbose:          0,   // defines a log threshhold
      msecs:            0,   // duration of seekPlan
      depth:            0,   // current search depth
      iterations:       0,   // a counter
      maxDepth:       200,   // seeking stops here
      maxIterations:  300,   // seeing stops here
      tree:          null,   // 
      // domain:        null,   // defines the domain within an app
      // noInitialize: false,   // suppress domain initialization
      methods:       null,   // object holding the methods
      operators:     null,   // object holding the operators
      tasks:         null,   // the tasks given on first call
      state:         null,   // the state given on first call
      operations:    null    // the final task list
    };

    H.extend(this, defaults, config || {});

    // if (this.domain.initialize && !this.noInitialize){this.domain.initialize(this);}
    // this.methods   = this.domain.methods;
    // this.operators = this.domain.operators;

  };

  H.HTN.Planner.prototype = {
    constructor:  H.HTN.Planner,
    log: function(verbose, msg){
      if (verbose <= this.verbose){
        this.logstack.push({
          v: verbose, 
          d: this.depth, 
          m: typeof msg !== "function" ? msg : msg(), 
          now: Date.now()
        });
      }
    },
    plan: function plan (state, tasks){

      var t0, t1;

      this.error = undefined;

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
        this.operations.unshift([0, "start"]);
        this.operations.push([this.result.stamp, "finish"]);
        this.log(0, fmt("SUCCESS: plan: %s ops, depth: %s, iter: %s, msecs: %s",
          this.operations.length, this.depth, this.iterations, this.msecs));

      }

      return this;

    },
    seekPlan: function seekPlan () {

      var state, tasks, plan, depth, exit, stamp,
          task, name, result, newstate, newPlan, subtasks, newTasks;

      while (this.stack.length) {

        [state, tasks, plan, depth] = this.stack.pop();

        this.depth = depth > this.depth ? depth : this.depth; // Math.max(depth, this.depth); 
        this.iterations += 1;

        exit = (
          // prefered outcome
          !tasks.length                        ? [plan, state, undefined] :
          this.depth      > this.maxDepth      ? [plan, state, fmt("too deep ( %s )", this.depth)] : 
          this.iterations > this.maxIterations ? [plan, state, fmt("too many iterations ( %s )", this.iterations)] :
            null
        );

        if (exit){return exit;}

        task  = tasks[0];
        name  = task[0].name;
        stamp = state.stamp;

        if (name === "ANY") {

          result = this.seekAnyMethod(state, tasks, plan, ++this.depth);
          if (result){this.stack.push(result);}

        } else if (this.operators.hasOwnProperty(name)){

          newstate = task[0](state.clone(), task[1] || undefined, task[2] || undefined, task[3] || undefined);

          if (newstate){
            this.log(2, () => "OP: " + pritt(task));
            newPlan  = plan.concat([[stamp, task[0].name, task[1], task[2], task[3]]]);
            this.stack.push([newstate, tasks.slice(1), newPlan, ++this.depth]);
          }

        } else if (this.methods.hasOwnProperty(name)){

          subtasks = task[0](state, task[1] || undefined, task[2] || undefined, task[3] || undefined);

          if (subtasks){
            this.log(2, () => "MT: " + pritt(task));
            newTasks = subtasks.concat(tasks.slice(1));
            this.stack.push([state, newTasks, plan, ++this.depth]);
          }

        }

      }

      return (
        // if task was valid 
        depth > 1 ? [plan, state, undefined] : 
        // if valid solution
        plan  ? [plan, state, undefined] : 
        // first task not valid
        [plan, state, fmt("no solution for task: [%s, %s], depth: %s", name, tasks[0][1], depth)]
      );

    },
    seekAnyMethod: function seekAnyMethod (state, tasks, plan, depth){

      var anyTasks = tasks[0][1], anyPointer = 0, anyTask, 
          i, len, subtasks, anySubTasks, newTasks,
          pushUnique = H.HTN.Helper.pushUnique;

      while ((anyTask = anyTasks[anyPointer++])) {

        this.log(2, () => fmt("AT: (%s/%s) [%s: %s, %s, %s]", anyPointer, anyTasks.length, anyTask[0].name, anyTask[1], anyTask[2]||'', anyTask[3]||''));

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

