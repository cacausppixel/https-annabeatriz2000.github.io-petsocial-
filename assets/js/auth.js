import { supabase } from "./supabaseClient.js";

const PROFILE_SELECT = "id,display_name,user_type,bio,avatar_url,is_admin";

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session ?? null);
  });
}

export async function signUpUser({ email, password, displayName, userType }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        user_type: userType
      }
    }
  });
  if (error) {
    throw error;
  }
  if (data.user) {
    await ensureProfile(data.user, { displayName, userType });
  }
  return data;
}

export async function signInUser({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
  if (data.user) {
    await ensureProfile(data.user);
  }
  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function recoverPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    throw error;
  }
}

export async function getCurrentProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

export async function ensureProfile(user, fallback = {}) {
  const displayName =
    fallback.displayName ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "Usuário";
  const userType = fallback.userType || user.user_metadata?.user_type || "adotante";

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: displayName,
    user_type: userType
  });
  if (error) {
    throw error;
  }
}

export async function updateCurrentProfile(userId, payload) {
  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select(PROFILE_SELECT)
    .single();
  if (error) {
    throw error;
  }
  return data;
}
