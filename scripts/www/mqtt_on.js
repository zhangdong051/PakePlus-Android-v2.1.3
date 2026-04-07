          // document.querySelector("#roomIdInput").value = roomId;
        let rc0 = 0, rc1 = 0, rc2 = 0, rc3 = 0, rc4 = 0, rc5 = 0, rc6 = 0;//定义四个摇杆 

        //开始连接mqtt接收数据	
      //  console.log(mqtt); // 将在全局初始化一个 mqtt 变量
        const logElement = document.getElementById('log');



   // 新增：统一更新MQTT主题的函数
function updateMqttTopics() {
    const modemTypeLower = config.modemType.toLowerCase();
    MQTTXterminals = `/terminal/${modemTypeLower}/${roomId}/setInfo`;
    MQTTXterminalg = `/terminal/${modemTypeLower}/${roomId}/getInfo`;
	MQTTXterminalc = `/terminal/${modemTypeLower}/${roomId}/callBack`;
}


        function log(message) {
            const now = new Date().toLocaleTimeString();
            const logEntry = `[${now}] ${message}\n`;
            logElement.value = logEntry + (logElement.value || '');
        }


	  function connect() {
            // 检查是否已达到最大尝试次数
            if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
                showTempMessage(`已超过最大连接尝试次数(${MAX_CONNECTION_ATTEMPTS}次)，请稍后再试`);
                document.getElementById('stat-button').disabled = true;
                // 5分钟后重新启用连接按钮
                setTimeout(() => {
                    document.getElementById('stat-button').disabled = false;
                    connectionAttempts = 0;
                    showTempMessage("连接按钮已重新启用，可再次尝试连接");
                }, 5 * 60 * 1000);
                return;
            }


            if (mqtt && mqtt.connected) {
                alert("MQ已经连接");
                return;
            }

            // 增加连接尝试次数
            connectionAttempts++;
            showTempMessage(`正在尝试连接 (${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`);

            // 构建WebSocket URL: ws://<host>:<port>/mqtt
            //const url = `wss://${config.mqttServer}/mqtt`;
			const url = `ws://${config.mqttServer}/mqtt`;
            // 创建客户端实例
            const options = {
                clean: false,
                connectTimeout: 4000,
                clientId: 'emqx_test2',
                username: 'ktduser',
                password: 'ktduser@654123',
                keepalive: 600,
                reconnectPeriod: 0, // 禁用自动重连，我们自己控制
            }
            const client = mqtt.connect(url, options);
            mqtt = client;

            client.on('connect', async function () {
                // 连接成功，重置尝试计数器
                connectionAttempts = 0;
                client.subscribe(MQTTXterminalg);
                client.subscribe(MQTTXterminalc);
                document.getElementById('stat-button').textContent = '🔄断开';
                showTempMessage("MQ已经连接");

                // 连接成功后加载所需脚本（仅加载一次）
                if (!areMavlinkScriptsLoaded) {
                    try {
                        await Promise.all([
                            loadScript('./gamepads.js'),
                            loadScript('./mavlink2send.js'),
                            loadScript('./coordtransform.js'),
                            loadScript('./jpkz.js'),
                            loadScript('./xnyg.js'),
                            loadScript('./mavlink_functions.js')
                        ]);
                        areMavlinkScriptsLoaded = true;
                        console.log('相关脚本加载完成');
                    } catch (error) {
                        console.error('脚本加载失败:', error);
                    }
                }

                // 连接成功后启动视频播放
                startVideoPlay();
                initVideoControl();//初始化视频区域点击
                initVideoControls();
                if (typeof initJoysticks === 'function') {
                    initJoysticks();
                }
            });

            client.on('message', async function (topic, message) {
                if (topic === MQTTXterminalc ) {
                    await processcallback(message);
                    return; // 处理完后返回，避免重复解析
                }
            });

            // 接收消息
            client.on('message', function (topic, message) {
                if (topic === MQTTXterminalg) {
                    try {
                        // 将Buffer类型的message转换为字符串，再解析为JSON对象
                        const str = message.toString();
                        const jsonData = JSON.parse(str);  // 解析JSON对象

                        // 使用独立JS文件中的函数处理数据
                        const extractedData = processMqttData(jsonData);

                        // 更新页面显示
                        if (extractedData) {
                            updateDataDisplay(extractedData);

                            // 如果需要更新地图标记位置，可以在这里添加
                            if (extractedData.gps_longitude && extractedData.gps_latitude) {
                                window.initialLon = extractedData.gps_longitude.toFixed(6);
                                window.initialLat = extractedData.gps_latitude.toFixed(6);
                                updateMarkerPosition();
                            }
                        }
                    } catch (error) {
                         console.error('消息解析失败:', error, '原始消息:', message.toString());
                    }
                }
            });

            client.on('error', function (err) {
                showTempMessage(`MQTT连接错误 (${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}): ${err.message}`);
                console.error('MQTT连接错误:', err);

                // 如果未达到最大尝试次数，2秒后自动重试
                if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
                    setTimeout(connect, 2000);
                } else {
                    // 达到最大尝试次数
                    document.getElementById('stat-button').textContent = '🔄连接';
                    showTempMessage(`连接失败超过${MAX_CONNECTION_ATTEMPTS}次，请检查服务器地址或网络`);
                }
            });

            // 连接断开时处理
            client.on('close', function () {
                console.log('MQTT连接已关闭');
                document.getElementById('stat-button').textContent = '🔄连接';

                // 如果不是主动断开连接且未达到最大尝试次数，尝试重连
                if (connectionAttempts < MAX_CONNECTION_ATTEMPTS && !(mqtt && mqtt.connected === false)) {
                    showTempMessage(`连接已断开，正在尝试重连 (${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`);
                    setTimeout(connect, 2000);
                }
            });
        }



	  // 修改断开连接函数，重置计数器
        function mqDisconnect() {
            showTempMessage("已断开连接");
            stopVideoPlay();
            if (mqtt) {
                mqtt.connected = false;
                mqtt.end(true);
                document.getElementById('stat-button').textContent = '🔄连接';
            }
            // 主动断开连接时重置计数器
            connectionAttempts = 0;
        }
  

    // 新增临时弹窗函数，1秒后自动消失
        function showTempMessage(message) {
            // 创建弹窗元素
            const popup = document.createElement('div');
            popup.style.position = 'fixed';
            popup.style.top = '8%';
            popup.style.left = '50%';
            popup.style.transform = 'translateX(-50%)';
            popup.style.padding = '10px 20px';
            popup.style.backgroundColor = 'rgba(0,0,0,0.7)';
            popup.style.color = 'white';
            popup.style.borderRadius = '4px';
            popup.style.zIndex = '9999';
            popup.style.transition = 'opacity 0.3s';
            popup.textContent = message;

            // 添加到页面
            document.body.appendChild(popup);

            // 1秒后移除弹窗
            setTimeout(() => {
                popup.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(popup);
                }, 300);
            }, 1500);
        }
		// 修复saveSettings中的冗余MQTT主题更新
		function saveSettings() {
			const newVideoServer = document.getElementById('video-server').value.trim();
			const newMqttServer = document.getElementById('mqtt-server').value.trim();
			const newModemType = document.getElementById('modem-type').value;
			const newDroneModel = document.getElementById('drone-model').value;
			if (newVideoServer) {
				config.videoServer = newVideoServer;
				localStorage.setItem('droneVideoServer', newVideoServer);
			}
			if (newMqttServer) {
				config.mqttServer = newMqttServer;
				localStorage.setItem('droneMqttServer', newMqttServer);
			}
			if (newModemType) {
				config.modemType = newModemType;
				localStorage.setItem('droneModemType', newModemType);
				// 仅更新模组类型时重新计算MQTT主题
				updateMqttTopics();
			}
			// 新增：机型存储逻辑
			if (newDroneModel) {
				config.droneModel = newDroneModel;
				localStorage.setItem('droneModel', newDroneModel);
			}
			closeSettings();
			alert('设置已保存，模组类型变更将在下次连接时生效');
		}   
        //<!-- 修改roomId初始化和存储相关代码 -->
        // 新增：根据模组类型更新MQTT主题
        function updateMqttTopicsByModemType() {
            const modemTypeLower = config.modemType.toLowerCase();
            // 更新MQTT主题模板
            MQTTXterminals = `/terminal/${modemTypeLower}/${roomId}/setInfo`;
            MQTTXterminalg = `/terminal/${modemTypeLower}/${roomId}/getInfo`;

            // 如果MQTT已连接，重新订阅新主题
            if (mqtt && mqtt.connected) {
                mqtt.unsubscribe(MQTTXterminalg, (err) => {
                    if (!err) {
                        mqtt.subscribe(MQTTXterminalg);
                        showTempMessage(`已切换模组类型为${config.modemType}，MQTT主题已更新`);
                    }
                });
            }
        }



    // 修改updateRoomId函数，添加本地存储逻辑
	function updateRoomId() {
		const newRoomId = document.querySelector("#roomIdInput").value.trim();
		if (newRoomId && newRoomId !== roomId) {
			roomId = newRoomId;
			// 保存到 localStorage
			localStorage.setItem('droneRoomId', roomId);

			// 更新 MQTT 主题（依赖 modemType）
			const modemTypeLower = config.modemType.toLowerCase();
			MQTTXterminals = `/terminal/${modemTypeLower}/${roomId}/setInfo`;
			MQTTXterminalg = `/terminal/${modemTypeLower}/${roomId}/getInfo`;

			// 视频重连
			if (isVideoPlaying) {
				restartVideoPlay();
			}
			// MQTT 重新订阅
			if (mqtt && mqtt.connected) {
				mqtt.unsubscribe(MQTTXterminalg);
				mqtt.subscribe(MQTTXterminalg);
			}
		}
	}