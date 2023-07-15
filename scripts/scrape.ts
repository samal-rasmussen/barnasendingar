import { writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import prettier from 'prettier';
import type { Show, Episode } from './shared-types';
import * as CliProgress from 'cli-progress';

type PartialEpisode = Omit<Episode, 'mediaId'>;
type PartialShow = Omit<Show, 'episodes'> & { episodes: PartialEpisode[] };

const progressFormat = 'progress {bar} {percentage}% | ETA: {eta}s | {value}/{total} {title}';
const collator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base',
});
const urlPrefix = 'https://kvf.fo';
const regex = new RegExp(`(var media = ')(.+)';`);
let episodesCount = 0;
let currentEpisode = 0;

function pretty(html: string): string {
	return prettier.format(html, { parser: 'html' });
}

function parseEpisodeElement(el: HTMLElement): PartialEpisode {
	if (el.children.length === 0) {
		return;
	}
	// console.log(pretty(el.innerHTML));

	const img = el.querySelector('img') as HTMLImageElement;
	const a = el.querySelector('.views-field-title a') as HTMLAnchorElement;
	const seasonNumberElement = el.querySelector(
		'.views-field-field-n-season .field-content',
	) as HTMLElement;
	const episodeNumberElement = el.querySelector(
		'.views-field-field-ra-tal .field-content',
	) as HTMLElement;
	const episodeNumber =
		episodeNumberElement != null ? Number(episodeNumberElement.textContent) : null;
	const seasonNumber = seasonNumberElement != null ? Number(seasonNumberElement.textContent) : null;
	const id = a.href.split('/vit/sjonvarp/')[1];
	const url = urlPrefix + a.href;
	const title = a.textContent ?? '';

	const episode: PartialEpisode = {
		episodeNumber,
		id,
		img: img.src,
		seasonNumber,
		sortKey: `s: ${seasonNumber} e: ${episodeNumber} id: ${id}`,
		title,
		url,
	};

	return episode;
}

async function scrapeEpisode(episode: PartialEpisode): Promise<{ mediaId: string } | undefined> {
	currentEpisode += 1;

	const episodePage = await fetch(episode.url);
	const episodePageHtml = await episodePage.text();

	const result = regex.exec(episodePageHtml);
	const mediaId = result?.[2];

	// const showPage = await fetch(episode.url);
	// const showPageHtml = await showPage.text();
	// console.log(showPageHtml);
	return { mediaId };
}

async function scrapeShow(showUrl: string): Promise<PartialEpisode[]> {
	const showResult = await fetch(showUrl);
	const showHtml = await showResult.text();
	const showDom = new JSDOM(showHtml);
	// console.log(showHtml);

	const episodes: PartialEpisode[] = [];
	const cells = showDom.window.document.querySelectorAll('td');
	for (let i = 0; i < cells.length; i++) {
		const e = cells[i];
		const episode = parseEpisodeElement(e);
		if (episode != null) {
			episodes.push(episode);
		}
	}

	return episodes.sort((a, b) => collator.compare(a.sortKey, b.sortKey));
}

async function run() {
	const showsResult = await fetch('https://kvf.fo/vit/sjonvarp/sendingar');
	const showsHtml = await showsResult.text();
	const showsDom = new JSDOM(showsHtml);

	const partialShows: PartialShow[] = [];
	showsDom.window.document.querySelectorAll('.view-content .views-row').forEach((el) => {
		const img = el.querySelector('img') as HTMLImageElement;
		const a = el.querySelector('.views-field-title a') as HTMLAnchorElement;
		const show: Show = {
			img: img.src,
			title: a.textContent ?? '',
			url: urlPrefix + a.href,
			episodes: [],
		};
		// console.log(show.title, show.url);
		partialShows.push(show);
	});

	partialShows.sort((a, b) => collator.compare(a.title, b.title));

	// const show = shows[1];
	// const episodes = await parseShow(show.url);
	// show.episodes = episodes;

	console.log(`Scraping shows`);
	const bar1 = new CliProgress.SingleBar(
		{
			format: progressFormat,
		},
		CliProgress.Presets.shades_classic,
	);
	bar1.start(partialShows.length, 0);
	for await (const [index, show] of partialShows.entries()) {
		// console.log(`Scraping show: ${index + 1} of ${partialShows.length} ${show.title}`);
		const episodes = await scrapeShow(show.url);
		bar1.update(index + 1, { title: show.title });
		show.episodes = episodes;
		episodesCount += show.episodes.length;
	}
	bar1.stop();

	const shows: Show[] = [];
	console.log(`Scraping episodes`);
	const bar2 = new CliProgress.SingleBar(
		{
			format: progressFormat,
		},
		CliProgress.Presets.shades_classic,
	);
	bar2.start(episodesCount, 0);
	for await (const partialShow of partialShows) {
		const episodes: Episode[] = [];
		for await (const [index, partialEpisode] of partialShow.episodes.entries()) {
			const { mediaId } = await scrapeEpisode(partialEpisode);
			bar2.update(currentEpisode, {
				title: `${partialShow.title} s${partialEpisode.seasonNumber} e${partialEpisode.episodeNumber} ${partialEpisode.title}}`,
			});
			const episode: Episode = {
				episodeNumber: partialEpisode.episodeNumber,
				id: partialEpisode.id,
				img: partialEpisode.img,
				mediaId,
				seasonNumber: partialEpisode.seasonNumber,
				sortKey: partialEpisode.sortKey,
				title: partialEpisode.title,
				url: partialEpisode.url,
			};
			episodes[index] = episode;
		}
		const show: Show = {
			...partialShow,
			episodes,
		};
		shows.push(show);
	}

	bar2.stop();
	// console.log(JSON.stringify(shows));
	writeFileSync('src/lib/assets/shows.json', JSON.stringify(shows, null, 2));
}

run();
