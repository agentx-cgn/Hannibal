/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, Engine */

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

  // see gui.engine.methods.txt for remote control

  var 
    T = H.T || {},
    CTX = null, PID = NaN, CC  = NaN, 
    self, tick = 0, sequence = "", 
    chat  = (msg) => Engine.PostCommand(PID, {"type": "chat", "message": msg}),
    ccloc = () => {
      var [x, y] = CTX.entities[CTX.villages.main].position();
      return x + ", " + y;
    };


  H.extend(T, {
    quit: function(){
      return () => Engine.PostCommand(PID, {"type": "quit"});
    },
    chat: function( /* arguments */ ){
      var msg = H.format.apply(null, H.toArray(arguments));
      return () => Engine.PostCommand(PID, {"type": "chat", "message": msg});
    },
    destroy: function(ids){ 
      ids = Array.isArray(ids) ? ids : arguments.length > 1 ? H.toArray(arguments) : [ids];
      return () => Engine.PostCommand(PID, {type: "delete-entities", "entities": ids});
    },
    research: function(tpl, id){
      return () => Engine.PostCommand(PID, {type: "research", entity: id, template: tpl}); 
    },
    launch: function(group){
      return () => {
        return CTX.groups.launch({groupname: group, cc: CC});
      };
    },
    supplier: function(supply){
      return () => {
        var config = {groupname: "g.supplier", cc: CC, supply: supply};
        CTX.groups.launch(config);
      };
    },
    builder: function(building, size, quantity){
      return () => {
        CTX.groups.launch({
          groupname: "g.builder", 
          cc: CC, 
          building: building, 
          quantity: quantity, 
          size: size
        });
      };
    },
    speed: function(rate){
      return [
        () => print(PID + "::## xdotool key F9\n"), 
        () => print(PID + "::#! xdotool type --delay 30 Engine.SetSimRate(" + rate + ")\n"), 
        () => print(PID + "::## xdotool key Return\n"),
        () => print(PID + "::## xdotool key F9\n"),
      ];

    },
    camera: function(){
      return [
        () => print(PID + "::## xdotool key F9\n"), 
        () => print(PID + "::#! xdotool type --delay 30 Engine.CameraMoveTo(" + ccloc() + ")\n"), 
        () => print(PID + "::## xdotool key Return\n"),
        () => print(PID + "::## xdotool key F9\n"),
      ];

    }

  });

  // if any of these evaluate to a string, it gets chatted
  var sequences = {
    "random/brainland": {
        "0": [() => "< - START: " + sequence + " - >"],
        // "1": [T.camera(),                             "set camera on CC"],
        // "2": [T.chat("Hi, id:%s, cc:%s", PID, CC)], 
        "1": [T.builder(      "house CONTAIN"), "building a house"], 
        // "4": [T.supplier(            "wood", 10), "launching 1 wood supplier"], 
        // "5": [T.supplier(           "metal", 10), "launching 1 metal supplier"], 
        // "6": [T.supplier(           "stone", 10), "launching 1 stone supplier"], 
        // "7": [T.launch("g.harvester"), "launching 1 harvester"], 
        // "5": [T.speed(5),                             "more speed"],
      // "241": [T.quit(), () => "< - FINIS: " + sequence + " - >"],
    },
    "brain02": {
        "0": [() => "< - START: " + sequence + " - >"],
        // "2": [T.chat("huhu"), "chatted"], 
        "1": [T.supplier(      "food.fruit", 44), "launching 1 food.fruit supplier"], 
        "2": [T.supplier(            "wood", 44, 10), "launching 1 wood supplier"], 
        "3": [T.supplier(           "metal", 44, 10), "launching 1 metal supplier"], 
        "4": [T.supplier(           "stone", 44, 10), "launching 1 stone supplier"], 
        "5": [T.speed(5),                             "more speed"],
      // "241": [T.quit(), () => "< - FINIS: " + sequence + " - >"],
    },
    "Arcadia 02": {
        // "0": [() => "setting view",
        //       () => print("#! xdotool click --delay 30 --repeat 4 5\n"), 
        //       () => print("#! xdotool key KP_Subtract\n"),
        //       () => print("#! xdotool key F9\n"), 
        //       () => print("#! xdotool type --delay 30 Engine.CameraMoveTo(558, 430)\n"), 
        //       () => print("#! xdotool key Return\n"),
        //       () => print("#! xdotool key F9\n"),
        //      ],        
        "0": [T.supplier(      "food.fruit", 4752), "launching 1 food.fruit supplier"], 
        "1": [T.supplier(       "food.meat", 4752), "launching 1 food.meat supplier"], 
       "10": [T.supplier(           "stone", 4752), "launching 1 stone supplier"], 
       "11": [T.supplier(            "wood", 4752), "launching 1 wood supplier"], 
       "12": [T.supplier(            "wood", 4752), "launching 1 wood supplier"], 
       // "13": [T.speed(5),                            "more speed"],
      "103": [() => H.Groups.log(), "logging groups"],
        // "6": [() => H.Grids.log(),  "logging grids"],
        // "7": [() => H.Grids.dump(), "dumping grids"],
        // "8": [() => H.Groups.log(), "logging groups"],
       // "70": [() => H.logIngames(), "logging ingames"],
       // "71": [() => H.Groups.log(), "logging groups"],
      "1000": [T.quit()],
    },
  };

  // fires functions at give tick num, 
  H.Tester = (function(){

    var t0, triggers;
    
    return {
      boot:     function(){return (self = this);},
      log:      function(){
        var 
          cnt = H.count(sequences[sequence]),
          lst = H.attribs(sequences[sequence]).join(",");
        H.deb(PID, "      :");
        H.deb(PID, "INFO  : TESTER PID: %s sequence: %s with %s ticks [%s]", PID, sequence, cnt, lst);
        H.deb(PID, "      :");
      },
      activate: function(seq, context){
        CTX = context; PID = context.id;
        sequence = seq || H.Config.sequence;
        // deb("INFO  : PID: %s, TESTER.activated sequence: %s", PID, sequence);
      },
      evaluate: function(item){
        return (
          typeof item === "string"   ? chat(H.format("# %s %s", tick, item)) :
          typeof item === "function" ? self.evaluate(item()) :
          Array.isArray(item) ? void (item.map(fn => fn())) :
            undefined
        );
      },
      tick: function(secs, tick, context){
        CTX = context; PID = context.id; CC = context.villages.main; t0 = Date.now();
        if (sequences[sequence]){
          if (( triggers = sequences[sequence][~~tick] )){
            triggers.forEach(self.evaluate);
          }
        }
        return Date.now() - t0;
      }
    };

  }().boot());

return H; }(HANNIBAL));
