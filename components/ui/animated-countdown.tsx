"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type UnitType = "days" | "hours" | "minutes" | "seconds";
export type VariantType = "modern" | "digital" | "minimal" | "classic";
export type SizeType = "sm" | "md" | "lg";

export interface AnimatedCountdownProps {
	targetDate?: Date | string | number;
	variant?: VariantType;
	showDays?: boolean;
	showHours?: boolean;
	showMinutes?: boolean;
	showSeconds?: boolean;
	unitOrder?: UnitType[];
	backgroundColor?: string;
	accentColor?: string;
	className?: string;
	containerClassName?: string;
	unitClassName?: string;
	accentClassName?: string;
	labelClassName?: string;
	numberClassName?: string;
	separator?: string;
	showSeparators?: boolean;
	completionMessage?: string | null;
	onComplete?: () => void;
	staticMode?: boolean;
	initialStaticTime?: Partial<Record<UnitType, number>>;
	compact?: boolean;
	size?: SizeType;
	ariaLabel?: string;
}

const DEFAULT_TIME: Record<UnitType, number> = {
	days: 7,
	hours: 12,
	minutes: 45,
	seconds: 30,
};

const UNIT_LABELS: Record<UnitType, string> = {
	days: "Days",
	hours: "Hours",
	minutes: "Minutes",
	seconds: "Seconds",
};

const VARIANT_CONTAINER: Record<VariantType, string> = {
	modern: "border border-primary/20 bg-gradient-to-b from-white/95 via-sky-50/70 to-blue-50/80 shadow-[0_12px_36px_rgba(0,75,255,0.08)] backdrop-blur-xl dark:border-primary/30 dark:bg-[#0c1222]/90 dark:shadow-[0_12px_36px_rgba(0,200,255,0.1)]",
	digital: "border-cyan-400/20 bg-zinc-950 text-white shadow-2xl shadow-cyan-500/10",
	minimal: "border-transparent bg-transparent shadow-none",
	classic: "border-border bg-card shadow-sm dark:bg-zinc-900/80",
};

const VARIANT_UNIT: Record<VariantType, string> = {
	modern: "border border-blue-200/80 bg-white/95 shadow-[0_4px_16px_rgba(0,75,255,0.06)] transition-all duration-300 hover:border-primary/60 hover:bg-white hover:shadow-[0_8px_24px_rgba(0,75,255,0.15)] dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-cyan-400/40",
	digital: "border-cyan-400/20 bg-cyan-400/[0.055] font-mono shadow-[0_0_28px_-18px_rgba(34,211,238,0.9)] transition-all duration-200 hover:border-cyan-300/40 hover:bg-cyan-400/[0.09]",
	minimal: "border-transparent bg-transparent transition-all duration-200 hover:bg-muted/35",
	classic: "border-border bg-background shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-muted/35 dark:bg-white/[0.035]",
};

const SIZE_STYLES: Record<
	SizeType,
	{ container: string; unit: string; number: string; label: string }
> = {
	sm: {
		container: "gap-2 p-2",
		unit: "min-w-[4.25rem] rounded-xl px-3 py-3",
		number: "text-2xl",
		label: "text-[10px]",
	},
	md: {
		container: "gap-2.5 p-2.5 sm:gap-3 sm:p-3",
		unit: "min-w-[4.8rem] rounded-2xl px-3.5 py-4 sm:min-w-[5.6rem] sm:px-4",
		number: "text-3xl sm:text-4xl",
		label: "text-[10px] sm:text-[11px]",
	},
	lg: {
		container: "gap-3 p-3 sm:gap-4 sm:p-4",
		unit: "min-w-[5.2rem] rounded-2xl px-4 py-4 sm:min-w-[6.5rem] sm:px-5 sm:py-5",
		number: "text-4xl sm:text-5xl",
		label: "text-[11px] sm:text-xs",
	},
};

function toDateTime(target?: Date | string | number | null): number | null {
	if (!target) return null;
	const time = target instanceof Date ? target.getTime() : new Date(target).getTime();
	return Number.isFinite(time) ? time : null;
}

function getTimeLeft(target?: Date | string | number | null): Record<UnitType, number> {
	const targetTime = toDateTime(target);
	if (!targetTime) return DEFAULT_TIME;
	const diff = Math.max(0, targetTime - Date.now());
	const totalSeconds = Math.floor(diff / 1000);
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return { days, hours, minutes, seconds };
}

