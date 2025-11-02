'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function Home() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (response.ok) {
        const brand = await response.json();
        router.push(`/brand/${brand.id}`);
      } else {
        // Handle error
        console.error('Failed to create brand');
      }
    } catch (error) {
      console.error('Failed to create brand', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="flex justify-center items-center h-full">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle>Welcome to AI Brand Hub</CardTitle>
            <CardDescription>Please sign in to create and manage your brands.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => signIn('google')}>Sign In with Google</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-full">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create a New Brand</CardTitle>
          <CardDescription>
            Give your new brand a name and a short description to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Brand Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., CandySueC"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Brand Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., A creative entrepreneur focused on AI-powered design."
                required
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Brand'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
