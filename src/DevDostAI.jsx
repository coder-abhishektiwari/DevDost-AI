import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Code2, Eye, User, Plus, MessageSquare, Play, Save, FileCode, Clock, ChevronRight, MoreVertical, Edit2, Copy, Trash2, FileText, FolderPlus, FilePlus, Download, Send, Loader2, CheckCircle, FileIcon, FolderIcon } from 'lucide-react';

const socket = (() => {
  try {
    const io = require('socket.io-client');
    return io("http://localhost:5000");
  } catch (e) {
    return null;
  }
})();

export default function DevDostAI() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', content: "Hi! I'm here to help you code. What would you like to build today? 💜" }
  ]);
  const [aiStatus, setAiStatus] = useState({ active: false, message: "" });
  const chatEndRef = useRef(null);
  const iframeRef = useRef(null);

  const [activeTab, setActiveTab] = useState('code');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [renamingFile, setRenamingFile] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileModal, setShowNewFileModal] = useState(null);
  const [newFileNameInput, setNewFileNameInput] = useState('');
  const [previewHTML, setPreviewHTML] = useState('');

  // ==================== SOCKET CONNECTION ====================
  useEffect(() => {
    async function fetchFiles() {
      try {
        const res = await fetch("http://localhost:5000/get_files");
        const data = await res.json();
        setFiles(data);
        setSelectedFile(data[0]?.id || null);
        updatePreview(data);
      } catch (err) {
        console.error("Error fetching files:", err);
      }
    }
    fetchFiles();

    if (socket) {
      // Real-time file updates
      socket.on("file_updated", (data) => {
        console.log("🧠 File updated:", data);
        setFiles((prev) => {
          const updated = prev.map((f) =>
            f.name === data.name ? { ...f, content: data.content } : f
          );
          updatePreview(updated);
          return updated;
        });

        setAiStatus({ active: true, message: `📝 Updated: ${data.name}` });
        setTimeout(() => setAiStatus({ active: false, message: "" }), 2000);
      });

      // Real-time file creation
      socket.on("file_created", (data) => {
        console.log("✨ File created:", data);
        setFiles((prev) => {
          const updated = [...prev, data];
          updatePreview(updated);
          return updated;
        });

        setAiStatus({ active: true, message: `✨ Created: ${data.name}` });
        setTimeout(() => setAiStatus({ active: false, message: "" }), 2000);
      });

      // AI generation steps
      socket.on("ai_step", (data) => {
        console.log("🤖 AI Step:", data);
        setAiStatus({ active: true, message: data.message });
      });

      socket.on("file_deleted", (data) => {
        console.log("🗑️ File deleted:", data);
        setFiles((prev) => prev.filter(f => f.name !== data.name));
      });

      socket.on("file_renamed", (data) => {
        console.log("✏️ File renamed:", data);
        setFiles((prev) =>
          prev.map((f) =>
            f.name === data.oldName ? { ...f, name: data.newName } : f
          )
        );
      });

      return () => {
        socket.off("file_updated");
        socket.off("file_created");
        socket.off("file_deleted");
        socket.off("file_renamed");
        socket.off("ai_step");
      };
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Update preview when files change
  const updatePreview = (filesList) => {
    const htmlFile = filesList.find(f => f.name.endsWith('.html') || f.name === 'index.html');
    const cssFile = filesList.find(f => f.name.endsWith('.css'));
    const jsFile = filesList.find(f => f.name.endsWith('.js'));

    if (htmlFile) {
      let html = htmlFile.content;

      // Inject CSS
      if (cssFile) {
        html = html.replace('</head>', `<style>${cssFile.content}</style></head>`);
      }

      // Inject JS
      if (jsFile) {
        html = html.replace('</body>', `<script>${jsFile.content}</script></body>`);
      }

      setPreviewHTML(html);
    }
  };

  useEffect(() => {
    updatePreview(files);
  }, [files]);

  // ==================== AI GENERATION ====================
  async function handleGenerate() {
    if (!prompt.trim()) return;

    const userMessage = { role: 'user', content: prompt };
    setChatMessages(prev => [...prev, userMessage]);
    setPrompt("");
    setLoading(true);
    setAiStatus({ active: true, message: "🤖 AI is analyzing your request..." });

    try {
      const res = await fetch("http://localhost:5000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage.content }),
      });

      const data = await res.json();

      if (data.success) {
        setChatMessages(prev => [...prev, {
          role: 'ai',
          content: `✅ Generated successfully! Check your preview.`
        }]);

        setAiStatus({ active: true, message: "✅ Project generated successfully!" });

        setTimeout(async () => {
          const filesRes = await fetch("http://localhost:5000/get_files");
          const filesData = await filesRes.json();
          setFiles(filesData);
          updatePreview(filesData);
          if (filesData.length > 0) {
            setSelectedFile(filesData[0].id);
          }
          setAiStatus({ active: false, message: "" });
        }, 1000);
      } else {
        setChatMessages(prev => [...prev, {
          role: 'ai',
          content: `❌ Error: ${data.error}`
        }]);
        setAiStatus({ active: false, message: "" });
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: "❌ Server not reachable! Make sure backend is running."
      }]);
      setAiStatus({ active: false, message: "" });
    } finally {
      setLoading(false);
    }
  }

  // ==================== FILE OPERATIONS ====================
  const handleContextMenu = (e, file) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const handleRename = (file) => {
    setRenamingFile(file.id);
    setNewFileName(file.name);
    setContextMenu(null);
  };

  const confirmRename = async (fileId) => {
    if (newFileName.trim()) {
      const file = files.find(f => f.id === fileId);
      const oldName = file.name;

      try {
        const res = await fetch("http://localhost:5000/rename_file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldName, newName: newFileName.trim() }),
        });

        if (res.ok) {
          setFiles(files.map(f => f.id === fileId ? { ...f, name: newFileName.trim() } : f));
        }
      } catch (err) {
        console.error("Error renaming file:", err);
      }
    }
    setRenamingFile(null);
  };

  const handleCopy = async (file) => {
    const newName = `${file.name.replace(/\.(jsx?|css|html|py|txt)$/, '')}_copy${file.name.match(/\.(jsx?|css|html|py|txt)$/)?.[0] || ''}`;

    try {
      const res = await fetch("http://localhost:5000/create_file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          content: file.content,
          type: 'file'
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFiles(prev => [...prev, data]);
      }
    } catch (err) {
      console.error("Error copying file:", err);
    }
    setContextMenu(null);
  };

  const handleDelete = async (fileId) => {
    const file = files.find(f => f.id === fileId);

    try {
      const res = await fetch("http://localhost:5000/delete_file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name }),
      });

      if (res.ok) {
        setFiles(files.filter(f => f.id !== fileId));
        if (selectedFile === fileId) {
          const remainingFiles = files.filter(f => f.type === 'file' && f.id !== fileId);
          setSelectedFile(remainingFiles[0]?.id || null);
        }
      }
    } catch (err) {
      console.error("Error deleting file:", err);
    }
    setContextMenu(null);
  };

  const handleFileContentChange = (newContent) => {
    const file = files.find(f => f.id === selectedFile);
    if (!file) return;

    const updatedFiles = files.map(f =>
      f.id === selectedFile ? { ...f, content: newContent } : f
    );

    setFiles(updatedFiles);
    updatePreview(updatedFiles);

    if (socket) {
      socket.emit("update_file", {
        name: file.name,
        content: newContent,
      });
    }
  };

  const handleSaveFile = async () => {
    const file = files.find(f => f.id === selectedFile);
    if (!file) return;

    try {
      const res = await fetch("http://localhost:5000/save_file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, content: file.content }),
      });

      if (res.ok) {
        setChatMessages(prev => [...prev, {
          role: 'ai',
          content: `✅ File "${file.name}" saved!`
        }]);
      }
    } catch (err) {
      console.error("Error saving file:", err);
    }
  };

  const handleDownloadProject = async () => {
    try {
      const res = await fetch("http://localhost:5000/download_project");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: '📦 Project downloaded!'
      }]);
    } catch (err) {
      console.error("Error downloading project:", err);
      alert("Failed to download project");
    }
  };

  const createNewFile = (type) => {
    setShowNewFileModal({ type });
    setNewFileNameInput('');
  };

  const confirmNewFile = async () => {
    if (newFileNameInput.trim()) {
      try {
        const res = await fetch("http://localhost:5000/create_file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newFileNameInput.trim(),
            content: '',
            type: showNewFileModal.type
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setFiles(prev => [...prev, data]);
          if (showNewFileModal.type === 'file') {
            setSelectedFile(data.id);
          }
        }
      } catch (err) {
        console.error("Error creating file:", err);
      }
    }
    setShowNewFileModal(null);
  };

  const selectedFileData = files.find(f => f.id === selectedFile);

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50/30 via-white to-blue-50/30">
      {/* Sidebar */}
      <aside className="w-20 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col items-center py-6 gap-8">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer">
          <Sparkles className="w-6 h-6 text-white" />
        </div>

        <nav className="flex flex-col gap-4 flex-1">
          <button
            onClick={() => setActiveTab('code')}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'code'
              ? 'bg-purple-100 text-purple-600 shadow-md'
              : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
              }`}
            title="Code Editor"
          >
            <Code2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'preview'
              ? 'bg-purple-100 text-purple-600 shadow-md'
              : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
              }`}
            title="Live Preview"
          >
            <Eye className="w-5 h-5" />
          </button>
        </nav>

        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
          <User className="w-5 h-5 text-white" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">DevDost AI 🚀</h2>
              <p className="text-sm text-gray-500">Real-time code generation & preview</p>
            </div>

            {/* AI Status Indicator */}
            {aiStatus.active && (
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl border border-purple-200 animate-pulse">
                <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                <span className="text-sm font-medium text-purple-700">{aiStatus.message}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadProject}
              className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={() => createNewFile('file')}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New File
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-8">
          <div className="grid grid-cols-4 gap-6 h-full">

            {/* File Explorer - Only show in code tab */}
            {activeTab === 'code' && (
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-gray-200/50 bg-gradient-to-r from-purple-50/50 to-pink-50/50 flex items-center justify-between">
                  <span className="font-semibold text-gray-800 text-sm">Files</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => createNewFile('file')}
                      className="p-1.5 hover:bg-white rounded-lg transition-colors"
                      title="New File"
                    >
                      <FilePlus className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => createNewFile('folder')}
                      className="p-1.5 hover:bg-white rounded-lg transition-colors"
                      title="New Folder"
                    >
                      <FolderPlus className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-2">
                  {files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
                      <FileIcon className="w-12 h-12 mb-2 opacity-30" />
                      <p className="text-sm text-center">No files yet. Ask AI to generate code!</p>
                    </div>
                  ) : (
                    files.map(file => (
                      <div
                        key={file.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group transition-all ${selectedFile === file.id
                          ? 'bg-purple-100 text-purple-700'
                          : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        onClick={() => setSelectedFile(file.id)}
                        onContextMenu={(e) => handleContextMenu(e, file)}
                      >
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        {renamingFile === file.id ? (
                          <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onBlur={() => confirmRename(file.id)}
                            onKeyDown={(e) => e.key === 'Enter' && confirmRename(file.id)}
                            className="flex-1 px-2 py-0.5 text-sm border border-purple-300 rounded outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className="flex-1 text-sm font-medium truncate">{file.name}</span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContextMenu(e, file);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                        >
                          <MoreVertical className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Code Editor & Preview Area - Adjust colspan based on activeTab */}
            <div className={`${activeTab === 'code' ? 'col-span-2' : 'col-span-3'} bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden flex flex-col`}>
              {activeTab === 'code' ? (
                <>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-purple-50/50 to-pink-50/50">
                    <div className="flex items-center gap-3">
                      <FileCode className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-gray-800">
                        {selectedFileData?.name || 'No file selected'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveFile}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                        title="Save File"
                      >
                        <Save className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => setActiveTab('preview')}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                        title="View Preview"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 p-6 font-mono text-sm overflow-auto bg-gradient-to-br from-gray-50 to-purple-50/20">
                    {selectedFileData ? (
                      <textarea
                        value={selectedFileData.content}
                        onChange={(e) => handleFileContentChange(e.target.value)}
                        className="w-full h-full bg-transparent resize-none outline-none font-mono text-sm text-gray-700 leading-relaxed"
                        placeholder="Start coding..."
                        spellCheck={false}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Code2 className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-center">Select a file to edit or ask AI to generate code</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-purple-50/50 to-pink-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Eye className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-gray-800">Live Preview</span>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                    <button
                      onClick={() => setActiveTab('code')}
                      className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                    >
                      Back to Code
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {previewHTML ? (
                      <iframe
                        ref={iframeRef}
                        srcDoc={previewHTML}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin"
                        title="Live Preview"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                        <Eye className="w-20 h-20 mb-4 opacity-20" />
                        <p className="text-lg font-medium mb-2">No preview available</p>
                        <p className="text-sm text-center max-w-md">
                          Ask AI to generate HTML/CSS/JS code and it will appear here in real-time
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* AI Chat - Always Visible */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-800">AI Assistant</span>
                </div>
              </div>
              <div className="flex-1 p-4 space-y-4 overflow-auto">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'ai' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`rounded-2xl p-4 max-w-xs ${msg.role === 'ai'
                        ? 'bg-purple-50 rounded-tl-sm text-gray-700'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-tr-sm'
                      }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                    <div className="bg-purple-50 rounded-2xl rounded-tl-sm p-4 max-w-xs">
                      <p className="text-sm text-gray-700">Generating code...</p>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-gray-200/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && handleGenerate()}
                    placeholder="Ask AI to build something..."
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50 text-sm"
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={loading || !prompt.trim()}
                    className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[180px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => handleRename(contextMenu.file)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-3 text-gray-700"
            >
              <Edit2 className="w-4 h-4" />
              Rename
            </button>
            <button
              onClick={() => handleCopy(contextMenu.file)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-3 text-gray-700"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </button>
            <div className="border-t border-gray-200 my-1" />
            <button
              onClick={() => handleDelete(contextMenu.file.id)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-3 text-red-600"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-96">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Create New {showNewFileModal.type === 'file' ? 'File' : 'Folder'}
            </h3>
            <input
              type="text"
              value={newFileNameInput}
              onChange={(e) => setNewFileNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmNewFile()}
              placeholder={showNewFileModal.type === 'file' ? 'filename.html' : 'folder-name'}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewFileModal(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmNewFile}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}