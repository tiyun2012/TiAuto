
/**
 * Parses raw text output from an LLM and attempts to extract files.
 * Supports legacy regex formats and new JSON structure.
 */
export const parseOutputToFiles = (text: string): Record<string, string> => {
    const files: Record<string, string> = {};
    
    // 1. Try Parsing as JSON first (Reliable)
    try {
        // Attempt to find a JSON block if it's wrapped in markdown
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : text;
        
        const parsed = JSON.parse(jsonString);
        
        // Handle array of files structure: [{ filename: "...", content: "..." }]
        if (Array.isArray(parsed)) {
            parsed.forEach(item => {
                if (item.filename && item.content) {
                    files[item.filename] = item.content;
                }
            });
            if (Object.keys(files).length > 0) return files;
        } 
        
        // Handle object structure: { files: [...] }
        if (parsed.files && Array.isArray(parsed.files)) {
            parsed.files.forEach((item: any) => {
                if (item.filename && item.content) {
                    files[item.filename] = item.content;
                }
            });
            if (Object.keys(files).length > 0) return files;
        }
    } catch (e) {
        // Not valid JSON, fall through to regex parsing
    }

    // 2. Regex Parsing (Legacy/Markdown format)
    // Regex for "### filename" or "File: filename" followed by content
    const fileRegex = /(?:###|File:)\s+([a-zA-Z0-9_\-./]+)(?:[^\n]*\n)(?:```[a-zA-Z0-9]*\n)?([\s\S]*?)(?:```|$)/g;
  
    let match;
    let foundFiles = false;
    const normalizedText = text.replace(/\r\n/g, '\n');
  
    while ((match = fileRegex.exec(normalizedText)) !== null) {
      if (match[1] && match[2]) {
        const filename = match[1].trim();
        let content = match[2].trim();
        if (content.endsWith('```')) {
            content = content.slice(0, -3).trim();
        }
        files[filename] = content;
        foundFiles = true;
      }
    }
  
    // 3. Single Block Fallback
    if (!foundFiles) {
      const singleBlockRegex = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/;
      const singleMatch = normalizedText.match(singleBlockRegex);
      
      if (singleMatch) {
        const lang = singleMatch[1] || 'txt';
        const content = singleMatch[2].trim();
        const ext = lang === 'python' ? 'py' : lang === 'javascript' || lang === 'js' ? 'js' : lang === 'typescript' || lang === 'ts' ? 'ts' : 'txt';
        if (content) files[`output.${ext}`] = content;
      } else if (normalizedText.trim()) {
        files['analysis.md'] = normalizedText;
      }
    }
  
    return files;
  };
  
  export const formatFilesForPrompt = (files: Record<string, string>): string => {
    return Object.entries(files).map(([name, content]) => `
  ### ${name}
  \`\`\`
  ${content}
  \`\`\`
  `).join('\n');
  };
