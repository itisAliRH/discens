'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { MaterialType, MaterialCategory, CEFRLevel } from '@/types/database';
import type { ReactNode } from 'react';
import {
  LuBookOpen,
  LuFileText,
  LuMessageCircle,
  LuBook,
  LuSpeech,
  LuBrain,
  LuStar,
  LuTarget,
  LuSparkles,
  LuPencil,
  LuTrash2,
  LuMailOpen,
  LuBadgePlus,
  LuRefreshCw,
  LuClock,
} from '@/components/ui/icons';
import ImportMaterialWizard from '@/components/memory/ImportMaterialWizard';

// ===== Types =====

interface Material {
  id: string;
  type: MaterialType;
  content: {
    word?: string;
    phrase?: string;
    rule?: string;
    meaning?: string;
    explanation?: string;
    examples?: string[];
    article?: string;
    partOfSpeech?: string;
    synonyms?: string[];
    usage?: string;
  };
  categories: MaterialCategory[];
  difficulty_level: number;
  mastery_level: number;
  cefr_level: CEFRLevel | null;
  notes: string | null;
  created_at: string;
}

interface MemoryStats {
  total: number;
  mastered: number;
  byType: {
    word: number;
    phrase: number;
    grammar: number;
    expression: number;
  };
  byMastery: {
    new: number;
    learning: number;
    reviewing: number;
    mastered: number;
  };
}

interface Memory {
  id: string;
  summary: string;
  goals: string[];
  top_categories: MaterialCategory[];
  summary_updated_at: string | null;
}

// ===== Constants =====

const MATERIAL_TYPES: { value: MaterialType | 'all'; label: string; icon: ReactNode }[] = [
  { value: 'all', label: 'All Types', icon: <LuBookOpen className="w-4 h-4" /> },
  { value: 'word', label: 'Words', icon: <LuFileText className="w-4 h-4" /> },
  { value: 'phrase', label: 'Phrases', icon: <LuMessageCircle className="w-4 h-4" /> },
  { value: 'grammar', label: 'Grammar', icon: <LuBook className="w-4 h-4" /> },
  { value: 'expression', label: 'Expressions', icon: <LuSpeech className="w-4 h-4" /> },
];

const CATEGORIES: { value: MaterialCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'travel', label: 'Travel' },
  { value: 'work', label: 'Work' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'health', label: 'Health' },
  { value: 'food', label: 'Food' },
  { value: 'housing', label: 'Housing' },
  { value: 'education', label: 'Education' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'social', label: 'Social' },
  { value: 'daily_life', label: 'Daily Life' },
];

const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// ===== Helper Functions =====

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  
  // For older dates, show the actual date
  return date.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// ===== Component =====

