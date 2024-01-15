import { PullRequest, ChangelogFormat } from "./types";

export function determineNextVersionFromPrLabels(
  prs: PullRequest[],
  currentVersion: string,
  changelogFormat: ChangelogFormat
) {
  const checkPrsForLabels = (labelsToCheck: string[]) => {
    return prs.reduce((hasLabel, pr) => {
      const prLabelNames = pr.labels.map((label) => label.name);
      return hasLabel || prLabelNames.some((label) => labelsToCheck.includes(label));
    }, false);
  };

  const isMajor = checkPrsForLabels(changelogFormat.versionResolver.major.labels);
  const isMinor = checkPrsForLabels(changelogFormat.versionResolver.minor.labels);
  const isPatch = checkPrsForLabels(changelogFormat.versionResolver.patch.labels);
  const isOther = checkPrsForLabels(changelogFormat.versionResolver.other.labels);

  let [major, minor, patch] = currentVersion.split(".").map(Number);

  if (isMajor) {
    major++;
    minor = 0;
    patch = 0;
  } else if (isMinor) {
    minor++;
    patch = 0;
  } else if (isPatch) {
    patch++;
  } else if (isOther) {
    patch++;
    console.error(
      "WARNING: Only 'Other' type PR labels were found. Patch number was incremented. Double check to make sure this code is worth releasing."
    );
  } else {
    patch++;
    console.error(
      "WARNING: No valid PR labels were found. Patch number was incremented. Double check to make sure this code is worth releasing."
    );
  }

  return `${major}.${minor}.${patch}`;
}
