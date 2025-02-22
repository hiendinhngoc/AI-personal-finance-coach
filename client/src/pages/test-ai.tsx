import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ImageIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Test AI Model</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="prompt">Prompt (Optional for image analysis)</Label>
              <Textarea
                id="prompt"
                placeholder="Enter your prompt here..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="image">Image (Optional)</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="cursor-pointer"
              />
              {image && (
                <div className="mt-2">
                  <img
                    src={`data:image/jpeg;base64,${image}`}
                    alt="Uploaded preview"
                    className="max-w-xs rounded-lg shadow-md"
                  />
                </div>
              )}
            </div>

            <Button type="submit" disabled={isLoading || (!prompt && !image)}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {image ? "Analyze Image" : "Generate Response"}
            </Button>
          </form>

          {response && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Response:</h3>
              <div className="p-4 bg-muted rounded-lg">
                {typeof response === "string" ? (
                  <pre className="whitespace-pre-wrap">{response}</pre>
                ) : (
                  <div className="space-y-4">
                    {response.map((item, index) => (
                      <div key={index} className="p-3 bg-background rounded border">
                        <p><span className="font-medium">Amount:</span> {item.amount}</p>
                        <p><span className="font-medium">Currency:</span> {item.currency.toUpperCase()}</p>
                        <p><span className="font-medium">Category:</span> {item.category}</p>
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
  );
}