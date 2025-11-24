#!/usr/bin/env tsx

import { spawn } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import shows from '../src/lib/assets/shows.json';
import type { Show, Episode } from './shared-types';
import { keepAwake } from './keepawake';

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

function validateOutputDir(outputDir: string): string {
	const trimmed = outputDir.trim();
	if (!trimmed) {
		throw new Error('Output directory cannot be empty');
	}
	// Check for dangerous path traversal attempts
	if (trimmed.includes('..')) {
		throw new Error('Output directory cannot contain ".." (path traversal)');
	}
	// Check for null bytes (potential security issue)
	if (trimmed.includes('\0')) {
		throw new Error('Output directory contains invalid characters');
	}
	return trimmed;
}

async function listFormats(url: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const args = [url, '--list-formats', '--no-check-certificates', '--no-warnings'];

		const ytDlp = spawn('yt-dlp', args, {
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';

		ytDlp.stdout.on('data', (data) => {
			stdout += data.toString();
		});

		ytDlp.stderr.on('data', (data) => {
			stderr += data.toString();
		});

		ytDlp.on('close', (code) => {
			if (code === 0) {
				resolve(stdout);
			} else {
				reject(new Error(`yt-dlp --list-formats failed with exit code ${code}\n${stderr}`));
			}
		});

		ytDlp.on('error', (error) => {
			reject(new Error(`Error spawning yt-dlp: ${error.message}`));
		});
	});
}

function parseFormatIds(formatList: string): string[] {
	const ids = new Set<string>();

	for (const line of formatList.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		// Skip header or log lines
		if (/^id\s+/i.test(trimmed) || /^format\s+code/i.test(trimmed) || trimmed.startsWith('[')) {
			continue;
		}

		const parts = trimmed.split(/\s+/);
		const id = parts[0];
		if (!id || id.toLowerCase() === 'id') continue;

		ids.add(id);
	}

	return Array.from(ids);
}

function promptShowSelection(): Promise<Show> {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		console.log('\n📺 Available shows:');
		shows.forEach((show, index) => {
			console.log(`  ${index + 1}. ${show.title}`);
		});

		const promptUser = () => {
			rl.question('\nSelect a show (enter number or show title): ', (answer) => {
				const trimmed = answer.trim();

				if (!trimmed) {
					console.log('❌ Please enter a number or show title.');
					promptUser();
					return;
				}

				// Validate input length to prevent extremely long strings
				if (trimmed.length > 200) {
					console.log('❌ Input is too long. Please enter a number or show title.');
					promptUser();
					return;
				}

				// Try to match by number
				const number = parseInt(trimmed, 10);
				if (!isNaN(number) && number >= 1 && number <= shows.length) {
					rl.close();
					resolve(shows[number - 1]);
					return;
				}

				// Try to match by title (case-insensitive, partial match)
				const matchedShow = shows.find(
					(show) => show.title.toLowerCase() === trimmed.toLowerCase(),
				);

				if (matchedShow) {
					rl.close();
					resolve(matchedShow);
					return;
				}

				// Try partial match
				const partialMatch = shows.find((show) =>
					show.title.toLowerCase().includes(trimmed.toLowerCase()),
				);

				if (partialMatch) {
					rl.close();
					resolve(partialMatch);
					return;
				}

				console.log('❌ Show not found. Please try again.');
				promptUser();
			});
		};

		promptUser();
	});
}

function promptFormatSelection(availableFormatIds: string[]): Promise<string> {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		const promptUser = () => {
			rl.question('\nSelect format ID from the list above (press Enter for "best"): ', (answer) => {
				const trimmed = answer.trim();

				// Empty input -> default 'best'
				if (!trimmed) {
					rl.close();
					resolve('best');
					return;
				}

				// Validate that the entered ID exists in the presented list
				if (!availableFormatIds.includes(trimmed)) {
					console.log(
						`❌ Invalid format ID. Please choose one of the listed IDs: ${availableFormatIds.join(
							', ',
						)}`,
					);
					promptUser();
					return;
				}

				rl.close();
				resolve(trimmed);
			});
		};
		promptUser();
	});
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

	// Validate and set output directory
	let outputDir: string;
	try {
		outputDir = validateOutputDir(args[0] || './downloads');
	} catch (error) {
		console.error(`❌ Invalid output directory: ${error.message}`);
		process.exit(1);
	}

	console.log('📺 Show Downloader');
	console.log('==================\n');

	// Prompt user to select a show
	const show = await promptShowSelection();

	console.log(`\n✅ Selected show: ${show.title}`);

	// Filter out episodes without mediaId
	const episodesWithMediaId = show.episodes.filter((episode) => episode.mediaId);

	if (episodesWithMediaId.length === 0) {
		console.error(`❌ No episodes with mediaId found for show "${show.title}"`);
		process.exit(1);
	}

	// Get first episode for format listing
	const firstEpisode = episodesWithMediaId[0];
	const m3u8Url = `https://vod.kringvarp.fo/redirect/video/_definst_/smil:smil/video/${firstEpisode.mediaId}.smil?type=m3u8`;

	console.log(`📊 Total episodes: ${show.episodes.length}`);
	console.log(`\n📋 Fetching available formats for first episode: ${firstEpisode.title}...`);

	// List formats and prompt user
	let format: string;
	try {
		const formatList = await listFormats(m3u8Url);
		console.log('\n' + formatList);
		const availableFormatIds = parseFormatIds(formatList);

		if (!availableFormatIds.length) {
			console.warn(
				'⚠️  Could not parse format IDs from yt-dlp output. Falling back to default format "best".',
			);
			format = 'best';
		} else {
			format = await promptFormatSelection(availableFormatIds);
		}

		console.log(`\n✅ Selected format: ${format}`);
	} catch (error) {
		console.error(`❌ Failed to list formats: ${error.message}`);
		console.log('Using default format: best');
		format = 'best';
	}

	const options: DownloadOptions = {
		outputDir,
		format,
	};

	// Acquire wake lock to prevent computer from sleeping during downloads
	let wakeLock: { pid: number; release: () => boolean } | null = null;
	try {
		console.log('\n🔒 Acquiring wake lock to prevent sleep during downloads...');
		wakeLock = await keepAwake();
		console.log('✅ Wake lock acquired. Computer will stay awake during downloads.\n');
	} catch (error) {
		console.warn(`⚠️  Failed to acquire wake lock: ${error.message}`);
		console.warn('Downloads will continue, but computer may sleep if idle.\n');
	}

	try {
		await downloadShow(show.title, options);
	} catch (error) {
		console.error(`❌ Download failed: ${error.message}`);
		process.exit(1);
	} finally {
		// Always release the wake lock when done
		if (wakeLock) {
			console.log('\n🔓 Releasing wake lock...');
			wakeLock.release();
			console.log('✅ Wake lock released.');
		}
	}
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
