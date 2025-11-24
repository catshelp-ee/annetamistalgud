import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';

export async function handlePaymentNotification(orderToken: string) {
  let secretKey = process.env.MONTONIO_SANDBOX_SECRET_KEY;
  if (process.env.NODE_ENV === 'production') {
    secretKey = process.env.MONTONIO_SECRET_KEY;
  }
  const decoded = jwt.verify(orderToken, secretKey as string) as {
    paymentStatus: string;
    merchant_reference: string;
  };

  if (decoded.paymentStatus === 'PAID') {
    // Find the donation(s) that need to be marked as paid
    const donations = await prisma.donation.findMany({
      where: {
        montonioMerchantReference: decoded.merchant_reference,
        paid: false, // Only get unpaid donations to avoid double-counting
      },
    });

    // Update the donations to paid
    await prisma.donation.updateMany({
      where: {
        montonioMerchantReference: decoded.merchant_reference,
      },
      data: {
        paid: true,
      },
    });

    // Increment the goal's current amount for each newly paid donation
    for (const donation of donations) {
      await prisma.goal.update({
        where: { id: donation.goalID },
        data: {
          current: {
            increment: donation.amount
          }
        }
      });
    }
  }
}
