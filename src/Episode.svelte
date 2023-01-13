<script lang="ts">
  import type { Episode, Show } from '../scripts/shared-types.js';
  import { Parser } from 'm3u8-parser';
  import videojsImport, { type VideoJsPlayer } from 'video.js';
  import { onDestroy, onMount, tick } from 'svelte';
  import 'video.js/dist/video-js.min.css';

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
    const manifestUrl = `https://play.kringvarp.fo/redirect/video/_definst_/smil:${episode.mediaId}.smil?type=m3u8`;
    const manifestResponse = await fetch(manifestUrl);
    const manifest = await manifestResponse.text();
    const parsed = parseManifest(manifest);
    playlist = parsed.playlists[0].uri;
    setTimeout(() => {
      player = videojs(
        'barnasendingar-video-player',
        {
          controls: true,
        },
        function onPlayerReady() {
          videojs.log('Your player is ready!');
          this.play();
          this.on('ended', function () {
            videojs.log('Awww...over so soon?!');
          });
        },
      );
    });
  });

  onDestroy(() => {
    console.log('player onDestroy');
    player?.pause();
    player?.dispose();
  });
</script>

<!-- svelte-ignore a11y-media-has-caption -->
{#if playlist != null}
  <video-js
    id="barnasendingar-video-player"
    width="600"
    height="300"
    class="video-js vjs-theme-sea"
    controls
  >
    <source src={playlist} type="application/x-mpegURL" />
  </video-js>
{/if}

<style>
</style>
