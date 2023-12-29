import { Octokit } from "@octokit/rest";
import * as dotenv from "dotenv";
import { getCommitDateOfTag } from "./getCommitDateOfTag";
import { PullRequest } from "./types";
import { fetchAllPullRequests } from "./fetchAllPullRequests";
import { isPullRequestMerged } from "./isPullRequestMerged";
import fs from "fs";
import yaml from "js-yaml";
dotenv.config();

// Function to get the 'scope' argument from the command line
function getScopeArg(): string | undefined {
  const args = process.argv.slice(2); // process.argv[0] is node, process.argv[1] is the script path
  if (args[0]) {
    return args[0];
  } else {
    throw new Error("scope not provided by command line arg");
  }
}

function generateChangelogFromPrs(prs: PullRequest[], tag: string): string {
  let changelog = "";
  changelog += "# Changelog\n\n";
  changelog += `## Pull Requests since tag ${tag}\n\n`;
  changelog += `### Pull Requests\n\n`;
  prs.forEach((pr) => {
    changelog += `- ${pr.title} [@${pr.user?.login}](${pr.user?.html_url}) ([#${pr.number}](${pr.url}))\n`;
  });
  return changelog;
}

type ChangelogFormat = {
  categories: ChangelogCategory[];
  changeTemplate: string;
};

type ChangelogCategory = {
  title: string;
  labels: string[];
};

function readYamlFile(filePath: string) {
  const fileContents = fs.readFileSync(filePath, "utf8");
  return yaml.load(fileContents);
}

function createChangelog(prs: PullRequest[]) {
  const changelogFormat = readYamlFile("changelog-format.yml") as ChangelogFormat;

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

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const owner = "Kunedawg";
  const repo = "test-changelog-workflow";
  const tag = "v0.0.0";
  const octokit = new Octokit({ auth: token });

  try {
    // get scope from command line
    const scope = getScopeArg();
    const tagCommitDate = await getCommitDateOfTag(octokit, owner, repo, tag);

    // get all pull requests
    const pullRequests = await fetchAllPullRequests(octokit, owner, repo);

    // create pull request filters
    const prIsNewerThanTag = (pr: PullRequest) => new Date(pr.created_at) > new Date(tagCommitDate);
    const prIsClosed = (pr: PullRequest) => pr.state === "closed";
    const prHasScopeLabel = (pr: PullRequest) => {
      const prLabelNames = pr.labels.map((label) => label.name);
      return prLabelNames.includes(`scope: ${scope}`);
    };

    // filter pull requests
    const filteredPullRequests = pullRequests.filter(prIsNewerThanTag).filter(prIsClosed).filter(prHasScopeLabel);

    // Check if merged, this is async, so using .filter directly is not possible
    const prIsMerged = async (pr: PullRequest) => {
      return await isPullRequestMerged(octokit, owner, repo, pr.number);
    };
    const pullRequestsAreMerged = await Promise.all(filteredPullRequests.map(prIsMerged));
    const mergedPullRequests = filteredPullRequests.filter((_, index) => pullRequestsAreMerged[index]);

    // Create the changelog
    // const changelog = generateChangelogFromPrs(mergedPullRequests, tag);
    const changelog = createChangelog(mergedPullRequests);
    console.log(changelog);
  } catch (error) {
    console.error("Error generating changelog:", error);
  }
}

main();
