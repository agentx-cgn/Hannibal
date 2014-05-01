/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Hannibal, H, deb, */

/*--------------- B E H A V I O U R ---------------------------------------

  Selects the new or current frame for execution, returns frame after



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = function(H){

H.Hannibal.Behaviour = function(behaviour){

  this.behaviour = behaviour;
  this.name   = behaviour.name;
  this.boss   = behaviour.name.split(":")[0];
  this.prefix = behaviour.name.split(":").slice(0, -1).join(":");
  this.level  = ~~behaviour.name.split(":").slice(-1);
  this.frame  = H.Hannibal.Frames[this.dub(behaviour.entry)];
  if (!this.frame) {
    deb("Hannibal.Behaviour: unknown frame: %s, name: %s", this.dub(behaviour.entry), this.name);
    deb("  ");
  }
  this.stack = [this.frame.name];

  this.done        = "";

};

H.Hannibal.Behaviour.prototype = {
  constructor: H.Hannibal.Behaviour,
  toString:    function(){return "[Behaviour " + this.name + "]";},
  debDone:     function(){return H.format("%s %s", this.name, this.done);},
  dub:         function(frameName){return this.prefix + "." + frameName;},
  process:     function(/* [me, [arguments]] */){

    var self = this, frame, 
        childNames, childs, candidates, tasks,
        args = Array.prototype.slice.call(arguments),
        me   = args.length ? args[0] : {},
        args = args.length > 1 ? args.slice(1) : [];

    // check for exit to parent

    // deb("Behaviour.process.stack: %s", this.stack.join(", "));

    this.done = ""; // debug

    if (this.frame.checkExit()){
      frame = this.stack.pop();
      self.done = H.format("left %s on %s to %s", this.frame.name, this.frame.exitConds.join(", "), frame);
      return H.Hannibal.Frames[this.dub(frame)].process(me, args);
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

      return this.frame = candidates[0].process(me, args);
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

return H; }(HANNIBAL);
