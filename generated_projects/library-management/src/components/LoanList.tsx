
import React from 'react';
import { Loan, Book } from '@prisma/client';
import styles from './LoanList.module.css';

interface LoanListProps {
  loans: (Loan & { book: Book })[];
  onReturn: (loanId: number) => void;
}

export const LoanList: React.FC<LoanListProps> = ({ loans, onReturn }) => {
  if (loans.length === 0) {
    return <p className={styles.empty}>No active loans.</p>;
  }

  return (
    <ul className={styles.list}>
      {loans.map((loan) => (
        <li key={loan.id} className={styles.item}>
          <div className={styles.bookInfo}>
            <strong>{loan.book.title}</strong> by {loan.book.author}
          </div>
          <div className={styles.borrowedDate}>
            Borrowed on: {new Date(loan.borrowedAt).toLocaleDateString()}
          </div>
          <button
            onClick={() => onReturn(loan.id)}
            className={styles.returnBtn}
            type="button"
          >
            Return
          </button>
        </li>
      ))}
    </ul>
  );
};

export default LoanList;