import { Meeting } from '../models/index.js';
import axios from 'axios';
import mongoose from 'mongoose';

// generates a simple Jitsi meet URL based on roomId + timestamp
const generateJoinUrl = (roomId) => {
  const rnd = Math.random().toString(36).substring(2, 8);
  // using public jitsi for simplicity
  return `https://meet.jit.si/${roomId}-${Date.now()}-${rnd}`;
};

// Create a new meeting inside a room
export const createMeeting = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { title } = req.body;

    // Validate that roomId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID format' });
    }

    const roomObjectId = new mongoose.Types.ObjectId(roomId);

    // Check if there's already an active meeting in this room
    const activeMeeting = await Meeting.findOne({
      roomId: roomObjectId,
      status: 'active'
    });

    if (activeMeeting) {
      // Add current user to participants if not already there
      if (req.user && !activeMeeting.participants.includes(req.user._id)) {
        activeMeeting.participants.push(req.user._id);
        await activeMeeting.save();
      }
      // Return the existing active meeting
      return res.status(200).json({
        _id: activeMeeting._id,
        title: activeMeeting.title,
        joinUrl: activeMeeting.joinUrl,
        startedBy: activeMeeting.startedBy,
        startTime: activeMeeting.startTime,
        status: activeMeeting.status,
        isExistingMeeting: true,
        message: 'Joined existing meeting',
      });
    }

    // No active meeting, create a new one
    const joinUrl = generateJoinUrl(roomId);

    const meeting = new Meeting({
      roomId: roomObjectId,
      title: title || 'Untitled Meeting',
      joinUrl,
      startedBy: req.user ? req.user._id : null,
      status: 'active',
      participants: req.user ? [req.user._id] : [],
    });
    await meeting.save();

    // build a payload that includes friendly fields
    const meetingPayload = {
      _id: meeting._id,
      title: meeting.title,
      joinUrl: meeting.joinUrl,
      startedBy: req.user ? req.user.name : 'Unknown',
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      summary: meeting.summary,
      participants: meeting.participants,
    };

    // notify via sockets if available
    if (req.io) {
      req.io.to(`room-${roomId}`).emit('meeting-started', meetingPayload);
    }

    res.status(201).json(meetingPayload);
  } catch (error) {
    console.error('Create meeting error:', error.message);
    res.status(500).json({ message: 'Failed to create meeting' });
  }
};

// Get all meetings for a room
export const listMeetings = async (req, res) => {
  try {
    const { roomId } = req.params;
    const meetings = await Meeting.find({ roomId }).sort({ startTime: -1 });
    res.json(meetings);
  } catch (error) {
    console.error('List meetings error:', error.message);
    res.status(500).json({ message: 'Failed to list meetings' });
  }
};

// Update a meeting summary/end time
export const updateMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { summary, endTime, addParticipant } = req.body;
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (summary !== undefined) {
      meeting.summary = summary;
      try {
        // asynchronous AI analysis – write into meeting.analysis field
        const { analyzeMeetingSummary } = await import('../services/aiMentorService.js');
        meeting.analysis = await analyzeMeetingSummary(summary);
      } catch (analysisErr) {
        console.warn('Meeting analysis failed:', analysisErr.message);
      }
    }
    if (endTime !== undefined) meeting.endTime = endTime;
    if (addParticipant) {
      // only add if not already present
      const id = addParticipant.toString();
      if (!meeting.participants.map((p) => p.toString()).includes(id)) {
        meeting.participants.push(addParticipant);
      }
    }
    await meeting.save();

    // optionally notify
  } catch (error) {
    console.error('Update meeting error:', error.message);
    res.status(500).json({ message: 'Failed to update meeting' });
  }
};

