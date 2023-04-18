<script lang="ts">
  import { back, goto, path, pattern, redirect } from 'svelte-pathfinder';
  import type { Episode, Show } from '../scripts/shared-types.js';
  import videojsImport, { type VideoJsPlayer } from 'video.js';
  import { onDestroy, onMount } from 'svelte';
  import 'video.js/dist/video-js.min.css';

  export let show: Show | undefined;
  export let episodes: Episode[] | undefined;

  const videojs = videojsImport as any as typeof videojsImport.default;

  let currentIndex = 0;
  let current: Episode | undefined;

  function onEpisodesChange(episodes: Episode[]) {
    current = episodes?.[currentIndex];
  }

  function onCurrentIndexChange(currentIndex: number) {
    if (episodes != null) {
      current = episodes[currentIndex];
    }
  }

  function getShowFromParams() {
    const params = $pattern('sending/:showTitle/partur/:episodeTitle');
    if (typeof params?.episodeTitle !== 'string') {
      throw new Error('episodeTitle had incorrect type');
    }
    if (typeof params?.showTitle !== 'string') {
      throw new Error('showTitle had incorrect type');
    }
    return params.showTitle;
  }

  function onCurrentChange(current: Episode) {
    const showTitle = getShowFromParams();
    redirect(`sending/${showTitle}/partur/${current.title}`);
    const playlist = `https://play.kringvarp.fo/redirect/video/_definst_/smil:${current?.mediaId}.smil?type=m3u8`;
    setTimeout(() => {
      player?.src([
        {
          type: 'application/x-mpegURL',
          src: playlist,
        },
      ]);
      player?.play();
    });
  }

  $: {
    if (episodes != null) {
      onEpisodesChange(episodes);
    }
  }

  $: {
    onCurrentIndexChange(currentIndex);
  }

  $: {
    if (current != null) {
      onCurrentChange(current);
    }
  }

  let player: VideoJsPlayer | undefined;

  onMount(async () => {
    player = videojs('barnasendingar-video-player', {
      controls: true,
      // preload: 'auto',
      autoplay: false,
      fill: true,
    });
    player.ready(function onPlayerReady() {
      this.play();
    });
    player.on('ended', function () {
      if (episodes != null && currentIndex < episodes.length - 1) {
        currentIndex++;
      }
    });
    player.requestFullscreen();
    player.on('fullscreenchange', function () {
      if (player?.isFullscreen() === false && show != null) {
        const url = `sending/${show.title}`;
        console.log(
          'banana exit fullscreen',
          player?.isFullscreen(),
          $path.toString(),
        );
        back(url);
      }
    });
  });

  onDestroy(() => {
    console.log('player onDestroy');
    player?.pause();
    player?.dispose();
  });
</script>

<div class="episode">
  <div>
    <div class="header">
      <h3>{show?.title} - {current?.title}</h3>
      <p>Sesong: {current?.seasonNumber} Partur: {current?.episodeNumber}</p>
    </div>
    <!-- svelte-ignore a11y-media-has-caption -->
    <video-js id="barnasendingar-video-player" class="video-js" />
  </div>
</div>

<style>
  .episode {
    display: flex;
    justify-content: center;
    flex-direction: column;
    height: 100%;
  }
  .episode > div {
    max-height: 100%;
  }
  .header {
    display: flex;
    justify-content: center;
    gap: 48px;
    height: 5vh;
  }
  .header p {
    line-height: 2rem;
  }
  .episode video-js {
    background-color: initial;
    height: 95vh;
  }
  .episode video-js :global(.vjs-big-play-button) {
    left: 50%;
    top: 50%;
    margin-left: calc(1.5em / -2);
    margin-top: calc(1.63332em / -2);
  }
</style>
