/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- G R O U P S -------------------------------------------------

  Container for Groups, allows bot to query capabilities and launch instances


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Groups = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "map",
        "metadata",
        "events",
        "culture",
        "query",
        "entities",  // position
        "resources", // used in supply groups
        "economy",
        "orderqueue",
        "effector",
        "unitstate",
      ],

      instances: [],

    });

    this.dsl = new H.DSL.Language(context, this, "groups").import().initialize();

  };

  H.LIB.Groups.prototype = H.mixin (
  
  /*  Internals
  
    */  

    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Groups,
    log: function(force){
      var t = H.tab, deb = force ? H.deb : this.deb.bind(this);
      deb();
      deb("  GRPS: %s instances %s", this.instances.length, this);
      this.instances
        .sort( (a, b) => a.id > b.id ? 1 : -1)
        .forEach(ins => {
          deb("     G: %s, assets: %s", ins.name, ins.assets.length);
          ins.assets.forEach( ast => {
            deb("           %s: [%s], %s, ", ast.property, ast.resources.length, (ast + "").slice(0, 30));
            ast.resources.forEach( id => {
              if (ast.property !== "path"){
                deb("             %s, meta: %s", this.entities[id], uneval(this.metadata[id]));
              }
            });
          });
        });
    },
    serialize: function(){
      return this.instances.map(this.serializegroup);
    },
    serializegroup: function(instance){
      return {
        id:        instance.id,
        sid:       instance.sid,
        groupname: instance.groupname,
        name:      instance.name,
        position:  instance.position,
        assets:    instance.assets.map(asset => asset.serialize()),
      };    
     },
    initialize: function(){

      if (Array.isArray(this.context.data.groups)){
        this.context.data.groups.forEach(config => {
          this.launch(config);
        });
      
      } else {
        // load mayors and custodians from metadata
        // this.launchOperators();

      }

      return this;

    },
    activate: function(){

      var host, order, instance;

      this.events.on("AIMetadata", msg => {

        // this.deb("  GRPS: on AIMetadata, looking for order id: %s/%s", msg.data.order, typeof msg.data.order);
        // this.deb("  GRPS: meta: %s", uneval(this.metadata[msg.id]));

        // order = this.orderqueue.find(order => order.id === msg.data.order);

        // if (order && order.shared){

        //   host = this.launch({name: "g.custodian", cc: order.cc});
        //   host.structure = ["private", "INGAME WITH id = " + msg.id];
        //   host.structure = this.createAsset({
        //     id: this.context.idgen++,
        //     instance: host,
        //     property: "structure",
        //   });

        //   this.metadata[msg.id].opname = host.name;
        //   this.metadata[msg.id].opid   = host.id;

        //   instance = this.instances.find(i => i.id === order.instance);
        //   host.listener.onConnect(instance.listener);

        // }

      });


    },
    tick: function(secs, ticks){

      // delegates down to all instances of all groups
      
      var interval, t0 = Date.now();
      
      this.instances.forEach(instance => {
        interval = ~~instance.interval; 
        if (interval > 0 && (ticks % interval === 0) && instance.scripts.interval){ 
          this.callWorld(instance, "interval", [secs, ticks]);
        } else {
          // this.deb("  GRPS: @%s did not tick: %s with %s", ticks, instance, interval);
        }
      });

      return Date.now() - t0;

    },

    launchOperators: function () {

      var opname;

      // deb("  GRPS: launching operators for structures");

      this.query("INGAME").forEach(node => {

        // deb("launchOperators: id: %s, key: ", node.id, node.key);

        // logObject(node, "launchOperators.node");
        
        opname = node.metadata.opname;

        // deb("     V: 1 %s %s", node.name, uneval(node.metadata));
        
        if (opname === "none"){
          // deb("  GRPS: appOps %s for %s", opname, node.name);

        } else if (opname === "g.custodian"){
          // deb("  GRPS: appOps %s for %s", opname, node.name);
          this.appoint(node.id, {groupname: "g.custodian", sid: this.metadata[node.id].sid});

        } else if (opname === "g.mayor"){
          // deb("  GRPS: appOps %s for %s", opname, node.name);
          this.appoint(node.id, {groupname: "g.mayor", sid: this.metadata[node.id].sid});

        } else {
          // deb("  GRPS: appOps ignored %s for %s", opname, node.name);

        }

      });

    },    
    findGroup: function (fn){

      var i, il = this.instances.length;

      for (i=0; i<il; i++){
        if (fn(this.instances[i])){
          return this.instances[i];
        }
      }
      H.throw("WARN  : no group found in instances with: %s", fn);
      return undefined;

    },

  /* deals with assets

    */

    findAsset: function (fn){

      var i, a, al, asset, il = this.instances.length;

      for (i=0; i<il; i++){

        al = this.instances[i].assets.length;

        for (a=0; a<al; a++){
          asset = this.instances[i].assets[a];
          if (fn(asset)){
            return asset;
          }
        }

      }
      
      this.deb("WARN  : no asset found: with %s", H.fnBodyfn());
      return undefined;

    },
    createAsset: function(config){

      // this.deb("  GRPS: createAsset.in: def: %s", config.definition);

      var 
        asset = new H.LIB.Asset(this.context).import(), 
        definition = config.definition, // || config.instance[config.property],
        verb = this.getAssetVerb(definition);

      // this.deb("  GRPS: createAsset: id: %s, name: %s, def: ", id, name, definition);
      // this.deb("  GRPS: createAsset: hcq: %s", this.expandHCQ(definition[1], config.instance));

      asset.id = config.id || this.context.idgen++;
      asset.name = config.instance.name + ":" + config.property + "#" + asset.id;

      // make known to group
      config.instance.assets.push(asset);

      asset.initialize({
        instance:    config.instance,
        definition:  definition,
        size:        config.size,
        users:       config.users     || [],
        resources:   config.resources || [],
        property:    config.property,
        shared:      definition[0] === "shared",  
        dynamic:     definition[0] === "dynamic",
        verb:        definition[0] === "dynamic" ?  "dynamic" : verb,  // dynamics are not ordered
        hcq:         this.expandHCQ(definition[1], config.instance),
        claim:       definition[1],
      });    

      asset.activate();

      // this.deb("  GRPS: createAsset: %s, res: %s", asset, uneval(asset.resources));
      
      return asset;

    },   
    getAssetVerb: function (definition){

      var found = false, treenode, verb;

      if (definition[0] === "resource"){
        return "find";

      } else if (definition[0] === "path"){
        return "path";

      } else if (definition[0] === "claim"){
        return "claim";

      } else if (
        definition[0] === "dynamic"   || 
        definition[0] === "shared"    || 
        definition[0] === "exclusive" ){

        this.query(definition[1]).forEach( node => {  // mind units.athen.infantry.archer.a
          if(!found && (treenode = this.culture.tree.nodes[node.name]) && treenode.verb){ 
            verb = treenode.verb;
            found = true;
          }
        });

        // this.deb("  GRPS: getAssetVerb: chose %s for %s", verb, definition[1]);

        return verb;

      } else {
        return H.throw("ERROR : getAssetVerb: strange resource: %s", definition);

      }
    },
    expandHCQ: function (hcq, instance){

      // replaces '<xyz>' in hcq with instance.xyz.hcq

      var 
        pos1  = hcq.indexOf("<"),
        pos2  = hcq.indexOf(">"),
        token = (pos2 > pos1 && pos1 !== -1 && pos2 !== -1) ? 
                  hcq.substr(pos1 +1, pos2 - pos1 -1) : 
                  null;

      if (token === "sid"){
        hcq = H.replace(hcq, "<" + token + ">", instance[token]);

      } else if (token && instance[token] !== undefined){
        hcq = H.replace(hcq, "<" + token + ">", instance[token].hcq);

      } else if (token) {
        this.deb("ERROR : AST: %s/%s or its hcq not found to build: %s", instance, token, hcq);

      }

      return hcq;

    },     

  /* deals with the world

    */

    callWorld: function(instance, scriptname, params){

      // calls a script in this dsl world
      // assuming nouns and verbs are all set

      this.dsl.runScript(instance.world, instance, instance.scripts[scriptname], params);

    },
    nounify: function(world, instance, noun){

      // in a script world is asked to register a noun
      // dsl callbacks handler with actor/instance and noun

      // this.deb("  GRPS: nounify %s %s, def: %s, size: %s", instance, noun, world[noun], world[noun].size);

      if (instance === world[noun]){
        // special case group !== asset
        return instance;

      } else {
        return this.createAsset({
          instance:   instance,
          property:   noun,
          definition: world[noun],
          size:       world[noun].size,
        });
      }

    },

  /* world verbs

    */

    getverbs: function () {

      var path, group;

      // nouns and attributes are listed in corpus

      return {

        request:   (act, sub, obj, n)      => this.request(act, n || 1, sub.host, act.position),
        move:      (act, sub, obj, path)   => this.effector.move(sub.list, path),
        spread:    (act, sub, obj, path)   => this.effector.spread(sub.list, obj.list),
        gather:    (act, sub, obj)         => this.effector.gather(sub.list, obj.list),
        stance:    (act, sub, obj, stance) => this.effector.stance(sub.list, stance),      
        format:    (act, sub, obj, format) => this.effector.format(sub.list, format),
        attack:    (act, sub, obj)         => this.attack(sub.list, obj.list),
        dissolve:  (act, sub)              => this.dissolve(sub.host),
        shelter:   (act, sub, obj)         => H.throw("Shelter not yet implemented"),
        doing:     (act, sub, obj, filter) => sub.list = this.doing(sub, filter),
        repair:    (act, sub, obj)         => {

          // TODO: skip buildings with health > 90%
          // this.deb("  GRPS: repair: s: %s, o: %s", sub, obj);
          this.effector.repair(sub.list, obj.list);

        },
        rotate:   (act, sub, obj, n)         => {
          sub.list = H.rotate(sub.list, n || 1);
          sub.host.resources = H.rotate(sub.host.resources, n || 1);
        },
        modify:    (act, sub, obj, definition) => {
          path = new H.LIB.Path(this.context, sub.list).modify(definition).path;
          sub.host.resources = path;
          sub.update();
        },
        release: (act, sub, obj, item) => {
          // release single entity of asset
          sub.host.releaseEntity(obj.list[0]);
          this.deb("  GRPS: release: act: %s, sub: %s, obj: %s, item: %s", act, sub, obj, item);
        },
        relocate:  (act, sub, obj, path)   => {
          if (Array.isArray(path[0])){
            // pick last entry
            sub.host.position = path[path.length -1];
          } else {
            // pick position
            sub.host.position = path;
          }
          this.deb("  GRPS: relocate: act: %s, sub: %s, obj: %s, item: %s", act, sub, obj, uneval(path));
        },
        transfer:  (act, sub, obj, groupname)   => {
          if ((group = this.findGroup(g => g.groupname === groupname))){
            this.transfer(act, sub, group);
          } else {
            this.deb("  GRPS: transfer: unknown/not launched group: '%s'", groupname);
          }
        },
        refresh:  (act, sub, obj)   => {
          // makes only sense on resources
          H.delete(sub.host.resources, id => !this.entities[id]);
          H.delete(sub.list, id => !this.entities[id]);
        }

      };

    },
    transfer: function(source, assetsource, target){

      // called internal by group via dsl or
      // by economy with assignIdle

      var check, targetasset, dslItem;

      // this.deb("  GRPS: transfer: s: %s, asset: %s, t: %s", source, assetsource, target);

      // H.logObject(source, "source");
      // H.logObject(target, "target");
      // H.logObject(asset, "asset");

      if (!assetsource.list.length){
        this.deb("  GRPS: ignored transfer: no units %s, %s, %s", source, assetsource, target);
        return;
      }

      targetasset = target.assets.filter(a => a.property === assetsource.name)[0];

      this.deb("  GRPS: transfer %s %s from %s -> %s", assetsource.list.length, assetsource.name, source, target);
      this.deb("  GRPS: transfer assets %s -> %s", assetsource, targetasset);
      this.deb("  GRPS: transfer lists %s -> [%s]", assetsource.list, targetasset.resources);

      if (targetasset){

        H.consume(assetsource.list, id => {

          dslItem = {
            name:        "item",
            resources:   [id], 
            ispath:      false, // only units
            isresource:  false, // only units
            foundation:  false, // only units
            toString :   () => H.format("[dslobject transfer item[%s]]", id)
          };

          // take over ownership
          this.metadata[id].opid   = target.id;
          this.metadata[id].opname = target.groupname;

          H.delete(assetsource.host.resources, idass => idass === id);
          targetasset.resources.push(id);

          this.callWorld(target, "assign", [dslItem]);

          this.deb("  GRPS: transfered: %s %s -> %s | %s", id, assetsource, targetasset, uneval(this.metadata[id]));

        });

      } else {

        H.throw("Transfer failed %s, %s, %s", source, assetsource, target);

      }


      // dslItem = {
      //   name:        "item",
      //   resources:   ids, 
      //   ispath:      tpln.contains("path"),      // mark for world.member
      //   isresource:  tpln.contains("resources"), // mark for world.member
      //   foundation:  tpln.contains("foundation"),
      //   toString :   () => H.format("[dslobject item[%s]]", id)
      // };

      // this.groups.callWorld(this.instance, "assign", [dslItem]);

    },
    dissolve: function(instance){

      this.deb("  GRPS: dissolving: %s", instance);
      instance.world = null;
      instance.assets.forEach(asset => asset.release());
      instance.assets = null;
      H.remove(this.instances, instance);
      this.deb("  GRPS: dissolved %s", instance);

    },
    // appoint: function(id, config){

    //   // shared assets are handled by unitless groups like custodian or mayor
    //   // they keep a list of users = other groups to radio repair, etc

    //   // launches and inits a group instance to manage a shared ingame structure/building
    //   // called at init ??and during game??, if an order for a shared asset is ready

    //   var 
    //     instance = this.launch(config),
    //     node = this.query("INGAME WITH id = " + id, 0).first(),
    //     nodename = node.name.split("#")[0];

    //   this.metadata[id].opmode = "shared";
    //   this.metadata[id].opid   = instance.id;
    //   this.metadata[id].opname = instance.groupname;

    //   instance.structure = ["private", nodename];
    //   instance.register("structure");
      
    //   // this.deb("  GRPS: appointed %s for %s, sid: %s", instance.name, this.entities[id], config.sid);

    //   return instance;

    // },
    doing: function(subject, filter){ 

      // filters ids in list on unit ai state
      // e.g. idle, approach, walk, gather

      var 
        ids    = [], 
        states = [],
        other  = [], others,
        list = subject.list,
        actions = filter.split(" ").filter(a => !!a);

      actions.forEach(action => {
        list.forEach(id => {
          var state = this.unitstate(id);
          states.push(state);
          if (action[0] === "!"){
            if (state !== action.slice(1)){ids.push(id);} else {other.push(state);}
          } else {
            if (state === action){ids.push(id);} else {other.push(state);}
          }
        });
      });

      // debug
      // others = H.prettify(H.compress(other));
      // this.deb("  GRPS: doing list for %s: %s, filter: %s, found: %s, other: %s", subject, list.length, filter, ids.length, others);

      return ids;

    },    
    scan: function(instance, positionOrAsset){
      // needs work
      var position, vision;

      if (Array.isArray(positionOrAsset)){
        position = positionOrAsset;
        vision = this.entities[instance.assets.first];

      } else if ( positionOrAsset instanceof H.LIB.Asset ) {
        position = positionOrAsset.position;
      }

      if (!instance.detector){
        instance.detector = this.scanner.createDetector(position);
      }

      return instance.detector.scan(position);

    },
    claim: function( /* instance */ ){},

    request: function(instance, amount, asset, position){
      
      if (!(instance && amount && asset.id && position.length === 2)){

        H.throw("groups.request incomplete: %s, %s, %s, %s", instance, amount, asset, position);

      }

      // this.deb("  GRPS: request: instance: %s, amount: %s, asset: %s, assetid: %s", instance, amount, asset, asset.id);

      asset.isRequested = true;

      this.economy.request({
        amount:     amount,
        sid:        instance.sid,
        location:   position,
        verb:       asset.verb, 
        hcq:        asset.hcq, 
        source:     asset.id, 
        shared:     asset.shared,
      });

    },

  /* launch

    */

    launch: function(config){

      this.deb("  GRPS: launch, %s", uneval(config));

      // Object Factory

      // groups are defined in grp-[config.groupname].js 
      // instance is what is running
      // sid       -> required
      // groupname -> required
      // assets
      // id
      // position
      // assets must be re-created
      // registered props !!!

      var 
        world, 
        pos = this.entities[config.sid].position(),
        instance = {id: config.id || this.context.idgen++};

      // prepare a dsl world
      world = this.dsl.createWorld(instance);
      world.group = instance;
      world.group.size = 1;
      world.nounify("group");
      this.dsl.setverbs(world, this.getverbs());

      H.extend(instance, {

        klass:     "group",
        context:   this.context,
        sid:       config.sid,
        groupname: config.groupname,
        name:      config.groupname + "#" + instance.id,

        // id:        config.id || this.context.idgen++,
        scripts:   {},
        world:     world,
        resources: this.resources, // needs lexical signature
        position:  config.position || pos || this.deb("ERROR : no pos in group"),
        assets:    [],

        toString: function(){return H.format("[%s %s]", this.klass, this.name);},


      });

      // keep a reference
      this.instances.push(instance);

      // copies values from the groups' definition onto instance
      H.each(H.Groups[config.groupname], (prop, value) => {
        
        if (prop === "scripts") {
          H.each(value, (name, fn) => {
            // make 'this' in scripts point to instance
            instance.scripts[name] = fn.bind(instance);
          });

        } else {
          switch (typeof value) {
            case "undefined":
            case "boolean":
            case "number":
            case "string":    instance[prop] = value; break;
            case "object":    instance[prop] = H.deepcopy(value); break; // handles null, too
            case "function":  instance[prop] = value.bind(instance); break;
          }
        }

      });

      // deserialize and register assets
      if (config.assets) {
        config.assets.forEach(cfg => {
          instance[cfg.property] = cfg.definition;
          instance[cfg.property] = this.createAsset(
            H.mixin(cfg, {instance:   instance})
          );
        });
      }

      // log before launching
      // this.deb("   GRP: launch %s args: %s", instance, uneval(config));

      // call dsl to run with world, actor, function and params
      this.callWorld(instance, "launch", [config]);

      return instance;

    }

  });  

return H; }(HANNIBAL));
