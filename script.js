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
  const resultCount = document.querySelector("#product-result-count");
  const emptyMessage = document.querySelector("#product-empty");
  const checkoutButton = document.querySelector("#checkout-button");
  const orderStatus = document.querySelector("#order-status");
  const basket = new Map();
  let activeCategory = "all";

  const updateProducts = () => {
    const query = productSearch.value.trim().toLowerCase();
    let visibleCount = 0;

    products.forEach((product) => {
      const matchesCategory = activeCategory === "all" || product.dataset.category === activeCategory;
      const searchableText = `${product.dataset.name} ${product.dataset.keywords}`.toLowerCase();
      const matchesSearch = searchableText.includes(query);
      const isVisible = matchesCategory && matchesSearch;
      product.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    resultCount.textContent = `${visibleCount} ${visibleCount === 1 ? "product" : "product categories"}`;
    emptyMessage.hidden = visibleCount > 0;
  };

  const updateBasket = () => {
    const entries = Array.from(basket.entries());
    const totalQuantity = entries.reduce((total, [, quantity]) => total + quantity, 0);
    basketCount.textContent = String(totalQuantity);
    basketCount.setAttribute("aria-label", `${totalQuantity} ${totalQuantity === 1 ? "item" : "items"}`);
    checkoutButton.disabled = totalQuantity === 0;
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
    });
  });

  productSearch.addEventListener("input", updateProducts);

  productGrid.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-product]");
    if (!addButton) return;

    const product = addButton.closest(".store-product");
    const name = product.dataset.name;
    basket.set(name, (basket.get(name) || 0) + 1);
    updateBasket();
    orderStatus.textContent = `${name} added to your basket.`;
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

  orderForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (basket.size === 0 || !orderForm.reportValidity()) return;

    const formData = new FormData(orderForm);
    const orderLines = Array.from(basket.entries()).map(([name, quantity]) => `- ${name} x ${quantity}`);
    const body = [
      "Hello Nernstechhub, I would like to request the following order:",
      "",
      ...orderLines,
      "",
      `Name: ${formData.get("name")}`,
      `Phone: ${formData.get("phone")}`,
      `Delivery area: ${formData.get("location")}`,
      "",
      "Please confirm pricing, availability, delivery and payment details.",
    ].join("\n");

    orderStatus.textContent = "Opening your email app with the order request. Please review and send the email to complete your request.";
    window.location.href = `mailto:nernst546@gmail.com?subject=${encodeURIComponent("Nernstechhub order request")}&body=${encodeURIComponent(body)}`;
  });

  updateProducts();
  updateBasket();
}