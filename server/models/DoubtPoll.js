import mongoose from 'mongoose';

/**
 * DoubtPoll Model - THE KILLER FEATURE
 * Combines question + poll + AI analysis
 * When a user expresses doubt, a poll is created
 * Community votes, AI analyzes results and provides guided answer
 */
const doubtPollSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
      index: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      sparse: true,
      // Original question/doubt message
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The question/doubt
    question: {
      type: String,
      required: true,
      // e.g., "Should I refactor this function?"
    },
    context: {
      type: String,
      default: '',
      // Code snippet or additional context
    },
    // Poll options
    options: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        text: String,
        // e.g., "Yes, refactor it", "No, leave it", "Ask maintainer"
        votes: [
          {
            userId: mongoose.Schema.Types.ObjectId,
            weight: Number,
            // User reputation influences vote weight
          },
        ],
        voteCount: {
          type: Number,
          default: 0,
        },
        weightedScore: {
          type: Number,
          default: 0,
          // Sum of weighted votes
        },
      },
    ],
    // Results and AI analysis
    status: {
      type: String,
      enum: ['open', 'closed', 'resolved'],
      default: 'open',
    },
    totalVotes: {
      type: Number,
      default: 0,
    },
    consensusPercentage: {
      type: Number,
      default: 0,
      // Highest option vote percentage
    },
    winningOption: {
      type: String,
      default: '',
      // Text of most voted option
    },
    // AI Mentor Analysis (after poll closes or enough votes)
    aiAnalysis: {
      reasoning: String,
      // Why the community voted this way
      recommendation: String,
      // Final guidance considering poll + code context
      confidenceScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      considerationsFromVotes: [String],
      // What the community emphasized
      generatedAt: Date,
      model: {
        type: String,
        enum: ['openai', 'gemini'],
        default: 'openai',
      },
    },
    // Engagement metrics
    replyCount: {
      type: Number,
      default: 0,
    },
    helpful: {
      type: Boolean,
      default: null,
      // Did the community find this poll + AI answer helpful?
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    closeReason: {
      type: String,
      enum: ['consensus_reached', 'manually_closed', 'resolved'],
      default: null,
    },
    closedAt: Date,
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
doubtPollSchema.index({ roomId: 1, channelId: 1, createdAt: -1 });
doubtPollSchema.index({ userId: 1, createdAt: -1 });
doubtPollSchema.index({ status: 1 });

export default mongoose.model('DoubtPoll', doubtPollSchema);
