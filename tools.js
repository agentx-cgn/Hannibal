/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, API3, deb, print, getAttribType, logObject, logObjectShort, logError, debug */

/*--------------- T O O L S ---------------------------------------------------

  Some useful objects for Hanninbal


  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


var HANNIBAL = (function(H) {


  // a NOP function
  H.FNULL = function(){};


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


  // keeps track of objects and their IDs
  H.Objects = (function(){
    var o = {}, p = 0;
    return function (x) {
      if (x === undefined){return o;}
      if (typeof x === "object") {p += 1; o[p] = x; return p;}
      return o[x];
    };
  }());

  // calls functions + params at a given tick or diff
  H.Triggers = (function(){
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

return H;}(HANNIBAL));