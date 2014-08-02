/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals TIM, HANNIBAL, H, deb */

/*--------------- B R O W S E R -----------------------------------------------

  manages explorer history



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

  H.Village = {

    grid: function(){return grdVill;},

    init: function(canvas, context){
      // new Map loaded
      cvs = canvas; ctx = context;
      cvs.width = cvs.height = size;
      msg = function(){
        H.Maps.msg(H.format.apply(null, arguments));
      };
    },
    clear: function(){
      cvs.width = cvs.height = size;
      H.Maps.blitLayers();
    },
    test2: function(){

      var 
        t0 = Date.now(), source, mapsize,
        r, r0, r1, r2, r3, recs = [],
        b, b2, x, y, i, counters = {}, counter = 0;

      grdVill = H.Maps.get("grdObst").copy();
      source = grdVill.data;
      mapsize = Math.sqrt(source.length) | 0;
      cvs.width = cvs.height = mapsize;

      i = mapsize;
      while (i--){recs[i] = [];}

      // first step, create 1x1 recs
      counters[1] = 0;
      i = mapsize * mapsize;
      while (i--){
        x = i % mapsize; y = ~~(i/mapsize);
        if (source[i] === 1){
          recs[x][y] = new Rect(x, y, 1, 1, 0);
          counters[1] += 1;
        }
      }

      for ( b of [2, 4, 8, 16, 32] ){

        b2 = b/2;
        counters[b] = 0;

        x = mapsize;
        while (x--){

          y = mapsize;
          while (y--){

            if (!((x+y)%b)){
              r0 = recs[x][y];
              r1 = x < mapsize -b2 ? recs[x+b2][y] : undefined;
              r2 = y < mapsize -b2 ? recs[x][y+b2] : undefined;
              r3 = x < mapsize -b2 && y < mapsize -b2 ? recs[x+b2][y+b2] : undefined;
              if (r0 && r1 && r2 && r3){
                if (r0.width === b2 && r1.width === b2 && r2.width === b2 && r3.width === b2){
                  r0.width  = b; 
                  r0.height = b;
                  recs[x+b2][y]   = undefined;
                  recs[x][y+b2]   = undefined;
                  recs[x+b2][y+b2] = undefined;
                  counters[b] += 1;
                }
              }
            }

          }
        }

      }

      x = mapsize;
      while (x--){

        y = mapsize;
        while (y--){

          r = recs[x][y];
          if (r){

            ctx.fillStyle = (
              r.width ===  1 ? "rgba(100,  60,  60, 0.8)" :
              r.width ===  2 ? "rgba(100,  90,  90, 0.8)" :
              r.width ===  4 ? "rgba(100, 120, 120, 0.8)" :
              r.width ===  8 ? "rgba(100, 150, 150, 0.8)" :
              r.width === 16 ? "rgba(100, 180, 180, 0.8)" :
              r.width === 32 ? "rgba(100, 210, 210, 0.8)" :
                "rgba(255, 0, 0, 1)"
            );
            ctx.fillRect(r.x, r.y, r.width, r.height);
            counter += 1;
          }

      }}      

      H.Maps.blitLayers();

      msg("test2: r: %s, ms: %s", counter, Date.now() - t0);
      msg("test2: r: %s", JSON.stringify(counters));

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