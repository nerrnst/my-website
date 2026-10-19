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