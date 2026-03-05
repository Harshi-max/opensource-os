import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
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
    content: {
      type: String,
      trim: true,
      // content is required for text messages but audio messages may be
      // empty. we keep default empty string so validation passes for audio.
      default: '',
    },
    // optional audio message
    isAudio: {
      type: Boolean,
      default: false,
    },
    audioUrl: {
      type: String,
      default: null,
    },
    audioDuration: {
      type: Number,
      default: 0,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient room message queries
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ mentions: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
