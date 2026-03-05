import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  title: { type: String, default: 'Untitled Meeting' },
  joinUrl: { type: String, required: true },
  startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  summary: { type: String, default: '' },
  analysis: { type: String, default: '' }, // auto-generated insight from AI
});

export const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;