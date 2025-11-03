import json
from dotenv import load_dotenv
from langchain_core.globals import set_verbose, set_debug
from langchain_groq.chat_models import ChatGroq
from langgraph.constants import END
from langgraph.graph import StateGraph
from langchain.agents import create_agent
from langchain_core.tools import Tool
from langchain_core.prompts import ChatPromptTemplate

from prompts import *
from states import *
from tools import *


def normalize_state(state: dict) -> dict:
    """Ensure all required keys exist to prevent KeyError."""
    defaults = {
        "user_prompt": "",
        "chat_history": [],
        "current_project": None,
        "plan": None,
        "task_plan": None,
        "coder_state": None,
        "status": None,
        "intent": None
    }
    for key, val in defaults.items():
        if key not in state:
            state[key] = val
    return state

def safe_invoke(agent, state):
    state = normalize_state(state)
    try:
        return agent.invoke(state)
    except Exception as e:
        print(f"❌ Agent error: {e}")
        import traceback
        traceback.print_exc()
        return state


_ = load_dotenv()

set_debug(True)
set_verbose(True)

llm = ChatGroq(model="openai/gpt-oss-120b")

# ==================== CHAT AGENT ====================
def chat_classifier_agent(state: dict) -> dict:
    """
    Classifies user intent: 
    - NEW_PROJECT: Creating new project
    - MODIFY_PROJECT: Editing existing project
    - FILE_OPS: File operations (rename, delete, create)
    - CHAT: General conversation
    - PROJECT_SWITCH: Switch to different project
    """
    try:
        user_prompt = state["user_prompt"]
        chat_history = state.get("chat_history", [])
        current_project = state.get("current_project")
        
        classifier_prompt = f"""
You are an AI assistant that classifies user requests. Analyze the user's message and determine the intent.

Current project: {current_project or "None"}
User message: {user_prompt}

Classify as ONE of:
1. NEW_PROJECT - User wants to create a new project/application
2. MODIFY_PROJECT - User wants to modify existing project code
3. FILE_OPS - User wants file operations (create, delete, rename, move files)
4. PROJECT_SWITCH - User wants to switch to a different project
5. PROJECT_LIST - User wants to see all projects
6. CHAT - General conversation, questions, or unclear intent

Return ONLY the classification word.
"""
        
        response = llm.invoke(classifier_prompt)
        intent = response.content.strip().upper()
        
        # Validate intent
        valid_intents = ["NEW_PROJECT", "MODIFY_PROJECT", "FILE_OPS", "PROJECT_SWITCH", "PROJECT_LIST", "CHAT"]
        if intent not in valid_intents:
            print(f"⚠️ Invalid intent '{intent}', defaulting to CHAT")
            intent = "CHAT"
        
        # Add to chat history
        chat_history.append({"role": "user", "content": user_prompt})
        
        print(f"🎯 Classified intent: {intent}")
        
        return {
            "intent": intent,
            "chat_history": chat_history,
            "user_prompt": user_prompt,
            "current_project": current_project
        }
    except Exception as e:
        print(f"❌ Classifier error: {e}")
        return {
            "intent": "CHAT",
            "chat_history": state.get("chat_history", []),
            "user_prompt": state.get("user_prompt", ""),
            "current_project": state.get("current_project")
        }


