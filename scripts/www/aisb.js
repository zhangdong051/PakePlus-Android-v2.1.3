// AI识别核心模块（TensorFlow.js + COCO-SSD 版本）
// 优化方向：性能提升、错误处理增强、内存管理优化、交互体验提升

// ===================== 配置常量 =====================
const AI_CONFIG = {
    DETECTION_INTERVAL: 200,          // 检测间隔(ms)
    MIN_CONFIDENCE: 0.5,              // 最小置信度阈值
    TRACKING_IOU_THRESHOLD: 0.3,      // 跟踪IoU匹配阈值
    TRACKING_TIMEOUT: 6000,           // 跟踪超时时间(ms)
    BOX_STYLE: {                      // 检测框样式配置
        borderColor: '#00ff00',
        bgColor: 'rgba(0, 255, 0, 0.2)',
        fontSize: '12px',
        borderWidth: '2px',
        zIndex: 9999
    }
};

// ===================== 全局状态管理 =====================
const AI_STATE = {
    isAiDetectionEnabled: false,      // AI识别启用状态
    detectionInterval: null,          // 检测定时器
    videoFrame: null,                 // 视频元素缓存
    cocoModel: null,                  // COCO-SSD模型实例
    trackedTarget: null,              // 当前跟踪目标 { class, bbox, lastSeen }
    lastPredictions: [],              // 上一帧检测结果（用于优化绘制）
    detectionBoxes: new Map(),        // 检测框缓存（避免重复创建）
    isModelLoading: false             // 模型加载状态
};

// ===================== 工具函数 =====================
/**
 * 计算两个边界框的交并比(IoU)
 * @param {number[]} bbox1 - [x, y, width, height]
 * @param {number[]} bbox2 - [x, y, width, height]
 * @returns {number} IoU值
 */
function computeIoU(bbox1, bbox2) {
    if (!bbox1 || !bbox2 || bbox1.length !== 4 || bbox2.length !== 4) return 0;
    
    const [x1, y1, w1, h1] = bbox1;
    const [x2, y2, w2, h2] = bbox2;

    // 计算交集区域
    const interX1 = Math.max(x1, x2);
    const interY1 = Math.max(y1, y2);
    const interX2 = Math.min(x1 + w1, x2 + w2);
    const interY2 = Math.min(y1 + h1, y2 + h2);

    const interArea = Math.max(0, interX2 - interX1) * Math.max(0, interY2 - interY1);
    const bbox1Area = w1 * h1;
    const bbox2Area = w2 * h2;
    const unionArea = bbox1Area + bbox2Area - interArea;

    return unionArea === 0 ? 0 : interArea / unionArea;
}

/**
 * 显示临时提示信息
 * @param {string} message - 提示内容
 * @param {number} duration - 显示时长(ms)
 */
function showTempMessage(message, duration = 2000) {
    console.log(`[AI检测] ${message}`);
    // 可扩展：页面提示DOM渲染逻辑
}

/**
 * 防抖函数
 * @param {Function} fn - 执行函数
 * @param {number} delay - 延迟时间
 * @returns {Function} 防抖后的函数
 */
function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ===================== 核心功能函数 =====================
/**
 * 初始化COCO-SSD模型
 */
async function initCocoModel() {
    if (AI_STATE.isModelLoading || AI_STATE.cocoModel) return;
    
    AI_STATE.isModelLoading = true;
    try {
        showTempMessage("开始加载SSD模型");
        // 增加模型加载超时处理
        const modelLoadPromise = cocoSsd.load();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('模型加载超时')), 15000)
        );
        
        AI_STATE.cocoModel = await Promise.race([modelLoadPromise, timeoutPromise]);
        showTempMessage("SSD模型加载完成");
    } catch (e) {
        console.error("COCO-SSD模型加载失败：", e);
        alert(`AI识别初始化失败：${e.message}，请检查网络后刷新页面`);
    } finally {
        AI_STATE.isModelLoading = false;
    }
}

/**
 * 清除所有检测框
 */
function clearDetectionBoxes() {
    AI_STATE.detectionBoxes.forEach(box => {
        try { box.remove(); } catch (e) {}
    });
    AI_STATE.detectionBoxes.clear();
    
    // 兜底清理DOM中残留的检测框
    document.querySelectorAll('[data-detection-box]').forEach(box => {
        try { box.remove(); } catch (e) {}
    });
}

