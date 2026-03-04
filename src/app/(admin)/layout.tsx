"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Menu,
  PiggyBank,
  TrendingUp,
  Users,
  Wallet,
  ArrowLeftRight,
} from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/batches", label: "Batches", icon: PiggyBank },
  { href: "/admin/contributions", label: "Contributions", icon: Wallet },
  { href: "/admin/returns", label: "Returns", icon: TrendingUp },
  { href: "/admin/payouts", label: "Payouts", icon: ArrowLeftRight },
  { href: "/admin/members", label: "Members", icon: Users },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkRole() {
      try {
        const res = await fetch("/api/sync-user", { method: "POST" });
        const data = await res.json();
        if (data.user?.role !== "ADMIN") {
          router.push("/dashboard");
        } else {
          setIsAdmin(true);
        }
      } catch {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    }
    checkRole();
  }, [router]);

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className='min-h-screen bg-slate-50'>
      {/* Desktop Sidebar */}
      <aside className='fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 hidden lg:block'>
        <div className='flex flex-col h-full'>
          <div className='p-6'>
            <Link href='/' className='text-xl font-bold text-white'>
              Investment Tracker
            </Link>
          </div>
          <nav className='flex-1 px-4 space-y-1'>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800",
                  )}
                >
                  <Icon className='h-5 w-5' />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className='p-4 border-t border-slate-800'>
            <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className='lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b'>
        <div className='flex items-center justify-between px-4 py-3'>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant='ghost' size='icon'>
                <Menu className='h-5 w-5' />
              </Button>
            </SheetTrigger>
            <SheetContent side='left' className='w-64 p-0'>
              <div className='flex flex-col h-full bg-slate-900'>
                <div className='p-6'>
                  <Link href='/' className='text-xl font-bold text-white'>
                    Investment Tracker
                  </Link>
                </div>
                <nav className='flex-1 px-4 space-y-1'>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          pathname === item.href
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:text-white hover:bg-slate-800",
                        )}
                      >
                        <Icon className='h-5 w-5' />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className='p-4 border-t border-slate-800'>
                  <UserButton
                    appearance={{ elements: { avatarBox: "h-8 w-8" } }}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <span className='font-semibold'>Admin</span>
          <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
        </div>
      </header>

      {/* Main Content */}
      <main className='lg:pl-64 pt-16 lg:pt-0'>
        <div className='p-6'>{children}</div>
      </main>
    </div>
  );
}
