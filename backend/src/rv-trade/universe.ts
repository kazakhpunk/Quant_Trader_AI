import { Country, Bucket } from './rv-types';

export const UNIVERSE: Country[] = [
  // S&P numeric: AAA=1, AA+=2, AA=3, AA-=4, A+=5, A=6, A-=7, BBB+=8, BBB=9, BBB-=10,
  //              BB+=11, BB=12, BB-=13, B+=14, B=15, B-=16, CCC+=17, CCC=18, CCC-=19, CC=20, C=21, D=22
  { iso: 'BRA', name: 'Brazil',       region: 'LatAm', rating: 11, oilExporter: false, commodityExporter: true,  igHy: 'HY', debtToGdp: 86, fredOasSeriesId: 'BAMLEM4BRRBLCRPIUSOAS' },
  { iso: 'MEX', name: 'Mexico',       region: 'LatAm', rating: 9,  oilExporter: true,  commodityExporter: true,  igHy: 'IG', debtToGdp: 53, fredOasSeriesId: 'BAMLEM4BRRMLCRPIUSOAS' },
  { iso: 'COL', name: 'Colombia',     region: 'LatAm', rating: 11, oilExporter: true,  commodityExporter: true,  igHy: 'HY', debtToGdp: 60, fredOasSeriesId: 'BAMLEM4BRRCLCRPIUSOAS' },
  { iso: 'CHL', name: 'Chile',        region: 'LatAm', rating: 6,  oilExporter: false, commodityExporter: true,  igHy: 'IG', debtToGdp: 38, fredOasSeriesId: 'BAMLEM4BRRCHLCRPIUSOAS' },
  { iso: 'PER', name: 'Peru',         region: 'LatAm', rating: 9,  oilExporter: false, commodityExporter: true,  igHy: 'IG', debtToGdp: 33, fredOasSeriesId: 'BAMLEM4BRRPELCRPIUSOAS' },
  { iso: 'TUR', name: 'Turkey',       region: 'EMEA',  rating: 14, oilExporter: false, commodityExporter: false, igHy: 'HY', debtToGdp: 30, fredOasSeriesId: 'BAMLEM4BRRTRLCRPIUSOAS' },
  { iso: 'ZAF', name: 'South Africa', region: 'EMEA',  rating: 12, oilExporter: false, commodityExporter: true,  igHy: 'HY', debtToGdp: 71, fredOasSeriesId: 'BAMLEM4BRRZALCRPIUSOAS' },
  { iso: 'POL', name: 'Poland',       region: 'EMEA',  rating: 5,  oilExporter: false, commodityExporter: false, igHy: 'IG', debtToGdp: 50, fredOasSeriesId: 'BAMLEM4BRRPLLCRPIUSOAS' },
  { iso: 'HUN', name: 'Hungary',      region: 'EMEA',  rating: 10, oilExporter: false, commodityExporter: false, igHy: 'IG', debtToGdp: 73, fredOasSeriesId: 'BAMLEM4BRRHULCRPIUSOAS' },
  { iso: 'ROU', name: 'Romania',      region: 'EMEA',  rating: 10, oilExporter: false, commodityExporter: false, igHy: 'IG', debtToGdp: 49, fredOasSeriesId: 'BAMLEM4BRRROLCRPIUSOAS' },
  { iso: 'IDN', name: 'Indonesia',    region: 'Asia',  rating: 9,  oilExporter: false, commodityExporter: true,  igHy: 'IG', debtToGdp: 39, fredOasSeriesId: 'BAMLEM4BRRIDLCRPIUSOAS' },
  { iso: 'PHL', name: 'Philippines',  region: 'Asia',  rating: 9,  oilExporter: false, commodityExporter: false, igHy: 'IG', debtToGdp: 57, fredOasSeriesId: 'BAMLEM4BRRPHLCRPIUSOAS' },
  { iso: 'MYS', name: 'Malaysia',     region: 'Asia',  rating: 7,  oilExporter: true,  commodityExporter: true,  igHy: 'IG', debtToGdp: 67, fredOasSeriesId: 'BAMLEM4BRRMYLCRPIUSOAS' },
  { iso: 'EGY', name: 'Egypt',        region: 'MENA',  rating: 16, oilExporter: false, commodityExporter: false, igHy: 'HY', debtToGdp: 96, fredOasSeriesId: 'BAMLEM4BRREGLCRPIUSOAS' },
  { iso: 'NGA', name: 'Nigeria',      region: 'EMEA',  rating: 14, oilExporter: true,  commodityExporter: true,  igHy: 'HY', debtToGdp: 38, fredOasSeriesId: 'BAMLEM4BRRNGLCRPIUSOAS' },
];

export function bucketsForCountry(c: Country): Bucket[] {
  const buckets: Bucket[] = [];
  if (c.oilExporter) buckets.push('oilExporters');
  if (c.commodityExporter) buckets.push('commodityExporters');
  if (c.region === 'LatAm' && c.igHy === 'IG') buckets.push('latamIG');
  if (c.region === 'LatAm' && c.igHy === 'HY') buckets.push('latamHY');
  if (c.region === 'EMEA' && c.igHy === 'IG') buckets.push('cee');
  if (c.region === 'MENA') buckets.push('gcc');
  if (c.region === 'Asia' && c.igHy === 'IG') buckets.push('asiaIG');
  if (c.rating >= 14) buckets.push('frontier');
  return buckets;
}

export const allBuckets: Bucket[] = [
  'oilExporters', 'commodityExporters', 'latamIG', 'latamHY',
  'cee', 'gcc', 'asiaIG', 'frontier',
];

export function pairsWithinBuckets(universe: Country[]): { a: Country; b: Country; bucket: Bucket }[] {
  const seen = new Map<string, { a: Country; b: Country; bucket: Bucket }>();
  for (const a of universe) {
    for (const b of universe) {
      if (a.iso >= b.iso) continue;
      const sharedBuckets = bucketsForCountry(a).filter(x => bucketsForCountry(b).includes(x));
      if (sharedBuckets.length === 0) continue;
      const key = `${a.iso}-${b.iso}`;
      if (!seen.has(key)) {
        seen.set(key, { a, b, bucket: sharedBuckets[0] });
      }
    }
  }
  return Array.from(seen.values());
}
