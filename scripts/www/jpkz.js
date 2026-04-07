// 键盘控制（添加刷新限制、窗口失焦处理和视频窗口判断）
const keysPressed = {};
let keyEnable = false;
let [nv1, nv2, nv3, nv4] = [0, 0, 0, 0];
let lastUpdateTime = 0;
//const UPDATE_INTERVAL = 80; // 刷新间隔限制（毫秒）

// 判断是否显示视频大窗口
function isVideoLargeMode() {
    return document.body.classList.contains('show-video-large');
}

function updateKeyState() {
    if (!isVideoLargeMode()) return; // 非视频大窗口模式不更新状态
    
    const STEP = 10, MIN = -100, MAX = 100;
    // 状态更新逻辑合并
    if (keysPressed.w) nv1 = Math.min(nv1 + STEP, MAX - 1);
    if (keysPressed.s) nv1 = Math.max(nv1 - STEP, MIN + 1);
    if (keysPressed.a) nv2 = Math.max(nv2 - STEP, MIN + 1);
    if (keysPressed.d) nv2 = Math.min(nv2 + STEP, MAX - 1);
    if (keysPressed.c) nv3 = Math.min(nv3 + STEP, MAX - 1);
    if (keysPressed.z) nv3 = Math.max(nv3 - STEP, MIN + 1);
    if (keysPressed.q) nv4 = Math.max(nv4 - STEP, MIN + 1);
    if (keysPressed.e) nv4 = Math.min(nv4 + STEP, MAX - 1);

    if (!keyEnable) {
        document.getElementById('right-joystick-x').textContent = nv1;
        document.getElementById('right-joystick-y').textContent = nv2;
        document.getElementById('left-joystick-x').textContent = nv3;
        document.getElementById('left-joystick-y').textContent = nv4;
    }
}

// 键盘刷新节流控制
function handleKeyUpdate() {
    if (!isVideoLargeMode()) return; // 非视频大窗口模式不处理
    
    const now = Date.now();
    if (now - lastUpdateTime >= UPDATE_INTERVAL) {
        updateKeyState();
        rc0 = nv1;
        rc1 = nv2;
        rc2 = nv3;
        rc3 = nv4;
        GAME_command();
        lastUpdateTime = now;
    }
}

// 窗口失焦处理
window.addEventListener('blur', () => {
   // console.log("窗口失焦");
    [nv1, nv2, nv3, nv4] = [0, 0, 0, 0];
    rc0 = nv1;
    rc1 = nv2;
    rc2 = nv3;
    rc3 = nv4;
   // GAME_command();
    document.getElementById('right-joystick-x').textContent = nv1;
    document.getElementById('right-joystick-y').textContent = nv2;
    document.getElementById('left-joystick-x').textContent = nv3;
    document.getElementById('left-joystick-y').textContent = nv4;
    // 清空按键状态防止失焦后仍保持按键状态
    Object.keys(keysPressed).forEach(key => {
        keysPressed[key] = false;
    });
});

// 事件监听修改
document.addEventListener('keydown', (e) => {
    if (!isVideoLargeMode()) return; // 非视频大窗口模式不响应
    
    keysPressed[e.key.toLowerCase()] = true;
    handleKeyUpdate();
});

document.addEventListener('keyup', (e) => {
    if (!isVideoLargeMode()) return; // 非视频大窗口模式不响应
    
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'c', 'z', 'q', 'e'].includes(key)) {
        keysPressed[key] = false;
        [nv1, nv2, nv3, nv4] = [0, 0, 0, 0];
        updateKeyState();
        rc0 = nv1;
        rc1 = nv2;
        rc2 = nv3;
        rc3 = nv4;
        GAME_command();
    }
});