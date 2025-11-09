import React, { useState, useEffect, useRef, Component } from "react";
import { Sparkles, Code2, Eye, User, MessageSquare, Play, Save, FileCode, MoreVertical, Edit2, Copy, Trash2, FileText, FilePlus, Download, Send, Loader2, FileIcon, Folder, FolderOpen, ChevronDown, ChevronRight, Terminal, X, RefreshCw, Wifi, WifiOff, Laptop, Globe, Smartphone, Database, Server, Layout, Package, Zap, Coffee, Scissors, Clipboard, Plus, MessageCircle, History } from 'lucide-react';
import { io } from "socket.io-client";
import PropTypes from 'prop-types';
import './ghost-typing.css';

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

// Build folder tree structure from flat file list
const buildFileTree = (files) => {
  const tree = {};

  files.forEach(file => {
    const parts = file.name.split('/');
    let current = tree;

    parts.forEach((part, idx) => {
      if (idx === parts.length - 1) {
        if (!current.__files) current.__files = [];
        current.__files.push({ ...file, displayName: part });
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    });
  });

  return tree;
};

// Folder Tree Component
const FolderTree = ({
  tree,
  level = 0,
  onFileSelect,
  selectedFileId,
  onContextMenu,
  renamingFile,
  newFileName,
  setNewFileName,
  confirmRename,
  setRenamingFile,
  collapsedMap = {},
  setCollapsedMap = () => { },
  onMoveFile = () => { },
  basePath = ''
}) => {

  const toggleFolder = (path) => {
    setCollapsedMap(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const folders = Object.keys(tree).filter(k => k !== '__files');
  const files = tree.__files || [];

  return (
    <div className="select-none">
      {folders.map(folderName => {
        const folderPath = `${level}_${folderName}`;
        const isCollapsed = !!collapsedMap[folderPath];
        const folderFullPath = basePath ? `${basePath}/${folderName}` : folderName;

        return (
          <div key={folderPath}>
            <button
              onClick={() => toggleFolder(folderPath)}
              onContextMenu={(e) => onContextMenu && onContextMenu(e, { isFolder: true, path: folderFullPath, name: folderName })}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                try {
                  const data = e.dataTransfer.getData('text/plain');
                  if (data) {
                    const payload = JSON.parse(data);
                    onMoveFile && onMoveFile(payload.id, folderFullPath);
                  }
                } catch (err) {
                  console.error('Invalid drag data', err);
                }
              }}
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
                renamingFile={renamingFile}
                newFileName={newFileName}
                setNewFileName={setNewFileName}
                confirmRename={confirmRename}
                setRenamingFile={setRenamingFile}
                collapsedMap={collapsedMap}
                setCollapsedMap={setCollapsedMap}
                onMoveFile={onMoveFile}
                basePath={folderFullPath}
              />
            )}
          </div>
        );
      })}

      {files.map(file => (
        renamingFile === file.id ? (
          <div key={file.id} className="flex items-center gap-2 px-3 py-1.5" style={{ paddingLeft: `${level * 12 + 28}px` }}>
            <input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmRename(file.id);
                if (e.key === "Escape") setRenamingFile(null);
              }}
              className="px-2 py-1 text-sm border rounded w-full"
              autoFocus
            />
            <button onClick={() => confirmRename(file.id)} className="text-green-600 font-bold text-sm">✔</button>
            <button onClick={() => setRenamingFile(null)} className="text-red-600 font-bold text-sm">✖</button>
          </div>
        ) : (
          <button
            key={file.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ id: file.id, name: file.name }))}
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
        )
      ))}
    </div>
  );
};

FolderTree.propTypes = {
  tree: PropTypes.object.isRequired,
  level: PropTypes.number,
  onFileSelect: PropTypes.func.isRequired,
  selectedFileId: PropTypes.string,
  onContextMenu: PropTypes.func.isRequired,
  renamingFile: PropTypes.string,
  newFileName: PropTypes.string,
  setNewFileName: PropTypes.func.isRequired,
  confirmRename: PropTypes.func.isRequired,
  setRenamingFile: PropTypes.func.isRequired,
  collapsedMap: PropTypes.object,
  setCollapsedMap: PropTypes.func,
  onMoveFile: PropTypes.func,
  basePath: PropTypes.string
};