# ==================== PROJECT MANAGER ====================
def project_manager_agent(state: dict) -> dict:
    """Manages project creation, listing, and switching"""
    try:
        intent = state["intent"]
        user_prompt = state["user_prompt"]
        
        if intent == "PROJECT_LIST":
            projects = list_all_projects()
            response = f"📂 Available projects:\n" + "\n".join([f"  • {p}" for p in projects]) if projects else "📂 No projects yet. Create one by saying 'build a todo app'!"
            state["chat_history"].append({"role": "assistant", "content": response})
            return {**state, "status": "DONE", "chat_history": state["chat_history"]}
        
        elif intent == "PROJECT_SWITCH":
            # Extract project name from user prompt
            project_name_prompt = f"""
User wants to switch project. Extract the project name from: "{user_prompt}"
Return ONLY the project name, nothing else.
"""
            response = llm.invoke(project_name_prompt)
            project_name = response.content.strip()
            
            if project_exists(project_name):
                set_current_project(project_name)
                response = f"✅ Switched to project: {project_name}"
                state["chat_history"].append({"role": "assistant", "content": response})
                return {
                    **state,
                    "current_project": project_name,
                    "status": "DONE",
                    "chat_history": state["chat_history"]
                }
            else:
                available = list_all_projects()
                response = f"❌ Project '{project_name}' not found. Available: {', '.join(available) if available else 'None'}"
                state["chat_history"].append({"role": "assistant", "content": response})
                return {**state, "status": "DONE", "chat_history": state["chat_history"]}
    except Exception as e:
        print(f"❌ Project manager error: {e}")
        error_msg = f"❌ Error managing project: {str(e)}"
        state["chat_history"].append({"role": "assistant", "content": error_msg})
        return {**state, "status": "DONE"}
    
    return state


# ==================== FILE OPERATIONS AGENT ====================
def file_ops_agent(state: dict) -> dict:
    """Handles file operations via natural language"""
    try:
        user_prompt = state["user_prompt"]
        current_project = state["current_project"]
        
        if not current_project:
            response = "❌ No project selected. Please create or switch to a project first."
            state["chat_history"].append({"role": "assistant", "content": response})
            return {**state, "status": "DONE", "chat_history": state["chat_history"]}
        
        file_ops_prompt = f"""
You are a file operations assistant. The user wants to perform file operations.

Current project: {current_project}
User request: {user_prompt}

You have access to these tools:
- create_file(project_name, filepath, content)
- delete_file(project_name, filepath)
- rename_file(project_name, old_path, new_path)
- read_file(project_name, filepath)
- list_project_files(project_name)

Understand the user's intent and perform the appropriate operation.
Then respond with what you did.
"""
        
        file_tools = [
            create_file_tool,
            delete_file_tool,
            rename_file_tool,
            read_file_tool,
            list_project_files_tool
        ]
        
        agent = create_agent(model=llm, tools=file_tools)
        result = agent.invoke({
            "messages": [
                {"role": "system", "content": file_ops_prompt},
                {"role": "user", "content": user_prompt}
            ]
        })
        
        # Extract response safely
        response = "✅ File operation completed"
        if result and "messages" in result and len(result["messages"]) > 0:
            last_message = result["messages"][-1]
            if hasattr(last_message, 'content'):
                response = last_message.content
            elif isinstance(last_message, dict) and 'content' in last_message:
                response = last_message['content']
        
        state["chat_history"].append({"role": "assistant", "content": response})
        
        return {**state, "status": "DONE", "chat_history": state["chat_history"]}
    except Exception as e:
        print(f"❌ File ops error: {e}")
        error_msg = f"❌ File operation failed: {str(e)}"
        state["chat_history"].append({"role": "assistant", "content": error_msg})
        return {**state, "status": "DONE"}


