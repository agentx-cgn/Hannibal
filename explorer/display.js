/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, HANNIBAL, H, deb */

/*--------------- D I S P L A Y -----------------------------------------------

  manages explorer interface



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){

  var gid = document.getElementById.bind(document),
      availableCivs = [],
      modes    = [
        "info", 
        "cost", 
      ],
      examples = [
        "MEMBER",
        "siege HOLDBY",
        "structures.athen.market REQUIRE",
        "phase.town.athen RESEARCHEDBY",
        "structures.athen.civil.centre RESEARCH",
        "RESEARCH DISTINCT SORT < name",
        "RESEARCH DISTINCT SORT < name WITH costs.metal > 0",
        "RESEARCH DISTINCT SORT < name WITH requires.tech = 'phase.city'"
      ];
  
  H.QRY = function(hcq){return new H.HCQ(H.store, hcq);};    

  function loadCult(civ, obj){

    var xhr = new XMLHttpRequest(),
        file = "data/" + civ + ".json";

    // deb("trying: %s", civ);

    xhr.onerror = function(e){
      deb("xhr onerror with %s, file: %s, error: %s", civ, file, e);
    };  
    xhr.onload = function(){
      if (xhr.readyState === 4){
        // if (xhr.status === 200) {
          // console.log(xhr.responseText.length, xhr.responseText);
          obj.info = JSON.parse(xhr.responseText);
          obj.emblem = "images/" + obj.info.Emblem.split("/").slice(-1);
        // } else {
        //   console.log(xhr.status, xhr.responseText);
        //   deb("set security.fileuri.strict_origin_policy to false in about:config")
        //   deb("xhr failed with %s, file: %s", civ, file);
        //   obj.info =  {};
        // }
      }
    };
    xhr.open("get", file, true);
    xhr.send();
  }

  function pritJSON(json, depth){

    var html = "",
        space = H.mulString("&nbsp;", depth || 0),
        tab  = function (s,l){return H.replace(H.tab(s,l), " ", "&nbsp;");};

    depth = depth || 0;

    H.each(json, function(k, v){

      var akku = [];

      if (Array.isArray(v)) {
        html += space + k + ": " + JSON.stringify(v) + ",<br />";

      } else if (typeof v === 'object' && depth === 0){
        html += space + "<b>" + k + "</b>" + ": {<br />";
        html += pritJSON(v, depth +2);
        html += space + "},<br /><br />";

      } else if (typeof v === 'object'){
        html += space + k + ": {<br />";
        html += pritJSON(v, depth +2);
        html += space + "},<br />";

      } else {
        html += space + k + ": " + JSON.stringify(v) + ",<br />";
      }

    });

    return html;

  }

  function pritObj(o, depth){

    depth = depth || 0;

    var html = "";

    H.each(o, function(k, v){

      var akku = [];

      if (k === 'ress') {
        H.each(v, function(k, v){
          akku.push(k + ": " + v);
        })
        html += "<tr><td>&nbsp;&nbsp;ress: { " + akku.join(", ") + " }</td></tr>";

      } else if (k === 'tech') {
        html += "<tr><td>&nbsp;&nbsp;" + k + ": [</td></tr>";
        html += pritObj(v, depth +2);
        html += "<tr><td>&nbsp;&nbsp;]</td></tr>";

      } else if (typeof v === 'object'){
        html += "<tr><td>&nbsp;&nbsp;" + k + ": {</td></tr>";
        html += pritObj(v, depth +2);
        html += "<tr><td>&nbsp;&nbsp;}</td></tr>";

      } else if (k === 'name') {
        // do nothing
      } else {
        html += "<tr><td>&nbsp;&nbsp;" + H.mulString("&nbsp;", depth) + k + ": " + v + "</td></tr>";
      }

    });

    return html + "<tr></tr>";

  }

  H.analyze = function (name){

    var t0 = Date.now(),
        node = H.store.nodes[name], nodes,
        mode = slcModes.value,
        i = 0, cntVerbs = H.store.verbs.length,
        append = function(html){tblResult.innerHTML += html;},
        s = {length: 0, ops: 0, msecs: 0};


    tblResult.innerHTML = "";
    debug.innerHTML = "";
    txtHQC.value = name;

    switch (mode) {
      case "info" : 
         append("<thead><td>Node</td><td>Verb</td><td>Nodes</td><td>Info</td></thead>");
      break;
      case "json" : 
         append("<thead><td>Node</td><td>Verb</td><td>Nodes</td><td>Property</td><td>Value</td></thead>");
      break;
    }    

    H.store.verbs.forEach(function(verb){

      verb = verb.toUpperCase();

      var hcq = name + " " + verb,
          didHeader = false;

      nodes = H.QRY(hcq).forEach(function(node){
        if(!didHeader){
          switch (mode) {
            case "info" :        
              append(H.format("<tr><td class='bd'>%s</td><td class='bd'>%s</td><td></td><td></td></tr>", name, verb));
            break;
            case "json":
              append(H.format("<tr><td class='bd'>%s</td><td class='bd'>%s</td><td></td><td></td><td></td></tr>", name, verb));
            break;
          }
          didHeader = true;
        }
        switch (mode) {
          case "info" :        
            append(H.format("<tr><td></td><td></td><td class='cl' onclick='H.analyze(\"%s\")'>%s</td><td class='el' >%s</td></tr>", node.name, node.name, node.info || "undefined"));
          break;
          case "json" :
            append(H.format("<tr><td></td><td></td><td class='cl' onclick='H.analyze(\"%s\")'>%s</td><td></td><td></td></tr>", node.name, node.name));
            H.each(node, function(prop, value){
              if (prop !== 'name'){
                append(H.format("<tr><td class='hr'></td><td></td><td></td><td>%s</td><td>%s</td></tr>", prop, H.prettify(value)));
              }
            });          
          break;
        }
      });

      s.length += nodes.stats.length;
      s.ops += nodes.stats.ops;
      s.msecs += nodes.stats.msecs;

    });

    // ifoResult.innerHTML = H.format(
    //   "civ: %s, nodes: %s, edges: %s, queries: %s, duration: %s msecs", 
    //   slcCivs.value, H.count(H.store.nodes), H.store.edges.length, H.store.verbs.length, Date.now() - t0
    // );

    ifoResult.innerHTML = H.format(
      "store: %s, nodes: %s, edges: %s, queries: %s, length: %s, %s ops, %s msecs", 
      H.Bot.civ, nodes.stats.nodes, nodes.stats.edges, nodes.stats.verbs, s.length, s.ops, s.msecs
    );


  };


  H.Display = {


    prepare: function(){

      H.each(H.Data.Civilisations, function (civ, value) {
        if (window["store_" + civ]){
          availableCivs.push(civ);
        }
      });
      this.populateSelectBox($("slcCivs"), availableCivs);

    },

    import: function(civ){
      var s;
      $("slcCivs").value = civ;
      H.store = new H.Store;
      H.store.importFromJSON(window["store_" + civ]);
      s = H.store;
      $("ifoResult").innerHTML = H.format("store: %s, nodes: %s, edges: %s", civ, H.count(s.nodes), s.edges.length);      
      H.Bot.civ = civ;
      TIM.step("loaded", civ);
    },  

    hide: function(){
      $("menVerbose").style.display = "none";
      // $("contASM").style.display = "none";
      // $("contHTN").style.display = "none";
      $$(".contHCQ").style.display = "none";
      $$(".contHTN0AD").style.display = "none";      
      $$(".contMMAP").style.display = "none";      
      $$(".contTECH").style.display = "none";    
    },

    clear: function(notifo){
      debug.innerHTML = "";
      tblResult.innerHTML = "";
      if (notifo) {$("ifoResult").innerHTML = "";}
    },

    init: function(){

      var HD = H.Display;

      // polluting global on purpose
      // contHTN0AD = document.querySelector(".contHTN0AD");
      // contASM    = document.querySelector(".contASM");
      // contHTN    = document.querySelector(".contHTN");
      // contHCQ    = document.querySelector(".contHCQ");
      // contMMAP   = document.querySelector(".contMMAP");
      // menASM     = gid("menASM");
      // menHQC     = gid("menHQC");
      // menHTN     = gid("menHTN");
      menHTN0AD  = gid("menHTN0AD");
      txtHQC     = gid("txtHQC");
      // slcCivs    = gid("slcCivs");
      slcVerbs   = gid("slcVerbs");
      slcNodes   = gid("slcNodes");
      slcModes   = gid("slcModes");
      txtHQC     = gid("txtHQC");
      btnGoHCQ   = gid("btnGoHCQ");
      btnClear   = gid("btnClear");
      btnAnalyze = gid("btnAnalyze");
      btnHTN0ADGO= gid("btnHTN0ADGO");
      tblResult  = gid("tblResult");
      ifoResult  = gid("ifoResult");
      debug      = gid("debug");

      
      this.populateSelectBox(slcVerbs, H.store.verbs.map(String.toUpperCase));
      this.populateSelectBox(slcNodes, H.attribs(H.store.nodes));
      this.populateSelectBox(slcExams, examples);
      // this.populateSelectBox(slcModes, modes);

      // gid("menMMAP").onclick = function(){
      //   HD.hide();HD.clear();
      //   tblResult.style.tableLayout = "fixed";
      //   contMMAP.style.display = "block";
      // }

      gid("menTECH").onclick = function(notifo){
        HD.hide();HD.clear(notifo);
        tblResult.style.tableLayout = "fixed";
        $$(".contTECH").style.display = "block";
        $("jsonTECH").innerHTML = pritJSON(techTemplates);
      }

      // $("menASM").onclick = function(){
      //   HD.hide();HD.clear();
      //   tblResult.style.tableLayout = "fixed";
      //   contASM.style.display = "block";
      // }

      menHQC.onclick = function(notifo){
        HD.hide();HD.clear(notifo);
        tblResult.style.tableLayout = "auto";
        $$(".contHCQ").style.display = "block";
      }

      // menHTN.onclick = function(){
      //   HD.hide();HD.clear();
      //   tblResult.style.tableLayout = "fixed";
      //   contHTN.style.display = "block";
      // }

      menHTN0AD.onclick = function(notifo){
        HD.hide();HD.clear(notifo);
        $("menVerbose").style.display = "block";
        tblResult.style.tableLayout = "fixed";
        $$(".contHTN0AD").style.display = "block";
      }

      $("slcCivs").onchange = $("slcCivs").onselect = function(){
        H.Bot.civ = $("slcCivs").value;
        HD.clear();
        H.Display.import(H.Bot.civ);
        slcNodes.innerHTML = "";
        H.Display.populateSelectBox(slcNodes, H.attribs(H.store.nodes));
      }

      slcExams.onchange = slcExams.onselect = function(){
        txtHQC.value = slcExams.value;
      }

      slcVerbs.onchange = slcVerbs.onselect = function(){
        txtHQC.value += " " + slcVerbs.value;
      }

      slcNodes.onchange = slcNodes.onselect = function(){
        txtHQC.value += " " + slcNodes.value;
      }

      btnClear.onclick = function(){
        txtHQC.value = "";
      };

      gid("btnHTN0ADT1").onclick = function(){
        H.HTN.Hannibal.Example1(~~(gid("slcVerbose").value));
      };
      gid("btnHTN0ADT2").onclick = function(){
        H.HTN.Hannibal.Example2(~~(gid("slcVerbose").value));
      };
      gid("btnHTN0ADT3").onclick = function(){
        H.HTN.Hannibal.Example3(~~(gid("slcVerbose").value));
      };

      btnHTN0ADSTRESS.onclick = function(){

        var state, goal, verbose, loops,
            debug = document.getElementById("debug");

        try {
          state = JSON.parse("{" + gid("txtState").value.trim() + "}");
        } catch(e){
          debug.innerHTML = "Error: Check JSON of state<br />";
          debug.innerHTML += "<span class='f80'>[" + e + "]</span>";
          return;
        }

        try {
          goal = JSON.parse("{" + gid("txtGoal").value.trim() + "}");
        } catch(e){
          debug.innerHTML = "Error: Check JSON of goal<br />";
          debug.innerHTML += "<span class='f80'>[" + e + "]</span>";
          return;
        }

        verbose = ~~(gid("slcVerbose").value)
        loops   = ~~(gid("slcStress").value.split(".").join(""))

        H.HTN.Hannibal.runStress(state, goal, loops);

      };


      btnPlan.onclick = function(){

        var state = "", goal = "", node, centre;

        $("debug").innerHTML = "";

        state += '{';
        state += '"ress": {},';
        state += '"ents": {"structures.%s.civil.centre": 1},';          // Node
        state += '"tech": ["phase.village"]';
        state += '}';

        goal  += '{';
        goal  += '"ress": {},';
        goal  += '"ents": {"%s": 1},';           // CC
        goal  += '"tech": []';        
        goal  += '}';

        $("txtHQC").value = $("slcNodes").value;
        try {
          state = JSON.parse(H.format(state, H.Bot.civ));
        } catch(e){
          $("debug").innerHTML  = "Error: Check JSON of state<br />";
          $("debug").innerHTML += "<span class='f80'>[" + e + "]</span>";
          return;
        }

        try {
          goal = JSON.parse(H.format(goal,  $("slcNodes").value));
        } catch(e){
          $("debug").innerHTML  = "Error: Check JSON of goal<br />";
          $("debug").innerHTML += "<span class='f80'>[" + e + "]</span>";
          return;
        }

        H.HTN.Hannibal.runExample(state, goal, ~~(gid("slcVerbose").value), $("slcNodes").value);

      };

      btnHTN0ADGO.onclick = function(){

        var state, goal;

        $("debug").innerHTML = "";

        try {
          state = JSON.parse("{" + gid("txtState").value.trim() + "}");
        } catch(e){
          $("debug").innerHTML = "Error: Check JSON of state<br />";
          $("debug").innerHTML += "<span class='f80'>[" + e + "]</span>";
          return;
        }

        try {
          goal = JSON.parse("{" + gid("txtGoal").value.trim() + "}");
        } catch(e){
          $("debug").innerHTML = "Error: Check JSON of goal<br />";
          $("debug").innerHTML += "<span class='f80'>[" + e + "]</span>";
          return;
        }

        H.HTN.Hannibal.runExample(state, goal, ~~(gid("slcVerbose").value));

      };
      btnAnalyze.onclick = function(){
        H.analyze(slcNodes.value.trim());
      };
      
      btnGoHCQ.onclick    = function(){

        var t0    = Date.now(), s, 
            hqc   = txtHQC.value,
            mode  = slcModes.value,
            qry   = new H.Store.Query(H.store, hqc),
            nodes = qry.execute(mode),
            t1    = Date.now(),
            html  = "",
            counter = 1, counter1 = 0;

        tblResult.innerHTML = "";
        $("debug").innerHTML = "";

        switch (mode) {
          case "info" : 
            html += "<thead><td class='hr'>#</td><td>Name</td><td>Info</td></thead>";
          break;
          case "json" : 
            html += "<thead><td class='hr'>#</td><td>Name</td><td>Property</td><td>Value</td></thead>";
          break;
        }

        txtHQC.value = qry.query;
        nodes.forEach(function(node){
          counter1 = 0;
          switch (mode) {
            case "info" :
              html += H.format("<tr><td class='hr'>%s</td><td class='cl' onclick='H.analyze(\"%s\")'>%s</td><td>%s</td></tr>", counter, node.name, node.name, node.info);
            break;
            case "json" :
              H.each(node, function(prop, value){
                if (prop !== 'name'){
                  if (counter1 === 0){
                    html += H.format("<tr><td class='hr bd'>%s</td><td  class='cl bd' onclick='H.analyze(\"%s\")'>%s</td><td class='bd'>%s</td><td class='bd'>%s</td></tr>", counter, node.name, node.name, prop, value);
                  } else {
                    html += H.format("<tr><td class='hr'></td><td></td><td>%s</td><td>%s</td></tr>", prop, H.prettify(value));
                  }
                  counter1 += 1;
                }
              });
            break;
          }
          counter += 1;
        });

        s = nodes.stats;
        ifoResult.innerHTML = H.format(
          "store: %s, nodes: %s, edges: %s, length: %s, %s ops, %s msecs, cached: %s, hits: %s", 
          H.Bot.civ, s.nodes, s.edges, s.length, s.ops, s.msecs, s.cached, s.hits
        );

        tblResult.innerHTML = html;

      };


    },
    populateSelectBox: function(box, data){

      data.forEach(function(option){
        var opt = document.createElement('option');
        opt.innerHTML = option;
        opt.value = option;
        box.appendChild(opt);
      });

    }

  };




return H; }(HANNIBAL));   