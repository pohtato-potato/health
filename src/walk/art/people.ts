/**
 * Flat figures for the road, drawn about 18 units tall standing on y = 0. Each one is a
 * specific person, not a type; the brief beside each keeps them that way.
 */
export interface Figure {
  id: string;
  /** Who this is, written to avoid cliché: specific, contemporary, individual. */
  brief: string;
  path: string;
}

export const WALKER: Figure = {
  id: 'you',
  brief: 'You: a walker with a small day pack, mid-stride.',
  path: 'M9 -18a2.4 2.4 0 1 0 0.1 0ZM7 -14.5h4l1.5 6-1.6.3-1.2-4.3-.4 4 2.6 8.5h-1.9l-2.3-7-1.5 7H5.3l1.9-9.5L6.6 -10 5 -7.4l-1.5-.8Z M11.6 -14.2h2.6v5h-2.6z',
};

export const PEOPLE: Figure[] = [
  {
    id: 'cyclist',
    brief: 'A schoolteacher cycling home with a stack of exercise books on the carrier; she waves at everyone she passes.',
    path: 'M4 -4a4 4 0 1 0 0.1 0ZM20 -4a4 4 0 1 0 0.1 0ZM4 -4L10 -11L20 -4M10 -11h6l4 7M12 -18a2.2 2.2 0 1 0 .1 0ZM11 -15l1 4 4 0M14 -12h5v3h-5z',
  },
  {
    id: 'driver',
    brief: 'A truck driver on a long-haul run, stretching by the cab; he has been on this highway since before the bypass was built.',
    path: 'M10 -18a2.4 2.4 0 1 0 .1 0ZM8 -14.5h4l.3 6.5 2.7-4.5 1.2.8-3.6 5.6-.6 6.1H10.4L10 -4.5 9.6 0H8z',
  },
  {
    id: 'student',
    brief: 'A college student on a phone call, laughing, a laptop bag across her shoulder; she is going home for the holidays.',
    path: 'M9 -18a2.3 2.3 0 1 0 .1 0ZM7.2 -14.6h3.8l.6 7.6-1.4 0 0 7H8.8l-.3-5.6-.4 5.6H6.6l.1-7-1.2 0ZM10.8 -16.5l2 -.4.4 3.4-1.4.3z M5 -12h2.4v4H5z',
  },
];
