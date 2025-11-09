import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { TodoContext } from './TodoContext';
import PropTypes from 'prop-types';

/**
 * TodoItem component renders a single todo entry.
 * It displays the todo text, a button to toggle its completed state,
 * and a link to an edit page for the todo.
 *
 * @param {Object} props
 * @param {{ id: number, text: string, completed: boolean }} props.todo - The todo item data.
 */
const TodoItem = ({ todo }) => {
  const { toggleTodo } = useContext(TodoContext);

  const handleToggle = () => {
    toggleTodo(todo.id);
  };

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        textDecoration: todo.completed ? 'line-through' : 'none',
        marginBottom: '4px',
      }}
    >
      <span>{todo.text}</span>
      <div>
        <button onClick={handleToggle} type="button">
          {todo.completed ? 'Undo' : 'Complete'}
        </button>
        <Link
          to={`/edit/${todo.id}`}
          style={{ marginLeft: '8px', textDecoration: 'none' }}
        >
          Edit
        </Link>
      </div>
    </li>
  );
};

TodoItem.propTypes = {
  todo: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    text: PropTypes.string.isRequired,
    completed: PropTypes.bool.isRequired,
  }).isRequired,
};

export default TodoItem;
