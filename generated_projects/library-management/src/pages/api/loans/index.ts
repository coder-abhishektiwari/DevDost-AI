import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getSession } from 'next-auth/react';

type LoanResponse = {
  id: number;
  userId: number;
  bookId: number;
  createdAt: string;
  returnedAt: string | null;
  book?: {
    id: number;
    title: string;
    author: string;
    available: number;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoanResponse | LoanResponse[] | { message: string }>
) {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ message: 'Unauthenticated' });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email as string },
  });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (req.method === 'POST') {
    const { bookId } = req.body;
    const numericBookId = Number(bookId);
    if (Number.isNaN(numericBookId)) {
      return res.status(400).json({ message: 'Invalid bookId' });
    }

    const book = await prisma.book.findUnique({
      where: { id: numericBookId },
    });
    if (!book || book.available < 1) {
      return res.status(400).json({ message: 'Book not available' });
    }

    const loan = await prisma.loan.create({
      data: { userId: user.id, bookId: book.id },
    });

    await prisma.book.update({
      where: { id: book.id },
      data: { available: { decrement: 1 } },
    });

    return res.status(201).json(loan);
  }

  if (req.method === 'GET') {
    const loans = await prisma.loan.findMany({
      where: { userId: user.id, returnedAt: null },
      include: { book: true },
    });
    return res.status(200).json(loans);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const loanId = Number(id);
    if (Number.isNaN(loanId)) {
      return res.status(400).json({ message: 'Invalid loan id' });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
    });
    if (!loan || loan.userId !== user.id) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    await prisma.loan.update({
      where: { id: loanId },
      data: { returnedAt: new Date() },
    });

    await prisma.book.update({
      where: { id: loan.bookId },
      data: { available: { increment: 1 } },
    });

    return res.status(200).json({ message: 'Returned' });
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}