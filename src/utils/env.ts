import { cleanEnv, makeValidator, str } from "envalid";

const list = makeValidator(x => {
  if (typeof x !== "string") {
    throw new Error(`Expected a comma-separated string, got ${typeof x}`);
  }

  const values: Array<string> = x
    .split(",")
    .map(value => value.trim())
    .filter(value => value.length > 0);

  return values;
});

export const env = cleanEnv(process.env, {
  IGNORED_SCRIPT_LIST: list(),
  RESOURCES_FOLDER_PATH: str()
});
