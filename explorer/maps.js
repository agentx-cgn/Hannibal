/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals $, HANNIBAL, H, deb */

/*--------------- B R O W S E R -----------------------------------------------

  manages explorer history



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){


  var size = 512, map, msgs,
      cvsMap,      ctxMap,
      cvsHeights,  ctxHeights,
      cvsKMeans,   ctxKMeans,
      cvsPaths,    ctxPaths,
      cvsGrid,     ctxGrid,
      cvsPass,     ctxPass,
      cvsEntities, ctxEntities;

  function msg(line){
    if (line === ""){msgs.innerHTML = "";}
    else {msgs.innerHTML += line + "\n";}
  }

  H.Maps = {
    load: function(url){

      console.log('Maps.load', url);

      msgs = $("txtMAP");
      map = {
        units: [],
        trees: [],
        ents: null,
        size: 0,
        points: [],
        buffer: null,
      };

      msg("");
      msg("map: " + url.split("/").slice(-1)[0]);

      cvsMap = $("cvsMap");
      ctxMap = cvsMap.getContext("2d");
      cvsMap.width = size; cvsMap.height = size;

      cvsHeights = $("cvsHeights");
      ctxHeights = cvsHeights.getContext("2d");

      cvsEntities = $("cvsEntities");
      ctxEntities = cvsEntities.getContext("2d");

      cvsKMeans = $("cvsKMeans");
      ctxKMeans = cvsKMeans.getContext("2d");

      cvsPaths = $("cvsPaths");
      ctxPaths = cvsPaths.getContext("2d");

      cvsGrid = $("cvsGrid");
      ctxGrid = cvsGrid.getContext("2d");

      cvsPass = $("cvsPass");
      ctxPass = cvsPass.getContext("2d");

      var xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.responseType = "document";
      xhr.onload = function() {
        if (this.status === 200) {
          map.ents = xhr.responseXML.getElementsByTagName("Entity");
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
            H.Maps.loadPass(url, function(image){
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
    renderMaps: function(){
      H.Maps.renderHeights();
      H.Maps.renderEntities();
      H.Maps.renderPaths();
      H.Maps.renderKMeans();
      H.Maps.renderGrid();
      H.Maps.renderPass();
    },
    clear: function(){
      cvsMap.width = size; cvsMap.height = size;
    },
    render: function(){
      if ($("chkTopo").checked) {ctxMap.drawImage(cvsHeights,  0, 0, map.size, map.size, 0, 0, size, size);}
      if ($("chkPass").checked) {ctxMap.drawImage(cvsPass,     0, 0, map.size -1, map.size -1, 0, 0, size, size);}
      if ($("chkGrid").checked) {ctxMap.drawImage(cvsGrid,     0, 0, map.size, map.size, 0, 0, size, size);}
      if ($("chkEnts").checked) {ctxMap.drawImage(cvsEntities, 0, 0, size, size, 0, 0, size, size);}
      if ($("chkPath").checked) {ctxMap.drawImage(cvsPaths,    0, 0, map.size, map.size, 0, 0, size, size);}
      if ($("chkClus").checked) {ctxMap.drawImage(cvsKMeans,   0, 0, size, size, 0, 0, size, size);}
    },
    renderPaths: function(){
      cvsPaths.width = cvsPaths.height = map.size;
    },
    renderGrid: function(){
      var x, y;
      cvsGrid.width = cvsGrid.height = map.size;
      ctxGrid.fillStyle = "rgba( 255, 255, 255, 0.3)";
      for (x=0; x<map.size; x++){
        for (y=0; y<map.size; y++){
          if ((x+y)%2){
            ctxGrid.fillRect(x, y, 1, 1);
          }
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

      source = ctxPass.getImageData(0, 0, map.size, map.size);
      target = ctxPass.createImageData(source);

      for (i=0; i<map.length *4; i+=4) {
        h = source.data[i];
        c = (
          // (h &   1) ? [255,   0,   0, 32] : // dark red : pathfinder obstruction forbidden
          // (h &   2) ? [255,   0,   0, 128] : // dark red : foundationObstruction
          // (h &   4) ? [255,   0,   0, 128] : // dark red : building-land
          // (h &   (8)) ? [255,   0,   0, 128] : // dark red : building-shore
          !(h & 16) && (h & 64)  ?  [ 100, 220, 255, 48]  : // light blue : land and water
          (h &  32) && (h & 64)  ?  [ 255,   0,  0, 48]  : // dark red : land too steep
          (h &  32) && !(h & 64) ? [ 100, 100, 255, 32] : // dark blue : deep water
          (h &  16)              ? [   0, 255,   0, 24] : // green : land only
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
      ctxPass.drawImage(cvsPass, 0, 0, map.size -1, map.size -1, 0, 0, map.size -1, map.size -1);

      console.log(vals);

    },
    renderHeights: function(){

      var i, off, h, data;

      console.log("Maps.renderHeights:", "bytes", map.buffer.byteLength, "mapsize", map.mapsize, "factor", map.factor, "size", map.size);

      cvsHeights.width = cvsHeights.height = map.size;

      data = ctxHeights.getImageData(0, 0, map.size, map.size);

      for (i=0, off=16; i<map.length; i++, off+=2) {
        h = map.view.getUint16(off, true) >> 8;
        if (h) {
          data.data[i *4 + 0] = h;
          data.data[i *4 + 1] = h;
          data.data[i *4 + 2] = h;
        } else {
          data.data[i *4 + 0] = 80;
          data.data[i *4 + 1] = 140;
          data.data[i *4 + 2] = 220;
        }
        data.data[i *4 + 3] = 256;
      }

      ctxHeights.putImageData(data, 0, 0);

      ctxHeights.setTransform(1, 0, 0, 1, 0, 0);
      ctxHeights.translate(0, map.size);
      ctxHeights.scale(1, -1);
      ctxHeights.drawImage(cvsHeights, 0, 0, map.size, map.size, 0, 0, map.size, map.size);

    },
    renderEntities: function(){

      var style, rec;

      cvsEntities.width = cvsEntities.height = size;

      ctxEntities.setTransform(1, 0, 0, 1, 0, 0);
      ctxEntities.translate(0, size);
      ctxEntities.scale(1, -1);

      H.toArray(map.ents).forEach(function(ent){

        var pos = ent.getElementsByTagName("Position")[0],
            ori = ent.getElementsByTagName("Orientation")[0],
            tpl = ent.getElementsByTagName("Template")[0].innerHTML,
            plr = ent.getElementsByTagName("Player").length ? ~~ent.getElementsByTagName("Player")[0].innerHTML : null,
            x = +pos.getAttribute("x")/map.factor,
            z = +pos.getAttribute("z")/map.factor,
            y = +ori.getAttribute("y");

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

        // if (style[0] === 1.1 || plr === null){ console.log(plr, tpl);}

        rec = style[0];
        ctxEntities.fillStyle = style[1];
        ctxEntities.fillRect(x -rec/2, z -rec/2, rec, rec);

        if (tpl.contains("tree")){map.trees.push({x:x, z:z});}
        if (tpl.contains("units")){map.units.push({x:x, z:z});}

      });     
      
      msg("trees: " + map.trees.length);
      msg("units: " + map.units.length);

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
    loadPass: function(url, fn){
      var img = $("imgPass"), loaded = false;
      img.onerror = function(){cb(null);};
      img.onload  = function(){cb(img);};
      img.src = H.replace(url, ".xml", ".png") + "?" + Math.random();
      function cb(val){
        if(!loaded){fn(val);}
        loaded = true;
      }
      // if (img.complete || img.readyState === 4) {cb(img);}
    },
    readMapList: function (url, fn) {

      var xhr = new XMLHttpRequest();
      xhr.onerror = function() {console.log("Error while getting: " + url);};
      xhr.onload  = function() {
        var html = "";
        H.toArray(xhr.responseXML.getElementsByTagName("a")).forEach(function(link){
          var map = decodeURI(link.href);
          if (H.endsWith(map, "xml")){
            if (!H.endsWith(map, "default.xml")){
              html += H.format("<option value='%s'>%s</option>", link.href, map.split("/").slice(-2).join("/"));
            }
          }
        });
        fn(html);
      };
      xhr.open("GET", url);
      xhr.responseType = "document";
      xhr.send();  

    },
    renderKMeans: function(){

      var t0, t1,
          nCluster = ~~$("slcKMeans").value,
          k = new H.AI.KMeans(),
          c = 0;

      cvsKMeans.width = cvsKMeans.height = size;

      if (!map.trees.length){return;}

      // k.kmpp = true;
      k.k = nCluster;
      k.maxIterations = 50;
      k.setPoints(map.trees);
      k.initCentroids();
      t0 = Date.now();
      k.cluster(function(centroids){
        c += 5;
        ctxKMeans.fillStyle = "rgba(" + c + ", 250, 0, 0.3";
        centroids.forEach(function(ctr){
          ctxKMeans.fillRect(ctr.x -4, ctr.z -4, 8, 8);
        });
      });
      t1 = Date.now();  

      ctxKMeans.fillStyle = "rgba(255, 0, 0, 0.9";
      ctxKMeans.strokeStyle = "rgba(255, 255, 255, 0.9";
      k.centroids.forEach(function(ctr){
        ctxKMeans.fillRect(ctr.x -4, ctr.z -4, 8, 8);
        ctxKMeans.fillRect(ctr.x -5, ctr.z -5, 10, 10);
      });

      console.log("renderKMeans", map.trees.length, k.centroids.length, "iter", k.iterations, k.converged, (t1-t0));

    },
  };




return H; }(HANNIBAL));   

