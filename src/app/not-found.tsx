import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl text-slate-300 mb-6">Page Not Found</h2>
        <p className="text-slate-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
