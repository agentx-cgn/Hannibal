/*globals TWEEN, console */ 

var 
  $   = document.querySelector.bind(document),
  // $$  = document.querySelectorAll.bind(document),
  // clone = function(s){var p,t={};for(p in s){t[p]=s[p];}return t;},
  extend = function (o){
    Array.prototype.slice.call(arguments, 1)
      .forEach(function(e){Object.keys(e)
        .forEach(function(k){o[k] = e[k];});});
    return o;
  },
  fmt = function (){
    var c=0, a=Array.prototype.slice.call(arguments); a.push("");
    return a[0].split("%s").map(function(t){return t + a.slice(1)[c++];}).join('');
  },
  cvs = $("#board"),
  ctx = cvs.getContext("2d"),
  width  =  540,
  height =  180,
  tween, boardLeft, boardRight,
  blockSize   =   24,
  handleSize  =   32,
  tableWidth  =  140,
  margin      =   10,
  mouse       = {x: 0, y: 0, down: null, action: null},
  positions   = {
    "a0": {x:  30, y: margin + blockSize/2 + 4},
    "b0": {x:  80, y: margin + blockSize/2 + 4},
    "c0": {x: 130, y: margin + blockSize/2 + 4},
    "a1": {x:  30, y: margin + blockSize/2 + blockSize + 4},
    "b1": {x:  80, y: margin + blockSize/2 + blockSize + 4},
    "c1": {x: 130, y: margin + blockSize/2 + blockSize + 4},
    "a2": {x:  30, y: margin + blockSize/2 + blockSize *2 + 4},
    "b2": {x:  80, y: margin + blockSize/2 + blockSize *2 + 4},
    "c2": {x: 130, y: margin + blockSize/2 + blockSize *2 + 4},
    "a3": {x:  30, y: margin + blockSize/2 + blockSize *3 + 14},
    "b3": {x:  80, y: margin + blockSize/2 + blockSize *3 + 14},
    "c3": {x: 130, y: margin + blockSize/2 + blockSize *3 + 14},
    "handle": {x: 80, y: 110}
  };

function log(msg){
  ctx.save();
  ctx.translate(0, cvs.height);
  ctx.scale(1, -1);
  ctx.fillStyle = "white";
  try {ctx.fillText(msg, 8, 18);} catch(e){} //https://bugzilla.mozilla.org/show_bug.cgi?id=733698
  ctx.restore();
}

function title(text, alpha, xOffset){
  ctx.save();
  ctx.translate(0, cvs.height);
  ctx.scale(1, -1);
  ctx.fillStyle = "rgba(0, 0, 0, " + alpha + ")";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  try {
    ctx.font = "bold 32px Sans";
    ctx.fillText(text, xOffset, 32);
  } catch(e){} //https://bugzilla.mozilla.org/show_bug.cgi?id=733698
  ctx.restore();
}

function Board (cfg) {extend(this, cfg);}
Board.prototype = {
  constructor : Board,
  paint: function(){
    this.table.paint(this.xOffset);
    this.handle.paint(this.xOffset);
    this.blocka.paint(this.xOffset);
    this.blockb.paint(this.xOffset);
    this.blockc.paint(this.xOffset);
    this.hotspots.paint(this.xOffset);
  },
  setSelector: function(selector){
    this.selector = selector;
    this.selected = ( selector === "source" ?
      this.freeSources() :
      this.freeTargets()
    );
    this.hotspots.spots.forEach(function(spot){
      spot.active = this.selected.indexOf(spot.name) !== -1;
    }, this);
  },
  freeTargets: function(){

    var blocks = "abc".split(""), 
        cols = "abc".split(""), 
        rows = "012".split(""),
        c, r, row, col, candidate, targets = [],
        hit = function(b){return this.state[b] === col + row;};

    for (c in cols){
      col = cols[c];
      for (r in rows){
        row = rows[r];
        candidate = col + row;
        if (blocks.some(hit, this)){
          continue;
        } else {
          targets.push(candidate);
          break;
        }
      }
    }

    return targets;
    
  },
  freeSources: function(){

    var b, block, 
        blocks = "abc".split(""),
        candidates = "abc".split(""),
        isBlocked = function(pos){
          pos = pos[0] + (~~pos[1] +1);
          return blocks.some(function(block){
            return this.state[block] === pos;
          }, this);
        }.bind(this);

    for (b in blocks){
      block = blocks[b];
      if (isBlocked(this.state[block])){
        candidates.splice(candidates.indexOf(block), 1);
      }
    }

    return candidates;

  },
  setState: function(state){
    this.state = state;
    extend(this.blocka, positions[state.a]);
    extend(this.blockb, positions[state.b]);
    extend(this.blockc, positions[state.c]);
    extend(this.handle, positions[state.handle]);
  }
};

