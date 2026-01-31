export const metadata = {
  title: 'Conversation',
};

export default function ConversationPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Real Conversations</h1>
      <p className="text-muted-foreground mb-8">
        Practice speaking with AI in realistic scenarios.
      </p>
      
      <div className="p-12 rounded-xl border-2 border-dashed border-border text-center">
        <span className="text-6xl mb-4 block">💬</span>
        <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
        <p className="text-muted-foreground">
          Voice conversations powered by ElevenLabs are being integrated.
        </p>
      </div>
    </div>
  );
}
