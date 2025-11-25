import jwt from 'jsonwebtoken';
import axios from 'axios';

interface CreateOrderPayload {
  preferredBank: string;
  preferredRegion: string;
  donationType: string;
  donationTotal: number;
}

export const createMontonioOrder = async ({
  preferredBank,
  preferredRegion,
  donationType,
  donationTotal,
}: CreateOrderPayload): Promise<{
  paymentUrl: string;
  merchantReference: string;
}> => {
  const merchantReference = `${donationType}-${crypto.randomUUID()}`;

  let accessKey = process.env.MONTONIO_SANDBOX_ACCESS_KEY;
  let secretKey = process.env.MONTONIO_SANDBOX_SECRET_KEY;
  let url = process.env.MONTONIO_SANDBOX_API_URL;
  if (process.env.NODE_ENV === 'production') {
    accessKey = process.env.MONTONIO_ACCESS_KEY;
    secretKey = process.env.MONTONIO_SECRET_KEY;
    url = process.env.MONTONIO_API_URL;
  }
  // Use a dummy webhook URL for local development if NOTIFY_URL is localhost
  const notifyUrl = process.env.NOTIFY_URL || '';
  const isLocalhost = notifyUrl.includes('localhost') || notifyUrl.includes('127.0.0.1');
  const notificationUrl = isLocalhost
    ? 'https://webhook.site/00000000-0000-0000-0000-000000000000' // Dummy URL for local dev
    : `${notifyUrl}/api/paymentNotify`;

  const payload = {
    accessKey: accessKey,
    merchantReference,
    returnUrl: `${process.env.BASE_URL}/payment-return`,
    notificationUrl,
    grandTotal: donationTotal,
    currency: 'EUR',
    locale: 'et',
    payment: {
      method: 'paymentInitiation',
      amount: donationTotal,
      currency: 'EUR',
      methodOptions: {
        paymentDescription: donationType,
        preferredCountry: preferredRegion,
        preferredProvider: preferredBank,
      },
    },
  };

  const token = jwt.sign(payload, secretKey as string, {
    algorithm: 'HS256',
    expiresIn: '10m',
  });

  try {
    const response = await axios.post(`${url}/api/orders`, {
      data: token,
    });
    return { paymentUrl: response.data.paymentUrl, merchantReference };
  } catch (error) {
    console.error('Montonio Error:\n', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Montonio Response Status:', error.response.status);
      console.error('Montonio Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`Failed to create Montonio order: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
