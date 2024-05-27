// ==UserScript==
// @name         bing copilot enter fix(ime) for safari
// @namespace    https://github.com/take-takashi/userscript
// @version      0.1.2
// @description  bing copilotサイトでsafari使用時にIME変換確定時のEnterでもチャットを送信してしまうのを防ぐ。
// @author       kaerunrun
// @match        https://www.bing.com/chat*
// @icon         https://github.com/take-takashi/userscript/blob/4be5be5d621efda11e4ee5059d195d4f9c852bc4/icon/OIG3.9lM7OE1YdsLjcfwN43yA.jpeg?raw=true
// @updateURL    https://raw.githubusercontent.com/take-takashi/userscript/main/bing_enter_fix.user.js
// @grant        none
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    document.addEventListener('keydown', function (e) {
        // console.log("keydown event:", e);
        // 普通のEnterはkeyCodeが13だが、IME確定のEnterは229
        // なので229の時に動作を停止させる
        if (e.keyCode == 229) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true); // キャプチャフェーズでイベントを処理するためにtrueを指定します。
              // Specify true to handle the event in the capture phase.
})();