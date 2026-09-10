import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import cn from "@/utils/cn";
import { SimulatedDarkModeProvider } from "@/utils/contexts/SimulatedDarkModeDetection";
import Script from "next/script";
import toast, { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/utils/contexts/AuthContext";

const orbitron = localFont({
	src: "./fonts/Orbitron-Bold.woff2",
	variable: "--font-orbitron",
	weight: "700 900",
});

const spaceGrotesk = localFont({
	src: "./fonts/SpaceGrotesk-VariableFont_wght.ttf",
	variable: "--font-tech",
	weight: "100 900",
});

export const metadata = {
	title: "Promptathon 2026 — AI Hackathon by Prompt Techies",
	description:
		"Promptathon is the premier AI Hackathon conducted by Prompt Techies. Build, hack, and deploy future-ready AI solutions with real-world impact. Dream. Develop. Deploy. ⚡",
	keywords: [
		"promptathon",
		"promptathon 2026",
		"prompt techies",
		"AI hackathon",
		"hackathon",
		"bootcamps",
		"startup incubation",
		"DPIIT",
		"MSME",
		"AI engineering",
		"generative AI",
		"LLMs",
		"full-stack development",
		"next.js",
		"hyderabad",
		"telangana",
		"india",
		"student developers",
		"innovation programs",
	],
	icons: {
		icon: [
			{
				media: "(prefers-color-scheme: light)",
				url: "/assets/prompt_techies_logo.png",
				href: "/assets/prompt_techies_logo.png",
			},
			{
				media: "(prefers-color-scheme: dark)",
				url: "/assets/prompt_techies_logo.png",
				href: "/assets/prompt_techies_logo.png",
			},
		],
	},
	metadataBase: new URL(
		process.env.NEXT_PUBLIC_SITE_URL || "https://prompttechies.in"
	),
};

export default function RootLayout({ children }) {
	const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

	return (
		<html lang="en" suppressHydrationWarning={true}>
			<head>
				{/* Google Analytics */}
				{GA_TRACKING_ID && (
					<>
						<Script
							src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
							strategy="afterInteractive"
						/>
						<Script
							id="google-analytics"
							strategy="afterInteractive"
						>
							{`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${GA_TRACKING_ID}', {
                           page_path: window.location.pathname,
                        });
                     `}
						</Script>
					</>
				)}
			</head>
			<body
				className={cn(
					`${GeistSans.variable} ${GeistMono.variable} ${orbitron.variable} ${spaceGrotesk.variable}`,
					"antialiased text-on-surface bg-background font-geist",
					"min-h-screen md:grid md:grid-rows-[auto,1fr,auto] relative",
					"transition-colors duration-300"
				)}
				suppressHydrationWarning={true}
			>
				<SimulatedDarkModeProvider>
					<AuthProvider>
						<Navbar />
						{children}
						<Footer />
					</AuthProvider>
				</SimulatedDarkModeProvider>
				<Toaster position="top-center" reverseOrder={false} />
			</body>
		</html>
	);
}
