/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals  HANNIBAL, Uint8Array, uneval, logObject */

/*--------------- M A P S -----------------------------------------------------

  Deals with map aspects in coordinates, contains all grids and fields


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/

/* 
  naming conventions:
    positions: array of floats [x, z] in map dmension (m)
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
    attacks:         where attacks happened, w/ radius, dynamic
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

// sharedScript.passabilityMap
//   data: OBJECT (0, 1, 2, 3, 4, ...)[65536]
//   height: NUMBER (256)
//   width: NUMBER (256)

// sharedScript.territoryMap
//   data: OBJECT (0, 1, 2, 3, 4, ...)[65536]
//   height: NUMBER (256)
//   width: NUMBER (256)


HANNIBAL = (function(H){

  const 

    TERRITORY_PLAYER_MASK = 0x3F, // 63

    sin = Math.sin,
    cos = Math.cos,
    sqrt = Math.sqrt,
    PI2  = Math.PI * 2,
    PIH  = Math.PI / 2,

    pritShort = function (a){
      return (
        !Array.isArray(a) ? a :
        a.length === 0 ? "[]" : 
          H.prettify(a.map(function(v){
            return Array.isArray(v) ? pritShort(v) : v.toFixed(1);
          }))
      );
    };

  H.LIB.Map = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "id",
        "width",
        "height",
        "cellsize",
        "effector",
        "events",
        "entities",           
        "templates",           
        "territory",           
        "passability",           
        "villages",           
        "players",            // isEnemy
      ],

      childs: [             // these are all grids
        "terrain",            // water, land, shore, etc, static
        "regionswater",       // connected water cells, static
        "regionsland",        // connected land cells, static
        "buildable",          // dynamic, where buildings can be placed, = terrain - territory 
        "obstructions",       // temporary, buildable - buildings restrictions
        "obstacles",          // where units can move, dynamic
        "claims",             // reserved space in villages, dynamic
        "attacks",            // where attacks happened, w/ radius, dynamic
        "scanner",            // used by scouts to mark explored area
      ],

      length:        0,

      // territory:     null,        // grids from API 
      // passability:   null,        // grids from API 

    });

  };


  H.LIB.Map.prototype = H.mixin(
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Map,
    log: function(){
      this.deb();
      this.deb("   MAP: width: %s, height: %s, cellsize: %s, grid: %s, length: %s", 
        this.width, 
        this.height, 
        this.cellsize, 
        this.gridsize, 
        this.length
      );
      this.childs.forEach(child => this[child].log());

      this.effector.dumparray("passability", this.passability.data, this.gridsize, this.gridsize, 255);    
      this.effector.dumparray("territory",   this.territory.data,   this.gridsize, this.gridsize, 255);    

    },
    serialize: function(){
      var data = {};
      this.childs.forEach( child => {
        data[child] = this[child].serialize();
      });
      return data;
    },
    deserialize: function(data){
      if (data){
        this.childs.forEach( child => {
          if (this.context.data[this.name][child]){
            this[child] = new H.LIB.Grid(this.context)
              .import()
              .deserialize(data[child]);
          }
        });
      }
      this.territory   = this.context.territory;
      this.passability = this.context.passability;
      this.length      = this.passability.data.length;
      this.gridsize    = this.passability.width; // only squares here
    },
    initialize: function(){

      // this.territory   = this.context.territory;
      // this.passability = this.context.passability;
      this.length      = this.passability.data.length;
      this.gridsize    = this.passability.width; // only squares here

      // deb("   MAP: territory   size: %s", this.territory.width);
      // deb("   MAP: passability size: %s", this.passability.width);

      this.childs.forEach( child => {
        if (!this[child]){
          this[child] = new H.LIB.Grid(this.context)
            .import()
            .initialize({label: child, bits: "c8"});
          this.updateGrid(child);
        }
      });

      return this;

    },
    finalize: function(){

      var 
        field, 
        [x, z] = this.mapPosToGridCoords(this.entities[this.villages.main].position()),
        data   = this.regionsland.data,
        reg    = data[x + z * this.regionsland.size];

      this.deb("   MAP: finalize: terrain x/z: %s/%s, size: %s, length: %s", x, z, this.terrain.size, this.terrain.length);
      this.deb("   MAP: finalize: land    x/z: %s/%s, size: %s, length: %s", x, z, this.regionsland.size, this.regionsland.length);

      field = H.AI.FlowField.create(this.terrain, x, z, function(index){
        return data[index] === reg ? 1 : 0;
      });

      this.effector.dumparray("flowfield", field, this.gridsize, this.gridsize, 255);

    },
    activate: function(){

      this.events.on("Attack", msg => {

      });

    },
    tick: function(secs, tick){

      var t0 = Date.now();

      this.ticks = tick; this.secs = secs;

      // this.effector.dumparray("passability" + this.ticks, this.passability.data, this.gridsize, this.gridsize, 255);    

      this.childs.forEach(child => this[child].tick(tick, secs));

      return Date.now() - t0;


  /*#########################################################################
    
    simple map infos, calculations and converters

    */

    }, center: function(){

      return [this.width/2, this.height/2];

    }, mapPosToGridCoords: function(pos, grid){

      var cellsize = grid ? grid.cellsize : this.cellsize;
      return [~~(pos[0] / cellsize), ~~(pos[1] / cellsize)];

    }, mapPosToGridIndex: function(pos, grid){

      var 
        size = grid && grid.size ? grid.size : this.gridsize,
        [x, y] = this.mapPosToGridCoords(pos);
      
      return x + y * size;

    }, gridIndexToMapPos: function(index, grid){

      var 
        size = grid && grid.size ? grid.size : this.gridsize,
        cellsize = grid && grid.cellsize ? grid.cellsize : this.cellsize;
      
      return [(index % size) * cellsize, (index / size) * cellsize];

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


  /*#########################################################################

    simple infos about positions or index

    */

    }, isOwnTerritory: function(pos){

      this.deb("   MAP: isOwnTerritory %s", uneval(arguments));

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


  /*#########################################################################

    advanced computations on grids

    */


    }, updateGrid: function(name){

      // intializes terrain, regionsland, regionswater

      var 
        t1, t0 = Date.now(), src, tgt, t, s, w = this.gridsize, h = w, i = w * h,
        pass, terr, regl, regw, buil, tori, 
        check, mask, counter = 0, id = this.context.id;

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


      } else if (name === "buildable") {

        // own land terrain minus structures, trees
        buil = this.buildable.data;
        terr = this.terrain.data;
        tori = this.territory.data;
        pass = this.passability.data;
        mask = 2; //this.context.gamestate.getPassabilityClassMask("foundationObstruction")

        while (i--) {
          buil[i] = (
            terr[i] === 4                              &&      // land
            ((tori[i] & TERRITORY_PLAYER_MASK) === id) &&      // own territory
            !(pass[i] & mask)                                  // obstructions
          ) ? 32 : 0;
        }

        t1 = Date.now();
        // this.buildable.dump("T" + (this.ticks || 0), 255);
        this.deb("   MAP: updated: buildable, ms: %s", t1 - t0);

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


    }, templateObstructions: function(tpl){

      // copies buildable and puts buildrestrictions in, with 0
      // seperates e.g. fortresses from fortresses

      var 
        minDist, category, distance,
        template = this.templates[tpl];

      // is based on buildable
      this.obstructions = this.buildable.copy("obstructions");

      if ((distance = H.test(template, "BuildRestrictions.Distance"))){

        minDist  = distance.MinDistance;
        category = distance.FromCategory;

        this.deb("   MAP: templateObstructions: tpl: %s %s, %s", tpl, minDist, category);

        if (minDist !== undefined && category !== undefined){

          this.query("structure CONTAIN INGAME")
           .parameter({fmt: "metadata", deb: 5, max: 80, cmt: "templateObstructions: ingame structures"})
           .forEach( node => {
            if (this.entities[node.id].buildCategory() === category){
              this.obstructions.fillCircle(node.position, minDist/this.cellsize, 0);
            }
          });

        }
      }

      return this.obstructions;


    }, scan: function(pos, radius){

      // scans the map for treasure and mines
      // reports findings to context.resources
      // marks covered cells in scanner grid based on radius and position
      // returns up to 4 new positions to scan, aligned to villages.theta

      this.resources.markFound(pos, radius);



    /*#########################################################################

      TODO: rewrite

    */

    }, createTerritoryMap: function() {
      var map = new H.API.Map(H.Bot.gameState.sharedScript, H.Bot.gameState.ai.territoryMap.data);
      map.getOwner      = function(p) {return this.point(p) & TERRITORY_PLAYER_MASK;};
      map.getOwnerIndex = function(p) {return this.map[p]   & TERRITORY_PLAYER_MASK;};
      return map;
    },

    createObstructionMap: function(accessIndex, template){

      var 
        // gs = H.Bot.gameState, PID = H.Bot.id, 
        gs = this.context.gamestate, PID = this.id, 
        tilePlayer, 
        x, y, z, pos, i, okay = false,
        ix1, ix2, ix3, ix4,
        passabilityMap   = gs.getMap(),
        pmData           = passabilityMap.data,
        pmDataLen        = passabilityMap.data.length,
        maskBldShore     = gs.getPassabilityClassMask("building-shore"),
        maskDefault      = gs.getPassabilityClassMask("default"),
        territoryMap     = gs.ai.territoryMap,
        obstructionTiles = new Uint8Array(pmDataLen),
        getRegionSizei   = gs.ai.accessibility.getRegionSizei,
        placementType    = !template ? "land" : template.buildPlacementType(),
        buildOwn         = !template ? true   : template.hasBuildTerritory("own"),
        buildAlly        = !template ? true   : template.hasBuildTerritory("ally"),
        buildNeutral     = !template ? true   : template.hasBuildTerritory("neutral"),
        buildEnemy       = !template ? false  : template.hasBuildTerritory("enemy"),
        obstructionMask  = gs.getPassabilityClassMask("foundationObstruction") | gs.getPassabilityClassMask("building-land"),
        available = 0,
        radius = 3, xx, yy, id,
        invalidTerritory, tileAccessible = true,
        map, minDist, category;

      
      if (placementType === "shore"){

        // TODO: this won't change much, should be cached, it's slow.

        for (x = 0; x < passabilityMap.width; ++x){
          for (y = 0; y < passabilityMap.height; ++y){

            i = x + y * passabilityMap.width;
            tilePlayer = (territoryMap.data[i] & TERRITORY_PLAYER_MASK);
            
            // myIndex ??
            if (gs.ai.myIndex !== gs.ai.accessibility.landPassMap[i] || 
                gs.isPlayerEnemy(tilePlayer) && tilePlayer !== 0 || 
                (pmData[i] & (maskBldShore | maskDefault))){
              obstructionTiles[i] = 0;
              continue;            
            }

            okay = false;

            [[0,1], [1,1], [1,0], [1,-1], [0,-1], [-1,-1], [-1,0], [-1,1]].forEach(function(entry){

              ix1 = x + entry[0]     + (y + entry[1]    ) * passabilityMap.width;
              ix2 = x + entry[0] * 2 + (y + entry[1] * 2) * passabilityMap.width;
              ix3 = x + entry[0] * 3 + (y + entry[1] * 3) * passabilityMap.width;
              ix4 = x + entry[0] * 4 + (y + entry[1] * 4) * passabilityMap.width;
              
              if ((pmData[ix1] & maskDefault) && getRegionSizei(ix1, true) > 500 || 
                  (pmData[ix2] & maskDefault) && getRegionSizei(ix2, true) > 500 || 
                  (pmData[ix3] & maskDefault) && getRegionSizei(ix3, true) > 500 || 
                  (pmData[ix4] & maskDefault) && getRegionSizei(ix4, true) > 500){
                if (available < 2){
                  available++;
                } else {
                  okay = true;
                }
              }

            });

            // checking for accessibility: if a neighbor is inaccessible, this is too. 
            // If it's not on the same "accessible map" as us, we crash-i~u.

            for (xx = -radius; xx <= radius; xx++){
              for (yy = -radius; yy <= radius; yy++){
                id = x + xx + (y + yy) * passabilityMap.width;
                if (id > 0 && id < pmDataLen){
                  if (gs.ai.terrainAnalyzer.map[id] ===  0 || 
                      gs.ai.terrainAnalyzer.map[id] === 30 || 
                      gs.ai.terrainAnalyzer.map[id] === 40){
                    okay = false;
                  }
                }
              }
            }
            obstructionTiles[i] = okay ? 255 : 0;
          }
        }

      // not shore
      } else {
        
        for (i = 0; i < pmDataLen; ++i){

          tilePlayer = (territoryMap.data[i] & TERRITORY_PLAYER_MASK);
          invalidTerritory = (
            (!buildOwn     && tilePlayer === PID) ||
            (!buildAlly    && gs.isPlayerAlly(tilePlayer)  && tilePlayer !== PID) ||
            (!buildNeutral && tilePlayer ===   0) ||
            (!buildEnemy   && gs.isPlayerEnemy(tilePlayer) && tilePlayer !== 0)
          );

          if (accessIndex){
            tileAccessible = (accessIndex === gs.ai.accessibility.landPassMap[i]);
          }
          if (placementType === "shore"){
            tileAccessible = true; //??
          }
          obstructionTiles[i] = (
            (!tileAccessible || invalidTerritory || (passabilityMap.data[i] & obstructionMask)) ? 0 : 255
          );

        }
      }
      
      map = new H.API.Map(gs.sharedScript, obstructionTiles);
      map.setMaxVal(255);
      
      if (template && template.buildDistance()){
        minDist  = template.buildDistance().MinDistance;
        category = template.buildDistance().FromCategory;
        if (minDist !== undefined && category !== undefined){
          gs.getOwnEntities().forEach(function(ent) {
            if (ent.buildCategory() === category && ent.position()){
              pos = ent.position();
              x = Math.round(pos[0] / gs.cellSize);
              z = Math.round(pos[1] / gs.cellSize);
              map.addInfluence(x, z, minDist / gs.cellSize, -255, "constant");
            }
          });
        }
      }

      return map;

    },
    findGoodPosition: function(tpl, position, angle) {

      var 
        x, z, j, len, value, bestIdx, bestVal, bestTile, secondBest, 
        gs       = this.context.gamestate,
        cellSize = this.cellsize,
        template = gs.getTemplate(tpl),
        // template = this.templates[tpl],
        obstructionMap   = this.createObstructionMap(0, template),
        // friendlyTiles    = new H.API.Map(gs.sharedScript),
        friendlyTiles    = new H.API.Map(this.context.sharedscript),
        alreadyHasHouses = false,
        radius = 0,
        result;
      
      angle = angle === undefined ? this.villages.angle * Math.PI / 180 : angle;

      this.deb("   MAP: findGoodPosition.in: pos: %s, tpl: %s", position.map(c => c.toFixed(1)), tpl);
      
      obstructionMap.dumpIm(template.buildCategory() + "_obstructions_pre.png");

      if (template.buildCategory() !== "Dock"){obstructionMap.expandInfluences();}

      obstructionMap.dumpIm(template.buildCategory() + "_obstructions.png");

      // Compute each tile's closeness to friendly structures:

      // If a position was specified then place the building as close to it as possible
      
      if (position) {
        x = ~~(position[0] / cellSize);
        z = ~~(position[1] / cellSize);
        friendlyTiles.addInfluence(x, z, 255);

      } else {
        
        // No position was specified so try and find a sensible place to build
        // if (this.metadata && this.metadata.base !== undefined)
        //   for each (var px in gameState.ai.HQ.baseManagers[this.metadata.base].territoryIndices)
        //     friendlyTiles.map[px] = 20;

        gs.getOwnStructures().forEach(function(ent){

          var pos = ent.position(),
              x = Math.round(pos[0] / cellSize),
              z = Math.round(pos[1] / cellSize);

          if (template.hasClass("Field") && 
              ent.resourceDropsiteTypes() && 
              ent.resourceDropsiteTypes().indexOf("food") !== -1){
            friendlyTiles.addInfluence(x, z, 20, 50);

          } else if (template.hasClass("House") && ent.hasClass("House")) {
            friendlyTiles.addInfluence(x, z, 15, 40);  // houses are close to other houses
            alreadyHasHouses = true;

          } else if (template.hasClass("House")) {
            friendlyTiles.addInfluence(x, z, 15, -40); // and further away from other stuffs

          } else if (template.hasClass("Farmstead")) {
            // move farmsteads away to make room.
            friendlyTiles.addInfluence(x, z, 25, -25);

          } else if (template.hasClass("GarrisonFortress") && ent.genericName() === "House"){
            friendlyTiles.addInfluence(x, z, 30, -50);

          } else if (template.hasClass("Military")) {
            friendlyTiles.addInfluence(x, z, 10, -40);

          } else if (ent.hasClass("CivCentre")) {
            // If this is not a field add a negative influence near the CivCentre because we want to leave this
            // area for fields.
            friendlyTiles.addInfluence(x, z, 20, -20);

          } else {
            this.deb("WARNING: no influence for: %s", tpl);
          }

        });

        if (template.hasClass("Farmstead")){
          len = gs.sharedScript.resourceMaps["wood"].map.length;
          for (j = 0; j < len; ++j){
            value = friendlyTiles.map[j] - (gs.sharedScript.resourceMaps["wood"].map[j]) / 3;
            friendlyTiles.map[j] = value >= 0 ? value : 0;
          }
        }

        // if (this.metadata && this.metadata.base !== undefined)
        //   for (var base in gameState.ai.HQ.baseManagers)
        //     if (base != this.metadata.base)
        //       for (var j in gameState.ai.HQ.baseManagers[base].territoryIndices)
        //         friendlyTiles.map[gameState.ai.HQ.baseManagers[base].territoryIndices[j]] = 0;
      }
      

      // friendlyTiles.dumpIm(template.buildCategory() + "_" + gs.getTimeElapsed() + ".png", 200);
      
      // Find target building's approximate obstruction radius, and expand by a bit to make sure we're not too close, this
      // allows room for units to walk between buildings.
      // note: not for houses and dropsites who ought to be closer to either each other or a resource.
      // also not for fields who can be stacked quite a bit

      radius = (
        template.hasClass("GarrisonFortress") ? ~~(template.obstructionRadius() / cellSize) + 2 :
        template.buildCategory() === "Dock" ? 1 :
        template.resourceDropsiteTypes() === undefined ? ~~(template.obstructionRadius() / cellSize) + 2 :
        Math.ceil(template.obstructionRadius() / cellSize)
      );

      this.deb("   MAP: findGoodPosition radius %s", radius);
      
      // further contract cause walls
      // Note: I'm currently destroying them so that doesn't matter.
      //if (gameState.playerData.civ == "iber")
      //  radius *= 0.95;

      // Find the best non-obstructed
      if (template.hasClass("House") && !alreadyHasHouses) {
        // try to get some space first
        bestTile = friendlyTiles.findBestTile(10, obstructionMap);
        bestIdx = bestTile[0];
        bestVal = bestTile[1];
      }
      
      if (bestVal === undefined || bestVal === -1) {
        bestTile = friendlyTiles.findBestTile(radius, obstructionMap);
        bestIdx  = bestTile[0];
        bestVal  = bestTile[1];
      }

      if (bestVal === -1) {
        this.deb("   MAP: findGoodPosition.out: pos: %s, tpl: %s", [x, z].map(c => c.toFixed(1)), tpl);
        return false;
      }

      this.deb("   MAP: findGoodPosition: tile: %s, idx: %s, val: %s, fwidth: %s, cs: %s", 
        bestTile, 
        bestIdx, 
        bestVal, 
        friendlyTiles.width,
        cellSize
      );
      
      //friendlyTiles.setInfluence((bestIdx % friendlyTiles.width), Math.floor(bestIdx / friendlyTiles.width), 1, 200);
      //friendlyTiles.dumpIm(template.buildCategory() + "_" +gameState.getTimeElapsed() + ".png", 200);

      x = ((bestIdx % friendlyTiles.width) + 0.5) * cellSize;
      z = (Math.floor(bestIdx / friendlyTiles.width) + 0.5) * cellSize;

      if (template.hasClass("House") || 
          template.hasClass("Field") || 
          template.resourceDropsiteTypes() !== undefined){
        secondBest = obstructionMap.findLowestNeighbor(x, z);
      } else {
        secondBest = [x,z];
      }

      deb("   MAP: findGoodPosition.out: pos: %s, tpl: %s", [x, z].map(c => c.toFixed(1)), tpl);



      result = {
        "x" : x,
        "z" : z,
        "angle" : angle,
        "xx" : secondBest[0],
        "zz" : secondBest[1]
      };

      this.deb("   MAP: findGoodPosition: res: %s", uneval(result));

      return result;

    }
  
  });


