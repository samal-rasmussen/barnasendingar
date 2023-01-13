export interface Show {
  img: string;
  title: string;
  url: string;
  episodes: Episode[];
}
export interface Episode {
  episodeNumber: number | null;
  id: string;
  sortKey: string;
  img: string;
  seasonNumber: number | null;
  title: string;
  url: string;
}
