/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- A S S E T S -------------------------------------------------

  handles a group's economic resources like estate, units, techs, buildings.
  provides the semantics for the DSL used in plugins


  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Asset = function(context){

    H.extend(this, {

      context:  context,

      klass: "asset",

      imports:  [
        "map",
        // "health",
        "events",
        "query",
        "effector",
        "states",
        "groups",
        "metadata",
        "unitstates",
        "entities", // attackTypes, position, _templateName
      ],

      eventlist: [
        "OrderReady",
        "AIMetadata",
        "TrainingFinished",
        "ConstructionFinished",
        "EntityRenamed",
        "EntityAttacked",
        "Destroy",
      ],

      handler:   this.listener.bind(this),

      instance:  null,
      property:  null,
      resources: null,  //s
      users:     null,  //s

    });

  };

  H.LIB.Asset.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Asset,
    toString: function(){return H.format("[%s %s[%s]]", this.klass, this.name, this.resources.join("|"));},
    log: function(){
      this.deb(" ASSET: %s %s res: %s", this.instance.name, this.property, this.resources.length);
      this.resources.forEach( id => {
        this.deb("     A: %s, %s", this.id, this.entities[id]._templateName);
      });
    },
    initialize: function (config){

      H.extend(this, config);

      this.name = config.instance.name + ":" + config.property + "#" + this.id;

      // name         ??
      // id           ??
      // type         // entities, devices
      // instance     // the parent group 
      // property     // property name
      // resources    // array of ids
      // verb         // the action performed
      // hcq          // resource selector
      // shared       // or private
      // definition   // from group's assets
      // users        // list of ??? for shared asset users

      // deb("   AST: initialized: %s for %s with hcq: %s", this, this.instance, this.hcq || "unknown");

      return this;

    },
    serialize: function(){
      return {
        id:         this.id,
        users:      H.deepcopy(this.users),
        size:       this.size,
        property:   this.property,
        resources:  H.deepcopy(this.resources),
        definition: H.deepcopy(this.definition),
      };
    },
    // toSelection: function(resources){
    //   return (
    //     new H.LIB.Asset(this.context)
    //       .import()
    //       .initialize({
    //         id:        this.id, // same id !!!
    //         klass:     "asset.selection",
    //         instance:  this.instance, 
    //         property:  this.property, 
    //         resources: resources,
    //       })
    //   );
    // },
    activate: function(){
      this.eventlist.forEach(e => this.events.on(e, this.handler));
    },
    release:    function(){
      this.eventlist.forEach(e => this.events.off(e, this.handler));
      this.resources.forEach(id => {
        this.metadata[id].opname = "none";
        this.metadata[id].opid = undefined;
      });
      // users ????
      // deb("   ASS: releasing %s", uneval(this.resources));          
    },

    // events
    listener: function(msg){

      var 
        dslobject, tpln, ids, 
        id = msg.id, 
        dsl = this.groups.dsl;

      if (msg.name === "OrderReady"){

        if (msg.data.source === this.id){

          if (this.verb === "find"){

            ids = msg.data.resources;
            tpln = "resources";
            this.resources = msg.data.resources.slice(0);

          } else {

            ids = [id];
            tpln = this.entities[id]._templateName;
            this.resources.push(id);

            // take over ownership
            this.metadata[id].opid   = this.instance.id;
            this.metadata[id].opname = this.instance.name;

          }

          this.deb("   AST: OrderReady: %s ids: [%s], tpl: %s", this.verb, ids, tpln);

          dslobject = {
            name:        "item",
            resources:   ids, 
            isresource:  tpln.contains("resources"),
            foundation:  tpln.contains("foundation"),
            toString :   () => H.format("[dslobject item[%s]]", id)
          };

          this.groups.callWorld(this.instance, "assign", [dslobject]);

        } // else { deb("   AST: no match: %s -> %s | %s", msg.data.source, this.id, this.name);}


      } else if (H.contains(this.resources, id)){

        if (msg.name === "Destroy") {

          this.deb("   AST: listener Destroy: %s, %s", this.name, uneval(msg));

          // no need to tell group about succesful foundations
          if (!msg.data.foundation){
            dsl.select(this.instance);
            dsl.noun("asset", "entity", [id]);
            this.groups.signal("onDestroy", [dsl.world.asset]);

          }

          // remove after so match works in instance
          H.remove(this.resources, id);


        } else if (msg.name === "EntityAttacked") {

          dsl.select(this.instance);
          dsl.noun("asset", "entity", [id]);
          dsl.noun("attacker", "entity", [msg.id2]);
          this.groups.signal("onAttack", [dsl.world.asset, dsl.world.attacker, msg.data.type, msg.data.damage]);


        } else if (msg.name === "EntityRenamed") {

          H.remove(this.resources, id);
          this.resources.push(msg.id2);


        } else if (msg.name === "ConstructionFinished") {


          dslobject = {
            name:        "item",
            resources:   [id], 
            foundation:  false,
            toString :   () => H.format("[dslobject item[%s]]", id)
          };

          this.groups.callWorld(this.instance, "assign", [dslobject]);

        }

      }

    },
  });

return H; }(HANNIBAL));
