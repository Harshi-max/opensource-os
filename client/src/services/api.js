import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for adding JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

/**
 * Auth API calls
 */
export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  getCurrentUser: () => apiClient.get('/auth/me'),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  getGitHubAuthUrl: (mode = 'link') =>
    apiClient.get('/auth/github/url', { params: { mode } }),
};

/**
 * Room API calls
 */
export const roomAPI = {
  getAllRooms: (search) => apiClient.get('/rooms', { params: { search } }),
  getRoom: (roomId) => apiClient.get(`/rooms/${roomId}`),
  createRoom: (data) => apiClient.post('/rooms', data),
  joinRoom: (roomId) => apiClient.post(`/rooms/${roomId}/join`),
  leaveRoom: (roomId) => apiClient.post(`/rooms/${roomId}/leave`),
  getRoomMembers: (roomId) => apiClient.get(`/rooms/${roomId}/members`),
  getRoomMessages: (roomId, limit, skip) =>
    apiClient.get(`/rooms/${roomId}/messages`, { params: { limit, skip } }),
  getRoomPolls: (roomId, includeClosedPolls) =>
    apiClient.get(`/rooms/${roomId}/polls`, { params: { includeClosedPolls } }),
  // meetings
  getRoomMeetings: (roomId) => apiClient.get(`/rooms/${roomId}/meetings`),
  getActiveMeeting: (roomId) => apiClient.get(`/rooms/${roomId}/active-meeting`),
  createRoomMeeting: (roomId, data) => apiClient.post(`/rooms/${roomId}/meetings`, data),
  askRoomAI: (roomId, question) => apiClient.post(roomId ? `/rooms/${roomId}/ai` : `/rooms/ai`, { question }),
  summarizeMeeting: (meetingId) => apiClient.post(`/meetings/${meetingId}/summarize`),
  getMeetingSummaries: (roomId) => 
    roomId ? apiClient.get(`/rooms/${roomId}/meeting-summaries`) : apiClient.get('/rooms/meeting-summaries'),
};

export const meetingAPI = {
  updateMeeting: (meetingId, data) => apiClient.patch(`/meetings/${meetingId}`, data),
  endMeeting: (meetingId, data) => apiClient.post(`/meetings/${meetingId}/end`, data),
};
/**
 * Poll API calls
 */
export const pollAPI = {
  createPoll: (data) => apiClient.post('/polls', data),
  getPoll: (pollId) => apiClient.get(`/polls/${pollId}`),
  castVote: (pollId, data) => apiClient.post(`/polls/${pollId}/vote`, data),
  closePoll: (pollId) => apiClient.post(`/polls/${pollId}/close`),
  getAIResponse: (pollId) => apiClient.get(`/polls/${pollId}/ai-response`),
};

/**
 * Message API calls
 */
export const messageAPI = {
  createMessage: (data) => apiClient.post('/messages', data),
  editMessage: (messageId, data) => apiClient.put(`/messages/${messageId}`, data),
  deleteMessage: (messageId) => apiClient.delete(`/messages/${messageId}`),
  uploadAudio: (formData) => apiClient.post('/messages/audio', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

/**
 * Notifications API (mentions)
 */
export const notificationsAPI = {
  getNotifications: (limit) => apiClient.get('/notifications', { params: { limit } }),
};

/**
 * Analytics API calls
 */
export const analyticsAPI = {
  // analytics, contributors and confusing topics use distinct endpoints
  getRoomAnalytics: (roomId) => apiClient.get(`/rooms/${roomId}/analytics`),
  getTopContributors: (roomId, limit) =>
    apiClient.get(`/rooms/${roomId}/contributors`, { params: { limit } }),
  getMostConfusingTopics: (roomId, limit) =>
    apiClient.get(`/rooms/${roomId}/confusing-topics`, { params: { limit } }),
  getGitHubStats: (roomId) => apiClient.get(`/rooms/${roomId}/github-stats`),
};
