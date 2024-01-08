import { Octokit } from "@octokit/rest";
import * as dotenv from "dotenv";
import { getCommitDateOfTag } from "./getCommitDateOfTag";
import { PullRequest, ChangelogFormat } from "./types";
import { fetchAllPullRequests } from "./fetchAllPullRequests";
import { isPullRequestMerged } from "./isPullRequestMerged";
import fs from "fs";
import yaml from "js-yaml";
import semver from "semver";
dotenv.config();

// Function to get the 'scope' argument from the command line
function getScopeArg(): string {
  const args = process.argv.slice(2); // process.argv[0] is node, process.argv[1] is the script path
  if (args[0]) {
    return args[0];
  } else {
    throw new Error("scope not provided by command line arg");
  }
}

function readYamlFile(filePath: string) {
  const fileContents = fs.readFileSync(filePath, "utf8");
  return yaml.load(fileContents);
}

function createChangelog(prs: PullRequest[], changelogFormat: ChangelogFormat) {
  let changelog = "";

  changelog += `## [tag]\n`;

  for (const category of changelogFormat.categories) {
    let categoryEntries = prs.filter((pr) => pr.labels.some((label) => category.labels.includes(label.name)));

    if (categoryEntries.length > 0) {
      changelog += `\n### ${category.title}\n\n`;
      for (const pr of categoryEntries) {
        const entry = changelogFormat.changeTemplate
          .replace("$TITLE", pr.title)
          .replace("$AUTHOR_URL", String(pr.user?.html_url))
          .replace("$AUTHOR_NAME", String(pr.user?.login))
          .replace("$PR_NUMBER", String(pr.number))
          .replace("$PR_URL", pr.url);
        changelog += `${entry}\n`;
      }
    }
  }

  return changelog;
}

function determineNextVersionFromPrLabels(
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
    console.error("OTHER detected, still patching");
    patch++;
  } else {
    patch++;
    console.error("WARNING: Not even patch change was detected, but still bumped patch number.");
  }

  return `${major}.${minor}.${patch}`;
}

function getSemanticVersionFromTag(tag: string): [string | null, (newVersion: string) => string] {
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

async function findHighestVersionTagWithSubstring(
  octokit: Octokit,
  owner: string,
  repo: string,
  substring: string
): Promise<string | null> {
  try {
    // Fetch all tags from the repository
    const { data: tags } = await octokit.request("GET /repos/{owner}/{repo}/tags", {
      owner,
      repo,
    });

    // Filter tags containing the substring and sort them by semantic version
    const filteredTags = tags
      .filter((tag) => tag.name.includes(substring))
      .sort((a, b) => semver.rcompare(a.name, b.name));

    // Return the highest version tag or null if none found
    return filteredTags.length > 0 ? filteredTags[0].name : null;
  } catch (error) {
    console.error("Error fetching tags:", error);
    return null;
  }
}

async function main() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = "Kunedawg";
    const repo = "test-changelog-workflow";
    // const tag = "v0.0.0";
    const octokit = new Octokit({ auth: token });

    // get scope
    const scope = getScopeArg();

    // find the latest tag of the given scope
    const tag = await findHighestVersionTagWithSubstring(octokit, owner, repo, scope);
    if (!tag) {
      throw new Error("no tag found for given scope arg");
    }

    // create pull request filters
    const tagCommitDate = await getCommitDateOfTag(octokit, owner, repo, tag);
    const prIsNewerThanTag = (pr: PullRequest) => new Date(pr.created_at) > new Date(tagCommitDate);
    const prIsClosed = (pr: PullRequest) => pr.state === "closed";
    const prHasScopeLabel = (pr: PullRequest) => {
      const prLabelNames = pr.labels.map((label) => label.name);
      return prLabelNames.includes(`scope: ${scope}`);
    };

    // get and filter pull requests
    const pullRequests = await fetchAllPullRequests(octokit, owner, repo);
    const filteredPullRequests = pullRequests.filter(prIsNewerThanTag).filter(prIsClosed).filter(prHasScopeLabel);

    // Check if merged, this is async, so using .filter directly is not possible
    const prIsMerged = async (pr: PullRequest) => {
      return await isPullRequestMerged(octokit, owner, repo, pr.number);
    };
    const pullRequestsAreMerged = await Promise.all(filteredPullRequests.map(prIsMerged));
    const mergedPullRequests = filteredPullRequests.filter((_, index) => pullRequestsAreMerged[index]);

    // Create the changelog
    const changelogFormat = readYamlFile("changelog-format.yml") as ChangelogFormat;
    const newVersion = determineNextVersionFromPrLabels(mergedPullRequests, "0.0.0", changelogFormat);
    console.error(newVersion);
    const changelog = createChangelog(mergedPullRequests, changelogFormat);
    console.log(changelog);
  } catch (error) {
    console.error("Error generating changelog:", error);
    process.exit(-1);
  }
}

main();
