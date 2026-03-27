import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { TestCase } from '../types';

export const generateAndDownloadZip = async (testCases: TestCase[], problemName: string) => {
  const zip = new JSZip();
  const folder = zip.folder(problemName.replace(/\s+/g, '_') || 'test_data');

  if (!folder) return;

  testCases.forEach((tc, index) => {
    // Pad index for sorting: 01, 02, etc.
    const fileIndex = (index + 1).toString().padStart(2, '0');
    const safeName = tc.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileNameBase = `${fileIndex}_${tc.type}_${safeName}`;
    
    if (tc.generationMethod === 'script') {
        // For script cases, we now have BOTH the script code AND the generated input data
        // 1. Save the Python script source
        if (tc.scriptContent) {
            folder.file(`${fileNameBase}.py`, tc.scriptContent);
        }
        // 2. Save the executed result as .in (this is the big data)
        folder.file(`${fileNameBase}.in`, tc.input);
        
        // We still skip .out for script cases usually, unless we implement solution runner
        if (tc.expectedOutput && !tc.expectedOutput.includes("skipped")) {
            folder.file(`${fileNameBase}.out`, tc.expectedOutput);
        }
    } else {
        // Direct generation
        folder.file(`${fileNameBase}.in`, tc.input);
        folder.file(`${fileNameBase}.out`, tc.expectedOutput);
    }
  });

  // Add a manifest or readme
  const readmeContent = "AlgoGen Test Data Pack\n=======================\n\n" + 
    testCases.map((tc, idx) => {
      const idxStr = (idx + 1).toString().padStart(2, '0');
      let details = `${idxStr} - ${tc.name} [${tc.type}]\n    Description: ${tc.description}\n`;
      if (tc.generationMethod === 'script') {
          details += `    Method: Python Script Generator (Executed in Browser)\n`;
          details += `    Files: .py (Source), .in (Generated Data)\n`;
          details += `    Note: .out file generation is skipped for large datasets.\n`;
      } else {
          details += `    Method: Direct Text (AI Generated)\n`;
      }
      return details;
    }).join('\n');
  
  folder.file('README.txt', readmeContent);

  const content = await zip.generateAsync({ type: 'blob' });
  
  const saveAs = (FileSaver as any).saveAs || FileSaver;
  saveAs(content, `${problemName.replace(/\s+/g, '_')}_data.zip`);
};