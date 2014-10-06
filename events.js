/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, HANNIBAL, H, deb, logObject, uneval */

/*--------------- E V E N T S -------------------------------------------------

  Collects, processes and dispatches incoming events.


  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){


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
  destroyEvents   = {},
  researchedTechs = [];

  H.Dispatcher = {
    onAdvance: [],     // on new technologies
  };
  
  H.Junctions = {
    "*": {},
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
  

  function logDispatcher(){
    deb("  "); deb("      : Dispatcher");
    H.each(H.Dispatcher, function(id, ar){
      var tpl = H.Entities[id] ? H.Entities[id]._templateName : "???";
      deb("  %s: len: %s, tpl: %s", H.tab(id, 4), ar.length, tpl);
    });
    deb("  "); 
  }

  H.Events = (function(){

    // Singleton

    var self, t0, packs = [];

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
                self.processEvent(type, event);
              });
            }
          });
        });

        packs = [];
        createEvents = {};
        destroyEvents = {};

        return Date.now() - t0;

      },
      readArgs: function (type /* [player, ] listener */) {

        var player, listener, callsign, args = H.toArray(arguments);

        if (args.length === 1 && typeof args[0] === "function"){
          type     = "*";
          player   = "*";
          listener = args[0];

        } else if (args.length === 2 && typeof args[1] === "function"){
          player   = H.Bot.id;
          listener = args[1];

        } else if (args.length === 3 && typeof args[2] === "function"){
          player   = args[1];
          listener = args[2];

        } else {
          deb("ERROR: Events.on is strange: %s", uneval(args));
          return [];

        }

        if (!listener.callsign){
          deb("ERROR : got listener no callsign: %s", listener.toString().split("\n").join("").slice(0, 60));
          return [];
        } else {
          callsign = listener.callsign;
        }

        return [type, player, listener, callsign];

      },
      off: function (/* type [player, ] listener */) {

        var [type, player, listener, callsign] = self.readArgs.apply(null, H.toArray(arguments));

        H.delete(H.Junctions["*"]["*"],     l => l === listener);
        H.delete(H.Junctions[player]["*"],  l => l === listener);
        H.delete(H.Junctions[player][type], l => l === listener);

      },
      on: function (/* type [player, ] listener */) {

        var [type, player, listener, callsign] = self.readArgs.apply(null, H.toArray(arguments));

        H.Junctions["*"]["*"].push(listener);
        H.Junctions[player]["*"].push(listener);

        if (H.Junctions[player][type] === undefined){
          H.Junctions[player][type] = [listener];
          
        } else {
          if (H.Junctions[player][type].indexOf(listener) === -1){
            H.Junctions[player][type].push(listener);
          }
        }

      },
      processTechs: function() {

        H.each(H.Player.researchedTechs, function(key, tech){
          var name = H.saniTemplateName(key);
          if (researchedTechs.indexOf(key) === -1){
            // deb(" EVENT: onAdvance %s", name, uneval(tech));
            self.dispatchEvent("onAdvance", "onAdvance", {name: name, tech: tech});
            researchedTechs.push(key);
          }
        });

      },
      dispatchEvent: function(type, id, event) {

        var tpl = H.Entities[id] ? H.Entities[id]._templateName : "id unknown";

        if (H.Dispatcher[id]) {
          H.Dispatcher[id].forEach(function(listener){
            listener(type, id, event);
          });

        } else {
          deb("  DISP: #%s no dispatch type: %s, tpl: %s", id, type, tpl);
          // logDispatcher();
        }

      },

      registerListener: function(id, listener) {

        // builds arrays of listeners for ids
        // ids can be strings of numbers, the latter are OAD entities ids.

        var callsign = listener.callsign || listener.toString().split("\n").join("").slice(0, 60);

        if (H.Dispatcher[id] === undefined){
          H.Dispatcher[id] = [listener];
          
        } else {
          if (H.Dispatcher[id].indexOf(listener) === -1){
            H.Dispatcher[id].push(listener);
          } else {
            deb("  DISP: #%s already have listener: %s | have: %s", id, callsign, H.attribs(H.Dispatcher));
            return;            
          }
        }
        // deb("  DISP: #%s registered listener for %s | have: %s", id, callsign, H.attribs(H.Dispatcher));
        // logDispatcher();

      },
      
      moveAllListener: function(newid, oldid) {
        self.copyAllListener(newid, oldid);
        self.removeAllListener(oldid);
      },

      copyAllListener: function(newid, oldid) {
        if (H.Dispatcher[oldid]){
          H.Dispatcher[oldid].forEach(function(listener){
            H.Events.registerListener(newid, listener);
          });
        }
        // deb("  DISP: copyAllListener from: %s to: %s num: %s", oldid, newid, (H.Dispatcher[oldid] ? H.Dispatcher[oldid].length : 0));
      },

      removeAllListener: function(id) {
        delete H.Dispatcher[id];
        deb("  DISP: #%s deleted all dispatchers | have %s", id, H.attribs(H.Dispatcher));
      },

      removeListener: function(id, listener) {
        var index;
        if (H.Dispatcher[id]){
          index = H.Dispatcher[id].indexOf(listener);
          if (index !== -1){
            H.Dispatcher[id].splice(index, 1);
            deb("  DISP: #%s removed listener %s from %s |  have: %s", id, listener.callsign, H.attribs(H.Dispatcher));
          }
          if (!H.Dispatcher[id].length){
            delete H.Dispatcher[id];
            deb("  DISP: #%s deleted empty dispatcher | have %s", id, H.attribs(H.Dispatcher));
          }
        }
      },

      processEvent: function(type, event) {

        // logEvents(events);

        var 
          LOGOTHER = true, LOGTHIS = true, PID = H.Bot.id, 
          handler, msg, 
          info, ent, tpl, own, id, order, host, client, logline, 
          mats = H.format("{%s}", H.attribs(event).join(", ")),
          meta = !!event.metadata ? H.prettify(event.metadata) : "{}";

        if (LOGTHIS && (own === PID || LOGOTHER)){

          // logging

          id   = ( 
            event.newentity || 
            event.entity || 
            event.id || 
            event.target ||
            (!!event.entityObj ? event.entityObj.id() : undefined) || 
            (!!event.entities ? event.entities.join(", ") : "???")
          );

          ent  = H.Entities[id] || event.entityObj || undefined;
          tpl  = ent ? ent._templateName : "???";
          own  = (
            event.owner || (
            (ent && ent.owner) ? ent.owner() : 
            (event.entityObj)  ? event.entityObj.owner() : "???")
          );
          info = (
            type === "EntityRenamed"     ? H.format("new: %s, old: %s, new: %s, old: %s", event.newentity, event.entity, H.Entities[event.newentity], H.Entities[event.entity] || "???") :
            type === "Attacked"          ? H.format("event: %s", H.prettify(event)) : 
            type === "TrainingFinished"  ? H.format("ents: %s,", id) : 
            type === "Garrison"          ? H.format("holder: %s,", event.holder) :
            type === "UnGarrison"        ? H.format("holder: %s, entity: %s", event.holder, event.entity) :
              ""
          );

          if (own === PID){
            // finally
            logline = "   EVT: %s, id: %s, own: %s, meta: %s, mats: %s, %s ent: %s";
            deb(logline, type, id, own, meta, mats, info, tpl);
          }

        }

        // define internal msg format

        msg = {
          type:   type,
          player: null,
          id:     0,
          id2:    0,
          data:   {},
          event:  event
        };

        function dispatchMessage (e) {

        }

        // Transform 0AD events into Hannibal messages
        handler = {
          Create: function(e){}, 
          EntityRenamed: function(e){

            // listener: assets, culture, producers

            msg.player = H.Entities[e.newentity].owner();
            msg.id     = e.newentity;
            msg.id2    = e.entity;

            self.moveAllListener(msg.id, msg.id2);
            self.dispatchMessage(msg);

            destroyEvents[event.entity] = event; //????

          },
          TrainingFinished: function(e){

            // listener: assets, villages, producers

            msg.player = H.Entities[e.newentity].owner();
            msg.id     = e.newentity;
            msg.id2    = e.entity;

            self.moveAllListener(msg.id, msg.id2);
            self.dispatchMessage(msg);

            destroyEvents[event.entity] = event; //????

          },
          ConstructionFinished: function(e){},
          AIMetadata: function(e){},
          Destroy: function(e){},
          Attacked: function(e){

            // listener: assets, grids, mili?

            msg.player = H.Entities[e.target].owner();
            msg.id     = e.target;
            msg.id2    = e.attacker;
            msg.data   = {damage: e.damage, type: e.type};

            self.dispatchMessage(msg);

          },
          OwnershipChanged: function(e){},
          Garrison: function(e){},
          UnGarrison: function(e){},
          RangeUpdate: function(e){},
          PlayerDefeated: function(e){},
        };

        //handler[type]();


        switch (type){

          // don't care, yet
            case "UnGarrison": 
            break;

            case "Create":  // .entity (num)
              // createEvents[event.entity] = event;
            break;

            case "RangeUpdate":  // 
              deb(" EVENT: RangeUpdate %s", uneval(event));
            break;

            case "PlayerDefeated":  // EVENT: PlayerDefeated ({playerId:1})
              deb(" EVENT: PlayerDefeated %s", uneval(event));
            break;

          case "EntityRenamed":
            if (H.Entities[event.newentity].owner() === PID){
              if (event.newentity !== event.entity){
                // this.copyAllListener(event.newentity, event.entity);
                this.moveAllListener(event.newentity, event.entity);
                H.Bot.culture.removeById(event.entity);
                H.Bot.culture.loadById(event.newentity);
                H.Producers.removeById(event.entity);
                H.Producers.loadById(event.newentity);
                this.dispatchEvent(type, event.newentity, event);
                destroyEvents[event.entity] = event;
              } else {
                deb("INFO  : EVENTS: EntityRenamed with double id: %s ignored", event.entity);
              }
            } else {
              // we get some or all of these, maybe if ???
              // deb("INFO  : got foreign EntityRenamed: %s", H.prettify(event));
            }
            break;

          case "ConstructionFinished": // own: ???, meta: {}, mats: {entity, newentity},  ent: ???
            if (H.Entities[event.newentity].owner() === PID){
              if (event.newentity !== event.entity){

                // this.copyAllListener(event.newentity, event.entity);
                this.moveAllListener(event.newentity, event.entity);
                this.dispatchEvent(type, event.newentity, event);
                
                // HACK: Village should set ccid and opname
                // deb("-->EVT: %s", uneval(H.MetaData[event.newentity]));

                order = H.Objects(H.MetaData[event.newentity].order);
                if (order.ccid){
                  H.MetaData[event.newentity].ccid = order.ccid;
                  deb("   EVT: set ccid: %s of %s %s", order.ccid, event.newentity, H.Entities[event.newentity]._templateName);
                }
                
                H.Producers.loadById(event.newentity);

              } else {
                deb("INFO  : EVENTS: ConstructionFinished with double id: %s ignored", event.entity);
              }
            } else {
              // deb("INFO  : got foreign ConstructionFinished: %s", H.prettify(event));
            }
            break;

          case "Attacked": // might be already destroyed
            if (H.Entities[event.target] && H.Entities[event.target].owner() === PID){
              this.dispatchEvent(type, event.target, event);
              if (H.Entities[event.target].position()){
                H.Grids.record("attacks", H.Entities[event.target].position(), event.damage);
              }
            } else {
              // we get some or all of these, maybe if attacker = owned
              // deb("INFO  : got foreign Attacked: %s", H.prettify(event));
            }
            break;

          case "Garrison": 
            if (H.Entities[event.entity].owner() === PID){
              this.dispatchEvent(type, event.entity, event);
            } else {
              // deb("INFO  : got foreign Garrison: %s", H.prettify(event));
            }
          break;

          case "Destroy":  // EVT: Destroy, mats: {entity, metadata, entityObj}
            if (event.entityObj && event.entityObj.owner() === PID){

              // nothing here //??
              // logObject(event.entityObj.trainingQueue, "entityObj.trainingQueue");

              if (destroyEvents[event.entity]){
                deb("INFO  : Events got possibly superfluous destroy with id: %s", event.entity);

              } else {
                this.dispatchEvent(type, event.entity, event);
                this.removeAllListener(event.entity);
                H.Producers.removeById(event.entity);
                H.Bot.culture.removeById(event.entity);

              }

            } else if (!event.entityObj && event.entity) {
              
              if (createEvents[event.entity]){
                deb("INFO  : Events got possibly failed construction with id: %s", event.entity);
                H.Grids.dump("E" + H.Bot.ticks);
              
              } else {
                deb("ERROR : Events got strange destroy for %s, mats: %s", event.entity, mats);
              
              }
            } else {  
              // deb("INFO  : EVENT: got foreign destroy: %s", mats); // H.prettify(event)); <= cyclic
            }
          break;
          
          case "TrainingFinished":  // .entities, .metadata, .owner
            
            if (event.owner === PID) {
              event.entities.forEach(function(id){
                if (event.metadata && event.metadata.order){
                  H.Bot.culture.loadById(id);
                  H.Producers.loadById(id);
                  H.Economy.listener("onOrderReady", id, event);
                } else {
                  deb("WARN : trained %s without order", id);
                }
              });
            } else {
              // deb("INFO  : got foreign TrainingFinished: %s", H.prettify(event));
            }
            
          break;

          case "AIMetadata": // id, metadata, owner

            if (event.owner === PID) {
              if (!!event.metadata && !!event.metadata.order || !H.Entities[event.id]){
                ent    = H.Entities[event.id];
                order  = H.Objects(event.metadata.order);
                client = H.Objects(order.source).instance;
                if (order.shared){
                  host = H.Groups.launch("g.custodian");
                  host.structure = ["private", "INGAME WITH id = " + event.id];
                  host.structure = H.createAsset(host, "structure");
                  ent.setMetadata(H.Bot.id, "opname", host.name);
                  ent.setMetadata(H.Bot.id, "opid", host.id);
                  host.listener.onConnect(client.listener);
                } else {

                }
                H.Bot.culture.loadById(event.id);
                H.Economy.listener("onOrderReady", event.id, event);
                // order.ready(1, type, event.id);
              } else {
                deb("ERROR : AIMetadata no metadata.order or unkown id: %s", event.id);
              }
            }

          break;

          default:
            deb("ERROR : Event %s unknown: %s, %s", type, uneval(event), mats);
            logObject(event.msg);

          break;

        } // switch


      }


    };

  }()).boot();

return H; }(HANNIBAL));

