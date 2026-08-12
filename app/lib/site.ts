export const SITE_URL = 'https://hohaeng.vercel.app';
export const SITE_NAME = '호행처럼';

export function absoluteUrl(path = '/') {
  return new URL(path, SITE_URL).toString();
}
