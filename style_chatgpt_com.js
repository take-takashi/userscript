// ==UserScript==
// @name         ChatGPT Green Style
// @namespace    https://github.com/take-takashi/userscript
// @version      0.1.0
// @description  chatgpt.comを緑がかった見た目にする。
// @author       kaerunrun
// @match        https://chatgpt.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chatgpt.com
// @updateURL    https://raw.githubusercontent.com/take-takashi/userscript/main/style_chatgpt_com.js
// @downloadURL  https://raw.githubusercontent.com/take-takashi/userscript/main/style_chatgpt_com.js
// @grant        none
// @run-at       document-start
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    const SEND_BUTTON_SELECTOR = 'button[data-testid="send-button"]';

    // ChatGPT本体のテーマは維持したまま、サイト全体に緑の色味だけを重ねる。
    const style = document.createElement('style');
    style.textContent = `
        :root {
            --accent: #16833a !important;
            --border-light: color-mix(in srgb, currentColor 18%, #2aa84f 20%) !important;
            --border-medium: color-mix(in srgb, currentColor 28%, #2aa84f 28%) !important;
        }

        html::before {
            content: "";
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            pointer-events: none;
            background:
                linear-gradient(rgba(93, 180, 103, 0.22), rgba(93, 180, 103, 0.22)),
                radial-gradient(circle at 16% 10%, rgba(137, 220, 132, 0.13), transparent 34%),
                radial-gradient(circle at 80% 0%, rgba(51, 170, 83, 0.11), transparent 30%);
            mix-blend-mode: multiply;
        }

        html::after {
            content: "";
            position: fixed;
            inset: 0;
            z-index: 2147483646;
            pointer-events: none;
            background: rgba(56, 132, 66, 0.08);
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
            caret-color: #16833a !important;
        }

        ::selection {
            background: rgba(90, 220, 126, 0.35) !important;
        }
    `;

    document.documentElement.appendChild(style);

    // 入力欄で押されたキーだけを横取りし、Enter系の挙動を自分用に置き換える。
    document.addEventListener('keydown', function(e) {
        if (!isPromptInput(e.target)) {
            return;
        }

        // IME変換中のEnterは日本語入力の確定なので、送信・改行の置き換え対象にしない。
        if (e.isComposing || e.keyCode === 229) {
            return;
        }

        const isEnter = e.key === 'Enter';
        const isCtrlJ = e.key.toLowerCase() === 'j' && e.ctrlKey && !e.metaKey && !e.altKey;

        // Cmd+Enter / Ctrl+Enter は、送信ボタンを押すことで現在の入力内容を送信する。
        if (isEnter && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            submitPrompt(e.target);
            return;
        }

        // Shift+Enter はChatGPT標準の改行なので、そのまま通す。
        if (isEnter && e.shiftKey) {
            return;
        }

        // 単独Enter / Ctrl+j は、ChatGPT標準のShift+Enter改行として入力欄へ送り直す。
        if ((isEnter && !e.metaKey && !e.ctrlKey && !e.altKey) || isCtrlJ) {
            e.preventDefault();
            e.stopImmediatePropagation();
            sendShiftEnter(e.target);
        }
    }, true);

    // ChatGPTのプロンプト入力欄だけを対象にして、他の編集可能領域には干渉しない。
    function isPromptInput(target) {
        if (!(target instanceof HTMLElement)) {
            return false;
        }

        const editable = target.closest('textarea, [contenteditable="true"], [role="textbox"]');
        if (!editable) {
            return false;
        }

        return Boolean(
            editable.closest('form') ||
            editable.id === 'prompt-textarea' ||
            editable.getAttribute('data-testid') === 'prompt-textarea'
        );
    }

    // 改行はDOMを直接書き換えず、ChatGPTが元から解釈しているShift+Enterとして再送する。
    function sendShiftEnter(target) {
        target.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
            composed: true,
            shiftKey: true
        }));
    }

    // 送信はChatGPT公式UIの送信ボタンだけをクリックする。見つからない場合は何もしない。
    function submitPrompt(target) {
        const form = target.closest('form');
        const sendButton = form ? form.querySelector(SEND_BUTTON_SELECTOR) : null;

        if (!sendButton || sendButton.disabled || sendButton.getAttribute('aria-disabled') === 'true') {
            return;
        }

        sendButton.click();
    }
})();
