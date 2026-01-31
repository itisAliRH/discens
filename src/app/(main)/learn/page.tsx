export const metadata = {
  title: 'Learn',
};

export default function LearnPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Learn New Materials</h1>
      <p className="text-muted-foreground mb-8">
        Discover new words, phrases, and grammar rules.
      </p>
      
      <div className="p-12 rounded-xl border-2 border-dashed border-border text-center">
        <span className="text-6xl mb-4 block">🚧</span>
        <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
        <p className="text-muted-foreground">
          The learning module is being built. Check back soon!
        </p>
      </div>
    </div>
  );
}
