/**
 * AUTHENTICATION BYPASS & TEST SEED DATA FOR PROMPTATHON
 * 
 * Used for local development and testing without live Firebase credentials.
 * Real Firebase authentication can be used side-by-side.
 */
export const BYPASS_AUTH =
	process.env.NEXT_PUBLIC_BYPASS_AUTH !== undefined
		? process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"
		: true;

export const MOCK_USER = {
	uid: "demo-promptathon-user-001",
	email: "alex.johnson@prompttechies.in",
	displayName: "Alex Johnson",
};

export const createDefault3MemberTeam = (leaderUser = MOCK_USER) => ({
	teamName: "Neural Hackers",
	teamLeaderId: leaderUser?.uid || "demo-promptathon-user-001",
	totalParticipants: 3,
	createdAt: new Date("2026-09-01T10:00:00Z"),
	updatedAt: new Date("2026-09-10T12:00:00Z"),
	techStack: ["Next.js", "Gemini API", "Python", "Tailwind CSS", "LangChain"],
	otherTechStack: "Framer Motion, Vector DBs, LiveKit",
	participants: [
		{
			participantId: "participant_1",
			name: leaderUser?.displayName || "Alex Johnson",
			email: leaderUser?.email || "alex.johnson@prompttechies.in",
			phone: "+91 9876543210",
			rollNo: "PT2026-AI-01",
			institution: "Prompt Techies University",
			branch: "Artificial Intelligence & Data Science",
			yearOfStudy: "3rd Year",
			section: "AI-1",
			isTeamLeader: true,
		},
		{
			participantId: "participant_2",
			name: "Sam Smith",
			email: "sam.smith@prompttechies.in",
			phone: "+91 9876543211",
			rollNo: "PT2026-CS-42",
			institution: "Prompt Techies University",
			branch: "Computer Science & Engineering",
			yearOfStudy: "3rd Year",
			section: "CSE-2",
			isTeamLeader: false,
		},
		{
			participantId: "participant_3",
			name: "Taylor Swift",
			email: "taylor.swift@prompttechies.in",
			phone: "+91 9876543212",
			rollNo: "PT2026-IT-18",
			institution: "Prompt Techies University",
			branch: "Information Technology",
			yearOfStudy: "3rd Year",
			section: "IT-1",
			isTeamLeader: false,
		},
	],
});

export const MOCK_TEAM_DATA = createDefault3MemberTeam(MOCK_USER);

