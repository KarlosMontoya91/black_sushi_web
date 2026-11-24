const motionToggle = select(".motion-toggle");
const panorama = select(".panorama");
const roomTrack = select(".room-track");
const photoFrame = select(".hero-photo-frame");
const canAnimate = () => !media.matches && !document.body.classList.contains("motion-paused");
let activeScroll = 0;

function paintScroll() {
  activeScroll = 0;
  if (!canAnimate()) {
    roomTrack.style.transform = "";
    photoFrame.style.translate = "";
    return;
  }
  const travel = Math.max(1, panorama.offsetHeight - roomTrack.parentElement.offsetHeight);
  const progress = clamp(-panorama.getBoundingClientRect().top / travel);
  const distance = Math.max(0, roomTrack.offsetWidth - panorama.clientWidth);
  roomTrack.style.transform = `translate3d(${-progress * distance}px,0,0)`;
  const heroProgress = clamp(-hero.getBoundingClientRect().top / hero.offsetHeight);
  photoFrame.style.translate = `0 ${heroProgress * 58}px`;
}

function queueScroll() {
  if (!activeScroll) activeScroll = requestAnimationFrame(paintScroll);
}
window.addEventListener("scroll", queueScroll, {passive: true});
window.addEventListener("resize", queueScroll, {passive: true});
queueScroll();

function fillLoop(target, words) {
  const set = document.createElement("div");
  set.className = "loop-set";
  for (const word of [...words, ...words, ...words]) {
    const item = document.createElement("span");
    item.className = "strip-item";
    item.textContent = word + " ✦";
    set.append(item);
  }
  target.append(set, set.cloneNode(true));
}
const food = ["SUSHI 2x1", "RAMEN", "NIGIRIS", "AL WOK", "LIMONADAS"];
fillLoop(select("#food-loop"), food);
fillLoop(select("#reverse-loop"), [...food].reverse());
fillLoop(select("#closing-loop"), ["BLACK SUSHI", "ASIAN CUISINE", "SANTA CATARINA"]);

function updateMotion() {
  if (!canAnimate()) {
    document.getAnimations().forEach(animation => {
      if (animation.constructor === Animation) animation.cancel();
    });
    for (const {canvas, context} of petalLayers) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    select(".loader").hidden = true;
  }
  motionToggle.hidden = media.matches;
  queueScroll();
  updatePetalLoop();
}

motionToggle.addEventListener("click", () => {
  const paused = document.body.classList.toggle("motion-paused");
  motionToggle.setAttribute("aria-pressed", String(paused));
  select("span", motionToggle).textContent = paused ? "▶" : "Ⅱ";
  updateMotion();
});
media.addEventListener("change", updateMotion);

let topPhoto = 2;
all("[data-drag]").forEach(element => {
  let x = 0, y = 0, drag, glide;
  const stick = element.classList.contains("chop");
  const apply = () => { element.style.setProperty("--dx", x + "px"); element.style.setProperty("--dy", y + "px"); };
  const move = (nx, ny) => {
    x = clamp(nx, drag.minX, drag.maxX);
    y = clamp(ny, drag.minY, drag.maxY);
    apply();
  };
  element.addEventListener("pointerdown",event => {
    if (event.pointerType !== "mouse" || event.button !== 0 || !mouse.matches) return;
    if (glide) cancelAnimationFrame(glide);
    event.preventDefault();
    const rect = element.getBoundingClientRect();
    const bound = element.closest(stick ? ".hero" : ".mural").getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    drag = {minX:x + bound.left - centerX,maxX:x + bound.right - centerX,minY:y + bound.top - centerY,maxY:y + bound.bottom - centerY,px:event.clientX,py:event.clientY,vx:0,vy:0,time:performance.now()};
    element.setPointerCapture(event.pointerId);
    element.classList.add("dragging");
    if (!stick) element.style.zIndex = ++topPhoto;
  });
  element.addEventListener("pointermove",event => {
    if (!drag) return;
    const dx = event.clientX - drag.px;
    const dy = event.clientY - drag.py;
    const time = performance.now();
    move(x + dx, y + dy);
    drag.vx = clamp(dx / Math.max(8, time-drag.time) * 16,-37,37);
    drag.vy = clamp(dy / Math.max(8, time-drag.time) * 16,-37,37);
    Object.assign(drag,{px:event.clientX,py:event.clientY,time});
  });
  const release = () => {
    if (!drag) return;
    element.classList.remove("dragging");
    if (!stick && canAnimate()) element.style.setProperty("--tilt", clamp(drag.vx * 2,-13,13) + "deg");
    const coast = () => {
      drag.vx *= .88;
      drag.vy *= .88;
      move(x + drag.vx, y + drag.vy);
      if (Math.abs(drag.vx) + Math.abs(drag.vy) > .35) glide = requestAnimationFrame(coast);
      else drag = undefined;
    };
    if (stick && canAnimate() && performance.now() - drag.time < 100) glide = requestAnimationFrame(coast);
    else drag = undefined;
  };
  element.addEventListener("pointerup",release);
  element.addEventListener("pointercancel",release);
  element.addEventListener("lostpointercapture",() => { if (drag && element.classList.contains("dragging")) release(); });
});
document.addEventListener("pointermove",event => {
  const target = event.target;
  const match = mouse.matches && event.pointerType === "mouse" && !event.buttons && !dialog.open && target instanceof Element && target.closest("[data-fresh]");
  fresh.classList.toggle("on",Boolean(match));
  if (match) fresh.style.transform = `translate(${Math.min(innerWidth-97,event.clientX+14)}px,${Math.max(3,event.clientY-37)}px)`;
});
const photoObserver = new IntersectionObserver(entries => entries.forEach(async ({target,isIntersecting}) => {
  if (!isIntersecting) return;
  photoObserver.unobserve(target);
  try { await select("img",target).decode(); } catch {}
  target.classList.add("visible");
  if (canAnimate()) target.animate([{opacity:0,translate:"0 -85px",rotate:"-21deg"},{opacity:1,translate:"0 0",rotate:"0deg"}],{duration:625,delay:all(".polaroid").indexOf(target)*62,easing:"cubic-bezier(.23,.9,.33,1)",fill:"backwards"});
}),{threshold:.08});
all(".polaroid").forEach(photo => photoObserver.observe(photo));

