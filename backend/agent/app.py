from flask_socketio import SocketIO, emit
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os, time, threading, shutil, zipfile, subprocess, signal
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import json
from pathlib import Path

# Import your enhanced agent
try:
    from graph import agent
    print("✅ Loaded agent from graph.py")
except ImportError:
    try:
        from simple_agent import agent
        print("✅ Loaded simple mock agent")
    except ImportError:
        agent = None
        print("⚠️ Warning: No agent available. Chat will use basic responses.")

from tools import PROJECTS_ROOT, get_project_path, list_all_projects, project_exists

# Flask app setup
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Session management
CURRENT_PROJECTS = {}  # {session_id: project_name}
RUNNING_PROCESSES = {}  # {project_name: subprocess}

# ========================= HELPER FUNCTIONS =========================
def get_all_files(project_name=None):
    """Get all files from a project or all projects"""
    files_data = []
    file_id = 1
    
    if project_name:
        projects = [project_name] if project_exists(project_name) else []
    else:
        projects = list_all_projects()
    
    for proj in projects:
        project_path = get_project_path(proj)
        
        if not project_path.exists():
            continue
        
        for root, dirs, files in os.walk(project_path):
            # Skip node_modules and other common directories
            dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', '__pycache__', 'dist', 'build']]
            
            for file in files:
                try:
                    file_path = os.path.join(root, file)
                    
                    # Skip binary files
                    if file.endswith(('.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot')):
                        continue
                    
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    rel_path = os.path.relpath(file_path, project_path)
                    
                    files_data.append({
                        "id": file_id,
                        "name": rel_path,
                        "project": proj,
                        "type": "file",
                        "content": content,
                        "parent": None
                    })
                    file_id += 1
                except Exception as e:
                    print(f"❌ Error reading {file}: {e}")
    
    return files_data


def send_ai_status(message):
    """Send AI status update to frontend"""
    print(f"🤖 AI Status: {message}")
    socketio.emit("ai_step", {"message": message})
    time.sleep(0.2)


def detect_project_type(project_path):
    """Detect project type based on files"""
    project_path = Path(project_path)
    
    # Check for package.json (React/Next.js)
    if (project_path / "package.json").exists():
        with open(project_path / "package.json", "r") as f:
            package_data = json.load(f)
            dependencies = package_data.get("dependencies", {})
            
            if "next" in dependencies:
                return "nextjs"
            elif "react" in dependencies:
                return "react"
            else:
                return "nodejs"
    
    # Check for requirements.txt (Python)
    if (project_path / "requirements.txt").exists():
        return "python"
    
    # Check for index.html (Static HTML)
    if (project_path / "index.html").exists():
        return "html"
    
    # Check for main.py or app.py
    if (project_path / "main.py").exists() or (project_path / "app.py").exists():
        return "python"
    
    return "unknown"


def run_project_command(project_name, project_type):
    """Get the command to run based on project type"""
    commands = {
        "html": {
            "command": "python -m http.server 8000",
            "message": "Starting HTTP server on port 8000...",
            "url": "http://localhost:8000"
        },
        "react": {
            "command": "npm start",
            "message": "Starting React development server...",
            "url": "http://localhost:3000"
        },
        "nextjs": {
            "command": "npm run dev",
            "message": "Starting Next.js development server...",
            "url": "http://localhost:3000"
        },
        "nodejs": {
            "command": "npm start",
            "message": "Starting Node.js application...",
            "url": "http://localhost:3000"
        },
        "python": {
            "command": "python main.py",
            "message": "Running Python application...",
            "url": None
        }
    }
    
    return commands.get(project_type, {
        "command": None,
        "message": f"Unknown project type: {project_type}",
        "url": None
    })


# ========================= AI AGENT ENDPOINT =========================
@app.route("/test", methods=["GET"])
def test():
    """Test endpoint"""
    return jsonify({
        "status": "ok",
        "agent_available": agent is not None,
        "projects": list_all_projects()
    })


