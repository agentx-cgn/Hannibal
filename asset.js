/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- A S S E T S -------------------------------------------------

  handles a group's economic resources like estate, units, techs, buildings.
  provides the semantics for the DSL used in plugins


  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  function getAssetVerb(definition){

    var found = false, treenode, storenode, verb;

    if (typeof definition[1] === "object"){

      return "claim";

    } else if (typeof definition[1] === "string") {

      H.QRY(definition[1]).forEach(function(node){  // mind units.athen.infantry.archer.a
        treenode = H.Bot.tree.nodes[node.name];
        if(!found && treenode.verb){ 
          verb = treenode.verb;
          storenode = node;
          found = true;
        }
      });

      // deb("   AST: getAssetVerb: chose %s for %s [%s]", verb, storenode.name, verb.length);

      return verb;

    } else {
      return deb("ERROR : getAssetVerb: strange resource: %s", definition);

    }
  }

  function expandHCQ(hcq, instance){

    // replaces '<xyz>' in hcq with instance.xyz.hcq

    var pos1  = hcq.indexOf("<"),
        pos2  = hcq.indexOf(">"),
        token = (pos2 > pos1 && pos1 !== -1 && pos2 !== -1) ? 
                  hcq.substr(pos1 +1, pos2 - pos1 -1) : 
                  null;

    if (token === "cc"){
      hcq = H.replace(hcq, "<" + token + ">", instance[token]);

    } else if (token && instance[token] !== undefined){
      hcq = H.replace(hcq, "<" + token + ">", instance[token].hcq);

    } else if (token) {
      deb("ERROR : AST: %s/%s or its hcq not found to build: %s", instance, token, hcq);

    }

    return hcq;

  }

  H.createAsset = function(instance, property, resources){

    var 
      asset = new H.Asset(instance, property),
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
      verb:        !dynamic ? getAssetVerb(definition) : "dynamic",  // dynamics are not ordered
      users:       [],
      handler:     asset.listenerNT.bind(asset)
    });    

    asset.initActions(resources);
    // asset.listener.callsign = asset.name;

    asset.activate();

    // deb("   AST: created: %s, res: %s", asset, uneval(asset.resources));
    
    return asset;
  };

  H.Asset = function (instance, property){

    this.instance  = instance;
    this.property  = property;

  };

  H.Asset.prototype = {
    constructor: H.Asset,
    get health () {return H.health(this.resources);},
    get count  () {return this.resources.length;},
    get first  () {return this.toSelection(this.resources.slice(0, 1));},
    get center () {return H.Map.getCenter(this.resources);},
    get spread () {return H.Map.getSpread(this.resources);},

    tick:     function(secs, tick){ /**/ },
    toString: function(){return H.format("[asset %s]", this.name);},
    toLog:    function(){return "    AST: " + this + " " + JSON.stringify(this, null, "      : ");},
    toOrder:  function(){
      return {
        verb:   this.verb, 
        hcq:    this.hcq, 
        source: this.id, 
        shared: this.shared
      };
    },
    activate: function(){

      H.Events.on("OrderReady", this.handler);
      H.Events.on("AIMetadata", this.handler);
      H.Events.on("TrainingFinished", this.handler);
      H.Events.on("EntityRenamed", this.handler);
      H.Events.on("ConstructionFinished", this.handler);
      H.Events.on("Attacked", this.handler);
      H.Events.on("Destroy", this.handler);

    },
    listenerNT: function(msg){

      var resource, tpln, ent, maxRanges, attacker, id = msg.id;

      // deb("   AST: - listenerNT: %s, res: %s, %s", this.name, this.resources, uneval(msg));

      if (msg.name === "OrderReady"){

        if (msg.data.source === this.id){

          // deb("   AST: X listenerNT: %s, %s", this.name, uneval(msg));

          resource = this.toSelection([id]);
          tpln = H.Entities[id]._templateName;

          // take over ownership
          if ((this.verb === "train" || this.verb === "build")){
            H.MetaData[id].opid   = this.instance.id;
            H.MetaData[id].opname = this.instance.name;
          } else {
            deb("ERROR : %s was assigned with verb: %s", this.verb, this);
          }

          if (this.verb === "build"){
            if (tpln.indexOf("foundation") !== -1){
              this.isFoundation = true; //?? too greedy
              resource.isFoundation = true;
            } else {
              this.isStructure = true;  //??
              resource.isStructure = true;
            }
          }

          // deb("   AST: #%s, id: %s, meta: %s, shared: %s, tpl: %s", id, msg, H.prettify(meta), this.shared, tpln);

          // finalize
          this.resources.push(id);
          // fnListener = this.listener.bind(this);
          // fnListener.callsign = this.name;
          // H.Events.registerListener(id, fnListener);
          this.instance.listener.onAssign(resource);          

        } // else { deb("   AST: no match: %s -> %s | %s", msg.data.source, this.id, this.name);}


      } else if (H.contains(this.resources, id)){

        if (msg.name === "Destroy") {

          // deb("   AST: X listenerNT: %s, %s", this.name, uneval(msg));

          // no need to tell group about foundations
          if (!msg.data.foundation){
            resource = this.toSelection([id]);
            this.instance.listener.onDestroy(resource);
          }

          // remove after so match works in instance
          H.remove(this.resources, id);


        } else if (msg.name === "Attacked") {

          // deb("   AST: X listenerNT: %s, %s", this.name, uneval(msg));

          ent = H.Entities[msg.id2];
          resource = this.toSelection([id]);
          if (ent){
            maxRanges = ent.attackTypes().map(type => ent.attackRange(type).max);
            attacker = {
              id: msg.id2,
              position: ent.position(),
              range: Math.max.apply(Math, maxRanges)
            };
            this.instance.listener.onAttack(resource, attacker, msg.data.type, msg.data.damage);
          }          


        } else if (msg.name === "EntityRenamed") {

          // deb("   AST: X listenerNT: %s, %s", this.name, uneval(msg));

          H.remove(this.resources, id);
          this.resources.push(msg.id2);

          // deb("   AST: EntityRenamed %s %s", id,      H.Entities[id] ?      H.Entities[id]._templateName : "unknown");
          // deb("   AST: EntityRenamed %s %s", msg.id2, H.Entities[msg.id2] ? H.Entities[msg.id2]._templateName : "unknown");


        } else if (msg.name === "ConstructionFinished") {

          // deb("   AST: X listenerNT: %s, %s", this.name, uneval(msg));

          // H.remove(this.resources, msg.id2);
          this.isFoundation = false;
          this.isStructure = true;
          // this.resources.push(msg.id2);
          resource = this.toSelection([msg.id]);
          resource.isFoundation = false;
          resource.isStructure = true;
          this.instance.listener.onAssign(resource);

        }



      }

    },
    toSelection: function(resources){
      var asset = new H.Asset(this.instance, this.property);
      asset.name = H.format("[selection %s [%s]]", this.instance.name, resources);
      asset.toString = function(){return asset.name;};
      asset.initActions(resources);
      return asset;
    },
    initActions: function(ids){

      H.extend(this, {

        resources: ids,

        distanceTo: H.Map.distanceTo.bind(null, ids),

        move:     H.Effector.move.bind(null, ids),          
        format:   H.Effector.format.bind(null, ids),
        stance:   H.Effector.stance.bind(null, ids),
        destroy:  H.Effector.destroy.bind(null, ids),

        flee:     function(attacker){H.Effector.flee(ids, [attacker.id]);},
        garrison: function(asset){H.Effector.garrison(ids, asset.resources[0]);},
        gather:   function(asset){
          H.Effector.gather(ids, asset.resources[0]);
          // if (asset.resources && asset.resources.length){H.Effector.gather(ids, asset.resources[0]);}
          // else {deb("WARN  : asset %s no resources", asset.name);}
        },
        repair:   function(asset){
          if (!asset.resources.length){H.throw("asset.repair: no resources");}
          H.Effector.repair(ids, asset.resources[0]);
        },
        collect:  function(targets){
          // deb("   AST: collect: %s", uneval(targets));
          H.Effector.collect(ids, targets.map(t => t.resources[0]));
        },

      });
    },
    release:    function(){
      H.Events.off("OrderReady", this.handler);
      H.Events.off("AIMetadata", this.handler);
      H.Events.off("TrainingFinished", this.handler);
      H.Events.off("EntityRenamed", this.handler);
      H.Events.off("ConstructionFinished", this.handler);
      H.Events.off("Attacked", this.handler);
      H.Events.off("Destroy", this.handler);
      this.resources.forEach(function(id){
        H.MetaData[id].opname = "none";
        delete H.MetaData[id].opid;
      });
      // deb("   ASS: releasing %s", uneval(this.resources));          
      this.resources = [];
    },
    match:      function(asset){
      if(!this.resources){
        H.throw("ERROR : asset.match: this no resources " + this.name);
        return false;
      } else if (!asset.resources){
        H.throw("ERROR : asset.match: asset no resources " + asset);
        return false;
      }
      return this.resources.indexOf(asset.resources[0]) !== -1;
    },
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

        hcq = expandHCQ(this.definition[1], this.instance);

        // deb("   AST: nearest param: %s, hcq: %s", param, hcq);

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
        // nodes = H.QRY(this.hcq).execute().sort(sorter); // "node", 5, 5, "nearest"
        nodes = H.QRY(hcq).execute().sort(sorter); // "node", 5, 5, "nearest"
        ids = nodes.map(function(node){return node.id;}).slice(0, param || 1);

      // look for closest to point
      } else if (Array.isArray(param)){
        ids = [H.Map.nearest(param, this.resources)];

      } else {
        H.throw("WARN  : Asset.nearest: got strange param: %s", param);
        // deb("WARN  : Asset.nearest: got strange param: %s", param);

      }

      // deb("   AST: nearest %s ids: %s, param: %s", this.name, ids, param);

      return this.toSelection(ids);
      
    },
    location:   function(id){

      var loc = [];

      if (id) {
        loc = H.Map.getCenter([id]);
        // deb("   AST: location id: %s of %s, loc: %s", id, this, loc);

      } else if (this.position){
        loc = this.position.location();
        // deb("   AST: location this.position: %s of %s, loc: %s", this.position, this, loc);

      } else if (this.users && this.users.length) { // priotize shared, 
        loc = H.Map.centerOf(this.users.map(function(listener){
          var group = H.Objects(listener.callsign.split("#")[1]);
          if (group.position){
            return group.position.location();
          } else {
            return [];
          }
        }));
        // deb("   AST: location users: %s of %s, loc: %s", H.prettify(this.users), this, loc);

      } else if (this.resources.length){
        // only undestroyed entities, with valid position
        // loc = H.Map.getCenter(this.resources.filter(id => !!H.Entities[id] && !!H.Entities[id].position() ));
        loc = H.Map.getCenter(this.resources);
        // deb("   AST: location resources: %s of %s, loc: %s", H.prettify(this.resources), this, loc);

      } else {
        deb("  WARN: AST found no location for %s, res: %s", this, uneval(this.resources));

      }

      return loc;

    },    
    // listener: function(msg, id, evt){

    //   var 
    //     tpln, attacker, ent, maxRanges, resource, fnListener, 
    //     meta = H.MetaData[id],
    //     resources = this.resources, 
    //     instance = this.instance;

    //   switch (msg){

    //     case "Ready" :
    //     case "AIMetadata" :
    //     case "TrainingFinished":

    //       // deb("   AST: listener %s, msg: %s, id: %s, shared: %s, meta: %s", this, msg, id, this.shared, uneval(meta));

    //       if (this.shared){
    //         H.Groups.moveSharedAsset(this, id, H.Objects(meta.opid));

    //       } else {

    //         resource = this.toSelection([id]);
    //         tpln = H.Entities[id]._templateName;

    //         // take over ownership
    //         if ((this.verb === "train" || this.verb === "build")){
    //           meta.opid   = instance.id;
    //           meta.opname = instance.name;
    //         } else {
    //           deb("ERROR : %s was assigned with verb: %s", this.verb, this);
    //         }

    //         if (this.verb === "build"){
    //           if (tpln.indexOf("foundation") !== -1){
    //             this.isFoundation = true; //?? too greedy
    //             resource.isFoundation = true;
    //           } else {
    //             this.isStructure = true;  //??
    //             resource.isStructure = true;
    //           }
    //         }

    //         // deb("   AST: #%s, id: %s, meta: %s, shared: %s, tpl: %s", id, msg, H.prettify(meta), this.shared, tpln);

    //         // finalize
    //         this.resources.push(id);
    //         fnListener = this.listener.bind(this);
    //         fnListener.callsign = this.name;
    //         H.Events.registerListener(id, fnListener);
    //         instance.listener.onAssign(resource);

    //       }

    //     break;
        
    //     case "Garrison":
    //       deb("   AST: msg: %s, id: %s, evt: %s", msg, id, H.prettify(evt));

    //     break;

    //     case "ConstructionFinished":

    //       H.remove(this.resources, id);
    //       this.resources.push(evt.newentity);
    //       resource = this.toSelection([evt.newentity]);
    //       this.isFoundation = false;
    //       this.isStructure = true;
    //       resource.isFoundation = false;
    //       resource.isStructure = true;
    //       instance.listener.onAssign(resource);
    //       deb("   AST: msg: %s, id: %s, evt: %s, resources: %s", msg, id, H.prettify(evt), resources);

    //     break;
        
    //     case "EntityRenamed":

    //       H.remove(this.resources, evt.entity);
    //       this.resources.push(evt.newentity);
    //       deb("   AST: msg: %s, id: %s, evt: %s, resources: %s", msg, id, H.prettify(evt), resources);

    //     break;
        
    //     case "Destroy":

    //       deb("   AST: in %s id: %s, name: %s, have: %s", msg, id, this.name, this.resources);

    //       // no need to tell group about foundations
    //       if (!evt.SuccessfulFoundation){
    //         resource = this.toSelection([id]);
    //         instance.listener.onDestroy(resource);
    //       }

    //       // remove after so match works in instance
    //       H.remove(this.resources, id);

    //       // H.Events takes care of other listerners

    //     break;

    //     case "Attacked":
    //       ent = H.Entities[evt.attacker];
    //       resource = this.toSelection([id]);
    //       if (ent){
    //         maxRanges = ent.attackTypes().map(type => ent.attackRange(type).max);
    //         attacker = {
    //           id: evt.attacker,
    //           position: ent.position(),
    //           range: Math.max.apply(Math, maxRanges)
    //         };
    //         instance.listener.onAttack(resource, attacker, evt.type, evt.damage);
    //       }
    //     break;

    //     default: 
    //       deb("ERROR : unknown msg '%s' in %s", msg, this);

    //   }

    // }


  };







return H; }(HANNIBAL));


