/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals  HANNIBAL, Uint8Array, uneval, logObject */

/*---------------  M A P ------------------------------------------------------

  Deals with map aspects in coordinates, contains all grids and fields


  tested with 0 A.D. Alpha 18 Rhododactylus
  V: 0.1.1, agentx, CGN, Mar, 2015

*/

/* 
  naming conventions:
    positions: array of floats [x, z] in map dimension (m)
    coords:    array of ints [x, z] in grid dimension (m/grid.cellsize)
    grids:     one dimensional int arrays having width === height
    fields:    one dimensional float arrays having width === height
    size:      width or height of grids
    cell:      area covered in map by grid index
    index:     pointer into grid, index = x + y * size
    length:    width * height
    id:        a single entity id, int
    ids:       array of entity ids e.g. [45, 46, ...]
    distance:  float, scalar in map positions

*/ 

/* 
  grids: 
    terrain:         water, land, shore, etc, static
    regionswater:    connected water cells, static
    regionsland:     connected land cells, static
    obstructions:    where buildings can be placed, dynamic
    obstacles:       where units can move, dynamic
    claims:          reserved space in villages, dynamic
    danger:          where significant attacks happened, w/ radius, dynamic
    scanner:         used by scouts to mark explored area

*/

// http://www.nayuki.io/res/smallest-enclosing-circle/smallestenclosingcircle.js
// http://stackoverflow.com/questions/4826453/get-two-lower-bytes-from-int-variable

// sharedScript.passabilityClasses
//   pathfinderObstruction: NUMBER (1)
//   foundationObstruction: NUMBER (2)
//   building-land: NUMBER (4)
//   building-shore: NUMBER (8)
//   default: NUMBER (16)
//   ship: NUMBER (32)
//   unrestricted: NUMBER (64)

// Object [Object] : attributes: 9, comment: sharedScript.passabilityClasses
//   building-land: NUMBER (1)
//   building-shore: NUMBER (2)
//   default: NUMBER (4)
//   default-terrain-only: NUMBER (8)
//   large: NUMBER (16)
//   ship: NUMBER (32)
//   ship-small: NUMBER (64)
//   ship-terrain-only: NUMBER (128)
//   unrestricted: NUMBER (256)

