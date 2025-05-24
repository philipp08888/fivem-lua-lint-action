/* This file contains any additional function names, feel free to extend it! */

const esxServerFunctions = ["ESX.GetPlayers"] as const;

const cfxServerFunctions = [
  "source",
  "TriggerClientEvent",
  "TriggerLatentClientEvent",
  "RegisterServerEvent",
  "GetPlayerIdentifiers",
  "GetPlayers",
  "PerformHttpRequest"
] as const;

const cfxClientFunctions = [
  "TriggerServerEvent",
  "RegisterNUICallback",
  "SendNUIMessage"
] as const;

export const additionalServerFunctions = [
  ...esxServerFunctions,
  ...cfxServerFunctions
] as const;

export const additionalClientFunctions = [...cfxClientFunctions] as const;
