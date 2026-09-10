"use client";

import React from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import StackedTextDark from './StackedTextdark';
import "./styles/about.css";

const About = () => {
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
                staggerChildren: 0.2
            }
        }
    };

    const boxVariants = {
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

    const BoxContent = ({ title, content }) => (
        <motion.div
            className="about-stacked-card p-6 md:p-8 w-full lg:w-1/3 flex flex-col justify-between text-left"
            variants={boxVariants}
        >
            <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-white flex items-center">
                    <span className="text-secondary mr-2 font-mono">&gt;</span>
                    {title}
                </h2>
                <div className="w-10 h-[2px] bg-secondary mb-4 opacity-80" />
                <p className="flex-grow text-slate-300 text-base md:text-lg leading-relaxed">
                    {content}
                </p>
            </div>
        </motion.div>
    );

    return (
        <section className="about-section flex flex-col items-center justify-center py-20 px-4 w-full">
            <div className="about-content flex flex-col items-center text-center w-full max-w-6xl">
                <h1 className="my-8 text-4xl w-full text-center flex items-center justify-center">
                    <StackedTextDark text="About" fontSize="80px" />
                </h1>
                <motion.div
                    ref={ref}
                    variants={containerVariants}
                    initial="hidden"
                    animate={controls}
                    className="lg:mb-14 flex flex-col lg:flex-row lg:space-x-10 space-y-10 lg:space-y-0 items-stretch w-full mt-8"
                >
                    <BoxContent
                        title="What is Promptathon?"
                        content="A 24-hour national hackathon bringing together students, developers, and innovators to architect and deploy real-world AI applications under expert guidance."
                    />
                    <BoxContent
                        title="Rewards and Perks"
                        content="Exciting cash prize pool, developer bounties, cloud computing credits, 1-on-1 mentorship from top tech giants, and direct incubation opportunities for winning teams."
                    />
                    <BoxContent
                        title="Who Are We?"
                        content="Prompt Techies is an AI-first technology company and student-focused innovation platform bridging the gap between classroom theory and real-world execution."
                    />
                </motion.div>
            </div>
        </section>
    );
};

export default About;