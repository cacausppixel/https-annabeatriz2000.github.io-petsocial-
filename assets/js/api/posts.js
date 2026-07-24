import { supabase } from "../supabaseClient.js";

const POST_SELECT = `
  id,
  owner_id,
  pet_name,
  description,
  age_group,
  size_group,
  adoption_status,
  image_url,
  created_at,
  owner:profiles!posts_owner_id_fkey(id,display_name,avatar_url,user_type),
  likes:post_likes(user_id),
  comments:post_comments(
    id,
    owner_id,
    content,
    created_at,
    owner:profiles!post_comments_owner_id_fkey(display_name)
  )
`;

export async function fetchPosts(filters = {}) {
  let query = supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: false });
  if (filters.ageGroup && filters.ageGroup !== "Todos") {
    query = query.eq("age_group", filters.ageGroup);
  }
  if (filters.sizeGroup && filters.sizeGroup !== "Todos") {
    query = query.eq("size_group", filters.sizeGroup);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function createPost(ownerId, payload) {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      owner_id: ownerId,
      pet_name: payload.petName,
      description: payload.description,
      age_group: payload.ageGroup,
      size_group: payload.sizeGroup,
      adoption_status: payload.adoptionStatus,
      image_url: payload.imageUrl
    })
    .select(POST_SELECT)
    .single();
  if (error) {
    throw error;
  }
  return data;
}

export async function toggleLike(postId, userId) {
  const { data: current, error: currentError } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  if (currentError) {
    throw currentError;
  }

  if (current) {
    const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) {
      throw error;
    }
    return false;
  }

  const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
  if (error) {
    throw error;
  }
  return true;
}

export async function addComment(postId, userId, content) {
  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: postId,
      owner_id: userId,
      content
    })
    .select("id, owner_id, content, created_at, owner:profiles!post_comments_owner_id_fkey(display_name)")
    .single();
  if (error) {
    throw error;
  }
  return data;
}

export async function updateAdoptionStatus(postId, status) {
  const { data, error } = await supabase
    .from("posts")
    .update({ adoption_status: status })
    .eq("id", postId)
    .select(POST_SELECT)
    .single();
  if (error) {
    throw error;
  }
  return data;
}
