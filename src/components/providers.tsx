"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // During build time when no key is available, render without Clerk
  // This only affects static generation - runtime will have the key
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return <>{children}</>;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
