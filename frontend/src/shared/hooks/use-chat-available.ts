import { useSyncExternalStore } from 'react';

import { isChatAvailable, subscribeChatAvailability } from '../utils/chat-availability';

/** Re-renders when ChatPortal learns the assistant is (un)available. */
export function useChatAvailable(): boolean {
  return useSyncExternalStore(subscribeChatAvailability, isChatAvailable, () => true);
}
