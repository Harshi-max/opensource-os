import mongoose from 'mongoose';

/**
 * Reputation model - tracks user contributions and credibility within the community
 * Higher reputation = more visibility for answers + ability to guide others
 */
const reputationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    // Activity breakdown
    messagesPosted: {
      type: Number,
      default: 0,
    },
    pollsCreated: {
      type: Number,
      default: 0,
    },
    votesGiven: {
      type: Number,
      default: 0,
    },
    answersUpvoted: {
      type: Number,
      default: 0,
    },
    prsCreated: {
      type: Number,
      default: 0,
    },
    // Scoring metrics
    pollAccuracyScore: {
      type: Number,
      default: 50, // Starts at 50, goes 0-100
      min: 0,
      max: 100,
    },
    helpfulAnswerCount: {
      type: Number,
      default: 0,
    },
    correctPredictionCount: {
      type: Number,
      default: 0,
    },
    // Badges
    badges: [
      {
        name: String,
        earnedAt: Date,
        // e.g., "First Poll", "Poll Master", "Helpful Guide", "Code Reviewer"
      },
    ],
    // Room-specific reputation
    roomReputations: [
      {
        roomId: mongoose.Schema.Types.ObjectId,
        score: Number,
        rank: String, // "Beginner", "Contributor", "Expert"
      },
    ],
    // Trust score for other users to weight their opinions
    trustScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    // Streak tracking
    activeStreak: {
      type: Number,
      default: 0,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate total score based on activities
reputationSchema.methods.calculateScore = function () {
  this.totalScore =
    this.messagesPosted * 5 +
    this.pollsCreated * 15 +
    this.votesGiven * 2 +
    this.answersUpvoted * 10 +
    this.prsCreated * 50 +
    this.helpfulAnswerCount * 25 +
    this.correctPredictionCount * 35;
  return this.totalScore;
};

// Get user tier based on score
reputationSchema.methods.getUserTier = function () {
  if (this.totalScore < 100) return 'Newcomer';
  if (this.totalScore < 500) return 'Contributor';
  if (this.totalScore < 2000) return 'Expert';
  return 'Master';
};

export default mongoose.model('Reputation', reputationSchema);