@app.route("/chat", methods=["POST"])
def chat_with_agent():
    """Main chat endpoint - handles all user interactions"""
    try:
        data = request.get_json()
        user_message = data.get("message")
        session_id = data.get("session_id", "default")
        
        if not user_message:
            return jsonify({"success": False, "error": "No message provided"}), 400

        print(f"\n{'='*60}")
        print(f"💬 User: {user_message}")
        print(f"📱 Session: {session_id}")
        print(f"{'='*60}\n")
        
        current_project = CURRENT_PROJECTS.get(session_id)
        
        # Simple responses if agent not available
        if agent is None:
            print("⚠️ Agent not configured - using simple responses")
            
            # Detect intent
            msg_lower = user_message.lower()
            
            if any(word in msg_lower for word in ['create', 'build', 'make', 'generate']):
                response = "🤖 I can help you create projects! However, the AI agent is not configured. Please set up the agent in graph.py to enable full functionality."
            elif any(word in msg_lower for word in ['list', 'show', 'projects']):
                projects = list_all_projects()
                response = f"📁 Available projects: {', '.join(projects) if projects else 'None yet'}"
            elif any(word in msg_lower for word in ['switch', 'change', 'open']):
                response = "To switch projects, use the dropdown menu at the top."
            else:
                response = "👋 Hi! I'm DevDost AI. I can help you create and manage projects. Try asking me to 'create a landing page' or 'show all projects'."
            
            return jsonify({
                "success": True,
                "message": response,
                "current_project": current_project,
                "chat_history": data.get("chat_history", []) + [{"role": "assistant", "content": response}],
                "status": "DONE"
            })
        
        # Prepare state for agent
        state = {
            "user_prompt": user_message,  # Agent expects 'user_prompt'
            "current_project": current_project,
            "chat_history": data.get("chat_history", [])
        }
        
        print(f"🤖 Invoking agent with state: {state.keys()}")
        
        # Run the agent
        try:
            result = agent.invoke(state)
            print(f"✅ Agent response received")
        except Exception as agent_error:
            print(f"❌ Agent error: {agent_error}")
            import traceback
            traceback.print_exc()
            
            return jsonify({
                "success": False,
                "error": f"Agent error: {str(agent_error)}"
            }), 500
        
        # Update session project if changed
        if result.get("current_project"):
            CURRENT_PROJECTS[session_id] = result["current_project"]
            print(f"📂 Updated current project: {result['current_project']}")
        
        # Extract response
        chat_history = result.get("chat_history", [])
        response_message = ""
        
        if chat_history:
            last_msg = chat_history[-1]
            if last_msg.get("role") == "assistant":
                response_message = last_msg.get("content", "")
        
        if not response_message:
            response_message = "✅ Done! Check your files."
        
        return jsonify({
            "success": True,
            "message": response_message,
            "current_project": result.get("current_project"),
            "chat_history": chat_history,
            "status": result.get("status", "PROCESSING")
        })

    except Exception as e:
        print(f"❌ Chat error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ========================= PROJECT MANAGEMENT =========================
@app.route("/projects", methods=["GET"])
def get_projects():
    """Get list of all projects"""
    try:
        projects = list_all_projects()
        return jsonify({"projects": projects})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/projects/<project_name>", methods=["GET"])
def get_project_info(project_name):
    """Get information about a specific project"""
    try:
        if not project_exists(project_name):
            return jsonify({"error": "Project not found"}), 404
        
        files = get_all_files(project_name)
        project_path = get_project_path(project_name)
        project_type = detect_project_type(project_path)
        
        return jsonify({
            "name": project_name,
            "file_count": len(files),
            "files": files,
            "type": project_type
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/projects/<project_name>", methods=["DELETE"])
def delete_project(project_name):
    """Delete a project"""
    try:
        project_path = get_project_path(project_name)
        
        if not project_path.exists():
            return jsonify({"error": "Project not found"}), 404
        
        # Stop running process if exists
        if project_name in RUNNING_PROCESSES:
            stop_project(project_name)
        
        shutil.rmtree(project_path)
        
        # Clear from sessions
        for sid in list(CURRENT_PROJECTS.keys()):
            if CURRENT_PROJECTS[sid] == project_name:
                del CURRENT_PROJECTS[sid]
        
        socketio.emit("project_deleted", {"name": project_name})
        
        return jsonify({"success": True, "message": f"Project {project_name} deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/projects/<project_name>/switch", methods=["POST"])
def switch_project(project_name):
    """Switch to a different project"""
    try:
        data = request.get_json()
        session_id = data.get("session_id", "default")
        
        if not project_exists(project_name):
            return jsonify({"error": "Project not found"}), 404
        
        CURRENT_PROJECTS[session_id] = project_name
        
        return jsonify({
            "success": True,
            "current_project": project_name
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ========================= RUN PROJECT =========================
@app.route("/run_project", methods=["POST"])
def run_project():
    """Run the project based on its type"""
    try:
        data = request.get_json()
        project_name = data.get("project")
        
        if not project_name:
            return jsonify({"success": False, "error": "No project specified"}), 400
        
        if not project_exists(project_name):
            return jsonify({"success": False, "error": "Project not found"}), 404
        
        project_path = get_project_path(project_name)
        project_type = detect_project_type(project_path)
        
        print(f"\n{'='*60}")
        print(f"🚀 Running Project: {project_name}")
        print(f"📦 Type: {project_type}")
        print(f"{'='*60}\n")
        
        # Stop existing process if running
        if project_name in RUNNING_PROCESSES:
            stop_project(project_name)
        
        # Get command for project type
        run_config = run_project_command(project_name, project_type)
        
        if not run_config["command"]:
            return jsonify({
                "success": False,
                "error": f"Unknown project type: {project_type}"
            }), 400
        
        # For HTML projects, use Python's http.server
        if project_type == "html":
            try:
                process = subprocess.Popen(
                    ["python", "-m", "http.server", "8000"],
                    cwd=str(project_path),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                RUNNING_PROCESSES[project_name] = process
                
                return jsonify({
                    "success": True,
                    "message": run_config["message"],
                    "url": run_config["url"],
                    "type": project_type,
                    "output": f"Server started on {run_config['url']}\nPress Ctrl+C to stop"
                })
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": f"Failed to start server: {str(e)}"
                }), 500
        
        # For Node.js projects (React, Next.js)
        elif project_type in ["react", "nextjs", "nodejs"]:
            # Check if node_modules exists
            if not (project_path / "node_modules").exists():
                return jsonify({
                    "success": False,
                    "error": "Dependencies not installed. Run 'npm install' first.",
                    "output": "Please install dependencies:\n\nnpm install"
                }), 400
            
            try:
                process = subprocess.Popen(
                    run_config["command"].split(),
                    cwd=str(project_path),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                RUNNING_PROCESSES[project_name] = process
                
                return jsonify({
                    "success": True,
                    "message": run_config["message"],
                    "url": run_config["url"],
                    "type": project_type,
                    "output": f"Starting {project_type} server...\nCheck {run_config['url']}"
                })
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": f"Failed to start: {str(e)}"
                }), 500
        
        # For Python projects
        elif project_type == "python":
            main_file = project_path / "main.py"
            if not main_file.exists():
                main_file = project_path / "app.py"
            
            if not main_file.exists():
                return jsonify({
                    "success": False,
                    "error": "No main.py or app.py found"
                }), 400
            
            try:
                process = subprocess.Popen(
                    ["python", main_file.name],
                    cwd=str(project_path),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                RUNNING_PROCESSES[project_name] = process
                
                # Wait a bit and capture initial output
                time.sleep(1)
                
                return jsonify({
                    "success": True,
                    "message": "Running Python application",
                    "url": None,
                    "type": project_type,
                    "output": f"Executing {main_file.name}...\nCheck terminal for output"
                })
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": f"Failed to run: {str(e)}"
                }), 500
        
        return jsonify({
            "success": False,
            "error": f"Project type {project_type} not supported yet"
        }), 400
        
    except Exception as e:
        print(f"❌ Run error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


def stop_project(project_name):
    """Stop a running project"""
    if project_name in RUNNING_PROCESSES:
        process = RUNNING_PROCESSES[project_name]
        try:
            process.terminate()
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        
        del RUNNING_PROCESSES[project_name]
        print(f"🛑 Stopped project: {project_name}")


@app.route("/stop_project", methods=["POST"])
def stop_project_endpoint():
    """Stop a running project"""
    try:
        data = request.get_json()
        project_name = data.get("project")
        
        if not project_name:
            return jsonify({"success": False, "error": "No project specified"}), 400
        
        stop_project(project_name)
        
        return jsonify({
            "success": True,
            "message": f"Stopped {project_name}"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ========================= FILE OPERATIONS =========================
@app.route("/get_files", methods=["GET"])
def get_files():
    """Return all files"""
    try:
        project_name = request.args.get("project")
        
        if not project_name:
            return jsonify([])
        
        if not project_exists(project_name):
            return jsonify([])
        
        files = get_all_files(project_name)
        print(f"📁 Fetched {len(files)} files for project: {project_name}")
        
        return jsonify(files)
    except Exception as e:
        print(f"❌ Get files error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/create_file", methods=["POST"])
def create_file():
    """Create new file"""
    try:
        data = request.get_json()
        project_name = data.get("project")
        name = data.get("name")
        content = data.get("content", "")
        
        if not project_name or not name:
            return jsonify({"error": "Project name and file name required"}), 400
        
        project_path = get_project_path(project_name)
        file_path = project_path / name
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        print(f"✨ Created: {project_name}/{name}")
        
        files = get_all_files(project_name)
        new_file = next((f for f in files if f["name"] == name), None)
        
        socketio.emit("file_created", new_file)
        
        return jsonify(new_file), 201
        
    except Exception as e:
        print(f"❌ Create file error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/save_file", methods=["POST"])
def save_file():
    """Save file content"""
    try:
        data = request.get_json()
        project_name = data.get("project")
        name = data.get("name")
        content = data.get("content", "")
        
        if not project_name or not name:
            return jsonify({"error": "Project name and file name required"}), 400
        
        project_path = get_project_path(project_name)
        file_path = project_path / name
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        print(f"💾 Saved: {project_name}/{name}")
        
        return jsonify({"success": True, "message": "File saved"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/delete_file", methods=["POST"])
def delete_file():
    """Delete file"""
    try:
        data = request.get_json()
        project_name = data.get("project")
        name = data.get("name")
        
        if not project_name or not name:
            return jsonify({"error": "Project name and file name required"}), 400
        
        project_path = get_project_path(project_name)
        file_path = project_path / name
        
        if not file_path.exists():
            return jsonify({"error": "File not found"}), 404
        
        if file_path.is_file():
            file_path.unlink()
        else:
            shutil.rmtree(file_path)
        
        print(f"🗑️ Deleted: {project_name}/{name}")
        
        socketio.emit("file_deleted", {"project": project_name, "name": name})
        
        return jsonify({"success": True, "message": "File deleted"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/rename_file", methods=["POST"])
def rename_file():
    """Rename file"""
    try:
        data = request.get_json()
        project_name = data.get("project")
        old_name = data.get("oldName")
        new_name = data.get("newName")
        
        if not project_name or not old_name or not new_name:
            return jsonify({"error": "Project name, old name and new name required"}), 400
        
        project_path = get_project_path(project_name)
        old_path = project_path / old_name
        new_path = project_path / new_name
        
        if not old_path.exists():
            return jsonify({"error": "File not found"}), 404
        
        new_path.parent.mkdir(parents=True, exist_ok=True)
        old_path.rename(new_path)
        
        print(f"✏️ Renamed: {old_name} → {new_name}")
        
        socketio.emit("file_renamed", {
            "project": project_name,
            "oldName": old_name,
            "newName": new_name
        })
        
        return jsonify({"success": True, "message": "File renamed"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/download_project", methods=["GET"])
def download_project():
    """Download project as ZIP"""
    try:
        project_name = request.args.get("project")
        
        if not project_name:
            return jsonify({"error": "Project name required"}), 400
        
        project_path = get_project_path(project_name)
        
        if not project_path.exists():
            return jsonify({"error": "Project not found"}), 404
        
        zip_path = PROJECTS_ROOT / f"{project_name}.zip"
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file in project_path.rglob("*"):
                if file.is_file():
                    arcname = file.relative_to(project_path)
                    zipf.write(file, arcname)
        
        print(f"📦 Downloaded: {project_name}")
        return send_file(zip_path, as_attachment=True, download_name=f"{project_name}.zip")
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ========================= SOCKET.IO =========================
@socketio.on("update_file")
def handle_update(data):
    """Handle real-time file updates"""
    try:
        project_name = data.get("project")
        name = data.get("name")
        content = data.get("content")
        
        print(f"📩 Socket update: {project_name}/{name}")
        
        project_path = get_project_path(project_name)
        file_path = project_path / name
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        emit("file_updated", {
            "project": project_name,
            "name": name,
            "content": content
        }, broadcast=True, include_self=False)
        
    except Exception as e:
        print(f"❌ Socket error: {e}")


# ========================= FILE WATCHER =========================
class FileChangeHandler(FileSystemEventHandler):
    def __init__(self):
        self.last_modified = {}
        
    def on_any_event(self, event):
        if event.is_directory:
            return

        now = time.time()
        if event.src_path in self.last_modified:
            if now - self.last_modified[event.src_path] < 0.5:
                return
        self.last_modified[event.src_path] = now

        if event.event_type in ("modified", "created"):
            try:
                time.sleep(0.1)
                
                rel_path = os.path.relpath(event.src_path, PROJECTS_ROOT)
                project_name = rel_path.split(os.sep)[0]
                file_rel_path = os.sep.join(rel_path.split(os.sep)[1:])
                
                with open(event.src_path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                if event.event_type == "created":
                    files = get_all_files(project_name)
                    new_file = next((f for f in files if f["name"] == file_rel_path), None)
                    if new_file:
                        socketio.emit("file_created", new_file)
                else:
                    socketio.emit("file_updated", {
                        "project": project_name,
                        "name": file_rel_path,
                        "content": content
                    })
                
            except Exception as e:
                print(f"❌ Watcher error: {e}")


def start_watcher():
    observer = Observer()
    event_handler = FileChangeHandler()
    observer.schedule(event_handler, str(PROJECTS_ROOT), recursive=True)
    observer.start()
    print(f"👀 Watching: {PROJECTS_ROOT}")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


# ========================= CLEANUP =========================
def cleanup():
    """Stop all running processes"""
    print("\n🧹 Cleaning up...")
    for project_name in list(RUNNING_PROCESSES.keys()):
        stop_project(project_name)


import atexit
atexit.register(cleanup)


# ========================= RUN SERVER =========================
if __name__ == "__main__":
    print(f"\n{'='*60}")
    print(f"🚀 DevDost AI Backend Server (Complete)")
    print(f"{'='*60}")
    print(f"📂 Projects: {PROJECTS_ROOT}")
    print(f"🌐 Server: http://localhost:5000")
    print(f"💬 Chat: POST /chat")
    print(f"▶️ Run: POST /run_project")
    print(f"{'='*60}\n")
    
    PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)
    
    threading.Thread(target=start_watcher, daemon=True).start()
    
    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=False,
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )