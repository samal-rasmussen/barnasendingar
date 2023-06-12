import { writeFileSync, mkdirSync } from 'fs';
import { JSDOM } from 'jsdom';
import prettier from 'prettier';
import type { Show, Episode } from './shared-types';

var collator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base',
});
const urlPrefix = 'https://kvf.fo';
const regex = new RegExp(`(var media = ')(.+)';`);

function pretty(html: string): string {
	return prettier.format(html, { parser: 'html' });
}

async function parseEpisode(el, i): Promise<Episode | undefined> {
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

	const episodePage = await fetch(url);
	const episodePageHtml = await episodePage.text();

	const result = regex.exec(episodePageHtml);
	const mediaId = result?.[2];

	const episode: Episode = {
		episodeNumber,
		id,
		img: img.src,
		mediaId,
		seasonNumber,
		sortKey: `s: ${seasonNumber} e: ${episodeNumber} id: ${id}`,
		title: a.textContent ?? '',
		url,
	};

	// const showPage = await fetch(episode.url);
	// const showPageHtml = await showPage.text();
	// console.log(showPageHtml);
	return episode;
}

async function parseShow(showUrl: string): Promise<Episode[]> {
	const showResult = await fetch(showUrl);
	const showHtml = await showResult.text();
	const showDom = new JSDOM(showHtml);
	// console.log(showHtml);

	const episodes: Episode[] = [];
	const cells = showDom.window.document.querySelectorAll('td');
	for (let i = 0; i < cells.length; i++) {
		const e = cells[i];
		const episode = await parseEpisode(e, i);
		console.log(episode?.sortKey);
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

	const shows: Show[] = [];
	showsDom.window.document.querySelectorAll('.view-content .views-row').forEach((el) => {
		const img = el.querySelector('img') as HTMLImageElement;
		const a = el.querySelector('.views-field-title a') as HTMLAnchorElement;
		const show: Show = {
			img: img.src,
			title: a.textContent ?? '',
			url: urlPrefix + a.href,
			episodes: [],
		};
		console.log(show.title, show.url);
		shows.push(show);
	});

	shows.sort((a, b) => collator.compare(a.title, b.title));

	// const show = shows[1];
	// const episodes = await parseShow(show.url);
	// show.episodes = episodes;

	for await (const show of shows) {
		console.log(show.title);
		const episodes = await parseShow(show.url);
		show.episodes = episodes;
	}

	console.log(JSON.stringify(shows));
	writeFileSync('src/lib/assets/shows.json', JSON.stringify(shows, null, 2));
}

run();
