export interface Message {
  type: 'user' | 'agent';
  text: string;
  isStreaming?: boolean;
}

/** Tools that have a side effect and therefore need the visitor's confirmation. */
export type ConfirmTool = 'contact_jordan' | 'request_phone' | 'request_meeting';

/** Editable arguments the server proposes for an execute-type tool. */
export interface ConfirmArgs {
  subject?: string;
  message?: string;
  topic?: string;
  preferred_times?: string;
}

/** Server frame: a tool call is waiting for the visitor. */
export interface ConfirmActionFrame {
  type: 'confirm_action';
  id: string;
  tool: string;
  args?: ConfirmArgs;
  needs?: string[];
}

/** Server frame: outcome of a confirmed action. */
export interface ActionResultFrame {
  type: 'action_result';
  id: string;
  ok: boolean;
  tool?: string;
  message?: string;
  phone?: string;
}

/** Lifecycle of a confirmation card. `submitting` disables the controls. */
export type PendingStatus =
  | 'pending'
  | 'submitting'
  | 'done'
  | 'failed'
  | 'cancelled'
  | 'expired';

export interface PendingAction {
  id: string;
  tool: ConfirmTool;
  args: ConfirmArgs;
  status: PendingStatus;
  /** Epoch ms after which the server will refuse the id (10 minute TTL). */
  expiresAt: number;
  /** Generic server message shown once the action settles. */
  resultMessage?: string;
  /** Phone number, only for a successful request_phone and only in memory. */
  phone?: string;
}
