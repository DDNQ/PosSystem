const prisma = require("../config/prisma");
const crypto = require("crypto");

const { getPaystackConfig } = require("../config/paystack");

const PAYMENT_METHODS = {
  CASH: "CASH",
  CARD: "CARD",
  MOBILE_MONEY: "MOBILE_MONEY",
};

const PAYMENT_PROVIDERS = {
  MANUAL: "MANUAL",
  PAYSTACK: "PAYSTACK",
};

const PAYMENT_STATUSES = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
};

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toCurrencyNumber = (value) => Number(value);

const parsePositiveInteger = (value, fieldName) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    throw createError(`${fieldName} must be a valid positive integer`, 400);
  }

  return parsedValue;
};

const validatePaymentMethod = (method) => {
  if (!method || !PAYMENT_METHODS[method]) {
    throw createError("Payment method must be one of CASH, CARD, or MOBILE_MONEY", 400);
  }

  return method;
};

const validateAmountPaid = (amountPaid) => {
  const numericAmountPaid = Number(amountPaid);

  if (Number.isNaN(numericAmountPaid) || numericAmountPaid <= 0) {
    throw createError("Amount paid must be a valid positive number", 400);
  }

  return numericAmountPaid;
};

const formatPayment = (payment) => ({
  id: payment.id,
  saleId: payment.saleId,
  provider: payment.provider,
  status: payment.status,
  method: payment.method,
  amountPaid: toCurrencyNumber(payment.amountPaid),
  changeGiven: toCurrencyNumber(payment.changeGiven),
  reference: payment.reference,
  providerReference: payment.providerReference,
  sale: payment.sale
    ? {
      id: payment.sale.id,
      subtotal: toCurrencyNumber(payment.sale.subtotal),
      tax: toCurrencyNumber(payment.sale.tax),
      discount: toCurrencyNumber(payment.sale.discount),
      total: toCurrencyNumber(payment.sale.total),
      cashierId: payment.sale.cashierId,
      createdAt: payment.sale.createdAt,
      updatedAt: payment.sale.updatedAt,
    }
    : null,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
});

const getSuccessfulPaymentTotal = async (saleId, tx = prisma) => {
  const paymentAggregate = await tx.payment.aggregate({
    where: {
      saleId,
      status: PAYMENT_STATUSES.SUCCESS,
    },
    _sum: {
      amountPaid: true,
    },
  });

  return toCurrencyNumber(paymentAggregate._sum.amountPaid || 0);
};

