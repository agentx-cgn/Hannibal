/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL_DEBUG, Engine, API3, print, uneval */

/*--------------- H A N N I B A L ---------------------------------------------

  This is loaded first by 0 A.D.
  Home: https://github.com/noiv/Hannibal/blob/master/README.md

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

  Credits:

    kmeans: 
    helper:

*/

/* 
  loading sequence:
    _debug
    _hannibal
    _lhelper
    _logger
    a-z

*/


// very first line, enjoy the rest
print("--------: HANNIBAL.MODUL: " + new Date() + " --- ### --- ### --- ### ---\n");

Engine.IncludeModule("common-api");

var HANNIBAL = (function() {

  var H = {

    MODULESTART: Date.now(),

    API:      API3, 
    AI:       {}, 
    LIB:      {}, 
    HTN:      {Economy: {}, Helper: {}}, 
    DSL:      {Nouns: {}}, 
    Data:     {Groups: {}}, 
    Groups:   {},
    Geometry: {},
    
    throw: function(){
      var 
        msg = H.format.apply(null, H.toArray(arguments)),
        stack = new Error().stack.split("\n").slice(1);
      H.deb();
      H.deb(msg);
      stack.forEach(line => H.deb("  " + line));      
      throw "\n*\n*";
    },
    
    extend: function (o){
      Array.prototype.slice.call(arguments, 1)
        .forEach(e => {Object.keys(e)
          .forEach(k => o[k] = e[k]
    );});},
    
    chat: function(id, msg){
      Engine.PostCommand(id, {"type": "chat", "message": id + "::" + msg});
    },

  };

  /*

    MIXINS,

  */
  
  // Serializer needs: this.[klass, name, context, imports])
  H.LIB.Serializer = function(){};
  H.LIB.Serializer.prototype = {
    constructor: H.LIB.Serializer,
    toString: function(){return H.format("[%s %s:%s]", this.klass || "no klass", this.context.name, this.name || "no name");},
    deb: function(){this.context.launcher.deb.apply(this, arguments);},
    log: function(){this.deb("   %s: logging", this.name.slice(0,3).toUpperCase());},
    logtick: function(){this.deb("   %s: logticking", this.name.slice(0,3).toUpperCase());},
    serialize: function(){return {};},
    deserialize: function(){return this;},
    initialize: function(){return this;},
    finalize: function(){return this;},
    activate: function(){return this;},
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function(context){
      context.data[this.klass] = this.serialize();
      return new H.LIB[H.noun(this.name)](context);
    },
  };  

return H;}());
