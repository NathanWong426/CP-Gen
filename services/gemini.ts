import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TestCase } from '../types';

const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

const MODEL_NAME = 'gemini-3-pro-preview';

/**
 * Helper function to retry API calls on 429 errors (Rate Limit)
 * Uses aggressive exponential backoff: 4s -> 8s -> 16s -> 32s -> 64s
 */
async function withRetry<T>(operation: () => Promise<T>, retries = 5, delay = 4000): Promise<T> {
  try {
    return await operation();
  } catch (err: any) {
    const isRateLimit = err?.status === 429 || err?.code === 429 || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');
    
    if (retries > 0 && isRateLimit) {
      console.warn(`Rate limit hit (429). Retrying in ${delay}ms... (Attempts left: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(operation, retries - 1, delay * 2);
    }
    throw err;
  }
}

/**
 * Step 1: Analyze the problem and plan test cases.
 */
export const analyzeProblemAndPlan = async (
  statement: string,
  solution: string,
  testCaseCount: number
): Promise<{ testPlan: Omit<TestCase, 'input' | 'expectedOutput' | 'status'>[] }> => {
  
  const prompt = `
    你是一位世界总决赛级别的算法竞赛教练和出题人。
    
    任务：分析以下算法竞赛题目和提供的标准解法。
    你的目标是设计一套全面的测试用例，以暴露潜在的 Bug、未处理的边界情况、TLE（超时）风险和溢出问题。
    
    题目描述：
    ---
    ${statement}
    ---
    
    标准解法：
    ---
    ${solution}
    ---
    
    请严格返回 ${testCaseCount} 个不同的测试用例。
    
    对于每个测试用例，请推荐生成方式 (generationMethod)：
    - 如果数据规模较小（如 N <= 50）或是固定内容的边界/基础用例，推荐 'direct'（直接生成文本）。
    - 如果数据规模较大（如 N > 50）或是随机大数据、极大值测试，推荐 'script'（生成 Python 脚本）。
    
    请确保涵盖：
    1. 基础用例（示例）。
    2. 边界用例（最小约束、N=0、N=1、空字符串、非连通图等）。
    3. 极大约束用例（针对 TLE/MLE 的压力测试）。
    4. 刁钻用例（逻辑死角、溢出可能性、精度误差）。
    
    请以包含 "testCases" 数组的 JSON 对象格式返回响应。
  `;

  // Define schema for structured output
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      testCases: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            description: { type: Type.STRING, description: "Detailed description of what this case tests" },
            type: { type: Type.STRING, enum: ['basic', 'edge', 'max', 'random', 'trick'] },
            generationMethod: { type: Type.STRING, enum: ['direct', 'script'], description: "Recommended generation method based on data size" },
          },
          required: ['id', 'name', 'description', 'type', 'generationMethod'],
        },
      },
    },
    required: ['testCases'],
  };

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: 1024 } 
      },
    }));

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const parsed = JSON.parse(text);
    return { testPlan: parsed.testCases };
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

/**
 * Step 2: Generate the Input Data for a specific test case.
 */
export const generateInputData = async (
  statement: string,
  caseDescription: string,
  caseType: string,
  method: 'direct' | 'script'
): Promise<string> => {
  let prompt = "";
  
  if (method === 'script') {
    prompt = `
      你是一个算法题目的测试数据生成器。
      题目摘要：${statement.substring(0, 500)}...
      
      任务：编写一个 Python 3 脚本，用于生成该测试用例的数据。
      
      测试用例描述：${caseDescription}
      类型：${caseType} (大数据/Script模式)
      
      要求：
      1. 代码必须是完整的、可独立运行的 Python 3 脚本。
      2. 将生成的所有数据直接打印到标准输出 (stdout)。
      3. 不要包含任何 markdown 格式（如 \`\`\`python），不要包含解释性文字，只返回纯代码。
      4. 确保引入了必要的库（如 random）。
      5. 严格遵守题目的输入格式规范。
      6. 既然是脚本生成，请务必生成符合描述的大规模数据（例如 N=10^5）。
    `;
  } else {
    prompt = `
      你是一个算法题目的测试数据生成器。
      题目摘要：${statement.substring(0, 500)}... (已截断)
      
      任务：为特定的测试用例生成原始 INPUT（输入）数据。
      
      测试用例描述：${caseDescription}
      类型：${caseType} (直接文本模式)
      
      严格规则：
      1. 仅输出原始数据。不要使用 Markdown 代码块，不要包含解释。
      2. 格式必须严格符合题目的输入规范。
      3. 不要包含预期输出，仅提供 INPUT。
    `;
  }

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
         thinkingConfig: { thinkingBudget: 1024 } 
      },
    }));

    let data = response.text || "";
    // Cleanup markdown if the model accidentally included it
    data = data.replace(/^```(\w+)?\n?/, '').replace(/\n?```$/, '');
    return data.trim();
  } catch (error) {
    console.error("Input generation failed:", error);
    return method === 'script' ? "# Error generating script" : "";
  }
};

/**
 * Step 3: Generate Expected Output (Simulated).
 */
export const generateExpectedOutput = async (
  statement: string,
  solution: string,
  inputData: string,
  method: 'direct' | 'script'
): Promise<string> => {
  
  if (method === 'script') {
    return "NOTE: This test case uses a Python generator script.\n\n" +
           "Because the data is generated dynamically and may be large, " +
           "we cannot simulate the output in the browser.\n\n" +
           "Instructions:\n" +
           "1. Download the ZIP file.\n" +
           "2. Run the python script: `python3 case_name.py > case_name.in`\n" +
           "3. Run your solution against this input to check correctness.";
  }

  // If input is too large, we can't send it all.
  const truncatedInput = inputData.length > 10000 ? inputData.substring(0, 10000) + "\n... (truncated)" : inputData;

  const prompt = `
    你是一个 Online Judge（在线评测系统）模拟器。
    
    题目：
    ${statement.substring(0, 300)}...
    
    标准解法逻辑（参考）：
    ${solution.substring(0, 1000)}...
    
    任务：计算以下输入数据的 Expected Output（预期输出）。
    
    输入数据：
    ---
    ${truncatedInput}
    ---
    
    规则：
    1. 仅提供输出数据。不要使用 Markdown，不要包含解释。
    2. 必须极其精确。
  `;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 } // High budget for correct calculation
      }
    }));

    let data = response.text || "";
    data = data.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    return data.trim();
  } catch (error) {
    console.error("Output generation failed:", error);
    return "Error generating output.";
  }
};