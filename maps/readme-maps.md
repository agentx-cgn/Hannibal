

### command line ###

D:\Projects\Osiris\ps\trunk\binaries\system\pyrogenesis.exe  
  -quickstart -autostart=aitest03 -autostart-ai=1:hannibal

### aitest02 ###

basic start up

    Q: q: 'INGAME'
     : c: 'ingames with metadata'
     : i: ops:  246, nodes:  246, c: ["INGAME"]
    Q: executed: msecs: 5, records: 4, ops: 250
    D: showing 10/4 format: 'metadata'
    H:  ID   Meta | node
    n: 209 | {opname:none,ccid:44} | units.athen.support.female.citizen.house#209
    n: 208 | {opname:none,ccid:44} | units.athen.support.female.citizen#208
    n:  44 | {opname:g.custodian#1,opmode:shared,opid:1} | structures.athen.civil.centre#44
    n: 210 | {opname:g.custodian#3,ccid:44,opmode:shared,opid:3} | structures.athen.blacksmith#210


### aitest03 ###

just before phase.town

    Q: q: 'INGAME'
     : c: 'ingames with metadata'
     : i: ops:  252, nodes:  252, c: ["INGAME"]
    Q: executed: msecs: 5, records: 8, ops: 260
    D: showing 10/8 format: 'metadata'
    H:  ID   Meta | node
    n: 209 | {opname:none,ccid:44} | units.athen.support.female.citizen.house#209
    n: 208 | {opname:none,ccid:44} | units.athen.support.female.citizen#208
    n: 219 | {opname:none,ccid:44} | structures.athen.house#219
    n: 218 | {opname:none,ccid:44} | structures.athen.house#218
    n: 217 | {opname:none,ccid:44} | structures.athen.house#217
    n: 216 | {opname:none,ccid:44} | structures.athen.field#216
    n:  44 | {opname:g.custodian#1,opmode:shared,opid:1} | structures.athen.civil.centre#44
    n: 210 | {opname:g.custodian#3,ccid:44,opmode:shared,opid:3} | structures.athen.blacksmith#210


### aitest04m ###

testing destroy centre with grainpicker

     Q: q: 'INGAME SORT < id'
      : c: 'ingames with metadata'
      : i: ops:  256, nodes:  256, c: ["INGAME"]
      : i: ops:  268, nodes:   12, c: ["SORT","< id"]
     Q: executed: msecs: 6, records: 12, ops: 301
     D: showing 50/12 format: 'metadata'
     H:  ID   Meta | node
     n:  44 | {ccid:44,opname:g.mayor} | structures.athen.civil.centre#44
     n: 208 | {ccid:44,opname:none} | units.athen.support.female.citizen#208
     n: 209 | {ccid:44,opname:none} | units.athen.support.female.citizen.house#209
     n: 210 | {ccid:44,opname:g.custodian} | structures.athen.blacksmith#210
     n: 216 | {ccid:44,opname:none} | structures.athen.field#216
     n: 217 | {ccid:44,opname:none} | structures.athen.house#217
     n: 218 | {ccid:44,opname:none} | structures.athen.house#218
     n: 219 | {ccid:44,opname:none} | structures.athen.house#219
     n: 220 | {ccid:44,opname:g.custodian} | structures.athen.farmstead#220
     n: 221 | {ccid:44,opname:none} | units.athen.infantry.archer.b#221
     n: 222 | {ccid:44,opname:none} | units.athen.infantry.archer.b#222
     n: 223 | {ccid:44,opname:none} | structures.athen.house#223


### aitest05m ###

testing scouts

    Q: q: 'INGAME SORT < id'
     : c: 'ingames with metadata'
    Q: executed: msecs: 8, records: 22, ops: 368
    D: showing 50/22 format: 'metadata'
    H:  ID   Meta | node
    n: 210 | {ccid:263,opname:g.custodian#6,opmode:shared,opid:6} | structures.athen.blacksmith#210
    n: 216 | {ccid:263,opname:g.grainpicker#8,opid:8} | structures.athen.field#216
    n: 217 | {ccid:263,opname:none} | structures.athen.house#217
    n: 218 | {ccid:263,opname:none} | structures.athen.house#218
    n: 219 | {ccid:263,opname:none} | structures.athen.house#219
    n: 220 | {ccid:263,opname:g.custodian#1,opmode:shared,opid:1} | structures.athen.farmstead#220
    n: 223 | {ccid:263,opname:none} | structures.athen.house#223
    n: 239 | {ccid:263,opname:g.grainpicker#8,opid:8} | units.athen.support.female.citizen#239
    n: 240 | {ccid:263,opname:g.grainpicker#8,opid:8} | units.athen.support.female.citizen#240
    n: 241 | {ccid:263,opname:g.grainpicker#18,opid:18} | units.athen.support.female.citizen#241
    n: 242 | {ccid:263,opname:g.grainpicker#13,opid:13} | units.athen.support.female.citizen#242
    n: 243 | {ccid:263,opname:g.grainpicker#8,opid:8} | units.athen.support.female.citizen#243
    n: 252 | {ccid:263,opname:none} | structures.athen.defense.tower#252
    n: 253 | {ccid:263,opname:none} | units.athen.infantry.spearman.b#253
    n: 254 | {ccid:263,opname:none} | units.athen.infantry.spearman.b#254
    n: 255 | {ccid:263,opname:none} | units.athen.infantry.spearman.b#255
    n: 256 | {ccid:263,opname:none} | units.athen.infantry.spearman.b#256
    n: 257 | {ccid:263,opname:none} | units.athen.infantry.spearman.b#257
    n: 258 | {ccid:263,opname:none} | units.athen.cavalry.javelinist.b#258
    n: 259 | {order:32,opid:13,opname:g.grainpicker#13} | structures.athen.field#259
    n: 260 | {order:34,opid:18,opname:g.grainpicker#18} | structures.athen.field#260
    n: 263 | {order:35,opid:3,opname:g.mayor#3} | structures.athen.civil.centre#263
