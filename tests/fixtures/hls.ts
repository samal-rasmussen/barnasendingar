import type { Route } from '@playwright/test';

// A master playlist with two quality levels (360p and 720p). That's enough
// for hls.js to parse the manifest and report its levels. The level
// playlists and video segments are never served, so no real video plays.
const masterPlaylist = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720
720.m3u8
`;

/** Answers a request for an HLS master playlist with the fake one. */
export const fulfillMasterPlaylist = (route: Route) =>
	route.fulfill({ contentType: 'application/vnd.apple.mpegurl', body: masterPlaylist });
