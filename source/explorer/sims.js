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
      mapborder:    4, 
      color:        "rgba(200,0,200,1)",
      vision:      60,
      range:       40,
      speed:        0,
      health:     100,
      width:        3,
      height:       3,
    };

  H.SIM = {};


  /* ENTITY */ 

  H.SIM.Entity = function (params){
    H.extend(this, {

      name:    params && params.name   || "unnamed",
      army:    params && params.army   || "",

      x:       params && params.x      || H.rndClamp(defs.mapborder, defs.mapsize - defs.mapborder),
      y:       params && params.y      || H.rndClamp(defs.mapborder, defs.mapsize - defs.mapborder),
      width:   params && params.width  || defs.width,
      height:  params && params.height || defs.height,
      color:   params && params.color  || defs.color,
      health:  params && params.health || defs.health,
      speed:   params && params.speed  || defs.speed,
      vision:  params && params.vision || defs.vision,

      velo:     0,
      hover:    false,
      selected: false,
      target:   null,
      path:     null,
      pathPointer: 0,

    });

    this.w2 = this.width  / 2;
    this.h2 = this.height / 2;

  };

  H.SIM.Entity.prototype = {
  	constructor: H.SIM.Entity,
    position: function(){return [this.x, this.y];},
    distance: function(x0, y0, x1, y1){
      var dx = x0 - x1, dy = y0 -y1;
      return Math.sqrt(dx * dx + dy * dy);
    },
    hit:  function(x, y){
      return (
        x >= this.x - this.w2 &&
        x <= this.x + this.w2 &&
        y >= this.y - this.h2 &&
        y <= this.y + this.h2
      );
    },
    step:  function(msecs){}, // overwrite me
    paint: function(msecs){}, // overwrite me
  };


  /* GROUP */ 

  H.SIM.Group = function (){
    H.SIM.Entity.apply(this, H.toArray(arguments));
    this.units = [];
  };

  H.extend(H.SIM.Group.prototype, H.SIM.Entity.prototype, {
    constructor: H.SIM.Group,
    paint: function(){},
  });
    
  H.SIM.Bullet = function (){
    H.SIM.Entity.apply(this, H.toArray(arguments));
    this.fillColor = this.color;
    this.size   = 10; 
    this.speed  = 20; 
    this.totalLength = this.distance(this.source.x, this.source.y, this.target.x, this.target.y);
    this.time = this.totalLength / this.speed;
    this.theta  = Math.atan2(this.target.x - this.source.x, this.target.y - this.source.y);
    this.xDistance = this.target.x - this.source.x;
    this.yDistance = this.target.y - this.source.y;
  };

  H.extend(H.SIM.Bullet.prototype, H.SIM.Entity.prototype, {
    constructor: H.SIM.Unit,
    step: function(msecs){

      var 
        xDiff = msecs / 1000 * this.speed * this.xDistance,
        yDiff = msecs / 1000 * this.speed * this.yDistance;

      this.x += xDiff;
      this.y += yDiff;

      this.time -= msecs;
      if (this.time < 0){
        this.hit = true;
      }

    },
    paint: function(ctx){
      ctx.fillStyle = this.fillColor;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 3, 0, 2 * Math.PI, false);
      ctx.fill();
    }
  });

  /* UNIT */ 

  H.SIM.Unit = function (){
    H.SIM.Entity.apply(this, H.toArray(arguments));
    this.fillColor   = this.color;
    this.strokeColor = this.army.color;
  };

  H.extend(H.SIM.Unit.prototype, H.SIM.Entity.prototype, {
    constructor: H.SIM.Unit,
    move: function(msecs){

      var 
        x, y, distance, 
        length = msecs / 1000 * this.speed;

      // find closest node, farer than length
      while (this.pathpointer < this.path.length){
        x = this.path[this.pathpointer].x * H.Map.cellsize;
        y = this.path[this.pathpointer].y * H.Map.cellsize;
        distance = this.distance(this.x, this.y, x, y);
        if (distance < length){
          this.pathpointer += 1;
        } else {
          this.x += (x - this.x) * (length/distance);
          this.y += (y - this.y) * (length/distance);
          return;
        }
      } 
      // arrived
      this.x = this.target[0];
      this.y = this.target[1];
      this.path   = null;
      this.target = null;

    },
    step: function(msecs){

      var posUnit, posTarget;

      if (this.target && !this.path){
        posUnit = H.Map.mapPosToGridPos([this.x, this.y]);
        posTarget = H.Map.mapPosToGridPos(this.target);
        this.path = H.Explorer.Simulator.getUnitPath(posUnit, posTarget).path;
        this.pathpointer = 0;
      } 

      if (this.target && this.path){
        this.move(msecs);
      }
    },
    paint: function(ctx){

      var 
        strokeColor = this.selected ? "rgba(255, 255, 0, 1.0)" : this.strokeColor,
        fillColor   = this.hover    ? "rgba(200, 200, 0, 0.6)" : this.fillColor;

      ctx.beginPath();
      ctx.arc(this.x, this.y, 3, 0, 2 * Math.PI, false);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();      
      if (this.drawVision || true){
        ctx.lineWidth = 0.2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.vision, 0, 2 * Math.PI, false);
        ctx.strokeStyle = strokeColor;
        ctx.stroke();      
      }
    }
  });
    
  /* BUILDING */ 

  H.SIM.Building = function (b){
    H.Geometry.Rect.apply(this, [b.x, b.y, b.width, b.height, b.angle]);
    H.SIM.Entity.apply(this, H.toArray(arguments));
    this.fillColor   = this.color;
    this.strokeColor = this.army ? this.army.color : "white";
    this.lineWidth   = H.Map.cellsize;
  };

  H.extend(H.SIM.Building.prototype, H.SIM.Entity.prototype, H.Geometry.Rect.prototype, {
    constructor: H.SIM.Building,
    hit: function(x, y){
      return this.contains({x: x, y: y});
    },
    paint: function(ctx){

      var 
        corners = this.polygon(),
        strokeColor = this.selected ? "rgba(255, 255, 0, 1.0)" : this.strokeColor,
        fillColor   = this.hover    ? "rgba(200, 200, 0, 0.6)" : this.fillColor;

      ctx.lineWidth   = this.lineWidth;
      ctx.strokeStyle = strokeColor;
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      ctx.lineTo(corners[1].x, corners[1].y);
      ctx.lineTo(corners[2].x, corners[2].y);
      ctx.lineTo(corners[3].x, corners[3].y);
      ctx.lineTo(corners[0].x, corners[0].y);
      ctx.stroke();
      ctx.fillStyle = fillColor;
      ctx.fill();

      if (this.drawVision || true){
        ctx.lineWidth = 0.2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.vision, 0, 2 * Math.PI, false);
        ctx.strokeStyle = strokeColor;
        ctx.stroke();      
      }

    }
  });

  /* SIMULATION */ 

  H.SIM.Simulation = function (simulation){

    var cntArmy = 1, circle, entity, polygon, counter = 0;

    H.extend(this, simulation, {
      mapsize: simulation.size || defs.mapsize,
      mapborder: simulation.mapborder || defs.mapborder,
    });

    this.entities = {};
    this.selected = 0;

    simulation.buildings.forEach(b => {
      entity = new H.SIM.Building(b);
      entity.id = ++counter;
      entity.name = entity.name + "|" + entity.id;
      this.entities[entity.id] = entity;
    });

    // buildings
    // armies => groups => units
    //        => buildings

    simulation.armies.forEach(army => {

      army.buildings.forEach(build => {
        entity = new H.SIM.Building(H.mixin({army: army}, build, {}));
        entity.id = ++counter;
        entity.name = army.name + "|" + entity.name + "|" + entity.id;
        this.entities[entity.id] = entity;
      });

      army.corps.forEach(corp => {

        entity = new H.SIM.Group(H.mixin({army: army}, corp));
        entity.id = ++counter;
        entity.name = army.name + "|" + corp.name + "|" + entity.id;
        this.entities[entity.id] = entity;

        circle = new H.Geometry.Circle(corp.x, corp.y, 12);
        polygon = circle.polygon(corp.units);
        polygon.forEach(p => {
          entity = new H.SIM.Unit(H.mixin({army: army}, corp, {x: p.x, y: p.y}));
          entity.id = ++counter;
          entity.name = army.name + "|" + corp.name + "|unit|" + entity.id;
          this.entities[entity.id] = entity;
        });

      });

      cntArmy += 1;
      
    });

  };

  H.SIM.Simulation.prototype = {
    constructor: H.SIM.Simulation,
    destroy: function(id){delete this.entities[id];},
    hit:     function(x, y){
      var 
        ent, ents = Object.keys(this.entities),
        i = ents.length;

      while (i--){
        ent = this.entities[ents[i]];
        if (ent.hit(x, y)){
          return ent;
        }
      }
      return null;
    },
    step: function(msecs){
      H.each(this.entities, (id, entity) => {
        entity.step(msecs);
      });
    },
    paint: function(ctx){
      H.each(this.entities, (id, entity) => {
        entity.paint(ctx);
      });
    },
  };



return H; }(HANNIBAL));   

