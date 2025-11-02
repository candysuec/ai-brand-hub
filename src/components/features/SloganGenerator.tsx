'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThumbsUp, ThumbsDown, Copy, ExternalLink } from 'lucide-react'; // Import ExternalLink icon
import { Brand } from '@prisma/client';
import { toast } from 'sonner'; // Import toast
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea'; // Using Textarea for Notion content

interface SloganGeneratorProps {
  brand: Brand;
}

export function SloganGenerator({ brand }: SloganGeneratorProps) {
  const [input, setInput] = useState(brand.description);
  const [slogans, setSlogans] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notionPageIdInput, setNotionPageIdInput] = useState(brand.notionPageId || '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    setInput(brand.description);
    if (brand.slogans) {
      setSlogans(brand.slogans as string[]);
    } else {
      setSlogans([]);
    }
    setNotionPageIdInput(brand.notionPageId || '');
  }, [brand]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSlogans([]);

    try {
      const response = await fetch('/api/generate/slogan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input, brandId: brand.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate slogans.');
      }

      const data = await response.json();
      setSlogans(data);
      toast.success('Slogans generated!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate slogans.');
      // Handle error state in the UI
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard!`);
  };

  const handleExportToNotion = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export/notion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: brand.id,
          notionPageId: notionPageIdInput,
          content: {
            type: 'Slogans',
            data: slogans.join('\n- '), // Export slogans as a list
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export slogans to Notion.');
      }

      const data = await response.json();
      toast.success('Slogans exported to Notion!');
      if (data.notionPageId) {
        setNotionPageIdInput(data.notionPageId); // Update if a new page was created
        window.open(`https://www.notion.so/${data.notionPageId.replace(/-/g, '')}`, '_blank');
      }
      setIsDialogOpen(false); // Close dialog on success
    } catch (error) {
      console.error(error);
      toast.error('Failed to export slogans to Notion.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Slogan Generator</CardTitle>
        <CardDescription>
          Enter a topic or a few keywords about your brand, and we'll generate some catchy slogans.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Input
            placeholder="e.g., sustainable coffee, AI consulting"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="flex justify-between mt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate Slogans'}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={slogans.length === 0 || isLoading || isExporting}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Export to Notion
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export Slogans to Notion</DialogTitle>
                  <DialogDescription>
                    Enter an existing Notion page ID to update, or leave blank to create a new page.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="notionPageId" className="block text-sm font-medium mb-1">
                      Notion Page ID (Optional)
                    </label>
                    <Input
                      id="notionPageId"
                      value={notionPageIdInput}
                      onChange={(e) => setNotionPageIdInput(e.target.value)}
                      placeholder="e.g., a1b2c3d4e5f6..."
                    />
                  </div>
                  <Button onClick={handleExportToNotion} disabled={isExporting}>
                    {isExporting ? 'Exporting...' : 'Export'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </form>

        {(slogans.length > 0 || isLoading) && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold">Generated Slogans</h3>
            <div className="mt-4 space-y-4">
              {isLoading ? (
                <p className="text-muted-foreground">...</p>
              ) : (
                slogans.map((slogan, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                    <p>{slogan}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleCopy(slogan, 'Slogan')}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
