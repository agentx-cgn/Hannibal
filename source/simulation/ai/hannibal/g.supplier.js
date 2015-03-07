/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- GROUP:  S U P P L I E R -------------------------------------

  a group gather wood, stone or metal


  tested with 0 A.D. Alpha 18 Rhododactylus
  V: 0.1.1, agentx, CGN, Mar, 2015

*/


HANNIBAL = (function(H){

  H.extend(H.Groups, {

    "g.supplier" : {

      /*
        a group to gather many kind of resources (wood, food.fruit, etc.)

        Behaviour: 
          to request a resource list
          to dissolve on empty list
          to build a dropsite if needed
          to stay calm
          
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

          w.data = [
            ["metal"     , "exclusive", "metal.ore  GATHEREDBY", "shared", "metal ACCEPTEDBY",  1, 10],
            ["stone"     , "exclusive", "stone.rock GATHEREDBY", "shared", "stone ACCEPTEDBY",  1, 10],
            ["wood"      , "exclusive", "wood.tree  GATHEREDBY", "shared", "wood ACCEPTEDBY",  10, 10],
            ["food.fruit", "exclusive", "food.fruit GATHEREDBY", "shared", "food ACCEPTEDBY",   1,  5],
            ["food.meat" , "exclusive", "food.meat  GATHEREDBY", "shared", "food ACCEPTEDBY",   1,  2],
          ];

          w.units          = w.data.find(d => d[0] === supply).slice(1, 3);
          w.dropsite       = w.data.find(d => d[0] === supply).slice(3, 5);
          w.resources.size = w.data.find(d => d[0] === supply)[5];
          w.units.size     = w.data.find(d => d[0] === supply)[6];
          w.dropsite.size  = 1;

          w.nounify("units", "resources", "dropsite");

          w.resources.on.request(w.resources.size); // may get less


        }, assign: function assign (w, item) {

          w.deb("     G: assign: %s, %s", this, item);

          w.nounify("item", item);

          // got empty resource, transfer units to idle, dissolve group
          w.resources.on
            .member(w.item)
            .match(w.resources.count, 0)
            .units.do.transfer("g.idle")
            .group.do.dissolve()  
            .exit
          ;

          // got initial resources, relocate, request unit, exits
          w.resources.on
            .member(w.item)
            .match(w.units.count, 0)
            .group.do.relocate(w.resources.position)
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
            .match(w.units.count, 1)
            .match(w.dropsite.count, 0)
            .dropsite.do.request({distance: 10})
          ;

          // got initial dropsite foundation, relocate, units repair
          w.dropsite.on
            .member(w.item)
            .match(w.item.foundation)
            .group.do.relocate(w.dropsite.position)
            .units.do.repair(w.dropsite)
          ;

          // got dropsite, relocate, units gather
          w.dropsite.on
            .member(w.item)
            .match(!w.item.foundation)
            .group.do.relocate(w.dropsite.position)
            .units.do.gather(w.resources)
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

          // got another resource, relocate, all units gather
          w.resources.on
            .member(w.item)
            .group.do.relocate(w.dropsite.position)
            .units.do.gather(w.resources)
          ;


        }, destroy: function destroy (w, item) {

          w.deb("     G: destroy: %s, %s", this, item);

          w.nounify("item", item);

          // lost unit, request another
          w.units.on
            .member(w.item)
            .request()
          ;

          // lost dropsite, request another
          w.dropsite.on
            .member(w.item)
            .request()
          ;


        }, attack: function attack (w, attacker, victim, type, damage){

          w.deb("     G: attack: %s, %s, %s", this, attacker, victim);

          w.nounify("attacker",  attacker, "victim", victim);


        }, radio: function radio (w, msg) {

          w.deb("     G: %s radio %s, %s", this, msg);


        }, interval:  function interval(w, secs, tick) {

          // w.deb("     G: interval: %s, secs: %s, intv: %s", this, secs, this.interval);

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
            .gt(w.units.count, 0)
            .gather(w.resources)
            .echo("interval.idle, have %s resources", w.resources.count)
          ;

        }


      } // end script

    }

  });

return H; }(HANNIBAL));

