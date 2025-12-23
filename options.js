const tbody = document.getElementById("tbody");

function getData() {
  return new Promise((resolve) => chrome.storage.sync.get({ rules: [], defaultColor: "#7f8c8d" }, resolve));
}
function setData(data) {
  return new Promise((resolve) => chrome.storage.sync.set(data, resolve));
}

function td(text) {
  const c = document.createElement("td");
  c.textContent = text;
  return c;
}

async function render() {
  const data = await getData();
  document.getElementById("defaultColor").value = data.defaultColor || "#7f8c8d";
  tbody.innerHTML = "";

  data.rules.forEach((r, idx) => {
    const tr = document.createElement("tr");
    tr.appendChild(td(r.type));
    tr.appendChild(td(r.mode));
    tr.appendChild(td(r.pattern));

    const colorTd = document.createElement("td");
    const input = document.createElement("input");
    input.type = "color";
    input.value = r.color || "#999999";
    input.addEventListener("change", async () => {
      const d = await getData();
      d.rules[idx].color = input.value;
      await setData(d);
    });
    colorTd.appendChild(input);
    tr.appendChild(colorTd);

    const act = document.createElement("td");
    const del = document.createElement("button");
    del.textContent = "Excluir";
    del.addEventListener("click", async () => {
      const d = await getData();
      d.rules.splice(idx, 1);
      await setData(d);
      render();
    });
    act.appendChild(del);
    tr.appendChild(act);

    tbody.appendChild(tr);
  });
}

document.getElementById("saveDefault").addEventListener("click", async () => {
  const d = await getData();
  d.defaultColor = document.getElementById("defaultColor").value;
  await setData(d);
  render();
});

render();

