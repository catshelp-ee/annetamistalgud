import { Goal } from '../../types/donations';
import { prisma } from '../prisma';
import { getHoiukoduAmount } from './google/google-sheets-service';

/**
 * Get the Goal ID from the donation type string
 */
export const getDonationTypeId = async (
  donationType: string
): Promise<number | null> => {
  const goal = await prisma.goal.findFirst({
    where: {
      code: {
        equals: donationType,
      },
    },
    select: { id: true },
  });

  return goal?.id || null;
};

/**
 * Add a donation to the database
 */
export const addDonation = async (
  donationType: string,
  amount: number,
  merchantReference: string
) => {
  const goalId = await getDonationTypeId(donationType);
  if (!goalId) return;

  await prisma.donation.create({
    data: {
      goalID: goalId,
      amount,
      montonioMerchantReference: merchantReference,
      paid: false,
    },
  });
};

/**
 * Get donation data for all goals
 */
export async function getDonationData(refreshCache = false): Promise<Goal[]> {
  // Fetch all goals
  const goals = await prisma.goal.findMany();

  // Count donations for each goal (only paid ones)
  const donationsSummary = await prisma.donation.groupBy({
    by: ['goalID'],
    _count: {
      _all: true,
    },
    where: {
      paid: true,
    },
  });

  const result: Goal[] = [];

  for (const goal of goals) {
    let donation = donationsSummary.find(d => d.goalID === goal.id);

    let amount = goal.current;
    // Special case: "hoiukodu" goal pulls live data from Google Sheets
    if (goal.code.toLowerCase() === 'hoiukodu') {
      amount = await getHoiukoduAmount(refreshCache);
    }
    result.push({
      id: goal.id,
      amountDonated: amount,
      donationGoal: goal.target,
      color: goal.color,
      name: goal.name,
      code: goal.code,
      unit: goal.unit,
      link: goal.link,
      message: goal.message,
      amountOfDonations: donation?._count._all ?? 0,
      description: goal.description,
    });
  }

  return result;
}

/**
 * Get vet bills in format suitable for frontend
 */
export async function getVetBills() {
  const goals = await prisma.goal.findMany({
    where: {
      code: {
        not: 'hoiukodu' // Exclude special goals
      }
    },
    orderBy: { id: 'asc' }
  });

  return goals.map(goal => ({
    id: goal.id,
    name: goal.name,
    issue: goal.issue || '',
    current: goal.current,
    goal: goal.target,
    color: goal.color
  }));
}
