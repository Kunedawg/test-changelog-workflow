import { Octokit } from "@octokit/rest";

export async function isPullRequestMerged(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<boolean> {
  try {
    await octokit.rest.pulls.checkIfMerged({
      owner,
      repo,
      pull_number: pullNumber,
    });
    return true; // Pull request has been merged
  } catch (error: unknown) {
    // Narrow down the type of error
    if (typeof error === "object" && error !== null && "status" in error) {
      const axiosError = error as { status: number }; // or a more specific error type if you have one
      if (axiosError.status === 404) {
        return false; // Pull request has not been merged
      }
    }
    throw error; // Re-throw the error if it's not the expected type or not a 404
  }
}
