# 实时天气地图

一个用于展示中国主要城市实时天气情况的交互式地图应用，帮助您规划旅行时找到晴天的城市。

## 功能特点

- 在地图上直观显示各城市天气情况
- 通过不同颜色标记展示晴天、多云、下雨等天气状态
- 点击城市标记可查看详细天气信息
- 自动定期更新天气数据
- 支持PC和移动设备浏览

## 安装与运行

### 前提条件

- Python 3.6 或更高版本
- Flask 和其他依赖项（见 requirements.txt）
- OpenWeatherMap API 密钥（免费注册获取）

### 安装步骤

1. 克隆或下载此项目到本地

2. 安装所需依赖项：
   ```
   pip install -r requirements.txt
   ```

3. 在 `.env` 文件中设置您的 OpenWeatherMap API 密钥：
   ```
   WEATHER_API_KEY=your_api_key_here
   ```
   
   > 注意：您需要在 [OpenWeatherMap](https://openweathermap.org/) 注册并获取免费 API 密钥

4. 运行应用：
   ```
   python app.py
   ```

5. 在浏览器中访问：`http://localhost:5000`

## 技术实现

- 后端：使用 Flask 框架构建 Web 服务
- 前端：HTML, CSS, JavaScript
- 地图：使用 Leaflet.js 开源地图库
- 天气数据：OpenWeatherMap API

## 自定义与扩展

- 在 `app.py` 的 `get_cities()` 函数中添加更多城市
- 在 `static/css/style.css` 中修改样式和外观
- 在 `static/js/main.js` 中调整地图行为和天气更新逻辑

## 许可

MIT 许可证 