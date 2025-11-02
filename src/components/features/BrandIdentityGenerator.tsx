'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Brand } from '@prisma/client';
import { Copy, ExternalLink } from 'lucide-react'; // Import ExternalLink icon
import { toast } from 'sonner'; // Import toast
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface BrandIdentityGeneratorProps {
  brand: Brand;
}

export function BrandIdentityGenerator({ brand }: BrandIdentityGeneratorProps) {
  const [input, setInput] = useState(brand.description);
  const [result, setResult] = useState({
    mission: brand.mission || '',
    vision: brand.vision || '',
    values: brand.values || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notionPageIdInput, setNotionPageIdInput] = useState(brand.notionPageId || '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    setInput(brand.description);
    setResult({
      mission: brand.mission || '',
      vision: brand.vision || '',
      values: brand.values || '',
    });
    setNotionPageIdInput(brand.notionPageId || '');
  }, [brand]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/generate/identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input, brandId: brand.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate brand identity.');
      }

      const data = await response.json();
      setResult(data);
      toast.success('Brand identity generated!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate brand identity.');
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
            type: 'Brand Identity',
            data: `Mission Statement: ${result.mission}\nVision Statement: ${result.vision}\nCore Values: ${result.values}`,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export to Notion.');
      }

      const data = await response.json();
      toast.success('Brand identity exported to Notion!');
      if (data.notionPageId) {
        setNotionPageIdInput(data.notionPageId); // Update if a new page was created
        // Optionally open the Notion page
        window.open(`https://www.notion.so/${data.notionPageId.replace(/-/g, '')}`, '_blank');
      }
      setIsDialogOpen(false); // Close dialog on success
    } catch (error) {
      console.error(error);
      toast.error('Failed to export to Notion.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Identity Generator</CardTitle>
        <CardDescription>
          Use your brand description to generate a mission statement, vision statement, and core values.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Textarea
            placeholder="e.g., A coffee shop that focuses on ethically sourced beans and a cozy atmosphere."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
          />
          <div className="flex justify-between mt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate Identity'}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={!result.mission || isLoading || isExporting}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Export to Notion
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export to Notion</DialogTitle>
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

        {(result.mission || isLoading) && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold">Your Brand Identity</h3>
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="font-semibold flex items-center justify-between">
                  Mission Statement
                  {result.mission && (
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(result.mission, 'Mission Statement')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </h4>
                <p className="text-muted-foreground">{isLoading ? '...' : result.mission}</p>
              </div>
              <div>
                <h4 className="font-semibold flex items-center justify-between">
                  Vision Statement
                  {result.vision && (
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(result.vision, 'Vision Statement')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </h4>
                <p className="text-muted-foreground">{isLoading ? '...' : result.vision}</p>
              </div>
              <div>
                <h4 className="font-semibold flex items-center justify-between">
                  Core Values
                  {result.values && (
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(result.values, 'Core Values')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </h4>
                <p className="text-muted-foreground">{isLoading ? '...' : result.values}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
