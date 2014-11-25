/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- T O O L S ---------------------------------------------------

  Some useful objects for Hanninbal


  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H) {

  H.Tools = H.Tools || {};

  // a NOP function
  H.FNULL = function(){};

  // sanitizes template names to dot notaton
  H.saniTemplateName = function(nameTemplate){
    nameTemplate = H.replace(nameTemplate,  "|", ".");
    nameTemplate = H.replace(nameTemplate,  "_", ".");
    nameTemplate = H.replace(nameTemplate,  "/", ".");
    return nameTemplate.toLowerCase();
  };

  H.Damper = function(fnDamper){
    this.level = 0;
    this.last = 0;
    this.damper = fnDamper;
    };

    H.Damper.prototype = {
      constructor: H.Damper,
      increase: function(value){this.level += value;},
      tick: function(time){
        this.level = this.damper.call(this, time);
        this.last = time;
      }
    };

    H.Dampers = {
      quadratic: function(time){
        var diff = time - this.damper.last;
        return Math.sqrt((this.level + 1)/diff) -1;
      }
    };

  H.health = function(ids){

    // calcs health of an array of ent ids

    var curHits = 0, maxHits = 0;

    ids.forEach(function(id){
      if (!H.Entities[id]){
        deb("WARN  : Tools.health: id: %s in ids, but not in entities, type: %s", id, typeof id);
      } else {
        curHits += H.Entities[id].hitpoints();
        maxHits += H.Entities[id].maxHitpoints();
      }
    });

    return ids.length ? (curHits / maxHits * 100).toFixed(1) : NaN;

  };

  // H.class2name = function(klass){return H.QRY(klass + " CONTAIN").first().name;};

  H.cost2flow = function (cost){
    return {
      food:  cost.food/cost.time,
      wood:  cost.wood/cost.time,
      stone: cost.stone/cost.time,
      metal: cost.metal/cost.time
    };
  };

  H.maxFlow = function (a,b){
    return {
      food:  Math.max(a.food, b.food).toFixed(1),
      wood:  Math.max(a.wood, b.wood).toFixed(1),
      stone: Math.max(a.stone, b.stone).toFixed(1),
      metal: Math.max(a.metal, b.metal).toFixed(1),
    };
  };

  // H.getFlowFromClass = function(klass){

  //   return H.attribs(H.Bot.tree.nodes[H.class2name(klass)].products.train)
  //     // .map(function(name){deb(" TOOLS: getFlowStructure: %s %s %s", klass, name, uneval(H.QRY(name).first().costs)); return name;})
  //     .map(name => H.QRY(name).first().costs)
  //     .map(costs => cost2flow(costs))
  //     .reduce(reduceFlow, {food:0,wood:0,stone:0,metal:0});
  // };

  // H.getFlowFromTrainer = function(name){

  //   return H.attribs(H.Bot.tree.nodes[name].products.train)
  //     // .map(function(name){deb(" TOOLS: getFlowStructure: %s %s %s", klass, name, uneval(H.QRY(name).first().costs)); return name;})
  //     .map(name => H.QRY(name).first().costs)
  //     .map(costs => cost2flow(costs))
  //     .reduce(reduceFlow, {food:0,wood:0,stone:0,metal:0});
  // };




  // H.States = Proxy.create({  // sanitize UnitAI state
  //   get: function (proxy, id) {
  //     return (
  //       H.Entities[id] && H.Entities[id]._entity.unitAIState ? 
  //         H.replace(H.Entities[id]._entity.unitAIState.split(".").slice(-1)[0].toLowerCase(), "ing", "") :
  //         undefined
  //     ); 
  //   }
  // });  

  H.Iterator = function ( /* arguments */ ) {

    // infinite... !!!! wating for SM32
    // http://www.tuicool.com/articles/3MBJj2z

    var 
      args = H.toArray(arguments),
      al = args.length,
      fn = args.slice(-1),
      fnArgs = args.slice(0, al -1),
      iter = fn.apply(null, fnArgs);

    return function () {return iter.next().value;};

  };

  /*

    function Iterator (init, fn){
      var iter = fn(init);
      return function () {return iter.next().value;}
    }

    var a = [];
    // var test = Iterator(5, function * (p) {var counter = 0; while(true) {yield String( ++counter) + p;}});
    var test = Iterator(5, function * (p) {var counter = 0; while(true) {yield String( ++counter) + p;}});

  */



  H.Task = (function(){

    // generates autoincrement numbers

    var counter = 0;
    return {
      get id () {return ++counter;}
    };
  }());

  H.LIB.Objects = function(){

    // keeps track of objects and their IDs
    
    var o = {}, p = 0;
    return function (x) {
      if (x === undefined){return o;}
      if (typeof x === "object") {p += 1; o[p] = x; return p;}
      return o[x];
    };
  };

  H.Triggers = (function(){

    // calls functions + params at a given tick or diff

    var i, len, pointer = 0, actions = [], dels = [], t0;

    return {
      info: function(){return actions.length;},
      add:  function(ticks, action){
        // negative indicates a diff, default = zero = next, positive = absolute,
        ticks = ticks || -1;
        action.tick = (ticks < 1) ? pointer + Math.abs(ticks) -1 : ticks;
        actions.push(action);
      },
      tick: function(){
        t0 = Date.now(); dels = []; len = actions.length; pointer += 1;
        for (i=0; i<len; i++) {
          if(actions[i].tick < pointer){
            actions[i](); 
            dels.push(actions[i]);
          }
        }
        dels.forEach(function(del){
          actions.splice(actions.indexOf(del), 1);
        });
        return Date.now() - t0;
      }
    };

  }());
     

  H.Numerus = (function(){

    // a statistics extension, interacts with launcher.py

    var ss, gs, key = 0, resolution = 10;

    function out (data) {print(data + "\n");}
    function append (data){out("#! append 1 :" + data);}

    function tickData(id){
      var pd = ss.playersData[id],
          data  = {
            player: id,
            name:   pd.name,
            team:   pd.team,
            civ:    pd.civ,
            color:  pd.color,
          };
      return JSON.stringify(data);
    }

    function tickLine(id, what){

      var data, pd = ss.playersData[id], st = pd.statistics;

      data = {
        key:        key,
        secs:       (gs.timeElapsed/1000).toFixed(1),
        pid:        id,
        phase:      pd.phase,
        food:       pd.resourceCounts.food,
        wood:       pd.resourceCounts.wood,
        stone:      pd.resourceCounts.stone,
        metal:      pd.resourceCounts.metal,
        tresaure:   st.treasuresCollected,
        unitsLost:  st.unitsLost.total,
        unitsTrai:  st.unitsTrained.total,
        bldgsCons:  st.buildingsConstructed.total,
        bldgsLost:  st.buildingsLost.total,
        kills:      st.enemyUnitsKilled.total,
        popcnt:     pd.popCount,
        popcap:     pd.popLimit,
        popmax:     pd.popMax,
        explored:   st.percentMapExplored,
        techs:      Object.keys(pd.researchedTechs).length,
        // msecs:      H.Launcher.timing.all,
      };

      key += 1;

      return ( what === "row" ? 
        Object.keys(data).map(a => data[a]).join(";") + "\n" :
        Object.keys(data).join(";") + "\n"
      );

    } 

    return {
      init: function(sharedscript, gamestate){
        ss = sharedscript;
        gs = gamestate;
        resolution = H.Config.numerus.resolution;
        deb();deb("NUMRUS: Logging every %s ticks to: %s", resolution, H.Config.numerus.file);
        out("#! open 1 " + H.Config.numerus.file);
        out("#! append 1 :# Numerus Log from: " + new Date());
        H.each(ss.playersData, function(id){
          id = ~~id;
          if (id){append("# " + tickData(id, "row"));}
        });
        out("#! append 1 :" + tickLine(1, "head"));
      },
      tick: function(secs, ticks, sharedscript){
        ss = sharedscript;
        if (~~ticks % resolution === 0) { 
          H.each(ss.playersData, function(id){
            id = ~~id;
            if (id){append(tickLine(id, "row"));}
          });
        }    
      }
    };

  }());  



  H.Checker = function (context) { // state
    H.extend(this, context, {
      // planner: new H.HTN.Planner({
      //   name:         "check.planner",
      //   operators:    H.HTN.Economy.operators,
      //   methods:      H.HTN.Economy.methods,
      // })
    });
  };

  H.Checker.prototype = {
    constructor: H.Checker,
    test: function(){
      var self = this;
      [ 
        H.class2name("civcentre"),
        H.class2name("farmstead"),
        "gather.capacity.wheelbarrow",
        H.class2name("temple"),
        "phase.city",
        H.class2name("fortress"),
        "XXXXX",
        "",
      ].forEach( name => {
        deb(" CHECK: '%s'", name);
        var result = self.check(name, true);
        deb("     C: %s", JSON.stringify(result));
      });      
    },
    check: function(name, debug=false){

      // TOCHECK: What about units, resources and item = phase

      // possible results:
      // illegal, planner has error
      // notnow, needs subsequent phase 
      // feasible, in current phase
      // available, only one operation needed
      // done, no operations needed

      var 
        t0 = Date.now(),
        tree = this.tree.nodes,
        planner = this.planner,
        state = this.curstate || this.state, // a bit hacky
        data, goal, operations, 
        // tree = H.Bot.tree.nodes, 
        // state = H.HTN.Economy.getCurState(),
        result = {needed: [], cost: null},
        checkops = {
          // "start": null,
          "build_structures": true,
          "research_tech": true,
          "train_units": true,
          // "finish": null,
        };
      
      // valid name
      if (!tree[name] || !tree[name].verb){
        if (debug){deb(" CHECK: no verb/node: %s",  name);}
        result.illegal = true; 
        return result;
      }

      // valid verb
      if (tree[name].verb === "research"){
        data = {tech: [name]};
      } else if (tree[name].verb === "train" || tree[name].verb === "build"){
        data = {ents: {}}; data.ents[name] = 1;
      } else {
        result.illegal = true; return result;
      }

      // run
      goal = new H.HTN.Helper.State(data).sanitize();
      planner.plan(state, [[planner.methods.start, goal]]);
      result.time = Date.now() - t0;

      // valid outcome
      if (planner.error){
        if (debug) {
          planner.logstack.forEach(l => {
            deb(" CHECK: log: %s", l.m);
          });
        }
        result.illegal = true; return result;
      }

      // filter ops
      operations = planner.operations.filter(op => !!checkops[op[1]]);

      if (debug){
        deb("     C: operations:");
        operations.forEach(function(op){
          deb("     C: - %s", op.filter(o => o !== undefined).join(", "));
        });  
      }

      if (operations.length === 0){
        result.done = true; return result;
      }

      if (operations.length === 1){
        result.available = true; return result;
      }

      if (operations.some(op => op[1] === "research_tech" && op[2].contains("phase"))){
        result.notnow = true; return result;
      } else {
        result.feasible = true; return result;
      }

      return result;

    }    


  };

  H.Slicer = function(arr){
    return new Proxy(arr, {
      get: function (arr, arg){

        /**
         * Pythonic array slicing
         *
         * By Afshin Mehrabani (@afshinmeh)
         */

          // a = [1,2,3,4,5,6,7]
          // a[:]           [1, 2, 3, 4, 5, 6, 7]
          // a[0]           1
          // a[1:]          [2, 3, 4, 5, 6, 7]
          // a[:1]          [1]
          // a[1:1]         []
          // a[2:1]         []
          // a[1:2]         [2]
          // a[1:3]         [2, 3]
          // a[:0]          []
          // a[:2]          [1, 2]
          // a[:-1]         [1, 2, 3, 4, 5, 6]
          // a[:-2]         [1, 2, 3, 4, 5]
          // a[:-0]         []
          // a[-1:]         [7]
          // a[-3:]         [5, 6, 7]
          // a[-1:-3]       []
          // a[-1:-3:-1]    [7, 6]
          // a[-3:-1]       [5, 6]
          // a[-3:-1:1]     [5, 6]
          // a[-3:-1:-1]    []
          // a[-3:-1]       []


        var 
          expr  = arg.trim(),
          parts = expr.split(":"),  
          from = isNaN(parts[0]) ? 0 : ~~parts[0], 
          to   = isNaN(parts[1]) ? arr.length : ~~parts[1], 
          step = isNaN(parts[2]) ? 1 : ~~parts[2], 
          stepOnly = isNaN(parts[0]) && isNaN(parts[1]),
          reversed = false,
          i, slicedArr, alteredArray, arrLength;

        if (arr.length === 0 || expr === ":" || !parts.length || (isNaN(from) && isNaN(to) && isNaN(step))) {
          return arr;
        }

        //set default for both from and to if they are not defined
        // if (isNaN(parts[0]) && isNaN(parts[1])) {
        //   stepOnly = true;
        //   from = 0;
        //   to = arr.length;
        // }

        console.log("from", from, "to", to, "step", step);

        //reverse the array if we have negative values
        if (from < 0 || to < 0 || step < 0) {

          arr = arr.slice().reverse();
          reversed = true;

            //swap from and to
          if (!stepOnly) {[from, to] = [to, from];}

          to   = Math.abs(to);
          from = isNaN(from) ? to -1 : Math.abs(from);
          step = Math.abs(step);

        }

        //set default from
        if (typeof (from) == "undefined") {from = 0;}
        //set default to
        if (isNaN(to)) {to = from + 1;}

        //slice the array with from and to variables
        slicedArr = arr.slice(from, to);

        //return sliced array if there is no step value
        if (isNaN(step)) {
          return reversed ? slicedArr.reverse() : slicedArr;
        }

        alteredArray = [];
        for (i = 0, arrLength = slicedArr.length; i < arrLength; i += step) {
          alteredArray.push(slicedArr[i]);
        }

        return reversed && !stepOnly ? alteredArray.reverse() : alteredArray;

      }

    });
  };


return H;}(HANNIBAL));

