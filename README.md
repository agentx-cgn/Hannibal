# Hannibal #

## An AI/Bot for 0 A.D. ##

### Intro ###

Hannibal is a new approach to reduce the complexity of programming a bot for 0 A.D., a free, open-source, cross-platform real-time strategy game under development by Wildfire Games. Hannibal tackles the complexity of an RTS with hundreds of units by organizing them into a society of autonomous groups, each with its specific task. 

### Blog ###

Read development notes at [agentx.svbtle.com](http://agentx.svbtle.com/)

### Features ###

* A **triple store** to interfere features of cultures, like  
  who can gather fields, can a healer melee? 

* A **query language** to retrieve information as a set of nodes from the triple store  
  "food.grain GATHEREDBY WITH costs.metal = 0, costs.stone = 0, costs.wood = 0 SORT < costs.food" 

* A **group system** describing the behavior of groups of units  
  (grain-picker, hunter, warrior, guerrilla, miner, etc) 

* A **domain specific language** called group script, based on JavaScript 
  method and property chaining to define a fluenent interface and decribe 
  the behaviour of groups in a near natural language 

* An **economy model** with an order queue, a cost analyzer and  
  a statistic module providing metrics based on resource flows with trends and forecast. 

* A **HTN PLanner** to calculate economic development, advancing to next phase 
  and planning attack strategies

* **Map Analysis &amp; Pathfinder** for intelligent and adequate game play
  
### Try Out ###

**Prerequisites**

* Check [game paths](http://trac.wildfiregames.com/wiki/GameDataPaths) for your system 
* Locate folder \binaries\data\mods\ within 0 A.D. installation
* Copy the zip + readme from latest [release](https://github.com/agentx-cgn/Hannibal/releases) into mods/

**Play**

* Start 0 A.D., 
* Open mod selection and activate Hannibal
* Select single player/new game, and choose Hannibal as bot
* Choose a difficulty from the settings dialog

**Test &amp; Developemt**

* Start 0 A.D. with params: -quickstart -autostart=aitest03 -autostart-ai=1:hannibal
* Customize launcher.py and launch 0 A.D. from commadline (Linux only)

**HTML Data Explorer**

* [Web Interface](http://noiv.pythonanywhere.com/agentx/0ad/explorer/hannibal.html)

### Testing ###

Hannibal extensively logs against standard output until switched off in config.js. On Windows best seen using [DebugView](http://technet.microsoft.com/en-us/sysinternals/bb896647.aspx) with option carriage returns unforced.

### Progress ###

* The [web interface](http://noiv.pythonanywhere.com/agentx/0ad/explorer/hannibal.html) aka explorer generates basic plans
* Added data browsing to explorer

### Roadmap ###

**A18**

* Saved games, given engine support ([cancelled](http://trac.wildfiregames.com/ticket/2495#comment:15), for the time beeing)
* Shared, dynamic and exclusive buildings
* Plan based economy, taking resource availability into account
* Advanced map analysis
* Fortified cities (towers, walls?) 
* Take advantage of all available technologies 
* Basic attack plans and execution

**A19**

* Walls, palisades
* Advanced attack plans
* Policies via SWOT analysis

**A20**

* Seafaring, naval operation

### Technology ###

* SpiderMonkey 29/31
* Javascript 1.85 + partially ES6
* FF30+

### Useful Ingame Hotkeys ###

* F11:        Enable/disable real-time profiler (toggles through the displays of information)
* F12:        Show time elapsed since the beginning of the game
* F2:         Take screenshot (in .png format, location is displayed in the top left of the GUI
* Alt + F:    Show/hide frame counter (FPS)
* Alt + K:    Show the 0 A.D. logo and copyright notice as a watermark for images.
* Alt + G:    Hide/show the GUI
* Alt + D:    Show/hide developer overlay (with developer options)
* Space:      If timewarp mode enabled (in the developer overlay), speed up the game
* Backspace:  If timewarp mode enabled (in the developer overlay), go back to an earlier point in the game
* More:       http://trac.wildfiregames.com/wiki/HotKeys

### Project Links ###

* [Data Explorer](http://noiv.pythonanywhere.com/agentx/0ad/explorer/hannibal.html)
* [Hannibal @ Trac](http://trac.wildfiregames.com/wiki/HannibalBot)
  

### Videos ###

* [Playlist](https://www.youtube.com/playlist?list=PLX5qMUEZ8pAr9fTaVkGStzj1xWWvMHV2e)

* [![Demos grainpicker groups](https://i.ytimg.com/vi/i-bJwUk_obk/3.jpg)](http://www.youtube.com/watch?v=i-bJwUk_obk) Grainpicker groups

### Further Readings and Links ###

* [0 A.D. - Home](http://play0ad.com/)
* [0 A.D. - Wikipedia](http://en.wikipedia.org/wiki/0_A.D._%28video_game%29)
* [pyhop - Python Planner](https://bitbucket.org/dananau/pyhop)
* [SHOP - Algo](http://www.cs.umd.edu/projects/shop/)

### Literature ###

* [Artificial Intelligence: A Modern Approach](http://books.google.de/books?id=8jZBksh-bUMC)  
  Stuart Jonathan Russell, Peter Norvig

* [A review of computational intelligence in RTS games](http://www.lcc.uma.es/~ccottap/papers/lara13review.pdf)  
  Raul Lara-Cabrera, Carlos Cotta, Antonio J. Fernandez-Leiva

* [Planning with Hierarchical Task Networks in Video Games](http://icaps07-satellite.icaps-conference.org/workshop8/Planning%20with%20Hierarchical%20Task%20Networks%20in%20Video%20Games.pdf)  
  John-Paul Kelly, Adi Botea, Sven Koenig

* [A HTN Planner For A Real-Time Strategy Game](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.406.8722&rep=rep1&type=pdf)  
  Jasper Laagland
  
* [Wall Building in RTS Games](www.cse.lehigh.edu/~munoz/CSE497/classes/Patrick2.ppt‎)  
  Patrick Schmid

## License ##

tbd

<!--

# Documentation #


## Scouting ##

territory min: 0, max: 66, stats: {0:60261,65:2624,66:2651}
landPass min: 1, max: 8, stats: {1:17833,2:47575,4:9,5:6,6:2,7:1,8:110}
navalPass min: 1, max: 3, stats: {1:65050,3:486}

unknown           = 0
land, seen        = 1
land, visited     = 2
shore, seen       = 4
shore, visited    = 8
water, visited    = 32
water, seen       = 64
impassable        = 255


## Asset Interface ##
  
* users:          connected groups, an array of listeners
* isFoundation:   bool
* isStructure:    bool
* isRequested:    bool
* exists:         bool, is an game
* match:          bool, expects resource
* health:         returns percentage (hits/maxhits)
* nearest:        returns asset selection, expects number
* doing:          returns asset selection, expects state list 
* garrison:       buildings only, expects asset selection of units
* repair:         units only, expects asset with single building
* gather:         units only, expects asset with single field
* states:         object {id:state, ...} asset 
                    idle
                    gathering
                    approaching
                    repairing
                    garrisoned
                    attacking
                    fleeing

-->                  