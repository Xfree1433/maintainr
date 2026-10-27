import { notFound } from "next/navigation";
import { DemoClient } from "./DemoClient";
import { demoCredentials } from "./config";

// Read ENABLE_DEMO at request time; a static prerender would bake in the
// build machine's env.
export const dynamic = "force-dynamic";

export default function DemoPage() {
  if (!demoCredentials()) notFound();
  return <DemoClient />;
}
