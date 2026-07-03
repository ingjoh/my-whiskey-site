import { loadPageData } from './src/lib/db';
loadPageData('home').then(data => console.log(JSON.stringify(data, null, 2))).catch(console.error);
