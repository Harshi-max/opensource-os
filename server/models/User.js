import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
      // For GitHub-only accounts, password is optional
      required: function () {
        return !this.githubId;
      },
    },
    // Primary role for onboarding (admin, mentor, contributor)
    role: {
      type: String,
      enum: ['admin', 'mentor', 'contributor'],
      default: 'contributor',
    },
    // Backwards-compatible roles array used elsewhere in the app
    roles: {
      type: [String],
      default: [],
    },
    reputation: {
      type: Number,
      default: 0,
      min: 0,
    },
    avatar: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // GitHub identity binding
    githubUsername: {
      type: String,
      index: true,
      sparse: true,
    },
    githubId: {
      type: String,
      unique: true,
      sparse: true,
    },
    githubAvatar: {
      type: String,
      default: null,
    },
    // Encrypted GitHub access token (never returned in queries by default)
    githubAccessToken: {
      type: String,
      select: false,
      default: null,
    },
    // Contribution analytics
    prCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (passwordToCheck) {
  if (!this.password) {
    // GitHub-only accounts do not support password login
    return false;
  }
  return await bcryptjs.compare(passwordToCheck, this.password);
};

// Remove password from JSON response
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.githubAccessToken;
  return user;
};

export default mongoose.model('User', userSchema);
