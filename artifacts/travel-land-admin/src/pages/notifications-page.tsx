// @ts-nocheck
import { useState } from 'react';
import { useCreateAdminNotification } from '@workspace/api-client-react';
import { Bell, Check, Send } from 'lucide-react';
import { Button, Title } from './page-shared';

export function NotificationsPage() {
  const mutation = useCreateAdminNotification();
  const [type, setType] = useState('announcement');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [receipt, setReceipt] = useState('');
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate(
      { data: { type, title, body } },
      {
        onSuccess: (response) => {
          setReceipt(response.message);
          setTitle('');
          setBody('');
        },
      },
    );
  };
  return (
    <div className="rise-in">
      <Title
        eyebrow="Platform voice"
        title="Announcements"
        description="Compose a platform notification. Sending is explicit and returns a server receipt."
      />
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <form onSubmit={submit} className="rounded-xl border border-border bg-card p-6 panel-shadow">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bell size={17} />
            </span>
            <div>
              <p className="font-semibold">New announcement</p>
              <p className="text-xs text-muted-foreground">Keep it useful and specific.</p>
            </div>
          </div>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-semibold">Notification type</span>
            <select data-testid="select-notification-type" value={type} onChange={(event) => setType(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm">
              <option value="announcement">Announcement</option>
              <option value="travel_update">Travel update</option>
              <option value="offer">Offer</option>
              <option value="service_notification">Service notification</option>
            </select>
          </label>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-semibold">Title</span>
            <input data-testid="input-notification-title" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold">Message</span>
            <textarea data-testid="input-notification-body" required maxLength={4000} value={body} onChange={(event) => setBody(event.target.value)} rows={6} className="w-full resize-none rounded-lg border border-border bg-card p-3 text-sm" />
          </label>
          <div className="mt-5 flex justify-end">
            <Button testId="button-send-notification" type="submit" disabled={mutation.isPending}>
              <Send size={14} />
              {mutation.isPending ? 'Sending…' : 'Send announcement'}
            </Button>
          </div>
          {receipt && (
            <p data-testid="text-notification-receipt" className="mt-4 rounded-lg bg-[hsl(151_30%_43%/.1)] p-3 text-xs text-[hsl(151_30%_32%)]">
              <Check size={14} className="mr-1 inline" /> {receipt}
            </p>
          )}
        </form>
        <div className="rounded-xl border border-border bg-sidebar p-6 text-sidebar-foreground">
          <p className="eyebrow text-sidebar-foreground/50">Delivery note</p>
          <h2 className="mt-2 text-xl font-semibold">No audience is implied.</h2>
          <p className="mt-3 text-sm leading-6 text-sidebar-foreground/65">
            The API creates a platform notification. Audience segmentation, scheduling, and delivery analytics are not available here.
          </p>
        </div>
      </div>
    </div>
  );
}