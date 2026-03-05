import { Message } from '../models/index.js';

/**
 * Initialize Socket.IO event handlers
 */
export const initializeSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    /**
     * User joins a room
     */
    socket.on('join-room', async (data) => {
      const { roomId, userId, userName } = data;

      socket.join(`room-${roomId}`);
      socket.join(`poll-${roomId}`);

      // Store user info in socket
      socket.userId = userId;
      socket.userName = userName;
      socket.currentRoom = roomId;

      // Notify others that user joined
      io.to(`room-${roomId}`).emit('user-joined', {
        userId,
        userName,
        timestamp: new Date(),
      });

      console.log(`User ${userName} joined room ${roomId}`);
    });

    /**
     * User leaves a room
     */
    socket.on('leave-room', (data) => {
      const { roomId, userId, userName } = data;

      socket.leave(`room-${roomId}`);
      socket.leave(`poll-${roomId}`);

      io.to(`room-${roomId}`).emit('user-left', {
        userId,
        userName,
        timestamp: new Date(),
      });

      console.log(`User ${userName} left room ${roomId}`);
    });

    /**
     * Handle incoming chat messages
     */
    socket.on('new-message', async (data) => {
      const { roomId, userId, userName, content, messageId } = data;

      // Broadcast message to all users in room
      io.to(`room-${roomId}`).emit('message', {
        messageId,
        roomId,
        userId,
        userName,
        content,
        timestamp: new Date(),
      });

      console.log(`Message in room ${roomId}: ${content.substring(0, 50)}...`);
    });

    /**
     * Handle typing indicator
     */
    socket.on('typing', (data) => {
      const { roomId, userId, userName } = data;

      io.to(`room-${roomId}`).emit('user-typing', {
        userId,
        userName,
      });
    });

    /**
     * Handle stop typing
     */
    socket.on('stop-typing', (data) => {
      const { roomId, userId } = data;

      io.to(`room-${roomId}`).emit('user-stop-typing', {
        userId,
      });
    });

    /**
     * Handle new poll
     */
    socket.on('new-poll', (data) => {
      const { roomId, poll } = data;

      io.to(`poll-${roomId}`).emit('poll-created', {
        poll,
        timestamp: new Date(),
      });

      console.log(`New poll in room ${roomId}: ${poll.question}`);
    });

    /**
     * Handle poll vote
     */
    socket.on('poll-vote', (data) => {
      const { roomId, pollId, userId, selectedOptionId, updatedPoll } = data;

      io.to(`poll-${roomId}`).emit('vote-casted', {
        pollId,
        userId,
        selectedOptionId,
        updatedPoll,
        timestamp: new Date(),
      });

      console.log(`Vote casted in poll ${pollId}`);
    });

    /**
     * Handle poll close and AI response
     */
    socket.on('poll-closed', (data) => {
      const { roomId, pollId, closedPoll, aiResponse } = data;

      io.to(`poll-${roomId}`).emit('poll-ended', {
        pollId,
        closedPoll,
        aiResponse,
        timestamp: new Date(),
      });

      console.log(`Poll ${pollId} closed with AI response`);
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', () => {
      if (socket.currentRoom) {
        io.to(`room-${socket.currentRoom}`).emit('user-left', {
          userId: socket.userId,
          userName: socket.userName,
          timestamp: new Date(),
        });
      }

      console.log(`User disconnected: ${socket.id}`);
    });

    /**
     * Error handling
     */
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });
};
