/*
  Sign-in and page content for Daniel's site.

  Login uses Supabase Auth (email and password). The accounts are the
  same users as the Logbook App project. This file does not sign anyone up.

  After sign-in, rows are read from public.site_content and drawn on the page.
  Edit that table in Supabase to change the intro and the interests.
*/

// Project URL and the publishable browser key. This key is meant to live in
// a web page. Never put a service_role or other secret key here.
const SUPABASE_URL = "https://izbjijlzbrcavvqugsqe.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_FL3syI8TEfxwg6aLqnYt5Q_l8P9sygX";

const loginPanel = document.querySelector("#login");
const profilePanel = document.querySelector("#profile");
const form = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const contentMessage = document.querySelector("#content-message");
const loginButton = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const aboutEl = document.querySelector("#about");
const interestsSection = document.querySelector("#interests-section");
const interestsEl = document.querySelector("#interests");

// Show a short message. kind "info" is a note; anything else is an error.
function showMessage(element, text, kind) {
  element.textContent = text;
  element.classList.toggle("info", kind === "info");
  element.hidden = false;
}

function hideMessage(element) {
  element.hidden = true;
  element.textContent = "";
  element.classList.remove("info");
}

// Show the form and put away anything loaded for the signed-in view.
function showLogin() {
  profilePanel.hidden = true;
  logoutButton.hidden = true;
  loginPanel.hidden = false;
  clearContent();
}

// The name stays in the header. This opens the area under it.
function showProfileShell() {
  loginPanel.hidden = true;
  profilePanel.hidden = false;
  logoutButton.hidden = false;
}

// Drop text drawn from an earlier visit so the next login starts clean.
function clearContent() {
  aboutEl.textContent = "";
  interestsEl.textContent = "";
  interestsSection.hidden = true;
  hideMessage(contentMessage);
}

// Titles and bodies from the table should be strings. Anything else is blank.
function clean(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

// The about row is the intro. Prefer body, and use title only if body is empty.
function aboutText(row) {
  const body = clean(row.body);
  if (body) {
    return body;
  }
  return clean(row.title);
}

// An interest can be stored in body, title, or both. Show the words we have.
function interestText(row) {
  const title = clean(row.title);
  const body = clean(row.body);
  if (title && body && title !== body) {
    return title + ": " + body;
  }
  return body || title;
}

// Draw database text as text only. textContent does not run HTML.
function renderContent(rows) {
  clearContent();

  rows.forEach(function (row) {
    const section = clean(row.section).toLowerCase();

    if (section === "about") {
      const text = aboutText(row);
      if (!text) {
        return;
      }
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      aboutEl.appendChild(paragraph);
      return;
    }

    if (section === "interests") {
      const text = interestText(row);
      if (!text) {
        return;
      }
      const item = document.createElement("li");
      item.textContent = text;
      interestsEl.appendChild(item);
    }
  });

  interestsSection.hidden = interestsEl.children.length === 0;

  if (!aboutEl.textContent && interestsEl.children.length === 0) {
    showMessage(contentMessage, "No intro or interests are in the content table yet.", "info");
  }
}

// Turn Supabase's error into a short sentence for the form.
function friendlyLoginError(error) {
  const code = String(error.code || "").toLowerCase();
  const raw = String(error.message || "").toLowerCase();

  if (code === "invalid_credentials" || raw.includes("invalid login")) {
    return "That email or password doesn't match. Please try again.";
  }
  if (code === "email_not_confirmed" || raw.includes("not confirmed")) {
    return "Confirm your email first, then try logging in.";
  }
  if (code.includes("rate") || raw.includes("rate limit") || raw.includes("too many")) {
    return "Too many tries. Wait a moment, then try again.";
  }
  if (raw.includes("failed to fetch") || raw.includes("network")) {
    return "Could not reach the login service. Check your connection and try again.";
  }
  return "Could not log in. Please try again.";
}

// The CDN script creates a global named supabase. Stop here if it did not load.
if (typeof supabase === "undefined" || typeof supabase.createClient !== "function") {
  showMessage(loginMessage, "The login library did not load. Check your connection and refresh the page.");
} else {
  // createClient talks to this Supabase project. It remembers a successful
  // login in the browser, so a refresh can stay signed in.
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  // Read site_content only after sign-in. Anonymous visitors are not allowed to.
  async function showContent() {
    showProfileShell();
    showMessage(contentMessage, "Loading your page…", "info");

    try {
      // sort_order matches the order of the rows in the table.
      const { data, error } = await supabaseClient
        .from("site_content")
        .select("id, section, title, body, sort_order")
        .order("sort_order");

      if (error) {
        clearContent();
        showMessage(contentMessage, "The page content could not be loaded. Try again in a moment.");
        return;
      }

      renderContent(Array.isArray(data) ? data : []);
    } catch (err) {
      clearContent();
      showMessage(contentMessage, "The page content could not be loaded. Check your connection and try again.");
    }
  }

  // Set when the form is submitted so a slow getSession cannot hide a new login.
  let signInStarted = false;

  form.addEventListener("submit", async function (event) {
    // Stay on this page. Supabase Auth checks the password; this file does not.
    event.preventDefault();
    signInStarted = true;
    hideMessage(loginMessage);

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    loginButton.disabled = true;
    loginButton.textContent = "Logging in…";

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        showMessage(loginMessage, friendlyLoginError(error));
        passwordInput.value = "";
        passwordInput.focus();
        return;
      }

      await showContent();
    } catch (err) {
      showMessage(loginMessage, "Could not reach the login service. Check your connection and try again.");
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Log in";
    }
  });

  logoutButton.addEventListener("click", async function () {
    logoutButton.disabled = true;
    const { error } = await supabaseClient.auth.signOut();
    logoutButton.disabled = false;

    if (error) {
      showMessage(contentMessage, "Could not log out. Please try again.");
      return;
    }

    form.reset();
    hideMessage(loginMessage);
    showLogin();
    emailInput.focus();
  });

  // On each visit, ask Supabase if this browser is already signed in.
  async function start() {
    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (signInStarted) {
        return;
      }
      if (error) {
        showLogin();
        showMessage(loginMessage, "Could not check the saved login. Please sign in.");
        return;
      }
      if (data.session) {
        await showContent();
        return;
      }
      showLogin();
    } catch (err) {
      showLogin();
      showMessage(loginMessage, "Could not reach the login service. Check your connection and try again.");
    }
  }

  start();
}
