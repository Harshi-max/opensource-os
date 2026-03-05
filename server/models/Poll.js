import mongoose from 'mongoose';

const pollSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        text: String,
        voteCount: {
          type: Number,
          default: 0,
        },
      },
    ],
    votes: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        selectedOptionId: mongoose.Schema.Types.ObjectId,
        votedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isClosed: {
      type: Boolean,
      default: false,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    totalVotes: {
      type: Number,
      default: 0,
    },
    aiResponse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AIResponse',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying open polls
pollSchema.index({ roomId: 1, isClosed: 1, expiresAt: 1 });

export default mongoose.model('Poll', pollSchema);
