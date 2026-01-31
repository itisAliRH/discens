'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { MaterialType, MaterialCategory, CEFRLevel } from '@/types/database';

// ============================================
// TYPES
// ============================================

type WizardStep = 'type' | 'import' | 'prefill' | 'edit' | 'validate' | 'complete';

interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
  suggestedValue?: unknown;
}

interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  corrections?: Record<string, unknown>;
  overallAssessment: string;
}

interface PrefillResult {
  content: Record<string, unknown>;
  suggestedCategories: string[];
  suggestedCefrLevel: string;
  suggestedDifficulty: number;
  confidence: number;
}

// Content type definitions for form state
interface WordContent {
  word: string;
  article?: string;
  meaning: string;
  pronunciation?: string;
  examples: string[];
  synonyms?: string[];
  antonyms?: string[];
  partOfSpeech: string;
  pluralForm?: string;
  conjugation?: Record<string, string>;
}

interface PhraseContent {
  phrase: string;
  meaning: string;
  literal?: string;
  usage: string;
  examples: string[];
  formality?: 'formal' | 'informal' | 'neutral';
}

interface GrammarContent {
  rule: string;
  explanation: string;
  examples: Array<{ correct: string; incorrect?: string; explanation?: string }>;
  relatedRules?: string[];
}

interface ExpressionContent {
  expression: string;
  meaning: string;
  origin?: string;
  examples: string[];
  equivalents?: string[];
}

interface TextContent {
  title: string;
  content: string;
  summary?: string;
  vocabulary?: string[];
  questions?: Array<{ question: string; answer: string }>;
}

type MaterialContent = WordContent | PhraseContent | GrammarContent | ExpressionContent | TextContent;

// ============================================
// CONSTANTS
// ============================================

const MATERIAL_TYPES: { value: MaterialType; label: string; icon: string; description: string }[] = [
  { value: 'word', label: 'Word', icon: '📝', description: 'Vocabulary word with meaning, examples' },
  { value: 'phrase', label: 'Phrase', icon: '💬', description: 'Common phrase or expression' },
  { value: 'grammar', label: 'Grammar', icon: '📖', description: 'Grammar rule with examples' },
  { value: 'expression', label: 'Expression', icon: '🗣️', description: 'Idiom or cultural expression' },
  { value: 'text', label: 'Text', icon: '📄', description: 'Longer reading passage' },
];

