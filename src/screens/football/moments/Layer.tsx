// The full-screen layer every Football moment sits in. Drawn on the page body, so it lies above the tab bar and the
// session pill: the Football page is its own layer, and anything fixed inside it stays under them.
import type { HTMLAttributes } from 'react';
import { createPortal } from 'react-dom';

export const MomentLayer = (props: HTMLAttributes<HTMLDivElement>) => createPortal(<div className="fb-moment" {...props} />, document.body);
