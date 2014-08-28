/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals $, TIM, HANNIBAL, STRUCTURES, OTHER, H, deb */

/*--------------- B R O W S E R -----------------------------------------------

  manages explorer history



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){


  var 
    size = 512, map, doAnimate = false,
    tAnim,
    mouse = {active: false}, map = [], graph,
    doAnimate = false,
    cvsSim, ctxSim,
    rbFps,
    field = new Float32Array(size * size);

  function msg(line){
    var pos1, pos2;
    if (line === ""){$msgs.innerHTML = "";}
    else {
      try {
        pos1 = $msgs.innerHTML.length;
        pos2 = pos1 + line.length;
        $msgs.innerHTML += line + "\n";
        $msgs.setSelectionRange(pos1, pos2);
      } catch(e){console.log("msg", e);}
    }
  }


  H.Simu = {

    init: function(){
      fmt  = H.format;
      $msgs = $("txtSIM");
      $terr = $("txtSimuTerrain");
      $animate = $("chkSimAnim");

      rbFps = H.createRingBuffer(30);

      cvsSim = $("cvsSim"); ctxSim = cvsSim.getContext("2d");

      $animate.onchange = function(){
        doAnimate = $animate.checked ? true : false;
        if (doAnimate) {H.Simu.animate();}
      };


    },

    load: function(simulation){
      H.Simu.init();
      doAnimate = true;
      H.Simu.animate();

      msg("Sim.loaded");
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
    mouseinfo: function(){

      var cost, t, terrain;

      if (mouse.active){

        $terr.innerHTML = fmt("%s, %s, %s", mouse.x, mouse.y, mouse.i);
      } else {
        $terr.innerHTML = fmt("terrain unavailable");
      }

    },
    tabActivate: function(token){

      mouse.action = token;

      switch (token) {
        case "terr": break;
        case "ents": break;
        case "comb": break;
      }

      msg(token + " activated");

    },
    animate: function animate(){

      var 
        tDiff,
        t0 = Date.now(),
        self = H.Simu;

      tDiff = t0 - tAnim;
      tAnim = t0;
      rbFps.push(1000/tDiff);

      ctxSim.clearRect(0, 0, size, size);

      self.mouseinfo();
      self.renderMouse();

      ctxSim.fillStyle = "#33F";
      ctxSim.fillText((rbFps.avg()).toFixed(1), 4, 12)

      if (doAnimate) {window.requestAnimationFrame(animate);}

    },

    renderMouse: function(){

      ctxSim.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctxSim.fillRect(mouse.x -2, mouse.y -2, 5, 5)


    }







  };


return H; }(HANNIBAL));   

