

// ********************MAVLINK发送控制函数*****************//

// 用布尔值记录当前状态，初始为true（第一次用jsonData1）
let jiesuoad = true;
function droneARM() {
    kongzhiquan();
    
    // 根据状态动态显示提示文本
    const tipText = jiesuoad ? "解锁" : "上锁";
    showTempMessage(tipText);

    // 直接根据状态选择数据，同时定义数据（简化结构）
    const jsonData = jiesuoad ? {
        "datatype": 135,
        "datahead": "flight turn on motors",
        "datalen": 17,
        "data": {
            "null": null
        },
        "imei": "InF3dWaXQjzH+xZF1fgqCA=="
    } : {
        "datatype": 136,
        "datahead": "flight turn off motors",
        "datalen": 17,
        "data": {
            "null": null
        },
        "imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    
    mqtt.publish(MQTTXterminals, JSON.stringify(jsonData));
    jiesuoad = !jiesuoad;
}

//获取控制权
	function kongzhiquan() {
		 showTempMessage("获取控制权");
		 // 1. 构建JSON数据（对象）
					const jsonData = {
					"datatype": 140,
					  "datahead": "flight obtain joystick ctrl authority",
					  "datalen": 17,
					  "data": {
						"null": null
					  },
					  "imei": "InF3dWaXQjzH+xZF1fgqCA=="
					};
				// 2. 序列化为JSON字符串
				const jsonStr = JSON.stringify(jsonData);
				mqtt.publish(MQTTXterminals, jsonStr); 
	}


// 用布尔值记录当前状态，初始为true（第一次用jsonData1）
let jiangluost = true;
function dronetakeoff() {
	kongzhiquan();
     showTempMessage("起飞/降落");
    // 直接根据状态选择数据，同时定义数据（简化结构）
    const jsonData = jiangluost ? {
			"datatype": 128,
			"datahead": "flight start take off",
			"datalen": 17,
			"data": {
			"null": null
			},
			"imei": "InF3dWaXQjzH+xZF1fgqCA=="
    } : {
			"datatype": 129,
			"datahead": "flight start landing",
			"datalen": 17,
			"data": {
			"null": null
			},
			"imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    mqtt.publish(MQTTXterminals, JSON.stringify(jsonData));
    jiangluost = !jiangluost;
}


// 用布尔值记录当前状态，初始为true（第一次用jsonData1）
let videostop = true;
function videostartstop() {
		    // 阻止事件冒泡到视频容器，避免触发镜头控制
    if (event) {
        event.stopPropagation();
    }
	if (confirm('推流关闭/打开')) {
     showTempMessage("推流关闭/打开");
    // 直接根据状态选择数据，同时定义数据（简化结构）
    const jsonData = videostop ? {
		"dataextratype": 1,
		"datatype": 68,
		"datahead": "set device push video stream enable",
		"datalen": 37,
		"data": {
		"push_video_stream_enable": false
		},
		"imei": "InF3dWaXQjzH+xZF1fgqCA=="
    } : {
		"dataextratype": 1,
		"datatype": 68,
		"datahead": "set device push video stream enable",
		"datalen": 37,
		"data": {
		"push_video_stream_enable": true
		},
		"imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    mqtt.publish(MQTTXterminals, JSON.stringify(jsonData));
    videostop = !videostop;
}
 else {
  showTempMessage('已取消');
}
}

let jingzhunst = true;
// 1. 定义通用延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// 2. 改造为 async 函数（支持 await 延迟）
async function droneJZJL() {
  showTempMessage("精准降落/取消");

  // 核心条件判断：只有当要发送 qrlanding:1 时，才执行前置步骤
  if (jingzhunst) {
    // 第一步：发送 datatype: 114 数据（仅qrlanding:1时执行）
    const preSendData = {
      "dataextratype": 0,
      "datatype": 114,
      "datahead": "flight control move by position offset",
      "dataLen": 53,
      "data": {
        "x": 0,
        "y": 0,
        "z": 0,
        "yaw": 0,
        "posThreshold": 0.1,
        "yawThreshold": 5
      },
      "imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    mqtt.publish(MQTTXterminals, JSON.stringify(preSendData));
    
    showTempMessage("正在转向正北，等待3秒");
    await delay(3000); // 等待3秒
    resetCameraPosition();
    
    showTempMessage("正在回中，等待1.5秒");
    await delay(3500); // 等待1.5秒
    frCameraPosition();
    
    showTempMessage("正在向下，等待1.5秒");
    await delay(3000); // 等待1.5秒
    showTempMessage("正在向下，等待2秒");
  }

  // 第三步：发送 datatype: 116 数据（无论是否执行前置步骤，都会发送）
  const jsonData = jingzhunst ? {
    "dataextratype": 0,
    "datatype": 116,
    "datahead": "UAV qrcode landing request",
    "datalen": 17,
    "data": { "qrlanding": 1 },
    "imei": "InF3dWaXQjzH+xZF1fgqCA=="
  } : {
    "dataextratype": 0,
    "datatype": 116,
    "datahead": "UAV qrcode landing request",
    "datalen": 17,
    "data": { "qrlanding": 0 },
    "imei": "InF3dWaXQjzH+xZF1fgqCA=="
  };
  mqtt.publish(MQTTXterminals, JSON.stringify(jsonData));
  
  // 根据发送的qrlanding值输出对应日志
  showTempMessage(jingzhunst ? "已开始精准降落" : "已取消精准降落");

  // 状态切换（保持原有逻辑）
  jingzhunst = !jingzhunst;
}


// 用布尔值记录当前状态，初始为true（第一次用jsonData1）
let hanxianzt = true;
let hanxianzt3 = true;  // HXV3 状态

// 整合后的航线暂停/恢复函数
function droneZTHX() {
   // showTempMessage("航线暂停/恢复");
    
    // 获取当前选择的机型
    const selectedModel = document.getElementById('drone-model').value;
    
    // 根据机型分支执行不同逻辑
    if (selectedModel === 'HXV2') {
		 showTempMessage("航线V2暂停/继续");
        // ========== HXV2 原有逻辑 ==========
        const jsonData = hanxianzt ? {
            "datatype": 55,
            "datahead": "flight waypoint3 pause",
            "datalen": 17,
            "data": {
                "null": null
            },
            "imei": "InF3dWaXQjzH+xZF1fgqCA=="
        } : {
            "datatype": 56,
            "datahead": "flight waypoint2 resume",
            "datalen": 17,
            "data": {
                "null": null
            },
            "imei": "InF3dWaXQjzH+xZF1fgqCA=="
        };
        // 发布消息
        mqtt.publish(MQTTXterminals, JSON.stringify(jsonData));
        // 切换状态
        hanxianzt = !hanxianzt;
        
    } else if (selectedModel === 'HXV3') {
		 showTempMessage("航线V3暂停/继续");
        // ========== HXV3 新逻辑 ==========
        const jsonData = hanxianzt3 ? {
            "datatype": 49,
            "datahead": "action response",
            "datalen": 16,
            "data": {
                "action": 2
            },
            "imei": "InF3dWaXQjzH+xZF1fgqCA=="
        } : {
            "datatype": 49,
            "datahead": "action response",
            "datalen": 16,
            "data": {
                "action": 3
            },
            "imei": "InF3dWaXQjzH+xZF1fgqCA=="
        };
        // 发布消息
        mqtt.publish(MQTTXterminals, JSON.stringify(jsonData));
        // 切换状态
        hanxianzt3 = !hanxianzt3;
    }
}



// 用布尔值记录当前状态，初始为true（第一次用jsonData1）
let fanhangst = true;
function droneRTL() {
     showTempMessage("开始返航/暂停返航");
    // 直接根据状态选择数据，同时定义数据（简化结构）
    const jsonData = fanhangst ? {
			"datatype": 138,
			"datahead": "flight start go home",
			"datalen": 17,
			"data": {
			"null": null
			},
			"imei": "InF3dWaXQjzH+xZF1fgqCA=="
    } : {
			"datatype": 139,
			"datahead": "flight cancel go home",
			"datalen": 17,
			"data": {
			"null": null
			},
			"imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    mqtt.publish(MQTTXterminals, JSON.stringify(jsonData));
    fanhangst = !fanhangst;
}

function dronepicter() {
	    // 阻止事件冒泡到视频容器，避免触发镜头控制
    if (event) {
        event.stopPropagation();
    }
         showTempMessage("已拍照");
				const jsonData = {
				"datatype": 208,
				"datahead": "camera start shoot single photo",
				"datalen": 24,
				"data": {
				"mount_position": 1
				},
				"imei": "InF3dWaXQjzH+xZF1fgqCA=="
				};
			// 2. 序列化为JSON字符串
			const jsonStr = JSON.stringify(jsonData);
			mqtt.publish(MQTTXterminals, jsonStr); 	
          	
}


// 用布尔值记录当前状态，初始为true（第一次用jsonData1：开始录像）
let luxiangzt = true;
function dronevideo() {
	
    // 阻止事件冒泡到视频容器，避免触发镜头控制
    if (event) {
        event.stopPropagation();
    }
	
    showTempMessage("录像开始/停止"); 

    // 定义录像开始/停止的指令数据
    const startJson = {
        "datatype": 216,
        "datahead": "camera start record video",
        "datalen": 24,
        "data": { "mount_position": 1 },
        "imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    const stopJson = {
        "datatype": 217,
        "datahead": "camera stop record video",
        "datalen": 24,
        "data": { "mount_position": 1 },
        "imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    // 定义查询SD卡存储信息的指令（停止录像后发送）
    const sdStorageJson = {
        "dataextratype": 1,
        "datatype": 49,
        "datahead": "get camera sd card storage info",
        "datalen": 24,
        "data": { "mount_position": 1 },
        "imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };

    // 根据当前状态发送对应指令
    if (luxiangzt) {
        // 当前状态：true → 发送【开始录像】指令
        mqtt.publish(MQTTXterminals, JSON.stringify(startJson));
    } else {
        // 当前状态：false → 发送【停止录像】指令
        mqtt.publish(MQTTXterminals, JSON.stringify(stopJson));
        // ✅ 核心新增：停止录像后，立即发送一次查询SD卡存储信息
        mqtt.publish(MQTTXterminals, JSON.stringify(sdStorageJson));
    }

    // 切换状态（下次调用用另一个数据）
    luxiangzt = !luxiangzt;
}

/**********************


******************************/

// 全局变量：记录首次进入状态和上次发送jsonData1的时间
let isFirstEnter = true;
let lastSendData1Time = 0;

function GAME_command() {
    // 先检查MQTT连接状态
    if (!mqtt || !mqtt.connected) {
        alert("请先连接MQTT！");
        return;
    }

    // 获取当前时间戳（毫秒）
    const currentTime = Date.now();
    
    // 判断是否需要发送jsonData1：首次进入 或 距离上次发送超过15秒
    if (isFirstEnter || (currentTime - lastSendData1Time > 15000)) {
        // 构建获取控制权JSON数据
        const jsonData1 = {
            "datatype": 140,
            "datahead": "flight obtain joystick ctrl authority",
            "datalen": 17,
            "data": {
                "null": null
            },
            "imei": "InF3dWaXQjzH+xZF1fgqCA=="
        };
	 const jsonDatactr = {
			  "datahead": "flight set joystick mode",
			  "data": {
				"stable_control_mode": 1,
				"horizontal_coordinate": 1,
				"vertical_control_mode": 0,
				"yaw_control_mode": 1,
				"horizontal_control_mode": 1
			  },
			  "datatype": 107,
			  "dataextratype": 0,
			  "imei": "eFzn49GF6iJn0po715+xdw==",
			  "dataLen": 142
        };
		
		
        // 序列化为JSON字符串并发送
        const jsonStr1 = JSON.stringify(jsonData1);
        mqtt.publish(MQTTXterminals, jsonStr1);
		 // 序列化为JSON字符串并发送
        const jsonStrctr = JSON.stringify(jsonDatactr);
        mqtt.publish(MQTTXterminals, jsonStrctr);
        
        // 更新状态：首次进入标记置为false，记录本次发送时间
        isFirstEnter = false;
        lastSendData1Time = currentTime;
    }

    // 计算x、y、z、r（无论是否发送jsonData1，都需要执行这部分）
    const kzx = Math.round(rc0 * 0.1);
    const kzy = Math.round(rc1 * 0.1);
    const kzz = Math.round(rc2 * 0.1); // thr
    const kzr = Math.round(rc3 * 0.1);     
    showTempMessage(`P:${kzx} R:${kzy} T:${kzz} Y:${kzr}`);

    // 构建摇杆控制JSON数据并发送
    const jsonData = {
        "datatype": 143,
        "datahead": "flight execute joystick action",
        "datalen": 44,
        "data": {
            "x": kzx,
            "y": kzy,
            "z": kzz,
            "yaw": kzr
        },
        "imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    const jsonStr = JSON.stringify(jsonData);
    mqtt.publish(MQTTXterminals, jsonStr); 	
}

/****************/

// 初始化视频控制功能
function initVideoControl() {
    const videoContainer = document.getElementById('large-video-container');
    if (!videoContainer) return;
    
    // 视频控制区域点击事件
    videoContainer.addEventListener('click', handleVideoClick);
}

// 新增全局变量用于跟踪当前视频源类型（case）
let currentSourceType = 1; // 默认case 1
// 定义外部变量保存当前缩放因子，初始值参考原case3的初始factor
let currentZoomFactor = 2;
let fpvModeActivated = false;
// 处理视频区域点击事件
function handleVideoClick(e) {
    // 只有在大窗口显示视频时才响应控制
    if (!document.body.classList.contains('show-video-large')) {
        return;
    }
	
    // 双击任意位置执行镜头回中
    if (e.detail === 2) {
        resetCameraPosition();
        return;
    }
	
    // 三击任意位置执行镜头向下
	if (e.detail === 3) {
		const timerId = setTimeout(() => {
			  frCameraPosition();
			}, 1000);
        
        return;
    }
    // 单击事件处理（只处理单点击）
    if (e.detail !== 1) {
        return;
    }
    
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    
    // 计算点击位置相对于容器的比例 (0-1)
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // 定义中心参数（用于计算偏移比例）
    const centerX = 0.5;
    const centerY = 0.5;
    
    // 计算相对中心的偏移比例（-0.5到0.5范围）
    const dx = x - centerX; // 左右偏移（负为左，正为右）
    const dy = y - centerY; // 上下偏移（负为上，正为下）
    
    // 计算偏移强度（基于距离中心的相对距离，映射到0-1范围）
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = Math.sqrt(0.5 * 0.5 + 0.5 * 0.5); // 对角线到中心的距离
    const strength = Math.min(distance / maxDistance, 1); // 归一化到0-1
    
    // 基础控制值（最大偏移时的数值）
    const maxPitch = 30;
    const maxYaw = 30;
    
    // 根据当前视频源类型（case）选择不同的计算方式
    let pitch = 0, yaw = 0; // 初始化默认值
    if (currentSourceType === 1||currentSourceType === 5) {

        // case 1: 不除以缩放因子
        pitch = -dy * maxPitch * 2; 
        yaw = dx * maxYaw * 2;
    } else if (currentSourceType === 2||currentSourceType === 3||currentSourceType === 4 ) {
        // case 2: 除以缩放因子
        pitch = -(dy * maxPitch * 2) / currentZoomFactor;
        yaw = (dx * maxYaw * 2) / currentZoomFactor;
    }
    
    // 输出控制信息
   // showTempMessage(`镜头控制 - 上下: ${pitch.toFixed(1)}, 左右: ${yaw.toFixed(1)}`);
	showTempMessage(`镜头控制`);
    
    // 构建并发送MQTT消息
    const jsonData = {
        "datatype": 226,
        "datahead": "gimbal rotate",
        "datalen": 120,
        "data": {
            "mount_position": 1,
            "rotation": {
                "rotation_mode": 0,
                "pitch":  Math.round(pitch), // 取整发送
                "roll": 0,
                "yaw":Math.round(yaw),     // 取整发送
                "time": 0.2
            }
        },
        "imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    const jsonStr = JSON.stringify(jsonData);
    mqtt.publish(MQTTXterminals, jsonStr);
}


function resetCameraPosition() {
    showTempMessage('镜头回中');
    // 构建JSON数据
    const jsonData = {
        "datatype": 225,
        "datahead": "gimbal reset",
        "datalen": 24,
        "data": {
            "mount_position": 1
        },
        "imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    // 序列化为JSON字符串并发送
    const jsonStr = JSON.stringify(jsonData);
    mqtt.publish(MQTTXterminals, jsonStr); 	
}

function frCameraPosition() {
    showTempMessage('镜头向下');
    // 构建JSON数据
    const jsonData = {
        "datatype": 226,
        "datahead": "gimbal rotate",
        "datalen": 120,
        "data": {
            "mount_position": 1,
            "rotation": {
                "rotation_mode": 0,
                "pitch": -90, 
                "roll": 0,
                "yaw":0,    
                "time": 0.2
            }
        },
        "imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    // 序列化为JSON字符串并发送
    const jsonStr = JSON.stringify(jsonData);
    mqtt.publish(MQTTXterminals, jsonStr); 	
}

function switchVideoSource(sourceType, event) {
    // 阻止事件冒泡到视频容器，避免触发镜头控制
    if (event) {
        event.stopPropagation();
    }
    
    //showTempMessage(`切换视频源: ${sourceType}`);
    // 更新当前视频源类型（用于后续判断计算方式）
    currentSourceType = sourceType;
    
    let jsonData;
    
    // 处理FPV模式激活
    if (sourceType === 6) {
		showTempMessage(`视频源切FPV`);
        // 执行case 6逻辑
        jsonData = {
            "dataextratype": 1,
            "datatype": 73,
            "datahead": "set device video source",
            "datalen": 22,
            "data": {
                "video_source": 7
            },
            "imei": "SPBYWofe5k38fF6N+9NwSQ=="
        };
        // 标记FPV模式已激活
        fpvModeActivated = true;
    } 
    // 处理需要先执行case 7的情况（1、2、5）
    else if ([1, 2, 5].includes(sourceType) && fpvModeActivated) {
        // 先执行一次case 7
        const case7Data = {
			"dataextratype": 1,
			"datatype": 73,
			"datahead": "set device video source",
			"datalen": 22,
			"data": {
			"video_source": 1
			},
			"imei": "SPBYWofe5k38fF6N+9NwSQ=="
        };
        mqtt.publish(MQTTXterminals, JSON.stringify(case7Data));
        
        // 重置FPV激活状态
        fpvModeActivated = false;
        
        // 再执行对应sourceType的逻辑
        switch(sourceType) {
            case 1:
			showTempMessage(`视频源切广角`);
                jsonData = {
                    "dataextratype": 1,
                    "datatype": 28,
                    "datahead": "camera set stream source",
                    "datalen": 45,
                    "data": {
                        "mount_position": 1,
                        "stream_source": 1
                    },
                    "imei": "InF3dWaXQjzH+xZF1fgqCA=="
                };
                break;
            case 2:
			showTempMessage(`视频源切变焦`);
                jsonData = {
                    "dataextratype": 1,
                    "datatype": 28,
                    "datahead": "camera set stream source",
                    "datalen": 45,
                    "data": {
                        "mount_position": 1,
                        "stream_source": 2
                    },
                    "imei": "InF3dWaXQjzH+xZF1fgqCA=="
                };
                break;
            case 5:
			showTempMessage(`视频源切热成像`);
                jsonData = {
                    "dataextratype": 1,
                    "datatype": 28,
                    "datahead": "camera set stream source",
                    "datalen": 45,
                    "data": {
                        "mount_position": 1,
                        "stream_source": 3
                    },
                    "imei": "InF3dWaXQjzH+xZF1fgqCA=="
                };
                break;
        }
    }
    // 处理其他正常情况
    else {
        switch(sourceType) {
            case 1:
			    showTempMessage(`视频源切广角`);
                jsonData = {
                    "dataextratype": 1,
                    "datatype": 28,
                    "datahead": "camera set stream source",
                    "datalen": 45,
                    "data": {
                        "mount_position": 1,
                        "stream_source": 1
                    },
                    "imei": "InF3dWaXQjzH+xZF1fgqCA=="
                };
                break;
            case 2:
			showTempMessage(`视频源切变焦`);
                jsonData = {
                    "dataextratype": 1,
                    "datatype": 28,
                    "datahead": "camera set stream source",
                    "datalen": 45,
                    "data": {
                        "mount_position": 1,
                        "stream_source": 2
                    },
                    "imei": "InF3dWaXQjzH+xZF1fgqCA=="
                };
                break;
            case 3:
                currentZoomFactor += 1;
				showTempMessage(`变焦 ${currentZoomFactor}`);
                jsonData = {
                    "datatype": 213,
                    "datahead": "camera optical zoom",
                    "datalen": 55,
                    "data": {
                        "mount_position": 1,
                        "direction": 1,
                        "factor": currentZoomFactor
                    },
                    "imei": "InF3dWaXQjzH+xZF1fgqCA=="
                };
                break;
            case 4:
                if (currentZoomFactor > 2) {
					currentZoomFactor -= 1; // 满足条件时减1
					showTempMessage(`变焦 ${currentZoomFactor}`);
				} else {
					showTempMessage(`变焦已最小`);
					currentZoomFactor = 2; // 不满足条件时设为2
				}
                jsonData = {
                    "datatype": 213,
                    "datahead": "camera optical zoom",
                    "datalen": 55,
                    "data": {
                        "mount_position": 1,
                        "direction": 1,
                        "factor": currentZoomFactor
                    },
                    "imei": "InF3dWaXQjzH+xZF1fgqCA=="
                };
                break;
            case 5:
			showTempMessage(`视频源切热成像`);
                jsonData = {
                    "dataextratype": 1,
                    "datatype": 28,
                    "datahead": "camera set stream source",
                    "datalen": 45,
                    "data": {
                        "mount_position": 1,
                        "stream_source": 3
                    },
                    "imei": "InF3dWaXQjzH+xZF1fgqCA=="
                };
                break;
        }
    }
    
    // 发送当前操作的MQTT消息
    if (jsonData) {
        const jsonStr = JSON.stringify(jsonData);
        mqtt.publish(MQTTXterminals, jsonStr);
    }
}

//激光测距
	function jiguangceju() {
	 // 阻止事件冒泡到视频容器，避免触发镜头控制
    if (event) {
        event.stopPropagation();
    }
			showTempMessage("激光测距");
			const jsonData = {
						 "datatype": 144,
						  "datahead": "get camera laser ranging info",
						  "datalen": 24,
						  "data": {
							"mount_position": 1
						  },
						  "imei": "InF3dWaXQjzH+xZF1fgqCA=="
						};
					 // 序列化为JSON字符串并发送
					const jsonStr = JSON.stringify(jsonData);
					mqtt.publish(MQTTXterminals, jsonStr); 
		}


//******************************发送数据处理***************//

  // 无人机设置相关变量
    let droneSettings = {
        returnAltitude: 200
    };
    
// 打开无人机设置对话框
    function openDroneSettings() {
        // 加载当前设置到表单
        document.getElementById('return-altitude').value = droneSettings.returnAltitude;
        
// 显示对话框
        document.getElementById('drone-settings-modal').style.display = 'flex';
    }
    
// 关闭无人机设置对话框
    function closeDroneSettings() {
        document.getElementById('drone-settings-modal').style.display = 'none';
    }
    
// 保存无人机设置
	function saveDroneSettings() {
    // 获取表单值（转换为整数）
    const returnAltitude = parseInt(document.getElementById('return-altitude').value);
    droneSettings.returnAltitude = returnAltitude; // 保持原有的设置存储
    // 发送MQTT消息，将获取到的高度值赋给altitude
    const jsonData = {
        "datatype": 105,
        "datahead": "flight set go home altitude",
        "datalen": 20,
        "data": {
            "altitude": returnAltitude // 直接使用页面获取的高度值
        },
        "imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    // 序列化为JSON字符串并发送
    const jsonStr = JSON.stringify(jsonData);
    mqtt.publish(MQTTXterminals, jsonStr); 
    closeDroneSettings();
	showTempMessage(`返航高度${returnAltitude}`+'m');
}
    
// 格式化SD卡
    function formatSdCard() {
		if (confirm('将格式化SD卡！')) {
	showTempMessage("开始格式化SD卡！");
    const jsonData = {
			"dataextratype": 1,
			"datatype": 48,
			"datahead": "camera format sd card storage",
			"datalen": 24,
			"data": {
			"mount_position": 1
			},
			"imei": "InF3dWaXQjzH+xZF1fgqCA=="
                };
             // 序列化为JSON字符串并发送
			const jsonStr = JSON.stringify(jsonData);
			mqtt.publish(MQTTXterminals, jsonStr); 
} else {
  showTempMessage('已取消SD卡格式化');
}
}
// 用布尔值记录当前状态，初始为true（第一次用jsonData1）
let rtkenab = true;
function enablertkkg() {
    // confirm('RTK开启/关闭！')
	showTempMessage("RTK开启/关闭！");
    // 直接根据状态选择数据，同时定义数据（简化结构）
    const jsonData = rtkenab ? {
					"datatype": 96,
					"datahead": "flight set rtk position enable status",
					"datalen": 27,
					"data": {
					"rtk_enable_status": 1
					},
					"imei": "InF3dWaXQjzH+xZF1fgqCA=="
    } : {
					"datatype": 96,
					"datahead": "flight set rtk position enable status",
					"datalen": 27,
					"data": {
					"rtk_enable_status": 0
					},
					"imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    mqtt.publish(MQTTXterminals, JSON.stringify(jsonData));
    rtkenab = !rtkenab;
}
// 关闭避障功能
// 用布尔值记录当前状态，初始为true（第一次用jsonData1）
let bizhangenab = true;
function enablebzkg() {
    //confirm('避障开启/关闭！')
	showTempMessage("避障开启/关闭！");
    // 直接根据状态选择数据，同时定义数据（简化结构）
    const jsonData = bizhangenab ? {
			"datatype": 98,
			"datahead": "flight set horizontal visual obstacle avoidance enable status",
			"datalen": 53,
			"data": {
			"horizontal_obstacle_avoidance_enable_status": 1
			},
			"imei": "InF3dWaXQjzH+xZF1fgqCA=="
    } : {
			"datatype": 98,
			"datahead": "flight set horizontal visual obstacle avoidance enable status",
			"datalen": 53,
			"data": {
			"horizontal_obstacle_avoidance_enable_status": 0
			},
			"imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    mqtt.publish(MQTTXterminals, JSON.stringify(jsonData));
    bizhangenab = !bizhangenab;
}

// 更新失联行为设置函数
function enableslkg() {
    showTempMessage("设置失联动作！");
    // 获取选择的失联行为值
    const rcLostAction = parseInt(document.getElementById('rc-lost-action').value);
    
    const jsonData = {
        "datatype": 0x61,
        "datahead": "flight set rc lost action",
        "datalen": 24,
        "data": {
            "rc_lost_action": rcLostAction  // 使用选择的值
        },
        "imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    
    // 序列化为JSON字符串并发送
    const jsonStr = JSON.stringify(jsonData);
    mqtt.publish(MQTTXterminals, jsonStr);         
}


//更新返航点
function gengxinfanhangd() {
if (confirm('将更新返航点！')) {
	showTempMessage("返航点已更新！");
    const jsonData = {
				"datatype": 104,
				"datahead": "flight set home location using current aircraft location",
				"datalen": 17,
				"data": {
				"null": null
				},
				"imei": "InF3dWaXQjzH+xZF1fgqCA=="
                };
             // 序列化为JSON字符串并发送
			const jsonStr = JSON.stringify(jsonData);
			mqtt.publish(MQTTXterminals, jsonStr); 
} else {
  showTempMessage('已取消');
}         	
}

//设置返航点
// 设置返航点（用户输入经纬度）
function shezhifanhangd() {
    // 提示用户输入经纬度，格式示例
    const input = prompt('请输入经纬度（例：34.768601,113.7405414）：', '');
    
    if (input === null) {
        showTempMessage('已取消设置返航点');
        return;
    }
    
    // 验证输入格式
    const [latitudeStr, longitudeStr] = input.split(',');
    if (!latitudeStr || !longitudeStr) {
        alert('输入格式错误，请使用"纬度,经度"格式');
        return;
    }
    
    const latitude = parseFloat(latitudeStr);
    const longitude = parseFloat(longitudeStr);
    
    // 简单验证经纬度范围
    if (isNaN(latitude) || isNaN(longitude) || 
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
        alert('经纬度值无效，请重新输入');
        return;
    }
    
    if (confirm(`确认设置返航点为：\n纬度：${latitude}\n经度：${longitude}`)) {
        showTempMessage(`设置返航点：纬度=${latitude}，经度=${longitude}`);
        const jsonData = {
            "datatype": 103,
            "datahead": "flight set home location using GPS coordinates",
            "datalen": 62,
            "data": {
                "latitude": latitude,  // 使用用户输入的纬度
                "longitude": longitude // 使用用户输入的经度
            },
            "imei": "InF3dWaXQjzH+xZF1fgqCA=="
        };
        
        // 序列化为JSON字符串并发送
        const jsonStr = JSON.stringify(jsonData);
        mqtt.publish(MQTTXterminals, jsonStr);
        alert('返航点已设置成功');
    } else {
        showTempMessage('已取消设置返航点');
    }         
}
//重置相机
function chongzhixiangji() {
if (confirm('相机将恢复出产设置！')) {
	showTempMessage("相机重置！");
    const jsonData = {
		"dataextratype": 1,
		"datatype": 24,
		"datahead": "camera reset camera settings",
		"datalen": 24,
		"data": {
		"mount_position": 1
		},
		"imei": "InF3dWaXQjzH+xZF1fgqCA=="
                };
             // 序列化为JSON字符串并发送
			const jsonStr = JSON.stringify(jsonData);
			mqtt.publish(MQTTXterminals, jsonStr); 
} else {
  showTempMessage('已取消');
}         	
}
	
//打开mino控制台
    function minolianjie() {
  window.open(
    "http://121.37.134.81:9755/login",
    "miniWindow",
    "width=1000,height=550,left=50,top=50,toolbar=no,menubar=no,location=no,scrollbars=yes,resizable=yes"
  );
}