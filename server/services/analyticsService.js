import { Poll, Message } from '../models/index.js';

/**
 * Calculate analytics for a specific room
 */
export const calculateRoomAnalytics = async (roomId) => {
  try {
    // Get all polls in room
    const polls = await Poll.find({ roomId }).populate('votes.userId', 'name');
    const messages = await Message.find({ roomId }).populate('userId', 'name');

    // Calculate most discussed topics (from poll questions and message keywords)
    const topicsFrequency = {};
    
    [...polls, ...messages].forEach((item) => {
      const text = item.question || item.content || '';
      const keywords = extractKeywords(text);
      keywords.forEach((kw) => {
        topicsFrequency[kw] = (topicsFrequency[kw] || 0) + 1;
      });
    });

    const mostDiscussedTopics = Object.entries(topicsFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);

    // Calculate poll analytics
    let totalDisagreements = 0;
    let agreementRateSum = 0;

    polls.forEach((poll) => {
      if (poll.votes.length > 0) {
        const voteDistribution = {};
        poll.votes.forEach((vote) => {
          const optId = vote.selectedOptionId.toString();
          voteDistribution[optId] = (voteDistribution[optId] || 0) + 1;
        });

        const maxVotes = Math.max(...Object.values(voteDistribution));
        const agreementRate = (maxVotes / poll.votes.length) * 100;
        agreementRateSum += agreementRate;

        if (agreementRate < 50) {
          totalDisagreements++;
        }
      }
    });

    const avgAgreementRate = polls.length > 0 ? agreementRateSum / polls.length : 0;

    // Count active contributors
    const activeContributors = new Set(messages.map((m) => m.userId._id.toString())).size;

    return {
      totalPolls: polls.length,
      totalMessages: messages.length,
      averageAgreementRate: avgAgreementRate.toFixed(2),
      pollDisagreementRate: polls.length > 0 ? ((totalDisagreements / polls.length) * 100).toFixed(2) : 0,
      mostDiscussedTopics,
      activeContributorsCount: activeContributors,
    };
  } catch (error) {
    throw new Error(`Failed to calculate analytics: ${error.message}`);
  }
};

/**
 * Extract keywords from text
 */
function extractKeywords(text) {
  if (!text) return [];

  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'been', 'be',
    'have', 'has', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'can', 'may', 'might', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
  ]);

  const words = text.toLowerCase()
    .match(/\b[\w']+\b/g) || [];

  return words
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 10);
}

/**
 * Get top contributors in a room
 */
export const getTopContributors = async (roomId, limit = 10) => {
  const messages = await Message.find({ roomId })
    .populate('userId', 'name reputation avatar')
    .lean();

  const contributorStats = {};

  messages.forEach((msg) => {
    const userId = msg.userId._id.toString();
    if (!contributorStats[userId]) {
      contributorStats[userId] = {
        user: msg.userId,
        messageCount: 0,
      };
    }
    contributorStats[userId].messageCount++;
  });

  return Object.values(contributorStats)
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, limit);
};

/**
 * Get most confusing topics based on poll disagreement
 */
export const getMostConfusingTopics = async (roomId, limit = 5) => {
  const polls = await Poll.find({ roomId }).lean();

  const confusingTopics = polls
    .filter((poll) => poll.totalVotes > 0)
    .map((poll) => {
      const maxVotes = Math.max(...poll.options.map((opt) => opt.voteCount));
      const disagreementRate = 100 - ((maxVotes / poll.totalVotes) * 100);
      return {
        question: poll.question,
        disagreementRate,
        totalVotes: poll.totalVotes,
      };
    })
    .sort((a, b) => b.disagreementRate - a.disagreementRate)
    .slice(0, limit);

  return confusingTopics;
};
