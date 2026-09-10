import About from "@/components/about";
import "remixicon/fonts/remixicon.css";
import dynamic from "next/dynamic";
import RootLayoutClient from "@/components/RootLayoutClient";
import HeroMod from "./HeroMod";
import TimelineOld from "./TimelineOld";
import Mentors from "@/components/mentors";
import ContactUs from "@/components/contactUs";
import Tracks from "@/components/Tracks";
import { ChatProvider } from "@/components/chatcontext";

import Timer from "@/components/Timer";

export default function Home() {
	return (
		<ChatProvider>
			<div>
				<RootLayoutClient>
					<section id="hero">
						<HeroMod />
					</section>
					
					<section id="about">
						<About />
					</section>

					<section id="timer">
						<Timer launchDate="2026-09-26T16:00:00" />
					</section>

					<section id="tracks">
						<Tracks />
					</section>

					<section id="mentors">
						<Mentors />
					</section>

					<section id="timeline">
						<TimelineOld />
					</section>

					<section id="contact">
						<ContactUs />
					</section>
				</RootLayoutClient>
			</div>
		</ChatProvider>
	);
}
