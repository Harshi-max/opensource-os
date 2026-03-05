import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getGitHubAnalytics, getRepoStats } from '../services/githubAnalyticsService.js';

const router = express.Router();

/**
 * GET /api/analytics/github/:owner/:repo
 * Fetch GitHub analytics for a specific repository
 */
router.get('/github/:owner/:repo', authMiddleware, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;

    if (!owner || !repo) {
      return res.status(400).json({ error: 'Owner and repo name required' });
    }

    const [analytics, stats] = await Promise.all([
      getGitHubAnalytics(owner, repo),
      getRepoStats(owner, repo),
    ]);

    res.json({
      ...analytics,
      stats: { ...analytics.stats, ...stats },
    });
  } catch (error) {
    console.error('Analytics route error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/github/:owner/:repo/contributors
 * Fetch top contributors for a repository
 */
router.get('/github/:owner/:repo/contributors', authMiddleware, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;

    if (!owner || !repo) {
      return res.status(400).json({ error: 'Owner and repo name required' });
    }

    const analytics = await getGitHubAnalytics(owner, repo);
    res.json({
      repository: analytics.repository,
      contributors: analytics.contributors,
      totalContributors: analytics.stats.totalContributors,
    });
  } catch (error) {
    console.error('Contributors route error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/github/:owner/:repo/prs
 * Fetch PR statistics
 */
router.get('/github/:owner/:repo/prs', authMiddleware, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;

    if (!owner || !repo) {
      return res.status(400).json({ error: 'Owner and repo name required' });
    }

    const analytics = await getGitHubAnalytics(owner, repo);
    res.json({
      repository: analytics.repository,
      stats: {
        openPRs: analytics.stats.openPRs,
        mergedPRs: analytics.stats.mergedPRs,
        closedUnmergedPRs: analytics.stats.closedUnmergedPRs,
        unlabeledPRs: analytics.stats.unlabeledPRs,
        totalPRs: analytics.stats.totalPRs,
      },
      details: analytics.prDetails,
    });
  } catch (error) {
    console.error('PRs route error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
