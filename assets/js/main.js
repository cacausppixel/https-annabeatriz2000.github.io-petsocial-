import {
  ensureProfile,
  getCurrentProfile,
  getCurrentSession,
  onAuthStateChange,
  recoverPassword,
  signInUser,
  signOutUser,
  signUpUser,
  updateCurrentProfile
} from "./auth.js";
import { addComment, createPost, fetchPosts, toggleLike, updateAdoptionStatus } from "./api/posts.js";
import { createStory, fetchStories } from "./api/stories.js";
import { fetchMessages, fetchUserChannels, openOrCreateChannel, sendMessage } from "./api/chats.js";
import { uploadImage } from "./upload.js";
import {
  fillProfileForm,
  renderChatChannels,
  renderChatMessages,
  renderFeed,
  renderStories,
  setAuthStatus,
  setChatHint,
  setFilterButtonState,
  setInfo,
  setLoggedState,
  toggleSidebar
} from "./ui.js";

const state = {
  session: null,
  profile: null,
  posts: [],
  stories: [],
  channels: [],
  messages: [],
  selectedChannelId: null,
  filterAge: "Todos",
  filterSize: "Todos",
  searchText: "",
  favoriteIds: new Set()
};

function byId(id) {
  return document.getElementById(id);
}

function authPayload() {
  return {
    email: byId("authEmail").value.trim(),
    password: byId("authPassword").value,
    displayName: byId("authDisplayName").value.trim(),
    userType: byId("authUserType").value
  };
}

function mustBeAuthenticated() {
  if (!state.session?.user || !state.profile) {
    throw new Error("Você precisa entrar para continuar.");
  }
}

async function loadMainData() {
  mustBeAuthenticated();
  const [posts, stories, channels] = await Promise.all([
    fetchPosts({ ageGroup: state.filterAge, sizeGroup: state.filterSize }),
    fetchStories(),
    fetchUserChannels(state.session.user.id)
  ]);
  state.posts = posts;
  state.stories = stories;
  state.channels = channels;
  if (!state.selectedChannelId && channels.length) {
    state.selectedChannelId = channels[0].id;
  }
  if (state.selectedChannelId) {
    state.messages = await fetchMessages(state.selectedChannelId);
  } else {
    state.messages = [];
  }
  refreshUI();
}

function filteredPosts() {
  const text = state.searchText.toLowerCase();
  if (!text) {
    return state.posts;
  }
  return state.posts.filter((post) => post.pet_name.toLowerCase().includes(text));
}

function refreshUI() {
  setLoggedState(Boolean(state.session));
  if (!state.session || !state.profile) {
    setInfo("Aguardando login...");
    setChatHint("Faça login para abrir canais de mensagens.");
    renderStories([]);
    renderFeed([], {
      currentUserId: "",
      isAdmin: false,
      favoriteIds: state.favoriteIds,
      onToggleLike: () => {},
      onToggleFavorite: () => {},
      onAdopt: () => {},
      onComment: () => {},
      onUpdateStatus: () => {}
    });
    renderChatChannels([], null, () => {});
    renderChatMessages([], "");
    return;
  }

  const userLabel = state.profile.is_admin ? "🛡️ Modo Admin" : `Bem-vindo, ${state.profile.display_name}!`;
  setInfo(userLabel);
  fillProfileForm(state.profile);
  renderStories(state.stories);
  renderFeed(filteredPosts(), {
    currentUserId: state.session.user.id,
    isAdmin: Boolean(state.profile.is_admin),
    favoriteIds: state.favoriteIds,
    onToggleLike: handleToggleLike,
    onToggleFavorite: handleToggleFavorite,
    onAdopt: handleAdoptionInterest,
    onComment: handleAddComment,
    onUpdateStatus: handleUpdateStatus
  });
  renderChatChannels(state.channels, state.selectedChannelId, handleOpenChannel);
  renderChatMessages(state.messages, state.session.user.id);
  setChatHint(state.channels.length ? "Canal sincronizado com Supabase." : "Abra um interesse em um pet para iniciar o chat.");
}

async function resolveAuthSession(session) {
  state.session = session;
  if (!session?.user) {
    state.profile = null;
    state.posts = [];
    state.stories = [];
    state.channels = [];
    state.messages = [];
    state.selectedChannelId = null;
    refreshUI();
    return;
  }

  await ensureProfile(session.user);
  state.profile = await getCurrentProfile(session.user.id);
  await loadMainData();
}

