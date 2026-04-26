import { FredClient, FredObservation } from '../fred-client';

const SAMPLE_FRED_RESPONSE = {
  observations: [
    { date: '2024-01-02', value: '350.5' },
    { date: '2024-01-03', value: '.' },          // FRED null sentinel
    { date: '2024-01-04', value: '352.1' },
  ],
};

describe('FredClient', () => {
  let mockHttp: jest.Mock;
  let mockCacheGet: jest.Mock;
  let mockCacheSet: jest.Mock;

  beforeEach(() => {
    mockHttp = jest.fn().mockResolvedValue({ data: SAMPLE_FRED_RESPONSE });
    mockCacheGet = jest.fn().mockResolvedValue(null);
    mockCacheSet = jest.fn().mockResolvedValue(undefined);
  });

  it('parses observations and skips null sentinels', async () => {
    const client = new FredClient('fake-key', { http: mockHttp, cacheGet: mockCacheGet, cacheSet: mockCacheSet });
    const obs = await client.getSeries('BAMLEM4BRRBLCRPIUSOAS', '2024-01-01', '2024-01-31');
    expect(obs).toEqual<FredObservation[]>([
      { date: '2024-01-02', value: 350.5 },
      { date: '2024-01-04', value: 352.1 },
    ]);
  });

  it('hits cache on second call', async () => {
    const client = new FredClient('fake-key', { http: mockHttp, cacheGet: mockCacheGet, cacheSet: mockCacheSet });
    mockCacheGet.mockResolvedValueOnce(null).mockResolvedValueOnce([{ date: '2024-01-02', value: 350.5 }]);
    await client.getSeries('X', '2024-01-01', '2024-01-31');
    await client.getSeries('X', '2024-01-01', '2024-01-31');
    expect(mockHttp).toHaveBeenCalledTimes(1);
  });

  it('passes api key and series id to http', async () => {
    const client = new FredClient('my-key', { http: mockHttp, cacheGet: mockCacheGet, cacheSet: mockCacheSet });
    await client.getSeries('SERIES', '2024-01-01', '2024-01-31');
    const call = mockHttp.mock.calls[0][0];
    expect(call.params.series_id).toBe('SERIES');
    expect(call.params.api_key).toBe('my-key');
    expect(call.params.observation_start).toBe('2024-01-01');
    expect(call.params.observation_end).toBe('2024-01-31');
  });
});
