/*jslint bitwise: true, browser: true, moz: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals  dateNow, uneval, putstr, version, options */

/*

  tests various tecnics to loop over all properties of an object
  and calls a function with with property name + value

*/ 

var
  t0 = dateNow(),
  tab     = function (s,l){l=l||8;s=new Array(l+1).join(" ")+s;return s.substr(s.length-l);},
  toArray = function (a){return Array.prototype.slice.call(a);},
  format  = function (){var a=toArray(arguments),s=a[0].split("%s"),p=a.slice(1).concat([""]),c=0;return s.map(function(t){return t + p[c++];}).join("");},
  deb     = function (){print((dateNow() - t0).toFixed(1), format.apply(null, arguments));},
  rnd     = function (){return Math.random().toString(36).slice(2);};

// SOME CHECKS

// Object.keys(this).sort().forEach(k => print(k));

// SOME GLOBALS

var 
  size,    // amount of properties
  loops,   // amount of tests
  timing,  // keeps timing matrix
  grid;    //,  = new Uint8ClampedArray(1024);


// TEST SUITE

var DIM1 = {
  "i8"  : Uint8Array,
  "i32" : Uint32Array,
  "c8"  : Uint8ClampedArray,
  "f32" : Float32Array,
};

var F1 = function(){return 17;};

var DIM2 = [
  ( ) => "CONST",
  ( ) => 0,
  (v) => v,
  (v) => v > 128 ? 255 : 0,
  (v) => {if (v > 128) return 180; else return 0;},
  ( ) => F1(),
  ( ) => Math.random() * 256,
  ( ) => Math.sin(Math.random() * 2 * Math.PI),
];

// PROFILER

print();
deb("Start V: %s, O: %s", version(), options());

print();
size = 512*512; loops = 16;
deb("Testing %s full iterations over Typed Arrays(%s) ", loops, size);

[0, 1, 2, 3, 4, 5, 6, 7].forEach(idx => {
  reset();
  profile(idx);
  result();
});

deb("Done");

// HELPER

function reset () {
  timing = {};
  Object.keys(DIM1).forEach((key) => timing[key] = []);
}

function result () {
  Object.keys(DIM1).forEach(k => {

    var len = timing["i8"].length; len2 = ~~(len/2);
    var avglow = parseFloat(
      (timing[k].sort((a,b) => a < b ? 1 : -1).slice(len2).reduce((a, b) => a + b, 0) / len2)).toFixed(1);
    var avg    = parseFloat((timing[k].reduce((a, b) => a + b, 0) / len)).toFixed(1);

    if (avg > 2){
      deb("T %s a/l: %s, %s, list: %s", tab(k,3), tab(avg, 5), tab(avglow, 5), JSON.stringify(timing[k].map(n => parseFloat(n.toFixed(1)))));
    } else {
      deb("T %s a/l: %s, %s, list: %s", tab(k,3), tab(avg, 5), tab(avglow, 5), JSON.stringify(timing[k].map(n => Math.round(n))));
    }

  });
  print();
}

function profile(index){

  var t0, i, k, fn, keysDIM1;
  
  keysDIM1 = Object.keys(DIM1);
  fn  = DIM2[index];

  deb("running: [%s] '%s' ... ", index, fn.toString()) ;
  
  keysDIM1.forEach(k => {

    // reinit grid
    grid = new DIM1[k](size);
    var j = size; while(j--){grid[i] = 0;}

    j = loops; while (j--){

      t0 = dateNow();
      if(index === 0){
        i = grid.length; while(i--){
          grid[i] = 0;
        }
      } else {
        i = grid.length; while(i--){
          grid[i] = fn(grid[i]);
        }
      }
      timing[k].push(dateNow()-t0);   

    }

  });
  
  print();
}

