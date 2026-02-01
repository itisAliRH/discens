"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuTag, LuLoader, LuX, LuCheck } from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

export default function CouponCode() {
  const router = useRouter();
  const t = useTranslations("pricing.coupon");
  const [couponCode, setCouponCode] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponValid, setCouponValid] = useState<boolean | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    tier: string;
    description: string;
  } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError(t("invalid"));
      setCouponValid(false);
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError(null);
    setCouponValid(null);

    try {
      const response = await fetch(
        `/api/coupon/validate?code=${encodeURIComponent(couponCode.trim())}`,
      );
      const data = await response.json();

      if (data.valid) {
        setCouponValid(true);
        setCouponError(null);
        setAppliedCoupon({
          code: data.coupon.code,
          tier: data.coupon.tier,
          description: data.coupon.description,
        });
      } else {
        setCouponValid(false);
        setCouponError(data.error || t("invalid"));
        setAppliedCoupon(null);
      }
    } catch (error) {
      setCouponValid(false);
      setCouponError(t("applyError"));
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!appliedCoupon) return;

    setIsApplyingCoupon(true);
    setCouponError(null);

    try {
      const response = await fetch("/api/coupon/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: appliedCoupon.code }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success - redirect to dashboard
        router.push("/dashboard?coupon_applied=true");
      } else {
        setCouponError(data.error || t("applyError"));
        setCouponValid(false);
        setAppliedCoupon(null);
      }
    } catch (error) {
      setCouponError(t("applyError"));
      setCouponValid(false);
      setAppliedCoupon(null);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleClearCoupon = () => {
    setCouponCode("");
    setCouponValid(null);
    setCouponError(null);
    setAppliedCoupon(null);
  };

  return (
    <div className="w-full max-w-md mx-auto mb-8">
      {!appliedCoupon ? (
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <LuTag className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">{t("title")}</h3>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                  setCouponValid(null);
                  setCouponError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleValidateCoupon();
                  }
                }}
                placeholder={t("placeholder")}
                className="flex-1 px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isValidatingCoupon}
              />
              <button
                onClick={handleValidateCoupon}
                disabled={isValidatingCoupon || !couponCode.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isValidatingCoupon ? (
                  <>
                    <LuLoader className="w-4 h-4 animate-spin" />
                    {t("validating")}
                  </>
                ) : (
                  t("validate")
                )}
              </button>
            </div>
            <AnimatePresence>
              {couponError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-sm text-red-500"
                >
                  {couponError}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-success/30 bg-success/10 p-6"
        >
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="flex items-start gap-2 flex-1">
              <LuCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-success-foreground mb-1">
                  {t("applied")}: {appliedCoupon.code.toUpperCase()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {appliedCoupon.description}
                </div>
              </div>
            </div>
            <button
              onClick={handleClearCoupon}
              className="p-1 rounded hover:bg-success/20 transition-colors"
              disabled={isApplyingCoupon}
            >
              <LuX className="w-4 h-4 text-success" />
            </button>
          </div>
          <button
            onClick={handleApplyCoupon}
            disabled={isApplyingCoupon}
            className="w-full px-4 py-2 rounded-lg bg-success text-success-foreground font-medium hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isApplyingCoupon ? (
              <>
                <LuLoader className="w-4 h-4 animate-spin" />
                {t("applying")}
              </>
            ) : (
              t("applyAndUpgrade", {
                tier:
                  appliedCoupon.tier === "super_plus" ? "Super Plus" : "Plus",
              })
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
}
