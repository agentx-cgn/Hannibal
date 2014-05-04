/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, Engine, deb, logObject */

/*--------------- T E S T E R -------------------------------------------------

  fires a set of functions at given tick, useful to test bot on specific maps
  sequence keys are documented in maps/readme-maps.md
  active sequence comes from 



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  function destroy(id){Engine.PostCommand(H.Bot.id, {"type": "delete-entities", "entities": [id]});}
  function chat(msg)  {Engine.PostCommand(H.Bot.id, {"type": "chat", "message": msg});}

  var self, 
      tick = 0, 
      sequence = "", // sequence subset
      // if any of these evaluates to a string, it gets chatted
      sequences = {
        'aitest03': {
           '1': [() => "Running Tester with: " + sequence],
           '2': [H.Groups.launch.bind(null, "g.grainpicker", 44), "launching group grainpicker #1"], 
           '3': [H.Groups.launch.bind(null, "g.grainpicker", 44), "launching group grainpicker #2"],
          '22': [destroy.bind(null, 216), "destroying field"],
          '28': [destroy.bind(null, 221), "destroying female unit"],
          '29': [destroy.bind(null, 222), "destroying female unit"],
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
