export interface Show {
	img: string;
	title: string;
	url: string;
	episodes: Episode[];
}
export interface Episode {
	date: string;
	id: string;
	img: string;
	mediaId: string | undefined;
	showTitle: string;
	sortKey: string;
	title: string;
	url: string;
}
