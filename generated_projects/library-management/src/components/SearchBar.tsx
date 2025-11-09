
import React, { useState, useEffect, ChangeEvent } from 'react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

/**
 * SearchBar component with built‑in debounce.
 * Calls `onSearch` 500 ms after the user stops typing.
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Search books...',
}) => {
  const [input, setInput] = useState<string>('');

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(input.trim());
    }, 500);

    return () => clearTimeout(handler);
  }, [input, onSearch]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  return (
    <input
      type="text"
      value={input}
      onChange={handleChange}
      placeholder={placeholder}
      className={styles.input}
    />
  );
};

export default SearchBar;