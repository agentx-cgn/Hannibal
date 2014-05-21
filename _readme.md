




### map root ###

http://trac.wildfiregames.com/export/15148/ps/trunk/binaries/data/mods/public/maps/scenarios/





````js

// Call
  o.f.call(o, d, e, f)     // 15,702,342

// Call with null
  o.f.call(null, d, e, f)  // 15,399,460

// Direct
  o.f(d, e, f)             // 15,062,388

// Apply
  o.f.apply(o, [d, e, f])  //  3,401,670

// Apply predefined array
  o.f.apply(o, z)          //  4,197,047

// Direct with Spread 
  o.f(...z)                //    924,084

// Call with spread
  o.f.call(o, ...z)        //    627,680

// Direct with Spread II
  o.f(...[d, e, f])        //    660,252

// New Function
  o.ff(d, e, f)            // 15,902,228

````










# TODO #

structures.athen.field, structures.athen.dock WITH cost.population === 0


## browser ##

menu (asm, htn, tech)
run


http://stackoverflow.com/questions/2804543/read-subprocess-stdout-line-by-line
https://github.com/0ad/0ad/blob/master/binaries/system/readme.txt
https://gitorious.org/0ad/0ad/source/4d7d842b80163e90cb2333a67b154b4aa908b616:binaries/data/config/system.cfg

Sending keystrokes to Windows exe programs
https://mail.python.org/pipermail/python-list/2011-April/600957.html


### Happy Bots Ticket ###

Chatting

* Full communication between teams with bot members
* Synchronize attacks
* Resource sharing, tributes
* Diplomacy between bots

Monte Carlo

Good bots need a lot of testing with different maps. Also bots could learn fom experience, either by the developer adjusting or tweaking params or let a system generate plausible values from played games. 

In artificial intelligence, stochastic programs work by using probabilistic methods to solve problems, as in simulated annealing, stochastic neural networks, stochastic optimization, genetic algorithms, and genetic programming. A problem itself may be stochastic as well, as in planning under uncertainty.

* Unattended headless testing
* Writes log files/reports
* Basic Map Info to launch pre-written scipts
* Basic Player info [player names] for log header
* Works with Random Map Generator

The Brain

* ability to call async home
* inherit strains from the global gen pool
* exchange strategies in realtime
* live update of bots
* detecting strong/weak players
* opt-in for players/host


## Groups ##

### Grain-picker ###
  onLaunch   : units, field, dropsite, cc, refuge
  onAssign   :
  onAttack   : garrison
  onInterval : update to infantry in city
  comments   : check mobile dropsites

### Forager ###
  onLaunch   : 2 units, dropsite, refuge, cc, location circle, range
  onAssign   : search pattern
  onAttack   : report
  onInterval : if idle, move next, if not picking, if complete dissolve
  comments   : check mobile dropsites

### House Builder ###
  onLaunch   : units per civ, female, refuge, cc, south of cc
  onAssign   : 
  onAttack   :
  onInterval : if popcap < popmax build
  builds     : Houses, Support, Walls, Towers

### Treelogger ###
  onLaunch   :
  onAssign   :
  onAttack   :
  onInterval :
    find resources
    order dropsite
    check mobile dropsites
    order towers on attack
  comments   : check mobile dropsites


### Miner ###
  onLaunch   :
  onAssign   :
  onAttack   :
  onInterval :
    find resources
    order dropsite
    check mobile dropsites
    order towers
    order cc

### Hunter ###
  onLaunch   : circle around cc, search pattern
  onAssign   : start seach
  onAttack   : report
  onInterval : find resource, report metal, stone, wood, pattern complete dissolve

### Scouts ###
  onLaunch   :
  onAssign   :
  onAttack   :
  onInterval :


### MAP ###

LongName: Tiny
  Tiles: 128
LongName: Small (2 players)
  Tiles: 192
LongName: Medium (3 players)
  Tiles: 256, Default: true
LongName: Normal (4 players)
  Tiles: 320