// Get active meeting for a room (if any)
export const getActiveMeeting = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID format' });
    }

    // Only return meetings that are active AND don't have an endTime
    const activeMeeting = await Meeting.findOne({
      roomId: new mongoose.Types.ObjectId(roomId),
      status: 'active',
      endTime: null  // Must not have ended
    }).populate('startedBy', 'name').lean();

    if (!activeMeeting) {
      return res.status(404).json({ message: 'No active meeting in this room' });
    }

    res.json({
      _id: activeMeeting._id,
      title: activeMeeting.title,
      joinUrl: activeMeeting.joinUrl,
      startedBy: activeMeeting.startedBy,
      startTime: activeMeeting.startTime,
      endTime: activeMeeting.endTime,
      status: activeMeeting.status,
      participants: activeMeeting.participants,
    });
  } catch (error) {
    console.error('Get active meeting error:', error.message);
    res.status(500).json({ message: 'Failed to get active meeting' });
  }
};

// End a meeting
export const endMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { summary } = req.body;

    console.log(`[endMeeting] Ending meeting: ${meetingId}, provided summary: ${summary || 'none'}`);

    const meeting = await Meeting.findByIdAndUpdate(
      meetingId,
      {
        status: 'ended',
        endTime: new Date(),
        ...(summary && { summary }),
      },
      { new: true }
    ).populate('startedBy', 'name');

    if (!meeting) {
      console.log(`[endMeeting] Meeting not found: ${meetingId}`);
      return res.status(404).json({ message: 'Meeting not found' });
    }

    console.log(`[endMeeting] Meeting found, status set to: ${meeting.status}, endTime: ${meeting.endTime}`);

    // Auto-generate summary if none provided
    let finalSummary = summary;
    if (!finalSummary) {
      const duration = meeting.endTime - meeting.startTime;
      const durationMinutes = Math.floor(duration / 60000);
      finalSummary = `Meeting "${meeting.title}" held for ${durationMinutes} minutes. Started by ${meeting.startedBy?.name || 'Unknown'}. Meeting included discussion and collaboration.`;
      meeting.summary = finalSummary;
      console.log(`[endMeeting] Auto-generated summary: ${finalSummary.substring(0, 100)}...`);
    }

    // Try to generate AI analysis
    try {
      const { analyzeMeetingSummary } = await import('../services/aiMentorService.js');
      const analysis = await analyzeMeetingSummary(finalSummary || meeting.summary);
      meeting.analysis = analysis;
      console.log(`[endMeeting] AI analysis generated: ${analysis.substring(0, 100)}...`);
      await meeting.save();
    } catch (analysisErr) {
      console.warn('[endMeeting] Meeting analysis failed:', analysisErr.message);
      // Still save the meeting even if analysis fails
      if (!summary) await meeting.save();
    }

    console.log(`[endMeeting] Meeting saved successfully with summary and analysis`);

    // Notify via sockets
    if (req.io) {
      req.io.to(`room-${meeting.roomId}`).emit('meeting-ended', {
        _id: meeting._id,
        title: meeting.title,
        summary: meeting.summary,
        analysis: meeting.analysis,
        endTime: meeting.endTime,
      });
    }

    res.json(meeting);
  } catch (error) {
    console.error('[endMeeting] Error:', error.message);
    res.status(500).json({ message: 'Failed to end meeting' });
  }
};

// Generate/refresh summary for meeting using AI
export const generateSummary = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }
    // Generate AI analysis from the meeting summary
    const { analyzeMeetingSummary } = await import('../services/aiMentorService.js');
    
    // If no summary exists, generate a default one using Groq/OpenAI
    if (!meeting.summary || meeting.summary.trim() === '') {
      // Generate summary from meeting details
      const summaryText = `Meeting: ${meeting.title}\nStarted: ${new Date(meeting.startTime).toLocaleString()}\nEnded: ${new Date(meeting.endTime).toLocaleString()}`;
      meeting.summary = `Auto-generated summary for ${meeting.title}`;
    }
    
    // Generate AI analysis based on summary
    const analysis = await analyzeMeetingSummary(meeting.summary);
    meeting.analysis = analysis;
    await meeting.save();
    res.json(meeting);
  } catch (error) {
    console.error('Generate summary error:', error.message);
    res.status(500).json({ message: 'Failed to generate summary' });
  }
};

export default {
  createMeeting,
  listMeetings,
  updateMeeting,
  getActiveMeeting,
  endMeeting,
  generateSummary,
};