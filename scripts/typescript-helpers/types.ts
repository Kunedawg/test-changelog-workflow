import { Octokit } from "@octokit/rest";
import { GetResponseDataTypeFromEndpointMethod } from "@octokit/types";

const octokitForTypeInference = new Octokit();
export type PullRequest = GetResponseDataTypeFromEndpointMethod<typeof octokitForTypeInference.pulls.list>[number];

export type ChangelogFormat = {
  categories: ChangelogCategory[];
  changeTemplate: string;
  versionResolver: {
    major: { labels: string[] };
    minor: { labels: string[] };
    patch: { labels: string[] };
    other: { labels: string[] };
  };
};

export type ChangelogCategory = {
  title: string;
  labels: string[];
};