# ==================== PLANNER AGENT ====================
def planner_agent(state: dict) -> dict:
    try:
        user_prompt = state.get("user_prompt", "")

        # Step 1: Generate project name
        name_prompt = f"""
Extract a short project name (2–4 words, lowercase, no spaces, use hyphens) from this request:
"{user_prompt}"

Examples:
- "create a todo app" → "todo-app"
- "build me a portfolio website" → "portfolio-website"

Return ONLY the project name.
"""
        name_response = llm.invoke(name_prompt)
        project_name = name_response.content.strip().lower().replace(" ", "-")

        # Step 2: Create project directory
        create_project(project_name)

        # Step 3: Try structured plan
        try:
            resp = llm.with_structured_output(Plan).invoke(planner_prompt(user_prompt))
        except Exception as e:
            print(f"⚠️ Structured output failed: {e}, using fallback")
            resp = None

        # Step 4: Fallback – AI auto-decides tech & files
        if resp is None or not hasattr(resp, "files") or not resp.files:
            fallback_prompt = f"""
User said: "{user_prompt}"

Generate a complete project plan in JSON format:
{{
  "name": "{project_name}",
  "description": "<short summary>",
  "techstack": "Auto-select (e.g., React, Flask, HTML/CSS/JS)",
  "features": ["feature1", "feature2"],
  "files": [
    {{"path": "index.html", "purpose": "Main page structure"}},
    {{"path": "style.css", "purpose": "Styling"}},
    {{"path": "script.js", "purpose": "Frontend logic"}}
  ]
}}
Return only valid JSON, nothing else.
"""
            try:
                response = llm.invoke(fallback_prompt)
                resp_json = json.loads(response.content)

                # Normalize (in case model gives wrong structure)
                if isinstance(resp_json.get("techstack"), list):
                    resp_json["techstack"] = ", ".join(resp_json["techstack"])
                for f in resp_json.get("files", []):
                    if "path" not in f and "name" in f:
                        f["path"] = f.pop("name")

                resp = Plan(**resp_json)
            except json.JSONDecodeError as je:
                print(f"❌ JSON parsing failed: {je}")
                # Create minimal fallback plan
                resp = Plan(
                    name=project_name,
                    description="A web application",
                    techstack="HTML/CSS/JS",
                    features=["Basic structure"],
                    files=[
                        File(path="index.html", purpose="Main page"),
                        File(path="style.css", purpose="Styling"),
                        File(path="script.js", purpose="Logic")
                    ]
                )

        # Step 5: Attach project name
        resp.name = project_name

        # Step 6: Prepare response
        response_text = (
            f"📋 Planning project: **{project_name}**\n\n"
            f"Description: {resp.description}\n"
            f"Tech Stack: {resp.techstack}\n"
            f"Features: {', '.join(resp.features)}"
        )

        state["chat_history"].append({"role": "assistant", "content": response_text})

        return {
            **state,
            "plan": resp,
            "current_project": project_name,
            "chat_history": state["chat_history"]
        }
    except Exception as e:
        print(f"❌ Planner error: {e}")
        import traceback
        traceback.print_exc()
        error_msg = f"❌ Planning failed: {str(e)}"
        state["chat_history"].append({"role": "assistant", "content": error_msg})
        return {**state, "status": "DONE"}


# ==================== ARCHITECT AGENT ====================
def architect_agent(state: dict) -> dict:
    try:
        plan: Plan = state["plan"]
        
        resp = llm.with_structured_output(TaskPlan).invoke(
            architect_prompt(plan=plan.model_dump_json())
        )
        
        if resp is None or not hasattr(resp, "implementation_steps") or not resp.implementation_steps:
            raise ValueError("Architecture did not return valid implementation steps")
        
        resp.plan = plan
        
        response = f"🗂️ Architecture complete!\n" \
                   f"Implementation steps: {len(resp.implementation_steps)} tasks"
        
        state["chat_history"].append({"role": "assistant", "content": response})
        
        return {
            **state,
            "task_plan": resp,
            "chat_history": state["chat_history"]
        }
    except Exception as e:
        print(f"❌ Architect error: {e}")
        import traceback
        traceback.print_exc()
        error_msg = f"❌ Architecture failed: {str(e)}"
        state["chat_history"].append({"role": "assistant", "content": error_msg})
        return {**state, "status": "DONE"}


