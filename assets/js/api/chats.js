import { supabase } from "../supabaseClient.js";

const CHANNEL_SELECT = `
  id,
  post_id,
  participant_a,
  participant_b,
  created_at,
  post:posts(id,pet_name),
  participantA:profiles!chat_channels_participant_a_fkey(id,display_name),
  participantB:profiles!chat_channels_participant_b_fkey(id,display_name)
`;

const MESSAGE_SELECT = `
  id,
  channel_id,
  owner_id,
  content,
  created_at,
  owner:profiles!chat_messages_owner_id_fkey(display_name)
`;

function orderedPair(idA, idB) {
  return [idA, idB].sort((left, right) => left.localeCompare(right));
}

export async function fetchUserChannels(userId) {
  const { data, error } = await supabase
    .from("chat_channels")
    .select(CHANNEL_SELECT)
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function openOrCreateChannel(currentUserId, otherUserId, postId, initialMessage) {
  const [participantA, participantB] = orderedPair(currentUserId, otherUserId);
  const { data: existing, error: existingError } = await supabase
    .from("chat_channels")
    .select(CHANNEL_SELECT)
    .eq("participant_a", participantA)
    .eq("participant_b", participantB)
    .eq("post_id", postId)
    .maybeSingle();
  if (existingError) {
    throw existingError;
  }

  let channel = existing;
  if (!channel) {
    const { data, error } = await supabase
      .from("chat_channels")
      .insert({
        post_id: postId,
        participant_a: participantA,
        participant_b: participantB,
        created_by: currentUserId
      })
      .select(CHANNEL_SELECT)
      .single();
    if (error) {
      throw error;
    }
    channel = data;
  }

  if (initialMessage) {
    await sendMessage(channel.id, currentUserId, initialMessage);
  }
  return channel;
}

export async function fetchMessages(channelId) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select(MESSAGE_SELECT)
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function sendMessage(channelId, userId, content) {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      channel_id: channelId,
      owner_id: userId,
      content
    })
    .select(MESSAGE_SELECT)
    .single();
  if (error) {
    throw error;
  }
  return data;
}
