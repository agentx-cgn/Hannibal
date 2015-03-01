/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- V I L L A G E S ---------------------------------------------

  Organizes buildings to settlements,


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/


HANNIBAL = (function (H){

  const 
    PI     = Math.PI,
    TAU    = PI + PI,
    PI2    = PI / 2,
    RADDEG = PI / 180,
    DEGRAD = 180 / PI,
    SQRT2  = Math.sqrt(2);

  H.LIB.Settlement = function (context){  

    // a set of building around a dropsite

     H.extend(this, {

       context:  context,

       imports:  [
         "query",
         "groups",
         "entities",      
         "templates",     
         "metadata",
       ],

       main:        NaN,        // id of dropsite
       buildings:   null,       

    });


  };

  H.LIB.Settlement.prototype = H.mixin( 
    H.LIB.Serializer.prototype, {
    contructor: H.LIB.Settlement, 

  });

  /* Internals

    */ 


  H.LIB.Villages = function (context){

    H.extend(this, {

      context:  context,

      imports:  [
        "id",
        "civ",
        "map",
        "query",
        "claims",
        "events",
        "groups",
        "config",
        "player",
        "objects",
        "culture",
        "entities",      // hasClass
        "templates",     // obstructionRadius
        "metadata",
        "passabilityClasses",
      ],

      claimed:         null,

      settlements:     null,
      startBuildings:    [],       // temporaraly used while startup
      seedTemplates:     [],       // templates suitable as settlement seed

      counter: {
        units:  0,
        mayors: 0,
        shared: 0,
        seeds:  0,
        other:  0,
      },

      layout: {
        farming:  {},
        housing:  {},
        barracks: {},
        temple:   {},
        market:   {},
        walls:    {},
      },

      settlement: {                // object template
        id:               NaN,
        theta:            NaN,       // rads of main to center of map
        angle:            NaN,       // theta in degrees
        orient:           NaN,       // rads of main on map (missing on API?)
        buildings:         [],       // list of ids
      }

   });

  };

  H.LIB.Villages.prototype = H.mixin( 
    H.LIB.Serializer.prototype, {
    contructor: H.LIB.Villages,

  /* Internals

    */ 

    log: function () {
      this.deb();
      this.deb("  VILL:    main: %s, settlements: %s", this.findMain(), H.count(this.settlements));
    },
    deserialize: function (data) {
      if (data){
        this.settlements = data.settlements;
      }
    },
    serialize: function () {
      return {
        settlements: H.deepcopy(this.settlements),
      };
    },
    initialize: function () {
      // deb("  VILL: initializing: %s", uneval(this.settlements));
      if (this.settlements === null){
        this.settlements = {};
        this.findSeedTemplates();
        this.analyzeBuildings();
        this.organizeSettlements();
        this.updateStreets(this.findMain());
      }

      return this;
    },
    findSettlement: function (fn) {

      var found = false, hit = null;

      H.each(this.settlements, (id, sett) => {
        if(!found && fn(sett)){
          found = true;
          hit   = sett;
        }
      });

      if(hit === null){this.deb("  VILL: Settlement not found with: %s", H.fnBody(fn));}

      return hit;

    },
    activate: function () {

      var sid, sett, sizeBuilder = tpl => {
        // something between 1 and 20
        return Math.min(20, ~~(H.test(this.templates[tpl], "Cost.BuildTime") / 20) +1);
      };

      this.events.on("PhaseChanged", () => {
        this.updateStreets();
      });

      this.events.on("ConstructionFinished", msg => {
        sid = this.metadata[msg.id].sid;
        this.settlements[sid].buildings.push(msg.id);
        this.deb("  VILL: added %s to sett: %s", msg.data.templatename, sid);
      });

      this.events.on("StructureDestroyed", msg => {

        // was it a seed?

        if(this.settlements[msg.id]){

          // TODO
          this.deb("  VILL: Settlement Destroyed: msg: %s, meta: %s", uneval(msg), uneval(this.metadata[msg.id]));

        } else {

          // launch group to rebuild, if shared and not foundation
          this.deb("  VILL: StructureDestroyed: msg: %s, meta: %s", uneval(msg), uneval(this.metadata[msg.id]));

          // remove from settlement, if registered
          sett = this.findSettlement(s => H.contains(s.buildings, msg.id));
          if (sett){
            sid = sett.id;
            H.delete(sett.buildings, id => msg.id);
          }
          
          // build a new one if registered
          if (sett && !msg.data.foundation){
            this.groups.launch({
              groupname: "g.builder", 
              sid: sid, 
              building: H.saniTemplateName(msg.data.templatename), 
              quantity: 1, 
              size: sizeBuilder(msg.data.templatename)
            });

            this.deb("  VILL: StructureDestroyed: %s, classes: %s, meta: %s, time: %s", 
              msg.data.templatename,
              msg.data.classes, 
              uneval(this.metadata[msg.id]),
              H.test(this.templates[msg.data.templatename], "Cost.BuildTime")
            );
          
          } else {
            this.deb("  VILL: Did not rebuild: %s", msg.data.templatename);
          }

        }

      });

    },
    tick: function(secs, tick){

      var t0 = Date.now();
      this.ticks = tick; this.secs = secs;
      return Date.now() - t0;

    },    

  /* Helper

    */ 

    isSeed: function (id){
      return H.contains(this.seedTemplates, this.entities[id]._templateName);
    },
    isShared: function (klasses){
      return this.config.villages.sharedBuildingClasses.some(function (klass){
        return H.contains(klasses, klass);
      });
    },    
    findMain: function(){

      var max = -1, sid;

      H.each(this.settlements, (id, sett) => {
        if (sett.buildings.length > max){sid = id; max = sett.buildings.length;}
      });
      return ~~sid;

    },

  /* Startup/Initialize

    */ 

    organizeSettlements: function () {

      var 
        dis, pos, distance,
        seeds = [], nonSeeds = [], 
        ents = this.entities,
        center = this.map.center();

      // collect seeds and nonSeeds
      this.startBuildings.forEach(id => {

        if (this.isSeed(id)){

          seeds.push(id);
          
          // seeds have themself as settlement id
          this.metadata[id].sid = id;
          
          // init a settlement
          this.settlements[id] = H.deepcopy(this.settlement);
          this.settlements[id].id = id;

          // get orientation
          pos = ents[id].position();
          this.settlements[id].theta = Math.atan2(center[1] - pos[1], center[0] - pos[0]);
          this.settlements[id].angle = this.settlements[id].theta * DEGRAD;


        } else {
          nonSeeds.push(id);

        }

      });

      // find nearest seed for all non seed and set SID
      nonSeeds.forEach(id => {
        distance = 1e7;
        seeds.forEach(sid => {
          dis = this.map.distance(ents[id].position(), ents[sid].position());
          if (dis < distance){
            this.metadata[id].sid = sid;
            distance = dis;
          }
        });
      });

      this.deb("  VILL: organizeSettlements: have %s seeds, %s non seed", seeds.length, nonSeeds.length);

    },

    findSeedTemplates: function () {

      // find all buildings with these properties:
      // not outpost AND not farmstead, builds in neutral OR dropsite
      // own civ and exists in tree
      // move to culture??

      var terr, decay, drops, civ, influ, u = uneval, tree = this.culture.tree.nodes;

      H.each(this.templates, (tpln, tpl) => {

        terr  = H.test(tpl, "BuildRestrictions.Territory");     // own neutral enemy
        decay = H.test(tpl, "TerritoryDecay.HealthDecayRate");  // int
        influ = H.test(tpl, "TerritoryInfluence");              // root, radius weight
        drops = H.test(tpl, "ResourceDropsite.Types");          // food, wood, etc
        civ   = H.test(tpl, "Identity.Civ");                    // athen, maur, etc

        if (
          civ === this.player.civ && 
          !tpln.contains("outpost") && 
          !tpln.contains("farmstead") && 
          tree[H.saniTemplateName(tpln)] && (
            drops !== undefined || 
            (terr !== undefined && terr.contains("neutral")) 
          )
          ){

          this.seedTemplates.push(tpln);
          this.deb("  VILL: findSeedTemplates %s > %s, %s, %s, %s", tpln, u(terr), u(decay), u(influ), u(drops));

        }

      });

      this.deb("  VILL: findSeedTemplates: %s for %s", this.seedTemplates.length, this.player.civ);
      this.seedTemplates.forEach(tpln => this.deb("     V: %s", tpln));

    },
    analyzeBuildings: function () {

      // collects buildings
      // and inits meta to none/NaN

      var meta;

      H.each(this.entities, (id, ent) => {

        if (ent.owner() === this.id){

          meta = this.metadata[id];

          if (ent.hasClass("Unit") || ent.hasClass("Structure")){

            if (meta.opname){
              if (!meta.opid){
                this.deb("WARN  : analyzeBuildings Unit without opid: %s, %s", id, uneval(meta));
              }

            } else {
              meta.opname = "none";
              meta.opid = NaN;

            }

            if (ent.hasClass("Structure")){
              this.startBuildings.push(id);

            } else {
              this.counter.units += 1;

            }

          } else {
            this.deb("WARN  : Neither Unit Nor Structure: %s, %s", id, uneval(meta));

          }

        }

      });

      this.deb("  VILL: analyzeBuildings: found %s units, %s buildings", this.counter.units, this.startBuildings.length);

    },

  /* Layout, Positions, Streets

    */ 
    
    findLayout: function(order){

      // random doesn't work with offset = -1

      var 
        posCentre = this.entities[order.sid].position(),
        template  = this.templates[order.product.key],
        placement = H.test(template, "BuildRestrictions.PlacementType"),
        size = H.test(template, "Obstruction.Static"),
        r = Math.max(+size["@width"], +size["@depth"]),

        mapsize = this.map.gridsize <= 256 ? "small"  : "big",
        bldsize = r < 15  ? "small" : r < 21 ? "middle" : "big",

        angles = {
          "random": (   ) => Math.random() * TAU,
          "north":  (   ) => -this.theta + PI2,
          "south":  (   ) => -this.theta,
          "centre": (pos) => this.map.getTheta(posCentre, pos),
          "middle": (pos) => this.map.getTheta(this.map.center(), pos),
        },

        civs = {
          
          // smalls with offset 0, big with +1, all centre
          "*" : (ms, bs) => {
            var offset = (bs === "small" ? -1 : bs === "middle" ? +0 : +1);
            var angle  = offset === -1 ? "middle" : "centre";
            return {
              offset: () => offset,
              angle : (pos) => angles[angle](pos),
              info: H.format("%s/%s: %s %s %s", this.player.civ, civ, placement, angle, offset),
            };
          },

          // houses point south with off = -1, other centre
          "maur" : (ms, bs) => {
            var offset = (bs === "small" ? -1 : bs === "middle" ? +0 : +1);
            var angle = offset === -1 ? "south" : "centre";
            return {
              offset: () => offset,
              angle : (pos) => offset === -1 ? angles[angle](pos) : angles[angle](pos),
              info: H.format("%s/%s: %s %s %s", this.player.civ, civ, placement, angle, offset),
            };
          },

        },
        civ = civs[this.player.civ] ? this.player.civ : "*";


      // this.deb("  VILL: findLayout: civ: %s, bld: %s, map: %s", civ, bldsize, mapsize);

      return civs[civ](mapsize, bldsize);

    },
    findPosForOrder: function(order) {

      // general method to find a possible place for a structure defined by tpl
      // uses terrain, territory, claims, danger and building restriction
      // takes longest building dimension as distance radius

      var 
        
        t0 = Date.now(),
        value, position, index,
        fltFirst, fltFinal,
        buildable, restrictions, territory, danger, distances, streets,

        pos      = [order.x, order.z],
        coords   = this.map.mapPosToGridCoords(pos),
        cellsize = this.map.cellsize,
        tpln     = order.product.key,
        template = this.templates[tpln],

        // set radius and layout
        layout = this.findLayout(order),
        size   = H.test(template, "Obstruction.Static"),
        r = Math.max(+size["@width"], +size["@depth"]),
        radius = Math.ceil(SQRT2 * r / 2 / cellsize) + layout.offset(),

        // prepare placement filter
        placement = H.test(template, "BuildRestrictions.PlacementType"),
        maskFound = this.passabilityClasses["foundationObstruction"],
        maskShore = maskFound | this.passabilityClasses["building-shore"],
        maskLand  = maskFound | this.passabilityClasses["building-land"];


      // is there an empty slot left
      if((position = this.claims.findPosition(order))){
        return position;
      }

      // compute input grids & masks

      // priotizes cells nearer to coords
      distances    = this.map.distances.setCoords(coords);

      // masks (0 = unusable, 255 = good)
      danger       = this.map.danger;
      streets      = this.map.streets;
      territory    = this.map.templateTerritory(tpln);
      restrictions = this.map.templateRestrictions(tpln);

      // filter functions
      fltFirst = (
        placement === "shore"      ? (v, s) => s & (v & maskShore ? 0 : 255) :
        placement === "land"       ? (v, s) => s & (v & maskLand  ? 0 : 255) :
        placement === "land-shore" ? (v, s) => s & (v & maskShore || v & maskLand ? 0 : 255) :
          H.throw("findPosForOrder: unknown PlacementType: %s for %s", placement, tpln)
      );
      fltFinal = (bd, di, da, rs, tt) => (bd === 255 ? di - da : 0) & rs & tt;

      // crunching numbers
      [buildable, value, position, index] = new H.LIB.Grid(this.context)
        .import()
        .release()
        .initialize({label: "buildable", data: H.lowerbyte(this.map.passability.data)})
        .filter(streets, fltFirst)
        .distanceTransform()
        .filter(v => v <= radius ? 0 : 255)
        .filter(distances, danger, restrictions, territory, fltFinal)
        .maxValue()
      ;

      // building rotation depends on civ
      position.push(layout.angle(position));          

      // debug
      buildable.debIndex(index);
      buildable.dump("poso idx", 255);

      this.deb("  VILL: #%s findPosForOrder %s msec, dis: %s, radius: %s, layout: %s | %s", 
        order.id, 
        Date.now() - t0,
        256 - value,
        radius,
        // position.map(n => n.toFixed(1)).join("|"), 
        layout.info,
        tpln
      );

      // everything above 0 is good
      return value > 0 ? position : null;

    },
    updateStreets: function(sid){

      // determines streets by running pathfinder from an inner circle
      // to an outer circle. Cells hit multiple times qualify as street
      // TODO: agora, centre area only, if space enough, check that crazy map!!

      /*  template_structure_civic_civil_centre.xml
          <TerritoryInfluence><Root>true</Root><Radius>140</Radius>
          <Footprint><Square width="32.0" depth="32.0"/>
          <Attack><Ranged><MaxRange>72.0</MaxRange>        
      */

      var 
        t0 = Date.now(), points = 48,
        i, x, y, p, result, graph, start, end, node, index, 
        heuristic = H.AI.AStar.heuristics.euclidian,
        grid = this.map.black.copy("graph").release(),
        [cx, cz] = this.entities[sid].position(),
        coords = this.map.mapPosToGridCoords([cx, cz]),
        pathInner = points + "; translate " + cx + " " + cz + "; circle 40",
        pathOuter = points + "; translate " + cx + " " + cz + "; circle 140",
        innerCircle = new H.LIB.Path(this.context, pathInner).path,
        outerCircle = new H.LIB.Path(this.context, pathOuter).path,

        // streets with centre area excluded
        streets = this.map.streets.set(255).processCircle(coords, 10, () => 0),
        terr = this.map.terrain.data,
        pass = this.map.passability.data,
        mask = 2; //this.context.gamestate.getPassabilityClassMask("foundationObstruction")

      // the grid encodes walls as 0, cost as 1, looking for land and passable
      i = grid.length; while (i--) {
        grid.data[i] = ( terr[i] === 4 && !(pass[i] & mask) ) ? 1 : 0;
      }

      graph = new H.AI.GraphFromFunction(grid, i => grid.data[i]);

      p = innerCircle.length; while(p--){

        [x, y] = this.map.mapPosToGridCoords(innerCircle[p]);
        [x, y] = grid.coordsWithinSize(x, y);
        start  = graph.grid[x][y];
        [x, y] = this.map.mapPosToGridCoords(outerCircle[p]);
        [x, y] = grid.coordsWithinSize(x, y);
        end    = graph.grid[x][y];

        result = H.AI.AStar.search(graph, start, end, { 
          closest:   true,
          heuristic: heuristic,
          algotweak: 3
        });

        i = result.path.length; while(i--){
          node = result.path[i];
          index = streets.coordsToIndex(node.x, node.y);
          streets.data[index] -= 64;
        }

        // make graph reusable
        graph.clear();

      }


      this.deb("  VILL: %s updateStreets: points: %s path.length: %s", 
        Date.now() - t0, 
        points,
        result.path.length
      );

      streets.dump("before", 255);
      streets.filter(v => v <= 128 ? 0 : 255);
      streets.dump("after", 255);

    }

  });

return H; }(HANNIBAL));  
