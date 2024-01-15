import * as fs from "fs";
import * as readline from "readline";

function prependToFile(filename: string, data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, "utf8", (err, fileData) => {
      if (err && err.code !== "ENOENT") {
        reject(err);
        return;
      }

      const newData = data + (err ? "" : fileData);
      fs.writeFile(filename, newData, (writeErr) => {
        if (writeErr) {
          reject(writeErr);
        } else {
          resolve();
        }
      });
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("No file specified");
    process.exit(1);
  }

  const filename = args[0];
  let inputData = "";

  const rl = readline.createInterface({
    input: process.stdin,
  });

  rl.on("line", (line) => {
    inputData += line + "\n";
  });

  rl.on("close", async () => {
    try {
      await prependToFile(filename, inputData);
    } catch (error) {
      console.error("Error:", error);
    }
  });
}

main();
