/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- P H A S E S -------------------------------------------------

  deals with some quirks how phases appear in cultures and mods


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Phases = function(context){

    this.name = "phases";
    this.context = context;
    this.imports = [
      "query",
      "culture",
      "templates",
      "techtemplates",
    ];

    H.extend(this, {
      "1" : {idx: 1, abbr: "vill", next: "", generic: "phase_village", alternates: ["vill", "phase_village"]},
      "2" : {idx: 2, abbr: "town", next: "", generic: "phase_town",    alternates: ["town", "phase_town"]},
      "3" : {idx: 3, abbr: "city", next: "", generic: "phase_city",    alternates: ["city", "phase_city"]},
      current: "",
    },
      context.saved[this.name]
    );

  };

  H.LIB.Phases.prototype = {
    constructor: H.LIB.Phases,
    log: function(){},
    initialize: function(){
      var test;
      function extract(str){
        if (str && str.contains("phase")){
          if (str.contains("village")){this["1"].alternates.push(str);}
          if (str.contains("town")){this["2"].alternates.push(str);}
          if (str.contains("city")){this["3"].alternates.push(str);}
        }
      }
      function check(key, tpl){
        if ((test = H.test(tpl, "Identity.RequiredTechnology"))){extract(test);}
        if ((test = H.test(tpl, "requirements.tech"))){extract(test);}
        if ((test = H.test(tpl, "requirements.any"))){test.filter(t => !!t.tech).forEach(t => extract(t.tech));}
      }
      H.each(this.templates, check); 
      H.each(this.techTemplates, check); 
      this["1"].alternates = H.unique(this["1"].alternates);
      this["2"].alternates = H.unique(this["2"].alternates);
      this["3"].alternates = H.unique(this["3"].alternates);
    },
    clone: function(context){
      return new H.LIB.Phases(context);
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
    },
    deserialize: function(){
      return {};
    },
    activate: function(){},
    finalize: function(){
      this.query(H.class2name("civilcentre") + " RESEARCH").forEach(node => {
        if (node.name.contains("town")){phases["1"].next = node.name;}
        if (node.name.contains("city")){phases["2"].next = node.name;}
      });
      deb("     T: phases: 1 next: %s, %s", phases["1"].next, uneval(phases["1"].alternates));
      deb("     T: phases: 2 next: %s, %s", phases["2"].next, uneval(phases["2"].alternates));
      deb("     T: phases: 3 %s", uneval(phases["3"].alternates));
    },
    tick: function(tick, secs){

      var t0 = Date.now();


      return Date.now() - t0;

    },
    find: function(phase){
      for (var i=1; i<=3; i++) {
        if (H.contains(this[i].alternates, phase)){
          return this[i];
        }
      } 
      return undefined; //H.throw("phases.find: '%s' unknown", phase);
    },

  };

  var phases = H.Phases = {
      "1" : {idx: 1, abbr: "vill", next: "", generic: "phase_village", alternates: ["vill", "phase_village"]},
      "2" : {idx: 2, abbr: "town", next: "", generic: "phase_town",    alternates: ["town", "phase_town"]},
      "3" : {idx: 3, abbr: "city", next: "", generic: "phase_city",    alternates: ["city", "phase_city"]},
      current: "",
      prev: function(phase){return phases[(phases.find(phase).idx - 1) || 1];},
      init: function(){
      },
    };

return H; }(HANNIBAL));