'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Brand } from '@prisma/client';
import { BrandIdentityGenerator } from '@/components/features/BrandIdentityGenerator';
import { SloganGenerator } from '@/components/features/SloganGenerator';
import { ColorPaletteGenerator } from '@/components/features/ColorPaletteGenerator';
import { LogoIdeaGenerator } from '@/components/features/LogoIdeaGenerator';
import { Button } from '@/components/ui/button'; // Import Button
import { Input } from '@/components/ui/input'; // Import Input
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
import { Trash, Pencil } from 'lucide-react'; // Import Trash and Pencil icons
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner'; // Import toast

export default function BrandPage({ params }: { params: { id: string } }) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // New state for edit loading
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); // New state for edit dialog
  const [editName, setEditName] = useState(''); // New state for editing name
  const [editDescription, setEditDescription] = useState(''); // New state for editing description
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    const fetchBrand = async () => {
      try {
        const response = await fetch(`/api/brands/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setBrand(data);
          setEditName(data.name); // Initialize edit form with current brand data
          setEditDescription(data.description); // Initialize edit form with current brand data
        } else if (response.status === 401) {
          router.push('/');
        } else {
          setBrand(null);
        }
      } catch (error) {
        console.error('Error fetching brand:', error);
        setBrand(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrand();
  }, [params.id, status, router]);

  const handleDeleteBrand = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/brands/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete brand.');
      }

      toast.success('Brand deleted successfully!');
      router.push('/'); // Redirect to home page after deletion
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast.error('Failed to delete brand.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateBrand = async () => {
    setIsEditing(true);
    try {
      const response = await fetch(`/api/brands/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editName, description: editDescription }),
      });

      if (!response.ok) {
        throw new Error('Failed to update brand.');
      }

      const updatedBrand = await response.json();
      setBrand(updatedBrand); // Update local state with new brand data
      toast.success('Brand updated successfully!');
      setIsEditDialogOpen(false); // Close dialog on success
    } catch (error) {
      console.error('Error updating brand:', error);
      toast.error('Failed to update brand.');
    } finally {
      setIsEditing(false);
    }
  };

  if (isLoading || status === 'loading') {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (!session) {
    router.push('/'); // Redirect to home/login if not authenticated
    return null;
  }

  if (!brand) {
    return <div className="flex justify-center items-center h-full">Brand not found or you don't have access.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{brand.name}</h1>
          <p className="text-lg text-muted-foreground">{brand.description}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => {
                setEditName(brand.name);
                setEditDescription(brand.description);
              }}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Brand
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Brand Details</DialogTitle>
                <DialogDescription>
                  Make changes to your brand's name and description here. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="name" className="text-right">
                    Name
                  </label>
                  <Input
                    id="name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="description" className="text-right">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleUpdateBrand} disabled={isEditing}>
                  {isEditing ? 'Saving...' : 'Save changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : <Trash className="mr-2 h-4 w-4" />}
                {isDeleting ? '' : 'Delete Brand'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your brand and remove all associated data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteBrand} disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Continue'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <BrandIdentityGenerator brand={brand} />
      <SloganGenerator brand={brand} />
      <ColorPaletteGenerator brand={brand} />
      <LogoIdeaGenerator brand={brand} />
    </div>
  );
}
