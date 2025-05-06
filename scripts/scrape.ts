import { writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import PQueue from 'p-queue';
import * as prettier from 'prettier';
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

async function pretty(html: string): Promise<string> {
	return await prettier.format(html, { parser: 'html' });
}

async function fetchHtml(url: string): Promise<string> {
	try {
		const response = await fetch(url, {
			redirect: 'manual', // Prevent automatic redirects
		});
		if (response.status === 301 || response.status === 302) {
			// Handle redirect manually
			const redirectLocation = response.headers.get('location');
			if (redirectLocation == null) {
				throw new Error(`No redirect location found for ${url}`);
			}
			const redirectUrl = urlPrefix + redirectLocation;
			const redirect_response = await fetch(redirectUrl);
			const html = await redirect_response.text();
			return html;
		}
		const html = await response.text();
		// console.log('writing html to console');
		// console.log(html);
		return html;
	} catch (error) {
		console.error(`Failed to fetch HTML from ${url}`, error);
		throw error;
	}
}

function progressBar() {
	return new CliProgress.SingleBar(
		{
			etaBuffer: 90,
			format: 'progress {bar} {percentage}% | ETA: {eta}s | {value}/{total} {title}',
			fps: 5,
		},
		CliProgress.Presets.shades_classic,
	);
}

function parseEpisodeElement(el: HTMLElement): PartialEpisode {
	// console.log('parseEpisodeElement', el.innerHTML);
	if (el.children.length === 0) {
		return;
	}
	// console.log(pretty(el.innerHTML));

	const img = el.querySelector('img') as HTMLImageElement;
	const title_a = el.querySelector('.views-field.views-field-title a') as HTMLAnchorElement;
	const url_a = el.querySelector('.views-field.views-field-field-mynd a') as HTMLAnchorElement;
	const publish_span = el.querySelector('.views-field.views-field-field-publish span');
	let id = url_a.href.split('/vit/sjonvarp/')[1];
	// const id = a.href.split('/vit/sending/sv/')[1];
	if (id == null) {
		id = url_a.href.split('/node/')[1];
		if (id == null) {
			throw new Error(`No id found for ${url_a.href}`);
		}
	}
	const url = urlPrefix + url_a.href;
	const title = title_a.textContent ?? '';
	let date = publish_span?.getAttribute('content');
	if (date == null || typeof date !== 'string' || date.trim().length === 0) {
		console.warn(new Error(`No date found`, { cause: { url, title } }));
		// Mash the date with a z char for every char in the date, so that it sorts last
		date = 'zzzzzzzzzzzzzzzzzzzzzzzzz';
	}
	const sortKey = `date: ${date} id: ${id}`;

	const episode: PartialEpisode = {
		date,
		id,
		img: img.src,
		showTitle: title,
		sortKey,
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
	// write showHtml to file
	// writeFileSync('show.html', showHtml);

	const episodes: PartialEpisode[] = [];
	const cells = showDom.window.document.querySelectorAll(
		'.quicktabs-tabpage > .quicktabs-views-group',
	);
	for (let i = 0; i < cells.length; i++) {
		const e = cells[i];
		const episode = parseEpisodeElement(e);
		if (episode != null) {
			episodes.push(episode);
		}
	}

	const nextPage = showDom.window.document.querySelector('li.pager-next a');
	if (nextPage != null) {
		const nextPageUrl = urlPrefix + nextPage.href;
		const nextPageEpisodes = await scrapeShow(nextPageUrl);
		episodes.push(...nextPageEpisodes);
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
		const title = a.textContent ?? '';
		const show: Show = {
			img: img.src,
			title,
			url: urlPrefix + a.href,
			episodes: [],
		};
		// if (title === 'Alt í 1um') {
		// }
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
	for (const show of partialShows) {
		showPromises.push(async () => {
			const episodes = await scrapeShow(show.url);
			bar1.increment({ title: show.title });
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
	for (const partialShow of partialShows) {
		for (const [index, partialEpisode] of Array.from(partialShow.episodes.entries())) {
			episodePromises.push(async () => {
				const { mediaId } = await scrapeEpisode(partialEpisode);
				bar2.increment({
					title: `${partialShow.title} ${partialEpisode.title}`,
				});
				const episode: Episode = {
					date: partialEpisode.date,
					id: partialEpisode.id,
					img: partialEpisode.img,
					mediaId,
					showTitle: partialShow.title,
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
