const connectionPill = document.querySelector("#connection-pill");
const connectionLabel = document.querySelector("#connection-label");
const documentName = document.querySelector("#document-name");
const documentMeta = document.querySelector("#document-meta");
const documentStatus = document.querySelector("#document-status");
const libraryCount = document.querySelector("#library-count");
const dropzone = document.querySelector("#dropzone");
const fileInput = document.querySelector("#pdf-input");
const progressWrap = document.querySelector("#upload-progress-wrap");
const progressLabel = document.querySelector("#upload-progress-label");
const progressValue = document.querySelector("#upload-progress-value");
const progressBar = document.querySelector("#upload-progress-bar");
const uploadNote = document.querySelector("#upload-note");
const uploadAccessKey = document.querySelector("#upload-access-key");
const uploadKeyVisibility = document.querySelector("#upload-key-visibility");
const chatFeed = document.querySelector("#chat-feed");
const chatForm = document.querySelector("#chat-form");
const questionInput = document.querySelector("#question-input");
const sendButton = document.querySelector("#send-button");
const charCount = document.querySelector("#char-count");
const toast = document.querySelector("#toast");
const themeToggle = document.querySelector("#theme-toggle");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');

let hasDocument = false;
let isBusy = false;
let toastTimer;
const API_BASE_URL = (window.PAGEWISE_API_BASE_URL || "").replace(/\/+$/, "");
const apiUrl = path => `${API_BASE_URL}${path}`;

const escapeText = (value) => String(value ?? "");

uploadKeyVisibility.addEventListener("click", () => {
  const showKey = uploadAccessKey.type === "password";
  uploadAccessKey.type = showKey ? "text" : "password";
  uploadKeyVisibility.setAttribute("aria-pressed", String(showKey));
  uploadKeyVisibility.setAttribute(
    "aria-label",
    showKey ? "Hide access key" : "Show access key"
  );
  uploadAccessKey.focus();
});

function setTheme(theme, persist = true) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  const nextTheme = isDark ? "light" : "dark";
  const label = `Switch to ${nextTheme} mode`;
  themeToggle.setAttribute("aria-label", label);
  themeToggle.title = label;
  themeColorMeta.setAttribute("content", isDark ? "#242321" : "#f3f1eb");

  if (persist) {
    try {
      localStorage.setItem("pagewise-theme", isDark ? "dark" : "light");
    } catch {
      showToast("Theme changed, but this browser could not save your preference.");
    }
  }
}

setTheme(document.documentElement.dataset.theme || "light", false);

themeToggle.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

function setConnection(isOnline) {
  connectionPill.classList.toggle("is-online", isOnline);
  connectionPill.classList.toggle("is-offline", !isOnline);
  connectionLabel.textContent = isOnline ? "All systems ready" : "Backend offline";
}

function showToast(message, success = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("is-success", success);
  toast.classList.add("is-visible");
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 4600);
}

function updateChatControls() {
  const hasQuestion = questionInput.value.trim().length > 0;
  questionInput.disabled = !hasDocument || isBusy;
  sendButton.disabled = !hasDocument || isBusy || !hasQuestion;
  sendButton.classList.toggle("is-loading", isBusy);
  questionInput.placeholder = hasDocument
    ? "Ask anything about your PDF…"
    : "Upload a PDF to start asking questions…";
}

function updateDocumentStatus(status) {
  hasDocument = Boolean(status.hasDocument);
  libraryCount.textContent = hasDocument ? "1" : "0";
  libraryCount.setAttribute(
    "aria-label",
    hasDocument ? "One shared document uploaded" : "No shared document uploaded"
  );
  documentStatus.classList.toggle("is-ready", hasDocument);
  documentStatus.setAttribute(
    "aria-label",
    hasDocument ? "PDF ready" : "No PDF uploaded"
  );
  let savedDocumentName = "";
  try {
    savedDocumentName = localStorage.getItem("pagewise-document-name") || "";
  } catch {
    savedDocumentName = "";
  }
  documentName.textContent = hasDocument
    ? documentName.dataset.fileName || savedDocumentName || "Your PDF"
    : "No document yet";
  documentMeta.textContent = hasDocument
    ? `${Number(status.vectorCount).toLocaleString()} indexed sections`
    : "Upload a PDF to get started";
  const welcomeTitle = document.querySelector("#welcome-title");
  const welcomeDescription = document.querySelector("#welcome-description");
  if (welcomeTitle && chatFeed.querySelector("#welcome-block")) {
    welcomeTitle.textContent = hasDocument
      ? "What would you like to know?"
      : "Your PDF has the answers.";
    welcomeDescription.textContent = hasDocument
      ? "Ask a question or choose a prompt. I’ll find the relevant parts and explain them in plain language."
      : "Upload a document and ask anything. I’ll find the relevant parts and explain them in plain language.";
  }
  updateChatControls();
}

