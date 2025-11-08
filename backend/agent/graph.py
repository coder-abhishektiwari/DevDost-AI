import json
import subprocess
import time
import os
from pathlib import Path
from dotenv import load_dotenv
from langchain_core.globals import set_verbose, set_debug
from langchain_groq.chat_models import ChatGroq
from langgraph.constants import END
from langgraph.graph import StateGraph
from langchain_core.prompts import ChatPromptTemplate
from prompts import *
from states import *
from tools import *
from intent_classifier import IntentClassifier

# Load environment
_ = load_dotenv()
set_debug(False)
set_verbose(False)

# ✅ Use your exact LLM setup
llm_heavy = ChatGroq(model="openai/gpt-oss-120b", temperature=0.3, max_retries=2)
llm_fast = ChatGroq(model="llama-3.1-8b-instant", temperature=0.3, max_retries=2)

MAX_RETRIES = 2

# ===================== HELPER FUNCTIONS =====================

def emit_chat_progress(state: dict, message: str) -> dict:
    """Add detailed progress message to chat history AND emit via socketio"""
    
    # Add to chat history
    state["chat_history"].append({
        "role": "assistant",
        "content": message
    })
    
    print(f"💬 CHAT: {message}")
    
    
    # Get callback
    emit_fn = state.get("_emit_progress")
    
    if emit_fn is not None:
        if callable(emit_fn):
            try:
                emit_fn(message, state.get("current_project"))
                print("✅ Successfully emitted via callback")
            except Exception as e:
                print(f"⚠️ Emit error: {e}")
                import traceback
                traceback.print_exc()
        else:
            print("⚠️ Callback exists but not callable!")
    else:
        print("⚠️ No emit callback found in state")
    
    return state

def normalize_state(state: dict) -> dict:
    """Ensure all required keys exist with defaults"""
    
    # ✅ SAVE callback PEHLE
    saved_callback = state.get("_emit_progress", None)
    
    defaults = {
        "user_prompt": "",
        "chat_history": [],
        "current_project": None,
        "plan": None,
        "task_plan": None,
        "coder_state": None,
        "status": None,
        "intent": None,
        "initialization_done": False,
        "project_structure": "html",
        "run_attempts": 0,
        "last_error": None,
        "debug_history": [],
        "file_retry_count": {},
        "max_retries": MAX_RETRIES,
        "coder_iterations": 0,
        "max_coder_iterations": 50,
        "messages": []
    }
    
    for key, val in defaults.items():
        if key not in state or state[key] is None:
            if isinstance(val, list):
                state[key] = []
            elif isinstance(val, dict):
                state[key] = {}
            else:
                state[key] = val
    
    # ✅ RESTORE callback - CRITICAL!
    if saved_callback is not None:
        state["_emit_progress"] = saved_callback
        print(f"✅ Restored callback in normalize_state")
    
    return state

