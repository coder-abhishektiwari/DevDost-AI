
import React from 'react';
import { Book } from '@prisma/client';
import Link from 'next/link';
import styles from './BookCard.module.css';

interface BookCardProps {
  book: Book;
  onBorrow?: (bookId: number) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onBorrow }) => {
  const handleBorrow = () => {
    if (onBorrow) {
      onBorrow(book.id);
    }
  };

  return (
    <div className={styles.card}>
      {book.coverUrl && (
        <img src={book.coverUrl} alt={book.title} className={styles.cover} />
      )}
      <h3>{book.title}</h3>
      <p className={styles.author}>by {book.author}</p>
      {book.description && (
        <p>
          {book.description.slice(0, 100)}
          {book.description.length > 100 && '...'}
        </p>
      )}
      <p>
        Available: {book.available} / {book.totalCopies}
      </p>
      <div className={styles.actions}>
        <Link href={`/books/${book.id}`}>
          <a className={styles.details}>Details</a>
        </Link>
        {book.available > 0 && (
          <button onClick={handleBorrow} className={styles.borrow}>
            Borrow
          </button>
        )}
      </div>
    </div>
  );
};

export default BookCard;