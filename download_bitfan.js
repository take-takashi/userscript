// ==UserScript==
// @name         Bitfan Audio Downloader
// @namespace    https://github.com/take-takashi/userscript
// @version      0.0.4
// @description  Adds a download button for audio on ij-matome.bitfan.id
// @author       Gemini
// @match        https://ij-matome.bitfan.id/*
// @grant        GM_download
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bitfan.id
// @updateURL    https://raw.githubusercontent.com/take-takashi/userscript/main/download_bitfan.js
// @downloadURL  https://raw.githubusercontent.com/take-takashi/userscript/main/download_bitfan.js
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const BUTTON_ID = 'gemini-audio-download-button';
    let downloadButton = null;
    let downloadContext = null;

    const sanitizeFileName = (rawName, fallback = 'audio') => {
        if (!rawName) {
            return fallback;
        }

        // 半角->全角変換マップ
        const FULL_WIDTH_MAP = {
            '\\': '＼',
            '/': '／',
            ':': '：',
            '*': '＊',
            '?': '？',
            '"': '”',
            '<': '＜',
            '>': '＞',
            '|': '｜'
        };

        // Windowsなどで使えない文字を全角文字に置き換え
        const sanitized = rawName
            .replace(/[\\/:*?"<>|]/g, ch => FULL_WIDTH_MAP[ch] || '＿')
            .replace(/\s+/g, ' ')
            .trim();

        return sanitized || fallback;
    };

    const ensureDownloadButton = () => {
        if (downloadButton) {
            return downloadButton;
        }

        downloadButton = document.createElement('button');
        downloadButton.id = BUTTON_ID;
        downloadButton.textContent = '音声読み込み中...';
        downloadButton.disabled = true;

        Object.assign(downloadButton.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: '9999',
            backgroundColor: '#007bff',
            color: 'white',
            padding: '12px 18px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            textDecoration: 'none',
            fontSize: '14px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
        });

        downloadButton.addEventListener('click', () => {
            if (!downloadContext) {
                return;
            }

            startDownload(downloadContext);
        });

        const appendButton = () => {
            if (!document.body) {
                return;
            }

            if (!document.body.contains(downloadButton)) {
                document.body.appendChild(downloadButton);
                console.log('[Downloader] Placeholder button added');
            }
        };

        if (document.body) {
            appendButton();
        } else {
            document.addEventListener('DOMContentLoaded', appendButton, { once: true });
        }

        return downloadButton;
    };

    const buildDownloadDetails = (audioSrc) => {
        // URLからクエリパラメータを除いたファイル名を取得
        const rawFileName = (audioSrc.split('?')[0].split('/').pop()) || 'audio.mp3';
        const rawBaseName = rawFileName.replace(/\.[^/.]+$/, '');

        // 拡張子を取得
        const defaultExt = rawFileName.includes('.')
            ? rawFileName.substring(rawFileName.lastIndexOf('.'))
            : '.mp3';

        // サイトのタイトルを取得
        const siteNameContent = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
        const siteName = sanitizeFileName(siteNameContent, '');

        // ページのタイトルを取得
        const pageTitleContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        const pageTitle = sanitizeFileName(pageTitleContent, '');

        // ページのカテゴリを取得
        const categoryNameContent = document.querySelector('.p-clubArticle__status__category a')?.textContent;
        const categoryName = sanitizeFileName(categoryNameContent, '');

        // カテゴリに「アフタートーク」が含まれる時に放送日を入れる処理
        let airDate = '';
        if (categoryName.includes('アフタートーク')) {
            const airDateContent = document.querySelector('.p-clubArticle__summary .p-clubArticle__summary__content .p-clubArticle__summary__date')?.textContent;

            // 日付が「2025/09/17 18:00」形式のため、「2025年09月17日」に変換
            if (airDateContent) {
                const date = new Date(airDateContent);
                if (!Number.isNaN(date.getTime())) {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    airDate = `${y}年${m}月${d}日放送`;
                }
            }
        }

        // ダウンロードファイル名の組み立て
        const baseNameParts = [siteName, categoryName];
        if (airDate) {
            baseNameParts.push(airDate);
        }
        if (pageTitle) {
            baseNameParts.push(pageTitle);
        }

        const baseName = baseNameParts.filter(Boolean).join('_') || rawBaseName || 'audio';
        const sanitizedBase = sanitizeFileName(baseName, 'audio');
        const fileName = `${sanitizedBase}${defaultExt}`;

        return {
            audioSrc,
            fileName
        };
    };

    const startDownload = async ({ audioSrc, fileName }) => {
        const button = ensureDownloadButton();
        button.textContent = 'ダウンロード中...';
        button.disabled = true;

        // Tampermonkey では GM_download を優先。未対応（Greasemonkey など）なら従来の fetch+Blob にフォールバック
        const hasGMDownload = (typeof GM_download === 'function');

        if (hasGMDownload) {
            try {
                GM_download({
                    url: audioSrc,
                    name: fileName,
                    onprogress: (e) => {
                        if (e && typeof e.loaded === 'number' && typeof e.total === 'number' && e.total > 0) {
                            const pct = Math.floor((e.loaded / e.total) * 100);
                            button.textContent = `ダウンロード中... ${pct}%`;
                        }
                    },
                    onload: () => {
                        console.log('[Downloader] GM_download completed');
                        button.textContent = 'ダウンロード完了';
                        setTimeout(() => {
                            button.textContent = '音声をダウンロード';
                            button.disabled = false;
                        }, 2000);
                    },
                    onerror: (e) => {
                        console.error('[Downloader] GM_download error:', e);
                        button.textContent = 'ダウンロード失敗';
                        setTimeout(() => {
                            button.textContent = '音声をダウンロード';
                            button.disabled = false;
                        }, 3000);
                    },
                    ontimeout: () => {
                        console.error('[Downloader] GM_download timeout');
                        button.textContent = 'タイムアウト';
                        setTimeout(() => {
                            button.textContent = '音声をダウンロード';
                            button.disabled = false;
                        }, 3000);
                    }
                });
                return; // GM_download を使えた場合はここで終了
            } catch (e) {
                console.warn('[Downloader] GM_download path failed, falling back:', e);
                // 失敗時はフォールバック継続
            }
        }

        // フォールバック：fetch + Blob + a.click()（従来挙動を維持）
        try {
            const response = await fetch(audioSrc);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // ここで分かるのは「取得が完了し保存処理を開始した」まで
            button.textContent = '取得完了（保存処理を実行）';
            setTimeout(() => {
                button.textContent = '音声をダウンロード';
                button.disabled = false;
            }, 2000);
        } catch (e) {
            console.error('[Downloader] Fallback download failed:', e);
            button.textContent = 'ダウンロード失敗';
            setTimeout(() => {
                button.textContent = '音声をダウンロード';
                button.disabled = false;
            }, 3000);
        }
    };

    const activateDownloadButton = (audioSrc) => {
        const button = ensureDownloadButton();
        downloadContext = buildDownloadDetails(audioSrc);
        button.textContent = '音声をダウンロード';
        button.disabled = false;
        console.log(`[Downloader] Download button ready for: ${downloadContext.fileName}`);
        console.log(`[Downloader] Audio source: ${downloadContext.audioSrc}`)
    };

    // iframeの読み込みの前からボタン配置（読み込み中）
    ensureDownloadButton();

    // iframe内のaudioタグを探す関数
    const findAudioInIframe = () => {
        const iframe = document.querySelector('iframe');
        if (!iframe) {
            return;
        }

        const tryActivate = () => {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const source = iframeDoc.querySelector('audio source');

                if (source && source.src) {
                    activateDownloadButton(source.src);
                }
            } catch (e) {
                console.error('[Downloader] Error accessing iframe content:', e);
            }
        };

        if (iframe.contentDocument && iframe.contentDocument.readyState !== 'loading') {
            tryActivate();
        }

        // iframeの読み込み完了を待つ
        iframe.addEventListener('load', tryActivate);
    };

    // MutationObserverを使って、iframeがページに動的に追加されるのを監視
    const observer = new MutationObserver((mutations, obs) => {
        const iframe = document.querySelector('iframe');
        if (iframe) {
            findAudioInIframe();
            obs.disconnect(); // iframeを見つけたら監視を停止
        }
    });

    // 監視を開始
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 念のため、ページ読み込み完了時にもチェック
    window.addEventListener('load', findAudioInIframe);
})();
