import axios from 'axios';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

/**
 * Fetch GitHub repository analytics
 * @param {string} owner - GitHub repo owner
 * @param {string} repo - GitHub repo name
 * @returns {Promise<Object>} - Analytics data with contributors, PR stats
 */
export const getGitHubAnalytics = async (owner, repo) => {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured');
  }

  const headers = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
  };

  try {
    console.log(`📊 Fetching GitHub analytics for ${owner}/${repo}...`);

    // Fetch contributors
    const contributorsResponse = await axios.get(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contributors?per_page=100`,
      { headers, timeout: 10000 }
    );
    const contributors = contributorsResponse.data.map((c) => ({
      username: c.login,
      avatar: c.avatar_url,
      contributions: c.contributions,
      profileUrl: c.html_url,
    }));

    // Fetch all pull requests for stats
    const prsResponse = await axios.get(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=all&per_page=100`,
      { headers, timeout: 10000 }
    );

    const allPRs = prsResponse.data;

    // Categorize PRs
    const openPRs = allPRs.filter((pr) => pr.state === 'open');
    const mergedPRs = allPRs.filter((pr) => pr.merged_at !== null);
    const closedUnmergedPRs = allPRs.filter((pr) => pr.state === 'closed' && pr.merged_at === null);
    const unlabeledPRs = allPRs.filter((pr) => pr.labels.length === 0);

    console.log(`✅ GitHub analytics fetched:
      Contributors: ${contributors.length}
      Open PRs: ${openPRs.length}
      Merged PRs: ${mergedPRs.length}
      Closed (unmerged) PRs: ${closedUnmergedPRs.length}
      Unlabeled PRs: ${unlabeledPRs.length}`);

    return {
      repository: {
        name: repo,
        owner: owner,
        url: `https://github.com/${owner}/${repo}`,
      },
      contributors: contributors.slice(0, 10), // Top 10 contributors
      stats: {
        totalContributors: contributors.length,
        openPRs: openPRs.length,
        mergedPRs: mergedPRs.length,
        closedUnmergedPRs: closedUnmergedPRs.length,
        unlabeledPRs: unlabeledPRs.length,
        totalPRs: allPRs.length,
      },
      prDetails: {
        open: openPRs.map((pr) => ({
          number: pr.number,
          title: pr.title,
          author: pr.user.login,
          url: pr.html_url,
          createdAt: pr.created_at,
          labels: pr.labels.map((l) => l.name),
        })).slice(0, 5),
        merged: mergedPRs.map((pr) => ({
          number: pr.number,
          title: pr.title,
          author: pr.user.login,
          mergedAt: pr.merged_at,
          mergedBy: pr.merged_by?.login || null,
          url: pr.html_url,
        })).slice(0, 5),
        closedUnmerged: closedUnmergedPRs.map((pr) => ({
          number: pr.number,
          title: pr.title,
          author: pr.user.login,
          closedBy: pr.closed_by?.login || null,
          url: pr.html_url,
        })).slice(0, 5),
        unlabeled: unlabeledPRs.map((pr) => ({
          number: pr.number,
          title: pr.title,
          author: pr.user.login,
          url: pr.html_url,
        })).slice(0, 5),
      },
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('GitHub analytics error:', error.message);
    throw new Error(`Failed to fetch GitHub analytics: ${error.message}`);
  }
};

/**
 * Get GitHub repository stats (stars, forks, issues, etc)
 * @param {string} owner - GitHub repo owner
 * @param {string} repo - GitHub repo name
 */
export const getRepoStats = async (owner, repo) => {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured');
  }

  const headers = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
  };

  try {
    const response = await axios.get(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}`,
      { headers, timeout: 10000 }
    );

    return {
      stars: response.data.stargazers_count,
      forks: response.data.forks_count,
      openIssues: response.data.open_issues_count,
      language: response.data.language,
      description: response.data.description,
      lastPush: response.data.pushed_at,
    };
  } catch (error) {
    console.error('Repo stats error:', error.message);
    throw new Error(`Failed to fetch repository stats: ${error.message}`);
  }
};

export default {
  getGitHubAnalytics,
  getRepoStats,
};
