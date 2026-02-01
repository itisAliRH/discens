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
  LuBookOpen,
  LuRefreshCw,
  LuBrain,
} from '@/components/ui/icons';
import type { SessionType } from '@/types/database';

interface HistorySession {
  id: string;
  type: SessionType;
  title: string;
  description: string | null;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  durationSeconds: number;
  materialsCovered: string[];
  completedAt: string | null;
  startedAt: string;
  quizType: string | null;
  // Conversation-specific fields
  conversationScenario?: string;
  conversationTranscript?: Array<{ role: string; content: string }> | null;
  environment?: string | null;
  overallScore?: number | null;
  fluencyScore?: number | null;
  grammarScore?: number | null;
  vocabularyScore?: number | null;
  xpEarned?: number | null;
  scenarioId?: string;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'learn' | 'review' | 'conversation'>('all');

  useEffect(() => {
    async function loadSessions() {
      try {
        const response = await fetch('/api/history');
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
    if (filter === 'learn') return session.type === 'learn';
    if (filter === 'review') return session.type === 'review';
    if (filter === 'conversation') return session.type === 'conversation';
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

  const getScoreColor = (score: number | null | undefined) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getSessionIcon = (type: SessionType) => {
    switch (type) {
      case 'learn':
        return <LuBookOpen className="w-5 h-5" />;
      case 'review':
        return <LuRefreshCw className="w-5 h-5" />;
      case 'conversation':
        return <LuMessageCircle className="w-5 h-5" />;
      default:
        return <LuBrain className="w-5 h-5" />;
    }
  };

  const getSessionTypeLabel = (type: SessionType) => {
    switch (type) {
      case 'learn':
        return 'Learning';
      case 'review':
        return 'Review';
      case 'conversation':
        return 'Conversation';
      default:
        return 'Session';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) return `${minutes}m`;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getSessionLink = (session: HistorySession) => {
    if (session.type === 'conversation') {
      return `/conversation?session=${session.id}`;
    }
    // Learn and review sessions don't have direct links yet
    return null;
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your learning history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Learning History</h1>
          <p className="text-muted-foreground">
            Review your past learning, review, and conversation sessions
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/learn"
            className="px-4 py-2 rounded-xl border border-border hover:bg-accent font-medium"
          >
            Learn
          </Link>
          <Link
            href="/review"
            className="px-4 py-2 rounded-xl border border-border hover:bg-accent font-medium"
          >
            Review
          </Link>
          <Link
            href="/conversation"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium"
          >
            Talk
          </Link>
        </div>
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
          onClick={() => setFilter('learn')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'learn'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Learn ({sessions.filter(s => s.type === 'learn').length})
        </button>
        <button
          onClick={() => setFilter('review')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'review'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Review ({sessions.filter(s => s.type === 'review').length})
        </button>
        <button
          onClick={() => setFilter('conversation')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'conversation'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Conversation ({sessions.filter(s => s.type === 'conversation').length})
        </button>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-2xl">
          <span className="flex justify-center mb-4"><LuBrain className="w-12 h-12 text-muted-foreground" /></span>
          <h2 className="text-xl font-semibold mb-2">No sessions yet</h2>
          <p className="text-muted-foreground mb-6">
            Start learning, reviewing, or having conversations to see your history here!
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/learn"
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              Start Learning
            </Link>
            <Link
              href="/review"
              className="px-6 py-3 rounded-xl border border-border hover:bg-accent font-semibold"
            >
              Start Review
            </Link>
            <Link
              href="/conversation"
              className="px-6 py-3 rounded-xl border border-border hover:bg-accent font-semibold"
            >
              Start Conversation
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const sessionLink = getSessionLink(session);
            const accuracy = session.correctCount + session.incorrectCount > 0
              ? Math.round((session.correctCount / (session.correctCount + session.incorrectCount)) * 100)
              : null;
            const isCompleted = session.completedAt !== null;

            const SessionContent = (
              <div className="p-5 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-primary">
                        {getSessionIcon(session.type)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        {getSessionTypeLabel(session.type)}
                      </span>
                      {!isCompleted && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-600">
                          In Progress
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-1">
                      {session.title}
                    </h3>
                    
                    {session.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                        {session.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span>{formatDate(session.startedAt)}</span>
                      {session.durationSeconds > 0 && (
                        <>
                          <span>•</span>
                          <span>{formatDuration(session.durationSeconds)}</span>
                        </>
                      )}
                      {session.type !== 'conversation' && (
                        <>
                          <span>•</span>
                          <span>{session.correctCount} correct</span>
                          {session.incorrectCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{session.incorrectCount} incorrect</span>
                            </>
                          )}
                        </>
                      )}
                      {session.materialsCovered.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{session.materialsCovered.length} materials</span>
                        </>
                      )}
                      {session.xpEarned && session.xpEarned > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-primary font-medium">+{session.xpEarned} XP</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Score/Accuracy display */}
                  {isCompleted && (
                    <div className="text-center">
                      {session.type === 'conversation' && session.overallScore !== null ? (
                        <>
                          <div className={`text-2xl font-bold ${getScoreColor(session.overallScore)}`}>
                            {session.overallScore}%
                          </div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </>
                      ) : accuracy !== null ? (
                        <>
                          <div className={`text-2xl font-bold ${getScoreColor(accuracy)}`}>
                            {accuracy}%
                          </div>
                          <div className="text-xs text-muted-foreground">Accuracy</div>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Score breakdown for conversation sessions */}
                {session.type === 'conversation' && isCompleted && session.overallScore !== null && (
                  <div className="mt-4 pt-4 border-t border-border flex gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">Fluency:</span>
                      <span className={`font-medium ${getScoreColor(session.fluencyScore)}`}>
                        {session.fluencyScore || '-'}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">Grammar:</span>
                      <span className={`font-medium ${getScoreColor(session.grammarScore)}`}>
                        {session.grammarScore || '-'}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">Vocabulary:</span>
                      <span className={`font-medium ${getScoreColor(session.vocabularyScore)}`}>
                        {session.vocabularyScore || '-'}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Environment icon for conversations */}
                {session.type === 'conversation' && session.environment && session.environment !== 'none' && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Environment:</span>
                    {getEnvironmentIcon(session.environment)}
                  </div>
                )}

                {/* Last message preview for conversations */}
                {session.type === 'conversation' && session.conversationTranscript && Array.isArray(session.conversationTranscript) && session.conversationTranscript.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
                    <span className="text-muted-foreground">
                      Last message: &quot;{session.conversationTranscript[session.conversationTranscript.length - 1]?.content?.slice(0, 100) || ''}
                      {session.conversationTranscript[session.conversationTranscript.length - 1]?.content?.length > 100 ? '...' : ''}&quot;
                    </span>
                  </div>
                )}
              </div>
            );

            if (sessionLink) {
              return (
                <Link key={session.id} href={sessionLink}>
                  {SessionContent}
                </Link>
              );
            }

            return <div key={session.id}>{SessionContent}</div>;
          })}
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
