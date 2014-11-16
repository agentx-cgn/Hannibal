/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, HANNIBAL, Uint8Array, Uint32Array, deb, logObject */

/*--------------- G R I D S ---------------------------------------------------

  An API onto UintArrays, used for map analysis, path finding, attack planning
  includes cosmetical rewritten functions from API3



  V: 1.1, agentx, CGN, Feb, 2014

*/

// Grids at tick = 5 / took 73 msecs
// food        min: 0,   max: 255,  stats: {0:64895,1:1,2:25,3:28,4:30,6:89,8:1,9:159,10:2,11:4,12:6,13:10,15:37,244:1,247:2,250:6,252:2,254:2,255:236}
// wood        min: 0,   max: 255,  stats: {0:63838,3:1,4:214,5:1,8:106,10:1,11:2,12:78,13:3,14:10,15:1,16:86,18:6,19:10,20:70,23:6,24:187,28:167,32:17,36:16,40:13,44:21,48:27,52:16,56:9,60:9,64:11,68:19,72:12,76:12,80:11,84:14,88:10,92:11,96:8,100:11,104:11,108:12,112:10,116:11,120:5,124:12,127:1,128:7,131:1,132:10,136:12,139:1,140:9,141:1,143:1,144:8,146:1,147:2,148:5,151:1,152:8,153:1,156:5,157:1,159:1,160:8,163:1,164:6,167:3,168:2,172:9,176:8,178:2,180:7,183:5,184:7,186:1,187:1,188:3,189:1,192:8,194:1,195:2,196:3,198:1,199:2,200:2,201:1,203:2,204:4,205:1,206:3,207:2,208:2,209:1,210:2,211:1,212:3,215:1,216:2,218:3,219:2,220:2,222:2,223:1,224:9,225:1,227:2,228:3,229:1,230:4,231:2,232:6,234:2,235:2,236:3,237:3,238:2,239:3,240:5,241:1,242:1,244:1,247:2,248:1,249:2,252:3,253:1,254:3,255:184}
// stone       min: 0,   max: 7,    stats: {0:65244,1:4,2:28,4:8,5:104,6:100,7:48}
// metal       min: 0,   max: 7,    stats: {0:65244,1:4,2:28,4:8,5:104,6:100,7:48}
// territory   min: 0,   max: 66,   stats: {0:60261,65:2624,66:2651}
// passability min: 255, max: 4223, stats: {4223:16456,4136:46753,4156:829,4128:81,4148:94,4132:47,4100:32,4116:426,4124:28,4138:313,4139:477}
// obstruction min: 0,   max: 255,  stats: {0:17379,40:125,41:65,42:44,43:17,44:33,45:16,46:20,47:13,48:4,49:7,200:454,201:32,255:47327}
// landPass    min: 1,   max: 8,    stats: {1:17833,2:47575,4:9,5:6,6:2,7:1,8:110}
// navalPass   min: 1,   max: 3,    stats: {1:65050,3:486}
// attacks     min: 0,   max: 0,    stats: {0:65536}
// scouting    min: 0,   max: 0,    stats: {0:65536}


