'use client';

import { LuCheck, LuX } from '@/components/ui/icons';
import { FEATURE_COMPARISON } from '@/lib/pricing/plans';

export default function FeatureComparison() {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Header */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="font-semibold text-lg">Features</div>
          <div className="text-center">
            <div className="font-semibold text-lg">Free</div>
            <div className="text-sm text-muted-foreground">€0/mo</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg flex items-center justify-center gap-2">
              Plus
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Popular
              </span>
            </div>
            <div className="text-sm text-muted-foreground">from €15.99/mo</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg">Super Plus</div>
            <div className="text-sm text-muted-foreground">from €47.99/mo</div>
          </div>
        </div>

        {/* Feature categories */}
        {FEATURE_COMPARISON.map((category, categoryIndex) => (
          <div key={categoryIndex} className="mb-6">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
              {category.category}
            </h4>
            <div className="space-y-2">
              {category.features.map((feature, featureIndex) => (
                <div
                  key={featureIndex}
                  className="grid grid-cols-4 gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center">
                    <span className="text-sm">{feature.name}</span>
                  </div>
                  <FeatureCell value={feature.free} />
                  <FeatureCell value={feature.plus} />
                  <FeatureCell value={feature.superPlus} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCell({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return (
      <div className="flex justify-center items-center">
        {value ? (
          <LuCheck className="w-5 h-5 text-success" />
        ) : (
          <LuX className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center">
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
