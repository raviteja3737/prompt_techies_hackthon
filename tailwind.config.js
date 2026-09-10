/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	darkMode: "class",
	theme: {
		extend: {
			/* ── Container ── */
			maxWidth: {
				container: "1400px",
				50: "50%",
			},
			minWidth: {
				50: "50%",
				40: "40%",
			},
			padding: {
				100: "100%",
			},

			/* ── Colors (CSS-variable driven for light/dark) ── */
			colors: {
				background: "var(--background)",
				foreground: "var(--foreground)",

				/* Surface hierarchy */
				surface: {
					DEFAULT: "var(--surface)",
					dim: "var(--surface-dim)",
					bright: "var(--surface-bright)",
					"container-lowest": "var(--surface-container-lowest)",
					"container-low": "var(--surface-container-low)",
					container: "var(--surface-container)",
					"container-high": "var(--surface-container-high)",
					"container-highest": "var(--surface-container-highest)",
					variant: "var(--surface-variant)",
				},
				"on-surface": {
					DEFAULT: "var(--on-surface)",
					variant: "var(--on-surface-variant)",
				},
				"inverse-surface": "var(--inverse-surface)",
				"inverse-on-surface": "var(--inverse-on-surface)",

				/* Primary */
				primary: {
					DEFAULT: "var(--primary)",
					container: "var(--primary-container)",
					fixed: "var(--primary-fixed)",
					"fixed-dim": "var(--primary-fixed-dim)",
				},
				"on-primary": {
					DEFAULT: "var(--on-primary)",
					container: "var(--on-primary-container)",
					fixed: "var(--on-primary-fixed)",
					"fixed-variant": "var(--on-primary-fixed-variant)",
				},
				"inverse-primary": "var(--inverse-primary)",

				/* Secondary */
				secondary: {
					DEFAULT: "var(--secondary)",
					container: "var(--secondary-container)",
					fixed: "var(--secondary-fixed)",
					"fixed-dim": "var(--secondary-fixed-dim)",
				},
				"on-secondary": {
					DEFAULT: "var(--on-secondary)",
					container: "var(--on-secondary-container)",
					fixed: "var(--on-secondary-fixed)",
					"fixed-variant": "var(--on-secondary-fixed-variant)",
				},

				/* Tertiary */
				tertiary: {
					DEFAULT: "var(--tertiary)",
					container: "var(--tertiary-container)",
					fixed: "var(--tertiary-fixed)",
					"fixed-dim": "var(--tertiary-fixed-dim)",
				},
				"on-tertiary": {
					DEFAULT: "var(--on-tertiary)",
					container: "var(--on-tertiary-container)",
					fixed: "var(--on-tertiary-fixed)",
					"fixed-variant": "var(--on-tertiary-fixed-variant)",
				},

				/* Error */
				error: {
					DEFAULT: "var(--error)",
					container: "var(--error-container)",
				},
				"on-error": {
					DEFAULT: "var(--on-error)",
					container: "var(--on-error-container)",
				},

				/* Outline */
				outline: {
					DEFAULT: "var(--outline)",
					variant: "var(--outline-variant)",
				},

				/* Surface tint */
				"surface-tint": "var(--surface-tint)",
			},

			/* ── Typography ── */
			fontFamily: {
				geist: ["var(--font-geist)", "system-ui", "sans-serif"],
				mono: ["var(--font-geist-mono)", "monospace"],
				orbitron: ["var(--font-orbitron)", "sans-serif"],
				tech: ["var(--font-tech)", "sans-serif"],
			},
			fontSize: {
				display: [
					"72px",
					{
						lineHeight: "84px",
						letterSpacing: "-0.02em",
						fontWeight: "400",
					},
				],
				"headline-lg": [
					"40px",
					{
						lineHeight: "48px",
						letterSpacing: "-0.01em",
						fontWeight: "600",
					},
				],
				"headline-md": [
					"28px",
					{
						lineHeight: "36px",
						letterSpacing: "0em",
						fontWeight: "600",
					},
				],
				"title-lg": [
					"20px",
					{
						lineHeight: "28px",
						letterSpacing: "0.01em",
						fontWeight: "600",
					},
				],
				"body-lg": [
					"18px",
					{
						lineHeight: "28px",
						letterSpacing: "0em",
						fontWeight: "400",
					},
				],
				"body-md": [
					"16px",
					{
						lineHeight: "24px",
						letterSpacing: "0em",
						fontWeight: "400",
					},
				],
				"label-md": [
					"14px",
					{
						lineHeight: "20px",
						letterSpacing: "0.05em",
						fontWeight: "700",
					},
				],
				"label-sm": [
					"12px",
					{
						lineHeight: "16px",
						letterSpacing: "0.08em",
						fontWeight: "600",
					},
				],
			},

			/* ── Spacing (8px unit system) ── */
			spacing: {
				unit: "8px",
				xs: "4px",
				"space-sm": "12px",
				"space-md": "24px",
				"space-lg": "40px",
				"space-xl": "64px",
				gutter: "24px",
			},

			/* ── Border Radius ── */
			borderRadius: {
				sm: "0.25rem",
				DEFAULT: "0.5rem",
				md: "0.75rem",
				lg: "1rem",
				xl: "1.5rem",
				full: "9999px",
			},

			/* ── Elevation / Shadows ── */
			boxShadow: {
				"elevation-sm": "0 1px 2px rgba(0, 0, 0, 0.06)",
				"elevation-md": "0 4px 12px rgba(0, 0, 0, 0.08)",
				"elevation-lg": "0 8px 32px rgba(0, 0, 0, 0.37)",
				"primary-glow": "0 2px 8px rgba(0, 75, 255, 0.2)",
				"primary-glow-hover": "0 4px 16px rgba(0, 75, 255, 0.3)",
				"focus-ring": "0 0 0 3px rgba(0, 75, 255, 0.1)",
			},

			/* ── Grid ── */
			gridTemplateColumns: {
				layout: "repeat(12, minmax(0, 1fr))",
			},

			/* ── Transitions ── */
			transitionDuration: {
				fast: "200ms",
				DEFAULT: "300ms",
				slow: "500ms",
			},
			transitionTimingFunction: {
				"ease-out-smooth": "cubic-bezier(.28,-0.03,0,.99)",
			},

			/* ── Animations ── */
			keyframes: {
				"neon-pulse": {
					"0%, 100%": { opacity: "0.4" },
					"50%": { opacity: "1" },
				},
				"glow-shift": {
					"0%": { backgroundPosition: "0% 50%" },
					"50%": { backgroundPosition: "100% 50%" },
					"100%": { backgroundPosition: "0% 50%" },
				},
				"float": {
					"0%, 100%": { transform: "translateY(0px)" },
					"50%": { transform: "translateY(-10px)" },
				},
			},
			animation: {
				"neon-pulse": "neon-pulse 3s ease-in-out infinite",
				"glow-shift": "glow-shift 6s ease-in-out infinite",
				float: "float 4s ease-in-out infinite",
			},
		},
	},
	plugins: [require("@tailwindcss/typography")],
};
