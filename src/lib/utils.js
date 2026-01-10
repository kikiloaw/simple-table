import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function urlIsActive(urlToCheck, currentUrl) {
    const href = typeof urlToCheck === 'string' ? urlToCheck : urlToCheck?.url;
    return href === currentUrl;
}

export function toUrl(href) {
    return typeof href === 'string' ? href : href?.url;
}
