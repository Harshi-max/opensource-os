import { asyncHandler } from '../middleware/errorHandler.js';
import { Room, Message, AIResponse, Channel, Meeting, PullRequest, User } from '../models/index.js';
import {
  fetchRepoMetadata,
  validateGitHubUrl,
  fetchRepoIssues,
  fetchRepoPullRequests,
  fetchRepoContributors,
  fetchRepoInsights,
  fetchPRStats,
} from '../services/githubService.js';
import mongoose from 'mongoose';

/**
 * Create a new room from GitHub repo
 * POST /api/rooms
 */
export const createRoom = asyncHandler(async (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: 'Repository URL is required' });
  }

  // Validate GitHub URL
  const urlParts = validateGitHubUrl(repoUrl);
  if (!urlParts) {
    return res.status(400).json({ error: 'Invalid GitHub URL format' });
  }

  // Check if room already exists
  const existingRoom = await Room.findOne({ repoUrl });
  if (existingRoom) {
    return res.status(400).json({ error: 'Room for this repository already exists' });
  }

  // Fetch repo metadata from GitHub
  try {
    const repoData = await fetchRepoMetadata(urlParts.owner, urlParts.repo);

    const room = new Room({
      ...repoData,
      createdBy: req.userId,
      members: [req.userId],
    });

    await room.save();

    // Automatically initialize default channels for the new room
    const defaultChannels = [
      { name: 'general', displayName: 'General', icon: '💬', order: 0 },
      { name: 'setup-help', displayName: 'Setup Help', icon: '⚙️', order: 1 },
      { name: 'issue-discussion', displayName: 'Issue Discussion', icon: '🐛', order: 2 },
      { name: 'pr-review', displayName: 'PR Review', icon: '📝', order: 3 },
      { name: 'code-review', displayName: 'Code Review', icon: '👀', order: 4 },
      { name: 'troubleshooting', displayName: 'Troubleshooting', icon: '🚨', order: 5 },
    ];

    await Channel.insertMany(
      defaultChannels.map((ch) => ({
        ...ch,
        roomId: room._id,
      }))
    );

    await room.populate('createdBy', 'name avatar');

    res.status(201).json(room);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

/**
 * Get all rooms
 * GET /api/rooms
 */
export const getAllRooms = asyncHandler(async (req, res) => {
  const { search } = req.query;

  let query = { isActive: true };

  if (search) {
    query.$or = [
      { repoName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { repoOwner: { $regex: search, $options: 'i' } },
    ];
  }

  const rooms = await Room.find(query)
    .populate('createdBy', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(50);

  res.json(rooms);
});

/**
 * Get single room
 * GET /api/rooms/:roomId
 */
export const getRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId)
    .populate('createdBy', 'name avatar')
    .populate('members', 'name avatar reputation');

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json(room);
});

/**
 * Join a room
 * POST /api/rooms/:roomId/join
 */
export const joinRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Add user to members if not already there
  if (!room.members.includes(req.userId)) {
    room.members.push(req.userId);
    await room.save();
  }

  await room.populate('createdBy', 'name avatar');
  await room.populate('members', 'name avatar reputation');

  res.json(room);
});

/**
 * Leave a room
 * POST /api/rooms/:roomId/leave
 */
export const leaveRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findByIdAndUpdate(
    roomId,
    { $pull: { members: req.userId } },
    { new: true }
  )
    .populate('createdBy', 'name avatar')
    .populate('members', 'name avatar reputation');

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json(room);
});

/**
 * Get room members
 * GET /api/rooms/:roomId/members
 */
export const getRoomMembers = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId).populate('members', 'name avatar reputation');

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json(room.members);
});

/**
 * Get room messages
 * GET /api/rooms/:roomId/messages
 */
export const getRoomMessages = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { limit = 50, skip = 0 } = req.query;

  const messages = await Message.find({ roomId })
    .populate('userId', 'name avatar reputation')
    .sort({ createdAt: -1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit));

  res.json(messages.reverse());
});

/**
 * Get GitHub issues for a room
 * GET /api/rooms/:roomId/issues
 */
export const getRoomIssues = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { limit = 15 } = req.query;

  const room = await Room.findById(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  try {
    const issues = await fetchRepoIssues(room.repoOwner, room.repoName, parseInt(limit));
    res.json(issues);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get GitHub pull requests for a room
 * GET /api/rooms/:roomId/pull-requests
 */
export const getRoomPullRequests = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { limit = 15 } = req.query;

  const room = await Room.findById(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  try {
    const pullRequests = await fetchRepoPullRequests(room.repoOwner, room.repoName, parseInt(limit));
    res.json(pullRequests);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get GitHub stats and contributors for a room
 * GET /api/rooms/:roomId/github-stats
 */
export const getGitHubStats = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  try {
    const [insights, contributors, prStats, prDocs, linkedContributors] = await Promise.all([
      fetchRepoInsights(room.repoOwner, room.repoName),
      fetchRepoContributors(room.repoOwner, room.repoName, 10),
      fetchPRStats(room.repoOwner, room.repoName),
      PullRequest.find({ roomId: room._id }).lean(),
      User.countDocuments({
        _id: { $in: room.members },
        githubUsername: { $exists: true, $ne: null },
      }),
    ]);

    const totalLocalPRs = prDocs.length;
    const conflictCount = prDocs.filter((p) => p.hasConflicts).length;
    const mergedLocal = prDocs.filter((p) => p.status === 'merged').length;
    const closedUnmergedLocal = prDocs.filter((p) => p.status === 'closed').length;

    const resolved = prDocs.filter(
      (p) => p.openedAt && (p.mergedAt || p.closedAt)
    );
    let avgResolutionHours = 0;
    if (resolved.length > 0) {
      const totalMs = resolved.reduce((sum, p) => {
        const end = p.mergedAt || p.closedAt;
        return sum + (end.getTime() - p.openedAt.getTime());
      }, 0);
      avgResolutionHours = totalMs / resolved.length / (1000 * 60 * 60);
    }

    const activeAuthors = new Set(
      prDocs.filter((p) => p.status === 'open' && p.authorUsername).map((p) => p.authorUsername)
    ).size;

    res.json({
      totalPRs: (prStats.openPRs || 0) + (prStats.closedPRs || 0),
      mergedPRs: prStats.mergedPRs || 0,
      openPRs: prStats.openPRs || 0,
      closedPRs: (prStats.closedPRs || 0) - (prStats.mergedPRs || 0),
      totalIssues: insights.openIssues || 0,
      contributors: contributors,
      recentPRs: prStats.recentPRs || [],
      repoName: room.repoName,
      repoUrl: room.repoUrl,
      stars: room.stars,
      forks: room.forks,
      language: room.language,
      prAnalytics: {
        linkedContributors,
        activePRAuthors: activeAuthors,
        conflictRate: totalLocalPRs ? conflictCount / totalLocalPRs : 0,
        mergeSuccessRate:
          mergedLocal + closedUnmergedLocal > 0
            ? mergedLocal / (mergedLocal + closedUnmergedLocal)
            : 0,
        averageResolutionHours: Number(avgResolutionHours.toFixed(2)),
      },
    });
  } catch (error) {
    console.error('GitHub stats error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get onboarding analytics for a room
 * GET /api/rooms/:roomId/analytics
 */
export const getOnboardingAnalytics = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  try {
    // Get all onboarding responses for this room
    const onboardingResponses = await AIResponse.find({
      roomId,
      type: 'onboarding',
    }).populate('userId', 'name reputation');

    // Count onboarding requests
    const onboardingRequestCount = onboardingResponses.length;

    // Get unique users who requested onboarding
    const uniqueUsers = new Set(onboardingResponses.map((r) => r.userId?._id.toString()));
    const uniqueUserCount = uniqueUsers.size;

    // Analyze confusion keywords from AI responses
    const commonDifficulties = {};
    onboardingResponses.forEach((response) => {
      const difficulty = response.metadata?.difficulty || 'unknown';
      commonDifficulties[difficulty] = (commonDifficulties[difficulty] || 0) + 1;
    });

    // Get most recent roadmap
    const mostRecentRoadmap = onboardingResponses.length > 0 ? onboardingResponses[0] : null;

    // Count active contributors with reputation > 50 who initiated onboarding
    const activeContributors = onboardingResponses.filter((r) => r.userId?.reputation > 50).length;

    res.json({
      roomName: room.repoName,
      onboardingRequests: onboardingRequestCount,
      uniqueNewcomers: uniqueUserCount,
      activeContributorsRequesting: activeContributors,
      difficultyDistribution: commonDifficulties,
      mostRecentRoadmap: mostRecentRoadmap ? {
        requestedBy: mostRecentRoadmap.userId?.name,
        suggestedIssue: mostRecentRoadmap.metadata?.suggestedIssue,
        createdAt: mostRecentRoadmap.createdAt,
      } : null,
      totalMessages: await Message.countDocuments({ roomId }),
      totalAIResponses: await AIResponse.countDocuments({ roomId }),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all meeting summaries (across all or specific room)
 * GET /api/rooms/meeting-summaries or /api/rooms/:roomId/meeting-summaries
 */
export const getMeetingSummaries = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  let query = {
    status: 'ended',        // Only ended meetings
    $and: [
      { summary: { $exists: true } },
      { summary: { $ne: null } },
      { summary: { $ne: '' } }
    ]
  };

  if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
    query.roomId = new mongoose.Types.ObjectId(roomId);
  }

  console.log('Fetching meeting summaries with query:', JSON.stringify(query));

  const meetings = await Meeting.find(query)
    .populate('roomId', 'name repoName')
    .populate('startedBy', 'name')
    .sort({ endTime: -1 })
    .limit(20)
    .lean();

  console.log(`Found ${meetings.length} meetings with summaries`);

  const summaries = meetings.map((meeting) => ({
    _id: meeting._id,
    roomName: meeting.roomId?.name || meeting.roomId?.repoName || 'Unknown Room',
    roomId: meeting.roomId?._id,
    title: meeting.title || 'Untitled Meeting',
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    summary: meeting.summary,
    analysis: meeting.analysis,
    startedBy: meeting.startedBy?.name || 'Unknown',
  }));

  res.json(summaries);
});

/**
 * Debug endpoint - Get ALL meetings (regardless of status) for debugging
 * GET /api/rooms/debug/all-meetings
 */
export const getAllMeetingsDebug = asyncHandler(async (req, res) => {
  const meetings = await Meeting.find()
    .populate('roomId', 'name repoName')
    .populate('startedBy', 'name')
    .sort({ startTime: -1 })
    .lean();

  console.log(`[DEBUG] Total meetings in DB: ${meetings.length}`);
  const summary = {
    total: meetings.length,
    byStatus: {
      active: meetings.filter(m => m.status === 'active').length,
      ended: meetings.filter(m => m.status === 'ended').length,
    },
    meetings: meetings.map(m => ({
      _id: m._id,
      title: m.title,
      status: m.status,
      hasEndTime: !!m.endTime,
      hasSummary: !!m.summary,
      hasSummaryText: m.summary ? (m.summary.length > 0) : false,
      hasAnalysis: !!m.analysis,
      roomName: m.roomId?.name || m.roomId?.repoName || 'Unknown',
      startTime: m.startTime,
      endTime: m.endTime,
    }))
  };

  res.json(summary);
});
