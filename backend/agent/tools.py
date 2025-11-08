import pathlib
import subprocess
import shutil
from typing import Tuple, List
from langchain_core.tools import tool

# Base directory for all projects
PROJECTS_ROOT = pathlib.Path.cwd() / "generated_projects"
PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)


# ==================== PROJECT MANAGEMENT ====================
def get_project_path(project_name: str) -> pathlib.Path:
    """Get the path for a specific project"""
    return PROJECTS_ROOT / project_name


def create_project(project_name: str) -> str:
    """Create a new project directory"""
    project_path = get_project_path(project_name)
    project_path.mkdir(parents=True, exist_ok=True)
    return str(project_path)


def project_exists(project_name: str) -> bool:
    """Check if a project exists"""
    return get_project_path(project_name).exists()


def list_all_projects() -> List[str]:
    """List all available projects"""
    return [p.name for p in PROJECTS_ROOT.iterdir() if p.is_dir()]


def set_current_project(project_name: str):
    """Set the current working project (for session context)"""
    # This would be stored in session state in the graph
    pass


def safe_path_for_project(project_name: str, path: str) -> pathlib.Path:
    """Get a safe path within a specific project"""
    project_root = get_project_path(project_name)
    p = (project_root / path).resolve()
    
    if project_root not in p.parents and project_root != p.parent and project_root != p:
        raise ValueError(f"Attempt to access outside project {project_name}")
    
    return p


# ==================== FILE OPERATIONS (Project-Aware) ====================

@tool
def create_file_tool(project_name: str, filepath: str, content: str = "") -> str:
    """Creates a file in the specified project with the given content.
    
    Args:
        project_name: Name of the project
        filepath: Path to the file relative to project root
        content: Content to write to the file
    """
    p = safe_path_for_project(project_name, filepath)
    p.parent.mkdir(parents=True, exist_ok=True)
    
    with open(p, "w", encoding="utf-8") as f:
        f.write(content)
    
    return f"âœ… Created: {project_name}/{filepath}"


@tool
def read_file_tool(project_name: str, filepath: str) -> str:
    """Reads content from a file in the specified project.
    
    Args:
        project_name: Name of the project
        filepath: Path to the file relative to project root
    """
    p = safe_path_for_project(project_name, filepath)
    
    if not p.exists():
        return ""
    
    with open(p, "r", encoding="utf-8") as f:
        return f.read()


@tool
def delete_file_tool(project_name: str, filepath: str) -> str:
    """Deletes a file from the specified project.
    
    Args:
        project_name: Name of the project
        filepath: Path to the file relative to project root
    """
    p = safe_path_for_project(project_name, filepath)
    
    if not p.exists():
        return f"âŒ File not found: {filepath}"
    
    if p.is_file():
        p.unlink()
        return f"ðŸ—‘ï¸ Deleted: {project_name}/{filepath}"
    elif p.is_dir():
        shutil.rmtree(p)
        return f"ðŸ—‘ï¸ Deleted directory: {project_name}/{filepath}"


@tool
def rename_file_tool(project_name: str, old_path: str, new_path: str) -> str:
    """Renames a file in the specified project.
    
    Args:
        project_name: Name of the project
        old_path: Current path of the file
        new_path: New path for the file
    """
    old_p = safe_path_for_project(project_name, old_path)
    new_p = safe_path_for_project(project_name, new_path)
    
    if not old_p.exists():
        return f"âŒ File not found: {old_path}"
    
    new_p.parent.mkdir(parents=True, exist_ok=True)
    old_p.rename(new_p)
    
    return f"âœï¸ Renamed: {old_path} â†’ {new_path}"


@tool
def list_project_files_tool(project_name: str, directory: str = ".") -> str:
    """Lists all files in the specified project directory.
    
    Args:
        project_name: Name of the project
        directory: Directory to list (relative to project root)
    """
    p = safe_path_for_project(project_name, directory)
    
    if not p.is_dir():
        return f"âŒ Not a directory: {directory}"
    
    files = []
    for item in p.rglob("*"):
        if item.is_file():
            rel_path = item.relative_to(get_project_path(project_name))
            files.append(str(rel_path))
    
    if not files:
        return "ðŸ“ No files found"
    
    return "\n".join(sorted(files))


