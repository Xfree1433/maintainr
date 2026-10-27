"use client";

import { useEffect, useState } from "react";
import { startDemo } from "./actions";

export function DemoClient() {
  const [error, setError] = useState("");

  useEffect(() => {
    startDemo()
      .then((result) => {
        if (result.ok) window.location.href = "/dashboard";
        else setError("Demo login failed. Please try again later.");
      })
      .catch(() => setError("Demo login failed. Please try again later."));
  }, []);

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
