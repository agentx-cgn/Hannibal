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
  "OKGreen" : "\033[92m",
  "Warning" : "\033[93m",
  "Fail" :    "\033[91m",
  "End" :     "\033[0m",
}

def printc(color, text) :
  print (bcolors[color] + text + bcolors["End"])


## the game binary
locations = {
  "rel" : "/usr/games/0ad",                                                      ## release
  "svn" : "/Daten/Projects/Osiris/ps/trunk/binaries/system/pyrogenesis",         ## svn
  "hbl" : "/home/noiv/.local/share/0ad/mods/hannibal/simulation/ai/hannibal/",   ## bot folder
  "tda" : "/home/noiv/.local/share/0ad/mods/hannibal/simulation/ai/hannibal/tester-data.js",   ## bot folder
  "log" : "/home/noiv/Desktop/0ad/last.log",                                     ## log file
  "ana" : "/home/noiv/Desktop/0ad/analysis/"                                     ## analysis csv file
}

## JS startup options
tester = {
  "map": "Arcadia 02"
}

# cmd0AD = [pyrogenesis, "-quickstart", "-mod=charts", "-autostart=aitest07", "-autostart-ai=1:hannibal"]
# cmd0AD = [pyrogenesis, "-quickstart", "-mod=charts", "-autostart=ai-village-00", "-autostart-ai=1:hannibal"]
# cmd0AD = [pyrogenesis, "-quickstart", "-autostart=ai-village-00", "-autostart-ai=1:hannibal"]
# cmd0AD = [pyrogenesis, "-quickstart", "-autostart=" + tester['map'], "-autostart-ai=1:hannibal"]

files = {}

def buildCmd(typ="rel", map="Arcadia 02") :

  cmd = [
    locations[typ], 
    "-quickstart", 
    "-autostart=scenarios/" + map, 
    "-mod=public", 
    "-mod=charts", 
    "-mod=hannibal", 
    "-autostart-ai=1:hannibal"
  ]

  if typ == "svn" : cmd.append("-mod=user")
  
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

def writeTesterData():
  fTest = open(locations["tda"], 'w')
  fTest.truncate()
  fTest.write("var TESTERDATA = " + json.dumps(tester) + ";")
  fTest.close()

def killTestData():
  fTest = open(locations["tda"], 'w')
  fTest.truncate()
  fTest.close()

def processMaps():

  proc0AD = None

  tester["OnUpdate"] = "print('#! terminate');"

  for mp in data["testMaps"] :

    tester["map"] = mp
    writeTestData()
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

def launch(typ="rel", map="Arcadia 02"):

  winX = 1520; winY = 20

  doWrite    = False
  curFileNum = None
  idWindow   = None

  proc0AD = None
  def terminate() :
    if proc0AD : proc0AD.terminate()

  files["log"] = open(locations["log"], 'w')
  files["log"].truncate()
  tester['map'] = map
  writeTesterData()

  cmd0AD = buildCmd(typ, map)
  print ("  cmd: %s" %  " ".join(cmd0AD));

  proc0AD = subprocess.Popen(cmd0AD, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

  try:

    for line in iter(proc0AD.stdout.readline, b'') :

      sline = line.strip() ## removes nl and wp
      files["log"].write(line)

      if sline.startswith("#! terminate") :
        print(sline)
        terminate()
        return

      elif sline.startswith("#! xdotool init") :
        idWindow = findWindow("0 A.D")
        print("**");
        printc("DBlue", "   xdo: window id: %s" % idWindow)
        xdotool("windowmove %s %s %s" % (idWindow, winX, winY))

      elif sline.startswith("#! xdotool ") :
        params = " ".join(sline.split(" ")[2:])
        printc("DBlue", "   X11: " + params)
        xdotool(params)

      elif sline.startswith("## xdotool ") : ## same, no echo
        params = " ".join(sline.split(" ")[2:])
        xdotool(params)

      elif sline.startswith("#! clear") :
        print(sline)
        sys.stderr.write("\x1b[2J\x1b[H") ## why not ??

      elif sline.startswith("#! open ") :
        filenum  = sline.split(" ")[2]
        filename = sline.split(" ")[3]
        files[filenum] = open(filename, 'w')
        files[filenum].truncate()
        # print(": open %s %s " % (filenum, filename))

      elif sline.startswith("#! append ") :
        filenum  = sline.split(" ")[2]
        dataLine = ":".join(sline.split(":")[1:])
        # print(": append %s %s " % (filenum, dataLine))
        files[filenum].write(dataLine + "\n")

      elif sline.startswith("#! write ") :
        print(sline)
        filenum  = sline.split(" ")[2]
        filename = sline.split(" ")[3]
        files[filenum] = open(filename, 'w')
        files[filenum].truncate()
        curFileNum = filenum
        
      elif sline.startswith("#! close ") :
        filenum  = sline.split(" ")[2]
        files[filenum].close()    
        print("#! closed %s at %s" % (filenum, os.stat(filename).st_size))

      # elif doWrite :
      #   # sys.stdout.write(".") little feedback if needed
      #   files[curFileNum].write(line)

      else :
        sys.stdout.write(line)

  except KeyboardInterrupt, e :
    terminate()

if __name__ == '__main__':

    args = sys.argv[1:]
  
    if args[0] == "maps" :
      print ("  processing maps...")
      processMaps(args)

    else:
      typ = args[0] if len(args) > 0 else "rel"
      map = args[1] if len(args) > 1 else "Arcadia 02"
      launch(typ, map)
    
    cleanup()
    print ("\nBye\n")



