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
        "metadata",
        "events",
        "culture",
        "query",
        "entities",
        "economy",
      ],

      instances: [],

    });

  };

  H.LIB.Groups.prototype = {
    constructor: H.LIB.Groups,
    log: function(){
      deb();deb("GROUPS: %s -----------", this.instances.length);
      this.instances
        .sort( (a, b) => a.groupname > b.groupname ? 1 : -1)
        .forEach(i => {
          deb("     G: %s, %s, assets: %s", i.name, i.groupname, i.assets.length);
          i.assets.forEach( ast => {
            deb("     G:   %s: [%s], %s, ", ast.property, ast.resources.length, ast);
            ast.resources.forEach( id => {
              deb("     G:      tlp:  %s, meta: %s", this.entities[id], uneval(this.metadata[id]));
            });
          });
        });
      deb("     G: -----------");
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
    },
    clone: function(context){
      context.data[this.name] = this.serialize();
      return new H.LIB[H.noun(this.name)](context);
    },
    serialize: function(){

      var data = [];

      this.instances.forEach(instance => {
        data.push(instance.serialize());
      });

      return data;
    },
    initialize: function(){

      if (Array.isArray(this.context.data.groups)){
        this.context.data.groups.forEach(group => {
          this.instances.push(this.launch(group));
        });
      }

    },
    activate: function(){

      var host, order, instance;

      this.events.on("AIMetadata", function (msg){

        order = this.economy.orders[msg.data.order];

        if (order && order.shared){

          host = this.launch({name: "g.custodian", cc: order.cc});
          host.structure = ["private", "INGAME WITH id = " + msg.id];
          host.structure = this.createAsset(host, "structure");

          this.metadata[msg.id].opname = host.name;
          this.metadata[msg.id].opid   = host.id;

          instance = this.instances.find(i => i.id === order.instance);
          // client = this.objects(order.source).instance;
          host.listener.onConnect(instance.listener);

        }

      });


    },
    tick: function(tick, secs){
      // delegates down to all instances of all groups
      var interval, t0 = Date.now();
      H.each(this.instances, (groupsname, list) => {
        list.forEach(instance => {
          interval = ~~instance.interval; 
          if (interval > 0 && (tick % interval === 0) && instance.listener.onInterval){ 
            instance.assets.forEach(asset => asset.tick(secs, tick));
            instance.listener.onInterval(secs, tick);
          }
        });
      });
      return Date.now() - t0;
    },
    find: function (fn){
      return this.instances.filter(fn);
    },
    createAsset: function(instance, property, resources){

      var 
        asset = new H.Asset(instance, property),
        definition = instance[property],
        id = H.Objects(asset),
        name = H.format("%s:%s#%s", instance.name, property, id),
        shared  = definition[0] === "shared",  
        dynamic = definition[0] === "dynamic",
        hcq = this.expandHCQ(definition[1], instance),
        verb = this.getAssetVerb(definition);

      H.extend(asset, {
        id:          id,
        name:        name,
        definition:  definition,
        shared:      shared,  
        dynamic:     dynamic,
        hcq:         hcq,
        claim:       definition[1],
        verb:        !dynamic ?  verb : "dynamic",  // dynamics are not ordered
        users:       [],
        // handler:     asset.listener.bind(asset)
      });    

      asset.initActions(resources);
      // asset.listener.callsign = asset.name;

      asset.activate();

      // deb("   AST: created: %s, res: %s", asset, uneval(asset.resources));
      
      return asset;
    },   
    getAssetVerb: function (definition){

      var found = false, treenode, storenode, verb;

      if (typeof definition[1] === "object"){

        return "claim";

      } else if (typeof definition[1] === "string") {

        this.query(definition[1]).forEach(function(node){  // mind units.athen.infantry.archer.a
          treenode = this.culture.tree.nodes[node.name];
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
      deb("GROUPS: dissolved %s", instance);

    },
    appoint: function(id, options){

      // shared assets are handled by unitless groups like custodian or mayor
      // they keep a list of users = other groups to radio repair, etc

      // launches and inits a group instance to manage a shared ingame structure/building
      // called at init ??and during game??, if an order for a shared asset is ready

      var 
        instance = this.launch(options),
        node = this.query("INGAME WITH id = " + id, 0).first(),
        nodename = node.name.split("#")[0];

      this.metadata[id].opmode = "shared";
      this.metadata[id].opid   = instance.id;
      this.metadata[id].opname = instance.name;

      instance.structure = ["private", nodename];
      instance.structure = this.createAsset(instance, "structure", [id]);
      instance.assets.push(instance.structure);
      
      deb("   GRP: appointed %s for %s, cc: %s", options.name, this.entities[id], options.cc);

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
      H.Triggers.add( -1,
        H.Economy.request.bind(H.Economy, new H.Order({
          amount:     amount,
          cc:         cc,
          location:   location,
          verb:       asset.verb, 
          hcq:        asset.hcq, 
          source:     asset.id, 
          shared:     asset.shared
        }))
      );

      // deb("   GRP: requesting: (%s)", args);    

    },

    launch: function(config){

      // Object Factory; called by bot, economy, whatever
      // group is defined in grp-xxx.js 
      // instance is what is running
      // cc
      // groupname
      // assets
      // id
      // position
      // assets must be re-created
      // registered props !!!

      var 
        groups = this,
        group = H.Groups[config.groupname], 
        id = config.id || this.context.idgen++,
        instance  = {listener: {}};

      // copies values from definition onto instance
      H.each(group.definition, function(prop, value){
        if (prop === "listener") {
          H.each(group.definition.listener, (name, fn) => {
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

      H.extend(instance, {
        id:        id,
        name:      config.groupname + "#" + id,
        config:    config,
        position:  config.position || this.map.getCenter([config.cc]),
        assets:    [],
        detector:  null,
        dissolve:  groups.dissolve.bind(groups, instance),
        request:   groups.request.bind(groups, instance),
        claim:     groups.claim.bind(groups, instance),
        scan:      groups.scan.bind(groups, instance),
        toString:  function(){return H.format("[group %s]", instance.name);},
        register:  function(/* arguments */){
          H.toArray(arguments).forEach(function(prop){
            instance[prop] = groups.createAsset(instance, prop, []);
            instance.assets.push(instance[prop]);
          });
        },
        serialize: function(){
          
          var data = {
            id: instance.id,
            cc: instance.cc,
            name: instance.name,
            position: instance.position,
            groupname: instance.groupname,
            assets: instance.assets.map(a => a.serialize()),
          };

          return data;

        },
      });

      // keep a reference
      this.instances.push(instance);

      // log before launching
      deb("   GRP: launch %s args: %s", instance, uneval(config));

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

