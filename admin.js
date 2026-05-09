const loginPanel = document.querySelector("#loginPanel");
const dashboardPanel = document.querySelector("#dashboardPanel");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const productForm = document.querySelector("#productForm");
const adminProducts = document.querySelector("#adminProducts");
const clearForm = document.querySelector("#clearForm");
const logoutButton = document.querySelector("#logoutButton");
const saleForm = document.querySelector("#saleForm");
const saleProduct = document.querySelector("#saleProduct");
const saleUnitPrice = document.querySelector("#saleUnitPrice");
const saleDate = document.querySelector("#saleDate");
const insightsGrid = document.querySelector("#insightsGrid");
const categoryBreakdown = document.querySelector("#categoryBreakdown");
const topProducts = document.querySelector("#topProducts");
const salesHistory = document.querySelector("#salesHistory");
let adminProductCache = [];

function showDashboard() {
  loginPanel.classList.add("hidden");
  dashboardPanel.classList.remove("hidden");
  logoutButton.classList.remove("hidden");
  saleDate.valueAsDate = new Date();
  loadDashboardData();
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
    stock: document.querySelector("#productStock"),
    description: document.querySelector("#productDescription"),
    available: document.querySelector("#productAvailable")
  };
}

function moneyValue(value) {
  return Number(String(value || "").replace(/[^0-9.]/g, "")) || 0;
}

function percentValue(value, total) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function saleTotal(sale) {
  return Number(sale.total || 0);
}

