const ADMIN_PASSWORD = "clementine2026";

const loginPanel = document.querySelector("#loginPanel");
const dashboardPanel = document.querySelector("#dashboardPanel");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const productForm = document.querySelector("#productForm");
const adminProducts = document.querySelector("#adminProducts");
const clearForm = document.querySelector("#clearForm");

function showDashboard() {
  loginPanel.classList.add("hidden");
  dashboardPanel.classList.remove("hidden");
  renderAdminProducts();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resetForm() {
  productForm.reset();
  document.querySelector("#productId").value = "";
}

function productFields() {
  return {
    id: document.querySelector("#productId"),
    image: document.querySelector("#productImage"),
    name: document.querySelector("#productName"),
    type: document.querySelector("#productType"),
    price: document.querySelector("#productPrice"),
    description: document.querySelector("#productDescription"),
    available: document.querySelector("#productAvailable")
  };
}

function renderAdminProducts() {
  const products = readProducts();
  adminProducts.innerHTML = "";

  if (!products.length) {
    adminProducts.innerHTML = '<div class="empty-state">No hay productos cargados.</div>';
    return;
  }

  products.forEach((product) => {
    const row = document.createElement("article");
    row.className = "admin-row";
    row.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <div>
        <h3>${product.name}</h3>
        <p>${product.price} · ${product.available ? "Disponible" : "No disponible"}</p>
      </div>
      <div class="row-actions">
        <button type="button" data-edit="${product.id}">Editar</button>
        <button type="button" data-delete="${product.id}">Eliminar</button>
      </div>
    `;
    adminProducts.appendChild(row);
  });
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = document.querySelector("#adminPassword").value;

  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem("clementineAdmin", "true");
    showDashboard();
    return;
  }

  loginMessage.textContent = "Clave incorrecta.";
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fields = productFields();
  const products = readProducts();
  const editingId = fields.id.value;
  const currentProduct = products.find((product) => product.id === editingId);
  const uploadedImage = fields.image.files[0] ? await fileToDataUrl(fields.image.files[0]) : "";

  const product = {
    id: editingId || `product-${Date.now()}`,
    name: fields.name.value.trim(),
    type: fields.type.value.trim(),
    price: fields.price.value.trim(),
    description: fields.description.value.trim(),
    image: uploadedImage || currentProduct?.image || "cover-clementine.png",
    available: fields.available.value === "true"
  };

  const nextProducts = editingId
    ? products.map((item) => (item.id === editingId ? product : item))
    : [product, ...products];

  saveProducts(nextProducts);
  resetForm();
  renderAdminProducts();
});

adminProducts.addEventListener("click", (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;

  if (editId) {
    const product = readProducts().find((item) => item.id === editId);
    if (!product) return;

    const fields = productFields();
    fields.id.value = product.id;
    fields.name.value = product.name;
    fields.type.value = product.type;
    fields.price.value = product.price;
    fields.description.value = product.description;
    fields.available.value = String(product.available);
  }

  if (deleteId) {
    saveProducts(readProducts().filter((item) => item.id !== deleteId));
    renderAdminProducts();
  }
});

clearForm.addEventListener("click", resetForm);

if (sessionStorage.getItem("clementineAdmin") === "true") {
  showDashboard();
}
