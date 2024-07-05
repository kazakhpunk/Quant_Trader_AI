import { CoreMessage, streamText, convertToCoreMessages } from 'ai';
import { openai } from '@ai-sdk/openai';

// async function saveChat(message: CoreMessage) {
//   console.log('logging in route.ts');
    
//     let chatMessages = JSON.parse(localStorage.getItem('chatMessages') || '[]');
//     chatMessages.push(message);
//     localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
//     console.log('Saving message:', message);
// }

const systemPrompt = `
  You are an expert trading bot assisting with stock and crypto trading and also Quant Trader Companion. Your tasks include fetching the latest market prices, executing buy/sell orders, analyzing sentiment from news articles, and monitoring existing positions for stop-loss or take-profit conditions. Provide accurate and timely trading insights.
`;

export async function POST(req: Request) {
  const { messages }: { messages: CoreMessage[] } = await req.json();

  const result = await streamText({
    model: openai('gpt-4-turbo'),
    system: systemPrompt,
    messages,
    async onFinish({ text, toolCalls, toolResults, usage, finishReason }) {
      const assistantMessage: CoreMessage = {
        role: 'assistant',
        content: text,
      };
      // await saveChat(assistantMessage);
    },
  });

  return result.toAIStreamResponse();
}