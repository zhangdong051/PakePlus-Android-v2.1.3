// 新增：用于缓存数据的数组
let dataRecords = [];

function processMqttData(jsonData) {
    try {
        // 检查数据结构完整性
        if (!jsonData || !jsonData.data) {
            throw new Error("数据结构不完整，缺少data字段");
        }

        const data = jsonData.data;
		        
        // 提取原始GPS经纬度
        let rawLng = data.gps_position?.longitude;
		rawLng = rawLng/10000000;
        let rawLat = data.gps_position?.latitude;
		rawLat = rawLat/10000000;
		//console.log("原始数据", rawLng);
        
        // 转换为GCJ02坐标系（仅当原始经纬度为有效数字时）
        let gcjLng = "114.388185";
        let gcjLat = "36.148881";
        if (typeof rawLng === 'number' && typeof rawLat === 'number') {
            const transformed = CoordTransform.wgs84togcj02(rawLng, rawLat);
            gcjLng = transformed.lng;
            gcjLat = transformed.lat;
			//console.log("转化成功", gcjLng);
        }
        
        // 提取目标字段，使用可选链操作符防止属性不存在时出错
        const extractedData = {
            // 使用转换后的GCJ02坐标
            gps_longitude: gcjLng,
            gps_latitude: gcjLat,
            gps_altitude: data.gps_position?.altitude ?? "未知",
            gps_fix_state: data.gps_details?.total_satellite_number_used ?? "未知",
					
			acc_w: data.quaternion?.q0 ?? "未知",
			acc_x: data.quaternion?.q1 ?? "未知",
			acc_y: data.quaternion?.q2 ?? "未知",
			acc_z: data.quaternion?.q3 ?? "未知",
			
			sudu_x: data.velocity?.data?.x?? "未知",
           
			//flight_status": 0,//飞行状态
			//"display_mode_status": 6,//飞行模式状态
			//avoid_data": {//避障数据
			//"gimbal_angles": {//云台角度
			//"rc": {//遥控摇杆信息
			battery_bfb: data.single_battery_info_index_first?.battery_capacity_percent ?? "未知",
			mobile_date: data.gps_date ?? "未知",
			mobile_time: data.gps_time ?? "未知",
            mobile_mccmnc: data.mobile_info?.mccmnc ?? "未知",
            mobile_network: data.mobile_info?.network ?? "未知",
            mobile_freqband: data.mobile_info?.freqband ?? "未知",
            mobile_pcellid: data.mobile_info?.pcellid ?? "未知",
            mobile_rsrp: data.mobile_info?.rsrp ?? "未知",
            mobile_snr: data.mobile_info?.snr ?? "未知",
			mobile_uplink: data.mobile_info?.uplink_bandwidth ?? "未知",
			mobile_downlink: data.mobile_info?.downlink_bandwidth ?? "未知"
        };
     // 新增：将提取的数据添加到缓存
        dataRecords.push({
            timestamp: new Date().toISOString(), // 添加时间戳
            data: extractedData
        });
       // console.log("提取的目标数据：", extractedData);
        return extractedData;
    } catch (error) {
        console.error("数据提取失败：", error.message);
        return null;
    }
}

async function processcallback(message) {
  try {
    // 打印原始数据，方便排查格式问题
    const rawStr = message.toString();
    // console.log('接收到原始数据:', rawStr);

    // 解析JSON数据
    const jsonData = JSON.parse(rawStr);
    
    // ==============================================
    // 核心新增：根据 datatype 执行不同逻辑
    // ==============================================
    const dataType = jsonData.datatype;

    // 1. 处理激光雷达数据 datatype = 144（原有逻辑）
    if (dataType === 144) {
      // 提取激光雷达相关信息
      const dataHead = jsonData.datahead || "未知数据头";
      const laserInfo = jsonData.data?.laser_ranging_info || {};
      const longitude = laserInfo.longitude || "未知";
      const latitude = laserInfo.latitude || "未知";
      const distance = laserInfo.distance || "未知";
      const altitude = laserInfo.altitude || "未知";
      
      // 组合显示信息
      const displayText =  '⭕'+`🌏${longitude.toFixed(3)}🌏 ${latitude.toFixed(3)}🟡${altitude/10}🟢${distance/10}m`;
      
      // 更新激光雷达显示
      const jiguangElement = document.getElementById('jiguang-data');
      if (jiguangElement) {
        jiguangElement.textContent = displayText;
      } else {
        console.warn("未找到jiguang-data元素，无法更新激光雷达显示");
      }
    }

    // 2. 处理SD卡存储数据 datatype = 49（新增逻辑）
    else if (dataType === 49) {
      // 提取SD卡信息
      const sdData = jsonData.data || {};
      // 单位：默认是MB/GB？按你接口原样显示，可自行调整
	  const totalCapacity = (sdData.total_capacity / 1024).toFixed(1) + 'G';
	  const remainCapacity = (sdData.remain_capacity / 1024).toFixed(1) + 'G';

      // 组合显示文本（可自定义样式）
      const sdText = `💾${totalCapacity}/💾${remainCapacity}`;
      
      // 显示到页面（请把 id="sd-storage" 加到你的HTML元素上）
      const sdElement = document.getElementById('sd-storage');
      if (sdElement) {
        sdElement.textContent = sdText;
      } else {
        console.warn("未找到sd-storage元素，无法更新SD卡信息");
      }
    }

    // 其他类型不处理
    else {
      // console.log('未处理的数据类型:', dataType);
    }

  } catch (error) {
    // console.error('解析数据失败:', error, '原始消息:', message.toString());
  }
}


