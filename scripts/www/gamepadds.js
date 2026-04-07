//*************游戏摇杆部分20250305********************//

let gamepad;
let prevButtons = [];
let prevAxes = [];
let animationFrame; // 存储动画帧ID，用于停止polling
let gameCommandInterval = null; // 新增：存储GAME_command的定时器ID
// 状态存储对象
let gamepadStatus = {
    buttons: '未检测到按钮变化',
    axes: '未检测到摇杆变化'
};
const AXIS_THRESHOLD = 0.01; // 摇杆灵敏度阈值
const UPDATE_INTERVAL = 100; // 定时更新间隔(ms)，可根据需求调整

// 新增：检查是否需要启动/停止定时更新
function checkAndSetInterval() {
    // 判断是否有任一值不为0
    const hasNonZero = rc0 !== 0 || rc1 !== 0 || rc2 !== 0 || rc3 !== 0;
    
    // 如果有非零值且定时器未启动，则启动定时器
    if (hasNonZero && !gameCommandInterval) {
        gameCommandInterval = setInterval(() => {
            GAME_command();
        }, UPDATE_INTERVAL);
    }
    // 如果所有值都为0且定时器已启动，则停止定时器
    else if (!hasNonZero && gameCommandInterval) {
        clearInterval(gameCommandInterval);
        gameCommandInterval = null;
    }
}

window.addEventListener("gamepadconnected", function (e) {
    gamepad = navigator.getGamepads()[e.gamepad.index];
    document.getElementById("status").innerText = "手柄已连接: " + e.gamepad.id;
    startPolling();
});

window.addEventListener("gamepaddisconnected", function (e) {
    document.getElementById("status").innerText = "手柄已断开";
    gamepad = null; // 手柄断开时置空
    cancelAnimationFrame(animationFrame); // 停止polling
	 
    rc0 = 0;
    rc1 = 0;
    rc2 = 0;
    rc3 = 0;
    GAME_command();
    checkAndSetInterval(); // 新增：手柄断开后检查是否需要停止定时器
});

function startPolling() {
    function updateStatus() {
        // 检查手柄是否有效
        if (!gamepad) {
            cancelAnimationFrame(animationFrame); // 无效则停止更新
            return;
        }
        // 获取当前手柄状态（可能为null，需再次检查）
        const currentGamepad = navigator.getGamepads()[gamepad.index];
        if (!currentGamepad) {
            cancelAnimationFrame(animationFrame);
            return;
        }
        // 只有有效时才检查按钮和摇杆
        checkButtons(currentGamepad);
        checkAxes(currentGamepad);
        animationFrame = requestAnimationFrame(updateStatus);
    }

    animationFrame = requestAnimationFrame(updateStatus); // 初始化动画帧
}

// 统一更新函数
function updateStatusDisplay() {
    document.getElementById("status").innerHTML =
        `手柄已连接：<br/>
     按钮：${gamepadStatus.buttons}<br/>
     摇杆：${gamepadStatus.axes}`;
}

// 改造后的按键和摇杆检测模块
function checkButtons(currentGamepad) {
    let statusChanged = false;
    // 确保currentGamepad.buttons存在
    if (!currentGamepad.buttons) return;
    
    currentGamepad.buttons.forEach((button, indexb) => {
        if (button.pressed !== prevButtons[indexb]) {
            const actionb = button.pressed ? "1" : "0";
            gamepadStatus.buttons = `按钮 ${indexb} ${actionb}`;
            statusChanged = true;
        }
    });

    if (statusChanged) updateStatusDisplay();
    prevButtons = currentGamepad.buttons.map(btn => btn.pressed);
}

function checkAxes(currentGamepad) {
    let statusChanged = false;
    // 确保currentGamepad.axes存在
    if (!currentGamepad.axes) return;
    
    currentGamepad.axes.forEach((axis, index) => {
        const delta = Math.abs(axis - prevAxes[index]);
        if (delta > AXIS_THRESHOLD) {
            const stick = (index < 2) ? "左摇杆" : "右摇杆";
            const axisType = (index % 2 === 0) ? "X轴" : "Y轴";
            gamepadStatus.axes = `${stick} ${axisType}: ${axis.toFixed(2)}`;
            
            // 摇杆数据处理
            if (index == 0) {
                rc3 = Math.round(axis.toFixed(2) * 100 );
            } else if (index == 1) {
                rc2 = -Math.round(axis.toFixed(2) * 100 );
            } else if (index == 2) {
                rc1 = Math.round(axis.toFixed(2) * 100);
            } else if (index == 3) {
                rc0 = -Math.round(axis.toFixed(2) * 100);
            }

            document.getElementById('left-joystick-x').textContent = rc0;
            document.getElementById('left-joystick-y').textContent = rc1;
            document.getElementById('right-joystick-x').textContent = rc2;
            document.getElementById('right-joystick-y').textContent = rc3;
            GAME_command(); // 即时更新一次
            statusChanged = true;
        }
    });

    if (statusChanged) updateStatusDisplay();
    prevAxes = [...currentGamepad.axes];
    checkAndSetInterval(); // 新增：每次摇杆数据更新后检查是否需要定时更新
}

//*************游戏摇杆部分20250305end********************//