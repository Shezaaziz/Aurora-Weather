/* Append at the very bottom of script.js ------------------------ */

function createCloud(){
  const cloud=document.createElement('div');
  cloud.className='cloud';
  // Random size
  const scale=0.8+Math.random()*0.6;
  cloud.style.width=`${120*scale}px`;
  cloud.style.height=`${50*scale}px`;
  // Random vertical position
  cloud.style.top=`${Math.random()*40}%`;
  // Random speed
  const duration=25+Math.random()*20; // seconds
  cloud.style.animationDuration=`${duration}s`;
  // Random delay so they don't all start together
  cloud.style.animationDelay=`${Math.random()*10}s`;
  document.querySelector('.cloud-layer').appendChild(cloud);

  // Remove after animation to keep DOM light
  setTimeout(()=>cloud.remove(),(duration+10)*1000);
}

function createRainDrop(){
  const drop=document.createElement('div');
  drop.className='rain-drop';
  drop.style.left=`${Math.random()*100}vw`;
  drop.style.animationDuration=`${0.5+Math.random()*0.5}s`;
  document.body.appendChild(drop);
  setTimeout(()=>drop.remove(),1000);
}

// Inject cloud layer once
const cloudLayer=document.createElement('div');
cloudLayer.className='cloud-layer';
document.body.appendChild(cloudLayer);

// Start clouds
for(let i=0;i<5;i++){
  setTimeout(()=>createCloud(),i*4000);
}
setInterval(createCloud,8000);

// Optional: light rain if current condition contains “rain”
function toggleRain(on){
  if(on&&!window.rainInterval){
    window.rainInterval=setInterval(createRainDrop,30);
  }else if(!on&&window.rainInterval){
    clearInterval(window.rainInterval);
    delete window.rainInterval;
  }
}

// Helper to determine the general weather category for CSS styling
function getWeatherCategory(conditionText) {
    const text = conditionText.toLowerCase();

    if (text.includes('sunny') || text.includes('clear')) return 'clear';
    if (text.includes('rain') || text.includes('drizzle')) return 'rain';
    if (text.includes('snow') || text.includes('sleet') || text.includes('ice') || text.includes('blizzard')) return 'snow';
    if (text.includes('thunder')) return 'thunder';
    if (text.includes('cloud') || text.includes('overcast') || text.includes('mist') || text.includes('fog')) return 'cloudy';

    return 'default';
}

// Weather App JavaScript - Using WeatherAPI.com
class WeatherApp {
    constructor() {
        this.apiKey = 'a3496649cdec4ee98e8173457252910'; // Your WeatherAPI.com key
        this.baseUrl = 'https://api.weatherapi.com/v1';
        this.currentUnit = 'C'; // Celsius or Fahrenheit
        this.currentLocation = null;
        this.weatherData = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.setTheme();
        this.updateDateTime();
        this.getCurrentLocation();
        
        // Update time every minute
        setInterval(() => this.updateDateTime(), 60000);
        
        // Update theme every hour
        setInterval(() => this.setTheme(), 3600000);
    }

