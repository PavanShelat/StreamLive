-- Migration to add a robust function for daily digest statistics

CREATE OR REPLACE FUNCTION public.generate_daily_digest_stats()
RETURNS JSONB AS $$
DECLARE
  v_total_streams INT;
  v_top_stream_title TEXT;
  v_top_stream_viewers INT;
  v_top_creator_username TEXT;
  v_top_creator_followers_gained INT;
  v_most_active_chat_title TEXT;
  v_most_active_chat_messages INT;
  v_total_live_hours INT;
BEGIN
  -- 1. Total streams in last 24h
  SELECT COUNT(*) INTO v_total_streams
  FROM public.streams
  WHERE started_at >= NOW() - INTERVAL '24 hours';

  -- 2. Top Stream by peak viewers (using stream_metadata_log)
  SELECT s.title, MAX(ml.viewer_count) INTO v_top_stream_title, v_top_stream_viewers
  FROM public.streams s
  JOIN public.stream_metadata_log ml ON ml.stream_id = s.id
  WHERE ml.recorded_at >= NOW() - INTERVAL '24 hours'
  GROUP BY s.id, s.title
  ORDER BY MAX(ml.viewer_count) DESC
  LIMIT 1;

  -- Fallback if no metadata logs exist yet
  IF v_top_stream_title IS NULL THEN
    SELECT title, viewer_count INTO v_top_stream_title, v_top_stream_viewers
    FROM public.streams
    WHERE started_at >= NOW() - INTERVAL '24 hours'
    ORDER BY viewer_count DESC
    LIMIT 1;
  END IF;

  -- 3. Top Creator by new followers
  SELECT p.username, COUNT(f.id) INTO v_top_creator_username, v_top_creator_followers_gained
  FROM public.profiles p
  JOIN public.follows f ON f.creator_id = p.id
  WHERE f.created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY p.id, p.username
  ORDER BY COUNT(f.id) DESC
  LIMIT 1;

  -- 4. Most active chat
  SELECT s.title, COUNT(m.id) INTO v_most_active_chat_title, v_most_active_chat_messages
  FROM public.streams s
  JOIN public.messages m ON m.stream_id = s.id
  WHERE m.created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY s.id, s.title
  ORDER BY COUNT(m.id) DESC
  LIMIT 1;

  -- 5. Total Live Hours
  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))) / 3600, 0) INTO v_total_live_hours
  FROM public.streams
  WHERE started_at >= NOW() - INTERVAL '24 hours';

  RETURN jsonb_build_object(
    'total_streams', COALESCE(v_total_streams, 0),
    'top_stream_title', COALESCE(v_top_stream_title, 'None'),
    'top_stream_viewers', COALESCE(v_top_stream_viewers, 0),
    'top_creator_username', COALESCE(v_top_creator_username, 'None'),
    'top_creator_followers_gained', COALESCE(v_top_creator_followers_gained, 0),
    'most_active_chat_title', COALESCE(v_most_active_chat_title, 'None'),
    'most_active_chat_messages', COALESCE(v_most_active_chat_messages, 0),
    'total_live_hours', ROUND(COALESCE(v_total_live_hours, 0))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
