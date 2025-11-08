```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import TodoList from './components/TodoList.js';
import config from './config.json';

const apiEndpoint = config.apiEndpoint;
const authEndpoint = config.authEndpoint;
const rootElement = document.getElementById('root');

const handleToggle = (id) => {
  const todoList = rootElement.state.todoList;
  const updatedList = todoList.map((todo) => {
    if (todo.id === id) {
      return { ...todo, completed: !todo.completed };
    }
    return todo;
  });
  rootElement.setState({ todoList: updatedList });
};

const handleRemove = (id) => {
  const todoList = rootElement.state.todoList;
  const updatedList = todoList.filter((todo) => todo.id !== id);
  rootElement.setState({ todoList: updatedList });
};

const renderApp = () => {
  ReactDOM.render(
    <TodoList
      todoList={rootElement.state.todoList}
      onToggle={handleToggle}
      onRemove={handleRemove}
    />,
    rootElement
  );
};

class TodoApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      todoList: []
    };
  }

  componentDidMount() {
    fetch(apiEndpoint)
      .then(response => response.json())
      .then(data => this.setState({ todoList: data }));
  }

  render() {
    return (
      <div>
        <TodoList
          todoList={this.state.todoList}
          onToggle={handleToggle}
          onRemove={handleRemove}
        />
      </div>
    );
  }
}

ReactDOM.render(
  <TodoApp />,
  rootElement
);
```