LongName: Large (6 players)
  Tiles: 384
LongName: Very Large (8 players)
  Tiles: 448
LongName: Giant
  Tiles: 512


## fun with planning ##

At game start or load a bot is thrown into cold water. He might discover a very hostile environment in terms of resources, units, buildings and enemies. Interestingly game start and end can be very similar, meaning eveything is low, if the human opponnent has victory within his grasp. But a bot doesn't give up, as long there is a small chance of success - he takes it, right?

What is the worst case? Let's say no civic centers. That's close to ground zero in 0 A.D., because without CC you lack the territory to build any other structure. So, naturally the very first questions in this case are: Can I build a CC? And if not, what can I do at all? It turns out, these are very complex questions.

Let's start with some simple conditions:

  has only resources    
    -> whiteflag
  has only buildings    
    -> whiteflag
  has only units    
    -> whiteflag or fight like hell

Ok, that's not so difficult. And it looks translatable into straight forward JavaScript, too. Here comes the next level:

  has buildings, units, no resources
    has no CC
      has no CC builder
        can not train CC builder
          -> whiteflag or fight like hell
        can train CC builder
          -> gather resources
          -> train CC builder
          -> construct CC
      has CC builder
        -> gather resources
        -> construct CC


Actually that's only the surface. It assumes the units are not champions and the needed resources are available. Here are a few more:

  has buildings, resources, no units
    has no CC
      can train CC builder
        -> train CC builder
        -> construct CC
      can not train CC builder
        -> whiteflag

  has units, resources, no buildings
    has no CC
      has no CC builder
        -> whiteflag or fight like hell
      has CC builder
        -> construct CC

and finally:

  has units, resources, buildings
    has no CC
      has CC builder
        -> construct CC
      has no CC builder
        can train CC builder
          -> train builder
          -> construct CC
        can not train CC builder
          -> whiteflag or fight like hell

Can you imagine how many conditions the bot has to check just to find out he has definetly lost? Now add more edge cases, mixin technologies, multiply with all buildings and all factions and you'll end up with tens of thousands lines of code, hard to read, difficult to maintain and taking months to write.

That's where planners jump in. They know which conditions to check and how to answer them. Ontop they come up with a list of actions to reach your goal or none if your goal is unreachable.

HTN (hierarchical task network) planners are conceptually fairly simple, but extremely powerful. They define a state, that's the starting point, a goal and operators and methods, the latter are just functions. Operators can change the state and methods result in more methods or operators. 

So, you initialize a planner with a state, your goal and then call the first method. From there it tries to decompose the problem until only an ordered list of operators is left - that's your plan.

A 0 A.D example:

state = {
  resources: {food: 300, wood: 300},
  entities: {
    structures.athen.civil.centre: 1
    },
  technologies: [phase.village]
};

goal = {
  resources: {},
  entities: {
    structures.athen.field: 1},
  technologies: [gather.wicker.baskets]
}

The goal basically says: I don't care about resources and the civic centre, but in any case I want a field and foragers better equipped. Do you see the two traps? 

Here's the plan:

HTN: SUCCESS, actions: 8, 1 msecs
  op:   1, train_units ( units.athen.support.female.citizen, 1 )
  op:   2, wait_secs ( 10 )
  op:   3, build_structures ( structures.athen.farmstead, 1 )
  op:   4, wait_secs ( 45 )
  op:   5, build_structures ( structures.athen.field, 1 )
  op:   6, wait_secs ( 100 )
  op:   7, research_tech ( gather.wicker.baskets, 1 )
  op:   8, wait_secs ( 40 )

See how the planner automatically found out he needs a builder for the field and the farmstead for the technology.

And the final state:

resources: { food: 250, wood: 150, time: 195, metal: 0, stone: 0, pop: 1, popmax: 300, popcap: 20 }
entities: {
  structures.athen.civil.centre: 1
  units.athen.support.female.citizen: 1
  structures.athen.farmstead: 1
  structures.athen.field: 1
}
technologies: [phase.village, gather.wicker.baskets]

