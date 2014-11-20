/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- H E L P E R -------------------------------------------------

  these are Helpers, not solutions. No external stuff needed


  everything non domain H.[lowercase] should be here.
  V: 0.1, agentx, CGN, Feb, 2014

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

  // strings
  replace:    function (s,f,r){return s.replace(new RegExp(H.escapeRex(f), 'g'), r);},
  padZero:    function (num, len){len = len || 2; num = "0000" + num; return num.substr(num.length-2, 2);},
  format:     function (){var a=H.toArray(arguments),s=a[0].split("%s"),p=a.slice(1).concat([""]),c=0;return s.map(function(t){return t + p[c++];}).join('');},
  mulString:  function (s, l){return new Array(l+1).join(s);},
  escapeRex:  function (s){return s.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");},
  letterRange:function (r){return H.range(r.charCodeAt(0), r.charCodeAt(1)+1).map(function(i){return String.fromCharCode(i);}).join("");},
  findAll:    function (str, s){var idxs=[],idx,p=0;while((idx=str.indexOf(s,p))>-1){idxs.push(idx);p=idx+1;}return idxs;},
  tab:        function (s,l){l=l||8;s=new Array(l+1).join(" ")+s;return s.substr(s.length-l);},
  replaceAll: function (find, replace, str) {return str.replace(new RegExp(H.escapeRex(find), 'g'), replace);},
  endsWith:   function (str, end){var l0=str.length,l1=end.length; return str.slice(l0-l1,l0) === end;},
  noun:       function (s){var o=s.toLowerCase();return o[0].toUpperCase()+o.slice(1);},
  
  // objects
  // each:       function (o,fn){var a;for(a in o){if(o.hasOwnProperty(a)){fn(a,o[a]);}}},
  clone:      function (o){var e,n={};for(e in o){n[e]=o[e];}return n;},
  // attribs:    function (o){var a,n=[];for(a in o){if(o.hasOwnProperty(a)){n.push(a);}}return n;},
  firstAttr:  function (o){var attr; for (attr in o) {if (o.hasOwnProperty(attr)) {return attr;} } return undefined;},
  countAttrs: function (o){var a,c=0;for(a in o){if(o.hasOwnProperty(a)){c+=1;}}return c;},
  // count:      function (o){var attr,cnt=0;for(attr in o){if (o.hasOwnProperty(attr)){cnt+=1;}}return cnt;},
  deepcopy:   function (obj){return JSON.parse(JSON.stringify(obj));},
  // extend:     function (o,e){var a; for(a in e){if(e.hasOwnProperty(a)){o[a]=H.deepcopy(e[a]);}}return o;},
  // extend:     function (o,e){var a; for(a in e){if(e.hasOwnProperty(a)){o[a]=(e[a]);}} return o;},
  isEmpty:    function (o){var p;for(p in o){if(o.hasOwnProperty(p)){return false;}}return true;},
  prettify:   function (o){return JSON.stringify(o).split('"').join("");},
  map:        function (o, fn){var a,r={};for(a in o){if(o.hasOwnProperty(a)){r[a]=(typeof fn==='function')?fn(a,o[a]):fn;}}return r;},
  transform:  function (o, fn){
    var r={}; H.each(o,function(k,v){var [ra,rv]=fn(k,v);r[ra]=rv;});return r;
  },
  testX:       function (o, s){
    var p = 0, as = s.split("."), l = as.length -1;
    while (( (o = o[as[p]]) !== undefined)) {
      if(p === l){return o;}
      p +=1;
    }
    return undefined;
  },
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

  // Arrays
  toArray:    function (a){return Array.prototype.slice.call(a);},
  delete:     function (a, fn){var i=0,o=0;while(a[i]!==undefined){if(fn(a[i])){a.splice(i,1);o++;}else{i++;}}return o;},
  contains:   function (a, e){return a.indexOf(e)!==-1;},
  toFixed:    function (a, n){ n=n||1;return a.map(function(n){return n.toFixed(1);});},
  rotate:     function (a, n){return a.concat(a.splice(0,n));},
  // unique:     function (a){var u=[];a.forEach(function(i){if(u.indexOf(i)===-1){u.push(i);}});return u;},
  sample:     function (a, n){var l=a.length;n=n||1;return H.range(n).map(function(){return a[~~(Math.random() * l)];});},
  removeAll:  function (a, v){var i,j,l;for(i=0,j=0,l=a.length;i<l;i++) {if(a[i]!==v){a[j++]=a[i];}}a.length=j;},
  remove:     function (a, e){var i=a.indexOf(e); if (i!==-1){a.splice(i, 1);}},
  consume:    function (a, fn){while(a.length){fn(a.shift());}},
  flatten:    function (a){return Array.prototype.concat.apply([], a);},
  pushUnique: function (a, e){if(a.indexOf(e)===-1){a.push(e);}return a;},
  pushflat:   function (a, b){b.forEach(i => a.push(i));},
  equal:      function (a, b){return JSON.stringify(a) === JSON.stringify(b);},
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
  unique:     function (a){return [...Set(a)];},
  attribs:    function (o){return Object.keys(o);},
  each:       function (o,fn){Object.keys(o).forEach(a => fn(a, o[a]));},
  count:      function (o){return Object.keys(o).length;},
  values:     function (o){return Object.keys(o).map(function(k){return o[k];});}

});


// http://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable

H.humanFileSize = function (bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(bytes < thresh) {return bytes + ' B';}
    var units = si ? ['kB','MB','GB','TB','PB','EB','ZB','YB'] : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(bytes >= thresh);
    return bytes.toFixed(1)+' '+units[u];
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

H.createRingBuffer = function(length){

  var pointer = 0, lastPointer = 0, buffer = []; 

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
    trend : function(){return H.trend(buffer);}    
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
// };