HANNIBAL = (function(H){

  var t0, width, height, length, cellsize, center = [],
      maskOpen,
      maskWater,
      maskLand,
      maskShore,
      maskBldgLand,
      maskBldgShore,
      maskFoundation,
      maskPathfinder,
      square  = [[-1,-1],[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1],[0,0]],
      square0 = [[-1,-1],[-1,1],[1,-1],[1,1]],
      square2 = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1],
                 [0,2],[0,-2],[2,0],[-2,0],[2,2],[-2,-2],[2,-2],[-2,2]],

      grids = {
        topo: null,           // if avail
        pass: null,           // water, land, forbidden, shallow, steep
        terr: null,           // internal terrain code
        cost: null,           // pathinder cost arond water and hills
        regw: null,           // connected regions on water
        regl: null,           // connected regions on land
        food: null,
        wood: null,
        stone: null,
        metal: null,
        terrain: null,       
        territory: null,
        passability: null,   // Uint16Array 
        obstruction: null,   // Trees, Geology
        landPass: null,
        navalPass: null,
        attacks: null,
        scouting: null,
      };


  function dump(name, grid, threshold){
    threshold = threshold || grid.max() || 255;
    name = H.format("%s-%s.png", name, threshold);
    Engine.DumpImage(name, grid.data, grid.width, grid.height, threshold);    
    deb("  GRID: dumping %s, w: %s, h: %s, t: %s", name, grid.width, grid.height, threshold);
  }

  function pritp(where){
    return where.map(c => c.toFixed(1));
  }
  function pritn(num){
    return num.toFixed(1);
  }

  // function mapPosToGridPos(p){return [~~(p[0] / cellsize), ~~(p[1] / cellsize)];}

  function gridFromMap(map){
    var grid;
    if (map instanceof Uint8Array){
      grid = new H.Grid(width, height, 8);
      grid.data = map;
    } else if (map.data){
      grid = new H.Grid(map.width, map.height, 8);
      grid.data = map.data;
    } else if (map.map instanceof Uint8Array){
      grid = new H.Grid(map.width, map.height, 8);
      grid.data = map.map;
    } else {
      deb(" ERROR: gridFromMap: can't handle map");
      // logObject(map, "gridFromMap.map");
    }
    return grid;
  }

  function fnBody(fn){
    
    var body, source = fn.toString();
    
    if (source.indexOf("return") !== -1){
      body = source.slice(source.indexOf("return") + 6, source.lastIndexOf("}")).trim();
      
    } else if (source.indexOf("=>") !== -1){
       body = source.slice(source.indexOf("=>") + 2).trim();
      
    } else {
      throw "can't handle that";
    }
    
    return body;
    
  }

  // self.landPass    = gridFromMap(H.GameState.sharedScript.accessibility.landPassMap);
  // self.navalPass   = gridFromMap(H.GameState.sharedScript.accessibility.navalPassMap);
  // self.passability = gridFromMap(H.SharedScript.passabilityMap);
  // self.territory   = gridFromMap(H.Bot.gameState.ai.territoryMap);
  // self.food        = gridFromMap(H.SharedScript.resourceMaps.food);
  // self.wood        = gridFromMap(H.SharedScript.resourceMaps.wood);
  // self.stone       = gridFromMap(H.SharedScript.resourceMaps.stone);
  // self.metal       = gridFromMap(H.SharedScript.resourceMaps.metal);
  // self.obstruction = obstructions();

  // self.attacks  = new H.Grid(width, height, 8);
  // self.pass     = new H.Grid(width, height, 8);
  // self.topo     = new H.Grid(width, height, 8);

  // deb();deb();
  // deb("  GRID: init w: %s, h: %s, cellsize: %s", width, height, cellsize);

  /*
    
    handles the grids in use
    works in Explorer (browser) and in 0 A.D (jsshell)

  */


  H.Grids = (function(){

    var 
      self = {},
      isBrowser = false, topoBuffer, passImage;

    H.extend(self, grids, {
      center: center,
      register: function(name, grid){grids[name] = grid;},
      initExtern: function(size, buffer, image){
        isBrowser  = true;
        width      = self.width    = size; 
        height     = self.height   = size;
        length     = self.length   = width * height;
        cellsize   = self.cellsize = 4;      
        center[0]  = ~~(width  / 2);
        center[1]  = ~~(height / 2);
        topoBuffer = buffer;
        passImage  = image;
      },
      init: function(){

        width     = self.width    = H.SharedScript.passabilityMap.width;
        height    = self.height   = H.SharedScript.passabilityMap.height;
        length    = self.length   = width * height;
        cellsize  = self.cellsize = H.GameState.cellSize;
        center[0] = ~~(width  / 2);
        center[1] = ~~(height / 2);

        self.passability = gridFromMap(H.SharedScript.passabilityMap);
        self.territory   = gridFromMap(H.Bot.gameState.ai.territoryMap);
        self.attacks     = new H.Grid(width, height, 8);

        self.initMasks();  
        self.initTopo();  
        self.initPass();  
        self.initProp();  
        self.initTerrain();  
        self.initCost();  
        self.initRegionsLand();  
        self.initRegionsWater();  
      },
      initMasks: function(){
        // http://trac.wildfiregames.com/wiki/AIEngineAPI
        var pc = H.SharedScript && H.SharedScript.passabilityClasses ? H.SharedScript.passabilityClasses : undefined;
        maskPathfinder  = pc ? pc["pathfinderObstruction"] :  1;
        maskFoundation  = pc ? pc["foundationObstruction"] :  2;
        maskBldgLand    = pc ? pc["building-land"]         :  4;
        maskBldgShore   = pc ? pc["building-shore"]        :  8;
        maskLand        = pc ? pc["default"]               : 16;
        maskWater       = pc ? pc["ship"]                  : 32;
        maskOpen        = pc ? pc["unrestricted"]          : 64;
        maskShore       = maskBldgShore | maskFoundation;    // 1
      },
      initTopo: function(){

        var i, h, off, idx, x, y, len, iwidth = width +1, max = 0, min = 10e7;

        self.topo = new H.Grid(width, height, 8);

        if (isBrowser){

          len = (iwidth) * (iwidth);
          
          for (i=0, off=16; i<len; i++, off+=2) {
            x = i % iwidth; y = ~~(i/iwidth);
            if (x < width && y < height){
              idx = (width - y) * width + x;
              h = topoBuffer.getUint16(off, true) >> 8;
              self.topo.data[idx] = h;
              max = h > max ? h : max;
              min = h < min ? h : min;
            }
          }
          i = length; while(i--){
            h = H.scale(self.topo.data[i], min, max, 0, 220);
            self.topo.data[i] = h;
          }

        } else {
          for (i=0; i<length; i++){
            self.topo.data[i] = self.passability.data[i] >> 8; 
          }

        }

      },
      initPass: function(){

        var i, cvs, ctx, source;

        self.pass = new H.Grid(width, height, 8);

        if (isBrowser){

          cvs = document.createElement("canvas");
          cvs.width = cvs.height = width;
          ctx = cvs.getContext("2d");
          ctx.drawImage(passImage, 0, 0, width, width, 0, 0, width, width);
          source = ctx.getImageData(0, 0, width, width).data;

          for (i=0; i<length *4; i+=4) {
            self.pass.data[i >> 2] = source[i];
          }

        } else {

          for (i=0; i<length; i++){
            self.pass.data[i] = self.passability.data[i] >> 0; 
          }

        }

      },
      initProp: function(){

        if (isBrowser){

          self.prop = new H.Grid(width, height, 8);

        } else {

          self.prop = gridFromMap(H.Bot.gameState.ai.territoryMap);

        }


      },
      initCost: function(){

        var 
          i = length, maskCost = 8 + 16 + 32 + 64,
          grdTemp = new H.Grid(width, height, 8);

        while(i--){
          grdTemp.data[i] = self.terr.data[i] & maskCost ? 255 : 0;
        }
        self.cost = grdTemp.blur(3);

      },
      initTrees: function(){
        // var i = length, s, t;
        self.tree = new H.Grid(width, height, 8);
      },
      initTerrain: function(){

        // pathfinderObstruction:1, 
        // foundationObstruction:2, trees, mines
        // building-land:4, 
        // building-shore:8, 
        // default:16, 
        // ship:32, 
        // unrestricted:64

        var i = length, s, t;

        self.terr = new H.Grid(width, height, 8);

        while(i--){

          s = self.pass.data[i];
          t = (
             (s &  1)                             ?   0 : //  dark red : pathfinder obstruction forbidden
             (s & 16) && !(s & 32) &&   (s & 64) ?   4 : //  land
            !(s & 16) && !(s & 32) &&   (s & 64) ?   8 : //  shallow
            !(s & 16) && !(s & 32) &&  !(s & 64) ?  16 : //  mixed
            !(s & 16) &&  (s & 32) &&  !(s & 64) ?  32 : //  deep water
             (s & 16) &&  (s & 32) &&  !(s & 64) ?  32 : //  deep steep water, check with Azure Coast
             (s & 16) &&  (s & 32) &&   (s & 64) ?  64 : //  red : land too steep
            !(s & 16) &&  (s & 32) &&   (s & 64) ?  64 : //  red : land also too steep
              255                                          // error
          );
          self.terr.data[i] = t;

        }

      },
      initRegionsLand: function(){

        var r, t, i = length, cntLand = 0, maskLand = 16 + 8 + 4;

        self.regl = new H.Grid(width, height, 8);

        while (i--) {
          t = self.terr.data[i]; 
          r = self.regl.data[i];
          if (r === 0 && ( t & maskLand) ) {
            H.Grids.fillRegion(self.terr.data, self.regl.data, maskLand, i, ++cntLand);
          }
        }

        self.regl.regions = cntLand;

      },
      initRegionsWater: function(){

        var r, t, i = length, cntWater = 0, maskWater = 16 + 32;

        self.regw = new H.Grid(width, height, 8);

        while (i--) {
          t = self.terr.data[i]; 
          r = self.regw.data[i];
          if (r === 0 && ( t & maskWater ) ) {
            H.Grids.fillRegion(self.terr.data, self.regw.data, maskWater, i, ++cntWater);
          }
        }

        self.regw.regions = cntWater;

      },
      fillRegion: function(src, tgt, mask, index, region){

        var 
          i, idx, nextX, nextY,
          y = ~~(index / width) | 0,
          x = index % width | 0,
          stack = [x, y], pointer = 2, // push/pop is too slow
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

      },      
      tick: function(secs){

        var t0 = Date.now();
        maskPathfinder  = H.SharedScript.passabilityClasses["pathfinderObstruction"] | 0;    // 1

        self.food        = gridFromMap(H.SharedScript.resourceMaps.food);
        self.wood        = gridFromMap(H.SharedScript.resourceMaps.wood);
        self.stone       = gridFromMap(H.SharedScript.resourceMaps.stone);
        self.metal       = gridFromMap(H.SharedScript.resourceMaps.metal);
        self.territory   = gridFromMap(H.Bot.gameState.ai.territoryMap);
        self.obstruction = obstructions();

        self.attacks.divVal(H.Config.attackRelax);

        return Date.now() - t0;

      },
      analyzePoint: function(x, y){
        var data = self.obstruction.data;
        return (
          (data[x + y * width]  === 0)   ? 255 :
          (data[x + y * width]  === 255) ?  32 :
          (data[x + y * width]  === 200) ? 128 :
            200
        );
      },
      analyzeLifted: function(dataScout, dataObst, x0, x1, y0, y1, cx, cy, radius, width){

        var y = 0, x = 0, index = 0, dx = 0, dy = 0, r2 = 0;

        for ( y = y0; y < y1; ++y) {
          for ( x = x0; x < x1; ++x) {
            dx = x - cx; dy = y - cy;
            r2 = ~~Math.sqrt(dx * dx + dy * dy);
            index = x + y * width;
            if (dataScout[index] === 0 && r2 < radius){
              dataScout[index] = (
                (dataObst[index] === 0)   ? 255 :
                (dataObst[index] === 255) ?  32 :
                (dataObst[index] === 200) ? 128 :
                  200
              );
            }
          }
        }

      },
      record: function(what, where, amplitude){

        deb("  GRDS: record: what: %s, where: %s, amp: %s", what, pritp(where), pritn(amplitude));

        var [x, y] = where;

        x = ~~(x/cellsize); y = ~~(y/cellsize);
        
        if (what === "attacks"){
          self.attacks.data[x + y * width] += amplitude;

        } else if (what === "scouting") {
          self.scouting.data[x + y * width] += amplitude;

        }


      },

      log: function(){
        var t0 = Date.now();
        deb("  GRDS: logging ------------");
        H.each(grids, function(name){
          if (self[name]){
            self[name].log(name);
          } else {
            deb("  GRDS: grid %s doesn't exist", name);
          }
        });
        deb("  GRDS: logging %s msecs ------------", Date.now() - t0);
      },
      dump: function(prefix){
        H.each(grids, function(grid){
          var name = prefix ? prefix + "-" + grid : grid;
          if (self[grid]){dump(name, self[grid]);}
        });
      }

    });

    return self;


  }());

  H.Grid = function (width, height, bits){

    // subarray, set, move, length, byteOffset, byteLength, buffer

    this.width  = width  || 0; 
    this.height = height || 0;
    this.length = width * height;
    this.bits   = bits;
    this.data   = (
      this.bits ===  8 ? new Uint8ClampedArray(width * height) :
      this.bits === 32 ? new Uint32Array(width * height) : 
        new Uint8Array(width * height) //??
    );

  };

  // function(a, b, c, op){
  //   var body = "";
  //   body += "var i = " + a.length + ";";
  //   body += "while (i--) { c[i] = " + op + ";}";
  //   Function("a", "b", "c", body)(a, b, c);
  // }

  H.Grid.prototype = {
    constructor: H.Grid,
    dump: function(name, threshold){
      Engine.DumpImage(name || "default.png", this.data, this.width, this.height, threshold || this.maxVal);
    },
    log: function(name){
      var stats = {},i = this.length,data = this.data;
      while (i--){stats[data[i]] = stats[data[i]] ? stats[data[i]] +1 : 1;}
      deb("   GRD: log: %s min: %s, max: %s, stats: %s", name || ">", this.min(), this.max(), H.prettify(stats));
    },    
    max:     function(){var m=0,  g=this.data,l=this.length;while(l--){m=(g[l]>m)?g[l]:m;}return m;},
    min:     function(){var m=255,g=this.data,l=this.length;while(l--){m=(g[l]<m)?g[l]:m;}return m;},
    // all destructive
    setVal:  function(val){var g=this.data,l=this.length;while(l--){g[l]  = val;}return this;},
    addVal:  function(val){var g=this.data,l=this.length;while(l--){g[l] += val;}return this;}, //check Math.imul
    mulVal:  function(val){var g=this.data,l=this.length;while(l--){g[l] *= val;}return this;},
    divVal:  function(val){var g=this.data,l=this.length;while(l--){g[l] /= val;}return this;},
    addGrid: function(grd){var g=this.data,l=this.length;while(l--){g[l] += grd[l];}return this;},
    copyData: function(){
      return (
        this.bits ===  8 ? new Uint8ClampedArray(this.data.buffer.slice()) : 
        this.bits === 32 ? new Uint32Array(this.data.buffer.slice()) : 
          new Uint8Array(this.data.buffer.slice())
      );
    },
    copy: function(){
      var cp = new H.Grid(this.width, this.height, this.bits);
      cp.data = (
        this.bits ===  8 ? new Uint8ClampedArray(this.data.buffer.slice()) : 
        this.bits === 32 ? new Uint32Array(this.data.buffer.slice()) : 
          new Uint8Array(this.data.buffer.slice())
      );
      return cp;
    },
    process: function(target, fn){

      var body = "", proc = fnBody(fn);
      
      body += "var i = " + this.length + ";";
      body += "while (i--) { t[i] = " + proc + "}";

      Function("s", "t", body)(this.data, target.data);  

    },
    render: function (cvs, alpha=255, nozero=true){

      // greyscales grid in imagedata of canvas

      var
        i, p, c, image, target, source,
        len = width * width,
        ctx = cvs.getContext("2d");

      // alpha = alpha !== undefined ? alpha : 255;
      cvs.width = cvs.height = width;
      image  = ctx.getImageData(0, 0, width, width);
      target = image.data;
      source = this.data;

      for (i=0; i<len; i++){
        c = source[i];
        p = i * 4; 
        target[p] = target[p + 1] = target[p + 2] = c;
        target[p + 3] = nozero && !c ? 0 : alpha;
      }
      
      ctx.putImageData(image, 0, 0);

    },
    mark: function(){},
    blur: function (radius){

      // http://blog.ivank.net/fastest-gaussian-blur.html

      var temp = [], target = new H.Grid(width, width, 8);
      boxBlur_4(this.data, temp, width, height, radius);
      target.data = new Uint8ClampedArray(temp);
      // return target; // stupid SM

      function boxBlur_4 (scl, tcl, w, h, r) {
          for(var i=0; i<scl.length; i++) {
            tcl[i] = scl[i];
          }
          boxBlurH_4(tcl, scl, w, h, r);
          boxBlurT_4(scl, tcl, w, h, r);
      }
      function boxBlurH_4 (scl, tcl, w, h, r) {

          var i, j, ti, li, ri, fv, lv, val, iarr = 1 / (r+r+1);

          for (i=0; i<h; i++) {

              ti = i*w; li = ti; ri = ti+r;
              fv = scl[ti]; lv = scl[ti+w-1]; val = (r+1)*fv;

              for(j=0; j<r; j++) {
                val += scl[ti+j];
              }
              for(j=0  ; j<=r ; j++) { 
                val += scl[ri++] - fv;   
                tcl[ti++] = Math.round(val*iarr); 
              }
              for(j=r+1; j<w-r; j++) { 
                val += scl[ri++] - scl[li++];   
                tcl[ti++] = Math.round(val*iarr); 
              }
              for(j=w-r; j<w  ; j++) { 
                val += lv        - scl[li++];   
                tcl[ti++] = Math.round(val*iarr); 
              }
          }
      }
      function boxBlurT_4 (scl, tcl, w, h, r) {

          var i, j, ti, li, ri, fv, lv, val, iarr = 1 / (r+r+1);

          for(i=0; i<w; i++) {

              ti = i; li = ti; ri = ti+r*w;
              fv = scl[ti]; lv = scl[ti+w*(h-1)]; val = (r+1)*fv;

              for(j=0; j<r; j++) {
                val += scl[ti+j*w];
              }
              for(j=0  ; j<=r ; j++) { 
                val += scl[ri] - fv     ;  
                tcl[ti] = Math.round(val*iarr);  ri+=w; ti+=w; 
              }
              for(j=r+1; j<h-r; j++) { 
                val += scl[ri] - scl[li];  
                tcl[ti] = Math.round(val*iarr);  li+=w; ri+=w; ti+=w; 
              }
              for(j=h-r; j<h  ; j++) { 
                val += lv      - scl[li];  
                tcl[ti] = Math.round(val*iarr);  li+=w; ti+=w; 
              }
          }

      }

      return target;

    },
    // searchSpiral: function (xs, ys, expression){

    //   // http://stackoverflow.com/questions/3330181/algorithm-for-finding-nearest-object-on-2d-grid

    //   var d, x, y,
    //       maxDistance = xs < width/2  ? width  - xs : xs,
    //       checkIndex  = new Function("grid", "i", "return grid.data[i] " + expression + ";"),
    //       checkPoint  = function(x, y){
    //         if (x > 0 && y > 0 && x <= width && y <= height){
    //           return checkIndex(this, x + y * width);
    //         } else {return undefined;}
    //       };

    //   if (checkPoint(xs, ys)){return [xs, ys];}

    //   for (d = 0; d<maxDistance; d++){
    //     for (x = xs-d; x < xs+d+1; x++){
    //       // Point to check: (x, ys - d) and (x, ys + d) 
    //       if (checkPoint(x, ys - d)){return [x, ys - d];}
    //       if (checkPoint(x, ys + d)){return [x, ys - d];}
    //     }
    //     for (y = ys-d+1; y < ys+d; y++)          {
    //       // Point to check = (xs - d, y) and (xs + d, y) 
    //       if (checkPoint(x, ys - d)){return [xs - d, y];}
    //       if (checkPoint(x, ys + d)){return [xs - d, y];}
    //     }
    //   }

    // },
    findBestTile: function(radius, obstruction){
      
      // Find the best non-obstructed tile
      
      var bestIdx = 0,
          bestVal = -1,
          data = this.data,
          obst = obstruction.data,
          i = this.length;

      while (i--) {
        if (obst[i] > radius && data[i] > bestVal){
          bestVal = data[i];
          bestIdx = i;
      }} return [bestIdx, bestVal];

    },
    findLowestNeighbor: function(posX, posY) {

      // returns the point with the lowest radius in the immediate vicinity

      var data  = this.data,
          lowestPt = [0, 0],
          lowestCf = 99999,
          x = ~~(posX / 4),
          y = ~~(posY / 4),
          xx = 0, yy = 0;

      for (xx = x -1; xx <= x +1; ++xx){
        for (yy = y -1; yy <= y +1; ++yy){
          if (xx >= 0 && xx < width && yy >= 0 && yy < width){
            if (data[xx + yy * width] <= lowestCf){
              lowestCf = data[xx + yy * width];
              lowestPt = [(xx + 0.5) * 4, (yy + 0.5) * 4];
      }}}} return lowestPt;

    },
    sumInfluence: function(cx, cy, radius){

      var data  = this.data,
          x0 = Math.max(0, cx - radius),
          y0 = Math.max(0, cy - radius),
          x1 = Math.min(width,  cx + radius),
          y1 = Math.min(height, cy + radius),
          radius2 = radius * radius,
          sum = 0, y, x, r2, dx, dy;
      
      for ( y = y0; y < y1; ++y) {
        for ( x = x0; x < x1; ++x) {
          dx = x - cx;
          dy = y - cy;
          r2 = dx*dx + dy*dy;
          if (r2 < radius2){
            sum += data[x + y * width];

      }}} return sum;

    },
    addInfluence: function(cx, cy, maxDist, strength, type) {

      var data = this.data, width = this.width, height = this.height,
          maxDist2 = maxDist * maxDist,
          r = 0.0, x = 0, y = 0, dx = 0, dy = 0, r2 = 0,
          x0 = ~~(Math.max(0, cx - maxDist)),
          y0 = ~~(Math.max(0, cy - maxDist)),
          x1 = ~~(Math.min(width  -1, cx + maxDist)),   //??
          y1 = ~~(Math.min(height -1, cy + maxDist)),
          str = (
            type === "linear"    ? (strength || maxDist) / maxDist  :
            type === "quadratic" ? (strength || maxDist) / maxDist2 :
              strength
          ),
          fnQuant = ( 
            type === "linear"    ? (r) => str * (maxDist  - Math.sqrt(r)) :
            type === "quadratic" ? (r) => str * (maxDist2 - r) : 
              () => str
          );

      for ( y = y0; y < y1; ++y) {
        for ( x = x0; x < x1; ++x) {
          dx = x - cx; 
          dy = y - cy; 
          r2 = dx * dx + dy * dy;
          if (r2 < maxDist2) {
            data[x + y * width] += fnQuant(r2);

      }}}

    },
    /**
     * Make each cell's 16-bit/8-bit value at least one greater than each of its
     * neighbours' values. (If the grid is initialised with 0s and 65535s or 255s, the
     * result of each cell is its Manhattan distance to the nearest 0.)
     */
    expand: function(data, x, y, w, min, max) {
      // lifted
      var g = data[x + y * w];
      if (g > min){data[x + y * w] = min;}
      else if (g < min){min = g;}
      if (++min > max){min = max;}
      return min;
    },
    expandInfluences: function(maximum) {

      var data = this.data, expand = this.expand,
          w = width, h = height,
          x = 0, y = 0, min = 0, max = maximum || 255;

      for ( y = 0; y < h; ++y) {
        min = max;
        for ( x = 0;     x <  w; ++x) {min = expand(data, x, y, w, min, max);}
        for ( x = w - 2; x >= 0; --x) {min = expand(data, x, y, w, min, max);}
      }
      for ( x = 0; x < w; ++x) {
        min = max;
        for ( y = 0;     y <  h; ++y) {min = expand(data, x, y, w, min, max);}
        for ( y = h - 2; y >= 0; --y) {min = expand(data, x, y, w, min, max);}
      }

    },
    // Returns an estimate of a tile accessibility. It checks neighboring cells over two levels.
    // returns a count. It's not integer. About 2 should be fairly accessible already.
    countConnected: function(startIndex, byLand){

      var data = this.data, w = width,
          count = 0.0, i = square2.length, index = 0, value = 0;

      while (i--) {
        index = startIndex + square2[i][0] + square2[i][1] * w;
        value = data[index];
        if (byLand && value !== 0) {
          count += (
            value ===   0 ? 0    :
            value === 201 || value === 255 || value === 41 ? 1 :
            value ===  42 ? 0.5  :
            value ===  43 ? 0.3  :
            value ===  44 ? 0.13 :
            value ===  45 ? 0.08 :
            value ===  46 ? 0.05 :
            value ===  47 ? 0.03 :
              0
          );
        } else if (!byLand && value !== 0) {
          count += (
            value ===   0 ? 0 :
            value === 201 ? 1 :
            value === 200 ? 1 :
              0
          );
      }}

      return count;
      
    },
    isAccessible: function(position, onLand){
      var gamePos = H.Map.mapPosToGridPos(position);
      return (this.countConnected(gamePos[0] + width * gamePos[1], onLand) >= 2);
    }

  };

  function obstructions(){

    var ents, ent, 
        x, y, xx, yy, sq, radius, pointer, value, 
        passData = H.Grids.passability.data,
        obstGrid = new H.Grid(width, height, 8),
        obstData = obstGrid.data,
        i = obstGrid.length; 

    /* Generated map legend:
     0 is impassable
     200 is deep water (ie non-passable by land units)
     201 is shallow water (passable by land units and water units)
     255 is land (or extremely shallow water where ships can't go).
     40 is "tree".
     The following 41-49 range is "near a tree", with the second number showing how many trees this tile neighbors.
     30 is "geological component", such as a mine
    */

    while(i--){
      obstData[i] = (passData[i] & maskLand) ? 0 : 255;
      obstData[i] = (
        (!(passData[i] & maskWater) && obstData[i] === 0)   ? 200 :
        (!(passData[i] & maskWater) && obstData[i] === 255) ? 201 : 
          obstData[i]
      );
    }

    ents = Object.keys(H.Entities);
    i = ents.length;

    while (i--){

      ent = H.Entities[ents[i]];

      if (ent.hasClass("ForestPlant")) {

        [x, y] = H.Map.mapPosToGridPos(ent.position());

        if (obstData[x + y * width] !== 0){obstData[x + y * width] = 40;}
        
        for (sq in square){

          xx = square[sq][0];
          yy = square[sq][1];
          
          if (x+xx >= 0 && x+xx < width && y+yy >= 0 && y+yy < height) {
            pointer = (x+xx) + (y+yy) * width;
            value = obstData[pointer];
            obstData[pointer] = (
              (value === 255)            ? 41 : 
              (value < 49 && value > 40) ? value + 1 : value
            );
          }

        }        

      } else if (ent.hasClass("Geology")) {

        radius = ~~(ent.obstructionRadius() / 4);
        [x, y] = this.mapPosToGridPos(ent.position());

        // Unless it's impassable, mark as 30. This takes precedence over trees.
        obstData[x + y * width] = obstData[x + y * width] === 0 ? 0 : 30; //??

        for (xx = -radius; xx <= radius; xx++){
          for (yy = -radius; yy <= radius; yy++){
            if (x+xx >= 0 && x+xx < width && y+yy >= 0 && y+yy < height){
              obstData[(x+xx) + (y+yy) * width] = obstData[(x+xx) + (y+yy) * width] === 0 ? 0 : 30; //??
        }}}

      }
    }

    return obstGrid;

  }

