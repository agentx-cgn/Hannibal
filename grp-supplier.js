/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- GROUP: M I N E R --------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Plugins = H.Plugins || {};

  H.extend(H.Plugins, {

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

      // food 5330 7050 8.6
      // wood 1760 2800 5.2
      // stone 3440 5020 7.9
      // metal 3400 4360 4.8


      capabilities:   "2 stone/sec",  // (athen) give the economy a hint what this group provides.

      position:       null,           // refers to the coords of the group's position/activities

      units:          null,
      dropsite:       null,
      dropsites:      null,

      attackLevel:    0,              // increases with every attack, halfs on interval
      needsRepair:   80,              // a health level (per cent)
      needsDefense:  10,              // an attack level

      listener: {

        onLaunch: function(ccid, resource, size){

          deb("     G: onlaunch %s", uneval(arguments));

          this.size      = size;
          this.resource  = resource;
          this.target    = H.Resources.nearest(this.position, resource);

          if (!this.target){
            deb("   GRP: dissolving %s/", this.name, resource);
            this.dissolve(); 
            return;
          }

          this.position  = this.target.position;

          this.units = (
            resource === "metal"      ? ["exclusive", "metal.ore  GATHEREDBY SORT > rates.metal.ore"]  :
            resource === "stone"      ? ["exclusive", "stone.rock GATHEREDBY SORT > rates.stone.rock"] :
            resource === "wood"       ? ["exclusive", "wood.tree  GATHEREDBY SORT > rates.stone.rock"] :
            resource === "food.fruit" ? ["exclusive", "food.fruit GATHEREDBY SORT > rates.food.fruit"] :
            resource === "food.meat"  ? ["exclusive", "food.meat  GATHEREDBY SORT > rates.food.meat"]  :
              deb(" ERROR: unknown resource '%s' for supply group", resource)
          );

          this.dropsite = (
            resource === "metal"      ?  ["shared",    "metal ACCEPTEDBY"] :
            resource === "stone"      ?  ["shared",    "stone ACCEPTEDBY"] :
            resource === "wood"       ?  ["shared",    "wood ACCEPTEDBY"]  :
            resource === "food.fruit" ?  ["shared",    "food ACCEPTEDBY"]  :
            resource === "food.meat"  ?  ["shared",    "food ACCEPTEDBY"]  :
              deb(" ERROR: unknown resource '%s' for supply group", resource)
          );

          this.dropsites = (
            resource === "metal"      ?  ["dynamic",    "metal ACCEPTEDBY INGAME"] :
            resource === "stone"      ?  ["dynamic",    "stone ACCEPTEDBY INGAME"] :
            resource === "wood"       ?  ["dynamic",    "wood  ACCEPTEDBY INGAME"] :
            resource === "food.fruit" ?  ["dynamic",    "food  ACCEPTEDBY INGAME"] :
            resource === "food.meat"  ?  ["dynamic",    "food  ACCEPTEDBY INGAME"] :
              deb(" ERROR: unknown resource '%s' for supply group", resource)
          );

          this.register("units", "dropsite", "dropsites");
          this.economy.request(1, this.units, this.position);   

        },
        onAssign: function(asset){

          deb("     G: %s %s onAssign ast: %s as '%s' res: %s", this, this.resource, asset, asset.property, asset.first);
         
          if (this.units.match(asset)){

            deb("     G: %s onAssign position: %s", this, H.prettify(this.position));

            if (this.units.count === 1){
              if (this.dropsites.nearest(1).distanceTo(this.position) > 100){
                this.economy.request(1, this.dropsite, this.position); 
              }  
            }

            if (this.units.count < this.size){
              this.economy.request(1, this.units, this.position);   
            }

            if (this.target){
              asset.gather(this.target);
            } else {
              deb("  WARN: %s with res: %s has no target", this, this.resource);
            }

          } else if (this.dropsite.match(asset)){

            if (asset.isFoundation){this.units.repair(asset);}
            if (asset.isStructure){this.units.gather(this.target);}

          }

        },
        onDestroy: function(asset){

          deb("     G: %s onDestroy: %s", this, asset);

          if (this.units.match(asset)){
            this.economy.request(1, this.units, this.position);

          } else if (this.dropsite.match(asset)){
            // this.economy.request(1, this.dropsite, this.position);

          }

        },
        onAttack: function(asset, enemy, type, damage){

          deb("     G: %s onAttack %s by %s, damage: %s", this, asset, enemy, damage);

        },
        onBroadcast: function(){},
        onInterval:  function(){

          deb("     G: %s onInterval, res: %s, states: %s", this, this.resource, H.prettify(this.units.states()));

          if (!this.units.count){return;}

          if (this.units.doing("idle").count === this.units.count){
            this.dissolve();
            deb("      G: %s finished supplying ", this, this.resource);
            return;
          
          } else if (this.units.doing("idle").count > 0){

            H.Resources.update(this.resource);
            this.target = H.Resources.nearest(this.position, this.resource);
            
            if (this.target){
              this.units.doing("idle").gather(this.target);
            } else {
              deb("  WARN: %s with res: %s has no target", this, this.resource);
            }              
            
            
          }


        }

      } // listener

    }

  });

return H; }(HANNIBAL));
