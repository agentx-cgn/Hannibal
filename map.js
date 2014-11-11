/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals  HANNIBAL, H, Uint8Array, deb, uneval */

/*--------------- M A P S -----------------------------------------------------

  Deals with map aspects in coordinates + 
  cosmetic rewite offindGoodPosition, createObstructionsmap from Aegis


  V: 0.1, agentx, CGN, Feb, 2014

*/

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

  var 
    TERRITORY_PLAYER_MASK = 0x3F, // 63
    prit = H.prettify,
    pritShort = function (a){
      return (
        !Array.isArray(a) ? a :
        a.length === 0 ? "[]" : 
          H.prettify(a.map(function(v){
            return Array.isArray(v) ? pritShort(v) : v.toFixed(1);
          }))
      );
    };

  H.LIB.Map = function(config){
    H.extend(this, config, {

    });
  };

  H.LIB.Map.prototype = {
    constructor: H.Map,
    mapPosToGridPos: function(p){
      return [~~(p[0] / this.cellsize), ~~(p[1] / this.cellsize)];
    },
    mapPosToIndex: function(p){
      var [x, y] = this.mapPosToGridPos(p);
      return x + y * this.width;
    },
    distanceTo: function(ids, pos){
      // deb("   MAP: distanceTo: args: %s", uneval(arguments));
      var center = this.getCenter(ids);
      return this.distance(center, pos);
    },
    distance: function(a, b){
      // deb("   MAP: distance: args: %s", uneval(arguments));
      var dx = a[0] - b[0], dz = a[1] - b[1];
      return Math.sqrt(dx * dx + dz * dz);
    },
    isOwnTerritory: function(p){
      var 
        index  = this.mapPosToIndex(p),
        player = H.Grids.territory.data[index] & TERRITORY_PLAYER_MASK;

      // deb("isOwnTerritory: %s", index);

      return player === H.Bot.id;
    },
    isEnemyTerritory: function(pos){
      var 
        index  = this.mapPosToGridIndex(pos),
        player = H.Grids.territory.data[index] & TERRITORY_PLAYER_MASK;
      return H.GameState.playerData.isEnemy[player];
    },
    nearest: function(point, ids){

      // deb("   MAP: nearest: target: %s, ids: %s", point, ids);

      var distance = 1e10, dis, result = 0, pos = 0.0;

      ids.forEach(id => {
        pos = H.Entities[id].position();
        dis = this.distance(point, pos);
        if ( dis < distance){
          distance = dis; result = id;
        } 
      });
      return result;

    },
    getSpread: function(ids){
      var poss = ids.map(id => H.Entities[id].position()),
          xs = poss.map(pos => pos[0]),
          zs = poss.map(pos => pos[1]),
          minx = Math.max.apply(Math, xs),
          minz = Math.max.apply(Math, zs),
          maxx = Math.max.apply(Math, xs),
          maxz = Math.max.apply(Math, zs),
          disx = maxx - minx,
          disz = maxz - minz;
      return Math.max(disx, disz);
    },
    centerOf: function(poss){
      // deb("   MAP: centerOf.in %s", pritShort(poss));
      var out = [0, 0], len = poss.length;
      poss.forEach(function(pos){
        if (pos.length){
          out[0] += pos[0];
          out[1] += pos[1];
        } else { 
          len -= 1;
        }
      });
      return [out[0] / len, out[1] / len];
    },
    getCenter: function(ids){

      // deb("   MAP: getCenter: %s", H.prettify(ids));

      if (!ids || ids.length === 0){
        throw new Error(H.format("getCenter with unusable param: '%s'", uneval(ids)));}

      return this.centerOf( ids
        .filter(id => !!H.Entities[id])
        .map(id => H.Entities[id].position())
      );

    },
    createTerritoryMap: function() {
      var map = new H.API.Map(H.Bot.gameState.sharedScript, H.Bot.gameState.ai.territoryMap.data);
      map.getOwner      = function(p) {return this.point(p) & TERRITORY_PLAYER_MASK;};
      map.getOwnerIndex = function(p) {return this.map[p]   & TERRITORY_PLAYER_MASK;};
      return map;
    },
    createObstructionMap: function(accessIndex, template){

      var 
        gs = H.Bot.gameState, PID = H.Bot.id, 
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

      var x, z, j, len, value, bestIdx, bestVal, bestTile, secondBest, 
          gs       = H.Bot.gameState,
          cellSize = gs.cellSize,
          template = gs.getTemplate(tpl),
          obstructionMap   = H.Map.createObstructionMap(0, template),
          friendlyTiles    = new H.API.Map(gs.sharedScript),
          alreadyHasHouses = false,
          radius = 0;
      
      angle  = angle === undefined ? H.Config.angle : angle;

      // deb("   MAP: findGoodPosition.in: pos: %s, tpl: %s", position.map(c => c.toFixed(1)), tpl);
      
      //obstructionMap.dumpIm(template.buildCategory() + "_obstructions_pre.png");

      if (template.buildCategory() !== "Dock"){obstructionMap.expandInfluences();}

      //obstructionMap.dumpIm(template.buildCategory() + "_obstructions.png");

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
            deb("WARNING: no influence for: %s", tpl);
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
      

      //friendlyTiles.dumpIm(template.buildCategory() + "_" +gameState.getTimeElapsed() + ".png", 200);
      
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
        deb("   MAP: findGoodPosition.out: pos: %s, tpl: %s", [x, z].map(c => c.toFixed(1)), tpl);
        return false;
      }

      
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

      // deb("   MAP: findGoodPosition.out: pos: %s, tpl: %s", [x, z].map(c => c.toFixed(1)), tpl);

      return {
        "x" : x,
        "z" : z,
        "angle" : angle,
        "xx" : secondBest[0],
        "zz" : secondBest[1]
      };

    }
  
  };


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