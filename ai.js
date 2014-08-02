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

  V: 0.1, agentx, CGN, JUl, 2014

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

  /**
  * A graph memory structure
  * @param {Array} gridIn 2D array of input weights
  * @param {Object} [options]
  */
  H.AI.Graph = function Graph(data, options) {

    options = options || {};
    
    this.size  = data.length; // only quadratic grids
    this.data  = data;
    this.nodes = [];
    this.grid  = [];

    this.init();
    this.clear();

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
          node = new GridNode(x, y, row[y]);
          this.grid[x][y] = node;
          this.nodes.push(node);
        }
      }
    },
    clear: function() {
      var i = this.nodes.length, node;
      while (i--) {
        node = this.nodes[i];
        node.f = 0;
        node.g = 0;
        node.h = 0;
        node.visited = false;
        node.closed  = false;
        node.parent  = null;
      }      
    },
    setNeighbors: function(neighbors, node) {

      var 
        x = node.x,
        y = node.y,
        Z = this.size,
        grid = this.grid;

      neighbors[0] = (x - 1 >= 0) ? grid[x-1][y] : null;
      neighbors[1] = (x + 1 >= 0) ? grid[x+1][y] : null;
      neighbors[2] = (y - 1 >= 0) ? grid[x][y-1] : null;
      neighbors[3] = (y + 1 >= 0) ? grid[x][y+1] : null;

      neighbors[4] = (y - 1 >= 0 && x - 1 >= 0) ? grid[x-1][y-1] : null;
      neighbors[5] = (y + 1 <= Z && x - 1 >= 0) ? grid[x+1][y-1] : null;
      neighbors[6] = (y - 1 >= 0 && x + 1 <= Z) ? grid[x-1][y+1] : null;
      neighbors[7] = (y + 1 <= Z && x + 1 <= Z) ? grid[x+1][y+1] : null;

    },
    neighborsX: function(node) {

      var 
        ret = [],
        x = node.x,
        y = node.y,
        Z = this.size,
        grid = this.grid;

      if (x - 1 >= 0) {ret.push(grid[x-1][y]);} // West
      if (x + 1 <= Z) {ret.push(grid[x+1][y]);} // East
      if (y - 1 >= 0) {ret.push(grid[x][y-1]);} // South
      if (y + 1 <= Z) {ret.push(grid[x][y+1]);} // North

      if (y - 1 >= 0 && x - 1 >= 0) {ret.push(grid[x-1][y-1]);} // 
      if (y + 1 <= Z && x - 1 >= 0) {ret.push(grid[x+1][y-1]);} // 
      if (y - 1 >= 0 && x + 1 <= Z) {ret.push(grid[x-1][y+1]);} // 
      if (y + 1 <= Z && x + 1 <= Z) {ret.push(grid[x+1][y+1]);} // 

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

  function GridNode(x, y, weight) {
    this.x = x;
    this.y = y;
    this.weight = weight;
  }

  function pathTo(node){
    var curr = node, path = [];
    while(curr.parent) {
      path.push(curr);
      curr = curr.parent;
    }
    return path.reverse();
  }


  // GridNode.prototype.toString = function() { return "[" + this.x + " " + this.y + "]";};
  // GridNode.prototype.getCost = function(neighbor, heuristic) { 

  //   return heuristic(this, neighbor) * this.weight - 0.01;

  //   // return (this.x !== neighbor.x && this.y !== neighbor.y ? 
  //   //   // this.weight : //* 1.4142135623730951 : 
  //   //   // this.weight * 1.4142135623730951 : 
  //   //   this.weight : 
  //   //   this.weight
  //   // );

  // };
  // GridNode.prototype.isWall = function() { return this.weight === 0;};


  function BinaryHeap(){
    this.content = [];
  }
  
  BinaryHeap.prototype = {
    constructor: BinaryHeap,
    size: function() {return this.content.length;},
    rescoreElement: function(node) {
      this.sinkDown(this.content.indexOf(node));
    },
    push: function(element) {
      this.content.push(element);                // Add the new element to the end of the array.
      this.sinkDown(this.content.length - 1);    // Allow it to sink down.
    },
    pop: function() {

      var 
        content = this.content,
        result  = content[0],              // Store the first element so we can return it later.
        end     = content.pop();              // Get the element at the end of the array.

      if (content.length) {                 // If there are any elements left, put the end element 
        content[0] = end;                   // at the start, and let it bubble up.
        this.bubbleUp(0);
      }

      return result;

    },
    remove: function(node) {

      var 
        content = this.content,
        i = content.indexOf(node),
        end = content.pop();             // When it is found, the process seen in 'pop' is repeated to fill up the hole.

      if (i !== content.length - 1) {
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
        element = content[n],               // Fetch the element that has to be sunk.
        parentN = 0, parent = null;

      while (n) {                           // When at 0, an element can not sink any further.
        parentN = ((n + 1) >> 1) - 1;       // Compute the parent element's index, and fetch it.
        parent  = content[parentN];
        if (element.f < parent.f) {
          content[parentN] = element;       // Swap the elements if the parent is greater.
          content[n] = parent;
          n = parentN;                      // Update 'n' to continue at the new position.
        } else { break; }                   // Found a parent that is less, no need to sink any further.
      }

    },
    bubbleUp: function(n) {
      // Look up the target element and its score.
      var 
        content   = this.content,
        length    = content.length,
        element   = content[n],
        elemScore = element.f,
        child2N, child1N, swap, child1Score;

      while(true) {

        swap = null;                             // This is used to store the new position of the element, if any.
        child1Score = undefined;

        child2N = (n + 1) << 1;                  // Compute the indices of the child elements.
        child1N = child2N - 1;

        if (child1N < length) {                  // If the first child exists (is inside the array)...          
          child1Score = content[child1N].f;
          swap = child1Score < elemScore ? child1N : swap;
        }
        
        if (child2N < length) {                  // Do the same checks for the other child.
          swap = content[child2N].f < (swap === null ? elemScore : child1Score) ? child2N : swap;
        }
        
        if (swap !== null) {                     // If the element needs to be moved, swap it, and continue.
          content[n] = content[swap];
          content[swap] = element;
          n = swap;

        } else {break;}                          // Otherwise, we are done.

      }                     
    }
    
  };


  H.AI.AStar = {
    // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
    heuristics: {
      ignore: function() {
        // return 1.4142135623730951;
        return 1;
      },
      manhattan: function(pos0, pos1) {
        // var d1 = Math.abs(pos1.x - pos0.x),
        //     d2 = Math.abs(pos1.y - pos0.y);
        // return d1 + d2;
        return Math.abs(pos1.x - pos0.x) + Math.abs(pos1.y - pos0.y);
      },
      diagonal: function(pos0, pos1) {
        var D  = 1,
            D2 = 1.4142135623730951, //Math.sqrt(2);
            d1 = Math.abs(pos1.x - pos0.x),
            d2 = Math.abs(pos1.y - pos0.y);
        return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
      },
      square: function(pos0, pos1) {
        var D = 1, 
            dx = Math.abs(pos0.x - pos1.x),
            dy = Math.abs(pos0.y - pos1.y);
        return D * (dx * dx + dy * dy);
      },
      euclidian: function(pos0, pos1) {
        var D = 1, 
            dx = Math.abs(pos0.x - pos1.x),
            dy = Math.abs(pos0.y - pos1.y);
        return D * Math.sqrt(dx * dx + dy * dy);
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
        openHeap    = new BinaryHeap(),
        heuristic   = options.heuristic || H.AI.AStar.heuristics.manhattan,
        closest     = options.closest || false,
        closestNode = start,
        visited     = [], 
        tweak       = options.algotweak || 3,
        neighbors   = [null, null, null, null, null, null, null, null],
        currentNode, neighbor, i, il, gScore, beenVisited;

      function cost(node, neighbor){

        var length = (node.x !== neighbor.x && node.y !== neighbor.y ? 
          1.4142135623730951 : 1 
        );

        return (
          tweak === 1 ? 1                                     : 
          tweak === 2 ? length                                : 
          tweak === 3 ? length * neighbor.weight              :
          tweak === 4 ? (length -0.01) * neighbor.weight      :
          tweak === 5 ? (length -0.1)  * neighbor.weight      :
            3
        );

      }
        
      start.h = heuristic(start, end);

      openHeap.push(start);

      while(openHeap.content.length) {
        
        currentNode = openHeap.pop();            // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
        visited.push(currentNode);               // debug

        if(currentNode === end) {                // End case -- result has been found, return the traced path.
          return {path: pathTo(currentNode), success: true, nodes: visited};
        }
        
        currentNode.closed = true;                    // Normal case -- move currentNode from open to closed, process each of its neighbors.
        graph.setNeighbors(neighbors, currentNode);   // Find all neighbors for the current node.

        // for (i = 0, il = neighbors.length; i < il; ++i) {
        for (i = 0; i < 8; i++) {

          neighbor = neighbors[i];

          // if not a valid node to process, skip to next neighbor.
          // if (neighbor.closed || neighbor.isWall()) {continue;}

          if (!neighbor || neighbor.closed || neighbor.weight === 0) {continue;}

          // The g score is the shortest distance from start to current node.
          // We need to check if the path we have arrived at this neighbor 
          // is the shortest one we have seen yet.

          gScore = currentNode.g + cost(currentNode, neighbor);

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
              openHeap.rescoreElement(neighbor);

            }

          }

        }
      }

      return (
        closest ? {path: pathTo(closestNode), success: false, nodes: visited} :
          {path: [], success: false, nodes: visited}
      );

      // // return pathTo(closestNode);
      // if (closest) { return {path: pathTo(closestNode), nodes: visited}; }

      // // No result was found - empty array signifies failure to find path.
      // // return [];
      // return {path: [], nodes: visited};  

    }

  };

  H.Math = {

    /**
     * http://stackoverflow.com/questions/10962379/how-to-check-intersection-between-2-rotated-rectangles/12414951#12414951
     * Helper function to determine whether there is an intersection between the two polygons described
     * by the lists of vertices. Uses the Separating Axis Theorem
     *
     * @param a an array of connected points [{x:, y:}, {x:, y:},...] that form a closed polygon
     * @param b an array of connected points [{x:, y:}, {x:, y:},...] that form a closed polygon
     * @return true if there is any intersection between the 2 polygons, false otherwise
     */

    doPolygonsIntersect: function (a, b) {

      var 
        polygons = [a, b],
        aLen = a.length, bLen = b.length, pLen, 
        minA, maxA, projected, i, i1, j, minB, maxB,
        polygon, i2, p1, p2, normX, normY; //normal;

      for (i = 0; i < polygons.length; i++) {

        // for each polygon, look at each edge of the polygon, 
        // and determine if it separates the two shapes

        polygon = polygons[i];
        pLen = polygon.length;

        for (i1 = 0; i1 < pLen; i1++) {

          // grab 2 vertices to create an edge

          i2 = (i1 + 1) % pLen;
          p1 = polygon[i1];
          p2 = polygon[i2];

          // find the line perpendicular to this edge
          normX = p2.y - p1.y;
          normY = p1.x - p2.x;

          minA = maxA = undefined;

          // for each vertex in the first shape, project it onto the line perpendicular to the edge
          // and keep track of the min and max of these values
          
          for (j = 0; j < aLen; j++) {

            projected = normX * a[j].x + normY * a[j].y;

            minA = (minA === undefined || projected < minA) ? projected : minA;
            maxA = (maxA === undefined || projected > maxA) ? projected : maxA;

          }

          minB = maxB = undefined;

          // for each vertex in the second shape, project it onto the line perpendicular to the edge
          // and keep track of the min and max of these values

          for (j = 0; j < bLen; j++) {

            projected = normX * b[j].x + normY * b[j].y;

            minB = (minB === undefined || projected < minB) ? projected : minB;
            maxB = (maxB === undefined || projected > maxB) ? projected : maxB;

          }

          // if there is no overlap between the projects, the edge we are looking at separates the two
          // polygons, and we know there is no overlap
          if (maxA < minB || maxB < minA) {
            return false;
          }

        }
      }

      return true;

    }

  };



return H; }(HANNIBAL));


