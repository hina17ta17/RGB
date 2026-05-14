// DOM要素の取得
const redSlider = document.getElementById('redSlider');
const greenSlider = document.getElementById('greenSlider');
const blueSlider = document.getElementById('blueSlider');

const redValue = document.getElementById('redValue');
const greenValue = document.getElementById('greenValue');
const blueValue = document.getElementById('blueValue');

const colorPreview = document.getElementById('colorPreview');
const rgbDisplay = document.getElementById('rgbDisplay');
const hexDisplay = document.getElementById('hexDisplay');

const randomBtn = document.getElementById('randomBtn');
const presetBtns = document.querySelectorAll('.preset-btn');

// 初期化
initializeColorSimulator();

// リスナーの設定
redSlider.addEventListener('input', updateColor);
greenSlider.addEventListener('input', updateColor);
blueSlider.addEventListener('input', updateColor);

randomBtn.addEventListener('click', generateRandomColor);

presetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const [r, g, b] = e.target.dataset.color.split(',').map(Number);
        setRGBValues(r, g, b);
        updateColor();
    });
});

hexDisplay.addEventListener('click', copyToClipboard);

/**
 * カラーシミュレーターの初期化
 */
function initializeColorSimulator() {
    updateColor();
}

/**
 * RGB値の取得
 */
function getRGBValues() {
    return {
        r: parseInt(redSlider.value),
        g: parseInt(greenSlider.value),
        b: parseInt(blueSlider.value)
    };
}

/**
 * RGB値を設定
 */
function setRGBValues(r, g, b) {
    redSlider.value = r;
    greenSlider.value = g;
    blueSlider.value = b;
}

/**
 * RGB値をHEXコードに変換
 */
function rgbToHex(r, g, b) {
    const toHex = (n) => {
        const hex = n.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * 色を更新
 */
function updateColor() {
    const { r, g, b } = getRGBValues();

    // スライダー値を更新
    redValue.textContent = r;
    greenValue.textContent = g;
    blueValue.textContent = b;

    // RGB表示を更新
    const rgbString = `RGB(${r}, ${g}, ${b})`;
    rgbDisplay.textContent = rgbString;

    // HEX表示を更新
    const hexString = rgbToHex(r, g, b);
    hexDisplay.textContent = hexString;

    // プレビューの背景色を更新
    const rgbColor = `rgb(${r}, ${g}, ${b})`;
    colorPreview.style.backgroundColor = rgbColor;

    // ページ背景をグラデーションで更新
    updateBackgroundGradient(r, g, b);
}

/**
 * 背景グラデーションを更新
 */
function updateBackgroundGradient(r, g, b) {
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    if (brightness > 128) {
        // 明るい色の場合：黒っぽいグラデーションから色へ
        document.body.style.background = `linear-gradient(135deg, #1a1a2e 0%, rgb(${r * 0.5}, ${g * 0.5}, ${b * 0.5}) 100%)`;
    } else {
        // 暗い色の場合：色から元の暗いグラデーションへ
        document.body.style.background = `linear-gradient(135deg, rgb(${r * 0.6}, ${g * 0.6}, ${b * 0.6}) 0%, #16213e 100%)`;
    }
}

/**
 * ランダムカラーを生成
 */
function generateRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);

    setRGBValues(r, g, b);
    updateColor();
}

/**
 * HEXコードをクリップボードにコピー
 */
function copyToClipboard() {
    const hexCode = hexDisplay.textContent;

    // クリップボードにコピー
    navigator.clipboard.writeText(hexCode).then(() => {
        // コピー成功メッセージを表示
        showCopyMessage();
    }).catch((err) => {
        console.error('クリップボードへのコピーに失敗しました:', err);
    });
}

/**
 * コピー通知を表示
 */
function showCopyMessage() {
    const message = document.createElement('div');
    message.className = 'copy-message';
    message.textContent = 'Copied!';
    document.body.appendChild(message);

    // アニメーション完了後に削除
    setTimeout(() => {
        message.remove();
    }, 2000);
}

/**
 * キーボードショートカット（Enterキーでランダムカラー生成）
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        generateRandomColor();
    }
});

/**
 * タッチデバイスのサポート
 */
if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
    // タッチデバイスではホバーエフェクトを簡略化
    document.querySelectorAll('.btn, .preset-btn').forEach(btn => {
        btn.style.transition = 'all 0.1s ease';
    });
}
