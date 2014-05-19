/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, logObject */

/*--------------- G R O U P S -------------------------------------------------

  Container for Groups, allows bot to query capabilities and launch instances



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Groups = (function(){

    // Singleton

    var self, groups = {}, t0;

    return {
      init : function(){self=this; return self;},
      log: function(){
        deb();deb();
        deb("GROUPS: -----------");
        H.each(groups, function(name, group){
          deb(" GROUP: %s [%s]", name, group.instances.length);
          group.instances.forEach(function(instance){
            deb("     G: %s, assets: [%s]", instance.name, instance.assets.length);
            instance.assets.forEach(function(ast){
              deb("     G:   %s: [%s], %s, ", ast.nameDef, ast.resources.length, ast);
              ast.resources.forEach(function(id){
                deb("     G:      tlp:  %s", H.Entities[id]);
                deb("     G:      meta: %s", H.prettify(H.MetaData[id]));
              });
            });
          });
        });
        deb("     G: -----------");
      },
      tick : function(secs){
        // delegates down to all instances of all groups
        t0 = Date.now();
        H.each(groups, function(name, group){
          group.instances.forEach(function(instance){
            var interval = ~~instance.interval; // positive ints only
            if (interval > 0 && instance.listener.onInterval){ 
              if (!(H.Bot.ticks % interval)){
                instance.tick(secs);
              }
            }
          });
        });
        return Date.now() - t0;
      },
      register: function(name, definition){

        // initializes a definition, makes it launchable
        
        groups[name] = {
          name: name,
          definition: definition,
          instances: []
        };
        
        deb("   GRP: registered group: %s", name);

      },
      isLaunchable: function(groupname){
        return !!groups[groupname];
      },
      // claim: function(/* arguments: amount, asset [,loc(asset)] */){},
      request: function(amount, asset /* , location */ ){
        
        // sanitize args
        var args = H.toArray(arguments),
            loc  = (
              args.length === 2 ? undefined : 
              args[2].location ? args[2].location() :
              Array.isArray(args[2]) ? args[2] :
                undefined
            );

        // Eco requests are postponed one tick
        asset.isRequested = true;
        H.Triggers.add(H.Economy.request.bind(H.Economy, amount, asset.toOrder(), loc), -1);

        // deb("   GRP: requesting: (%s)", args);    

      },
      // register: function(/* arguments */){
      //   H.toArray(arguments).forEach(function(prop){
      //     this[prop] = H.CreateAsset(this, prop);
      //     this.assets.push(this[prop]);
      //     // deb("   GRP: registered resource %s for %s", prop, instance.name);
      //   });
      // },      
      appointAll: function(){

        // appoints a gorup to a shared structure at game start

        // deb("   GRP: appointing 'g.custodian' for shared structures");

        // H.QRY("INGAME").forEach(function(node){
        //   if (node.metadata && node.metadata.opname && node.metadata.opname === 'g.custodian'){
        //     H.Groups.appoint('g.custodian', node.id);
        //   }
        // });

      },
      appoint: function(groupname, id){

        // launch and init a group instance to manage a shared ingame structure/building
        // called at init and during game, if an order for a shared asset is ready

        var cc = H.MetaData[id].ccid,
            instance = this.launch(groupname, cc),
            node  = H.QRY("INGAME WITH id = " + id, 0).first(),
            nodename  = node.name.split("#")[0];

        H.Entities[id].setMetadata(H.Bot.id, "opmode", "shared");

        // instance.listener.onLaunch();
        instance.structure = ["private", nodename];
        instance.structure = H.CreateAsset(instance, 'structure');
        instance.assets.push(instance.structure);
        // instance.listener.onLaunch();
        instance.structure.listener("Ready", id);

        deb("   GRP: appointed %s for %s, id: %s, nodename: %s, ccid: %s", groupname, H.Entities[id], id, nodename, cc);

        return instance;

      },
      moveSharedAsset: function(resource, id, operator){

        // overwrites former group resource with the operator's one 
        // creates downlink via onConnect
        // assigns shared resource to target operator, 

        var group = resource.instance;

        group[resource.nameDef] = operator.structure;
        operator.listener.onConnect(resource.instance.listener);
        group.listener.onAssign(operator.structure.toResource(id)); // why not op.onAssign ???

        // instance.assets.push(instance[prop]);

        deb("   GRP: %s took over %s as shared asset", operator, resource);

      },
      launch: function(name, ccid){

        // Object Factory; called by bot, economy, whatever

        var instance  = {listener: {}},
            group     = groups[name],
            copy      = function (obj){return JSON.parse(JSON.stringify(obj));},
            whitelist = H.Data.Groups.whitelist;

        instance.id   = H.Objects(instance);
        instance.name = group.name + "#" + instance.id;

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

            // deb, set identifier
            instance.listener.callsign = instance.name;

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
            request: H.Groups.request,
            claim:   H.Groups.claim
          },
          register: function(/* arguments */){
            H.toArray(arguments).forEach(function(prop){
              instance[prop] = H.CreateAsset(instance, prop);
              instance.assets.push(instance[prop]);
              // deb("   GRP: registered resource %s for %s", prop, instance.name);
            });
          },
          tick: function(secs){
            instance.assets.forEach(function(asset){
              asset.tick(secs);
            });
            instance.listener.onInterval();
          },
          position: {
            // set intial position, gets probably overwritten
            location: (function(){
              var pos = H.Map.getCenter([ccid]);
              return function(){return pos;};
            }())
          }        


        });

        deb("   GRP: %s to launch, CC: %s", instance, ccid);

        // call and activate
        instance.listener.onLaunch(ccid);

        return instance;

      }

    };  // return

  }()).init();

return H; }(HANNIBAL));

