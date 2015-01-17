/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval, logObject */

/*--------------- P A T H -----------------------------------------------------

  A list of coordinates [ [x, z], [x, z], ... ]

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/

HANNIBAL = (function(H){

  const 
    PI2 = Math.PI * 2,
    PIH = Math.PI / 2,
    RADDEG = Math.PI / 180,
    DEGRAD = 1 / RADDEG,
    sin = Math.sin,
    cos = Math.cos;

  function loop (n, fn){for (var i=0; i<n; i++){fn(i);}}

  H.LIB.Path = function(context, definition){

    // quick serializer init
    this.klass = "path";
    this.context = context;
    this.imports = ["map", "villages"];
    this.import();

    // this.deb("  PATH: new def: %s", definition);

    this.theta = this.villages.theta;
    this.path = [];

    if (typeof definition === "string"){
      this.modify(definition);

    } else if (Array.isArray(definition)){
      this.path = definition;

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
    },
    append: function(path){
      this.path.concat(path);
    },

    // helper

    sanitize: function(definition){
      return (
        definition
          // .split("{").join("")
          // .split("}").join("")
          // .split(",").join("")
          // .split("[").join("")
          // .split("]").join("")
          .split(";")
          .filter(s => !!s)
          .map(String.trim)
      );
    }, 

    getCenter : function(){
      var p = this.path;
      // this.deb("  PATH: getCenter: have %s", uneval(this.path));
      return p.reduce( (a, b) => [ a[0] + b[0], a[1] + b[1] ], [0, 0] ).map( n => n / p.length);
    },

    // methods availabale by path script

    modify: function(definition){

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

        // this.deb("  PATH: car: %s, cdr: %s", uneval(car), uneval(cdr));
        
        // check for integer > 0
        if (H.isInteger(num) && num > 0){
          loop(num, n => {
            this.path[n] = [0, 0];
          });

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

    },
    circle: function(radius){

      var 
        p = this.path,
        n = p.length,
        s = PI2 / n,
        org  = this.getCenter();

      loop(p.length, n => {
        p[n] = [ 
          org[0] + cos(n * s) * radius,
          org[1] + sin(n * s) * radius
        ];
      });

    },
    translate: function(x, z){

      // displaces all point by x, z 

      var p = this.path;

      // this.log("translate.in");

      loop(p.length, n => {
        p[n] = [ p[n][0] + x, p[n][1] + z ];
      });

      // this.log("translate.out");

    },
    translatep: function(angle, radius){

      var
        p    = this.path,
        rads = angle * RADDEG + this.theta,
        sinr = sin(rads),
        cosr = cos(rads);

      // displaces all point in polar system

      // this.log("translatep.in");

      loop(p.length, n => {
        p[n] = [ 
          p[n][0] + radius * cosr, 
          p[n][1] + radius * sinr 
        ];
      });

      // this.log("translatep.out");

    },
    rotate: function(angle){

      // rotates path counter clockwise around its center by angle (degrees)
      // http://www.gamefromscratch.com/post/2012/11/24/GameDev-math-recipes-Rotating-one-point-around-another-point.aspx

      var 
        p = this.path,
        [cx, cy]  = this.getCenter(),
        rads = angle * RADDEG,
        sinr = sin(rads),
        cosr = cos(rads);

      loop(p.length, n => {
        p[n] = [
          cosr * (p[n][0] - cx) - sinr * (p[n][1] - cy) + cx, 
          sinr * (p[n][0] - cx) + cosr * (p[n][1] - cy) + cy, 
        ];
      });

    },
    linspace: function(pt1, pt2){

      // puts coords evenly distributed on a straight line between pt1, pt2, 
      // including both

      var 
        p = this.path,
        sx = (pt2[0] - pt1[0]) / p.length,
        sz = (pt2[1] - pt1[1]) / p.length;

      loop(p.length, n => {
        p[n] = [
          pt1[0] + n * sx, 
          pt1[1] + n * sz
        ];
      });

    },

  });

return H; }(HANNIBAL));
