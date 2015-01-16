/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL_DEBUG, Engine, API3, print, uneval */

/*--------------- H A N N I B A L ---------------------------------------------

  This is loaded first by 0 A.D.
  Home: https://github.com/noiv/Hannibal/blob/master/README.md

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

  Credits:

    kmeans: 
    helper:

*/

/* 
  loading sequence:
    _debug
    _hannibal
    _lhelper
    _logger
    a-z

*/


// very first line, enjoy the rest
print("--------: HANNIBAL.MODUL: " + new Date() + " --- ### --- ### --- ### ---\n");

Engine.IncludeModule("common-api");

var HANNIBAL = (function() {

  var H = {

    MODULESTART: Date.now(),

    API:      API3, 
    AI:       {}, 
    LIB:      {}, 
    HTN:      {Economy: {}, Helper: {}}, 
    DSL:      {Nouns: {}}, 
    Data:     {Groups: {}}, 
    Groups:   {},
    Geometry: {},
    
    throw: function(){
      var 
        msg = H.format.apply(null, H.toArray(arguments)),
        stack = new Error().stack.split("\n").slice(1);
      H.deb();
      H.deb(msg);
      stack.forEach(line => H.deb("  " + line));      
      throw "\n*\n*";
    },
    
    extend: function (o){
      Array.prototype.slice.call(arguments, 1)
        .forEach(e => {Object.keys(e)
          .forEach(k => o[k] = e[k]
    );});},
    
    chat: function(id, msg){
      Engine.PostCommand(id, {"type": "chat", "message": id + "::" + msg});
    },

  };

  /*

    MIXINS,

  */
  
  // Serializer needs: this.[klass, name, context, imports])
  H.LIB.Serializer = function(){};
  H.LIB.Serializer.prototype = {
    constructor: H.LIB.Serializer,
    toString: function(){return H.format("[%s %s:%s]", this.klass || "no klass", this.context.name, this.name || "no name");},
    deb: function(){this.context.launcher.deb.apply(this, arguments);},
    log: function(){this.deb("   %s: logging", this.name.slice(0,3).toUpperCase());},
    logtick: function(){this.deb("   %s: logticking", this.name.slice(0,3).toUpperCase());},
    serialize: function(){return {};},
    deserialize: function(){return this;},
    initialize: function(){return this;},
    finalize: function(){return this;},
    activate: function(){return this;},
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function(context){
      context.data[this.klass] = this.serialize();
      return new H.LIB[H.noun(this.name)](context);
    },
  };  

return H;}());
/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- H E L P E R -------------------------------------------------

  these are Helpers, not solutions. No external stuff needed


  everything non domain H.[lowercase] should be here.
  V: 0.1, agentx, CGN, Feb, 2014

  Credits: 
    http://www.140byt.es
    http://rosettacode.org/wiki/Category:JavaScript

*/

// a > b ? 1 : -1 biggest first, http://blog.rodneyrehm.de/archives/14-Sorting-Were-Doing-It-Wrong.html
// The Object.keys() method returns an array of a given object's own enumerable properties
// The Object.getOwnPropertyNames() method returns an array of all properties (enumerable or not) found directly upon a given object.
// http://rosettacode.org/wiki/Category:JavaScript

HANNIBAL = function(H){

if (!H.extend){
  H.extend = function (o){
    Array.prototype.slice.call(arguments, 1)
      .forEach(e => Object.keys(e).forEach(k => o[k] = e[k]));
  };
} 

H.extend(H, {

  // looping
  // for:        function(n,fn){var i=n,a=[];while(n--){a.push(fn(i-n+1));}return a;},
  loop:       function (n, fn){for (var i=1; i<n+1; i++){fn(i);}},
  range:      function (st, ed, sp){
    var i,r=[],al=arguments.length;
    if(al===0){return r;}
    if(al===1){ed=st;st=0;sp=1;}
    if(al===2){sp=1;}
    for(i=st;i<ed;i+=sp){r.push(i);}
    return r;
  },
  linspace:   function (a,b,n) {
    if(n===undefined){n=Math.max(Math.round(b-a)+1,1);}
    if(n<2) {return n===1?[a]:[];}
    var i,ret=Array(n);n--;
    for(i=n;i>=0;i--) {ret[i]=(i*b+(n-i)*a)/n;}
    return ret;
  },
  zip:        function (){
    var a = H.toArray(arguments), f = a.slice(-1)[0], o = a.slice(1, -1), l = [];
    a[0].forEach(function(d, i){
      var args = [d].concat(o.map(function(o){return o[i];}));
      l[i] = f.apply(f, args);
    });
    return l;
  },

  // numbers
  bounds:     function (x, min, max){ return Math.min(Math.max(x, min), max); },
  scale:      function (x,xMin,xMax,min,max){return (max-min)*(x-xMin)/(xMax-xMin)+min;},
  // clamp:      function (val, min, max){return Math.max(Math.min(val, max), min);}, 
  clamp:      function (val, min, max){return val < min ? min : val > max ? max : val;}, 
  isInteger:  function (n){return Math.floor(n) === n;},
  pareto:     function (alpha) {return 1.0 / Math.pow((1 - Math.random()), 1.0 / alpha);},
  rndClamp:   function (min, max){return Math.random()*(max-min+1) + min;},
  isPrime:    function (n, i){for(i=n;n%--i;);return i===1;},
  fixed1:     function (a){return a.map(n => (+n).toFixed(1));},

  // strings
  replace:    function (s,f,r){return s.replace(new RegExp(H.escapeRex(f), "g"), r);},
  format:     function (){var a=H.toArray(arguments),s=a[0].split("%s"),p=a.slice(1).concat([""]),c=0;return s.map(function(t){return t + p[c++];}).join("");},
  mulString:  function (s, l){return new Array(l+1).join(s);},
  escapeRex:  function (s){return s.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");},
  letterRange:function (r){return H.range(r.charCodeAt(0), r.charCodeAt(1)+1).map(function(i){return String.fromCharCode(i);}).join("");},
  findAll:    function (str, s){var idxs=[],idx,p=0;while((idx=str.indexOf(s,p))>-1){idxs.push(idx);p=idx+1;}return idxs;},
  tab:        function (s,l){l=l||8;s=new Array(l+1).join(" ")+s;return s.substr(s.length-l);},
  replaceAll: function (find, replace, str) {return str.replace(new RegExp(H.escapeRex(find), "g"), replace);},
  endsWith:   function (str, end){var l0=str.length,l1=end.length; return str.slice(l0-l1,l0) === end;},
  noun:       function (s){return s[0].toUpperCase()+s.slice(1).toLowerCase();},
  // padZero:    function (num, len){len = len || 2; num = "0000" + num; return num.substr(num.length-2, 2);},
  padZero:    function (n, i){i=i||2;return (1e15+n+"").slice(-i);},
  spark:      function (a,b,c,d,e){b=a.slice().sort();c="";for(d=0;d<(e=b.length);c+=["_","▁","▃","▅","▆","█"][-~(4*(a[d++]-b[0])/(b[e-1]-b[0]))]);return c;},
  
  // html
  urlquery:   function (a,b,c,d,e){
    for(b=/[?&]?([^=]+)=([^&]*)/g,c={},e=decodeURIComponent; 
      (d=b.exec(a.replace(/\+/g," "))); 
      c[e(d[1])]=e(d[2])
      ); 
      return c;},
  spinner:    function (a){function b(){
    a.innerHTML="◴◷◶◵".charAt(b=-~b%4);}
    setInterval(b,250/(a||1));
    b(a=document.createElement("b"));
    return a;},

  // objects
  // each:       function (o,fn){var a;for(a in o){if(o.hasOwnProperty(a)){fn(a,o[a]);}}},
  // attribs:    function (o){var a,n=[];for(a in o){if(o.hasOwnProperty(a)){n.push(a);}}return n;},
  // count:      function (o){var attr,cnt=0;for(attr in o){if (o.hasOwnProperty(attr)){cnt+=1;}}return cnt;},
  // extend:     function (o,e){var a; for(a in e){if(e.hasOwnProperty(a)){o[a]=H.deepcopy(e[a]);}}return o;},
  // extend:     function (o,e){var a; for(a in e){if(e.hasOwnProperty(a)){o[a]=(e[a]);}} return o;},
  clone:      function (o){var e,n={};for(e in o){n[e]=o[e];}return n;},
  firstAttr:  function (o){var attr; for (attr in o) {if (o.hasOwnProperty(attr)) {return attr;} } return undefined;},
  countAttrs: function (o){var a,c=0;for(a in o){if(o.hasOwnProperty(a)){c+=1;}}return c;},
  deepcopy:   function (obj){return JSON.parse(JSON.stringify(obj));},
  isEmpty:    function (o){var p;for(p in o){if(o.hasOwnProperty(p)){return false;}}return true;},
  prettify:   function (o){return JSON.stringify(o).split("\"").join("");},
  // map:        function (o, fn){var a,r={};for(a in o){if(o.hasOwnProperty(a)){r[a]=(typeof fn==='function')?fn(a,o[a]):fn;}}return r;},
  transform:  function (o, fn){var r={}; H.each(o,function(k,v){var [ra,rv]=fn(k,v);r[ra]=rv;});return r;},
  test:       function (o, s){
    var p = 0, as = s.split("."), l = as.length -1;
    while (o[as[p]] !== undefined) {
      o = o[as[p]];
      if(p === l){return o;}
      p +=1;
    }
    return undefined;
  },
  mixin:      function(){
    var o = {}, mx = Array.prototype.slice.call(arguments, 0);
    mx.forEach(m => Object.keys(m).forEach(k => o[k] = m[k]));
    return o;
  },
  dropcopy:   function(o, a){
    var out = {};
    Object.keys(o).forEach(k => {
      if (a.indexOf(k) === -1){
        out[k] = o[k];
      }
    });
    return out;
  },

  // Arrays
  toArray:    function (a){return Array.prototype.slice.call(a);},
  delete:     function (a, fn){
    // check: http://stackoverflow.com/a/18885102/515069
    var i=0,o=0;while(a[i]!==undefined){if(fn(a[i])){a.splice(i,1);o++;}else{i++;}}return o;
  },
  contains:   function (a, e){return a.indexOf(e)!==-1;},
  toFixed:    function (a, n){ n=n||1;return a.map(function(n){return n.toFixed(1);});},
  rotate:     function (a, n){n = n % a.length; return a.concat(a.splice(0,n));},
  // unique:     function (a){var u=[];a.forEach(function(i){if(u.indexOf(i)===-1){u.push(i);}});return u;},
  sample:     function (a, n){var l=a.length;n=n||1;return H.range(n).map(function(){return a[~~(Math.random() * l)];});},
  removeAll:  function (a, v){var i,j,l;for(i=0,j=0,l=a.length;i<l;i++) {if(a[i]!==v){a[j++]=a[i];}}a.length=j;},
  remove:     function (a, e){var i=a.indexOf(e); if (i!==-1){a.splice(i, 1);}},
  consume:    function (a, fn){while(a.length){fn(a.shift());}},
  flatten:    function (a){return Array.prototype.concat.apply([], a);},
  pushUnique: function (a, e){if(a.indexOf(e)===-1){a.push(e);}return a;},
  pushflat:   function (a, b){b.forEach(i => a.push(i));},
  equal:      function (a, b){return JSON.stringify(a) === JSON.stringify(b);},
  max:        Function.prototype.apply.bind(Math.max, null),
  min:        Function.prototype.apply.bind(Math.min, null),
  mean:       function (a){return a.reduce(function(s,x){return (s+x);},0)/a.length;},
  median:     function (a){var al=a.length,m=~~(a.sort().length/2);return !al?null:al%2?a[m]:(a[m-1]+a[m])/2;},
  mode:       function (a){
    var i, n, cnt = {}, mode = [], max = 0;
    for (i in a) {
      n = a[i];
      cnt[n] = cnt[n] === undefined ? 0 : cnt[n] +1;
      if (cnt[n] === max){mode.push(n);}
      else if (cnt[n] > max) {max = cnt[n]; mode = [n];}
    }
    return mode; 
  },
  intersect:  function (a,b){
    var ai=0,bi=0,al=a.length,bl=b.length,r=[];a=a.sort();b=b.sort();
    while( (ai < al) && (bi < bl) ){
      if      (a[ai] < b[bi] ){ ai++; }
      else if (a[ai] > b[bi] ){ bi++; }
      else /* they're equal */ {
        r.push(a[ai]);
        ai++;
        bi++;
    }}return r;
  },  
  toRLE:      function(a){
      
    var 
      i, prev, count = 1, len = a.length, typ = (
        a instanceof Uint8ClampedArray ? "Uint8ClampedArray" :
        a instanceof Int8Array    ? "Int8Array"    :
        a instanceof Uint8Array   ? "Uint8Array"   :
        a instanceof Int16Array   ? "Int16Array"   :
        a instanceof Uint16Array  ? "Uint16Array"  :
        a instanceof Int32Array   ? "Int32Array"   :
        a instanceof Uint32Array  ? "Uint32Array"  :
        a instanceof Float32Array ? "Float32Array" :
        a instanceof Float64Array ? "Float64Array" : 
        Array.isArray(a)          ? "Array"        : 
          null
      ), 
      rle  = [typ],
      push = (amount, item) => rle.push( amount === 1 ? item : [count, item]);
    
    for (count = 1, prev = a[0], i = 1; i < len; i++) {
      if (a[i] !== prev) {
        push(count, prev);
        count = 1;
        prev = a[i];
      } else {count++;}
    }
    
    push(count, prev);
    return rle;

  },
  fromRLE:    function(rle){
    var i, j, out = [], len = rle.length, typ = rle[0];
    for (i=1;i<len;i++){
      if (Array.isArray(rle[i])){
        for (j=0;j<rle[i][0];j++){
          out.push(rle[i][1]);
        }
      } else {
        out.push(rle[i]);
      }
    }
    return (
      typ === "Uint8ClampedArray" ? new Uint8ClampedArray(out) : 
      typ === "Int8Array"    ? new Int8Array(out) : 
      typ === "Uint8Array"   ? new Uint8Array(out) : 
      typ === "Int16Array"   ? new Int16Array(out) : 
      typ === "Uint16Array"  ? new Uint16Array(out) : 
      typ === "Int32Array"   ? new Int32Array(out) : 
      typ === "Uint32Array"  ? new Uint32Array(out) : 
      typ === "Float32Array" ? new Float32Array(out) : 
      typ === "Float64Array" ? new Float64Array(out) :
        out
    );

  },

  // functions
  binda:      function(fn, obj, a){
    // return fn.bind.apply(obj, [obj].concat(args));
    // return Function.prototype.bind.apply(fn, [obj].concat(args));
    var al = a.length;
    return (
      al === 0 ? fn.bind(obj) :
      al === 1 ? fn.bind(obj, a[0]) :
      al === 2 ? fn.bind(obj, a[0], a[1]) :
      al === 3 ? fn.bind(obj, a[0], a[1], a[2]) : 
      al === 4 ? fn.bind(obj, a[0], a[1], a[2], a[3]) : 
        undefined
    );
  },
  fnBody: function (fn){

    var body, source = fn.toString();
    
    // assuming function
    if (source.indexOf("return") !== -1){
      body = source.slice(source.indexOf("return") + 6, source.lastIndexOf("}")).trim();
      
    // assuming lambda
    } else if (source.indexOf("=>") !== -1){
       body = source.slice(source.indexOf("=>") + 2).trim();
      
    // assuming ignorance
    } else {
      throw "fnBody: can't handle that: " + source;
    }
    
    return body;
    
  },


  // graphics
  fillCircle: function(a, w, h, x, y, r, v){
    // fills a circle into 1 dimensional array, ints only
    var yy=0, xx=0, i=0, al = a.length|0;
    w=w|0;h=h|0;x=x|0;y=y|0;r=r|0;v=v|0;
    for(yy =-r; yy<=r; yy++){
      for(xx=-r; xx<=r; xx++){
        if(xx*xx+yy*yy <= r*r){
          i = (x + xx) * h + y + yy;
          if (i >= 0 && i < al){
            a[i] = v;
    }}}}
  },
  // http://stackoverflow.com/questions/17136084/checking-if-a-point-is-inside-a-rotated-rectangle?rq=1
  // https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
  //   Separating Axis Theorem (SAT) explanation




  // ES6 Suite
  map:        function (o, fn){
    var r={}, isF = typeof fn==="function";
    Object.keys(o).forEach( k => {
      r[k]=(isF)?fn(k, o[k]):fn;
    });
    return r;
  },
  unique:     function (a){return [...Set(a)];},
  attribs:    function (o){return Object.keys(o);},
  count:      function (o){return Object.keys(o).length;},
  values:     function (o){return Object.keys(o).map(function(k){return o[k];});},
  // each:       function (o,fn){Object.keys(o).forEach(k => fn(k, o[k]));},
  // each:       function (o,fn){var i,k,a=Object.keys(o),al=a.length;for(i=0;i<al;i++){k=a[i];fn(k, o[k]);}},
  each:       function (){
    var 
      args = H.toArray(arguments),
      objs = args.slice(0, -1),
      fn   = args.slice(-1)[0];
      objs.forEach(o => {
        var i, k, a = Object.keys(o), al= a.length;
        for(i=0;i<al;i++){k=a[i];fn(k, o[k]);}
      });
  }


});


// http://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable

H.humanFileSize = function (bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(bytes < thresh) {return bytes + " B";}
    var units = si ? ["kB","MB","GB","TB","PB","EB","ZB","YB"] : ["KiB","MiB","GiB","TiB","PiB","EiB","ZiB","YiB"];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(bytes >= thresh);
    return bytes.toFixed(1)+" "+units[u];
};

H.interpolate = function (data, points){

  // http://www.hevi.info/2012/03/interpolating-and-array-to-fit-another-size/
  
  var newData = [],
      factor  = (data.length - 1) / (points -1),
      i, tmp, point;

  function linear(p1, p2, px) {return p1 + (p2 - p1) * px;}

  newData[0] = data[0];

  for (i=1; i<points -1; i++){
    tmp = i * factor;
    point = ~~tmp;
    newData[i] = linear(data[point], data[point +1], tmp - point);
  }

  newData[points -1] = data[data.length -1];

  return newData;

};

H.createRingBuffer = function(length, buffer, pointer, lastPointer){

  buffer      = buffer      || []; 
  pointer     = pointer     || 0;
  lastPointer = lastPointer || 0; 

  return {
    push : function(item){
      buffer[pointer] = item;
      lastPointer = pointer;
      pointer = (length + pointer +1) % length;
    },
    buf   : buffer,
    get   : function(key){return buffer[key];},
    last  : function(){return buffer[lastPointer];},
    max   : function(){return Math.max.apply(Math, buffer);},
    min   : function(){return Math.min.apply(Math, buffer);},
    sum   : function(){return buffer.reduce(function(a, b){ return a + b; }, 0);},
    avg   : function(){return buffer.reduce(function(a, b){ return a + b; }, 0) / length;},    
    trend : function(){return H.trend(buffer);},
    serialize: function(){return H.deepcopy([length, buffer, pointer, lastPointer]);}
  };
  
};

// http://dracoblue.net/dev/linear-least-squares-in-javascript/
// http://stackoverflow.com/questions/6195335/linear-regression-in-javascript
// return (a, b) that minimize
// sum_i r_i * (a*x_i+b - y_i)^2
H.trend = function(ax) {
  var i, x, y, al=ax.length,sumx=0, sumy=0, sumx2=0, sumy2=0, sumxy=0, sumr=0;
  for(i=0;i<al;i++){
      x = i; y = ax[i]; 
      sumr  += 1; 
      sumx  += x; sumx2 += (x*x);
      sumy  += y; sumy2 += (y*y); 
      sumxy += (x*y);
  }
  return (sumr*sumxy - sumx*sumy)/(sumr*sumx2-sumx*sumx);
};
H.regress = function(xyr)
{
    var i, 
        x, y, r,
        sumx=0, sumy=0, sumx2=0, sumy2=0, sumxy=0, sumr=0,
        a, b;

    for(i=0;i<xyr.length;i++)
    {   
        // this is our data pair
        x = xyr[i][0]; y = xyr[i][1]; 

        // this is the weight for that pair
        // set to 1 (and simplify code accordingly, ie, sumr becomes xy.length) if weighting is not needed
        r = xyr[i][2] || 1;  

        // consider checking for NaN in the x, y and r variables here 
        // (add a continue statement in that case)

        sumr  += r;
        sumx  += r*x;
        sumx2 += r*(x*x);
        sumy  += r*y;
        sumy2 += r*(y*y);
        sumxy += r*(x*y);
    }

    // note: the denominator is the variance of the random variable X
    // the only case when it is 0 is the degenerate case X==constant
    b = (sumy*sumx2 - sumx*sumxy)/(sumr*sumx2-sumx*sumx);
    a = (sumr*sumxy - sumx*sumy)/(sumr*sumx2-sumx*sumx);

    return [a, b];
};

H.list = function list(){
  var ap     = Array.prototype,
      arr    = ap.slice.call(arguments),
      copy   = Array.apply.bind(Array, Array, arr),
      slice  = ap.slice.bind(arr),
      concat = ap.concat.bind(arr),
      multiply = function(m){
        return concat.apply(null, Array.apply(null, {length: m -1}).map(()=>arr));
      };
  // console.log("arr", arr);
  return new Proxy(arr, {
      get: function(proxy, name){
        // console.log("proxy", proxy, name);
        return (
          proxy[name] !== undefined ? proxy[name] : 
          name === "nil"      ? !proxy.length :
          name === "head"     ? list.apply(null, slice(0, 1)) :
          name === "tail"     ? list.apply(null, slice(1)) :
          name === "last"     ? list.apply(null, slice(-1)) :
          name === "inverse"  ? list.apply(null, copy().reverse()) :
          name === "multiply" ? function(m){
            return list.apply(null, multiply(m));} :
          name === "append"   ? function(){
            return list.apply(null, concat(ap.slice.call(arguments)));} :
          name === "prepend"  ? function(){
            return list.apply(null, ap.slice.call(arguments).concat(proxy));} :
          name === "string"   ? "[list " + proxy.join(", ") + "]" :
            null
        );
      }
  });  
};

// http://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array-in-javascript
// shocks jsLint
H.shuffle = function(a){
  var j, x, i;
  for(j, x, i = a.length; i; j = Math.floor(Math.random() * i), x = a[--i], a[i] = a[j], a[j] = x);
  return a;
};


return H; }(HANNIBAL);


// http://sroucheray.org/blog/2009/11/array-sort-should-not-be-used-to-shuffle-an-array/
// *
//  * Add a shuffle function to Array object prototype
//  * Usage :
//  *  var tmpArray = ["a", "b", "c", "d", "e"];
//  *  tmpArray.shuffle();
//  */
// Array.prototype.shuffle = function (){
//     var i = this.length, j, temp;
//     if ( i == 0 ) return;
//     while ( --i ) {
//         j = Math.floor( Math.random() * ( i + 1 ) );
//         temp = this[i];
//         this[i] = this[j];
//         this[j] = temp;
//     }
// };/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, HANNIBAL_DEBUG, uneval, print */

/*--------------- D E B U G  --------------------------------------------------

  global functions for debugging, mainly to output to STD/dbgView
  http://trac.wildfiregames.com/wiki/Logging

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/

// caller not allowed :( http://trac.wildfiregames.com/ticket/487
// var debC = new Function("print ('> ' + debC.caller.name); 
// print(H.format.apply(H, H.toArray(arguments)));");

/* SNIPPETS */ 
  // exportObject(gameState, "gameState");       // ERROR cyclic object value
  // exportObject(sharedScript, "sharedScript"); // ERROR cyclic object value

  // exportObject(this.settings.templates, "templates");
  // exportObject(ss._techTemplates, "techtemplates")
  // exportObject(sharedScript.playersData, "players");
  // exportObject(sharedScript._entityMetadata, "metadata");
  // exportObject(sharedScript.passabilityMap, "passabilityMap"); 
  // exportObject(sharedScript.territoryMap, "territoryMap"); 
  // exportObject(sharedScript.passabilityClasses, "passabilityClasses"); 

  // dumpPassability(this.map, ss.passabilityMap);



HANNIBAL = (function(H){

  H.extend(H, {

    logFn: function (fn){return fn.toString().split("\n").join("").slice(0, 80) + "|...";},

    deb: function(/* id, msg */){

      // print("H.deb: args: " + uneval(arguments) + "\n");

      var 
        args = H.toArray(arguments), al = args.length,
        id   = (args[0] && H.isInteger(args[0])) ? args[0] : 0,
        empty = ["      :\n" + id + "::      :"],
        DEB  = HANNIBAL_DEBUG && HANNIBAL_DEBUG.bots ? HANNIBAL_DEBUG.bots[id] : {},
        msg = H.format.apply(null, (
          (al === 0)             ? empty            : // no args
          (al  >  0 && id === 0) ? args.slice(0)    : // msg given as 0
          (al === 1 && id  >  0)   ? empty          : // only id, no msg
          (al   > 1 && id  >  0 && args[1] === undefined)     ? empty            : // id + []
          (al   > 1 && id  >  0 && args.slice(1).length > 0)  ? args.slice(1)    : // id + [msg, ...]
            print("ERROR: in H.deb: args: " + uneval(arguments) + "\n\n") // else 
        )) + "\n",
        prefix   = msg.substr(0, 7).toUpperCase(),
        deblevel = DEB.log || H.Config.deb || 0,
        msglevel = (
          prefix === "ERROR :" ? 1 :
          prefix === "WARN  :" ? 2 :
          prefix === "INFO  :" ? 3 :
            4
        );

      if (msglevel <= deblevel){print(id + "::" + msg);}

    },
    printf: function(){
      print(H.format.apply(H, arguments) + "\n");
    },
    logStart: function(ss, gs, settings){

      var H = HANNIBAL, id = settings.player;

      H.deb("------: LAUNCHER.CustomInit: Players: %s, PID: %s, difficulty: %s", H.count(ss.playersData), id, settings.difficulty);
      H.deb("      :");
      H.deb("     A:     map from DEBUG: %s / %s", H.Debug.map ? H.Debug.map : "unkown", ss.gameType);
      H.deb("     A:                map: w: %s, h: %s, c: %s, cells: %s", ss.passabilityMap.width, ss.passabilityMap.height, ss.circularMap, gs.cellSize);
      H.deb("     A:          _entities: %s [  ]", H.count(ss._entities));
      H.deb("     A:         _templates: %s [  ]", H.count(ss._templates));
      H.deb("     A:     _techTemplates: %s [  ]", H.count(ss._techTemplates));
      H.deb("     H: _techModifications: %s [%s]", H.count(ss._techModifications[id]), H.attribs(ss._techModifications[id]));
      H.deb("     H:     researchQueued: %s [  ]", H.count(ss.playersData[id].researchQueued));
      H.deb("     H:    researchStarted: %s [  ]", H.count(ss.playersData[id].researchStarted));
      H.deb("     H:    researchedTechs: %s [%s]", H.count(ss.playersData[id].researchedTechs), H.attribs(ss.playersData[id].researchedTechs).join(", "));
      H.deb("     A:       barterPrices: %s", H.prettify(ss.barterPrices));

    },
    logPlayers: function(players){

      var 
        H = HANNIBAL, tab = H.tab, msg = "", head, props, format, tabs,
        fmtAEN = item => item.map(b => b ? "1" : "0").join("");

      H.deb();

      head   = "name, team, civ, phase,      pop,   ally,    enmy,      neut, colour".split(", ");
      props  = "name, team, civ, phase, popCount, isAlly, isEnemy, isNeutral, colour".split(", ");
      tabs   = [  10,    6,   8,    10,        5,      6,       6,         6, 20];
      format = {
        isAlly:    fmtAEN,
        isEnemy:   fmtAEN,
        isNeutral: fmtAEN
      };

      H.zip(head, tabs, function(h, t){msg += tab(h, t);});
      H.deb("PLAYER: " + msg);

      H.each(players, function(id, player){
        msg = "";
        H.zip(props, tabs, function(p, t){
          msg += (format[p]) ? tab(format[p](player[p]), t) : tab(player[p], t);
        });    
        H.deb("     %s: %s", id, msg);
      });

    },
    diffJSON: function (a, b) {

      // https://github.com/paldepind/dffptch
      
      var 
        O = Object, keys = O.keys,
        aKey, bKey, aVal, bVal, rDelta, shortAKey, 
        aKeys = keys(a).sort(),
        bKeys = keys(b).sort(),
        delta = {}, adds = {}, mods = {}, dels = [], recurses = {},
        aI = 0, bI = 0;

      // Continue looping as long as we haven't reached the end of both keys lists

      while(aKeys[aI] !== undefined || bKeys[bI]  !== undefined || false) {
        
        aKey = aKeys[aI]; 
        bKey = bKeys[bI];
        aVal = a[aKey];
        bVal = b[bKey];
        shortAKey = String.fromCharCode(aI+48);

        if (aKey == bKey) {

          // We are looking at two equal keys this is a
          // change – possibly to an object or array
          
          if (O(aVal) === aVal && O(bVal) === bVal) {
          
            // Find changs in the object recursively
            rDelta = H.diffJSON(aVal, bVal);
          
            // Add recursive delta if it contains modifications
            if (keys(rDelta)) {recurses[shortAKey] = rDelta;}
          
          } else if (aVal !== bVal) {
            mods[shortAKey] = bVal;
          
          }
          
          aI++; bI++;

        } else if (aKey > bKey || !aKey) {
          // aKey is ahead, this means keys have been added to b
          adds[bKey] = bVal;
          bI++;

        } else {
          // bKey is larger, keys have been deleted
          dels.push(shortAKey);
          aI++;

        }
      }

      // We only add the change types to delta if they contains changes
      if (dels[0]) delta.d = dels;
      if (keys(adds)[0]) delta.a = adds;
      if (keys(mods)[0]) delta.m = mods;
      // if (keys(recurses)[0]) delta.r = recurses;
      
      return delta;

    },

    logObject: function(o, msg){
      var inst = "unidentified";
      msg = msg || "";
      H.deb();
      H.deb("Object [%s] : attributes: %s, comment: %s", inst, Object.keys(o).length, msg);
      if (o.constructor){
        H.deb("Object: %s", H.getAttribType("constructor", o.constructor));
      }
      H.logObjectShort(o);
      H.deb("Object.prototype: %s attributes", H.count(Object.getPrototypeOf(o)));
      if (H.count(Object.getPrototypeOf(o))){
        H.logObjectShort(Object.getPrototypeOf(o));
      }
      H.deb("------: logObject end");
    },
    logObjectShort: function(o){
      H.attribs(o)
        .sort()
        .forEach(a => H.deb(this.getAttribType(a, o[a])));
    },
    getAttribType: function(name, value){

      var keys, body;

      function toString(value){
        return value.toString ? value.toString() : value+"";
      }

      switch (typeof value) {
        case "string":
        case "number":
        case "undefined":
        case "boolean":   return H.format("  %s: %s (%s)", name, (typeof value).toUpperCase(), value);
        case "object":
          if (Array.isArray(value)){
            return H.format("  %s: ARRAY [%s](%s, ...)", name, value.length, value.map(toString).slice(0, 5).join(", "));
          } else if (value === null) {
            return H.format("  %s: NULL", name);
          } else {
            keys = Object.keys(value);
            return H.format("  %s: OBJECT [%s](%s, ...)", name, keys.length, keys.slice(0, 5).join(", "));
          }
        break;
        case "function":
          body = value.toString()
            .split("\n").join("")
            .split("\r").join("")
            .split("\t").join(" ")
            .split("     ").join(" ")
            .split("    ").join(" ")
            .split("   ").join(" ")
            .split("  ").join(" ")
            .slice(0, 100);
          return H.format("  %s: FUNCTION %s (...)", name, body);
      }
      return "WTF";
    },

  });


return H; }(HANNIBAL));


// used in JSON Export
// function logg(){
//   var args = arguments;
//   if (args.length === 0) {args = ["//"];}
//   if (args.length === 1) {args = ["%s", args[0]];}
//   print(HANNIBAL.format.apply(HANNIBAL, args) + "\n");
// }



// var debTable = function (header, table, sort){
//   // has dependencies
//   var 
//     H = HANNIBAL,
//     line, lengths = [],
//     cols = table[0].length,
//     space = H.mulString(" ", 100);

//   H.loop(cols, () => lengths.push(0));

//   table.forEach(row => {
//     H.loop(cols, col => {
//       var str = String(row[col -1]);
//       if (str.length > lengths[col -1]){lengths[col -1] = str.length;}
//     });
//   });

//   deb("------: start %s", header || "table");
//   table
//     .sort((a,b) => a[sort] < b[sort] ? -1 : 1)
//     .forEach((row, i) => {
//       line = H.format("      : %s ", H.tab(i, 4));
//       row.forEach((item, col) => line += (item + space).slice(0, lengths[col] + 1));
//       deb(line);
//     });

//   deb("------: %s ", header || "table");


// };

// function exportJSON (obj, filename){

//   var 
//     H = HANNIBAL,
//     file  = H.format("/home/noiv/.local/share/0ad/mods/hannibal/explorer/data/%s.export", filename),
//     lines = JSON.stringify(obj, null, "  ").split("\n"),
//     count = lines.length;

//   function logg(){
//     print ( arguments.length === 0 ? 
//       "#! append 0 ://\n" : 
//       "#! append 0 :" + H.format.apply(H, arguments) + "\n"
//     );
//   }    

//   deb();
//   deb("EXPORT: ", filename);
//   deb("EXPORT: %s", file);

//   print(H.format("#! open 0 %s\n", file));
//   logg("// EXPORTED %s at %s", filename, new Date());

//   lines.forEach(line => logg(line));
//   // lines.forEach(logg);
  
//   logg("// Export end of %s", filename);
//   print("#! close 0\n");
//   deb("EXPORT: Done");

//   return count;

// }

// function logPrettyJSON(obj, header){

//   var attr, json;

//   if(header){deb(header);}

//   json = JSON.stringify(obj);

//   if (json.length < 80){
//     deb(json);
//   } else {
//     Object.keys(obj).sort().forEach(attr => {
//       logPrettyJSON(obj[attr]);
//     });
//   }

// }


// function logJSON(obj, header){
//   var lines = JSON.stringify(obj, null, "  ").split("\n");
//   deb("   LOG: JSON: %s", header);
//   lines.forEach(line => deb("      " + line));
//   deb("   LOG: ----------");
// }


// function exportTemplates (tpls){

//   var 
//     H = HANNIBAL,
//     filePattern = "/home/noiv/.local/share/0ad/mods/hannibal/explorer/data/templates-json.export";

//   function logg(){
//     print ( arguments.length === 0 ? 
//       "#! append 0 ://\n" : 
//       "#! append 0 :" + H.format.apply(H, arguments) + "\n"
//     );
//   }    

//   deb();
//   deb("EXPORT: templates");
//   deb("EXPORT: %s", filePattern);

//   print(H.format("#! open 0 %s\n", filePattern));
//   logg("// EXPORTED templates at %s", new Date());
//   JSON.stringify(tpls, null, "  ")
//     .split("\n")
//     .forEach(line => {
//       logg(line);
//     });
//   logg("// Export end of templates");
//   print("#! close 0\n");
//   deb("EXPORT: Done");

// }

// function exportTechTemplates (tpls){

//   var 
//     H = HANNIBAL,
//     filePattern = "/home/noiv/.local/share/0ad/mods/hannibal/explorer/data/techtemplates-json.export";

//   function logg(){
//     print ( arguments.length === 0 ? 
//       "#! append 0 ://\n" : 
//       "#! append 0 :" + H.format.apply(H, arguments) + "\n"
//     );
//   }    

//   deb();
//   deb("EXPORT: techtemplates");
//   deb("EXPORT: %s", filePattern);

//   print(H.format("#! open 0 %s\n", filePattern));
//   logg("// EXPORTED techtemplates at %s", new Date());
//   JSON.stringify(tpls, null, "  ")
//     .split("\n")
//     .forEach(line => {
//       logg(line);
//     });
//   logg("// Export end of techtemplates");
//   print("#! close 0\n");
//   deb("EXPORT: Done");

// }

// function exportTree (tree) {

//   var 
//     t, procs, prods,
//     tt = this.nodes, tpls = H.attribs(this.nodes),
//     filePattern = "/home/noiv/Desktop/0ad/tree-%s-json.export";

//   function logg(){
//     print ( arguments.length === 0 ? 
//       "#! append 0 ://\n" : 
//       "#! append 0 :" + H.format.apply(H, arguments) + "\n"
//     );
//   }   

//   deb("  TREE: Export start ...");
//   print(H.format("#! open 0 %s\n", H.format(filePattern, this.civ)));
//   logg("// EXPORTED tree '%s' at %s", this.civ, new Date());

//   tpls.sort((a, b) => tt[a].order - tt[b].order);

//   tpls.forEach(function(tpln){

//     t = tt[tpln];

//     logg("     T:   %s %s %s %s", t.order, t.type, t.phase, t.name);
//     logg("     T:        d: %s,  o: %s", H.tab(t.depth, 4), H.tab(t.operations, 4));
//     logg("     T:        %s", t.key);
//     logg("     T:        reqs: %s", t.requires || "none");
//     logg("     T:        flow: %s", t.flow ? JSON.stringify(t.flow) : "none");

//     logg("     T:        verb: %s", t.verb || "none");
//     prods = H.attribs(t.producers);
//     if (prods.length){
//       prods.forEach(p => logg("     T:          %s", p));
//     } else {
//       logg("     T:        NO PRODUCER");
//     }

//     logg("     T:        products: %s", t.products.count);
//     if (t.products.count){
//       ["train", "build", "research"].forEach(verb => {
//         procs = H.attribs(t.products[verb]);
//         if (procs.length){
//           logg("     T:          %s", verb);
//           procs.forEach(p => logg("     T:            %s", p));
//         }
//       });
//     }

//   });

//   print("#! close 0\n");
//   deb("  TREE: Export Done ...");

// }


// function exportStore(civs){

//   // log history > 3,000 per civ, athens~2500, CRs not enforced.

//   var filePattern = "/home/noiv/.local/share/0ad/mods/public/simulation/ai/hannibal/explorer/data/%s-01-json.export";

//   function logg(){
//     print ( arguments.length === 0 ? 
//       "#! append 0 ://\n" : 
//       "#! append 0 :" + H.format.apply(H, arguments) + "\n"
//     );
//   }    

//   deb();deb();deb("EXPORT: %s", civs);

//   civs.forEach(function(civ){
//     print(H.format("#! open 0 %s\n", H.format(filePattern, civ)));
//     logg("// EXPORTED culture '%s' at %s", civ, new Date());
//     var culture = new H.Culture(civ), store = culture.store;
//     culture.loadDataNodes();           // from data to triple store
//     culture.readTemplates();           // from templates to culture
//     culture.loadTechTemplates();       // from templates to triple store
//     culture.loadTemplates();           // from templates to triple store
//     culture.finalize();                // clear up
//     logg("var store_%s = {", civ);
//       logg("  verbs: %s,", JSON.stringify(store.verbs));
//       logg("  nodes: {");
//       H.each(store.nodes, function(name, value){
//         delete value.template;
//         logg("    '%s': %s,", name, JSON.stringify(value));
//       });
//       logg("  },");
//       logg("  edges: [");
//       store.edges.forEach(function(edge){
//         logg("    ['%s', '%s', '%s'],", edge[0].name, edge[1], edge[2].name);
//       });
//       logg("  ],");
//     logg("};");
//     logg("// Export end of culture %s", civ);
//     print("#! close 0\n");
//   });


// }

  // if (head === "ERROR :" && level > 0){
  //   print(msg);
  // } else if (head === "WARN  :" && level > 1){
  //   print(msg);
  // } else if (head === "INFO  :" && level > 1){
  //   print(msg);
  // } else if (level > 2){
  //   print(msg);
  // } else {
  //   // do nothing
  // }


// function debug(){
//   if (HANNIBAL.Config.debug){
//     warn(H.format.apply(H, H.toArray(arguments)));
//   }
// }
// function debugE(){
//   if (HANNIBAL.Config.debug){
//     error(H.format.apply(H, H.toArray(arguments)));
//   }
// }




// var debTemplates = function(templates){

//   var counter = 0;

//   deb(" TEMPL: %s ----------------------", H.attribs(templates).length);

//   // function getAttr(o){
//   //   if (o["Armour"] && o["Armour"]["Hack"] && ~~o["Armour"]["Hack"] > 7){
//   //     return(H.format("Armour.Hack: %s", o["Armour"]["Hack"]));
//   //   } else {
//   //     return false;
//   //   }

//   // }

//   // logObject(templates, "templates");

//     // Object [unidentified] : templates  ---------------
//     // Object  constructor: function Object() {[native code]}
//       // campaigns/army_mace_hero_alexander: OBJECT (@parent, AIProxy, Armour, Attack, Cost, ...)[27]
//       // campaigns/army_mace_standard: OBJECT (@parent, AIProxy, Armour, Attack, Cost, ...)[26]
//       // campaigns/army_spart_hero_leonidas: OBJECT (@parent, AIProxy, Armour, Attack, Cost, ...)[27]


//   var props = {};

//   H.each(templates, function(key, tpl){

//     if (counter < 30) {
//       // logObjectShort(tpl);
//       // if (getAttr(tpl)){
//       //   deb("  > %s", key);
//       //   deb("      @%s", tpl["@parent"]);
//       //   deb("      ", getAttr(tpl))
//       //   counter += 1;
//     }

//     H.attribs(tpl).forEach(function(attr){

//       if (props[attr] === undefined) {
//         props[attr]  = 0;
//       } else {
//         props[attr]  += 1;        
//       }

//     });



//   });

//   var sorted = H.attribs(props).sort(function(a, b){return props[b] > props[a]; });

//   sorted.forEach(function(attr){
//     deb("  %s: %s", attr, props[attr]);
//   });

//   deb(" TEMPL: ----------------------");

// };



// var logError = function(e, msg){
//   // used in try/catch
//   deb("  ");
//   deb(" Error: %s | %s", msg||"", e.message);
//   deb("      : %s [%s]", e.fileName, e.lineNumber);
//   deb("  ");

// };

// // loggable functions
// function logFn(fn){return fn.toString().split("\n").join("").slice(0, 80);}

// // from events
// var logDispatcher = function (){
//   deb("  "); deb("      : Dispatcher");
//   H.each(H.Dispatcher, function(id, ar){
//     var tpl = H.Entities[id] ? H.Entities[id]._templateName : "???";
//     deb("  %s: len: %s, tpl: %s", H.tab(id, 4), ar.length, tpl);
//   });
//   deb("  "); 
// };


// var dumpPassability = function(mapname, passability){

//   // dumps all bits into single files
//   // works nicely with Gimp's File > open as Layers

//   var 
//     i, b, w = passability.width, h = passability.height, 
//     pass = passability.data, len = pass.length;

//   deb(); deb("DUMP  : passability %s, %s, %s", mapname, w, h);

//   [0, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512].forEach(b => {

//     var data = [];
//     i = len;
//     while (i--){
//       data[i] = pass[i] & b ? 128 : 255; // set bits are grey, not set white
//     }
//     data.length = len;
//     Engine.DumpImage(mapname + "-passability-" + b + ".png", data, w, h, 255);    

//   });

// };






// /* play area */

// try {

//   // deb("------: Techs");
//   // H.each(H.TechTemplates, function(name, tech){
//   //   if (tech.modifications){
//   //     var aff = tech.affects ? uneval(tech.affects) : "";
//   //     var req = tech.requirements ? uneval(tech.requirements) : "";
//   //     var mod = tech.modifications ? uneval(tech.modifications) : "";
//   //     deb("%s;%s;%s;%s;%s", name, tech.genericName||"", req, aff, mod);
//   //   }
//   // });
//   // deb("------: Techs end");


// } catch(e){logError(e, "play area");} 

/* end play area */

// /* Export functions */

// if (false){
//   // activate to log tech templates
//   deb("-------- _techTemplates");
//   deb("var techTemplates = {");
//   H.attribs(ss._techTemplates).sort().forEach(function(tech){
//     deb("'%s': %s,", tech, JSON.stringify(ss._techTemplates[tech]));
//   });
//   deb("};");
//   deb("-------- _techTemplates");
//   H.Config.deb = 0;
// }

// /* list techs and their modifications */

// if (false){

//   deb();deb();deb("      : Technologies ---------");
//   var affects, modus, table = [];
//   H.each(H.Technologies, function(key, tech){
//     if (tech.modifications){
//       tech.modifications.forEach(function(mod){
//         modus = (
//           mod.add      !== undefined ? "add"      :
//           mod.multiply !== undefined ? "multiply" :
//           mod.replace  !== undefined ? "replace"  :
//             "wtf"
//         );
//         affects = tech.affects ? tech.affects.join(" ") : mod.affects ? mod.affects : "wtf";
//         table.push([H.saniTemplateName(key), mod.value, modus, mod[modus], affects]);
//       });
//     }
//   });
//   debTable("TEX", table, 1);
//   deb("      : end ---------");
//   H.Config.deb = 0;

// }

// /* end techs and their modifications */










// Object: playersData(me)  ---------------
//   cheatsEnabled: BOOLEAN (false)
//   civ: STRING (athen)
//   classCounts: OBJECT (Structure, ConquestCritical, Civic, Defensive, CivCentre, ...)[19]
//   colour: OBJECT (r, g, b, a, ...)[4]
//   entityCounts: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]
//   entityLimits: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]
//   heroes: ARRAY (, ...)[0]
//   isAlly: ARRAY (false, true, false, ...)[3]
//   isEnemy: ARRAY (true, false, true, ...)[3]
//   isMutualAlly: ARRAY (false, true, false, ...)[3]
//   isNeutral: ARRAY (false, false, false, ...)[3]
//   name: STRING (Player 1)
//   phase: STRING (village)
//   popCount: NUMBER (17)
//   popLimit: NUMBER (20)
//   popMax: NUMBER (300)
//   researchQueued: OBJECT (, ...)[0]
//   researchStarted: OBJECT (, ...)[0]
//   researchedTechs: OBJECT (phase_village, ...)[1]
//   resourceCounts: OBJECT (food, wood, metal, stone, ...)[4]
//   state: STRING (active)
//   statistics: OBJECT (unitsTrained, unitsLost, unitsLostValue, enemyUnitsKilled, enemyUnitsKilledValue, ...)[21]
//   team: NUMBER (-1)
//   teamsLocked: BOOLEAN (false)
//   techModifications: OBJECT (, ...)[0]
//   trainingBlocked: BOOLEAN (false)
//   typeCountsByClass: OBJECT (Structure, ConquestCritical, Civic, Defensive, CivCentre, ...)[19]


// keep that 
// logObject(API3, "API3");
// logObject(HANNIBAL, "HANNIBAL");
// logObject(gameState, "gameState");
// logObject(global, "global");
// logObject(Map, "Map");
// logObject(global.Engine, "Engine");
// logObject(this.entities, "entities");


// logObject(ss.resourceMaps['food'].map, "ss.resourceMaps['food'].map");
// logObject(ss.resourceMaps['food'], "ss.resourceMaps['food']");

// logObject(H.Bot.gameState.ai.territoryMap, "H.Bot.gameState.ai.territoryMap");

// logObject(ss._techTemplates['phase_city'], "phase_city");
// logObject(ss._techTemplates['phase_town_athen'], "phase_town_athen");
// logObject(ss._techTemplates['pair_gather_01'], "pair_gather_01");
// logObject(ss._techTemplates['heal_range'], "heal_range");
// logObject(ss._techTemplates['heal_temple'], "heal_temple");

 // logObject(H.Templates["units/athen_support_female_citizen"], "units/athen_support_female_citizen");

// logObject(ss._techTemplates, "ss._techTemplates");
// logObject(sharedScript, "sharedScript");
// logObject(sharedScript.gameState, "sharedScript.gameState");
// logObject(sharedScript.events, "events");
// logObject(sharedScript.playersData, "playersData");
// logObject(sharedScript.playersData[this.id], "playersData(me)");
// logObject(sharedScript.playersData[this.id], "Hannibal");
// logObject(sharedScript.playersData[this.id].statistics, "Statistics");
// logObject(EntityCollection, "EntityCollection"); // that's strange
// logObject(new Entity(sharedScript, entity), "EntityTemplate");
// logObject(sharedScript.passabilityClasses, "sharedScript.passabilityClasses");
// logObject(sharedScript.passabilityMap, "sharedScript.passabilityMap");
// logObject(sharedScript.territoryMap, "sharedScript.territoryMap");


// H.QRY("PAIR DISTINCT").execute("metadata", 5, 10, "paired techs");
// H.QRY("TECHINGAME").execute("metadata", 5, 20, "ingame techs with metadata");

// H.QRY("gather.lumbering.ironaxes").execute("metadata", 5, 10, "check");

// new H.HCQ(ts, "INGAME WITH metadata.opname = 'none'").execute("metadata", 5, 10, "all ingame entities");
// new H.HCQ(ts, "INGAME WITH id = 44").execute("metadata", 5, 10, "entity with id");
// new H.HCQ(ts, "INGAME").execute("position", 5, 10, "ingames with position");

// new H.HCQ(ts, "INGAME SORT < id").execute("metadata", 5, 80, "ingames with metadata");

// new H.HCQ(ts, "TECHINGAME").execute("metadata", 5, 20, "ingame techs with metadata");
// new H.HCQ(ts, "stone ACCEPTEDBY INGAME").execute("metadata", 5, 20, "stone drop");

// new H.HCQ(ts, "food.grain GATHEREDBY WITH costs.metal = 0, costs.stone = 0, costs.wood = 0 SORT < costs.food MEMBER DISTINCT HOLDBY INGAME").execute("json", 5, 10, "optional update test");

// new H.HCQ(ts, "civilcentre CONTAIN").execute("node", 5, 10, "civilcentre via class");
// new H.HCQ(ts, "food.grain PROVIDEDBY").execute("node", 5, 10, "civilcentre via class");
// new H.HCQ(ts, "food.grain PROVIDEDBY").execute("node", 5, 10, "civilcentre via class");

// new H.HCQ(ts, "structures.athen.civil.centre MEMBER").execute("node", 5, 10, "classes of civilcentre");

// new H.HCQ(ts, "food.grain PROVIDEDBY").execute("costs", 5, 10, "entities providing food.grain");
// new HCQ(ts, "HOLD CONTAIN").execute("node", 5, 10, "all garissonable entities");
// new HCQ(ts, "infantry HOLDBY").execute("node", 5, 10, "entities holding infantry");
// new HCQ(ts, "support, infantry HOLDBY").execute("node", 5, 10, "entities holding infantry, support");
// new HCQ(ts, "healer, hero").execute("", 5, 10, "classes: healer, hero");
// new HCQ(ts, "healer, hero CONTAIN").execute("costs", 5, 10, "entities from classes: healer, hero");
// new HCQ(ts, "healer, hero CONTAIN SORT > costs.metal").execute("costs", 5, 10, "entities from classes: healer, hero");
// new HCQ(ts, "infantry CONTAIN SORT > costs.metal").execute("costs", 5, 20, "entities from classes: healer, hero, sorted by metal");
// new HCQ(ts, "support, infantery HOLDBY SORT > capacity").execute("capacity", 5, 10, "entities holding: healer, hero, sorted by metal");
// new HCQ(ts, "food.grain GATHEREDBY WITH costs.metal = 0, costs.wood = 0").execute("costs", 5, 20, "entities holding: healer, hero, sorted by metal");
// new HCQ(ts, "food.grain PROVIDEDBY WITH civ = athen").execute("costs", 5, 20, "entities holding: healer, hero, sorted by metal");
// new HCQ(ts, "food.grain GATHEREDBY WITH costs.metal = 0, costs.wood = 0 MEMBER HOLDBY").execute("costs", 5, 20, "entities holding: healer, hero, sorted by metal");
// new HCQ(ts, "units.athen.support.female.citizen.house REQUIRE", 2).execute("node", 5, 10, "testing for required tech");
// new HCQ(ts, "DESCRIBEDBY").execute("node", 5, 10, "trainer for");
// new HCQ(ts, "INGAME").execute("node", 5, 10, "trainer for");
// new HCQ(ts, "units.athen.infantry.spearman.b TRAINEDBY").execute("node", 5, 10, "trainer for");
// new HCQ(ts, "units.athen.infantry.spearman.b TRAINEDBY INGAME").execute("node", 5, 10, "in game trainer for");
// new HCQ(ts, "units.athen.infantry.spearman.b TRAINEDBY DESCRIBEDBY").execute("node", 5, 10, "in game trainer for");
// new HCQ(ts, "food.grain GATHEREDBY WITH costs.metal = 0, costs.stone = 0, costs.wood = 0 SORT < costs.food").execute("costs", 5, 10, "in game trainer for");
/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*---------------  A I --------------------------------------------------------

  traditional AI methods, adjusted for speed, SpiderMonkey and ES6

  KMeans      : Credit: https://github.com/cmtt/kmeans-js, 
                License: MIT
  A*          : Credit: https://github.com/bgrins/javascript-astar
                License: https://raw.githubusercontent.com/bgrins/javascript-astar/master/LICENSE
  Binary Heap : Marijn Haverbeke, Credit: http://eloquentjavascript.net/appendix2.html
                License: http://creativecommons.org/licenses/by/3.0/
  Flow Field  : Corey Birnbaum, Credit: https://github.com/vonWolfehaus/FlowField

  V: 0.1, agentx, CGN, JUl, 2014

*/


HANNIBAL = (function(H){

  var deb = H.deb;

  H.AI.KMeans = (function () {

    /** Constructor */

    var kmeans = function () {
      this.kmpp = true;
      this.maxWidth   = 512;
      this.maxHeight  = 512;
      this.iterations = 0;
      this.converged  = false;
      this.maxIterations = 100;
      this.k = 0;
    };

    /** Resets k-means. */

    kmeans.prototype.reset = function () {
      this.iterations = 0;
      this.converged = false;
      this.points = [];
      this.centroids = [];
    };

    /** Measures the Manhattan distance between two points. */

    kmeans.prototype.distance =  function(a, b) {
      // return Math.sqrt( Math.pow(a.x - b.x, 2) +  Math.pow(a.y - b.y, 2) );
      // return Math.sqrt( (a.x - b.x) * (a.x - b.x) +  (z.y - b.z) * (a.z - b.z) );
      return (a.x - b.x) * (a.x - b.x) + (a.z - b.z) * (a.z - b.z);
    };

    /** Resets k-means and sets initial points*/

    kmeans.prototype.setPoints = function (points) {
      this.reset();
      this.points = points;
    };

    /** Guess the amount of centroids to be found by the rule of thumb */

    kmeans.prototype.guessK = function () {
      this.k = ~~(Math.sqrt(this.points.length*0.5));
    };

    /** Chooses random centroids */

    kmeans.prototype.chooseRandomCentroids = function () {
      var i;
      for (i = 0; i < this.k; ++i) {
        this.centroids[i] = {
          centroid : i,
          x : ~~(Math.random()*this.maxWidth),
          z : ~~(Math.random()*this.maxHeight),
          items : 0
        };
      }
    };

    /** Clusters the provided set of points. */

    kmeans.prototype.cluster = function (cb) {

      /** Iterate until converged or the maximum amount of iterations is reached. */

      var t0 = Date.now();

      while (!this.converged && (this.iterations < this.maxIterations)) {
        this.converged = true;
        this.iterations += 1;
        this.iterate();
        if(cb){cb(this.centroids);}
      }

      this.msecs = Date.now() - t0;

    };

    // /** Measure the distance to a point, specified by its index. */

    // kmeans.prototype.measureDistance =   function (i) {
    //   var self = this;
    //   return function ( centroid ) {
    //     return self.distance(centroid, self.points[i]);
    //   };
    // };

    /** Iterates over the provided points one time */

    kmeans.prototype.iterate = function () {

      var 
        i, l = this.points.length, sums = [], 
        centroid, point,
        sortByDistance = function(a, b){
          var da, db;
          da = (a.x - point.x) * (a.x - point.x) + (a.z - point.z) * (a.z - point.z);
          db = (b.x - point.x) * (b.x - point.x) + (b.z - point.z) * (b.z - point.z);
          return da - db;
        };

      /** When the result doesn't change anymore, the final result has been found. */

      /** Prepares the array of the  */

      for (i = 0; i < this.k; ++i) {
        sums[i] = { x : 0, z : 0, items : 0 };
      }

      /** Find the closest centroid for each point */

      for (i = 0; i < l; ++i) {

        point    = this.points[i];

        /** index of nearest centroid */

        centroid = this.centroids.sort(sortByDistance)[0].centroid;

        /**
         * When the point is not attached to a centroid or the point was
         * attached to some other centroid before, the result differs from the
         * previous iteration.
         */

        this.converged = (
          typeof point.centroid !== 'number' || point.centroid !== centroid  ? 
          false : this.converged
        );

        /** Attach the point to the centroid */

        point.centroid = centroid;

        /** Add the points' coordinates to the sum of its centroid */

        sums[centroid].x += point.x;
        sums[centroid].z += point.z;

        sums[centroid].items += 1; 

      }

      /** Re-calculate the center of the centroid. */

      for (i = 0; i < this.k; ++i) {
        if (sums[i].items > 0) {
          this.centroids[i].x = sums[i].x / sums[i].items;
          this.centroids[i].z = sums[i].z / sums[i].items;
        }
        this.centroids[i].items = sums[i].items;
      }

    };

    kmeans.prototype.initCentroids = function () {

      var i, k,cmp1, cmp2;

      var addIterator = function (x,y) { return x+y; };

      var reduce = function(t,c) {
          var u,v; 
          for (var i = (v=t[0],1); i < t.length;) v = c(v,t[i],i++,t); i<2 & u && u(); return v;};

      /**
       * When k-means++ is disabled, choose random centroids.
       */

      if (this.kmpp !== true) {
        this.chooseRandomCentroids();
        return;
      }

      /** K-Means++ initialization */

      /** determine the amount of tries */
      var D = [], ntries = 2 + Math.round(Math.log(this.k));

      /** 1. Choose one center uniformly at random from the data points. */

      var l = this.points.length;

      var p0 = this.points[ ~~(Math.random() * l) ];

      p0.centroid = 0;
      this.centroids = [ p0 ];

      /**
       * 2. For each data point x, compute D(x), the distance between x and
       * the nearest center that has already been chosen.
       */

      for (i = 0; i < l; ++i) {
        D[i] = Math.pow(this.distance(p0, this.points[i]), 2);
      }

      var Dsum = reduce(D, addIterator);
      // var Dsum = D.reduce(addIterator);

      /**
       * 3. Choose one new data point at random as a new center, using a
       * weighted probability distribution where a point x is chosen with
       * probability proportional to D(x)2.
       * (Repeated until k centers have been chosen.)
       */

      for (k = 1; k < this.k; ++k) {

        var bestDsum = -1, bestIdx = -1;

        for (i = 0; i < ntries; ++i) {
          var rndVal = ~~(Math.random() * Dsum);

          for (var n = 0; n < l; ++n) {
            if (rndVal <= D[n]) {
              break;
            } else {
              rndVal -= D[n];
            }
          }

          var tmpD = [];
          for (var m = 0; m < l; ++m) {
            cmp1 = D[m];
            cmp2 = Math.pow(this.distance(this.points[m],this.points[n]),2);
            tmpD[m] = cmp1 > cmp2 ? cmp2 : cmp1;
          }

          var tmpDsum = reduce(tmpD, addIterator);
          // var tmpDsum = tmpD.reduce(addIterator);

          if (bestDsum < 0 || tmpDsum < bestDsum) {
            bestDsum = tmpDsum; bestIdx = n;
          }
        }

        Dsum = bestDsum;

        var centroid = {
          x : this.points[bestIdx].x,
          z : this.points[bestIdx].z,
          centroid : k,
          items : 0
        };

        this.centroids.push(centroid);

        for (i = 0; i < l; ++i) {
          cmp1 = D[i];
          cmp2 = Math.pow(this.distance(this.points[bestIdx],this.points[i]), 2);
          D[i] = cmp1 > cmp2 ? cmp2 : cmp1;
        }
      }

    };

    return kmeans;

  })();

  /**
  * A graph memory structure used fo path finding
  * @param {Array} gridIn 2D array of input weights
  * @param {Object} [options]
  */

  H.AI.GraphNode = function (x, y, weight) {
    this.x = x;
    this.y = y;
    this.weight = weight;
    this.f = 0;
    this.g = 0;
    this.h = 0;
    this.index   = 0;
    this.visited = false;
    this.closed  = false;
    this.parent  = null;
  };

  H.AI.GraphFromFunction = function(grid, fnWeight){

    var
      graph = new H.AI.Graph(grid.data),
      node = null, y = 0, size = grid.size, x = size;

    while (x--) {
      graph.grid[x] = [];
      y = size; 
      while(y--) {
        node = new H.AI.GraphNode(x, y, fnWeight(x + y * size));
        graph.grid[x][y] = node;
        graph.nodes.push(node);
      }
    }
    // graph.clear();
    return graph;

  };


  H.AI.Graph = function (data, options) {

    options = options || {};
    
    this.size  = data.length; // only quadratic grids
    this.data  = data;
    this.nodes = [];
    this.grid  = [];

    // this.init();
    // this.clear();

  };

  H.AI.Graph.prototype = {
    constructor: H.AI.Graph,
    init: function() {
      var node = null, row = 0, y = 0, x = this.size;
      while (x--) {
        this.grid[x] = [];
        row = this.data[x];
        y = this.size; 
        while(y--) {
          node = new H.AI.GraphNode(x, y, row[y]);
          this.grid[x][y] = node;
          this.nodes.push(node);
        }
      }
      this.clear();
      return this;
    },
    clear: function() {
      var i, l = this.nodes.length, node;
      for (i=0; i<l; i++){
        node = this.nodes[i];
        node.f = 0;
        node.g = 0;
        node.h = 0;
        node.index   = 0;
        node.visited = false;
        node.closed  = false;
        node.parent  = null;
      }      
    },
    setNeighbors8: function(neighbors, node) {

      var x = node.x, y = node.y, grid = this.grid;

      neighbors[0] = grid[x-1][y];
      neighbors[1] = grid[x+1][y];
      neighbors[2] = grid[x][y-1];
      neighbors[3] = grid[x][y+1];

      neighbors[4] = grid[x-1][y-1];
      neighbors[5] = grid[x+1][y-1];
      neighbors[6] = grid[x-1][y+1];
      neighbors[7] = grid[x+1][y+1];

    },
    setNeighbors4: function(neighbors, node) {

      var x = node.x, y = node.y, grid = this.grid;

      neighbors[0] = grid[x-1][y];
      neighbors[1] = grid[x+1][y];
      neighbors[2] = grid[x][y-1];
      neighbors[3] = grid[x][y+1];

    }

  };

  function pathTo(node){
    var curr = node, path = [];
    while(curr.parent) {
      path.push(curr);
      curr = curr.parent;
    }
    return path.reverse();
  }

  // has hard coded pathfinder optimizations
  H.AI.BinaryHeap = function(){
    this.content = [];
    this.length  = 0;
  };
  
  H.AI.BinaryHeap.prototype = {
    constructor: H.AI.BinaryHeap,
    push: function(element) {
      element.index = this.length;               // is last
      this.content[this.length] = element;       // Add the new element to the end of the array.
      this.length += 1;                          // prep fo next
      this.sinkDown(element.index);              // Allow it to sink down.
    },
    pop: function() {

      var 
        content = this.content,
        result  = content[0],                    // Store the first element so we can return it later.
        end     = content[this.length -1];       // Get the element at the end of the array.

      // this.length -= 1;

      if (--this.length) {                       // If there are any elements left, 
        content[0] = end;                        // put the end element at the start, 
        this.bubbleUp(0);                        // and let it bubble up.
      }

      return result;

    },
    remove: function(node) {

      var 
        i = node.index,                  
        content = this.content,
        end = content[this.length -1];           // When it is found, the process seen in 'pop' is repeated to fill up the hole.

      this.length -= 1;

      if (i !== this.length - 1) {
        content[i] = end;
        if (end.f < node.f) {
          this.sinkDown(i);
        } else {
          this.bubbleUp(i);
        }
      }

    },
    sinkDown: function(n) {

      var 
        content = this.content,
        element = content[n],                    // Fetch the element that has to be sunk.
        parentN = 0, parent = null;

      while (n) {                                // When at 0, an element can not sink any further.

        parentN = ((n + 1) >> 1) - 1;            // Compute the parent element's index, and fetch it.
        parent  = content[parentN];
        
        if (element.f < parent.f) {

          content[parentN] = element;            // Swap the elements if the parent is greater.
          content[n] = parent;

          element.index = parentN;          
          parent.index  = n;                 

          n = parentN;                           // Update 'n' to continue at the new position.

        } else { break; }                        // Found a parent that is less, no need to sink any further.

      }

    },
    bubbleUp: function(n) {

      var 
        child2N, child1N, swap, child1Score,
        content   = this.content,
        length    = this.length,
        element   = content[n],
        elemScore = element.f;

      while(true) {

        swap = undefined;                             // This is used to store the new position of the element, if any.
        child1Score = undefined;

        child2N = (n + 1) << 1;                  // Compute the indices of the child elements.
        child1N = child2N - 1;

        if (child1N < length) {                  // If the first child exists (is inside the array)...          
          child1Score = content[child1N].f;
          swap = child1Score < elemScore ? child1N : swap;
        }
        
        if (child2N < length) {                  // Do the same checks for the other child.
          swap = content[child2N].f < (swap === undefined ? elemScore : child1Score) ? child2N : swap;
        }
        
        if (swap !== undefined) {                     // If the element needs to be moved, swap it, and continue.

          content[n] = content[swap];
          content[swap] = element;

          content[n].index = n;
          element.index = swap;

          n = swap;

        } else {break;}                          // Otherwise, we are done.

      }                     
    }
    
  };


  H.AI.AStar = {
    // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
    heuristics: {
      ignore: function() {
        return 1; // cost always 1, water, land straight, diagonal
      },
      manhattan: function(pos0, pos1) {
        return Math.abs(pos1.x - pos0.x) + Math.abs(pos1.y - pos0.y);
      },
      diagonal: function(pos0, pos1) {
        var D  = 1, D2 = 1.4142135623730951, //Math.sqrt(2);
            d1 = Math.abs(pos1.x - pos0.x),
            d2 = Math.abs(pos1.y - pos0.y);
        return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
      },
      square: function(pos0, pos1) {
        var dx = Math.abs(pos0.x - pos1.x),
            dy = Math.abs(pos0.y - pos1.y);
        return (dx * dx + dy * dy);
      },
      euclidian: function(pos0, pos1) {
        var dx = Math.abs(pos0.x - pos1.x),
            dy = Math.abs(pos0.y - pos1.y);
        return Math.sqrt(dx * dx + dy * dy);
      }
    },

    /**
    * Perform an A* Search on a graph given a start and end node.
    * @param {Graph} graph
    * @param {GridNode} start
    * @param {GridNode} end
    * @param {Object} [options]
    * @param {bool} [options.closest] Specifies whether to return the
               path to the closest node if the target is unreachable.
    * @param {Function} [options.heuristic] Heuristic function (see
    *          astar.heuristics).
    */
    search: function(graph, start, end, options) {

      options = options || {};

      var 
        i, currentNode, neighbor, gScore, beenVisited,
        openHeap    = new H.AI.BinaryHeap(),
        heuristic   = options.heuristic || H.AI.AStar.heuristics.manhattan,
        closest     = options.closest || false,
        closestNode = start,
        visited     = [], 
        keepVisited = options.keepVisited || false,
        tweak       = options.algotweak || 3,
        neighbors   = [null, null, null, null, null, null, null, null];

      function neighborCost(node, neighbor){

        var length = (node.x !== neighbor.x && node.y !== neighbor.y ? 
          1.4142135623730951 : 1 
          // 1.01 : 1 
        );

        return (
          tweak === 1 ? 1                                     : 
          tweak === 2 ? length                                : 
          tweak === 3 ? length * neighbor.weight              :
          tweak === 4 ? (length -0.01) * neighbor.weight      :
          tweak === 5 ? (length -0.1)  * neighbor.weight      :
          tweak === 6 ? (length -0.3)  * neighbor.weight      :
            3
        );

      }
        
      start.h = heuristic(start, end);

      openHeap.push(start);

      while(openHeap.length) {
        
        currentNode = openHeap.pop();            // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
        if (keepVisited) {                       // visual debug
          visited.push(currentNode);
        }               

        // End case -- result has been found, return the traced path.

        if(currentNode === end) {                
          return {path: pathTo(currentNode), success: true, nodes: visited};
        }
        
        currentNode.closed = true;                    // Normal case -- move currentNode from open to closed, process each of its neighbors.
        graph.setNeighbors8(neighbors, currentNode);   // Find all neighbors for the current node.

        for (i = 0; i < 8; i++) {

          neighbor = neighbors[i];

          // if not a valid node to process, skip to next neighbor.

          if (neighbor.closed || neighbor.weight === 0) {continue;}

          // The g score is the shortest distance from start to current node.
          // We need to check if the path we have arrived at this neighbor 
          // is the shortest one we have seen yet.

          gScore = currentNode.g + neighborCost(currentNode, neighbor);

          beenVisited = neighbor.visited;

          if (!beenVisited || gScore < neighbor.g) {

            // Found an optimal (so far) path to this node.  
            // Take score for node to see how good it is.

            neighbor.visited = true;
            neighbor.parent = currentNode;
            neighbor.h = neighbor.h || heuristic(neighbor, end);
            neighbor.g = gScore;
            neighbor.f = neighbor.g + neighbor.h;

            // If the neighbour is closer than the current closestNode or 
            // if it's equally close but has a cheaper path than the current closest node 
            // then it becomes the closest node
            
            if (closest) {
              if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
                closestNode = neighbor;
              }
            }

            // Pushing to heap will put it in proper place based on the 'f' value.
            if (!beenVisited) {
              openHeap.push(neighbor);

            // Already seen the node, but since it has been rescored we need to reorder it in the heap
            } else {
              openHeap.sinkDown(neighbor.index);

            }

          }

        }
      }

      return ( closest ? 
        {path: pathTo(closestNode), success: false, nodes: visited} :
        {path: [], success: false, nodes: visited}
      );

    }

  };

  /*
    Takes the terrain + regions + start coords to return a int field
    with each coord pointing to start along the terrain

  */

  H.AI.FlowField = {

    create: function(terrain, regions, coords){

      var 
        i, a, b, n, dx, dz, currentNode, grid, length, neighbor, distance, theta,
        INTRAD = 128 / Math.PI,
        SQRT2  = Math.sqrt(2),
        [x, z] = coords,
        size   = terrain.size,
        field  = new Uint8Array(terrain.length),
        reg    = regions.data[x + z * size],
        openlist  = [], neighbors = [null, null, null, null],
        graph  = new H.AI.GraphFromFunction(terrain, function(idx){
          // only given region, otherwise walls
          return regions.data[idx] === reg ? 1 : 0;
        }),
        grid = graph.grid,

        counter = 0,
        test = [];


      deb("FlowField: coords: %s, regindex: %s, length: %s", coords, reg, size * size);


      // first entry
      openlist.push(grid[x][z]);

      while (openlist.length){

        currentNode = openlist.shift();
        currentNode.closed = true;         

        x = currentNode.x;           
        z = currentNode.y;           

        graph.setNeighbors8(neighbors, currentNode);

        for (i = 0; i < 8; i++) {

          neighbor = neighbors[i];

          if (neighbor.closed || neighbor.weight === 0 || neighbor.visited) {continue;}

          distance = (
            currentNode.x === neighbor.x ? 1 :
            currentNode.y === neighbor.y ? 1 :
              SQRT2
          );

          // deb("%s, %s, %s", neighbor.x, neighbor.y, currentNode.f +1);

          neighbor.f = currentNode.f + distance;
          neighbor.visited = true;
          openlist.push(neighbor);

        }

      }

      for (x=0; x<size; x++){
        for (z=0; z<size; z++){

          counter += 1;

          n = grid[x][z];
          
          test[x + z * size] = n.f % 256;

          a  = x -1 >= 0   && grid[x-1][z].weight !== 0 ? grid[x-1][z].f : n.f;
          b  = x +1 < size && grid[x+1][z].weight !== 0 ? grid[x+1][z].f : n.f;
          dx = a - b;

          a  = z -1 >= 0   && grid[x][z-1].weight !== 0 ? grid[x][z-1].f : n.f;
          b  = z +1 < size && grid[x][z+1].weight !== 0 ? grid[x][z+1].f : n.f;
          dz = a - b;

          theta = Math.atan2(dz, dx);

          // deb("%s, %s, %s, %s, theta: %s", x, z, dx, dz, theta);

          field[x + size * z] = ~~(Math.atan2(dz, dx) * INTRAD) + 128;

          // if (counter > 1000) return;

        }
      }

      deb("FlowField: coords: %s, regindex: %s, length: %s, counter: %s", coords, reg, size * size, counter);


      return [field, test];

    }

  };

return H; }(HANNIBAL));
/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- A S S E T S -------------------------------------------------

  handles a group's economic resources like estate, units, techs, buildings.
  provides the semantics for the DSL used in plugins


  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Asset = function(context){

    H.extend(this, {

      context:  context,

      klass: "asset",

      imports:  [
        "map",
        // "health",
        "events",
        "query",
        "effector",
        "states",
        "groups",
        "metadata",
        "unitstates",
        "entities", // attackTypes, position, _templateName
      ],

      eventlist: [
        "OrderReady",
        "AIMetadata",
        "TrainingFinished",
        "ConstructionFinished",
        "EntityRenamed",
        "EntityAttacked",
        "Destroy",
      ],

      handler:   this.listener.bind(this),

      instance:  null,
      property:  null,
      resources: null,  //s
      users:     null,  //s

    });

  };

  H.LIB.Asset.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Asset,
    toString: function(){return H.format("[%s %s[%s]]", this.klass, this.name, this.resources.join("|"));},
    log: function(){
      this.deb(" ASSET: %s %s res: %s", this.instance.name, this.property, this.resources.length);
      this.resources.forEach( id => {
        this.deb("     A: %s, %s", this.id, this.entities[id]._templateName);
      });
    },
    initialize: function (config){

      H.extend(this, config);

      this.name = config.instance.name + ":" + config.property + "#" + this.id;

      // name         ??
      // id           ??
      // type         // entities, devices
      // instance     // the parent group 
      // property     // property name
      // resources    // array of ids
      // verb         // the action performed
      // hcq          // resource selector
      // shared       // or private
      // definition   // from group's assets
      // users        // list of ??? for shared asset users

      // deb("   AST: initialized: %s for %s with hcq: %s", this, this.instance, this.hcq || "unknown");

      return this;

    },
    serialize: function(){
      return {
        id:         this.id,
        users:      H.deepcopy(this.users),
        size:       this.size,
        property:   this.property,
        resources:  H.deepcopy(this.resources),
        definition: H.deepcopy(this.definition),
      };
    },
    // toSelection: function(resources){
    //   return (
    //     new H.LIB.Asset(this.context)
    //       .import()
    //       .initialize({
    //         id:        this.id, // same id !!!
    //         klass:     "asset.selection",
    //         instance:  this.instance, 
    //         property:  this.property, 
    //         resources: resources,
    //       })
    //   );
    // },
    activate: function(){
      this.eventlist.forEach(e => this.events.on(e, this.handler));
    },
    release:    function(){
      this.eventlist.forEach(e => this.events.off(e, this.handler));
      this.resources.forEach(id => {
        this.metadata[id].opname = "none";
        this.metadata[id].opid = undefined;
      });
      // users ????
      // deb("   ASS: releasing %s", uneval(this.resources));          
    },

    // events
    listener: function(msg){

      var 
        dslobject, tpln, ids, 
        id = msg.id, 
        dsl = this.groups.dsl;

      if (msg.name === "OrderReady"){

        if (msg.data.source === this.id){

          if (this.verb === "path"){

            ids = msg.data.resources;
            tpln = "path";
            this.resources = msg.data.resources.slice();

          } else if (this.verb === "find"){

            ids = msg.data.resources;
            tpln = "resources";
            this.resources = msg.data.resources.slice();

          } else {

            ids = [id];
            tpln = this.entities[id]._templateName;
            this.resources.push(id);

            // take over ownership
            this.metadata[id].opid   = this.instance.id;
            this.metadata[id].opname = this.instance.name;

          }

          this.deb("   AST: OrderReady: %s ids: [%s], tpl: %s", this.verb, ids, tpln);

          dslobject = {
            name:        "item",
            resources:   ids, 
            ispath:      tpln.contains("path"),
            isresource:  tpln.contains("resources"),
            foundation:  tpln.contains("foundation"),
            toString :   () => H.format("[dslobject item[%s]]", id)
          };

          this.groups.callWorld(this.instance, "assign", [dslobject]);

        } // else { deb("   AST: no match: %s -> %s | %s", msg.data.source, this.id, this.name);}


      } else if (H.contains(this.resources, id)){

        if (msg.name === "Destroy") {

          this.deb("   AST: listener Destroy: %s, %s", this.name, uneval(msg));

          // no need to tell group about succesful foundations
          if (!msg.data.foundation){
            dsl.select(this.instance);
            dsl.noun("asset", "entity", [id]);
            this.groups.signal("onDestroy", [dsl.world.asset]);

          }

          // remove after so match works in instance
          H.remove(this.resources, id);


        } else if (msg.name === "EntityAttacked") {

          dsl.select(this.instance);
          dsl.noun("asset", "entity", [id]);
          dsl.noun("attacker", "entity", [msg.id2]);
          this.groups.signal("onAttack", [dsl.world.asset, dsl.world.attacker, msg.data.type, msg.data.damage]);


        } else if (msg.name === "EntityRenamed") {

          H.remove(this.resources, id);
          this.resources.push(msg.id2);


        } else if (msg.name === "ConstructionFinished") {


          dslobject = {
            name:        "item",
            resources:   [id], 
            foundation:  false,
            toString :   () => H.format("[dslobject item[%s]]", id)
          };

          this.groups.callWorld(this.instance, "assign", [dslobject]);

        }

      }

    },
  });

return H; }(HANNIBAL));
/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- H A N N I B A L ---------------------------------------------

  this is the actual bot, it loads from start, saved game or context and 
  runs against the engine or in a simulation


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/

HANNIBAL = (function(H){

  H.LIB.Bot = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "id",
        "player",
        "entities",
        "templates",
        "events",
        "map",
        "brain",
        "groups",
        "economy", 
        "culture",
        "effector",
        "military",
        "villages",
        "resources",
      ],

    });

    this.name = H.format("%s:%s#%s", this.context.name, "bot", this.context.id);

  };

  H.LIB.Bot.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Bot,
    log: function(){
      deb(); deb("   BOT: loaded: %s", this);
    },
    deserialize: function(data){
      return this;
    },
    serialize: function(){
      var data = {};
      return data;
    },
    initialize: function(){
      return this;
    },
    activate: function(){},
    tick: function(tick, secs, timing){

      // logObject(this.map, "this.map");

      if (tick === 0){

        // allow processing autoresearch first
        timing.brn = this.brain.tick(         secs, tick);
        timing.map = this.map.tick(           secs, tick);
        timing.gps = this.groups.tick(        secs, tick);
        timing.mil = this.military.tick(      secs, tick);
        timing.sts = this.economy.stats.tick( secs, tick);
        timing.eco = this.economy.tick(       secs, tick);

      } else {

        timing.evt = this.events.tick(        secs, tick);
        timing.brn = this.brain.tick(         secs, tick);
        timing.map = this.map.tick(           secs, tick);
        timing.gps = this.groups.tick(        secs, tick);
        timing.mil = this.military.tick(      secs, tick);
        timing.sts = this.economy.stats.tick( secs, tick);
        timing.eco = this.economy.tick(       secs, tick);

      }

    },
    unitprioritizer: function(){

      var 
        phase = this.culture.phases.current,
        availability = this.economy.availability;

      if (phase === "vill"){

        return function(nodes){
          nodes
            .sort((a, b) => a.costs[availability[0]] < b.costs[availability[0]] ? 1 : -1 )
            .sort((a, b) => a.costs[availability[1]] < b.costs[availability[1]] ? 1 : -1 )
            .sort((a, b) => a.costs[availability[2]] < b.costs[availability[2]] ? 1 : -1 )
            .sort((a, b) => a.costs[availability[3]] < b.costs[availability[3]] ? 1 : -1 );
        };

      } else if (phase === "town") {
        return function(){deb("WARN  : bot.unitsortorder for town not implemented");};

      } else if (phase === "city") {
        return function(){deb("WARN  : bot.unitsortorder for city not implemented");};

      } else {
        return function(){deb("ERROR : bot.unitsortorder for '%s' not implemented", phase);};

      }


    }

  });

return H; }(HANNIBAL));  

/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- B R A I N ---------------------------------------------------

  all high level decisions are made here,
  sets up basic parameters at start, adjusts them by analyzing opponent(s)



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


/*
  map size
  Resource availability trees, metal
  water land map
  culture
  researched technologies
  attack/defense strategies
  defense status
  diplomacy

*/

HANNIBAL = (function(H){

  var 
    goals = {
      expandVill:  {
        valid:        true,
        done:         false,
        constuctions: ["house-vill", "farmstead", "storehouse", "blacksmith", "field", "barracks", "dock"],
        check:        function(){if (!this.valid || this.done){return true;} else {return false;}}
      },
      expandTown:  {
        valid:        true,
        done:         false,
        constuctions: ["house-town", "market", "temple", "shipyard"],
        check:        function(){return false;}
      },
      expandCity:  {
        valid:        true,
        done:         false,
        constuctions: ["house-city", "fortress", "wall"],
        check:        function(){return false;}
      },
    },
    parameters = {

    // Dimensions
    time:        [1, 7, function(){}],       // elapsed time 

    // Static Map
    mapsize:     [128, 512, function(){}],   // physical map size
    circular:    [128, 512, function(){}],   // physical map size

    // Dynamic Map
    terrain:     [0, 100,   function(){}],   // percentage of water in known land
    mountainous: [0, 100,   function(){}],   // percentage of too steep area in known land

    // Dynamic Resources 
    trees:       [1, 100,   function(){}],   // percentage of cells with trees in known land
    fruits:      [1, 100,   function(){}],   // percentage of cells with trees in known land
    stone:       [1, 100,   function(){}],   // percentage of cells with trees in known land
    metal:       [1, 100,   function(){}],   // percentage of cells with trees in known land

    // Diplomacy
    players:     [2, 8,     function(){}],
    enemies:     [1, 7,     function(){}],
    allies:      [1, 7,     function(){}],
    teams:       [2, 4,     function(){}],
    
    population:  [1, 100,   function(){}],   // percentage of pop to popmax

    // Civilisation
    popuHouse:   [1, 10,    function(){}],   // 
    timeHouse:   [1, 100,   function(){}],   // time range from low to high to build a house
    hasMobileDropsites: [0, 1,   function(){}],   // time range from low to high to build a house

  };

  function class2name (klass) {return H.QRY(klass + " CONTAIN").first().name;}


  H.LIB.Goals = function(context){

    H.extend(this, {

      context:  context,

      imports:  [
        "events",
        "culture",
        "economy",
        "query",
        "villages",
      ],

    });

  };

  H.LIB.Goals.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Goals,
    log: function(){this.deb();this.deb(" Goals: all good");},
  });






  H.LIB.Brain = function(context){

    H.extend(this, {

      context:  context,

      imports:  [
        "events",
        "culture",
        "economy",
        "query",
        "villages",
      ],

    });

  };

  H.LIB.Brain.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Brain,
    log: function(){this.deb();this.deb(" BRAIN: all good");},
    activate: function(){

      this.events.on("Advance", msg => {
        this.deb(" BRAIN: onAdvance: %s", msg.data.technology);
      });

      this.events.on("EntityAttacked", "*", msg => {
        this.deb(" BRAIN: EntityAttacked: damage: %s, type: %s", msg.data.damage, msg.data.type);
      });

      this.events.on("BroadCast", msg => {
        this.deb(" BRAIN: BroadCast: %s", uneval(msg));
      });

    },
    tick: function(tick, secs){

      var t0 = Date.now();


      return Date.now() - t0;

    },

  });



  // H.Brain = {
  //   id:   null,
  //   name: "brain",
  //   scouts: [],
  //   init: function(){

  //     deb();deb();deb(" BRAIN: init - phase.%s", H.Player.phase);

  //     H.Brain.id = H.Objects(this);

  //     planner = new H.HTN.Planner({
  //       name:         "brain.planner",
  //       operators:    H.HTN.Economy.operators,
  //       methods:      H.HTN.Economy.methods,
  //     });

  //   },
  //   activate: function(){

  //     var phase;


  //   },
  //   tick: function(secs, ticks){

  //     var 
  //       t0 = Date.now(),
  //       cc = H.Villages.Centre.id;

      
  //     if (ticks === 1){
  //       // assuming village...
  //       this.runPlanner("phase.village");
  //       H.Economy.updateActions("phase.village");
  //     }

  //     if (ticks === 2){
  //       // this.scouts.push(H.Groups.launch("g.scouts", H.Centre.id, 5));
  //       this.scouts.push(H.Groups.launch({name: "g.scouts", cc: cc, size: 5}));

  //     }

  //     return Date.now() - t0;
  //   },
  //   planPhase: function(context){ // phase, centre, tick, civ

  //     var 
  //       t0 = Date.now(), 
  //       tickSort = (a, b) => a[0] < b[0] ? -1 : 1,
  //       // utilizers = ["Villages", "Economy", "Military", "Brain"],
  //       utilizers = ["Brain"],
  //       necessities, 
  //       technologies = [], 
  //       launches = {"phase.village": [], "phase.town": [], "phase.city": []},
  //       messages = {"phase.village": [], "phase.town": [], "phase.city": []}
  //       ;

  //     deb();deb();
  //     deb(" BRAIN: planPhase budget    : %s", uneval(context.curstate.data.ress));
  //     deb(" BRAIN: planPhase resources : %s", uneval(context.resources));

  //     // collect groups and techs from utilizers
  //     utilizers.forEach(utilizer => {
  //       necessities = H[utilizer].getPhaseNecessities(context);
  //       deb("     B: got %s phases, %s technologies from %s", H.count(necessities.launches), necessities.technologies.length, utilizer);
  //       H.pushflat(technologies, necessities.technologies);
  //       H.each(launches, phase => {
  //         H.pushflat(launches[phase], necessities.launches[phase]);
  //       });
  //       H.each(messages, phase => {
  //         H.pushflat(messages[phase], necessities.messages[phase]);
  //       });
  //     });

  //     // [   4 + tck, [1, "g.scouts",     {cc:cc, size: 5}]],
  //     H.each(launches, phase => {
  //       launches[phase].sort(tickSort);
  //       messages[phase].sort(tickSort);
  //     });

  //     context.info = { // phase : [length, mintick, maxtick]
  //       launches: {
  //         "phase.village": [
  //           launches["phase.village"].length,
  //           launches["phase.village"].length ? launches["phase.village"][0][0] : 0,
  //           launches["phase.village"].length ? launches["phase.village"].slice(-1)[0][0] : 0,
  //         ],
  //         "phase.town": [
  //           launches["phase.town"].length,
  //           launches["phase.town"].length ? launches["phase.town"][0][0] : 0,
  //           launches["phase.town"].length ? launches["phase.town"].slice(-1)[0][0] : 0,
  //         ],
  //         "phase.city": [
  //           launches["phase.city"].length,
  //           launches["phase.city"].length ? launches["phase.city"][0][0] : 0,
  //           launches["phase.city"].length ? launches["phase.city"].slice(-1)[0][0] : 0,
  //         ],
  //       },
  //       messages: {
  //         "phase.village": [
  //           messages["phase.village"].length,
  //           messages["phase.village"].length ? messages["phase.village"][0][0] : 0,
  //           messages["phase.village"].length ? messages["phase.village"].slice(-1)[0][0] : 0,
  //         ],
  //         "phase.town": [
  //           messages["phase.town"].length,
  //           messages["phase.town"].length ? messages["phase.town"][0][0] : 0,
  //           messages["phase.town"].length ? messages["phase.town"].slice(-1)[0][0] : 0,
  //         ],
  //         "phase.city": [
  //           messages["phase.city"].length,
  //           messages["phase.city"].length ? messages["phase.city"][0][0] : 0,
  //           messages["phase.city"].length ? messages["phase.city"].slice(-1)[0][0] : 0,
  //         ],
  //       },
  //     };

  //     deb();
  //     deb("     B: launches/messages ...");
  //     JSON.stringify(context.info, null, 2).split("\n").forEach(function(line){
  //       deb("     B: %s", line);
  //     });

  //     // H.each(launches, function (phase, launches){
  //     //   deb("     B: %s %s", phase, launches.length);
  //     // });
      
  //     // collect techs from groups
  //     H.each(launches, function (phase, phaselaunches){
  //       phaselaunches.forEach(launch => {
  //         H.pushflat(technologies, H.Groups.getGroupTechnologies(launch));
  //       });
  //     });

  //     context.launches = launches;
  //     context.messages = messages;
  //     context.technologies = H.unique(technologies);
  //     deb("     B: have %s technologies",  context.technologies.length);
  //     context.technologies.forEach(t => {
  //       deb("     B:   %s", t);
  //     });

  //     H.Simulator.simulate(context);

  //     deb();
  //     deb(" BRAIN: planPhase state: %s, %s msecs, gametime: %s", context.curphase, Date.now() - t0, H.Simulator.tick * 1.6);
  //     JSON.stringify(context.curstate, null, 2).split("\n").forEach(function(line){
  //       deb("     B: %s", line);
  //     });


  //   },
  //   getPhaseNecessities: function(context){ // phase, centre, tick
      
  //     var 
  //       cls = H.class2name,
  //       cc  = context.centre,

  //       technologies = [],
  //       messages = {
  //         "phase.village": [
  //           [   3, {name: "BroadCast", data: {group: "g.builder", cc: cc, building: cls("house"), quantity: 4}}]
  //         ],
  //         "phase.town": [],
  //         "phase.city": [],
  //       },
  //       launches = {
  //         "phase.village": [
  //         //  tck,  amt,  group,         params
  //           [   2,    1, "g.builder",    {cc:cc, size: 3}],
  //           // [   4,    1, "g.scouts",     {cc:cc, size: 5}],
  //         ],
  //         "phase.town" :   [

  //         ],
  //         "phase.city" :   [

  //         ],
  //       };

  //      return {
  //         launches: launches,
  //         technologies: technologies,
  //         messages: messages,
  //      };

  //   },    
  //   runPlanner: function(phase){

  //     var state, goal, phaseName, phaseCost, housePopu, ress, logops;

  //     if (phase === "phase.village"){

  //       phaseName = H.QRY("civilcentre CONTAIN RESEARCH").filter(n => n.name.contains("town"))[0].name;
  //       phaseCost = H.Technologies[phaseName].cost;
  //       housePopu = H.QRY(class2name("house")).first().costs.population * -1;

  //       ress = {
  //         "food":  phaseCost.food  + 100,
  //         "wood":  phaseCost.metal + 100,
  //         "stone": phaseCost.stone + 100,
  //         "metal": phaseCost.metal + 100,
  //         "pop":   50,
  //       };

  //       state = H.HTN.Economy.getCurState();
  //       goal  = new H.HTN.Helper.State({
  //         "ress": {},
  //         "ents": {},
  //         "tech": [
  //           phaseName,
  //           "gather.lumbering.ironaxes",
  //           // "gather.farming.plows",
  //           // "gather_capacity_wheelbarrow"
  //         ]
  //       }).sanitize();

  //       // add buildings
  //       [

  //         ["barracks",  2],
  //         ["farmstead", 2],
  //         ["house",     Math.ceil(ress.pop / housePopu)],

  //       ].forEach(line => goal.data.ents[class2name(line[0])] = line[1]);


  //     } else if (phase === "phase.town"){


  //     } else if (phase === "phase.city"){

  //     }



  //     planner.plan(state, [[H.HTN.Economy.methods.start, goal]]);

  //     logops = {
  //       // "start": null,
  //       "build_structures": null,
  //       "research_tech": null,
  //       "train_units": null,
  //       // "finish": null,
  //     };

  //     // debug
  //     deb(" BRAIN: current state: %s", phase);
  //     JSON.stringify(state.data, null, 2).split("\n").forEach(function(line){
  //       deb("     B: %s", line);
  //     });

  //     deb();deb(" BRAIN: plan in phase: %s", phase);
  //     JSON.stringify(planner.result, null, 2).split("\n").forEach(function(line){
  //       deb("     B: %s", line);
  //     });

  //     deb();deb("     B: operations:");
  //     planner.operations.forEach(function(op){
  //       if (op[1] in logops){
  //         deb("     B: - %s", op.filter(o => o !== undefined).join(", "));
  //       }
  //     });      
  //     deb("     B: cost: ", uneval(planner.result.data.cost));


  //   },
  //   requestPlanner: function(){ return planner;},
  //     // requestGoals: function(){

  //     //   return (
  //     //     planner.operations
  //     //       .filter(op => op[1] === "build_structures" || op[1] === "research_tech" || op[1] === "inc_resource")
  //     //       .map(op => [op[1], op[2], op[3] === undefined || 1])
  //     //       .sort((a, b) => a[0] > b[0])
  //     //   );

  //     // },
  //   requestGroups: function(phase){

  //     // farmstead bartermarket blacksmith corral dock outpost storehouse temple

  //     // [quantity, groupname, ccid, [param1, [...] ] ]

  //     var cc = H.Villages.Centre.id;


  //     if (phase === "phase.village"){

  //       // TODO: care about Centre

  //       return [
  //         [2, "g.harvester", cc, {size: 5}],       // needed for trade?
  //         [1, "g.builder",   cc, {size: 2, quantity: 2, building: class2name("farmstead")}],    // depends on building time
  //         [1, "g.builder",   cc, {size: 2, quantity: 2, building: class2name("storehouse")}],   // depends on building time

  //       ];

  //       // return [
  //       //   [2, "g.harvester", cc,                           5],       // needed for trade?
  //       //   // [1, "g.builder",   cc, class2name("house"),      2, 6],    // onLaunch: function(ccid, building, size, quantity){
  //       //   [1, "g.builder",   cc, class2name("farmstead"),  4, 2],    // depends on building time
  //       //   [1, "g.builder",   cc, class2name("storehouse"), 2, 2],    // depends on building time
  //       //   // [1, "g.builder",   cc, class2name("barracks"),   5, 2],    // depends on civ and # enemies
  //       //   // [1, "g.builder",   cc, class2name("blacksmith"), 2, 1],    // one is max, check required techs
  //       //   // [1, "g.supplier",  cc, "metal",                  1],               // 
  //       //   // [1, "g.supplier",  cc, "stone",                  1],
  //       //   // [5, "g.supplier",  cc, "wood",                   5],
  //       //   // [1, "g.supplier",  cc, "food.fruit",             2],       // availability
  //       //   // [1, "g.supplier",  cc, "food.meat",              2],       // availability
  //       // ];

  //     } else if (phase === "phase.town"){


  //     } else if (phase === "phase.city"){

  //     }      

  //     return [];

  //   },

  // };


return H; }(HANNIBAL));     
/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- C O N F I G --------------------------------------------

  The settings for all difficulties, attempting to leave nothing in the code,
  including access functions to select values for given difficulty.


  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Config = {

    //logging 0=zero, 1=errors, 2=1+warnings, 3=2+info, 4=everything
    deb:      4,                   // enables messages to dbgView via _xdebug.js.deb()
    con:      1,                   // enables messages to the in game console via _xdebug.js.con()

    sequence:                "random/brainland",
    // sequence: "Forest Battle",

    // enable psy-ops
    brag:                    true,  

    angle:                   3 * Math.PI/4,       // depends on first CC

    attackRelax:             2,     

    data:                    {
      sharedBuildingClasses: [
                            "civilcentre", 
                            "blacksmith", 
                            "farmstead",
                            "storehouse",
                            "barracks", // temporarely
                             ],
      prey:                  ["chicken", "sheep", "pig", "goat"], // possible food resources
    },

    numerus: {
      enabled:              true,
      file:                 "/home/noiv/Desktop/0ad/stats.csv",
      resolution:           10       // 10 = 16 secs
    },

    stats: {
      lengthStatsBuffer:    40, // approx 1 minute
    },

    economy: {
      intervalMonitorGoals: 10,
      // maxAllocations:        5, // queue length for producers
      maxQueueLength:        5, // queue length for producers
    },

    civs : {
      athen:  {
        builders: 2,
      },
      brit:  {
        builders: 2,
      },
      cart:  {
        builders: 2,
      },
      celt:  {
        builders: 2,
      },
      gaul:  {
        builders: 2,
      },
      hele:  {
        builders: 2,
      },
      iber:  {
        builders: 2,
      },
      mace:  {
        builders: 2,
      },
      maur:  {
        builders: 4,
      },
      pers:  {
        builders: 2,
      },
      ptol:  {
        builders: 2,
      },
      rome:  {
        builders: 2,
      },
      sele:  {
        builders: 2,
      },
      spart:  {
        builders: 2,
      },
      theb:  {
        builders: 2,
      },
    },

    //TODO: run preflight check, whether all these frames are actually available
    behaviours: {
      "ai:ai":              {
        entry:              "whiteflag",
        whiteflag:          ["village"],
        village:            ["populate", "town", "victory"],
        town:               ["expand", "defense", "city", "victory"],
        city:               ["attack", "defense", "attack", "victory"],
        victory:            [],
      },
      "ai:ai:1":            {
        village:            ["populate", "technology", "town", "victory"],
      },
      "ai:mayor:main":      {
        entry:              "build",
        groups:             {
          grainpicker:      {min: 1, max:  3, amount: 1},
          // hunter:       {priority: 1, max: 20, amount: 1},
          // lumberjack:       {priority: 1, max: 20, amount: 1},
          // stoner:           {priority: 2, max: 20, amount: 1},
          // miner:            {priority: 3, max: 20, amount: 1},
        },
        build:              ["food", "wood", "houses", "expand"],
        expand:             ["food", "wood", "houses", "technology", "defense"],
      },
      "mayor:grainpicker" : {
        entry:              "gather",
        gather:             ["find", "sustain"]  // garrison, heal, no reaeson to dissolve
      }
    },

    getBehaviour: function (name, difficulty){

      var basic, upgrade, i = difficulty;

      // deb("getBehaviour: %s, %s", name, difficulty);

      // pick most simple
      basic = H.Config.behaviours[name];
      basic.name = H.format("%s:%s", name, 0);

      // upgrade matching difficulty, downgrade if needed
      while(i--){
        upgrade = H.Config.behaviours[H.format("%s:%s", name, i)];
        if (upgrade){
          H.extend(basic, upgrade);
          basic.name = H.format("%s:%s", name, i);
          break;
        }
      }

      // logObject(basic, H.format("getBehaviour: %s (%s)", name, difficulty));

      return basic;

    },
    get: function (difficulty){

      var C = H.Config;

      C.difficulty = difficulty;

      switch (difficulty){

        // 0 is sandbox, 1 is easy, 2 is medium, 3 is hard, 4 is very hard.
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:



        break;

        default:
          // debugE("Config: unknown difficilty! %s", difficulty);
          return {};

      }

      return C;

    }

  };

return H; }(HANNIBAL));
/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- C O N T E X T  ----------------------------------------------

  Hannibal's Bots can run in 3 different contexts: a) the game, b) a simulator and 
  c) the Explorer. Most importantly contexts differ in sensors and effectors,
  0AD saves and loads serialized contexts.

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/

HANNIBAL = (function(H){

  H.LIB.Context = function(key, launcher){

    this.defaults = {                                    // all primitive data
      key:            key,                               // used in logs
      connector:      "",                                // set by connecting
      time:           Date.now(),                        // time game created/saved 
      timeElapsed:    0,                                 // API data
      idgen:          1,                                 // seed for unique object ids
      turn:           0,                                 // increments on API tick
      tick:           0,                                 // increments on BOT tick
    };

    this.klass    = "context";
    this.launcher = launcher;
    this.parent   = launcher;
    this.id       = launcher.id;
    this.name     = launcher.name + ":" + key;
    this.deb      = launcher.deb;

    // stateful support objects, ordered, no dependencies to following objects
    this.serializers = [
      "events", 
      "culture",     // has childs: store, tree, phases
      "map",         // grids
      "resources",   // after map
      "villages", 
      "scanner",     // scanner after map, before groups
      "groups",      // assets
      "stats",       // located in eco
      "orderqueue",  // located in eco
      "producers",   // located in eco
      "economy",     // stats, producers, orderqueue
      "military",    // attack groups and support buildings
      "brain",       // keep information uptodate
      // "bot",      // make decisions
    ];

    // this props need an update each tick, because sharedscript changed
    this.updates = [
      "timeElapsed",
      "territory",
      "passability",
      "passabilityClasses",
      "techtemplates",
      "player",
      "players",
    ];

    // action sequence to launch serializers
    this.sequence = [
      "create",        // either new Obj or Obj.clone
      "import",        // import properties from context
      "deserialize",   // if context contains data 
      "initialize",    // otherwise init from game data
      "finalize",      // 
      "activate",      // subsribe to events
      "log",           // 
    ];

    // debug, avoid noisy logs during sequence
    this.logger = [
      // "events", 
      "culture",     // store, tree, phases
      // "map",         // grids
      "resources",   // after map
      "villages", 
      "scanner",     // scanner after map, before groups
      "groups",      // assets
      // "economy",     // stats, producers, orderqueue
      // "military", 
      // "brain", 
      // "bot", 
    ];

    // set initial properties
    H.extend(this, this.defaults, {data: {}});
    this.serializers.forEach(s => this.data[s] = null);

  };

  H.LIB.Context.prototype = H.mixin(
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Context,
    log: function(){
      var data = {};
      H.each(this.defaults, name => data[name] = this[name]);
      this.deb();
      this.deb("   CTX: %s", uneval(data));
    },
    runSequence: function(fn){
      this.sequence.forEach( action => {
        this.serializers.forEach( serializer => {
          fn(serializer, action);
        });      
      });      
    },
    createBot: function(){
      return (this.bot = new H.LIB.Bot(this).import().initialize());
    },
    serialize: function(){

      var data = {
        key:           this.key,
        connector:     this.connector,
        time:          Date.now(),
        timeElapsed:   this.timeElapsed,
        idgen:         this.idgen,
        id:            this.id,
        turn:          this.turn,
        tick:          this.tick,
        difficulty:    this.difficulty,
        data:          {},
      };

      this.serializers.forEach(serializer => {
        data.data[serializer] = this[serializer].serialize();
      });

      return data;

    },
    deserialize: function(data){
      var name = this.name;
      H.extend(this, data);
      this.name = name;
    },
    clone: function(name){

      // prepares a new context by de/serializing this one

      var ctxClone;

      name = name || this.name + ".copy";

      ctxClone = new H.LIB.Context(name);

      // copy primitive default data
      H.each(this.defaults, name => ctxClone[name] = this[name]);

      // reset id generator
      ctxClone.idgen = 1;  /// ????

      // add helper, still confusing here
      H.extend(ctxClone, {
        query:      function(hcq, debug){
          return new H.LIB.Query(ctxClone.culture.store, hcq, debug);
        },
        class2name: function(klass){
          return new H.LIB.Query(ctxClone.culture.store, klass + " CONTAIN").first().name;
        },
      });

      // launch serializers
      this.runSequence( (serializer, action) => {

        var obj = ctxClone[serializer];

        if (action === "create"){
          ctxClone[serializer] = this[serializer].clone(ctxClone);
          ctxClone[serializer].klass   = serializer; 
          ctxClone[serializer].parent  = ctxClone;
          ctxClone[serializer].name    = ctxClone.name + ":" + serializer;

        } else if (!(action === "log" && !H.contains(this.logger, serializer))){
          // ( obj[action] && obj[action]() );
          obj[action]();

        } else {
          this.deb("   IGN: logger: %s", serializer);
        }

      });

      return ctxClone;

    },
    initialize: function(config){

      H.extend(this, {

        config:              config,

        query:               (hcq, debug) => {
          return new H.LIB.Query(this.culture.store, hcq, debug);
        },
        class2name:          klass => {
          return new H.LIB.Query(this.culture.store, klass + " CONTAIN").first().name;
        },

        operators:           H.HTN.Economy.operators,
        methods:             H.HTN.Economy.methods,
        planner:             new H.HTN.Planner(this, {
          name:      "eco.planner",
          verbose:   1
        }),

      });

      this.runSequence( (serializer, action) => {

        var obj = this[serializer];

        // this.deb("   CTX: %s initialize: a: %s.%s, type: %s", this.name, serializer, action, (obj && typeof obj[action]));

        if (action === "create"){ 
          this[serializer] = new H.LIB[H.noun(serializer)](this);
          this[serializer].klass   = serializer; 
          this[serializer].parent  = this;
          this[serializer].name    = this.name + ":" + serializer;

        } else if (!(action === "log" && !H.contains(this.logger, serializer))){
          if (typeof obj[action] !== "function"){
            H.logObject(obj, "obj");
          }
          obj[action]();

        } else {
          // logging for this serializer disabled

        }

      });

    },
    connectExplorer:  function(launcher){

      this.connector = "explorer";

      H.extend(this, {
        params:              H.toArray(arguments),
        launcher:            launcher,
        effector:            new H.LIB.Effector(this).import(),
      });

    },
    connectSimulator: function(launcher){

      this.connector = "simulator";

      H.extend(this, {
        params:              H.toArray(arguments),
        launcher:            launcher,
        effector:            new H.LIB.Effector(this).import(),
      });

    },
    connectEngine: function(launcher, gameState, sharedScript, settings){

      var 
        ss = sharedScript,
        gs = gameState, 
        entities = gs.entities._entities,
        sanitize = H.saniTemplateName;

      this.updateEngine = sharedScript => {

        // this.updates is here relevant

        ss = sharedScript;

        this.sharedscript       = ss; // tmp for map
        this.gamestate          = ss.gameState[this.id]; // tmp for map

        this.timeElapsed        = ss.timeElapsed;
        this.territory          = ss.territoryMap;
        this.passability        = ss.passabilityMap;
        this.passabilityClasses = ss.passabilityClasses;
        this.techtemplates      = ss._techTemplates;
        this.player             = ss.playersData[this.id];
        this.players            = ss.playersData;
        // this.metadata           = ss._entityMetadata[this.id];
      };

      H.extend(this, {

        connector:           "engine",

        params:              H.toArray(arguments),
        launcher:            launcher,

        // id:                  settings.player,                   // bot id, used within 0 A.D.
        difficulty:          settings.difficulty,               // Sandbox 0, easy 1, or nightmare or ....

        phase:               gs.currentPhase(),          // num
        cellsize:            gs.cellSize, 
        width:               ss.passabilityMap.width  *4, 
        height:              ss.passabilityMap.height *4, 
        circular:            ss.circularMap,
        territory:           ss.territoryMap,
        passability:         ss.passabilityMap,

        // API read only, static
        templates:           settings.templates,
        techtemplates:       ss._techTemplates, 

        // API read only, dynamic
        entities:            entities,
        modifications:       ss._techModifications,
        player:              ss.playersData[settings.player],
        players:             ss.playersData,

        // API read/write
        metadata:            new Proxy({}, {get: (proxy, id) => {

          var meta = ss._entityMetadata[this.id];
          
          if (H.isInteger(~~id)){
            if (!meta[id]){meta[id] = {};}
            return meta[id];
          } else {
            return undefined;
          }

        }}),

        // API ro/dynamic
        // sanitize UnitAI state // TODO: check if function works too
        unitstates:          new Proxy({}, {get: (proxy, id) => {

          // print("unitstates: " + id);
          // this.deb("   CTX: unitstates of id: %s, %s", id, entities[id]._templateName || "no template");

          return (
            entities[id] && entities[id]._entity.unitAIState ? 
              H.replace(entities[id]._entity.unitAIState.split(".").slice(-1)[0].toLowerCase(), "ing", "") :
                undefined
          );}
        }),


        // API ro/dynamic
        // try to get all tech funcs here
        technologies:       new Proxy({}, {get: (proxy, name) => { return (
          name === "available" ? techname => Object.keys(this.modifications).map(sanitize).some(t => t === techname) :
          name === "templates" ? techname => ss._techTemplates[sanitize(techname)] :
              undefined
        );}}),

        // API ro/dynamic
        // 
        health: function(ids){

          // calcs health of an array of ent ids as percentage

          var curHits = 0, maxHits = 0;

          ids.forEach(function(id){
            if (!entities[id]){
              this.deb("WARN  : Tools.health: id: %s in ids, but not in entities, type: %s", id, typeof id);
            } else {
              curHits += entities[id]._entity.hitpoints;
              maxHits += entities[id].maxHitpoints();
            }
          });

          return ids.length ? (curHits / maxHits * 100).toFixed(1) : NaN;

        },


      });

      this.effector = new H.LIB.Effector(this).import();

    },

  });

return H; }(HANNIBAL));  
/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- C U L T U R E  ----------------------------------------------

  Models features of 0 A.D. civilisations as mesh network based on a triple store.
  

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Phases = function(context){

    H.extend(this, {

      context: context,

      imports:  [
        "phase",
        "query",
        "events",
        "culture",
        "templates",
        "techtemplates",
        "class2name",
      ],

      "1" : {idx: 1, abbr: "vill", next: "", generic: "phase_village", alternates: ["vill", "phase_village"]},
      "2" : {idx: 2, abbr: "town", next: "", generic: "phase_town",    alternates: ["town", "phase_town"]},
      "3" : {idx: 3, abbr: "city", next: "", generic: "phase_city",    alternates: ["city", "phase_city"]},
      current: "",

    });

  };

  H.LIB.Phases.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Phases,
    log: function(){
      this.deb();
      this.deb("PHASES: current: '%s'", this.current);
      this.deb("     P: 1: %s", JSON.stringify(this["1"]));
      this.deb("     P: 2: %s", JSON.stringify(this["2"]));
      this.deb("     P: 3: %s", JSON.stringify(this["3"]));
    },
    serialize: function(){
      return {
        "1": this["1"],
        "2": this["2"],
        "3": this["3"],
        "current": this.current,
      };
    },
    deserialize: function(data){
      H.extend(this, data);  // just take 1,2,3, current
      return this;
    },
    initialize: function(){
      var test, self = this;
      function extract(str){
        if (str && str.contains("phase")){
          if (str.contains("village")){self["1"].alternates.push(str);}
          if (str.contains("town")){self["2"].alternates.push(str);}
          if (str.contains("city")){self["3"].alternates.push(str);}
        }
      }
      function check(key, tpl){
        if ((test = H.test(tpl, "Identity.RequiredTechnology"))){extract(test);}
        if ((test = H.test(tpl, "requirements.tech"))){extract(test);}
        if ((test = H.test(tpl, "requirements.any"))){test.filter(t => !!t.tech).forEach(t => extract(t.tech));}
      }
      if (this["1"].next === ""){
        H.each(this.templates, check); 
        H.each(this.techtemplates, check); 
        this["1"].alternates = H.unique(this["1"].alternates);
        this["2"].alternates = H.unique(this["2"].alternates);
        this["3"].alternates = H.unique(this["3"].alternates);
      }
      return this;
    },
    finalize: function(){
      this.current = this[this.phase].abbr;
      this.query(this.class2name("civilcentre") + " RESEARCH").forEach(node => {
        if (node.name.contains("town")){this["1"].next = node.name;}
        if (node.name.contains("city")){this["2"].next = node.name;}
      });
    },
    activate: function(){
      this.events.on("Advance", msg => {
        var phase;
        if ((phase = this.find(msg.data.key))){
          this.context.phase = phase.idx;
          this.current = phase.abbr;
          this.deb("PHASES: onAdvance: set new phase %s", this.current);
        }
      });      
    },
    prev: function(phase){return this[(this.find(phase).idx - 1) || 1];},
    find: function(phase){
      for (var i=1; i<=3; i++) {
        if (H.contains(this[i].alternates, phase)){
          return this[i];
        }
      } 
      return undefined; //H.throw("phases.find: '%s' unknown", phase);
    },

  });

  H.LIB.Tree = function(context){

    H.extend(this, {

      context: context,

      imports:  [
        "id",
        "player",
        "modifications",
        "culture",
        "query",
        "entities",
        "templates",
        "techtemplates",
        "operators",
      ],

      nodes:      null,
      sources:    null,
      names:      null,
      keys:       null,
      
      cntSources: 0,

    });

  };

  H.LIB.Tree.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Tree,
    log: function(){
      this.deb(); 
      this.deb("  TREE: expanded %s sources into %s nodes", this.cntSources, H.count(this.nodes));
    },
    deserialize: function(data){
      this.nodes = data;
      return this;
    },
    serialize: function(){

      var data = {};

      H.each(this.nodes, (nodename, node) => {

        data[nodename] = {};
        H.each(node, (propname, prop) => {

          if (propname === "template"){
            // API object
            data[nodename].template = null;

          } else if (propname === "producers"){
            // triples
            data[nodename].producers = {};
            H.each(prop, (producername) => {
              data[nodename].producers[producername] = null;
            });

          } else if (propname === "products"){
            // triples
            data[nodename].products = {count: prop.count, train: {}, build: {}, research: {}};
            H.each(prop.train, (productname) => {
              data[nodename].products.train[productname] = null;
            });
            H.each(prop.build, (productname) => {
              data[nodename].products.build[productname] = null;
            });
            H.each(prop.research, (productname) => {
              data[nodename].products.research[productname] = null;
            });

          } else {
            // primitives
            data[nodename][propname] = prop;

          }

        });

      });

      return data;

    },
    initialize: function(){

      this.civ = this.player.civ;

      if (this.nodes === null){

        this.nodes = {};

        this.sources = [].concat(
          H.attribs(this.player.researchedTechs), 
          H.attribs(this.modifications[this.id]),
          H.attribs(this.entities)
            .filter(id => this.entities[id].owner() === this.id)
            .map(id => this.entities[id]._templateName)
        );    

        this.sources = H.unique(this.sources).map(src => [0, src]);
        this.cntSources = this.sources.length;
        this.build();
        this.names = H.attribs(this.nodes);
        this.keys  = H.attribs(this.nodes).map(t => this.nodes[t].key);

        // deb("     T: found %s nodes", this.names.length);

      }

      return this;

    },
    finalize: function(){

      // after initialize AND deserialize

      var 
        tech, name, producers, nodes = this.nodes,
        phases = this.culture.phases,
        operMapper = {
          "BUILDBY":       "build_structures",
          "TRAINEDBY":     "train_units",
          "RESEARCHEDBY":  "research_tech"
        },
        verbMapper = {
          "BUILD":    "BUILDBY",
          "TRAIN":    "TRAINEDBY",
          "RESEARCH": "RESEARCHEDBY"
        };

      this.query("ENABLE DISTINCT").forEach(node => {
        tech = this.query(node.name + " REQUIRE").first().name;
        nodes[node.name].requires = tech;
      });

      // uplink info, producer

      "TRAIN BUILD RESEARCH".split(" ").forEach(verb => {
        this.query(verb + " DISTINCT").forEach(ent => {
          this.query(ent.name + " " + verbMapper[verb]).forEach(p => {
            nodes[ent.name].producers[p.name] = p;
          });
          nodes[ent.name].verb = verb.toLowerCase();
          nodes[ent.name].operator = this.operators[operMapper[verbMapper[verb]]];
        });
      });  

      this.query("PAIR DISTINCT").forEach(tech => {  
        this.query(tech.name + " PAIREDBY RESEARCHEDBY").forEach(p => {
          nodes[tech.name].producers[p.name] = p;
        });
        nodes[tech.name].verb = "research";
        nodes[tech.name].operator = this.operators.research_tech;
      });          

      this.query("SUPERSEDE DISTINCT").forEach(tech => {  
        this.query(tech.name + " SUPERSEDEDBY RESEARCHEDBY").forEach(p => {
          nodes[tech.name].producers[p.name] = p;
        });
        nodes[tech.name].verb = "research";
        nodes[tech.name].operator = this.operators.research_tech;
      });          

      // downlink info, products

      H.each(nodes, (name /*, node */) => {
        nodes[name].products.count = 0; // 
        "TRAIN BUILD RESEARCH".split(" ").forEach(verb => {
          this.query(name + " " + verb).forEach(p => {
            nodes[name].products.count += 1;
            nodes[name].products[verb.toLowerCase()][p.name] = p;
          });
        });
      });

      this.query("RESEARCHEDBY DISTINCT").forEach(researcher => {  
        this.query(researcher.name + " RESEARCH PAIR").forEach(p => {
          if (!nodes[researcher.name].products.research[p.name]){
            nodes[researcher.name].products.research[p.name] = p;
            nodes[researcher.name].products.count += 1; // H.count(nodes[researcher.name].products.research);
          }
        });
      });          

      this.query("RESEARCHEDBY DISTINCT").forEach(researcher => {  
        this.query(researcher.name + " RESEARCH SUPERSED").forEach(p => {
          if (!nodes[researcher.name].products.research[p.name]){
            nodes[researcher.name].products.research[p.name] = p;
            nodes[researcher.name].products.count += 1; // H.count(nodes[researcher.name].products.research);
          }
        });
      });          


      // setting research as verb for all phase alternatives

      // H.range(1, 4).forEach(n => {
      H.loop(3, n => {
        phases[n].alternates.forEach(a => {
          name = H.saniTemplateName(a);
          if (nodes[name] && !nodes[name].verb){
            nodes[name].verb = "research";
          }
        });
      });

      // setting producers for all phase alternatives

      H.loop(3, n => {
        producers = null;
        phases[n].alternates.forEach(a => {
          name = H.saniTemplateName(a);
          if (nodes[name] && H.count(nodes[name].producers)){
            producers = nodes[name].producers;
          }
        });
        // deb("  TREE: phase: %s, producers: %s", phases[n].abbr, uneval(producers));
        phases[n].alternates.forEach(a => {
          name = H.saniTemplateName(a);
          if (nodes[name] && !H.count(nodes[name].producers)){
            // nodes[name].producers = H.deepcopy(producers);
            nodes[name].producers = producers;
            // deb("tree: set %s", name);
          }
        });
      });

      // setting max resource flow for all trainer

      H.each(nodes, (name, node) => {
        node.flow = ( H.count(node.products.train) ?
          this.getFlowFromTrainer(name) :
          null
        );
      });

      // last time was 254 ms and 125 nodes on brain/athen 
      // deb();deb("  TREE: finalized %s msecs, %s nodes", Date.now() - t0, H.count(nodes));

    },
    getFlowFromClass: function(klass){

      return H.attribs(this.nodes[this.class2name(klass)].products.train)
        .map(name => this.query(name).first().costs)
        .map(costs => H.cost2flow(costs))
        .reduce(H.maxFlow, {food:0,wood:0,stone:0,metal:0});
    },

    getFlowFromTrainer: function(name){

      return H.attribs(this.nodes[name].products.train)
        .map(name => this.query(name).first().costs)
        .map(costs => H.cost2flow(costs))
        .reduce(H.maxFlow, {food:0,wood:0,stone:0,metal:0});
    },
    getType: function(tpln){

      return (
        this.techtemplates[tpln]      ? "tech" :
        tpln.contains("units/")       ? "unit" :
        tpln.contains("structures/")  ? "stuc" :
        tpln.contains("other/")       ? "othr" :
        tpln.contains("gaia/")        ? "gaia" :
        tpln.contains("pair_/")       ? "pair" :
          "XXXX"
      );

    },
    getPhase: function(tpln, space){

      var 
        test, 
        phases = this.culture.phases,
        phase = "phase_village", tpl = this.templates[tpln] || this.techtemplates[tpln];

      space = space || ""; // deb

      if ((test = H.test(tpl, "Identity.RequiredTechnology"))){
        phase = test;
      } else if ((test = H.test(tpl, "requirements.any"))){
        phase = test[0].tech;
      } else if ((test = H.test(tpl, "requirements.tech"))){
        phase = test;
      } else if (phases.find(tpln)){
        phase = phases.prev(tpln).generic;
      } else if (tpl.top) {
        return this.getPhase(tpl.top, space + "  ");
      }

      // deb("     P:%s %s -> %s", space, tpln, phase);

      if (!phases.find(phase)){
        return this.getPhase(phase, space + "  ");
      } else {
        return phase;
      }


    },
    build: function (){

      // picks from sources, analyzes, and appends branches to sources
      // thus traversing the tree

      var 
        tpln, key, tpl, name, src, test, depth = 0,
        phases = this.culture.phases,
        push = (item) => {
          var k = item.replace(/\{civ\}/g, this.civ);
          if(!(this.templates[k] || this.techtemplates[k])){
            this.deb("WARN  : tree.build: unknown template: '%s' in civ: %s from '%s'", k, this.civ, key);
          } else {
            this.sources.push([depth, item]);
          }
        };

      H.consume(this.sources, src => {

        tpln = src[1];
        key  = tpln.replace(/\{civ\}/g, this.civ);
        tpl  = this.templates[key] || this.techtemplates[key];
        name = H.saniTemplateName(key);

        if (!this.nodes[name]){

          this.nodes[name] = {
            name:          name,     // sanitized API template name
            key:            key,     // API template name
            type:            "",     // tech, unit, stuc
            template:       tpl,     // API template
            depth:       src[0],     // local depth
            operations:       0,     // planning depth, set in HTN.Economy
            order:            0,     // execution order, set in HTN.Economy
            phase:           "",     // vill, town, city
            requires:        "",     // sanitized tech template name
            producers:       {},     // {name: node, }
            verb:            "",     // train, build, research // uplink
            products: {              // downlink
              count:          0,     // amount of products
              train:         {},     // {name: node, }
              build:         {}, 
              research:      {}
            }, 
            operator:      null,    // planner.operator
          };

          // unit promotion, create warning with celt fortress
          if(key.slice(-2) === "_b"){
            push(key.slice(0, -2) + "_e");
            push(key.slice(0, -2) + "_a");
          }

          // can research tech
          if ((test = H.test(tpl, "ProductionQueue.Technologies._string"))){
            test.split(" ").forEach(push);
          }

          // can train ents
          if ((test = H.test(tpl, "ProductionQueue.Entities._string"))){
            test.split(" ").forEach(push);
          }

          // can build structs
          if ((test = H.test(tpl, "Builder.Entities._string"))){
            test.split(" ").forEach(push);
          }

          // needs tech
          if ((test = H.test(tpl, "Identity.RequiredTechnology"))){
            push(test);
          }

          // is tech
          if (tpl.supersedes){push(tpl.supersedes);}
          if (tpl.bottom){push(tpl.bottom);}
          if (tpl.top){push(tpl.top);}

          depth += 1;

        }

      });

      H.each(this.nodes, (name, node) => {
        node.type  = this.getType(node.key);
        node.phase = phases.find(this.getPhase(node.key)).abbr;
      });

    },

  });    

  H.LIB.Culture = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "id",
        "player",
        "query",
        "entities",
        "metadata",
        "events",
        "templates",
        "techtemplates",
      ],

      childs: [
        "store",
        "phases",
        "tree",
      ],

      civ :   "",
      tree:   null,
      store:  null,
      phases: null,

      verbs: H.Data.verbs,

      // stores nodes found in templates
      classes:       [],
      technologies:  [],
      resources:     [],
      resourcetypes: [],

      cntIngames:    0,
      cntNodes:      0,
      cntEdges:      0,

    });

  };


  H.LIB.Culture.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Culture,
    log: function (){
      this.deb();
      this.deb("  CULT: civ: %s, templates: %s, %s verbs, %s nodes, %s edges, %s ingames", 
        this.civ,
        H.count(this.templates),
        this.verbs.length,
        this.cntNodes,
        this.cntEdges,
        this.cntIngames
      );
      this.phases.log();
      this.tree.log();
      this.store.log();
      this.query("INGAME SORT < id")
        .parameter({fmt: "metadata", deb: 5, max: 80, cmt: "culture.log: ingames"})
        .execute();

    },
    serialize: function(){
      return {
        tree:   this.tree.serialize(),
        store:  this.store.serialize(),
        phases: this.phases.serialize(),
      };
    },
    deserialize: function(){
      if (this.context.data[this.name]){
        this.childs.forEach( child => {
          if (this.context.data[this.name][child]){
            this[child] = new H.LIB[H.noun(child)](this.context)
              .import()
              .deserialize(this.context.data[this.name][child]);
          }
        });
      }
    },
    finalize: function (){

      H.each(this.store.nodes, name => {
        delete this.store.nodes[name].template;
        delete this.store.nodes[name].classes;
      });

      this.childs.forEach( child => {
        if (this[child].finalize){
          this[child].finalize();
        }
      });

    },
    initialize: function (){

      this.civ = this.player.civ; 

      if (!this.phases){
        this.phases = new H.LIB.Phases(this.context)
          .import()
          .initialize();
      }

      if (!this.tree){
        this.tree = new H.LIB.Tree(this.context)
          .import()
          .initialize();
      }

      if (!this.store){
        this.store = new H.LIB.Store(this.context)
          .import()
          .initialize();

        this.searchTemplates();          // extrcact classes, resources, etc from templates
        this.loadNodes();                // turn templates to nodes
        this.loadEdges();                // add edges
        this.loadEntities();             // from game to triple store
        this.loadTechnologies();         // from game to triple store

      }

      H.each(this.store.nodes, (name, node) => {
        this.addNodeDynaProps(node);
      });

    },
    activate: function (){

      this.events.on("EntityCreated", msg => {
        this.loadById(msg.id);
      });

      // this.events.on("TrainingFinished", msg => {
      //   this.loadById(msg.id);
      // });

      // this.events.on("EntityRenamed", msg => {
        // covered by create/destroy
        // this.loadById(msg.id2);
        // this.removeById(msg.id);
      // });

      // this.events.on("AIMetadata", msg => {
      //   this.loadById(msg.id);
      // });

      this.events.on("Destroy", msg => {
        if (!msg.data.foundation){
          this.removeById(msg.id);
        }
      });

      // this.events.on("Advance", this.tree.id, msg => {
        // this.loadByName(msg.data.technology);
      // });

    },

    loadNodes: function(){

      var 
        self  = this, node, name, template, 
        sani  = H.saniTemplateName,
        counter = 0, counterTechs = 0, counterUnits = 0, counterStucs = 0,
        conf  = {
          "classes":        {deb: false, generic: "Class",         tooltip: "a class"},
          "resources":      {deb: false, generic: "Resource",      tooltip: "something to gather"},
          "resourcetypes":  {deb: false, generic: "ResourceType",  tooltip: "something to drop elsewhere"}
        };

      H.each(conf, function(type, conf){

        // load nodes collected in readTemplates

        self[type].forEach(function(tpln){

          name = sani(tpln);
          template = {Identity: {GenericName: conf.generic, Tooltip: conf.tooltip}};

          if (type === "classes" && H.Data.ClassInfo[name]){
            template.Tooltip = H.Data.ClassInfo[name];
          }

          node = self.addNode(name, tpln, template);
          counter += 1;     

          if (conf.deb){this.deb("     C: Node added: %s for %s", name, type);}

        });

        // deb("     C: created %s nodes for %s", H.tab(self[type].length, 4), type);

      });

      // load nodes collected in selectTemplates
      H.each(this.tree.nodes, function (name, template){
        counterTechs += template.type === "tech" ? 1 : 0;
        counterStucs += template.type === "stuc" ? 1 : 0;
        counterUnits += template.type === "unit" ? 1 : 0;
        node = self.addNode(template.name, template.key, template.template);
      });

      // deb("     C: created %s nodes for units", H.tab(counterUnits, 4));
      // deb("     C: created %s nodes for structures", H.tab(counterStucs, 4));
      // deb("     C: created %s nodes for technologies", H.tab(counterTechs, 4));

    },
    searchTemplates: function(){

      // searches for classes, resources and resourcetypes

      var list, tpl, self = this;

      H.each(this.tree.nodes, function(name, node){

        tpl = node.template;

        // classes
        if (tpl.Identity && tpl.Identity.VisibleClasses){
          list = tpl.Identity.VisibleClasses._string.toLowerCase();
          list = H.replace(list, "\n", " ");
          list.split(" ")
            .filter(klass => !!klass)
            .filter(klass => klass[0] !== "-") // ??
            .forEach(klass => self.classes.push(klass));
        }

        // more classes
        if (tpl.Identity && tpl.Identity.Classes){
          list = tpl.Identity.Classes._string.toLowerCase();
          list = H.replace(list, "\n", " ");
          list.split(" ")
            .filter(klass => !!klass)
            .filter(klass => klass[0] !== "-") //??
            .forEach(klass => self.classes.push(klass));
        }

        // even more classes
        if (tpl.GarrisonHolder && tpl.GarrisonHolder.List){
          tpl.GarrisonHolder.List._string.split(" ").forEach(function(klass){
            self.classes.push(klass.toLowerCase());
          });
        }

        // resources [wood.ruins]
        if (tpl.ResourceSupply && tpl.ResourceSupply.Type){
          self.resources.push(tpl.ResourceSupply.Type);
        }
        
        if (tpl.ResourceGatherer && tpl.ResourceGatherer.Rates){
          H.attribs(tpl.ResourceGatherer.Rates).forEach(function(resource){
            self.resources.push(resource);
          });
        }

        // resources type
        if (tpl.ResourceDropsite && tpl.ResourceDropsite.Types){
          tpl.ResourceDropsite.Types.split(" ").forEach(function(type){
            self.resourcetypes.push(type);
          });
        }

      });

      this.classes = H.unique(this.classes.sort());
      this.resources = H.unique(this.resources.sort());
      this.resourcetypes = H.unique(this.resourcetypes.sort());

    },
    loadEntities: function(){

      var 
        targetNodes = [], key, name, 
        nodeSource, nodeSourceName, 
        sani = H.saniTemplateName;

      // deb();deb("     C: loadEntities from game: %s total", H.count(this.entities));

      H.each(this.entities, (id, ent) => {

        key  = ent._templateName;
        name = sani(key) + "#" + id;

        if (ent.owner() === this.id){
          targetNodes.push(this.addNode(name, key, ent._template, ~~id));
          this.cntIngames += 1;
        }

      });

      targetNodes.forEach( nodeTarget => {

        nodeSourceName = nodeTarget.name.split("#")[0];
        nodeSource = this.store.nodes[nodeSourceName];

        if (!nodeSource){this.deb("ERROR : loadEntities nodeSource: %s", nodeSourceName);}
        if (!nodeTarget){this.deb("ERROR : loadEntities nodeTarget: %s", nodeTarget.name);}

        this.store.addEdge(nodeSource, "ingame",      nodeTarget);
        this.store.addEdge(nodeTarget, "describedby", nodeSource);

        this.cntEdges += 2;

      });

      // deb("     C: created %s nodes for game entities", H.tab(this.cntIngames, 4));
      // deb("     C: created %s edges for game entities", H.tab(this.cntEdges, 4));      

    },
    loadTechnologies: function(){

      var 
        store = this.store, 
        techs = this.player.researchedTechs,
        sani  = H.saniTemplateName,
        counter = 0, nameSource, nameTarget, nodeSource, nodeTarget, names = [];

      // TODO: Can tech be INGAME ???

      H.each(techs, (key, tech) => {

        nameTarget = sani(key);

        nameSource = H.format("%s#T", nameTarget);
        names.push(nameTarget);

        nodeTarget = store.nodes[nameTarget];
        nodeSource = this.addNode(nameSource, key, tech);
        
        store.addEdge(nodeSource, "techdescribedby", nodeTarget);
        store.addEdge(nodeTarget, "techingame",      nodeSource);
        
        this.cntEdges += 2;
        counter += 1;

      });

      // deb("     C: loaded %s nodes %s edges as tech: [%s]", H.tab(counter, 4), counter*2, names);  


    },
    loadById: function(id){

      // called by events

      var 
        sani = function(name){
          name = H.replace(name,  "_", ".");
          name = H.replace(name,  "|", ".");
          name = H.replace(name,  "/", ".").toLowerCase();
          // HACK: foundations
          if (name.split(".")[0] === "foundation"){
            name = name.split(".").slice(1).join(".");
          }
          return name;
        },
        ent  = this.entities[id],
        key  = ent._templateName,
        nameSource = sani(ent._templateName),
        nameTarget = nameSource + "#" + id,
        nodeTarget = this.addNode(nameTarget, key, ent._template, id),
        nodeSource = this.store.nodes[nameSource];

      this.store.addEdge(nodeSource, "ingame",      nodeTarget);
      this.store.addEdge(nodeTarget, "describedby", nodeSource);
      this.addNodeDynaProps(nodeTarget);

      // deb("  CULT: loadById %s <= %s", nameTarget, nameSource);

    },
    removeById: function(id){
      
      var 
        node = this.query("INGAME WITH id = " + id).first(), 
        ent  = this.entities[id],
        tpln = ent ? ent._templateName : "unknown";

      if (node){
        H.delete(this.store.edges, edge => edge[0] === node || edge[2] === node);
        delete this.store.nodes[node.name];

      } else {
        this.deb("WARN  : culture.removeById failed on id: %s, tpl: %s", id, tpln);
        this.query("INGAME SORT < id")
          .parameter({fmt: "metadata", deb: 5, max: 50, cmt: "removeById: ingames with metadata"})
          .execute();

      }

    },
    addNode: function(name, key, template, id){

      var 
        node = {
          name      : name,
          key       : key,
          template  : template  //TODO: remove this dependency
        },
        properties = {
          id        : ~~id || undefined,
          civ       : H.test(template, "Identity.Civ"), // this.getCivilisation(template),
          info      : this.getInfo(template),
          icon      : (!!template.Identity && template.Identity.Icon) ? template.Identity.Icon : undefined,       // tech
          size      : this.getSize(template),
          costs     : this.getCosts(template),
          speed     : this.getSpeed(template),
          armour    : this.getArmour(template),
          rates     : this.getRates(template),
          health    : this.getHealth(template), //TODO: ingames
          vision    : this.getVision(template),
          attack    : this.getAttack(template),
          affects   : this.getAffects(template),
          capacity  : this.getCapacity(template),
          requires  : this.getRequirements(template),     // tech
          autoresearch : (!!template.autoResearch ? template.autoResearch : undefined),       // tech
          modifications: H.test(template, "modifications"), //this.getModifications(template),
        };

      // create only props with value
      H.each(properties, function(prop, value){
        if(value !== undefined){
          node[prop] = value;
        }
      });

      this.store.addNode(node);
      this.cntNodes += 1;

      // deb("  CULT: addNode: %s, id: %s", node.name, id);

      return node;

    },    
    delNodeDynaProps: function(node){
      var props = [
        "position",
        "metadata",
        "slots",
        "state",
        "health"
      ];
      return H.dropcopy(node, props);
    },
    addNodeDynaProps: function(node){

      var id = node.id, metadata  = this.metadata, entities = this.entities; // CLOSURE !!

      // deb("  CULT: addNodeDynaProps: %s, %s", node.id, node.name);

      Object.defineProperties(node, {
        "position": {enumerable: true, get: function(){
          var pos = entities[id].position();
          return pos;
        }},
        "metadata": {enumerable: true, get: function(){
          var meta = metadata[id];
          return (meta === Object(meta)) ? meta : {};
        }},
        "slots": {enumerable: true, get: function(){
          if (!node.capacity){
            this.deb("WARN  : node.slots on invalid id: %s, tpl: %s", id, entities[id].templateName() || "???");
            return undefined;
          }
          var freeSlots = node.capacity - entities[id].garrisoned.length;
          return freeSlots;
        }},          
        "state": {enumerable: true, get: function(){
          var state = entities[id].unitAIState().split(".").slice(-1)[0].toLowerCase();
          return state;
        }},
        "health": {enumerable: true, get: function(){
          var ent = entities[id];
          return Math.round(ent.hitpoints() / ent.maxHitpoints()); // propbably slow
        }}
      });
    },
    logNode: function(node){
      var deb = this.deb;
      deb("    %s", node.name);
      deb("      : key  %s", node.key);
      deb("      : type %s", node.type);
      deb("      : desc %s", node.description);
      deb("      : clas %s", node.classes.join(", "));
      if (node.costs)   {deb("      :   cost:   %s", H.prettify(node.costs));}
      if (node.armour)  {deb("      :   armour: %s", H.prettify(node.armour));}
      if (node.health)  {deb("      :   health: %s", node.health);}
      if (node.capacity){deb("      :   capacity: %s", node.capacity);}
      if (node.requires){deb("      :   requires: %s", node.requires);}
    },
    getAttack: function(/* template */){

      // var ta = template.attack;
      // if (ta)
      // <Attack>
        // <Melee>
          // <Hack>40.0</Hack>
          // <Pierce>0.0</Pierce>
          // <Crush>0.0</Crush>
          // <MaxRange>5.0</MaxRange>
          // <RepeatTime>1500</RepeatTime>
        // </Melee>
        // <Charge>
          // <Hack>120.0</Hack>
          // <Pierce>0.0</Pierce>
          // <Crush>0.0</Crush>
          // <MaxRange>5.0</MaxRange>
          // <MinRange>0.0</MinRange>
        // </Charge>
        // <Slaughter>
        //   <Hack>25.0</Hack>
        //   <Pierce>0.0</Pierce>
        //   <Crush>0.0</Crush>
        //   <MaxRange>4.0</MaxRange>
        // </Slaughter>        
      // </Attack>    
    },
    getModifications: function(template){
      // "modifications": [
      //     {"value": "ResourceGatherer/Rates/food.grain", "multiply": 15, "affects": "Spearman"},
      //     {"value": "ResourceGatherer/Rates/food.meat", "multiply": 10}
      // ],      
      return template.modifications || undefined;
    },
    getRequirements: function(t){
      // "requirements": { "class": "Village", "numberOfTypes": 2 },
      // "requirementsTooltip": "Requires two village structures", 
      var tr = t.requirements;
      if (tr){
        if (tr.tech){
          return {tech: H.saniTemplateName(tr.tech)};
        } else if (tr.class) {
          return {class: H.saniTemplateName(tr.class), number: tr.number};
        } else if (tr.any) {
          return {any: tr.any}; //TODO: sani techs
        }
      }
      return t.requirements || undefined;
    },    
    getAffects: function(t){
      return !!t.affects ? !t.affects.map(String.toLowerCase) : undefined;
    },
    getType: function(template, type){
      type = [type];
      if (template.Identity !== undefined){
        if (template.Identity.GenericName !== undefined){
          type.push(template.Identity.GenericName);
        }
        if (template.Identity.SpecficName !== undefined){
          type.push(template.Identity.SpecificName);
        }
      }
      return type.join("|");
    },
    getInfo: function(t){

      var tip;

      return (
        (tip = H.test(t, "Identity.Tooltip")) ? H.replace(tip, "\n", " ") :
        (tip = H.test(t, "tooltip"))     ? tip :
        (tip = H.test(t, "description")) ? tip :
        (tip = H.test(t, "top"))         ? t.genericName :
        (tip = H.test(t, "genericName")) ? tip :
          undefined
      );

      // if (t.Identity !== undefined){
      //   if (t.Identity.Tooltip){
      //     tip = H.replace(t.Identity.Tooltip, "\n", " ");
      //   }
      // } else if (t.tooltip !== undefined) {
      //   tip = t.tooltip;
      // } else if (t.description) {
      //   tip = t.description;
      // } else if (t.top) { // pair
      //   tip = t.genericName;
      // } else if (t.genericName) { // phase.city
      //   tip = t.genericName;
      // }
      // return tip;
    }, 
    getCivilisation: function(t){
      // return H.test(t, "Identity.Civ")
      var civ;
      if (t.Identity !== undefined){
        if (t.Identity.Civ){
          civ = t.Identity.Civ;
        }
      }
      return civ;
    },
    // getRequirements: function(template){
      //   var requirement;
      //   if (template.Identity !== undefined){
      //     if (template.Identity.RequiredTechnology){
      //       requirement = template.Identity.RequiredTechnology;
      //     }
      //   }    
      //   return requirement;
      // },
    getHealth: function(t){
      var test;
      return (test = H.test(t, "Health.Max")) ? ~~test : undefined;
      //   (!!tpl.Health && ~~tpl.Health.Max) ? 
      //     ~~tpl.Health.Max : 
      //       undefined
      // );
    },
    getRates: function(tpl){
      // <ResourceGatherer>
      //   <MaxDistance>2.0</MaxDistance>
      //   <BaseSpeed>1.0</BaseSpeed>
      //   <Rates>
      //     <food.fruit>1</food.fruit>
      //     <food.grain>0.5</food.grain>
      //     <food.meat>1</food.meat>
      //     <wood.tree>0.7</wood.tree>
      //     <wood.ruins>5</wood.ruins>
      //     <stone.rock>0.5</stone.rock>
      //     <stone.ruins>2</stone.ruins>
      //     <metal.ore>0.5</metal.ore>
      //   </Rates>
      // </ResourceGatherer>      
      var rates = {}, has = false, speed, tr;
      if (!!tpl.ResourceGatherer && !!tpl.ResourceGatherer.Rates){
        speed = parseFloat(tpl.ResourceGatherer.BaseSpeed);
        tr = tpl.ResourceGatherer.Rates;
        H.each(tr, function(res, rate){
          has = true;
          if (res.contains(".")){
            var [p1, p2] = res.split(".");
            if (!rates[p1]){
              rates[p1] = {};
            }
            rates[p1][p2] = parseFloat(rate) * speed;

          } else {
            rates[res] = parseFloat(rate) * speed;
          }
        });
        // deb("rates: tpl: %s", tpl.Identity.GenericName, JSON.stringify(rates));
      }
      return has ? rates : undefined;
    },
    getSize: function(tpl){
      var size = {}; // {width: 0, depth: 0};
      if (tpl.Footprint){
        if (tpl.Footprint.Square) {
          if (tpl.Footprint.Square["@width"]){size.width = tpl.Footprint.Square["@width"];}
          if (tpl.Footprint.Square["@depth"]){size.depth = tpl.Footprint.Square["@depth"];}
        }
        if (tpl.Footprint.Circle && tpl.Footprint.Circle["@radius"]){
          size.radius = tpl.Footprint.Circle["@radius"];
        } else {
          size.radius = (Math.sqrt(size.width*size.width + size.depth*size.depth) / 2).toFixed(2);
        }
        // deb("      : square %s, tpl: %s, size: %s", uneval(tpl.Footprint.Square), tpl._templateName, uneval(size));
      }
      return H.count(size) > 0 ? size : undefined;
    },
    getSpeed: function(t){
      var test;
      return (test = H.test(t, "UnitMotion.WalkSpeed")) ? ~~test : undefined;
      // return (
      //   (!!tpl.UnitMotion && ~~tpl.UnitMotion.WalkSpeed) ? 
      //     ~~tpl.UnitMotion.WalkSpeed : 
      //       undefined
      // );
    },   
    getVision: function(t){
      var test;
      return (test = H.test(t, "Vision.Range")) ? ~~test : undefined;
      // return (
      //   (!!tpl.Vision && ~~tpl.Vision.Range) ? 
      //     ~~tpl.Vision.Range : 
      //       undefined
      // );
    },
    getCapacity: function(t){
      var test;
      return (test = H.test(t, "GarrisonHolder.Max")) ? ~~test : undefined;
      // return (
      //   (!!tpl.GarrisonHolder && ~~tpl.GarrisonHolder.Max) ? 
      //     ~~tpl.GarrisonHolder.Max : 
      //       undefined
      // );
    },
    getArmour: function(t){
      var armour = {}; // {hack: 0, pierce: 0, crush: 0};
      if (t.Armour !== undefined){
        if (~~t.Armour.Hack)  {armour.hack   = ~~t.Armour.Hack;}
        if (~~t.Armour.Pierce){armour.pierce = ~~t.Armour.Pierce;}
        if (~~t.Armour.Crush) {armour.crush  = ~~t.Armour.Crush;}
      }
      return H.count(armour) > 0 ? armour : undefined;
    },
    getCosts: function(t){
      // we want integers
      var has = false, costs = {population: 0, time: 0, food:0, wood: 0, stone: 0, metal: 0},
          TC = t.Cost, // ents
          tc = t.cost; // tech
      if (TC !== undefined){
        has = true;
        costs.population = ~~TC.Population || -~~TC.PopulationBonus || 0;
        // if (TC.Population)       {costs.population =  ~~TC.Population;} 
        // if (TC.PopulationBonus)  {costs.population = -~~TC.PopulationBonus;} 
        if (TC.BuildTime)        {costs.time       =  ~~TC.BuildTime;}
        if (TC.ResearchTime)     {costs.time       =  ~~TC.ResearchTime;}
        if (TC.Resources){
          if (TC.Resources.food) {costs.food  = ~~TC.Resources.food;} 
          if (TC.Resources.wood) {costs.wood  = ~~TC.Resources.wood;} 
          if (TC.Resources.metal){costs.metal = ~~TC.Resources.metal;}
          if (TC.Resources.stone){costs.stone = ~~TC.Resources.stone;}
        }
      } else if (tc !== undefined) {
        has = true;
        if (tc.food) {costs.food  = ~~tc.food;} 
        if (tc.wood) {costs.wood  = ~~tc.wood;} 
        if (tc.metal){costs.metal = ~~tc.metal;}
        if (tc.stone){costs.stone = ~~tc.stone;}
      }

      if (t.researchTime){
        costs.time =  ~~t.researchTime;
        has = true;
      }

      return has ? costs : undefined;

    },
    createEdges: function(verb, inverse, msg, test, targets, debug){

      var store = this.store, nodeTarget, counter = 0, deb = this.deb;

      debug = debug || false;

      H.each(store.nodes, (name, nodeSource) => {
        if (test(nodeSource)){
          if (debug){deb("     C: Edge.%s test: %s", verb, name);}
          targets(nodeSource).forEach( nameTarget => {
            nodeTarget = store.nodes[nameTarget];
            if (nodeTarget){
              store.addEdge(nodeSource, verb,    nodeTarget);
              store.addEdge(nodeTarget, inverse, nodeSource);
              this.cntEdges += 2;
              counter += 1;
              if (debug){deb("     C: Edge.%s:      -> %s", verb, nodeTarget.name);}
            } else {
              deb("ERROR : createEdges: verb: %s, no node for %s <= %s", verb, nameTarget, nodeSource.name);
            }
          });
        }
      });

      // deb("     C: created %s edges on pair: %s|%s - %s", H.tab(counter*2, 4), verb, inverse, msg);

    },        
    loadEdges: function(){

      // Entities member classes

      var sani = H.saniTemplateName;

      this.createEdges("supersede", "supersededby", "a tech order",
        function test(node){
          return !!node.template.supersedes;
        }, 
        function target(node){
          return [sani(node.template.supersedes)];
        }, false
      );

      this.createEdges("pair", "pairedby", "pair pairs two techs",
        function test(node){
          return !!node.template.top &&!!node.template.bottom;
        }, 
        function target(node){
          return [sani(node.template.top), sani(node.template.bottom)];
        }, false
      );

      this.createEdges("member", "contain", "Entities member/contain classes",
        function test(node){
          var identity = node.template.Identity;
          return !!identity && (
                 (!!identity.VisibleClasses &&identity.VisibleClasses._string !== undefined ) || 
                 (!!identity.Classes && identity.Classes._string !== undefined)
                 );
        }, 
        function target(node){
          var identity = node.template.Identity, classes = "";
          if (identity.VisibleClasses){classes += identity.VisibleClasses._string;}
          if (identity.Classes){classes += " " + identity.Classes._string;}
          classes = H.replace(classes, "\n", " ").toLowerCase();
          classes = classes.split(" ")
            .filter(klass => !!klass)
            .filter(klass => klass[0] !== "-");
          return H.unique(classes);
        }, false
      );


      // Entities provide resources

      this.createEdges("provide", "providedby", "entities provide resources",
        // gaia.special.ruins.stone.statues.roman -> stone.ruins
        function test(node){
          return node.template.ResourceSupply && 
                 node.template.ResourceSupply.Type;
        }, 
        function target(node){
          return [node.template.ResourceSupply.Type];
        }, false
      );


      // Entities gather resources

      this.createEdges("gather", "gatheredby", "entities gather resources",
        function test(node){
          return  !!node.template.ResourceGatherer &&
                  node.template.ResourceGatherer.Rates !== undefined;
        }, 
        function target(node){
          return H.attribs(node.template.ResourceGatherer.Rates).sort();
        }, false
      );


      // Entities build Entities (mind {civ})

      this.createEdges("build", "buildby", "entities build entities",
        // units.athen.infantry.spearman.a -> structures.athen.defense.tower
        function test(node){
          return  !!node.template.Builder && 
                  !!node.template.Builder.Entities &&
                  node.template.Builder.Entities._string !== undefined;
        }, 
        function target(node){
          var ents = H.replace(node.template.Builder.Entities._string.toLowerCase(), "\n", " ");
          if (ents.search("{civ}") !== -1){
            if(!node.template.Identity.Civ){
              this.deb("ERROR : {civ} but no Indetity.Civ");
            } else {
              ents = H.replace(ents, "{civ}", node.template.Identity.Civ);
            }
          }
          return (
            ents.split(" ").filter(function(s){return !!s;})
              .map(function(t){return H.replace(t, "_", ".");})
              .map(function(t){return H.replace(t, "/", ".");})
          );
        }, false
      );


      // Entities train Entities (mind {civ})

      this.createEdges("train", "trainedby", "entities train entities",
        function test(node){
          return  !!node.template.ProductionQueue && 
                  !!node.template.ProductionQueue.Entities &&
                  node.template.ProductionQueue.Entities._string !== undefined;
        }, 
        function target(node){
          var ents = H.replace(node.template.ProductionQueue.Entities._string.toLowerCase(), "\n", " ");
          if (ents.search("{civ}") !== -1){
            if(!node.template.Identity.Civ){
              this.deb("ERROR : {civ} but no Indetity.Civ");
            } else {
              ents = H.replace(ents, "{civ}", node.template.Identity.Civ);
            }
          }
          return (
            ents.split(" ").filter(function(s){return !!s;})
              .map(function(t){return H.replace(t, "_", ".");})
              .map(function(t){return H.replace(t, "/", ".");})
            );
        }, false
      );


      // Buildings hold classes

      this.createEdges("hold", "holdby", "entities hold classes",
        function test(node){
          return  !!node.template.GarrisonHolder &&
                  node.template.GarrisonHolder.List._string;
        }, 
        function target(node){
          var list = node.template.GarrisonHolder.List._string.toLowerCase();
          list = H.replace(list, "\n", " ");
          list = H.replace(list, "+", " ");
          return list.split(" ").filter(function(s){return !!s;});
        }, false
      );


      // Healer heal classes

      this.createEdges("heal", "healedby", "healer heal classes",
        function test(node){
          return  !!node.template.Heal &&
                  node.template.Heal.HealableClasses._string !== undefined;
        }, 
        function target(node){
          return (
            H.replace(node.template.Heal.HealableClasses._string.toLowerCase(), "\n", " ")
              .split(" ").filter(function(s){return !!s;})
            );
        }, false
      );


      // Entities research technologies

      this.createEdges("research", "researchedby", "entities research technologies",
        function test(node){
          return  !!node.template.ProductionQueue && 
                  !!node.template.ProductionQueue.Technologies &&
                  node.template.ProductionQueue.Technologies._string;
        }, 
        function target(node){
          return (
            H.replace(node.template.ProductionQueue.Technologies ._string.toLowerCase(), "\n", " ")
              .split(" ").filter(function(s){return !!s;})
              .map(function(t){return H.replace(t, "_", ".");})
              .map(function(t){return H.replace(t, "/", ".");})
            );
        }, false
      );


      // Entities require/enable technologies

      this.createEdges("require", "enable", "entities require/enable technologies",
        // other.wallset.palisade -> phase.village
        function test(node){
          return  (
            !!node.template.Identity && 
            !!node.template.Identity.RequiredTechnology
          );
        }, 
        function target(node){
          var tech = node.template.Identity.RequiredTechnology;
          tech = H.replace(tech, "_", ".");
          tech = H.replace(tech, "/", ".");
          return [tech];
        }, false
      );


      // Entities accept resourcestype (Dropsite)

      this.createEdges("accept", "acceptedby", "entities accept resourcetypes (dropsites)",
        function test(node){
          return  (
            !!node.template.ResourceDropsite &&
            node.template.ResourceDropsite.Types !== undefined
          );
        }, 
        function target(node){
          return (
            H.replace(node.template.ResourceDropsite.Types.toLowerCase(), "\n", " ")
              .split(" ").filter(function(s){return !!s;})
            );
        }, false
      );


      // Entities carry resourcestype (Ships)

      this.createEdges("carry", "carriedby", "entities carry resourcetypes (ships, trader, gatherer)",
        // units.athen.cavalry.javelinist.e -> food
        function test(node){
          return  !!node.template.ResourceGatherer && 
                  node.template.ResourceGatherer.Capacities !== undefined;
        }, 
        function target(node){
            return H.attribs(node.template.ResourceGatherer.Capacities).sort();
        }, false
      );

    }    

  });

return H; }(HANNIBAL));
/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, H, logObject, deb */

/*--------------- D A T A -----------------------------------------------------

  The settings for all difficulties, attempting to leave nothing in the code,
  including access functions to select values for given difficulty.


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/

HANNIBAL = (function(H){

  // group scripts
  H.Data.Groups.whitelist = [
    "launch",       // group instance launched
    "assign",       // resource added to asset
    "destroy",      // final call
    "attack",       // enemies become a thread
    "tick",         // ticking
    "connect",      // user added to shared asset
    "disConnect",   // remove user from shared asset
    "radio",        // bot radio
    "release"       // de-garrison
  ];

  // Triple Store Verbs, in order of frequency with ingames first
  H.Data.verbs = [
    "ingame",     "describedby",      // ingame entities and their templates
    "techingame", "techdescribedby",  // ingame technologies and their templates 
    "member",     "contain",          // classes have entities as members
    "build",      "buildby",          // units building structures
    "gather",     "gatheredby",       // units picking resources types: food.gran, wood.tree, treasure
    "carry",      "carriedby",        // entities carrying resources: wood, stone, metal, food
    "hold",       "holdby",           // structures garrison units
    "require",    "enable",           // entities require/enable technologies: phase.town, unlock.female.houses
    "pair",       "pairedby",         // coupled technologies
    "train",      "trainedby",        // structures training units
    "research",   "researchedby",     // entities research technologies
    "accept",     "acceptedby",       // dropsites accepts resources: wood, stone, metal, food
    "heal",       "healedby",         // entities heal classes
    "provide",    "providedby",       // Entities provide resourcetype: food.grain, stone.ruins
    "supersede",  "supersededby",     // chained technologies
  ];

  H.Data.stances = [
    "violent", 
    "aggressive", 
    "defensive", 
    "passive", 
    "standground"
  ];

  H.Data.formations = [
    "Scatter", 
    "Column Closed", 
    "Line Closed", 
    "Column Open", 
    "Line Open", 
    "Battle Line",
    "Box",
    "Flank",
    "Skirmish",
    "Wedge",
    "Phalanx",
    "Syntagma",
    "Testudo"
  ];

  // see mods/public/civs
  H.Data.Civilisations = {
    athen:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Athenians‎",
    },
    brit:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Britons",
    },
    cart:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ:_Carthaginians‎",
    },
    celt:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Celts",
    },
    gaul:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Gauls‎",
    },
    hele:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Hellenes‎",
    },
    iber:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Iberians‎",
    },
    mace:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Macedonians",
    },
    maur:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Mauryans",
    },
    pers:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Persians‎",
    },
    ptol:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Ptolemies‎",
    },
    rome:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Romans_Republican",
    },
    sele:  {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Seleucids",
    },
    spart: {
      active: true,
      wiki: "trac.wildfiregames.com/wiki/Civ%3A_Spartans‎",
    },
    theb:  {
      active: false,
      wiki: "",
    }
  };


  // nodes civs borrows from other civs //TODO: check the real template
  // init is post poned
  H.Data.RootNodes = function(){ return {

    "*": {
      "animal":                  {key: "animal",   template: {Identity: {GenericName: "Generic",  Tooltip: "a class imported from H.Data"}}},
      "elephant":                {key: "elephant",   template: {Identity: {GenericName: "Generic",  Tooltip: "a class imported from H.Data"}}},
      "seacreature":             {key: "seacreature",   template: {Identity: {GenericName: "Generic",  Tooltip: "a class imported from H.Data"}}},
      "domestic":                {key: "domestic", template: {Identity: {GenericName: "Generic",  Tooltip: "a class imported from H.Data"}}},
      "palisade":                {key: "palisade", template: {Identity: {GenericName: "Generic",  Tooltip: "a class imported from H.Data"}}},
      "gaia.fauna.sheep":        {key: "gaia/fauna_sheep", template: H.Templates["gaia/fauna_sheep"] },
      "gaia.fauna.fish":         {key: "gaia/fauna_fish", template: H.Templates["gaia/fauna_fish"] },
      "other.wallset.palisade":  {key: "other/wallset_palisade", template: H.Templates["other/wallset_palisade"] },
    },

    "athen": {
      
    },

    "hele": {
      "wonder":                  {key: "wonder",                  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "structures.hele.wonder":  {key: "structures/hele_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "units.mace.thureophoros": {key: "units/mace_thureophoros", template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "units.mace.thorakites":   {key: "units/mace_thorakites",   template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    "mace": {
      "wonder":                  {key: "wonder",                  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "units.hele.ship.bireme":  {key: "units/hele_ship_bireme",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "units.hele.ship.trireme": {key: "units/hele_ship_trireme", template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "structures.mace.wonder":  {key: "structures/mace_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    "spart": {
      "wonder":                   {key: "wonder",                   template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "units.hele.hero.leonidas": {key: "units/hele_hero_leonidas", template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "structures.spart.wonder":  {key: "structures/spart_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
      "other.hellenic.stoa":      {key: "other/hellenic_stoa",      template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    "celt": {
      "wonder":                   {key: "wonder",                  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "structures.celt.wonder":   {key: "structures/celt_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    "gaul": {
      "wonder":                   {key: "wonder",                  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "structures.gaul.wonder":   {key: "structures/gaul_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    "iber": {
      "wonder":                   {key: "wonder",                  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "structures.iber.wonder":   {key: "structures/iber_wonder",  template: {Identity: {GenericName: "Generic",  Tooltip: "entity imported from H.Data"}}},
    },

    "maur": {
      "siege":                    {key: "siege",                   template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
    },

    "ptol": {
      "units.ptol.hero.ptolemy.i":   {key: "units/ptol_hero_ptolemy_i",  template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "units.ptol.hero.ptolemy.iv":  {key: "units/ptol_hero_ptolemy_iv", template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
      "units.ptol.mechanical.siege.lithobolos.packed": {key: "units/ptol_mechanical_siege_lithobolos_packed", template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
    },

    "sele": {
      "units.sele.cavalry.javelinist.b": {key: "units/sele_cavalry_javelinist_b", template: {Identity: {GenericName: "Generic",  Tooltip: "class imported from H.Data"}}},
    },


  };};


  H.Data.Explorer = H.Data.Explorer || {};
  H.Data.Explorer.examples = [
    "MEMBER",
    "MEMBER DISTINCT",
    "siege HOLDBY",
    "structures.athen.market REQUIRE",
    "phase.town.athen RESEARCHEDBY",
    "structures.athen.civil.centre RESEARCH",
    "RESEARCH DISTINCT SORT < name",
    "RESEARCH DISTINCT SORT < name WITH costs.metal > 0",
    "RESEARCH DISTINCT SORT < name WITH requires.tech = 'phase.city'"
  ];

  H.Data.ClassInfo = {
    'aqua':        "Vegetation on water.",
    'bow':         "Infantry Archer, Cavalry Archer.",
    'cavalry':     "This is a variation of a Citizen Soldier (units with economic and military capabilities) that rides on a beast or is pulled by a beast. All Cavalry Citizen Soldiers: Cavalry Swordsman, Cavalry Spearman, Cavalry Javelinist, Cavalry Archer.",
    // 'civic':       "Structures that 'serve the people'.",
    'citizensoldier': "Land units that serves a dual economic and military role (split into Infantry Citizen Soldiers and Cavalry Citizen Soldiers): Infantry Swordsman, Infantry Spearman, Infantry Javelinist, Infantry Archer, Infantry Slinger, Cavalry Swordsman, Cavalry Spearman, Cavalry Javelinist, Cavalry Archer. ",
    'defensive':   "Defensive Structures: Outpost, Wall, Tower, Gate, (any Wall or Tower SBs).",
    'economic':    "Structures that promote an economy.",
    'farmstead':   "Building to drop food.",
    'fauna':       "These are animals. Some are sources of Food.",
    'flora':       "These are forms of vegetation. Vegetation on dry land.",
    'foot':        "Non-mounted infantry, support and special infantry: Infantry Citizen Soldiers, Female Citizen, Healer, Super Infantry Unit, non-mounted Heroes.",
    'gaia':        "an entity that represents 'nature'.",
    'gaiabuilding': "A special building unique to Gaia (such as a Settlement).",
    'geo':         "Non-living. Inorganic. These are rocks, minerals and anything in nature that isn't 'alive'.",
    'hero':        "This is a legendary unit that is unique to a civilisation and has special powers. A significant figure from the civilisation's history: (all three Heroes for this civilisation).",
    'house':       "Housing Structures: Civilian Centre, House, Farmstead, Dock, Market, Temple, Fortress.", 
    'infantry':    "This is a variation of a Citizen Soldier (units with economic and military capabilities) that walks on foot. All Infantry Citizen Soldiers: Infantry Swordsman, Infantry Spearman, Infantry Javelinist, Infantry Archer, Infantry Slinger.",
    'javelin':     "Infantry Javelinist, Cavalry Javelinist.",
    'mechanical':  "This unit is a mechanical weapon. A mechanical conveyance or weapon: Onager, Ballista, Ram, Merchantman, Bireme, Trireme, Quinquereme, Super Siege Unit (if applicable).",
    'melee':       "Units that fight in hand-to-hand combat, typically associated with hack attack. (All units with a melee weapon.)",
    'military':    "Structures that provide for the defense. Non-mechanical land units capable of attacking opposing units: Infantry Citizen Soldiers, Cavalry Citizen Soldiers, Super Units and Heroes. ",
    'mineral':     "Typically a source of Ore.",
    'mounted':     "A 'humanoid' unit that rides some kind of mount (horseback, camelback, donkey, animal drawn cart, elephant or chariot): Cavalry Citizen Soldiers, Super Cavalry Units, mounted Heroes.",
    // 'norm':        "This is a normal structure.  Some structures serve as training centres for units and gateways to researching of technologies.",
    'offensive':   "Military Production Structures: Civilian Centre, Barracks, Dock, Fortress.",
    'organic':     "All units that aren't in the Mechanical category (basic and special infantry and cavalry, and support units).",
    'other':       "anything that isn't a Unit, Structure, or Gaia (eg a projectile).",
    'phase.city':  "City Phase Structures: Fortress, (any SBs).",
    'phase.town':  "Town Phase Structures: Barracks, Market, Temple, Dock. ",
    'phase.village': "Village Phase Structures: Civilian Centre, House, Mill, Farmstead, Field, Corral, Outpost, Wall, Tower, Gate. ",
    'plant':       "This is low lying vegetation. They're typically just eye candy.",
    'projectile':  "An airborne weapon that causes damage.",
    'ranged':      "Units that fight with missile weapons, typically associated with pierce attack. (All units with a ranged weapon.)",
    'resource':    "Any entity from which a resource may be collected. Or this is not a structure at all, but a resource that can be 'built' by a player (fields and corrals).",
    'rock':        "Typically a source of Stone.",
    'ship':        "Provide passage over waterways. Merchantman, Bireme, Trireme, Quinquereme. ",
    'siege':       "Typically units whose purpose is the destruction of structures. Onager, Ballista, Land Ram. ",
    'sling':       "Infantry Slinger.",
    'spear':       "Infantry Spearman, Cavalry Spearman. ",
    'special':     "Anything that doesn't fit the above categories.",
    'stone':       "(Civ-dependent; Structures constructed of stone).",
    'structure':   "an entity that doesn't move around, but may be controlled by the player.",
    'superunit':   "This unit is unique to a civilisation and has special traits that make it unique and super. A particularly powerful, rare and expensive unit, typically unique to a civilisation, and more likely than most units to require unique content. Its closest relation would probably be the Ao(x) UU: Super Infantry Unit, Super Cavalry/Siege Unit. ",
    'supply':      "Resource Structures: Civilian Centre, Mill, Farmstead.",
    'support':     "These units do not have any military capabilities. Female Citizen, Healer, Trader. ",
    'sword':       "Infantry Swordsman, Cavalry Swordsman. ",
    'tower':       "Tower Structures: Outpost, Tower, (any Tower SBs).", 
    'trade':       "Trader, Merchantman. ",
    'tree':        "This is tall vegetation. They're typically a source of Wood.",
    'unit':        "an entity that can move around and may be controllable by a player.",
    'wall':        "Wall Structures: Wall, (any Wall SBs).", 
    'warship':     "A naval unit serving only a military purpose: Bireme, Trireme, Quinquereme. ",
    'wood':        "(Civ-dependent; Structures constructed of wood).",
    'worker':      "Infantry Swordsman, Infantry Spearman, Infantry Javelinist, Infantry Archer, Infantry Slinger, Female Citizen.",
  };

return H; }(HANNIBAL));
/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- E C O N O M Y -----------------------------------------------

  Priotizes requests for resources. Trains, researches and construct them.
  includes stats, producers, order, orderqueue

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Stats = function(context){

    var 
      bufferLength = context.config.stats.lengthStatsBuffer,
      ress = {food: 0, wood: 0, stone: 0, metal: 0, pops: 0, health: 0, area: 0};

    H.extend(this, {

      context:  context,
      imports:  [
        "player"
      ],

      ress:        H.deepcopy(ress),
      gatherables: ["food", "wood", "stone", "metal"],

      stock: H.deepcopy(ress), 
      // totals gathered, difference per tick, flow = avg over diff
      suply: H.deepcopy(ress), 
      diffs: H.map(ress, H.createRingBuffer.bind(null, bufferLength, [], 0, 0)),
      flows: H.deepcopy(ress), 
      alloc: H.deepcopy(ress), // allocated per queue
      forec: H.deepcopy(ress), // ???
      trend: H.deepcopy(ress), // as per suply
      stack: H.map(ress, H.createRingBuffer.bind(null, bufferLength, [], 0, 0)), // last x stock vals

    });

  };

  H.LIB.Stats.prototype = H.mixin(
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Stats,
    log: function(){
      this.deb();
      this.deb("  STAT: stock: %s", JSON.stringify(this.stock));
    },
    logTick: function(){
      this.deb("  STAT: stock: %s", JSON.stringify(this.stock));
    },
    initialize: function(){
      this.tick();
      return this;
    },
    deserialize: function(data){ // child
      if (data){
        H.extend(this, {
          stock: data.stock, 
          suply: data.suply, 
          diffs: H.map(data.diffs, (key, data) => H.createRingBuffer.apply(null, data)), // last x stock vals
          flows: data.flows, 
          alloc: data.alloc,
          forec: data.forec, 
          trend: data.trend, 
          stack: H.map(data.stack, (key, data) => H.createRingBuffer.apply(null, data)), // last x stock vals
        });
      }
      return this;
    },
    serialize: function(){
      return {
        stock: H.deepcopy(this.stock), 
        suply: H.deepcopy(this.suply), 
        diffs: H.map(this.diffs, (key, buffer) => buffer.serialize()), // buffer !!
        flows: H.deepcopy(this.flows), 
        alloc: H.deepcopy(this.alloc),
        forec: H.deepcopy(this.forec), 
        trend: H.deepcopy(this.trend), 
        stack: H.map(this.stack, (key, buffer) => buffer.serialize()), // buffer !!
      };
    },
    tick: function(tick, secs){

      var 
        t0 = Date.now(), curHits = 1, maxHits = 1, 
        gathered  = this.player.statistics.resourcesGathered,
        available = this.player.resourceCounts;

      // update
      this.import();
          
      // gather diffs
      this.gatherables.forEach( prop => { 
        this.diffs[prop].push(gathered[prop] - this.suply[prop]); // prep flows
        this.suply[prop]   = gathered[prop];                 // totals
        this.stock[prop]   = available[prop];                // available
      });
      
      // other data
      this.stock.pops   = this.player.popCount;
      this.stock.area   = this.player.statistics.percentMapExplored;
      this.stock.health = ~~((curHits / maxHits) * 100); // integer percent only    

      // buffers
      H.attribs(this.ress).forEach( prop => { 
        this.stack[prop].push(this.suply[prop]);      // buffers
        this.trend[prop] = this.stack[prop].trend();  // trend
        this.flows[prop] = this.diffs[prop].avg();    // 
      });

      return Date.now() - t0;

    },

  });

  H.LIB.Producers = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "query",
        "culture",
        "config",
        "entities",
        "metadata",
      ],

      producers: null,

      maxqueue: 0,

      // producer info template
      info:      {
        id:        0,   // entity id
        name:     "",   // node name
        queue:    [],   // taskids or techs
        simqueue: [],   // simulates engine's queue for simulations
        allocs:    0,   // per orderqueue cycle
      },

    });

  };

  H.LIB.Producers.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Producers,
    log: function(){
      var count;
      this.deb();
      if ((count = H.count(this.producers))){
        this.deb("   PDC: have %s producers", count);
        H.attribs(this.producers)
          .sort((a, b) => ~~a < ~~b ? -1 : 1)
          .forEach( nameid => {
            var [name, id] = nameid.split("#");
            this.deb("     P: %s %s", id, this.infoProducer(name));
        });
      } else {
        this.deb("   PDC: log: no producer registered");
      }
    },
    logTick: function(){
      var count, name, id, allocs, queue, t = H.tab;
      if ((count = H.count(this.producers))){
        // this.deb("   PDC: have %s producers", count);
        if (false){
          this.deb("*");
          H.attribs(this.producers)
            // .filter(a => this.producers[a].queue.length)
            .sort((a, b) => this.producers[a].queue.length > this.producers[b].queue.length ? -1 : 1)
            .forEach( nameid => {
              [name, id] = nameid.split("#");
              allocs = this.producers[nameid].allocs;
              queue  = this.producers[nameid].queue;
              this.deb("     P: %s %s %s ", t("#" + id, 4), t(allocs,3), uneval(queue), nameid);
          });
          this.deb("*");
        }
      } else {
        this.deb("   PDC: log: no producer registered");
      }
    },
    deserialize: function(data){ // child
      this.producers = data ? data : null; //{};
      return this;
    },
    serialize: function(){
      return H.deepcopy(this.producers);
    },
    initialize: function(){
      this.maxqueue = this.config.economy.maxQueueLength;
      return this;
    },
    finalize: function(){
      if (!this.producers){
        this.producers = {};
        this.query("INGAME").forEach(this.register, this);
      }
    },
    infoProducer: function(name){
      var tree = this.culture.tree.nodes;
      return H.format("%s train: %s, build: %s, research: %s", name,
        H.count(tree[name].products.train),
        H.count(tree[name].products.build),
        H.count(tree[name].products.research)
      );
    },
    findCentre: function(){
      var producer, names = H.attribs(this.producers), i = names.length;
      while ((producer = this.producers[names[--i]])){
        if (producer.name === this.nameCentre){
          return producer;
        }
      }      
      return null;
    },
    register: function(nodeOrId){

      var 
        check, 
        node = H.isInteger(nodeOrId) ? this.query("INGAME WITH id = " + nodeOrId).first() : nodeOrId,
        id   = H.isInteger(nodeOrId) ? nodeOrId : node.id,
        name = node.name.split("#")[0],
        tree = this.culture.tree.nodes;

      // deb("   PDC: to register: %s, %s", name, id);

      check = (
        !this.producers[node.name] &&                 // is not already registered
        tree[name]                 &&                 // is a node
        tree[name].products.count                     // has products
      ); 

      if (check){
        this.producers[node.name] = H.mixin(
          H.deepcopy(this.info), {id: id, name: name}
        );
        // deb("   PDC: registered: %s", uneval(this.producers[node.name]));
      } else {
        // deb("   PDC: NOT registered: %s, %s", name, id);
      }

    },
    remove: function(nodeOrId){
      
      var id = H.isInteger(nodeOrId) ? nodeOrId : nodeOrId.id;

      H.each(this.producers, (nameid, info) => {
        if (info.id === id){
          delete this.producers[nameid];
          this.deb("   PDC: removed id: %s, name: %s", id, info.name);
        }        
      });

    },  
    // canqueue: function(producer, amount){
    //   return producer.queue.length + amount < this.maxqueue;
    // },
    queue: function(producer, taskidOrTech){
      producer.queue.push(taskidOrTech);
      this.deb("   PDC: queued: task: %s in queue: %s | %s", taskidOrTech, producer.queue, producer.name);
    },
    unqueue: function(verb, taskidOrTech){

      // probably slow

      var found = false;

      H.each(this.producers, (name, producer) => {
        if(!found && producer.queue.length){
          if (H.delete(producer.queue, task => task === taskidOrTech)){
            found = true;
            // this.deb("   PDC: unqueue: removed task: %s from queue: %s | %s", taskidOrTech, producer.queue, producer.name);
          }
        }
      });

      if (!found) {
        this.deb("   PDC: unqueue: not found in any queue: %s, %s", verb, taskidOrTech);
      }

    },
    resetAllocations: function(){
      H.each(this.producers, (name, producer) => {
        producer.allocs = producer.queue.length;
      });      
    },
    allocate: function(node, verb){

      if (verb === "build"){
        return true;

      } else if (node.producer.allocs < this.maxqueue){
        node.producer.allocs += 1;
        return true;
      
      } else {
        return false;

      }

    },
    find: function(product, cc){

      // returns matching producer with most free slots, if avail.
      // TODO: calculate exactly best producer, based on queue length and -items

      var 
        producer, check = false, found = false, candidates = [],
        tree  = this.culture.tree.nodes,
        verb  = tree[product].verb, 
        names = H.attribs(this.producers),
        i     = names.length;

      switch (verb){

        case "build":

          // only checks for existence no queue when building
          while (i-- && !found){
            producer = this.producers[names[i]];
            if (tree[producer.name].products.build[product]){
              found = true;  
            }        
          }

        break;

        case "research":

          // can ignore cc
          if (product.contains("phase")){
            if ((producer = this.findCentre())){ // TODO: search over all centres
              if (producer.allocs >= this.maxqueue){
                // deb("   PDC: max: %s", uneval(producer));
                producer = null;
              }
            }
          } else {
            while (i-- && !found){
              producer = this.producers[names[i]];
              found = (
                tree[producer.name].products.research[product] && 
                producer.allocs < this.maxqueue
              );
            }
          }
        break;
        
        case "train": //TODO: break on allocs = 0;

          while (i-- && !found){
            producer = this.producers[names[i]];
            check = (
              tree[producer.name].products.train[product] &&
              producer.allocs < this.maxqueue && 
              (!cc || this.metadata[producer.id].cc === cc)
            );
            if (check){
              candidates.push(producer);
            }
          }
          if (candidates.length){
            found = true;
            candidates.sort((a, b) => a.allocs > b.allocs ? 1 : -1);
            producer = candidates[0];
          }

        break;

        default: 
          // units.athen.infantry.archer.a
          // H.throw("PDC: can't find producer for %s with unknwon verb: '%s'", product, verb);
          return null;
        
      }

      if (producer && found){
        // deb("   PDC: found: verb: %s : %s#%s for %s in %s, meta: %s", 
        //   verb, 
        //   producer.name, producer.id, 
        //   product, cc,
        //   uneval(this.metadata[producer.id])
        // );
      } else {
        // deb("   PDC: no producer found for %s at cc: %s", product, cc)      
      }

      return producer && found ? producer : null;

    },

  });

  H.LIB.Order = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "bot",
        "economy",
        "query",
        "culture",
        "technologies",
        "events",
        "resources",
      ],

    });

    //TODO: make units move to order.position

  };

  H.LIB.Order.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Order,
    initialize: function(order){
      H.extend(this, order, {
        id:         order.id         || this.context.idgen++,
        processing: 0,
        remaining:  order.remaining  || order.amount,
        product:    null,
        x:          order.location ? order.location[0] : NaN,
        z:          order.location ? order.location[1] : NaN,
      });
      return this;
    },
    serialize: function(){
      return {
        id:         this.id,
        x:          this.x,
        z:          this.z,
        amount:     this.amount,
        remaining:  this.remaining,
        processing: this.processing,
        verb:       this.verb, 
        hcq:        this.hcq, 
        source:     this.source, 
        shared:     this.shared,
      };
    },

    evaluate: function(allocs){

      // analyzes the order specs and 
      // assigns ingame entities, if possible or
      // finds the one best fitting template 
      // to produce

      var 
        sorter, producer,
        producers = this.economy.producers;

      this.product = null;   // to be determined

      if(this.remaining - this.processing < 1){
        // nothing left to do
        return;
      }

      // make own copy of store data
      this.nodes = this.query(this.hcq).map( node => {
        return {
          name:      node.name,
          key:       node.key,
          costs:     node.costs,
          qualifies: true,
          producer:  null,
          info:      ""
        };
      });

      // assigns ingames if available and matching
      this.assignExisting();      
      if(this.remaining - this.processing < 1){
        // nothing left to do
        return;
      } 

      // check whether ingame producer exists
      this.nodes.forEach( node => {
        // deb("evaluate: %s node: ", self.id, node.name);
        producer = producers.find(node.name, this.cc);
        if (producer){
          node.producer = producer;
          // deb("evaluate: %s prod for %s #%s %s", self.id, node.name, producer.id, producer.name);
        } else {
          node.qualifies = false;
          node.info += !producer ? "no producer, " : "";
        }
      });

      // any unmet techs
      this.nodes
        .filter( node => node.qualifies)
        .forEach( node => {

          var 
            req    = this.culture.tree.nodes[node.name].requires,
            phase  = this.culture.tree.nodes[node.name].phase,
            phases = this.culture.phases;
          
          if (phases.find(phase).idx > phases.find(phases.current).idx){
            node.qualifies = false; 
            node.info = "needs phase " + phase; 
            return;
          }

          if (req && !this.technologies.available([req])){
            node.qualifies = false; 
            node.info = "needs req " + req; 
            return;
          }

      });  

      this.nodes.forEach( node => {
        // deb("    OE: %s %s", node.name, node.info);
      });

      // remove disqualified nodes
      H.delete(this.nodes, node => !node.qualifies);

      // still here?
      if (this.nodes.length){

        // bot priotizes units by phase, speed, availability, armor, etc.
        if (this.verb === "train"){        
          sorter = this.bot.unitprioritizer();
          sorter(this.nodes);
        }

        // try to allocate slot from top node producer
        if (producers.allocate(this.nodes[0], this.verb)){

          // we have a winner
          this.product    = this.nodes[0];  
          this.executable = true;

        } else {
          // too bad
        }

      }

    },
    assignExisting: function(){

      var verb = this.verb, hcq = (

        // looking for a virtual asset
        verb === "find" ? this.hcq :
        verb === "path" ? this.hcq :

        // looking for a technology
        verb === "research" ? this.hcq :

        // looking for unit not assigned to a group
        verb === "train" ? this.hcq + " INGAME WITH metadata.opname = 'none'" :
        
        // looking for a shared structure
        verb === "build" && this.shared ? this.hcq + " INGAME WITH metadata.opmode = 'shared'" :

        // looking for abandoned structure not assigned to a group
        verb === "build" && !this.shared ? this.hcq + " INGAME WITH metadata.opname = 'none'" :

        // error
          this.deb("ERROR : assignExisting run into unhandled case: %s, shared: %s", this.verb, this.shared)
      
      );

      if (verb === "path"){
        // assuming order done
        this.remaining = 0; 
        this.events.fire("OrderReady", {
          player: this.context.id,
          id:     NaN,
          data:   {
            order: this.id, 
            source: this.source, 
            resources: new H.LIB.Path(this.context, this.hcq).path
          }
        });

      } else if (verb === "find"){
        // assuming order done
        this.remaining = 0; 
        this.events.fire("OrderReady", {
          player: this.context.id,
          id:     NaN,
          data:   {order: this.id, source: this.source, resources: this.resources.find(this)}
        });


      } else if (verb === "train" || verb === "build"){
        this.query(hcq)
          .execute()
          .slice(0, this.remaining - this.processing)
          .forEach( node => {
            this.remaining -= 1; 
            this.events.fire("OrderReady", {
              player: this.context.id,
              id:     node.id,
              data:   {order: this.id, source: this.source}
          });
        });

      } else {
        this.deb("   ORD: assignExisting: looking for '%s' ????????", this.hcq);
      }

    },

  });

  H.LIB.Orderqueue = function(context){

    H.extend(this, {

      context:  context,

      imports:  [
        "economy",
        "groups",
      ],

      tP: 0,            // processing time, msecs

      queue: null,      // stateful

      report: {rem: [], exe: [], ign: []},

    });

  };

  H.LIB.Orderqueue.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Orderqueue,
    log: function(){
      this.deb();
      if (this.queue.length){
        this.queue.forEach( order => {
          order.log();
        });
      } else {
        this.deb("   ORQ: empty");
      }
    },
    logTick: function(){

      var 
        msg  = "", tb = H.tab,
        header = "  id,     verb, amt, pro, rem, nodes, flags,                 source, template".split(","),
        tabs   = "   4,       10,   5,   5,   5,     7,     7,                    24, 12".split(",").map(s => ~~s),
        head   = header.map(String.trim).slice(0, -1),
        retr = {
          id:       o => "#" + o.id,
          verb:     o => o.verb,
          amt:      o => o.amount,
          rem:      o => o.remaining,
          pro:      o => o.processing,
          nodes:    o => o.nodes ? o.nodes.length : 0,
          flags:    o => (o.product ? "P" : "_"),
          source:   o => o.source, //this.groups.findAsset(o.source).name || "no source :(",
          template: o => "tplXXXXXX",
        };

      this.deb("   ORQ: length: %s, rep: %s", this.queue.length, uneval(this.report));
      if (this.queue.length){
        this.deb("*");
        this.deb("     Q: %s", header);
        this.queue
          .sort((a,b) => a > b ? 1 : -1)
          .forEach(o => {
            msg = "";
            H.zip(head, tabs, (h, t) => {
              msg += tb(retr[h](o), t);
            });
            this.deb("     Q: %s | %s", msg, o.product ? o.product.name : "no product");
          });
        this.deb("*");
      }

    },
    serialize: function(tick, secs){
      return this.queue.map( order => order.serialize());
    },
    deserialize: function(data){
      if(data){
        this.queue = [];
        data.forEach( order => {
          this.queue.push(
            new H.LIB.Order(this.context)
              .import()
              .initialize(order)
          );
        });
      }
      return this;
    },
    initialize: function(data){
      this.queue = this.queue || [];
      return this;
    },
    delete: function(fn){return H.delete(this.queue, fn);},
    find: function(fn){
      var i, il = this.queue.length;
      for (i=0; i<il; i++){
        if (fn(this.queue[i])){
          return this.queue[i];
        }
      }
      this.deb("   ORQ: have %s, %s", this.queue.length, this.queue.map(o => o.id).join("|"));
      H.throw("WARN  : no order found in queue with: %s", fn);
      return undefined;
    },
    process: function(){

      var 
        t0 = Date.now(), amount, 
        hasBuild      = false, // only one construction per tick
        allGood       = false, 
        rep           = this.report,
        queue         = this.queue,
        eco           = this.economy,
        allocs        = H.deepcopy(eco.allocations),
        budget        = H.deepcopy(eco.stats.stock);
        
      // reset logging array
      rep.rem.length = 0; rep.ign.length = 0; rep.exe.length = 0;

      // queue empty -> exit
      if (!queue.length){this.tP = 0; return;}

      // clear allocs from last tick
      eco.producers.resetAllocations();

      // evaluate for product/producer/cost
      queue.forEach(order => {
        order.evaluate();
        if (!!order.product){
          amount = order.remaining - order.processing;
          allocs.food  += order.product.costs.food  * amount;
          allocs.wood  += order.product.costs.wood  * amount;
          allocs.stone += order.product.costs.stone * amount;
          allocs.metal += order.product.costs.metal * amount;
        }
      });

      // get first quote whether all orders fit budget
      allGood = eco.fits(allocs, budget);  

      // choose executables, sort and process
      queue
        .filter(order => !!order.product)
        .sort((a, b) => eco.prioVerbs.indexOf(a.verb) < eco.prioVerbs.indexOf(b.verb) ? -1 : 1)
        .forEach( order => {

          var 
            id  = order.id,
            product = order.product;

          // process all or one
          amount = allGood ? order.remaining - order.processing : 1;

          // one build a time
          if (order.verb === "build"){
            if (hasBuild) return; else hasBuild = true;
          }

          // final global budget check
          if (eco.fits(product.costs, budget, amount)){

            eco.do(amount, order); 

            eco.subtract(product.costs, budget, amount);
            rep.exe.push(id + ":" + amount);

          } else {
            rep.ign.push(id);

          }

      });

      // remove finished orders
      H.delete(queue, order => {
        if (order.remaining === 0){
          rep.rem.push(order.id);
          return true;
        } else {return false;}
      });

      this.tP = Date.now() - t0;

    }   
  });

  H.LIB.Economy = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "id",
        "config",
        "map",
        "effector",
        "events",
        "player",
        "query",
        "groups",
        "metadata",
        // "resources",
      ],
      childs: [
        "stats",
        "producers",
        "orderqueue",
      ],
      
      prioVerbs:    ["research", "train", "build"],
      availability: ["food", "wood", "stone", "metal"],
      allocations:  {food: 0, wood: 0, stone: 0, metal: 0},

    });

  };

  H.LIB.Economy.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Economy,

    log: function(){this.childs.forEach(child => this[child].log());

    }, logTick: function(){

      this.childs.forEach(child => this[child].logTick());
      
      // var 
      //   stock = this.stats.stock, 
      //   flows = this.stats.flows,
      //   t = H.tab, f = n => n > 0 ? "+" + n : n === 0 ? " 0": n;

        // deb("   ECO: F%s %s, W%s %s, M%s %s, S%s %s, P%s %s, A%s %s, H%s %s", 
        //   t(stock.food,   6), f(flows.food.toFixed(1)),
        //   t(stock.wood,   6), f(flows.wood.toFixed(1)),
        //   t(stock.metal,  6), f(flows.metal.toFixed(1)),
        //   t(stock.stone,  6), f(flows.stone.toFixed(1)),
        //   t(stock.pops,   4), f(flows.pops.toFixed(1)),
        //   t(stock.area,   4), f(flows.area.toFixed(1)),
        //   t(stock.health, 4), f(flows.health.toFixed(1))
        // );

    }, serialize: function(){
      return {
        stats:      this.stats.serialize(),
        producers:  this.producers.serialize(),
        orderqueue: this.orderqueue.serialize(),
      };

    }, deserialize: function(){
      if (this.context.data[this.name]){
        this.childs.forEach( child => {
          if (this.context.data[this.name][child]){
            // deb("   ECO: child.deserialize: %s", child);
            this[child] = new H.LIB[H.noun(child)](this.context)
              .import()
              .deserialize(this.context.data[this.name][child]);
          }
        });
      }

    }, initialize: function(){
      this.childs.forEach( child => {
        if (!this[child]){
          // deb("   ECO: child.initialize: %s", child);
          this[child] = new H.LIB[H.noun(child)](this.context)
            .import()
            .initialize();
        }
      });
      return this;

    }, finalize: function(){
      this.childs.forEach( child => {
        ( this[child].finalize && this[child].finalize() );
      });

    }, activate: function(){
      
      var 
        order,
        id = this.id,
        events = this.events,
        producers = this.producers,
        orderqueue = this.orderqueue;

      events.on("EntityRenamed", msg => {
        producers.remove(msg.id);
        producers.register(msg.id2);
      });

      // new technology
      events.on("Advance", msg => {
        if (orderqueue.delete(order => order.hcq === msg.data.technology)){
          producers.unqueue("research", msg.data.technology);
          this.deb("   ECO: onAdvance: removed order with tech: %s", msg.data.technology);
        }        
      });

      // new producer
      events.on("ConstructionFinished", msg => {
        producers.register(msg.id);
      });

      // new unit
      events.on("TrainingFinished", msg => {

        this.deb("   ECO: TrainingFinished id: %s, meta: %s", msg.id, uneval(this.metadata[msg.id]));

        if (!msg.data.task){
          this.deb("INFO  : ECO: got present: unit, not ordered");
          H.chat("Thanks.");
          return;
        }

        producers.register(msg.id);
        producers.unqueue("train", msg.data.task); 

        // this.deb("   ECO: findOrder: %s, %s", msg.data.order, typeof msg.data.order);
        order = orderqueue.find(order => order.id === msg.data.order);
        order.remaining  -= 1;
        order.processing -= 1;
        
        events.fire("OrderReady", {
          player: id,
          id:     msg.id,
          data:   {order: msg.data.order, source: order.source}
        });

      });

      // new metadata
      events.on("AIMetadata", msg => {

        this.deb("   ECO: on AIMetadata, msg.data.order: %s", msg.data.order);

        order = orderqueue.find(order => order.id === msg.data.order);
        order.remaining  -= 1;
        order.processing -= 1;

        this.deb("   ECO: on AIMetadata order: #%s from %s", order.id, this.groups.findAsset(order.source).name);
        
        events.fire("OrderReady", {
          player: id,
          id:     msg.id,
          data:   {order: msg.data.order, source: order.source}
        });

      });

      // remove entity
      events.on("Destroy", msg => {
        producers.remove(msg.id);
      });

    }, tick: function(tick, secs){

      var 

      // start clock
        t0 = Date.now(),

      // cash in
        stock = this.stats.stock;

      // check resources
      this.availability.sort((a, b) => stock[a] > stock[b] ? 1 : -1);

      // create value
      this.orderqueue.process();

      // report upstream
      this.orderqueue.logTick();
      this.producers.logTick();
      this.logTick();
      
      // shut down
      return Date.now() - t0;

    }, request: function(order){
      
      // probably useless layer, but eco may reject orders...
      //     entityCounts: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]
      //     entityLimits: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]

      // this.deb("  EREQ: order: %s", uneval(order));

      var  
        objorder,
        // debug
        source = this.groups.findAsset(order.source),  // this is an asset id
        loc = (order.location === undefined) ? "undefined" : H.fixed1(order.location);

      if (order.verb === "build" && order.location.length !== 2){
        H.throw("ERROR : %s order without position, source: %s", order.verb, source);
      }

      objorder = new H.LIB.Order(this.context).import().initialize(order);
      this.orderqueue.queue.push(objorder);

      this.deb("  EREQ: #%s, %s amount: %s, cc: %s, loc: %s, from: %s, shared: %s, hcq: %s",
        objorder.id, 
        objorder.verb, 
        objorder.amount, 
        objorder.cc || "NO CC" , 
        loc, 
        source,  // that's an asset
        objorder.shared, 
        objorder.hcq.slice(0, 40)
      );

    }, do: function(amount, order){

      var 
        pos, task, 
        product = order.product,
        id = product.producer.id; 

      this.deb("   EDO: #%s %s, producer: %s, amount: %s, tpl: %s, x: %s, z: %s",
        order.id, 
        order.verb, 
        id, 
        amount,
        product.key, 
        order.x ? order.x.toFixed(0) : NaN, 
        order.z ? order.z.toFixed(0) : NaN 
      );

      // assuming transaction succedes
      order.processing += amount;

      if (order.verb === "train"){
        task = this.context.idgen++;
        this.producers.queue(product.producer, task);
        this.effector.train([id], product.key, amount, {order: order.id, task: task, cc:order.cc});

      } else if (order.verb === "research") {
        this.producers.queue(product.producer, product.name);
        this.effector.research(id, product.key);

      } else if (order.verb === "build") {
        pos = this.map.findGoodPosition(product.key, [order.x, order.z]);
        this.effector.construct([id], product.key, [pos.x, pos.z, pos.angle], {order: order.id, cc:order.cc});

        // this.deb("   ECO: do.build: pos: %s, ord: %s, key: %s", uneval(pos), uneval([order.x, order.z]), product.key);

      } else if (order.verb === "find") {
        H.throw("ECO: find order leaked into do()");
      } else if (order.verb === "path") {
        H.throw("ECO: path order leaked into do()");

      }

    }, fits: function(cost, budget, amount=1){
      return (
        ((cost.food  || 0) * amount) <= (budget.food  || 0) &&
        ((cost.wood  || 0) * amount) <= (budget.wood  || 0) &&
        ((cost.stone || 0) * amount) <= (budget.stone || 0) &&
        ((cost.metal || 0) * amount) <= (budget.metal || 0)
      );  
    }, diff: function(cost, budget, amount=1){
      return {
        food:   (budget.food   || 0) - (cost.food   || 0 * amount),
        wood:   (budget.wood   || 0) - (cost.wood   || 0 * amount),
        stone:  (budget.stone  || 0) - (cost.stone  || 0 * amount),
        metal:  (budget.metal  || 0) - (cost.metal  || 0 * amount),
        pop  :  (budget.pop    || 0) - (cost.pop    || 0 * amount),
        popcap: (budget.popcap || 0) - (cost.popcap || 0 * amount),
      };
    }, multiply: function(cost, amount=1){
      cost.food  *= amount;
      cost.wood  *= amount;
      cost.metal *= amount;
      cost.stone *= amount;
    }, subtract: function(cost, budget, amount=1){
      budget.food  -= cost.food  > 0 ? (cost.food  * amount) : 0;
      budget.wood  -= cost.wood  > 0 ? (cost.wood  * amount) : 0;
      budget.metal -= cost.metal > 0 ? (cost.metal * amount) : 0;
      budget.stone -= cost.stone > 0 ? (cost.stone * amount) : 0;
    },

  });

return H; }(HANNIBAL));



// H.Economy.barter = function(source, sell, buy, amount){
//   var markets = gameState.getOwnEntitiesByType(gameState.applyCiv("structures/{civ}_market"), true).toEntityArray();
//   markets[0].barter(buy,sell,100);
//   Engine.PostCommand({"type": "barter", "sell" : sellType, "buy" : buyType, "amount" : amount });      
//   new api this.barterPrices = state.barterPrices;
// };

// logObject(sharedScript.playersData[this.id].statistics);
//   buildingsConstructed: NUMBER (0)
//   buildingsLost: NUMBER (0)
//   buildingsLostValue: NUMBER (0)
//   civCentresBuilt: NUMBER (0)
//   enemyBuildingsDestroyed: NUMBER (0)
//   enemyBuildingsDestroyedValue: NUMBER (0)
//   enemyCivCentresDestroyed: NUMBER (0)
//   enemyUnitsKilled: NUMBER (0)
//   enemyUnitsKilledValue: NUMBER (0)
//   percentMapExplored: NUMBER (3)
//   resourcesBought: OBJECT (food, wood, metal, stone, ...)[4]
//   resourcesGathered: OBJECT (food, wood, metal, stone, vegetarianFood, ...)[5]
//   resourcesSold: OBJECT (food, wood, metal, stone, ...)[4]
//   resourcesUsed: OBJECT (food, wood, metal, stone, ...)[4]
//   tradeIncome: NUMBER (0)
//   treasuresCollected: NUMBER (0)
//   tributesReceived: NUMBER (0)
//   tributesSent: NUMBER (0)
//   unitsLost: NUMBER (0)
//   unitsLostValue: NUMBER (0)
//   unitsTrained: NUMBER (0)

  

// Object: playersData  ---------------
//   0: OBJECT (name, civ, colour, popCount, popLimit, ...)[27]
//   1: OBJECT (name, civ, colour, popCount, popLimit, ...)[27]
//   2: OBJECT (name, civ, colour, popCount, popLimit, ...)[27]
//     cheatsEnabled: BOOLEAN (false)
//     civ: STRING (athen)
//     classCounts: OBJECT (Structure, ConquestCritical, Civic, Defensive, CivCentre, ...)[19]
//     colour: OBJECT (r, g, b, a, ...)[4]
//     entityCounts: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]
//     entityLimits: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]
//     heroes: ARRAY (, ...)[0]
//     isAlly: ARRAY (false, true, false, ...)[3]
//     isEnemy: ARRAY (true, false, true, ...)[3]
//     isMutualAlly: ARRAY (false, true, false, ...)[3]
//     isNeutral: ARRAY (false, false, false, ...)[3]
//     name: STRING (Player 1)
//     phase: STRING (village)
//     popCount: NUMBER (17)
//     popLimit: NUMBER (20)
//     popMax: NUMBER (300)
//     researchQueued: OBJECT (, ...)[0]
//     researchStarted: OBJECT (, ...)[0]
//     researchedTechs: OBJECT (phase_village, ...)[1]
//     resourceCounts: OBJECT (food, wood, metal, stone, ...)[4]
//     state: STRING (active)
//     statistics: OBJECT (unitsTrained, unitsLost, unitsLostValue, enemyUnitsKilled, enemyUnitsKilledValue, ...)[21]
//     team: NUMBER (-1)
//     teamsLocked: BOOLEAN (false)
//     techModifications: OBJECT (, ...)[0]
//     trainingBlocked: BOOLEAN (false)
//     typeCountsByClass: OBJECT (Structure, ConquestCritical, Civic, Defensive, CivCentre, ...)[19]


/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, Engine, uneval */

/*--------------- E F F E C T O R S -------------------------------------------

  Interface to the current engine (0AD or simulator)



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Effector = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "id",
        "map",
        "templates",
      ],

    });

    // copy actual effectors
    H.extend(this, H.LIB.Effector[context.connector]);

  };

  H.LIB.Effector.prototype = H.mixin(
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Effector,
    log: function(){
      this.deb();
      this.deb("   EFF: connector: '%s'", this.connector);        
    }
  });

  H.LIB.Effector.engine = {

    // Engine.PostCommand(PlayerID,{"type": "set-shading-color", "entities": [ent], "rgb": [0.5,0,0]});


    // m.BaseAI.prototype.chatTeam = function(message)
    // {
    //   Engine.PostCommand(PlayerID,{"type": "aichat", "message": "/team " +message});
    // };
    // m.BaseAI.prototype.chatEnemies = function(message)
    // {
    //   Engine.PostCommand(PlayerID,{"type": "aichat", "message": "/enemy " +message});
    // };

    // case 'stop-production' : Engine.PostCommand(PID,{ 
    //   "type": cmd, "entity": id 
    //   // "id": queue[i].id ????
    // }); break;

    // case 'barter' : Engine.PostCommand(PID, {
    //     "type":   cmd, 
    //     "sell":   order.barter.sellType, 
    //     "buy":    order.barter.buyType, 
    //     "amount": order.barter.amount 
    // }); break;

    // case 'setup-trade-route' :
    //   // queue.RemoveBatch(cmd.id);
    // break;
    // case 'set-trading-goods' :
    //   // queue.RemoveBatch(cmd.id);
    // break;

    dumpgrid: function(name, grid, threshold){
      var 
        id = this.id, 
        map = this.context.launcher.map,
        filename = H.format("%s-%s-%s.png", id, map, name);
      Engine.DumpImage(filename, grid.toArray(), grid.width, grid.height, threshold);    
    },
    dumparray: function(name, array, width, height, threshold){
      var 
        id = this.id, 
        map = this.context.launcher.map,
        filename = H.format("%s-%s-%s.png", id, map, name);
      Engine.DumpImage(filename, array, width, height, threshold);    
    },
    execute: function(command){
      Engine.PostCommand(this.id, command);
    },
    quit:  function(){
      this.execute({type: "quit"});
    },
    chat:  function(msg){
      this.execute({type: "chat", message: msg});
    },
    
    format: function(who, what){

      this.deb("   EFF: format: %s", uneval(arguments));

      // Scatter, Line Open, Box, passive, standground

      if (who.length && H.contains(H.Data.formations, what)){

        Engine.PostCommand(this.id, {type: "formation", 
          entities: who, 
          name :    what, 
          queued:   false 
        });

      } else { this.deb("   EFF: ignored format : %s", uneval(arguments)); }

    },

    stance: function(who, what){

      // deb("   EFF: stance: %s", uneval(arguments));

      if (who.length && H.contains(H.Data.stances, what)){

        Engine.PostCommand(this.id, {type: "stance", 
          entities: who, 
          name :    what, 
          queued:   false 
        });

      } else { this.deb("   EFF: ignored stance: %s", uneval(arguments)); }

    },

    flee: function(who, whom){

      this.deb("   EFF: flee: %s", uneval(arguments));

      var posWho, posWhom, direction, distance;

      if (who.length && whom.length) {

        posWho       = this.map.getCenter(who);
        posWhom      = this.map.getCenter(whom);
        direction    = [posWho[0] - posWhom[0], posWho[1] - posWhom[1]];
        distance     = H.API.VectorDistance(posWhom, posWho);
        direction[0] = (direction[0] / distance) * 8;
        direction[1] = (direction[1] / distance) * 8;
        
        Engine.PostCommand(this.id, {type: "walk", 
          entities: who, 
          x: posWho[0] + direction[0] * 5, 
          z: posWho[1] + direction[1] * 5, 
          queued: false
        });

      } else { this.deb("   EFF: ignored flee: %s", uneval(arguments)); }

    },

    move: function(who, where){

      // this.deb("   EFF: move: %s", uneval(arguments));

      //TODO: make this queue

      if (who.length && where.length === 2){

        Engine.PostCommand(this.id, {type: "walk", 
          entities: who, 
          x: where[0], 
          z: where[1], 
          queued: false 
        });

      } 
      // else { this.deb("   EFF: ignored move %s", uneval(arguments));}

    },

    spread: function(who, where){

      this.deb("   EFF: spread: %s", uneval(arguments));

      // distributes units on given points, lengths may differ

      if (who.length && where.length){

        who.forEach( (id, index) => {
          this.move([id], where[index % where.length]);
        });

      } 
      // else { this.deb("   EFF: ignored spread %s", uneval(arguments));}

    },

    destroy: function(who){

      this.deb("   EFF: destroy: %s", uneval(arguments));

      if (who.length){

        Engine.PostCommand(this.id, {type: "delete-entities", 
          entities: who
        });

      } else { this.deb("   EFF: ignored destroy who: %s", uneval(arguments)); }

    },

    garrison:     function(who, where){

      this.deb("   EFF: garrison: %s", uneval(arguments));

      if (who.length && H.isInteger(where)){

        Engine.PostCommand(this.id, {type: "garrison", 
          entities: who,       // array
          target:   where,     // id
          queued:   false
        });

      } else { this.deb("   EFF: ignored garrison: %s", uneval(arguments)); }

    },

    collect: function (who, what){

      this.deb("   EFF: collect: %s", uneval(arguments));

      if (what.length && who.length){

        Engine.PostCommand(this.id, {type: "gather", 
          entities: who, 
          target:   what[0], 
          queued:   false
        });

        what.slice(1).forEach(function(id){
          Engine.PostCommand(this.id, {type: "gather", 
            entities: who, 
            target:   id, 
            queued:   true
          });

        });

        H.Resources.consume(what);

      } else { this.deb("   EFF: ignored collect: %s", uneval(arguments)); }

    },

    skim: function (who, what){

      this.deb("   EFF: skim: %s", uneval(arguments));

      if (who.length, what){

        who.forEach(function(id){

          var [x, z] = H.Entities[id].position();

          Engine.PostCommand(this.id, {type: "gather-near-position", 
            entities: [id], 
            x: x, 
            z: z, 
            resourceType: what, 
            resourceTemplate: "", 
            queued:   false
          });

        });

      } else {this.deb("   EFF: ignored skim:", uneval(arguments)); }

      // case "gather-near-position":
      //   GetFormationUnitAIs(entities, player).forEach(function(cmpUnitAI) {
      //     cmpUnitAI.GatherNearPosition(cmd.x, cmd.z, cmd.resourceType, cmd.resourceTemplate, cmd.queued);
      //   });
      //   break;

    },

    gather: function(who, what){

      this.deb("   EFF: gather: %s", uneval(arguments));

      if (who.length && what.length){

        if (what.length === 1){

          // all units gather this
          Engine.PostCommand(this.id, {type: "gather", 
            entities: who,      // array
            target:   what[0],  // int
            queued:   false
          });

        } else {

          // let units gather in queue
          who.forEach(whoid => {

            what = H.rotate(what, 1);

            what.forEach( (whatid, index) => {

              Engine.PostCommand(this.id, {type: "gather", 
                entities: [whoid],   // array
                target:   whatid,    // int
                queued:   index > 0
              });

            });

          });

        }

      } else { this.deb("   EFF: ignored gather: %s", uneval(arguments)); }

    },

    repair: function(who, what){

      //TODO: make deal with large whos

      // deb("   EFF: repair: %s", uneval(arguments));

      if (who.length && what.length){

        what.forEach( (id, index) => {

          Engine.PostCommand(this.id, {type: "repair", 
            entities: who,  // Array
            target:   id,   // Int
            autocontinue: true, 
            queued: (index > 0)
          });

        });


      } else { this.deb("   EFF: ignored repair: %s, who, what", uneval(arguments));}

    },

    train: function(who, what, amount, metadata){

      this.deb("   EFF: train: %s, id: %s", uneval(arguments), uneval(this.id));

      if (who.length && this.templates[what] && amount){

        Engine.PostCommand(this.id, {type: "train", 
          count:    amount,
          entities: who, // array
          template: what,
          metadata: metadata || {} //{order: order.id}
        }); 

      } else { this.deb("   EFF: ignored train: %s", uneval(arguments)); }

    },

    construct: function(who, what, pos, metadata){

      this.deb("   EFF: construct: %s", uneval(arguments));

      if (who.length && H.isInteger(who[0]) && this.templates[what] && pos.length >= 2){

        Engine.PostCommand(this.id, { type: "construct",
          entities:     who, // array
          template:     what,
          x:            pos[0], 
          z:            pos[1],
          angle:        pos[2],
          autorepair:   false,   //??
          autocontinue: false,
          queued:       false,
          metadata:     metadata || {} // {order: order.id}
        });  

      } else { this.deb("   EFF: ignored construct: %s", uneval(arguments)); }

    },

    research: function(who, what){

      this.deb("   EFF: research: %s", uneval(arguments));

      if (H.isInteger(who) && H.TechTemplates[what]){

        Engine.PostCommand(this.id, { type: "research",
          entity:   who, 
          template: what 
        }); 

      } else { this.deb("   EFF: ignored research: %s", uneval(arguments)); }

    },


  };

  H.LIB.Effector.simulator = {

    move: function(who, where){
      if (who.length && where.length === 2){
        who.forEach(id => {
          this.simulation.entities[id].target = where;
          this.simulation.entities[id].path = null;
        });
      } 
    },

    destroy: function(who){
      if (who.length){
        who.forEach(id => this.simulation.destroy(id));
      }
    },    

  };

return H; }(HANNIBAL));
/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- E V E N T S -------------------------------------------------

  Collects, processes and dispatches incoming events.


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/


HANNIBAL = (function(H){

  // log line same order as orderedEvents
  var msgTick = "  EVTS: CR: %s, ER: %s, TF: %s, CF: %s, MT: %s, AT: %s, OC: %s, GA: %s, UGA: %s, RA: %s, PD: %s, DY: %s";

  function Message (name, msg) {

    // this is send around, has the mandatory default attributes

    H.extend(this, {
      player:  null,
      name:    name,
      id:         0,
      id2:        0,
      data:      {},
    }, msg);

  }
      

  H.LIB.Events = function(context){

    H.extend(this, {

      context: context,
      imports: [
        "id",
        "players",
        "entities", // owner
      ],

      // events from other turns
      savedEvents: null,

      // helps to ignore events
      createEvents:     {},
      destroyEvents:    {},

      //  see AIInterfaces.js
      orderedEvents:  [
        "Create", 
        "EntityRenamed",
        "TrainingFinished",
        "ConstructionFinished",
        "AIMetadata",
        "Attacked",
        "OwnershipChanged",
        "Garrison",
        "UnGarrison",
        "RangeUpdate",
        "PlayerDefeated",
        "Destroy",
      ],

      internalEvents:  [
        "OrderReady",
        "BroadCast",
        "EntityCreated",
        "EntityAttacked",
        // "ResourceFound",
      ],

      // saves the listeners
      dispatcher:  {
        "*": {"*": []},
        "0": {"*": []},
        "1": {"*": []},
        "2": {"*": []},
        "3": {"*": []},
        "4": {"*": []},
        "5": {"*": []},
        "6": {"*": []},
        "7": {"*": []},
        "8": {"*": []},
      },

      // list of researched techs per player
      researchedTechs:  {
        "0": [],
        "1": [],
        "2": [],
        "3": [],
        "4": [],
        "5": [],
        "6": [],
        "7": [],
        "8": [],
      },

    });

  };

  H.LIB.Events.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Events,
    log: function(){
      this.deb();
      this.deb("EVENTS: have %s saved events", this.savedEvents.length);
    },
    serialize: function(){
      // the listeners have to be re-created somewhere else
      return H.deepcopy(this.savedEvents);
    },
    deserialize: function(data){
      this.savedEvents = data;
      return this;
    },
    initialize: function(){
      if (!this.savedEvents){
        this.savedEvents = [];
      }
      return this;
    },
    tick: function(tick, secs){

      // dispatches new techs and finally fifo processes 
      // collected saved event and then single events in order defined above

      var t0 = Date.now();

      this.processTechs();

      this.savedEvents.forEach(events => {
        this.logTick(events);
        this.orderedEvents.forEach(type => {
          if (events[type]){
            events[type].forEach(event => {
              this[type](event);
            });
          }
        });
      });

      this.savedEvents =   [];
      this.createEvents =  {};
      this.destroyEvents = {};

      return Date.now() - t0;

    },
    logTick: function(events){

      var 
        lengths = this.orderedEvents
          .map(type => events[type] ? events[type].length : 0),
        sum = lengths
          .reduce((a, b) => a + b, 0);
      
      if (sum){
        this.deb.apply(this, [msgTick].concat(lengths));
      }

    },
    collect: function(newEvents){
      // saves events from all turns
      this.savedEvents.push(newEvents);
    },
    fire: function(name, msg){
      return this.dispatchMessage(new Message(name, msg));
    },
    readArgs: function (type /* [player, ] listener */) {

      var player, listener, args = H.toArray(arguments);

      if (args.length === 1 && typeof args[0] === "function"){
        type     = "*";
        player   = "*";
        listener = args[0];

      } else if (args.length === 2 && typeof args[1] === "function"){
        type     = args[0];
        player   = this.id;
        listener = args[1];

      } else if (args.length === 3 && typeof args[2] === "function"){
        type     = args[0];
        player   = args[1];
        listener = args[2];

      } else {
        this.deb("ERROR: Events.on is strange: %s", uneval(args));
        return [];

      }

      return [type, player, listener, "unknown"];

    },
    off: function (/* [type, [player, ]] listener */) {

      var 
        dispatcher = this.dispatcher,
        [type, player, listener] = this.readArgs.apply(this, H.toArray(arguments));

      H.delete(dispatcher["*"]["*"],     l => l === listener);
      H.delete(dispatcher[player]["*"],  l => l === listener);
      H.delete(dispatcher[player][type], l => l === listener);

    },
    on: function (/* [type, [player, ]] listener */) {

      var [type, player, listener] = this.readArgs.apply(this, H.toArray(arguments));

      this.registerListener(player, type, listener);

      // allows to add/sub type afterwards
      return {
        add : function(type){this.registerListener(player, type, listener);},
        sub : function(type){this.removeListener(player, type, listener);}
      };

    },
    processTechs: function  () {

      // detects new techs and fires "Advance"
  
      H.each(this.players, (id, player) => {
        H.each(player.researchedTechs, key => {
          if (!H.contains(this.researchedTechs[id], key)){

            this.fire("Advance", {
              player: id,
              data:   {technology: H.saniTemplateName(key), key: key}
            });

            this.researchedTechs[id].push(key);

          }
        });
      });

    },
    dispatchMessage: function (msg) {

      // sends message to all listeners specified by messagetype or entity id or bot id or '*'

      var 
        dispatcher = this.dispatcher,
        listeners = H.unique([].concat(
          dispatcher["*"],
          dispatcher[msg.player]["*"],
          dispatcher[msg.player][msg.name] ? dispatcher[msg.player][msg.name] : [],
          dispatcher[msg.player][msg.id]   ? dispatcher[msg.player][msg.id] : []
        )).filter(l => typeof l === "function");

      // this.deb("   EVT: dispatch %s|%s/%s/%s to %s listeners", msg.player, msg.name, msg.id, msg.id2, listeners.length);

      listeners.forEach(l => l(msg));

      return msg;

    },
    registerListener: function (player, type, listener){

      // puts listener in the specified dispatcher array

      var dispatcher = this.dispatcher;

      if (dispatcher[player][type] === undefined){
        dispatcher[player][type] = [listener];
        
      } else if (!H.contains(dispatcher[player][type], listener)){
        dispatcher[player][type].push(listener);

      } else {
        this.deb("WARN  : duplicate listener: %s %s, %s", player, type, H.logFn(listener));

      }

    },
    removeListener: function  (player, type, listener){

      // deletes listener from the specified dispatcher array

      var dispatcher = this.dispatcher;

      if (dispatcher[player][type]){
        H.delete(dispatcher[player][type], l => l === listener);
        if (dispatcher[player][type].length === 0){
          delete(dispatcher[player][type]);
        }
      }

    },
    moveAllListener: function (msg){

      // moves from msg.id to msg.id2

      var dispatcher = this.dispatcher, id1 = msg.id, id2 = msg.id2;

      if (dispatcher[msg.player][id2]){
        dispatcher[msg.player][id2].forEach(listener => {
          this.registerListener(msg.player, id1, listener);
        });
        delete(dispatcher[msg.player][id2]);
      }

    },

    /* Handler for API Events */

    Create: function(e){

      var 
        id     = e.entity, 
        tpln   = this.entities[id] ? this.entities[id]._templateName : "unknown",
        player = this.entities[id] ? this.entities[id].owner() : NaN;

      if (!this.entities[id]){
        this.createEvents[id] = tpln;

      } else {
        this.deb("   EVT: Create ent: %s, own: %s, tpl: %s, mats: %s", id, player, tpln, H.attribs(e));
        this.fire("EntityCreated", {
          player: player,
          id:     id,
        });
      }

    }, 
    OwnershipChanged: function(e){},
    Garrison: function(e){},
    UnGarrison: function(e){},
    RangeUpdate: function(e){},
    PlayerDefeated: function(e){},
    EntityRenamed: function(e){

      // listener: assets, culture, producers

      // this.deb("   EVT: EntityRenamed %s" , uneval(e));

      this.deb("   EVT: EntityRenamed %s, %s => %s, %s", 
        e.entity,    this.entities[e.entity]    || "unknown",
        e.newentity, this.entities[e.newentity] || "unknown"
      );

      var msg = this.fire("EntityRenamed", {
        player: this.entities[e.newentity].owner(),
        id:     e.entity,
        id2:    e.newentity,
      });

      this.moveAllListener(msg);

      this.destroyEvents[e.entity] = e; //????

    },
    TrainingFinished: function(e){

      // listener: assets, villages, producers

      e.entities.forEach( id => {

        var msg = this.fire("TrainingFinished", {
          player: e.owner,
          id:     id,
          data:   e.metadata || {},
        });

        // if(e.owner === 1)this.deb("   EVT: %s", uneval(msg));

      });

    },
    ConstructionFinished: function(e){

      // listener: assets, culture, groups

      var msg = this.fire("ConstructionFinished", {
            player: this.entities[e.newentity].owner(),
            id:     e.newentity,
            // id2:    e.newentity,
          });

      this.moveAllListener(msg);

    },
    AIMetadata: function(e){

      // listener: assets, culture, groups

      this.fire("AIMetadata", {
        player: e.owner,
        id:     e.id,
        data:   e.metadata,
      });

    },
    Attacked: function(e){

      // listener: assets, grids, mili?

      // this.deb("   EVT: got attacked: %s", uneval(e));

      if (this.entities[e.target]){

        this.fire("EntityAttacked", {
          player: this.entities[e.target].owner(),
          id:     e.target,
          id2:    e.attacker,
          data:   {damage: e.damage, type: e.type},
        });

      }

    },
    Destroy: function(e){

      // listener: assets, culture, mili?
      // TODO are foundations removed from triple store by Renamed?

      var msg;

      if (this.createEvents[e.entity]){
        // this.deb("INFO  : got Destroy on '%s' entity", this.createEvents[e.entity]);
        // looks like a failed structure
        return;
      }

      if (!e.entityObj){
        this.deb("WARN  : EVT got destroy no entityObj for ent: %s, mats: %s", e.entity, H.attribs(e));
        return;
      }

      if (!!e.SuccessfulFoundation){
        // deb("   EVT: foundation ready");
        return;
      }

      // dont't do this it crashes
      // data:   {entity: e.entityObj, foundation: !!e.SuccessfulFoundation},

      msg = this.fire("Destroy", {
        player: e.entityObj.owner(),
        id:     e.entity,
      });

      this.deb("  EVT: Destroy fired: %s" , uneval(msg));


      if (this.dispatcher[msg.player][msg.id]){
        // delete(dispatcher[msg.player][msg.id]);
      }

    },

  });

return H; }(HANNIBAL));
/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- G E O M E T R Y ---------------------------------------------

  Deals with points, rectangke, circles, polygons



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

// abs,acos,asin,atan,atan2,ceil,clz32,cos,exp,floor,imul,fround,log,max,min,pow,
// random,round,sin,sqrt,tan,log10,log2,log1p,expm1,cosh,sinh,tanh,acosh,asinh,atanh,
// hypot,trunc,sign,cbrt,E,LOG2E,LOG10E,LN2,LN10,PI,SQRT2,SQRT1_2


HANNIBAL = (function(H){

  var 
    PIH = Math.PI / 2,
    PI2 = Math.PI * 2;

  H.Geometry.Point = function (x, y){
    this.x = x;
    this.y = y;
  };
  H.Geometry.Point.prototype = {
    constructor: H.Geometry.Point,
    distance: function (point){
      var 
        dx = point.x - this.x,
        dy = point.y - this.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
  };

  H.Geometry.Rect = function (x, y, w, h, a){
    this.corners = null;
    this.x       = x !== undefined ? x : 20; // center
    this.y       = y !== undefined ? y : 30;
    this.center  = new H.Geometry.Point(this.x, this.y);
    this.theta   = a !== undefined ? a : 0;
    this.width   = w !== undefined ? w : 150;
    this.height  = h !== undefined ? h : 100;
    this.w2 = this.width  / 2;
    this.h2 = this.height / 2;
    this.rotate();
  };
  H.Geometry.Rect.prototype = {
    constructor: H.Geometry.Rect,
    polygon: function () {
      return this.corners;
    },
    intersects: function(rect){
      return H.Geometry.doPolygonsIntersect(this.polygon(), rect.polygon());
    },
    rotatePoint: function(x, y){
      return {
        x: this.cos * (x-this.x) - this.sin * (y-this.y) + this.x,
        y: this.sin * (x-this.x) + this.cos * (y-this.y) + this.y
      };
    },
    rotate: function(a){
      this.theta   = (this.theta + (a || 0)) % (PI2);
      this.sin     = Math.sin(this.theta);
      this.cos     = Math.cos(this.theta);
      this.corners = this.points();
      this.cornersplus = this.corners.concat(this.corners[0]);
    },
    points: function(){
      var w2 = this.width/2, h2 = this.height/2, x = this.x, y = this.y;
      return [
        this.rotatePoint(x + w2, y + h2),
        this.rotatePoint(x + w2, y - h2),
        this.rotatePoint(x - w2, y - h2),
        this.rotatePoint(x - w2, y + h2),
      ];
    },
    contains: function(point){
      var 
        dx = point.x - this.x,
        dy = point.y - this.y,
        dist = Math.sqrt(dx * dx + dy * dy),
        angle = Math.atan2(dy, dx) - this.theta,
        x = Math.cos(angle) * dist,
        y = Math.sin(angle) * dist;
      return (x > -this.w2 && x < this.w2 && y > -this.h2 && y < this.h2);
    },

    containsX: function(p0){
      // http://mathforum.org/library/drmath/view/54386.html
      var i, p1, p2, v = 0, hit = true, d = [];
      for (i=0; i<4; i++){
        p1 = this.cornersplus[i];
        p2 = this.cornersplus[i +1];
        v = ( p0.y - p1.y - ( p2.y - p1.y ) / ( p2.x - p1.x ) ) * ( p0.x - p1.x );
        d.push(v);
        hit = hit && v < 0 ? true : false;
      }
      return hit;
    },
    draw: function(ctx, strokeColor, width, fillColor=""){
      var corners = this.corners;
      ctx.lineWidth   = width || 1;
      ctx.strokeStyle = strokeColor || "rgba(200, 200, 200, 0.8)";
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      ctx.lineTo(corners[1].x, corners[1].y);
      ctx.lineTo(corners[2].x, corners[2].y);
      ctx.lineTo(corners[3].x, corners[3].y);
      ctx.lineTo(corners[0].x, corners[0].y);
      ctx.stroke();
      if (fillColor){
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      ctx.fillStyle = "rgba(200, 0, 0, 0.8)";
      ctx.fillRect(corners[0].x -1, corners[0].y -1, 2, 2);
    }
  };

  H.Geometry.Circle = function (x, y, radius){
    this.x = x;
    this.y = y;
    this.radius = radius;
  };
  H.Geometry.Circle.prototype = {
    constructor: H.Geometry.Circle,
    polygon: function (n) {
      var out = [], s = (PI2)/n;
      while (n--){
        out.push({
          x: this.x + Math.cos(n * s) * this.radius,
          y: this.y + Math.sin(n * s) * this.radius
        });
      }
      return out;
    },
  };


  /*
    creates an array of n vertices all located on a circle with same distance

  */

  H.Geometry.polygonFromCircle = function(x, y, radius, n){

    var out = [], s = (Math.PI * 2)/n;

    while (n--){
      out.push({
        x: x + Math.cos(n * s) * radius,
        y: y + Math.sin(n * s) * radius
      });
    }

    return out;

  };

  /**
   * http://stackoverflow.com/questions/10962379/how-to-check-intersection-between-2-rotated-rectangles/12414951#12414951
   * Helper function to determine whether there is an intersection between the two polygons described
   * by the lists of vertices. Uses the Separating Axis Theorem
   *
   * @param a an array of connected points [{x:, y:}, {x:, y:},...] that form a closed polygon
   * @param b an array of connected points [{x:, y:}, {x:, y:},...] that form a closed polygon
   * @return true if there is any intersection between the 2 polygons, false otherwise
   */

  H.Geometry.doPolygonsIntersect = function (a, b) {

    var 
      polygons = [a, b],
      aLen = a.length, bLen = b.length, pLen, 
      minA, maxA, projected, i, i1, j, minB, maxB,
      polygon, i2, p1, p2, normX, normY; 

    for (i = 0; i < polygons.length; i++) {

      // for each polygon, look at each edge of the polygon, 
      // and determine if it separates the two shapes

      polygon = polygons[i];
      pLen = polygon.length;

      for (i1 = 0; i1 < pLen; i1++) {

        // grab 2 vertices to create an edge

        i2 = (i1 + 1) % pLen;
        p1 = polygon[i1];
        p2 = polygon[i2];

        // find the line perpendicular to this edge
        normX = p2.y - p1.y;
        normY = p1.x - p2.x;

        minA = maxA = undefined;

        // for each vertex in the first shape, project it onto the line perpendicular to the edge
        // and keep track of the min and max of these values
        
        for (j = 0; j < aLen; j++) {

          projected = normX * a[j].x + normY * a[j].y;

          minA = (minA === undefined || projected < minA) ? projected : minA;
          maxA = (maxA === undefined || projected > maxA) ? projected : maxA;

        }

        minB = maxB = undefined;

        // for each vertex in the second shape, project it onto the line perpendicular to the edge
        // and keep track of the min and max of these values

        for (j = 0; j < bLen; j++) {

          projected = normX * b[j].x + normY * b[j].y;

          minB = (minB === undefined || projected < minB) ? projected : minB;
          maxB = (maxB === undefined || projected > maxB) ? projected : maxB;

        }

        // if there is no overlap between the projects, the edge we are looking at separates the two
        // polygons, and we know there is no overlap

        if (maxA < minB || maxB < minA) {
          return false;
        }

      }
    }

    return true;

  };

return H; }(HANNIBAL));     
/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- G O A L S ---------------------------------------------------

  Define goals, depending on victory conditions, civilisation



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


/* 
  vcs:
    none
    conquest
    wonder
*/

/*
  Goals with method pair action/needsAction are continues and never done, except with parent goal

*/



/*
  Postponed: 
    Civ Specifc Buildings:
      wonder, gymnasion, theatron, kennel, super-dock, rotary mill, prytaneion, monument, library, elephant stables, parihuvādā, stables, lighthouse, mercenary camp, gerousia, syssiton, 
    Units: 
      Heros

  Vill: 
    Resources
      Group: wood
      Group: field
      Group: fruit
      Group: hunter
      Group: breeder
    Buildings
      Houses
      Corral
      Dock
      Farmstead
      Storehouse
      Blacksmith
      Barracks
      Palisade
    Strategic:
      Group: scouts
    Techs
      town

  Town: 
    Resources
      Group: wood
      Group: stone
      Group: metal
      Group: field
      Group: fruit
      Group: hunter
      Group: breeder
    Buildings
      Houses
      Corral
      Farmstead
      Storehouse
      Blacksmith
      Barracks 2
      Temple
      Market
      Towers
      Wall
    Strategic:
      Group: scouts
      Group: patrol
    Techs
      City
      health_regen_units

  City: 
    Resources
      Group: wood
      Group: stone
      Group: metal
      Group: field
      Group: fruit
      Group: hunter
      Group: breeder
    Strategic:
      Group: scouts
      Group: patrol
    Buildings
      Houses
      Corral
      Dock
      Shipyard
      Farmstead
      Storehouse
      Blacksmith
      Barracks 2
      Temple
      Market
      Wall
      Fortress
    Colony
      Outpost
      Centre/colony/army camp
      Tower
    Techs
      City


What covers a plan?
  The buildings and techs to reach next phase.

What covers monitoring
  The resources needed to maintain resource flow of centre+barracks
  The plan's resources
  The amount of resources needed to fulfill plan






*/



HANNIBAL = (function(H){

  H.Data.Goals = {

    "condNone": {
      goals:        ["condConquest"],
    },
    "condConquest": {
      goals:        ["expandVill", "expandTown", "expandCity"],
    },
    "condWonder": {
      goals:        ["expandVill", "expandTown", "wonder", "expandCity"],
    },
    
    "expandVill":  {
      goals:        ["houses", "farmstead", "blacksmith", "fields", "dock", "barracks", "town"],
      isValid:      function(){return true;},
      isDone:       function(){return this.goals.every(g => g.isDone());},
    },
    "expandTown":  {
      goals:        ["houses", "market", "temple", "shipyard", "city"],
      isValid:      function(){return true;},
      isDone:       function(){return this.phases.current === "city";},
    },
    "expandCity":  {
      goals:        ["houses", "fortress", "wall"],
      isValid:      function(){return true;},
      isDone:       function(){return false;},
    },

    "houses": {
      action:       function () {
        this.groups.launch({cc: this.village.main, buildings: "house", quantity: 2});
      },
      needsAction:  function(){
        var 
          popHouse = this.query("house CONTAIN").first().costs.population,
          cntHouses = this.query("house CONTAIN INGAME").count();
        return this.stats.population > popHouse * cntHouses - 2 * popHouse;
      },
    },

    "blacksmith": {
      action:       function () {
        this.groups.launch({cc: this.village.main, buildings: "blacksmith", quantity: 1});
      },
      isDone:       function(){return this.query("blacksmith CONTAIN INGAME").count() > 0;},
    },

    "farmstead": {
      action:       function () {
        this.groups.launch({cc: this.village.main, buildings: "farmstead", quantity: 1});
      },
      isDone:       function(){return this.query("farmstead CONTAIN INGAME").count() > 0;},
    },

  };


  H.LIB.Goal = function (context){

    H.extend(this, {

      context: context,

      imports: [
        "stats",
        "query",
        "village",
      ],

      done: false,
      valid: true

    });

  };


  H.LIB.Goal.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Goal,
    tick: function(tick, secs){

      if (!this.done && this.valid){

        if (this.isValid && !this.isValid()){
          this.valid = false;
          return;
        }

        if (this.isDone()){
          this.done = true;
          return;
        }

        // continous
        if (this.needsAction && this.needsAction()){
          this.action();
          return;
        
        } else {
          // one time
          this.action();
          this.done = true;
        }

      }

    },

  });

return H; }(HANNIBAL));  
/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, logObject */

/*--------------- G R I D S ---------------------------------------------------

  An API onto typed arrays, used for map analysis, path finding, attack planning
  can blur and other grahic methods



  V: 1.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  H.LIB.Grid = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "map",         // width, height
        "cellsize",
        "effector",
      ],

      title:  "",
      data:   null,
      width:  0,
      height: 0,
      bits:   "",
      length: 0,

    });

  };

  H.LIB.Grid.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Grid,
    log: function(name){
      var stats = {},i = this.length,data = this.data;
      while (i--){stats[data[i]] = stats[data[i]] ? stats[data[i]] +1 : 1;}
      this.deb("   GRD: %s, min: %s, max: %s, stats: %s", H.tab(name || this.title, 12), this.min(), this.max(), H.prettify(stats));
    },    
    serialize: function(){
      return {
        title:  this.title,
        bits:   this.bits,
        bytes:  H.toRLE(this.data),
      };
    },
    deserialize: function(data){
      this.title = data.title;
      this.bits  = data.bits;
      this.data  = H.fromRLE(data.bytes);
    },
    initialize: function(config){
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray

      config = config || {};

      this.width  = this.map.width  / this.cellsize;
      this.height = this.map.height / this.cellsize;
      this.length = this.width * this.height;
      this.size   = this.width;

      if (!this.data){
        this.title  = config.title || "grid" + this.context.idgen++;
        this.bits   = config.bits  || "c8";
        this.data   = new Uint8ClampedArray(this.width * this.height);
      }

      return this;
    },
    toArray: function(){
      return Array.prototype.slice.call(this.data);
    },
    dump: function (name, threshold){
      threshold = threshold || this.max() || 255;
      name = H.format("%s-%s-%s", this.title, name, threshold);
      // deb("   GRD: dumping '%s', w: %s, h: %s, t: %s", name, this.width, this.height, threshold);
      this.effector.dumpgrid(name, this, threshold);    
    },
    max:  function(){var m=0,   g=this.data,l=this.length;while(l--){m=(g[l]>m)?g[l]:m;}return m;},
    min:  function(){var m=1e10,g=this.data,l=this.length;while(l--){m=(g[l]<m)?g[l]:m;}return m;},
    set:  function(val){var g=this.data,l=this.length;while(l--){g[l]  = val;}return this;},
    add:  function(val){var g=this.data,l=this.length;while(l--){g[l] += val;}return this;}, //check Math.imul
    mul:  function(val){var g=this.data,l=this.length;while(l--){g[l] *= val;}return this;},
    div:  function(val){var g=this.data,l=this.length;while(l--){g[l] /= val;}return this;},
    addGrid: function(grd){var g=this.data,o=grd.data,l=this.length;while(l--){g[l] += o[l];}return this;},

    render: function (cvs, alpha=255, nozero=true){

      // greyscales grid in imagedata of canvas

      var
        i, p, c, image, target, source,
        len = this.length,
        ctx = cvs.getContext("2d");

      // alpha = alpha !== undefined ? alpha : 255;
      cvs.width = cvs.height = this.width;
      image  = ctx.getImageData(0, 0, this.width, this.height);
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
    process: function(target, fn){

      // target.data[n] = fn(this.data[n])

      var body = "", proc = H.fnBody(fn);
      
      body += "var i = " + this.length + ";";
      body += "while (i--) { t[i] = " + proc + "}";

      Function("s", "t", body)(this.data, target.data);  

    },
    blur: function (radius){

      // http://blog.ivank.net/fastest-gaussian-blur.html

      var 
        temp = [], 
        target = new H.LIB.Grid(this.context)
          .initialize({
            title:  this.title + ".blur",
            width:  this.width, 
            height: this.height, 
            bits: 8,
          });
      
      boxBlur_4(this.data, temp, this.width, this.height, radius);
      target.data = new Uint8ClampedArray(temp);
      // return target; // stupid SM

      function boxBlur_4 (scl, tcl, w, h, r) {
          // for(var i=0; i<scl.length; i++) {
          //   tcl[i] = scl[i];
          // }
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
  });


// HANNIBAL = (function(H){

//   var t0, width, height, length, cellsize, center = [],
//       maskOpen,
//       maskWater,
//       maskLand,
//       maskShore,
//       maskBldgLand,
//       maskBldgShore,
//       maskFoundation,
//       maskPathfinder,
//       square  = [[-1,-1],[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1],[0,0]],
//       square0 = [[-1,-1],[-1,1],[1,-1],[1,1]],
//       square2 = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1],
//                  [0,2],[0,-2],[2,0],[-2,0],[2,2],[-2,-2],[2,-2],[-2,2]],

//       grids = {
//         topo: null,           // if avail
//         pass: null,           // water, land, forbidden, shallow, steep
//         terr: null,           // internal terrain code
//         cost: null,           // pathinder cost arond water and hills
//         regw: null,           // connected regions on water
//         regl: null,           // connected regions on land
//         food: null,
//         wood: null,
//         stone: null,
//         metal: null,
//         terrain: null,       
//         territory: null,
//         passability: null,   // Uint16Array 
//         obstruction: null,   // Trees, Geology
//         landPass: null,
//         navalPass: null,
//         attacks: null,
//         scouting: null,
//       };


//   function dump(name, grid, threshold){
//     threshold = threshold || grid.max() || 255;
//     name = H.format("%s-%s.png", name, threshold);
//     Engine.DumpImage(name, grid.data, grid.width, grid.height, threshold);    
//     deb("  GRID: dumping %s, w: %s, h: %s, t: %s", name, grid.width, grid.height, threshold);
//   }

//   function pritp(where){
//     return where.map(c => c.toFixed(1));
//   }
//   function pritn(num){
//     return num.toFixed(1);
//   }

//   // function mapPosToGridPos(p){return [~~(p[0] / cellsize), ~~(p[1] / cellsize)];}

//   function gridFromMap(map){
//     var grid;
//     if (map instanceof Uint8Array){
//       grid = new H.Grid(width, height, 8);
//       grid.data = map;
//     } else if (map.data){
//       grid = new H.Grid(map.width, map.height, 8);
//       grid.data = map.data;
//     } else if (map.map instanceof Uint8Array){
//       grid = new H.Grid(map.width, map.height, 8);
//       grid.data = map.map;
//     } else {
//       deb(" ERROR: gridFromMap: can't handle map");
//       // logObject(map, "gridFromMap.map");
//     }
//     return grid;
//   }


//   // self.landPass    = gridFromMap(H.GameState.sharedScript.accessibility.landPassMap);
//   // self.navalPass   = gridFromMap(H.GameState.sharedScript.accessibility.navalPassMap);
//   // self.passability = gridFromMap(H.SharedScript.passabilityMap);
//   // self.territory   = gridFromMap(H.Bot.gameState.ai.territoryMap);
//   // self.food        = gridFromMap(H.SharedScript.resourceMaps.food);
//   // self.wood        = gridFromMap(H.SharedScript.resourceMaps.wood);
//   // self.stone       = gridFromMap(H.SharedScript.resourceMaps.stone);
//   // self.metal       = gridFromMap(H.SharedScript.resourceMaps.metal);
//   // self.obstruction = obstructions();

//   // self.attacks  = new H.Grid(width, height, 8);
//   // self.pass     = new H.Grid(width, height, 8);
//   // self.topo     = new H.Grid(width, height, 8);

//   // deb();deb();
//   // deb("  GRID: init w: %s, h: %s, cellsize: %s", width, height, cellsize);

//   /*
    
//     handles the grids in use
//     works in Explorer (browser) and in 0 A.D (jsshell)

//   */


//   H.Grids = (function(){

//     var 
//       self = {},
//       isBrowser = false, topoBuffer, passImage;

//     H.extend(self, grids, {
//       center: center,
//       register: function(name, grid){grids[name] = grid;},
//       initExtern: function(size, buffer, image){
//         isBrowser  = true;
//         width      = self.width    = size; 
//         height     = self.height   = size;
//         length     = self.length   = width * height;
//         cellsize   = self.cellsize = 4;      
//         center[0]  = ~~(width  / 2);
//         center[1]  = ~~(height / 2);
//         topoBuffer = buffer;
//         passImage  = image;
//       },
//       init: function(){

//         width     = self.width    = H.SharedScript.passabilityMap.width;
//         height    = self.height   = H.SharedScript.passabilityMap.height;
//         length    = self.length   = width * height;
//         cellsize  = self.cellsize = H.GameState.cellSize;
//         center[0] = ~~(width  / 2);
//         center[1] = ~~(height / 2);

//         self.passability = gridFromMap(H.SharedScript.passabilityMap);
//         self.territory   = gridFromMap(H.Bot.gameState.ai.territoryMap);
//         self.attacks     = new H.Grid(width, height, 8);

//         self.initMasks();  
//         self.initTopo();  
//         self.initPass();  
//         self.initProp();  
//         self.initTerrain();  
//         self.initCost();  
//         self.initRegionsLand();  
//         self.initRegionsWater();  
//       },
//       initMasks: function(){
//         // http://trac.wildfiregames.com/wiki/AIEngineAPI
//         var pc = H.SharedScript && H.SharedScript.passabilityClasses ? H.SharedScript.passabilityClasses : undefined;
//         maskPathfinder  = pc ? pc["pathfinderObstruction"] :  1;
//         maskFoundation  = pc ? pc["foundationObstruction"] :  2;
//         maskBldgLand    = pc ? pc["building-land"]         :  4;
//         maskBldgShore   = pc ? pc["building-shore"]        :  8;
//         maskLand        = pc ? pc["default"]               : 16;
//         maskWater       = pc ? pc["ship"]                  : 32;
//         maskOpen        = pc ? pc["unrestricted"]          : 64;
//         maskShore       = maskBldgShore | maskFoundation;    // 1
//       },
//       initTopo: function(){

//         var i, h, off, idx, x, y, len, iwidth = width +1, max = 0, min = 10e7;

//         self.topo = new H.Grid(width, height, 8);

//         if (isBrowser){

//           len = (iwidth) * (iwidth);
          
//           for (i=0, off=16; i<len; i++, off+=2) {
//             x = i % iwidth; y = ~~(i/iwidth);
//             if (x < width && y < height){
//               idx = (width - y) * width + x;
//               h = topoBuffer.getUint16(off, true) >> 8;
//               self.topo.data[idx] = h;
//               max = h > max ? h : max;
//               min = h < min ? h : min;
//             }
//           }
//           i = length; while(i--){
//             h = H.scale(self.topo.data[i], min, max, 0, 220);
//             self.topo.data[i] = h;
//           }

//         } else {
//           for (i=0; i<length; i++){
//             self.topo.data[i] = self.passability.data[i] >> 8; 
//           }

//         }

//       },
//       initPass: function(){

//         var i, cvs, ctx, source;

//         self.pass = new H.Grid(width, height, 8);

//         if (isBrowser){

//           cvs = document.createElement("canvas");
//           cvs.width = cvs.height = width;
//           ctx = cvs.getContext("2d");
//           ctx.drawImage(passImage, 0, 0, width, width, 0, 0, width, width);
//           source = ctx.getImageData(0, 0, width, width).data;

//           for (i=0; i<length *4; i+=4) {
//             self.pass.data[i >> 2] = source[i];
//           }

//         } else {

//           for (i=0; i<length; i++){
//             self.pass.data[i] = self.passability.data[i] >> 0; 
//           }

//         }

//       },
//       initProp: function(){

//         if (isBrowser){

//           self.prop = new H.Grid(width, height, 8);

//         } else {

//           self.prop = gridFromMap(H.Bot.gameState.ai.territoryMap);

//         }


//       },
//       initCost: function(){

//         var 
//           i = length, maskCost = 8 + 16 + 32 + 64,
//           grdTemp = new H.Grid(width, height, 8);

//         while(i--){
//           grdTemp.data[i] = self.terr.data[i] & maskCost ? 255 : 0;
//         }
//         self.cost = grdTemp.blur(3);

//       },
//       initTrees: function(){
//         // var i = length, s, t;
//         self.tree = new H.Grid(width, height, 8);
//       },
//       initTerrain: function(){

//         // pathfinderObstruction:1, 
//         // foundationObstruction:2, trees, mines
//         // building-land:4, 
//         // building-shore:8, 
//         // default:16, 
//         // ship:32, 
//         // unrestricted:64

//         var i = length, s, t;

//         self.terr = new H.Grid(width, height, 8);

//         while(i--){

//           s = self.pass.data[i];
//           t = (
//              (s &  1)                             ?   0 : //  dark red : pathfinder obstruction forbidden
//              (s & 16) && !(s & 32) &&   (s & 64) ?   4 : //  land
//             !(s & 16) && !(s & 32) &&   (s & 64) ?   8 : //  shallow
//             !(s & 16) && !(s & 32) &&  !(s & 64) ?  16 : //  mixed
//             !(s & 16) &&  (s & 32) &&  !(s & 64) ?  32 : //  deep water
//              (s & 16) &&  (s & 32) &&  !(s & 64) ?  32 : //  deep steep water, check with Azure Coast
//              (s & 16) &&  (s & 32) &&   (s & 64) ?  64 : //  red : land too steep
//             !(s & 16) &&  (s & 32) &&   (s & 64) ?  64 : //  red : land also too steep
//               255                                          // error
//           );
//           self.terr.data[i] = t;

//         }

//       },
//       initRegionsLand: function(){

//         var r, t, i = length, cntLand = 0, maskLand = 16 + 8 + 4;

//         self.regl = new H.Grid(width, height, 8);

//         while (i--) {
//           t = self.terr.data[i]; 
//           r = self.regl.data[i];
//           if (r === 0 && ( t & maskLand) ) {
//             H.Grids.fillRegion(self.terr.data, self.regl.data, maskLand, i, ++cntLand);
//           }
//         }

//         self.regl.regions = cntLand;

//       },
//       initRegionsWater: function(){

//         var r, t, i = length, cntWater = 0, maskWater = 16 + 32;

//         self.regw = new H.Grid(width, height, 8);

//         while (i--) {
//           t = self.terr.data[i]; 
//           r = self.regw.data[i];
//           if (r === 0 && ( t & maskWater ) ) {
//             H.Grids.fillRegion(self.terr.data, self.regw.data, maskWater, i, ++cntWater);
//           }
//         }

//         self.regw.regions = cntWater;

//       },
//       fillRegion: function(src, tgt, mask, index, region){

//         var 
//           i, idx, nextX, nextY,
//           y = ~~(index / width) | 0,
//           x = index % width | 0,
//           stack = [x, y], pointer = 2, // push/pop is too slow
//           dx = [ 0, -1, +1,  0], 
//           dy = [-1,  0,  0, +1]; 

//         while (pointer) {

//           y = stack[pointer -1];
//           x = stack[pointer -2];
//           pointer -= 2;

//           tgt[y * width + x] = region;

//           i = 4; while (i--) {

//             nextX = x + dx[i];
//             nextY = y + dy[i];
//             idx   = (nextY * width + nextX);

//             if (!tgt[idx] && (src[idx] & mask) && nextX && nextY && nextX < width && nextY < width) {
//               stack[pointer]    = nextX;
//               stack[pointer +1] = nextY;
//               pointer += 2;
//             }

//           }

//         }

//       },      
//       tick: function(secs){

//         var t0 = Date.now();
//         maskPathfinder  = H.SharedScript.passabilityClasses["pathfinderObstruction"] | 0;    // 1

//         self.food        = gridFromMap(H.SharedScript.resourceMaps.food);
//         self.wood        = gridFromMap(H.SharedScript.resourceMaps.wood);
//         self.stone       = gridFromMap(H.SharedScript.resourceMaps.stone);
//         self.metal       = gridFromMap(H.SharedScript.resourceMaps.metal);
//         self.territory   = gridFromMap(H.Bot.gameState.ai.territoryMap);
//         self.obstruction = obstructions();

//         self.attacks.divVal(H.Config.attackRelax);

//         return Date.now() - t0;

//       },
//       analyzePoint: function(x, y){
//         var data = self.obstruction.data;
//         return (
//           (data[x + y * width]  === 0)   ? 255 :
//           (data[x + y * width]  === 255) ?  32 :
//           (data[x + y * width]  === 200) ? 128 :
//             200
//         );
//       },
//       analyzeLifted: function(dataScout, dataObst, x0, x1, y0, y1, cx, cy, radius, width){

//         var y = 0, x = 0, index = 0, dx = 0, dy = 0, r2 = 0;

//         for ( y = y0; y < y1; ++y) {
//           for ( x = x0; x < x1; ++x) {
//             dx = x - cx; dy = y - cy;
//             r2 = ~~Math.sqrt(dx * dx + dy * dy);
//             index = x + y * width;
//             if (dataScout[index] === 0 && r2 < radius){
//               dataScout[index] = (
//                 (dataObst[index] === 0)   ? 255 :
//                 (dataObst[index] === 255) ?  32 :
//                 (dataObst[index] === 200) ? 128 :
//                   200
//               );
//             }
//           }
//         }

//       },
//       record: function(what, where, amplitude){

//         deb("  GRDS: record: what: %s, where: %s, amp: %s", what, pritp(where), pritn(amplitude));

//         var [x, y] = where;

//         x = ~~(x/cellsize); y = ~~(y/cellsize);
        
//         if (what === "attacks"){
//           self.attacks.data[x + y * width] += amplitude;

//         } else if (what === "scouting") {
//           self.scouting.data[x + y * width] += amplitude;

//         }


//       },

//       log: function(){
//         var t0 = Date.now();
//         deb("  GRDS: logging ------------");
//         H.each(grids, function(name){
//           if (self[name]){
//             self[name].log(name);
//           } else {
//             deb("  GRDS: grid %s doesn't exist", name);
//           }
//         });
//         deb("  GRDS: logging %s msecs ------------", Date.now() - t0);
//       },
//       dump: function(prefix){
//         H.each(grids, function(grid){
//           var name = prefix ? prefix + "-" + grid : grid;
//           if (self[grid]){dump(name, self[grid]);}
//         });
//       }

//     });

//     return self;


//   }());

//   H.Grid = function (width, height, bits){

//     // subarray, set, move, length, byteOffset, byteLength, buffer

//     this.width  = width  || 0; 
//     this.height = height || 0;
//     this.length = width * height;
//     this.bits   = bits;
//     this.data   = (
//       this.bits ===  8 ? new Uint8ClampedArray(width * height) :
//       this.bits === 32 ? new Uint32Array(width * height) : 
//         new Uint8Array(width * height) //??
//     );

//   };

//   // function(a, b, c, op){
//   //   var body = "";
//   //   body += "var i = " + a.length + ";";
//   //   body += "while (i--) { c[i] = " + op + ";}";
//   //   Function("a", "b", "c", body)(a, b, c);
//   // }

//   H.Grid.prototype = {
//     constructor: H.Grid,
//     dump: function(name, threshold){
//       Engine.DumpImage(name || "default.png", this.data, this.width, this.height, threshold || this.maxVal);
//     },
//     log: function(name){
//       var stats = {},i = this.length,data = this.data;
//       while (i--){stats[data[i]] = stats[data[i]] ? stats[data[i]] +1 : 1;}
//       deb("   GRD: log: %s min: %s, max: %s, stats: %s", name || ">", this.min(), this.max(), H.prettify(stats));
//     },    
//     max:     function(){var m=0,  g=this.data,l=this.length;while(l--){m=(g[l]>m)?g[l]:m;}return m;},
//     min:     function(){var m=255,g=this.data,l=this.length;while(l--){m=(g[l]<m)?g[l]:m;}return m;},
//     // all destructive
//     setVal:  function(val){var g=this.data,l=this.length;while(l--){g[l]  = val;}return this;},
//     addVal:  function(val){var g=this.data,l=this.length;while(l--){g[l] += val;}return this;}, //check Math.imul
//     mulVal:  function(val){var g=this.data,l=this.length;while(l--){g[l] *= val;}return this;},
//     divVal:  function(val){var g=this.data,l=this.length;while(l--){g[l] /= val;}return this;},
//     addGrid: function(grd){var g=this.data,l=this.length;while(l--){g[l] += grd[l];}return this;},
//     copyData: function(){
//       return (
//         this.bits ===  8 ? new Uint8ClampedArray(this.data.buffer.slice()) : 
//         this.bits === 32 ? new Uint32Array(this.data.buffer.slice()) : 
//           new Uint8Array(this.data.buffer.slice())
//       );
//     },
//     copy: function(){
//       var cp = new H.Grid(this.width, this.height, this.bits);
//       cp.data = (
//         this.bits ===  8 ? new Uint8ClampedArray(this.data.buffer.slice()) : 
//         this.bits === 32 ? new Uint32Array(this.data.buffer.slice()) : 
//           new Uint8Array(this.data.buffer.slice())
//       );
//       return cp;
//     },
//     process: function(target, fn){

//       var body = "", proc = fnBody(fn);
      
//       body += "var i = " + this.length + ";";
//       body += "while (i--) { t[i] = " + proc + "}";

//       Function("s", "t", body)(this.data, target.data);  

//     },
//     render: function (cvs, alpha=255, nozero=true){

//       // greyscales grid in imagedata of canvas

//       var
//         i, p, c, image, target, source,
//         len = width * width,
//         ctx = cvs.getContext("2d");

//       // alpha = alpha !== undefined ? alpha : 255;
//       cvs.width = cvs.height = width;
//       image  = ctx.getImageData(0, 0, width, width);
//       target = image.data;
//       source = this.data;

//       for (i=0; i<len; i++){
//         c = source[i];
//         p = i * 4; 
//         target[p] = target[p + 1] = target[p + 2] = c;
//         target[p + 3] = nozero && !c ? 0 : alpha;
//       }
      
//       ctx.putImageData(image, 0, 0);

//     },
//     mark: function(){},
//     blur: function (radius){

//       // http://blog.ivank.net/fastest-gaussian-blur.html

//       var temp = [], target = new H.Grid(width, width, 8);
//       boxBlur_4(this.data, temp, width, height, radius);
//       target.data = new Uint8ClampedArray(temp);
//       // return target; // stupid SM

//       function boxBlur_4 (scl, tcl, w, h, r) {
//           for(var i=0; i<scl.length; i++) {
//             tcl[i] = scl[i];
//           }
//           boxBlurH_4(tcl, scl, w, h, r);
//           boxBlurT_4(scl, tcl, w, h, r);
//       }
//       function boxBlurH_4 (scl, tcl, w, h, r) {

//           var i, j, ti, li, ri, fv, lv, val, iarr = 1 / (r+r+1);

//           for (i=0; i<h; i++) {

//               ti = i*w; li = ti; ri = ti+r;
//               fv = scl[ti]; lv = scl[ti+w-1]; val = (r+1)*fv;

//               for(j=0; j<r; j++) {
//                 val += scl[ti+j];
//               }
//               for(j=0  ; j<=r ; j++) { 
//                 val += scl[ri++] - fv;   
//                 tcl[ti++] = Math.round(val*iarr); 
//               }
//               for(j=r+1; j<w-r; j++) { 
//                 val += scl[ri++] - scl[li++];   
//                 tcl[ti++] = Math.round(val*iarr); 
//               }
//               for(j=w-r; j<w  ; j++) { 
//                 val += lv        - scl[li++];   
//                 tcl[ti++] = Math.round(val*iarr); 
//               }
//           }
//       }
//       function boxBlurT_4 (scl, tcl, w, h, r) {

//           var i, j, ti, li, ri, fv, lv, val, iarr = 1 / (r+r+1);

//           for(i=0; i<w; i++) {

//               ti = i; li = ti; ri = ti+r*w;
//               fv = scl[ti]; lv = scl[ti+w*(h-1)]; val = (r+1)*fv;

//               for(j=0; j<r; j++) {
//                 val += scl[ti+j*w];
//               }
//               for(j=0  ; j<=r ; j++) { 
//                 val += scl[ri] - fv     ;  
//                 tcl[ti] = Math.round(val*iarr);  ri+=w; ti+=w; 
//               }
//               for(j=r+1; j<h-r; j++) { 
//                 val += scl[ri] - scl[li];  
//                 tcl[ti] = Math.round(val*iarr);  li+=w; ri+=w; ti+=w; 
//               }
//               for(j=h-r; j<h  ; j++) { 
//                 val += lv      - scl[li];  
//                 tcl[ti] = Math.round(val*iarr);  li+=w; ti+=w; 
//               }
//           }

//       }

//       return target;

//     },
//     // searchSpiral: function (xs, ys, expression){

//     //   // http://stackoverflow.com/questions/3330181/algorithm-for-finding-nearest-object-on-2d-grid

//     //   var d, x, y,
//     //       maxDistance = xs < width/2  ? width  - xs : xs,
//     //       checkIndex  = new Function("grid", "i", "return grid.data[i] " + expression + ";"),
//     //       checkPoint  = function(x, y){
//     //         if (x > 0 && y > 0 && x <= width && y <= height){
//     //           return checkIndex(this, x + y * width);
//     //         } else {return undefined;}
//     //       };

//     //   if (checkPoint(xs, ys)){return [xs, ys];}

//     //   for (d = 0; d<maxDistance; d++){
//     //     for (x = xs-d; x < xs+d+1; x++){
//     //       // Point to check: (x, ys - d) and (x, ys + d) 
//     //       if (checkPoint(x, ys - d)){return [x, ys - d];}
//     //       if (checkPoint(x, ys + d)){return [x, ys - d];}
//     //     }
//     //     for (y = ys-d+1; y < ys+d; y++)          {
//     //       // Point to check = (xs - d, y) and (xs + d, y) 
//     //       if (checkPoint(x, ys - d)){return [xs - d, y];}
//     //       if (checkPoint(x, ys + d)){return [xs - d, y];}
//     //     }
//     //   }

//     // },
//     findBestTile: function(radius, obstruction){
      
//       // Find the best non-obstructed tile
      
//       var bestIdx = 0,
//           bestVal = -1,
//           data = this.data,
//           obst = obstruction.data,
//           i = this.length;

//       while (i--) {
//         if (obst[i] > radius && data[i] > bestVal){
//           bestVal = data[i];
//           bestIdx = i;
//       }} return [bestIdx, bestVal];

//     },
//     findLowestNeighbor: function(posX, posY) {

//       // returns the point with the lowest radius in the immediate vicinity

//       var data  = this.data,
//           lowestPt = [0, 0],
//           lowestCf = 99999,
//           x = ~~(posX / 4),
//           y = ~~(posY / 4),
//           xx = 0, yy = 0;

//       for (xx = x -1; xx <= x +1; ++xx){
//         for (yy = y -1; yy <= y +1; ++yy){
//           if (xx >= 0 && xx < width && yy >= 0 && yy < width){
//             if (data[xx + yy * width] <= lowestCf){
//               lowestCf = data[xx + yy * width];
//               lowestPt = [(xx + 0.5) * 4, (yy + 0.5) * 4];
//       }}}} return lowestPt;

//     },
//     sumInfluence: function(cx, cy, radius){

//       var data  = this.data,
//           x0 = Math.max(0, cx - radius),
//           y0 = Math.max(0, cy - radius),
//           x1 = Math.min(width,  cx + radius),
//           y1 = Math.min(height, cy + radius),
//           radius2 = radius * radius,
//           sum = 0, y, x, r2, dx, dy;
      
//       for ( y = y0; y < y1; ++y) {
//         for ( x = x0; x < x1; ++x) {
//           dx = x - cx;
//           dy = y - cy;
//           r2 = dx*dx + dy*dy;
//           if (r2 < radius2){
//             sum += data[x + y * width];

//       }}} return sum;

//     },
//     addInfluence: function(cx, cy, maxDist, strength, type) {

//       var data = this.data, width = this.width, height = this.height,
//           maxDist2 = maxDist * maxDist,
//           r = 0.0, x = 0, y = 0, dx = 0, dy = 0, r2 = 0,
//           x0 = ~~(Math.max(0, cx - maxDist)),
//           y0 = ~~(Math.max(0, cy - maxDist)),
//           x1 = ~~(Math.min(width  -1, cx + maxDist)),   //??
//           y1 = ~~(Math.min(height -1, cy + maxDist)),
//           str = (
//             type === "linear"    ? (strength || maxDist) / maxDist  :
//             type === "quadratic" ? (strength || maxDist) / maxDist2 :
//               strength
//           ),
//           fnQuant = ( 
//             type === "linear"    ? (r) => str * (maxDist  - Math.sqrt(r)) :
//             type === "quadratic" ? (r) => str * (maxDist2 - r) : 
//               () => str
//           );

//       for ( y = y0; y < y1; ++y) {
//         for ( x = x0; x < x1; ++x) {
//           dx = x - cx; 
//           dy = y - cy; 
//           r2 = dx * dx + dy * dy;
//           if (r2 < maxDist2) {
//             data[x + y * width] += fnQuant(r2);

//       }}}

//     },
//     /**
//      * Make each cell's 16-bit/8-bit value at least one greater than each of its
//      * neighbours' values. (If the grid is initialised with 0s and 65535s or 255s, the
//      * result of each cell is its Manhattan distance to the nearest 0.)
//      */
//     expand: function(data, x, y, w, min, max) {
//       // lifted
//       var g = data[x + y * w];
//       if (g > min){data[x + y * w] = min;}
//       else if (g < min){min = g;}
//       if (++min > max){min = max;}
//       return min;
//     },
//     expandInfluences: function(maximum) {

//       var data = this.data, expand = this.expand,
//           w = width, h = height,
//           x = 0, y = 0, min = 0, max = maximum || 255;

//       for ( y = 0; y < h; ++y) {
//         min = max;
//         for ( x = 0;     x <  w; ++x) {min = expand(data, x, y, w, min, max);}
//         for ( x = w - 2; x >= 0; --x) {min = expand(data, x, y, w, min, max);}
//       }
//       for ( x = 0; x < w; ++x) {
//         min = max;
//         for ( y = 0;     y <  h; ++y) {min = expand(data, x, y, w, min, max);}
//         for ( y = h - 2; y >= 0; --y) {min = expand(data, x, y, w, min, max);}
//       }

//     },
//     // Returns an estimate of a tile accessibility. It checks neighboring cells over two levels.
//     // returns a count. It's not integer. About 2 should be fairly accessible already.
//     countConnected: function(startIndex, byLand){

//       var data = this.data, w = width,
//           count = 0.0, i = square2.length, index = 0, value = 0;

//       while (i--) {
//         index = startIndex + square2[i][0] + square2[i][1] * w;
//         value = data[index];
//         if (byLand && value !== 0) {
//           count += (
//             value ===   0 ? 0    :
//             value === 201 || value === 255 || value === 41 ? 1 :
//             value ===  42 ? 0.5  :
//             value ===  43 ? 0.3  :
//             value ===  44 ? 0.13 :
//             value ===  45 ? 0.08 :
//             value ===  46 ? 0.05 :
//             value ===  47 ? 0.03 :
//               0
//           );
//         } else if (!byLand && value !== 0) {
//           count += (
//             value ===   0 ? 0 :
//             value === 201 ? 1 :
//             value === 200 ? 1 :
//               0
//           );
//       }}

//       return count;
      
//     },
//     isAccessible: function(position, onLand){
//       var gamePos = H.Map.mapPosToGridPos(position);
//       return (this.countConnected(gamePos[0] + width * gamePos[1], onLand) >= 2);
//     }

//   };

//   function obstructions(){

//     var ents, ent, 
//         x, y, xx, yy, sq, radius, pointer, value, 
//         passData = H.Grids.passability.data,
//         obstGrid = new H.Grid(width, height, 8),
//         obstData = obstGrid.data,
//         i = obstGrid.length; 

//     /* Generated map legend:
//      0 is impassable
//      200 is deep water (ie non-passable by land units)
//      201 is shallow water (passable by land units and water units)
//      255 is land (or extremely shallow water where ships can't go).
//      40 is "tree".
//      The following 41-49 range is "near a tree", with the second number showing how many trees this tile neighbors.
//      30 is "geological component", such as a mine
//     */

//     while(i--){
//       obstData[i] = (passData[i] & maskLand) ? 0 : 255;
//       obstData[i] = (
//         (!(passData[i] & maskWater) && obstData[i] === 0)   ? 200 :
//         (!(passData[i] & maskWater) && obstData[i] === 255) ? 201 : 
//           obstData[i]
//       );
//     }

//     ents = Object.keys(H.Entities);
//     i = ents.length;

//     while (i--){

//       ent = H.Entities[ents[i]];

//       if (ent.hasClass("ForestPlant")) {

//         [x, y] = H.Map.mapPosToGridPos(ent.position());

//         if (obstData[x + y * width] !== 0){obstData[x + y * width] = 40;}
        
//         for (sq in square){

//           xx = square[sq][0];
//           yy = square[sq][1];
          
//           if (x+xx >= 0 && x+xx < width && y+yy >= 0 && y+yy < height) {
//             pointer = (x+xx) + (y+yy) * width;
//             value = obstData[pointer];
//             obstData[pointer] = (
//               (value === 255)            ? 41 : 
//               (value < 49 && value > 40) ? value + 1 : value
//             );
//           }

//         }        

//       } else if (ent.hasClass("Geology")) {

//         radius = ~~(ent.obstructionRadius() / 4);
//         [x, y] = this.mapPosToGridPos(ent.position());

//         // Unless it's impassable, mark as 30. This takes precedence over trees.
//         obstData[x + y * width] = obstData[x + y * width] === 0 ? 0 : 30; //??

//         for (xx = -radius; xx <= radius; xx++){
//           for (yy = -radius; yy <= radius; yy++){
//             if (x+xx >= 0 && x+xx < width && y+yy >= 0 && y+yy < height){
//               obstData[(x+xx) + (y+yy) * width] = obstData[(x+xx) + (y+yy) * width] === 0 ? 0 : 30; //??
//         }}}

//       }
//     }

//     return obstGrid;

//   }

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
/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- G R O U P S -------------------------------------------------

  Container for Groups, allows bot to query capabilities and launch instances


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Groups = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "map",
        "metadata",
        "events",
        "culture",
        "query",
        "entities",  // position
        "resources", // used in supply groups
        "economy",
        "orderqueue",
        "effector",
        "unitstates",
      ],

      instances: [],

    });

    this.dsl = new H.DSL.Language(context, this, "groups").import().initialize();

  };

  H.LIB.Groups.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Groups,
    log: function(){
      var t = H.tab, deb = this.deb.bind(this);
      deb();
      deb("  GRPS: %s instances", this.instances.length);
      this.instances
        .sort( (a, b) => a.name > b.name ? 1 : -1)
        .forEach(ins => {
          deb("     G: %s, assets: %s", ins.name, ins.assets.length);
          ins.assets.forEach( ast => {
            deb("     G:   %s: [%s], %s, ", t(ast.property, 12), ast.resources.length, ast);
            ast.resources.forEach( id => {
              deb("     G:      tlp:  %s, meta: %s", this.entities[id], uneval(this.metadata[id]));
            });
          });
        });
    },
    serialize: function(){
      return this.instances.map(this.serializegroup);
    },
    serializegroup: function(instance){
      return {
        id:        instance.id,
        cc:        instance.cc,
        groupname: instance.groupname,
        name:      instance.name,
        position:  instance.position,
        assets:    instance.assets.map(asset => asset.serialize()),
      };    
     },
    initialize: function(){

      if (Array.isArray(this.context.data.groups)){
        this.context.data.groups.forEach(config => {
          this.launch(config);
        });
      
      } else {
        // load mayors and custodians from metadata
        // this.launchOperators();

      }

      return this;

    },
    activate: function(){

      var host, order, instance;

      this.events.on("AIMetadata", msg => {

        // this.deb("  GRPS: on AIMetadata, looking for order id: %s/%s", msg.data.order, typeof msg.data.order);
        // this.deb("  GRPS: meta: %s", uneval(this.metadata[msg.id]));

        // order = this.orderqueue.find(order => order.id === msg.data.order);

        // if (order && order.shared){

        //   host = this.launch({name: "g.custodian", cc: order.cc});
        //   host.structure = ["private", "INGAME WITH id = " + msg.id];
        //   host.structure = this.createAsset({
        //     id: this.context.idgen++,
        //     instance: host,
        //     property: "structure",
        //   });

        //   this.metadata[msg.id].opname = host.name;
        //   this.metadata[msg.id].opid   = host.id;

        //   instance = this.instances.find(i => i.id === order.instance);
        //   host.listener.onConnect(instance.listener);

        // }

      });


    },
    tick: function(tick, secs){

      // delegates down to all instances of all groups
      
      var interval, t0 = Date.now();
      
      this.instances.forEach(instance => {
        interval = ~~instance.interval; 
        if (interval > 0 && (tick % interval === 0) && instance.scripts.interval){ 
          this.callWorld(instance, "interval", [secs, tick]);
        }
      });

      return Date.now() - t0;

    },
    callWorld: function(instance, scriptname, params){

      // calls a script in this dsl world
      // assuming nouns and verbs are all set

      this.dsl.runScript(instance.world, instance, instance.scripts[scriptname], params);

    },
    // objectify: function(instance, name, resources){

    //   // this.deb("  GRPS: objectify %s %s %s", instance, name, resources);

    // },
    nounify: function(world, instance, noun){

      // in a script world is asked to register a noun
      // dsl callbacks handler with actor/instance and noun

      this.deb("  GRPS: nounify %s %s, def: %s, size: %s", instance, noun, world[noun], world[noun].size);

      if (instance === world[noun]){
        // special case group !== asset
        return instance;

      } else {
        return this.createAsset({
          instance:   instance,
          property:   noun,
          definition: world[noun],
          size:       world[noun].size,
        });
      }

    },
    getverbs: function () {

      var path;

      // nouns and attributes are listed in corpus

      return {

        request:   (act, sub, obj, n)      => this.request(act, n || 1, sub.host, act.position),
        relocate:  (act, sub, obj, path)   => sub.host.position = path[path.length -1],
        move:      (act, sub, obj, path)   => this.effector.move(sub.list, path),
        spread:    (act, sub, obj, path)   => this.effector.spread(sub.list, obj.list),
        gather:    (act, sub, obj)         => this.effector.gather(sub.list, obj.list),
        stance:    (act, sub, obj, stance) => this.effector.stance(sub.list, stance),      
        format:    (act, sub, obj, format) => this.effector.format(sub.list, format),
        attack:    (act, sub, obj)         => this.attack(sub.list, obj.list),
        dissolve:  (act, sub)              => this.dissolve(sub.host),
        shelter:   (act, sub, obj)         => H.throw("Shelter not yet implemented"),
        doing:     (act, sub, obj, filter) => sub.list = this.doing(sub.list, filter),
        repair:    (act, sub, obj)         => {

          // TODO: skip buildings with health > 90%
          this.deb("  GRPS: repair: s: %s, o: %s", sub, obj);
          this.effector.repair(sub.list, obj.list);

        },
        shift:     (act, sub, obj, n)         => {
          sub.list = H.rotate(sub.list, n || 1);
          sub.host.resources = H.rotate(sub.host.resources, n || 1);
        },
        modify:    (act, sub, obj, definition) => {
          path = new H.LIB.Path(this.context, sub.list).modify(definition).path;
          sub.host.resources = path;
          sub.update();
        },

      };

    },
    launchOperators: function () {

      var opname;

      // deb("  GRPS: launching operators for structures");

      this.query("INGAME").forEach(node => {

        // deb("launchOperators: id: %s, key: ", node.id, node.key);

        // logObject(node, "launchOperators.node");
        
        opname = node.metadata.opname;

        // deb("     V: 1 %s %s", node.name, uneval(node.metadata));
        
        if (opname === "none"){
          // deb("  GRPS: appOps %s for %s", opname, node.name);

        } else if (opname === "g.custodian"){
          // deb("  GRPS: appOps %s for %s", opname, node.name);
          this.appoint(node.id, {groupname: "g.custodian", cc: this.metadata[node.id].cc});

        } else if (opname === "g.mayor"){
          // deb("  GRPS: appOps %s for %s", opname, node.name);
          this.appoint(node.id, {groupname: "g.mayor", cc: this.metadata[node.id].cc});

        } else {
          // deb("  GRPS: appOps ignored %s for %s", opname, node.name);

        }

      });

    },    
    // findGroups: function (fn){
    //   return this.instances.filter(fn);
    // },
    findAsset: function (idOrFn){

      // deb("findAsset: %s", uneval(idOrFn));

      var 
        i, a, il, al, asset, 
        fn = H.isInteger(idOrFn) ? ast => ast.id === idOrFn : idOrFn;

      il = this.instances.length;
      for (i=0; i<il; i++){

        al = this.instances[i].assets.length;
        for (a=0; a<al; a++){

          asset = this.instances[i].assets[a];
          // deb("findAsset: try %s, %s", asset.id, asset);
          if (fn(asset)){
            // deb("findAsset: found %s, %s", asset.id, asset);
            return asset;
          }


        }
      }
      
      this.deb("WARN  : no asset found: with %s", idOrFn);
      return undefined;

    },
    createAsset: function(config){

      // this.deb("  GRPS: createAsset.in: def: %s", config.definition);

      var 
        asset = new H.LIB.Asset(this.context).import(), 
        definition = config.definition, // || config.instance[config.property],
        verb = this.getAssetVerb(definition);

      // this.deb("  GRPS: createAsset: id: %s, name: %s, def: ", id, name, definition);
      // this.deb("  GRPS: createAsset: hcq: %s", this.expandHCQ(definition[1], config.instance));

      asset.id = config.id || this.context.idgen++;
      asset.name = config.instance.name + ":" + config.property + "#" + asset.id;

      // make known to group
      config.instance.assets.push(asset);

      asset.initialize({
        instance:    config.instance,
        definition:  definition,
        size:        config.size,
        users:       config.users     || [],
        resources:   config.resources || [],
        property:    config.property,
        shared:      definition[0] === "shared",  
        dynamic:     definition[0] === "dynamic",
        verb:        definition[0] === "dynamic" ?  "dynamic" : verb,  // dynamics are not ordered
        hcq:         this.expandHCQ(definition[1], config.instance),
        claim:       definition[1],
      });    

      asset.activate();

      this.deb("  GRPS: createAsset: %s, res: %s", asset, uneval(asset.resources));
      
      return asset;
    },   
    getAssetVerb: function (definition){

      var found = false, treenode, verb;

      if (definition[0] === "resource"){
        return "find";

      } else if (definition[0] === "path"){
        return "path";

      } else if (definition[0] === "claim"){
        return "claim";

      } else if (
        definition[0] === "dynamic"   || 
        definition[0] === "shared"    || 
        definition[0] === "exclusive" ){

        this.query(definition[1]).forEach( node => {  // mind units.athen.infantry.archer.a
          if(!found && (treenode = this.culture.tree.nodes[node.name]) && treenode.verb){ 
            verb = treenode.verb;
            found = true;
          }
        });

        // deb("   AST: getAssetVerb: chose %s for %s", verb, definition[1]);

        return verb;

      } else {
        return H.throw("ERROR : getAssetVerb: strange resource: %s", definition);

      }
    },
    expandHCQ: function (hcq, instance){

      // replaces '<xyz>' in hcq with instance.xyz.hcq

      var 
        pos1  = hcq.indexOf("<"),
        pos2  = hcq.indexOf(">"),
        token = (pos2 > pos1 && pos1 !== -1 && pos2 !== -1) ? 
                  hcq.substr(pos1 +1, pos2 - pos1 -1) : 
                  null;

      if (token === "cc"){
        hcq = H.replace(hcq, "<" + token + ">", instance[token]);

      } else if (token && instance[token] !== undefined){
        hcq = H.replace(hcq, "<" + token + ">", instance[token].hcq);

      } else if (token) {
        this.deb("ERROR : AST: %s/%s or its hcq not found to build: %s", instance, token, hcq);

      }

      return hcq;

    },     
    dissolve: function(instance){

      this.dsl.deleteWorld(instance);
      instance.assets.forEach(asset => asset.release());
      instance.assets = null;
      H.remove(this.instances, instance);
      this.deb("  GRPS: dissolved %s", instance);

    },
    appoint: function(id, config){

      // shared assets are handled by unitless groups like custodian or mayor
      // they keep a list of users = other groups to radio repair, etc

      // launches and inits a group instance to manage a shared ingame structure/building
      // called at init ??and during game??, if an order for a shared asset is ready

      var 
        instance = this.launch(config),
        node = this.query("INGAME WITH id = " + id, 0).first(),
        nodename = node.name.split("#")[0];

      this.metadata[id].opmode = "shared";
      this.metadata[id].opid   = instance.id;
      this.metadata[id].opname = instance.name;

      instance.structure = ["private", nodename];
      instance.register("structure");
      
      // deb("  GRPS: appointed %s for %s, cc: %s", instance.name, this.entities[id], config.cc);

      return instance;

    },
    doing: function(list, filter){ 

      // filters ids in list on unit ai state
      // e.g. "idle"

      var 
        ids = [], 
        states = [],
        actions = filter.split(" ").filter(a => !!a);

      actions.forEach(action => {
        list.forEach(id => {
          var state = this.unitstates[id];
          states.push(state);
          if (action[0] === "!"){
            if (state !== action.slice(1)){ids.push(id);}
          } else {
            if (state === action){ids.push(id);}
          }
        });
      });

      // this.deb("  GRPS: doing from: %s to %s by %s || found: %s", list, ids, filter, states);
      this.deb("  GRPS: doing found: %s", states);

      return ids;

    },    
    scan: function(instance, positionOrAsset){
      // needs work
      var position, vision;

      if (Array.isArray(positionOrAsset)){
        position = positionOrAsset;
        vision = this.entities[instance.assets.first];

      } else if ( positionOrAsset instanceof H.LIB.Asset ) {
        position = positionOrAsset.position;
      }

      if (!instance.detector){
        instance.detector = this.scanner.createDetector(position);
      }

      return instance.detector.scan(position);

    },
    claim: function( /* instance */ ){},
    request: function(instance, amount, asset, position){
      
      // H.logObject(instance, "instance");
      // H.logObject(asset, "asset");
      // H.logObject(position, "position");

      if (!(instance && amount && asset.id && position.length === 2)){

        H.throw("groups.request fails: %s, %s, %s, %s", instance, amount, asset, position);

      }

      this.deb("  GRPS: request: instance: %s, amount: %s, asset: %s, assetid: %s", instance, amount, asset, asset.id);

      asset.isRequested = true;

      this.economy.request({
        amount:     amount,
        cc:         instance.cc,
        location:   position,
        verb:       asset.verb, 
        hcq:        asset.hcq, 
        source:     asset.id, 
        shared:     asset.shared,
      });

    },

    launch: function(config){

      this.deb("  GRPS: launch, %s", uneval(config));

      // Object Factory

      // groups are defined in grp-[config.groupname].js 
      // instance is what is running
      // cc        -> required
      // groupname -> required
      // assets
      // id
      // position
      // assets must be re-created
      // registered props !!!

      var 
        world, 
        ccpos = this.entities[config.cc].position(),
        instance = {id: config.id || this.context.idgen++};

      // prepare a dsl world
      world = this.dsl.createWorld(instance);
      this.dsl.setverbs(world, this.getverbs());
      world.group = instance;
      world.group.size = 1;
      world.nounify("group");

      H.extend(instance, {

        klass:     "group",
        context:   this.context,
        name:      config.groupname + "#" + instance.id,
        id:        config.id || this.context.idgen++,
        cc:        config.cc,
        groupname: config.groupname,
        scripts:   {},

        world:     world,

        resources: this.resources, // needs lexical signature

        position:  config.position || ccpos || this.deb("ERROR : no pos in group"),
        assets:    [],

        toString: function(){return H.format("[%s %s]", this.klass, this.name);},


      });


      // keep a reference
      this.instances.push(instance);

      // copies values from the groups' definition onto instance
      H.each(H.Groups[config.groupname], (prop, value) => {
        
        if (prop === "scripts") {
          H.each(value, (name, fn) => {
            // make 'this' in scripts point to instance
            instance.scripts[name] = fn.bind(instance);
          });

        } else {
          switch (typeof value) {
            case "undefined":
            case "boolean":
            case "number":
            case "string":    instance[prop] = value; break;
            case "object":    instance[prop] = H.deepcopy(value); break; // handles null, too
            case "function":  instance[prop] = value.bind(instance); break;
          }
        }

      });

      // deserialize and register assets
      if (config.assets) {
        config.assets.forEach(cfg => {
          instance[cfg.property] = cfg.definition;
          instance[cfg.property] = this.createAsset(
            H.mixin(cfg, {instance:   instance})
          );
        });
      }

      // log before launching
      // deb("   GRP: launch %s args: %s", instance, uneval(config));

      // call dsl to run with world, actor, function and params
      this.callWorld(instance, "launch", [config]);

      return instance;

    }

  });  

return H; }(HANNIBAL));
/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- GROUP:  B U I L D E R ---------------------------------------

  a group to build any buildings



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.extend(H.Groups, {

    "g.builder" : {

      /*
        Behaviour: 
          builds structures until quantity or
          builds houses until 
          try garrison on attack (female, male)
          try healing on hurt
          dissolve on nothing to do
          
      */

      active:         true,           // prepared for init/launch ...
      description:    "builder",      // text field for humans 
      civilisations:  ["*"],          // 
      interval:       5,              // call tick() every x ticks, prefer primes here


      // DSL World scripts

      scripts: {

        launch: function launch (w, config /* building, quantity */) {

          w.deb("     G: launch %s %s", w, uneval(config));

          w.buildings = ["exclusive", config.building + " CONTAIN"];
          w.units     = ["exclusive", config.building + " CONTAIN BUILDBY"];

          w.units.size     = w.units.size     || config.size     ||  5;
          w.buildings.size = w.buildings.size || config.quantity ||  1;

          w.nounify("units", "buildings");
          w.units.on.request();   

        
        // a request was successful

        }, assign: function assign (w, item) {

          w.deb();
          // w.deb("     G: assign.0: %s, %s", w, item);

          w.objectify("item", item);

          // keep requesting units until size
          w.units.on
            .member(w.item)
            .lt(w.units.count, w.units.size)
            .request()
          ;

          //  the first unit requests structure to build, exits
          w.units.on
            .member(w.item)
            .match(w.units.count, 1)
            .match(w.buildings.count, 0)
            .buildings.do.request() 
            .exit
          ;

          // got the foundation, update position, all units repair, exits
          w.buildings.on
            .member(w.item)
            .match(w.item.foundation)
            // .group.do
            // .relocate(w.item.position)
            .units.do.repair(w.item)
            .exit
          ;

          // got the buildings, check order next, exits
          w.buildings.on
            .member(w.item)
            .match(!w.item.foundation)
            .lt(w.buildings.count, w.buildings.size)
            .request()
            .exit
          ;

          // got unit, send to repair
          w.item.on
            .member(w.item)
            .repair(w.buildings)  
          ;


        }, destroy: function destroy (w, item) {

          w.deb("     G: destroy: %s, %s", w, item);

          w.objectify("item", item);

          // lost unit, request another
          w.units
            .member(w.item)
            .request()
          ;

          // lost building, request another
          w.buildings
            .member(w.item)
            .request()
          ;


        // there are enemies and gaya

        }, attack: function attack (w, item, enemy, type, damage) {

          w.deb("     G: attack: %s, %s, %s, %s", w, item, enemy, type, damage);

          w.objectify("item",  item);
          // w.objectify("enemy", enemy);

          // don't care about buildings, exits
          w.builings
            .member(w.item)
            .exit
          ;

          // avoid loosing unit
          w.units
            .member(w.item)
            .lt(w.item.health, 50)
            .item.do.garrison()
          ;

        }, radio: function radio (w, msg) {

          w.deb("     G: radio: %s, %s secs", w, msg);


        }, interval:  function interval (w, secs, tick) {

          w.deb("     G: interval: %s, %s secs", w, secs);

          // w.units.on
          //   .doing("idle")
          //   .match(w.units.size)
          //   .group.do.dissolve()
          // ;

          // // avoid loosing units
          // w.units
          //   .doing("!garrison")
          //   .doing("!healing")
          //   .having("health < 30")
          //   .heal()
          // ;

        }

      } // end scripts

    }

  });

return H; }(HANNIBAL));

/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- P L U G I N S -----------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Groups = H.Groups || {};

  H.extend(H.Groups, {

    "g.custodian" : {

      /*
        a group without units 

        Behaviour: 
          to maintain a shared structure
          to organize repair
          to rebuild on destroy, if any users
          
      */

      active:         true,           // prepared for init/launch ...
      description:    "test group",   // text field for humans 
      civilisations:  ["*"],          // 
      interval:       10,             // call onInterval every x ticks
      parent:         "",             // inherit useful features

      position:       null,           // refers to the coords of the group's position/activities
      structure:      [],             // still unkown asset, inits in Groups.appoint

      listener: {
        onLaunch: function(options){
          // deb("     G: launch %s %s", this, uneval(options));
          this.options = options;
        },
        onConnect: function(listener){
          deb("     G: %s onConnect, callsign: %s", this, listener.callsign);
          this.structure.users.push(listener);
        },
        onDisConnect: function(listener){
          deb("     G: %s onDisConnect, callsign: %s", this, listener.callsign);
          H.remove(this.structure.users, listener);
        },
        onAssign: function(asset){

          deb("     G: %s onAssign ast: %s as '%s' res: %s", this, asset, asset.property, asset.resources[0]);

          if (this.structure.match(asset)){
            deb("     G: %s structure matches asset: %s", this, asset);
          } else {
            deb("     G: %s structure does NOT matches asset: %s", this, asset);
            logObject(this, "this.onAssign");
          }

          this.position = asset;

          this.structure.users.forEach(function(listener){
            listener.onAssign(asset);
          });

        },
        onDestroy: function(asset){

          deb("     G: %s onDestroy: %s", this, asset);

          // logObject(this.position, "this.position: " + this.position);

          if (this.structure.users.length > 0){
            this.structure.users.forEach(function(listener){
              listener.onDestroy(asset);
            });
            this.economy.request(1, this.structure, this.structure);
          } else {
            deb("     G: ignored destroyed asset: %s", asset.name);
          }

        },
        onAttack: function(asset, enemy, type, damage){

          deb("     G: %s onAttack %s by %s, damage: %s", this, asset, enemy, damage);
          
          this.structure.users.forEach(function(listener){
            listener.onAttack(asset, enemy, type, damage);
          });

        },
        onBroadcast: function(){},
        onInterval: function(){
          // currently not much to see here
          // deb("     G: interval %s, states: %s", this.name, H.prettify(this.structure.states()));
        }
      }

    }

  });

return H; }(HANNIBAL));

/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- P L U G I N S -----------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.extend(H.Groups, {

    "g.dancer" : {

      /* Behaviour: 
        runs some digital dance moves to amuse the opponent
      */

      // variables available in listener with *this*. All optional

      active:         true,           // ready to init/launch ...
      description:    "dancer",       // text field for humans 
      civilisations:  ["*"],          // lists all supported cics
      interval:       2,              // call onInterval every x ticks

      scripts: {


        launch: function launch (w, config) {

          var path, pos = w.group.position[0] + " " + w.group.position[1];

          w.units       = ["exclusive", "food.grain GATHEREDBY"];
          w.units.size  = 5;

          path          = w.units.size + "; translate " + pos + "; translatep 0 70; circle 5";
          w.path        = ["path", path];
          w.path.size   = w.units.size;

          w.nounify("units", "path");

          w.path.on.request();   


        // a request was succesful

        }, assign: function assign (w, item) {

          // w.deb("     G: assign.0: %s, %s", w, item);

          w.objectify("item", item);

          // got path, request all units, exits
          w.path.on
            .member(w.item)
            .units.do.request(w.units.size)
            .exit
          ;

          // got a unit, send to path start
          w.units.on
            .member(w.item)
            .item.do.move(w.path.points("0"))
          ;

          // w.deb("     G: assign.3: %s, %s", w, item);

          //  got final unit, spread them over path
          w.units.on
            .member(w.item)
            .match(w.units.count, w.units.size)
            .spread(w.path) 
          ;


        // resource lost

        }, destroy: function destroy (w, item) {

          w.objectify("item", item);

          // lost unit, request another
          w.units
            .member(w.item)
            .request()
          ;


        // there are enemies and gaia

        }, attack: function attack (w, item, enemy, type, damage){

          w.deb("     G: attack.0: %s, %s", w, item);

          w.field.on
            .member(w.item)
            .units.on.repair(w.item)
          ;

        // de-garrison

        }, release: function release (w, item) {

          w.deb("     G: release.0: %s, %s", w, item);


        // group radio

        }, radio: function radio (w, source, msg){

          w.deb("     G: %s onBroadcast from: %s, msg: %s", this, source, msg);


        // defined by this.interval

        }, interval: function interval (w, tick, secs){

          w.deb("     G: interval: %s, %s secs", w, secs);

          //  if complete and idle, change path and spread
          w.units.on
            .doing("idle")
            .match(w.units.count, w.units.size)
            .path.do.modify("rotate 0")
            .units.do.spread(w.path)
            .echo("danced")
          ;

        }


      } // end listener

    }

  });

return H; }(HANNIBAL));

// 501,4538314155411 / 511,4538314265622 / 531,4538314486044

// 0,980447893 0,96236738/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- P L U G I N S -----------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.extend(H.Groups, {

    "g.harvester" : {

      /* Behaviour: 
          to maintain one field resource (food.grain), 
          to return gathered food to dropsite
          to shelter from violence (garrison)
          to help with nearby repair
      */

      // variables available in listener with *this*. All optional

      active:         true,           // ready to init/launch ...
      description:    "harvester",    // text field for humans 
      civilisations:  ["*"],          // lists all supported cics
      interval:       10,             // call onInterval every x ticks

      technologies: [                 // these techs help
        "gather.capacity.wheelbarrow",
        "celts.special.gather.crop.rotation",
        "gather.farming.plows"
      ],

      scripts: {

        // game started, something launched this group
        launch: function launch (w, config) {

          w.units    = ["exclusive", "food.grain GATHEREDBY WITH costs.metal = 0, costs.stone = 0"];
          w.field    = ["exclusive", "food.grain PROVIDEDBY"];
          w.dropsite = ["shared", "food ACCEPTEDBY"]; //TODO: exclude docks

          w.units.size    = 5;
          w.field.size    = 1;
          w.dropsite.size = 1;

          w.nounify("units", "field", "dropsite");

          w.dropsite.on.request();   


        // a request was succesful

        }, assign: function assign (w, item) {

          // w.deb("     G: assign.0: %s, %s", w, item);

          w.objectify("item", item);

          // got dropsite, request unit, exits
          w.dropsite.on
            .member(w.item)
            .units.do.request()
            .exit
          ;

          // keep requesting units until size
          w.units.on
            .member(w.item)
            .lt(w.units.count, w.units.size)
            .request()
          ;

          // w.deb("     G: assign.3: %s, %s", w, item);

          //  the first unit requests field, exits
          w.units.on
            .member(w.item)
            .match(w.units.count, 1)
            .match(w.field.count, 0)
            .field.do.request() 
            .exit
          ;

          //  got unit let repair/gather, exits
          w.units.on
            .member(w.item)
            .match(w.field.count, 1)
            .item.do.repair(w.field)  // relies on autocontinue
            .exit
          ;

          // got the field foundation, update position, all units repair, exits
          w.field.on
            .member(w.item)
            .match(w.item.foundation)
            .units.do.repair(w.field)
            .exit
          ;

          // got the field, exits
          w.field.on
            .member(w.item)
            .match(!w.item.foundation)
            .units.do.gather(w.field)
            .exit
          ;


        // resource lost

        }, destroy: function destroy (w, item) {

          w.deb("     G: destroy: %s, %s", w, item);

          w.objectify("item", item);

          // lost unit, request another
          w.units
            .member(w.item)
            .request()
          ;

          // lost field, request another
          w.field
            .member(w.item)
            .request()
          ;


        // there are enemies and gaia

        }, attack: function attack (w, item, enemy, type, damage){

          w.deb("     G: attack.0: %s, %s", w, item);

          w.field.on
            .member(w.item)
            .units.on.repair(w.item)
          ;

        // de-garrison

        }, release: function release (w, item) {

          w.deb("     G: release.0: %s, %s", w, item);


        // group radio

        }, radio: function radio (w, source, msg){

          w.deb("     G: %s onBroadcast from: %s, msg: %s", this, source, msg);


        // defined by this.interval

        }, interval: function interval (w, tick, secs){

          w.deb("     G: interval: %s, %s secs", w, secs);

          
          // w.units.on
          //   .doing("idle")
          //   .match(w.units.size)
            // .units.on.gather(w.field)
          // ;

        }


      } // end listener

    }

  });

return H; }(HANNIBAL));

/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- GROUP: M A Y O R --------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.extend(H.Groups, {

    "g.mayor" : {

      /*
        a group without units solely for the first/biggest CC

        Behaviour: 
          to repair after attack
          to rebuild on destroy
          to garrisson soldiers on attack
          
      */

      // meta
      active:         true,           // prepared for init/launch ...
      description:    "mayor",        // text field for humans 
      civilisations:  ["*"],          // * = all, athen, cart, etc
      interval:       4,              // call scripts.tick every x ticks ( tick ~ 1.6 sec)

      // these techs are known to possibly improve this group
      technologies: [                 
        "unlock.females.house"
      ],

      scripts: {

        launch: function(w, config){

          w.log("     G: onLaunch: %s, %s", w, uneval(config));

          w.units = ["dynamic", "civilcentre CONTAIN BUILDBY INGAME WITH metadata.cc = <cc>"];
          w.nounify("units");

        },
        connect: function(w, listener){
          // deb("     G: %s onConnect, callsign: %s", this, listener.callsign);
          this.centre.users.push(listener);
        },
        disconnect: function(w, listener){
          deb("     G: %s onDisConnect, callsign: %s", this, listener.callsign);
          H.remove(this.centre.users, listener);
        },
        assign: function(w, asset){

          deb("     G: %s onAssign ast: %s as '%s' res: %s", this, asset, asset.property, asset.resources[0]);

          this.position = asset;

          H.QRY("INGAME WITH metadata.cc = " + this.cc).forEach(function(node){
            node.metadata.cc = asset.resources[0];
          });

          this.cc = asset.resources[0];

          if (asset.isFoundation){
            this.units.nearest(30).repair(asset);
          }

        },
        destroy: function(w, asset){

          deb("     G: %s onDestroy: %s", this, asset);

          this.economy.request(1, this.centre, this.position); // better location, pos is array

        },
        attack: function(w, asset, attacker, damage){

          deb("     G: %s onAttack %s", this, uneval(arguments));

          this.attackLevel += 1;

          if (this.attackLevel > this.needsDefense){
            this.centre.users.nearest(20).forEach(function(user){
              user.garrison(this.centre);
            });
          }

        },
        radio: function(w, sender, msg){},
        tick:  function(w){

          // deb("     G: interval %s, attackLevel: %s, health: %s, states: %s", 
          //     this.name, this.attackLevel, this.centre.health, H.prettify(this.centre.states())
          // );

          this.attackLevel = ~~(this.attackLevel/2);

          if (this.centre.isFoundation){
            this.units.nearest(30).repair(this.centre);
          }        

          // if (this.attackLevel === 0 && this.centre.health < this.needsRepair){
          //   this.centre.users.nearest(30).forEach(function(user){
          //     user.repair(this.centre);
          //   });
          // }

        }
      }

    }

  });

return H; }(HANNIBAL));

/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- P L U G I N S -----------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.extend(H.Groups, {

    "g.scouts" : {

      /* Behaviour: 
          to explore the land part of map, 
          by feeding the scout grid with postions to analyse
          to avoid violent combat
          to report enemies + buildings
          to report resources, wood, metal, stone, animals
          to report job finished
          to stay healthy
      */

      active:         true,           // ready to init/launch ...
      description:    "scouts",       // text field for humans 
      civilisations:  ["*"],          // lists all supported cics
      interval:        2,             // call onInterval every x ticks

      listener: {  

        onLaunch: function (w, config) {

          //scanner gives asset/scanner, verb/scan, attribute/target

          w.group.size = config.size || 8;
          w.units = ["exclusive", "cavalry CONTAIN SORT > speed"];
          w.register("units");
          w.import("scanner");
          w.units.request();

        }, onAssign: function(w, asset) {

          w.log("onAssign", w, asset);

          // first unit orders scanner
          w.scanner.on
            .member(asset, w.units)
            .match(0, w.scanner.size)
            .match(1, w.units.size)
            .request()
          ;

          // got scanner, pick unit to scan for w.target
          w.units.on
            .member(asset, w.scanner)
            .scan("grid", w.target)
          ;

          // have too much units
          g.units.on
            .gt(g.unit.count, g.unit.size)
            .unhealthy()
            .release()
          ;

        }, onDestroy: function(w, asset) {

          // lost unit, double size, hence release unhealthy
          w.units.on
            .member(asset, w.units)
            .request(w.units.count * 2)
          ;

        }, onAttack: function(w, asset, attacker, type, damage) {

          // with group spread, health low, flee
          asset.on
            .member(asset, w.units)
            .lt(50, asset.health)
            .gt(50, g.units.spread)
            .scan("attacker", attacker)
            .scan("grid", w.target)
            .stance("defensive")
            .flee(attacker)
          ;

          // with group spread, health low, all flee
          g.units.on
            .member(asset, w.units)
            .lt(80, g.units.health)
            .stance("defensive")
            .flee(attacker)
            .nearest(attacker)
            .scan("attacker", attacker)
          ;

        }, onBroadcast: function(source, msg) {

        }, onRelease: function(asset) {

          deb("     G: %s onRelease: %s", this, asset);

        }, onInterval:  function(secs, ticks) {

          // deb("     G: %s onInterval,  states: %s, health: %s", 
          //   this, H.prettify(this.units.states()), this.units.health
          // );

          // var t0 = Date.now();

          if (this.units.count){
            
            if (this.units.doing("idle").count === this.units.count){

              this.position = this.units.center;

              this.target = this.scanner.next(this.position);

              if (this.target.point && this.target.treasures.length) {
                this.units.first.collect(this.target.treasures);
                return;
              
              } else if (this.target.point && this.target.terrain === "land") {
                this.units.doing("idle").forEach(function(unit){
                  this.units.stance("aggressive");
                  unit.move(this.target.point);
                });

              } else {
                this.units.release();
                this.dissolve();
                H.Scout.dump("scout-final-" + ticks + ".png", 255);
                deb("      G: %s finished scouting");
                return;

              }
            } else {
              this.units.doing("idle").move(this.units.center);
            }

            H.Scout.scan(this.units.nearest(this.target.point));

          }

          if ((ticks % 10) === 0){
            H.Scout.dump("scout-" + ticks + ".png", 255);
          }

          // deb("     G: scout interval: %s msecs", Date.now() - t0);

        }

      }
    }

  });

return H; }(HANNIBAL));

/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- GROUP: M I N E R --------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  var deb = H.deb;

  H.Groups = H.Groups || {};

  H.extend(H.Groups, {

    "g.supplier" : {

      /*
        a group without units solely for the first/biggest CC

        Behaviour: 
          to exploit resources like ruins, trees, mines
          to build a dropsite if needed
          
      */

      active:         true,             // prepared for init/launch ...
      description:    "supplier",       // text field for humans 
      civilisations:  ["*"],            // 
      interval:       5,                // call scripts.interval every x ticks

      technologies: [                   // these techs help
        "gather.lumbering.ironaxes",
        "gather.capacity.wheelbarrow",
        "gather.wicker.baskets",          // ?? only fruits
        "gather.mining.wedgemallet",
        "gather.mining.silvermining",    
        "gather.mining.shaftmining",
      ],

      scripts: {

        launch: function launch (w, config /* supply, size */){

          var supply = config.supply;

          w.deb("     G: onlaunch %s, %s", w, uneval(config));

          w.resources = ["resource", supply];

          w.units = (
            supply === "metal"      ? ["exclusive", "metal.ore  GATHEREDBY"] :
            supply === "stone"      ? ["exclusive", "stone.rock GATHEREDBY"] :
            supply === "wood"       ? ["exclusive", "wood.tree  GATHEREDBY"] :
            supply === "food.fruit" ? ["exclusive", "food.fruit GATHEREDBY"] :
            supply === "food.meat"  ? ["exclusive", "food.meat  GATHEREDBY"] :
              deb(" ERROR: exclusives: unknown supply '%s' for g.supplier", supply)
          );

          w.dropsite = (
            supply === "metal"      ?  ["shared", "metal ACCEPTEDBY"] :
            supply === "stone"      ?  ["shared", "stone ACCEPTEDBY"] :
            supply === "wood"       ?  ["shared", "wood ACCEPTEDBY"]  :
            supply === "food.fruit" ?  ["shared", "food ACCEPTEDBY"]  :
            supply === "food.meat"  ?  ["shared", "food ACCEPTEDBY"]  :
              deb(" ERROR: unknown supply '%s' for supply group", supply)
          );

          w.resources.size = (
            supply === "metal"      ?  1  :
            supply === "stone"      ?  1  :
            supply === "wood"       ?  10 :
            supply === "food.fruit" ?  5  :
            supply === "food.meat"  ?  5  :
              deb(" ERROR: unknown supply '%s' for supply group", config.supply)
          );

          w.units.size = (
            supply === "metal"      ?  10 :
            supply === "stone"      ?  10 :
            supply === "wood"       ?  10 :
            supply === "food.fruit" ?  5  :
            supply === "food.meat"  ?  2  :
              deb(" ERROR: unknown supply '%s' for supply group", config.supply)
          );

          w.dropsite.size  = 1;

          w.nounify("units", "resources", "dropsite");

          w.resources.on.request(w.resources.size); // may get less


        }, assign: function assign (w, item) {

          w.deb("     G: assign.0: %s, %s", w, item);

          w.debug = true;

          w.objectify("item", item);

          // got empty resource, dissolve group
          w.resources.on
            .member(w.item)
            .match(w.resources.count, 0)
            .group.do.dissolve()  
            .exit
          ;

          // got initial resources, request unit, exits
          w.resources.on
            .member(w.item)
            .match(w.units.count, 0)
            .units.do.request()
            .exit
          ;

          // got initial unit, request dropsite
          w.units.on
            .member(w.item)
            .match(w.dropsite.count, 0)
            .dropsite.do.request()
          ;

          // got initial dropsite foundation, units repair
          w.dropsite.on
            .member(w.item)
            .match(w.item.foundation)
            .units.do.repair(w.dropsite)
          ;

          // got initial dropsite, units gather
          w.dropsite.on
            .member(w.item)
            .match(!w.item.foundation)
            .units.do.gather(w.resources)
          ;

          // keep requesting units until size
          w.units.on
            .member(w.item)
            .echo("units: " + w.units.count + w.units.size)
            .lt(w.units.count, w.units.size)
            .request()
          ;

          // got unit, let gather on next resource
          w.units.on
            .member(w.item)
            .resources.do.shift()
            .item.do.gather(w.resources)
          ;

          // got another resource, all units gather
          w.resources.on
            .member(w.item)
            .units.do.gather(w.resources)
          ;


        }, destroy: function destroy (w, item) {

          w.deb("     G: destroy: %s, %s", w, item);

          w.objectify("item", item);

          // lost unit, request another
          w.units
            .member(w.item)
            .request()
          ;

          // lost dropsite, request another
          w.dropsite
            .member(w.item)
            .request()
          ;

        }, attack: function attack (w, item, enemy, type, damage) {

          w.deb("     G: destroy: %s, %s %s %s %s", w, item, enemy, type, damage);


        }, radio: function radio (w, msg) {

          w.deb("     G: %s radio %s, %s", this, msg);


        }, interval:  function interval(w, tick, secs) {

          w.deb("     G: interval: %s, %s secs", w, secs);

          // run out of resources, request more, exits
          w.resources.on
            .match(w.resources.count, 0)
            .request()
            .exit
          ;

          // idle units should gather
          w.units.on
            .doing("idle")
            .gather(w.resources)
          ;

        }


      } // end script

    }

  });

return H; }(HANNIBAL));

/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- P L U G I N S -----------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Groups = H.Groups || {};

  H.extend(H.Groups, {

    "g.template" : {

      /* Behaviour: 
          to explore the map, 
          to avoid violent combat
          to report enemies + buildings
          to report resources, wood, metal, stone, animals
          to fill the scout grid
      */

      // variables available in listener with *this*. All optional

      active:         false,          // ready to init/launch ...
      description:    "scouts",       // text field for humans 
      civilisations:  ["*"],          // lists all supported cics

      interval:        2,             // call onInterval every x ticks
      parent:         "",             // inherit useful features

      capabilities:   "2 food/sec",   // (athen) give the economy a hint what this group provides.


      // this got initialized by launcher
      position:       null,           // coords of the group's position/activities

      units:         ["exclusive", "cavalry CONTAIN SORT > speed"],


      // message queue sniffer

      listener: {
        onLaunch:    function(){

          this.register("units"); // turn res definitions into res objects
          this.economy.request(1, this.units, this.position);                 // assuming a CC exists

        },
        onAssign:    function(resource){

          deb("     G: %s onAssign res: %s as '%s' shared: %s", this, resource, resource.nameDef, resource.shared);

        },
        onDestroy:   function(resource){

          deb("     G: %s onDestroy: %s", this, resource);

          if (this.units.match(resource)){
            this.economy.request(1, this.units, this.position);  
          }      

        },
        onAttack:    function(resource, enemy, type, damage){

          deb("     G: %s onAttack %s by %s, damage: %s", this, resource, enemy, damage);

        },
        onBroadcast: function(source, msg){},
        onRelease:   function(resource){

          deb("     G: %s onRelease: %s", this, resource);

        },
        onInterval:  function(){

          deb("     G: %s onInterval,  states: %s", this, H.prettify(this.units.states()));

        }
      }
    }

  });

return H; }(HANNIBAL));

/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- DOMAIN: E C O N O M Y  --------------------------------------

  Methods



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  var m, o, planner, tree, nodes, prit, sani, fmt,
      cacheProducer   = {},
      cacheTechnology = {},
      cacheBuildings  = {},
      filterBuildings = name => (
        !name.contains("palisade") || 
        !name.contains("field")    ||
        !name.contains("wall")     ||
        !name.contains("civil.centre")
      ),
      pritt = function(task){
        var t1 = task[0].name,
            t2 = Array.isArray(task[1]) ? task[1].length : task[1],
            t3 = task.length === 3 ? ", " + task[2] : "";
        return fmt("[%s: %s%s]", t1, t2, t3);
      };


  function cacheDepths(){

    // runs planner over all nodes and writes planning depth 
    // to H.Data.Depths[civ][name] and tree.nodes

    var 
      zero = function () {return new H.HTN.Helper.State({ress: {}, ents: {}, tech: []}).sanitize();},
      ccname = H.format("structures.%s.civil.centre", tree.civ);

    H.Data.Depths[tree.civ] = {};

    H.each(tree.nodes, function(name, node){

      var goal = zero(), start = zero();

      start.data.ents[ccname] = 1;
      
      if (node.verb === "research") {
        goal.data.tech = [node.name];
      } else if (node.verb === "train" || node.verb === "build"){
        goal.data.ents[node.name] = goal.data.ents[node.name] === undefined ? 1 : 2; // TODO is 1
      } else {
        // deb("      :  NV %s", name); mostly _e, _a
        return;
      }

      // deb("      : %s", node.name);
      // planner.verbose = 10; /// XXXXXXXXXXXXXXXXXXXX
      planner.plan(start, [[H.HTN.Economy.methods.start, goal]]);
      if (planner.error){
        deb("ERROR : planning failed %s, %s", node.name, planner.operations.length);
        planner.logstack.forEach(function(o){
          deb("      :  %s",  o.m.slice(0,100));
        });
        // deb("      :  operations ---------");
        // planner.operations.forEach(function(oper){
        //   deb("      :  %s",  oper);
        // });
      } else {
        // deb("      :  OK %s, %s", node.name, planner.operations.length);
        // planner.operations.forEach(function(op){
        //   deb("     P: - %s", op);
        // });      
      }
      tree.nodes[name].operations = planner.depth;

    });

    H.each(tree.nodes, function(name, node){

      var order, phase;

      if ((phase = tree.phases.find(node.key))){
        node.order = (phase.idx) * 1000;
      } else {
        node.order = tree.phases.find(node.phase).idx * 1000 + node.operations +1;
      }

      H.Data.Depths[tree.civ][name] = node.order;

    });

    // debug
    // var tpls = H.attribs(tree.nodes);
    // tpls.sort((a, b) => tree.nodes[a].order > tree.nodes[b].order);
    // tpls.forEach(t => deb(" order: %s %s", tree.nodes[t].order, tree.nodes[t].name));

  }

  function checkProducers (planner, m, o, state, producers){

    var producer, tasks = [], i = producers.length;

    while (i--){
      producer = producers[i];
      // if (state.data.ents[producer.name]){
      if (state.data.ents[producer]){
        return null; // producer already there
      }
      // tasks.push([m.produce, producer.name, 1]);
      tasks.push([m.produce, producer, 1]);
    }

    return tasks.length ? [[{name: "ANY"}, tasks]] : null;

  }

  function checkPopulationMax (planner, m, o, state, product, amount){
    // needs testing
    var diff, counter = 0, candidates, delCounter, tasks;

    if (product.population > 0){
      diff = state.data.pop + product.population * amount - state.data.popmax;
      if (diff > 0){
        candidates = {};
        // enough females to destroy ?
        H.QRY("female CONTAIN").forEach(function(node){
          if (state.data.ents[node.name] && state.data.ents[node.name] > 0){
            counter += state.data.ents[node.name];
            candidates[node.name] = state.data.ents[node.name];
          }
        });
        if (counter < diff){
          planner.log(0, () => fmt("checkPopulation: hit popmax : can't produce %s %s", name, amount));        
          return null; // plan fails
        } else {
          tasks = [];
          H.each(candidates, function(name, num){
            delCounter = num < (diff - delCounter) ? num : (diff - delCounter);
            tasks.push([o.del_entity, node.name, delCounter]);
          });
          console.log("checkPopulationMax", tasks.length);
          return tasks;
        }
      }
    }

    return null;

  }

  function checkPopulationCap (planner, m, o, state, product, amount) {

    var diff, house;

    if (product.population > 0){
      diff = state.data.pop + product.population * amount - state.data.popcap;
      if (diff > 0){
        house = H.QRY("house CONTAIN").first().name;
        diff  = ~~(diff / product.population * -1 + 1);
        console.log("checkPopulationCap", diff);
        return [[m.produce, house, diff]];
      }
    }    

    return null;
  }

  function checkCosts (planner, m, o, state, product, amount) {

    var res, diff, tasks = [], costs = {};

    for (res in product.costs){costs[res] = product.costs[res] * amount;}

    if(!H.Economy.fits(costs, state.data.ress)){
      for (res of ["food", "wood", "metal", "stone"]) {
        if (costs[res]) {
          diff = costs[res] - state.data.ress[res];
          if (diff > 0){
            tasks.push([o.inc_resource, res, diff]);
          }
        }
      }
    }    

    return tasks.length ? tasks : null;

  }

  function checkReqBuildings (planner, m, o, state, tech, name){

    var buildings, entities, inter, have, diff;

    // check for enough buildings
    buildings = cacheBuildings[tech.requires.class];
    entities  = Object.keys(state.data.ents);
    inter     = H.intersect(buildings, entities);
    have      = inter.reduce((a, b) => a + state.data.ents[b], 0);
    diff      = tech.requires.number - have;

    if (diff > 0){  
      return ( 
        name.contains("town") ? [[m.produce, cacheBuildings.house, diff]] :
        name.contains("city") ? [[m.produce, cacheBuildings.defensetower, diff]] :
          deb("ERROR : advance requires class WTF")
      );
    }

    return null;

  }

  function replace (phase){return phase.replace("_", ".").replace("_", ".").replace("_", ".");}
  function checkReqTechnology (planner, m, o, state, tech){

    var i, req, tasks = [], any;

    if (tech.requires.tech){
      req = replace(tech.requires.tech);
      return state.data.tech.indexOf(req) === -1 ? [[m.produce, req]] : null;

    } else if (tech.requires.any){
      any = tech.requires.any; i = any.length;
      while(i--){
        if (any[i].tech){ // .civ also exists
          req = replace(any[i].tech);
          if (nodes[req] && state.data.tech.indexOf(req) === -1){
            tasks.push([m.produce, req, 1]);
          }
        }
      }

      return tasks.length ? [[{name: "ANY"}, tasks]] : null;

    } 

    return null;

  }


  H.HTN.Economy.initialize = function(oPlanner, oTree){

    var t0 = Date.now();

    deb();deb();deb("   HTN: H.HTN.Economy.initialize ...")
    
    m = H.HTN.Economy.methods;
    o = H.HTN.Economy.operators;

    fmt     = H.HTN.Helper.fmt;
    prit    = H.prettify;
    sani    = H.saniTemplateName;
    nodes   = H.HTN.Economy.nodes = H.store ? H.store.nodes : H.Bot.culture.store.nodes;
    planner = oPlanner;
    tree    = oTree;

    H.each(tree.nodes, function(name, node){
      if (node.requires){
        cacheTechnology[name] = node.requires;    
      }
      if (H.count(node.producers)){
        cacheProducer[name] = [H.attribs(node.producers), node.operator];
      }
    });

    cacheBuildings.house = H.QRY("house CONTAIN").first().name;
    cacheBuildings.defensetower = H.QRY("defensetower CONTAIN").first().name;
    cacheBuildings.village = H.QRY("village CONTAIN")
      .map(node => node.name)
      .filter(filterBuildings);
    cacheBuildings.town = H.QRY("town CONTAIN")
      .map(node => node.name)
      .filter(filterBuildings);

    cacheDepths();
    
    deb("   HTN: H.HTN.Economy %s msecs", Date.now() - t0);
  };

  H.HTN.Economy.report = function(header){
    deb("     H: H.HTN.Economy.report: %s", header || "???");
    deb("     H: cached technologies %s", H.count(cacheTechnology));
    deb("     H: cached producers    %s", H.count(cacheProducer));
    deb("     H: cached depths       %s", H.count(H.Data.Depths[tree.civ]));
    var depths = Object.keys(H.Data.Depths[tree.civ])
      .sort((a, b) => H.Data.Depths[tree.civ][a] - H.Data.Depths[tree.civ][b]);
    var last = depths[depths.length -1];
    deb("     H: depth %s for %s", H.Data.Depths[tree.civ][last], last);
    // depths.forEach(k => deb("     D: %s, %s", H.Data.Depths[k], k));
  };

  H.HTN.Economy.getCurState = function(){
    var ingames = H.QRY("INGAME"),
        state = new H.HTN.Helper.State({
          ress: {
            food:   H.Player.resourceCounts.food,
            wood:   H.Player.resourceCounts.wood,
            stone:  H.Player.resourceCounts.stone,
            metal:  H.Player.resourceCounts.metal,
            pop:    H.Player.popCount,
            popcap: H.Player.popLimit,
            popmax: H.Player.popMax,
          }
        }).sanitize();

    ingames.forEach(function(node){
      var tpl = node.name.split("#")[0];
      if (state.data.ents[tpl] === undefined){
        state.data.ents[tpl] = 0;
      }
      state.data.ents[tpl] += 1;
    });

    H.each(H.Player.researchedTechs, function(tech){
      state.data.tech.push(H.saniTemplateName(tech));
    });
    state.data.tech = H.unique(state.data.tech);

    return state;
  };

  H.HTN.Economy.test = function(state){

    var start = H.HTN.Economy.getCurState(),
        goal  = new H.HTN.Helper.State(state);

    deb("     H: current state");
    JSON.stringify(start.data, null, 2).split("\n").forEach(function(line){
      deb("      : %s", line);
    });

    deb();
    deb("     H: planning for %s with %s", uneval(goal), planner.name);
    planner.plan(start, [[m.start, goal]]);
    planner.operations.forEach(function(op){
      deb("     H: op: %s", op);
    });

    deb("     H: cost: ", uneval(planner.result.data.cost));

  };


  H.HTN.Economy.methods = {

    start: function start(state, goal){

      var prop, diff = 0, data = goal.data,
          ents = [], techs = [], 
          depths = H.Data.Depths[H.Bot.civ];

      // resources are priotized for testing
      if (data.ress){
        for (prop of ["food", "wood", "metal", "stone"]){
          diff = (data.ress[prop] || 0) - (state.data.ress[prop] || 0 );
          if (diff > 0){
            return [[o.inc_resource, prop, diff], [m.start, goal]];
            // if (!state.groups[prop] || !state.groups[prop].length){
            //   return [[m.launch, prop, 1], [m.start, goal]];
            // } else {
            //   rate = state.groups[prop].length * state.groups[prop][0].rate;
            //   return [[o.wait_secs, (diff/rate)], [m.start, goal]];
            // }
          }
        }
      }

      // entities first
      if (data.ents){
        for (prop in data.ents){
          diff = data.ents[prop] - (state.data.ents[prop] || 0 );
          if (diff > 0){
            ents.push([prop, diff]);
          }
        }
        if (ents.length){
          ents = ents.sort((a,b) => depths[a[0]] || 0 - depths[b[0]] || 0);
          return [[m.produce, ents[0][0], ents[0][1]], [m.start, goal]];
        }
      }

      // techs later
      if (data.tech && data.tech.length){
        for (prop of data.tech){
          if (state.data.tech.indexOf(prop) === -1){
            techs.push(prop);
          }
        }
        if (techs.length){
          techs = techs.sort((a, b) => depths[a] - depths[b]);
          return [[m.produce, techs[0], 1], [m.start, goal]];
        }
      }

      // nothing to do, return empty task list
      return [];

    },
    launch: function launch(state, name, amount){

      amount = amount || 1;

      if (name === "stone"){
        return [
          [o.launch_group, "stone", "units.athen.support.female.citizen", 5],
          [m.produce,  "units.athen.support.female.citizen", 5]
        ];

      } else if (name === "wood"){
        return [
          [o.launch_group, "wood", "units.athen.support.female.citizen", 10],
          [m.produce,  "units.athen.support.female.citizen", 10]
        ];

      } else if (name === "food") {
        return [
          [o.launch_group, "food", "units.athen.support.female.citizen", 5],
          [m.produce,  "units.athen.support.female.citizen", 1],
          [o.build_structures, "structures.athen.field", 1],
          [m.produce,  "units.athen.support.female.citizen", 4],
        ];
      }

      return null;

    },
    allocate: function allocate(state, name, amount){

      if (!state.groups[name]) {
        return [[m.launch, name, 1]];

      } else {
        return [[o.wait_secs, 10]];

      }

    },
    advance: function advance(state, name, amount){

      var result, tech = nodes[name];

      amount = amount || 1;

      // can't do that (e.g. phase.town.generic with athen)
      if (!tech){
        planner.log(0, () => fmt("MT: advance unknown %s", name));
        return null;
      }

      // http://trac.wildfiregames.com/changeset/15345
      if (tech.requires && tech.requires.civ){
        planner.log(0, () => fmt("m.advance tech.requires.civ not yet implemneted, %s", tech.requires.civ));
        return null;
      }

      // check for techs
      if (tech.requires) {
        result = checkReqTechnology(planner, m, o, state, tech);
        if (result){
          // console.log("tech req: ", result);
          return result;
        }
      }

      // check for missing buildings
      if (tech.requires && tech.requires.class){
        result = checkReqBuildings(planner, m, o, state, tech, name);
        if (result){
          // console.log("bldgs req: ", result)
          return result;
        }
      }

      result = checkCosts(planner, m, o, state, tech, 1);
      if (result){return result;}

      return ( tech.costs && tech.costs.time ? 
        [[o.research_tech, name], [o.wait_secs, tech.costs.time]] :
        [[o.research_tech, name]]
      );

    },
    produce: function produce(state, name, amount){

      var result, tech, operator, producers, tokens, product = nodes[name];

      amount = amount || 1;

      // that's an error
      if (!product){
        H.throw("procuct unknown: " + name);
        // console.log(fmt("m.produce: unknown product: '%s'", name));
        deb(" ERROR: m.produce: product not in store: '%s'", name);
        planner.log(0, () => fmt("m.produce: unknown product: '%s'", name));        
        return null;
      }

      // this we won't do
      if (name.contains("phase")){
        tokens = name.split(".");
        if (tokens.length > 0 && tokens[0] === "phase"){return [[m.advance, name]];}
        if (tokens.length > 1 && tokens[1] === "phase"){return [[m.advance, name]];}
      }

      // this we can't do, slaves, units.athen.infantry.spearman.e, .a
      if (!cacheProducer[name]){
        // console.log(name, "no producer");
        return null;
      }


      // from here we will do

      // get all producers //TODO: clever sort
      [producers, operator] = cacheProducer[name];

      // producer not in state?
      result = checkProducers(planner, m, o, state, producers);
      if (result){return result;}

      // check popmax/cap, fails if hits popmax and not enough female to kill
      if (product.population){
        result = checkPopulationMax(planner, m, o, state, product, amount);
        if (result){return result;}
        result = checkPopulationCap(planner, m, o, state, product, amount);
        if (result){return result;}
      }

      // unmet technical requirements
      tech = cacheTechnology[name];
      if (tech && state.data.tech.indexOf(tech) === -1){
        return [[m.produce, tech, 1]];
      }

      // can we afford production 
      if (product.costs) {
        result = checkCosts(planner, m, o, state, product, amount);
        if (result){return result;}  
      }

      // redirect technologies
      if (operator.name === "research_tech"){
        return [[m.advance, name]];
      }

      // console.log("produce.out", operator, name, amount);  

      // only time left
      return ( product.costs && product.costs.time ? 
        [[operator, name, amount], [o.wait_secs, product.costs.time * amount]] : 
        [[operator, name, amount]]
      ); 

    }

  };

return H; }(HANNIBAL)); /*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- DOMAIN: E C O N O M Y  --------------------------------------

  Operators



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  // helper

  function applyCosts(state, costs, multiplier){

    ['food', 'wood', 'metal', 'stone'].forEach(function(res){
      state.data.ress[res] -= (costs[res]) ? costs[res] * multiplier : 0;
    });

    state.data.ress.pop    += (costs.population > 0) ? costs.population * multiplier : 0;
    state.data.ress.popcap -= (costs.population < 0) ? costs.population * multiplier : 0;

  }

  H.HTN.Economy.operators = {

    wait_secs: function wait_secs(state, secs) {

      var prop, rate;

      if (true){

        for (prop of ['food', 'wood', 'metal', 'stone']){
          if (state.groups[prop] && state.groups[prop].length){
            rate = state.groups[prop].length * state.groups[prop][0].rate;
            state.data.ress[prop] += rate * secs;
          }
        }

        state.data.cost.time += secs;
        state.stamp += secs;

        return state;

      } else {return null;}

    },

    launch_group: function launch_group(state, group, units, amount) {

      var rate;

      if (true){

        if (!state.groups[group]){state.groups[group] = [];}

        rate = (
          group === "food"  ?  2 :
          group === "wood"  ?  4 :
          group === "stone" ?  8 :
          group === "metal" ? 16 :
            deb("launch_group: strange group '%s'", group)
        );
        
        state.groups[group].push({
          units:   units, 
          amount:  amount, 
          stamp:   state.stamp, 
          members: 0,
          rate:    rate
        });

        return state;

      } else {return null;}


    },
    del_entity: function del_entity(state, entity, amount) {

      var ents = state.data.ents;

      if (ents[entity] >= amount){

        ents[entity] -= amount;

        if (ents[entity] === 0) {
          delete ents[entity];
        }

        return state;

      } else {
        deb("WARN  : can't del_entity: %s %s", entity, amount);
        return null;
      }

    },

    inc_resource: function inc_resource(state, res, amount) {

      if (true){

        state.data.ress[res] += amount;
        
        state.data.cost[res] = ( state.data.cost[res] ?
          state.data.cost[res] + amount :
          amount
        );

        return state;

      } else {return null;}

    },

    train_units: function train_units(state, name, amount) {

      var costs, ents = state.data.ents;

      if (true){

        costs = H.HTN.Economy.nodes[name].costs;
        if (costs){applyCosts(state, costs, amount);}
        ents[name] = ents[name] || 0;
        ents[name] += amount;

        return state;

      } else {return null;}

    },    

    build_structures: function build_structures(state, name, amount) {

      var costs, ents = state.data.ents;

      if (true){

        costs = H.HTN.Economy.nodes[name].costs;
        if (costs){applyCosts(state, costs, amount);}
        ents[name] = ents[name] || 0;
        ents[name] += amount;

        return state;

      } else {return null;}

    },    

    research_tech: function research_tech(state, name) {

      var costs, techs = state.data.tech;

      if (true){

        costs = H.HTN.Economy.nodes[name].costs;
        if (costs) {applyCosts(state, costs, 1);}
        techs.push(name);

        // a hack, but works
        if (name === 'phase.town.athen')  {techs.push('phase.town');}
        if (name === 'phase.city.athen')  {techs.push('phase.city');}
        if (name === 'phase.town.generic'){techs.push('phase.town');}
        if (name === 'phase.city.generic'){techs.push('phase.city');}

        return state;

      } else {return null;}

    }

  };
  
return H; }(HANNIBAL)); /*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, HANNIBAL, H, deb */

/*--------------- H T N _ H E L P E R -----------------------------------------

  state object + mostly logging html



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  // helper
  var mul  = function (n){return new Array(n || 2).join(" ");},
      tab  = function (s,l){return H.replace(H.tab(s,l), " ", "&nbsp;");},
      fmt  = function fmt(){
        var c=0, a=Array.prototype.slice.call(arguments); a.push("");
        return a[0].split("%s").map(function(t){return t + a.slice(1)[c++];}).join('');
      };

  H.HTN.Helper.State = function(data){this.data = data || {};};
  H.HTN.Helper.State.prototype = {
    constructor: H.HTN.Helper.State,
    sanitize: function(){

      var data = this.data;

      this.stamp = 0;
      this.groups = {};

      data.civ  = data.civ  || H.Bot.civ;
      data.cost = data.cost || {};
      data.ress = data.ress || {};
      data.ents = data.ents || {};
      data.tech = data.tech || [];

      data.cost.time   = data.cost.time   || 0;
      data.ress.wood   = data.ress.food   || 0;
      data.ress.food   = data.ress.food   || 0;
      data.ress.metal  = data.ress.metal  || 0;
      data.ress.stone  = data.ress.stone  || 0;
      data.ress.pop    = data.ress.pop    || 0;
      // CHECK: hellenes/civpenalty_spart_popcap
      //        mauryans/civbonus_maur_popcap
      //        persians/civbonus_pers_popcap
      data.ress.popmax = data.ress.popmax || 300;  
      data.ress.popcap = data.ress.popcap || 0;

      // autoresearch
      H.pushUnique(data.tech, "phase.village");

      // population
      if (H.count(data.ents) > 0){
        H.QRY(H.attribs(data.ents).join(", ")).forEach(function(node){
          if (node.costs && node.costs.population){
            if (node.costs.population < 0) {
              data.ress.popcap -= node.costs.population;
            } else {
              data.ress.pop += node.costs.population;
            }
          }
        });
      }

      return this;

    },
    // copy:  function(s, t){var p; t=t||{};for(p in s){t[p]=s[p];}return t;},
    copy: function(s, t){var i,e,k=Object.keys(s),l=k.length;for(i=0;i<l;i++){e=k[i];t[e]=s[e];}},
    clone: function(){

      var i, p,
          s = this.data,
          copy  = this.copy,
          state = new H.HTN.Helper.State({
            civ:  s.civ, 
            cost: {}, 
            ress: {}, 
            ents: {}, 
            tech: []
          }),
          o = state.data;

      state.stamp = this.stamp;
      state.groups = {};

      copy(s.cost, o.cost);
      copy(s.ress, o.ress);
      copy(s.ents, o.ents);

      i = s.tech.length; while(i--){o.tech.push(s.tech[i]);}

      for (p in this.groups){
        state.groups[p] = [];
        i = this.groups[p].length;
        while(i--){
          state.groups[p].push(this.groups[p][i]);
        }
      }

      return state;
    },

  };

  H.extend(H.HTN.Helper, {

    fmt: fmt,
    pritObj: function (o, depth){

      // makes pretty html from states and goals

      var html   = "",
          lf     = "</td></tr>",
          indent = "<tr><td>&nbsp;&nbsp;";

      // hack
      o = o.data;

      depth = depth || 0;

      "civ, ress, ents, tech, cost".split(", ").forEach(function(k){

        var v = o[k] || undefined, akku = [], cnt, ent, cost;

        if (!v){ return;

        } else if (k === 'name') {
          // do nothing, yet.
        
        } else if (k === 'civ') {
          html += indent + " civ: " + v + lf;

        } else if (k === 'ress') {

          H.each(v, function(k, v){
            akku.push(k + ": " + v);
          });
          html += indent + "ress: { " + akku.join(", ") + " }" + lf;

        } else if (k === 'tech') {

          cnt = v.length;

          if (cnt === 0) {
            html += indent + "tech: []" + lf;
          } else if (cnt === 1 ) {
            html += indent + "tech: [ " + v[0] + " ]" + lf;
          } else {
            html += indent + "tech: [" + lf;
            v.sort().forEach(function(tech){
              html += indent + "&nbsp;&nbsp;" + tech + lf;
            });
            html += indent + "]" + lf;
          }


        } else if (k === 'ents'){

            cnt = H.count(v);

            if (cnt === 0) {
              html += indent + "ents: {}" + lf;
            } else if (cnt === 1 ) {
              ent = H.attribs(v)[0];
              html += indent + "ents: { " + ent + " : " +  o.ents[ent] + " }" + lf;
            } else {
              html += indent + "ents: {" + lf;
              H.attribs(v).sort().forEach(function(ent){
                html += indent + "&nbsp;&nbsp;" + tab(o.ents[ent], 3) + " : " + ent + lf;
              });
              html += indent + "}" + lf;
            }

        } else if (k === 'cost'){

            cnt = H.count(v);

            if (cnt === 0) {
              html += indent + "cost: {}" + lf;
            } else if (cnt === 1 ) {
              cost = H.attribs(v)[0];
              html += indent + "ents: { " + cost + " : " +  o.cost[cost] + " }" + lf;
            } else {
              html += indent + "cost: {" + lf;
              "time, food, wood, stone, metal".split(", ").forEach(function(cost){
                if (o.cost[cost]){
                  html += indent + "&nbsp;&nbsp;" +  tab(cost, 5) + " : " + tab(o.cost[cost], 4) + lf;
                }
              });
              html += indent + "}" + lf;
            }

        } else {
          html += indent + H.mulString("&nbsp;", depth) + k + ": " + v + lf;
        }

      });

      return html + "<tr></tr>";

    },

    logStart:    function(state, tasks, verbose){

      deb("   HTN:    name: %s, verbose: %s", state.name, verbose);
      deb("   HTN:   tasks: %s", H.prettify(tasks));
      deb("   HTN:   state: %s", H.prettify(state));

    },
    
    logFinish:   function(plan, state, msecs, cntIterate, maxDepth){

      var patSuccess  = "<b style='color: #383'>   HTN:  SUCCESS msecs: %s, actions: %s, iterations: %s, depth: %s</b>",
          patFailure  = "<b style='color: #833'>   HTN:  FAILURE plan: [%s], %s msecs, iterations: %s, depth: %s</b>",
          patOperator = "&nbsp;&nbsp;op: %s, <b style='color: #444'>%s</b> ( %s )";

      deb();

      if (Array.isArray(plan) && plan.length > 0){

        deb(patSuccess, msecs, plan.length, cntIterate, maxDepth);
        deb("<trenner>");

        deb("<b>new state:</b>");
        deb(H.HTN.Helper.pritObj(state));
        deb();
        
        plan.forEach(function(action, i){

          deb(patOperator, tab(i+1, 3), action[0], action.slice(1).join(", "));
          if (action[0] === 'wait_secs'){
            deb("<trenner>");
          }

        });
        deb();

      } else {
        deb();
        deb(patFailure, plan, msecs, cntIterate, maxDepth); 
        deb();
        deb("<b>   HTN:  state: %s</b>", H.HTN.Helper.pritObj(state));
        deb();
      }

    },

    tab4: "&nbsp;&nbsp;&nbsp;&nbsp;",    
    tab: function (s,l){return H.replace(H.tab(s,l), " ", "&nbsp;");},
    debLine: function(){
      var html, args = arguments;
      if (args.length === 0) {args = ["**"];}
      if (args.length === 1) {args = ["%s", args[0]];}
      html = fmt("<tr><td>%s</td></tr>", fmt.apply(null, args));
      H.Browser.results.append('tblResult', html);
    },    
    logTasks: function(ops){
      var h = H.HTN.Helper;
      ops.forEach(op => {
        var stp = "<strong style='color: #888'>" + tab(op[0], 4) + "</strong>",
            cmd = "<strong style='color: #333'>" + op[1] + "</strong>",
            prs = op.slice(2).filter(p=>p!==undefined).join(", ");
        h.debLine(h.tab4 + stp + " - " + cmd + "   ( "  + prs + " )"); 
        if (op[1] === 'wait_secs'){h.debLine(h.tab4);}
        if (op[1] === 'start'){h.debLine(h.tab4);}
      });
    },

    pushUnique: function(task, taskList){

      // fast and ugly, may modify taskList

      var i  = taskList.length,
          tl = task.length;

      while (i--) {
        if (tl === 1){
          if (task[0] === taskList[i][0]){return;}
        } else if (tl === 2) {
          if (task[0] === taskList[i][0] && 
              task[1] === taskList[i][1]){return;}
        } else if (tl === 3) {
          if (task[0] === taskList[i][0] && 
              task[1] === taskList[i][1] && 
              task[2] === taskList[i][2]){return;}
        } else {
          deb("ERROR : HTN.addUnique pushUnique %s cases", tl);
        }
      }

      taskList.push(task);

    },


  });

return H; }(HANNIBAL));


/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- P L A N N E R -----------------------------------------------

  Simple HTN Planner based on Pyhop/SHOP written by Dana S. Nau
  https://bitbucket.org/dananau/pyhop
  http://www.cs.umd.edu/projects/shop/

  expects ES6 (e.g. FF30+), uses spread, fat arrow, of
  V: 1.1, noiv11, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  var 
    // simple templates
    fmt = function (){
      var c=0, a=Array.prototype.slice.call(arguments); a.push("");
      return a[0].split("%s").map(function(t){return t + a.slice(1)[c++];}).join('');
    },
    // JSON w/o quotes
    pritj = function(o){return JSON.stringify(o).split('"').join("");},
    // prettyfies a task
    pritt = function(task){return fmt("[%s: %s]", task[0].name, task.slice(1).join(", "));};

  H.HTN.Planner = function Planner(config) {

    var defaults = {
      name:     "unknown",   // log indentifier    
      logstack:        [],   // collect messages 
      verbose:          0,   // defines a log threshhold
      msecs:            0,   // duration of seekPlan
      depth:            0,   // current search depth
      iterations:       0,   // a counter
      maxDepth:       200,   // seeking stops here
      maxIterations:  300,   // seeing stops here
      tree:          null,   // 
      // domain:        null,   // defines the domain within an app
      // noInitialize: false,   // suppress domain initialization
      methods:       null,   // object holding the methods
      operators:     null,   // object holding the operators
      tasks:         null,   // the tasks given on first call
      state:         null,   // the state given on first call
      operations:    null    // the final task list
    };

    H.extend(this, defaults, config || {});

    // if (this.domain.initialize && !this.noInitialize){this.domain.initialize(this);}
    // this.methods   = this.domain.methods;
    // this.operators = this.domain.operators;

  };

  H.HTN.Planner.prototype = {
    constructor:  H.HTN.Planner,
    log: function(verbose, msg){
      if (verbose <= this.verbose){
        this.logstack.push({
          v: verbose, 
          d: this.depth, 
          m: typeof msg !== "function" ? msg : msg(), 
          now: Date.now()
        });
      }
    },
    plan: function plan (state, tasks){

      var t0, t1;

      this.error = undefined;

      this.state = state;
      this.tasks = tasks;

      this.msecs = 0;
      this.depth = 0;
      this.stack = [];
      this.logstack = [];
      this.iterations = 0;
      this.log(1, fmt("START: tasks: %s, state: %s", tasks.map(pritt), pritj(state)));

      this.stack.push([state, tasks, [], this.depth]);
      
      t0 = Date.now();
      [this.operations, this.result, this.error] = this.seekPlan();
      t1 = Date.now();

      this.msecs = t1 - t0;

      if (this.error){
        this.log(0, fmt("FAILED: %s, plan: %s ops, depth: %s, iter: %s, msecs: %s",
          this.error, this.operations.length, this.depth, this.iterations, this.msecs));

      } else if (!this.operations.length) {
        this.log(0, fmt("FAILED: %s, plan: %s ops, depth: %s, iter: %s, msecs: %s",
          "no solution found", this.operations.length, this.depth, this.iterations, this.msecs));

      } else {
        this.operations.unshift([0, "start"]);
        this.operations.push([this.result.stamp, "finish"]);
        this.log(0, fmt("SUCCESS: plan: %s ops, depth: %s, iter: %s, msecs: %s",
          this.operations.length, this.depth, this.iterations, this.msecs));

      }

      return this;

    },
    seekPlan: function seekPlan () {

      var state, tasks, plan, depth, exit, stamp,
          task, name, result, newstate, newPlan, subtasks, newTasks;

      while (this.stack.length) {

        [state, tasks, plan, depth] = this.stack.pop();

        this.depth = depth > this.depth ? depth : this.depth; // Math.max(depth, this.depth); 
        this.iterations += 1;

        exit = (
          // prefered outcome
          !tasks.length                        ? [plan, state, undefined] :
          this.depth      > this.maxDepth      ? [plan, state, fmt("too deep ( %s )", this.depth)] : 
          this.iterations > this.maxIterations ? [plan, state, fmt("too many iterations ( %s )", this.iterations)] :
            null
        );

        if (exit){return exit;}

        task  = tasks[0];
        name  = task[0].name;
        stamp = state.stamp;

        if (name === "ANY") {

          result = this.seekAnyMethod(state, tasks, plan, ++this.depth);
          if (result){this.stack.push(result);}

        } else if (this.operators.hasOwnProperty(name)){

          newstate = task[0](state.clone(), task[1] || undefined, task[2] || undefined, task[3] || undefined);

          if (newstate){
            this.log(2, () => "OP: " + pritt(task));
            newPlan  = plan.concat([[stamp, task[0].name, task[1], task[2], task[3]]]);
            this.stack.push([newstate, tasks.slice(1), newPlan, ++this.depth]);
          }

        } else if (this.methods.hasOwnProperty(name)){

          subtasks = task[0](state, task[1] || undefined, task[2] || undefined, task[3] || undefined);

          if (subtasks){
            this.log(2, () => "MT: " + pritt(task));
            newTasks = subtasks.concat(tasks.slice(1));
            this.stack.push([state, newTasks, plan, ++this.depth]);
          }

        }

      }

      return (
        // if task was valid 
        depth > 1 ? [plan, state, undefined] : 
        // if valid solution
        plan  ? [plan, state, undefined] : 
        // first task not valid
        [plan, state, fmt("no solution for task: [%s, %s], depth: %s", name, tasks[0][1], depth)]
      );

    },
    seekAnyMethod: function seekAnyMethod (state, tasks, plan, depth){

      var anyTasks = tasks[0][1], anyPointer = 0, anyTask, 
          i, len, subtasks, anySubTasks, newTasks,
          pushUnique = H.HTN.Helper.pushUnique;

      while ((anyTask = anyTasks[anyPointer++])) {

        this.log(2, () => fmt("AT: (%s/%s) [%s: %s, %s, %s]", anyPointer, anyTasks.length, anyTask[0].name, anyTask[1], anyTask[2]||'', anyTask[3]||''));

        this.iterations += 1;
        subtasks = anyTask[0](state, anyTask[1], anyTask[2]);

        if(subtasks){

          if (subtasks[0][0].name === "ANY"){
            depth += 1;
            anySubTasks = subtasks[0][1];
            len = anySubTasks.length;
            for (i=0; i<len; i++){pushUnique(anySubTasks[i], anyTasks);}

          } else {
            newTasks = subtasks.concat(tasks.slice(1));
            return [state, newTasks, plan, depth];

          }

        }    

      }

      return null;

    }


  };

return H; }(HANNIBAL));

/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- D S L -------------------------------------------------------

  builds a DSL with a fluent interface used in e.g. groups, 
  based on method chaining/cascading


  V: 0.1, agentx, CGN, Feb, 2014

*/

/*
  Intro: 

    WARNING  :  The language introduced here, looks like JavaScript and meets its
                syntax. However, e.g. a variable (object) does not hold a value, 
                instead it changes the state of the world, same do methods.

    DSL      :  The language module
    Corpus   :  A set of nouns, verbs and attributes [e.g. groups]
    World    :  An environment an actor can change via the language 
                [all groups share same world]. world is usually the first 
                parameter (w) in a script call function.
    Actor    :  Sets the meaning of nouns, verbs, attributes, at each time only 
                one actor is in a world. In the groups world each group instance 
                maps onto an actor.
    Sentence :  JS code written in DSL to describe the behaviour of the world
    Noun     :  Each sentence consist (minimum) of the world, noun and a verb,
                The world acts also as a noun, so w.log() is a valid sentence.
                Nouns are not followed by parenthesis in opposite to verbs.
    Subject   : The currently selected noun.
    Object    : The currently active noun.
    Verbs     : Assuming the nouns: units, resources + verbs: gather, move
                w.units.move(xy), or w.units.gather(w.resources) are correct.
    Modifiers : Stop sentence execution thus allowing flow control. The remainder
                of a sentence remains unheard.

                  .exists(a)   // breaks on a === undefined
                  .match(a, b) // on a !== b
                  .gt(a, b)    // on a < b
                  .lt(a, b)    // on a > b

                Above are global modifiers, groups have:

                  .member(a, b)   // breaks if a is not completely member of b


    Example   : 
                  var assign = function(w, item){
                    
                    // make item available as object
                    w.objectify("item", item);
                    
                    // keep requesting units until size
                    w.units.on                          // set units as subject
                      .member(item)                     // proceed if item is member of units
                      .lt(w.units.count, w.units.size)  // proceed if count < size
                      .request()                        // order 1 unit from economy
                    ;

                  };

*/


HANNIBAL = (function(H){  

  H.DSL.Language = function (context, handler, corpus) {

    H.extend(this, {

      imports: [
        "map"
      ],

      klass:         "dsl:language",
      context:       context,

      corpusname:    corpus,
      corpus:        H.DSL.Corpora[corpus],
      handler:       handler,  

      verbs:         {},
      world:         null,

      scriptname:    ""

    });

    this.name = H.format("language:%s", corpus);
    this.deb("  LANG: loaded corpus: %s", this.corpusname);

  };

  H.DSL.Language.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.DSL.Language,
    createWorld: function(actor){

      var self = this, world = {actor: actor};

      // this.deb("   DSL: createActor");
      
      H.extend(world, {

        dsl:      this,      // uplink

        execute:  false,     // script execution is enabled
        proceed:  false,     // sentence execution is enabled

        nouns:      {},
        subject:  null,      // currently active subject
        object:   null,      // currently active object

        reset: () => {
          // this.deb("   DSL: world reset from sentence: %s", world.sentence);
          world.sentence = [];
          world.debug    = false;
          world.proceed  = true;
          world.execute  = true;
          world.subject  = null;
          world.object   = null;
          H.each(this.corpus.nouns, noun => {
            ( world.nouns[noun] && world.nouns[noun].update && world.nouns[noun].update() );
          });

        },

        objectify:  (name, obj) => {

          // this.deb("   DSL: objectifying: %s for %s", name, world.actor);
          this.setnoun(world, name, new this.corpus.nouns[name](obj, name));

        },
        nounify:  () => {

          H.toArray(arguments).forEach( noun => {

            // this.deb("   DSL: nounifying: %s for %s", noun, world.actor);
            
            var host = this.handler.nounify(world, actor, noun);
            this.setnoun(world, noun, new this.corpus.nouns[noun](host, noun));

          });
        },

        // debug
        sentence: [],
        toString: () => H.format("[world %s]", this.corpusname),
        deb:      function(){
          self.deb.apply(self, arguments);
          return world;
        },
        log:      function(){
          var msg = H.format.apply(null, arguments);
          if (world.execute && world.proceed){
            world.deb("------: ");
            world.deb("      : " + msg);
            world.deb("      :    actor: %s, script: %s", world.actor, self.scriptname);
            world.deb("      :  subject: %s, object: %s", world.subject, world.object);
            world.deb("      : sentence: %s", world.sentence);
            H.each(self.corpus.nouns, noun => {
              if (world[noun]){
                world.deb("      : %s -> %s", noun, world[noun]);
              }
            });
            world.deb("------: ");
          }
          return world;
        },
        // echo:   function(act, sub, obj, a){
        echo:   function(){
          if (world.execute && world.proceed){
            world.deb("   WLD: echo: %s", H.format.apply(null, arguments));
          }
          return world;
        },

      });
  
      // on, off, do
      H.each(H.DSL.Corpora.globals.meta, (name, fn) => {
        Object.defineProperty(world, name, {
          get: fn, enumerable: true
        });
      });

      // reset, end, member, lt, gt, match
      H.each(
        H.DSL.Corpora.globals.modifier, 
        this.corpus.modifier, 
        (name, fn) => this.setverb(world, name, fn)
      );

      // count, size, position, health
      H.each(
        this.corpus.attributes, 
        (name, fn) => this.setattribute(world, name, fn)
      );      

      // points
      H.each(
        this.corpus.methods, 
        (name, fn) => this.setgetter(world, name, fn)
      );      

      return world;

    },
    runScript: function(world, actor, script, params){
      var t1, t0 = Date.now();
      this.world = world;
      this.scriptname = script.name;
      world.reset();
      world.actor = actor;
      params.unshift(world);
      script.apply(actor, params);
      t1 = Date.now();
      if(t1 - t0 > 2){
        this.deb("WARN  : DSL: runScript took %s msec %s %s", t1 - t0, script.name, actor);
      }
    },
    setnoun:  function(world, noun, obj){
      // this.deb("   DSL: setnoun: %s", noun);
      world.nouns[noun] = obj;
      Object.defineProperty(world, noun, {
          configurable: true, enumerable: true, 
          get: function () {
            if (this.execute){
              this.sentence.push(["o:", noun]);
              this.object = obj;
              // this.deb("   DSL: setobject: %s", noun);
            } else {
              // this.deb("   DSL: ignored setobject: %s", noun);
            }
            return this;
          }
      });
    },
    setverbs: function(world, verbs){
      H.each(verbs, (verb, fn) => this.setverb(world, verb, fn));
    },
    setverb:  function(world, verb, fn){
      // this.deb("   DSL: setverb: %s", verb);
      world[verb] = () => {
        var args = H.toArray(arguments); //, world = this.world;
        if (world.execute && world.proceed){
          if (world.debug){this.deb("   WLD: %s %s %s", world.subject.name, verb, world.object.name);}
          world.sentence.push(["v:", verb]);
          args.unshift(world.actor, world.subject, world.object);
          fn.apply(world, args);
          // this.deb("   DSL: applied verb '%s' args: %s", verb, args);
        } else {
          // this.deb("   DSL: ignored: verb '%s' pro: %s, exe: %s", verb, world.proceed, world.execute);
        }
        return world;
      };
    },
    setattribute:  function(world, attribute, fn){
      // this.deb("   DSL: setattribute: %s", attribute);
      Object.defineProperty(world, attribute, {
          configurable: true, enumerable: true, 
          get: function () {
            this.sentence.push(["a:", attribute]);
            if (this.execute && this.proceed){
              // this.deb("   DSL: read attribute '%s'", attribute);
              return fn.apply(this, [this.subject, this.object]);
            } else {
              // this.deb("   DSL: ignored attribute '%s' pro: %s, exe: %s", attribute, this.proceed, this.execute);
              return null;
            }
          }
      });
    },
    setgetter:  function(world, method, fn){
      this.deb("   DSL: setgetter: %s", method);
      // this.deb("   DSL: setverb: %s", method);
      world[method] = () => {
        var args = H.toArray(arguments); //, world = this.world;
        if (world.execute && world.proceed){
          if (world.debug){this.deb("   WLD: %s %s %s", world.subject.name, method, world.object.name);}
          world.sentence.push(["m:", method]);
          args.unshift(world.subject, world.object);
          return fn.apply(world, args);
          // this.deb("   DSL: applied method '%s' args: %s", method, args);
        } else {
          // this.deb("   DSL: ignored: method '%s' pro: %s, exe: %s", method, world.proceed, world.execute);
        }
        return null;
      };
    },
  
  });


  // Must be before corpus

  H.DSL.Nouns.Group = function(host, name){
    this.name = name;
    this.host = host;
    this.update();
  };
  H.DSL.Nouns.Group.prototype = {
    constructor: H.DSL.Nouns.Group,
    toString: function(){return H.format("[noun:group %s]", this.name);},
    update: function(){
      this.position = this.host.position;
    }
  };

  H.DSL.Nouns.Resources = function(host, name){
    this.name = name;
    this.host = host;
    this.update();
  };
  H.DSL.Nouns.Resources.prototype = {
    constructor: H.DSL.Nouns.Resources,
    toString: function(){return H.format("[noun:group %s]", this.name);},
    update: function(){
      this.list = this.host.resources.slice();
      this.size = this.host.size;
      this.position = this.host.position;
      this.isresource = this.host.isresource || false;
    }
  };


  // a generic, represents an asset with a list of entities
  
  H.DSL.Nouns.Entities = function(host, name){
    this.name = name;
    this.host = host;
    this.update();
  };
  H.DSL.Nouns.Entities.prototype = {
    constructor: H.DSL.Nouns.Entities,
    toString: function(){return H.format("[noun:entities %s[%s]]", this.name, this.list.join("|"));},
    update: function(){
      this.list = this.host.resources.slice();
      this.size = this.host.size;
      this.position = this.host.position;
      this.foundation = this.host.foundation || false;
      this.isresource = this.host.isresource || false;
    }
  };

  H.DSL.Nouns.Village = function(host, name){
    this.name = name;
    this.host = host;
    this.verbs = new H.DSL.Nouns.Entities().verbs;
    this.list = [];
  };
  H.DSL.Nouns.Village.prototype = H.mixin (
    H.DSL.Nouns.Entities.prototype, {
    constructor: H.DSL.Nouns.Village,
    toString: function(){return H.format("[noun:village  %s[%s]]", this.name, this.list.join("|"));},
  });

  H.DSL.Nouns.Scanner = function(device, name){
    this.name = name;
    this.device = device;
    this.verbs = [
      "scan",
    ];
  };
  H.DSL.Nouns.Scanner.prototype = {
    constructor: H.DSL.Nouns.Scanner,
    toString: function(){return H.format("[noun:scanner  %s[%s]]", this.name, this.list.join("|"));},
  };

  H.DSL.Helper = {
    health: function(){},
    vision: function(){},
  };

  H.DSL.Corpora = {
    globals: {
      meta: {
        on: function(){
          if (this.execute){
            this.proceed = true;  
            this.sentence = ["s:", this.object.name];
            this.subject = this.object;
            // this.deb("   DSL: on setsubject: %s", this.subject);
            // this.deb("--.on.out");
          }
          return this;
        },
        do: function(){
          if (this.execute && this.proceed){
            this.sentence.push(["s:", this.object.name]);
            this.subject = this.object;
            // this.deb("   DSL: do setsubject: %s", this.subject);
          }
          return this;          
        },
        off: function(){
          if (this.execute && this.proceed){
            this.subject = null;
            this.object = null;
            this.proceed = false; 
          }
          return this;          
        },
        exit:    function(){
          if (this.proceed){
            this.subject = null;
            this.object  = null;
            this.execute = false; 
            this.proceed = false; 
            // this.deb("   DSL: EXIT ================");
          }
          return this;
        },
      },
      modifier: {
        match:  function(act, sub, obj, a, b){
          if (this.execute && this.proceed){
            if (a === undefined && b === undefined){
              this.proceed = false;
            } else if (a !== undefined && b === undefined){
              this.proceed = !!a;
              // pass on single param valid
            } else if (a !== b){
              this.proceed = false;
            }
          }
          return this;
        },
        gt:     function(act, sub, obj, a, b){
          if (this.execute && this.proceed){
            if (a !== undefined && b !== undefined && ( a <= b)){
              this.proceed = false;
            }
          }
          // this.log("   DSL: lt.out:  got %s, %s proceed: %s", a, b, this.proceed);
          return this;
        },
        lt:     function(act, sub, obj, a, b){
          if (this.execute && this.proceed){
            if (a !== undefined && b !== undefined && ( a >= b)){
              this.proceed = false;
            }
          }
          // this.log("   DSL: lt.out:  got %s, %s proceed: %s", a, b, this.proceed);
          return this;
        }
      },
    },
    groups: {
      name: "groups",
      // verbs are defined in groups.js
      nouns : {
        "group":       H.DSL.Nouns.Group,
        "path":        H.DSL.Nouns.Entities,
        "village":     H.DSL.Nouns.Village, 
        "scanner":     H.DSL.Nouns.Scanner,   
        "resources":   H.DSL.Nouns.Resources, 

        "attacker":    H.DSL.Nouns.Entities,   
        "buildings":   H.DSL.Nouns.Entities, 
        "centre":      H.DSL.Nouns.Entities, 
        "dropsite":    H.DSL.Nouns.Entities,   
        "field":       H.DSL.Nouns.Entities,   
        "item":        H.DSL.Nouns.Entities,   
        "units":       H.DSL.Nouns.Entities,   
      },
      methods: {
        points: function(s, o, selector){
          return [o.list[selector]];
        },
      },
      attributes: {
        // health:       function(s, o){return H.DSL.Helper.health(o.list);}, 
        // vision:       function(s, o){return H.DSL.Helper.vision(o.list);}, 
        count:        function(s, o){return o.list.length;}, 
        size:         function(s, o){return o.size;}, 
        foundation:   function(s, o){return o.foundation;}, 
        distance:     function(s, o){
          return this.dsl.map.distance (
            this.map.dsl.getCenter(s.list), 
            this.map.dsl.getCenter(o.list)
          );
        }, 
        direction:    function(s, o){
          var 
            spos = this.dsl.map.getCenter(s.list),
            opos = this.dsl.map.getCenter(o.list);
          return [ opos[0] - spos[0], opos[1] - spos[1] ];
        },
        position:     function(s, o){
          if (o instanceof H.DSL.Nouns.Group){
            return o.position;
          } else {
            return this.dsl.map.getCenter(o.list);
          }
        },
      },
      modifier: {
        member: function(act, s, o){

          // this.deb("   DSL: member.in: s: %s, o: %s, pro: %s, exe: %s", s, o, this.proceed, this.execute);

          if (s instanceof H.DSL.Nouns.Resources){
            // relies on groups have only single resource asset
            this.proceed = o.isresource;
            // this.deb("   DSL: match s = resource and o = res %s", o.isresource);

          } else {
            this.proceed = this.proceed ? (
              s && o && s.list && o.list && 
              s.list.length && o.list.length &&
              o.list.every(r => s.list.indexOf(r) !== -1)
            ) : false;

          }

          // this.deb("   DSL: member.out: s: %s, o: %s, pro: %s, exe: %s", s, o, this.proceed, this.execute);

          return this;
        },
      }
    }
  };

return H; }(HANNIBAL));
/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, HANNIBAL_DEBUG, API3, uneval */

/*--------------- L A U N C H E R   -------------------------------------------

  Launches an AI/Bot in a fresh or saved context.
  Home: https://github.com/noiv/Hannibal/blob/master/README.md

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/


HANNIBAL = (function(H) {

  // API bot constructor
  H.Launcher = function(settings) {

    var id = settings.player;

    API3.BaseAI.call(this, settings);

    H.extend(this, {

      id:             id,
      name:           "H" + id,
      klass:          "launcher",
      debug:          HANNIBAL_DEBUG ? HANNIBAL_DEBUG.bots[id] : {},
      map:            HANNIBAL_DEBUG ? HANNIBAL_DEBUG.map : "unknown",
      deb:            H.deb.bind(null, id),
      chat:           H.chat.bind(null, id),

      settings:       settings,                            // from ai config dialog
      isInitialized:  false,                               // did that happen well?
      isTicking:      false,                               // toggles after first OnUpdate
      isFinished:     false,                               // there is still no winner
      noInitReported: false,                               // report init failure only once
      timing:         {all: 0},                            // used to identify perf. sinks in OnUpdate
      
    });

    // create empty context
    this.context = new H.LIB.Context("C1", this);

    this.deb("      : Launcher.out: ID: %s, debug: %s", this.id, uneval(this.debug));

  };

  H.Launcher.prototype = new H.API.BaseAI();
  H.Launcher.prototype.Deserialize = function(data /*, sharedScript */ ){
    this.context.deserialize(data);
  };
  H.Launcher.prototype.Serialize = function(){
    return this.context.serialize();
  };
  H.Launcher.prototype.CustomInit = function(gameState, sharedScript) {

    var 
      t0  = Date.now(),
      deb = this.deb.bind(this), 
      ss  = sharedScript, 
      gs  = gameState,
      civ = ss.playersData[this.id].civ;

    // H.deb("      :");
    // H.deb("      :");
    H.deb("------: HANNIBAL.Launcher.CustomInit %s/%s in", this.id, civ);


    // move window
    if (this.debug.xdo){
      this.deb("#! xdotool init");
    }

    // launch the stats extension
    if (this.debug.numerus){
      H.Numerus.init(this.id, ss, gs);          
    }             

    // debug
    this.logStart(ss, gs, this.settings);
    this.logPlayers(ss.playersData);

    // connect the context
    this.context.connectEngine(this, gameState, sharedScript, this.settings);
    this.context.initialize(H.Config);

    // This bot faces the other players
    this.bot = this.context.createBot();
    
    /* run scripted actions named in H.Config.sequence */
    // deb();
    // H.Tester.activate(this.map, this.id, this.context);
    /* end scripter */


    /*

    Below is for development

    */

    var lines1, lines2, lines3, diff;
    // this.context.log();

    // lines1 = exportJSON(this.context.serialize(), "ctx1.serialized");

    // deb();
    // deb("################################################################################");
    // deb();

    // clone second context to compare serialization
    // this.secondContext = this.context.clone();
    // this.secondBot     = this.secondContext.createBot();
    // lines2 = exportJSON(this.secondContext.serialize(), "ctx2.serialized");
    
    // deb();
    // deb("################################################################################");
    // deb();

    // third context via de/serialize
    // this.thirdContext = new H.LIB.Context("ctx3");
    // this.thirdContext.deserialize(this.context.serialize());
    // this.thirdContext.connectEngine(this, gameState, sharedScript, this.settings);
    // this.thirdContext.initialize(H.Config);

    // diff = diffJSON(this.context.serialize(), this.thirdContext.serialize());
    // logJSON(diff, "ctx1 vs. ctx3");

    // this.thirdContext.log();
    // this.thirdBot     = this.thirdContext.createBot();
    // lines3 = exportJSON(this.thirdContext.serialize(), "ctx3.serialized");

    // deb();
    // deb("SRLIAZ: ctx 1: %s lines", lines1);
    // deb("SRLIAZ: ctx 2: %s lines", lines2);
    // deb("SRLIAZ: ctx 3: %s lines", lines3);
    // deb();
    // deb("################################################################################");

    /* testing triple store */
    this.context.culture.debug = 5;
    // this.context
    //   .query(this.context.class2name("civilcentre") + " RESEARCH")
    //   .params({format: "metadata", deb: 5, debmax: 10, comment: "next phases"});
    //   .execute();
    this.context.culture.debug = 0;
    /* end testing triple store */


    // H.Config.deb = 0; // suppress further log line

    this.initialized = true;

    this.deb("      :");
    this.deb("      :");
    H.deb("------: HANNIBAL.Launcher.CustomInit %s/%s out %s msecs, ", this.id, civ, Date.now() - t0);

    return;

  };
  H.Launcher.prototype.OnUpdate = function(sharedScript) {

    var 
      deb = this.deb.bind(this),
      ss = sharedScript,
      t0 = Date.now(),
      secs = (ss.timeElapsed/1000).toFixed(1),
      msgTiming = "";

    if (this.isFinished){return;} // API ????

    if (!this.initialized){
      if (!this.noInitReported){
        this.logNotInitialized();
      }
      this.noInitReported = true;
      return;      
    }

    if (!this.isTicking){
      this.logFirstTick(t0, ss.playersData[this.id].civ);
      this.isTicking = true;
    }

    // keep API events from each turn, even if not processing
    this.context.events.collect(this.events);


    // ------------- A C T I O N   S T A R T ----------------------------------

    // Run the update every n turns, offset depending on player ID to balance the load
    if ((this.turn + this.player) % 8 === 5) {

      // update context
      this.context.updateEngine(sharedScript);

      // log top row debug info
      deb("------: %s@%s, elapsed: %s secs, %s/%s, techs: %s, food: %s, wood: %s, metal: %s, stone: %s", 
        this.id,
        this.context.tick, secs, 
        this.bot.player.civ, this.context.culture.phases.current,
        H.count(this.bot.player.researchedTechs), 
        this.bot.player.resourceCounts.food,
        this.bot.player.resourceCounts.wood,
        this.bot.player.resourceCounts.metal,
        this.bot.player.resourceCounts.stone
      );

      this.timing.all = 0;
      this.timing.tst = 0;

      if (this.context.tick === 0 && this.debug.tst){
        H.Tester.activate(this.map, this.context); 
        H.Tester.log(); 
      }

      // execute test scripts 
      if (this.debug.tst){
        this.timing.tst = H.Tester.tick(secs, this.context.tick, this.context);
      }

      // THIS IS THE MAIN ACT
      this.bot.tick(secs, this.context.tick, this.timing);

      // deb: collect stats
      if (this.debug.numerus){
        H.Numerus.tick(secs, this.context.tick, sharedScript);
      }

      // prepare bottom row debug info
      H.each(this.timing, (name, msecs) => {
        if (name !== "all"){
          msgTiming += H.format(", %s: %s", name, msecs);
        }
        this.timing.all += msecs;
      });

      // log row
      deb("------: %s@%s timing: %s, all: %s %s", 
        this.id,
        this.context.tick, 
        msgTiming, 
        this.timing.all, 
        this.timing.all >= 100 ? "!!!!!!!!" : ""
      );

      // increase tick number
      this.context.tick++;


      // ------------- A C T I O N   E N D --------------------------------------

      deb("      :");
      
    }

    // increase turn number
    this.context.turn++;
    this.turn++;

  };
  H.Launcher.prototype.logNotInitialized = function() {
    var deb = this.deb.bind(this);
    deb("------: ### --- ### --- ### --- PID: %s, HANNIBAL: ", this.id, new Date());
    deb();
    deb("ERROR : HANNIBAL IS NOT INITIALIZED !!!");
    this.chat("HANNIBAL IS NOT INITIALIZED, check install.txt");
    deb();
    deb("------: ### --- ### --- ### --- PID: %s, HANNIBAL: ", this.id, new Date());
  };
  H.Launcher.prototype.logFirstTick = function(t0, civ) {
    var deb = this.deb.bind(this);
    deb("------: HANNIBAL.firstTick: %s/%s, %s, after: %s secs", this.id, civ, this.map, ((t0 - H.MODULESTART)/1000).toFixed(1));
    deb();
  };
  H.Launcher.prototype.logStart = function(ss, gs, settings){

    var deb = this.deb.bind(this), id = this.id;

    deb("------: LAUNCHER.CustomInit: PID: %s, Players: %s, difficulty: %s", id, H.count(ss.playersData), settings.difficulty);
    deb("      :");
    deb("     A:     map from DEBUG: %s / %s", this.map, ss.gameType);
    deb("     A:                map: w: %s, h: %s, c: %s, cells: %s", ss.passabilityMap.width, ss.passabilityMap.height, ss.circularMap, gs.cellSize);
    deb("     A:          _entities: %s [  ]", H.count(ss._entities));
    deb("     A:         _templates: %s [  ]", H.count(ss._templates));
    deb("     A:     _techTemplates: %s [  ]", H.count(ss._techTemplates));
    deb("     H: _techModifications: %s [%s]", H.count(ss._techModifications[id]), H.attribs(ss._techModifications[id]));
    deb("     H:     researchQueued: %s [  ]", H.count(ss.playersData[id].researchQueued));
    deb("     H:    researchStarted: %s [  ]", H.count(ss.playersData[id].researchStarted));
    deb("     H:    researchedTechs: %s [%s]", H.count(ss.playersData[id].researchedTechs), H.attribs(ss.playersData[id].researchedTechs).join(", "));
    deb("     A:       barterPrices: %s", H.prettify(ss.barterPrices));

  };
  H.Launcher.prototype.logPlayers = function(players){

    var 
      deb = this.deb, tab = H.tab, msg = "", head, props, format, tabs,
      fmtAEN = item => item.map(b => b ? "1" : "0").join("");

    deb();

    head   = "name, team, civ, phase,      pop,   ally,    enmy,      neut, colour".split(", ");
    props  = "name, team, civ, phase, popCount, isAlly, isEnemy, isNeutral, colour".split(", ");
    tabs   = [  10,    6,   8,    10,        5,      6,       6,         6, 20];
    format = {
      isAlly:    fmtAEN,
      isEnemy:   fmtAEN,
      isNeutral: fmtAEN
    };

    H.zip(head, tabs, function(h, t){msg += tab(h, t);});
    deb("PLAYER: " + msg);

    H.each(players, function(id, player){
      msg = "";
      H.zip(props, tabs, function(p, t){
        msg += (format[p]) ? tab(format[p](player[p]), t) : tab(player[p], t);
      });    
      deb("     %s: %s", id, msg);
    });

  };
  H.Launcher.prototype.diffJSON = function (a, b) {

    // https://github.com/paldepind/dffptch
    
    var 
      O = Object, keys = O.keys,
      aKey, bKey, aVal, bVal, rDelta, shortAKey, 
      aKeys = keys(a).sort(),
      bKeys = keys(b).sort(),
      delta = {}, adds = {}, mods = {}, dels = [], recurses = {},
      aI = 0, bI = 0;

    // Continue looping as long as we haven't reached the end of both keys lists

    while(aKeys[aI] !== undefined || bKeys[bI]  !== undefined || false) {
      
      aKey = aKeys[aI]; 
      bKey = bKeys[bI];
      aVal = a[aKey];
      bVal = b[bKey];
      shortAKey = String.fromCharCode(aI+48);

      if (aKey == bKey) {

        // We are looking at two equal keys this is a
        // change – possibly to an object or array
        
        if (O(aVal) === aVal && O(bVal) === bVal) {
        
          // Find changs in the object recursively
          rDelta = H.diffJSON(aVal, bVal);
        
          // Add recursive delta if it contains modifications
          if (keys(rDelta)) {recurses[shortAKey] = rDelta;}
        
        } else if (aVal !== bVal) {
          mods[shortAKey] = bVal;
        
        }
        
        aI++; bI++;

      } else if (aKey > bKey || !aKey) {
        // aKey is ahead, this means keys have been added to b
        adds[bKey] = bVal;
        bI++;

      } else {
        // bKey is larger, keys have been deleted
        dels.push(shortAKey);
        aI++;

      }
    }

    // We only add the change types to delta if they contains changes
    if (dels[0]) delta.d = dels;
    if (keys(adds)[0]) delta.a = adds;
    if (keys(mods)[0]) delta.m = mods;
    // if (keys(recurses)[0]) delta.r = recurses;
    
    return delta;

  };

return H; }(HANNIBAL));
/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals  HANNIBAL, Uint8Array, uneval, logObject */

/*--------------- M A P S -----------------------------------------------------

  Deals with map aspects in coordinates, contains all grids and fields


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/

/* 
  naming conventions:
    positions: array of floats [x, z] in map dmension (m)
    coords:    array of ints [x, z] in grid dimension (m/grid.cellsize)
    grids:     one dimensional int arrays having width === height
    fields:    one dimensional float arrays having width === height
    size:      width or height of grids
    cell:      area covered in map by grid index
    index:     pointer into grid, index = x + y * size
    length:    width * height
    id:        a single entity id, int
    ids:       array of entity ids e.g. [45, 46, ...]
    distance:  float, scalar in map positions

*/ 

/* 
  grids: 
    terrain:         water, land, shore, etc, static
    regionswater:    connected water cells, static
    regionsland:     connected land cells, static
    obstructions:    where buildings can be placed, dynamic
    obstacles:       where units can move, dynamic
    claims:          reserved space in villages, dynamic
    attacks:         where attacks happened, w/ radius, dynamic
    scanner:         used by scouts to mark explored area

*/

// http://www.nayuki.io/res/smallest-enclosing-circle/smallestenclosingcircle.js
// http://stackoverflow.com/questions/4826453/get-two-lower-bytes-from-int-variable

// sharedScript.passabilityClasses
//   pathfinderObstruction: NUMBER (1)
//   foundationObstruction: NUMBER (2)
//   building-land: NUMBER (4)
//   building-shore: NUMBER (8)
//   default: NUMBER (16)
//   ship: NUMBER (32)
//   unrestricted: NUMBER (64)

// sharedScript.passabilityMap
//   data: OBJECT (0, 1, 2, 3, 4, ...)[65536]
//   height: NUMBER (256)
//   width: NUMBER (256)

// sharedScript.territoryMap
//   data: OBJECT (0, 1, 2, 3, 4, ...)[65536]
//   height: NUMBER (256)
//   width: NUMBER (256)


HANNIBAL = (function(H){

  const 

    TERRITORY_PLAYER_MASK = 0x3F, // 63

    sin = Math.sin,
    cos = Math.cos,
    sqrt = Math.sqrt,
    PI2  = Math.PI * 2,
    PIH  = Math.PI / 2,

    pritShort = function (a){
      return (
        !Array.isArray(a) ? a :
        a.length === 0 ? "[]" : 
          H.prettify(a.map(function(v){
            return Array.isArray(v) ? pritShort(v) : v.toFixed(1);
          }))
      );
    };

  H.LIB.Map = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "id",
        "width",
        "height",
        "cellsize",
        "effector",
        "events",
        "entities",           
        "templates",           
        "villages",           
        "players",            // isEnemy
      ],

      childs: [               // these are all grids
        "terrain",            // water, land, shore, etc, static
        "regionswater",       // connected water cells, static
        "regionsland",        // connected land cells, static
        "obstructions",       // where buildings can be placed, dynamic
        "obstacles",          // where units can move, dynamic
        "claims",             // reserved space in villages, dynamic
        "attacks",            // where attacks happened, w/ radius, dynamic
        "scanner",            // used by scouts to mark explored area
      ],

      length:        0,
      territory:     null,        // copy from API 
      passability:   null,        // copy from API 

    });

  };


  H.LIB.Map.prototype = H.mixin(
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Map,
    log: function(){
      this.deb();
      this.deb("   MAP: width: %s, height: %s, cellsize: %s, grid: %s, length: %s", 
        this.width, 
        this.height, 
        this.cellsize, 
        this.gridsize, 
        this.length
      );
      this.childs.forEach(child => this[child].log());

      this.effector.dumparray("passability", this.passability.data, this.gridsize, this.gridsize, 255);    
      this.effector.dumparray("territory",   this.territory.data,   this.gridsize, this.gridsize, 255);    
    },
    serialize: function(){
      var data = {};
      this.childs.forEach( child => {
        data[child] = this[child].serialize();
      });
      return data;
    },
    deserialize: function(data){
      if (data){
        this.childs.forEach( child => {
          if (this.context.data[this.name][child]){
            this[child] = new H.LIB.Grid(this.context)
              .import()
              .deserialize(data[child]);
          }
        });
      }
      this.territory   = this.context.territory;
      this.passability = this.context.passability;
      this.length      = this.passability.data.length;
      this.gridsize    = this.passability.width; // only squares here
    },
    initialize: function(){

      this.territory   = this.context.territory;
      this.passability = this.context.passability;
      this.length      = this.passability.data.length;
      this.gridsize    = this.passability.width; // only squares here

      // deb("   MAP: territory   size: %s", this.territory.width);
      // deb("   MAP: passability size: %s", this.passability.width);

      this.childs.forEach( child => {
        if (!this[child]){
          this[child] = new H.LIB.Grid(this.context)
            .import()
            .initialize({title: child, bits: "c8"});
          this.updateGrid(child);
        }
      });

      return this;

    },
    finalize: function(){

      var coords, field, test;

      coords = this.mapPosToGridCoords(this.entities[this.villages.main].position());

      this.deb("   MAP: finalize: terrain coords: %s, size: %s, length: %s", coords, this.terrain.size, this.terrain.length);
      this.deb("   MAP: finalize: land    coords: %s, size: %s, length: %s", coords, this.regionsland.size, this.regionsland.length);

      [field, test] = H.AI.FlowField.create(this.terrain, this.regionsland, coords);
      // this.flowfield = H.AI.FlowField.create(this.terrain, this.regionsland, coords);

      this.effector.dumparray("flowfield", field, this.gridsize, this.gridsize, 255);
      this.effector.dumparray("test", test, this.gridsize, this.gridsize, 255);

    },
    activate: function(){

      this.events.on("Attack", msg => {

      });

    },
    tick: function(tick, secs){

      var t0 = Date.now();

      this.territory   = this.context.territory;
      this.passability = this.context.passability;

      return Date.now() - t0;


    /*#########################################################################
    
      simple map infos, calculations and converters

    */

    }, center: function(){

      return [this.width/2, this.height/2];

    }, mapPosToGridCoords: function(pos, grid){

      var cellsize = grid ? grid.cellsize : this.cellsize;
      return [~~(pos[0] / cellsize), ~~(pos[1] / cellsize)];

    }, mapPosToGridIndex: function(pos, grid){

      var 
        size = grid && grid.size ? grid.size : this.gridsize,
        [x, y] = this.mapPosToGridCoords(pos);
      
      return x + y * size;

    }, distance: function(a, b){

      // distance between 2 positions

      if (!a.length || !b.length || a.length !== 2 || b.length !== 2){
        H.throw("ERROR : map.distance wrong args: ", uneval(arguments));
      }

      var dx = a[0] - b[0], dz = a[1] - b[1];
      return Math.sqrt(dx * dx + dz * dz);

    }, distanceTo: function(ids, pos){

      // distance of n entities to position

      var center = this.getCenterPos(ids);
      return this.distance(center, pos);

    }, nearestId: function(point, ids){

      // return closest id 

        var dis = 0.0, mindis = 1e10, result = NaN, pos = 0.0;

        ids.forEach(id => {
          pos = this.entities[id].position();
          dis = this.distance(point, pos);
          if ( dis < mindis ){
            mindis = dis; 
            result = id;
          } 
        });

        return result;

    }, getSpread: function(ids){

      // longest side of enclosing axis parallel rectangle 

      var 
        poss = ids.map(id => this.entities[id].position()),
        xs = poss.map(pos => pos[0]),
        zs = poss.map(pos => pos[1]),
        minx = Math.min.apply(Math, xs),
        minz = Math.min.apply(Math, zs),
        maxx = Math.max.apply(Math, xs),
        maxz = Math.max.apply(Math, zs);

      return Math.max(maxx - minx, maxz - minz);


    }, centerOf: function(poss){

      // center position of positions

      var out = [0, 0], len = poss.length;

      poss.forEach( pos => {
        out[0] += pos[0];
        out[1] += pos[1];
      });

      return [out[0] / len, out[1] / len];

    }, getCenter: function(ids){

      // center position of entities

      return this.centerOf ( 
        ids.filter(id => !!this.entities[id])
          .map(id => this.entities[id].position())
      );


    /*#########################################################################

      simple infos about positions or index

    */

    }, isOwnTerritory: function(pos){

      this.deb("   MAP: isOwnTerritory %s", uneval(arguments));

      var 
        index  = this.mapPosToGridIndex(pos, this.territory),
        player = this.territory.data[index] & TERRITORY_PLAYER_MASK;

      return player === this.context.id;

    }, isInOwnTerritory: function(id){

      var 
        pos    = this.entities[id]._entity.position,
        index  = this.mapPosToGridIndex(pos, this.territory),
        player = this.territory.data[index] & TERRITORY_PLAYER_MASK,
        result = player === this.context.id;

      // this.deb("   MAP: isInOwnTerritory %s => %s, player: %s", uneval(arguments), result, player);

      return result;

    }, isEnemyTerritory: function(pos){

      var 
        index  = this.mapPosToGridIndex(pos, this.territory),
        player = this.territory.data[index] & TERRITORY_PLAYER_MASK;

      return this.players.isEnemy[player];


    /*#########################################################################

      advanced computations on grids

    */


    }, fillCircle: function(grid, pos, radius, value){

      // fills a circle into grid with value
      
      var 
        z = 0|0, x = 0|0, idx = 0|0, 
        r = radius/grid.cellsize, rr = r * r,
        len = grid.length|0,
        size = grid.size|0,
        [cx, cz] = pos;

      // hints
      cx=cx|0; cz=cz|0; r=r|0; value=value|0; rr=rr|0;

      for(z =-r; z<=r; z++){
        for(x=-r; x<=r; x++){

          if(x * x + z * z <= rr){

            idx = (cx + x) + size * (cz + z);
            
            if (idx >= 0 && idx < len){
              grid[idx] = value;
            }

          }

        }
      }


    }, updateGrid: function(name){

      // intializes terrain, regionsland, regionswater

      var 
        t1, t0 = Date.now(), src, tgt, t, s, w = this.gridsize, h = w, i = w * h,
        terr, regl, regw, mask, counter = 0;

      if (name === "terrain"){

      // translates into internal terrain (land, water, forbidden, steep, error)

        src = this.passability.data;
        tgt = this.terrain.data;

        while(i--){s = src[i]; tgt[i] = (
                                                                  (s & 64)   ?   0 :   //     0, border
                         (s &  8) && !(s & 16)                && !(s & 64)   ?   4 :   //    32, land
            !(s & 4) && !(s &  8)                             && !(s & 64)   ?   8 :   //    64, shallow
             (s & 4) && !(s &  8) && !(s & 16)                && !(s & 64)   ?  16 :   //    92, mixed
                                      (s & 16)  && !(s & 32)  && !(s & 64)   ?  32 :   //   128, deep water
             (s & 4) &&               (s & 16)  &&  (s & 32)  && !(s & 64)   ?  64 :   //   192, steep land
               255                                                                     //   255, error
          );
        }
        t1 = Date.now();
        this.terrain.dump("init", 255);
        // deb("   MAP: updated: terrain, ms: %s", t1 - t0);


      } else if (name === "regionsland") {

        // detects unconnected land regions

        mask = 16 + 8 + 4;
        terr = this.terrain.data;
        regl = this.regionsland.data;

        while (i--) {
          s = terr[i]; t = regl[i];
          if (t === 0 && ( s & mask) ) {
            this.fillRegion(terr, regl, mask, i, ++counter);
          }
        }

        t1 = Date.now();
        this.regionsland.dump("init", 255);
        // deb("   MAP: updated: regionsland, ms: %s, regions: %s", counter, t1 - t0);


      } else if (name === "regionswater") {

        mask = 16 + 32;
        terr = this.terrain.data;
        regw = this.regionswater.data;

        while (i--) {
          s = terr[i]; t = regw[i];
          if (t === 0 && ( s & mask) ) {
            this.fillRegion(terr, regw, mask, i, ++counter);
          }
        }

        t1 = Date.now();
        this.regionswater.dump("init", 255);
        // deb("   MAP: updated: regionswater, ms: %s, regions: %s", counter, t1 - t0);


      } else {
        // deb("   MAP: initGrid: unknown grid: %s", name);
        
      }

    }, fillRegion: function(src, tgt, mask, index, region){

      // flood fills tgt starting at index with region based on src and mask
      // used by land water regions grids
      // avoids push/pop, bc slow

      var 
        width = this.gridsize,
        i, idx, nextX, nextY,
        y = ~~(index / width) | 0,
        x = index % width | 0,
        stack = [x, y], pointer = 2, 
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


    }, scan: function(pos, radius){

      // scans the map for treasure and mines
      // reports findings to context.resources
      // marks covered cells in scanner grid based on radius and position
      // returns up to 4 new positions to scan, aligned to villages.theta

      this.resources.markFound(pos, radius);



    /*#########################################################################

      TODO: rewrite

    */

    }, createTerritoryMap: function() {
      var map = new H.API.Map(H.Bot.gameState.sharedScript, H.Bot.gameState.ai.territoryMap.data);
      map.getOwner      = function(p) {return this.point(p) & TERRITORY_PLAYER_MASK;};
      map.getOwnerIndex = function(p) {return this.map[p]   & TERRITORY_PLAYER_MASK;};
      return map;
    },

    createObstructionMap: function(accessIndex, template){

      var 
        // gs = H.Bot.gameState, PID = H.Bot.id, 
        gs = this.context.gamestate, PID = this.id, 
        tilePlayer, 
        x, y, z, pos, i, okay = false,
        ix1, ix2, ix3, ix4,
        passabilityMap   = gs.getMap(),
        pmData           = passabilityMap.data,
        pmDataLen        = passabilityMap.data.length,
        maskBldShore     = gs.getPassabilityClassMask("building-shore"),
        maskDefault      = gs.getPassabilityClassMask("default"),
        territoryMap     = gs.ai.territoryMap,
        obstructionTiles = new Uint8Array(pmDataLen),
        getRegionSizei   = gs.ai.accessibility.getRegionSizei,
        placementType    = !template ? "land" : template.buildPlacementType(),
        buildOwn         = !template ? true   : template.hasBuildTerritory("own"),
        buildAlly        = !template ? true   : template.hasBuildTerritory("ally"),
        buildNeutral     = !template ? true   : template.hasBuildTerritory("neutral"),
        buildEnemy       = !template ? false  : template.hasBuildTerritory("enemy"),
        obstructionMask  = gs.getPassabilityClassMask("foundationObstruction") | gs.getPassabilityClassMask("building-land"),
        available = 0,
        radius = 3, xx, yy, id,
        invalidTerritory, tileAccessible = true,
        map, minDist, category;

      
      if (placementType === "shore"){

        // TODO: this won't change much, should be cached, it's slow.

        for (x = 0; x < passabilityMap.width; ++x){
          for (y = 0; y < passabilityMap.height; ++y){

            i = x + y * passabilityMap.width;
            tilePlayer = (territoryMap.data[i] & TERRITORY_PLAYER_MASK);
            
            // myIndex ??
            if (gs.ai.myIndex !== gs.ai.accessibility.landPassMap[i] || 
                gs.isPlayerEnemy(tilePlayer) && tilePlayer !== 0 || 
                (pmData[i] & (maskBldShore | maskDefault))){
              obstructionTiles[i] = 0;
              continue;            
            }

            okay = false;

            [[0,1], [1,1], [1,0], [1,-1], [0,-1], [-1,-1], [-1,0], [-1,1]].forEach(function(entry){

              ix1 = x + entry[0]     + (y + entry[1]    ) * passabilityMap.width;
              ix2 = x + entry[0] * 2 + (y + entry[1] * 2) * passabilityMap.width;
              ix3 = x + entry[0] * 3 + (y + entry[1] * 3) * passabilityMap.width;
              ix4 = x + entry[0] * 4 + (y + entry[1] * 4) * passabilityMap.width;
              
              if ((pmData[ix1] & maskDefault) && getRegionSizei(ix1, true) > 500 || 
                  (pmData[ix2] & maskDefault) && getRegionSizei(ix2, true) > 500 || 
                  (pmData[ix3] & maskDefault) && getRegionSizei(ix3, true) > 500 || 
                  (pmData[ix4] & maskDefault) && getRegionSizei(ix4, true) > 500){
                if (available < 2){
                  available++;
                } else {
                  okay = true;
                }
              }

            });

            // checking for accessibility: if a neighbor is inaccessible, this is too. 
            // If it's not on the same "accessible map" as us, we crash-i~u.

            for (xx = -radius; xx <= radius; xx++){
              for (yy = -radius; yy <= radius; yy++){
                id = x + xx + (y + yy) * passabilityMap.width;
                if (id > 0 && id < pmDataLen){
                  if (gs.ai.terrainAnalyzer.map[id] ===  0 || 
                      gs.ai.terrainAnalyzer.map[id] === 30 || 
                      gs.ai.terrainAnalyzer.map[id] === 40){
                    okay = false;
                  }
                }
              }
            }
            obstructionTiles[i] = okay ? 255 : 0;
          }
        }

      // not shore
      } else {
        
        for (i = 0; i < pmDataLen; ++i){

          tilePlayer = (territoryMap.data[i] & TERRITORY_PLAYER_MASK);
          invalidTerritory = (
            (!buildOwn     && tilePlayer === PID) ||
            (!buildAlly    && gs.isPlayerAlly(tilePlayer)  && tilePlayer !== PID) ||
            (!buildNeutral && tilePlayer ===   0) ||
            (!buildEnemy   && gs.isPlayerEnemy(tilePlayer) && tilePlayer !== 0)
          );

          if (accessIndex){
            tileAccessible = (accessIndex === gs.ai.accessibility.landPassMap[i]);
          }
          if (placementType === "shore"){
            tileAccessible = true; //??
          }
          obstructionTiles[i] = (
            (!tileAccessible || invalidTerritory || (passabilityMap.data[i] & obstructionMask)) ? 0 : 255
          );

        }
      }
      
      map = new H.API.Map(gs.sharedScript, obstructionTiles);
      map.setMaxVal(255);
      
      if (template && template.buildDistance()){
        minDist  = template.buildDistance().MinDistance;
        category = template.buildDistance().FromCategory;
        if (minDist !== undefined && category !== undefined){
          gs.getOwnEntities().forEach(function(ent) {
            if (ent.buildCategory() === category && ent.position()){
              pos = ent.position();
              x = Math.round(pos[0] / gs.cellSize);
              z = Math.round(pos[1] / gs.cellSize);
              map.addInfluence(x, z, minDist / gs.cellSize, -255, "constant");
            }
          });
        }
      }

      return map;

    },
    findGoodPosition: function(tpl, position, angle) {

      var x, z, j, len, value, bestIdx, bestVal, bestTile, secondBest, 
          // gs       = H.Bot.gameState,
          gs       = this.context.gamestate,
          // cellSize = gs.cellSize,
          cellSize = this.cellsize,
          template = gs.getTemplate(tpl),
          // template = this.templates[tpl],
          // obstructionMap   = H.Map.createObstructionMap(0, template),
          obstructionMap   = this.createObstructionMap(0, template),
          // friendlyTiles    = new H.API.Map(gs.sharedScript),
          friendlyTiles    = new H.API.Map(this.context.sharedscript),
          alreadyHasHouses = false,
          radius = 0,
          result;
      
      angle  = angle === undefined ? H.Config.angle : angle;

      // this.deb("   MAP: findGoodPosition.in: pos: %s, tpl: %s", position.map(c => c.toFixed(1)), tpl);
      
      // obstructionMap.dumpIm(template.buildCategory() + "_obstructions_pre.png");

      if (template.buildCategory() !== "Dock"){obstructionMap.expandInfluences();}

      // obstructionMap.dumpIm(template.buildCategory() + "_obstructions.png");

      // Compute each tile's closeness to friendly structures:

      // If a position was specified then place the building as close to it as possible
      
      if (position) {
        x = ~~(position[0] / cellSize);
        z = ~~(position[1] / cellSize);
        friendlyTiles.addInfluence(x, z, 255);

      } else {
        
        // No position was specified so try and find a sensible place to build
        // if (this.metadata && this.metadata.base !== undefined)
        //   for each (var px in gameState.ai.HQ.baseManagers[this.metadata.base].territoryIndices)
        //     friendlyTiles.map[px] = 20;

        gs.getOwnStructures().forEach(function(ent){

          var pos = ent.position(),
              x = Math.round(pos[0] / cellSize),
              z = Math.round(pos[1] / cellSize);

          if (template.hasClass("Field") && 
              ent.resourceDropsiteTypes() && 
              ent.resourceDropsiteTypes().indexOf("food") !== -1){
            friendlyTiles.addInfluence(x, z, 20, 50);

          } else if (template.hasClass("House") && ent.hasClass("House")) {
            friendlyTiles.addInfluence(x, z, 15, 40);  // houses are close to other houses
            alreadyHasHouses = true;

          } else if (template.hasClass("House")) {
            friendlyTiles.addInfluence(x, z, 15, -40); // and further away from other stuffs

          } else if (template.hasClass("Farmstead")) {
            // move farmsteads away to make room.
            friendlyTiles.addInfluence(x, z, 25, -25);

          } else if (template.hasClass("GarrisonFortress") && ent.genericName() === "House"){
            friendlyTiles.addInfluence(x, z, 30, -50);

          } else if (template.hasClass("Military")) {
            friendlyTiles.addInfluence(x, z, 10, -40);

          } else if (ent.hasClass("CivCentre")) {
            // If this is not a field add a negative influence near the CivCentre because we want to leave this
            // area for fields.
            friendlyTiles.addInfluence(x, z, 20, -20);

          } else {
            this.deb("WARNING: no influence for: %s", tpl);
          }

        });

        if (template.hasClass("Farmstead")){
          len = gs.sharedScript.resourceMaps["wood"].map.length;
          for (j = 0; j < len; ++j){
            value = friendlyTiles.map[j] - (gs.sharedScript.resourceMaps["wood"].map[j]) / 3;
            friendlyTiles.map[j] = value >= 0 ? value : 0;
          }
        }

        // if (this.metadata && this.metadata.base !== undefined)
        //   for (var base in gameState.ai.HQ.baseManagers)
        //     if (base != this.metadata.base)
        //       for (var j in gameState.ai.HQ.baseManagers[base].territoryIndices)
        //         friendlyTiles.map[gameState.ai.HQ.baseManagers[base].territoryIndices[j]] = 0;
      }
      

      // friendlyTiles.dumpIm(template.buildCategory() + "_" + gs.getTimeElapsed() + ".png", 200);
      
      // Find target building's approximate obstruction radius, and expand by a bit to make sure we're not too close, this
      // allows room for units to walk between buildings.
      // note: not for houses and dropsites who ought to be closer to either each other or a resource.
      // also not for fields who can be stacked quite a bit

      radius = (
        template.hasClass("GarrisonFortress") ? ~~(template.obstructionRadius() / cellSize) + 2 :
        template.buildCategory() === "Dock" ? 1 :
        template.resourceDropsiteTypes() === undefined ? ~~(template.obstructionRadius() / cellSize) + 2 :
        Math.ceil(template.obstructionRadius() / cellSize)
      );

      // this.deb("   MAP: findGoodPosition radius %s", radius);
      
      // further contract cause walls
      // Note: I'm currently destroying them so that doesn't matter.
      //if (gameState.playerData.civ == "iber")
      //  radius *= 0.95;

      // Find the best non-obstructed
      if (template.hasClass("House") && !alreadyHasHouses) {
        // try to get some space first
        bestTile = friendlyTiles.findBestTile(10, obstructionMap);
        bestIdx = bestTile[0];
        bestVal = bestTile[1];
      }
      
      if (bestVal === undefined || bestVal === -1) {
        bestTile = friendlyTiles.findBestTile(radius, obstructionMap);
        bestIdx  = bestTile[0];
        bestVal  = bestTile[1];
      }

      if (bestVal === -1) {
        this.deb("   MAP: findGoodPosition.out: pos: %s, tpl: %s", [x, z].map(c => c.toFixed(1)), tpl);
        return false;
      }

      // this.deb("   MAP: findGoodPosition: tile: %s, idx: %s, val: %s, fwidth: %s, cs: %s", 
      //   bestTile, 
      //   bestIdx, 
      //   bestVal, 
      //   friendlyTiles.width,
      //   cellSize
      // );
      
      //friendlyTiles.setInfluence((bestIdx % friendlyTiles.width), Math.floor(bestIdx / friendlyTiles.width), 1, 200);
      //friendlyTiles.dumpIm(template.buildCategory() + "_" +gameState.getTimeElapsed() + ".png", 200);

      x = ((bestIdx % friendlyTiles.width) + 0.5) * cellSize;
      z = (Math.floor(bestIdx / friendlyTiles.width) + 0.5) * cellSize;

      if (template.hasClass("House") || 
          template.hasClass("Field") || 
          template.resourceDropsiteTypes() !== undefined){
        secondBest = obstructionMap.findLowestNeighbor(x, z);
      } else {
        secondBest = [x,z];
      }

      // deb("   MAP: findGoodPosition.out: pos: %s, tpl: %s", [x, z].map(c => c.toFixed(1)), tpl);



      result = {
        "x" : x,
        "z" : z,
        "angle" : angle,
        "xx" : secondBest[0],
        "zz" : secondBest[1]
      };

      // this.deb("   MAP: findGoodPosition: res: %s", uneval(result));

      return result;

    }
  
  });


return H; }(HANNIBAL));


// for (a of Object.getOwnPropertyNames(Math)){console.log(a)}

// "toSource"
// "abs"
// "acos"
// "asin"
// "atan"
// "atan2"
// "ceil"
// "cos"
// "exp"
// "floor"
// "imul"
// "fround"
// "log"
// "max"
// "min"
// "pow"
// "random"
// "round"
// "sin"
// "sqrt"
// "tan"
// "log10"
// "log2"
// "log1p"
// "expm1"
// "cosh"
// "sinh"
// "tanh"
// "acosh"
// "asinh"
// "atanh"
// "hypot"
// "trunc"
// "sign"
// "cbrt"
// "E"
// "LOG2E"
// "LOG10E"
// "LN2"
// "LN10"
// "PI"
// "SQRT2"
// "SQRT1_2"

// H.Map.createTerritoryMap = function() {
//   var map = new H.API.Map(H.Bot.gameState.sharedScript, H.Bot.gameState.ai.territoryMap.data);
//   map.getOwner      = function(p) {return this.point(p) & TERRITORY_PLAYER_MASK;};
//   map.getOwnerIndex = function(p) {return this.map[p]   & TERRITORY_PLAYER_MASK;};
//   return map;
// };

// H.Map.gamePosToMapPos = function(p){
//   return [~~(p[0] / H.Map.cellsize), ~~(p[1] / H.Map.cellsize)];
// };

// H.Map.mapPosToGridPos = function(p){
//   var [x, y] = H.Map.gamePosToMapPos(p);
//   return x + y * H.Map.width;
// };

// H.Map.distance = function(a, b){
//   var dx = a[0] - b[0], dz = a[1] - b[1];
//   return Math.sqrt(dx * dx + dz * dz);
//   // return Math.hypot(a[0] - b[0], a[1] - b[1]);
// };

// H.Map.nearest = function(point, ids){

//   // deb("   MAP: nearest: target: %s, ids: %s", point, ids);

//   var distance = 1e10, dis, result = 0, pos = 0.0;

//   ids.forEach(id => {
//     pos = H.Entities[id].position();
//     dis = H.Map.distance(point, pos);
//     if ( dis < distance){
//       distance = dis; result = id;
//     } 
//   });

//   return result;

// };
// H.Map.spread = function(ids){
//   var poss = ids.map(id => H.Entities[id].position()),
//       xs = poss.map(pos => pos[0]),
//       zs = poss.map(pos => pos[1]),
//       minx = Math.max.apply(Math, xs),
//       minz = Math.max.apply(Math, zs),
//       maxx = Math.max.apply(Math, xs),
//       maxz = Math.max.apply(Math, zs),
//       disx = maxx - minx,
//       disz = maxz - minz;
//   return Math.max(disx, disz);
// };
// H.Map.centerOf = function(poss){
//   // deb("   MAP: centerOf.in %s", pritShort(poss));
//   var out = [0, 0], len = poss.length;
//   poss.forEach(function(pos){
//     if (pos.length){
//       out[0] += pos[0];
//       out[1] += pos[1];
//     } else { 
//       len -= 1;
//     }
//   });
//   return [out[0] / len, out[1] / len];
// };

// H.Map.getCenter = function(entids){

//   // deb("   MAP: getCenter: %s", H.prettify(entids));

//   if (!entids || entids.length === 0){
//     throw new Error("getCenter with unusable param");
//     return deb("ERROR : MAP getCenter with unusable param: %s", entids);

//   } else if (entids.length === 1){
//     if (!H.Entities[entids[0]]){
//       return deb("ERROR : MAP getCenter with unusable id: %s, %s", prit(entids[0]), prit(entids));
//     } else {
//       return H.Entities[entids[0]].position();
//     }

//   } else {
//     return H.Map.centerOf(entids.map(function(id){return H.Entities[id].position();}));

//   }

// };

// H.Map.isOwnTerritory = function(pos){
//   var index  = H.Map.mapPosToGridPos(pos),
//       player = H.Grids.territory.data[index] & TERRITORY_PLAYER_MASK;
//   return player === H.Bot.id;
// };

// H.Map.isEnemyTerritory = function(pos){
//   var index  = H.Map.mapPosToGridPos(pos),
//       player = H.Grids.territory.data[index] & TERRITORY_PLAYER_MASK;
//   return H.GameState.playerData.isEnemy[player];
// };/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- M I L I T A R Y ---------------------------------------------

  knows about buildings and attack plans
  

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/


HANNIBAL = (function(H){


  H.LIB.Military = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "events",
      ],

    });

  };

  H.LIB.Military.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Military,
    log: function(){this.deb();this.deb("   MIL: all good");},
    deserialize: function(){
      if (this.context.data[this.name]){
        H.extend(this, this.context.data[this.name]);
      }
    },
    serialize: function(){
      return {};
    },
    activate: function(){

      this.events.on("EntityAttacked", "*", function (msg){

      });

    },
    tick: function(tick, secs){

      var t0 = Date.now();


      return Date.now() - t0;

    },
    getPhaseNecessities: function(options){ // phase, centre, tick
      
      var 
        cls = H.class2name,
        cc = options.centre,

        technologies = [],
        messages = {
          "phase.village": [
            [  20, {name: "BroadCast", data: {group: "g.builder", cc: cc, size: 5, building: cls("baracks"), quantity: 2}}],
          ],
          "phase.town" :   [

          ],
          "phase.city" :   [

          ],
        },
        launches = {

          "phase.village": [
          //   tck,                  act, params
            [  16, 1, "g.builder",    {cc: cc, size: 5, building: cls("barracks"), quantity: 1}],
          ],

          "phase.town" :   [
            [  20, 1, "g.builder",    {cc: cc, size: 5, building: cls("temple"), quantity: 1}],
            // [  20, [1, "g.tower",      {cc: cc, size: 5, quantity: 1}]],

          ],

          "phase.city" :   [

          ],

        };

      return {
        launches: launches,
        technologies: technologies,
        messages: messages,
      };

    },

  });

return H; }(HANNIBAL));  
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

    // x: Math.cos(angle) * (pointX-originX) - Math.sin(angle) * (pointY-originY) + originX,
    // y: Math.sin(angle) * (pointX-originX) + Math.cos(angle) * (pointY-originY) + originY

  function loop (n, fn){for (var i=0; i<n; i++){fn(i);}}
  function rotatedPoint(pnt, org, sin, cos){
    return [
      cos * (pnt[0] - org[0]) - sin * (pnt[1] - org[1]) + pnt[0],
      sin * (pnt[0] - org[0]) + cos * (pnt[1] - org[1]) + pnt[1]
    ];
  }

  H.LIB.Path = function(context, definition){

    // quick serializer init
    this.klass = "path";
    this.context = context;
    this.imports = ["map", "villages"];
    this.import();

    this.deb("  PATH: new def: %s", definition);

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
          .split("{").join("")
          .split("}").join("")
          .split(",").join("")
          .split("[").join("")
          .split("]").join("")
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

      this.log("modify.in");

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

      this.log("modify.out");

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

      this.log("translate.in");

      loop(p.length, n => {
        p[n] = [ p[n][0] + x, p[n][1] + z ];
      });

      this.log("translate.out");

    },
    translatep: function(angle, radius){

      var
        p    = this.path,
        rads = angle * RADDEG + this.theta,
        sinr = sin(rads),
        cosr = cos(rads);

      // displaces all point in polar system

      this.log("translatep.in");

      loop(p.length, n => {
        p[n] = [ 
          p[n][0] + radius * cosr, 
          p[n][1] + radius * sinr 
        ];
      });

      this.log("translatep.out");

    },
    rotate: function(angle){

      // rotates path counter clockwise around its center by angle (degrees)

      var 
        p    = this.path,
        org  = this.getCenter(),
        rads = angle * RADDEG,
        sinr = sin(rads),
        cosr = cos(rads);

      loop(p.length, n => {
        p[n] = [
          cosr * (p[n][0] - org[0]) - sinr * (p[n][1] - org[1]) + p[n][0],
          sinr * (p[n][0] - org[0]) + cosr * (p[n][1] - org[1]) + p[n][1]
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
/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval, logObject */

/*--------------- R E S O U R C E S  ------------------------------------------

  handles a group's economic resources like estate, units, techs, buildings.
  provides the semantics for the DSL used in plugins


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/

HANNIBAL = (function(H){

  /*
    treasure  
    wood.tree  
    wood.ruins  
    stone.ruins  
    stone.rock  
    metal.ore  
    food.meat  
    food.grain  
    food.fruit  
    food.fish

    API uses: resourceSupplyMax, resourceSupplyType, resourceSupplyAmount, _template, owner

  */


  function Resource(pid, data){

    //TODO remove API access, owner, template.Identity, resourceSupplyMax

    H.extend(this, {
      klass:    "resource",
      found:    false,
      consumed: false,
    }, data);

    if (!this.entities || !this.map){
      logObject(this);
    }

    this.deb = H.deb.bind(null, pid);

  }

  Resource.prototype = {
    constructor: Resource,
    log: function(){
      var t = this;
      this.deb("   RES: %s, %s, type: %s/%s, pos: %s, owner: %s, found: %s",
        t.id, t.supply, t.generic, t.specific, t.position.map(c => ~~c), t.owner, t.found
      );
    },
    toString: function(){
      return H.format("[%s %s]", this.klass, this.name);
    },
    serialize: function(){
      return {
        id: this.id,
        found: this.found,
        consumed: this.consumed,
      };
    },
    initialize: function(){

      var tpl, specficname, ent = this.entities[this.id];

      if (ent){

        tpl  = ent._template;
        specficname = (tpl.Identity && tpl.Identity.SpecificName) ? tpl.Identity.SpecificName.toLowerCase() : "unknown";

        H.extend(this, {
          name:      (this.generic + "." + this.specific + "#" + this.id).toLowerCase(),
          owner:     ent.owner(),
          position:  ent.position(),
          resources: [this.id],   // make asset gatherable
          isPrey:    this.config.data.prey.indexOf(specficname) !== -1,
          maxSupply: ent.resourceSupplyMax(),
          // found:     this.found ? true : this.map.isOwnTerritory(ent.position()) ? true : false,
          found:     this.found ? true : this.map.isInOwnTerritory(this.id) ? true : false,
          supply:    ent.resourceSupplyAmount(),
        });

      } else {
        this.consumed = true;
        this.deb("   RES: res with id: '%s' was consumed, no entity", this.id);

      }

      return this;

    },
  };


  H.LIB.Resources = function(context){

    var stats = {entities: 0, found: 0, available: 0, total: 0, consumed: 0, depleted: 0};

    H.extend(this, {

      context:  context,

      imports:  [
        "map",
        "config",
        "groups",
        "entities",
      ],

      resources: null,

      template: {
        food:  {
          meat:  {stats: H.deepcopy(stats)},
          grain: {stats: H.deepcopy(stats)},
          fruit: {stats: H.deepcopy(stats)},
          fish:  {stats: H.deepcopy(stats)},
          whale: {stats: H.deepcopy(stats)},
        },
        wood:  {
          tree:  {stats: H.deepcopy(stats)},
          ruins: {stats: H.deepcopy(stats)},
        },
        metal: {
          ore:   {stats: H.deepcopy(stats)},
        },
        stone: {
          ruins: {stats: H.deepcopy(stats)},
          rock:  {stats: H.deepcopy(stats)},
        },
        treasure: {
          food:  {stats: H.deepcopy(stats)},
          wood:  {stats: H.deepcopy(stats)},
          stone: {stats: H.deepcopy(stats)},
          metal: {stats: H.deepcopy(stats)},
        },
      },
    
    }); 

  };

  H.LIB.Resources.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Resources,
    log: function(){
      var 
        tab = H.tab, type, msg = "",
        head   = "ents,     found, avail, total, depl, cons".split(", "),
        props  = "entities, found, available, total, depleted, consumed".split(", "),
        tabs   = [   6,     6,    8,    8,    6,    8];  

      // header
      H.zip(head, tabs, (h, t) => msg += tab(h, t));
      this.deb();
      this.deb("  RESS:                " + msg);

      // lines
      this.eachStats( (generic, specific, stats) => {
        msg = "";
        H.zip(props, tabs, (p, t) => msg += tab(stats[p], t));    
        type = H.tab(generic + "." + specific, 13);
        this.deb("     R: %s: %s", type, msg);
      });

    },
    serialize: function(){
      var data = {};
      this.eachAll((generic, specific, stats, id, res) => {
        if (!data[generic]){data[generic] = {};}
        if (!data[generic][specific]){data[generic][specific] = {};}
        if (!data[generic][specific].stats){data[generic][specific].stats = H.deepcopy(stats);}
        data[generic][specific][id] = res.serialize();
      });
      return data;
    },
    deserialize: function(){
      if (this.context.data[this.name]){
        this.resources = this.context.data[this.name];
        this.eachAll((generic, specific, stats, id, res) => {
          this.resources[generic][specific][id] = new Resource(this.context.id, H.mixin(res, {
            map:      this.map,
            config:   this.config,
            context:  this.context,
            generic:  generic,
            specific: specific,
            entities: this.entities,
          })).initialize();
        });
      }
    },
    initialize: function(){

      var res, type, counter = 0, t0 = Date.now();

      // deb();deb();deb("   RES: init -----------");

      if (!this.resources){

        this.resources = this.template;

        H.each(this.entities, (id, ent) => {
          
          if ((type = ent.resourceSupplyType())){ // returns { "generic": type, "specific": subtype };
            //TODO: whales
            if (this.resources[type.generic][type.specific]){
              counter += 1;
              res = this.resources[type.generic][type.specific][ent.id()] = new Resource(this.context.id, {
                id:       ~~id, 
                map:      this.map,
                config:   this.config,
                context:  this.context,
                generic:  type.generic,
                specific: type.specific,
                entities: this.entities,
              }).initialize();

            } else {
              this.deb("ERROR : unknown resource type %s %s %s", type.generic, type.specific, ent._templateName);
            }

          }

        });

        this.eachAll((generic, specific, stats, id, res) => {

          if (this.entities[id] && !res.consumed){
            stats.entities  += 1;
            stats.found     += res.found ? 1 : 0;
            stats.available += res.found ? res.supply : 0;
            stats.total     += res.supply;
          } else if (!this.entities[id] && !res.consumed){
            res.consumed   = true;
            stats.consumed += res.supply;
            stats.depleted += 1;
          }

        });

      }

      // deb("     R: found %s, %s msecs", counter, Date.now() - t0);

    },
    activate: function(){},
    find: function(order){

      // return array of resource ids, sorted
      // ,amount,cc,location,verb,hcq,source,shared,id,processing,remaining,product,x,z,nodes

      var 
        asset  = this.groups.findAsset(asset => asset.id === order.source),
        result = this.nearest(order.location, order.hcq)
          .slice(0, order.amount)
          .map(res => res.id);

      this.deb("  RESS: find: %s, res: %s, loc: %s, from: %s || result: %s", 
        order.amount, 
        order.hcq, 
        order.location, 
        asset,
        result
      );

      return result;

    },
    availability: function( /* arguments */ ){

        var 
          types = H.toArray(arguments), 
          res = {food: 0, wood: 0, stone: 0, metal: 0};

        types.forEach(type => this.eachType(type, (generic, specific, id, resource) => {
          resource.update();
          if (resource.found){
            if (generic === "treasure"){
              res[specific] += resource.supply;              
            } else {
              res[generic] += resource.supply;
            }
          }
        }));

        return res;

    },
    eachType: function(type, fn){

      var 
        types     = type.split("."),
        generic   = types[0],
        specific  = types[1] || "",
        resources = this.resources;

      if (resources[generic] && specific === ""){

        H.each(resources[generic], (specific, specentry) => {
          H.each(specentry, (id, resource) => {
            if (id !== "stats"){
              fn(generic, specific, id, resource);
            }
          });
        });

      } else if (resources[generic][specific]){

        H.each(resources[generic][specific], (id, resource) => {
          if (id !== "stats"){
            fn(generic, specific, id, resource);
          }
        });

      } else {
        this.deb("ERROR : res.each: type: '%s' unknown", type);

      }

    },
    eachAll: function(fn){

      H.each(this.resources, (generic, genentry) => {
        H.each(genentry, (specific, specentry) => {
          H.each(specentry, (id, resource) => {
            if (id !== "stats"){
              fn(generic, specific, specentry.stats, id, resource);
            }
          });
        });
      });

    },
    eachStats: function(fn){

      H.each(this.resources, (generic, genentry) => {
        H.each(genentry, (specific, specentry) => {
          fn(generic, specific, specentry.stats);
        });
      });

    },
    consume: function(ids){ //TODO
      this.eachAll( (generic, specific, stats, id, res) => {
        if (H.contains(ids, id)){
          res.consumed = true;
          stats.consumed += res.supply;
          stats.depleted += 1;
        }
      });
    },
    markFound: function(pos, radius){ //TODO: slow
      this.eachAll( (generic, specific, stats, id, res) => {
        if (this.map.distance(pos, res.position) < radius){
          res.found = true;
        }            
      });
    },
    nearest: function(pos, type){

      var t0 = Date.now(), t1, resources = [], kmeans, trees, cid;

      // deb("   RES: looking for nearest '%s' at %s", generic, pos);

      switch (type){

        // first without clustering
        case "stone":
        case "stone.ruin":
        case "stone.rock":
        case "metal":
        case "metal.ore":
        case "treasure":
        case "treasure.food":
        case "treasure.wood":
        case "treasure.metal":
        case "treasure.stone":
        case "food.fruit":
        case "food.grain": // done by harvester
        case "food.whale": // untested
        case "food.fish":  // untested
          this.eachType(type, (generic, specific, id, res) => {
            if (this.entities[id]){
              if (res.found && !res.consumed){
                resources.push(res);
              }
            } else { res.consumed = true; }
          });
        break;

        // same with prey check
        case "food.meat": 
          this.each(this.resources.food, (id, res) => {
            if (this.entities[id]){
              if (res.found && !res.consumed && res.isPrey){
                resources.push(res);
              }
            } else { res.consumed = true; }
          });
        break;

        // trees come in clusters
        case "wood":
        case "wood.ruins":
        case "wood.tree":

          trees = [];
        
          this.eachType(type, (generic, specific, id, res) => {
            if (this.entities[id]){
              if (res.found && !res.consumed){
                trees.push({x: res.position[0], z: res.position[1], id: id, res: res});
              }
            } else { res.consumed = true; }
          });
          
          if (trees.length){

            kmeans = new H.AI.KMeans();
            kmeans.k = 3; // map size !!!!
            kmeans.maxIterations = 50;
            kmeans.setPoints(trees);
            kmeans.initCentroids();
            kmeans.cluster();

            // get nearest cluster
            cid = kmeans.centroids
              .filter(c => c.items > 0)
              .sort((a, b) => {
                var da = (a.x - pos[0]) * (a.x - pos[0]) + (a.z - pos[1]) * (a.z - pos[1]),
                    db = (b.x - pos[0]) * (b.x - pos[0]) + (b.z - pos[1]) * (b.z - pos[1]);
                return da - db;
            })[0];

            // 
            resources = kmeans.centroids[cid].map(item => item.res);
            
            t1 = Date.now();

            // deb(H.attribs(trees[0].res));

            this.deb("   RES: kmeans: %s trees, %s cluster, chose cluster with %s trees, %s msecs", 
              trees.length, 
              kmeans.centroids.length, 
              kmeans.centroids[0].items,
              t1-t0
            );

          } else {
            this.deb("   RES: kmeans: 0 trees");
            resources = trees;

          }

        break;

        default: 
          this.deb("ERROR : RESS unknown resource type: %s in nearest", type);

      }

      // sort by distance to pos, nearest first
      resources.sort(function(a, b){
        var 
          dax = a.position[0] - pos[0],
          day = a.position[1] - pos[1],
          dbx = b.position[0] - pos[0],
          dby = b.position[1] - pos[1],
          da = dax * dax + day * day,
          db = dbx * dbx + dby * dby;
        return da < db ? 1 : -1;
      });

      this.deb("  RESS: nearest '%s': %s for %s", type, resources.length, H.fixed1(pos));

      return resources;

    },      
  
  });

return H; }(HANNIBAL));
/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- S C A N N E R -----------------------------------------------

  keeps track of visited map regions (land/water), provides list of points to scan 
  and scans around a point for mines, treasure, (not trees) etc.

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

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

/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, H, deb, uneval */

/*--------------- S I M U L A T O R  ------------------------------------------

  estimates the outcome of a set of group launches

  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  H.Simulation = function(context){
    H.extend(this, context, {
      techsAvailable: [],
      techsFeasable:  [],
      stackBuildings: [],
      groupIsBuilding: false,
      groupIsComplete: false,
      groupSizeBuilder: 0,
    });
    this.checker = new H.Checker(this);
  };

  H.Simulation.prototype = {
    constructor: H.Simulation,
    tick: function(){  
    },
    verbFromNodes: function (hcq){
      var self = this, verb = "";
      H.QRY(hcq).forEach(node => {
        if (!verb){
          verb = self.tree.nodes[node.name].verb;
        }
      });
      return verb;
    },
    evaluateTechnologies: function () {
      var result;
      this.techsAvailable = [];
      this.techsFeasable  = [];
      this.technologies
        .filter(tech => !H.contains(this.simulator.researchStarted, tech))
        .filter(tech => !H.contains(this.curstate.data.tech, tech))
        .forEach(tech => {
          result = this.checker.check(tech, false);
          if (result.available){
            this.techsAvailable.push(tech); 
          } if (result.feasible){
            this.techsFeasable.push(tech); 
          }
        });
    },
    appendTechOrders: function(techs, orders){
      techs.forEach(tech => {
        orders.push(new H.Order({
          amount:     1,
          verb:       "research", 
          cc:         this.centre,
          location:   null,
          hcq:        tech, 
          source:     this.source,
        }));
      });
    },
    // appendHouseOrders: function(tick, groups, orders){
      //   var ress = this.curstate.data.ress;
      //   if (ress.pop > ress.popcap - this.popuHouse -2){
      //     if (!this.curstate.groups["g.builder"]){
      //       groups.push("g.builder");
      //     }
      //     orders.push(new H.Order({
      //       amount:     1,
      //       verb:       "build", 
      //       cc:         this.centre,
      //       location:   null,
      //       hcq:        this.nameHouse, 
      //       source:     this.source,
      //     }));
      //     deb("     S: appendHouseOrders %s %s", 1, this.nameHouse);
      //   }
      // },
      // appendBuildingOrder: function(tick, building, amount, orders){

      //   if (!this.nextBuilding && !this.stackBuildings.length){
      //     orders.push(new H.Order({
      //       amount:     1,
      //       verb:       "build", 
      //       cc:         this.centre,
      //       location:   null,
      //       hcq:        building, 
      //       source:     "g.builder",
      //     }));
      //     amount -= 1;
      //   }

      //   H.loop(amount, () => {
      //     this.stackBuildings.push(new H.Order({
      //       amount:     1,
      //       verb:       "build", 
      //       cc:         this.centre,
      //       location:   null,
      //       hcq:        building, 
      //       source:     "g.builder",
      //     }));
      //   });

      //   if (this.nextBuilding){
      //     orders.push(this.nextBuilding);
      //     this.nextBuilding = null;
      //   }
      // },
    tryAppendPhaseOrder: function(orders, phase){
      if (this.checker.check(phase, false).available) {
        orders.push(new H.Order({
          amount:     1,
          verb:       "research", 
          cc:         this.centre,
          location:   null,
          hcq:        phase, 
          source:     "phase.order", 
        }));
        return true;
      }
      return false;
    },
    onBuildingFinished: function(){
      var order = this.stackBuildings.shift();
      deb("   SIM: finished: #%s %s from %s", order.id, order.hcq, order.source);
      if(this.stackBuildings.length){
        this.nextBuilding = this.stackBuildings[1];
      }
    },
    processMessage: function(message){

      var tick, msg;

      [tick, msg] = message;

      // simulates one builder group

      if (msg.name === "BroadCast" && msg.group === "g.builder"){
        stackBuildings.push(msg);
        if (!this.groupIsBuilding && this.groupComplete) {

        }

      } else {
        deb("   SIM: can't process msg: %s", uneval(msg));
      }


    },
    appendMessages: function(tick, source, target){

      source
        .filter(message => tick === message[0])
        .forEach(message => {
          target.push(message);
        });

    },
    appendLaunchOrders: function(tick, launches, groups, orders){

      // [   4,    1, "g.scouts",     {cc:cc, size: 5}],

      var verb, order, exclusives;

      launches
        .filter(launch => tick === launch[0])
        .forEach(launch => {

          var [junk, count, group, params] = launch;

          H.loop(count, () => {

            groups.push(group);

            if (group === "g.builder"){
              this.groupSizeBuilder = params.size;
              deb("     S: set buildersize to : %s", this.groupSizeBuilder);
            }

            exclusives = H.Groups.getExclusives(launch);

            H.each(exclusives, (name, params) => {
              var [amount, [type, hcq]] = params;
              verb   = this.verbFromNodes(hcq);
              order  = new H.Order({
                amount:     amount,
                verb:       verb, 
                cc:         params.cc,
                location:   null,
                hcq:        hcq, 
                source:     group, //self.source,
              });
              orders.push(order);
            });

          });

      });      

    }

  };

  H.Simulator = (function(){

    var self, tickActions = [];

    return {

      name: "simulator",
      context: null,
      simulation: null,
      tick: 0,
      researchStarted: [],
      phases: ["phase.village", "phase.town", "phase.city"],
      nextPhase : function (phase) {
        return self.phases[self.phases.indexOf(phase) +1];
      },
      log:  function(){},
      boot: function(){return (self = this);},
      generate: (function(){var counter = 0; return { get id () {return ++counter;} }; }()),
      triggers: (function(){
        var i, len, dels = [];
        return {
          add:  function(tick, action){
            action.tick = tick;
            tickActions.push(action);
          },
          tick: function(){
            dels = []; len = tickActions.length; 
            for (i=0; i<len; i++) {
              if(tickActions[i].tick <= self.tick){
                tickActions[i](); 
                dels.push(i);
              }
            }
            dels.forEach(i => tickActions.splice(i, 1));
          }
        };
      }()),

      economy: {
        
        stats: null, 
        producers: null,
        orderqueue: null,
        prioVerbs: ["research", "train", "build"],
        availability: ["food", "wood", "stone", "metal"],
        allocations: {food: 0, wood: 0, stone: 0, metal: 0, population: 0},

        do: function (verb, amount, order, node){

          var 
            curstate = self.context.curstate,  
            producers = self.economy.producers,
            data = curstate.data,
            time = H.QRY(node.name).first().costs.time;

          deb("   SDO: #%s %s, %s, %s, time: %s", H.tab(order.id, 3), verb, amount, node.name, time);

          H.Economy.subtract(node.costs, data.ress, amount);
          
          // update curstate
          if (verb === "train"){
            self.triggers.add(~~(self.tick + amount * time/1.6), () => {
              // deb("    ST: #%s %s %s", H.tab(order.id, 3), amount, node.name);
              data.ress.pop += amount;
              data.ents[node.name] = !data.ents[node.name] ? 1 : data.ents[node.name] +1;
              H.loop(amount, () => {producers.register(node.name + "#" + self.generate.id);});
              order.remaining  -= amount;
              order.processing -= amount;
            });

          } else if (verb === "build"){
            self.triggers.add(~~(self.tick + amount * time/1.6), () => {
              self.simulation.onBuildingFinished(order);
              data.ents[node.name] = !data.ents[node.name] ? 1 : data.ents[node.name] +1;
              if (node.name === self.context.nameHouse){
                data.ress.popcap += self.context.popuHouse;
              }
              H.loop(amount, () => {producers.register(node.name + "#" + self.generate.id);});
              order.remaining  -= amount;
              order.processing -= amount;
            });
          
          } else if (verb === "research"){
            self.researchStarted.push(node.name);
            self.triggers.add(~~(self.tick + amount * time/1.6), () => {
              data.tech.push(node.name);
              if (node.name.contains("phase") && node.name.contains("town")){
                data.tech.push("phase.town");
                self.context.curphase = "phase.town";
              } else if (node.name.contains("phase") && node.name.contains("city")) {
                data.tech.push("phase.city");
                self.context.curphase = "phase.city";
              } else {
                // deb("     S: not a phase: %s", node.name);
              }
              H.remove(self.researchStarted, node.name);
              order.remaining  -= amount;
              order.processing -= amount;
            });

          }

        }
      },
      
      simulate: function(context){  // phase, centre, tick, civ, budget, launches, technologies, tree
 
        var 
          msg, simulation, 
          canAdvance = false,
          exitSimulation = false,
          nextPhaseFired = false,
          lastPhase = "",
          curstate = context.curstate,
          tick = context.tick,
          tickPhase = context.tick,
          tickOrders = [], 
          tickMessages = [], 
          tickGroups = [], 
          stock = curstate.data.ress,
          launches = context.launches[context.phase],
          messages = context.messages[context.phase]
          ;

        deb();deb();deb(" SIMUL: start %s budget: %s", context.phase, uneval(stock));

        self.context = context;
        self.economy.stats = {stock: stock};
        simulation = self.simulation = new H.Simulation(H.mixin(context, {simulator: self}));

        // fake ingames for producers
        H.each(context.state.data.ents, (name, amount) => {
          H.loop(amount, () => {
            context.ingames.push({name: name + "#" + self.generate.id});
          });
        });

        self.orderqueue = new H.OrderQueue (H.mixin({}, context, {parent: self, economy: self.economy}));
        self.economy.producers = new H.Producers (H.mixin({}, context, {parent: self}));

        // append easy techs
        simulation.evaluateTechnologies();
        simulation.appendTechOrders(simulation.techsAvailable, tickOrders);

        deb();

        while (!exitSimulation) {

          // add groups and orders
          H.consume(tickGroups, g => curstate.groups[g] = !curstate.groups[g] ? 1 : curstate.groups[g] +1);
          H.consume(tickOrders, order => {
            order.economy = self.economy;
            self.orderqueue.append(order);
          });

          H.consume(tickMessages, message => {
            simulation.processMessage(message);
          });

          // debug
          if (self.orderqueue.processing){deb();}
          // msg = " SIMUL: @%s | %s phase: %s, orders: %s, groups: %s, actions: %s, processing: %s";
          // deb(msg, tick, tickPhase, context.curphase, tickOrders.length, tickGroups.length, tickActions.length, self.orderqueue.processing);
          msg = " SIMUL: @%s | %s phase: %s, q-length: %s, q-waiting: %s, tickactions: %s";
          deb(msg, tick, tickPhase, context.curphase, self.orderqueue.length, self.orderqueue.waiting, tickActions.length);


          // sort availability by stock
          self.economy.availability.sort((a, b) => stock[a] > stock[b] ? 1 : -1);

          // now process
          self.orderqueue.process(true, false);

          // phase changed
          if (lastPhase !== context.curphase){
            tickPhase = 0;
            nextPhaseFired = false;
            lastPhase = context.curphase;
            launches  = context.launches[context.curphase];
            messages  = context.messages[context.curphase];
          }

          // check messages
          simulation.appendMessages(tickPhase, messages, tickMessages);

          // check launches for group.orders
          simulation.appendLaunchOrders(tickPhase, launches, tickGroups, tickOrders);

          // check techs every 5
          if (tick % 5 === 0){
            simulation.evaluateTechnologies();
            simulation.appendTechOrders(simulation.techsAvailable, tickOrders);
          }

          // can advance to next phase (maxtick, etc),
          canAdvance = (
            tick % 5 === 0 &&
            !nextPhaseFired &&
            tickPhase > context.info.launches[context.curphase][2] &&
            tickPhase < context.info.messages[context.curphase][2] 
          );

          if (canAdvance){
            if (simulation.tryAppendPhaseOrder(tickOrders, self.nextPhase(context.curphase))){
              nextPhaseFired = true;
            } else {
              deb(" SIMUL: Next Phase failed: current: %s", context.curphase);
            }
          }

          // prolog
          tick += 1;
          tickPhase += 1;
          self.tick = tick;
          curstate.data.cost.time += 1.6;
          self.triggers.tick();

          exitSimulation = (
            tick > context.simticks &&
            !tickActions.length
          );

        }

        deb();
        deb(" SIMUL: DONE: %s", uneval(curstate.data.ress));
        deb(" SIMUL: DIFF: %s", uneval(H.Economy.diff(context.state.data.ress, stock)));
        

      },

    };

  }()).boot();

return H; }(HANNIBAL));     
/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- S T O R E  --------------------------------------------------

  A triple store with verbs, edges, nodes and a query language


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Store = function(context){

    H.extend(this, {

      context: context,

      imports: [
        "culture"
      ],

      verbs:    null,
      nodes:    null,
      edges:    null,

      capverbs:    null,
      keywords:   "DISTINCT, WITH, SORT, LIMIT, RAND".split(", "),

      cntNodes:    0,
      cntQueries:  0,

      cache:      {},
      cacheHit:    0,
      cacheMiss:   0,
      cacheSlots:  100,

    });

  };

  H.LIB.Store.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Store,
    log: function(){
      this.deb();
      this.deb(" STORE: %s verbs, %s nodes, %s edges", this.verbs.length, H.count(this.nodes), this.edges.length);
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    serialize: function(){
      var nodes = {};
      H.each(this.nodes, (name, node) => nodes[name] = this.culture.delNodeDynaProps(node));
      return {
        verbs: H.deepcopy(this.verbs),
        nodes: H.deepcopy(nodes),
        edges: this.edges.map(e => [e[0].name, e[1], e[2].name]),
      };
    },
    deserialize: function(data){
      this.verbs = data.verbs;
      this.nodes = data.nodes;
      this.edges = data.edges.map(e => [this.nodes[e[0]], e[1], this.nodes[e[2]]]);
      return this;
    },
    initialize: function(){
      if (!this.verbs){
        this.verbs    = this.culture.verbs;
        this.capverbs = this.culture.verbs.map(String.toUpperCase);
        this.nodes    = {};
        this.edges    = [];
      }
      return this;
    },
    finalize: function(){
      this.cntNodes = H.count(this.nodes);
    },
    addNode: function(node){
      if (!this.nodes[node.name]){
        this.nodes[node.name] = node;
        this.cntNodes += 1;
      } else {
        this.deb("WARN  : store.addNode: already exists in store: %s, %s ", this.name, node.name);
      }
    },
    delNode: function(name){  // TODO: speed up

      if (this.nodes[name]){
        H.delete(this.edges, edge => edge[0].name === name || edge[2].name === name);
        delete this.nodes[name];
        this.cntNodes -= 1;

      } else {
        this.deb("WARN  : store.delNode: can't delete '%s' unknown", name);
      }

    },
    addEdge: function(source, verb, target){
      if (!source)                      {this.deb("ERROR : addEdge: source not valid: %s", source);} 
      else if (!target)                 {this.deb("ERROR : addEdge: target not valid: %s", target);} 
      else if (!this.nodes[source.name]){this.deb("ERROR : addEdge: no source node for %s", source.name);}
      else if (!this.nodes[target.name]){this.deb("ERROR : addEdge: no target node for %s", target.name);}
      else if (this.verbs.indexOf(verb) === -1){this.deb("ERROR : not a verb %s, have: %s", verb, H.prettify(this.verbs));}
      else {
        this.edges.push([source, verb, target]);
      }
    },

  });

  H.LIB.Query = function(store, query){

    H.extend(this, {

      context: store.context,

      // timing
      t0:         Date.now(),
      t1:         0,

      results:    null,
      ops:        NaN,

      fromCache:  false,
      store:      store,
      verbs:      store.capverbs,
      keys:       store.keywords,
      params:     {deb: 0, max: 10, cmt: "no comment", fmt: ""},

    });

    this.query = this.sanitize(query);
    this.tree  = this.parse(this.query);

    this.store.cntQueries += 1;

  };

  H.LIB.Query.prototype = H.mixin (
    H.LIB.Serializer.prototype, {
    constructor: H.LIB.Query,
    logNodes: function (){
      var deb = this.params.deb;
      if (deb > 0 && this.fromCache){this.deb("     Q: %s recs from cache: %s", this.results.length, this.query);}
      if (deb > 0){this.deb("     Q: executed: msecs: %s, records: %s, ops: %s", this.t1, this.results.length, this.ops);}
      if (deb > 1){this.logResult(this.results, this.params.fmt, this.params.max);}
    },
    sanitize: function(phrase){
      phrase = H.replace(phrase, "\n", " ");
      phrase = H.replace(phrase, "\t", " ");
      phrase = H.replace(phrase, " ,", ",");
      return phrase.split(" ").filter(function(s){return !!s;}).join(" ");
    },

    parameter: function(params){
      // takes fmt, deb, max, cmt,      
      H.extend(this.params, params);
      return this;
    },
    count: function(){
      this.results = this.results || this.execute();
      return this.results.length;
    },
    first: function(){
      this.results = this.results || this.execute();
      return this.results.length ? this.results[0] : null;
    },
    filter: function(fn, that){
      this.results = this.results || this.execute();
      return this.results.filter(fn, that);
    },
    forEach: function(fn, that){
      this.results = this.results || this.execute();
      this.results.forEach(fn, that);
      return this.results;
    },
    map: function(fn, that){
      this.results = this.results || this.execute();
      return this.results.map(fn, that);
    },

    checkCache: function(){

      var 
        results = null, 
        check = (
          this.query.indexOf("INGAME") === -1 &&
          this.query.indexOf("TECHINGAME") === -1 &&
          !!this.store.cache[this.query]
      );

      if (check){
        results = this.store.cache[this.query].results;
        this.fromCache = true;
        this.store.cache[this.query].hits += 1;
        this.store.cacheHit += 1;

      } else {
        this.store.cacheMiss += 1;

      }

      return results;

    },

    isVerb: function (t){return this.verbs.indexOf(t) !== -1;},
    isKey: function (t){return this.keys.indexOf(t) !== -1;},
    isString : function (t){return typeof t === "string";},
    sample: function (a,n){
      var l=a.length; 
      return H.range(n||1).map(function(){return a[~~(H.Hannibal.entropy.random()*l)];});
    },

    get: function(node, dotlist){
      var p = dotlist.split("."), l = p.length;
      return  (
        l === 0 ? undefined :
        l === 1 && node[p[0]] !== undefined  ? node[p[0]] :
        l === 2 && node[p[0]] !== undefined && node[p[0]][p[1]] !== undefined ? node[p[0]][p[1]] : 
        l === 3 && node[p[0]] !== undefined && node[p[0]][p[1]] !== undefined && node[p[0]][p[1]][p[2]] !== undefined ? node[p[0]][p[1]][p[2]] : 
          undefined
      );
    },
    prepResults: function(results){
      Object.defineProperty(results, "stats", {
        enumerable:   false,
        configurable: false,
        writable:     true,
        value: {
          ops:     this.ops,
          msecs:   this.t1,
          length:  results.length,
          cached:  this.fromCache,
          hits:    this.store.cache[this.query].hits,
          nodes:   this.store.cntNodes,
          edges:   this.store.edges.length,
          verbs:   this.store.verbs.length
        }
      });
      return results;
    },

    parse: function(query){

      var 
        subClauses, out = [], error,
        verbs   = this.verbs,
        keys    = this.keys,
        clauses = this.partition([query], verbs),
        push = item => out.push(item);

      clauses.forEach( clause => {

        if (this.isString(clause) || clause.length === 1){

          push(clause);

        } else if (this.isVerb(clause[0])) {

          subClauses = this.partition([clause[1]], keys);

          if (this.isString(subClauses[0])) {
            push([clause[0]].concat(subClauses.shift()));
          } else {
            push([clause[0]]);
          }

          subClauses.forEach(push);

        } else {
          this.deb("ERROR :  store.parse: unknown keyword '%s' in clause: %s", clause, clause[0]);

        }

      });

      return error ? undefined : out;

    },
    execute: function(){

      var
        ops     = this.ops = 0,
        cacheDrop = "",
        self    = this,
        tree    = this.tree,

        edges   = this.store.edges,     //  = [source, verb, target]
        nodes   = this.store.nodes,     //  = {name:{}}
        cache   = this.store.cache,
        
        // returns always an array
        results = [],               

        // return strings without quotes
        parse =    v => {
          var f = parseFloat(v);
          return Array.isArray(v) ? v : isNaN(f) ? v.slice(1, -1) : f;
        };

      // Cached ?
      if (( results = this.checkCache() )){
        this.t1 = Date.now() - this.t0;
        this.logNodes();
        return this.prepResults(results, ops, this.t1);

      } else {
        // we start with all nodes as result
        results = Object.keys(nodes).map(key => nodes[key]);
        ops     = results.length;

      }


      if (this.params.deb > 1){
        this.deb("      :");
        this.deb("     Q: q: '%s'", self.query);
        this.deb("      : c: '%s'", this.params.com || "no comment");
      }

      tree.forEach( clause => {

        var 
          first  = clause[0],
          verb   = first.toLowerCase(),
          rest   = !!clause[1] ? clause[1]  : undefined, 
          params = !!rest ? rest.split(" ") : undefined, 
          attr, oper, filters;

        // expecting node NAMES, the optional first clause

        if (this.isString(clause)){

          // convert the names into nodes, remove unknown
          results = clause.split(", ")
            .map(function(name){ops++; return nodes[name] !== undefined ? nodes[name]: undefined;})
            .filter(function(node){ops++; return node !== undefined;});


        // a VERB

        } else if (this.isVerb(first)) {
          
          // find all edges from source node, with given verb, collect target node

          [ops, results] = self.reduceByVerb(verb, edges, results, ops);



        // a KEYWORD

        } else if (this.isKey(first)) {

          switch (first){

            case "LIMIT"    : ops += ~~rest; results = results.slice(0, ~~rest); break;
            case "RAND"     : ops += ~~rest; results = this.sample(results, ~~rest);  break;
            case "DISTINCT" : ops += results.length; results = [...Set(results)]; break;

            case "SORT" :

              oper = params[0]; attr = params[1];
              [ops, results] = self.sortResults(oper, attr, results, ops);
            
            break;

            case "WITH" :

              filters = clause[1].split(", ");
              filters.forEach( filter => {

                var attr, oper, queryValue;

                filter = filter.split(" ");
                
                attr = filter[0]; 
                oper = filter[1] ? filter[1] : "e"; 
                queryValue = (filter[2] !== undefined) ? parse(filter[2]) : undefined;

                results = results.filter( node => {
                  
                  var nodeValue = this.get(node, attr); ops++;

                  return (
                    oper === "e"  ? nodeValue !== undefined  : // exists ?
                    oper === "="  ? nodeValue === queryValue :
                    oper === "<"  ? nodeValue <   queryValue :
                    oper === ">"  ? nodeValue >   queryValue :
                    oper === "!=" ? nodeValue !== queryValue :
                    oper === "<=" ? nodeValue <=  queryValue :
                    oper === ">=" ? nodeValue >=  queryValue :
                      this.deb("ERROR : unknown operator in WITH: %s", oper)
                  );

                });

              });

            break;
          }

        } else {
          this.deb("ERROR : clause starts with invalid KEYWORD: %s", first);

        }

      });

      // from here there is a result set of nodes
      this.results = results;

      this.t1 = Date.now() - this.t0;

      // put in cache
      if (cache.length > this.store.cacheSlots){
        cacheDrop = Object.keys(cache).sort(function(a, b){
          return cache[a].hits - cache[b].hits;
        })[0];
        if (this.debug > 0){this.deb("     Q: cache drop: hits: %s, qry: %s", cache[cacheDrop].hits, cache[cacheDrop]);}
        delete cache[cacheDrop];
      }
      cache[this.query] = {hits: 0, results: results};

      this.logNodes();

      return this.prepResults(results, ops, this.t1);

    },
    sortResults: function (oper, attr, results, ops){

      var anValue, bnValue, get = this.get, out = results.sort((an, bn) => { 
        anValue = this.get(an, attr); 
        bnValue = get(bn, attr); ops++;
        return (
          oper === "<" ? bnValue < anValue :
          oper === ">" ? bnValue > anValue :
            this.deb("ERROR : unknown operator in SORT: %s", oper)
        );
      });

      return [ops, out];

    },
    reduceByVerb: function (verb, edges, results, ops){

      // this has to be VERY fast

      var e = 0|0, out = [], r = results.length|0, eLen = edges.length|0;

      while(r--){
        e = eLen;
        while(e--){
          if (edges[e][0] === results[r] && edges[e][1] === verb){
            ops++; 
            out.push(edges[e][2]);
          }
        }
      }
      
      return [ops, out];

    },
    logResult: function (result, format, debmax){

      var i, meta, node, c, p, t = H.tab, deb = this.deb.bind(this);

      debmax = debmax || 20;
      format = format || "";

      deb();
      deb("     D: showing %s/%s format: '%s'", debmax, result.length, format);

      switch (format){
        case "position":  deb("     H:      X      Z | node"); break;
        case "costs":     deb("     H:    F    W    M    S | node"); break;
        case "capacity":  deb("     H:  Cap | node"); break;
        case "metadata":  deb("     H:  ID   Meta | node"); break;
        case "json":      deb("     H:  ID   node | JSON"); break;
        default:
      }
      for (i=0; i<debmax; i++) {
        node = result[i];
        if (node){
          switch (format){
            case "position":
              p = node.position;
              deb("   %s: %s %s | %s", t(i+1,3),
                t(p.x.toFixed(1), 6), t(p.z.toFixed(1), 6), node.name);
            break;
            case "costs":
              c = node.costs;
              deb("   %s: %s %s %s %s | %s", t(i+1,3),
                t(c.food, 4), t(c.wood, 4), t(c.metal, 4), t(c.stone, 4), node.name);
            break;
            case "capacity":
              c = node.capacity;
              deb("   %s: %s | %s", t(i+1,3),
                t(c, 4), node.name);
            break;
            case "metadata":
              meta = H.prettify(node.metadata || {});
              deb("     n: %s | %s | %s", t(node.id || "T", 3), meta, node.name);
            break;
            case "json":
              deb("     n: %s | %s", t(node.id || "T", 3), node.name);
              H.each(node, function(prop, value){
                deb("      : p:  %s: %s", prop, H.prettify(value));
              });

            break;
            default:
              deb("     n: %s", node.name);

          }
        }
      }

    },
    partition: function (list, keywords){
     
      var t, tokens, pointer = 0, clause = 0, found = false, out = [];

      // reject
      if (!list.length || list.length > 1 || list[0] === ""){return undefined;}

      function peek()     {return tokens[pointer] === undefined ? undefined : tokens[pointer];}
      function consume()  {pointer += 1;}
      function isStop(t)  {if (keywords.indexOf(t) !== -1) {found = true; return true;} return false;}
      function append(t)  {
        if (!found) {
          out[clause] = (out[clause] === undefined) ? t : out[clause] + " " + t;
        } else {
          out[clause][1] = (out[clause][1] === undefined) ? t : out[clause][1] + " " + t;
        }
      }
      
      tokens = list[0].split(" "); t = peek();

      while (t){
        if (isStop(t) && out[clause] === undefined){
          out[clause] = [t];
        } else if (isStop(t)){
          clause += 1; 
          out[clause] = [t];
        } else {
          append(t);
        }
        consume(t); t = peek();
      }

      return out;

    },

  });  


return H; }(HANNIBAL)); 
/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, Engine */

/*--------------- T E S T E R -------------------------------------------------

  fires a set of functions at given tick, useful to test bot on specific maps
  sequence keys are documented in maps/readme-maps.md
  active sequence comes from 



  V: 0.1, agentx, CGN, Feb, 2014

*/

/*
        "5": [() => H.Grids.dump(), "dumping maps"],
        http://www.semicomplete.com/projects/xdotool/xdotool.xhtml#mouse_commands
*/


HANNIBAL = (function(H){

  // see gui.engine.methods.txt for remote control

  var 
    T = H.T || {},
    CTX = null, PID = NaN, CC  = NaN, 
    self, tick = 0, map, sequence = "", 
    chat  = (msg) => Engine.PostCommand(PID, {"type": "chat", "message": msg}),
    ccloc = () => {
      var [x, y] = CTX.entities[CTX.villages.main].position();
      return x + ", " + y;
    };


  H.extend(T, {
    quit: function(){
      return () => Engine.PostCommand(PID, {"type": "quit"});
    },
    chat: function( /* arguments */ ){
      var msg = H.format.apply(null, H.toArray(arguments));
      return () => Engine.PostCommand(PID, {"type": "chat", "message": msg});
    },
    destroy: function(ids){ 
      ids = Array.isArray(ids) ? ids : arguments.length > 1 ? H.toArray(arguments) : [ids];
      return () => Engine.PostCommand(PID, {type: "delete-entities", "entities": ids});
    },
    research: function(tpl, id){
      return () => Engine.PostCommand(PID, {type: "research", entity: id, template: tpl}); 
    },
    launch: function(group){
      return () => {
        return CTX.groups.launch({groupname: group, cc: CC});
      };
    },
    supplier: function(supply){
      return () => {
        var config = {groupname: "g.supplier", cc: CC, supply: supply};
        CTX.groups.launch(config);
      };
    },
    builder: function(building, size, quantity){
      return () => {
        CTX.groups.launch({
          groupname: "g.builder", 
          cc: CC, 
          building: building, 
          quantity: quantity, 
          size: size
        });
      };
    },
    speed: function(rate){
      return [
        () => print(PID + "::## xdotool key F9\n"), 
        () => print(PID + "::#! xdotool type --delay 30 Engine.SetSimRate(" + rate + ")\n"), 
        () => print(PID + "::## xdotool key Return\n"),
        () => print(PID + "::## xdotool key F9\n"),
      ];

    },
    camera: function(){
      return [
        () => print(PID + "::## xdotool key F9\n"), 
        () => print(PID + "::#! xdotool type --delay 30 Engine.CameraMoveTo(" + ccloc() + ")\n"), 
        () => print(PID + "::## xdotool key Return\n"),
        () => print(PID + "::## xdotool key F9\n"),
      ];

    }

  });

  // if any of these evaluate to a string, it gets chatted
  var sequences = {
    "random/brainland": {
        "0": [() => "< - START: " + map + " - >"],
        // "1": [T.camera(),                             "set camera on CC"],
        // "2": [T.chat("Hi, id:%s, cc:%s", PID, CC)], 
        "1": [T.launch("g.dancer"), "launching 1 dancer group"], 
        // "1": [T.supplier(      "food.fruit"), "launching 1 food.fruit supplier group"], 
        // "1": [T.builder(      "house", 5, 2), "building 2 houses"], 
        // "2": [T.launch("g.harvester"), "launching 1 harvester group"], 
        // "4": [T.supplier(            "wood", 10), "launching 1 wood supplier"], 
        // "5": [T.supplier(           "metal", 10), "launching 1 metal supplier"], 
        // "6": [T.supplier(           "stone", 10), "launching 1 stone supplier"], 
        // "5": [T.speed(5),                             "more speed"],
      // "241": [T.quit(), () => "< - FINIS: " + map + " - >"],
    },
    "brain02": {
        "0": [() => "< - START: " + map + " - >"],
        // "2": [T.chat("huhu"), "chatted"], 
        "1": [T.supplier(      "food.fruit", 44), "launching 1 food.fruit supplier"], 
        "2": [T.supplier(            "wood", 44, 10), "launching 1 wood supplier"], 
        "3": [T.supplier(           "metal", 44, 10), "launching 1 metal supplier"], 
        "4": [T.supplier(           "stone", 44, 10), "launching 1 stone supplier"], 
        "5": [T.speed(5),                             "more speed"],
      // "241": [T.quit(), () => "< - FINIS: " + map + " - >"],
    },
    "Arcadia 02": {
        // "0": [() => "setting view",
        //       () => print("#! xdotool click --delay 30 --repeat 4 5\n"), 
        //       () => print("#! xdotool key KP_Subtract\n"),
        //       () => print("#! xdotool key F9\n"), 
        //       () => print("#! xdotool type --delay 30 Engine.CameraMoveTo(558, 430)\n"), 
        //       () => print("#! xdotool key Return\n"),
        //       () => print("#! xdotool key F9\n"),
        //      ],        
        "0": [T.supplier(      "food.fruit", 4752), "launching 1 food.fruit supplier"], 
        "1": [T.supplier(       "food.meat", 4752), "launching 1 food.meat supplier"], 
       "10": [T.supplier(           "stone", 4752), "launching 1 stone supplier"], 
       "11": [T.supplier(            "wood", 4752), "launching 1 wood supplier"], 
       "12": [T.supplier(            "wood", 4752), "launching 1 wood supplier"], 
       // "13": [T.speed(5),                            "more speed"],
      "103": [() => H.Groups.log(), "logging groups"],
        // "6": [() => H.Grids.log(),  "logging grids"],
        // "7": [() => H.Grids.dump(), "dumping grids"],
        // "8": [() => H.Groups.log(), "logging groups"],
       // "70": [() => H.logIngames(), "logging ingames"],
       // "71": [() => H.Groups.log(), "logging groups"],
      "1000": [T.quit()],
    },
  };

  // fires functions at give tick num, 
  H.Tester = (function(){

    var t0, triggers;
    
    return {
      boot:     function(){return (self = this);},
      log:      function(){
        var 
          cnt = H.count(sequence),
          lst = H.attribs(sequence).join(",");
        H.deb(PID, "      :");
        H.deb(PID, "INFO  : TESTER PID: %s sequence: %s with %s ticks [%s]", PID, map, cnt, lst);
        H.deb(PID, "      :");
      },
      activate: function(seqmap, context){
        CTX = context; PID = context.id; 
        map = sequences[seqmap] ? seqmap : H.Config.sequence;
        sequence = sequences[seqmap] ? sequences[seqmap] : sequences[H.Config.sequence];
        H.deb("INFO  : TESTER.activated sequence: %s, PID: %s", map, PID);
      },
      evaluate: function(item){
        return (
          typeof item === "string"   ? chat(H.format("# %s %s", tick, item)) :
          typeof item === "function" ? self.evaluate(item()) :
          Array.isArray(item) ? void (item.map(fn => fn())) :
            undefined
        );
      },
      tick: function(secs, tick, context){
        CTX = context; PID = context.id; CC = context.villages.main; t0 = Date.now();
        if (sequence){
          if (( triggers = sequence[~~tick] )){
            triggers.forEach(self.evaluate);
          }
        }
        return Date.now() - t0;
      }
    };

  }().boot());

return H; }(HANNIBAL));
/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- T O O L S ---------------------------------------------------

  Some useful objects for Hanninbal


  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H) {

  var deb = H.deb;

  H.Tools = H.Tools || {};

  // a NOP function
  H.FNULL = function(){};

  // sanitizes template names to dot notaton
  H.saniTemplateName = function(nameTemplate){
    nameTemplate = H.replace(nameTemplate,  "|", ".");
    nameTemplate = H.replace(nameTemplate,  "_", ".");
    nameTemplate = H.replace(nameTemplate,  "/", ".");
    return nameTemplate.toLowerCase();
  };

  H.Damper = function(fnDamper){
    this.level = 0;
    this.last = 0;
    this.damper = fnDamper;
    };

    H.Damper.prototype = {
      constructor: H.Damper,
      increase: function(value){this.level += value;},
      tick: function(time){
        this.level = this.damper.call(this, time);
        this.last = time;
      }
    };

    H.Dampers = {
      quadratic: function(time){
        var diff = time - this.damper.last;
        return Math.sqrt((this.level + 1)/diff) -1;
      }
    };

  H.health = function(ids){

    // calcs health of an array of ent ids

    var curHits = 0, maxHits = 0;

    ids.forEach(function(id){
      if (!H.Entities[id]){
        deb("WARN  : Tools.health: id: %s in ids, but not in entities, type: %s", id, typeof id);
      } else {
        curHits += H.Entities[id].hitpoints();
        maxHits += H.Entities[id].maxHitpoints();
      }
    });

    return ids.length ? (curHits / maxHits * 100).toFixed(1) : NaN;

  };

  // H.class2name = function(klass){return H.QRY(klass + " CONTAIN").first().name;};

  H.cost2flow = function (cost){
    return {
      food:  cost.food/cost.time,
      wood:  cost.wood/cost.time,
      stone: cost.stone/cost.time,
      metal: cost.metal/cost.time
    };
  };

  H.maxFlow = function (a,b){
    return {
      food:  Math.max(a.food, b.food).toFixed(1),
      wood:  Math.max(a.wood, b.wood).toFixed(1),
      stone: Math.max(a.stone, b.stone).toFixed(1),
      metal: Math.max(a.metal, b.metal).toFixed(1),
    };
  };

  // H.getFlowFromClass = function(klass){

  //   return H.attribs(H.Bot.tree.nodes[H.class2name(klass)].products.train)
  //     // .map(function(name){deb(" TOOLS: getFlowStructure: %s %s %s", klass, name, uneval(H.QRY(name).first().costs)); return name;})
  //     .map(name => H.QRY(name).first().costs)
  //     .map(costs => cost2flow(costs))
  //     .reduce(reduceFlow, {food:0,wood:0,stone:0,metal:0});
  // };

  // H.getFlowFromTrainer = function(name){

  //   return H.attribs(H.Bot.tree.nodes[name].products.train)
  //     // .map(function(name){deb(" TOOLS: getFlowStructure: %s %s %s", klass, name, uneval(H.QRY(name).first().costs)); return name;})
  //     .map(name => H.QRY(name).first().costs)
  //     .map(costs => cost2flow(costs))
  //     .reduce(reduceFlow, {food:0,wood:0,stone:0,metal:0});
  // };




  // H.States = Proxy.create({  // sanitize UnitAI state
  //   get: function (proxy, id) {
  //     return (
  //       H.Entities[id] && H.Entities[id]._entity.unitAIState ? 
  //         H.replace(H.Entities[id]._entity.unitAIState.split(".").slice(-1)[0].toLowerCase(), "ing", "") :
  //         undefined
  //     ); 
  //   }
  // });  

  // H.Iterator = function ( /* arguments */ ) {

  //   // infinite... !!!! wating for SM32
  //   // http://www.tuicool.com/articles/3MBJj2z

  //   var 
  //     args = H.toArray(arguments),
  //     al = args.length,
  //     fn = args.slice(-1),
  //     fnArgs = args.slice(0, al -1),
  //     iter = fn.apply(null, fnArgs);

  //   return function () {return iter.next().value;};

  // };

  /*

    function Iterator (init, fn){
      var iter = fn(init);
      return function () {return iter.next().value;}
    }

    var a = [];
    // var test = Iterator(5, function * (p) {var counter = 0; while(true) {yield String( ++counter) + p;}});
    var test = Iterator(5, function * (p) {var counter = 0; while(true) {yield String( ++counter) + p;}});

  */



  // H.Task = (function(){

  //   // generates autoincrement numbers

  //   var counter = 0;
  //   return {
  //     get id () {return ++counter;}
  //   };
  // }());

  // H.LIB.Objects = function(){

  //   // keeps track of objects and their IDs
    
  //   var o = {}, p = 0;
  //   return function (x) {
  //     if (x === undefined){return o;}
  //     if (typeof x === "object") {p += 1; o[p] = x; return p;}
  //     return o[x];
  //   };
  // };

  // H.Triggers = (function(){

  //   // calls functions + params at a given tick or diff

  //   var i, len, pointer = 0, actions = [], dels = [], t0;

  //   return {
  //     info: function(){return actions.length;},
  //     add:  function(ticks, action){
  //       // negative indicates a diff, default = zero = next, positive = absolute,
  //       ticks = ticks || -1;
  //       action.tick = (ticks < 1) ? pointer + Math.abs(ticks) -1 : ticks;
  //       actions.push(action);
  //     },
  //     tick: function(){
  //       t0 = Date.now(); dels = []; len = actions.length; pointer += 1;
  //       for (i=0; i<len; i++) {
  //         if(actions[i].tick < pointer){
  //           actions[i](); 
  //           dels.push(actions[i]);
  //         }
  //       }
  //       dels.forEach(function(del){
  //         actions.splice(actions.indexOf(del), 1);
  //       });
  //       return Date.now() - t0;
  //     }
  //   };

  // }());
     

  H.Numerus = (function(){

    // a statistics extension, interacts with launcher.py

    var id, ss, gs, key = 0, resolution = 10;

    function out (data) {print(id + "::" + data + "\n");}
    function append (data){out("#! append 1 :" + data);}

    function tickData(id){
      var pd = ss.playersData[id],
          data  = {
            player: id,
            name:   pd.name,
            team:   pd.team,
            civ:    pd.civ,
            color:  pd.color,
          };
      return JSON.stringify(data);
    }

    function tickLine(id, what){

      var data, pd = ss.playersData[id], st = pd.statistics;

      data = {
        key:        key,
        secs:       (gs.timeElapsed/1000).toFixed(1),
        pid:        id,
        phase:      pd.phase,
        food:       pd.resourceCounts.food,
        wood:       pd.resourceCounts.wood,
        stone:      pd.resourceCounts.stone,
        metal:      pd.resourceCounts.metal,
        tresaure:   st.treasuresCollected,
        unitsLost:  st.unitsLost.total,
        unitsTrai:  st.unitsTrained.total,
        bldgsCons:  st.buildingsConstructed.total,
        bldgsLost:  st.buildingsLost.total,
        kills:      st.enemyUnitsKilled.total,
        popcnt:     pd.popCount,
        popcap:     pd.popLimit,
        popmax:     pd.popMax,
        explored:   st.percentMapExplored,
        techs:      Object.keys(pd.researchedTechs).length,
        // msecs:      H.Launcher.timing.all,
      };

      key += 1;

      return ( what === "row" ? 
        Object.keys(data).map(a => data[a]).join(";") + "\n" :
        Object.keys(data).join(";") + "\n"
      );

    } 

    return {
      init: function(pid, sharedscript, gamestate){
        id = pid;
        ss = sharedscript;
        gs = gamestate;
        resolution = H.Config.numerus.resolution;
        deb();
        deb("NUMRUS: Logging every %s ticks to: %s", resolution, H.Config.numerus.file);
        out("#! open 1 " + H.Config.numerus.file);
        out("#! append 1 :# Numerus Log from: " + new Date());
        H.each(ss.playersData, function(id){
          id = ~~id;
          if (id){append("# " + tickData(id, "row"));}
        });
        out("#! append 1 :" + tickLine(1, "head"));
      },
      tick: function(secs, ticks, sharedscript){
        ss = sharedscript;
        if (~~ticks % resolution === 0) { 
          H.each(ss.playersData, function(id){
            id = ~~id;
            if (id){append(tickLine(id, "row"));}
          });
        }    
      }
    };

  }());  



  H.Checker = function (context) { // state
    H.extend(this, context, {
      // planner: new H.HTN.Planner({
      //   name:         "check.planner",
      //   operators:    H.HTN.Economy.operators,
      //   methods:      H.HTN.Economy.methods,
      // })
    });
  };

  H.Checker.prototype = {
    constructor: H.Checker,
    test: function(){
      var self = this;
      [ 
        H.class2name("civcentre"),
        H.class2name("farmstead"),
        "gather.capacity.wheelbarrow",
        H.class2name("temple"),
        "phase.city",
        H.class2name("fortress"),
        "XXXXX",
        "",
      ].forEach( name => {
        deb(" CHECK: '%s'", name);
        var result = self.check(name, true);
        deb("     C: %s", JSON.stringify(result));
      });      
    },
    check: function(name, debug=false){

      // TOCHECK: What about units, resources and item = phase

      // possible results:
      // illegal, planner has error
      // notnow, needs subsequent phase 
      // feasible, in current phase
      // available, only one operation needed
      // done, no operations needed

      var 
        t0 = Date.now(),
        tree = this.tree.nodes,
        planner = this.planner,
        state = this.curstate || this.state, // a bit hacky
        data, goal, operations, 
        // tree = H.Bot.tree.nodes, 
        // state = H.HTN.Economy.getCurState(),
        result = {needed: [], cost: null},
        checkops = {
          // "start": null,
          "build_structures": true,
          "research_tech": true,
          "train_units": true,
          // "finish": null,
        };
      
      // valid name
      if (!tree[name] || !tree[name].verb){
        if (debug){deb(" CHECK: no verb/node: %s",  name);}
        result.illegal = true; 
        return result;
      }

      // valid verb
      if (tree[name].verb === "research"){
        data = {tech: [name]};
      } else if (tree[name].verb === "train" || tree[name].verb === "build"){
        data = {ents: {}}; data.ents[name] = 1;
      } else {
        result.illegal = true; return result;
      }

      // run
      goal = new H.HTN.Helper.State(data).sanitize();
      planner.plan(state, [[planner.methods.start, goal]]);
      result.time = Date.now() - t0;

      // valid outcome
      if (planner.error){
        if (debug) {
          planner.logstack.forEach(l => {
            deb(" CHECK: log: %s", l.m);
          });
        }
        result.illegal = true; return result;
      }

      // filter ops
      operations = planner.operations.filter(op => !!checkops[op[1]]);

      if (debug){
        deb("     C: operations:");
        operations.forEach(function(op){
          deb("     C: - %s", op.filter(o => o !== undefined).join(", "));
        });  
      }

      if (operations.length === 0){
        result.done = true; return result;
      }

      if (operations.length === 1){
        result.available = true; return result;
      }

      if (operations.some(op => op[1] === "research_tech" && op[2].contains("phase"))){
        result.notnow = true; return result;
      } else {
        result.feasible = true; return result;
      }

      return result;

    }    


  };

  H.Slicer = function(arr){
    return new Proxy(arr, {
      get: function (arr, arg){

        /**
         * Pythonic array slicing
         *
         * By Afshin Mehrabani (@afshinmeh)
         */

          // a = [1,2,3,4,5,6,7]
          // a[:]           [1, 2, 3, 4, 5, 6, 7]
          // a[0]           1
          // a[1:]          [2, 3, 4, 5, 6, 7]
          // a[:1]          [1]
          // a[1:1]         []
          // a[2:1]         []
          // a[1:2]         [2]
          // a[1:3]         [2, 3]
          // a[:0]          []
          // a[:2]          [1, 2]
          // a[:-1]         [1, 2, 3, 4, 5, 6]
          // a[:-2]         [1, 2, 3, 4, 5]
          // a[:-0]         []
          // a[-1:]         [7]
          // a[-3:]         [5, 6, 7]
          // a[-1:-3]       []
          // a[-1:-3:-1]    [7, 6]
          // a[-3:-1]       [5, 6]
          // a[-3:-1:1]     [5, 6]
          // a[-3:-1:-1]    []
          // a[-3:-1]       []


        var 
          expr  = arg.trim(),
          parts = expr.split(":"),  
          from = isNaN(parts[0]) ? 0 : ~~parts[0], 
          to   = isNaN(parts[1]) ? arr.length : ~~parts[1], 
          step = isNaN(parts[2]) ? 1 : ~~parts[2], 
          stepOnly = isNaN(parts[0]) && isNaN(parts[1]),
          reversed = false,
          i, slicedArr, alteredArray, arrLength;

        if (arr.length === 0 || expr === ":" || !parts.length || (isNaN(from) && isNaN(to) && isNaN(step))) {
          return arr;
        }

        //set default for both from and to if they are not defined
        // if (isNaN(parts[0]) && isNaN(parts[1])) {
        //   stepOnly = true;
        //   from = 0;
        //   to = arr.length;
        // }

        console.log("from", from, "to", to, "step", step);

        //reverse the array if we have negative values
        if (from < 0 || to < 0 || step < 0) {

          arr = arr.slice().reverse();
          reversed = true;

            //swap from and to
          if (!stepOnly) {[from, to] = [to, from];}

          to   = Math.abs(to);
          from = isNaN(from) ? to -1 : Math.abs(from);
          step = Math.abs(step);

        }

        //set default from
        if (typeof (from) == "undefined") {from = 0;}
        //set default to
        if (isNaN(to)) {to = from + 1;}

        //slice the array with from and to variables
        slicedArr = arr.slice(from, to);

        //return sliced array if there is no step value
        if (isNaN(step)) {
          return reversed ? slicedArr.reverse() : slicedArr;
        }

        alteredArray = [];
        for (i = 0, arrLength = slicedArr.length; i < arrLength; i += step) {
          alteredArray.push(slicedArr[i]);
        }

        return reversed && !stepOnly ? alteredArray.reverse() : alteredArray;

      }

    });
  };


return H;}(HANNIBAL));

/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, uneval */

/*--------------- V I L L A G E S ---------------------------------------------

  Organizes structures around civic centres,
  appoints mayor and custodians

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/


HANNIBAL = (function (H){

  H.LIB.Villages = function (context){

    H.extend(this, {

      context:  context,

      imports:  [
        "id",
        "map",
        "query",
        "events",
        "groups",
        "config",
        "objects",
        "entities",     // hasClass
        "metadata",
      ],

      main:      NaN,        // id of first centre
      centres:   null,       // list of centres
      theta:     NaN,        // rads of main to center of map
      angle:     NaN,        // angle

      counter: {
        units:  0,
        mayors: 0,
        shared: 0,
        other:  0,
      }
      
   });

  };

  H.LIB.Villages.prototype = H.mixin( 
    H.LIB.Serializer.prototype, {
    contructor: H.LIB.Villages,
    log: function () {
      this.deb();
      this.deb("  VILL:    main: %s, angle: %s, counts: %s", this.main, this.angle.toFixed(1), JSON.stringify(this.counter));
      this.deb("     V: centres: %s", JSON.stringify(this.centres));
    },
    import: function () {
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function (context){
      context.data[this.name] = this.serialize();
      return new H.LIB[H.noun(this.name)](context);
    },
    deserialize: function () {
      var data;
      if (this.context.data[this.name]){
        data = this.context.data[this.name];
        this.main    = data.main;
        this.centres = data.centres;
      }
      // deb("  VILL: deserialized: %s", uneval(data));
    },
    serialize: function () {
      return {
        main:    this.main,
        centres: H.deepcopy(this.centres)
      };
    },
    initialize: function () {
      // deb("  VILL: initializing: %s", uneval(this.centres));
      if (this.centres === null){
        this.centres = {};
        this.organizeVillages(); // set metadata.cc to nearest cc
        this.initializeMeta();
      }
      return this;
    },
    activate: function () {

      this.events.on("ConstructionFinished", msg => {

        // var order = this.objects(this.metadata[msg.id].order);

        // if (order.cc){
        //   this.metadata[msg.id].cc = order.cc;
        //   // deb("  VILL: set cc: %s of %s %s", order.cc, msg.id, H.Entities[msg.id]._templateName);
        // }

      });

      this.events.on("BroadCast", msg => {

        if (msg.data.group === "g.builder"){

        }

      });

    },
    isShared: function (ent){
      var klasses = ent.classes().map(String.toLowerCase);
      // deb(klasses + "//" + this.config.data.sharedBuildingClasses);
      return this.config.data.sharedBuildingClasses.some(function (klass){
        return H.contains(klasses, klass);
      });
    },
    getPhaseNecessities: function (options){ // phase, centre, tick
      
      var 
        cls = H.class2name,
        cc  = options.centre,
        housePopu = this.query(cls("house")).first().costs.population * -1,

        messages = [],
        technologies = [],
        launches = {

          "phase.village": [

             //  tck, amount,       group,        params
             [  3, [1, "g.mayor",       {cc: cc, size: 0}]],
             [  3, [1, "g.custodian",   {cc: cc, size: 0}]],

          ],
          "phase.town" :   [],
          "phase.city" :   [],
        };

      return {
        launches: launches,
        technologies: technologies,
        messages: messages,
      };

    },      

    organizeVillages: function () {

      var 
        ccNodes, ccId, posMain, posCenter, getMain = () => {
          var max = -1, cic;
          H.each(this.centres, (id, list) => {
            if (list.length > max){cic = id; max = list.length;}
          });
          return ~~cic;
        };

      // find all CC
      ccNodes = this
        .query("civcentre CONTAIN INGAME")
        .forEach( node => this.centres[node.id] = []);

      if (!ccNodes.length){
        this.deb("ERROR : organizeVillage No CC found with: civcentre CONTAIN INGAME");
      }

      // deb();
      // deb("  VILL: organize villages for %s civic centres [%s]", ccNodes.length, ccNodes.map(c => c.id).join(", "));
      
      this.query("INGAME").forEach( node => {

        var dis, distance = 1e7;

        // is not cc
        if (!this.centres[node.id]){

          // find nearest CC
          ccNodes.forEach( cc => {
            dis = this.map.distance(cc.position, node.position);
            if (dis < distance){
              ccId = cc.id;
              this.metadata[node.id].cc = cc.id;
              distance = dis;
            }
          });

          // keep building to find largest village
          if (this.entities[node.id].hasClass("Structure")){
            this.centres[ccId].push(node.id);
          }

        } else {
          // CCs have themself as cc
          this.metadata[node.id].cc = node.id;

        }

      });

      this.main  = getMain();
      posMain    = this.entities[this.main].position();
      posCenter  = this.map.center();
      this.theta = Math.atan2(posCenter[1] - posMain[1], posCenter[0] - posMain[0]);
      this.angle = this.theta * 180 / Math.PI;

      H.each(this.centres, (id, amount) => {
        // deb("     V: CC [%s] has %s entities, main: %s", id, amount, (~~id === this.main ? "X" : ""));
      });

    },    

    initializeMeta: function () {

      // deb("     V: setting operators for shared buildings and Main CC in metadata");

      //TODO: test for multiple villages
      // find units and buildings not belonging to a group and
      // set opname to "none", should only happen in a fresh game

      H.each(this.entities, (id, ent) => {

        if (ent.owner() === this.id){

          if (ent.hasClass("Unit") && !this.metadata[id].opname){
            this.metadata[id].opname = "none";
            this.counter.units += 1;
            // deb("     V: set opname to 'none' %s", ent);

          } else if (ent.hasClass("Structure") && !this.metadata[id].opname){

            // deb("     V: id: %s, entid: %s mainid: %s", id, ent.id(), this.main);

            if (~~id === this.main){
              this.counter.mayors += 1;
              this.counter.shared += 1;
              this.metadata[id].opname = "g.mayor";
              this.metadata[id].opmode = "shared";
              // deb("     V: set opname to 'g.mayor' for %s", ent);

            } else if (this.isShared(ent)){
              this.counter.shared += 1;
              this.metadata[id].opname = "g.custodian";
              this.metadata[id].opmode = "shared";
              // deb("     V: set opname to 'g.custodian' for %s", ent);

            } else {
              this.counter.other += 1;
              this.metadata[id].opname = "none"; // there is a group for that
              // deb("     V: set opname to 'none' for %s", ent);
            
            }

          } else {
            // happens in cloned bot
            // deb("WARN  : prepareMeta unhandled entity: %s classes: %s", ent, uneval(this.metadata[id]));

          }

        }

      });


    },

  });

return H; }(HANNIBAL));  
