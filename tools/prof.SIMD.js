/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals  dateNow, uneval, decompileBody, putstr, version, options, SIMD */

// build() *writes* to stdout

var
  t0 = dateNow(),
  H = {
    tab:      function (s,l){l=l||8;s=new Array(l+1).join(" ")+s;return s.substr(s.length-l);},
    toArray:  function (a){return Array.prototype.slice.call(a);},
    format:   function (){var a=H.toArray(arguments),s=a[0].split("%s"),p=a.slice(1).concat([""]),c=0;return s.map(function(t){return t + p[c++];}).join("");},
  },
  deb = function(){print((dateNow() - t0).toFixed(1), H.format.apply(H, arguments));};

deb("Start V: %s, O: %s", version(), options());


// SIMD in JavaScript, By Ivan Jibaja, Senior Software Engineer, Intel Corporation
// https://01.org/node/1495


// getBuildConfiguration();
// build();
// isSimdAvailable()
// typein:12:0 ReferenceError: getCompilerOptions is not defined

// js> Object.getOwnPropertyNames(SIMD)
// ["float32x4", "int32x4"]

// js> Object.getOwnPropertyNames(SIMD.float32x4)
// ["byteLength", "byteAlignment", "toSource", "array", "equivalent", "prototype", "abs", "fromInt32x4", "fromInt32x4Bits", 
// "neg", "not", "reciprocal", "reciprocalSqrt", "splat", "sqrt", "add", "and", "div", "equal", "greaterThan", 
// "greaterThanOrEqual", "lessThan", "lessThanOrEqual", "load", "loadXYZ", "loadXY", "loadX", "max", "maxNum", 
// "min", "minNum", "mul", "notEqual", "or", "store", "storeXYZ", "storeXY", "storeX", "sub", "withX", "withY", "withZ", "withW", 
// "xor", "clamp", "select", "swizzle", "shuffle"]


function process0(source, target){
  
  var t0 = dateNow(), s, i = length;

  while (i--) {
    s = source[i];
    target[i] = (s === 1 || s === 2 || s === 4) ? 255 : 0;
  }
  tims[0].push(dateNow()-t0);
  // print(uneval(target));
}


function process1(source, target, fn){

  var t0 = dateNow(), s, i = length;

  while (i--) {
    target[i] = fn(source[i]);
  }
  tims[1].push(dateNow()-t0);
  // print(target[i]);
}

function process2(source, target, fn){

  var t0 = dateNow(), body = "";
  
  body += "var i = " + length + ";";
  body += "while (i--) { t[i] = f(s[i]);}";
  Function("s", "t", "f", body)(source, target, fn);  
  // print (fn); print (body);

  tims[2].push(dateNow()-t0);
  // print(uneval(target));
}

function process3(source, target, fn){

  var t0 = dateNow(), body = "", fBody = fnBody(fn);
  
  body += "var s, i = " + length + ";";
  body += "while (i--) { s = source[i]; t[i] = " + fBody + "}";
  Function("s", "t", body)(source, target);  
  tims[3].push(dateNow()-t0);
  // print(uneval(target));
}

function process4(source, target, fn){

  var 
    i, r, len = source.length, t0 = dateNow(), 
    s = source, t = target,
    float32x4 = SIMD.float32x4;

  for (i=0; i<len; i+=4){
    r = float32x4.sqrt(float32x4(s[i], s[i+1], s[i+2], s[i+3]));
    t[i]    = r.x;
    t[i +1] = r.y;
    t[i +2] = r.z;
    t[i +3] = r.w;
  }

  tims[4].push(dateNow()-t0);

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


var i, f0, source, target, size, loops, length, tims;


function test(){
  putstr("running...");
  // putstr(0); i = loops; while (i--){process0(source, target, f0);}
  // putstr(1); i = loops; while (i--){process1(source, target, f0);}
  // putstr(2); i = loops; while (i--){process2(source, target, f0);}
  putstr(3); i = loops; while (i--){process3(source, target, f0);}
  putstr(4); i = loops; while (i--){process4(source, target, f0);}
  putstr("!")
}

function result () {
  Object.keys(tims).forEach(k => {
    var avg = parseFloat((tims[k].reduce((a, b) => a + b, 0) / tims[k].length).toFixed(1));
    if (avg > 2){
      deb("p%s avg: %s list: %s", k, avg, JSON.stringify(tims[k].map(n => parseFloat(n.toFixed(1)))));
    } else {
      deb("p%s avg: %s list: %s", k, avg, JSON.stringify(tims[k].map(n => Math.round(n))));
    }
  });
}

function reset () {
  tims = {"0" : [], "1" : [], "2" : [], "3" : [], "4": [] };
}


function init0(psize=128, ploops=10){

  f0 = function f0 (s){return (s === 1 || s === 2 || s === 4) ? 255 : 0;};

  size = psize; loops = ploops; length = size * size;
  source = new Uint8ClampedArray(length);
  target = new Uint8ClampedArray(length);

  print();
  deb("Testing %s full iterations over Uint8ClampedArray of length: ", loops, length);
  deb("running func: %s", decompileBody(f0));

  i = length;
  while (i--){source[i] = ~~(Math.random() * 5);}
  deb("... source array randomized");
  print();

}

// reset();
// init0(512, 30);
// test();
//   print();
// result();
//   print();

function init1(psize=128, ploops=10){

  f0 = function f0 (s){return Math.sqrt(s);};

  size = psize; loops = ploops; length = size * size;
  source = new Float32Array(length);
  target = new Float32Array(length);

  print();
  deb("Testing %s full iterations over Float32Array of length: ", loops, length);
  deb("running func: %s", decompileBody(f0));

  i = length;
  while (i--){source[i] = Math.random() * 1e10;}
  deb("... source array randomized");
  print();

  // print(uneval(source));

}

reset();
init1(512, 20);
test();
  print();
result();
  print();

deb("Done");


