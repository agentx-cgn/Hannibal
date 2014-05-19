/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, Engine, deb, logObject */

/*--------------- A S S E T S -------------------------------------------------

  handles a group's resources like estate, units, techs, buildings.
  Assets consist of one of more resources like units or strutures


  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  var mapper = {
        "TRAINEDBY":    "train",
        "BUILDBY":      "construct",
        "RESEARCHEDBY": "research"
      };

  function getAssetType(definition){

    var found = false, hcq, type, nodes;

    if (typeof definition[1] === "object"){

      return "claim";

    } else if (typeof definition[1] === "string") {
      nodes = H.QRY(definition[1], 0).execute("", 0, 0, "getAssetType"); // enforce no debug info
      nodes.forEach(function(node){
        "TRAINEDBY, BUILDBY, RESEARCHEDBY".split(", ").forEach(function(verb){
          if (!found){
            hcq = H.format("%s %s", node.name, verb);
            if (H.QRY(hcq).execute().length){
              type = mapper[verb];
              found = true;
            }
          }
        });
      });    
      if (found){
        return type;
      } else {
        return deb("ERROR : getAssetType: strange resource: %s", definition);
      }

    } else {
      return deb("ERROR : getAssetType: strange resource: %s", definition);

    }
  }

  function expandHCQ(hcq, instance){

    // replaces '<xyz>' in hcq with instance.xyz.hcq

    var id,
        pos1  = hcq.indexOf("<"),
        pos2  = hcq.indexOf(">"),
        token = (pos2 > pos1 && pos1 !== -1 && pos2 !== -1) ? 
                  hcq.substr(pos1 +1, pos2 - pos1 -1) : 
                  null;

    if (token === "ccid"){
      hcq = H.replace(hcq, "<" + token + ">", instance[token]);

    } else if (token && instance[token] !== undefined){
      hcq = H.replace(hcq, "<" + token + ">", instance[token].hcq);

    } else if (token) {
      deb("ERROR : AST: %s/%s or its hcq not found to build: %s", instance, token, hcq);

    }

    return hcq;

  }

  H.CreateAsset = function(instance, nameProp){

    // Object Factory

    // deb("CreateAsset: %s", instance[nameProp]);

    var self        = {}, 
        resources   = [],                 // these are entity ingame ids
        users       = [],                 // these are group listeners
        id          = H.Objects(self),
        name        = H.format("%s:%s#%s", instance.name, nameProp, id),
        nameDef     = nameProp,
        definition  = instance[nameDef],  // saving the original definition
        exclusive   = (definition[0] === "exclusive"),
        shared      = (definition[0] === "shared"),  
        dynamic     = (definition[0] === "dynamic"),
        hcq         = expandHCQ(definition[1], instance),
        type        = !dynamic ? getAssetType(definition) : "dynamic",  // dynamics are not ordered
        claim       = definition[1];

    // deb("   AST: have type: %s FOR %s/%s", type, instance.name, prop);


    Object.defineProperty(self, 'health', {enumerable: true, get: function(){
      return H.health(resources);
    }});    


    H.extend(self, {
      id:         id, 
      hcq:        hcq, 
      name:       name, 
      users:      users, 
      nameDef:    nameDef, 
      instance:   instance, 
      resources:  resources, 
      isRequested: false,
      toString:   function(){return H.format("[asset %s]", name);},
      toLog:      function(){
        return "    AST: " + self + " " + JSON.stringify(self, null, "      : ");
      },
      toOrder:    function(){
        return {
          type:   type, 
          hcq:    hcq, 
          source: id, 
          shared: shared
        };
      },
      toResource: function(id){
        // stripped down object of self, bind to a single entity id

        // deb("toResource: id: %s, %s", id, typeof id);

        return {
          id:         id,
          name:       name,
          nameDef:    nameDef, 
          shared:     shared,
          health:     H.health([id]),
          location:   self.location.bind(null, [id]),
          garrison:   self.garrison.bind(null, [id]),
          destroy:    self.destroy.bind(null, [id]),
          gather:     self.gather.bind(null, [id]),
          repair:     self.repair.bind(null, [id]),
          toOrder:    self.toOrder,
          toString:   function(){return H.format("[resource %s]", name);},
        };
      },
      tick: function(time){
        // actually called
      },

      // first: function(){
      //   return (resources.length === 0) ? undefined : self.toResource(resources[0]);
      // },
      // sort:     function(filter){

      //   // updates and sort a resources of a dynmaic resource

      //   var oper, prop, nodes, sortPosition, sortFunc, old = resources;

      //   filter = filter.split(" ").filter(function(s){return !!s;});
      //   oper   = filter[0];
      //   prop   = filter[1];
      //   nodes  = H.QRY(hcq).execute("node", 5, 5, "resource.sort"); // ); //

      //   if (dynamic) {
      //     switch (prop) {
      //       case "distance":
      //         if (!instance.position) {
      //           deb("ERROR : %s has no position", instance);
      //           logObject(instance, "instance");
      //         }
      //         sortPosition = (
      //           Array.isArray(instance.position) ? instance.position : 
      //             instance.position.location()
      //         );
      //         sortFunc  = function(na, nb){

      //           // if (! (typeof na.position === "function")){
      //           //   logObject(na, "na in res.sort");
      //           // }

      //           var aDist = H.Map.distance(na.position, sortPosition),
      //               bDist = H.Map.distance(nb.position, sortPosition);
      //           return oper === '<' ? aDist - bDist : bDist - aDist;
      //         };
      //       break;
      //     }
      //     resources = nodes.sort(sortFunc).map(function(node){return node.id;});
      //   }

      //   deb("   AST: %s sort/%s: value: %s, resources: old: %s, new: %s", self, prop, sortPosition, H.prettify(old), H.prettify(resources));

      // },
      match:      function(who){return resources.indexOf(who.id) !== -1;},
      length:     function(){return resources.length;},
      state:      function(){
        var state = {};
        resources.forEach(function(id){
          if (!!H.Entities[id]._entity.unitAIState){ //??
            state[id] = H.Entities[id].unitAIState().split(".").slice(-1)[0].toLowerCase();
          } else {
            state[id] = undefined;
          }
        });
        return state;
      },
      location:   function(id){

        var loc = [];

        if (id) {
          loc = H.Map.getCenter([id]);
          deb("   AST: location id: %s of %s, loc: %s", id, self, loc);

        } else if (self.position){
          loc = self.position.location();
          deb("   AST: location self.position: %s of %s, loc: %s", self.position, self, loc);

        } else if (users.length) { // priotize shared, 
          loc = H.Map.centerOf(users.map(function(listener){
            var group = H.Objects(listener.callsign.split("#")[1]);
            if (group.position){
              return group.position.location();
            } else {
              return [];
            }
          }));
          deb("   AST: location users: %s of %s, loc: %s", H.prettify(users), self, loc);

        } else if (resources.length){
          // only undestroyed entities, with valid position
          loc = H.Map.getCenter(resources.filter(id => !!H.Entities[id] && !!H.Entities[id].position() ));
          deb("   AST: location resources: %s of %s, loc: %s", H.prettify(resources), self, loc);

        } else {
          deb("   AST: Error: found no location for %s", self);

        }

        return loc;

      },
      // getLocNear: function(where){

      //   // assuming a lot.

      //   var pos, tpl, loc;

      //   if (!where){
      //     deb("ERROR : AST etLocNear NO where %s", self);
      //     return null;
      //   } // that's ok if group has no location yet.

      //   if(!where.location){
      //     logObject(where, "where.location!! " + where);
      //   }

      //   pos = where.location();
      //   tpl = H.QRY(hcq).first().key; //"node", 5, 10, "getLocNear").key;
      //   loc = H.Map.findGoodPosition(tpl, pos);

      //   deb("   AST: getLocNear: loc: %s, pos: %s, tpl: %s", H.prettify(loc), pos, tpl);

      //   return loc;

      // },


      /*

        Functions for dynamic assets

      */

      exists: function(amount){
        var hcq = expandHCQ(definition[1], instance);
        return H.QRY(hcq).execute("node", 5, 5, "asset.exists").length >= (amount || 1);
      },
      update: function(fn){
        H.QRY(hcq).forEach(fn.bind(instance));
      },
      nearest: function(amount){

        // deb("   AST: nearest hcq: %s", expandHCQ(definition[1], instance));

        var hcq = expandHCQ(definition[1], instance),
            pos = (
              Array.isArray(instance.position) ? instance.position : 
                instance.position.location()
            ),
            sorter = function(na, nb){
              return (
                H.Map.distance(na.position, pos) - 
                H.Map.distance(nb.position, pos)
              );
            },
            nodes = H.QRY(hcq).execute("node", 5, 5, "nearest").sort(sorter).slice(0, amount || 1),
            ids = nodes.map(function(node){return node.id;});

        deb("   AST: nearest ids: %s", ids);

        return {
          toString: function(){return "[dynres " + ids;},
          location: self.location.bind(null, ids),
          garrison: self.garrison.bind(null, ids),
          destroy:  self.destroy.bind(null, ids),
          gather:   self.gather.bind(null, ids),
          repair:   self.repair.bind(null, ids),          
        };

        
      },


      /*

        Engine commands

      */

      move: function(){},
      destroy: function(/* arguments: [who] */){

        var who = (arguments.length === 1) ? resources : arguments[0];

        Engine.PostCommand(H.Bot.id, {type: "delete-entities", 
          entities: who
        });

        deb("   AST: destroy who: %s", who);

      },
      garrison:     function(/* arguments: [who], whom */){

        deb("   AST: garrison.in: %s", H.toArray(arguments));

        var al = arguments.length,
            who  = (al === 1) ? resources : arguments[0][0],
            whom = (al === 1) ? arguments[0].resources[0] : [arguments[1].id];

        Engine.PostCommand(H.Bot.id, {type: "garrison", 
          entities: whom, // array
          target:   who,  // id
          queued:   false
        });

        deb("   AST: garrison who: %s, whom: %s", who, whom);

      },
      gather: function(/* arguments: [who], what */){

        var al = arguments.length,
            who  = (al === 1) ? resources : arguments[0],
            what = (al === 1) ? arguments[0].id : arguments[1].resources[0];

        if (!!H.Entities[what]){

          Engine.PostCommand(H.Bot.id, {type: "gather", 
            entities: who, 
            target:   what, 
            queued:   false
          });

        }

        deb("   AST: gather who: %s, what: %s", who, !!H.Entities[what] ? H.Entities[what] : "???");

      },
      repair: function(/* arguments: [who], what */){

        deb("   AST: repair: %s", H.toArray(arguments));

        var al = arguments.length,
            who  = (al === 1) ? resources : arguments[0],
            what = (al === 1) ? arguments[0].id : arguments[1].id;

        if (!!H.Entities[what]){

          Engine.PostCommand(H.Bot.id, {type: "repair", 
            entities: who,  // Array
            target:   what, // Int
            autocontinue: true, 
            queued: false
          });

        }

        deb("   AST: repair who: %s, what: %s", who, !!H.Entities[what] ? H.Entities[what] : "???");

      },


      /*

        Listener

      */

      listener: function(msg, id, evt){

        var tpln, meta = H.MetaData[id], resource = self.toResource(id);

        switch (msg){

          case "Ready" :
          case "AIMetadata" :
          case "TrainingFinished":

            if (shared){
              H.Groups.moveSharedAsset(self, id, H.Objects(meta.opid));

            } else {

              tpln = H.Entities[id]._templateName;

              // take over ownership
              if ((type === "train" || type === "construct")){
                meta.opid   = instance.id;
                meta.opname = instance.name;
              } else {
                deb("  INFO: %s was assigned with type: %s", type, self);
              }

              if (type === "construct"){
                if (tpln.indexOf("foundation") !== -1){
                  self.isFoundation = true; //?? too greedy
                  resource.isFoundation = true;
                } else {
                  self.isStructure = true;  //??
                  resource.isStructure = true;
                }
              }

              deb("   AST: #%s, id: %s, meta: %s, shared: %s, tpl: %s", id, msg, H.prettify(meta), shared, tpln);

              // finalize
              resources.push(id);
              H.Events.registerListener(id, self.listener);
              instance.listener.onAssign(resource);

            }

          break;
          
          case "Garrison":
            deb("   AST: msg: %s, id: %s, evt: %s", msg, id, H.prettify(evt));

          break;

          case "ConstructionFinished":

            H.remove(resources, id);
            resources.push(evt.newentity);
            resource.id = evt.newentity;
            instance.listener.onAssign(resource);
            deb("   AST: msg: %s, id: %s, evt: %s", msg, id, H.prettify(evt));

          break;
          
          case "Destroy":

            deb("   AST: in %s id: %s, name: %s, have: %s", msg, id, name, resources);

            // no need to tell group about foundations
            if (!evt.SuccessfulFoundation){
              instance.listener.onDestroy(resource);
            }

            // remove after so match works in instance
            H.remove(resources, id);

            // H.Events takes care of other listerners

          break;

          case "Attacked":
            instance.listener.onAttack(resource, evt.attacker, evt.type, evt.damage);
          break;

          default: 
            deb("ERROR : unknown msg '%s' in %s", msg, self);

        }

      }

    });

    // debug
    self.listener.callsign = name;

    return self;

  };


return H; }(HANNIBAL));

