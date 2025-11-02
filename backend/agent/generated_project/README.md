# list_files.bat

## Overview
`list_files.bat` is a small Windows batch utility that recursively lists **all files** in a given directory (or the current working directory by default).  The output can be printed to the console or redirected to a file.  The script also provides built‑in help, basic validation, and sensible error handling.

---

## Prerequisites
- Windows operating system (the script runs in **CMD**).  No additional software or runtime is required.

---

## Installation
1. Download `list_files.bat` from this repository.
2. Copy the file to any folder that is included in your system **PATH** (e.g. `C:\Windows\System32` or a custom folder you add to PATH).
3. Open a new Command Prompt window so that the updated PATH is recognised.

You can now invoke the utility from any location by simply typing `list_files`.

---

## Usage
```
list_files.bat [options]
```
### Options
| Switch | Argument | Description |
|--------|----------|-------------|
| `-d`   | `<folder>` | Sets the **target directory** to list.  If omitted, the current directory (`%CD%`) is used. |
| `-o`   | `<file>`   | Writes the file list to **OUTPUT_FILE**.  If omitted, the list is printed to the console. |
| `-h`   | –          | Shows the help screen. |
| `--help`| –        | Alias for `-h`. |

### Examples
1. **Default listing (current directory)**
   ```
   list_files
   ```
   Recursively prints every file under the folder you are currently in.

2. **List a specific folder**
   ```
   list_files -d "C:\Projects\MyApp"
   ```
   Lists all files under `C:\Projects\MyApp`.

3. **Write the list to a file**
   ```
   list_files -o "C:\temp\files.txt"
   ```
   The script creates the output directory if necessary and stores the full paths in `files.txt`.

4. **Combine folder and output file**
   ```
   list_files -d "C:\Projects\MyApp" -o "C:\temp\myapp-files.txt"
   ```
   Lists the contents of the specified folder and saves them to the given file.

5. **Display help**
   ```
   list_files -h
   ```
   or
   ```
   list_files --help
   ```
   Shows usage information.

---

## Features
- **Recursive file enumeration** using `dir /s /b`.
- **Custom target directory** via the `TARGET_DIR` variable (`-d` option).
- **Optional output redirection** to a file (`OUTPUT_FILE`, `-o` option).
- **Automatic creation** of the output directory when it does not exist.
- **Help screen** (`-h` / `--help`).
- **Robust validation** of arguments and paths.
- **Clear error messages** and consistent exit codes.

---

## Error Handling
The script exits with **code 1** on any error and prints a descriptive message to **stderr**.  The following situations are handled:

| Condition | Message | Exit Code |
|-----------|---------|-----------|
| `-d` supplied without a folder argument | `Error: -d requires a folder argument.` | 1 |
| `-o` supplied without a file argument | `Error: -o requires a file argument.` | 1 |
| Unknown option | `Unknown option: <option>` (followed by the help screen) | 1 |
| Target directory does not exist | `Error: Invalid folder path` | 1 |
| Output directory cannot be created | `Error: Cannot create output directory "<dir>"` | 1 |
| `dir` command fails (e.g., permission issues) | `Error: Failed to list files.` | 1 |
| Help requested (`-h`/`--help`) | Displays usage information (returns **code 1** as per the script) | 1 |

On successful execution the script returns **code 0**.

---

## License
This utility is released under the **MIT License**.  See the `LICENSE` file for full terms.
