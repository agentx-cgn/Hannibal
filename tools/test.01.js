/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals  dateNow, uneval */

var
  isBrowser = typeof window !== "undefined",
  print1 = typeof print === "undefined" || isBrowser ? console.log.bind(console) : print,
  t0 = dateNow(),
  H = {
    tab:      function (s,l){l=l||8;s=new Array(l+1).join(" ")+s;return s.substr(s.length-l);},
    toArray:  function (a){return Array.prototype.slice.call(a);},
    format:   function (){var a=H.toArray(arguments),s=a[0].split("%s"),p=a.slice(1).concat([""]),c=0;return s.map(function(t){return t + p[c++];}).join('');},
  },
  deb = function(){print((dateNow() - t0).toFixed(1), H.format.apply(H, arguments));},
  i, size, loops, source, target,
  f1 = function f1 (s){return (s === 1 || s === 2 || s === 4) ? 255 : 0;},
  //f2 = s => (s === 1 || s === 2 || s === 4) ? 255 : 0,
  tims = {
    "0" : [],
    "1" : [],
    "2" : [],
    "3" : [],
  };

size = 512; loops = 30; length = size * size;
source = new Uint8ClampedArray(length);
target = new Uint8ClampedArray(length);

print();
deb("Start V: %s, O: %s", version(), options());
deb("Testing iteration over Uint8ClampedArray of length: ", length);

i = length;
while (i--){source[i] = Math.random() * 4;}
  
deb("... source array randomized");

deb("running func: %s", decompileBody(f1));

function process0(source, target, fn){
  
  var t0 = Date.now(), s, i = length;

  while (i--) {
    s = source[i];
    target[i] = (s === 1 || s === 2 || s === 4) ? 255 : 0;
  }
  tims[0].push(Date.now()-t0);
}


function process1(source, target, fn){

  var t0 = Date.now(), s, i = length;

  while (i--) {
    s = source[i];
    target[i] = fn(s);
  }
  tims[1].push(Date.now()-t0);
}

function process2(source, target, fn){

  var t0 = Date.now(), s, p2, body = "";
  
  body += "var i = " + length + ";";
  body += "while (i--) { t[i] = f(s[i]);}";
  Function("s", "t", "f", body)(source, target, fn);  

  tims[2].push(Date.now()-t0);
}

function process3(source, target, fn){

  var t0 = Date.now(), body = "", fBody = fnBody(fn);
  
  body += "var i = " + length + ";";
  body += "while (i--) { t[i] = " + fBody + ";}";
  Function("s", "t", body)(source, target);  
  tims[3].push(Date.now()-t0);
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

function test(){
  
  deb("size = %s, iterations: %s", size, loops);
  putstr(0); i = loops; while (i--){process0(source, target, f1);}
  putstr(1); i = loops; while (i--){process1(source, target, f1);}
  putstr(2); i = loops; while (i--){process2(source, target, f1);}
  putstr(3); i = loops; while (i--){process3(source, target, f1);}
  print();

  Object.keys(tims).forEach(function(k){
    var avg = (tims[k].reduce(function(a, b){return a + b;}, 0) / tims[k].length).toFixed(1);
    print (k, avg, JSON.stringify(tims[k]));
    if (isBrowser){
      document.body.appendChild(document.createTextNode(k + ", " + avg + ", " + JSON.stringify(tims[k])));
      document.body.appendChild(document.createElement("BR"));
    }
  });
}

if (isBrowser){
  window.onload = function(){test();};
} else {
  test();
}


deb("Done");












