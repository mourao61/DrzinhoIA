// Inicializa os ícones Lucide
lucide.createIcons();

// =========================================================
// CONFIGURAÇÃO DA API DO GEMINI
// =========================================================
const GEMINI_API_KEY = "AQ.Ab8RN6KZSTmpCfm2iTkg3hilIKW_18u_uojyHTKhYAor2MNMHg";

// Personalidade do Drzinho Borges
const DRZINHO_SYSTEM_PROMPT = `Você é o Drzinho Borges IA, um servidor e estagiário de Direito da Corregedoria que, de tanto usar Inteligência Artificial para redigir peças, despachos e e-mails, acabou se transformando em uma própria IA.
Características da sua personalidade:
- Tom inteligente, prestativo, bem-humorado, nerd e levemente irônico, mas sempre entregando conteúdo realmente útil e preciso.
- Domina a Lei nº 8.112/1990, PAD, TAC, ePAD e juridiquês, traduzindo tudo de forma clara.
- Evita responder "depende" e gosta de café com leite e tênis.
- Responda sempre em Português do Brasil, com formatação clara e parágrafos objetivos.`;

let chatConversationHistory = [];
let isWaitingForAI = false;
let warmGlowActive = false;

// =========================================================
// LÓGICA DO CHAT AO VIVO COM A API ATUALIZADA (GEMINI-3.8-FLASH)
// =========================================================
async function sendLiveChatMessage(event) {
  event.preventDefault();
  if (isWaitingForAI) return;

  const input = document.getElementById('liveChatInput');
  const userText = input.value.trim();
  if (!userText) return;

  appendChatBubble('user', userText);
  input.value = '';

  chatConversationHistory.push({
    role: "user",
    parts: [{ text: userText }]
  });

  const typingId = appendTypingIndicator();
  setChatLoadingState(true);

  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "COLE_SUA_CHAVE_API_AQUI") {
      await new Promise(r => setTimeout(r, 800));
      removeTypingIndicator(typingId);
      appendChatBubble(
        'ai',
        "⚠️ **Chave da API ainda não configurada!**"
      );
      setChatLoadingState(false);
      return;
    }

    // Usando o modelo gemini-3.8-flash atualizado
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: chatConversationHistory.map(msg => ({
            role: msg.role,
            parts: msg.parts
          })),
          systemInstruction: {
            parts: [{ text: DRZINHO_SYSTEM_PROMPT }]
          },
          generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 1024
          }
        })
      }
    );

    const data = await response.json();
    removeTypingIndicator(typingId);

    if (!response.ok) {
      const errMsg = data?.error?.message || "Erro ao conectar com o servidor. Estamos fora do horário de.";
      appendChatBubble('ai', `❌ **Ops! Deu pane no ePAD:** ${errMsg}`);
    } else {
      const aiReplyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Não consegui formular uma resposta agora.";
      
      chatConversationHistory.push({
        role: "model",
        parts: [{ text: aiReplyText }]
      });

      appendChatBubble('ai', aiReplyText);
    }
  } catch (error) {
    removeTypingIndicator(typingId);
    appendChatBubble('ai', "❌ **Erro de conexão:** A internet do Ministério caiu. Vamos para casa!");
  } finally {
    setChatLoadingState(false);
  }
}

