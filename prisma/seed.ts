import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a sample admin user (you'll need to update the clerkId with a real one from Clerk)
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      clerkId: "user_sample_admin_id",
      email: "admin@example.com",
      name: "Admin User",
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("Created admin user:", admin);

  // Create a sample member
  const member = await prisma.user.upsert({
    where: { email: "member@example.com" },
    update: {},
    create: {
      clerkId: "user_sample_member_id",
      email: "member@example.com",
      name: "Sample Member",
      role: "MEMBER",
      isActive: true,
    },
  });

  console.log("Created member user:", member);

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
