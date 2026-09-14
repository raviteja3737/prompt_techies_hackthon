"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "./assets/prompt_techies_logo.png";
import Image from "next/image";
import { usePathname } from "next/navigation";
import cn from "@/utils/cn";
import { FaRightLong } from "react-icons/fa6";
import { useSimulatedDarkMode } from "@/utils/contexts/SimulatedDarkModeDetection";
import { useAuth } from "@/utils/contexts/AuthContext";
import { LogOutIcon } from "lucide-react";

const Navbar = () => {
	const [menuOpen, setMenuOpen] = useState(false);
	const [navTransparent, setNavTransparent] = useState(true);
	const [activeLink, setActiveLink] = useState(null);
	const simulatedDarkMode = useSimulatedDarkMode();
	const pathname = usePathname();
	const { user, logout } = useAuth();

	useEffect(() => {
		if (menuOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "auto";
		}
	}, [menuOpen]);

	useEffect(() => {
		const handleScroll = () => {
			setNavTransparent(window.scrollY <= 50);
		};
		window.addEventListener("scroll", handleScroll);
		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);

	useEffect(() => {
		if (pathname === "/") {
			// scroll-spy effect using intersection observer
			// after the page loads, the observer will observe the sections
			const observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							const id = entry.target.id;
							setActiveLink(id);
						}
					});
				},
				{ rootMargin: "0px", threshold: 0.3 }
			);

			const observeAll = () => {
				const sections = document.querySelectorAll("section[id]");
				sections.forEach((section) => {
					observer.observe(section);
				});
			};

			if (document.readyState === "complete") {
				observeAll();
			} else {
				window.addEventListener("load", observeAll);
			}

			return () => {
				window.removeEventListener("load", observeAll);
			};
		} else {
			setActiveLink("");
		}
	}, [pathname]);

	const navItems = [
		{ href: "#about", label: "About" },
		{ href: "#tracks", label: "Tracks" },
		{ href: "/leaderboard", label: "Leaderboard" },
		{ href: "/networking", label: "Networking" },
		{ href: "/announcements", label: "Announcements" },
		{ href: "#timeline", label: "Timeline" },
		{ href: "#contact", label: "Contact" },
	];

	return (
		<header
			className={cn(
				navTransparent
					? "bg-on-surface/10"
					: simulatedDarkMode
					? "bg-primary lg:bg-on-surface/90 lg:shadow-md lg:backdrop-blur-lg"
					: "bg-surface lg:bg-surface/80 lg:shadow-md lg:backdrop-blur-md",
				"fixed top-0 w-full z-50",
				"transition-all duration-500 ease-in-out"
			)}
		>
			<nav
				className="mx-auto z-50 flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8"
				aria-label="Global"
			>
				<div className="flex lg:flex-1 items-center">
					<Link
						href="/"
						className="-m-1.5 p-1.5 flex items-center gap-2 group"
						onClick={() => setMenuOpen(false)}
					>
						<span className="sr-only">Prompt Techies</span>
						<Image
							className="h-11 md:h-14 w-auto object-contain drop-shadow-[0_0_12px_rgba(0,200,255,0.25)] transition-transform duration-300 group-hover:scale-105"
							src={Logo}
							alt="Prompt Techies Logo"
							width={220}
							height={65}
							priority={true}
						/>
					</Link>
				</div>
				<div className="flex lg:hidden">
					<button
						type="button"
						className={cn(
							"-m-2.5 inline-flex items-center justify-center",
							"rounded-md p-2.5",
							navTransparent
								? "text-inverse-on-surface hover:text-secondary"
								: "text-on-surface hover:text-primary",
							"transition-all duration-300 ease-in-out",
							simulatedDarkMode
								? "text-inverse-on-surface hover:text-secondary"
								: ""
						)}
						onClick={() => setMenuOpen(true)}
					>
						<span className="sr-only">Open main menu</span>
						<svg
							className="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth="1.5"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
							/>
						</svg>
					</button>
				</div>
				<div className="hidden lg:flex lg:gap-x-12">
					{navItems.map((item) => {
						const isItemActive = item.href.startsWith("#")
							? (pathname === "/" && activeLink === item.href.split("#")[1])
							: pathname === item.href;

						return (
							<Link
								key={item.href}
								href={
									item.href.startsWith("#")
										? (pathname === "/" ? item.href : `/${item.href}`)
										: item.href
								}
								className={cn(
									navTransparent
										? "text-inverse-on-surface hover:text-secondary"
										: "text-on-surface hover:text-primary",
									"transition-all duration-300 ease-in-out",
									"text-sm font-semibold leading-6",
									isItemActive
										? navTransparent
											? "text-secondary border-b-2 border-secondary hover:text-secondary hover:border-secondary"
											: "text-primary border-b-2 border-primary hover:text-primary"
										: ""
								)}
							>
								{item.label}
							</Link>
						);
					})}
				</div>
				<div className="hidden lg:flex lg:flex-1 lg:justify-end">
					{user ? (
						<div className="flex gap-2">
							{user.role === "ADMIN" && (
								<Link
									href="/admin"
									className={cn(
										"text-sm font-semibold leading-6",
										"text-primary px-4 py-2 rounded-full",
										navTransparent
											? "text-amber-400 bg-transparent hover:bg-amber-400/20 hover:text-amber-300"
											: "bg-transparent hover:bg-amber-500/20 hover:text-amber-700",
										"transition-colors duration-300 ease-in-out"
									)}
								>
									Admin
								</Link>
							)}
							{user.role === "JURY" && (
								<Link
									href="/jury"
									className={cn(
										"text-sm font-semibold leading-6",
										"text-primary px-4 py-2 rounded-full",
										navTransparent
											? "text-purple-400 bg-transparent hover:bg-purple-400/20 hover:text-purple-300"
											: "bg-transparent hover:bg-purple-500/20 hover:text-purple-700",
										"transition-colors duration-300 ease-in-out"
									)}
								>
									Jury Portal
								</Link>
							)}
							<Link
								href="/teamdetails"
								className={cn(
									"text-sm font-semibold leading-6",
									"text-primary px-4 py-2 rounded-full",
									navTransparent
										? "text-secondary bg-transparent hover:bg-primary-container hover:text-primary"
										: "bg-transparent hover:bg-primary-container hover:text-primary",
									"transition-colors duration-300 ease-in-out"
								)}
							>
								Team Details
							</Link>
							<button
								className={cn(
									"text-sm font-semibold leading-6",
									"flex items-center gap-1",
									"text-primary px-4 py-2 rounded-full",
									navTransparent
										? "text-red-400 bg-transparent hover:bg-red-500 hover:text-red-50"
										: "text-red-800 hover:bg-red-500 hover:text-red-50",
									"transition-colors duration-300 ease-in-out"
								)}
								onClick={logout}
							>
								Logout <LogOutIcon className="w-4" />
							</button>
						</div>
					) : (
						<div className="flex items-center gap-3">
							<Link
								href="/register"
								className={cn(
									"text-sm font-semibold leading-6",
									"px-4 py-2 rounded-full border border-secondary text-secondary",
									"hover:bg-secondary hover:text-black",
									"transition-all duration-300 ease-in-out"
								)}
							>
								Register
							</Link>
							<Link
								href="/login"
								className={cn(
									"text-sm font-semibold leading-6",
									"text-on-primary px-4 py-2 rounded-full",
									navTransparent
										? "bg-primary hover:bg-primary-container hover:text-on-primary"
										: "bg-primary hover:bg-primary-container hover:text-on-primary",
									"transition-colors duration-300 ease-in-out"
								)}
							>
								Login <span aria-hidden="true">&rarr;</span>
							</Link>
						</div>
					)}
				</div>
			</nav>
			<div
				className={cn("lg:hidden", menuOpen ? "block" : "hidden")}
				role="dialog"
				aria-modal="true"
			>
				<div className="fixed inset-0 z-10"></div>
				<div className="fixed inset-y-0 right-0 z-10 w-full overflow-y-auto bg-surface px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
					<div className="flex items-center justify-between">
						<Link
							href="/"
							className="-m-1.5 p-1.5 flex items-center"
							onClick={() => setMenuOpen(false)}
						>
							<span className="sr-only">Prompt Techies</span>
							<Image
								className="h-10 w-auto object-contain"
								src={Logo}
								alt="Prompt Techies Logo"
								width={180}
								height={50}
							/>
						</Link>
						<button
							type="button"
							className="-m-2.5 rounded-md p-2.5 text-on-surface"
							onClick={() => setMenuOpen(false)}
						>
							<svg
								className="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth="1.5"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
					<div className="mt-6 flow-root">
						<div className="-my-6 divide-y divide-gray-500/10">
							<div className="space-y-2 py-6">
								{navItems.map((item) => {
									const isItemActive = item.href.startsWith("#")
										? (pathname === "/" && activeLink === item.href.split("#")[1])
										: pathname === item.href;

									return (
										<Link
											key={item.href}
											href={
												item.href.startsWith("#")
													? (pathname === "/" ? item.href : `/${item.href}`)
													: item.href
											}
											className={cn(
												"-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7",
												isItemActive
													? "text-secondary bg-surface-container-low font-bold"
													: "text-on-surface hover:bg-surface-container-low"
											)}
											onClick={() => setMenuOpen(false)}
										>
											{item.label}
										</Link>
									);
								})}
							</div>
							<div className="py-6 space-y-2">
								{user ? (
									<div className="flex flex-col gap-2 w-full">
										{user.role === "ADMIN" && (
											<Link
												href="/admin"
												onClick={() => setMenuOpen(false)}
												className={cn(
													"rounded-full px-3 py-2.5 flex-1",
													"text-base font-semibold leading-7",
													"transition-colors duration-300 ease-in-out",
													"bg-amber-500/20 text-amber-300 hover:bg-amber-500/30",
													"flex items-center justify-between"
												)}
											>
												Admin
												<FaRightLong />
											</Link>
										)}
										{user.role === "JURY" && (
											<Link
												href="/jury"
												onClick={() => setMenuOpen(false)}
												className={cn(
													"rounded-full px-3 py-2.5 flex-1",
													"text-base font-semibold leading-7",
													"transition-colors duration-300 ease-in-out",
													"bg-purple-500/20 text-purple-300 hover:bg-purple-500/30",
													"flex items-center justify-between"
												)}
											>
												Jury Portal
												<FaRightLong />
											</Link>
										)}
										<div className="flex gap-2 w-full">
											<Link
												href="/teamdetails"
												onClick={() => setMenuOpen(false)}
												className={cn(
													"rounded-full px-3 py-2.5 flex-1",
													"text-base font-semibold leading-7",
													"transition-colors duration-300 ease-in-out",
													"bg-primary text-on-primary hover:bg-primary-container focus:bg-primary-container",
													"flex items-center justify-between"
												)}
											>
												Team Details
												<FaRightLong />
											</Link>
											<button
												onClick={() => {
													logout();
													setMenuOpen(false);
												}}
												className={cn(
													"block rounded-full px-3 py-2.5 flex-1",
													"text-base font-semibold leading-7",
													"transition-colors duration-300 ease-in-out",
													"bg-red-400 text-on-primary hover:bg-red-500 focus:bg-red-500",
													"flex items-center justify-between"
												)}
											>
												Logout
												<LogOutIcon />
											</button>
										</div>
									</div>
								) : (
									<div className="flex gap-2 w-full">
										<Link
											href="/register"
											className={cn(
												"rounded-full px-3 py-2.5 flex-1",
												"text-base font-semibold leading-7",
												"transition-colors duration-300 ease-in-out",
												"border border-secondary text-secondary hover:bg-secondary hover:text-black",
												"flex items-center justify-between"
											)}
											onClick={() => setMenuOpen(false)}
										>
											Register
											<FaRightLong />
										</Link>
										<Link
											href="/login"
											className={cn(
												"rounded-full px-3 py-2.5 flex-1",
												"text-base font-semibold leading-7",
												"transition-colors duration-300 ease-in-out",
												"bg-primary text-on-primary hover:bg-primary-container focus:bg-primary-container",
												"flex items-center justify-between"
											)}
											onClick={() => setMenuOpen(false)}
										>
											Login
											<FaRightLong />
										</Link>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</header>
	);
};

export default Navbar;
