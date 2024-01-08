import fs from "fs";
import yaml from "js-yaml";

export function readYamlFile(filePath: string) {
  const fileContents = fs.readFileSync(filePath, "utf8");
  return yaml.load(fileContents);
}