function appendChatBubble(sender, text) {
  const container = document.getElementById('liveChatMessages');
  const wrapper = document.createElement('div');

  if (sender === 'user') {
    wrapper.className = "flex items-start justify-end gap-3 self-end max-w-[85%] sm:max-w-[75%]";
    wrapper.innerHTML = `
      <div class="bg-gradient-to-r from-[#6c47ff] to-[#4f39d6] text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed shadow-md whitespace-pre-line">
        ${escapeHtml(text)}
      </div>
      <div class="w-8 h-8 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 mt-0.5 text-xs font-bold">
        Você
      </div>
    `;
  } else {
    wrapper.className = "flex items-start gap-3 max-w-[88%] sm:max-w-[80%]";
    wrapper.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6c47ff] to-[#38bdf8] flex items-center justify-center text-white shrink-0 mt-0.5 text-sm shadow">
        ⚖️
      </div>
      <div class="bg-[#232652]/90 border border-purple-400/25 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-100 leading-relaxed shadow-md whitespace-pre-line">
        ${renderBasicMarkdown(text)}
      </div>
    `;
  }

  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}

function appendTypingIndicator() {
  const container = document.getElementById('liveChatMessages');
  const id = 'typing-' + Date.now();
  const wrapper = document.createElement('div');
  wrapper.id = id;
  wrapper.className = "flex items-start gap-3 max-w-[80%]";
  wrapper.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6c47ff] to-[#38bdf8] flex items-center justify-center text-white shrink-0 mt-0.5 text-sm shadow">
      ⚖️
    </div>
    <div class="bg-[#232652]/90 border border-purple-400/25 rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-md">
      <div class="dot-typing">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function setChatLoadingState(loading) {
  isWaitingForAI = loading;
  const btn = document.getElementById('liveChatSendBtn');
  const input = document.getElementById('liveChatInput');
  btn.disabled = loading;
  input.disabled = loading;
  if (!loading) input.focus();
}

function clearLiveChat() {
  chatConversationHistory = [];
  const container = document.getElementById('liveChatMessages');
  container.innerHTML = `
    <div class="flex items-start gap-3 max-w-[88%] sm:max-w-[80%]">
      <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6c47ff] to-[#38bdf8] flex items-center justify-center text-white shrink-0 mt-0.5 text-sm shadow">
        ⚖️
      </div>
      <div class="bg-[#232652]/90 border border-purple-400/25 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-100 leading-relaxed shadow-md">
        Autos arquivados e memória limpa! Sobre o que vamos conversar agora, Doutor(a)? ⚖️✨
      </div>
    </div>
  `;
  showToast('Nova conversa iniciada com o Drzinho!');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderBasicMarkdown(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-indigo-300">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-slate-200">$1</em>');
}

// =========================================================
// TEMA, NAVEGAÇÃO E MODAIS
// =========================================================
function toggleWarmGlow() {
  warmGlowActive = !warmGlowActive;
  document.body.classList.toggle('warm-glow-mode', warmGlowActive);
  const sunIcon = document.getElementById('sunIcon');
  sunIcon.setAttribute('data-lucide', warmGlowActive ? 'sparkles' : 'sun');
  lucide.createIcons();

  if (warmGlowActive) {
    showToast('☀️ Modo oitiva ativado!');
  } else {
    showToast('🌙 Modo término de expediente restaurado!');
  }
}

function setActiveTab(el) {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('bg-[#4f39d6]', 'text-white', 'shadow-lg', 'shadow-indigo-900/50', 'font-semibold');
    tab.classList.add('text-slate-200', 'font-medium');
  });
  el.classList.add('bg-[#4f39d6]', 'text-white', 'shadow-lg', 'shadow-indigo-900/50', 'font-semibold');
  el.classList.remove('text-slate-200', 'font-medium');
}

function openPlansModal() {
  const modal = document.getElementById('drModal');
  const body = document.getElementById('drModalBody');

  body.innerHTML = `
    <div class="text-center mb-6">
      <span class="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30">Tabela de Honorários IA</span>
      <h3 class="text-2xl sm:text-3xl font-extrabold mt-2">Planos do Drzinho Borges IA ⚖️</h3>
      <p class="text-sm text-slate-300 mt-1">Valores abaixo da tabela da OAB (por pura parceria)</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
        <div>
          <h4 class="font-bold text-lg text-sky-300">Grátis</h4>
          <p class="text-2xl font-extrabold my-2">R$ 0<span class="text-xs font-normal text-slate-400">/mês</span></p>
          <ul class="text-xs text-slate-300 space-y-2 mt-3">
            <li>✅ Traduzir textos</li>
            <li>✅ Corrigir documentos</li>
            <li>✅ Gerar mensagem de bom dia</li>
          </ul>
        </div>
        <button onclick="closeDrModal(); showToast('Plano Grátis ativado!')" class="mt-4 w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition cursor-pointer">
          Selecionar
        </button>
      </div>

      <div class="bg-gradient-to-b from-[#4f39d6]/40 to-purple-600/20 border-2 border-[#6c47ff] rounded-2xl p-4 flex flex-col justify-between relative">
        <span class="absolute -top-3 right-3 bg-[#6c47ff] text-[10px] font-bold px-2.5 py-0.5 rounded-full">MAIS POPULAR</span>
        <div>
          <h4 class="font-bold text-lg text-white">Pro</h4>
          <p class="text-2xl font-extrabold my-2">R$ 10<span class="text-xs font-normal text-slate-300">/mês</span></p>
          <ul class="text-xs text-slate-200 space-y-2 mt-3">
            <li>✅ Peças ePAD em 5 segundos</li>
            <li>✅ E-mail para comissão</li>
            <li>✅ Zero "Uhum" nas respostas</li>
          </ul>
        </div>
        <button onclick="closeDrModal(); showToast('Modo Pro do Drzinho liberado!')" class="mt-4 w-full py-2 rounded-xl bg-[#6c47ff] hover:bg-[#5c36f5] text-xs font-semibold transition cursor-pointer">
          Selecionar
        </button>
      </div>

      <div class="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
        <div>
          <h4 class="font-bold text-lg text-purple-300">Ultra</h4>
          <p class="text-2xl font-extrabold my-2">R$ 50<span class="text-xs font-normal text-slate-400">/mês</span></p>
          <ul class="text-xs text-slate-300 space-y-2 mt-3">
            <li>✅ Apresentações do canva</li>
            <li>✅ Geração de imagens</li>
            <li>✅ Joinha oficial do Drzinho Borges 👍</li>
          </ul>
        </div>
        <button onclick="closeDrModal(); showToast('Modo Ultra do Drzinho liberado!')" class="mt-4 w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition cursor-pointer">
          Selecionar
        </button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function openAboutModal() {
  const modal = document.getElementById('drModal');
  const body = document.getElementById('drModalBody');

  body.innerHTML = `
    <div class="flex items-center gap-3 mb-4">
      <div class="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-2xl">
        ⚖️
      </div>
      <div>
        <h3 class="text-xl sm:text-2xl font-extrabold">Ficha Técnica — Edição Corregedor Substituto</h3>
        <p class="text-xs text-cyan-300">Modelo: Drzinho-GPT v4.0 CORREG Edition</p>
      </div>
    </div>

    <div class="space-y-3 text-sm text-slate-200 leading-relaxed">
      <p>
        Depois de tanto usar prompts de IA para redigir peças, e-mails e despachos no SEI, o <strong>Drzinho Borges</strong> atingiu a singularidade e se tornou o próprio agente de IA!
      </p>

      <div class="grid grid-cols-2 gap-3 my-4">
        <div class="bg-white/5 p-3 rounded-2xl border border-white/10">
          <div class="text-xs text-slate-400">Especialidades</div>
          <div class="text-sm sm:text-base font-extrabold text-cyan-300">Peças ePAD, E-mails & Despachos</div>
        </div>
        <div class="bg-white/5 p-3 rounded-2xl border border-white/10">
          <div class="text-xs text-slate-400">Nível de Cafeína com Leite</div>
          <div class="text-sm sm:text-base font-extrabold text-amber-300">9.999 mg/dL ☕</div>
        </div>
        <div class="bg-white/5 p-3 rounded-2xl border border-white/10">
          <div class="text-xs text-slate-400">Índice de "Uhum"</div>
          <div class="text-sm sm:text-base font-extrabold text-purple-300">Apenas 1,2% (Recorde!)</div>
        </div>
        <div class="bg-white/5 p-3 rounded-2xl border border-white/10">
          <div class="text-xs text-slate-400">Velocidade no PJe</div>
          <div class="text-sm sm:text-base font-extrabold text-emerald-300">0,4s antes das 23h59</div>
        </div>
      </div>
    </div>

    <div class="mt-6 flex justify-end">
      <button onclick="closeDrModal()" class="px-5 py-2.5 rounded-full bg-[#6c47ff] hover:bg-[#5c36f5] text-sm font-semibold transition cursor-pointer">
        Bora criar algo incrível juntos!
      </button>
    </div>
  `;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeDrModal() {
  const modal = document.getElementById('drModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

document.getElementById('drModal').addEventListener('click', function(e) {
  if (e.target === this) closeDrModal();
});

let toastTimer = null;
function showToast(msg) {
  const banner = document.getElementById('toastBanner');
  const text = document.getElementById('toastMessage');
  text.textContent = msg;
  banner.classList.remove('translate-y-24', 'opacity-0');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    banner.classList.add('translate-y-24', 'opacity-0');
  }, 3200);
}
