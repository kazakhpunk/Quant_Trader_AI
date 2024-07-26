import 'dotenv/config';
import express from 'express';
import { MongoClient, Db } from 'mongodb';
import { logger } from './logger';
import createTechnicalRouter from './analysis/analysis-router';
import createTradeRouter from './trade/trade-router';
import createAuthRouter from './auth/auth-router';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import dashboardRouter from './dashboard/dash-router'

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

    const authRouter = await createAuthRouter(db);
    app.use('/api/', authRouter);

    app.use('/api/v4', dashboardRouter);

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
