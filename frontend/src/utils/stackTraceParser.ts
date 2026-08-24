/**
 * Playwright & Node.js Stack Trace Parser Utility
 * Parses error messages, code snippets, assertion diffs, and structured stack frames.
 */

export interface StackFrame {
  id: string;
  raw: string;
  functionName: string;
  file: string;
  fileName: string;
  line?: number;
  column?: number;
  isUserCode: boolean;
  isPlaywrightInternal: boolean;
  isNodeInternal: boolean;
}

export interface AssertionDiff {
  expected?: string;
  received?: string;
  diffSummary?: string;
}

export interface CodeSnippetLine {
  lineNumber: number;
  content: string;
  isHighlighted: boolean;
}

export interface ParsedErrorDiagnostics {
  headline: string;
  category: 'timeout' | 'strict_mode' | 'assertion' | 'element_not_found' | 'browser_crash' | 'generic';
  categoryLabel: string;
  categoryAdvice?: string;
  assertionDiff?: AssertionDiff;
  codeSnippet?: CodeSnippetLine[];
  frames: StackFrame[];
  userCodeFrames: StackFrame[];
  primaryUserFrame?: StackFrame;
}

/**
 * Parse an error string and stack into a comprehensive diagnostic report
 */
export function parseStackTrace(rawError?: string, rawStack?: string): ParsedErrorDiagnostics {
  const combinedText = `${rawError || ''}\n${rawStack || ''}`.trim();
  const lines = combinedText.split('\n');

  // 1. Identify Headline / Primary Error Message
  const firstLine = (rawError || lines[0] || 'Unknown test failure').trim();
  const cleanHeadline = firstLine.replace(/^(Error|AssertionError):\s*/, '');

  // 2. Identify Playwright Error Category & Debugging Advice
  let category: ParsedErrorDiagnostics['category'] = 'generic';
  let categoryLabel = 'Runtime Error';
  let categoryAdvice: string | undefined;

  const lower = combinedText.toLowerCase();
  if (lower.includes('timeout') && (lower.includes('exceeded') || lower.includes('ms'))) {
    category = 'timeout';
    categoryLabel = 'Timeout Exceeded';
    categoryAdvice = 'The locator or action did not complete within the timeout window. Check if the element takes longer to appear, or increase actionTimeout.';
  } else if (lower.includes('strict mode violation') || lower.includes('resolved to 2 elements') || lower.includes('resolved to multiple')) {
    category = 'strict_mode';
    categoryLabel = 'Strict Mode Violation';
    categoryAdvice = 'The locator matched multiple DOM elements. Use `.first()`, `.nth(index)`, or refine your selector with text or test-id filters.';
  } else if (lower.includes('expect(') || lower.includes('received:') || lower.includes('expected:')) {
    category = 'assertion';
    categoryLabel = 'Assertion Failure';
    categoryAdvice = 'The actual value received did not match the expected assertion condition.';
  } else if (lower.includes('not visible') || lower.includes('detached from dom') || lower.includes('element is not visible')) {
    category = 'element_not_found';
    categoryLabel = 'Element Not Interactable';
    categoryAdvice = 'Target element is detached or hidden. Ensure preconditions and modal animations have completed before interacting.';
  } else if (lower.includes('target page, context or browser has been closed') || lower.includes('browser closed')) {
    category = 'browser_crash';
    categoryLabel = 'Browser Session Closed';
    categoryAdvice = 'The browser or page context crashed or closed prematurely during execution.';
  }

  // 3. Extract Assertion Diff (Expected vs Received)
  let assertionDiff: AssertionDiff | undefined;
  const expectedMatch = combinedText.match(/Expected(?:\s+value|\s+string|\s+pattern)?:\s*([^\n]+(?:\n(?!\s*(?:Received|at\s)).*)*)/i);
  const receivedMatch = combinedText.match(/Received(?:\s+value|\s+string)?:\s*([^\n]+(?:\n(?!\s*at\s).*)*)/i);

  if (expectedMatch || receivedMatch) {
    assertionDiff = {
      expected: expectedMatch ? expectedMatch[1].trim() : undefined,
      received: receivedMatch ? receivedMatch[1].trim() : undefined,
    };
  }

  // 4. Extract Inline Code Frame / Snippet (e.g. from Playwright code frames with '>' and line gutters)
  const codeSnippet: CodeSnippetLine[] = [];
  const codeFrameRegex = /^\s*([>|\s]?)\s*(\d+)\s*\|\s*(.*)$/;

  for (const line of lines) {
    const match = line.match(codeFrameRegex);
    if (match) {
      const isHighlighted = match[1].includes('>');
      const lineNumber = parseInt(match[2], 10);
      const content = match[3];
      codeSnippet.push({
        lineNumber,
        content,
        isHighlighted,
      });
    }
  }

  // 5. Parse Stack Frames (Node.js & V8 format)
  // Formats:
  // "    at functionName (filePath:line:col)"
  // "    at filePath:line:col"
  // "    at async functionName (filePath:line:col)"
  const frameRegex = /^\s*at\s+(?:async\s+)?(?:([^\s(]+)\s+\((.+):(\d+):(\d+)\)|(.+):(\d+):(\d+)|([^\s(]+)\s+\((.+)\))/;
  const frames: StackFrame[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(frameRegex);
    if (match) {
      let functionName = '<anonymous>';
      let file = '';
      let lineNum: number | undefined;
      let colNum: number | undefined;

      if (match[1] && match[2]) {
        functionName = match[1];
        file = match[2];
        lineNum = parseInt(match[3], 10);
        colNum = parseInt(match[4], 10);
      } else if (match[5]) {
        file = match[5];
        lineNum = parseInt(match[6], 10);
        colNum = parseInt(match[7], 10);
      } else if (match[8] && match[9]) {
        functionName = match[8];
        file = match[9];
      }

      // Clean file path (strip file:// or query params)
      file = file.replace(/^file:\/\//, '').split('?')[0];
      const fileName = file.split(/[\\/]/).pop() || file;

      const isPlaywrightInternal =
        file.includes('@playwright') ||
        file.includes('playwright/lib') ||
        file.includes('playwright-core');

      const isNodeInternal =
        file.startsWith('node:') ||
        file.includes('internal/modules') ||
        file.includes('internal/process');

      const isNodeModules = file.includes('node_modules');

      const isUserCode = !isPlaywrightInternal && !isNodeInternal && !isNodeModules && !file.includes('(eval');

      frames.push({
        id: `frame-${i}-${fileName}`,
        raw: line.trim(),
        functionName,
        file,
        fileName,
        line: lineNum,
        column: colNum,
        isUserCode,
        isPlaywrightInternal,
        isNodeInternal,
      });
    }
  }

  const userCodeFrames = frames.filter((f) => f.isUserCode);
  const primaryUserFrame = userCodeFrames[0] || frames[0];

  return {
    headline: cleanHeadline,
    category,
    categoryLabel,
    categoryAdvice,
    assertionDiff: assertionDiff && (assertionDiff.expected || assertionDiff.received) ? assertionDiff : undefined,
    codeSnippet: codeSnippet.length > 0 ? codeSnippet : undefined,
    frames,
    userCodeFrames,
    primaryUserFrame,
  };
}

/**
 * Generate IDE Deep Link URLs
 */
export function getIdeLinks(filePath?: string, line?: number, column?: number) {
  if (!filePath) return null;
  const lineSuffix = line ? `:${line}${column ? `:${column}` : ''}` : '';
  const cleanPath = filePath.replace(/^[a-zA-Z]:/, (m) => m.toUpperCase()); // Normalize Windows drive if any

  return {
    vscode: `vscode://file/${cleanPath}${lineSuffix}`,
    cursor: `cursor://file/${cleanPath}${lineSuffix}`,
    fileUrl: `file://${cleanPath}`,
  };
}