function Table (cfg) {extend(this, cfg);}
Table.prototype = {
  constructor : Table,
  paint: function(xOffset){
    ctx.fillStyle = "#333";
    ctx.fillRect(xOffset + this.x, this.y - this.h/2, this.w, this.h);
  }
};

function Block (cfg) {extend(this, cfg);}
Block.prototype = {
  constructor : Block,
  test: function(x, y){
    return (
      this.active && 
      x >= this.x - blockSize/2 && 
      x <= this.x + blockSize/2 &&
      y >= this.y - blockSize/2 && 
      y <= this.y + blockSize/2
    );
  },
  paint: function(xOffset){
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.source ? "#a22" : "#333";
    ctx.fillStyle = this.hover ? "#eee" : "#aaa";
    ctx.fillRect(xOffset + this.x - blockSize/2, this.y - blockSize/2, blockSize, blockSize);
    ctx.strokeRect(xOffset + this.x - blockSize/2, this.y - blockSize/2, blockSize, blockSize);
    ctx.drawImage($("#" + this.name), xOffset + this.x - blockSize/2, this.y - blockSize/2, blockSize, blockSize);
  }
};

function Handle (cfg) {extend(this, cfg);}
Handle.prototype = {
  constructor : Handle,
  test: function(x, y){
    return (
      this.active && 
      x >= this.x - handleSize/2 && 
      x <= this.x + handleSize/2 &&
      y <= this.y + handleSize/2 && 
      y >= this.y - handleSize/2
    );
  },
  paint: function(xOffset){
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.source ? "#a22" : "#333";
    ctx.beginPath();
    ctx.moveTo(xOffset + this.x, this.y + handleSize/2*3);
    ctx.lineTo(xOffset + this.x, this.y + handleSize/2);
    ctx.moveTo(xOffset + this.x - handleSize/2, this.y - handleSize/2);
    ctx.lineTo(xOffset + this.x - handleSize/2, this.y + handleSize/2);
    ctx.lineTo(xOffset + this.x + handleSize/2, this.y + handleSize/2);
    ctx.lineTo(xOffset + this.x + handleSize/2, this.y - handleSize/2);
    ctx.stroke();
    if (this.hover){
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(200, 200, 0, 0.8)";
      ctx.strokeRect(
        xOffset + this.x - handleSize/2 + 3, 
        this.y - handleSize/2 + 3, handleSize - 6, handleSize - 6);
    }
  }
};

function Hotspot (cfg) {extend(this, cfg);}
Hotspot.prototype = {
  constructor: Hotspot,
  test: function(x, y){
    return (
      this.active && 
      x > this.x - handleSize/2 +3 && 
      x < this.x + handleSize/2 -3 &&
      y < this.y + handleSize/2 -3 && 
      y > this.y - handleSize/2 +3
    );
  },
  paint: function(xOffset){
    if (this.active){
      ctx.setLineDash([2,3]);
      ctx.strokeStyle = this.hover ? "rgba(200, 20, 20, 0.5)" : "rgba(20, 20, 20, 0.5)";
      ctx.strokeRect(xOffset + this.x - blockSize/2, this.y - blockSize/2 + 2, blockSize, blockSize);
      ctx.setLineDash([]);
    }
  }
};

function Hotspots (cfg) {extend(this, cfg);}
Hotspots.prototype = {
  constructor: Hotspots,
  reset: function(whats){
    Array.prototype.slice.call(arguments).forEach(function(what){
      this.spots.forEach(function(spot){
        spot[what] = false;
      });
    }, this);
  },
  test: function(x, y){
    return this.spots.filter(function(spot){
      return spot.test(x, y);
    }, this);
  },
  paint: function(xOffset){
    this.spots.forEach(function(spot){
      spot.paint(xOffset);
    });  
  }
};

