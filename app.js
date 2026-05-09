const SUPABASE_URL = "https://zczxkmkhluxaiijsndgx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjenhrbWtobHV4YWlpanNuZGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjI1OTksImV4cCI6MjA5MzMzODU5OX0.oifEHf3PMDtfbIAjJzjw5ZLWKFV1H4c-EoRvm_c6Ka4";
const WHATSAPP_NUMBER = "17869915310";
const PRODUCTS_BUCKET = "products";

const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let catalogProducts = [];
let currentCatalogPage = 1;

function normalizeCategory(value) {
  const key = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const aliases = {
    sets: "set",
    arete: "aretes",
    earrings: "aretes",
    earring: "aretes",
    brazalete: "brazaletes",
    bracelet: "brazaletes",
    bracelets: "brazaletes",
    collar: "collares",
    necklace: "collares",
    necklaces: "collares",
    anillo: "anillos",
    ring: "anillos",
    rings: "anillos"
  };

  return aliases[key] || key;
}

function formatPrice(value) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return value || "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(numberValue);
}

function normalizeProduct(product) {
  return {
    id: product.id,
    name: product.name,
    type: product.category || "Coleccion",
    price: formatPrice(product.price),
    rawPrice: product.price,
    stock: Number(product.stock || 0),
    description: product.description || "",
    image: product.image_url || "cover-clementine.png",
    available: Boolean(product.available)
  };
}

async function fetchProducts({ includeUnavailable = false } = {}) {
  if (!supabaseClient) return [];

  let query = supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (!includeUnavailable) {
    query = query.eq("available", true);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data.map(normalizeProduct);
}

function whatsappUrl(product) {
  const lines = [
    "Hola, quiero comprar este producto de Clementine Collection:",
    "",
    `Producto: ${product.name}`,
    `Precio: ${product.price}`,
    `Disponibilidad: ${product.available ? "Disponible" : "No disponible"}`,
    `Descripcion: ${product.description}`,
    product.image ? `Foto: ${product.image}` : ""
  ].filter(Boolean);

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function productCard(product) {
  return `
    <article class="product-card">
      <div class="product-image">
        <button class="product-image-button" type="button" data-image="${product.image}" data-name="${product.name}" aria-label="Ver imagen grande de ${product.name}">
          <img src="${product.image}" alt="${product.name}" loading="lazy" decoding="async">
        </button>
        <span class="status-pill ${product.available ? "" : "unavailable"}">
          ${product.available ? "Disponible" : "Agotado"}
        </span>
      </div>
      <div class="product-info">
        <p class="product-type">${product.type}</p>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-footer">
          <span class="price">${product.price}</span>
          <a class="buy-button" href="${product.available ? whatsappUrl(product) : "#"}" target="_blank" rel="noreferrer" aria-disabled="${product.available ? "false" : "true"}">
            ${product.available ? "Comprar" : "No disponible"}
          </a>
        </div>
      </div>
    </article>
  `;
}

function catalogColumns() {
  if (window.matchMedia("(max-width: 640px)").matches) return 1;
  if (window.matchMedia("(max-width: 980px)").matches) return 2;
  return 3;
}

function productsPerPage() {
  return catalogColumns() * 5;
}

function renderProductList(products, selectedCategory = "all") {
  const grid = document.querySelector("#catalogGrid");
  const pagination = document.querySelector("#catalogPagination");
  if (!grid) return;

  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter((product) => normalizeCategory(product.type) === selectedCategory);

  if (!filteredProducts.length) {
    grid.innerHTML = '<div class="empty-state">No hay productos disponibles en esta categoria.</div>';
    if (pagination) pagination.innerHTML = "";
    return;
  }

  const perPage = productsPerPage();
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage));
  currentCatalogPage = Math.min(currentCatalogPage, totalPages);

  const start = (currentCatalogPage - 1) * perPage;
  const visibleProducts = filteredProducts.slice(start, start + perPage);

  grid.innerHTML = visibleProducts.map(productCard).join("");
  renderPagination(totalPages, filteredProducts.length, selectedCategory);
}

function renderPagination(totalPages, totalProducts, selectedCategory) {
  const pagination = document.querySelector("#catalogPagination");
  if (!pagination) return;

  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  pagination.innerHTML = `
    <button type="button" data-page-action="prev" ${currentCatalogPage === 1 ? "disabled" : ""}>Anterior</button>
    <span>Pagina ${currentCatalogPage} de ${totalPages} · ${totalProducts} piezas</span>
    <button type="button" data-page-action="next" ${currentCatalogPage === totalPages ? "disabled" : ""}>Siguiente</button>
  `;
  pagination.dataset.category = selectedCategory;
}

async function renderCatalog() {
  const grid = document.querySelector("#catalogGrid");
  const generalWhatsapp = document.querySelector("#generalWhatsapp");
  const categoryFilter = document.querySelector("#categoryFilter");

  if (generalWhatsapp) {
    generalWhatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola, quiero informacion sobre Clementine Collection.")}`;
  }

  if (!grid) return;

  grid.innerHTML = '<div class="empty-state">Cargando catalogo...</div>';

  try {
    catalogProducts = await fetchProducts();
    if (!catalogProducts.length) {
      grid.innerHTML = '<div class="empty-state">Aun no hay productos disponibles en el catalogo.</div>';
      return;
    }

    renderProductList(catalogProducts, categoryFilter?.value || "all");
  } catch (error) {
    grid.innerHTML = `<div class="empty-state">No se pudo cargar el catalogo: ${error.message}</div>`;
  }
}

renderCatalog();

document.querySelector("#categoryFilter")?.addEventListener("change", (event) => {
  currentCatalogPage = 1;
  renderProductList(catalogProducts, event.target.value);
});

document.querySelector("#catalogPagination")?.addEventListener("click", (event) => {
  const action = event.target.dataset.pageAction;
  if (!action) return;

  currentCatalogPage += action === "next" ? 1 : -1;
  renderProductList(catalogProducts, event.currentTarget.dataset.category || "all");
  document.querySelector("#catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

window.addEventListener("resize", () => {
  const categoryFilter = document.querySelector("#categoryFilter");
  currentCatalogPage = 1;
  renderProductList(catalogProducts, categoryFilter?.value || "all");
});

document.addEventListener("click", (event) => {
  const imageButton = event.target.closest(".product-image-button");
  const modal = document.querySelector("#imageModal");
  const modalPhoto = document.querySelector("#imageModalPhoto");
  const modalCaption = document.querySelector("#imageModalCaption");

  if (imageButton && modal && modalPhoto && modalCaption) {
    modalPhoto.src = imageButton.dataset.image;
    modalPhoto.alt = imageButton.dataset.name;
    modalCaption.textContent = imageButton.dataset.name;
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
  }

  if (event.target.id === "imageModal" || event.target.id === "imageModalClose") {
    closeImageModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeImageModal();
  }
});

function closeImageModal() {
  const modal = document.querySelector("#imageModal");
  const modalPhoto = document.querySelector("#imageModalPhoto");
  if (!modal) return;

  modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  if (modalPhoto) {
    modalPhoto.src = "";
  }
}
