/**
 * TEMPORARY AUTHENTICATION BYPASS FOR FRONTEND TESTING
 * 
 * To disable this bypass and restore real Firebase authentication,
 * set BYPASS_AUTH to false below, or set NEXT_PUBLIC_BYPASS_AUTH=false in .env.local.
 */
export const BYPASS_AUTH =
	process.env.NEXT_PUBLIC_BYPASS_AUTH !== undefined
		? process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"
		: true; // Default to true for testing frontend without Firebase credentials

export const MOCK_USER = {
	uid: "demo-user-123",
	email: "alex.johnson@cbit.ac.in",
	displayName: "Alex Johnson",
};

export const MOCK_TEAM_DATA = {
	teamName: "Code Spartans",
	createdAt: {
		toDate: () => new Date("2024-10-01T10:00:00Z"),
	},
	updatedAt: {
		toDate: () => new Date("2024-10-15T15:30:00Z"),
	},
	participants: [
		{
			name: "Alex Johnson",
			email: "alex.johnson@cbit.ac.in",
			phone: "+91 9876543210",
			rollNo: "160121733001",
			institution: "CBIT",
			branch: "CSE",
			yearOfStudy: "3rd Year",
			section: "CSE-1",
			isTeamLeader: true,
		},
		{
			name: "Sam Smith",
			email: "sam.smith@cbit.ac.in",
			phone: "+91 9876543211",
			rollNo: "160121733002",
			institution: "CBIT",
			branch: "IT",
			yearOfStudy: "3rd Year",
			section: "IT-2",
			isTeamLeader: false,
		},
		{
			name: "Taylor Swift",
			email: "taylor@cbit.ac.in",
			phone: "+91 9876543212",
			rollNo: "160121733003",
			institution: "CBIT",
			branch: "ECE",
			yearOfStudy: "3rd Year",
			section: "ECE-1",
			isTeamLeader: false,
		},
	],
	techStack: ["Next.js", "React", "Tailwind CSS", "Firebase", "Python"],
	otherTechStack: "Framer Motion, GSAP, Node.js",
};
