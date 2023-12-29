import { Octokit } from "@octokit/rest";
import { GetResponseDataTypeFromEndpointMethod } from "@octokit/types";
import * as dotenv from "dotenv";
dotenv.config();

const octokitForTypeInference = new Octokit();
type PullRequest = GetResponseDataTypeFromEndpointMethod<typeof octokitForTypeInference.pulls.list>[number];

async function getCommitDateForTag(octokit: Octokit, owner: string, repo: string, tag: string): Promise<string> {
  const tagData = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `tags/${tag}`,
  });
  const commitData = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: tagData.data.object.sha,
  });
  return commitData.data.committer.date;
}

async function fetchAllPullRequests(octokit: Octokit, owner: string, repo: string): Promise<PullRequest[]> {
  let page = 1;
  const PULL_REQUESTS_PER_PAGE = 100;
  let prs: PullRequest[] = [];

  while (true) {
    const response = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "all",
      sort: "created",
      direction: "desc",
      per_page: PULL_REQUESTS_PER_PAGE,
      page,
    });
    prs.push(...response.data);
    if (response.data.length < PULL_REQUESTS_PER_PAGE) break;
    page++;
  }

  return prs;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const owner = "Kunedawg";
  const repo = "test-changelog-workflow";
  const tag = "v0.0.0";
  const octokit = new Octokit({ auth: token });

  try {
    // get all pull requests
    const pullRequests = await fetchAllPullRequests(octokit, owner, repo);

    // create pull request filters
    const commitDate = await getCommitDateForTag(octokit, owner, repo, tag);
    const prIsNewerThanTagFilter = (pr: PullRequest) => new Date(pr.created_at) > new Date(commitDate);
    const prIsClosed = (pr: PullRequest) => pr.state === "closed";

    // filter pull requests
    const filteredPullRequests = pullRequests.filter(prIsNewerThanTagFilter).filter(prIsClosed);

    console.log("# Changelog\n");
    console.log(`## Pull Requests since tag ${tag}\n`);
    console.log(`### Pull Requests\n`);
    filteredPullRequests.forEach((pr) => {
      console.log(`- ${pr.title} [@${pr.user?.login}](${pr.user?.html_url}) ([#${pr.number}](${pr.url}))`);
    });
  } catch (error) {
    console.error("Error fetching pull requests:", error);
  }
}

main();
