/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- S C A N N E R -----------------------------------------------

  keeps track of visited map regions (land/water), provides list of points to scan 
  and scans around a point for mines, treasure, (not trees) etc.

  tested with 0 A.D. Alpha 18 Rhododactylus
  V: 0.1.1, agentx, CGN, Mar, 2015

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

  // all instanciated scanner share the same map grid of visited region

  H.LIB.Scanner = function(context){

    H.extend(this, {

      context:  context,

      imports:  [
        "width",
        "height",
        "circular",
        "map",
        "entities", // visionRange, position
        "resources", // visionRange, position
      ],

      grids: {
        scanner: null,
        attacks: null,
      },

      grid: null,

    });

  };

  H.LIB.Scanner.prototype = H.mixin ( 
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Scanner,
    log: function(){},
    initialize: function(){
      this.grids.scanner = this.map.scanner;
      this.grids.attacks = this.map.attacks;
      return this;
    },
    dump: function (name, grid){grid.dump(name || "scouting", 255);},
    createDetector: function (position, vision){

      // Object Factory

      var 
        dataScan = this.grids.scanner.data, 
        dataAttk = this.grids.attacks.data, 
        cellsize = this.cellsize,
        width    = this.width / cellsize,
        posStart = position,
        rng      = ~~(vision * 0.9),
        corners  = [[-rng,-rng],[-rng,rng],[rng,rng],[rng,-rng]],

        queueNow    = [],
        queueLater  = [],
        recentTiles = [],
        terrain = "land",

        pushUnique  = H.HTN.Helper.pushUnique,

        pos2Index = pos => {
          var [x, y] = [~~(pos[0]/cellsize), ~~(pos[1]/cellsize)];
          return x >= 0 && y >= 0 ? x + y * width : null;
        },
        isInvalid   = pos => {
          var [x, y] = [~~(pos[0]/cellsize), ~~(pos[1]/cellsize)];
          return x < 0 || y < 0 || x >= this.grid.width || y >= this.grid.height;
        },
        isHostile = index => {
          return dataAttk[index] > 0;
        },
        isUnknown  = pos => {
          // unknown means a) valid and b) at least 1 corner unknown
          return corners.some(sq => {
            var test = [~~(pos[0] + sq[0] * 0.7), ~~(pos[1] + sq[1] * 0.7)]; // with 1/sqrt2
            if (isInvalid(test)){
              // deb("   SCT: isUnknown: %s, invalid", test);
              return false;
            } else if (dataScan[pos2Index(test)] === undefined){
              // deb("   SCT: isUnknown: %s, undefined", test);
              return false;
            } else if (dataScan[pos2Index(test)] !== 0) {
              // deb("   SCT: isUnknown: %s, known", test);
              return false;
            } else {
              // deb("   SCT: isUnknown: %s, !! unknown", test);
              return true;
            }
          });
        };




      queueNow.push(posStart);

      return {

        scan: function(pos){

          var 
            t0 = Date.now(), sq, value, posTest, posNext, index, out, 
            test = H.Resources.nearest(pos, "treasure"),
            treasures = test ? [test] : [];


          // TODO ask resources explicetly for treausre
          this.resources.markFound(pos, rng);

          // // make resources in range visible, check for treasure
          // H.each(resources, function(id, res){
          //   if (H.Map.distance(pos, res.position) < rng){
          //     res.found = true;
          //     deb(" SCOUT: found resource: %s, %s, id: %s", res.generic, res.supply, res.id);
          //     if (res.generic === "treasure"){
          //       treasures.push(res.id);
          //     }
          //   }
          // });


          for (sq of corners) {

            posTest = [~~(pos[0] + sq[0]), ~~(pos[1] + sq[1])];
            index   = pos2Index(posTest);
            value   = dataScan[pos2Index(posTest)];

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
            index   = pos2Index(posNext);

            // deb(" SCOUT: posNext: %s, index: %s", posNext, index);

            // if (
            //   posNext[0] < 0 || posNext[0] / cellsize > width || 
            //   posNext[1] < 0 || posNext[1] / cellsize > height
            //   ){
            //   deb(" SCOUT: ignored outside tile %s, x: %s, y: %s", index, posNext[0], posNext[1]); 
            //   continue;}

            if (H.contains(recentTiles, index)){
              deb(" SCOUT: ignored recent tile %s", index);
              continue;}

            if (isInvalid(posNext)){
              deb(" SCOUT: ignored invalid pos %s", posNext); 
              continue;}

            if (isHostile(index)){
              deb(" SCOUT: ignored hostile tile %s", index); 
              continue;}

            if (isUnknown(posNext)){
              // scout to investigate!
              recentTiles.push(index);
              recentTiles = recentTiles.slice(-40);
              // deb(" SCOUT: next: %s msecs", Date.now() - t0); < 0 msecs

              out = {point: posNext, terrain: terrain, treasures: treasures};
              deb(" SCOUT: next: %s", uneval(out));
              return out;
              
            } else {
              // deb(" SCOUT: ignored known tile %s", index); 
              continue;
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
  });

return H; }(HANNIBAL));


  // H.Scout = (function(){

  //   var 
  //     self, width, height, cellsize, circular, grid,
  //     attackTiles = [],
  //     mTrees      = 1 << 1, // 2
  //     mGeo        = 1 << 2,
  //     mShallow    = 1 << 3,
  //     mHostile    = 1 << 4, // 16
  //     maskLand    = 1 << 5,
  //     maskWater   = 1 << 6,
  //     maskImpass  = 1 << 7, // 128
  //     maskShallow = maskWater + mShallow,
  //     maskTrees   = maskLand  + mTrees,
  //     maskGeo     = maskLand  + mGeo,
  //     cacheHypot  = {};

  //   return {
  //     boot: function (){return (self = this);},
  //     dump: function (name){grid.dump(name || "scouting", 255);},
  //     init: function (){

  //       width    = H.Map.width;
  //       height   = H.Map.height;
  //       cellsize = H.Map.cellsize;
  //       circular = H.Map.circular;
  //       grid     = new H.Grid(width, height, 8);

  //       H.Grids.register("scouting", grid);

  //     },
  //     scanAttacker: function (attacker){

  //       var 
  //         data = grid.data,
  //         [cx, cy] = H.Map.gamePosToMapPos(attacker.position),
  //         index    = H.Map.gamePosToMapIndex(attacker.position),
  //         radius   = ~~(attacker.range / cellsize),
  //         x0   = ~~Math.max(0, cx - radius),
  //         y0   = ~~Math.max(0, cy - radius),
  //         x1   = ~~Math.min(width,  cx + radius),
  //         y1   = ~~Math.min(height, cy + radius),
  //         x = 0, y = y1, dx = 0, dy = 0, r2 = 0;

  //       if (H.contains(attackTiles, index)){
  //         deb(" SCOUT: ignored attacker at: %s", index);
  //         return;
  //       }

  //       while ( y-- > y0) {
  //         x = x1;
  //         while ( x-- > x0) {
  //           dx = x - cx; dy = y - cy;
  //           r2 = ~~Math.sqrt(dx * dx + dy * dy);
  //           if (r2 < radius){
  //             data[x + y * width] = data[x + y * width] | mHostile;
  //           }
  //         }
  //       }

  //     },
  //     hypot: function (x, y){

  //       var hyp = 0.0;

  //       if (cacheHypot[x] !== undefined && cacheHypot[x][y] !== undefined){
  //         return cacheHypot[x][y];
  //       } else {
  //         hyp = Math.sqrt(x * x + y * y);
  //         if (cacheHypot[x] === undefined){cacheHypot[x] = {};}
  //         return (cacheHypot[x][y] = hyp);
  //       }

  //     },
  //     scan: function (selection){

  //       var 
  //         ent = H.Entities[selection.resources[0]],
  //         [cx, cy] = H.Map.mapPosToGridPos(ent.position()),
  //         radius = ~~(ent.visionRange() / cellsize),
  //         dataObst  = H.Grids.obstruction.data,
  //         x0 = ~~Math.max(0, cx - radius),
  //         y0 = ~~Math.max(0, cy - radius),
  //         x1 = ~~Math.min(width,  cx + radius),
  //         y1 = ~~Math.min(height, cy + radius);
        
  //       this.scanLifted(grid.data, dataObst, cx, cy, x0, x1, y0, y1, radius, width); 

  //     },     
  //     scanLifted: function(dataScout, dataObst, cx, cy, x0, x1, y0, y1, radius, width){

  //       var y = y1, x = 0, index = 0, hypot = self.hypot;

  //       while (y-- > y0) {
  //         x = x1;
  //         while (x-- > x0) {
  //           index = x + y * width;
  //           if (dataScout[index] === 0 && hypot(x - cx, y - cy) < radius){
  //             dataScout[index] = (
  //               (dataObst[index] === 0)   ? maskImpass :  //impassable
  //               (dataObst[index] === 255) ? maskLand :    // land
  //               (dataObst[index] === 201) ? maskShallow : // shallow
  //               (dataObst[index] === 200) ? maskWater :   // water
  //               (dataObst[index] >=   40  || dataObst[index] <= 49) ?  maskTrees : // trees
  //               (dataObst[index] ===  30) ? maskGeo :     // mines
  //                 deb("ERROR: Scout: obstruction with value: %s", dataObst[index])
  //             );
  //           }
  //         }
  //       }

  //     },      
  //     createDetector: function (position, vision){

  //       // Object Factory

  //       var 
  //         data = grid.data, 
  //         posStart = position,
  //         rng      = ~~(vision * 0.9),
  //         corners  = [[-rng,-rng],[-rng,rng],[rng,rng],[rng,-rng]],

  //         queueNow    = [],
  //         queueLater  = [],
  //         recentTiles = [],
  //         terrain = "land",

  //         pushUnique  = H.HTN.Helper.pushUnique,

  //         pos2Index = pos => {
  //           var [x, y] = [~~(pos[0]/cellsize), ~~(pos[1]/cellsize)];
  //           return x >= 0 && y >= 0 ? x + y * width : null;
  //         },
  //         isInvalid   = pos => {
  //           var [x, y] = [~~(pos[0]/cellsize), ~~(pos[1]/cellsize)];
  //           return x < 0 || y < 0 || x >= grid.width || y >= grid.height;
  //         },
  //         isHostile = index => {
  //           return (data[index] & mHostile) !== 0;
  //         },
  //         isUnknown  = pos => {
  //           // unknown means a) valid and b) at least 1 corner unknown
  //           return corners.some(sq => {
  //             var test = [~~(pos[0] + sq[0] * 0.7), ~~(pos[1] + sq[1] * 0.7)]; // with 1/sqrt2
  //             if (isInvalid(test)){
  //               // deb("   SCT: isUnknown: %s, invalid", test);
  //               return false;
  //             } else if (data[pos2Index(test)] === undefined){
  //               // deb("   SCT: isUnknown: %s, undefined", test);
  //               return false;
  //             } else if (data[pos2Index(test)] !== 0) {
  //               // deb("   SCT: isUnknown: %s, known", test);
  //               return false;
  //             } else {
  //               // deb("   SCT: isUnknown: %s, !! unknown", test);
  //               return true;
  //             }
  //           });
  //         };


  //       deb(" SCOUT: Scanner: pos: %s, rng: %s, ent: %s", posStart, rng, ent._templateName);


  //       queueNow.push(posStart);

  //       return {

  //         scan: function(pos){

  //           var 
  //             t0 = Date.now(), sq, value, posTest, posNext, index, out, 
  //             test = H.Resources.nearest(pos, "treasure"),
  //             treasures = test ? [test] : [];


  //           H.Resources.markFound(pos, rng);

  //           // // make resources in range visible, check for treasure
  //           // H.each(resources, function(id, res){
  //           //   if (H.Map.distance(pos, res.position) < rng){
  //           //     res.found = true;
  //           //     deb(" SCOUT: found resource: %s, %s, id: %s", res.generic, res.supply, res.id);
  //           //     if (res.generic === "treasure"){
  //           //       treasures.push(res.id);
  //           //     }
  //           //   }
  //           // });


  //           for (sq of corners) {

  //             posTest = [~~(pos[0] + sq[0]), ~~(pos[1] + sq[1])];
  //             index   = pos2Index(posTest);
  //             value   = data[pos2Index(posTest)];

  //             if (H.contains(recentTiles, index)){
  //               continue;

  //             } else if (value === 0){
  //               pushUnique(posTest, queueNow);

  //             } else if (terrain === "land"  && (value & maskWater) !== 0) {
  //               pushUnique(posTest, queueLater);

  //             } else if (terrain === "water" && (value & maskLand)  !== 0) {
  //               pushUnique(posTest, queueLater);

  //             } else {
  //               // deb("ERROR: Scout.next: ignoring %s", value);

  //             }

  //           }

  //           deb(" SCOUT: len: %s, terrain: %s, last5: %s", 
  //             queueNow.length, terrain, queueNow.slice(-5)
  //           );

  //           while (queueNow.length){

  //             posNext = queueNow.pop();
  //             index   = pos2Index(posNext);

  //             // deb(" SCOUT: posNext: %s, index: %s", posNext, index);

  //             // if (
  //             //   posNext[0] < 0 || posNext[0] / cellsize > width || 
  //             //   posNext[1] < 0 || posNext[1] / cellsize > height
  //             //   ){
  //             //   deb(" SCOUT: ignored outside tile %s, x: %s, y: %s", index, posNext[0], posNext[1]); 
  //             //   continue;}

  //             if (H.contains(recentTiles, index)){
  //               deb(" SCOUT: ignored recent tile %s", index);
  //               continue;}

  //             if (isInvalid(posNext)){
  //               deb(" SCOUT: ignored invalid pos %s", posNext); 
  //               continue;}

  //             if (isHostile(index)){
  //               deb(" SCOUT: ignored hostile tile %s", index); 
  //               continue;}

  //             if (isUnknown(posNext)){
  //               // scout to investigate!
  //               recentTiles.push(index);
  //               recentTiles = recentTiles.slice(-40);
  //               // deb(" SCOUT: next: %s msecs", Date.now() - t0); < 0 msecs

  //               out = {point: posNext, terrain: terrain, treasures: treasures};
  //               deb(" SCOUT: next: %s", uneval(out));
  //               return out;
                
  //             } else {
  //               // deb(" SCOUT: ignored known tile %s", index); 
  //               continue;
  //             }

  //           }

  //           if (queueLater.length){
  //             recentTiles = [];
  //             [queueNow, queueLater] = [queueLater, queueNow];
  //             terrain = (terrain === "land") ? "water" : "land";
  //             //TODO: clever sort on queueNow
  //             posNext = queueNow.pop();
  //             deb("  SCOUT: 3: now: %s, later: %s, terrain: %s", queueNow.length, queueLater.length, terrain);
  //             return {point: posNext, terrain: terrain, queue: queueNow};
  //           }

  //           // deb("   GRD: scout.next4: now: %s, later: %s", queueNow.length, queueLater.length);

  //           return {point: null, terrain: terrain};

  //         }

  //       };

  //     }

  //   };


  // }()).boot();

