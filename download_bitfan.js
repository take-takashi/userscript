// ==UserScript==
// @name         Bitfan Audio Downloader
// @namespace    https://github.com/take-takashi/userscript
// @version      0.0.1
// @description  Adds a download button for audio on ij-matome.bitfan.id
// @author       Gemini
// @match        https://ij-matome.bitfan.id/*
// @grant        none
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bitfan.id
// ==/UserScript==

(function () {
    'use strict';

    const BUTTON_ID = 'gemini-audio-download-button';

    // ダウンロードボタンを作成・表示する関数
    const createDownloadButton = (audioSrc) => {
        // 既にボタンが存在する場合は何もしない
        if (document.getElementById(BUTTON_ID)) {
            return;
        }

        // URLからクエリパラメータを除いたファイル名を取得
        const fileName = (audioSrc.split('?')[0].split('/').pop()) || 'audio.mp3';

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
