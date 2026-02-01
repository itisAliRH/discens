'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { LuCheck, LuX, LuCrown, LuInfinity } from '@/components/ui/icons';
import type { PricingPlan, BillingCycle } from '@/types/pricing';
import { calculatePrice, getStudentDiscount } from '@/lib/pricing/plans';

interface PlanCardProps {
  plan: PricingPlan;
  cycle: BillingCycle;
  isStudent?: boolean;
  currentTier?: string;
}

export default function PlanCard({
  plan,
  cycle,
  isStudent = false,
  currentTier,
}: PlanCardProps) {
  const finalPrice = calculatePrice(plan, cycle, isStudent);
  const discount = getStudentDiscount(plan.tier, cycle);
  const isCurrentPlan = currentTier === plan.tier;
  const isFree = plan.tier === 'free';
  
  // Calculate savings for yearly
  const yearlySavings = cycle === 'yearly' && !isFree
    ? ((plan.monthlyPrice * 12 - plan.yearlyPrice) / (plan.monthlyPrice * 12) * 100).toFixed(0)
    : null;

  return (
    <div
      className={`relative rounded-2xl border-2 p-6 transition-all hover:scale-[1.02] ${
        plan.highlighted
          ? 'border-primary bg-primary/5 shadow-lg'
          : 'border-border bg-card'
      } ${isCurrentPlan ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            <LuCrown className="w-3 h-3" />
            Most Popular
          </span>
        </div>
      )}

      {/* Current plan badge */}
      {isCurrentPlan && (
        <div className="absolute -top-4 right-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-success px-3 py-1 text-xs font-semibold text-success-foreground">
            Current Plan
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </div>

      {/* Pricing */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          {finalPrice === 0 ? (
            <span className="text-4xl font-bold">Free</span>
          ) : (
            <>
              <span className="text-4xl font-bold">€{finalPrice.toFixed(2)}</span>
              <span className="text-muted-foreground">
                /{cycle === 'monthly' ? 'mo' : 'yr'}
              </span>
            </>
          )}
        </div>
        
        {/* Yearly equivalent */}
        {cycle === 'yearly' && !isFree && (
          <div className="mt-1 text-sm text-muted-foreground">
            €{plan.yearlyMonthlyEquivalent.toFixed(2)}/mo when billed annually
          </div>
        )}

        {/* Savings badge */}
        {yearlySavings && !isStudent && (
          <div className="mt-2">
            <span className="inline-block rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
              Save {yearlySavings}%
            </span>
          </div>
        )}

        {/* Student discount badge */}
        {isStudent && discount && (
          <div className="mt-2">
            <span className="inline-block rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
              {discount.discountPercent === 100 ? 'FREE for students!' : `${discount.discountPercent}% student discount`}
            </span>
          </div>
        )}
      </div>

      {/* CTA Button */}
      <Link
        href={`/checkout?plan=${plan.tier}&cycle=${cycle}${isStudent ? '&student=true' : ''}`}
        className={`block w-full rounded-xl px-6 py-3 text-center font-semibold transition-colors mb-6 ${
          plan.highlighted
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        } ${isCurrentPlan ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      >
        {isCurrentPlan ? 'Current Plan' : plan.cta}
      </Link>

      {/* Features */}
      <div className="space-y-3">
        {plan.features.map((feature) => (
          <div key={feature.id} className="flex items-start gap-3">
            {feature.included ? (
              <LuCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            ) : (
              <LuX className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            )}
            <span
              className={`text-sm ${
                feature.included ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {feature.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
