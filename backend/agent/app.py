from flask_socketio import SocketIO, emit
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os, time, shutil, zipfile, subprocess
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import json
from pathlib import Path
import tempfile
import psutil
import uuid

try:
    from graph import agent
    print("✅ Loaded self-healing agent")
    AGENT_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Agent not available: {e}")
    agent = None
    AGENT_AVAILABLE = False

from tools import PROJECTS_ROOT, get_project_path, list_all_projects, project_exists

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

CURRENT_PROJECTS = {}
RUNNING_PROCESSES = {}
MAX_FILE_SIZE = 1024 * 1024

# ==================================================USABLE FUNCTIONS=================================================
def safe_write_file(file_path, content):
    """Atomically write file to prevent corruption"""
    file_path = Path(file_path)
    temp_fd, temp_path = tempfile.mkstemp(
        dir=file_path.parent,
        prefix=".tmp_",
        suffix=file_path.suffix
    )

    try:
        with os.fdopen(temp_fd, 'w', encoding='utf-8') as f:
            f.write(content)
        os.replace(temp_path, file_path)
        return True
    except Exception as e:
        try:
            os.unlink(temp_path)
        except:
            pass
        raise e

def get_all_files(project_name=None):
    """Get all files from a project"""
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
            dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', '__pycache__', 'dist', 'build', 'venv']]

            for file in files:
                try:
                    file_path = os.path.join(root, file)

                    if file.endswith(('.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot')):
                        continue

                    file_size = os.path.getsize(file_path)
                    if file_size > MAX_FILE_SIZE:
                        print(f"⚠️ Skipping large file: {file} ({file_size / 1024:.1f}KB)")
                        continue

                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            content = f.read()
                    except UnicodeDecodeError:
                        continue

                    rel_path = os.path.relpath(file_path, project_path)
                    files_data.append({
                        "id": str(uuid.uuid4()),                # << uuid instead of incrementing int
                        "name": rel_path.replace("\\", "/"),
                        "project": proj,
                        "type": "file",
                        "content": content,
                        "parent": None
                    })
                    file_id += 1
                except Exception as e:
                    print(f"❌ Error reading {file}: {e}")

    return files_data

def detect_project_type(project_path):
    """Detect project type"""
    project_path = Path(project_path)

    if (project_path / "package.json").exists():
        try:
            with open(project_path / "package.json", "r") as f:
                package_data = json.load(f)
                dependencies = package_data.get("dependencies", {})

                if "next" in dependencies:
                    return "nextjs"
                elif "react" in dependencies:
                    return "react"
                else:
                    return "nodejs"
        except:
            return "nodejs"

    if (project_path / "requirements.txt").exists():
        return "python"

    if (project_path / "index.html").exists():
        return "html"

    if (project_path / "main.py").exists() or (project_path / "app.py").exists():
        return "python"

    return "unknown"

def stop_project(project_name):
    """Stop a running project and ALL child processes"""
    if project_name in RUNNING_PROCESSES:
        process = RUNNING_PROCESSES[project_name]

        try:
            parent = psutil.Process(process.pid)
            children = parent.children(recursive=True)

            for child in children:
                try:
                    child.terminate()
                except psutil.NoSuchProcess:
                    pass

            parent.terminate()

            gone, alive = psutil.wait_procs([parent] + children, timeout=5)

            for p in alive:
                try:
                    p.kill()
                except psutil.NoSuchProcess:
                    pass

        except psutil.NoSuchProcess:
            pass
        except Exception as e:
            print(f"⚠️ Stop error: {e}")
        finally:
            del RUNNING_PROCESSES[project_name]
            print(f"🛑 Stopped: {project_name}")
            socketio.emit("project_status", {
                "project": project_name,
                "status": "stopped",
                "message": "Project stopped"
            })

