import { PullRequest, ChangelogFormat } from "./types";

export function buildChangelogString(prs: PullRequest[], changelogFormat: ChangelogFormat, tag: string) {
  let changelog = "";

  changelog += `## [${tag}] - ${new Date().toISOString().split("T")[0]}\n`;

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
