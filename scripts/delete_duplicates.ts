import fs from 'fs';

// Read the JSON file
const data = JSON.parse(fs.readFileSync('src/lib/assets/shows.json', 'utf8'));

function log(...args: any[]) {
	// console.log(...args);
}

log('Original data:');
log('- Shows:', data.length);
let totalEpisodes = 0;
data.forEach((show) => {
	if (show.episodes) {
		totalEpisodes += show.episodes.length;
	}
});
log('- Total episodes:', totalEpisodes);

// Track duplicates within each show
const duplicates = [];

// Process each show and episode
const cleanedData = data.map((show) => {
	if (!show.episodes) return show;

	// Track duplicates by sortKey within this show only
	const seenSortKeys = new Set();
	const showDuplicates = [];

	const cleanedEpisodes = show.episodes.filter((episode) => {
		// Use sortKey as the primary identifier for duplicates within this show
		// sortKey combines date and id, making it the most reliable way to identify true duplicates
		if (seenSortKeys.has(episode.sortKey)) {
			showDuplicates.push({
				show: show.title,
				episode: episode.title,
				id: episode.id,
				mediaId: episode.mediaId,
				url: episode.url,
				date: episode.date,
				sortKey: episode.sortKey,
			});
			return false; // Remove this episode
		} else {
			seenSortKeys.add(episode.sortKey);
			return true; // Keep this episode
		}
	});

	// Add show duplicates to global duplicates array
	duplicates.push(...showDuplicates);

	return {
		...show,
		episodes: cleanedEpisodes,
	};
});

// Report duplicates found
log('\n=== TRUE DUPLICATES FOUND ===');
log('Duplicates by sortKey:', duplicates.length);
if (duplicates.length > 0) {
	log('\nDuplicate episodes (removed):');
	duplicates.forEach((dup, i) => {
		log(`${i + 1}. ${dup.show} | ${dup.episode}`);
		log(`   ID: ${dup.id}`);
		log(`   MediaID: ${dup.mediaId}`);
		log(`   Date: ${dup.date}`);
		log(`   SortKey: ${dup.sortKey}`);
		log('');
	});
}

// Calculate new totals
let newTotalEpisodes = 0;
cleanedData.forEach((show) => {
	if (show.episodes) {
		newTotalEpisodes += show.episodes.length;
	}
});

log('=== CLEANING RESULTS ===');
log('Episodes removed:', totalEpisodes - newTotalEpisodes);
log('Remaining episodes:', newTotalEpisodes);

// Write cleaned data back to file
fs.writeFileSync('src/lib/assets/shows.json', JSON.stringify(cleanedData, null, 2));
log('\nCleaned data written to src/lib/assets/shows.json');