async function safeAction(fn) {
  try {
    await fn();
  } catch (error) {
    console.error(error);
    const message = error?.message || "Ocorreu um erro inesperado.";
    setAuthStatus(message, true);
    alert(message);
  }
}

async function handleLogin() {
  await safeAction(async () => {
    const payload = authPayload();
    if (!payload.email || !payload.password) {
      throw new Error("Informe e-mail e senha para entrar.");
    }
    await signInUser(payload);
    setAuthStatus("Login realizado com sucesso.");
  });
}

async function handleSignup() {
  await safeAction(async () => {
    const payload = authPayload();
    if (!payload.email || !payload.password || !payload.displayName) {
      throw new Error("Preencha e-mail, senha e nome para criar a conta.");
    }
    const result = await signUpUser(payload);
    if (!result.session) {
      setAuthStatus("Conta criada. Verifique seu e-mail para confirmar o acesso.");
      return;
    }
    setAuthStatus("Conta criada e autenticada.");
  });
}

async function handleRecover() {
  await safeAction(async () => {
    const email = byId("authEmail").value.trim();
    if (!email) {
      throw new Error("Informe seu e-mail para recuperação.");
    }
    await recoverPassword(email);
    setAuthStatus("E-mail de recuperação enviado.");
  });
}

async function handleLogout() {
  await safeAction(async () => {
    await signOutUser();
    setAuthStatus("Sessão encerrada.");
  });
}

async function handleCreatePost() {
  await safeAction(async () => {
    mustBeAuthenticated();
    const petName = byId("nomePet").value.trim();
    const description = byId("descPet").value.trim();
    const ageGroup = byId("idadePet").value;
    const sizeGroup = byId("portePet").value;
    const adoptionStatus = byId("statusAdocao").value;
    const file = byId("imgPet").files[0];

    if (!petName || !description || !file) {
      throw new Error("Preencha nome, descrição e imagem para publicar.");
    }

    const imageUrl = await uploadImage(file, state.session.user.id, "posts");
    await createPost(state.session.user.id, {
      petName,
      description,
      ageGroup,
      sizeGroup,
      adoptionStatus,
      imageUrl
    });

    byId("nomePet").value = "";
    byId("descPet").value = "";
    byId("imgPet").value = "";
    await loadMainData();
  });
}

async function handleCreateStory() {
  await safeAction(async () => {
    mustBeAuthenticated();
    const petName = byId("nomePet").value.trim();
    const file = byId("imgPet").files[0];
    if (!petName || !file) {
      throw new Error("Informe nome do pet e imagem para story.");
    }
    const imageUrl = await uploadImage(file, state.session.user.id, "stories");
    await createStory(state.session.user.id, petName, imageUrl);
    byId("imgPet").value = "";
    await loadMainData();
  });
}

async function handleToggleLike(postId) {
  await safeAction(async () => {
    mustBeAuthenticated();
    await toggleLike(postId, state.session.user.id);
    await loadMainData();
  });
}

function handleToggleFavorite(postId) {
  if (state.favoriteIds.has(postId)) {
    state.favoriteIds.delete(postId);
  } else {
    state.favoriteIds.add(postId);
  }
  refreshUI();
}

async function handleAddComment(postId, content) {
  await safeAction(async () => {
    mustBeAuthenticated();
    const clean = content.trim();
    if (!clean) {
      throw new Error("Digite um comentário antes de enviar.");
    }
    await addComment(postId, state.session.user.id, clean);
    await loadMainData();
  });
}

async function handleAdoptionInterest(post) {
  await safeAction(async () => {
    mustBeAuthenticated();
    const message = `Quero adotar ${post.pet_name}!`;
    const channel = await openOrCreateChannel(state.session.user.id, post.owner_id, post.id, message);
    state.selectedChannelId = channel.id;
    await loadMainData();
  });
}

async function handleUpdateStatus(postId, newStatus) {
  await safeAction(async () => {
    mustBeAuthenticated();
    await updateAdoptionStatus(postId, newStatus);
    await loadMainData();
  });
}

