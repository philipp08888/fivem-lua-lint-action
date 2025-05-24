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

export const manifestVariables = [
  "fx_version",
  "games",
  "game",
  "author",
  "description",
  "version",
  "client_scripts",
  "client_script",
  "server_scripts",
  "server_script",
  "shared_scripts",
  "shared_script",
  "export",
  "exports",
  "replace_level_meta",
  "data_file",
  "this_is_a_map",
  "server_only",
  "loadscreen",
  "ui_page",
  "file",
  "files",
  "my_data",
  "dependency",
  "dependencies",
  "provide",
  "lua54",
  "disable_lazy_natives",
  "clr_disable_task_scheduler"
] as const;

export const additionalServerFunctions = [
  ...esxServerFunctions,
  ...cfxServerFunctions
] as const;

export const additionalClientFunctions = [...cfxClientFunctions] as const;