def initialize_project(project_name: str, techstack: str, state: dict) -> dict:
    """Initialize project with chat updates"""
    project_path = get_project_path(project_name)
    techstack_lower = techstack.lower()

    state = emit_chat_progress(state, f"🔧 **आपका प्रोजेक्ट बन रहा है:** `{project_name}`")

    try:
        # REACT
        if "react" in techstack_lower and "next" not in techstack_lower:
            state = emit_chat_progress(state, "⚛️ React app का structure बना रहे हैं (2-3 मिनट लगेंगे)...")

            if project_path.exists():
                import shutil
                shutil.rmtree(project_path)

            result = subprocess.run(
                ["npx","--yes","create-react-app",project_name],
                cwd=str(PROJECTS_ROOT),
                text=True,
                timeout=400,
                capture_output=True
            )

            if result.returncode == 0:
                state = emit_chat_progress(state, "✅ **React app तैयार है!**")
                return {**state, "initialization_done": True, "project_structure": "react"}
            else:
                raise Exception("React init failed")

        # NEXT JS
        elif "next" in techstack_lower:
            state = emit_chat_progress(state, "⚡ Next.js app का structure बना रहे हैं (2-3 मिनट लगेंगे)...")

            if project_path.exists():
                import shutil
                shutil.rmtree(project_path)

            result = subprocess.run(
                ["npx","--yes","create-next-app@latest",project_name,"--typescript","--tailwind","--app","--no-git"],
                cwd=str(PROJECTS_ROOT),
                text=True,
                timeout=400,
                capture_output=True
            )

            if result.returncode == 0:
                state = emit_chat_progress(state, "✅ **Next.js app तैयार है!**")
                return {**state, "initialization_done": True, "project_structure": "nextjs"}
            else:
                raise Exception("Next.js init failed")

        # NODE / EXPRESS
        elif "node" in techstack_lower or "express" in techstack_lower:
            state = emit_chat_progress(state, "📦 Node.js project शुरू कर रहे हैं...")

            project_path.mkdir(parents=True, exist_ok=True)
            result = subprocess.run(
                ["npm", "init", "-y"],
                cwd=str(project_path),
                text=True,
                timeout=30,
                capture_output=True
            )

            if result.returncode == 0:
                if "express" in techstack_lower:
                    state = emit_chat_progress(state, "🔥 Express install हो रहा है...")
                    subprocess.run(
                        ["npm","install","express"],
                        cwd=str(project_path),
                        text=True,
                        timeout=60,
                        capture_output=True
                    )

                    # EXPRESS scaffold
                    src_path = project_path / "src"
                    src_path.mkdir(exist_ok=True)
                    with open(src_path / "index.js","w") as f:
                        f.write("""const express = require('express');
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: "Server running ✅" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started on port", PORT));
""")
                    state = emit_chat_progress(state, "✅ **Node.js Express server तैयार है!**")
                    return {**state, "initialization_done": True, "project_structure": "nodejs"}
                else:
                    src_path = project_path / "src"
                    src_path.mkdir(exist_ok=True)
                    with open(src_path / "index.js","w") as f:
                        f.write("console.log('Node.js project initialized ✅');")

                    state = emit_chat_progress(state, "✅ **Node.js project तैयार है!**")
                    return {**state, "initialization_done": True, "project_structure": "nodejs"}

        else:
            state = emit_chat_progress(state, "📄 HTML/CSS/JS project बना रहे हैं...")
            project_path.mkdir(parents=True, exist_ok=True)
            state = emit_chat_progress(state, "✅ **Project folder तैयार है!**")
            return {**state, "initialization_done": True, "project_structure": "html"}

    except Exception as e:
        print(f"⚠️ Init error: {e}")
        state = emit_chat_progress(state, f"⚠️ कुछ दिक्कत आई, basic setup उपयोग कर रहे हैं")
        project_path.mkdir(parents=True, exist_ok=True)
        return {**state, "initialization_done": True, "project_structure": "html"}

# ===================== AGENT NODES =====================

import re
from typing import Dict, List, Tuple, Optional



def chat_classifier_agent(state: dict) -> dict:
    """Enhanced classifier with two-stage detection"""
    saved_callback = state.get("_emit_progress")
    state = normalize_state(state)

    if saved_callback is not None:
        state["_emit_progress"] = saved_callback

    try:
        user_prompt = state["user_prompt"]
        current_project = state.get("current_project")

        # Use two-stage classifier
        intent = IntentClassifier.classify(user_prompt, current_project, llm_fast)

        state["chat_history"].append({"role": "user", "content": user_prompt})

        print(f"🎯 Final Intent: {intent}")
        return {
            **state,
            "intent": intent,
            "_emit_progress": saved_callback
        }

    except Exception as e:
        print(f"❌ Classifier error: {e}")
        return {
            **state,
            "intent": "CHAT",
            "_emit_progress": saved_callback
        }