export default function MemoryPage() {
  // State
  const [memory, setMemory] = useState<Memory | null>(null);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<MaterialType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<MaterialCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  
  // Loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);

  // ===== Data Fetching =====

  const loadMemory = useCallback(async () => {
    try {
      const response = await fetch('/api/memory');
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to view your memory');
        } else if (response.status === 404) {
          setError('Complete onboarding to create your memory');
        } else {
          setError('Failed to load memory');
        }
        return;
      }
      const data = await response.json();
      setMemory(data.memory);
      setStats(data.stats);
    } catch (err) {
      console.error('Memory load error:', err);
      setError('Failed to load memory');
    }
  }, []);

  const loadMaterials = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (searchQuery) params.set('search', searchQuery);
      
      const response = await fetch(`/api/memory/materials?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMaterials(data.materials);
      }
    } catch (err) {
      console.error('Materials load error:', err);
    }
  }, [typeFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadMemory();
      await loadMaterials();
      setIsLoading(false);
    }
    init();
  }, [loadMemory, loadMaterials]);

  // Reload materials when filters change
  useEffect(() => {
    if (!isLoading) {
      loadMaterials();
    }
  }, [typeFilter, categoryFilter, searchQuery, loadMaterials, isLoading]);

  // ===== Actions =====

  const handleAddMaterial = async (materialData: {
    type: MaterialType;
    content: Record<string, unknown>;
    categories: MaterialCategory[];
    cefr_level: CEFRLevel;
    notes?: string;
  }) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/memory/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(materialData),
      });
      
      if (response.ok) {
        setShowAddDialog(false);
        await loadMaterials();
        await loadMemory();
      }
    } catch (err) {
      console.error('Add material error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMaterial = async (id: string, updates: Partial<Material>) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/memory/materials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (response.ok) {
        setEditingMaterial(null);
        await loadMaterials();
      }
    } catch (err) {
      console.error('Update material error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      const response = await fetch(`/api/memory/materials/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setDeletingMaterial(null);
        await loadMaterials();
        await loadMemory();
      }
    } catch (err) {
      console.error('Delete material error:', err);
    }
  };

  const handleRefreshSummary = async () => {
    setIsRefreshingSummary(true);
    try {
      const response = await fetch('/api/memory/summary', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update memory with new summary
        setMemory(prev => prev ? {
          ...prev,
          summary: data.summary,
          summary_updated_at: data.updatedAt,
        } : null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to refresh summary');
      }
    } catch (err) {
      console.error('Summary refresh error:', err);
      alert('Failed to refresh summary');
    } finally {
      setIsRefreshingSummary(false);
    }
  };

  const handleGenerate = async (options: {
    categories: MaterialCategory[];
    cefrLevel: CEFRLevel;
    count: number;
  }) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/memory/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      
      if (response.ok) {
        const data = await response.json();
        setShowGenerateDialog(false);
        await loadMaterials();
        await loadMemory();
        alert(`Generated ${data.count} new materials!`);
        // Auto-trigger summary update after generating new materials
        handleRefreshSummary();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to generate materials');
      }
    } catch (err) {
      console.error('Generate error:', err);
      alert('Failed to generate materials');
    } finally {
      setIsGenerating(false);
    }
  };

  // ===== Render: Loading =====

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <LuBrain className="w-6 h-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-muted-foreground mt-4 text-lg font-medium">Loading your memory...</p>
          <p className="text-muted-foreground/70 text-sm mt-2">Fetching your learning materials</p>
        </div>
      </div>
    );
  }

  // ===== Render: Error =====

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center bg-card border border-border rounded-2xl p-8">
          <span className="flex justify-center mb-4"><LuBrain className="w-14 h-14 text-primary" /></span>
          <h2 className="text-xl font-semibold mb-2">Memory Not Found</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link
            href="/onboarding"
            className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
          >
            Complete Setup
          </Link>
        </div>
      </div>
    );
  }

  // ===== Render: Main =====

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Memory</h1>
          <p className="text-muted-foreground">
            Manage your vocabulary, phrases, and grammar
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowGenerateDialog(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium flex items-center gap-2"
          >
            <LuSparkles className="w-4 h-4" /> Generate with AI
          </button>
          <button
            onClick={() => setShowImportWizard(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium flex items-center gap-2"
          >
            <span>📥</span> Import Material
          </button>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium flex items-center gap-2"
          >
            <span>+</span> Quick Add
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Materials" value={stats.total} icon={<LuBookOpen className="w-5 h-5" />} />
          <StatCard label="Mastered" value={stats.mastered} icon={<LuStar className="w-5 h-5" />} color="green" />
          <StatCard label="Learning" value={stats.byMastery.learning} icon={<LuBook className="w-5 h-5" />} color="blue" />
          <StatCard label="New" value={stats.byMastery.new} icon={<LuBadgePlus className="w-5 h-5" />} color="purple" />
        </div>
      )}

      {/* Memory Summary */}
      {memory && memory.summary && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-8">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2">
              <LuBrain className="w-5 h-5 text-primary" /> Learning Summary
            </h3>
            <div className="flex items-center gap-3">
              {/* Last Updated */}
              {memory.summary_updated_at && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <LuClock className="w-3 h-3" />
                  Updated {formatRelativeTime(memory.summary_updated_at)}
                </span>
              )}
              {/* Refresh Button */}
              <button
                onClick={handleRefreshSummary}
                disabled={isRefreshingSummary}
                className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium flex items-center gap-1.5 hover:bg-primary/20 transition-colors disabled:opacity-50"
                title="Refresh summary with AI"
              >
                <LuRefreshCw className={`w-3.5 h-3.5 ${isRefreshingSummary ? 'animate-spin' : ''}`} />
                {isRefreshingSummary ? 'Updating...' : 'Refresh'}
              </button>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">{memory.summary}</p>
          {memory.goals && memory.goals.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {memory.goals.map((goal, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm flex items-center gap-1">
                  <LuTarget className="w-3 h-3" /> {goal}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as MaterialType | 'all')}
          className="px-4 py-2 rounded-xl border border-input bg-background"
        >
          {MATERIAL_TYPES.map(t => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as MaterialCategory | 'all')}
          className="px-4 py-2 rounded-xl border border-input bg-background"
        >
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Materials List */}
      {materials.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-2xl">
          <span className="flex justify-center mb-4"><LuMailOpen className="w-12 h-12 text-muted-foreground" /></span>
          <h2 className="text-xl font-semibold mb-2">No materials yet</h2>
          <p className="text-muted-foreground mb-6">
            Add your first word, phrase, or grammar rule!
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowImportWizard(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold flex items-center gap-2"
            >
              <span>📥</span> Import with AI
            </button>
            <button
              onClick={() => setShowAddDialog(true)}
              className="px-6 py-3 rounded-xl border border-border hover:bg-accent font-semibold"
            >
              Quick Add
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {materials.map(material => (
            <MaterialCard
              key={material.id}
              material={material}
              onEdit={() => setEditingMaterial(material)}
              onDelete={() => setDeletingMaterial(material)}
            />
          ))}
        </div>
      )}

      {/* Add Material Dialog (Quick Add) */}
      {showAddDialog && (
        <AddMaterialDialog
          onClose={() => setShowAddDialog(false)}
          onSave={handleAddMaterial}
          isSaving={isSaving}
        />
      )}

      {/* Import Material Wizard (AI-powered) */}
      {showImportWizard && (
        <ImportMaterialWizard
          onClose={() => setShowImportWizard(false)}
          onSave={async (data) => {
            await handleAddMaterial(data);
            setShowImportWizard(false);
            // Auto-trigger summary update after importing materials
            handleRefreshSummary();
          }}
          isSaving={isSaving}
        />
      )}

      {/* Edit Material Dialog */}
      {editingMaterial && (
        <EditMaterialDialog
          material={editingMaterial}
          onClose={() => setEditingMaterial(null)}
          onSave={(updates) => handleUpdateMaterial(editingMaterial.id, updates)}
          isSaving={isSaving}
        />
      )}

      {/* Delete Confirmation */}
      {deletingMaterial && (
        <DeleteConfirmDialog
          material={deletingMaterial}
          onClose={() => setDeletingMaterial(null)}
          onConfirm={() => handleDeleteMaterial(deletingMaterial.id)}
        />
      )}

      {/* Generate Dialog */}
      {showGenerateDialog && (
        <GenerateDialog
          onClose={() => setShowGenerateDialog(false)}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      )}
    </div>
  );
}

