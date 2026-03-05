import { Message, User, Room, DoubtPoll, Channel, Reputation } from '../models/index.js';
import { isDoubtMessage, suggestPollOptions, analyzeDoubtAndGenerateMentorResponse } from '../services/aiMentorService.js';
import { generateSpeech } from '../services/ttsService.js';
import { addReputationPoints } from '../services/reputationService.js';
import { getGitHubAnalytics } from '../services/githubAnalyticsService.js';

/**
 * Enhanced Socket.IO handlers for real-time doubt polling
 * KILLER FEATURES:
 * - Auto-detect doubt messages
 * - Real-time poll creation
 * - Live vote updates
 * - AI mentor analysis
 */

export const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`✨ User connected: ${socket.id}`);

    /**
     * Register socket for user-specific events (notifications, mention-only messages)
     * Call this when user is logged in so they receive notifications even when not in a room
     */
    socket.on('register-user', (data) => {
      const userId = data?.userId;
      if (userId) {
        socket.join(`user-${userId}`);
        socket.userId = userId;
        console.log(`📌 User ${userId} registered for notifications`);
      }
    });

    /**
     * User joins a room
     */
    socket.on('join-room', async (data) => {
      const { roomId, userId } = data;

      try {
        // load both user and room to use room metadata safely
        const [user, room] = await Promise.all([User.findById(userId), Room.findById(roomId)]);
        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        socket.join(`room-${roomId}`);
        socket.join(`user-${userId}`);
        socket.user = { id: userId, name: user.name, avatar: user.avatar };

        io.to(`room-${roomId}`).emit('user-joined', {
          userId,
          userName: user.name,
          userAvatar: user.avatar,
          timestamp: new Date(),
        });

        console.log(`👤 ${user.name} joined room ${roomId}`);

        // if room is tied to a GitHub repo, ask newcomer if they are a contributor
        if (room && room.repoOwner && room.repoName) {
          socket.awaitingContributorConfirmation = true;
          io.to(`room-${roomId}`).emit('bot-answer', {
            type: 'question',
            question: `@${user.name}, are you a contributor to ${room.repoOwner}/${room.repoName}? Please reply "yes" or "no".`,
            answer: '',
            askedBy: 'Bot',
            timestamp: new Date(),
          });
        }
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
      // Note: we don't leave user-${userId} on room leave - user stays in that for notifications
      io.to(`room-${roomId}`).emit('user-left', {
        userId,
        timestamp: new Date(),
      });
      console.log(`👋 User ${userId} left room ${roomId}`);
    });

    /**
     * Broadcast message (from HTTP create flow) - supports mention-only visibility
     * If mentions: emit only to sender + mentioned users; else broadcast to room
     */
    socket.on('new-message', (data) => {
      const { roomId, userId, userName, content, messageId, mentions = [], userAvatar } = data;
      const payload = {
        messageId: messageId || data._id,
        roomId,
        userId,
        userName,
        content,
        timestamp: new Date(),
        userAvatar,
      };
      const mentionIds = Array.isArray(mentions) ? mentions.map((m) => (typeof m === 'object' && m?._id ? m._id : m)) : [];
      if (mentionIds.length > 0) {
        const targets = [...new Set([userId, ...mentionIds])];
        targets.forEach((id) => io.to(`user-${id}`).emit('message', payload));
      } else {
        io.to(`room-${roomId}`).emit('message', payload);
      }
    });

    /**
     * ⭐ BOT MENTION HANDLER - When user tags @bot, provide direct AI answer
     * This ensures immediate response when @bot is mentioned
     */
    socket.on('bot-mention', async (data) => {
      const { roomId, channelId, content, userId } = data;

      try {
        const [user, room] = await Promise.all([User.findById(userId), Room.findById(roomId)]);

        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        console.log(`🤖 @bot answer requested from ${user.name}: "${content.substring(0, 50)}..."`);

        // Generate direct AI answer (not a poll)
        let answer = '';
        try {
          // Use the AI mentor service to generate a thoughtful response
          const analysis = await analyzeDoubtAndGenerateMentorResponse(
            { question: content, options: [], totalVotes: 0 },
            user
          );

          // Helper: format analysis into a clear, numbered step-by-step message
          const formatAnalysis = (a) => {
            if (!a) return '';
            const sections = [];

            if (a.reason) {
              sections.push(`Reason: ${a.reason}`);
            }

            if (a.recommendation) {
              const rec = String(a.recommendation).trim();
              // If the recommendation already contains numbered list or newlines, keep it
              if (/\d+\.|\n/.test(rec)) {
                sections.push(`Recommendation:\n${rec}`);
              } else {
                // Split into sentences and number them for clarity
                const sentences = rec.split(/(?<=[.?!])\s+/).filter(Boolean);
                if (sentences.length > 1) {
                  const numbered = sentences.map((s, i) => `${i + 1}. ${s}`).join('\n');
                  sections.push(`Recommendation:\n${numbered}`);
                } else {
                  sections.push(`Recommendation: ${rec}`);
                }
              }
            }

            if (Array.isArray(a.keyInsights) && a.keyInsights.length) {
              const insights = a.keyInsights.map((k, i) => `${i + 1}. ${k}`).join('\n');
              sections.push(`Key insights:\n${insights}`);
            }

            if (a.confidenceScore !== undefined) {
              sections.push(`Confidence: ${a.confidenceScore}%`);
            }

            return sections.join('\n\n');
          };

          answer = formatAnalysis(analysis) || 'I can help with that. Could you provide more details?';
        } catch (aiError) {
          console.error('AI answer generation failed:', aiError.message);
          if (aiError.message.toLowerCase().includes('rate limit')) {
            answer = 'Sorry, the AI service is currently rate limited. Please try again in a moment.';
          } else {
            // give user insight into what went wrong
            answer = `I tried fetching an answer but encountered an error: ${aiError.message}. Feel free to try rephrasing or come back later.`;
          }
        }

        // Broadcast bot answer directly (no poll)
        io.to(`room-${roomId}`).emit('bot-answer', {
          type: 'direct-answer',
          question: content,
          answer: answer,
          askedBy: user.name,
          avatarUrl: user.avatar,
          timestamp: new Date(),
        });

        // in background try to generate a TTS audio file and broadcast it
        setImmediate(async () => {
          try {
            const audioUrl = await generateSpeech(answer);
            io.to(`room-${roomId}`).emit('bot-audio', {
              audioUrl,
              timestamp: new Date(),
            });
          } catch (ttsErr) {
            console.warn('TTS generation skipped:', ttsErr.message);
          }
        });

        console.log(`✅ @bot answered: "${answer.substring(0, 50)}..."`);

        // Add reputation for asking
        await addReputationPoints(userId, 'question_asked');

      } catch (error) {
        console.error('❌ Bot answer error:', error.message);
        socket.emit('error', { message: `Failed to answer question: ${error.message}` });
      }
    });

    /**
     * ⭐ MAIN FEATURE: Send message + auto-detect doubts + create polls
     * This is where the magic happens - real-time doubt polling
     */
    socket.on('send-message', async (data) => {
      const { roomId, channelId, content, userId } = data;

      try {
        const [user, room] = await Promise.all([User.findById(userId), Room.findById(roomId)]);

        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        // handle contributor confirmation if pending
        if (socket.awaitingContributorConfirmation) {
          const reply = content.trim().toLowerCase();
          if (reply === 'yes' || reply === 'no') {
            socket.awaitingContributorConfirmation = false;
            if (reply === 'yes') {
              user.roles = Array.from(new Set([...(user.roles || []), 'contributor']));
              await user.save();
              io.to(`room-${roomId}`).emit('bot-answer', {
                type: 'info',
                question: '',
                answer: `Thanks ${user.name}! I've marked you as a contributor. Feel free to ask or answer questions.`,
                askedBy: 'Bot',
                timestamp: new Date(),
              });
            } else {
              user.roles = Array.from(new Set([...(user.roles || []), 'mentor']));
              await user.save();
              // give mentor a quick repo summary
              let summary = '';
              try {
                const analyticsResp = await getGitHubAnalytics(room.repoOwner, room.repoName);
                const st = analyticsResp.stats;
                summary = `Repo summary: ${st.totalContributors} contributors, ${st.openPRs} open PRs, ${st.mergedPRs} merged, ${st.closedUnmergedPRs} closed unmerged, ${st.unlabeledPRs} unlabeled.`;
              } catch (err) {
                summary = 'Could not fetch repo summary.';
              }
              io.to(`room-${roomId}`).emit('bot-answer', {
                type: 'info',
                question: '',
                answer: `No worries ${user.name}, I've assigned you the mentor role. You can help guide others!\n${summary}`,
                askedBy: 'Bot',
                timestamp: new Date(),
              });
            }
          }
        }

        // Save message to database
        const message = new Message({
          roomId,
          content,
          userId,
        });
        await message.save();

        // Broadcast message immediately (non-blocking)
        io.to(`room-${roomId}`).emit('new-message', {
          _id: message._id,
          content: message.content,
          userId: user._id,
          userName: user.name,
          userAvatar: user.avatar,
          userReputation: user.reputation,
          createdAt: message.createdAt,
        });

        // Add reputation for posting message
        await addReputationPoints(userId, 'message_posted');

        // ===== 🔥 DETECT & HANDLE DOUBT MESSAGE 🔥 =====
        // Run async (don't block message delivery)
        setImmediate(async () => {
          try {
            // Check if this is a doubt/question
            const isDoubt = await isDoubtMessage(content);

            if (!isDoubt) {
              console.log(`ℹ️ Regular message, not a doubt`);
              return;
            }

            console.log(`❓ Doubt detected! Generating poll...`);

            // Get channel (use general if not specified)
            let channel = await Channel.findById(channelId);
            if (!channel) {
              channel = await Channel.findOne({ roomId, name: 'general' });
            }

            if (!channel) {
              console.warn(`⚠️ No channel found for room ${roomId}`);
              return;
            }

            // Suggest poll options using AI
            const pollOptions = await suggestPollOptions(content);

            // Create DoubtPoll
            const doubtPoll = new DoubtPoll({
              roomId,
              channelId: channel._id,
              userId,
              messageId: message._id,
              question: content.substring(0, 500),
              options: pollOptions.map((opt) => ({
                text: opt.text,
                votes: [],
                voteCount: 0,
                weightedScore: 0,
              })),
              status: 'open',
            });

            await doubtPoll.save();

            console.log(
              `✅ Doubt poll created #${doubtPoll._id} with options: ${pollOptions.map((o) => o.text).join(', ')}`
            );

            // Broadcast doubt poll to room
            io.to(`room-${roomId}`).emit('doubt-poll-created', {
              _id: doubtPoll._id,
              question: doubtPoll.question,
              options: doubtPoll.options,
              askedBy: user.name,
              createdAt: doubtPoll.createdAt,
            });

            // Add reputation for creating poll
            await addReputationPoints(userId, 'poll_created');
          } catch (doubtError) {
            console.error('❌ Doubt handling error:', doubtError.message);
            // Silently fail - don't disrupt message delivery
          }
        });
      } catch (error) {
        console.error('❌ Message error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * 💬 Meeting events - start a Google‑Meet‑style video session
     */
    socket.on('start-meeting', async (data) => {
      const { roomId, title, userId } = data;
      try {
        const meeting = new (await import('../models/Meeting.js')).default({
          roomId,
          title: title || 'Untitled Meeting',
          joinUrl: `https://meet.jit.si/${roomId}-${Date.now()}-${Math.random().toString(36).substring(2,8)}`,
          startedBy: userId,
        });
        await meeting.save();

        // fetch starter's name if possible
        let starterName = 'Unknown';
        try {
          const { default: User } = await import('../models/User.js');
          const u = await User.findById(userId);
          if (u) starterName = u.name;
        } catch {}

        io.to(`room-${roomId}`).emit('meeting-started', {
          _id: meeting._id,
          title: meeting.title,
          joinUrl: meeting.joinUrl,
          startedBy: starterName,
          startTime: meeting.startTime,
        });
      } catch (err) {
        console.error('❌ start-meeting error:', err.message);
        socket.emit('error', { message: 'Failed to start meeting' });
      }
    });

    socket.on('end-meeting', async (data) => {
      const { meetingId, summary } = data;
      try {
        const MeetingModel = (await import('../models/Meeting.js')).default;
        const meeting = await MeetingModel.findById(meetingId);
        if (!meeting) {
          socket.emit('error', { message: 'Meeting not found' });
          return;
        }
        meeting.status = 'ended';
        meeting.endTime = new Date();
        if (summary !== undefined) {
          meeting.summary = summary;
          try {
            const { analyzeMeetingSummary } = await import('../services/aiMentorService.js');
            meeting.analysis = await analyzeMeetingSummary(summary);
          } catch (aErr) {
            console.warn('⚠️ meeting analysis failed:', aErr.message);
          }
        }
        await meeting.save();
        io.to(`room-${meeting.roomId}`).emit('meeting-ended', meeting);
      } catch (err) {
        console.error('❌ end-meeting error:', err.message);
        socket.emit('error', { message: 'Failed to end meeting' });
      }
    });

    /**
     * ⭐ REAL-TIME DOUBT POLL VOTING
     * User votes on doubt poll option
     * Votes update instantly and influence AI mentor response
     */
    socket.on('vote-doubt-poll', async (data) => {
      const { doubtPollId, optionIndex, userId, reputation } = data;

      try {
        const doubtPoll = await DoubtPoll.findById(doubtPollId);
        if (!doubtPoll) {
          socket.emit('error', { message: 'Poll not found' });
          return;
        }

        // Check if user already voted
        const option = doubtPoll.options[optionIndex];
        const alreadyVoted = option.votes.find((v) => v.userId.toString() === userId);

        if (alreadyVoted) {
          socket.emit('error', { message: 'You already voted on this poll' });
          return;
        }

        // Add vote
        option.votes.push({
          userId,
          weight: (reputation / 100) * 2, // Weight by reputation (0-2x)
        });

        // Recalculate scores
        doubtPoll.options.forEach((opt) => {
          opt.voteCount = opt.votes.length;
          opt.weightedScore = opt.votes.reduce((sum, v) => sum + v.weight, 0);
        });

        doubtPoll.totalVotes = doubtPoll.options.reduce((sum, opt) => sum + opt.voteCount, 0);

        // Update consensus
        const maxVotes = Math.max(...doubtPoll.options.map((o) => o.voteCount));
        doubtPoll.consensusPercentage = Math.round((maxVotes / Math.max(1, doubtPoll.totalVotes)) * 100);
        doubtPoll.winningOption =
          doubtPoll.options.find((o) => o.voteCount === maxVotes)?.text || '';

        await doubtPoll.save();

        console.log(`🗳️ Vote recorded on poll #${doubtPollId}. Total votes: ${doubtPoll.totalVotes}`);

        // Add reputation for voting
        await addReputationPoints(userId, 'vote_given');

        // Broadcast vote update to all users in room
        const room = await doubtPoll.populate('roomId');

        io.to(`room-${room.roomId}`).emit('doubt-poll-updated', {
          _id: doubtPollId,
          options: doubtPoll.options,
          totalVotes: doubtPoll.totalVotes,
          consensusPercentage: doubtPoll.consensusPercentage,
          winningOption: doubtPoll.winningOption,
        });

        // Check if consensus reached (>75%)
        if (doubtPoll.consensusPercentage > 75 && doubtPoll.status === 'open') {
          console.log(`🎯 Consensus reached! Closing poll and generating mentor response...`);

          // Close poll
          doubtPoll.status = 'closed';
          doubtPoll.closedAt = new Date();
          doubtPoll.closeReason = 'consensus_reached';

          // Generate AI mentor analysis
          try {
            const mentorUser = await User.findById(doubtPoll.userId);
            const mentorAnalysis = await analyzeDoubtAndGenerateMentorResponse(doubtPoll, mentorUser);

            doubtPoll.aiAnalysis = {
              ...mentorAnalysis,
              generatedAt: new Date(),
            };

            await doubtPoll.save();

            console.log(`🧠 AI mentor response generated!`);

            // Broadcast mentor response
            io.to(`room-${room.roomId}`).emit('mentor-response', {
              doubtPollId,
              analysis: doubtPoll.aiAnalysis,
              consensusReached: true,
            });
          } catch (mentorError) {
            console.error('❌ Mentor analysis error:', mentorError.message);
          }
        }
      } catch (error) {
        console.error('❌ Vote error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * User closes doubt poll manually
     */
    socket.on('close-doubt-poll', async (data) => {
      const { doubtPollId, userId, roomId } = data;

      try {
        const doubtPoll = await DoubtPoll.findById(doubtPollId);

        // Only poll creator or admins can close
        if (doubtPoll.userId.toString() !== userId) {
          socket.emit('error', { message: 'Only poll creator can close' });
          return;
        }

        doubtPoll.status = 'closed';
        doubtPoll.closedAt = new Date();
        doubtPoll.closeReason = 'manually_closed';

        // Generate mentor response before closing
        const mentorUser = await User.findById(userId);
        const mentorAnalysis = await analyzeDoubtAndGenerateMentorResponse(doubtPoll, mentorUser);

        doubtPoll.aiAnalysis = {
          ...mentorAnalysis,
          generatedAt: new Date(),
        };

        await doubtPoll.save();

        io.to(`room-${roomId}`).emit('doubt-poll-closed', {
          doubtPollId,
          analysis: doubtPoll.aiAnalysis,
        });

        console.log(`🏁 Poll #${doubtPollId} manually closed by creator`);
      } catch (error) {
        console.error('❌ Close poll error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', () => {
      console.log(`👋 User disconnected: ${socket.id}`);
    });

    /**
     * Error handler
     */
    socket.on('error', (error) => {
      console.error('🔴 Socket error:', error);
    });
  });
};

export default { initializeSocket };
