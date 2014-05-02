/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*--------------- H E L P E R -------------------------------------------------

  these are Helpers, not solutions. No external stuff needed


  everything H.[lowercase] should be here.
  V: 0.1, agentx, CGN, Feb, 2014

*/

// The Object.keys() method returns an array of a given object's own enumerable properties
// The Object.getOwnPropertyNames() method returns an array of all properties (enumerable or not) found directly upon a given object.


HANNIBAL = function(H){

  function extend(o,e){var a; for(a in e){if(e.hasOwnProperty(a)){o[a]=(e[a]);}}}

extend(H, {

  // looping
  for:        function(n,fn){var i=n,a=[];while(n--){a.push(fn(i-n+1));}return a;},
  range:      function (st, ed, sp){
    var i,r=[],al=arguments.length;
    if(al===0){return r;}
    if(al===1){ed=st;st=0;sp=1;}
    if(al===2){sp=1;}
    for(i=st;i<ed;i+=sp){r.push(i);}
    return r;
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
  clamp:      function (val, min, max){return Math.max(Math.min(val, max), min);}, 
  isInteger:  function (n){return Math.floor(n) === n;},

  // strings
  replace:    function (s,f,r){return s.replace(new RegExp(H.escapeRex(f), 'g'), r);},
  padZero:    function (num, len){len = len || 2; num = "0000" + num; return num.substr(num.length-2, 2);},
  format:     function (){var a=H.toArray(arguments),s=a[0].split("%s"),p=a.slice(1).concat([""]),c=0;return s.map(function(t){return t + p[c++];}).join('');},
  mulString:  function (s, l){return new Array(l+1).join(s);},
  escapeRex:  function (s){return s.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");},
  letterRange:function (r){return H.range(r.charCodeAt(0), r.charCodeAt(1)+1).map(function(i){return String.fromCharCode(i);}).join("");},
  findAll:    function (str, s){var idxs=[],idx,p=0;while((idx=str.indexOf(s,p))>-1){idxs.push(idx);p=idx+1;}return idxs;},
  tab:        function (s,l){l=l||8;s=new Array(l+1).join(" ")+s;return s.substr(s.length-l);},

  // objects
  // each:       function (o,fn){var a;for(a in o){if(o.hasOwnProperty(a)){fn(a,o[a]);}}},
  clone:      function (o){var e,n={};for(e in o){n[e]=o[e];}return n;},
  // attribs:    function (o){var a,n=[];for(a in o){if(o.hasOwnProperty(a)){n.push(a);}}return n;},
  firstAttr:  function (o){var attr; for (attr in o) {if (o.hasOwnProperty(attr)) {return attr;} } return undefined;},
  countAttrs: function (o){var a,c=0;for(a in o){if(o.hasOwnProperty(a)){c+=1;}}return c;},
  // count:      function (o){var attr,cnt=0;for(attr in o){if (o.hasOwnProperty(attr)){cnt+=1;}}return cnt;},
  deepcopy:   function (obj){return JSON.parse(JSON.stringify(obj));},
  // extend:     function (o,e){var a; for(a in e){if(e.hasOwnProperty(a)){o[a]=H.deepcopy(e[a]);}}return o;},
  extend:     function (o,e){var a; for(a in e){if(e.hasOwnProperty(a)){o[a]=(e[a]);}} return o;},
  isEmpty:    function (o){var p;for(p in o){if(o.hasOwnProperty(p)){return false;}}return true;},
  prettify:   function (o){return JSON.stringify(o).split('"').join("");},
  map:        function (o,fn){var a,r={};for(a in o){if(o.hasOwnProperty(a)){r[a]=(typeof fn==='function')?fn(a,o[a]):fn;}}return r;},

  // Arrays
  toArray:    function (a){return Array.prototype.slice.call(a);},
  toFixed:    function (a,n){ n=n||1;return a.map(function(n){return n.toFixed(1);});},
  rotate:     function (a,n){return a.concat(a.splice(0,n));},
  // unique:     function (a){var u=[];a.forEach(function(i){if(u.indexOf(i)===-1){u.push(i);}});return u;},
  sample:     function (a,n){var l=a.length;n=n||1;return H.range(n).map(function(){return a[~~(Math.random() * l)];});},
  removeAll:  function (a,v){var i,j,l;for(i=0,j=0,l=a.length;i<l;i++) {if(a[i]!==v){a[j++]=a[i];}}a.length=j;},
  remove:     function (a,e){var i=a.indexOf(e); if (i!==-1){a.splice(i, 1);}},
  flatten:    function (a){return Array.prototype.concat.apply([], a);},

  // ES6 Suite
  unique:     function (a){return [...(new Set(a))];},
  attribs:    function (o){return Object.keys(o);},
  each:       function (o,fn){Object.keys(o).forEach(a => fn(a, o[a]));},
  count:      function (o){return Object.keys(o).length;},
  values:     function (o){return Object.keys(o).map(function(k){return o[k];})}

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