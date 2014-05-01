/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, Engine, deb, logObject */

/*--------------- T E S T E R -------------------------------------------------

  fires a set of functions at given tick, useful to test bot on specific maps



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  function destroy(id){Engine.PostCommand(H.Bot.id, {"type": "delete-entities", "entities": [id]});}
  function chat(msg)  {Engine.PostCommand(H.Bot.id, {"type": "chat", "message": msg});}

  // active subset
  var active = "";

  // check maps/readme-maps.md
  var config = {
    'aitest03': {
       '1': ["Running Tester"],
       '2': [H.Groups.launch.bind(null, "g.grainpicker", 44), "launching group grainpicker #1"], 
       '3': [H.Groups.launch.bind(null, "g.grainpicker", 44), "launching group grainpicker #2"],
      '28': [destroy.bind(null, 221), "destroying female unit"],
      '29': [destroy.bind(null, 222), "destroying female unit"],
      '22': [destroy.bind(null, 216), "destroying field"],
    }
  };

  // fires functions at give tick num, 
  H.Tester = (function(){

    var self, t0, triggers, tick = 0;
    
    return {
      init:     function(){self = this; return self;},
      activate: function(item){
        active = item;
        deb("TESTER: activated: %s", active);
      },
      log:      function(){
        var cnt = H.count(config[active]),
            lst = H.attribs(config[active]);
        deb();
        deb();
        deb("******: TESTER active with %s ticks at %s", cnt, lst);
        deb();
        deb();
      },
      tick:     function(secs){
        t0 = Date.now();
        if (config[active] && tick === 0){self.log();}
        if (config[active] && config[active][+tick]){
          triggers = config[active][+tick];
          deb("      T: firing: %s, tick: %s", active, tick);
          triggers.forEach(function(item){
            if (typeof item === "string"){
              chat(item);
            } else if (typeof item === "function"){
              item();
            }
          });
        }
        tick += 1;
        return Date.now() - t0;
      }
    };

  }().init());


return H; }(HANNIBAL));
