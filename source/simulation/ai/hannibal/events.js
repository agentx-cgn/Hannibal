/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval, logFn, logDispatcher */

/*--------------- E V E N T S -------------------------------------------------

  Collects, processes and dispatches incoming events.


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/


HANNIBAL = (function(H){

  // log line
  var msgTick = "  EVTS: CR: %s, ER: %s, TF: %s, CF: %s, MT: %s, DY: %s, AT: %s, OC: %s, GA: %s, UGA: %s, RA: %s, PD: %s";

  function Message (name, msg) {

    // this is send around, has the mandatory default attributes

    H.extend(this, {
      player:  null,
      name:    name,
      id:         0,
      id2:        0,
      data:      {},
    }, msg);

  }
      

  H.LIB.Events = function(context){

    H.extend(this, {

      name: "events",
      context: context,
      imports: [
        "id",
        "players",
        "entities", // owner
      ],

      // events from other turns
      savedEvents: null,

      // helps to ignore events
      createEvents:     {},
      destroyEvents:    {},

      //  see AIInterfaces.js
      orderedEvents:  [
        "Create", 
        "EntityRenamed",
        "TrainingFinished",
        "ConstructionFinished",
        "AIMetadata",
        "Attacked",
        "OwnershipChanged",
        "Garrison",
        "UnGarrison",
        "RangeUpdate",
        "PlayerDefeated",
        "Destroy",
      ],

      internalEvents:  [
        "OrderReady",
        "BroadCast",
      ],

      // saves the listeners
      dispatcher:  {
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
      },

      // list of researched techs per player
      researchedTechs:  {
        "0": [],
        "1": [],
        "2": [],
        "3": [],
        "4": [],
        "5": [],
        "6": [],
        "7": [],
        "8": [],
      },

    });

  };

  H.LIB.Events.prototype = {
    constructor: H.LIB.Events,
    log: function(){
      deb();
      deb("EVENTS: have %s saved events", this.savedEvents.length);
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function(context){
      return new H.LIB[H.noun(this.name)](context);
    },
    serialize: function(){
      // the listeners have to be re-created somewhere else
      return H.deepcopy(this.savedEvents);
    },
    deserialize: function(data){
      this.savedEvents = data;
      return this;
    },
    initialize: function(){
      if (!this.savedEvents){
        this.savedEvents = [];
      }
      return this;
    },
    tick: function(tick, secs){

      // dispatches new techs and finally fifo processes 
      // collected saved event and then single events in order defined above

      var t0 = Date.now();

      this.processTechs();

      this.savedEvents.forEach(events => {
        this.logTick(events);
        this.orderedEvents.forEach(type => {
          if (events[type]){
            events[type].forEach(event => {
              this[type](event);
            });
          }
        });
      });

      this.savedEvents =   [];
      this.createEvents =  {};
      this.destroyEvents = {};

      return Date.now() - t0;

    },
    logTick: function(events){

      var 
        lengths = this.orderedEvents
          .map(type => events[type] ? events[type].length : 0),
        sum = lengths
          .reduce((a, b) => a + b, 0);
      
      if (sum){
        deb.apply(null, [msgTick].concat(lengths));
      }

    },
    collect: function(newEvents){
      // saves events from all turns
      this.savedEvents.push(newEvents);
    },
    fire: function(name, msg){
      return this.dispatchMessage(new Message(name, msg));
    },
    readArgs: function (type /* [player, ] listener */) {

      var player, listener, args = H.toArray(arguments);

      if (args.length === 1 && typeof args[0] === "function"){
        type     = "*";
        player   = "*";
        listener = args[0];

      } else if (args.length === 2 && typeof args[1] === "function"){
        type     = args[0];
        player   = this.id;
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
    off: function (/* [type, [player, ]] listener */) {

      var 
        dispatcher = this.dispatcher,
        [type, player, listener] = this.readArgs.apply(this, H.toArray(arguments));

      H.delete(dispatcher["*"]["*"],     l => l === listener);
      H.delete(dispatcher[player]["*"],  l => l === listener);
      H.delete(dispatcher[player][type], l => l === listener);

    },
    on: function (/* [type, [player, ]] listener */) {

      var [type, player, listener] = this.readArgs.apply(this, H.toArray(arguments));

      this.registerListener(player, type, listener);

      // allows to add/sub type afterwards
      return {
        add : function(type){this.registerListener(player, type, listener);},
        sub : function(type){this.removeListener(player, type, listener);}
      };

    },
    processTechs: function  () {

      // detects new techs and fires "Advance"
  
      H.each(this.players, (id, player) => {
        H.each(player.researchedTechs, key => {
          if (!H.contains(this.researchedTechs[id], key)){

            this.fire("Advance", {
              player: id,
              data:   {technology: H.saniTemplateName(key), key: key}
            });

            this.researchedTechs[id].push(key);

          }
        });
      });

    },
    dispatchMessage: function (msg) {

      // sends message to all listeners specified by messagetype or entity id or bot id or '*'

      var 
        dispatcher = this.dispatcher,
        listeners = H.unique([].concat(
          dispatcher["*"],
          dispatcher[msg.player]["*"],
          dispatcher[msg.player][msg.name] ? dispatcher[msg.player][msg.name] : [],
          dispatcher[msg.player][msg.id]   ? dispatcher[msg.player][msg.id] : []
        )).filter(l => typeof l === "function");

      // deb("   EVT: dispatch %s|%s/%s/%s to %s listeners", msg.player, msg.name, msg.id, msg.id2, listeners.length);

      listeners.forEach(l => l(msg));

      return msg;

    },
    registerListener: function (player, type, listener){

      // puts listener in the specified dispatcher array

      var dispatcher = this.dispatcher;

      if (dispatcher[player][type] === undefined){
        dispatcher[player][type] = [listener];
        
      } else if (!H.contains(dispatcher[player][type], listener)){
        dispatcher[player][type].push(listener);

      } else {
        deb("WARN  : duplicate listener: %s %s, %s", player, type, logFn(listener));

      }

    },
    removeListener: function  (player, type, listener){

      // deletes listener from the specified dispatcher array

      var dispatcher = this.dispatcher;

      if (dispatcher[player][type]){
        H.delete(dispatcher[player][type], l => l === listener);
        if (dispatcher[player][type].length === 0){
          delete(dispatcher[player][type]);
        }
      }

    },
    moveAllListener: function (msg){

      // moves from msg.id to msg.id2

      var dispatcher = this.dispatcher, id1 = msg.id, id2 = msg.id2;

      if (dispatcher[msg.player][id2]){
        dispatcher[msg.player][id2].forEach(listener => {
          this.registerListener(msg.player, id1, listener);
        });
        delete(dispatcher[msg.player][id2]);
      }

    },

    /* Handler for API Events */

    Create: function(e){

      var 
        id     = e.entity, 
        tpln   = this.entities[id] ? this.entities[id]._templateName : "unknown",
        player = this.entities[id] ? this.entities[id].owner() : NaN;

      if (!this.entities[id]){
        this.createEvents[id] = tpln;

      } else {
        // deb("  EVTS: Create ent: %s, own: %s, tpl: %s, mats: %s", id, owner, tpln, H.attribs(e));
        this.fire("Create", {
          player: player,
          id:     id,
        });
      }

    }, 
    OwnershipChanged: function(e){},
    Garrison: function(e){},
    UnGarrison: function(e){},
    RangeUpdate: function(e){},
    PlayerDefeated: function(e){},
    EntityRenamed: function(e){

      // listener: assets, culture, producers

      var msg = this.fire("EntityRenamed", {
        player: this.entities[e.newentity].owner(),
        id:     e.entity,
        id2:    e.newentity,
      });

      this.moveAllListener(msg);

      this.destroyEvents[e.entity] = e; //????

    },
    TrainingFinished: function(e){

      // listener: assets, villages, producers

      e.entities.forEach( id => {

        this.fire("TrainingFinished", {
          player: e.owner,
          id:     id,
          data:   e.metadata,
        });

      });

    },
    ConstructionFinished: function(e){

      // listener: assets, culture, groups

      var msg = this.fire("ConstructionFinished", {
            player: this.entities[e.newentity].owner(),
            id:     e.newentity,
            // id2:    e.newentity,
          });

      this.moveAllListener(msg);

    },
    AIMetadata: function(e){

      // listener: assets, culture, groups

      this.fire("AIMetadata", {
        player: e.owner,
        id:     e.id,
        data:   e.metadata,
      });

    },
    Attacked: function(e){

      // listener: assets, grids, mili?

      // deb("   EVT: got attacked: %s", uneval(e));

      if (this.entities[e.target]){

        this.fire("Attacked", {
          player: this.entities[e.target].owner(),
          id:     e.target,
          id2:    e.attacker,
          data:   {damage: e.damage, type: e.type},
        });

      }

    },
    Destroy: function(e){

      // listener: assets, culture, mili?
      // TODO are foundations removed from triple store by Renamed?

      var msg;

      if (this.createEvents[e.entity]){
        // deb("INFO  : got Destroy on '%s' entity", this.createEvents[e.entity]);
        // looks like a failed structure
        return;
      }

      if (!e.entityObj){
        deb("WARN  : EVT got destroy no entityObj for ent: %s, mats: %s", e.entity, H.attribs(e));
        return;
      }

      if (!!e.SuccessfulFoundation){
        // deb("   EVT: foundation ready");
        return;
      }

      // dont't do this it crashes
      // data:   {entity: e.entityObj, foundation: !!e.SuccessfulFoundation},

      msg = this.fire("Destroy", {
        player: e.entityObj.owner(),
        id:     e.entity,
      });

      if (this.dispatcher[msg.player][msg.id]){
        // delete(dispatcher[msg.player][msg.id]);
      }

    },

  };

  // // public interface
  // H.Events = (function(){

    //   var t0;

    //   return {
    //     boot:    function(){self = this; return self;},
    //     collect: function(newEvents){packs.push(newEvents);},
    //     logTick: function(events){
    //       var lengths = orderedEvents.map(function(type){return events[type] ? events[type].length : 0;}),
    //           sum  = lengths.reduce(function(a, b){ return a + b; }, 0);
    //       if (sum){
    //         deb.apply(null, [msgTick].concat(lengths));
    //       }
    //     },
    //     tick:    function(){

    //       // dispatches new techs and finally fifo processes 
    //       // collected event packs and then single events in order defined above

    //       t0 = Date.now();

    //       processTechs();

    //       packs.forEach(function(events){
    //         self.logTick(events);
    //         orderedEvents.forEach(function(type){
    //           if (events[type]){
    //             events[type].forEach(function(event){
    //               handler[type](event);
    //             });
    //           }
    //         });
    //       });

    //       packs = [];
    //       createEvents = {};
    //       destroyEvents = {};

    //       return Date.now() - t0;

    //     },
    //     fire: function(name, msg){
    //       return dispatchMessage(new Message(name, msg));
    //     },
    //     readArgs: function (type /* [player, ] listener */) {

    //       var player, listener, callsign, args = H.toArray(arguments);

    //       if (args.length === 1 && typeof args[0] === "function"){
    //         type     = "*";
    //         player   = "*";
    //         listener = args[0];

    //       } else if (args.length === 2 && typeof args[1] === "function"){
    //         type     = args[0];
    //         player   = H.Bot.id;
    //         listener = args[1];

    //       } else if (args.length === 3 && typeof args[2] === "function"){
    //         type     = args[0];
    //         player   = args[1];
    //         listener = args[2];

    //       } else {
    //         deb("ERROR: Events.on is strange: %s", uneval(args));
    //         return [];

    //       }

    //       return [type, player, listener, "unknown"];

    //     },
    //     off: function (/* [type, [player, ]] listener */) {

    //       var [type, player, listener, callsign] = self.readArgs.apply(null, H.toArray(arguments));

    //       H.delete(dispatcher["*"]["*"],     l => l === listener);
    //       H.delete(dispatcher[player]["*"],  l => l === listener);
    //       H.delete(dispatcher[player][type], l => l === listener);

    //     },
    //     on: function (/* [type, [player, ]] listener */) {

    //       var [type, player, listener, callsign] = self.readArgs.apply(null, H.toArray(arguments));

    //       registerListener(player, type, listener);

    //       // allows to add/sub type afterwards
    //       return {
    //         add : function(type){registerListener(player, type, listener);},
    //         sub : function(type){removeListener(player, type, listener);}
    //       };

    //     },

    //   };

    // }()).boot();

return H; }(HANNIBAL));
