const STORE_KEY = "clementineProducts";
const WHATSAPP_NUMBER = "17869915310";

const starterProducts = [
  {
    id: "golden-drop-set",
    name: "Set Gota Dorada",
    type: "Coleccion Essencia",
    price: "$48.00",
    description: "Piezas de brillo organico con acabado dorado, pensadas para destacar con elegancia suave.",
    image: "cover-clementine.png",
    available: true
  },
  {
    id: "anillo-luz",
    name: "Anillo Luz",
    type: "Anillos",
    price: "$22.00",
    description: "Anillo minimalista de silueta pulida, ideal para llevar solo o combinar con otras piezas.",
    image: "cover-clementine.png",
    available: true
  },
  {
    id: "collar-essencia",
    name: "Collar Essencia",
    type: "Collares",
    price: "$36.00",
    description: "Collar delicado con dije fluido, una pieza femenina para acompanar looks diarios y ocasiones especiales.",
    image: "cover-clementine.png",
    available: false
  }
];

function readProducts() {
  const saved = localStorage.getItem(STORE_KEY);
  if (!saved) {
    localStorage.setItem(STORE_KEY, JSON.stringify(starterProducts));
    return starterProducts;
  }

  try {
    return JSON.parse(saved);
  } catch {
    localStorage.setItem(STORE_KEY, JSON.stringify(starterProducts));
    return starterProducts;
  }
}

function saveProducts(products) {
  localStorage.setItem(STORE_KEY, JSON.stringify(products));
}

function whatsappUrl(product) {
  const lines = [
    "Hola, quiero comprar este producto de Clementine Collection:",
    "",
    `Producto: ${product.name}`,
    `Precio: ${product.price}`,
    `Disponibilidad: ${product.available ? "Disponible" : "No disponible"}`,
    `Descripcion: ${product.description}`
  ];
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function renderCatalog() {
  const grid = document.querySelector("#catalogGrid");
  const generalWhatsapp = document.querySelector("#generalWhatsapp");
  if (!grid) return;

  const products = readProducts();
  grid.innerHTML = "";

  if (!products.length) {
    grid.innerHTML = '<div class="empty-state">Aun no hay productos en el catalogo.</div>';
    return;
  }

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-image">
        <img src="${product.image}" alt="${product.name}">
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
    `;
    grid.appendChild(card);
  });

  if (generalWhatsapp) {
    generalWhatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola, quiero informacion sobre Clementine Collection.")}`;
  }
}

renderCatalog();