... which can be used for your next goal. HTN Planners are well used in RTS games. The net has a few nice presentations, google them. Some games have highly optimized ones, checking hundreds of plans each tick, looking for the optimal strategy to keep the human opponent entertained.

So far this planner lacks a few features, he needs a better awareness of time e.g. calculate how long it takes to get a given amount of resources and more challenging learns the concept of parallel tasks.

I'll continue when it produces heros :)






### Balance Sheet

Fortify - Claim
Defense - Attack
Exploit - Barter


[2664]   events: UNDEFINED (undefined)
[2664]   passabilityMap: UNDEFINED (undefined)
[2664]   territoryMap: UNDEFINED (undefined)
gamestate unavailbale
explicitely set des
isDeserialized = false; 



### Externals

*  Language: https://docs.google.com/drawings/d/1NIsuihzChPC237EsuqKJuP_mtjlxaw9U5ByCmwK0NR0/edit 

### External Libraries + Tools ###

*  http://simjs.com/random.html
*  http://skylink.dl.sourceforge.net/project/tortoisesvn/1.8.4/Application/TortoiseSVN-1.8.4.24972-win32-svn-1.8.5.msi
*  https://github.com/fbzhong/sublime-jslint
*  http://svn.wildfiregames.com/public/ps/trunk

### civs ###

*  athen, brit, cart, celt, gaia, gaul, hele, iber, mace, maur, nociv, pers, ptol, rome, sele, skirm,
   spart, theb

### performance ###

*  http://rfrn.org/~shu/2013/03/20/two-reasons-functional-style-is-slow-in-spidermonkey.html
*  https://github.com/sq/JSIL/wiki/JavaScript-Performance-For-Madmen

### command line

"D:\Games\0 A.D. alpha\binaries\system\pyrogenesis.exe"  -quickstart -autostart=aitest02 -autostart-ai=1:hannibal -autostart-ai=2:aegis

### shared vs. private resources

*  a group can have private or shared resources
*  at game start for all structures => metadata.operator: 'g.custodian'
*  at game start for all units      => metadata.operator: 'none', 'g.healers', 'g.hero'

__group requests private unit: (e.g. grainpicker, female)__
  not existing:
    economy trains unit with metadata.order = order.id
  existing: 
    economy selects unit from game
  on ready economy calls resource listener found in order
  listener sets metadata.operator = instance.id
  listener calls onAssign of group

__group requests shared unit: (hero, healer)__
  not existing:
    economy trains unit with metadata.order = order.id
    on ready :
      economy calls listener for 'g.healer' => assign
        listener sets metadata.operator = instance.id
      economy calls listener for order with ?????
  existing: 
    economy calls listener for order with ?????

__group requests private structure: (e.g. field)__
  not existing:
    economy constructs structure with metadata.order = order.id
    events call on ready in economy
  existing: 
    // do nothing special
  economy calls on ready listener for order
  listener sets metadata.operator = instance.id

__group requests shared structure: (e.g. dropsite, refuge, civic centre)__
  not existing:
    economy constructs structure with metadata.order = order.id
    event onAIMetadata :
      launch instance of 'g.custodian'
      set metadata.operator = instance.id
      assign structure to instance
      connect instance downstream with group
      connect group upstream with instance
      economy calls listener for 'g.healer' => assign
      economy calls listener for order with ?????
  existing: 
    // do nothing special
  economy calls on ready listener for order
  listener sets metadata.operator = instance.id


### HTN Planner ###

design goals: 

*  team-based strategies
*  A plan is a list of ordered of primitive tasks
*  None primitive tasks are compound of subtasks
*  primitive tasks perform (physical) actions directly via their operator
*  methods decompose non prim tasks
*  a prim tasks is achieved by an operator
*  Method decomposition does not change the statte of the world
*  operators have no preconditions only effects


