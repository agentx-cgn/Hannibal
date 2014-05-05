/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- P L U G I N S -----------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

H.Plugins = {

  "g.custodian" : {

    /*
      a group without units 

      Behaviour: 
        to maintain a shared structure
        to organize repair
        to rebuild on destroy, if any users
        
    */

    active:         true,           // prepared for init/launch ...
    description:    "test group",   // text field for humans 
    civilisations:  ["*"],          // 
    interval:       10,             // call onInterval every x ticks
    parent:         "",             // inherit useful features

    position:       null,           // refers to the coords of the group's position/activities
    structure:      [],             // still unkown resource, inits in Groups.appoint

    listener: {
      onLaunch: function(){},
      onConnect: function(listener){
        deb("     G: %s onConnect, callsign: %s", this, listener.callsign);
        this.structure.users.push(listener);
      },
      onDisConnect: function(listener){
        deb("     G: %s onDisConnect, callsign: %s", this, listener.callsign);
        H.remove(this.structure.users, listener);
      },
      onAssign: function(resource){

        deb("     G: %s onAssign %s", this, resource);

        if (this.structure.match(resource)){
          deb("     G: %s structure matches resource: %s", this, resource);
        } else {
          deb("     G: %s structure does NOT matches resource: %s", this, resource);
          logObject(this, "this.onAssign");
        }

        this.position = resource;
        // if (resource.isFoundation){
        //   this.broadcast(this.users, {type: "help-repair"});
        // }

        this.structure.users.forEach(function(listener){
          listener.onAssign(resource);
        });

      },
      onDestroy: function(resource){

        deb("     G: %s onDestroy: %s", this, resource);

        logObject(this.position, "this.position: " + this.position);

        if (this.structure.users.length > 0){
          this.structure.users.forEach(function(listener){
            listener.onDestroy(resource);
          });
          this.economy.request(1, this.structure, this.structure);
        } else {
          deb("     G: ignored destroyed resource: %s", resource.name);
        }

      },
      onAttack: function(resource, enemy, type, damage){

        deb("     G: %s onAttack %s by %s, damage: %s", this, resource, enemy, damage);
        
        this.structure.users.forEach(function(listener){
          listener.onAttack(resource, enemy, type, damage);
        });

      },
      onBroadcast: function(){},
      onInterval: function(){
        // currently not much to see here
        // deb("     G: interval %s, state: %s", this.name, H.prettify(this.structure.state()));
      }
    }

  },

  "g.grainpicker" : {

    /* Behaviour: 
        to maintain one field resource (food.grain), 
        to return gathered food to dropsite
        to shelter from violence (garrison)
        to help with nearby repair
    */

    // variables available in listener with this. All optional

    active:         true,           // prepared for init/launch ...
    description:    "test group",   // text field for humans 
    civilisations:  ["*"],          // 

    interval:       10,             // call onInterval every x ticks
    parent:         "",             // inherit useful features

    objectives:     "+food",        // give the economy a hint what this group provides.


    // this got initialized by launcher
    position:       null,           // coords of the group's position/activities

    // groups can claim space for buildings or activities
    space:          [1, {width: 30, depth: 30, near: "<dropsite>"}],


    // resources either trained or build or researched
    // make sure units can construct, repair and work on resources

    centre:         [1, "dynamic",   "civilcentre INGAME"],
    units:          [5, "exclusive", "food.grain GATHEREDBY WITH costs.metal = 0, costs.stone = 0, costs.wood = 0 SORT < costs.food"],
    field:          [1, "exclusive", "food.grain PROVIDEDBY"],
    dropsite:       [1, "shared",    "food ACCEPTEDBY"],
    refuges:        [1, "dynamic",   "<units> MEMBER DISTINCT HOLDBY INGAME WITH slots >= 5"],


    // message queue sniffer

    listener: {

      // game started, something launched this group
      onLaunch: function(){

        this.register("dropsite", "units", "field", "refuges"); // turn res definitions into res objects
        this.economy.request(1, this.dropsite);                 // assuming a CC exists
        this.refuges.sort("< distance");

      },

      // a request was succesful
      onAssign: function(resource){

        // logObject(resource, "onAssign: " + this.name);
        
        deb("     G: %s onAssign: %s, shared: %s", this, resource, resource.shared);
        
        if (this.dropsite.match(resource)){
          this.position = resource;
          this.economy.request(1, this.units);

        } else if (this.field.match(resource)){
          this.position = resource;
          if (resource.isFoundation){this.units.repair(resource);}
          if (resource.isStructure){this.units.gather(resource);}

        } else if (this.units.match(resource)){

          if (!this.field.isRequested){     // test for field
            this.economy.request(4, this.units);
            this.economy.request(1, this.field, this.dropsite);

          } else if (this.field.isFoundation){
            resource.repair(this.field);

          } else if (this.field.isStructure){
            resource.gather(this.field);

          }

        } else {
          deb("     G: %s unidentified resource: %s, shared: %s", this, resource, resource.shared);


        }

      },

      // resource lost
      onDestroy: function(resource){

        deb("     G: %s onDestroy: %s", this, resource);

        if (this.field.match(resource)){
          this.position = this.units;
          this.economy.request(1, this.field, this.dropsite);

        } else if (this.units.match(resource)){
          this.economy.request(1, this.units);

        } else if (this.dropsite.match(resource)){
          // dropsite is shared, custodian orders new one
          this.position = this.units;

        }

      },


      // there are enemies and gaia
      onAttack: function(resource, enemy, type, damage){

        deb("     G: %s onAttack %s by %s, damage: %s", this, resource, enemy, damage);

        if (this.field.match(resource)){
          this.units.repair(resource);

        } else if (this.units.match(resource)){
          deb("     G: %s health: %s", resource, this.units.health);
          if (this.units.health < 50 && this.refuges.first()) { 
            this.units.garrison(this.refuges);
          }
        }

      },

      // de-garrison
      onRelease: function(resource){

        deb("     G: %s onRelease: %s", this, resource);

        if (this.field.isFoundation){
          resource.repair(this.field);

        } else if (this.field.isStructure){
          resource.gather(this.field);

        } else {
          deb("WARN  : onRelease: no job for %s ", resource);

        }

      },


      // group radio
      onBroadcast: function(source, msg){

        deb("     G: %s onBroadcast from: %s, msg: %s", this, source, msg);
        
        if (msg.type === "help-repair" && this.distance(msg.resource) < 100){
          this.units.repair(msg.resource);
        }

      },

      // defined by this.interval
      onInterval: function(){

        deb("     G: %s onInterval,  state: %s", this, H.prettify(this.units.state()));
        deb("     G: %s onInterval, assets: %s", this, this.assets.map(function(a){return a + "";}));

        // update to nearest refuges
        this.refuges.sort("< distance");

      },
      // defined by this.interval
    }

  }


};

return H; }(HANNIBAL));

