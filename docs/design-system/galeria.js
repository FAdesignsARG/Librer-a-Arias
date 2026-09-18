const themeButton = document.querySelector("#theme");
const addButton = document.querySelector("#add");
const statusText = document.querySelector("#status");
const card = document.querySelector(".card");

themeButton.addEventListener("click", () => {
  document.body.classList.toggle("light");
});

addButton.addEventListener("click", () => {
  card.classList.remove("added");
  requestAnimationFrame(() => {
    card.classList.add("added");
    statusText.textContent = "Producto agregado. Arias confirma stock por WhatsApp.";
  });
});
