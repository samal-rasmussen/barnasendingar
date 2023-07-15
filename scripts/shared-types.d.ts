export interface Show {
	img: string;
	title: string;
	url: string;
	episodes: Episode[];
}
export interface Episode {
	episodeNumber: number | null;
	id: string;
	img: string;
	mediaId: string | undefined;
	seasonNumber: number | null;
	sortKey: string;
	title: string;
	url: string;
}
