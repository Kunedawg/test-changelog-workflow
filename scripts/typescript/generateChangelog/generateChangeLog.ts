import { Octokit } from "@octokit/rest";
import * as dotenv from "dotenv";
import { getCommitDateOfTag } from "../helpers/getCommitDateOfTag";
import { PullRequest, ChangelogFormat } from "../helpers/types";
import { fetchAllPullRequests } from "../helpers/fetchAllPullRequests";
import { isPullRequestMerged } from "../helpers/isPullRequestMerged";
import { findHighestVersionTagWithSubstring } from "../helpers/findHighestVersionTagWithSubstring";
import { determineNextVersionFromPrLabels } from "../helpers/determineNextVersionFromPrLabels";
import { buildChangelogString } from "../helpers/buildChangelogString";
import { readYamlFile } from "../helpers/readYamlFile";
import { getScopeArg } from "../helpers/getScopeArg";
import { getSemanticVersionFromTag } from "../helpers/getSemanticVersionFromTag";
dotenv.config();

async function main() {
  try {
    // get token
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error("Please provide a GITHUB_TOKEN");

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
    const changelog = buildChangelogString(mergedPullRequests, changelogFormat, newTag);
    console.log(changelog);
  } catch (error) {
    console.error("Error generating changelog:", error);
    process.exit(-1);
  }
}

main();
