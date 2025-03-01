import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
* ProtectedRoute component that handles authentication state including loading state
* @param {Object} props - Component props
* @param {React.ReactNode} props.children - Child components to render when authenticated
* @returns {React.ReactNode} The protected content or a redirect
*/
const ProtectedRoute = ({ children }) => {
const { user, loading } = useAuth();

// Show loading state while authentication is being determined
if (loading) {
    return (
    <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
    );
}

// Redirect to login if not authenticated
if (!user) {
    return <Navigate to="/login" replace />;
}

// If there are children, render them, otherwise render the Outlet
return children ? children : <Outlet />;
};

export default ProtectedRoute;

