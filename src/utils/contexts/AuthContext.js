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
import { useState, useEffect, useContext, createContext } from "react";

import { BYPASS_AUTH, MOCK_USER } from "@/utils/bypassAuth";

const AuthContext = createContext({
	user: null,
	loading: true,
	logout: () => {},
	loginDemoUser: () => {},
	isRegistered: false,
	setIsRegistered: () => {},
	isTeamLeader: false,
});

export const useAuth = () => {
	return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(BYPASS_AUTH ? MOCK_USER : null);
	const [isRegistered, setIsRegistered] = useState(BYPASS_AUTH ? true : false);
	const [loading, setLoading] = useState(false);
	const [isTeamLeader, setIsTeamLeader] = useState(BYPASS_AUTH ? true : false);

	useEffect(() => {
		if (BYPASS_AUTH) {
			setLoading(false);
			return;
		}

		const unsubscribe = onAuthStateChanged(auth, (user) => {
			setUser(user);
			setLoading(false);
		});

		return unsubscribe;
	}, []);

	useEffect(() => {
		if (BYPASS_AUTH) {
			if (user) {
				setIsRegistered(true);
				setIsTeamLeader(true);
			} else {
				setIsRegistered(false);
				setIsTeamLeader(false);
			}
			return;
		}

		const checkIfRegistered = async () => {
			if (user) {
				const userDocRef = doc(db, "teams", user.uid);
				const userDocSnap = await getDoc(userDocRef);

				if (userDocSnap.exists()) {
					setIsTeamLeader(true);
					setIsRegistered(true);
				} else {
					const participantQuery = query(
						collection(db, "participants"),
						where("email", "==", user.email)
					);
					const participantSnapshot = await getDocs(participantQuery);
					if (participantSnapshot.empty) {
						setIsRegistered(false);
						setIsTeamLeader(true);
					} else {
						setIsRegistered(true);
						setIsTeamLeader(false);
					}
				}
			} else {
				setIsRegistered(false);
				setIsTeamLeader(false);
			}
		};
		checkIfRegistered();
	}, [user]);

	const logout = async () => {
		if (BYPASS_AUTH) {
			setUser(null);
			setIsRegistered(false);
			setIsTeamLeader(false);
			return;
		}
		await signOut(auth);
	};

	const loginDemoUser = () => {
		setUser(MOCK_USER);
		setIsRegistered(true);
		setIsTeamLeader(true);
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
				loginDemoUser,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};
