export interface Show {
	img: string;
	title: string;
	url: string;
	episodes: Episode[];
}
export interface Episode {
	id: string;
	img: string;
	mediaId: string | undefined;
	sortKey: string;
	title: string;
	url: string;
	date: string;
}
