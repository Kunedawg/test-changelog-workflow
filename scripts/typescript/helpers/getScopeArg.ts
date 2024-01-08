// Function to get the 'scope' argument from the command line
export function getScopeArg(): string {
  const args = process.argv.slice(2); // process.argv[0] is node, process.argv[1] is the script path
  if (args[0]) {
    return args[0];
  } else {
    throw new Error("scope not provided by command line arg");
  }
}
