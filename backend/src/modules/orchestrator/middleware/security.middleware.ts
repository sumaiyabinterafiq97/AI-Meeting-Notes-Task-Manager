import { inputSanitizerService } from '../../agents/security/input-sanitizer.service';
import type { OrchestratorGraphState } from '../state/graph-state.types';

export function sanitizeWorkflowInput(state: OrchestratorGraphState): OrchestratorGraphState {
  const input = { ...state.input };
  if (typeof input.transcript === 'string') {
    input.transcript = inputSanitizerService.sanitizeText(input.transcript, { field: 'transcript' });
  }
  if (typeof input.userMessage === 'string') {
    const injectionDetected = inputSanitizerService.detectPromptInjection(String(input.userMessage));
    if (injectionDetected) {
      return {
        ...state,
        input,
        errors: [
          ...state.errors,
          {
            code: 'PROMPT_INJECTION',
            message: 'Potential prompt injection detected in user input',
            retryable: false,
          },
        ],
      };
    }
    input.userMessage = inputSanitizerService.sanitizeText(String(input.userMessage), {
      field: 'promptVar',
    });
  }
  return { ...state, input };
}

export function blockUnauthorizedToolAccess(toolName: string, allowedTools: string[]): boolean {
  return allowedTools.includes(toolName);
}
