import mongoose from 'mongoose';

/**
 * PRGuide Model - Live PR review + guidance
 * When a PR is linked, AI + community provides realtime feedback
 */
const prGuideSchema = new mongoose.Schema(
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
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    prNumber: {
      type: Number,
      required: true,
    },
    prUrl: {
      type: String,
      required: true,
    },
    prTitle: String,
    prDescription: String,
    // PR metadata
    fileCount: Number,
    additions: Number,
    deletions: Number,
    changedFiles: [String],
    // Checklist for PR quality
    checklist: [
      {
        item: String,
        // e.g., "Has tests", "Updated docs", "Follows style guide"
        completed: Boolean,
        weight: Number,
        // Importance factor
      },
    ],
    completionScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // Community feedback
    votes: {
      ready: {
        type: Number,
        default: 0,
      },
      needsWork: {
        type: Number,
        default: 0,
      },
      neutral: {
        type: Number,
        default: 0,
      },
    },
    feedbackMessages: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        message: String,
        type: String,
        // "suggestion", "issue", "praise"
        createdAt: Date,
      },
    ],
    // AI analysis
    aiReview: {
      summary: String,
      issues: [String],
      improvements: [String],
      praisedPoints: [String],
      readinessScore: Number,
      suggestions: [String],
      generatedAt: Date,
    },
    status: {
      type: String,
      enum: ['draft', 'under-review', 'approved', 'rejected', 'merged'],
      default: 'under-review',
    },
  },
  {
    timestamps: true,
  }
);

prGuideSchema.index({ roomId: 1, prNumber: 1 }, { unique: true });
prGuideSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('PRGuide', prGuideSchema);
