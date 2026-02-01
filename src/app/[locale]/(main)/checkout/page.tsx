'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LuRocket, LuArrowLeft, LuCheck } from '@/components/ui/icons';
import { getPlanByTier, calculatePrice } from '@/lib/pricing/plans';
import type { PricingPlan, BillingCycle } from '@/types/pricing';

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [plan, setPlan] = useState<PricingPlan | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [isStudent, setIsStudent] = useState(false);

  useEffect(() => {
    const tierParam = searchParams.get('plan');
    const cycleParam = searchParams.get('cycle');
    const studentParam = searchParams.get('student');

    if (!tierParam) {
      router.push('/');
      return;
    }

    const foundPlan = getPlanByTier(tierParam);
    if (foundPlan) {
      setPlan(foundPlan);
      setCycle((cycleParam as BillingCycle) || 'monthly');
      setIsStudent(studentParam === 'true');
    } else {
      router.push('/');
    }
  }, [searchParams, router]);

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const finalPrice = calculatePrice(plan, cycle, isStudent);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <LuArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="order-2 lg:order-1">
            <div className="rounded-2xl border-2 border-border bg-card p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
              
              {/* Plan details */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{plan.name} Plan</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {cycle} billing
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      €{finalPrice.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      /{cycle === 'monthly' ? 'month' : 'year'}
                    </div>
                  </div>
                </div>

                {isStudent && cycle === 'yearly' && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                    <LuCheck className="w-4 h-4 text-warning flex-shrink-0" />
                    <span className="text-sm text-warning-foreground">
                      Student discount applied
                    </span>
                  </div>
                )}
              </div>

              {/* Features included */}
              <div className="pt-6 border-t border-border">
                <h3 className="font-semibold mb-3 text-sm">What's included:</h3>
                <div className="space-y-2">
                  {plan.features
                    .filter((f) => f.included)
                    .slice(0, 5)
                    .map((feature) => (
                      <div key={feature.id} className="flex items-start gap-2">
                        <LuCheck className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature.name}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon Message */}
          <div className="order-1 lg:order-2">
            <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background p-8 text-center">
              {/* Rocket illustration */}
              <div className="relative mb-6">
                <div className="w-24 h-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <LuRocket className="w-12 h-12 text-primary" />
                </div>
                <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-primary/10 animate-ping" />
              </div>

              <h1 className="text-3xl font-bold mb-4">
                Payment Coming Soon!
              </h1>
              
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We're currently setting up secure payment processing. 
                The payment system will be available very soon.
              </p>

              <div className="p-4 rounded-xl bg-accent/50 mb-6">
                <p className="text-sm font-medium mb-2">What happens next?</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Payment integration is in progress</li>
                  <li>✓ Secure checkout with Stripe</li>
                  <li>✓ Multiple payment methods</li>
                  <li>✓ Student verification via .edu email</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/dashboard"
                  className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href="/"
                  className="px-6 py-3 rounded-xl border border-border hover:bg-accent transition-colors"
                >
                  Back to Home
                </Link>
              </div>

              <p className="text-xs text-muted-foreground mt-6">
                Want to be notified when payment goes live? Check your email preferences in your profile.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ / Help */}
        <div className="mt-12 p-6 rounded-xl bg-card border border-border">
          <h3 className="font-semibold mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-1">Can I change my plan later?</h4>
              <p className="text-sm text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time from your billing page.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">How do I verify my student status?</h4>
              <p className="text-sm text-muted-foreground">
                Student verification will be done via your .edu email address during the checkout process.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Is there a refund policy?</h4>
              <p className="text-sm text-muted-foreground">
                We offer a 30-day money-back guarantee if you're not satisfied with your subscription.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
