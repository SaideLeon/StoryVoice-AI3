# StoryVoice AI 🎙️🎬

Uma suíte de produção de narrativas completa impulsionada por Inteligência Artificial. O **StoryVoice AI** transforma textos simples em narrações humanas ultra-realistas, gera storyboards cinematográficos e exporta vídeos verticais prontos para redes sociais (TikTok, Reels, Shorts) utilizando os modelos mais recentes do Google Gemini.

## ✨ Funcionalidades

### 🧠 Inteligência Artificial (Google Gemini)
- **Vozes Neurais (TTS):** Utiliza o modelo `gemini-2.5-flash-preview-tts` para gerar narrações com entonação emocional, pausas dramáticas e ritmo perfeito.
- **Storyboard AI:** O modelo `gemini-3-flash-preview` analisa o roteiro e o divide automaticamente em cenas granulares, criando prompts visuais detalhados.
- **Geração de Imagens:** Integração com `gemini-2.5-flash-image` (e Imagen) para criar visuais de alta fidelidade baseados nos prompts do storyboard.
- **Script Mágico:** Gerador de roteiros virais (estilo "O que aconteceria se...") otimizados para retenção de público.

### 🛠️ Estúdio de Produção
- **Visualizador de Áudio:** Waveform em tempo real sincronizado com a reprodução.
- **Editor & Storyboard:** Modos de visualização alternáveis para escrita livre ou planejamento cena a cena.
- **Exportação de Vídeo:** Renderização no navegador (Client-side) que une imagens e áudio em arquivos `.webm` ou `.mp4` verticais (9:16).
- **Consistência de Personagem:** Sistema de referência visual para manter o estilo e personagens consistentes entre as cenas.

### ☁️ Persistência & Backend (Supabase)
- **Autenticação:** Sistema de Login/Cadastro seguro.
- **Histórico de Projetos:** Salve e carregue seus roteiros e storyboards na nuvem.
- **Gerenciamento de Chaves API:** Armazenamento seguro e rotação de chaves de API do usuário.

## 🚀 Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Tailwind CSS.
- **Ícones:** Lucide React.
- **AI SDK:** `@google/genai` (Google GenAI SDK).
- **Backend/DB:** Supabase (Auth & PostgreSQL).
- **Áudio:** Web Audio API (Processamento PCM/WAV raw).
- **Vídeo:** Canvas API + MediaRecorder API.

## 📦 Configuração e Instalação

### 1. Clonar e Instalar Dependências

```bash
git clone https://github.com/seu-usuario/storyvoice-ai.git
cd storyvoice-ai
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (ou configure no seu ambiente de build):

```env
# Configurações do Supabase (Obrigatório para Auth/Save)
SUPABASE_URL="https://sua-url-supabase.supabase.co"
SUPABASE_ANON_KEY="sua-chave-anonima-supabase"

# Chave Padrão do Gemini (Opcional - usuários podem inserir a própria na UI)
API_KEY="sua-chave-google-genai"
```

### 3. Configurar o Banco de Dados (Supabase)

Vá até o painel do Supabase, entre no **SQL Editor** e execute o conteúdo do arquivo `supabase_setup.sql` incluído neste projeto.

Este script irá:
1. Ativar a extensão UUID.
2. Criar a tabela `profiles` (vinculada aos usuários de Auth).
3. Criar a tabela `projects` para salvar histórias.
4. Criar a tabela `user_api_keys` para gerenciar chaves.
5. Configurar as políticas de segurança (RLS) para proteger os dados.

### 4. Executar o Projeto

```bash
npm run dev
```

## 📖 Como Usar

### Modo Editor
1. Digite ou cole sua história no editor de texto.
2. Use o botão **"Script Mágico"** (ícone de varinha) para gerar uma ideia viral se estiver sem criatividade.
3. No painel lateral, escolha a **Voz** (ex: Fenrir, Puck) e o **Estilo** (ex: Narrador Experiente, Terror).
4. Clique em "Gerar Narração" para ouvir o resultado.

### Modo Storyboard
1. Clique em **"Gerar Storyboard"**. A IA dividirá seu texto em cenas.
2. Em cada cena, você pode:
   - Gerar o áudio individual daquela frase.
   - Gerar a imagem baseada no prompt criado pela IA.
3. **Referência Global:** Faça upload de uma imagem ou selecione uma gerada para servir de estilo/personagem base para as próximas gerações.
4. **Auto-Gerar:** Clique em "Auto-Gerar Imagens" para criar visuais para todas as cenas em sequência.

### Exportação
1. Quando todas as cenas tiverem imagem e áudio, o botão **"Exportar Vídeo"** ficará ativo.
2. O vídeo será renderizado em tempo real no seu navegador e baixado automaticamente.

## 🔑 Gerenciamento de Chaves API

Como a geração de vídeo e imagem consome muitos tokens, o sistema suporta **Rotação de Chaves API**.
- Vá em **Configurações** (ícone de engrenagem).
- Carregue um arquivo `.txt` contendo uma lista de chaves API do Google (uma por linha).
- O sistema alternará automaticamente entre as chaves para evitar limites de taxa (Rate Limits/429).

## 📄 Licença

Este projeto é de código aberto. Sinta-se à vontade para contribuir!
