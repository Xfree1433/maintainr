"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function DemoPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function autoLogin() {
      const result = await signIn("credentials", {
        email: "mark@acme-mfg.com",
        password: "password123",
        redirect: false,
      });

      if (result?.error) {
        setError("Demo login failed. Please run the database seed first.");
      } else {
        router.push("/dashboard");
      }
    }
    autoLogin();
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="rounded-lg bg-red-900/50 border border-red-700 p-6 text-center max-w-md">
          <h2 className="text-lg font-semibold text-red-200 mb-2">Demo Unavailable</h2>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
        <p className="text-gray-400">Starting demo session...</p>
      </div>
    </div>
  );
}
