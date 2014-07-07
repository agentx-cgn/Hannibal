/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, Engine, deb, logObject */

/*--------------- A S S E T S -------------------------------------------------

  handles a group's resources like estate, units, techs, buildings.
  provides the semantics for the DSL used in plugins


  V: 0.1, agentx, CGN, Feb, 2014

*/

// obstructions
// 0 is impassable
// 200 is deep water (ie non-passable by land units)
// 201 is shallow water (passable by land units and water units)
// 255 is land (or extremely shallow water where ships can't go).
// 40 is "tree".
// The following 41-49 range is "near a tree", with the second number showing how many trees this tile neighbors.
// 30 is "geological component", such as a mine

//http://stackoverflow.com/questions/1436438/how-do-you-set-clear-and-toggle-a-single-bit-in-javascript

// unknown      =   0
// ????         =   1   
// hostile      =   2
// shallow      =   4
// metal/stone  =   8
// trees        =  16
// ???          =  32
// land         =  64
// water        =  96
// impassable   = 128


HANNIBAL = (function(H){

  /*
    resources are mines or treasure, wood is different

  */

  H.Scout = (function(){

    var self, width, height, cellsize, circular, grid,
        attackTiles = [],
        mTrees      = 1 << 1, // 2
        mGeo        = 1 << 2,
        mShallow    = 1 << 3,
        mHostile    = 1 << 4, // 16
        maskLand    = 1 << 5,
        maskWater   = 1 << 6,
        maskImpass  = 1 << 7, // 128
        maskShallow = maskWater + mShallow,
        maskTrees   = maskLand  + mTrees,
        maskGeo     = maskLand  + mGeo,
        cacheHypot  = {};

    return {
      boot: function (){return (self = this);},
      dump: function (name){grid.dump(name || "scouting", 255);},
      init: function (){

        width    = H.Map.width;
        height   = H.Map.height;
        cellsize = H.Map.cellsize;
        circular = H.Map.circular;
        grid     = new H.Grid(width, height, 8);

        H.Grids.register("scouting", grid);

        // deb();deb();deb(" SCOUT: Resources...");
        // self.updateResources(false);

      },
      // updateMines: function(dolog){

      //   var type, res;

      //   resources = {};
        
      //   H.each(H.Entities, function(id, ent){
      //     type = ent.resourceSupplyType();
      //     if (!!type && type.specific !== "tree"){
      //       res = resources[ent.id()] = new Resource(ent);
      //       if (H.Map.isOwnTerritory(res.position)){
      //         res.found = true;
      //       }
      //       if (dolog) {res.log();}
      //     }
      //   });

      // },
      // deleteResources: function(ids){
      //   ids.forEach(id => delete resources[id]);
      //   deb(" SCOUT: deleted ress: %s", ids);
      // },
      // nearestResource: function(item, types){
      //   var dis = 1e7, idres, distance, pos = Array.isArray(item) ? item : item.location();
      //   H.each(resources, function(id, res){
      //     types.forEach(function(type){
      //       if (res.found){
      //         if (res.specific === type.specific && res.generic === type.generic){
      //           // deb("SCOUT: nearestResource id: %s, dis: %s", idres, dis);
      //           distance = H.Map.distance(pos, res.position);
      //           if (distance < dis){
      //             idres = id; dis = distance;
      //           }
      //         }
      //       }
      //     });
      //   });
      //   return resources[idres] || undefined;
      // },
      scanAttacker: function (attacker){

        var [cx, cy] = H.Map.gamePosToMapPos(attacker.position),
            index    = H.Map.gamePosToMapIndex(attacker.position),
            radius   = ~~(attacker.range / cellsize),
            data = grid.data,
            x0   = ~~Math.max(0, cx - radius),
            y0   = ~~Math.max(0, cy - radius),
            x1   = ~~Math.min(width,  cx + radius),
            y1   = ~~Math.min(height, cy + radius),
            x = 0, y = y1, dx = 0, dy = 0, r2 = 0;

        if (H.contains(attackTiles, index)){
          deb(" SCOUT: ignored attacker at: %s", index);
          return;
        }

        while ( y-- > y0) {
          x = x1;
          while ( x-- > x0) {
            dx = x - cx; dy = y - cy;
            r2 = ~~Math.sqrt(dx * dx + dy * dy);
            if (r2 < radius){
              data[x + y * width] = data[x + y * width] | mHostile;
            }
          }
        }

      },
      hypot: function (x, y){

        var hyp = 0.0;

        if (cacheHypot[x] !== undefined && cacheHypot[x][y] !== undefined){
          return cacheHypot[x][y];
        } else {
          hyp = Math.sqrt(x * x + y * y);
          if (cacheHypot[x] === undefined){cacheHypot[x] = {};}
          return cacheHypot[x][y] = hyp;
        }

      },
      scan: function (selection){
        var t0  = Date.now(),
            ent = H.Entities[selection.resources[0]],
            [cx, cy] = H.Map.gamePosToMapPos(ent.position()),
            radius = ~~(ent.visionRange() / cellsize),
            dataObst  = H.Grids.obstruction.data,
            x0 = ~~Math.max(0, cx - radius),
            y0 = ~~Math.max(0, cy - radius),
            x1 = ~~Math.min(width,  cx + radius),
            y1 = ~~Math.min(height, cy + radius);
        
        this.scanLifted(grid.data, dataObst, cx, cy, x0, x1, y0, y1, radius, width); 
        // deb(" SCOUT: scan: %s msecs", Date.now() - t0); // ~1 msecs

      },     
      scanLifted: function(dataScout, dataObst, cx, cy, x0, x1, y0, y1, radius, width){

        var y = y1, x = 0, index = 0, hypot = self.hypot;

        while (y-- > y0) {
          x = x1;
          while (x-- > x0) {
            index = x + y * width;
            if (dataScout[index] === 0 && hypot(x - cx, y - cy) < radius){
              dataScout[index] = (
                (dataObst[index] === 0)   ? maskImpass :  //impassable
                (dataObst[index] === 255) ? maskLand :    // land
                (dataObst[index] === 201) ? maskShallow : // shallow
                (dataObst[index] === 200) ? maskWater :   // water
                (dataObst[index] >=   40  || dataObst[index] <= 49) ?  maskTrees : // trees
                (dataObst[index] ===  30) ? maskGeo :     // mines
                  deb("ERROR: Scout: obstruction with value: %s", dataObst[index])
              );
            }
          }
        }

      },      
      scanner: function (asset){

        // Object Factory

        var ent = H.Entities[asset.resources[0]],
            rng = ~~ent.visionRange() * 0.9,
            queueNow    = [],
            queueLater  = [],
            recentTiles = [],
            terrain = "land",
            pos2pointer = (pos) => {
              var [x, y] = [~~(pos[0]/cellsize), ~~(pos[1]/cellsize)];
              return x + y * width;
            };


        queueNow.push(ent.position());

        return {

          next: function(pos){

            var t0 = Date.now(), data = grid.data, treasures = [],
                sq, value, posTest, posNext, index,
                corners = [[-rng,-rng],[-rng,rng],[rng,rng],[rng,-rng]],
                pushUnique = H.HTN.Helper.pushUnique,
                isUnknown  = pos => {
                  return corners.some(sq => {
                    // with 1/sqrt2
                    var test = [~~(pos[0] + sq[0] * 0.7), ~~(pos[1] + sq[1] * 0.7)];
                    return data[pos2pointer(test)] === 0;
                  });
                },
                isHostile = index => {
                  return (data[index] & mHostile) !== 0;
                };

            // make resources in range visible, check for treasure
            H.each(resources, function(id, res){
              if (H.Map.distance(pos, res.position) < rng){
                res.found = true;
                deb(" SCOUT: found resource: %s, %s, id: %s", res.generic, res.supply, res.id);
                if (res.generic === "treasure"){
                  treasures.push(res.id);
                }
              }
            });


            for (sq of corners) {

              posTest = [~~(pos[0] + sq[0]), ~~(pos[1] + sq[1])];
              index   = pos2pointer(posTest);
              value   = data[pos2pointer(posTest)];

              if (H.contains(recentTiles, index)){
                continue;

              } else if (value === 0){
                pushUnique(posTest, queueNow);

              } else if (terrain === "land"  && (value & maskWater) !== 0) {
                pushUnique(posTest, queueLater);

              } else if (terrain === "water" && (value & maskLand)  !== 0) {
                pushUnique(posTest, queueLater);

              } else {
                // deb("ERROR: Scout.next: ignoring %s", value);

              }

            }

            deb(" SCOUT: len: %s, terrain: %s, last5: %s", 
              queueNow.length, terrain, queueNow.slice(-5)
            );

            while (queueNow.length){

              posNext = queueNow.pop();
              index   = pos2pointer(posNext);

              if (posNext[0] < 0 || ~~(posNext[0] / cellsize) > width || posNext[1] < 0 || ~~(posNext[1] / cellsize) > height)
                {deb(" SCOUT: ignored outside tile %s", index); continue;}

              if (H.contains(recentTiles, index))
                {deb(" SCOUT: ignored recent tile %s", index); continue;}

              if (isHostile(index))
                {deb(" SCOUT: ignored hostile tile %s", index); continue;}

              if (isUnknown(posNext)){
                recentTiles.push(index);
                recentTiles = recentTiles.slice(-40);
                // deb(" SCOUT: next: %s msecs", Date.now() - t0); < 0 msecs

                return !treasures.length ? {point: posNext, terrain: terrain} :
                  {point: posNext, terrain: terrain, treasures: treasures};
                
              } else {
                {deb(" SCOUT: ignored known tile %s", index); continue;}                
              }

            }

            if (queueLater.length){
              recentTiles = [];
              [queueNow, queueLater] = [queueLater, queueNow];
              terrain = (terrain === "land") ? "water" : "land";
              //TODO: clever sort on queueNow
              posNext = queueNow.pop();
              deb("  SCOUT: 3: now: %s, later: %s, terrain: %s", queueNow.length, queueLater.length, terrain);
              return {point: posNext, terrain: terrain, queue: queueNow};
            }

            // deb("   GRD: scout.next4: now: %s, later: %s", queueNow.length, queueLater.length);

            return {point: null, terrain: terrain};

          }

        };

      }

    };


  }()).boot();

return H; }(HANNIBAL));