window.onload = function(){

  cvs.height = height; cvs.style.height = height + "px";
  cvs.width  = width;  cvs.style.width  = width  + "px";

  boardLeft  = new Board({
    name: "l",
    xOffset: margin,
    selector: "source",
    blocka: new Block({name:  "a"}),
    blockb: new Block({name:  "b"}),
    blockc: new Block({name:  "c"}),
    handle: new Handle({name: "h", block: ""}),
    table:  new Table({name:  "t", x: 10, y: margin, w: tableWidth, h: 2}),
    hotspots: new Hotspots({xOffset: margin, spots: [
      new Hotspot(extend({name: "a0"}, positions.a0)),
      new Hotspot(extend({name: "b0"}, positions.b0)),
      new Hotspot(extend({name: "c0"}, positions.c0)),
      new Hotspot(extend({name: "a1"}, positions.a1)),
      new Hotspot(extend({name: "b1"}, positions.b1)),
      new Hotspot(extend({name: "c1"}, positions.c1)),
      new Hotspot(extend({name: "a2"}, positions.a2)),
      new Hotspot(extend({name: "b2"}, positions.b2)),
      new Hotspot(extend({name: "c2"}, positions.c2)),
    ]})
  });

  boardRight  = new Board({
    name: "r",
    selector: "source",
    xOffset: tableWidth + 3 * margin,
    blocka: new Block({name:  "a"}),
    blockb: new Block({name:  "b"}),
    blockc: new Block({name:  "c"}),
    handle: new Handle({name: "h", block: ""}),
    table:  new Table({name:  "t", x: 10, y: margin, w: tableWidth, h: 2}),
    hotspots: new Hotspots({xOffset: tableWidth + 3 * margin, spots: [
      new Hotspot(extend({name: "a0"}, positions.a0)),
      new Hotspot(extend({name: "b0"}, positions.b0)),
      new Hotspot(extend({name: "c0"}, positions.c0)),
      new Hotspot(extend({name: "a1"}, positions.a1)),
      new Hotspot(extend({name: "b1"}, positions.b1)),
      new Hotspot(extend({name: "c1"}, positions.c1)),
      new Hotspot(extend({name: "a2"}, positions.a2)),
      new Hotspot(extend({name: "b2"}, positions.b2)),
      new Hotspot(extend({name: "c2"}, positions.c2)),
    ]})
  });

  // boardLeft.hotspots.reset("active");
  // boardRight.hotspots.reset("active");
  ['handle', 'blockc', 'blockb', 'blocka'].forEach(function(spot){
    boardLeft.hotspots.spots.unshift(boardLeft[spot]);
    boardRight.hotspots.spots.unshift(boardRight[spot]);
  });

  cvs.addEventListener('mouseup', function(){
    mouse.down = null;
    mouse.action = null;
  }, false);

  cvs.addEventListener('mousedown', function(e){
    mouse.down = {x: e.clientX - $("#board").offsetLeft, y: height - (height - e.clientY)};
  }, false);

  cvs.addEventListener('mousemove', function(e){
    mouse.x = e.clientX - $("#board").offsetLeft;
    mouse.y = height - e.clientY;
  }, false);


  boardLeft.setState({a: 'b1', b: 'b0', c: 'a0', handle: 'b3'});
  boardLeft.setSelector("source");

  boardRight.setState({a: 'a0', b: 'c0', c: 'c1', handle: 'c3'});
  boardRight.setSelector("source");

  ctx.translate(0, cvs.height);
  ctx.scale(1, -1);

  animate();

};


function animate(time){

  var spots, 
      boardActive = ( mouse.x > boardRight.xOffset ? 
        boardRight :
        boardLeft
      );

  ctx.clearRect(0, 0, cvs.width, cvs.height);

  boardLeft.hotspots.reset("hover"); 
  boardRight.hotspots.reset("hover"); 

  spots = boardActive.hotspots.test(mouse.x - boardActive.xOffset, mouse.y);

  if (spots.length) {

    if (mouse.down && !mouse.action){
      
      mouse.action = true;
      
      tween = ( boardActive.selector === "source" ? 
        getSourceTween(boardActive, spots[0]) :
        getTargetTween(boardActive, boardActive.handle.block, spots[0])
        )
        .start();

      boardActive.hotspots.reset("active"); 

    } else if (spots[0].active) {

      spots[0].hover = true;      

    }

  } 

  if (mouse.x > boardRight.xOffset) {
    title("Start", 0.2, tableWidth/2 + margin);
    title("Goal",  0.5, tableWidth/2*3 + 3 * margin);
  } else {
    title("Start", 0.5, tableWidth/2 + margin);
    title("Goal",  0.2, tableWidth/2*3 + 3 * margin);
  }

  TWEEN.update(time);

  boardLeft.paint();
  boardRight.paint();

  window.requestAnimationFrame(animate);

}

