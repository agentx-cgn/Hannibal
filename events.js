/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, HANNIBAL, H, deb, Filters, getAttribType, logObject, logObjectShort, logError, debug */

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
  msgTick  = "  EVTS: CR: %s, ER: %s, TF: %s, CF: %s, MT: %s, DY: %s, AT: %s, OC: %s, GA: %s, UGA: %s, RA: %s, PD: %s",
  createEvents  = {},
  destroyEvents = {};


  H.Dispatcher = {};
  

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
      init:    function(){self = this;return self;},
      collect: function(newEvents){packs.push(newEvents);},
      tick:    function(){
        t0 = Date.now();
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
      logTick: function(events){
        var lengths = orderedEvents.map(function(type){return events[type] ? events[type].length : 0;}),
            sum  = lengths.reduce(function(a, b){ return a + b; }, 0);
        if (sum){
          deb.apply(null, [msgTick].concat(lengths));
        }
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

        if (H.Dispatcher[id] === undefined){
          H.Dispatcher[id] = [listener];
          
        } else {
          if (H.Dispatcher[id].indexOf(listener) === -1){
            H.Dispatcher[id].push(listener);
          } else {
            deb("  DISP: #%s already have listener: %s | have: %s", id, listener.callsign, H.attribs(H.Dispatcher));
            return;            
          }
        }
        deb("  DISP: #%s registered listener for %s | have: %s", id, listener.callsign, H.attribs(H.Dispatcher));
        // logDispatcher();

      },
      
      copyAllListener: function(newid, oldid) {
        if (H.Dispatcher[oldid]){
          H.Dispatcher[oldid].forEach(function(listener){
            H.Events.registerListener(newid, listener);
          });
        }
        deb("  DISP: copyAllListener from: %s to: %s num: %s", oldid, newid, (H.Dispatcher[oldid] ? H.Dispatcher[oldid].length : 0));
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

        var LOGOTHER = true, LOGTHIS = true, PID = H.Bot.id, 
            info = "", ent, tpl, own, id, order, host, client, 
            mats = H.format("{%s}", H.attribs(event).join(", ")),
            meta = !!event.metadata ? H.prettify(event.metadata) : "{}";

        // logging
        if (LOGTHIS && (own === PID || LOGOTHER)){

          id = ( 
            event.newentity || 
            event.entity || 
            event.id || 
            event.target ||
            (!!event.entityObj ? event.entityObj.id() : undefined) || 
            (!!event.entities ? event.entities.join(", ") : "???")
          );

          ent  = H.Entities[id] || event.entityObj || undefined;
          tpl  = ent ? ent.toString() : "???";
          own  = (
            event.owner || (
            (ent && ent.owner) ? ent.owner() : 
            (event.entityObj)  ? event.entityObj.owner() : "???")
          );

          switch (type){
            case "EntityRenamed":
              info = H.format("new: %s, old: %s, new: %s, old: %s", 
                event.newentity, event.entity, H.Entities[event.newentity], H.Entities[event.entity] || "???"
              );
            break;
            case "Attacked":
              info = H.format("event: %s", H.prettify(event));
            break;
            case "TrainingFinished":
              info = H.format("ents: %s,", id);
            break;
            case "Garrison":
              info = H.format("holder: %s,", event.holder);
            break;
            case "UnGarrison":
              info = H.format("holder: %s, entity: %s", event.holder, event.entity);
            break;
          }

          if (own == H.Bot.id){
            // finally
            deb("   EVT: %s, id: %s, own: %s, meta: %s, mats: %s, %s ent: %s", 
                         type, id, own, meta, mats, info, tpl
            );
          }

        }


        switch (type){

          // don't care
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
                this.copyAllListener(event.newentity, event.entity);
                H.Bot.culture.removeById(event.entity);
                H.Bot.culture.loadById(event.newentity);
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
                this.copyAllListener(event.newentity, event.entity);
                this.dispatchEvent(type, event.newentity, event);
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
                H.Bot.culture.removeById(event.entity);

              }

            } else if (!event.entityObj && event.entity) {
              
              if (createEvents[event.entity]){
                deb("INFO  : Events got possibly failed construction with id: %s", event.entity);
                H.Grids.dump("E" + H.Bot.ticks);
              
              } else {
                deb("ERROR : Events got strange destroy for %s", event.entity);
              
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
                  H.Objects(event.metadata.order).ready(1, type, id);
                } else {
                  deb("WARN : trained %s without order", id)
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
                  host.structure = H.CreateResource(host, 'structure');
                  ent.setMetadata(H.Bot.id, "opname", host.name);
                  ent.setMetadata(H.Bot.id, "opid", host.id);
                  host.listener.onConnect(client.listener);
                } else {

                }
                H.Bot.culture.loadById(event.id);
                order.ready(1, type, event.id);
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

  }()).init();

return H; }(HANNIBAL));

