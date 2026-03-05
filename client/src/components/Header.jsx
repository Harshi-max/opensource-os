import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, Settings, Copy, Check, Github, Bell, MessageCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { roomAPI, authAPI, notificationsAPI } from '../services/api';
import { onMeetingEnded, onNotification, removeListener, registerUser } from '../services/socket';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showMeetModal, setShowMeetModal] = useState(false);
  const [modalTab, setModalTab] = useState('meet'); // 'meet' or 'summary'
  const [meetTitle, setMeetTitle] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [loadingActiveMeeting, setLoadingActiveMeeting] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [meetingSummaries, setMeetingSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationsRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && user?._id) {
      registerUser(user._id);
    }
  }, [isAuthenticated, user?._id]);

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handler = () => loadNotifications();
    onNotification(handler);
    return () => removeListener('notification');
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingNotifications(true);
      const resp = await notificationsAPI.getNotifications(15);
      setNotifications(resp.data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (showMeetModal && isAuthenticated) {
      loadRoomsAndCheckActiveMeeting();
      loadSummaries();
    }
  }, [showMeetModal, isAuthenticated]);

  // Refresh summaries when a meeting is ended elsewhere (socket)
  useEffect(() => {
    const handleEnded = (meeting) => {
      console.log('Header: meeting-ended event received', meeting);
      loadSummaries();
      // if the ended meeting belongs to the currently selected room, refresh active meeting
      const roomIdStr = selectedRoomId || (window.location.pathname.match(/\/room\/([^/]+)/)?.[1]);
      const meetingRoomId = meeting.roomId?._id || meeting.roomId;
      if (roomIdStr && meetingRoomId && String(meetingRoomId) === String(roomIdStr)) {
        checkActiveMeeting(roomIdStr);
      }
    };

    onMeetingEnded(handleEnded);
    return () => removeListener('meeting-ended');
  }, [selectedRoomId]);

  const loadRoomsAndCheckActiveMeeting = async () => {
    setLoadingRooms(true);
    try {
      const resp = await roomAPI.getAllRooms();
      const rooms = resp.data || [];
      setAvailableRooms(rooms);

      // Only pre-select current room if already in a /room/:roomId path
      const match = window.location.pathname.match(/\/room\/([^/]+)/);
      if (match) {
        const roomId = match[1];
        setSelectedRoomId(roomId);
        // Check for active meeting in current room
        await checkActiveMeeting(roomId);
      } else {
        // Don't auto-select a room - let user choose
        setSelectedRoomId('');
        setActiveMeeting(null);
      }
    } catch (err) {
      console.error('Failed to load rooms', err);
      setAvailableRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  const checkActiveMeeting = async (roomId) => {
    try {
      setLoadingActiveMeeting(true);
      const resp = await roomAPI.getActiveMeeting(roomId);
      setActiveMeeting(resp.data);
    } catch (err) {
      // No active meeting
      setActiveMeeting(null);
    } finally {
      setLoadingActiveMeeting(false);
    }
  };

  const handleRoomChange = async (roomId) => {
    setSelectedRoomId(roomId);
    if (roomId) {
      await checkActiveMeeting(roomId);
    } else {
      setActiveMeeting(null);
    }
  };

  const loadSummaries = async () => {
    try {
      setLoadingSummaries(true);
      const resp = await roomAPI.getMeetingSummaries();
      console.log('Meeting summaries loaded:', resp.data);
      setMeetingSummaries(resp.data || []);
    } catch (err) {
      console.error('Failed to load summaries', err);
      setMeetingSummaries([]);
    } finally {
      setLoadingSummaries(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
    <header className="sticky top-0 z-50 bg-dark-800 border-b border-dark-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="text-2xl font-bold bg-gradient-primary">
              OpenSource OS
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a
              href="/"
              className="text-dark-100 hover:text-primary transition"
            >
              Home
            </a>
            {isAuthenticated && (
              <>
                <a
                  href="/rooms"
                  className="text-dark-100 hover:text-primary transition"
                >
                  Rooms
                </a>
                <a
                  href="/analytics"
                  className="text-dark-100 hover:text-primary transition"
                >
                  Analytics
                </a>
                <button
                  onClick={() => navigate('/ai')}
                  className="text-dark-100 hover:text-primary transition"
                >
                  Ask AI
                </button>
                <button
                  onClick={() => setShowMeetModal(true)}
                  className="text-dark-100 hover:text-primary transition"
                >
                  Meet
                </button>
                {/* History button – always visible but only works inside a room */}
                <button
                  onClick={() => {
                    console.log('History button clicked, current path:', window.location.pathname);
                    const match = window.location.pathname.match(/\/room\/([^/]+)/);
                    if (match) {
                      const roomId = match[1];
                      const target = `/room/${roomId}/meetings-history`;
                      console.log('Navigating to', target);
                      navigate(target);
                    } else {
                      alert('Please open a room first to view meeting history');
                    }
                  }}
                  className="text-dark-100 hover:text-primary transition"
                >
                  History
                </button>
              </>
            )}
          </nav>

          {/* User Menu */}
          <div className="relative">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex items-center space-x-2">
                  {user?.githubAvatar ? (
                    <img
                      src={user.githubAvatar}
                      alt={user.githubUsername || user.name || 'User avatar'}
                      className="w-8 h-8 rounded-full border border-dark-600"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {user?.name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-dark-100 hidden sm:inline">
                      {user?.githubUsername ? `@${user.githubUsername}` : user?.name}
                    </span>
                    <span className="text-xs text-dark-400 flex items-center space-x-1">
                      <Github className="w-3 h-3" />
                      <span>
                        {user?.githubUsername ? 'GitHub linked' : 'GitHub not linked'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      if (!showNotifications) loadNotifications();
                    }}
                    className="relative p-2 rounded-lg hover:bg-dark-700 transition"
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        {notifications.length > 9 ? '9+' : notifications.length}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-dark-700 rounded-lg shadow-lg border border-dark-600 py-2 z-50">
                      <div className="px-4 py-2 border-b border-dark-600 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-dark-100">Notifications</span>
                      </div>
                      {loadingNotifications ? (
                        <p className="px-4 py-6 text-dark-400 text-sm">Loading...</p>
                      ) : notifications.length === 0 ? (
                        <p className="px-4 py-6 text-dark-400 text-sm">No mentions yet</p>
                      ) : (
                        <div className="divide-y divide-dark-600">
                          {notifications.map((n) => (
                            <button
                              key={n._id}
                              onClick={() => {
                                setShowNotifications(false);
                                if (n.roomId) navigate(`/room/${n.roomId}`);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-dark-600 transition flex gap-3"
                            >
                              {n.fromUser?.avatar ? (
                                <img src={n.fromUser.avatar} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-sm font-bold">
                                    {n.fromUser?.name?.[0]?.toUpperCase() || '?'}
                                  </span>
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-dark-100 truncate">
                                  <span className="font-medium">{n.fromUser?.name || 'Someone'}</span>
                                  {' mentioned you'}
                                  {n.roomName && (
                                    <span className="text-dark-400"> in {n.roomName}</span>
                                  )}
                                </p>
                                <p className="text-xs text-dark-400 truncate mt-0.5">{n.content}</p>
                                <p className="text-xs text-dark-500 mt-1">
                                  {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <MessageCircle className="w-4 h-4 text-dark-500 flex-shrink-0 mt-1" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 rounded-lg hover:bg-dark-700 transition"
                  >
                    <Menu className="w-5 h-5" />
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-dark-700 rounded-lg shadow-lg py-2 border border-dark-600">
                      <a
                        href="/settings"
                        className="flex items-center px-4 py-2 text-dark-100 hover:bg-dark-600"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </a>
                      {!user?.githubUsername && (
                        <button
                          onClick={async () => {
                            try {
                              const resp = await authAPI.getGitHubAuthUrl('link');
                              const url = resp.data?.url;
                              if (url) {
                                window.location.href = url;
                              }
                            } catch (e) {
                              console.error('Failed to start GitHub OAuth', e);
                              const msg =
                                e.response?.data?.error ||
                                'Could not start GitHub authentication. Please try again.';
                              alert(msg);
                            }
                          }}
                          className="w-full flex items-center px-4 py-2 text-dark-100 hover:bg-dark-600"
                        >
                          <Github className="w-4 h-4 mr-2" />
                          <span>Connect GitHub</span>
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2 text-red-400 hover:bg-dark-600 transition"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-x-4">
                <button
                  onClick={() => navigate('/login')}
                  className="btn-secondary"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="btn-primary"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
    {showMeetModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-dark-800 p-6 rounded-lg w-96 max-h-screen overflow-y-auto">
          {/* Tab buttons */}
          <div className="flex space-x-4 mb-6 border-b border-dark-700">
            <button
              className={`px-4 py-2 border-b-2 transition ${
                modalTab === 'meet'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-dark-400 hover:text-dark-200'
              }`}
              onClick={() => setModalTab('meet')}
            >
              Meet
            </button>
            <button
              className={`px-4 py-2 border-b-2 transition ${
                modalTab === 'summary'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-dark-400 hover:text-dark-200'
              }`}
              onClick={() => setModalTab('summary')}
            >
              Summary
            </button>
          </div>

          {/* Meet Tab */}
          {modalTab === 'meet' && (
            <>
              {activeMeeting && !activeMeeting.endTime ? (
                // Show active meeting with invite link
                <>
                  <h2 className="text-lg font-bold mb-4 text-green-400">✓ Meeting Active</h2>
                  <div className="bg-dark-700 p-4 rounded mb-4">
                    <h3 className="font-semibold mb-2">{activeMeeting.title}</h3>
                    <p className="text-sm text-dark-400 mb-3">
                      Started by: <span className="text-dark-100">{activeMeeting.startedBy?.name || 'Someone'}</span>
                    </p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={activeMeeting.joinUrl}
                        readOnly
                        className="flex-1 p-2 bg-dark-600 rounded text-sm text-dark-100 truncate"
                      />
                      <button
                        onClick={() => copyToClipboard(activeMeeting.joinUrl)}
                        className="p-2 hover:bg-dark-600 rounded transition"
                      >
                        {copiedUrl ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between space-x-2">
                    <button
                      className="btn-secondary flex-1"
                      onClick={() => {
                        setShowMeetModal(false);
                        setMeetTitle('');
                        setActiveMeeting(null);
                      }}
                    >
                      Close
                    </button>
                    <button
                      className="btn-primary flex-1"
                      onClick={() => {
                        window.open(activeMeeting.joinUrl, '_blank');
                      }}
                    >
                      Join Meeting
                    </button>
                  </div>
                </>
              ) : (
                // Show form to create new meeting
                <>
                  <h2 className="text-lg font-bold mb-4">Start a Meeting</h2>

                  <label className="block mb-4">
                    <span className="text-dark-100 mb-2 block">Select Room</span>
                    <select
                      className="w-full p-2 bg-dark-700 rounded border border-dark-600 text-dark-100"
                      value={selectedRoomId}
                      onChange={(e) => handleRoomChange(e.target.value)}
                      disabled={loadingRooms || loadingActiveMeeting}
                    >
                      <option value="">-- Select a room --</option>
                      {availableRooms.map((room) => (
                        <option key={room._id} value={room._id}>
                          {room.name || room._id.substring(0, 8)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block mb-4">
                    <span className="text-dark-100 mb-2 block">Meeting Title (optional)</span>
                    <input
                      className="w-full p-2 bg-dark-700 rounded border border-dark-600 text-dark-100"
                      value={meetTitle}
                      onChange={(e) => setMeetTitle(e.target.value)}
                      placeholder="e.g., Sprint Planning"
                    />
                  </label>

                  <div className="flex justify-end space-x-2">
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setShowMeetModal(false);
                        setMeetTitle('');
                        setSelectedRoomId('');
                        setActiveMeeting(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary disabled:opacity-50"
                      disabled={!selectedRoomId || loadingRooms || loadingActiveMeeting}
                      onClick={async () => {
                        if (!selectedRoomId) {
                          alert('Please select a room');
                          return;
                        }
                        try {
                          const resp = await roomAPI.createRoomMeeting(selectedRoomId, { title: meetTitle });
                          const meeting = resp.data;
                          window.open(meeting.joinUrl, '_blank');
                          setShowMeetModal(false);
                          setMeetTitle('');
                          setSelectedRoomId('');
                          setActiveMeeting(null);
                        } catch (e) {
                          console.error(e);
                          alert('Failed to start meeting: ' + (e.response?.data?.message || e.message));
                        }
                      }}
                    >
                      {loadingActiveMeeting ? 'Checking...' : 'Start Meeting'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Summary Tab */}
          {modalTab === 'summary' && (
            <div>
              <h2 className="text-lg font-bold mb-4">Meeting Summaries</h2>
              {loadingSummaries ? (
                <p className="text-dark-400">Loading summaries...</p>
              ) : meetingSummaries.length === 0 ? (
                <p className="text-dark-400">No meeting summaries available yet.</p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {meetingSummaries.map((summary) => (
                    <div key={summary._id} className="bg-dark-700 p-4 rounded border border-dark-600">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm text-primary font-semibold">{summary.roomName}</p>
                          <p className="text-dark-100 font-medium">{summary.title}</p>
                          <p className="text-xs text-dark-400 mt-1">
                            {new Date(summary.endTime).toLocaleDateString()} - {new Date(summary.endTime).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="bg-dark-600 p-3 rounded mt-3">
                        <p className="text-sm text-dark-100">{summary.summary}</p>
                      </div>
                      {summary.analysis && (
                        <div className="bg-dark-600 p-3 rounded mt-2 border-l-2 border-primary">
                          <p className="text-xs text-dark-400 mb-1 font-semibold">AI Analysis:</p>
                          <p className="text-sm text-dark-200">{summary.analysis}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="mt-4 pt-4 border-t border-dark-700">
            <button
              className="w-full btn-secondary"
              onClick={() => {
                setShowMeetModal(false);
                setMeetTitle('');
                setSelectedRoomId('');
                setActiveMeeting(null);
                setModalTab('meet');
              }}
            >
              Close
            </button>
          </div>        </div>
      </div>
    )}
    </>
  );
}