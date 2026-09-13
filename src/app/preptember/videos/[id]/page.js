import VideoDetailPage from "./VideoDetailPage";

export async function generateMetadata({ params }) {
	return {
		title: "Preptember Video | Promptathon",
		description: "Workshop and tutorial sessions for Promptathon.",
	};
}

export default function Page({ params }) {
	return <VideoDetailPage params={params} />;
}
