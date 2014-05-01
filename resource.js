/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, Engine, deb, logObject */

/*--------------- R E S O U R C E ---------------------------------------------

  handles a group's resources like estate, units, techs, buildings



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  var mapper = {
        "TRAINEDBY":    "train",
        "BUILDBY":      "construct",
        "RESEARCHEDBY": "research"
      };

  function getResType(res){

    var found = false, hcq, type, nodes;

    if (typeof res[2] === "object"){
      return "claim";

    } else if (typeof res[2] === "string") {
      nodes = H.QRY(res[2], 0).execute("", 0, 0, "getResType"); // enforce no debug info
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
      return type;

    } else {
      return deb("ERROR : getResType: strange resource: %s", res[2]);

    }
  }

  function expandHQC(hcq, instance){

    // replaces '<xyz>' in hcq with instance.xyz.hcq

    var pos1  = hcq.indexOf("<"),
        pos2  = hcq.indexOf(">"),
        token = (pos2 > pos1 && pos1 !== -1 && pos2 !== -1) ? 
                  hcq.substr(pos1 +1, pos2 - pos1 -1) : 
                  null;

    if (token && instance[token] !== undefined){
      hcq = H.replace(hcq, "<" + token + ">", instance[token].hcq);
      // deb("   RES: expandHQC: %s", hcq);
    } else if (token) {
      deb(" ERROR : %s/%s or its hcq not found to build: %s", instance, token, hcq);
    }

    return hcq;

  }

  H.CreateResource = function(instance, nameProp){

    // Object Factory

    var self        = {}, 
        id          = H.Objects(self),
        name        = H.format("%s:%s#%s", instance.name, nameProp, id),
        nameDef     = nameProp,
        definition  = instance[nameDef],  // saving the original definition
        amount      = definition[0],
        exclusive   = (definition[1] === "exclusive"),
        shared      = (definition[1] === "shared"),  
        dynamic     = (definition[1] === "dynamic"),
        hcq         = expandHQC(definition[2], instance),
        type        = !dynamic ? getResType(definition) : "unknown",  // dynamics are not ordered
        claim       = definition[2],
        resources   = [],                 // these are entity ids
        users       = [];                 // these are group listeners

    // deb("   RES: have type: %s FOR %s/%s", type, instance.name, prop);


    Object.defineProperty(self, 'health', {enumerable: true, get: function(){
      var curHits = 0, maxHits = 0;
      resources.forEach(function(id){
        if (!H.Entities[id]){
          deb("Error: Health: id: %s in resources, but not in entities", id);
        } else {
          curHits += H.Entities[id].hitpoints();
          maxHits += H.Entities[id].maxHitpoints();
        }
      });
      return (curHits / maxHits).toFixed(1);
    }});    


    H.extend(self, {
      id:         id, 
      hcq:        hcq, 
      name:       name, 
      users:      users, 
      amount:     amount, 
      nameDef:    nameDef, 
      instance:   instance, 
      resources:  resources, 
      isRequested: false,
      toString:   function(){return H.format("[resource %s]", name);},
      toLog:      function(){
        return "    RES: " + self + " " + JSON.stringify(self, null, "      : ");
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
        return {
          id:         id,
          name:       name,
          shared:     shared,
          location:   self.location.bind(null, id),
          gather:     self.gather.bind(null, id),
          repair:     self.repair.bind(null, id),
          garrison:   self.garrison.bind(null, id),
          destroy:    self.destroy.bind(null, id),
          toOrder:    self.toOrder,
          toString:   function(){return H.format("[res %s]", name);}
        };
      },
      tick: function(time){

      },
      first: function(){
        return (resources.length === 0) ? undefined : self.toResource(resources[0]);
      },
      sort:     function(filter){

        // updates and sort a resources of a dynmaic resource

        var oper, prop, nodes, sortPosition, sortFunc, old = resources;

        filter = filter.split(" ").filter(function(s){return !!s;});
        oper   = filter[0];
        prop   = filter[1];
        nodes  = H.QRY(hcq).execute(); //"node", 5, 5, "resource.sort");

        if (dynamic) {
          switch (prop) {
            case "distance":
              if (!instance.position) {
                deb("ERROR : %s has no position", instance);
                logObject(instance, "instance");
              }
              sortPosition = instance.position.location();
              sortFunc  = function(na, nb){

                // if (! (typeof na.position === "function")){
                //   logObject(na, "na in res.sort");
                // }

                var aDist = H.Map.distance(na.position, sortPosition),
                    bDist = H.Map.distance(nb.position, sortPosition);
                return oper === '<' ? aDist - bDist : bDist - aDist;
              };
            break;
          }
          resources = nodes.sort(sortFunc).map(function(node){return node.id;});
        }

        deb("   RES: %s sort/%s: value: %s, resources: old: %s, new: %s", self, prop, sortPosition, H.prettify(old), H.prettify(resources));

      },
      // first:      function(who){return resources.length === 1;}, //TODO: very first
      match:      function(who){
        // deb("   RES: %s match who: %s with id(): %s, ress: %s", name, who, who.id, resources);
        return resources.indexOf(who.id) !== -1;
      },
      length:     function(){return resources.length;},
      location:   function(id){

        var loc = [];

        if (id) {
          loc = H.Map.getCenter([id]);
          deb("   RES: location id: %s of %s, loc: %s", id, self, loc);

        } else if (self.position){
          loc = self.position.location();
          deb("   RES: location self.position: %s of %s, loc: %s", self.position, self, loc);

        } else if (users.length) { // priotize shared, 
          loc = H.Map.centerOf(users.map(function(listener){
            var group = H.Objects(listener.callsign.split("#")[1]);
            if (group.position){
              return group.position.location();
            } else {
              return [];
            }
          }));
          deb("   RES: location users: %s of %s, loc: %s", H.prettify(users), self, loc);

        } else if (resources.length){
          loc = H.Map.getCenter(resources);
          deb("   RES: location resources: %s of %s, loc: %s", H.prettify(resources), self, loc);

        } else {
          deb("   RES: Error: found no location for %s", self);

        }

        return loc;

      },
      state:      function(){
        var state = {};
        resources.forEach(function(id){
          state[id] = H.Entities[id].unitAIState().split(".").slice(-1)[0].toLowerCase();
        });
        return state;
      },
      getLocNear: function(where){

        // assuming a lot.

        var pos, tpl, loc;

        if (!where){
          deb("ERROR : getLocNear NO where %s", self);
          return null;
        } // that's ok if group has no location yet.

        if(!where.location){
          logObject(where, "where.location!! " + where);
        }

        pos = where.location();
        tpl = H.QRY(hcq).first().key; //"node", 5, 10, "getLocNear").key;
        loc = H.Map.findGoodPosition(tpl, pos);

        deb("   RES: getLocNear: loc: %s, pos: %s, tpl: %s", H.prettify(loc), pos, tpl);

        return loc;

      },
      move:       function(){},
      destroy:     function(/* arguments: [who] */){

        var who = (arguments.length === 1) ? resources : [arguments[0]];

        Engine.PostCommand(H.Bot.id, {type: "delete-entities", 
          entities: who
        });

        deb("   RES: destroy who: %s", who);

      },
      garrison:     function(asset){

        deb("   RES: garrison.in: %s", asset);
        logObject(asset, "asset");

        var who   = resources,
            where = asset.resources[0];

        Engine.PostCommand(H.Bot.id, {type: "garrison", 
          entities: who, 
          target:   where, 
          queued:   false
        });

        deb("   RES: garrison who: %s, where: %s", who, where);
        // deb("   RES: garrison who: %s, where: %s, %s", who, where, H.Entities[where]._templateName);

      },
      gather:     function(/* arguments: [who], what */){

        var al = arguments.length,
            who  = (al === 1) ? resources : [arguments[0]],
            what = (al === 1) ? arguments[0].id : arguments[1].resources[0];

        Engine.PostCommand(H.Bot.id, {type: "gather", 
          entities: who, 
          target:   what, 
          queued:   false
        });

        deb("   RES: gather who: %s, what: %s, %s", who, what, H.Entities[what]._templateName);

      },
      repair:     function(/* arguments: [who], what */){

        var al = arguments.length,
            who  = (al === 1) ? resources : [arguments[0]],
            what = (al === 1) ? arguments[0].id : arguments[1].resources[0];

        Engine.PostCommand(H.Bot.id, {type: "repair", 
          entities: who,  // Array
          target:   what, // Int
          autocontinue: true, 
          queued: false
        });

        deb("   RES: repair who: %s, what: %s, %s", who, what, (what ? H.Entities[what]._templateName : "???"));

      },


      listener: function(msg, id, evt){

        var tpln, // operator,
            meta = H.MetaData[id],
            resource = self.toResource(id);
            // resource = {
            //   id:       id,
            //   name:     name,
            //   shared:   shared,
            //   gather:   self.gather.bind(null, id),
            //   repair:   self.repair.bind(null, id),
            //   toOrder:  self.toOrder,
            //   toString: function(){return H.format("[res %s %s]", id, name);}
            // };

        switch (msg){

          case "Ready" :
          case "AIMetadata" :
          case "TrainingFinished":

            if (shared){
              H.Groups.moveSharedResource(self, id, H.Objects(meta.opid));
              // operator = H.Objects(meta.opid);
              // operator.listener.onConnect(instance.listener);
              // instance[nameRes] = operator.structure;
              // instance.listener.onAssign(operator.structure.toResource(id));
              // deb("   RES: patched shared res: %s onto: %s", self, operator.name);

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

              deb("   RES: #%s, id: %s, meta: %s, shared: %s, tpl: %s", id, msg, H.prettify(meta), shared, tpln);

              // allows match
              resources.push(id);

              // connect to H.Events or operator
              // if (shared){
              //   operator = H.Objects(meta.opid);
              //   operator.listener.onConnect(self.listener);
              // } else {
                H.Events.registerListener(id, self.listener);
              // }

              instance.listener.onAssign(resource);

            }

          break;
          
          case "Garrison":
            deb("   RES: msg: %s, id: %s, evt: %s", msg, id, H.prettify(evt));

          break;

          case "ConstructionFinished":

            H.remove(resources, id);
            resources.push(evt.newentity);
            resource.id = evt.newentity;
            instance.listener.onAssign(resource);
            deb("   RES: msg: %s, id: %s, evt: %s", msg, id, H.prettify(evt));

          break;
          
          case "Destroy":

            deb("   RES: in %s id: %s, name: %s, have: %s", msg, id, name, resources);

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

    // if(dynamic){self.update();}
    
    // debug
    self.listener.callsign = name;

    return self;



  };


return H; }(HANNIBAL));

