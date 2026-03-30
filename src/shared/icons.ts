/**
 * Server metadata constants — icon and website URL used in MCP initialize
 * response and .well-known/mcp.json discovery endpoint.
 */

/** Single source of truth for project website URL (also in IDENTITY.WEBSITE_URL). */
export const WEBSITE_URL = "https://github.com/heznpc/AirMCP";

// Stylized "A" with signal waves
const SERVER_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
<rect width="128" height="128" rx="28" fill="#1a1a2e"/>
<path d="M64 28L36 100h12l6-16h20l6 16h12L64 28zm-6 44l10-28 10 28H58z" fill="#e0e0ff"/>
<path d="M88 36a32 32 0 010 56" stroke="#6c63ff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".7"/>
<path d="M96 28a44 44 0 010 72" stroke="#6c63ff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".4"/>
</svg>`;

export const SERVER_ICON: { src: string; mimeType: string; sizes: string[] } = {
  src: `data:image/svg+xml;base64,${Buffer.from(SERVER_ICON_SVG).toString("base64")}`,
  mimeType: "image/svg+xml",
  sizes: ["any"],
};
