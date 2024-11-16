export interface Message {
  type: 'user' | 'agent';
  text: string;
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
