import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { interviewApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Interview = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [interviewData, setInterviewData] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const recognition = useRef(null);

  useEffect(() => {
    if (window.webkitSpeechRecognition) {
      recognition.current = new window.webkitSpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      
      recognition.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setTranscript(transcript);
      };
    }

    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
    };
  }, []);

  const startInterview = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await interviewApi.startInterview('general');
      setInterviewData(result.interview);
      setCurrentQuestion(result.question);
      setAvatarUrl(result.video_url);
      setIsRecording(true);
      
      if (recognition.current) {
        recognition.current.start();
      }
    } catch (err) {
      setError('Failed to start interview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const endInterview = async () => {
    try {
      setLoading(true);
      if (recognition.current) {
        recognition.current.stop();
      }
      
      await interviewApi.submitResponse(interviewData.id, transcript);
      setIsRecording(false);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to save interview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Please login to start an interview
          </h2>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Your Camera</h2>
            <Webcam
              audio={false}
              className="w-full rounded-lg"
              mirrored={true}
            />
          </div>
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Your Response</h2>
            <p className="text-gray-600 min-h-[100px]">{transcript}</p>
          </div>
        </div>
        <div className="card">
          <h2 className="text-2xl font-bold mb-4">AI Interviewer</h2>
          {currentQuestion && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Current Question:</h3>
              <p className="mt-2">{currentQuestion}</p>
            </div>
          )}
          <div className="aspect-video bg-gray-100 rounded-lg mb-4">
            {avatarUrl && (
              <video
                src={avatarUrl}
                className="w-full h-full rounded-lg"
                autoPlay
                controls
              />
            )}
          </div>
          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-md mb-4">
              {error}
            </div>
          )}
          <div className="space-y-4">
            {!isRecording ? (
              <button
                onClick={startInterview}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Starting...' : 'Start Interview'}
              </button>
            ) : (
              <button
                onClick={endInterview}
                disabled={loading}
                className="w-full bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors duration-200"
              >
                {loading ? 'Ending...' : 'End Interview'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;