const generatePaystackReference = (saleId) =>
  `paystack_sale_${saleId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

const getPaystackCustomerEmail = (sale) =>
  sale.cashier?.email || `sale-${sale.id}@pos.local`;

const convertAmountToSubunit = (amount) => Math.round(toCurrencyNumber(amount) * 100);

const callPaystack = async ({ path, method = "GET", body }) => {
  const { baseUrl, secretKey } = getPaystackConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.status) {
    throw createError(payload?.message || "Paystack request failed", 502);
  }

  return payload.data;
};

const getSaleForPaystack = async (saleId, tx = prisma) => {
  const sale = await tx.sale.findUnique({
    where: { id: saleId },
    include: {
      cashier: {
        select: {
          id: true,
          email: true,
        },
      },
      payments: {
        orderBy: {
          id: "desc",
        },
      },
    },
  });

  if (!sale) {
    throw createError("Sale not found", 404);
  }

  return sale;
};

const ensureSaleIsNotFullyPaid = async (saleId, saleTotal, tx = prisma) => {
  const totalAmountAlreadyPaid = await getSuccessfulPaymentTotal(saleId, tx);

  if (totalAmountAlreadyPaid >= toCurrencyNumber(saleTotal)) {
    throw createError("This sale has already been fully paid", 400);
  }
};

const upsertPendingPaystackPayment = async ({ saleId, amountPaid, reference }, tx = prisma) => {
  const existingPendingPayment = await tx.payment.findFirst({
    where: {
      saleId,
      provider: PAYMENT_PROVIDERS.PAYSTACK,
      status: PAYMENT_STATUSES.PENDING,
    },
    orderBy: {
      id: "desc",
    },
  });

  if (existingPendingPayment) {
    return tx.payment.update({
      where: { id: existingPendingPayment.id },
      data: {
        method: PAYMENT_METHODS.CARD,
        amountPaid,
        changeGiven: 0,
        reference,
        providerReference: reference,
        status: PAYMENT_STATUSES.PENDING,
      },
      include: {
        sale: {
          select: {
            id: true,
            subtotal: true,
            tax: true,
            discount: true,
            total: true,
            cashierId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  return tx.payment.create({
    data: {
      saleId,
      provider: PAYMENT_PROVIDERS.PAYSTACK,
      status: PAYMENT_STATUSES.PENDING,
      method: PAYMENT_METHODS.CARD,
      amountPaid,
      changeGiven: 0,
      reference,
      providerReference: reference,
    },
    include: {
      sale: {
        select: {
          id: true,
          subtotal: true,
          tax: true,
          discount: true,
          total: true,
          cashierId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
};

const markPaymentAsFailed = async (reference, tx = prisma) => {
  if (!reference) {
    return null;
  }

  const existingPayment = await tx.payment.findUnique({
    where: {
      providerReference: reference,
    },
    include: {
      sale: {
        select: {
          id: true,
          subtotal: true,
          tax: true,
          discount: true,
          total: true,
          cashierId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!existingPayment || existingPayment.status === PAYMENT_STATUSES.SUCCESS) {
    return existingPayment;
  }

  return tx.payment.update({
    where: { id: existingPayment.id },
    data: {
      status: PAYMENT_STATUSES.FAILED,
    },
    include: {
      sale: {
        select: {
          id: true,
          subtotal: true,
          tax: true,
          discount: true,
          total: true,
          cashierId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
};

const finalizePaystackPayment = async (reference, paystackTransaction = null) =>
  prisma.$transaction(async (tx) => {
    let payment = await tx.payment.findUnique({
      where: {
        providerReference: reference,
      },
      include: {
        sale: {
          select: {
            id: true,
            subtotal: true,
            tax: true,
            discount: true,
            total: true,
            cashierId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!payment) {
      const saleIdFromMetadata = Number.parseInt(paystackTransaction?.metadata?.saleId, 10);

      if (Number.isNaN(saleIdFromMetadata) || saleIdFromMetadata <= 0) {
        throw createError("No pending payment found for this Paystack reference", 404);
      }

      payment = await tx.payment.create({
        data: {
          saleId: saleIdFromMetadata,
          provider: PAYMENT_PROVIDERS.PAYSTACK,
          status: PAYMENT_STATUSES.PENDING,
          method: PAYMENT_METHODS.CARD,
          amountPaid: toCurrencyNumber(paystackTransaction.amount) / 100,
          changeGiven: 0,
          reference,
          providerReference: reference,
        },
        include: {
          sale: {
            select: {
              id: true,
              subtotal: true,
              tax: true,
              discount: true,
              total: true,
              cashierId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    }

    if (payment.status === PAYMENT_STATUSES.SUCCESS) {
      return payment;
    }

    await ensureSaleIsNotFullyPaid(payment.saleId, payment.sale.total, tx);

    return tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PAYMENT_STATUSES.SUCCESS,
        amountPaid: toCurrencyNumber(paystackTransaction.amount) / 100,
        method: PAYMENT_METHODS.CARD,
        changeGiven: 0,
      },
      include: {
        sale: {
          select: {
            id: true,
            subtotal: true,
            tax: true,
            discount: true,
            total: true,
            cashierId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  });

const createPayment = async ({ saleId, method, amountPaid, reference }) => {
  const parsedSaleId = parsePositiveInteger(saleId, "Sale ID");
  const validatedMethod = validatePaymentMethod(method);
  const validatedAmountPaid = validateAmountPaid(amountPaid);

  if (reference !== undefined && reference !== null && !String(reference).trim()) {
    throw createError("Reference cannot be empty", 400);
  }

  const sale = await prisma.sale.findUnique({
    where: { id: parsedSaleId },
  });

  if (!sale) {
    throw createError("Sale not found", 404);
  }

  const saleTotal = toCurrencyNumber(sale.total);
  const [existingPaymentCount, totalAmountAlreadyPaid] = await Promise.all([
    prisma.payment.count({
      where: {
        saleId: parsedSaleId,
        status: PAYMENT_STATUSES.SUCCESS,
      },
    }),
    getSuccessfulPaymentTotal(parsedSaleId),
  ]);

  if (totalAmountAlreadyPaid >= saleTotal) {
    throw createError("This sale has already been fully paid", 400);
  }

  if (existingPaymentCount > 0) {
    throw createError("Split payments are not supported. This sale already has a payment", 400);
  }

  let changeGiven = 0;

  if (validatedMethod === PAYMENT_METHODS.CASH) {
    if (validatedAmountPaid < saleTotal) {
      throw createError("Amount paid cannot be less than sale total for cash payments", 400);
    }

    changeGiven = validatedAmountPaid - saleTotal;
  }

  const payment = await prisma.payment.create({
    data: {
      saleId: parsedSaleId,
      provider: PAYMENT_PROVIDERS.MANUAL,
      status: PAYMENT_STATUSES.SUCCESS,
      method: validatedMethod,
      amountPaid: validatedAmountPaid,
      changeGiven,
      reference: reference ? String(reference).trim() : null,
    },
    include: {
      sale: {
        select: {
          id: true,
          subtotal: true,
          tax: true,
          discount: true,
          total: true,
          cashierId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return formatPayment(payment);
};

const initializePaystackPayment = async ({ saleId }) => {
  const parsedSaleId = parsePositiveInteger(saleId, "Sale ID");
  const sale = await getSaleForPaystack(parsedSaleId);

  await ensureSaleIsNotFullyPaid(parsedSaleId, sale.total);

  const reference = generatePaystackReference(parsedSaleId);
  const { callbackUrl } = getPaystackConfig();
  const transaction = await callPaystack({
    path: "/transaction/initialize",
    method: "POST",
    body: {
      email: getPaystackCustomerEmail(sale),
      amount: convertAmountToSubunit(sale.total),
      reference,
      callback_url: callbackUrl,
      metadata: {
        saleId: sale.id,
      },
    },
  });

  const payment = await upsertPendingPaystackPayment({
    saleId: parsedSaleId,
    amountPaid: toCurrencyNumber(sale.total),
    reference,
  });

  return {
    authorizationUrl: transaction.authorization_url,
    accessCode: transaction.access_code,
    reference,
    payment: formatPayment(payment),
  };
};

const verifyPaystackPayment = async (reference) => {
  if (!reference || !String(reference).trim()) {
    throw createError("Reference is required", 400);
  }

  const normalizedReference = String(reference).trim();
  const transaction = await callPaystack({
    path: `/transaction/verify/${encodeURIComponent(normalizedReference)}`,
  });

  if (transaction.status !== "success") {
    await markPaymentAsFailed(normalizedReference);
    throw createError("Paystack transaction is not successful", 400);
  }

  const payment = await finalizePaystackPayment(normalizedReference, transaction);

  return {
    message: "Payment verified successfully",
    reference: normalizedReference,
    status: payment.status,
    saleId: payment.saleId,
    amountPaid: toCurrencyNumber(payment.amountPaid),
    payment: formatPayment(payment),
  };
};

const verifyPaystackWebhookSignature = (rawBody, signature) => {
  if (!rawBody || !signature) {
    return false;
  }

  const { secretKey } = getPaystackConfig();
  const expectedSignature = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");

  return expectedSignature === signature;
};

const handlePaystackWebhook = async ({ rawBody, signature, event }) => {
  if (!verifyPaystackWebhookSignature(rawBody, signature)) {
    throw createError("Invalid Paystack webhook signature", 401);
  }

  if (!event?.data?.reference) {
    return {
      received: true,
      processed: false,
    };
  }

  if (event.event === "charge.failed") {
    await markPaymentAsFailed(event.data.reference);

    return {
      received: true,
      processed: true,
      reference: event.data.reference,
      status: PAYMENT_STATUSES.FAILED,
    };
  }

  if (event.event !== "charge.success") {
    return {
      received: true,
      processed: false,
    };
  }

  const verification = await verifyPaystackPayment(event.data.reference);

  return {
    received: true,
    processed: true,
    reference: verification.reference,
    status: verification.status,
  };
};

module.exports = {
  createPayment,
  handlePaystackWebhook,
  initializePaystackPayment,
  verifyPaystackPayment,
};
