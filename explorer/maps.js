/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals $, HANNIBAL, H, deb */

/*--------------- B R O W S E R -----------------------------------------------

  manages explorer history



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){


  var size = 512, map, msgs,
      cvsMap,  ctxMap,
      cvsTopo, ctxTopo,
      cvsClus, ctxClus,
      cvsPath, ctxPath,
      cvsGrid, ctxGrid,
      cvsPass, ctxPass,
      cvsEnts, ctxEnts,
      cvsTemp, ctxTemp,
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
     ];

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
    // default: "scenarios/Arcadia%2002.xml",
    // default: "Tropical%20Island.xml",
    default: "topo-128.xml",
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

      console.log('Maps.load', xml, url);

      msgs = $("txtMAP");
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
        mouse: {x: null, y: null}
      };

      msg(""); msg("map: " + xml);

      cvsMap = $("cvsMap"); ctxMap = cvsMap.getContext("2d"); ctxMap.mozImageSmoothingEnabled = false;
      cvsMap.width = size; cvsMap.height = size;

      cvsTopo = $("cvsTopo"); ctxTopo = cvsTopo.getContext("2d");
      cvsEnts = $("cvsEnts"); ctxEnts = cvsEnts.getContext("2d");
      cvsClus = $("cvsClus"); ctxClus = cvsClus.getContext("2d");
      cvsPath = $("cvsPath"); ctxPath = cvsPath.getContext("2d");
      cvsGrid = $("cvsGrid"); ctxGrid = cvsGrid.getContext("2d"); ctxGrid.mozImageSmoothingEnabled = false;
      cvsPass = $("cvsPass"); ctxPass = cvsPass.getContext("2d");
      cvsTemp = $("cvsTemp"); ctxTemp = cvsTemp.getContext("2d");

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
                map.pass = image;
                msg("pass: good");
              } else {
                map.pass = null;
                $("chkPass").checked = false;
                msg("pass: failed");
              }
              H.Maps.renderMaps();
              H.Maps.render();
            });

          });
        }
      };
      xhr.onerror = function() {
        console.log("Error while getting XML.");
      };
      xhr.send();      

    },
    onclick: function(e){

      map.mouse.x = (e.clientX - this.offsetLeft);
      map.mouse.y = (e.clientY - this.offsetTop);

      if (map.pos0 === null){
        map.pos0 = [~~(map.mouse.x  / size * map.size), ~~(map.mouse.y / size * map.size)];
      } else {
        map.pos1 = map.pos0;
        map.pos0 = [~~(map.mouse.x  / size * map.size), ~~(map.mouse.y / size * map.size)];
      }
      H.Maps.renderPath();
      H.Maps.render();

      // console.log(e, this, "x", e.clientX - this.offsetLeft, "y", e.clientY - this.offsetTop);

    },
    clear: function(){
      cvsMap.width = size; cvsMap.height = size;
    },
    renderMaps: function(){
      H.Maps.renderTopo();
      H.Maps.renderEnts();
      H.Maps.renderPath();
      H.Maps.renderClus();
      H.Maps.renderGrid();
      H.Maps.renderPass();
    },
    render: function(){
      if ($("chkTopo").checked) {ctxMap.drawImage(cvsTopo, 0, 0, map.size -1, map.size -1, 0, 0, size, size);}
      if ($("chkPass").checked) {ctxMap.drawImage(cvsPass, 0, 0, map.size -1, map.size -1, 0, 0, size, size);}
      if ($("chkGrid").checked) {ctxMap.drawImage(cvsGrid, 0, 0, map.size -1, map.size -1, 0, 0, size, size);}
      if ($("chkPath").checked) {ctxMap.drawImage(cvsPath, 0, 0, map.size -1, map.size -1, 0, 0, size, size);}
      if ($("chkEnts").checked) {ctxMap.drawImage(cvsEnts, 0, 0, size, size, 0, 0, size, size);}
      if ($("chkClus").checked) {ctxMap.drawImage(cvsClus, 0, 0, size, size, 0, 0, size, size);}
    },
    renderPath: function(){

      cvsPath.width = cvsPath.height = map.size -1;

      if (map.pos0 && map.pos1){
        ctxPath.lineWidth = 1.0;
        ctxPath.strokeStyle = "rgba(200, 200, 0, 0.8";
        ctxPath.beginPath();
        ctxPath.moveTo(map.pos0[0], map.pos0[1]);
        ctxPath.lineTo(map.pos1[0], map.pos1[1]);
        ctxPath.stroke();
        console.log("renderPath", map.pos0[0], map.pos0[1], map.pos1[0], map.pos1[1]);
      }

    },
    renderGrid: function(){
      var x, y;
      cvsGrid.width = cvsGrid.height = map.size -1;
      ctxGrid.fillStyle = "rgba( 255, 255, 255, 0.3)";
      for (x=0; x<map.size -1; x++){
        for (y=0; y<map.size -1; y++){
          if ((x+y)%2){ ctxGrid.fillRect(x, y, 1, 1); }
        }
      }
    },
    renderPass: function(){
    
      // deb(uneval(H.SharedScript.passabilityClasses));
      // pathfinderObstruction:1, 
      // foundationObstruction:2, 
      // building-land:4, 
      // building-shore:8, 
      // default:16, 
      // ship:32, 
      // unrestricted:64

      var i, h, source, target, vals = {}, c;

      cvsPass.width = cvsPass.height = map.size -1;

      if (!map.pass){
        return;
      }

      ctxPass.drawImage(map.pass, 0, 0, map.size -1, map.size -1, 0, 0, map.size -1, map.size -1);

      source = ctxPass.getImageData(0, 0, map.size -1, map.size -1);
      target = ctxPass.createImageData(source);

      for (i=0; i<map.length *4; i+=4) {
        h = source.data[i];
        c = (
          // (h &   1) ? [255,   0,   0, 32] : // dark red : pathfinder obstruction forbidden
          // (h &   2) ? [255,   0,   0, 128] : // dark red : foundationObstruction
          // (h &   4) ? [255,   0,   0, 128] : // dark red : building-land
          // (h &   (8)) ? [255,   0,   0, 128] : // dark red : building-shore
          !(h & 16) &&  (h & 64) ? [ 100, 220, 255,  96] : // light blue : land and water
          (h &  32) &&  (h & 64) ? [ 255,   0,   0,  96] : // dark red : land too steep
          (h &  32) && !(h & 64) ? [ 100, 100, 255,  64] : // dark blue : deep water
          (h &  16)              ? [   0, 255,   0,  48] : // green : land only
          // (h &  16) ? [  0, 255,   0, 32] : // dark red : default
          // (h &  64) ? [  0,   0, 255, 32] : // dark red : unrestricted
          // (h &  1) ?              [ 255,   0,   0, 32] : // dark red : pathfinder obstruction forbidden
          // (h & 32 && !(h & 16)) ? [  0,    0, 255, 64] : // blue : for ships
          // (h &  8) && (h & 32)  ? [ 255,   0,   0, 32] : // green : land passable
            // [0,255,0,16]
            [0,0,0,0]
        );
        target.data[i + 0] = c[0];
        target.data[i + 1] = c[1];
        target.data[i + 2] = c[2];
        target.data[i + 3] = c[3];
        vals[h] = vals[h] ? vals[h] +1 : 1;
      }

      ctxPass.putImageData(target, 0, 0);

      console.log(vals);

    },
    renderTopo: function(){

      var i, off, h, data;

      console.log("Maps.renderTopo:", "bytes", map.buffer.byteLength, "mapsize", map.mapsize, "factor", map.factor, "size", map.size);

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

    },
    renderEnts: function(){

      var style, rec;

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
          tpl.contains("structures")       ? [4.0, "rgba(  255, 128,   0, 0.9)"] : 
          tpl.contains("ship")             ? [3.0, "rgba(  180, 180, 255, 0.9)"] : 
          tpl.contains("units")            ? [2.0, "rgba(  255, 255,   0, 0.9)"] : 
          tpl.contains("tree")             ? [2.0, "rgba(    0, 255,   0, 0.9)"] : 
          tpl.contains("bush")             ? [0.5, "rgba(    0, 100,   0, 0.5)"] : 
          tpl.contains("grass")            ? [0.5, "rgba(    0, 100,   0, 0.5)"] : 
          tpl.contains("gaia/fauna")       ? [1.0, "rgba(    0, 200, 100, 0.9)"] : 
          tpl.contains("gaia/geology")     ? [2.0, "rgba(  255,   0,   0, 0.9)"] : 
          tpl.contains("other/fence")      ? [2.0, "rgba(  255,   0,   0, 0.9)"] : 
          tpl.contains("treasure")         ? [2.0, "rgba(  255,   0, 128, 0.9)"] : 
          tpl.contains("column")           ? [2.0, "rgba(  255,   0, 128, 0.9)"] : 
            [1.1, "rgba(255, 255, 255, 1)"]
        );

        if (style[0] === 1.1 || plr === null){ console.log(plr, tpl);}

        rec = style[0];
        ctxEnts.fillStyle = style[1];
        ctxEnts.fillRect(x -rec/2, z -rec/2, rec, rec);

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
        msg("Cluster: no points for " + typ);
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
      msg(H.format("cluster: %s ms, %s/%s it", k.msecs, k.iterations, k.maxIterations));
      ctxClus.fillStyle = "rgba(255, 0, 0, 0.9";
      ctxClus.strokeStyle = "rgba(255, 255, 255, 0.9";
      k.centroids.forEach(function(ctr){
        ctxClus.fillRect(ctr.x -5, ctr.z -5, 10, 10);
      });

      console.log("renderClus", "max", k.maxWidth, map.trees.length, k.centroids.length, "iter", k.iterations, k.converged, k.msecs);

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
      img.width = size; img.height = size;
      img.onerror = function(){cb(null);};
      img.onload  = function(){cb(img);};
      img.src = H.replace(url, ".xml", ".png") + "?" + Math.random();
      function cb(val){
        if(!loaded){fn(val);}
        loaded = true;
      }
      // if (img.complete || img.readyState === 4) {cb(img);}
    },
  };




return H; }(HANNIBAL));   

