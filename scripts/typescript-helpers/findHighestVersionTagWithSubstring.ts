import { Octokit } from "@octokit/rest";
import semver from "semver";

export async function findHighestVersionTagWithSubstring(
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
