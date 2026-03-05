import mongoose from 'mongoose';

const aiResponseSchema = new mongoose.Schema(
  {
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poll',
      sparse: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      sparse: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['poll_analysis', 'onboarding', 'issue_help', 'pr_review', 'general'],
      default: 'poll_analysis',
      index: true,
    },
    summary: {
      type: String,
      required: true,
    },
    recommendation: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    reasoning: {
      type: String,
      default: '',
    },
    keyInsights: [String],
    commonThemes: [String],
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    model: {
      type: String,
      enum: ['openai', 'gemini'],
      default: 'openai',
    },
    metadata: {
      repoName: String,
      repoUrl: String,
      suggestedIssue: Number,
      difficulty: String,
      userReputation: Number,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('AIResponse', aiResponseSchema);

