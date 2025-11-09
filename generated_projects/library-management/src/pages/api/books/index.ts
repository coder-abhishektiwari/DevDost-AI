import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method, query, body } = req;

    switch (method) {
      case 'GET': {
        const q = typeof query.q === 'string' ? query.q : undefined;
        const books = await prisma.book.findMany({
          where: q
            ? {
                OR: [
                  { title: { contains: q, mode: 'insensitive' } },
                  { author: { contains: q, mode: 'insensitive' } },
                ],
              }
            : undefined,
        });
        res.status(200).json(books);
        break;
      }

      case 'POST': {
        const {
          title,
          author,
          description,
          coverUrl,
          totalCopies,
        } = body as {
          title?: string;
          author?: string;
          description?: string;
          coverUrl?: string;
          totalCopies?: number | string;
        };

        if (!title || !author) {
          res.status(400).json({ error: 'Title and author are required' });
          return;
        }

        const copies = Number(totalCopies) || 1;

        const book = await prisma.book.create({
          data: {
            title,
            author,
            description: description ?? '',
            coverUrl: coverUrl ?? '',
            totalCopies: copies,
            available: copies,
          },
        });

        res.status(201).json(book);
        break;
      }

      case 'PUT': {
        const { id, ...updates } = body as { id?: number | string; [key: string]: any };

        if (!id) {
          res.status(400).json({ error: 'Id is required for update' });
          return;
        }

        const book = await prisma.book.update({
          where: { id: Number(id) },
          data: updates,
        });

        res.status(200).json(book);
        break;
      }

      case 'DELETE': {
        const id = Number(query.id);
        if (!id) {
          res.status(400).json({ error: 'Id query parameter is required' });
          return;
        }

        await prisma.book.delete({ where: { id } });
        res.status(204).end();
        break;
      }

      default: {
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
      }
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}