async function handleOpenChannel(channelId) {
  await safeAction(async () => {
    mustBeAuthenticated();
    state.selectedChannelId = channelId;
    state.messages = await fetchMessages(channelId);
    refreshUI();
  });
}

async function handleSendMessage() {
  await safeAction(async () => {
    mustBeAuthenticated();
    if (!state.selectedChannelId) {
      throw new Error("Selecione um canal antes de enviar mensagem.");
    }
    const input = byId("chatInput");
    const content = input.value.trim();
    if (!content) {
      throw new Error("Digite uma mensagem antes de enviar.");
    }
    await sendMessage(state.selectedChannelId, state.session.user.id, content);
    input.value = "";
    state.messages = await fetchMessages(state.selectedChannelId);
    refreshUI();
  });
}

async function handleSaveProfile() {
  await safeAction(async () => {
    mustBeAuthenticated();
    const displayName = byId("profileName").value.trim();
    const userType = byId("profileType").value;
    const bio = byId("profileBio").value.trim();
    const avatarFile = byId("profileAvatar").files[0];

    if (!displayName) {
      throw new Error("Informe um nome para o perfil.");
    }

    let avatarUrl = state.profile.avatar_url;
    if (avatarFile) {
      avatarUrl = await uploadImage(avatarFile, state.session.user.id, "avatars");
    }

    state.profile = await updateCurrentProfile(state.session.user.id, {
      display_name: displayName,
      user_type: userType,
      bio,
      avatar_url: avatarUrl
    });
    fillProfileForm(state.profile);
    refreshUI();
  });
}

function bindEvents() {
  byId("btnLogin").addEventListener("click", handleLogin);
  byId("btnSignup").addEventListener("click", handleSignup);
  byId("btnRecover").addEventListener("click", handleRecover);
  byId("btnLogout").addEventListener("click", handleLogout);
  byId("btnLogoutSidebar").addEventListener("click", handleLogout);
  byId("btnCreatePost").addEventListener("click", handleCreatePost);
  byId("btnCreateStory").addEventListener("click", handleCreateStory);
  byId("btnSendMessage").addEventListener("click", handleSendMessage);
  byId("btnSaveProfile").addEventListener("click", handleSaveProfile);

  byId("searchPet").addEventListener("input", (event) => {
    state.searchText = event.target.value.trim();
    refreshUI();
  });

  document.querySelectorAll("[data-filter-age]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.filterAge = button.getAttribute("data-filter-age");
      setFilterButtonState("age", state.filterAge);
      await safeAction(loadMainData);
    });
  });

  document.querySelectorAll("[data-filter-size]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.filterSize = button.getAttribute("data-filter-size");
      setFilterButtonState("size", state.filterSize);
      await safeAction(loadMainData);
    });
  });

  byId("btnOpenSidebar").addEventListener("click", () => toggleSidebar(true));
  byId("btnCloseSidebar").addEventListener("click", () => toggleSidebar(false));
  byId("btnMenuFiltros").addEventListener("click", () => {
    byId("filtroBox").classList.toggle("hidden");
    toggleSidebar(false);
  });
  byId("btnMenuHome").addEventListener("click", () => {
    byId("homeSection").scrollIntoView({ behavior: "smooth" });
    byId("authSection").scrollIntoView({ behavior: "smooth" });
    toggleSidebar(false);
  });
  byId("btnMenuFeed").addEventListener("click", () => {
    byId("feed").scrollIntoView({ behavior: "smooth" });
    toggleSidebar(false);
  });
  byId("btnMenuChat").addEventListener("click", () => {
    byId("chatChannels").scrollIntoView({ behavior: "smooth" });
    toggleSidebar(false);
  });
  byId("btnMenuProfile").addEventListener("click", () => {
    byId("profileCard").scrollIntoView({ behavior: "smooth" });
    toggleSidebar(false);
  });
}

async function init() {
  bindEvents();
  setAuthStatus("");
  const { data: authSubscription } = onAuthStateChange(resolveAuthSession);
  void authSubscription;
  const session = await getCurrentSession();
  await resolveAuthSession(session);

  setInterval(async () => {
    if (!state.session) {
      return;
    }
    await safeAction(loadMainData);
  }, 12000);
}

init().catch((error) => {
  console.error(error);
  setAuthStatus(error?.message || "Erro ao inicializar PetSocial.", true);
});