return H; }(HANNIBAL));


// for (a of Object.getOwnPropertyNames(Math)){console.log(a)}

// "toSource"
// "abs"
// "acos"
// "asin"
// "atan"
// "atan2"
// "ceil"
// "cos"
// "exp"
// "floor"
// "imul"
// "fround"
// "log"
// "max"
// "min"
// "pow"
// "random"
// "round"
// "sin"
// "sqrt"
// "tan"
// "log10"
// "log2"
// "log1p"
// "expm1"
// "cosh"
// "sinh"
// "tanh"
// "acosh"
// "asinh"
// "atanh"
// "hypot"
// "trunc"
// "sign"
// "cbrt"
// "E"
// "LOG2E"
// "LOG10E"
// "LN2"
// "LN10"
// "PI"
// "SQRT2"
// "SQRT1_2"

// H.Map.createTerritoryMap = function() {
//   var map = new H.API.Map(H.Bot.gameState.sharedScript, H.Bot.gameState.ai.territoryMap.data);
//   map.getOwner      = function(p) {return this.point(p) & TERRITORY_PLAYER_MASK;};
//   map.getOwnerIndex = function(p) {return this.map[p]   & TERRITORY_PLAYER_MASK;};
//   return map;
// };

// H.Map.gamePosToMapPos = function(p){
//   return [~~(p[0] / H.Map.cellsize), ~~(p[1] / H.Map.cellsize)];
// };

