import subprocess
from pathlib import Path

PROJECTS_ROOT = Path("generated_projects")
PROJECTS_ROOT.mkdir(exist_ok=True)

def initialize_project(project_name, techstack, project_path: Path):

    print(f"🔧 Initializing project: {project_name}")

    try:
        # REACT
        if "react" in techstack and "next" not in techstack:
            print("⚛️ Creating React app (2-3 min)...")

            if project_path.exists():
                import shutil
                shutil.rmtree(project_path)

            result = subprocess.run(
                ["npx", "--yes", "create-react-app", project_name],
                cwd=str(PROJECTS_ROOT),
                text=True,
                timeout=400,
                shell=True
            )

            if result.returncode == 0:
                print("✅ React initialized")
                return {"initialization_done": True, "project_structure": "react"}
            else:
                raise Exception("React init failed")

        # NEXT JS
        elif "next" in techstack:
            print("⚡ Creating Next.js app (2-3 min)...")

            if project_path.exists():
                import shutil
                shutil.rmtree(project_path)

            result = subprocess.run(
                ["npx", "--yes", "create-next-app@latest", project_name, "--typescript", "--tailwind", "--app", "--no-git"],
                cwd=str(PROJECTS_ROOT),
                text=True,
                timeout=400,
                shell=True
            )

            if result.returncode == 0:
                print("✅ Next.js initialized")
                return {"initialization_done": True, "project_structure": "nextjs"}
            else:
                raise Exception("Next.js init failed")

        # NODE / EXPRESS
        elif "node" in techstack or "express" in techstack:
            print("📦 Initializing Node.js project...")

            project_path.mkdir(parents=True, exist_ok=True)

            result = subprocess.run(
                ["npm", "init", "-y"],
                cwd=str(project_path),
                text=True,
                timeout=30,
                shell=True
            )

            if result.returncode == 0:

                # express install
                if "express" in techstack:
                    print("🔥 Installing Express...")
                    subprocess.run(
                        ["npm", "install", "express"],
                        cwd=str(project_path),
                        text=True,
                        timeout=60,
                        shell=True
                    )

                    src_path = project_path / "src"
                    src_path.mkdir(exist_ok=True)

                    with open(src_path / "index.js","w") as f:
                        f.write("""
const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: "Server running ✅" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started on port", PORT));
""")

                    print("✅ Node.js Express server scaffold ready")
                    return {"initialization_done": True, "project_structure": "nodejs"}

                # only node (no express)
                else:
                    src_path = project_path / "src"
                    src_path.mkdir(exist_ok=True)

                    with open(src_path / "index.js","w") as f:
                        f.write("console.log('Basic Node.js project initialized ✅');")

                    print("✅ Node.js basic scaffold ready")
                    return {"initialization_done": True, "project_structure": "nodejs"}

        # HTML FALLBACK
        else:
            print("📄 Creating HTML project...")
            project_path.mkdir(parents=True, exist_ok=True)
            return {"initialization_done": True, "project_structure": "html"}

    except Exception as e:
        print(f"⚠️ Init error: {e}, Using basic structure instead.")
        project_path.mkdir(parents=True, exist_ok=True)
        return {"initialization_done": True, "project_structure": "html"}

    finally:
        print("all done")


# Example test run
project_path = PROJECTS_ROOT / "app"
print(initialize_project("app","app",project_path))
