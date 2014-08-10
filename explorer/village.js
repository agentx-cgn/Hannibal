/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals TIM, HANNIBAL, H, deb */

/*--------------- V I L L A G E  ----------------------------------------------

  plans village layout, handles claims and foundation placement



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  var cvs, ctx, size = 512, mouse, msg, grdVill = new H.Grid(size, size, 8);  

  function Rect(x, y, w, h, a){
    this.x      = x !== undefined ? x : size/2;
    this.y      = y !== undefined ? y : size/2;
    this.width  = w !== undefined ? w : 150;
    this.height = h !== undefined ? h : 100;
    this.theta  = a !== undefined ? a : 0;
    this.rotate();
  }
  Rect.prototype = {
    constructor: Rect,
    rotate: function(a){
      this.theta = (this.theta + (a || 0)) % (Math.PI *2);
      this.sin   = Math.sin(this.theta);
      this.cos   = Math.cos(this.theta);
    },
    rotatePoint: function(x, y){
      return {
        x: this.cos * (x-this.x) - this.sin * (y-this.y) + this.x,
        y: this.sin * (x-this.x) + this.cos * (y-this.y) + this.y
      };
    },
    polygon: function(){
      var w2 = this.width/2, h2 = this.height/2, x = this.x, y = this.y;
      return [
        this.rotatePoint(x + w2, y + h2),
        this.rotatePoint(x + w2, y - h2),
        this.rotatePoint(x - w2, y - h2),
        this.rotatePoint(x - w2, y + h2),
      ];
    },
    draw: function(ctx, color, width){
      var corners = this.polygon();
      ctx.lineWidth   = width || 1;
      ctx.strokeStyle = color || "rgba(200, 200, 200, 0.8)";
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      ctx.lineTo(corners[1].x, corners[1].y);
      ctx.lineTo(corners[2].x, corners[2].y);
      ctx.lineTo(corners[3].x, corners[3].y);
      ctx.lineTo(corners[0].x, corners[0].y);
      ctx.stroke();
      ctx.fillStyle = "rgba(200, 0, 0, 0.8)";
      ctx.fillRect(corners[0].x -1, corners[0].y -1, 3, 3);
    }
  };

  function Raster(size){
    var i;
    this.size = size | 0;
    this.length = size * size;
    this.data = [];
    this.counters = {};
    i = this.size;
    while (i--){this.data[i] = [];}
  }
  Raster.prototype = {
    constructor: Raster,
    import: function(grid, value){

      var 
        x, y, i = this.length,
        size = this.size;

      this.counters[1] = 0;

      while (i--){
        x = i % size; y = ~~(i/size);
        if (grid[i] === value){
          this.data[x][y] = new Rect(x, y, 1, 1, 0);
          this.counters[1] += 1;
        }
      }      

    },
    optimize: function(){

      var 
        b, b2, x, y, r0, r1, r2, r3,
        size = this.size,
        raster = this.data,
        counters = this.counters;

      for ( b of [2, 4, 8, 16, 32, 64, 128] ){

        b2 = b/2;
        counters[b] = 0;

        x = size;
        while (x--){

          y = size;
          while (y--){

            if (!((x+y)%b)){
              r0 = raster[x][y];
              r1 = x < size -b2 ? raster[x+b2][y] : null;
              r2 = y < size -b2 ? raster[x][y+b2] : null;
              r3 = x < size -b2 && y < size -b2 ? raster[x+b2][y+b2] : null;
              if (r0 && r1 && r2 && r3){
                if (r0.width === b2 && r1.width === b2 && r2.width === b2 && r3.width === b2){
                  r0.width = r0.height = b; 
                  raster[x+b2][y]    = null;
                  raster[x][y+b2]    = null;
                  raster[x+b2][y+b2] = null;
                  counters[b]   += 1;
                  counters[b/2] -= 4;
      } } } } } } 

    },
    reduce: function(posX, posY, range){

      var size = this.size, r, x, y, 
          raster = this.data, out = [],
          polygon = new Rect(posX, posY, range, range, 0).polygon();

      x = size;
      while (x--){

        y = size;
        while (y--){

          r = raster[x][y];
          if (r){
            if (H.Math.doPolygonsIntersect(r, polygon)){
              out.push(r);
            }
          }

      } }

      return out; 

    },
    search: function(){},

  };

  H.Village = {

    grid: function(){return grdVill;},

    init: function(canvas, context){
      // new Map loaded
      cvs = canvas; ctx = context;
      cvs.width = cvs.height = size;
      msg = function(){
        H.Maps.msg.call(null, H.format.apply(null, arguments));
      };
    },
    clear: function(){
      cvs.width = cvs.height = size;
      H.Maps.blitLayers();
    },
    test2: function(){

      var 
        t0 = Date.now(), source, mapsize,
        i, x, y, r, tpl, pos, raster, counter = 0,
        recs = [],
        cc = H.Maps.centres[0],
        ents = H.Maps.entities;

      grdVill = H.Maps.grdObst.copy();
      source  = grdVill.data;
      mapsize = grdVill.width;
      cvs.width = cvs.height = mapsize;

      raster = new Raster(mapsize);
      raster.import(grdVill.data, 1); // land
      raster.optimize();
      recs = raster.reduce(~~(cc.x/4), ~~(cc.y/4), cc.radius/4);

      msg("test2: recs: %s", recs.length);

      x = cc.x /4; y = mapsize - cc.y /4; radius = cc.radius /4;

      ctx.lineWidth = 1.0;
      ctx.strokeStyle = "rgba(255,0,0,1)";
      ctx.strokeRect(12, 12, 8, 8);
      ctx.strokeStyle = "rgba(255,255,0,1)";
      ctx.strokeRect(x - radius , y - radius, radius * 2, radius * 2);

      ctx.lineWidth = 0.5;
      ctx.strokeStyle = "rgba(255,0,255,1)";

      i = recs.length;
      while(r = recs[--i]){
        // ctx.strokeRect(r.x, r.y, r.width, r.height);
      }

      H.toArray(ents).forEach(function(ent){

        tpl = ent.getElementsByTagName("Template")[0].innerHTML;

        obs = ent.getElementsByTagName("Obstruction");

        if (!obs.length){
          console.log(ent.getElementsByTagName("Template")[0].innerHTML);

        } else {
          pos = ent.getElementsByTagName("Position")[0];
          x = ~~(pos.getAttribute("x")/4);
          y = mapsize - ~~(pos.getAttribute("z")/4) ;
          ctx.lineWidth = 0.5;
          ctx.strokeStyle = "rgba(255,255,0,1)";
          ctx.strokeRect(x -1, y -1, 2, 2);
        }


      });      

      // x = mapsize;
      // while (x--){
      //   y = mapsize;
      //   while (y--){
      //     r = raster.data[x][y];
      //     if (r){
      //       ctx.strokeRect(r.x, r.y, r.width, r.height);
      //       counter += 1;
      //     }
      // }}      

      H.Maps.blitLayers();

      msg("test2: r: %s", JSON.stringify(raster.counters));
      msg("test2: r: %s, ms: %s", counter, Date.now() - t0);

    },
    test1: function(){

      var t0 = Date.now(), x, y, w, h, a, max = 10000, r, list = [], poly, collisions = 0;

      function intersects(r){
        var i, does;
        for (i=0; i<list.length; i++){
          does = H.Math.doPolygonsIntersect(r, list[i]);
          if (does){return true;}
        }
        return false;
      }

      function randFloat(min, max){
        var al = arguments.length;
        max = al === 0 ? 1 : al === 1 ? min : max;
        min = al === 0 ? 0 : al === 1 ?   0 : min;
        return H.scale(Math.random(), 0, 1, min, max); 
      }

      // for (i=0; i<max; i++){
      while (collisions < max){

        w = randFloat(3, 40);
        h = randFloat(3, 40);
        a = randFloat(2 * Math.PI);
        x = 30 + randFloat(size - 60);
        y = 30 + randFloat(size - 60);

        r = new Rect(x, y, w, h, a);
        poly = r.polygon();
        if (intersects(poly)){
          collisions += 1;
        } else {
          list.push(poly);
          r.draw(ctx);
        }

      }
      msg("rects: %s, ms: %s", list.length, Date.now() - t0);
      H.Maps.blitLayers();

    },
    onclick: function(coords){
      mouse = coords;
    },


  };



return H; }(HANNIBAL));     