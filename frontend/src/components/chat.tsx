'use client';

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/mainButton";
import { PanelButton } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useChat } from 'ai/react';
import axios, { all } from 'axios';
import { set } from "zod";
import { v4 as uuidv4 } from 'uuid';


type Message = {
  role: string;
  content: string;
  timestamp: string;
  id: string;
};

export function Chat() {
  const [chatStarted, setChatStarted] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, setMessages } = useChat();
  const [savedMessages, setSavedMessages] = useState<Message[]>([]);
  const [showPanel, setPanel] = useState(false);
  const [allocation, setAllocation] = useState(50);
  const [loading, setLoading] = useState(false);

  // Load messages from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedMessages = localStorage.getItem('chatMessages');
      if (storedMessages) {
        setSavedMessages(JSON.parse(storedMessages));
      }
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const combinedMessages: Message[] = [
        ...savedMessages,
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date().toISOString(),
          id: uuidv4(),
        }))
      ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      localStorage.setItem('chatMessages', JSON.stringify(combinedMessages));
    }
  }, [savedMessages, messages]);

  const handleSendMessage = async () => {
    handleSubmit();
    setChatStarted(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handlePanel = () => {
    setPanel(true);
    setChatStarted(true);
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const tradeResponse = await axios.post(`http://localhost:8000/api/v1/trade/${allocation}`);
      if (tradeResponse.status === 200) {
        setPanel(false);
        const newMessage: any = {
          role: 'assistant',
          content: "Congratulations! You made an order to Buy Stocks!",
          timestamp: new Date().toISOString(),
          id: uuidv4(),
        };
        const updatedMessages = [...savedMessages, newMessage].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        setSavedMessages(updatedMessages);
        setMessages([...messages, newMessage]);
        localStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
      }
    } catch (error) {
      console.error('Error during purchase:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen p-4">
      <header className="flex items-center justify-between w-full h-16 px-4 border-b">
        <div className="flex items-center">
          <Avatar>
            <AvatarImage />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          <span className="ml-2 text-lg font-semibold">Quant Trader AI</span>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline">Login</Button>
          <Button variant="default">GitHub</Button>
        </div>
      </header>
      <main className="flex flex-col items-center w-full flex-1 p-4">
        {!chatStarted && (
          <Card className="w-full max-w-3xl p-3 my-8">
            <CardHeader>
              <CardTitle className="pb-2">Welcome to Quant Trader AI Chatbot!</CardTitle>
              <CardDescription className="text-md">
                I am a Quant Trader AI, a powerful trading bot and companion. I utilize advanced techniques in technical,
                fundamental, and sentiment analysis to provide you with intelligent insights and recommendations to
                navigate the financial markets. My goal is to empower you with the knowledge and tools to make informed
                trading decisions and achieve your financial goals.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        {chatStarted && (
          <div className="max-w-3xl w-full mt-8">
            {messages.map((msg, index) => (
              <div key={index} className="flex items-start w-full">
                {msg.role === 'user' ? (
                  <div className="flex items-start w-full">
                    <UserIcon className="w-8 h-8 m-2 mt-1" />
                    <div className="flex flex-col items-start w-full">
                      <div className="p-2 mb-1 bg-blue-100 rounded-md">
                        {msg.content}
                      </div>
                      <hr className="w-full border-t border-gray-300" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start w-full">
                    <BotIcon className="w-8 h-8 m-2 mt-1" />
                    <div className="flex flex-col items-start w-full">
                      <div className="p-2 mb-1 bg-gray-100 rounded-md">
                        {msg.content}
                      </div>
                      <hr className="w-full border-t border-gray-300" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>)
        }
        {showPanel && (
        <div className="flex items-start w-full mt-8 max-w-3xl">
        <BotIcon className="w-8 h-8 m-2" />
        <Card className="w-full max-w-2xl mt-2 ml-6">
          <CardHeader className="grid gap-2">
            <CardTitle>Purchase Stocks</CardTitle>
            <CardDescription>
              Use the slider to select the amount you want to allocate for your stock purchase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <Slider value={[allocation]} onValueChange={(value) => setAllocation(value[0])}  min={0} max={100} step={1} className="w-full" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Allocation Amount</span>
                <span className="font-medium">${allocation.toFixed(2)}</span>
              </div>
              <PanelButton className="w-full" onClick={handlePurchase}>{loading ? 'Processing...' : 'Purchase'}</PanelButton>
            </div>
          </CardContent>
       </Card>
        </div>
        )}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 w-full max-w-2xl mb-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Button variant="outline" className="w-full text-sm font-medium h-14" onClick={handlePanel}>
              Trade Low-Risk on Stocks
            </Button>
            <Button variant="outline" className="w-full text-sm font-medium h-14">
              Trade High-Risk on Crypto
            </Button>
          </div>
          <div className="flex items-center w-full my-3">
            <Button variant="outline" className="flex items-center justify-center w-12 h-12">
              <PlusIcon className="w-6 h-6" />
            </Button>
            <Input 
              type="text" 
              placeholder="Send a message." 
              className="flex-1 px-4 py-2 ml-4 h-12" 
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            <Button 
              variant="default" 
              className="flex items-center justify-center w-12 h-12 ml-4"
              onClick={handleSendMessage}>
              <SendIcon className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function PlusIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function SendIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BotIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M12 8V4H8" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

// function scrollToBottom(containerRef: MutableRefObject<HTMLDivElement | null>): void {
//   throw new Error("Function not implemented.");
// }
