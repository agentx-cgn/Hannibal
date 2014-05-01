

# TODO #

structures.athen.field, structures.athen.dock WITH cost.population === 0


### Balance Sheet

Fortify - Claim
Defense - Attack
Gather  - Barter


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







### hot keys ###

Alt + G: Hide/show the GUI
Alt + D: Show/hide developer overlay (with developer options)
Alt + W: Toggle wireframe mode (press once to get wireframes overlaid over the textured models, twice to get just the wireframes colored by the textures, thrice to get back to normal textured mode)
Alt + S: Toggle unit silhouettes (might give a small performance boost)
Alt + Z: Hide/show sky
Space: If timewarp mode enabled (in the developer overlay), speed up the game
Backspace: If timewarp mode enabled (in the developer overlay), go back to an earlier point in the game
Alt + K: Show the 0 A.D. logo and copyright notice as a watermark for images.
~ or F9: Show/hide the Javascript console.



