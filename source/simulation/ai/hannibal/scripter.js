/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, HANNIBAL_DEBUG, Engine */

/*--------------- T E S T E R -------------------------------------------------

  fires a set of functions at given tick, useful to test bot on specific maps
  sequence keys are documented in maps/readme-maps.md
  active sequence comes from 



  V: 0.1, agentx, CGN, Feb, 2014

*/

/*
        "5": [() => H.Grids.dump(), "dumping maps"],
        http://www.semicomplete.com/projects/xdotool/xdotool.xhtml#mouse_commands
*/


HANNIBAL = (function(H){

  var sequences = {

    "*": function (T) { return {

      "1": [ "... idle, 4 * 3 wood",     // size, quantity
        T.launch  ("g.idle",     3),         
        T.supplier("wood",      20), 
        // T.supplier("wood",     10), 
        // T.supplier("wood",      3), 

      ], "2": [ "... speed",
        T.builder ("house",      4,  2), 
        T.builder ("house",      4,  2),

      ], "3": [ "... speed",
        T.speed(3),

      ],
    

    };}, "random/brainland": function (T) { return {

      " t % 100 | (w, f) => (w+f) > 1600": [ "... phase town",
        T.research("phase.town")
      
      ], " t % 200 | (w, f) => (w+f) > 1600": [ "... phase city",
        T.research("phase.city")
      
      ], " t % 300 | (w, f, tec) => (f+s) > 1000 && tec('phase.city')": [ "... fortress",
        T.builder ("fortress",  20, 1), 
      

      ], "1": [ "... 2 * 4 house, 2 barracks",     // size, quantity
        T.launch  ("g.idle",     3),         
        T.builder ("house",      4,  2), 
        T.builder ("house",      4,  2),
        T.builder ("barracks",   4,  1),
        T.builder ("barracks",   4,  1),
      
      ], "2": [ "... 4 harvester, 2 * 4 house",
        T.launch  ("g.harvester"),         
        T.launch  ("g.harvester"),         
        T.launch  ("g.harvester"),         
        T.launch  ("g.harvester"),         
        T.launch  ("g.harvester"),         
        T.builder ("house",      4,  8),
        T.builder ("house",      4,  8),
      
      ], "3": [ "... speed",
        T.speed(3),

      ], "4": [ "... 4 wood, fruit, meat",
        T.supplier("wood",      10), 
        T.supplier("wood",      10), 
        T.supplier("wood",      10), 
        T.supplier("wood",      10), 
        T.supplier("food.fruit", 2), 
        T.supplier("food.meat",  2), 
        
      ], "5": [ "... farmstead, storehouse",
        T.builder ("farmstead",  2,  2), 
        T.builder ("storehouse", 3,  2), 
      
      ], "6": [ "... metal, stone",
        T.supplier("metal",      5), 
        T.supplier("stone",      5), 
      
      ],

    };},
  
  }; 


  H.LIB.Scripter = function(context){

    H.extend(this, {

      context:  context,

      klass:    "scripter",
      parent:   context,
      name:     context.name + ":scripter",

      imports:  [
        "id",
        "groups",
        "villages",
        "entities",
        "effector",
        "class2name",
      ],

      mapname: "",
      cc:      NaN,
      ccpos :  null,

    });

  };


  H.LIB.Scripter.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    prepare: function(seqmap){
      this.cc = this.villages.main;
      this.ccpos = this.entities[this.cc].position();
      this.ccloc = () => this.ccpos[0] + ", " + this.ccpos[1];
      this.mapname  = sequences[seqmap] ? seqmap : "*";
      this.sequence = sequences[this.mapname](this);
      this.evaluator = this.evaluate.bind(this);
      this.deb("INFO  : TESTER.activated sequence: %s, PID: %s", this.mapname, this.id);
    },
    tick: function(secs, ticks){

      var t0 = Date.now(), triggers;

      if (this.sequence){
        if ((triggers = this.sequence[ticks] )){
          this.deb("SCRIPT: found %s actions for tick %s", triggers.length, ticks);
          triggers.forEach(this.evaluator);
        }
      } else {
        this.deb("SCRIPT: NO SEQUENCE found: mapname: %s, seq: %s", this.mapname, this.sequence);
      }
      return Date.now() - t0;
    },
    chat: function(){
      var DEB = HANNIBAL_DEBUG && HANNIBAL_DEBUG.bots ? HANNIBAL_DEBUG.bots[this.id] : {};
      if (DEB.cht === 1){
        this.effector.chat(H.format.apply(null, arguments));
      }
    },
    evaluate: function(item){
      return (
        typeof item === "string"   ? this.chat("%s", item) :
        typeof item === "function" ? this.evaluator(item()) :
        Array.isArray(item) ? void (item.map(fn => fn())) :
          undefined
      );
    },    

  /* Helper in T 

    */

    speed: function(rate){
      return [
        () => print(this.id + "::## xdotool key F9\n"), 
        () => print(this.id + "::#! xdotool type --delay 30 Engine.SetSimRate(" + rate + ")\n"), 
        () => print(this.id + "::## xdotool key Return\n"),
        () => print(this.id + "::## xdotool key F9\n"),
      ];

    },
    camera: function(){
      return [
        () => print(this.id + "::## xdotool key F9\n"), 
        () => print(this.id + "::#! xdotool type --delay 30 Engine.CameraMoveTo(" + this.ccpos + ")\n"), 
        () => print(this.id + "::## xdotool key Return\n"),
        () => print(this.id + "::## xdotool key F9\n"),
      ];
    },
    research: function(tpl, id){
      return () => Engine.PostCommand(this.id, {type: "research", entity: id, template: tpl}); 
    },
    launch: function(group, size=0, quantity=0){
      return () => {
        return this.groups.launch({
          groupname: group, 
          cc: this.cc, 
          size: size, 
          quantity: quantity,
        });
      };
    },
    supplier: function(supply, size=0, quantity=0){
      return () => {
        this.groups.launch({
          groupname: "g.supplier", 
          cc: this.cc, 
          supply: supply,
          size: size, 
          quantity: quantity,
        });
      };
    },
    builder: function(building, size=0, quantity=0){
      return () => {
        var name = building.contains(".") ? building : this.class2name(building);
        if (name){
          this.groups.launch({
            groupname: "g.builder", 
            cc: this.cc, 
            building: name, 
            quantity: quantity, 
            size: size
          });
          return null;
        } else {
          H.thow("Scripter: Can't build: " + building);
          return null;
        }
      };
    },

  });

return H; }(HANNIBAL));
