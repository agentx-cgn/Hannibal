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
      ],

      instances: [],

    });

    this.dsl = new H.DSL.Language(context, this, "groups").initialize();
    this.initdsl();

  };

  H.LIB.Groups.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Groups,
    log: function(){
      var t = H.tab, deb = this.deb.bind(this);
      deb();
      deb("  GRPS: %s instances", this.instances.length);
      this.instances
        .sort( (a, b) => a.name > b.name ? 1 : -1)
        .forEach(ins => {
          deb("     G: %s, assets: %s", ins.name, ins.assets.length);
          ins.assets.forEach( ast => {
            deb("     G:   %s: [%s], %s, ", t(ast.property, 12), ast.resources.length, ast);
            ast.resources.forEach( id => {
              deb("     G:      tlp:  %s, meta: %s", this.entities[id], uneval(this.metadata[id]));
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
        cc:        instance.cc,
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

      // H.deb("--------------");
      // if (!this.dsl){
      //   this.initdsl();
      // }

      return this;

    },
    activate: function(){

      var host, order, instance;

      this.events.on("AIMetadata", function (msg){

        order = this.economy.orders[msg.data.order];

        if (order && order.shared){

          host = this.launch({name: "g.custodian", cc: order.cc});
          host.structure = ["private", "INGAME WITH id = " + msg.id];
          host.structure = this.createAsset({
            id: this.context.idgen++,
            instance: host,
            property: "structure",
          });

          this.metadata[msg.id].opname = host.name;
          this.metadata[msg.id].opid   = host.id;

          instance = this.instances.find(i => i.id === order.instance);
          host.listener.onConnect(instance.listener);

        }

      });


    },
    tick: function(tick, secs){

      // delegates down to all instances of all groups
      
      var interval, t0 = Date.now();
      
      this.instances.forEach(instance => {
        interval = ~~instance.interval; 
        if (interval > 0 && (tick % interval === 0) && instance.listener.onInterval){ 
          instance.listener.onInterval(secs, tick);
        }
      });

      return Date.now() - t0;

    },
    run: function(instance, scriptname, params){

      // calls a script in this dsl world
      // assuming nouns and verbs are all set

      this.dsl.reset();
      this.dsl.select(instance);
      params.unshift(this.dsl.world);
      instance.scripts[scriptname].apply(instance, params);

    },
    objectify: function(instance, name, resources){

      this.deb("  GRPS: objectify %s %s %s", instance, name, resources);

    },
    nounify: function(world, instance, noun){

      // in a script world is asked to register a noun
      // dsl callbacks handler with actor/instance and noun

      this.deb("  GRPS: nounify %s %s", instance, noun);

      return this.createAsset({
        instance: instance,
        property: noun,
        definition: world[noun],
      });

    },
    initdsl: function () {

      this.deb("  GRPS: initdsl");

      var 
        self = this,
        dsl = this.dsl,
        w   = this.dsl.world;

      // nouns and attributes are listed in corpus

      dsl.setverbs({

        "request":   function(amount){

          // H.logObject(w.actor,   "w.actor");
          // H.logObject(w.subject.host, "w.subject.host");

          // group.instance, amount, asset, position)
          self.request(w.actor.instance, amount || 1, w.subject.host, w.actor.instance.position);

        },
        "relocate":  (path)      => w.subject.position = path[path.length -1],
        "move":      (path)      => this.effector(w.subject.list, path),
        "repair":    (assets)    => this.effector.repair(w.subject.list, assets.list),
        "gather":    (resources) => this.gather(w.subject.list, resources.list),
        "attack":    (enemies)   => this.attack(w.subject.list, enemies.list),
        "stance":    (stance)    => this.effector.stance(w.subject.list, stance),      
        "format":    (format)    => this.effector.format(w.subject.list, format),
        "dissolve":  ()          => this.dissolve(w.subject),
        // "register":  (/*args*/)  => {

        //   H.toArray(arguments).forEach( property => {

        //     if (w.subject[property] instanceof H.LIB.Asset){
        //       this.deb("  GRPS: did not register '%s' for %s", property, w.subject);
            
        //     } else {
        //       w.subject[property] = this.createAsset({
        //         definition: w.subject[property],
        //         instance:   w.subject,
        //         property:   property,
        //       });
        //     }

        //   });

        // }
      });

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
          this.appoint(node.id, {groupname: "g.custodian", cc: this.metadata[node.id].cc});

        } else if (opname === "g.mayor"){
          // deb("  GRPS: appOps %s for %s", opname, node.name);
          this.appoint(node.id, {groupname: "g.mayor", cc: this.metadata[node.id].cc});

        } else {
          // deb("  GRPS: appOps ignored %s for %s", opname, node.name);

        }

      });

    },    
    findGroups: function (fn){
      return this.instances.filter(fn);
    },
    findAsset: function (idOrFn){

      // deb("findAsset: %s", uneval(idOrFn));

      var 
        i, a, il, al, asset, 
        fn = H.isInteger(idOrFn) ? ast => ast.id === idOrFn : idOrFn;

      il = this.instances.length;
      for (i=0; i<il; i++){

        al = this.instances[i].assets.length;
        for (a=0; a<al; a++){

          asset = this.instances[i].assets[a];
          // deb("findAsset: try %s, %s", asset.id, asset);
          if (fn(asset)){
            // deb("findAsset: found %s, %s", asset.id, asset);
            return asset;
          }


        }
      }
      
      this.log();
      return null;

    },
    createAsset: function(config){

      this.deb("  GRPS: createAsset.in: %s", H.attribs(config));

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

      this.deb("  GRPS: created Asset: %s, res: %s", asset, uneval(asset.resources));
      
      return asset;
    },   
    getAssetVerb: function (definition){

      var found = false, treenode, verb;

      if (typeof definition[1] === "object"){

        return "claim";

      } else if (typeof definition[1] === "string") {

        this.query(definition[1]).forEach( node => {  // mind units.athen.infantry.archer.a
          if(!found && (treenode = this.culture.tree.nodes[node.name]) && treenode.verb){ 
            verb = treenode.verb;
            found = true;
          }
        });

        // deb("   AST: getAssetVerb: chose %s for %s", verb, definition[1]);

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

      if (token === "cc"){
        hcq = H.replace(hcq, "<" + token + ">", instance[token]);

      } else if (token && instance[token] !== undefined){
        hcq = H.replace(hcq, "<" + token + ">", instance[token].hcq);

      } else if (token) {
        this.deb("ERROR : AST: %s/%s or its hcq not found to build: %s", instance, token, hcq);

      }

      return hcq;

    },     
    dissolve: function(instance){

      instance.assets.forEach(asset => asset.release());
      instance.assets = null;
      H.remove(this.instances, instance);
      this.deb("  GRPS: dissolved %s", instance);

    },
    appoint: function(id, config){

      // shared assets are handled by unitless groups like custodian or mayor
      // they keep a list of users = other groups to radio repair, etc

      // launches and inits a group instance to manage a shared ingame structure/building
      // called at init ??and during game??, if an order for a shared asset is ready

      var 
        instance = this.launch(config),
        node = this.query("INGAME WITH id = " + id, 0).first(),
        nodename = node.name.split("#")[0];

      this.metadata[id].opmode = "shared";
      this.metadata[id].opid   = instance.id;
      this.metadata[id].opname = instance.name;

      instance.structure = ["private", nodename];
      instance.register("structure");
      
      // deb("  GRPS: appointed %s for %s, cc: %s", instance.name, this.entities[id], config.cc);

      return instance;

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
      
      // H.logObject(instance, "instance");
      // H.logObject(asset, "asset");
      // H.logObject(position, "position");

      if (!(instance && amount && asset.id && position.length === 2)){

        H.throw("groups.request fails: %s, %s, %s, %s", instance, amount, asset, position);

      }

      this.deb("  GRPS: request: instance: %s, amount: %s, asset: %s, assetid: %s", instance, amount, asset, asset.id);

      asset.isRequested = true;

      this.economy.request({
        amount:     amount,
        cc:         instance.cc,
        location:   position,
        verb:       asset.verb, 
        hcq:        asset.hcq, 
        source:     asset.id, 
        shared:     asset.shared,
      });

    },

    launch: function(config){

      this.deb("  GRPS: launch, %s", uneval(config));

      // Object Factory

      // groups are defined in grp-[config.groupname].js 
      // instance is what is running
      // cc        -> required
      // groupname -> required
      // assets
      // id
      // position
      // assets must be re-created
      // registered props !!!

      var 
        ccpos = this.entities[config.cc].position(),
        instance = {id: config.id || this.context.idgen++};

      H.extend(instance, {

        klass:     "group",
        context:   this.context,
        name:      config.groupname + "#" + instance.id,
        id:        config.id || this.context.idgen++,
        cc:        config.cc,
        groupname: config.groupname,
        scripts:   {},

        resources: this.resources, // needs lexical signature

        position:  config.position || ccpos || this.deb("ERROR : no pos in group"),
        assets:    [],
        run:       this.run.bind(this, instance),

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
      // deb("   GRP: launch %s args: %s", instance, uneval(config));

      // call and activate
      this.dsl.select(instance);

      // H.logObject(this.dsl.world, "this.dsl.world");

      instance.scripts.launch(this.dsl.world, config);

      return instance;

    }

  });  

return H; }(HANNIBAL));


      // create the dsl

      // H.extend(instance, {
        
      //   name:      config.groupname + "#" + instance.id,
      //   position:  config.position || this.map.getCenter([instance.cc]),
      //   assets:    [],
      //   run: this.run.bind(this, instance),

        // register:  function(/* arguments */){
        //   // deb("     G: %s register: %s", instance.name, uneval(arguments));

        //   // transforms primitive definition into live object
        //   // except already done by deserialization

        //   H.toArray(arguments).forEach( property => {

        //     if (instance[property] instanceof H.LIB.Asset){
        //       this.deb("  GRPS: did not register '%s' for %s", property, instance);
            
        //     } else {
        //       instance[property] = self.createAsset({
        //         definition: instance[property],
        //         instance:   instance,
        //         property:   property,
        //       });
        //     }

        //   });

        // },

      // });