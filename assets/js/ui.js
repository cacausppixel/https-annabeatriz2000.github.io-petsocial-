function clearElement(element) {
  element.replaceChildren();
}

function tag(classes, text) {
  const element = document.createElement("span");
  element.className = classes;
  element.textContent = text;
  return element;
}

function formatStatus(status) {
  if (status === "adotado") return "❤️ Adotado";
  if (status === "em-processo") return "⏳ Em Processo";
  return "✅ Disponível";
}

function nextStatus(status) {
  if (status === "disponivel") return "em-processo";
  if (status === "em-processo") return "adotado";
  return "disponivel";
}

export function setInfo(text) {
  document.getElementById("info").textContent = text;
}

export function setAuthStatus(text, isError = false) {
  const element = document.getElementById("authStatus");
  element.textContent = text;
  element.className = isError ? "text-xs text-red-600" : "text-xs text-slate-500";
}

export function toggleSidebar(show) {
  const sidebar = document.getElementById("sidebar");
  if (show) {
    sidebar.classList.remove("-translate-x-full");
    return;
  }
  sidebar.classList.add("-translate-x-full");
}

export function setLoggedState(loggedIn) {
  document.getElementById("btnLogout").classList.toggle("hidden", !loggedIn);
  document.getElementById("profileCard").classList.toggle("hidden", !loggedIn);
  document.getElementById("filtroBox").classList.toggle("hidden", !loggedIn);
  document.getElementById("appSection").classList.toggle("hidden", !loggedIn);
}

export function fillProfileForm(profile) {
  document.getElementById("profileName").value = profile?.display_name ?? "";
  document.getElementById("profileType").value = profile?.user_type ?? "adotante";
  document.getElementById("profileBio").value = profile?.bio ?? "";
  document.getElementById("profileAvatar").value = "";
}

export function renderStories(stories) {
  const container = document.getElementById("stories");
  clearElement(container);
  if (!stories.length) {
    container.append(tag("text-xs text-slate-500", "Nenhuma story ainda"));
    return;
  }

  stories.forEach((story) => {
    const wrapper = document.createElement("div");
    wrapper.className = "flex flex-col items-center gap-1";

    const image = document.createElement("img");
    image.className = "story object-cover";
    image.src = story.image_url;
    image.alt = story.pet_name;

    const label = document.createElement("p");
    label.className = "text-[10px] text-slate-600";
    label.textContent = story.pet_name;

    wrapper.append(image, label);
    container.append(wrapper);
  });
}

function createCommentItem(comment) {
  const line = document.createElement("p");
  line.className = "text-xs text-slate-600";
  const author = comment.owner?.display_name ?? "Usuário";
  line.textContent = `${author}: ${comment.content}`;
  return line;
}

