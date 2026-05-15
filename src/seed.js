const { ConnectToDatabase, CloseDatabase } = require('./db');
const books = require('./books');

async function Seed() {
  const collection = await ConnectToDatabase();
  await collection.deleteMany({});
  const result = await collection.insertMany(books);
  console.log(`Inserted ${result.insertedCount} books.`);
}

Seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(CloseDatabase);
