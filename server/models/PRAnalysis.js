import mongoose from 'mongoose';

const prAnalysisSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    githubPRUrl: {
      type: String,
      required: true,
    },
    owner: String,
    repo: String,
    prNumber: Number,
    prTitle: String,
    prDescription: String,
    author: String,
    baseBranch: String,
    headBranch: String,

    // Scoring Engine Results
    readinessScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    blockingIssues: [
      {
        severity: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
        title: String,
        description: String,
      },
    ],
    mergeProbability: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    scoring: {
      linesChanged: Number,
      filesChanged: Number,
      hasTests: Boolean,
      ciStatus: { type: String, enum: ['passed', 'failed', 'pending', 'unknown'] },
      scopeCreep: { type: Number, min: 0, max: 100 },
    },

    // AI Analysis Results
    maintainerReview: {
      comments: [
        {
          line: Number,
          file: String,
          suggestion: String,
          severity: String,
        },
      ],
      summary: String,
    },
    explanations: {
      beginner: String,
      intermediate: String,
      advanced: String,
    },
    cleanPRDescription: String,

    // Metadata
    analysisStatus: {
      type: String,
      enum: ['pending', 'analyzing', 'completed', 'failed'],
      default: 'pending',
    },
    error: String,
    analyzedAt: Date,
  },
  { timestamps: true }
);

// Indexes for fast queries
prAnalysisSchema.index({ roomId: 1, createdAt: -1 });
prAnalysisSchema.index({ userId: 1, createdAt: -1 });
prAnalysisSchema.index({ githubPRUrl: 1 }, { unique: false });

export default mongoose.model('PRAnalysis', prAnalysisSchema);
