const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".site-header .nav-links");

if (menuToggle && navLinks) {
  const closeMenu = () => {
    navLinks.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    menuToggle.textContent = "☰";
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    menuToggle.textContent = isOpen ? "✕" : "☰";
  });

  navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

const yearElement = document.querySelector("#year");
if (yearElement) yearElement.textContent = new Date().getFullYear();

if (window.lucide) window.lucide.createIcons();

const contactForm = document.querySelector("#contact-form");
if (contactForm) {
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const formNote = contactForm.querySelector("#form-note");
  const buttonLabel = submitButton.innerHTML;

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    formNote.textContent = "Sending your message...";

    fetch("https://formsubmit.co/ajax/nernst546@gmail.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(Object.fromEntries(new FormData(contactForm))),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || result.success === false || result.success === "false") {
          throw new Error(result.message || "Your message could not be sent.");
        }

        formNote.textContent = "Thanks. Your message has been sent successfully.";
        contactForm.reset();
      })
      .catch(() => {
        formNote.textContent = "We couldn't send your message right now. Please try again or email nernst546@gmail.com.";
      })
      .finally(() => {
        submitButton.disabled = false;
        submitButton.innerHTML = buttonLabel;
      });
  });
}

const productGrid = document.querySelector("#product-grid");
const orderForm = document.querySelector("#order-form");

