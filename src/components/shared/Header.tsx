'use client';

import React from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link'; // Import Link
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings } from 'lucide-react'; // Import Settings icon

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b p-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold">AI Brand Hub</h1>
      <div className="flex items-center space-x-4">
        {session?.user ? (
          <>
            <Link href="/settings" passHref>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <Avatar>
              <AvatarImage src={session.user.image || undefined} />
              <AvatarFallback>{session.user.name?.[0]}</AvatarFallback>
            </Avatar>
            <Button onClick={() => signOut()}>Sign Out</Button>
          </>
        ) : (
          <Button onClick={() => signIn('google')}>Sign In</Button>
        )}
      </div>
    </header>
  );
}
