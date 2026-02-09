// Year
document.getElementById("year").textContent = new Date().getFullYear();

// Preset project type when clicking “Request …” buttons
document.querySelectorAll("[data-preset]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const preset = btn.getAttribute("data-preset");
    const project = document.getElementById("project");
    if (project && preset) project.value = preset;
  });
});

const form = document.getElementById("auditForm");
const statusBox = document.getElementById("formStatus");

let formStartTime = 0;

form.addEventListener("focusin", () => {
  if (!form.dataset.started) {
    form.dataset.started = "1";
    formStartTime = Date.now();
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const started = Number(formStartTime || Date.now());
  const secondsSpent = (Date.now() - started) / 1000;

  // Basic bot timing check (a bit more forgiving for fast humans)
  if (secondsSpent < 2) {
    statusBox.className = "status err";
    statusBox.textContent = "Submission blocked. Please try again.";
    statusBox.style.display = "block";
    return;
  }

  // Honeypots
  const company = (form.querySelector("#company")?.value || "").trim();
  const gotcha = (form.querySelector("[name='_gotcha']")?.value || "").trim();
  if (company || gotcha) {
    statusBox.className = "status err";
    statusBox.textContent = "Submission blocked.";
    statusBox.style.display = "block";
    return;
  }

  statusBox.className = "status";
  statusBox.textContent = "Sending...";
  statusBox.style.display = "block";

  const data = new FormData(form);

  const website = (data.get("website") || "").toString().trim();
  const message = (data.get("message") || "").toString().trim();
  const chosenType = (data.get("project_type") || "").toString();

  // More reliable URL validation than regex
  try { new URL(website); }
  catch {
    statusBox.className = "status err";
    statusBox.textContent = "Please enter a valid website URL (include https://).";
    statusBox.style.display = "block";
    return;
  }

  if (message.length < 20) {
    statusBox.className = "status err";
    statusBox.textContent = "Please provide a bit more detail (at least 20 characters).";
    statusBox.style.display = "block";
    return;
  }

  try{
    const res = await fetch(form.action, {
      method: "POST",
      body: data,
      headers: { "Accept": "application/json" }
    });

    if(res.ok){
      form.reset();
      formStartTime = 0;
      delete form.dataset.started;

      statusBox.className = "status ok";
      statusBox.textContent = "Thanks! Your request was sent. I’ll reply within 24 hours.";

      if (typeof gtag === "function") {
        gtag("event", "lead_submit", {
          event_category: "form",
          event_label: chosenType || "home"
        });
      }
    } else {
      statusBox.className = "status err";
      statusBox.textContent = "Something went wrong. Please email me directly: carlleger.dev@gmail.com";
    }
  } catch(err){
    statusBox.className = "status err";
    statusBox.textContent = "Network error. Please email me directly: carlleger.dev@gmail.com";
  }
});
