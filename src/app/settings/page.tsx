'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (!session || !session.user) {
    router.push('/'); // Redirect to home/login if not authenticated
    return null;
  }

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const response = await fetch(`/api/users/${session.user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account.');
      }

      toast.success('Account deleted successfully!');
      await signOut({ callbackUrl: '/' }); // Sign out and redirect to home
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Manage your account information and settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Profile Information</h3>
            <p><strong>Name:</strong> {session.user.name}</p>
            <p><strong>Email:</strong> {session.user.email}</p>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
            <p className="text-muted-foreground mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeletingAccount}>
                  {isDeletingAccount ? 'Deleting...' : <Trash className="mr-2 h-4 w-4" />}
                  {isDeletingAccount ? '' : 'Delete Account'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and all brands, slogans, color palettes, and logo ideas associated with it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeletingAccount}>
                    {isDeletingAccount ? 'Deleting...' : 'Continue'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
