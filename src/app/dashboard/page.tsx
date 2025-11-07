"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/shared/DashboardLayout";
import { PlusCircle } from "lucide-react"; // Import PlusCircle icon

export default function DashboardPage() {
  const [brands, setBrands] = useState<any[]>([
    // { id: "mock-1", name: "Mock Brand Alpha", description: "AI-powered branding for startups." },
    // { id: "mock-2", name: "Mock Brand Beta", description: "Innovative marketing solutions." },
    // { id: "mock-3", name: "Mock Brand Gamma", description: "Next-gen brand identity." },
  ]); // Empty mock data to test empty state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Comment out useEffect to prevent API call while using mock data
  // useEffect(() => {
  //   const fetchBrands = async () => {
  //     try {
  //       const res = await fetch("/api/brands");
  //       if (!res.ok) {
  //         throw new Error(`HTTP error! status: ${res.status}`);
  //       }
  //       const data = await res.json();
  //       setBrands(data);
  //     } catch (err: any) {
  //       setError(err.message);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchBrands();
  // }, []);

  if (loading) {
    return <div className="p-6 text-center">Loading brands...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Your Brands</h1>
          <Button onClick={() => router.push("/brands/new")}>Create New Brand</Button>
        </div>

        {brands.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg text-gray-500">
            <PlusCircle className="h-12 w-12 mb-4 text-gray-400" />
            <p className="text-xl font-semibold mb-2">No brands created yet</p>
            <p className="mb-4">Get started by creating your first brand identity.</p>
            <Button onClick={() => router.push("/brands/new")}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Brand
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <Card key={brand.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>{brand.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{brand.description}</p>
                  <Button variant="link" className="p-0 mt-2" onClick={() => router.push(`/brand/${brand.id}`)}>
                    View Brand Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}