# ==================== CODER AGENT ====================
def coder_agent(state: dict) -> dict:
    """Enhanced coder with project context"""
    try:
        coder_state: CoderState = state.get("coder_state")
        current_project = state["current_project"]
        
        if not current_project:
            error_msg = "❌ No project selected for coding"
            state["chat_history"].append({"role": "assistant", "content": error_msg})
            return {**state, "status": "DONE"}
        
        if coder_state is None:
            coder_state = CoderState(
                task_plan=state["task_plan"],
                current_step_idx=0,
                project_name=current_project
            )

        steps = coder_state.task_plan.implementation_steps
        if coder_state.current_step_idx >= len(steps):
            response = f"✅ Project **{current_project}** completed!\n" \
                       f"Files created: {len(steps)}"
            state["chat_history"].append({"role": "assistant", "content": response})
            return {
                **state,
                "coder_state": coder_state,
                "status": "DONE",
                "chat_history": state["chat_history"]
            }

        current_task = steps[coder_state.current_step_idx]
        
        # Read existing content using project-aware tool
        try:
            existing_content = read_file_tool.run({
                "project_name": current_project,
                "filepath": current_task.filepath
            })
        except Exception as e:
            print(f"⚠️ Could not read existing file: {e}")
            existing_content = ""

        system_prompt = coder_system_prompt()
        user_prompt = (
            f"Task: {current_task.task_description}\n"
            f"Project: {current_project}\n"
            f"File: {current_task.filepath}\n"
            f"Existing content:\n{existing_content}\n"
            f"Use create_file_tool(project_name='{current_project}', filepath=..., content=...) to save."
        )

        coder_tools = [
            create_file_tool,
            read_file_tool,
            list_project_files_tool
        ]
        
        agent = create_agent(model=llm, tools=coder_tools)
        
        try:
            agent.invoke({
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            })
        except Exception as agent_error:
            print(f"⚠️ Agent invocation warning: {agent_error}")
            # Continue anyway, file might have been created
        
        # Status update
        progress = f"⚙️ Implementing: {current_task.filepath} ({coder_state.current_step_idx + 1}/{len(steps)})"
        state["chat_history"].append({"role": "assistant", "content": progress})

        coder_state.current_step_idx += 1
        
        return {
            **state,
            "coder_state": coder_state,
            "chat_history": state["chat_history"]
        }
    except Exception as e:
        print(f"❌ Coder error: {e}")
        import traceback
        traceback.print_exc()
        error_msg = f"❌ Coding failed: {str(e)}"
        state["chat_history"].append({"role": "assistant", "content": error_msg})
        return {**state, "status": "DONE"}


# ==================== CHAT AGENT ====================
def general_chat_agent(state: dict) -> dict:
    """Handles general conversation"""
    try:
        user_prompt = state.get("user_prompt", "")
        chat_history = state.get("chat_history", [])
        
        chat_prompt = f"""
You are DevDost AI, a helpful coding assistant. 
You can help users create projects, modify code, manage files, and answer questions.

Chat history:
{chat_history[-5:] if len(chat_history) > 5 else chat_history}

User: {user_prompt}

Respond naturally and helpfully.
"""
        
        response = llm.invoke(chat_prompt)
        chat_history.append({"role": "assistant", "content": response.content})
        
        return {
            **state,
            "status": "DONE",
            "chat_history": chat_history
        }
    except Exception as e:
        print(f"❌ Chat error: {e}")
        error_msg = "Sorry, I encountered an error. Please try again."
        state["chat_history"].append({"role": "assistant", "content": error_msg})
        return {**state, "status": "DONE"}


# ==================== MODIFY PROJECT AGENT ====================
def modify_project_agent(state: dict) -> dict:
    """Handles modifications to existing projects"""
    try:
        user_prompt = state["user_prompt"]
        current_project = state.get("current_project")
        
        if not current_project:
            response = "❌ No project selected. Please switch to a project first."
            state["chat_history"].append({"role": "assistant", "content": response})
            return {**state, "status": "DONE", "chat_history": state["chat_history"]}
        
        # List current files
        try:
            files = list_project_files_tool.run({"project_name": current_project})
        except Exception as e:
            print(f"⚠️ Could not list files: {e}")
            files = "No files found"
        
        modification_prompt = f"""
User wants to modify project: {current_project}
Request: {user_prompt}

Current files:
{files}

Create a modification plan with implementation steps.
Each step should specify:
- filepath: the file to modify
- task_description: what changes to make

Return a structured plan.
"""
        
        # Create modification task plan
        try:
            resp = llm.with_structured_output(TaskPlan).invoke(modification_prompt)
            
            if resp is None or not hasattr(resp, "implementation_steps"):
                raise ValueError("Failed to create modification plan")
            
            state["task_plan"] = resp
            state["coder_state"] = None  # Reset coder state
            
            response = f"🔧 Modification plan ready: {len(resp.implementation_steps)} tasks"
            state["chat_history"].append({"role": "assistant", "content": response})
            
            return state
        except Exception as e:
            print(f"❌ Modification planning error: {e}")
            error_msg = f"❌ Could not create modification plan: {str(e)}"
            state["chat_history"].append({"role": "assistant", "content": error_msg})
            return {**state, "status": "DONE"}
    except Exception as e:
        print(f"❌ Modify project error: {e}")
        error_msg = f"❌ Modification failed: {str(e)}"
        state["chat_history"].append({"role": "assistant", "content": error_msg})
        return {**state, "status": "DONE"}


