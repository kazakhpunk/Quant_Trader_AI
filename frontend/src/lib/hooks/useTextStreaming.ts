// import { useState } from 'react';
// import { streamText } from 'ai';
// import { createOpenAI } from '@ai-sdk/openai';
// import dotenv from 'dotenv';

// dotenv.config();

// type Message = {
//   role: string;
//   content: string;
// };

// const systemPrompt = `
//   You are an expert trading bot assisting with stock and crypto trading and also Quant Trader Companion. Your tasks include fetching the latest market prices, executing buy/sell orders, analyzing sentiment from news articles, and monitoring existing positions for stop-loss or take-profit conditions. Provide accurate and timely trading insights.
// `;

// const openai = createOpenAI({
//   apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? '',
// });

// const useTextStreaming = () => {
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [loading, setLoading] = useState(false);

//   const streamTextData = async (userInput: string) => {
//     setLoading(true);
//     try {
//       const result = await streamText({
//         model: openai('gpt-4-turbo'), 
//         system: systemPrompt,
//         prompt: userInput,
//         onFinish({ text }) {
//           setMessages((prevMessages) => [
//             ...prevMessages,
//             { role: 'bot', content: text },
//           ]);
//           setLoading(false);
//         },
//       });
//       return result;
//     } catch (error) {
//       console.error('Error streaming text:', error);
//       setLoading(false);
//     }
//   };

//   return { messages, setMessages, streamTextData, loading };
// };

// export default useTextStreaming;
