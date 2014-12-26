/*jslint bitwise: true, browser: true, moz: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals  dateNow, uneval, putstr, version, options */

/*

  tests various tecnics to loop over all properties of an object
  and calls a function with with property name + value

*/ 



var
  t0 = dateNow(),
  tab = function (s,l){l=l||8;s=new Array(l+1).join(" ")+s;return s.substr(s.length-l);},
  toArray = function (a){return Array.prototype.slice.call(a);},
  format = function (){var a=toArray(arguments),s=a[0].split("%s"),p=a.slice(1).concat([""]),c=0;return s.map(function(t){return t + p[c++];}).join("");},
  deb = function(){print(tab((dateNow() - t0).toFixed(1), 5), format.apply(null, arguments));};

print();
deb("Start V: %s, O: %s", version(), options());

// some globals

var 
  repeat,  // repeat specific test
  loops,   // calling the loop
  timing;  // keeps timing matrix


// TEST SUITE

// functions to profile
var process = {

  "0" : {
    title: "reference",
    func: null
    },

  "1" : {
    title: "function",
    func: function (){}
    },

  "2" : {
    title: "lambda",
    func: () => null
    },

  "3" : {
    title: "return number",
    func: function (){return 1;}
    },

  "4" : {
    title: "return function",
    func: function (){return function(){};}
    },

  "5" : {
    title: "invoke function",
    func: function (){return function(){}();}
    },

  "6" : {
    title: "return number with invoked function",
    func: function (){return function(){return 1;}();}
    },

  "7" : {
    title: "return processed number with invoked function",
    func: function (){var n = 2; return function(){return n + 1;}();}
    },


};



// HELPER

function reset () {
  timing = {};
  Object.keys(process).forEach((key, idx) => timing[idx] = new Array(repeat).map(()=>NaN));
}

function result () {
  var avg, min, max, lst;
  Object.keys(timing).forEach(k => {
    avg = parseFloat((timing[k].reduce((a, b) => a + b, 0) / timing[k].length)).toFixed(1);
    min = Math.min.apply(Math, timing[k]).toFixed(1);
    if (avg > 2){
      lst = JSON.stringify(timing[k].map(n => parseFloat(n.toFixed(1))));
      deb("p%s avg: %s min: %s list: %s", k, tab(avg, 5), tab(min, 5), lst);
    } else {
      lst = JSON.stringify(timing[k].map(n => Math.round(n)))
      deb("p%s avg: %s min: %s list: %s", k, tab(avg, 5), tab(min, 5), lst);
    }
  });
  print();
}

function rnd(){return Math.random().toString(36).slice(2);}

function profile(){

  var t0, i, j, k, len, fn;
  
  len = Object.keys(process).length;
  
  for (i=0; i<len; i++){

    deb("running: p%s : '%s' ... ", i, process[i].title) ;

    for (j=0; j<repeat; j++){

      k  = loops; 
      fn = process[i].func;
      t0 = dateNow();

      if (fn) {
        while (k--){fn();}

      } else {
        while (k--){}

      }

      timing[i][j] = dateNow() - t0;   
    }

  }
  
  print();
}

print();
loops = 1000000; repeat = 30;
deb("Testing %s iterations", loops);

  reset();
  profile();
  result();

deb("Done");