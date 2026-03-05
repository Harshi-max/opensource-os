import mongoose from 'mongoose';

const pullRequestSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      index: true,
      default: null,
    },
    repoOwner: {
      type: String,
      required: true,
    },
    repoName: {
      type: String,
      required: true,
    },
    githubId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    number: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      default: '',
    },
    url: {
      type: String,
      required: true,
    },
    authorUsername: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'merged'],
      default: 'open',
      index: true,
    },
    hasConflicts: {
      type: Boolean,
      default: false,
      index: true,
    },
    openedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    mergedAt: {
      type: Date,
      default: null,
    },
    lastEventAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

pullRequestSchema.index({ roomId: 1, status: 1 });
pullRequestSchema.index({ roomId: 1, hasConflicts: 1 });

export default mongoose.model('PullRequest', pullRequestSchema);

