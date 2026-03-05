import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roomAPI, pollAPI, messageAPI, meetingAPI } from '../services/api';
import {
  joinRoom,
  leaveRoom,
  sendMessage,
  emitTyping,
  emitStopTyping,
  emitNewPoll,
  emitPollVote,
  emitPollClosed,
  emitBotMention,
  emitEndMeeting,
  onNewMessage,
  onUserJoined,
  onUserLeft,
  onUserTyping,
  onUserStopTyping,
  onPollCreated,
  onVoteCasted,
  onPollEnded,
  onAIResponse,
  onBotResponse,
  onBotAnswer,
  onBotAudio,
  onMessageDeleted,
  onMeetingStarted,
  onMeetingEnded,
  onMeetingUpdated,
  removeListener,
} from '../services/socket';
import PollCard from '../components/PollCard';
import ContributionGuideCard from '../components/ContributionGuideCard';
import AIDecisionCard from '../components/AIDecisionCard';
import { Send, MessageSquarePlus, Plus, Loader, ArrowLeft } from 'lucide-react';

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const isMentor = user?.roles?.includes('mentor');

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [aiResponses, setAIResponses] = useState([]);
  const [polls, setPolls] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  // recording feature removed per user request; related refs are no longer used
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollForm, setPollForm] = useState({
    question: '',
    options: ['', ''],
  });
  const [sendError, setSendError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (authLoading) {
      return; // Still loading auth, don't do anything yet
    }

    // If auth is complete and user is not authenticated, redirect to login
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Load room once when component mounts or roomId changes
    if (isAuthenticated && user) {
      loadRoom();
    }
  }, [roomId, authLoading, isAuthenticated]); // Include authLoading as dependency

  useEffect(() => {
    // Setup socket listeners
    onNewMessage(handleNewMessage);
    onUserJoined(handleUserJoined);
    onUserLeft(handleUserLeft);
    onUserTyping(handleUserTyping);
    onUserStopTyping(handleUserStopTyping);
    onPollCreated(handlePollCreated);
    onVoteCasted(handleVoteCasted);
    onPollEnded(handlePollEnded);
    onAIResponse(handleAIResponse);
    onBotResponse((data) => {
      // Insert a bot message to guide the user
      const botMsg = {
        _id: `bot-${Date.now()}`,
        userId: { _id: 'bot', name: 'Bot' },
        content: data.suggestion || 'I created a poll to help! 😄',
        createdAt: data.createdAt,
      };
      setMessages((prev) => [...prev, botMsg]);
    });
    onBotAnswer((data) => {
      // Display bot's direct answer or question as a message
      const text = data.answer && data.answer.trim() !== '' ? data.answer : data.question;
      const botAnswerMsg = {
        _id: `bot-${Date.now()}`,
        userId: { _id: 'bot', name: '🤖 AI Assistant' },
        content: text,
        createdAt: data.timestamp,
        isBot: true,
        question: data.question,
      };
      setMessages((prev) => [...prev, botAnswerMsg]);

      // Speak the bot response using browser TTS for quick voice reply
      try {
        if (window.speechSynthesis && text) {
          const utter = new SpeechSynthesisUtterance(text);
          utter.lang = 'en-US';
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
        }
      } catch (e) {
        // ignore TTS errors
      }
    });

    // play server-generated TTS audio if available
    onBotAudio((data) => {
      if (data.audioUrl) {
        // insert as a chat message so it can be replayed
        const audioMsg = {
          _id: `bot-audio-${Date.now()}`,
          userId: { _id: 'bot', name: '🤖 AI Assistant' },
          content: '',
          createdAt: data.timestamp,
          isAudio: true,
          audioUrl: data.audioUrl,
          isBot: true,
        };
        setMessages((prev) => [...prev, audioMsg]);
        // try auto-play
        const player = new Audio(data.audioUrl);
        player.play().catch(() => {});
      }
    });

    // listen for deleted messages
    const onDeleted = (data) => {
      setMessages((prev) => prev.filter((m) => m._id !== data.messageId));
    };
    onMessageDeleted(onDeleted);

    // meeting events
    onMeetingStarted(handleMeetingStarted);
    onMeetingEnded(handleMeetingEnded);
    onMeetingUpdated(handleMeetingUpdated);

    return () => {
      window.speechSynthesis?.cancel();
      removeListener('message');
      removeListener('user-joined');
      removeListener('user-left');
      removeListener('user-typing');
      removeListener('user-stop-typing');
      removeListener('poll-created');
      removeListener('vote-casted');
      removeListener('poll-ended');
      removeListener('ai-response');
      removeListener('bot-response');
      removeListener('bot-answer');
      removeListener('bot-audio');
      removeListener('message-deleted');
      removeListener('meeting-started');
      removeListener('meeting-ended');
      removeListener('meeting-updated');
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, aiResponses]);


  const loadRoom = async () => {
    try {
      setLoading(true);

      // Ensure user is loaded before fetching room data
      if (!user) {
        setError('User not loaded');
        return;
      }

      const [roomResult, messagesResult, pollsResult, meetingsResult] = await Promise.allSettled([
        roomAPI.getRoom(roomId),
        roomAPI.getRoomMessages(roomId),
        roomAPI.getRoomPolls(roomId),
        roomAPI.getRoomMeetings(roomId),
      ]);

      if (roomResult.status === 'rejected') {
        throw roomResult.reason;
      }
      const roomData = roomResult.value.data;
      setRoom(roomData);

      setMessages(messagesResult.status === 'fulfilled' ? messagesResult.value.data : []);
      setPolls(pollsResult.status === 'fulfilled' ? pollsResult.value.data : []);
      setMeetings(meetingsResult.status === 'fulfilled' ? meetingsResult.value.data : []);

      if (meetingsResult.status === 'rejected' && meetingsResult.reason?.response?.status === 403) {
        console.warn('Meetings unavailable: connect GitHub to use meetings.');
      }

      // Join room via HTTP so user is in room.members and can be @mentioned (ignore if 403)
      roomAPI.joinRoom(roomId).catch(() => {});

      // Join room via socket for real-time messages and notifications
      joinRoom(roomId, user._id, user.name);
    } catch (err) {
      setError('Failed to load room');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewMessage = (data) => {
    const newMessage = {
      _id: data.messageId,
      userId: { _id: data.userId, name: data.userName },
      content: data.content,
      createdAt: data.timestamp,
      isAudio: data.isAudio || false,
      audioUrl: data.audioUrl || null,
      audioDuration: data.audioDuration || 0,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await messageAPI.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (err) {
      console.error('Failed to delete message', err);
      alert('Could not delete message');
    }
  };

  const handleUserJoined = (data) => {
    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        members: [...(prev.members || []), { _id: data.userId, name: data.userName }],
      };
    });
  };

  const handleUserLeft = (data) => {
    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        members: (prev.members || []).filter((m) => m._id !== data.userId),
      };
    });
  };

  const handleUserTyping = (data) => {
    setTypingUsers((prev) => new Set([...prev, data.userId]));
  };

  const handleUserStopTyping = (data) => {
    setTypingUsers((prev) => {
      const newSet = new Set(prev);
      newSet.delete(data.userId);
      return newSet;
    });
  };

  const handlePollCreated = (data) => {
    setPolls((prev) => [data.poll, ...prev]);
  };

  const handleVoteCasted = (data) => {
    setPolls((prev) =>
      prev.map((p) => (p._id === data.pollId ? data.updatedPoll : p))
    );
  };

  const handlePollEnded = (data) => {
    setPolls((prev) =>
      prev.map((p) => (p._id === data.pollId ? data.closedPoll : p))
    );
  };

  const handleAIResponse = (data) => {
    // Add AI response to the list
    setAIResponses((prev) => [data, ...prev]);
    
    // Auto-scroll after a small delay to allow rendering
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // meeting socket handlers
  const handleMeetingStarted = (meeting) => {
    setMeetings((prev) => {
      if (prev.find((m) => m._id === meeting._id)) return prev;
      return [meeting, ...prev];
    });
  };

  const handleMeetingEnded = (meeting) => {
    setMeetings((prev) =>
      prev.map((m) => (m._id === meeting._id ? meeting : m))
    );
  };

  const handleMeetingUpdated = (meeting) => {
    setMeetings((prev) =>
      prev.map((m) => (m._id === meeting._id ? meeting : m))
    );
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageInput.trim()) return;

    setSendError('');
    setSendingMessage(true);

    try {
      const response = await messageAPI.createMessage({
        roomId,
        content: messageInput.trim(),
      });

      const newMsg = response.data;
      setMessages((prev) => [...prev, newMsg]);
      const mentionIds = (newMsg.mentions || []).map((m) => (typeof m === 'object' ? m._id : m));
      sendMessage(roomId, user._id, user.name, messageInput.trim(), newMsg._id, {
        mentions: mentionIds,
        userAvatar: user.avatar,
      });

      // Check if message mentions @bot
      // special command to halt bot speech
      if (messageInput.trim().toLowerCase() === '@bot stop') {
        window.speechSynthesis.cancel();
        // we don't want a guidance poll for this command
      } else if (messageInput.includes('@bot')) {
        console.log('🤖 @bot mention detected - creating guidance poll');
        emitBotMention(roomId, room?.currentChannelId || 'general', messageInput.trim(), user._id);
      }

      setMessageInput('');
      emitStopTyping(roomId, user._id);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error;
      if (status === 403) {
        setSendError(msg || 'Connect your GitHub account to send messages.');
      } else {
        setSendError(msg || 'Failed to send message. Try again.');
      }
      console.error('Failed to send message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();

    if (!pollForm.question.trim() || pollForm.options.some((o) => !o.trim())) {
      alert('Please fill all fields');
      return;
    }

    try {
      const response = await pollAPI.createPoll({
        roomId,
        question: pollForm.question,
        options: pollForm.options.filter((o) => o.trim()),
      });

      const newPoll = response.data;
      setPolls((prev) => [newPoll, ...prev]);
      emitNewPoll(roomId, newPoll);

      setShowPollForm(false);
      setPollForm({ question: '', options: ['', ''] });
    } catch (err) {
      console.error('Failed to create poll:', err);
    }
  };

  const handleJoinMeeting = async (meeting) => {
    // open meeting first
    window.open(meeting.joinUrl, '_blank');
    try {
      await meetingAPI.updateMeeting(meeting._id, { addParticipant: user._id });
    } catch (err) {
      console.error('Failed to register participant:', err);
    }
  };

  const handleStartMeeting = async () => {
    try {
      const title = prompt('Enter a meeting title (optional):');
      const resp = await roomAPI.createRoomMeeting(roomId, { title });
      const meeting = resp.data;
      // avoid duplicate if socket event also adds it
      setMeetings((prev) => {
        if (prev.find((m) => m._id === meeting._id)) return prev;
        return [meeting, ...prev];
      });
      // open the meeting in a new tab
      window.open(meeting.joinUrl, '_blank');
    } catch (err) {
      console.error('Failed to start meeting:', err);
      alert('Could not start meeting');
    }
  };

  const handleEndMeeting = async (meeting) => {
    const summary = prompt('Enter a brief summary of the meeting:');
    console.log('handleEndMeeting called for', meeting._id, 'summary:', summary);
    try {
      const resp = await meetingAPI.endMeeting(meeting._id, { summary });
      console.log('endMeeting API response', resp.data);
      const updated = resp.data;
      // replace meeting in state
      setMeetings((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
    } catch (err) {
      console.error('Failed to end meeting:', err.response?.data || err.message);
      alert('Error ending meeting: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCastVote = async (pollId, optionId) => {
    try {
      const response = await pollAPI.castVote(pollId, {
        selectedOptionId: optionId,
      });

      const updatedPoll = response.data;
      setPolls((prev) =>
        prev.map((p) => (p._id === pollId ? updatedPoll : p))
      );

      emitPollVote(roomId, pollId, user._id, optionId, updatedPoll);
    } catch (err) {
      console.error('Failed to cast vote:', err);
    }
  };

  const handleClosePoll = async (pollId) => {
    if (!window.confirm('Are you sure you want to close this poll?')) return;

    try {
      const response = await pollAPI.closePoll(pollId);
      const closedPoll = response.data;

      setPolls((prev) =>
        prev.map((p) => (p._id === pollId ? closedPoll : p))
      );

      emitPollClosed(roomId, pollId, closedPoll, closedPoll.aiResponse);
    } catch (err) {
      console.error('Failed to close poll:', err);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex justify-center items-center">
        <Loader className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-dark-900 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="card bg-red-500/10 border-red-500/30">
            <p className="text-red-400">{error || 'Room not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="bg-dark-800 border-b border-dark-700 p-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/rooms')}
              className="p-2 hover:bg-dark-700 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-dark-100">{room.repoName}</h1>
              <p className="text-sm text-dark-400">{room.repoOwner}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-primary">
              {room.members?.length || 0} member{room.members?.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {isMentor && (
          <div className="bg-yellow-700/20 p-3 text-yellow-300 text-center">
            Mentor tools available – you can <a href="/analytics" className="underline">view repo analytics</a> or ask @bot for a summary.
          </div>
        )}

        <div className="flex-1 flex gap-6 overflow-hidden p-4">
          {/* Left: Chat */}
          <div className="flex-1 flex flex-col">
            {/* Messages & AI Responses */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.map((msg) => (
                <div key={msg._id} className="flex space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                      {msg.userId?.name?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline space-x-2">
                      <span className="font-semibold text-dark-100">
                        {msg.userId?.name}
                      </span>
                      <span className="text-xs text-dark-500">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>
                            {msg.userId?._id === user._id && (
                              <button
                                onClick={() => handleDeleteMessage(msg._id)}
                                className="text-xs text-red-400 ml-2 hover:underline"
                              >
                                Delete
                              </button>
                            )}
                    </div>
                    {msg.isAudio && msg.audioUrl ? (
                      <div className="mt-1">
                        <audio controls src={msg.audioUrl} className="w-full" />
                      </div>
                    ) : (
                      <p className="text-dark-200 mt-1">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Display AI Responses (Contribution Guides) */}
              {aiResponses.map((response) => (
                <div key={response._id} className="w-full">
                  <ContributionGuideCard response={response} />
                </div>
              ))}

              {typingUsers.size > 0 && (
                <div className="text-sm text-dark-400 italic">
                  {Array.from(typingUsers).join(', ')} is typing...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {!user?.githubUsername && (
              <p className="text-amber-400 text-sm mb-2">
                Connect your GitHub account (header menu) to send messages.
              </p>
            )}
            {sendError && (
              <p className="text-red-400 text-sm mb-2" role="alert">
                {sendError}
              </p>
            )}
            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  if (sendError) setSendError('');
                  if (e.target.value) {
                    emitTyping(roomId, user._id, user.name);
                  }
                }}
                onBlur={() => emitStopTyping(roomId, user._id)}
                placeholder={user?.githubUsername ? 'Type a message...' : 'Connect GitHub to send messages'}
                disabled={!user?.githubUsername}
                className="flex-1 bg-dark-800 border border-dark-700 rounded px-3 py-2 text-dark-100 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!user?.githubUsername || sendingMessage}
                className="btn-primary px-3 py-2 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sendingMessage ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>

          {/* Right: Polls */}
          <div className="w-80 max-h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-dark-900 pb-4">
              <h2 className="text-lg font-bold text-dark-100">Polls</h2>
              <button
                onClick={() => setShowPollForm(!showPollForm)}
                className="btn-primary text-sm flex items-center space-x-1 px-2 py-1"
              >
                <Plus className="w-4 h-4" />
                <span>New</span>
              </button>
            </div>

            {showPollForm && (
              <form onSubmit={handleCreatePoll} className="card mb-4">
                <input
                  type="text"
                  placeholder="Poll question"
                  value={pollForm.question}
                  onChange={(e) =>
                    setPollForm((prev) => ({ ...prev, question: e.target.value }))
                  }
                  className="mb-3 w-full"
                />

                {/* Meetings Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">Meetings</h2>
                <button
                  onClick={handleStartMeeting}
                  className="btn-secondary btn-sm"
                >
                  Start Meet
                </button>
              </div>
              {meetings.length === 0 && (
                <p className="text-sm text-gray-500">No meetings yet.</p>
              )}
              {meetings.map((m) => (
                <div
                  key={m._id}
                  className="border p-2 mb-2 rounded bg-gray-50"
                >
                  <div className="flex justify-between">
                    <span>{m.title || 'Untitled Meeting'}</span>
                    <span className="text-xs text-gray-600">
                      {new Date(m.startTime).toLocaleString()}
                    </span>
                  </div>
                  {m.startedBy && (
                    <div className="text-xs text-gray-500">
                      started by {typeof m.startedBy === 'string' ? m.startedBy : (m.startedBy?.name || m.startedBy?._id || 'Someone')}
                    </div>
                  )}
                  <button
                    onClick={() => handleJoinMeeting(m)}
                    className="text-primary underline text-sm"
                  >
                    Join
                  </button>
                  {m.participants && m.participants.length > 0 && (
                    <span className="text-xs text-gray-600 ml-2">
                      ({m.participants.length} participant{m.participants.length>1?'s':''})
                    </span>
                  )}
                  {m.endTime ? (
                    <p className="text-xs text-gray-600">
                      Ended: {new Date(m.endTime).toLocaleString()}
                    </p>
                  ) : (
                    // show end button for everyone when meeting is still active
                    <button
                      onClick={() => handleEndMeeting(m)}
                      className="btn-danger btn-sm mt-1"
                    >
                      End &amp; Summarize
                    </button>
                  )}
                  {m.summary && <p className="mt-1 text-sm">{m.summary}</p>}
                  {m.analysis && <p className="mt-1 text-sm italic text-dark-400">AI: {m.analysis}</p>}
                </div>
              ))}
            </div>

            {pollForm.options.map((opt, idx) => (
                  <input
                    key={idx}
                    type="text"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...pollForm.options];
                      newOptions[idx] = e.target.value;
                      setPollForm((prev) => ({ ...prev, options: newOptions }));
                    }}
                    className="mb-2 w-full"
                  />
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setPollForm((prev) => ({
                      ...prev,
                      options: [...prev.options, ''],
                    }))
                  }
                  className="text-sm text-primary mb-3"
                >
                  + Add option
                </button>

                <button type="submit" className="btn-primary w-full text-sm">
                  Create Poll
                </button>
              </form>
            )}

            {/* Polls List */}
            {polls.map((poll) => (
              <div key={poll._id} className="mb-4">
                <PollCard
                  poll={poll}
                  onVote={(optionId) => handleCastVote(poll._id, optionId)}
                  userVoteId={user._id}
                />

                {poll.aiResponse && (
                  <AIDecisionCard aiResponse={poll.aiResponse} />
                )}

                {!poll.isClosed && poll.createdBy._id === user._id && (
                  <button
                    onClick={() => handleClosePoll(poll._id)}
                    className="btn-danger text-sm w-full"
                  >
                    Close Poll
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
