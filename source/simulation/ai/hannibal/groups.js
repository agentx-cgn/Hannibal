/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, logObject, uneval */

/*--------------- G R O U P S -------------------------------------------------

  Container for Groups, allows bot to query capabilities and launch instances


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Groups = function(context){

    H.extend(this, {

      name: "groups",
      context: context,
      imports: [
        "map",
        "metadata",
        "events",
        "culture",
        "query",
        "entities",
        "resources", // used in supply groups
        "economy",
      ],

      instances: [],

    });

  };

  H.LIB.Groups.prototype = {
    constructor: H.LIB.Groups,
    log: function(){
      var t = H.tab;
      deb();deb("GROUPS: %s instances", this.instances.length);
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
      deb("     G: -----------");
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function(context){
      context.data[this.name] = this.serialize();
      return new H.LIB[H.noun(this.name)](context);
    },
    serialize: function(){
      return this.instances.map(instance => instance.serialize());
    },
    initialize: function(){

      if (Array.isArray(this.context.data.groups)){
        this.context.data.groups.forEach(config => {
          this.launch(config);
        });
      
      } else {
        // load mayors and custodians from metadata
        this.launchOperators();

      }

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
          // instance.assets.forEach(asset => asset.tick(secs, tick)); //??
          instance.listener.onInterval(secs, tick);
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
    findAssets: function (fn){
      var out = [];
      this.instances
        .forEach(instance => {
          instance.assets.forEach(asset => {
            if (fn(asset)){out.push(asset);}
          });
        });
      return out;
    },
    createAsset: function(config){

      // deb("  GRPS: createAsset.in: %s", H.attribs(config));

      var 
        asset = new H.LIB.Asset(this.context).import(), 
        id = config.id || this.context.idgen++,
        definition = config.definition, // || config.instance[config.property],
        name = H.format("%s:%s#%s", config.instance.name, config.property, id),
        verb = this.getAssetVerb(definition);

      // deb("  GRPS: createAsset: id: %s, name: %s, def: ", id, name, definition);
      // deb("  GRPS: createAsset: hcq: %s", this.expandHCQ(definition[1], config.instance));

      asset.initialize({
        id:          id,
        name:        name,
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

      deb("  GRPS: created Asset: %s, res: %s", asset, uneval(asset.resources));
      
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
        deb("ERROR : AST: %s/%s or its hcq not found to build: %s", instance, token, hcq);

      }

      return hcq;

    },     
    dissolve: function(instance){

      instance.assets.forEach(asset => asset.release());
      instance.assets = null;
      H.remove(this.instances, instance);
      deb("  GRPS: dissolved %s", instance);

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
      // instance.structure = this.createAsset({
      //   instance: instance, 
      //   property: "structure",
      //   resources: [id]
      // });
      // instance.assets.push(instance.structure);
      
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
    claim: function(instance){},
    request: function(instance, amount, asset /* , location */ ){
      
      // sanitize args
      var 
        args = H.toArray(arguments),
        location = (
          args.length === 3 ? [] : 
          args[3].location ? args[3].location() :
          Array.isArray(args[3]) ? args[3] :
            []
        );

      asset.isRequested = true;

      // Eco requests are postponed one tick to avoid unevaluated orders in queue
        this.economy.request(new H.LIB.Order(this.context).import().initialize({
          amount:     amount,
          cc:         instance.cc,
          location:   location,
          verb:       asset.verb, 
          hcq:        asset.hcq, 
          source:     asset.id, 
          shared:     asset.shared,
          evaluated:  false
        }));

      // deb("   GRP: requesting: (%s)", args);    

    },

    launch: function(config){

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
        self = this,
        instance  = {
          klass:     "group",
          id:        config.id || this.context.idgen++,
          cc:        config.cc,
          groupname: config.groupname,
          listener:  {},

          resources: this.resources, // needs lexical signature
          economy:   this.economy,   //

        };

      // deb("  GRPS: have: %s, to launch %s", this.instances.length, uneval(instance));

      // copies values from the groups' definition onto instance
      H.each(H.Groups[config.groupname], (prop, value) => {
        
        if (prop === "listener") {
          H.each(value, (name, fn) => {
            instance.listener[name] = fn.bind(instance);
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

        // config:    config,

      H.extend(instance, {
        
        name:      config.groupname + "#" + instance.id,
        position:  config.position || this.map.getCenter([instance.cc]),
        assets:    [],
        detector:  null,

        dissolve:  self.dissolve.bind(self, instance),
        request:   self.request.bind(self, instance),
        claim:     self.claim.bind(self, instance),
        scan:      self.scan.bind(self, instance),
        toString:  function(){return H.format("[%s %s]", this.klass, instance.name);},
        register:  function(/* arguments */){
          // deb("     G: %s register: %s", instance.name, uneval(arguments));

          // transforms primitive definition into live object
          // except already done by deserialization

          H.toArray(arguments).forEach( property => {

            if (instance[property] instanceof H.LIB.Asset){
              deb("  GRPS: did not register '%s' for %s", property, instance);
            
            } else {
              instance[property] = self.createAsset({
                definition: instance[property],
                instance:   instance,
                property:   property,
              });
              instance.assets.push(instance[property]);
              deb("  GRPS: registered '%s' for %s", property, instance);
            }

          });

        },
        serialize: function(){
          return {
            id:        instance.id,
            cc:        instance.cc,
            groupname: instance.groupname,
            name:      instance.name,
            position:  instance.position,
            assets:    instance.assets.map(a => a.serialize()),
          };

        },
      });
      
      // deserialize and register assets
      if (config.assets) {
        config.assets.forEach(cfg => {
          instance[cfg.property] = cfg.definition;
          instance[cfg.property] = self.createAsset(
            H.mixin(cfg, {instance:   instance})
          );
        });
      }

      // keep a reference
      this.instances.push(instance);

      // log before launching
      // deb("   GRP: launch %s args: %s", instance, uneval(config));

      // call and activate
      instance.listener.onLaunch(config);

      return instance;

    }

  };  

  // H.Groups = (function(){

    //   // Singleton

    //   var self, groups = {}, t0;

    //   return {
    //     boot: function(){self=this; return self;},
    //     log:  function(){
    //     },
    //     tick : function(secs, tick){
    //     },
    //     init: function(){
    //       deb();deb();deb("GROUPS: register...");
    //       H.each(H.Groups, function(name, definition){
    //         if (definition.active) {
    //           switch(name.split(".")[0]){
    //             case "g": 
    //               groups[name] = {
    //                 name: name,
    //                 definition: definition,
    //                 instances: []
    //               };
    //               deb("      : %s", name);
    //             break;
    //           }
    //         }
    //       });
    //     },
    //     isLaunchable: function(groupname){
    //       return !!groups[groupname];
    //     },
    //     scan: function(instance, position){

    //       if (!instance.detector){
    //         instance.detector = this.scanner.detector(position);
    //       }

    //       return instance.detector.scan(position);

    //     },
    //     claim: function(instance){},
    //     request: function(instance, amount, asset /* , location */ ){
          
    //       // sanitize args
    //       var 
    //         args = H.toArray(arguments),
    //         location = (
    //           args.length === 3 ? [] : 
    //           args[3].location ? args[3].location() :
    //           Array.isArray(args[3]) ? args[3] :
    //             []
    //         );

    //       asset.isRequested = true;

    //       // Eco requests are postponed one tick to avoid unevaluated orders in queue
    //       H.Triggers.add( -1,
    //         H.Economy.request.bind(H.Economy, new H.Order({
    //           amount:     amount,
    //           cc:         cc,
    //           location:   location,
    //           verb:       asset.verb, 
    //           hcq:        asset.hcq, 
    //           source:     asset.id, 
    //           shared:     asset.shared
    //         }))
    //       );

    //       // deb("   GRP: requesting: (%s)", args);    

    //     },
    //     moveSharedAsset: function(asset, id, operator){

    //       // overwrites former group asset with the operator's one 
    //       // creates downlink via onConnect
    //       // assigns shared asset to target operator, 

    //       // deb("   GRP: moveSharedAsset ast: %s, id: %s, op: %s", asset, id, operator);

    //       var group = asset.instance;

    //       group[asset.property] = operator.structure;
    //       operator.listener.onConnect(asset.instance.listener);
    //       group.listener.onAssign(operator.structure.toSelection([id])); // why not op.onAssign ???

    //       // instance.assets.push(instance[prop]);

    //       // deb("   GRP: %s took over %s as shared asset", operator, asset);

    //     },
    //     getGroupTechnologies: function(launch){

    //       // [   4,    1, "g.scouts",     {cc:cc, size: 5}],

    //       var def = groups[launch[2]].definition;

    //       return def.technologies || [];

    //     },
    //     getExclusives: function(launch){

    //       // [   4,    1, "g.scouts",     {cc:cc, size: 5}],

    //       deb("   GRP: getExclusives: %s", uneval(launch));

    //       var def = groups[launch[2]].definition;

    //       return def.exclusives ? def.exclusives(launch[3]) : {};

    //     },
    //     launch: function(options){

    //       // Object Factory; called by bot, economy, whatever

    //       var 
    //         instance  = {listener: {}},
    //         name      = options.name,
    //         group     = groups[name],
    //         copy      = function (obj){return JSON.parse(JSON.stringify(obj));},
    //         whitelist = H.Data.Groups.whitelist;

    //       if (!group){return deb("ERROR : can't launch unknown group: %s", name);}

    //       instance.id   = H.Objects(instance);
    //       instance.name = group.name + "#" + instance.id;
    //       instance.listener.callsign = instance.name;

    //       // keep a reference
    //       group.instances.push(instance);

    //       // first copies values, objects, arrays, functions from definition to instance
    //       H.each(group.definition, function(prop, value){

    //         if (prop === "listener") {

    //           whitelist.forEach(function(name){
    //             if (value[name] !== undefined) {
    //               instance.listener[name] = value[name].bind(instance);
    //             }
    //           });

    //         } else {
    //           switch (typeof value) {
    //             case "undefined":
    //             case "boolean":
    //             case "number":
    //             case "string":    instance[prop] = value; break;
    //             case "object":    instance[prop] = copy(value); break; // handles null, too
    //             case "function":  instance[prop] = value.bind(instance); break;
    //           }

    //         }

    //       });

    //       // second adds/(overwrites) support objects and functions
    //       H.extend(instance, {
    //         assets:     [],
    //         toString:   function(){return H.format("[group %s]", instance.name);},
    //         economy:    {
    //           request: H.Groups.request.bind(null, options.cc),
    //           claim:   H.Groups.claim.bind(null, options.cc)
    //         },
    //         register: function(/* arguments */){
    //           H.toArray(arguments).forEach(function(prop){
    //             instance[prop] = H.createAsset(instance, prop, []);
    //             instance.assets.push(instance[prop]);
    //           });
    //         },
    //         tick: function(secs, ticks){
    //           instance.assets.forEach(function(asset){
    //             asset.tick(secs, ticks);
    //           });
    //           instance.listener.onInterval(secs, ticks);
    //         },
    //         position: {
    //           // set intial position, gets probably overwritten
    //           location: (function(){
    //             var pos = H.Map.getCenter([options.cc]);
    //             return function(){return pos;};
    //           }())
    //         },
    //         postpone: function(ticks, fn /* , args*/){
    //           var args = H.toArray(arguments).slice(2);
    //           H.Triggers.add(H.binda(fn, instance, args), ticks *-1);
    //         },
    //         dissolve: function(){
    //           H.Groups.dissolve(instance);
    //         }

    //       });

    //       deb("   GRP: launch %s args: %s", instance, uneval(options));

    //       // call and activate
    //       instance.listener.onLaunch(options);

    //       return instance;

    //     }

    //   };  // return

    // }()).boot();

return H; }(HANNIBAL));

