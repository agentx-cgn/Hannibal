/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- GROUP: M I N E R --------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Groups = H.Groups || {};

  H.extend(H.Groups, {

    "g.supplier" : {

      /*
        a group without units solely for the first/biggest CC

        Behaviour: 
          to exploit resources like ruins, mines with stone
          to build a dropsite if needed
          
      */

      active:         true,           // prepared for init/launch ...
      description:    "supplier",     // text field for humans 
      civilisations:  ["*"],          // 
      interval:       4,              // call onInterval every x ticks
      parent:         "",             // inherit useful features

      defaults:       {
        size:         2,
      },

      technologies: [                 // these techs help
                      "gather.lumbering.ironaxes",
                      "gather.capacity.wheelbarrow",
                      "gather.wicker.baskets", // ?? only fruits
                      "gather.mining.wedgemallet",
                      "gather.mining.silvermining",    
                      "gather.mining.shaftmining",
      ],

      position:       null,           // refers to the coords of the group's position/activities

      units:          null,           // assets defined in onLaunch
      dropsite:       null,
      dropsites:      null,

      attackLevel:    0,              // increases with every attack, halfs on interval
      needsRepair:   80,              // a health level (per cent)
      needsDefense:  10,              // an attack level

      exclusives:    function(options){
        return {units : [options.size, (
          options.supply === "metal"      ? ["exclusive", "metal.ore  GATHEREDBY SORT > rates.metal.ore"]  :
          options.supply === "stone"      ? ["exclusive", "stone.rock GATHEREDBY SORT > rates.stone.rock"] :
          options.supply === "wood"       ? ["exclusive", "wood.tree  GATHEREDBY SORT > rates.wood.tree"]  :
          options.supply === "food.fruit" ? ["exclusive", "food.fruit GATHEREDBY SORT > rates.food.fruit"] :
          options.supply === "food.meat"  ? ["exclusive", "food.meat  GATHEREDBY SORT > rates.food.meat"]  :
            deb(" ERROR: exclusives: unknown supply '%s' for g.supplier", options.supply)
        )]};
      },

      listener: {

        onLaunch: function(options /*cc, supply, size*/){

          deb("     G: onlaunch %s", uneval(arguments));

          // this.options   = options;
          this.size   = options.size || this.defaults.size;
          this.supply = options.supply;
          this.target = this.resources.nearest(this.position, this.supply);

          if (!this.target){
            deb("     G: onLaunch dissolving %s no target for %s", this, this.supply);
            this.dissolve(); 
            return;
          
          } else {
            this.position  = this.target.position;
            deb("     G: onLaunch %s have target for %s: %s", this, this.supply, this.target);

          }

          this.units = this.exclusives(options).units[1];

          this.dropsite = (
            this.supply === "metal"      ?  ["shared",    "metal ACCEPTEDBY"] :
            this.supply === "stone"      ?  ["shared",    "stone ACCEPTEDBY"] :
            this.supply === "wood"       ?  ["shared",    "wood ACCEPTEDBY"]  :
            this.supply === "food.fruit" ?  ["shared",    "food ACCEPTEDBY"]  :
            this.supply === "food.meat"  ?  ["shared",    "food ACCEPTEDBY"]  :
              deb(" ERROR: unknown supply '%s' for supply group", this.supply)
          );

          this.dropsites = (
            this.supply === "metal"      ?  ["dynamic",    "metal ACCEPTEDBY INGAME"] :
            this.supply === "stone"      ?  ["dynamic",    "stone ACCEPTEDBY INGAME"] :
            this.supply === "wood"       ?  ["dynamic",    "wood  ACCEPTEDBY INGAME"] :
            this.supply === "food.fruit" ?  ["dynamic",    "food  ACCEPTEDBY INGAME"] :
            this.supply === "food.meat"  ?  ["dynamic",    "food  ACCEPTEDBY INGAME"] :
              deb(" ERROR: unknown supply '%s' for supply group", this.supply)
          );

          this.register("units", "dropsite", "dropsites");
          this.request(1, this.units, this.position);   

        },
        onAssign: function(asset){

          deb("     G: onAssign %s got %s, have pos: %s", this, asset, this.position);
         
          if (this.units.match(asset)){

            if (this.units.count === 1){
              if (this.dropsites.nearest(1).distanceTo(this.position) > 100){
                this.request(1, this.dropsite, this.position); 
              }  
            }

            deb("     G: onAssign %s units: %s/%s", this, this.units.count, this.size);
            if (this.units.count < this.size){
              this.request(1, this.units, this.position);   
            }

            if (this.target){
              asset.gather(this.target);
            } else {
              deb("  WARN: %s with res: %s has no target", this, this.supply);
            }

          } else if (this.dropsite.match(asset)){

            if (asset.isFoundation){this.units.repair(asset);}
            if (asset.isStructure){this.units.gather(this.target);}

          } else {
            deb("     G: onAssign %s no match", this);

          }

        },
        onDestroy: function(asset){

          deb("     G: %s onDestroy: %s", this, asset);

          if (this.units.match(asset)){
            this.request(1, this.units, this.position);

          } else if (this.dropsite.match(asset)){
            // this.request(1, this.dropsite, this.position);

          }

        },
        onAttack: function(asset, enemy, type, damage){

          deb("     G: %s onAttack %s by %s, damage: %s", this, asset, enemy, damage);

        },
        onBroadcast: function(){},
        onInterval:  function(){

          // deb("     G: %s onInterval, res: %s, states: %s", this, this.supply, H.prettify(this.units.states()));

          if (!this.units.count){return;}

          if (this.units.doing("idle").count === this.size){
            this.dissolve();
            deb("      G: onInterval %s finished supplying %s, all (%s) idle", this, this.size, this.supply);
          
          } else if (this.units.doing("idle").count > 0){

            // this.resources.update(this.supply);
            this.target = this.resources.nearest(this.position, this.supply);
            
            if (this.target){
              this.units.doing("idle").gather(this.target);
            } else {
              deb("  WARN: %s with res: %s has no target", this, this.supply);
            }              
            
            
          }


        }

      } // listener

    }

  });

return H; }(HANNIBAL));

