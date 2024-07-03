import GptService from './gpt-service';
import { Request, Response } from 'express';

// a user controller is a class that handles the user routes (incoming frontend requests)
class GptController {
  private userService: GptService;

  constructor(userService: GptService) {
    this.userService = userService;
  }
  getBooks = async (req: Request, res: Response) => {
    const { userPrompt } = req.body;
    try {
      const response = await this.userService.getBooks(userPrompt);
      res.status(201).json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}

export default GptController;
