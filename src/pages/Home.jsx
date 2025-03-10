import { Link } from "react-router-dom";
import {
  Brain,
  Video,
  BarChart3,
  MessageSquare,
  Clock,
  Users,
  ChevronRight,
  Camera,
  PieChart,
  LineChart,
  Play,
  ArrowRight,
} from "lucide-react";
import PricingSection from "../components/PricingSection";

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
      <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        <Icon className="h-7 w-7 text-white" />
      </div>
      <h3 className="text-xl font-bold mb-3 text-gray-800">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="relative overflow-hidden bg-white/10 backdrop-blur-lg rounded-2xl p-8 transform hover:scale-105 transition-transform duration-300">
      <div className="relative z-10">
        <div className="text-5xl font-bold mb-3 bg-gradient-to-r from-white to-indigo-100 text-transparent bg-clip-text">
          {value}
        </div>
        <div className="text-indigo-100 text-lg font-medium">{label}</div>
      </div>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent"></div>
    </div>
  );
}

function ProcessStep({ icon: Icon, title, description }) {
  return (
    <div className="relative group">
      <div className="text-center">
        <div className="h-20 w-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 transform group-hover:rotate-6 transition-transform duration-300 shadow-lg">
          <Icon className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold mb-4 text-gray-800">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 to-purple-900">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=2100&q=80')] opacity-10 bg-cover bg-center"></div>
        <div className="relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
            <div className="text-center">
              <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-white mb-8 animate-gradient">
                AI-Powered Interview Excellence
              </h1>
              <p className="text-2xl text-indigo-100 max-w-3xl mx-auto mb-12 leading-relaxed">
                Transform your hiring process with real-time AI analysis of
                candidate interviews. Get deeper insights into communication
                skills, knowledge, and non-verbal cues.
              </p>
              <div className="flex justify-center gap-6">
                <button className="group bg-white text-indigo-900 px-8 py-4 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex items-center text-lg shadow-lg hover:shadow-xl">
                  Get Started
                  <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="group bg-indigo-800/50 backdrop-blur-lg text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-800/70 transition-colors flex items-center text-lg border border-indigo-700/50">
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Comprehensive Interview Analysis
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Our AI-powered platform provides deep insights into every aspect of
            the interview process, helping you make better hiring decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={Brain}
            title="AI-Driven Questions"
            description="Dynamic question generation adapted to candidate responses and expertise level"
          />
          <FeatureCard
            icon={Video}
            title="Non-verbal Analysis"
            description="Real-time analysis of facial expressions, gestures, and body language"
          />
          <FeatureCard
            icon={BarChart3}
            title="Performance Metrics"
            description="Comprehensive scoring based on knowledge, communication, and confidence"
          />
          <FeatureCard
            icon={MessageSquare}
            title="Speech Analysis"
            description="Real-time evaluation of speech clarity, pace, and vocabulary"
          />
          <FeatureCard
            icon={Clock}
            title="Time Efficiency"
            description="Streamlined evaluation process saving valuable HR resources"
          />
          <FeatureCard
            icon={Users}
            title="Unbiased Assessment"
            description="Standardized evaluation criteria for fair candidate assessment"
          />
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?ixlib=rb-1.2.1&auto=format&fit=crop&w=2100&q=80')] opacity-10 bg-cover bg-center"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCard value="85%" label="Faster Hiring Process" />
            <StatCard value="95%" label="Accuracy Rate" />
            <StatCard value="24/7" label="Available Globally" />
            <StatCard value="50K+" label="Interviews Analyzed" />
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Experience a seamless journey from interview setup to comprehensive
            insights
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          <ProcessStep
            icon={Camera}
            title="Record Interview"
            description="Capture high-quality video and audio with our intuitive platform designed for seamless interactions"
          />
          <ProcessStep
            icon={Brain}
            title="AI Analysis"
            description="Our advanced AI processes multiple aspects of the interview in real-time for comprehensive evaluation"
          />
          <ProcessStep
            icon={PieChart}
            title="Get Insights"
            description="Receive detailed reports and actionable insights to make informed hiring decisions"
          />
        </div>
      </div>

      {/* Pricing Section */}
      <PricingSection />

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?ixlib=rb-1.2.1&auto=format&fit=crop&w=2100&q=80')] opacity-10 bg-cover bg-center"></div>
          <div className="relative z-10 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Transform Your Hiring Process?
            </h2>
            <p className="text-xl text-indigo-100 max-w-3xl mx-auto mb-8">
              Join thousands of companies already using our AI-powered interview
              platform
            </p>
            <button className="bg-white text-indigo-900 px-8 py-4 rounded-xl font-bold hover:bg-indigo-50 transition-colors inline-flex items-center text-lg">
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-2">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                AI Interview Tool
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Transforming the way organizations conduct and evaluate
                interviews with cutting-edge AI technology.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Quick Links</h4>
              <ul className="space-y-3 text-gray-600">
                <li className="hover:text-indigo-600 cursor-pointer transition-colors">
                  Features
                </li>
                <li className="hover:text-indigo-600 cursor-pointer transition-colors">
                  Pricing
                </li>
                <li className="hover:text-indigo-600 cursor-pointer transition-colors">
                  Case Studies
                </li>
                <li className="hover:text-indigo-600 cursor-pointer transition-colors">
                  Documentation
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Contact</h4>
              <ul className="space-y-3 text-gray-600">
                <li className="hover:text-indigo-600 cursor-pointer transition-colors">
                  Support
                </li>
                <li className="hover:text-indigo-600 cursor-pointer transition-colors">
                  Sales
                </li>
                <li className="hover:text-indigo-600 cursor-pointer transition-colors">
                  Demo
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-12 pt-8 text-center text-gray-600">
            <p>&copy; 2024 AI Interview Tool. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
