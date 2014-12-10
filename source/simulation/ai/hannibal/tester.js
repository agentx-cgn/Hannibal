/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, TESTERDATA, Engine, deb, logObject */

/*--------------- T E S T E R -------------------------------------------------

  fires a set of functions at given tick, useful to test bot on specific maps
  sequence keys are documented in maps/readme-maps.md
  active sequence comes from 



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  var T = H.T || {},
      self, 
      tick = 0, 
      sequence = "", sequences, // sequence subset
      chat = function(msg){Engine.PostCommand(H.APP.bot.id, {"type": "chat", "message": msg});};

  H.extend(T, {
    quit: function(){
      return () => Engine.PostCommand(H.APP.bot.id, {"type": "quit"});
    },
    chat: function(msg){
      return () => Engine.PostCommand(H.APP.bot.id, {"type": "chat", "message": msg});
    },
    destroy: function(ids){ 
      ids = Array.isArray(ids) ? ids : arguments.length > 1 ? H.toArray(arguments) : [ids];
      return () => Engine.PostCommand(H.APP.bot.id, {type: "delete-entities", "entities": ids});
    },
    research: function(tpl, id){
      return () => Engine.PostCommand(H.APP.bot.id, {type: "research", entity: id, template: tpl}); 
    },
    launch: function(group /*, ... */){
      return H.toArray(arguments).slice(1).map((id) => () => H.Groups.launch(group, id));
    },
    supplier: function(resource, cc){
      return () => H.APP.bot.groups.launch({cc: cc, groupname: "g.supplier", resource: resource});
    },
    speed: function(rate){
      return [
        () => print("## xdotool key F9\n"), 
        () => print("#! xdotool type --delay 30 Engine.SetSimRate(" + rate + ")\n"), 
        () => print("## xdotool key Return\n"),
        () => print("## xdotool key F9\n"),
      ];

    }

  });

