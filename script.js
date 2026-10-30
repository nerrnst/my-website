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

const basketStorageKey = "nernstechhub-basket";
const wishlistStorageKey = "nernstechhub-wishlist";
const basketStorageStatus = document.querySelector("#basket-storage-status");

function reportBasketStorageStatus(message) {
  if (basketStorageStatus) basketStorageStatus.textContent = message;
}

function readBasket(availableNames = null) {
  try {
    const storedBasket = JSON.parse(localStorage.getItem(basketStorageKey) || "[]");
    if (!Array.isArray(storedBasket)) throw new Error("Stored basket data is invalid.");

    return new Map(storedBasket.filter((entry) => (
      Array.isArray(entry)
      && typeof entry[0] === "string"
      && (!availableNames || availableNames.has(entry[0]))
      && Number.isSafeInteger(entry[1])
      && entry[1] > 0
    )));
  } catch {
    reportBasketStorageStatus("Your saved basket could not be loaded from this browser.");
    return new Map();
  }
}

function updateHeaderBasketCount(basket) {
  const count = document.querySelector("#header-basket-count");
  if (!count) return;

  const totalQuantity = Array.from(basket.values()).reduce((total, quantity) => total + quantity, 0);
  count.textContent = String(totalQuantity);
  count.hidden = totalQuantity === 0;
  count.closest("a").setAttribute("aria-label", `Shopping basket, ${totalQuantity} ${totalQuantity === 1 ? "item" : "items"}`);
}

updateHeaderBasketCount(readBasket());
window.addEventListener("storage", (event) => {
  if (event.key === basketStorageKey || event.key === null) {
    updateHeaderBasketCount(readBasket());
  }
});

const storeSearch = document.querySelector("#store-search");
const searchSuggestions = document.querySelector("#store-search-suggestions");
if (storeSearch && searchSuggestions) {
  const searchForm = storeSearch.form;
  const suggestionMap = new Map();
  const addSuggestion = (label, href) => {
    const key = label?.toLocaleLowerCase();
    if (!key || !href || suggestionMap.has(key)) return;
    suggestionMap.set(key, { label, href });
  };

  document.querySelectorAll(".shop-category-links a").forEach((link) => {
    addSuggestion(link.textContent.trim(), link.getAttribute("href"));
  });
  document.querySelectorAll(".shop-featured-info > a").forEach((link) => {
    addSuggestion(link.querySelector("strong")?.textContent.trim(), link.getAttribute("href"));
  });

  let activeSuggestion = -1;
  const closeSuggestions = () => {
    searchSuggestions.hidden = true;
    storeSearch.setAttribute("aria-expanded", "false");
    storeSearch.removeAttribute("aria-activedescendant");
    activeSuggestion = -1;
  };
  const updateActiveSuggestion = (nextIndex) => {
    const options = Array.from(searchSuggestions.querySelectorAll('[role="option"]'));
    if (!options.length) return;
    activeSuggestion = (nextIndex + options.length) % options.length;
    options.forEach((option, index) => {
      const isActive = index === activeSuggestion;
      option.classList.toggle("is-active", isActive);
      option.setAttribute("aria-selected", String(isActive));
    });
    storeSearch.setAttribute("aria-activedescendant", options[activeSuggestion].id);
  };
  const renderSuggestions = () => {
    const query = storeSearch.value.trim().toLocaleLowerCase();
    const suggestions = Array.from(suggestionMap.values())
      .filter(({ label }) => !query || label.toLocaleLowerCase().includes(query))
      .slice(0, 6);

    activeSuggestion = -1;
    searchSuggestions.replaceChildren();
    suggestions.forEach(({ label, href }, index) => {
      const link = document.createElement("a");
      link.id = `store-search-option-${index}`;
      link.href = href;
      link.setAttribute("role", "option");
      link.setAttribute("aria-selected", "false");
      const icon = document.createElement("span");
      icon.className = "shop-search-suggestion-icon";
      icon.setAttribute("aria-hidden", "true");
      const iconSvg = document.createElement("i");
      iconSvg.setAttribute("data-lucide", "search");
      icon.append(iconSvg);

      const suggestionLabel = document.createElement("span");
      suggestionLabel.textContent = label;

      const arrow = document.createElement("i");
      arrow.className = "shop-search-suggestion-arrow";
      arrow.setAttribute("data-lucide", "arrow-up-left");
      arrow.setAttribute("aria-hidden", "true");

      link.append(icon, suggestionLabel, arrow);
      searchSuggestions.append(link);
    });

    const hasSuggestions = suggestions.length > 0;
    searchSuggestions.hidden = !hasSuggestions;
    storeSearch.setAttribute("aria-expanded", String(hasSuggestions));
    storeSearch.removeAttribute("aria-activedescendant");
    if (hasSuggestions && window.lucide) window.lucide.createIcons();
  };

  storeSearch.addEventListener("focus", renderSuggestions);
  storeSearch.addEventListener("input", renderSuggestions);
  storeSearch.addEventListener("keydown", (event) => {
    const optionCount = searchSuggestions.querySelectorAll('[role="option"]').length;
    if (event.key === "Escape") {
      closeSuggestions();
      return;
    }
    if (event.key === "ArrowDown" && optionCount) {
      event.preventDefault();
      if (searchSuggestions.hidden) renderSuggestions();
      updateActiveSuggestion(activeSuggestion + 1);
    } else if (event.key === "ArrowUp" && optionCount) {
      event.preventDefault();
      updateActiveSuggestion(activeSuggestion < 0 ? optionCount - 1 : activeSuggestion - 1);
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      const selectedSuggestion = searchSuggestions.querySelectorAll('[role="option"]')[activeSuggestion];
      if (selectedSuggestion) window.location.assign(selectedSuggestion.href);
    }
  });
  searchSuggestions.addEventListener("pointerdown", (event) => {
    if (event.target.closest('[role="option"]')) closeSuggestions();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".shop-header-search")) closeSuggestions();
  });
  searchForm?.addEventListener("submit", closeSuggestions);
}

