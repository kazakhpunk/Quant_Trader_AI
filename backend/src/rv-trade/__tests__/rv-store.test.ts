import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { RvStore } from '../rv-store';
import { BacktestRun, SignalRow } from '../rv-types';

let mongo: MongoMemoryServer;
let client: MongoClient;
let db: Db;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  client = new MongoClient(mongo.getUri());
  await client.connect();
  db = client.db('test');
});

afterAll(async () => {
  await client.close();
  await mongo.stop();
});

describe('RvStore', () => {
  it('round-trips signal snapshots', async () => {
    const store = new RvStore(db);
    const sig: SignalRow = {
      pairKey: 'BRA-MEX', a: 'BRA', b: 'MEX', bucket: 'latamHY',
      beta: 1.1, alpha: 5, residual: 12, z: 2.1, delta5d: 0.8, halfLife: 25,
      cointPValue: 0.02, correlation: 0.81, status: 'tradeable', asOf: '2026-04-25',
    };
    await store.saveSnapshot('user@x.com', '2026-04-25', [sig]);
    const out = await store.getLatestSnapshot('user@x.com');
    expect(out?.signals[0].pairKey).toBe('BRA-MEX');
  });

  it('round-trips backtest runs and lists them', async () => {
    const store = new RvStore(db);
    const run: BacktestRun = {
      userEmail: 'u@x.com',
      ts: '2026-04-25T10:00:00Z',
      config: {
        rules: { entryZ: 2, exitZ: 0.5, stopZ: 3.5, maxHoldingDays: 60, costBpsRoundTrip: 30, sizing: 'equalWeight' },
        startDate: '2024-01-01', endDate: '2024-12-31', notional: 1_000_000, dv01YearsProxy: 7,
      },
      metrics: { totalReturn: 0.1, annReturn: 0.1, annVol: 0.07, sharpe: 1.4, sortino: 1.8,
                 maxDrawdown: -0.05, hitRate: 0.6, avgHoldingDays: 18, turnover: 4, deflatedSharpe: 1.1, numTrades: 24 },
      equityCurve: [{ date: '2024-01-02', nav: 1_000_000 }],
      trades: [],
    };
    const id = await store.saveRun(run);
    const list = await store.listRuns('u@x.com');
    expect(list.find(r => r._id === id)).toBeTruthy();
    const fetched = await store.getRun(id);
    expect(fetched?.metrics.sharpe).toBe(1.4);
  });
});