# ==================== GRAPH ROUTING ====================
def route_after_classification(state: dict) -> str:
    """Routes to appropriate agent based on intent"""
    intent = state.get("intent", "CHAT")
    
    routing = {
        "NEW_PROJECT": "planner",
        "MODIFY_PROJECT": "modify_project",
        "FILE_OPS": "file_ops",
        "PROJECT_SWITCH": "project_manager",
        "PROJECT_LIST": "project_manager",
        "CHAT": "general_chat"
    }
    
    route = routing.get(intent, "general_chat")
    print(f"🔀 Routing {intent} → {route}")
    return route


def route_after_coder(state: dict) -> str:
    """Routes after coder agent"""
    status = state.get("status")
    
    if status == "DONE":
        print("✅ Coder finished - ending workflow")
        return "END"
    
    # Check if coder has more steps
    coder_state = state.get("coder_state")
    if coder_state and hasattr(coder_state, "current_step_idx"):
        task_plan = coder_state.task_plan
        if coder_state.current_step_idx >= len(task_plan.implementation_steps):
            print("✅ All steps completed - ending workflow")
            return "END"
    
    print("🔄 Continuing to next coder step")
    return "coder"


# ==================== BUILD GRAPH ====================
graph = StateGraph(dict)

# Add nodes
graph.add_node("classifier", chat_classifier_agent)
graph.add_node("project_manager", project_manager_agent)
graph.add_node("file_ops", file_ops_agent)
graph.add_node("planner", planner_agent)
graph.add_node("architect", architect_agent)
graph.add_node("coder", coder_agent)
graph.add_node("general_chat", general_chat_agent)
graph.add_node("modify_project", modify_project_agent)

# Set entry point
graph.set_entry_point("classifier")

# Add conditional edges from classifier
graph.add_conditional_edges(
    "classifier",
    route_after_classification,
    {
        "planner": "planner",
        "modify_project": "modify_project",
        "file_ops": "file_ops",
        "project_manager": "project_manager",
        "general_chat": "general_chat"
    }
)

# Project creation flow
graph.add_edge("planner", "architect")
graph.add_edge("architect", "coder")

# Modification flow
graph.add_edge("modify_project", "coder")

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

agent = graph.compile()


# ==================== CLI INTERFACE ====================
def interactive_session():
    """Interactive chat session"""
    print("=" * 60)
    print("🚀 DevDost AI - Your Coding Assistant")
    print("=" * 60)
    print("\nCommands:")
    print("  • Create project: 'build me a todo app'")
    print("  • Modify code: 'add dark mode to my app'")
    print("  • File ops: 'delete index.html'")
    print("  • Switch project: 'switch to todo-app'")
    print("  • List projects: 'show all projects'")
    print("  • Chat: Just ask anything!")
    print("  • Exit: 'quit' or 'exit'\n")
    
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
            
            # Run agent
            result = safe_invoke(agent, state)
            
            # Update state
            state.update(result)
            
            # Print last assistant message
            if state.get("chat_history"):
                last_msg = state["chat_history"][-1]
                if last_msg["role"] == "assistant":
                    print(f"\n🤖 DevDost: {last_msg['content']}")
        
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    interactive_session()