/**
 * 绘制检测框
 * @param {number} x - 原始X坐标
 * @param {number} y - 原始Y坐标
 * @param {number} width - 原始宽度
 * @param {number} height - 原始高度
 * @param {string} label - 显示标签
 * @param {number[]} originalBbox - 原始边界框
 */
function drawDetectionBox(x, y, width, height, label, originalBbox) {
    const videoContainer = document.getElementById('large-video-container');
    if (!videoContainer) {
        console.error("绘制检测框失败：未找到large-video-container容器");
        return;
    }

    // 设置容器基础样式（仅首次）
    if (getComputedStyle(videoContainer).position === 'static') {
        videoContainer.style.position = 'relative';
    }
    videoContainer.style.zIndex = '100';
    videoContainer.style.pointerEvents = 'auto';

    const video = videoContainer.querySelector('video');
    if (!video) {
        console.error("绘制检测框失败：容器内未找到video元素");
        return;
    }

    // 计算缩放比例（避免除以0）
    const videoWidth = video.videoWidth || video.clientWidth || 1;
    const videoHeight = video.videoHeight || video.clientHeight || 1;
    const scaleX = videoContainer.clientWidth / videoWidth;
    const scaleY = videoContainer.clientHeight / videoHeight;

    // 计算绘制坐标（边界保护）
    const boxLeft = Math.max(0, Math.floor(x * scaleX));
    const boxTop = Math.max(0, Math.floor(y * scaleY));
    const boxWidth = Math.max(0, Math.floor(width * scaleX));
    const boxHeight = Math.max(0, Math.floor(height * scaleY));

    // 生成唯一标识（避免重复绘制）
    const boxKey = `${boxLeft}-${boxTop}-${boxWidth}-${boxHeight}-${label}`;
    
    // 如果已有相同框，更新即可
    if (AI_STATE.detectionBoxes.has(boxKey)) {
        const existingBox = AI_STATE.detectionBoxes.get(boxKey);
        existingBox.textContent = label;
        return;
    }

    // 创建新检测框
    const box = document.createElement('div');
    box.className = 'ai-detection-box';
    box.dataset.detectionBox = true;
    box.dataset.boxKey = boxKey;
    
    // 样式优化：使用CSS变量+避免!important过度使用
    box.style.cssText = `
        position: absolute;
        left: ${boxLeft}px;
        top: ${boxTop}px;
        width: ${boxWidth}px;
        height: ${boxHeight}px;
        border: ${AI_CONFIG.BOX_STYLE.borderWidth} solid ${AI_CONFIG.BOX_STYLE.borderColor};
        background-color: ${AI_CONFIG.BOX_STYLE.bgColor};
        color: white;
        font-size: ${AI_CONFIG.BOX_STYLE.fontSize};
        font-weight: bold;
        z-index: ${AI_CONFIG.BOX_STYLE.zIndex};
        padding: 2px 5px;
        box-sizing: border-box;
        cursor: pointer;
        pointer-events: auto;
        user-select: none;
        transition: all 0.1s ease;
    `;
    box.textContent = label;

    // 点击跟踪事件（增加防抖）
    const handleTrackClick = debounce(function(e) {
        e.stopImmediatePropagation();
        e.preventDefault();

        const targetClass = label.split(' ')[0];
        AI_STATE.trackedTarget = {
            class: targetClass,
            bbox: [...originalBbox], // 解构拷贝
            lastSeen: Date.now()
        };
        
        // 视觉反馈：高亮跟踪框
        AI_STATE.detectionBoxes.forEach(b => {
            b.style.borderColor = AI_CONFIG.BOX_STYLE.borderColor;
            b.style.backgroundColor = AI_CONFIG.BOX_STYLE.bgColor;
        });
        box.style.borderColor = '#ff0000';
        box.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';

        console.log(`开始跟踪目标：${targetClass}，原始坐标: [${originalBbox.map(v => v.toFixed(1))}]`);
    }, 200);
    
    box.addEventListener('click', handleTrackClick, { capture: true, once: false });

    // 缓存并添加到DOM
    AI_STATE.detectionBoxes.set(boxKey, box);
    videoContainer.appendChild(box);

    // 清理超出视口的旧框
    Array.from(AI_STATE.detectionBoxes.entries()).forEach(([key, oldBox]) => {
        if (key !== boxKey && 
            oldBox.offsetParent === null) {
            oldBox.remove();
            AI_STATE.detectionBoxes.delete(key);
        }
    });
}

/**
 * 单帧检测处理
 */
