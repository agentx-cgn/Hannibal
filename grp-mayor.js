/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- GROUP: M A Y O R --------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Plugins = H.Plugins || {};

  H.extend(H.Plugins, {

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

      technologies: [
                      "unlock.females.house"
      ],

      position:       null,           // refers to the coords of the group's position/activities
      structure:      [],             // still unkown asset, inits at game start

      builders:       ["dynamic", "civilcentre CONTAIN BUILDBY INGAME WITH metadata.cc = <cc>"],

      attackLevel:    0,              // increases with every attack, halfs on interval
      needsRepair:   80,              // a health level (per cent)
      needsDefense:  10,              // an attack level

      listener: {
        onLaunch: function(options /*cc*/){

          deb("     G: launch %s %s", this, uneval(options));

          this.options = options;
          this.cc = options.cc;
          this.register("builders");

        },
        onConnect: function(listener){
          // deb("     G: %s onConnect, callsign: %s", this, listener.callsign);
          this.structure.users.push(listener);
        },
        onDisConnect: function(listener){
          deb("     G: %s onDisConnect, callsign: %s", this, listener.callsign);
          H.remove(this.structure.users, listener);
        },
        onAssign: function(asset){

          deb("     G: %s onAssign ast: %s as '%s' res: %s", this, asset, asset.property, asset.resources[0]);

          this.position = asset;

          H.QRY("INGAME WITH metadata.cc = " + this.cc).forEach(function(node){
            node.metadata.cc = asset.resources[0];
          });

          this.cc = asset.resources[0];

          if (asset.isFoundation){
            this.builders.nearest(30).repair(asset);
          }

        },
        onDestroy: function(asset){

          deb("     G: %s onDestroy: %s", this, asset);

          this.economy.request(1, this.structure, this.position); // better location, pos is array

        },
        onAttack: function(asset, enemy, type, damage){

          deb("     G: %s onAttack %s", this, uneval(arguments));

          this.attackLevel += 1;

          if (this.attackLevel > this.needsDefense){
            this.structure.users.nearest(20).forEach(function(user){
              user.garrison(this.structure);
            });
          }

        },
        onBroadcast: function(){},
        onInterval: function(){

          // deb("     G: interval %s, attackLevel: %s, health: %s, states: %s", 
          //     this.name, this.attackLevel, this.structure.health, H.prettify(this.structure.states())
          // );

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

    }

  });

return H; }(HANNIBAL));

