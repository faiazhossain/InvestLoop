import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
          Investment Pool Tracker
        </h1>
        <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl">
          Track group investments, manage contributions, and calculate payouts
          with ease. Transparent and simple investment pool management.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <SignedOut>
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Create Account
              </Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <Button size="lg" className="w-full sm:w-auto">
                Go to Dashboard
              </Button>
            </Link>
          </SignedIn>
        </div>
      </div>
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 px-4 max-w-4xl">
        <FeatureCard
          title="Track Contributions"
          description="Record and monitor all member contributions across investment batches"
        />
        <FeatureCard
          title="Calculate Returns"
          description="Automatically calculate profit distribution based on contribution shares"
        />
        <FeatureCard
          title="Manage Payouts"
          description="Handle cashouts and reinvestments with transparent tracking"
        />
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}
