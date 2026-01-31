export const metadata = {
  title: 'Review',
};

export default function ReviewPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Review Materials</h1>
      <p className="text-muted-foreground mb-8">
        Practice and reinforce what you&apos;ve learned with spaced repetition.
      </p>
      
      <div className="p-12 rounded-xl border-2 border-dashed border-border text-center">
        <span className="text-6xl mb-4 block">🔄</span>
        <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
        <p className="text-muted-foreground">
          The review module with FSRS spaced repetition is being built.
        </p>
      </div>
    </div>
  );
}
