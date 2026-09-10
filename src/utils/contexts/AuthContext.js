"use client";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
	getDoc,
	doc,
	query,
	getDocs,
	collection,
	where,
} from "firebase/firestore";
import { useState, useEffect, useContext, createContext, useCallback } from "react";

import { BYPASS_AUTH, MOCK_USER, MOCK_TEAM_DATA } from "@/utils/bypassAuth";

const AuthContext = createContext({
	user: null,
	loading: true,
	logout: () => {},
	loginDemoUser: () => {},
	isRegistered: false,
	setIsRegistered: () => {},
	isTeamLeader: false,
	teamData: null,
	setTeamData: () => {},
	refreshUserData: () => {},
	isBypass: false,
});

export const useAuth = () => {
	return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [isRegistered, setIsRegistered] = useState(false);
	const [loading, setLoading] = useState(true);
	const [isTeamLeader, setIsTeamLeader] = useState(false);
	const [teamData, setTeamData] = useState(null);
	const [isBypass, setIsBypass] = useState(false);

	// Firebase Auth State Listener
	useEffect(() => {
		let isMounted = true;

		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (!isMounted) return;

			if (firebaseUser) {
				setUser(firebaseUser);
				setIsBypass(false);
				setLoading(false);
			} else {
				// If no Firebase user, check if we previously used developer bypass in this session
				const storedBypass = typeof window !== "undefined" ? sessionStorage.getItem("pt_auth_bypass") : null;
				if (storedBypass === "true") {
					setUser(MOCK_USER);
					setTeamData(MOCK_TEAM_DATA);
					setIsRegistered(true);
					setIsTeamLeader(true);
					setIsBypass(true);
				} else if (BYPASS_AUTH) {
					// Default to bypass user if BYPASS_AUTH is enabled
					setUser(MOCK_USER);
					setTeamData(MOCK_TEAM_DATA);
					setIsRegistered(true);
					setIsTeamLeader(true);
					setIsBypass(true);
				} else {
					setUser(null);
					setTeamData(null);
					setIsRegistered(false);
					setIsTeamLeader(false);
					setIsBypass(false);
				}
				setLoading(false);
			}
		});

		return () => {
			isMounted = false;
			unsubscribe();
		};
	}, []);

	// Firestore Team / Participant status checker
	const checkIfRegistered = useCallback(async (currentUser) => {
		if (!currentUser) {
			setIsRegistered(false);
			setIsTeamLeader(false);
			setTeamData(null);
			return;
		}

		if (currentUser.uid === MOCK_USER.uid) {
			setIsRegistered(true);
			setIsTeamLeader(true);
			setTeamData(MOCK_TEAM_DATA);
			return;
		}

		try {
			// 1. Check if user is a team leader (doc in teams/{uid})
			const userDocRef = doc(db, "teams", currentUser.uid);
			const userDocSnap = await getDoc(userDocRef);

			if (userDocSnap.exists()) {
				setIsTeamLeader(true);
				setIsRegistered(true);
				setTeamData({ ...userDocSnap.data(), id: userDocSnap.id });
				return;
			}

			// 2. Check if user is a participant
			if (currentUser.email) {
				const participantQuery = query(
					collection(db, "participants"),
					where("email", "==", currentUser.email)
				);
				const participantSnapshot = await getDocs(participantQuery);

				if (!participantSnapshot.empty) {
					setIsRegistered(true);
					setIsTeamLeader(false);
					const partData = participantSnapshot.docs[0].data();
					if (partData.teamId) {
						const parentTeamDoc = await getDoc(doc(db, "teams", partData.teamId));
						if (parentTeamDoc.exists()) {
							setTeamData({ ...parentTeamDoc.data(), id: parentTeamDoc.id });
						}
					}
					return;
				}
			}

			// Not found in teams or participants
			setIsRegistered(false);
			setIsTeamLeader(false);
			setTeamData(null);
		} catch (error) {
			console.warn("Firestore registration check skipped or offline:", error.message);
			// Do not crash the app if Firestore rules or offline
		}
	}, []);

	useEffect(() => {
		if (user && !isBypass) {
			checkIfRegistered(user);
		}
	}, [user, isBypass, checkIfRegistered]);

	const logout = async () => {
		if (typeof window !== "undefined") {
			sessionStorage.removeItem("pt_auth_bypass");
		}
		setIsBypass(false);
		setUser(null);
		setTeamData(null);
		setIsRegistered(false);
		setIsTeamLeader(false);
		try {
			await signOut(auth);
		} catch (err) {
			console.warn("Sign out err:", err);
		}
	};

	const loginDemoUser = () => {
		if (typeof window !== "undefined") {
			sessionStorage.setItem("pt_auth_bypass", "true");
		}
		setUser(MOCK_USER);
		setTeamData(MOCK_TEAM_DATA);
		setIsRegistered(true);
		setIsTeamLeader(true);
		setIsBypass(true);
	};

	const refreshUserData = () => {
		if (user) {
			checkIfRegistered(user);
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				loading,
				logout,
				isRegistered,
				setIsRegistered,
				isTeamLeader,
				teamData,
				setTeamData,
				loginDemoUser,
				refreshUserData,
				isBypass,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

