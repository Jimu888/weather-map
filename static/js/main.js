// 获取访问计数
function fetchVisitorCount() {
    // 由于没有后端，暂时移除访问计数功能
    document.getElementById('visitorCount').textContent = '-';
}

// 地图和天气功能的主要脚本
document.addEventListener('DOMContentLoaded', function() {
    fetchVisitorCount();
    
    // 初始化地图，添加平滑缩放效果
    const map = L.map('weather-map', {
        center: [35.86166, 104.195397],
        zoom: 4,
        zoomAnimation: true,
        zoomSnap: 0.1,  // 允许更精细的缩放级别
        zoomDelta: 0.5, // 每次缩放的步长更小
        wheelDebounceTime: 100, // 减少鼠标滚轮缩放的抖动
        wheelPxPerZoomLevel: 60 // 需要更多的滚动来完成一个缩放级别
    });

    // 添加更美观的地图图层
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        minZoom: 3
    }).addTo(map);

    // 修复地图右下角归属信息样式
    map.attributionControl.setPrefix('');
    document.querySelector('.leaflet-control-attribution').style.fontSize = '10px';
    document.querySelector('.leaflet-control-attribution').style.background = 'rgba(255, 255, 255, 0.7)';
    
    // 城市和天气标记的存储
    const cityMarkers = {};
    // 存储城市天气数据，用于筛选
    const cityWeatherData = {};
    // 存储县级城市标记
    const countyMarkers = {};
    // 存储县级城市天气数据
    const countyWeatherData = {};
    
    // 当前选择的预报天数
    let selectedDays = 0;
    // 当前是否应用筛选
    let filterApplied = false;
    // 当前是否显示县级城市
    let showCounties = false;
    // 是否已加载县级城市数据
    let countiesLoaded = false;
    // 当前选择的天气类型
    let currentWeatherType = '';
    
    // 天气代码与本地图标的映射
    const weatherIconMap = {
        // 晴天
        '01d': 'sunny.png',
        '01n': 'sunny.png',
        // 多云
        '02d': 'douyun.png',
        '02n': 'douyun.png',
        '03d': 'douyun.png',
        '03n': 'douyun.png',
        '04d': 'douyun.png',
        '04n': 'douyun.png',
        // 阴天
        '50d': 'yintian.png',
        '50n': 'yintian.png',
        // 小雨
        '10d': 'xiaoyu.png',
        '10n': 'xiaoyu.png',
        // 中雨
        '09d': 'zhongyu.png',
        '09n': 'zhongyu.png',
        // 大雨/暴雨 (API没有直接的大雨/暴雨代码，需要根据天气描述判断)
        // 雷阵雨
        '11d': 'leizhenyu.png',
        '11n': 'leizhenyu.png',
        // 雪
        '13d': 'snow.png',
        '13n': 'snow.png',
        // 默认图标
        'default': 'sunny.png'
    };
    
    // 格式化日期的函数
    function formatDate(date) {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }
    
    // 初始化日期选择器
    const datePicker = document.getElementById('date-picker');
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 4); // 最多预测5天
    
    datePicker.value = formatDate(today);
    datePicker.min = formatDate(today);
    datePicker.max = formatDate(maxDate);
    
    // 添加点击事件监听器，使点击输入框任何位置都能打开日期选择窗口
    datePicker.addEventListener('click', function() {
        // 使用 showPicker() 方法打开日期选择窗口
        this.showPicker();
    });
    
    // 城市数据
    const cities = [
        // 直辖市
        {'name': '北京', 'lat': 39.9042, 'lon': 116.4074},
        {'name': '上海', 'lat': 31.2304, 'lon': 121.4737},
        {'name': '天津', 'lat': 39.0842, 'lon': 117.2009},
        {'name': '重庆', 'lat': 29.5630, 'lon': 106.5516},
        
        // 华东地区
        {'name': '南京', 'lat': 32.0603, 'lon': 118.7969},
        {'name': '杭州', 'lat': 30.2741, 'lon': 120.1551},
        {'name': '青岛', 'lat': 36.0671, 'lon': 120.3826},
        {'name': '厦门', 'lat': 24.4798, 'lon': 118.0894},
        
        // 华南地区
        {'name': '广州', 'lat': 23.1291, 'lon': 113.2644},
        {'name': '深圳', 'lat': 22.5431, 'lon': 114.0579},
        {'name': '海口', 'lat': 20.0444, 'lon': 110.3244},
        
        // 华中地区
        {'name': '武汉', 'lat': 30.5928, 'lon': 114.3055},
        {'name': '长沙', 'lat': 28.2282, 'lon': 112.9388},
        {'name': '郑州', 'lat': 34.7466, 'lon': 113.6254},
        
        // 华北地区
        {'name': '太原', 'lat': 37.8735, 'lon': 112.5634},
        {'name': '呼和浩特', 'lat': 40.8427, 'lon': 111.7491},
        
        // 西北地区
        {'name': '西安', 'lat': 34.3416, 'lon': 108.9398},
        {'name': '兰州', 'lat': 36.0594, 'lon': 103.8343},
        {'name': '西宁', 'lat': 36.6232, 'lon': 101.7805},
        {'name': '乌鲁木齐', 'lat': 43.8256, 'lon': 87.6168},
        
        // 西南地区
        {'name': '成都', 'lat': 30.5728, 'lon': 104.0668},
        {'name': '贵阳', 'lat': 26.6470, 'lon': 106.6302},
        {'name': '昆明', 'lat': 25.0453, 'lon': 102.7097},
        {'name': '拉萨', 'lat': 29.6500, 'lon': 91.1400},
        
        // 东北地区
        {'name': '沈阳', 'lat': 41.8057, 'lon': 123.4315},
        {'name': '长春', 'lat': 43.8170, 'lon': 125.3242},
        {'name': '哈尔滨', 'lat': 45.8038, 'lon': 126.5340}
    ];

    // 县级城市数据
    const counties = [
        // 原有县级城市
        {'name': '张家口', 'lat': 40.7671, 'lon': 114.8806},
        {'name': '大理', 'lat': 25.6065, 'lon': 100.2675},
        {'name': '丽江', 'lat': 26.8721, 'lon': 100.2301},
        {'name': '三亚', 'lat': 18.2534, 'lon': 109.5120},
        {'name': '大连', 'lat': 38.9140, 'lon': 121.6147},
        {'name': '苏州', 'lat': 31.2990, 'lon': 120.5853},
        {'name': '宁波', 'lat': 29.8683, 'lon': 121.5440},
        {'name': '珠海', 'lat': 22.2710, 'lon': 113.5767},
        {'name': '威海', 'lat': 37.5130, 'lon': 122.1200},
        {'name': '桂林', 'lat': 25.2736, 'lon': 110.2907},
        
        // 新增东部沿海城市
        {'name': '青岛', 'lat': 36.0671, 'lon': 120.3826},
        {'name': '厦门', 'lat': 24.4798, 'lon': 118.0894},
        {'name': '烟台', 'lat': 37.5365, 'lon': 121.3997},
        {'name': '温州', 'lat': 27.9939, 'lon': 120.6992},
        {'name': '舟山', 'lat': 30.0164, 'lon': 122.1064},
        {'name': '福州', 'lat': 26.0745, 'lon': 119.2965},
        {'name': '湛江', 'lat': 21.2707, 'lon': 110.3594},
        {'name': '北海', 'lat': 21.4810, 'lon': 109.1197},
        
        // 新增南方城市
        {'name': '惠州', 'lat': 23.1116, 'lon': 114.4161},
        {'name': '东莞', 'lat': 23.0430, 'lon': 113.7633},
        {'name': '中山', 'lat': 22.5176, 'lon': 113.3928},
        {'name': '佛山', 'lat': 23.0292, 'lon': 113.1231},
        {'name': '肇庆', 'lat': 23.0471, 'lon': 112.4650},
        {'name': '韶关', 'lat': 24.8108, 'lon': 113.5965},
        {'name': '梅州', 'lat': 24.2885, 'lon': 116.1255},
        {'name': '清远', 'lat': 23.6817, 'lon': 113.0569},
        
        // 新增西部城市
        {'name': '拉萨', 'lat': 29.6500, 'lon': 91.1000},
        {'name': '西宁', 'lat': 36.6167, 'lon': 101.7667},
        {'name': '林芝', 'lat': 29.6491, 'lon': 94.3613},
        {'name': '玉树', 'lat': 33.0167, 'lon': 97.0000},
        {'name': '日喀则', 'lat': 29.2667, 'lon': 88.8833},
        {'name': '那曲', 'lat': 31.4800, 'lon': 92.0500},
        {'name': '阿里', 'lat': 32.5000, 'lon': 80.1000},
        {'name': '昌都', 'lat': 31.1333, 'lon': 97.1667},
        
        // 新增中部城市
        {'name': '黄山', 'lat': 29.7147, 'lon': 118.3173},
        {'name': '洛阳', 'lat': 34.6196, 'lon': 112.4540},
        {'name': '常德', 'lat': 29.0316, 'lon': 111.6983},
        {'name': '岳阳', 'lat': 29.3559, 'lon': 113.1283},
        {'name': '宜昌', 'lat': 30.6925, 'lon': 111.2864},
        {'name': '襄阳', 'lat': 32.0424, 'lon': 112.1221},
        {'name': '南阳', 'lat': 32.9903, 'lon': 112.5283},
        {'name': '信阳', 'lat': 32.1264, 'lon': 114.0747},
        
        // 新增北方城市
        {'name': '承德', 'lat': 40.9515, 'lon': 117.9634},
        {'name': '唐山', 'lat': 39.6305, 'lon': 118.1802},
        {'name': '秦皇岛', 'lat': 39.9353, 'lon': 119.5990},
        {'name': '廊坊', 'lat': 39.5382, 'lon': 116.7031},
        {'name': '邯郸', 'lat': 36.6252, 'lon': 114.5390},
        {'name': '邢台', 'lat': 37.0709, 'lon': 114.5041},
        {'name': '保定', 'lat': 38.8577, 'lon': 115.4656},
        {'name': '石家庄', 'lat': 38.0428, 'lon': 114.5149},
        
        // 新增东北地区
        {'name': '牡丹江', 'lat': 44.5525, 'lon': 129.6321},
        {'name': '佳木斯', 'lat': 46.8081, 'lon': 130.3208},
        {'name': '齐齐哈尔', 'lat': 47.3421, 'lon': 123.9178},
        {'name': '吉林', 'lat': 43.8378, 'lon': 126.5494},
        {'name': '延吉', 'lat': 42.9061, 'lon': 129.5114},
        {'name': '白山', 'lat': 41.9382, 'lon': 126.4279},
        {'name': '丹东', 'lat': 40.1241, 'lon': 124.3526},
        {'name': '抚顺', 'lat': 41.8798, 'lon': 123.9575}
    ];

    // 地级市数据扩展（在原有的城市列表基础上添加）
    const additionalCities = [
        {'name': '呼和浩特', 'lat': 40.8414, 'lon': 111.7519},
        {'name': '包头', 'lat': 40.6572, 'lon': 109.8400},
        {'name': '乌鲁木齐', 'lat': 43.8250, 'lon': 87.6061},
        {'name': '克拉玛依', 'lat': 45.5889, 'lon': 84.8891},
        {'name': '喀什', 'lat': 39.4547, 'lon': 75.9880},
        {'name': '银川', 'lat': 38.4872, 'lon': 106.2309},
        {'name': '兰州', 'lat': 36.0594, 'lon': 103.8343},
        {'name': '西安', 'lat': 34.3427, 'lon': 108.9398},
        {'name': '太原', 'lat': 37.8734, 'lon': 112.5624},
        {'name': '郑州', 'lat': 34.7577, 'lon': 113.6486},
        {'name': '合肥', 'lat': 31.8612, 'lon': 117.2831},
        {'name': '武汉', 'lat': 30.5937, 'lon': 114.3055},
        {'name': '南昌', 'lat': 28.6830, 'lon': 115.8581},
        {'name': '长沙', 'lat': 28.2282, 'lon': 112.9388},
        {'name': '南宁', 'lat': 22.8170, 'lon': 108.3665},
        {'name': '贵阳', 'lat': 26.6470, 'lon': 106.6302},
        {'name': '昆明', 'lat': 25.0453, 'lon': 102.7097}
    ];
    
    // 将额外的地级市添加到城市列表中
    additionalCities.forEach(city => {
        cities.push(city);
    });

    // 四川省县级城市数据
    const sichuanCounties = [
        // 成都市辖县
        {'name': '都江堰', 'lat': 30.9885, 'lon': 103.6479},
        {'name': '彭州', 'lat': 30.9901, 'lon': 103.9583},
        {'name': '崇州', 'lat': 30.6364, 'lon': 103.6733},
        {'name': '邛崃', 'lat': 30.4122, 'lon': 103.4661},
        {'name': '简阳', 'lat': 30.4110, 'lon': 104.5472},
        {'name': '金堂', 'lat': 30.8620, 'lon': 104.4123},
        {'name': '大邑', 'lat': 30.5874, 'lon': 103.5224},
        {'name': '蒲江', 'lat': 30.1967, 'lon': 103.5060},
        {'name': '新津', 'lat': 30.4098, 'lon': 103.8114},
        {'name': '温江', 'lat': 30.6832, 'lon': 103.8560},
        {'name': '双流', 'lat': 30.5742, 'lon': 103.9233},
        {'name': '郫都', 'lat': 30.8102, 'lon': 103.9010},
        
        // 自贡市
        {'name': '自贡', 'lat': 29.3392, 'lon': 104.7789},
        {'name': '荣县', 'lat': 29.4452, 'lon': 104.4173},
        {'name': '富顺', 'lat': 29.1812, 'lon': 104.9749},
        
        // 攀枝花市
        {'name': '攀枝花', 'lat': 26.5824, 'lon': 101.7189},
        {'name': '米易', 'lat': 26.8903, 'lon': 102.1106},
        {'name': '盐边', 'lat': 26.6880, 'lon': 101.8539},
        
        // 泸州市
        {'name': '泸州', 'lat': 28.8772, 'lon': 105.4424},
        {'name': '泸县', 'lat': 29.1516, 'lon': 105.3819},
        {'name': '合江', 'lat': 28.8112, 'lon': 105.8312},
        {'name': '叙永', 'lat': 28.1668, 'lon': 105.4447},
        {'name': '古蔺', 'lat': 28.0389, 'lon': 105.8129},
        
        // 德阳市
        {'name': '德阳', 'lat': 31.1269, 'lon': 104.3907},
        {'name': '广汉', 'lat': 30.9768, 'lon': 104.2828},
        {'name': '什邡', 'lat': 31.1267, 'lon': 104.1672},
        {'name': '绵竹', 'lat': 31.3384, 'lon': 104.2209},
        {'name': '罗江', 'lat': 31.3168, 'lon': 104.5102},
        {'name': '中江', 'lat': 31.0331, 'lon': 104.6788},
        
        // 绵阳市
        {'name': '绵阳', 'lat': 31.4679, 'lon': 104.6790},
        {'name': '江油', 'lat': 31.7786, 'lon': 104.7451},
        {'name': '盐亭', 'lat': 31.2080, 'lon': 105.3891},
        {'name': '三台', 'lat': 31.0955, 'lon': 105.0941},
        {'name': '平武', 'lat': 32.4092, 'lon': 104.5286},
        {'name': '安州', 'lat': 31.5345, 'lon': 104.5674},
        {'name': '北川', 'lat': 31.8175, 'lon': 104.4644},
        {'name': '梓潼', 'lat': 31.6351, 'lon': 105.1708},
        
        // 广元市
        {'name': '广元', 'lat': 32.4366, 'lon': 105.8433},
        {'name': '苍溪', 'lat': 31.7321, 'lon': 105.9346},
        {'name': '剑阁', 'lat': 32.2877, 'lon': 105.5246},
        {'name': '旺苍', 'lat': 32.2292, 'lon': 106.2902},
        {'name': '青川', 'lat': 32.5856, 'lon': 105.2391},
        {'name': '利州', 'lat': 32.4344, 'lon': 105.8454},
        {'name': '昭化', 'lat': 32.3227, 'lon': 105.9627},
        {'name': '朝天', 'lat': 32.6434, 'lon': 105.8904},
        
        // 遂宁市
        {'name': '遂宁', 'lat': 30.5376, 'lon': 105.5933},
        {'name': '射洪', 'lat': 30.8710, 'lon': 105.3883},
        {'name': '蓬溪', 'lat': 30.7577, 'lon': 105.7072},
        {'name': '大英', 'lat': 30.5943, 'lon': 105.2361},
        {'name': '安居', 'lat': 30.3554, 'lon': 105.4561},
        
        // 内江市
        {'name': '内江', 'lat': 29.5833, 'lon': 105.0587},
        {'name': '隆昌', 'lat': 29.3394, 'lon': 105.2877},
        {'name': '威远', 'lat': 29.5277, 'lon': 104.6695},
        {'name': '资中', 'lat': 29.7641, 'lon': 104.8518},
        
        // 乐山市
        {'name': '乐山', 'lat': 29.5528, 'lon': 103.7656},
        {'name': '峨眉山', 'lat': 29.6014, 'lon': 103.4845},
        {'name': '夹江', 'lat': 29.7375, 'lon': 103.5716},
        {'name': '井研', 'lat': 29.6518, 'lon': 104.0696},
        {'name': '犍为', 'lat': 29.2081, 'lon': 103.9493},
        {'name': '沐川', 'lat': 28.9565, 'lon': 103.9024},
        {'name': '峨边', 'lat': 29.2304, 'lon': 103.2623},
        {'name': '马边', 'lat': 28.8359, 'lon': 103.5464},
        
        // 南充市
        {'name': '南充', 'lat': 30.8373, 'lon': 106.1133},
        {'name': '阆中', 'lat': 31.5583, 'lon': 106.0050},
        {'name': '南部', 'lat': 31.3534, 'lon': 106.0670},
        {'name': '营山', 'lat': 31.0772, 'lon': 106.5659},
        {'name': '蓬安', 'lat': 31.0290, 'lon': 106.4123},
        {'name': '仪陇', 'lat': 31.2703, 'lon': 106.3030},
        {'name': '西充', 'lat': 30.9951, 'lon': 105.9012},
        
        // 宜宾市
        {'name': '宜宾', 'lat': 28.7518, 'lon': 104.6330},
        {'name': '江安', 'lat': 28.7238, 'lon': 105.0671},
        {'name': '长宁', 'lat': 28.5821, 'lon': 104.9210},
        {'name': '高县', 'lat': 28.4362, 'lon': 104.5177},
        {'name': '筠连', 'lat': 28.1648, 'lon': 104.5121},
        {'name': '珙县', 'lat': 28.4438, 'lon': 104.7094},
        {'name': '兴文', 'lat': 28.3036, 'lon': 105.2364},
        {'name': '屏山', 'lat': 28.6428, 'lon': 104.1673},
        
        // 广安市
        {'name': '广安', 'lat': 30.4739, 'lon': 106.6333},
        {'name': '华蓥', 'lat': 30.3896, 'lon': 106.7849},
        {'name': '邻水', 'lat': 30.3345, 'lon': 106.9301},
        {'name': '武胜', 'lat': 30.3493, 'lon': 106.2959},
        {'name': '岳池', 'lat': 30.5398, 'lon': 106.4301},
        
        // 达州市
        {'name': '达州', 'lat': 31.2141, 'lon': 107.5023},
        {'name': '万源', 'lat': 32.0654, 'lon': 108.0343},
        {'name': '达川', 'lat': 31.1988, 'lon': 107.5117},
        {'name': '宣汉', 'lat': 31.3535, 'lon': 107.7277},
        {'name': '开江', 'lat': 31.0835, 'lon': 107.8686},
        {'name': '大竹', 'lat': 30.7364, 'lon': 107.2044},
        {'name': '渠县', 'lat': 30.8372, 'lon': 106.9728},
        
        // 巴中市
        {'name': '巴中', 'lat': 31.8539, 'lon': 106.7478},
        {'name': '南江', 'lat': 32.3467, 'lon': 106.8347},
        {'name': '平昌', 'lat': 31.5594, 'lon': 107.1035},
        {'name': '通江', 'lat': 31.9118, 'lon': 107.2463},
        {'name': '巴州', 'lat': 31.8512, 'lon': 106.7689},
        {'name': '恩阳', 'lat': 31.7867, 'lon': 106.6538},
        
        // 雅安市
        {'name': '雅安', 'lat': 30.0156, 'lon': 103.0398},
        {'name': '芦山', 'lat': 30.1443, 'lon': 102.9279},
        {'name': '宝兴', 'lat': 30.3684, 'lon': 102.8146},
        {'name': '荥经', 'lat': 29.7941, 'lon': 102.8469},
        {'name': '汉源', 'lat': 29.3443, 'lon': 102.6527},
        {'name': '石棉', 'lat': 29.2321, 'lon': 102.3594},
        {'name': '天全', 'lat': 30.0672, 'lon': 102.7583},
        {'name': '名山', 'lat': 30.0847, 'lon': 103.1094},
        
        // 眉山市
        {'name': '眉山', 'lat': 30.0748, 'lon': 103.8559},
        {'name': '仁寿', 'lat': 29.9960, 'lon': 104.1340},
        {'name': '彭山', 'lat': 30.1904, 'lon': 103.8725},
        {'name': '洪雅', 'lat': 29.9066, 'lon': 103.3731},
        {'name': '丹棱', 'lat': 30.0146, 'lon': 103.5124},
        {'name': '青神', 'lat': 29.8323, 'lon': 103.8469},
        
        // 资阳市
        {'name': '资阳', 'lat': 30.1222, 'lon': 104.6419},
        {'name': '安岳', 'lat': 30.0974, 'lon': 105.3359},
        {'name': '乐至', 'lat': 30.2776, 'lon': 105.0215},
        
        // 阿坝藏族羌族自治州
        {'name': '马尔康', 'lat': 31.9060, 'lon': 102.2207},
        {'name': '汶川', 'lat': 31.4767, 'lon': 103.5903},
        {'name': '理县', 'lat': 31.4364, 'lon': 103.1668},
        {'name': '茂县', 'lat': 31.6818, 'lon': 103.8534},
        {'name': '松潘', 'lat': 32.6554, 'lon': 103.6043},
        {'name': '九寨沟', 'lat': 33.2624, 'lon': 104.2437},
        {'name': '金川', 'lat': 31.4762, 'lon': 102.0635},
        {'name': '小金', 'lat': 30.9992, 'lon': 102.3644},
        {'name': '黑水', 'lat': 32.0618, 'lon': 102.9903},
        {'name': '壤塘', 'lat': 32.2658, 'lon': 100.9786},
        {'name': '阿坝', 'lat': 32.9025, 'lon': 101.7068},
        {'name': '若尔盖', 'lat': 33.5775, 'lon': 102.9617},
        {'name': '红原', 'lat': 32.7907, 'lon': 102.5446},
        
        // 甘孜藏族自治州
        {'name': '康定', 'lat': 30.0575, 'lon': 101.9634},
        {'name': '泸定', 'lat': 29.9147, 'lon': 102.2346},
        {'name': '丹巴', 'lat': 30.8785, 'lon': 101.8905},
        {'name': '九龙', 'lat': 29.0009, 'lon': 101.5072},
        {'name': '雅江', 'lat': 30.0314, 'lon': 101.0142},
        {'name': '道孚', 'lat': 30.9798, 'lon': 101.1252},
        {'name': '炉霍', 'lat': 31.3917, 'lon': 100.6768},
        {'name': '甘孜', 'lat': 31.6230, 'lon': 99.9930},
        {'name': '新龙', 'lat': 30.9395, 'lon': 100.3122},
        {'name': '德格', 'lat': 31.8062, 'lon': 98.5810},
        {'name': '白玉', 'lat': 31.2091, 'lon': 98.8256},
        {'name': '石渠', 'lat': 32.9783, 'lon': 98.1031},
        {'name': '色达', 'lat': 32.2684, 'lon': 100.3326},
        {'name': '理塘', 'lat': 29.9967, 'lon': 100.2695},
        {'name': '巴塘', 'lat': 30.0057, 'lon': 99.1098},
        {'name': '乡城', 'lat': 28.9353, 'lon': 99.7989},
        {'name': '稻城', 'lat': 29.0378, 'lon': 100.2987},
        {'name': '得荣', 'lat': 28.7132, 'lon': 99.2863},
        
        // 凉山彝族自治州
        {'name': '西昌', 'lat': 27.8947, 'lon': 102.2673},
        {'name': '木里', 'lat': 27.9288, 'lon': 101.2802},
        {'name': '盐源', 'lat': 27.4231, 'lon': 101.5090},
        {'name': '德昌', 'lat': 27.4028, 'lon': 102.1751},
        {'name': '会理', 'lat': 26.6559, 'lon': 102.2450},
        {'name': '会东', 'lat': 26.6347, 'lon': 102.5779},
        {'name': '宁南', 'lat': 27.0654, 'lon': 102.7611},
        {'name': '普格', 'lat': 27.3765, 'lon': 102.5409},
        {'name': '布拖', 'lat': 27.7064, 'lon': 102.8118},
        {'name': '金阳', 'lat': 27.6965, 'lon': 103.2482},
        {'name': '昭觉', 'lat': 28.0143, 'lon': 102.8428},
        {'name': '喜德', 'lat': 28.3074, 'lon': 102.4126},
        {'name': '冕宁', 'lat': 28.5497, 'lon': 102.1770},
        {'name': '越西', 'lat': 28.6399, 'lon': 102.5075},
        {'name': '甘洛', 'lat': 28.9659, 'lon': 102.7712},
        {'name': '美姑', 'lat': 28.3298, 'lon': 103.1324},
        {'name': '雷波', 'lat': 28.2625, 'lon': 103.5713}
    ];
    
    // 将四川省县级城市添加到counties列表中
    sichuanCounties.forEach(county => {
        counties.push(county);
    });
    
    // 周边省份县级城市 - 重庆市
    const chongqingCounties = [
        {'name': '江津', 'lat': 29.2906, 'lon': 106.2539},
        {'name': '合川', 'lat': 29.9723, 'lon': 106.2764},
        {'name': '永川', 'lat': 29.3561, 'lon': 105.9272},
        {'name': '南川', 'lat': 29.1575, 'lon': 107.0988},
        {'name': '綦江', 'lat': 29.0277, 'lon': 106.6511},
        {'name': '潼南', 'lat': 30.1912, 'lon': 105.8402},
        {'name': '铜梁', 'lat': 29.8454, 'lon': 106.0563},
        {'name': '大足', 'lat': 29.7008, 'lon': 105.7214},
        {'name': '荣昌', 'lat': 29.4048, 'lon': 105.5944},
        {'name': '璧山', 'lat': 29.5928, 'lon': 106.2272},
        {'name': '梁平', 'lat': 30.6725, 'lon': 107.7686},
        {'name': '城口', 'lat': 31.9477, 'lon': 108.6649},
        {'name': '丰都', 'lat': 29.8636, 'lon': 107.7308},
        {'name': '垫江', 'lat': 30.3302, 'lon': 107.3463},
        {'name': '武隆', 'lat': 29.3257, 'lon': 107.7598},
        {'name': '忠县', 'lat': 30.2992, 'lon': 108.0386},
        {'name': '开州', 'lat': 31.1609, 'lon': 108.3933},
        {'name': '云阳', 'lat': 30.9307, 'lon': 108.6973},
        {'name': '奉节', 'lat': 31.0185, 'lon': 109.4640},
        {'name': '巫山', 'lat': 31.0749, 'lon': 109.8790},
        {'name': '巫溪', 'lat': 31.3987, 'lon': 109.5700},
        {'name': '石柱', 'lat': 30.0021, 'lon': 108.1140},
        {'name': '秀山', 'lat': 28.4484, 'lon': 109.0068},
        {'name': '酉阳', 'lat': 28.8418, 'lon': 108.7668},
        {'name': '彭水', 'lat': 29.2937, 'lon': 108.1659}
    ];
    
    // 将重庆市县级城市添加到counties列表中
    chongqingCounties.forEach(county => {
        counties.push(county);
    });
    
    // 周边省份县级城市 - 云南省
    const yunnanCounties = [
        {'name': '安宁', 'lat': 24.9165, 'lon': 102.4780},
        {'name': '宣威', 'lat': 26.2196, 'lon': 104.1040},
        {'name': '瑞丽', 'lat': 24.0128, 'lon': 97.8517},
        {'name': '芒市', 'lat': 24.4337, 'lon': 98.5886},
        {'name': '腾冲', 'lat': 25.0209, 'lon': 98.4910},
        {'name': '楚雄', 'lat': 25.0329, 'lon': 101.5459},
        {'name': '个旧', 'lat': 23.3594, 'lon': 103.1600},
        {'name': '开远', 'lat': 23.7144, 'lon': 103.2675},
        {'name': '蒙自', 'lat': 23.3962, 'lon': 103.3850},
        {'name': '建水', 'lat': 23.6347, 'lon': 102.8270},
        {'name': '弥勒', 'lat': 24.4111, 'lon': 103.4143},
        {'name': '景洪', 'lat': 22.0057, 'lon': 100.7973},
        {'name': '泸水', 'lat': 25.8227, 'lon': 98.8571},
        {'name': '香格里拉', 'lat': 27.8254, 'lon': 99.7006},
        {'name': '宁蒗', 'lat': 27.2818, 'lon': 100.8513},
        {'name': '永胜', 'lat': 26.6849, 'lon': 100.7507},
        {'name': '德钦', 'lat': 28.4863, 'lon': 98.9108},
        {'name': '维西', 'lat': 27.1793, 'lon': 99.2870},
        {'name': '陇川', 'lat': 24.1833, 'lon': 97.7921},
        {'name': '盈江', 'lat': 24.7052, 'lon': 97.9318},
        {'name': '梁河', 'lat': 24.8044, 'lon': 98.2969}
    ];
    
    // 将云南省县级城市添加到counties列表中
    yunnanCounties.forEach(county => {
        counties.push(county);
    });
    
    // 周边省份县级城市 - 贵州省
    const guizhouCounties = [
        {'name': '清镇', 'lat': 26.5557, 'lon': 106.4702},
        {'name': '赤水', 'lat': 28.5900, 'lon': 105.6976},
        {'name': '仁怀', 'lat': 27.7924, 'lon': 106.4017},
        {'name': '铜仁', 'lat': 27.7183, 'lon': 109.1914},
        {'name': '兴义', 'lat': 25.0921, 'lon': 104.8954},
        {'name': '凯里', 'lat': 26.5665, 'lon': 107.9810},
        {'name': '都匀', 'lat': 26.2595, 'lon': 107.5187},
        {'name': '福泉', 'lat': 26.6861, 'lon': 107.5207},
        {'name': '安顺', 'lat': 26.2455, 'lon': 105.9477},
        {'name': '毕节', 'lat': 27.3017, 'lon': 105.2872},
        {'name': '六盘水', 'lat': 26.5946, 'lon': 104.8301},
        {'name': '遵义', 'lat': 27.7258, 'lon': 106.9271},
        {'name': '盘州', 'lat': 25.7092, 'lon': 104.4719},
        {'name': '织金', 'lat': 26.6631, 'lon': 105.7748},
        {'name': '赫章', 'lat': 27.1229, 'lon': 104.7274},
        {'name': '纳雍', 'lat': 26.7773, 'lon': 105.3826},
        {'name': '金沙', 'lat': 27.4596, 'lon': 106.2202},
        {'name': '习水', 'lat': 28.3328, 'lon': 106.2067},
        {'name': '桐梓', 'lat': 28.1332, 'lon': 106.8256},
        {'name': '余庆', 'lat': 27.2253, 'lon': 107.8882}
    ];
    
    // 将贵州省县级城市添加到counties列表中
    guizhouCounties.forEach(county => {
        counties.push(county);
    });
    
    // 周边省份县级城市 - 陕西省
    const shaanxiCounties = [
        {'name': '汉中', 'lat': 33.0778, 'lon': 107.0233},
        {'name': '安康', 'lat': 32.6903, 'lon': 109.0192},
        {'name': '商洛', 'lat': 33.8707, 'lon': 109.9408},
        {'name': '榆林', 'lat': 38.2852, 'lon': 109.7348},
        {'name': '延安', 'lat': 36.5853, 'lon': 109.4898},
        {'name': '铜川', 'lat': 34.9016, 'lon': 108.9454},
        {'name': '华阴', 'lat': 34.5661, 'lon': 110.0920},
        {'name': '韩城', 'lat': 35.4753, 'lon': 110.4425},
        {'name': '兴平', 'lat': 34.2989, 'lon': 108.4905},
        {'name': '神木', 'lat': 38.8423, 'lon': 110.4989},
        {'name': '宁强', 'lat': 32.8294, 'lon': 106.2574},
        {'name': '略阳', 'lat': 33.3301, 'lon': 106.1566},
        {'name': '勉县', 'lat': 33.1536, 'lon': 106.6734},
        {'name': '洋县', 'lat': 33.2229, 'lon': 107.5459},
        {'name': '镇巴', 'lat': 32.5366, 'lon': 107.8948}
    ];
    
    // 将陕西省县级城市添加到counties列表中
    shaanxiCounties.forEach(county => {
        counties.push(county);
    });
    
    // 周边省份县级城市 - 甘肃省
    const gansuCounties = [
        {'name': '嘉峪关', 'lat': 39.7719, 'lon': 98.2890},
        {'name': '金昌', 'lat': 38.5160, 'lon': 102.1878},
        {'name': '白银', 'lat': 36.5448, 'lon': 104.1735},
        {'name': '天水', 'lat': 34.5808, 'lon': 105.7245},
        {'name': '酒泉', 'lat': 39.7326, 'lon': 98.4945},
        {'name': '张掖', 'lat': 38.9255, 'lon': 100.4495},
        {'name': '武威', 'lat': 37.9283, 'lon': 102.6374},
        {'name': '定西', 'lat': 35.5795, 'lon': 104.6260},
        {'name': '陇南', 'lat': 33.4009, 'lon': 104.9218},
        {'name': '平凉', 'lat': 35.5428, 'lon': 106.6647},
        {'name': '庆阳', 'lat': 35.7091, 'lon': 107.6438},
        {'name': '临夏', 'lat': 35.6045, 'lon': 103.2114},
        {'name': '合作', 'lat': 35.0008, 'lon': 102.9100},
        {'name': '玉门', 'lat': 40.2917, 'lon': 97.0454},
        {'name': '敦煌', 'lat': 40.1421, 'lon': 94.6618},
        {'name': '临洮', 'lat': 35.3952, 'lon': 103.8599},
        {'name': '岷县', 'lat': 34.4382, 'lon': 104.0375},
        {'name': '康县', 'lat': 33.3299, 'lon': 105.6090},
        {'name': '成县', 'lat': 33.7397, 'lon': 105.7422},
        {'name': '徽县', 'lat': 33.7686, 'lon': 106.0871}
    ];
    
    // 将甘肃省县级城市添加到counties列表中
    gansuCounties.forEach(county => {
        counties.push(county);
    });

    // 添加所有城市标记
    cities.forEach(city => {
        addCityMarker(city);
        // 获取天气数据
        fetchCityWeather(city);
    });
    
    // 添加切换县级城市显示的按钮事件
    document.getElementById('toggle-counties').addEventListener('click', function() {
        // 切换县级城市显示状态
        showCounties = !showCounties;
        
        if (showCounties) {
            // 如果还没有加载县级城市数据，现在加载
            if (!countiesLoaded) {
                loadCountyCities();
            } else {
                // 显示已加载的县级城市
                counties.forEach(county => {
                    const marker = countyMarkers[county.name];
                    if (marker) {
                        marker.addTo(map);
                    }
                });
            }
            this.textContent = '隐藏县级城市';
        } else {
            // 隐藏县级城市
            counties.forEach(county => {
                const marker = countyMarkers[county.name];
                if (marker) {
                    marker.removeFrom(map);
                }
            });
            this.textContent = '显示县级城市';
        }
        
        // 如果当前有筛选，重新应用筛选
        if (filterApplied) {
            applyFilter(currentWeatherType);
        }
    });

    // 修改日期选择器变更事件处理
    window.changeForecastDate = function(selectedDate) {
        const today = new Date();
        const selected = new Date(selectedDate);
        const diffTime = selected.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        selectedDays = diffDays;
        
        // 刷新所有城市的天气数据
        cities.forEach(city => fetchCityWeather(city));
            
        // 刷新县级城市天气数据（如果已加载）
        if (countiesLoaded && showCounties) {
            counties.forEach(county => fetchCountyWeather(county));
        }
    };

    // 修改加载县级城市数据的函数
    function loadCountyCities() {
        counties.forEach(county => {
            addCountyMarker(county);
        });
        countiesLoaded = true;
    }

    // 添加自动刷新定时器（每10分钟更新一次）
    setInterval(() => {
        cities.forEach(city => fetchCityWeather(city));
            
        // 刷新县级城市天气数据（如果已加载并显示）
        if (countiesLoaded && showCounties) {
            counties.forEach(county => fetchCountyWeather(county));
        }
    }, 600000); // 10分钟 = 600000毫秒

    // 添加城市标记到地图
    function addCityMarker(city) {
        // 判断是否已存在此城市标记
        if (cityMarkers[city.name]) return;
        
        // 创建标记
        const marker = L.marker([city.lat, city.lon], {
            // 先使用默认图标
            icon: L.divIcon({
                className: 'weather-icon',
                html: '<div class="weather-marker"><img src="static/weather_icon/yintian.png" alt="Weather"></div>',
                iconSize: [40, 40],
                iconAnchor: [20, 40],
                popupAnchor: [0, -40]
            })
        }).addTo(map);
        
        // 添加城市名称标签
        marker.bindTooltip(city.name, {
            permanent: true,
            direction: 'top',
            className: 'city-label',
            offset: [0, -20]
        });
        
        cityMarkers[city.name] = marker;
        
        // 点击标记时获取最新天气
        marker.on('click', function() {
            fetchCityWeather(city, true);
        });
    }

    // 获取城市天气信息
    function fetchCityWeather(city, showDetails = false) {
        // 直接使用OpenWeatherMap API
        const apiKey = 'ea9a346917029fa37840b6d86ed1307c';
        // 根据选择的天数决定使用哪个API
        const apiEndpoint = selectedDays === 0 ? 
            `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${apiKey}&units=metric&lang=zh_cn` :
            `https://api.openweathermap.org/data/2.5/forecast?lat=${city.lat}&lon=${city.lon}&appid=${apiKey}&units=metric&lang=zh_cn`;
            
        fetch(apiEndpoint)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                let weatherData;
                try {
                    if (selectedDays === 0) {
                        // 当前天气 - 添加数据验证
                        if (!data || !data.main || !data.weather || !data.weather[0]) {
                            throw new Error('Invalid weather data format');
                        }
                        weatherData = {
                            city: city.name,
                            temperature: Math.round(data.main.temp), // 四舍五入温度
                            weather: data.weather[0].description,
                            icon: data.weather[0].icon
                        };
                    } else {
                        // 预报天气 - 添加数据验证
                        if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
                            throw new Error('Invalid forecast data format');
                        }
                        
                        // 查找目标日期的天气
                        const targetDate = new Date();
                        targetDate.setDate(targetDate.getDate() + selectedDays);
                        const targetDateStr = targetDate.toISOString().split('T')[0];
                        
                        // 尝试找到最接近的预报
                        let forecast = null;
                        // 首先尝试找精确匹配的日期
                        for (const item of data.list) {
                            if (!item.dt) continue;
                            const itemDate = new Date(item.dt * 1000).toISOString().split('T')[0];
                            if (itemDate === targetDateStr) {
                                forecast = item;
                                break;
                            }
                        }
                        
                        // 如果没有找到精确匹配，取第一个可用的预报
                        if (!forecast && data.list.length > 0) {
                            forecast = data.list[0];
                        }
                        
                        if (forecast && forecast.main && forecast.weather && forecast.weather[0]) {
                            weatherData = {
                                city: city.name,
                                date: targetDateStr,
                                temperature: Math.round(forecast.main.temp), // 四舍五入温度
                                weather: forecast.weather[0].description,
                                icon: forecast.weather[0].icon
                            };
                        } else {
                            throw new Error('Invalid forecast data format');
                        }
                    }
                    
                    // 存储天气数据用于筛选
                    cityWeatherData[city.name] = weatherData;
                    
                    // 更新标记图标
                    updateMarkerIcon(city.name, weatherData);
                    
                    // 显示详细信息（如果请求）
                    if (showDetails) {
                        const marker = cityMarkers[city.name];
                        if (marker) {
                            createCityPopup(city.name, weatherData);
                            marker.openPopup();
                        }
                    }
                    
                    // 应用当前筛选
                    if (filterApplied) {
                        applyFilter(currentWeatherType);
                    }
                } catch (error) {
                    console.error(`获取城市天气数据出错: ${error.message} at ${city.name}`);
                    // 出错时使用默认或占位数据
                    const defaultWeatherData = {
                        city: city.name,
                        temperature: '--',
                        weather: '数据获取失败',
                        icon: 'default'
                    };
                    updateMarkerIcon(city.name, defaultWeatherData);
                }
            })
            .catch(error => {
                console.error(`API请求失败: ${error.message}`);
                // 出错时使用默认或占位数据
                const defaultWeatherData = {
                    city: city.name,
                    temperature: '--',
                    weather: '数据获取失败',
                    icon: 'default'
                };
                updateMarkerIcon(city.name, defaultWeatherData);
            });
    }

    // 更新标记图标和弹出框
    function updateMarkerIcon(cityName, weatherData) {
        const marker = cityMarkers[cityName];
        if (!marker) {
            console.warn(`找不到城市标记: ${cityName}`);
            return;
        }
        
        try {
            // 添加调试日志
            console.log(`正在更新城市标记: ${cityName}`, weatherData);
            
            // 获取适当的图标
            const iconCode = weatherData.icon || 'default';
            const weatherDescription = weatherData.weather || '';
            const iconPath = getLocalIconByWeatherCode(iconCode, weatherDescription);
            
            console.log(`城市 ${cityName} 使用图标: ${iconPath}`);
            
            // 创建标记图标
            const isCounty = false; // 这是城市，不是县级市
            const newIcon = createWeatherIcon(iconCode, weatherDescription, isCounty);
            
            // 更新标记图标
            marker.setIcon(newIcon);
            
            // 更新弹出窗口
            createCityPopup(cityName, weatherData);
            
            // 存储数据用于筛选
            cityWeatherData[cityName] = weatherData;
            
            console.log(`城市 ${cityName} 标记更新完成`);
        } catch (error) {
            console.error(`更新城市 ${cityName} 标记时出错:`, error);
        }
    }

    // 创建城市弹出窗口内容
    function createCityPopup(cityName, weatherData) {
        const marker = cityMarkers[cityName];
        if (!marker) return;
        
        // 获取适当的图标
        const iconCode = weatherData.icon || 'default';
        const weatherDescription = weatherData.weather || '';
        const iconPath = getLocalIconByWeatherCode(iconCode, weatherDescription);
        
        // 创建弹出窗口内容
        let popupContent = '';
        const weather = weatherData.weather || '未知';
        
        if (weatherData.date) {
            // 预报天气
            popupContent = `
            <div class="weather-popup-content">
                <h3>${cityName}</h3>
                <img src="${iconPath}" class="weather-popup-icon" alt="${weather}">
                    <p><strong>日期:</strong> ${weatherData.date}</p>
                <p><strong>温度:</strong> ${weatherData.temperature}°C</p>
                <p><strong>天气:</strong> ${weather}</p>
                </div>
        `;
        } else {
            // 当前天气
            popupContent = `
                <div class="weather-popup-content">
                    <h3>${cityName}</h3>
                    <img src="${iconPath}" class="weather-popup-icon" alt="${weather}">
                    <p><strong>温度:</strong> ${weatherData.temperature}°C</p>
                    <p><strong>天气:</strong> ${weather}</p>
                </div>
            `;
        }
        
        // 设置弹出窗口内容
        marker.bindPopup(popupContent, {
            maxWidth: 250, 
            className: 'custom-popup'
        });
    }

    // 添加县级城市标记的函数
    function addCountyMarker(county) {
        // 判断是否已存在此县级城市标记
        if (countyMarkers[county.name]) return;
        
        // 创建标记
        const marker = L.marker([county.lat, county.lon], {
            // 先使用默认图标
            icon: L.divIcon({
                className: 'weather-icon',
                html: '<div class="weather-marker county-marker"><img src="static/weather_icon/yintian.png" alt="Weather"></div>',
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30]
            })
        }).addTo(map);
        
        // 添加县级城市名称标签
        marker.bindTooltip(county.name, {
            permanent: true,
            direction: 'top',
            className: 'county-city-label',
            offset: [0, -15]
        });
        
        countyMarkers[county.name] = marker;
        
        // 获取并显示该县级城市的天气
        fetchCountyWeather(county);
        
        // 点击标记查看详细天气
        marker.on('click', function() {
            fetchCountyWeather(county, true);
        });
    }
    
    // 获取县级城市天气信息
    function fetchCountyWeather(county, showDetails = false) {
        // 直接使用OpenWeatherMap API
        const apiKey = 'ea9a346917029fa37840b6d86ed1307c';
        // 根据选择的天数决定使用哪个API
        const apiEndpoint = selectedDays === 0 ? 
            `https://api.openweathermap.org/data/2.5/weather?lat=${county.lat}&lon=${county.lon}&appid=${apiKey}&units=metric&lang=zh_cn` :
            `https://api.openweathermap.org/data/2.5/forecast?lat=${county.lat}&lon=${county.lon}&appid=${apiKey}&units=metric&lang=zh_cn`;
            
        fetch(apiEndpoint)
            .then(response => response.json())
            .then(data => {
                let weatherData;
                try {
                if (selectedDays === 0) {
                        // 当前天气 - 添加数据验证
                        if (!data || !data.main || !data.weather || !data.weather[0]) {
                            throw new Error('Invalid weather data format');
                        }
                    weatherData = {
                        city: county.name,
                            temperature: Math.round(data.main.temp), // 四舍五入温度
                        weather: data.weather[0].description,
                        icon: data.weather[0].icon
                    };
                } else {
                        // 预报天气 - 添加数据验证
                        if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
                            throw new Error('Invalid forecast data format');
                        }
                        
                        // 查找目标日期的天气
                    const targetDate = new Date();
                    targetDate.setDate(targetDate.getDate() + selectedDays);
                    const targetDateStr = targetDate.toISOString().split('T')[0];
                    
                        // 尝试找到最接近的预报
                        let forecast = null;
                        // 首先尝试找精确匹配的日期
                        for (const item of data.list) {
                            if (!item.dt) continue;
                        const itemDate = new Date(item.dt * 1000).toISOString().split('T')[0];
                            if (itemDate === targetDateStr) {
                                forecast = item;
                                break;
                            }
                        }
                        
                        // 如果没有找到精确匹配，取第一个可用的预报
                        if (!forecast && data.list.length > 0) {
                            forecast = data.list[0];
                        }
                        
                        if (forecast && forecast.main && forecast.weather && forecast.weather[0]) {
                        weatherData = {
                            city: county.name,
                            date: targetDateStr,
                                temperature: Math.round(forecast.main.temp), // 四舍五入温度
                            weather: forecast.weather[0].description,
                            icon: forecast.weather[0].icon
                        };
                        } else {
                            throw new Error('Invalid forecast data format');
                    }
                }
                
                // 存储天气数据用于筛选
                countyWeatherData[county.name] = weatherData;
                
                // 更新标记图标
                updateCountyMarkerIcon(county.name, weatherData);
                
                // 显示详细信息（如果请求）
                if (showDetails) {
                    const marker = countyMarkers[county.name];
                    if (marker) {
                            createCountyPopup(county.name, weatherData);
                        marker.openPopup();
                    }
                }
                
                    // 应用当前筛选
                    if (filterApplied) {
                        applyFilter(currentWeatherType);
                    }
                } catch (error) {
                    console.error(`获取县级城市天气数据出错: ${error.message} at ${county.name}`);
                    // 出错时使用默认或占位数据
                    const defaultWeatherData = {
                        city: county.name,
                        temperature: '--',
                        weather: '数据获取失败',
                        icon: 'default'
                    };
                    updateCountyMarkerIcon(county.name, defaultWeatherData);
                }
            })
            .catch(error => {
                console.error(`API请求失败: ${error.message}`);
                // 出错时使用默认或占位数据
                const defaultWeatherData = {
                    city: county.name,
                    temperature: '--',
                    weather: '数据获取失败',
                    icon: 'default'
                };
                updateCountyMarkerIcon(county.name, defaultWeatherData);
            });
    }
    
    // 更新县级城市标记图标和弹出框
    function updateCountyMarkerIcon(countyName, weatherData) {
        const marker = countyMarkers[countyName];
        if (!marker) {
            console.warn(`找不到县级城市标记: ${countyName}`);
            return;
        }
        
        try {
            // 添加调试日志
            console.log(`正在更新县级城市标记: ${countyName}`, weatherData);
            
            // 获取适当的图标
            const iconCode = weatherData.icon || 'default';
            const weatherDescription = weatherData.weather || '';
            const iconPath = getLocalIconByWeatherCode(iconCode, weatherDescription);
            
            console.log(`县级城市 ${countyName} 使用图标: ${iconPath}`);
            
            // 创建标记图标
            const isCounty = true; // 这是县级市
            const newIcon = createWeatherIcon(iconCode, weatherDescription, isCounty);
            
            // 更新标记图标
            marker.setIcon(newIcon);
            
            // 更新弹出窗口
            createCountyPopup(countyName, weatherData);
            
            // 存储数据用于筛选
            countyWeatherData[countyName] = weatherData;
            
            console.log(`县级城市 ${countyName} 标记更新完成`);
        } catch (error) {
            console.error(`更新县级城市 ${countyName} 标记时出错:`, error);
        }
    }

    // 根据天气代码获取图标路径
    function getLocalIconByWeatherCode(iconCode, description) {
        try {
            console.log(`获取图标: 代码=${iconCode}, 描述=${description}`);
            
            if (!iconCode || iconCode === 'default') {
                console.log('使用默认图标');
                return 'static/weather_icon/sunny.png';
            }
            
            // 标准OpenWeatherMap图标映射
            const iconMapping = {
                '01d': 'sunny.png',
                '01n': 'sunny.png',
                '02d': 'douyun.png',
                '02n': 'douyun.png',
                '03d': 'yintian.png',
                '03n': 'yintian.png',
                '04d': 'yintian.png',
                '04n': 'yintian.png',
                '09d': 'xiaoyu.png',
                '09n': 'xiaoyu.png',
                '10d': 'dayu.png',
                '10n': 'dayu.png',
                '11d': 'leizhenyu.png',
                '11n': 'leizhenyu.png',
                '13d': 'snow.png',
                '13n': 'snow.png',
                '50d': 'mai.png',
                '50n': 'mai.png'
            };
            
            // 中文描述映射（作为备用）
            const chineseMapping = {
                '晴': 'sunny.png',
                '多云': 'douyun.png',
                '阴': 'yintian.png',
                '阴，多云': 'yintian.png',
                '雨': 'xiaoyu.png',
                '小雨': 'xiaoyu.png',
                '中雨': 'zhongyu.png',
                '大雨': 'dayu.png',
                '雷': 'leizhenyu.png',
                '雷雨': 'leizhenyu.png',
                '雪': 'snow.png',
                '小雪': 'snow.png',
                '中雪': 'snow.png',
                '大雪': 'snow.png',
                '雾': 'wu.png',
                '霾': 'mai.png'
            };
            
            // 首先尝试使用图标代码
            let iconName = iconMapping[iconCode];
            
            // 如果没有找到图标，尝试通过描述匹配
            if (!iconName && description) {
                // 尝试完全匹配
                iconName = chineseMapping[description];
                
                // 如果仍未找到，尝试部分匹配
                if (!iconName) {
                    for (const [key, value] of Object.entries(chineseMapping)) {
                        if (description.includes(key)) {
                            iconName = value;
                            break;
                        }
                    }
                }
            }
            
            // 如果仍然未找到图标，使用默认图标
            if (!iconName) {
                console.log(`未找到匹配的图标: ${iconCode}, ${description}, 使用默认图标`);
                return 'static/weather_icon/sunny.png';
            }
            
            const path = `static/weather_icon/${iconName}`;
            console.log(`使用图标: ${path}`);
            return path;
        } catch (error) {
            console.error(`获取图标时出错: ${error}`);
            return 'static/weather_icon/sunny.png'; // 出错时使用默认图标
        }
    }
    
    // 自定义图标创建函数
    function createWeatherIcon(iconCode, weatherDescription = '', isCounty = false) {
        // 获取图标路径
        const iconPath = getLocalIconByWeatherCode(iconCode, weatherDescription);
        
        console.log(`创建图标: 代码=${iconCode}, 描述=${weatherDescription}, 是否县级=${isCounty}, 路径=${iconPath}`);
        
        // 创建HTML内容
        const iconSize = isCounty ? 30 : 40; // 县级城市图标小一些
        const labelClass = isCounty ? 'county-city-label' : 'city-label';
        
        return L.divIcon({
            className: 'weather-icon',
            html: `<div class="weather-marker"><img src="${iconPath}" alt="Weather"></div>`,
            iconSize: [iconSize, iconSize],
            iconAnchor: [iconSize/2, iconSize],
            popupAnchor: [0, -iconSize]
        });
    }

    // 创建县级城市弹出窗口内容
    function createCountyPopup(countyName, weatherData) {
        const marker = countyMarkers[countyName];
        if (!marker) return;
        
        // 获取适当的图标
        const iconCode = weatherData.icon || 'default';
        const weatherDescription = weatherData.weather || '';
        const iconPath = getLocalIconByWeatherCode(iconCode, weatherDescription);
        
        // 创建弹出窗口内容
        let popupContent = '';
        const weather = weatherData.weather || '未知';
        
        if (weatherData.date) {
            // 预报天气
            popupContent = `
                <div class="weather-popup-content">
                    <h3>${countyName}</h3>
                    <img src="${iconPath}" class="weather-popup-icon" alt="${weather}">
                    <p><strong>日期:</strong> ${weatherData.date}</p>
                    <p><strong>温度:</strong> ${weatherData.temperature}°C</p>
                    <p><strong>天气:</strong> ${weather}</p>
                </div>
            `;
        } else {
            // 当前天气
            popupContent = `
                <div class="weather-popup-content">
                    <h3>${countyName}</h3>
                    <img src="${iconPath}" class="weather-popup-icon" alt="${weather}">
                    <p><strong>温度:</strong> ${weatherData.temperature}°C</p>
                    <p><strong>天气:</strong> ${weather}</p>
                </div>
            `;
        }
        
        // 设置弹出窗口内容
        marker.bindPopup(popupContent);
    }
    
    // 应用天气类型筛选
    function applyFilter(weatherType) {
        currentWeatherType = weatherType;
        filterApplied = !!weatherType; // 如果有天气类型，则筛选已应用
        
        console.log(`应用筛选: ${weatherType}, 是否启用筛选: ${filterApplied}`);
        
        // 移除所有城市标记，然后重新添加符合条件的
        Object.keys(cityMarkers).forEach(cityName => {
            const marker = cityMarkers[cityName];
            if (marker) {
                marker.removeFrom(map);
            }
        });
        
        if (showCounties) {
            Object.keys(countyMarkers).forEach(countyName => {
                const marker = countyMarkers[countyName];
                if (marker) {
                    marker.removeFrom(map);
                }
            });
        }
        
        // 筛选主要城市
        Object.keys(cityWeatherData).forEach(cityName => {
            const data = cityWeatherData[cityName];
            const marker = cityMarkers[cityName];
            if (!marker) return;
            
            let shouldShow = true;
            
            if (filterApplied) {
                const weather = data.weather || '';
                const icon = data.icon || '';
                
                console.log(`检查城市 ${cityName}: 天气描述=${weather}, 图标代码=${icon}`);
                
                switch (weatherType) {
                    case 'sunny':
                        shouldShow = weather.includes('晴') || icon.startsWith('01');
                        break;
                    case 'cloudy':
                        shouldShow = weather.includes('云') || icon.startsWith('02') || icon.startsWith('03') || icon.startsWith('04');
                        break;
                    case 'rain':
                        shouldShow = weather.includes('雨') || icon.startsWith('09') || icon.startsWith('10') || icon.startsWith('11');
                        break;
                    case 'snow':
                        shouldShow = weather.includes('雪') || icon.startsWith('13');
                        break;
                }
                
                console.log(`城市 ${cityName} 是否应该显示: ${shouldShow}`);
            }
            
            // 显示符合条件的标记
            if (shouldShow) {
                marker.addTo(map);
            }
        });
        
        // 如果显示县级城市，也应用筛选
        if (showCounties) {
            Object.keys(countyWeatherData).forEach(countyName => {
                const data = countyWeatherData[countyName];
                const marker = countyMarkers[countyName];
                if (!marker) return;
                
                let shouldShow = true;
                
                if (filterApplied) {
                    const weather = data.weather || '';
                    const icon = data.icon || '';
                    
                    console.log(`检查县级城市 ${countyName}: 天气描述=${weather}, 图标代码=${icon}`);
                    
                    switch (weatherType) {
                        case 'sunny':
                            shouldShow = weather.includes('晴') || icon.startsWith('01');
                            break;
                        case 'cloudy':
                            shouldShow = weather.includes('云') || icon.startsWith('02') || icon.startsWith('03') || icon.startsWith('04');
                            break;
                        case 'rain':
                            shouldShow = weather.includes('雨') || icon.startsWith('09') || icon.startsWith('10') || icon.startsWith('11');
                            break;
                        case 'snow':
                            shouldShow = weather.includes('雪') || icon.startsWith('13');
                            break;
                    }
                    
                    console.log(`县级城市 ${countyName} 是否应该显示: ${shouldShow}`);
                }
                
                // 显示符合条件的标记
                if (shouldShow) {
                    marker.addTo(map);
                }
            });
        }
        
        // 强制更新地图视图，确保筛选结果正确显示
        map.invalidateSize();
    }
    
    // 连接筛选按钮与筛选功能
    window.filterWeather = function(weatherType) {
        applyFilter(weatherType);
    };
    
    // 重置筛选功能
    window.resetFilter = function() {
        applyFilter(null);
    };
    
    // 修复地图右下角可能存在的问题
    window.addEventListener('resize', function() {
        map.invalidateSize();
    });
    
    // 移除右下角可能出现的多余图像
    setTimeout(function() {
        const mapContainer = document.getElementById('weather-map');
        const images = mapContainer.querySelectorAll('img:not(.leaflet-tile):not(.leaflet-marker-icon)');
        
        // 检查不是标记或瓦片的图片
        images.forEach(img => {
            const rect = img.getBoundingClientRect();
            const mapRect = mapContainer.getBoundingClientRect();
            
            // 如果图片位于地图右下角并且不是标记图标或地图瓦片
            if (rect.right > mapRect.right - 100 && rect.bottom > mapRect.bottom - 100) {
                if (!img.classList.contains('leaflet-marker-icon') && !img.classList.contains('leaflet-tile')) {
                    console.log('移除不必要的图像:', img);
                    img.style.display = 'none';
                }
            }
        });
    }, 1000);
}); 