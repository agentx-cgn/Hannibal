/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals Engine, HANNIBAL, H, deb */

/*--------------- H T N _ H E L P E R -----------------------------------------

  state object + mostly logging html


  tested with 0 A.D. Alpha 18 Rhododactylus
  V: 0.1.1, agentx, CGN, Mar, 2015

*/

HANNIBAL = (function(H){

  // helper
  var mul  = function (n){return new Array(n || 2).join(" ");},
      tab  = function (s,l){return H.replace(H.tab(s,l), " ", "&nbsp;");},
      fmt  = function fmt(){
        var c=0, a=Array.prototype.slice.call(arguments); a.push("");
        return a[0].split("%s").map(function(t){return t + a.slice(1)[c++];}).join('');
      };

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