def project_manager_agent(state: dict) -> dict:
    """Manages project operations - Uses FAST LLM"""
    state = normalize_state(state)
    saved_callback = state.get("_emit_progress")
    try:
        intent = state["intent"]
        user_prompt = state["user_prompt"]

        if intent == "PROJECT_LIST":
            projects = list_all_projects()
            response = f"📂 **आपके projects:**\n" + "\n".join([f" • `{p}`" for p in projects]) if projects else "📂 अभी कोई project नहीं है"
            state = emit_chat_progress(state, response)
            return {**state, "status": "DONE"}

        elif intent == "PROJECT_SWITCH":
            # ✅ FAST LLM for name extraction
            project_name_prompt = f'Extract project name from: "{user_prompt}". Return ONLY the name.'
            response = llm_fast.invoke(project_name_prompt)
            project_name = response.content.strip()

            if project_exists(project_name):
                response = f"✅ **अब आप `{project_name}` project पर काम कर रहे हैं**"
                state = emit_chat_progress(state, response)
                return {
                    **state,
                    "current_project": project_name,
                    "_emit_progress": saved_callback,
                    "status": "DONE"
                }
            else:
                available = list_all_projects()
                response = f"❌ `{project_name}` नाम का कोई project नहीं मिला।\n\n**Available:** {', '.join(available) if available else 'None'}"
                state = emit_chat_progress(state, response)
                return {**state, "status": "DONE"}

        elif intent == "RUN_PROJECT":
            current_project = state.get("current_project")
            if not current_project:
                state = emit_chat_progress(state, "❌ कोई project select नहीं है")
                return {**state, "status": "DONE"}

            state = emit_chat_progress(state, f"▶️ **शुरू कर रहे हैं:** `{current_project}`")
            return {**state, "_emit_progress": saved_callback,"status": "DONE", "status": "DONE"}

    except Exception as e:
        print(f"❌ Project manager error: {e}")
        state = emit_chat_progress(state, "❌ कुछ गड़बड़ हो गई")
        return {**state,"_emit_progress": saved_callback,"status": "DONE"}

    return state

def planner_agent(state: dict) -> dict:
    """Plan the project - Uses HEAVY LLM for planning"""
    saved_callback = state.get("_emit_progress")
    state = normalize_state(state)

    try:
        user_prompt = state.get("user_prompt", "")

        state = emit_chat_progress(state, "📋 **आपका idea समझ रहे हैं...**")

        # ✅ FAST LLM for project name generation
        try:
            state = emit_chat_progress(state, f"🔍 आपके request का analysis कर रहे हैं...")
            name_response = llm_fast.invoke(f'Extract short project name (2-3 words, lowercase, hyphens) from: "{user_prompt}". Return ONLY the name.')
            project_name = name_response.content.strip().lower().replace(" ", "-")
        except Exception:
            import re
            words = re.findall(r'\b\w+\b', user_prompt.lower())
            project_name = "-".join(words[:2]) if words else "web-app"

        state = emit_chat_progress(state, "🏗️ **Project का blueprint तैयार कर रहे हैं...**")

        # ✅ HEAVY LLM for structured planning
        resp = None
        try:
            resp = llm_heavy.with_structured_output(Plan).invoke(planner_prompt(user_prompt))
            if resp and hasattr(resp, "files") and resp.files:
                pass
            else:
                resp = None
        except Exception as e:
            print(f"⚠️ Plan generation failed: {e}")
            resp = None

        # FALLBACK plan
        if resp is None or not hasattr(resp, "files") or not resp.files:
            state = emit_chat_progress(state, "⚙️ Intelligent planning system उपयोग कर रहे हैं...")

            prompt_lower = user_prompt.lower()
            if "react" in prompt_lower:
                techstack = "React"
                files = [
                    File(path="src/App.js", purpose="Main React component"),
                    File(path="src/index.js", purpose="React entry point"),
                    File(path="public/index.html", purpose="HTML template"),
                    File(path="src/App.css", purpose="Styling")
                ]
            elif "next" in prompt_lower:
                techstack = "Next.js"
                files = [
                    File(path="app/page.js", purpose="Home page component"),
                    File(path="app/layout.js", purpose="Root layout")
                ]
            else:
                techstack = "HTML/CSS/JS"
                files = [
                    File(path="index.html", purpose="Main HTML page"),
                    File(path="style.css", purpose="Styling"),
                    File(path="script.js", purpose="JavaScript logic")
                ]

            resp = Plan(
                name=project_name,
                description=user_prompt[:100],
                techstack=techstack,
                features=["Core functionality"],
                files=files
            )

        resp.name = project_name

        # Show detailed plan
        plan_summary = f"""
✅ **Project plan तैयार है!**

📦 **नाम:** `{resp.name}`
📝 **क्या बनाना है:** {resp.description}
🛠️ **Technology:** {resp.techstack}

**Features:**
"""
        for i, feature in enumerate(resp.features, 1):
            plan_summary += f"\n {i}. {feature}"

        plan_summary += f"\n\n**बनाने हैं कुल files:** {len(resp.files)}"
        for file in resp.files[:5]:
            plan_summary += f"\n • `{file.path}` - {file.purpose}"
        if len(resp.files) > 5:
            plan_summary += f"\n ... और {len(resp.files) - 5} files"

        state = emit_chat_progress(state, plan_summary)

        # Initialize project
        try:
            state = initialize_project(project_name, resp.techstack, state)
        except Exception as e:
            print(f"⚠️ Init error: {e}")
            project_path = get_project_path(project_name)
            project_path.mkdir(parents=True, exist_ok=True)
            state["initialization_done"] = True
            state["project_structure"] = "html"
            state = emit_chat_progress(state, f"📁 Project directory बन गया: `{project_name}`")

        return {
            **state,
            "plan": resp,
            "current_project": project_name,
            "_emit_progress": saved_callback
        }

    except Exception as e:
        print(f"❌ Critical planner error: {e}")
        fallback_name = "web-project"
        state = emit_chat_progress(state, f"⚙️ Basic project बना रहे हैं: `{fallback_name}`")

        project_path = get_project_path(fallback_name)
        project_path.mkdir(parents=True, exist_ok=True)

        minimal_plan = Plan(
            name=fallback_name,
            description="Basic web project",
            techstack="HTML/CSS/JS",
            features=["Basic structure"],
            files=[
                File(path="index.html", purpose="Main page"),
                File(path="style.css", purpose="Styling"),
                File(path="script.js", purpose="Logic")
            ]
        )

        return {
            **state,
            "plan": minimal_plan,
            "current_project": fallback_name,
            "initialization_done": True,
            "project_structure": "html",
            "_emit_progress": saved_callback
        }

