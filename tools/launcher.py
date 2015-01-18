#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
https://docs.python.org/2/library/subprocess.html#popen-objects
http://stackoverflow.com/questions/1606795/catching-stdout-in-realtime-from-subprocess
http://askubuntu.com/questions/458041/find-x-window-name
http://stackoverflow.com/questions/9681959/how-can-i-use-xdotool-from-within-a-python-module-script
http://manpages.ubuntu.com/manpages/trusty/en/man1/avconv.1.html
http://stackoverflow.com/questions/287871/print-in-terminal-with-colors-using-python

xwininfo gives window info: xwininfo: Window id: 0x2800010 "0 A.D."

xdotool: 
  sudo apt-get install  libx11-dev  libxtst-dev libXinerama-dev
  make 
  make install

https://github.com/nullkey/glc/wiki/Capture

glc-capture --start --fps=30 --resize=1.0 --disable-audio --out=pyro.glc ./launcher.py
glc-play pyro.glc -o - -y 1 | avconv  -i -  -an -y pyro.mp4
avconv -i pyro.mp4 -codec copy -ss 15 -y pyro01.mp4
qt-faststart pyro01.mp4 pyro02.mp4
mplayer pyro02.mp4

'''

VERSION = "0.2.0"

import os, sys, subprocess, time, json
from time import sleep

sys.dont_write_bytecode = True

## maps etc.
from data import data

bcolors = {
  "Bold":     "\033[1m",
  "Header" :  "\033[95m",
  "LBlue" :   "\033[94m", ## light blue
  "DBlue" :   "\033[34m", ## dark blue
  "OKGreen" : "\033[32m", ## dark Green
  "Green" :   "\033[92m", ## light green
  "Warn" :    "\033[33m", ## orange
  "Fail" :    "\033[91m",
  "End" :     "\033[0m",
  # orange='\033[33m'
}

def printc(color, text) :
  print (bcolors[color] + text + bcolors["End"])

def stdc(color, text) :
  sys.stdout.write (bcolors[color] + text + bcolors["End"])


folders = {
  "pro"   : "/home/noiv/Desktop/0ad",                    ## project
  "rel"   : "/usr/games/0ad",                            ## release
  "trunk" : "/Daten/Projects/Osiris/ps/trunk",           ## svn
  "share" : "/home/noiv/.local/share",                   ## user mod
}


## the game binary
locations = {
  "rel" : folders["rel"],                                                             ## release
  "svn" : folders["trunk"] + "/binaries/system/pyrogenesis",                          ## svn
  "hbl" : folders["share"] + "/0ad/mods/hannibal/simulation/ai/hannibal/",            ## bot folder
  "deb" : folders["share"] + "/0ad/mods/hannibal/simulation/ai/hannibal/_debug.js",   ## bot folder
  "log" : folders["pro"]   + "/last.log",                                             ## log file
  "ana" : folders["pro"]   + "/analysis/",                                            ## analysis csv file
}

## Hannibal log/debug options + data, readable by JS and Python
DEBUG = {

  ## default map
  "map":   "scenarios/Arcadia 02",    

  ## counter
  "counter": [],

  ## num: 0=no numerus
  ## xdo: move window, sim speed
  ## fil can use files
  ## log: 0=silent, 1+=errors, 2+=warnings, 3+=info, 4=all
  ## col: log colors
  ## sup: suppress, bot does not intialize (saves startup time)
  ## tst: activate tester

  "bots": {
    "0" :  {"num": 0, "xdo": 0, "fil": 0, "log": 4, "sup": 1, "tst": 0, "col": "" },
    "1" :  {"num": 1, "xdo": 1, "fil": 1, "log": 4, "sup": 0, "tst": 1, "col": "" },
    "2" :  {"num": 0, "xdo": 0, "fil": 0, "log": 3, "sup": 0, "tst": 1, "col": "" },
    "3" :  {"num": 0, "xdo": 0, "fil": 0, "log": 2, "sup": 1, "tst": 0, "col": "" },
    "4" :  {"num": 0, "xdo": 0, "fil": 0, "log": 2, "sup": 1, "tst": 0, "col": "" },
    "5" :  {"num": 0, "xdo": 0, "fil": 0, "log": 2, "sup": 1, "tst": 0, "col": "" },
    "6" :  {"num": 0, "xdo": 0, "fil": 0, "log": 2, "sup": 1, "tst": 0, "col": "" },
    "7" :  {"num": 0, "xdo": 0, "fil": 0, "log": 2, "sup": 1, "tst": 0, "col": "" },
    "8" :  {"num": 0, "xdo": 0, "fil": 0, "log": 2, "sup": 1, "tst": 0, "col": "" },
  }

}

## keep track of open file handles
files = {}

## civs to choose from at start
civs  = [
  "athen", 
  "brit",
  "cart",
  "celt",
  "gaul",
  "hele",

  "iber",
  "mace",
  "maur",
  "pers",
  "ptol",
  "rome",
  "sele",
  "spart",
]

def buildCmd(typ="rel", map="Arcadia 02", bots=2) :

  ## see /ps/trunk/binaries/system/readme.txt

  cmd = [
    locations[typ], 

    "-quickstart",                 ## load faster (disables audio and some system info logging)
    "-autostart=" + map,           ## enables autostart and sets MAPNAME; TYPEDIR is skirmishes, scenarios, or random
    "-mod=public",                 ## start the game using NAME mod
    "-mod=charts", 
    "-mod=hannibal", 

    "-autostart-seed=0",           ##  sets random map SEED value (default 0, use -1 for random)
    "-autostart-size=192",         ##  sets random map size in TILES (default 192)

    # "-autostart-players=2",        ##  sets NUMBER of players on random map (default 2)
    # "-autostart-ai=1:hannibal",
    # "-autostart-civ=1:athen",      ##  sets PLAYER's civilisation to CIV (skirmish and random maps only)
    # "-autostart-ai=2:hannibal",    ##  sets the AI for PLAYER (e.g. 2:petra)
    # "-autostart-civ=2:cart",       ##  sets PLAYER's civilisation to CIV (skirmish and random maps only)

  ]

  ## svn does not autoload /user
  if typ == "svn" : cmd.append("-mod=user")

  ## set # of players
  cmd.append("-autostart-players=" + str(bots))

  ## add bots with civ
  for bot in range(1, bots +1) :
    cmd.append("-autostart-ai="  + str(bot) + ":hannibal")
    cmd.append("-autostart-civ=" + str(bot) + ":" + civs[bot -1])
  
  return cmd
  

def findWindow(title) :
  process = subprocess.Popen("xdotool search --name '%s'" % (title), stdout=subprocess.PIPE, shell="FALSE")
  windowid = process.stdout.readlines()[0].strip()
  process.stdout.close()
  return windowid

def xdotool(command) :
  subprocess.call(("xdotool %s" % command).split(" "))

def cleanup() :
  for k, v in files.iteritems() : v.close()

def writeDEBUG():
  fTest = open(locations["deb"], 'w')
  fTest.truncate()
  fTest.write("var HANNIBAL_DEBUG = " + json.dumps(DEBUG, indent=2) + ";")
  fTest.close()

def killDEBUG():
  fTest = open(locations["deb"], 'w')
  fTest.truncate()
  fTest.close()

def processMaps():

  proc0AD = None

  DEBUG["OnUpdate"] = "print('#! terminate');"

  for mp in data["testMaps"] :

    DEBUG["map"] = mp
    writeDEBUG()
    cmd0AD  = [pyrogenesis, "-quickstart", "-autostart=" + mp, "-mod=public", "-mod:hannibal", "-autostart-ai=1:hannibal"]
    proc0AD = subprocess.Popen(cmd0AD, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    print "  > " + " ".join(cmd0AD)

    try:

      for line in iter(proc0AD.stdout.readline, b'') : 

        sline = line.strip() 

        if sline.startswith("#! terminate") :
          proc0AD.terminate()
          sleep(2)
          if proc0AD : proc0AD.wait()
          if proc0AD : proc0AD.kill()
          break

        else :
          pass
          # sys.stdout.write(line)

    except KeyboardInterrupt, e :
      if proc0AD : proc0AD.terminate()
      break

  print "done."

def launch(typ="rel", map="Arcadia 02", bots=2):

  winX = 1520; winY = 20

  doWrite    = False
  curFileNum = None
  idWindow   = None

  proc0AD = None
  def terminate() :
    if proc0AD : proc0AD.terminate()

  files["log"] = open(locations["log"], 'w')
  files["log"].truncate()
  DEBUG['map'] = map
  writeDEBUG()

  cmd0AD = buildCmd(typ, map, bots)
  print ("  cmd: %s" %  " ".join(cmd0AD));

  proc0AD = subprocess.Popen(cmd0AD, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

  try:

    for line in iter(proc0AD.stdout.readline, b'') :

      ## line has everything
      ## sline is stripped
      ## bline is active bot line after colon

      sline = line.strip() ## removes nl and wp
      bline = ""
      id    = 0
      bot   = DEBUG["bots"]["0"]

      ## detect bot id
      if len(sline) >= 2 and sline[1:3] == "::" :
        id    = sline[0]
        bot   = DEBUG["bots"][id]
        bline = "" if bot["log"] == 0 else sline[3:]

      files["log"].write(line)

      ## terminate everything
      if sline.startswith("#! terminate") :
        if bot["xdo"] : 
          print(sline)
          terminate()
          return

      ## clear console
      elif bline.startswith("#! clear") :
        print(sline)
        sys.stderr.write("\x1b[2J\x1b[H") ## why not ??

      ## xdo init
      elif bot["xdo"] and bline.startswith("#! xdotool init") :
        idWindow = findWindow("0 A.D")
        printc("DBlue", "   xdo: window id: %s" % idWindow)
        xdotool("windowmove %s %s %s" % (idWindow, winX, winY))

      ## xdo command with echo
      elif bot["xdo"] and bline.startswith("#! xdotool ") :
        params = " ".join(bline.split(" ")[2:])
        printc("DBlue", "   X11: " + params)
        xdotool(params)

      ## xdo command without echo
      elif bot["xdo"] and bline.startswith("## xdotool ") : ## same, no echo
        params = " ".join(bline.split(" ")[2:])
        xdotool(params)

      ## xdo command suppress
      elif not bot["xdo"] and bline.startswith("## xdotool ") :
        pass

      ## file open
      elif bot["fil"] and bline.startswith("#! open ") :
        filenum  = bline.split(" ")[2]
        filename = bline.split(" ")[3]
        files[filenum] = open(filename, 'w')
        files[filenum].truncate()

      ## file append
      elif bot["fil"] and bline.startswith("#! append ") :
        filenum  = bline.split(" ")[2]
        dataLine = ":".join(bline.split(":")[1:])
        files[filenum].write(dataLine + "\n")

      ## file write
      elif bot["fil"] and bline.startswith("#! write ") :
        print(bline)
        filenum  = bline.split(" ")[2]
        filename = bline.split(" ")[3]
        files[filenum] = open(filename, 'w')
        files[filenum].truncate()
        curFileNum = filenum
        
      ## file close
      elif bot["fil"] and bline.startswith("#! close ") :
        filenum  = bline.split(" ")[2]
        files[filenum].close()    
        print("#! closed %s at %s" % (filenum, os.stat(filename).st_size))

      ## bot output
      elif bot["log"] > 0 and bline :
        if   bline.startswith("ERROR :") : stdc("Fail",    id + "::" + bline + "\n")
        elif bline.startswith("WARN  :") : stdc("Warn",    id + "::" + bline + "\n")
        elif bline.startswith("INFO  :") : stdc("OKGreen", id + "::" + bline + "\n")
        else : sys.stdout.write("" + bline + "\n")

      ## suppressed bots - no output
      elif bot["log"] == 0:
        pass
        
      ## hannibal or map or 0AD output
      elif line :
        if   line.startswith("ERROR :")            : stdc("Fail",    line + "\n")
        elif line.startswith("WARN  :")            : stdc("Warn",    line + "\n")
        elif line.startswith("INFO  :")            : stdc("OKGreen", line + "\n")
        elif line.startswith("TIMER| ")            : pass ## suppress 0AD debugs
        elif line.startswith("sys_cursor_create:") : pass 
        elif line.startswith("AL lib:")            : pass 
        elif line.startswith("Sound:")             : pass 
        else : 
          sys.stdout.write("" + line)

  except KeyboardInterrupt, e :
    terminate()

if __name__ == '__main__':

    args = sys.argv[1:]
  
    if args[0] == "maps" :
      print ("  processing maps...")
      processMaps(args)

    else:
      
      typ  = args[0] if len(args) > 0 else "rel"
      map  = args[1] if len(args) > 1 else "Arcadia 02"
      bots = args[2] if len(args) > 2 else "2"

      launch(typ, map, int(bots))
    
    cleanup()
    print ("\nBye\n")
