
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Brand } from '@prisma/client';
import { PlusCircle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function Sidebar() {
  const pathname = usePathname();
  const { data: brands, error } = useSWR<Brand[]>('/api/brands', fetcher);

  return (
    <aside className="w-64 border-r p-4 flex-shrink-0 flex flex-col">
      <div className="mb-4">
        <Button asChild className="w-full">
          <Link href="/brands/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Brand
          </Link>
        </Button>
      </div>
      <nav className="flex flex-col space-y-1">
        <h2 className="px-4 text-lg font-semibold tracking-tight mb-2">
          Your Brands
        </h2>
        {error && <div>Failed to load brands</div>}
        {!brands && !error && <div>Loading...</div>}
        {Array.isArray(brands) && brands.map((brand) => (
          <Button
            key={brand.id}
            asChild
            variant={pathname === `/brand/${brand.id}` ? 'secondary' : 'ghost'}
            className="justify-start"
          >
            <Link href={`/brand/${brand.id}`}>{brand.name}</Link>
          </Button>
        ))}
      </nav>
    </aside>
  );
}
