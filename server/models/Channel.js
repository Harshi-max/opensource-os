import mongoose from 'mongoose';

/**
 * Channel model for room-based discussions
 * Represents topic-specific channels within a room (e.g., #setup-help, #issue-discussion)
 */
const channelSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      // Built-in channels
      enum: ['general', 'setup-help', 'issue-discussion', 'pr-review', 'code-review', 'troubleshooting'],
    },
    displayName: {
      type: String,
      required: true,
      // e.g., "Setup Help", "Issue Discussion", "PR Review"
    },
    description: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: '💬',
      // Emoji icon for the channel
    },
    messageCount: {
      type: Number,
      default: 0,
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
      // For sorting channels
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
channelSchema.index({ roomId: 1, name: 1 }, { unique: true });

export default mongoose.model('Channel', channelSchema);
