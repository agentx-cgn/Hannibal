# Hannibal #

## An AI/Bot for 0 A.D. ##

### Intro ###

Hannibal is a new approach to reduce the complexity of programming a bot for 0 A.D., a free, open-source, cross-platform real-time strategy game under development by Wildfire Games. Development started in February 2014 by agentx. This git will be updated once a week until the project technically matured enough to support full git based development.

### Features ###

* a **state machine** to handle game phases, like  
  village, town, city, attack, defense, reconstruction, etc. 

* a **triple store** to interfere features of cultures, like  
  who can gather fields, can a healer melee? 

* a **simple query language** to retrieve information from the triple store  
  "food.grain GATHEREDBY WITH costs.metal = 0, costs.stone = 0, costs.wood = 0 SORT < costs.food" 

* a **plugin system** describing the behavior of groups of units  
  (grain-picker, hunter, warrior, guerrilla, miner, etc) 

* a **domain specific language** used for the plugins  
  to allow non programmer to define a group's behavior 

* an **economy model** with an order queue, a cost analyzer and  
  a simple statistic module providing metrics based on resource flows. 

* a **HTN PLanner** to calculate economic development and  
    attack strategies
  
### Try Out ###

**Prerequisites**

* Locate \binaries\data\mods\public\ folder within 0 A.D. installation
* Create \simulation\ai\hannibal within \public
* Extract [all files](https://github.com/noiv/Hannibal/archive/master.zip) into \hannibal keeping directory structure intact

**Play**

* Start 0 A.D., select single player new game, select Hannibal as bot

**Test**

* Copy the maps to your [map folder](http://trac.wildfiregames.com/wiki/GameDataPaths)
* start 0 A.D. with params: -quickstart -autostart=aitest03 -autostart-ai=1:hannibal

**HTML Data Explorer**

* [Web Interface](http://noiv.pythonanywhere.com/agentx/0ad/explorer/hannibal.html)

### Testing ###

Hannibal extensively logs against standard output until switched off in config.js. On Windows best seen using [DebugView](http://technet.microsoft.com/en-us/sysinternals/bb896647.aspx) with option carriage returns unforced.

### Progress ###

* The [web interface](http://noiv.pythonanywhere.com/agentx/0ad/explorer/hannibal.html) aka explorer generates basic plans
* Added data browsing to explorer

### Roadmap ###

**A17**

* Saved games, given engine support ([cancelled](http://trac.wildfiregames.com/ticket/2495#comment:15), for the time beeing)
* Shared, dynamic and exclusive buildings
* plan based economy taking resource availability into account
* Advanced map analysis
* Fortified cities (towers, walls?) 
* Take advantage of all available technologies 
* Basic attack plans and execution

**A18**

* Walls, palisades
* Advanced attack plans
* Policies via SWOT analysis

**A19**

* Seafaring, naval operation

### Technology ###

* SpiderMonkey 29
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


