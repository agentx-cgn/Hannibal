/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals $, TIM, HANNIBAL, STRUCTURES, OTHER, H, deb */

/*--------------- B R O W S E R -----------------------------------------------

  manages explorer history



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){


  var size = 512, map, msgs, graph, terr, 
      cvsMap,  ctxMap,
      cvsTopo, ctxTopo,
      cvsClus, ctxClus,
      cvsPath, ctxPath,
      cvsGrid, ctxGrid,
      cvsRegw, ctxRegw,
      cvsRegl, ctxRegl,
      cvsPass, ctxPass,
      cvsEnts, ctxEnts,
      cvsCost, ctxCost,
      cvsTemp, ctxTemp,
      cvsTerr, ctxTerr,
      grdTerr, grdCost, 
      maps = [
        "Arcadia%2002.xml",
        "Azure%20Coast.xml",
        "Barcania.xml",
        "Belgian_Bog_night.xml",
        "Death%20Canyon%20-%20Invasion%20Force.xml",
        "Laconia%2001.xml",
        "Miletus.xml",
        "Saharan%20Oases.xml",
        "Sahel.xml",
        "Sandbox%20-%20Ptolemies.xml",
        "Savanna%20Ravine.xml",
        "Siwa%20Oasis.xml",
        "The%20Persian%20Gates.xml",
        "topo-128.xml",
        "Tropical%20Island.xml",      
     ],
     fmt;

  function msg(line){
    var pos1, pos2;
    if (line === ""){msgs.innerHTML = "";}
    else {
      try {
        pos1 = msgs.innerHTML.length;
        pos2 = pos1 + line.length;
        msgs.innerHTML += line + "\n";
        msgs.setSelectionRange(pos1, pos2);
      } catch(e){console.log("msg", e);}
    }
  }

  H.Maps = {
    default: "Arcadia%2002.xml",
    // default: "Tropical%20Island.xml",
    // default: "topo-128.xml",
    // default: "Fast%20Oasis.xml",
    init: function(){
      fmt  = H.format;
      msgs = $("txtMAP");
      terr = $("txtTerrain");
    },
    host: function(){return "//" + location.host;},
    path: function(){ 
      return (
        location.port === "8888" ? "/simulation/ai/hannibal/maps/" :
        location.port === "8080" ? "/mods/public/maps/scenarios/" :
          "/agentx/0ad/maps/" //"noiv.pythonanywhere.com"
      );
    },
    readMapList: function (fn) {
      var url, map, html = "", xhr = new XMLHttpRequest();
      if (location.host === "noiv.pythonanywhere.com"){
        maps.forEach(function(map){
          html += H.format("<option value='%s'>%s</option>", map, map.split("/").slice(-2).join("/"));
        });
        fn(html);
      } else {
        url = H.Maps.host() + H.Maps.path();
        xhr.onerror = function() {console.log("Error while getting: " + url);};
        xhr.onload  = function() {
          if (this.status === 200) {
            H.toArray(xhr.responseXML.getElementsByTagName("a")).forEach(function(link){
              map = decodeURI(link.href).split("/").slice(-1)[0];
              if (H.endsWith(map, "xml")){
                if (!H.endsWith(map, "default.xml")){
                  html += H.format("<option value='%s'>%s</option>", map, map);
                }
              }
            });
            fn(html);
          } else {

          }
        };
        xhr.open("GET", url);
        xhr.responseType = "document";
        xhr.send();  
      }
    },
    load: function(xml){

      var url = H.Maps.host() + H.Maps.path() + xml;

      TIM.step('Maps.load.in', xml);

      H.Maps.init();

      map = {
        units: [],
        trees: [],
        ships: [],
        stone: [],
        metal: [],
        fruits: [],
        structures: [],
        ents: null, // responseXML
        size: 0,
        points: [],
        buffer: null,
        players: 0,
        pos0: null,
        pos1: null,
        mouse: {x: null, y: null},
        graph: null,
        path: [],
      };

      msg(""); msg("map: " + xml);

      cvsMap = $("cvsMap"); ctxMap = cvsMap.getContext("2d"); //ctxMap.mozImageSmoothingEnabled = false;
      cvsMap.width = size; cvsMap.height = size;

      cvsTopo = $("cvsTopo"); ctxTopo = cvsTopo.getContext("2d");
      cvsEnts = $("cvsEnts"); ctxEnts = cvsEnts.getContext("2d");
      cvsClus = $("cvsClus"); ctxClus = cvsClus.getContext("2d");
      cvsPath = $("cvsPath"); ctxPath = cvsPath.getContext("2d");
      cvsGrid = $("cvsGrid"); ctxGrid = cvsGrid.getContext("2d"); // ctxGrid.mozImageSmoothingEnabled = false;
      cvsPass = $("cvsPass"); ctxPass = cvsPass.getContext("2d");
      cvsRegw = $("cvsRegw"); ctxRegw = cvsRegw.getContext("2d");
      cvsRegl = $("cvsRegl"); ctxRegl = cvsRegl.getContext("2d");
      cvsTemp = $("cvsTemp"); ctxTemp = cvsTemp.getContext("2d");
      cvsTerr = $("cvsTerr"); ctxTerr = cvsTerr.getContext("2d");
      cvsCost = $("cvsCost"); ctxCost = cvsCost.getContext("2d");

      var xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.responseType = "document";
      xhr.onload = function() {
        if (this.status === 200) {
          map.ents = xhr.responseXML.getElementsByTagName("Entity");
          msg("entities: " + H.toArray(map.ents).length);
          H.Maps.loadHeights(url, function(buffer){
            map.buffer = buffer;
            map.view = new DataView(map.buffer);
            map.version  = map.view.getUint32(4, true);
            map.datasize = map.view.getUint32(8, true);
            map.mapsize  = map.view.getUint32(12, true);
            map.length = (map.mapsize *16  +1) * (map.mapsize *16 +1);
            map.factor = map.mapsize *16/128 * 512/size;
            map.size = map.mapsize *16  +1;
            msg("size: " + map.mapsize *16);
            H.Maps.loadPass(url, map.size -1, function(image){
              if (image){
                grdTerr = new H.Grid(map.size -1, map.size -1, 8);
                map.pass = image;
                H.Grids.externalInit(map.size -1, map.size -1, 4);
                H.Maps.initTerr();
                H.Maps.initCost();
                msg("terrain: good");
              } else {
                map.pass = null;
                $("chkPass").checked = false;
                msg("terrain: failed");
              }
              H.Maps.renderMaps();
              if(map.pass){H.Maps.createGraph();}
              H.Maps.render();
              TIM.step("MAPS.load.out", xml);
            });

          });
        }
      };
      xhr.onerror = function() {
        var m = "Error while getting XML: " + url;
        msg(m); console.log(m);
      };
      xhr.send();      

    },
    onmousemove: function(e){

      if (!map){return;}

      var x, y, t, terrain, width = map.size -1;

      x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - this.offsetLeft;
      y = e.clientY + document.body.scrollTop  + document.documentElement.scrollTop  - this.offsetTop;

      map.mouse.x = x;
      map.mouse.y = y;
      map.mouse.mx = ~~(x  / size * width);
      map.mouse.my = ~~(y  / size * width);
      map.mouse.mi = map.mouse.my * width + map.mouse.mx;

      if (map.graph){
        t = grdTerr.data[map.mouse.mi];
        terrain = (
          t ===   0 ? "forbidden" : 
          t ===   8 ? "land" : 
          t ===  16 ? "shallow water" : 
          t ===  32 ? "deep water" : 
          t ===  64 ? "too steep" : 
          t === 255 ? "unknown" : 
            "wtf"
        );
        terr.innerHTML = fmt("[%s, %s] %s, %s", map.mouse.mx, map.mouse.my, t, terrain);
      } else {
        terr.innerHTML = fmt("[%s, %s] terrain unavailable", map.mouse.mx, map.mouse.my);
      }

    },
    onclick: function( /* e */ ){

      var t0, t1, t2, graph, start, end;

      if (map.pos0 === null){
        map.pos0 = [map.mouse.mx, map.mouse.my];
      } else {
        map.pos1 = map.pos0;
        map.pos0 = [map.mouse.mx, map.mouse.my];
      }

      if (map.pos1) {
        t0 = Date.now();
        graph  = new H.AI.Graph(map.graph, { diagonal: true, closest: true });
        start  = graph.grid[map.pos1[0]][map.pos1[1]];
        end    = graph.grid[map.pos0[0]][map.pos0[1]];
        H.AI.AStar.init(graph);
        t1 = Date.now();
        map.path = H.AI.AStar.search(start, end, { diagonal: true, closest: true });
        t2 = Date.now();
        msg(fmt("path: %s steps, %s/%s ms", map.path.length, t1-t0, t2-t1));
      }

      H.Maps.renderPath();
      H.Maps.render();

      // console.log("onclick", JSON.stringify(map.mouse));

    },
    clear: function(){
      cvsMap.width = cvsMap.height = size;
    },
    renderMaps: function(){
      H.Maps.renderTopo();
      H.Maps.renderEnts();
      H.Maps.renderPath();
      H.Maps.renderClus();
      H.Maps.renderGrid();
      H.Maps.renderPass();
      H.Maps.renderRegw();
      H.Maps.renderRegl();
      H.Maps.renderCost();
    },
    render: function(){
      cvsMap.width = cvsMap.width;
      if ($("chkTopo").checked) {ctxMap.drawImage(cvsTopo, 0, 0, map.size -1, map.size -1, 0, 0, size, size);}
      if ($("chkPass").checked) {ctxMap.drawImage(cvsPass, 0, 0, map.size -1, map.size -1, 0, 0, size, size);}
      if ($("chkRegw").checked) {ctxMap.drawImage(cvsRegw, 0, 0, map.size -1, map.size -1, 0, 0, size, size);}
      if ($("chkRegl").checked) {ctxMap.drawImage(cvsRegl, 0, 0, map.size -1, map.size -1, 0, 0, size, size);}
      if ($("chkGrid").checked) {ctxMap.drawImage(cvsGrid, 0, 0, map.size -1, map.size -1, 0, 0, size, size);}
      if ($("chkCost").checked) {ctxMap.drawImage(cvsCost, 0, 0, map.size -1, map.size -1, 0, 0, size, size);}
      if ($("chkPath").checked) {ctxMap.drawImage(cvsPath, 0, 0, size, size, 0, 0, size, size);}
      if ($("chkEnts").checked) {ctxMap.drawImage(cvsEnts, 0, 0, size, size, 0, 0, size, size);}
      if ($("chkClus").checked) {ctxMap.drawImage(cvsClus, 0, 0, size, size, 0, 0, size, size);}
    },
    initTerr: function(){

      // pathfinderObstruction:1, 
      // foundationObstruction:2, 
      // building-land:4, 
      // building-shore:8, 
      // default:16, 
      // ship:32, 
      // unrestricted:64

      var 
        i, s, t, source,
        width = map.size -1,
        len = width * width * 4,
        target = grdTerr.data,
        vals = {};

      cvsTemp.width = cvsTemp.height = width;
      cvsTerr.width = cvsTerr.height = width;
      ctxTemp.drawImage(map.pass, 0, 0, width, width, 0, 0, width, width);
      source = ctxTemp.getImageData(0, 0, width, width);

      for (i=0; i<len; i+=4) {
        s = source.data[i];
        t = (
          (s  &  1)              ?  0 : // dark   red : pathfinder obstruction forbidden
          (s  & 32) &&  (s & 64) ? 64 : //        red : land too steep
          (s  & 32) && !(s & 64) ? 32 : // dark  blue : deep water
          !(s & 16) &&  (s & 64) ? 16 : // light blue : land and water
          (s  & 16)              ?  8 : //      green : land only
            255                         // the gaps
        );
        target[i >>> 2] = t;
        vals[t] = vals[t] ? vals[t] +1 : 1;
      }

      grdTerr.render(cvsTerr);
      TIM.step("MAPS.terr", JSON.stringify(vals));


    },
    createGraphX: function(){

      var i, source, r, c, p, g, t0 = Date.now(),
          width = map.size -1,
          len = width * width * 4;

      cvsTemp.width = cvsTemp.height = width;
      ctxTemp.drawImage(map.pass, 0, 0, width, width, 0, 0, width, width);
      source = ctxTemp.getImageData(0, 0, width, width);

      map.graph = [];
      for (i=0;i<width;i++) {map.graph[i]=[];}

      for (i=0; i<len; i+=4) {
        p = source.data[i];
        g = (
          !(p & 16)  &&  (p & 64) ?  2 : // light blue : land and water
           (p &  32) &&  (p & 64) ?  0 : // dark red : land too steep
           (p &  32) && !(p & 64) ?  4 : // dark blue : deep water
           (p &  16)              ?  1 : // green : land only
             4 // gap to deep water
        );
        c = ~~((i>>2)/width);
        r = (i>>2) % width;
        map.graph[r][c] = g;
      }

      msg(fmt("graph: %s ms", (Date.now() - t0)));
      return graph;

    },
    fillRegion: function(source, target, type, index, color){

      var 
        i, idx, s, region, point, nextX, nextY, isRegion, // counter = 0,
        width  = target.width,
        y = ~~((index) / width),
        x = (index) % width,
        stack  = [[x,y]],
        tgt = target.data,     // 4 byte data
        src = source.data,     // 1 byte data
        dx = [ 0, -1, +1,  0],
        dy = [-1,  0,  0, +1];

      while (stack.length) {

        point = stack.pop(); 
        x = point[0]; y = point[1];

        idx = (y * width + x) << 2;
        tgt[idx + 0] = color[0];
        tgt[idx + 1] = color[1];
        tgt[idx + 2] = color[2];
        tgt[idx + 3] = color[3];

        for (i = 0; i < 4; i++) {

          nextX  = x + dx[i];
          nextY  = y + dy[i];
          idx    = (nextY * width + nextX);
          region = tgt[idx << 2];

          if (!region && nextX >= 0 && nextY >= 0 && nextX < width && nextY < width) {

            s = src[idx];

            isRegion = (
              type === "l" ? ( s ===  8 || s === 16  ) : 
              type === "w" ? ( s === 16 || s === 32 || s === 255) : 
                false
            );

            if (isRegion){stack.push([nextX, nextY]);}

          }
        }
      }

      // console.log("fillRegion", region, counter);

    },
    createGraph: function(){

      //   t ===   0 ? "forbidden" : 
      //   t ===   8 ? "land" : 
      //   t ===  16 ? "shallow" : 
      //   t ===  32 ? "deep water" : 
      //   t ===  64 ? "too steep" : 
      //   t === 255 ? "unknown" : 

      var i, source, r, c, ct, tr, gh, t0 = Date.now(),
          width = map.size -1,
          len = width * width;

      map.graph = [];
      for (i=0;i<width;i++) {map.graph[i]=[];}

      for (i=0; i<len; i++) {
        ct = ~~(grdCost.data[i] / 48) ;
        tr = grdTerr.data[i];
        gh = (
          // no forbidden, deep, steep, gaps else cost.max => 4 else 1
          (tr === 0 || tr === 32 || tr === 64 || tr === 255) ? 0 : ct + 1
        );
        c = ~~(i/width);
        r = i % width;
        map.graph[r][c] = gh;
      }

      msg(fmt("graph: %s ms", (Date.now() - t0)));
      return graph;

    },
    initCost: function(){
      var 
        t0 = Date.now(), t1, i, s,
        width = map.size -1,
        len = width * width,
        source = grdTerr.data,
        grdTemp = new H.Grid(width, width, 8);

      t1 = Date.now();

      for (i=0; i<len; i++) {
        s = source[i];
        // around shallow, deep, steep, gaps/unknown
        grdTemp.data[i] = (s === 16 || s === 32 || s === 64 || s === 255) ? 255 : 0;
      }

      grdCost = grdTemp.blur(3);

      msg(fmt("cost: %s ms", Date.now()-t0));
      TIM.step("MAPS.cost.out", fmt("%s ms, %s cnt", Date.now()-t0));    

    },
    renderCost: function(){

      var 
        t0 = Date.now(), i, idx, s, c, t,
        width = map.size -1,
        len = width * width,
        source  = grdCost.data,
        terrain = grdTerr.data;

      cvsCost.width = cvsCost.height = width;
      target = ctxCost.createImageData(width, width);

      for (i=0; i<len; i++) {
        s = source[i];
        t = terrain[i];
        color = (t ===  8 || t === 16) && (s > 0) ? [s, 0, 0, 128] : [0, 0, 0, 0];
        idx = i << 2;
        target.data[idx + 0] = color[0];
        target.data[idx + 1] = color[1];
        target.data[idx + 2] = color[2];
        target.data[idx + 3] = color[3];
      }

      ctxCost.putImageData(target, 0, 0);

    },
    renderRegw: function(){

      //   t ===   0 ? "forbidden" : 
      //   t ===   8 ? "land" : 
      //   t ===  16 ? "shallow" : 
      //   t ===  32 ? "deep water" : 
      //   t ===  64 ? "too steep" : 
      //   t === 255 ? "unknown" : 

      var 
        t0 = Date.now(), t1, i, s, target, color = 0, 
        width = map.size -1, 
        len = width * width;

      cvsRegw.width = cvsRegw.height = width;
      target = ctxRegw.createImageData(width, width);

      t1 = Date.now();
      for (i=0; i<len; i++) {
        if (!target.data[i << 2]) {
          s = grdTerr.data[i];
          if ( s === 16 || s === 32 || s === 255){
            H.Maps.fillRegion(grdTerr, target, "w", i, [++color, 0, 0, 255]);
          }
        }
      }

      ctxRegw.putImageData(target, 0, 0);

      msg(fmt("water: %s regs. %s ms", color, Date.now()-t1));

      TIM.step("MAPS.regw.out", fmt("%s/%s", t1-t0, Date.now()-t1));

    },
    renderRegl: function(){

      //   t ===   0 ? "forbidden" : 
      //   t ===   8 ? "land" : 
      //   t ===  16 ? "shallow" : 
      //   t ===  32 ? "deep water" : 
      //   t ===  64 ? "too steep" : 
      //   t === 255 ? "unknown" : 

      var 
        t0 = Date.now(), i, s, target, color = 0, 
        width = map.size -1, 
        len = width * width;

      cvsRegl.width = cvsRegl.height = width;
      target = ctxRegl.createImageData(width, width);

      // console.profile( "renderRegl" );

      for (i=0; i<len; i++) {
        if (!target.data[i << 2]) {
          s = grdTerr.data[i];
          if ( s === 16 || s === 8){
            H.Maps.fillRegion(grdTerr, target, "l", i, [++color, 0, 0, 255]);
          }
        }
      }

      // console.profileEnd();

      ctxRegl.putImageData(target, 0, 0);

      msg(fmt("land: %s regs. %s ms", color, Date.now()-t0));

      TIM.step("MAPS.regl.out", Date.now()-t0);    

    },
    renderPath: function(){

      var f = size / (map.size -1);

      cvsPath.width = cvsPath.height = size;
      ctxPath.lineWidth = 1;

      ctxPath.strokeStyle = "rgba(255, 255, 255, 0.7";
      map.path.forEach(function(p){
        ctxPath.strokeRect(p.x *f, p.y *f , 1, 1);
      });

      if (map.pos0){
        ctxPath.strokeStyle = "rgba(255, 255, 255, 0.7";
        ctxPath.beginPath();
        ctxPath.arc(map.pos0[0] *f, map.pos0[1] *f, 7, 0, 2 * Math.PI, false);
        ctxPath.stroke();
        ctxPath.strokeStyle = "rgba(255, 255, 0, 0.7";
        ctxPath.strokeRect(map.pos0[0] *f, map.pos0[1] *f , 1, 1);
      }

      if (map.pos1){
        ctxPath.strokeStyle = "rgba(255, 0, 0, 0.7";
        ctxPath.beginPath();
        ctxPath.arc(map.pos1[0] *f, map.pos1[1] *f, 7, 0, 2 * Math.PI, false);
        ctxPath.stroke();
        ctxPath.strokeStyle = "rgba(255, 255, 0, 0.7";
        ctxPath.strokeRect(map.pos1[0] *f, map.pos1[1] *f , 1, 1);
      }

    },
    renderGrid: function(){
      var x, y;
      cvsGrid.width = cvsGrid.height = map.size -1;
      ctxGrid.setTransform(1,0,0,1,0,0);
      // ctxGrid.translate(0.5, 0.5);
      for (x=0; x<map.size -1; x++){
        for (y=0; y<map.size -1; y++){
          ctxGrid.fillStyle = (x+y)%2 ? "rgba( 255, 255, 255, 0.4)" : "rgba( 0, 0, 0, 0.4)";
          ctxGrid.fillRect(x, y, 1, 1);
        }
      }
    },
    renderPass: function(){

      //   t ===   0 ? "forbidden" : 
      //   t ===   8 ? "land" : 
      //   t ===  16 ? "shallow" : 
      //   t ===  32 ? "deep water" : 
      //   t ===  64 ? "too steep" : 
      //   t === 255 ? "unknown" : 

      if (!map.pass){return;}
    
      var 
        i, t, source, target, vals = {}, c, 
        len = grdTerr.length,
        width = map.size -1;

      cvsPass.width = cvsPass.height = width;

      source = grdTerr.data;
      target = ctxPass.createImageData(width, width);

      for (i=0; i<len; i++) {
        t = source[i];
        c = (
          t ===   0 ? [ 128,   0,   0, 160] : // forbidden, dark red
          t ===   8 ? [   0, 255,   0,  48] : // land, gree
          t ===  16 ? [ 100, 220, 255,  96] : // shallow, light blue
          t ===  32 ? [ 100, 100, 255,  64] : // deep water, dark blue
          t ===  64 ? [ 255,   0,   0,  96] : // too steep, light red
          t === 255 ? [ 100, 100, 255,  64] : // assuming deep water for gaps, dark blue
            [ 255,   0,   0,  255] // error, bright red 
        );
        target.data[i *4 + 0] = c[0];
        target.data[i *4 + 1] = c[1];
        target.data[i *4 + 2] = c[2];
        target.data[i *4 + 3] = c[3];
        vals[t] = vals[t] ? vals[t] +1 : 1;
      }

      ctxPass.putImageData(target, 0, 0);

      console.log("renderPass", vals);  // here is some undefined
 
    },
    renderTopo: function(){

      var i, off, h, data;

      // console.log("Maps.renderTopo:", "bytes", map.buffer.byteLength, "mapsize", map.mapsize, "factor", map.factor, "size", map.size);

      cvsTopo.width = cvsTopo.height = map.size -1;
      cvsTemp.width = cvsTemp.height = map.size;

      data = ctxTemp.getImageData(0, 0, map.size, map.size);

      for (i=0, off=16; i<map.length; i++, off+=2) {
        h = map.view.getUint16(off, true) >> 8;
        if (h) {
          data.data[i *4 + 0] = h;
          data.data[i *4 + 1] = h;
          data.data[i *4 + 2] = h;
        } else {
          data.data[i *4 + 0] =  80;
          data.data[i *4 + 1] = 140;
          data.data[i *4 + 2] = 220;
        }
        data.data[i *4 + 3] = 256;
      }

      ctxTemp.putImageData(data, 0, 0);

      ctxTopo.setTransform(1, 0, 0, 1, 0, 0);
      ctxTopo.translate(0, map.size -1);
      ctxTopo.scale(1, -1);
      ctxTopo.drawImage(cvsTemp, 0, 0, map.size -1, map.size -1, 0, 0, map.size, map.size); // cutoff extra pixl

      TIM.step("MAPS.topo.out", map.buffer.byteLength + " bytes");

    },
    renderEnts: function(){

      var style, rec, w1, h1, w2, h2;

      cvsEnts.width = cvsEnts.height = size;

      ctxEnts.setTransform(1, 0, 0, 1, 0, 0);
      ctxEnts.translate(0, size);
      ctxEnts.scale(1, -1);

      H.toArray(map.ents).forEach(function(ent){

        var pos = ent.getElementsByTagName("Position")[0],
            ori = ent.getElementsByTagName("Orientation")[0],
            tpl = ent.getElementsByTagName("Template")[0].innerHTML,
            plr = ent.getElementsByTagName("Player").length ? ~~ent.getElementsByTagName("Player")[0].innerHTML : null,
            x = +pos.getAttribute("x")/map.factor,
            z = +pos.getAttribute("z")/map.factor,
            y = +ori.getAttribute("y");

        map.players = plr ? plr > map.players ? plr : map.players : map.players;

        style = (
          plr === null ?                     [0.0, "rgba(    0,   0,   0, 0.0)"] :
          // tpl.contains("structures")       ? [4.0, "rgba( 255, 128,  0, 0.7)", "rgba(  255, 255, 255, 0.7)"] : 
          tpl.contains("ship")             ? [3.0, "rgba(  180, 180, 255, 0.9)"] : 
          tpl.contains("units")            ? [2.0, "rgba(  255, 255,   0, 0.9)"] : 
          tpl.contains("tree")             ? [2.0, "rgba(    0, 255,   0, 0.9)"] : 
          tpl.contains("bush")             ? [0.5, "rgba(    0, 100,   0, 0.5)"] : 
          tpl.contains("grass")            ? [0.5, "rgba(    0, 100,   0, 0.5)"] : 
          tpl.contains("gaia/fauna")       ? [1.0, "rgba(    0, 200, 100, 0.9)"] : 
          tpl.contains("gaia/geology")     ? [2.0, "rgba(  255,   0,   0, 0.9)"] : 
          // tpl.contains("other/fence")      ? [2.0, "rgba(  255,   0,   0, 0.9)"] : 
          tpl.contains("treasure")         ? [2.0, "rgba(  255,   0, 128, 0.9)"] : 
          tpl.contains("column")           ? [2.0, "rgba(  255,   0, 128, 0.9)"] : 
          // tpl.contains("eyecandy")         ? [2.0, "rgba(  255,   0, 128, 0.0)"] :  // ignore with plr null
            [1.1, "rgba(255, 255, 255, 1)"]
        );

        // if (style[0] === 1.1 || plr === null){ console.log(plr, tpl);}

        ctxEnts.lineWidth = 1;

        if (STRUCTURES[tpl]){
          style = [4.0, "rgba( 255, 128,  0, 0.7)", "rgba(  255, 255, 255, 0.7)"];
          w1 = STRUCTURES[tpl]['Footprint/Square@width']/map.factor; // bigger
          h1 = STRUCTURES[tpl]['Footprint/Square@depth']/map.factor;
          w2 = STRUCTURES[tpl]['Obstruction/Static@width']/map.factor;
          h2 = STRUCTURES[tpl]['Obstruction/Static@depth']/map.factor;
          ctxEnts.save();
          ctxEnts.translate(x, z);
          ctxEnts.rotate(-y);
          ctxEnts.fillStyle = style[1];
          ctxEnts.fillRect(-w2/2, -h2/2, w2, h2);
          ctxEnts.strokeStyle = style[2];
          ctxEnts.strokeRect(-w1/2, -h1/2, w1, h1);
          ctxEnts.restore();

        } else if (OTHER[tpl]){
          style = [4.0, "rgba( 255, 128,  0, 0.7)", "rgba(  255, 255, 255, 0.7)"];
          w1 = OTHER[tpl]['Footprint/Square@width']/map.factor; // bigger
          h1 = OTHER[tpl]['Footprint/Square@depth']/map.factor;
          w2 = OTHER[tpl]['Obstruction/Static@width']/map.factor;
          h2 = OTHER[tpl]['Obstruction/Static@depth']/map.factor;
          ctxEnts.save();
          ctxEnts.translate(x, z);
          ctxEnts.rotate(-y);
          ctxEnts.fillStyle = style[1];
          ctxEnts.fillRect(-w2/2, -h2/2, w2, h2);
          ctxEnts.strokeStyle = style[2];
          ctxEnts.strokeRect(-w1/2, -h1/2, w1, h1);
          ctxEnts.restore();

        } else {
          rec = style[0];
          ctxEnts.fillStyle = style[1];
          ctxEnts.fillRect(x -rec/2, z -rec/2, rec, rec);          
        }

        if (tpl.contains("tree")){map.trees.push({x:x, z:z});}
        if (tpl.contains("ship")){map.ships.push({x:x, z:z});}
        if (tpl.contains("units")){map.units.push({x:x, z:z});}
        if (tpl.contains("structures")){map.structures.push({x:x, z:z});}

      });     
      
      msg("trees: " + map.trees.length);
      msg("units: " + map.units.length);
      msg("players: " + map.players);
      msg("structures: " + map.structures.length);

      // ctxEnts.strokeStyle = "rgba(200, 200, 200, 0.8)";
      // ctxEnts.lineWidth = 1;
      // ctxEnts.strokeRect(128, 128, 256, 256);

    },
    renderClus: function(){

      var nCluster = ~~$("slcKMeans").value,
          typ = $("slcClus").value,
          points = map[$("slcClus").value] || [],
          k = new H.AI.KMeans(),
          c = 0;

      cvsClus.width = cvsClus.height = size;

      ctxClus.setTransform(1, 0, 0, 1, 0, 0);
      ctxClus.translate(0, size);
      ctxClus.scale(1, -1);

      if (!points.length){
        msg("cluster: no points for " + typ);
        return;
      }

      // k.kmpp = true;
      k.k = nCluster;
      k.kmpp = true;
      k.maxIterations = 50;
      k.maxWidth  = (map.size -1) ;// * map.factor *4;
      k.maxHeight = (map.size -1) ;// * map.factor *4;
      k.setPoints(points);
      k.initCentroids();
      k.cluster(function(centroids){
        c += 5;
        centroids.forEach(function(ctr){
          ctxClus.fillStyle = "rgba(" + c + ", 250, 0, 0.3";
          ctxClus.fillRect(ctr.x -4, ctr.z -4, 8, 8);
          // ctxClus.fillStyle = "rgba(255, 255, 255, 0.9";
          // ctxClus.fillRect(ctr.x -1, ctr.z -1, 2, 2);
        });
      });
      msg(H.format("cluster: %s/%s it, %s ms", k.iterations, k.maxIterations, k.msecs ));
      ctxClus.fillStyle = "rgba(255, 0, 0, 0.9";
      ctxClus.strokeStyle = "rgba(255, 255, 255, 0.9";
      k.centroids.forEach(function(ctr){
        ctxClus.fillRect(ctr.x -5, ctr.z -5, 10, 10);
      });

      // console.log("renderClus", "max", k.maxWidth, map.trees.length, k.centroids.length, "iter", k.iterations, k.converged, k.msecs);

    },
    loadHeights: function(url, fn){
      var xhr = new XMLHttpRequest();
      xhr.open("GET", H.replace(url, ".xml", ".pmp"));
      xhr.responseType = "arraybuffer";
      xhr.onload = function() {
        if (this.status === 200) {
          // console.log("loadPmp", xhr.response);
          fn(xhr.response);
        }
      };
      xhr.send();      
    },
    loadPass: function(url, size, fn){
      var img = $("imgPass"), loaded = false;
      img.width = img.height = size;
      img.onerror = function(){cb(null);};
      img.onload  = function(){cb(img);};
      img.src = H.replace(url, ".xml", ".png") + "?" + Math.random();
      function cb(val){
        if(!loaded){fn(val);}
        loaded = true;
      }
    },
  };




return H; }(HANNIBAL));   