def generate_chat_name_with_groq(user_message):
    """
    Generate chat name using YOUR EXISTING llm_fast
    """
    try:
        prompt = f"""Generate a very short (2-4 words maximum) descriptive title for this chat:

User message: "{user_message}"

Rules:
- Maximum 4 words
- Be specific and clear
- Use title case
- NO quotes, NO special characters

Examples:
- "create a todo app" → React Todo App
- "help me fix python bug" → Python Bug Fix
- "build portfolio website" → Portfolio Website

Return ONLY the title:"""

        # ✅ ChatGroq (LangChain) syntax
        response = llm_fast.invoke(prompt)  # Simple invoke
        
        # Extract content
        name = response.content.strip()
        
        # Clean up
        name = name.replace('"', '').replace("'", '').replace('*', '')
        
        # Limit length
        if len(name) > 40:
            name = name[:40].rsplit(' ', 1)[0]
        
        print(f"✅ Generated chat name: {name}")
        return name if name else fallback_chat_name(user_message)
        
    except Exception as e:
        print(f"⚠️ Groq naming error: {e}")
        return fallback_chat_name(user_message)

def fallback_chat_name(message):
    """Fallback if Groq fails"""
    stop_words = {'create', 'make', 'build', 'a', 'an', 'the', 'for', 'me', 'please', 'can', 'you', 'help'}
    words = message.lower().split()
    keywords = [w.capitalize() for w in words if w not in stop_words][:3]
    
    if keywords:
        return ' '.join(keywords)[:30]
    
    return message[:30].strip().capitalize() or "New Chat"

# ===================================================API ENDPOINTS===================================================
@app.route("/test", methods=["GET"])
def test():
    """Test endpoint"""
    return jsonify({
        "status": "ok",
        "agent_available": agent is not None,
        "projects": list_all_projects()
    })

@socketio.on("chat_message")
def handle_chat_message(data):
    try:
        user_message = data.get("message", "")
        session_id = data.get("session_id", "default")
        
        # ✅ NEW: Get chat metadata
        chat_id = data.get("chat_id")
        is_first_message = data.get("is_first_message", False)

        print("\n" + "="*60)
        print(f"💬 USER: {user_message}")
        print(f"🆔 Session: {session_id}")
        print(f"🆔 Chat ID: {chat_id}")  # ✅ NEW
        print(f"🎯 First message: {is_first_message}")  # ✅ NEW
        print("="*60 + "\n")

        current_project = CURRENT_PROJECTS.get(session_id)

        # ✅ NEW: Generate chat name FIRST if first message (runs fast in background)
        if is_first_message and chat_id:
            try:
                print("📝 Generating chat name with Groq...")
                chat_name = generate_chat_name_with_groq(user_message)
                
                # Emit name immediately
                socketio.emit("chat_name_generated", {
                    "chat_id": chat_id,
                    "name": chat_name
                })
                print(f"✅ Chat name sent: {chat_name}")
            except Exception as e:
                print(f"⚠️ Chat naming skipped: {e}")

        # ✅ Rest of your existing code remains EXACTLY THE SAME
        def emit_progress_local(message, project_name=None, stage=None, thinking=False):
            payload = {
                "message": message,
                "project": project_name,
                "timestamp": time.time()
            }

            if stage:
                payload["stage"] = stage
    
            if thinking:
                payload["thinking"] = True

            print(f"📡 Progress Emit: {payload}")
            socketio.emit("ai_progress", payload, broadcast=True)
            socketio.sleep(0.05)

        state = {
            "user_prompt": user_message,
            "current_project": current_project,
            "chat_history": data.get("chat_history", []),
            "_emit_progress": emit_progress_local
        }

        socketio.emit("agent_started", {"message": "Processing..."})

        result = agent.invoke(state, config={"recursion_limit":100})

        if result.get("current_project"):
            CURRENT_PROJECTS[session_id] = result["current_project"]

        chat_history = result.get("chat_history", [])
        response_message = ""

        if chat_history and chat_history[-1]["role"] == "assistant":
            response_message = chat_history[-1]["content"]

        if not response_message:
            response_message = "✅ Completed"

        socketio.emit("chat_response", {
            "success": True,
            "message": response_message,
            "current_project": result.get("current_project"),
            "chat_history": chat_history,
            "status": result.get("status", "DONE")
        })

    except Exception as e:
        print("❌ Chat error:", e)
        socketio.emit("chat_error", {"error": str(e)})

