"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <Card className="w-full max-w-md rounded-2xl border-[#e3dbd2] bg-[#ffffff] shadow-[0_24px_48px_-24px_rgba(33,16,6,0.35)] dark:border-white/10 dark:bg-[#211812]">
      <CardHeader className="text-center pt-8">
        <CardTitle className="text-3xl font-semibold tracking-[-0.03em] text-[#1a120d] dark:text-white">Welcome back</CardTitle>
        <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#e07122]" />
        <CardDescription>Sign in to your Maintainr account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <Input
              name="email"
              type="email"
              placeholder="you@company.com"
              required
              className="mt-1 h-11 border-[#d1c6ba] bg-[#ffffff] focus-visible:ring-[#e07122] dark:border-white/15 dark:bg-[#150e0a]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
              className="mt-1 h-11 border-[#d1c6ba] bg-[#ffffff] focus-visible:ring-[#e07122] dark:border-white/15 dark:bg-[#150e0a]"
            />
          </div>
          <Button type="submit" className="h-11 w-full rounded-full bg-[#3b281d] text-white hover:bg-[#2a1c14] dark:bg-[#e07122] dark:text-[#1a120d] dark:hover:bg-[#e5853f]" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-[#a14c14] hover:underline dark:text-[#e9a371]">
              Start free trial
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
