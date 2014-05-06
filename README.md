# Hannibal #

## An AI/Bot for 0 A.D. ##

### Intro ###

Hannibal is a new approach to reduce the complexity of programming a bot for 0 A.D., a free, open-source, cross-platform real-time strategy game under development by Wildfire Games. Development started in February 2014 by agentx. This git will be updated once a week until the project technically matured enough to support full git based development.

### Features ###

* a **state machine** to handle game phases, like  
  village, town, city, attack, defense, reconstruction, etc. 

* a **triple store** to link features of the cultures, like  
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

* Copy the maps to the [map folder](http://trac.wildfiregames.com/wiki/GameDataPaths)
* start 0 A.D. with params: -quickstart -autostart=aitest03 -autostart-ai=1:hannibal

**HTML Explorer**

* Open \hannibal\explorer\hannibal.html

### Progress ###

* The [web interface](http://noiv.pythonanywhere.com/agentx/0ad/explorer/hannibal.html) generates basic plans

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

### Useful Hotkeys ### 

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

* [Web based development](http://noiv.pythonanywhere.com/agentx/0ad/explorer/hannibal.html)
  

### Videos ###

* [Playlist](https://www.youtube.com/playlist?list=PLX5qMUEZ8pAr9fTaVkGStzj1xWWvMHV2e)

* [![Demos grainpicker groups](https://i.ytimg.com/vi/i-bJwUk_obk/3.jpg)](http://www.youtube.com/watch?v=i-bJwUk_obk) Grainpicker groups

### Further Readings and Links ###

* 0 A.D. http://play0ad.com/
* 0 A.D. http://en.wikipedia.org/wiki/0_A.D._%28video_game%29
* pyhop https://bitbucket.org/dananau/pyhop
* SHOP http://www.cs.umd.edu/projects/shop/


## License ##

tbd


