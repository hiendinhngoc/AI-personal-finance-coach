import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import type { ExpenseItem } from "@shared/schema";

export default function TestAI() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [response, setResponse] = useState<string | ExpenseItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string)
          .replace('data:', '')
          .replace(/^.+,/, '');
        setImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt && !image) return;

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/test-ai", { prompt, image });
      const data = await res.json();
      setResponse(data.response);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <img src="/cp.jpg" alt="Company Logo" className="h-8 w-auto cursor-pointer" />
          </Link>
          <h1 className="text-xl font-semibold">Test AI Model</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="prompt" className="text-sm font-medium text-gray-700">
                  Prompt (Optional for image analysis)
                </Label>
                <Textarea
                  id="prompt"
                  placeholder="Enter your prompt here..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px] mt-1 rounded-md border-gray-200 focus:border-primary focus:ring-primary"
                />
              </div>

              <div>
                <Label htmlFor="image" className="text-sm font-medium text-gray-700">
                  Image (Optional)
                </Label>
                <div className="mt-1">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="rounded-md border-gray-200 focus:border-primary focus:ring-primary
                             file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0
                             file:text-sm file:font-semibold file:bg-primary/10 file:text-primary
                             hover:file:bg-primary/20"
                  />
                </div>
                {image && (
                  <div className="mt-4">
                    <img
                      src={`data:image/jpeg;base64,${image}`}
                      alt="Uploaded preview"
                      className="max-w-xs rounded-lg shadow-md"
                    />
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || (!prompt && !image)}
                className="w-full sm:w-auto"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {image ? "Analyze Image" : "Generate Response"}
              </Button>
            </form>

            {response && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Response:</h3>
                <div className="bg-gray-50 rounded-lg border p-4">
                  {typeof response === "string" ? (
                    <pre className="whitespace-pre-wrap text-sm text-gray-700">{response}</pre>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {response.map((item, index) => (
                        <div key={index} className="py-4 first:pt-0 last:pb-0 hover:bg-white transition-colors rounded-md">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <p className="text-sm">
                              <span className="font-medium text-gray-900">Amount:</span>{" "}
                              <span className="text-gray-700">{item.amount}</span>
                            </p>
                            <p className="text-sm">
                              <span className="font-medium text-gray-900">Currency:</span>{" "}
                              <span className="text-gray-700">{item.currency?.toUpperCase()}</span>
                            </p>
                            <p className="text-sm">
                              <span className="font-medium text-gray-900">Category:</span>{" "}
                              <span className="text-gray-700">{item.category}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}