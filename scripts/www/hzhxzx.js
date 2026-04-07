// 新增全局变量用于记录mission_id，初始值为331270
let missionId = 331270;
// 新增全局变量存储KMZ文件信息
let kmzFileName = '';
let kmzFileSize = 0;

// 切换绘制状态
let points = [];
let isDrawing = false;
let currentPolyline = null;
function toggleDrawing() {
    isDrawing = !isDrawing;
    const button = document.getElementById('drawing-toggle'); 
    
    if (isDrawing) {
        // 高德地图通过AMap.event 监听点击事件 
         window.largeMap .on('click',  addPoint);
        button.textContent  = '关闭绘制';
        button.style.backgroundColor  = '#ffc107';
        button.style.color  = '#212529';
    } else {
         window.largeMap .off('click',  addPoint); // 移除事件监听 
        button.textContent  = '✨开始绘制';
        button.style.backgroundColor  = '';
        button.style.color  = '';
    }
}

// 修改addPoint函数（hzhxzx.js中）
function addPoint(e) {
    const coord = e.lnglat; 
   // showTempMessage(' 添加航点:', coord);
 
    // 获取默认高度（从输入框获取）
    //const defaultHeight = parseFloat(document.getElementById('flight-height').value) || 50;
    const defaultHeight = 110;
    const label = new AMap.Text({
        text: (points.length + 1).toString(),
        position: coord,
        style: {
            'background-color': '#007BFF',
            'color': 'white',
            'border-radius': '50%',
            'padding': '3px 6px',
            'font-size': '12px',
            'text-align': 'center'
        },
        offset: new AMap.Pixel(-10, -8),
        draggable: true  // 新增：允许拖拽
    });
    label.setMap(window.largeMap); 
 
    // 新增拖拽结束事件
    label.on('dragend', function(event) {
        // 获取当前航点索引
        const index = points.findIndex(p => p.label === label);
        if (index !== -1) {
            // 更新航点坐标
            points[index].coord = event.lnglat;
            // 刷新航线和列表
            updatePolyline();
            updateWaypointList();
        }
    });
 
    // 新增height属性存储当前航点高度
    points.push({  
        coord, 
        label,
        marker: label,
        height: defaultHeight
    });
    updatePolyline();
    updateWaypointList();
}

// 修改updateWaypointList函数（hzhxzx.js中）
function updateWaypointList() {
    const container = document.getElementById('waypoint-items');
    container.innerHTML = ''; // 清空列表
 
    points.forEach((point, index) => {
        const item = document.createElement('div');
        item.className = 'waypoint-item';
        
        // 航点信息HTML，优化布局
        item.innerHTML = `
            <div style="display: flex; align-items: center; width: 100%; gap: 8px;">
                <span style="min-width: 5px;">${index + 1}:</span>
                <div class="waypoint-coords">
                    <span>${point.coord.getLng().toFixed(6)}</span>
                    <span style="margin-left: 8px;">${point.coord.getLat().toFixed(6)}</span>
                </div>
                <div class="waypoint-height-control">
                    <input type="number" 
                           class="waypoint-height" 
                           data-index="${index}"
                           value="${point.height}" 
                           min="10" 
                           step="1">
                    <span>米</span>
                </div>
            </div>
        `;
        
        container.appendChild(item);
    });
 
    // 绑定高度输入框事件（保持不变）
    document.querySelectorAll('.waypoint-height').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            const height = parseFloat(e.target.value);
            if (!isNaN(height) && height >= 10) {
                points[index].height = height;
            } else {
                alert('请输入有效的高度值（不小于10米）');
                e.target.value = points[index].height;
            }
        });
    });
}


// 添加拖放相关函数（放到hzhxzx.js中）
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    setTimeout(() => {
        this.classList.add('dragging');
    }, 0);
}

function handleDragOver(e) {
    e.preventDefault();
    const afterElement = getDragAfterElement(container, e.clientY);
    const draggable = document.querySelector('.dragging');
    if (afterElement == null) {
        container.appendChild(draggable);
    } else {
        container.insertBefore(draggable, afterElement);
    }
}

function handleDragEnd() {
    this.classList.remove('dragging');
}

