import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = user.emailAddresses[0]?.emailAddress;

    if (!email) {
      return NextResponse.json(
        { error: "No email found" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (existingUser) {
      return NextResponse.json({ user: existingUser });
    }

    // Check if this is the first user - make them admin
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? "ADMIN" : "MEMBER";

    const newUser = await prisma.user.create({
      data: {
        clerkId: user.id,
        email,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || null,
        role,
      },
    });

    return NextResponse.json({ user: newUser });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      { error: "Failed to sync user" },
      { status: 500 }
    );
  }
}
