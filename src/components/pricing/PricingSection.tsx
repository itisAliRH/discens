'use client';

import { useState } from 'react';
import PlanCard from './PlanCard';
import FeatureComparison from './FeatureComparison';
import StudentDiscount from './StudentDiscount';
import CouponCode from './CouponCode';
import { PRICING_PLANS } from '@/lib/pricing/plans';
import type { BillingCycle } from '@/types/pricing';

interface PricingSectionProps {
  currentTier?: string;
  showTitle?: boolean;
  showComparison?: boolean;
  showStudentDiscount?: boolean;
}

export default function PricingSection({
  currentTier,
  showTitle = true,
  showComparison = true,
  showStudentDiscount = true,
}: PricingSectionProps) {
  const [cycle, setCycle] = useState<BillingCycle>('yearly');
  const [isStudent, setIsStudent] = useState(false);

  return (
    <div className="w-full">
      {/* Header */}
      {showTitle && (
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Choose Your Plan
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start free and upgrade as you grow. All plans include core learning features.
          </p>
        </div>
      )}

      {/* Billing cycle toggle */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="inline-flex items-center gap-3 p-1 rounded-xl bg-muted">
          <button
            onClick={() => setCycle('monthly')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              cycle === 'monthly'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle('yearly')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              cycle === 'yearly'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Yearly
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
              Save 20%
            </span>
          </button>
        </div>

        {/* Student toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isStudent}
            onChange={(e) => setIsStudent(e.target.checked)}
            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
          />
          <span className="text-sm">I'm a student with .edu email</span>
        </label>
      </div>

      {/* Coupon Code Section */}
      <CouponCode />

      {/* Plan cards */}
      <div id="pricing-plans" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {PRICING_PLANS.map((plan) => (
          <PlanCard
            key={plan.tier}
            plan={plan}
            cycle={cycle}
            isStudent={isStudent && cycle === 'yearly'} // Student discounts only for yearly
            currentTier={currentTier}
          />
        ))}
      </div>

      {/* Student discount banner */}
      {showStudentDiscount && (
        <div className="mb-16">
          <StudentDiscount />
        </div>
      )}

      {/* Feature comparison */}
      {showComparison && (
        <div>
          <h3 className="text-2xl font-bold text-center mb-8">
            Compare All Features
          </h3>
          <FeatureComparison />
        </div>
      )}
    </div>
  );
}
