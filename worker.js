addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // 处理 API 请求
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(request)
  }
  
  // 处理静态文件
  return fetch(request)
}

async function handleApiRequest(request) {
  const url = new URL(request.url)
  
  // 处理不同的 API 路由
  switch(url.pathname) {
    case '/api/weather':
      return handleWeatherRequest(request)
    case '/api/forecast':
      return handleForecastRequest(request)
    case '/api/cities':
      return handleCitiesRequest(request)
    case '/api/counties':
      return handleCountiesRequest(request)
    default:
      return new Response('Not Found', { status: 404 })
  }
}

async function handleWeatherRequest(request) {
  const url = new URL(request.url)
  const lat = url.searchParams.get('lat')
  const lon = url.searchParams.get('lon')
  
  if (!lat || !lon) {
    return new Response('Missing parameters', { status: 400 })
  }

  const apiKey = WEATHER_API_KEY // 环境变量中的 API 密钥
  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=zh_cn`
  
  try {
    const response = await fetch(apiUrl)
    const data = await response.json()
    
    return new Response(JSON.stringify({
      city: data.name,
      temperature: data.main.temp,
      weather: data.weather[0].description,
      icon: data.weather[0].icon
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function handleForecastRequest(request) {
  const url = new URL(request.url)
  const lat = url.searchParams.get('lat')
  const lon = url.searchParams.get('lon')
  const days = parseInt(url.searchParams.get('days') || '1')
  
  if (!lat || !lon) {
    return new Response('Missing parameters', { status: 400 })
  }

  const apiKey = WEATHER_API_KEY
  const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=zh_cn`
  
  try {
    const response = await fetch(apiUrl)
    const data = await response.json()
    
    // 处理预报数据
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// 处理城市数据请求
async function handleCitiesRequest(request) {
  // 这里返回中国主要城市的数据
  const cities = [
    {'name': '北京', 'lat': 39.9042, 'lon': 116.4074},
    {'name': '上海', 'lat': 31.2304, 'lon': 121.4737},
    // ... 其他城市数据
  ]
  
  return new Response(JSON.stringify(cities), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}

// 处理县级市数据请求
async function handleCountiesRequest(request) {
  const url = new URL(request.url)
  const province = url.searchParams.get('province')
  
  // 这里返回县级市数据
  const counties = [
    // 根据省份返回相应的县级市数据
  ]
  
  return new Response(JSON.stringify(counties), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
} 