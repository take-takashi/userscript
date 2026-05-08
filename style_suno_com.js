// ==UserScript==
// @name         Suno Yellow Style
// @namespace    https://github.com/take-takashi/userscript
// @version      0.1.0
// @description  suno.comを黄色がかった見た目にする。
// @author       kaerunrun
// @match        https://suno.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=suno.com
// @updateURL    https://raw.githubusercontent.com/take-takashi/userscript/main/style_suno_com.js
// @downloadURL  https://raw.githubusercontent.com/take-takashi/userscript/main/style_suno_com.js
// @grant        none
// @run-at       document-start
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // Suno本体のライト/ダークテーマは維持したまま、サイト全体に黄色の色味だけを重ねる。
    const style = document.createElement('style');
    style.textContent = `
        :root {
            --accent: #c28a00 !important;
            --border-light: color-mix(in srgb, currentColor 18%, #d7a600 22%) !important;
            --border-medium: color-mix(in srgb, currentColor 28%, #d7a600 32%) !important;
        }

        html::before {
            content: "";
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            pointer-events: none;
            background:
                linear-gradient(rgba(224, 180, 45, 0.20), rgba(224, 180, 45, 0.20)),
                radial-gradient(circle at 18% 8%, rgba(255, 223, 92, 0.13), transparent 34%),
                radial-gradient(circle at 82% 0%, rgba(211, 145, 16, 0.11), transparent 30%);
            mix-blend-mode: multiply;
        }

        html::after {
            content: "";
            position: fixed;
            inset: 0;
            z-index: 2147483646;
            pointer-events: none;
            background: rgba(156, 114, 12, 0.08);
            mix-blend-mode: color;
        }

        a,
        button,
        [role="button"] {
            color: inherit;
        }

        textarea,
        input,
        [contenteditable="true"] {
            caret-color: #c28a00 !important;
        }

        ::selection {
            background: rgba(240, 190, 45, 0.35) !important;
        }
    `;

    document.documentElement.appendChild(style);
})();
