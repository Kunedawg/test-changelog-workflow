import { Octokit } from "@octokit/rest";
import * as dotenv from "dotenv";
import { getCommitDateOfTag } from "./getCommitDateOfTag";
import { PullRequest, ChangelogFormat } from "./types";
import { fetchAllPullRequests } from "./fetchAllPullRequests";
import { isPullRequestMerged } from "./isPullRequestMerged";
import { findHighestVersionTagWithSubstring } from "./findHighestVersionTagWithSubstring";
import { determineNextVersionFromPrLabels } from "./determineNextVersionFromPrLabels";
import { createChangelog } from "./createChangelog";
import { readYamlFile } from "./readYamlFile";
import { getScopeArg } from "./getScopeArg";
dotenv.config();

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

async function main() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = "Kunedawg";
    const repo = "test-changelog-workflow";
    const octokit = new Octokit({ auth: token });

    // get scope
    const scope = getScopeArg();

    // find the latest tag of the given scope
    const tag = await findHighestVersionTagWithSubstring(octokit, owner, repo, scope);
    if (!tag) throw new Error("no tag found for given scope arg");

    // get semantic version and string builder
    const [currentVersion, tagStringBuilder] = getSemanticVersionFromTag(tag);
    if (!currentVersion) throw new Error("semantic version not found in tag");

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
    const newVersion = determineNextVersionFromPrLabels(mergedPullRequests, currentVersion, changelogFormat);
    const newTag = tagStringBuilder(newVersion);
    // console.error(newTag);
    // TODO pass newTag and newVersion to createChangelog
    const changelog = createChangelog(mergedPullRequests, changelogFormat, newTag);
    console.log(changelog);
  } catch (error) {
    console.error("Error generating changelog:", error);
    process.exit(-1);
  }
}

main();
