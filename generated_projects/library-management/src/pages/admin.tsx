import React, { useState } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '../lib/prisma';
import { Book, User, Loan } from '@prisma/client';
import axios from 'axios';
import styles from '../styles/Admin.module.css';

interface AdminProps {
  books: Book[];
  users: User[];
  loans: (Loan & { book: Book; user: User })[];
}

const AdminPage: NextPage<AdminProps> = ({ books, users, loans }) => {
  const [bookList, setBookList] = useState<Book[]>(books);
  const [userList, setUserList] = useState<User[]>(users);
  const [loanList, setLoanList] = useState<(Loan & { book: Book; user: User })[]>(loans);

  const deleteBook = async (id: number) => {
    try {
      await axios.delete(`/api/books/${id}`);
      setBookList(prev => prev.filter(b => b.id !== id));
    } catch (error) {
      console.error('Failed to delete book:', error);
    }
  };

  const deleteUser = async (id: number) => {
    try {
      await axios.delete(`/api/users/${id}`);
      setUserList(prev => prev.filter(u => u.id !== id));
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const deleteLoan = async (id: number) => {
    try {
      await axios.delete(`/api/loans/${id}`);
      setLoanList(prev => prev.filter(l => l.id !== id));
    } catch (error) {
      console.error('Failed to delete loan:', error);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Admin Dashboard</h1>

      <section>
        <h2>Books</h2>
        <ul>
          {bookList.map(b => (
            <li key={b.id}>
              {b.title} by {b.author}{' '}
              <button onClick={() => deleteBook(b.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Users</h2>
        <ul>
          {userList.map(u => (
            <li key={u.id}>
              {u.name || u.email} ({u.role}){' '}
              <button onClick={() => deleteUser(u.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Loans</h2>
        <ul>
          {loanList.map(l => (
            <li key={l.id}>
              {l.book.title} borrowed by {l.user.email} on{' '}
              {new Date(l.borrowedAt).toLocaleDateString()}{' '}
              <button onClick={() => deleteLoan(l.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async ctx => {
  const session = await getSession(ctx);
  if (!session || session.user?.role !== 'ADMIN') {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const [books, users, loans] = await Promise.all([
    prisma.book.findMany(),
    prisma.user.findMany(),
    prisma.loan.findMany({
      include: { book: true, user: true },
    }),
  ]);

  return {
    props: {
      books,
      users,
      loans,
    },
  };
};

export default AdminPage;