function isFinished(time: Record<UnitType, number>): boolean {
	return time.days === 0 && time.hours === 0 && time.minutes === 0 && time.seconds === 0;
}

function format(n: number): string {
	return String(Math.max(0, n)).padStart(2, "0");
}

function useVisibleUnits({
	showDays,
	showHours,
	showMinutes,
	showSeconds,
	unitOrder,
}: {
	showDays: boolean;
	showHours: boolean;
	showMinutes: boolean;
	showSeconds: boolean;
	unitOrder: UnitType[];
}) {
	return React.useMemo(() => {
		const flags: Record<UnitType, boolean> = {
			days: showDays,
			hours: showHours,
			minutes: showMinutes,
			seconds: showSeconds,
		};
		return unitOrder.filter((unit) => flags[unit]);
	}, [showDays, showHours, showMinutes, showSeconds, unitOrder]);
}

function CountdownNumber({ value, className, hasMounted = true }: { value: string; className?: string; hasMounted?: boolean }) {
	const shouldReduceMotion = useReducedMotion();
	if (!hasMounted) {
		return (
			<span
				suppressHydrationWarning
				className={cn("relative inline-grid min-w-[2ch] place-items-center tabular-nums overflow-hidden h-[1.15em]", className)}
			>
				<span suppressHydrationWarning>{value}</span>
			</span>
		);
	}
	return (
		<span
			suppressHydrationWarning
			className={cn("relative inline-grid min-w-[2ch] place-items-center tabular-nums overflow-hidden h-[1.15em]", className)}
		>
			<AnimatePresence initial={false} mode="popLayout">
				<motion.span
					key={value}
					suppressHydrationWarning
					initial={shouldReduceMotion ? false : { y: 12, opacity: 0 }}
					animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
					exit={shouldReduceMotion ? { opacity: 0 } : { y: -12, opacity: 0 }}
					transition={{ duration: shouldReduceMotion ? 0.05 : 0.22, ease: [0.25, 1, 0.5, 1] }}
					style={{ willChange: "transform, opacity" }}
				>
					{value}
				</motion.span>
			</AnimatePresence>
		</span>
	);
}

function CountdownUnit({
	unit,
	value,
	variant,
	size,
	unitClassName,
	numberClassName,
	labelClassName,
	accentClassName,
	index,
	hasMounted = true,
}: {
	unit: UnitType;
	value: number;
	variant: VariantType;
	size: SizeType;
	unitClassName?: string;
	numberClassName?: string;
	labelClassName?: string;
	accentClassName?: string;
	index: number;
	hasMounted?: boolean;
}) {
	const shouldReduceMotion = useReducedMotion();
	const sizeConfig = SIZE_STYLES[size];

	return (
		<motion.div
			initial={shouldReduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{ delay: shouldReduceMotion ? 0 : index * 0.055, duration: 0.35, ease: "easeOut" }}
			whileHover={shouldReduceMotion ? undefined : { y: -3 }}
			className={cn(
				"relative flex flex-col items-center justify-center overflow-hidden border text-center select-none",
				VARIANT_UNIT[variant],
				sizeConfig.unit,
				unitClassName
			)}
		>
			{variant === "modern" && (
				<span
					className={cn(
						"pointer-events-none absolute inset-x-3 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#00c8ff] to-transparent shadow-[0_0_8px_#00c8ff]",
						accentClassName
					)}
				/>
			)}
			<CountdownNumber
				value={format(value)}
				hasMounted={hasMounted}
				className={cn(
					"font-bold font-orbitron leading-none tracking-tight text-on-surface",
					variant === "modern" && "bg-gradient-to-b from-[#004bff] via-[#0055ff] to-[#00a8ff] bg-clip-text text-transparent dark:from-white dark:to-cyan-200",
					variant === "digital" && "font-mono text-cyan-100 drop-shadow-[0_0_18px_rgba(34,211,238,0.45)]",
					variant === "minimal" && "font-semibold",
					sizeConfig.number,
					numberClassName
				)}
			/>
			<span
				className={cn(
					"mt-2 font-bold uppercase tracking-[0.16em] text-xs px-2.5 py-0.5 rounded-full transition-colors",
					variant === "modern" && "bg-primary/10 text-primary dark:bg-cyan-500/15 dark:text-cyan-300",
					variant === "digital" && "text-cyan-200/55",
					variant === "minimal" && "text-muted-foreground",
					variant === "classic" && "text-muted-foreground",
					sizeConfig.label,
					labelClassName
				)}
			>
				{UNIT_LABELS[unit]}
			</span>
		</motion.div>
	);
}

