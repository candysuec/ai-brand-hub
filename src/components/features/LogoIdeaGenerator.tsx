'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SendHorizonal, Copy, Image as ImageIcon, ExternalLink } from 'lucide-react'; // Import Image and ExternalLink icons
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

interface LogoIdeaGeneratorProps {
  brand: Brand;
}

export function LogoIdeaGenerator({ brand }: LogoIdeaGeneratorProps) {
  const [input, setInput] = useState(brand.description);
  const [logoIdeas, setLogoIdeas] = useState<string[]>([]);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(brand.generatedLogoImage || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notionPageIdInput, setNotionPageIdInput] = useState(brand.notionPageId || '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    setInput(brand.description);
    if (brand.logoIdeas) {
      setLogoIdeas(brand.logoIdeas as string[]);
    } else {
      setLogoIdeas([]);
    }
    setGeneratedImageUrl(brand.generatedLogoImage || null);
    setNotionPageIdInput(brand.notionPageId || '');
  }, [brand]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLogoIdeas([]);

    try {
      const truncatedInput = input.substring(0, 1000); // Truncate input to 1000 characters
      const response = await fetch('/api/generate/logo-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: truncatedInput, brandId: brand.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate logo ideas.');
      }

      const data = await response.json();
      setLogoIdeas(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate logo ideas.');
      // Handle error state in the UI
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard!`);
  };

  const handleGenerateImage = async (idea: string) => {
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null); // Clear previous image

    try {
      const response = await fetch('/api/generate/image-logo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idea, brandId: brand.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image.');
      }

      const data = await response.json();
      setGeneratedImageUrl(data.imageUrl);
      toast.success('Logo image generated!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate logo image.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleExportToNotion = async () => {
    setIsExporting(true);
    try {
      const formattedLogoIdeas = logoIdeas.map(idea => `- ${idea}`).join('\n');
      const contentData = generatedImageUrl
        ? `${formattedLogoIdeas}\n\nGenerated Image: ${generatedImageUrl}`
        : formattedLogoIdeas;

      const response = await fetch('/api/export/notion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: brand.id,
          notionPageId: notionPageIdInput,
          content: {
            type: 'Logo Ideas',
            data: contentData,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export logo ideas to Notion.');
      }

      const data = await response.json();
      toast.success('Logo ideas exported to Notion!');
      if (data.notionPageId) {
        setNotionPageIdInput(data.notionPageId); // Update if a new page was created
        window.open(`https://www.notion.so/${data.notionPageId.replace(/-/g, '')}`, '_blank');
      }
      setIsDialogOpen(false); // Close dialog on success
    } catch (error) {
      console.error(error);
      toast.error('Failed to export logo ideas to Notion.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo Idea Generator</CardTitle>
        <CardDescription>
          Based on your brand description, generate creative textual ideas for your logo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Input
            placeholder="e.g., minimal, abstract, modern, includes an animal"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="flex justify-between mt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate Logo Ideas'}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={logoIdeas.length === 0 || isLoading || isExporting}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Export to Notion
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export Logo Ideas to Notion</DialogTitle>
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

        {(logoIdeas.length > 0 || isLoading) && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold">Generated Logo Ideas</h3>
            <div className="mt-4 space-y-4">
              {isLoading ? (
                <p className="text-muted-foreground">...</p>
              ) : (
                logoIdeas.map((idea, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                    <p>{idea}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleCopy(idea, 'Logo Idea')}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleGenerateImage(idea)}
                        disabled={isGeneratingImage}
                      >
                        {isGeneratingImage ? (
                          <span className="animate-spin">⚙️</span> // Simple spinner
                        ) : (
                          <ImageIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {generatedImageUrl && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold">Generated Logo Image</h3>
            <div className="mt-4">
              <img src={generatedImageUrl} alt="Generated Logo" className="max-w-full h-auto rounded-lg" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
