import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Shield,
  Lock,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Info,
  Building,
  Mail,
  User as UserIcon,
  Phone,
  MapPin,
  Globe,
  Receipt,
  Zap,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './SubscriptionCheckout.css';

const PLAN_DATA = {
  pro: {
    key: 'pro',
    name: 'DOERA PRO',
    tagline: 'High-throughput intelligence for creators & power users',
    monthlyPrice: 12,
    annualPrice: 10,
    dailyLimit: 300,
    badge: 'POPULAR CHOICE',
    features: [
      '300 Requests / Day (Auto-resets daily at 00:00 UTC)',
      'Live Web Research & Real-time Citations',
      'Autonomous Multi-Agent Swarm Orchestration',
      'Extended Long-term Memory & Multi-File Analysis',
    ],
  },
  max: {
    key: 'max',
    name: 'DOERA MAX',
    tagline: 'Maximum execution power, n8n automations & deep research',
    monthlyPrice: 25,
    annualPrice: 20,
    dailyLimit: 500,
    badge: 'ENTERPRISE POWER',
    features: [
      '500 Requests / Day (Auto-resets daily at 00:00 UTC)',
      'Deep Research & Complex Multi-Source Synthesis',
      'Scheduled n8n Background Automations',
      'Zero-Queue Priority Multi-Agent Swarm',
    ],
  },
};

const COUNTRIES = [
  'United States',
  'India',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Singapore',
  'Japan',
  'United Arab Emirates',
  'Netherlands',
  'Brazil',
  'Other',
];

