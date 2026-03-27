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
  apiKey: string;
}

export interface GenerationLog {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'thinking';
}

export enum GeneratorState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  PLAN_REVIEW = 'PLAN_REVIEW',
  GENERATING_CASES = 'GENERATING_CASES',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}