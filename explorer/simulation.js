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
    // simulation, 
    mouse = {active: false}, map = [], graph,
    cvsSim, ctxSim,
    $msgs, $terr, $animate, 
    rbFps, fmt, tAnim,
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
      $animate = $("chkSimAnim");
      cvsSim = $("cvsSim"); 
      ctxSim = cvsSim.getContext("2d");

      // $animate.onchange = function(){
      //   doAnimate = $animate.checked ? true : false;
      //   if (doAnimate) {H.Simulation.animate();}
      // };


    },

    load: function(){

      if(!DB.simulations){

        DB.clear();

        simulation = new H.SIM.Simulation({
          name:    "first",
          buildings: [
            {x: 100, y: 100, width: 50, height: 50},
            {x: 300, y: 300, width: 50, height: 50},
          ],
          armies:  [
            {name: "green", color: "rgba(40, 200, 40, 0.8)",
              corps:  [
                {name: "infantry", color: "rgba(40, 100, 40, 0.8)",
                  x: 50, y: 300,
                  units:    5, 
                  speed:   10, 
                  range:   20, 
                  vision:  30,
                  health: 100,
                }
              ], 
            },
            {name: "red",   color: "rgba(200, 40, 40, 0.8)",
              corps:  [
                {name: "infantry", color: "rgba(100, 40, 40, 0.8)",
                  x: 300, y: 50,
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
      rbFps = H.createRingBuffer(30);
      H.Simulation.play();

      msg("Sim.loaded '%s'", simulation.name);
      TIM.step("SIM", fmt("loaded %s simulations", DB.simulations ? DB.simulations.length : NaN));
    },

    reset: function(){
      if (reqAnimate){cancelAnimationFrame(reqAnimate);}
      cntSteps = 0;
      doAnimate = false;
      doStep = false;
      H.Simulation.load();
    },
    stop:  function(){
      if (reqAnimate){cancelAnimationFrame(reqAnimate);}
      doAnimate = false;
      doStep = false;
    },
    play:  function(){
      if (reqAnimate){cancelAnimationFrame(reqAnimate);}
      doAnimate = true;
      doStep = true;
      H.Simulation.animate();
    },
    pause: function(){
      doStep = false;
    },

    keymap: function( /* e */ ){return {};},
    onclick: function(e){return {};},
    onmousemove: function(e){

      var x, y, posCanvas = H.Display.findPosXY(this);

      mouse.active = true;
      window.focus();

      x = e.clientX - posCanvas[0] + window.pageXOffset;
      y = e.clientY - posCanvas[1] + window.pageYOffset;

      mouse.x = ~~H.clamp(x, 0, size);
      mouse.y = ~~H.clamp(y, 0, size);
      mouse.i = mouse.y * size + mouse.x;


    },
    updateMouseInfo: function(){

      var cost, t, terrain;

      if (mouse.active){

        $terr.innerHTML = fmt("%s, %s, %s", mouse.x, mouse.y, mouse.i);
      } else {
        $terr.innerHTML = fmt("terrain unavailable");
      }

    },
    animate: function animate(){

      var 
        tDiff,
        t0 = Date.now(),
        self = H.Simulation,
        info = "";

      tDiff = t0 - tAnim;
      tAnim = t0;
      rbFps.push(1000/tDiff);

      ctxSim.clearRect(0, 0, size, size);

      if (doStep){
        simulation.step(t0);
        cntSteps += 1;
      }
      simulation.paint(ctxSim);

      self.updateMouseInfo();
      self.renderMouse();

      ctxSim.fillStyle = "#33F";
      info = (rbFps.avg()).toFixed(1) + " | " + cntSteps;
      ctxSim.fillText(info, 4, 12);

      if (doAnimate) {reqAnimate = window.requestAnimationFrame(animate);}

    },

    renderMouse: function(){

      ctxSim.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctxSim.fillRect(mouse.x -2, mouse.y -2, 5, 5);


    }







  };


return H; }(HANNIBAL));   

