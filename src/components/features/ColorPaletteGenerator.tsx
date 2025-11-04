import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Palette } from '@/types';

interface ColorPaletteGeneratorProps {
  brand: any;
}

export default function ColorPaletteGenerator({ brand }: ColorPaletteGeneratorProps) {
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notionPageIdInput, setNotionPageIdInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const palettesData = brand.colorPalettes as unknown;
    if (Array.isArray(palettesData)) {
      setPalettes(palettesData as Palette[]);
    } else {
      setPalettes([]);
    }
  }, [brand.colorPalettes]);

  const handleCopy = (color: string, label: string) => {
    navigator.clipboard.writeText(color);
    toast({
      description: `${label} copied to clipboard!`,
    });
  };

  const handleExportToNotion = async () => {
    if (!notionPageIdInput) return;
    setIsExporting(true);
    try {
      const response = await fetch('/api/export-to-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionPageId: notionPageIdInput,
          palettes,
        }),
      });
      if (response.ok) {
        toast({ description: 'Exported successfully to Notion!' });
      } else {
        toast({ description: 'Failed to export to Notion.' });
      }
    } catch (error) {
      console.error(error);
      toast({ description: 'An error occurred while exporting.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Color Palette Generator</CardTitle>
        <CardDescription>Generate and manage color palettes for your brand.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Export to Notion</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export Palettes to Notion</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="notionPageId" className="block text-sm font-medium text-gray-700">
                      Notion Page ID (Optional)
                    </label>
                    <Input
                      id="notionPageId"
                      value={notionPageIdInput}
                      onChange={(e) => setNotionPageIdInput(e.target.value)}
                      placeholder="e.g., a1b2c3d4e5f6"
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
