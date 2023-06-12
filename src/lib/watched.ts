import type { Episode, Show } from '../../scripts/shared-types';

export function setWatched(show: Show, episode: Episode) {
	const watchedString = localStorage.getItem('watched');
	let watched;
	if (watchedString == null) {
		watched = {};
	} else {
		watched = JSON.parse(watchedString);
	}
	if (watched[show.title] == null) {
		watched[show.title] = {};
	}
	watched[show.title][episode.sortKey] = true;
	localStorage.setItem('watched', JSON.stringify(watched));
}

export function getWatched(): void {
	const watchedString = localStorage.getItem('watched');
	if (watchedString == null) {
		return;
	} else {
		return JSON.parse(watchedString);
	}
}

export function clearWatched(show: Show) {
	const watchedString = localStorage.getItem('watched');
	let watched;
	if (watchedString == null) {
		watched = {};
	} else {
		watched = JSON.parse(watchedString);
	}
	delete watched[show.title];
	localStorage.setItem('watched', JSON.stringify(watched));
	return watched;
}
