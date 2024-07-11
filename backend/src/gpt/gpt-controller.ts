import { Request, Response } from 'express';
import GptService from './gpt-service';
import WebSocket from 'ws';

class GptController {
  private gptService: GptService;

  constructor(gptService: GptService) {
    this.gptService = gptService;
  }

  async handleWebSocketConnection(ws: WebSocket, userPrompt: string) {
    try {
      await this.gptService.create(userPrompt, (data) => {
        ws.send(JSON.stringify(data));
      });
    } catch (error) {
      ws.send(JSON.stringify({ error: 'Failed to process OpenAI stream' }));
    }
  }
}

export default GptController;
