/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- GROUP: M I N E R --------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Plugins = H.Plugins || {};

  H.extend(H.Plugins, {

    "g.builder" : {

      /*
        a group without units solely for the first/biggest CC

        Behaviour: 
          builds houses until pop max reached
          repairs houses if needed
          
      */

      active:         true,           // prepared for init/launch ...
      description:    "builder",     // text field for humans 
      civilisations:  ["*"],          // 
      interval:       4,              // call onInterval every x ticks
      parent:         "",             // inherit useful features

      capabilities:   "2 stone/sec",  // (athen) give the economy a hint what this group provides.

      position:       null,           // refers to the coords of the group's position/activities

      attackLevel:    0,              // increases with every attack, halfs on interval
      needsRepair:   80,              // a health level (per cent)
      needsDefense:  10,              // an attack level

      listener: {

        onLaunch: function(ccid, building, size, quantity){

          // deb("     G: onlaunch %s cc: %s, civ: %s", this, ccid, H.Bot.civ);

          this.buildings = ["exclusive", building];
          this.units = ["exclusive", building + " BUILDBY"];
          this.size = size; //H.Config.civs[H.Bot.civ].builders;
          this.quantity = quantity;

          this.register("units", "buildings");
          this.economy.request(1, this.units, this.position);   

        },
        onAssign: function(asset){

          // deb("     G: %s %s onAssign ast: %s as '%s' res: %s", this, this.buildings, asset, asset.property, asset.first);
         
          if (this.units.match(asset)){

            if (this.units.count === 1){
              this.economy.request(1, this.buildings, this.position);   
            }

            if (this.units.count < this.size){
              this.economy.request(1, this.units, this.position);   
            }

            if (this.foundation){
              // deb("---------> : %s", this.foundation.health);
              asset.repair(this.foundation);
            }

          } else if (this.buildings.match(asset)){

            this.position = asset;

            if (asset.isFoundation){
              this.foundation = asset;
              this.units.repair(asset);
            
            } else if (asset.isStructure){
              if (this.buildings.count < this.quantity){
                this.economy.request(1, this.buildings, this.position);

              } else {
                this.dissolve();
              }

            }

          }


        },
        onDestroy: function(asset){

          deb("     G: %s onDestroy: %s", this, asset);

          if (this.units.match(asset)){
            this.economy.request(1, this.units, this.position);

          } else if (this.buildings.match(asset)){
            this.economy.request(1, this.buildings, this.position);

          }

        },
        onAttack: function(asset, enemy, type, damage){

          deb("     G: %s onAttack %s by %s, damage: %s", this, asset, enemy, damage);

        },
        onBroadcast: function(){},
        onInterval:  function(){

          // deb("     G: %s onInterval, blds: [%s/%s], states: %s", this, this.buildings.count, this.maxBuildings, H.prettify(this.units.states()));

          // if (!this.units.count){return;}

          // if (this.units.doing("idle").count === this.units.count){
          //   if (this.buildings.count >= this.maxBuildings){
          //     this.dissolve();
          //     deb("      G: %s finished building ", this, this.buildings);
          //   }
          // }


        }

      } // listener

    }

  });

return H; }(HANNIBAL));

