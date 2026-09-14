/**
 * Centralized links configuration reading from root `.env` with safe fallbacks.
 * To update any link, modify the corresponding variable in your `.env` file.
 */
export const SOCIAL_LINKS = {
	// Social Media & Community Links
	facebook:
		process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://www.facebook.com/cbitosc/",
	twitter:
		process.env.NEXT_PUBLIC_TWITTER_URL || "https://twitter.com/cbitosc/",
	instagram:
		process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/cbitosc/",
	linkedin:
		process.env.NEXT_PUBLIC_LINKEDIN_URL || "https://www.linkedin.com/company/cbitosc/",
	hackathonLinkedin:
		process.env.NEXT_PUBLIC_HACKATHON_LINKEDIN_URL || "https://linkedin.com/company/cbit-hackathon",
	github:
		process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/cbitosc",
	substack:
		process.env.NEXT_PUBLIC_SUBSTACK_URL || "https://cbitosc.substack.com/",
	communityWebsite:
		process.env.NEXT_PUBLIC_COMMUNITY_URL || "https://cbitosc.github.io/",
	codeOfConduct:
		process.env.NEXT_PUBLIC_CODE_OF_CONDUCT_URL || "https://cbitosc.github.io/coc/",

	// Hackathon & Event Links
	hacktoberfest:
		process.env.NEXT_PUBLIC_HACKTOBERFEST_URL || "https://hacktoberfest.com",

	// Sponsor Links
	sponsorTitle:
		process.env.NEXT_PUBLIC_SPONSOR_TITLE_URL || "https://google.com",
	sponsorCo:
		process.env.NEXT_PUBLIC_SPONSOR_CO_URL || "https://google.com",

	// Contact Information
	contactEmail:
		process.env.NEXT_PUBLIC_CONTACT_EMAIL || "cosc@cbit.ac.in",
	contactPhoneMeghana:
		process.env.NEXT_PUBLIC_CONTACT_PHONE_MEGHANA || "+916281657674",
	contactPhoneSrilekha:
		process.env.NEXT_PUBLIC_CONTACT_PHONE_SRILEKHA || "+917416939873",
};

export default SOCIAL_LINKS;
