/**
 * The product name, in one place.
 *
 * "Creator Lock" is the WORKING name, chosen in Ravi's review to replace
 * "Creator Vault". It is not final branding: the naming discussion (Content
 * Wall, Content Block, Content Lock and others) has not been settled, and
 * Amary has not approved a permanent name. Expect this to change again.
 *
 * Deliberately a plain `.ts` module with no React in it, so the dictionary in
 * src/lib/i18n and the route metadata in src/app/layout.tsx can both read it
 * without importing a component. That is the whole point: the previous rename
 * was a twelve-file sweep, and the next one should be this line.
 *
 * Not renamed alongside it, on instruction: the GitHub repository
 * (Datadetective1/creators-vault), the Vercel project, and the production
 * hostname creator-vault-inky.vercel.app.
 */
export const PRODUCT_NAME = "Creator Lock";
