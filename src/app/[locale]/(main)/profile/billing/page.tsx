import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LuArrowLeft,
  LuCrown,
  LuCreditCard,
  LuCalendar,
  LuBadgeCheck,
} from "@/components/ui/icons";
import { LuTag } from "react-icons/lu";
import PricingSection from "@/components/pricing/PricingSection";
import {
  getUserSubscription,
  getSubscriptionLimits,
  isSubscriptionActive,
} from "@/lib/pricing/subscription";
import type { UserSubscription } from "@/lib/pricing/subscription";

// Force dynamic rendering - this page requires authentication
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Billing & Subscription",
};

export default async function BillingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch real subscription data
  const subscription = await getUserSubscription(supabase, user.id);
  const isActive = isSubscriptionActive(subscription);

  const currentSubscription = subscription
    ? {
        tier: subscription.tier,
        cycle: subscription.billing_cycle || ("monthly" as const),
        status: subscription.status as
          | "active"
          | "cancelled"
          | "expired"
          | "trial",
        startDate: subscription.started_at,
        expiresAt: subscription.expires_at,
        couponCode: subscription.coupon_code,
        pricePaid: subscription.price_paid,
      }
    : {
        tier: "free" as const,
        cycle: "monthly" as const,
        status: "active" as const,
        startDate: new Date().toISOString(),
        expiresAt: null,
        couponCode: null,
        pricePaid: 0,
      };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <LuArrowLeft className="w-4 h-4" />
          Back to Profile
        </Link>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="mb-12">
        <div className="rounded-2xl border-2 border-border bg-card p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <LuCrown className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Current Plan</h2>
              </div>
              <p className="text-muted-foreground text-sm">
                Your active subscription plan and details
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                isActive
                  ? currentSubscription.status === "trial"
                    ? "bg-warning/10 text-warning"
                    : "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isActive
                ? currentSubscription.status === "trial"
                  ? "Trial"
                  : "Active"
                : "Inactive"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Plan</div>
              <div className="text-lg font-semibold capitalize">
                {currentSubscription.tier === "super_plus"
                  ? "Super Plus"
                  : currentSubscription.tier}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Price</div>
              <div className="text-lg font-semibold">
                {currentSubscription.tier === "free"
                  ? "Free"
                  : currentSubscription.pricePaid === 0
                    ? "Free Trial"
                    : `€${currentSubscription.pricePaid.toFixed(2)}/${currentSubscription.cycle === "yearly" ? "year" : "month"}`}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                {currentSubscription.expiresAt ? "Expires" : "Started"}
              </div>
              <div className="text-lg font-semibold">
                {currentSubscription.expiresAt
                  ? new Date(currentSubscription.expiresAt).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )
                  : new Date(currentSubscription.startDate).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
              </div>
            </div>
          </div>

          {/* Coupon code info */}
          {currentSubscription.couponCode && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                <LuTag className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Applied coupon:</span>
                <span className="font-medium">
                  {currentSubscription.couponCode.toUpperCase()}
                </span>
              </div>
            </div>
          )}

          {currentSubscription.tier === "free" && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-4">
                You're currently on the Free plan. Upgrade to unlock more
                features!
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="#plans"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  View Plans
                </Link>
              </div>
            </div>
          )}

          {currentSubscription.tier !== "free" &&
            currentSubscription.expiresAt && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 text-shadow-warning">
                  <p className="text-sm">
                    {currentSubscription.status === "trial"
                      ? `Your trial expires on ${new Date(
                          currentSubscription.expiresAt,
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}. Upgrade to continue after the trial ends.`
                      : `Your subscription expires on ${new Date(
                          currentSubscription.expiresAt,
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}.`}
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Usage Stats */}
      {(currentSubscription.tier === "free" ||
        currentSubscription.tier === "plus") && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Today's Usage</h2>
          {(() => {
            const limits = getSubscriptionLimits(currentSubscription.tier);
            // TODO: Fetch actual usage from database
            const usage = {
              materials: 3,
              conversations: 1,
              reviewCards: 8,
            };

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <UsageCard
                  title="Learning Materials"
                  used={usage.materials}
                  limit={limits.materials === Infinity ? "∞" : limits.materials}
                  icon={<LuBadgeCheck className="w-5 h-5" />}
                />
                <UsageCard
                  title="AI Conversations"
                  used={usage.conversations}
                  limit={
                    limits.conversations === Infinity
                      ? "∞"
                      : limits.conversations
                  }
                  icon={<LuBadgeCheck className="w-5 h-5" />}
                />
                <UsageCard
                  title="Review Cards"
                  used={usage.reviewCards}
                  limit={
                    limits.reviewCards === Infinity ? "∞" : limits.reviewCards
                  }
                  icon={<LuBadgeCheck className="w-5 h-5" />}
                />
              </div>
            );
          })()}
        </div>
      )}

      {/* Available Plans */}
      <div id="plans" className="mb-12">
        <h2 className="text-2xl font-bold mb-2">Available Plans</h2>
        <p className="text-muted-foreground mb-8">
          Choose the plan that works best for you
        </p>
        <PricingSection
          currentTier={currentSubscription.tier}
          showTitle={false}
          showComparison={true}
          showStudentDiscount={true}
        />
      </div>

      {/* Billing History (Placeholder) */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Billing History</h2>
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
          <LuCreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            No billing history yet. Upgrade to a paid plan to see your invoices
            here.
          </p>
        </div>
      </div>
    </div>
  );
}

function UsageCard({
  title,
  used,
  limit,
  icon,
}: {
  title: string;
  used: number;
  limit: number | string;
  icon: React.ReactNode;
}) {
  const isUnlimited = limit === "∞" || limit === Infinity;
  const percentage = isUnlimited ? 0 : (used / (limit as number)) * 100;
  const isNearLimit = !isUnlimited && percentage >= 80;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mb-2">
        <div className="text-2xl font-bold">
          {used}{" "}
          <span className="text-sm text-muted-foreground font-normal">
            / {isUnlimited ? "∞" : limit}
          </span>
        </div>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              isNearLimit ? "bg-warning" : "bg-primary"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