    bindEvents() {
        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => this.searchWeather());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchWeather();
        });

        // Location button
        document.getElementById('locationBtn').addEventListener('click', () => this.getCurrentLocation());

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Temperature unit toggle (clickable unit next to temp)
        document.getElementById('tempUnit').addEventListener('click', () => this.toggleTempUnit());

        // Retry button
        document.getElementById('retryBtn').addEventListener('click', () => this.retryLastRequest());
    }

    setTheme() {
        const hour = new Date().getHours();
        const theme = (hour >= 6 && hour < 20) ? 'day' : 'night';
        document.body.setAttribute('data-theme', theme);
        
        // Update theme icon
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = theme === 'day' ? 'fas fa-sun' : 'fas fa-moon';

        // Re-apply weather data to update moon/sun if the theme changes hourly
        if(this.weatherData) this.displayWeatherData();
    }

    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'day' ? 'night' : 'day';
        document.body.setAttribute('data-theme', newTheme);
        
        // Update theme icon
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = newTheme === 'day' ? 'fas fa-sun' : 'fas fa-moon';
    }

    updateDateTime() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        document.getElementById('dateTime').textContent = now.toLocaleDateString('en-US', options);
    }

    async getCurrentLocation() {
        if (navigator.geolocation) {
            this.showLoading(true);
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    this.currentLocation = `${latitude},${longitude}`;
                    await this.fetchWeatherData(this.currentLocation);
                },
                async (error) => {
                    console.error('Geolocation error:', error);
                    // Fallback to default location
                    await this.fetchWeatherData('London');
                    this.showError('Unable to get your location. Showing London weather.');
                }
            );
        } else {
            this.showError('Geolocation is not supported by this browser.');
        }
    }

    async searchWeather() {
        const city = document.getElementById('searchInput').value.trim();
        if (!city) return;

        this.showLoading(true);
        await this.fetchWeatherData(city);
        document.getElementById('searchInput').value = '';
    }

    async fetchWeatherData(location) {
        try {
            const currentUrl = `${this.baseUrl}/current.json?key=${this.apiKey}&q=${location}&aqi=yes`;
            
            const forecastUrl = `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${location}&days=10&aqi=yes&alerts=yes`;
            
            const [currentResponse, forecastResponse] = await Promise.all([
                fetch(currentUrl),
                fetch(forecastUrl)
            ]);

            if (!currentResponse.ok || !forecastResponse.ok) {
                throw new Error('Weather data not available');
            }

            const currentData = await currentResponse.json();
            const forecastData = await forecastResponse.json();

            this.weatherData = {
                current: currentData,
                forecast: forecastData
            };

            this.displayWeatherData();
            this.showLoading(false);

        } catch (error) {
            console.error('Weather fetch error:', error);
            this.showError('Unable to fetch weather data. Please try again.');
            this.showLoading(false);
        }
    }

    displayWeatherData() {
        if (!this.weatherData) return;

        const { current, forecast } = this.weatherData;

        // Update current weather
        document.getElementById('cityName').textContent = current.location.name;
        document.getElementById('country').textContent = `${current.location.region}, ${current.location.country}`;
        
        // Handle temperature display based on current unit
        const currentTemp = this.currentUnit === 'C' ? current.current.temp_c : current.current.temp_f;
        const feelsLikeTemp = this.currentUnit === 'C' ? current.current.feelslike_c : current.current.feelslike_f;

        document.getElementById('currentTemp').textContent = Math.round(currentTemp);
        document.getElementById('feelsLike').textContent = `Feels like ${Math.round(feelsLikeTemp)}°`;
        document.getElementById('feelsLikeTemp').textContent = `${Math.round(feelsLikeTemp)}°`;
        document.getElementById('weatherDesc').textContent = current.current.condition.text;
        document.getElementById('humidity').textContent = `${current.current.humidity}%`;
        document.getElementById('windSpeed').textContent = `${Math.round(current.current.wind_kph)} km/h`;
        document.getElementById('pressure').textContent = `${current.current.pressure_mb} mb`;
        document.getElementById('visibility').textContent = `${current.current.vis_km} km`;
        document.getElementById('uvIndex').textContent = current.current.uv;
        document.getElementById('cloudCover').textContent = `${current.current.cloud}%`;
        document.getElementById('precipitation').textContent = `${current.current.precip_mm} mm`;

        // --- START DYNAMIC BACKGROUND LOGIC ---
        const conditionText = current.current.condition.text;
        const weatherCategory = getWeatherCategory(conditionText);

        // 1. Apply the new data-weather attribute to the body for CSS changes
        document.body.setAttribute('data-weather', weatherCategory);

        // 2. Control Rain Drops
        toggleRain(weatherCategory === 'rain');
        
        // 3. Control Cloud Visibility (Hide existing floating clouds if it's clear/sunny)
        const cloudLayer = document.querySelector('.cloud-layer');
        if (weatherCategory === 'clear' || weatherCategory === 'sunny') {
             cloudLayer.style.opacity = 0;
        } else {
             cloudLayer.style.opacity = 0.6;
        }
        // --- END DYNAMIC BACKGROUND LOGIC ---

        
        const rainMap = document.getElementById('rainMap');
        // NOTE: The URL is set in HTML, but here's how you'd update it dynamically if needed:
        // rainMap.src = `https://embed.windy.com/embed2.html?lat=${current.location.lat}&lon=${current.location.lon}&zoom=8&overlay=rain&product=radar&menu=false`;


        const phase = forecast.forecast.forecastday[0].astro.moon_phase;
        const illum = forecast.forecast.forecastday[0].astro.moon_illumination;
        document.getElementById('moonIllum').textContent = `${illum}%`;
        document.getElementById('moonSet').textContent = forecast.forecast.forecastday[0].astro.moonset;

        const fullDates = ['2025-11-05','2025-12-04','2026-01-03'];
        const next = fullDates.find(d => new Date(d) > new Date());
        const daysUntil = next ? Math.ceil((new Date(next) - new Date()) / 86400000) : '—';
        document.getElementById('nextFull').textContent = next ? `${daysUntil} days` : '—';

        const now = new Date();
        const hour = String(now.getHours()).padStart(4,'0');
        const nasaUrl = `https://svs.gsfc.nasa.gov/vis/a000000/a005415/frames/1800x1800_1x1_30p/moon.${hour}.jpg`;

        const moonImg = document.getElementById('moonImg');
        const moonEmoji = document.getElementById('moonEmoji');
        
        // 1. Reset display states
        moonImg.style.display = 'block';
        moonEmoji.style.display = 'none';

        // 2. Set the image source
        moonImg.src = nasaUrl;

        // 3. Set up the error handler
        moonImg.onerror = () => {
          // NASA blocked or failed to load → show emoji fallback
          moonImg.style.display = 'none';
          moonEmoji.textContent = phaseEmoji(phase); // Use the correct phase
          moonEmoji.style.display = 'block';
        };

        // Update weather icon
        const emoji = condToEmoji(current.current.condition.text);
        document.getElementById('weatherEmoji').textContent = emoji;
        
        // Update sun times
        document.getElementById('sunrise').textContent = forecast.forecast.forecastday[0].astro.sunrise;
        document.getElementById('sunset').textContent = forecast.forecast.forecastday[0].astro.sunset;

        // Update wind details
        document.getElementById('windDirection').textContent = current.current.wind_dir;
        document.getElementById('windGust').textContent = current.current.gust_kph ? `${Math.round(current.current.gust_kph)} km/h` : 'N/A';

        // Display hourly forecast
        this.displayHourlyForecast(forecast);

        // Display weekly forecast
        this.displayWeeklyForecast(forecast);

        // Add fade-in animations
        document.querySelectorAll('.weather-card, .hourly-item, .weekly-item, .info-card').forEach(element => {
            element.classList.add('fade-in');
        });
    }

    getWeatherIcon(iconCode) {
        // WeatherAPI.com icon mapping to Font Awesome icons
        const iconMap = {
            '1000': 'fa-sun',           // Sunny
            '1003': 'fa-cloud-sun',     // Partly cloudy
            '1006': 'fa-cloud',         // Cloudy
            '1009': 'fa-cloud',         // Overcast
            '1030': 'fa-smog',          // Mist
            '1063': 'fa-cloud-rain',    // Patchy rain possible
            '1066': 'fa-snowflake',     // Patchy snow possible
            '1069': 'fa-cloud-rain',    // Patchy sleet possible
            '1072': 'fa-cloud-rain',    // Patchy freezing drizzle possible
            '1087': 'fa-bolt',          // Thundery outbreaks possible
            '1114': 'fa-snowflake',     // Blowing snow
            '1117': 'fa-snowflake',     // Blizzard
            '1135': 'fa-smog',          // Fog
            '1147': 'fa-smog',          // Freezing fog
            '1150': 'fa-cloud-rain',    // Patchy light drizzle
            '1153': 'fa-cloud-rain',    // Light drizzle
            '1168': 'fa-cloud-rain',    // Freezing drizzle
            '1171': 'fa-cloud-rain',    // Heavy freezing drizzle
            '1180': 'fa-cloud-rain',    // Patchy light rain
            '1183': 'fa-cloud-rain',    // Light rain
            '1186': 'fa-cloud-rain',    // Moderate rain at times
            '1189': 'fa-cloud-rain',    // Moderate rain
            '1192': 'fa-cloud-rain',    // Heavy rain at times
            '1195': 'fa-cloud-rain',    // Heavy rain
            '1198': 'fa-cloud-rain',    // Light freezing rain
            '1201': 'fa-cloud-rain',    // Moderate or heavy freezing rain
            '1204': 'fa-cloud-rain',    // Light sleet
            '1207': 'fa-cloud-rain',    // Moderate or heavy sleet
            '1210': 'fa-snowflake',     // Patchy light snow
            '1213': 'fa-snowflake',     // Light snow
            '1216': 'fa-snowflake',     // Patchy moderate snow
            '1219': 'fa-snowflake',     // Moderate snow
            '1222': 'fa-snowflake',     // Patchy heavy snow
            '1225': 'fa-snowflake',     // Heavy snow
            '1237': 'fa-snowflake',     // Ice pellets
            '1240': 'fa-cloud-rain',    // Light rain shower
            '1243': 'fa-cloud-rain',    // Moderate or heavy rain shower
            '1246': 'fa-cloud-rain',    // Torrential rain shower
            '1249': 'fa-cloud-rain',    // Light sleet showers
            '1252': 'fa-cloud-rain',    // Moderate or heavy sleet showers
            '1255': 'fa-snowflake',     // Light snow showers
            '1258': 'fa-snowflake',     // Moderate or heavy snow showers
            '1261': 'fa-snowflake',     // Light showers of ice pellets
            '1264': 'fa-snowflake',     // Moderate or heavy showers of ice pellets
            '1273': 'fa-bolt',          // Patchy light rain with thunder
            '1276': 'fa-bolt',          // Moderate or heavy rain with thunder
            '1279': 'fa-bolt',          // Patchy light snow with thunder
            '1282': 'fa-bolt'           // Moderate or heavy snow with thunder
        };
        
        return iconMap[iconCode] || 'fa-cloud';
    }

    displayHourlyForecast(forecast) {
        const container = document.getElementById('hourlyContainer');
        container.innerHTML = '';

        // Get next 24 hours from the first day
        const hourlyData = forecast.forecast.forecastday[0].hour.slice(0, 24);
        
        hourlyData.forEach((hour, index) => {
            if (index % 2 === 0) { // Show every 2 hours to avoid overcrowding
                const time = new Date(hour.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                // Use the correct temperature unit
                const temp = this.currentUnit === 'C' ? Math.round(hour.temp_c) : Math.round(hour.temp_f);
                const iconCode = hour.condition.code;
                
                const hourlyItem = document.createElement('div');
                hourlyItem.className = 'hourly-item slide-in';
               // NEW emoji render
                const emoji=condToEmoji(hour.condition.text);
                hourlyItem.innerHTML=`
                  <div class="time">${time}</div>
                  <div class="emoji">${emoji}</div>
                  <div class="temp">${temp}°</div>
                `;
                
                container.appendChild(hourlyItem);
            }
        });
    }

    displayWeeklyForecast(forecast) {
        const container = document.getElementById('weeklyContainer');
        container.innerHTML = '';

        const dailyData = forecast.forecast.forecastday;
        
        dailyData.forEach(day => {
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            // Use the correct temperature unit
            const maxTemp = this.currentUnit === 'C' ? Math.round(day.day.maxtemp_c) : Math.round(day.day.maxtemp_f);
            const minTemp = this.currentUnit === 'C' ? Math.round(day.day.mintemp_c) : Math.round(day.day.mintemp_f);
            const iconCode = day.day.condition.code;
            
            const dailyItem = document.createElement('div');
            dailyItem.className = 'weekly-item slide-in';
            const emoji = condToEmoji(day.day.condition.text);
            dailyItem.innerHTML = `
              <div class="day">${dayName}</div>
              <div class="emoji" style="font-size:2.4rem;">${emoji}</div>
              <div class="temp">${maxTemp}°/${minTemp}°</div>
            `;
            
            container.appendChild(dailyItem);
        });
    }

    toggleTempUnit() {
        this.currentUnit = this.currentUnit === 'C' ? 'F' : 'C';
        document.getElementById('tempUnit').textContent = `°${this.currentUnit}`;
        
        if (this.weatherData) {
            this.displayWeatherData();
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        loading.classList.toggle('active', show);
    }

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        errorText.textContent = message;
        errorMessage.classList.add('active');
        
        setTimeout(() => {
            errorMessage.classList.remove('active');
        }, 5000);
    }

    retryLastRequest() {
        document.getElementById('errorMessage').classList.remove('active');
        if (this.currentLocation) {
            this.fetchWeatherData(this.currentLocation);
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});


// convert WeatherAPI condition text → emoji
function condToEmoji(cond){
  const map={
    "Sunny":"☀️","Clear":"🌙","Partly cloudy":"⛅","Cloudy":"☁️","Overcast":"☁️",
    "Mist":"🌫️","Patchy rain possible":"🌦️","Light rain":"🌦️","Moderate rain":"🌧️",
    "Heavy rain":"⛈️","Thundery outbreaks possible":"⛈️","Patchy snow possible":"🌨️",
    "Light snow":"🌨️","Heavy snow":"❄️","Fog":"🌫️"
  };
  return map[cond]||"☁️";   // ← fallback is now a cloud
}

/* ---------- STARFIELD ---------- */
function createStars(){
  const stars=document.createElement('div');
  stars.className='stars';
  for(let i=0;i<120;i++){
    const s=document.createElement('div');
    s.className='star';
    s.style.left=`${Math.random()*100}vw`;
    s.style.top=`${Math.random()*100}vh`;
    s.style.animationDelay=`${Math.random()*4}s`;
    s.style.animationDuration=`${3+Math.random()*3}s`;
    stars.appendChild(s);
  }
  document.body.appendChild(stars);
}
createStars();


/* ---------- MOON ---------- */
const moon=document.createElement('div');
moon.className='moon';
document.body.appendChild(moon);


/* ---------- SUN ---------- */
const sun=document.createElement('div');
sun.className='sun';
document.body.appendChild(sun);


function phaseEmoji(phase){
  const map={
    "New Moon":"🌑","Waxing Crescent":"🌒","First Quarter":"🌓",
    "Waxing Gibbous":"🌔","Full Moon":"🌕","Waning Gibbous":"🌖",
    "Last Quarter":"🌗","Waning Crescent":"🌘"
  };
  return map[phase]||"🌕";
}