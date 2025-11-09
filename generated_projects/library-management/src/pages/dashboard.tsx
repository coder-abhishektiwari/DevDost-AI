import { GetServerSideProps, NextPage } from 'next';
import { getSession, useSession } from 'next-auth/react';
import prisma from '../lib/prisma';
import { Book, Loan } from '@prisma/client';
import { SearchBar } from '../components/SearchBar';
import { BookCard } from '../components/BookCard';
import { LoanList } from '../components/LoanList';
import { useState } from 'react';
import axios from 'axios';
import styles from '../styles/Dashboard.module.css';

interface DashboardProps {
  initialBooks: Book[];
  initialLoans: (Loan & { book: Book })[];
}

const Dashboard: NextPage<DashboardProps> = ({ initialBooks, initialLoans }) => {
  const { data: session } = useSession();
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [loans, setLoans] = useState<(Loan & { book: Book })[]>(initialLoans);

  const handleSearch = async (query: string) => {
    const res = await axios.get('/api/books', { params: { q: query } });
    setBooks(res.data);
  };

  const handleBorrow = async (bookId: number) => {
    await axios.post('/api/loans', { bookId });
    const [booksRes, loansRes] = await Promise.all([
      axios.get('/api/books'),
      axios.get('/api/loans'),
    ]);
    setBooks(booksRes.data);
    setLoans(loansRes.data);
  };

  const handleReturn = async (loanId: number) => {
    await axios.delete(`/api/loans/${loanId}`);
    const loansRes = await axios.get('/api/loans');
    setLoans(loansRes.data);
  };

  return (
    <div className={styles.container}>
      <h1>Welcome, {session?.user?.name || session?.user?.email}</h1>
      <section>
        <h2>Your Loans</h2>
        <LoanList loans={loans} onReturn={handleReturn} />
      </section>
      <section>
        <h2>Catalog</h2>
        <SearchBar onSearch={handleSearch} />
        <div className={styles.grid}>
          {books.map((book) => (
            <BookCard key={book.id} book={book} onBorrow={handleBorrow} />
          ))}
        </div>
      </section>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx);
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email as string },
  });

  const initialLoans = await prisma.loan.findMany({
    where: { userId: user?.id, returnedAt: null },
    include: { book: true },
  });

  const initialBooks = await prisma.book.findMany();

  return { props: { initialBooks, initialLoans } };
};

export default Dashboard;