// ===== Sub-Components =====

function StatCard({ label, value, icon, color }: {
  label: string;
  value: number;
  icon: ReactNode;
  color?: 'green' | 'blue' | 'purple';
}) {
  const colorClass = {
    green: 'bg-green-500/10 text-green-600',
    blue: 'bg-blue-500/10 text-blue-600',
    purple: 'bg-purple-500/10 text-purple-600',
  }[color || 'blue'] || 'bg-muted';

  return (
    <div className={`p-4 rounded-xl ${colorClass}`}>
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function MaterialCard({ material, onEdit, onDelete }: {
  material: Material;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const masteryColors = ['bg-gray-200', 'bg-red-200', 'bg-orange-200', 'bg-yellow-200', 'bg-green-200', 'bg-emerald-400'];
  
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Type badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted capitalize">
              {material.type}
            </span>
            {material.cefr_level && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                {material.cefr_level}
              </span>
            )}
            <div className="flex gap-0.5">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i <= material.mastery_level ? masteryColors[material.mastery_level] : 'bg-gray-200'}`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="mb-2">
            {material.type === 'word' && (
              <div>
                <span className="text-lg font-semibold">
                  {material.content.article && (
                    <span className="text-primary">{material.content.article} </span>
                  )}
                  {material.content.word}
                </span>
                {material.content.partOfSpeech && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({material.content.partOfSpeech})
                  </span>
                )}
              </div>
            )}
            {material.type === 'phrase' && (
              <div className="text-lg font-semibold">{material.content.phrase}</div>
            )}
            {material.type === 'grammar' && (
              <div className="text-lg font-semibold">{material.content.rule}</div>
            )}
            {material.type === 'expression' && (
              <div className="text-lg font-semibold">{material.content.phrase || material.content.word}</div>
            )}
          </div>

          {/* Meaning/Explanation */}
          <p className="text-muted-foreground text-sm mb-2">
            {material.content.meaning || material.content.explanation}
          </p>

          {/* Examples */}
          {material.content.examples && material.content.examples.length > 0 && (
            <div className="text-sm text-muted-foreground italic">
              &quot;{material.content.examples[0]}&quot;
            </div>
          )}

          {/* Categories */}
          <div className="flex gap-2 mt-3">
            {material.categories.map(cat => (
              <span key={cat} className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground capitalize">
                {cat.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Edit"
          >
            <LuPencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
            title="Delete"
          >
            <LuTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddMaterialDialog({ onClose, onSave, isSaving }: {
  onClose: () => void;
  onSave: (data: {
    type: MaterialType;
    content: Record<string, unknown>;
    categories: MaterialCategory[];
    cefr_level: CEFRLevel;
    notes?: string;
  }) => void;
  isSaving: boolean;
}) {
  const [type, setType] = useState<MaterialType>('word');
  const [word, setWord] = useState('');
  const [article, setArticle] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [category, setCategory] = useState<MaterialCategory>('daily_life');
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>('A1');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const content: Record<string, unknown> = {};
    
    if (type === 'word') {
      content.word = word;
      if (article) content.article = article;
      content.meaning = meaning;
      if (partOfSpeech) content.partOfSpeech = partOfSpeech;
      if (example) content.examples = [example];
    } else if (type === 'phrase' || type === 'expression') {
      content.phrase = word;
      content.meaning = meaning;
      if (example) content.examples = [example];
    } else if (type === 'grammar') {
      content.rule = word;
      content.explanation = meaning;
      if (example) content.examples = [{ correct: example }];
    }

    onSave({
      type,
      content,
      categories: [category],
      cefr_level: cefrLevel,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Add New Material</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(['word', 'phrase', 'grammar', 'expression'] as MaterialType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`p-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    type === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Word/Phrase/Rule input */}
          <div className="flex gap-3">
            {type === 'word' && (
              <div className="w-24">
                <label className="block text-sm font-medium mb-2">Article</label>
                <select
                  value={article}
                  onChange={(e) => setArticle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  <option value="">-</option>
                  <option value="der">der</option>
                  <option value="die">die</option>
                  <option value="das">das</option>
                </select>
              </div>
            )}
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">
                {type === 'grammar' ? 'Rule' : type === 'word' ? 'Word' : 'Phrase'}
              </label>
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                placeholder={type === 'grammar' ? 'e.g., Verb comes second' : type === 'word' ? 'e.g., Haus' : 'e.g., Wie geht es Ihnen?'}
              />
            </div>
          </div>

          {/* Meaning/Explanation */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {type === 'grammar' ? 'Explanation' : 'Meaning'}
            </label>
            <textarea
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              required
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
              placeholder={type === 'grammar' ? 'Explain the rule...' : 'English meaning...'}
            />
          </div>

          {/* Part of speech (for words) */}
          {type === 'word' && (
            <div>
              <label className="block text-sm font-medium mb-2">Part of Speech</label>
              <select
                value={partOfSpeech}
                onChange={(e) => setPartOfSpeech(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                <option value="">Select...</option>
                <option value="noun">Noun</option>
                <option value="verb">Verb</option>
                <option value="adjective">Adjective</option>
                <option value="adverb">Adverb</option>
                <option value="preposition">Preposition</option>
                <option value="conjunction">Conjunction</option>
              </select>
            </div>
          )}

          {/* Example */}
          <div>
            <label className="block text-sm font-medium mb-2">Example (optional)</label>
            <input
              type="text"
              value={example}
              onChange={(e) => setExample(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              placeholder="Example sentence..."
            />
          </div>

          {/* Category and Level */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MaterialCategory)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                {CATEGORIES.slice(1).map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">CEFR Level</label>
              <select
                value={cefrLevel}
                onChange={(e) => setCefrLevel(e.target.value as CEFRLevel)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                {CEFR_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              placeholder="Personal notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSaving || !word || !meaning}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Add Material'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditMaterialDialog({ material, onClose, onSave, isSaving }: {
  material: Material;
  onClose: () => void;
  onSave: (updates: Partial<Material>) => void;
  isSaving: boolean;
}) {
  const [content, setContent] = useState(material.content);
  const [category, setCategory] = useState<MaterialCategory>(material.categories[0] || 'daily_life');
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>(material.cefr_level || 'A1');
  const [notes, setNotes] = useState(material.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      content,
      categories: [category],
      cefr_level: cefrLevel,
      notes: notes || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Edit Material</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Content fields based on type */}
          {material.type === 'word' && (
            <>
              <div className="flex gap-3">
                <div className="w-24">
                  <label className="block text-sm font-medium mb-2">Article</label>
                  <select
                    value={content.article || ''}
                    onChange={(e) => setContent({ ...content, article: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  >
                    <option value="">-</option>
                    <option value="der">der</option>
                    <option value="die">die</option>
                    <option value="das">das</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Word</label>
                  <input
                    type="text"
                    value={content.word || ''}
                    onChange={(e) => setContent({ ...content, word: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Meaning</label>
                <textarea
                  value={content.meaning || ''}
                  onChange={(e) => setContent({ ...content, meaning: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
                />
              </div>
            </>
          )}

          {(material.type === 'phrase' || material.type === 'expression') && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Phrase</label>
                <input
                  type="text"
                  value={content.phrase || ''}
                  onChange={(e) => setContent({ ...content, phrase: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Meaning</label>
                <textarea
                  value={content.meaning || ''}
                  onChange={(e) => setContent({ ...content, meaning: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
                />
              </div>
            </>
          )}

          {material.type === 'grammar' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Rule</label>
                <input
                  type="text"
                  value={content.rule || ''}
                  onChange={(e) => setContent({ ...content, rule: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Explanation</label>
                <textarea
                  value={content.explanation || ''}
                  onChange={(e) => setContent({ ...content, explanation: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
                />
              </div>
            </>
          )}

          {/* Category and Level */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MaterialCategory)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                {CATEGORIES.slice(1).map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">CEFR Level</label>
              <select
                value={cefrLevel}
                onChange={(e) => setCefrLevel(e.target.value as CEFRLevel)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                {CEFR_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmDialog({ material, onClose, onConfirm }: {
  material: Material;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const displayText = material.content.word || material.content.phrase || material.content.rule || 'this material';

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-lg text-center">
        <span className="flex justify-center mb-4"><LuTrash2 className="w-12 h-12 text-red-500" /></span>
        <h2 className="text-xl font-bold mb-2">Delete Material?</h2>
        <p className="text-muted-foreground mb-6">
          Are you sure you want to delete &quot;{displayText}&quot;? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function GenerateDialog({ onClose, onGenerate, isGenerating }: {
  onClose: () => void;
  onGenerate: (options: {
    categories: MaterialCategory[];
    cefrLevel: CEFRLevel;
    count: number;
  }) => void;
  isGenerating: boolean;
}) {
  const [selectedCategories, setSelectedCategories] = useState<MaterialCategory[]>(['daily_life']);
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>('A1');
  const [count, setCount] = useState(5);

  const toggleCategory = (cat: MaterialCategory) => {
    setSelectedCategories(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategories.length === 0) return;
    onGenerate({
      categories: selectedCategories,
      cefrLevel,
      count,
    });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-2">Generate Materials with AI</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Let AI create vocabulary, phrases, and grammar rules based on your preferences.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Categories */}
          <div>
            <label className="block text-sm font-medium mb-3">Categories</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.slice(1).map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggleCategory(cat.value as MaterialCategory)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedCategories.includes(cat.value as MaterialCategory)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* CEFR Level */}
          <div>
            <label className="block text-sm font-medium mb-3">Difficulty Level</label>
            <div className="flex gap-2">
              {CEFR_LEVELS.map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setCefrLevel(level)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    cefrLevel === level
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Number of Materials: {count}
            </label>
            <input
              type="range"
              min="3"
              max="15"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>3</span>
              <span>15</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isGenerating || selectedCategories.length === 0}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  Generating...
                </>
              ) : (
                <>
                  <LuSparkles className="w-4 h-4" /> Generate
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="flex-1 py-3 rounded-xl border border-border hover:bg-accent disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