HANNIBAL = (function(H){

  const 

    TERRITORY_PLAYER_MASK = 0x3F, // 63

    PI     = Math.PI,
    TAU    = PI + PI,
    PI2    = PI / 2,
    RADDEG = PI / 180,
    DEGRAD = 180 / PI,
    SQRT2  = Math.sqrt(2);

  H.LIB.Map = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "id",
        "mapsize",
        "circular",
        "config",
        "effector",
        "events",
        "entities",           
        "templates",           
        "territory",          // API obj  w/ typed array   
        "passability",        // %
        "villages",           
        "player",           
        "players",            // isEnemy
      ],

      childs: [             // these are all grids with cellsize
        ["terrain", 8],            // water, land, shore, etc, static
        ["regionswater", 8],       // connected water cells, static
        ["regionsland", 8],        // connected land cells, static
        ["buildable", 8],          // dynamic, where buildings can be placed, = terrain - obstructions 
        ["restrictions", 8],       // temporary, where buildings can be placed, = map - (own,enemy,tower) 
        ["obstructions", 8],       // temporary, buildable - buildings restrictions
        ["distances", 8],          // temporary, distances map
        ["resources", 8],          // temporary, filled from resource maps
        ["obstacles", 8],          // dynamic, where units can move
        ["claims", 8],             // dynamic, reserved space in villages, dynamic
        ["streets", 8],            // dynamic, reserved space in villages, dynamic
        ["danger", 8],             // dynamic, where attacks happened, w/ radius, dynamic
        ["scanner", 8],            // dynamic, used by scouts to mark explored area
        ["white", 8],              // fixed, used to as copy source
        ["black", 8],              // fixed, used to as copy source
      ]

    });

  };


  H.LIB.Map.prototype = H.mixin(
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Map,
    log: function(){

      var size;

      this.deb(); this.deb("   MAP: size: %s", this.mapsize);
      // this.childs.forEach(child => this[child].log());

      size = this.mapsize / this.passability.cellsize;
      this.effector.dumparray("passability", this.passability.data, size, size, 255);    

      size = this.mapsize / this.territory.cellsize;
      this.effector.dumparray("territory",   this.territory.data,   size, size, 255);    

    },
    serialize: function(){
      var name, data = {};
      this.childs.forEach( child => {
        name = child[0];
        data[name] = this[name].serialize();
      });
      return data;
    },
    deserialize: function(data){
      var name;
      if (data){
        this.childs.forEach( child => {
          name = child[0];
          if (this.context.data[this.name][name]){
            this[name] = new H.LIB.Grid(this.context)
              .import()
              .deserialize(data[name]);
          }
        });
      }
      this.territory   = this.context.territory;
      this.passability = this.context.passability;
      this.mapsize     = this.context.mapsize;
    },
    initialize: function(){
      var name;
      this.childs.forEach( child => {
        name = child[0];
        if (!this[name]){
          this[name] = new H.LIB.Grid(this.context)
            .import()
            .initialize({label: name, bits: "c8", cellsize: child[1]});
          this.updateGrid(name);
        }
      });

      return this;

    },
    finalize: function(){

      var 
        field, 
        [x, z] = this.mapPosToGridCoords(this.entities[this.villages.findMain()].position(), this.regionsland),
        data   = this.regionsland.data,
        reg    = data[x + z * this.regionsland.size];

      this.deb("   MAP: finalize: terrain x/z: %s/%s, size: %s, length: %s", x, z, this.terrain.size, this.terrain.length);
      this.deb("   MAP: finalize: land    x/z: %s/%s, size: %s, length: %s", x, z, this.regionsland.size, this.regionsland.length);

      // field = H.AI.FlowField.create(this.terrain, x, z, index => data[index] === reg ? 1 : 0);

      // this.effector.dumparray("flowfield", field, this.terrain.size, this.terrain.size, 255);

    },
    activate: function(){

      var coords, radius; 

      this.events.on("StructureDestroyed", msg => {
        // mark ground as dangerous  
        coords = this.mapPosToGridCoords(msg.data.position);
        radius = this.config.map.DangerEventRadius / this.cellsize;
        this.danger.processCircle(coords, radius, v => v + 32);
        this.deb("   MAP: StructureDestroyed: tpl: %s, pos: %s, danger radius: 32", msg.data.templatename, msg.data.position);
        // this.danger.dump("-" + this.ticks, 255);
      });

    },
    tick: function(secs, tick){

      var t0 = Date.now();

      this.ticks = tick; this.secs = secs;

      // this.effector.dumparray("passability" + this.ticks, this.passability.data, this.gridsize, this.gridsize, 255);    

      this.childs.forEach(child => this[child[0]].tick(tick, secs));

      if (tick % this.config.map.DangerEventRelax === 0){
        // relax danger by half
        this.danger.filter(d => d >>> 1);
      }

      return Date.now() - t0;

  /* compute resource maps

    */

    }, getResource: function(generic) {

      return this.resources.read(this.resourcemaps[generic]);


  /* simple map infos, calculations and converters

    */

    }, center: function(){

      return [this.mapsize/2, this.mapsize/2];

    }, mapPosToGridCoords: function(pos, grid){

      if (!grid || !grid.cellsize) {H.throw("mapPosToGridCoords: no cellsize");}

      return [~~(pos[0] / grid.cellsize), ~~(pos[1] / grid.cellsize)];

    }, mapPosToGridIndex: function(pos, grid){

      var [x, y] = this.mapPosToGridCoords(pos, grid);
      
      // return x + y * grid.size;
      return x + y * this.mapsize / grid.cellsize;

    }, gridIndexToMapPos: function(index, grid){

      var offset = grid.cellsize / 2;
      
      return [
          (index % grid.size) * grid.cellsize + offset, 
        ~~(index / grid.size) * grid.cellsize + offset
      ];

    }, distance: function(a, b){

      // distance between 2 positions

      if (!a.length || !b.length || a.length !== 2 || b.length !== 2){
        H.throw("ERROR : map.distance wrong args: ", uneval(arguments));
      }

      var dx = a[0] - b[0], dz = a[1] - b[1];
      return Math.sqrt(dx * dx + dz * dz);

    }, distanceTo: function(ids, pos){

      // distance of n entities to position

      var center = this.getCenterPos(ids);
      return this.distance(center, pos);

    }, nearestId: function(point, ids){

      // return closest id 

        var dis = 0.0, mindis = 1e10, result = NaN, pos = 0.0;

        ids.forEach(id => {
          pos = this.entities[id].position();
          dis = this.distance(point, pos);
          if ( dis < mindis ){
            mindis = dis; 
            result = id;
          } 
        });

        return result;

    }, getSpread: function(ids){

      // longest side of enclosing axis parallel rectangle 

      var 
        poss = ids.map(id => this.entities[id].position()),
        xs = poss.map(pos => pos[0]),
        zs = poss.map(pos => pos[1]),
        minx = Math.min.apply(Math, xs),
        minz = Math.min.apply(Math, zs),
        maxx = Math.max.apply(Math, xs),
        maxz = Math.max.apply(Math, zs);

      return Math.max(maxx - minx, maxz - minz);

    }, centerOf: function(poss){

      // center position of positions

      var out = [0, 0], len = poss.length;

      poss.forEach( pos => {
        out[0] += pos[0];
        out[1] += pos[1];
      });

      return [out[0] / len, out[1] / len];

    }, getCenter: function(ids){

      // center position of entities

      return this.centerOf ( 
        ids.filter(id => !!this.entities[id])
          .map(id => this.entities[id].position())
      );


    }, getTheta: function(pos1, pos2){

      // return rads from pos2 to pos1

      var 
        dx = pos2[0] - pos1[0],
        dy = pos2[1] - pos1[1],
        theta = Math.atan2(dy, dx);

      // this.deb("   MAP: getTheta: %s, %s, %s", pos1, pos2, theta);
      // return theta < 0 ? theta + TAU : theta;

      return -(theta < 0 ? theta + TAU : theta) - PI2;


  /* infos about positions or index

    */

    }, isOwnTerritory: function(pos){

      // this.deb("   MAP: isOwnTerritory %s", uneval(arguments));

      var 
        index  = this.mapPosToGridIndex(pos, this.territory),
        player = this.territory.data[index] & TERRITORY_PLAYER_MASK;

      return player === this.context.id;

    }, isInOwnTerritory: function(id){

      var 
        pos    = this.entities[id]._entity.position,
        index  = this.mapPosToGridIndex(pos, this.territory),
        player = this.territory.data[index] & TERRITORY_PLAYER_MASK,
        result = player === this.context.id;

      // this.deb("   MAP: isInOwnTerritory %s => %s, player: %s", uneval(arguments), result, player);

      return result;

    }, isEnemyTerritory: function(pos){

      var 
        index  = this.mapPosToGridIndex(pos, this.territory),
        player = this.territory.data[index] & TERRITORY_PLAYER_MASK;

      return this.players.isEnemy[player];

    }, canBuildHere: function(tpln, pos, distance){

      var 
        coords = this.mapPosToGridCoords(pos, this.territory),
        index  = this.mapPosToGridIndex(pos, this.territory),
        radius = ~~(distance / this.territory.cellsize),
        template = this.templates[tpln],
        placement = H.test(template, "BuildRestrictions.PlacementType"),          // land, shore, land-shore
        territories = H.test(template, "BuildRestrictions.Territory").split(" "); // own, ally, enemy, neutral

      this.deb("   MAP: canBuildHere testing: %s pl: %s, tr: %s", tpln, placement, territories);

      // shortcut for now
      if (placement === "shore"){
        return false;
      }

      return true;


  /* advanced computations on grids

    */


    }, updateGrid: function(name){

      // intializes terrain, regionsland, regionswater

      var 
        t1, t0 = Date.now(), src, tgt, t, s, w = this.gridsize, h = w, i = w * h,
        mask, counter = 0, 
        terr, regl, regw, 
        buil, tori, pass, 
        path1, path2, pos1, pos2,
        check, id = this.context.id;

      if (name === "terrain"){

      // translates into internal terrain (land, water, forbidden, steep, error)

        src = this.passability.data; // api
        tgt = this.terrain.data;     // own

        while(i--){s = src[i]; tgt[i] = (
                                                                  (s & 64)   ?   0 :   //     0, border
                         (s &  8) && !(s & 16)                && !(s & 64)   ?   4 :   //    32, land
            !(s & 4) && !(s &  8)                             && !(s & 64)   ?   8 :   //    64, shallow
             (s & 4) && !(s &  8) && !(s & 16)                && !(s & 64)   ?  16 :   //    92, mixed
                                      (s & 16)  && !(s & 32)  && !(s & 64)   ?  32 :   //   128, deep water
             (s & 4) &&               (s & 16)  &&  (s & 32)  && !(s & 64)   ?  64 :   //   192, steep land
               255                                                                     //   255, error
          );
        }
        t1 = Date.now();
        this.terrain.dump("T" + (this.ticks || 0), 255);
        // this.deb("   MAP: updated: terrain, ms: %s", t1 - t0);


      } else if (name === "regionsland") {

        // detects unconnected land regions

        mask = 16 + 8 + 4;
        terr = this.terrain.data;
        regl = this.regionsland.data;

        while (i--) {
          s = terr[i]; t = regl[i];
          if (t === 0 && ( s & mask) ) {
            this.fillRegion(terr, regl, mask, i, ++counter);
          }
        }

        t1 = Date.now();
        // this.regionsland.dump("init", 255);
        // this.deb("   MAP: updated: regionsland, ms: %s, regions: %s", counter, t1 - t0);



      } else if (name === "regionswater") {

        mask = 16 + 32;
        terr = this.terrain.data;
        regw = this.regionswater.data;

        while (i--) {
          s = terr[i]; t = regw[i];
          if (t === 0 && ( s & mask) ) {
            this.fillRegion(terr, regw, mask, i, ++counter);
          }
        }

        t1 = Date.now();
        // this.regionswater.dump("init", 255);
        // this.deb("   MAP: updated: regionswater, ms: %s, regions: %s", counter, t1 - t0);


      } else if (name === "white") {
        while(i--){
          this.white.data[i] = 255;
        }

      } else if (name === "black") {
        while(i--){
          this.black.data[i] = 0;
        }

      // } else if (name === "buildable") {

      //   // own land terrain minus structures, trees
      //   buil = this.buildable.data;
      //   terr = this.terrain.data;
      //   tori = this.territory.data;
      //   pass = this.passability.data;
      //   mask = 2; //this.context.gamestate.getPassabilityClassMask("foundationObstruction")

      //   while (i--) {
      //     buil[i] = (
      //       terr[i] === 4                              &&      // land
      //       // ((tori[i] & TERRITORY_PLAYER_MASK) === id) &&      // own territory
      //       !(pass[i] & mask)                                  // obstructions
      //     ) ? 32 : 0;
      //   }

      //   t1 = Date.now();
      //   // this.buildable.dump("T" + (this.ticks || 0), 255);
      //   this.deb("   MAP: updated: buildable, ms: %s", t1 - t0);

      } else {
        // this.deb("   MAP: updateGrid: unknown: %s", name);
        
      }

    }, fillRegion: function(src, tgt, mask, index, region){

      // flood fills tgt starting at index with region based on src and mask
      // used by land water regions grids
      // avoids push/pop, bc slow

      var 
        width = this.gridsize,
        i, idx, nextX, nextY,
        y = ~~(index / width) | 0,
        x = index % width | 0,
        stack = [x, y], pointer = 2, 
        dx = [ 0, -1, +1,  0], 
        dy = [-1,  0,  0, +1]; 

      while (pointer) {

        y = stack[pointer -1];
        x = stack[pointer -2];
        pointer -= 2;

        tgt[y * width + x] = region;

        i = 4; while (i--) {

          nextX = x + dx[i];
          nextY = y + dy[i];
          idx   = (nextY * width + nextX);

          if (!tgt[idx] && (src[idx] & mask) && nextX && nextY && nextX < width && nextY < width) {
            stack[pointer]    = nextX;
            stack[pointer +1] = nextY;
            pointer += 2;
          }

        }

      }

    }, templateTerritory: function(tpln){

      // returns a 255|0 mask with allowed territory

      var 
        t0 = Date.now(),
        i, player,
        id = this.id,
        template = this.templates[tpln],
        isAlly   = this.player.isAlly,
        isEnemy  = this.player.isEnemy,
        teri = new H.LIB.Grid(this.context).import().initialize({label: "tplteri", cellsize: 8}),
        data = teri.data,

        territories  = H.test(template, "BuildRestrictions.Territory").split(" "),
        buildOwn     = H.contains(territories, "own"),
        buildAlly    = H.contains(territories, "ally"),
        buildNeutral = H.contains(territories, "neutral"),
        buildEnemy   = H.contains(territories, "enemy");


      i = teri.length; while(i--) {

        player = (this.territory.data[i] & TERRITORY_PLAYER_MASK);

        data[i] = (
          (!buildOwn     && player === id)                      ||
          (!buildAlly    && player !== id && isAlly[player])    ||
          (!buildNeutral && player ===  0)                      ||
          (!buildEnemy   && player !==  0 && isEnemy[player])
        ) ? 0 : 255;

      }

      // this.deb("   MAP: templateTerritory: %s msec, tpl: %s, terri: %s", 
      //   Date.now() - t0,
      //   tpln,
      //   territories
      // );

      return teri;

    }, templateRestrictions: function(tpln){

      // copies buildable and puts buildrestrictions in, with 0
      // seperates e.g. fortresses from fortresses
      // TOOD: placementType

      var 
        t0 = Date.now(),
        minDist, category, coords, 
        template  = this.templates[tpln],
        placement = H.test(template, "BuildRestrictions.PlacementType"),
        distance  = H.test(template, "BuildRestrictions.Distance");

      // make a temporary copy all white
      // this.restrictions = this.buildable.copy("restrictions").set(255);
      this.restrictions = this.white.copy("restrictions").release();

      if (distance){

        minDist  = distance.MinDistance;
        category = distance.FromCategory;

        // this.deb("   MAP: templateObstructions: tpl: %s %s, %s", tpl, minDist, category);

        if (minDist !== undefined && category !== undefined){

          this.query("structure CONTAIN INGAME")
           .parameter({fmt: "metadata", deb: 5, max: 80, cmt: "templateObstructions: ingame structures"})
           .forEach( node => {
            if (this.entities[node.id].buildCategory() === category){
              coords = this.mapPosToGridCoords(node.position);
              // set restricted to black
              this.restrictions.processCircle(coords, minDist/this.cellsize, () => 0);
            }
          });

        }
      }

      // this.deb("   MAP: templateRestrictions %s msec, placement: %s, dist: %s | %s", 
      //   Date.now() - t0,
      //   placement,
      //   distance,
      //   tpln
      // );

      return this.restrictions;


    }, scan: function(pos, radius){

      // scans the map for treasure and mines
      // reports findings to context.resources
      // marks covered cells in scanner grid based on radius and position
      // returns up to 4 new positions to scan, aligned to villages.theta

      this.resources.markFound(pos, radius);


    },
  
  });

return H; }(HANNIBAL));
