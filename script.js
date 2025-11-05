const uploadArea = document.getElementById("upload-area");
const uploadBtn = document.getElementById("upload-btn");
const fileInput = document.getElementById("file-input");
const preview = document.getElementById("preview");
const resultDiv = document.getElementById("result");
const resultImg = document.getElementById("result-img");
const meta = document.getElementById("meta");
const newBtn = document.getElementById("new-btn");

const API_URL = "http://127.0.0.1:8000/predict";

// Clique no botão abre o input
uploadBtn.addEventListener("click", () => fileInput.click());

// Upload via input
fileInput.addEventListener("change", handleFile);

// Drag and drop
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    processFile(file);
  } else {
    alert("Por favor, envie uma imagem válida.");
  }
});

// Novo botão: reenviar imagem
newBtn.addEventListener("click", () => {
  // limpa todos os elementos
  preview.innerHTML = "";
  resultImg.removeAttribute("src");
  meta.textContent = "";
  resultDiv.style.display = "none";
  uploadArea.style.display = "block";
});

function handleFile(e) {
  const file = e.target.files[0];
  if (file && file.type.startsWith("image/")) {
    processFile(file);
  } else {
    alert("Por favor, selecione uma imagem válida.");
  }
}

function showPreview(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    preview.innerHTML = `<img src="${ev.target.result}" alt="Imagem enviada">`;
  };
  reader.readAsDataURL(file);
}

async function processFile(file) {
  showPreview(file);
  meta.textContent = "Processando...";
  resultDiv.style.display = "none";

  const form = new FormData();
  form.append("file", file, file.name);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: form,
    });

    const data = await res.json();

    if (data.error) {
      meta.textContent = "Erro: " + data.error;
      resultImg.removeAttribute("src");
      resultDiv.style.display = "block";
      return;
    }

    // Exibe o resultado
    resultImg.src = data.image;
    meta.textContent = `Pessoas detectadas: ${data.count}`;
    resultDiv.style.display = "block";
    uploadArea.style.display = "none";
  } catch (err) {
    meta.textContent = "Falha ao conectar no servidor.";
    console.error(err);
    resultDiv.style.display = "block";
  }
}
