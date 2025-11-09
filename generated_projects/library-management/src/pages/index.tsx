import React from 'react';
import { GetServerSideProps, NextPage } from 'next';
import prisma from '../lib/prisma';
import { Book } from '@prisma/client';
import { BookCard } from '../components/BookCard';
import styles from '../styles/Home.module.css';

interface HomeProps {
  featured: Book[];
}

const Home: NextPage<HomeProps> = ({ featured }) => (
  <div className={styles.container}>
    <h1 className={styles.title}>Welcome to the Library</h1>
    <section className={styles.grid}>
      {featured.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </section>
  </div>
);

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  const featured = await prisma.book.findMany({
    take: 6,
    orderBy: { createdAt: 'desc' },
  });
  return { props: { featured } };
};

export default Home;