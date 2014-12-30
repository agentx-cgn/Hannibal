/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- GROUP: M A Y O R --------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.extend(H.Groups, {

    "g.mayor" : {

      /*
        a group without units solely for the first/biggest CC

        Behaviour: 
          to repair after attack
          to rebuild on destroy
          to garrisson soldiers on attack
          
      */

      // meta
      active:         true,           // prepared for init/launch ...
      description:    "mayor",        // text field for humans 
      civilisations:  ["*"],          // * = all, athen, cart, etc
      interval:       4,              // call scripts.tick every x ticks ( tick ~ 1.6 sec)

      // these techs are known to possibly improve this group
      technologies: [                 
        "unlock.females.house"
      ],

      scripts: {

        launch: function(w, config){

          w.log("     G: onLaunch: %s, %s", w, uneval(config));

          w.units = ["dynamic", "civilcentre CONTAIN BUILDBY INGAME WITH metadata.cc = <cc>"];
          w.nounify("units");

        },
        connect: function(w, listener){
          // deb("     G: %s onConnect, callsign: %s", this, listener.callsign);
          this.centre.users.push(listener);
        },
        disconnect: function(w, listener){
          deb("     G: %s onDisConnect, callsign: %s", this, listener.callsign);
          H.remove(this.centre.users, listener);
        },
        assign: function(w, asset){

          deb("     G: %s onAssign ast: %s as '%s' res: %s", this, asset, asset.property, asset.resources[0]);

          this.position = asset;

          H.QRY("INGAME WITH metadata.cc = " + this.cc).forEach(function(node){
            node.metadata.cc = asset.resources[0];
          });

          this.cc = asset.resources[0];

          if (asset.isFoundation){
            this.units.nearest(30).repair(asset);
          }

        },
        destroy: function(w, asset){

          deb("     G: %s onDestroy: %s", this, asset);

          this.economy.request(1, this.centre, this.position); // better location, pos is array

        },
        attack: function(w, asset, attacker, damage){

          deb("     G: %s onAttack %s", this, uneval(arguments));

          this.attackLevel += 1;

          if (this.attackLevel > this.needsDefense){
            this.centre.users.nearest(20).forEach(function(user){
              user.garrison(this.centre);
            });
          }

        },
        radio: function(w, sender, msg){},
        tick:  function(w){

          // deb("     G: interval %s, attackLevel: %s, health: %s, states: %s", 
          //     this.name, this.attackLevel, this.centre.health, H.prettify(this.centre.states())
          // );

          this.attackLevel = ~~(this.attackLevel/2);

          if (this.centre.isFoundation){
            this.units.nearest(30).repair(this.centre);
          }        

          // if (this.attackLevel === 0 && this.centre.health < this.needsRepair){
          //   this.centre.users.nearest(30).forEach(function(user){
          //     user.repair(this.centre);
          //   });
          // }

        }
      }

    }

  });

return H; }(HANNIBAL));

