import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Minimize2, Maximize2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  content: string;
  isUser: boolean;
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [threadId, setThreadId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Load threadId from localStorage
    const savedThreadId = localStorage.getItem("chatThreadId");
    if (savedThreadId) {
      setThreadId(parseInt(savedThreadId));
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    if (!threadId) {
      const newThreadId = Math.floor(Math.random() * 1000000);
      setThreadId(newThreadId);
      localStorage.setItem("chatThreadId", newThreadId.toString());

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "Hello, I'd like some financial advice.",
            threadId: newThreadId,
          }),
        });

        if (!response.ok) throw new Error("Failed to initialize chat");

        const data = await response.json();
        setMessages([{ content: data.message, isUser: false }]);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to start chat. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !threadId) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setMessages((prev) => [...prev, { content: userMessage, isUser: true }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          threadId,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const data = await response.json();
      setMessages((prev) => [...prev, { content: data.message, isUser: false }]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    initializeChat();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? "auto" : "500px",
            }}
            exit={{ opacity: 0, y: 50, scale: 0.3 }}
            transition={{ duration: 0.2 }}
            className="mb-4"
          >
            <Card className={cn(
              "w-[350px] shadow-lg flex flex-col",
              isMinimized ? "h-auto" : "h-[500px]"
            )}>
              <div className="p-3 border-b flex justify-between items-center bg-primary text-primary-foreground rounded-t-lg">
                <span className="font-semibold">Financial Assistant</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsMinimized(!isMinimized)}
                  >
                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {!isMinimized && (
                <>
                  <div className="flex-1 p-4 overflow-y-auto">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={cn(
                          "mb-4 p-3 rounded-lg max-w-[80%]",
                          message.isUser
                            ? "ml-auto bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {message.content}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t mt-auto">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        sendMessage();
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1"
                      />
                      <Button type="submit" size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={handleOpen}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    </div>
  );
}