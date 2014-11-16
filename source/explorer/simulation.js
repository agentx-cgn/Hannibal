/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals $, TIM, HANNIBAL, STRUCTURES, OTHER, H, deb */

/*--------------- B R O W S E R -----------------------------------------------

  manages explorer history



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

var DB, simulation;

HANNIBAL = (function(H){

  var 
    size = 512, doAnimate = false, doStep = false, cntSteps = 0, reqAnimate, 
    mouse = {active: false}, 
    graphUnit, 
    cvsSim, ctxSim,
    $msgs, $terr, $animate, $enty, 
    rbFps, rbStep, rbDraw,
    fmt, tAnim,
    field = new Float32Array(size * size);

  function msg(){
    var pos1, pos2, line = H.format.apply(null, H.toArray(arguments));
    if (!$msgs){$msgs = $("txtSIM");}
    if (line === ""){$msgs.innerHTML = "";}
    else {
      try {
        pos1 = $msgs.innerHTML.length;
        pos2 = pos1 + line.length;
        $msgs.innerHTML += line + "\n";
        // $msgs.setSelectionRange(pos1, pos2);
      } catch(e){console.log("msg", e);}
    }
  }


  DB = new Proxy(localStorage, {
    set: function(proxy, attr, value) {proxy.setItem(attr, JSON.stringify(value));},
    get: function(proxy, attr) {
      return (
        !attr             ? null                    :
        attr === "length" ? proxy.length            :
        attr === "clear"  ? () => proxy.clear()     :
        proxy[attr]       ? JSON.parse(proxy[attr]) :
          null
      );
    },
  });

  H.Explorer = H.Explorer || {};

  H.Explorer.Simulator = {

    get sim  () {return simulation;},

    tabActivate: function(token){
      mouse.action = token;
      switch (token) {
        case "simu": break;
        case "ents": break;
        case "comb": break;
      }
      msg(token + " activated");
    },

    init: function(sim){

      var i, j, graph;

      fmt  = H.format;
      $msgs = $("txtSIM");
      $terr = $("txtSimuTerrain");
      $enty = $("txtSimuEntity");
      $animate = $("chkSimAnim");

      cvsSim = $("cvsSim"); ctxSim = cvsSim.getContext("2d");
      cvsSim = $("cvsSim"); ctxSim = cvsSim.getContext("2d");
      
      rbFps  = H.createRingBuffer(30);
      rbStep = H.createRingBuffer(30);
      rbDraw = H.createRingBuffer(30);

      cvsSim.oncontextmenu = function(){return false;};

      H.Map = new H.LIB.Map({width: size, height: size, cellsize: 4, circular: false});

      this.load(sim);

      H.Effector = new H.LIB.Effector({
        connector: "simulator",
        simulation: simulation,
      });
      
      i = size / H.Map.cellsize;
      graph = [];
      while(i--){
        graph[i] = [];
        j = size / H.Map.cellsize;
        while(j--){
          graph[i][j] = 1;
        }
      }
      graphUnit = new H.AI.Graph(graph);

      this.play();

      setTimeout(() => {
        H.Effector.move([12], [ 20, 120]);
        H.Effector.move([13], [ 40, 120]);
        H.Effector.move([14], [ 60, 120]);
        H.Effector.move([15], [ 80, 120]);
        H.Effector.move([16], [100, 120]);
      }, 500);  

      msg("Sim.loaded '%s'", simulation.name);
      TIM.step("SIM", fmt("loaded %s simulations", DB.simulations ? DB.simulations.length : NaN));

    },

    load: function(simname){

      if(!DB.simulations || !simname || simname === "first"){

        DB.clear();

        simulation = new H.SIM.Simulation({
          name:    "first",
          buildings: [
            {name: "stuff", x:  256, y:  50, width: 50, height: 50, angle: Math.PI/4, color: "rgba(200, 200, 200, 0.8)"},
            {name: "stuff", x:  256, y: 462, width: 50, height: 50, angle: Math.PI/4, color: "rgba(200, 200, 200, 0.8)"},
          ],
          armies:  [
            {name: "green", color: "rgba(40, 200, 40, 0.8)",
              buildings: [
                {name: "centre", x:  50, y: 256, width: 50, height: 70, range: 100, color: "rgba(200, 200, 200, 0.8)"},
              ],
              corps:  [
                {name: "infantry", color: "rgba(40, 100, 40, 0.8)",
                  x: 100, y: 256,
                  units:    5, 
                  speed:   100, 
                  range:   20, 
                  vision:  30,
                  health: 100,
                }
              ], 
            },
            {name: "red",   color: "rgba(200, 40, 40, 0.8)",
              buildings: [
                {name: "centre", x: 462, y: 256, width: 50, height: 70, range: 100, color: "rgba(200, 200, 200, 0.8)"},
              ],
              corps:  [
                {name: "infantry", color: "rgba(100, 40, 40, 0.8)",
                  x: 412, y: 256,
                  units:    5, 
                  speed:   100, 
                  range:   20, 
                  vision:  30,
                  health: 100,
                }
              ], 
            },
          ],
          
        });

        // DB.simulations = ["first"];
        DB.first = simulation;

      } else {
        simulation = new H.SIM.Simulation(DB.first);
      }
    },
    getUnitPath: function(start, end){

      var 
        nodeStart = graphUnit.grid[start[0]][start[1]],
        nodeEnd   = graphUnit.grid[end[0]][end[1]];

      graphUnit.clear();

      return H.AI.AStar.search(graphUnit, nodeStart, nodeEnd, { 
        closest:   true,
        heuristic: H.AI.AStar.heuristics.euclidian,
        algotweak: 3
      });

    },
    reset: function(){
      if (reqAnimate){cancelAnimationFrame(reqAnimate);}
      cntSteps = 0;
      this.load(simulation.name);
      H.Effector = new H.LIB.Effector({
        connector: "simulator",
        simulation: simulation,
      });
      this.step();
    },
    stop:  function(){
      if (reqAnimate){cancelAnimationFrame(reqAnimate);}
      doStep = false;
      doAnimate = false;
    },
    play:  function(){
      if (reqAnimate){cancelAnimationFrame(reqAnimate);}
      doStep = true;
      doAnimate = true;
      this.animate();
    },
    pause: function(){
      if (reqAnimate){cancelAnimationFrame(reqAnimate);}
      doStep = false;
    },
    step: function(){
      if (reqAnimate){cancelAnimationFrame(reqAnimate);}
      doStep = true;
      doAnimate = true;
      this.animate();
      doStep = false;      
    },

    keymap: function( /* e */ ){return {};},
    onclick: function(e){
    },
    onmousedown: function(e){},
    onmouseup:   function(e){
      if (e.buttons === 1){
        if (simulation.selected){simulation.selected.selected = false;}
        simulation.selected = !!mouse.id ? simulation.entities[mouse.id] : null;
        if (simulation.selected){simulation.selected.selected = true;}
        console.log("selected: ", simulation.selected);
        console.log("selected: ", e);
      } else if (e.buttons === 2){
        if (simulation.selected){
          H.Effector.move([simulation.selected.id], [mouse.x, mouse.y]);
          // simulation.selected.target = [mouse.x, mouse.y];
          // console.log("move: ", simulation.selected.name, mouse.x, mouse.y);
        }
      }
    },
    onmousemove: function(e){

      var x, y, ent, posCanvas = H.Display.findPosXY(this);

      mouse.active = true;
      window.focus();

      x = e.clientX - posCanvas[0] + window.pageXOffset;
      y = e.clientY - posCanvas[1] + window.pageYOffset;

      mouse.x = ~~H.clamp(x, 0, size);
      mouse.y = ~~H.clamp(y, 0, size);
      mouse.i = mouse.y * size + mouse.x;

    },
    updateRenderInfo: function(){
      var 
        info = "fps: " + (rbFps.avg()).toFixed(1) + " | s: " + (rbStep.avg()).toFixed(1) + " | d: " + (rbDraw.avg()).toFixed(1) + " | " + cntSteps;
      ctxSim.fillStyle = "#33F";
      ctxSim.fillText(info, 4, 12);
    },
    updateMouseInfo: function(){
      $terr.innerHTML = ( mouse.active ? 
        fmt("%s, %s, %s", mouse.x, mouse.y, mouse.i) :
        fmt("terrain unavailable")
      );
      $enty.innerHTML = ( mouse.active ? 
        mouse.id ? simulation.entities[mouse.id].name : "no entity" :
        "no entity"
      );
    },
    renderMouse: function(){
      ctxSim.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctxSim.fillRect(mouse.x -2, mouse.y -2, 5, 5);
    },
    animate: function animate(){

      var 
        tDiff, tNow, t0 = Date.now(),
        ent,
        self = H.Explorer.Simulator;

      tDiff = t0 - tAnim;
      tAnim = t0;
      rbFps.push(1000/tDiff);

      tNow = Date.now();

      // stepping

      if (doStep){

        if (simulation){
          if (mouse.id){simulation.entities[mouse.id].hover = false;}
          mouse.id = (ent = simulation.hit(mouse.x, mouse.y)) ? ent.id : 0;
          if (mouse.id){simulation.entities[mouse.id].hover = true;}
        }

        simulation.step(1000/60); //nominal 60 fps
        cntSteps += 1;
      }

      rbStep.push(Date.now() - tNow);

      // drawing

      tNow = Date.now();

      ctxSim.clearRect(0, 0, size, size);
      ctxSim.strokeStyle = "rgba(100, 0, 0, 0.9)";
      ctxSim.lineWidth = H.Map.cellsize;
      ctxSim.strokeRect(0, 0, size, size);

      simulation.paint(ctxSim);
      self.updateMouseInfo();
      self.updateRenderInfo();

      rbDraw.push(Date.now() - tNow);

      // prolog

      if (doAnimate) {reqAnimate = window.requestAnimationFrame(animate);}

    },

  };

return H; }(HANNIBAL));   

