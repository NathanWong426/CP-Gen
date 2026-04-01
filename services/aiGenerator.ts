import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TestCase, AiProvider } from '../types';

/**
 * Helper function to retry API calls on 429 errors (Rate Limit)
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

async function callOpenAiCompatibleApi(url: string, apiKey: string, modelName: string, prompt: string, requireJson = false): Promise<string> {
  const requestBody: any = {
    model: modelName,
    messages: [{ role: "user", content: prompt }]
  };
  
  if (requireJson) {
      requestBody.response_format = { type: "json_object" };
      requestBody.messages[0].content += "\n\nIMPORTANT: You must return a valid JSON object matching the requested schema. Do not include markdown code blocks around the JSON.";
  }

  const response = await fetch(url + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Request failed: ${response.status} ${errorText}`);
  }

  const json = await response.json();
  if (!json.choices || json.choices.length === 0) throw new Error("Empty choices in response");
  return json.choices[0].message.content;
}

export const analyzeProblemAndPlan = async (
  statement: string,
  solution: string,
  testCaseCount: number,
  modelName: string,
  apiKey: string,
  provider: AiProvider
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
    
    请确保涵盖基础用例、边界用例、极大用例和刁钻用例。
    
    必须以 JSON 对象格式返回，且包含一个 "testCases" 数组。
    每个数组元素必须是一个包含以下字段的 JSON 对象: 
    "id" (字符串), "name" (字符串), "description" (字符串), "type" (枚举: basic/edge/max/random/trick), "generationMethod" (枚举: direct/script)
  `;

  try {
    let text = "";
    if (provider === 'google') {
      const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
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
                description: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['basic', 'edge', 'max', 'random', 'trick'] },
                generationMethod: { type: Type.STRING, enum: ['direct', 'script'] },
              },
              required: ['id', 'name', 'description', 'type', 'generationMethod'],
            },
          },
        },
        required: ['testCases'],
      };

      const response = await withRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          thinkingConfig: { thinkingBudget: 1024 } 
        },
      }));
      text = response.text || "";
    } else if (provider === 'laozhang') {
      text = await withRetry(() => callOpenAiCompatibleApi('https://api.laozhang.ai/v1', apiKey, modelName, prompt, true));
    }

    if (!text) throw new Error("No response from AI provider");
    
    // Clean up markdown block if model ignored parsing instructions
    let jsonText = text.trim();
    if (jsonText.startsWith('\`\`\`json')) jsonText = jsonText.replace(/^\`\`\`json\n?/, '');
    if (jsonText.startsWith('\`\`\`')) jsonText = jsonText.replace(/^\`\`\`\n?/, '');
    if (jsonText.endsWith('\`\`\`')) jsonText = jsonText.replace(/\n?\`\`\`$/, '');

    const parsed = JSON.parse(jsonText);
    if (!parsed.testCases) {
       // DeepSeek or Qwen might nest it differently or ignore schema slightly
       if (Array.isArray(parsed)) return { testPlan: parsed };
       throw new Error("Invalid JSON structure returned by model");
    }
    return { testPlan: parsed.testCases };
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};


export const generateInputData = async (
  statement: string,
  caseDescription: string,
  caseType: string,
  method: 'direct' | 'script',
  modelName: string,
  apiKey: string,
  provider: AiProvider
): Promise<string> => {
  let prompt = "";
  
  if (method === 'script') {
    prompt = `
      你是一个算法题目的测试数据代码生成器。
      题目摘要：${statement.substring(0, 500)}...
      
      任务：编写一个 Python 3 脚本，用于生成该测试用例的数据。
      
      说明：${caseDescription}
      类型：${caseType}
      
      要求：
      1. 代码必须是完整的、可独立运行的纯 Python 3 脚本。
      2. 将生成的所有数据直接打印到系统输出 (print)。
      3. 不要包含任何 markdown 代码块（如 \`\`\`python），不要写任何解释。只要返回干干净净的纯代码本身！！！！
      4. 严格遵守题目的输入规范。
    `;
  } else {
    prompt = `
      你是一个算法题目的测试数据生成器。
      题目摘要：${statement.substring(0, 500)}...
      
      任务：为具体的测试用例直接生成 INPUT 文本数据。
      
      说明：${caseDescription}
      
      严格规则：
      1. 完全只输出裸数据。绝对不要使用 Markdown 代码块。绝对不要输出任何文字解释。
      2. 格式必须跟题目需要的输入格式一模一样。
      3. 不要输出 Expected Output，只要输入。
    `;
  }

  try {
    let text = "";
    if (provider === 'google') {
      const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
      const response = await withRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 1024 } },
      }));
      text = response.text || "";
    } else {
      text = await withRetry(() => callOpenAiCompatibleApi('https://api.laozhang.ai/v1', apiKey, modelName, prompt));
    }

    // Cleanup markdown if the model accidentally included it
    let data = text.trim();
    if (data.startsWith('\`\`\`python')) data = data.replace(/^\`\`\`python\n?/, '');
    if (data.startsWith('\`\`\`')) data = data.replace(/^\`\`\`\n?/, '');
    if (data.endsWith('\`\`\`')) data = data.replace(/\n?\`\`\`$/, '');
    
    return data.trim();
  } catch (error) {
    console.error("Input generation failed:", error);
    throw error;
  }
};


export const generateExpectedOutput = async (
  statement: string,
  solution: string,
  inputData: string,
  method: 'direct' | 'script',
  modelName: string,
  apiKey: string,
  provider: AiProvider
): Promise<string> => {
  if (method === 'script') {
    return "NOTE: This test case uses a Python generator script.\n\n" +
           "Because the data is generated dynamically and may be large, " +
           "we cannot simulate the output in the browser.\n\n" +
           "Instructions:\n" +
           "1. Download the ZIP file.\n" +
           "2. Run the python script to generate input.\n" +
           "3. Run your solution against this input locally to check correctness.";
  }

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
    1. 完全只输出裸数据。不要使用 Markdown，绝对不要包含解释文字。
    2. 计算必须极其精准。
  `;

  try {
    let text = "";
    if (provider === 'google') {
      const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
      const response = await withRetry(() => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 2048 } }
      }));
      text = response.text || "";
    } else {
      text = await withRetry(() => callOpenAiCompatibleApi('https://api.laozhang.ai/v1', apiKey, modelName, prompt));
    }

    let data = text.trim();
    if (data.startsWith('\`\`\`')) data = data.replace(/^\`\`\`\w*\n?/, '');
    if (data.endsWith('\`\`\`')) data = data.replace(/\n?\`\`\`$/, '');
    return data.trim();
  } catch (error) {
    console.error("Output generation failed:", error);
    return "Error generating AI simulated output.";
  }
};