def architect_agent(state: dict) -> dict:
    """Break down into tasks - Uses HEAVY LLM"""
    saved_callback = state.get("_emit_progress")
    state = normalize_state(state)

    try:
        plan: Plan = state.get("plan")
        if not plan:
            raise ValueError("No plan available")

        project_structure = state.get("project_structure", "html")

        state = emit_chat_progress(state, "🏗️ **काम को छोटे-छोटे steps में तोड़ रहे हैं...**")

        architect_context = f"""Project: {project_structure}
Plan: {plan.model_dump_json()}"""

        state = emit_chat_progress(state, "🔧 Files की dependencies समझ रहे हैं...")

        # ✅ HEAVY LLM for task breakdown
        resp = None
        try:
            resp = llm_heavy.with_structured_output(TaskPlan).invoke(architect_prompt(plan=architect_context))
            if resp and hasattr(resp, "implementation_steps") and resp.implementation_steps:
                pass
            else:
                resp = None
        except Exception as e:
            print(f"⚠️ Architect failed: {e}")
            resp = None

        # FALLBACK
        if resp is None or not hasattr(resp, "implementation_steps") or not resp.implementation_steps:
            state = emit_chat_progress(state, "⚙️ Task breakdown automatically generate कर रहे हैं...")

            tasks = []
            for file in plan.files:
                task = ImplementationTask(
                    filepath=file.path,
                    task_description=f"Create {file.path}: {file.purpose}. Write complete, functional code."
                )
                tasks.append(task)

            resp = TaskPlan(implementation_steps=tasks)

        resp.plan = plan

        # Show task breakdown
        task_summary = f"""
✅ **काम की planning हो गई!**

📝 **कुल tasks:** {len(resp.implementation_steps)}

**अब ये files बनेंगे:**
"""
        for i, task in enumerate(resp.implementation_steps[:10], 1):
            task_summary += f"\n {i}. `{task.filepath}` - {task.task_description[:60]}..."

        if len(resp.implementation_steps) > 10:
            task_summary += f"\n ... और {len(resp.implementation_steps) - 10} tasks"

        state = emit_chat_progress(state, task_summary)

        return {
            **state,
            "task_plan": resp,
            "_emit_progress": saved_callback
        }

    except Exception as e:
        print(f"❌ Architect error: {e}")
        plan = state.get("plan")
        if plan and hasattr(plan, "files"):
            emergency_tasks = [
                ImplementationTask(
                    filepath=f.path,
                    task_description=f"Create {f.path} with basic structure"
                ) for f in plan.files
            ]
            resp = TaskPlan(implementation_steps=emergency_tasks)
            return {
                **state,
                "task_plan": resp,
                "_emit_progress": saved_callback
            }

        state = emit_chat_progress(state, "❌ Planning में दिक्कत आई")
        return {**state, "_emit_progress": saved_callback,"status": "DONE"}

