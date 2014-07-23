/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals HANNIBAL, deb, uneval */

/*---------------  A I --------------------------------------------------------

  traditional AI methods, adjusted for speed, SpiderMonkey and ES6

  KMeans      : Credit: https://github.com/cmtt/kmeans-js, 
                License: MIT
  A*          : Credit: https://github.com/bgrins/javascript-astar
                License: https://raw.githubusercontent.com/bgrins/javascript-astar/master/LICENSE
  Binary Heap : Marijn Haverbeke, Credit: http://eloquentjavascript.net/appendix2.html
                License: http://creativecommons.org/licenses/by/3.0/

  V: 0.1, agentx, CGN, Feb, 2014

*/


HANNIBAL = (function(H){

  H.AI = H.AI || {};

  H.AI.KMeans = (function () {

    var reduce = function(t,c) {
        var u,v; 
        for (var i = (v=t[0],1); i < t.length;) v = c(v,t[i],i++,t); i<2 & u && u(); return v;};

    /** Constructor */

    var kmeans = function () {
      this.kmpp = true;
      this.maxWidth = 640;
      this.maxHeight = 480;
      this.iterations = 0;
      this.converged = false;
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

      var i, l = this.points.length, sums = [], 
          distances, centroid, point,
          sortByDistance = function(a, b){
            var da = (a.x - point.x) * (a.x - point.x) + (a.z - point.z) * (a.z - point.z),
                db = (b.x - point.x) * (b.x - point.x) + (b.z - point.z) * (b.z - point.z);
            return da - db;
          };

      /** When the result doesn't change anymore, the final result has been found. */

      // if (this.converged === true) {
      //   return;
      // }

      // this.converged = true;
      // this.iterations += 1;

      /** Prepares the array of the  */

      for (i = 0; i < this.k; ++i) {
        sums[i] = { x : 0, z : 0, items : 0 };
      }

      /** Find the closest centroid for each point */

      for (i = 0; i < l; ++i) {

        point = this.points[i];
        distances = this.centroids.sort(sortByDistance);
        centroid = distances[0].centroid;

        /**
         * When the point is not attached to a centroid or the point was
         * attached to some other centroid before, the result differs from the
         * previous iteration.
         */

        this.converged = (
          point.centroid !== centroid || typeof point.centroid !== 'number' ? 
          false : this.converged
        );

        // if (this.converged) {
        //   if (typeof point.centroid  !== 'number' || point.centroid !== centroid) {
        //     this.converged = false;
        //   }
        // }

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

  function pathTo(node){
    var curr = node, path = [];
    while(curr.parent) {
      path.push(curr);
      curr = curr.parent;
    }
    return path.reverse();
  }

  /**
  * A graph memory structure
  * @param {Array} gridIn 2D array of input weights
  * @param {Object} [options]
  * @param {bool} [options.diagonal] Specifies whether diagonal moves are allowed
  */
  H.AI.Graph = function Graph(grid, options) {

    var x, y, row, lenRow, node,
        lenGrid = grid.length;

    options = options || {};
    this.nodes = [];
    this.diagonal = !!options.diagonal;
    this.grid = [];

    for (x = 0; x < lenGrid; x++) {
      this.grid[x] = [];
      row = grid[x];
      lenRow = row.length;
      for (y = 0; y < lenRow; y++) {
        node = new GridNode(x, y, row[y]);
        this.grid[x][y] = node;
        this.nodes.push(node);
      }
    }

  }

  H.AI.Graph.prototype = {
    constructor: H.AI.Graph,
    neighbors: function(node) {
      var ret = [],
          x = node.x,
          y = node.y,
          grid = this.grid;

      // West
      if(grid[x-1] && grid[x-1][y]) {
          ret.push(grid[x-1][y]);
      }

      // East
      if(grid[x+1] && grid[x+1][y]) {
          ret.push(grid[x+1][y]);
      }

      // South
      if(grid[x] && grid[x][y-1]) {
          ret.push(grid[x][y-1]);
      }

      // North
      if(grid[x] && grid[x][y+1]) {
          ret.push(grid[x][y+1]);
      }

      if (this.diagonal) {
          // Southwest
          if(grid[x-1] && grid[x-1][y-1]) {
              ret.push(grid[x-1][y-1]);
          }

          // Southeast
          if(grid[x+1] && grid[x+1][y-1]) {
              ret.push(grid[x+1][y-1]);
          }

          // Northwest
          if(grid[x-1] && grid[x-1][y+1]) {
              ret.push(grid[x-1][y+1]);
          }

          // Northeast
          if(grid[x+1] && grid[x+1][y+1]) {
              ret.push(grid[x+1][y+1]);
          }
      }

      return ret;
    },
    toString: function() {
      var graphString = [],
          nodes = this.grid, // when using grid
          rowDebug, row, y, l;
      for (var x = 0, len = nodes.length; x < len; x++) {
        rowDebug = [];
        row = nodes[x];
        for (y = 0, l = row.length; y < l; y++) {
          rowDebug.push(row[y].weight);
        }
        graphString.push(rowDebug.join(" "));
      }
      return graphString.join("\n");
    },

  };


  // Graph.prototype.neighbors = function(node) {
  //     var ret = [],
  //         x = node.x,
  //         y = node.y,
  //         grid = this.grid;

  //     // West
  //     if(grid[x-1] && grid[x-1][y]) {
  //         ret.push(grid[x-1][y]);
  //     }

  //     // East
  //     if(grid[x+1] && grid[x+1][y]) {
  //         ret.push(grid[x+1][y]);
  //     }

  //     // South
  //     if(grid[x] && grid[x][y-1]) {
  //         ret.push(grid[x][y-1]);
  //     }

  //     // North
  //     if(grid[x] && grid[x][y+1]) {
  //         ret.push(grid[x][y+1]);
  //     }

  //     if (this.diagonal) {
  //         // Southwest
  //         if(grid[x-1] && grid[x-1][y-1]) {
  //             ret.push(grid[x-1][y-1]);
  //         }

  //         // Southeast
  //         if(grid[x+1] && grid[x+1][y-1]) {
  //             ret.push(grid[x+1][y-1]);
  //         }

  //         // Northwest
  //         if(grid[x-1] && grid[x-1][y+1]) {
  //             ret.push(grid[x-1][y+1]);
  //         }

  //         // Northeast
  //         if(grid[x+1] && grid[x+1][y+1]) {
  //             ret.push(grid[x+1][y+1]);
  //         }
  //     }

  //     return ret;
  // };

  // Graph.prototype.toString = function() {
  //     var graphString = [],
  //         nodes = this.grid, // when using grid
  //         rowDebug, row, y, l;
  //     for (var x = 0, len = nodes.length; x < len; x++) {
  //         rowDebug = [];
  //         row = nodes[x];
  //         for (y = 0, l = row.length; y < l; y++) {
  //             rowDebug.push(row[y].weight);
  //         }
  //         graphString.push(rowDebug.join(" "));
  //     }
  //     return graphString.join("\n");
  // };

  function GridNode(x, y, weight) {
      this.x = x;
      this.y = y;
      this.weight = weight;
  }

  GridNode.prototype.toString = function() {
      return "[" + this.x + " " + this.y + "]";
  };

  GridNode.prototype.getCost = function() {
      return this.weight;
  };

  GridNode.prototype.isWall = function() {
      return this.weight === 0;
  };

  function BinaryHeap(scoreFunction){
      this.content = [];
      this.scoreFunction = scoreFunction;
  }


  function getHeap() {
    return new BinaryHeap(function(node) {
      return node.f;
    });
  }
  
  BinaryHeap.prototype = {
    constructor: BinaryHeap,
    push: function(element) {
        // Add the new element to the end of the array.
        this.content.push(element);
        // Allow it to sink down.
        this.sinkDown(this.content.length - 1);
    },
    pop: function() {
      // Store the first element so we can return it later.
      var result = this.content[0],
      // Get the element at the end of the array.
          end = this.content.pop();
      // If there are any elements left, put the end element at the
      // start, and let it bubble up.
      if (this.content.length) {
        this.content[0] = end;
        this.bubbleUp(0);
      }
      return result;
    },
    remove: function(node) {
      var i = this.content.indexOf(node);

      // When it is found, the process seen in 'pop' is repeated
      // to fill up the hole.
      var end = this.content.pop();

      if (i !== this.content.length - 1) {
        this.content[i] = end;
        if (this.scoreFunction(end) < this.scoreFunction(node)) {
          this.sinkDown(i);
        } else {
          this.bubbleUp(i);
        }
      }
    },
    size: function() {return this.content.length;},
    rescoreElement: function(node) {this.sinkDown(this.content.indexOf(node));},
    sinkDown: function(n) {
      // Fetch the element that has to be sunk.
      var element = this.content[n],
          parentN, parent;

      // When at 0, an element can not sink any further.
      while (n) {
        // Compute the parent element's index, and fetch it.
        parentN = ((n + 1) >> 1) - 1,
        parent  = this.content[parentN];
        // Swap the elements if the parent is greater.
        if (this.scoreFunction(element) < this.scoreFunction(parent)) {
          this.content[parentN] = element;
          this.content[n] = parent;
          // Update 'n' to continue at the new position.
          n = parentN;
        } else {
          // Found a parent that is less, no need to sink any further.
          break;
        }
      }
    },
    bubbleUp: function(n) {
      // Look up the target element and its score.
      var length    = this.content.length,
          element   = this.content[n],
          elemScore = this.scoreFunction(element),
          child1, child2, child2N, child1N, swap,
          child1Score, child2Score;

      while(true) {
        // Compute the indices of the child elements.
        child2N = (n + 1) << 1;
        child1N = child2N - 1;
        // This is used to store the new position of the element, if any.
        swap = null;
        child1Score = undefined;

        // If the first child exists (is inside the array)...
        if (child1N < length) {
          // Look it up and compute its score.
          child1 = this.content[child1N];
          child1Score = this.scoreFunction(child1);
          // If the score is less than our element's, we need to swap.
          if (child1Score < elemScore){
            swap = child1N;
          }
        }

        // Do the same checks for the other child.
        if (child2N < length) {
          child2 = this.content[child2N];
          child2Score = this.scoreFunction(child2);
          if (child2Score < (swap === null ? elemScore : child1Score)) {
            swap = child2N;
          }
        }

        // If the element needs to be moved, swap it, and continue.
        if (swap !== null) {
          this.content[n] = this.content[swap];
          this.content[swap] = element;
          n = swap;

        // Otherwise, we are done.
        } else {break;}
      }
    }
  };


  H.AI.AStar = {
    // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
    heuristics: {
      manhattan: function(pos0, pos1) {
        var d1 = Math.abs(pos1.x - pos0.x);
        var d2 = Math.abs(pos1.y - pos0.y);
        return d1 + d2;
      },
      diagonal: function(pos0, pos1) {
        var D = 1;
        var D2 = Math.sqrt(2);
        var d1 = Math.abs(pos1.x - pos0.x);
        var d2 = Math.abs(pos1.y - pos0.y);
        return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
      }
    },
    init: function(graph) {
      var i, node, len;
      this.graph = graph;
      for (i = 0, len = graph.nodes.length; i < len; ++i) {
        node = graph.nodes[i];
        node.f = 0;
        node.g = 0;
        node.h = 0;
        node.visited = false;
        node.closed = false;
        node.parent = null;
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
    search: function(start, end, options) {

      // H.AI.AStar.init(graph);

      options = options || {};

      var 
        heuristic = options.heuristic || H.AI.AStar.heuristics.manhattan,
        openHeap = getHeap(),
        closest = options.closest || false,
        closestNode = start, // set the start node to be the closest if required
        graph = this.graph,
        currentNode, neighbors, neighbor, 
        i, il, gScore, beenVisited;
        
      start.h = heuristic(start, end);

      openHeap.push(start);

      while(openHeap.size() > 0) {

        // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
        currentNode = openHeap.pop();

        // End case -- result has been found, return the traced path.
        if(currentNode === end) {
          return pathTo(currentNode);
        }

        // Normal case -- move currentNode from open to closed, process each of its neighbors.
        currentNode.closed = true;

        // Find all neighbors for the current node.
        neighbors = graph.neighbors(currentNode);

        for (i = 0, il = neighbors.length; i < il; ++i) {

          neighbor = neighbors[i];

          // i fnot a valid node to process, skip to next neighbor.
          if (neighbor.closed || neighbor.isWall()) {continue;}

          // The g score is the shortest distance from start to current node.
          // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
          gScore = currentNode.g + neighbor.getCost(currentNode);
          beenVisited = neighbor.visited;

          if (!beenVisited || gScore < neighbor.g) {

            // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
            neighbor.visited = true;
            neighbor.parent = currentNode;
            neighbor.h = neighbor.h || heuristic(neighbor, end);
            neighbor.g = gScore;
            neighbor.f = neighbor.g + neighbor.h;

            // If the neighbour is closer than the current closestNode or if it's equally close but has
            // a cheaper path than the current closest node then it becomes the closest node
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
              openHeap.rescoreElement(neighbor);

            }

          }

        }
      }

      if (closest) {
        return pathTo(closestNode);
      }

      // No result was found - empty array signifies failure to find path.
      return [];

    }

  };


return H; }(HANNIBAL));


