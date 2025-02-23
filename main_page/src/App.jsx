import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setQuestions([]);

    try {
      const response = await axios.post('http://localhost:8000/get-questions', { topic });
      setQuestions(response.data.questions);
    } catch (err) {
      setError('Failed to fetch questions. Please try again.');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="app-container">
      <h1>Generate 50 Questions</h1>
      <form onSubmit={handleSubmit} className="question-form">
        <label htmlFor="topic-input" className="input-label">Topic:</label>
        <input 
          id="topic-input"
          type="text" 
          value={topic} 
          onChange={(e) => setTopic(e.target.value)} 
          placeholder="Enter a topic" 
          required
          className="topic-input"
        />
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Generating...' : 'Get Questions'}
        </button>
      </form>
      {error && <div className="error-message">{error}</div>}
      {questions.length > 0 && (
        <section className="questions-list">
          {questions.map((q, index) => (
            <div key={index} className="question-item">
              {q}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default App;
