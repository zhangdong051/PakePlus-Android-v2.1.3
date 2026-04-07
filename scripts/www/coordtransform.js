/**
 * 坐标转换工具类 - WGS84与GCJ02坐标系互转
 * WGS84：GPS原始坐标
 * GCJ02：国测局加密坐标（高德地图等使用）
 */
const CoordTransform = {
    /**
     * WGS84转GCJ02(火星坐标系)
     * @param {Number} lng 经度
     * @param {Number} lat 纬度
     * @returns {Object} 转换后的坐标 {lng, lat}
     */
    wgs84togcj02: function(lng, lat) {
        if (this.outOfChina(lng, lat)) {
            return { lng: lng, lat: lat };
        }
        
        let dlat = this.transformLat(lng - 105.0, lat - 35.0);
        let dlng = this.transformLng(lng - 105.0, lat - 35.0);
        const radlat = lat / 180.0 * Math.PI;
        let magic = Math.sin(radlat);
        magic = 1 - this.ee * magic * magic;
        const sqrtmagic = Math.sqrt(magic);
        dlat = (dlat * 180.0) / ((this.a * (1 - this.ee)) / (magic * sqrtmagic) * Math.PI);
        dlng = (dlng * 180.0) / (this.a / sqrtmagic * Math.cos(radlat) * Math.PI);
        const mglat = lat + dlat;
        const mglng = lng + dlng;
        
        return { lng: mglng, lat: mglat };
    },

    /**
     * GCJ02(火星坐标系)转WGS84
     * @param {Number} lng 经度
     * @param {Number} lat 纬度
     * @returns {Object} 转换后的坐标 {lng, lat}
     */
    gcj02towgs84: function(lng, lat) {
        if (this.outOfChina(lng, lat)) {
            return { lng: lng, lat: lat };
        }
        
        let dlat = this.transformLat(lng - 105.0, lat - 35.0);
        let dlng = this.transformLng(lng - 105.0, lat - 35.0);
        const radlat = lat / 180.0 * Math.PI;
        let magic = Math.sin(radlat);
        magic = 1 - this.ee * magic * magic;
        const sqrtmagic = Math.sqrt(magic);
        dlat = (dlat * 180.0) / ((this.a * (1 - this.ee)) / (magic * sqrtmagic) * Math.PI);
        dlng = (dlng * 180.0) / (this.a / sqrtmagic * Math.cos(radlat) * Math.PI);
        const mglat = lat + dlat;
        const mglng = lng + dlng;
        
        return { lng: lng * 2 - mglng, lat: lat * 2 - mglat };
    },

    /**
     * 判断坐标是否在国内，不在国内则不做偏移
     * @param {Number} lng 经度
     * @param {Number} lat 纬度
     * @returns {Boolean} 是否在国内
     */
    outOfChina: function(lng, lat) {
        return (lng < 72.004 || lng > 137.8347) || 
               ((lat < 0.8293 || lat > 55.8271) || false);
    },

    // 转换算法内部参数
    a: 6378245.0,
    ee: 0.00669342162296594323,
    
    /**
     * 纬度转换
     * @private
     */
    transformLat: function(x, y) {
        let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
        ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
        return ret;
    },
    
    /**
     * 经度转换
     * @private
     */
    transformLng: function(x, y) {
        let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
        ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
        return ret;
    }
};

// 导出模块，支持浏览器直接使用
if (typeof window !== 'undefined') {
    window.CoordTransform = CoordTransform;
}