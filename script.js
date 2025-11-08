// ========================
// Config
// ========================
const API_URL   = "http://127.0.0.1:8000/predict"; // ajuste se necessário
const STORAGE_KEY = "vw_history";                  // localStorage
const LAST_KEY    = "vw_last";                     // sessionStorage (último resultado)

// ========================
// Helpers
// ========================
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function dataURLFromFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function formatISO(iso) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function unique(arr) { return [...new Set(arr)]; }

// ========================
// Histórico (Storage)
// ========================
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveHistoryItem(item) {
  const list = loadHistory();
  list.unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function clearHistory() { localStorage.removeItem(STORAGE_KEY); }

function setLastResult(obj) { sessionStorage.setItem(LAST_KEY, JSON.stringify(obj)); }
function getLastResult() {
  try { return JSON.parse(sessionStorage.getItem(LAST_KEY) || "null"); }
  catch { return null; }
}

// ========================
// Páginas
// ========================
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "upload") initUploadPage();
  if (page === "result") initResultPage();
  if (page === "history") initHistoryPage();
});

// -------- Upload Page --------
function initUploadPage() {
  const uploadArea = $("#upload-area");
  const uploadBtn  = $("#upload-btn");
  const fileInput  = $("#file-input");
  const preview    = $("#preview");
  const statusEl   = $("#status");
  const loading    = $("#loading");

  // UI eventos
  uploadBtn?.addEventListener("click", () => fileInput.click());
  fileInput?.addEventListener("change", handleFile);

  uploadArea?.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });
  uploadArea?.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });
  uploadArea?.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    } else {
      alert("Por favor, envie uma imagem válida.");
    }
  });

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await processFile(file);
    } else {
      alert("Por favor, selecione uma imagem válida.");
    }
  }

  async function processFile(file) {
    // preview visual antes de enviar
    const dataUrl = await dataURLFromFile(file);
    preview.innerHTML = `<img src="${dataUrl}" alt="Imagem enviada"/>`;
    statusEl.textContent = "";

    // inicia overlay de carregamento
    loading.hidden = false;

    const form = new FormData();
    form.append("file", file, file.name);

    try {
      const res = await fetch(API_URL, { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok || data.error) {
        statusEl.textContent = "Erro: " + (data.error || res.statusText);
        loading.hidden = true;
        return;
      }

      // Normaliza o retorno para o nosso storage
      const labels = unique((data.detections || []).map(d => d.label));
      const normalized = {
        image: data.image,
        labels,
        count: data.count,
        timestamp: data.timestamp // ISO gerado pela API
      };

      // Salva histórico + último
      saveHistoryItem(normalized);
      setLastResult(normalized);

      // vai para result.html
      loading.hidden = true;
      location.href = "result.html";
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Falha ao conectar no servidor.";
      loading.hidden = true;
    }
  }
}

// -------- Result Page --------
function initResultPage() {
  const img  = $("#result-img");
  const meta = $("#meta");
  const labelsUl = $("#labels");
  const fallback = $("#fallback");

  // Tenta pegar o último resultado da sessão;
  // se estiver vazio, usa o item mais recente do histórico
  let data = getLastResult();
  if (!data) {
    const hist = loadHistory();
    if (hist.length) data = hist[0];
  }

  if (!data) {
    // nada para mostrar
    img.style.display = "none";
    meta.textContent = "";
    labelsUl.innerHTML = "";
    fallback.style.display = "block";
    return;
  }

  img.src = data.image;
  meta.textContent = `Detectados: ${data.count} • ${formatISO(data.timestamp)}`;
  labelsUl.innerHTML = (data.labels && data.labels.length)
    ? data.labels.map(l => `<li class="tag">${l}</li>`).join("")
    : `<li class="tag">—</li>`;
}

// -------- History Page --------
function initHistoryPage() {
  const list = $("#history-list");
  const clearBtn = $("#clear-history");

  function render() {
    const items = loadHistory();
    if (!items.length) {
      list.innerHTML = `<p style="opacity:.9">Ainda não há registros no histórico.</p>`;
      return;
    }
    list.innerHTML = items.map((it, idx) => {
      const labels = (it.labels && it.labels.length) ? it.labels.join(", ") : "—";
      return `
        <div class="history-item" data-idx="${idx}" title="Abrir no Resultado">
          <img src="${it.image}" alt="Reconhecimento #${idx + 1}"/>
          <div class="info">
            <div><strong>Objetos:</strong> ${labels}</div>
            <div><strong>Data:</strong> ${formatISO(it.timestamp)}</div>
            <div class="tags">
              ${it.labels?.map(l => `<span class="tag">${l}</span>`).join("") || ""}
            </div>
          </div>
        </div>`;
    }).join("");

    // Clique em um item do histórico → abre em result.html
    list.querySelectorAll(".history-item").forEach(div => {
      div.addEventListener("click", () => {
        const idx = Number(div.dataset.idx);
        const items = loadHistory();
        const chosen = items[idx];
        if (chosen) {
          setLastResult(chosen);
          location.href = "result.html";
        }
      });
    });
  }

  clearBtn?.addEventListener("click", () => {
    clearHistory();
    render();
  });

  render();
}
