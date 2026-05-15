const express = require('express');
const path = require('path');
require('dotenv').config();

const { ConnectToDatabase, ToObjectId, CloseDatabase } = require('./db');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function BuildBookQuery(query) {
  const filter = {};

  if (query.author) {
    filter.author = { $regex: query.author, $options: 'i' };
  }

  if (query.name) {
    filter.name = { $regex: query.name, $options: 'i' };
  }

  if (query.year) {
    filter.year = Number(query.year);
  }

  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }

  return filter;
}

function ValidateBook(book) {
  if (!book.name || typeof book.name !== 'string') {
    return 'Book name is required.';
  }
  if (!book.author || typeof book.author !== 'string') {
    return 'Book author is required.';
  }
  if (!Number.isInteger(book.year) || book.year < 0) {
    return 'Book year must be a non-negative integer.';
  }
  if (typeof book.price !== 'number' || book.price < 0) {
    return 'Book price must be a non-negative number.';
  }

  return null;
}

app.get('/api/health', async (request, response) => {
  const collection = await ConnectToDatabase();
  const count = await collection.countDocuments();
  response.json({ status: 'ok', database: process.env.DB_NAME, books: count });
});

app.get('/api/books', async (request, response) => {
  const collection = await ConnectToDatabase();
  const filter = BuildBookQuery(request.query);
  const books = await collection.find(filter).sort({ name: 1 }).toArray();
  response.json(books);
});

app.get('/api/books/:id', async (request, response) => {
  const id = ToObjectId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: 'Invalid book id.' });
  }

  const collection = await ConnectToDatabase();
  const book = await collection.findOne({ _id: id });

  if (!book) {
    return response.status(404).json({ error: 'Book not found.' });
  }

  response.json(book);
});

app.post('/api/books', async (request, response) => {
  const book = {
    name: request.body.name,
    author: request.body.author,
    year: Number(request.body.year),
    price: Number(request.body.price)
  };

  const error = ValidateBook(book);
  if (error) {
    return response.status(400).json({ error });
  }

  try {
    const collection = await ConnectToDatabase();
    const result = await collection.insertOne(book);
    response.status(201).json({ ...book, _id: result.insertedId });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ error: 'A book with this name already exists.' });
    }
    throw error;
  }
});

app.put('/api/books/:id', async (request, response) => {
  const id = ToObjectId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: 'Invalid book id.' });
  }

  const book = {
    name: request.body.name,
    author: request.body.author,
    year: Number(request.body.year),
    price: Number(request.body.price)
  };

  const error = ValidateBook(book);
  if (error) {
    return response.status(400).json({ error });
  }

  const collection = await ConnectToDatabase();
  const result = await collection.findOneAndUpdate(
    { _id: id },
    { $set: book },
    { returnDocument: 'after' }
  );

  if (!result) {
    return response.status(404).json({ error: 'Book not found.' });
  }

  response.json(result);
});


app.patch('/api/books/:id', async (request, response) => {
  const id = ToObjectId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: 'Invalid book id.' });
  }

  const updates = {};
  if (request.body.name !== undefined) updates.name = request.body.name;
  if (request.body.author !== undefined) updates.author = request.body.author;
  if (request.body.year !== undefined) updates.year = Number(request.body.year);
  if (request.body.price !== undefined) updates.price = Number(request.body.price);
  if (request.body.status !== undefined) updates.status = request.body.status;
  if (request.body.reorderNeeded !== undefined) updates.reorderNeeded = Boolean(request.body.reorderNeeded);

  const collection = await ConnectToDatabase();
  const result = await collection.findOneAndUpdate(
    { _id: id },
    { $set: updates },
    { returnDocument: 'after' }
  );

  if (!result) {
    return response.status(404).json({ error: 'Book not found.' });
  }

  response.json(result);
});

app.delete('/api/books/:id', async (request, response) => {
  const id = ToObjectId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: 'Invalid book id.' });
  }

  const collection = await ConnectToDatabase();
  const result = await collection.deleteOne({ _id: id });

  if (result.deletedCount === 0) {
    return response.status(404).json({ error: 'Book not found.' });
  }

  response.status(204).send();
});

app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).json({ error: 'Server error.' });
});

const server = app.listen(port, () => {
  console.log(`Books API running on http://localhost:${port}`);
});

process.on('SIGTERM', async () => {
  await CloseDatabase();
  server.close();
});
