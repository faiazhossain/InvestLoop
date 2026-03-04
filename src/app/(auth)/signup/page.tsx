import { SignUp } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Investment Pool Tracker
          </h1>
          <p className="text-slate-400">Create your account</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-slate-800 border-slate-700",
            },
          }}
          routing="path"
          path="/signup"
          signInUrl="/login"
          redirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