export function AnimatedCountdown({
	targetDate,
	variant = "modern",
	showDays = true,
	showHours = true,
	showMinutes = true,
	showSeconds = true,
	unitOrder = ["days", "hours", "minutes", "seconds"],
	backgroundColor,
	accentColor,
	className,
	containerClassName,
	unitClassName,
	accentClassName,
	labelClassName,
	numberClassName,
	separator = ":",
	showSeparators = variant === "digital",
	completionMessage = "We're live!",
	onComplete,
	staticMode,
	initialStaticTime,
	compact = false,
	size = compact ? "sm" : "md",
	ariaLabel = "Countdown timer",
}: AnimatedCountdownProps) {
	const shouldReduceMotion = useReducedMotion();
	const isStatic = staticMode ?? !targetDate;
	const completedRef = React.useRef(false);
	const staticTimeData = React.useMemo(() => ({ ...DEFAULT_TIME, ...initialStaticTime }), [initialStaticTime]);
	const [timeLeft, setTimeLeft] = React.useState<Record<UnitType, number>>(() => getTimeLeft(targetDate));
	const [hasMounted, setHasMounted] = React.useState(false);

	const visibleUnits = useVisibleUnits({
		showDays,
		showHours,
		showMinutes,
		showSeconds,
		unitOrder,
	});

	const sizeConfig = SIZE_STYLES[size];
	const currentTime = isStatic ? staticTimeData : timeLeft;
	const finished = hasMounted && !isStatic && isFinished(currentTime);

	React.useEffect(() => {
		setHasMounted(true);
		if (isStatic) return;

		let prevSec = -1;
		const tick = () => {
			const current = getTimeLeft(targetDate);
			if (current.seconds !== prevSec) {
				prevSec = current.seconds;
				setTimeLeft(current);
			}
		};
		tick();

		const interval = window.setInterval(tick, 200);
		return () => window.clearInterval(interval);
	}, [isStatic, targetDate]);

	React.useEffect(() => {
		if (!finished || completedRef.current) return;
		completedRef.current = true;
		onComplete?.();
	}, [finished, onComplete]);

	const customStyle: React.CSSProperties = {
		...(backgroundColor ? { backgroundColor } : null),
		...(accentColor ? ({ "--countdown-accent": accentColor } as React.CSSProperties) : null),
	};

	return (
		<motion.div
			initial={shouldReduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{ duration: 0.5, ease: "easeOut" }}
			aria-label={ariaLabel}
			className={cn(
				"inline-flex max-w-full flex-col items-center rounded-[1.75rem] border",
				VARIANT_CONTAINER[variant],
				sizeConfig.container,
				compact && "rounded-2xl",
				containerClassName,
				className
			)}
			style={customStyle}
		>
			<div
				className={cn(
					"grid max-w-full grid-cols-2 items-stretch gap-2.5 sm:flex sm:flex-wrap sm:justify-center sm:items-center",
					showSeparators && "sm:gap-0"
				)}
			>
				{visibleUnits.map((unit, index) => (
					<React.Fragment key={unit}>
						<CountdownUnit
							unit={unit}
							value={currentTime[unit]}
							variant={variant}
							size={size}
							unitClassName={unitClassName}
							numberClassName={numberClassName}
							labelClassName={labelClassName}
							accentClassName={accentClassName}
							index={index}
							hasMounted={hasMounted}
						/>
						{showSeparators && index < visibleUnits.length - 1 && (
							<span
								className={cn(
									"hidden items-center px-2 text-2xl font-semibold text-muted-foreground/50 sm:flex",
									variant === "digital" && "font-mono text-cyan-200/45"
								)}
								aria-hidden={true}
							>
								{separator}
							</span>
						)}
					</React.Fragment>
				))}
			</div>

			<AnimatePresence>
				{finished && completionMessage && (
					<motion.p
						initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						transition={{ duration: 0.25 }}
						className="mt-3 text-sm font-medium text-primary"
					>
						{completionMessage}
					</motion.p>
				)}
			</AnimatePresence>
		</motion.div>
	);
}

export default AnimatedCountdown;
