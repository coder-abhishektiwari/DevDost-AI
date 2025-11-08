from typing import Optional, List, Dict
from pydantic import BaseModel, Field, ConfigDict
from typing import TypedDict, Annotated
import operator

class State(TypedDict):
    """Main state for LangGraph agent"""
    messages: Annotated[list, operator.add]
    user_prompt: str
    chat_history: list
    current_project: Optional[str]
    plan: Optional[dict]
    task_plan: Optional[dict]
    coder_state: Optional[dict]
    status: Optional[str]
    intent: Optional[str]
    initialization_done: bool
    project_structure: str
    run_attempts: int
    last_error: Optional[str]
    debug_history: list
    file_retry_count: dict
    max_retries: int

class File(BaseModel):
    """File specification"""
    path: str = Field(description="File path relative to project root")
    purpose: str = Field(description="Purpose of this file")

class Plan(BaseModel):
    """Complete project plan"""
    name: str = Field(description="Project name (lowercase, hyphens)")
    description: str = Field(description="One-line project description")
    techstack: str = Field(description="Tech stack")
    features: list[str] = Field(description="List of features", default_factory=list)
    files: list[File] = Field(description="Files to be created", default_factory=list)

class ImplementationTask(BaseModel):
    """Single implementation task"""
    filepath: str = Field(description="Path to file to be created/modified")
    task_description: str = Field(description="Detailed task instructions")

class TaskPlan(BaseModel):
    """Plan broken into implementation tasks"""
    implementation_steps: list[ImplementationTask] = Field(description="Ordered list of tasks")
    model_config = ConfigDict(extra="allow")
    
class CoderState(BaseModel):
    """State for coder agent"""
    task_plan: TaskPlan = Field(description="Task plan to implement")
    current_step_idx: int = Field(0, description="Current step index")
    current_file_content: Optional[str] = Field(None, description="Content of current file")
    project_name: Optional[str] = Field(None, description="Project being worked on")

class ChatMessage(BaseModel):
    """Chat message"""
    role: str = Field(description="Role: 'user' or 'assistant'")
    content: str = Field(description="Message content")

class ProjectInfo(BaseModel):
    """Project metadata"""
    name: str = Field(description="Project name")
    path: str = Field(description="Project path")
    file_count: int = Field(0, description="Number of files")
    created_at: Optional[str] = Field(None, description="Creation timestamp")

class DebugInfo(BaseModel):
    """Debug information"""
    error_message: str = Field(description="Error that occurred")
    diagnosis: str = Field(description="What's wrong")
    fix_type: str = Field(description="Type of fix: file_update, install_package, create_file")
    filepath: Optional[str] = Field(None, description="File to fix")
    fix_content: Optional[str] = Field(None, description="Fix content")
    explanation: str = Field(description="Why this fixes the issue")

class AgentState(BaseModel):
    """Optimized complete agent state"""
    user_prompt: str = Field(default="", description="User's input")
    chat_history: List[Dict] = Field(default_factory=list, description="Chat history")
    current_project: Optional[str] = Field(None, description="Current project name")
    plan: Optional[Plan] = Field(None, description="Project plan")
    task_plan: Optional[TaskPlan] = Field(None, description="Implementation plan")
    coder_state: Optional[CoderState] = Field(None, description="Coder state")
    status: Optional[str] = Field(None, description="Current status")
    intent: Optional[str] = Field(None, description="Classified intent")
    initialization_done: bool = Field(False, description="Project initialized")
    project_structure: str = Field("html", description="Project type")
    run_attempts: int = Field(0, description="Number of run attempts")
    last_error: Optional[str] = Field(None, description="Last error encountered")
    debug_history: List[str] = Field(default_factory=list, description="Debug history")
    file_retry_count: Dict[str, int] = Field(default_factory=dict, description="Retries per file")
    max_retries: int = Field(2, description="Max retries for operations")
    model_config = ConfigDict(extra="allow")
