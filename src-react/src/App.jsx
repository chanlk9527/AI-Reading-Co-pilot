import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import LoginPage from './pages/LoginPage';
import LibraryPage from './pages/LibraryPage';
import ReaderPage from './pages/ReaderPage';

function PrivateRoute({ children }) {
    const { token, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    return token ? children : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }) {
    const { token, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    return !token ? children : <Navigate to="/library" replace />;
}

export default function App() {
    return (
        <AppProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={
                            <PublicOnlyRoute>
                                <LoginPage />
                            </PublicOnlyRoute>
                        } />
                        <Route path="/" element={<Navigate to="/library" replace />} />
                        <Route path="/library" element={
                            <PrivateRoute>
                                <LibraryPage />
                            </PrivateRoute>
                        } />
                        <Route path="/reader" element={
                            <PrivateRoute>
                                <ReaderPage />
                            </PrivateRoute>
                        } />
                        <Route path="/reader/:textId" element={
                            <PrivateRoute>
                                <ReaderPage />
                            </PrivateRoute>
                        } />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </AppProvider>
    );
}
