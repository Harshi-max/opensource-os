import axios from 'axios';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const githubClient = axios.create({
  baseURL: GITHUB_API_URL,
  headers: {
    'Accept': 'application/vnd.github.v3+json',
    ...(GITHUB_TOKEN && { 'Authorization': `token ${GITHUB_TOKEN}` }),
  },
});

/**
 * Fetch repo metadata from GitHub
 * @param {string} owner - GitHub repo owner
 * @param {string} repo - GitHub repo name
 */
export const fetchRepoMetadata = async (owner, repo) => {
  try {
    const response = await githubClient.get(`/repos/${owner}/${repo}`);
    const data = response.data;

    return {
      repoOwner: data.owner.login,
      repoName: data.name,
      repoUrl: data.html_url,
      description: data.description || '',
      language: data.language || 'Unknown',
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      metadata: {
        topics: data.topics || [],
        license: data.license?.name || null,
        homepageUrl: data.homepage || null,
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch GitHub repo: ${error.message}`);
  }
};

/**
 * Fetch recent issues from a GitHub repo
 */
export const fetchRepoIssues = async (owner, repo, limit = 10) => {
  try {
    const response = await githubClient.get(`/repos/${owner}/${repo}/issues`, {
      params: {
        state: 'open',
        per_page: limit,
        sort: 'updated',
        direction: 'desc',
      },
    });

    return response.data.map((issue) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      url: issue.html_url,
    }));
  } catch (error) {
    throw new Error(`Failed to fetch GitHub issues: ${error.message}`);
  }
};

/**
 * Validate if a GitHub repo URL is valid
 */
export const validateGitHubUrl = (url) => {
  const urlRegex = /https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/;
  const match = url.match(urlRegex);

  if (!match) {
    return null;
  }

  return {
    owner: match[1],
    repo: match[2],
  };
};

/**
 * Fetch pull requests from GitHub repo
 */
export const fetchRepoPullRequests = async (owner, repo, limit = 15) => {
  try {
    const response = await githubClient.get(`/repos/${owner}/${repo}/pulls`, {
      params: {
        state: 'open',
        per_page: limit,
        sort: 'updated',
        direction: 'desc',
      },
    });

    return response.data.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body || '',
      url: pr.html_url,
      author: pr.user?.login || 'Unknown',
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      reviewComments: pr.review_comments || 0,
    }));
  } catch (error) {
    console.error('Failed to fetch PRs:', error.message);
    return [];
  }
};

/**
 * Fetch PR statistics (counts for open, merged, closed)
 */
export const fetchPRStats = async (owner, repo) => {
  try {
    // Fetch open PRs count
    const openResponse = await githubClient.get(`/repos/${owner}/${repo}/pulls`, {
      params: {
        state: 'open',
        per_page: 1,
      },
    });
    const openPRsCount = openResponse.headers['link'] 
      ? parseInt(openResponse.headers['link'].match(/&page=(\d+)>; rel="last"/)?.[1] || '1') 
      : (openResponse.data.length || 0);

    // Fetch closed PRs (includes merged)
    const closedResponse = await githubClient.get(`/repos/${owner}/${repo}/pulls`, {
      params: {
        state: 'closed',
        per_page: 1,
      },
    });
    const closedPRsCount = closedResponse.headers['link']
      ? parseInt(closedResponse.headers['link'].match(/&page=(\d+)>; rel="last"/)?.[1] || '1')
      : (closedResponse.data.length || 0);

    // For merged count, we need to check PR details - fetch recent closed PRs to count merged
    const recentClosedResponse = await githubClient.get(`/repos/${owner}/${repo}/pulls`, {
      params: {
        state: 'closed',
        per_page: 100,
        sort: 'updated',
        direction: 'desc',
      },
    });
    
    let mergedCount = 0;
    const prChecks = [];
    
    // Check first few closed PRs for merge status
    for (const pr of recentClosedResponse.data.slice(0, 30)) {
      prChecks.push(
        githubClient.get(`/repos/${owner}/${repo}/pulls/${pr.number}/merge`)
          .then(() => true)
          .catch(() => false)
      );
    }
    
    const mergeResults = await Promise.all(prChecks);
    mergedCount = mergeResults.filter(Boolean).length;

    // Fetch recent PRs for display
    const recentPRs = recentClosedResponse.data.slice(0, 5).map((pr) => ({
      prNumber: pr.number,
      title: pr.title,
      author: pr.user?.login || 'Unknown',
      prUrl: pr.html_url,
      status: pr.merged_at ? 'merged' : (pr.state === 'open' ? 'open' : 'closed'),
    }));

    return {
      openPRs: openPRsCount,
      closedPRs: closedPRsCount,
      mergedPRs: mergedCount,
      recentPRs,
    };
  } catch (error) {
    console.error('Failed to fetch PR stats:', error.message);
    return {
      openPRs: 0,
      closedPRs: 0,
      mergedPRs: 0,
      recentPRs: [],
    };
  }
};

/**
 * Fetch top contributors from GitHub repo
 */
export const fetchRepoContributors = async (owner, repo, limit = 10) => {
  try {
    const response = await githubClient.get(`/repos/${owner}/${repo}/contributors`, {
      params: {
        per_page: limit,
        sort: 'contributions',
      },
    });

    return response.data.map((contributor) => ({
      login: contributor.login,
      avatar: contributor.avatar_url,
      contributions: contributor.contributions,
      profileUrl: contributor.html_url,
    }));
  } catch (error) {
    console.error('Failed to fetch contributors:', error.message);
    return [];
  }
};

/**
 * Fetch repository stats and insights
 */
export const fetchRepoInsights = async (owner, repo) => {
  try {
    const repoResponse = await githubClient.get(`/repos/${owner}/${repo}`);
    const data = repoResponse.data;

    return {
      openIssues: data.open_issues_count || 0,
      watchers: data.watchers_count || 0,
      networkCount: data.network_count || 0,
      hasWiki: data.has_wiki || false,
      hasPages: data.has_pages || false,
      defaultBranch: data.default_branch || 'main',
      isArchived: data.archived || false,
    };
  } catch (error) {
    console.error('Failed to fetch repo insights:', error.message);
    return {};
  }
};

/**
 * Fetch beginner-friendly issues for onboarding
 * Ranks issues based on labels, comment count, and recency
 * @param {string} owner - GitHub repo owner
 * @param {string} repo - GitHub repo name
 * @returns {Promise<Array>} - Top 5 beginner issues ranked by difficulty
 */
export const getBeginnerIssues = async (owner, repo) => {
  try {
    // Array of labels that indicate beginner-friendly issues
    const beginnerLabels = [
      'good first issue',
      'beginner',
      'beginner-friendly',
      'easy',
      'documentation',
      'help wanted',
      'starter',
      'first-time',
      'new contributor',
    ];

    // Fetch issues with beginner labels
    const response = await githubClient.get(`/repos/${owner}/${repo}/issues`, {
      params: {
        state: 'open',
        per_page: 100,
        sort: 'updated',
        direction: 'desc',
        labels: 'good first issue,help wanted',
      },
    });

    const allIssues = response.data;

    // Map and rank issues
    const issues = allIssues.map((issue) => {
      // Determine difficulty
      let difficulty = 'medium';
      const labels = issue.labels.map((l) => l.name.toLowerCase());

      if (labels.some((l) => ['good first issue', 'easy', 'beginner', 'beginner-friendly'].includes(l))) {
        difficulty = 'easy';
      } else if (labels.some((l) => ['hard', 'advanced', 'complex'].includes(l))) {
        difficulty = 'hard';
      }

      // Calculate a score for ranking
      let score = 0;

      // Prefer issues with fewer comments (less discussed = simpler)
      score += Math.max(0, 10 - issue.comments);

      // Prefer recently updated issues
      const daysSinceUpdate = (Date.now() - new Date(issue.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 20 - daysSinceUpdate);

      // Strongly prefer 'good first issue'
      if (labels.includes('good first issue')) {
        score += 50;
      }

      return {
        id: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body || '',
        url: issue.html_url,
        labels: labels,
        commentCount: issue.comments,
        difficulty,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        score,
      };
    });

    // Sort by score (highest first) and return top 5
    return issues.sort((a, b) => b.score - a.score).slice(0, 5);
  } catch (error) {
    console.error('Failed to fetch beginner issues:', error.message);
    return [];
  }
};

/**
 * Fetch repository README
 * @param {string} owner - GitHub repo owner
 * @param {string} repo - GitHub repo name
 * @returns {Promise<string>} - README content (truncated to 1000 chars)
 */
export const fetchRepoReadme = async (owner, repo) => {
  try {
    const response = await githubClient.get(`/repos/${owner}/${repo}/readme`, {
      headers: {
        'Accept': 'application/vnd.github.v3.raw',
      },
    });

    // Return truncated README
    return response.data.substring(0, 1000);
  } catch (error) {
    console.error('Failed to fetch README:', error.message);
    return '';
  }
};
