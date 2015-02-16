/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- V I L L A G E S ---------------------------------------------

  Organizes structures around civic centres,
  appoints mayor and custodians

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/


HANNIBAL = (function (H){

  const 
    PI     = Math.PI,
    TAU    = Math.PI * 2,
    PI2    = Math.PI / 2,
    RADDEG = Math.PI / 180,
    DEGRAD = 1 / RADDEG,
    SQRT2  = Math.sqrt(2);

  // H.LIB.Centre = function (context){  };

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
        "entities",      // hasClass
        "templates",     // obstructionRadius
        "metadata",
        "passabilityClasses",
      ],

      main:      NaN,        // id of first centre
      centres:   null,       // list of centres
      theta:     NaN,        // rads of main to center of map
      angle:     NaN,        // theta in degrees
      orient:    NaN,        // rads of main on map (missing on API?)

      claimed:    null,

      counter: {
        units:  0,
        mayors: 0,
        shared: 0,
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

   });

  };

  H.LIB.Villages.prototype = H.mixin( 
    H.LIB.Serializer.prototype, {
    contructor: H.LIB.Villages,
    log: function () {
      this.deb();
      this.deb("  VILL:    main: %s, angle: %s, theta: %s, counts: %s", this.main, this.angle.toFixed(1), this.theta, JSON.stringify(this.counter));
      this.deb("     V: centres: %s", JSON.stringify(this.centres));
    },
    // import: function () {
    //   this.imports.forEach(imp => this[imp] = this.context[imp]);
    //   return this;
    // },
    // clone: function (context){
    //   context.data[this.name] = this.serialize();
    //   return new H.LIB[H.noun(this.name)](context);
    // },
    deserialize: function () {
      var data;
      if (this.context.data[this.name]){
        data = this.context.data[this.name];
        this.main    = data.main;
        this.centres = data.centres;
      }
      // deb("  VILL: deserialized: %s", uneval(data));
    },
    serialize: function () {
      return {
        main:    this.main,
        centres: H.deepcopy(this.centres),
      };
    },
    initialize: function () {
      // deb("  VILL: initializing: %s", uneval(this.centres));
      if (this.centres === null){
        this.centres = {};
        this.organizeVillages(); // set metadata.cc to nearest cc
        this.initializeMeta();
        this.updateStreets();
      }

      return this;
    },
    activate: function () {

      var sizeBuilder = tpl => {
        // something between 1 and 20
        return Math.min(20, ~~(H.test(this.templates[tpl], "Cost.BuildTime") / 20) +1);
      };

      this.events.on("PhaseChanged", msg => {
        this.updateStreets();
      });

      this.events.on("ConstructionFinished", msg => {
        if (this.isShared(msg.data.classes)){
          this.entities[msg.id].opmode = "shared";
          this.entities[msg.id].opname = "village";
          this.deb("  VILL: ConstructionFinished: classes: %s, meta: %s", msg.data.classes, uneval(this.metadata[msg.id]));
        }
      });

      this.events.on("StructureDestroyed", msg => {
        // launch group to rebuild, if shared and not foundation
        this.deb("  VILL: StructureDestroyed: msg: %s", uneval(msg));
        if (this.isShared(msg.data.classes) && !msg.data.foundation){
          this.groups.launch({
            groupname: "g.builder", 
            cc: this.main, 
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
        }
      });

    },
    tick: function(secs, tick){

      var t0 = Date.now();
      this.ticks = tick; this.secs = secs;
      return Date.now() - t0;

    },    
    isShared: function (klasses){
      return this.config.villages.sharedBuildingClasses.some(function (klass){
        return H.contains(klasses, klass);
      });
    },
    getPhaseNecessities: function (options){ // phase, centre, tick
      
      var 
        cls = H.class2name,
        cc  = options.centre,
        housePopu = this.query(cls("house")).first().costs.population * -1,

        messages = [],
        technologies = [],
        launches = {

          "phase.village": [

             //  tck, amount,       group,        params
             [  3, [1, "g.mayor",       {cc: cc, size: 0}]],
             [  3, [1, "g.custodian",   {cc: cc, size: 0}]],

          ],
          "phase.town" :   [],
          "phase.city" :   [],
        };

      return {
        launches: launches,
        technologies: technologies,
        messages: messages,
      };

    },      
    findMain: function(){

      var max = -1, cic;

      H.each(this.centres, (id, list) => {
        if (list.length > max){cic = id; max = list.length;}
      });
      return ~~cic;

    },
    organizeVillages: function () {

      var 
        ccNodes, ccId, posMain, posCenter;

      // first find all CC
      ccNodes = this
        .query("civcentre CONTAIN INGAME")
        .forEach( node => {
          this.centres[node.id] = [];
          this.deb("  VILL: organizeVillages centre id: %s, pos: %s", node.id, node.position);
        })
      ;

      if (!ccNodes.length){
        this.deb("WARN  : organizeVillage No CC found with: civcentre CONTAIN INGAME");
        return;
      } else {
        this.deb("  VILL: organizeVillage CCs found: %s", uneval(this.centres));
      }

      // update metadata with closest CC id
      this.query("structure CONTAIN INGAME")
        .parameter({fmt: "metadata", deb: 5, max: 80, cmt: "organizeVillages: ingame structures"})
        .forEach( node => {

          var dis, distance = 1e7;

          // is not cc
          if (!this.centres[node.id]){

            // find nearest CC
            ccNodes.forEach( cc => {

              // this.deb("  VILL: distances: %s, %s", cc.position, node.position);
              dis = this.map.distance(cc.position, node.position);
              if (dis < distance){
                ccId = cc.id;
                this.metadata[node.id].cc = cc.id;
                distance = dis;
              }
            });

            // store building to find largest village
            this.centres[ccId].push(node.id);

          } else {
            // CCs have themself as cc
            this.metadata[node.id].cc = node.id;

          }

      });

      this.main  = this.findMain();
      posMain    = this.entities[this.main].position();
      posCenter  = this.map.center();
      this.theta = Math.atan2(posCenter[1] - posMain[1], posCenter[0] - posMain[0]);
      this.angle = this.theta * 180 / Math.PI;

      H.each(this.centres, (id, amount) => {
        // deb("     V: CC [%s] has %s entities, main: %s", id, amount, (~~id === this.main ? "X" : ""));
      });

    },    

    initializeMeta: function () {

      // deb("     V: setting operators for shared buildings and Main CC in metadata");

      //TODO: test for multiple villages
      // find units and buildings not belonging to a group and
      // set opname to "none", should only happen in a fresh game

      H.each(this.entities, (id, ent) => {

        if (ent.owner() === this.id){

          if (ent.hasClass("Unit") && !this.metadata[id].opname){
            this.metadata[id].opname = "none";
            this.counter.units += 1;
            // deb("     V: set opname to 'none' %s", ent);

          } else if (ent.hasClass("Structure") && !this.metadata[id].opname){

            // deb("     V: id: %s, entid: %s mainid: %s", id, ent.id(), this.main);

            if (~~id === this.main){
              this.counter.mayors += 1;
              this.counter.shared += 1;
              this.metadata[id].opname = "g.mayor";
              this.metadata[id].opmode = "shared";
              // deb("     V: set opname to 'g.mayor' for %s", ent);

            } else if (this.isShared(ent.classes().map(String.toLowerCase))){
              this.counter.shared += 1;
              this.metadata[id].opname = "g.custodian";
              this.metadata[id].opmode = "shared";
              // deb("     V: set opname to 'g.custodian' for %s", ent);

            } else {
              this.counter.other += 1;
              this.metadata[id].opname = "none"; // there is a group for that
              // deb("     V: set opname to 'none' for %s", ent);
            
            }

          } else {
            // happens in cloned bot
            // deb("WARN  : prepareMeta unhandled entity: %s classes: %s", ent, uneval(this.metadata[id]));

          }

        }

      });


    },

    findLayout: function(order){

      // random doesn't work with offset = -1

      var 
        posCentre = this.entities[order.cc].position(),
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
    updateStreets: function(){

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
        [cx, cz] = this.entities[this.main].position(),
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


// get best index
    // .processGrids(r => r < 32 ? 0 : 32)           // remove border
// [index, value] = restrictions.maxIndex();

// center x, z in cell
// position = this.map.gridIndexToMapPos(index, restrictions);

// add angle

// random, may fail with tight
// position.push(Math.random() * Math.PI * 2);  

// entrance points north
// position.push(-this.theta + PI2));

// entrance points to civil centre
// position.push(-this.map.getTheta(posCentre, position) - PI2);

// entrance points to map centre
// position.push(this.map.getTheta(this.map.center(), position));   