export const SubscriptionCheckout = ({
  plan: initialPlan = 'pro',
  billingCycle: initialCycle = 'monthly',
  onBack,
  onSuccess,
  onClose,
}) => {
  const { user } = useAuth();

  const [selectedPlan] = useState(
    initialPlan === 'max' ? 'max' : 'pro'
  );
  const [billingCycle] = useState(initialCycle || 'monthly');

  // Multi-step Wizard: 'details' (Step 1) -> 'payment' (Step 2) -> 'processing' -> 'confirmation'
  const [currentStep, setCurrentStep] = useState('details');

  // Customer Information (Step 1)
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    country: 'United States',
    city: '',
    address: '',
    postalCode: '',
  });

  const [errors, setErrors] = useState({});

  // Payment Form State (Step 2 - Simulated in memory only)
  const [paymentType, setPaymentType] = useState('credit'); // 'credit' | 'debit'
  const [cardData, setCardData] = useState({
    cardholderName: (user?.name || '').toUpperCase(),
    cardNumber: '',
    expiry: '',
    cvv: '',
  });
  const [showCvv, setShowCvv] = useState(false);

  // Processing & Confirmation State
  const [processingStage, setProcessingStage] = useState(0);
  const [demoReceipt, setDemoReceipt] = useState(null);
  const [serverError, setServerError] = useState(null);

  const planInfo = PLAN_DATA[selectedPlan] || PLAN_DATA.pro;
  const currentPrice =
    billingCycle === 'annual' ? planInfo.annualPrice : planInfo.monthlyPrice;

  // Auto-populate user if loaded late
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name || '',
        email: prev.email || user.email || '',
      }));
      setCardData((prev) => ({
        ...prev,
        cardholderName: prev.cardholderName || (user.name || '').toUpperCase(),
      }));
    }
  }, [user]);

  // Dynamic Card Brand Detection
  const getCardBrand = (number) => {
    const clean = (number || '').replace(/\s+/g, '');
    if (/^4/.test(clean)) return { name: 'VISA', color: '#1A1F71' };
    if (/^(5[1-5]|2[2-7])/.test(clean)) return { name: 'MASTERCARD', color: '#EB001B' };
    if (/^3[47]/.test(clean)) return { name: 'AMEX', color: '#006FCF' };
    return { name: 'DOERA PAY', color: '#F52FA8' };
  };

  const cardBrand = getCardBrand(cardData.cardNumber);

  // Form Field Change Handlers
  const handleInputChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleCardNumberChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    let formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardData((prev) => ({ ...prev, cardNumber: formatted }));
    if (errors.cardNumber) {
      setErrors((prev) => ({ ...prev, cardNumber: null }));
    }
  };

  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    let formatted = raw;
    if (raw.length >= 3) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}`;
    }
    setCardData((prev) => ({ ...prev, expiry: formatted }));
    if (errors.expiry) {
      setErrors((prev) => ({ ...prev, expiry: null }));
    }
  };

  const handleCvvChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardData((prev) => ({ ...prev, cvv: raw }));
    if (errors.cvv) {
      setErrors((prev) => ({ ...prev, cvv: null }));
    }
  };

  // 1-Click Autofill for Details
  const handleAutofillDetails = () => {
    setFormData({
      fullName: user?.name || 'Alex Morgan',
      email: user?.email || 'alex.morgan@example.com',
      phone: '+1 (555) 349-8812',
      country: 'United States',
      city: 'San Francisco',
      address: '500 Howard Street, Suite 400',
      postalCode: '94105',
    });
    setErrors({});
  };

  // 1-Click Autofill for Payment
  const handleAutofillCard = () => {
    setCardData({
      cardholderName: (formData.fullName || user?.name || 'ALEX MORGAN').toUpperCase(),
      cardNumber: '4242 4242 4242 4242',
      expiry: '12/28',
      cvv: '888',
    });
    setErrors({});
  };

  // Validation for Step 1 (Customer Details)
  const validateDetailsStep = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = 'Full name is required';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is required';
    } else if (formData.phone.replace(/\D/g, '').length < 7) {
      errs.phone = 'Please enter a valid phone number';
    }

    if (!formData.city.trim()) errs.city = 'City is required';
    if (!formData.address.trim()) errs.address = 'Billing address is required';
    if (!formData.postalCode.trim()) errs.postalCode = 'Postal code is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 1 -> Step 2
  const handleGoToPayment = (e) => {
    e.preventDefault();
    if (validateDetailsStep()) {
      if (!cardData.cardholderName.trim()) {
        setCardData((prev) => ({
          ...prev,
          cardholderName: (formData.fullName || 'CUSTOMER').toUpperCase(),
        }));
      }
      setCurrentStep('payment');
    }
  };

  // Validation for Step 2 (Card Details)
  const validateCardStep = () => {
    const errs = {};
    const cleanCard = cardData.cardNumber.replace(/\s+/g, '');

    if (!cardData.cardholderName.trim()) {
      errs.cardholderName = 'Name on card is required';
    }

    if (!cleanCard) {
      errs.cardNumber = 'Card number is required';
    } else if (cleanCard.length < 12) {
      errs.cardNumber = 'Card number must be at least 12 digits';
    }

    if (!cardData.expiry) {
      errs.expiry = 'MM/YY required';
    } else {
      const parts = cardData.expiry.split('/');
      const month = parseInt(parts[0], 10);
      if (parts.length < 1 || isNaN(month) || month < 1 || month > 12) {
        errs.expiry = 'Valid MM/YY required';
      }
    }

    if (!cardData.cvv || cardData.cvv.length < 2) {
      errs.cvv = 'Security code required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 Submission (Simulated Payment)
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validateCardStep()) return;

    setCurrentStep('processing');
    setProcessingStage(1);

    setTimeout(() => setProcessingStage(2), 600);
    setTimeout(() => setProcessingStage(3), 1200);

    const demoTxnId = `DEMO-TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    try {
      const payload = {
        plan: selectedPlan,
        billingCycle,
        isDemo: true,
        demoTransactionId: demoTxnId,
        customerDetails: {
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          country: formData.country,
          city: formData.city,
          address: formData.address,
          postalCode: formData.postalCode,
        },
        paymentDetails: {
          method: paymentType === 'debit' ? 'debit_card' : 'credit_card',
          cardholderName: cardData.cardholderName,
          cardNumber: cardData.cardNumber,
          cardNumberMasked: cardData.cardNumber
            ? `•••• •••• •••• ${cardData.cardNumber.replace(/\s+/g, '').slice(-4)}`
            : '•••• 4242',
          cardLast4: cardData.cardNumber
            ? cardData.cardNumber.replace(/\s+/g, '').slice(-4)
            : '4242',
          cardBrand: cardBrand.name,
          expiry: cardData.expiry,
        },
      };

      const res = await api.post('/subscription/upgrade', payload);

      setTimeout(() => {
        setDemoReceipt({
          transactionId: demoTxnId,
          plan: selectedPlan,
          planName: planInfo.name,
          dailyLimit: planInfo.dailyLimit,
          amount: currentPrice,
          currency: 'USD',
          billingCycle,
          customerName: formData.fullName,
          customerEmail: formData.email,
          timestamp: new Date().toISOString(),
          cardLast4: (cardData.cardNumber.replace(/\s+/g, '').slice(-4) || '4242'),
          cardBrand: cardBrand.name,
          resData: res.data,
        });

        // Clear card info from local state
        setCardData({
          cardholderName: '',
          cardNumber: '',
          expiry: '',
          cvv: '',
        });

        setCurrentStep('confirmation');

        if (onSuccess) {
          onSuccess(selectedPlan, res.data?.usage);
        }
      }, 1800);
    } catch (err) {
      console.error('[DOERA Checkout] Demo activation failed:', err);
      setServerError(
        err.response?.data?.error || 'Simulated checkout failed. Please try again.'
      );
      setCurrentStep('payment');
    }
  };

  return (
    <div className="doera-wizard-card animate-fadeIn">
      {/* 1. TOP HEADER & STEP INDICATOR */}
      <div className="wizard-top-header">
        <div className="wizard-header-row">
          <div className="wizard-brand-pill">
            <span className="wizard-sparkle-dot" />
            <span className="brand-name">DOERA AI</span>
            <span className="brand-divider">/</span>
            <span className="plan-badge-highlight">{planInfo.name}</span>
          </div>

          <div className="wizard-header-right">
            <div className="price-tag-compact">
              <span className="amt">${currentPrice}</span>
              <span className="cycle">/month</span>
            </div>
            {onClose && (
              <button
                type="button"
                className="wizard-close-btn"
                onClick={onClose}
                aria-label="Close checkout"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Progress Step Indicator (Only for Step 1 & 2) */}
        {(currentStep === 'details' || currentStep === 'payment') && (
          <div className="wizard-stepper-bar">
            <div className={`stepper-node ${currentStep === 'details' ? 'active' : 'completed'}`}>
              <div className="node-icon">
                {currentStep === 'payment' ? <Check size={12} /> : <span>1</span>}
              </div>
              <span className="node-label">Customer Details</span>
            </div>

            <div className={`stepper-line ${currentStep === 'payment' ? 'active' : ''}`} />

            <div className={`stepper-node ${currentStep === 'payment' ? 'active' : ''}`}>
              <div className="node-icon">
                <span>2</span>
              </div>
              <span className="node-label">Payment Method</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. BODY CONTENT ACCORDING TO CURRENT STEP */}
      <div className="wizard-body-content">
        {/* ================= STEP 1: CUSTOMER DETAILS ================= */}
        {currentStep === 'details' && (
          <form onSubmit={handleGoToPayment} className="wizard-step-form" noValidate>
            {/* Alert Strip - Clean Single Line */}
            <div className="wizard-sandbox-notice">
              <ShieldAlert size={14} className="notice-icon" />
              <span className="notice-text">
                No real money will be charged. Please enter your customer details to proceed to the simulated payment step.
              </span>
            </div>

            {/* Step Header */}
            <div className="step-intro-row">
              <div className="intro-titles">
                <h3 className="step-title">Customer & Billing Information</h3>
                <p className="step-subtitle">
                  Configure your authorized account details for your {planInfo.dailyLimit}-request daily allowance.
                </p>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="wizard-grid-2col">
              {/* Full Name */}
              <div className="w-field-group col-span-2">
                <label>
                  <UserIcon size={13} /> Full Name <span className="req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={errors.fullName ? 'has-error' : ''}
                  autoFocus
                />
                {errors.fullName && <span className="w-error-msg">{errors.fullName}</span>}
              </div>

              {/* Email Address */}
              <div className="w-field-group">
                <label>
                  <Mail size={13} /> Email Address <span className="req">*</span>
                </label>
                <input
                  type="email"
                  placeholder="alex@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={errors.email ? 'has-error' : ''}
                />
                {errors.email && <span className="w-error-msg">{errors.email}</span>}
              </div>

              {/* Phone Number */}
              <div className="w-field-group">
                <label>
                  <Phone size={13} /> Phone Number <span className="req">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={errors.phone ? 'has-error' : ''}
                />
                {errors.phone && <span className="w-error-msg">{errors.phone}</span>}
              </div>

              {/* Country */}
              <div className="w-field-group">
                <label>
                  <Globe size={13} /> Country <span className="req">*</span>
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-select"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div className="w-field-group">
                <label>
                  <Building size={13} /> City <span className="req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="City name"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={errors.city ? 'has-error' : ''}
                />
                {errors.city && <span className="w-error-msg">{errors.city}</span>}
              </div>

              {/* Billing Address */}
              <div className="w-field-group col-span-2">
                <label>
                  <MapPin size={13} /> Billing Address <span className="req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Street address or P.O. Box"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className={errors.address ? 'has-error' : ''}
                />
                {errors.address && <span className="w-error-msg">{errors.address}</span>}
              </div>

              {/* Postal Code */}
              <div className="w-field-group col-span-2">
                <label>
                  Postal Code / ZIP <span className="req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 94105"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  className={errors.postalCode ? 'has-error' : ''}
                />
                {errors.postalCode && <span className="w-error-msg">{errors.postalCode}</span>}
              </div>
            </div>

            {/* Step 1 Actions */}
            <div className="wizard-action-footer">
              {onBack ? (
                <button
                  type="button"
                  className="btn-wizard-secondary"
                  onClick={onBack}
                >
                  <ArrowLeft size={15} />
                  <span>Back to Plans</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                className="btn-wizard-primary"
              >
                <span>Continue to Payment</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 2: PAYMENT DETAILS ================= */}
        {currentStep === 'payment' && (
          <form onSubmit={handleConfirmPayment} className="wizard-step-form" noValidate>
            {/* Mini Plan Summary Banner */}
            <div className="wizard-plan-summary-banner">
              <div className="banner-plan-left">
                <Zap size={16} className="text-pink" />
                <span className="b-plan-name">{planInfo.name}</span>
                <span className="b-plan-dot">•</span>
                <span className="b-plan-quota">{planInfo.dailyLimit} Requests/Day</span>
              </div>
              <div className="banner-plan-right">
                <span className="b-plan-total">Total Due: <strong>${currentPrice}.00 USD</strong></span>
                <span className="b-plan-tax">Tax: $0.00 (Demo)</span>
              </div>
            </div>

            {serverError && (
              <div className="wizard-error-banner animate-fadeIn">
                <AlertCircle size={15} />
                <span>{serverError}</span>
              </div>
            )}

            {/* Header */}
            <div className="step-intro-row">
              <div className="intro-titles">
                <h3 className="step-title">Simulated Payment Method</h3>
                <p className="step-subtitle">
                  Card preview updates in real-time. No real money will be billed.
                </p>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="payment-type-pills">
              <button
                type="button"
                className={`type-pill ${paymentType === 'credit' ? 'active' : ''}`}
                onClick={() => setPaymentType('credit')}
              >
                <CreditCard size={14} />
                <span>Credit Card</span>
              </button>
              <button
                type="button"
                className={`type-pill ${paymentType === 'debit' ? 'active' : ''}`}
                onClick={() => setPaymentType('debit')}
              >
                <CreditCard size={14} />
                <span>Debit Card</span>
              </button>
            </div>

            {/* Compact Glassmorphic Card Preview */}
            <div className="compact-glass-card-wrapper">
              <div className="compact-glass-card">
                <div className="card-top-flex">
                  <div className="card-chip-graphic">
                    <span className="chip-c-line" />
                  </div>
                  <div className="card-brand-label">
                    <span>{cardBrand.name}</span>
                  </div>
                </div>

                <div className="card-number-line">
                  {cardData.cardNumber || '•••• •••• •••• ••••'}
                </div>

                <div className="card-bottom-flex">
                  <div className="card-meta-block">
                    <span className="lbl">CARDHOLDER</span>
                    <span className="val">
                      {cardData.cardholderName || 'CARDHOLDER NAME'}
                    </span>
                  </div>
                  <div className="card-meta-block text-right">
                    <span className="lbl">EXPIRES</span>
                    <span className="val">{cardData.expiry || 'MM/YY'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Inputs */}
            <div className="wizard-grid-2col">
              {/* Cardholder Name */}
              <div className="w-field-group col-span-2">
                <label>
                  Name on Card <span className="req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ALEX MORGAN"
                  value={cardData.cardholderName}
                  onChange={(e) => {
                    setCardData((prev) => ({
                      ...prev,
                      cardholderName: e.target.value.toUpperCase(),
                    }));
                    if (errors.cardholderName) {
                      setErrors((prev) => ({ ...prev, cardholderName: null }));
                    }
                  }}
                  className={errors.cardholderName ? 'has-error' : ''}
                />
                {errors.cardholderName && (
                  <span className="w-error-msg">{errors.cardholderName}</span>
                )}
              </div>

              {/* Card Number */}
              <div className="w-field-group col-span-2">
                <label>
                  Card Number <span className="req">*</span>
                </label>
                <div className="input-wrap-with-brand">
                  <input
                    type="text"
                    placeholder="4242 4242 4242 4242"
                    value={cardData.cardNumber}
                    onChange={handleCardNumberChange}
                    maxLength={19}
                    className={errors.cardNumber ? 'has-error' : ''}
                  />
                  <span className="brand-chip-tag">{cardBrand.name}</span>
                </div>
                {errors.cardNumber && (
                  <span className="w-error-msg">{errors.cardNumber}</span>
                )}
              </div>

              {/* Expiry */}
              <div className="w-field-group">
                <label>
                  Expires (MM/YY) <span className="req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="12/28"
                  value={cardData.expiry}
                  onChange={handleExpiryChange}
                  maxLength={5}
                  className={errors.expiry ? 'has-error' : ''}
                />
                {errors.expiry && <span className="w-error-msg">{errors.expiry}</span>}
              </div>

              {/* CVV */}
              <div className="w-field-group">
                <label>
                  CVV / Code <span className="req">*</span>
                </label>
                <div className="input-wrap-with-brand">
                  <input
                    type={showCvv ? 'text' : 'password'}
                    placeholder="•••"
                    value={cardData.cvv}
                    onChange={handleCvvChange}
                    maxLength={4}
                    className={errors.cvv ? 'has-error' : ''}
                  />
                  <button
                    type="button"
                    className="btn-eye-toggle"
                    onClick={() => setShowCvv((prev) => !prev)}
                    title={showCvv ? 'Mask code' : 'Show code'}
                  >
                    {showCvv ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {errors.cvv && <span className="w-error-msg">{errors.cvv}</span>}
              </div>
            </div>

            {/* Zero storage note */}
            <div className="wizard-zero-storage-note">
              <Shield size={13} className="text-emerald" />
              <span>
                Zero Data Storage: Card credentials remain purely in local browser memory and are never transmitted to any server.
              </span>
            </div>

            {/* Step 2 Actions */}
            <div className="wizard-action-footer">
              <button
                type="button"
                className="btn-wizard-secondary"
                onClick={() => setCurrentStep('details')}
              >
                <ArrowLeft size={15} />
                <span>Back to Details</span>
              </button>

              <button
                type="submit"
                className="btn-wizard-primary"
              >
                <Lock size={15} />
                <span>Confirm Demo Subscription — ${currentPrice}.00</span>
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 3: PROCESSING SIMULATION ================= */}
        {currentStep === 'processing' && (
          <div className="wizard-processing-state animate-fadeIn">
            <div className="proc-spinner-wrap">
              <div className="proc-pulse-circle" />
              <div className="proc-ring-outer animate-spin-slow" />
              <div className="proc-ring-inner animate-spin-reverse" />
              <Sparkles size={24} className="proc-sparkle-center" />
            </div>

            <h3 className="proc-title">Simulating Payment Authorization</h3>
            <p className="proc-desc">
              Contacting DOERA sandbox gateway and provisioning your request quota...
            </p>

            <div className="proc-stages-list">
              <div className={`stage-item ${processingStage >= 1 ? 'active' : ''} ${processingStage > 1 ? 'done' : ''}`}>
                {processingStage > 1 ? (
                  <CheckCircle2 size={15} className="text-emerald" />
                ) : (
                  <Loader2 size={15} className="animate-spin text-pink" />
                )}
                <span>Validating sandbox security credentials</span>
              </div>

              <div className={`stage-item ${processingStage >= 2 ? 'active' : ''} ${processingStage > 2 ? 'done' : ''}`}>
                {processingStage > 2 ? (
                  <CheckCircle2 size={15} className="text-emerald" />
                ) : processingStage === 2 ? (
                  <Loader2 size={15} className="animate-spin text-pink" />
                ) : (
                  <span className="pending-dot" />
                )}
                <span>Simulating payment authorization (No real charges)</span>
              </div>

              <div className={`stage-item ${processingStage >= 3 ? 'active' : ''}`}>
                {processingStage === 3 ? (
                  <Loader2 size={15} className="animate-spin text-pink" />
                ) : (
                  <span className="pending-dot" />
                )}
                <span>Allocating {planInfo.dailyLimit} requests/day to MongoDB Atlas</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4: CONFIRMATION RECEIPT ================= */}
        {currentStep === 'confirmation' && demoReceipt && (
          <div className="wizard-confirmation-state animate-fadeIn">
            <div className="conf-icon-circle">
              <CheckCircle2 size={38} className="text-emerald" />
            </div>

            <h3 className="conf-title">Subscription Successfully Activated!</h3>
            <p className="conf-subtitle">
              Your DOERA AI workspace has been upgraded to{' '}
              <strong className="text-pink">{demoReceipt.dailyLimit} requests/day</strong>, renewing automatically every day at 00:00 UTC.
            </p>

            {/* Demo Transaction Banner */}
            <div className="conf-demo-banner">
              <ShieldAlert size={16} />
              <div>
                <strong>DEMO TRANSACTION — NO REAL PAYMENT PROCESSED</strong>
                <p>Simulated in sandbox test mode. No financial charges were made to your bank or card.</p>
              </div>
            </div>

            {/* Receipt Table */}
            <div className="conf-receipt-box">
              <div className="receipt-head">
                <Receipt size={14} className="text-pink" />
                <span>DOERA AI SIMULATED INVOICE</span>
                <span className="receipt-status-pill">✓ COMPLETED</span>
              </div>

              <div className="receipt-rows">
                <div className="r-item">
                  <span className="r-label">Transaction ID:</span>
                  <span className="r-val code">{demoReceipt.transactionId}</span>
                </div>
                <div className="r-item">
                  <span className="r-label">Membership Tier:</span>
                  <span className="r-val">{demoReceipt.planName}</span>
                </div>
                <div className="r-item">
                  <span className="r-label">Daily Request Limit:</span>
                  <span className="r-val text-emerald font-bold">{demoReceipt.dailyLimit} Requests / Day</span>
                </div>
                <div className="r-item">
                  <span className="r-label">Amount Simulated:</span>
                  <span className="r-val">${demoReceipt.amount}.00 USD / mo</span>
                </div>
                <div className="r-item">
                  <span className="r-label">Payment Method:</span>
                  <span className="r-val">{demoReceipt.cardBrand} •••• {demoReceipt.cardLast4} (Demo)</span>
                </div>
                <div className="r-item">
                  <span className="r-label">Customer Name:</span>
                  <span className="r-val">{demoReceipt.customerName}</span>
                </div>
                <div className="r-item">
                  <span className="r-label">Billing Email:</span>
                  <span className="r-val">{demoReceipt.customerEmail}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-wizard-primary conf-return-btn"
              onClick={() => {
                if (onClose) onClose();
              }}
            >
              <span>Return to Workspace & Start Creating</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionCheckout;
