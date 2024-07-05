import 'dotenv/config';
import express from 'express';
import { MongoClient, Db } from 'mongodb';
import { logger } from './logger';
import createTechnicalRouter from './analysis/analysis-router';
import createTradeRouter from './trade/trade-router';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'your_default_mongo_uri';

let db: Db;

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(limiter);

const connectToDatabase = async (uri: string): Promise<Db> => {
  const client = new MongoClient(uri);
  await client.connect();
  db = client.db(); // Select the database
  console.log("Connected to MongoDB");
  return db;
};

app.use(logger);
app.use(express.json());

const startServer = async () => {
  try {
    // Connect to the database
    await connectToDatabase(MONGO_URI);

    // Create and use the technical router
    const technicalRouter = await createTechnicalRouter(db);
    app.use('/api/v1/', technicalRouter);
    const tradeRouter = await createTradeRouter(db);
    app.use('/api/v1/', tradeRouter);

    app.listen(PORT, () => {
      console.log(`Server runs at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
};

startServer();

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const systemPrompt = `
// You are professional teacher who suggests his students different LLM courses. 
// You should provide a 4 books to read in order to become well-trained LLM engineer.
// A book should contain a brief description of the course, book name and author name. 
// Please, return your response in following array JSON format: 
// {
//   books: [
//     {
//       "author": "Author Name",
//       "name": "Book Name",
//       "description": "Description of the course"
//     }
//   ]
// }
// If user prompt is irrelevant return empty array of books
// `;
// const userPrompt =
//   'I am a software engineer who has a keen interest in LLM course. What should I start with?';

// const main = async () => {
//   try {
//     const response = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       messages: [
//         {
//           role: 'system',
//           content: systemPrompt,
//         },
//         {
//           role: 'user',
//           content: userPrompt,
//         },
//       ],
//       response_format: {
//         type: 'json_object',
//       },
//     });

//     const resJson: string | null = response.choices[0].message.content;
//     if (resJson) {
//       try {
//         const parsedRes = JSON.parse(resJson);
//         console.log(parsedRes.books);
//       } catch (e: any) {
//         console.log('JSON parsing failed:', e.message);
//       }
//     }
//   } catch (e: any) {
//     console.log(e.message);
//   }
// };

// main();