import { Octokit } from "@octokit/rest";
import { GetResponseDataTypeFromEndpointMethod } from "@octokit/types";

const octokitForTypeInference = new Octokit();
export type PullRequest = GetResponseDataTypeFromEndpointMethod<typeof octokitForTypeInference.pulls.list>[number];
