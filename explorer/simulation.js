/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals $, TIM, HANNIBAL, STRUCTURES, OTHER, H, deb */

/*--------------- B R O W S E R -----------------------------------------------

  manages explorer history



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

var DB, hotspots, simulation;

HANNIBAL = (function(H){


  var 
    size = 512, doAnimate = false, doStep = false, cntSteps = 0, reqAnimate, 
    counter = 0, 
    // simulation, 
    mouse = {active: false}, map = [], graph,
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


  H.Simulation = {

    tabActivate: function(token){
      mouse.action = token;
      switch (token) {
        case "simu": break;
        case "ents": break;
        case "comb": break;
      }
      msg(token + " activated");
    },

    init: function(){

      fmt  = H.format;
      $msgs = $("txtSIM");
      $terr = $("txtSimuTerrain");
      $enty = $("txtSimuEntity");
      $animate = $("chkSimAnim");
      cvsSim = $("cvsSim"); 
      ctxSim = cvsSim.getContext("2d");

      cvsSim.oncontextmenu = function(){return false;};

      hotspots = [];

    },

    load: function(){

      if(!DB.simulations){

        DB.clear();

        simulation = new H.SIM.Simulation({
          name:    "first",
          buildings: [
            {name: "stuff", x:  256, y:  50, width: 50, height: 50, color: "rgba(200, 200, 200, 0.8)"},
            {name: "stuff", x:  256, y: 462, width: 50, height: 50, color: "rgba(200, 200, 200, 0.8)"},
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
                  speed:   10, 
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
                  speed:   10, 
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

      H.Simulation.init();
      rbFps  = H.createRingBuffer(30);
      rbStep = H.createRingBuffer(30);
      rbDraw = H.createRingBuffer(30);
      H.Simulation.play();

      msg("Sim.loaded '%s'", simulation.name);
      TIM.step("SIM", fmt("loaded %s simulations", DB.simulations ? DB.simulations.length : NaN));
    },

    reset: function(){
      if (reqAnimate){cancelAnimationFrame(reqAnimate);}
      cntSteps = 0;
      doStep = false;
      doAnimate = false;
      H.Simulation.load();
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
      H.Simulation.animate();
    },
    pause: function(){
      if (reqAnimate){cancelAnimationFrame(reqAnimate);}
      doStep = false;
    },
    step: function(){
      if (reqAnimate){cancelAnimationFrame(reqAnimate);}
      doStep = true;
      doAnimate = true;
      H.Simulation.animate();
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
          console.log("move: ", simulation.selected.name, mouse.x, mouse.y);
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

      if (simulation){
        if (mouse.id){simulation.entities[mouse.id].hover = false;}
        mouse.id = (ent = simulation.hit(mouse.x, mouse.y)) ? ent.id : 0;
        if (mouse.id){simulation.entities[mouse.id].hover = true;}
      }

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
    animate: function animate(){

      var 
        tDiff, tNow, 
        t0 = Date.now(),
        self = H.Simulation,
        info = "";

      tDiff = t0 - tAnim;
      tAnim = t0;
      rbFps.push(1000/tDiff);

      ctxSim.clearRect(0, 0, size, size);

      if (doStep){
        tNow = Date.now();
        simulation.step(t0);
        rbStep.push(Date.now() - tNow);
        cntSteps += 1;
      }

      tNow = Date.now();
      simulation.paint(ctxSim);
      rbDraw.push(Date.now() - tNow);

      self.updateMouseInfo();
      // self.renderMouse();

      ctxSim.fillStyle = "#33F";
      info = "fps: " + (rbFps.avg()).toFixed(1) + " | s: " + (rbStep.avg()).toFixed(1) + " | d: " + (rbDraw.avg()).toFixed(1) + " | " + cntSteps;
      ctxSim.fillText(info, 4, 12);

      if (doAnimate) {reqAnimate = window.requestAnimationFrame(animate);}

    },

    renderMouse: function(){

      ctxSim.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctxSim.fillRect(mouse.x -2, mouse.y -2, 5, 5);


    }







  };


return H; }(HANNIBAL));   

