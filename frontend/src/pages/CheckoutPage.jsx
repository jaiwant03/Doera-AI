import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SubscriptionCheckout from '../components/Subscription/SubscriptionCheckout';
import { useChat } from '../context/ChatContext';

const CheckoutPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { fetchSubscription } = useChat();

  const planParam = searchParams.get('plan') === 'max' ? 'max' : 'pro';
  const cycleParam = searchParams.get('cycle') === 'annual' ? 'annual' : 'monthly';

  const handleSuccess = (newPlan, usage) => {
    if (fetchSubscription) {
      fetchSubscription(newPlan, usage);
    }
  };

  const handleBack = () => {
    navigate('/chat');
  };

  const handleClose = () => {
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-[#080609] py-8 px-4 flex flex-col justify-center items-center">
      <div className="w-full max-w-5xl">
        <SubscriptionCheckout
          plan={planParam}
          billingCycle={cycleParam}
          onBack={handleBack}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
};

export default CheckoutPage;
