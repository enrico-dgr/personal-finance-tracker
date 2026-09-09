import 'dotenv/config';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const deletedTransactions = await prisma.transaction.deleteMany();
  const deletedAnonymousRules = await prisma.merchantRule.deleteMany({
    where: { userId: null }
  });

  console.log(
    `Seed reset completed: removed ${deletedTransactions.count} historical transactions and ${deletedAnonymousRules.count} anonymous rules.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
