#!/usr/bin/env tsx

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import shows from '../src/lib/assets/shows.json';
import type { Show, Episode } from './shared-types';

interface DownloadOptions {
	outputDir: string;
	format: string;
}

function findShow(showTitle: string): Show | undefined {
	return shows.find((show) => show.title === showTitle);
}

function sanitizeFilename(filename: string): string {
	// Remove or replace characters that are problematic for filenames
	return filename
		.replace(/[<>:"/\\|?*]/g, '_')
		.replace(/\s+/g, '_')
		.trim();
}

function downloadWithYtDlp(
	url: string,
	outputPath: string,
	options: DownloadOptions,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const args = [
			url,
			'-o',
			outputPath,
			'-f',
			options.format,
			'--no-check-certificates', // In case of SSL issues
			'--no-warnings', // Reduce noise
			'--hls-use-mpegts', // Use mpegts container for HLS videos (better compatibility)
		];

		console.log(`Downloading: ${url}`);
		console.log(`Output: ${outputPath}`);

		const ytDlp = spawn('yt-dlp', args, {
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';

		ytDlp.stdout.on('data', (data) => {
			stdout += data.toString();
			process.stdout.write(data);
		});

		ytDlp.stderr.on('data', (data) => {
			stderr += data.toString();
			process.stderr.write(data);
		});

		ytDlp.on('close', (code) => {
			if (code === 0) {
				console.log(`✅ Successfully downloaded: ${outputPath}`);
				resolve();
			} else {
				console.error(`❌ Failed to download: ${url}`);
				console.error(`Exit code: ${code}`);
				console.error(`Stderr: ${stderr}`);
				reject(new Error(`yt-dlp failed with exit code ${code}`));
			}
		});

		ytDlp.on('error', (error) => {
			console.error(`❌ Error spawning yt-dlp: ${error.message}`);
			reject(error);
		});
	});
}

async function downloadShow(
	showTitle: string,
	options: DownloadOptions = {
		outputDir: './downloads',
		format: 'best',
	},
): Promise<void> {
	const show = findShow(showTitle);

	if (!show) {
		console.error(`❌ Show "${showTitle}" not found.`);
		console.log('Available shows:');
		shows.forEach((s) => console.log(`  - ${s.title}`));
		process.exit(1);
	}

	console.log(`📺 Found show: ${show.title}`);
	console.log(`📊 Total episodes: ${show.episodes.length}`);

	// Create output directory for this show
	const showDir = join(options.outputDir, sanitizeFilename(show.title));
	if (!existsSync(showDir)) {
		mkdirSync(showDir, { recursive: true });
	}

	console.log(`📁 Output directory: ${showDir}`);

	// Filter out episodes without mediaId
	const episodesWithMediaId = show.episodes.filter((episode) => episode.mediaId);

	if (episodesWithMediaId.length === 0) {
		console.error(`❌ No episodes with mediaId found for show "${showTitle}"`);
		process.exit(1);
	}

	console.log(`📺 Episodes with mediaId: ${episodesWithMediaId.length}`);

	// Download each episode
	for (let i = 0; i < episodesWithMediaId.length; i++) {
		const episode = episodesWithMediaId[i];
		const episodeNumber = (i + 1).toString().padStart(3, '0');
		const sanitizedTitle = sanitizeFilename(episode.title);
		const filename = `${episodeNumber}_${sanitizedTitle}.%(ext)s`;
		const outputPath = join(showDir, filename);

		const m3u8Url = `https://vod.kringvarp.fo/redirect/video/_definst_/smil:smil/video/${episode.mediaId}.smil?type=m3u8`;

		console.log(
			`\n🎬 Downloading episode ${i + 1}/${episodesWithMediaId.length}: ${episode.title}`,
		);
		console.log(`📅 Date: ${episode.date}`);

		try {
			await downloadWithYtDlp(m3u8Url, outputPath, options);
		} catch (error) {
			console.error(`❌ Failed to download episode: ${episode.title}`);
			console.error(`Error: ${error.message}`);
			// Continue with next episode instead of stopping
		}
	}

	console.log(`\n✅ Download complete for show: ${show.title}`);
	console.log(`📁 Files saved to: ${showDir}`);
}

// Main execution
async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.error('❌ Please provide a show title as an argument.');
		console.log('Usage: tsx download-show.ts "Show Title" [outputDir] [format]');
		console.log('\nAvailable shows:');
		shows.forEach((show) => console.log(`  - ${show.title}`));
		process.exit(1);
	}

	const showTitle = args[0];

	// Optional arguments
	const outputDir = args[1] || './downloads';
	const format = args[2] || 'best';

	const options: DownloadOptions = {
		outputDir,
		format,
	};

	try {
		await downloadShow(showTitle, options);
	} catch (error) {
		console.error(`❌ Download failed: ${error.message}`);
		process.exit(1);
	}
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
