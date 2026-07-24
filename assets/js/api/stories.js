import { supabase } from "../supabaseClient.js";

const STORY_SELECT = `
  id,
  owner_id,
  pet_name,
  image_url,
  created_at,
  expires_at,
  owner:profiles!stories_owner_id_fkey(id,display_name)
`;

export async function fetchStories() {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("stories")
    .select(STORY_SELECT)
    .gt("expires_at", now)
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function createStory(ownerId, petName, imageUrl) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("stories")
    .insert({
      owner_id: ownerId,
      pet_name: petName,
      image_url: imageUrl,
      expires_at: expiresAt
    })
    .select(STORY_SELECT)
    .single();
  if (error) {
    throw error;
  }
  return data;
}
