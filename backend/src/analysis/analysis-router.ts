import { Router } from 'express';
import { Db } from 'mongodb';
import AnalysisService from './analysis-service';
import AnalysisController from './analysis-controller';

const analysisRouter = async (db: Db) => {
  const router = Router();
  const technicalService = new AnalysisService(db);
  const technicalController = new AnalysisController(technicalService);

  router.get('/analysis', technicalController.analyzeResults);
  router.get('/getAllTechnicalData', technicalController.getAllTechnicalData);
  router.get('/getTechnicalData/:ticker', technicalController.getTechnicalData);
  router.get('/getAllFundamentalData', technicalController.getAllFundamentalData);
  router.get('/getFundamentalData/:ticker', technicalController.getFundamentalData);
  router.get('/postFundamentalData/:ticker', technicalController.postFundamentalData);
  router.get('/tickers', technicalController.getTickers);
  router.post('/tickers', technicalController.addTicker);
  router.delete('/tickers', technicalController.removeTicker);
  router.get('/fetchHistoricalData/:ticker', technicalController.fetchHistoricalData);
  router.get('/fetchIntervalHistoricalData', technicalController.fetchIntervalHistoricalData);
  router.get('/fetchExtendedHistoricalData', technicalController.fetchExtendedHistoricalData);
  router.get('/fetchRealTimeData/:ticker', technicalController.fetchRealTimeData);
  router.get('/getNewsArticles/:ticker', technicalController.getNewsArticles);
  router.get('/analyzeSentiment/:ticker', technicalController.analyzeSentiment);
  router.get('/analyzeWithSentiment', technicalController.analyzeWithSentiment);
  router.get('/getIntervalSMAData', technicalController.getIntervalSMAData);
  router.get('/getIntervalEMAData', technicalController.getIntervalEMAData);
  router.get('/getIntervalRSIData', technicalController.getIntervalRSIData);

  return router;
};

export default analysisRouter;