function createFeedCard(post, context) {
  const {
    currentUserId,
    isAdmin,
    favoriteIds,
    onToggleLike,
    onToggleFavorite,
    onAdopt,
    onComment,
    onUpdateStatus
  } = context;

  const card = document.createElement("div");
  card.className = "bg-white p-4 rounded-xl border shadow";

  const image = document.createElement("img");
  image.src = post.image_url;
  image.alt = post.pet_name;
  image.className = "w-full h-56 object-cover rounded mb-3";

  const titleRow = document.createElement("div");
  titleRow.className = "flex justify-between items-start mb-2";

  const titleWrapper = document.createElement("div");
  const title = document.createElement("h4");
  title.className = "font-bold text-slate-700";
  title.textContent = post.pet_name;
  const meta = document.createElement("p");
  meta.className = "text-xs text-slate-600";
  meta.textContent = `Idade: ${post.age_group} | Porte: ${post.size_group}`;
  titleWrapper.append(title, meta);

  const badge = document.createElement("button");
  const currentStatus = post.adoption_status || "disponivel";
  badge.className = "text-xs font-bold px-3 py-1 rounded-full bg-slate-100";
  badge.textContent = formatStatus(currentStatus);
  badge.disabled = post.owner_id !== currentUserId && !isAdmin;
  badge.addEventListener("click", () => onUpdateStatus(post.id, nextStatus(currentStatus)));

  titleRow.append(titleWrapper, badge);

  const description = document.createElement("p");
  description.className = "text-sm mb-2";
  description.textContent = post.description;

  const owner = document.createElement("small");
  owner.className = "text-slate-500";
  owner.textContent = `Por ${post.owner?.display_name ?? "Tutor"}`;

  const actions = document.createElement("div");
  actions.className = "flex gap-2 mt-3";

  const likeButton = document.createElement("button");
  likeButton.className = "text-sm font-bold hover:text-pink-500";
  const liked = (post.likes ?? []).some((like) => like.user_id === currentUserId);
  likeButton.textContent = `${liked ? "❤️" : "🤍"} ${(post.likes ?? []).length}`;
  likeButton.addEventListener("click", () => onToggleLike(post.id));

  const favoriteButton = document.createElement("button");
  favoriteButton.className = "text-sm font-bold hover:text-yellow-500";
  favoriteButton.textContent = `${favoriteIds.has(post.id) ? "⭐" : "☆"} Salvar`;
  favoriteButton.addEventListener("click", () => onToggleFavorite(post.id));

  const adoptButton = document.createElement("button");
  adoptButton.className = "text-sm font-bold text-pink-500 hover:text-pink-600";
  adoptButton.textContent = "🐾 Adotar";
  adoptButton.disabled = post.owner_id === currentUserId;
  adoptButton.addEventListener("click", () => onAdopt(post));

  actions.append(likeButton, favoriteButton, adoptButton);

  const commentsBox = document.createElement("div");
  commentsBox.className = "mt-3 border-t pt-2 space-y-1";
  const comments = post.comments ?? [];
  if (!comments.length) {
    commentsBox.append(tag("text-xs text-slate-500", "Sem comentários"));
  } else {
    comments.forEach((comment) => commentsBox.append(createCommentItem(comment)));
  }

  const commentInput = document.createElement("input");
  commentInput.className = "input mt-2";
  commentInput.placeholder = "Comentar...";

  const commentButton = document.createElement("button");
  commentButton.className = "mt-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded";
  commentButton.textContent = "Enviar comentário";
  commentButton.addEventListener("click", () => onComment(post.id, commentInput.value));

  card.append(image, titleRow, description, owner, actions, commentsBox, commentInput, commentButton);
  return card;
}

export function renderFeed(posts, context) {
  const container = document.getElementById("feed");
  clearElement(container);
  if (!posts.length) {
    container.append(tag("text-sm text-slate-500", "Nenhum pet encontrado"));
    return;
  }
  posts.forEach((post) => container.append(createFeedCard(post, context)));
}

export function renderChatChannels(channels, selectedChannelId, onOpenChannel) {
  const container = document.getElementById("chatChannels");
  clearElement(container);
  if (!channels.length) {
    container.append(tag("text-xs text-slate-500", "Nenhuma conversa ainda."));
    return;
  }

  channels.forEach((channel) => {
    const btn = document.createElement("button");
    btn.className = "w-full text-left p-2 rounded border text-xs hover:border-pink-400";
    if (channel.id === selectedChannelId) {
      btn.classList.add("border-pink-500", "bg-pink-50");
    }
    const title = channel.post?.pet_name ? `🐾 ${channel.post.pet_name}` : "💬 Conversa";
    const userA = channel.participantA?.display_name ?? "Usuário";
    const userB = channel.participantB?.display_name ?? "Usuário";
    btn.textContent = `${title} (${userA} / ${userB})`;
    btn.addEventListener("click", () => onOpenChannel(channel.id));
    container.append(btn);
  });
}

export function renderChatMessages(messages, currentUserId) {
  const container = document.getElementById("chatMessages");
  clearElement(container);
  if (!messages.length) {
    container.append(tag("text-xs text-slate-500", "Nenhuma mensagem neste canal."));
    return;
  }

  messages.forEach((message) => {
    const row = document.createElement("div");
    row.className = "p-2 rounded border text-xs";
    if (message.owner_id === currentUserId) {
      row.classList.add("bg-pink-50", "border-pink-200");
    } else {
      row.classList.add("bg-slate-50", "border-slate-200");
    }

    const owner = message.owner?.display_name ?? "Usuário";
    const author = document.createElement("p");
    author.className = "font-bold text-slate-700";
    author.textContent = owner;
    const content = document.createElement("p");
    content.className = "text-slate-600";
    content.textContent = message.content;
    row.append(author, content);
    container.append(row);
  });
  container.scrollTop = container.scrollHeight;
}

export function setChatHint(text) {
  document.getElementById("chatHint").textContent = text;
}

export function setFilterButtonState(type, value) {
  const selector = type === "age" ? "[data-filter-age]" : "[data-filter-size]";
  document.querySelectorAll(selector).forEach((element) => {
    element.classList.remove("ativo");
    const current = type === "age" ? element.getAttribute("data-filter-age") : element.getAttribute("data-filter-size");
    if (current === value) {
      element.classList.add("ativo");
    }
  });
}
