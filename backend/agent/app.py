from flask_socketio import SocketIO, emit
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from graph import agent  
import os, time, threading, shutil, zipfile
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Flask app setup
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# 📂 Folder for AI generated files
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "generated_project"))

# ========================= HELPER FUNCTIONS =========================
def get_all_files():
    """Get all files from generated_project folder with proper structure"""
    files_data = []
    file_id = 1
    
    if not os.path.exists(BASE_DIR):
        os.makedirs(BASE_DIR)
        return files_data
    
    for root, dirs, files in os.walk(BASE_DIR):
        for file in files:
            try:
                file_path = os.path.join(root, file)
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # Relative path from BASE_DIR
                rel_path = os.path.relpath(file_path, BASE_DIR)
                
                files_data.append({
                    "id": file_id,
                    "name": rel_path,
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
    time.sleep(0.3)  # Small delay for visual effect


# ========================= AI GENERATION =========================
@app.route("/generate", methods=["POST"])
def generate():
    """Generate code using AI agent with real-time updates"""
    try:
        data = request.get_json()
        user_prompt = data.get("prompt")
        
        if not user_prompt:
            return jsonify({"success": False, "error": "No prompt provided"}), 400

        print(f"\n{'='*60}")
        print(f"🚀 Starting AI Generation")
        print(f"📝 Prompt: {user_prompt}")
        print(f"{'='*60}\n")
        
        # Send real-time status updates
        send_ai_status("🤖 Analyzing your request...")
        send_ai_status("🧠 Planning project structure...")
        send_ai_status("📝 Writing HTML code...")
        
        # Call your AI agent
        result = agent.invoke({
            "user_prompt": user_prompt, 
            # "recursion_limit": 100
        })

        send_ai_status("🎨 Adding CSS styles...")
        send_ai_status("⚡ Implementing JavaScript logic...")
        send_ai_status("💾 Saving files to disk...")
        
        # Give time for files to be created
        time.sleep(0.5)
        
        send_ai_status("✅ Project generated successfully!")
        
        print(f"\n{'='*60}")
        print(f"✅ Generation Complete!")
        print(f"{'='*60}\n")
        
        return jsonify({
            "success": True,
            "result": str(result)
        })

    except Exception as e:
        print(f"❌ Generation error: {e}")
        send_ai_status(f"❌ Error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ========================= FILE OPERATIONS =========================
@app.route("/get_files", methods=["GET"])
def get_files():
    """Return all generated files"""
    try:
        files = get_all_files()
        return jsonify(files)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/create_file", methods=["POST"])
def create_file():
    """Create new file or folder"""
    try:
        data = request.get_json()
        name = data.get("name")
        content = data.get("content", "")
        file_type = data.get("type", "file")
        
        if not name:
            return jsonify({"error": "No name provided"}), 400
        
        file_path = os.path.join(BASE_DIR, name)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        if file_type == "file":
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"✨ Created file: {name}")
        else:
            os.makedirs(file_path, exist_ok=True)
            print(f"📁 Created folder: {name}")
        
        # Get new file data
        files = get_all_files()
        new_file = next((f for f in files if f["name"] == name), None)
        
        # Emit to all clients
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
        name = data.get("name")
        content = data.get("content", "")
        
        if not name:
            return jsonify({"error": "No name provided"}), 400
        
        file_path = os.path.join(BASE_DIR, name)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        print(f"💾 Saved: {name}")
        
        return jsonify({"success": True, "message": "File saved"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/delete_file", methods=["POST"])
def delete_file():
    """Delete file or folder"""
    try:
        data = request.get_json()
        name = data.get("name")
        
        if not name:
            return jsonify({"error": "No name provided"}), 400
        
        file_path = os.path.join(BASE_DIR, name)
        
        if os.path.isfile(file_path):
            os.remove(file_path)
            print(f"🗑️ Deleted file: {name}")
        elif os.path.isdir(file_path):
            shutil.rmtree(file_path)
            print(f"🗑️ Deleted folder: {name}")
        else:
            return jsonify({"error": "File not found"}), 404
        
        # Emit to all clients
        socketio.emit("file_deleted", {"name": name})
        
        return jsonify({"success": True, "message": "File deleted"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/rename_file", methods=["POST"])
def rename_file():
    """Rename file or folder"""
    try:
        data = request.get_json()
        old_name = data.get("oldName")
        new_name = data.get("newName")
        
        if not old_name or not new_name:
            return jsonify({"error": "Names not provided"}), 400
        
        old_path = os.path.join(BASE_DIR, old_name)
        new_path = os.path.join(BASE_DIR, new_name)
        
        if not os.path.exists(old_path):
            return jsonify({"error": "File not found"}), 404
        
        os.makedirs(os.path.dirname(new_path), exist_ok=True)
        os.rename(old_path, new_path)
        
        print(f"✏️ Renamed: {old_name} → {new_name}")
        
        # Emit to all clients
        socketio.emit("file_renamed", {"oldName": old_name, "newName": new_name})
        
        return jsonify({"success": True, "message": "File renamed"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/download_project", methods=["GET"])
def download_project():
    """Download entire project as ZIP"""
    try:
        zip_path = os.path.join(os.path.dirname(BASE_DIR), "project.zip")
        
        # Create ZIP file
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(BASE_DIR):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, BASE_DIR)
                    zipf.write(file_path, arcname)
        
        print(f"📦 Project downloaded")
        return send_file(zip_path, as_attachment=True, download_name="project.zip")
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ========================= SOCKET.IO REALTIME =========================
@socketio.on("update_file")
def handle_update(data):
    """Handle real-time file updates from frontend"""
    try:
        print(f"📩 Socket update: {data['name']}")
        file_path = os.path.join(BASE_DIR, data["name"])
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(data["content"])
        
        # Broadcast to all other clients
        emit("file_updated", {
            "name": data["name"], 
            "content": data["content"]
        }, broadcast=True, include_self=False)
        
        print(f"✅ Updated: {data['name']}")
        
    except Exception as e:
        print(f"❌ Socket update error: {e}")


# ========================= FILE WATCHER =========================
class FileChangeHandler(FileSystemEventHandler):
    """Watch for file changes and notify frontend"""
    
    def __init__(self):
        self.last_modified = {}
        
    def on_any_event(self, event):
        if event.is_directory:
            return

        # Prevent duplicate events
        now = time.time()
        if event.src_path in self.last_modified:
            if now - self.last_modified[event.src_path] < 0.5:
                return
        self.last_modified[event.src_path] = now

        if event.event_type in ("modified", "created"):
            try:
                time.sleep(0.1)  # Small delay for file write completion
                
                rel_path = os.path.relpath(event.src_path, BASE_DIR)
                
                with open(event.src_path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                print(f"👀 Detected {event.event_type}: {rel_path}")
                
                # Emit to frontend
                if event.event_type == "created":
                    files = get_all_files()
                    new_file = next((f for f in files if f["name"] == rel_path), None)
                    if new_file:
                        socketio.emit("file_created", new_file)
                else:
                    socketio.emit("file_updated", {
                        "name": rel_path, 
                        "content": content
                    })
                
            except Exception as e:
                print(f"❌ Watcher error: {e}")


def start_watcher():
    """Start file system watcher in background"""
    observer = Observer()
    event_handler = FileChangeHandler()
    observer.schedule(event_handler, BASE_DIR, recursive=True)
    observer.start()
    print(f"👀 Watching: {BASE_DIR}")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


# ========================= RUN SERVER =========================
if __name__ == "__main__":
    print(f"\n{'='*60}")
    print(f"🚀 DevDost AI Backend Server")
    print(f"{'='*60}")
    print(f"📂 Project folder: {BASE_DIR}")
    print(f"🌐 Server: http://localhost:5000")
    print(f"{'='*60}\n")
    
    # Ensure base directory exists
    os.makedirs(BASE_DIR, exist_ok=True)
    
    # Start file watcher in background
    threading.Thread(target=start_watcher, daemon=True).start()
    
    # Run Flask-SocketIO server
    socketio.run(
        app, 
        host="0.0.0.0", 
        port=5000, 
        debug=False, 
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )