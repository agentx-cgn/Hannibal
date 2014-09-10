/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- T O O L S ---------------------------------------------------

  Some useful objects for Hanninbal


  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H) {

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

  H.Proxies = {

    Technologies: function(){
      var mapper = {};
      H.each(H.SharedScript._techTemplates, function(key){
        mapper[H.saniTemplateName(key)] = key;
      });
      return new Proxy(H.SharedScript._techTemplates, {
        get: function(proxy, attr){
          var tpln = mapper[attr] || undefined;
          return (
            proxy[attr] !== undefined ? proxy[attr] : 
            proxy[tpln] !== undefined ? proxy[tpln] : 
            attr === "available"      ? function (techs){
              return techs.map(t => mapper[t]).every(t => !!H.Player.researchedTechs[t]); } :
            undefined
          );
        }
      });
    }
    
  };


  H.States = Proxy.create({  // sanitize UnitAI state
    get: function (proxy, id) {
      return (
        H.Entities[id] && H.Entities[id]._entity.unitAIState ? 
          H.replace(H.Entities[id]._entity.unitAIState.split(".").slice(-1)[0].toLowerCase(), "ing", "") :
          undefined
      ); 
    }
  });  

  H.Objects = (function(){

    // keeps track of objects and their IDs
    
    var o = {}, p = 0;
    return function (x) {
      if (x === undefined){return o;}
      if (typeof x === "object") {p += 1; o[p] = x; return p;}
      return o[x];
    };
  }());

  H.Triggers = (function(){

    // calls functions + params at a given tick or diff

    var i, len, pointer = 0, actions = [], dels = [], t0;
    return {
      info: function(){return actions.length;},
      add:  function(action, ticks){
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

    // a statistics extension, interacts with launcher

    var ss, key = 0, resolution = 10;

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
        secs:       (H.GameState.timeElapsed/1000).toFixed(1),
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
        msecs:      H.Bot.timing.all,
      };

      key += 1;

      return ( what === "row" ? 
        Object.keys(data).map(a => data[a]).join(";") + "\n" :
        Object.keys(data).join(";") + "\n"
      );

    } 

    return {
      init: function(){
        ss = H.SharedScript;
        resolution = H.Config.numerus.resolution;
        deb();deb();deb(" STATS: Logging every %s ticks to: %s", resolution, H.Config.numerus.file);
        out("#! open 1 " + H.Config.numerus.file);
        out("#! append 1 :# Numerus Log from: " + new Date());
        H.each(ss.playersData, function(id){
          id = ~~id;
          if (id){append("# " + tickData(id, "row"));}
        });
        out("#! append 1 :" + tickLine(1, "head"));
      },
      tick: function(secs, ticks){
        if (~~ticks % resolution === 0) { 
          H.each(ss.playersData, function(id){
            id = ~~id;
            if (id){append(tickLine(id, "row"));}
          });
        }    
      }
    };

  }());  


H.Behaviour = function(behaviour){

  // Selects the new or current frame for execution, returns frame after

  this.behaviour = behaviour;
  this.name   = behaviour.name;
  this.boss   = behaviour.name.split(":")[0];
  this.prefix = behaviour.name.split(":").slice(0, -1).join(":");
  this.level  = ~~behaviour.name.split(":").slice(-1);
  this.frame  = H.Hannibal.Frames[this.dub(behaviour.entry)];
  if (!this.frame) {
    deb("Behaviour: unknown frame: %s, name: %s", this.dub(behaviour.entry), this.name);
    deb("  ");
  }
  this.stack = [this.frame.name];

  this.done        = "";

};

H.Behaviour.prototype = {
  constructor: H.Behaviour,
  toString:    function(){return "[Behaviour " + this.name + "]";},
  debDone:     function(){return H.format("%s %s", this.name, this.done);},
  dub:         function(frameName){return this.prefix + "." + frameName;},
  process:     function(/* [me, [arguments]] */){

    var self = this, frame, 
        childNames, childs, candidates, tasks,
        args = Array.prototype.slice.call(arguments),
        me   = args.length ? args[0] : {},
        rest = args.slice(1);

    // check for exit to parent

    // deb("Behaviour.process.stack: %s", this.stack.join(", "));

    this.done = ""; // debug

    if (this.frame.checkExit()){
      frame = this.stack.pop();
      self.done = H.format("left %s on %s to %s", this.frame.name, this.frame.exitConds.join(", "), frame);
      return H.Hannibal.Frames[this.dub(frame)].process(me, rest);
    }

    // check for enter into child

    childNames = this.behaviour[this.frame.name].filter(function(name){
      // real childs have an entry in behaviour
      return !!self.behaviour[name];
    });


    childs = childNames.map(function(name){
      return H.Hannibal.Frames[self.dub(name)];
    });    

    candidates = childs.filter(function(child){
      return child.checkEnter();
    });

    if (candidates.length){
      // choosing first implements priorities
      self.done = H.format("entered %s based on [%s]", candidates[0].name, candidates[0].entryConds.join(", "));
      this.stack.push(candidates[0].name);

      return (this.frame = candidates[0].process(me, rest));
    }


    // still here? do our stuff, tasks first

    tasks = this.behaviour[this.frame.name].filter(function(task){
      // tasks have no entry in behaviour

      // deb("   BHV: process: %s", self.dub(task));

      return !self.behaviour[task] && H.Hannibal.Frames[self.dub(task)].checkEnter();
    });

    tasks.forEach(function(task){
      self.done += "-" + task;
      H.Hannibal.Frames[self.dub(task)].process(me, args);
    });

    // now this
    this.done += "+" + this.frame.name;
    return this.frame.process(me, args);

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
        parts = expr.split(':'),  
        from = isNaN(parts[0]) ? 0 : ~~parts[0], 
        to   = isNaN(parts[1]) ? arr.length : ~~parts[1], 
        step = isNaN(parts[2]) ? 1 : ~~parts[2], 
        stepOnly = isNaN(parts[0]) && isNaN(parts[1]),
        reversed = false,
        i, slicedArr, alteredArray, arrLength;

      if (arr.length === 0 || expr === ':' || !parts.length || (isNaN(from) && isNaN(to) && isNaN(step))) {
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
      if (typeof (from) == 'undefined') {from = 0;}
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