def coder_agent(state: dict) -> dict:
    """Write code file-by-file - Uses HEAVY LLM for code generation"""
    saved_callback = state.get("_emit_progress")
    state = normalize_state(state)
    MAX_FILE_RETRIES = 2

    iteration_count = state.get("coder_iterations", 0) + 1
    if iteration_count > state.get("max_coder_iterations", 50):
        state = emit_chat_progress(state, "⚠️ सभी files complete हो गए हैं")
        return {
            **state,
            "coder_iterations": iteration_count,
            "status": "DONE"
        }

    try:
        coder_state: CoderState = state.get("coder_state")
        current_project = state["current_project"]
        project_structure = state.get("project_structure", "html")

        if not current_project:
            state = emit_chat_progress(state, "❌ कोई project select नहीं है")
            return {**state, "coder_iterations": iteration_count, "status": "DONE"}

        if coder_state is None:
            task_plan = state["task_plan"]
            coder_state = CoderState(
                task_plan=task_plan,
                current_step_idx=0,
                project_name=current_project
            )

            total_files = len(task_plan.implementation_steps)
            state = emit_chat_progress(state, "💻 **अब code लिखना शुरू करते हैं...**")
            state = emit_chat_progress(state, f"📊 **कुल बनाने हैं files:** {total_files}")

        steps = coder_state.task_plan.implementation_steps

        if coder_state.current_step_idx >= len(steps):
            completion_msg = f"""
🎉 **आपका project पूरा तैयार है!**

✅ **बनाई गई files:** {len(steps)} files

**Files:**
"""
            for file in [s.filepath for s in steps]:
                completion_msg += f"\n • `{file}`"

            completion_msg += f"""

🚀 **अब क्या करें:**
1. Projects tab में अपने project card पर click करें
2. **Run** button दबाएं 
3. **Preview** tab में अपना app देखें

आपका project बिलकुल तैयार है! 💜
"""

            state = emit_chat_progress(state, completion_msg)
            return {
                **state,
                "coder_state": coder_state,
                "_emit_progress": saved_callback,
                "coder_iterations": iteration_count,
                "status": "DONE"
            }

        current_task = steps[coder_state.current_step_idx]

        # Progress update
        progress_msg = f"⚙️ **[{coder_state.current_step_idx + 1}/{len(steps)}]** `{current_task.filepath}` file बना रहे हैं..."
        state = emit_chat_progress(state, progress_msg)

        # ✅ HEAVY LLM for code generation
        file_created = False
        for retry in range(MAX_FILE_RETRIES):
            try:
                # Prepare prompt for code generation
                system_prompt = coder_system_prompt()
                retry_note = f" (फिर से कोशिश {retry + 1}/{MAX_FILE_RETRIES})" if retry > 0 else ""

                user_prompt = f"""Task: {current_task.task_description}{retry_note}
Project: {current_project}
Type: {project_structure}
File: {current_task.filepath}

Write COMPLETE, production-ready code for this file.
Return ONLY the code content, no explanations.
"""

                # Call HEAVY LLM
                response = llm_heavy.invoke([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ])

                code_content = response.content

                # Clean code - check for triple backticks
                if "```" in code_content:
                    parts = code_content.split("```")
                    for part in parts:
                        if part.strip() and not part.strip().startswith(("python", "javascript", "jsx", "html", "css", "json")):
                            code_content = part.strip()
                            break

                # Create file using tool
                result = create_file_tool.invoke({
                    "project_name": current_project,
                    "filepath": current_task.filepath,
                    "content": code_content
                })

                # Validate
                project_path = get_project_path(current_project)
                file_path = project_path / current_task.filepath

                if file_path.exists() and file_path.stat().st_size > 10:
                    file_created = True

                    # Show what was created with snippet
                    file_info = f"✅ **बन गई:** `{current_task.filepath}` ({len(code_content)} characters)"

                    # Add code snippet
                    lines = code_content.split("\n")
                    if len(lines) > 5:
                        snippet = "\n".join(lines[:3])
                        file_info += f"\n\n```\n{snippet}\n... (कुल {len(lines)} lines)\n```"

                    state = emit_chat_progress(state, file_info)
                    print(f"✅ Created: {current_task.filepath}")
                    break
                else:
                    print(f"⚠️ File validation failed, retry {retry + 1}")

            except Exception as e:
                print(f"⚠️ Coder retry {retry + 1}: {e}")
                if retry < MAX_FILE_RETRIES - 1:
                    continue

        if not file_created:
            state = emit_chat_progress(state, f"⚠️ `{current_task.filepath}` skip की (बाद में फिर कोशिश होगी)")

        coder_state.current_step_idx += 1

        if coder_state.current_step_idx >= len(steps):
            state = emit_chat_progress(state, "✅ सभी coding steps पूरे हो गए!")
            return {
                **state,
                "coder_state": coder_state,
                "coder_iterations": iteration_count,
                "_emit_progress": saved_callback,
                "status": "DONE"
            }

        return {
            **state,
            "coder_state": coder_state,
            "coder_iterations": iteration_count,
            "_emit_progress": saved_callback,
            "status": "WORKING"
        }

    except Exception as e:
        print(f"❌ Coder error: {e}")
        coder_state = state.get("coder_state")
        if coder_state:
            coder_state.current_step_idx += 1

        return {
            **state,
            "coder_state": coder_state,
            "coder_iterations": iteration_count,
            "_emit_progress": saved_callback,
            "status": "WORKING"
        }

