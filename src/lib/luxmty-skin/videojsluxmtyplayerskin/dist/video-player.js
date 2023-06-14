var player = videojs("video-player", {
  controlBar: {
    children: ['playToggle', 'skipBackward', 'skipForward', 'volumePanel', 'currentTimeDisplay', 'timeDivider', 'durationDisplay', 'progressControl', 'liveDisplay', 'seekToLive', 'remainingTimeDisplay', 'customControlSpacer', 'playbackRateMenuButton', 'chaptersButton', 'descriptionsButton', 'subsCapsButton', 'audioTrackButton', 'hlsQualitySelector', 'ShareButton', 'pictureInPictureToggle', 'fullscreenToggle'],
    skipButtons: {
      forward: 10,
      backward: 10
    },
  },
  preload: "metadata",
  autoplay: "", //for autoplay "muted"
  controls: true,
  responsive: true,
  fluid: true,
  liveui: true,
  preferFullWindow: true,
  playbackRates: [0.1, 0.25, 0.5, 1, 1.5, 2],
  techOrder: ["html5", "youtube"],
  html5: {
    vhs: {
      enableLowInitialPlaylist: true,
      fastQualityChange: true,
      overrideNative: true,
      useDevicePixelRatio: false,
      limitRenditionByPlayerDimensions: false,
    }
  },
});

// Title Bar
player.titleBar.update({
  title: '',
  description: ''
})

/*Scripts i use for automatic get title and description
  title: document.title,
  description: document.querySelector('meta[name="description"]').content*/

//You can change description for meta tag author 
// description: document.querySelector('meta[name="author"]').content


//----------PLUGINS----------//

// Quality Selector Plugin
player.hlsQualitySelector({
  autoPlacement: "bottom",
  displayCurrentQuality: false,
  getCurrentQuality: "auto",
  sortAscending: false,
  vjsIconClass: "vjs-icon-cog"
});

// Logo Plugin
player.logo({
  image: "", //Your Logo Image
  url: "", //URL Redirect when click logo
  fadeDelay: null, //null (always visible) or Milliseconds (1000 = 1 second)
  hideOnReady: false, //true or false
  position: "top-right", //top-left or right, bottom-left or right).
  width: 100,
  height: 0,
  padding: 5,
  opacity: 1,
  offsetH: 0,
  offsetV: 0
});
player.on("useractive", () => {
  player.logo().show();
}); //Show or hide
player.on("playing", () => {
  player.logo().show();
}); //Show or hide

// Mobile UI Plugin
player.mobileUi({
  fullscreen: {
    enterOnRotate: true,
    exitOnRotate: true,
    lockOnRotate: true,
    lockToLandscapeOnEnter: false,
    iOS: false,
    disabled: false
  },
  touchControls: {
    seekSeconds: 10,
    tapTimeout: 300,
    disableOnEnd: false,
    disabled: false,
  }
});

// Context Menu UI Plugin
player.contextmenuUI({
  keepInside: true,
  content: [{
      href: 'https://github.com/EmilioSG11/video.js-luxmty-player-skin',
      label: '© Luxmtyplayer',
  },

    {
      href: '', // Link redirect when click
      label: '', // Company name or whatever you want
  },

    /*{
       // A link with a listener. Its `href` will automatically be
      label: 'Example Link',
      listener: function() {
        alert('you clicked the example link!');
      }
  },*/

    {
      href: '', // link redirect
      label: '', // Whatever you want
   }]
});


// Poster Time Plugin
player.posterTime();

//-----------------------------------------//

