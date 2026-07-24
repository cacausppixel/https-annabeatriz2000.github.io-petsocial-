import { supabase } from "./supabaseClient.js";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const BUCKET_NAME = "petsocial-media";

export async function uploadImage(file, userId, folder) {
  if (!file) {
    throw new Error("Selecione uma imagem.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Apenas imagens são permitidas.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Imagem muito grande (máx 4MB).");
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${userId}/${folder}/${crypto.randomUUID()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });
  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error("Falha ao gerar URL pública da imagem.");
  }
  return data.publicUrl;
}
