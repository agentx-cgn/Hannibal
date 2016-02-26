/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL */

/*---------------  A I --------------------------------------------------------

  traditional AI methods, adjusted for speed, SpiderMonkey and ES6

  KMeans      : Credit: https://github.com/cmtt/kmeans-js, 
                License: MIT
  A*          : Credit: https://github.com/bgrins/javascript-astar
                License: https://raw.githubusercontent.com/bgrins/javascript-astar/master/LICENSE
  Binary Heap : Marijn Haverbeke, Credit: http://eloquentjavascript.net/appendix2.html
                License: http://creativecommons.org/licenses/by/3.0/
  Flow Field  : Corey Birnbaum, Credit: https://github.com/vonWolfehaus/FlowField

  tested with 0 A.D. Alpha 18 Rhododactylus
  V: 0.1.1, agentx, CGN, Mar, 2015

*/


HANNIBAL = (function(H){

  var deb = H.deb;

  // Discussion: http://varianceexplained.org/r/kmeans-free-lunch/

  H.AI.KMeans = (function () {

    /** Constructor */

    var kmeans = function () {
      this.kmpp = true;
      this.maxWidth   = 512;
      this.maxHeight  = 512;
      this.iterations = 0;
      this.converged  = false;
      this.maxIterations = 100;
      this.k = 0;
    };

    /** Resets k-means. */

    kmeans.prototype.reset = function () {
      this.iterations = 0;
      this.converged = false;
      this.points = [];
      this.centroids = [];
    };

    /** Measures the Manhattan distance between two points. */

    kmeans.prototype.distance =  function(a, b) {
      // return Math.sqrt( Math.pow(a.x - b.x, 2) +  Math.pow(a.y - b.y, 2) );
      // return Math.sqrt( (a.x - b.x) * (a.x - b.x) +  (z.y - b.z) * (a.z - b.z) );
      return (a.x - b.x) * (a.x - b.x) + (a.z - b.z) * (a.z - b.z);
    };

    /** Resets k-means and sets initial points*/

    kmeans.prototype.setPoints = function (points) {
      this.reset();
      this.points = points;
    };

    /** Guess the amount of centroids to be found by the rule of thumb */

    kmeans.prototype.guessK = function () {
      this.k = ~~(Math.sqrt(this.points.length*0.5));
    };

    /** Chooses random centroids */

    kmeans.prototype.chooseRandomCentroids = function () {
      var i;
      for (i = 0; i < this.k; ++i) {
        this.centroids[i] = {
          centroid : i,
          x : ~~(Math.random()*this.maxWidth),
          z : ~~(Math.random()*this.maxHeight),
          items : 0
        };
      }
    };

    /** Clusters the provided set of points. */

    kmeans.prototype.cluster = function (cb) {

      /** Iterate until converged or the maximum amount of iterations is reached. */

      var t0 = Date.now();

      while (!this.converged && (this.iterations < this.maxIterations)) {
        this.converged = true;
        this.iterations += 1;
        this.iterate();
        if(cb){cb(this.centroids);}
      }

      this.msecs = Date.now() - t0;

    };

    // /** Measure the distance to a point, specified by its index. */

    // kmeans.prototype.measureDistance =   function (i) {
    //   var self = this;
    //   return function ( centroid ) {
    //     return self.distance(centroid, self.points[i]);
    //   };
    // };

    /** Iterates over the provided points one time */

    kmeans.prototype.iterate = function () {

      var 
        i, l = this.points.length, sums = [], 
        centroid, point,
        sortByDistance = function(a, b){
          var da, db;
          da = (a.x - point.x) * (a.x - point.x) + (a.z - point.z) * (a.z - point.z);
          db = (b.x - point.x) * (b.x - point.x) + (b.z - point.z) * (b.z - point.z);
          return da - db;
        };

      /** When the result doesn't change anymore, the final result has been found. */

      /** Prepares the array of the  */

      for (i = 0; i < this.k; ++i) {
        sums[i] = { x : 0, z : 0, items : 0 };
      }

      /** Find the closest centroid for each point */

      for (i = 0; i < l; ++i) {

        point    = this.points[i];

        /** index of nearest centroid */

        centroid = this.centroids.sort(sortByDistance)[0].centroid;

        /**
         * When the point is not attached to a centroid or the point was
         * attached to some other centroid before, the result differs from the
         * previous iteration.
         */

        this.converged = (
          // typeof point.centroid !== 'number' || point.centroid !== centroid  ? 
          point.centroid !== centroid  ? 
          false : this.converged
        );

        /** Attach the point to the centroid */

        point.centroid = centroid;

        /** Add the points' coordinates to the sum of its centroid */

        sums[centroid].x += point.x;
        sums[centroid].z += point.z;

        sums[centroid].items += 1; 

      }

      /** Re-calculate the center of the centroid. */

      for (i = 0; i < this.k; ++i) {
        if (sums[i].items > 0) {
          this.centroids[i].x = sums[i].x / sums[i].items;
          this.centroids[i].z = sums[i].z / sums[i].items;
        }
        this.centroids[i].items = sums[i].items;
      }

    };

    kmeans.prototype.initCentroids = function () {

      var i, k,cmp1, cmp2;

      var addIterator = function (x,y) { return x+y; };

      var reduce = function(t,c) {
          var u,v; 
          for (var i = (v=t[0],1); i < t.length;) v = c(v,t[i],i++,t); i<2 & u && u(); return v;};

      /**
       * When k-means++ is disabled, choose random centroids.
       */

      if (this.kmpp !== true) {
        this.chooseRandomCentroids();
        return;
      }

      /** K-Means++ initialization */

      /** determine the amount of tries */
      var D = [], ntries = 2 + Math.round(Math.log(this.k));

      /** 1. Choose one center uniformly at random from the data points. */

      var l = this.points.length;

      var p0 = this.points[ ~~(Math.random() * l) ];

      p0.centroid = 0;
      this.centroids = [ p0 ];

      /**
       * 2. For each data point x, compute D(x), the distance between x and
       * the nearest center that has already been chosen.
       */

      for (i = 0; i < l; ++i) {
        D[i] = Math.pow(this.distance(p0, this.points[i]), 2);
      }

      var Dsum = reduce(D, addIterator);
      // var Dsum = D.reduce(addIterator);

      /**
       * 3. Choose one new data point at random as a new center, using a
       * weighted probability distribution where a point x is chosen with
       * probability proportional to D(x)2.
       * (Repeated until k centers have been chosen.)
       */

      for (k = 1; k < this.k; ++k) {

        var bestDsum = -1, bestIdx = -1;

        for (i = 0; i < ntries; ++i) {
          var rndVal = ~~(Math.random() * Dsum);

          for (var n = 0; n < l; ++n) {
            if (rndVal <= D[n]) {
              break;
            } else {
              rndVal -= D[n];
            }
          }

          var tmpD = [];
          for (var m = 0; m < l; ++m) {
            cmp1 = D[m];
            cmp2 = Math.pow(this.distance(this.points[m],this.points[n]),2);
            tmpD[m] = cmp1 > cmp2 ? cmp2 : cmp1;
          }

          var tmpDsum = reduce(tmpD, addIterator);
          // var tmpDsum = tmpD.reduce(addIterator);

          if (bestDsum < 0 || tmpDsum < bestDsum) {
            bestDsum = tmpDsum; bestIdx = n;
          }
        }

        Dsum = bestDsum;

        var centroid = {
          x : this.points[bestIdx].x,
          z : this.points[bestIdx].z,
          centroid : k,
          items : 0
        };

        this.centroids.push(centroid);

        for (i = 0; i < l; ++i) {
          cmp1 = D[i];
          cmp2 = Math.pow(this.distance(this.points[bestIdx],this.points[i]), 2);
          D[i] = cmp1 > cmp2 ? cmp2 : cmp1;
        }
      }

    };

    return kmeans;

  })();

  /**
  * A graph memory structure used fo path finding
  * @param {Array} gridIn 2D array of input weights
  * @param {Object} [options]
  */

  H.AI.GraphNode = function (x, y, weight) {
    this.x = x;
    this.y = y;
    this.weight = weight;
    this.f = 0;
    this.g = 0;
    this.h = 0;
    this.index   = 0;
    this.visited = false;
    this.closed  = false;
    this.parent  = null;
  };
  H.AI.GraphNode.prototype = {
    constructor: H.AI.GraphNode,
    toString: function(){return H.format("[GraphNode %s %s]", this.x, this.y);},
  };

  H.AI.GraphFromFunction = function(grid, fnWeight){

    var
      graph = new H.AI.Graph(grid.data),
      node = null, y = 0, size = grid.size, x = size;

    while (x--) {
      graph.grid[x] = [];
      y = size; 
      while(y--) {
        node = new H.AI.GraphNode(x, y, fnWeight(x + y * size));
        graph.grid[x][y] = node;
        graph.nodes.push(node);
      }
    }
    // graph.clear();
    return graph;

  };


  H.AI.Graph = function (data, options) {

    options = options || {};
    
    this.size  = data.length; // only quadratic grids
    this.data  = data;
    this.nodes = [];
    this.grid  = [];

    // this.init();
    // this.clear();

  };

  H.AI.Graph.prototype = {
    constructor: H.AI.Graph,
    init: function() {
      var node = null, row = 0, y = 0, x = this.size;
      while (x--) {
        this.grid[x] = [];
        row = this.data[x];
        y = this.size; 
        while(y--) {
          node = new H.AI.GraphNode(x, y, row[y]);
          this.grid[x][y] = node;
          this.nodes.push(node);
        }
      }
      this.clear();
      return this;
    },
    clear: function() {
      var i, l = this.nodes.length, node;
      for (i=0; i<l; i++){
        node = this.nodes[i];
        node.f = 0;
        node.g = 0;
        node.h = 0;
        node.index   = 0;
        node.visited = false;
        node.closed  = false;
        node.parent  = null;
      }      
    },
    setNeighbors8: function(neighbors, node) {

      var x = node.x, y = node.y, grid = this.grid;

      neighbors[0] = grid[x-1][y];
      neighbors[1] = grid[x+1][y];
      neighbors[2] = grid[x][y-1];
      neighbors[3] = grid[x][y+1];

      neighbors[4] = grid[x-1][y-1];
      neighbors[5] = grid[x+1][y-1];
      neighbors[6] = grid[x-1][y+1];
      neighbors[7] = grid[x+1][y+1];

    },
    setNeighbors4: function(neighbors, node) {

      var x = node.x, y = node.y, grid = this.grid;

      neighbors[0] = grid[x-1][y];
      neighbors[1] = grid[x+1][y];
      neighbors[2] = grid[x][y-1];
      neighbors[3] = grid[x][y+1];

    }

  };

  function pathTo(node){
    var curr = node, path = [];
    while(curr.parent) {
      path.push(curr);
      curr = curr.parent;
    }
    return path.reverse();
  }

  // has hard coded pathfinder optimizations
  H.AI.BinaryHeap = function(){
    this.content = [];
    this.length  = 0;
  };
  
  H.AI.BinaryHeap.prototype = {
    constructor: H.AI.BinaryHeap,
    push: function(element) {
      element.index = this.length;               // is last
      this.content[this.length] = element;       // Add the new element to the end of the array.
      this.length += 1;                          // prep fo next
      this.sinkDown(element.index);              // Allow it to sink down.
    },
    pop: function() {

      var 
        content = this.content,
        result  = content[0],                    // Store the first element so we can return it later.
        end     = content[this.length -1];       // Get the element at the end of the array.

      // this.length -= 1;

      if (--this.length) {                       // If there are any elements left, 
        content[0] = end;                        // put the end element at the start, 
        this.bubbleUp(0);                        // and let it bubble up.
      }

      return result;

    },
    remove: function(node) {

      var 
        i = node.index,                  
        content = this.content,
        end = content[this.length -1];           // When it is found, the process seen in 'pop' is repeated to fill up the hole.

      this.length -= 1;

      if (i !== this.length - 1) {
        content[i] = end;
        if (end.f < node.f) {
          this.sinkDown(i);
        } else {
          this.bubbleUp(i);
        }
      }

    },
    sinkDown: function(n) {

      var 
        content = this.content,
        element = content[n],                    // Fetch the element that has to be sunk.
        parentN = 0, parent = null;

      while (n) {                                // When at 0, an element can not sink any further.

        parentN = ((n + 1) >> 1) - 1;            // Compute the parent element's index, and fetch it.
        parent  = content[parentN];
        
        if (element.f < parent.f) {

          content[parentN] = element;            // Swap the elements if the parent is greater.
          content[n] = parent;

          element.index = parentN;          
          parent.index  = n;                 

          n = parentN;                           // Update 'n' to continue at the new position.

        } else { break; }                        // Found a parent that is less, no need to sink any further.

      }

    },
    bubbleUp: function(n) {

      var 
        child2N, child1N, swap, child1Score,
        content   = this.content,
        length    = this.length,
        element   = content[n],
        elemScore = element.f;

      while(true) {

        swap = undefined;                             // This is used to store the new position of the element, if any.
        child1Score = undefined;

        child2N = (n + 1) << 1;                  // Compute the indices of the child elements.
        child1N = child2N - 1;

        if (child1N < length) {                  // If the first child exists (is inside the array)...          
          child1Score = content[child1N].f;
          swap = child1Score < elemScore ? child1N : swap;
        }
        
        if (child2N < length) {                  // Do the same checks for the other child.
          swap = content[child2N].f < (swap === undefined ? elemScore : child1Score) ? child2N : swap;
        }
        
        if (swap !== undefined) {                     // If the element needs to be moved, swap it, and continue.

          content[n] = content[swap];
          content[swap] = element;

          content[n].index = n;
          element.index = swap;

          n = swap;

        } else {break;}                          // Otherwise, we are done.

      }                     
    }
    
  };


  H.AI.AStar = {
    // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
    heuristics: {
      ignore: function() {
        return 1; // cost always 1, water, land straight, diagonal
      },
      manhattan: function(pos0, pos1) {
        return Math.abs(pos1.x - pos0.x) + Math.abs(pos1.y - pos0.y);
      },
      diagonal: function(pos0, pos1) {
        var D  = 1, D2 = 1.4142135623730951, //Math.sqrt(2);
            d1 = Math.abs(pos1.x - pos0.x),
            d2 = Math.abs(pos1.y - pos0.y);
        return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
      },
      square: function(pos0, pos1) {
        var dx = Math.abs(pos0.x - pos1.x),
            dy = Math.abs(pos0.y - pos1.y);
        return (dx * dx + dy * dy);
      },
      euclidian: function(pos0, pos1) {
        var dx = Math.abs(pos0.x - pos1.x),
            dy = Math.abs(pos0.y - pos1.y);
        return Math.sqrt(dx * dx + dy * dy);
      }
    },

    /**
    * Perform an A* Search on a graph given a start and end node.
    * @param {Graph} graph
    * @param {GridNode} start
    * @param {GridNode} end
    * @param {Object} [options]
    * @param {bool} [options.closest] Specifies whether to return the
               path to the closest node if the target is unreachable.
    * @param {Function} [options.heuristic] Heuristic function (see
    *          astar.heuristics).
    */
    search: function(graph, start, end, options) {

      options = options || {};

      var 
        i, currentNode, neighbor, gScore, beenVisited,
        openHeap    = new H.AI.BinaryHeap(),
        heuristic   = options.heuristic || H.AI.AStar.heuristics.manhattan,
        closest     = options.closest || false,
        closestNode = start,
        visited     = [], 
        keepVisited = options.keepVisited || false,
        tweak       = options.algotweak || 3,
        neighbors   = [null, null, null, null, null, null, null, null];

      function neighborCost(node, neighbor){

        var length = (node.x !== neighbor.x && node.y !== neighbor.y ? 
          1.4142135623730951 : 1 
          // 1.01 : 1 
        );

        return (
          tweak === 1 ? 1                                     : 
          tweak === 2 ? length                                : 
          tweak === 3 ? length * neighbor.weight              :
          tweak === 4 ? (length -0.01) * neighbor.weight      :
          tweak === 5 ? (length -0.1)  * neighbor.weight      :
          tweak === 6 ? (length -0.3)  * neighbor.weight      :
            3
        );

      }
        
      start.h = heuristic(start, end);

      openHeap.push(start);

      while(openHeap.length) {
        
        currentNode = openHeap.pop();            // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
        if (keepVisited) {                       // visual debug
          visited.push(currentNode);
        }               

        // End case -- result has been found, return the traced path.

        if(currentNode === end) {                
          return {path: pathTo(currentNode), success: true, nodes: visited};
        }
        
        currentNode.closed = true;                    // Normal case -- move currentNode from open to closed, process each of its neighbors.
        graph.setNeighbors8(neighbors, currentNode);   // Find all neighbors for the current node.

        for (i = 0; i < 8; i++) {

          neighbor = neighbors[i];

          // if not a valid node to process, skip to next neighbor.

          if (neighbor.closed || neighbor.weight === 0) {continue;}

          // The g score is the shortest distance from start to current node.
          // We need to check if the path we have arrived at this neighbor 
          // is the shortest one we have seen yet.

          gScore = currentNode.g + neighborCost(currentNode, neighbor);

          beenVisited = neighbor.visited;

          if (!beenVisited || gScore < neighbor.g) {

            // Found an optimal (so far) path to this node.  
            // Take score for node to see how good it is.

            neighbor.visited = true;
            neighbor.parent = currentNode;
            neighbor.h = neighbor.h || heuristic(neighbor, end);
            neighbor.g = gScore;
            neighbor.f = neighbor.g + neighbor.h;

            // If the neighbour is closer than the current closestNode or 
            // if it's equally close but has a cheaper path than the current closest node 
            // then it becomes the closest node
            
            if (closest) {
              if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
                closestNode = neighbor;
              }
            }

            // Pushing to heap will put it in proper place based on the 'f' value.
            if (!beenVisited) {
              openHeap.push(neighbor);

            // Already seen the node, but since it has been rescored we need to reorder it in the heap
            } else {
              openHeap.sinkDown(neighbor.index);

            }

          }

        }
      }

      return ( closest ? 
        {path: pathTo(closestNode), success: false, nodes: visited} :
        {path: [], success: false, nodes: visited}
      );

    }

  };

  /*
    Takes the terrain + regions + start coords to return a int field
    with each coord pointing to start along the terrain

  */

  H.AI.FlowField = {

    create: function(terrain, x, z, fnGraphInit){

      // creates flow field to the point in coords
      // for region around point using terrain

      var 
        size  = terrain.size,
        field = new Uint8Array(terrain.length),
        graph = new H.AI.GraphFromFunction(terrain, fnGraphInit);

      H.AI.FlowField.calcDistances(graph, x, z);
      H.AI.FlowField.calcField(graph.grid, field, size);

      return field;

    },
    calcDistances: function(graph, x, z){

      var 
        i, currentNode, neighbor, distance, 
        SQRT2   = Math.sqrt(2),
        openlist  = [], 
        neighbors = [null, null, null, null, null, null, null, null],
        grid = graph.grid;

      // first entry
      openlist.push(grid[x][z]);

      while (openlist.length){

        // FIFO
        currentNode = openlist.shift();
        currentNode.closed = true;         

        // x = currentNode.x;           
        // z = currentNode.y;          

        graph.setNeighbors8(neighbors, currentNode);

        // H.deb("%s %s %s", x, z, uneval(neighbors.map(n => ({x: n.x, y: n.y}) ) ) ); 

        for (i = 0; i < 8; i++) {

          neighbor = neighbors[i];

          // if (neighbor.closed || neighbor.weight === 0 || neighbor.visited) {continue;}
          if (!neighbor || neighbor.closed || neighbor.weight === 0 || neighbor.visited) {continue;}

          distance = (
            currentNode.x === neighbor.x ? 1 :
            currentNode.y === neighbor.y ? 1 :
              SQRT2
          );

          neighbor.f = currentNode.f + distance;
          neighbor.visited = true;
          openlist.push(neighbor);

        }

      }

    },

    calcField: function(grid, field, size){

      var 
        x, z, dx, dz, diff,
        maxdiff = Math.sqrt(2) * 2,
        INTRAD  = 128 / Math.PI;

      for (x=0; x<size; x++){
        for (z=0; z<size; z++){

          // horizontal 
          if (x === 0 || x === size -1){
            dx = 0;
          } else {
            diff = grid[x+1][z].f - grid[x-1][z].f;
            dx = (
              diff >  maxdiff ? -maxdiff :
              diff < -maxdiff ? +maxdiff :
                diff
            );
          }

          // vertical 
          if (z === 0 || z === size -1){
            dz = 0;
          } else {
            diff = grid[x][z+1].f - grid[x][z-1].f;
            dz = (
              diff >  maxdiff ? -maxdiff :
              diff < -maxdiff ? +maxdiff :
                diff
            );
          }

          field[x + size * z] = ~~(Math.atan2(dz, dx) * INTRAD) + 128;

        }
      }

      return field;

    },

  };

return H; }(HANNIBAL));
