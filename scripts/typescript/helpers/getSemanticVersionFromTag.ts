export function getSemanticVersionFromTag(tag: string): [string | null, (newVersion: string) => string] {
  // Search for the pattern in the tag string (match on number.number.number)
  const regex = /\b\d+\.\d+\.\d+\b/;
  const match = tag.match(regex);

  if (match) {
    const version = match[0];
    const index = match.index || 0;

    // Split the tag string around the matched pattern
    const beforeMatch = tag.substring(0, index);
    const afterMatch = tag.substring(index + version.length);

    // Function to rebuild the original string with a new number
    const rebuildTagString = (newVersion: string): string => {
      return beforeMatch + newVersion + afterMatch;
    };

    return [version, rebuildTagString];
  } else {
    return [null, (newVersion: string) => tag];
  }
}