const productSlideshow = document.querySelector("[data-product-slideshow]");
if (productSlideshow) {
  const slides = Array.from(productSlideshow.querySelectorAll("[data-slide]"));
  const slideButtons = Array.from(productSlideshow.querySelectorAll("[data-slide-to]"));
  const previousButton = productSlideshow.querySelector("[data-slide-prev]");
  const nextButton = productSlideshow.querySelector("[data-slide-next]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeSlide = 0;
  let slideshowTimer;
  let focusPaused = false;

  const showSlide = (index) => {
    activeSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeSlide;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
      slide.inert = !isActive;
    });
    slideButtons.forEach((button, buttonIndex) => {
      const isActive = buttonIndex === activeSlide;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  };

  const stopSlideshow = () => {
    window.clearInterval(slideshowTimer);
  };

  const startSlideshow = () => {
    stopSlideshow();
    if (reducedMotion.matches || focusPaused || document.hidden) return;
    slideshowTimer = window.setInterval(() => showSlide(activeSlide + 1), 4000);
  };

  previousButton.addEventListener("click", () => {
    showSlide(activeSlide - 1);
    startSlideshow();
  });
  nextButton.addEventListener("click", () => {
    showSlide(activeSlide + 1);
    startSlideshow();
  });
  slideButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showSlide(Number(button.dataset.slideTo));
      startSlideshow();
    });
  });
  productSlideshow.addEventListener("focusin", (event) => {
    if (!event.target.closest("[data-slide]")) return;
    focusPaused = true;
    stopSlideshow();
  });
  productSlideshow.addEventListener("focusout", (event) => {
    if (event.target.closest("[data-slide]") && !event.relatedTarget?.closest("[data-slide]")) {
      focusPaused = false;
      startSlideshow();
    }
  });
  document.addEventListener("visibilitychange", startSlideshow);
  reducedMotion.addEventListener("change", startSlideshow);
  startSlideshow();
}

