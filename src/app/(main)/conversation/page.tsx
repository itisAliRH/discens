'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Scenario {
  id: string;
  name: string;
  description: string;
  vocabulary: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Feedback {
  overallScore: number;
  fluencyScore: number;
  grammarScore: number;
  vocabularyScore: number;
  strengths: string[];
  improvements: string[];
  corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
  newWordsLearned: string[];
  encouragement: string;
  xpEarned: number;
}

type ViewState = 'select' | 'chat' | 'feedback';

export default function ConversationPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewState>('select');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch scenarios
  useEffect(() => {
    async function loadScenarios() {
      try {
        const response = await fetch('/api/conversation');
        if (response.ok) {
          const data = await response.json();
          setScenarios(data.scenarios);
        }
      } catch (error) {
        console.error('Failed to load scenarios:', error);
      }
    }
    loadScenarios();
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start conversation
  const startConversation = useCallback(async (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setMessages([]);
    setView('chat');
    setIsLoading(true);

    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.id,
          messages: [],
          isStart: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([{ role: 'assistant', content: data.response }]);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!input.trim() || !selectedScenario || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: selectedScenario.id,
          messages: [...messages, { role: 'user', content: userMessage }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [input, selectedScenario, isLoading, messages]);

  // End conversation and get feedback
  const endConversation = useCallback(async () => {
    if (!selectedScenario || messages.length < 2) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/conversation/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          scenarioName: selectedScenario.name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFeedback(data);
        setView('feedback');
      }
    } catch (error) {
      console.error('Failed to get feedback:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedScenario, messages]);

  // Scenario Selection View
  if (view === 'select') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Real Conversations</h1>
        <p className="text-muted-foreground mb-8">
          Practice speaking in realistic scenarios. The AI won&apos;t interrupt you—you&apos;ll get feedback after!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => startConversation(scenario)}
              className="p-6 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group"
            >
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors mb-1">
                {scenario.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {scenario.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {scenario.vocabulary.slice(0, 4).map((word) => (
                  <span
                    key={word}
                    className="px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground"
                  >
                    {word}
                  </span>
                ))}
                {scenario.vocabulary.length > 4 && (
                  <span className="px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground">
                    +{scenario.vocabulary.length - 4} more
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Feedback View
  if (view === 'feedback' && feedback) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <span className="text-6xl mb-4 block">🎭</span>
          <h1 className="text-2xl font-bold mb-2">Conversation Complete!</h1>
          <p className="text-muted-foreground">{feedback.encouragement}</p>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <ScoreCard label="Overall" score={feedback.overallScore} />
          <ScoreCard label="Fluency" score={feedback.fluencyScore} />
          <ScoreCard label="Grammar" score={feedback.grammarScore} />
          <ScoreCard label="Vocabulary" score={feedback.vocabularyScore} />
        </div>

        {/* XP Earned */}
        <div className="text-center mb-8 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <span className="text-2xl font-bold text-primary">+{feedback.xpEarned} XP</span>
        </div>

        {/* Strengths */}
        {feedback.strengths.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span>💪</span> Strengths
            </h3>
            <ul className="space-y-2">
              {feedback.strengths.map((strength, i) => (
                <li key={i} className="text-sm text-muted-foreground pl-4 border-l-2 border-green-500">
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Areas for Improvement */}
        {feedback.improvements.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span>🎯</span> Areas to Improve
            </h3>
            <ul className="space-y-2">
              {feedback.improvements.map((area, i) => (
                <li key={i} className="text-sm text-muted-foreground pl-4 border-l-2 border-orange-500">
                  {area}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Corrections */}
        {feedback.corrections.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span>✏️</span> Corrections
            </h3>
            <div className="space-y-3">
              {feedback.corrections.map((correction, i) => (
                <div key={i} className="p-4 rounded-lg bg-card border border-border">
                  <div className="flex gap-4 mb-2">
                    <span className="text-red-500 line-through">{correction.original}</span>
                    <span className="text-green-500">→ {correction.corrected}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{correction.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => {
              setView('select');
              setFeedback(null);
              setMessages([]);
            }}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
          >
            Try Another Scenario
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 py-3 rounded-xl border border-border hover:bg-accent"
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Chat View
  return (
    <div className="max-w-2xl mx-auto px-4 py-4 h-[calc(100dvh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
        <div>
          <h1 className="font-semibold">{selectedScenario?.name}</h1>
          <p className="text-sm text-muted-foreground">{selectedScenario?.description}</p>
        </div>
        <button
          onClick={endConversation}
          disabled={messages.length < 2 || isLoading}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          End & Get Feedback
        </button>
      </div>

      {/* Vocabulary hint */}
      {selectedScenario && (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Helpful words:</span>
          {selectedScenario.vocabulary.map((word) => (
            <span key={word} className="px-2 py-0.5 rounded bg-muted text-xs">
              {word}
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message, i) => (
          <div
            key={i}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted rounded-bl-md'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted p-4 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Type your response in German..."
          disabled={isLoading}
          className="flex-1 px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-green-500';
    if (s >= 60) return 'text-blue-500';
    if (s >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="p-4 rounded-xl bg-card border border-border text-center">
      <div className={`text-2xl font-bold ${getColor(score)}`}>{score}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
