// ==UserScript==
// @name         Bitfan Audio Downloader
// @namespace    https://github.com/take-takashi/userscript
// @version      0.0.2
// @description  Adds a download button for audio on ij-matome.bitfan.id
// @author       Gemini
// @match        https://ij-matome.bitfan.id/*
// @grant        none
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bitfan.id
// @updateURL    https://raw.githubusercontent.com/take-takashi/userscript/main/download_bitfan.js
// @downloadURL  https://raw.githubusercontent.com/take-takashi/userscript/main/download_bitfan.js
// ==/UserScript==

(function () {
    'use strict';

    const BUTTON_ID = 'gemini-audio-download-button';

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

    // ダウンロードボタンを作成・表示する関数
    const createDownloadButton = (audioSrc) => {
        // 既にボタンが存在する場合は何もしない
        if (document.getElementById(BUTTON_ID)) {
            return;
        }

        // URLからクエリパラメータを除いたファイル名を取得
        const rawFileName = (audioSrc.split('?')[0].split('/').pop()) || 'audio.mp3';

        // 拡張子を取得
        const defaultExt = rawFileName.includes('.')
            ? rawFileName.substring(rawFileName.lastIndexOf('.'))
            : '.mp3';

        // サイトのタイトルを取得
        const siteNameContent = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
        const siteName = sanitizeFileName(siteNameContent, '');
        // console.log("site name = ", siteName);

        // ページのタイトルを取得
        const pageTitleContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        const pageTitle = sanitizeFileName(pageTitleContent, '');
        // console.log("page title = ", pageTitle);

        // ページのカテゴリを取得
        const categoryNameContent = document.querySelector('.p-clubArticle__status__category a')?.textContent;
        const categoryName = sanitizeFileName(categoryNameContent, '');
        // console.log("category name = ", categoryName);

        // カテゴリに「アフタートーク」が含まれる時に放送日を入れる処理
        let airDate = '';
        if (categoryName.includes('アフタートーク')) {
            const airDateContent = document.querySelector('.p-clubArticle__summary .p-clubArticle__summary__content .p-clubArticle__summary__date')?.textContent;
            // 日付が「2025/09/17 18:00」形式のため、「2025年09月17日」に変換
            const date = new Date(airDateContent);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, "0");
            const d = String(date.getDate()).padStart(2, "0");

            airDate = `${y}年${m}月${d}日放送`;
            // console.log("air date = ", airDate);
        }

        // ファイル名の分岐分岐（「アフタートーク」の時は放送日を入れる）
        const titleName = (airDate)
            ? siteName + '_' + categoryName + '_' + airDate + '_' + pageTitle + defaultExt
            : siteName + '_' + categoryName + '_' + pageTitle + defaultExt;

        // console.log("title name = ", titleName);

        const fileName = sanitizeFileName(titleName);

        // # TODO: 画像のファイル名を定義（同名）してダウンロードできるようにしたい

        // # TODO: ダウンロードボタンをLoding...の状態であらかじめ表示しておきたい


        // ダウンロード用のボタンを作成
        const downloadButton = document.createElement('button');
        downloadButton.id = BUTTON_ID;
        downloadButton.textContent = '音声をダウンロード';

        // ボタンのスタイルを設定
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

        // ボタンクリック時の動作
        downloadButton.addEventListener('click', () => {
            downloadButton.textContent = 'ダウンロード中...';
            downloadButton.disabled = true;

            fetch(audioSrc)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.blob();
                })
                .then(blob => {
                    // BlobからURLを生成
                    const url = window.URL.createObjectURL(blob);
                    // 一時的なaタグを作成してダウンロードを実行
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    // 後処理
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);

                    downloadButton.textContent = 'ダウンロード完了';
                    setTimeout(() => {
                        downloadButton.textContent = '音声をダウンロード';
                        downloadButton.disabled = false;
                    }, 2000);
                })
                .catch(e => {
                    console.error('[Downloader] Download failed:', e);
                    downloadButton.textContent = 'ダウンロード失敗';
                    setTimeout(() => {
                        downloadButton.textContent = '音声をダウンロード';
                        downloadButton.disabled = false;
                    }, 3000);
                });
        });


        // ボタンをページに追加
        document.body.appendChild(downloadButton);
        console.log(`[Downloader] Download button added for: ${fileName}`);
    };

    // iframe内のaudioタグを探す関数
    const findAudioInIframe = () => {
        const iframe = document.querySelector('iframe');
        if (!iframe) {
            return;
        }

        // iframeの読み込み完了を待つ
        iframe.addEventListener('load', () => {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const source = iframeDoc.querySelector('audio source');

                if (source && source.src) {
                    createDownloadButton(source.src);
                }
            } catch (e) {
                console.error('[Downloader] Error accessing iframe content:', e);
            }
        });
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
