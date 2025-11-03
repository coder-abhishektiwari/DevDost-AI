# simple_agent.py - Use this if you don't have the full agent setup

import os
from pathlib import Path

class SimpleAgent:
    """Simple mock agent for testing"""
    
    def invoke(self, state):
        """Process user input and generate simple responses"""
        user_prompt = state.get("user_prompt", "")
        current_project = state.get("current_project")
        chat_history = state.get("chat_history", [])
        
        prompt_lower = user_prompt.lower()
        
        # Add user message to history
        chat_history.append({"role": "user", "content": user_prompt})
        
        # Detect intent and respond
        if any(word in prompt_lower for word in ['create', 'build', 'make', 'generate']):
            # Extract project name
            project_name = self.extract_project_name(user_prompt)
            
            # Create project
            self.create_simple_project(project_name)
            
            response = f"✅ Created project: {project_name}\n\nI've created a simple HTML project for you. Click on the files to view and edit them!"
            
            chat_history.append({"role": "assistant", "content": response})
            
            return {
                "current_project": project_name,
                "chat_history": chat_history,
                "status": "DONE"
            }
        
        elif 'hello' in prompt_lower or 'hi' in prompt_lower:
            response = "👋 Hello! I'm DevDost AI. I can help you create web projects. Try asking me to 'create a landing page'!"
            chat_history.append({"role": "assistant", "content": response})
            
            return {
                "current_project": current_project,
                "chat_history": chat_history,
                "status": "DONE"
            }
        
        else:
            response = "I can help you create projects! Try:\n• 'create a todo app'\n• 'build a landing page'\n• 'make a portfolio website'"
            chat_history.append({"role": "assistant", "content": response})
            
            return {
                "current_project": current_project,
                "chat_history": chat_history,
                "status": "DONE"
            }
    
    def extract_project_name(self, prompt):
        """Extract project name from prompt"""
        # Simple extraction
        if 'todo' in prompt.lower():
            return 'todo-app'
        elif 'portfolio' in prompt.lower():
            return 'portfolio-website'
        elif 'landing' in prompt.lower():
            return 'landing-page'
        elif 'calculator' in prompt.lower():
            return 'calculator'
        else:
            return 'my-project'
    
    def create_simple_project(self, project_name):
        """Create a simple HTML/CSS/JS project"""
        from tools import get_project_path
        
        project_path = get_project_path(project_name)
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create index.html
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{project_name.replace('-', ' ').title()}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to {project_name.replace('-', ' ').title()}! 🚀</h1>
        <p>This is a starter template. Edit the files to customize your project.</p>
        <button id="myButton">Click Me!</button>
        <div id="output"></div>
    </div>
    <script src="script.js"></script>
</body>
</html>"""
        
        # Create style.css
        css_content = """* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

.container {
    background: white;
    padding: 3rem;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    text-align: center;
    max-width: 600px;
}

h1 {
    color: #667eea;
    margin-bottom: 1rem;
    font-size: 2.5rem;
}

p {
    color: #666;
    margin-bottom: 2rem;
    font-size: 1.1rem;
}

button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    border-radius: 50px;
    cursor: pointer;
    transition: transform 0.2s;
}

button:hover {
    transform: scale(1.05);
}

#output {
    margin-top: 2rem;
    font-size: 1.2rem;
    color: #667eea;
    font-weight: bold;
}"""
        
        # Create script.js
        js_content = """document.getElementById('myButton').addEventListener('click', function() {
    const output = document.getElementById('output');
    output.textContent = '🎉 Button clicked! You can edit this behavior in script.js';
    
    // Add some animation
    output.style.animation = 'fadeIn 0.5s';
});

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);

console.log('🚀 Project loaded successfully!');"""
        
        # Write files
        (project_path / "index.html").write_text(html_content, encoding='utf-8')
        (project_path / "style.css").write_text(css_content, encoding='utf-8')
        (project_path / "script.js").write_text(js_content, encoding='utf-8')
        
        print(f"✅ Created simple project: {project_name}")


# Create agent instance
agent = SimpleAgent()