async function detectSingleFrame() {
    // 状态检查：快速失败
    if (!AI_STATE.isAiDetectionEnabled || 
        !AI_STATE.videoFrame || 
        AI_STATE.videoFrame.paused || 
        AI_STATE.videoFrame.readyState !== 4 ||
        !AI_STATE.cocoModel) {
        return;
    }

    try {
        const predictions = await AI_STATE.cocoModel.detect(AI_STATE.videoFrame);
        // 过滤低置信度结果
        const validPredictions = predictions.filter(p => p.score >= AI_CONFIG.MIN_CONFIDENCE);

        // ===================== 目标跟踪处理 =====================
			// ===================== 目标跟踪处理（支持丢失后自动恢复） =====================
			if (AI_STATE.trackedTarget) {
				let bestMatch = null;
				let bestIoU = 0;

				// 同类别搜索最佳匹配
				for (const pred of validPredictions) {
					if (pred.class !== AI_STATE.trackedTarget.class) continue;
					const iou = computeIoU(AI_STATE.trackedTarget.bbox, pred.bbox);
					if (iou > bestIoU && iou > AI_CONFIG.TRACKING_IOU_THRESHOLD) {
						bestIoU = iou;
						bestMatch = pred;
					}
				}

				if (bestMatch) {
					// 找到目标：更新位置 + 刷新时间
					AI_STATE.trackedTarget.bbox = bestMatch.bbox;
					AI_STATE.trackedTarget.lastSeen = Date.now();
					AI_STATE.trackedTarget.isLost = false; // 恢复正常

					const [x, y, w, h] = bestMatch.bbox;
					const centerX = (x + w / 2).toFixed(1);
					const centerY = (y + h / 2).toFixed(1);
					console.log(`✅ 跟踪中 [${AI_STATE.trackedTarget.class}] 中心: (${centerX}, ${centerY})`);
				} else {
					// 未找到：判断是否首次丢失
					if (!AI_STATE.trackedTarget.isLost) {
						AI_STATE.trackedTarget.isLost = true;
						console.log(`⚠️ 目标丢失，正在自动重新搜索：${AI_STATE.trackedTarget.class}`);
					}

					// 超过超时时间才真正放弃（可永久搜索，去掉这段即可）
					if (Date.now() - AI_STATE.trackedTarget.lastSeen > AI_CONFIG.TRACKING_TIMEOUT) {
						console.log(`❌ 目标丢失超时，停止跟踪：${AI_STATE.trackedTarget.class}`);
						AI_STATE.trackedTarget = null;
					}
				}
			}

        // ===================== 检测框绘制 =====================
        // 优化：仅当检测结果变化时更新绘制
        const currentPredictionsKey = JSON.stringify(
            validPredictions.map(p => [p.class, p.score.toFixed(3), p.bbox.map(v => v.toFixed(1))])
        );
        const lastPredictionsKey = JSON.stringify(
            AI_STATE.lastPredictions.map(p => [p.class, p.score.toFixed(3), p.bbox.map(v => v.toFixed(1))])
        );

        if (currentPredictionsKey !== lastPredictionsKey) {
            clearDetectionBoxes();
            AI_STATE.lastPredictions = validPredictions;
            
            // 批量绘制检测框
            validPredictions.forEach(pred => {
                drawDetectionBox(
                    pred.bbox[0],
                    pred.bbox[1],
                    pred.bbox[2],
                    pred.bbox[3],
                    `${pred.class} (${(pred.score * 100).toFixed(1)}%)`,
                    pred.bbox
                );
            });
        }

    } catch (e) {
        console.error("AI识别帧处理出错：", e);
        // 非致命错误不停止检测，仅记录日志
    }
}

/**
 * 启动AI检测循环
 */
function startAiDetection() {
    if (AI_STATE.detectionInterval) return;
    
    // 使用requestAnimationFrame优化帧率
    let lastDetectionTime = 0;
    function detectionLoop(timestamp) {
        if (!AI_STATE.isAiDetectionEnabled) return;
        
        // 控制检测频率
        if (timestamp - lastDetectionTime >= AI_CONFIG.DETECTION_INTERVAL) {
            detectSingleFrame();
            lastDetectionTime = timestamp;
        }
        
        AI_STATE.detectionInterval = requestAnimationFrame(detectionLoop);
    }
    
    AI_STATE.detectionInterval = requestAnimationFrame(detectionLoop);
    showTempMessage("AI检测已启动");
}

/**
 * 停止AI检测循环
 */
