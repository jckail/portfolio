export interface Message {
  type: 'user' | 'agent';
  text: string;
  isStreaming?: boolean;
}

export interface ChatState {
  messages: Message[];
  isOpen: boolean;
  isLoading: boolean;
  webSocket: WebSocket | null;
  initialContextSent: boolean;
}

export interface ChatProps {
  className?: string;
}