// H.Map.mapPosToGridPos = function(p){
//   var [x, y] = H.Map.gamePosToMapPos(p);
//   return x + y * H.Map.width;
// };

// H.Map.distance = function(a, b){
//   var dx = a[0] - b[0], dz = a[1] - b[1];
//   return Math.sqrt(dx * dx + dz * dz);
//   // return Math.hypot(a[0] - b[0], a[1] - b[1]);
// };

// H.Map.nearest = function(point, ids){

//   // deb("   MAP: nearest: target: %s, ids: %s", point, ids);

//   var distance = 1e10, dis, result = 0, pos = 0.0;

//   ids.forEach(id => {
//     pos = H.Entities[id].position();
//     dis = H.Map.distance(point, pos);
//     if ( dis < distance){
//       distance = dis; result = id;
//     } 
//   });

//   return result;

// };
// H.Map.spread = function(ids){
//   var poss = ids.map(id => H.Entities[id].position()),
//       xs = poss.map(pos => pos[0]),
//       zs = poss.map(pos => pos[1]),
//       minx = Math.max.apply(Math, xs),
//       minz = Math.max.apply(Math, zs),
//       maxx = Math.max.apply(Math, xs),
//       maxz = Math.max.apply(Math, zs),
//       disx = maxx - minx,
//       disz = maxz - minz;
//   return Math.max(disx, disz);
// };
// H.Map.centerOf = function(poss){
//   // deb("   MAP: centerOf.in %s", pritShort(poss));
//   var out = [0, 0], len = poss.length;
//   poss.forEach(function(pos){
//     if (pos.length){
//       out[0] += pos[0];
//       out[1] += pos[1];
//     } else { 
//       len -= 1;
//     }
//   });
//   return [out[0] / len, out[1] / len];
// };

// H.Map.getCenter = function(entids){

//   // deb("   MAP: getCenter: %s", H.prettify(entids));

//   if (!entids || entids.length === 0){
//     throw new Error("getCenter with unusable param");
//     return deb("ERROR : MAP getCenter with unusable param: %s", entids);

//   } else if (entids.length === 1){
//     if (!H.Entities[entids[0]]){
//       return deb("ERROR : MAP getCenter with unusable id: %s, %s", prit(entids[0]), prit(entids));
//     } else {
//       return H.Entities[entids[0]].position();
//     }

//   } else {
//     return H.Map.centerOf(entids.map(function(id){return H.Entities[id].position();}));

//   }

// };

// H.Map.isOwnTerritory = function(pos){
//   var index  = H.Map.mapPosToGridPos(pos),
//       player = H.Grids.territory.data[index] & TERRITORY_PLAYER_MASK;
//   return player === H.Bot.id;
// };

// H.Map.isEnemyTerritory = function(pos){
//   var index  = H.Map.mapPosToGridPos(pos),
//       player = H.Grids.territory.data[index] & TERRITORY_PLAYER_MASK;
//   return H.GameState.playerData.isEnemy[player];
// };