const featuredShelf = document.querySelector("[data-featured-shelf]");
if (featuredShelf) {
  const shelfControls = Array.from(document.querySelectorAll("[data-shelf-scroll]"));
  const updateShelfControls = () => {
    const canScrollBack = featuredShelf.scrollLeft > 2;
    const canScrollForward = featuredShelf.scrollLeft + featuredShelf.clientWidth < featuredShelf.scrollWidth - 2;
    shelfControls.forEach((button) => {
      button.disabled = Number(button.dataset.shelfScroll) < 0 ? !canScrollBack : !canScrollForward;
    });
  };

  shelfControls.forEach((button) => {
    button.addEventListener("click", () => {
      const firstCard = featuredShelf.querySelector(".shop-featured-card");
      if (!firstCard) return;
      const styles = window.getComputedStyle(featuredShelf);
      const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
      const distance = firstCard.getBoundingClientRect().width + gap;
      featuredShelf.scrollBy({
        left: distance * Number(button.dataset.shelfScroll),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
  });

  featuredShelf.addEventListener("scroll", updateShelfControls, { passive: true });
  window.addEventListener("resize", updateShelfControls);
  updateShelfControls();
}

const recentSection = document.querySelector("[data-recent-section]");
const recentShelf = document.querySelector("[data-recent-shelf]");
if (recentSection && recentShelf) {
  const recentControls = Array.from(recentSection.querySelectorAll("[data-recent-scroll]"));
  const updateRecentControls = () => {
    const canScrollBack = recentShelf.scrollLeft > 2;
    const canScrollForward = recentShelf.scrollLeft + recentShelf.clientWidth < recentShelf.scrollWidth - 2;
    recentControls.forEach((button) => {
      button.disabled = Number(button.dataset.recentScroll) < 0 ? !canScrollBack : !canScrollForward;
    });
  };
  const renderRecentProducts = () => {
    let recentProducts = [];
    try {
      const savedProducts = JSON.parse(localStorage.getItem("nernstechhub-recently-viewed") || "[]");
      if (!Array.isArray(savedProducts)) throw new Error("Stored recently viewed data is invalid.");
      recentProducts = savedProducts.filter((product) => (
        product
        && typeof product.name === "string"
        && typeof product.category === "string"
        && typeof product.image === "string"
        && typeof product.alt === "string"
        && typeof product.description === "string"
      ));
    } catch {
      reportBasketStorageStatus("Recently viewed products could not be loaded from this browser.");
    }

    recentShelf.replaceChildren();
    recentProducts.forEach((product) => {
      const link = document.createElement("a");
      link.className = "shop-featured-card shop-recent-card";
      link.href = `products.html?search=${encodeURIComponent(product.name)}#shop`;
      link.setAttribute("aria-label", `View ${product.name} in the product catalogue`);

      const imageFrame = document.createElement("span");
      imageFrame.className = "shop-featured-image";
      const category = document.createElement("span");
      category.className = "shop-featured-tag";
      category.textContent = product.category;
      const image = document.createElement("img");
      image.src = product.image;
      image.alt = product.alt;
      image.loading = "lazy";
      image.decoding = "async";
      const quickLink = document.createElement("span");
      quickLink.className = "shop-featured-quick";
      quickLink.setAttribute("aria-hidden", "true");
      const quickIcon = document.createElement("i");
      quickIcon.setAttribute("data-lucide", "arrow-up-right");
      quickLink.append(quickIcon);
      imageFrame.append(category, image, quickLink);

      const info = document.createElement("span");
      info.className = "shop-featured-info";
      const title = document.createElement("strong");
      title.textContent = product.name;
      const description = document.createElement("span");
      description.className = "shop-recent-description";
      description.textContent = product.description;
      const action = document.createElement("span");
      action.className = "shop-recent-action";
      action.textContent = "Continue browsing";
      info.append(title, description, action);
      link.append(imageFrame, info);
      recentShelf.append(link);
    });

    recentSection.hidden = recentProducts.length === 0;
    recentShelf.scrollLeft = 0;
    if (window.lucide) window.lucide.createIcons();
    updateRecentControls();
  };

  recentControls.forEach((button) => {
    button.addEventListener("click", () => {
      const firstCard = recentShelf.querySelector(".shop-recent-card");
      if (!firstCard) return;
      const styles = window.getComputedStyle(recentShelf);
      const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
      const distance = firstCard.getBoundingClientRect().width + gap;
      recentShelf.scrollBy({
        left: distance * Number(button.dataset.recentScroll),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
  });

  recentShelf.addEventListener("scroll", updateRecentControls, { passive: true });
  window.addEventListener("resize", updateRecentControls);
  window.addEventListener("storage", (event) => {
    if (event.key === "nernstechhub-recently-viewed" || event.key === null) renderRecentProducts();
  });
  renderRecentProducts();
}

const featuredWishlistButtons = Array.from(document.querySelectorAll("[data-featured-wishlist]"));
if (featuredWishlistButtons.length) {
  const wishlistCount = document.querySelector("#featured-wishlist-count");
  const wishlistStatus = document.querySelector("#featured-wishlist-status");
  const featuredNames = new Set(featuredWishlistButtons.map((button) => button.dataset.featuredWishlist));
  const savedProducts = new Set();

  const readFeaturedWishlist = () => {
    try {
      const storedProducts = JSON.parse(localStorage.getItem(wishlistStorageKey) || "[]");
      if (!Array.isArray(storedProducts)) throw new Error("Stored wishlist data is invalid.");
      return storedProducts.filter((name) => typeof name === "string");
    } catch {
      wishlistStatus.textContent = "Your saved products could not be loaded from this browser.";
      return [];
    }
  };
  const updateFeaturedWishlist = () => {
    featuredWishlistButtons.forEach((button) => {
      const name = button.dataset.featuredWishlist;
      const isSaved = savedProducts.has(name);
      button.setAttribute("aria-pressed", String(isSaved));
      button.setAttribute("aria-label", `${isSaved ? "Remove" : "Save"} ${name} ${isSaved ? "from" : "to"} wishlist`);
    });
    wishlistCount.textContent = String(savedProducts.size);
  };
  const syncFeaturedWishlist = () => {
    savedProducts.clear();
    readFeaturedWishlist().forEach((name) => {
      if (featuredNames.has(name)) savedProducts.add(name);
    });
    updateFeaturedWishlist();
  };

  syncFeaturedWishlist();
  featuredWishlistButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.featuredWishlist;
      let savedForLater = true;
      if (savedProducts.has(name)) {
        savedProducts.delete(name);
      } else {
        savedProducts.add(name);
      }

      try {
        const storedProducts = new Set(readFeaturedWishlist());
        if (savedProducts.has(name)) {
          storedProducts.add(name);
        } else {
          storedProducts.delete(name);
        }
        localStorage.setItem(wishlistStorageKey, JSON.stringify(Array.from(storedProducts)));
      } catch {
        savedForLater = false;
      }
      updateFeaturedWishlist();
      wishlistStatus.textContent = savedForLater
        ? `${name} ${savedProducts.has(name) ? "saved to" : "removed from"} your wishlist.`
        : "Wishlist changes are only saved for this visit because browser storage is unavailable.";
    });
  });
  window.addEventListener("storage", (event) => {
    if (event.key === wishlistStorageKey || event.key === null) syncFeaturedWishlist();
  });
}

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
  const availableProductNames = new Set(products.map((product) => product.dataset.name));
  const basketItems = document.querySelector("#basket-items");
  const basketCount = document.querySelector("#basket-count");
  const productSearch = document.querySelector("#product-search");
  const queryParameters = new URLSearchParams(window.location.search);
  const initialSearch = queryParameters.get("search") || "";
  productSearch.value = initialSearch;
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
  const basket = readBasket(availableProductNames);
  const originalOrder = new Map(products.map((product, index) => [product, index]));
  const savedProducts = new Set();
  const productCategories = new Set(products.map((product) => product.dataset.category));
  const requestedCategory = queryParameters.get("category");
  let activeCategory = requestedCategory === "saved" || productCategories.has(requestedCategory)
    ? requestedCategory
    : "all";
  let quickViewProduct = null;
  let paymentPending = false;

  try {
    const storedProducts = JSON.parse(localStorage.getItem(wishlistStorageKey) || "[]");
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

  const recordRecentlyViewed = (product) => {
    const image = product.querySelector(".store-product-art img");
    const description = product.querySelector(".store-product-info p");
    const recentProduct = {
      name: product.dataset.name,
      category: product.dataset.category,
      image: image.currentSrc || image.src,
      alt: image.alt,
      description: description.textContent.trim(),
    };

    try {
      const storedProducts = JSON.parse(localStorage.getItem("nernstechhub-recently-viewed") || "[]");
      if (!Array.isArray(storedProducts)) throw new Error("Stored recently viewed data is invalid.");
      const recentProducts = [
        recentProduct,
        ...storedProducts.filter((entry) => entry && entry.name !== recentProduct.name),
      ].slice(0, 8);
      localStorage.setItem("nernstechhub-recently-viewed", JSON.stringify(recentProducts));
    } catch {
      reportBasketStorageStatus("Recently viewed products are only available for this visit because browser storage is unavailable.");
    }
  };

  const addProductToBasket = (product) => {
    const name = product.dataset.name;
    recordRecentlyViewed(product);
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

  const updateBasket = (persist = true) => {
    const entries = Array.from(basket.entries());
    const totalQuantity = entries.reduce((total, [, quantity]) => total + quantity, 0);
    basketCount.textContent = String(totalQuantity);
    basketCount.setAttribute("aria-label", `${totalQuantity} ${totalQuantity === 1 ? "item" : "items"}`);
    updateHeaderBasketCount(basket);
    if (persist) {
      try {
        localStorage.setItem(basketStorageKey, JSON.stringify(entries));
        reportBasketStorageStatus("");
      } catch {
        reportBasketStorageStatus("Basket changes are only saved for this visit because browser storage is unavailable.");
      }
    }
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
    const isInitialFilter = filter.dataset.category === activeCategory;
    filter.classList.toggle("is-active", isInitialFilter);
    filter.setAttribute("aria-pressed", String(isInitialFilter));
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
        localStorage.setItem(wishlistStorageKey, JSON.stringify(Array.from(savedProducts)));
        wishlistStatus.textContent = "";
      } catch {
        wishlistStatus.textContent = "Wishlist changes are only saved for this visit because browser storage is unavailable.";
      }
      updateWishlist();
      updateProducts();
      return;
    }

    if (event.target.closest("[data-quick-view]")) {
      recordRecentlyViewed(product);
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

  window.addEventListener("storage", (event) => {
    if (event.key !== basketStorageKey && event.key !== null) return;
    basket.clear();
    readBasket(availableProductNames).forEach((quantity, name) => basket.set(name, quantity));
    updateBasket(false);
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== wishlistStorageKey && event.key !== null) return;
    savedProducts.clear();
    try {
      const storedProducts = JSON.parse(localStorage.getItem(wishlistStorageKey) || "[]");
      if (!Array.isArray(storedProducts)) throw new Error("Stored wishlist data is invalid.");
      storedProducts
        .filter((name) => typeof name === "string" && availableProductNames.has(name))
        .forEach((name) => savedProducts.add(name));
      wishlistStatus.textContent = "";
    } catch {
      wishlistStatus.textContent = "Your saved products could not be loaded from this browser.";
    }
    updateWishlist();
    updateProducts();
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
  updateBasket(false);
  updateWishlist();
}