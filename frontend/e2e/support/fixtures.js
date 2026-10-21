import { test as base, expect } from "@playwright/test";
import { attachBackend, Backend } from "./mockApi";

export { expect };
export { PASSWORD, TENANT, dates } from "./mockApi";

/** Pre-loads a signed-in session (legacy token mode) before the app boots. */
async function seedSession(target, backend, role) {
  await target.addInitScript(([token, user]) => {
    // Only seed once per tab so that logging out is not undone by a later reload.
    if (sessionStorage.getItem("__seeded")) return;
    sessionStorage.setItem("__seeded", "1");
    localStorage.setItem("roost_token", token);
    localStorage.setItem("roost_user", JSON.stringify(user));
  }, [backend.tokenFor(role), backend.users[role]]);
}

export const test = base.extend({
  backend: async ({}, use) => { await use(new Backend()); }, // eslint-disable-line no-empty-pattern

  page: async ({ page, backend }, use) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await attachBackend(page, backend);
    await use(page);
    expect(pageErrors, "uncaught exceptions in the browser").toEqual([]);
    expect(backend.unmocked, "API calls with no mock").toEqual([]);
  },

  /** signIn(role) seeds the default page with a session for that role. */
  signIn: async ({ page, backend }, use) => { await use((role) => seedSession(page, backend, role)); },

  /** actor(role) opens a second, independent browser tab (own storage) that shares the same backend. */
  actor: async ({ browser, baseURL, backend }, use) => {
    const contexts = [];
    await use(async (role) => {
      const context = await browser.newContext({ baseURL });
      contexts.push(context);
      const other = await context.newPage();
      await attachBackend(other, backend);
      if (role) await seedSession(other, backend, role);
      return other;
    });
    await Promise.all(contexts.map((context) => context.close()));
  },
});

/** Accepts the next native dialog and returns its message (and the text typed into prompt()). */
export function acceptNextDialog(page, promptText) {
  return new Promise((resolve) => {
    page.once("dialog", async (dialog) => {
      const message = dialog.message();
      await dialog.accept(promptText);
      resolve(message);
    });
  });
}
