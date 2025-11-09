```javascript
/* script.js - Handles file selection, display updates, and clearing the selection */

"use strict";

(() => {
    // Cache DOM elements
    const fileInput = document.querySelector("#file-input");
    const fileListDisplay = document.querySelector("#file-list");
    const clearButton = document.querySelector("#clear-selection");

    if (!fileInput || !fileListDisplay || !clearButton) {
        console.error("Required elements (#file-input, #file-list, #clear-selection) not found in DOM.");
        return;
    }

    /**
     * Formats a File object into a human‑readable string.
     * @param {File} file
     * @returns {string}
     */
    const formatFileInfo = (file) => {
        const sizeKB = (file.size / 1024).toFixed(2);
        return `${file.name} (${sizeKB} KB, ${file.type || "unknown type"})`;
    };

    /**
     * Updates the file list display based on the current selection.
     */
    const updateFileList = () => {
        const files = fileInput.files;
        fileListDisplay.innerHTML = ""; // clear previous content

        if (!files || files.length === 0) {
            const emptyMsg = document.createElement("p");
            emptyMsg.textContent = "No file selected.";
            emptyMsg.className = "no-file";
            fileListDisplay.appendChild(emptyMsg);
            return;
        }

        const ul = document.createElement("ul");
        ul.className = "selected-files";

        Array.from(files).forEach((file) => {
            const li = document.createElement("li");
            li.textContent = formatFileInfo(file);
            ul.appendChild(li);
        });

        fileListDisplay.appendChild(ul);
    };

    /**
     * Clears the file input and resets the display.
     */
    const clearSelection = () => {
        // Reset the input value; works across browsers
        fileInput.value = "";
        updateFileList();
    };

    // Event listeners
    fileInput.addEventListener("change", updateFileList);
    clearButton.addEventListener("click", (e) => {
        e.preventDefault();
        clearSelection();
    });

    // Initialize display on page load
    document.addEventListener("DOMContentLoaded", updateFileList);
})();
```