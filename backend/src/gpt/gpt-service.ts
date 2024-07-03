import openai from '../openai';
import { Book } from './gpt-types';

const systemPrompt = `
You are professional teacher who suggests his students different LLM courses. 
You should provide a 4 books to read in order to become well-trained LLM engineer.
A book should contain a brief description of the course, book name and author name. 
Please, return your response in following array JSON format: 
{
  books: [
    {
      "author": "Author Name",
      "name": "Book Name",
      "description": "Description of the course"
    }
  ]
}
If user prompt is irrelevant return empty array of books
`;

class GptService {
  async getBooks(userPrompt: string) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt,
              },
            ],
          },
        ],
        response_format: {
          type: 'json_object',
        },
      });

      const resJson: string | null = response.choices[0].message.content;
      if (resJson) {
        const parsedRes = JSON.parse(resJson);
        return parsedRes.books as Book[];
      } else {
        return null;
      }
    } catch (e: any) {
      console.log(e.message);
    }
  }
}

export default GptService;
