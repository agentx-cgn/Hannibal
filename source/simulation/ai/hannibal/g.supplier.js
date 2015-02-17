/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- GROUP: M I N E R --------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  var deb = H.deb;

  H.Groups = H.Groups || {};

  H.extend(H.Groups, {

    "g.supplier" : {

      /*
        a group without units solely for the first/biggest CC

        Behaviour: 
          to exploit resources like ruins, trees, mines
          to build a dropsite if needed
          
      */

      active:         true,             // prepared for init/launch ...
      description:    "supplier",       // text field for humans 
      civilisations:  ["*"],            // 
      interval:       3,                // call scripts.interval every x ticks

      technologies: [                   // these techs help
        "gather.lumbering.ironaxes",
        "gather.capacity.wheelbarrow",
        "gather.wicker.baskets",          // ?? only fruits
        "gather.mining.wedgemallet",
        "gather.mining.silvermining",    
        "gather.mining.shaftmining",
      ],

      scripts: {

        launch: function launch (w, config /* supply, size, quantity */){

          var supply = config.supply;

          w.deb("     G: onlaunch %s, %s", this, uneval(config));

          w.resources = ["resource", supply];

          w.units = (
            supply === "metal"      ? ["exclusive", "metal.ore  GATHEREDBY"] :
            supply === "stone"      ? ["exclusive", "stone.rock GATHEREDBY"] :
            supply === "wood"       ? ["exclusive", "wood.tree  GATHEREDBY"] :
            supply === "food.fruit" ? ["exclusive", "food.fruit GATHEREDBY"] :
            supply === "food.meat"  ? ["exclusive", "food.meat  GATHEREDBY"] :
              deb(" ERROR: exclusives: unknown supply '%s' for g.supplier", supply)
          );

          w.dropsite = (
            supply === "metal"      ?  ["shared", "metal ACCEPTEDBY"] :
            supply === "stone"      ?  ["shared", "stone ACCEPTEDBY"] :
            supply === "wood"       ?  ["shared", "wood ACCEPTEDBY"]  :
            supply === "food.fruit" ?  ["shared", "food ACCEPTEDBY"]  :
            supply === "food.meat"  ?  ["shared", "food ACCEPTEDBY"]  :
              deb(" ERROR: unknown supply '%s' for supply group", supply)
          );

          w.resources.size = (
            config.quantity         ? config.quantity : 
            supply === "metal"      ?  1  :
            supply === "stone"      ?  1  :
            supply === "wood"       ?  10 :
            supply === "food.fruit" ?  5  :
            supply === "food.meat"  ?  5  :
              deb(" ERROR: unknown supply '%s' for supply group", config.supply)
          );

          w.units.size = (
            config.size             ? config.size : 
            supply === "metal"      ?  10 :
            supply === "stone"      ?  10 :
            supply === "wood"       ?  10 :
            supply === "food.fruit" ?  5  :
            supply === "food.meat"  ?  2  :
              deb(" ERROR: unknown supply '%s' for supply group", config.supply)
          );

          w.dropsite.size  = 1;

          w.nounify("units", "resources", "dropsite");

          w.resources.on.request(w.resources.size); // may get less


        }, assign: function assign (w, item) {

          w.deb("     G: assign: %s, %s", this, item);

          w.objectify("item", item);

          // got empty resource, transfer units to idle, dissolve group
          w.resources.on
            .member(w.item)
            .match(w.resources.count, 0)
            .units.do.transfer("g.idle")
            .group.do.dissolve()  
            .exit
          ;

          // got initial resources, request unit, exits
          w.resources.on
            .member(w.item)
            .match(w.units.count, 0)
            .units.do.request()
            .exit
          ;

          // have too many units, transfer, exits
          w.units.on
            .gt(w.units.count, w.units.size)
            .item.do.transfer("g.idle")
            .exit
          ;          

          // got initial unit, request dropsite
          w.units.on
            .member(w.item)
            .match(w.dropsite.count, 0)
            .dropsite.do.request()
          ;

          // got initial dropsite foundation, units repair
          w.dropsite.on
            .member(w.item)
            .match(w.item.foundation)
            .units.do.repair(w.dropsite)
          ;

          // got dropsite, units gather, group relocate
          w.dropsite.on
            .member(w.item)
            .match(!w.item.foundation)
            .units.do.gather(w.resources)
            .group.do.relocate(w.dropsite.position)
          ;

          // got unit, keep requesting until size
          w.units.on
            .member(w.item)
            .lt(w.units.count, w.units.size)
            .request()
          ;

          // got unit, let gather on next resource
          w.units.on
            .member(w.item)
            .resources.do.rotate()
            .item.do.gather(w.resources)
          ;

          // got another resource, all units gather
          w.resources.on
            .member(w.item)
            .units.do.gather(w.resources)
          ;


        }, destroy: function destroy (w, item) {

          w.deb("     G: destroy: %s, %s", this, item);

          w.objectify("item", item);

          // lost unit, request another
          w.units
            .member(w.item)
            .request()
          ;

          // lost dropsite, request another
          w.dropsite
            .member(w.item)
            .request()
          ;

        }, attack: function attack (w, item, enemy, type, damage) {

          w.deb("     G: destroy: %s, %s, %s, %s, %s", this, item, enemy, type, damage);


        }, radio: function radio (w, msg) {

          w.deb("     G: %s radio %s, %s", this, msg);


        }, interval:  function interval(w, secs, tick) {

          w.deb("     G: interval: %s, %s secs", this, secs);

          // // test, transfer units, exits
          // w.units.on
          //   .transfer("g.idle")
          //   .echo("DID IDLE")
          //   .exit
          // ;

          // run out of resources, request more, exits
          w.resources.on
            .refresh()
            .match(w.resources.count, 0)
            .echo("interval.match: have %s resources", w.resources.count)
            .request()
            .exit
          ;

          // idle units should gather
          w.units.on
            .doing("idle")
            .gather(w.resources)
            .echo("interval.idle, have %s resources", w.resources.count)
          ;

        }


      } // end script

    }

  });

return H; }(HANNIBAL));

