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
    self, tick = 0, map, sequence = "", 
    chat  = function(msg) {
      if (HANNIBAL_DEBUG && HANNIBAL_DEBUG.bots[PID] && HANNIBAL_DEBUG.bots[PID].cht === 1){
        Engine.PostCommand(PID, {"type": "chat", "message": msg})
      }
    },
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
    },
    research: function(tpl, id){
      return () => Engine.PostCommand(PID, {type: "research", entity: id, template: tpl}); 
    },
    launch: function(group, size){
      return () => {
        var config = {groupname: group, cc: CC, size: size};
        return CTX.groups.launch(config);
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
        var name = building.contains(".") ? building : CTX.class2name(building);
        if (name){
          CTX.groups.launch({
            groupname: "g.builder", 
            cc: CC, 
            building: name, 
            quantity: quantity, 
            size: size
          });
          return null;
        } else {
          return "Can't build: " + building;
        }
      };
    },

  });

  // if any of these evaluate to a string, it gets chatted
  var sequences = {
    "random/brainland": {
        // "0": [() => "< - START: " + map + " - >"],
        // "1": [T.camera(),                             "set camera on CC"],
        // "2": [T.chat("Hi, id:%s, cc:%s", PID, CC)], 
        "1": [T.builder (                          "house", 12,  20), "building 20 houses"], 
        "2": [T.supplier(                     "food.fruit",  5),     "launching 1 food.fruit supplier group"], 
        "3": [T.supplier(                     "food.meat",   2),     "launching 1 food.meat supplier group"], 
        "4": [T.supplier(                           "wood", 10),     "launching 1 wood supplier (10)"], 
        "5": [T.supplier(                           "wood", 10),     "launching 1 wood supplier (10)"], 
        "6": [T.supplier(                          "metal",  5),     "launching 1 metal supplier (5)"], 
        "7": [T.supplier(                          "stone",  5),     "launching 1 stone supplier (5)"], 
        "8": [T.launch  (                    "g.harvester"),         "launching 1 harvester group"], 
        "9": [T.launch  (                    "g.harvester"),         "launching 1 harvester group"], 
       "10": [T.launch  (                    "g.harvester"),         "launching 1 harvester group"], 
       "11": [T.launch  (                    "g.harvester"),         "launching 1 harvester group"], 
       // "12": [T.builder (                      "walltower",  2,  2), "building  2 walltower"], // needs phase town
       "13": [T.builder (                       "barracks",  1,  2), "building  1 barracks"], 
       "14": [T.builder (                      "farmstead",  1,  2), "building  1 farmstead"], 
       "15": [T.builder (                     "storehouse",  1,  2), "building  1 storehouse"], 
       // "20": [T.launch  (                     "g.infantry",  9),     "launching 1 infantry group"], 
       // "21": [T.speed(3),                                            "more speed"], // 3 is good for 8 player, 5 for 2;
      // "241": [T.quit(), () => "< - FINIS: " + map + " - >"],
    },
    // "Arcadia 02": {
    //     "0": [() => "setting view",
    //           () => print("#! xdotool click --delay 30 --repeat 4 5\n"), 
    //           () => print("#! xdotool key KP_Subtract\n"),
    //           () => print("#! xdotool key F9\n"), 
    //           () => print("#! xdotool type --delay 30 Engine.CameraMoveTo(558, 430)\n"), 
    //           () => print("#! xdotool key Return\n"),
    //           () => print("#! xdotool key F9\n"),
    //          ],        
    //    "13": [T.speed(5),                            "more speed"],
    //   "103": [() => H.Groups.log(), "logging groups"],
    //     "6": [() => H.Grids.log(),  "logging grids"],
    //     "7": [() => H.Grids.dump(), "dumping grids"],
    //     "8": [() => H.Groups.log(), "logging groups"],
    //    "70": [() => H.logIngames(), "logging ingames"],
    //    "71": [() => H.Groups.log(), "logging groups"],
    //  "1000": [T.quit()],
    // },
  };

  // fires functions at give tick num, 
  H.Tester = (function(){

    var t0, triggers;
    
    return {
      boot:     function(){return (self = this);},
      log:      function(){
        var 
          cnt = H.count(sequence),
          lst = H.attribs(sequence).join(",");
        H.deb(PID, "      :");
        H.deb(PID, "INFO  : TESTER PID: %s sequence: %s with %s ticks [%s]", PID, map, cnt, lst);
        H.deb(PID, "      :");
      },
      activate: function(seqmap, context){
        CTX = context; PID = context.id; 
        map = sequences[seqmap] ? seqmap : H.Config.sequence;
        sequence = sequences[seqmap] ? sequences[seqmap] : sequences[H.Config.sequence];
        H.deb("INFO  : TESTER.activated sequence: %s, PID: %s", map, PID);
      },
      evaluate: function(item){
        return (
          typeof item === "string"   ? chat(H.format("%s", item)) :
          typeof item === "function" ? self.evaluate(item()) :
          Array.isArray(item) ? void (item.map(fn => fn())) :
            undefined
        );
      },
      tick: function(secs, tick, context){
        CTX = context; PID = context.id; CC = context.villages.main; t0 = Date.now();
        if (sequence){
          if (( triggers = sequence[~~tick] )){
            triggers.forEach(self.evaluate);
          }
        }
        return Date.now() - t0;
      }
    };

  }().boot());

return H; }(HANNIBAL));
