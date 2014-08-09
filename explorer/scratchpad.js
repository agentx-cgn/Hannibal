
var g = new H.Grid(512, 512, 8),
    fmt = H.format,
    f1 = function(s){return (s === 16 || s === 32 || s === 64 || s === 255) ? 255 : 0;},
    f2 = s => (s === 16 || s === 32 || s === 64 || s === 255) ? 255 : 0,
    tims = {}

function process0(source, fn){
  var 
   t0, s, i = source.width * source.width,
   data = source.data, grid = new H.Grid(source.width, source.width, source.bits);

  t0 = Date.now();
  while (i--) {
    s = source[i];
    grid.data[i] = (s === 16 || s === 32 || s === 64 || s === 255) ? 255 : 0;
  }
  tims[0] = Date.now()-t0;
  //console.log("process0", Date.now()-t0);
  return grid;
}


function process1(source, fn){
  var 
   t0, s, i = source.width * source.width,
   data = source.data, grid = new H.Grid(source.width, source.width, source.bits);

  t0 = Date.now();
  while (i--) {
    s = source[i];
    grid.data[i] = fn(source[i]);
  }
  tims[1] = Date.now()-t0;
//  console.log("process1", Date.now()-t0);
  return grid;
}

function process2(source, fn){

  var 
   t0, s, i = source.width * source.width,
   data = source.data, 
   grid = new H.Grid(source.width, source.width, source.bits),
   body = "";
  
  body += "var i = " + source.length + ";";
  body += "while (i--) { t[i] = f(s[i]);}";
  t0 = Date.now();
  Function("s", "t", "f", body)(data, grid, fn);  

  tims[2] = Date.now()-t0;
//  console.log("process2", Date.now()-t0);
  return grid;
}
function process3(source, fn){

  var 
   t0, s, i = source.width * source.width,
   data = source.data, 
   grid = new H.Grid(source.width, source.width, source.bits),
   body = "", fBody = fnBody(fn);
  
  body += "var i = " + source.length + ";";
  body += "while (i--) { t[i] = " + fBody + ";}";
  t0 = Date.now();
  Function("s", "t", body)(data, grid);  

  tims[3] = Date.now()-t0;
  // console.log("process3", Date.now()-t0);
  return grid;
}

function fnBody(fn){
  
  var body, source = fn.toSource();
  
  if (source.contains("return")){
    body = source.slice(source.indexOf("return") + 6, source.lastIndexOf("}")).trim();
    
  } else if (source.contains("=>")){
     body = source.slice(source.indexOf("=>") + 2).trim();
    
  } else {
    throw "can't handle that";
  }
  
  return body;
  
}

//process0(g, f1);
process0(g, f2);
//process1(g, f1);
process1(g, f2);
//process2(g, f1);
process2(g, f2);
//process3(g, f1);
process3(g, f2);
alert(JSON.stringify(tims));
