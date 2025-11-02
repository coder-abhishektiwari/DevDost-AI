import { Sparkles, Zap, MessageSquare, Code2, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";


export default function HomePage({ onGetStarted }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 overflow-hidden">
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            DevDost AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-5 py-2 text-gray-700 hover:text-purple-600 transition-colors font-medium">
            Features
          </button>
          <button className="px-5 py-2 text-gray-700 hover:text-purple-600 transition-colors font-medium">
            Pricing
          </button>
          <button
            onClick={onGetStarted}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:shadow-lg hover:scale-105 transition-all font-medium"
          >
            Get Started
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-20 text-center">
        <div className="inline-block mb-4 px-4 py-2 bg-purple-100 rounded-full">
          <span className="text-purple-600 font-medium text-sm">
            ✨ Your AI Coding Companion
          </span>
        </div>

        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 bg-clip-text text-transparent leading-tight">
          Code with Your <br /> Best Friend
        </h1>

        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          DevDost AI combines powerful code intelligence with a delightful experience.
          Build faster, learn better, and enjoy every moment.
        </p>

        <div className="flex gap-4 justify-center mb-16">
          <button
            onClick={() => navigate("/agent")}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:shadow-2xl hover:scale-105 transition-all font-semibold text-lg flex items-center gap-2"
          >
            <Zap className="w-5 h-5" />
            Start Creating
          </button>
        </div>

        {/* Floating cards */}
        <div className="relative h-96 mt-20">
          <div className="absolute top-0 left-1/4 transform -translate-x-1/2 animate-float">
            <div className="w-64 h-48 bg-white rounded-3xl shadow-2xl p-6 border border-purple-100">
              <div className="flex items-center gap-2 mb-4">
                <Code2 className="w-5 h-5 text-purple-500" />
                <span className="font-semibold text-gray-800">
                  Smart Completion
                </span>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-purple-100 rounded w-full"></div>
                <div className="h-2 bg-purple-100 rounded w-4/5"></div>
                <div className="h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded w-3/5"></div>
              </div>
            </div>
          </div>

          <div className="absolute top-20 right-1/4 transform translate-x-1/2 animate-float-delayed">
            <div className="w-64 h-48 bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl shadow-2xl p-6 border border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <span className="font-semibold text-gray-800">AI Assistant</span>
              </div>
              <div className="space-y-3">
                <div className="bg-white rounded-2xl p-3 text-sm text-gray-600 shadow-sm">
                  How can I help? 💭
                </div>
                <div className="bg-purple-500 text-white rounded-2xl p-3 text-sm shadow-sm ml-8">
                  Refactor this code
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 animate-float">
            <div className="w-72 h-40 bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl shadow-2xl p-6 border border-pink-100">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-5 h-5 text-pink-500" />
                <span className="font-semibold text-gray-800">Made with Love</span>
              </div>
              <p className="text-sm text-gray-600">
                Every feature designed to make coding joyful
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 6s ease-in-out infinite 1s; }
      `}</style>
    </div>
  );
}
