import type { AiInteractionType } from '../types/index.js';
import { aiChatPromptTemplate } from './aiChat.prompt.js';
import { aiMenuPromptTemplate } from './aiMenu.prompt.js';
import { aiPlateAnalysisPromptTemplate } from './aiPlateAnalysis.prompt.js';
import { aiProfileExplanationPromptTemplate } from './aiProfileExplanation.prompt.js';

export interface DefaultAiPromptTemplate {
  promptKey: string;
  version: string;
  type: AiInteractionType;
  systemPrompt: string;
  userPromptTemplate: string;
  outputSchema: Record<string, unknown>;
  isActive: boolean;
  notes: string;
}

const aiChatOutputSchema: Record<string, unknown> = {
  responseText: 'string',
  structuredData: {
    recommendations: 'string[]',
    warnings: 'string[]',
    followUpQuestions: 'string[]',
    confidence: '"low" | "medium" | "high"',
  },
  safety: {
    isOutOfScope: 'boolean',
    flags: 'string[]',
    escalationMessage: 'string | null',
  },
};

const aiMenuOutputSchema: Record<string, unknown> = {
  responseText: 'string',
  structuredData: {
    dailyCalories: 'number',
    days: [
      {
        day: 'number',
        meals: [
          {
            name: 'string',
            description: 'string',
            estimatedCalories: 'number',
            estimatedProtein: 'number',
            estimatedCarbs: 'number',
            estimatedFat: 'number',
          },
        ],
      },
    ],
    recommendations: 'string[]',
    warnings: 'string[]',
  },
  safety: {
    isOutOfScope: 'boolean',
    flags: 'string[]',
    escalationMessage: 'string | null',
  },
};

const aiPlateAnalysisOutputSchema: Record<string, unknown> = {
  responseText: 'string',
  structuredData: {
    detectedFoods: [
      {
        name: 'string',
        estimatedQuantity: 'string',
        confidence: '"low" | "medium" | "high"',
      },
    ],
    estimatedNutrition: {
      caloriesRange: { min: 'number', max: 'number' },
      proteinRange: { min: 'number', max: 'number' },
      carbsRange: { min: 'number', max: 'number' },
      fatRange: { min: 'number', max: 'number' },
    },
    assumptions: 'string[]',
    confidenceReason: 'string',
    proportions: {
      protein: 'string',
      carbs: 'string',
      vegetables: 'string',
      fats: 'string',
    },
    recommendations: 'string[]',
    warnings: 'string[]',
    confidence: '"low" | "medium" | "high"',
  },
  safety: {
    isOutOfScope: 'boolean',
    flags: 'string[]',
    escalationMessage: 'string | null',
  },
};

const aiProfileExplanationOutputSchema: Record<string, unknown> = {
  responseText: 'string',
  structuredData: {
    explainedMetrics: 'string[]',
    recommendations: 'string[]',
    warnings: 'string[]',
    confidence: '"low" | "medium" | "high"',
  },
  safety: {
    isOutOfScope: 'boolean',
    flags: 'string[]',
    escalationMessage: 'string | null',
  },
};

export const defaultAiPromptTemplates: DefaultAiPromptTemplate[] = [
  {
    promptKey: aiChatPromptTemplate.promptKey,
    version: aiChatPromptTemplate.version,
    type: 'chat',
    systemPrompt: aiChatPromptTemplate.systemPrompt,
    userPromptTemplate: aiChatPromptTemplate.userPromptTemplate,
    outputSchema: aiChatOutputSchema,
    isActive: true,
    notes: 'Coach educativo conversacional. Salida JSON validada por aiChatResponseSchema.',
  },
  {
    promptKey: aiMenuPromptTemplate.promptKey,
    version: aiMenuPromptTemplate.version,
    type: 'menu_generation',
    systemPrompt: aiMenuPromptTemplate.systemPrompt,
    userPromptTemplate: aiMenuPromptTemplate.userPromptTemplate,
    outputSchema: aiMenuOutputSchema,
    isActive: true,
    notes: 'Generador de menú orientativo. Salida JSON validada por aiMenuResponseSchema.',
  },
  {
    promptKey: aiPlateAnalysisPromptTemplate.promptKey,
    version: aiPlateAnalysisPromptTemplate.version,
    type: 'plate_analysis',
    systemPrompt: aiPlateAnalysisPromptTemplate.systemPrompt,
    userPromptTemplate: aiPlateAnalysisPromptTemplate.userPromptTemplate,
    outputSchema: aiPlateAnalysisOutputSchema,
    isActive: true,
    notes: 'Análisis aproximado de plato a partir de imagen. Salida JSON validada por aiPlateAnalysisResponseSchema.',
  },
  {
    promptKey: aiProfileExplanationPromptTemplate.promptKey,
    version: aiProfileExplanationPromptTemplate.version,
    type: 'profile_explanation',
    systemPrompt: aiProfileExplanationPromptTemplate.systemPrompt,
    userPromptTemplate: aiProfileExplanationPromptTemplate.userPromptTemplate,
    outputSchema: aiProfileExplanationOutputSchema,
    isActive: true,
    notes: 'Explica al usuario el perfil nutricional calculado por el backend tras el onboarding. Salida JSON validada por aiProfileExplanationResponseSchema.',
  },
];
