export default async function sitemap() {
	const URL_BASE =
		process.env.NEXT_PUBLIC_SITE_URL ||
		"https://promptothon.dev";
	const url = (path) => new URL(path, URL_BASE).href;

	return [
		{ url: url("/"), changefreq: "daily", priority: 1, lastModified: new Date().toISOString() },
		{ url: url("/leaderboard"), changefreq: "daily", priority: 0.9, lastModified: new Date().toISOString() },
		{ url: url("/register"), changefreq: "daily", priority: 0.9, lastModified: new Date().toISOString() },
		{ url: url("/login"), changefreq: "daily", priority: 0.9, lastModified: new Date().toISOString() },
		{ url: url("/teamdetails"), changefreq: "daily", priority: 0.9, lastModified: new Date().toISOString() },
		{ url: url("/submission"), changefreq: "daily", priority: 0.8, lastModified: new Date().toISOString() },
		{ url: url("/networking"), changefreq: "daily", priority: 0.8, lastModified: new Date().toISOString() },
		{ url: url("/announcements"), changefreq: "daily", priority: 0.8, lastModified: new Date().toISOString() },
		{ url: url("/jury"), changefreq: "daily", priority: 0.7, lastModified: new Date().toISOString() },
		{ url: url("/admin"), changefreq: "daily", priority: 0.7, lastModified: new Date().toISOString() },
	];
}
