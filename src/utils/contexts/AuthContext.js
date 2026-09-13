"use client";

import React, { useState, useEffect, useContext, createContext, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext({
	user: null,
	loading: true,
	role: null,
	login: async () => {},
	register: async () => {},
	logout: async () => {},
	isRegistered: false,
	setIsRegistered: () => {},
	isTeamLeader: false,
	teamData: null,
	setTeamData: () => {},
	refreshUserData: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [teamData, setTeamData] = useState(null);
	const [isRegistered, setIsRegistered] = useState(false);
	const [isTeamLeader, setIsTeamLeader] = useState(false);

	const refreshUserData = useCallback(async () => {
		try {
			const meRes = await api.get("/api/auth/me");
			const currentUser = meRes.data?.user || null;
			setUser(currentUser);

			if (currentUser) {
				try {
					const teamRes = await api.get("/api/team/me");
					const team = teamRes.data?.team || null;
					setTeamData(team);
					setIsRegistered(Boolean(team));
					setIsTeamLeader(teamRes.data?.myRole === "LEADER" || team?.leaderId === currentUser.id);
				} catch {
					setTeamData(null);
					setIsRegistered(false);
					setIsTeamLeader(false);
				}
			} else {
				setTeamData(null);
				setIsRegistered(false);
				setIsTeamLeader(false);
			}
		} catch {
			setUser(null);
			setTeamData(null);
			setIsRegistered(false);
			setIsTeamLeader(false);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refreshUserData();
	}, [refreshUserData]);

	const login = async (email, password) => {
		const res = await api.post("/api/auth/login", { email, password });
		await refreshUserData();
		return res.data;
	};

	const register = async (data) => {
		const res = await api.post("/api/auth/register", data);
		await refreshUserData();
		return res.data;
	};

	const logout = async () => {
		try {
			await api.post("/api/auth/logout");
		} catch (err) {
			console.error("Logout error:", err);
		} finally {
			setUser(null);
			setTeamData(null);
			setIsRegistered(false);
			setIsTeamLeader(false);
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				loading,
				role: user?.role || null,
				login,
				register,
				logout,
				isRegistered,
				setIsRegistered,
				isTeamLeader,
				teamData,
				setTeamData,
				refreshUserData,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};
