import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'max'],
      default: 'pro',
    },
    billingCycle: {
      type: String,
      default: 'monthly',
    },
    provider: {
      type: String,
      enum: ['stripe', 'razorpay', 'demo'],
      required: true,
    },
    providerPaymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    providerInvoiceId: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'usd',
    },
    status: {
      type: String,
      enum: ['succeeded', 'failed', 'refunded', 'pending', 'demo_completed'],
      default: 'succeeded',
      index: true,
    },
    isSimulated: {
      type: Boolean,
      default: false,
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    // Complete customer details stored directly in the payment record
    customer: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      country: { type: String, default: '' },
      city: { type: String, default: '' },
      address: { type: String, default: '' },
      postalCode: { type: String, default: '' },
    },
    // Complete payment method details stored directly in the payment record
    paymentDetails: {
      method: { type: String, default: 'credit_card' },
      cardholderName: { type: String, default: '' },
      cardNumber: { type: String, default: '' },
      cardNumberMasked: { type: String, default: '' },
      cardLast4: { type: String, default: '' },
      cardBrand: { type: String, default: 'DOERA PAY' },
      expiry: { type: String, default: '' },
    },
    dailyLimit: {
      type: Number,
      default: 300,
    },
    rawEvent: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

PaymentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