// function getResetTween(board){

//   var tween, t1, 
//       block = board.handle.block ? board["block" + board.handle.block] : "";

//   // up
//   tween = new TWEEN.Tween(board.handle)
//     .to({y: positions.b3.y}, 1000)
//     .easing(TWEEN.Easing.Quadratic.Out)
//     .onUpdate(function(){
//       board.handle.y = this.y;
//       if (board.handle.block) {
//         board["block" + board.handle.block].y = this.y;
//       }
//     });

//   // b3
//   t1 = new TWEEN.Tween(board.handle)
//     .to({x: positions.b3.x}, 1000)
//     .easing(TWEEN.Easing.Quadratic.Out)
//     .onUpdate(function(){
//       board.handle.x = this.x;
//       if (block) {block.x = this.x;}})
//     .onComplete(function(){
//       board.setSelector(block ? "target" : "source");});

//   return tween.chain(t1);   

// }

function getTargetTween(board, block, target){

  var t0 = new TWEEN.Tween({z:0}).to({z: 0}, 1),
      t1, t2, t3, t4, 
      vTime = (4 - target.name[1]) * 250;

  block = board["block" + block];  

  // first up
  if (board.handle.y !== positions.b3.y){
    t1 = new TWEEN.Tween(board.handle)
      .to({y: positions.b3.y}, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(function(){
        board.handle.y = this.y;
        block.y = this.y;})
      .delay(10);
  } else {t1 = new TWEEN.Tween({z:0}).to({z: 0}, 1);}

  // then left or right
  if (board.handle.x !== target.x){
    t2 = new TWEEN.Tween(board.handle)
      .to({x: target.x}, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(function(){
        board.handle.x = this.x;
        block.x = this.x;})
      .delay(10);
  } else {t2 = new TWEEN.Tween({z:0}).to({z: 0}, 1);}

  // down
  t3 = new TWEEN.Tween(board.handle)
    .to({y: target.y}, vTime * 0.7)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate(function(){
      board.handle.y = this.y;
      block.y = this.y;})
    .delay(10);

  // and up again
  t4 = new TWEEN.Tween(board.handle)
    .to({y: positions.b3.y}, vTime)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onStart(function(){
      board.handle.block = "";
      board.state[block.name] = target.name;})
    .onUpdate(function(){board.handle.y = this.y;})
    .onComplete(function(){
      board.setSelector("source");})
    .delay(10);

  return t0.chain(t1.chain(t2.chain(t3.chain(t4))));
}

function getSourceTween(board, block){

  var t1, t2, t3, t4,
      vTime = (4 - board.state[block.name][1]) * 250;

  // first up
  if (board.handle.y !== positions.b3.y){
    t1 = new TWEEN.Tween(board.handle)
      .to({y: positions.b3.y}, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(function(){board.handle.y = this.y;})
      .delay(10);
  } else {t1 = new TWEEN.Tween({z:0}).to({z: 0}, 1);}

  // then left or right
  if (board.handle.x !== block.x){
    t2 = new TWEEN.Tween(board.handle)
      .to({x: block.x}, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(function(){board.handle.x = this.x;})
      .delay(10);
  } else {t2 = new TWEEN.Tween({z:0}).to({z: 0}, 1);}

  // down
  t3 = new TWEEN.Tween(board.handle)
    .to({y: block.y}, vTime * 0.7)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate(function(){board.handle.y = this.y;})
    .delay(10);

  // and up again
  t4 = new TWEEN.Tween(board.handle)
    .to({y: positions.b3.y}, vTime)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onStart(function(){
      board.handle.block = block.name;
      board.state[block.name] = "handle";})
    .onUpdate(function(){
      board.handle.y = this.y;
      block.y = this.y;})
    .onComplete(function(){
      board.setSelector("target");})
    .delay(10);

  return t1.chain(t2.chain(t3.chain(t4)));

}