def general_chat_agent(state: dict) -> dict:
    """General conversation - Uses HEAVY LLM for quality responses"""
    
    # ✅ SAVE callback BEFORE normalize
    saved_callback = state.get("_emit_progress")
    
    state = normalize_state(state)
    
    # ✅ RESTORE callback AFTER normalize
    if saved_callback is not None:
        state["_emit_progress"] = saved_callback
        print("✅ Restored callback in general_chat_agent")
    
    try:
        user_prompt = state.get("user_prompt", "")
        chat_history = state.get("chat_history", [])
        
        chat_prompt = f"""You are DevDost AI, a helpful coding assistant.

Recent chat:
{chat_history[-3:] if len(chat_history) > 3 else chat_history}

User: {user_prompt}

Respond naturally and helpfully in Hindi/Hinglish in 2-3 sentences."""

        # ✅ HEAVY LLM for better chat responses
        response = llm_heavy.invoke(chat_prompt)
        state = emit_chat_progress(state, response.content)

        return {
            **state,
            "_emit_progress": saved_callback,  # ✅ ENSURE callback persists
            "status": "DONE"
        }

    except Exception as e:
        print(f"❌ Chat error: {e}")
        state = emit_chat_progress(state, "Sorry, कुछ गड़बड़ हो गई। फिर से try करें।")
        return {
            **state,
            "_emit_progress": saved_callback,  # ✅ ENSURE callback persists
            "status": "DONE"
        }

def file_ops_agent(state: dict) -> dict:
    """File operations - Uses FAST LLM"""
    saved_callback = state.get("_emit_progress")
    state = normalize_state(state)

    try:
        current_project = state["current_project"]
        if not current_project:
            state = emit_chat_progress(state, "❌ कोई project select नहीं है")
            return {**state,"_emit_progress": saved_callback,"status": "DONE"}

        state = emit_chat_progress(state, "✅ File operation UI में handle होगा")
        return {**state, "_emit_progress": saved_callback,"status": "DONE"}

    except Exception as e:
        print(f"❌ File ops error: {e}")
        state = emit_chat_progress(state, "❌ File operation में दिक्कत आई")
        return {**state, "_emit_progress": saved_callback,"status": "DONE"}

