import { notFound } from "next/navigation";
import { DemoClient } from "./DemoClient";

export default function DemoPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_DEMO !== "true"
  ) {
    notFound();
  }
  return <DemoClient />;
}
