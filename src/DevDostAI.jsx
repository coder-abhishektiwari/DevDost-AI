import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Code2, Eye, User, Plus, MessageSquare, Play, Save, FileCode, MoreVertical, Edit2, Copy, Trash2, FileText, FolderPlus, FilePlus, FileTerminal, Download, Send, Loader2, FileIcon, Folder, ChevronDown, Terminal, X, RefreshCw } from 'lucide-react';

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
    { role: 'ai', content: "Hi! I'm DevDost AI. I can help you create projects, chat with you, and even run your code! 💜" }
  ]);
  const [aiStatus, setAiStatus] = useState({ active: false, message: "" });
  const [sessionId] = useState(() => 'session_' + Math.random().toString(36).substr(2, 9));
  const chatEndRef = useRef(null);
  const iframeRef = useRef(null);

  const [activeTab, setActiveTab] = useState('code');
  const [files, setFiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [renamingFile, setRenamingFile] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileModal, setShowNewFileModal] = useState(null);
  const [newFileNameInput, setNewFileNameInput] = useState('');
  const [previewHTML, setPreviewHTML] = useState('');
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [showTerminal, setShowTerminal] = useState(false);

  // ==================== FETCH PROJECTS ====================
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("http://localhost:5000/projects");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  // ==================== FETCH FILES ====================
  const fetchFiles = async (projectName = null) => {
    try {
      if (!projectName) {
        setFiles([]);
        return;
      }

      const url = `http://localhost:5000/get_files?project=${projectName}`;

      const res = await fetch(url);
      const data = await res.json();

      // Filter files for current project only
      const projectFiles = data.filter(f => f.project === projectName);

      setFiles(projectFiles);

      if (projectFiles.length > 0 && !selectedFile) {
        setSelectedFile(projectFiles[0].id);
      }

      updatePreview(projectFiles);
    } catch (err) {
      console.error("Error fetching files:", err);
      setFiles([]);
    }
  };

  useEffect(() => {
    if (currentProject) {
      fetchFiles(currentProject);
    } else {
      setFiles([]);
      setSelectedFile(null);
    }
  }, [currentProject]);

  // ==================== SOCKET CONNECTION ====================
  useEffect(() => {
    if (socket) {
      socket.on("file_updated", (data) => {
        console.log("🧠 File updated:", data);
        if (data.project === currentProject) {
          setFiles((prev) => {
            const updated = prev.map((f) =>
              f.name === data.name ? { ...f, content: data.content } : f
            );
            updatePreview(updated);
            return updated;
          });
          setAiStatus({ active: true, message: `📝 Updated: ${data.name}` });
          setTimeout(() => setAiStatus({ active: false, message: "" }), 2000);
        }
      });

      socket.on("file_created", (data) => {
        console.log("✨ File created:", data);
        if (data.project === currentProject) {
          setFiles((prev) => {
            const updated = [...prev, data];
            updatePreview(updated);
            return updated;
          });
          setAiStatus({ active: true, message: `✨ Created: ${data.name}` });
          setTimeout(() => setAiStatus({ active: false, message: "" }), 2000);
        }
      });

      socket.on("ai_step", (data) => {
        console.log("🤖 AI Step:", data);
        setAiStatus({ active: true, message: data.message });
      });

      socket.on("file_deleted", (data) => {
        if (data.project === currentProject) {
          setFiles((prev) => prev.filter(f => f.name !== data.name));
        }
      });

      socket.on("file_renamed", (data) => {
        if (data.project === currentProject) {
          setFiles((prev) =>
            prev.map((f) =>
              f.name === data.oldName ? { ...f, name: data.newName } : f
            )
          );
        }
      });

      socket.on("project_deleted", () => {
        fetchProjects();
      });

      socket.on("terminal_output", (data) => {
        setTerminalOutput(prev => [...prev, data.output]);
      });

      return () => {
        socket.off("file_updated");
        socket.off("file_created");
        socket.off("file_deleted");
        socket.off("file_renamed");
        socket.off("ai_step");
        socket.off("project_deleted");
        socket.off("terminal_output");
      };
    }
  }, [currentProject]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ==================== PREVIEW UPDATE ====================
  const updatePreview = (filesList) => {
    const htmlFile = filesList.find(f => f.name.endsWith('.html') || f.name === 'index.html');
    const cssFile = filesList.find(f => f.name.endsWith('.css'));
    const jsFile = filesList.find(f => f.name.endsWith('.js'));

    if (htmlFile) {
      let html = htmlFile.content;

      if (cssFile) {
        html = html.replace('</head>', `<style>${cssFile.content}</style></head>`);
      }

      if (jsFile) {
        html = html.replace('</body>', `<script>${jsFile.content}</script></body>`);
      }

      setPreviewHTML(html);
    }
  };

  useEffect(() => {
    updatePreview(files);
  }, [files]);

  // ==================== AI CHAT ====================
  async function handleGenerate() {
    if (!prompt.trim()) return;

    const userMessage = { role: 'user', content: prompt };
    setChatMessages(prev => [...prev, userMessage]);
    setPrompt("");
    setLoading(true);
    setAiStatus({ active: true, message: "🤖 AI is processing..." });

    try {
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          session_id: sessionId,
          chat_history: chatMessages
        }),
      });

      const data = await res.json();

      if (data.success) {
        const aiMessage = data.message || "Done!";
        setChatMessages(prev => [...prev, {
          role: 'ai',
          content: aiMessage
        }]);

        if (data.current_project) {
          setCurrentProject(data.current_project);
          fetchProjects();
          fetchFiles(data.current_project);
        }

        setAiStatus({ active: false, message: "" });
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
        content: "❌ Server not reachable!"
      }]);
      setAiStatus({ active: false, message: "" });
    } finally {
      setLoading(false);
    }
  }

  // ==================== PROJECT OPERATIONS ====================
  const handleProjectSwitch = async (projectName) => {
    try {
      const res = await fetch(`http://localhost:5000/projects/${projectName}/switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (res.ok) {
        setCurrentProject(projectName);
        fetchFiles(projectName);
        setChatMessages(prev => [...prev, {
          role: 'ai',
          content: `✅ Switched to project: ${projectName}`
        }]);
      }
    } catch (err) {
      console.error("Error switching project:", err);
    }
    setShowProjectsDropdown(false);
  };

  const handleDeleteProject = async (projectName) => {
    if (!window.confirm(`Delete project "${projectName}"?`)) return;

    try {
      const res = await fetch(`http://localhost:5000/projects/${projectName}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchProjects();
        if (currentProject === projectName) {
          setCurrentProject(null);
          setFiles([]);
        }
        setChatMessages(prev => [...prev, {
          role: 'ai',
          content: `🗑️ Deleted project: ${projectName}`
        }]);
      }
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };


  // ==================== RUN/PROJECT TOGGLE ====================
  const handleRunStopProject = async () => {
    if (!currentProject) {
      window.alert("No project selected!");
      return;
    }

    // Agar project already running hai toh stop karo
    if (isRunning) {
      setIsRunning(true); // Loading state ke liye
      setShowTerminal(true);
      setTerminalOutput([`🛑 Stopping project: ${currentProject}...`]);

      try {
        const res = await fetch("http://localhost:5000/stop_project", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project: currentProject }),
        });

        const data = await res.json();

        if (data.success) {
          setTerminalOutput(prev => [...prev, `✅ ${data.message}`]);

          // Preview clear karo
          setPreviewHTML('');

          // Iframe clear karo
          if (iframeRef.current) {
            iframeRef.current.src = 'about:blank';
          }

          // Running status false karo
          setIsRunning(false);
        } else {
          setTerminalOutput(prev => [...prev, `❌ Error: ${data.error}`]);
          setIsRunning(false);
        }
      } catch (err) {
        setTerminalOutput(prev => [...prev, `❌ Failed to stop project: ${err.message}`]);
        setIsRunning(false);
      }
    }
    // Agar project running nahi hai toh start karo
    else {
      setIsRunning(true);
      setShowTerminal(true);
      setTerminalOutput([`🚀 Running project: ${currentProject}...`]);

      try {
        const res = await fetch("http://localhost:5000/run_project", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project: currentProject }),
        });

        const data = await res.json();

        if (data.success) {
          setTerminalOutput(prev => [...prev, `✅ ${data.message}`, ...data.output.split('\n')]);

          if (data.url) {
            setTerminalOutput(prev => [...prev, `🌐 Server running at: ${data.url}`]);
          }
        } else {
          setTerminalOutput(prev => [...prev, `❌ Error: ${data.error}`]);
          setIsRunning(false);
        }
      } catch (err) {
        setTerminalOutput(prev => [...prev, `❌ Failed to run project: ${err.message}`]);
        setIsRunning(false);
      }
    }
  };


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
          body: JSON.stringify({
            project: currentProject,
            oldName,
            newName: newFileName.trim()
          }),
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
          project: currentProject,
          name: newName,
          content: file.content,
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
        body: JSON.stringify({
          project: currentProject,
          name: file.name
        }),
      });

      if (res.ok) {
        setFiles(files.filter(f => f.id !== fileId));
        if (selectedFile === fileId) {
          const remainingFiles = files.filter(f => f.id !== fileId);
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
        project: currentProject,
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
        body: JSON.stringify({
          project: currentProject,
          name: file.name,
          content: file.content
        }),
      });

      if (res.ok) {
        setChatMessages(prev => [...prev, {
          role: 'ai',
          content: `✅ Saved: ${file.name}`
        }]);
      }
    } catch (err) {
      console.error("Error saving file:", err);
    }
  };

  const handleDownloadProject = async () => {
    if (!currentProject) {
      window.alert("No project selected!");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/download_project?project=${currentProject}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: `📦 Downloaded: ${currentProject}.zip`
      }]);
    } catch (err) {
      console.error("Error downloading project:", err);
    }
  };

  const createNewFile = () => {
    setShowNewFileModal({ type: 'file' });
    setNewFileNameInput('');
  };

  const confirmNewFile = async () => {
    if (newFileNameInput.trim() && currentProject) {
      try {
        const res = await fetch("http://localhost:5000/create_file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project: currentProject,
            name: newFileNameInput.trim(),
            content: '',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setFiles(prev => [...prev, data]);
          setSelectedFile(data.id);
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
            <div className="relative">
              <button
                onClick={() => setShowProjectsDropdown(!showProjectsDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 hover:border-purple-300 transition-colors"
              >
                <Folder className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-gray-800">
                  {currentProject || 'No Project'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {showProjectsDropdown && (
                <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 max-h-80 overflow-auto">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Projects</div>
                  {projects.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400">No projects yet</div>
                  ) : (
                    projects.map(proj => (
                      <div key={proj} className="flex items-center justify-between px-4 py-2 hover:bg-purple-50 group">
                        <button
                          onClick={() => handleProjectSwitch(proj)}
                          className="flex-1 text-left text-sm font-medium text-gray-700"
                        >
                          {proj}
                        </button>
                        <button
                          onClick={() => handleDeleteProject(proj)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {aiStatus.active && (
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl border border-purple-200 animate-pulse">
                <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                <span className="text-sm font-medium text-purple-700">{aiStatus.message}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunStopProject}
              disabled={!currentProject}
              className={`px-5 py-2.5 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isRunning
                ? 'bg-gradient-to-r from-red-500 to-orange-500'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                }`}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Stop Project
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Project
                </>
              )}
            </button>
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={`px-5 py-2.5 rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium flex items-center gap-2 ${showTerminal
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-900 text-white'
                }`}
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Terminal className="w-4 h-4" />
              )}
              Terminal
            </button>
            <button
              onClick={handleDownloadProject}
              disabled={!currentProject}
              className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={createNewFile}
              disabled={!currentProject}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              New File
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-8">
          <div className="grid grid-cols-4 gap-6 h-full">
            {/* File Explorer */}
            {activeTab === 'code' && (
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-gray-200/50 bg-gradient-to-r from-purple-50/50 to-pink-50/50 flex items-center justify-between">
                  <span className="font-semibold text-gray-800 text-sm">Files</span>
                  <button
                    onClick={createNewFile}
                    disabled={!currentProject}
                    className="p-1.5 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
                    title="New File"
                  >
                    <FilePlus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-2">
                  {!currentProject ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
                      <Folder className="w-12 h-12 mb-2 opacity-30" />
                      <p className="text-sm text-center">No project selected. Ask AI to create one!</p>
                    </div>
                  ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
                      <FileIcon className="w-12 h-12 mb-2 opacity-30" />
                      <p className="text-sm text-center">No files yet.</p>
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

            {/* Editor/Preview Area */}
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
                        disabled={!selectedFileData}
                        className="p-2 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
                        title="Save"
                      >
                        <Save className="w-4 h-4 text-gray-600" />
                      </button>
                      {/* <button
                        onClick={() => setActiveTab('preview')}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button> */}
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
                        <p className="text-center">Select a file to edit</p>
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
                          Ask AI to generate HTML/CSS/JS code
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* AI Chat */}
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
                      <p className="text-sm text-gray-700">Processing...</p>
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
                    placeholder="Ask AI anything..."
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

        {/* Terminal */}
        {showTerminal && (
          <div className="h-64 bg-gray-900 border-t border-gray-700 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-gray-300">Terminal</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTerminalOutput([])}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                  title="Clear"
                >
                  <RefreshCw className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => setShowTerminal(false)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 font-mono text-sm text-green-400">
              {terminalOutput.map((line, idx) => (
                <div key={idx} className="mb-1">{line}</div>
              ))}
            </div>
          </div>
        )}
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
              Create New File
            </h3>
            <input
              type="text"
              value={newFileNameInput}
              onChange={(e) => setNewFileNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmNewFile()}
              placeholder="filename.html"
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