Trigger.prototype.InitGame = function(){

  print("------: Brainland.Triggers.InitGame.in\n");

  var numberOfPlayers = TriggerHelper.GetNumberOfPlayers();

   for (var i = 0; i < numberOfPlayers; ++i) { 

    TriggerHelper
      .GetPlayerComponent(i)
      .SetResourceCounts({food: 1000, wood: 1000, stone: 1000, metal: 1000})
    ;
   
   }

  print("------: Brainland.Triggers.InitGame.out\n");

}

Engine
  .QueryInterface(SYSTEM_ENTITY, IID_Trigger)
  .DoAfterDelay(0, "InitGame", {})
; 
