/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, Engine, deb, logObject */

/*--------------- G R O U P S -------------------------------------------------

  Container for Groups, allows bot to query capabilities and launch instances



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  /*  Notes: 
      no stdlib Math in 0 A.D.

  */

  var ENV = (typeof window === 'object') ? "BROWSER" :
            (typeof Engine === 'object') ? "SPIDER" :
            "UNKNOW";

  // allows to patch deb() to html output in explorer
  var oldDeb = deb,
      clear  = function(){tblResult.innerHTML = "";},
      newDeb = function (){
        var args = arguments,
            html = "";
        if (args.length === 0) {args = ["**"];}
        if (args.length === 1) {args = ["%s", args[0]];}
        html += H.format("<tr><td><code>%s</code></td></tr>", H.format.apply(H, args));
        html = H.replace(html, " ", "&nbsp;");
        tblResult.innerHTML += html;
      },
      loops_repeats = function(){
        var gid = document.getElementById.bind(document),
        loops = ~~H.replace(gid('slcLoops').value, ".", ""),
        repeats = ~~H.replace(gid('slcRepeats').value, ".", "");
        return [loops, repeats];
      };

  function repeat(counter, fn){
    setTimeout(function(){
      fn(counter);
      if (counter > 1) {repeat(--counter, fn);}
    }, 10);
  }

  var imp = {};
  imp.cos = function(a)
  {
    // Bring a into the 0 to +pi range without expensive branching.
    // Uses the symmetry that cos is even.
    a = (a + Math.PI) % (2*Math.PI);
    a = Math.abs((2*Math.PI + a) % (2*Math.PI) - Math.PI);

    // make b = 0 if a < pi/2 and b=1 if a > pi/2
    var b = (a-Math.PI/2) + Math.abs(a-Math.PI/2);
    b = b/(b+1e-30); // normalize b to one while avoiding divide by zero errors.

    // if a > pi/2 send a to pi-a, otherwise just send a to -a which has no effect
    // Using the symmetry cos(x) = -cos(pi-x) to bring a to the 0 to pi/2 range.
    a = b*Math.PI - a; 

    var c = 1 - 2*b; // sign of the output

    // Taylor expansion about 0 with a correction term in the quadratic to make cos(pi/2)=0 
    return c * (1 - a*a*(0.5000000025619951 - a*a*(1/24 - a*a*(1/720 - a*a*(1/40320 - a*a*(1/3628800 - a*a/479001600))))));
  };      

  H.ASMTEST = function(){

    var [xx, yy] = loops_repeats(), asm = H.ASM,
        now = Date.now;

    repeat(yy, function(counter){
      var y = xx, t0 = now(), ret;
      while(y--){ret = asm.emp0();}
      newDeb("Run Asm.emp0 %s times, time: %s msecs, %s/%s", xx, H.tab(now() - t0, 3), yy-counter+1, yy);
    });

    repeat(yy, function(counter){
      var y = xx, t0 = now(), ret;
      while(y--){ret = asm.emp1(1.0);}
      newDeb("Run Asm.emp1 %s times, time: %s msecs, %s/%s", xx, H.tab(now() - t0, 3), yy-counter+1, yy);
    });

    repeat(yy, function(counter){
      var y = xx, t0 = now(), ret;
      while(y--){ret = asm.emp2(1.0,2.0);}
      newDeb("Run Asm.emp2 %s times, time: %s msecs, %s/%s", xx, H.tab(now() - t0, 3), yy-counter+1, yy);
    });



  };
  H.ASMTEST1 = function(){

    var asm = H.ASM,
        alt = {
          cos: Math.cos,
          sin: Math.sin,
          distance: function(a0, a1, b0, b1){
            var dx = a0-b0, dy = a1-b1;
            return Math.sqrt(dx * dx + dy * dy);
          }
        },
        args = {
          cos: [-2, 0.0001, 17],
          sin: [-2, 0.0001, 17],
          distance: [[1,2,3,4], [5,6,7,8], [12,13,17,1000]]
        };

    var [xx, yy] = loops_repeats(),
        now = Date.now;

    repeat(yy, function(counter){
      var y = xx, t0 = now(), ret;
      while(y--){
        ret = alt.cos(11.1234567);
      }
      newDeb("Run Math.cos %s times, time: %s msecs, %s/%s", xx, H.tab(now() - t0, 3), yy-counter+1, yy);
    });

    repeat(yy, function(counter){
      var y = xx, t0 = now(), ret;
      while(y--){
        ret = imp.cos(11.1234567);
      }
      newDeb("Run  0ad.cos %s times, time: %s msecs, %s/%s", xx, H.tab(now() - t0, 3), yy-counter+1, yy);
    });

    // repeat(yy, function(counter){
    //   var y = xx, t0 = now(), ret;
    //   while(y--){
    //     ret = asm.cos(11.1234567);
    //   }
    //   newDeb("Run  Asm.cos %s times, time: %s msecs, %s/%s", xx, H.tab(now() - t0, 3), yy-counter+1, yy);
    // });

    repeat(yy, function(counter){
      var y = xx, t0 = now(), ret;
      ret = asm.cosx(11.1234567, xx);
      newDeb("Run  Asm.cosx with %s, time: %s msecs, %s/%s", xx, H.tab(now() - t0, 3), yy-counter+1, yy);
    });

    repeat(yy, function(counter){
      var y = xx, t0 = now(), ret;
      ret = asm.cosxx(11.1234567, xx);
      newDeb("Run Asm.cosxx with %s, time: %s msecs, %s/%s", xx, H.tab(now() - t0, 3), yy-counter+1, yy);
    });

    newDeb();
    newDeb("Please wait...");        

  }


  H.ASM = (function(stdlib, foreign, heap) {

    // "use asm";
    //WARNING: JavaScript warning: asm.js type error: Disabled by javascript.options.asmjs in about:config


    var PI   = 3.141592653589793,
        // arr  = new stdlib.Int8Array(heap),
        // sqrt = stdlib.Math.sqrt,
        // abs  = stdlib.Math.abs;
        sqrt = stdlib.sqrt,
        abs  = stdlib.abs;

    function cosxx (a, n){

      a = +a;
      n = n|0;
      
      var b = 0.0, c = 0.0, x = 0.0;

      while(n|0>0|0){

        a = (a + PI) % (2.0*PI);
        a = +abs((2.0*PI + a) % (2.0*PI) - PI);
        b = (a-PI/2.0) + +abs(a-PI/2.0);
        b = b / (b + +(1e-30)); // normalize b to one while avoiding divide by zero errors.
        a = b * PI - a; 
        c = 1.0 - 2.0 * b; // sign of the output
        x = +(c * (1.0 - a*a*(0.5000000025619951 - a*a*(1.0/24.0 - a*a*(1.0/720.0 - a*a*(1.0/40320.0 - a*a*(1.0/3628800.0 - a*a/479001600.0)))))));
        n = (n-1)|0;

      }
      return 1.0;

    }

    function cos (a){

      a = +a;
      
      var b = 0.0, c = 0.0;

      a = (a + PI) % (2.0*PI);
      a = +abs((2.0*PI + a) % (2.0*PI) - PI);
      b = (a-PI/2.0) + +abs(a-PI/2.0);
      b = b / (b + +(1e-30)); // normalize b to one while avoiding divide by zero errors.
      a = b * PI - a; 
      c = 1.0 - 2.0 * b; // sign of the output

      return +(c * (1.0 - a*a*(0.5000000025619951 - a*a*(1.0/24.0 - a*a*(1.0/720.0 - a*a*(1.0/40320.0 - a*a*(1.0/3628800.0 - a*a/479001600.0)))))));

    }

    function sin (a){
      a = +a;
      return +(cos(a - PI/2.0));
    }

    function cosx (a, n){
      a = +a; n = n|0; var x = 0.0;
      while(n|0>0|0){
        x = +cos(a);
        n = (n-1)|0;
      }
      return 1.0;
    } 

    function distance (a0, a1, b0, b1){

      a0 = +a0;
      a1 = +a1;
      b0 = +b0;
      b1 = +b1;
      
      var dx = 0.0, dy = 0.0;
          
      dx = +a0 - +b0;
      dy = +a1 - +b1;
      return +sqrt(dx * dx + dy * dy);
    }

    function emp0 () {}
    function emp1 (a) {a=+a;return +a;}
    function emp2 (a,b) {a=+a;b=+b;return +a;}


    return {
      emp0: emp0,
      emp1: emp1,
      emp2: emp2,
      cos: cos,
      cosx: cosx,
      cosxx: cosxx,
      sin: sin,
      distance: distance
    };

  }(Math));


return H; }(HANNIBAL));

