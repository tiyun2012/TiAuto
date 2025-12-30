/**
 * Parses raw text output from an LLM and attempts to extract files.
 * Supports formats like:
 * ### filename.ext
 * ```language
 * code
 * ```
 * 
 * or
 * 
 * File: filename.ext
 */
export const parseOutputToFiles = (text: string): Record<string, string> => {
    const files: Record<string, string> = {};
    
    // Regex for "### filename" or "File: filename" followed by content
    // We try to capture the filename, then optionally a language block identifier, then the content
    const fileRegex = /(?:###|File:)\s+([a-zA-Z0-9_\-./]+)(?:[^\n]*\n)(?:```[a-zA-Z0-9]*\n)?([\s\S]*?)(?:```|$)/g;
  
    let match;
    let foundFiles = false;
  
    // normalize newlines
    const normalizedText = text.replace(/\r\n/g, '\n');
  
    // 1. Try strict "header + code block" parsing
    // This looks for pattern: ### filename.py \n ```python \n ... \n ```
    while ((match = fileRegex.exec(normalizedText)) !== null) {
      if (match[1] && match[2]) {
        const filename = match[1].trim();
        let content = match[2].trim();
        
        // If the regex caught the closing ``` of the next block or end of string, strictly clean it
        // The regex above is non-greedy for content (*?) but relies on ``` or end.
        // We might need to manually strip trailing backticks if the regex captured them improperly due to nesting issues
        if (content.endsWith('```')) {
            content = content.slice(0, -3).trim();
        }
        
        files[filename] = content;
        foundFiles = true;
      }
    }
  
    // 2. Fallback: If no multi-file structure detected, check if the whole text is wrapped in code blocks
    // and treat it as 'generated_code.txt' or similar, or try to guess extension.
    if (!foundFiles) {
      const singleBlockRegex = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/;
      const singleMatch = normalizedText.match(singleBlockRegex);
      
      if (singleMatch) {
        const lang = singleMatch[1] || 'txt';
        const content = singleMatch[2].trim();
        const ext = lang === 'python' ? 'py' : lang === 'javascript' || lang === 'js' ? 'js' : lang === 'typescript' || lang === 'ts' ? 'ts' : 'txt';
        
        // Don't overwrite if empty
        if (content) {
            files[`output.${ext}`] = content;
        }
      } else {
        // If it's just raw text (maybe a check analysis), save as analysis.md
        if (normalizedText.trim()) {
            files['analysis.md'] = normalizedText;
        }
      }
    }
  
    return files;
  };
  
  /**
   * Formats a file map into a string context for the AI prompt.
   */
  export const formatFilesForPrompt = (files: Record<string, string>): string => {
    return Object.entries(files).map(([name, content]) => `
  ### ${name}
  \`\`\`
  ${content}
  \`\`\`
  `).join('\n');
  };
