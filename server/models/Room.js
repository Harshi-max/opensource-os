import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    repoName: {
      type: String,
      required: true,
      index: true,
    },
    repoUrl: {
      type: String,
      required: true,
      unique: true,
    },
    repoOwner: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      default: 'Unknown',
    },
    stars: {
      type: Number,
      default: 0,
    },
    forks: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      topics: [String],
      license: String,
      homepageUrl: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Room', roomSchema);
