import { Router } from 'express';
import GptService from './gpt-service';
import GptController from './gpt-controller';
import { Server, WebSocket } from 'ws';

const gptRouter = Router();

const gptService = new GptService();
const gptController = new GptController(gptService);

const wss = new Server({ noServer: true });

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', async (message: string) => {
    const userPrompt = message.toString();
    await gptController.handleWebSocketConnection(ws, userPrompt);
  });

  ws.send('Connected to WebSocket server');
});

gptRouter.get('/roadmaps', (req, res) => {
  res.send('Roadmap API is running');
});

export { gptRouter, wss };