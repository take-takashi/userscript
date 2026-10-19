// ==UserScript==
// @name         YouTube Auto Landscape for iPhone Safari
// @namespace    https://github.com/take-takashi/userscript
// @version      0.2.0
// @description  YouTubeの再生中に端末の横持ちを検知し、動画だけを回転させる実験版。
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @match        https://youtube.com/*
// @run-at       document-end
// @inject-into  content
// @grant        none
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const ID = 'youtube-auto-landscape-controls';
    if (window.top !== window.self || document.getElementById(ID)) return;

    const host = document.createElement('div');
    host.id = ID;
    const ui = host.attachShadow({ mode: 'open' });
    // HTML文字列を挿入せず、ページのTrusted Types制限下でも案内を作成する。
    const style = document.createElement('style');
    style.textContent = `
            :host {
                all: initial;
                position: fixed;
                top: max(8px, env(safe-area-inset-top));
                right: max(8px, env(safe-area-inset-right));
                z-index: 2147483647;
                max-width: min(280px, 80vw);
                font: 13px/1.5 -apple-system, sans-serif;
                color: white;
            }
            :host([hidden]) { display: none; }
            p { margin: 4px 0 0; padding: 4px 8px; background: #202020; border-radius: 6px; }
            p:empty { display: none; }`;
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    ui.append(style, status);
    document.documentElement.append(host);

    const styles = new Map();
    const attributes = new Map();
    let enabled = false;
    let pending = false;
    let permissionState = 'idle';
    let requestId = 0;
    let enabledAt = 0;
    let lastMotion = 0;
    let filtered = null;
    let polarity = 0;
    let angle = 0;
    let candidate = null;
    let candidateSince = 0;
    let activeVideo = null;
    let backdrop = null;

    function isWatchPage() {
        return location.pathname === '/watch' && new URLSearchParams(location.search).has('v');
    }

    function message(text) {
        if (status.textContent !== text) status.textContent = text;
        host.hidden = !isWatchPage() || text === '';
    }

    // 元の値を保存し、このスクリプトが最後に設定した値だけを戻す。
    function setStyle(element, property, value) {
        if (!styles.has(element)) styles.set(element, new Map());
        const saved = styles.get(element);
        if (!saved.has(property)) {
            saved.set(property, {
                value: element.style.getPropertyValue(property),
                priority: element.style.getPropertyPriority(property)
            });
        }
        element.style.setProperty(property, value, 'important');
        saved.get(property).applied = element.style.getPropertyValue(property);
    }

    function restore() {
        for (const [element, saved] of styles) {
            for (const [property, original] of saved) {
                if (element.style.getPropertyValue(property) !== original.applied ||
                    element.style.getPropertyPriority(property) !== 'important') continue;
                if (original.value) element.style.setProperty(property, original.value, original.priority);
                else element.style.removeProperty(property);
            }
        }
        styles.clear();
        if (activeVideo) {
            for (const [name, value] of attributes) {
                if (activeVideo.getAttribute(name) !== '') continue;
                if (value === null) activeVideo.removeAttribute(name);
                else activeVideo.setAttribute(name, value);
            }
        }
        attributes.clear();
        backdrop?.remove();
        backdrop = null;
        activeVideo = null;
    }

    function fitVideo() {
        if (!activeVideo) return;
        const viewport = window.visualViewport;
        const width = viewport?.width || window.innerWidth;
        const height = viewport?.height || window.innerHeight;
        const properties = {
            position: 'fixed',
            top: `${(viewport?.offsetTop || 0) + height / 2}px`,
            left: `${(viewport?.offsetLeft || 0) + width / 2}px`,
            right: 'auto', bottom: 'auto',
            width: `${height}px`, height: `${width}px`,
            'min-width': '0px', 'min-height': '0px',
            'max-width': 'none', 'max-height': 'none',
            'object-fit': 'contain', 'box-sizing': 'border-box',
            'margin-top': '0px', 'margin-right': '0px',
            'margin-bottom': '0px', 'margin-left': '0px',
            'padding-top': '0px', 'padding-right': '0px',
            'padding-bottom': '0px', 'padding-left': '0px',
            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
            'transform-origin': '50% 50%',
            translate: 'none', rotate: 'none', scale: 'none',
            'z-index': '2147483646', display: 'block', visibility: 'visible',
            'pointer-events': 'auto', 'background-color': 'black'
        };
        for (const [property, value] of Object.entries(properties)) setStyle(activeVideo, property, value);
    }

    function rotateVideo(video) {
        if (activeVideo !== video) {
            restore();
            activeVideo = video;
            // 動画をDOMから移動せず、親要素による固定位置と切り抜きの制約を一時的に外す。
            for (let parent = video.parentElement; parent; parent = parent.parentElement) {
                const properties = {
                    transform: 'none', translate: 'none', rotate: 'none', scale: 'none',
                    perspective: 'none', filter: 'none', 'backdrop-filter': 'none',
                    contain: 'none', 'content-visibility': 'visible', 'will-change': 'auto',
                    'overflow-x': 'visible', 'overflow-y': 'visible',
                    clip: 'auto', 'clip-path': 'none', 'z-index': '2147483646'
                };
                if (getComputedStyle(parent).position === 'static') properties.position = 'relative';
                for (const [property, value] of Object.entries(properties)) setStyle(parent, property, value);
            }
            for (const element of [document.documentElement, document.body]) {
                setStyle(element, 'overflow-x', 'hidden');
                setStyle(element, 'overflow-y', 'hidden');
            }
            for (const name of ['controls', 'playsinline', 'webkit-playsinline']) {
                attributes.set(name, video.getAttribute(name));
                video.setAttribute(name, '');
            }
            backdrop = document.createElement('div');
            backdrop.setAttribute('aria-hidden', 'true');
            backdrop.style.cssText = 'position:fixed!important;inset:0!important;background:black!important;z-index:2147483645!important;';
            document.body.append(backdrop);
        }
        fitVideo();
    }

    function reconcile() {
        const watch = isWatchPage();
        host.hidden = !watch || status.textContent === '';
        if (watch && permissionState === 'idle') startSensors(false);
        const fresh = lastMotion > 0 && performance.now() - lastMotion < 1500;
        if (enabled && !fresh && performance.now() - enabledAt > 3000) {
            message('センサーの情報を取得できません。許可とSafariの設定を確認してください。');
        }
        const video = watch ? document.querySelector('#movie_player video, #player video, ytm-player video') : null;
        if (!enabled || !watch || document.hidden || !fresh || angle === 0 ||
            window.innerWidth >= window.innerHeight || !video || video.paused || video.ended ||
            document.fullscreenElement || video.webkitDisplayingFullscreen ||
            video.webkitPresentationMode === 'fullscreen' ||
            video.webkitPresentationMode === 'picture-in-picture' || document.pictureInPictureElement) {
            restore();
            return;
        }
        rotateVideo(video);
    }

    function onMotion(event) {
        if (!enabled || document.hidden || !isWatchPage()) return;
        const gravity = event.accelerationIncludingGravity;
        if (!gravity || !Number.isFinite(gravity.x) || !Number.isFinite(gravity.y) ||
            !Number.isFinite(gravity.z)) return;
        const magnitude = Math.hypot(gravity.x, gravity.y, gravity.z);
        if (magnitude < 6 || magnitude > 13) return;
        const now = performance.now();
        if (!filtered || now - lastMotion > 1500) {
            filtered = { x: gravity.x, y: gravity.y };
            candidate = null;
            angle = 0;
        } else {
            filtered.x += (gravity.x - filtered.x) * 0.25;
            filtered.y += (gravity.y - filtered.y) * 0.25;
        }
        lastMotion = now;
        const x = Math.abs(filtered.x);
        const y = Math.abs(filtered.y);
        // 最初の縦持ちで軸の符号を合わせ、実装による重力の符号の違いを吸収する。
        if (!polarity) {
            if (y < 5 || y < x * 1.4) {
                message('端末の上を上にして、縦向きに立てて持ってください。');
                return;
            }
            polarity = Math.sign(filtered.y);
        }
        message('');
        let next = null;
        if (x >= 4.5 && x > y * 1.4) next = filtered.x * polarity > 0 ? 90 : -90;
        else if (y >= 4.5 && y > x * 1.4) next = 0;
        // 平置きや中間角度では向きを切り替えず、250msの安定した傾きを待つ。
        if (next === null) {
            candidate = null;
            return;
        }
        if (candidate !== next) {
            candidate = next;
            candidateSince = now;
        } else if (now - candidateSince >= 250 && angle !== next) {
            angle = next;
            reconcile();
        }
    }

    function resetMotion() {
        filtered = null;
        lastMotion = 0;
        angle = 0;
        candidate = null;
        restore();
    }

    function stopSensors() {
        requestId += 1;
        pending = false;
        enabled = false;
        permissionState = 'idle';
        polarity = 0;
        window.removeEventListener('devicemotion', onMotion);
        resetMotion();
        message('');
    }

    async function startSensors(fromGesture) {
        if (enabled || pending || !isWatchPage() || document.hidden ||
            permissionState === 'denied' || permissionState === 'unsupported') return;
        if (!window.isSecureContext || typeof window.DeviceMotionEvent === 'undefined') {
            permissionState = 'unsupported';
            message('この環境では端末の傾きセンサーを利用できません。');
            return;
        }
        const currentRequest = ++requestId;
        pending = true;
        permissionState = 'pending';
        try {
            // 許可済みなら自動で開始する。初回に操作が必要ならページ上のタップを待つ。
            const permission = typeof DeviceMotionEvent.requestPermission === 'function'
                ? await DeviceMotionEvent.requestPermission() : 'granted';
            if (currentRequest !== requestId) return;
            if (!isWatchPage()) {
                permissionState = 'idle';
                return;
            }
            if (permission !== 'granted') {
                permissionState = 'denied';
                message('センサーの使用が許可されませんでした。Safariのサイト設定を確認してください。');
                return;
            }
            enabled = true;
            permissionState = 'granted';
            enabledAt = performance.now();
            message('端末の上を上にして、縦向きに立てて持ってください。');
            window.addEventListener('devicemotion', onMotion, { passive: true });
        } catch (error) {
            if (currentRequest !== requestId) return;
            if (!fromGesture && error.name === 'NotAllowedError') {
                permissionState = 'gesture';
                message('初回は動画をタップして、センサーの使用を許可してください。');
            } else {
                permissionState = 'denied';
                message('センサーの許可を取得できませんでした。ページを再読み込みして試してください。');
            }
        } finally {
            if (currentRequest === requestId) pending = false;
        }
    }

    function onPageTap(event) {
        if (event.isTrusted && permissionState === 'gesture') startSensors(true);
    }

    for (const name of ['play', 'pause', 'ended', 'fullscreenchange', 'webkitbeginfullscreen',
        'webkitendfullscreen', 'enterpictureinpicture', 'leavepictureinpicture', 'webkitpresentationmodechanged']) {
        document.addEventListener(name, reconcile, true);
    }
    for (const name of ['popstate', 'yt-navigate-finish']) window.addEventListener(name, reconcile);
    document.addEventListener('visibilitychange', resetMotion);
    window.addEventListener('pagehide', stopSensors);
    window.addEventListener('pageshow', reconcile);
    // 動画の通常のタップで初回の許可を求め、追加のON操作は要求しない。
    document.addEventListener('click', onPageTap, true);
    document.addEventListener('pointerup', onPageTap, true);
    window.addEventListener('resize', reconcile);
    window.visualViewport?.addEventListener('resize', reconcile);
    window.visualViewport?.addEventListener('scroll', fitVideo);
    // YouTube内のページ移動と、再生要素の差し替えも追跡する。
    window.setInterval(reconcile, 500);
    reconcile();
})();