async function loadDocumentStatus() {
  try {
    const response = await fetch(apiUrl("/api/document-status"));
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not check the document.");
    }
    setConnection(true);
    updateDocumentStatus(payload);
  } catch (error) {
    setConnection(false);
    questionInput.disabled = true;
    sendButton.disabled = true;
    showToast(error.message || "Could not connect to the backend.");
  }
}

function setUploadProgress(percent, label) {
  progressWrap.hidden = false;
  progressLabel.textContent = label;
  progressValue.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
}

function resetConversation() {
  chatFeed.innerHTML = `
    <div class="welcome-block" id="welcome-block">
      <div class="welcome-illustration" aria-hidden="true">
        <div class="illustration-orbit orbit-one"></div>
        <div class="illustration-orbit orbit-two"></div>
        <div class="illustration-paper"><span></span><span></span><span></span><b>?</b></div>
        <div class="illustration-spark spark-one">✦</div>
        <div class="illustration-spark spark-two">✧</div>
      </div>
      <p class="welcome-kicker">A little less searching, a lot more understanding</p>
      <h2 id="welcome-title">${hasDocument ? "What would you like to know?" : "Your PDF has the answers."}</h2>
      <p class="welcome-description" id="welcome-description">${hasDocument ? "Ask a question or choose a prompt. I’ll find the relevant parts and explain them in plain language." : "Upload a document and ask anything. I’ll find the relevant parts and explain them in plain language."}</p>
      <div class="suggestion-list" id="suggestion-list">
        <button class="suggestion-chip" type="button" data-question="Give me a concise summary of this document">✳ <span>Summarize this document</span><span class="chip-arrow">↗</span></button>
        <button class="suggestion-chip" type="button" data-question="What are the most important points?">✳ <span>Find the key points</span><span class="chip-arrow">↗</span></button>
        <button class="suggestion-chip" type="button" data-question="What should I know from this document?">✳ <span>What should I know?</span><span class="chip-arrow">↗</span></button>
      </div>
    </div>`;
}

function makeMessageElement(role, text) {
  const article = document.createElement("article");
  article.className = `chat-message ${role}`;
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = escapeText(text);

  if (role === "user") {
    article.append(bubble);
  } else {
    const avatar = document.createElement("span");
    avatar.className = "message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "✳";
    const content = document.createElement("div");
    content.className = "assistant-message-content";
    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = "Pagewise assistant";
    content.append(label, bubble);
    article.append(avatar, content);
  }
  return { article, bubble };
}

function appendUserMessage(text) {
  const { article } = makeMessageElement("user", text);
  chatFeed.append(article);
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

function appendAssistantMessage(text, matches = []) {
  const { article, bubble } = makeMessageElement("assistant", text);
  const content = article.querySelector(".assistant-message-content");
  if (matches.length) {
    const details = document.createElement("details");
    details.className = "source-list";
    const summary = document.createElement("summary");
    summary.textContent = `Based on ${matches.length} document section${matches.length === 1 ? "" : "s"}`;
    details.append(summary);
    matches.forEach((match, index) => {
      const source = document.createElement("div");
      source.className = "source-item";
      source.textContent = `Section ${index + 1} · ${escapeText(match.metadata?.text).slice(0, 360)}`;
      details.append(source);
    });
    content.append(details);
  }

  const tools = document.createElement("div");
  tools.className = "message-tools";
  const copyButton = document.createElement("button");
  copyButton.className = "message-tool";
  copyButton.type = "button";
  copyButton.textContent = "Copy answer";
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(bubble.textContent);
      copyButton.textContent = "Copied";
      setTimeout(() => { copyButton.textContent = "Copy answer"; }, 1500);
    } catch {
      showToast("Could not copy the answer.");
    }
  });
  tools.append(copyButton);
  content.append(tools);
  chatFeed.append(article);
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

