<script lang="ts">
  import type { Episode, Show } from '../scripts/shared-types.js';
  import { Parser } from 'm3u8-parser';
  import videojsImport, { type VideoJsPlayer } from 'video.js';
  import { onDestroy, onMount } from 'svelte';
  import 'video.js/dist/video-js.min.css';

  export let show: Show | undefined;
  export let episode: Episode | undefined;

  const videojs = videojsImport as any as typeof videojsImport.default;
  const m3u8Parser = new Parser();

  function parseManifest(manifest: string) {
    m3u8Parser.push(manifest);
    m3u8Parser.end();
    var parsedManifest = m3u8Parser.manifest;
    return parsedManifest;
  }

  let playlist: string | undefined;
  let player: VideoJsPlayer | undefined;

  onMount(async () => {
    const manifestUrl = `https://play.kringvarp.fo/redirect/video/_definst_/smil:${episode?.mediaId}.smil?type=m3u8`;
    const manifestResponse = await fetch(manifestUrl);
    const manifest = await manifestResponse.text();
    const parsed = parseManifest(manifest);
    playlist = parsed.playlists[0].uri;
    setTimeout(() => {
      player = videojs('barnasendingar-video-player', {
        controls: true,
        // preload: 'auto',
        autoplay: false,
        fill: true,
      });
      player.ready(function onPlayerReady() {
        videojs.log('Your player is ready!');
        this.play();
        this.on('ended', function () {
          videojs.log('Awww...over so soon?!');
        });
      });
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
      <h3>{show?.title} - {episode?.title}</h3>
      <p>Sesong: {episode?.seasonNumber} Partur: {episode?.episodeNumber}</p>
    </div>
    <!-- svelte-ignore a11y-media-has-caption -->
    {#if playlist != null}
      <video-js id="barnasendingar-video-player" class="video-js">
        <source src={playlist} type="application/x-mpegURL" />
      </video-js>
    {/if}
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
