import { asyncHandler } from '../middleware/errorHandler.js';
import { Poll, AIResponse, Message, Room } from '../models/index.js';
import mongoose from 'mongoose';
import { generateAIRecommendation } from '../services/aiService.js';

/**
 * Create a new poll
 * POST /api/polls
 */
export const createPoll = asyncHandler(async (req, res) => {
  const { roomId, question, options, expiresInMinutes = 30 } = req.body;

  if (!roomId || !question || !options || options.length < 2) {
    return res.status(400).json({ error: 'Room ID, question, and at least 2 options are required' });
  }

  // Verify room exists
  const room = await Room.findById(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Create poll with auto-generated option IDs
  const pollOptions = options.map((text) => ({
    _id: new mongoose.Types.ObjectId(),
    text,
    voteCount: 0,
  }));

  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const poll = new Poll({
    roomId,
    question,
    options: pollOptions,
    expiresAt,
    createdBy: req.userId,
  });

  await poll.save();
  await poll.populate('createdBy', 'name avatar');

  res.status(201).json(poll);
});

/**
 * Get polls in a room
 * GET /api/rooms/:roomId/polls
 */
export const getRoomPolls = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { includeClosedPolls = false } = req.query;

  let query = { roomId };

  if (includeClosedPolls === 'false') {
    query.isClosed = false;
  }

  const polls = await Poll.find(query)
    .populate('createdBy', 'name avatar')
    .populate('aiResponse')
    .sort({ createdAt: -1 });

  res.json(polls);
});

/**
 * Get single poll
 * GET /api/polls/:pollId
 */
export const getPoll = asyncHandler(async (req, res) => {
  const { pollId } = req.params;

  const poll = await Poll.findById(pollId)
    .populate('createdBy', 'name avatar')
    .populate('aiResponse')
    .populate('votes.userId', 'name avatar');

  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }

  res.json(poll);
});

/**
 * Cast vote in a poll
 * POST /api/polls/:pollId/vote
 */
export const castVote = asyncHandler(async (req, res) => {
  const { pollId } = req.params;
  const { selectedOptionId } = req.body;

  if (!selectedOptionId) {
    return res.status(400).json({ error: 'Selected option is required' });
  }

  const poll = await Poll.findById(pollId);

  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }

  if (poll.isClosed) {
    return res.status(400).json({ error: 'Poll is closed' });
  }

  // Check if user already voted
  const existingVote = poll.votes.find((v) => v.userId.toString() === req.userId.toString());

  if (existingVote) {
    // Update existing vote
    existingVote.selectedOptionId = selectedOptionId;
  } else {
    // Add new vote
    poll.votes.push({
      userId: req.userId,
      selectedOptionId,
    });
  }

  // Recalculate vote counts
  const voteCounts = {};
  poll.votes.forEach((vote) => {
    const optId = vote.selectedOptionId.toString();
    voteCounts[optId] = (voteCounts[optId] || 0) + 1;
  });

  // Update option vote counts
  poll.options.forEach((opt) => {
    opt.voteCount = voteCounts[opt._id.toString()] || 0;
  });

  poll.totalVotes = poll.votes.length;
  await poll.save();

  await poll.populate('createdBy', 'name avatar');
  res.json(poll);
});

/**
 * Close poll and generate AI recommendation
 * POST /api/polls/:pollId/close
 */
export const closePoll = asyncHandler(async (req, res) => {
  const { pollId } = req.params;

  const poll = await Poll.findById(pollId).populate('roomId').populate('createdBy', 'name');

  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }

  // Only the poll creator or admin can close the poll
  if (poll.createdBy._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Only poll creator can close this poll' });
  }

  if (poll.isClosed) {
    return res.status(400).json({ error: 'Poll is already closed' });
  }

  // Mark poll as closed
  poll.isClosed = true;
  poll.closedAt = new Date();
  await poll.save();

  // Generate AI recommendation
  try {
    const recentMessages = await Message.find({ roomId: poll.roomId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(20);

    const chatMessages = recentMessages.map((msg) => ({
      userName: msg.userId.name,
      content: msg.content,
    }));

    const pollData = {
      question: poll.question,
      options: poll.options,
      totalVotes: poll.totalVotes,
    };

    const aiRecommendation = await generateAIRecommendation(pollData, chatMessages);

    const aiResponse = new AIResponse({
      pollId: poll._id,
      roomId: poll.roomId,
      ...aiRecommendation,
    });

    await aiResponse.save();
    poll.aiResponse = aiResponse._id;
    await poll.save();

    await poll.populate('aiResponse');
  } catch (error) {
    console.error('AI recommendation generation failed:', error);
    // Continue without AI response if service fails
  }

  await poll.populate('createdBy', 'name avatar');
  res.json(poll);
});

/**
 * Get AI response for a poll
 * GET /api/polls/:pollId/ai-response
 */
export const getPollAIResponse = asyncHandler(async (req, res) => {
  const { pollId } = req.params;

  const aiResponse = await AIResponse.findOne({ pollId });

  if (!aiResponse) {
    return res.status(404).json({ error: 'No AI response available for this poll' });
  }

  res.json(aiResponse);
});
