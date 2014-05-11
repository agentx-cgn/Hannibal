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
      request: function(/* arguments: [amount,] asset [,locasset] */){
        
        // sanitize args
        var args      = H.toArray(arguments),
            aLen      = args.length,
            hasAmount = H.isInteger(args[0]), 
            amount    = hasAmount  ? args[0] : args[0].amount,
            asset     = hasAmount  ? args[1] : args[0],
            locRes    = aLen === 3 ? args[2] : aLen === 2 && !hasAmount ? args[1] : undefined,
            // loc       = locRes ? asset.getLocNear(locRes) : undefined,
            loc       = locRes ? locRes.location() : undefined,
            type      = asset.type;

        // Eco requests are postponed one tick
        asset.isRequested = true;
        H.Triggers.add(H.Economy.request.bind(H.Economy, amount, asset.toOrder(), loc), -1);

        deb("   GRP: requesting: (%s)", args);    

      },
      appointAll: function(){

        // appoints a gorup to a shared structure at game start

        deb("   GRP: appointing 'g.custodian' for shared structures");

        H.QRY("INGAME").forEach(function(node){
          if (node.metadata && node.metadata.opname && node.metadata.opname === 'g.custodian'){
            H.Groups.appoint('g.custodian', node.id);
          }
        });

      },
      appoint: function(groupname, id){

        // launch and init a group instance to manage a shared ingame structure/building

        var instance = this.launch(groupname),
            node  = H.QRY("INGAME WITH id = " + id, 0).first(),
            nodename  = node.name.split("#")[0];

        // H.Entities[id].setMetadata(H.Bot.id, "opname", groupname);
        // H.Entities[id].setMetadata(H.Bot.id, "opid", group.id);

        H.Entities[id].setMetadata(H.Bot.id, "opmode", "shared");

        instance.structure = [1, "private", nodename];
        instance.structure = H.CreateAsset(instance, 'structure');
        instance.assets.push(instance.structure);
        // H.Events.registerListener(id, group.structure.listener); //??
        instance.listener.onLaunch();
        instance.structure.listener("Ready", id);

        deb("   GRP: appointed %s for %s, id: %s, nodename: %s", groupname, H.Entities[id], id, nodename);

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

        deb("   GRP: moved shared res: %s to: %s", resource, operator);

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
          positions:  [],
          assets:     [],
          toString:   function(){return H.format("[group %s]", instance.name);},
          economy:    {
            // request: function( arguments: [amount,] resource [,locResource] ){
            //   H.Groups.request.apply(null, arguments);
            // },
            request: H.Groups.request,
            barter:  function(sell, buy, amount){
              H.Economy.barter(instance, sell, buy, amount);
            }
          },
          claim: function(prop){
            // deb("     g: claim.in resource %s by %s", prop, this.name);
          },
          register: function(/* arguments */){
            H.toArray(arguments).forEach(function(prop){
              instance[prop] = H.CreateAsset(instance, prop);
              instance.assets.push(instance[prop]);
              // deb("   GRP: registered resource %s for %s", prop, instance.name);
            });
          },
          postpone: function(ticks, fn, args){
            // this H.binda...
            //H.Triggers.add(fn.binda(instance, args), ticks *-1);
            deb("ERROR : binda not defined");
          },
          tick: function(secs){
            instance.assets.forEach(function(asset){
              asset.tick(secs);
            });
            instance.listener.onInterval();
          },
          position: {
            // set intial position, gets probably overwritten
            location: function(){return H.Map.getCenter([ccid]);}
          }        


        });

        deb("   GRP: launching group: %s for cc: %s", instance.name, ccid);

        // call and activate
        instance.listener.onLaunch();

        return instance;

      }

    };  // return

  }()).init();

return H; }(HANNIBAL));