async function askQuestion(question) {
  if (!hasDocument || isBusy || !question.trim()) return;

  const cleanedQuestion = question.trim();
  document.querySelector("#welcome-block")?.remove();
  appendUserMessage(cleanedQuestion);
  isBusy = true;
  updateChatControls();

  const pending = makeMessageElement("assistant", "");
  const content = pending.article.querySelector(".assistant-message-content");
  const label = document.createElement("span");
  label.className = "message-label";
  label.textContent = "Pagewise assistant";
  const dots = document.createElement("span");
  dots.className = "typing-dots";
  dots.setAttribute("aria-label", "Thinking");
  dots.innerHTML = "<i></i><i></i><i></i>";
  content.append(label, pending.bubble);
  pending.bubble.append(dots);
  chatFeed.append(pending.article);
  chatFeed.scrollTop = chatFeed.scrollHeight;

  try {
    const response = await fetch(apiUrl("/api/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: cleanedQuestion })
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not get an answer.");
    }

    pending.article.remove();
    appendAssistantMessage(payload.answer, payload.matches || []);
  } catch (error) {
    pending.article.remove();
    appendAssistantMessage(error.message || "Something went wrong. Please try again.");
  } finally {
    isBusy = false;
    questionInput.value = "";
    charCount.textContent = "0 / 2000";
    updateChatControls();
    questionInput.focus();
  }
}

function uploadPdf(file) {
  if (!file) return;
  const accessKey = uploadAccessKey.value.trim();
  if (!accessKey) {
    showToast("Enter the site admin upload access key first.");
    uploadAccessKey.focus();
    fileInput.value = "";
    return;
  }
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    showToast("Please choose a PDF file.");
    fileInput.value = "";
    return;
  }
  if (isBusy) {
    showToast("Please wait for the current request to finish.");
    fileInput.value = "";
    return;
  }

  dropzone.classList.add("is-disabled");
  uploadNote.textContent = "Preparing your PDF…";
  setUploadProgress(0, "Uploading PDF…");
  const formData = new FormData();
  formData.append("pdf", file);

  const request = new XMLHttpRequest();
  request.open("POST", apiUrl("/api/upload"));
  request.setRequestHeader("Authorization", `Bearer ${accessKey}`);
  request.upload.addEventListener("progress", event => {
    if (event.lengthComputable) {
      const percent = Math.round((event.loaded / event.total) * 100);
      setUploadProgress(percent, percent === 100 ? "Indexing your PDF…" : "Uploading PDF…");
    }
  });
  request.addEventListener("load", async () => {
    let payload;
    try {
      payload = JSON.parse(request.responseText);
    } catch {
      payload = { error: "The server returned an invalid response." };
    }

    if (request.status < 200 || request.status >= 300) {
      progressWrap.hidden = true;
      uploadNote.textContent = "Uploading a PDF replaces the document for everyone.";
      dropzone.classList.remove("is-disabled");
      uploadAccessKey.value = "";
      showToast(payload.error || "Could not process that PDF.");
      fileInput.value = "";
      return;
    }

    documentName.dataset.fileName = file.name;
    try {
      localStorage.setItem("pagewise-document-name", file.name);
    } catch {
      // Keep the current page usable even when storage is disabled.
    }
    documentName.textContent = file.name;
    progressWrap.hidden = true;
    uploadNote.textContent = "Your PDF is ready for everyone to use.";
    dropzone.classList.remove("is-disabled");
    uploadAccessKey.value = "";
    resetConversation();
    await loadDocumentStatus();
    showToast(`${file.name} is ready for everyone to use.`, true);
    fileInput.value = "";
  });
  request.addEventListener("error", () => {
    progressWrap.hidden = true;
    uploadNote.textContent = "Uploading a PDF replaces the document for everyone.";
    dropzone.classList.remove("is-disabled");
    uploadAccessKey.value = "";
    fileInput.value = "";
    showToast("Upload failed. Check that the backend is running and try again.");
  });
  request.send(formData);
}

fileInput.addEventListener("change", () => uploadPdf(fileInput.files?.[0]));

for (const eventName of ["dragenter", "dragover"]) {
  dropzone.addEventListener(eventName, event => {
    event.preventDefault();
    dropzone.classList.add("is-dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  dropzone.addEventListener(eventName, event => {
    event.preventDefault();
    dropzone.classList.remove("is-dragging");
  });
}
dropzone.addEventListener("drop", event => uploadPdf(event.dataTransfer?.files?.[0]));

chatForm.addEventListener("submit", event => {
  event.preventDefault();
  askQuestion(questionInput.value);
});

questionInput.addEventListener("input", () => {
  charCount.textContent = `${questionInput.value.length} / 2000`;
  questionInput.style.height = "auto";
  questionInput.style.height = `${Math.min(questionInput.scrollHeight, 120)}px`;
  updateChatControls();
});

questionInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

document.querySelector("#suggestion-list").addEventListener("click", event => {
  const button = event.target.closest("[data-question]");
  if (button && hasDocument) {
    askQuestion(button.dataset.question);
  } else if (button) {
    document.querySelector("#pdf-input").focus();
    showToast("Upload a PDF first, then ask away.");
  }
});

document.querySelector("#clear-chat").addEventListener("click", () => {
  resetConversation();
  questionInput.value = "";
  charCount.textContent = "0 / 2000";
  updateChatControls();
});

fetch(apiUrl("/api/health"))
  .then(response => {
    if (!response.ok) throw new Error("Backend is not responding.");
    setConnection(true);
  })
  .catch(() => setConnection(false));

loadDocumentStatus();
