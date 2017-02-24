/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- E V E N T S -------------------------------------------------

  Collects, processes and dispatches incoming events.


  tested with 0 A.D. Alpha 18 Rhododactylus
  V: 0.1.1, agentx, CGN, Mar, 2015

*/


HANNIBAL = (function(H){

  // log line with same order as orderedEvents
  var msgTick = "EVENTS: CR: %s, ER: %s, TF: %s, CF: %s, MT: %s, AT: %s, OC: %s, GA: %s, UGA: %s, RA: %s, PD: %s, DY: %s";

  function Message (name, msg) {

    // this is send around, has the mandatory default attributes
    // uneval(msg) must work!!

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

      context: context,
      imports: [
        "id",
        "players",
        "metadata",
        "entities", // owner
      ],

      // events from other turns
      savedEvents: null,

      // helps to ignore events like failed constructions
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
        "Advance",
        "OrderReady",
        "BroadCast",
        "EntityCreated",
        "EntityAttacked",
        "UnitDestroyed",
        "StructureDestroyed",
        "ResourceDestroyed",
        "PhaseChanged",        // fired by Phases
        // "ResourceFound",
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

  H.LIB.Events.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Events,
    log: function(){
      this.deb();
      this.deb("EVENTS: have %s saved events", this.savedEvents.length);
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

      // reset
      this.savedEvents   = [];
      this.createEvents  = {};
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
        this.deb.apply(this, [msgTick].concat(lengths));
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
        this.deb("ERROR: Events.on is strange: %s", uneval(args));
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

      if (H.contains(this.internalEvents, type) || H.contains(this.orderedEvents, type)){

        this.registerListener(player, type, listener);

        // allows to add/sub type afterwards
        return {
          add : function(type){this.registerListener(player, type, listener);},
          sub : function(type){this.removeListener(player, type, listener);}
        };

      } else {
        this.deb("ERROR : unknown event type: %s", type);
        return null;

      }

    },
    processTechs: function  () {

      // detects new techs and fires "Advance"
  
      H.each(this.players, (id, player) => {
        if (player.researchedTechs){ // exclude gaya

          H.each(player.researchedTechs, key => {
            if (!H.contains(this.researchedTechs[id], key)){

              this.fire("Advance", {
                player: id,
                data:   {technology: H.saniTemplateName(key), key: key}
              });

              this.researchedTechs[id].push(key);

            }
          });

        }
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
          dispatcher[msg.player][msg.id]   ? dispatcher[msg.player][msg.id]   : []
        )).filter(l => typeof l === "function");

      // this.deb("   EVT: dispatch %s|%s/%s/%s to %s listeners", msg.player, msg.name, msg.id, msg.id2, listeners.length);

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
        this.deb("WARN  : duplicate listener: %s %s, %s", player, type, H.logFn(listener));

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

  /* Handler for API Events 

    */

    Create: function(e){

      var 
        id     = e.entity, 
        tpln   = this.entities[id] ? this.entities[id]._templateName : "unknown",
        player = this.entities[id] ? this.entities[id].owner() : NaN,
        meta   = this.metadata[id];

      if (!this.entities[id]){
        this.createEvents[id] = tpln;

      } else if (player === this.id) {
        this.deb("   EVT: Create ent: %s, own: %s, tpl: %s, mats: %s, meta: %s", id, player, tpln, H.attribs(e), uneval(meta));
        this.fire("EntityCreated", {
          player: player,
          id:     id,
        });

      } else {
        // don't cheat on other bots or player

      }

    }, 
    Garrison: function(e){

      var 
        idEntitiy = e.entity, 
        idHolder  = e.holder, 
        tplnEnt   = this.entities[idEntitiy] ? this.entities[idEntitiy]._templateName : "unknown",
        tplnHol   = this.entities[idHolder]  ? this.entities[idHolder]._templateName   : "unknown",
        player    = this.entities[idHolder]  ? this.entities[idHolder].owner() : NaN;

      this.deb("   EVT: P:%s Garrison ent: #%s %s => holder: #%s %s", player, idEntitiy, tplnEnt, idHolder, tplnHol);

    },
    UnGarrison: function(e){

      var 
        idEntitiy = e.entity, 
        idHolder  = e.holder, 
        tplnEnt   = this.entities[idEntitiy] ? this.entities[idEntitiy]._templateName : "unknown",
        tplnHol   = this.entities[idHolder]  ? this.entities[idHolder]._templateName   : "unknown",
        player    = this.entities[idHolder]  ? this.entities[idHolder].owner() : NaN;

      this.deb("   EVT: P:%s UnGarrison ent: #%s %s => holder: #%s %s", player, idEntitiy, tplnEnt, idHolder, tplnHol);

    },

    OwnershipChanged: function(e){},
    RangeUpdate: function(e){},
    PlayerDefeated: function(e){},
    EntityRenamed: function(e){

      // listener: assets, culture, producers

      var 
        eold = this.entities[e.entity], 
        enew = this.entities[e.newentity],
        told = eold ? eold._templateName : "unknown",
        tnew = enew ? enew._templateName : "unknown";

      // this.deb("   EVT: EntityRenamed %s" , uneval(e));

      if (!enew){
        this.deb("   EVT: ignored EntityRenamed: %s => %s, %s => %s ", e.entity, e.newentity, told, tnew);
        return;
      } else {
        this.deb("   EVT: EntityRenamed.in: %s => %s", eold, enew);
      }

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

        var msg = this.fire("TrainingFinished", {
          player: e.owner,
          id:     id,
          data:   e.metadata || {},
        });

        // if(e.owner === 1)this.deb("   EVT: %s", uneval(msg));

      });

    },
    ConstructionFinished: function(e){

      // listener: assets, culture, groups

      var 
        ent  = this.entities[e.newentity],
        tpln = ent._templateName || "unknown template";

      this.deb("   EVT: ConstructionFinished.in: %s, id: %s, mats: %s", ent, e.newentity, H.attribs(e));

      this.fire("ConstructionFinished", {
        player: ent.owner(),
        id:     e.newentity,
        data: {
          templatename: tpln,
          classes: ent.classes().map(String.toLowerCase),
        }
      });

    },
    AIMetadata: function(e){

      // listener: assets, culture, groups

      this.fire("AIMetadata", {
        player: e.owner,
        id:     e.id,
        data:   {templatename: this.entities[e.id]._templateName},
      });

    },
    Attacked: function(e){

      var ents = this.entities;

      // listener: assets, grids, mili?
      // this.deb("   EVT: got attacked: %s", uneval(e));

      if (
        ents[e.target] && ents[e.target].owner() === this.id
        || ents[e.attacker] && ents[e.attacker].owner() === this.id
        ){

        this.fire("EntityAttacked", {
          player: this.id,
          id:     e.attacker,
          id2:    e.target,
          data:   {damage: e.damage, type: e.type},
        });

      } else {

        this.deb("   EVT: attacked suppressed (t/a) : ids: %s, %s, ents: %s, %s",
          ents[e.target]   ? ents[e.target].owner()   : "unknown owner" ,
          ents[e.attacker] ? ents[e.attacker].owner() : "unknown owner" .
          ents[e.target],
          ents[e.attacker]
        );

      }

    },
    Destroy: function(e){

      // listener: assets, culture, mili?
      // TODO are foundations removed from triple store by Renamed?

      // this.deb("   EVT: Destroy: %s, %s", uneval(e), H.attribs(this.entities[e.entity]));

      var msg, tpln, type, foundation = false;

      if (this.createEvents[e.entity]){
        // this.deb("INFO  : got Destroy on '%s' entity", this.createEvents[e.entity]);
        // looks like a failed structure
        return;
      }

      if (!e.entityObj){
        this.deb("WARN  : EVT got destroy no entityObj for ent: %s, mats: %s", e.entity, H.attribs(e));
        return;
      }

      tpln = e.entityObj._templateName || "unknown";
      if (tpln.contains("foundation")){
        foundation = true;
        tpln = tpln.split("foundation|").join("");
      }

      // this.deb("   EVT: Destroy: %s, %s", uneval(e), tpln);

      // suppress finished foundations
      if (!!e.SuccessfulFoundation){
        // this.deb("   EVT: foundation ready: id: %s", e.entity);
        return;
      }

      type = (
        e.entityObj.hasClass("Structure")    ? "Structure" :
        e.entityObj.hasClass("Unit")         ? "Unit"      :
        e.entityObj.hasClass("ForestPlant")  ? "Resource"  :
          "unknown"
      );

      if(type !== "unknown"){
        msg = this.fire(type + "Destroyed", {
          player: e.entityObj.owner(),
          id:     e.entity,
          data:   {
            templatename: tpln, 
            foundation: foundation,
            position: e.entityObj.position(),
            classes:  e.entityObj.classes().map(String.toLowerCase)
          }
        });

      } else {
        // ForestPlant, probably more
        this.deb("WARN : EVENTS: Destroy NOT Structure NOR Unit NOR Resource: %s", e.entityObj.classes());
        return;

      }

      if (this.dispatcher[msg.player][msg.id]){
        delete(this.dispatcher[msg.player][msg.id]);
        this.deb("   EVT: Destroy %s dispatcher deleted for: %s %s", type, msg.player, msg.id);
      }

      this.deb("   EVT: Destroy %s fired: own: %s, id: %s, tpl: %s", type, msg.player, e.entity, tpln);

    },

  });

return H; }(HANNIBAL));
