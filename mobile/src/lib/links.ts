/** Where invite links point. The web app handles them in a browser; the native app handles legityleague://join/CODE. */
export const WEB_BASE = 'https://liam-highducheck.github.io/legity-league/'
export const inviteLink = (code: string) => `${WEB_BASE}#/join/${code}`
