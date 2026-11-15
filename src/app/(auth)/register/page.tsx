"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      organizationName: formData.get("organizationName") as string,
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email: body.email,
      password: body.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Account created but sign-in failed. Please log in.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <Card className="w-full max-w-md rounded-2xl border-[#e3dbd2] bg-[#ffffff] shadow-[0_24px_48px_-24px_rgba(33,16,6,0.35)] dark:border-white/10 dark:bg-[#211812]">
      <CardHeader className="text-center pt-8">
        <CardTitle className="text-3xl font-semibold tracking-[-0.03em] text-[#1a120d] dark:text-white">Start your free trial</CardTitle>
        <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#e07122]" />
        <CardDescription>Create your Maintainr account in 30 seconds</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700">Your Name</label>
            <Input name="name" placeholder="Jane Smith" required minLength={2} className="mt-1 h-11 border-[#d1c6ba] bg-[#ffffff] focus-visible:ring-[#e07122] dark:border-white/15 dark:bg-[#150e0a]" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Company Name</label>
            <Input name="organizationName" placeholder="Acme Manufacturing" required minLength={2} className="mt-1 h-11 border-[#d1c6ba] bg-[#ffffff] focus-visible:ring-[#e07122] dark:border-white/15 dark:bg-[#150e0a]" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <Input name="email" type="email" placeholder="you@company.com" required className="mt-1 h-11 border-[#d1c6ba] bg-[#ffffff] focus-visible:ring-[#e07122] dark:border-white/15 dark:bg-[#150e0a]" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <Input name="password" type="password" placeholder="Min. 8 characters" required minLength={8} className="mt-1 h-11 border-[#d1c6ba] bg-[#ffffff] focus-visible:ring-[#e07122] dark:border-white/15 dark:bg-[#150e0a]" />
          </div>
          <Button type="submit" className="h-11 w-full rounded-full bg-[#3b281d] text-white hover:bg-[#2a1c14] dark:bg-[#e07122] dark:text-[#1a120d] dark:hover:bg-[#e5853f]" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[#a14c14] hover:underline dark:text-[#e9a371]">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
