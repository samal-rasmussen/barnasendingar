import { writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import PQueue from 'p-queue';
import prettier from 'prettier';
import type { Show, Episode } from './shared-types';
import * as CliProgress from 'cli-progress';

type PartialEpisode = Omit<Episode, 'mediaId'>;
type PartialShow = Omit<Show, 'episodes'> & { episodes: PartialEpisode[] };

const collator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base',
});
const urlPrefix = 'https://kvf.fo';
const regex = new RegExp(`(var media = ')(.+)';`);
let episodesCount = 0;

function pretty(html: string): string {
	return prettier.format(html, { parser: 'html' });
}

async function fetchHtml(url: string): Promise<string> {
	try {
		const response = await fetch(url);
		const html = await response.text();
		return html;
	} catch (error) {
		console.error(`Failed to fetch HTML from ${url}`, error);
		throw error;
	}
}

function progressBar() {
	return new CliProgress.SingleBar(
		{
			format: 'progress {bar} {percentage}% | ETA: {eta}s | {value}/{total} {title}',
		},
		CliProgress.Presets.shades_classic,
	);
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
	const episodeHtml = await fetchHtml(episode.url);
	const result = regex.exec(episodeHtml);
	const mediaId = result?.[2];

	// const showPage = await fetch(episode.url);
	// const showPageHtml = await showPage.text();
	// console.log(showPageHtml);
	return { mediaId };
}

async function scrapeShow(showUrl: string): Promise<PartialEpisode[]> {
	const showHtml = await fetchHtml(showUrl);
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

async function scrapeShowsList(): Promise<PartialShow[]> {
	const showsHtml = await fetchHtml('https://kvf.fo/vit/sjonvarp/sendingar');
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
		partialShows.push(show);
	});

	partialShows.sort((a, b) => collator.compare(a.title, b.title));
	return partialShows;
}

async function run() {
	const partialShows = await scrapeShowsList();

	console.log(`Scraping shows`);
	const bar1 = progressBar();
	bar1.start(partialShows.length, 0);
	const showPromises: Array<() => Promise<void>> = [];
	let showCount = 0;
	for (const show of partialShows) {
		showPromises.push(async () => {
			const episodes = await scrapeShow(show.url);
			bar1.update(++showCount, { title: show.title });
			show.episodes = episodes;
			episodesCount += show.episodes.length;
		});
	}
	const showQueue = new PQueue({ concurrency: 6 });
	await showQueue.addAll(showPromises);
	bar1.stop();

	console.log(`Scraping episodes`);
	const bar2 = progressBar();
	bar2.start(episodesCount, 0);
	const episodePromises: Array<() => Promise<void>> = [];
	const showsMap = new Map<string, Episode[]>();
	partialShows.forEach((show) => showsMap.set(show.title, []));
	let currentEpisode = 0;
	for (const partialShow of partialShows) {
		for (const [index, partialEpisode] of Array.from(partialShow.episodes.entries())) {
			episodePromises.push(async () => {
				const { mediaId } = await scrapeEpisode(partialEpisode);
				bar2.update(++currentEpisode, {
					title: `${partialShow.title} s${partialEpisode.seasonNumber} e${partialEpisode.episodeNumber} ${partialEpisode.title}`,
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
				showsMap.get(partialShow.title)[index] = episode;
			});
		}
	}
	const episodesQueue = new PQueue({ concurrency: 25 });
	await episodesQueue.addAll(episodePromises);
	const shows: Show[] = [];
	partialShows.forEach((partialShow) => {
		const episodes = showsMap.get(partialShow.title);
		const show: Show = {
			...partialShow,
			episodes,
		};
		shows.push(show);
	});

	bar2.stop();
	// console.log(JSON.stringify(shows));
	writeFileSync('src/lib/assets/shows.json', JSON.stringify(shows, null, 2));
}

run();
