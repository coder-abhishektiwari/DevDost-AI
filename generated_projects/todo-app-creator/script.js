
// Get the input field and todo list elements
const inputField = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');

// Initialize an empty array to store todo items
let todoItems = [];

// Function to add a new todo item
function addTodo() {
    const todoText = inputField.value.trim();
    if (todoText) {
        const newTodo = {
            text: todoText,
            completed: false
        };
        todoItems.push(newTodo);
        renderTodoList();
        inputField.value = '';
    }
}

// Function to delete a todo item
function deleteTodo(index) {
    todoItems.splice(index, 1);
    renderTodoList();
}

// Function to mark a todo item as completed
function markCompleted(index) {
    todoItems[index].completed = !todoItems[index].completed;
    renderTodoList();
}

// Function to render the todo list
function renderTodoList() {
    const listHtml = todoItems.map((todo, index) => {
        return `
            <li>
                <input type="checkbox" ${todo.completed ? 'checked' : ''} onclick="markCompleted(${index})">
                <span style="text-decoration: ${todo.completed ? 'line-through' : 'none'}">${todo.text}</span>
                <button onclick="deleteTodo(${index})">Delete</button>
            </li>
        `;
    }).join('');
    todoList.innerHTML = listHtml;
}

// Add event listener to the input field to call the addTodo function when the user presses the Enter key
inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// Add event listener to the todo list to call the deleteTodo and markCompleted functions when the user interacts with the list
todoList.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        const index = Array.prototype.indexOf.call(todoList.children, e.target.parentNode);
        deleteTodo(index);
    }
});
