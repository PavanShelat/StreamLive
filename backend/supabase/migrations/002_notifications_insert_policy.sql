-- Allow authenticated users to insert notifications for other users
-- This is needed so the creator's app can directly notify followers
-- without relying on n8n/webhooks

DROP POLICY IF EXISTS notifications_insert_auth ON public.notifications;

CREATE POLICY notifications_insert_auth
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
