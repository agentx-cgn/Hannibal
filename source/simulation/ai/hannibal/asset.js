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
        // "unitstates",
        "entities", // attackTypes, position, _templateName
      ],

      eventlist: [
        "OrderReady",
        "AIMetadata",
        "TrainingFinished",
        "ConstructionFinished",
        "EntityRenamed",
        "EntityAttacked",
        "UnitDestroyed",
        "StructureDestroyed",
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
    activate: function(){
      this.eventlist.forEach(e => this.events.on(e, this.handler));
    },
    releaseEntity:function(id){
      H.delete(this.resources, ident => ident === id);
      this.metadata[id].opname = "none";
      this.metadata[id].opid = undefined;
    },
    release:    function(){
      // frees all resources of this asset
      this.deb("   AST: releasing %s => [%s]", this, uneval(this.resources));          
      this.eventlist.forEach(e => this.events.off(e, this.handler));
      this.resources.slice().forEach(id => {
        if (H.isInteger(id)){
          this.releaseEntity(id);
        } else {
          // no need to release virtual assets
        }
      });
      this.resources = null;
      // users ????
    },

    // events
    listener: function(msg){

      var 
        dslItem, dslAttacker, dslVictim,
        tpln, ids, id = msg.id;

      if (msg.name === "OrderReady"){

        if (msg.data.source === this.id){

          // check for virtual asset: path, a list of coords
          if (this.verb === "path"){

            ids = msg.data.resources;
            tpln = "path";
            this.resources = msg.data.resources.slice();


          // check for virtual asset: find, a list of resource ids
          } else if (this.verb === "find"){

            ids = msg.data.resources;
            tpln = "resources";
            this.resources = msg.data.resources.slice();

          } else {

            // verbs = train, build

            ids = [id];
            tpln = this.entities[id]._templateName;
            this.resources.push(id);

            // take over ownership
            this.metadata[id].opid   = this.instance.id;
            this.metadata[id].opname = this.instance.groupname;

          }

          // this.deb("   AST: OrderReady: %s ids: [%s], tpl: %s", this.verb, ids, tpln);

          dslItem = {
            name:        "item",
            resources:   ids, 
            ispath:      tpln.contains("path"),      // mark for world.member
            isresource:  tpln.contains("resources"), // mark for world.member
            foundation:  tpln.contains("foundation"),
            toString :   () => H.format("[dslobject item[%s]]", id)
          };

          this.groups.callWorld(this.instance, "assign", [dslItem]);

        } // else { deb("   AST: no match: %s -> %s | %s", msg.data.source, this.id, this.name);}


      } else if (H.contains(this.resources, id)){

        if (msg.name === "UnitDestroyed" || msg.name === "StructureDestroyed") {

          this.deb("   AST: listener Destroy: %s, %s", this.name, uneval(msg));

          dslItem = {
            name:        "item",
            resources:   [id], 
            toString :   () => H.format("[dslobject item[%s]]", id)
          };

          this.groups.callWorld(this.instance, "destroy", [dslItem]);

          // remove after so match works in instance
          H.remove(this.resources, id);


        } else if (msg.name === "EntityAttacked") {

          dslAttacker = {
            name:        "attacker",
            resources:   [id], 
            toString :   () => H.format("[dslobject attacker[%s]]", id)
          };

          dslVictim = {
            name:        "victim",
            resources:   [msg.id2], 
            toString :   () => H.format("[dslobject victim[%s]]", msg.id2)
          };

          this.groups.callWorld(this.instance, "attack", [dslAttacker, dslVictim, msg.data.damage, msg.data.type]);


        } else if (msg.name === "EntityRenamed") {

          H.substitute(this.resources, msg.id, msg.id2);


        } else if (msg.name === "ConstructionFinished") {

          dslItem = {
            name:        "item",
            resources:   [id], 
            foundation:  false,
            toString :   () => H.format("[dslobject item[%s]]", id)
          };

          this.groups.callWorld(this.instance, "assign", [dslItem]);

        }

      }

    },
  });

return H; }(HANNIBAL));
