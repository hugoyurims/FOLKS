# FolksInsight - Documentação de Arquitetura e Deploy

## Visão Geral
O FolksInsight é um portal focado no bem-estar digital e saúde mental dos colaboradores da Folks Solutions, incluindo uma área gamificada, notícias internas, loja de benefícios e um chatbot especializado em IA.

---

## 1. Fluxo de Autenticação & Autorização

O perfil e controle de acesso operam da seguinte forma:
- **Firebase Auth (Client)**: Responsável pela validação de credenciais (e-mail e senha).
- **Firestore `users/{userId}`**: Aramazena os pontos, as insígnias resolvidas e a atribuição do nível de permissão (role: `'editor' | 'collaborator'`).
- **Verificação no Backend**: Todas as rotas baseadas na IA recebem a verificação do `IdToken` gerado pelo Google Firebase via Authentication Header (`Bearer $TOKEN`).
  - `verifyUser`: garante que a conta do firebase está válida.
  - `verifyEditor`: intercepta o token JWT do usuário, busca a role *diretamente do Firestore* na base de dados para garantir que regras cliente não transpassem, bloqueando acessos caso não seja `editor` no banco de dados.
- **Usuários Master**: Em `firestore.rules`, foi bloqueada a elevação indevida para Editor. Somente editores existentes podem promover novos/antigos usuários a editor utilizando a tela de Usuários (`src/pages/Users.tsx`). Há também um fallback provisório para que contas principais configuradas via variável no sistema assumam role master caso não exista outro meio.

---

## 2. Estrutura de Banco de Dados (Firestore)

A aplicação conta com as seguintes coleções principais no Cloud Firestore:

- **`users` (`users/{uid}`)**
  - **Função**: Perfil do usuário.
  - **Campos**: `email` (string), `role` (string), `points` (number), `badges` (array), `readArticles` (array), `answeredQuizzes` (array).
  - **Segurança**: Somente o próprio usuário e Editores podem atualizar certos dados (pontos e histórico de leituras).

- **`articles` (`articles/{articleId}`)**
  - **Função**: Notícias e comunicados.
  - **Campos**: `title` (string), `content` (string), `category` (general|internal), `status` (draft|published).

- **`store` (`store/{benefitId}`)**
  - **Função**: Benefícios e cupons da loja da empresa.
  - **Campos**: `name` (string), `cost` (number), `description` (string), `createdAt` (datetime).

- **`feedbacks` & `error_logs`**
  - **Função**: Guardam erros críticos em chamadas da IA e os feedbacks dos usuários dentro do Chat para o sumário de engajamento do marketing.

---

## 3. Rotas de Backend (Express + Vite)

Localizada no arquivo `server.ts` que provê APIs para o Client App usar a inteligência do Gemini isolado das credenciais dos navegadores.

- `POST /api/chat` : Responde ao Chatbot interagindo com `gemini-3.5-flash`. Usa validação `verifyUser` e tem uma system-instructions fixa em Saúde Digital. 
- `POST /api/generate-quiz` : (Acesso: `verifyEditor`). Cria dinamicamente 1 questão de teste sobre o conteúdo de uma notícia postada.
- `POST /api/feedback-summary` : (Acesso: `verifyEditor`). Agrupa JSON com dados de todos os feedbacks e logs de erro do chat para elaborar conselhos gerenciais em PT-BR para o Marketing.
- `POST /api/fetch-external-news` : (Acesso: `verifyEditor`). Simulador que retorna noticias fictícias de inovação tecnológica + saúde corporativa.

---

## 4. How-To Deploy

Para construir a aplicação e iniciar em uma infraestrutura própria / Docker containerizado:

### 1. Preparação
Certifique-se de configurar e carregar estas envs para o container:
- As credenciais públicas no arquivo `firebase-applet-config.json`.
- Apenas e somente no servidor adicione o `.env` ou carregue na Cloud `GEMINI_API_KEY`! Não vaze esta var para o front-end.

### 2. Build
Gera os arquivos na pasta estática e o script bundle esbuild em formato common-js (`dist/server.cjs`):
```bash
npm run build
```

### 3. Start da Produção
Para colocar o backend ao ar no Cloud Run:
```bash
npm run start
```
O servidor irá usar o port indicado na variável $PORT do container e fará cache das rotas `dist`.
