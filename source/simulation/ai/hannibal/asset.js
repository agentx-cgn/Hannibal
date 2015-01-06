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
        dslobject, 
        id = msg.id, 
        tpln = this.entities[id]._templateName,
        dsl = this.groups.dsl;

      if (msg.name === "OrderReady"){

        if (msg.data.source === this.id){

          // this.deb("   AST: OrderReady: %s %s", this.id, this);
          // this.deb("   AST: OrderReady: %s %s, res: %s, %s", this, msg.name, this.resources, uneval(msg));
          this.deb("   AST: OrderReady: id: %s, tpl: %s", id, tpln);

          // take over ownership
          this.metadata[id].opid   = this.instance.id;
          this.metadata[id].opname = this.instance.name;

          this.resources.push(id);

          dslobject = {
            name:        "item",
            resources:   [id], 
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


    // asset properties
    // get health () {return this.health(this.resources);},
    // get count  () {return this.resources.length;},
    // get first  () {return this.toSelection(this.resources.slice(0, 1));},
    // get firstid() {return this.resources[0];},
    // get center () {return this.map.getCenter(this.resources);},
    // get spread () {return this.map.getSpread(this.resources);},
    // get uaistates (){
    //   var state = {};
    //   this.resources.forEach(id => state[id] = this.unitstates[id]);
    //   return state;
    // },      

    // asset effector actions
    // destroy:  function(   ){this.effector.destroy(this.resources);},
    // move:     function(pos){this.effector.move(this.resources, pos);},
    // format:   function(fmt){this.effector.format(this.resources, fmt);},
    // stance:   function(stc){this.effector.stance(this.resources, stc);},
    // flee:     function(atk){this.effector.flee(this.resources, [atk.id]);},
    // garrison: function(ast){this.effector.garrison(this.resources, ast.resources[0]);},
    // gather:   function(ast){this.effector.gather(this.resources, ast.resources[0]);},
    // collect:  function(tgs){this.effector.collect(this.resources, tgs.map(t => t.resources[0]));},
    // repair:   function(ast){
    //   if (!ast.resources.length){H.throw("asset.repair: no resources");}
    //   this.effector.repair(this.resources, ast.firstid);
    // },

    // asset helper
    // match: function (asset){
    //   if(!this.resources){
    //     H.throw("ERROR : asset.match: this no resources " + this.name);
    //     return false;
    //   } else if (!asset.resources){
    //     H.throw("ERROR : asset.match: asset no resources " + asset);
    //     return false;
    //   }
    //   // deb("   AST: match %s in %s", uneval(asset.resources[0]), uneval(this.resources));
    //   return H.contains(this.resources, asset.resources[0]);
    // },
    // forEach: function(fn){

    //   // this.units.doing("idle").forEach(function(unit){
    //   //   this.units.stance("aggressive");
    //   //   unit.move(this.target.point);
    //   // });

    //   this.resources.forEach(id => {
    //     fn.call(this.instance, this.toSelection([id]));
    //   });

    // },

    // // asset info
    // distanceTo: function(pos){this.map.distanceTo(this.resources, pos);},
    // doing: function(/* [who,] filters */){ 

    //   // filters resources on unit ai state

    //   var 
    //     ids = [], 
    //     al      = arguments.length,
    //     who     = (al === 1) ? this.resources : arguments[0],
    //     filters = (al === 1) ? arguments[0] : arguments[1],
    //     actions = filters.split(" ").filter(a => !!a);

    //   actions.forEach(action => {
    //     who.forEach(id => {
    //       var state = this.unitstates[id];
    //       if (action[0] === "!"){
    //         if (state !== action.slice(1)){ids.push(id);}
    //       } else {
    //         if (state === action){ids.push(id);}
    //       }
    //     });
    //   });

    //   // deb("doing: actions: %s, states: %s, ids: %s", 
    //   //   actions, H.prettify(self.states(resources)), ids
    //   // );

    //   return this.toSelection(ids);

    // },
    // exists: function(amount){
    //   // for dynamic assets
    //   var hcq = this.groups.expandHCQ(this.definition[1], this.instance);
    //   return this.query(hcq).execute().length >= (amount || 1);
    // },
    // nearest: function(param){

    //   var hcq, pos, sorter, nodes, ids;

    //   // look for nearest from hcq
    //   if (H.isInteger(param)){

    //     hcq = this.groups.expandHCQ(this.definition[1], this.instance);

    //     // deb("   AST: nearest param: %s, hcq: %s", param, hcq);

    //     pos = ( Array.isArray(this.instance.position) ? 
    //         this.instance.position : 
    //         this.instance.position.location()
    //     );
    //     // deb("   AST: nearest pos: %s", pos);
    //     sorter = (na, nb) => {
    //       return (
    //         this.map.distance(na.position, pos) - 
    //         this.map.distance(nb.position, pos)
    //       );
    //     };
    //     nodes = this.query(hcq).execute().sort(sorter); // "node", 5, 5, "nearest"
    //     ids = nodes.map(node => node.id).slice(0, param || 1);

    //   // look for closest to point
    //   } else if (Array.isArray(param)){
    //     ids = [this.map.nearest(param, this.resources)];

    //   } else {
    //     H.throw("WARN  : Asset.nearest: got strange param: %s", param);
    //     // deb("WARN  : Asset.nearest: got strange param: %s", param);

    //   }

    //   // deb("   AST: nearest %s ids: %s, param: %s", this.name, ids, param);

    //   return this.toSelection(ids);
      
    // },
    // location:   function(id){

    //   // this should get a position for just everything

    //   var loc = [];

    //   if (id) {
    //     loc = this.map.getCenter([id]);
    //     // deb("   AST: location id: %s of %s, loc: %s", id, this, loc);

    //   } else if (this.position){
    //     loc = this.position.location();
    //     // deb("   AST: location this.position: %s of %s, loc: %s", this.position, this, loc);

    //   } else if (this.users.length) { // priotize shared, 
    //     // loc = this.map.centerOf(this.users.map(function(listener){
    //     //   var group = H.Objects(listener.callsign.split("#")[1]);
    //     //   if (group.position){
    //     //     return group.position.location();
    //     //   } else {
    //     //     return [];
    //     //   }
    //     // }));
    //     // deb("   AST: location users: %s of %s, loc: %s", H.prettify(this.users), this, loc);

    //   } else if (this.resources.length){
    //     // only undestroyed entities, with valid position
    //     // loc = H.Map.getCenter(this.resources.filter(id => !!H.Entities[id] && !!H.Entities[id].position() ));
    //     loc = this.map.getCenter(this.resources);
    //     // deb("   AST: location resources: %s of %s, loc: %s", H.prettify(this.resources), this, loc);

    //   } else {
    //     this.deb("  WARN: AST found no location for %s, res: %s", this, uneval(this.resources));

    //   }

    //   return loc;

    // },  