return H; }(HANNIBAL));

// Object [unidentified] : ss.resourceMaps['food']  ---------------
// Object  constructor: (function Map(sharedScript, originalMap, actualCopy){"use st
//   cellSize: NUMBER (4)
//   height: NUMBER (256)
//   length: NUMBER (65536)
//   map: OBJECT [65536](0, 1, 2, 3, 4, ...)
//   maxVal: NUMBER (255)
//   width: NUMBER (256)
// Object.__proto__
//   add: (function (map){"use strict";  for (var i = 0; i < this.leng
//   addInfluence: (function (cx, cy, maxDist, strength, type) {"use strict";  
//   dumpIm: (function (name, threshold){"use strict";  name = name ? nam
//   expandInfluences: (function (maximum, map) {"use strict";  var grid = this.map
//   findBestTile: (function (radius, obstructionTiles){"use strict";  // Find 
//   findLowestNeighbor: (function (x,y) {"use strict";  var lowestPt = [0,0];  var l
//   mapPosToGridPos: (function (p){"use strict";  return [Math.floor(p[0]/this.ce
//   multiply: (function (map, onlyBetter, divider, maxMultiplier){"use str
//   multiplyInfluence: (function (cx, cy, maxDist, strength, type) {"use strict";  
//   point: (function (p){"use strict";  var q = this.mapPosToGridPos(p)
//   setInfluence: (function (cx, cy, maxDist, value) {"use strict";  value = v
//   setMaxVal: (function (val){"use strict";  this.maxVal = val; })
//   sumInfluence: (function (cx, cy, radius){"use strict";  var x0 = Math.max(



// Object [unidentified] : H.Bot.gameState.ai.territoryMap  ---------------
// Object  constructor: function Object() {    [native code]}
//   data: OBJECT [65536](0, 1, 2, 3, 4, ...)
//   height: NUMBER (256)
//   width: NUMBER (256)


// Object [unidentified] : sharedScript.passabilityClasses  ---------------
// Object  constructor: function Object() {    [native code]}
//   pathfinderObstruction: NUMBER (1)
//   foundationObstruction: NUMBER (2)
//   building-land: NUMBER (4)
//   building-shore: NUMBER (8)
//   default: NUMBER (16)
//   ship: NUMBER (32)
//   unrestricted: NUMBER (64)