const petalLayers = all(".petals").map((canvas,i) => {
  const density = innerWidth > 620 ? [14,19,9] : [8,10,5];
  return {canvas,context:canvas.getContext("2d"),color:[color("ink"),color("salmon"),color("paper")][i],opacity:[.19,.8,.91][i],
    petals:Array.from({length:density[i]},() => ({x:Math.random(),y:Math.random(),phase:Math.random()*7,speed:.00009+Math.random()*.0002,size:3+i*2+Math.random()*4}))};
});
let petalFrame;
let heroVisible = false;
function drawPetals(time) {
  petalFrame = null;
  if (!canAnimate() || !heroVisible) return;
  petalLayers.forEach(({canvas,context,petals,color,opacity}) => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio,2);
    if (canvas.width !== Math.round(width*ratio) || canvas.height !== Math.round(height*ratio)) {
      canvas.width = Math.round(width*ratio);
      canvas.height = Math.round(height*ratio);
    }
    context.setTransform(ratio,0,0,ratio,0,0);
    context.clearRect(0,0,width,height);
    context.globalAlpha = opacity;
    context.fillStyle = color;
    petals.forEach(petal => {
      const x = petal.x*width + Math.sin(time*.001+petal.phase)*34;
      const y = ((petal.y + time*petal.speed)%1)*(height+20)-10;
      context.save();
      context.translate(x,y);
      context.rotate(time*.0015+petal.phase);
      context.scale(.22+Math.abs(Math.sin(time*.002+petal.phase))*.9,1);
      context.beginPath();
      context.moveTo(0,-petal.size);
      context.quadraticCurveTo(petal.size*1.25,-petal.size*.45,petal.size*.55,petal.size*.56);
      context.quadraticCurveTo(0,petal.size*1.3,-petal.size*.65,petal.size*.45);
      context.quadraticCurveTo(-petal.size*.87,-petal.size*.48,0,-petal.size);
      context.fill();
      context.restore();
    });
  });
  petalFrame = requestAnimationFrame(drawPetals);
}
function updatePetalLoop() {
  if (heroVisible && canAnimate() && !petalFrame) petalFrame = requestAnimationFrame(drawPetals);
}
new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; updatePetalLoop(); }).observe(hero);
updateMotion();

async function intro() {
  if (!canAnimate() || location.hash || new URLSearchParams(location.search).has("pronto")) return;
  const loader = select(".loader");
  const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  loader.hidden = false;
  for (const piece of all("svg g", loader)) {
    if (loader.hidden) return;
    piece.classList.add("shown");
    await pause(105);
  }
  await pause(175);
  loader.classList.add("out");
  if (canAnimate()) {
    all(".hero-title span").forEach((word, index) => word.animate(
      [{translate: "0 46px", opacity: 0}, {translate: "0 0", opacity: 1}],
      {duration: 510, delay: 180 + index * 95, fill: "backwards"}
    ));
    photoFrame.animate(
      [{transform: "translateY(-35px) rotate(-12deg)", opacity: 0}, {transform: "rotate(-5deg)", opacity: 1}],
      {duration: 590, delay: 235, fill: "backwards"}
    );
  }
  await pause(790);
  loader.hidden = true;
}
intro();