const CATEGORIES: { value: MaterialCategory; label: string }[] = [
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

const MAX_CATEGORIES = 5;

// ============================================
// COMPONENT
// ============================================

interface ImportMaterialWizardProps {
  onClose: () => void;
  onSave: (data: {
    type: MaterialType;
    content: Record<string, unknown>;
    categories: MaterialCategory[];
    cefr_level: CEFRLevel;
    difficulty_level: number;
    notes?: string;
  }) => Promise<void>;
  isSaving: boolean;
}

export default function ImportMaterialWizard({
  onClose,
  onSave,
  isSaving,
}: ImportMaterialWizardProps) {
  // Wizard state
  const [step, setStep] = useState<WizardStep>('type');
  
  // Form state
  const [materialType, setMaterialType] = useState<MaterialType | null>(null);
  const [rawContent, setRawContent] = useState('');
  const [content, setContent] = useState<MaterialContent | null>(null);
  const [originalContent, setOriginalContent] = useState<MaterialContent | null>(null);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>('A1');
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [notes, setNotes] = useState('');
  
  // Loading states
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  // Validation state
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [prefillConfidence, setPrefillConfidence] = useState(0);

  // ============================================
  // HANDLERS
  // ============================================

  const handleTypeSelect = (type: MaterialType) => {
    setMaterialType(type);
    setStep('import');
  };

  const handleImport = async () => {
    if (!materialType || !rawContent.trim()) return;

    setIsPrefilling(true);
    try {
      const response = await fetch('/api/memory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: materialType,
          rawContent: rawContent.trim(),
          targetLanguage: 'de',
          nativeLanguage: 'en',
        }),
      });

      const data = await response.json();
      
      if (data.success && data.prefill) {
        const prefill = data.prefill as PrefillResult;
        setContent(prefill.content as unknown as MaterialContent);
        setOriginalContent(JSON.parse(JSON.stringify(prefill.content)) as unknown as MaterialContent);
        setCategories(prefill.suggestedCategories.slice(0, MAX_CATEGORIES) as MaterialCategory[]);
        setCefrLevel(prefill.suggestedCefrLevel as CEFRLevel);
        setDifficultyLevel(prefill.suggestedDifficulty);
        setPrefillConfidence(prefill.confidence);
        setStep('edit');
      } else {
        // Initialize empty content structure
        setContent(getEmptyContent(materialType));
        setOriginalContent(null);
        setStep('edit');
      }
    } catch (error) {
      console.error('Prefill error:', error);
      setContent(getEmptyContent(materialType));
      setStep('edit');
    } finally {
      setIsPrefilling(false);
    }
  };

  const handleValidate = async () => {
    if (!materialType || !content) return;

    setIsValidating(true);
    try {
      const response = await fetch('/api/memory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          type: materialType,
          content,
          categories,
          cefrLevel,
          targetLanguage: 'de',
          nativeLanguage: 'en',
        }),
      });

      const data = await response.json();
      
      if (data.success && data.validation) {
        setValidation(data.validation);
        setStep('validate');
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleApplyCorrections = () => {
    if (validation?.corrections) {
      setContent(prev => ({ ...prev, ...validation.corrections } as MaterialContent));
    }
    // Clear only errors from issues
    setValidation(prev => prev ? {
      ...prev,
      isValid: true,
      issues: prev.issues.filter(i => i.severity !== 'error'),
    } : null);
  };

  const handleSave = async () => {
    if (!materialType || !content) return;

    await onSave({
      type: materialType,
      content: content as unknown as Record<string, unknown>,
      categories,
      cefr_level: cefrLevel,
      difficulty_level: difficultyLevel,
      notes: notes || undefined,
    });
  };

  // Track if user has made edits
  const contentChanged = useMemo(() => {
    if (!content || !originalContent) return false;
    return JSON.stringify(content) !== JSON.stringify(originalContent);
  }, [content, originalContent]);

  useEffect(() => {
    if (contentChanged && !hasUserEdited) {
      setHasUserEdited(true);
    }
  }, [contentChanged, hasUserEdited]);

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderStepIndicator = () => {
    const steps = [
      { key: 'type', label: 'Type' },
      { key: 'import', label: 'Import' },
      { key: 'edit', label: 'Edit' },
      { key: 'validate', label: 'Review' },
    ];
    
    const currentIndex = steps.findIndex(s => s.key === step || 
      (step === 'prefill' && s.key === 'import') ||
      (step === 'complete' && s.key === 'validate')
    );

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i < currentIndex
                  ? 'bg-green-500 text-white'
                  : i === currentIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < currentIndex ? '✓' : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 ${
                  i < currentIndex ? 'bg-green-500' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderTypeStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">What would you like to import?</h3>
        <p className="text-muted-foreground text-sm">Choose the type of learning material</p>
      </div>
      
      <div className="grid gap-3">
        {MATERIAL_TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => handleTypeSelect(type.value)}
            className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-accent transition-all text-left"
          >
            <span className="text-3xl">{type.icon}</span>
            <div>
              <div className="font-medium">{type.label}</div>
              <div className="text-sm text-muted-foreground">{type.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderImportStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">
          Import {materialType && MATERIAL_TYPES.find(t => t.value === materialType)?.label}
        </h3>
        <p className="text-muted-foreground text-sm">
          Paste the content and our AI will structure it for you
        </p>
      </div>

      <textarea
        value={rawContent}
        onChange={(e) => setRawContent(e.target.value)}
        placeholder={getPlaceholder(materialType)}
        className="w-full h-48 px-4 py-3 rounded-xl border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="bg-muted/50 rounded-lg p-4 text-sm">
        <div className="font-medium mb-1">💡 Tips</div>
        <ul className="text-muted-foreground space-y-1 list-disc list-inside">
          {getTips(materialType).map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep('type')}
          className="flex-1 py-3 rounded-xl border border-border hover:bg-accent"
        >
          Back
        </button>
        <button
          onClick={handleImport}
          disabled={!rawContent.trim() || isPrefilling}
          className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPrefilling ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Processing...
            </>
          ) : (
            <>
              <span>✨</span> Process with AI
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderEditStep = () => {
    if (!materialType || !content) return null;

    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold">Review & Edit</h3>
          <p className="text-muted-foreground text-sm">
            AI has prefilled the fields. Make any necessary changes.
          </p>
          {prefillConfidence > 0 && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm">
              <span className={prefillConfidence > 0.7 ? 'text-green-500' : prefillConfidence > 0.4 ? 'text-yellow-500' : 'text-red-500'}>
                ●
              </span>
              AI Confidence: {Math.round(prefillConfidence * 100)}%
            </div>
          )}
        </div>

        {/* Dynamic content editor based on type */}
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          {renderContentEditor()}
        </div>

        {/* Categories (max 5) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Categories <span className="text-muted-foreground">({categories.length}/{MAX_CATEGORIES})</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                disabled={!categories.includes(cat.value) && categories.length >= MAX_CATEGORIES}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-40 ${
                  categories.includes(cat.value)
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">CEFR Level</label>
            <div className="flex gap-1">
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
          <div>
            <label className="block text-sm font-medium mb-2">Difficulty: {difficultyLevel}</label>
            <input
              type="range"
              min="1"
              max="5"
              value={difficultyLevel}
              onChange={(e) => setDifficultyLevel(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-2">Personal Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any personal notes..."
            className="w-full px-3 py-2 rounded-lg border border-input bg-background"
          />
        </div>

        {/* User edit indicator */}
        {hasUserEdited && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm">
            <span className="text-yellow-600">⚠️</span>{' '}
            You&apos;ve made changes. We&apos;ll validate your edits before saving.
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setStep('import')}
            className="flex-1 py-3 rounded-xl border border-border hover:bg-accent"
          >
            Back
          </button>
          <button
            onClick={hasUserEdited ? handleValidate : handleSave}
            disabled={isValidating || isSaving || categories.length === 0}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isValidating ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Validating...
              </>
            ) : hasUserEdited ? (
              <>
                <span>🔍</span> Validate & Save
              </>
            ) : (
              <>
                <span>💾</span> Save Material
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderValidateStep = () => {
    if (!validation) return null;

    const errors = validation.issues.filter(i => i.severity === 'error');
    const warnings = validation.issues.filter(i => i.severity === 'warning');
    const suggestions = validation.issues.filter(i => i.severity === 'suggestion');
    const hasErrors = errors.length > 0;

    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <span className="text-5xl mb-3 block">
            {validation.isValid ? '✅' : hasErrors ? '❌' : '⚠️'}
          </span>
          <h3 className="text-lg font-semibold">
            {validation.isValid ? 'Content Validated!' : hasErrors ? 'Issues Found' : 'Minor Issues'}
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            {validation.overallAssessment}
          </p>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="font-medium text-red-600 mb-2">❌ Errors (must fix)</div>
            <ul className="space-y-2">
              {errors.map((issue, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{issue.field}:</span>{' '}
                  {issue.message}
                  {issue.suggestedValue !== undefined && (
                    <span className="block text-green-600 mt-1">
                      💡 Suggested: {String(issue.suggestedValue)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="font-medium text-yellow-600 mb-2">⚠️ Warnings</div>
            <ul className="space-y-2">
              {warnings.map((issue, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{issue.field}:</span>{' '}
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="font-medium text-blue-600 mb-2">💡 Suggestions</div>
            <ul className="space-y-2">
              {suggestions.map((issue, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{issue.field}:</span>{' '}
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {hasErrors ? (
            <>
              <button
                onClick={() => setStep('edit')}
                className="flex-1 py-3 rounded-xl border border-border hover:bg-accent"
              >
                Edit Manually
              </button>
              {validation.corrections && Object.keys(validation.corrections).length > 0 && (
                <button
                  onClick={handleApplyCorrections}
                  className="flex-1 py-3 rounded-xl bg-green-500 text-white font-medium"
                >
                  ✨ Apply AI Corrections
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('edit')}
                className="flex-1 py-3 rounded-xl border border-border hover:bg-accent"
              >
                Edit More
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : '💾 Save Material'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderContentEditor = () => {
    if (!materialType || !content) return null;

    switch (materialType) {
      case 'word':
        return renderWordEditor(content as WordContent);
      case 'phrase':
        return renderPhraseEditor(content as PhraseContent);
      case 'grammar':
        return renderGrammarEditor(content as GrammarContent);
      case 'expression':
        return renderExpressionEditor(content as ExpressionContent);
      case 'text':
        return renderTextEditor(content as TextContent);
      default:
        return null;
    }
  };

  const renderWordEditor = (wordContent: WordContent) => (
    <>
      <div className="flex gap-3">
        <div className="w-24">
          <label className="block text-sm font-medium mb-2">Article</label>
          <select
            value={wordContent.article || ''}
            onChange={(e) => updateContent({ article: e.target.value || undefined })}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background"
          >
            <option value="">-</option>
            <option value="der">der</option>
            <option value="die">die</option>
            <option value="das">das</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Word *</label>
          <input
            type="text"
            value={wordContent.word || ''}
            onChange={(e) => updateContent({ word: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Meaning *</label>
        <textarea
          value={wordContent.meaning || ''}
          onChange={(e) => updateContent({ meaning: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Part of Speech</label>
          <select
            value={wordContent.partOfSpeech || ''}
            onChange={(e) => updateContent({ partOfSpeech: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background"
          >
            <option value="">Select...</option>
            <option value="noun">Noun</option>
            <option value="verb">Verb</option>
            <option value="adjective">Adjective</option>
            <option value="adverb">Adverb</option>
            <option value="preposition">Preposition</option>
            <option value="conjunction">Conjunction</option>
            <option value="pronoun">Pronoun</option>
            <option value="article">Article</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Pronunciation</label>
          <input
            type="text"
            value={wordContent.pronunciation || ''}
            onChange={(e) => updateContent({ pronunciation: e.target.value || undefined })}
            placeholder="IPA notation"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Plural Form</label>
        <input
          type="text"
          value={wordContent.pluralForm || ''}
          onChange={(e) => updateContent({ pluralForm: e.target.value || undefined })}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Examples</label>
        {renderArrayEditor(
          wordContent.examples || [],
          (examples) => updateContent({ examples }),
          'Add example sentence'
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Synonyms</label>
          {renderArrayEditor(
            wordContent.synonyms || [],
            (synonyms) => updateContent({ synonyms: synonyms.length > 0 ? synonyms : undefined }),
            'Add synonym'
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Antonyms</label>
          {renderArrayEditor(
            wordContent.antonyms || [],
            (antonyms) => updateContent({ antonyms: antonyms.length > 0 ? antonyms : undefined }),
            'Add antonym'
          )}
        </div>
      </div>
    </>
  );

  const renderPhraseEditor = (phraseContent: PhraseContent) => (
    <>
      <div>
        <label className="block text-sm font-medium mb-2">Phrase *</label>
        <input
          type="text"
          value={phraseContent.phrase || ''}
          onChange={(e) => updateContent({ phrase: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Meaning *</label>
        <textarea
          value={phraseContent.meaning || ''}
          onChange={(e) => updateContent({ meaning: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Literal Translation</label>
        <input
          type="text"
          value={phraseContent.literal || ''}
          onChange={(e) => updateContent({ literal: e.target.value || undefined })}
          placeholder="Word-for-word translation"
          className="w-full px-3 py-2 rounded-lg border border-input bg-background"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Usage Context *</label>
        <textarea
          value={phraseContent.usage || ''}
          onChange={(e) => updateContent({ usage: e.target.value })}
          rows={2}
          placeholder="When and how to use this phrase"
          className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Formality</label>
        <div className="flex gap-2">
          {(['formal', 'neutral', 'informal'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => updateContent({ formality: f })}
              className={`flex-1 py-2 rounded-lg text-sm capitalize ${
                phraseContent.formality === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Examples</label>
        {renderArrayEditor(
          phraseContent.examples || [],
          (examples) => updateContent({ examples }),
          'Add example sentence'
        )}
      </div>
    </>
  );

  const renderGrammarEditor = (grammarContent: GrammarContent) => (
    <>
      <div>
        <label className="block text-sm font-medium mb-2">Rule Name *</label>
        <input
          type="text"
          value={grammarContent.rule || ''}
          onChange={(e) => updateContent({ rule: e.target.value })}
          placeholder="e.g., Verb position in main clauses"
          className="w-full px-3 py-2 rounded-lg border border-input bg-background"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Explanation *</label>
        <textarea
          value={grammarContent.explanation || ''}
          onChange={(e) => updateContent({ explanation: e.target.value })}
          rows={3}
          placeholder="Clear explanation of the rule"
          className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Examples *</label>
        <div className="space-y-3">
          {(grammarContent.examples || []).map((ex, i) => (
            <div key={i} className="bg-muted/50 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Example {i + 1}</span>
                <button
                  type="button"
                  onClick={() => {
                    const examples = [...(grammarContent.examples || [])];
                    examples.splice(i, 1);
                    updateContent({ examples });
                  }}
                  className="text-red-500 hover:text-red-600 text-sm"
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                value={ex.correct}
                onChange={(e) => {
                  const examples = [...(grammarContent.examples || [])];
                  examples[i] = { ...examples[i], correct: e.target.value };
                  updateContent({ examples });
                }}
                placeholder="Correct sentence"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
              />
              <input
                type="text"
                value={ex.incorrect || ''}
                onChange={(e) => {
                  const examples = [...(grammarContent.examples || [])];
                  examples[i] = { ...examples[i], incorrect: e.target.value || undefined };
                  updateContent({ examples });
                }}
                placeholder="Incorrect version (optional)"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const examples = [...(grammarContent.examples || []), { correct: '' }];
              updateContent({ examples });
            }}
            className="w-full py-2 rounded-lg border border-dashed border-input hover:border-primary text-sm text-muted-foreground"
          >
            + Add Example
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Related Rules</label>
        {renderArrayEditor(
          grammarContent.relatedRules || [],
          (relatedRules) => updateContent({ relatedRules: relatedRules.length > 0 ? relatedRules : undefined }),
          'Add related rule'
        )}
      </div>
    </>
  );

  const renderExpressionEditor = (expressionContent: ExpressionContent) => (
    <>
      <div>
        <label className="block text-sm font-medium mb-2">Expression *</label>
        <input
          type="text"
          value={expressionContent.expression || ''}
          onChange={(e) => updateContent({ expression: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Meaning *</label>
        <textarea
          value={expressionContent.meaning || ''}
          onChange={(e) => updateContent({ meaning: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Origin</label>
        <textarea
          value={expressionContent.origin || ''}
          onChange={(e) => updateContent({ origin: e.target.value || undefined })}
          rows={2}
          placeholder="Historical or cultural background"
          className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Examples</label>
        {renderArrayEditor(
          expressionContent.examples || [],
          (examples) => updateContent({ examples }),
          'Add example usage'
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">English Equivalents</label>
        {renderArrayEditor(
          expressionContent.equivalents || [],
          (equivalents) => updateContent({ equivalents: equivalents.length > 0 ? equivalents : undefined }),
          'Add equivalent expression'
        )}
      </div>
    </>
  );

  const renderTextEditor = (textContent: TextContent) => (
    <>
      <div>
        <label className="block text-sm font-medium mb-2">Title *</label>
        <input
          type="text"
          value={textContent.title || ''}
          onChange={(e) => updateContent({ title: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Content *</label>
        <textarea
          value={textContent.content || ''}
          onChange={(e) => updateContent({ content: e.target.value })}
          rows={6}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Summary</label>
        <textarea
          value={textContent.summary || ''}
          onChange={(e) => updateContent({ summary: e.target.value || undefined })}
          rows={2}
          placeholder="Brief summary in English"
          className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Key Vocabulary</label>
        {renderArrayEditor(
          textContent.vocabulary || [],
          (vocabulary) => updateContent({ vocabulary: vocabulary.length > 0 ? vocabulary : undefined }),
          'Add key word'
        )}
      </div>
    </>
  );

  const renderArrayEditor = (
    items: string[],
    onChange: (items: string[]) => void,
    placeholder: string
  ) => (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => {
              const newItems = [...items];
              newItems[i] = e.target.value;
              onChange(newItems);
            }}
            className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
          />
          <button
            type="button"
            onClick={() => {
              const newItems = items.filter((_, idx) => idx !== i);
              onChange(newItems);
            }}
            className="px-3 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="w-full py-2 rounded-lg border border-dashed border-input hover:border-primary text-sm text-muted-foreground"
      >
        + {placeholder}
      </button>
    </div>
  );

  // ============================================
  // HELPERS
  // ============================================

  const updateContent = useCallback((updates: Partial<MaterialContent>) => {
    setContent(prev => prev ? { ...prev, ...updates } as MaterialContent : null);
  }, []);

  const toggleCategory = (cat: MaterialCategory) => {
    setCategories(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : prev.length < MAX_CATEGORIES
        ? [...prev, cat]
        : prev
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-xl w-full shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Import Material</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Step indicator */}
        {renderStepIndicator()}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 'type' && renderTypeStep()}
          {step === 'import' && renderImportStep()}
          {step === 'edit' && renderEditStep()}
          {step === 'validate' && renderValidateStep()}
        </div>
      </div>
    </div>
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getEmptyContent(type: MaterialType | null): MaterialContent {
  switch (type) {
    case 'word':
      return { word: '', meaning: '', partOfSpeech: '', examples: [] };
    case 'phrase':
      return { phrase: '', meaning: '', usage: '', examples: [] };
    case 'grammar':
      return { rule: '', explanation: '', examples: [] };
    case 'expression':
      return { expression: '', meaning: '', examples: [] };
    case 'text':
      return { title: '', content: '' };
    default:
      return { word: '', meaning: '', partOfSpeech: '', examples: [] };
  }
}

function getPlaceholder(type: MaterialType | null): string {
  switch (type) {
    case 'word':
      return 'Enter a German word (e.g., "der Hund - the dog" or just "Hund")';
    case 'phrase':
      return 'Enter a German phrase (e.g., "Wie geht es Ihnen?" or "How are you? - Wie geht es Ihnen?")';
    case 'grammar':
      return 'Describe the grammar rule (e.g., "In German, the verb always goes in second position in main clauses...")';
    case 'expression':
      return 'Enter an idiom or expression (e.g., "Da steppt der Bär" or "That\'s where the action is")';
    case 'text':
      return 'Paste a German text for reading practice...';
    default:
      return 'Enter content to import...';
  }
}

function getTips(type: MaterialType | null): string[] {
  switch (type) {
    case 'word':
      return [
        'Include the article (der/die/das) for German nouns',
        'You can include the English meaning separated by " - "',
        'AI will automatically detect part of speech and add examples',
      ];
    case 'phrase':
      return [
        'Paste the phrase in German or both German and English',
        'Include context if the phrase has specific usage',
        'AI will identify formality level and add examples',
      ];
    case 'grammar':
      return [
        'Describe the rule in your own words or paste from a source',
        'Include examples if you have them',
        'AI will structure and verify the explanation',
      ];
    case 'expression':
      return [
        'Enter the idiom/expression in German',
        'Include the meaning if you know it',
        'AI will add cultural context and equivalents',
      ];
    case 'text':
      return [
        'Paste German text from articles, books, or exercises',
        'AI will extract key vocabulary and create questions',
        'Good for reading comprehension practice',
      ];
    default:
      return [];
  }
}
