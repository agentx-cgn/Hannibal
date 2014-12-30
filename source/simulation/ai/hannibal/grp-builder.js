/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- GROUP: M I N E R --------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.extend(H.Groups, {

    "g.builder" : {

      /*
        a group without units solely for the first/biggest CC

        Behaviour: 
          builds structures until quantity or
          builds houses until 
          try garrison on attack (female, male)
          try healing on hurt
          dissolve on nothing to do
          
      */

      active:         true,           // prepared for init/launch ...
      description:    "builder",      // text field for humans 
      civilisations:  ["*"],          // 
      interval:       4,              // call onInterval every x ticks

      scripts: {

        launch: function(w, config /* building, quantity */){

          w.log("     G: launch %s %s", w, uneval(config));

          w.buildings = ["exclusive", config.building];
          w.units     = ["exclusive", config.building + " CONTAIN BUILDBY"];

          w.units.size     = w.units.size     || config.size     || 4;
          w.buildings.size = w.buildings.size || config.quantity || 1;

          w.nounify("units", "buildings");

          // H.logObject(w, "wwwwwwwwwwwwwww");
          // H.logObject(w.units, "wwwwwwwwwwwwwww.units");

          w.units.request();   

        },
        assign: function(w, item){

          w.log("     G: onAssign: %s, %s", w, item);

          w.item = w.objectify("item", item);
         
          //  with first unit request structure to build
          w.buildings
            .member(item, w.units)
            .match(w.units.count, 1)
            .request() // w.position
          ;

          // keep requesting units until size
          w.units
            .member(w.item, w.units)
            .lt(w.units.count, w.units.size)
            .request()
          ;

          // got unit, send to repair
          w.item
            .member(w.item, w.units)
            .repair(w.buildings)
          ;

          // got the building, update position, all units repair
          w.units
            .member(w.item, w.buildings)
            .relocate(w.item.position)
            .repair(w.item)
          ;


          // if (this.units.match(asset)){

          //   if (this.units.count === 1){
          //     this.economy.request(1, this.buildings, this.position);   
          //   }

          //   if (this.units.count < this.size){
          //     this.economy.request(1, this.units, this.position);   
          //   }

          //   if (this.foundation){
          //     // deb("---------> : %s", this.foundation.health);
          //     asset.repair(this.foundation);
          //   }

          // } else if (this.buildings.match(asset)){

          //   this.position = asset;

          //   if (asset.isFoundation){
          //     this.foundation = asset;
          //     this.units.repair(asset);
            
          //   } else if (asset.isStructure){
          //     if (this.buildings.count < this.quantity){
          //       this.economy.request(1, this.buildings, this.position);

          //     } else {
          //       this.dissolve();
          //     }

          //   }

          // }


        },
        onDestroy: function(g, asset){

          g.log("onDestroy", g, asset);

          // got the building, update position, all units repair
          g.units
            .member(asset, g.units)
            .request()
          ;

          g.buildings
            .member(asset, g.buildings)
            .request()
          ;



          // deb("     G: %s onDestroy: %s", this, asset);

          // if (this.units.match(asset)){
          //   this.economy.request(1, this.units, this.position);

          // } else if (this.buildings.match(asset)){
          //   this.economy.request(1, this.buildings, this.position);

          // }

        },
        onAttack: function(g, asset, enemy, type, damage){

          g.log("onAttack", g, asset);

          // asset
          //   .lt(asset.health, 50)
          //   .garrison()

          // g.units
          //   .member(asset, g.units)
          //   .request()
          // ;

          // deb("     G: %s onAttack %s by %s, damage: %s", this, asset, enemy, damage);

        },
        onBroadcast: function(){},
        onInterval:  function(g, secs, tick){

          g.log("onInterval", g);

          g.units
            .doing("idle")
            .amount_eq(g.units.size)
            .g
            .dissolve()
          ;


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

