const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getPaystackConfig = () => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const publicKey = process.env.PAYSTACK_PUBLIC_KEY;
  const callbackUrl = process.env.PAYSTACK_CALLBACK_URL;

  if (!secretKey) {
    throw createError("PAYSTACK_SECRET_KEY is not configured", 500);
  }

  if (!publicKey) {
    throw createError("PAYSTACK_PUBLIC_KEY is not configured", 500);
  }

  if (!callbackUrl) {
    throw createError("PAYSTACK_CALLBACK_URL is not configured", 500);
  }

  return {
    baseUrl: "https://api.paystack.co",
    secretKey,
    publicKey,
    callbackUrl,
  };
};

module.exports = {
  getPaystackConfig,
};
