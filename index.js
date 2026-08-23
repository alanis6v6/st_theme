/* ═══════════════════════════════════════════════════════════════
   Gilded Desire — scopes the theme CSS to only this card's chat.

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

    const TARGET_CHARACTER_NAME = '風停之前，誰先說愛我';
    const THEME_CLASS = 'gnl-theme-active';
    const SETTINGS_KEY = 'gnl_theme';
    // Bump this alongside manifest.json's version whenever style.css
    // changes. Browsers (and mobile/PWA installs especially) can keep
    // serving a cached copy of this extension's style.css even after ST
    // re-fetches index.js on "update extension" - the <link> href never
    // changed, so nothing tells the browser the file is stale. Appending
    // ?v=VERSION to that <link> forces a real re-fetch.
    const VERSION = '1.11.0';

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

    function getSettings(context) {
        if (!context.extensionSettings) return { applyGlobally: false };
        if (!context.extensionSettings[SETTINGS_KEY]) {
            context.extensionSettings[SETTINGS_KEY] = { applyGlobally: false };
        }
        return context.extensionSettings[SETTINGS_KEY];
    }

    function applyThemeState() {
        try {
            const context = getContext();
            if (!context) return;
            const settings = getSettings(context);
            // group chats are never this card (it's a single-character
            // import), so bail out to "not active" rather than reading
            // characterId, which is stale/meaningless while a group chat
            // is open.
            const activeName = context.groupId
                ? null
                : context.characters?.[context.characterId]?.name;
            const isActive = !!settings.applyGlobally || activeName === TARGET_CHARACTER_NAME;
            document.body.classList.toggle(THEME_CLASS, isActive);
        } catch (err) {
            console.error('[gnl-theme] failed to evaluate the active character', err);
        }
    }

    // Settings panel: a single "apply globally" checkbox under Extensions,
    // letting the theme run in every chat instead of only this card's.
    // Injected into #extensions_settings2 the same way most ST extensions
    // add their settings block; the container may not exist yet on the
    // very first tick of a fresh page load, so this is retried a few times
    // from init() rather than assumed to succeed immediately.
    function buildSettingsPanel() {
        if (document.getElementById('gnl_theme_settings')) return true;
        const container = document.getElementById('extensions_settings2')
            || document.getElementById('extensions_settings');
        const context = getContext();
        if (!container || !context) return false;

        const settings = getSettings(context);
        const wrapper = document.createElement('div');
        wrapper.id = 'gnl_theme_settings';
        wrapper.innerHTML =
            '<div class="inline-drawer">' +
            '  <div class="inline-drawer-toggle inline-drawer-header">' +
            '    <b>Gilded Desire</b>' +
            '    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>' +
            '  </div>' +
            '  <div class="inline-drawer-content">' +
            '    <label class="checkbox_label" for="gnl_theme_apply_globally">' +
            '      <input id="gnl_theme_apply_globally" type="checkbox" />' +
            '      <span>套用到全域（不限這張卡，所有聊天都套用這個主題）</span>' +
            '    </label>' +
            '  </div>' +
            '</div>';
        container.appendChild(wrapper);

        const checkbox = wrapper.querySelector('#gnl_theme_apply_globally');
        checkbox.checked = !!settings.applyGlobally;
        checkbox.addEventListener('change', () => {
            settings.applyGlobally = checkbox.checked;
            if (typeof context.saveSettingsDebounced === 'function') context.saveSettingsDebounced();
            applyThemeState();
        });
        return true;
    }

    // Memory Books' own job panel (#top_chat_stmb_jobs) has no built-in
    // collapse. This adds one on top of its existing markup: a chevron in
    // the header, toggling a class that style.css uses to hide the action
    // buttons and job rows while leaving the header/summary visible. The
    // panel is created lazily by Memory Books (only once its jobs feature
    // initializes), so this is re-checked on the same poll as
    // applyThemeState rather than run once - it's a no-op once already
    // enhanced (guarded by the data-gnl-enhanced marker).
    function enhanceJobsPanel() {
        try {
            const panel = document.getElementById('top_chat_stmb_jobs');
            if (!panel) return;
            const header = panel.querySelector('.stmb-jobs-panel-header');
            if (!header || header.dataset.gnlEnhanced) return;
            header.dataset.gnlEnhanced = '1';
            const toggle = document.createElement('i');
            toggle.className = 'fa-solid fa-chevron-down gnl-jobs-toggle';
            header.appendChild(toggle);
            header.addEventListener('click', () => {
                panel.classList.toggle('gnl-jobs-collapsed');
            });
        } catch (err) {
            console.error('[gnl-theme] failed to enhance jobs panel', err);
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
        // st-brume uses for its own live state. Also covers enhanceJobsPanel,
        // which has no event to hook at all (Memory Books doesn't announce
        // when its panel gets created).
        setInterval(() => {
            applyThemeState();
            enhanceJobsPanel();
        }, 1000);
    }

    function init() {
        bustStyleCache();
        hookEvents();
        applyThemeState();
        enhanceJobsPanel();
        // The extensions settings container isn't always mounted yet the
        // moment this script first runs - retry briefly rather than
        // silently giving up on ever showing the "apply globally" toggle.
        if (!buildSettingsPanel()) {
            let tries = 0;
            const retry = setInterval(() => {
                if (buildSettingsPanel() || ++tries > 20) clearInterval(retry);
            }, 500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
