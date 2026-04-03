import { Wrench } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-orange-600 p-12 text-white">
        <div className="flex items-center gap-3">
          <Wrench className="h-8 w-8" />
          <span className="text-2xl font-bold">Maintainr</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Predictive Maintenance
            <br />
            Intelligence
          </h1>
          <p className="mt-4 text-lg text-orange-100">
            Predict equipment failures before they happen. Track assets,
            schedule maintenance, and maximize uptime.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              "Asset health monitoring",
              "Predictive analytics",
              "Work order management",
              "Preventive scheduling",
              "Spare parts tracking",
              "Real-time sensor data",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-orange-100">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-300" />
                {feature}
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-orange-200">
          Built for manufacturers who can&apos;t afford downtime
        </p>
      </div>

      {/* Right panel - auth form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        {children}
      </div>
    </div>
  );
}
