# PetSocial com Supabase

Migração de segurança concluída para usar **Supabase Auth + Postgres + Storage + RLS**, removendo o fluxo antigo de JSONBin/localStorage para contas e senhas.

## Configuração obrigatória

1. Crie um projeto no Supabase.
2. Em `index.html`, configure `window.PETSOCIAL_CONFIG`:

```html
<script>
window.PETSOCIAL_CONFIG = {
  SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
  SUPABASE_ANON_KEY: "SUA_SUPABASE_ANON_KEY"
};
</script>
```

3. **Nunca** use `service_role` no front-end. Use apenas `SUPABASE_ANON_KEY`.

## Aplicar schema SQL + RLS

1. Abra o SQL Editor no Supabase.
2. Rode o conteúdo de `supabase/schema.sql`.
3. O script cria:
   - `profiles`
   - `posts`
   - `post_likes`
   - `post_comments`
   - `chat_channels`
   - `chat_messages`
   - `stories`
   - bucket `petsocial-media` + policies de Storage
4. O script já ativa RLS e define policies de:
   - leitura pública para conteúdo necessário
   - escrita/edição/remoção restrita a dono
   - operações administrativas condicionadas a `profiles.is_admin`

## Executar localmente

Por ser um app estático (HTML + JS), basta servir a pasta com HTTP local:

```bash
# Exemplo com Python
python -m http.server 5500
```

Depois acesse:

`http://localhost:5500`

## Estrutura de código

Arquivos principais da integração:

- `assets/js/supabaseClient.js`
- `assets/js/auth.js`
- `assets/js/api/posts.js`
- `assets/js/api/chats.js`
- `assets/js/api/stories.js`
- `assets/js/upload.js`
- `assets/js/ui.js`
- `assets/js/main.js`

## Segurança aplicada

- Remoção total de credenciais e fluxo JSONBin do front.
- Auth real via Supabase (signup/login/logout/recover).
- Upload de imagens para Supabase Storage com URL pública (sem base64 persistido).
- Renderização de dados de usuário com `createElement` + `textContent` para reduzir risco de XSS.