@tool
def move_file_tool(project_name: str, source: str, destination: str) -> str:
    """Moves a file within the project.
    
    Args:
        project_name: Name of the project
        source: Source file path
        destination: Destination file path
    """
    src_p = safe_path_for_project(project_name, source)
    dst_p = safe_path_for_project(project_name, destination)
    
    if not src_p.exists():
        return f"âŒ File not found: {source}"
    
    dst_p.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src_p), str(dst_p))
    
    return f"ðŸ“¦ Moved: {source} â†’ {destination}"


@tool
def copy_file_tool(project_name: str, source: str, destination: str) -> str:
    """Copies a file within the project.
    
    Args:
        project_name: Name of the project
        source: Source file path
        destination: Destination file path
    """
    src_p = safe_path_for_project(project_name, source)
    dst_p = safe_path_for_project(project_name, destination)
    
    if not src_p.exists():
        return f"âŒ File not found: {source}"
    
    dst_p.parent.mkdir(parents=True, exist_ok=True)
    
    if src_p.is_file():
        shutil.copy2(str(src_p), str(dst_p))
    else:
        shutil.copytree(str(src_p), str(dst_p))
    
    return f"ðŸ“‹ Copied: {source} â†’ {destination}"


# ==================== PROJECT-LEVEL OPERATIONS ====================

@tool
def delete_project_tool(project_name: str) -> str:
    """Deletes an entire project.
    
    Args:
        project_name: Name of the project to delete
    """
    project_path = get_project_path(project_name)
    
    if not project_path.exists():
        return f"âŒ Project not found: {project_name}"
    
    shutil.rmtree(project_path)
    return f"ðŸ—‘ï¸ Deleted project: {project_name}"


@tool
def list_projects_tool() -> str:
    """Lists all available projects."""
    projects = list_all_projects()
    
    if not projects:
        return "ðŸ“ No projects found"
    
    return "ðŸ“ Available projects:\n" + "\n".join([f"  â€¢ {p}" for p in projects])


@tool
def get_project_info_tool(project_name: str) -> str:
    """Gets information about a specific project.
    
    Args:
        project_name: Name of the project
    """
    if not project_exists(project_name):
        return f"âŒ Project not found: {project_name}"
    
    project_path = get_project_path(project_name)
    files = list(project_path.rglob("*"))
    file_count = len([f for f in files if f.is_file()])
    dir_count = len([f for f in files if f.is_dir()])
    
    info = f"""
ðŸ“¦ Project: {project_name}
ðŸ“‚ Path: {project_path}
ðŸ“„ Files: {file_count}
ðŸ“ Directories: {dir_count}
"""
    return info.strip()


# ==================== COMMAND EXECUTION ====================

@tool
def run_cmd_tool(project_name: str, cmd: str, timeout: int = 30) -> str:
    """Runs a shell command in the project directory.
    
    Args:
        project_name: Name of the project
        cmd: Command to execute
        timeout: Timeout in seconds
    """
    project_path = get_project_path(project_name)
    
    if not project_path.exists():
        return f"âŒ Project not found: {project_name}"
    
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=str(project_path),
            capture_output=True,
            text=True,
            timeout=timeout
        )
        
        output = f"Exit code: {result.returncode}\n"
        if result.stdout:
            output += f"\nOutput:\n{result.stdout}"
        if result.stderr:
            output += f"\nErrors:\n{result.stderr}"
        
        return output
    except subprocess.TimeoutExpired:
        return f"âŒ Command timed out after {timeout}s"
    except Exception as e:
        return f"âŒ Error: {str(e)}"


# ==================== BACKWARD COMPATIBILITY ====================
# Old tools for existing code

@tool
def write_file(path: str, content: str) -> str:
    """Legacy write_file - uses default project"""
    # This would use the current project from state
    return create_file_tool.run({"project_name": "default", "filepath": path, "content": content})


@tool
def read_file(path: str) -> str:
    """Legacy read_file - uses default project"""
    return read_file_tool.run({"project_name": "default", "filepath": path})


@tool
def get_current_directory() -> str:
    """Returns the projects root directory."""
    return str(PROJECTS_ROOT)


@tool
def list_files(directory: str = ".") -> str:
    """Legacy list_files - uses default project"""
    return list_project_files_tool.run({"project_name": "default", "directory": directory})


def init_project_root():
    """Initialize the projects root directory"""
    PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)
    return str(PROJECTS_ROOT)