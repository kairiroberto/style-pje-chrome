function getData() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ rules: [], defaultColor: "#7f8c8d" }, resolve);
  });
}

function setData(data) {
  return new Promise((resolve) => chrome.storage.sync.set(data, resolve));
}

async function addRule() {
  const type = document.getElementById("type").value;
  const mode = document.getElementById("mode").value;
  const pattern = document.getElementById("pattern").value.trim();
  const color = document.getElementById("color").value;
  const poloEl = document.getElementById("polo");
  const polo = (type === "partes") ? (poloEl?.value || "ambos") : null;

  if (!pattern) return;

  const data = await getData();
  const rule = { type, mode, pattern, color };
  if (polo) rule.polo = polo;

  data.rules.unshift(rule);
  await setData(data);

  document.getElementById("pattern").value = "";
}

async function applyNow() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "REAPPLY" });
}

document.getElementById("add").addEventListener("click", addRule);
document.getElementById("applyNow").addEventListener("click", applyNow);
document.getElementById("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());

