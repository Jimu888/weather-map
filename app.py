#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask import Flask, render_template, request, jsonify, send_from_directory
import requests
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import json

# 加载环境变量
load_dotenv()

app = Flask(__name__)

# 您需要从OpenWeatherMap或其他天气API获取密钥
WEATHER_API_KEY = os.getenv('WEATHER_API_KEY', '')

# 访问记录文件路径
VISITORS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'visitors.json')

def load_visitors():
    """加载访问记录"""
    if os.path.exists(VISITORS_FILE):
        try:
            with open(VISITORS_FILE, 'r') as f:
                return json.load(f)
        except:
            return {'ips': []}
    return {'ips': []}

def save_visitors(visitors):
    """保存访问记录"""
    with open(VISITORS_FILE, 'w') as f:
        json.dump(visitors, f)

def count_unique_visitors():
    """统计唯一访问者数量"""
    visitors = load_visitors()
    return len(set(visitors['ips']))

@app.route('/')
def index():
    """主页面"""
    # 获取访问者IP
    visitor_ip = request.remote_addr
    
    # 加载访问记录
    visitors = load_visitors()
    
    # 添加新的访问记录
    if visitor_ip not in visitors['ips']:
        visitors['ips'].append(visitor_ip)
        save_visitors(visitors)
    
    # 获取唯一访问者数量
    visitor_count = count_unique_visitors()
    
    return render_template('index.html', visitor_count=visitor_count)

# 新增路由来提供天气图标
@app.route('/weather_icon/<filename>')
def weather_icon(filename):
    """提供天气图标文件"""
    icon_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'weather_icon')
    return send_from_directory(icon_dir, filename)

