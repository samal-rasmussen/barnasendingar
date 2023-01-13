<script lang="ts">
  import shows from './assets/shows.json';
  import { pattern, path, goto, back } from 'svelte-pathfinder';
  import type { Show } from '../scripts/shared-types.js';
  import Episode from './Episode.svelte';

  function gotoShow(showTitle: string) {
    goto(`sending/${showTitle}`);
  }

  function playEpisode(episodeTitle: string) {
    console.log('banana');
    goto(`sending/${$path.params.showTitle}/partur/${episodeTitle}`);
  }

  const titleToShow = {} as Record<string, Show>;
  for (const show of shows) {
    titleToShow[encodeURIComponent(show.title)] = show;
  }

  function getShow() {
    if (typeof $path.params.showTitle !== 'string') {
      throw new Error('showTitle had incorrect type');
    }
    return titleToShow[$path.params.showTitle];
  }

  function getEpisode() {
    const show = getShow();
    if (typeof $path.params.episodeTitle !== 'string') {
      throw new Error('episodeTitle had incorrect type');
    }
    const title = $path.params.episodeTitle;
    return show.episodes.find((e) => e.title === decodeURIComponent(title));
  }
</script>

<main>
  <h1>Barnasendingar</h1>
  <div class="shows">
    {#each shows as show}
      <div
        class="show"
        on:click={() => gotoShow(show.title)}
        on:keypress={() => gotoShow(show.title)}
      >
        <h2>{show.title}</h2>
        <img src={show.img} width="500" alt="Sending" />
      </div>
    {/each}
  </div>
</main>

{#if $pattern('/sending/:showTitle/partur/:episodeTitle')}
  {@const episode = getEpisode()}
  <modal style="z-index: 99">
    <div class="episode">
      <h3>{episode?.title}</h3>
      <p>Sesong: {episode?.seasonNumber} Partur: {episode?.episodeNumber}</p>
      <Episode {episode} />
    </div>
  </modal>
{/if}

{#if $pattern('/sending/:showTitle')}
  <modal>
    {#each getShow().episodes as episode}
      <div
        class="episode"
        on:click={() => playEpisode(episode.title)}
        on:keypress={() => playEpisode(episode.title)}
      >
        <h3>{episode.title}</h3>
        <p>Sesong: {episode.seasonNumber} Partur: {episode.episodeNumber}</p>
        <img src={episode.img} alt="Partur" />
      </div>
    {/each}
  </modal>
{/if}

<style>
  .shows {
    white-space: pre;
    text-align: left;
  }

  modal {
    position: fixed;
    width: 100vw;
    height: 100vh;
    top: 0;
    left: 0;
    background-color: #1a1a1a;
    overscroll-behavior: none;
    overflow: scroll;
  }
</style>
