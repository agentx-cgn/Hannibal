/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- T O O L S ---------------------------------------------------

  Some useful objects/functions


  tested with 0 A.D. Alpha 18 Rhododactylus
  V: 0.1.1, agentx, CGN, Mar, 2015

*/


HANNIBAL = (function(H) {

  // sanitizes template names to dot notaton
  H.saniTemplateName = function(nameTemplate){
    nameTemplate = H.replace(nameTemplate,  "|", ".");
    nameTemplate = H.replace(nameTemplate,  "_", ".");
    nameTemplate = H.replace(nameTemplate,  "/", ".");
    return nameTemplate.toLowerCase();
  };

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

  H.Numerus = (function(){

    // a statistics extension, interacts with launcher.py

    var id, ss, gs, key = 0, resolution = 10;

    function out (data) {print(id + "::" + data + "\n");}
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
      init: function(pid, sharedscript, gamestate){
        id = pid;
        ss = sharedscript;
        gs = gamestate;
        resolution = H.Config.numerus.resolution;
        deb();
        deb("NUMRUS: Logging every %s ticks to: %s", resolution, H.Config.numerus.file);
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

return H;}(HANNIBAL));

