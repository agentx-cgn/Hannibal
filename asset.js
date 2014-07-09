/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- A S S E T S -------------------------------------------------

  handles a group's economic resources like estate, units, techs, buildings.
  provides the semantics for the DSL used in plugins


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

    var pos1  = hcq.indexOf("<"),
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

  H.createAsset = function(instance, property, resources){

    var asset = new H.Asset(instance, property),
        definition = instance[property],
        id = H.Objects(asset),
        name = H.format("%s:%s#%s", instance.name, property, id),
        shared  = definition[0] === "shared",  
        dynamic = definition[0] === "dynamic";

    H.extend(asset, {
      id:          id,
      name:        name,
      definition:  definition,
      shared:      shared,  
      dynamic:     dynamic,
      hcq:         expandHCQ(definition[1], instance),
      claim:       definition[1],
      type:        !dynamic ? getAssetType(definition) : "dynamic",  // dynamics are not ordered
      users:       []
    });    

    asset.initActions(resources);
    asset.listener.callsign = asset.name;

    deb("   AST: created: %s, res: %s", asset, uneval(asset.resources));
    
    return asset;
  };

  H.Asset = function (instance, property){

    this.instance  = instance;
    this.property  = property;

    Object.defineProperties(this, {
      health: {enumerable: true, get: function(){
        return H.health(this.resources);
      }},
      count:  {enumerable: true, get: function(){
        return this.resources.length;
      }},
      first:  {enumerable: true, get: function(){
        return this.toSelection(this.resources.slice(0, 1));
      }},
      center: {enumerable: true, get: function(){
        return H.Map.getCenter(this.resources);
      }}
    });  

    // logObject(this, "asset.this");

    // deb("   AST: new: %s, res: %s, this.res: %s, keys: %s", instance.name, uneval(resources), uneval(this.resources), Object.keys(this));


  };

  H.Asset.prototype = {
    constructor: H.Asset,
    tick:     function(secs, tick){ /**/ },
    toString: function(){return H.format("[asset %s]", this.name);},
    toLog:    function(){return "    AST: " + this + " " + JSON.stringify(this, null, "      : ");},
    toOrder:  function(){
      return {
        type:   this.type, 
        hcq:    this.hcq, 
        source: this.id, 
        shared: this.shared
      };
    },
    toSelection: function(resources){
      var asset = new H.Asset(this.instance, this.property);
      asset.initActions(resources);
      asset.toString = function(){return H.format("[selection %s [%s]]", this.name, resources);}.bind(this);
      return asset;
    },
    initActions: function(ids){

      H.extend(this, {

        resources: ids,

        distanceTo: H.Map.distanceTo.bind(null, ids),

        move:     H.Engine.move.bind(null, ids),          
        format:   H.Engine.format.bind(null, ids),
        stance:   H.Engine.stance.bind(null, ids),
        destroy:  H.Engine.destroy.bind(null, ids),

        flee:     function(attacker){H.Engine.flee(ids, [attacker.id]);},
        garrison: function(asset){H.Engine.garrison(ids, asset.resources[0]);},
        gather:   function(asset){H.Engine.gather(ids, asset.resources[0]);},
        repair:   function(asset){H.Engine.repair(ids, asset.resources[0]);},
        collect:  function(targets){
          deb("collect: %s", uneval(targets));
          targets.forEach(function(target){
            H.Engine.collect(ids, target.resources[0]);
          });
        }

      });
    },
    release:    function(){
      this.resources.forEach(function(id){
        H.MetaData[id].opname = "none";
        delete H.MetaData[id].opid;
      });
      deb("   ASS: releasing %s", uneval(this.resources));          
      this.resources = [];
    },
    match:      function(asset){return this.resources.indexOf(asset.resources[0]) !== -1;},
    states:     function(){
      var state = {};
      this.resources.forEach(id => state[id] = H.States[id]);
      return state;
    },      
    forEach:     function(fn){

      // this.units.doing("idle").forEach(function(unit){
      //   this.units.stance("aggressive");
      //   unit.move(this.target.point);
      // });

      this.resources.forEach(function(id){
        fn.call(this.instance, this.toSelection([id]));
      }, this);
    },
    doing: function(/* [who,] filters */){ // filters resource on ai state

      var al = arguments.length,
          who     = (al === 1) ? this.resources : arguments[0],
          filters = (al === 1) ? arguments[0] : arguments[1],
          ids = [], state, 
          actions = filters.split(" ").filter(a => !!a);

      actions.forEach(action => {
        who.forEach(id => {
          state = H.States[id];
          if (action[0] === "!"){
            if (state !== action.slice(1)){ids.push(id);}
          } else {
            if (state === action){ids.push(id);}
          }
        });
      });

      // deb("doing: actions: %s, states: %s, ids: %s", 
      //   actions, H.prettify(self.states(resources)), ids
      // );

      return this.toSelection(ids);

    },
    exists: function(amount){
      var hcq = expandHCQ(this.definition[1], this.instance);
      return H.QRY(hcq).execute().length >= (amount || 1); //"node", 5, 5, "asset.exists"
    },
    nearest: function(param){

      var hcq, pos, sorter, nodes, ids;

      // look for nearest from hcq
      if (H.isInteger(param)){

        // deb("   AST: nearest hcq: %s", expandHCQ(definition[1], instance));

        hcq = expandHCQ(this.definition[1], this.instance);
        pos = ( Array.isArray(this.instance.position) ? 
            this.instance.position : 
            this.instance.position.location()
        );
        // deb("   AST: nearest pos: %s", pos);
        sorter = function(na, nb){
          return (
            H.Map.distance(na.position, pos) - 
            H.Map.distance(nb.position, pos)
          );
        };
        nodes = H.QRY(this.hcq).execute().sort(sorter); // "node", 5, 5, "nearest"
        ids = nodes.map(function(node){return node.id;}).slice(0, param || 1);

      // look for closest to point
      } else if (Array.isArray(param)){
        ids = [H.Map.nearest(param, this.resources)];

      }

      // deb("   AST: nearest hcq: %s", hcq);
      // deb("   AST: nearest ids: %s", ids);

      return this.toSelection(ids);
      
    },
    location:   function(id){

      var loc = [];

      if (id) {
        loc = H.Map.getCenter([id]);
        deb("   AST: location id: %s of %s, loc: %s", id, this, loc);

      } else if (this.position){
        loc = this.position.location();
        deb("   AST: location this.position: %s of %s, loc: %s", this.position, this, loc);

      } else if (this.users && this.users.length) { // priotize shared, 
        loc = H.Map.centerOf(this.users.map(function(listener){
          var group = H.Objects(listener.callsign.split("#")[1]);
          if (group.position){
            return group.position.location();
          } else {
            return [];
          }
        }));
        deb("   AST: location users: %s of %s, loc: %s", H.prettify(this.users), this, loc);

      } else if (this.resources.length){
        // only undestroyed entities, with valid position
        // loc = H.Map.getCenter(this.resources.filter(id => !!H.Entities[id] && !!H.Entities[id].position() ));
        loc = H.Map.getCenter(this.resources);
        deb("   AST: location resources: %s of %s, loc: %s", H.prettify(this.resources), this, loc);

      } else {
        deb("  WARN: AST found no location for %s, res: %s", this, uneval(this.resources));

      }

      return loc;

    },    
    listener: function(msg, id, evt){

      var tpln, attacker, ent, maxRanges, resource, meta = H.MetaData[id],
          resources = this.resources, instance = this.instance;

      switch (msg){

        case "Ready" :
        case "AIMetadata" :
        case "TrainingFinished":

          if (this.shared){
            H.Groups.moveSharedAsset(this, id, H.Objects(meta.opid));

          } else {

            resource = this.toSelection([id]);
            tpln = H.Entities[id]._templateName;

            // take over ownership
            if ((this.type === "train" || this.type === "construct")){
              meta.opid   = instance.id;
              meta.opname = instance.name;
            } else {
              deb("ERROR : %s was assigned with type: %s", this.type, this);
            }

            if (this.type === "construct"){
              if (tpln.indexOf("foundation") !== -1){
                this.isFoundation = true; //?? too greedy
                resource.isFoundation = true;
              } else {
                this.isStructure = true;  //??
                resource.isStructure = true;
              }
            }

            deb("   AST: #%s, id: %s, meta: %s, shared: %s, tpl: %s", id, msg, H.prettify(meta), this.shared, tpln);

            // finalize
            this.resources.push(id);
            H.Events.registerListener(id, this.listener.bind(this));
            instance.listener.onAssign(resource);

          }

        break;
        
        case "Garrison":
          deb("   AST: msg: %s, id: %s, evt: %s", msg, id, H.prettify(evt));

        break;

        case "ConstructionFinished":

          H.remove(this.resources, id);
          this.resources.push(evt.newentity);
          resource = this.toSelection([evt.newentity]);
          this.isFoundation = false;
          this.isStructure = true;
          resource.isFoundation = false;
          resource.isStructure = true;
          instance.listener.onAssign(resource);
          deb("   AST: msg: %s, id: %s, evt: %s, resources: %s", msg, id, H.prettify(evt), resources);

        break;
        
        case "EntityRenamed":

          H.remove(this.resources, evt.entity);
          this.resources.push(evt.newentity);
          deb("   AST: msg: %s, id: %s, evt: %s, resources: %s", msg, id, H.prettify(evt), resources);

        break;
        
        case "Destroy":

          deb("   AST: in %s id: %s, name: %s, have: %s", msg, id, this.name, this.resources);

          // no need to tell group about foundations
          if (!evt.SuccessfulFoundation){
            resource = this.toSelection([id]);
            instance.listener.onDestroy(resource);
          }

          // remove after so match works in instance
          H.remove(this.resources, id);

          // H.Events takes care of other listerners

        break;

        case "Attacked":
          ent = H.Entities[evt.attacker];
          resource = this.toSelection([id]);
          if (ent){
            maxRanges = ent.attackTypes().map(type => ent.attackRange(type).max);
            attacker = {
              id: evt.attacker,
              position: ent.position(),
              range: Math.max.apply(Math, maxRanges)
            };
            instance.listener.onAttack(resource, attacker, evt.type, evt.damage);
          }
        break;

        default: 
          deb("ERROR : unknown msg '%s' in %s", msg, this);

      }

    }


  };







return H; }(HANNIBAL));


