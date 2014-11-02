/*jslint bitwise: true, browser: true, todo: true, evil:true, devel: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals TIM, HANNIBAL, STRUCTURES, OTHER, H, deb */

/*--------------- B R O W S E R -----------------------------------------------

  manages explorer history



  tested with 0 A.D. Alpha 15 Osiris
  V: 0.1, agentx, CGN, Feb, 2014

*/

HANNIBAL = (function(H){


  var 
    defs = {
      mapsize:    512, 
      mapborder:   12, 
      color:        "rgba(0,0,0,1)",
      typ:          "ranged",
      vision:      60,
      range:       40,
      speed:        0,
      health:     100,
      width:        3,
      height:       3,
    };

  H.SIM = {};


  /* THING */ 

  H.SIM.Thing = function (params){
    H.extend(this, {
      x:       params && params.x || H.rndClamp(defs.mapborder, defs.mapsize - defs.mapborder),
      y:       params && params.y || H.rndClamp(defs.mapborder, defs.mapsize - defs.mapborder),
      width:   params && params.width  || defs.width,
      height:  params && params.height || defs.height,
      color:   params && params.color  || defs.color,
      health:  params && params.health || defs.health,
      speed:   params && params.speed  || defs.speed,
      velo:    0
    });
  };

  H.SIM.Thing.prototype = {
  	constructor: H.SIM.Thing,
    step: function(){
      if (this instanceof H.SIM.Unit){
        
      }
      if (this instanceof H.SIM.Building){
        // do nothing
      }
    },
    paint: function(ctx){
      if (this instanceof H.SIM.Unit){
        
      }
      if (this instanceof H.SIM.Building){
        this.draw(ctx, this.color, 1); // .Rect takes care
      }

    },
  	
  };


  /* GROUP */ 

  H.SIM.Group = function (){
    H.SIM.Thing.apply(this, H.toArray(arguments));
    this.units = [];
  };

  H.SIM.Group.prototype = {
    constructor: H.SIM.Group,
    step: function(){},
    paint: function(ctx){

    },
    
  };
    
  /* UNIT */ 

  H.SIM.Unit = function (){
    H.SIM.Thing.apply(this, H.toArray(arguments));
  };

  H.SIM.Unit.prototype = {
    constructor: H.SIM.Unit,
    step: function(){},
    paint: function(ctx){
      ctx.beginPath();
      ctx.arc(this.x, this.y, 3, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'green';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#003300';
      ctx.stroke();      
    }
  };
    
  /* BUILDING */ 

  H.SIM.Building = function (b){
    H.Geometry.Rect.apply(this, [b.x, b.y, b.width, b.height]);
    H.SIM.Thing.apply(this, H.toArray(arguments));
  };

  H.extend(H.SIM.Building.prototype, H.SIM.Thing.prototype, H.Geometry.Rect.prototype);
  H.extend(H.SIM.Building.prototype, {

  });
  H.SIM.Building.constructor = H.SIM.Thing;
    

  /* SIMULATION */ 

  H.SIM.Simulation = function (simulation){

    var cntArmy = 0, circle;

    console.log(simulation);

    H.extend(this, simulation, {
      mapsize: simulation.size || defs.mapsize,
      mapborder: simulation.mapborder || defs.mapborder,
    });

    this.things = [];

    simulation.buildings.forEach(b => {
      this.things.push(new H.SIM.Building(b));
    });

    // armies => groups => units

    simulation.armies.forEach(army => {

      cntArmy += 1;
      
      army.corps.forEach(corp => {

        this.things.push(new H.SIM.Group(
          H.mixin({army: cntArmy}, corp)
        ));

        circle = new H.Geometry.Circle(corp.x, corp.y, 12);
        polygon = circle.polygon(corp.units);
        polygon.forEach(p => {

          this.things.push(new H.SIM.Unit(
            H.mixin({}, corp, {x: p.x, y: p.y, army: cntArmy})
          ));

        });

      });
    });


  };

  H.SIM.Simulation.prototype = {
    constructor: H.SIM.Simulation,
    step: function(msecs){
      this.things.forEach(thing => {
        thing.step(msecs);
      });
    },
    paint: function(ctx){
      this.things.forEach(thing => {
        thing.paint(ctx);
      });
    },
  };



return H; }(HANNIBAL));   

