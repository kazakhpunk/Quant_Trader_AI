import { MongoClient, Db } from 'mongodb';

let db: Db;

export const connectToDatabase = async (uri: string): Promise<Db> => {
  if (db) return db; // Return the existing connection if already established.

  const client = new MongoClient(uri);
  await client.connect();
  db = client.db(); // Select the database

  console.log("Connected to MongoDB");
  return db;
};

export const getDatabase = (): Db => {
  if (!db) {
    throw new Error("Database not connected. Call connectToDatabase first.");
  }
  return db;
};
