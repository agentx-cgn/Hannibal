/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, Engine, deb, logObject */

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
      chat = function(msg){Engine.PostCommand(H.Bot.id, {"type": "chat", "message": msg});};


  H.extend(T, {

    destroy: function(ids){ 
      ids = Array.isArray(ids) ? ids : arguments.length > 1 ? H.toArray(arguments) : [ids];
      return () => Engine.PostCommand(H.Bot.id, {"type": "delete-entities", "entities": ids});
    },
    launch: function(group /*, ... */){
      return H.toArray(arguments).slice(1).map((id) => () => H.Groups.launch(group, id));
    }

  });

  // if any of these evaluates to a string, it gets chatted
  sequences = {
    'aitest03': {
        '1': [() => "< - START: " + sequence + " - >"],
        '5': [T.launch("g.grainpicker", 44, 44, 44, 44, 44), "launching 5 grainpickers"], 
      '210': [() => "< - FINIS: " + sequence + " - >"],
    },
    'Xaitest03': {
       '1': [() => "< - START: " + sequence + " - >"],
       '2': [T.launch("g.grainpicker", 44, 44), "launching 2 grainpickers"], 
      '10': [() => "please wait a moment"],
      '22': [T.destroy(216), "destroying field"],
      '30': [T.destroy(223, 224, 225), "destroying female units"],
      '44': [() => "ACTION"],
      '50': [T.launch("g.grainpicker", 44, 44, 44, 44, 44), "launching 5 grainpickers"], 
      '210': [() => "< - FINIS: " + sequence + " - >"],
    }
  };


  // fires functions at give tick num, 
  H.Tester = (function(){

    var t0, triggers;
    
    return {
      init:     function(){self = this; return self;},
      activate: function(seq){
        sequence = seq || H.Config.sequence;
        deb("TESTER: activated sequence: %s", sequence);
      },
      log:      function(){
        var cnt = H.count(sequences[sequence]),
            lst = H.attribs(sequences[sequence]).join(",");
        deb();
        deb();
        deb("******: TESTER running sequence: %s with %s ticks [%s]", sequence, cnt, lst);
        deb();
        deb();
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
            deb("      T: firing: %s, tick: %s", sequence, tick);
            triggers = sequences[sequence][+tick];
            triggers.forEach(function(item){
              self.evaluate(item);
            });
          }
        }
        tick += 1;
        return Date.now() - t0;
      }
    };

  }().init());


return H; }(HANNIBAL));