function handleDrop(e) {
    e.preventDefault();
    // 获取新的排序
    const items = Array.from(container.children);
    const newOrder = items.map(item => parseInt(item.dataset.index));
    
    // 重新排序points数组
    const newPoints = newOrder.map(index => points[index]);
    
    // 更新points数组并重新渲染
    points = newPoints;
    updatePolyline();
    updateWaypointList();
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.waypoint-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 修改删除最后一个航点函数
function removeLastPoint() {
    if (points.length === 0) {
        AMap.ui.showToast({ content: '没有可删除的航点！', type: 'error' });
        return;
    }
 
    const lastPoint = points.pop(); 
    lastPoint.marker.setMap(null);
    lastPoint.label.setMap(null); 
    updatePolyline();
    updateWaypointList(); // 新增：更新列表
 
    // 更新剩余航点编号 
    points.forEach((point, index) => {
        point.label.setText((index + 1).toString());
    });
}

// 更新航线（保持不变）
function updatePolyline() {
    // 移除旧航线（高德通过setMap(null)移除覆盖物）
    if (currentPolyline) {
        currentPolyline.setMap(null); 
    }
 
    // 创建新航线（需至少2个点）
    if (points.length  >= 2) {
       const path = points.map(p  => [p.coord.getLng(), p.coord.getLat()]);
        
        currentPolyline = new AMap.Polyline({
            path: path,
            strokeColor: "#28a745", // 线颜色 
            strokeWeight: 4,        // 线宽 
            strokeStyle: "solid",   // 线样式（solid|dash） 
            strokeDasharray: [5, 5], // 虚线间隔（高德使用数组而非字符串）
            lineJoin: "round",       // 折线拐点样式 
            opacity: 0.8,
            zIndex: 50              // 层级控制 
        });
        
        currentPolyline.setMap( window.largeMap );  // 添加到地图 
    }
}

// 修改清空所有要素函数
function clearAll() {
    if(points.length === 0) {
        alert('当前没有航点可清除！');
        return;
    }

    if(confirm('确定要清除所有航点和航线吗？')) {
        points.forEach(p => {
            p.marker.setMap(null); 
            p.label.setMap(null);
        });
        
        if (currentPolyline) currentPolyline.setMap(null); 
        
        points = [];
        currentPolyline = null;
        updateWaypointList(); // 新增：更新列表
        AMap.ui.showToast({ content: "清除完成", type: "success" });
    }
} 

// 切换执行面板显示/隐藏（保持不变）
function toggleExecutionPanel() {
    const panel = document.getElementById('execution-panel');
    panel.classList.toggle('show');
    
    // 如果航点少于2个且面板显示，则显示警告
    if(points.length < 2 && panel.classList.contains('show')) {
        alert('警告：至少需要2个航点才能执行航线！');
    }
}

// 修改执行航线函数
function executeFlight() {
    if(points.length < 2) {
        alert('执行失败：至少需要2个航点才能执行航线！');
        return;
    }
    // 不再需要全局飞行高度，改为验证每个航点的高度
    const flightSpeed = parseFloat(document.getElementById('flight-speed').value);
    const returnHeight = parseFloat(document.getElementById('return-height').value);
    const lostAction = document.getElementById('lost-action').value;
    
    // 验证输入
    if (isNaN(flightSpeed) || isNaN(returnHeight)) {
        alert('请输入有效的数值参数！');
        return;
    }
    
    if (flightSpeed < 1 || returnHeight < 10) {
        alert('参数值不能小于最小值限制！');
        return;
    }
    
    // 打印航线信息（更新高度显示）
    console.log('开始执行航线...');
    console.log('航线参数:', {
        flightSpeed,
        returnHeight,
        lostAction
    });
    
    console.log('航点列表:');
    points.forEach((point, index) => {
        console.log(`航点 ${index + 1}:`, point.coord, `高度: ${point.height}米`);
    });
    
    // 显示执行结果（更新高度显示）
    let waypointInfo = points.map((p, i) => `航点 ${i+1}: ${p.height}米`).join('\n');
    const resultMessage = `航线即将开始执行！
	航点数量: ${points.length}个
	${waypointInfo}
	航线速度: ${flightSpeed}米/秒
	返航高度: ${returnHeight}米
	遥控器失联动作: ${document.getElementById('lost-action').options[document.getElementById('lost-action').selectedIndex].text}`; 
	//遥控器丢失动作0退出航线，执行失控动作1继续执行航线 
	//当RC失联时的动作，此参数暂无效。M300失联动作与控制权归属，以及DJI Assistant2设置有关。详见开发注意事项
    alert(resultMessage);
    
    // 关闭面板
    toggleExecutionPanel();
    // 航线获取控制权
    kongzhiquan();
	
	    // 面板显示且航点≥2时，根据机型执行对应逻辑
  
    const selectedModel = document.getElementById('drone-model').value;
        if (selectedModel === 'HXV2') {
		showTempMessage("执行v2航线逻辑");
       // 调用航点处理函数（只传递速度和失联动作）
        hangdianhxzx(flightSpeed, lostAction);
      const timerId = setTimeout(() => {
        hangdianhxzxv2stat();
       }, 2000);   
      } else if (selectedModel === 'HXV3') {
		  //hangdianhxv3(flightSpeed, lostAction);//不使用原有航点参数
        showTempMessage("执行v3航线逻辑");
		daochukml();//导出航线文件
		const timerId0 = setTimeout(() => {
        hangdianhxzxv3lost();//航线v3失联逻辑
    }, 1000);
		const timerId1 = setTimeout(() => {
		hangdianhxzxv3up();//上传到服务器
    }, 2000);
		const timerId2 = setTimeout(() => {
        hangdianhxzxv3stat();//航线v3执行
    }, 3000);
	 const timerId3 = setTimeout(() => {
        hangdianhxzxv3call();//航线v3回调
    }, 4000);
			
        }
    
}

function hangdianhxzxv2stat() {
   showTempMessage('航线开始执行');
    // 构建JSON数据
    const jsonData = {

	  "datahead": "flight waypoint2 start",
	  "data": {
		"null": "null"
	  },
	  "datatype": 53,
	  "dataextratype": 0,
	  "imei": "eFzn49GF6iJn0po715+xdw==",
	  "dataLen": 17
    };
    // 序列化为JSON字符串并发送
    const jsonStr = JSON.stringify(jsonData);
    mqtt.publish(MQTTXterminals, jsonStr); 	
}

function hangdianhxzxv3up() {
   // 校验KMZ文件信息是否存在
    console.log('hangdianhxzxv3up');
    if (!kmzFileName || !kmzFileSize) {
        showTempMessage('请先导出KMZ文件再执行此操作！');
        return;
    }
   
    showTempMessage('航线V3上传');
    // 构建JSON数据（使用动态的文件名和文件大小）
    const jsonData = {
  "datatype": 48,
  "datahead": "flight waypoint3 upload kmz file",
  "data": {
    "file_url": `http://222.139.28.132:9000/d10kmz/${kmzFileName}`,
    "file_size": kmzFileSize
  },
  "dataextratype": 0,
  "imei": "U6cIOjNCtl1EnHoq445q0Q==",
  "dataLen": 17455
    };
    // 序列化为JSON字符串并发送
    const jsonStr = JSON.stringify(jsonData);
    mqtt.publish(MQTTXterminals, jsonStr); 	
}


function hangdianhxzxv3lost() {
   showTempMessage('航线V3失联动作');
    // 构建JSON数据
    const jsonData = {
	"datatype": 97,
	"datahead": "flight set rc lost action",
	"datalen": 24,
	"data": {
	"rc_lost_action": 2
	},
	"imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    // 序列化为JSON字符串并发送
    const jsonStr = JSON.stringify(jsonData);
    mqtt.publish(MQTTXterminals, jsonStr); 	
}


function hangdianhxzxv3stat() {
   showTempMessage('航线V3执行');
    // 构建JSON数据
    const jsonData = {

	"datatype": 49,
	"datahead": "flight waypoint3 start action",
	"datalen": 24,
	"data": {
	"action": 0
	},
	"imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    // 序列化为JSON字符串并发送
    const jsonStr = JSON.stringify(jsonData);
    mqtt.publish(MQTTXterminals, jsonStr); 	
}

function hangdianhxzxv3call() {
   showTempMessage('航线V3监测状态');
    // 构建JSON数据
    const jsonData = {
	"datatype": 50,
	"datahead": "flight waypoint3 reg mission state",
	"datalen": 17,
	"data": {
	"null": null
	},
	"imei": "InF3dWaXQjzH+xZF1fgqCA=="
    };
    // 序列化为JSON字符串并发送
    const jsonStr = JSON.stringify(jsonData);
    mqtt.publish(MQTTXterminals, jsonStr); 	
}

// 修改航点处理函数，使用每个航点的高度
function hangdianhxzx(flightSpeed, lostAction) { // 移除flightHeight参数
    // 验证所有航点高度
    for (const point of points) {
        if (isNaN(point.height) || point.height < 10) {
            alert(`航点 ${points.indexOf(point) + 1} 高度设置无效，请检查！`);
            return;
        }
    }

    // 1. 经纬度转换（保持不变）
    const radianPoints = points.map(point => {
        const rawLng = point.coord.getLng();
        const rawLat = point.coord.getLat();
        
        let gcjLng, gcjLat;
        if (typeof rawLng === 'number' && typeof rawLat === 'number') {
            const transformed = CoordTransform.gcj02towgs84(rawLng, rawLat);
            gcjLng = transformed.lng;
            gcjLat = transformed.lat;
        }
        
        return {
            longitude: gcjLng * Math.PI / 180,
            latitude: gcjLat * Math.PI / 180,
            height: point.height // 传递当前航点高度
        };
    });

    // 2. 构建mission数组（使用每个航点自己的高度）
    const mission = radianPoints.map(radPoint => ({
        "turn_mode": 0,          
        "max_flight_speed": flightSpeed,
        "waypoint_type": 2,       
        "auto_flight_speed": flightSpeed,
        "heading": 0,              
        "damping_distance": 40,      
        "latitude": radPoint.latitude,
        "point_of_interest": {
            "position_x": 0,
            "position_y": 0,
            "position_z": 0
        },
        "config": {
            "use_local_max_vel": 0,
            "use_local_cruise_vel": 0
        },
        "relative_height": radPoint.height, // 使用当前航点的高度
        "heading_mode": 0,
        "longitude": radPoint.longitude
    }));

    // 3. 构建完整JSON数据（其余部分保持不变）
    const jsonData = {
        "datahead": "flight waypoint2 upload mission",
        "data": {
            "action_when_rc_lost": lostAction === "return" ? 1 : 0,//如果收到return数据就是
            "max_flight_speed": flightSpeed,   
            "mission": mission,
            "auto_flight_speed": flightSpeed,
            "miss_total_len": points.length,     
            "action_list": {
                "action_num": 0,
                "actions": []
            },
            "goto_first_waypoint_mode": 0,
            "finished_action": 1,
            "mission_id": missionId,
            "repeat_times": 0
        },
        "datatype": 52,                          
        "dataextratype": 0,
        "imei": "eFzn49GF6iJn0po715+xdw==",
        "dataLen": 0
    };

    // 4. 计算dataLen并发送（保持不变）
    const jsonStr = JSON.stringify(jsonData);
    jsonData.dataLen = jsonStr.length;
    mqtt.publish(MQTTXterminals, jsonStr); 	
    missionId++;
}

function daorukml() {
    confirm('仅支持kml格式')
 // 获取隐藏的文件选择控件
  const fileInput = document.getElementById('fileSelector');
  
  // 重置文件选择器（避免重复选择同一文件时无法触发change事件）
  fileInput.value = '';
  
  // 触发文件选择对话框
  fileInput.click();
  
  // 监听文件选择事件
  fileInput.onchange = function(e) {
    // 获取选择的文件（只取第一个文件）
    const file = e.target.files[0];
    
    if (!file) {
      console.log('未选择文件');
      return;
    }
    
    // 验证文件类型（双重保险，虽然accept已经限制，但仍需前端验证）
    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      alert('请选择txt格式的文件！');
      return;
    }
    
    console.log('已选择文件：', file.name);
    
    // 读取文件内容（如果需要处理文件内容，可使用以下代码）
    const reader = new FileReader();
    
    // 读取成功后的回调
    reader.onload = function(event) {
      const fileContent = event.target.result;
      console.log('文件内容：', fileContent);
      // 这里可以添加处理航线数据的逻辑（如解析坐标、展示等）
      alert(`成功读取文件：${file.name}\n文件大小：${file.size}字节`);
	  confirm('暂不支持此文件')
    };
    
    // 读取失败的回调
    reader.onerror = function() {
      alert('文件读取失败，请重试！');
    };
    
    // 以文本格式读取文件
    reader.readAsText(file, 'utf-8');
  };
}

// 导出航线为KMZ并上传到MinIO服务器
async function daochukml() {
  try {
    // 1. 生成时间戳作为文件名
    const timestamp = new Date().getTime();
    const fileName = `${timestamp}.kmz`;
    
    // 2. 获取绘制的坐标点和高度数据（请根据实际项目调整获取方式）
    const routeData = getRouteData(); // 新函数获取航线数据经纬度
    if (!routeData || routeData.length === 0) {
      alert("没有可导出的航线数据");
      return;
    }
    
    // 3. 生成KML和WPML内容
    const kmlContent = generateKML(routeData); // template.kml 的内容
    const wpmlContent = generatewpml(routeData); // waylines.wpml 的内容
    
    // 4. 转换为KMZ格式（传入两个文件内容）
    const kmzBlob = await kmlToKmz(kmlContent, wpmlContent);
    
    // 5. 记录KMZ文件名称和实际大小（核心修改）
    kmzFileName = fileName;
    kmzFileSize = kmzBlob.size;
    
    // 6. 上传到MinIO服务器
    await uploadToMinIO(kmzBlob, fileName);
    
    alert(`航线已成功导出并上传至MinIO，文件名：${fileName}`);
    console.log(`KMZ文件 ${fileName} 上传成功，文件大小：${kmzFileSize} 字节`);
    
  } catch (error) {
    console.error("导出或上传KMZ失败：", error);
    alert("导出航线失败，请重试");
  }
}

// 修改获取航线数据函数，从实际生成的mission数据中提取信息
function getRouteData() {
    // 从全局points数组获取原始经纬度（度）和高度，同时关联mission中的其他参数
    // 注意：需先确保hangdianhxzx已执行并生成有效数据
    if (points.length === 0) {
        return [];
    }

    // 获取最新的飞行速度（从输入框获取，与hangdianhxzx保持一致）
    const flightSpeed = parseFloat(document.getElementById('flight-speed').value) || 0;

    // 1. 经纬度转换：GCJ02坐标系转WGS84坐标系
    const radianPoints = points.map(point => {
        const rawLng = point.coord.getLng();
        const rawLat = point.coord.getLat();
        let gcjLng, gcjLat;
        // 确保原始经纬度是有效的数字类型
        if (typeof rawLng === 'number' && typeof rawLat === 'number' && !isNaN(rawLng) && !isNaN(rawLat)) {
            const transformed = CoordTransform.gcj02towgs84(rawLng, rawLat);
            gcjLng = transformed.lng;
            gcjLat = transformed.lat;
        } else {
            // 转换失败时使用原始值兜底，避免数据缺失
            gcjLng = rawLng;
            gcjLat = rawLat;
        }
        return {
            longitude: gcjLng,
            latitude: gcjLat,
            height: point.height // 传递当前航点高度
        };
    });
    
    // 构建航线数据数组（整合转换后的坐标）
    return points.map((point, index) => {
        // 原始经纬度（度）
        const lng = point.coord.getLng();
        const lat = point.coord.getLat();
        // 高度（米）
        const alt = point.height;
        // 转换后的经纬度（WGS84坐标系）
        const transformedLng = radianPoints[index].longitude;
        const transformedLat = radianPoints[index].latitude;
        
        // 返回包含完整信息的对象（可根据需要扩展）
        return {
            lng: transformedLng,        
            lat: transformedLat,       //转换后经纬度
            alt: alt,                  // 高度（米）
            index: index + 1,          // 航点序号
            flightSpeed: flightSpeed,  // 飞行速度（米/秒）
        };
    });
}


//大疆格式生成kml
function generateKML(points) {
    if (!points || points.length === 0) throw new Error("至少需要一个航点坐标");
    const flightSpeed = parseFloat(document.getElementById('flight-speed').value) || 7.0; // 对齐kml.txt的autoFlightSpeed
    const returnHeight = parseFloat(document.getElementById('return-height').value) || 100.0;
    const takeOffHeight = 20.0; // 固定安全起飞高度（kml.txt配置）
    const lostAction = document.getElementById('lost-action')?.value || "goBack";
    const timestamp = new Date().getTime();
    const formatNum = (num) => num.toFixed(1);
    const poiPoint = "24.323345,116.324532,31.0";
    
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.2">
<Document>
    <wpml:author>system</wpml:author>
    <wpml:createTime>${timestamp}</wpml:createTime>
    <wpml:updateTime>${timestamp}</wpml:updateTime>
    <wpml:missionConfig>
        <wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode>
        <wpml:finishAction>goHome</wpml:finishAction>
        <wpml:exitOnRCLost>goContinue</wpml:exitOnRCLost> <!-- 对齐kml.txt -->
        <wpml:executeRCLostAction>goBack</wpml:executeRCLostAction> <!-- 对齐kml.txt-goBack -->
        <wpml:takeOffSecurityHeight>${formatNum(takeOffHeight)}</wpml:takeOffSecurityHeight>
        <wpml:takeOffRefPoint>${points[0].lat.toFixed(6)},${points[0].lng.toFixed(6)},${formatNum(points[0].alt)}</wpml:takeOffRefPoint> <!-- 补充高度 -->
        <wpml:takeOffRefPointAGLHeight>0.0</wpml:takeOffRefPointAGLHeight> <!-- 对齐kml.txt -->
		 <wpml:startPositionRef>${points[0].lat.toFixed(6)},${points[0].lng.toFixed(6)}</wpml:startPositionRef>
        <wpml:globalTransitionalSpeed>${formatNum(flightSpeed)}</wpml:globalTransitionalSpeed>
        <wpml:globalRTHHeight>${formatNum(returnHeight)}</wpml:globalRTHHeight>
        <wpml:droneInfo>
            <wpml:droneEnumValue>67</wpml:droneEnumValue>
		     <wpml:droneSubEnumValue>1</wpml:droneSubEnumValue> <!-- 修正为0 -->
		    </wpml:droneInfo>
        <wpml:payloadInfo>
            <wpml:payloadEnumValue>53</wpml:payloadEnumValue> <!-- 修正为52 -->
		    <wpml:payloadSubEnumValue>0</wpml:payloadSubEnumValue><!-- 修正为0 -->
            <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
        </wpml:payloadInfo>
		<wpml:autoRerouteInfo><!-- 修正添加 -->
		<wpml:missionAutoRerouteMode>1</wpml:missionAutoRerouteMode>
		<wpml:transitionalAutoRerouteMode>1</wpml:transitionalAutoRerouteMode>
		</wpml:autoRerouteInfo>
    </wpml:missionConfig>
    <Folder>
        <wpml:templateType>waypoint</wpml:templateType>
        <wpml:templateId>0</wpml:templateId>
        
        <wpml:waylineCoordinateSysParam>
            <wpml:coordinateMode>WGS84</wpml:coordinateMode>
            <wpml:heightMode>relativeToStartPoint</wpml:heightMode> <!-- 修正为EGM96 -->
            
            <wpml:positioningType>GPS</wpml:positioningType>
            <wpml:globalShootHeight>${formatNum(points[0].alt)}</wpml:globalShootHeight>
			<wpml:globalHeight>${formatNum(points[0].alt)}</wpml:globalHeight>
			<wpml:caliFlightEnable>0</wpml:caliFlightEnable>
            <wpml:surfaceFollowModeEnable>0</wpml:surfaceFollowModeEnable>
            <wpml:surfaceRelativeHeight>${formatNum(points[0].alt)}</wpml:surfaceRelativeHeight>
        </wpml:waylineCoordinateSysParam>
        
        <wpml:autoFlightSpeed>${formatNum(flightSpeed)}</wpml:autoFlightSpeed>
        <wpml:gimbalPitchMode>usePointSetting</wpml:gimbalPitchMode> <!-- 修正为usePointSetting -->
         <wpml:globalWaypointHeadingParam>
           <wpml:waypointHeadingMode>followWayline</wpml:waypointHeadingMode>
		   <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
        </wpml:globalWaypointHeadingParam>
        
        <wpml:globalWaypointTurnMode>toPointAndStopWithDiscontinuityCurvature</wpml:globalWaypointTurnMode> <!-- 对齐kml.txt -->
        <wpml:globalUseStraightLine>0</wpml:globalUseStraightLine> <!-- 补充kml.txt配置 -->`;
    points.forEach((point, index) => {
        kml += `
        <Placemark>
            <Point>
                <coordinates>${point.lng.toFixed(6)},${point.lat.toFixed(6)}</coordinates> <!-- 经纬度顺序正确 -->
            </Point>
            <wpml:index>${index}</wpml:index>
            <wpml:ellipsoidHeight>90.2</wpml:ellipsoidHeight> <!-- 对齐kml.txt -->
            <wpml:height>${formatNum(point.alt)}</wpml:height>
            <wpml:useGlobalHeight>0</wpml:useGlobalHeight> <!-- 修正为1 -->
            <wpml:useGlobalSpeed>0</wpml:useGlobalSpeed> <!-- 修正为1 -->
			<wpml:waypointSpeed>${formatNum(flightSpeed)}</wpml:waypointSpeed>
            <wpml:useGlobalHeadingParam>0</wpml:useGlobalHeadingParam> <!-- 修正为1 -->
			<wpml:waypointHeadingParam>
            <wpml:waypointHeadingMode>followWayline</wpml:waypointHeadingMode>
            <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
            </wpml:waypointHeadingParam>
            <wpml:useGlobalTurnParam>0</wpml:useGlobalTurnParam> <!-- 修正为1 -->
            <wpml:gimbalPitchAngle>0</wpml:gimbalPitchAngle> <!-- 补充kml.txt配置 -->`;
        
			if (index === 1) {
            kml += `
            <wpml:actionGroup>
                <wpml:actionGroupId>0</wpml:actionGroupId>
                <wpml:actionGroupStartIndex>1</wpml:actionGroupStartIndex>
                <wpml:actionGroupEndIndex>1</wpml:actionGroupEndIndex>
                <wpml:actionGroupMode>sequence</wpml:actionGroupMode>
                <wpml:actionTrigger>
                    <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
                </wpml:actionTrigger>

                <wpml:action>
                    <wpml:actionId>0</wpml:actionId>
                    <wpml:actionActuatorFunc>gimbalRotate</wpml:actionActuatorFunc>
                    <wpml:actionActuatorFuncParam>
                        <wpml:gimbalRotateMode>absoluteAngle</wpml:gimbalRotateMode>
                        <wpml:gimbalPitchRotateEnable>0</wpml:gimbalPitchRotateEnable>
                        <wpml:gimbalPitchRotateAngle>0</wpml:gimbalPitchRotateAngle>
                        <wpml:gimbalRollRotateEnable>0</wpml:gimbalRollRotateEnable>
                        <wpml:gimbalRollRotateAngle>0</wpml:gimbalRollRotateAngle>
                        <wpml:gimbalYawRotateEnable>1</wpml:gimbalYawRotateEnable>
                        <wpml:gimbalYawRotateAngle>30</wpml:gimbalYawRotateAngle>
                        <wpml:gimbalRotateTimeEnable>0</wpml:gimbalRotateTimeEnable>
                        <wpml:gimbalRotateTime>0</wpml:gimbalRotateTime>
                        <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
                    </wpml:actionActuatorFuncParam>
                </wpml:action>

                <wpml:action>
                    <wpml:actionId>1</wpml:actionId>
                    <wpml:actionActuatorFunc>takePhoto</wpml:actionActuatorFunc>
                    <wpml:actionActuatorFuncParam>
                        <wpml:fileSuffix>point${index}</wpml:fileSuffix>
                        <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
                    </wpml:actionActuatorFuncParam>
                </wpml:action>
            </wpml:actionGroup>`;
        }
        kml += `
        </Placemark>`;
    });

    kml += `
    </Folder>
</Document>
</kml>`;
  
  return kml;
}

//大疆格式生成wpml
function generatewpml(points) {
    // 获取页面配置参数
    const flightSpeed = parseFloat(document.getElementById('flight-speed').value) || 4.0;
    const returnHeight = parseFloat(document.getElementById('return-height').value) || 100.0;
    const takeOffHeight = 20.0; // 安全起飞高度，可根据实际需求调整
    const lostAction = document.getElementById('lost-action').value;
    
    // 生成Unix时间戳（毫秒）
    const timestamp = new Date().getTime();
    
    // 关键：对数值做格式化，强制保留1位小数
    const formatNum = (num) => num.toFixed(1); // 新增：格式化函数，保留1位小数
    
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.2">
<Document>
    <wpml:author>system</wpml:author>
    <wpml:createTime>${timestamp}</wpml:createTime>
    <wpml:updateTime>${timestamp}</wpml:updateTime>
    <wpml:missionConfig>
        <wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode>
        <wpml:finishAction>goHome</wpml:finishAction>
        <wpml:exitOnRCLost>executeLostAction</wpml:exitOnRCLost>
        <wpml:executeRCLostAction>${lostAction === "return" ? "goBack" : "landing"}</wpml:executeRCLostAction>
        <wpml:takeOffSecurityHeight>${formatNum(takeOffHeight)}</wpml:takeOffSecurityHeight>
        <wpml:globalTransitionalSpeed>${formatNum(flightSpeed)}</wpml:globalTransitionalSpeed>
        <wpml:globalRTHHeight>${formatNum(returnHeight)}</wpml:globalRTHHeight>
        <wpml:droneInfo>
            <wpml:droneEnumValue>67</wpml:droneEnumValue>
            <wpml:droneSubEnumValue>1</wpml:droneSubEnumValue>
        </wpml:droneInfo>
        <wpml:payloadInfo>
            <wpml:payloadEnumValue>53</wpml:payloadEnumValue>
            <wpml:payloadSubEnumValue>0</wpml:payloadSubEnumValue>
            <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
        </wpml:payloadInfo>
        <wpml:autoRerouteInfo>
            <wpml:missionAutoRerouteMode>1</wpml:missionAutoRerouteMode>
            <wpml:transitionalAutoRerouteMode>1</wpml:transitionalAutoRerouteMode>
        </wpml:autoRerouteInfo>
        
    </wpml:missionConfig>
    <Folder>
        <wpml:templateType>waypoint</wpml:templateType>
        <wpml:templateId>0</wpml:templateId>
		<wpml:waylineId>0</wpml:waylineId> 
        <wpml:autoFlightSpeed>${formatNum(flightSpeed)}</wpml:autoFlightSpeed>
		<wpml:executeHeightMode>relativeToStartPoint</wpml:executeHeightMode>
        
            <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            
       
        <wpml:globalWaypointHeadingParam>
            <wpml:waypointHeadingMode>followWayline</wpml:waypointHeadingMode>
            <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
        </wpml:globalWaypointHeadingParam>
        <wpml:globalWaypointTurnMode>
            <wpml:waypointTurnMode>toPointAndStopWithDiscontinuityCurvature</wpml:waypointTurnMode>
        </wpml:globalWaypointTurnMode>`;
    points.forEach((point, index) => {
        kml += `
        <Placemark>
            <Point>
                <coordinates>${point.lng.toFixed(6)},${point.lat.toFixed(6)}</coordinates>
            </Point>
            <wpml:index>${index}</wpml:index>
            
            <wpml:executeHeight>${formatNum(point.alt)}</wpml:executeHeight>
            
            <wpml:waypointSpeed>${formatNum(flightSpeed)}</wpml:waypointSpeed>
			<wpml:isRisky>0</wpml:isRisky>
           
            <wpml:waypointHeadingParam>
                <wpml:waypointHeadingMode>followWayline</wpml:waypointHeadingMode>
                <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
            </wpml:waypointHeadingParam>
       
            <wpml:waypointTurnParam>
                <wpml:waypointTurnMode>toPointAndStopWithDiscontinuityCurvature</wpml:waypointTurnMode>
            </wpml:waypointTurnParam>
        </Placemark>`;
    });

    kml += `
    </Folder>
</Document>
</kml>`;
  
  return kml;
}

/**
 * 将 KML 和 WPML 内容打包为 KMZ 文件（包含指定文件夹结构）
 * @param {string} kmlContent - template.kml 文件的文本内容
 * @param {string} wpmlContent - waylines.wpml 文件的文本内容
 * @returns {Promise<Blob>} 生成的 KMZ 格式 Blob 对象
 */
async function kmlToKmz(kmlContent, wpmlContent) {
  // 检查 JSZip 库是否引入
  if (typeof JSZip === 'undefined') {
    throw new Error("请引入JSZip库以处理KMZ压缩");
  }

  // 校验传入的内容是否有效
  if (!kmlContent || typeof kmlContent !== 'string') {
    throw new Error("template.kml 内容不能为空且必须为字符串类型");
  }
  if (!wpmlContent || typeof wpmlContent !== 'string') {
    throw new Error("waylines.wpml 内容不能为空且必须为字符串类型");
  }
  
  const zip = new JSZip();
  
  // 1. 创建 wpmz 根文件夹
  const wpmzFolder = zip.folder("wpmz");
  
  // 2. 在 wpmz 下创建 res 子文件夹（空文件夹）
  wpmzFolder.folder("res");
  
  // 3. 在 wpmz 下添加 waylines.wpml 文件（WPML内容）
  wpmzFolder.file("waylines.wpml", wpmlContent);
  
  // 4. 在 wpmz 下添加 template.kml 文件（KML内容）
  wpmzFolder.file("template.kml", kmlContent);
  
  // 生成 KMZ 格式的 Blob 对象并返回
  return await zip.generateAsync({ 
    type: "blob", 
    mimeType: "application/vnd.google-earth.kmz",
    compression: "DEFLATE", // 启用压缩，减小文件体积
    compressionOptions: { level: 6 } // 压缩级别（1-9，6为平衡值）
  });
}


// 替换 hzhxzx.js 中的 uploadToMinIO 函数
async function uploadToMinIO(blob, fileName) {
    // MinIO配置（与kmz保存上传.html保持一致）
    const minioConfig = {
        endpoint: document.getElementById('minioEndpoint')?.value || "222.139.28.132",
        port: parseInt(document.getElementById('minioPort')?.value) || 9000,
        accessKey: document.getElementById('minioAccessKey')?.value || "SupUiI4V7QR02yaAslEo",
        secretKey: document.getElementById('minioSecretKey')?.value || "eEKIsTVJ2iSy9nvxWgkADH7jmbLf3OcRpwPYC1Uu",
        bucket: document.getElementById('minioBucket')?.value || "d10kmz",
        useSSL: document.getElementById('minioUseHttps')?.value === 'true' || false
    };

    try {
        // 配置AWS SDK（复用kmz保存上传.html的成熟方案）
        AWS.config.update({
            accessKeyId: minioConfig.accessKey,
            secretAccessKey: minioConfig.secretKey,
            region: 'us-east-1', // MinIO忽略区域
            s3ForcePathStyle: true, // 关键：强制路径风格
            endpoint: new AWS.Endpoint(`${minioConfig.useSSL ? 'https' : 'http'}://${minioConfig.endpoint}:${minioConfig.port}`)
        });

        const s3 = new AWS.S3();

        // 检查并创建存储桶
        try {
            await s3.headBucket({ Bucket: minioConfig.bucket }).promise();
        } catch (err) {
            if (err.code === 'NotFound') {
                await s3.createBucket({ Bucket: minioConfig.bucket }).promise();
            } else {
                throw new Error(`存储桶操作失败: ${err.message}`);
            }
        }

        // 上传文件
        const params = {
            Bucket: minioConfig.bucket,
            Key: fileName,
            Body: blob,
            ContentType: 'application/vnd.google-earth.kmz'
        };

        await s3.putObject(params).promise();
        console.log(`文件 ${fileName} 上传成功`);
    } catch (error) {
        console.error('MinIO上传失败:', error);
        throw error;
    }
}

// 移除原有的 getMinIOHeaders 和 generateSignature 函数（不再需要）


