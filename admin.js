const loginPanel = document.querySelector("#loginPanel");
const dashboardPanel = document.querySelector("#dashboardPanel");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const productForm = document.querySelector("#productForm");
const adminProducts = document.querySelector("#adminProducts");
const clearForm = document.querySelector("#clearForm");
const logoutButton = document.querySelector("#logoutButton");

function showDashboard() {
  loginPanel.classList.add("hidden");
  dashboardPanel.classList.remove("hidden");
  logoutButton.classList.remove("hidden");
  renderAdminProducts();
}

function showLogin() {
  dashboardPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  logoutButton.classList.add("hidden");
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

function storagePath(file) {
  const extension = file.type === "image/png" ? "png" : "webp";
  return `catalogo/${Date.now()}-${crypto.randomUUID()}.${extension}`;
}

function imageToBitmap(file) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file);
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

async function compressImage(file, targetWidth = 1000, targetHeight = 1250, quality = 0.84) {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen.");
  }

  const bitmap = await imageToBitmap(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const scale = Math.min(
    targetWidth / bitmap.width,
    targetHeight / bitmap.height,
    1
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const x = Math.round((targetWidth - width) / 2);
  const y = Math.round((targetHeight - height) / 2);

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  context.fillStyle = "#fffdf9";
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(bitmap, x, y, width, height);

  const mimeType = "image/webp";

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No se pudo comprimir la imagen."));
        return;
      }

      resolve(new File([blob], file.name, { type: mimeType }));
    }, mimeType, quality);
  });
}

async function uploadProductImage(file) {
  const compressedFile = await compressImage(file);
  const path = storagePath(compressedFile);
  const { error } = await supabaseClient.storage
    .from(PRODUCTS_BUCKET)
    .upload(path, compressedFile, {
      contentType: compressedFile.type,
      cacheControl: "3600",
      upsert: false
    });

  if (error) {
    throw new Error(`No se pudo subir la foto: ${error.message}`);
  }

  const { data } = supabaseClient.storage
    .from(PRODUCTS_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

async function renderAdminProducts() {
  adminProducts.innerHTML = '<div class="empty-state">Cargando productos...</div>';

  try {
    const products = await fetchProducts({ includeUnavailable: true });

    if (!products.length) {
      adminProducts.innerHTML = '<div class="empty-state">No hay productos cargados.</div>';
      return;
    }

    adminProducts.innerHTML = products.map((product) => `
      <article class="admin-row">
        <img src="${product.image}" alt="${product.name}">
        <div>
          <h3>${product.name}</h3>
          <p>${product.price} · ${product.available ? "Disponible" : "No disponible"}</p>
        </div>
        <div class="row-actions">
          <button type="button" data-edit="${product.id}">Editar</button>
          <button type="button" data-delete="${product.id}">Eliminar</button>
        </div>
      </article>
    `).join("");
  } catch (error) {
    adminProducts.innerHTML = `<div class="empty-state">No se pudieron cargar productos: ${error.message}</div>`;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "Entrando...";

  const email = document.querySelector("#adminEmail").value;
  const password = document.querySelector("#adminPassword").value;
  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginMessage.textContent = error.message;
    return;
  }

  loginMessage.textContent = "";
  showDashboard();
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fields = productFields();
  const editingId = fields.id.value;

  try {
    const uploadedImage = fields.image.files[0]
      ? await uploadProductImage(fields.image.files[0])
      : "";

    const payload = {
      name: fields.name.value.trim(),
      category: fields.type.value.trim(),
      price: Number(fields.price.value.replace(/[^0-9.]/g, "")),
      description: fields.description.value.trim(),
      available: fields.available.value === "true"
    };

    if (uploadedImage) {
      payload.image_url = uploadedImage;
    }

    const request = editingId
      ? supabaseClient.from("products").update(payload).eq("id", editingId)
      : supabaseClient.from("products").insert(payload);

    const { error } = await request;
    if (error) {
      throw new Error(`No se pudo guardar el producto: ${error.message}`);
    }

    resetForm();
    renderAdminProducts();
  } catch (error) {
    alert(error.message);
  }
});

adminProducts.addEventListener("click", async (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;

  if (editId) {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("id", editId)
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    const fields = productFields();
    fields.id.value = data.id;
    fields.name.value = data.name;
    fields.type.value = data.category || "";
    fields.price.value = data.price;
    fields.description.value = data.description || "";
    fields.available.value = String(data.available);
  }

  if (deleteId) {
    const { error } = await supabaseClient
      .from("products")
      .delete()
      .eq("id", deleteId);

    if (error) {
      alert(error.message);
      return;
    }

    renderAdminProducts();
  }
});

clearForm.addEventListener("click", resetForm);

logoutButton.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  resetForm();
  showLogin();
});

supabaseClient.auth.getSession().then(({ data }) => {
  if (data.session) {
    showDashboard();
  }
});
