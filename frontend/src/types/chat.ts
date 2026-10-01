export interface Message {
  type: 'user' | 'agent';
  text: string;
  isStreaming?: boolean;
}