/*
        "5": [() => H.Grids.dump(), "dumping maps"],
        http://www.semicomplete.com/projects/xdotool/xdotool.xhtml#mouse_commands
*/


  // if any of these evaluate to a string, it gets chatted
  sequences = {
    "brain02": {
        "0": [() => "< - START: " + sequence + " - >"],
        // "2": [T.chat("huhu"), "chatted"], 
        // "1": [T.supplier(      "food.fruit", 44), "launching 1 food.fruit supplier"], 
        "1": [T.supplier(            "wood", 44), "launching 1 wood supplier"], 
        "3": [T.speed(5),                            "more speed"],
      // "241": [T.quit(), () => "< - FINIS: " + sequence + " - >"],
    },
    "Forest Battle": {
        "1": [() => "< - START: " + sequence + " - >"],
        "2": [T.chat("huhu"), "chatted"], 
      "241": [() => "< - FINIS: " + sequence + " - >"],
    },
    "aitest08m": {
        "1": [() => "< - START: " + sequence + " - >"],
        "2": [T.chat("huhu"), "chatted"], 
        "3": [T.launch("g.scouts", 44), "launching 1 scout"], 
      "241": [() => "< - FINIS: " + sequence + " - >"],
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
        "2": [T.launch("g.harvester",        4752), "launching 1 harvester"], 
        "3": [T.supplier(            "wood", 4752), "launching 1 wood supplier"], 
        "4": [T.launch("g.builder",          4752), "launching 1 scout"], 
        "5": [T.launch("g.scouts",           4752), "launching 1 scout"], 
        "6": [T.launch("g.harvester",        4752), "launching 1 harvester"], 
        "7": [T.launch("g.harvester",        4752), "launching 1 harvester"], 
        "8": [T.launch("g.harvester",        4752), "launching 1 harvester"], 
        "9": [T.supplier(           "metal", 4752), "launching 1 metal supplier"], 
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
    "aitest06m": {
        "1": [() => "< - START: " + sequence + " - >"],
        "2": [T.launch("g.scouts", 44), "launching 1 scout"], 
        // "3": [() => H.Grids.dump(), "dumping grids"],
        // "4": [() => H.Grids.log(),  "logging grids"],
        "6": [() => H.Groups.log(), "logging groups"],
        "7": [() => H.logIngames(), "logging ingames"],
       "70": [() => H.logIngames(), "logging ingames"],
       "71": [() => H.Groups.log(), "logging groups"],
      "241": [() => "< - FINIS: " + sequence + " - >"],
    },
    "aitest05m": {
        "1": [() => "< - START: " + sequence + " - >"],
        "2": [T.launch("g.scouts", 44), "launching 1 scout"], 
        "3": [() => H.Grids.dump(), "dumping grids"],
        "4": [() => H.Grids.log(),  "logging grids"],
       "20": [() => H.logIngames(), "logging ingames"],
       "21": [() => H.Groups.log(), "logging groups"],
       "70": [() => H.logIngames(), "logging ingames"],
       "71": [() => H.Groups.log(), "logging groups"],
      "241": [() => "< - FINIS: " + sequence + " - >"],
    },
    "aitest04m": {
        "1": [() => "< - START: " + sequence + " - >"],
        "3": [T.launch("g.grainpicker", 44, 44, 44), "launching 3 grainpickers"], 
       "12": [T.destroy(44), "destroying centre"],
       "14": [() => "calling for repair help"],
       "15": [() => H.logIngames(), "logging ingames"],
       "16": [() => H.Groups.log(), "logging groups"],
       "70": [() => H.logIngames(), "logging ingames"],
       "71": [() => H.Groups.log(), "logging groups"],
      "241": [() => "< - FINIS: " + sequence + " - >"],
    },
    "Xaitest03": {
       "1": [() => "< - START: " + sequence + " - >"],
       "2": [T.launch("g.grainpicker", 44, 44), "launching 2 grainpickers"], 
      "10": [() => "please wait a moment"],
      "22": [T.destroy(216), "destroying field"],
      "30": [T.destroy(223, 224, 225), "destroying female units"],
      "44": [() => "ACTION"],
      "50": [T.launch("g.grainpicker", 44, 44, 44, 44, 44), "launching 5 grainpickers"], 
     "210": [() => "< - FINIS: " + sequence + " - >"],
    }
  };


  // fires functions at give tick num, 
  H.Tester = (function(){

    var t0, triggers;
    
    return {
      boot:     function(){
        self = this; 
        if (TESTERDATA !== undefined){
          H.each(TESTERDATA, function(attr, value){
            deb("tester: %s : %s", attr, value);
            if (attr.slice(0,2) === "On"){
              self[attr] = new Function(value);
            } else {
              self[attr] = value;
            }
          });
        }
        return self;
      },
      activate: function(seq){
        sequence = seq || H.Config.sequence;
        deb("TESTER: activated sequence: %s", sequence);
      },
      log:      function(){
        var 
          cnt = H.count(sequences[sequence]),
          lst = H.attribs(sequences[sequence]).join(",");
        deb("      :");
        deb("      :");
        deb("      : TESTER running sequence: %s with %s ticks [%s]", sequence, cnt, lst);
        deb("      :");
        deb("      :");
      },
      evaluate: function(item){
        return (
          typeof item === "string"   ? chat(H.format("# %s %s", tick, item)) :
          typeof item === "function" ? self.evaluate(item()) :
          Array.isArray(item) ? void (item.map(fn => fn())) :
            undefined
        );
      },
      tick:     function(secs){
        t0 = Date.now();
        if (sequences[sequence]){
          if (tick === 0){self.log();}  
          if (sequences[sequence][+tick]){
            triggers = sequences[sequence][+tick];
            // deb("     T: firing: %s, tick: %s, msg: %s", sequence, tick, triggers.filter(t=>typeof t === "string")[0] || "");
            triggers.forEach(function(item){
              self.evaluate(item);
            });
          }
        }
        tick += 1;
        return Date.now() - t0;
      }
    };

  }().boot());

return H; }(HANNIBAL));
