import { Reputation, DoubtPoll, User } from '../models/index.js';

/**
 * Reputation Service - Manages user reputation and leaderboards
 * Reputation tracks: helpfulness, accuracy of predictions, contributions
 */

/**
 * Get or create reputation record for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Reputation document
 */
export const getOrCreateReputation = async (userId) => {
  let rep = await Reputation.findOne({ userId });

  if (!rep) {
    rep = new Reputation({
      userId,
      totalScore: 0,
      pollAccuracyScore: 50,
    });
    await rep.save();
  }

  return rep;
};

/**
 * Add reputation points for activity
 * @param {string} userId - User ID
 * @param {string} activity - Activity type
 * @param {number} amount - Points to add
 */
export const addReputationPoints = async (userId, activity, amount = 1) => {
  const rep = await getOrCreateReputation(userId);

  switch (activity) {
    case 'message_posted':
      rep.messagesPosted += 1;
      rep.totalScore += 5;
      break;
    case 'poll_created':
      rep.pollsCreated += 1;
      rep.totalScore += 15;
      break;
    case 'vote_given':
      rep.votesGiven += 1;
      rep.totalScore += 2;
      break;
    case 'answer_upvoted':
      rep.answersUpvoted += 1;
      rep.totalScore += 10;
      break;
    case 'pr_created':
      rep.prsCreated += 1;
      rep.totalScore += 50;
      break;
    case 'helpful_answer':
      rep.helpfulAnswerCount += 1;
      rep.totalScore += 25;
      break;
    case 'correct_prediction':
      rep.correctPredictionCount += 1;
      rep.totalScore += 35;
      break;
  }

  rep.lastActivityAt = new Date();

  // Recalculate accuracy score if corrected prediction
  if (activity === 'correct_prediction') {
    rep.pollAccuracyScore = Math.min(
      100,
      Math.round((rep.correctPredictionCount / Math.max(1, rep.pollsCreated)) * 100)
    );
  }

  await rep.save();
  return rep;
};

/**
 * Calculate poll accuracy for a user
 * How often their suggested poll options match the outcome
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Accuracy score 0-100
 */
export const calculatePollAccuracy = async (userId) => {
  const rep = await getOrCreateReputation(userId);

  if (rep.pollsCreated === 0) {
    return 50; // Default middle score
  }

  const accuracy = Math.round((rep.correctPredictionCount / rep.pollsCreated) * 100);
  rep.pollAccuracyScore = Math.min(100, Math.max(0, accuracy));

  await rep.save();
  return rep.pollAccuracyScore;
};

/**
 * Update reputation based on poll outcome
 * If user voted for winning option, they get reputation boost
 * @param {Object} poll - DoubtPoll document
 */
export const updateReputationFromPollOutcome = async (poll) => {
  if (!poll.winningOption || poll.status !== 'closed') {
    return;
  }

  // Find winning option
  const winningOption = poll.options.find((opt) => opt.text === poll.winningOption);
  if (!winningOption) return;

  // Reward users who voted for winning option
  for (const vote of winningOption.votes) {
    await addReputationPoints(vote.userId.toString(), 'correct_prediction');
  }

  // Mark creator as potentially helpful if consensus high
  if (poll.consensusPercentage > 75) {
    await addReputationPoints(poll.userId.toString(), 'helpful_answer');
  }
};

/**
 * Get user's room-specific reputation
 * @param {string} userId - User ID
 * @param {string} roomId - Room ID
 * @returns {Promise<Object>} - Room specific reputation data
 */
export const getRoomReputation = async (userId, roomId) => {
  const rep = await getOrCreateReputation(userId);

  const roomRep = rep.roomReputations.find((r) => r.roomId.toString() === roomId);

  if (roomRep) {
    // Update rank based on score
    if (roomRep.score < 100) roomRep.rank = 'Beginner';
    else if (roomRep.score < 500) roomRep.rank = 'Contributor';
    else if (roomRep.score < 2000) roomRep.rank = 'Expert';
    else roomRep.rank = 'Master';
    return roomRep;
  }

  // Create new room reputation
  const newRoomRep = {
    roomId,
    score: 0,
    rank: 'Beginner',
  };

  rep.roomReputations.push(newRoomRep);
  await rep.save();

  return newRoomRep;
};

/**
 * Get room leaderboard
 * @param {string} roomId - Room ID
 * @param {number} limit - Number of top users
 * @returns {Promise<Array>} - Leaderboard entries
 */
export const getRoomLeaderboard = async (roomId, limit = 10) => {
  const reps = await Reputation.find({})
    .populate('userId', 'name avatar')
    .limit(1000);

  // Calculate room-specific scores
  const leaderboard = reps
    .map((rep) => {
      const roomRep = rep.roomReputations.find((r) => r.roomId.toString() === roomId);
      return {
        user: rep.userId,
        score: rep.totalScore,
        tier: rep.getUserTier?.(),
        pollAccuracy: rep.pollAccuracyScore,
        trustScore: rep.trustScore,
        badges: rep.badges,
        helpfulAnswers: rep.helpfulAnswerCount,
      };
    })
    .filter((l) => l.user)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return leaderboard;
};

/**
 * Earn badge for special achievements
 * @param {string} userId - User ID
 * @param {string} badgeName - Badge name
 */
export const earnBadge = async (userId, badgeName) => {
  const rep = await getOrCreateReputation(userId);

  // Prevent duplicate badges
  if (rep.badges.find((b) => b.name === badgeName)) {
    return;
  }

  rep.badges.push({
    name: badgeName,
    earnedAt: new Date(),
  });

  await rep.save();
};

/**
 * Check if user has earned badge and award if needed
 * @param {string} userId - User ID
 */
export const checkAndAwardBadges = async (userId) => {
  const rep = await getOrCreateReputation(userId);

  const badges = [
    {
      name: 'First Poll',
      condition: (r) => r.pollsCreated === 1,
    },
    {
      name: 'Poll Master',
      condition: (r) => r.pollsCreated >= 10 && r.pollAccuracyScore >= 70,
    },
    {
      name: 'Helpful Guide',
      condition: (r) => r.helpfulAnswerCount >= 5,
    },
    {
      name: 'Code Reviewer',
      condition: (r) => r.prsCreated >= 3,
    },
    {
      name: 'Community Champion',
      condition: (r) => r.totalScore >= 1000,
    },
    {
      name: 'Trustworthy Mentor',
      condition: (r) => r.trustScore >= 80,
    },
  ];

  for (const badge of badges) {
    if (badge.condition(rep) && !rep.badges.find((b) => b.name === badge.name)) {
      await earnBadge(userId, badge.name);
    }
  }
};

/**
 * Calculate community trust score based on activities
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Trust score 0-100
 */
export const calculateTrustScore = async (userId) => {
  const rep = await getOrCreateReputation(userId);

  // Factors: accuracy, helpfulness, consistency
  const accuracyFactor = rep.pollAccuracyScore * 0.4;
  const helpfulnessFactor = Math.min(100, (rep.helpfulAnswerCount / Math.max(1, rep.messagesPosted)) * 100) * 0.3;
  const consistencyFactor = Math.min(100, (rep.messagesPosted / 50) * 100) * 0.3;

  rep.trustScore = Math.round(accuracyFactor + helpfulnessFactor + consistencyFactor);

  await rep.save();
  return rep.trustScore;
};

export default {
  getOrCreateReputation,
  addReputationPoints,
  calculatePollAccuracy,
  updateReputationFromPollOutcome,
  getRoomReputation,
  getRoomLeaderboard,
  earnBadge,
  checkAndAwardBadges,
  calculateTrustScore,
};
