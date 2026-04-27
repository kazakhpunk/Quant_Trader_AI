import { Db, ObjectId } from 'mongodb';
import { BacktestRun, SignalRow } from './rv-types';
import { FredObservation } from './fred-client';

export class RvStore {
  constructor(private db: Db) {}

  async saveSnapshot(userEmail: string, asOf: string, signals: SignalRow[]): Promise<void> {
    await this.db.collection('rv_signal_snapshots').insertOne({
      userEmail, asOf, ts: new Date().toISOString(), signals,
    });
  }

  async getLatestSnapshot(userEmail: string): Promise<{ asOf: string; signals: SignalRow[] } | null> {
    const doc = await this.db.collection('rv_signal_snapshots')
      .find({ userEmail })
      .sort({ ts: -1 })
      .limit(1)
      .next();
    if (!doc) return null;
    return { asOf: doc.asOf, signals: doc.signals };
  }

  async saveRun(run: BacktestRun): Promise<string> {
    const res = await this.db.collection('rv_backtest_runs').insertOne(run as any);
    return res.insertedId.toHexString();
  }

  async getRun(id: string): Promise<BacktestRun | null> {
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.db.collection('rv_backtest_runs').findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    const { _id, ...rest } = doc as any;
    return { _id: _id.toHexString(), ...rest } as BacktestRun;
  }

  async deleteRun(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const res = await this.db.collection('rv_backtest_runs').deleteOne({ _id: new ObjectId(id) });
    return res.deletedCount === 1;
  }

  async listRuns(userEmail: string, limit = 20): Promise<BacktestRun[]> {
    const docs = await this.db.collection('rv_backtest_runs')
      .find({ userEmail })
      .project({ equityCurve: 0, trades: 0 })
      .sort({ ts: -1 })
      .limit(limit)
      .toArray();
    return docs.map((d: any) => ({ ...d, _id: d._id.toHexString() }));
  }

  async getCachedFred(key: string, maxAgeMs: number): Promise<FredObservation[] | null> {
    const doc = await this.db.collection('rv_fred_cache').findOne({ _id: key as any });
    if (!doc) return null;
    if (Date.now() - new Date(doc.ts).getTime() > maxAgeMs) return null;
    return doc.obs as FredObservation[];
  }

  async setCachedFred(key: string, obs: FredObservation[]): Promise<void> {
    await this.db.collection('rv_fred_cache').updateOne(
      { _id: key as any },
      { $set: { _id: key, ts: new Date().toISOString(), obs } },
      { upsert: true },
    );
  }
}
