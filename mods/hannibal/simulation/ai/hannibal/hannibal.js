/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, API3, deb, debTable, print, logObject, exportJSON, logError, TESTERDATA, uneval, logPlayers, logStart */

/*--------------- L A U N C H E R   -------------------------------------------

  Launches an AI/Bot in a fresh or saved context.
  Home: https://github.com/noiv/Hannibal/blob/master/README.md

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

  Credits:

    kmeans: 
    pythonic slicing:
    helper:

*/

// very first line, enjoy the rest
var TIMESTART = Date.now();

print("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### --- " + new Date() + "\n");
print("#! xdotool init\n");

Engine.IncludeModule("common-api");

var HANNIBAL = (function() {

  var H = {
    API: API3,
    LIB: {},
    throw: function(){
      var 
        msg = H.format.apply(null, H.toArray(arguments)),
        stack = new Error().stack.split("\n").slice(1);
      deb();
      deb(msg);
      stack.forEach(line => deb("  " + line));      
      throw "\n*\n*";
    },
    extend: function (o){
      Array.prototype.slice.call(arguments, 1)
        .forEach(e => {Object.keys(e)
          .forEach(k => o[k] = e[k]
    );});},
    chat: function(){}
  };

  // constructor
  H.Launcher = function(settings) {

    API3.BaseAI.call(this, settings);

    H.extend(this, {
      map:            TESTERDATA && TESTERDATA.map ? TESTERDATA.map : "unknown",
      settings:       settings,                            // from ai config dialog
      isInitialized:  false,                               // did that happen well?
      isTicking:      false,                               // toggles after first OnUpdate
      isFinished:     false,                               // there is still no winner
      noInitReported: false,                               // report init failure only once
      timing:         {all: 0},                            // used to identify perf. sinks in OnUpdate
      context:        new H.LIB.Context("ctx1")            // create empty context
    });

    deb();
    deb("------: Launcher.constructor.out");

  };

  H.Launcher.prototype = new H.API.BaseAI();
  H.Launcher.prototype.Deserialize = function(data /*, sharedScript */ ){
    this.context.deserialize(data);
  };
  H.Launcher.prototype.Serialize = function(){
    return this.context.serialize();
  };
  H.Launcher.prototype.CustomInit = function(gameState, sharedScript) {

    var ss = sharedScript, gs = gameState;

    logStart(ss, gs, this.settings);
    logPlayers(ss.playersData);

    H.APP = this;

    // launch the stats extension
    if (H.Config.numerus.enabled){
      H.Numerus.init(ss, gs);          
    }             

    // connect the context
    this.context.connectEngine(this, gameState, sharedScript, this.settings);
    this.context.initialize(H.Config);

    // This bot faces the other players
    this.bot = this.context.createBot();
    
    /*

    Below is for development

    */

    var lines1, lines2, lines3, diff;
    this.context.log();

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

    /* run scripted actions named in H.Config.sequence */
    deb();
    H.Tester.activate();      
    /* end scripter */

    /* testing triple store */
    this.context.culture.debug = 5;
    // this.context.query(this.context.class2name("civilcentre") + " RESEARCH").execute("metadata", 5, 10, "next phases");
    this.context.culture.debug = 0;
    /* end testing triple store */

    deb();
    deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");

    this.initialized = true;
    // H.Config.deb = 0; // suppress further log line
    return;

  };
  H.Launcher.prototype.OnUpdate = function(sharedScript) {

    var 
      t0 = Date.now(),
      secs = (sharedScript.timeElapsed/1000).toFixed(1),
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
      this.logFirstTick(t0);
      this.isTicking = true;
    }

    if (H.Tester.OnUpdate){
      H.chat("OnUpdate");
      H.Tester.OnUpdate();
    } else {
      // H.chat("no OnUpdate");
    }
    
    // keep API events from each turn, even if not processing
    this.context.events.collect(this.events);


    // ------------- A C T I O N   S T A R T ----------------------------------

    // Run the update every n turns, offset depending on player ID to balance the load
    if ((this.turn + this.player) % 8 === 5) {

      // update context
      this.context.updateEngine(sharedScript);

      // log top row debug info
      deb("STATUS: @%s, elapsed: %s secs, id: %s, %s/%s, techs: %s, food: %s, wood: %s, metal: %s, stone: %s", 
        this.context.tick, secs, this.bot.id, 
        this.bot.player.civ, this.context.culture.phases.current,
        H.count(this.bot.player.researchedTechs), 
        this.bot.player.resourceCounts.food,
        this.bot.player.resourceCounts.wood,
        this.bot.player.resourceCounts.metal,
        this.bot.player.resourceCounts.stone
      );

      this.timing.all = 0;
      this.timing.tst = H.Tester.tick(           secs, this.context.tick);

      // THIS IS THE MAIN ACT
      this.bot.tick(                             secs, this.context.tick, this.timing);

      // deb: collect stats
      if (H.Config.numerus.enabled){
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
      deb("______: @%s timing: %s, all: %s %s", 
        this.context.tick, 
        msgTiming, 
        this.timing.all, 
        this.timing.all >= 100 ? "!!!!!!!!" : ""
      );

      // increase tick number
      this.context.tick++;


      // ------------- A C T I O N   E N D --------------------------------------

      deb("  ");
      
    }

    // increase turn number
    this.context.turn++;
    this.turn++;

  };
  H.Launcher.prototype.logNotInitialized = function() {
    deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");
    deb();deb();
    deb("ERROR : HANNIBAL IS NOT INITIALIZED !!!");
    H.chat("HANNIBAL IS NOT INITIALIZED, check install.txt");
    deb();deb();
    deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");
  };
  H.Launcher.prototype.logFirstTick = function(t0) {
    var map = TESTERDATA ? TESTERDATA.map : "unkown";
    deb("---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---  ### ---");
    deb();deb();
    deb("------: OnUpdate: startup: %s secs, map: '%s'", ((t0 - TIMESTART)/1000).toFixed(3), map);
    deb();
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
  each:       function (o,fn){var i,k,a=Object.keys(o),al=a.length;for(i=0;i<al;i++){k=a[i];fn(k, o[k]);}},

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
/*globals HANNIBAL, H, TESTERDATA, Engine, warn, error, print */

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



// used in JSON Export
function logg(){
  var args = arguments;
  if (args.length === 0) {args = ["//"];}
  if (args.length === 1) {args = ["%s", args[0]];}
  print(HANNIBAL.format.apply(HANNIBAL, args) + "\n");
}

function deb(){
  var 
    H = HANNIBAL,
    args = arguments, al = args.length,
    msg = (
      (al === 0) ? "**\n**" :
      (al === 1) ? args[0] :
        H.format.apply(H, args)
      ) + "\n",
    prefix = msg.substr(0, 7).toUpperCase(),
    deblevel = H.Config.deb || 0,
    msglevel = (
      prefix === "ERROR :" ? 1 :
      prefix === "WARN  :" ? 2 :
      prefix === "INFO  :" ? 3 :
        4
    );

  if (msglevel <= deblevel){print(msg);}

}

var debTable = function (header, table, sort){
  // has dependencies
  var 
    H = HANNIBAL,
    line, lengths = [],
    cols = table[0].length,
    space = H.mulString(" ", 100);

  H.loop(cols, () => lengths.push(0));

  table.forEach(row => {
    H.loop(cols, col => {
      var str = String(row[col -1]);
      if (str.length > lengths[col -1]){lengths[col -1] = str.length;}
    });
  });

  deb("------: start %s", header || "table");
  table
    .sort((a,b) => a[sort] < b[sort] ? -1 : 1)
    .forEach((row, i) => {
      line = H.format("      : %s ", H.tab(i, 4));
      row.forEach((item, col) => line += (item + space).slice(0, lengths[col] + 1));
      deb(line);
    });

  deb("------: %s ", header || "table");


};

function exportJSON (obj, filename){

  var 
    H = HANNIBAL,
    file  = H.format("/home/noiv/.local/share/0ad/mods/hannibal/explorer/data/%s.export", filename),
    lines = JSON.stringify(obj, null, "  ").split("\n"),
    count = lines.length;

  function logg(){
    print ( arguments.length === 0 ? 
      "#! append 0 ://\n" : 
      "#! append 0 :" + H.format.apply(H, arguments) + "\n"
    );
  }    

  deb();
  deb("EXPORT: ", filename);
  deb("EXPORT: %s", file);

  print(H.format("#! open 0 %s\n", file));
  logg("// EXPORTED %s at %s", filename, new Date());

  lines.forEach(line => logg(line));
  // lines.forEach(logg);
  
  logg("// Export end of %s", filename);
  print("#! close 0\n");
  deb("EXPORT: Done");

  return count;

}

function logJSON(obj, header){
  var lines = JSON.stringify(obj, null, "  ").split("\n");
  deb("   LOG: JSON: %s", header);
  lines.forEach(line => deb("      " + line));
  deb("   LOG: ----------");
}


function exportTemplates (tpls){

  var 
    H = HANNIBAL,
    filePattern = "/home/noiv/.local/share/0ad/mods/hannibal/explorer/data/templates-json.export";

  function logg(){
    print ( arguments.length === 0 ? 
      "#! append 0 ://\n" : 
      "#! append 0 :" + H.format.apply(H, arguments) + "\n"
    );
  }    

  deb();
  deb("EXPORT: templates");
  deb("EXPORT: %s", filePattern);

  print(H.format("#! open 0 %s\n", filePattern));
  logg("// EXPORTED templates at %s", new Date());
  JSON.stringify(tpls, null, "  ")
    .split("\n")
    .forEach(line => {
      logg(line);
    });
  logg("// Export end of templates");
  print("#! close 0\n");
  deb("EXPORT: Done");

}

function exportTechTemplates (tpls){

  var 
    H = HANNIBAL,
    filePattern = "/home/noiv/.local/share/0ad/mods/hannibal/explorer/data/techtemplates-json.export";

  function logg(){
    print ( arguments.length === 0 ? 
      "#! append 0 ://\n" : 
      "#! append 0 :" + H.format.apply(H, arguments) + "\n"
    );
  }    

  deb();
  deb("EXPORT: techtemplates");
  deb("EXPORT: %s", filePattern);

  print(H.format("#! open 0 %s\n", filePattern));
  logg("// EXPORTED techtemplates at %s", new Date());
  JSON.stringify(tpls, null, "  ")
    .split("\n")
    .forEach(line => {
      logg(line);
    });
  logg("// Export end of techtemplates");
  print("#! close 0\n");
  deb("EXPORT: Done");

}

function exportTree (tree) {

  var 
    t, procs, prods,
    tt = this.nodes, tpls = H.attribs(this.nodes),
    filePattern = "/home/noiv/Desktop/0ad/tree-%s-json.export";

  function logg(){
    print ( arguments.length === 0 ? 
      "#! append 0 ://\n" : 
      "#! append 0 :" + H.format.apply(H, arguments) + "\n"
    );
  }   

  deb("  TREE: Export start ...");
  print(H.format("#! open 0 %s\n", H.format(filePattern, this.civ)));
  logg("// EXPORTED tree '%s' at %s", this.civ, new Date());

  tpls.sort((a, b) => tt[a].order - tt[b].order);

  tpls.forEach(function(tpln){

    t = tt[tpln];

    logg("     T:   %s %s %s %s", t.order, t.type, t.phase, t.name);
    logg("     T:        d: %s,  o: %s", H.tab(t.depth, 4), H.tab(t.operations, 4));
    logg("     T:        %s", t.key);
    logg("     T:        reqs: %s", t.requires || "none");
    logg("     T:        flow: %s", t.flow ? JSON.stringify(t.flow) : "none");

    logg("     T:        verb: %s", t.verb || "none");
    prods = H.attribs(t.producers);
    if (prods.length){
      prods.forEach(p => logg("     T:          %s", p));
    } else {
      logg("     T:        NO PRODUCER");
    }

    logg("     T:        products: %s", t.products.count);
    if (t.products.count){
      ["train", "build", "research"].forEach(verb => {
        procs = H.attribs(t.products[verb]);
        if (procs.length){
          logg("     T:          %s", verb);
          procs.forEach(p => logg("     T:            %s", p));
        }
      });
    }

  });

  print("#! close 0\n");
  deb("  TREE: Export Done ...");

}


function exportStore(civs){

  // log history > 3,000 per civ, athens~2500, CRs not enforced.

  var filePattern = "/home/noiv/.local/share/0ad/mods/public/simulation/ai/hannibal/explorer/data/%s-01-json.export";

  function logg(){
    print ( arguments.length === 0 ? 
      "#! append 0 ://\n" : 
      "#! append 0 :" + H.format.apply(H, arguments) + "\n"
    );
  }    

  deb();deb();deb("EXPORT: %s", civs);

  civs.forEach(function(civ){
    print(H.format("#! open 0 %s\n", H.format(filePattern, civ)));
    logg("// EXPORTED culture '%s' at %s", civ, new Date());
    var culture = new H.Culture(civ), store = culture.store;
    culture.loadDataNodes();           // from data to triple store
    culture.readTemplates();           // from templates to culture
    culture.loadTechTemplates();       // from templates to triple store
    culture.loadTemplates();           // from templates to triple store
    culture.finalize();                // clear up
    logg("var store_%s = {", civ);
      logg("  verbs: %s,", JSON.stringify(store.verbs));
      logg("  nodes: {");
      H.each(store.nodes, function(name, value){
        delete value.template;
        logg("    '%s': %s,", name, JSON.stringify(value));
      });
      logg("  },");
      logg("  edges: [");
      store.edges.forEach(function(edge){
        logg("    ['%s', '%s', '%s'],", edge[0].name, edge[1], edge[2].name);
      });
      logg("  ],");
    logg("};");
    logg("// Export end of culture %s", civ);
    print("#! close 0\n");
  });


}

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

var logObject = function(o, msg){
  var inst = "unidentified";
  msg = msg || "";
  deb();
  deb("Object [%s] : c: %s, keys: %s  ---------------", inst, msg, Object.keys(o).length);
  if (o.constructor){
    deb("Object", getAttribType("constructor", o.constructor));
  }
  logObjectShort(o);
  deb("Object.__proto__");
  logObjectShort(o.__proto__);
  deb("Object.prototype");
  if (o.prototype){
    logObjectShort(o.prototype);
  }
  deb();
};

var logObjectShort = function(o){
  HANNIBAL.attribs(o)
    .sort()
    // .map(function(a){return getAttribType(a, o[a]);})
    // .forEach(function(line){deb(line);});
    .map(function(a){deb(getAttribType(a, o[a]));});
};

var getAttribType = function(name, value){

  var H = HANNIBAL, keys;

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
      return H.format("  %s: %s", name, value.toSource().split("\n").join("").slice(0, 60));
  }
  return "WTF";
};


var debTemplates = function(templates){

  var counter = 0;

  deb(" TEMPL: %s ----------------------", H.attribs(templates).length);

  // function getAttr(o){
  //   if (o["Armour"] && o["Armour"]["Hack"] && ~~o["Armour"]["Hack"] > 7){
  //     return(H.format("Armour.Hack: %s", o["Armour"]["Hack"]));
  //   } else {
  //     return false;
  //   }

  // }

  // logObject(templates, "templates");

    // Object [unidentified] : templates  ---------------
    // Object  constructor: function Object() {[native code]}
      // campaigns/army_mace_hero_alexander: OBJECT (@parent, AIProxy, Armour, Attack, Cost, ...)[27]
      // campaigns/army_mace_standard: OBJECT (@parent, AIProxy, Armour, Attack, Cost, ...)[26]
      // campaigns/army_spart_hero_leonidas: OBJECT (@parent, AIProxy, Armour, Attack, Cost, ...)[27]


  var props = {};

  H.each(templates, function(key, tpl){

    if (counter < 30) {
      // logObjectShort(tpl);
      // if (getAttr(tpl)){
      //   deb("  > %s", key);
      //   deb("      @%s", tpl["@parent"]);
      //   deb("      ", getAttr(tpl))
      //   counter += 1;
    }

    H.attribs(tpl).forEach(function(attr){

      if (props[attr] === undefined) {
        props[attr]  = 0;
      } else {
        props[attr]  += 1;        
      }

    });



  });

  var sorted = H.attribs(props).sort(function(a, b){return props[b] > props[a]; });

  sorted.forEach(function(attr){
    deb("  %s: %s", attr, props[attr]);
  });

  deb(" TEMPL: ----------------------");

};



// var logError = function(e, msg){
//   // used in try/catch
//   deb("  ");
//   deb(" Error: %s | %s", msg||"", e.message);
//   deb("      : %s [%s]", e.fileName, e.lineNumber);
//   deb("  ");

// };

// loggable functions
function logFn(fn){return fn.toString().split("\n").join("").slice(0, 80);}

// from events
var logDispatcher = function (){
  deb("  "); deb("      : Dispatcher");
  H.each(H.Dispatcher, function(id, ar){
    var tpl = H.Entities[id] ? H.Entities[id]._templateName : "???";
    deb("  %s: len: %s, tpl: %s", H.tab(id, 4), ar.length, tpl);
  });
  deb("  "); 
};


var dumpPassability = function(mapname, passability){

  // dumps all bits into single files
  // works nicely with Gimp's File > open as Layers

  var 
    i, b, w = passability.width, h = passability.height, 
    pass = passability.data, len = pass.length;

  deb(); deb("DUMP  : passability %s, %s, %s", mapname, w, h);

  [0, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512].forEach(b => {

    var data = [];
    i = len;
    while (i--){
      data[i] = pass[i] & b ? 128 : 255; // set bits are grey, not set white
    }
    data.length = len;
    Engine.DumpImage(mapname + "-passability-" + b + ".png", data, w, h, 255);    

  });

};


var logStart = function(ss, gs, settings){

  var H = HANNIBAL, id = settings.player;

  deb("------: LAUNCHER.CustomInit: Players: %s, PID: %s, difficulty: %s", H.count(ss.playersData), id, settings.difficulty);
  deb();
  deb();
  deb("     A:    map from tester:  %s", TESTERDATA ? TESTERDATA.map : "unkown");
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

var logPlayers = function(players){

  var 
    H = HANNIBAL, tab = H.tab, msg = "", head, props, format, tabs,
    fmtAEN = item => item.map(b => b ? "1" : "0").join("");

  deb();

  head   = "name, team, civ, phase,      pop,   ally,    enmy,      neut".split(", ");
  props  = "name, team, civ, phase, popCount, isAlly, isEnemy, isNeutral".split(", ");
  tabs   = [  10,    6,   8,    10,        5,      6,       6,         6];
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



function diffJSON (a, b) {

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
        rDelta = diffJSON(aVal, bVal);
      
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

}

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

  V: 0.1, agentx, CGN, JUl, 2014

*/


HANNIBAL = (function(H){

  H.AI = H.AI || {};

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
  }

  H.AI.Graph = function (data, options) {

    options = options || {};
    
    this.size  = data.length; // only quadratic grids
    this.data  = data;
    this.nodes = [];
    this.grid  = [];

    this.init();
    this.clear();

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
    setNeighbors: function(neighbors, node) {

      var x = node.x, y = node.y, grid = this.grid;

      neighbors[0] = grid[x-1][y];
      neighbors[1] = grid[x+1][y];
      neighbors[2] = grid[x][y-1];
      neighbors[3] = grid[x][y+1];

      neighbors[4] = grid[x-1][y-1];
      neighbors[5] = grid[x+1][y-1];
      neighbors[6] = grid[x-1][y+1];
      neighbors[7] = grid[x+1][y+1];

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
  }
  
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
        graph.setNeighbors(neighbors, currentNode);   // Find all neighbors for the current node.

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

return H; }(HANNIBAL));
/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- A S S E T S -------------------------------------------------

  handles a group's economic resources like estate, units, techs, buildings.
  provides the semantics for the DSL used in plugins


  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Asset = function(context){

    H.extend(this, {

      klass:    "asset",
      context:  context,
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
        "entities", // attackTypes, position
      ],

      eventlist: [
        "OrderReady",
        "AIMetadata",
        "TrainingFinished",
        "EntityRenamed",
        "ConstructionFinished",
        "Attacked",
        "Destroy",
      ],

      handler:   this.listener.bind(this),

      instance:  null,
      property:  null,
      resources: null,  //s
      users:     null,  //s

    });

  };

  H.LIB.Asset.prototype = {
    constructor: H.LIB.Asset,
    toString: function(){return H.format("[%s %s]", this.klass, this.name);},
    log: function(){
      deb(" ASSET: %s %s res: %s", this.instance.name, this.property, this.resources.length);
      this.resources.forEach( id => {
        deb("     A: %s, %s", this.id, this.entities[id]._templateName);
      });
    },
    clone: function(context){
      return (
        new H.LIB[H.noun(this.klass)](context)
          .import()
          .initialize(this.serialize())
      );
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    initialize: function (data){

      // name ??
      // id
      // instance     // the parent group 
      // property     // property name
      // resources    // array of ids
      // verb         // the action performed
      // hcq          // resource selector
      // shared       // or private
      // definition   // from group's assets
      // users        // list of ??? for shared asset users

      H.extend(this, data);

      // deb("   AST: initialized: %s for %s with hcq: %s", this, this.instance, this.hcq || "unknown");

      return this;

    },
    serialize: function(){
      return {
        id:         this.id,
        users:      H.deepcopy(this.users),
        property:   this.property,
        resources:  H.deepcopy(this.resources),
        definition: H.deepcopy(this.definition),
      };
    },
    toLog:    function(){return "    AST: " + this + " " + JSON.stringify(this, null, "      : ");},
    toOrder:  function(){
      return {
        verb:   this.verb, 
        hcq:    this.hcq, 
        source: this.id, 
        shared: this.shared
      };
    },
    toSelection: function(resources){
      // var id = this.context.idgen++;
      return (
        new H.LIB.Asset(this.context)
          .import()
          .initialize({
            // id:        id,
            name:      H.format("%s:%s#[%s]", this.instance.name, this.property, resources.join("|")),
            klass:     "asset.selection",
            instance:  this.instance, 
            property:  this.property, 
            resources: resources,
          })
      );
    },
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

    // asset properties
    get health () {return this.health(this.resources);},
    get count  () {return this.resources.length;},
    get first  () {return this.toSelection(this.resources.slice(0, 1));},
    get firstid() {return this.resources[0];},
    get center () {return this.map.getCenter(this.resources);},
    get spread () {return this.map.getSpread(this.resources);},
    get uaistates (){
      var state = {};
      this.resources.forEach(id => state[id] = this.unitstates[id]);
      return state;
    },      

    // asset effector actions
    destroy:  function(   ){this.effector.destroy(this.resources);},
    move:     function(pos){this.effector.move(this.resources, pos);},
    format:   function(fmt){this.effector.format(this.resources, fmt);},
    stance:   function(stc){this.effector.stance(this.resources, stc);},
    flee:     function(atk){this.effector.flee(this.resources, [atk.id]);},
    garrison: function(ast){this.effector.garrison(this.resources, ast.resources[0]);},
    gather:   function(ast){this.effector.gather(this.resources, ast.resources[0]);},
    collect:  function(tgs){this.effector.collect(this.resources, tgs.map(t => t.resources[0]));},
    repair:   function(ast){
      if (!ast.resources.length){H.throw("asset.repair: no resources");}
      this.effector.repair(this.resources, ast.firstid);
    },

    // asset helper
    match: function (asset){
      if(!this.resources){
        H.throw("ERROR : asset.match: this no resources " + this.name);
        return false;
      } else if (!asset.resources){
        H.throw("ERROR : asset.match: asset no resources " + asset);
        return false;
      }
      // deb("   AST: match %s in %s", uneval(asset.resources[0]), uneval(this.resources));
      return H.contains(this.resources, asset.resources[0]);
    },
    forEach: function(fn){

      // this.units.doing("idle").forEach(function(unit){
      //   this.units.stance("aggressive");
      //   unit.move(this.target.point);
      // });

      this.resources.forEach(id => {
        fn.call(this.instance, this.toSelection([id]));
      });

    },

    // asset info
    distanceTo: function(pos){this.map.distanceTo(this.resources, pos);},
    doing: function(/* [who,] filters */){ 

      // filters resources on unit ai state

      var 
        ids = [], 
        al      = arguments.length,
        who     = (al === 1) ? this.resources : arguments[0],
        filters = (al === 1) ? arguments[0] : arguments[1],
        actions = filters.split(" ").filter(a => !!a);

      actions.forEach(action => {
        who.forEach(id => {
          var state = this.unitstates[id];
          if (action[0] === "!"){
            if (state !== action.slice(1)){ids.push(id);}
          } else {
            if (state === action){ids.push(id);}
          }
        });
      });

      // deb("doing: actions: %s, states: %s, ids: %s", 
      //   actions, H.prettify(self.states(resources)), ids
      // );

      return this.toSelection(ids);

    },
    exists: function(amount){
      // for dynamic assets
      var hcq = this.groups.expandHCQ(this.definition[1], this.instance);
      return this.query(hcq).execute().length >= (amount || 1);
    },
    nearest: function(param){

      var hcq, pos, sorter, nodes, ids;

      // look for nearest from hcq
      if (H.isInteger(param)){

        hcq = this.groups.expandHCQ(this.definition[1], this.instance);

        // deb("   AST: nearest param: %s, hcq: %s", param, hcq);

        pos = ( Array.isArray(this.instance.position) ? 
            this.instance.position : 
            this.instance.position.location()
        );
        // deb("   AST: nearest pos: %s", pos);
        sorter = (na, nb) => {
          return (
            this.map.distance(na.position, pos) - 
            this.map.distance(nb.position, pos)
          );
        };
        nodes = this.query(hcq).execute().sort(sorter); // "node", 5, 5, "nearest"
        ids = nodes.map(node => node.id).slice(0, param || 1);

      // look for closest to point
      } else if (Array.isArray(param)){
        ids = [this.map.nearest(param, this.resources)];

      } else {
        H.throw("WARN  : Asset.nearest: got strange param: %s", param);
        // deb("WARN  : Asset.nearest: got strange param: %s", param);

      }

      // deb("   AST: nearest %s ids: %s, param: %s", this.name, ids, param);

      return this.toSelection(ids);
      
    },
    location:   function(id){

      // this should get a position for just everything

      var loc = [];

      if (id) {
        loc = this.map.getCenter([id]);
        // deb("   AST: location id: %s of %s, loc: %s", id, this, loc);

      } else if (this.position){
        loc = this.position.location();
        // deb("   AST: location this.position: %s of %s, loc: %s", this.position, this, loc);

      } else if (this.users.length) { // priotize shared, 
        // loc = this.map.centerOf(this.users.map(function(listener){
        //   var group = H.Objects(listener.callsign.split("#")[1]);
        //   if (group.position){
        //     return group.position.location();
        //   } else {
        //     return [];
        //   }
        // }));
        // deb("   AST: location users: %s of %s, loc: %s", H.prettify(this.users), this, loc);

      } else if (this.resources.length){
        // only undestroyed entities, with valid position
        // loc = H.Map.getCenter(this.resources.filter(id => !!H.Entities[id] && !!H.Entities[id].position() ));
        loc = this.map.getCenter(this.resources);
        // deb("   AST: location resources: %s of %s, loc: %s", H.prettify(this.resources), this, loc);

      } else {
        deb("  WARN: AST found no location for %s, res: %s", this, uneval(this.resources));

      }

      return loc;

    },    

    // events
    listener: function(msg){

      var asset, tpln, ent, maxRanges, attacker, id = msg.id;

      if (msg.name === "OrderReady"){

        if (msg.data.source === this.id){

          deb("   AST: listener.do: %s %s, res: %s, %s", msg.name, this, this.resources, uneval(msg));

          asset = this.toSelection([id]);

          // take over ownership
          this.metadata[id].opid   = this.instance.id;
          this.metadata[id].opname = this.instance.name;

          if (this.verb === "build"){
            tpln = this.entities[id]._templateName;
            if (tpln.contains("foundation")){
              this.isFoundation = true; //?? too greedy
              asset.isFoundation = true;
            } else {
              this.isStructure = true;  //??
              asset.isStructure = true;
            }
          }

          // finalize
          this.resources.push(id);
          this.instance.listener.onAssign(asset);          

        } // else { deb("   AST: no match: %s -> %s | %s", msg.data.source, this.id, this.name);}


      } else if (H.contains(this.resources, id)){

        if (msg.name === "Destroy") {

          deb("   AST: listener Destroy: %s, %s", this.name, uneval(msg));

          // no need to tell group about succesful foundations
          if (!msg.data.foundation){
            asset = this.toSelection([id]);
            this.instance.listener.onDestroy(asset);
          }

          // remove after so match works in instance
          H.remove(this.resources, id);


        } else if (msg.name === "Attacked") {

          // deb("   AST: X listener: %s, %s", this.name, uneval(msg));

          ent = this.entities[msg.id2];
          asset = this.toSelection([id]);
          maxRanges = ent.attackTypes().map(type => ent.attackRange(type).max);
          attacker = {
            id: msg.id2,
            position: ent.position(),
            range: Math.max.apply(Math, maxRanges)
          };

          this.instance.listener.onAttack(asset, attacker, msg.data.type, msg.data.damage);


        } else if (msg.name === "EntityRenamed") {

          // deb("   AST: X listener: %s, %s", this.name, uneval(msg));

          H.remove(this.resources, id);
          this.resources.push(msg.id2);

        } else if (msg.name === "ConstructionFinished") {

          // deb("   AST: X listener: %s, %s", this.name, uneval(msg));

          this.isFoundation = false;
          this.isStructure = true;
          asset = this.toSelection([id]);
          asset.isFoundation = false;
          asset.isStructure = true;
          this.instance.listener.onAssign(asset);

        }

      }

    },
  };

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

      klass:   "bot",
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

    this.name = H.format("%s:%s", this.context.name, "bot");

  };

  H.LIB.Bot.prototype = {
    constructor: H.LIB.Bot,
    toString: function(){return H.format("[%s %s]", this.klass, this.name);},
    log: function(){
      deb("   BOT: loaded: %s", this);
    },
    clone: function(context){
      return (
        new H.LIB.Bot(context)
          .import()
          .deserialize(this.serialize())
      );
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
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

  };

return H; }(HANNIBAL));  

/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, H, deb, uneval */

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


  H.LIB.Brain = function(context){

    H.extend(this, {
      name:  "brain",
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

  H.LIB.Brain.prototype = {
    constructor: H.LIB.Brain,
    log: function(){},
    clone: function(context){
      context.data[this.name] = this.serialize();
      return new H.LIB[H.noun(this.name)](context);
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    deserialize: function(){
      if (this.context.data[this.name]){
        H.extend(this, this.context.data[this.name]);
      }
    },
    serialize: function(){
      return {};
    },
    initialize: function(){
      return this;
    },
    activate: function(){

      this.events.on("Advance", msg => {
        deb(" BRAIN: onAdvance: %s", msg.data.technology);
      });

      this.events.on("Attacked", "*", msg => {
        deb(" BRAIN: Attacked: damage: %s, type: %s", msg.data.damage, msg.data.type);
      });

      this.events.on("BroadCast", msg => {
        deb(" BRAIN: BroadCast: %s", uneval(msg));
      });

    },
    tick: function(tick, secs){

      var t0 = Date.now();


      return Date.now() - t0;

    },

  };



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

    // "" disables H.Tester
    sequence:                "brain02",
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
/*globals HANNIBAL, deb, uneval */

/*--------------- C O N T E X T  ----------------------------------------------

  Hannibal's Bots can run in 3 different contexts: a) the game, b) a simulator and 
  c) the Explorer. Most importantly contexts differ in sensors and effectors,
  0AD saves and loads serialized contexts.

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/

HANNIBAL = (function(H){

  H.LIB.Context = function(name){

    this.defaults = {                                    // all primitive data
      name:           name,                              // used in logs
      connector:      "",                                // set by connecting
      time:           Date.now(),                        // time game created/saved 
      timeElapsed:    0,                                 // API data
      idgen:          1,                                 // seed for unique object ids
      turn:           0,                                 // increments on API tick
      tick:           0,                                 // increments on BOT tick
    };

    // stateful support objects, ordered, no dependencies to following objects
    this.serializers = [
      "events", 
      "culture",     // store, tree, phases
      "map",         // grids
      "resources",   // after map
      "villages", 
      "scanner",     // scanner after map, before groups
      "groups",      // assets
      "economy",     // stats, producers, orderqueue
      "military", 
      "brain", 
      // "bot", 
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
      // "resources",   // after map
      // "villages", 
      // "scanner",     // scanner after map, before groups
      "groups",      // assets
      "economy",     // stats, producers, orderqueue
      // "military", 
      // "brain", 
      // "bot", 
    ];

    // set initial properties
    H.extend(this, this.defaults, {data: {}});
    this.serializers.forEach(s => this.data[s] = null);

  };

  H.LIB.Context.prototype = {
    constructor: H.LIB.Context,
    log: function(){
      var data = {};
      H.each(this.defaults, name => data[name] = this[name]);
      deb("   CTX: %s", uneval(data));
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
        name:          this.name,
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

        } else if (!(action === "log" && !H.contains(this.logger, serializer))){
          ( obj[action] && obj[action]() );

        } else {
          deb("   IGN: logger: %s", serializer);
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

        // deb("   CTX: %s initialize: a: %s.%s", this.name, serializer, action);

        if (action === "create"){ 
          this[serializer] = new H.LIB[H.noun(serializer)](this);

        } else if (!(action === "log" && !H.contains(this.logger, serializer))){
          ( obj[action] && obj[action]() );

        } else {
          // logging for this serializer disabled

        }

      });

      deb("   CTX: %s initialized", this.name);

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

      this.updateEngine = function(sharedScript){
        ss = sharedScript;
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

        id:                  settings.player,                   // bot id, used within 0 A.D.
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
              deb("WARN  : Tools.health: id: %s in ids, but not in entities, type: %s", id, typeof id);
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

  };

return H; }(HANNIBAL));  
/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, logObject, uneval */

/*--------------- C U L T U R E  ----------------------------------------------

  Models features of 0 A.D. civilisations as mesh network based on a triple store.
  

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Phases = function(context){

    H.extend(this, {

      name:     "phases",
      context:  context,
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

  H.LIB.Phases.prototype = {
    constructor: H.LIB.Phases,
    log: function(){
      deb();
      deb("PHASES: current: '%s'", this.current);
      deb("     P: 1: %s", JSON.stringify(this["1"]));
      deb("     P: 2: %s", JSON.stringify(this["2"]));
      deb("     P: 3: %s", JSON.stringify(this["3"]));
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
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
          deb("PHASES: onAdvance: set new phase %s", this.current);
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

  };

  H.LIB.Tree = function(context){

    H.extend(this, {

      name:  "tree",
      context:  context,
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

  H.LIB.Tree.prototype = {
    constructor: H.LIB.Tree,
    log: function(){
      deb(); deb("  TREE: expanded %s sources into %s nodes", this.cntSources, H.count(this.nodes));
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
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
        tech, name, producers, nodes = this.nodes, t0 = Date.now(),
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
        push = item => this.sources.push([depth, item]);

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

          // unit promotion
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

  };    

  H.LIB.Culture = function(context){

    H.extend(this, {

      name:    "culture",
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

  H.LIB.Culture.prototype = {
    constructor: H.Culture,
    log: function (){
      deb();
      deb("  CULT: civ: %s, templates: %s, %s verbs, %s nodes, %s edges, %s ingames", 
        this.civ,
        H.count(this.templates),
        this.verbs.length,
        this.cntNodes,
        this.cntEdges,
        this.cntIngames
      );
      this.query("INGAME SORT < id").execute("metadata", 5, 80, "culture.log: ingames with metadata");
      this.phases.log();
      this.tree.log();
      this.store.log();

    },
    import: function (){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function (context){
      return new H.LIB[H.noun(this.name)](context);
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

      H.each(this.store.nodes, (name, node) => {
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

      this.events.on("EntityRenamed", msg => {
        this.loadById(msg.id2);
        H.Triggers.add(-1, this.removeById.bind(this, msg.id));
        // this.removeById(msg.id);
      });

      // this.events.on("AIMetadata", msg => {
      //   this.loadById(msg.id);
      // });

      this.events.on("Destroy", msg => {
        if (!msg.data.foundation){
          this.removeById(msg.id);
        }
      });

      this.events.on("Advance", this.tree.id, msg => {
        // this.loadByName(msg.data.technology);
      });

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

          if (conf.deb){deb("     C: Node added: %s for %s", name, type);}

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
        targetNodes = [], cntEdges = 0, key, name, 
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

        if (!nodeSource){deb("ERROR : loadEntities nodeSource: %s", nodeSourceName);}
        if (!nodeTarget){deb("ERROR : loadEntities nodeTarget: %s", nodeTarget.name);}

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
        deb("WARN  : culture.removeById failed on id: %s, tpl: %s", id, tpln);
        this.query("INGAME SORT < id").execute("metadata", 5, 50, "removeById: ingames with metadata");

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
            deb("WARN  : node.slots on invalid id: %s, tpl: %s", id, entities[id].templateName() || "???");
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

      var store = this.store, nodeTarget, counter = 0;

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
              deb("ERROR : {civ} but no Indetity.Civ");
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
              deb("ERROR : {civ} but no Indetity.Civ");
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

  };

  // H.Culture = function(tree, debug){

  //   deb();deb();deb("  CULT: build culture/store for player id: %s, %s", tree.id, tree.civ);

  //   this.debug = debug || 0;

  //   this.civ  = tree.civ;
  //   this.tree = tree;
  //   this.tree.culture = this;

  //   this.verbs = H.Data.verbs;
  //   this.store = new H.LIB.Store(tree.civ);
  //   this.verbs.forEach(this.store.addVerb.bind(this.store)); //??

  //   // stores nodes found in templates
  //   this.classes = [];
  //   this.technologies = [];
  //   this.resources = [];
  //   this.resourcetypes = [];

  // };

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

  H.Data = H.Data || {};

  H.Data.Groups = H.Data.Groups || {};

  H.Data.Groups.whitelist = [
    "onLaunch",       // group instance launched
    "onAssign",       // resource added to asset
    "onDestroy",      // final call
    "onAttack",       // enemies become a thread
    "onInterval",     // ticking
    "onConnect",      // user added to shared asset
    "onDisConnect",   // remove user from shared asset
    "onBroadcast",    // bot radio
    "onRelease"       // de-garrison
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
/*globals HANNIBAL, deb, uneval */

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

      klass:    "stats",
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

  H.LIB.Stats.prototype = {
    constructor: H.LIB.Stats,
    toString: function(){return H.format("[%s %s:%s]", this.klass, this.context.name, this.name);},
    log: function(){
      deb();
      deb("   STS: stock: %s", JSON.stringify(this.stock));
    },
    initialize: function(){
      this.tick();
      return this;
    },
    clone: function(context){
      return (
        new H.LIB[H.noun(this.name)](context)
          .import()
          .deserialize(this.serialize())
      );
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
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

  };

  H.LIB.Producers = function(context){

    H.extend(this, {

      name:    "producers",
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

  H.LIB.Producers.prototype = {
    constructor: H.LIB.Producers,
    log: function(){
      var count;
      deb();
      if ((count = H.count(this.producers))){
        deb("   PDC: have %s producers", count);
        H.attribs(this.producers)
          .sort((a, b) => ~~a < ~~b ? -1 : 1)
          .forEach( nameid => {
            var [name, id] = nameid.split("#");
            deb("   PDC: %s %s", id, this.infoProducer(name));
        });
      } else {
        deb("   PDC: log: no producer registered");
      }
    },
    logTick: function(){
      var count, name, id, allocs, queue, t = H.tab;
      if ((count = H.count(this.producers))){
        deb("   PDC: have %s producers", count);
        deb("*");
        H.attribs(this.producers)
          // .filter(a => this.producers[a].queue.length)
          .sort((a, b) => this.producers[a].queue.length > this.producers[b].queue.length ? -1 : 1)
          .forEach( nameid => {
            [name, id] = nameid.split("#");
            allocs = this.producers[nameid].allocs;
            queue  = this.producers[nameid].queue;
            deb("     P: %s %s %s ", t("#" + id, 4), t(allocs,3), uneval(queue), nameid);
        });
        deb("*");
      } else {
        deb("   PDC: log: no producer registered");
      }
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function(context){
      return (
        new H.LIB[H.noun(this.name)](context)
          .import()
          .initialize(this.serialize())
      );
    },
    deserialize: function(data){ // child
      deb("   PDC: deserialize.in: %s", uneval(data));
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
      // deb("   PDC: finalize.in: %s", uneval(this.producers));
      if (!this.producers){
        this.producers = {};
        // this.query("INGAME").execute().forEach(this.register.bind(this));
        this.query("INGAME").execute().forEach(this.register, this);
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
          deb("   PDC: removed id: %s, name: %s", id, info.name);
        }        
      });

    },  
    // canqueue: function(producer, amount){
    //   return producer.queue.length + amount < this.maxqueue;
    // },
    queue: function(producer, taskidOrTech){
      producer.queue.push(taskidOrTech);
      deb("   PDC: queued: task: %s in queue: %s | %s", taskidOrTech, producer.queue, producer.name);
    },
    unqueue: function(verb, taskidOrTech){

      // probably slow

      var found = false;

      H.each(this.producers, (name, producer) => {
        if(!found && producer.queue.length){
          if (H.delete(producer.queue, task => task === taskidOrTech)){
            found = true;
            deb("   PDC: unqueue: removed task: %s from queue: %s | %s", taskidOrTech, producer.queue, producer.name);
          }
        }
      });

      if (!found) {
        deb("   PDC: unqueue: not found in any queue: %s, %s", verb, taskidOrTech);
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
            found = !!tree[producer.name].products.build[product];
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

  };

  H.LIB.Order = function(context){

    H.extend(this, {

      name: "order",
      context: context,
      imports: [
        // "id",
        "bot",
        "economy",
        "query",
        "culture",
        "technologies",
        "events",
      ],

    });

    //TODO: make units move to order.position

  };

  H.LIB.Order.prototype = {
    constructor: H.LIB.Order,
    log: function(){},
    logTick: function(){},
    initialize: function(order){
      H.extend(this, order, {
        id:         order.id         || this.context.idgen++,
        processing: 0,
        remaining:  order.remaining  || order.amount,
        product:    null,
        x:          order.location ? order.location[0] : undefined,
        z:          order.location ? order.location[1] : undefined,
      });
      return this;
    },
    clone: function(context){
      return (
        new H.LIB[H.noun(this.name)](context)
          .import()
          .initialize(this.serialize())
      );
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
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

        // looking for a technology
        verb === "research" ? this.hcq :

        // looking for unit not assigned to a group
        verb === "train" ? this.hcq + " INGAME WITH metadata.opname = 'none'" :
        
        // looking for a shared structure
        verb === "build" && this.shared ? this.hcq + " INGAME WITH metadata.opmode = 'shared'" :

        // looking for abandoned structure not assigned to a group
        verb === "build" && !this.shared ? this.hcq + " INGAME WITH metadata.opname = 'none'" :

        // error
          deb("ERROR : assignExisting run into unhandled case: %s, shared: %s", this.verb, this.shared)
      
      );

      if (verb === "train" || verb === "build"){
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
        deb("   ORD: assignExisting: looking for '%s' ????????", this.hcq);
      }

    },

  };
  H.LIB.Orderqueue = function(context){

    H.extend(this, {

      name:    "orderqueue",
      context:  context,
      imports:  [
        "economy",
        "groups",
      ],

      report: {rem: [], exe: [], ign: []},
      tP: 0, // processing time, msecs
      queue: null,

      logProcessing: false,
      logWaiting:    false,

    });

  };

  H.LIB.Orderqueue.prototype = {
    constructor: H.LIB.Orderqueue,
    log: function(){
      deb();
      if (this.queue.length){
        this.queue.forEach( order => {
          order.log();
        });
      } else {
        deb("   ORQ: empty");
      }
    },
    logTick: function(){

      var 
        msg  = "", tb = H.tab,
        header = "  id,     verb, amt, pro, rem, nodes, flags,                 source | template".split(","),
        tabs   = "   4,       10,   5,   5,   5,     7,     7,                    24".split(",").map(s => ~~s),
        head   = header.map(String.trim).slice(0, -1),
        retr = {
          id:       o => "#" + o.id,
          verb:     o => o.verb,
          amt:      o => o.amount,
          rem:      o => o.remaining,
          pro:      o => o.processing,
          nodes:    o => o.nodes ? o.nodes.length : 0,
          flags:    o => (o.product ? "P" : "_"),
          source:   o => this.groups.findAssets(ast => ast.id === o.source)[0].name || "no source :(",
        };

      deb("   ORQ: length: %s, rep: %s", this.queue.length, uneval(this.report));
      if (this.queue.length){
        deb("*");
        deb("     Q: %s", header);
        this.queue
          .sort((a,b) => a > b ? 1 : -1)
          .forEach(o => {
            msg = "";
            H.zip(head, tabs, (h, t) => {
              msg += tb(retr[h](o), t);
            });
            deb("     Q: %s | %s", msg, o.product ? o.product.name : "no product");
          });
        deb("*");
      }

    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function(context){
      return (
        new H.LIB[H.noun(this.name)](context)
          .import()
          .initialize(this.serialize())
      );
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
      var i = this.queue.length;
      while(i--){if (fn(this.queue[i])){return this.queue[i];}}
      return undefined;
    },
    process: function(){

      var 
        t0 = Date.now(), 
        amount, msg, t = H.tab, 
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

      // rep / debug
      // msg = "    OQ: #%s %s amt: %s, rem: %s, pro: %s, verb: %s, nodes: %s, from %s ([0]: %s)";
      // queue
      //   .forEach(o => {
      //     var 
      //       isWaiting = o.remaining === o.processing,
      //       exec = o.executable ? "X" : "-",
      //       source = H.isInteger(o.source) ? this.groups.findAsset(o.source).name : o.source,
      //       nodename = o.nodes.length ? o.nodes[0].name : "hcq: " + o.hcq.slice(0, 40);
      //     if(!(isWaiting && !logWaiting)){
      //       deb(msg, t(o.id, 3), exec, t(o.amount, 2), t(o.remaining, 2), t(o.processing, 2), o.verb.slice(0,5), t(o.nodes.length, 3), source, nodename);
      //     }
      // });

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

          // final global budget check
          if (eco.fits(product.costs, budget, amount)){

            switch(order.verb){

              case "train":
                eco.do("train", amount, order); 
                eco.subtract(product.costs, budget, amount);
                rep.exe.push(id + ":" + amount);
              break;

              case "build":
                if (!hasBuild){
                  hasBuild = true;
                  eco.do("build", 1, order); 
                  eco.subtract(product.costs, budget, 1);
                  rep.exe.push(id + ":" + amount);
                } else {
                  deb("    OQ: #%s build postponed (%s)", t(id, 3), product.name);
                }
              break;

              case "research":
                eco.do("research", amount, order);
                eco.subtract(product.costs, budget, amount);
                rep.exe.push(id + ":" + amount);
              break;

              default:
                deb("ERROR : orderQueue.process: #%s unknown order.verb: %s", id, order.verb);

            }

          } else {
            rep.ign.push(id);

          }


      });

      queue
        .filter( order => order.remaining === 0)
        .forEach( order => {
          rep.rem.push(order.id);
          H.remove(this.queue, order);
      });

      this.tP = Date.now() - t0;

    }   
  };

  H.LIB.Economy = function(context){

    H.extend(this, {

      name: "economy",
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

  H.LIB.Economy.prototype = {
    constructor: H.LIB.Economy,
    log: function(){
      this.childs.forEach(child => this[child].log());
    },
    logTick: function(){
      
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

    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function (context){
      return new H.LIB[H.noun(this.name)](context);
    },
    serialize: function(){
      return {
        stats:      this.stats.serialize(),
        producers:  this.producers.serialize(),
        orderqueue: this.orderqueue.serialize(),
      };
    },
    deserialize: function(){
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
    },
    initialize: function(){
      this.childs.forEach( child => {
        if (!this[child]){
          // deb("   ECO: child.initialize: %s", child);
          this[child] = new H.LIB[H.noun(child)](this.context)
            .import()
            .initialize();
        }
      });
      return this;
    },
    finalize: function(){
      this.childs.forEach( child => {
        if (this[child].finalize){
          this[child].finalize();
        } 
      });
    },
    activate: function(){
      
      var order;

      this.events.on("EntityRenamed", msg => {
        this.producers.remove(msg.id);
        this.producers.register(msg.id2);
      });

      // new technology
      this.events.on("Advance", msg => {
        if (this.orderqueue.delete(order => order.hcq === msg.data.technology)){
          this.producers.unqueue("research", msg.data.technology);
          deb("   ECO: onAdvance: removed order with tech: %s", msg.data.technology);
        }        
      });

      // new producer
      this.events.on("ConstructionFinished", msg => {
        this.producers.register(this.query("INGAME WITH id = " + msg.id).first());
      });

      // new unit
      this.events.on("TrainingFinished", msg => {

        deb("   ECO: TrainingFinished id: %s, meta: %s", msg.id, uneval(this.metadata[msg.id]));

        if (!msg.data.task){
          deb("WARN   : ECO: got unit not ordered");
          return;
        }

        this.producers.register(msg.id);
        this.producers.unqueue("train", msg.data.task); 

        order = this.orderqueue.find(order => order.id === msg.data.order);
        order.remaining  -= 1;
        order.processing -= 1;
        
        this.events.fire("OrderReady", {
          player: this.id,
          id:     msg.id,
          data:   {order: msg.data.order, source: order.source}
        });

      });

      // new metadata
      this.events.on("AIMetadata", msg => {

        order = this.orderqueue.find(msg.data.order);
        order.remaining  -= 1;
        order.processing -= 1;

        deb("   ECO: on AIMetadata order: #%s from %s", order.id, this.groups.findAsset(order.source).name);
        
        // H.Objects(order.source).listener("Ready", id);  
        this.events.fire("OrderReady", {
          player: this.id,
          id:     msg.id,
          data:   {order: msg.data.order, source: order.source}
        });

      });

      // remove entity
      this.events.on("Destroy", msg => {
        this.producers.remove(msg.id);
      });

    },
    tick: function(tick, secs){

      var stock = this.stats.stock, t0 = Date.now();

      // sort availability by stock
      this.availability.sort((a, b) => stock[a] > stock[b] ? 1 : -1);

      this.orderqueue.process();

      this.orderqueue.logTick();
      this.producers.logTick();
      this.logTick();
      
      return Date.now() - t0;

    },
    multiply: function(cost, amount=1){
      cost.food  *= amount;
      cost.wood  *= amount;
      cost.metal *= amount;
      cost.stone *= amount;
    },
    subtract: function(cost, budget, amount=1){
      budget.food  -= cost.food  > 0 ? (cost.food  * amount) : 0;
      budget.wood  -= cost.wood  > 0 ? (cost.wood  * amount) : 0;
      budget.metal -= cost.metal > 0 ? (cost.metal * amount) : 0;
      budget.stone -= cost.stone > 0 ? (cost.stone * amount) : 0;
    },
    fits: function(cost, budget, amount=1){
      return (
        ((cost.food  || 0) * amount) <= (budget.food  || 0) &&
        ((cost.wood  || 0) * amount) <= (budget.wood  || 0) &&
        ((cost.stone || 0) * amount) <= (budget.stone || 0) &&
        ((cost.metal || 0) * amount) <= (budget.metal || 0)
      );  
    },
    diff: function(cost, budget, amount=1){
      return {
        food:   (budget.food   || 0) - (cost.food   || 0 * amount),
        wood:   (budget.wood   || 0) - (cost.wood   || 0 * amount),
        stone:  (budget.stone  || 0) - (cost.stone  || 0 * amount),
        metal:  (budget.metal  || 0) - (cost.metal  || 0 * amount),
        pop  :  (budget.pop    || 0) - (cost.pop    || 0 * amount),
        popcap: (budget.popcap || 0) - (cost.popcap || 0 * amount),
      };
    },
    request: function(order){
      
      // probably useless layer, but eco may reject orders...
      //     entityCounts: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]
      //     entityLimits: OBJECT (Apadana, Council, DefenseTower, Embassy, Fortress, ...)[13]

      var  
        objorder,
        // debug
        sourcename = this.groups.findAssets(ast => ast.id === order.source)[0].name,  // this is an group instance
        loc = (order.location === undefined) ? "undefined" : H.fixed1(order.location);

      if (order.verb === "build" && order.x === undefined){
        H.throw("ERROR : %s order without position, source: %s", verb, sourcename);
      }

      objorder = new H.LIB.Order(this.context).import().initialize(order);
      this.orderqueue.queue.push(objorder);

      deb("  EREQ: #%s, %s amount: %s, cc: %s, loc: %s, from: %s, shared: %s, hcq: %s",
        objorder.id, 
        objorder.verb, 
        objorder.amount, 
        objorder.cc || "NO CC" , 
        loc, 
        sourcename,  // that's an asset
        objorder.shared, 
        objorder.hcq.slice(0, 40)
      );

    },
    do: function(verb, amount, order){

      var 
        pos, task, 
        product  = order.product,
        id = product.producer.id, 
        msg = ( verb === "build" ?
          "   EDO: #%s %s, producer: %s, amount: %s, tpl: %s, x: %s, z: %s" : 
          "   EDO: #%s %s, producer: %s, amount: %s, tpl: %s"
        );

      order.processing += amount;

      switch(verb){

        case "train" :
          task = this.context.idgen++;
          this.producers.queue(product.producer, task);
          deb(msg, order.id, verb, id, amount, product.key); 
          this.effector.train([id], product.key, amount, {order: order.id, task: task, cc:order.cc});
        break;

        case "research" : 
          this.producers.queue(product.producer, product.name);
          deb(msg, order.id, verb, id, 1, product.key); 
          this.effector.research(id, product.key);
        break;

        case "build" : 
          // needs no queue
          pos = this.map.findGoodPosition(product.key, [order.x, order.z]);
          deb(msg, order.id, verb, id, 1, product.key, order.x.toFixed(0), order.z.toFixed(0)); 
          this.effector.construct([id], product.key, [pos.x, pos.z, pos.angle], {order: order.id, cc:order.cc});
        break;

      }

    },

  };

return H; }(HANNIBAL));



  // H.Economy = (function(){

  //       flowBarrack  = tree[cls("barracks")].flow;
  //       flowCentre   = tree[cls("civcentre")].flow;
  //       flowFortress = tree[cls("fortress")].flow;

  //       deb("   ECO: max flow centre  : %s ", uneval(flowCentre));
  //       deb("   ECO: max flow barracks: %s ", uneval(flowBarrack));
  //       deb("   ECO: max flow fortress: %s ", uneval(flowFortress));

  //     },

  //       // sort availability by stock
  //       self.availability.sort((a, b) => stock[a] > stock[b] ? 1 : -1);


  //       // H.OrderQueue.process();
  //       // H.OrderQueue.log();
  //       self.orderqueue.process();

  //       // deb("orderqueue: %s", H.attribs(self.orderqueue));

  //       self.orderqueue.log();
  //       self.logTick();
        
  //       return Date.now() - t0;

  //     },
  //     activate: function(){

  //       var node, order;

  //       H.Events.on("EntityRenamed", function (msg){

  //         node = H.QRY("INGAME WITH id = " + msg.id).first();
  //         if (node){
  //           self.producers.remove(node);
  //         } else {
  //           deb("WARN  : eco.activate.EntityRenamed: id %s no ingame", msg.id);
  //         }

  //         node = H.QRY("INGAME WITH id = " + msg.id2).first();
  //         if (node){
  //           self.producers.register(node.name);
  //         } else {
  //           deb("WARN  : eco.activate.EntityRenamed: id2 %s no ingame", msg.id);
  //         }
  //       });

  //       H.Events.on("Advance", function (msg){
  //         // works, but...
  //         if (self.orderqueue.delete(order => order.hcq === msg.data.technology)){
  //           self.producers.unqueue("research", msg.data.technology);
  //           deb("   ECO: onAdvance: removed order with tech: %s", msg.data.technology);
  //         }        
  //       });

  //       H.Events.on("ConstructionFinished", function (msg){
  //         self.producers.register(H.QRY("INGAME WITH id = " + msg.id).first().name);
  //         // H.Producers.loadById(msg.id);
  //       });

  //       H.Events.on("TrainingFinished", function (msg){

  //         deb("   ECO: TrainingFinished id: %s, meta: %s", msg.id, uneval(H.MetaData[msg.id]));

  //         node = H.QRY("INGAME WITH id = " + msg.id).first();
  //         if (node){
  //           self.producers.register(node.name);
  //         } else {
  //           deb("WARN  : eco.activate.TrainingFinished: id %s no ingame", msg.id);
  //         }

  //         // self.producers.register(H.QRY("INGAME WITH id = " + msg.id).first().name);
  //         // H.Producers.loadById(msg.id);
  //         self.producers.unqueue("train", msg.data.task); 

  //         order = H.Objects(msg.data.order);
  //         order.remaining  -= 1;
  //         order.processing -= 1;
          
  //         // H.Objects(order.source).listener("Ready", id);  
  //          H.Events.fire("OrderReady", {
  //           player: H.Bot.id,
  //           id:     msg.id,
  //           data:   {order: msg.data.order, source: order.source}
  //         });

  //       });

  //       H.Events.on("AIMetadata", function (msg){

  //         order = H.Objects(msg.data.order);
  //         order.remaining  -= 1;
  //         order.processing -= 1;

  //         deb("   ECO: on AIMetadata order: #%s from %s", order.id, H.Objects(order.source).name);
          
  //         // H.Objects(order.source).listener("Ready", id);  
  //         H.Events.fire("OrderReady", {
  //           player: H.Bot.id,
  //           id:     msg.id,
  //           data:   {order: msg.data.order, source: order.source}
  //         });

  //       });

  //       // H.Events.on("Advance", function (msg){
  //       //   self.producers.unqueue("research", msg.data.technology);  
  //       // });

  //       H.Events.on("Destroy", function (msg){
  //         self.producers.remove(msg.id);
  //         // deb("   ECO: got Event destroy for id: %s", msg.id);
  //       });


  //     },
  //     monitorGoals: function(){

  //     },
  //     getPhaseNecessities: function(context){ // phase, centre, tick
        
  //       var 
  //         cls = H.class2name,
  //         cc  = context.centre,
  //         housePopu = H.QRY(cls("house")).first().costs.population * -1,
          
  //         technologies = [],
  //         launches = {

  //           "phase.village": [

  //              //  tck, amount,       group,        params
  //              [   2, [1, "g.supplier",   {cc: cc, size: 4, resource: "food.fruit"}]],
  //              [   2, [1, "g.supplier",   {cc: cc, size: 1, resource: "food.meat"}]],
  //              [   2, [1, "g.supplier",   {cc: cc, size: 5, resource: "wood"}]],
  //              [   3, [1, "g.builder",    {cc: cc, size: 2, building: cls("house"),      quantity: 2}]],
  //              [   4, [1, "g.builder",    {cc: cc, size: 2, building: cls("farmstead"),  quantity: 1}]],
  //              [   4, [1, "g.builder",    {cc: cc, size: 2, building: cls("storehouse"), quantity: 1}]],
  //              [  10, [1, "g.harvester",  {cc: cc, size: 5}]],
  //              [  20, [1, "g.supplier",   {cc: cc, size: 5, resource: "stone"}]],
  //              [  30, [1, "g.supplier",   {cc: cc, size: 5, resource: "metal"}]],

  //           ],
  //           "phase.town" :   [
  //              [  10, [1, "g.supplier",   {cc: cc, size: 15, resource: "wood"}]],
  //              [  10, [1, "g.supplier",   {cc: cc, size: 15, resource: "stone"}]],
  //              [  10, [1, "g.supplier",   {cc: cc, size: 15, resource: "metal"}]],

  //           ],
  //           "phase.city" :   [

  //           ],
  //         };

  //       return {
  //         launches: launches,
  //         technologies: technologies,
  //         messages: messages,
  //       };

  //     },
  //     updateActions: function(phase){

  //       var 
  //         groups,
  //         ressTargets = {
  //           "food":  0,
  //           "wood":  0,
  //           "stone": 0,
  //           "metal": 0,
  //           "pop":   0,
  //         };

  //       deb();deb();deb("   ECO: updateActions phase: %s", phase);
  //       self.planner  = H.Brain.requestPlanner(phase);

  //       // deb("     E: planner.result.data: %s", uneval(planner.result.data));

  //       ressTargets.food  = self.planner.result.data.cost.food  || 0 + self.planner.result.data.ress.food;
  //       ressTargets.wood  = self.planner.result.data.cost.wood  || 0 + self.planner.result.data.ress.wood;
  //       ressTargets.metal = self.planner.result.data.cost.metal || 0 + self.planner.result.data.ress.metal;
  //       ressTargets.stone = self.planner.result.data.cost.stone || 0 + self.planner.result.data.ress.stone;

  //       deb("     E: ress: %s", uneval(ressTargets));

  //       goals = self.getActions(self.planner);

  //       groups = H.Brain.requestGroups(phase);
  //       groups.forEach(g => deb("     E: group: %s", g));

  //       groups.forEach(group => {
  //         var [count, name, cc, options] = group;
  //         H.extend(options, {name: name, cc: cc});
  //         H.loop(count, () => {
  //           H.Groups.launch(options);
  //         });
  //       });

  //       // H.Groups.log();

  //       deb("   ECO: updateActions -------");deb();

  //     },



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
/*globals HANNIBAL, Engine, deb, uneval */

/*--------------- E F F E C T O R S -------------------------------------------

  Interface to the current engine (0AD or simulator)



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){


  // Engine.PostCommand(PlayerID,{"type": "set-shading-color", "entities": [ent], "rgb": [0.5,0,0]});

  H.LIB.Effector = function(context){

    H.extend(this, {

      klass: "effector",
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

  H.LIB.Effector.prototype = {
    constructor: H.LIB.Effector,
    toString: function(){return H.format("[%s %s]", this.klass, this.name);},
    log: function(){
      deb();deb("   EFF: connector: '%s'", this.connector);        
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
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

  H.LIB.Effector.engine = {

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
      Engine.DumpImage(H.APP.map + "-" + name + ".png", grid.toArray(), grid.width, grid.height, threshold);    
    },
    dumparray: function(name, array, width, height, threshold){
      Engine.DumpImage(H.APP.map + "-" + name + ".png", array, width, height, threshold);    
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

      deb("   EFF: format: %s", uneval(arguments));

      // Scatter, Line Open, Box, passive, standground

      if (who.length && H.contains(H.Data.formations, what)){

        Engine.PostCommand(this.id, {type: "formation", 
          entities: who, 
          name :    what, 
          queued:   false 
        });

      } else { deb("   EFF: ignored format : %s", uneval(arguments)); }

    },

    stance: function(who, what){

      // deb("   EFF: stance: %s", uneval(arguments));

      if (who.length && H.contains(H.Data.stances, what)){

        Engine.PostCommand(this.id, {type: "stance", 
          entities: who, 
          name :    what, 
          queued:   false 
        });

      } else { deb("   EFF: ignored stance: %s", uneval(arguments)); }

    },

    flee: function(who, whom){

      deb("   EFF: flee: %s", uneval(arguments));

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

      } else { deb("   EFF: ignored flee: %s", uneval(arguments)); }

    },

    move: function(who, where){

      // deb("   EFF: move: %s", uneval(arguments));

      if (who.length && where.length === 2){

        Engine.PostCommand(this.id, {type: "walk", 
          entities: who, 
          x: where[0], 
          z: where[1], 
          queued: false 
        });

      } 
      // else { deb("   EFF: ignored move %s", uneval(arguments));}

    },

    destroy: function(who){

      deb("   EFF: destroy: %s", uneval(arguments));

      if (who.length){

        Engine.PostCommand(this.id, {type: "delete-entities", 
          entities: who
        });

      } else { deb("   EFF: ignored destroy who: %s", uneval(arguments)); }

    },

    garrison:     function(who, where){

      deb("   EFF: garrison: %s", uneval(arguments));

      if (who.length && H.isInteger(where)){

        Engine.PostCommand(this.id, {type: "garrison", 
          entities: who,       // array
          target:   where,     // id
          queued:   false
        });

      } else { deb("   EFF: ignored garrison: %s", uneval(arguments)); }

    },

    collect: function (who, what){

      deb("   EFF: collect: %s", uneval(arguments));

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

      } else { deb("   EFF: ignored collect: %s", uneval(arguments)); }

    },

    skim: function (who, what){

      deb("   EFF: skim: %s", uneval(arguments));

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

      } else {deb("   EFF: ignored skim:", uneval(arguments)); }

      // case "gather-near-position":
      //   GetFormationUnitAIs(entities, player).forEach(function(cmpUnitAI) {
      //     cmpUnitAI.GatherNearPosition(cmd.x, cmd.z, cmd.resourceType, cmd.resourceTemplate, cmd.queued);
      //   });
      //   break;

    },

    gather: function(who, what){

      // deb("   EFF: gather: %s", uneval(arguments));

      if (who.length && H.isInteger(what)){

        Engine.PostCommand(this.id, {type: "gather", 
          entities: who, 
          target:   what, 
          queued:   false
        });

      } else { deb("   EFF: ignored gather: %s", uneval(arguments)); }

    },

    repair: function(who, what){

      // deb("   EFF: repair: %s", uneval(arguments));

      if (who.length && H.isInteger(what)){

        Engine.PostCommand(this.id, {type: "repair", 
          entities: who,  // Array
          target:   what, // Int
          autocontinue: true, 
          queued: false
        });

      } else { deb("   EFF: ignored repair: %s, who, what", uneval(arguments));}

    },

    train: function(who, what, amount, metadata){

      deb("   EFF: train: %s, id: %s", uneval(arguments), uneval(this.id));

      if (who.length && this.templates[what] && amount){

        Engine.PostCommand(this.id, {type: "train", 
          count:    amount,
          entities: who, // array
          template: what,
          metadata: metadata || {} //{order: order.id}
        }); 

      } else { deb("   EFF: ignored train: %s", uneval(arguments)); }

    },

    construct: function(who, what, pos, metadata){

      deb("   EFF: construct: %s", uneval(arguments));

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

      } else { deb("   EFF: ignored construct: %s", uneval(arguments)); }

    },

    research: function(who, what){

      deb("   EFF: research: %s", uneval(arguments));

      if (H.isInteger(who) && H.TechTemplates[what]){

        Engine.PostCommand(this.id, { type: "research",
          entity:   who, 
          template: what 
        }); 

      } else { deb("   EFF: ignored research: %s", uneval(arguments)); }

    },


  };


return H; }(HANNIBAL));

/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval, logFn, logDispatcher */

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

      name: "events",
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

  H.LIB.Events.prototype = {
    constructor: H.LIB.Events,
    log: function(){
      deb();
      deb("EVENTS: have %s saved events", this.savedEvents.length);
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function(context){
      return new H.LIB[H.noun(this.name)](context);
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
        deb.apply(null, [msgTick].concat(lengths));
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
        deb("ERROR: Events.on is strange: %s", uneval(args));
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

      // deb("   EVT: dispatch %s|%s/%s/%s to %s listeners", msg.player, msg.name, msg.id, msg.id2, listeners.length);

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
        deb("WARN  : duplicate listener: %s %s, %s", player, type, logFn(listener));

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
        // deb("  EVTS: Create ent: %s, own: %s, tpl: %s, mats: %s", id, owner, tpln, H.attribs(e));
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

        // if(e.owner === 1)deb("   EVT: %s", uneval(msg));

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

      // deb("   EVT: got attacked: %s", uneval(e));

      if (this.entities[e.target]){

        this.fire("Attacked", {
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
        // deb("INFO  : got Destroy on '%s' entity", this.createEvents[e.entity]);
        // looks like a failed structure
        return;
      }

      if (!e.entityObj){
        deb("WARN  : EVT got destroy no entityObj for ent: %s, mats: %s", e.entity, H.attribs(e));
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

      if (this.dispatcher[msg.player][msg.id]){
        // delete(dispatcher[msg.player][msg.id]);
      }

    },

  };

  // // public interface
  // H.Events = (function(){

    //   var t0;

    //   return {
    //     boot:    function(){self = this; return self;},
    //     collect: function(newEvents){packs.push(newEvents);},
    //     logTick: function(events){
    //       var lengths = orderedEvents.map(function(type){return events[type] ? events[type].length : 0;}),
    //           sum  = lengths.reduce(function(a, b){ return a + b; }, 0);
    //       if (sum){
    //         deb.apply(null, [msgTick].concat(lengths));
    //       }
    //     },
    //     tick:    function(){

    //       // dispatches new techs and finally fifo processes 
    //       // collected event packs and then single events in order defined above

    //       t0 = Date.now();

    //       processTechs();

    //       packs.forEach(function(events){
    //         self.logTick(events);
    //         orderedEvents.forEach(function(type){
    //           if (events[type]){
    //             events[type].forEach(function(event){
    //               handler[type](event);
    //             });
    //           }
    //         });
    //       });

    //       packs = [];
    //       createEvents = {};
    //       destroyEvents = {};

    //       return Date.now() - t0;

    //     },
    //     fire: function(name, msg){
    //       return dispatchMessage(new Message(name, msg));
    //     },
    //     readArgs: function (type /* [player, ] listener */) {

    //       var player, listener, callsign, args = H.toArray(arguments);

    //       if (args.length === 1 && typeof args[0] === "function"){
    //         type     = "*";
    //         player   = "*";
    //         listener = args[0];

    //       } else if (args.length === 2 && typeof args[1] === "function"){
    //         type     = args[0];
    //         player   = H.Bot.id;
    //         listener = args[1];

    //       } else if (args.length === 3 && typeof args[2] === "function"){
    //         type     = args[0];
    //         player   = args[1];
    //         listener = args[2];

    //       } else {
    //         deb("ERROR: Events.on is strange: %s", uneval(args));
    //         return [];

    //       }

    //       return [type, player, listener, "unknown"];

    //     },
    //     off: function (/* [type, [player, ]] listener */) {

    //       var [type, player, listener, callsign] = self.readArgs.apply(null, H.toArray(arguments));

    //       H.delete(dispatcher["*"]["*"],     l => l === listener);
    //       H.delete(dispatcher[player]["*"],  l => l === listener);
    //       H.delete(dispatcher[player][type], l => l === listener);

    //     },
    //     on: function (/* [type, [player, ]] listener */) {

    //       var [type, player, listener, callsign] = self.readArgs.apply(null, H.toArray(arguments));

    //       registerListener(player, type, listener);

    //       // allows to add/sub type afterwards
    //       return {
    //         add : function(type){registerListener(player, type, listener);},
    //         sub : function(type){removeListener(player, type, listener);}
    //       };

    //     },

    //   };

    // }()).boot();

return H; }(HANNIBAL));
/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- G E O M E T R Y ---------------------------------------------

  Deals with points, rectangke, circles, polygons



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/



HANNIBAL = (function(H){

  var 
    PIH = Math.PI / 2,
    PI2 = Math.PI * 2;

  H.Geometry = {};

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
/*globals HANNIBAL, Uint8Array, Uint32Array, deb, logObject */

/*--------------- G R I D S ---------------------------------------------------

  An API onto typed arrays, used for map analysis, path finding, attack planning
  can blur and other grahic methods



  V: 1.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){


  H.LIB.Grid = function(context){

    H.extend(this, {

      name:    "grid",
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

  H.LIB.Grid.prototype = {
    constructor: H.LIB.Grid,
    log: function(name){
      var stats = {},i = this.length,data = this.data;
      while (i--){stats[data[i]] = stats[data[i]] ? stats[data[i]] +1 : 1;}
      deb("   GRD: %s, min: %s, max: %s, stats: %s", H.tab(name || this.title, 12), this.min(), this.max(), H.prettify(stats));
    },    
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
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
  };


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
/*globals HANNIBAL, deb, logObject, uneval */

/*--------------- G R O U P S -------------------------------------------------

  Container for Groups, allows bot to query capabilities and launch instances


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, NOV, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Groups = function(context){

    H.extend(this, {

      name: "groups",
      context: context,
      imports: [
        "map",
        "metadata",
        "events",
        "culture",
        "query",
        "entities",
        "resources", // used in supply groups
        "economy",
      ],

      instances: [],

    });

  };

  H.LIB.Groups.prototype = {
    constructor: H.LIB.Groups,
    log: function(){
      var t = H.tab;
      deb();deb("GROUPS: %s instances", this.instances.length);
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
      deb("     G: -----------");
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function(context){
      context.data[this.name] = this.serialize();
      return new H.LIB[H.noun(this.name)](context);
    },
    serialize: function(){
      return this.instances.map(instance => instance.serialize());
    },
    initialize: function(){

      if (Array.isArray(this.context.data.groups)){
        this.context.data.groups.forEach(config => {
          this.launch(config);
        });
      
      } else {
        // load mayors and custodians from metadata
        this.launchOperators();

      }

      return this;

    },
    activate: function(){

      var host, order, instance;

      this.events.on("AIMetadata", function (msg){

        order = this.economy.orders[msg.data.order];

        if (order && order.shared){

          host = this.launch({name: "g.custodian", cc: order.cc});
          host.structure = ["private", "INGAME WITH id = " + msg.id];
          host.structure = this.createAsset({
            id: this.context.idgen++,
            instance: host,
            property: "structure",
          });

          this.metadata[msg.id].opname = host.name;
          this.metadata[msg.id].opid   = host.id;

          instance = this.instances.find(i => i.id === order.instance);
          host.listener.onConnect(instance.listener);

        }

      });


    },
    tick: function(tick, secs){

      // delegates down to all instances of all groups
      
      var interval, t0 = Date.now();
      
      this.instances.forEach(instance => {
        interval = ~~instance.interval; 
        if (interval > 0 && (tick % interval === 0) && instance.listener.onInterval){ 
          // instance.assets.forEach(asset => asset.tick(secs, tick)); //??
          instance.listener.onInterval(secs, tick);
        }
      });

      return Date.now() - t0;

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
    findGroups: function (fn){
      return this.instances.filter(fn);
    },
    findAssets: function (fn){
      var out = [];
      this.instances
        .forEach(instance => {
          instance.assets.forEach(asset => {
            if (fn(asset)){out.push(asset);}
          });
        });
      return out;
    },
    createAsset: function(config){

      // deb("  GRPS: createAsset.in: %s", H.attribs(config));

      var 
        asset = new H.LIB.Asset(this.context).import(), 
        id = config.id || this.context.idgen++,
        definition = config.definition, // || config.instance[config.property],
        name = H.format("%s:%s#%s", config.instance.name, config.property, id),
        verb = this.getAssetVerb(definition);

      // deb("  GRPS: createAsset: id: %s, name: %s, def: ", id, name, definition);
      // deb("  GRPS: createAsset: hcq: %s", this.expandHCQ(definition[1], config.instance));

      asset.initialize({
        id:          id,
        name:        name,
        instance:    config.instance,
        definition:  definition,
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

      // deb("  GRPS: created Asset: %s, res: %s", asset, uneval(asset.resources));
      
      return asset;
    },   
    getAssetVerb: function (definition){

      var found = false, treenode, verb;

      if (typeof definition[1] === "object"){

        return "claim";

      } else if (typeof definition[1] === "string") {

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
        deb("ERROR : AST: %s/%s or its hcq not found to build: %s", instance, token, hcq);

      }

      return hcq;

    },     
    dissolve: function(instance){

      instance.assets.forEach(asset => asset.release());
      instance.assets = null;
      H.remove(this.instances, instance);
      deb("  GRPS: dissolved %s", instance);

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
      // instance.structure = this.createAsset({
      //   instance: instance, 
      //   property: "structure",
      //   resources: [id]
      // });
      // instance.assets.push(instance.structure);
      
      // deb("  GRPS: appointed %s for %s, cc: %s", instance.name, this.entities[id], config.cc);

      return instance;

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
    claim: function(instance){},
    request: function(instance, amount, asset /* , location */ ){
      
      // sanitize args
      var 
        args = H.toArray(arguments),
        location = (
          args.length === 3 ? [] : 
          args[3].location ? args[3].location() :
          Array.isArray(args[3]) ? args[3] :
            []
        );

      asset.isRequested = true;

      // Eco requests are postponed one tick to avoid unevaluated orders in queue
        // this.economy.request(new H.LIB.Order(this.context).import().initialize({
        this.economy.request({
          amount:     amount,
          cc:         instance.cc,
          location:   location,
          verb:       asset.verb, 
          hcq:        asset.hcq, 
          source:     asset.id, 
          shared:     asset.shared,
        });

      // deb("   GRP: requesting: (%s)", args);    

    },

    launch: function(config){

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
        self = this,
        instance  = {
          klass:     "group",
          id:        config.id || this.context.idgen++,
          cc:        config.cc,
          groupname: config.groupname,
          listener:  {},

          resources: this.resources, // needs lexical signature
          economy:   this.economy,   //

        };

      // deb("  GRPS: have: %s, to launch %s", this.instances.length, uneval(instance));

      // copies values from the groups' definition onto instance
      H.each(H.Groups[config.groupname], (prop, value) => {
        
        if (prop === "listener") {
          H.each(value, (name, fn) => {
            instance.listener[name] = fn.bind(instance);
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

        // config:    config,

      H.extend(instance, {
        
        name:      config.groupname + "#" + instance.id,
        position:  config.position || this.map.getCenter([instance.cc]),
        assets:    [],
        detector:  null,

        dissolve:  self.dissolve.bind(self, instance),
        request:   self.request.bind(self, instance),
        claim:     self.claim.bind(self, instance),
        scan:      self.scan.bind(self, instance),
        toString:  function(){return H.format("[%s %s]", this.klass, instance.name);},
        register:  function(/* arguments */){
          // deb("     G: %s register: %s", instance.name, uneval(arguments));

          // transforms primitive definition into live object
          // except already done by deserialization

          H.toArray(arguments).forEach( property => {

            if (instance[property] instanceof H.LIB.Asset){
              deb("  GRPS: did not register '%s' for %s", property, instance);
            
            } else {
              instance[property] = self.createAsset({
                definition: instance[property],
                instance:   instance,
                property:   property,
              });
              instance.assets.push(instance[property]);
              // deb("  GRPS: registered '%s' for %s", property, instance);
            }

          });

        },
        serialize: function(){
          return {
            id:        instance.id,
            cc:        instance.cc,
            groupname: instance.groupname,
            name:      instance.name,
            position:  instance.position,
            assets:    instance.assets.map(a => a.serialize()),
          };

        },
      });
      
      // deserialize and register assets
      if (config.assets) {
        config.assets.forEach(cfg => {
          instance[cfg.property] = cfg.definition;
          instance[cfg.property] = self.createAsset(
            H.mixin(cfg, {instance:   instance})
          );
        });
      }

      // keep a reference
      this.instances.push(instance);

      // log before launching
      // deb("   GRP: launch %s args: %s", instance, uneval(config));

      // call and activate
      instance.listener.onLaunch(config);

      return instance;

    }

  };  

  // H.Groups = (function(){

    //   // Singleton

    //   var self, groups = {}, t0;

    //   return {
    //     boot: function(){self=this; return self;},
    //     log:  function(){
    //     },
    //     tick : function(secs, tick){
    //     },
    //     init: function(){
    //       deb();deb();deb("GROUPS: register...");
    //       H.each(H.Groups, function(name, definition){
    //         if (definition.active) {
    //           switch(name.split(".")[0]){
    //             case "g": 
    //               groups[name] = {
    //                 name: name,
    //                 definition: definition,
    //                 instances: []
    //               };
    //               deb("      : %s", name);
    //             break;
    //           }
    //         }
    //       });
    //     },
    //     isLaunchable: function(groupname){
    //       return !!groups[groupname];
    //     },
    //     scan: function(instance, position){

    //       if (!instance.detector){
    //         instance.detector = this.scanner.detector(position);
    //       }

    //       return instance.detector.scan(position);

    //     },
    //     claim: function(instance){},
    //     request: function(instance, amount, asset /* , location */ ){
          
    //       // sanitize args
    //       var 
    //         args = H.toArray(arguments),
    //         location = (
    //           args.length === 3 ? [] : 
    //           args[3].location ? args[3].location() :
    //           Array.isArray(args[3]) ? args[3] :
    //             []
    //         );

    //       asset.isRequested = true;

    //       // Eco requests are postponed one tick to avoid unevaluated orders in queue
    //       H.Triggers.add( -1,
    //         H.Economy.request.bind(H.Economy, new H.Order({
    //           amount:     amount,
    //           cc:         cc,
    //           location:   location,
    //           verb:       asset.verb, 
    //           hcq:        asset.hcq, 
    //           source:     asset.id, 
    //           shared:     asset.shared
    //         }))
    //       );

    //       // deb("   GRP: requesting: (%s)", args);    

    //     },
    //     moveSharedAsset: function(asset, id, operator){

    //       // overwrites former group asset with the operator's one 
    //       // creates downlink via onConnect
    //       // assigns shared asset to target operator, 

    //       // deb("   GRP: moveSharedAsset ast: %s, id: %s, op: %s", asset, id, operator);

    //       var group = asset.instance;

    //       group[asset.property] = operator.structure;
    //       operator.listener.onConnect(asset.instance.listener);
    //       group.listener.onAssign(operator.structure.toSelection([id])); // why not op.onAssign ???

    //       // instance.assets.push(instance[prop]);

    //       // deb("   GRP: %s took over %s as shared asset", operator, asset);

    //     },
    //     getGroupTechnologies: function(launch){

    //       // [   4,    1, "g.scouts",     {cc:cc, size: 5}],

    //       var def = groups[launch[2]].definition;

    //       return def.technologies || [];

    //     },
    //     getExclusives: function(launch){

    //       // [   4,    1, "g.scouts",     {cc:cc, size: 5}],

    //       deb("   GRP: getExclusives: %s", uneval(launch));

    //       var def = groups[launch[2]].definition;

    //       return def.exclusives ? def.exclusives(launch[3]) : {};

    //     },
    //     launch: function(options){

    //       // Object Factory; called by bot, economy, whatever

    //       var 
    //         instance  = {listener: {}},
    //         name      = options.name,
    //         group     = groups[name],
    //         copy      = function (obj){return JSON.parse(JSON.stringify(obj));},
    //         whitelist = H.Data.Groups.whitelist;

    //       if (!group){return deb("ERROR : can't launch unknown group: %s", name);}

    //       instance.id   = H.Objects(instance);
    //       instance.name = group.name + "#" + instance.id;
    //       instance.listener.callsign = instance.name;

    //       // keep a reference
    //       group.instances.push(instance);

    //       // first copies values, objects, arrays, functions from definition to instance
    //       H.each(group.definition, function(prop, value){

    //         if (prop === "listener") {

    //           whitelist.forEach(function(name){
    //             if (value[name] !== undefined) {
    //               instance.listener[name] = value[name].bind(instance);
    //             }
    //           });

    //         } else {
    //           switch (typeof value) {
    //             case "undefined":
    //             case "boolean":
    //             case "number":
    //             case "string":    instance[prop] = value; break;
    //             case "object":    instance[prop] = copy(value); break; // handles null, too
    //             case "function":  instance[prop] = value.bind(instance); break;
    //           }

    //         }

    //       });

    //       // second adds/(overwrites) support objects and functions
    //       H.extend(instance, {
    //         assets:     [],
    //         toString:   function(){return H.format("[group %s]", instance.name);},
    //         economy:    {
    //           request: H.Groups.request.bind(null, options.cc),
    //           claim:   H.Groups.claim.bind(null, options.cc)
    //         },
    //         register: function(/* arguments */){
    //           H.toArray(arguments).forEach(function(prop){
    //             instance[prop] = H.createAsset(instance, prop, []);
    //             instance.assets.push(instance[prop]);
    //           });
    //         },
    //         tick: function(secs, ticks){
    //           instance.assets.forEach(function(asset){
    //             asset.tick(secs, ticks);
    //           });
    //           instance.listener.onInterval(secs, ticks);
    //         },
    //         position: {
    //           // set intial position, gets probably overwritten
    //           location: (function(){
    //             var pos = H.Map.getCenter([options.cc]);
    //             return function(){return pos;};
    //           }())
    //         },
    //         postpone: function(ticks, fn /* , args*/){
    //           var args = H.toArray(arguments).slice(2);
    //           H.Triggers.add(H.binda(fn, instance, args), ticks *-1);
    //         },
    //         dissolve: function(){
    //           H.Groups.dissolve(instance);
    //         }

    //       });

    //       deb("   GRP: launch %s args: %s", instance, uneval(options));

    //       // call and activate
    //       instance.listener.onLaunch(options);

    //       return instance;

    //     }

    //   };  // return

    // }()).boot();

return H; }(HANNIBAL));

/*jslint bitwise: true, browser: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb */

/*--------------- GROUP: M I N E R --------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Groups = H.Groups || {};

  H.extend(H.Groups, {

    "g.builder" : {

      /*
        a group without units solely for the first/biggest CC

        Behaviour: 
          builds houses until pop max reached
          repairs houses if needed
          
      */

      active:         true,           // prepared for init/launch ...
      description:    "builder",     // text field for humans 
      civilisations:  ["*"],          // 
      interval:       4,              // call onInterval every x ticks
      parent:         "",             // inherit useful features

      capabilities:   "2 stone/sec",  // (athen) give the economy a hint what this group provides.

      position:       null,           // refers to the coords of the group's position/activities

      attackLevel:    0,              // increases with every attack, halfs on interval
      needsRepair:   80,              // a health level (per cent)
      needsDefense:  10,              // an attack level

      exclusives:    function(options){
        return {units : [options.size, ["exclusive", options.building + " BUILDBY"]]};
      },

      listener: {

        onLaunch: function(options /*cc, building, size, quantity*/){

          // deb("     G: onlaunch %s cc: %s, civ: %s", this, cc, H.Bot.civ);

          this.options = options;

          this.buildings = ["exclusive", options.building]; // ???????????????
          this.units = this.exclusives(options).units[1];
          // this.units = ["exclusive", building + " BUILDBY"];
          this.size = options.size; //H.Config.civs[H.Bot.civ].builders;
          this.quantity = options.quantity;

          this.register("units", "buildings");
          this.economy.request(1, this.units, this.position);   

        },
        onAssign: function(asset){

          deb("     G: %s %s onAssign ast: %s as '%s' res: %s", this, this.buildings, asset, asset.property, asset.first);
         
          if (this.units.match(asset)){

            if (this.units.count === 1){
              this.economy.request(1, this.buildings, this.position);   
            }

            if (this.units.count < this.size){
              this.economy.request(1, this.units, this.position);   
            }

            if (this.foundation){
              // deb("---------> : %s", this.foundation.health);
              asset.repair(this.foundation);
            }

          } else if (this.buildings.match(asset)){

            this.position = asset;

            if (asset.isFoundation){
              this.foundation = asset;
              this.units.repair(asset);
            
            } else if (asset.isStructure){
              if (this.buildings.count < this.quantity){
                this.economy.request(1, this.buildings, this.position);

              } else {
                this.dissolve();
              }

            }

          }


        },
        onDestroy: function(asset){

          deb("     G: %s onDestroy: %s", this, asset);

          if (this.units.match(asset)){
            this.economy.request(1, this.units, this.position);

          } else if (this.buildings.match(asset)){
            this.economy.request(1, this.buildings, this.position);

          }

        },
        onAttack: function(asset, enemy, type, damage){

          // deb("     G: %s onAttack %s by %s, damage: %s", this, asset, enemy, damage);

        },
        onBroadcast: function(){},
        onInterval:  function(){

          // deb("     G: %s onInterval, blds: [%s/%s], states: %s", this, this.buildings.count, this.maxBuildings, H.prettify(this.units.states()));

          // if (!this.units.count){return;}

          // if (this.units.doing("idle").count === this.units.count){
          //   if (this.buildings.count >= this.maxBuildings){
          //     this.dissolve();
          //     deb("      G: %s finished building ", this, this.buildings);
          //   }
          // }


        }

      } // listener

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
/*globals HANNIBAL, deb */

/*--------------- P L U G I N S -----------------------------------------------





  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.Groups = H.Groups || {};

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
      parent:         "",             // inherit useful features

      technologies: [                 // these techs help
                      "gather.capacity.wheelbarrow",
                      "celts.special.gather.crop.rotation",
                      "gather.farming.plows"
      ],

      // this got initialized by launcher
      position:       null,           // coords of the group's position/activities

      // ASSETS
      // either trained or build or researched or claimed
      // make sure units can construct, repair and work on assets
      // dynamic: merely an updateable list (e.g. the current centre, shelter)
      // shared: needed, but shared with other groups (e.g. dropsites, temples)
      // exclusive: fully managed by this group (e.g. fields, units)

      units:          ["exclusive", "food.grain GATHEREDBY WITH costs.metal = 0, costs.stone = 0, costs.wood = 0"], // hardcode females
      field:          ["exclusive", "food.grain PROVIDEDBY"],
      dropsite:       ["shared",    "food ACCEPTEDBY"],
      shelter:        ["dynamic",   "<units> MEMBER DISTINCT HOLDBY INGAME WITH slots >= 1"],

      // groups can claim space for structures or activities
      space:          [1, {width: 30, depth: 30, near: "<dropsite>"}],

      exclusives:    function(options){
        return {
          units: [options.size, ["exclusive", "food.grain GATHEREDBY WITH costs.metal = 0, costs.stone = 0, costs.wood = 0 SORT < costs.food"]],
          field: [1, ["exclusive", "food.grain PROVIDEDBY"]]
        };
      },

      // message queue sniffer

      listener: {

        // game started, something launched this group
        onLaunch: function(options /*cc, size*/){

          this.options = options;
          this.size = options.size;
          this.units = this.exclusives(options).units[1];
          this.field = this.exclusives(options).field[1];
          this.register("dropsite", "units", "field", "shelter");     // turn res definitions into res objects
          this.economy.request(1, this.dropsite, this.position);      // assuming a CC exists

        },

        // a request was succesful
        onAssign: function(asset){

          // deb("     G: %s onAssign ast: %s as '%s' res: %s", this, asset, asset.property, asset.resources[0]);

          if (this.dropsite.match(asset)){
            this.position = asset;
            this.economy.request(1, this.units);

          } else if (this.field.match(asset)){
            this.position = asset;
            if (asset.isFoundation){this.units.repair(asset);}
            if (asset.isStructure){this.units.gather(asset);}

          } else if (this.units.match(asset)){

            if (!this.field.isRequested){ 
              this.economy.request(1, this.field, this.dropsite);

            } else if (this.field.isFoundation){
              // may silently fail, because field was destroyed
              asset.repair(this.field);

            } else if (this.field.isStructure){
              asset.gather(this.field);

            }

            if (this.units.count < this.size){
              this.economy.request(1, this.units, this.position);   
            }            

          } else {
            deb("     G: %s unidentified asset: %s, shared: %s", this, asset, asset.shared);

          }

        },

        // resource lost
        onDestroy: function(asset){

          deb("     G: %s onDestroy: %s", this, asset);

          if (this.field.match(asset)){
            this.position = this.units;
            this.economy.request(1, this.field, this.position);

          } else if (this.units.match(asset)){
            this.economy.request(1, this.units, this.position);

          } else if (this.dropsite.match(asset)){
            // dropsite is shared, custodian orders new one
            this.position = this.units;

          }

        },


        // there are enemies and gaia
        onAttack: function(asset, enemy, type, damage){

          deb("     G: %s onAttack %s by %s, damage: %s", this, asset, enemy, damage);

          if (this.field.match(asset)){
            if (this.units.doing("!repair").count){
              this.units.doing("!repair").repair(asset);
            }

          } else if (this.units.match(asset)){
            if (asset.health < 80 && this.shelter.exists()) { 
              this.shelter.nearest(1).garrison(asset);
            }
          }

        },

        // de-garrison
        onRelease: function(asset){

          deb("     G: %s onRelease: %s", this, asset);

          if (this.field.isFoundation){
            asset.repair(this.field);

          } else if (this.field.isStructure){
            asset.gather(this.field);

          } else {
            deb("WARN  : onRelease: no job for %s ", asset);

          }

        },


        // group radio
        onBroadcast: function(source, msg){

          deb("     G: %s onBroadcast from: %s, msg: %s", this, source, msg);
          
          if (msg.type === "must-repair"){
            this.units.repair(msg.resource);

          } else if (msg.type === "help-repair" && this.distance(msg.resource) < 100){
            this.units.repair(msg.resource);

          }

        },

        // defined by this.interval
        onInterval: function(){

          if (this.units.count){

            // deb("     G: %s onInterval,  states: %s", this, H.prettify(this.units.states()));

            if (this.field.isFoundation){
              if (this.units.doing("!repair").count){
                this.units.doing("!repair").repair(this.field);
              }

            } else if (this.field.health < 80){
              this.units.doing("!repair").repair(this.field);

            } else {
              this.units.doing("gather").gather(this.field);

            }

          }

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

  H.Groups = H.Groups || {};

  H.extend(H.Groups, {

    "g.mayor" : {

      /*
        a group without units solely for the first/biggest CC

        Behaviour: 
          to repair after attack
          to rebuild on destroy
          to garrisson soldiers on attack
          
      */

      active:         true,           // prepared for init/launch ...
      description:    "mayor",        // text field for humans 
      civilisations:  ["*"],          // 
      interval:       4,              // call onInterval every x ticks
      parent:         "",             // inherit useful features

      technologies: [
                      "unlock.females.house"
      ],

      position:       null,           // refers to the coords of the group's position/activities
      structure:      [],             // still unkown asset, inits at game start

      builders:       ["dynamic", "civilcentre CONTAIN BUILDBY INGAME WITH metadata.cc = <cc>"],

      attackLevel:    0,              // increases with every attack, halfs on interval
      needsRepair:   80,              // a health level (per cent)
      needsDefense:  10,              // an attack level

      listener: {
        onLaunch: function(options /*cc*/){

          // deb("     G: launch %s %s", this, uneval(options));

          // this.options = options;
          // this.cc = options.cc;
          this.register("builders");

        },
        onConnect: function(listener){
          // deb("     G: %s onConnect, callsign: %s", this, listener.callsign);
          this.structure.users.push(listener);
        },
        onDisConnect: function(listener){
          deb("     G: %s onDisConnect, callsign: %s", this, listener.callsign);
          H.remove(this.structure.users, listener);
        },
        onAssign: function(asset){

          deb("     G: %s onAssign ast: %s as '%s' res: %s", this, asset, asset.property, asset.resources[0]);

          this.position = asset;

          H.QRY("INGAME WITH metadata.cc = " + this.cc).forEach(function(node){
            node.metadata.cc = asset.resources[0];
          });

          this.cc = asset.resources[0];

          if (asset.isFoundation){
            this.builders.nearest(30).repair(asset);
          }

        },
        onDestroy: function(asset){

          deb("     G: %s onDestroy: %s", this, asset);

          this.economy.request(1, this.structure, this.position); // better location, pos is array

        },
        onAttack: function(asset, enemy, type, damage){

          deb("     G: %s onAttack %s", this, uneval(arguments));

          this.attackLevel += 1;

          if (this.attackLevel > this.needsDefense){
            this.structure.users.nearest(20).forEach(function(user){
              user.garrison(this.structure);
            });
          }

        },
        onBroadcast: function(){},
        onInterval: function(){

          // deb("     G: interval %s, attackLevel: %s, health: %s, states: %s", 
          //     this.name, this.attackLevel, this.structure.health, H.prettify(this.structure.states())
          // );

          this.attackLevel = ~~(this.attackLevel/2);

          if (this.structure.isFoundation){
            this.builders.nearest(30).repair(this.structure);
          }        

          // if (this.attackLevel === 0 && this.structure.health < this.needsRepair){
          //   this.structure.users.nearest(30).forEach(function(user){
          //     user.repair(this.structure);
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

  H.Groups = H.Groups || {};

  H.extend(H.Groups, {


    "g.scouts" : {

      /* Behaviour: 
          to explore the map, 
          to avoid violent combat
          to report enemies + buildings
          to report resources, wood, metal, stone, animals
          to fill the scout grid
      */

      // variables available in listener with *this*. All optional

      active:         true,           // ready to init/launch ...
      description:    "scouts",       // text field for humans 
      civilisations:  ["*"],          // lists all supported cics

      interval:        2,             // call onInterval every x ticks
      parent:         "",             // inherit useful features

      capabilities:   "+area",        // (athen) give the economy a hint what this group provides.


      // this got initialized by launcher
      position:       null,           // coords of the group's position/activities

      counter:        0,
      losses:         0,
      // units:         ["exclusive", "cavalry CONTAIN SORT > speed"],

      scanner:       null,
      target:        null,

      exclusives:    function(options){
        return {units : [options.size, ["exclusive", "cavalry CONTAIN SORT > speed"]]};
      },

      // message queue sniffer

      listener: {

        onLaunch:    function(options /*cc, maxUnits*/){

          this.options = options;
          this.size    = options.size;
          this.units   = this.exclusives(options).units[1];
          this.register("units");                                // turn res definitions into res objects
          this.economy.request(1, this.units, this.position);    // 1 unit is a good start

        },
        onAssign:    function(asset){

          // deb("     G: %s onAssign ast: %s as '%s' res: %s", this, asset, asset.property, asset.resources[0]);

          if (!this.counter){
            this.scanner = H.Scout.scanner(asset);  // inits search pattern with first unit
            this.target = this.scanner.next(asset.location());

          } else if (this.units.count > this.size) {
            asset.release();

          } else {
            asset.move(this.units.center);                        // all other move to last known location

          }

          this.counter += 1;

        },
        onDestroy:   function(asset){

          deb("     G: %s onDestroy: %s", this, asset);

          if (this.units.match(asset)){
            this.losses += 1;
            // succesively increment up to 5
            var amount = Math.max(this.maxUnits - this.units.count, this.losses +1);
            deb("AMOUNT: %s, max: %s, units: %s, losses: %s", amount, this.maxUnits, this.units.count, this.losses);
            this.economy.request(amount, this.units, this.position);  
          }      

        },
        onAttack:    function(asset, attacker, type, damage){

          deb("     G: %s onAttack %s by %s, damage: %s", this, asset, H.Entities[attacker] || attacker, damage.toFixed(1));

          H.Scout.scanAttacker(attacker);

          if (asset.health < 80){
            if (this.units.spread > 50){
              asset.stance("defensive");
              asset.flee(attacker);
            } else {
              H.Scout.scan(this.units.nearest(this.target.point));
              this.units.stance("defensive");
              this.units.flee(attacker);
            }
          }

        },
        onBroadcast: function(source, msg){},
        onRelease:   function(asset){

          deb("     G: %s onRelease: %s", this, asset);

        },
        onInterval:  function(secs, ticks){

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

  H.Groups = H.Groups || {};

  H.extend(H.Groups, {

    "g.supplier" : {

      /*
        a group without units solely for the first/biggest CC

        Behaviour: 
          to exploit resources like ruins, mines with stone
          to build a dropsite if needed
          
      */

      active:         true,           // prepared for init/launch ...
      description:    "supplier",     // text field for humans 
      civilisations:  ["*"],          // 
      interval:       4,              // call onInterval every x ticks
      parent:         "",             // inherit useful features

      defaults:       {
        size:         2,
      },

      technologies: [                 // these techs help
                      "gather.lumbering.ironaxes",
                      "gather.capacity.wheelbarrow",
                      "gather.wicker.baskets", // ?? only fruits
                      "gather.mining.wedgemallet",
                      "gather.mining.silvermining",    
                      "gather.mining.shaftmining",
      ],

      position:       null,           // refers to the coords of the group's position/activities

      units:          null,           // assets defined in onLaunch
      dropsite:       null,
      dropsites:      null,

      attackLevel:    0,              // increases with every attack, halfs on interval
      needsRepair:   80,              // a health level (per cent)
      needsDefense:  10,              // an attack level

      exclusives:    function(options){
        return {units : [options.size, (
          options.supply === "metal"      ? ["exclusive", "metal.ore  GATHEREDBY"] :
          options.supply === "stone"      ? ["exclusive", "stone.rock GATHEREDBY"] :
          options.supply === "wood"       ? ["exclusive", "wood.tree  GATHEREDBY"] :
          options.supply === "food.fruit" ? ["exclusive", "food.fruit GATHEREDBY"] :
          options.supply === "food.meat"  ? ["exclusive", "food.meat  GATHEREDBY"] :
            deb(" ERROR: exclusives: unknown supply '%s' for g.supplier", options.supply)
        )]};
      },

      listener: {

        onLaunch: function(options /*cc, supply, size*/){

          deb("     G: onlaunch %s", uneval(arguments));

          // this.options   = options;
          this.size   = options.size || this.defaults.size;
          this.supply = options.supply;
          this.target = this.resources.nearest(this.position, this.supply);

          if (!this.target){
            deb("     G: onLaunch dissolving %s no target for %s", this, this.supply);
            this.dissolve(); 
            return;
          
          } else {
            this.position  = this.target.position;
            deb("     G: onLaunch %s have target for %s: %s", this, this.supply, this.target);

          }

          this.units = this.exclusives(options).units[1];

          this.dropsite = (
            this.supply === "metal"      ?  ["shared",    "metal ACCEPTEDBY"] :
            this.supply === "stone"      ?  ["shared",    "stone ACCEPTEDBY"] :
            this.supply === "wood"       ?  ["shared",    "wood ACCEPTEDBY"]  :
            this.supply === "food.fruit" ?  ["shared",    "food ACCEPTEDBY"]  :
            this.supply === "food.meat"  ?  ["shared",    "food ACCEPTEDBY"]  :
              deb(" ERROR: unknown supply '%s' for supply group", this.supply)
          );

          this.dropsites = (
            this.supply === "metal"      ?  ["dynamic",    "metal ACCEPTEDBY INGAME"] :
            this.supply === "stone"      ?  ["dynamic",    "stone ACCEPTEDBY INGAME"] :
            this.supply === "wood"       ?  ["dynamic",    "wood  ACCEPTEDBY INGAME"] :
            this.supply === "food.fruit" ?  ["dynamic",    "food  ACCEPTEDBY INGAME"] :
            this.supply === "food.meat"  ?  ["dynamic",    "food  ACCEPTEDBY INGAME"] :
              deb(" ERROR: unknown supply '%s' for supply group", this.supply)
          );

          this.register("units", "dropsite", "dropsites");
          // this.request(1, this.units, this.position);   
          this.request(2, this.units, this.position);   

        },
        onAssign: function(asset){

          deb("     G: onAssign %s : got %s, pos: %s", this, asset, H.fixed1(this.position));
         
          if (this.units.match(asset)){

            if (this.units.count === 1){
              if (this.dropsites.nearest(1).distanceTo(this.position) > 100){
                this.request(1, this.dropsite, this.position); 
              }  
            }

            deb("     G: onAssign %s units: %s/%s", this, this.units.count, this.size);
            if (this.units.count < this.size){
              this.request(1, this.units, this.position);   
            }

            if (this.target){
              asset.gather(this.target);
            } else {
              deb("  WARN: %s with res: %s has no target", this, this.supply);
            }

          } else if (this.dropsite.match(asset)){

            if (asset.isFoundation){this.units.repair(asset);}
            if (asset.isStructure){this.units.gather(this.target);}

          } else {
            deb("     G: onAssign %s no match", this);

          }

        },
        onDestroy: function(asset){

          deb("     G: onDestroy %s : %s", this, asset);

          if (this.units.match(asset)){
            this.request(1, this.units, this.position);

          } else if (this.dropsite.match(asset)){
            // this.request(1, this.dropsite, this.position);

          }

        },
        onAttack: function(asset, enemy, type, damage){

          deb("     G: onAttack %s : %s by %s, damage: %s", this, asset, enemy, damage);

        },
        onBroadcast: function(){},
        onInterval:  function(){

          // deb("     G: %s onInterval, res: %s, states: %s", this, this.supply, H.prettify(this.units.states()));

          if (!this.units.count){return;}

          if (this.units.doing("idle").count === this.size){
            this.dissolve();
            deb("      G: onInterval %s finished supplying %s, all (%s) idle", this, this.size, this.supply);
          
          } else if (this.units.doing("idle").count > 0){

            // this.resources.update(this.supply);
            this.target = this.resources.nearest(this.position, this.supply);
            
            if (this.target){
              this.units.doing("idle").gather(this.target);
            } else {
              deb("  WARN: %s with res: %s has no target", this, this.supply);
            }              
            
            
          }


        }

      } // listener

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

  H.HTN = H.HTN || {};                       
  H.HTN.Economy = H.HTN.Economy || {};

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

  H.HTN = H.HTN || {};                       
  H.HTN.Economy = H.HTN.Economy || {};

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

  H.HTN = H.HTN || {};
  H.HTN.Helper = H.HTN.Helper || {};

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

  H.HTN = H.HTN || {};                       

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
/*globals  HANNIBAL, Uint8Array, deb, uneval */

/*--------------- M A P S -----------------------------------------------------

  Deals with map aspects in coordinates, grids + 
  cosmetic rewite offindGoodPosition, createObstructionsmap from Aegis


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/

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

  var 
    TERRITORY_PLAYER_MASK = 0x3F, // 63
    prit = H.prettify,
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

      name:    "map",
      context: context,
      imports: [
        "id",
        "width",
        "height",
        "cellsize",
        "effector",
        "events",
        "entities",           
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
        "scanner",            // used by scouts
      ],

      length:        0,
      territory:     null,        // copy from API 
      passability:   null,        // copy from API 

    });

  };


  H.LIB.Map.prototype = {
    constructor: H.LIB.Map,
    log: function(){
      deb();
      deb("   MAP: width: %s, height: %s, cellsize: %s, grid: %s, length: %s", 
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
    clone: function(context){
      return new H.LIB[H.noun(this.name)](context);
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
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
    activate: function(){

      this.events.on("Attack", msg => {

      });

    },
    tick: function(tick, secs){

      var t0 = Date.now();

      this.territory   = this.context.territory;
      this.passability = this.context.passability;

      return Date.now() - t0;

    },    
    mapPosToGridPos: function(p){
      return [~~(p[0] / this.cellsize), ~~(p[1] / this.cellsize)];
    },
    mapPosToIndex: function(p){
      var [x, y] = this.mapPosToGridPos(p);
      return x + y * this.gridsize;
    },
    distanceTo: function(ids, pos){
      // deb("   MAP: distanceTo: args: %s", uneval(arguments));
      var center = this.getCenter(ids);
      return this.distance(center, pos);
    },
    distance: function(a, b){
      if (!a.length || !b.length || a.length !== 2 || b.length !== 2){
        H.throw("ERROR : map.distance wrong args: ", uneval(arguments));
      }
      var dx = a[0] - b[0], dz = a[1] - b[1];
      return Math.sqrt(dx * dx + dz * dz);
    },
    isOwnTerritory: function(p){
      var 
        index  = this.mapPosToIndex(p),
        player = this.territory.data[index] & TERRITORY_PLAYER_MASK;

      // deb("isOwnTerritory: %s", index);

      return player === this.context.id;
    },
    isEnemyTerritory: function(pos){
      var 
        index  = this.mapPosToGridIndex(pos),
        player = this.territory.data[index] & TERRITORY_PLAYER_MASK;
      return this.players.isEnemy[player];
    },
    nearest: function(point, ids){

      deb("   MAP: nearest: %s", uneval(arguments));

      var distance = 1e10, dis, result = 0, pos = 0.0;

      ids.forEach(id => {
        pos = this.entities[id].position();
        dis = this.distance(point, pos);
        if ( dis < distance){
          distance = dis; result = id;
        } 
      });
      return result;

    },
    getSpread: function(ids){
      var 
        poss = ids.map(id => this.entities[id].position()),
        xs = poss.map(pos => pos[0]),
        zs = poss.map(pos => pos[1]),
        minx = Math.max.apply(Math, xs),
        minz = Math.max.apply(Math, zs),
        maxx = Math.max.apply(Math, xs),
        maxz = Math.max.apply(Math, zs),
        disx = maxx - minx,
        disz = maxz - minz;
      return Math.max(disx, disz);
    },
    centerOf: function(poss){
      // deb("   MAP: centerOf.in %s", pritShort(poss));
      var out = [0, 0], len = poss.length;
      poss.forEach(function(pos){
        if (pos.length){
          out[0] += pos[0];
          out[1] += pos[1];
        } else { 
          len -= 1;
        }
      });
      return [out[0] / len, out[1] / len];
    },
    getCenter: function(ids){

      // deb("   MAP: getCenter: %s", H.prettify(ids));

      if (!ids || ids.length === 0){
        H.throw(H.format("Map.getCenter with unusable param: '%s'", uneval(ids)));
      }

      return this.centerOf( 
        ids
          .filter(id => !!this.entities[id])
          .map(id => this.entities[id].position())
      );

    },
    updateGrid: function(name){

      var 
        t1, t0 = Date.now(), src, tgt, t, s, w = this.gridsize, h = w, i = w * h,
        terr, regl, regw, mask, counter = 0;


      // translates into internal terrain (land, water, forbidden, steep, error)

      if (name === "terrain"){

        src = this.passability.data;
        tgt = this.terrain.data;

        while(i--){s = src[i]; tgt[i] = (
                                                                  (s & 64)   ?   0 :   //  border      //   0
                         (s &  8) && !(s & 16)                && !(s & 64)   ?   4 :   //  land        //  32
            !(s & 4) && !(s &  8)                             && !(s & 64)   ?   8 :   //  shallow     //  64
             (s & 4) && !(s &  8) && !(s & 16)                && !(s & 64)   ?  16 :   //  mixed       //  92
                                      (s & 16)  && !(s & 32)  && !(s & 64)   ?  32 :   //  deep water  // 128
             (s & 4) &&               (s & 16)  &&  (s & 32)  && !(s & 64)   ?  64 :   //  steep land  // 192
               255                                                                     //  error       // 255
          );
        }
        t1 = Date.now();
        this.terrain.dump("init", 255);
        // deb("   MAP: updated: terrain, ms: %s", t1 - t0);


      // detects unconnected land regions

      } else if (name === "regionsland") {

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

    },
    fillRegion: function(src, tgt, mask, index, region){

      var 
        width = this.gridsize,
        i, idx, nextX, nextY,
        y = ~~(index / width) | 0,
        x = index % width | 0,
        stack = [x, y], pointer = 2, // push/pop is too slow
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

    },   
    createTerritoryMap: function() {
      var map = new H.API.Map(H.Bot.gameState.sharedScript, H.Bot.gameState.ai.territoryMap.data);
      map.getOwner      = function(p) {return this.point(p) & TERRITORY_PLAYER_MASK;};
      map.getOwnerIndex = function(p) {return this.map[p]   & TERRITORY_PLAYER_MASK;};
      return map;
    },

    createObstructionMap: function(accessIndex, template){

      var 
        gs = H.Bot.gameState, PID = H.Bot.id, 
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
          gs       = H.Bot.gameState,
          cellSize = gs.cellSize,
          template = gs.getTemplate(tpl),
          obstructionMap   = H.Map.createObstructionMap(0, template),
          friendlyTiles    = new H.API.Map(gs.sharedScript),
          alreadyHasHouses = false,
          radius = 0;
      
      angle  = angle === undefined ? H.Config.angle : angle;

      // deb("   MAP: findGoodPosition.in: pos: %s, tpl: %s", position.map(c => c.toFixed(1)), tpl);
      
      //obstructionMap.dumpIm(template.buildCategory() + "_obstructions_pre.png");

      if (template.buildCategory() !== "Dock"){obstructionMap.expandInfluences();}

      //obstructionMap.dumpIm(template.buildCategory() + "_obstructions.png");

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
            deb("WARNING: no influence for: %s", tpl);
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
      

      //friendlyTiles.dumpIm(template.buildCategory() + "_" +gameState.getTimeElapsed() + ".png", 200);
      
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
        deb("   MAP: findGoodPosition.out: pos: %s, tpl: %s", [x, z].map(c => c.toFixed(1)), tpl);
        return false;
      }

      
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

      return {
        "x" : x,
        "z" : z,
        "angle" : angle,
        "xx" : secondBest[0],
        "zz" : secondBest[1]
      };

    }
  
  };


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
/*globals HANNIBAL, deb, uneval */

/*--------------- M I L I T A R Y ---------------------------------------------

  knows about buildings and attack plans
  

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/


HANNIBAL = (function(H){


  H.LIB.Military = function(context){

    H.extend(this, {

      name:    "military",
      context: context,
      imports: [
        "events",
      ],

    });

  };

  H.LIB.Military.prototype = {
    constructor: H.LIB.Military,
    log: function(){},
    clone: function(context){
      context.data[this.name] = this.serialize();
      return new H.LIB[H.noun(this.name)](context);
    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    deserialize: function(){
      if (this.context.data[this.name]){
        H.extend(this, this.context.data[this.name]);
      }
    },
    serialize: function(){
      return {};
    },
    initialize: function(){
      return this;
    },
    activate: function(){

      this.events.on("Attacked", "*", function (msg){

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

  };

return H; }(HANNIBAL));  
/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval, logObject */

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


  function Resource(data){

    //TODO remove API access, owner, template.Identity, resourceSupplyMax

    H.extend(this, {
      klass:    "resource",
      found:    false,
      consumed: false,
    }, data);

    if (!this.entities || !this.map){
      logObject(this);
    }

  }

  Resource.prototype = {
    constructor: Resource,
    log: function(){
      var t = this;
      deb("   RES: %s, %s, type: %s/%s, pos: %s, owner: %s, found: %s",
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
          found:     this.found ? true : this.map.isOwnTerritory(ent.position()) ? true : false,
          supply:    ent.resourceSupplyAmount(),
        });

      } else {
        this.consumed = true;
        deb("   RES: res with id: '%s' was consumed, no entity", this.id);

      }

      return this;

    },
  };


  H.LIB.Resources = function(context){

    var stats = {entities: 0, found: 0, available: 0, total: 0, consumed: 0, depleted: 0};

    H.extend(this, {

      name:  "resources",
      context:  context,
      imports:  [
        "map",
        "config",
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

  H.LIB.Resources.prototype = {
    constructor: H.LIB.Resources,
    log: function(){
      var 
        tab = H.tab, type, msg = "",
        head   = "ents,     found, avail, total, depl, cons".split(", "),
        props  = "entities, found, available, total, depleted, consumed".split(", "),
        tabs   = [   6,     6,    8,    8,    6,    8];  

      // header
      H.zip(head, tabs, function(h, t){msg += tab(h, t);});
      deb();
      deb("RESRCS:                " + msg);

      // lines
      this.eachStats(function(generic, specific, stats){
        msg = "";
        H.zip(props, tabs, function(p, t){
          msg += tab(stats[p], t);
        });    
        type = H.tab(generic + "." + specific, 13);
        deb("     R: %s: %s", type, msg);
      });

    },
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
      return this;
    },
    clone: function(context){
      return new H.LIB[H.noun(this.name)](context);
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
          this.resources[generic][specific][id] = new Resource(H.mixin(res, {
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
              res = this.resources[type.generic][type.specific][ent.id()] = new Resource({
                id:       ~~id, 
                map:      this.map,
                config:   this.config,
                context:  this.context,
                generic:  type.generic,
                specific: type.specific,
                entities: this.entities,
              }).initialize();

            } else {
              deb("ERROR : unknown resource type %s %s %s", type.generic, type.specific, ent._templateName);
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
        deb("ERROR : res.each: type: '%s' unknown", type);

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
    markFound: function(pos, range){ //TODO
      this.eachAll( (generic, specific, stats, id, res) => {
        if (this.map.distance(pos, res.position) < range){
          res.found = true;
        }            
      });
    },
    nearest: function(loc, type){

      var 
        t0, t1, resource, distance, kmeans, trees, cid,
        resFound = null, 
        dis = 1e7, 
        pos = Array.isArray(loc) ? loc : loc.location();

      // deb("   RES: looking for nearest '%s' at %s", generic, pos);

      switch (type){
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
        case "food.grain": // untested
        case "food.whale": // untested
        case "food.fish":  // untested
          this.eachType(type, (generic, specific, id, res) => {
            if (this.entities[id]){
              if (res.found && !res.consumed){
                distance = this.map.distance(pos, res.position);
                if (distance < dis){resFound = res; dis = distance;}
              }
            } else {
              res.consumed = true;
            }
          });
          resource = resFound;
        break;

        case "food.meat": // has prey check
          this.each(this.resources.food, (id, res) => {
            if (this.entities[id]){
              if (res.found && !res.consumed && res.isPrey){
                distance = this.map.distance(pos, res.position);
                if (distance < dis){resFound = res; dis = distance;}
              }
            } else {
              res.consumed = true;
            }
          });
          resource = resFound;
        break;

        case "wood":
        case "wood.ruins":
        case "wood.tree":

          trees = [];
        
          this.eachType(type, (generic, specific, id, res) => {
            if (this.entities[id]){
              if (res.found && !res.consumed){
                trees.push({x: res.position[0], z: res.position[1], id: id, res: res});
              }
            } else {
              res.consumed = true;
            }
          });
          
          if (!trees.length){
            deb("   RES: kmeans: 0 trees");
          
          } else {

            t0 = Date.now();
            kmeans = new H.AI.KMeans();
            kmeans.k = 3; // map size !!!!
            kmeans.maxIterations = 50;
            kmeans.setPoints(trees);
            kmeans.initCentroids();
            kmeans.cluster();
            t1 = Date.now();

            // nearest cluster TODO: filter out centroids without trees
            cid = kmeans.centroids.sort(function(a, b){
              var da = (a.x - pos[0]) * (a.x - pos[0]) + (a.z - pos[1]) * (a.z - pos[1]),
                  db = (b.x - pos[0]) * (b.x - pos[0]) + (b.z - pos[1]) * (b.z - pos[1]);
              return da - db;
            })[0];
            
            // nearest tree from that cluster TODO: nearest to tree from org loc of this cluster
            trees.sort(function(a, b){
              var da = (a.x - cid.x) * (a.x - cid.x) + (a.z - cid.z) * (a.z - cid.z),
                  db = (b.x - cid.x) * (b.x - cid.x) + (b.z - cid.z) * (b.z - cid.z);
              return da - db;
            });
            
            deb("   RES: kmeans: %s trees, %s cluster, chose cluster with %s trees, %s msecs", 
              trees.length, 
              kmeans.centroids.length, 
              kmeans.centroids[0].items,
              t1-t0
            );

          }

          resource = trees.length ? trees[0].res : null;

        break;

        default: 
          deb("ERROR : unknown resource type: %s in nearest", type);

      }

      deb("   RES: nearest '%s': %s at %s", type, resource, H.fixed1(pos));
      // deb("   RES: attribs: %s", H.attribs(resource));
      return resource;

    },      
  
  };

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

  var grid = null;

  H.LIB.Scanner = function(context){

    H.extend(this, {

      name:  "scanner",
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

    });

  };

  H.LIB.Scanner.prototype = {
    constructor: H.LIB.Scanner,
    log: function(){},
    import: function(){
      this.imports.forEach(imp => this[imp] = this.context[imp]);
    },
    clone: function(context){
      context.data[this.name] = this.serialize();
      return new H.LIB[H.noun(this.name)](context);
    },
    serialize: function(){
      return {};
    },
    initialize: function(){
      this.grids.scanner = this.map.scanner;
      this.grids.attacks = this.map.attacks;
    },
    dump: function (name){grid.dump(name || "scouting", 255);},
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
          return x < 0 || y < 0 || x >= grid.width || y >= grid.height;
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


      deb(" SCOUT: Scanner: pos: %s, rng: %s, ent: %s", posStart, rng, ent._templateName);


      queueNow.push(posStart);

      return {

        scan: function(pos){

          var 
            t0 = Date.now(), sq, value, posTest, posNext, index, out, 
            test = H.Resources.nearest(pos, "treasure"),
            treasures = test ? [test] : [];

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
  };







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

return H; }(HANNIBAL));

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
/*globals HANNIBAL, deb, logObject */

/*--------------- S T O R E  --------------------------------------------------

  A triple store with verbs, edges, nodes and a query language


  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/


HANNIBAL = (function(H){

  H.LIB.Store = function(context){

    H.extend(this, {

      name:    "store",
      context: context,
      imports: [
        "culture"
      ],

      verbs:  null,
      nodes:  null,
      edges:  null,

      cntNodes:    0,
      cntQueries:  0,
      cache:      {},
      cacheHit:    0,
      cacheMiss:   0,
      cacheSlots:  100,

    });

  };

  H.LIB.Store.prototype = {
    constructor: H.LIB.Store,
    log: function(){
      deb();
      deb(" STORE: %s verbs, %s nodes, %s edges", this.verbs.length, H.count(this.nodes), this.edges.length);
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
        this.verbs = this.culture.verbs;
        this.nodes = {};
        this.edges = [];
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
        deb("ERROR : node already exists in store: %s, %s ", this.name, node.name);
      }
    },
    delNode: function(name){  // TODO: speed up

      if (this.nodes[name]){
        H.delete(this.edges, edge => edge[0].name === name || edge[2].name === name);
        delete this.nodes[name];
        this.cntNodes -= 1;

      } else {
        deb("WARN  : store.delNode: can't delete '%s' unknown", name);
      }

    },
    addEdge: function(source, verb, target){
      if (!source)                      {deb("ERROR : addEdge: source not valid: %s", source);} 
      else if (!target)                 {deb("ERROR : addEdge: target not valid: %s", target);} 
      else if (!this.nodes[source.name]){deb("ERROR : addEdge: no source node for %s", source.name);}
      else if (!this.nodes[target.name]){deb("ERROR : addEdge: no target node for %s", target.name);}
      else if (this.verbs.indexOf(verb) === -1){deb("ERROR : not a verb %s, have: %s", verb, H.prettify(this.verbs));}
      else {
        this.edges.push([source, verb, target]);
      }
    },

  };

  H.LIB.Query = function(store, query, debug){

    this.debug = debug || 0;

    if(this.debug > 0){
      deb();
      deb("PARSER: i '%s'", query);
    }

    this.fromCache = false;
    this.store = store;
    this.verbs = store.verbs.map(String.toUpperCase);
    this.keys  = "DISTINCT, WITH, SORT, LIMIT, RAND".split(", ");
    this.query = this.sanitize(query);
    this.tree  = this.parse(this.query);

    if(this.debug > 0){
      deb("     P: o: %s", JSON.stringify(this.tree));
      deb();
    }

  };

  H.LIB.Query.prototype = {
    constructor: H.LIB.Query,
    checkCache: function(){

      var result, 
          useCache = (
            this.query.indexOf("INGAME") === -1 &&
            this.query.indexOf("TECHINGAME") === -1 &&
            !!this.store.cache[this.query]
      );

      if (useCache){
        result = this.store.cache[this.query].result;
        this.fromCache = true;
        this.store.cache[this.query].hits += 1;
        this.store.cacheHit += 1;
      } else {
        result = undefined;
        this.store.cacheMiss += 1;
      }

      return result;

    },
    parse: function(query){

      var self    = this, 
          verbs   = this.verbs,
          keys    = this.keys,
          clauses = this.partition([query], verbs),
          subClauses, out = [], error;

      function isVerb(t){return verbs.indexOf(t) !== -1;}
      function isString(t){return typeof t === "string";}

      clauses.forEach(function(clause){

        if (isString(clause) || clause.length === 1){
          out.push(clause);

        } else if (isVerb(clause[0])) {

          subClauses = self.partition([clause[1]], keys);

          if (isString(subClauses[0])) {
            out.push([clause[0]].concat(subClauses.shift()));
          } else {
            out.push([clause[0]]);
          }
          subClauses.forEach(function(clause){
            out.push(clause);
          });

        } else {
          error = H.format("unknwon clause keyword: %s, ''", clause[0], clause);
          deb("     P: %s", error);

        }

      });

      return error ? undefined : out;

    },
    count: function(format, debug, debmax, comment){
      return this.execute(format, debug, debmax, comment).length;
    },
    first: function(format, debug, debmax, comment){
      var nodes = this.execute(format, debug, debmax, comment);
      // return nodes.length ? nodes[0] : undefined;
      return nodes.length ? nodes[0] : null;
    },
    forEach: function(fn, format, debug, debmax, comment){
      var nodes = this.execute(format, debug, debmax, comment);
      nodes.forEach(fn);
      return nodes;
    },
    filter: function(fn, format, debug, debmax, comment){
      var nodes = this.execute(format, debug, debmax, comment);
      return nodes.filter(fn);
    },
    map: function(fn, format, debug, debmax, comment){
      var nodes = this.execute(format, debug, debmax, comment);
      return nodes.map(fn);
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
    execute: function(format, debug, debmax, comment){

      var t1, t0 = Date.now(), 
          self    = this,
          tree    = this.tree,
          verbs   = this.verbs,
          keys    = this.keys,
          edges   = this.store.edges, //  = [source, verb, target]
          nodes   = this.store.nodes, //  = {name:{}}
          cache   = this.store.cache,
          results = [],               // returns always an array
          ops     = 0,
          cacheDrop = "";

      function isKey(t)   {return keys.indexOf(t) !== -1;}
      function isVerb(t)  {return verbs.indexOf(t) !== -1;}
      function isString(t){return typeof t === "string";}
      function sample(a,n){var l=a.length; return H.range(n||1).map(function(){return a[~~(H.Hannibal.entropy.random()*l)];});}
      function parse(v)   { // float or string
        var f = parseFloat(v); 
        return (
          Array.isArray(v) ? v :                  // don't touch arrays
          isNaN(f)         ? v.slice(1, -1) : f   // return strings without quotes
        );
      } 
      function prepResults(ress){
        Object.defineProperty(ress, "stats", {
          enumerable: false,
          configurable: false,
          writable: true,
          value: {
            ops: ops,
            msecs: t1,
            length: results.length,
            cached: self.fromCache,
            hits: cache[self.query].hits,
            nodes: self.store.cntNodes,
            edges: edges.length,
            verbs: verbs.length
          }
        });
        return results;
      }
      function logNodes(){
        // debug
        if (self.debug > 0 && self.fromCache){deb("     Q: %s recs from cache: %s", results.length, self.query);}
        if (self.debug > 0){deb("     Q: executed: msecs: %s, records: %s, ops: %s", t1, results.length, ops);}
        if (self.debug > 1){self.logResult(results, format, debmax);}
      }

      this.debug  = debug || 0;

      this.store.cntQueries += 1;

      // Cached ?
      results = this.checkCache();
      if (results){
        t1 = Date.now() - t0;
        logNodes();
        return prepResults(results);

      } else {
        // we start with all nodes as result
        // results = Object.keys(nodes).map(function (key){return nodes[key];});
        results = Object.keys(nodes).map(key => nodes[key]);
        ops     = results.length;

      }


      if (this.debug > 1){
        deb(" ");
        deb("     Q: q: '%s'", self.query);
        deb("      : c: '%s'", comment || "no comment");
      }

      tree.forEach(function(clause){

        var first  = clause[0],
            verb   = first.toLowerCase(),
            rest   = !!clause[1] ? clause[1]  : undefined, 
            params = !!rest ? rest.split(" ") : undefined, 
            attr, oper, filters;

        if (!H.APP.isTicking && self.debug > 0){
          deb("      : i: ops: %s, nodes: %s, c: %s", H.tab(ops, 4), H.tab(results.length, 4), JSON.stringify(clause));
        }


        // expecting node NAMES, the optional first clause

        if (isString(clause)){

          // convert the names into nodes, remove unknown
          results = clause.split(", ")
            .map(function(name){ops++; return nodes[name] !== undefined ? nodes[name]: undefined;})
            .filter(function(node){ops++; return node !== undefined;});


        // a VERB

        } else if (isVerb(first)) {
          
          // find all edges from source node, with given verb, collect target node

          [ops, results] = self.reduceByVerb(verb, edges, results, ops);



        // a KEYWORD

        } else if (isKey(first)) {

          switch (first){

            case "LIMIT"    : ops += ~~rest; results = results.slice(0, ~~rest); break;
            case "RAND"     : ops += ~~rest; results = sample(results, ~~rest);  break;
            case "DISTINCT" : ops += results.length; results = [...Set(results)]; break;

            case "SORT" :

              oper = params[0]; attr = params[1];
              [ops, results] = self.sortResults(oper, attr, results, ops);
            
            break;

            case "WITH" :

              filters = clause[1].split(", ");
              filters.forEach(function(filter){

                var attr, oper, queryValue;

                filter = filter.split(" ");
                
                attr = filter[0]; 
                oper = filter[1] ? filter[1] : "e"; 
                queryValue = (filter[2] !== undefined) ? parse(filter[2]) : undefined;

                results = results.filter(function(node){
                  
                  var nodeValue = self.get(node, attr); ops++;

                  return (
                    oper === "e"  ? nodeValue !== undefined  : // exists ?
                    oper === "="  ? nodeValue === queryValue :
                    oper === "<"  ? nodeValue <   queryValue :
                    oper === ">"  ? nodeValue >   queryValue :
                    oper === "!=" ? nodeValue !== queryValue :
                    oper === "<=" ? nodeValue <=  queryValue :
                    oper === ">=" ? nodeValue >=  queryValue :
                      deb("ERROR : unknown operator in WITH: %s", oper)
                  );

                });

              });

            break;
          }

        } else {
          deb("ERROR : clause starts with invalid KEYWORD: %s", first);

        }

      });

      // from here there is a result set of nodes

      t1 = Date.now() - t0;

      // put in cache
      if (cache.length > this.store.cacheSlots){
        cacheDrop = Object.keys(cache).sort(function(a, b){
          return cache[a].hits - cache[b].hits;
        })[0];
        if (this.debug > 0){deb("     Q: cache drop: hits: %s, qry: %s", cache[cacheDrop].hits, cache[cacheDrop]);}
        delete cache[cacheDrop];
      }
      cache[this.query] = {hits: 0, result: results};

      logNodes();

      return prepResults(results);

    },
    sortResults: function (oper, attr, results, ops){

      var anValue, bnValue, get = this.get, out = results.sort((an, bn) => { 
        anValue = this.get(an, attr); 
        bnValue = get(bn, attr); ops++;
        return (
          oper === "<" ? bnValue < anValue :
          oper === ">" ? bnValue > anValue :
            deb("ERROR : unknown operator in SORT: %s", oper)
        );
      });

      return [ops, out];

    },
    reduceByVerb: function (verb, edges, result, ops){

      // this has to be VERY fast

      var e = 0|0, out = [], r = result.length|0, eLen = edges.length|0;

      while(r--){
        e = eLen;
        while(e--){
          if (edges[e][0] === result[r] && edges[e][1] === verb){
            ops++; 
            out.push(edges[e][2]);
          }
        }
      }
      
      return [ops, out];

    },
    logResult: function (result, format, debmax){

      var i, meta, node, c, p, t = H.tab;

      function saniJson(node){
        node = H.deepcopy(node);
        node.template = "...";
        return H.prettify(node);
      }

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
    sanitize: function(phrase){
      phrase = H.replace(phrase, "\n", " ");
      phrase = H.replace(phrase, "\t", " ");
      phrase = H.replace(phrase, " ,", ",");
      return phrase.split(" ").filter(function(s){return !!s;}).join(" ");
    }

  };  


return H; }(HANNIBAL)); 
var TESTERDATA = {"map": "brain03"};/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, TESTERDATA, Engine, deb, logObject */

/*--------------- T E S T E R -------------------------------------------------

  fires a set of functions at given tick, useful to test bot on specific maps
  sequence keys are documented in maps/readme-maps.md
  active sequence comes from 



  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  var T = H.T || {},
      self, 
      tick = 0, 
      sequence = "", sequences, // sequence subset
      chat = function(msg){Engine.PostCommand(H.APP.bot.id, {"type": "chat", "message": msg});};

  H.extend(T, {
    quit: function(){
      return () => Engine.PostCommand(H.APP.bot.id, {"type": "quit"});
    },
    chat: function(msg){
      return () => Engine.PostCommand(H.APP.bot.id, {"type": "chat", "message": msg});
    },
    destroy: function(ids){ 
      ids = Array.isArray(ids) ? ids : arguments.length > 1 ? H.toArray(arguments) : [ids];
      return () => Engine.PostCommand(H.APP.bot.id, {type: "delete-entities", "entities": ids});
    },
    research: function(tpl, id){
      return () => Engine.PostCommand(H.APP.bot.id, {type: "research", entity: id, template: tpl}); 
    },
    launch: function(group /*, ... */){
      return H.toArray(arguments).slice(1).map((id) => () => H.Groups.launch(group, id));
    },
    supplier: function(supply, cc, size=2){
      return () => H.APP.bot.groups.launch({cc: cc, groupname: "g.supplier", supply: supply, size: size});
    },
    speed: function(rate){
      return [
        () => print("## xdotool key F9\n"), 
        () => print("#! xdotool type --delay 30 Engine.SetSimRate(" + rate + ")\n"), 
        () => print("## xdotool key Return\n"),
        () => print("## xdotool key F9\n"),
      ];

    }

  });

/*
        "5": [() => H.Grids.dump(), "dumping maps"],
        http://www.semicomplete.com/projects/xdotool/xdotool.xhtml#mouse_commands
*/


  // if any of these evaluate to a string, it gets chatted
  sequences = {
    "brain02": {
        "0": [() => "< - START: " + sequence + " - >"],
        // "2": [T.chat("huhu"), "chatted"], 
        "1": [T.supplier(      "food.fruit", 44), "launching 1 food.fruit supplier"], 
        "2": [T.supplier(            "wood", 44, 10), "launching 1 wood supplier"], 
        "3": [T.supplier(           "metal", 44, 10), "launching 1 metal supplier"], 
        "4": [T.supplier(           "stone", 44, 10), "launching 1 stone supplier"], 
        "5": [T.speed(5),                             "more speed"],
      // "241": [T.quit(), () => "< - FINIS: " + sequence + " - >"],
    },
    "Forest Battle": {
        "1": [() => "< - START: " + sequence + " - >"],
        "2": [T.chat("huhu"), "chatted"], 
      "241": [() => "< - FINIS: " + sequence + " - >"],
    },
    "aitest08m": {
        "1": [() => "< - START: " + sequence + " - >"],
        "2": [T.chat("huhu"), "chatted"], 
        "3": [T.launch("g.scouts", 44), "launching 1 scout"], 
      "241": [() => "< - FINIS: " + sequence + " - >"],
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
        "2": [T.launch("g.harvester",        4752), "launching 1 harvester"], 
        "3": [T.supplier(            "wood", 4752), "launching 1 wood supplier"], 
        "4": [T.launch("g.builder",          4752), "launching 1 scout"], 
        "5": [T.launch("g.scouts",           4752), "launching 1 scout"], 
        "6": [T.launch("g.harvester",        4752), "launching 1 harvester"], 
        "7": [T.launch("g.harvester",        4752), "launching 1 harvester"], 
        "8": [T.launch("g.harvester",        4752), "launching 1 harvester"], 
        "9": [T.supplier(           "metal", 4752), "launching 1 metal supplier"], 
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
    "aitest06m": {
        "1": [() => "< - START: " + sequence + " - >"],
        "2": [T.launch("g.scouts", 44), "launching 1 scout"], 
        // "3": [() => H.Grids.dump(), "dumping grids"],
        // "4": [() => H.Grids.log(),  "logging grids"],
        "6": [() => H.Groups.log(), "logging groups"],
        "7": [() => H.logIngames(), "logging ingames"],
       "70": [() => H.logIngames(), "logging ingames"],
       "71": [() => H.Groups.log(), "logging groups"],
      "241": [() => "< - FINIS: " + sequence + " - >"],
    },
    "aitest05m": {
        "1": [() => "< - START: " + sequence + " - >"],
        "2": [T.launch("g.scouts", 44), "launching 1 scout"], 
        "3": [() => H.Grids.dump(), "dumping grids"],
        "4": [() => H.Grids.log(),  "logging grids"],
       "20": [() => H.logIngames(), "logging ingames"],
       "21": [() => H.Groups.log(), "logging groups"],
       "70": [() => H.logIngames(), "logging ingames"],
       "71": [() => H.Groups.log(), "logging groups"],
      "241": [() => "< - FINIS: " + sequence + " - >"],
    },
    "aitest04m": {
        "1": [() => "< - START: " + sequence + " - >"],
        "3": [T.launch("g.grainpicker", 44, 44, 44), "launching 3 grainpickers"], 
       "12": [T.destroy(44), "destroying centre"],
       "14": [() => "calling for repair help"],
       "15": [() => H.logIngames(), "logging ingames"],
       "16": [() => H.Groups.log(), "logging groups"],
       "70": [() => H.logIngames(), "logging ingames"],
       "71": [() => H.Groups.log(), "logging groups"],
      "241": [() => "< - FINIS: " + sequence + " - >"],
    },
    "Xaitest03": {
       "1": [() => "< - START: " + sequence + " - >"],
       "2": [T.launch("g.grainpicker", 44, 44), "launching 2 grainpickers"], 
      "10": [() => "please wait a moment"],
      "22": [T.destroy(216), "destroying field"],
      "30": [T.destroy(223, 224, 225), "destroying female units"],
      "44": [() => "ACTION"],
      "50": [T.launch("g.grainpicker", 44, 44, 44, 44, 44), "launching 5 grainpickers"], 
     "210": [() => "< - FINIS: " + sequence + " - >"],
    }
  };


  // fires functions at give tick num, 
  H.Tester = (function(){

    var t0, triggers;
    
    return {
      boot:     function(){
        self = this; 
        if (TESTERDATA !== undefined){
          H.each(TESTERDATA, function(attr, value){
            deb("tester: %s : %s", attr, value);
            if (attr.slice(0,2) === "On"){
              self[attr] = new Function(value);
            } else {
              self[attr] = value;
            }
          });
        }
        return self;
      },
      activate: function(seq){
        sequence = seq || H.Config.sequence;
        deb("TESTER: activated sequence: %s", sequence);
      },
      log:      function(){
        var 
          cnt = H.count(sequences[sequence]),
          lst = H.attribs(sequences[sequence]).join(",");
        deb("      :");
        deb("      :");
        deb("      : TESTER running sequence: %s with %s ticks [%s]", sequence, cnt, lst);
        deb("      :");
        deb("      :");
      },
      evaluate: function(item){
        return (
          typeof item === "string"   ? chat(H.format("# %s %s", tick, item)) :
          typeof item === "function" ? self.evaluate(item()) :
          Array.isArray(item) ? void (item.map(fn => fn())) :
            undefined
        );
      },
      tick:     function(secs){
        t0 = Date.now();
        if (sequences[sequence]){
          if (tick === 0){self.log();}  
          if (sequences[sequence][+tick]){
            triggers = sequences[sequence][+tick];
            // deb("     T: firing: %s, tick: %s, msg: %s", sequence, tick, triggers.filter(t=>typeof t === "string")[0] || "");
            triggers.forEach(function(item){
              self.evaluate(item);
            });
          }
        }
        tick += 1;
        return Date.now() - t0;
      }
    };

  }().boot());

return H; }(HANNIBAL));
/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- T O O L S ---------------------------------------------------

  Some useful objects for Hanninbal


  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H) {

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

    var ss, gs, key = 0, resolution = 10;

    function out (data) {print(data + "\n");}
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
      init: function(sharedscript, gamestate){
        ss = sharedscript;
        gs = gamestate;
        resolution = H.Config.numerus.resolution;
        deb();deb("NUMRUS: Logging every %s ticks to: %s", resolution, H.Config.numerus.file);
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
/*globals HANNIBAL, deb, logObject, uneval */

/*--------------- T E C H N O L O G Y   T R E E  ------------------------------

  Models the dependencies of entities and technologies
  is source for culture/store + acts as a fast cache for producers, planner, eco

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/

/*

  TODO: 

    disabled templates: http://trac.wildfiregames.com/changeset/15862

*/


HANNIBAL = (function(H){


  // H.TechTree = function (idplayer) {

  //   deb();deb();

  //   this.id = idplayer;
  //   this.civ = H.Players[idplayer].civ;
  //   this.nodes = {};

  //   this.sources = [].concat(
  //     H.attribs(H.Players[idplayer].researchedTechs), 
  //     H.attribs(H.SharedScript._techModifications[idplayer]),
  //     H.attribs(H.Entities)
  //       .filter(id => H.Entities[id].owner() === idplayer)
  //       .map(id => H.Entities[id]._templateName)
  //   );    
  //   this.sources = H.unique(this.sources).map(src => [0, src]);

  //   deb("  TREE: expanding %s sources for id: %s with civ: %s", H.count(this.sources), this.id, this.civ);
    
  //   this.build();
  //   this.names = H.attribs(this.nodes);
  //   this.keys  = H.attribs(this.nodes).map(t => this.nodes[t].key);

  //   deb("     T: found %s nodes", this.names.length);

  // };

  // H.TechTree.prototype = {
  //   constructor: H.TechTree,
  //   phases: phases,
  //   export: function () {

  //     var 
  //       t, procs, prods,
  //       tt = this.nodes, tpls = H.attribs(this.nodes),
  //       filePattern = "/home/noiv/Desktop/0ad/tree-%s-json.export";

  //     function logg(){
  //       print ( arguments.length === 0 ? 
  //         "#! append 0 ://\n" : 
  //         "#! append 0 :" + H.format.apply(H, arguments) + "\n"
  //       );
  //     }   

  //     deb("  TREE: Export start ...");
  //     print(H.format("#! open 0 %s\n", H.format(filePattern, this.civ)));
  //     logg("// EXPORTED tree '%s' at %s", this.civ, new Date());

  //     tpls.sort((a, b) => tt[a].order - tt[b].order);

  //     tpls.forEach(function(tpln){

  //       t = tt[tpln];

  //       logg("     T:   %s %s %s %s", t.order, t.type, t.phase, t.name);
  //       logg("     T:        d: %s,  o: %s", H.tab(t.depth, 4), H.tab(t.operations, 4));
  //       logg("     T:        %s", t.key);
  //       logg("     T:        reqs: %s", t.requires || "none");
  //       logg("     T:        flow: %s", t.flow ? JSON.stringify(t.flow) : "none");

  //       logg("     T:        verb: %s", t.verb || "none");
  //       prods = H.attribs(t.producers);
  //       if (prods.length){
  //         prods.forEach(p => logg("     T:          %s", p));
  //       } else {
  //         logg("     T:        NO PRODUCER");
  //       }

  //       logg("     T:        products: %s", t.products.count);
  //       if (t.products.count){
  //         ["train", "build", "research"].forEach(verb => {
  //           procs = H.attribs(t.products[verb]);
  //           if (procs.length){
  //             logg("     T:          %s", verb);
  //             procs.forEach(p => logg("     T:            %s", p));
  //           }
  //         });
  //       }

  //     });

  //     print("#! close 0\n");
  //     deb("  TREE: Export Done ...");

  //   },
  //   finalize: function(){

  //     // called after culture was loaded

  //     var 
  //       tech, name, producers, nodes = this.nodes, t0 = Date.now(),
  //       operMapper = {
  //         "BUILDBY":       "build_structures",
  //         "TRAINEDBY":     "train_units",
  //         "RESEARCHEDBY":  "research_tech"
  //       },
  //       verbMapper = {
  //         "BUILD":    "BUILDBY",
  //         "TRAIN":    "TRAINEDBY",
  //         "RESEARCH": "RESEARCHEDBY"
  //       };

  //     H.QRY("ENABLE DISTINCT").forEach(node => {
  //       tech = H.QRY(node.name + " REQUIRE").first().name;
  //       nodes[node.name].requires = tech;
  //     });

  //     // uplink info, producer

  //     "TRAIN BUILD RESEARCH".split(" ").forEach(verb => {
  //       H.QRY(verb + " DISTINCT").forEach(ent => {
  //         H.QRY(ent.name + " " + verbMapper[verb]).forEach(p => {
  //           nodes[ent.name].producers[p.name] = p;
  //         });
  //         nodes[ent.name].verb = verb.toLowerCase();
  //         nodes[ent.name].operator = H.HTN.Economy.operators[operMapper[verbMapper[verb]]];
  //       });
  //     });  

  //     H.QRY("PAIR DISTINCT").forEach(tech => {  
  //       H.QRY(tech.name + " PAIREDBY RESEARCHEDBY").forEach(p => {
  //         nodes[tech.name].producers[p.name] = p;
  //       });
  //       nodes[tech.name].verb = "research";
  //       nodes[tech.name].operator = H.HTN.Economy.operators.research_tech;
  //     });          

  //     H.QRY("SUPERSEDE DISTINCT").forEach(tech => {  
  //       H.QRY(tech.name + " SUPERSEDEDBY RESEARCHEDBY").forEach(p => {
  //         nodes[tech.name].producers[p.name] = p;
  //       });
  //       nodes[tech.name].verb = "research";
  //       nodes[tech.name].operator = H.HTN.Economy.operators.research_tech;
  //     });          

  //     // downlink info, products

  //     H.each(nodes, function(name, node){
  //       "TRAIN BUILD RESEARCH".split(" ").forEach(verb => {
  //         H.QRY(name + " " + verb).forEach(p => {
  //           nodes[name].products.count += 1;
  //           nodes[name].products[verb.toLowerCase()][p.name] = p;
  //         });
  //       });
  //     });

  //     H.QRY("RESEARCHEDBY DISTINCT").forEach(researcher => {  
  //       H.QRY(researcher.name + " RESEARCH PAIR").forEach(p => {
  //         nodes[researcher.name].products.research[p.name] = p;
  //         nodes[researcher.name].products.count += H.count(nodes[researcher.name].products.research);
  //       });
  //     });          

  //     H.QRY("RESEARCHEDBY DISTINCT").forEach(researcher => {  
  //       H.QRY(researcher.name + " RESEARCH SUPERSED").forEach(p => {
  //         nodes[researcher.name].products.research[p.name] = p;
  //         nodes[researcher.name].products.count += H.count(nodes[researcher.name].products.research);
  //       });
  //     });          


  //     // setting research as verb for all phase alternatives

  //     // H.range(1, 4).forEach(n => {
  //     H.loop(3, n => {
  //       phases[n].alternates.forEach(a => {
  //         name = H.saniTemplateName(a);
  //         if (nodes[name] && !nodes[name].verb){
  //           nodes[name].verb = "research";
  //         }
  //       });
  //     });

  //     // setting producers for all phase alternatives

  //     H.loop(3, n => {
  //       producers = null;
  //       phases[n].alternates.forEach(a => {
  //         name = H.saniTemplateName(a);
  //         if (nodes[name] && H.count(nodes[name].producers)){
  //           producers = nodes[name].producers;
  //         }
  //       });
  //       // deb("  TREE: phase: %s, producers: %s", phases[n].abbr, uneval(producers));
  //       phases[n].alternates.forEach(a => {
  //         name = H.saniTemplateName(a);
  //         if (nodes[name] && !H.count(nodes[name].producers)){
  //           nodes[name].producers = H.deepcopy(producers);
  //           // deb("tree: set %s", name);
  //         }
  //       });
  //     });

  //     // setting max resource flow for all trainer

  //     H.each(nodes, function(name, node){
  //       node.flow = ( H.count(node.products.train) ?
  //         H.getFlowFromTrainer(name) :
  //         null
  //       );
  //     });

  //     deb();deb();deb("  TREE: finalized %s msecs, %s nodes", Date.now() - t0, H.count(nodes));

  //   },
  //   getType: function(tpln){

  //     return (
  //       H.TechTemplates[tpln]         ? "tech" :
  //       tpln.contains("units/")       ? "unit" :
  //       tpln.contains("structures/")  ? "stuc" :
  //       tpln.contains("other/")       ? "othr" :
  //       tpln.contains("gaia/")        ? "gaia" :
  //       tpln.contains("pair_/")       ? "pair" :
  //         "XXXX"
  //     );

  //   },
  //   getPhase: function(tpln, space){

  //     var test, phase = "phase_village", tpl = H.Templates[tpln] || H.TechTemplates[tpln];

  //     space = space || ""; // deb

  //     if ((test = H.test(tpl, "Identity.RequiredTechnology"))){
  //       phase = test;
  //     } else if ((test = H.test(tpl, "requirements.any"))){
  //       phase = test[0].tech;
  //     } else if ((test = H.test(tpl, "requirements.tech"))){
  //       phase = test;
  //     } else if (phases.find(tpln)){
  //       phase = phases.prev(tpln).generic;
  //     } else if (tpl.top) {
  //       return this.getPhase(tpl.top, space + "  ");
  //     }

  //     // deb("     P:%s %s -> %s", space, tpln, phase);

  //     if (!phases.find(phase)){
  //       return this.getPhase(phase, space + "  ");
  //     } else {
  //       return phase;
  //     }


  //   },
  //   build: function (){

  //     // picks from sources, analyzes, and appends branches to sources
  //     // thus traversing the tree

  //     var 
  //       tpln, key, tpl, name, src, test, depth = 0,
  //       push = function(item){this.sources.push([depth, item]);}.bind(this);

  //     while (this.sources.length){

  //       src  = this.sources.shift();
  //       tpln = src[1];
  //       key  = tpln.replace(/\{civ\}/g, this.civ);
  //       tpl  = H.Templates[key] || H.TechTemplates[key];
  //       name = H.saniTemplateName(key);

  //       if (!this.nodes[name]){

  //         this.nodes[name] = {
  //           name:          name,     // sanitized API template name
  //           key:            key,     // API template name
  //           type:            "",     // tech, unit, stuc
  //           template:       tpl,     // API template
  //           depth:       src[0],     // local depth
  //           operations:       0,     // planning depth, set in HTN.Economy
  //           order:            0,     // execution order, set in HTN.Economy
  //           phase:           "",     // vill, town, city
  //           requires:        "",     // sanitized tech template name
  //           producers:       {},     // {name: node, }
  //           verb:            "",     // train, build, research // uplink
  //           products: {              // downlink
  //             count:          0,     // amount of products
  //             train:         {},     // {name: node, }
  //             build:         {}, 
  //             research:      {}
  //           }, 
  //           operator:      null,    // planner.operator
  //         };

  //         // unit promotion
  //         if(key.slice(-2) === "_b"){
  //           push(key.slice(0, -2) + "_e");
  //           push(key.slice(0, -2) + "_a");
  //         }

  //         // can research tech
  //         if ((test = H.test(tpl, "ProductionQueue.Technologies._string"))){
  //           test.split(" ").forEach(push);
  //         }

  //         // can train ents
  //         if ((test = H.test(tpl, "ProductionQueue.Entities._string"))){
  //           test.split(" ").forEach(push);
  //         }

  //         // can build structs
  //         if ((test = H.test(tpl, "Builder.Entities._string"))){
  //           test.split(" ").forEach(push);
  //         }

  //         // needs tech
  //         if ((test = H.test(tpl, "Identity.RequiredTechnology"))){
  //           push(test);
  //         }

  //         // is tech
  //         if (tpl.supersedes){push(tpl.supersedes);}
  //         if (tpl.bottom){push(tpl.bottom);}
  //         if (tpl.top){push(tpl.top);}

  //         depth += 1;

  //       }

  //     }

  //     H.each(this.nodes, function(name, node){
  //       node.type  = this.getType(node.key);
  //       node.phase = phases.find(this.getPhase(node.key)).abbr;
  //     }.bind(this));

  //   }

  // };

return H; }(HANNIBAL));
/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*--------------- V I L L A G E S ---------------------------------------------

  Organizes structures around civic centres,
  appoints mayor and custodians

  tested with 0 A.D. Alpha 17 Quercus
  V: 0.1, agentx, CGN, Nov, 2014

*/


HANNIBAL = (function (H){

  H.LIB.Villages = function (context){

    H.extend(this, {

      name:  "villages",
      context:  context,
      imports:  [
        "id",
        "map",
        "query",
        "events",
        "groups",
        "config",
        "objects",
        "entities", // hasClass
        "metadata",
      ],

      main:      0,
      centres:   null, 

      counter: {
        units:  0,
        mayors: 0,
        shared: 0,
        other:  0,
      }
      
   });

  };

  H.LIB.Villages.prototype = {
    contructor: H.LIB.Villages,
    log: function () {
      deb();
      deb("VILLGE:    main: %s, counts: %s", this.main, JSON.stringify(this.counter));
      deb("     V: centres: %s", JSON.stringify(this.centres));
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

      this.events.on("ConstructionFinished", function (msg){

        var order = this.objects(this.metadata[msg.id].order);

        if (order.cc){
          this.metadata[msg.id].cc = order.cc;
          // deb("  VILL: set cc: %s of %s %s", order.cc, msg.id, H.Entities[msg.id]._templateName);
        }

      });

      this.events.on("BroadCast", function (msg){

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
        ccNodes, ccId, getMain = () => {
          var max = -1, cic;
          H.each(this.centres, (id, list) => {
            if (list.length > max){cic = id; max = list.length;}
          });
          return ~~cic;
        };

      // find all CC
      ccNodes = this.query("civcentre CONTAIN INGAME").forEach( node => {
        this.centres[node.id] = [];
      });

      if (!ccNodes.length){
        deb("ERROR : organizeVillage No CC found with: civcentre CONTAIN INGAME");
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

      this.main = getMain();

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
              this.metadata[id].opname = "g.mayor";
              // deb("     V: set opname to 'g.mayor' for %s", ent);

            } else if (this.isShared(ent)){
              this.counter.shared += 1;
              this.metadata[id].opname = "g.custodian";
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

  };

return H; }(HANNIBAL));  
