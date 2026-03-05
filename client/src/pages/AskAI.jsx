import { useState, useEffect, useRef } from 'react';
import { roomAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Play, Volume2, Github } from 'lucide-react';

export default function AskAI() {
  const { user, isAuthenticated } = useAuth();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [roomId, setRoomId] = useState('');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      roomAPI.getAllRooms().then((r) => setRooms(r.data)).catch(() => {});
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = 'en-US';
      recog.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setQuestion((prev) => (prev ? prev + ' ' + text : text));
      };
      recog.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current = recog;
    }

    return () => {
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
    };
  }, [isAuthenticated]);

  const sendQuestion = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const target = roomId || (window.location.pathname.match(/\/room\/([a-fA-F0-9]+)/) || [])[1];
      const resp = await roomAPI.askRoomAI(target, question);
      const ans = resp.data?.answer || '';
      const audio = resp.data?.audioUrl || '';
      
      setAnswer(ans);
      setAudioUrl(audio);

      // If server provided audio URL, play it
      if (audio && audioRef.current) {
        audioRef.current.src = audio;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
          // If audio fails, fallback to browser speech synthesis
          speakAnswer(ans);
        });
      } else {
        // Fallback to browser speech synthesis if no server audio
        speakAnswer(ans);
      }
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.error || e.response?.status === 403
        ? 'Please connect your GitHub account to use the Open Source Companion. Use "Connect GitHub" in the menu.'
        : 'Failed to fetch answer';
      setAnswer(msg);
    } finally {
      setLoading(false);
    }
  };

  const speakAnswer = (text) => {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 1;
      utter.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
      setIsPlaying(true);
      utter.onend = () => setIsPlaying(false);
    } catch (e) {
      console.error('Speech synthesis failed:', e);
    }
  };

  const connectGitHub = async () => {
    try {
      const resp = await authAPI.getGitHubAuthUrl('link');
      if (resp.data?.url) window.location.href = resp.data.url;
    } catch (e) {
      console.error(e);
      const msg =
        e.response?.data?.error ||
        'Could not start GitHub connection. Please try again.';
      setAnswer(msg);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Ask AI</h1>
      {isAuthenticated && !user?.githubUsername && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-amber-200 mb-3">
            Connect your GitHub account to use the Open Source Companion for this repository.
          </p>
          <button
            type="button"
            onClick={connectGitHub}
            className="btn-primary flex items-center space-x-2"
          >
            <Github className="w-4 h-4" />
            <span>Connect GitHub</span>
          </button>
        </div>
      )}
      {isAuthenticated && (
        <>
          <div className="mb-4">
            <label className="block mb-1">Room (optional)</label>
            <select
              className="w-full p-2 bg-dark-700 rounded"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            >
              <option value="">-- none --</option>
              {rooms.map((r) => (
                <option key={r._id} value={r._id}>{r.name || r._id}</option>
              ))}
            </select>
          </div>
          <textarea
            className="w-full p-2 bg-dark-700 rounded mb-2"
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={user?.githubUsername ? 'Ask about the repo, issues, PRs, onboarding...' : 'Connect GitHub above to ask the Open Source Companion.'}
            disabled={!user?.githubUsername}
          />
          {recognitionRef.current && user?.githubUsername && (
            <button
              className={`btn-secondary mr-2 ${isListening ? 'bg-red-600 text-white' : ''}`}
              onClick={() => {
                if (isListening) {
                  recognitionRef.current.stop();
                } else {
                  recognitionRef.current.start();
                  setIsListening(true);
                }
              }}
            >
              {isListening ? 'Stop Recording' : 'Record Question'}
            </button>
          )}
          <button
            className="btn-primary"
            disabled={loading || !question.trim() || !user?.githubUsername}
            onClick={sendQuestion}
          >
            {loading ? 'Thinking...' : 'Ask'}
          </button>
          {answer && (
            <div className="mt-4 bg-dark-700 p-4 rounded">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">Answer</h2>
                {audioUrl && (
                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        if (isPlaying) {
                          audioRef.current.pause();
                          setIsPlaying(false);
                        } else {
                          audioRef.current.play().then(() => setIsPlaying(true));
                        }
                      }
                    }}
                    className="flex items-center space-x-1 px-2 py-1 bg-primary hover:bg-primary-600 rounded text-white text-sm"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{isPlaying ? 'Stop' : 'Play Voice'}</span>
                  </button>
                )}
              </div>
              <p className="text-dark-100">{answer}</p>
              {audioUrl && (
                <audio
                  ref={audioRef}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              )}
            </div>
          )}
        </>
      )}
      {!isAuthenticated && <p>Please log in to ask the AI.</p>}
    </div>
  );
}