@app.route('/api/weather')
def get_weather():
    """获取当前天气数据的API端点"""
    lat = request.args.get('lat', default=39.9042, type=float)  # 默认为北京的纬度
    lon = request.args.get('lon', default=116.4074, type=float)  # 默认为北京的经度

    # 如果没有API密钥，返回模拟数据
    if not WEATHER_API_KEY:
        return jsonify({
            'city': '示例城市',
            'temperature': 25,
            'weather': '晴天',
            'icon': '01d'
        })

    # 构建API请求
    api_url = f'https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric&lang=zh_cn'
    
    try:
        response = requests.get(api_url)
        data = response.json()
        
        # 解析数据
        city = data.get('name', '未知')
        temperature = data.get('main', {}).get('temp', 0)
        weather_description = data.get('weather', [{}])[0].get('description', '未知')
        weather_icon = data.get('weather', [{}])[0].get('icon', '01d')
        
        return jsonify({
            'city': city,
            'temperature': temperature,
            'weather': weather_description,
            'icon': weather_icon
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/forecast')
def get_forecast():
    """获取未来天气预报的API端点"""
    lat = request.args.get('lat', default=39.9042, type=float)  # 默认为北京的纬度
    lon = request.args.get('lon', default=116.4074, type=float)  # 默认为北京的经度
    days = request.args.get('days', default=1, type=int)  # 默认查询未来1天
    
    # 限制预报天数为1-5天
    days = min(max(days, 1), 5)
    
    # 如果没有API密钥，返回模拟数据
    if not WEATHER_API_KEY:
        future_date = (datetime.now() + timedelta(days=days)).strftime('%Y-%m-%d')
        return jsonify({
            'city': '示例城市',
            'date': future_date,
            'temperature': 25,
            'weather': '晴天',
            'icon': '01d'
        })

    # 构建API请求 - 使用OpenWeatherMap的5天/3小时预报API
    api_url = f'https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric&lang=zh_cn'
    
    try:
        response = requests.get(api_url)
        data = response.json()
        
        # 计算目标日期（当前日期 + days天）
        target_date = datetime.now().date() + timedelta(days=days)
        target_date_str = target_date.strftime('%Y-%m-%d')
        
        # 查找目标日期的所有预报
        day_forecasts = []
        for item in data.get('list', []):
            item_date = datetime.fromtimestamp(item['dt']).date()
            if item_date == target_date:
                day_forecasts.append(item)
        
        # 如果找不到目标日期的预报，返回错误
        if not day_forecasts:
            return jsonify({'error': f'未找到{target_date_str}的预报数据'}), 404
        
        # 使用中午时间的预报作为当天的代表（或者最近的一个时段）
        noon_forecast = None
        noon_diff = float('inf')
        
        for forecast in day_forecasts:
            forecast_time = datetime.fromtimestamp(forecast['dt'])
            hours_from_noon = abs(forecast_time.hour - 12)
            if hours_from_noon < noon_diff:
                noon_diff = hours_from_noon
                noon_forecast = forecast
        
        if noon_forecast:
            city = data.get('city', {}).get('name', '未知')
            temperature = noon_forecast.get('main', {}).get('temp', 0)
            weather_description = noon_forecast.get('weather', [{}])[0].get('description', '未知')
            weather_icon = noon_forecast.get('weather', [{}])[0].get('icon', '01d')
            
            return jsonify({
                'city': city,
                'date': target_date_str,
                'temperature': temperature,
                'weather': weather_description,
                'icon': weather_icon
            })
        else:
            return jsonify({'error': '无法解析预报数据'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cities')
def get_cities():
    """获取中国城市的位置"""
    # 包含省会城市和其他主要城市
    cities = [
        # 直辖市
        {'name': '北京', 'lat': 39.9042, 'lon': 116.4074},
        {'name': '上海', 'lat': 31.2304, 'lon': 121.4737},
        {'name': '天津', 'lat': 39.0842, 'lon': 117.2009},
        {'name': '重庆', 'lat': 29.5630, 'lon': 106.5516},
        
        # 华东地区
        {'name': '南京', 'lat': 32.0603, 'lon': 118.7969},
        {'name': '苏州', 'lat': 31.2990, 'lon': 120.5853},
        {'name': '无锡', 'lat': 31.5700, 'lon': 120.3000},
        {'name': '常州', 'lat': 31.8105, 'lon': 119.9740},
        {'name': '杭州', 'lat': 30.2741, 'lon': 120.1551},
        {'name': '宁波', 'lat': 29.8683, 'lon': 121.5440},
        {'name': '温州', 'lat': 27.9939, 'lon': 120.6999},
        {'name': '嘉兴', 'lat': 30.7522, 'lon': 120.7552},
        {'name': '绍兴', 'lat': 30.0301, 'lon': 120.5801},
        {'name': '金华', 'lat': 29.0789, 'lon': 119.6479},
        {'name': '合肥', 'lat': 31.8206, 'lon': 117.2272},
        {'name': '福州', 'lat': 26.0614, 'lon': 119.3061},
        {'name': '厦门', 'lat': 24.4798, 'lon': 118.0894},
        {'name': '泉州', 'lat': 24.8741, 'lon': 118.6759},
        {'name': '济南', 'lat': 36.6512, 'lon': 117.1201},
        {'name': '青岛', 'lat': 36.0671, 'lon': 120.3826},
        {'name': '烟台', 'lat': 37.4631, 'lon': 121.4486},
        {'name': '威海', 'lat': 37.5130, 'lon': 122.1200},
        {'name': '潍坊', 'lat': 36.7069, 'lon': 119.1618},
        {'name': '临沂', 'lat': 35.1042, 'lon': 118.3532},
        {'name': '南昌', 'lat': 28.6820, 'lon': 115.8580},
        
        # 华南地区
        {'name': '广州', 'lat': 23.1291, 'lon': 113.2644},
        {'name': '深圳', 'lat': 22.5431, 'lon': 114.0579},
        {'name': '东莞', 'lat': 23.0430, 'lon': 113.7633},
        {'name': '佛山', 'lat': 23.0218, 'lon': 113.1211},
        {'name': '珠海', 'lat': 22.2710, 'lon': 113.5767},
        {'name': '汕头', 'lat': 23.3535, 'lon': 116.6820},
        {'name': '海口', 'lat': 20.0444, 'lon': 110.3244},
        {'name': '三亚', 'lat': 18.2534, 'lon': 109.5120},
        {'name': '南宁', 'lat': 22.8170, 'lon': 108.3669},
        {'name': '桂林', 'lat': 25.2736, 'lon': 110.2907},
        
        # 华中地区
        {'name': '武汉', 'lat': 30.5928, 'lon': 114.3055},
        {'name': '宜昌', 'lat': 30.6920, 'lon': 111.2864},
        {'name': '长沙', 'lat': 28.2282, 'lon': 112.9388},
        {'name': '株洲', 'lat': 27.8273, 'lon': 113.1517},
        {'name': '郑州', 'lat': 34.7466, 'lon': 113.6254},
        {'name': '洛阳', 'lat': 34.6197, 'lon': 112.4540},
        
        # 华北地区
        {'name': '石家庄', 'lat': 38.0428, 'lon': 114.5149},
        {'name': '唐山', 'lat': 39.6305, 'lon': 118.1802},
        {'name': '秦皇岛', 'lat': 39.9356, 'lon': 119.5982},
        {'name': '太原', 'lat': 37.8735, 'lon': 112.5634},
        {'name': '大同', 'lat': 40.0767, 'lon': 113.3001},
        {'name': '呼和浩特', 'lat': 40.8427, 'lon': 111.7491},
        {'name': '包头', 'lat': 40.6582, 'lon': 109.8400},
        
        # 西北地区
        {'name': '西安', 'lat': 34.3416, 'lon': 108.9398},
        {'name': '咸阳', 'lat': 34.3334, 'lon': 108.7051},
        {'name': '兰州', 'lat': 36.0594, 'lon': 103.8343},
        {'name': '西宁', 'lat': 36.6232, 'lon': 101.7805},
        {'name': '银川', 'lat': 38.4872, 'lon': 106.2309},
        {'name': '乌鲁木齐', 'lat': 43.8256, 'lon': 87.6168},
        {'name': '喀什', 'lat': 39.4707, 'lon': 75.9897},
        
        # 西南地区
        {'name': '成都', 'lat': 30.5728, 'lon': 104.0668},
        {'name': '绵阳', 'lat': 31.4677, 'lon': 104.6796},
        {'name': '乐山', 'lat': 29.5521, 'lon': 103.7660},
        {'name': '贵阳', 'lat': 26.6470, 'lon': 106.6302},
        {'name': '遵义', 'lat': 27.7256, 'lon': 106.9271},
        {'name': '昆明', 'lat': 25.0453, 'lon': 102.7097},
        {'name': '大理', 'lat': 25.6065, 'lon': 100.2675},
        {'name': '丽江', 'lat': 26.8721, 'lon': 100.2301},
        {'name': '拉萨', 'lat': 29.6500, 'lon': 91.1400},
        
        # 东北地区
        {'name': '沈阳', 'lat': 41.8057, 'lon': 123.4315},
        {'name': '大连', 'lat': 38.9140, 'lon': 121.6147},
        {'name': '长春', 'lat': 43.8170, 'lon': 125.3242},
        {'name': '吉林', 'lat': 43.8519, 'lon': 126.5650},
        {'name': '哈尔滨', 'lat': 45.8038, 'lon': 126.5340},
        {'name': '牡丹江', 'lat': 44.5526, 'lon': 129.6320}
    ]
    return jsonify(cities)

@app.route('/api/counties')
def get_counties():
    """获取中国县级城市的位置数据"""
    # 第一批县级城市数据（可以根据需要分批加载）
    counties = [
        # 河北省部分县级市
        {'name': '张家口', 'lat': 40.7671, 'lon': 114.8806, 'province': '河北'},
        {'name': '承德', 'lat': 40.9510, 'lon': 117.9625, 'province': '河北'},
        {'name': '廊坊', 'lat': 39.5376, 'lon': 116.6846, 'province': '河北'},
        {'name': '沧州', 'lat': 38.3037, 'lon': 116.8388, 'province': '河北'},
        {'name': '衡水', 'lat': 37.7351, 'lon': 115.6709, 'province': '河北'},
        {'name': '邢台', 'lat': 37.0682, 'lon': 114.5048, 'province': '河北'},
        {'name': '邯郸', 'lat': 36.6093, 'lon': 114.4894, 'province': '河北'},
        {'name': '保定', 'lat': 38.8739, 'lon': 115.4644, 'province': '河北'},
        
        # 山东省部分县级市
        {'name': '淄博', 'lat': 36.8130, 'lon': 118.0548, 'province': '山东'},
        {'name': '枣庄', 'lat': 34.8568, 'lon': 117.3233, 'province': '山东'},
        {'name': '东营', 'lat': 37.4346, 'lon': 118.6747, 'province': '山东'},
        {'name': '济宁', 'lat': 35.4150, 'lon': 116.5872, 'province': '山东'},
        {'name': '泰安', 'lat': 36.1877, 'lon': 117.1301, 'province': '山东'},
        {'name': '日照', 'lat': 35.4202, 'lon': 119.5269, 'province': '山东'},
        {'name': '莱芜', 'lat': 36.2144, 'lon': 117.6760, 'province': '山东'},
        {'name': '德州', 'lat': 37.4356, 'lon': 116.3595, 'province': '山东'},
        {'name': '聊城', 'lat': 36.4567, 'lon': 115.9856, 'province': '山东'},
        {'name': '滨州', 'lat': 37.3836, 'lon': 117.9725, 'province': '山东'},
        {'name': '菏泽', 'lat': 35.2414, 'lon': 115.4811, 'province': '山东'},
        
        # 江苏省部分县级市
        {'name': '徐州', 'lat': 34.2583, 'lon': 117.1859, 'province': '江苏'},
        {'name': '连云港', 'lat': 34.5971, 'lon': 119.2193, 'province': '江苏'},
        {'name': '淮安', 'lat': 33.5098, 'lon': 119.0212, 'province': '江苏'},
        {'name': '盐城', 'lat': 33.3477, 'lon': 120.1637, 'province': '江苏'},
        {'name': '扬州', 'lat': 32.3936, 'lon': 119.4127, 'province': '江苏'},
        {'name': '镇江', 'lat': 32.1885, 'lon': 119.4251, 'province': '江苏'},
        {'name': '泰州', 'lat': 32.4547, 'lon': 119.9229, 'province': '江苏'},
        {'name': '宿迁', 'lat': 33.9614, 'lon': 118.2749, 'province': '江苏'},
        
        # 浙江省部分县级市
        {'name': '湖州', 'lat': 30.8943, 'lon': 120.0868, 'province': '浙江'},
        {'name': '舟山', 'lat': 30.0159, 'lon': 122.1068, 'province': '浙江'},
        {'name': '台州', 'lat': 28.6560, 'lon': 121.4205, 'province': '浙江'},
        {'name': '丽水', 'lat': 28.4672, 'lon': 119.9227, 'province': '浙江'},
        {'name': '衢州', 'lat': 28.9563, 'lon': 118.8718, 'province': '浙江'},
        
        # 广东省部分县级市
        {'name': '韶关', 'lat': 24.8115, 'lon': 113.5973, 'province': '广东'},
        {'name': '湛江', 'lat': 21.2706, 'lon': 110.3594, 'province': '广东'},
        {'name': '江门', 'lat': 22.5786, 'lon': 113.0819, 'province': '广东'},
        {'name': '茂名', 'lat': 21.6675, 'lon': 110.9192, 'province': '广东'},
        {'name': '肇庆', 'lat': 23.0471, 'lon': 112.4647, 'province': '广东'},
        {'name': '惠州', 'lat': 23.1119, 'lon': 114.4161, 'province': '广东'},
        {'name': '梅州', 'lat': 24.2891, 'lon': 116.1225, 'province': '广东'},
        {'name': '汕尾', 'lat': 22.7787, 'lon': 115.3759, 'province': '广东'},
        {'name': '河源', 'lat': 23.7465, 'lon': 114.7001, 'province': '广东'},
        {'name': '阳江', 'lat': 21.8598, 'lon': 111.9820, 'province': '广东'},
        {'name': '清远', 'lat': 23.6818, 'lon': 113.0565, 'province': '广东'},
        {'name': '潮州', 'lat': 23.6663, 'lon': 116.6289, 'province': '广东'},
        {'name': '揭阳', 'lat': 23.5498, 'lon': 116.3728, 'province': '广东'},
        {'name': '云浮', 'lat': 22.9155, 'lon': 112.0444, 'province': '广东'},

        # 云南省县级市
        {'name': '曲靖', 'lat': 25.4901, 'lon': 103.7968, 'province': '云南'},
        {'name': '玉溪', 'lat': 24.3518, 'lon': 102.5428, 'province': '云南'},
        {'name': '保山', 'lat': 25.1120, 'lon': 99.1611, 'province': '云南'},
        {'name': '昭通', 'lat': 27.3375, 'lon': 103.7171, 'province': '云南'},
        {'name': '丽江', 'lat': 26.8721, 'lon': 100.2301, 'province': '云南'},
        {'name': '普洱', 'lat': 22.8255, 'lon': 100.9659, 'province': '云南'},
        {'name': '临沧', 'lat': 23.8864, 'lon': 100.0927, 'province': '云南'},
        {'name': '文山', 'lat': 23.3692, 'lon': 104.2440, 'province': '云南'},
        {'name': '红河', 'lat': 23.3639, 'lon': 103.3756, 'province': '云南'},
        {'name': '西双版纳', 'lat': 22.0017, 'lon': 100.8038, 'province': '云南'},
        {'name': '楚雄', 'lat': 25.0330, 'lon': 101.5460, 'province': '云南'},
        {'name': '大理', 'lat': 25.6065, 'lon': 100.2675, 'province': '云南'},
        {'name': '德宏', 'lat': 24.4367, 'lon': 98.5856, 'province': '云南'},
        {'name': '怒江', 'lat': 25.8171, 'lon': 98.8566, 'province': '云南'},
        {'name': '迪庆', 'lat': 27.8254, 'lon': 99.7068, 'province': '云南'},

        # 贵州省县级市
        {'name': '六盘水', 'lat': 26.5949, 'lon': 104.8302, 'province': '贵州'},
        {'name': '遵义', 'lat': 27.7256, 'lon': 106.9271, 'province': '贵州'},
        {'name': '安顺', 'lat': 26.2456, 'lon': 105.9477, 'province': '贵州'},
        {'name': '毕节', 'lat': 27.2997, 'lon': 105.2833, 'province': '贵州'},
        {'name': '铜仁', 'lat': 27.7183, 'lon': 109.1912, 'province': '贵州'},
        {'name': '黔西南', 'lat': 25.0881, 'lon': 104.9047, 'province': '贵州'},
        {'name': '黔东南', 'lat': 26.5834, 'lon': 107.9774, 'province': '贵州'},
        {'name': '黔南', 'lat': 26.2582, 'lon': 107.5238, 'province': '贵州'},

        # 四川省县级市
        {'name': '自贡', 'lat': 29.3392, 'lon': 104.7786, 'province': '四川'},
        {'name': '攀枝花', 'lat': 26.5821, 'lon': 101.7182, 'province': '四川'},
        {'name': '泸州', 'lat': 28.8717, 'lon': 105.4421, 'province': '四川'},
        {'name': '德阳', 'lat': 31.1271, 'lon': 104.3980, 'province': '四川'},
        {'name': '绵阳', 'lat': 31.4677, 'lon': 104.6796, 'province': '四川'},
        {'name': '广元', 'lat': 32.4353, 'lon': 105.8433, 'province': '四川'},
        {'name': '遂宁', 'lat': 30.5332, 'lon': 105.5933, 'province': '四川'},
        {'name': '内江', 'lat': 29.5832, 'lon': 105.0584, 'province': '四川'},
        {'name': '乐山', 'lat': 29.5521, 'lon': 103.7660, 'province': '四川'},
        {'name': '南充', 'lat': 30.8373, 'lon': 106.1105, 'province': '四川'},
        {'name': '眉山', 'lat': 30.0750, 'lon': 103.8480, 'province': '四川'},
        {'name': '宜宾', 'lat': 28.7513, 'lon': 104.6417, 'province': '四川'},
        {'name': '广安', 'lat': 30.4739, 'lon': 106.6333, 'province': '四川'},
        {'name': '达州', 'lat': 31.2090, 'lon': 107.4684, 'province': '四川'},
        {'name': '雅安', 'lat': 30.0164, 'lon': 103.0419, 'province': '四川'},
        {'name': '巴中', 'lat': 31.8588, 'lon': 106.7478, 'province': '四川'},
        {'name': '资阳', 'lat': 30.1222, 'lon': 104.6419, 'province': '四川'},
        {'name': '阿坝', 'lat': 31.8994, 'lon': 102.2214, 'province': '四川'},
        {'name': '甘孜', 'lat': 30.0504, 'lon': 101.9638, 'province': '四川'},
        {'name': '凉山', 'lat': 27.8867, 'lon': 102.2674, 'province': '四川'},

        # 重庆市区县级市
        {'name': '万州', 'lat': 30.8079, 'lon': 108.3803, 'province': '重庆'},
        {'name': '涪陵', 'lat': 29.7032, 'lon': 107.3897, 'province': '重庆'},
        {'name': '黔江', 'lat': 29.5332, 'lon': 108.7709, 'province': '重庆'},
        {'name': '长寿', 'lat': 29.8574, 'lon': 107.0809, 'province': '重庆'},
        {'name': '江津', 'lat': 29.2902, 'lon': 106.2592, 'province': '重庆'},
        {'name': '合川', 'lat': 29.9723, 'lon': 106.2765, 'province': '重庆'},
        {'name': '永川', 'lat': 29.3560, 'lon': 105.9270, 'province': '重庆'},
        {'name': '南川', 'lat': 29.1575, 'lon': 107.0988, 'province': '重庆'},

        # 西藏自治区地级市
        {'name': '日喀则', 'lat': 29.2674, 'lon': 88.8799, 'province': '西藏'},
        {'name': '昌都', 'lat': 31.1369, 'lon': 97.1784, 'province': '西藏'},
        {'name': '山南', 'lat': 29.2378, 'lon': 91.7733, 'province': '西藏'},
        {'name': '林芝', 'lat': 29.6486, 'lon': 94.3624, 'province': '西藏'},
        {'name': '那曲', 'lat': 31.4762, 'lon': 92.0517, 'province': '西藏'},
        {'name': '阿里', 'lat': 32.5027, 'lon': 80.1055, 'province': '西藏'},

        # 甘肃省县级市
        {'name': '嘉峪关', 'lat': 39.7726, 'lon': 98.2890, 'province': '甘肃'},
        {'name': '金昌', 'lat': 38.5144, 'lon': 102.1877, 'province': '甘肃'},
        {'name': '白银', 'lat': 36.5447, 'lon': 104.1390, 'province': '甘肃'},
        {'name': '天水', 'lat': 34.5809, 'lon': 105.7249, 'province': '甘肃'},
        {'name': '武威', 'lat': 37.9283, 'lon': 102.6347, 'province': '甘肃'},
        {'name': '张掖', 'lat': 38.9325, 'lon': 100.4458, 'province': '甘肃'},
        {'name': '平凉', 'lat': 35.5428, 'lon': 106.6654, 'province': '甘肃'},
        {'name': '酒泉', 'lat': 39.7326, 'lon': 98.4941, 'province': '甘肃'},
        {'name': '庆阳', 'lat': 35.7091, 'lon': 107.6380, 'province': '甘肃'},
        {'name': '定西', 'lat': 35.5795, 'lon': 104.6260, 'province': '甘肃'},
        {'name': '陇南', 'lat': 33.4009, 'lon': 104.9218, 'province': '甘肃'},
        {'name': '临夏', 'lat': 35.6045, 'lon': 103.2124, 'province': '甘肃'},
        {'name': '甘南', 'lat': 34.9864, 'lon': 102.9110, 'province': '甘肃'}
    ]
    # 这里可以按省份分批返回县级城市，也可以用分页方式返回更多城市
    province = request.args.get('province', '')
    if province:
        filtered_counties = [county for county in counties if county['province'] == province]
        return jsonify(filtered_counties)
    return jsonify(counties)

@app.route('/api/visitor-count')
def get_visitor_count():
    """获取访问计数的API端点"""
    # 获取访问者IP
    visitor_ip = request.remote_addr
    
    # 加载访问记录
    visitors = load_visitors()
    
    # 添加新的访问记录
    if visitor_ip not in visitors['ips']:
        visitors['ips'].append(visitor_ip)
        save_visitors(visitors)
    
    # 获取唯一访问者数量
    visitor_count = count_unique_visitors()
    
    return jsonify({'count': visitor_count})

if __name__ == '__main__':
    app.run(debug=True, port=8080)