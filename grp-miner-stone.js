/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- GROUP: M I N E R --------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Plugins = H.Plugins || {};

  H.extend(H.Plugins, {

    "g.miner-stone" : {

      /*
        a group without units solely for the first/biggest CC

        Behaviour: 
          to exploit resources like ruins, mines with stone
          to build a dropsite if needed
          
      */

      active:         true,           // prepared for init/launch ...
      description:    "miner",        // text field for humans 
      civilisations:  ["*"],          // 
      interval:       4,              // call onInterval every x ticks
      parent:         "",             // inherit useful features

      capabilities:   "2 stone/sec",   // (athen) give the economy a hint what this group provides.

      position:       null,           // refers to the coords of the group's position/activities
      structure:      [],             // still unkown resource, inits at game start

      units:          ["exclusive", "stone.rock GATHEREDBY SORT > rates.stone.rock"],
      dropsite:       ["shared",    "stone ACCEPTEDBY"],
      dropsites:      ["dynamic",   "stone ACCEPTEDBY INGAME"],

      targets:        [{generic: 'stone', specific: 'rock'}, {generic: 'stone', specific: 'ruins'}],

      mine:           null,

      attackLevel:    0,              // increases with every attack, halfs on interval
      needsRepair:   80,              // a health level (per cent)
      needsDefense:  10,              // an attack level

      listener: {

        onLaunch: function(ccid, mine){

          mine = mine || H.Scout.nearestResource(this.position, this.targets);

          deb("     G: onlaunch %s mine: %s", this, mine);

          if (mine){
            this.mine = mine;
            this.position = mine.position;
            this.register("units", "dropsite", "dropsites");
            this.economy.request(1, this.units, this.position);   
          }

        },
        onAssign: function(resource){

          deb("     G: %s onAssign res: %s as '%s' shared: %s", this, resource, resource.nameDef, resource.shared);
         
          if (this.units.match(resource)){

            deb("     G: onAssign position: %s", H.prettify(this.position));

            // logObject(this.position, "g.miner-stone:this.position");

            if (this.units.count === 1){
              if (this.dropsites.nearest(1).distanceTo(this.position) > 100){
                this.economy.request(1, this.dropsite, this.position); 
              }  
              this.economy.request(4, this.units, this.position);   
            }

            resource.gather(this.mine);

          } else if (this.dropsite.match(resource)){

            if (resource.isFoundation){this.units.repair(resource);}
            if (resource.isStructure){this.units.gather(this.mine);}

          }

        },
        onDestroy: function(resource){

          deb("     G: %s onDestroy: %s", this, resource);

          if (this.units.match(resource)){
            this.economy.request(1, this.units, this.position);

          } else if (this.dropsite.match(resource)){
            this.economy.request(1, this.dropsite, this.position);

          }

        },
        onAttack: function(resource, enemy, type, damage){

          deb("     G: %s onAttack %s by %s, damage: %s", this, resource, enemy, damage);

        },
        onBroadcast: function(){},
        onInterval:  function(){

          deb("     G: %s onInterval,  states: %s", this, H.prettify(this.units.states()));

          if (this.units.count){
            
            if (this.units.doing("idle").count === this.units.count){

              H.Scout.updateResources();
              this.mine = H.Scout.nearestResource(this.units.center, this.targets);
              
              if (this.mine){
                this.units.gather(this.mine);

              } else {
                this.units.release();
                this.dissolve();
                deb("      G: %s finished mining", this);
                return;

              }
            } else {
              this.units.doing("idle").gather(this.mine);

            }

          }

        }

      } // listener

    }

  });

return H; }(HANNIBAL));