@app.route("/chat", methods=["POST"])
def chat_http():
    """HTTP fallback for chat"""
    return jsonify({
        "success": False,
        "message": "Please use Socket.IO 'chat_message' event for real-time chat"
    }), 400

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
    """Get project info"""
    try:
        if not project_exists(project_name):
            return jsonify({"error": "Project not found"}), 404

        files = get_all_files(project_name)
        project_path = get_project_path(project_name)
        project_type = detect_project_type(project_path)
        is_running = project_name in RUNNING_PROCESSES

        return jsonify({
            "name": project_name,
            "file_count": len(files),
            "files": files,
            "type": project_type,
            "is_running": is_running
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

        if project_name in RUNNING_PROCESSES:
            stop_project(project_name)

        shutil.rmtree(project_path)

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

@app.route("/run_project", methods=["POST"])
def run_project():
    """Manual run endpoint"""
    try:
        data = request.get_json()
        project_name = data.get("project")

        if not project_name:
            return jsonify({"success": False, "error": "No project specified"}), 400

        if not project_exists(project_name):
            return jsonify({"success": False, "error": "Project not found"}), 404

        if project_name in RUNNING_PROCESSES:
            return jsonify({
                "success": False,
                "error": "Project already running"
            }), 400

        project_path = get_project_path(project_name)
        project_type = detect_project_type(project_path)

        socketio.emit("ai_progress", {
            "message": f"🚀 Starting {project_name}...",
            "project": project_name
        })

        if project_type == "html":
            process = subprocess.Popen(
                ["python", "-m", "http.server", "8000"],
                cwd=str(project_path),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            RUNNING_PROCESSES[project_name] = process

            socketio.emit("project_status", {
                "project": project_name,
                "status": "running",
                "message": "✅ Running at http://localhost:8000",
                "url": "http://localhost:8000"
            })

            return jsonify({"success": True, "url": "http://localhost:8000"})

        elif project_type in ["react", "nextjs"]:
            port = 3000
            cmd = ["npm", "start"] if project_type == "react" else ["npm", "run", "dev"]

            env = {
                "PATH": os.environ.get("PATH", ""),
                "NODE_ENV": "development",
                "BROWSER": "none"
            }

            if os.name == 'posix':
                process = subprocess.Popen(
                    cmd,
                    cwd=str(project_path),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    env=env,
                    preexec_fn=os.setsid
                )
            else:
                process = subprocess.Popen(
                    cmd,
                    cwd=str(project_path),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    env=env,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
                )

            RUNNING_PROCESSES[project_name] = process

            socketio.emit("project_status", {
                "project": project_name,
                "status": "running",
                "message": f"✅ Running at http://localhost:{port}",
                "url": f"http://localhost:{port}"
            })

            return jsonify({"success": True, "url": f"http://localhost:{port}"})

        return jsonify({"success": True, "message": "Project started"})

    except Exception as e:
        print(f"❌ Run error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/stop_project", methods=["POST"])
def stop_project_endpoint():
    """Stop a running project"""
    try:
        data = request.get_json()
        project_name = data.get("project")

        if not project_name:
            return jsonify({"success": False, "error": "No project specified"}), 400

        if project_name not in RUNNING_PROCESSES:
            return jsonify({"success": False, "error": "Project not running"}), 400

        stop_project(project_name)

        return jsonify({"success": True, "message": f"Stopped {project_name}"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
            return jsonify({"error": "Project and file name required"}), 400

        project_path = get_project_path(project_name)
        file_path = project_path / name

        file_path.parent.mkdir(parents=True, exist_ok=True)
        safe_write_file(file_path, content)

        files = get_all_files(project_name)
        new_file = next((f for f in files if f["name"] == name), None)

        file_data = {
            "id": str(uuid.uuid4()),
            "project": project_name,
            "name": name,
            "content": content
        }

        socketio.emit("file_created", file_data, broadcast=True)

        return jsonify(new_file), 201
    except Exception as e:
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
            return jsonify({"error": "Project and file name required"}), 400

        project_path = get_project_path(project_name)
        file_path = project_path / name

        file_path.parent.mkdir(parents=True, exist_ok=True)
        safe_write_file(file_path, content)

        return jsonify({"success": True})
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
            return jsonify({"error": "Project and file name required"}), 400

        project_path = get_project_path(project_name)
        file_path = project_path / name

        if not file_path.exists():
            return jsonify({"error": "File not found"}), 404

        if file_path.is_file():
            file_path.unlink()
        else:
            shutil.rmtree(file_path)

        socketio.emit("file_deleted", {
            "id": str(uuid.uuid4()),
            "project": project_name, 
            "name": name})

        return jsonify({"success": True})
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
            return jsonify({"error": "Missing parameters"}), 400

        project_path = get_project_path(project_name)
        old_path = project_path / old_name
        new_path = project_path / new_name

        if not old_path.exists():
            return jsonify({"error": "File not found"}), 404

        new_path.parent.mkdir(parents=True, exist_ok=True)
        old_path.rename(new_path)

        socketio.emit("file_renamed", {
            "id": str(uuid.uuid4()),
            "project": project_name,
            "oldName": old_name,
            "newName": new_name
        })

        return jsonify({"success": True})
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
                if file.is_file() and "node_modules" not in str(file):
                    arcname = file.relative_to(project_path)
                    zipf.write(file, arcname)

        return send_file(zip_path, as_attachment=True, download_name=f"{project_name}.zip")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@socketio.on("update_file")
def handle_update(data):
    """Handle real-time file updates"""
    try:
        project_name = data.get("project")
        name = data.get("name")
        content = data.get("content")

        project_path = get_project_path(project_name)
        file_path = project_path / name

        file_path.parent.mkdir(parents=True, exist_ok=True)
        safe_write_file(file_path, content)

        emit("file_updated", {
            "id": str(uuid.uuid4()),
            "project": project_name,
            "name": name,
            "content": content
        }, broadcast=True, include_self=False)

    except Exception as e:
        print(f"❌ Socket error: {e}")

# ============================================FILE HANDLING FOR TWO WAY SYNC============================================

class FileChangeHandler(FileSystemEventHandler):
    def __init__(self):
        self.last_modified = {}

    def on_any_event(self, event):
        if event.is_directory:
            return

        # ignore our atomic temp files
        if Path(event.src_path).name.startswith(".tmp_"):
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

                # best-effort text read
                try:
                    with open(event.src_path, "r", encoding="utf-8") as f:
                        content = f.read()
                except UnicodeDecodeError:
                    return  # skip binary

                payload = {
                    "id": str(uuid.uuid4()),
                    "project": project_name,
                    "name": file_rel_path,   # << correct variable
                    "content": content
                }

                if event.event_type == "created":
                    socketio.emit("file_created", payload, broadcast=True)
                else:
                    socketio.emit("file_updated", payload, broadcast=True)

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

def cleanup():
    """Stop all running processes"""
    print("\n🧹 Cleaning up...")
    for project_name in list(RUNNING_PROCESSES.keys()):
        stop_project(project_name)

import atexit
atexit.register(cleanup)

if __name__ == "__main__":
    print(f"\n{'='*60}")
    print(f"🚀 DevDost AI - SocketIO Real-Time Backend")
    print(f"{'='*60}")
    print(f"📂 Projects: {PROJECTS_ROOT}")
    print(f"🌐 Server: http://localhost:5000")
    print(f"💬 Chat: SocketIO 'chat_message' event")
    print(f"🤖 Agent: {'✅ Loaded' if agent else '❌ Not available'}")
    print(f"✅ Real-time: SocketIO streaming enabled")
    print(f"✅ Recursion limit: 100")
    print(f"✅ File size limit: {MAX_FILE_SIZE / 1024}KB")
    print(f"{'='*60}\n")

    PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)

    import threading
    threading.Thread(target=start_watcher, daemon=True).start()

    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=False,
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )