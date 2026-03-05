import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { roomAPI, meetingAPI } from '../services/api';

export default function MeetingHistory() {
  const { roomId } = useParams();
  const [meetings, setMeetings] = useState([]);
  const [roomInfo, setRoomInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [tabs, setTabs] = useState({}); // store tab state per meeting
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    const load = async () => {
      console.log('Loading meetings for roomId', roomId);
      try {
        const [meetingsResp, roomResp] = await Promise.all([
          roomAPI.getRoomMeetings(roomId),
          roomAPI.getRoom(roomId),
        ]);
        console.log('meetingsResp', meetingsResp.data);
        setMeetings(meetingsResp.data);
        setRoomInfo(roomResp.data);
      } catch (e) {
        console.error('MeetingHistory load error', e);
        setError('Could not load meetings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [roomId]);

  if (loading) return <p className="p-4">Loading meetings…</p>;
  if (error) return <p className="p-4 text-red-400">{error}</p>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Meeting History{roomInfo ? ` – ${roomInfo.name || roomInfo._id.slice(0,8)}` : ''}
      </h1>
      {meetings.length === 0 && <p>No meetings held yet.</p>}
      {meetings.map((m) => (
        <div key={m._id} className="border rounded p-4 mb-4 bg-dark-800">
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setExpandedId(expandedId === m._id ? null : m._id)}
          >
            <div>
              <h2 className="font-semibold">{m.title || 'Untitled'}</h2>
              <p className="text-sm text-dark-400">
                {new Date(m.startTime).toLocaleString()} -{' '}
                {m.endTime ? new Date(m.endTime).toLocaleString() : 'ended'}
              </p>
            </div>
            {m.status === 'ended' || m.endTime ? (
              <button
                className="btn-secondary btn-sm opacity-60 cursor-not-allowed"
                onClick={(e) => e.stopPropagation()}
                disabled
              >
                Ended
              </button>
            ) : (
              <a
                href={m.joinUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary btn-sm"
                onClick={(e) => e.stopPropagation()}
              >
                Join
              </a>
            )}
          </div>
          {expandedId === m._id && (
            <div className="mt-4">
              {m.status === 'ended' ? (
                <>
                  <div className="flex space-x-2 mb-4 border-b border-dark-700">
                    <button
                      className={`px-4 py-2 border-b-2 transition ${
                        (tabs[m._id] || 'summary') === 'summary'
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-dark-400 hover:text-dark-200'
                      }`}
                      onClick={() => setTabs({ ...tabs, [m._id]: 'summary' })}
                    >
                      Summary
                    </button>
                    <button
                      className={`px-4 py-2 border-b-2 transition ${
                        (tabs[m._id] || 'summary') === 'analysis'
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-dark-400 hover:text-dark-200'
                      }`}
                      onClick={() => setTabs({ ...tabs, [m._id]: 'analysis' })}
                    >
                      Analysis
                    </button>
                  </div>
                  {(tabs[m._id] || 'summary') === 'summary' ? (
                    <>
                      {m.summary ? (
                        <p className="text-dark-100">{m.summary}</p>
                      ) : (
                        <div>
                          <p className="text-dark-400">No summary available.</p>
                          <button
                            className="btn-primary btn-sm mt-2"
                            disabled={generating}
                            onClick={async () => {
                              setGenerating(true);
                              try {
                                const res = await roomAPI.summarizeMeeting(m._id);
                                // update meetings list
                                setMeetings((prev) =>
                                  prev.map((x) => (x._id === m._id ? res.data : x))
                                );
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setGenerating(false);
                              }
                            }}
                          >
                            {generating ? 'Generating…' : 'Generate Summary'}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-dark-100">{m.analysis || 'No analysis available.'}</p>
                  )}
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <p className="text-dark-400">Meeting in progress. Summary will be generated when you end the meeting.</p>
                  <button
                    className="btn-primary btn-sm"
                    disabled={generating}
                    onClick={async () => {
                      setGenerating(true);
                      try {
                        console.log('Ending meeting:', m._id);
                        const endResp = await meetingAPI.endMeeting(m._id, {});
                        console.log('End meeting response:', endResp.data);
                        // reload meetings to reflect the status change
                        const resp = await roomAPI.getRoomMeetings(m.roomId || roomId);
                        console.log('Reloaded meetings:', resp.data);
                        setMeetings(resp.data);
                      } catch (e) {
                        console.error('Error ending meeting:', e.response?.data || e.message);
                        alert('Error ending meeting: ' + (e.response?.data?.message || e.message));
                      } finally {
                        setGenerating(false);
                      }
                    }}
                  >
                    {generating ? 'Ending…' : 'End Meeting'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
