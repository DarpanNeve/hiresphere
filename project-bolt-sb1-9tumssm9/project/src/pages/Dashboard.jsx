import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const [interviews, setInterviews] = useState([]);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchInterviews();
  }, [user, navigate]);

  const fetchInterviews = async () => {
    try {
      const data = await interviewApi.getHistory();
      setInterviews(data);
    } catch (err) {
      setError('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Interview Dashboard</h1>
        <button
          onClick={() => navigate('/interview')}
          className="btn-primary"
        >
          New Interview
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-8">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Interview History</h2>
            {interviews.length === 0 ? (
              <p className="text-gray-600">No interviews yet</p>
            ) : (
              <div className="space-y-2">
                {interviews.map((interview) => (
                  <button
                    key={interview.id}
                    className={`w-full text-left p-4 rounded-lg transition-colors duration-200 ${
                      selectedInterview?.id === interview.id
                        ? 'bg-primary text-white'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedInterview(interview)}
                  >
                    <p className="font-semibold">
                      {new Date(interview.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm opacity-80">{interview.topic}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Interview Analysis</h2>
            {selectedInterview ? (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Knowledge Score</p>
                    <p className="text-2xl font-bold text-primary">
                      {selectedInterview.knowledge_score}%
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Communication Score</p>
                    <p className="text-2xl font-bold text-primary">
                      {selectedInterview.communication_score}%
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Confidence Score</p>
                    <p className="text-2xl font-bold text-primary">
                      {selectedInterview.confidence_score}%
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Feedback</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-line">
                      {selectedInterview.feedback}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">Select an interview to view analysis</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;