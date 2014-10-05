/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, logObject, uneval */

/*--------------- G R O U P S -------------------------------------------------

  Container for Groups, allows bot to query capabilities and launch instances



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Groups = (function(){

    // Singleton

    var self, groups = {}, t0;

    return {
      boot: function(){self=this; return self;},
      log:  function(){
        deb();deb();deb("GROUPS: -----------");
        H.each(groups, function(name, group){
          deb(" GROUP: %s instances: %s", name, group.instances.length);
          group.instances.forEach(function(instance){
            deb("     G: %s, assets: %s", instance.name, instance.assets.length);
            instance.assets.forEach(function(ast){
              deb("     G:   %s: [%s], %s, ", ast.property, ast.resources.length, ast);
              ast.resources.forEach(function(id){
                deb("     G:      tlp:  %s, meta: %s", H.Entities[id], H.prettify(H.MetaData[id]));
              });
            });
          });
        });
        deb("     G: -----------");
      },
      init: function(){
        deb();deb();deb("GROUPS: register...");
        H.each(H.Plugins, function(name, definition){
          if (definition.active) {
            switch(name.split(".")[0]){
              case "g": 
                // H.Groups.register(name, definition);
                groups[name] = {
                  name: name,
                  definition: definition,
                  instances: []
                };
                deb("      : %s", name);
              break;
            }
          }
        });
      },
      tick : function(secs, ticks){
        // delegates down to all instances of all groups
        t0 = Date.now();
        H.each(groups, function(name, group){
          group.instances.forEach(function(instance){
            var interval = ~~instance.interval; // positive ints only
            if (interval > 0 && instance.listener.onInterval){ 
              if (ticks % interval === 0){
                instance.tick(secs, ticks);
              }
            }
          });
        });
        return Date.now() - t0;
      },
      // register: function(name, definition){

      //   // initializes a definition, makes it launchable
        
      //   groups[name] = {
      //     name: name,
      //     definition: definition,
      //     instances: []
      //   };

      // },
      isLaunchable: function(groupname){
        return !!groups[groupname];
      },
      claim: function(ccid){},
      request: function(ccid, amount, asset /* , location */ ){
        
        // sanitize args
        var args = H.toArray(arguments),
            location  = (
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
            ccid:       ccid,
            location:   location,
            verb:       asset.verb, 
            hcq:        asset.hcq, 
            source:     asset.id, 
            shared:     asset.shared
          }))
        );

        // deb("   GRP: requesting: (%s)", args);    

      },
      appoint: function(groupname, id){

        // launch and init a group instance to manage a shared ingame structure/building
        // called at init ??and during game??, if an order for a shared asset is ready

        var cc = H.MetaData[id].ccid,
            instance = this.launch(groupname, cc),
            node  = H.QRY("INGAME WITH id = " + id, 0).first(),
            nodename  = node.name.split("#")[0];

        H.Entities[id].setMetadata(H.Bot.id, "opmode", "shared");
        H.Entities[id].setMetadata(H.Bot.id, "opid",   instance.id);
        H.Entities[id].setMetadata(H.Bot.id, "opname", instance.name);

        instance.structure = ["private", nodename];
        instance.structure = H.createAsset(instance, 'structure', [id]);
        // instance.structure.resources.push(id);
        instance.assets.push(instance.structure);
        
        H.Events.registerListener(id, instance.structure.listener.bind(instance.structure));

        deb("   GRP: appointed %s for %s, id: %s, nodename: %s, ccid: %s", groupname, H.Entities[id], id, nodename, cc);

        return instance;

      },
      moveSharedAsset: function(asset, id, operator){

        // overwrites former group asset with the operator's one 
        // creates downlink via onConnect
        // assigns shared asset to target operator, 

        // deb("   GRP: moveSharedAsset ast: %s, id: %s, op: %s", asset, id, operator);

        var group = asset.instance;

        group[asset.property] = operator.structure;
        operator.listener.onConnect(asset.instance.listener);
        group.listener.onAssign(operator.structure.toSelection([id])); // why not op.onAssign ???

        // instance.assets.push(instance[prop]);

        // deb("   GRP: %s took over %s as shared asset", operator, asset);

      },
      dissolve: function(instance){
        H.each(groups, function(name, group){
          group.instances.forEach(function(inst){ 
            if (inst === instance){
              instance.assets.forEach(asset => asset.release());
              instance.assets = null;
              H.remove(group.instances, inst);
              deb("GROUPS: dissolved %s", instance);
            } 
          });
        });
      },
      launch: function(name, ccid, args){

        // Object Factory; called by bot, economy, whatever

        var instance  = {listener: {}},
            group     = groups[name],
            copy      = function (obj){return JSON.parse(JSON.stringify(obj));},
            whitelist = H.Data.Groups.whitelist;

        if (!group){return deb("ERROR : can't launch unknown group: %s", name);}

        instance.id   = H.Objects(instance);
        instance.name = group.name + "#" + instance.id;
        instance.listener.callsign = instance.name;

        // keep a reference
        group.instances.push(instance);

        // first copies values, objects, arrays, functions from definition to instance
        H.each(group.definition, function(prop, value){

          if (prop === "listener") {

            whitelist.forEach(function(name){
              if (value[name] !== undefined) {
                instance.listener[name] = value[name].bind(instance);
              }
            });

          } else {
            switch (typeof value) {
              case "undefined":
              case "boolean":
              case "number":
              case "string":    instance[prop] = value; break;
              case "object":    instance[prop] = copy(value); break; // handles null, too
              case "function":  instance[prop] = value.bind(instance); break;
            }

          }

        });

        // second adds/(overwrites) support objects and functions
        H.extend(instance, {
          assets:     [],
          toString:   function(){return H.format("[group %s]", instance.name);},
          economy:    {
            request: H.Groups.request.bind(null, ccid),
            claim:   H.Groups.claim.bind(null, ccid)
          },
          register: function(/* arguments */){
            H.toArray(arguments).forEach(function(prop){
              instance[prop] = H.createAsset(instance, prop, []);
              instance.assets.push(instance[prop]);
            });
          },
          tick: function(secs, ticks){
            instance.assets.forEach(function(asset){
              asset.tick(secs, ticks);
            });
            instance.listener.onInterval(secs, ticks);
          },
          position: {
            // set intial position, gets probably overwritten
            location: (function(){
              var pos = H.Map.getCenter([ccid]);
              return function(){return pos;};
            }())
          },
          postpone: function(ticks, fn /* , args*/){
            var args = H.toArray(arguments).slice(2);
            H.Triggers.add(H.binda(fn, instance, args), ticks *-1);
          },
          dissolve: function(){
            H.Groups.dissolve(instance);
          }

        });

        deb("   GRP: %s launch, cc: %s, args: %s", instance, ccid, uneval(args));

        // call and activate
        instance.listener.onLaunch.apply(null, [ccid].concat(args));

        return instance;

      }

    };  // return

  }()).boot();

return H; }(HANNIBAL));

