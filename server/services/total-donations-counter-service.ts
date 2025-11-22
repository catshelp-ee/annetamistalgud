import { prisma } from '../prisma';

/**
 * Get the total donations counter
 * Returns total amount and count of all paid donations
 */
export const getTotalDonationsCounter = async () => {
  // Get or create the counter record (there should only be one row with id=1)
  let counter = await prisma.totalDonationsCounter.findFirst({
    where: { id: 1 },
  });

  // If counter doesn't exist, create it
  if (!counter) {
    counter = await prisma.totalDonationsCounter.create({
      data: {
        id: 1,
        totalAmount: 0,
        totalCount: 0,
      },
    });
  }

  return {
    totalAmount: counter.totalAmount,
    totalCount: counter.totalCount,
    lastUpdated: counter.lastUpdated,
  };
};

/**
 * Increment the total donations counter
 * This should be called when a donation is marked as paid
 */
export const incrementTotalDonations = async (amount: number) => {
  // Use upsert to handle the case where the counter doesn't exist yet
  await prisma.totalDonationsCounter.upsert({
    where: { id: 1 },
    update: {
      totalAmount: {
        increment: amount,
      },
      totalCount: {
        increment: 1,
      },
    },
    create: {
      id: 1,
      totalAmount: amount,
      totalCount: 1,
    },
  });
};

/**
 * Initialize or sync the total donations counter from existing paid donations
 * This is useful for backfilling data or verifying the counter is accurate
 * WARNING: This will overwrite the current counter value
 */
export const syncTotalDonationsCounter = async () => {
  // Calculate total from all paid donations
  const result = await prisma.donation.aggregate({
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
    where: {
      paid: true,
    },
  });

  const totalAmount = result._sum.amount || 0;
  const totalCount = result._count.id || 0;

  // Update or create the counter
  await prisma.totalDonationsCounter.upsert({
    where: { id: 1 },
    update: {
      totalAmount,
      totalCount,
    },
    create: {
      id: 1,
      totalAmount,
      totalCount,
    },
  });

  return {
    totalAmount,
    totalCount,
  };
};