import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';

import {
  EMAIL_MAX,
  MESSAGE_MAX,
  SUBJECT_MAX,
  TIMES_MAX,
  TOPIC_MAX,
  telHref,
} from '../chat-confirm';

import type { ConfirmArgs, ConfirmTool, PendingAction } from '../../../../types/chat';

interface ConfirmActionCardProps {
  action: PendingAction;
  /** Returns field errors, or null once the confirmation was sent. */
  onConfirm: (id: string, email: string, args: ConfirmArgs) => Record<string, string> | null;
  onCancel: (id: string) => void;
}

const HEADINGS: Record<ConfirmTool, string> = {
  contact_jordan: 'Send this message to Jordan?',
  request_phone: "Request Jordan's phone number?",
  request_meeting: 'Request a call with Jordan?',
};

const EXPLAINERS: Record<ConfirmTool, string> = {
  contact_jordan:
    'Review and edit the message. It is only sent when you press Confirm, and Jordan will reply to the email you enter.',
  request_phone:
    "Jordan will be notified of your email address, then the number is shown here for this session only. It is not saved.",
  request_meeting:
    'Jordan will get your topic and preferred times and reply to the email you enter. Nothing is sent until you press Confirm.',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    color: 'var(--text-color)',
    backgroundColor: 'var(--background-color)',
    '& fieldset': { borderColor: 'var(--primary-border)' },
    '&:hover fieldset': { borderColor: 'var(--primary-border)' },
    '&.Mui-focused fieldset': { borderColor: 'var(--primary-hover)', borderWidth: 2 },
  },
  '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--text-color)' },
  '& .MuiFormHelperText-root': { color: 'var(--text-secondary)' },
  '& .MuiFormHelperText-root.Mui-error': { color: 'var(--error-color, #d32f2f)' },
};

const SETTLED_LABEL: Partial<Record<PendingAction['status'], string>> = {
  cancelled: 'Cancelled. Nothing was sent.',
  expired: 'This request expired. Ask the assistant again if you still want to send it.',
};

