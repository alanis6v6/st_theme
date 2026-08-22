// 性別不是限制主題 - scopes the theme CSS to only this card's chat.
//
// The stylesheet in style.css is loaded globally the moment this extension is
// enabled (that's how SillyTavern's `manifest.css` loading works - see
// addExtensionStyle() in public/scripts/extensions.js), so every rule in it is
// written under `body.gnl-theme-active` and does nothing until this script
// adds that class. We add/remove it whenever the active chat changes, keyed
// off the character's exact name (the one thing that's stable and unique to
// this card, unlike avatar filenames or chat ids).
import { eventSource, event_types, getContext } from '../../../../script.js';

const TARGET_CHARACTER_NAME = '性別不是限制，性吸引力才是';
const THEME_CLASS = 'gnl-theme-active';
// Bump this alongside manifest.json's version whenever style.css changes.
// Browsers (and mobile/PWA installs especially) can keep serving a cached
// copy of this extension's style.css even after ST re-fetches index.js on
// "update extension" - the <link> href never changed, so nothing tells the
// browser the file is stale. Appending ?v=VERSION to that <link> forces a
// real re-fetch. Same technique as the sibling st-brume/foret-noire theme's
// bustStyleCache(); this extension never had it, which is the likely reason
// CSS-only edits kept appearing to do nothing after a push + extension update.
const VERSION = '1.2.0';

function bustStyleCache() {
    try {
        // This module's own directory - resolving relative to import.meta.url
        // (rather than matching on a hardcoded repo-folder name) means this
        // still works whichever folder name ST clones this extension into.
        const selfDir = new URL('.', import.meta.url).href;
        document.querySelectorAll('link[rel="stylesheet"][href*="style.css"]').forEach((link) => {
            const raw = link.getAttribute('href') || '';
            const abs = new URL(raw, document.baseURI).href;
            if (!abs.startsWith(selfDir)) return;
            if (abs.includes('v=' + VERSION)) return;
            link.setAttribute('href', raw.split('?')[0] + '?v=' + VERSION);
        });
    } catch (err) {
        console.error('[gnl-theme] failed to bust style cache', err);
    }
}

bustStyleCache();

function applyThemeState() {
    try {
        const context = getContext();
        // group chats are never this card (it's a single-character import),
        // so bail out to "not active" rather than reading characterId, which
        // is stale/meaningless while a group chat is open.
        const activeName = context.groupId
            ? null
            : context.characters?.[context.characterId]?.name;
        const isActive = activeName === TARGET_CHARACTER_NAME;
        document.body.classList.toggle(THEME_CLASS, isActive);
    } catch (err) {
        console.error('[gnl-theme] failed to evaluate the active character', err);
    }
}

eventSource.on(event_types.CHAT_CHANGED, applyThemeState);
eventSource.on(event_types.APP_READY, applyThemeState);

// Covers the case where the extension gets enabled mid-session, after
// APP_READY already fired once - without this the theme would only kick in
// after the *next* chat switch, not the one already open.
applyThemeState();
