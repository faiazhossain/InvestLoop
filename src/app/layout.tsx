import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Investment Pool Tracker",
  description: "Track group investments, contributions, and payouts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang='en'>
        <body className={inter.className}>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}

export async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!dbUser || dbUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/batches", label: "Batches" },
    { href: "/admin/contributions", label: "Contributions" },
    { href: "/admin/returns", label: "Returns" },
    { href: "/admin/payouts", label: "Payouts" },
    { href: "/admin/members", label: "Members" },
  ];

  return (
    <div className='min-h-screen flex flex-col'>
      <nav className='border-b bg-background'>
        <div className='container mx-auto px-4 py-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-6'>
              <Link href='/admin/dashboard' className='text-xl font-bold'>
                Investment Tracker
              </Link>
              <div className='flex gap-2'>
                {navItems.map((item) => (
                  <Button key={item.href} variant='ghost' asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className='flex-1 container mx-auto px-4 py-8'>{children}</main>
    </div>
  );
}
