'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Brand } from '@prisma/client';
import { PlusCircle, LayoutDashboard, ShieldCheck, Bug } from 'lucide-react'; // Added icons

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function Sidebar() {
  const pathname = usePathname();
  // const { data: brands, error } = useSWR<Brand[]>('/api/brands', fetcher);
  const brands: Brand[] = [
    { id: "mock-1", name: "Mock Brand One", userId: "user-1", createdAt: new Date(), updatedAt: new Date() },
    { id: "mock-2", name: "Mock Brand Two", userId: "user-1", createdAt: new Date(), updatedAt: new Date() },
  ];
  const error = null; // No error with mock data

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
        {/* New Navigation Items */}
        <Button
          asChild
          variant={pathname === '/dashboard' ? 'secondary' : 'ghost'}
          className="justify-start"
        >
          <Link href="/dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <Button
          asChild
          variant={pathname === '/admin/selfrepair' ? 'secondary' : 'ghost'}
          className="justify-start"
        >
          <Link href="/admin/selfrepair">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Self-Repair
          </Link>
        </Button>
        <Button
          asChild
          variant={pathname === '/admin/diagnostics' ? 'secondary' : 'ghost'}
          className="justify-start"
        >
          <Link href="/admin/diagnostics">
            <Bug className="mr-2 h-4 w-4" />
            Diagnostics
          </Link>
        </Button>

        <h2 className="px-4 text-lg font-semibold tracking-tight mb-2 mt-4">
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