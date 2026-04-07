// 初始化摇杆功能
function initJoysticks() {
    // 新增：声明定时器变量
    let gameCommandInterval = null;
    
    // 左摇杆逻辑
    const leftJoystick = document.getElementById('left-joystick');
    const leftContainer = document.getElementById('left-joystick-container');
    const leftJoyX = document.getElementById('left-joystick-x');
    const leftJoyY = document.getElementById('left-joystick-y');
    
    // 右摇杆逻辑
    const rightJoystick = document.getElementById('right-joystick');
    const rightContainer = document.getElementById('right-joystick-container');
    const rightJoyX = document.getElementById('right-joystick-x');
    const rightJoyY = document.getElementById('right-joystick-y');
    
    // 新增：检查rc值是否有非0值
    function areRcValuesNonZero() {
        return rc0 !== 0 || rc1 !== 0 || rc2 !== 0 || rc3 !== 0;
    }
    
    // 新增：启动定时更新
    function startTimer() {
        if (!gameCommandInterval) {
            // 每100ms更新一次（可根据需求调整间隔）
            gameCommandInterval = setInterval(GAME_command, 100);
        }
    }
    
    // 新增：停止定时更新
    function stopTimer() {
        if (gameCommandInterval) {
            clearInterval(gameCommandInterval);
            gameCommandInterval = null;
        }
    }
    
    // 通用摇杆控制函数（增加joystickType参数区分左右）
    function setupJoystick(joystick, container, xDisplay, yDisplay, joystickType) {
        let isDragging = false;
        
        // 重置摇杆位置
        function resetJoystick() {
            joystick.style.transform = `translate(-50%, -50%)`;
            xDisplay.textContent = '0';
            yDisplay.textContent = '0';
            if (joystickType === 'left') {
                rc3 = 0;
                rc2 = 0;
            } else {
                rc0 = 0;
                rc1 = 0;
            }
            // 检查是否需要停止定时器
            if (!areRcValuesNonZero()) {
                stopTimer();
            }
        }
        
        function startDrag(e) {
            isDragging = true;
            // 每次拖动开始时重新计算容器位置和中心
            const containerRect = container.getBoundingClientRect();
            window.joystickState = {
                centerX: containerRect.width / 2,
                centerY: containerRect.height / 2,
                maxDistance: (containerRect.width / 2) - 30,
                rect: containerRect
            };
            drag(e);
        }
        
        function drag(e) {
            if (!isDragging || !window.joystickState) return;
            
            let clientX, clientY;
            if (e.type.includes('mouse')) {
                clientX = e.clientX;
                clientY = e.clientY;
            } else {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }
            
            // 使用最新计算的容器位置
            const { rect, centerX, centerY, maxDistance } = window.joystickState;
            const x = clientX - rect.left - centerX;
            const y = clientY - rect.top - centerY;
            
            const distance = Math.sqrt(x * x + y * y);
            let limitedX = x;
            let limitedY = y;
            
            if (distance > maxDistance) {
                const ratio = maxDistance / distance;
                limitedX = x * ratio;
                limitedY = y * ratio;
            }
            
            joystick.style.transform = `translate(calc(-50% + ${limitedX}px), calc(-50% + ${limitedY}px))`;
            
            const normalizedX = Math.round((limitedX / maxDistance) * 100);
            const normalizedY = Math.round((limitedY / maxDistance) * 100);
            
            if (joystickType === 'left') {
                rc3 = normalizedX;
                rc2 = -normalizedY;
            } else {
                rc1 = normalizedX;
                rc0 = -normalizedY;
            }
            
            xDisplay.textContent = normalizedX;
            yDisplay.textContent = normalizedY;
            GAME_command();
            
            // 新增：如果有非0值则启动定时器
            if (areRcValuesNonZero()) {
                startTimer();
            } else {
                stopTimer();
            }
        }
        
        function endDrag() {
            if (isDragging) {
                isDragging = false;
                resetJoystick();
                rc0 = rc1 = rc2 = rc3 = 0;
                GAME_command();
                // 停止定时器（所有值已归零）
                stopTimer();
            }
        }
        
        // 事件绑定
        container.addEventListener('mousedown', startDrag);
        container.addEventListener('touchstart', startDrag, { passive: true });
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag, { passive: true });
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
        document.addEventListener('mouseleave', endDrag);
    }
    
    // 初始化左摇杆（传入类型'left'）
    setupJoystick(leftJoystick, leftContainer, leftJoyX, leftJoyY, 'left');
    // 初始化右摇杆（传入类型'right'）
    setupJoystick(rightJoystick, rightContainer, rightJoyX, rightJoyY, 'right');
}

function initVideoControls() {
    const statusElement = document.getElementById('status');
    const videoControls = document.querySelector('.video-controls');
    
    // 点击事件切换显示/隐藏
    statusElement.addEventListener('click', function() {
        // 判断当前是否显示摇杆
        const isShowing = videoControls.classList.contains('show-joystick');
        
        if (isShowing) {
            // 隐藏摇杆
            videoControls.classList.remove('show-joystick');
            this.textContent = '⚙️等待操作台连接'; // 恢复原文本
        } else {
            // 显示摇杆
            videoControls.classList.add('show-joystick');
            this.textContent = '🎮虚拟摇杆控制';
        }
    });
}