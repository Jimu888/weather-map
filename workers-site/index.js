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
  
  // 转发到您的 API 处理逻辑
  if (url.pathname === '/api/weather') {
    return handleWeatherRequest(request)
  }
  
  if (url.pathname === '/api/forecast') {
    return handleForecastRequest(request)
  }
  
  if (url.pathname === '/api/cities') {
    return handleCitiesRequest(request)
  }
  
  if (url.pathname === '/api/counties') {
    return handleCountiesRequest(request)
  }
  
  return new Response('Not Found', { status: 404 })
}

// 处理天气请求
async function handleWeatherRequest(request) {
  const url = new URL(request.url)
  const lat = url.searchParams.get('lat')
  const lon = url.searchParams.get('lon')
  
  const apiKey = process.env.WEATHER_API_KEY
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