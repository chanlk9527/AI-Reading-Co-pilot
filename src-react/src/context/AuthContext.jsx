import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('access_token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    const userData = await api.getMe(token);
                    setUser(userData);
                } catch (err) {
                    console.error("Auth check failed", err);
                    logout();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, [token]);

    const login = async (email, password) => {
        const data = await api.login(email, password);
        setToken(data.access_token);
        localStorage.setItem('access_token', data.access_token);
        setUser(data.user);
        return data.user;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('access_token');
    };

    const updateCredits = (newCredits) => {
        if (user) {
            setUser({ ...user, credits: newCredits });
        }
    };

    const recharge = async () => {
        if (!token) return;
        try {
            const updatedUser = await api.recharge(token);
            setUser(updatedUser);
            return updatedUser;
        } catch (err) {
            console.error("Recharge failed", err);
            throw err;
        }
    };

    const refreshCredits = async () => {
        if (!token) return;
        try {
            const data = await api.getCredits(token);
            updateCredits(data.credits);
        } catch (err) {
            console.error("Failed to refresh credits", err);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            logout,
            loading,
            updateCredits,
            recharge,
            refreshCredits
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
