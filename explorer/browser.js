/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals $, HANNIBAL, H, deb */

/*--------------- B R O W S E R -----------------------------------------------

  manages explorer history



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  var self,
      TR = ';',
      pages = {
        'HCQ':    function(){},
        'TREE':   function(){},
        'ECO':    function(){},
        'BLOCKS': function(){},
        'MAPS':   function(){},
        'TECH':   function(){self.result("divResult", H.Display.pritJSON(techTemplates)); return null;},
      },
      menus = {
        'MMAP':   function(){window.open("../docs/Hannibal-Mmap.html", "mmap"); return null;},
        'TOP':    function(){document.documentElement.scrollTop = 0; return null;},
        'LOAD':   function(){location.reload(); return null;},
      };


  H.Browser = (function(){

    var history = [], pointer = null, c = {}, 
        availableCivs = [], 
        
        verbose = undefined, 
        civ     = undefined, 
        page    = undefined, 
        command = undefined, 
        params  = undefined, 
        
        defHash,
        decode  = a    => a.map(decodeURI),
        encode  = a    => a.map(encodeURI),
        combine = ()   => [verbose, civ, page, command, params].join(TR),
        isolate = hash => hash.contains("#!") ? hash.split("#!")[1].split(TR) : [];

    function extract (hash){

      // turns IFC commands into hashes, returns params as array

      var pm, items = ("#!" + hash).split("#!").slice(-1)[0].split(TR);

      items[0] = (items[0] === undefined) ? undefined : items[0] === "*" ? verbose : items[0];
      items[1] = (items[1] === undefined) ? undefined : items[1] === "*" ? civ     : items[1];
      items[2] = (items[2] === undefined) ? undefined : items[2] === "*" ? page    : items[2];
      items[3] = (items[3] === undefined) ? undefined : items[3] === "*" ? func    : items[3];
      items[4] = items.slice(4).map(p => p === '*' ? params : $(items[4]) ? $(items[4]).value.trim() : p);
      items[4] = items[4].length ? items[4] : undefined;

      return items.filter(p => p !== undefined);
    }

    function select(box, option){
      H.toArray(box.getElementsByTagName('option')).forEach(function(opt){
        // opt.selected = opt.value === option ? "selected" : "";
        opt.selected = opt.innerHTML === option ? "selected" : "";
      });
    }

    return {
      boot: function(){ self = this; return this; },
      init: function(hash){

        defHash = hash;

        "Next, Back, Curr, Hist, Verbose, Civ, Info".split(", ").forEach(function(name){
          c[name] = $("c" + name);
        });

        c.Next.onclick  = function(){H.Browser.next();};
        c.Back.onclick  = function(){H.Browser.back();};
        c.Curr.onclick  = function(){H.Browser.show(c.Curr.value);};
        c.Hist.onchange = function(){H.Browser.show(c.List.value);};

        $("btnBlocksExample1").onclick = function(){H.HTN.Blocks.example1('slcVerbose');};
        $("btnBlocksExample2").onclick = function(){H.HTN.Blocks.example2('slcVerbose');};
        $("btnBlocksExample3").onclick = function(){H.HTN.Blocks.example3('slcVerbose');};
        
        H.Display.trim($("txtTREEGoal"));
        H.Display.trim($("txtTREEState"));
        H.Display.trim($("txtECOGoal"));
        H.Display.trim($("txtECOState"));

        H.Maps.readMapList(function(html){
          $("slcMaps").innerHTML = html;  
          select($("slcMaps"), H.Maps.default);
          // console.log($("slcMaps").value, H.Maps.default);  
          // H.Maps.load(H.Maps.host() + H.Maps.path() + H.Maps.default);
          H.Maps.load(H.Maps.default);
        });
        $("slcMaps").onchange = $("slcMaps").onselect = $("slcMaps").onkeyyup = $("btnMAPLoad").onclick = function(){
          // H.Maps.load(H.Maps.host() + H.Maps.path() + $("slcMaps").value);
          H.Maps.load($("slcMaps").value);
        }
        "chkPathCost chkPathMan chkPathDia chkPathEuc chkPathDebug".split(" ").forEach(function(token){
          $(token).onchange = function(){
            H.Maps.runPath();
          }
        });
        $("chkPathDyna").onchange = H.Maps.toggleDyna;

        "Topo Ents Grid Clus Path Pass Regw Regl Cost".split(" ").forEach(function(token){
          $("chk" + token).onchange = function(){
            H.Maps.clear();
            H.Maps.render();
          }
        });
        $("cvsMap").onclick = $("cvsDyna").onclick = H.Maps.onclick;
        $("cvsMap").onmousemove = $("cvsDyna").onmousemove = H.Maps.onmousemove;

        $("btnTREET1").onclick = function(){H.HTN.Tree.test1('slcVerbose');};
        $("btnTREET2").onclick = function(){H.HTN.Tree.test2('slcVerbose');};
        $("btnTREET3").onclick = function(){H.HTN.Tree.test3('slcVerbose');};
        $("btnTREEGo").onclick = function(){H.HTN.Tree.runGo('slcVerbose', 'txtTREEState', 'txtTREEGoal');};
        $("btnTREETC").onclick = function(){H.HTN.Tree.runCiv('slcCivs');};
        $("btnTREEStress").onclick = function(){H.HTN.Tree.runStress('slcVerbose', 'slcTREEStress', 'txtTREEState', 'txtTREEGoal');};

        $("btnECOGo").onclick = function(){H.HTN.Economy.runGo('slcVerbose', 'txtECOState', 'txtECOGoal');};

        $("slcExams").onchange = $("slcExams").onselect = function(){
          $("txtHCQ").value = $("slcExams").value;
          $("txtHCQ").onchange();
        }

        $("slcVerbs").onchange = $("slcVerbs").onselect = function(){
          $("txtHCQ").value += " " + $("slcVerbs").value;
          $("txtHCQ").onchange();
        }

        $("slcNodes").onchange = $("slcNodes").onselect = function(){
          $("txtHCQ").value += " " + $("slcNodes").value;
          $("txtHCQ").onchange();
        }

        $("btnClear").onclick = function(){
          $("txtHCQ").value = "";
          $("txtHCQ").onchange();
        };

        $("txtHCQ").oninput = $("txtHCQ").onchange = function(){

          var txt = $("txtHCQ").value.trim();

          $("btnQuery").disabled = true;
          $("btnAnalyze").disabled = true;
          $("btnPlan").disabled = true;
          $("btnClear").disabled = true;

          if (H.store && H.store.nodes[txt]){
            $("btnAnalyze").disabled = false;
            $("btnPlan").disabled = false;
          } 
          if (txt){
            $("btnQuery").disabled = false;
            $("btnClear").disabled = false;
          }

          $("txtHCQ").value = txt;

        };

        H.each(H.Data.Civilisations, function (civ, value) {
          if (window["store_" + civ]){
            availableCivs.push(civ);
          }
        });

        self.populateSelectBox($("slcCivs"), availableCivs); 

        window.onhashchange = self.execute;

        TIM.step("CIVS", availableCivs);  
        TIM.step("B.init");

      },
      civ: function(){
        H.Browser.do('*' + TR + $("slcCivs").value.trim() + TR + '*');
        console.log("B.civ: " + $("slcCivs").value.trim());
      },
      verbose: function(){
        H.Browser.do(~~$("slcVerbose").value + TR + '*' + TR + '*');
        TIM.step("B.verbose",  ~~$("slcVerbose").value);
      },      
      error: function(msg){
        if (!msg){
          $("cError").innerHTML = "";
          $("cError").style.display = "none";
        } else {
          $("cError").innerHTML = msg;
          $("cError").style.display = "block";
        }
      },
      info: function(msg){
        var out = "", akku = [];
        if (!msg){
          $("cInfo").innerHTML = "";
          $("cInfo").style.display = "none";
          return;
        } else {
          $("cInfo").style.display = "block";
          if(typeof msg === 'string'){
            c.Info.innerHTML = msg; return;
          } else if (typeof msg === 'object'){
            H.each(msg, function(attr, valu){
              akku.push(H.format("%s: %s", attr, valu));
            });
            out = akku.join(", ");
          }
          self.info(out);
        }
      },      
      do: function(command){

        // called only internally, replaces known ctrls as param to their value

        var items = extract(command = command || defHash),
            hash = items.slice(0, 4);

        if (items[4] !== undefined){
          hash = hash.concat(items[4]);
        }
        hash = hash.filter(p => p !== undefined).map(encodeURI);
        console.log("B.do.1", hash);
        hash = "#!" + hash.join(TR);
        if (location.hash !== hash){location.hash = hash;}
        // console.log("B.do.2", hash);

      },
      execute: function(){

        // triggered by hash change, do NOT change hash below, otherwise infinte loop

        if (!location.hash.contains("#!")){
          console.log("B.execute", location.hash, "ignored");
          return;
        }

        var items = decode(isolate(location.hash)),
            [vb, ci, pg, co] = items,
            pm = items.slice(4);

        H.each(pages, function(name){
          $("men" + name).style.color = "#ddd";
        });
        $("men" + pg).style.color = "#833";

        if (vb !== verbose){verbose = $("slcVerbose").value = ~~vb;}

        if (ci !== civ){civ = H.Bot.civ = self.import(ci);}

        if (pg !== page){
          self.page(pg);
          self.results.clear('tblResult');
          if (H.Display[co]){
            setTimeout(function(){ 
              H.Display[co].apply(null, pm);
              command = co; 
              params  = pm;
            }, 25);
          }

        } else if (co !== command || !H.equal(pm, params)) {
          if (H.Display[co]){
            self.results.clear('tblResult');
            setTimeout(function(){ 
              H.Display[co].apply(null, pm);
              command = co; 
              params  = pm;
            }, 25);
          }

        }


      },
      menu: function(item){
        var res;
        if (menus[item]) {
          res = menus[item]();
          if (res === null){console.log("B.menu.exit:" + item); return;}
        }
        if (pages[item]) {
          self.page(item);
          if (res === null){console.log("B.menu.exit:" + item); return;}
        }
        self.push(combine());

        TIM.step("B.menu", item);
      },
      page: function(item){
        
        var res;

        $$(".interface.bar").forEach(panel => panel.style.display = "block");
        $$(".error.bar").forEach(panel => panel.style.display = "block");
        // $$(".browser.bar").forEach(panel => panel.style.display = "block");
        $$(".info.bar").forEach(panel => panel.style.display = "block");
        $$(".results.bar").forEach(panel => panel.style.display = "block");
        $$(".panel").forEach(panel => panel.style.display = "none");
        $$(H.format(".%s.panel", item)).forEach(panel => panel.style.display = "block");

        if (pages[item]) {
          res = pages[item]();
          if (res === null){console.log("B.page.exit:" + item); return;}
        }

        page = item;

        TIM.step("B.page", item);

      },
      results: {
        clear:  function(ele){$(ele).innerHTML = "";},
        append: function(ele, html){$(ele).insertAdjacentHTML('beforeend', html);},
        insert: function(ele, html){$(ele).innerHTML = html;},
      },
      result: function(ele, html){

        if (!ele){
          // $("tblResultlts").style.display = 'none';
          $("tblResult").innerHTML = "";
          $("divResult").innerHTML = "";
        } else {
          $$("#tblResult, #divResult").forEach(ele => ele.style.display = 'none');
          $("results").style.display = 'block';
          $(ele).style.display = 'block';
          $(ele).innerHTML = html;
        }

      },
      // show: function(token){
      //   var [page, command, param] = extract(token);
      // },
      push: function(token){
        history.push(token);
        pointer = history.length -1;
        self.show(token);
      },
      next: function(){
        if (pointer < history.length){
          pointer += 1;
          self.show(history[pointer]);
        }
      },
      back: function(){
        if (pointer > 0){
          pointer -= 1;
          self.show(history[pointer]);
        }
      },
      populateSelectBox: function(box, data){
        box.innerHTML = "";
        data.forEach(function(option){
          var opt = document.createElement('option');
          opt.innerHTML = option;
          opt.value = option;
          box.appendChild(opt);
        });

      },
      import: function(civilisation){
        $("slcCivs").value = civilisation;
        H.store = new H.Store;
        H.store.importFromJSON(window["store_" + civilisation]);
        self.info({
          store: civilisation,
          nodes: H.count(H.store.nodes),
          edges: H.store.edges.length,
        });
        self.populateSelectBox($("slcVerbs"), H.store.verbs.map(String.toUpperCase));
        self.populateSelectBox($("slcNodes"), H.attribs(H.store.nodes));
        self.populateSelectBox($("slcExams"), H.Data.Explorer.examples);

        TIM.step("B.loaded", civilisation);

        return civilisation;
      },       

    };


  })().boot();


return H; }(HANNIBAL));   

