import axios, { AxiosInstance } from 'axios';
import Bottleneck from 'bottleneck';

export interface FredObservation {
  date: string;
  value: number;
}

interface RawObservation {
  date: string;
  value: string;
}

export interface FredClientDeps {
  http?: (config: { params: Record<string, string> }) => Promise<{ data: { observations: RawObservation[] } }>;
  cacheGet?: (key: string) => Promise<FredObservation[] | null>;
  cacheSet?: (key: string, obs: FredObservation[]) => Promise<void>;
}

const FRED_URL = 'https://api.stlouisfed.org/fred/series/observations';

export class FredClient {
  private apiKey: string;
  private http: NonNullable<FredClientDeps['http']>;
  private cacheGet: NonNullable<FredClientDeps['cacheGet']>;
  private cacheSet: NonNullable<FredClientDeps['cacheSet']>;
  private limiter = new Bottleneck({ minTime: 600 });   // ~100 req/min, safe under FRED limit

  constructor(apiKey: string, deps: FredClientDeps = {}) {
    this.apiKey = apiKey;
    if (deps.http) {
      this.http = deps.http;
    } else {
      const ax: AxiosInstance = axios.create({ timeout: 15_000 });
      this.http = async (config) => {
        const res = await ax.get(FRED_URL, config);
        return { data: res.data };
      };
    }
    this.cacheGet = deps.cacheGet ?? (async () => null);
    this.cacheSet = deps.cacheSet ?? (async () => undefined);
  }

  async getSeries(seriesId: string, start: string, end: string): Promise<FredObservation[]> {
    const cacheKey = `${seriesId}|${start}|${end}`;
    const cached = await this.cacheGet(cacheKey);
    if (cached) return cached;

    const res = await this.limiter.schedule(() => this.http({
      params: {
        series_id: seriesId,
        api_key: this.apiKey,
        file_type: 'json',
        observation_start: start,
        observation_end: end,
      },
    }));

    const parsed: FredObservation[] = res.data.observations
      .filter((o) => o.value !== '.')
      .map((o) => ({ date: o.date, value: Number(o.value) }))
      .filter((o) => Number.isFinite(o.value));

    await this.cacheSet(cacheKey, parsed);
    return parsed;
  }
}
