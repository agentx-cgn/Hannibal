/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval, logObject */

/*--------------- P A T H -----------------------------------------------------

  A list of coordinates [ [x, z], [x, z], ... ]

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/

HANNIBAL = (function(H){

  const 
    PI     = Math.PI,
    TAU    = PI + PI,
    PI2    = PI / 2,
    RADDEG = PI / 180,
    DEGRAD = 180 / PI,
    SQRT2  = Math.sqrt(2),
    sin    = Math.sin,
    cos    = Math.cos,
    sqrt   = Math.sqrt;

  // helper
  function loop (n, fn){for (var i=0; i<n; i++){fn(i);}}

  H.LIB.Path = function(context, definition){

    // quick serializer init
    this.klass = "path";
    this.name  = "path:" + context.idgen++;
    this.context = context;
    this.imports = ["map", "villages"];
    this.import();

    // this.deb("  PATH: new def: %s", definition);

    this.path = [];                         // stores the coords

    // this.theta       = this.villages.theta; // rads from cc to map center
    // this.orientation = this.theta;          // rads
    this.theta       = 0;
    this.orientation = 0;
    this.center = 0;

    if (typeof definition === "string"){
      this.modify(definition);

    } else if (Array.isArray(definition)){
      this.path = definition;
      this.center = this.getCenter();

    } else {
      H.throw("PATH: can't handle this: %s", definition);

    }


  };

  H.LIB.Path.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Path,
    log: function(msg){

      var p = this.path.map(c => c.map(Math.round));
      this.deb("  PATH: %s, %s, %s", msg, this.path.length, p);

    }, append: function(path){

      this.path.concat(path);

    }, sanitize: function(definition){

      return (
        definition
          .split(";")
          .filter(s => !!s)
          .map(String.trim)
      );
    
    }, getCenter : function(){

      var p = this.path;

      return (
        p.reduce( (a, b) => [ a[0] + b[0], a[1] + b[1] ], [0, 0] )
        .map( n => n / p.length)
      );


    // methods availabale by path script

    }, modify: function(definition){

      // parse path script e.g. "8; center 7 8; circle 9; translate 13 14"

      var 
        list, car, cdr, num,
        cmds = this.sanitize(definition);

      // this.log("modify.in");

      cmds.forEach(cmd => {

        list = cmd.split(" ");
        car  = list[0];
        num  = ~~list[0];
        cdr  = list.slice(1);

        // check for integer > 0
        if (H.isInteger(num) && num > 0){
          loop(num, n => {
            this.path[n] = [0, 0];
          });
          this.center = [0, 0];

        // check for method
        } else if (this[car]){
          this[car].apply(this, cdr.map(parseFloat));

        // bail out
        } else {
          H.throw("Can't handle '%s' from this path script: %s", car, definition);

        }

      });

      // this.log("modify.out");

      return this;


    }, circle: function(radius){

      var 
        p = this.path,
        s = TAU / p.length,
        org  = this.center;

      loop(p.length, n => {
        p[n] = [ 
          org[0] + cos(n * s) * radius,
          org[1] + sin(n * s) * radius
        ];
      });


    }, translate: function(x=0, z=0){

      // displaces all point by x, z 

      var p = this.path, org = this.center;

      // this.log("translate.in");

      loop(p.length, n => {
        p[n] = [
          p[n][0] + x, 
          p[n][1] + z 
        ];
      });

      this.center = [org[0] + x, org[1] + z];

      // this.log("translate.out");


    }, translatep: function(angle, radius){

      // displaces all coords in polar system

      var
        p    = this.path,
        rads = (angle * RADDEG + this.theta) % TAU,
        sinr = sin(rads),
        cosr = cos(rads),
        [cx, cz] = this.center;

      // this.log("translatep.in");

      loop(p.length, n => {
        p[n] = [ 
          p[n][0] + radius * cosr, 
          p[n][1] + radius * sinr 
        ];
      });

      this.center = [cx + radius * cosr, cz + radius * sinr];

      // this.log("translatep.out");


    }, rotate: function(angle){

      // rotates path counter clockwise around its center by angle (degrees)
      // http://www.gamefromscratch.com/post/2012/11/24/GameDev-math-recipes-Rotating-one-point-around-another-point.aspx

      var 
        p = this.path,
        [cx, cz] = this.center,
        rads = angle * RADDEG,
        sinr = sin(rads),
        cosr = cos(rads);

      loop(p.length, n => {
        p[n] = [
          cosr * (p[n][0] - cx) - sinr * (p[n][1] - cz) + cx, 
          sinr * (p[n][0] - cx) + cosr * (p[n][1] - cz) + cz
        ];
      });

      this.orientation = (this.orientation + rads) % TAU;


    }, arrange: function(width, height, distance=6){

      // TODO: needs this.orientation

      var
        x, y, p  = this.path,
        [cx, cz] = this.center,
        rest = p.length % width;

      // trash current path
      this.path = [];

      // do for width/height
      for(x = 0; x < width; x++){
        for(y = 0; y < height; y++){
          this.path.push([
            cx - (~~(width  / 2) + x) * distance, 
            cz - (~~(height / 2) + y) * distance
          ]); 
      }}

      // pos the remaining
      for(x = 0; x < rest; x++){
        this.path.push([
          cx - (~~(width  / 2) + x) * distance, 
          cz - (~~(height / 2) + y) * distance
        ]);      
      }

    }, square: function(distance=6){

      // arranges points into a square + rest using distance

      var
        p = this.path,
        width  = ~~(p.length / sqrt(p.length)),
        height = ~~(p.length / width);

      this.arrange(width, height, distance);


    }, line: function(distance=6){

      // arranges points into a line

      var
        p = this.path,
        width  = p.length,
        height = 1;

      this.arrange(width, height, distance);

    }, rect: function(width, distance=6){

      // arranges points into a rectangle

      var
        p = this.path,
        height = ~~(p.length / width);

      this.arrange(width, height, distance);


    }, linspace: function(pt1, pt2){

      // puts coords evenly distributed on a straight line between pt1, pt2, 
      // including both

      var 
        p  = this.path,
        dx = (pt2[0] - pt1[0]) / p.length,
        dz = (pt2[1] - pt1[1]) / p.length;

      loop(p.length, n => {
        p[n] = [
          pt1[0] + n * dx, 
          pt1[1] + n * dz
        ];
      });

      this.center = this.getCenter();

    },

  });

return H; }(HANNIBAL));
