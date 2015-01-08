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
          to exploit resources like ruins, mines with stone
          to build a dropsite if needed
          
      */

      active:         true,           // prepared for init/launch ...
      description:    "supplier",     // text field for humans 
      civilisations:  ["*"],          // 
      interval:       5,              // call onInterval every x ticks

      technologies: [                 // these techs help
        "gather.lumbering.ironaxes",
        "gather.capacity.wheelbarrow",
        "gather.wicker.baskets", // ?? only fruits
        "gather.mining.wedgemallet",
        "gather.mining.silvermining",    
        "gather.mining.shaftmining",
      ],

      scripts: {

        launch: function launch (w, config /* supply, size */){

          w.deb("     G: onlaunch %s, %s", w, uneval(config));

          w.units = (
            config.supply === "metal"      ? ["exclusive", "metal.ore  GATHEREDBY"] :
            config.supply === "stone"      ? ["exclusive", "stone.rock GATHEREDBY"] :
            config.supply === "wood"       ? ["exclusive", "wood.tree  GATHEREDBY"] :
            config.supply === "food.fruit" ? ["exclusive", "food.fruit GATHEREDBY"] :
            config.supply === "food.meat"  ? ["exclusive", "food.meat  GATHEREDBY"] :
              deb(" ERROR: exclusives: unknown supply '%s' for g.supplier", config.supply)
          );

          w.dropsite = (
            config.supply === "metal"      ?  ["shared",    "metal ACCEPTEDBY"] :
            config.supply === "stone"      ?  ["shared",    "stone ACCEPTEDBY"] :
            config.supply === "wood"       ?  ["shared",    "wood ACCEPTEDBY"]  :
            config.supply === "food.fruit" ?  ["shared",    "food ACCEPTEDBY"]  :
            config.supply === "food.meat"  ?  ["shared",    "food ACCEPTEDBY"]  :
              deb(" ERROR: unknown supply '%s' for supply group", config.supply)
          );

          w.units.size     = config.size || 10;
          w.dropsite.size  = 1;
          w.resources      = ["resource", config.supply];
          w.resources.size = 10; // upper limit, the groups handles

          w.nounify("units", "resources", "dropsite");

          w.resources.on.request(10); // may get less


        }, assign: function assign (w, item) {

          w.deb("     G: assign.0: %s, %s", w, item);

          w.objectify("item", item);

          // got empty resource, dissolve group
          w.resources.on
            .member(w.item)
            .match(w.resources.count, 0)
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

          // got initial unit, request dropsite, exits
          w.units.on
            .member(w.item)
            .match(w.dropsite.count, 0)
            .dropsite.do.request()
            .exit
          ;

          // got initial dropsite foundation, units repair
          w.dropsite.on
            .member(w.item)
            .match(w.item.foundation)
            .units.do.repair(w.dropsite)
          ;

          // got initial dropsite, units gather
          w.dropsite.on
            .member(w.item)
            .match(!!w.item.foundation)
            .units.do.gather(w.resources)
          ;

          // keep requesting units until size
          w.units.on
            .member(w.item)
            .lt(w.units.count, w.units.size)
            .request()
          ;

          // got another resource, units gather
          w.resources.on
            .member(w.item)
            .units.do.gather(w.resources)
          ;


        }, destroy: function destroy (w, item) {

          w.deb("     G: destroy: %s, %s", w, item);

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

          w.deb("     G: destroy: %s, %s %s %s %s", w, item, enemy, type, damage);


        }, radio: function radio (w, msg) {

          w.deb("     G: %s radio %s, %s", this, msg);


        }, interval:  function interval(w, tick, secs) {

          w.deb("     G: interval: %s, %s secs", w, secs);

          // run out of resources, request more, exits
          w.resources.on
            .match(w.resources.count, 0)
            .request()
            .exit
          ;

          // idle units should gather
          w.units.on
            .doing("idle")
            .gather(w.resources)
          ;

        }


      } // end script

    }

  });

return H; }(HANNIBAL));

