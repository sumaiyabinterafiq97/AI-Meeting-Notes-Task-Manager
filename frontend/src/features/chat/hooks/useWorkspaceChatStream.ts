import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ChatStreamEvent } from '@/services/api';
import type { CitationData } from '@/components/ai/CitationCard';
import { chatApi } from '../services/chat-api';
import { chatKeys } from './chat-keys';
import type { ChatMessage } from '../types/chat.types';

export interface UseWorkspaceChatStreamOptions {
  workspaceId: string;
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
}

export interface UseWorkspaceChatStreamResult {
  streamingContent: string;
  streamingCitations: CitationData[];
  isStreaming: boolean;
  streamError: string | null;
  sendMessage: (message: string, activeSessionId?: string) => Promise<void>;
  regenerate: (messages: ChatMessage[]) => Promise<void>;
  cancelStream: () => void;
  clearStreamError: () => void;
}

const initialStreamState = {
  streamingContent: '',
  streamingCitations: [] as CitationData[],
  isStreaming: false,
  streamError: null as string | null,
};

export function useWorkspaceChatStream({
  workspaceId,
  sessionId,
  onSessionCreated,
}: UseWorkspaceChatStreamOptions): UseWorkspaceChatStreamResult {
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);
  const [streamingContent, setStreamingContent] = useState(initialStreamState.streamingContent);
  const [streamingCitations, setStreamingCitations] = useState(initialStreamState.streamingCitations);
  const [isStreaming, setIsStreaming] = useState(initialStreamState.isStreaming);
  const [streamError, setStreamError] = useState(initialStreamState.streamError);

  const resetStreamState = useCallback(() => {
    setStreamingContent('');
    setStreamingCitations([]);
    setIsStreaming(false);
  }, []);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    resetStreamState();
  }, [resetStreamState]);

  const clearStreamError = useCallback(() => {
    setStreamError(null);
  }, []);

  const handleStreamEvent = useCallback(
    (event: ChatStreamEvent, activeSessionId?: string) => {
      if (event.event === 'token') {
        setStreamingContent((prev) => prev + event.data.content);
        return;
      }

      if (event.event === 'citation') {
        setStreamingCitations((prev) => {
          const exists = prev.some((citation) => citation.index === event.data.index);
          if (exists) {
            return prev;
          }
          return [...prev, event.data];
        });
        return;
      }

      if (event.event === 'error') {
        setStreamError(event.data.message);
        setIsStreaming(false);
        return;
      }

      if (event.event === 'done') {
        setIsStreaming(false);
        const resolvedSessionId = event.data.sessionId ?? activeSessionId ?? sessionId;

        if (event.data.sessionId && event.data.sessionId !== sessionId) {
          onSessionCreated?.(event.data.sessionId);
        }

        void queryClient.invalidateQueries({ queryKey: chatKeys.sessions(workspaceId) });

        if (resolvedSessionId) {
          void queryClient.invalidateQueries({
            queryKey: chatKeys.sessionMessages(workspaceId, resolvedSessionId),
          });
        }
      }
    },
    [onSessionCreated, queryClient, sessionId, workspaceId],
  );

  const sendMessage = useCallback(
    async (message: string, activeSessionId?: string) => {
      cancelStream();
      setStreamError(null);
      setIsStreaming(true);
      setStreamingContent('');
      setStreamingCitations([]);

      const controller = new AbortController();
      abortRef.current = controller;
      const resolvedSessionId = activeSessionId ?? sessionId;

      try {
        await chatApi.streamWorkspaceMessage(
          workspaceId,
          { message, sessionId: resolvedSessionId },
          (event) => handleStreamEvent(event, resolvedSessionId),
          controller.signal,
        );
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        const messageText = error instanceof Error ? error.message : 'Failed to send message';
        setStreamError(messageText);
      } finally {
        if (!controller.signal.aborted) {
          setIsStreaming(false);
          abortRef.current = null;
          setStreamingContent('');
          setStreamingCitations([]);
        }
      }
    },
    [cancelStream, handleStreamEvent, sessionId, workspaceId],
  );

  const regenerate = useCallback(
    async (messages: ChatMessage[]) => {
      const lastUserMessage = [...messages].reverse().find((item) => item.role === 'user');
      if (!lastUserMessage) {
        return;
      }

      await sendMessage(lastUserMessage.content, lastUserMessage.sessionId);
    },
    [sendMessage],
  );

  return {
    streamingContent,
    streamingCitations,
    isStreaming,
    streamError,
    sendMessage,
    regenerate,
    cancelStream,
    clearStreamError,
  };
}