export const ConfirmActionCard: React.FC<ConfirmActionCardProps> = ({ action, onConfirm, onCancel }) => {
  const { id, tool, status } = action;
  const [email, setEmail] = useState('');
  const [args, setArgs] = useState<ConfirmArgs>(action.args);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const emailRef = useRef<HTMLInputElement>(null);
  const headingId = `confirm-${id}-title`;
  const busy = status === 'submitting';
  const editable = status === 'pending';

  // Move focus to the email field as the card appears, so a keyboard or
  // screen-reader visitor lands on the one thing that is required.
  useEffect(() => {
    if (status === 'pending') emailRef.current?.focus({ preventScroll: false });
  }, [status]);

  const setArg = (key: keyof ConfirmArgs) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setArgs(prev => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editable) return;
    const result = onConfirm(id, email, args);
    if (result) {
      setErrors(result);
      if (result.email) emailRef.current?.focus();
    }
  };

  // Escape dismisses this card, not the whole chat dialog behind it.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && editable) {
      e.stopPropagation();
      onCancel(id);
    }
  };

  const settled = status === 'done' || status === 'failed' || status === 'cancelled' || status === 'expired';
  const message = SETTLED_LABEL[status] && !action.resultMessage ? SETTLED_LABEL[status] : action.resultMessage;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
      <Paper
        component="form"
        role="group"
        aria-labelledby={headingId}
        aria-busy={busy}
        noValidate
        onSubmit={submit}
        onKeyDown={onKeyDown}
        elevation={1}
        className="chat-confirm-card"
        sx={{
          p: 1.5,
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          backgroundColor: 'var(--section-background)',
          color: 'var(--text-color)',
          border: '1px solid var(--primary-border)',
          borderRadius: '15px 15px 15px 5px',
          fontFamily: "'Montserrat', sans-serif",
        }}
      >
        <Typography
          id={headingId}
          component="h3"
          sx={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: "'Montserrat', sans-serif", mb: 0.5 }}
        >
          {HEADINGS[tool]}
        </Typography>

        {!settled && (
          <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)', mb: 1.5, lineHeight: 1.4 }}>
            {EXPLAINERS[tool]}
          </Typography>
        )}

        {tool === 'contact_jordan' && !settled && (
          <>
            <TextField
              fullWidth
              size="small"
              label="Subject"
              name="subject"
              value={args.subject ?? ''}
              onChange={setArg('subject')}
              disabled={!editable}
              error={Boolean(errors.subject)}
              helperText={errors.subject || undefined}
              inputProps={{ maxLength: SUBJECT_MAX }}
              sx={{ ...fieldSx, mb: 1.5 }}
            />
            <TextField
              fullWidth
              multiline
              minRows={3}
              maxRows={8}
              size="small"
              label="Message"
              name="message"
              value={args.message ?? ''}
              onChange={setArg('message')}
              disabled={!editable}
              error={Boolean(errors.message)}
              helperText={errors.message || undefined}
              inputProps={{ maxLength: MESSAGE_MAX }}
              sx={{ ...fieldSx, mb: 1.5 }}
            />
          </>
        )}

        {tool === 'request_meeting' && !settled && (
          <>
            <TextField
              fullWidth
              size="small"
              label="Topic"
              name="topic"
              value={args.topic ?? ''}
              onChange={setArg('topic')}
              disabled={!editable}
              error={Boolean(errors.topic)}
              helperText={errors.topic || undefined}
              inputProps={{ maxLength: TOPIC_MAX }}
              sx={{ ...fieldSx, mb: 1.5 }}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={5}
              size="small"
              label="Preferred times"
              name="preferred_times"
              value={args.preferred_times ?? ''}
              onChange={setArg('preferred_times')}
              disabled={!editable}
              error={Boolean(errors.preferred_times)}
              helperText={errors.preferred_times || undefined}
              inputProps={{ maxLength: TIMES_MAX }}
              sx={{ ...fieldSx, mb: 1.5 }}
            />
          </>
        )}

        {!settled && (
          <TextField
            fullWidth
            required
            size="small"
            type="email"
            label="Your email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
            }}
            disabled={!editable}
            error={Boolean(errors.email)}
            helperText={errors.email || 'Used only to reply to you. Never shared.'}
            inputRef={emailRef}
            inputProps={{ maxLength: EMAIL_MAX }}
            sx={{ ...fieldSx, mb: 1.5 }}
          />
        )}

        {!settled && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={!editable}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: 'var(--primary-border)',
                '&:hover': { bgcolor: 'var(--primary-hover)' },
                '&.Mui-disabled': { bgcolor: 'var(--text-secondary)', color: '#fff', opacity: 0.5 },
              }}
            >
              {busy ? 'Sending…' : 'Confirm'}
            </Button>
            <Button
              type="button"
              variant="outlined"
              disabled={!editable}
              onClick={() => onCancel(id)}
              data-track-event="chat_action_cancelled"
              data-track-tool={action.tool}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                color: 'var(--text-color)',
                borderColor: 'var(--primary-border)',
                '&.Mui-disabled': { color: 'var(--text-secondary)', opacity: 0.6 },
              }}
            >
              Cancel
            </Button>
          </Box>
        )}

        <Box role="status" aria-live="polite" sx={{ mt: settled ? 0.5 : 0 }}>
          {settled && (
            <Typography
              sx={{
                fontSize: '0.85rem',
                lineHeight: 1.45,
                color: status === 'failed' ? 'var(--error-color, #d32f2f)' : 'var(--text-color)',
                fontWeight: 600,
              }}
            >
              {message}
            </Typography>
          )}
          {status === 'done' && action.phone && (
            <Typography sx={{ mt: 0.5, fontSize: '0.95rem', fontWeight: 700 }}>
              <a href={telHref(action.phone)} style={{ color: 'inherit', textDecoration: 'underline' }}>
                {action.phone}
              </a>
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default ConfirmActionCard;
