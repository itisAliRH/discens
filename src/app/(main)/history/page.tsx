'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  LuMessageCircle,
  LuCoffee,
  LuBuilding2,
  LuUtensils,
  LuStethoscope,
  LuCar,
  LuTrain,
  LuPlane,
  LuTrees,
  LuHouse,
  LuShoppingCart,
  LuLibrary,
} from '@/components/ui/icons';

interface ConversationSession {
  id: string;
  scenario_id: string;
  scenario_name: string;
  scenario_description: string | null;
  environment: string | null;
  messages: Array<{ role: string; content: string }>;
  overall_score: number | null;
  fluency_score: number | null;
  grammar_score: number | null;
  vocabulary_score: number | null;
  xp_earned: number | null;
  completed_at: string | null;
  created_at: string;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'incomplete'>('all');

  useEffect(() => {
    async function loadSessions() {
      try {
        const response = await fetch('/api/conversation/sessions');
        if (response.ok) {
          const data = await response.json();
          setSessions(data.sessions || []);
        }
      } catch (error) {
        console.error('Failed to load sessions:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSessions();
  }, []);

  const filteredSessions = sessions.filter(session => {
    if (filter === 'completed') return session.completed_at !== null;
    if (filter === 'incomplete') return session.completed_at === null;
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-orange-500';
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your conversation history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Conversation History</h1>
          <p className="text-muted-foreground">
            Review your past practice conversations
          </p>
        </div>
        <Link
          href="/conversation"
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium"
        >
          New Conversation
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          All ({sessions.length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Completed ({sessions.filter(s => s.completed_at).length})
        </button>
        <button
          onClick={() => setFilter('incomplete')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'incomplete'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          In Progress ({sessions.filter(s => !s.completed_at).length})
        </button>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-2xl">
          <span className="flex justify-center mb-4"><LuMessageCircle className="w-12 h-12 text-muted-foreground" /></span>
          <h2 className="text-xl font-semibold mb-2">No conversations yet</h2>
          <p className="text-muted-foreground mb-6">
            Start practicing with real-world scenarios!
          </p>
          <Link
            href="/conversation"
            className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
          >
            Start Your First Conversation
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <Link
              key={session.id}
              href={`/conversation?session=${session.id}`}
              className="block p-5 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg truncate">
                      {session.scenario_name}
                    </h3>
                    {session.environment && session.environment !== 'none' && (
                      <span className="text-muted-foreground">
                        {getEnvironmentIcon(session.environment)}
                      </span>
                    )}
                    {!session.completed_at && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-600">
                        In Progress
                      </span>
                    )}
                  </div>
                  
                  {session.scenario_description && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                      {session.scenario_description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatDate(session.created_at)}</span>
                    <span>•</span>
                    <span>{session.messages?.length || 0} messages</span>
                    {session.xp_earned && (
                      <>
                        <span>•</span>
                        <span className="text-primary font-medium">+{session.xp_earned} XP</span>
                      </>
                    )}
                  </div>
                </div>

                {session.completed_at && session.overall_score !== null && (
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getScoreColor(session.overall_score)}`}>
                      {session.overall_score}%
                    </div>
                    <div className="text-xs text-muted-foreground">Score</div>
                  </div>
                )}
              </div>

              {/* Score breakdown for completed sessions */}
              {session.completed_at && session.overall_score !== null && (
                <div className="mt-4 pt-4 border-t border-border flex gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">Fluency:</span>
                    <span className={`font-medium ${getScoreColor(session.fluency_score)}`}>
                      {session.fluency_score || '-'}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">Grammar:</span>
                    <span className={`font-medium ${getScoreColor(session.grammar_score)}`}>
                      {session.grammar_score || '-'}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">Vocabulary:</span>
                    <span className={`font-medium ${getScoreColor(session.vocabulary_score)}`}>
                      {session.vocabulary_score || '-'}%
                    </span>
                  </div>
                </div>
              )}

              {/* Last message preview */}
              {session.messages && session.messages.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
                  <span className="text-muted-foreground">
                    Last message: &quot;{session.messages[session.messages.length - 1]?.content.slice(0, 100)}
                    {session.messages[session.messages.length - 1]?.content.length > 100 ? '...' : ''}&quot;
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function getEnvironmentIcon(environment: string): ReactNode {
  const icons: Record<string, ReactNode> = {
    cafe: <LuCoffee className="w-5 h-5" />,
    office: <LuBuilding2 className="w-5 h-5" />,
    restaurant: <LuUtensils className="w-5 h-5" />,
    hospital: <LuStethoscope className="w-5 h-5" />,
    street: <LuCar className="w-5 h-5" />,
    train_station: <LuTrain className="w-5 h-5" />,
    airport: <LuPlane className="w-5 h-5" />,
    park: <LuTrees className="w-5 h-5" />,
    home: <LuHouse className="w-5 h-5" />,
    supermarket: <LuShoppingCart className="w-5 h-5" />,
    library: <LuLibrary className="w-5 h-5" />,
  };
  return icons[environment] || null;
}
