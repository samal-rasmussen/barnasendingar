<script lang="ts">
  import shows from './assets/shows.json';
  import { pattern, path, goto, back } from 'svelte-pathfinder';
  import type { Episode, Show } from '../scripts/shared-types.js';
  import Player from './Player.svelte';

  $: showPlayer = $pattern('/sending/:showTitle/partur/:episodeTitle');

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

  function getEpisodes(): Episode[] {
    const show = getShow();
    if (typeof $path.params.episodeTitle !== 'string') {
      throw new Error('episodeTitle had incorrect type');
    }
    const title = $path.params.episodeTitle;
    const index = show.episodes.findIndex(
      (e) => e.title === decodeURIComponent(title),
    );
    return show.episodes.slice(index);
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
        <img src={show.img} alt="Sending" />
      </div>
    {/each}
  </div>
</main>

{#if showPlayer}
  {@const episodes = getEpisodes()}
  {@const show = getShow()}
  <modal style="z-index: 99">
    <Player {episodes} {show} />
  </modal>
{/if}

{#if $pattern('/sending/:showTitle')}
  <modal>
    <div class="episodes">
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
    </div>
  </modal>
{/if}

<style>
  main {
    padding-left: 2em;
  }

  .shows {
    white-space: pre;
    text-align: left;
    display: flex;
    flex-wrap: wrap;
    padding: 0 0 2em 0;
    box-sizing: border-box;
  }
  .show {
    display: flex;
    flex-direction: column;
    padding-right: 2em;
    width: 300px;
  }
  .show img {
    width: 300px;
    height: 168.783px;
  }
  .show h2 {
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 8px;
  }

  .episodes {
    padding-bottom: 2em;
  }

  .episode {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 2em;
  }
  .episode h3 {
    margin: 0;
  }
  .episode p {
    margin-top: 0px;
    margin-bottom: 4px;
  }
  .episode img {
    width: 300px;
    height: 168.783px;
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

  @media only screen and (max-width: 696px) {
    h1 {
      font-size: 2.6em;
    }
    h2 {
      font-size: 1.3em;
    }

    .shows {
      flex-wrap: nowrap;
      flex-direction: column;
      align-items: center;
      width: 100%;
      padding: 0;
    }
    .show {
      padding: 0;
    }
    .show img {
      width: 100%;
    }
  }
</style>
