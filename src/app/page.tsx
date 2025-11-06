'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Brand } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/'); // Redirect to home/login if not authenticated
    }

    if (status === 'authenticated') {
      const fetchBrands = async () => {
        try {
          const response = await fetch('/api/brands');
          if (response.ok) {
            const data = await response.json();
            setBrands(data);
          } else {
            setBrands([]);
          }
        } catch (error) {
          console.error('Error fetching brands:', error);
          setBrands([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchBrands();
    }
  }, [status, router]);

  if (isLoading || status === 'loading') {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (!session) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">Welcome to AI Brand Hub</h1>
          <p className="mb-8 text-gray-600">Please sign in to continue.</p>
          {/* The sign-in button will be handled by the NextAuth.js provider */}
        </div>
      </main>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Brands</h1>
        <Link href="/brands/new">
          <Button>Create New Brand</Button>
        </Link>
      </div>

      {brands.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand) => (
            <Link href={`/brand/${brand.id}`} key={brand.id}>
              <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <CardTitle>{brand.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3">{brand.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">You haven't created any brands yet.</p>
        </div>
      )}
    </div>
  );
}