import { Octokit } from "@octokit/rest";

export async function getCommitDateOfTag(octokit: Octokit, owner: string, repo: string, tag: string): Promise<string> {
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
