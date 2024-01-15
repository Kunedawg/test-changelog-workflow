import { Octokit } from "@octokit/rest";
import { PullRequest } from "./types";

export async function fetchAllPullRequests(octokit: Octokit, owner: string, repo: string): Promise<PullRequest[]> {
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
