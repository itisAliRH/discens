'use client';

import { useState } from 'react';
import type { QuizType } from '@/types/database';
import {
  LuCheckCircle,
  LuCircle,
  LuList,
  LuCheckSquare,
  LuPencil,
} from '@/components/ui/icons';

interface QuizTypeSelectorProps {
  onSelect: (types: QuizType[]) => void;
  defaultTypes?: QuizType[];
  disabled?: boolean;
}

const QUIZ_TYPES: Array<{
  id: QuizType;
  name: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'multiple_choice',
    name: 'Multiple Choice',
    description: 'Choose the correct answer from 4 options',
    icon: <LuList className="w-5 h-5" />,
  },
  {
    id: 'true_false',
    name: 'True/False',
    description: 'Determine if a statement is true or false',
    icon: <LuCheckSquare className="w-5 h-5" />,
  },
  {
    id: 'fill_blank',
    name: 'Fill in the Blank',
    description: 'Complete the sentence with the missing word',
    icon: <LuPencil className="w-5 h-5" />,
  },
];

export default function QuizTypeSelector({
  onSelect,
  defaultTypes = ['multiple_choice', 'fill_blank'],
  disabled = false,
}: QuizTypeSelectorProps) {
  const [selectedTypes, setSelectedTypes] = useState<QuizType[]>(defaultTypes);

  const toggleType = (type: QuizType) => {
    if (disabled) return;
    
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    
    setSelectedTypes(newTypes);
    onSelect(newTypes);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Quiz Types</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select one or more types of questions you'd like to practice
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {QUIZ_TYPES.map(type => {
          const isSelected = selectedTypes.includes(type.id);
          
          return (
            <button
              key={type.id}
              onClick={() => toggleType(type.id)}
              disabled={disabled}
              className={`
                relative p-4 rounded-xl border-2 transition-all text-left
                ${isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  mt-0.5 flex-shrink-0
                  ${isSelected ? 'text-primary' : 'text-muted-foreground'}
                `}>
                  {isSelected ? (
                    <LuCheckCircle className="w-5 h-5" />
                  ) : (
                    <LuCircle className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`
                      ${isSelected ? 'text-primary' : 'text-muted-foreground'}
                    `}>
                      {type.icon}
                    </span>
                    <h4 className={`
                      font-semibold
                      ${isSelected ? 'text-foreground' : 'text-muted-foreground'}
                    `}>
                      {type.name}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {type.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      
      {selectedTypes.length === 0 && (
        <p className="text-sm text-destructive">
          Please select at least one quiz type
        </p>
      )}
    </div>
  );
}
