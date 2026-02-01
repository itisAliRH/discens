'use client';

import { LuGraduationCap, LuBadgeCheck } from '@/components/ui/icons';

export default function StudentDiscount() {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-warning bg-gradient-to-br from-warning/10 via-background to-background p-8">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-warning/5 rounded-full blur-3xl -z-10" />
      
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-warning/20 flex items-center justify-center">
            <LuGraduationCap className="w-8 h-8 text-warning" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-2xl font-bold mb-2">Student Discount Available!</h3>
          <p className="text-muted-foreground mb-4">
            Students with valid .edu email addresses are eligible for special pricing
          </p>
          <div className="flex flex-col sm:flex-row gap-3 text-sm">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <LuBadgeCheck className="w-5 h-5 text-success" />
              <span><strong>Plus Plan:</strong> Free (yearly only)</span>
            </div>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <LuBadgeCheck className="w-5 h-5 text-success" />
              <span><strong>Super Plus:</strong> 30% off (yearly only)</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex-shrink-0">
          <button
            onClick={() => {
              // Scroll to pricing cards and enable student mode
              const pricingSection = document.getElementById('pricing-plans');
              if (pricingSection) {
                pricingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="px-6 py-3 rounded-xl bg-warning text-warning-foreground font-semibold hover:bg-warning/90 transition-colors"
          >
            View Student Plans
          </button>
        </div>
      </div>
    </div>
  );
}
