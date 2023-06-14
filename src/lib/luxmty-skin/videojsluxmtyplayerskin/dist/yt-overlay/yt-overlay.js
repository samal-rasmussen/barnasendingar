/*---YT OVERLAY BLOCK REDIRECTS---*/
window.addEventListener("load", function() {

  var vjsplayer = document.getElementById('video-player_youtube_api');
  var overlay = document.createElement("div");
  overlay.id = 'overlay';
  overlay.style.position = 'absolute';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'transparent';
  overlay.style.top = '0px';
  overlay.style.left = '0px';

  vjsplayer.parentNode.insertBefore(overlay, vjsplayer.nextSibling);
});