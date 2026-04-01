export type AiProvider = 'google' | 'laozhang';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  type: 'basic' | 'edge' | 'max' | 'random' | 'trick';
  generationMethod: 'direct' | 'script';
  input: string;
  scriptContent?: string; // Stores the Python code if method is script
  expectedOutput: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

export interface ProblemContext {
  statement: string;
  solution: string;
  testCaseCount: number;
  enableDelay: boolean;
  delaySeconds: number;
  selectedModel: string;
  provider: AiProvider;
  apiKeys: Record<AiProvider, string>;
}

export interface GenerationLog {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'thinking';
}

export enum GeneratorState {
  IDLE = 'idle',
  ANALYZING = 'analyzing',
  PLAN_REVIEW = 'plan_review',
  GENERATING_CASES = 'generating_cases',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface GenerationRecord {
  id: number;
  date: number;
  problemStatement: string;
  solution: string;
  testCases: TestCase[];
  modelName: string;
  provider: string;
}