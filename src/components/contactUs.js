"use client"
import React from "react";
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import StackedText from "./StackedText";
import Link from "next/link";
import { FaEnvelope, FaPhone } from "react-icons/fa6";
import cn from "@/utils/cn";
import { SOCIAL_LINKS } from "@/utils/socialLinks";

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
        staggerChildren: 0.2
      }
    }
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

  const ContactItem = ({ title, children }) => (
    <motion.div 
      className="bg-surface rounded-xl p-6 shadow-elevation-md border border-outline-variant hover:shadow-elevation-lg transition-all duration-200 ease-out w-full lg:w-1/3 min-h-[150px] h-full"
      variants={itemVariants}
    >
      <h2 className="text-3xl font-semibold text-primary">{title}</h2>
      <div className="text-on-surface">{children}</div>
    </motion.div>
  );

  return (
    <section className="bg-surface-container-low flex flex-col items-center justify-center p-4">
      <div className="about-content flex flex-col items-center text-center w-full">
        <h1 className="my-10 text-4xl w-full text-center flex items-center justify-center text-white">
          <StackedText text="Get in Touch" fontSize="70px" />
        </h1>
        <motion.div 
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={controls}
          className="lg:mb-14 flex flex-col lg:flex-row lg:space-x-10 space-y-10 lg:space-y-0 items-center w-full mt-8"
        >
          <ContactItem title="Location">
            <p className="mt-2 text-on-surface-variant">
              Flat 304, Plot 155 & 156, Sai Lakshmi Residency, IDPL Colony, Bachupally, Hyderabad, Telangana – 500090
            </p>
          </ContactItem>
          <ContactItem title="Email">
            <div className="flex flex-col gap-2 mt-2">
              <a className="text-primary hover:text-secondary underline transition-all duration-200 ease-out" href="mailto:contact@prompttechies.in">
                contact@prompttechies.in
              </a>
              <a className="text-primary hover:text-secondary underline transition-all duration-200 ease-out" href="mailto:prompttechies@gmail.com">
                prompttechies@gmail.com
              </a>
            </div>
          </ContactItem>
          <ContactItem title="Phone">
            <p className="mt-2">
              <a className="text-primary hover:text-secondary underline transition-all duration-200 ease-out" href="tel:+918008087702">+91 8008087702</a>
            </p>
          </ContactItem>

        </motion.div>
      </div>
    </section>
  );
};

export default ContactUs;