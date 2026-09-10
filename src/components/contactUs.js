"use client";

import React from "react";
import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";
import StackedText from "./StackedText";
import Link from "next/link";
import { FaEnvelope, FaPhone, FaLocationDot } from "react-icons/fa6";
import cn from "@/utils/cn";
import SmokeyBackground from "@/components/ui/smokey-background";

const ContactUs = () => {
	const controls = useAnimation();
	const [ref, inView] = useInView({
		threshold: 0.1,
	});

	React.useEffect(() => {
		if (inView) {
			controls.start("visible");
		} else {
			controls.start("hidden");
		}
	}, [controls, inView]);

	const containerVariants = {
		hidden: {},
		visible: {
			transition: {
				staggerChildren: 0.2,
			},
		},
	};

	const itemVariants = {
		hidden: { y: 50, opacity: 0 },
		visible: {
			y: 0,
			opacity: 1,
			transition: {
				duration: 0.8,
				ease: "easeOut",
			},
		},
	};

	const ContactItem = ({ title, icon, children }) => (
		<motion.div
			className="bg-[#0c1427]/80 backdrop-blur-xl rounded-2xl p-7 shadow-[0_8px_32px_rgba(0,75,255,0.12)] border border-primary/25 hover:border-cyan-400/50 hover:shadow-[0_12px_40px_rgba(0,200,255,0.2)] transition-all duration-300 ease-out w-full lg:w-1/3 min-h-[160px] h-full flex flex-col justify-start text-left group"
			variants={itemVariants}
		>
			<div className="flex items-center gap-3 mb-3">
				{icon && (
					<div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-[#00c8ff] group-hover:scale-110 transition-transform">
						{icon}
					</div>
				)}
				<h2 className="text-2xl font-bold font-orbitron text-white group-hover:text-[#00c8ff] transition-colors">
					{title}
				</h2>
			</div>
			<div className="text-slate-300 text-sm leading-relaxed">{children}</div>
		</motion.div>
	);

	return (
		<section className="bg-[#070c18] relative w-full flex flex-col items-center justify-center py-20 px-6 lg:px-12 overflow-hidden">
			{/* Matching Interactive WebGL Smokey / Foggy Background */}
			<SmokeyBackground color="#004bff" className="opacity-75" />

			<div className="relative z-10 about-content flex flex-col items-center text-center w-full max-w-6xl">
				<h1 className="mb-6 text-4xl w-full text-center flex items-center justify-center text-white">
					<StackedText text="Get in Touch" fontSize="70px" />
				</h1>
				<p className="text-sky-200/80 text-base md:text-lg max-w-xl mb-12">
					Have questions about <span className="text-[#00c8ff] font-semibold">Promptathon 2026</span>? Reach out to our organizing team.
				</p>

				<motion.div
					ref={ref}
					variants={containerVariants}
					initial="hidden"
					animate={controls}
					className="flex flex-col lg:flex-row lg:space-x-8 space-y-6 lg:space-y-0 items-stretch w-full"
				>
					<ContactItem title="Location" icon={<FaLocationDot />}>
						<p className="mt-1 text-slate-300 leading-relaxed">
							Flat 304, Plot 155 & 156, Sai Lakshmi Residency, IDPL Colony, Bachupally, Hyderabad, Telangana – 500090
						</p>
					</ContactItem>

					<ContactItem title="Email" icon={<FaEnvelope />}>
						<div className="flex flex-col gap-2 mt-1">
							<a
								className="text-[#00c8ff] hover:text-white hover:underline transition-colors duration-200 font-medium"
								href="mailto:contact@prompttechies.in"
							>
								contact@prompttechies.in
							</a>
							<a
								className="text-[#00c8ff] hover:text-white hover:underline transition-colors duration-200 font-medium"
								href="mailto:prompttechies@gmail.com"
							>
								prompttechies@gmail.com
							</a>
						</div>
					</ContactItem>

					<ContactItem title="Phone" icon={<FaPhone />}>
						<p className="mt-1">
							<a
								className="text-[#00c8ff] hover:text-white hover:underline transition-colors duration-200 font-medium text-base"
								href="tel:+918008087702"
							>
								+91 8008087702
							</a>
						</p>
						<span className="text-xs text-slate-400 mt-2 block">
							Available Mon - Sat, 9:00 AM - 7:00 PM IST
						</span>
					</ContactItem>
				</motion.div>
			</div>
			{/* Feathered bottom edge gradient mask to blend smoothly into the footer */}
			<div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 md:h-56 bg-gradient-to-t from-[#070c18] via-[#070c18]/80 to-transparent z-[5]" />
		</section>
	);
};

export default ContactUs;