function categoryOptionValue(value) {
  const categories = {
    set: "Set",
    aretes: "Aretes",
    brazaletes: "Brazaletes",
    collares: "Collares",
    anillos: "Anillos"
  };

  return categories[normalizeCategory(value)] || "Set";
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
    adminProductCache = products;
    renderSaleProductOptions(products);

    if (!products.length) {
      adminProducts.innerHTML = '<div class="empty-state">No hay productos cargados.</div>';
      return;
    }

    adminProducts.innerHTML = products.map((product) => `
      <article class="admin-row">
        <img src="${product.image}" alt="${product.name}">
        <div>
          <h3>${product.name}</h3>
          <p>${product.price} · Stock: ${product.stock} · ${product.available ? "Disponible" : "No disponible"}</p>
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

function renderSaleProductOptions(products) {
  if (!saleProduct) return;

  if (!products.length) {
    saleProduct.innerHTML = '<option value="">No hay productos</option>';
    saleProduct.disabled = true;
    return;
  }

  saleProduct.disabled = false;
  saleProduct.innerHTML = products.map((product) => `
    <option value="${product.id}" data-price="${product.rawPrice}" data-stock="${product.stock}">
      ${product.name} · ${product.price} · Stock ${product.stock}
    </option>
  `).join("");

  updateSalePrice();
}

function updateSalePrice() {
  const option = saleProduct?.selectedOptions?.[0];
  if (!option || !saleUnitPrice) return;
  saleUnitPrice.value = option.dataset.price || "";
  document.querySelector("#saleQuantity").max = option.dataset.stock || "";
}

async function fetchSales() {
  const { data, error } = await supabaseClient
    .from("sales")
    .select("*, products(name, category, image_url)")
    .order("sold_at", { ascending: false });

  if (error) {
    const missingSalesTable = error.message?.includes("public.sales") || error.code === "PGRST205";
    if (missingSalesTable) return [];
    throw error;
  }

  return data || [];
}

async function loadDashboardData() {
  try {
    await renderAdminProducts();
  } finally {
    await renderSalesAnalytics();
  }
}

async function renderSalesAnalytics() {
  if (!insightsGrid || !categoryBreakdown || !topProducts || !salesHistory) return;

  insightsGrid.innerHTML = '<div class="empty-state">Cargando metricas...</div>';
  categoryBreakdown.innerHTML = "";
  topProducts.innerHTML = "";
  salesHistory.innerHTML = "";

  try {
    const sales = await fetchSales();
    const totalRevenue = sales.reduce((sum, sale) => sum + saleTotal(sale), 0);
    const totalUnits = sales.reduce((sum, sale) => sum + Number(sale.quantity || 0), 0);
    const totalOrders = sales.length;
    const avgTicket = totalOrders ? totalRevenue / totalOrders : 0;
    const activeProducts = adminProductCache.filter((product) => product.available).length;
    const sellThrough = percentValue(totalUnits, totalUnits + activeProducts);
    const productStats = new Map();
    const categoryStats = new Map();

    sales.forEach((sale) => {
      const productName = sale.products?.name || "Producto eliminado";
      const category = sale.products?.category || "Sin categoria";
      const units = Number(sale.quantity || 0);
      const revenue = saleTotal(sale);
      const currentProduct = productStats.get(productName) || { units: 0, revenue: 0 };
      const currentCategory = categoryStats.get(category) || { units: 0, revenue: 0 };

      productStats.set(productName, {
        units: currentProduct.units + units,
        revenue: currentProduct.revenue + revenue
      });

      categoryStats.set(category, {
        units: currentCategory.units + units,
        revenue: currentCategory.revenue + revenue
      });
    });

    const topProduct = [...productStats.entries()]
      .sort((a, b) => b[1].units - a[1].units)[0];

    insightsGrid.innerHTML = `
      <article class="metric-card">
        <span>Ventas totales</span>
        <strong>${formatPrice(totalRevenue)}</strong>
        <p>${totalOrders} ordenes registradas</p>
      </article>
      <article class="metric-card">
        <span>Unidades vendidas</span>
        <strong>${totalUnits}</strong>
        <p>${sellThrough} frente a inventario activo</p>
      </article>
      <article class="metric-card">
        <span>Ticket promedio</span>
        <strong>${formatPrice(avgTicket)}</strong>
        <p>Promedio por venta registrada</p>
      </article>
      <article class="metric-card">
        <span>Producto lider</span>
        <strong>${topProduct?.[0] || "Sin ventas"}</strong>
        <p>${topProduct ? `${topProduct[1].units} unidades vendidas` : "Registra ventas para calcularlo"}</p>
      </article>
    `;

    categoryBreakdown.innerHTML = [...categoryStats.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([category, stats]) => `
        <div class="progress-row">
          <div><strong>${category}</strong><span>${stats.units} uds · ${formatPrice(stats.revenue)}</span></div>
          <meter min="0" max="${totalRevenue || 1}" value="${stats.revenue}"></meter>
          <em>${percentValue(stats.revenue, totalRevenue)}</em>
        </div>
      `).join("") || '<div class="empty-state">Aun no hay ventas por categoria.</div>';

    topProducts.innerHTML = [...productStats.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([name, stats], index) => `
        <div class="rank-row">
          <span>${index + 1}</span>
          <div><strong>${name}</strong><p>${stats.units} uds · ${formatPrice(stats.revenue)} · ${percentValue(stats.revenue, totalRevenue)}</p></div>
        </div>
      `).join("") || '<div class="empty-state">Aun no hay productos vendidos.</div>';

    salesHistory.innerHTML = sales.slice(0, 8).map((sale) => `
      <article class="admin-row">
        <img src="${sale.products?.image_url || "cover-clementine.png"}" alt="${sale.products?.name || "Producto"}">
        <div>
          <h3>${sale.products?.name || "Producto eliminado"}</h3>
          <p>${sale.quantity} uds · ${formatPrice(saleTotal(sale))} · ${sale.channel || "Sin canal"} · ${new Date(sale.sold_at).toLocaleDateString("es-US")}</p>
        </div>
        <div class="row-actions">
          <button type="button" data-sale-delete="${sale.id}">Eliminar</button>
        </div>
      </article>
    `).join("") || '<div class="empty-state">Aun no hay ventas registradas.</div>';
  } catch (error) {
    insightsGrid.innerHTML = `<div class="empty-state">No se pudieron cargar insights: ${error.message}</div>`;
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
      stock: Number(fields.stock.value || 0),
      description: fields.description.value.trim(),
      available: fields.available.value === "true" && Number(fields.stock.value || 0) > 0
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
    loadDashboardData();
  } catch (error) {
    alert(error.message);
  }
});

saleProduct?.addEventListener("change", updateSalePrice);

saleForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const quantity = Number(document.querySelector("#saleQuantity").value || 1);
  const unitPrice = moneyValue(saleUnitPrice.value);
  const selectedProduct = adminProductCache.find((product) => product.id === saleProduct.value);

  if (!selectedProduct) {
    alert("Selecciona un producto valido para registrar la venta.");
    return;
  }

  if (selectedProduct && quantity > selectedProduct.stock) {
    alert(`No hay suficiente inventario. Stock disponible: ${selectedProduct.stock}`);
    return;
  }

  const payload = {
    product_id: saleProduct.value,
    quantity,
    unit_price: unitPrice,
    total: quantity * unitPrice,
    channel: document.querySelector("#saleChannel").value,
    notes: document.querySelector("#saleNotes").value.trim(),
    sold_at: new Date(`${saleDate.value}T12:00:00`).toISOString()
  };

  const { error } = await supabaseClient.from("sales").insert(payload);
  if (error) {
    alert(`No se pudo registrar la venta: ${error.message}`);
    return;
  }

  if (selectedProduct) {
    const nextStock = Math.max(0, selectedProduct.stock - quantity);
    const { error: stockError } = await supabaseClient
      .from("products")
      .update({
        stock: nextStock,
        available: nextStock > 0
      })
      .eq("id", selectedProduct.id);

    if (stockError) {
      alert(`La venta se registro, pero no se pudo actualizar inventario: ${stockError.message}`);
    }
  }

  saleForm.reset();
  saleDate.valueAsDate = new Date();
  updateSalePrice();
  loadDashboardData();
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
    fields.type.value = categoryOptionValue(data.category);
    fields.price.value = data.price;
    fields.stock.value = data.stock || 0;
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

    loadDashboardData();
  }
});

salesHistory?.addEventListener("click", async (event) => {
  const saleDeleteId = event.target.dataset.saleDelete;
  if (!saleDeleteId) return;

  const { error } = await supabaseClient
    .from("sales")
    .delete()
    .eq("id", saleDeleteId);

  if (error) {
    alert(error.message);
    return;
  }

  renderSalesAnalytics();
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
