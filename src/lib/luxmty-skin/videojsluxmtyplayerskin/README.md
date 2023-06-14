# videojs-luxmty-player-skin
@EmilioSG11/videojs-luxmty-player-skin <br>
@Version - 2.0.0 <br>
@Copyright (c) 2023 Emilio Salas <br>
@Designed By EmilioSG <br>
(emiliosalasgzz@gmail.com), <br>
<https://www.github.com/EmilioSG11/> <br>
<https://ko-fi.com/emiliosg11>
<br>

# How Play video file?
In index.html inside src. <br>
---Player---- <br>
div class="player-container" <br>
video-js id="video-player" <br> 
class="vjs-luxmty vjs-16-9" poster=""> <br>
source src="HERE" type="" <br>
video-js

# How add title, description, logo?
In dist/video-player.js add/change title, description, logo, plugins settings, etc. <br>
Also you can add or change player settings

# How add custom error display image?
In src/scss/base/options<br>
Or first root in css code dist/vjs-luxmty.css

# Formats video types
• mp4: 'video/mp4' <br>
• mov: 'video/mp4' <br>
• m4v: 'video/mp4' <br>
• m3u8: 'application/x-mpegURL' <br>
• mkv: 'video/x-matroska' <br>
• mpd: 'application/dash+xml' <br>
• webm: 'video/webm' <br>
• youtube: 'video/youtube'

# Layout
Layout partial in scss is the adaptive("responsive") design section. <br>
 
# Reference - Page Links 
Videojs homepage: <br>
<https://www.videojs.com/> <br>
Minfier Css Js: <br>
<https://www.minifier.org/> <br>
Analiyzer Css: <br>
<https://www.projectwallace.com/css-code-quality> <br>
Encycolorpedia: <br>
<https://encycolorpedia.com/> <br>
Create text svg logo: <br>
<https://fontsvg.com/>

# Important YT Overlay Block Redirect Note
If you change the video player id <br>
go to dist/yt-overlay/yt-overlay.js and change the <br> 
video-player getelementbyid for your new id. <br> 
