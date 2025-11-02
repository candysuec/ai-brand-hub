'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, ExternalLink } from 'lucide-react'; // Import ExternalLink icon
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
import { Input } from '@/components/ui/input';

interface Palette {
  name: string;
  colors: string[];
}

interface ColorPaletteGeneratorProps {
  brand: Brand;
}

export function ColorPaletteGenerator({ brand }: ColorPaletteGeneratorProps) {
  const [keyword, setKeyword] = useState('');
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notionPageIdInput, setNotionPageIdInput] = useState(brand.notionPageId || '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (brand.colorPalettes) {
      setPalettes(brand.colorPalettes as Palette[]);
    } else {
      setPalettes([]);
    }
    setNotionPageIdInput(brand.notionPageId || '');
  }, [brand]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword) return;
    setIsLoading(true);
    setPalettes([]);

    try {
      const truncatedKeyword = keyword.substring(0, 1000); // Truncate input to 1000 characters
      const response = await fetch('/api/generate/colors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: truncatedKeyword, brandId: brand.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate color palettes.');
      }

      const data = await response.json();
      setPalettes(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate color palettes.');
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
      const formattedPalettes = palettes.map(p => `${p.name}: ${p.colors.join(', ')}`).join('\n');
      const response = await fetch('/api/export/notion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: brand.id,
          notionPageId: notionPageIdInput,
          content: {
            type: 'Color Palettes',
            data: formattedPalettes,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export color palettes to Notion.');
      }

      const data = await response.json();
      toast.success('Color palettes exported to Notion!');
      if (data.notionPageId) {
        setNotionPageIdInput(data.notionPageId); // Update if a new page was created
        window.open(`https://www.notion.so/${data.notionPageId.replace(/-/g, '')}`, '_blank');
      }
      setIsDialogOpen(false); // Close dialog on success
    } catch (error) {
      console.error(error);
      toast.error('Failed to export color palettes to Notion.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Color Palette Generator</CardTitle>
        <CardDescription>
          Select a keyword to generate color palettes that match the mood of your brand.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex items-center gap-4">
          <Select onValueChange={setKeyword} value={keyword}>
            <SelectTrigger>
              <SelectValue placeholder="Select a keyword" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bold">Bold</SelectItem>
              <SelectItem value="calm">Calm</SelectItem>
              <SelectItem value="techy">Techy</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex justify-between w-full">
            <Button type="submit" disabled={isLoading || !keyword}>
              {isLoading ? 'Generating...' : 'Generate'}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={palettes.length === 0 || isLoading || isExporting}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Export to Notion
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export Color Palettes to Notion</DialogTitle>
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

        {(palettes.length > 0 || isLoading) && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold">Generated Palettes</h3>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {isLoading ? (
                <p className="text-muted-foreground">...</p>
              ) : (
                palettes.map((palette, index) => (
                  <div key={index}>
                    <h4 className="font-semibold mb-2">{palette.name}</h4>
                    <div className="flex gap-2">
                      {palette.colors.map((color) => (
                        <div
                          key={color}
                          className="relative w-16 h-16 rounded-lg cursor-pointer group"
                          style={{ backgroundColor: color }}
                          onClick={() => handleCopy(color, `Color ${color}`)}
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      ))}
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
