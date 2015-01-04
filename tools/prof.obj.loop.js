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
  deb     = function(){print((dateNow() - t0).toFixed(1), format.apply(null, arguments));},

// http://primes.utm.edu/lists/small/10000.txt  
  slow    = function (n, i){for(i=n;n%--i;);return i===1;};

print();
deb("Start V: %s, O: %s", version(), options());

// some globals

var 
  obj,     // the object looped over
  map,     // the map looped over
  size,    // amount of properties
  loops,   // amount of tests
  timing;  // keeps timing matrix


// TEST SUITE

// the dummy functions called 

var dummy = {
  "0": function (key, value){return;},                      // does nothing 
  "1": function (key, value){return "a";},                  // return string
  "2": function (key, value){return value === value;},      // a simple compare
  // "3": function (key, value){return (value + value + value).slice(0, 10).contains("XXXXXX");}, // do something
  // "3": function (key, value){return slow(104729);}, // do something
  // "3": function (key, value){return slow(10099);}, // do something
  "3": function (key, value){return slow(5011);}, // do something
};

// the different lopp types
var process = {

  "0" : {
    title: "reference",
    func: function (obj, map, fn){
      var key, test;
      for (key in obj){test = (key + key + key).slice(0, 10);}
    }},

  "1" : {
    // deprecated
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for_each...in
    title: "using object with for each (.. in ..)",
    func: function (obj, map, fn){
      var value; 
      for each (value in obj){fn(undefined, value);}
    }},

  "2" : {
    title: "using object with for over Object.keys()",
    func: function (obj, map, fn){
      var i, keys = Object.keys(obj), len = keys.length; 
      for (i=0; i<len; i++){
        fn(keys[i], obj[keys[i]]);
      }
    }},

  "3" : {
    title: "using object with forEach Object.keys()",
    func: function (obj, map, fn){
      Object.keys(obj).forEach(key => fn(key, obj[key]));
    }},

  "4" : {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in
    title: "using object with for (.. in .. )",
    func: function (obj, map, fn){
      var key; 
      for (key in obj){fn(key, obj[key]);}
    }},

  "5" : {
    // experimental
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
    title: "using map with for (.. of .. )",
    func: function (obj, map, fn){
      var value; 
      for (value of map){fn(undefined, value);}
    }},

  "6" : {
    // experimental
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
    title: "using map with forEach",
    func: function (obj, map, fn){
      map.forEach(fn);      
    }},


};



// HELPER

function reset () {
  timing = {};
  Object.keys(dummy).forEach((key, idx) => timing[idx] = []);
}

function result () {
  Object.keys(timing).forEach(k => {
    var avg = parseFloat((timing[k].reduce((a, b) => a + b, 0) / timing[k].length)).toFixed(1);
    if (avg > 2){
      deb("p%s avg: %s list: %s", k, tab(avg, 6), JSON.stringify(timing[k].map(n => parseFloat(n.toFixed(1)))));
    } else {
      deb("p%s avg: %s list: %s", k, tab(avg, 6), JSON.stringify(timing[k].map(n => Math.round(n))));
    }
  });
  print();
}

function rnd(){return Math.random().toString(36).slice(2);}

function init(osize){

  obj = {};
  map = Map();
  
  while(osize--){
    obj[rnd()] = rnd();     // random prop names with random string values
    map.set(rnd(), rnd());   // same
  }

  print();

}

function profile(index){

  var t0, i, j, len;
  
  deb("running: [%s] '%s' ... ", index, process[index].title) ;
  len = Object.keys(dummy).length;
  
  for (i=0; i<len; i++){
    j = loops; while (j--){

    t0 = dateNow();
    process[index].func(obj, map, dummy[i]);
    timing[i].push(dateNow()-t0);   

    }
  }
  
  print();
}

print();
size = 20000; loops = 10;
deb("Testing %s full iterations over Object of length: ", loops, size);

init(size, loops);

[0, 1, 2, 3, 4, 5, 6].forEach(idx => {
  reset();
  profile(idx);
  result();
});

deb("Done");