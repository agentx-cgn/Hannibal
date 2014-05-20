/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- P L U G I N S -----------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

H.Plugins = {


  "g.mayor" : {

    /*
      a group without units solely for the first/biggest CC

      Behaviour: 
        to repair after attack
        to rebuild on destroy
        to garrisson soldiers on attack
        
    */

    active:         true,           // prepared for init/launch ...
    description:    "mayor",        // text field for humans 
    civilisations:  ["*"],          // 
    interval:       4,              // call onInterval every x ticks
    parent:         "",             // inherit useful features

    position:       null,           // refers to the coords of the group's position/activities
    structure:      [],             // still unkown resource, inits at game start

    builders:       ["dynamic", "civilcentre CONTAIN BUILDBY INGAME WITH metadata.ccid = <ccid>"],

    attackLevel:    0,              // increases with every attack, halfs on interval
    needsRepair:   80,              // a health level (per cent)
    needsDefense:  10,              // an attack level

    listener: {
      onLaunch: function(ccid){
        this.ccid = ccid;
        this.register("builders");
      },
      onConnect: function(listener){
        deb("     G: %s onConnect, callsign: %s", this, listener.callsign);
        this.structure.users.push(listener);
      },
      onDisConnect: function(listener){
        deb("     G: %s onDisConnect, callsign: %s", this, listener.callsign);
        H.remove(this.structure.users, listener);
      },
      onAssign: function(resource){

        deb("     G: %s onAssign res: %s as '%s' shared: %s", this, resource, resource.nameDef, resource.shared);

        this.position = resource;

        H.QRY("INGAME WITH metadata.ccid = " + this.ccid).forEach(function(node){
          node.metadata.ccid = resource.id;
        });

        this.ccid = resource.id;

        if (resource.isFoundation){
          this.builders.nearest(30).repair(resource);
        }

      },
      onDestroy: function(resource){

        deb("     G: %s onDestroy: %s", this, resource);

        this.economy.request(1, this.structure, this.position); // better location, pos is array

      },
      onAttack: function(resource, enemy, type, damage){

        deb("     G: %s onAttack %s by %s, damage: %s", this, resource, enemy, damage);

        this.attackLevel += 1;

        if (this.attackLevel > this.needsDefense){
          this.structure.users.nearest(20).forEach(function(user){
            user.garrison(this.structure);
          });
        }

      },
      onBroadcast: function(){},
      onInterval: function(){

        deb("     G: interval %s, attackLevel: %s, health: %s, states: %s", 
            this.name, this.attackLevel, this.structure.health, H.prettify(this.structure.states())
        );

        this.attackLevel = ~~(this.attackLevel/2);

        if (this.structure.isFoundation){
          this.builders.nearest(30).repair(this.structure);
        }        

        // if (this.attackLevel === 0 && this.structure.health < this.needsRepair){
        //   this.structure.users.nearest(30).forEach(function(user){
        //     user.repair(this.structure);
        //   });
        // }

      }
    }

  },

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

        deb("     G: %s onAssign res: %s as '%s' shared: %s", this, resource, resource.nameDef, resource.shared);

        if (this.structure.match(resource)){
          deb("     G: %s structure matches resource: %s", this, resource);
        } else {
          deb("     G: %s structure does NOT matches resource: %s", this, resource);
          logObject(this, "this.onAssign");
        }

        this.position = resource;

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
        // deb("     G: interval %s, states: %s", this.name, H.prettify(this.structure.states()));
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

    // variables available in listener with *this*. All optional

    active:         true,           // ready to init/launch ...
    description:    "test group",   // text field for humans 
    civilisations:  ["*"],          // lists all supported cics

    interval:       10,             // call onInterval every x ticks
    parent:         "",             // inherit useful features

    capabilities:   "2 food/sec",   // (athen) give the economy a hint what this group provides.


    // this got initialized by launcher
    position:       null,           // coords of the group's position/activities

    // ASSETS
    // either trained or build or researched or claimed
    // make sure units can construct, repair and work on assets
    // dynamic: merely an updateable list (e.g. the current centre, shelter)
    // shared: needed, but shared with other groups (e.g. dropsites, temples)
    // exclusive: fully managed by this group (e.g. fields, units)

    units:          ["exclusive", "food.grain GATHEREDBY WITH costs.metal = 0, costs.stone = 0, costs.wood = 0 SORT < costs.food"],
    field:          ["exclusive", "food.grain PROVIDEDBY"],
    dropsite:       ["shared",    "food ACCEPTEDBY"],
    shelter:        ["dynamic",   "<units> MEMBER DISTINCT HOLDBY INGAME WITH slots >= 1"],

    // groups can claim space for structures or activities
    space:          [1, {width: 30, depth: 30, near: "<dropsite>"}],


    // message queue sniffer

    listener: {

      // game started, something launched this group
      onLaunch: function(){

        this.register("dropsite", "units", "field", "shelter"); // turn res definitions into res objects
        this.economy.request(1, this.dropsite, this.position);                 // assuming a CC exists

      },

      // a request was succesful
      onAssign: function(resource){

        // logObject(resource, "onAssign: " + this.name);

        deb("     G: %s onAssign res: %s as '%s' shared: %s", this, resource, resource.nameDef, resource.shared);
        
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
            // may silently fail, because field is destroyed
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
          
          // postpone one tick, because field was just destroyed this tick (terrain conflict)
          this.postpone(1, this.economy.request, 1, this.field, this.position);
          // this.economy.request(1, this.field, this.position);  // changed from dropsite

        } else if (this.units.match(resource)){
          this.economy.request(1, this.units, this.position);

        } else if (this.dropsite.match(resource)){
          // dropsite is shared, custodian orders new one
          this.position = this.units;

        }

      },


      // there are enemies and gaia
      onAttack: function(resource, enemy, type, damage){

        deb("     G: %s onAttack %s by %s, damage: %s", this, resource, enemy, damage);

        if (this.field.match(resource)){
          this.units.doing("!repairing").repair(resource);

        } else if (this.units.match(resource)){
          if (resource.health < 80 && this.shelter.exists()) { 
            this.shelter.nearest(1).garrison(resource);
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
        
        if (msg.type === "must-repair"){
          this.units.repair(msg.resource);

        } else if (msg.type === "help-repair" && this.distance(msg.resource) < 100){
          this.units.repair(msg.resource);

        }

      },

      // defined by this.interval
      onInterval: function(){

        if (this.field.isFoundation){
          this.units.doing("!repairing").repair(this.field);

        } else if (this.field.health < 80){
          this.units.doing("!repairing").repair(this.field);

        } else {
          this.units.doing("gathering").gather(this.field);

        }

        deb("     G: %s onInterval,  states: %s", this, H.prettify(this.units.states()));
        // deb("     G: %s onInterval, assets: %s", this, this.assets.map(function(a){return a + "";}));

      },
      // defined by this.interval
    }

  }


};

return H; }(HANNIBAL));

