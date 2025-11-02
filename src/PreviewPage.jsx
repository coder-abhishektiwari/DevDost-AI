import React from "react";
import { useNavigate } from "react-router-dom";

export default function PreviewPage() {
  const navigate = useNavigate();
  const generatedHTML = localStorage.getItem("generatedHTML");

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 p-6">
      <div className="flex justify-between items-center w-full max-w-5xl mb-4">
        <h2 className="text-2xl font-bold text-purple-600">AI Project Preview 🌐</h2>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
        >
          ← Back to Generator
        </button>
      </div>

      {generatedHTML ? (
        <iframe
          sandbox="allow-scripts"
          srcDoc={generatedHTML}
          title="AI Preview"
          width="100%"
          height="600"
          style={{ border: "none", borderRadius: "12px" }}
        />
      ) : (
        <p className="text-gray-500">No project found. Go back and generate one.</p>
      )}
    </div>
  );
}