export default function DevDostAI() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ NEW: Chat History System
  const [chats, setChats] = useState(() => {
    try {
      const saved = localStorage.getItem('devdost_chats');
      if (saved) return JSON.parse(saved);
      return [{
        id: 'default',
        name: 'New Chat',
        messages: [{ role: 'ai', content: "👋 Hi! I'm DevDost AI - Your coding assistant!\n\nI can help you with:\n✅ Creating projects\n✅ Running/stopping projects\n✅ Creating/editing/deleting files\n✅ Renaming/copying files\n✅ General coding questions\n\nJust tell me what you need! 💜" }],
        currentProject: null,
        selectedFile: null,
        files: [],
        timestamp: Date.now()
      }];
    } catch (e) {
      return [{
        id: 'default',
        name: 'New Chat',
        messages: [{ role: 'ai', content: "👋 Hi! I'm DevDost AI!" }],
        currentProject: null,
        selectedFile: null,
        files: [],
        timestamp: Date.now()
      }];
    }
  });

  const [currentChatId, setCurrentChatId] = useState(() => {
    try {
      return localStorage.getItem('devdost_currentChatId') || 'default';
    } catch (e) {
      return 'default';
    }
  });

  const [showChatHistory, setShowChatHistory] = useState(false);

  // Get current chat
  const currentChat = chats.find(c => c.id === currentChatId) || chats[0];
  const chatMessages = currentChat.messages;
  const setChatMessages = (updater) => {
    setChats(prevChats => {
      return prevChats.map(chat => {
        if (chat.id === currentChatId) {
          const newMessages = typeof updater === 'function' ? updater(chat.messages) : updater;
          return { ...chat, messages: newMessages, timestamp: Date.now() };
        }
        return chat;
      });
    });
  };

  const chatEndRef = useRef(null);
  const iframeRef = useRef(null);
  const inputRef = useRef(null);

  // ✅ FIX 1: Active Tab persistence
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem('devdost_activeTab') || 'projects';
    } catch (e) {
      return 'projects';
    }
  });

  const [files, setFiles] = useState(currentChat.files || []);
  const [fileTree, setFileTree] = useState({});
  const [projects, setProjects] = useState([]);
  const [projectsDetails, setProjectsDetails] = useState({});
  const [currentProject, setCurrentProject] = useState(currentChat.currentProject);
  const currentProjectRef = useRef(currentProject);

  useEffect(() => { currentProjectRef.current = currentProject; }, [currentProject]);

  const [selectedFile, setSelectedFile] = useState(currentChat.selectedFile);
  const [contextMenu, setContextMenu] = useState(null);
  const [renamingFile, setRenamingFile] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileModal, setShowNewFileModal] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [folderCollapsed, setFolderCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('devdost_collapsed') || '{}');
    } catch (e) {
      return {};
    }
  });
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
  const [isLoading, setIsLoading] = useState({
    files: false,
    projects: false
  });

  // Ghost typing animation states
  const [currentTypingFile, setCurrentTypingFile] = useState(null);
  const [typingContent, setTypingContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingSpeed = 10;
  const typingTimeout = useRef(null);

  // Function to simulate ghost typing
  const simulateTyping = async (content, onComplete) => {
    setIsTyping(true);
    let currentText = '';

    for (let i = 0; i < content.length; i++) {
      currentText += content[i];
      setTypingContent(currentText);
      await new Promise(resolve => {
        typingTimeout.current = setTimeout(resolve, typingSpeed);
      });
    }

    setIsTyping(false);
    if (onComplete) onComplete();
  };

  // Clean up typing animation on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  // Socket connection management
  useEffect(() => {
    if (!socket) return;

    let mounted = true;

    const handleConnect = () => {
      if (mounted) {
        console.log("✅ Socket connected");
        setSocketConnected(true);
      }
    };

    const handleDisconnect = () => {
      if (mounted) {
        console.log("❌ Socket disconnected");
        setSocketConnected(false);
      }
    };

    const handleError = (error) => {
      if (mounted) {
        console.error("Socket connection error:", error);
        setSocketConnected(false);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleError);

    return () => {
      mounted = false;
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleError);
    };
  }, []);

  // ✅ NEW: Save chats to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('devdost_chats', JSON.stringify(chats));
    } catch (e) {
      console.error('Error saving chats:', e);
    }
  }, [chats]);

  // ✅ NEW: Save current chat ID
  useEffect(() => {
    try {
      localStorage.setItem('devdost_currentChatId', currentChatId);
    } catch (e) { }
  }, [currentChatId]);

  // ✅ FIX 1: Save active tab
  useEffect(() => {
    try {
      localStorage.setItem('devdost_activeTab', activeTab);
    } catch (e) { }
  }, [activeTab]);

  // ✅ NEW: Update current chat's state when project/files/selectedFile change
  useEffect(() => {
    setChats(prevChats => {
      return prevChats.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            currentProject,
            selectedFile,
            files,
            timestamp: Date.now()
          };
        }
        return chat;
      });
    });
  }, [currentProject, selectedFile, files, currentChatId]);

  // ✅ NEW: Load chat's state when switching chats
  useEffect(() => {
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
      setCurrentProject(chat.currentProject);
      setSelectedFile(chat.selectedFile);
      setFiles(chat.files || []);
      setFileTree(buildFileTree(chat.files || []));
    }
  }, [currentChatId]);

  useEffect(() => {
    try {
      localStorage.setItem('devdost_collapsed', JSON.stringify(folderCollapsed || {}));
    } catch (e) { }
  }, [folderCollapsed]);

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

        // ✅ Hide progress indicator after small delay
        setTimeout(() => {
          setCurrentNode(null);
          setAgentProgress({ visible: false, message: "", node: "" });
        }, 500);
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
    setIsLoading(prev => ({ ...prev, projects: true }));
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
    } finally {
      setIsLoading(prev => ({ ...prev, projects: false }));
    }
  };

  const fetchFiles = async (projectName = null) => {
    setIsLoading(prev => ({ ...prev, files: true }));
    try {
      if (!projectName) {
        setFiles([]);
        setFileTree({});
        setSelectedFile(null);
        return;
      }

      const res = await fetch(`http://localhost:5000/get_files?project=${projectName}`);
      const data = await res.json();
      const projectFiles = data.filter(f => f.project === projectName);
      const tree = buildFileTree(projectFiles);

      const firstFileId = projectFiles.length > 0 ? projectFiles[0].id : null;

      setFiles(projectFiles);
      setFileTree(tree);
      setSelectedFile(firstFileId);

      if (firstFileId) {
        updatePreview(projectFiles);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setIsLoading(prev => ({ ...prev, files: false }));
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

    socket.on("chat_name_generated", (data) => {
      console.log("📝 Chat name generated:", data.name);

      // Update chats state - THIS UPDATES UI AUTOMATICALLY
      setChats(prevChats =>
        prevChats.map(c =>
          c.id === data.chat_id
            ? {
              ...c,
              name: data.name,
              isNamed: true,
              timestamp: Date.now()
            }
            : c
        )
      );
    });

    socket.on("chat_response", (data) => {
      console.log("📩 FINAL RESPONSE:", data);
      setLoading(false);
      setAgentProgress({ visible: false, message: "", node: "" });
      setCurrentNode(null);

      setChatMessages(prev => [...prev, { role: 'ai', content: data.message }]);

      if (data.current_project) setCurrentProject(data.current_project);
    });


    socket.on("chat_error", (data) => {
      console.log("❌ CHAT ERROR:", data);
      setLoading(false);
      setAgentProgress({ visible: false, message: "", node: "" }); // ✅
      setCurrentNode(null); // ✅

      setChatMessages(prev => [...prev, { role: 'ai', content: "Error: " + data.error }]);
    });

    socket.on("file_updated", (data) => {
      if (!data.id) data.id = crypto.randomUUID();

      if (data.project === currentProjectRef.current) {
        setCurrentTypingFile(data.id);
        setSelectedFile(data.id);
        setActiveTab('code');

        simulateTyping(data.content, () => {
          setFiles((prev) => {
            const updated = prev.map((f) =>
              f.name === data.name ? { ...f, content: data.content } : f
            );
            updatePreview(updated);
            const tree = buildFileTree(updated);
            setFileTree(tree);
            return updated;
          });
        });
      }
    });

    socket.on("file_created", (data) => {
      if (!data.id) data.id = crypto.randomUUID();

      if (data.project === currentProjectRef.current) {
        setCurrentTypingFile(data.id);
        setSelectedFile(data.id);
        setActiveTab('code');

        simulateTyping(data.content || '', () => {
          setFiles((prev) => {
            const updated = [...prev, data];
            updatePreview(updated);
            const tree = buildFileTree(updated);
            setFileTree(tree);
            return updated;
          });
        });
      }
    });

    socket.on("ai_progress", (data) => {
      console.log('📡 RECEIVED ai_progress:', data.message);

      setAgentProgress({
        visible: true,
        message: data.message,
        node: currentNode || "processing"
      });

      setChatMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.content === data.message && lastMsg?.type === 'progress') {
          return prev;
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
          setActiveTab('code');

          setTimeout(() => {
            fetchFiles(data.current_project);

            setTimeout(() => {
              handleRunProject(data.current_project);
              setActiveTab('preview');
            }, 1000);
          }, 500);
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
      if (!data.id) data.id = crypto.randomUUID();

      if (data.project === currentProjectRef.current) {
        setFiles((prev) => {
          const updated = prev.filter(f => f.name !== data.name);
          const tree = buildFileTree(updated);
          setFileTree(tree);
          return updated;
        });
        fetchProjects();
      }
    });

    socket.on("file_renamed", (data) => {
      if (!data.id) data.id = crypto.randomUUID();

      if (data.project === currentProjectRef.current) {
        setFiles((prev) => {
          const updated = prev.map((f) =>
            f.name === data.oldName ? { ...f, name: data.newName } : f
          );
          const tree = buildFileTree(updated);
          setFileTree(tree);
          return updated;
        });
        fetchProjects();
      }
    });

    socket.on("project_deleted", (data) => {
      if (!data.id) data.id = crypto.randomUUID();
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
      socket.off("chat_name_generated");
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
    if (isRunning && currentProject) {
      updatePreview(files);
    }
  }, [files, isRunning]);

  // ✅ NEW: Create new chat
  const createNewChat = () => {
    const newChat = {
      id: 'chat_' + Date.now(),
      name: `Chat ${chats.length + 1}`,
      messages: [{ role: 'ai', content: "👋 Hi! I'm DevDost AI - Your coding assistant!" }],
      currentProject: null,
      selectedFile: null,
      files: [],
      timestamp: Date.now()
    };
    setChats(prev => [...prev, newChat]);
    setCurrentChatId(newChat.id);
    setShowChatHistory(false);
  };

  // ✅ NEW: Delete chat
  const deleteChat = (chatId) => {
    if (chats.length === 1) {
      alert("Cannot delete the last chat!");
      return;
    }
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(chats[0].id);
    }
  };

  async function handleGenerate() {
    if (!prompt.trim()) return;

    const userMessage = {
      role: 'user',
      content: prompt
    };
    const userPrompt = prompt;
    setChatMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);
    setProjectReady(false);
    setCompletedNodes([]);
    setAgentProgress({ visible: true, message: 'Initializing...', node: 'initializing' });

    try {
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

      const isFirstUserMessage = currentChat.messages.filter(m => m.role === 'user').length === 0;

      socket.emit('chat_message', {
        message: userPrompt || userMessage.content,
        session_id: sessionId,
        chat_history: chatMessages,
        chat_id: currentChatId,
        is_first_message: isFirstUserMessage && !currentChat.isNamed
      });

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
          const updated = files.map(f => f.id === fileId ? { ...f, name: newFileName.trim() } : f);
          setFiles(updated);
          setFileTree(buildFileTree(updated));
          fetchProjects();
        }
      } catch (err) {
        console.error("Error renaming file:", err);
      }
    }
    setRenamingFile(null);
  };

  const handleCopy = async (file) => {
    setClipboard({ file, operation: 'copy' });

    try {
      if (file && file.content) await navigator.clipboard.writeText(file.content);
    } catch (e) {
      // ignore
    }

    setContextMenu(null);
  };

  const handleCut = (file) => {
    setClipboard({ file, operation: 'cut' });
    setContextMenu(null);
  };

  const handlePaste = async (targetFile) => {
    if (!clipboard || !clipboard.file) return;

    const targetFolder = getContextMenuTargetFolder(targetFile);

    try {
      if (clipboard.operation === 'cut') {
        const sourceFile = clipboard.file;
        const sourceParts = sourceFile.name.split('/');
        sourceParts.pop();
        const sourceFolder = sourceParts.length > 0 ? sourceParts.join('/') : '';

        if (sourceFolder === (targetFolder || '')) {
          console.log('Source and target folders are the same, skipping move');
          return;
        }

        await moveFile(sourceFile.id, targetFolder);
        setClipboard(null);
        fetchProjects();

      } else if (clipboard.operation === 'copy') {
        const src = clipboard.file;
        const base = src.name.split('/').pop();
        const match = base.match(/^(.*?)(\.(jsx?|css|html|py|txt|json|md))?$/i);
        const baseName = match ? match[1] : base;
        const ext = match && match[2] ? match[2] : '';

        let candidate = base;
        let attempt = 0;

        const exists = (fullPath) => files.some(f => f.name === fullPath);

        let targetFull = targetFolder ? `${targetFolder}/${candidate}` : candidate;

        while (exists(targetFull)) {
          attempt += 1;
          candidate = attempt === 1
            ? `${baseName}_copy${ext}`
            : `${baseName}_copy${attempt}${ext}`;
          targetFull = targetFolder ? `${targetFolder}/${candidate}` : candidate;
        }

        try {
          const res = await fetch('http://localhost:5000/create_file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project: currentProject,
              name: targetFull,
              content: src.content || ''
            })
          });

          if (res.ok) {
            const data = await res.json();
            const updated = [...files, {
              ...data,
              displayName: candidate
            }];
            setFiles(updated);
            setFileTree(buildFileTree(updated));
            setSelectedFile(data.id);
            fetchProjects();
          } else {
            const errorData = await res.json();
            console.error('Failed to paste (copy) file:', errorData.error || 'Unknown error');
          }
        } catch (err) {
          console.error('Error creating file during paste:', err);
        }
      }
    } catch (err) {
      console.error('Error during paste:', err);
    }

    setContextMenu(null);
  };

  const getContextMenuTargetFolder = (file) => {
    if (!file) return '';
    if (file.isFolder) {
      return file.path || file.name || '';
    }
    if (file.name) {
      const parts = file.name.split('/');
      if (parts.length === 1) return '';
      parts.pop();
      return parts.join('/');
    }
    return '';
  };

  const moveFile = async (fileId, targetFolder) => {
    const file = files.find(f => f.id === fileId);
    if (!file) {
      console.error('File not found:', fileId);
      return;
    }

    const sourceFolder = getContextMenuTargetFolder({ name: file.name });
    if (sourceFolder === targetFolder) {
      console.log('Source and target folders are the same, skipping move');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/move_file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: currentProject,
          source: file.name,
          targetFolder: targetFolder || ''
        })
      });

      if (res.ok) {
        const base = file.name.split('/').pop();
        const newName = targetFolder ? `${targetFolder}/${base}` : base;

        const updatedFiles = files.map(f =>
          f.id === fileId
            ? { ...f, name: newName, displayName: base }
            : f
        );

        setFiles(updatedFiles);
        setFileTree(buildFileTree(updatedFiles));
        setSelectedFile(fileId);

        if (clipboard && clipboard.file.id === fileId) {
          setClipboard({
            ...clipboard,
            file: { ...clipboard.file, name: newName }
          });
        }

        fetchProjects();
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to move file:', errorData.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error moving file:', err);
    }
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
        const updated = files.filter(f => f.id !== fileId);
        setFiles(updated);
        setFileTree(buildFileTree(updated));

        if (selectedFile === fileId) {
          setSelectedFile(updated[0]?.id || null);
        }

        fetchProjects();
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
          const updated = [...files, data];
          setFiles(updated);
          setFileTree(buildFileTree(updated));
          setSelectedFile(data.id);
          fetchProjects();
        }
      } catch (err) {
        console.error("Error creating file:", err);
      }
    }
    setShowNewFileModal(null);
  };

  const selectedFileData = files.find(f => f.id === selectedFile);

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50/30 via-white to-blue-50">
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

            {completedNodes.length > 0 && !agentProgress.visible &&  (
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
          {/* Projects Tab */}
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

          {/* Code Tab */}
          {activeTab === 'code' && (
            <>
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
                      renamingFile={renamingFile}
                      newFileName={newFileName}
                      setNewFileName={setNewFileName}
                      confirmRename={confirmRename}
                      setRenamingFile={setRenamingFile}
                      collapsedMap={folderCollapsed}
                      setCollapsedMap={setFolderCollapsed}
                      onMoveFile={moveFile}
                      basePath={''}
                    />
                  )}
                </div>
              </div>

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
                        value={currentTypingFile === selectedFileData.id && isTyping ? typingContent : selectedFileData.content}
                        onChange={(e) => handleFileContentChange(e.target.value)}
                        className={`w-full h-full p-6 bg-gray-50/50 font-mono text-sm text-gray-800 resize-none focus:outline-none ${currentTypingFile === selectedFileData.id && isTyping ? 'typing-animation' : ''
                          }`}
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

          {/* Preview Tab */}
          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="flex-1 flex flex-col bg-white">
              {/* ✅ Show message if project not running */}
              {!isRunning ? (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center space-y-4">
                    <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold text-gray-800">Preview Not Available</h3>
                    <p className="text-sm text-gray-600 max-w-md">
                      {currentProject
                        ? 'Click the Run button in the header to start the project and see live preview'
                        : 'Select a project first to see preview'
                      }
                    </p>
                    {currentProject && (
                      <button
                        onClick={handleRunStopProject}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium flex items-center gap-2 mx-auto mt-4"
                      >
                        <Play className="w-5 h-5" />
                        Run Project to Preview
                      </button>
                    )}
                  </div>
                </div>
              ) : currentProject && !projectReady && currentNode ? (
                /* Building animation */
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
                /* ✅ Show preview only if running or HTML available */
                <>
                  {/* Preview toolbar */}
                  <div className="h-12 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                      {isRunning ? 'Live Preview' : 'Static Preview'}
                    </div>
                    {isRunning && (
                      <button
                        onClick={() => {
                          if (iframeRef.current) {
                            iframeRef.current.src = iframeRef.current.src; // Refresh
                          }
                        }}
                        className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Refresh
                      </button>
                    )}
                  </div>
                  <iframe
                    ref={iframeRef}
                    srcDoc={previewHTML}
                    className="w-full h-full border-0"
                    title="Preview"
                  />
                </>
              ) : (
                /* No preview available */
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      {currentProject ? 'No preview available yet' : 'Select a project first'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right Panel - Chat */}
          <div className="w-96 bg-white/80 backdrop-blur-xl border-l border-gray-200/50 flex flex-col">
            <div className="p-4 border-b border-gray-200/50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                {currentChat.name}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowChatHistory(!showChatHistory)}
                  className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Chat History"
                >
                  <History className="w-4 h-4 text-purple-600" />
                </button>
                <button
                  onClick={createNewChat}
                  className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                  title="New Chat"
                >
                  <Plus className="w-4 h-4 text-purple-600" />
                </button>
              </div>
            </div>

            {/* ✅ NEW: Chat History Dropdown */}
            {showChatHistory && (
              <div className="absolute top-16 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-auto m-4">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800">Chat History</h3>
                </div>
                <div className="p-2">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`flex items-center justify-between p-3 rounded-lg hover:bg-purple-50 cursor-pointer ${chat.id === currentChatId ? 'bg-purple-100' : ''
                        }`}
                    >
                      <button
                        onClick={() => {
                          setCurrentChatId(chat.id);
                          setShowChatHistory(false);
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="font-medium text-gray-800 truncate">{chat.name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(chat.timestamp).toLocaleString()}
                        </div>
                        {chat.currentProject && (
                          <div className="text-xs text-purple-600 mt-1">
                            Project: {chat.currentProject}
                          </div>
                        )}
                      </button>
                      {chats.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(chat.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              onClick={() => handleCut(contextMenu.file)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-3"
            >
              <Scissors className="w-4 h-4 text-red-600" />
              Cut
            </button>
            {clipboard && (
              <button
                onClick={() => handlePaste(contextMenu.file)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 flex items-center gap-3"
              >
                <Clipboard className="w-4 h-4 text-green-600" />
                Paste
              </button>
            )}
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

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh the page.</div>;
    }
    return this.props.children;
  }
}
