import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">
        Welcome to AI Interviewer
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Practice your interview skills with our AI-powered platform
      </p>
      <div className="space-y-4">
        <Link
          to="/interview"
          className="block w-64 mx-auto bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary"
        >
          Start Interview
        </Link>
        <Link
          to="/dashboard"
          className="block w-64 mx-auto border border-primary text-primary px-6 py-3 rounded-lg hover:bg-primary hover:text-white"
        >
          View Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Home;