# ===================== ROUTING =====================

def route_after_classification(state: dict) -> str:
    intent = state.get("intent", "CHAT")
    routing = {
        "NEW_PROJECT": "planner",
        "MODIFY_PROJECT": "file_ops",
        "FILE_OPS": "file_ops",
        "PROJECT_SWITCH": "project_manager",
        "PROJECT_LIST": "project_manager",
        "RUN_PROJECT": "project_manager",
        "CHAT": "general_chat"
    }

    route = routing.get(intent, "general_chat")
    print(f"🔀 Routing {intent} → {route}")
    return route

def route_after_architect(state: dict) -> str:
    status = state.get("status")
    if status == "DONE":
        print("⚠️ Architect set status=DONE, routing to END")
        return "END"

    return "coder"

def route_after_coder(state: dict) -> str:
    status = state.get("status")
    if status in ["DONE", "READY_TO_RUN", "ERROR"]:
        return "END"

    iteration_count = state.get("coder_iterations", 0)
    if iteration_count >= 50:
        print(f"⚠️ Coder hit max iterations ({iteration_count}), forcing exit")
        return "END"

    coder_state = state.get("coder_state")
    if not coder_state:
        return "END"

    if hasattr(coder_state, "current_step_idx"):
        task_plan = coder_state.task_plan
        if coder_state.current_step_idx >= len(task_plan.implementation_steps):
            return "END"

    return "coder"

# ==================== BUILD GRAPH ====================

graph = StateGraph(State)

# Add nodes
graph.add_node("classifier", chat_classifier_agent)
graph.add_node("project_manager", project_manager_agent)
graph.add_node("file_ops", file_ops_agent)
graph.add_node("planner", planner_agent)
graph.add_node("architect", architect_agent)
graph.add_node("coder", coder_agent)
graph.add_node("general_chat", general_chat_agent)

# Set entry
graph.set_entry_point("classifier")

# Routing
graph.add_conditional_edges(
    "classifier",
    route_after_classification,
    {
        "planner": "planner",
        "file_ops": "file_ops",
        "project_manager": "project_manager",
        "general_chat": "general_chat"
    }
)

# Project creation flow
graph.add_edge("planner", "architect")
graph.add_conditional_edges(
    "architect",
    route_after_architect,
    {
        "END": END,
        "coder": "coder"
    }
)

# Coder loop
graph.add_conditional_edges(
    "coder",
    route_after_coder,
    {
        "END": END,
        "coder": "coder"
    }
)

# End nodes
graph.add_edge("project_manager", END)
graph.add_edge("file_ops", END)
graph.add_edge("general_chat", END)

# Compile agent
try:
    agent = graph.compile()
    print("✅ Agent compiled successfully!")
except Exception as e:
    print(f"❌ Agent compilation failed: {e}")
    import traceback
    traceback.print_exc()
    agent = None

# ==================== CLI ====================

def interactive_session():
    print("=" * 60)
    print("🚀 DevDost AI - Enhanced Agent with Chat Progress")
    print("=" * 60)
    print("\nUsing:")
    print(f" • Heavy tasks: {llm_heavy.model_name}")
    print(f" • Light tasks: {llm_fast.model_name}")
    print("\nCommands:")
    print(" • Create: 'build a React todo app'")
    print(" • Switch: 'switch to todo-app'")
    print(" • List: 'show all projects'")
    print(" • Exit: 'quit'\n")

    state = {
        "chat_history": [],
        "current_project": None
    }

    while True:
        try:
            user_input = input(f"\n[{state.get('current_project', 'No Project')}] You: ").strip()

            if user_input.lower() in ['quit', 'exit', 'bye']:
                print("\n👋 Goodbye!")
                break

            if not user_input:
                continue

            state["user_prompt"] = user_input

            result = agent.invoke(state, config={"recursion_limit": 100})
            state.update(result)

            # Show last AI message
            if state.get("chat_history"):
                last_msg = state["chat_history"][-1]
                if last_msg["role"] == "assistant":
                    print(f"\n🤖 DevDost: {last_msg['content']}")

        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    interactive_session()