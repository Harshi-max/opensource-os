import { Message, Poll, User, Room, AIResponse } from '../models/index.js';
import { verifyToken } from '../services/authService.js';
import { classifyIntent } from '../services/intentClassifier.js';
import { generateContributionRoadmap, filterIssuesByReputation } from '../services/contributionEngine.js';
import { getBeginnerIssues, fetchRepoMetadata, fetchRepoReadme } from '../services/githubService.js';

/**
 * Initialize Socket.IO handlers
 */
export const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    /**
     * User joins a room
     */
    socket.on('join-room', async (data) => {
      const { roomId, userId } = data;

      try {
        const user = await User.findById(userId);
        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        socket.join(`room-${roomId}`);
        socket.user = { id: userId, name: user.name, avatar: user.avatar };

        // Notify room that user joined
        io.to(`room-${roomId}`).emit('user-joined', {
          userId,
          userName: user.name,
          userAvatar: user.avatar,
          timestamp: new Date(),
        });

        console.log(`User ${user.name} joined room ${roomId}`);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * User leaves a room
     */
    socket.on('leave-room', (data) => {
      const { roomId, userId } = data;

      socket.leave(`room-${roomId}`);

      io.to(`room-${roomId}`).emit('user-left', {
        userId,
        timestamp: new Date(),
      });

      console.log(`User ${userId} left room ${roomId}`);
    });

    /**
     * Receive and broadcast message
     * ENHANCED: Detects onboarding intent and generates contribution roadmap
     */
    socket.on('send-message', async (data) => {
      const { roomId, content, userId } = data;

      try {
        const user = await User.findById(userId);
        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        // Save message to database
        const message = new Message({
          roomId,
          userId,
          content,
        });

        await message.save();

        // Broadcast message to room
        io.to(`room-${roomId}`).emit('new-message', {
          _id: message._id,
          content: message.content,
          userId,
          userName: user.name,
          userAvatar: user.avatar,
          userReputation: user.reputation,
          createdAt: message.createdAt,
        });

        console.log(`Message in room ${roomId}: ${content.substring(0, 50)}`);

        // ===== INTENT CLASSIFICATION & ONBOARDING ENGINE =====
        // Classify user intent asynchronously (non-blocking)
        try {
          const intent = await classifyIntent(content);

          if (intent === 'onboarding') {
            console.log(`🚀 Onboarding intent detected from ${user.name}`);

            // Fetch room and repo data
            const room = await Room.findById(roomId);
            if (!room || !room.repoUrl) {
              console.warn(`Room ${roomId} has no repo URL configured`);
              return;
            }

            // Parse GitHub URL
            const urlMatch = room.repoUrl.match(/github\.com\/([^/]+)\/([^/]+)\/?$/);
            if (!urlMatch) {
              console.warn(`Invalid GitHub URL: ${room.repoUrl}`);
              return;
            }

            const [, owner, repo] = urlMatch;

            // Fetch GitHub data in parallel
            const [repoData, beginnerIssues, readme] = await Promise.all([
              fetchRepoMetadata(owner, repo).catch(() => null),
              getBeginnerIssues(owner, repo).catch(() => []),
              fetchRepoReadme(owner, repo).catch(() => ''),
            ]);

            if (!repoData) {
              console.error(`Failed to fetch repo data for ${owner}/${repo}`);
              return;
            }

            // Filter issues based on user reputation
            const filteredIssues = filterIssuesByReputation(beginnerIssues, user.reputation);

            if (filteredIssues.length === 0) {
              console.warn(`No beginner issues found for ${owner}/${repo}`);
              return;
            }

            // Generate contribution roadmap
            const roadmap = await generateContributionRoadmap(user, repoData, filteredIssues, readme);

            // Save AI response to database
            const aiResponse = new AIResponse({
              roomId,
              userId,
              messageId: message._id,
              type: 'onboarding',
              summary: `Contribution roadmap for ${repoData.repoName}`,
              recommendation: `Start with issue #${roadmap.suggestedIssue}`,
              content: roadmap.content,
              confidenceScore: roadmap.confidenceScore,
              model: 'openai',
              metadata: {
                repoName: roadmap.repoName,
                repoUrl: roadmap.repoUrl,
                suggestedIssue: roadmap.suggestedIssue,
                difficulty: roadmap.difficulty,
                userReputation: user.reputation,
              },
            });

            await aiResponse.save();

            // Broadcast AI response to room via Socket.IO
            io.to(`room-${roomId}`).emit('ai-response', {
              _id: aiResponse._id,
              type: 'onboarding',
              summary: aiResponse.summary,
              content: aiResponse.content,
              repoName: repoData.repoName,
              suggestedIssue: roadmap.suggestedIssue,
              difficulty: roadmap.difficulty,
              createdAt: aiResponse.createdAt,
              triggeredBy: user.name,
            });

            console.log(`✅ Contribution roadmap generated and broadcasted`);
          }
        } catch (intentError) {
          console.error('Intent classification error:', intentError.message);
          // Non-critical error - don't block message delivery
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Typing indicator
     */
    socket.on('typing', (data) => {
      const { roomId, userId, isTyping } = data;

      io.to(`room-${roomId}`).emit('user-typing', {
        userId,
        isTyping,
      });
    });

    /**
     * User votes in a poll
     */
    socket.on('cast-vote', async (data) => {
      const { pollId, roomId, userId, selectedOptionId } = data;

      try {
        const poll = await Poll.findById(pollId);
        if (!poll) {
          socket.emit('error', { message: 'Poll not found' });
          return;
        }

        // Check if user already voted
        const existingVote = poll.votes.find((v) => v.userId.toString() === userId.toString());

        if (existingVote) {
          existingVote.selectedOptionId = selectedOptionId;
        } else {
          poll.votes.push({
            userId,
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

        // Broadcast updated poll to room
        io.to(`room-${roomId}`).emit('poll-updated', {
          pollId: poll._id,
          options: poll.options,
          totalVotes: poll.totalVotes,
          isClosed: poll.isClosed,
        });

        console.log(`Vote cast in poll ${pollId}`);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Poll closed - AI recommendation generated
     */
    socket.on('poll-closed', (data) => {
      const { roomId, pollId, aiResponse } = data;

      io.to(`room-${roomId}`).emit('ai-decision', {
        pollId,
        recommendation: aiResponse.recommendation,
        confidenceScore: aiResponse.confidenceScore,
        summary: aiResponse.summary,
        keyInsights: aiResponse.keyInsights,
      });

      console.log(`Poll ${pollId} closed - AI decision generated`);
    });

    /**
     * User disconnects
     */
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });

    /**
     * Error handling
     */
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};
