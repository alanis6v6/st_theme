/* ═══════════════════════════════════════════════════════════════
   性別不是限制主題 — scopes the theme CSS to only this card's chat.

   The stylesheet in style.css is loaded globally the moment this extension
   is enabled (that's how SillyTavern's `manifest.css` loading works), so
   every rule in it is written under `body.gnl-theme-active` and does
   nothing until this script adds that class. We add/remove it whenever the
   active chat changes, keyed off the character's exact name (the one thing
   that's stable and unique to this card, unlike avatar filenames or chat
   ids).

   Rewritten to match the plumbing pattern used by the sibling
   st-brume/foret-noire theme (github.com/lubiyu0307-prog/st-brume), after
   the original version - a static `import { eventSource, event_types,
   getContext } from '../../../../script.js'` relying only on the
   CHAT_CHANGED/APP_READY events - never actually toggled the class live,
   even though a direct SillyTavern.getContext() call in the console showed
   the right character was already loaded. st-brume never imports from
   script.js at all: it reads everything through the global
   `SillyTavern.getContext()`, filters out any event name that doesn't
   exist before subscribing to it, and backs all of that with a periodic
   poll so the state self-corrects even if a specific event never fires in
   a given SillyTavern build. Doing the same here rather than continuing to
   depend on one relative import path and exactly two events firing.
   ═══════════════════════════════════════════════════════════════ */
(() => {
    'use strict';

    const TARGET_CHARACTER_NAME = '性別不是限制，性吸引力才是';
    const THEME_CLASS = 'gnl-theme-active';
    // Bump this alongside manifest.json's version whenever style.css
    // changes. Browsers (and mobile/PWA installs especially) can keep
    // serving a cached copy of this extension's style.css even after ST
    // re-fetches index.js on "update extension" - the <link> href never
    // changed, so nothing tells the browser the file is stale. Appending
    // ?v=VERSION to that <link> forces a real re-fetch.
    const VERSION = '1.3.0';

    function getContext() {
        try {
            if (typeof SillyTavern !== 'undefined' && typeof SillyTavern.getContext === 'function') {
                return SillyTavern.getContext();
            }
        } catch (_) { /* very old ST build without the global */ }
        return null;
    }

    function bustStyleCache() {
        try {
            // This module's own directory - resolving relative to
            // import.meta.url (rather than matching on a hardcoded
            // repo-folder name) means this still works whichever folder
            // name ST clones this extension into.
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

    function applyThemeState() {
        try {
            const context = getContext();
            if (!context) return;
            // group chats are never this card (it's a single-character
            // import), so bail out to "not active" rather than reading
            // characterId, which is stale/meaningless while a group chat
            // is open.
            const activeName = context.groupId
                ? null
                : context.characters?.[context.characterId]?.name;
            const isActive = activeName === TARGET_CHARACTER_NAME;
            document.body.classList.toggle(THEME_CLASS, isActive);
        } catch (err) {
            console.error('[gnl-theme] failed to evaluate the active character', err);
        }
    }

    function hookEvents() {
        try {
            const ctx = getContext();
            if (ctx && ctx.eventSource && ctx.event_types) {
                [ctx.event_types.CHAT_CHANGED, ctx.event_types.APP_READY,
                 ctx.event_types.CHARACTER_EDITED, ctx.event_types.GROUP_UPDATED]
                    .filter(Boolean)
                    .forEach((e) => ctx.eventSource.on(e, applyThemeState));
            }
        } catch (err) {
            console.error('[gnl-theme] failed to hook events', err);
        }
        // Safety net: whatever event does or doesn't fire on this
        // particular SillyTavern build, this guarantees the class is never
        // wrong for more than a second - the same belt-and-braces polling
        // st-brume uses for its own live state.
        setInterval(applyThemeState, 1000);
    }

    function init() {
        bustStyleCache();
        hookEvents();
        applyThemeState();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
