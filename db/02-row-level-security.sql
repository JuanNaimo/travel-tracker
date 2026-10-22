CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_photos ENABLE ROW LEVEL SECURITY;

-- Los superusuarios saltean RLS igual: la API además filtra por user_id
ALTER TABLE trips FORCE ROW LEVEL SECURITY;
ALTER TABLE places FORCE ROW LEVEL SECURITY;
ALTER TABLE place_photos FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trips"
  ON trips FOR SELECT
  USING (current_user_id() = user_id);

CREATE POLICY "Users can create their own trips"
  ON trips FOR INSERT
  WITH CHECK (current_user_id() = user_id);

CREATE POLICY "Users can update their own trips"
  ON trips FOR UPDATE
  USING (current_user_id() = user_id);

CREATE POLICY "Users can delete their own trips"
  ON trips FOR DELETE
  USING (current_user_id() = user_id);

CREATE POLICY "Users can view their own places"
  ON places FOR SELECT
  USING (current_user_id() = user_id);

CREATE POLICY "Users can create their own places"
  ON places FOR INSERT
  WITH CHECK (current_user_id() = user_id);

CREATE POLICY "Users can update their own places"
  ON places FOR UPDATE
  USING (current_user_id() = user_id);

CREATE POLICY "Users can delete their own places"
  ON places FOR DELETE
  USING (current_user_id() = user_id);

CREATE POLICY "Users can view photos of their places"
  ON place_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM places
      WHERE places.id = place_photos.place_id
      AND places.user_id = current_user_id()
    )
  );

CREATE POLICY "Users can add photos to their places"
  ON place_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM places
      WHERE places.id = place_photos.place_id
      AND places.user_id = current_user_id()
    )
  );

CREATE POLICY "Users can delete photos from their places"
  ON place_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM places
      WHERE places.id = place_photos.place_id
      AND places.user_id = current_user_id()
    )
  );
