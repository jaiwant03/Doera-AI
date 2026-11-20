import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Bot, Sparkles, CheckCircle2 } from 'lucide-react';

const CheckoutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080609] py-12 px-4 flex flex-col justify-center items-center font-sans text-white">
      <div className="w-full max-w-xl bg-[#120817] border border-[#2B1038] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div 
          className="absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(241, 45, 152, 0.18) 0%, transparent 70%)' }}
        />

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#F12D98]/10 border border-[#F12D98]/30 flex items-center justify-center">
            <ShieldCheck size={22} className="text-[#F12D98]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              DOERA AI <span className="text-xs px-2 py-0.5 rounded bg-[#F12D98]/20 text-[#F12D98] border border-[#F12D98]/40">PLATFORM TRANSPARENCY</span>
            </h1>
            <p className="text-xs text-neutral-400">Payment Gateways Permanently Disabled</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <p className="text-sm text-neutral-300 leading-relaxed">
            In compliance with our genuine execution policy, commercial payment gateways (Stripe / Razorpay) and simulated financial checkouts are disabled.
          </p>

          <div className="bg-[#1C0D26]/80 border border-[#3E1653] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-pink-400">
              <Sparkles size={14} />
              <span>Full Intelligence Stack Available Free</span>
            </div>
            <ul className="text-xs text-neutral-300 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                <span>Multi-agent planning, research, document & vision intelligence</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                <span>Spreadsheet data analysis and dynamic interactive charts</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                <span>Real Gmail automation with Google OAuth credentials</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                <span>Mission Control, Proof of Execution & Follow-Up Tracker</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => navigate('/chat')}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #F12D98 0%, #A21CAF 100%)',
              color: '#ffffff',
              boxShadow: '0 4px 18px rgba(241, 45, 152, 0.35)',
            }}
          >
            <ArrowLeft size={16} />
            <span>Return to Mission Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;

