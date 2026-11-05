# dmdolpire.github.io

Personal page for Daniel Dolpire. Edit `index.html` for the page structure and `style.css` for colors and layout. The sign-in code is in `script.js`.

Login uses Supabase Auth. Sign in with an email and password from the Logbook App project. This page has no sign-up form. After sign-in, the intro and interests load from the `site_content` table (`about` and `interests` rows). Edit that table in Supabase to change those words. The key in `script.js` is a publishable browser key, not a secret key.
