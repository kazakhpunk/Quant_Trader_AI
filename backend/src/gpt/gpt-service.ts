import openai from '../openai';

class GptService {
  async *processStreamedJsonArray<T>(
    stream: AsyncIterable<any>
  ): AsyncGenerator<T, void, unknown> {
    let accumulator = ''; // Accumulate JSON object characters
    let depth = 0; // Depth of nested JSON structures
    let isInString = false; // Whether the current context is within a string

    for await (const part of stream) {
      const chunk = part.choices[0]?.delta?.content; // Extract content from the stream part

      if (chunk) {
        for (const char of chunk) {
          // Toggle isInString when encountering a quote that isn't escaped
          if (char === '"' && (accumulator.slice(-1) !== '\\' || isInString)) {
            isInString = !isInString;
          }

          // Accumulate characters if within an object or string
          if (isInString || depth > 0) {
            accumulator += char;
          }

          // Adjust depth based on the current character if not within a string
          if (!isInString) {
            if (char === '{') {
              depth++; // Increase depth at the start of an object
              if (depth === 1) {
                accumulator = '{'; // Ensure accumulator starts with an opening brace for a new object
              }
            } else if (char === '}') {
              depth--; // Decrease depth at the end of an object
            }
          }

          // Attempt to parse when depth returns to 0, indicating the end of an object
          if (depth === 0 && !isInString && accumulator.trim() !== '') {
            try {
              const parsedObject = JSON.parse(accumulator); // Parse the accumulated string as JSON
              yield parsedObject; // Yield the parsed JSON object
            } catch (e) {
              console.error('Error parsing JSON:', e); // Log parsing errors
            }
            accumulator = ''; // Reset accumulator for the next JSON object
          }
        }
      }
    }
  }

  async create(userPrompt: string, callback: (data: any) => void) {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `
          You are an expert trading bot assisting with stock and crypto trading and also Quant Trader Companion. Your tasks include fetching the latest market prices, executing buy/sell orders, analyzing sentiment from news articles, and monitoring existing positions for stop-loss or take-profit conditions. Provide accurate and timely trading insights.
          Please, return your response in following array JSON format: 
          {
            trades: [
              {
                "symbol": "Stock Symbol",
                "action": "buy/sell",
                "quantity": "Number of shares",
                "price": "Price per share",
                "reason": "Reason for the trade"
              }
            ]
          }
          If user prompt is irrelevant return empty array of trades
          `,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      stream: true,
    });
    try {
      for await (const jsonObject of this.processStreamedJsonArray(stream)) {
        if (jsonObject) callback(jsonObject);
      }
    } catch (error) {
      console.error('Error processing OpenAI stream', error);
      throw new Error('Failed to process OpenAI stream');
    }
  }
}

export default GptService;