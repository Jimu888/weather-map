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
        {'name': '张家口', 'lat': 40.7671, 'lon': 114.8806},
        {'name': '大理', 'lat': 25.6065, 'lon': 100.2675},
        {'name': '丽江', 'lat': 26.8721, 'lon': 100.2301},
        {'name': '三亚', 'lat': 18.2534, 'lon': 109.5120},
        {'name': '大连', 'lat': 38.9140, 'lon': 121.6147},
        {'name': '苏州', 'lat': 31.2990, 'lon': 120.5853},
        {'name': '宁波', 'lat': 29.8683, 'lon': 121.5440},
        {'name': '珠海', 'lat': 22.2710, 'lon': 113.5767},
        {'name': '威海', 'lat': 37.5130, 'lon': 122.1200},
        {'name': '桂林', 'lat': 25.2736, 'lon': 110.2907}
    ];


    // 获取所有城市数据
    cities.forEach(city => {
        addCityMarker(city);
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

    // 添加城市标记的函数
    function addCityMarker(city) {
        // 创建临时标记（等待天气数据）
        const marker = L.marker([city.lat, city.lon], {
            icon: createWeatherIcon('default') // 默认图标
        }).addTo(map);

        // 添加城市名称
        marker.bindTooltip(city.name, {
            permanent: true,
            direction: 'top',
            className: 'city-label',
            offset: [0, -20]
        });

        // 存储标记
        cityMarkers[city.name] = marker;

        // 获取并显示城市天气
        fetchCityWeather(city);

        // 点击标记查看详细天气
        marker.on('click', function() {
            fetchCityWeather(city, true);
        });
    }

    // 获取城市天气信息
    function fetchCityWeather(city, showDetails = false) {
        const host = window.location.origin; // 获取当前网站的主机名
        // 根据选择的天数决定使用哪个API
        const apiEndpoint = selectedDays === 0 ? 
            `${host}/api/weather?lat=${city.lat}&lon=${city.lon}` :
            `${host}/api/forecast?lat=${city.lat}&lon=${city.lon}&days=${selectedDays}`;
            
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
                        // 当前天气
                        if (!data.main || !data.weather || !data.weather[0]) {
                            throw new Error('Invalid weather data format');
                        }
                        weatherData = {
                            city: city.name,
                            temperature: Math.round(data.main.temp), // 四舍五入温度
                            weather: data.weather[0].description,
                            icon: data.weather[0].icon
                        };
                    } else {
                        // 预报天气
                        const targetDate = new Date();
                        targetDate.setDate(targetDate.getDate() + selectedDays);
                        const targetDateStr = targetDate.toISOString().split('T')[0];
                        
                        if (!data.list || !Array.isArray(data.list)) {
                            throw new Error('Invalid forecast data format');
                        }
                        
                        // 查找目标日期的天气
                        const forecast = data.list.find(item => {
                            const itemDate = new Date(item.dt * 1000).toISOString().split('T')[0];
                            return itemDate === targetDateStr;
                        });
                        
                        if (forecast && forecast.main && forecast.weather && forecast.weather[0]) {
                            weatherData = {
                                city: city.name,
                                date: targetDateStr,
                                temperature: Math.round(forecast.main.temp),
                                weather: forecast.weather[0].description,
                                icon: forecast.weather[0].icon
                            };
                        } else {
                            throw new Error('No forecast data available for the selected date');
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
                            marker.openPopup();
                        }
                    }
                    
                    // 如果有筛选已应用，则重新应用当前的筛选类型
                    if (filterApplied && currentWeatherType) {
                        window.filterWeather(currentWeatherType);
                    }
                } catch (error) {
                    console.error(`处理${city.name}的天气数据时出错:`, error);
                    // 使用默认数据
                    weatherData = {
                        city: city.name,
                        temperature: '--',
                        weather: '数据获取失败',
                        icon: 'default'
                    };
                    cityWeatherData[city.name] = weatherData;
                    updateMarkerIcon(city.name, weatherData);
                }
            })
            .catch(error => {
                console.error(`获取${city.name}的天气失败:`, error);
                // 使用默认数据
                const weatherData = {
                    city: city.name,
                    temperature: '--',
                    weather: '数据获取失败',
                    icon: 'default'
                };
                cityWeatherData[city.name] = weatherData;
                updateMarkerIcon(city.name, weatherData);
            });
    }

    // 更新标记图标和弹出框
    function updateMarkerIcon(cityName, weatherData) {
        const marker = cityMarkers[cityName];
        if (!marker) return;
        
        const icon = weatherData.icon;
        const weather = weatherData.weather;
        
        // 更新图标
        marker.setIcon(createWeatherIcon(icon, weather));

        // 更新弹出框内容，使用美化的布局
        const iconPath = getLocalIconByWeatherCode(icon, weather);
        let popupContent = `
            <div class="weather-popup-content">
                <h3>${cityName}</h3>
                <img src="${iconPath}" class="weather-popup-icon" alt="${weather}">
                <p><strong>温度:</strong> ${weatherData.temperature}°C</p>
                <p><strong>天气:</strong> ${weather}</p>
        `;
        
        // 如果是预报数据，添加日期信息
        if (weatherData.date) {
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
            popupContent += `</div>`;
        }
        
        marker.bindPopup(popupContent, {
            maxWidth: 250, 
            className: 'custom-popup'
        });
    }

    // 定义切换县级城市显示的函数
    window.toggleCounties = function() {
        const countyButton = document.getElementById('toggle-counties');
        
        if (!showCounties) {
            // 显示县级城市
            showCounties = true;
            countyButton.classList.add('active');
            countyButton.textContent = '隐藏县级城市';
            
            // 如果尚未加载县级城市数据，则加载
            if (!countiesLoaded) {
                loadCountyCities();
            } else {
                // 如果已经加载，则显示它们
                Object.values(countyMarkers).forEach(marker => {
                    marker.addTo(map);
                });
            }
        } else {
            // 隐藏县级城市
            showCounties = false;
            countyButton.classList.remove('active');
            countyButton.textContent = '显示县级城市';
            
            // 从地图上移除县级城市标记
            Object.values(countyMarkers).forEach(marker => {
                marker.removeFrom(map);
            });
        }
    };
    
    // 添加县级城市标记的函数
    function addCountyMarker(county) {
        // 创建县级城市标记，使用比主要城市小的图标
        const marker = L.marker([county.lat, county.lon], {
            icon: createWeatherIcon('default', '', true) // 传入true表示这是县级城市
        }).addTo(showCounties ? map : null); // 如果showCounties为true，则添加到地图上
        
        // 添加县级城市名称，使用不同样式
        marker.bindTooltip(county.name, {
            permanent: true,
            direction: 'top',
            className: 'county-city-label',
            offset: [0, -15]
        });
        
        // 存储标记
        countyMarkers[county.name] = marker;
        
        // 获取并显示县级城市天气
        fetchCountyWeather(county);
        
        // 点击标记查看详细天气
        marker.on('click', function() {
            fetchCountyWeather(county, true);
        });
    }
    
    // 获取县级城市天气信息
    function fetchCountyWeather(county, showDetails = false) {
        const host = window.location.origin; // 获取当前网站的主机名
        // 根据选择的天数决定使用哪个API
        const apiEndpoint = selectedDays === 0 ? 
            `${host}/api/weather?lat=${county.lat}&lon=${county.lon}` :
            `${host}/api/forecast?lat=${county.lat}&lon=${county.lon}&days=${selectedDays}`;
            
        fetch(apiEndpoint)
            .then(response => response.json())
            .then(data => {
                let weatherData;
                if (selectedDays === 0) {
                    // 当前天气
                    weatherData = {
                        city: county.name,
                        temperature: data.main.temp,
                        weather: data.weather[0].description,
                        icon: data.weather[0].icon
                    };
                } else {
                    // 预报天气
                    const targetDate = new Date();
                    targetDate.setDate(targetDate.getDate() + selectedDays);
                    const targetDateStr = targetDate.toISOString().split('T')[0];
                    
                    // 查找目标日期的天气
                    const forecast = data.list.find(item => {
                        const itemDate = new Date(item.dt * 1000).toISOString().split('T')[0];
                        return itemDate === targetDateStr;
                    });
                    
                    if (forecast) {
                        weatherData = {
                            city: county.name,
                            date: targetDateStr,
                            temperature: forecast.main.temp,
                            weather: forecast.weather[0].description,
                            icon: forecast.weather[0].icon
                        };
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
                        marker.openPopup();
                    }
                }
                
                // 如果有筛选已应用，则重新应用当前的筛选类型
                if (filterApplied && currentWeatherType) {
                    window.filterWeather(currentWeatherType);
                }
            })
            .catch(error => console.error(`获取${county.name}的天气失败:`, error));
    }
    
    // 更新县级城市标记图标和弹出框
    function updateCountyMarkerIcon(countyName, weatherData) {
        const marker = countyMarkers[countyName];
        if (!marker) return;
        
        const icon = weatherData.icon;
        const weather = weatherData.weather;
        
        // 更新图标，传入true表示这是县级城市
        marker.setIcon(createWeatherIcon(icon, weather, true));
        
        // 更新弹出框内容，使用美化的布局
        const iconPath = getLocalIconByWeatherCode(icon, weather);
        let popupContent = `
            <div class="weather-popup-content">
                <h3>${countyName}</h3>
                <img src="${iconPath}" class="weather-popup-icon" alt="${weather}">
                <p><strong>温度:</strong> ${weatherData.temperature}°C</p>
                <p><strong>天气:</strong> ${weather}</p>
        `;
        
        // 如果是预报数据，添加日期信息
        if (weatherData.date) {
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
            popupContent += `</div>`;
        }
        
        marker.bindPopup(popupContent, {
            maxWidth: 250, 
            className: 'custom-popup'
        });
    }

    // 根据天气状态获取对应的图标文件名
    function getLocalIconByWeatherCode(iconCode, weatherDescription) {
        // 先根据iconCode查找
        let iconFileName = weatherIconMap[iconCode];
        
        // 如果没找到，则根据天气描述判断
        if (!iconFileName) {
            if (weatherDescription.includes('晴') || weatherDescription.includes('clear')) {
                iconFileName = 'sunny.png';
            } else if (weatherDescription.includes('多云') || weatherDescription.includes('cloud')) {
                iconFileName = 'douyun.png';
            } else if (weatherDescription.includes('阴') || weatherDescription.includes('overcast')) {
                iconFileName = 'yintian.png';
            } else if (weatherDescription.includes('雷') || weatherDescription.includes('thunder')) {
                iconFileName = 'leizhenyu.png';
            } else if (weatherDescription.includes('暴雨') || weatherDescription.includes('heavy rain')) {
                iconFileName = 'dawu.png';
            } else if (weatherDescription.includes('大雨') || weatherDescription.includes('rainstorm')) {
                iconFileName = 'dayu.png';
            } else if (weatherDescription.includes('中雨') || weatherDescription.includes('moderate rain')) {
                iconFileName = 'zhongyu.png';
            } else if (weatherDescription.includes('小雨') || weatherDescription.includes('light rain')) {
                iconFileName = 'xiaoyu.png';
            } else if (weatherDescription.includes('雨') || weatherDescription.includes('rain')) {
                iconFileName = 'xiaoyu.png';
            } else if (weatherDescription.includes('雪') || weatherDescription.includes('snow')) {
                iconFileName = 'snow.png';
            } else {
                iconFileName = 'sunny.png'; // 默认图标
            }
        }
        
        return `static/weather_icon/${iconFileName}`;
    }
    
    // 自定义图标创建函数
    function createWeatherIcon(iconCode, weatherDescription = '', isCounty = false) {
        const iconPath = getLocalIconByWeatherCode(iconCode, weatherDescription);
        
        const imgSize = isCounty ? 30 : 40;
        const className = isCounty ? 'weather-icon-marker county-marker' : 'weather-icon-marker';
        
        return L.divIcon({
            html: `<img src="${iconPath}" style="width:${imgSize}px; height:${imgSize}px;">`,
            className: className,
            iconSize: [imgSize, imgSize],
            iconAnchor: [imgSize/2, imgSize/2]
        });
    }

    // 定义天气筛选函数
    window.filterWeather = function(weatherType) {
        filterApplied = true;
        currentWeatherType = weatherType;
        
        // 处理主要城市
        Object.keys(cityWeatherData).forEach(cityName => {
            const weatherData = cityWeatherData[cityName];
            const marker = cityMarkers[cityName];
            
            if (!marker) return;
            
            let shouldShow = false;
            const weather = weatherData.weather.toLowerCase();
            
            switch(weatherType) {
                case 'sunny':
                    shouldShow = weather.includes('晴') || weather.includes('clear');
                    break;
                case 'cloudy':
                    shouldShow = weather.includes('多云') || weather.includes('cloud') || weather.includes('阴') || weather.includes('overcast');
                    break;
                case 'rain':
                    shouldShow = weather.includes('雨') || weather.includes('rain');
                    break;
                case 'snow':
                    shouldShow = weather.includes('雪') || weather.includes('snow');
                    break;
            }
            
            if (shouldShow) {
                marker.setOpacity(1);
                // 让匹配的城市图标更大更明显
                const icon = marker.getIcon();
                const iconHtml = icon.options.html;
                const newIcon = L.divIcon({
                    html: iconHtml.replace('width:40px; height:40px', 'width:50px; height:50px'),
                    className: 'weather-icon-marker weather-highlight',
                    iconSize: [50, 50],
                    iconAnchor: [25, 25]
                });
                marker.setIcon(newIcon);
            } else {
                // 其他城市变暗
                marker.setOpacity(0.3);
            }
        });
        
        // 处理县级城市（如果已加载）
        if (countiesLoaded && showCounties) {
            Object.keys(countyWeatherData).forEach(countyName => {
                const weatherData = countyWeatherData[countyName];
                const marker = countyMarkers[countyName];
                
                if (!marker) return;
                
                let shouldShow = false;
                const weather = weatherData.weather.toLowerCase();
                
                switch(weatherType) {
                    case 'sunny':
                        shouldShow = weather.includes('晴') || weather.includes('clear');
                        break;
                    case 'cloudy':
                        shouldShow = weather.includes('多云') || weather.includes('cloud') || weather.includes('阴') || weather.includes('overcast');
                        break;
                    case 'rain':
                        shouldShow = weather.includes('雨') || weather.includes('rain');
                        break;
                    case 'snow':
                        shouldShow = weather.includes('雪') || weather.includes('snow');
                        break;
                }
                
                if (shouldShow) {
                    marker.setOpacity(1);
                    // 让匹配的县级城市图标更大更明显，但比主要城市小
                    const icon = marker.getIcon();
                    const iconHtml = icon.options.html;
                    const newIcon = L.divIcon({
                        html: iconHtml.replace('width:30px; height:30px', 'width:40px; height:40px'),
                        className: 'weather-icon-marker county-marker weather-highlight',
                        iconSize: [40, 40],
                        iconAnchor: [20, 20]
                    });
                    marker.setIcon(newIcon);
                } else {
                    // 其他县级城市变暗
                    marker.setOpacity(0.3);
                }
            });
        }
    };
    
    // 定义重置筛选的函数
    window.resetFilter = function() {
        filterApplied = false;
        currentWeatherType = '';
        
        // 重置主要城市
        Object.keys(cityMarkers).forEach(cityName => {
            const marker = cityMarkers[cityName];
            if (!marker) return;
            
            // 恢复原始不透明度
            marker.setOpacity(1);
            
            // 恢复原始图标大小
            const weatherData = cityWeatherData[cityName];
            if (weatherData) {
                updateMarkerIcon(cityName, weatherData);
            }
        });
        
        // 重置县级城市（如果已加载）
        if (countiesLoaded && showCounties) {
            Object.keys(countyMarkers).forEach(countyName => {
                const marker = countyMarkers[countyName];
                if (!marker) return;
                
                // 恢复原始不透明度
                marker.setOpacity(1);
                
                // 恢复原始图标大小
                const weatherData = countyWeatherData[countyName];
                if (weatherData) {
                    updateCountyMarkerIcon(countyName, weatherData);
                }
            });
        }
    };
}); 