// 修改：保存数据到TXT文件的函数（增加表头，调整字段顺序与表头对应）
function saveDataToTxt() {
    if (dataRecords.length === 0) {
        alert("暂无数据可保存");
        return;
    }

    // 定义数据字段顺序（与表头顺序一一对应）
    const fieldOrder = [
        'mobile_time',       // 时间戳
        'gps_latitude',      // 纬度
        'gps_longitude',     // 经度
        'gps_altitude',      // 高度
        'gps_fix_state',     // 卫星
        'battery_bfb',       // 电量
        'mobile_mccmnc',     // mcc
        'mobile_network',    // net
		'mobile_freqband',    // net
        'mobile_pcellid',    // pci
        'mobile_rsrp',       // rsrp
        'mobile_snr',        // snr
        'mobile_uplink',     // up
        'mobile_downlink'    // down
    ];

    // 定义表头行
    const header = "时间戳 纬度 经度 高度 卫星 电量 mcc net band pci rsrp snr up down";
    
    // 格式化数据为每行一条，空格分隔（先添加表头）
    let textContent = header + '\n'; // 第一行是表头
    dataRecords.forEach(record => {
        const data = record.data;
        // 按顺序提取字段值，用空格拼接
        const line = fieldOrder.map(field => data[field]).join(' ');
        textContent += line + '\n';
    });

    // 创建Blob对象
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    // 创建下载链接并触发下载
    const a = document.createElement("a");
    a.href = url;
    a.download = `数据记录_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    
    // 清理资源
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

// 新增：绑定下载按钮事件
// 移除原有的DOMContentLoaded监听，直接绑定事件
const downloadBtn = document.getElementById("downloadBtn");
if (downloadBtn) {
    downloadBtn.addEventListener("click", saveDataToTxt);
} else {
    console.warn("未找到downloadBtn元素，无法绑定下载事件");
}
/**
 * 组合mobile_date和mobile_time为标准日期时间格式
 * @param {string|number} mobileDate - 日期（格式：YYYYMMDD，如20251211）
 * @param {string|number} mobileTime - 时间（格式：HHMMSS的简写，如33638对应113638）
 * @returns {string} 格式化后的日期时间（如2025-12-11 11:36:38）
 */
function combineDateTime(mobileDate, mobileTime) {
    // 处理日期部分
    if (!mobileDate || String(mobileDate).length !== 8) {
        return "日期格式错误";
    }
    const dateStr = String(mobileDate);
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const formattedDate = `${year}-${month}-${day}`;

    // 1. 精准空值判断
    if (mobileTime === undefined || mobileTime === null || mobileTime === '') {
        return "时间格式错误";
    }
    // 2. 转为字符串并去除首尾空格
    let timeStr = String(mobileTime).trim();

    // 4. 处理时间长度
    if (timeStr.length > 6) {
        return "时间格式错误";
    }
    timeStr = timeStr.padStart(6, '0');

    // 兜底校验
    if (timeStr.length !== 6) {
        return "时间格式错误";
    }

    // 处理小时部分：UTC转北京时间（+8小时）
    let hour = parseInt(timeStr.slice(0, 2), 10); // 转为数字
    hour = (hour + 8) % 24; // +8小时并处理跨天（如23+8=31 → 31%24=7）
    hour = hour.toString().padStart(2, '0'); // 补0保持两位格式

    const minute = timeStr.slice(2, 4);
    const second = timeStr.slice(4, 6);
    const formattedTime = `${hour}:${minute}:${second}`;

    return `${formattedDate} ${formattedTime}`;
}

function updateDataDisplay(data) {
    if (!data) return;
 // 新增：处理日期时间组合
    const combinedDateTime = combineDateTime(data.mobile_date, data.mobile_time);
    // 更新各个数据字段的显示
			document.getElementById('lon-data').textContent = '📌' +  data.gps_longitude.toFixed(5);
			document.getElementById('lat-data').textContent = '📌' + data.gps_latitude.toFixed(5);
			document.getElementById('alt-data').textContent =  Math.round((data.gps_altitude/ 1000));
			document.getElementById('gps-data').textContent = '📡' + data.gps_fix_state;
			document.getElementById('mobtim-data').textContent = '🕒' + combinedDateTime;
			document.getElementById('mobmcc-data').textContent = 'ℹ️' + data.mobile_mccmnc;
			document.getElementById('mobnet-data').textContent = '🌏' + data.mobile_network;
			document.getElementById('mobbnd-data').textContent = '🖱️' + data.mobile_freqband;
			document.getElementById('mobpci-data').textContent = '🌐' + data.mobile_pcellid;
			document.getElementById('mobrsp-data').textContent = '📶' + data.mobile_rsrp;
			document.getElementById('mobsnr-data').textContent = '❌' + data.mobile_snr;
						document.getElementById('uplink-data').textContent = '🔼' + data.mobile_uplink;
						document.getElementById('downlink-data').textContent = '🔽' + data.mobile_downlink;
	        document.getElementById('batt-data').textContent = '🔋' + data.battery_bfb;
		    document.getElementById('speed-data').textContent = data.sudu_x.toFixed(2);//速度显示
	

            const q0 = data.acc_w;
            const q1 = data.acc_x;
            const q2 = data.acc_y;
            const q3 = data.acc_z;
			
			hudpitch = Math.asin(-2 * q1 * q3 + 2 * q0 * q2) * 57.3;
			hudroll  = - Math.atan2(2 * q2 * q3 + 2 * q0 * q1, -2 * q1 * q1 - 2 * q2 * q2 + 1) * 57.3;
			//console.log("pitch：", hudpitch);
	        linehud();
}	

		
