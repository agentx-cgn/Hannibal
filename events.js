/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, HANNIBAL, H, deb, logObject, uneval */

/*--------------- E V E N T S -------------------------------------------------

  Collects, processes and dispatches incoming events.


  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  var self;

  //  see AIInterfaces.js
  var orderedEvents = [
    "Create", 
    "EntityRenamed",
    "TrainingFinished",
    "ConstructionFinished",
    "AIMetadata",
    "Destroy",
    "Attacked",
    "OwnershipChanged",
    "Garrison",
    "UnGarrison",
    "RangeUpdate",
    "PlayerDefeated"
  ],
  msgTick         = "  EVTS: CR: %s, ER: %s, TF: %s, CF: %s, MT: %s, DY: %s, AT: %s, OC: %s, GA: %s, UGA: %s, RA: %s, PD: %s",
  createEvents    = {},
  destroyEvents   = {};

  var junctions = {
    "*": {"*": []},
    "0": {"*": []},
    "1": {"*": []},
    "2": {"*": []},
    "3": {"*": []},
    "4": {"*": []},
    "5": {"*": []},
    "6": {"*": []},
    "7": {"*": []},
    "8": {"*": []},
  };

  var researchedTechsNT = {
    "0": [],
    "1": [],
    "2": [],
    "3": [],
    "4": [],
    "5": [],
    "6": [],
    "7": [],
    "8": [],
  };

  var handler = {
    Create: function(e){}, 
    OwnershipChanged: function(e){},
    Garrison: function(e){},
    UnGarrison: function(e){},
    RangeUpdate: function(e){},
    PlayerDefeated: function(e){},
    EntityRenamed: function(e){

      // listener: assets, culture, producers

      var msg = self.fire("EntityRenamed", {
        player: H.Entities[e.newentity].owner(),
        id:     e.entity,
        id2:    e.newentity,
      });

      moveAllListener(msg);

      destroyEvents[e.entity] = e; //????

    },
    TrainingFinished: function(e){

      // listener: assets, villages, producers

      e.entities.forEach(function(id){

        self.fire("TrainingFinished", {
          player: e.owner,
          id:     id,
          data:   e.metadata,
        });

      });

    },
    ConstructionFinished: function(e){

      // listener: assets, culture, groups

      var msg = self.fire("ConstructionFinished", {
        player: H.Entities[e.newentity].owner(),
        id:     e.newentity,
        // id2:    e.newentity,
      });

      moveAllListener(msg);

    },
    AIMetadata: function(e){

      // listener: assets, culture, groups

      self.fire("AIMetadata", {
        player: e.owner,
        id:     e.id,
        data:   e.metadata,
      });

    },
    Destroy: function(e){

      // listener: assets, culture, mili?

      if (!e.entityObj){
        deb("WARN : EVT got destroy no entityObj, mats: %s", H.attribs(e));
        return;
      }

      var msg = self.fire("Destroy", {
        player: e.entityObj.owner(),
        id:     e.entity,
        // dont't do this it crashes !!! data:   {entity: e.entityObj, foundation: !!e.SuccessfulFoundation},
        data:   {foundation: !!e.SuccessfulFoundation},
      });

      if (junctions[msg.player][msg.id]){
        // delete(junctions[msg.player][msg.id]);
      }

    },
    Attacked: function(e){

      // listener: assets, grids, mili?

      if (H.Entities[e.target]){

        self.fire("Attacked", {
          player: H.Entities[e.target].owner(),
          id:     e.target,
          id2:    e.attacker,
          data:   {damage: e.damage, type: e.type},
        });

      }

    },
  };

  function logFn(fn){return fn.toString().split("\n").join("").slice(0, 80);}

  function logDispatcher(){
    deb("  "); deb("      : Dispatcher");
    H.each(H.Dispatcher, function(id, ar){
      var tpl = H.Entities[id] ? H.Entities[id]._templateName : "???";
      deb("  %s: len: %s, tpl: %s", H.tab(id, 4), ar.length, tpl);
    });
    deb("  "); 
  }

  function Message (name, msg) {
    H.extend(this, {
      player:  null,
      name:    name,
      id:         0,
      id2:        0,
      data:      {},
    }, msg);
  }
  
  function dispatchMessage (msg) {

    var listeners = H.unique([].concat(
      junctions["*"],
      junctions[msg.player]["*"],
      junctions[msg.player][msg.name],
      junctions[msg.player][msg.id]
    )).filter(l => typeof l === "function");

    // deb("   EVT: dispatch %s|%s/%s/%s to %s listeners", msg.player, msg.name, msg.id, msg.id2, listeners.length);

    listeners.forEach(l => l(msg));

    return msg;

  }

  function registerListener(player, type, listener){

    if (junctions[player][type] === undefined){
      junctions[player][type] = [listener];
      
    } else if (!H.contains(junctions[player][type], listener)){
      junctions[player][type].push(listener);

    } else {
      deb("WARN  : duplicate listener: %s %s, %s", player, type, logFn(listener));

    }

  }

  function moveAllListener(msg){

    // move from msg.id to msg.id2

    var id1 = msg.id, id2 = msg.id2;

    if (junctions[msg.player][id2]){
      junctions[msg.player][id2].forEach(listener => registerListener(msg.player, id1, listener));
      delete(junctions[msg.player][id2]);
    }

  }

  H.Events = (function(){

    // Singleton

    var t0, packs = [];

    return {
      boot:    function(){self = this; return self;},
      collect: function(newEvents){packs.push(newEvents);},
      logTick: function(events){
        var lengths = orderedEvents.map(function(type){return events[type] ? events[type].length : 0;}),
            sum  = lengths.reduce(function(a, b){ return a + b; }, 0);
        if (sum){
          deb.apply(null, [msgTick].concat(lengths));
        }
      },
      tick:    function(){

        // dispatches new techs and finally fifo processes 
        // collected event packs and then single events with order defined above

        t0 = Date.now();

        self.processTechs();

        packs.forEach(function(events){
          self.logTick(events);
          orderedEvents.forEach(function(type){
            if (events[type]){
              events[type].forEach(function(event){
                // self.processEvent(type, event);
                // self.processEventNT(type, event);
                handler[type](event);
              });
            }
          });
        });

        packs = [];
        createEvents = {};
        destroyEvents = {};

        return Date.now() - t0;

      },
      fire: function(name, msg){
        return dispatchMessage(new Message(name, msg));
      },
      readArgs: function (type /* [player, ] listener */) {

        var player, listener, callsign, args = H.toArray(arguments);

        if (args.length === 1 && typeof args[0] === "function"){
          type     = "*";
          player   = "*";
          listener = args[0];

        } else if (args.length === 2 && typeof args[1] === "function"){
          type     = args[0];
          player   = H.Bot.id;
          listener = args[1];

        } else if (args.length === 3 && typeof args[2] === "function"){
          type     = args[0];
          player   = args[1];
          listener = args[2];

        } else {
          deb("ERROR: Events.on is strange: %s", uneval(args));
          return [];

        }

        return [type, player, listener, "unknown"];

      },
      off: function (/* type [player, ] listener */) {

        var [type, player, listener, callsign] = self.readArgs.apply(null, H.toArray(arguments));

        H.delete(junctions["*"]["*"],     l => l === listener);
        H.delete(junctions[player]["*"],  l => l === listener);
        H.delete(junctions[player][type], l => l === listener);

      },
      on: function (/* type [player, ] listener */) {

        var [type, player, listener, callsign] = self.readArgs.apply(null, H.toArray(arguments));

        registerListener(player, type, listener);

      },
      processTechs: function() {

        H.each(H.Players, function (id, player) {

          H.each(player.researchedTechs, function (key) {

            if (!H.contains(researchedTechsNT[id], key)){

              self.fire("Advance", {
                player: id,
                data:   {technology: H.saniTemplateName(key)}
              });

              researchedTechsNT[id].push(key);

            }

          });

        });

      }

    };

  }()).boot();

return H; }(HANNIBAL));