SHOP = Simple Hierarchical Orderer Planner

*** https://bitbucket.org/dananau/pyhop
** http://www.cs.umd.edu/~nau/papers/nau2012what.pdf
* http://aigamedev.com/open/reviews/fear-ai/
* http://aigamedev.com/open/coverage/htn-planning-discussion/
* http://www.cs.umd.edu/~nau/planning/slides/
http://www.cse.lehigh.edu/~munoz/projects/HTNbots/files/Hoang_Thesis_v10.pdf
http://www.cse.lehigh.edu/~munoz/AIPlanning/classes/HTN%20final.ppt
http://www.isi.edu/~blythe/cs541/Slides/2003-9-18-htn.pdf
http://icaps07-satellite.icaps-conference.org/workshop8/Planning%20with%20Hierarchical%20Task%20Networks%20in%20Video%20Games.pdf

Logistics
  Military operations planning:
  Air campaign planning, Non-
  Combatant Evacuation Operations
  Crisis Response: Oil Spill Response
  Production line scheduling
  Construction planning:
  Space platform building, house construction
  Space applications:
  mission sequencing, satellite control
  Software Development:
  Unix administrator's script writing

Many features:
  Hierarchical decomposition
  Resources
  Time
  Complex conditions
  Axioms
  Procedural attachments
  Scheduling
  Planning and Execution
  Knowledge acquisition tools
  Mixed-initiative

Problem reduction:
  Decompose tasks into subtasks
  Handle constraints
  Resolve interactions
  If necessary, backtrack and try other decompositions


### economy ###

*  why listener and source in order?

### hot keys ###
http://trac.wildfiregames.com/wiki/HotKeys
F11:        Enable/disable real-time profiler (toggles through the displays of information)
F12:        Show time elapsed since the beginning of the game
Alt+ F:     Show/hide frame counter (FPS)
F2:         Take screenshot (in .png format, location is displayed in the top left of the GUI
Alt + K:    Show the 0 A.D. logo and copyright notice as a watermark for images.
Alt + G:    Hide/show the GUI
Alt + D:    Show/hide developer overlay (with developer options)
Space:      If timewarp mode enabled (in the developer overlay), speed up the game
Backspace:  If timewarp mode enabled (in the developer overlay), go back to an earlier point in the game



### group launch ###
init before ticks, instances, number

### Events ###

*  Create
*  Destroy
*  Attacked
*  RangeUpdate
*  ConstructionFinished
*  TrainingFinished
*  AIMetadata
*  PlayerDefeated
*  EntityRenamed
*  OwnershipChanged

## 0 A.D. Language ###

have 2 civs, 13 verbs, 342 nodes, 2172 edges
[accept, build, carry, contain, enable, gather, heal, hold, member, provide, require, research, train]

[ nodes | VERB [prop [, prop, [...]]] 
          [WITH prop op value [, prop op value, [...]]] 
          [SORT op prop [, op prop, [...]]]
          [LIMIT value]
          [RAND value]
[VERB [...]]
]



### Startup Conditions and Priorities

  has only resources    
    -> whiteflag
  has only buildings    
    -> whiteflag
  has only units    
    -> whiteflag or fight like hell

  has buildings, units, no resources
    has no CC
      has no CC builder
        can not train CC builder
          -> whiteflag or fight like hell
        can train CC builder
          -> gather resources
          -> train CC builder
          -> construct CC
      has CC builder
        -> gather resources
        -> construct CC

  has buildings, resources, no units
    has no CC
      can train CC builder
        -> train CC builder
        -> construct CC
      can not train CC builder
        -> whiteflag

  has units, resources, no buildings
    has no CC
      has no CC builder
        -> whiteflag or fight like hell
      has CC builder
        -> construct CC

  has units, resources, buildings
    has no CC
      has CC builder
        -> construct CC
      has no CC builder
        can train CC builder
          -> train builder
          -> construct CC
        can not train CC builder
          -> whiteflag or fight like hell


