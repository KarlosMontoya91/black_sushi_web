const select = (query, root = document) => root.querySelector(query);
const all = (query, root = document) => [...root.querySelectorAll(query)];
const media = window.matchMedia("(prefers-reduced-motion: reduce)");
const mouse = window.matchMedia("(hover: hover) and (pointer: fine)");
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const color = name => getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim();
const hero = select(".hero");
const dialog = select("dialog");
const fresh = select(".fresh");

if (typeof dialog.showModal === "function") {
  let orderTrigger;
  for (const link of all("[data-order]")) {
    link.addEventListener("click", event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      orderTrigger = link;
      dialog.showModal();
    });
  }
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => orderTrigger?.focus({preventScroll: true}));
}

const menuTrack = select(".menu-track");
const cards = all(".menu-card", menuTrack);
const menuControls = select(".menu-controls");
const [previous, next] = all("button", menuControls);

function updateMenuControls() {
  const max = Math.max(0, menuTrack.scrollWidth - menuTrack.clientWidth);
  menuControls.hidden = max < 2;
  previous.setAttribute("aria-disabled", String(menuTrack.scrollLeft < 2));
  next.setAttribute("aria-disabled", String(menuTrack.scrollLeft > max - 2));
}

for (const button of [previous, next]) {
  button.addEventListener("click", () => {
    if (button.getAttribute("aria-disabled") === "true") return;
    const step = cards[1].offsetLeft - cards[0].offsetLeft;
    menuTrack.scrollBy({left: step * Number(button.dataset.step), behavior: media.matches ? "instant" : "smooth"});
  });
}
menuTrack.addEventListener("scroll", updateMenuControls, {passive: true});
new ResizeObserver(updateMenuControls).observe(menuTrack);
updateMenuControls();
