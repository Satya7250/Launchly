import { App } from "octokit";
import { verify } from "@octokit/webhooks-methods";
import { env } from "./env.js";

// Initialize the GitHub App instance
export const githubApp = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_PRIVATE_KEY,
  webhooks: {
    secret: env.GITHUB_WEBHOOK_SECRET,
  },
});

/**
 * Verify GitHub webhook signature.
 */
export async function verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
  try {
    return await verify(env.GITHUB_WEBHOOK_SECRET, payload, signature);
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

/**
 * Get an Octokit instance authenticated for a specific installation.
 */
export async function getInstallationOctokit(installationId: number) {
  return await githubApp.getInstallationOctokit(installationId);
}

/**
 * Fetch GitHub installation details using App client.
 */
export async function getInstallationDetails(installationId: number) {
  const octokit = githubApp.octokit;
  const { data } = await octokit.rest.apps.getInstallation({
    installation_id: installationId,
  });
  return data;
}

/**
 * Fetch list of repositories accessible to an installation.
 */
export async function getInstallationRepositories(installationId: number) {
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
    per_page: 100,
  });
  return data.repositories;
}

/**
 * Fetch details of a single repository.
 */
export async function getRepositoryDetails(installationId: number, owner: string, repo: string) {
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.rest.repos.get({ owner, repo });
  return data;
}

/**
 * Fetch details of a pull request.
 */
export async function getPullRequest(installationId: number, owner: string, repo: string, pullNumber: number) {
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return data;
}

/**
 * Fetch all changed files for a pull request (handling pagination).
 */
export async function getPullRequestFiles(installationId: number, owner: string, repo: string, pullNumber: number) {
  const octokit = await getInstallationOctokit(installationId);
  let files: any[] = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: perPage,
      page,
    });
    files = files.concat(data);
    if (data.length < perPage) {
      break;
    }
    page++;
  }
  return files;
}

/**
 * Fetch the full PR diff/patch text on-demand.
 */
export async function getPullRequestDiff(installationId: number, owner: string, repo: string, pullNumber: number): Promise<string> {
  const octokit = await getInstallationOctokit(installationId);
  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: {
      format: "diff",
    },
  });
  // The response data is typed as the standard Pull Request object in RestEndpointMethodTypes,
  // but when mediaType format is 'diff', the response body is actually the raw string.
  return response.data as unknown as string;
}
