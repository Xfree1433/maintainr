import { Wrench } from "lucide-react";

// PF9 brand (2026-11): espresso panel + copper accent, matching the store at
// store.plainspokenfoundrynine.com. Copy is unchanged from the original.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#f7f4f1] dark:bg-[#150e0a]">
      {/* Left panel - branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#211006] p-12 text-white"
        style={{
          backgroundImage:
            "radial-gradient(48rem 28rem at 90% -10%, rgba(224,113,34,.32), transparent 62%), radial-gradient(36rem 22rem at -10% 110%, rgba(224,113,34,.14), transparent 60%)",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e07122] text-[#1a120d]">
            <Wrench className="h-6 w-6" />
          </span>
          <span className="text-2xl font-semibold tracking-tight">Maintainr</span>
        </div>
        <div>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.04em]">
            Predictive Maintenance
            <br />
            <span className="text-[#e5853f]">Intelligence</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[#d1c6ba]">
            Predict equipment failures before they happen. Track assets,
            schedule maintenance, and maximize uptime.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/15 pt-8">
            {[
              "Asset health monitoring",
              "Predictive analytics",
              "Work order management",
              "Preventive scheduling",
              "Spare parts tracking",
              "Real-time sensor data",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-[#efe9e3]">
                <div className="h-1.5 w-1.5 rounded-full bg-[#e07122]" />
                {feature}
              </div>
            ))}
          </div>
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#a3978b]">
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