if (productGrid && orderForm) {
  const products = Array.from(productGrid.querySelectorAll(".store-product"));
  const basketItems = document.querySelector("#basket-items");
  const basketCount = document.querySelector("#basket-count");
  const productSearch = document.querySelector("#product-search");
  const productSort = document.querySelector("#product-sort");
  const resultCount = document.querySelector("#product-result-count");
  const emptyMessage = document.querySelector("#product-empty");
  const checkoutButton = document.querySelector("#checkout-button");
  const orderStatus = document.querySelector("#order-status");
  const paymentMethod = document.querySelector("#payment-method");
  const paymentMethodNote = document.querySelector("#payment-method-note");
  const wishlistCount = document.querySelector("#wishlist-count");
  const wishlistStatus = document.querySelector("#wishlist-status");
  const quickViewDialog = document.querySelector("#product-quick-view");
  const quickViewImage = document.querySelector("#quick-view-image");
  const quickViewCategory = document.querySelector("#quick-view-category");
  const quickViewTitle = document.querySelector("#quick-view-title");
  const quickViewDescription = document.querySelector("#quick-view-description");
  const quickViewAdd = document.querySelector("#quick-view-add");
  const basket = new Map();
  const originalOrder = new Map(products.map((product, index) => [product, index]));
  const savedProducts = new Set();
  let activeCategory = "all";
  let quickViewProduct = null;
  let paymentPending = false;

  try {
    const storedProducts = JSON.parse(localStorage.getItem("nernstechhub-wishlist") || "[]");
    if (Array.isArray(storedProducts)) {
      const availableNames = new Set(products.map((product) => product.dataset.name));
      storedProducts
        .filter((name) => typeof name === "string" && availableNames.has(name))
        .forEach((name) => savedProducts.add(name));
    }
  } catch {
    wishlistStatus.textContent = "Your saved products could not be loaded from this browser.";
  }

  const updateWishlist = () => {
    products.forEach((product) => {
      const isSaved = savedProducts.has(product.dataset.name);
      const saveButton = product.querySelector("[data-toggle-wishlist]");
      saveButton.textContent = isSaved ? "♥ Saved" : "♡ Save";
      saveButton.setAttribute("aria-pressed", String(isSaved));
      saveButton.setAttribute("aria-label", `${isSaved ? "Remove" : "Save"} ${product.dataset.name} ${isSaved ? "from" : "to"} wishlist`);
    });
    wishlistCount.textContent = String(savedProducts.size);
    wishlistCount.setAttribute("aria-label", `${savedProducts.size} saved products`);
  };

  const updateProducts = () => {
    const query = productSearch.value.trim().toLowerCase();
    let visibleCount = 0;

    products.forEach((product) => {
      const matchesCategory = activeCategory === "all"
        || (activeCategory === "saved" ? savedProducts.has(product.dataset.name) : product.dataset.category === activeCategory);
      const searchableText = `${product.dataset.name} ${product.dataset.keywords}`.toLowerCase();
      const matchesSearch = searchableText.includes(query);
      const isVisible = matchesCategory && matchesSearch;
      product.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    resultCount.textContent = `${visibleCount} ${visibleCount === 1 ? "product" : "product categories"}`;
    emptyMessage.hidden = visibleCount > 0;
  };

  const addProductToBasket = (product) => {
    const name = product.dataset.name;
    basket.set(name, (basket.get(name) || 0) + 1);
    updateBasket();
    orderStatus.textContent = `${name} added to your basket.`;
  };

  products.forEach((product) => {
    const info = product.querySelector(".store-product-info");
    const actions = document.createElement("div");
    actions.className = "store-product-actions";

    const quickViewButton = document.createElement("button");
    quickViewButton.type = "button";
    quickViewButton.className = "store-quick-button";
    quickViewButton.dataset.quickView = "";
    quickViewButton.textContent = "Quick view";
    quickViewButton.setAttribute("aria-label", `Quick view ${product.dataset.name}`);

    const wishlistButton = document.createElement("button");
    wishlistButton.type = "button";
    wishlistButton.className = "store-wishlist-button";
    wishlistButton.dataset.toggleWishlist = "";

    actions.append(quickViewButton, wishlistButton);
    info.querySelector("[data-add-product]").before(actions);
  });

  const updateBasket = () => {
    const entries = Array.from(basket.entries());
    const totalQuantity = entries.reduce((total, [, quantity]) => total + quantity, 0);
    basketCount.textContent = String(totalQuantity);
    basketCount.setAttribute("aria-label", `${totalQuantity} ${totalQuantity === 1 ? "item" : "items"}`);
    checkoutButton.disabled = totalQuantity === 0 || paymentPending;
    basketItems.replaceChildren();

    if (entries.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "store-basket-empty";
      emptyItem.textContent = "Your basket is empty. Add a product to get started.";
      basketItems.append(emptyItem);
      return;
    }

    entries.forEach(([name, quantity]) => {
      const item = document.createElement("li");
      item.className = "store-basket-item";

      const label = document.createElement("span");
      label.className = "store-basket-item-name";
      label.textContent = name;

      const actions = document.createElement("span");
      actions.className = "store-basket-actions";

      const decrease = document.createElement("button");
      decrease.type = "button";
      decrease.dataset.basketAction = "decrease";
      decrease.dataset.product = name;
      decrease.setAttribute("aria-label", `Remove one ${name}`);
      decrease.textContent = "−";

      const quantityLabel = document.createElement("span");
      quantityLabel.className = "store-basket-quantity";
      quantityLabel.textContent = String(quantity);
      quantityLabel.setAttribute("aria-label", `Quantity ${quantity}`);

      const increase = document.createElement("button");
      increase.type = "button";
      increase.dataset.basketAction = "increase";
      increase.dataset.product = name;
      increase.setAttribute("aria-label", `Add one ${name}`);
      increase.textContent = "+";

      actions.append(decrease, quantityLabel, increase);
      item.append(label, actions);
      basketItems.append(item);
    });
  };

  document.querySelectorAll(".store-filter").forEach((filter) => {
    filter.addEventListener("click", () => {
      activeCategory = filter.dataset.category;
      document.querySelectorAll(".store-filter").forEach((button) => {
        const isActive = button === filter;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
      updateProducts();
      productGrid.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  productSearch.addEventListener("input", updateProducts);

  productGrid.addEventListener("click", (event) => {
    const product = event.target.closest(".store-product");
    if (!product) return;

    if (event.target.closest("[data-add-product]")) {
      addProductToBasket(product);
      return;
    }

    if (event.target.closest("[data-toggle-wishlist]")) {
      const name = product.dataset.name;
      if (savedProducts.has(name)) {
        savedProducts.delete(name);
      } else {
        savedProducts.add(name);
      }

      try {
        localStorage.setItem("nernstechhub-wishlist", JSON.stringify(Array.from(savedProducts)));
        wishlistStatus.textContent = "";
      } catch {
        wishlistStatus.textContent = "Wishlist changes are only saved for this visit because browser storage is unavailable.";
      }
      updateWishlist();
      updateProducts();
      return;
    }

    if (event.target.closest("[data-quick-view]")) {
      quickViewProduct = product;
      quickViewImage.src = product.querySelector(".store-product-art img").src;
      quickViewImage.alt = product.querySelector(".store-product-art img").alt;
      quickViewCategory.textContent = product.dataset.category;
      quickViewTitle.textContent = product.querySelector("h3").textContent;
      quickViewDescription.textContent = product.querySelector(".store-product-info p").textContent;
      quickViewDialog.showModal();
    }
  });

  productSort.addEventListener("change", () => {
    const sortedProducts = [...products];
    if (productSort.value === "name-asc") {
      sortedProducts.sort((a, b) => a.dataset.name.localeCompare(b.dataset.name));
    } else if (productSort.value === "name-desc") {
      sortedProducts.sort((a, b) => b.dataset.name.localeCompare(a.dataset.name));
    } else {
      sortedProducts.sort((a, b) => originalOrder.get(a) - originalOrder.get(b));
    }
    sortedProducts.forEach((product) => productGrid.append(product));
    updateProducts();
  });

  document.querySelector("[data-close-quick-view]").addEventListener("click", () => quickViewDialog.close());
  quickViewDialog.addEventListener("click", (event) => {
    if (event.target === quickViewDialog) quickViewDialog.close();
  });
  quickViewAdd.addEventListener("click", () => {
    if (!quickViewProduct) return;
    addProductToBasket(quickViewProduct);
    quickViewDialog.close();
  });

  basketItems.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-basket-action]");
    if (!actionButton) return;

    const name = actionButton.dataset.product;
    const quantity = basket.get(name);
    if (actionButton.dataset.basketAction === "increase") {
      basket.set(name, quantity + 1);
    } else if (quantity === 1) {
      basket.delete(name);
    } else {
      basket.set(name, quantity - 1);
    }
    updateBasket();
    orderStatus.textContent = basket.has(name) ? `${name} quantity updated.` : `${name} removed from your basket.`;
  });

  paymentMethod.addEventListener("change", () => {
    const isMpesa = paymentMethod.value === "M-Pesa STK Push";
    checkoutButton.firstChild.textContent = isMpesa ? "Send M-Pesa prompt " : "Email order request ";
    paymentMethodNote.textContent = isMpesa
      ? "The secure M-Pesa prompt is available after the shop configures Safaricom and confirms product prices. It covers products only; confirm any delivery charge before approving. Order details and payment status are stored securely for up to 24 hours to process checkout."
      : "This opens an email with your selected items. The shop will confirm prices, stock and delivery.";
  });

  const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  orderForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (basket.size === 0 || !orderForm.reportValidity()) return;

    const formData = new FormData(orderForm);
    const orderLines = Array.from(basket.entries()).map(([name, quantity]) => `- ${name} x ${quantity}`);
    const selectedPaymentMethod = formData.get("paymentMethod");
    const body = [
      "Hello Nernstechhub, I would like to request the following order:",
      "",
      ...orderLines,
      "",
      `Name: ${formData.get("name")}`,
      `Phone: ${formData.get("phone")}`,
      `Delivery area: ${formData.get("location")}`,
      `Payment method: ${selectedPaymentMethod}`,
      "",
      "Please confirm pricing, availability, delivery charges and next steps.",
    ].join("\n");

    if (selectedPaymentMethod !== "M-Pesa STK Push") {
      orderStatus.textContent = "Opening your email app with the order request. Please review and send the email to complete your request.";
      window.location.href = `mailto:nernst546@gmail.com?subject=${encodeURIComponent("Nernstechhub order request")}&body=${encodeURIComponent(body)}`;
      return;
    }

    checkoutButton.disabled = true;
    paymentPending = true;
    orderStatus.textContent = "Starting a secure M-Pesa request...";
    let promptStarted = false;

    fetch("/api/mpesa/stkpush", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        phone: formData.get("phone"),
        location: formData.get("location"),
        items: Array.from(basket.entries()).map(([name, quantity]) => ({ name, quantity })),
      }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "The M-Pesa request could not be started.");

        promptStarted = true;
        const amount = new Intl.NumberFormat("en-KE", {
          style: "currency",
          currency: "KES",
          maximumFractionDigits: 0,
        }).format(result.amount);
        orderStatus.textContent = `${result.message} Item total: ${amount}. Delivery is not included.`;
        for (let attempt = 0; attempt < 40; attempt += 1) {
          await wait(3000);
          const statusResponse = await fetch(`/api/mpesa/status?orderId=${encodeURIComponent(result.orderId)}`, {
            headers: { Accept: "application/json" },
          });
          const payment = await statusResponse.json();
          if (!statusResponse.ok) {
            throw new Error(payment.error || "The payment status could not be checked.");
          }
          if (payment.status === "paid") {
            orderStatus.textContent = `Payment confirmed by Safaricom${payment.receipt ? ` (receipt ${payment.receipt})` : ""}. Contact nernst546@gmail.com to arrange delivery.`;
            paymentPending = false;
            orderForm.reset();
            basket.clear();
            updateBasket();
            return;
          }
          if (payment.status === "failed") {
            paymentPending = false;
            throw new Error(payment.message || "Safaricom did not complete the payment. You can try again.");
          }
        }
        orderStatus.textContent = "The prompt was sent, but payment is not confirmed yet. Keep this page open or contact us before retrying.";
      })
      .catch((error) => {
        orderStatus.textContent = error.message;
        if (!promptStarted) paymentPending = false;
      })
      .finally(() => {
        checkoutButton.disabled = basket.size === 0 || paymentPending;
      });
  });

  updateProducts();
  updateBasket();
  updateWishlist();
}