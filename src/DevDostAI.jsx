import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Code2, Eye, User, MessageSquare, Play, Save, FileCode, MoreVertical, Edit2, Copy, Trash2, FileText, FilePlus, Download, Send, Loader2, FileIcon, Folder, FolderOpen, ChevronDown, ChevronRight, Terminal, X, RefreshCw, Wifi, WifiOff, Laptop, Globe, Smartphone, Database, Server, Layout, Package, Zap, Coffee } from 'lucide-react';
import { io } from "socket.io-client";

// Socket with auto-reconnect
export const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});



// Project icons mapping
const PROJECT_ICONS = {
  'react': Layout,
  'next': Zap,
  'nextjs': Zap,
  'node': Server,
  'nodejs': Server,
  'express': Coffee,
  'html': Globe,
  'web': Globe,
  'mobile': Smartphone,
  'app': Laptop,
  'api': Database,
  'default': Package
};

const getProjectIcon = (projectName, projectType) => {
  const name = (projectName || '').toLowerCase();
  const type = (projectType || '').toLowerCase();

  for (const [key, Icon] of Object.entries(PROJECT_ICONS)) {
    if (name.includes(key) || type.includes(key)) {
      return Icon;
    }
  }
  return PROJECT_ICONS.default;
};

// ✅ NEW: Build folder tree structure from flat file list
const buildFileTree = (files) => {
  const tree = {};

  files.forEach(file => {
    const parts = file.name.split('/');
    let current = tree;

    parts.forEach((part, idx) => {
      if (idx === parts.length - 1) {
        // It's a file
        if (!current.__files) current.__files = [];
        current.__files.push({ ...file, displayName: part });
      } else {
        // It's a folder
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    });
  });

  return tree;
};

// ✅ NEW: Folder Tree Component
const FolderTree = ({ tree, level = 0, onFileSelect, selectedFileId, onContextMenu }) => {
  const [collapsed, setCollapsed] = useState({});

  const toggleFolder = (path) => {
    setCollapsed(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const folders = Object.keys(tree).filter(k => k !== '__files');
  const files = tree.__files || [];

  return (
    <div className="select-none">
      {/* Folders first */}
      {folders.map(folderName => {
        const folderPath = `${level}_${folderName}`;
        const isCollapsed = collapsed[folderPath];

        return (
          <div key={folderPath}>
            <button
              onClick={() => toggleFolder(folderPath)}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors text-left"
              style={{ paddingLeft: `${level * 12 + 12}px` }}
            >
              {isCollapsed ? (
                <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />
              )}
              {isCollapsed ? (
                <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              ) : (
                <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              )}
              <span className="text-sm font-medium text-gray-700">{folderName}</span>
            </button>

            {!isCollapsed && (
              <FolderTree
                tree={tree[folderName]}
                level={level + 1}
                onFileSelect={onFileSelect}
                selectedFileId={selectedFileId}
                onContextMenu={onContextMenu}
              />
            )}
          </div>
        );
      })}

      {/* Files */}
      {files.map(file => (
        <button
          key={file.id}
          onClick={() => onFileSelect(file.id)}
          onContextMenu={(e) => onContextMenu(e, file)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-left ${selectedFileId === file.id
            ? 'bg-purple-100 text-purple-900 shadow-sm'
            : 'hover:bg-gray-100 text-gray-700'
            }`}
          style={{ paddingLeft: `${level * 12 + 28}px` }}
        >
          <FileText className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium truncate">{file.displayName}</span>
        </button>
      ))}
    </div>
  );
};

export default function DevDostAI() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', content: "👋 Hi! I'm DevDost AI - Your coding assistant!\n\nI can help you with:\n✅ Creating projects\n✅ Running/stopping projects\n✅ Creating/editing/deleting files\n✅ Renaming/copying files\n✅ General coding questions\n\nJust tell me what you need! 💜" }
  ]);
  const chatEndRef = useRef(null);
  const iframeRef = useRef(null);
  const inputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('projects');
  const [files, setFiles] = useState([]);
  const [fileTree, setFileTree] = useState({});
  const [projects, setProjects] = useState([]);
  const [projectsDetails, setProjectsDetails] = useState({});
  const [currentProject, setCurrentProject] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [renamingFile, setRenamingFile] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileModal, setShowNewFileModal] = useState(null);
  const [newFileNameInput, setNewFileNameInput] = useState('');
  const [previewHTML, setPreviewHTML] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runningProjects, setRunningProjects] = useState({});
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [currentNode, setCurrentNode] = useState(null);
  const [completedNodes, setCompletedNodes] = useState([]);
  const [projectReady, setProjectReady] = useState(false);
  const [sessionId] = useState(() => 'session_' + Math.random().toString(36).substr(2, 9));

  const [socketConnected, setSocketConnected] = useState(false);
  const [agentProgress, setAgentProgress] = useState({ visible: false, message: "", node: "" });

  // Socket connection management
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      console.log("✅ Socket connected");
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
      setSocketConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setSocketConnected(false);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
    };
  }, []);

  // Agent node tracking
  useEffect(() => {
    if (!socket) return;

    socket.on("agent_node", (data) => {
      console.log("🔄 NODE EVENT:", data);

      if (data.event === "start") {
        setCurrentNode(data.node);
        setAgentProgress({
          visible: true,
          message: `Executing: ${data.node}`,
          node: data.node
        });
        setCompletedNodes(prev => prev.filter(n => n !== data.node));
      }

      if (data.event === "finish") {
        setCompletedNodes(prev => {
          if (!prev.includes(data.node)) {
            return [...prev, data.node];
          }
          return prev;
        });
        setTimeout(() => setCurrentNode(null), 500);
      }
    });

    return () => {
      socket.off("agent_node");
    };
  }, []);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("http://localhost:5000/projects");
      const data = await res.json();
      setProjects(data.projects || []);

      const details = {};
      for (const proj of (data.projects || [])) {
        try {
          const detailRes = await fetch(`http://localhost:5000/projects/${proj}`);
          const detailData = await detailRes.json();
          details[proj] = detailData;
        } catch (err) {
          console.error(`Error fetching details for ${proj}:`, err);
        }
      }
      setProjectsDetails(details);
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  const fetchFiles = async (projectName = null) => {
    try {
      if (!projectName) {
        setFiles([]);
        setFileTree({});
        return;
      }

      const res = await fetch(`http://localhost:5000/get_files?project=${projectName}`);
      const data = await res.json();
      const projectFiles = data.filter(f => f.project === projectName);

      setFiles(projectFiles);

      // ✅ Build folder tree
      const tree = buildFileTree(projectFiles);
      setFileTree(tree);

      if (projectFiles.length > 0 && !selectedFile) {
        setSelectedFile(projectFiles[0].id);
      }

      updatePreview(projectFiles);
    } catch (err) {
      console.error("Error fetching files:", err);
      setFiles([]);
      setFileTree({});
    }
  };

  useEffect(() => {
    if (currentProject) {
      fetchFiles(currentProject);
    } else {
      setFiles([]);
      setFileTree({});
      setSelectedFile(null);
    }
  }, [currentProject]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("chat_response", (data) => {
      console.log("📩 FINAL RESPONSE:", data);
      setLoading(false); // <--- IMPORTANT
      setAgentProgress({ visible: false, message: "", node: "" });
      setCurrentNode(null);

      setChatMessages(prev => [...prev, { role: 'ai', content: data.message }]);

      if (data.current_project) setCurrentProject(data.current_project);
    });

    socket.on("chat_error", (data) => {
      console.log("❌ CHAT ERROR:", data);
      setChatMessages(prev => [...prev, { role: 'ai', content: "Error: " + data.error }]);
    });

    socket.on("file_updated", (data) => {
      if (data.project === currentProject) {
        setFiles((prev) => {
          const updated = prev.map((f) =>
            f.name === data.name ? { ...f, content: data.content } : f
          );
          updatePreview(updated);
          const tree = buildFileTree(updated);
          setFileTree(tree);
          return updated;
        });
      }
    });

    socket.on("file_created", (data) => {
      if (data.project === currentProject) {
        setFiles((prev) => {
          const updated = [...prev, data];
          updatePreview(updated);
          const tree = buildFileTree(updated);
          setFileTree(tree);
          return updated;
        });
      }
    });

    socket.on("ai_progress", (data) => {
      console.log('📡 RECEIVED ai_progress:', data.message);

      // ✅ Update agent progress
      setAgentProgress({
        visible: true,
        message: data.message,
        node: currentNode || "processing"
      });

      // ✅ Add to chat with proper formatting
      setChatMessages(prev => {
        // Avoid duplicate messages
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.content === data.message && lastMsg?.type === 'progress') {
          return prev; // Skip duplicate
        }

        return [...prev, {
          role: 'ai',
          content: data.message,
          type: 'progress',
          timestamp: Date.now()
        }];
      });
    });

    socket.on("agent_complete", (data) => {
      console.log("✅ Agent complete:", data);

      setProjectReady(true);
      setLoading(false);
      setAgentProgress({ visible: false, message: "", node: "" });
      setCurrentNode(null);

      if (data.force_refresh) {
        fetchProjects();
        const proj = data.current_project || currentProject;
        if (proj) {
          setTimeout(() => fetchFiles(proj), 500);
        }
      }

      if (data.success) {
        if (data.message) {
          setChatMessages(prev => [...prev, {
            role: 'ai',
            content: data.message
          }]);
        }

        if (data.current_project) {
          setCurrentProject(data.current_project);
          fetchProjects();
          setTimeout(() => fetchFiles(data.current_project), 500);
        }
      }
    });

    socket.on("agent_error", (data) => {
      console.error("❌ Agent error:", data);
      setLoading(false);
      setAgentProgress({ visible: false, message: "", node: "" });
      setCurrentNode(null);

      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: `❌ Error: ${data.error || 'Something went wrong'}`
      }]);
    });

    socket.on("file_deleted", (data) => {
      if (data.project === currentProject) {
        setFiles((prev) => {
          const updated = prev.filter(f => f.name !== data.name);
          const tree = buildFileTree(updated);
          setFileTree(tree);
          return updated;
        });
      }
    });

    socket.on("file_renamed", (data) => {
      if (data.project === currentProject) {
        setFiles((prev) => {
          const updated = prev.map((f) =>
            f.name === data.oldName ? { ...f, name: data.newName } : f
          );
          const tree = buildFileTree(updated);
          setFileTree(tree);
          return updated;
        });
      }
    });

    socket.on("project_deleted", () => {
      fetchProjects();
    });

    socket.on("project_status", (data) => {
      setTerminalOutput(prev => [...prev, data.message]);
      if (data.status === "stopped") {
        setRunningProjects(prev => {
          const newState = { ...prev };
          delete newState[data.project];
          return newState;
        });
        if (data.project === currentProject) {
          setIsRunning(false);
          setPreviewHTML('');
          if (iframeRef.current) {
            iframeRef.current.src = 'about:blank';
          }
        }
      } else if (data.status === "running") {
        setRunningProjects(prev => ({ ...prev, [data.project]: true }));
      }
    });

    socket.on("terminal_output", (data) => {
      setTerminalOutput(prev => [...prev, data.output]);
    });

    return () => {
      socket.off("chat_response");
      socket.off("chat_error");
      socket.off("file_updated");
      socket.off("file_created");
      socket.off("file_deleted");
      socket.off("file_renamed");
      socket.off("ai_progress");
      socket.off("agent_complete");
      socket.off("agent_error");
      socket.off("project_deleted");
      socket.off("project_status");
      socket.off("terminal_output");
    };
  }, [currentProject, currentNode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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


  async function handleGenerate() {
    if (!prompt.trim()) return;

    const userMessage = {
      role: 'user',
      content: prompt
    };

    setChatMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);
    setProjectReady(false);
    setCompletedNodes([]);
    setAgentProgress({ visible: true, message: 'Initializing...', node: 'initializing' });

    try {
      // ✅ CHECK IF SOCKET IS CONNECTED
      if (!socket || !socketConnected) {
        setChatMessages(prev => [...prev, {
          role: 'ai',
          content: '❌ Socket not connected! Make sure backend is running at http://localhost:5000'
        }]);
        setAgentProgress({ visible: false, message: '', node: null });
        setLoading(false);
        return;
      }

      console.log('📤 Sending message via SocketIO...');

      // ✅ USE SOCKET.EMIT instead of fetch POST
      socket.emit('chat_message', {
        message: prompt || userMessage.content,
        session_id: sessionId,
        chat_history: chatMessages
      });

      // No need to wait for response - socket listeners handle it
      console.log('✅ Message sent, waiting for ai_progress events...');

    } catch (err) {
      console.error('❌ Error:', err);
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: `Server error: ${err.message}. Make sure backend is running.`
      }]);
      setAgentProgress({ visible: false, message: '', node: null });
      setLoading(false);
    }
  }


  const handleProjectClick = (projectName) => {
    setCurrentProject(projectName);
    fetchFiles(projectName);
    setActiveTab('code');
  };

  const handleRunProject = async (projectName, e) => {
    if (e) e.stopPropagation();

    setCurrentProject(projectName);
    setShowTerminal(true);
    setTerminalOutput([`🚀 Running project: ${projectName}...`]);

    try {
      const res = await fetch("http://localhost:5000/run_project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectName }),
      });

      const data = await res.json();

      if (data.success) {
        setTerminalOutput(prev => [...prev, `✅ ${data.message}`]);
        setRunningProjects(prev => ({ ...prev, [projectName]: true }));

        if (projectName === currentProject) {
          setIsRunning(true);
        }

        setTimeout(() => {
          setActiveTab('preview');
          fetchFiles(projectName);
        }, 500);
      } else {
        setTerminalOutput(prev => [...prev, `❌ Error: ${data.error}`]);
      }
    } catch (err) {
      setTerminalOutput(prev => [...prev, `❌ Failed to run: ${err.message}`]);
    }
  };

  const handleDeleteProjectCard = async (projectName, e) => {
    if (e) e.stopPropagation();

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
          setFileTree({});
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

  const handleRunStopProject = async () => {
    if (!currentProject) {
      window.alert("No project selected!");
      return;
    }

    if (isRunning) {
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
          setPreviewHTML('');
          if (iframeRef.current) {
            iframeRef.current.src = 'about:blank';
          }
          setIsRunning(false);
        } else {
          setTerminalOutput(prev => [...prev, `❌ Error: ${data.error}`]);
        }
      } catch (err) {
        setTerminalOutput(prev => [...prev, `❌ Failed to stop: ${err.message}`]);
      }
    } else {
      handleRunProject(currentProject);
    }
  };

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
            onClick={() => setActiveTab('projects')}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'projects'
              ? 'bg-purple-100 text-purple-600 shadow-md'
              : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
              }`}
            title="Projects"
          >
            <Folder className="w-5 h-5" />
          </button>

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
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${socketConnected ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {socketConnected ? (
                <>
                  <Wifi className="w-3 h-3 text-green-600" />
                  <span className="text-xs font-medium text-green-700">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-red-600" />
                  <span className="text-xs font-medium text-red-700">Disconnected</span>
                </>
              )}
            </div>

            {currentProject && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200">
                <Folder className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-gray-800">{currentProject}</span>
              </div>
            )}

            {agentProgress.visible && (
              <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-purple-900">{agentProgress.node}</span>
                  <span className="text-xs text-purple-700">{agentProgress.message}</span>
                </div>
              </div>
            )}

            {completedNodes.length > 0 && (
              <div className="flex items-center gap-2">
                {completedNodes.slice(-3).map((node, idx) => (
                  <div key={idx} className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-lg">
                    ✓ {node}
                  </div>
                ))}
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
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run
                </>
              )}
            </button>
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium flex items-center gap-2"
            >
              <Terminal className="w-4 h-4" />
              Terminal
            </button>
            <button
              onClick={handleDownloadProject}
              disabled={!currentProject}
              className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* ✅ Projects Tab */}
          {activeTab === 'projects' && (
            <div className="flex-1 overflow-auto p-8">
              <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Projects</h1>
                  <p className="text-gray-600">All projects created by AI</p>
                </div>

                {projects.length === 0 ? (
                  <div className="text-center py-16">
                    <Folder className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No projects yet</h3>
                    <p className="text-gray-500 mb-6">Ask AI to create your first project!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => {
                      const details = projectsDetails[project] || {};
                      const ProjectIcon = getProjectIcon(project, details.type);
                      const isProjectRunning = runningProjects[project];

                      return (
                        <div
                          key={project}
                          onClick={() => handleProjectClick(project)}
                          className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-bl-full opacity-50 group-hover:opacity-70 transition-opacity" />

                          <div className="relative p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <ProjectIcon className="w-7 h-7 text-white" />
                              </div>

                              {isProjectRunning && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                  Running
                                </div>
                              )}
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                              {project}
                            </h3>
                            <p className="text-sm text-gray-600 mb-1">
                              Type: <span className="font-medium text-gray-800">{details.type || 'unknown'}</span>
                            </p>
                            <p className="text-sm text-gray-600 mb-4">
                              Files: <span className="font-medium text-gray-800">{details.file_count || 0}</span>
                            </p>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProjectClick(project);
                                }}
                                className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit
                              </button>

                              <button
                                onClick={(e) => handleRunProject(project, e)}
                                disabled={isProjectRunning}
                                className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Play className="w-3 h-3" />
                                {isProjectRunning ? 'Running' : 'Run'}
                              </button>

                              <button
                                onClick={(e) => handleDeleteProjectCard(project, e)}
                                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ✅ Code Tab - WITH File Explorer */}
          {activeTab === 'code' && (
            <>
              {/* Left Panel - File Explorer (ONLY in Code tab) */}
              <div className="w-80 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col">
                <div className="p-4 border-b border-gray-200/50 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-purple-600" />
                    Files
                  </h2>
                  <button
                    onClick={createNewFile}
                    disabled={!currentProject}
                    className="p-2 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FilePlus className="w-4 h-4 text-purple-600" />
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-2">
                  {!currentProject ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      Select a project first
                    </div>
                  ) : files.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No files yet
                    </div>
                  ) : (
                    <FolderTree
                      tree={fileTree}
                      onFileSelect={setSelectedFile}
                      selectedFileId={selectedFile}
                      onContextMenu={handleContextMenu}
                    />
                  )}
                </div>
              </div>

              {/* Center Panel - Code Editor */}
              <div className="flex-1 flex flex-col">
                {selectedFileData ? (
                  <>
                    <div className="h-14 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 flex items-center justify-between px-6">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span className="font-medium text-gray-800">{selectedFileData.name}</span>
                      </div>
                      <button
                        onClick={handleSaveFile}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all font-medium flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <textarea
                        value={selectedFileData.content}
                        onChange={(e) => handleFileContentChange(e.target.value)}
                        className="w-full h-full p-6 bg-gray-50/50 font-mono text-sm text-gray-800 resize-none focus:outline-none"
                        spellCheck="false"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <FileCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">
                        {currentProject ? 'Select a file to edit' : 'Select a project first'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ✅ Preview Tab - NO File Explorer */}
          {activeTab === 'preview' && (
            <div className="flex-1 flex flex-col bg-white">
              {currentProject && !projectReady && currentNode ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto" />
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-800">Building Your Project...</h3>
                      <p className="text-sm text-gray-600">Current Step: <span className="font-medium text-purple-600">{currentNode}</span></p>
                      {completedNodes.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-center mt-4">
                          {completedNodes.map((node, idx) => (
                            <div key={idx} className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              ✓ {node}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : previewHTML ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={previewHTML}
                  className="w-full h-full border-0"
                  title="Preview"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      {currentProject ? 'Run the project to see preview' : 'Select a project first'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right Panel - Chat (Always visible) */}
          <div className="w-96 bg-white/80 backdrop-blur-xl border-l border-gray-200/50 flex flex-col">
            <div className="p-4 border-b border-gray-200/50">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                AI Assistant
              </h2>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                      }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200/50">
              <div className="flex gap-2">
                <input
                ref={inputRef}
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  placeholder="Ask AI anything..."
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Terminal Modal */}
      {showTerminal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="w-full max-w-4xl bg-gray-900 rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="h-12 bg-gray-800 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-green-400" />
                <span className="font-medium text-gray-200">Terminal</span>
              </div>
              <button
                onClick={() => setShowTerminal(false)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="h-96 overflow-auto p-4 font-mono text-sm">
              {terminalOutput.map((line, idx) => (
                <div key={idx} className="text-green-400 mb-1">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[180px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => handleRename(contextMenu.file)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-3"
            >
              <Edit2 className="w-4 h-4 text-purple-600" />
              Rename
            </button>
            <button
              onClick={() => handleCopy(contextMenu.file)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-3"
            >
              <Copy className="w-4 h-4 text-blue-600" />
              Copy
            </button>
            <button
              onClick={() => handleDelete(contextMenu.file.id)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-3"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              Delete
            </button>
          </div>
        </>
      )}

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Create New File
            </h3>
            <input
              type="text"
              value={newFileNameInput}
              onChange={(e) => setNewFileNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmNewFile();
                if (e.key === 'Escape') setShowNewFileModal(null);
              }}
              placeholder="filename.ext or folder/filename.ext"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewFileModal(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmNewFile}
                disabled={!newFileNameInput.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50"
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