/**
 * 停止AI检测循环
 */
function stopAiDetection() {
    if (AI_STATE.detectionInterval) {
        // 兼容setInterval和requestAnimationFrame
        if (typeof AI_STATE.detectionInterval === 'number') {
            clearInterval(AI_STATE.detectionInterval);
        } else {
            cancelAnimationFrame(AI_STATE.detectionInterval);
        }
        AI_STATE.detectionInterval = null;
    }
    
    // 修复：移除未定义变量的错误代码，改为清空跟踪目标
    AI_STATE.trackedTarget = null;
    clearDetectionBoxes();
    showTempMessage("AI检测已停止");
}

/**
 * AI识别开关控制
 * @param {Event} [event] - 点击事件
 */
function AiSb() {
    // 事件处理
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    // 模型未加载完成
    if (!AI_STATE.cocoModel && !AI_STATE.isModelLoading) {
        alert("AI模型尚未加载完成，请稍候重试");
        initCocoModel(); // 触发重新加载
        return;
    }
    
    if (AI_STATE.isModelLoading) {
        alert("AI模型正在加载中，请稍候...");
        return;
    }

    // 切换状态
    AI_STATE.isAiDetectionEnabled = !AI_STATE.isAiDetectionEnabled;
    const statusEl = document.getElementById('ai-status');
    
    if (AI_STATE.isAiDetectionEnabled) {
        // 查找视频源
        AI_STATE.videoFrame = document.getElementById('remote-video') || 
                              document.getElementById('small-remote-video');
        
        if (!AI_STATE.videoFrame) {
            alert("未找到视频源，无法启动AI识别");
            AI_STATE.isAiDetectionEnabled = false;
            statusEl.textContent = "AI识别：未启用（无视频源）";
            return;
        }

        // 启动检测
        statusEl.textContent = "AI识别：已启用（检测人/车/物品等80类目标）";
        startAiDetection();
    } else {
        // 停止检测
        statusEl.textContent = "AI识别：未启用";
        stopAiDetection();
    }
}

/**
 * 手动停止跟踪
 */
function stopTracking() {
    AI_STATE.trackedTarget = null;
    // 重置所有检测框样式
    AI_STATE.detectionBoxes.forEach(box => {
        box.style.borderColor = AI_CONFIG.BOX_STYLE.borderColor;
        box.style.backgroundColor = AI_CONFIG.BOX_STYLE.bgColor;
    });
    console.log('手动停止跟踪');
}

// ===================== 页面初始化与资源管理 =====================
/**
 * 初始化TensorFlow.js和COCO-SSD脚本
 */
function initAiScripts() {
    if (typeof cocoSsd !== 'undefined') {
        initCocoModel();
        return;
    }

    // 加载TensorFlow.js
    const tfScript = document.createElement('script');
    tfScript.src = 'Aimx/tf.min.js';
    tfScript.async = true;
    tfScript.onerror = () => {
        alert("加载TensorFlow.js失败，请检查文件路径或网络");
    };

    tfScript.onload = function() {
        // 加载COCO-SSD模型
        const cocoScript = document.createElement('script');
        cocoScript.src = 'Aimx/coco-ssd.min.js';
        cocoScript.async = true;
        cocoScript.onerror = () => {
            alert("加载COCO-SSD模型失败，请检查文件路径或网络");
        };
        cocoScript.onload = initCocoModel;
        document.body.appendChild(cocoScript);
    };

    document.body.appendChild(tfScript);
}

// 页面加载完成初始化
document.addEventListener('DOMContentLoaded', initAiScripts);

// 页面卸载清理资源
window.addEventListener('beforeunload', function() {
    stopAiDetection();
    AI_STATE.cocoModel = null;
    AI_STATE.videoFrame = null;
    AI_STATE.trackedTarget = null;
});

// 全局错误监听（过滤AI相关错误）
window.addEventListener('error', function(e) {
    if (e.message.includes('cocoSsd') || e.message.includes('tf') || e.message.includes('AI识别')) {
        console.error("AI识别模块错误：", e);
        alert(`AI识别功能异常：${e.message}\n请检查相关依赖或刷新页面`);
    }
});

// 暴露全局API（方便调试）
window.AI_CONTROL = {
    startDetection: () => { AI_STATE.isAiDetectionEnabled = true; startAiDetection(); },
    stopDetection: stopAiDetection,
    stopTracking: stopTracking,
    getState: () => ({ ...AI_STATE })
};